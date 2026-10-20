"""
What a bank record must be, and the checks each question is held to.

A check is a function taking a question record (and its paper) and returning
None or a short reason. Register it with @check, saying which questions it
applies to, whether failing it breaks the contract or is a quality flag, and
where its fix belongs. evals.py runs every registered check on every build.
"""

import json, os, re

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLAIN_MAX_WORDS = json.load(open(os.path.join(HERE, 'pipeline.json'), encoding='utf8'))['plain_max_words']

KEY = re.compile(r'^(wassce|utme)-[a-z]+(?:-[a-z]+)*-(20\d\d)-p(\d)-q(\d{2,3})$')

# Where a failing check's fix goes. Named so a finding says who acts.
EXTRACTOR = 'extractor (extract.py, notation.py) or the source file'
TEACHING = 'teaching standard (standards/teaching.md) and the teach, review and fix stages'
CORRECTION = 'a correction read off the printed paper (corrections/<slug>.json)'
TAXONOMY = 'the subject tree (taxonomies/<subject>.json) or the classify stage'

# Subjects whose answers are worked out, so a solution must show the working.
WORKED = {'mathematics', 'physics', 'chemistry', 'economics'}

CHECKS = []


def check(cid, applies, severity, fix):
    """applies: 'all' or 'passed'. severity: 'contract' (a passed question that
    fails it should not have passed) or 'quality' (worth fixing, not wrong)."""
    def wrap(fn):
        CHECKS.append({'id': cid, 'applies': applies, 'severity': severity, 'fix': fix,
                       'what': (fn.__doc__ or '').strip(), 'fn': fn})
        return fn
    return wrap


def question_key(paper_key, q):
    return f'{paper_key}-q{q:02d}'


def paper_key(exam, subject, year, paper):
    return f'{exam.lower()}-{subject}-{year}-p{paper}'


def options(q):
    return {k: q[f'option_{k.lower()}'] for k in 'ABCDE' if q.get(f'option_{k.lower()}')}


def sentences(text):
    return [s for s in re.split(r'(?<=[.?!])\s+(?=[A-Z(])', text or '') if s.strip()]


def solution_parts(text):
    """The solution in its parts, in order. The teaching standard writes every
    solution the same way (standards/teaching.md): an Answer line, the
    principle, "How to tell:" with the working one step to a line, "Why not the
    others:" one line per option, and an Exam tip. A paragraph outside that
    shape is kept as principle rather than lost."""
    parts, section = [], 'principle'
    heads = [('answer', r'answer\s*:'), ('step', r'how to tell\s*:'),
             ('why_not', r'why not the others\s*:'), ('tip', r'exam tip\s*:')]
    for block in re.split(r'\n\s*\n', (text or '').strip()):
        lines = [l.strip() for l in block.split('\n') if l.strip()]
        if not lines:
            continue
        hit = next(((k, rx) for k, rx in heads if re.match(rx, lines[0], re.I)), None)
        if hit:
            k, rx = hit
            rest = re.sub(r'^' + rx + r'\s*', '', lines[0], flags=re.I)
            lines = ([rest] if rest else []) + lines[1:]
            if k == 'answer':
                parts.append({'part': 'answer', 'option': None, 'text': lines[0] if lines else ''})
                lines, section = lines[1:], 'principle'
            else:
                section = k
        elif section in ('step', 'why_not'):
            section = 'principle'        # a plain paragraph after a list closes it
        for l in lines:
            m = re.match(r'^([A-E])[\.\)]\s+(.*)$', l) if section == 'why_not' else None
            parts.append({'part': section, 'option': m.group(1) if m else None, 'text': m.group(2) if m else l})
    return parts


def long_sentences(hints, solution, limit=PLAIN_MAX_WORDS):
    """Sentences past the plain-language limit, in the hints and every line of
    the solution but the answer line. A line of working ("Cost price = 500 /
    1.08") is arithmetic, not a sentence, and is not counted; the "How to tell"
    of a biology question is prose, and is. The plain stage (run.py) and the
    bank's check share this one definition."""
    out = [s for h in hints for s in sentences(h) if len(s.split()) > limit]
    out += [s for x in solution_parts(solution) if x['part'] != 'answer'
            and not (x['part'] == 'step' and re.search(r'[=≈→]', x['text']))
            for s in sentences(x['text']) if len(s.split()) > limit]
    return out


# ------------------------------------------------------------------ every question

@check('key-format', 'all', 'contract', EXTRACTOR)
def _key(q, p):
    """The key reads exam-subject-year-paper-question."""
    return None if KEY.match(q['question_key']) else f"malformed key {q['question_key']}"


@check('has-options', 'all', 'contract', EXTRACTOR)
def _opts(q, p):
    """Four or five options, or options marked as drawings."""
    n = len(options(q))
    return None if n >= 4 or q['options_are_images'] else f'{n} options'


@check('refers-to-missing', 'all', 'quality', EXTRACTOR)
def _refers(q, p):
    """A question that points at a passage, table or figure has one attached."""
    if q['passage_key'] or q['diagram_files'] not in (None, '[]'):
        return None
    m = re.search(r'\b(the (?:passage|extract|poem|table|graph|figure|diagram|information) (?:above|below)'
                  r'|(?:above|below) (?:passage|extract|poem|table|graph|figure|diagram))\b', q['stem'], re.I)
    return f'mentions "{m.group(0)}" but nothing is attached' if m else None


# ------------------------------------------------------------------ passed questions

@check('passed-complete', 'passed', 'contract', TEACHING)
def _complete(q, p):
    """An answer among its options, three hints, a solution, a difficulty."""
    miss = [f for f in ('answer', 'hint1', 'hint2', 'hint3', 'solution', 'difficulty') if not q.get(f)]
    if miss:
        return 'missing ' + ', '.join(miss)
    if q['answer'] not in options(q) and not q['options_are_images']:
        return f"answer {q['answer']} is not one of its options"
    return None


@check('on-the-tree', 'passed', 'contract', TAXONOMY)
def _tree(q, p):
    """Placed on a subtopic of its subject's tree."""
    return None if q.get('subtopic_key') else 'no subtopic on the tree'


@check('solution-shape', 'passed', 'contract', TEACHING)
def _shape(q, p):
    """The solution has its answer line, the principle, and a reason for each other option."""
    parts = q['parts']
    kinds = [x['part'] for x in parts]
    if 'answer' not in kinds:
        return 'no "Answer:" line'
    if 'principle' not in kinds:
        return 'no principle'
    if q['options_are_images']:
        return None
    others = set(options(q)) - {q['answer']}
    covered = {x['option'] for x in parts if x['part'] == 'why_not' and x['option']}
    if others - covered:
        return 'no reason given against ' + ', '.join(sorted(others - covered))
    return None


@check('answer-line-agrees', 'passed', 'contract', TEACHING)
def _agrees(q, p):
    """The solution's answer line names the settled answer."""
    a = next((x['text'] for x in q['parts'] if x['part'] == 'answer'), '')
    return None if re.match(rf'^\(?{q["answer"]}\b', a) else f'answer line "{a[:40]}" against key {q["answer"]}'


@check('working-in-steps', 'passed', 'quality', TEACHING)
def _steps(q, p):
    """A worked answer shows its working, one step to a line, at least two steps."""
    if p['subject'] not in WORKED or not re.search(r'\d', q['stem']):
        return None
    n = sum(1 for x in q['parts'] if x['part'] == 'step')
    return None if n >= 2 else f'{n} working step(s)'


@check('plain-sentences', 'passed', 'quality', TEACHING)
def _plain(q, p):
    """No sentence in the hints or the solution's prose runs past the plain-language limit."""
    long = long_sentences([q.get(h) or '' for h in ('hint1', 'hint2', 'hint3')], q.get('solution'))
    return f'{len(long)} sentence(s) over {PLAIN_MAX_WORDS} words, e.g. "{long[0][:60]}..."' if long else None


@check('hint-gives-answer', 'passed', 'quality', TEACHING)
def _leak(q, p):
    """The first two hints do not name the correct option outright."""
    right = (options(q).get(q['answer']) or '').strip().rstrip('.')
    if len(right) < 5 or right.lower() in {'none of the above', 'all of the above'}:
        return None
    for h in ('hint1', 'hint2'):
        if re.search(rf'(?<!\w){re.escape(right.lower())}(?!\w)', (q.get(h) or '').lower()):
            return f'{h} contains the answer "{right[:40]}"'
    return None


@check('hints-climb', 'passed', 'quality', TEACHING)
def _climb(q, p):
    """The three hints are three different steps."""
    hs = [(q.get(h) or '').strip().lower() for h in ('hint1', 'hint2', 'hint3')]
    return 'two hints are the same' if len(set(hs)) < 3 else None
