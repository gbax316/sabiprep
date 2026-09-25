"""
Shared by every stage: how a unit of work is named and how its questions load.

A unit is one paper: a (year, paper) pair. Most years hold one paper. Some
source files hold two under the same year header, and the extractor keeps both
(paper 1 and paper 2). Anything that looked questions up by year and number
alone would let the second paper overwrite the first, which is the bug the
extractor itself once had. So every stage names and loads by unit.

Paper 1 keeps the bare year in file names, so a single-paper subject's files
read exactly as before: biology-waec.final.2025.json. A second paper adds a
suffix: mathematics-utme.final.2020-p2.json.
"""

import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')


def unit_name(year, paper=1):
    return f'{year}' if int(paper) == 1 else f'{year}-p{paper}'


def parse_unit(name):
    """'2020-p2' -> (2020, 2); '2025' -> (2025, 1)."""
    s = str(name)
    if '-p' in s:
        y, p = s.split('-p', 1)
        return int(y), int(p)
    return int(s), 1


def load_config(slug):
    path = os.path.join(HERE, 'configs', f'{slug}.json')
    cfg = json.load(open(path, encoding='utf8'))
    root = cfg.get('diagram_root')
    cfg['_diagram_root'] = os.path.normpath(os.path.join(os.path.dirname(path), root)) if root else None
    return cfg


def all_items(slug):
    with open(os.path.join(OUT, f'{slug}.items.jsonl'), encoding='utf8') as f:
        return [json.loads(line) for line in f]


def load_items(slug, year, paper=1):
    """Questions for one unit, keyed by question number."""
    return {i['q_number']: i for i in all_items(slug)
            if i['year'] == int(year) and i.get('paper', 1) == int(paper)}


def units(slug):
    """Every (year, paper) in the extracted file, newest year first."""
    return sorted({(i['year'], i.get('paper', 1)) for i in all_items(slug)},
                  key=lambda u: (-u[0], u[1]))


def out_path(slug, kind, unit, suffix='json'):
    return os.path.join(OUT, f'{slug}.{kind}.{unit}.{suffix}')


def subject_key(cfg):
    """File-safe subject name: 'Christian Religious Studies' -> 'christian-religious-studies'.
    One taxonomy per subject, shared by its WAEC and UTME configs."""
    return cfg.get('subject_key') or '-'.join(cfg['subject'].lower().split())


def taxonomy_path(cfg):
    return os.path.join(HERE, 'taxonomies', f'{subject_key(cfg)}.json')
