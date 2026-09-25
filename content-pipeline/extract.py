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

IMG_EXT = ('.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg')

# UTME and WASSCE are how the papers are branded. The database enum is narrower.
EXAM_TYPE_MAP = {'WASSCE': 'WAEC', 'WAEC': 'WAEC', 'UTME': 'JAMB', 'JAMB': 'JAMB'}


def paragraphs(docx_path):
    """Every non-empty paragraph, in document order, as plain text."""
    with zipfile.ZipFile(docx_path) as z:
        xml = z.read('word/document.xml').decode('utf8', 'ignore')
    out = []
    for block in re.findall(r'<w:p[ >].*?</w:p>', xml, re.S):
        # <w:br/> and <w:tab/> are real breaks; everything else is markup.
        block = re.sub(r'<w:(br|tab)\s*/>', ' ', block)
        text = re.sub(r'<[^>]+>', '', block)
        text = text.replace('\xa0', ' ')
        text = re.sub(r'\s+', ' ', text).strip()
        if text:
            out.append(text)
    return out


def year_header(text, subject_words):
    """A year block opens with a line like '2019 WASSCE BIOLOGY QUESTIONS'."""
    m = re.match(r'^(20(?:1[0-9]|2[0-9]))\s+(WASSCE|WAEC|UTME|JAMB)\b', text, re.I)
    if not m:
        return None
    # Guard against a question that merely starts with a year.
    if re.match(r'^\d+\.', text):
        return None
    return int(m.group(1)), m.group(2).upper()


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
    """Longest ascending run of option letters starting at A, no gaps."""
    run, expect = [], 'A'
    for start, end, letter in marks:
        if letter.upper() == expect:
            run.append((start, end, expect))
            expect = chr(ord(expect) + 1)
    return run


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

    stem = body[:best[0][0]].strip()
    opts = {}
    for i, (start, end, letter) in enumerate(best):
        stop = best[i + 1][0] if i + 1 < len(best) else len(body)
        opts[letter] = body[end:stop].strip().rstrip('.').strip()

    problem = None
    if not stem:
        problem = 'empty-stem'
    elif any(not v for v in opts.values()):
        problem = 'empty-option'
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
            m = re.match(r'(20\d{2})[_\-\s]*Q\s*(\d+)(?:\s*[-–]\s*(\d+))?', fn, re.I)
            if not m:
                unparsed.append(os.path.relpath(full, root))
                continue
            year = int(m.group(1))
            a = int(m.group(2))
            b = int(m.group(3)) if m.group(3) else a
            if b < a:
                a, b = b, a
            for q in range(a, b + 1):
                idx[(year, q)].append(full)
    return idx, unparsed


def psfx(paper):
    return '' if paper == 1 else f'-p{paper}'


def extract(cfg):
    src = cfg['source']
    subject = cfg['subject']
    paras = paragraphs(src)

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

    def is_new_block(t):
        """True when a paragraph starts something rather than continuing it."""
        return (year_header(t, subject) is not None
                or re.match(r'^\d{1,3}[\.\)]\s', t) is not None
                or stem_range(t) is not None)

    i = -1
    while i + 1 < len(paras):
        i += 1
        text = paras[i]
        yh = year_header(text, subject)
        if yh:
            year, exam_brand = yh
            paper_count[year] = paper_count.get(year, 0) + 1
            paper = paper_count[year]
            headers.append({'para': i, 'year': year, 'paper': paper, 'text': text[:60]})
            pending_stems = []
            inferred = None
            continue
        if re.fullmatch(r'(OBJECTIVE\s+QUESTIONS?|SECTION\s+[AB]\b.*)', text, re.I):
            continue
        if year is None:
            continue

        qm = re.match(r'^(\d{1,3})[\.\)]\s+(.*)$', text)
        if qm:
            qnum = int(qm.group(1))
            body = qm.group(2)

            # A question whose options sit on the following paragraph. Absorb up
            # to two continuation lines, but only lines that start nothing of
            # their own, so a stem or the next question is never swallowed.
            merged = 0
            while merged < 2 and len(_run_from(
                    [(m.start(), m.end(), m.group(1))
                     for rx in OPT_STYLES.values() for m in rx.finditer(body)])) < 2:
                nxt = i + 1
                if nxt >= len(paras) or is_new_block(paras[nxt]):
                    break
                body = (body.rstrip() + ' ' + paras[nxt]).strip()
                i = nxt
                merged += 1

            key = (year, paper, qnum)
            if key in seen:
                problems.append({'kind': 'duplicate-question-number', 'year': year,
                                 'paper': paper, 'q': qnum, 'para': i, 'text': text[:120]})
                continue
            seen.add(key)

            stem, opts, problem = split_options(body)
            st = stem_for_q.get(key)

            # An unlabelled stimulus binds to the question right after it, and
            # onward only while the following questions keep referring to its
            # labels. An explicit "answer questions N and M" stem always wins.
            if st is None and inferred is not None:
                first = not inferred['questions']
                shares = bool(anchors(body) & inferred['anchors'])
                if first or shares:
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
            if inferred is not None and not inferred['questions'] and i - inferred['para'] == 1:
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
            stem_seq += 1
            pid = (f"{subject.lower().replace(' ', '-')}-{exam_brand.lower()}"
                   f"-{year}{psfx(paper)}-s{stem_seq:02d}")
            inferred = {'passage_id': pid, 'text': text, 'questions': [],
                        'para': i, 'inferred': True, 'anchors': anchors(text)}
            problems.append({'kind': 'inferred-stimulus', 'year': year, 'para': i,
                             'passage_id': pid, 'text': text[:160]})

    # A diagram that binds to no extracted question is a real gap, not noise.
    bound = {(it['year'], it['q_number']) for it in items if it['paper'] == 1}
    orphan_images = sorted({os.path.relpath(p, cfg['diagram_root'])
                            for (y, q), paths in diagrams.items()
                            if (y, q) not in bound for p in paths}) if cfg.get('diagram_root') else []

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
    for n, h in enumerate(headers):
        if h['paper'] == 1:
            continue
        nxt = headers[n + 1]['year'] if n + 1 < len(headers) else None
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
    os.makedirs(a.outdir, exist_ok=True)
    slug = cfg['slug']
    with open(os.path.join(a.outdir, f'{slug}.items.jsonl'), 'w', encoding='utf8') as f:
        for it in items:
            f.write(json.dumps(it, ensure_ascii=False) + '\n')
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
