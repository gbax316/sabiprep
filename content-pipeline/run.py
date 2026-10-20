"""
The orchestrator: one subject through every stage, the same way every time.

Each paper (a "unit": a year, or year plus paper number) goes through the
stages below in order. Every stage writes its result to out/ and records itself
in state/<slug>.json, so a run can stop anywhere and resume where it left off.

Gate (decision D7): a subject's first unit, its most recent paper, runs alone
and then stops. Orezi reviews the preview and the topic tree, and approves.
Only then do the remaining years run, unattended. Questions that could not be
settled are held with a reason and reviewed in one batch at the end, never
guessed into the import.

Two model families, never one checking itself: Claude derives, rules, teaches,
fixes and draws; Codex derives independently and reviews everything Claude
wrote. Claude workers run headless in --restricted mode, which confines each
to its own folder under work/, so a deriver cannot see the other family's
answers.

Usage:
    python run.py status [slug]
    python run.py taxonomy <slug>              build the subject's topic tree
    python run.py run <slug>                   run to the gate, or on through every year once approved
    python run.py run <slug> --unit 2024       one unit
    python run.py run <slug> --unit 2024 --from teach
    python run.py approve <slug> --note "..."  record Orezi's gate approval
    python run.py adopt <slug> --unit 2025     record stages whose outputs already exist
"""

import argparse, datetime, json, os, re, shutil, subprocess, sys, time
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor

from common import (HERE, OUT, load_config, load_items, parse_unit, subject_key,
                    taxonomy_path, unit_name, units)

PIPE = json.load(open(os.path.join(HERE, 'pipeline.json'), encoding='utf8'))
STATE_DIR = os.path.join(HERE, 'state')
BRIEFS = os.path.join(HERE, 'briefs')
STANDARD = os.path.join(HERE, 'standards', 'teaching.md')
PY = sys.executable

STAGES = ['derive', 'compare', 'third', 'settle', 'classify', 'teach', 'review', 'fix',
          'recheck', 'final-fix', 'trace', 'alt', 'author', 'diagram-check', 'diagram-repair',
          'diagram-recheck', 'export', 'preview']

TEACH_FIELDS = ('subtopic_id', 'difficulty', 'hint1', 'hint2', 'hint3', 'solution')


class StageError(Exception):
    pass


def now():
    return datetime.datetime.now().isoformat(timespec='seconds')


def jload(path, default=None):
    if not os.path.exists(path):
        return default
    return json.load(open(path, encoding='utf8'))


def jsave(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    # Windows refuses the replace while any process (a reader, the virus
    # scanner) has the target open, and one refusal failed a whole paper.
    for wait in (0.5, 1, 2, 4, 8, 0):
        try:
            os.replace(tmp, path)
            return
        except PermissionError:
            if not wait:
                raise
            time.sleep(wait)


# ---------------------------------------------------------------- state

def state_path(slug):
    return os.path.join(STATE_DIR, f'{slug}.json')


def load_state(slug, cfg):
    st = jload(state_path(slug))
    if st is None:
        st = {'slug': slug, 'subject': cfg['subject'],
              'gate': {'status': 'open', 'unit': None, 'at': None, 'note': ''},
              'units': {}, 'cost_usd': 0.0}
    return st


def save_state(st):
    st['cost_usd'] = round(sum(s.get('cost_usd', 0) for u in st['units'].values()
                               for s in u.get('stages', {}).values()) + st.get('taxonomy_cost_usd', 0), 2)
    jsave(state_path(st['slug']), st)


# ---------------------------------------------------------------- context

class Ctx:
    def __init__(self, slug, unit, st):
        self.slug, self.unit, self.st = slug, unit, st
        self.cfg = load_config(slug)
        if unit == 'taxonomy':
            self.year = self.paper = None
            self.items = {}
        else:
            self.year, self.paper = parse_unit(unit)
            self.items = load_items(slug, self.year, self.paper)
        self.work = os.path.join(HERE, 'work', slug, unit)
        os.makedirs(self.work, exist_ok=True)
        self.droot = self.cfg['_diagram_root']
        self.ddir = os.path.join(OUT, 'diagrams', slug)
        exam = next(iter(self.items.values()))['exam_brand'] if self.items else ''
        self.subs = {'subject': self.cfg['subject'], 'exam': exam,
                     'exam_body': 'JAMB' if exam == 'UTME' else 'WAEC', 'unit': unit,
                     'diagram_root': (self.droot.replace('\\', '/') if self.droot
                                      else 'none: this paper has no diagrams')}
        self.cost = 0.0

    def out(self, kind, suffix='json'):
        return os.path.join(OUT, f'{self.slug}.{kind}.{self.unit}.{suffix}')

    def log(self, msg):
        line = f'[{now()}] {self.slug} {self.unit} {msg}'
        print(line, flush=True)
        with open(os.path.join(self.work, 'run.log'), 'a', encoding='utf8') as f:
            f.write(line + '\n')

    def unit_args(self):
        return ['--slug', self.slug, '--year', str(self.year), '--paper', str(self.paper)]

    def final(self):
        return jload(self.out('final'))['answers']

    def keyed(self):
        fin = self.final()
        return sorted(q for q in self.items if (fin.get(str(q)) or {}).get('state') == 'keyed')

    def taxonomy(self):
        return jload(taxonomy_path(self.cfg))


def tax_index(tax):
    parents, subs = {}, {}
    for t in tax['topics']:
        parents[t['id']] = t
        for s in t['subtopics']:
            subs[s['id']] = (t, s)
    return parents, subs


# ---------------------------------------------------------------- running things

def run_py(ctx, stage, script, *args):
    logp = os.path.join(ctx.work, 'logs', f'{stage}.log')
    os.makedirs(os.path.dirname(logp), exist_ok=True)
    env = dict(os.environ, PYTHONIOENCODING='utf-8')
    p = subprocess.run([PY, os.path.join(HERE, script), *args], cwd=HERE, capture_output=True,
                       text=True, encoding='utf8', env=env)
    with open(logp, 'a', encoding='utf8') as f:
        f.write(f'$ {script} {" ".join(args)}\n{p.stdout}\n{p.stderr}\n')
    if p.returncode != 0:
        raise StageError(f'{script} exited {p.returncode}: {(p.stderr or p.stdout)[-400:]}')
    return p.stdout


def fill(brief, subs):
    text = open(os.path.join(BRIEFS, brief), encoding='utf8').read()
    for k, v in subs.items():
        text = text.replace('{{' + k + '}}', str(v))
    left = re.findall(r'\{\{(\w+)\}\}', text)
    if left:
        raise StageError(f'brief {brief} has unfilled placeholders: {sorted(set(left))}')
    return text


def claude_worker(ctx, name, brief, subs, files, model_key, validate, add_dirs=()):
    """Run one headless Claude worker in its own folder and validate what it wrote.

    files maps a file name in the worker's folder to either data (written as
    JSON) or ('copy', path). One retry, in the same folder, told exactly what
    failed validation. Returns the worker folder."""
    wd = os.path.join(ctx.work, name)
    if os.path.isdir(wd):
        shutil.rmtree(wd)
    os.makedirs(wd)
    for fname, content in files.items():
        dst = os.path.join(wd, fname)
        if isinstance(content, tuple) and content[0] == 'copy':
            shutil.copy(content[1], dst)
        elif isinstance(content, str):
            open(dst, 'w', encoding='utf8').write(content)
        else:
            jsave(dst, content)
    prompt = fill(brief, {**ctx.subs, **subs})
    model = PIPE['models'][model_key]
    errors = None
    for attempt in (1, 2):
        text = prompt if attempt == 1 else (
            prompt + '\n\n## Your first attempt failed validation\n\n'
            + '\n'.join(f'- {e}' for e in errors[:30])
            + '\n\nYour first attempt\'s files are still in your working directory. Fix exactly these problems and write the files again.')
        open(os.path.join(wd, f'brief.{attempt}.md'), 'w', encoding='utf8').write(text)
        cmd = ['claude', '-p', '--restricted', '--safe-mode', '--strict-mcp-config',
               '--model', model, '--permission-mode', 'acceptEdits',
               '--output-format', 'json', '--no-session-persistence']
        for d in add_dirs:
            if d:
                cmd += ['--add-dir', d.replace('\\', '/')]
        cmd += ['--allowedTools', 'Read', 'Write', 'Edit', 'Glob', 'Grep']
        t0 = time.time()
        try:
            p = subprocess.run(cmd, input=text, cwd=wd, capture_output=True, text=True,
                               encoding='utf8', timeout=PIPE['worker_timeout_minutes'] * 60)
        except subprocess.TimeoutExpired:
            raise StageError(f'{name}: worker timed out after {PIPE["worker_timeout_minutes"]} minutes')
        open(os.path.join(wd, f'session.{attempt}.json'), 'w', encoding='utf8').write(p.stdout or '')
        if p.stderr:
            open(os.path.join(wd, f'stderr.{attempt}.txt'), 'w', encoding='utf8').write(p.stderr)
        try:
            sess = json.loads(p.stdout)
            ctx.cost += float(sess.get('total_cost_usd') or 0)
            reply = sess.get('result', '')
        except Exception:
            reply = ''
        ctx.log(f'  {name}: worker attempt {attempt} on {model}, {int(time.time() - t0)}s')
        errors = validate(wd)
        if not errors:
            if reply:
                open(os.path.join(wd, 'reply.md'), 'w', encoding='utf8').write(reply)
            return wd
        ctx.log(f'  {name}: {len(errors)} validation problems: {errors[:3]}')
    raise StageError(f'{name}: output still invalid after a retry: {errors[:5]}')


def read_out(wd, name='output.json'):
    try:
        return json.load(open(os.path.join(wd, name), encoding='utf8'))
    except Exception:
        return None


def style_scan(path):
    script = os.environ.get(PIPE['style_scan_env']) or PIPE['style_scan_default']
    if not os.path.exists(script):
        return 'style scan not available on this machine'
    p = subprocess.run([PY, script, path], capture_output=True, text=True, encoding='utf8',
                       env=dict(os.environ, PYTHONIOENCODING='utf-8'))
    lines = [l.strip() for l in (p.stdout or p.stderr or '').splitlines() if l.strip()]
    verdict = [l for l in lines if l.startswith(('PASS', 'FAIL', 'WARN', 'REVIEW'))]
    return (verdict or lines or ['no output'])[0]


def item_view(it, answer=None):
    v = {'q_number': it['q_number'], 'stem': it['stem'], 'options': it['options'],
         'passage_text': it.get('passage_text'), 'passage_id': it.get('passage_id'),
         'diagram_files': it.get('diagram_files') or []}
    if answer is not None:
        v['answer'] = answer
    return v


def chunks_by_passage(qs, items, size):
    """Pack questions into chunks of at most `size`, never splitting a shared stem."""
    groups, seen = [], {}
    for q in qs:
        pid = items[q].get('passage_id')
        if pid and pid in seen:
            groups[seen[pid]].append(q)
        else:
            if pid:
                seen[pid] = len(groups)
            groups.append([q])
    out, cur = [], []
    for g in groups:
        if cur and len(cur) + len(g) > size:
            out.append(cur)
            cur = []
        cur += g
    if cur:
        out.append(cur)
    return out


def teaching_errors(data, want, answers, subs_valid):
    errs = []
    if not isinstance(data, dict) or not isinstance(data.get('items'), list):
        return ['output.json is missing or has no items list']
    got = {i.get('q_number'): i for i in data['items']}
    for q in want:
        i = got.get(q)
        if not i:
            errs.append(f'Q{q} missing')
            continue
        for f in ('hint1', 'hint2', 'hint3', 'solution'):
            if not str(i.get(f, '')).strip():
                errs.append(f'Q{q} empty {f}')
        if not str(i.get('solution', '')).startswith(f'Answer: {answers[q]}.'):
            errs.append(f'Q{q} solution must open with "Answer: {answers[q]}."')
        if i.get('subtopic_id') not in subs_valid:
            errs.append(f'Q{q} subtopic_id {i.get("subtopic_id")!r} is not in the taxonomy')
        if i.get('difficulty') not in ('easy', 'medium', 'hard'):
            errs.append(f'Q{q} difficulty {i.get("difficulty")!r}')
        blob = ' '.join(str(i.get(f, '')) for f in ('hint1', 'hint2', 'hint3', 'solution'))
        if '—' in blob:
            errs.append(f'Q{q} contains an em-dash')
        if re.search(r'\*\*|`|^#', blob, re.M):
            errs.append(f'Q{q} contains markdown')
    return errs


# ---------------------------------------------------------------- stages

def s_derive(ctx):
    qs = sorted(ctx.items)
    answers_ok = lambda a, it: a.get('answer') == 'NONE' or a.get('answer') in it['options']

    def codex():
        out = run_py(ctx, 'derive', 'derive_codex.py', *ctx.unit_args(), '--parallel', '3')
        got = (jload(ctx.out('codex')) or {}).get('answers', {})
        miss = [q for q in qs if str(q) not in got]
        if miss:
            ctx.log(f'  codex missing {miss}, one retry')
            run_py(ctx, 'derive', 'derive_codex.py', *ctx.unit_args(), '--questions', ','.join(map(str, miss)))
        return out

    def claude():
        def val(wd):
            d = read_out(wd)
            if not d or not isinstance(d.get('answers'), dict):
                return ['output.json missing or has no answers object']
            errs = []
            for q in qs:
                a = d['answers'].get(str(q))
                if not a:
                    errs.append(f'Q{q} missing')
                elif not answers_ok(a, ctx.items[q]):
                    errs.append(f'Q{q} answer {a.get("answer")!r} is not an option letter or NONE')
            return errs
        wd = claude_worker(ctx, 'derive', 'derive.md', {'count': len(qs)},
                           {'input.json': {'subject': ctx.cfg['subject'], 'unit': ctx.unit,
                                           'items': [item_view(ctx.items[q]) for q in qs]}},
                           'derive', val, add_dirs=[ctx.droot])
        d = read_out(wd)
        jsave(ctx.out('claude'), {'deriver': 'claude', 'year': ctx.year, 'paper': ctx.paper,
                                  'answers': {str(q): d['answers'][str(q)] for q in qs}, 'failures': []})

    with ThreadPoolExecutor(2) as ex:
        fc, fl = ex.submit(codex), ex.submit(claude)
        fc.result(), fl.result()
    cx = jload(ctx.out('codex'))['answers']
    return f'{len(cx)}/{len(qs)} codex, {len(qs)}/{len(qs)} claude'


def s_compare(ctx):
    out = run_py(ctx, 'compare', 'adjudicate.py', *ctx.unit_args())
    c = jload(ctx.out('verdicts'))['counts']
    return ', '.join(f'{k} {v}' for k, v in sorted(c.items()))


def s_third(ctx):
    v = jload(ctx.out('verdicts'))['verdicts']
    todo = []
    for k, d in v.items():
        one_sided = (d['verdict'] == 'unsolvable' and d['codex'] and d['claude']
                     and (d['codex'].get('solvable') != d['claude'].get('solvable')))
        if d['verdict'] in ('agreed-soft', 'disagree') or one_sided:
            it = ctx.items[int(k)]
            pick = lambda x: {f: (x or {}).get(f) for f in ('answer', 'confidence', 'reasoning', 'issue', 'solvable')}
            todo.append({**item_view(it), 'verdict': d['verdict'], 'codex': pick(d['codex']), 'claude': pick(d['claude'])})
    if not todo:
        jsave(ctx.out('adjudication'), {'year': ctx.year, 'paper': ctx.paper, 'rulings': {}})
        return 'nothing to rule on'
    want = [t['q_number'] for t in todo]

    def val(wd):
        d = read_out(wd)
        if not d or not isinstance(d.get('rulings'), dict):
            return ['output.json missing or has no rulings object']
        errs = []
        for q in want:
            r = d['rulings'].get(str(q))
            if not r:
                errs.append(f'Q{q} missing')
            elif r.get('ruling') not in ('key', 'ambiguous', 'defective'):
                errs.append(f'Q{q} ruling {r.get("ruling")!r}')
            elif r['ruling'] == 'key' and r.get('answer') not in ctx.items[q]['options']:
                errs.append(f'Q{q} keyed to {r.get("answer")!r}, not an option')
        return errs
    wd = claude_worker(ctx, 'third', 'third-review.md', {'count': len(todo)},
                       {'input.json': {'subject': ctx.cfg['subject'], 'unit': ctx.unit, 'items': todo}},
                       'third', val, add_dirs=[ctx.droot])
    d = read_out(wd)
    jsave(ctx.out('adjudication'), {'year': ctx.year, 'paper': ctx.paper,
                                    'rulings': {str(q): d['rulings'][str(q)] for q in want}})
    rul = [d['rulings'][str(q)]['ruling'] for q in want]
    return f'{len(todo)} ruled: ' + ', '.join(f'{r} {rul.count(r)}' for r in sorted(set(rul)))


def s_settle(ctx):
    run_py(ctx, 'settle', 'finalise.py', *ctx.unit_args())
    c = jload(ctx.out('final'))['counts']
    return ', '.join(f'{k} {v}' for k, v in sorted(c.items()))


def s_classify(ctx):
    tax = ctx.taxonomy()
    if not tax:
        raise StageError(f'no taxonomy at {taxonomy_path(ctx.cfg)}: run "python run.py taxonomy {ctx.slug}" first')
    _, subs = tax_index(tax)
    fin, qs = ctx.final(), ctx.keyed()

    def val(wd):
        d = read_out(wd)
        if not d or not isinstance(d.get('items'), list):
            return ['output.json missing or has no items list']
        got = {i.get('q_number'): i for i in d['items']}
        parents, _ = tax_index(tax)
        errs = [f'Q{q} missing' for q in qs if q not in got]
        errs += [f'Q{q} id {got[q].get("subtopic_id")!r} not in taxonomy' for q in qs
                 if q in got and got[q].get('subtopic_id') not in subs and got[q].get('subtopic_id') not in parents]
        return errs
    inputs = [{**item_view(ctx.items[q]), 'answer': f"{fin[str(q)]['answer']}. {ctx.items[q]['options'][fin[str(q)]['answer']]}"}
              for q in qs]
    for i in inputs:
        i.pop('diagram_files', None)
    wd = claude_worker(ctx, 'classify', 'classify.md', {'count': len(qs)},
                       {'input.json': {'unit': ctx.unit, 'items': inputs},
                        'taxonomy.json': ('copy', taxonomy_path(ctx.cfg))}, 'classify', val)
    d = read_out(wd)
    d.update(year=ctx.year, paper=ctx.paper, taxonomy_version=tax['version'])
    jsave(ctx.out('classified'), d)
    conf = [i['confidence'] for i in d['items']]
    return (', '.join(f'{c} {conf.count(c)}' for c in sorted(set(conf)))
            + f"; {len(d.get('taxonomy_findings', []))} taxonomy findings")


def teaching_inputs(ctx, qs):
    fin = ctx.final()
    v = jload(ctx.out('verdicts'))['verdicts']
    adj = jload(ctx.out('adjudication'), {}).get('rulings', {})
    cls = {i['q_number']: i for i in jload(ctx.out('classified'))['items']}
    _, subs = tax_index(ctx.taxonomy())
    rows = []
    for q in qs:
        k = str(q)
        why = {x: (v[k][x] or {}).get('reasoning') for x in ('codex', 'claude')}
        if k in adj:
            why['third_reviewer'] = adj[k]['reasoning']
        sid = cls[q]['subtopic_id']
        where = subs.get(sid)
        rows.append({**item_view(ctx.items[q], fin[k]['answer']), 'settled_by': why,
                     'subtopic_id': sid,
                     'subtopic': f'{where[0]["name"]} > {where[1]["name"]}: {where[1].get("covers", "")}' if where else sid})
    return rows


def s_teach(ctx):
    tax = ctx.taxonomy()
    _, subs = tax_index(tax)
    qs, fin = ctx.keyed(), ctx.final()
    answers = {q: fin[str(q)]['answer'] for q in qs}
    rows = {r['q_number']: r for r in teaching_inputs(ctx, qs)}
    parts = chunks_by_passage(qs, ctx.items, PIPE['teach_chunk'])

    def one(n, part):
        return claude_worker(
            ctx, f'teach-{n}', 'teach.md', {'count': len(part)},
            {'input.json': {'subject': ctx.cfg['subject'], 'unit': ctx.unit, 'items': [rows[q] for q in part]},
             'teaching.md': ('copy', STANDARD), 'taxonomy.json': ('copy', taxonomy_path(ctx.cfg))},
            'teach', lambda wd: teaching_errors(read_out(wd), part, answers, subs), add_dirs=[ctx.droot])

    with ThreadPoolExecutor(PIPE['parallel_workers']) as ex:
        wds = list(ex.map(lambda a: one(*a), enumerate(parts, 1)))
    items = {}
    for wd in wds:
        for i in read_out(wd)['items']:
            items[i['q_number']] = i
    path = ctx.out('w3')
    jsave(path, {'subject': ctx.cfg['subject'], 'year': ctx.year, 'paper': ctx.paper,
                 'taxonomy_version': tax['version'], 'items': [items[q] for q in qs]})
    ch = [q for q in qs if items[q].get('answer_challenge')]
    return f'{len(qs)} written in {len(parts)} part(s); answer challenges {ch or "none"}; style scan: {style_scan(path)}'


def run_review(ctx, stage, teaching_path, label):
    run_py(ctx, stage, 'review_codex.py', *ctx.unit_args(), '--teaching', teaching_path,
           '--label', label, '--parallel', '3')
    rev = jload(os.path.join(OUT, f'{ctx.slug}.review.{ctx.unit}.{label}.json'))
    want = [i['q_number'] for i in jload(teaching_path)['items']]
    miss = [q for q in want if str(q) not in rev['reviews']]
    if miss:
        ctx.log(f'  review {label} missing {miss}, one retry')
        sub = jload(teaching_path)
        sub['items'] = [i for i in sub['items'] if i['q_number'] in miss]
        tmp = os.path.join(ctx.work, f'review-{label}-retry.json')
        jsave(tmp, sub)
        run_py(ctx, stage, 'review_codex.py', *ctx.unit_args(), '--teaching', tmp, '--label', f'{label}-retry', '--parallel', '3')
        extra = jload(os.path.join(OUT, f'{ctx.slug}.review.{ctx.unit}.{label}-retry.json'))
        rev['reviews'].update(extra['reviews'])
        jsave(os.path.join(OUT, f'{ctx.slug}.review.{ctx.unit}.{label}.json'), rev)
        os.remove(os.path.join(OUT, f'{ctx.slug}.review.{ctx.unit}.{label}-retry.json'))
    return rev


def s_review(ctx):
    rev = run_review(ctx, 'review', ctx.out('w3'), 'a')
    fails = [q for q, r in rev['reviews'].items() if r['verdict'] == 'fail']
    facts = [q for q, r in rev['reviews'].items() if r['fact_error']]
    return f'{len(rev["reviews"])} reviewed, {len(fails)} fail, fact errors {sorted(map(int, facts)) or "none"}'


def fixer(ctx, name, draft_items, review, final_pass):
    tax = ctx.taxonomy()
    _, subs = tax_index(tax)
    fin = ctx.final()
    want = [i['q_number'] for i in draft_items]
    answers = {q: fin[str(q)]['answer'] for q in want}
    pass_note = ('' if not final_pass else
                 'This is the final pass. These items were fixed once and re-reviewed, and `review.json` holds that second review. '
                 'Nothing reviews your output after you, so accept only a change you are sure of, and prefer rejecting a finding '
                 'to rewriting an item that is correct. Output only the items in `draft.json`.')
    hold_note = ('' if not final_pass else
                 'If an item carries a fact error you cannot resolve with confidence, do not guess: add '
                 '`"hold": "<the unresolved question>"` to that item. A held item goes to a human instead of a student.')

    def val(wd):
        errs = teaching_errors(read_out(wd), want, answers, subs)
        log = read_out(wd, 'fixlog.json')
        if not log or not isinstance(log.get('entries'), list):
            errs.append('fixlog.json missing or has no entries list')
        return errs
    keyed_items = [item_view(ctx.items[q], fin[str(q)]['answer']) for q in ctx.keyed()]
    wd = claude_worker(ctx, name, 'fix.md', {'count': len(want), 'pass_note': pass_note, 'hold_note': hold_note},
                       {'draft.json': {'items': draft_items}, 'review.json': review,
                        'items.json': {'items': keyed_items},
                        'teaching.md': ('copy', STANDARD), 'taxonomy.json': ('copy', taxonomy_path(ctx.cfg))},
                       'fix', val, add_dirs=[ctx.droot])
    return read_out(wd)['items'], read_out(wd, 'fixlog.json')['entries']


def s_fix(ctx):
    w3 = jload(ctx.out('w3'))
    rev = jload(os.path.join(OUT, f'{ctx.slug}.review.{ctx.unit}.a.json'))
    items, log = fixer(ctx, 'fix', w3['items'], {'reviews': list(rev['reviews'].values())}, False)
    by = {i['q_number']: i for i in items}
    path = ctx.out('teaching')
    jsave(path, {**{k: w3[k] for k in ('subject', 'year', 'paper', 'taxonomy_version')},
                 'items': [by[i['q_number']] for i in w3['items']]})
    for e in log:
        e.setdefault('round', 1)
    jsave(ctx.out('fixlog'), {'entries': log})
    acc = sum(1 for e in log if e.get('decision') == 'accepted')
    return f'{acc} accepted, {len(log) - acc} rejected; style scan: {style_scan(path)}'


def changed_items(ctx):
    old = {i['q_number']: i for i in jload(ctx.out('w3'))['items']}
    new = jload(ctx.out('teaching'))['items']
    return [i for i in new if any(i.get(f) != old.get(i['q_number'], {}).get(f) for f in TEACH_FIELDS)]


def s_recheck(ctx):
    ch = changed_items(ctx)
    if not ch:
        return 'nothing changed'
    t = jload(ctx.out('teaching'))
    path = ctx.out('teaching-changed')
    jsave(path, {**{k: t[k] for k in ('subject', 'year', 'paper', 'taxonomy_version')}, 'items': ch})
    rev = run_review(ctx, 'recheck', path, 'rereview')
    fails = sorted(int(q) for q, r in rev['reviews'].items() if r['verdict'] == 'fail')
    return f'{len(ch)} changed items re-reviewed, {len(fails)} still fail {fails or ""}'


def s_final_fix(ctx):
    rpath = os.path.join(OUT, f'{ctx.slug}.review.{ctx.unit}.rereview.json')
    rev = jload(rpath)
    if not rev:
        return 'no re-review, nothing to rule on'
    fails = {int(q): r for q, r in rev['reviews'].items() if r['verdict'] == 'fail'}
    if not fails:
        return 'every changed item passed'
    t = jload(ctx.out('teaching'))
    by = {i['q_number']: i for i in t['items']}
    items, log = fixer(ctx, 'final-fix', [by[q] for q in sorted(fails)],
                       {'reviews': [fails[q] for q in sorted(fails)]}, True)
    held = []
    for i in items:
        if i.get('hold'):
            i['review_status'] = f"held: {i['hold']}"
            held.append(i['q_number'])
        by[i['q_number']] = i
    t['items'] = [by[i['q_number']] for i in t['items']]
    jsave(ctx.out('teaching'), t)
    fl = jload(ctx.out('fixlog'))
    fl['entries'] += [{**e, 'round': 2} for e in log]
    jsave(ctx.out('fixlog'), fl)
    return f'{len(fails)} ruled on the last pass, held {held or "none"}; style scan: {style_scan(ctx.out("teaching"))}'


# --- diagrams

def unit_diagrams(ctx):
    """{stem: {'rel': path under diagram root, 'questions': [q, ...]}} for this unit."""
    d = {}
    for q in sorted(ctx.items):
        for rel in ctx.items[q].get('diagram_files') or []:
            stem = os.path.splitext(os.path.basename(rel))[0]
            d.setdefault(stem, {'rel': rel, 'questions': []})['questions'].append(q)
    return d


def diagram_questions(ctx, qs):
    fin = ctx.final()
    return [{'q_number': q, 'stem': ctx.items[q]['stem'], 'options': ctx.items[q]['options'],
             'passage_text': ctx.items[q].get('passage_text'),
             'answer': (fin.get(str(q)) or {}).get('answer') or 'not settled'} for q in qs]


def need_author(ctx):
    rep = {r['source']: r for r in jload(os.path.join(ctx.ddir, 'redraw-report.json'), [])}
    th, out = PIPE['trace_min_fidelity'], {}
    for stem, d in unit_diagrams(ctx).items():
        if ctx.cfg.get('diagram_route') == 'author':
            # Schematic subjects: typed labels do not survive tracing (an "x"
            # came out as "r", an "M" as a broken glyph, a caption fragment
            # rode along), so every diagram is drawn by hand and the trace is
            # only a coordinate guide.
            out[stem] = ('the diagrams in this subject carry typed labels, which tracing damages, so every one is drawn '
                         'by hand; the trace is supplied only as a guide to positions')
            continue
        r = rep.get(os.path.basename(d['rel']))
        if not r or 'error' in r:
            out[stem] = 'the trace failed to run'
        elif r.get('route') == 'author' or r.get('paths', 0) > 150:   # reports older than the route field
            out[stem] = f"the trace needed {r['paths']} paths, the signature of stipple, photo grain or tonal fill that tracing cannot reproduce"
        elif r['recall'] < th or r['precision'] < th:
            out[stem] = f"the trace reproduced only {r['recall']:.0%} of the line work ({r['precision']:.0%} precision)"
    return out


def s_trace(ctx):
    ds = unit_diagrams(ctx)
    if not ds:
        return 'no diagrams'
    todo = [d for s, d in ds.items() if not os.path.exists(os.path.join(ctx.ddir, f'{s}.svg'))]
    for d in todo:
        try:
            run_py(ctx, 'trace', 'redraw.py', '--image', os.path.join(ctx.droot, d['rel']), '--out', ctx.ddir)
        except StageError as e:
            ctx.log(f'  trace failed for {d["rel"]}: {e}')
    na = need_author(ctx)
    return f'{len(ds)} diagrams, {len(todo)} traced now, {len(na)} need authoring {sorted(na) or ""}'


def alt_worker(ctx, name, stems, review=None):
    ds = unit_diagrams(ctx)
    fix_note = ('' if not review else
                '\n- `input.json` also carries, for each diagram, the current `alt` text and a `review` from a checker in another '
                'model family. Weigh each finding against the diagram: accept what is true and reject what is not. A proposed '
                'wording that names or describes an answer is wrong by rule, however it is argued. Write a fresh alt text for '
                'every diagram listed.')
    alts = jload(os.path.join(ctx.ddir, 'alt.json'), {})
    inputs = []
    for s in stems:
        x = {'stem': s, 'file': ds[s]['rel'], 'questions': diagram_questions(ctx, ds[s]['questions'])}
        if review:
            x.update(alt=alts.get(s, ''), review=review[s])
        inputs.append(x)

    def val(wd):
        d = read_out(wd)
        if not isinstance(d, dict):
            return ['output.json missing or not an object']
        errs = [f'{s} missing' for s in stems if not str(d.get(s, '')).strip()]
        errs += [f'{s} contains an em-dash' for s in stems if '—' in str(d.get(s, ''))]
        return errs
    wd = claude_worker(ctx, name, 'alt.md', {'count': len(stems), 'fix_note': fix_note},
                       {'input.json': {'diagrams': inputs}, 'teaching.md': ('copy', STANDARD)},
                       'alt', val, add_dirs=[ctx.droot])
    d = read_out(wd)
    alts.update({s: d[s] for s in stems})
    jsave(os.path.join(ctx.ddir, 'alt.json'), dict(sorted(alts.items())))


def s_alt(ctx):
    ds = unit_diagrams(ctx)
    if not ds:
        return 'no diagrams'
    alts = jload(os.path.join(ctx.ddir, 'alt.json'), {})
    todo = [s for s in ds if not alts.get(s)]
    if todo:
        alt_worker(ctx, 'alt', todo)
    return f'{len(todo)} written, {len(ds) - len(todo)} already had alt text'


def svg_errors(path):
    raw = open(path, encoding='utf8').read()
    if '<!DOCTYPE' in raw or '<!ENTITY' in raw:
        return ['svg must not declare a DOCTYPE or entities']
    try:
        root = ET.fromstring(raw)
    except Exception as e:
        return [f'output.svg does not parse: {e}']
    errs = []
    if not root.get('viewBox'):
        errs.append('svg has no viewBox')
    if root.get('width') or root.get('height'):
        errs.append('svg has a fixed width or height')
    for bad in ('<script', '<image', '<foreignObject', 'href="http'):
        if bad in raw:
            errs.append(f'svg contains {bad}')
    return errs


def author_worker(ctx, stem, why, review=None):
    ds, alts = unit_diagrams(ctx), jload(os.path.join(ctx.ddir, 'alt.json'), {})
    files = {'input.json': {'stem': stem, 'file': ds[stem]['rel'], 'why_rejected': why,
                            'questions': diagram_questions(ctx, ds[stem]['questions']), 'alt': alts.get(stem, '')}}
    tr = os.path.join(ctx.ddir, f'{stem}.svg')
    if os.path.exists(tr):
        files['trace.svg'] = ('copy', tr)
    fix_note = ''
    cur = os.path.join(ctx.ddir, f'{stem}.authored.svg')
    if review:
        fix_note = ('\n- `current.svg`: the redraw that shipped, and `input.json` field `review`: a checker in another model '
                    'family compared it with the original and failed it. Weigh the finding against the original, then write '
                    'a corrected drawing.')
        files['current.svg'] = ('copy', cur if os.path.exists(cur) else tr)
        files['input.json']['review'] = review
    wd = claude_worker(ctx, f'author-{stem}', 'author.md', {'fix_note': fix_note}, files, 'author',
                       lambda w: svg_errors(os.path.join(w, 'output.svg'))
                       if os.path.exists(os.path.join(w, 'output.svg')) else ['output.svg missing'],
                       add_dirs=[ctx.droot])
    shutil.copy(os.path.join(wd, 'output.svg'), cur)


def s_author(ctx):
    na = {s: w for s, w in need_author(ctx).items()
          if not os.path.exists(os.path.join(ctx.ddir, f'{s}.authored.svg'))}
    if not na:
        return 'nothing to author'
    with ThreadPoolExecutor(PIPE['parallel_workers']) as ex:
        list(ex.map(lambda kv: author_worker(ctx, *kv), na.items()))
    return f'authored {sorted(na)}'


def check_file(ctx, label):
    return os.path.join(ctx.ddir, f'check.{ctx.unit}.{label}.json')


def s_diagram_check(ctx):
    if not unit_diagrams(ctx):
        return 'no diagrams'
    run_py(ctx, 'diagram-check', 'check_diagrams.py', *ctx.unit_args(), '--label', 'a')
    res = jload(check_file(ctx, 'a'))
    bad = [s for s, r in res['results'].items() if r['drawing'] == 'fail' or r['alt'] == 'fail']
    if res['failures'] or res['no_svg']:
        raise StageError(f"diagram check incomplete: errors {[f['stem'] for f in res['failures']]}, no svg {res['no_svg']}")
    return f"{len(res['results'])} checked, failed {sorted(bad) or 'none'}"


def s_diagram_repair(ctx):
    res = jload(check_file(ctx, 'a'))
    if not res:
        return 'no diagrams'
    draw = {s: r for s, r in res['results'].items() if r['drawing'] == 'fail'}
    alt = {s: r for s, r in res['results'].items() if r['alt'] == 'fail'}
    if not draw and not alt:
        return 'nothing failed'
    if alt:
        alt_worker(ctx, 'alt-repair', sorted(alt),
                   review={s: {'checks': r['alt_checks'], 'notes': r['alt_notes']} for s, r in alt.items()})
    if draw:
        with ThreadPoolExecutor(PIPE['parallel_workers']) as ex:
            list(ex.map(lambda s: author_worker(ctx, s, 'the cross-family check failed the redraw',
                                                {'checks': draw[s]['drawing_checks'], 'notes': draw[s]['drawing_notes']}),
                        sorted(draw)))
    return f'alt rewritten {sorted(alt) or "none"}, redrawn {sorted(draw) or "none"}'


def s_diagram_recheck(ctx):
    res = jload(check_file(ctx, 'a'))
    if not res:
        return 'no diagrams'
    bad = sorted(s for s, r in res['results'].items() if r['drawing'] == 'fail' or r['alt'] == 'fail')
    status = jload(os.path.join(ctx.ddir, 'status.json'), {})
    for s in res['results']:
        status[s] = {'status': 'pass', 'unit': ctx.unit, 'checked': 'a'}
    if bad:
        run_py(ctx, 'diagram-recheck', 'check_diagrams.py', *ctx.unit_args(), '--stems', ','.join(bad), '--label', 'recheck')
        re2 = jload(check_file(ctx, 'recheck'))['results']
        for s in bad:
            r = re2.get(s)
            if r is None or r['drawing'] == 'fail':
                status[s] = {'status': 'held', 'unit': ctx.unit, 'checked': 'recheck',
                             'reason': (r or {}).get('drawing_notes') or 'the recheck did not run'}
            elif r['alt'] == 'fail':
                # A drawing that fails reaches every student, so it holds its
                # questions. An alt-text dispute that survives a weighed repair
                # is a disagreement between families; it ships, and goes to the
                # human review queue.
                status[s] = {'status': 'alt-disputed', 'unit': ctx.unit, 'checked': 'recheck',
                             'reason': r['alt_notes']}
            else:
                status[s] = {'status': 'pass', 'unit': ctx.unit, 'checked': 'recheck'}
    jsave(os.path.join(ctx.ddir, 'status.json'), dict(sorted(status.items())))
    held = [s for s in res['results'] if status[s]['status'] != 'pass']
    return f're-checked {bad or "none"}; not passing {held or "none"}'


def s_export(ctx):
    base = os.environ.get(PIPE['image_base_env'])
    args = [*ctx.unit_args(), '--topic-mode', PIPE['topic_mode'],
            '--image-base', base or 'https://PREVIEW-STORAGE-URL-NOT-SET']
    run_py(ctx, 'export', 'export_csv.py', *args)
    csv_path = os.path.join(OUT, f'{ctx.slug}.{ctx.unit}.import.csv')
    up = os.path.join(OUT, f'{ctx.slug}.{ctx.unit}.uploads.json')
    if not base:
        pcsv = os.path.join(OUT, f'{ctx.slug}.{ctx.unit}.PREVIEW.csv')
        os.replace(csv_path, pcsv)
        os.replace(up, os.path.join(OUT, f'{ctx.slug}.{ctx.unit}.PREVIEW.uploads.json'))
        csv_path = pcsv
    v = subprocess.run([PY, os.path.join(HERE, 'validate_csv.py'), csv_path], capture_output=True, text=True,
                       encoding='utf8', env=dict(os.environ, PYTHONIOENCODING='utf-8'))
    open(os.path.join(ctx.work, 'logs', 'validate.log'), 'w', encoding='utf8').write(v.stdout)
    if v.returncode != 0:
        raise StageError(f'the CSV fails an import rule: {v.stdout[-600:]}')
    held = jload(os.path.join(OUT, f'{ctx.slug}.{ctx.unit}.held.json'), [])
    gaps = [l.strip() for l in v.stdout.splitlines() if l.startswith('    ')]
    return (f"{'PREVIEW (no image base set)' if not base else 'importable'}: {os.path.basename(csv_path)}, "
            f"{len(held)} held, {len(gaps)} pre-flight flags; style scan: {style_scan(csv_path)}")


def s_preview(ctx):
    run_py(ctx, 'preview', 'preview.py', *ctx.unit_args(), '--questions', 'all', '--gate')
    return os.path.basename(os.path.join(OUT, f'{ctx.slug}.{ctx.unit}.preview.html'))


FUNCS = {'derive': s_derive, 'compare': s_compare, 'third': s_third, 'settle': s_settle,
         'classify': s_classify, 'teach': s_teach, 'review': s_review, 'fix': s_fix,
         'recheck': s_recheck, 'final-fix': s_final_fix, 'trace': s_trace, 'alt': s_alt,
         'author': s_author, 'diagram-check': s_diagram_check, 'diagram-repair': s_diagram_repair,
         'diagram-recheck': s_diagram_recheck, 'export': s_export, 'preview': s_preview}


# ---------------------------------------------------------------- units

def blocked_reason(cfg, unit):
    year, paper = parse_unit(unit)
    # A Test of Orals is paper 2 + its header's paper (extract.py): its year is
    # as sure as the objective paper printed above it.
    if cfg.get('oral_papers') and paper >= 3:
        paper -= 2
        unit = unit_name(year, paper)
    if paper > 1 and unit not in cfg.get('papers_confirmed', {}):
        return ('a second paper under one year header; its true year is unconfirmed (CON-08). '
                'Confirm it, then list it under papers_confirmed in the config')
    return None


def fallback_cost(ctx, stage):
    """Claude spend in a second-family stage where Codex was out (lanes.py)."""
    files = {'derive': [ctx.out('codex')],
             'review': [os.path.join(OUT, f'{ctx.slug}.review.{ctx.unit}.a.json')],
             'recheck': [os.path.join(OUT, f'{ctx.slug}.review.{ctx.unit}.rereview.json')],
             'diagram-check': [check_file(ctx, 'a')],
             'diagram-recheck': [check_file(ctx, 'recheck')]}.get(stage, [])
    return sum((jload(f) or {}).get('fallback_cost_usd', 0) for f in files)


def run_unit(slug, unit, st, start=None):
    ctx = Ctx(slug, unit, st)
    u = st['units'].setdefault(unit, {'status': 'pending', 'stages': {}})
    if start:
        drop = STAGES[STAGES.index(start):]
        for s in drop:
            u['stages'].pop(s, None)
    u['status'], u['error'] = 'running', ''
    save_state(st)
    for stage in STAGES:
        if u['stages'].get(stage, {}).get('status') == 'done':
            continue
        ctx.log(f'{stage} ...')
        ctx.cost = 0.0
        t0 = time.time()
        try:
            summary = FUNCS[stage](ctx)
        except StageError as e:
            u['status'], u['error'] = 'failed', f'{stage}: {e}'
            u['stages'][stage] = {'status': 'failed', 'at': now(), 'summary': str(e), 'cost_usd': round(ctx.cost, 2)}
            save_state(st)
            ctx.log(f'{stage} FAILED: {e}')
            return False
        ctx.cost += fallback_cost(ctx, stage)
        u['stages'][stage] = {'status': 'done', 'at': now(), 'summary': summary,
                              'seconds': int(time.time() - t0), 'cost_usd': round(ctx.cost, 2)}
        save_state(st)
        ctx.log(f'{stage} done: {summary}')
    u['held'] = jload(os.path.join(OUT, f'{slug}.{unit}.held.json'), [])
    u['status'] = 'done'
    save_state(st)
    return True


# ---------------------------------------------------------------- taxonomy (once per subject)

def live_topics(cfg):
    """Topic names for this subject in the live database, read with the public key."""
    import urllib.request, urllib.parse
    envp = os.path.normpath(os.path.join(HERE, PIPE['supabase_env_file']))
    env = {}
    for line in open(envp, encoding='utf8'):
        if '=' in line and not line.lstrip().startswith('#'):
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip().strip('"')
    url, key = env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
    h = {'apikey': key, 'Authorization': f'Bearer {key}'}
    get = lambda path: json.load(urllib.request.urlopen(urllib.request.Request(url + path, headers=h), timeout=30))
    subs = get('/rest/v1/subjects?select=id,name')
    want = cfg.get('db_subject') or cfg['subject']
    match = [s for s in subs if s['name'].strip().lower() == want.lower()]
    if not match:
        # A subject the app does not have yet has nothing to fold in. It must
        # be created in the database before its first import.
        print(f'  no live subject named {want!r}: nothing to fold in')
        return []
    rows = get(f"/rest/v1/topics?select=name,status&subject_id=eq.{match[0]['id']}&order=name")
    return sorted({r['name'] for r in rows})


def taxonomy_errors(t, legacy):
    if not isinstance(t, dict) or not isinstance(t.get('topics'), list):
        return ['output.json missing or has no topics list']
    errs, ids = [], []
    for tp in t['topics']:
        ids.append(tp.get('id'))
        if not tp.get('subtopics'):
            errs.append(f"topic {tp.get('id')} has no subtopics")
        for s in tp.get('subtopics', []):
            ids.append(s.get('id'))
            if not str(s.get('id', '')).startswith(f"{tp.get('id')}."):
                errs.append(f"subtopic {s.get('id')} does not start with its parent id {tp.get('id')}.")
            if not str(s.get('covers', '')).strip():
                errs.append(f"subtopic {s.get('id')} has no covers line")
    dup = sorted({i for i in ids if ids.count(i) > 1})
    if dup:
        errs.append(f'duplicate ids {dup}')
    m = t.get('legacy_to') or {}
    errs += [f'legacy topic {n!r} is not mapped' for n in legacy if n not in m]
    errs += [f'legacy topic {n!r} maps to unknown id {v!r}' for n, v in m.items() if v not in ids]
    if '—' in json.dumps(t, ensure_ascii=False):
        errs.append('contains an em-dash')
    return errs


def cmd_taxonomy(slug, rebuild=False):
    cfg = load_config(slug)
    path = taxonomy_path(cfg)
    if os.path.exists(path) and not rebuild:
        print(f'{os.path.relpath(path, HERE)} already exists; --rebuild to replace it')
        return 0
    syl = subject_syllabi(cfg)          # both exams and the scheme of work, from every config of the subject
    if not syl:
        print('no syllabi listed in any config for this subject. Add "syllabi": [{"exam": "UTME", "path": "../syllabi/<file>.txt"}]')
        return 1
    st = load_state(slug, cfg)
    ctx = Ctx(slug, 'taxonomy', st)
    legacy = live_topics(cfg)
    siblings = [f[:-5] for f in os.listdir(os.path.join(HERE, 'configs'))
                if load_config(f[:-5])['subject'] == cfg['subject']]
    sample = []
    for s in siblings:
        if not os.path.exists(os.path.join(OUT, f'{s}.items.jsonl')):
            continue
        y, p = units(s)[0]
        for it in load_items(s, y, p).values():
            sample.append({'exam': it['exam_brand'], 'year': y, 'q_number': it['q_number'],
                           'stem': it['stem'], 'options': it['options']})
    files = {'legacy-topics.json': legacy, 'sample-items.json': sample,
             'standard.md': ('copy', os.path.join(HERE, 'standards', 'taxonomy.md')),
             'reference.json': ('copy', os.path.join(HERE, 'taxonomies', 'biology.json'))}
    names = {'wassce': 'the WASSCE syllabus', 'utme': 'the UTME syllabus', 'sow': 'the SS1 to SS3 scheme of work'}
    for k, p in syl.items():
        files[f'syllabus-{k}.txt'] = ('copy', p)
    note = ', '.join(f'syllabus-{k}.txt is {names.get(k, k)}' for k in syl)
    ctx.log(f'taxonomy: {len(legacy)} legacy topics, {len(sample)} sample questions from {siblings}')
    wd = claude_worker(ctx, 'build', 'taxonomy.md', {'syllabus_note': note + '.'}, files, 'taxonomy',
                       lambda w: taxonomy_errors(read_out(w), legacy))
    jsave(path, read_out(wd))
    st['taxonomy_cost_usd'] = round(st.get('taxonomy_cost_usd', 0) + ctx.cost, 2)
    save_state(st)
    t = read_out(wd)
    print(f"{os.path.relpath(path, HERE)}: {len(t['topics'])} topics, "
          f"{sum(len(x['subtopics']) for x in t['topics'])} subtopics, {len(t['legacy_to'])} legacy folded")
    return 0


# ---------------------------------------------------------------- commands

def cmd_run(slug, unit=None, start=None):
    cfg = load_config(slug)
    st = load_state(slug, cfg)
    if not os.path.exists(os.path.join(OUT, f'{slug}.items.jsonl')):
        print(f'no extracted items: run "python extract.py --config configs/{slug}.json" first')
        return 1
    if not os.path.exists(taxonomy_path(cfg)):
        print(f'no taxonomy for {cfg["subject"]}: run "python run.py taxonomy {slug}" first')
        return 1
    all_units = [unit_name(y, p) for y, p in units(slug)]
    first = next(u for u in all_units if not blocked_reason(cfg, u))
    gate = st['gate']
    if unit:
        if gate['status'] != 'approved' and unit != first:
            print(f'gate not approved: only {first} may run before approval')
            return 1
        targets = [unit]
    elif gate['status'] != 'approved':
        if gate['status'] == 'awaiting':
            print(f'waiting at the gate after {gate["unit"]}: review, then "python run.py approve {slug}"')
            return 0
        targets = [first]
    else:
        targets = [u for u in all_units if st['units'].get(u, {}).get('status') != 'done']
    for u in targets:
        why = blocked_reason(cfg, u)
        if why:
            st['units'].setdefault(u, {'stages': {}})
            st['units'][u].update(status='blocked', error=why)
            save_state(st)
            print(f'{slug} {u}: blocked, {why}')
            continue
        ok = run_unit(slug, u, st, start if u == targets[0] else None)
        if not ok:
            print(f'{slug} {u}: stopped on a failure; fix it and run again to resume')
            return 1
        if gate['status'] != 'approved' and u == first:
            gate.update(status='awaiting', unit=u, at=now())
            save_state(st)
            print(f'\n{slug}: first paper {u} done. Waiting at the gate. Review '
                  f'out/{slug}.{u}.preview.html, then: python run.py approve {slug}')
            return 0
    return 0


def cmd_approve(slug, note):
    cfg = load_config(slug)
    st = load_state(slug, cfg)
    if st['gate']['status'] != 'awaiting':
        print(f"gate is {st['gate']['status']}, not awaiting approval")
        return 1
    st['gate'].update(status='approved', approved_at=now(), note=note)
    save_state(st)
    print(f'{slug}: gate approved. "python run.py run {slug}" now runs every remaining year.')
    return 0


EVIDENCE = {
    'derive': lambda c: os.path.exists(c.out('codex')) and os.path.exists(c.out('claude')),
    'compare': lambda c: os.path.exists(c.out('verdicts')),
    'third': lambda c: os.path.exists(c.out('adjudication')),
    'settle': lambda c: os.path.exists(c.out('final')),
    'classify': lambda c: os.path.exists(c.out('classified')),
    'teach': lambda c: os.path.exists(c.out('w3')),
    'review': lambda c: os.path.exists(os.path.join(OUT, f'{c.slug}.review.{c.unit}.a.json')),
    'fix': lambda c: os.path.exists(c.out('teaching')) and os.path.exists(c.out('fixlog')),
    'recheck': lambda c: os.path.exists(os.path.join(OUT, f'{c.slug}.review.{c.unit}.rereview.json')),
    'final-fix': lambda c: os.path.exists(os.path.join(OUT, f'{c.slug}.review.{c.unit}.rereview.json')),
    'trace': lambda c: all(os.path.exists(os.path.join(c.ddir, f'{s}.svg')) for s in unit_diagrams(c)),
    'alt': lambda c: all(jload(os.path.join(c.ddir, 'alt.json'), {}).get(s) for s in unit_diagrams(c)),
    'author': lambda c: all(os.path.exists(os.path.join(c.ddir, f'{s}.authored.svg')) for s in need_author(c)),
    'diagram-check': lambda c: os.path.exists(check_file(c, 'a')),
    'diagram-repair': lambda c: os.path.exists(check_file(c, 'a')),
    'diagram-recheck': lambda c: os.path.exists(os.path.join(c.ddir, 'status.json')),
}


def cmd_adopt(slug, unit, note):
    """Record stages whose outputs already exist, so a paper run by hand before
    the orchestrator existed is not run again. Stops at the first stage with no
    evidence; the next run starts there."""
    cfg = load_config(slug)
    st = load_state(slug, cfg)
    ctx = Ctx(slug, unit, st)
    u = st['units'].setdefault(unit, {'status': 'pending', 'stages': {}})
    for stage in STAGES:
        ev = EVIDENCE.get(stage)
        if not ev or not ev(ctx):
            print(f'  {stage}: no evidence, left for the next run')
            break
        u['stages'][stage] = {'status': 'done', 'at': now(), 'summary': f'adopted: {note}', 'cost_usd': 0}
        print(f'  {stage}: adopted')
    save_state(st)
    return 0


def subject_slugs(cfg):
    return sorted(f[:-5] for f in os.listdir(os.path.join(HERE, 'configs'))
                  if load_config(f[:-5])['subject'] == cfg['subject'])


def subject_syllabi(cfg):
    """Every syllabus and scheme of work listed by any config for this subject."""
    seen = {}
    for s in subject_slugs(cfg):
        for x in load_config(s).get('syllabi') or []:
            seen.setdefault(x['exam'].lower(), os.path.normpath(os.path.join(HERE, 'configs', x['path'])))
    return seen


def coverage_path(cfg):
    return os.path.join(HERE, 'taxonomies', f'{subject_key(cfg)}.coverage.json')


def stamp_taught_in(cfg):
    """Mark every topic and subtopic with where the scheme of work teaches it
    (SS1 T1 and so on), from the coverage map. Deterministic. It turns the
    top of the tree into the bird's-eye view in teaching order, and shows
    what the exams test that no scheme week teaches."""
    import re as _re
    cov, tax = jload(coverage_path(cfg)), jload(taxonomy_path(cfg))
    if not cov or not tax:
        return
    when = {}
    for i in cov['items']:
        m = _re.match(r'SS\s*(\d)\s*(?:T|Term\s*)(\d)', str(i.get('ref', '')), _re.I)
        if i.get('source') == 'sow' and i.get('subtopic_id') and m:
            for key in (i['subtopic_id'], i['subtopic_id'].split('.')[0]):
                when.setdefault(key, set()).add(f'SS{m.group(1)} T{m.group(2)}')
    for t in tax['topics']:
        t['taught_in'] = sorted(when.get(t['id'], []))
        for s in t['subtopics']:
            s['taught_in'] = sorted(when.get(s['id'], []))
    jsave(taxonomy_path(cfg), tax)


def cmd_coverage(slug):
    """Map every syllabus and scheme-of-work item onto the tree (standards/taxonomy.md, check 1)."""
    cfg = load_config(slug)
    syl = subject_syllabi(cfg)
    missing = [k for k in ('wassce', 'utme', 'sow') if k not in syl]
    if missing:
        print(f'{cfg["subject"]}: no {missing} source listed in any config; the standard needs all three')
        if len(missing) == 3:
            return 1
    st = load_state(slug, cfg)
    ctx = Ctx(slug, 'taxonomy', st)
    tax = jload(taxonomy_path(cfg))
    parents, subs = tax_index(tax)
    files = {'taxonomy.json': ('copy', taxonomy_path(cfg))}
    for k, p in syl.items():
        files[f'syllabus-{k}.txt'] = ('copy', p)
    note = ', '.join(f'syllabus-{k}.txt' for k in syl) + ' are the sources.'

    def val(wd):
        d = read_out(wd)
        if not d or not isinstance(d.get('items'), list) or not d['items']:
            return ['output.json missing or has no items']
        return [f"item {i.get('ref')} maps to unknown id {i.get('subtopic_id')}" for i in d['items']
                if i.get('subtopic_id') and i['subtopic_id'] not in subs and i['subtopic_id'] not in parents]
    wd = claude_worker(ctx, 'coverage', 'coverage.md', {'sources_note': note}, files, 'taxonomy', val)
    d = read_out(wd)
    d.update(taxonomy_version=tax.get('version'), sources={k: os.path.relpath(p, HERE) for k, p in syl.items()})
    jsave(coverage_path(cfg), d)
    st['taxonomy_cost_usd'] = round(st.get('taxonomy_cost_usd', 0) + ctx.cost, 2)
    save_state(st)
    from collections import Counter
    for k in syl:
        c = Counter(i['status'] for i in d['items'] if i['source'] == k)
        print(f"  {k:<7} covered {c.get('covered', 0):>3}  partial {c.get('partial', 0):>3}  missing {c.get('missing', 0):>3}")
    stamp_taught_in(cfg)
    print(f"  unmapped subtopics: {d.get('unmapped_subtopics') or 'none'}; cost ${round(ctx.cost, 2)}")
    return 0


def cmd_revise(slug):
    """Revise the tree once from its coverage map and placement tests, then re-test."""
    cfg = load_config(slug)
    cov = jload(coverage_path(cfg))
    tests = [t for t in (jload(os.path.join(OUT, f'{s}.matchtest.json')) for s in subject_slugs(cfg)) if t]
    if not cov or not tests:
        print('run coverage and matchtest first')
        return 1
    st = load_state(slug, cfg)
    ctx = Ctx(slug, 'taxonomy', st)
    try:
        legacy = live_topics(cfg)
    except StageError:
        legacy = []
    old = jload(taxonomy_path(cfg))

    def val(wd):
        t = read_out(wd)
        errs = taxonomy_errors(t, legacy)
        if not read_out(wd, 'changelog.json'):
            errs.append('changelog.json missing')
        return errs
    wd = claude_worker(ctx, 'revise', 'taxonomy-revise.md', {},
                       {'taxonomy.json': ('copy', taxonomy_path(cfg)), 'coverage.json': cov,
                        'matchtest.json': {'tests': tests}, 'legacy-topics.json': legacy,
                        'standard.md': ('copy', os.path.join(HERE, 'standards', 'taxonomy.md'))},
                       'taxonomy', val)
    new, log = read_out(wd), read_out(wd, 'changelog.json')
    jsave(os.path.join(HERE, 'taxonomies', f"{subject_key(cfg)}.changelog.{new.get('version')}.json"), log)
    jsave(taxonomy_path(cfg), new)
    st['taxonomy_cost_usd'] = round(st.get('taxonomy_cost_usd', 0) + ctx.cost, 2)
    save_state(st)
    from collections import Counter
    kinds = Counter(c['kind'] for c in log['changes'])
    n_old = sum(len(t['subtopics']) for t in old['topics'])
    n_new = sum(len(t['subtopics']) for t in new['topics'])
    print(f"{cfg['subject']} {old.get('version')} -> {new.get('version')}: {dict(kinds)}; "
          f"subtopics {n_old} -> {n_new}; {len(log.get('not_changed', []))} findings not acted on; cost ${round(ctx.cost, 2)}")
    return 0


def cmd_matchtest(slug, sample, seed=7):
    """Is placement reliable? Place a sample of questions from across the years
    twice, independently, on two different models that cannot see each other,
    and measure how often they agree. Agreement is evidence the tree's
    boundaries are clear enough to place by; each disagreement shows a boundary
    that is not. Runs on every question in the extraction, keyed or not,
    because placement does not depend on the answer."""
    import random
    cfg = load_config(slug)
    tax = jload(taxonomy_path(cfg))
    if not tax:
        print(f'no taxonomy for {cfg["subject"]}')
        return 1
    parents, subs = tax_index(tax)
    items = [json.loads(l) for l in open(os.path.join(OUT, f'{slug}.items.jsonl'), encoding='utf8')]
    items = [i for i in items if len(i['options']) >= 2 and not i.get('needs_human')]
    rng = random.Random(seed)
    by_year = {}
    for i in items:
        by_year.setdefault(i['year'], []).append(i)
    pick, years = [], sorted(by_year)
    while len(pick) < min(sample, len(items)):         # round-robin across years
        for y in years:
            if by_year[y] and len(pick) < sample:
                pick.append(by_year[y].pop(rng.randrange(len(by_year[y]))))
    for n, i in enumerate(pick, 1):
        i['_n'] = n
    rows = [{'q_number': i['_n'], 'stem': i['stem'], 'options': i['options'],
             'passage_text': i.get('passage_text'), 'answer': 'not needed for placement'} for i in pick]
    st = load_state(slug, cfg)
    ctx = Ctx(slug, 'taxonomy', st)
    ctx.work = os.path.join(HERE, 'work', slug, 'matchtest')
    os.makedirs(ctx.work, exist_ok=True)
    want = [r['q_number'] for r in rows]

    def val(wd):
        d = read_out(wd)
        if not d or not isinstance(d.get('items'), list):
            return ['output.json missing or has no items list']
        got = {x.get('q_number'): x for x in d['items']}
        return ([f'Q{q} missing' for q in want if q not in got]
                + [f'Q{q} id not in taxonomy' for q in want if q in got
                   and got[q].get('subtopic_id') not in subs and got[q].get('subtopic_id') not in parents])
    placed = {}
    for model in ('sonnet', 'opus'):
        PIPE['models']['classify'] = model
        wd = claude_worker(ctx, f'classify-{model}', 'classify.md', {'count': len(rows), 'unit': 'sample across years'},
                           {'input.json': {'unit': 'sample', 'items': rows},
                            'taxonomy.json': ('copy', taxonomy_path(cfg))}, 'classify', val)
        placed[model] = {x['q_number']: x for x in read_out(wd)['items']}
    parent = lambda sid: sid.split('.')[0]
    same_sub = [q for q in want if placed['sonnet'][q]['subtopic_id'] == placed['opus'][q]['subtopic_id']]
    same_top = [q for q in want if parent(placed['sonnet'][q]['subtopic_id']) == parent(placed['opus'][q]['subtopic_id'])]
    nofit = [q for q in want if 'nofit' in (placed['sonnet'][q].get('confidence'), placed['opus'][q].get('confidence'))]
    report = {'slug': slug, 'taxonomy_version': tax.get('version'), 'sample': len(want),
              'years': sorted({i['year'] for i in pick}), 'cost_usd': round(ctx.cost, 2),
              'agree_subtopic': len(same_sub), 'agree_topic': len(same_top), 'nofit': len(nofit),
              'disagreements': [{'year': pick[q - 1]['year'], 'q_number': pick[q - 1]['q_number'],
                                 'stem': pick[q - 1]['stem'][:160], 'sonnet': placed['sonnet'][q]['subtopic_id'],
                                 'opus': placed['opus'][q]['subtopic_id'],
                                 'notes': [placed[m][q].get('note', '') for m in ('sonnet', 'opus')]}
                                for q in want if q not in same_sub],
              'findings': {m: read_out(os.path.join(ctx.work, f'classify-{m}')).get('taxonomy_findings', [])
                           for m in placed}}
    jsave(os.path.join(OUT, f'{slug}.matchtest.json'), report)
    n = len(want)
    print(f"{slug}: {n} questions from {len(report['years'])} years, placed twice independently")
    print(f"  same subtopic {len(same_sub)}/{n} ({len(same_sub) / n:.0%}), same topic {len(same_top)}/{n} "
          f"({len(same_top) / n:.0%}), no fit {len(nofit)}; cost ${report['cost_usd']}")
    return 0


def cmd_replace(slug, unit):
    """Place a finished paper onto a revised tree without re-teaching it:
    re-run the classifier, move each teaching item to its new subtopic, and
    rebuild the export and the gate page. Teaching does not depend on the
    subtopic, so nothing else needs to change."""
    cfg = load_config(slug)
    st = load_state(slug, cfg)
    ctx = Ctx(slug, unit, st)
    summary = s_classify(ctx)
    cls = {i['q_number']: i['subtopic_id'] for i in jload(ctx.out('classified'))['items']}
    t = jload(ctx.out('teaching'))
    moved = 0
    for i in t['items']:
        if cls.get(i['q_number']) and cls[i['q_number']] != i.get('subtopic_id'):
            i['subtopic_id'] = cls[i['q_number']]
            moved += 1
    t['taxonomy_version'] = ctx.taxonomy().get('version')
    jsave(ctx.out('teaching'), t)
    print(f'{slug} {unit}: classify {summary}; {moved} of {len(t["items"])} moved; cost ${round(ctx.cost, 2)}')
    return run_unit(slug, unit, st, 'export') and 0


def cmd_status(slug=None):
    slugs = [slug] if slug else sorted(f[:-5] for f in os.listdir(os.path.join(HERE, 'configs')))
    for s in slugs:
        cfg = load_config(s)
        st = jload(state_path(s))
        tax = 'yes' if os.path.exists(taxonomy_path(cfg)) else 'no'
        n = len(units(s)) if os.path.exists(os.path.join(OUT, f'{s}.items.jsonl')) else 0
        if not st:
            print(f'{s:<18} taxonomy {tax:<3} papers {n:<3} not started')
            continue
        done = [u for u, x in st['units'].items() if x.get('status') == 'done']
        held = sum(len(x.get('held', [])) for x in st['units'].values())
        print(f"{s:<18} taxonomy {tax:<3} papers {len(done)}/{n} done, gate {st['gate']['status']}"
              f"{' after ' + st['gate']['unit'] if st['gate'].get('unit') else ''}, held {held}, spend ${st.get('cost_usd', 0)}")
        if slug:
            for u, x in sorted(st['units'].items(), reverse=True):
                print(f"  {u:<9} {x.get('status', ''):<8} {x.get('error', '')}")
                for stg in STAGES:
                    r = x.get('stages', {}).get(stg)
                    if r:
                        print(f"      {stg:<16} {r['status']:<6} {r.get('summary', '')[:110]}")
    return 0


def total_spend():
    return sum((jload(os.path.join(HERE, 'state', f)) or {}).get('cost_usd', 0)
               for f in os.listdir(os.path.join(HERE, 'state')) if f.endswith('.json'))


def cmd_runall(workers, budget, redo_tag):
    """Every subject, every paper, newest year first across subjects (D9).

    One paper per subject at a time, because a subject's state file has one
    writer. A first paper not yet re-run under `redo_tag` runs again from derive,
    so corrections and the Codex lane reach it. Stops starting new papers once
    the spend since launch passes the budget; papers already running finish.
    Progress is in out/runall.json; a stopped run resumes where it left off."""
    import threading
    slugs = sorted(f[:-5] for f in os.listdir(os.path.join(HERE, 'configs')) if f.endswith('.json'))
    jobs = []
    for slug in slugs:
        cfg = load_config(slug)
        st = load_state(slug, cfg)
        if st['gate']['status'] != 'approved':
            st['gate'].update(status='approved', approved_at=now(), note=f'lifted for every file by D9 ({redo_tag})')
            save_state(st)
        for y, p in units(slug):
            u = unit_name(y, p)
            if blocked_reason(cfg, u):
                continue
            rec = st['units'].get(u, {})
            if rec.get('status') == 'done' and rec.get('redone') != redo_tag:
                jobs.append({'slug': slug, 'unit': u, 'year': y, 'from': 'derive'})
            elif rec.get('status') != 'done':
                jobs.append({'slug': slug, 'unit': u, 'year': y, 'from': None})
    jobs.sort(key=lambda j: (-j['year'], j['slug'], j['unit']))
    # Spend is counted per finished paper, from that paper's own stage costs.
    # A re-run from derive deletes the old stage records, so a difference of
    # state totals would let money spent earlier offset money spent now.
    base, lock, active = total_spend(), threading.Lock(), set()
    spent = [0.0]
    prog_path = os.path.join(OUT, 'runall.json')
    prog = {'started': now(), 'budget_usd': budget, 'spend_before': round(base, 2), 'jobs': jobs}
    logdir = os.path.join(HERE, 'work', 'runall')
    os.makedirs(logdir, exist_ok=True)
    print(f'{len(jobs)} papers to run, {workers} at a time, budget ${budget} on top of ${base:.2f} already spent')

    def save():
        prog['spent_since_start'] = round(spent[0], 2)
        jsave(prog_path, prog)

    def next_job():
        with lock:
            if spent[0] >= budget:
                return None
            for j in jobs:
                if 'status' not in j and j['slug'] not in active:
                    j.update(status='running', started=now())
                    active.add(j['slug'])
                    save()
                    return j
            return None

    def worker():
        while True:
            j = next_job()
            if j is None:
                with lock:
                    if not any('status' not in x for x in jobs) or spent[0] >= budget:
                        return
                time.sleep(30)
                continue
            cmd = [sys.executable, os.path.join(HERE, 'run.py'), 'run', j['slug'], '--unit', j['unit']]
            if j['from']:
                cmd += ['--from', j['from']]
            with open(os.path.join(logdir, f"{j['slug']}.{j['unit']}.log"), 'a', encoding='utf8') as lf:
                rc = subprocess.call(cmd, cwd=HERE, stdout=lf, stderr=subprocess.STDOUT,
                                     env={**os.environ, 'PYTHONIOENCODING': 'utf8'})
            with lock:
                st = load_state(j['slug'], load_config(j['slug']))
                urec = st['units'].get(j['unit'], {})
                ok = rc == 0 and urec.get('status') == 'done'
                spent[0] += sum(x.get('cost_usd', 0) for x in urec.get('stages', {}).values())
                if ok:
                    urec['redone'] = redo_tag
                    save_state(st)
                j.update(status='done' if ok else 'failed', ended=now(), rc=rc)
                active.discard(j['slug'])
                save()
                print(f"[{now()}] {j['slug']} {j['unit']} {j['status']}  spent ${spent[0]:.2f}", flush=True)

    ts = [threading.Thread(target=worker) for _ in range(workers)]
    for t in ts:
        t.start()
    for t in ts:
        t.join()
    save()
    left = sum(1 for j in jobs if 'status' not in j)
    print(f"finished: {sum(j.get('status') == 'done' for j in jobs)} done, "
          f"{sum(j.get('status') == 'failed' for j in jobs)} failed, {left} not started; "
          f"spent ${spent[0]:.2f}")
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    p = sub.add_parser('status'); p.add_argument('slug', nargs='?')
    p = sub.add_parser('taxonomy'); p.add_argument('slug'); p.add_argument('--rebuild', action='store_true')
    p = sub.add_parser('run'); p.add_argument('slug'); p.add_argument('--unit'); p.add_argument('--from', dest='start', choices=STAGES)
    p = sub.add_parser('approve'); p.add_argument('slug'); p.add_argument('--note', default='')
    p = sub.add_parser('replace'); p.add_argument('slug'); p.add_argument('--unit', required=True)
    p = sub.add_parser('coverage'); p.add_argument('slug')
    p = sub.add_parser('revise'); p.add_argument('slug')
    p = sub.add_parser('matchtest'); p.add_argument('slug'); p.add_argument('--sample', type=int, default=80); p.add_argument('--seed', type=int, default=7)
    p = sub.add_parser('runall'); p.add_argument('--workers', type=int, default=6); p.add_argument('--budget', type=float, default=1400); p.add_argument('--redo-tag', default='D9')
    p = sub.add_parser('adopt'); p.add_argument('slug'); p.add_argument('--unit', required=True); p.add_argument('--note', required=True)
    a = ap.parse_args()
    if a.cmd == 'status':
        return cmd_status(a.slug)
    if a.cmd == 'taxonomy':
        return cmd_taxonomy(a.slug, a.rebuild)
    if a.cmd == 'run':
        return cmd_run(a.slug, a.unit, a.start)
    if a.cmd == 'approve':
        return cmd_approve(a.slug, a.note)
    if a.cmd == 'replace':
        return cmd_replace(a.slug, a.unit)
    if a.cmd == 'coverage':
        return cmd_coverage(a.slug)
    if a.cmd == 'revise':
        return cmd_revise(a.slug)
    if a.cmd == 'matchtest':
        return cmd_matchtest(a.slug, a.sample, a.seed)
    if a.cmd == 'runall':
        return cmd_runall(a.workers, a.budget, a.redo_tag)
    if a.cmd == 'adopt':
        return cmd_adopt(a.slug, a.unit, a.note)


if __name__ == '__main__':
    sys.exit(main())
