"""
W1 Extractor: raw exam .docx to structured items.

Deterministic. No AI, no inference about meaning. It reads what is on the page
and reports what it could not read, so the gap is visible rather than guessed at.

Usage:
    python extract.py --config configs/biology-waec.json

Emits:
    out/<slug>.items.jsonl    one JSON object per question
    out/<slug>.report.json    counts, gaps and anything that needs a human

Design notes that matter for every subject, not just this one:

* Options are inline. Every source seen so far writes the whole question on one
  line: "1. Stem text A. opt B. opt C. opt D. opt". There are no standalone
  option rows, so options are split out of the stem, not read from siblings.
* Shared stems come BEFORE the questions they serve and name their own range
  ("Study it and answer questions 4 and 5"). That range is the grouping key.
* Diagram files carry the question number ("2022_Q14-15.png"), so image binding
  is mechanical. A range in the filename means one image serves several items.
* Nothing here decides an answer. That is W2's job, downstream and separate.
"""

import argparse, json, os, re, sys, zipfile
from collections import defaultdict

import notation

IMG_EXT = ('.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg')

# UTME and WASSCE are how the papers are branded. The database enum is narrower.
EXAM_TYPE_MAP = {'WASSCE': 'WAEC', 'WAEC': 'WAEC', 'UTME': 'JAMB', 'JAMB': 'JAMB'}


# Underlining is content, not decoration. English papers say "there is one
# underlined word and one gap", and the question cannot be answered without
# knowing which word it is. Underlined text is wrapped in these markers, which
# never occur in the source, so every downstream stage can see it and the
# exporter decides how the app draws it.
U_OPEN, U_CLOSE = '⟦', '⟧'   # ⟦ ⟧  underlined
# Italics are content in English ("the word or phrase in italics") but mark
# species names in Biology, where wrapping them would alter reviewed text. So
# they are kept per subject, by the config flag "keep_italic".
I_OPEN, I_CLOSE = '⟪', '⟫'   # ⟪ ⟫  italic


def _italic(run):
    m = re.search(r'<w:i(?:\s+w:val="([^"]+)")?\s*/>', run)
    return bool(m) and (m.group(1) or 'true').lower() not in ('0', 'false', 'off')


def _run_text(run):
    run = re.sub(r'<w:(br|tab)\s*/>', ' ', run)
    return ''.join(re.findall(r'<w:t(?:\s[^>]*)?>(.*?)</w:t>', run, re.S))


def _underlined(run):
    m = re.search(r'<w:u\s+w:val="([^"]+)"', run)
    return bool(m) and m.group(1) != 'none'


def paragraphs(docx_path, keep_italic=False):
    """Every non-empty paragraph, in document order, as plain text, with
    underlined words wrapped in U_OPEN / U_CLOSE and, when keep_italic is set,
    italic words in I_OPEN / I_CLOSE."""
    with zipfile.ZipFile(docx_path) as z:
        xml = z.read('word/document.xml').decode('utf8', 'ignore')
    root = re.search(r'<w:document\b([^>]*)>', xml)
    ns = ' '.join(re.findall(r'xmlns:\w+="[^"]*"', root.group(1))) if root else ''
    out = []
    for block in re.findall(r'<w:p[ >].*?</w:p>', xml, re.S):
        parts = []
        # Runs and Word equations, in document order. Equations were once
        # skipped entirely, which dropped every fraction and root they held.
        for tok in re.findall(r'<m:oMathPara\b.*?</m:oMathPara>|<m:oMath\b.*?</m:oMath>|<w:r[ >].*?</w:r>', block, re.S):
            if tok.startswith('<m:'):
                parts.append(notation.math_text(tok, ns))
                continue
            run = tok
            t = _run_text(run)
            if not t:
                continue
            va = re.search(r'<w:vertAlign w:val="(superscript|subscript)"', run)
            if va:
                t = notation.script_run(t, va.group(1), ''.join(parts))
            if _underlined(run) and t.strip():
                parts.append(f'{U_OPEN}{t}{U_CLOSE}')
            elif keep_italic and _italic(run) and t.strip():
                parts.append(f'{I_OPEN}{t}{I_CLOSE}')
            else:
                parts.append(t)
        text = ''.join(parts) if parts else re.sub(r'<[^>]+>', '', block)
        text = notation.normalise(html_unescape(text).replace('\xa0', ' '))
        # Adjacent marked runs are one phrase ("august occasion").
        text = re.sub(re.escape(U_CLOSE) + r'(\s*)' + re.escape(U_OPEN), r'\1', text)
        text = re.sub(re.escape(I_CLOSE) + r'(\s*)' + re.escape(I_OPEN), r'\1', text)
        text = re.sub(r'\s+', ' ', text).strip()
        if text:
            out.append(text)
    return out


def html_unescape(s):
    return (s.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
             .replace('&quot;', '"').replace('&apos;', "'"))


def year_header(text, subject_words):
    """A year block opens with a line like '2019 WASSCE BIOLOGY QUESTIONS'.
    The WAEC Mathematics file names the exam once, then heads each later year
    '2024 OBJECTIVE QUESTIONS'; those return no exam name, and the caller keeps
    the one it already has. Missing that form once folded ten years of the file
    into its first."""
    m = re.match(r'^(20(?:1[0-9]|2[0-9]))\s+(WASSCE|WAEC|UTME|JAMB|OBJECTIVE)\b', text, re.I)
    if not m:
        return None
    # Guard against a question that merely starts with a year.
    if re.match(r'^\d+\.', text):
        return None
    # One name per exam, whichever the typist used.
    brand = m.group(2).upper()
    brand = {'WAEC': 'WASSCE', 'JAMB': 'UTME', 'OBJECTIVE': None}.get(brand, brand)
    return int(m.group(1)), brand


def stem_range(text):
    """
    Question numbers a shared stem claims. Handles the phrasings actually seen:
      'answer question 2 and 3'      'answer questions 4 and 5'
      'answer questions 45 to 47'    'use it to answer questions 19 and 20'
      'answer questions 32, 33 and 34'
    Returns a sorted list, or None when the line is not a stem.
    """
    m = re.search(r'answer\s+(?:the\s+)?questions?\s+([0-9,\s]+(?:(?:and|to|-|–)\s*[0-9,\s]+)*)',
                  text, re.I)
    if not m:
        # Section instructions state the same range another way: "In each of
        # questions 13-18, choose ...", "In questions 28 to 30, ...". A digit
        # range is required, so a stem such as "which of the following
        # questions" never matches.
        m = re.search(r'\bin\s+(?:each\s+of\s+)?(?:the\s+)?questions?\s+'
                      r'(\d+\s*(?:-|–|to|and)\s*\d+(?:\s*(?:,|and)\s*\d+)*)', text, re.I)
    if not m:
        # The literature texts in the UTME English papers: "Questions 11 to 15
        # are based on Jerry Agada's The Successors."
        m = re.search(r'^questions?\s+(\d+\s*(?:-|–|to|and)\s*\d+(?:\s*(?:,|and)\s*\d+)*)'
                      r'\s+(?:are|is)\s+(?:based|drawn|taken)\s+(?:on|from)\b', text, re.I)
    if not m:
        return None
    tail = m.group(1)

    # OCR reads "to" as "10": "answer questions 22 10 24" means 22 to 24.
    # Taken literally it binds Q10, Q22 and Q24, which puts a stimulus on a
    # question it has nothing to do with and strips it from Q23.
    ocr = re.match(r'\s*(\d+)\s+10\s+(\d+)\s*$', tail)
    if ocr and int(ocr.group(1)) < int(ocr.group(2)) and int(ocr.group(2)) - int(ocr.group(1)) < 10:
        return list(range(int(ocr.group(1)), int(ocr.group(2)) + 1))
    rng = re.match(r'\s*(\d+)\s*(?:to|-|–)\s*(\d+)', tail)
    if rng:
        a, b = int(rng.group(1)), int(rng.group(2))
        if a <= b and b - a < 25:
            return list(range(a, b + 1))
    nums = [int(n) for n in re.findall(r'\d+', tail)]
    nums = [n for n in nums if 1 <= n <= 100]
    return sorted(set(nums)) or None


# What separates an instruction from a stimulus is not how it opens, which
# varies endlessly in hand-typed papers ("In each of the following", "For
# these questions", "Choose the appropriate option", "In this question"). It is
# that an instruction tells the student to act, and a stimulus describes
# something ("four cells were immersed", "a student used the following steps").
# Enumerating openings was tried first and never converged.
TASK_VERB = re.compile(r'\b(choose|select|identify|pick\s+out|fill\s+in|complete|indicate|underline)\b', re.I)
SECTION_CUE = re.compile(r'^\s*(instructions?\s*:|(?:the\s+following|these)\s+questions\s+(?:are|were)\s+based|'
                         r'read\s+the\s+following)', re.I)


def is_instruction(text):
    """
    A section instruction tells the student what to do with every question
    that follows. Unlike a stimulus it carries no labels for later questions
    to refer back to, so it binds to all of them until the next instruction,
    stem or year.
    """
    return bool(TASK_VERB.search(text) or SECTION_CUE.match(text) or ORAL_CUE.search(text))


# The Test of Orals states its task by the sound sought, and a typing slip can
# take the verb with it ("From the word the word that has the same consonant
# sound as the one represented by the letter(s) underlined").
ORAL_CUE = re.compile(r'\bsame\s+(?:vowel|consonant)\s+sound|\brhymes?\s+with\b', re.I)


def anchors(text):
    """
    Labels a stimulus hands to the questions after it: roman numerals I to VI
    ("solution III") and single-letter labels P to Z ("patients X and Y").
    A to E are left out because they collide with option letters.
    """
    found = set(re.findall(r'\b(VI|IV|V|III|II|I)\b', text))
    found |= set(re.findall(r'\b([P-Z])\b', text))
    return found


# Both option styles seen in the sources. Which one a paper uses varies by year,
# not by subject, so every extractor run must handle both.
#   bare   "A. opt B. opt"     2016, 2020-2025 in Biology
#   paren  "(a) opt (b) opt"   2015, 2017-2019 in Biology
OPT_STYLES = {
    'bare': re.compile(r'(?:(?<=\s)|^)([A-Ea-e])[\.\)]\s+'),
    'paren': re.compile(r'\(\s*([A-Ea-e])\s*\)\s*'),
}
# Tried only when the strict styles come up short, and only accepted when it
# recovers a full four. The sources carry OCR damage such as "C.I. II and IV",
# where the space after the marker was eaten.
OPT_STYLE_LOOSE = re.compile(r'(?:(?<=\s)|^)([A-Ea-e])[\.\)]\s*')


def _run_from(marks):
    """Longest ascending run of option letters starting at A, no gaps. A run in
    one letter case wins a tie with a mixed one: a maths variable is not a
    label, and "the points M(−1, a) and N(2, −2) ... A. −2 B. −1" once opened
    option A at "a)". Mixed runs still count, because typists do mix
    ("A. biennials b. perennials C. annuals")."""
    best = []
    for same_case in (str.isupper, str.islower, lambda c: True):
        run, expect = [], 'A'
        for n, (start, end, letter) in enumerate(marks):
            if not same_case(letter):
                continue
            # "A. blood group A. B. blood group B.": an A touching the B after it
            # ends option A's own text; it is not a second start.
            ends_a = n + 1 < len(marks) and marks[n + 1][2].upper() == 'B' and marks[n + 1][0] == end
            if letter.upper() == expect:
                run.append((start, end, expect))
                expect = chr(ord(expect) + 1)
            elif len(run) == 1 and letter.upper() == 'A' and start != run[0][1] and not ends_a:
                # A second A before any B: the first was in the stem ("from
                # point A. Calculate", "an A.P.", "A. H. Mohammed's"). The
                # options start at the later one. A twin straight after it is
                # settled in split_options.
                run = [(start, end, 'A')]
        if len(run) > len(best):
            best = run
    return best


def split_options(body):
    """
    Pull inline options out of a question body.
    Returns (stem, {letter: text}, problem_or_None).

    Conservative on purpose. It accepts only a run of markers that starts at A
    and steps forward without gaps, and it prefers whichever style yields more
    options. Anything short of two options is handed back as a problem rather
    than guessed at, because a mis-split option is a wrong question that still
    looks right to every check downstream.
    """
    best, best_style = [], None
    for style, rx in OPT_STYLES.items():
        run = _run_from([(m.start(), m.end(), m.group(1)) for m in rx.finditer(body)])
        if len(run) > len(best):
            best, best_style = run, style

    if len(best) < 4:
        loose = _run_from([(m.start(), m.end(), m.group(1))
                           for m in OPT_STYLE_LOOSE.finditer(body)])
        if len(loose) == 4:
            best, best_style = loose, 'loose'

    if not best:
        return body.strip(), {}, 'no-options-found'
    if len(best) < 2:
        return body.strip(), {}, 'only-one-option'

    # A label straight after a twin of itself: "that of B. B. the pressure"
    # (a point named B ends option A, the label is the second) against
    # "propounded by A. A. V. Dicey" (the label, then a name's initial). A
    # name follows the second when it is the initial.
    rx = OPT_STYLES.get(best_style, OPT_STYLE_LOOSE)
    marks = list(rx.finditer(body))
    for n, (start, end, letter) in enumerate(best):
        twin = next((m for m in marks if m.start() == end and m.group(1).upper() == letter), None)
        nxt_start = best[n + 1][0] if n + 1 < len(best) else len(body)
        if twin and twin.end() < nxt_start and not re.match(r'[A-Z][a-z]|[A-Z]\.', body[twin.end():]):
            best[n] = (twin.start(), twin.end(), letter)

    stem = body[:best[0][0]].strip()
    opts = {}
    for i, (start, end, letter) in enumerate(best):
        stop = best[i + 1][0] if i + 1 < len(best) else len(body)
        opts[letter] = body[end:stop].strip().rstrip('.').strip()

    problem = None
    # A label typed twice ("B. release of carbon (IV) oxide. B. release of
    # oxygen") leaves which text belongs to which letter a guess. Counted in
    # the run's own letter case, so "√(b/a)" and "(a, b)" in an upper-case
    # paper are not labels; and a mark touching another ("B. A. Lavoisier",
    # "Vitamin B. C. Vitamin E", "9600 C. B. 48250") is an initial or a unit.
    spans = {(s0, e0) for s0, e0, _ in best}
    cases = {m.group(1).isupper() for m in marks if (m.start(), m.end()) in spans}
    touching = {n for n in range(len(marks)) for k in (n - 1, n + 1)
                if 0 <= k < len(marks) and (marks[k].end() == marks[n].start() or marks[n].end() == marks[k].start())}
    repeated = [m for n, m in enumerate(marks)
                if m.start() > best[0][0] and (m.start(), m.end()) not in spans and n not in touching
                and m.group(1).upper() in {l for _, _, l in best}
                and (len(cases) > 1 or m.group(1).isupper() in cases)]
    if not stem:
        problem = 'empty-stem'
    elif any(not v for v in opts.values()):
        problem = 'empty-option'
    elif repeated:
        problem = 'repeated-option-label'
    return stem, opts, problem


def index_diagrams(root):
    """
    Map (year, question_number) -> image path, from filenames like
    '2019_Q24.png' and '2022_Q14-15.png'. A range binds every number it spans.
    """
    idx, unparsed = defaultdict(list), []
    if not root or not os.path.isdir(root):
        return idx, unparsed
    for dirpath, _, files in os.walk(root):
        for fn in files:
            if not fn.lower().endswith(IMG_EXT):
                continue
            full = os.path.join(dirpath, fn)
            # Searched, not anchored: some folders prefix the subject
            # ("UTME-BIO-2015_Q34.png"). "2017_opt12.png" is the drawn options
            # of question 12, kept apart from the question's own diagram.
            m = re.search(r'(20\d{2})[_\-\s]*(Q|opt)\s*(\d+)(?:\s*[-–]\s*(\d+))?', fn, re.I)
            if not m:
                unparsed.append(os.path.relpath(full, root))
                continue
            year = int(m.group(1))
            a = int(m.group(3))
            b = int(m.group(4)) if m.group(4) else a
            if b < a:
                # "2021_Q28-20" is a typo, and swapping it would bind nine
                # questions to one drawing. Report it; the folder gets renamed.
                unparsed.append(os.path.relpath(full, root) + ' (range runs backwards)')
                continue
            kind = 'opt' if m.group(2).lower() == 'opt' else 'q'
            for q in range(a, b + 1):
                idx[(year, q) if kind == 'q' else ('opt', year, q)].append(full)
    return idx, unparsed


def load_corrections(slug):
    """What a person read off the printed paper, from ingest_review_doc.py."""
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'corrections', f'{slug}.json')
    return json.load(open(path, encoding='utf8')) if os.path.exists(path) else {}


def apply_correction(it, c, diagrams, root):
    """Apply one correction to an extracted item. Returns a problem or None."""
    it['correction'] = {k: c[k] for k in ('kind', 'source', 'received', 'repaired') if k in c}
    # An entry can carry a person's key and a label repair together.
    if c.get('key'):
        it['official_key'] = c['key']
    if c['kind'] == 'hold':
        # The typed text cannot be trusted as it stands (two questions run
        # together, say). It stays separated with the reason a person gave.
        it['held_by_correction'] = c.get('reason', 'held by a person')
    if c['kind'] == 'options-as-images':
        it['options_are_images'] = True
        it['option_image_files'] = [os.path.relpath(p, root or '.')
                                    for p in diagrams.get(('opt', it['year'], it['q_number']), [])]
    elif c.get('text'):
        body = c['text'].replace(' / ', ' ').strip().rstrip('/').strip()
        # The text as returned may carry the shared stem in front of the
        # number. The stem is already bound; keep only the question.
        m = re.search(rf'(?:^|\s){it["q_number"]}[\.\)]\s+', body)
        if m:
            body = body[m.end():]
        stem, opts, problem = split_options(body)
        if len(opts) < 2 or (problem and not (problem == 'empty-stem' and it.get('passage_text'))):
            it['correction']['unparsed'] = True
            return 'correction-unparsed'
        it.update(stem=stem, options=opts, option_count=len(opts), raw=body, extract_problem=None)
    return None


# A question opens with its number. Typists sometimes leave no space after it
# ("4.Express in index form"), and requiring one dropped six maths questions.
# Without the space the next character must start a word, so a line that opens
# with a decimal such as "2.5 kg" is never read as question 2.
QNUM = re.compile(r'^(\d{1,3})[\.\)](?:\s+|(?=[A-Za-z(√∆∠|‘“"]))(.*)$')


def psfx(paper):
    return '' if paper == 1 else f'-p{paper}'


def extract(cfg):
    src = cfg['source']
    subject = cfg['subject']
    paras = paragraphs(src, keep_italic=bool(cfg.get('keep_italic')))

    diagrams, unparsed_diagrams = index_diagrams(cfg.get('diagram_root'))

    items, problems = [], []
    year = exam_brand = None
    pending_stems = []          # stems seen since the last question
    stem_seq = 0
    stem_for_q = {}             # (year, paper, qnum) -> stem record
    seen = set()
    inferred = None             # an unlabelled stimulus waiting to bind forward
    # A year header can appear twice in one file. It is never a duplicate to
    # drop: in the UTME set the repeat always carried different questions,
    # either a second sitting or a different year mislabelled. Each occurrence
    # opens its own paper, keyed (year, paper), and the repeat is reported.
    paper_count, headers = {}, []
    paper = 1
    oral_papers, paper_name = set(), None

    def is_new_block(t):
        """True when a paragraph starts something rather than continuing it."""
        return (year_header(t, subject) is not None
                or QNUM.match(t) is not None
                or stem_range(t) is not None
                or (len(t) < 60 and re.match(r'(TEST\s+OF\s+ORALS?\b|SECTION\s+\w+$|OBJECTIVE\b)', t, re.I)
                    is not None))

    i = -1
    while i + 1 < len(paras):
        i += 1
        text = paras[i]
        yh = year_header(text, subject)
        if yh:
            year, brand = yh
            exam_brand = brand or exam_brand
            paper_count[year] = paper_count.get(year, 0) + 1
            paper = paper_count[year]
            headers.append({'para': i, 'year': year, 'paper': paper, 'text': text[:60]})
            pending_stems = []
            inferred = None
            paper_name = None
            continue
        # WAEC English prints its Test of Orals after the objective paper under
        # the same year, numbered from 1 again. It is WAEC's own Paper 3, so it
        # opens paper 3 of that year (4 for a year whose header repeats).
        # Without this every oral question was dropped as a duplicate number.
        if year is not None and len(text) < 60 and re.search(r'\bTEST\s+OF\s+ORALS?\b', text, re.I):
            paper = 2 + paper_count[year]
            if (year, paper) in oral_papers:
                raise SystemExit(f'{year}: a second Test of Orals under one header (para {i})')
            oral_papers.add((year, paper))
            paper_name = 'Test of Orals'
            headers.append({'para': i, 'year': year, 'paper': paper, 'text': text[:60], 'oral': True})
            pending_stems = []
            inferred = None
            continue
        if re.fullmatch(r'(OBJECTIVE\s+QUESTIONS?|SECTION\s+[AB]\b.*)', text, re.I):
            continue
        if year is None:
            continue

        qm = QNUM.match(text)
        if qm and (year, paper, int(qm.group(1))) in seen:
            # A number this paper has already used is not a question. Poems
            # print line numbers ("5. Or I'd fall supine"), and reading one as
            # question 5 swallowed the poem's next lines. It reads as text.
            problems.append({'kind': 'duplicate-question-number', 'year': year,
                             'paper': paper, 'q': int(qm.group(1)), 'para': i, 'text': text[:120]})
            # One that carries its own options is a mistyped question, kept out
            # as before rather than read as a passage.
            if len({m.group(1).upper() for m in OPT_STYLE_LOOSE.finditer(qm.group(2))}) >= 3:
                continue
            # "13. Use the passage below to answer questions 19 to 21": the stray
            # number is no part of the passage.
            if stem_range(qm.group(2)):
                text = qm.group(2)
            qm = None
        if qm:
            qnum = int(qm.group(1))
            body = qm.group(2)

            # A question whose options sit on the paragraphs after it. Look up
            # to six lines ahead, through lines that start nothing of their own,
            # and take them up to the line that completes the options: a logic
            # question puts p, q and then the options on lines of their own, a
            # poem extract runs four lines before its options. Where no options
            # turn up, at most three lines are taken.
            def n_opts(s):
                return len(_run_from([(m.start(), m.end(), m.group(1))
                                      for rx in OPT_STYLES.values() for m in rx.finditer(s)]))
            if n_opts(body) < 2:
                j, look, took = i, body, None
                while j + 1 < len(paras) and j - i < 6 and not is_new_block(paras[j + 1]):
                    j += 1
                    look = (look.rstrip() + ' ' + paras[j]).strip()
                    if n_opts(look) >= 2:
                        took = j
                        # Options split over lines ("A. x B. y" then "C. z D. w"):
                        # take the lines that carry on the run.
                        while (took + 1 < len(paras) and not is_new_block(paras[took + 1])
                               and re.match(rf'^\(?{chr(65 + n_opts(look))}[\.\)]', paras[took + 1], re.I)):
                            took += 1
                            look = (look.rstrip() + ' ' + paras[took]).strip()
                        break
                if took is None:
                    took = min(j, i + 3)
                body = ' '.join([body.rstrip()] + paras[i + 1:took + 1]).strip()
                i = took
            # Options carried on to the next line ("1. Choose A. 1 B. 2" then
            # "C. 3 D. 4"), whether or not the question line held some itself.
            while (i + 1 < len(paras) and not is_new_block(paras[i + 1]) and 2 <= n_opts(body) < 5
                   and re.match(rf'^\(?{chr(65 + n_opts(body))}[\.\)]', paras[i + 1], re.I)):
                i += 1
                body = (body.rstrip() + ' ' + paras[i]).strip()

            # The next question typed onto this one's last option ("D. Paniel.20.
            # Joseph's intelligence was revealed when he A. ..."). Split it back
            # off, so neither question loses its options and the next one is
            # not dropped. Only after this question's own D, and only where the
            # number is the next one.
            dpos = [m.end() for m in OPT_STYLE_LOOSE.finditer(body) if m.group(1).upper() == 'D']
            if dpos:
                g = re.compile(rf'(?<!\d){qnum + 1}\s?\.\s*(?=[A-Z‘“"])').search(body, dpos[0])
                if g and len(body[g.end():].split()) >= 3:
                    rest = body[g.start():].strip()
                    # Cut it off either way; give it its own paragraph only when
                    # it has words of its own and is not typed again just below.
                    again = any((qm2 := QNUM.match(paras[k])) and int(qm2.group(1)) == qnum + 1
                                for k in range(i + 1, min(i + 4, len(paras))))
                    # And only when this question kept options of its own: "A. B. C.
                    # D.30. Which ... A. powdered carbon" is question 29's options
                    # typed under 30, and splitting would give them to 30.
                    head = split_options(body[:g.start()])[1]
                    if (not again and sum(1 for v in head.values() if v) >= 2
                            and len(re.sub(r'[A-E][\.\)]|[\s\d.]', '', rest)) > 3):
                        paras.insert(i + 1, rest)
                    body = body[:g.start()].strip()
                    problems.append({'kind': 'next-question-split-off', 'year': year, 'q': qnum, 'para': i})

            key = (year, paper, qnum)
            seen.add(key)

            stem, opts, problem = split_options(body)
            st = stem_for_q.get(key)

            # An unlabelled stimulus binds to the question right after it, and
            # onward only while the following questions keep referring to its
            # labels. An explicit "answer questions N and M" stem always wins.
            if st is None and inferred is not None:
                first = not inferred['questions']
                shares = bool(anchors(body) & inferred['anchors'])
                if first or shares or inferred.get('instruction'):
                    inferred['questions'].append(qnum)
                    stem_for_q[key] = inferred
                    st = inferred
                else:
                    inferred = None
            elif st is not None:
                inferred = None

            # Diagrams are named by year and question only, so for a second
            # paper in the same year the file cannot say which paper it belongs
            # to. Bind it for the first paper; for any later paper report the
            # ambiguity instead of attaching the wrong drawing.
            dfiles = diagrams.get((year, qnum), [])
            if paper > 1 and dfiles:
                problems.append({'kind': 'diagram-paper-ambiguous', 'year': year,
                                 'paper': paper, 'q': qnum, 'para': i,
                                 'text': ', '.join(os.path.basename(p) for p in dfiles)})
                dfiles = []

            items.append({
                'subject': subject,
                'exam_brand': exam_brand,
                'exam_type': EXAM_TYPE_MAP.get(exam_brand, exam_brand),
                'year': year,
                'paper': paper,
                'paper_name': paper_name,
                'q_number': qnum,
                'stem': stem,
                'options': opts,
                'option_count': len(opts),
                'passage_id': st['passage_id'] if st else None,
                'passage_text': st['text'] if st else None,
                'stem_inferred': bool(st and st.get('inferred')),
                'diagram_files': [os.path.relpath(p, cfg.get('diagram_root', '.'))
                                  for p in dfiles],
                'source_paragraph': i,
                'raw': text,
                'extract_problem': problem,
            })
            if problem:
                problems.append({'kind': problem, 'year': year, 'q': qnum,
                                 'para': i, 'text': text[:160]})
            pending_stems = []
            continue

        rng = stem_range(text)
        if rng:
            stem_seq += 1
            pid = f"{subject.lower().replace(' ', '-')}-{exam_brand.lower()}-{year}{psfx(paper)}-s{stem_seq:02d}"
            full = text
            # A description on the line before an explicit range line is the
            # same stem, split in two: "The diagram below are illustrations of
            # types of comb" then "Study them and answer questions 40 and 41".
            # Without this merge the explicit line claims the questions and the
            # description, the part that says what the diagram is, is lost.
            if inferred is not None and not inferred['questions'] and i - inferred.get('last', inferred['para']) == 1:
                full = inferred['text'] + ' ' + text
                for p in problems:
                    if p.get('passage_id') == inferred['passage_id']:
                        p['kind'] = 'stimulus-merged-into-stem'
                inferred = None
            rec = {'passage_id': pid, 'text': full, 'questions': rng, 'para': i}
            for q in rng:
                stem_for_q[(year, paper, q)] = rec
            pending_stems.append(rec)
            continue

        # Anything else inside a year block: list items, table rows, captions,
        # or a continuation of the stem above. Attach to the open stem when
        # there is one, otherwise record it so nothing is silently dropped.
        if pending_stems:
            pending_stems[-1]['text'] += ' ' + text
            for q in pending_stems[-1]['questions']:
                stem_for_q[(year, paper, q)] = pending_stems[-1]
        elif len(_run_from([(m.start(), m.end(), m.group(1))
                            for rx in OPT_STYLES.values()
                            for m in rx.finditer(text)])) >= 3:
            # Carries a full option run: a question that lost its number, not a
            # stimulus. Leave it for the audit pass to report.
            problems.append({'kind': 'orphan-line', 'year': year, 'para': i,
                             'text': text[:160]})
        else:
            # Descriptive text with no question number and no stated range.
            # Real papers do this: "Four cells ... were immersed in solutions
            # I to IV" then questions 7 and 8. Hold it and bind it forward.
            # A passage can run over several paragraphs before its first
            # question (the English cloze passages do). Each paragraph once
            # replaced the one before, so only the last reached the questions.
            # A new instruction starts a new block; only passage paragraphs extend one.
            if (inferred is not None and not inferred['questions'] and not is_instruction(text)
                    and i - inferred.get('last', inferred['para']) == 1):
                # A bare heading ("SECTION 3", "OBJECTIVE TEST QUESTIONS") says
                # nothing a student needs; the paragraph after it replaces it.
                if re.fullmatch(r'SECTION\s+\w+|[A-Z][A-Z0-9\s&,:\-]{2,40}', inferred['text'].strip()):
                    inferred['text'] = text
                else:
                    inferred['text'] += ' ' + text
                inferred['last'] = i
                inferred['anchors'] |= anchors(text)
                inferred['instruction'] = inferred['instruction'] or is_instruction(text)
                continue
            stem_seq += 1
            pid = (f"{subject.lower().replace(' ', '-')}-{exam_brand.lower()}"
                   f"-{year}{psfx(paper)}-s{stem_seq:02d}")
            instr = is_instruction(text)
            inferred = {'passage_id': pid, 'text': text, 'questions': [],
                        'para': i, 'inferred': True, 'anchors': anchors(text),
                        'instruction': instr}
            problems.append({'kind': 'section-instruction' if instr else 'inferred-stimulus',
                             'year': year, 'para': i, 'passage_id': pid, 'text': text[:160]})


    def label(y, p):
        return str(y) if p == 1 else f'{y}#{p}'

    by_year = defaultdict(int)
    for it in items:
        by_year[(it['year'], it['paper'])] += 1

    # A repeated year header is reported with the year it most probably is.
    # Papers run in strictly descending year order in every file seen so far,
    # so a repeat sitting where year Y-1 belongs, in a file that has no Y-1,
    # is most likely Y-1 mislabelled. Where every year is already present it
    # is a second sitting of the same year. This is a proposal for a human,
    # never applied automatically.
    present = {h['year'] for h in headers}
    repeats = []
    year_heads = [h for h in headers if not h.get('oral')]
    for n, h in enumerate(year_heads):
        if h['paper'] == 1:
            continue
        nxt = year_heads[n + 1]['year'] if n + 1 < len(year_heads) else None
        cand = h['year'] - 1
        if cand not in present and (nxt is None or nxt < cand):
            guess, why = cand, f'no {cand} header in the file, and this sits where {cand} belongs in descending order'
        else:
            guess, why = h['year'], 'every neighbouring year is present, so this looks like a second sitting'
        repeats.append({'para': h['para'], 'labelled': h['year'], 'paper': h['paper'],
                        'items': by_year.get((h['year'], h['paper']), 0),
                        'probable_year': guess, 'reason': why})
        problems.append({'kind': 'repeated-year-header', 'year': h['year'], 'paper': h['paper'],
                         'para': h['para'], 'text': f'probably {guess}: {why}'})

    # --- corrections read off the printed paper by a person ---
    # Applied before the audit, so a question whose options came back whole
    # is audited on its corrected text, not on the damaged typing.
    corrections = load_corrections(cfg.get('slug', ''))
    applied = set()
    for it in items:
        k = f"{it['year'] if it['paper'] == 1 else str(it['year']) + '-p' + str(it['paper'])}/{it['q_number']}"
        if k in corrections:
            applied.add(k)
            prob = apply_correction(it, corrections[k], diagrams, cfg.get('diagram_root'))
            if prob:
                problems.append({'kind': prob, 'year': it['year'], 'q': it['q_number'],
                                 'para': it['source_paragraph'], 'text': corrections[k].get('text', '')[:160]})
    # A drawing of the options on disk is evidence enough that the paper
    # prints its options as pictures, whether or not anyone said so.
    for it in items:
        opt = diagrams.get(('opt', it['year'], it['q_number'])) if it['paper'] == 1 else None
        if opt and not it.get('options_are_images'):
            it['options_are_images'] = True
            it['option_image_files'] = [os.path.relpath(p, cfg.get('diagram_root') or '.') for p in opt]
    for k in sorted(set(corrections) - applied):
        problems.append({'kind': 'correction-unplaced', 'text': k})

    # A diagram that binds to no extracted question is a real gap, not noise.
    bound = {(it['year'], it['q_number']) for it in items if it['paper'] == 1}
    bound |= {('opt', it['year'], it['q_number']) for it in items if it.get('option_image_files')}
    orphan_images = sorted({os.path.relpath(p, cfg['diagram_root'])
                            for k, paths in diagrams.items()
                            if k not in bound for p in paths}) if cfg.get('diagram_root') else []

    # --- audit pass: make every gap visible rather than letting it pass ---

    # 1. Missing question numbers. A year that runs 1..50 with 49 items has lost
    #    one, and knowing which one is what makes it recoverable.
    nums_by_year = defaultdict(set)
    for it in items:
        nums_by_year[(it['year'], it['paper'])].add(it['q_number'])
    missing = {}
    for (y, p), nums in nums_by_year.items():
        gaps = sorted(set(range(1, max(nums) + 1)) - nums)
        if gaps:
            missing[label(y, p)] = gaps

    # 2. Option-letter damage. When a run stops early but later letters are
    #    present, the marker in between was almost certainly mis-scanned, which
    #    is the "(e) water" that should read "(c) water".
    for it in items:
        it['needs_human'] = False
        it['anomaly'] = None
        if it.get('held_by_correction'):
            it['needs_human'] = True
            it['anomaly'] = 'source-damaged'
            continue
        if it.get('extract_problem') == 'repeated-option-label':
            it['needs_human'] = True
            it['anomaly'] = 'option-letter-damaged'
            continue
        if it.get('options_are_images'):
            # The paper prints the options as drawings. The import has text
            # options only, so these wait for image options in the app.
            it['needs_human'] = True
            it['anomaly'] = 'options-are-drawings'
            continue
        if it['option_count'] == 4:
            continue
        present = {m.group(1).upper() for rx in OPT_STYLES.values()
                   for m in rx.finditer(it['raw'])}
        beyond = present - set('ABCDE'[:max(it['option_count'], 1)])
        it['needs_human'] = True
        if it['option_count'] == 0:
            it['anomaly'] = 'options-not-in-text'
        elif beyond:
            it['anomaly'] = 'option-letter-damaged'
        else:
            it['anomaly'] = 'fewer-options-than-expected'

    # 3. A line carrying a full option run but no question number is a question
    #    whose number was lost, not stray text.
    for p in problems:
        if p['kind'] != 'orphan-line':
            continue
        if len(_run_from([(m.start(), m.end(), m.group(1))
                          for rx in OPT_STYLES.values()
                          for m in rx.finditer(p['text'])])) >= 3:
            p['kind'] = 'question-missing-number'

    report = {
        'source': src,
        'subject': subject,
        'items': len(items),
        'years': {label(y, pp): by_year[(y, pp)] for (y, pp) in sorted(by_year)},
        'with_options': sum(1 for it in items if it['option_count'] >= 2),
        'option_counts': dict(sorted(
            (str(k), v) for k, v in
            {c: sum(1 for it in items if it['option_count'] == c)
             for c in {it['option_count'] for it in items}}.items())),
        'with_passage': sum(1 for it in items if it['passage_id']),
        'passages': len({it['passage_id'] for it in items if it['passage_id']}),
        'with_diagram': sum(1 for it in items if it['diagram_files']),
        'problems': problems,
        'problem_counts': dict(sorted(
            {k: sum(1 for p in problems if p['kind'] == k)
             for k in {p['kind'] for p in problems}}.items())),
        'orphan_images': orphan_images,
        'unparsed_image_names': unparsed_diagrams,
        'missing_question_numbers': missing,
        'repeated_year_headers': repeats,
        'needs_human': [
            {'year': it['year'], 'q': it['q_number'], 'anomaly': it['anomaly'],
             'options_found': it['option_count'], 'raw': it['raw'][:220]}
            for it in items if it['needs_human']
        ],
    }
    return items, report


GAP = re.compile(r'(?:[.…_]{2,}|[–—-]+)\s*(\d{1,3})\s*(?:[.…_]{2,}|[–—-]+)')   # ……71…… or – 79 --


def bind_cloze(items):
    """A cloze passage carries its own question numbers, written into the
    gaps: "The ......71...... of the chairman". The instruction above it names
    no range ("the numbered gaps indicate missing words"), so the ordinary
    binding gave the passage to the first gap only, and every other gap came
    out as four bare options. A passage belongs to exactly the questions whose
    numbers appear in its gaps, in its own paper."""
    by_unit = {}
    for it in items:
        by_unit.setdefault((it['year'], it.get('paper', 1)), {})[it['q_number']] = it
    bound = 0
    for unit in by_unit.values():
        for it in list(unit.values()):
            text = it.get('passage_text') or ''
            gaps = {int(g) for g in GAP.findall(text)}
            if len(gaps) < 2 or it['q_number'] not in gaps:
                continue
            for q in gaps:
                other = unit.get(q)
                if other is not None and other.get('passage_id') != it['passage_id']:
                    other['passage_text'], other['passage_id'] = it['passage_text'], it['passage_id']
                    bound += 1
    return bound


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--config', required=True)
    ap.add_argument('--outdir', default='out')
    a = ap.parse_args()

    cfg = json.load(open(a.config, encoding='utf8'))
    root = os.path.dirname(os.path.abspath(a.config))
    for k in ('source', 'diagram_root'):
        if cfg.get(k):
            cfg[k] = os.path.normpath(os.path.join(root, cfg[k]))

    items, report = extract(cfg)
    report['cloze_gaps_bound'] = bind_cloze(items)
    os.makedirs(a.outdir, exist_ok=True)
    slug = cfg['slug']
    # Written whole and swapped in, because a paper may be running while the
    # file is refreshed and must never read half of it.
    path = os.path.join(a.outdir, f'{slug}.items.jsonl')
    with open(path + '.tmp', 'w', encoding='utf8') as f:
        for it in items:
            f.write(json.dumps(it, ensure_ascii=False) + '\n')
    os.replace(path + '.tmp', path)
    with open(os.path.join(a.outdir, f'{slug}.report.json'), 'w', encoding='utf8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    r = report
    print(f"{slug}: {r['items']} items across {len(r['years'])} years")
    print(f"  options parsed : {r['with_options']}/{r['items']}   counts {r['option_counts']}")
    print(f"  shared stems   : {r['passages']} covering {r['with_passage']} items")
    print(f"  with diagram   : {r['with_diagram']}")
    print(f"  problems       : {r['problem_counts'] or 'none'}")
    print(f"  orphan images  : {len(r['orphan_images'])}  {r['orphan_images'][:4]}")
    print(f"  missing q nums : {r['missing_question_numbers'] or 'none'}")
    print(f"  needs human    : {len(r['needs_human'])}")
    print(f"  per year       : {r['years']}")
    for rp in r['repeated_year_headers']:
        print(f"  REPEATED {rp['labelled']} (paper {rp['paper']}, {rp['items']} questions): probably {rp['probable_year']}. {rp['reason']}")


if __name__ == '__main__':
    sys.exit(main())
