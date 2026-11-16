"""Erzeugt die Webseite zum Kochbuch (für GitHub Pages).

    python3 werkzeuge/webseite.py [ZIELORDNER]      (Standard: _site)

- index.html            Wochenplan (QR-Code auf Seite 2 im Buch): alle gescannten Rezepte, per Tipp einem
                        Wochentag zuordnen, mit × löschen; oben steht, was es heute gibt
- <rezept-id>/          eine Kochansicht pro Rezept (QR-Code neben jedem Rezept); beim Öffnen landet
                        das Rezept automatisch auf dem Wochenplan
- app.js / app.css / sw.js / Icons aus werkzeuge/web/

Datenquelle sind ausschließlich die Dateien in rezepte/. Interne Felder (Quellfoto,
Änderungsprotokoll, Freigabe) landen nicht auf der Webseite.
"""
import glob, html, json, os, re, shutil, sys
from urllib.parse import quote

HIER = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HIER)
sys.path.insert(0, HIER)
import themen
from kochbuch import OBER, TITEL

BASE = "https://bufrgit.github.io/Kochbuch/"  # so steht es in den QR-Codes im Buch
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "_site")
WEB = os.path.join(HIER, "web")
FONTS = ("https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400"
         "&family=Caveat:wght@500;700&family=Karla:wght@400;600&display=swap")
e = html.escape

FELDER = ["id", "titel", "kapitel", "zeit"]  # mehr braucht der Wochenplan nicht
REZEPTE = sorted((json.load(open(f, encoding="utf-8")) for f in glob.glob(os.path.join(ROOT, "rezepte", "*.json"))),
                 key=lambda r: r["titel"].lower())
FARBE = {k: themen.THEMEN.get(k, themen.STANDARD)["a"] for _, _, ks, _ in OBER for k in ks}


def kopf(titel, tiefe, beschreibung=""):
    p = "../" * tiefe
    return f"""<!doctype html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>{e(titel)}</title>{f'<meta name="description" content="{e(beschreibung)}">' if beschreibung else ''}
<meta name="theme-color" content="#fbf5ea" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#1f1a16" media="(prefers-color-scheme: dark)">
<link rel="manifest" href="{p}manifest.webmanifest">
<link rel="icon" href="{p}icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="{p}icon-180.png">
<meta name="apple-mobile-web-app-title" content="Kochbuch">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
<link rel="stylesheet" href="{p}app.css">"""


def bring_url(r):
    n = r["portionen"]
    return ("https://api.getbring.com/rest/bringrecipes/deeplink?url=" + quote(BASE + r["id"] + "/", safe="")
            + f"&source=web&baseQuantity={n}&requestedQuantity={n}")


def ist_gruppe(z):
    return not z["menge"] and z["zutat"].rstrip().endswith(":")


def minuten(zeit):
    h = re.search(r"(\d+)\s*Std", zeit or ""); m = re.search(r"(\d+)\s*Min", zeit or "")
    return (int(h.group(1)) * 60 if h else 0) + (int(m.group(1)) if m else 0)


def rezeptseite(r):
    zut = [f"{z['menge']} {z['zutat']}".strip() for z in r["zutaten"] if not ist_gruppe(z)]
    ld = {"@context": "https://schema.org", "@type": "Recipe", "name": r["titel"], "description": r["untertitel"] or "",
          "recipeYield": str(r["portionen"]), "recipeCategory": r["kapitel"], "recipeIngredient": zut,
          "recipeInstructions": [{"@type": "HowToStep", "text": s} for s in r["schritte"]]}
    if minuten(r["zeit"]):
        ld["totalTime"] = f"PT{minuten(r['zeit'])}M"
    meta = "  ·  ".join([f"{r['portionen']} Portionen", r["zeit"] or "", *r["merkmale"]]).strip(" ·")
    motiv = themen.THEMEN.get(r["kapitel"], {}).get("motiv", "")
    farbe = FARBE.get(r["kapitel"], "#b4572a")
    zl = "".join(f'<li class="grp">{e(z["zutat"].rstrip(":"))}</li>' if ist_gruppe(z)
                 else f'<li><b>{e(z["menge"])}</b><span>{e(z["zutat"])}</span></li>' for z in r["zutaten"])
    return f"""{kopf(r['titel'], 1, r['untertitel'] or '')}
<style>.rezept .kap{{color:{farbe}}}</style>
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
</head><body data-seite="rezept" data-id="{e(r['id'])}" data-titel="{e(r['titel'])}" data-portionen="{r['portionen']}">
<main class="rezept">
<a class="zurueck" href="../">← Zum Wochenplan</a>
{motiv}
<p class="kap">{e(r['kapitel'])}</p>
<h1>{e(r['titel'])}</h1>{f'<p class="sub">{e(r["untertitel"])}</p>' if r['untertitel'] else ''}
<p class="meta">{e(meta)}</p>
<div class="actions">
<a class="btn bring" href="{e(bring_url(r))}">🛒 Zu Bring!</a>
<button class="btn" id="wach" aria-pressed="false">☀️ Bildschirm anlassen</button>
</div>
<div class="grid">
<section><h2>Zutaten</h2><ul class="zut">{zl}</ul></section>
<section><h2>Zubereitung</h2><ol class="schritte">{''.join(f'<li>{e(s)}</li>' for s in r['schritte'])}</ol>
<p class="hinweis">Tipp: Erledigte Schritte antippen, dann werden sie ausgegraut.</p>
{f'<p class="note">{e(r["notiz"])}</p>' if r['notiz'] else ''}</section>
</div></main>
<script src="../app.js"></script></body></html>"""


def startseite():
    daten = {"rezepte": [{k: r.get(k) for k in FELDER} for r in REZEPTE]}
    js = json.dumps(daten, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    return f"""{kopf(TITEL, 0, 'Unser Wochenplan zum Familienkochbuch')}
</head><body data-seite="app">
<main id="app"><noscript><p>Für den Wochenplan bitte JavaScript einschalten.</p></noscript></main>
<script type="application/json" id="daten">{js}</script>
<script src="app.js"></script></body></html>"""


MANIFEST = {
    "name": TITEL, "short_name": "Kochbuch", "lang": "de", "start_url": "./", "scope": "./",
    # "browser" statt "standalone": auf dem iPhone teilt sich das Homescreen-Symbol dann den Speicher mit Safari,
    # wo die QR-Codes landen – sonst sähe der Wochenplan die gescannten Rezepte nicht.
    "display": "browser", "background_color": "#fbf5ea", "theme_color": "#b4572a",
    "icons": [{"src": "icon.svg", "sizes": "any", "type": "image/svg+xml"},
              {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"},
              {"src": "icon-180.png", "sizes": "180x180", "type": "image/png"}],
}

if __name__ == "__main__":
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)
    for f in os.listdir(WEB):
        shutil.copy(os.path.join(WEB, f), OUT)
    open(f"{OUT}/.nojekyll", "w").write("")
    open(f"{OUT}/index.html", "w", encoding="utf-8").write(startseite())
    open(f"{OUT}/404.html", "w", encoding="utf-8").write(
        kopf("Nicht gefunden", 0) + '</head><body><main><p class="kap">Familienkochbuch</p><h1>Diese Seite gibt es nicht.</h1>'
        f'<p><a class="btn voll" href="{BASE}">Zum Kochbuch</a></p></main></body></html>')
    open(f"{OUT}/manifest.webmanifest", "w", encoding="utf-8").write(json.dumps(MANIFEST, ensure_ascii=False, indent=1))
    for r in REZEPTE:
        os.makedirs(f"{OUT}/{r['id']}")
        open(f"{OUT}/{r['id']}/index.html", "w", encoding="utf-8").write(rezeptseite(r))
    print(f"{len(REZEPTE)} Rezepte -> {OUT}")
