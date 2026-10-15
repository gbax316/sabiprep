"""
Read a returned "questions to check against the papers" document into
corrections the extractor applies.

The document goes out with four columns: the paper and question, the question as
typed, what is wrong, and an empty "What the paper says" column for the person
holding the printed paper. What comes back in that column is one of:

  a letter          the paper's answer key ("C")
  the question      the full text as printed, options included
  "same as paper"   the typed text is what the paper says
  "...diagram form" the options are drawings, not text

Each answered row becomes one entry in corrections/<slug>.json, keyed by unit
and question ("2020-p2/9"). Corrections live beside the configs, not in out/,
because they are source data: re-extracting must never lose them. A later
return of the same document merges in; an entry already present is replaced
only when the new answer differs, and the old one is kept under "previous".

Blank rows are left alone. They stay in whatever bucket they were in.

Usage:
    python ingest_review_doc.py --docx "../Exam Questions/New_Diagrams/SabiPrep - questions to check against the papers.docx" --received 2026-10-15
"""

import argparse, json, os, re, sys

import docx

from common import HERE

SECTION = re.compile(r'^(.+), (WASSCE|UTME) \(\d+\)$')
REF = re.compile(r'^(\d{4})(?: \((second|third) paper\)| paper (\d))? / Question (\d+)$')
ORD = {'second': 2, 'third': 3}


def slug_map():
    m = {}
    for fn in os.listdir(os.path.join(HERE, 'configs')):
        if not fn.endswith('.json'):
            continue
        cfg = json.load(open(os.path.join(HERE, 'configs', fn), encoding='utf8'))
        exam = 'WASSCE' if cfg['slug'].endswith('-waec') else 'UTME'
        m[(cfg['subject'], exam)] = cfg['slug']
    return m


def cell_text(tc):
    ns = tc.tag.split('}')[0] + '}'
    paras = [''.join(t.text or '' for t in p.iter(ns + 't')) for p in tc.iter(ns + 'p')]
    return ' / '.join(p for p in paras if p.strip())


def rows(path):
    """(subject, exam, ref, flagged, answer) for every question row, in order."""
    d = docx.Document(path)
    section = None
    for block in d.element.body.iterchildren():
        tag = block.tag.split('}')[1]
        if tag == 'p':
            text = ''.join(t.text or '' for t in block.iter() if t.tag.endswith('}t')).strip()
            m = SECTION.match(text)
            if m:
                section = (m.group(1), m.group(2))
        elif tag == 'tbl' and section:
            for tr in block.iter(block.tag.split('}')[0] + '}tr'):
                cells = [cell_text(tc) for tc in tr if tc.tag.endswith('}tc')]
                if len(cells) >= 4 and REF.match(cells[0].strip()):
                    yield section[0], section[1], cells[0].strip(), cells[1], cells[2], cells[3].strip()


def classify(answer):
    a = answer.strip().rstrip('/').strip()
    if not a:
        return None
    if re.fullmatch(r'[A-Ea-e]\.?', a):
        return {'kind': 'key', 'key': a[0].upper()}
    if re.search(r'diagram form', a, re.I):
        return {'kind': 'options-as-images'}
    if re.fullmatch(r'same as (the )?paper\.?', a, re.I):
        return {'kind': 'as-typed'}
    return {'kind': 'text', 'text': a}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--docx', required=True)
    ap.add_argument('--received', required=True, help='date the document came back, YYYY-MM-DD')
    a = ap.parse_args()

    slugs = slug_map()
    found, per_slug, unknown = 0, {}, []
    for subject, exam, ref, typed, flagged, answer in rows(a.docx):
        found += 1
        c = classify(answer)
        if not c:
            continue
        slug = slugs.get((subject, exam))
        m = REF.match(ref)
        if not slug or not m:
            unknown.append((subject, exam, ref))
            continue
        paper = ORD.get(m.group(2)) or int(m.group(3) or 1)
        unit = m.group(1) if paper == 1 else f'{m.group(1)}-p{paper}'
        c.update(flagged=flagged.split(':')[0], source=os.path.basename(a.docx), received=a.received)
        per_slug.setdefault(slug, {})[f'{unit}/{m.group(4)}'] = c

    os.makedirs(os.path.join(HERE, 'corrections'), exist_ok=True)
    for slug, new in sorted(per_slug.items()):
        path = os.path.join(HERE, 'corrections', f'{slug}.json')
        cur = json.load(open(path, encoding='utf8')) if os.path.exists(path) else {}
        changed = 0
        for k, v in new.items():
            old = cur.get(k)
            if old and {x: old.get(x) for x in ('kind', 'key', 'text')} == {x: v.get(x) for x in ('kind', 'key', 'text')}:
                continue
            if old:
                v['previous'] = {x: old[x] for x in old if x != 'previous'}
            cur[k] = v
            changed += 1
        json.dump(dict(sorted(cur.items())), open(path, 'w', encoding='utf8'), indent=1, ensure_ascii=False)
        kinds = {}
        for v in new.values():
            kinds[v['kind']] = kinds.get(v['kind'], 0) + 1
        print(f'{slug:<28} {len(new):>3} answered, {changed:>3} new or changed  {kinds}')
    print(f'{found} question rows read')
    for u in unknown:
        print('  could not place:', *u)
    return 1 if unknown else 0


if __name__ == '__main__':
    sys.exit(main())
