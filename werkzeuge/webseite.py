import sys, os, json, html, re
from urllib.parse import quote
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rezepte import RECIPES

BASE = (sys.argv[2] if len(sys.argv) > 2 else "https://bufrgit.github.io/Kochbuch").rstrip("/") + "/"
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.makedirs(OUT, exist_ok=True)
e = html.escape

def minutes(meta):
    m = re.search(r"(\d+)\s*Minuten", meta); return int(m.group(1)) if m else None
def portions(meta):
    m = re.search(r"(\d+)\s*Portionen", meta); return int(m.group(1)) if m else 4
def page_url(r): return f"{BASE}{r['id']}/"
def bring_url(r):
    n = portions(r["meta"])
    return ("https://api.getbring.com/rest/bringrecipes/deeplink?url=" + quote(page_url(r), safe="")
            + f"&source=web&baseQuantity={n}&requestedQuantity={n}")

CSS = """
:root{--ink:#3b2f2a;--acc:#c8642a;--soft:#8a7a6e;--paper:#fbf6ee;--card:#fff;--line:#e6d9c6;--bring:#3a9b6e}
@media (prefers-color-scheme:dark){:root{--ink:#f1e7da;--acc:#e8894f;--soft:#b5a597;--paper:#1f1a17;--card:#2a2420;--line:#3d342e;--bring:#4fb585}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--paper);color:var(--ink);font:18px/1.55 Georgia,"Times New Roman",serif}
main{max-width:980px;margin:0 auto;padding:28px 18px 60px}
.kap{font:700 13px/1 -apple-system,system-ui,sans-serif;letter-spacing:.08em;color:var(--acc);text-transform:uppercase}
h1{font-size:clamp(30px,6vw,44px);line-height:1.1;margin:8px 0 6px}
.sub{font-style:italic;color:var(--soft);margin:0}.meta{font:15px -apple-system,system-ui,sans-serif;color:var(--soft);margin:8px 0 18px}
.actions{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 24px}
.btn{display:inline-flex;align-items:center;gap:8px;padding:12px 18px;border-radius:999px;border:1.5px solid var(--line);background:var(--card);color:var(--ink);font:600 16px -apple-system,system-ui,sans-serif;text-decoration:none;cursor:pointer}
.btn.bring{background:var(--bring);border-color:var(--bring);color:#fff}
.btn[aria-pressed=true]{background:var(--acc);border-color:var(--acc);color:#fff}
.grid{display:grid;grid-template-columns:minmax(240px,1fr) 2fr;gap:28px}
@media (max-width:720px){.grid{grid-template-columns:1fr}}
h2{font:700 13px/1 -apple-system,system-ui,sans-serif;letter-spacing:.08em;color:var(--acc);text-transform:uppercase;margin:0 0 12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px 20px}
ul.ing{list-style:none;margin:0;padding:0}ul.ing li{display:flex;gap:12px;padding:8px 0;border-bottom:1px solid var(--line)}ul.ing li:last-child{border:0}
ul.ing b{min-width:64px}
ol.steps{list-style:none;margin:0;padding:0;counter-reset:s}
ol.steps li{counter-increment:s;position:relative;padding:12px 12px 12px 52px;border-radius:12px;cursor:pointer;margin-bottom:6px;font-size:20px}
ol.steps li::before{content:counter(s);position:absolute;left:10px;top:12px;width:30px;height:30px;border-radius:50%;background:var(--acc);color:#fff;font:700 15px/30px -apple-system,system-ui,sans-serif;text-align:center}
ol.steps li.done{opacity:.4;text-decoration:line-through}
.note{border-left:3px solid var(--acc);padding-left:14px;font-style:italic;margin-top:20px}
.hint{font:14px -apple-system,system-ui,sans-serif;color:var(--soft);margin-top:8px}
a.back{font:15px -apple-system,system-ui,sans-serif;color:var(--soft);text-decoration:none}
.list a{display:block;padding:14px 0;border-bottom:1px solid var(--line);color:var(--ink);text-decoration:none;font-size:22px}
.list span{display:block;font:14px -apple-system,system-ui,sans-serif;color:var(--soft)}
"""
open(f"{OUT}/style.css", "w").write(CSS)
open(f"{OUT}/.nojekyll", "w").write("")

JS = """
<script>
document.querySelectorAll('ol.steps li').forEach(li=>li.addEventListener('click',()=>li.classList.toggle('done')));
const b=document.getElementById('wake');let lock=null;
if(!('wakeLock' in navigator)){b.hidden=true}
b.addEventListener('click',async()=>{try{if(lock){await lock.release();lock=null}else{lock=await navigator.wakeLock.request('screen');lock.addEventListener('release',()=>{lock=null;b.setAttribute('aria-pressed','false')})}b.setAttribute('aria-pressed',lock?'true':'false')}catch(e){}});
document.addEventListener('visibilitychange',async()=>{if(b.getAttribute('aria-pressed')==='true'&&!lock&&document.visibilityState==='visible'){try{lock=await navigator.wakeLock.request('screen')}catch(e){}}});
</script>"""

def head(title):
    return f"""<!doctype html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>{e(title)}</title>
<link rel="stylesheet" href="{'' if title=='Unser Familienkochbuch' else '../'}style.css">"""

for r in RECIPES:
    ings = [f"{a} {n}".strip() for a, n in r["ingredients"]]
    ld = {"@context": "https://schema.org", "@type": "Recipe", "name": r["title"], "description": r["subtitle"] or "",
          "recipeYield": str(portions(r["meta"])), "recipeCategory": r["kapitel"].title(),
          "recipeIngredient": ings,
          "recipeInstructions": [{"@type": "HowToStep", "text": s} for s in r["steps"]]}
    if minutes(r["meta"]): ld["totalTime"] = f"PT{minutes(r['meta'])}M"
    os.makedirs(f"{OUT}/{r['id']}", exist_ok=True)
    body = f"""{head(r['title'])}
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
</head><body><main>
<a class="back" href="../">← Alle Rezepte</a>
<p class="kap" style="margin-top:18px">{e(r['kapitel'])}</p>
<h1>{e(r['title'])}</h1><p class="sub">{e(r['subtitle'])}</p><p class="meta">{e(r['meta'])}</p>
<div class="actions">
<a class="btn bring" href="{e(bring_url(r))}">🛒 Zutaten zu Bring! hinzufügen</a>
<button class="btn" id="wake" aria-pressed="false">☀️ Bildschirm anlassen</button>
</div>
<div class="grid">
<section class="card"><h2>Zutaten</h2><ul class="ing">
{''.join(f'<li><b>{e(a)}</b><span>{e(n)}</span></li>' for a, n in r['ingredients'])}
</ul></section>
<section><h2>Zubereitung</h2><ol class="steps">
{''.join(f'<li>{e(s)}</li>' for s in r['steps'])}
</ol><p class="hint">Tipp: Erledigte Schritte antippen, dann werden sie ausgegraut.</p>
{f'<p class="note">{e(r["note"])}</p>' if r["note"] else ""}</section>
</div></main>{JS}</body></html>"""
    open(f"{OUT}/{r['id']}/index.html", "w").write(body)

items = "".join(f'<a href="{r["id"]}/">{e(r["title"])}<span>{e(r["kapitel"].title())} · {e(r["meta"])}</span></a>' for r in RECIPES)
open(f"{OUT}/index.html", "w").write(f"""{head('Unser Familienkochbuch')}</head><body><main>
<p class="kap">Familienkochbuch</p><h1>Unsere Rezepte</h1><div class="list">{items}</div></main></body></html>""")
print("\n".join(page_url(r) for r in RECIPES))
