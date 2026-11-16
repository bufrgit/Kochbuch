"""Lädt alle Rezepte aus rezepte/*.json in das Format, das die Generatoren erwarten."""
import glob, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def laden():
    out = []
    for i, f in enumerate(sorted(glob.glob(os.path.join(ROOT, "rezepte", "*.json"))), 1):
        d = json.load(open(f, encoding="utf-8"))
        meta = "  ·  ".join([f"{d['portionen']} Portionen", d["zeit"], *d.get("merkmale", [])])
        out.append(dict(id=d["id"], kapitel=d["kapitel"].upper(), art=d.get("clipart"), seite=i,
            title=d["titel"], subtitle=d.get("untertitel"), meta=meta,
            ingredients=[(z["menge"], z["zutat"]) for z in d["zutaten"]],
            steps=d["schritte"], note=d.get("notiz")))
    return out

RECIPES = laden()
