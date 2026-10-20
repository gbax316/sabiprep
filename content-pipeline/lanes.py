"""
The second-family lane: Codex when it can run, Claude when it cannot.

Every review and the second answer derivation run on Codex, because a reviewer
from the author's own family shares its blind spots (D6). When Codex is out of
usage, Orezi's standing instruction (2026-09-29) is that Claude finishes the
job rather than the run stopping. So a failed Codex call falls back to a
headless Claude worker on a different model from the author's, with the same
prompt, the same schema and the same isolation as every other worker.

The fallback is never silent. Every result carries the lane that produced it,
so a same-family review or a same-family answer agreement is visible in the
evidence and at the gate, and can be re-run on Codex later.
"""

import datetime, json, os, re, shutil, subprocess, tempfile, time, uuid

HERE = os.path.dirname(os.path.abspath(__file__))
PIPE = json.load(open(os.path.join(HERE, 'pipeline.json'), encoding='utf8'))


# Codex out of usage does not always fail fast: a call carrying a schema and
# images hung for its full timeout (15 minutes) each time, and a paper spent an
# hour in derive (2026-10-20). The first usage-limit message records when Codex
# is back; until then every call goes straight to the Claude lane.
OUT_UNTIL = os.path.join(HERE, 'work', '_lanes', 'codex-out-until.txt')


def codex_out():
    try:
        until = datetime.datetime.fromisoformat(open(OUT_UNTIL, encoding='utf8').read().strip())
    except (OSError, ValueError):
        return None
    return until if datetime.datetime.now() < until else None


def note_limit(text):
    """'try again at Oct 21st, 2026 12:02 AM' -> remember it (an hour on if unreadable)."""
    if 'usage limit' not in (text or ''):
        return
    m = re.search(r'try again at (\w+) (\d+)\w*, (\d{4}) (\d+):(\d+) ([AP]M)', text)
    try:
        mon, day, year, hh, mm, ap = m.groups()
        until = datetime.datetime.strptime(f'{mon} {day} {year} {hh}:{mm} {ap}', '%b %d %Y %I:%M %p')
    except Exception:
        until = datetime.datetime.now() + datetime.timedelta(hours=1)
    os.makedirs(os.path.dirname(OUT_UNTIL), exist_ok=True)
    open(OUT_UNTIL, 'w', encoding='utf8').write((until + datetime.timedelta(minutes=2)).isoformat(timespec='minutes'))


def _codex(prompt, schema_path, images, timeout):
    back = codex_out()
    if back:
        return None, f'Codex out of usage until {back:%H:%M}'
    with tempfile.NamedTemporaryFile('w+', suffix='.json', delete=False, encoding='utf8') as tf:
        last = tf.name
    cmd = ['codex', 'exec', '--skip-git-repo-check', '-s', 'read-only',
           '--output-schema', schema_path, '--output-last-message', last]
    for p in images:
        cmd += ['-i', p]
    proc = None
    try:
        proc = subprocess.run(cmd, input=prompt, capture_output=True, text=True,
                              encoding='utf8', timeout=timeout)
        return json.loads(open(last, encoding='utf8').read().strip(), strict=False), ''
    except Exception as e:
        why = (proc.stderr or '')[-400:] if proc else ''
        note_limit((proc.stderr or '') + (proc.stdout or '') if proc else '')
        return None, f'{type(e).__name__}: {e} {why}'.strip()
    finally:
        try:
            os.unlink(last)
        except OSError:
            pass


def _claude(prompt, schema_path, images, timeout, model):
    wd = os.path.join(HERE, 'work', '_lanes', uuid.uuid4().hex[:12])
    os.makedirs(wd)
    shutil.copy(schema_path, os.path.join(wd, 'schema.json'))
    names = []
    for i, p in enumerate(images, 1):
        n = f'{i:02d}_{os.path.basename(p)}'
        shutil.copy(p, os.path.join(wd, n))
        names.append(n)
    note = ''
    if names:
        note = ('\n\nThe attached images are files in your working directory, in this order. Open each with the '
                'Read tool and look at it before answering:\n' + '\n'.join(f'  {i}. {n}' for i, n in enumerate(names, 1)))
    text = (prompt + note + '\n\nWrite your answer to `output.json` in your working directory as JSON that '
            'matches `schema.json` exactly. Read the file back to confirm it parses.')
    open(os.path.join(wd, 'brief.md'), 'w', encoding='utf8').write(text)
    cmd = ['claude', '-p', '--restricted', '--safe-mode', '--strict-mcp-config', '--model', model,
           '--permission-mode', 'acceptEdits', '--output-format', 'json', '--no-session-persistence',
           '--allowedTools', 'Read', 'Write', 'Edit', 'Glob', 'Grep']
    try:
        p = subprocess.run(cmd, input=text, cwd=wd, capture_output=True, text=True,
                           encoding='utf8', timeout=timeout)
        open(os.path.join(wd, 'session.json'), 'w', encoding='utf8').write(p.stdout or '')
        cost = float(json.loads(p.stdout).get('total_cost_usd') or 0) if p.stdout else 0.0
        # strict=False: a model sometimes writes a raw line break inside a string,
        # which is harmless content but fails a strict parse (it failed a paper).
        return json.loads(open(os.path.join(wd, 'output.json'), encoding='utf8').read(), strict=False), cost, ''
    except Exception as e:
        return None, 0.0, f'{type(e).__name__}: {e}'


def second_family(prompt, schema_path, images=(), timeout=900):
    """Returns (data, lane) where lane says who produced it:
    {'family': 'codex'} or {'family': 'claude', 'model': ..., 'cost_usd': ..., 'codex_error': ...}.
    data is None only if both lanes failed."""
    data, err = _codex(prompt, schema_path, list(images), timeout)
    if data is not None:
        return data, {'family': 'codex'}
    model = PIPE.get('codex_fallback_model', 'sonnet')
    data, cost, err2 = _claude(prompt, schema_path, list(images), timeout, model)
    lane = {'family': 'claude', 'model': model, 'cost_usd': round(cost, 4),
            'codex_error': re.sub(r'\s+', ' ', err)[:200]}
    if data is None:
        lane['claude_error'] = err2
    return data, lane
