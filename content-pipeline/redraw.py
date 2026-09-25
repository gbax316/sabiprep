"""
W4 Diagram author: scanned diagram to clean, dark-mode SVG.

The standard is "replica, no deviation". A diagram that drifts from the original
guarantees the student cannot answer, and they will blame themselves. So this
does not redraw from scratch and it does not generate. It TRACES: the original
line work is converted into vector paths, so every stroke is where the setter
put it, then restyled for the app.

Why not generative image models: they produce plausible detail, which is the
opposite of what is needed. A generated cockroach may have the wrong leg
proportions, and leg proportions are exactly what question 2 is testing.

Stages:
  1. clean     greyscale, flatten paper tint, threshold to pure line work,
               crop to content with a margin
  2. trace     vtracer, binary mode, spline curves, speckle filter
  3. restyle   recolour to a single ink colour on a transparent ground,
               responsive viewBox, no fixed pixel size
  4. verify    rasterise the SVG back and measure how much of the original
               line work it reproduces, so fidelity is a number, not a glance

Usage:
    python redraw.py --image "path/2025_Q2-3.png" --out out/diagrams/biology-waec
    python redraw.py --dir "path/2025" --out out/diagrams/biology-waec
"""

import argparse, io, json, os, re, sys
import numpy as np
from PIL import Image, ImageFilter, ImageOps
import vtracer

INK = '#E2E8F0'          # slate-200: reads on the app's slate-950 surface
MARGIN = 0.04            # of the longer side, kept around the cropped content


def clean(path, threshold=None):
    """Return (binary PIL image of black ink on white, stats)."""
    im = Image.open(path)
    if im.mode in ('RGBA', 'LA'):
        bg = Image.new('RGB', im.size, 'white')
        bg.paste(im, mask=im.split()[-1])
        im = bg
    g = ImageOps.grayscale(im)
    g = g.filter(ImageFilter.MedianFilter(3))          # scan speckle
    a = np.asarray(g, dtype=np.float32)

    # Flatten uneven paper: divide by a heavily blurred copy of the page.
    bgest = np.asarray(g.filter(ImageFilter.GaussianBlur(25)), dtype=np.float32)
    flat = np.clip(a / np.maximum(bgest, 1) * 255, 0, 255)

    # Otsu threshold unless one is given.
    if threshold is None:
        hist, _ = np.histogram(flat, bins=256, range=(0, 255))
        total = flat.size
        sum_all = np.dot(np.arange(256), hist)
        wb = sb = 0.0
        best, threshold = -1, 128
        for t in range(256):
            wb += hist[t]
            if wb == 0:
                continue
            wf = total - wb
            if wf == 0:
                break
            sb += t * hist[t]
            mb, mf = sb / wb, (sum_all - sb) / wf
            var = wb * wf * (mb - mf) ** 2
            if var > best:
                best, threshold = var, t
    ink = flat < threshold

    ys, xs = np.where(ink)
    if len(xs) == 0:
        raise ValueError('no line work found')
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    m = int(max(x1 - x0, y1 - y0) * MARGIN)
    x0, y0 = max(0, x0 - m), max(0, y0 - m)
    x1, y1 = min(ink.shape[1] - 1, x1 + m), min(ink.shape[0] - 1, y1 + m)
    crop = ink[y0:y1 + 1, x0:x1 + 1]

    out = Image.fromarray(np.where(crop, 0, 255).astype(np.uint8), 'L')
    return out, {'threshold': int(threshold), 'ink_px': int(crop.sum()),
                 'size': [int(crop.shape[1]), int(crop.shape[0])]}


def trace(binary_img):
    buf = io.BytesIO()
    binary_img.convert('RGB').save(buf, format='PNG')
    svg = vtracer.convert_raw_image_to_svg(
        buf.getvalue(), img_format='png',
        colormode='binary', mode='spline',
        filter_speckle=4, corner_threshold=60, length_threshold=4.0,
        splice_threshold=45, path_precision=2,
    )
    return svg


def restyle(svg, w, h):
    # vtracer emits fixed width/height; make it scale to its container.
    svg = re.sub(r'<svg[^>]*>',
                 f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
                 f'preserveAspectRatio="xMidYMid meet" role="img">', svg, count=1)
    # Binary mode fills ink regions black. Drop any white background shape,
    # then recolour ink for the dark surface.
    svg = re.sub(r'<path[^>]*fill="#[fF]{6}"[^>]*/>', '', svg)
    svg = re.sub(r'fill="#0{6}"', f'fill="{INK}"', svg)
    svg = re.sub(r'fill="#000"', f'fill="{INK}"', svg)
    return svg


def rasterise_mask(svg, w, h):
    """
    Render the traced SVG back to a binary ink mask at the source's exact pixel
    size, with a real SVG renderer. Used only to measure fidelity.

    An earlier version parsed path numbers into Pillow polygons. It treated
    spline control points as corners and reported 4% fidelity on a trace that
    was in fact close to exact. The measuring instrument has to be right before
    its number means anything.
    """
    import resvg_py
    # Render ink as solid black on white so the mask is unambiguous.
    probe = re.sub(r'fill="#[0-9A-Fa-f]{3,6}"', 'fill="#000000"', svg)
    probe = re.sub(r'<svg[^>]*>',
                   f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
                   f'viewBox="0 0 {w} {h}">', probe, count=1)
    png = bytes(resvg_py.svg_to_bytes(svg_string=probe, background='#ffffff', width=w, height=h))
    g = np.asarray(Image.open(io.BytesIO(png)).convert('L'))
    return g < 128


def fidelity(binary_img, svg):
    """Share of original ink reproduced, and share of traced ink that is real."""
    orig = np.asarray(binary_img) < 128
    w, h = binary_img.size
    trac = rasterise_mask(svg, w, h)
    # Allow one pixel of registration slack either way.
    from PIL import Image as _I
    dil = lambda m: np.asarray(_I.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))) > 0
    recall = (orig & dil(trac)).sum() / max(orig.sum(), 1)
    precision = (trac & dil(orig)).sum() / max(trac.sum(), 1)
    return round(float(recall), 4), round(float(precision), 4)


# Triage threshold. Clean line art traces to a few dozen paths. Stipple, photo
# grain and tonal fills each become their own path, so a count far above this is
# the signature of a diagram tracing cannot reproduce faithfully. On Biology 2025
# the five good traces were 8 to 36 paths; the Secchi disc, photographed off a
# printed page with stippled water and fine rod numbers, was 539.
AUTHOR_PATHS = 150

# What the fidelity number does and does not prove. It compares the trace with
# the CLEANED image, so it proves tracing lost nothing. It cannot see anything
# the cleaning step removed, such as fine numbers crushed by the threshold. That
# is why a high-path diagram is routed to a human-authored SVG however good its
# recall looks, and why every diagram still gets a side-by-side visual check.


def redraw(path, outdir):
    binary, stats = clean(path)
    svg = trace(binary)
    w, h = binary.size
    styled = restyle(svg, w, h)
    rec, prec = fidelity(binary, svg)
    stem = os.path.splitext(os.path.basename(path))[0]
    os.makedirs(outdir, exist_ok=True)
    open(os.path.join(outdir, f'{stem}.svg'), 'w', encoding='utf8').write(styled)
    binary.save(os.path.join(outdir, f'{stem}.clean.png'))
    paths = styled.count('<path')
    route = 'author' if paths > AUTHOR_PATHS else 'trace'
    return {'source': os.path.basename(path), 'svg': f'{stem}.svg',
            'bytes': len(styled.encode()), 'paths': paths, 'route': route,
            'recall': rec, 'precision': prec, **stats}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--image')
    ap.add_argument('--dir')
    ap.add_argument('--out', required=True, help='out/diagrams/<slug>')
    a = ap.parse_args()
    paths = [a.image] if a.image else sorted(
        os.path.join(a.dir, f) for f in os.listdir(a.dir) if f.lower().endswith(('.png', '.jpg', '.jpeg')))
    results = []
    for p in paths:
        try:
            r = redraw(p, a.out)
            flag = ''
            if r['route'] == 'author':
                flag = '  <-- AUTHOR IN CODE (tonal, stipple or fine text)'
            elif r['recall'] < 0.95 or r['precision'] < 0.95:
                flag = '  <-- REVIEW'
            print(f"{r['source']:<22} recall {r['recall']:.3f}  precision {r['precision']:.3f}  "
                  f"{r['paths']:>3} paths  {r['bytes'] // 1024:>4} KB{flag}")
            results.append(r)
        except Exception as e:
            print(f"{os.path.basename(p):<22} FAILED {e}")
            results.append({'source': os.path.basename(p), 'error': str(e)})
    # Merge by source file. Each year is traced in its own run, and the
    # exporter reads every year's image sizes from this one report.
    rpath = os.path.join(a.out, 'redraw-report.json')
    merged = {}
    if os.path.exists(rpath):
        merged = {r['source']: r for r in json.load(open(rpath, encoding='utf8'))}
    merged.update({r['source']: r for r in results})
    json.dump(sorted(merged.values(), key=lambda r: r['source']),
              open(rpath, 'w', encoding='utf8'), indent=2)


if __name__ == '__main__':
    sys.exit(main())
