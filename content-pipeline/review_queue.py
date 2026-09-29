"""
The review batch: every question the system could not confirm, in one place.

Orezi's rule (2026-09-29): a question the pipeline cannot confirm with
certainty, meaning the text is right, the diagram matches, the options are
sound and the key is settled, is never guessed into the import. It waits here,
with its reason, until a person decides what to do with it.

Reasons are collected from what each stage already records, so nothing here
re-judges a question:

  key         the answer key is not settled: ambiguous, defective, needs a human
  source      the extractor could not read it cleanly: missing options, a lost
              number, damaged option letters
  diagram     the text refers to a diagram and none is attached, or the redraw
              failed its check after one repair
  alt         the two model families still disagree on the alt text (ships)
  teaching    the last teaching pass held it, or the author challenged the key
  placement   the author thinks it sits on the wrong subtopic (ships)
  same-family the key rests on two Claude models agreeing because Codex was out
              (ships; re-derive on Codex when it is back)

Usage:
    python review_queue.py                 every subject
    python review_queue.py --slug biology-waec
Writes out/review-queue.json
"""

import argparse, json, os, re, sys

from common import HERE, OUT, all_items, load_config, unit_name

REF = re.compile(r'\b(diagrams?|figures? (?:below|above|shown)|fig\.|graphs? (?:below|above|shown)|(?:the|this) graph|'
                 r'illustrat(?:ed|ion) (?:below|above)|drawing|chart|map|table (?:below|above)|shown (?:below|above)|'
                 r'(?:structure|apparatus|set-?up|circuit|curve|triangle) (?:below|above|shown))\b', re.I)

SHIPS = {'alt', 'placement', 'same-family'}      # queued for a look, not held from the import


def jload(p, default=None):
    return json.load(open(p, encoding='utf8')) if os.path.exists(p) else default


def collect(slug):
    cfg = load_config(slug)
    ddir = os.path.join(OUT, 'diagrams', slug)
    status = jload(os.path.join(ddir, 'status.json'), {})
    rows = []
    items = all_items(slug)
    units = sorted({(i['year'], i.get('paper', 1)) for i in items}, reverse=True)
    for year, paper in units:
        u = unit_name(year, paper)
        final = (jload(os.path.join(OUT, f'{slug}.final.{u}.json')) or {}).get('answers', {})
        teach = {t['q_number']: t for t in (jload(os.path.join(OUT, f'{slug}.teaching.{u}.json')) or {}).get('items', [])}
        verd = (jload(os.path.join(OUT, f'{slug}.verdicts.{u}.json')) or {}).get('verdicts', {})
        ran = bool(final)
        for it in (i for i in items if i['year'] == year and i.get('paper', 1) == paper):
            q = it['q_number']
            why = []
            f = final.get(str(q), {})
            if ran and f.get('state') not in (None, 'keyed'):
                why.append(('key', f"{f['state']}: {f.get('reason', '')}"))
            if it.get('needs_human') or it.get('anomaly'):
                why.append(('source', it.get('anomaly') or 'the extractor could not read this question cleanly'))
            if not it.get('diagram_files') and REF.search(it['stem'] + ' ' + (it.get('passage_text') or '')):
                why.append(('diagram', 'the question refers to a diagram, and no diagram file was supplied for it'))
            for rel in it.get('diagram_files') or []:
                stem = os.path.splitext(os.path.basename(rel))[0]
                s = status.get(stem, {})
                if s.get('status') == 'held':
                    why.append(('diagram', f'the redraw still failed its check after one repair: {s.get("reason", "")}'))
                elif s.get('status') == 'alt-disputed':
                    why.append(('alt', s.get('reason', '')))
            t = teach.get(q, {})
            if str(t.get('review_status', '')).startswith('held'):
                why.append(('teaching', t['review_status']))
            if t.get('answer_challenge'):
                why.append(('teaching', f"the teaching author doubts the key: {t['answer_challenge']}"))
            if t.get('placement_challenge'):
                why.append(('placement', t['placement_challenge']))
            if 'same-family' in f.get('evidence', ''):
                why.append(('same-family', f['evidence']))
            if not why:
                continue
            v = verd.get(str(q), {})
            rows.append({
                'id': f'{slug}:{u}:{q}', 'slug': slug, 'subject': cfg['subject'], 'exam': it['exam_brand'],
                'unit': u, 'year': year, 'paper': paper, 'q_number': q,
                'reasons': [{'kind': k, 'detail': d} for k, d in why],
                'held': any(k not in SHIPS for k, _ in why),
                'processed': ran,
                'stem': it['stem'], 'options': it['options'], 'passage_text': it.get('passage_text'),
                'passage_id': it.get('passage_id'), 'diagram_files': it.get('diagram_files') or [],
                'key': f.get('answer'), 'state': f.get('state'),
                'derivers': {x: {k: (v.get(x) or {}).get(k) for k in ('answer', 'confidence', 'reasoning', 'issue')}
                             for x in ('codex', 'claude') if v.get(x)},
            })
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--slug')
    a = ap.parse_args()
    slugs = [a.slug] if a.slug else sorted(f[:-5] for f in os.listdir(os.path.join(HERE, 'configs')))
    rows = []
    for s in slugs:
        if os.path.exists(os.path.join(OUT, f'{s}.items.jsonl')):
            rows += collect(s)
    json.dump({'items': rows}, open(os.path.join(OUT, 'review-queue.json'), 'w', encoding='utf8'),
              indent=1, ensure_ascii=False)
    from collections import Counter
    by = Counter((r['slug'], r['held']) for r in rows)
    kinds = Counter(x['kind'] for r in rows for x in r['reasons'])
    print(f"{len(rows)} questions queued, {sum(r['held'] for r in rows)} held from the import")
    print('by reason:', dict(kinds.most_common()))
    for s in slugs:
        h, sh = by.get((s, True), 0), by.get((s, False), 0)
        if h or sh:
            print(f'  {s:<26} held {h:>3}   ships but queued {sh:>3}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
