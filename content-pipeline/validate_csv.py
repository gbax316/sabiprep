"""
Pre-flight a CSV against the admin import's validation rules, offline.

The real endpoint cannot be used for this: its "validate" step writes new topics
to the live taxonomy (SABI-REV-025). So this mirrors the 14 rules the import
enforces (app/api/admin/import/validate/route.ts), then adds the gaps the
import does NOT check, documented as the validator spec in LEDGER.md, because a
row can pass the real import and still be a broken question.

Usage:
    python validate_csv.py out/biology-waec.2025.import.csv
"""

import csv, re, sys
from urllib.parse import urlparse

REQUIRED = ['subject', 'topic', 'exam_type', 'year', 'question_text',
            'option_a', 'option_b', 'correct_answer']
DIAGRAM_WORDS = re.compile(r'\b(diagram|figure|graph|illustrat\w*|shown below|drawing|chart|map)\b', re.I)
WORD = re.compile(r"[a-z][a-z'-]{3,}")


def answer_words_in_alt(r):
    """Words the alt text shares with the correct option, where no other option
    and not the question uses them. On Biology 2025 Q29 the alt text called the
    instrument a "circular disc", and the only option containing "disc" was the
    key, Secchi disc: a screen-reader user was handed the answer. A model
    reviewer passed that text once and failed it once, so it is also checked
    here mechanically."""
    alt = set(WORD.findall(r['image_alt_text'].lower()))
    if not alt or r['correct_answer'] not in 'ABCDE' or not r['correct_answer']:
        return set()
    key = set(WORD.findall(r.get(f"option_{r['correct_answer'].lower()}", '').lower()))
    others = set()
    for c in 'abcde':
        if c != r['correct_answer'].lower():
            others |= set(WORD.findall(r.get(f'option_{c}', '').lower()))
    asked = set(WORD.findall((r['question_text'] + ' ' + r['passage']).lower()))
    return (key - others - asked) & alt


def main(path):
    rows = list(csv.DictReader(open(path, encoding='utf-8-sig')))
    enforced, gaps = [], []
    seen = {}
    for n, r in enumerate(rows, start=2):
        q = f"row {n} ({r.get('year')} {r.get('question_text', '')[:40]!r})"
        # --- the 14 rules the real import enforces ---
        for f in REQUIRED:
            if not (r.get(f) or '').strip():
                enforced.append(f"{q}: missing {f}")
        if r['exam_type'] not in ('WAEC', 'JAMB', 'NECO', 'GCE'):
            enforced.append(f"{q}: exam_type {r['exam_type']!r}")
        if not re.fullmatch(r'\d{4}', r['year']) or not 1900 <= int(r['year']) <= 2100:
            enforced.append(f"{q}: year {r['year']!r}")
        if r['difficulty'] and r['difficulty'] not in ('easy', 'medium', 'hard'):
            enforced.append(f"{q}: difficulty {r['difficulty']!r}")
        ca = r['correct_answer']
        if ca not in 'ABCDE' or not ca:
            enforced.append(f"{q}: correct_answer {ca!r}")
        elif not (r.get(f'option_{ca.lower()}') or '').strip():
            enforced.append(f"{q}: correct_answer {ca} points at an empty option")
        url = r['question_image_url']
        if url:
            p = urlparse(url)
            if p.scheme not in ('http', 'https') or not p.netloc:
                enforced.append(f"{q}: image url not a URL")
            if not r['image_alt_text'].strip():
                enforced.append(f"{q}: image without alt text")
        for f in ('image_width', 'image_height'):
            if r[f] and not (r[f].isdigit() and int(r[f]) > 0):
                enforced.append(f"{q}: {f} {r[f]!r}")
        if r['passage_id'] and not re.fullmatch(r'[A-Za-z0-9_-]+', r['passage_id']):
            enforced.append(f"{q}: passage_id {r['passage_id']!r}")
        key = r['question_text'].strip().lower()
        if key in seen:
            enforced.append(f"{q}: duplicate question text of row {seen[key]}")
        seen[key] = n

        # --- gaps the real import does not check ---
        opts = [r[f'option_{c}'].strip() for c in 'abcde' if r[f'option_{c}'].strip()]
        if len(opts) != len({o.lower() for o in opts}):
            gaps.append(f"{q}: two options are identical")
        if len(opts) < 4:
            gaps.append(f"{q}: only {len(opts)} options")
        text = r['question_text'] + ' ' + r['passage']
        if DIAGRAM_WORDS.search(text) and not url:
            gaps.append(f"{q}: mentions a diagram but has no image")
        for f in ('solution', 'hint1', 'hint2', 'hint3'):
            if not r[f].strip():
                gaps.append(f"{q}: empty {f}")
        if re.search(r'\*\*|^#|`', r['solution'], re.M):
            gaps.append(f"{q}: markdown in solution (renders as literal symbols)")
        if '—' in ''.join(r.values()):
            gaps.append(f"{q}: em-dash")
        if not r['solution'].startswith(f"Answer: {ca}."):
            gaps.append(f"{q}: solution does not open with 'Answer: {ca}.'")
        leak = answer_words_in_alt(r)
        if leak:
            gaps.append(f"{q}: alt text uses a word only the correct option has: {', '.join(sorted(leak))}")

    # passages: every row sharing a passage_id must carry the same text
    by_pid = {}
    for n, r in enumerate(rows, start=2):
        if r['passage_id']:
            by_pid.setdefault(r['passage_id'], set()).add(r['passage'])
    for pid, texts in by_pid.items():
        if len(texts) > 1:
            gaps.append(f"passage {pid}: rows disagree on the passage text")

    print(f"{path}: {len(rows)} rows")
    print(f"  import-enforced rules : {'PASS' if not enforced else f'{len(enforced)} FAIL'}")
    for e in enforced:
        print(f"    {e}")
    print(f"  gaps the import misses: {'PASS' if not gaps else f'{len(gaps)} FLAG'}")
    for g in gaps:
        print(f"    {g}")
    return 1 if enforced else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1]))
