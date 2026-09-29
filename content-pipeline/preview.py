"""
Sign-off preview: render finished questions the way the practice screen shows
them, so a human judges the product rather than a JSON file.

Dark surface, the diagram as it will ship, the options, three hints opened one
at a time, then the solution with its line breaks preserved exactly as the app
renders it (whitespace-pre-line, no markdown).

Usage:
    python preview.py --slug biology-waec --year 2025 --questions 2,4,29,31,43
    python preview.py --slug biology-waec --year 2025 --questions all
Writes out/<slug>.<year>.preview.html
"""

import argparse, html, json, os, re, sys

from common import load_items, taxonomy_path, unit_name

HERE = os.path.dirname(os.path.abspath(__file__))

CSS = """
:root{--bg:#020617;--card:#0f172a;--line:#1e293b;--ink:#e2e8f0;--mute:#94a3b8;--cyan:#22d3ee;--ok:#34d399;--violet:#a78bfa}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main{max-width:760px;margin:0 auto;padding:28px 16px 64px}
h1{font-size:22px;margin:0 0 4px}
.sub{color:var(--mute);margin:0 0 28px;font-size:14px}
.q{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px;margin:0 0 22px}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.chip{font-size:12px;padding:3px 10px;border-radius:999px;border:1px solid var(--line);color:var(--mute)}
.chip.n{color:var(--cyan);border-color:#155e75}
.stem-shared{color:var(--mute);font-size:14px;border-left:3px solid var(--line);padding-left:12px;margin:0 0 14px}
.fig{display:flex;justify-content:center;margin:6px 0 16px}
.fig svg{width:100%;max-width:420px;height:auto}
.qtext{font-size:17px;margin:0 0 14px}
.opts{list-style:none;padding:0;margin:0 0 16px;display:grid;gap:8px}
.opt{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border:1px solid var(--line);border-radius:12px;min-height:44px}
.opt b{color:var(--mute);min-width:18px}
.opt.right{border-color:#065f46;background:#022c22}
.opt.right b{color:var(--ok)}
details{border:1px solid var(--line);border-radius:12px;margin:0 0 8px;overflow:hidden}
summary{cursor:pointer;padding:12px 14px;min-height:44px;color:var(--violet);font-weight:600;list-style:none}
summary::-webkit-details-marker{display:none}
details[open] summary{border-bottom:1px solid var(--line)}
.body{padding:12px 14px;white-space:pre-line;font-size:15px}
.sol summary{color:var(--ok)}
.held{color:var(--mute);font-size:14px;border-top:1px solid var(--line);padding-top:18px;margin-top:8px}
.held li{margin-bottom:6px}
.gate{background:var(--card);border:1px solid #155e75;border-radius:16px;padding:18px 20px;margin:0 0 26px}
.gate h2{font-size:17px;margin:0 0 10px;color:var(--cyan)}
.gate h3{font-size:15px;margin:16px 0 6px}
.gate li{margin-bottom:6px;font-size:14px}
.tree{font-size:14px;margin:0;padding-left:18px}
.tree>li{margin:8px 0 2px;font-weight:600}
.tree ul{font-weight:400;padding-left:16px;margin:2px 0}
.tree .n{color:var(--cyan);font-variant-numeric:tabular-nums;margin-right:6px}
.tree .z{color:var(--mute)}
"""


def svg_for(ddir, stem):
    for name in (f'{stem}.authored.svg', f'{stem}.svg'):
        p = os.path.join(ddir, name)
        if os.path.exists(p):
            s = open(p, encoding='utf8').read()
            # Authoring notes live in the source SVG for maintainers; a
            # student's browser has no use for them.
            s = re.sub(r'<!--.*?-->', '', s, flags=re.S)
            return s[s.find('<svg'):]
    return ''


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--slug', required=True)
    ap.add_argument('--year', type=int, required=True)
    ap.add_argument('--paper', type=int, default=1)
    ap.add_argument('--questions', required=True)
    ap.add_argument('--gate', action='store_true',
                    help='add what a gate review needs: the topic tree with this paper counted onto it, the classifier findings, and the review queue')
    a = ap.parse_args()
    out = os.path.join(HERE, 'out')

    cfg = json.load(open(os.path.join(HERE, 'configs', f'{a.slug}.json'), encoding='utf8'))
    tax = json.load(open(taxonomy_path(cfg), encoding='utf8'))
    topic = {}
    for tp in tax['topics']:
        topic[tp['id']] = tp['name']
        for s in tp['subtopics']:
            topic[s['id']] = f"{tp['name']} › {s['name']}"
    u = unit_name(a.year, a.paper)
    items = load_items(a.slug, a.year, a.paper)
    final = json.load(open(os.path.join(out, f'{a.slug}.final.{u}.json'), encoding='utf8'))
    teach = {t['q_number']: t for t in json.load(open(os.path.join(out, f'{a.slug}.teaching.{u}.json'), encoding='utf8'))['items']}
    keyed = sorted(q for q in teach if final['answers'].get(str(q), {}).get('state') == 'keyed')
    want = keyed if a.questions == 'all' else [int(x) for x in a.questions.split(',')]
    exam = next(iter(items.values()))['exam_brand'] if items else ''
    ddir = os.path.join(out, 'diagrams', a.slug)
    e = html.escape

    cards = []
    for q in want:
        it, t, key = items[q], teach[q], final['answers'][str(q)]['answer']
        fig = ''
        if it['diagram_files']:
            stem = os.path.splitext(os.path.basename(it['diagram_files'][0]))[0]
            fig = f'<div class="fig">{svg_for(ddir, stem)}</div>'
        shared = f'<p class="stem-shared">{e(it["passage_text"])}</p>' if it['passage_text'] else ''
        opts = ''.join(
            f'<li class="opt{" right" if k == key else ""}"><b>{k}</b><span>{e(v)}</span></li>'
            for k, v in sorted(it['options'].items()))
        hints = ''.join(
            f'<details><summary>Hint {n}</summary><div class="body">{e(t[f"hint{n}"])}</div></details>'
            for n in (1, 2, 3))
        cards.append(f"""
<section class="q">
  <div class="chips"><span class="chip n">Question {q}</span><span class="chip">{e(topic[t.get('subtopic_id') or t['topic_id']])}</span><span class="chip">{e(t['difficulty'])}</span></div>
  {shared}{fig}
  <p class="qtext">{e(it['stem'])}</p>
  <ol class="opts">{opts}</ol>
  {hints}
  <details class="sol"><summary>Solution</summary><div class="body">{e(t['solution'])}</div></details>
</section>""")

    # The exporter's list is the complete one: it adds teaching and diagram
    # holds to the answer-key holds. Fall back to the key when it has not run.
    hpath = os.path.join(out, f'{a.slug}.{u}.held.json')
    if os.path.exists(hpath):
        held = [(h['q_number'], h['why'], h['detail']) for h in json.load(open(hpath, encoding='utf8'))]
    else:
        held = [(int(k), v['state'], v.get('reason', '')) for k, v in final['answers'].items() if v['state'] != 'keyed']
    held_html = ''.join(f'<li>Question {q}: {e(why)}. {e(str(detail)[:220])}</li>' for q, why, detail in sorted(held))
    counts = final['counts']

    gate = ''
    if a.gate:
        from collections import Counter
        placed = Counter(teach[q].get('subtopic_id') for q in keyed)
        rows = []
        # Topics in teaching order: where the scheme of work first teaches
        # them, SS1 to SS3, so the tree reads as the path through the subject.
        order = lambda tp: (tp.get('taught_in') or ['SS9 T9'])[0]
        for tp in sorted(tax['topics'], key=order):
            subs = ''.join(
                f'<li><span class="{"n" if placed[s["id"]] else "n z"}">{placed[s["id"]]}</span>{e(s["name"])}'
                f' <span class="z">{e(s["id"])}</span></li>' for s in tp['subtopics'])
            total = sum(placed[s['id']] for s in tp['subtopics'])
            when = ', '.join(tp.get('taught_in') or []) or 'not in the scheme of work'
            rows.append(f'<li><span class="{"n" if total else "n z"}">{total}</span>{e(tp["name"])} <span class="z">{e(when)}</span><ul>{subs}</ul></li>')
        cls_path = os.path.join(out, f'{a.slug}.classified.{u}.json')
        findings = json.load(open(cls_path, encoding='utf8')).get('taxonomy_findings', []) if os.path.exists(cls_path) else []
        find_html = ''.join(f'<li>{e(x.get("kind", ""))} at {e(x.get("where", ""))}: {e(x.get("detail", ""))}</li>' for x in findings)             or '<li>None. Every question found a clear place.</li>'
        spath = os.path.join(ddir, 'status.json')
        disputed = {s: v for s, v in (json.load(open(spath, encoding='utf8')).items() if os.path.exists(spath) else [])
                    if v.get('unit') == u and v.get('status') == 'alt-disputed'}
        disp_html = ''.join(f'<li>{e(s)}: {e(v.get("reason", "")[:260])}</li>' for s, v in disputed.items()) or '<li>None.</li>'
        n_sub = sum(len(t['subtopics']) for t in tax['topics'])
        gate = f"""
<section class="gate">
  <h2>What this gate needs from you</h2>
  <p>Approving this paper lets every other year of {e(cfg['subject'])} run without stopping. Check three things: the questions below read and teach well, the topic tree is the right grain, and the held list is reasonable.</p>
  <h3>Topic tree: {len(tax['topics'])} topics, {n_sub} subtopics (taxonomy {e(str(tax.get('version', '')))}). This paper's {len(keyed)} questions counted onto it.</h3>
  <ul class="tree">{''.join(rows)}</ul>
  <h3>What the classifier said about the tree</h3>
  <ul>{find_html}</ul>
  <h3>Alt text the two model families still disagree on (ships, queued for you)</h3>
  <ul>{disp_html}</ul>
  <h3>Held back from the import ({len(held)})</h3>
  <ul>{held_html or '<li>None.</li>'}</ul>
</section>"""

    doc = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(cfg['subject'])} {a.year} preview</title><style>{CSS}</style></head><body><main>
<h1>{e(cfg['subject'])}, {e(exam)} {a.year}</h1>
<p class="sub">{counts.get('keyed', 0)} of {sum(counts.values())} questions keyed. Showing {len(want)} as a student sees them in practice mode. The correct option is highlighted here for review; a student sees it only after answering.</p>
{gate}
{''.join(cards)}
<div class="held"><p>Held back from the import, with the reason on file:</p><ul>{held_html or '<li>None.</li>'}</ul></div>
</main></body></html>"""

    path = os.path.join(out, f'{a.slug}.{u}.preview.html')
    open(path, 'w', encoding='utf8').write(doc)
    print('wrote', path)
    return 0


if __name__ == '__main__':
    sys.exit(main())
