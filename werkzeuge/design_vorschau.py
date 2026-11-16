"""Erzeugt Design-Varianten (HTML -> A5-PDF + PNG-Vorschau) für ausgewählte Rezepte."""
import json, os, sys, html
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderSVG

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://bufrgit.github.io/Kochbuch"
e = html.escape

def qr_svg(url, color="#000"):
    w = QrCodeWidget(url); w.barLevel = "L"
    b = w.getBounds(); s = 100
    d = Drawing(s, s, transform=[s/(b[2]-b[0]), 0, 0, s/(b[3]-b[1]), 0, 0]); d.add(w)
    svg = renderSVG.drawToString(d)
    return svg[svg.find("<svg"):]

def load(i): return json.load(open(f"{ROOT}/rezepte/{i}.json", encoding="utf-8"))

def zutaten(r):
    out = []
    for z in r["zutaten"]:
        if not z["menge"] and z["zutat"].endswith(":"):
            out.append(f'<li class="grp">{e(z["zutat"][:-1])}</li>')
        else:
            out.append(f'<li><span class="m">{e(z["menge"])}</span><span class="n">{e(z["zutat"])}</span></li>')
    return "\n".join(out)

def meta(r):
    p = r["portionen"]; p = f"{p} Portionen" if isinstance(p, int) or (p and str(p).isdigit()) else (p or "")
    return [x for x in [p, r.get("zeit")] + r.get("merkmale", []) if x]

def page(r, nr, variant):
    url = f"{BASE}/{r['id']}/"
    steps = "\n".join(f"<li>{e(s.replace(' (von mir ergänzt)', ''))}</li>" for s in r["schritte"])
    note = f'<div class="note">{e(r["notiz"])}</div>' if r.get("notiz") else ""
    sub = f'<div class="sub">{e(r["untertitel"])}</div>' if r.get("untertitel") else ""
    m = "".join(f"<span>{e(x)}</span>" for x in meta(r))
    return f'''<section class="page {variant}{' dicht' if len(r['zutaten'])>15 else ''}">
  <div class="kap">{e(r["kapitel"])}</div>
  <h1>{e(r["titel"])}</h1>{sub}
  <div class="meta">{m}</div>
  <div class="cols">
    <div class="left"><h2>Zutaten</h2><ul class="zut">{zutaten(r)}</ul>
      <div class="qr">{qr_svg(url)}<div class="qrt"><b>Scannen</b><br>Kochansicht &amp; Einkaufsliste für Bring!</div></div></div>
    <div class="right"><h2>Zubereitung</h2><ol class="steps">{steps}</ol>{note}</div>
  </div>
  <div class="nr">{nr}</div>
</section>'''

COMMON = """@page{size:148mm 210mm;margin:0}*{box-sizing:border-box}html,body{margin:0}
.page{width:148mm;height:210mm;padding:14mm 13mm 12mm;position:relative;overflow:hidden;page-break-after:always}
h1,h2{margin:0}ul,ol{margin:0;padding:0;list-style:none}
.cols{position:relative;display:grid;grid-template-columns:44mm 1fr;gap:7mm;margin-top:6mm}
.zut li{display:flex;gap:2mm;padding:1.1mm 0;hyphens:auto}.dicht .zut li{padding:.45mm 0}.dicht .steps li{margin-bottom:2mm}.zut .m{flex:0 0 15mm}.zut .grp{display:block;margin-top:2.5mm}
.steps{counter-reset:s}.steps li{counter-increment:s;position:relative;padding-left:8mm;margin-bottom:2.8mm}
.qr{margin-top:6mm;width:50mm;display:flex;gap:2.5mm;align-items:center}
.qr svg{width:19mm;height:19mm;flex:none}.qrt{font-size:6.5pt;line-height:1.35}
.nr{position:absolute;bottom:6mm;left:0;right:0;text-align:center;font-size:7pt}
.meta span+span:before{content:"·";margin:0 2mm}
"""

STYLES = {
"landhaus": ("Landhaus", "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400&family=Caveat:wght@500;700&family=Karla:wght@400;600&display=swap", """
.landhaus{background:#fbf5ea;color:#3a2e26;font:9.4pt/1.45 Fraunces,serif}
.landhaus .kap{font:600 7pt Karla,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#b4572a}
.landhaus h1{font:600 24pt/1.05 Fraunces,serif;margin-top:2mm}
.landhaus .sub{font:italic 11pt Fraunces,serif;color:#7d6b5c;margin-top:1mm}
.landhaus .meta{font:7.5pt Karla,sans-serif;color:#7d6b5c;margin-top:3mm;padding-bottom:3mm;border-bottom:1px dashed #d9c6a8}
.landhaus h2{font:700 15pt Caveat,cursive;color:#b4572a;margin-bottom:2mm}
.landhaus .zut li{border-bottom:1px dotted #e3d3b8}.landhaus .zut .m{font-weight:600}
.landhaus .zut .grp{font:700 11pt Caveat,cursive;color:#6f7f3e;border:0}
.landhaus .steps li:before{content:counter(s);position:absolute;left:0;top:-.3mm;font:700 13pt Caveat,cursive;color:#b4572a}
.landhaus .note{font:500 13pt/1.25 Caveat,cursive;color:#3a2e26;background:#f3e6cc;padding:3mm 4mm;transform:rotate(-1.2deg);margin-top:4mm;box-shadow:0 1px 0 #e0cda9}
.landhaus .qrt{font-family:Karla,sans-serif;color:#7d6b5c}.landhaus .nr{font:italic 8pt Fraunces,serif;color:#7d6b5c}
"""),
"modern": ("Modern & klar", "https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=DM+Serif+Display&display=swap", """
.modern{background:#fff;color:#1d2321;font:9pt/1.5 "DM Sans",sans-serif;padding-top:0}
.modern .kap{margin:0 -13mm 7mm;padding:4mm 13mm;background:#2f6b4f;color:#fff;font:700 7.5pt "DM Sans";letter-spacing:.2em;text-transform:uppercase}
.modern h1{font:400 25pt/1.05 "DM Serif Display",serif}
.modern .sub{color:#56605b;margin-top:1mm}
.modern .meta{margin-top:3mm;font-size:7.5pt;color:#2f6b4f;font-weight:500}
.modern .meta span{background:#e7f0eb;padding:.8mm 2.5mm;border-radius:10mm;margin-right:1.5mm}.modern .meta span+span:before{content:none}
.modern h2{font:700 7.5pt "DM Sans";letter-spacing:.16em;text-transform:uppercase;color:#2f6b4f;margin-bottom:2.5mm}
.modern .cols{grid-template-columns:50mm 1fr;gap:6mm}.modern .zut .m{flex-basis:14mm}.modern .left{background:#f2f5f3;margin:-2mm 0;padding:4mm;border-radius:2mm;height:max-content}
.modern .zut .m{font-weight:700}.modern .zut .grp{font-weight:700;color:#2f6b4f;font-size:7pt;text-transform:uppercase;letter-spacing:.1em}
.modern .steps li:before{content:counter(s);position:absolute;left:0;top:0;width:5.2mm;height:5.2mm;border-radius:50%;background:#2f6b4f;color:#fff;font:700 7pt/5.2mm "DM Sans";text-align:center}
.modern .note{border-left:2px solid #2f6b4f;padding:1mm 0 1mm 3.5mm;margin-top:4mm;color:#3b4541;font-style:italic}
.modern .qrt{color:#56605b}.modern .nr{color:#9aa39e}
"""),
"klassisch": ("Klassisch elegant", "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Source+Sans+3:wght@400;600&display=swap", """
.klassisch *{font-variant-numeric:lining-nums}.klassisch{background:#fffdf8;color:#26221f;font:10pt/1.42 "Cormorant Garamond",serif;text-align:left}
.klassisch .kap,.klassisch h1,.klassisch .sub,.klassisch .meta{text-align:center}
.klassisch .kap{font:600 7pt "Source Sans 3";letter-spacing:.3em;text-transform:uppercase;color:#8c6d3f}
.klassisch .kap:before,.klassisch .kap:after{content:"";display:inline-block;width:10mm;height:1px;background:#c9b48f;vertical-align:middle;margin:0 3mm}
.klassisch h1{font:600 26pt/1.05 "Cormorant Garamond",serif;margin-top:3mm}
.klassisch .sub{font-style:italic;font-size:12pt;color:#6b5f55}
.klassisch .meta{font:7.5pt "Source Sans 3";color:#6b5f55;margin-top:2.5mm;padding-bottom:4mm;border-bottom:1px solid #c9b48f}
.klassisch h2{font:italic 600 13pt "Cormorant Garamond";color:#8c6d3f;margin-bottom:2mm}
.klassisch .zut .m{font-weight:700}.klassisch .zut .grp{font-style:italic;color:#8c6d3f}
.klassisch .steps li:before{content:counter(s) ".";position:absolute;left:0;font-weight:700;color:#8c6d3f}
.klassisch .right{border-left:1px solid #e6dac4;padding-left:6mm}
.klassisch .note{font-style:italic;text-align:center;margin-top:5mm;padding-top:3mm;border-top:1px solid #e6dac4;color:#5a4f46}
.klassisch .qrt{font-family:"Source Sans 3";color:#6b5f55}.klassisch .nr{font:italic 9pt "Cormorant Garamond";color:#8c6d3f}
"""),
}

def build(variant, ids, out_dir):
    name, font, css = STYLES[variant]
    pages = "\n".join(page(load(i), n, variant) for n, i in enumerate(ids, 41))
    doc = f'<!doctype html><html lang="de"><head><meta charset="utf-8"><link rel="stylesheet" href="{font}"><style>{COMMON}{css}</style></head><body>{pages}{FIT_JS}</body></html>'
    p = f"{out_dir}/{variant}.html"; open(p, "w", encoding="utf-8").write(doc); return p

if __name__ == "__main__":
    out = sys.argv[1]; ids = sys.argv[2:]
    for v in STYLES: print(build(v, ids, out))

FIT_JS = """<script>
document.fonts.ready.then(()=>{for(const pg of document.querySelectorAll('.page')){
 const L=pg.querySelector('.left'),R=pg.querySelector('.right'),q=pg.querySelector('.qr');
 (R.scrollHeight<L.scrollHeight?R:L).appendChild(q);
 const limit=pg.getBoundingClientRect().bottom-pg.querySelector('.nr').offsetHeight-28;
 let fs=parseFloat(getComputedStyle(pg).fontSize);
 const low=()=>Math.max(L.getBoundingClientRect().bottom,R.getBoundingClientRect().bottom);
 while(low()>limit&&fs>9){fs-=.3;pg.style.fontSize=fs+'px';}
 if(low()>limit)pg.classList.add('zu-lang');}
 document.body.dataset.fertig=1;});
</script>"""
