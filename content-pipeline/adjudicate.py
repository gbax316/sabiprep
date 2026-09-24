"""
R1 Answer adjudicator, first pass: compare the independent derivations.

This step is deterministic. It never picks a winner between two models that
disagree; it only sorts each question into a bucket and makes the evidence
visible. A disagreement goes to a third, fresh reviewer or to a human.

The bar for "verified" is deliberately high:
  both derivers answered, both say solvable, they agree on the letter,
  and both are "certain".
Two models from different families reaching the same answer independently and
confidently is the strongest signal available without a human. Anything short
of it is surfaced, not accepted.

Usage:
    python adjudicate.py --slug biology-waec --year 2025
"""

import argparse, json, os, sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))

VERIFIED = 'verified'            # agree, both certain, both solvable
AGREED_SOFT = 'agreed-soft'      # agree, but at least one said probable
DISAGREE = 'disagree'            # different letters
UNSOLVABLE = 'unsolvable'        # either says it cannot be answered
INCOMPLETE = 'incomplete'        # a deriver produced nothing for it


def load(path):
    if not os.path.exists(path):
        return None
    return json.load(open(path, encoding='utf8'))


def classify(a, b):
    if a is None or b is None:
        return INCOMPLETE
    if not a.get('solvable') or not b.get('solvable') or 'NONE' in (a['answer'], b['answer']):
        return UNSOLVABLE
    if a['answer'] != b['answer']:
        return DISAGREE
    if a['confidence'] == 'certain' and b['confidence'] == 'certain':
        return VERIFIED
    return AGREED_SOFT


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--slug', required=True)
    ap.add_argument('--year', type=int, required=True)
    a = ap.parse_args()

    out = os.path.join(HERE, 'out')
    items = {it['q_number']: it for it in
             (json.loads(l) for l in open(os.path.join(out, f'{a.slug}.items.jsonl'), encoding='utf8'))
             if it['year'] == a.year}
    cx = load(os.path.join(out, f'{a.slug}.codex.{a.year}.json'))
    cl = load(os.path.join(out, f'{a.slug}.claude.{a.year}.json'))
    if cx is None or cl is None:
        print(f"missing derivation: codex={'ok' if cx else 'MISSING'} claude={'ok' if cl else 'MISSING'}")
        return 1

    verdicts = {}
    for q in sorted(items):
        ca = cx['answers'].get(str(q))
        cb = cl['answers'].get(str(q))
        v = classify(ca, cb)
        verdicts[str(q)] = {
            'q_number': q,
            'verdict': v,
            'answer': ca['answer'] if v in (VERIFIED, AGREED_SOFT) else None,
            'codex': ca,
            'claude': cb,
            'extract_anomaly': items[q].get('anomaly'),
        }

    counts = Counter(v['verdict'] for v in verdicts.values())
    path = os.path.join(out, f'{a.slug}.verdicts.{a.year}.json')
    json.dump({'year': a.year, 'counts': dict(counts), 'verdicts': verdicts},
              open(path, 'w', encoding='utf8'), indent=2, ensure_ascii=False)

    total = len(verdicts)
    print(f"{a.slug} {a.year}: {total} questions")
    for k in (VERIFIED, AGREED_SOFT, DISAGREE, UNSOLVABLE, INCOMPLETE):
        print(f"  {k:<12} {counts.get(k, 0):>3}")
    print(f"  verified rate: {counts.get(VERIFIED, 0) / total:.0%}")

    for k in (DISAGREE, UNSOLVABLE, INCOMPLETE):
        rows = [v for v in verdicts.values() if v['verdict'] == k]
        if not rows:
            continue
        print(f"\n--- {k} ---")
        for v in rows:
            c = v['codex'] or {}
            l = v['claude'] or {}
            print(f"  Q{v['q_number']}: codex={c.get('answer')}({c.get('confidence')}) "
                  f"claude={l.get('answer')}({l.get('confidence')})")
            for who, d in (('codex', c), ('claude', l)):
                if d.get('issue'):
                    print(f"      {who} issue: {d['issue'][:140]}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
