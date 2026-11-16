"""Setzt das ganze Kochbuch im Landhaus-Design als HTML (-> PDF über werkzeuge/render_buch.js)."""
import glob, json, os, html
import design_vorschau as d, themen

ROOT = d.ROOT
e = html.escape
TITEL = "Unser Familienkochbuch"
UNTERTITEL = "Rezepte, die nach Zuhause schmecken"

OBER = [  # Reihenfolge, Farbe, Spruch
    ("Herzhaftes", "#b4572a", ["Pfanne & Co", "Aufläufe", "Pasta", "Suppen", "Fisch"], "Für hungrige Mägen"),
    ("Kleinigkeiten & Beilagen", "#5e7d4f", ["Snacks", "Salate, Dips & Saucen", "Beilagen"], "Für nebenbei und dazu"),
    ("Süßes", "#b0566a", ["Kuchen & Backen", "Desserts", "Weihnachtsbäckerei"], "Für die süßen Momente"),
    ("Getränke", "#3f86a8", ["Getränke"], "Zum Anstoßen"),
]
TOC_ZEILEN = 46
ZWEISEITIG = {"gebratene-nudeln-mit-knusprigem-haehnchen": (4, "Ausbackteig:"), "apfel-pudding-kuchen-mit-streuseln": (4, "Für die Streusel:")}  # Einträge pro Inhaltsverzeichnis-Seite (2 Spalten)


def rezepte():
    alle = [json.load(open(f, encoding="utf-8")) for f in glob.glob(f"{ROOT}/rezepte/*.json")]
    by = {}
    for r in alle:
        by.setdefault(r["kapitel"], []).append(r)
    for k in by:
        by[k].sort(key=lambda r: r["titel"].lower())
    return by


def motiv(kap):
    return themen.THEMEN.get(kap, {}).get("motiv", "")


BUCH_CSS = """
@page{size:210mm 297mm;margin:0}
/* DIN A4: A5-Layout mit 25 % Zoom auf etwas größerer Grundfläche (168 x 237,6 mm -> 210 x 297 mm) */
.page{width:168mm;height:237.6mm;zoom:1.25}.page:last-of-type{page-break-after:auto}
/* Bindungsrand (Ringbindung): rechte Seiten innen links, linke Seiten innen rechts */
.rz:nth-of-type(odd),.toc:nth-of-type(odd){padding-left:21mm}.rz:nth-of-type(even),.toc:nth-of-type(even){padding-right:21mm}
.rz:nth-of-type(even) .motiv{right:22mm}
.titel{background:#fbf5ea;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#3a2e26}
.titel .kranz{display:grid;grid-template-columns:repeat(4,16mm);gap:3mm 5mm;margin-bottom:12mm;opacity:.85}
.titel .kranz svg{width:16mm;height:16mm}
.titel h1{font:600 30pt/1.05 Fraunces,serif;margin:0}
.titel .ut{font:500 17pt Caveat,cursive;color:#b4572a;margin-top:5mm}
.titel .linie{width:30mm;border-top:1px dashed #d9c6a8;margin:9mm auto}
.titel .fuer{font:7.5pt Karla,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#7d6b5c}
.leer{background:#fbf5ea}
.widmung{background:#fbf5ea;display:flex;align-items:center;justify-content:center;text-align:center;font:500 16pt/1.35 Caveat,cursive;color:#7d6b5c;padding:30mm}
.toc{background:#fbf5ea;color:#3a2e26;font:7.7pt/1.2 Fraunces,serif;padding-top:11mm}
.toc h1{font:600 20pt Fraunces,serif;margin-bottom:3mm}
.toc{display:flex;flex-direction:column}.toc .sp{columns:2;column-gap:7mm;column-fill:auto;flex:1;min-height:0}
.toc .o{font:700 7pt Karla,sans-serif;letter-spacing:.16em;text-transform:uppercase;margin:2.5mm 0 .6mm;break-after:avoid}
.toc .u{font:700 10.5pt Caveat,cursive;margin:1.2mm 0 .3mm;break-after:avoid}
.toc .r{display:flex;gap:1.5mm;padding:.35mm 0}.toc .r{break-inside:avoid}.toc .r span:first-child{flex:1}
.toc .r span:last-child{color:#7d6b5c;font-variant-numeric:tabular-nums}
.trenn{display:flex;flex-direction:column;justify-content:center;padding:20mm 16mm;color:#fff}
.trenn .nr{color:#ffffffb0}
.trenn .k{font:700 8pt Karla,sans-serif;letter-spacing:.25em;text-transform:uppercase;opacity:.8}
.trenn h1{font:600 32pt/1.05 Fraunces,serif;margin:3mm 0 2mm}
.trenn .spruch{font:500 19pt Caveat,cursive;opacity:.9}
.trenn ul{margin-top:14mm}
.trenn li{display:flex;align-items:center;gap:4mm;padding:2.2mm 0;border-top:1px dashed #ffffff60;font:500 12pt Fraunces,serif}
.trenn li:last-child{border-bottom:1px dashed #ffffff60}
.trenn li span{margin-left:auto;font:8pt Karla,sans-serif;opacity:.8}
.trenn .mv{width:11mm;height:11mm;background:#fbf5ea;border-radius:50%;padding:1mm;flex:none}
.trenn .mv svg{width:100%;height:100%}
.landhaus .kap .ok{opacity:.65}
.page.landhaus .note{background:none!important;transform:none;box-shadow:none;font:inherit;font-style:italic;color:#5a4a3e;padding:3mm 0 0;margin-top:4mm;border-top:1px dashed #d9c6a8}
.hinweis{background:#fbf5ea;color:#3a2e26;font:10pt/1.5 Fraunces,serif;padding:40mm 22mm;text-align:center}
.hinweis h1{font:600 18pt Fraunces,serif;margin-bottom:10mm}.hinweis svg{width:30mm;height:30mm;margin-bottom:8mm}
.hinweis.kombi{padding-top:24mm}.hinweis .wd{font:500 16pt/1.35 Caveat,cursive;color:#7d6b5c;margin:0 0 22mm}.hinweis.kombi h1{font-size:13pt;margin-bottom:6mm}.hinweis.kombi svg{width:22mm;height:22mm;margin-bottom:5mm}.hinweis.kombi p:not(.wd):not(.hand){font-size:9pt}
.hinweis .hand{font:500 17pt Caveat,cursive;color:#b4572a;margin-top:8mm}
.landhaus .fort{font:500 12pt Caveat,cursive;color:#7d6b5c}
"""

FIT_JS = """<script>
function splitToc(){let pg=document.querySelector('.toc'),n=1;
 for(;;){const sp=pg.querySelector('.sp'),r=sp.getBoundingClientRect(),kids=[...sp.children];
  const i=kids.findIndex(k=>k.getBoundingClientRect().left>=r.right-2);if(i<0)break;
  const np=pg.cloneNode(false);np.innerHTML='<div class="sp"></div><div class="nr">'+(3+n)+'</div>';pg.after(np);
  kids.slice(i).forEach(k=>np.querySelector('.sp').appendChild(k));pg=np;n++;}
 console.log('TOC '+n);}
document.fonts.ready.then(()=>{splitToc();for(const pg of document.querySelectorAll('.page.rz')){
 const L=pg.querySelector('.left'),R=pg.querySelector('.right'),q=pg.querySelector('.qr');
 if(q)(R.scrollHeight<L.scrollHeight?R:L).appendChild(q);
 const limit=pg.getBoundingClientRect().bottom-pg.querySelector('.nr').offsetHeight-28;
 let fs=parseFloat(getComputedStyle(pg).fontSize);
 const low=()=>Math.max(L.getBoundingClientRect().bottom,R.getBoundingClientRect().bottom);
 while(low()>limit&&fs>9){fs-=.3;pg.style.fontSize=fs+'px';}
 if(fs<11)console.log("ZU LANG klein "+pg.dataset.id+" "+fs.toFixed(1));if(low()>limit){pg.classList.add('zu-lang');console.log('ZU LANG '+pg.dataset.id);}}
 document.body.dataset.fertig=1;});
</script>"""


def build(out, toc_pages=2):
    by = rezepte()
    # Seitenplan: 1 Titel, 2 Widmung, dann Inhaltsverzeichnis, dann je Überkapitel Trennseite + Rezepte
    toc_items = []
    for o, _, kaps, _ in OBER:
        toc_items.append(("o", o))
        for k in kaps:
            if len(kaps) > 1:
                toc_items.append(("u", k))
            toc_items += [("r", r) for r in by.get(k, [])]
    hinweis = toc_pages % 2 == 1  # ungerade -> Hinweisseite füllt auf, damit Trennseiten rechts beginnen
    nr = 3 + toc_pages + (1 if hinweis else 0)
    seiten_nr, plan = {}, []
    for o, farbe, kaps, spruch in OBER:
        if nr % 2 == 0:
            plan.append(("leer", None, nr)); nr += 1
        plan.append(("trenn", (o, farbe, kaps, spruch), nr)); nr += 1
        for k in kaps:
            for r in by.get(k, []):
                seiten_nr[r["id"]] = nr
                if r["id"] in ZWEISEITIG:
                    k2, zg = ZWEISEITIG[r["id"]] or ((len(r["schritte"]) + 1) // 2, None)
                    zi = next((i for i, z in enumerate(r["zutaten"]) if z["zutat"] == zg), len(r["zutaten"]))
                    a = dict(r, zutaten=r["zutaten"][:zi], schritte=r["schritte"][:k2], notiz=None, _ohne_qr=True)
                    b = dict(r, zutaten=r["zutaten"][zi:], schritte=r["schritte"][k2:], _start=k2, _fort=True)
                    plan.append(("rz", a, nr)); plan.append(("rz", b, nr + 1)); nr += 2
                else:
                    plan.append(("rz", r, nr)); nr += 1

    css_parts, pages = [], []
    pages.append(f'''<section class="page titel"><div class="kranz">{"".join(motiv(k) for k in ["Pfanne & Co","Suppen","Pasta","Fisch","Salate, Dips & Saucen","Kuchen & Backen","Desserts","Getränke"])}</div>
<h1>{e(TITEL)}</h1><div class="ut">{e(UNTERTITEL)}</div><div class="linie"></div><div class="fuer">{len(seiten_nr)} Rezepte</div></section>''')
    WIDMUNG = "Für dich – damit unsere Lieblingsrezepte nie verloren gehen."
    HINWEIS = ('<h1>So benutzt du dieses Buch</h1>' + d.qr_svg(d.BASE + "/") + '<p>Neben jedem Rezept findest du einen <b>QR-Code</b>. Einfach mit der Handy-Kamera scannen, dann öffnet sich das Rezept als Kochansicht: Der Bildschirm bleibt beim Kochen an, und mit einem Tipp landen alle Zutaten auf der <b>Bring!-Einkaufsliste</b>.</p><p class="hand">Viel Spaß beim Nachkochen!</p>')
    if hinweis:
        pages.append(f'<section class="page widmung">{WIDMUNG}</section>')
    else:  # Widmung und Hinweis teilen sich Seite 2
        pages.append(f'<section class="page hinweis kombi"><p class="wd">{WIDMUNG}</p>{HINWEIS}</section>')
    for t in range(1):
        chunk = toc_items
        rows = []
        for typ, x in chunk:
            if typ == "o":
                farbe = next(f for o, f, *_ in OBER if o == x)
                rows.append(f'<div class="o" style="color:{farbe}">{e(x)}</div>')
            elif typ == "u":
                rows.append(f'<div class="u" style="color:{themen.THEMEN.get(x, themen.STANDARD)["a"]}">{e(x)}</div>')
            else:
                rows.append(f'<div class="r"><span>{e(x["titel"])}</span><span>{seiten_nr[x["id"]]}</span></div>')
        h = "<h1>Inhalt</h1>" if t == 0 else ""
        pages.append(f'<section class="page toc">{h}<div class="sp">{"".join(rows)}</div><div class="nr">{3 + t}</div></section>')
    if hinweis:
        pages.append(f'<section class="page hinweis">{HINWEIS}<div class="nr">{3 + toc_pages}</div></section>')

    for typ, x, n in plan:
        if typ == "leer":
            pages.append('<section class="page leer"></section>')
        elif typ == "trenn":
            o, farbe, kaps, spruch = x
            li = "".join(f'<li><div class="mv">{motiv(k)}</div>{e(k)}<span>{len(by.get(k, []))} Rezepte</span></li>' for k in kaps) if len(kaps) > 1 else ""
            pages.append(f'<section class="page trenn" style="background:{farbe}"><div class="k">Kapitel {[a[0] for a in OBER].index(o) + 1}</div><h1>{e(o)}</h1><div class="spruch">{e(spruch)}</div><ul>{li}</ul><div class="nr">{n}</div></section>')
        else:
            r = x; sel = f'.s{n}'
            c, t = themen.css(r["kapitel"], sel); css_parts.append(c)
            p = d.page(r, n, "landhaus").replace('<section class="page landhaus', f'<section data-id="{r["id"]}" class="page rz landhaus s{n}', 1)
            kap = e(r["kapitel"]) if r["kapitel"] == r["oberkapitel"] else f'<span class="ok">{e(r["oberkapitel"])} · </span>{e(r["kapitel"])}'
            p = p.replace(f'<div class="kap">{e(r["kapitel"])}</div>', t["motiv"] + f'<div class="kap">{kap}</div>', 1)
            if r.get("_ohne_qr"):
                p = p.replace('<div class="qr">', '<div class="qr" style="display:none">', 1)
            if r.get("_fort"):
                if not r["zutaten"]: p = p.replace('<h2>Zutaten</h2>', '', 1)
                p = p.replace('<ol class="steps">', f'<ol class="steps" style="counter-reset:s {r["_start"]}">', 1)
                p = p.replace('<div class="meta">', '<div class="fort">Fortsetzung</div><div class="meta" style="display:none">', 1)
            pages.append(p)

    name, font, css = d.STYLES["landhaus"]
    doc = (f'<!doctype html><html lang="de"><head><meta charset="utf-8"><link rel="stylesheet" href="{font}">'
           f'<style>{d.COMMON}{css}{BUCH_CSS}{"".join(css_parts)}</style></head><body>{"".join(pages)}{FIT_JS}</body></html>')
    open(out, "w", encoding="utf-8").write(doc)
    print(out, len(pages), "Seiten")


if __name__ == "__main__":
    import sys, subprocess
    out = f"{ROOT}/design/buch.html"; pdf = sys.argv[1] if len(sys.argv) > 1 else f"{ROOT}/design/buch.pdf"
    n = 2
    for _ in range(3):
        build(out, n)
        res = subprocess.run(["node", f"{ROOT}/werkzeuge/render_buch.js", out, pdf], capture_output=True, text=True)
        print(res.stdout.strip(), res.stderr.strip()[-500:])
        got = int(next(l for l in res.stdout.splitlines() if l.startswith("TOC")).split()[1])
        if got == n: break
        n = got
