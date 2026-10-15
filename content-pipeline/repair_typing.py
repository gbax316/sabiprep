"""
Restore damaged option labels, and nothing else.

Some questions arrive with their options typed into the stem with a label lost
or mangled: "Lithium B. Potassium C. Sodium D. Zinc" (no "A."), "A Cactus",
"B distillation", "·A.", "(e) water" where "(c)" belongs. The extractor
refuses to guess at these, rightly. A model can see the intended split, but a
model can also quietly change a word, so its repair is accepted only when a
mechanical check proves the words are untouched: with letters a to e allowed to
appear, vanish or change one at a time (the labels), the stem and options must
read exactly as the typed text. Anything else is rejected and the question
stays separated.

An accepted repair is written into corrections/<slug>.json as text, beside any
key a person gave, so the extractor applies it and the two models then answer
it independently like any other question.

Usage:
    python repair_typing.py              every subject's unreadable questions
    python repair_typing.py --dry-run    show what would be written
"""

import argparse, datetime, difflib, json, os, re, subprocess, sys

from common import HERE, OUT, all_items, unit_name
from extract import split_options

MODEL = 'opus'

BRIEF = """You are restoring damaged option labels in typed exam questions. Each item in `input.json` has `raw`: a question whose answer options are typed inline, with one or more option labels missing, garbled or mistyped (for example "Lithium B. Potassium C. Sodium D. Zinc" has lost "A.", "A Cactus" has lost the full stop, "(e) water" stands where "(c) water" belongs).

For each item, write the question back with every option labelled "A. ", "B. ", "C. ", "D. " (and "E. " if the paper has five), in order.

Rules:
- Change only the labels. Do not add, remove, reorder or correct any other word, number, symbol or punctuation, even an obvious typo. The one allowance: put a single space before each label, and drop a stray mark jammed against a label ("·A." becomes " A.", "is.......A." becomes "is....... A.").
- Put a space after each label's full stop.
- If the options cannot be told apart without changing words (two options run together with no break, an option missing entirely, two labels for one option), do not repair it: give `"text": null` and say why in `why`.

Write `output.json`: {"items": {"<id>": {"text": "<question with labels restored, or null>", "why": "<one line>"}}}.
"""


def words(s):
    return re.sub(r'[^0-9a-z]', '', s.lower())


def labels_only(raw, text):
    """True when the repair differs from the raw text only by option labels.
    Both sides keep their labels, so a restored "A." shows as one inserted
    letter and "(e)" made "(c)" as one changed letter; punctuation and spaces
    are ignored. Options that are themselves letters ("I", "II") stay aligned."""
    a, b = words(raw), words(text)
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if op == 'equal':
            continue
        chunk = a[i1:i2] + b[j1:j2]
        if (i2 - i1) > 1 or (j2 - j1) > 1 or set(chunk) - set('abcde'):
            return False
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()

    todo = {}
    for fn in sorted(os.listdir(os.path.join(HERE, 'configs'))):
        slug = fn[:-5]
        if not os.path.exists(os.path.join(OUT, f'{slug}.items.jsonl')):
            continue
        for it in all_items(slug):
            if it.get('needs_human') and it.get('anomaly') != 'options-are-drawings':
                raw = re.sub(r'^\d{1,3}[\.\)]\s*', '', it['raw'])
                todo[f"{slug}|{unit_name(it['year'], it.get('paper', 1))}|{it['q_number']}"] = {
                    'raw': raw, 'anomaly': it['anomaly']}
    print(f'{len(todo)} unreadable questions')

    wd = os.path.join(HERE, 'work', 'repair', datetime.date.today().isoformat())
    os.makedirs(wd, exist_ok=True)
    json.dump({'items': todo}, open(os.path.join(wd, 'input.json'), 'w', encoding='utf8'), indent=1, ensure_ascii=False)
    cmd = ['claude', '-p', '--restricted', '--safe-mode', '--strict-mcp-config', '--model', MODEL,
           '--permission-mode', 'acceptEdits', '--output-format', 'json', '--no-session-persistence',
           '--allowedTools', 'Read', 'Write', 'Edit']
    p = subprocess.run(cmd, input=BRIEF, cwd=wd, capture_output=True, text=True, encoding='utf8', timeout=3600)
    open(os.path.join(wd, 'session.json'), 'w', encoding='utf8').write(p.stdout or '')
    cost = json.loads(p.stdout).get('total_cost_usd', 0) if p.stdout.strip().startswith('{') else 0
    out = json.load(open(os.path.join(wd, 'output.json'), encoding='utf8'))['items']

    accepted, rejected = {}, []
    for k, v in todo.items():
        r = out.get(k) or {}
        text = r.get('text')
        if not text:
            rejected.append((k, 'declined: ' + (r.get('why') or 'no answer')))
            continue
        stem, opts, prob = split_options(text)
        if len(opts) < 4 or prob:
            rejected.append((k, f'still does not split ({len(opts)} options, {prob})'))
        elif not labels_only(v['raw'], text):
            rejected.append((k, 'changed more than labels'))
        else:
            accepted[k] = text

    today = datetime.date.today().isoformat()
    per = {}
    for k, text in accepted.items():
        slug, unit, q = k.split('|')
        per.setdefault(slug, {})[f'{unit}/{q}'] = text
    for slug, fixes in per.items():
        path = os.path.join(HERE, 'corrections', f'{slug}.json')
        cur = json.load(open(path, encoding='utf8')) if os.path.exists(path) else {}
        for key, text in fixes.items():
            e = cur.get(key, {'kind': 'text', 'answer_raw': None})
            if e.get('kind') == 'key':
                e['kind'] = 'text'          # the person's letter stays, as e['key']
            e.update(text=text, repaired={'by': f'model ({MODEL})', 'rule': 'option labels only, words checked unchanged',
                                          'on': today})
            cur[key] = e
        if not a.dry_run:
            json.dump(dict(sorted(cur.items())), open(path, 'w', encoding='utf8'), indent=1, ensure_ascii=False)
    print(f'accepted {len(accepted)}, rejected {len(rejected)}, cost ${cost:.2f}')
    for k, why in rejected:
        print(f'  kept separated {k}: {why}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
