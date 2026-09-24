"""
W2 Answer deriver, GPT-family lane (Codex CLI).

One of two independent derivers. The other runs on Claude in a separate
context. Neither sees the other's output. Agreement across model families is
the evidence; agreement between two runs of the same model is much weaker,
because they share blind spots.

Usage:
    python derive_codex.py --slug biology-waec --year 2025
    python derive_codex.py --slug biology-waec --all --parallel 4

Writes out/<slug>.codex.<year>.json
"""

import argparse, json, os, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed

HERE = os.path.dirname(os.path.abspath(__file__))
SCHEMA = os.path.join(HERE, 'schemas', 'answers-batch.schema.json')

PREAMBLE = """You are answering {exam} {subject} objective questions from a real past paper.

For each question give the single correct option letter.

Rules:
- Answer from established {subject} knowledge at the level of a Nigerian secondary school syllabus, and from any diagram attached.
- Each attached image is named below with the questions it serves. Use the right image for the right question.
- If a question cannot be answered because text or a diagram is missing, garbled, or contradictory, set solvable to false, answer NONE, and name the defect in issue. Do not guess.
- If two options are genuinely defensible, say so in issue and set confidence to probable.
- "certain" means the answer follows unambiguously. Reserve it for that.
- reasoning: two to four sentences, why the answer is right and why the strongest distractor is wrong.
- Return one entry per question, in the order given, using its q_number.
"""


def load(slug, years):
    items = []
    with open(os.path.join(HERE, 'out', f'{slug}.items.jsonl'), encoding='utf8') as f:
        for line in f:
            it = json.loads(line)
            if it['year'] in years:
                items.append(it)
    return items


def block(it):
    lines = []
    if it.get('passage_text'):
        lines.append(f"[Shared stem] {it['passage_text']}")
    lines.append(f"Question {it['q_number']}: {it['stem']}")
    if it['options']:
        for k in sorted(it['options']):
            lines.append(f"{k}. {it['options'][k]}")
    else:
        lines.append("(No options could be read from the source for this question.)")
    if it.get('diagram_files'):
        lines.append(f"Diagram: {', '.join(os.path.basename(p) for p in it['diagram_files'])}")
    return '\n'.join(lines)


def run_batch(batch, cfg, diagram_root):
    images, seen = [], set()
    for it in batch:
        for p in it.get('diagram_files', []):
            full = os.path.join(diagram_root, p)
            if full not in seen and os.path.exists(full):
                seen.add(full)
                images.append(full)

    img_note = ''
    if images:
        img_note = '\nAttached images, in order:\n' + '\n'.join(
            f"  {i + 1}. {os.path.basename(p)}" for i, p in enumerate(images)) + '\n'

    prompt = (PREAMBLE.format(exam=cfg['exam'], subject=cfg['subject'])
              + img_note + '\n' + '\n\n'.join(block(it) for it in batch))

    cmd = ['codex', 'exec', '--skip-git-repo-check', '-s', 'read-only',
           '--output-schema', SCHEMA]
    for p in images:
        cmd += ['-i', p]

    with tempfile.NamedTemporaryFile('w+', suffix='.json', delete=False, encoding='utf8') as tf:
        last = tf.name
    cmd += ['--output-last-message', last]

    try:
        proc = subprocess.run(cmd, input=prompt, capture_output=True, text=True,
                              encoding='utf8', timeout=900)
        raw = open(last, encoding='utf8').read().strip()
        data = json.loads(raw)
        got = {a['q_number']: a for a in data['answers']}
        want = {it['q_number'] for it in batch}
        return {'ok': True, 'answers': got,
                'missing': sorted(want - set(got)),
                'extra': sorted(set(got) - want)}
    except Exception as e:
        return {'ok': False, 'error': f'{type(e).__name__}: {e}',
                'stderr_tail': (proc.stderr[-600:] if 'proc' in dir() else '')}
    finally:
        try:
            os.unlink(last)
        except OSError:
            pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--slug', required=True)
    ap.add_argument('--year', type=int)
    ap.add_argument('--all', action='store_true')
    ap.add_argument('--batch', type=int, default=10)
    ap.add_argument('--parallel', type=int, default=3)
    ap.add_argument('--questions', help='comma list; re-derive only these and merge into the existing file')
    a = ap.parse_args()
    only = {int(x) for x in a.questions.split(',')} if a.questions else None

    cfg_path = os.path.join(HERE, 'configs', f'{a.slug}.json')
    cfg = json.load(open(cfg_path, encoding='utf8'))
    diagram_root = os.path.normpath(os.path.join(os.path.dirname(cfg_path), cfg['diagram_root']))

    all_items = [json.loads(l) for l in open(os.path.join(HERE, 'out', f'{a.slug}.items.jsonl'), encoding='utf8')]
    years = sorted({it['year'] for it in all_items}) if a.all else [a.year]
    exam = all_items[0]['exam_brand'] if all_items else 'WASSCE'
    run_cfg = {'subject': cfg['subject'], 'exam': exam}

    for year in years:
        items = sorted([it for it in all_items if it['year'] == year
                        and (only is None or it['q_number'] in only)], key=lambda x: x['q_number'])
        batches = [items[i:i + a.batch] for i in range(0, len(items), a.batch)]
        results, failures = {}, []
        out = os.path.join(HERE, 'out', f'{a.slug}.codex.{year}.json')
        if only is not None and os.path.exists(out):
            prior = json.load(open(out, encoding='utf8'))
            results = {int(k): v for k, v in prior['answers'].items() if int(k) not in only}

        with ThreadPoolExecutor(max_workers=a.parallel) as ex:
            futs = {ex.submit(run_batch, b, run_cfg, diagram_root): b for b in batches}
            for fut in as_completed(futs):
                r = fut.result()
                b = futs[fut]
                span = f"Q{b[0]['q_number']}-{b[-1]['q_number']}"
                if r['ok']:
                    results.update(r['answers'])
                    flag = f" missing {r['missing']}" if r['missing'] else ''
                    print(f"  {year} {span}: {len(r['answers'])} answers{flag}", flush=True)
                else:
                    failures.append({'span': span, **r})
                    print(f"  {year} {span}: FAILED {r['error']}", flush=True)

        json.dump({'deriver': 'codex', 'year': year,
                   'answers': {str(k): v for k, v in sorted(results.items())},
                   'failures': failures}, open(out, 'w', encoding='utf8'),
                  indent=2, ensure_ascii=False)
        print(f"{year}: {len(results)}/{len(items)} derived -> {os.path.basename(out)}", flush=True)


if __name__ == '__main__':
    sys.exit(main())
