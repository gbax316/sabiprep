"""
The checks across the bank, the build against the last one, and the findings.

Per question: every check in contract.py. Across the bank: how many questions
the sources hold and how many reached the bank, the status split, the contract
pass rate of passed questions, failures per check, subtopics nothing covers.
Against the last build: a check that fails where it did not, or more often, is
a regression. Each finding names its check, how many questions, a few keys to
look at, and where the fix goes. Findings are for a person to act on; nothing
here changes a question.
"""

import datetime, glob, json, os
from collections import Counter

from common import OUT

from .contract import CHECKS

REPORTS = os.path.join(OUT, 'bank', 'reports')


def run_checks(data):
    papers = {p['paper_key']: p for p in data['papers']}
    failures = []
    for q in data['questions']:
        for c in CHECKS:
            if c['applies'] == 'passed' and q['status'] != 'passed':
                continue
            why = c['fn'](q, papers[q['paper_key']])
            if why:
                failures.append((q['question_key'], c['id'], why))
    return failures


def measure(data, failures, source_count):
    qs = data['questions']
    status = Counter(q['status'] for q in qs)
    by_check = Counter(cid for _, cid, _ in failures)
    st = {q['question_key']: q['status'] for q in qs}
    on_passed = Counter(cid for k, cid, _ in failures if st[k] == 'passed')
    contract = {c['id'] for c in CHECKS if c['severity'] == 'contract'}
    passed = {q['question_key'] for q in qs if q['status'] == 'passed'}
    broken = {k for k, cid, _ in failures if cid in contract and k in passed}
    covered = {q['subtopic_key'] for q in qs if q['subtopic_key']}
    return {
        'built_at': datetime.datetime.now().isoformat(timespec='seconds'),
        'source_questions': source_count, 'bank_questions': len(qs),
        'papers': len(data['papers']), 'passages': len(data['passages']),
        'status': dict(status),
        'passed_meeting_contract': len(passed) - len(broken),
        'contract_rate': round((len(passed) - len(broken)) / len(passed), 4) if passed else None,
        'failures_by_check': dict(by_check), 'failures_on_passed': dict(on_passed),
        'subtopics': len(data['subtopics']), 'subtopics_covered': len(covered),
        'examples': {cid: [k for k, c2, _ in failures if c2 == cid][:5] for cid in by_check},
    }


def last_report():
    files = sorted(glob.glob(os.path.join(REPORTS, '*.json')))
    return json.load(open(files[-1], encoding='utf8')) if files else None


def findings(now, before):
    """What a person should look at, worst first."""
    meta = {c['id']: c for c in CHECKS}
    out = []
    prev = (before or {}).get('failures_by_check', {})
    order = {'contract': 0, 'quality': 1}
    for cid, n in sorted(now['failures_by_check'].items(),
                         key=lambda x: (order.get(meta[x[0]]['severity'], 2) if now['failures_on_passed'].get(x[0])
                                        else 2, -x[1])):
        c = meta[cid]
        was = prev.get(cid, 0)
        # A contract check failed only by questions already separated is known,
        # not a defect: that failure is why they were separated.
        sev = c['severity'] if c['severity'] != 'contract' or now['failures_on_passed'].get(cid) else 'known'
        trend = 'new' if before and not was else f'up from {was}' if n > was else f'down from {was}' if n < was else 'same'
        out.append({'check': cid, 'severity': sev, 'what': c['what'], 'questions': n,
                    'of_them_passed': now['failures_on_passed'].get(cid, 0),
                    'since_last_build': trend if before else 'first build', 'look_at': now['examples'][cid],
                    'fix_goes_to': c['fix']})
    if before and before.get('contract_rate') and now.get('contract_rate') is not None \
            and now['contract_rate'] < before['contract_rate']:
        out.insert(0, {'check': 'contract-rate', 'severity': 'regression',
                       'what': 'share of passed questions meeting the contract fell',
                       'questions': None, 'since_last_build': f"{before['contract_rate']} to {now['contract_rate']}",
                       'look_at': [], 'fix_goes_to': 'the findings below'})
    return out


def save(report):
    os.makedirs(REPORTS, exist_ok=True)
    path = os.path.join(REPORTS, report['built_at'].replace(':', '') + '.json')
    json.dump(report, open(path, 'w', encoding='utf8'), indent=1, ensure_ascii=False)
    return path


def show(report):
    s = report['status']
    print(f"{report['bank_questions']} of {report['source_questions']} source questions in the bank, "
          f"{report['papers']} papers, {report['passages']} passages")
    print(f"passed {s.get('passed', 0)}, separated {s.get('separated', 0)}, waiting {s.get('waiting', 0)}; "
          f"passed meeting the contract {report['passed_meeting_contract']} ({report['contract_rate']})")
    print(f"subtopics covered {report['subtopics_covered']} of {report['subtopics']}")
    for f in report['findings']:
        print(f"  [{f['severity']}] {f['check']}: {f['questions']}, {f.get('of_them_passed', 0)} passed "
              f"({f['since_last_build']}) -> {f['fix_goes_to']}")
        if f['look_at']:
            print(f"      e.g. {', '.join(f['look_at'][:3])}")
