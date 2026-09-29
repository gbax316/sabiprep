"""
The review batch as a page Orezi works through, one decision per question.

Reads out/review-queue.json (review_queue.py). Groups questions by what is
wrong with them, shows each as a student would see it with the original
diagram beside the redraw, and offers the decisions that fit the reason. The
choices are kept in the browser as they are made, and "Save decisions" writes
them to a JSON file that goes back into the pipeline (content-pipeline/
decisions/), where each decision is applied and logged.

Usage:
    python review_page.py                      every queued question
    python review_page.py --held-only --slug physics-waec
Writes out/review-batch.html
"""

import argparse, base64, html, json, os, re, sys

from common import HERE, OUT, load_config

KIND_TITLE = {
    'key': 'The answer is not settled',
    'source': 'The question did not come through cleanly',
    'diagram': 'A diagram is missing or failed its check',
    'teaching': 'The teaching was held, or its author doubts the key',
    'alt': 'The two model families disagree on the alt text (ships)',
    'placement': 'The author thinks it sits on the wrong subtopic (ships)',
    'same-family': 'Keyed while Codex was out, on two Claude models (ships)',
}
ACTIONS = {
    'key': ['Accept a key (give the letter)', 'Drop the question', 'Fix the text, then re-run'],
    'source': ['Fix the text (write it in the note)', 'Drop the question', 'Ask Chidera for the page'],
    'diagram': ['Ask Chidera for the diagram', 'Redraw it (say what is wrong)', 'Drop the question'],
    'teaching': ['Accept the key as it stands', 'Change the key (give the letter)', 'Drop the question'],
    'alt': ['Keep the current alt text', 'Use the reviewer wording', 'Rewrite it (in the note)'],
    'placement': ['Keep the placement', 'Move it (give the subtopic in the note)'],
    'same-family': ['Fine as it is', 'Re-derive on Codex when it is back'],
}
CSS = """
:root{--bg:#020617;--card:#0f172a;--line:#1e293b;--ink:#e2e8f0;--mute:#94a3b8;--cyan:#22d3ee;--ok:#34d399;--warn:#fbbf24;--violet:#a78bfa}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main{max-width:980px;margin:0 auto;padding:24px 16px 80px}h1{font-size:22px;margin:0 0 4px}h2{font-size:18px;margin:34px 0 10px;color:var(--cyan)}
.sub{color:var(--mute);margin:0 0 18px}.bar{position:sticky;top:0;background:var(--bg);padding:10px 0;display:flex;gap:10px;align-items:center;flex-wrap:wrap;border-bottom:1px solid var(--line);z-index:2}
button,select,input,textarea{font:inherit;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:10px;padding:8px 12px;min-height:40px}
button{cursor:pointer;border-color:#155e75}.q{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;margin:0 0 14px}
.q.done{border-color:#065f46}.meta{color:var(--mute);font-size:13px;margin-bottom:8px}.why{border-left:3px solid var(--warn);padding:4px 10px;margin:8px 0;font-size:14px}
.shared{color:var(--mute);font-size:14px;border-left:3px solid var(--line);padding-left:10px;margin:0 0 10px;white-space:pre-line}
.opts{list-style:none;padding:0;margin:8px 0;display:grid;gap:6px}.opts li{border:1px solid var(--line);border-radius:10px;padding:8px 10px}.opts b{color:var(--mute);margin-right:8px}
.figs{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;margin:10px 0}.figs figure{margin:0;background:#fff;border-radius:10px;padding:6px}
.figs figure.dark{background:#020617;border:1px solid var(--line)}.figs img,.figs svg{width:100%;height:auto;max-height:360px;object-fit:contain}
figcaption{color:#475569;font-size:12px;text-align:center}.figs figure.dark figcaption{color:var(--mute)}
.der{font-size:13px;color:var(--mute);margin:6px 0}.decide{display:grid;grid-template-columns:1fr;gap:8px;margin-top:10px}
@media(min-width:720px){.decide{grid-template-columns:320px 1fr}}
"""


def b64(path):
    ext = os.path.splitext(path)[1].lower().lstrip('.')
    mime = {'jpg': 'jpeg'}.get(ext, ext)
    return f'data:image/{mime};base64,' + base64.b64encode(open(path, 'rb').read()).decode()


def svg_inline(slug, stem):
    d = os.path.join(OUT, 'diagrams', slug)
    for n in (f'{stem}.authored.svg', f'{stem}.svg'):
        p = os.path.join(d, n)
        if os.path.exists(p):
            s = re.sub(r'<!--.*?-->', '', open(p, encoding='utf8').read(), flags=re.S)
            return s[s.find('<svg'):]
    return ''


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--slug')
    ap.add_argument('--held-only', action='store_true')
    a = ap.parse_args()
    rows = json.load(open(os.path.join(OUT, 'review-queue.json'), encoding='utf8'))['items']
    rows = [r for r in rows if (not a.slug or r['slug'] == a.slug) and (r['held'] or not a.held_only)]
    e = html.escape
    groups = {}
    for r in rows:
        groups.setdefault(r['reasons'][0]['kind'], []).append(r)
    body = []
    for kind in KIND_TITLE:
        if kind not in groups:
            continue
        body.append(f'<h2>{e(KIND_TITLE[kind])} ({len(groups[kind])})</h2>')
        for r in groups[kind]:
            cfg = load_config(r['slug'])
            figs = ''
            for rel in r['diagram_files']:
                stem = os.path.splitext(os.path.basename(rel))[0]
                orig = os.path.join(cfg['_diagram_root'] or '', rel)
                if os.path.exists(orig):
                    figs += f'<figure><img alt="original {e(stem)}" src="{b64(orig)}"><figcaption>Original, {e(stem)}</figcaption></figure>'
                sv = svg_inline(r['slug'], stem)
                if sv:
                    figs += f'<figure class="dark">{sv}<figcaption>Redraw as the app shows it</figcaption></figure>'
            shared = f'<p class="shared">{e(r["passage_text"])}</p>' if r.get('passage_text') else ''
            opts = ''.join(f'<li><b>{k}</b>{e(v)}</li>' for k, v in sorted(r['options'].items())) or '<li>No options came through.</li>'
            why = ''.join(f'<div class="why"><b>{e(x["kind"])}</b>: {e(x["detail"][:600])}</div>' for x in r['reasons'])
            der = ''.join(f'<div class="der">{e(n)}: {e(str(d.get("answer")))} ({e(str(d.get("confidence")))}). '
                          f'{e((d.get("issue") or d.get("reasoning") or "")[:300])}</div>' for n, d in r.get('derivers', {}).items())
            acts = ''.join(f'<option>{e(x)}</option>' for x in ACTIONS.get(kind, []))
            body.append(f'''<section class="q" data-id="{e(r["id"])}">
<div class="meta">{e(r["subject"])}, {e(r["exam"])} {e(r["unit"])}, question {r["q_number"]}{" &middot; not yet run" if not r["processed"] else ""}{" &middot; held from the import" if r["held"] else " &middot; ships"}</div>
{shared}<p>{e(r["stem"])}</p><ol class="opts">{opts}</ol>{f'<div class="figs">{figs}</div>' if figs else ''}
{why}{der}
<div class="decide"><select><option value="">Decide...</option>{acts}<option>Something else (in the note)</option></select>
<textarea rows="2" placeholder="Letter, corrected text, or what to do"></textarea></div></section>''')
    doc = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Review batch</title><style>{CSS}</style></head><body><main>
<h1>Questions the system could not confirm</h1>
<p class="sub">{len(rows)} questions, {sum(r["held"] for r in rows)} held from the import until decided. Each is shown as a student would see it. Choose what to do; your choices stay in this browser until you save them.</p>
<div class="bar"><button id="save">Save decisions</button><span id="count" class="sub"></span></div>
{''.join(body)}
</main><script>
const KEY='sabiprep-review-'+document.title;
let saved={{}};try{{saved=JSON.parse(localStorage.getItem(KEY)||'{{}}')}}catch(e){{}}
const cards=[...document.querySelectorAll('.q')];
function count(){{const n=cards.filter(c=>c.classList.contains('done')).length;document.getElementById('count').textContent=n+' of '+cards.length+' decided'}}
cards.forEach(c=>{{const id=c.dataset.id,s=c.querySelector('select'),t=c.querySelector('textarea');
 if(saved[id]){{s.value=saved[id].action||'';t.value=saved[id].note||'';c.classList.toggle('done',!!s.value)}}
 const up=()=>{{saved[id]={{action:s.value,note:t.value,at:new Date().toISOString()}};c.classList.toggle('done',!!s.value);
  try{{localStorage.setItem(KEY,JSON.stringify(saved))}}catch(e){{}};count()}};
 s.addEventListener('change',up);t.addEventListener('input',up)}});
count();
document.getElementById('save').onclick=()=>{{const out=Object.entries(saved).filter(([k,v])=>v.action).map(([id,v])=>({{id,...v}}));
 const b=new Blob([JSON.stringify({{decisions:out}},null,1)],{{type:'application/json'}});const a=document.createElement('a');
 a.href=URL.createObjectURL(b);a.download='review-decisions.json';a.click()}};
</script></body></html>'''
    path = os.path.join(OUT, 'review-batch.html')
    open(path, 'w', encoding='utf8').write(doc)
    print(f'wrote {path}: {len(rows)} questions, {os.path.getsize(path) // 1024} KB')
    return 0


if __name__ == '__main__':
    sys.exit(main())
