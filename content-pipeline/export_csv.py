"""
W5 Exporter: settled, taught items to the admin import CSV.

Emits exactly the 24 columns the import template defines
(app/api/admin/import/template/route.ts). Only questions whose key is settled
("keyed" in final.<year>.json) AND that have passed teaching review are
exported. Everything else is listed in the report with its reason.

Three things this refuses to guess, because each is a decision:

1. Topic names. The import auto-creates any topic name it has not seen
   (SABI-REV-025). Exporting canonical names creates new topics alongside the
   106 that already exist. Exporting existing names perpetuates the duplicates.
   So the mode is a required flag, and the report says what each will do.
2. Image URLs. Diagrams must be uploaded to storage before the CSV can point
   at them. The base URL is a required argument, never hardcoded, because it
   names a specific project.
3. Alt text. The import rejects an image without alt text. Alt text must
   describe the diagram without giving away the answer, so it is authored,
   not generated here. Missing alt text blocks that row.

Usage:
    python export_csv.py --slug biology-waec --year 2025 \
        --topic-mode canonical --image-base "https://<project>/storage/v1/object/public/question-images"
"""

import argparse, csv, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))

COLUMNS = ['subject', 'topic', 'exam_type', 'year', 'question_text',
           'option_a', 'option_b', 'option_c', 'option_d', 'option_e',
           'correct_answer', 'solution', 'hint', 'hint1', 'hint2', 'hint3',
           'further_study_links', 'difficulty', 'passage', 'passage_id',
           'question_image_url', 'image_alt_text', 'image_width', 'image_height']


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--slug', required=True)
    ap.add_argument('--year', type=int, required=True)
    ap.add_argument('--topic-mode', required=True, choices=['canonical', 'existing'])
    ap.add_argument('--image-base', required=True,
                    help='public base URL of the storage folder the diagrams are uploaded to')
    ap.add_argument('--teaching', default=None, help='override path to reviewed teaching file')
    a = ap.parse_args()
    out = os.path.join(HERE, 'out')

    cfg = json.load(open(os.path.join(HERE, 'configs', f'{a.slug}.json'), encoding='utf8'))
    tax = json.load(open(os.path.join(HERE, 'taxonomies', f"{cfg['subject'].lower()}.json"), encoding='utf8'))
    canon = {c['id']: c for c in tax['canonical']}
    preferred = {c['id']: c.get('preferred_existing') for c in tax['canonical']}

    items = {i['q_number']: i for i in (json.loads(l) for l in open(os.path.join(out, f'{a.slug}.items.jsonl'), encoding='utf8'))
             if i['year'] == a.year}
    final = json.load(open(os.path.join(out, f'{a.slug}.final.{a.year}.json'), encoding='utf8'))['answers']
    tpath = a.teaching or os.path.join(out, f'{a.slug}.teaching.{a.year}.json')
    teach = {t['q_number']: t for t in json.load(open(tpath, encoding='utf8'))['items']}

    alt_path = os.path.join(out, 'diagrams', f'{a.slug}.alt.json')
    alts = json.load(open(alt_path, encoding='utf8')) if os.path.exists(alt_path) else {}
    dims_path = os.path.join(out, 'diagrams', 'redraw-report.json')
    dims = {}
    if os.path.exists(dims_path):
        for r in json.load(open(dims_path, encoding='utf8')):
            if 'size' in r:
                dims[os.path.splitext(r['source'])[0]] = r['size']

    rows, held, uploads = [], [], {}
    for q in sorted(items):
        it, f = items[q], final.get(str(q), {})
        if f.get('state') != 'keyed':
            held.append((q, f.get('state', 'missing'), f.get('reason', '')[:100]))
            continue
        t = teach.get(q)
        if not t:
            held.append((q, 'no-teaching', 'no reviewed hints or solution'))
            continue
        if t.get('review_status') not in (None, 'pass'):
            held.append((q, 'review-failed', t.get('review_status')))
            continue

        tid = t['topic_id']
        if tid not in canon:
            held.append((q, 'bad-topic', tid))
            continue
        topic = canon[tid]['name'] if a.topic_mode == 'canonical' else preferred.get(tid)
        if not topic:
            held.append((q, 'no-existing-topic', f'{tid} has no preferred existing name'))
            continue

        img = alt = w = h = ''
        if it['diagram_files']:
            stem = os.path.splitext(os.path.basename(it['diagram_files'][0]))[0]
            alt = alts.get(stem, '')
            if not alt:
                held.append((q, 'no-alt-text', stem))
                continue
            img = f"{a.image_base.rstrip('/')}/{cfg['subject'].lower()}/{it['exam_type'].lower()}/{a.year}/{stem}.svg"
            w, h = dims.get(stem, ['', ''])
            # The uploaded object is always named <stem>.svg. Its source is the
            # authored version when one exists, because an authored file only
            # exists where the trace failed. Uploading the trace instead would
            # ship the degraded diagram under the right name.
            ddir = os.path.join(out, 'diagrams')
            src = next((p for p in (f'{stem}.authored.svg', f'{stem}.svg')
                        if os.path.exists(os.path.join(ddir, p))), None)
            if not src:
                held.append((q, 'no-diagram-asset', stem))
                continue
            uploads[f"{cfg['subject'].lower()}/{it['exam_type'].lower()}/{a.year}/{stem}.svg"] = src

        opts = it['options']
        rows.append({
            'subject': cfg['subject'], 'topic': topic, 'exam_type': it['exam_type'],
            'year': a.year, 'question_text': it['stem'],
            'option_a': opts.get('A', ''), 'option_b': opts.get('B', ''),
            'option_c': opts.get('C', ''), 'option_d': opts.get('D', ''),
            'option_e': opts.get('E', ''),
            'correct_answer': f['answer'], 'solution': t['solution'],
            'hint': t['hint1'], 'hint1': t['hint1'], 'hint2': t['hint2'], 'hint3': t['hint3'],
            'further_study_links': '', 'difficulty': t['difficulty'],
            'passage': it['passage_text'] or '', 'passage_id': it['passage_id'] or '',
            'question_image_url': img, 'image_alt_text': alt,
            'image_width': w, 'image_height': h,
        })

    path = os.path.join(out, f'{a.slug}.{a.year}.import.csv')
    with open(path, 'w', newline='', encoding='utf-8-sig') as fh:
        wr = csv.DictWriter(fh, fieldnames=COLUMNS)
        wr.writeheader()
        wr.writerows(rows)

    manifest = os.path.join(out, f'{a.slug}.{a.year}.uploads.json')
    json.dump(dict(sorted(uploads.items())), open(manifest, 'w', encoding='utf8'), indent=2)

    print(f"{a.slug} {a.year}: {len(rows)} rows exported, {len(held)} held")
    print(f"  -> {os.path.basename(path)}")
    print(f"  -> {os.path.basename(manifest)}  ({len(uploads)} diagrams to upload before importing)")
    for dest, src in sorted(uploads.items()):
        if src.endswith('.authored.svg'):
            print(f"     {dest}  <- authored (trace rejected)")
    if a.topic_mode == 'canonical':
        used = sorted({r['topic'] for r in rows})
        print(f"  topic mode canonical: {len(used)} topic names. Any not already in the")
        print(f"  database will be CREATED by the import (SABI-REV-025).")
    for q, why, detail in held:
        print(f"  held Q{q:<3} {why:<18} {detail}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
