"""
The sort (D9): every question either passed or separated, per subject.

Passed means exported: keyed by cross-family agreement or settled, taught,
reviewed, its diagram (if any) checked. Separated means held, with its reason
from the review batch. A paper not yet run is neither, and is counted as
waiting. Nothing here judges a question; it only gathers what the stages said.

Writes, under out/sorted/:
  <slug>.passed.csv       every passed row across the subject's papers, newest first
  <slug>.uploads.json     the diagrams those rows need uploaded
  summary.json            the counts below, per subject

Usage:
    python sort_report.py
"""

import csv, json, os, sys
from collections import Counter

from common import HERE, OUT, all_items, unit_name, units

SORTED = os.path.join(OUT, 'sorted')


def jload(p, default=None):
    return json.load(open(p, encoding='utf8')) if os.path.exists(p) else default


def main():
    os.makedirs(SORTED, exist_ok=True)
    queue = jload(os.path.join(OUT, 'review-queue.json'), {'items': []})['items']
    held = {r['id']: r for r in queue if r['held']}
    slugs = sorted(f[:-5] for f in os.listdir(os.path.join(HERE, 'configs')) if f.endswith('.json'))
    summary, total = {}, Counter()
    for slug in slugs:
        if not os.path.exists(os.path.join(OUT, f'{slug}.items.jsonl')):
            continue
        items = all_items(slug)
        rows, uploads, header = [], {}, None
        c = Counter()
        reasons = Counter()
        for y, p in units(slug):
            u = unit_name(y, p)
            n = sum(1 for i in items if i['year'] == y and i.get('paper', 1) == p)
            csvp = next((x for x in (os.path.join(OUT, f'{slug}.{u}.import.csv'),
                                     os.path.join(OUT, f'{slug}.{u}.PREVIEW.csv')) if os.path.exists(x)), None)
            if not csvp or not os.path.exists(os.path.join(OUT, f'{slug}.final.{u}.json')):
                sep = [r for k, r in held.items() if k.startswith(f'{slug}:{u}:')]
                c['separated'] += len(sep)
                c['waiting'] += n - len(sep)
                for r in sep:
                    reasons.update({x['kind'] for x in r['reasons']})
                continue
            with open(csvp, encoding='utf-8-sig', newline='') as fh:
                rd = csv.DictReader(fh)
                header = rd.fieldnames
                got = list(rd)
            rows += got
            uploads.update(jload(csvp.replace('.import.csv', '.uploads.json').replace('.PREVIEW.csv', '.PREVIEW.uploads.json'), {}))
            c['passed'] += len(got)
            sep = [r for k, r in held.items() if k.startswith(f'{slug}:{u}:')]
            c['separated'] += n - len(got)
            for r in sep:
                reasons.update({x['kind'] for x in r['reasons']})
            # A question the export held but no queue reason explains still counts
            # as separated; the queue's "export" reason names it.
        if rows:
            with open(os.path.join(SORTED, f'{slug}.passed.csv'), 'w', encoding='utf-8-sig', newline='') as fh:
                wr = csv.DictWriter(fh, fieldnames=header)
                wr.writeheader()
                wr.writerows(rows)
            json.dump(dict(sorted(uploads.items())), open(os.path.join(SORTED, f'{slug}.uploads.json'), 'w',
                                                          encoding='utf8'), indent=1)
        summary[slug] = {**c, 'questions': len(items), 'separated_by_reason': dict(reasons.most_common())}
        total.update(c)
        total['questions'] += len(items)
    json.dump({'total': dict(total), 'subjects': summary}, open(os.path.join(SORTED, 'summary.json'), 'w',
                                                                 encoding='utf8'), indent=1)
    print(f"{'subject':<26} {'questions':>9} {'passed':>7} {'separated':>9} {'waiting':>7}")
    for s, v in summary.items():
        print(f"{s:<26} {v['questions']:>9} {v.get('passed', 0):>7} {v.get('separated', 0):>9} {v.get('waiting', 0):>7}")
    print(f"{'all':<26} {total['questions']:>9} {total['passed']:>7} {total['separated']:>9} {total['waiting']:>7}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
