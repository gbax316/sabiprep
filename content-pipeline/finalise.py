"""
R1, second pass: settle the answer key for a year.

Merges the cross-family verdicts with the third-reviewer rulings into one
definitive file. Everything downstream (teaching, review, export) reads this and
nothing else, so there is exactly one place an answer can come from.

A question ends in one of four states:
  keyed        an answer, with the evidence that produced it
  ambiguous    two options are genuinely defensible; no key is issued
  defective    the question itself is broken
  needs-human  nothing settled it yet

Only "keyed" questions are exported. The rest go to a human with the reason.

Usage:
    python finalise.py --slug biology-waec --year 2025
"""

import argparse, json, os, sys
from collections import Counter

from common import load_items, unit_name

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--slug', required=True)
    ap.add_argument('--year', type=int, required=True)
    ap.add_argument('--paper', type=int, default=1)
    a = ap.parse_args()
    out = os.path.join(HERE, 'out')
    u = unit_name(a.year, a.paper)

    verdicts = json.load(open(os.path.join(out, f'{a.slug}.verdicts.{u}.json'), encoding='utf8'))['verdicts']
    adj_path = os.path.join(out, f'{a.slug}.adjudication.{u}.json')
    rulings = json.load(open(adj_path, encoding='utf8'))['rulings'] if os.path.exists(adj_path) else {}

    items = load_items(a.slug, a.year, a.paper)
    final = {}
    for k, v in verdicts.items():
        q = int(k)
        rec = {'q_number': q}
        if v['verdict'] == 'verified':
            # The second lane is Codex unless Codex was out of usage, when Claude
            # stood in (lanes.py). Say which, so a same-family key is visible.
            lane = (v.get('codex') or {}).get('lane', 'codex')
            rec.update(state='keyed', answer=v['answer'],
                       evidence=('cross-family agreement, both certain' if lane == 'codex'
                                 else f'same-family agreement ({lane} stood in for Codex), both certain'))
        elif k in rulings:
            r = rulings[k]
            if r['ruling'] == 'key':
                rec.update(state='keyed', answer=r['answer'],
                           evidence=f"third review, sided with {r['sided_with']}")
            else:
                rec.update(state=r['ruling'], answer=None, reason=r['reasoning'])
        elif v['verdict'] == 'unsolvable':
            issues = [d['issue'] for d in (v['codex'], v['claude']) if d and d.get('issue')]
            rec.update(state='defective', answer=None,
                       reason=' | '.join(issues) or 'both derivers found it unanswerable')
        else:
            rec.update(state='needs-human', answer=None,
                       reason=f"verdict {v['verdict']} and no third-review ruling")
        # The paper's own key, read off the printed page by a person. It is
        # evidence, never a shortcut: models that derived the same letter are
        # confirmed by it; models that derived a different one are not
        # overruled by it, because the person may have misread the row too.
        # The disagreement goes to a human with both letters shown. Where the
        # models found two defensible options, the paper's key settles which
        # one the examiner meant. A defective question stays held: a key
        # cannot repair wording that contradicts it.
        off = (items.get(q) or {}).get('official_key')
        if off:
            if rec['state'] == 'keyed' and rec['answer'] == off:
                rec['evidence'] += "; matches the paper's key"
            elif rec['state'] == 'keyed':
                rec.update(state='needs-human', reason=f"the models keyed {rec['answer']}, the paper's key "
                           f"as read by a person is {off}", answer=None, model_answer=rec['answer'])
                rec.pop('evidence', None)
            elif rec['state'] in ('ambiguous', 'needs-human'):
                rec.update(state='keyed', answer=off, evidence=f"the paper's key, read by a person, settled "
                           f"a question the models could not: {rec.get('reason', '')[:200]}")
                rec.pop('reason', None)
            rec['official_key'] = off
        final[str(q)] = rec

    counts = Counter(r['state'] for r in final.values())
    path = os.path.join(out, f'{a.slug}.final.{u}.json')
    json.dump({'year': a.year, 'paper': a.paper, 'counts': dict(counts), 'answers': final},
              open(path, 'w', encoding='utf8'), indent=2, ensure_ascii=False)

    print(f"{a.slug} {u}: {len(final)} questions")
    for s in ('keyed', 'ambiguous', 'defective', 'needs-human'):
        print(f"  {s:<12} {counts.get(s, 0):>3}")
    held = [r for r in final.values() if r['state'] != 'keyed']
    if held:
        print('\nheld for a human:')
        for r in sorted(held, key=lambda x: x['q_number']):
            print(f"  Q{r['q_number']:<3} {r['state']:<10} {r.get('reason', '')[:120]}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
