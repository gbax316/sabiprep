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

from common import load_items, subject_key, taxonomy_path, unit_name

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
    ap.add_argument('--paper', type=int, default=1)
    ap.add_argument('--topic-mode', required=True, choices=['canonical', 'existing'])
    ap.add_argument('--image-base', required=True,
                    help='public base URL of the storage folder the diagrams are uploaded to')
    ap.add_argument('--teaching', default=None, help='override path to reviewed teaching file')
    a = ap.parse_args()
    out = os.path.join(HERE, 'out')

    cfg = json.load(open(os.path.join(HERE, 'configs', f'{a.slug}.json'), encoding='utf8'))
    tax = json.load(open(taxonomy_path(cfg), encoding='utf8'))
    # Two-level taxonomy: parents with subtopics. A question sits on a
    # subtopic; the import's single "topic" column carries the subtopic name,
    # and the parent link is made by the topic migration, not by the CSV.
    names, parent_of = {}, {}
    for t in tax['topics']:
        names[t['id']] = t['name']
        for s in t['subtopics']:
            names[s['id']] = s['name']
            parent_of[s['id']] = t['id']
    # "existing" mode reuses a legacy database topic name that folds into the
    # same node. Half the syllabus had no legacy topic at all, so this mode
    # holds rows rather than invent a name.
    legacy_for = {}
    for old, node in tax.get('legacy_to', {}).items():
        legacy_for.setdefault(node, old)

    u = unit_name(a.year, a.paper)
    items = load_items(a.slug, a.year, a.paper)
    final = json.load(open(os.path.join(out, f'{a.slug}.final.{u}.json'), encoding='utf8'))['answers']
    tpath = a.teaching or os.path.join(out, f'{a.slug}.teaching.{u}.json')
    teach = {t['q_number']: t for t in json.load(open(tpath, encoding='utf8'))['items']}

    # One folder per subject: every paper names its images 2025_Q2-3, so a
    # shared folder would let the second subject overwrite the first.
    ddir = os.path.join(out, 'diagrams', a.slug)
    alt_path = os.path.join(ddir, 'alt.json')
    alts = json.load(open(alt_path, encoding='utf8')) if os.path.exists(alt_path) else {}
    dims_path = os.path.join(ddir, 'redraw-report.json')
    # A diagram the cross-family check still failed after one repair is held,
    # and so is every question that depends on it.
    status_path = os.path.join(ddir, 'status.json')
    dstatus = json.load(open(status_path, encoding='utf8')) if os.path.exists(status_path) else {}
    dims = {}
    if os.path.exists(dims_path):
        for r in json.load(open(dims_path, encoding='utf8')):
            if 'size' in r:
                dims[os.path.splitext(r['source'])[0]] = r['size']

    # Questions that share only a diagram have no shared stem, so they had no
    # group key and no app could keep them together. Give each such diagram a
    # group key of its own, so every group, text or diagram, travels as one.
    serves = {}
    for i in items.values():
        for rel in i.get('diagram_files') or []:
            serves.setdefault(rel, []).append(i['q_number'])

    def group_key(it):
        if it['passage_id']:
            return it['passage_id']
        for rel in it.get('diagram_files') or []:
            if len(serves.get(rel, [])) > 1:
                stem = os.path.splitext(os.path.basename(rel))[0]
                return f"{a.slug}-{u}-{stem}".replace('_', '-').lower()
        return ''

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

        tid = t.get('subtopic_id') or t['topic_id']
        if tid not in names:
            held.append((q, 'bad-topic', tid))
            continue
        if tid not in parent_of:
            held.append((q, 'parent-only', f'{tid} is a parent; place it on a subtopic first'))
            continue
        topic = names[tid] if a.topic_mode == 'canonical' else legacy_for.get(tid)
        if not topic:
            held.append((q, 'no-existing-topic', f'{tid} has no legacy topic folded into it'))
            continue

        img = alt = w = h = ''
        if it['diagram_files']:
            stem = os.path.splitext(os.path.basename(it['diagram_files'][0]))[0]
            if dstatus.get(stem, {}).get('status') == 'held':
                held.append((q, 'diagram-held', dstatus[stem].get('reason', '')[:100]))
                continue
            alt = alts.get(stem, '')
            if not alt:
                held.append((q, 'no-alt-text', stem))
                continue
            img = f"{a.image_base.rstrip('/')}/{subject_key(cfg)}/{it['exam_type'].lower()}/{a.year}/{stem}.svg"
            w, h = dims.get(stem, ['', ''])
            # The uploaded object is always named <stem>.svg. Its source is the
            # authored version when one exists, because an authored file only
            # exists where the trace failed. Uploading the trace instead would
            # ship the degraded diagram under the right name.
            src = next((p for p in (f'{stem}.authored.svg', f'{stem}.svg')
                        if os.path.exists(os.path.join(ddir, p))), None)
            if not src:
                held.append((q, 'no-diagram-asset', stem))
                continue
            uploads[f"{subject_key(cfg)}/{it['exam_type'].lower()}/{a.year}/{stem}.svg"] = src

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
            'passage': it['passage_text'] or '', 'passage_id': group_key(it),
            'question_image_url': img, 'image_alt_text': alt,
            'image_width': w, 'image_height': h,
        })

    path = os.path.join(out, f'{a.slug}.{u}.import.csv')
    with open(path, 'w', newline='', encoding='utf-8-sig') as fh:
        wr = csv.DictWriter(fh, fieldnames=COLUMNS)
        wr.writeheader()
        wr.writerows(rows)

    manifest = os.path.join(out, f'{a.slug}.{u}.uploads.json')
    json.dump(dict(sorted(uploads.items())), open(manifest, 'w', encoding='utf8'), indent=2)

    json.dump([{'q_number': q, 'why': why, 'detail': detail} for q, why, detail in held],
              open(os.path.join(out, f'{a.slug}.{u}.held.json'), 'w', encoding='utf8'),
              indent=2, ensure_ascii=False)

    print(f"{a.slug} {u}: {len(rows)} rows exported, {len(held)} held")
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
