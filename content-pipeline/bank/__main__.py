import argparse, os, sqlite3, sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from common import OUT, all_items          # noqa: E402

from bank import collect, evals, store     # noqa: E402
from bank.contract import CHECKS           # noqa: E402

BANK = os.path.join(OUT, 'bank', 'sabiprep-bank.sqlite')


def build():
    data = collect.collect()
    slugs = {p['pipeline_slug'] for p in data['papers']}
    source = sum(len(all_items(s)) for s in slugs)
    failures = evals.run_checks(data)
    before = evals.last_report()
    report = evals.measure(data, failures, source)
    report['findings'] = evals.findings(report, before)
    store.write(BANK, data, CHECKS, failures, {'built_at': report['built_at'], 'source_questions': source})
    path = evals.save(report)
    evals.show(report)
    print(f'bank: {BANK}\nreport: {path}')
    return 0


def main():
    ap = argparse.ArgumentParser(description='Build, check or query the question bank.')
    ap.add_argument('--query', help='one SQL query against the last build')
    ap.add_argument('--report', action='store_true', help="the last build's report, without building")
    a = ap.parse_args()
    if a.query:
        db = sqlite3.connect(f'file:{BANK}?mode=ro', uri=True)
        cur = db.execute(a.query)
        print(' | '.join(d[0] for d in cur.description))
        for r in cur.fetchall():
            print(' | '.join('' if v is None else str(v) for v in r))
        return 0
    if a.report:
        evals.show(evals.last_report())
        return 0
    return build()


if __name__ == '__main__':
    sys.exit(main())
