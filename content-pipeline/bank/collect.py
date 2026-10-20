"""
Pipeline outputs -> bank records. Reads only; decides nothing.

A question's status is the sort's (sort_report.py): passed when its row reached
the export and the review batch does not hold it, separated when its paper was
exported without it or the batch holds it, waiting when its paper has not been
exported yet (or was extracted again since, and re-runs).
"""

import json, os, re

from common import HERE, OUT, all_items, load_config, subject_key, taxonomy_path, unit_name, units
from sort_report import jload, unit_rows

from .contract import paper_key, question_key

EXAMS = {'WASSCE': 'WAEC West African Senior School Certificate Examination',
         'UTME': 'JAMB Unified Tertiary Matriculation Examination'}


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


def syllabus(v):
    """Trees give {'waec': ..., 'jamb': ...}; an older one gives one string."""
    if isinstance(v, dict):
        return v.get('waec'), v.get('jamb'), None
    return None, None, v


def collect():
    """Everything the bank holds, as plain dicts, per table."""
    out = {k: [] for k in ('exams', 'subjects', 'topics', 'subtopics', 'papers', 'passages', 'questions')}
    out['exams'] = [{'exam': k, 'name': v} for k, v in EXAMS.items()]
    queue = jload(os.path.join(OUT, 'review-queue.json'), {'items': []})['items']
    held = {r['id']: r for r in queue if r['held']}
    on_tree, seen_subjects = set(), set()
    slugs = sorted(f[:-5] for f in os.listdir(os.path.join(HERE, 'configs')) if f.endswith('.json'))
    for slug in slugs:
        if not os.path.exists(os.path.join(OUT, f'{slug}.items.jsonl')):
            continue
        cfg = load_config(slug)
        subj = subject_key(cfg)
        if subj not in seen_subjects:
            seen_subjects.add(subj)
            out['subjects'].append({'subject': subj, 'name': cfg['subject']})
            tax = json.load(open(taxonomy_path(cfg), encoding='utf8'))
            for n, t in enumerate(tax['topics']):
                w, j, note = syllabus(t.get('syllabus'))
                out['topics'].append({'topic_key': f"{subj}:{t['id']}", 'topic_id': t['id'], 'subject': subj, 'name': t['name'], 'part': t.get('part'),
                                      'syllabus_waec': w, 'syllabus_jamb': j, 'syllabus_note': note, 'position': n,
                                      'active': int(t.get('status', 'active') != 'inactive')})
                for k, s in enumerate(t.get('subtopics', [])):
                    w, j, note = syllabus(s.get('syllabus'))
                    on_tree.add(f"{subj}:{s['id']}")
                    out['subtopics'].append({'subtopic_key': f"{subj}:{s['id']}", 'subtopic_id': s['id'],
                                             'topic_key': f"{subj}:{t['id']}", 'name': s['name'],
                                             'syllabus_waec': w, 'syllabus_jamb': j, 'syllabus_note': note,
                                             'covers': s.get('covers'), 'position': k,
                                             'active': int(s.get('status', 'active') != 'inactive')})
        state = jload(os.path.join(HERE, 'state', f'{slug}.json'), {'units': {}})['units']
        items = all_items(slug)
        for y, p in units(slug):
            u = unit_name(y, p)
            its = sorted((i for i in items if i['year'] == y and i.get('paper', 1) == p), key=lambda i: i['q_number'])
            pkey = paper_key(its[0]['exam_brand'], subj, y, p)
            try:
                got = unit_rows(slug, items, y, p, held)
            except SystemExit:
                got = None               # extracted again since its export; the paper re-runs
            out['papers'].append({
                'paper_key': pkey, 'exam': its[0]['exam_brand'], 'subject': subj, 'year': y, 'paper_no': p,
                'paper_name': its[0].get('paper_name') or ('Objective' if p == 1 else 'Second paper, year to confirm'),
                'pipeline_slug': slug, 'question_count': len(its),
                'run_status': (state.get(u) or {}).get('status', 'not started')})
            final = jload(os.path.join(OUT, f'{slug}.final.{u}.json'), {'answers': {}})['answers']
            subs = {x['q_number']: x.get('subtopic_id')
                    for x in jload(os.path.join(OUT, f'{slug}.teaching.{u}.json'), {'items': []})['items']}
            rows = got['rows'] if got else {}
            pkeys = {}
            for it in its:
                pid = it.get('passage_id')
                if not pid or pid in pkeys:
                    continue
                members = [x for x in its if x.get('passage_id') == pid]
                nums = [x['q_number'] for x in members]
                key = f'{pkey}-s{min(nums):02d}'
                while key in pkeys.values():
                    key += 'b'
                pkeys[pid] = key
                text = it['passage_text'] or ''
                kind = ('cloze' if len(members) > 2 and all(not x['stem'].strip() for x in members)
                        else 'set-text' if re.search(r'\bbased on\b', text, re.I)
                        else 'passage' if len(text) > 300 else 'shared-stem')
                out['passages'].append({'passage_key': key, 'paper_key': pkey, 'kind': kind, 'text': text,
                                        'first_question': min(nums), 'last_question': max(nums)})
            for it in its:
                q = it['q_number']
                f, row, hk = final.get(str(q), {}), rows.get(q), f'{slug}:{u}:{q}'
                if row is not None:
                    status, why = 'passed', None
                elif got is not None or hk in held:
                    status = 'separated'
                    why = ('; '.join(r.get('detail') or r['kind'] for r in held[hk]['reasons']) if hk in held
                           else f.get('reason') or f.get('state') or 'held at export')
                else:
                    status, why = 'waiting', None
                o = it.get('options') or {}
                r = row or {}
                sub = f'{subj}:{subs[q]}' if status == 'passed' and subs.get(q) else None
                out['questions'].append({
                    'question_key': question_key(pkey, q), 'paper_key': pkey, 'position': q,
                    'passage_key': pkeys.get(it.get('passage_id')), 'origin': 'past-paper',
                    'stem': r.get('question_text') or it['stem'],
                    **{f'option_{k.lower()}': o.get(k) for k in 'ABCDE'},
                    'options_are_images': int(bool(it.get('options_are_images'))),
                    'diagram_files': json.dumps(it.get('diagram_files') or []),
                    'answer': f.get('answer') if status == 'passed' else None,
                    'answer_basis': f.get('evidence'), 'paper_key_letter': it.get('official_key'),
                    'status': status, 'separated_why': why,
                    'subtopic_key': sub if sub in on_tree else None,
                    'difficulty': r.get('difficulty'), 'hint1': r.get('hint1'), 'hint2': r.get('hint2'),
                    'hint3': r.get('hint3'), 'solution': r.get('solution'),
                    'parts': solution_parts(r.get('solution'))})
    return out
