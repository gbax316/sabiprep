"""
R2 Teaching-quality reviewer, GPT-family lane (Codex CLI).

The teaching is written by Claude, so it is reviewed by a different model
family. A reviewer from the author's own family tends to share the author's
blind spots and pass what the author got wrong.

Reviews every item against the twelve-point R2 checklist in
standards/teaching.md, with a separate hard flag for any wrong fact, because a
wrong fact in a solution is the one defect that actively teaches a student
something false.

Usage:
    python review_codex.py --slug biology-waec --year 2025 --teaching out/biology-waec.w3.2025.json

Writes out/<slug>.review.<year>.<label>.json
"""

import argparse, json, os, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed

from common import load_config, load_items, taxonomy_path, unit_name

HERE = os.path.dirname(os.path.abspath(__file__))
SCHEMA = os.path.join(HERE, 'schemas', 'review-batch.schema.json')

PREAMBLE = """You are the quality reviewer for hints and worked solutions written for real {exam} {subject} past-paper questions. The students are Nigerian, aged about fourteen to sixteen, on tablets.

The answer to every question is already settled and correct. You are reviewing the TEACHING, not the answer.

Below is the teaching standard in full. Review every item against its "What R2 checks" list, numbered 1 to 12, and against everything else it says.

Be rigorous. A pass means you would put this in front of a student today.
- Set fact_error true if ANY statement of fact in a hint or the solution is wrong, however small. This matters most of all.
- Check that "Why not the others" covers every distractor and that each reason is actually true.
- Check hint 1 does not name or rule out options by name, and that hint 3 still leaves the choice to the student.
- Check the solution is plain text: no **, #, backticks, or bullet dashes. Check notation uses Unicode (H₂O, not H2O).
- Check there are no em-dashes and no exclamation marks.
- If an item has an answer_challenge field, the author doubted the settled answer. Say whether you agree in notes.
- For a fail, quote the exact words that fail the check in notes, so the finding can be verified against the text.
- Judge facts at syllabus depth. A claim correctly scoped to the syllabus passes, even where university biology would add detail. Flag an unscoped absolute or a simplification stated as universal truth (check 11).
- For a fail, give the exact corrected wording in fix, not a description of what to do.

THE STANDARD:
{standard}
"""


def block(it, t, answer, placement):
    lines = [f"--- Question {it['q_number']} ---"]
    if it.get('passage_text'):
        lines.append(f"Shared stem: {it['passage_text']}")
    lines.append(f"Question: {it['stem']}")
    for k in sorted(it['options']):
        lines.append(f"  {k}. {it['options'][k]}")
    lines.append(f"Settled answer: {answer}")
    if it.get('diagram_files'):
        lines.append(f"Diagram: {', '.join(os.path.basename(p) for p in it['diagram_files'])}")
    lines.append(f"placed on: {placement}")
    lines.append(f"difficulty: {t['difficulty']}")
    lines.append(f"hint1: {t['hint1']}")
    lines.append(f"hint2: {t['hint2']}")
    lines.append(f"hint3: {t['hint3']}")
    lines.append("solution:\n" + t['solution'])
    if t.get('answer_challenge'):
        lines.append(f"AUTHOR'S ANSWER CHALLENGE: {t['answer_challenge']}")
    return '\n'.join(lines)


def run_batch(batch, items, final, cfg, diagram_root, standard, placements):
    images, seen = [], set()
    for t in batch:
        for p in (items[t['q_number']].get('diagram_files', []) if diagram_root else []):
            full = os.path.join(diagram_root, p)
            if full not in seen and os.path.exists(full):
                seen.add(full)
                images.append(full)
    note = ('\nAttached diagrams, in order:\n' + '\n'.join(
        f"  {i + 1}. {os.path.basename(p)}" for i, p in enumerate(images)) + '\n') if images else ''
    prompt = (PREAMBLE.format(exam=cfg['exam'], subject=cfg['subject'], standard=standard) + note + '\n\n'
              + '\n\n'.join(block(items[t['q_number']], t, final[str(t['q_number'])]['answer'],
                                      placements(t)) for t in batch))

    with tempfile.NamedTemporaryFile('w+', suffix='.json', delete=False, encoding='utf8') as tf:
        last = tf.name
    cmd = ['codex', 'exec', '--skip-git-repo-check', '-s', 'read-only',
           '--output-schema', SCHEMA, '--output-last-message', last]
    for p in images:
        cmd += ['-i', p]
    try:
        subprocess.run(cmd, input=prompt, capture_output=True, text=True, encoding='utf8', timeout=900)
        data = json.loads(open(last, encoding='utf8').read().strip())
        return {'ok': True, 'reviews': {r['q_number']: r for r in data['reviews']}}
    except Exception as e:
        return {'ok': False, 'error': f'{type(e).__name__}: {e}'}
    finally:
        try:
            os.unlink(last)
        except OSError:
            pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--slug', required=True)
    ap.add_argument('--year', type=int, required=True)
    ap.add_argument('--paper', type=int, default=1)
    ap.add_argument('--teaching', required=True)
    ap.add_argument('--label', default='a')
    ap.add_argument('--batch', type=int, default=8)
    ap.add_argument('--parallel', type=int, default=3)
    a = ap.parse_args()

    cfg = load_config(a.slug)
    diagram_root = cfg['_diagram_root']
    out = os.path.join(HERE, 'out')
    tax = json.load(open(taxonomy_path(cfg), encoding='utf8'))
    where = {}
    for tp in tax['topics']:
        where[tp['id']] = f"{tp['id']} ({tp['name']}, a parent topic)"
        for s in tp['subtopics']:
            where[s['id']] = f"{s['id']} ({tp['name']} > {s['name']}): {s.get('covers', '')}"

    def placements(t):
        tid = t.get('subtopic_id') or t.get('topic_id') or ''
        return where.get(tid, f'{tid} (NOT IN THE TAXONOMY)')
    u = unit_name(a.year, a.paper)
    items = load_items(a.slug, a.year, a.paper)
    final = json.load(open(os.path.join(out, f'{a.slug}.final.{u}.json'), encoding='utf8'))['answers']
    teaching = json.load(open(a.teaching if os.path.isabs(a.teaching) else os.path.join(HERE, a.teaching), encoding='utf8'))['items']
    standard = open(os.path.join(HERE, 'standards', 'teaching.md'), encoding='utf8').read()
    run_cfg = {'subject': cfg['subject'], 'exam': next(iter(items.values()))['exam_brand']}

    batches = [teaching[i:i + a.batch] for i in range(0, len(teaching), a.batch)]
    results, failures = {}, []
    with ThreadPoolExecutor(max_workers=a.parallel) as ex:
        futs = {ex.submit(run_batch, b, items, final, run_cfg, diagram_root, standard, placements): b for b in batches}
        for fut in as_completed(futs):
            r, b = fut.result(), futs[fut]
            span = f"Q{b[0]['q_number']}-{b[-1]['q_number']}"
            if r['ok']:
                results.update(r['reviews'])
                print(f"  {span}: {len(r['reviews'])} reviewed", flush=True)
            else:
                failures.append({'span': span, **r})
                print(f"  {span}: FAILED {r['error']}", flush=True)

    path = os.path.join(out, f'{a.slug}.review.{u}.{a.label}.json')
    json.dump({'reviewer': 'codex', 'year': a.year, 'paper': a.paper,
               'reviews': {str(k): v for k, v in sorted(results.items())}, 'failures': failures},
              open(path, 'w', encoding='utf8'), indent=2, ensure_ascii=False)

    passed = sum(1 for r in results.values() if r['verdict'] == 'pass')
    facts = [q for q, r in results.items() if r['fact_error']]
    print(f"\n{len(results)}/{len(teaching)} reviewed: {passed} pass, {len(results) - passed} fail")
    print(f"fact errors: {sorted(facts) or 'none'}")
    for q, r in sorted(results.items()):
        if r['verdict'] == 'fail':
            print(f"  Q{q:<3} checks {r['failed_checks']}{'  FACT' if r['fact_error'] else ''}  {r['notes'][:110]}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
