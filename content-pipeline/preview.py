"""
Sign-off preview: render finished questions the way the practice screen shows
them, so a human judges the product rather than a JSON file.

Dark surface, the diagram as it will ship, the options, three hints opened one
at a time, then the solution with its line breaks preserved exactly as the app
renders it (whitespace-pre-line, no markdown).

Usage:
    python preview.py --slug biology-waec --year 2025 --questions 2,4,29,31,43
Writes out/<slug>.<year>.preview.html
"""

import argparse, html, json, os, re, sys

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
    ap.add_argument('--questions', required=True)
    a = ap.parse_args()
    out = os.path.join(HERE, 'out')
    want = [int(x) for x in a.questions.split(',')]

    cfg = json.load(open(os.path.join(HERE, 'configs', f'{a.slug}.json'), encoding='utf8'))
    tax = json.load(open(os.path.join(HERE, 'taxonomies', f"{cfg['subject'].lower()}.json"), encoding='utf8'))
    topic = {}
    for tp in tax['topics']:
        topic[tp['id']] = tp['name']
        for s in tp['subtopics']:
            topic[s['id']] = f"{tp['name']} › {s['name']}"
    items = {i['q_number']: i for i in (json.loads(l) for l in open(os.path.join(out, f'{a.slug}.items.jsonl'), encoding='utf8'))
             if i['year'] == a.year}
    final = json.load(open(os.path.join(out, f'{a.slug}.final.{a.year}.json'), encoding='utf8'))
    teach = {t['q_number']: t for t in json.load(open(os.path.join(out, f'{a.slug}.teaching.{a.year}.json'), encoding='utf8'))['items']}
    ddir = os.path.join(out, 'diagrams')
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

    held = [(int(k), v) for k, v in final['answers'].items() if v['state'] != 'keyed']
    held_html = ''.join(f'<li>Question {q}: {e(v["state"])}. {e(v.get("reason", "")[:220])}</li>' for q, v in sorted(held))
    counts = final['counts']

    doc = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(cfg['subject'])} {a.year} preview</title><style>{CSS}</style></head><body><main>
<h1>{e(cfg['subject'])}, WASSCE {a.year}</h1>
<p class="sub">{counts.get('keyed', 0)} of {sum(counts.values())} questions keyed. Showing {len(want)} as a student sees them in practice mode. The correct option is highlighted here for review; a student sees it only after answering.</p>
{''.join(cards)}
<div class="held"><p>Held back from the import, with the reason on file:</p><ul>{held_html}</ul></div>
</main></body></html>"""

    path = os.path.join(out, f'{a.slug}.{a.year}.preview.html')
    open(path, 'w', encoding='utf8').write(doc)
    print('wrote', path)
    return 0


if __name__ == '__main__':
    sys.exit(main())
