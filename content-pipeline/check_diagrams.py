"""
R3 Diagram checker, GPT-family lane (Codex CLI).

The redraws and their alt text are made on the Claude side, so they are checked
by a different model family, looking at the original and the redraw side by
side.

Why a model looks at all: redraw.py's fidelity number compares the trace with
the CLEANED image, so it proves tracing lost nothing but cannot see what the
cleaning step destroyed. On Biology 2025 the Secchi disc scored 98.8 percent
while its rod numbers were gone. In the years that run without a human looking,
this is the only thing that compares the shipped drawing with the paper.

Usage:
    python check_diagrams.py --slug biology-waec --year 2025
    python check_diagrams.py --slug biology-waec --year 2025 --stems 2025_Q29-30 --label recheck

Writes out/diagrams/<slug>/check.<unit>.<label>.json
"""

import argparse, io, json, os, re, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed

from common import HERE, load_config, load_items, unit_name
from lanes import second_family

SCHEMA = os.path.join(HERE, 'schemas', 'diagram-check.schema.json')
INK = re.compile(r'#E2E8F0', re.I)

PREAMBLE = """You are checking a redrawn exam diagram against the original, for real {exam} {subject} questions. Students aged fourteen to sixteen will answer from the redraw alone, on a tablet, so it must carry exactly what the original carries.

Image 1 is the ORIGINAL, scanned from the paper. Image 2 is the REDRAW, rendered black on white for comparison (in the app it is light ink on a dark background; ignore that difference).

Check the drawing:
- D1: an element the questions depend on is missing from the redraw, or the redraw adds one the original does not have. Elements are labels, letters, numerals, arrows, lines, shapes, scale marks, shading that carries meaning. Stray marks count too: fragments of a caption, page number or neighbouring text caught at an edge of the redraw.
- D2: a printed label, letter, number or word differs from the original, or is unreadable in the redraw. Compare every label character by character, including its case and any subscript: a label that looks close is not good enough.
- D3: geometry is distorted enough to change an answer: a relative length, position, angle, proportion, or which label points at which part.
- D4: the redraw is too cluttered, broken or faint to read at tablet size.
Ignore differences that no question could depend on: paper texture, scan noise, slightly smoother curves, line weight.
Where the original is too blurred or damaged to read an element, the redraw may supply it from what the questions require. When the drawer has said so (listed below as reconstructed), that element is not a D1 or D2 failure for differing from an illegible original. It fails only if it contradicts a legible part of the original, or does not let every question be answered as settled.

Check the alt text, written for a student using a screen reader:
- A1: it describes something the diagram does not show, or misdescribes what it does show.
- A2: it gives away an answer. It must not name the part, organism, instrument, process or value a question asks the student to identify, and must not use the answer's vocabulary. The questions and their settled answers are below so you can check this.
- A3: it leaves out a printed label, axis title or value that a sighted student can read.

A pass means you would put this in front of a student today. For a fail, name the exact element and where it is, and for alt text quote the failing words and give replacement wording.
"""


def render(svg_path, size):
    """Shipped SVG to a black-on-white PNG at the original's pixel width."""
    import resvg_py
    from PIL import Image
    svg = open(svg_path, encoding='utf8').read()
    svg = re.sub(r'<!--.*?-->', '', svg, flags=re.S)
    svg = INK.sub('#000000', svg)
    w = max(int(size[0]), 600)
    png = bytes(resvg_py.svg_to_bytes(svg_string=svg, background='#ffffff', width=w))
    return Image.open(io.BytesIO(png))


def shipped_svg(ddir, stem, kind='shipped'):
    names = (f'{stem}.svg',) if kind == 'trace' else (f'{stem}.authored.svg', f'{stem}.svg')
    for name in names:
        p = os.path.join(ddir, name)
        if os.path.exists(p):
            return p
    return None


def check_one(d, cfg, exam, workdir):
    from PIL import Image
    orig = Image.open(d['original'])
    png = os.path.join(workdir, f"{d['stem']}.redraw.png")
    render(d['svg'], orig.size).save(png)
    m = re.search(r'<!--\s*reconstructed:(.*?)-->', open(d['svg'], encoding='utf8').read(), re.S | re.I)
    rebuilt = m.group(1).strip() if m else ''
    qs = '\n\n'.join(
        f"Question {q['q_number']}: {q['stem']}\n" + '\n'.join(f"  {k}. {v}" for k, v in sorted(q['options'].items()))
        + f"\n  Settled answer: {q['answer']}" for q in d['questions'])
    prompt = (PREAMBLE.format(exam=exam, subject=cfg['subject'])
              + f"\nDiagram: {d['stem']}\n"
              + (f"\nShared stem: {d['passage']}\n" if d['passage'] else '')
              + (f"\nReconstructed by the drawer because the original is illegible there: {rebuilt}\n" if rebuilt else '')
              + f"\nThe questions it serves:\n{qs}\n\nAlt text:\n{d['alt'] or '(none written)'}\n\n"
              + f'Return one entry with stem "{d["stem"]}".')
    data, lane = second_family(prompt, SCHEMA, [d['original'], png])
    if data is None:
        return {'ok': False, 'stem': d['stem'], 'error': json.dumps(lane)[:600], 'lane': lane}
    try:
        r = next(x for x in data['diagrams'] if x['stem'] == d['stem'])
    except Exception as e:
        return {'ok': False, 'stem': d['stem'], 'error': f'{type(e).__name__}: {e}', 'lane': lane}
    r['svg'] = os.path.basename(d['svg'])
    r['lane'] = 'codex' if lane['family'] == 'codex' else f"claude-{lane['model']}"
    return {'ok': True, 'result': r, 'lane': lane}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--slug', required=True)
    ap.add_argument('--year', type=int, required=True)
    ap.add_argument('--paper', type=int, default=1)
    ap.add_argument('--stems', help='comma list; check only these diagrams')
    ap.add_argument('--label', default='a')
    ap.add_argument('--svg-kind', choices=['shipped', 'trace'], default='shipped',
                    help='trace checks the automatic trace even where an authored SVG replaced it')
    ap.add_argument('--parallel', type=int, default=3)
    a = ap.parse_args()

    cfg = load_config(a.slug)
    u = unit_name(a.year, a.paper)
    items = load_items(a.slug, a.year, a.paper)
    out = os.path.join(HERE, 'out')
    final = json.load(open(os.path.join(out, f'{a.slug}.final.{u}.json'), encoding='utf8'))['answers']
    ddir = os.path.join(out, 'diagrams', a.slug)
    alt_path = os.path.join(ddir, 'alt.json')
    alts = json.load(open(alt_path, encoding='utf8')) if os.path.exists(alt_path) else {}
    only = set(a.stems.split(',')) if a.stems else None
    exam = next(iter(items.values()))['exam_brand']

    diagrams = {}
    for q in sorted(items):
        it = items[q]
        for rel in it.get('diagram_files', []):
            stem = os.path.splitext(os.path.basename(rel))[0]
            if only and stem not in only:
                continue
            d = diagrams.setdefault(stem, {
                'stem': stem, 'original': os.path.join(cfg['_diagram_root'], rel),
                'svg': shipped_svg(ddir, stem, a.svg_kind), 'alt': alts.get(stem, ''),
                'passage': it.get('passage_text') or '', 'questions': []})
            d['questions'].append({'q_number': q, 'stem': it['stem'], 'options': it['options'],
                                   'answer': (final.get(str(q)) or {}).get('answer') or 'not settled'})

    missing = [s for s, d in diagrams.items() if not d['svg']]
    todo = [d for d in diagrams.values() if d['svg']]
    workdir = os.path.join(HERE, 'work', a.slug, u, 'diagram-check')
    os.makedirs(workdir, exist_ok=True)

    results, failures, lanes = {}, [], []
    with ThreadPoolExecutor(max_workers=a.parallel) as ex:
        futs = {ex.submit(check_one, d, cfg, exam, workdir): d for d in todo}
        for fut in as_completed(futs):
            r = fut.result()
            lanes.append(r.get('lane', {}))
            if r['ok']:
                x = r['result']
                results[x['stem']] = x
                print(f"  {x['stem']:<16} drawing {x['drawing']:<4} {','.join(x['drawing_checks']):<8} "
                      f"alt {x['alt']:<4} {','.join(x['alt_checks'])}", flush=True)
            else:
                failures.append(r)
                print(f"  {r['stem']:<16} FAILED {r['error']}", flush=True)

    path = os.path.join(ddir, f'check.{u}.{a.label}.json')
    json.dump({'checker': 'codex', 'unit': u, 'results': dict(sorted(results.items())),
               'no_svg': missing, 'failures': failures, 'lanes': lanes,
               'fallback_cost_usd': round(sum(l.get('cost_usd', 0) for l in lanes), 4)},
              open(path, 'w', encoding='utf8'), indent=2, ensure_ascii=False)
    bad = [s for s, r in results.items() if r['drawing'] == 'fail' or r['alt'] == 'fail']
    print(f"{a.slug} {u}: {len(results)} checked, {len(bad)} failed, {len(missing)} with no SVG, "
          f"{len(failures)} errors -> {os.path.relpath(path, HERE)}")
    for s in bad:
        r = results[s]
        if r['drawing'] == 'fail':
            print(f"  {s} drawing: {r['drawing_notes'][:160]}")
        if r['alt'] == 'fail':
            print(f"  {s} alt: {r['alt_notes'][:160]}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
