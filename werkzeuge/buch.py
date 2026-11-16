import sys, json, os
from urllib.parse import quote
from reportlab.lib.pagesizes import A5
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF
from reportlab.lib.utils import simpleSplit

F = "/usr/share/fonts/truetype/liberation/"
for n, f in [("Serif","Regular"),("Serif-B","Bold"),("Serif-I","Italic")]:
    pdfmetrics.registerFont(TTFont(n, F+f"LiberationSerif-{f}.ttf"))
pdfmetrics.registerFont(TTFont("Sans", F+"LiberationSans-Regular.ttf"))
pdfmetrics.registerFont(TTFont("Sans-B", F+"LiberationSans-Bold.ttf"))

INK = HexColor("#3b2f2a"); ACC = HexColor("#c8642a"); SOFT = HexColor("#8a7a6e")
PAPER = HexColor("#fbf6ee"); LINE = HexColor("#e6d9c6"); GREEN = HexColor("#6b7f3a"); RED = HexColor("#b8382e")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rezepte import RECIPES

def payload(r):
    return f"https://bufrgit.github.io/Kochbuch/{r['id']}/"

def pumpkin(c, x, y, s):
    c.saveState(); c.translate(x, y); c.scale(s, s); c.setStrokeColor(INK); c.setLineWidth(1.2)
    c.setFillColor(ACC)
    for dx, w in ((-9, 13), (9, 13), (0, 15)): c.ellipse(dx-w, -12, dx+w, 12, fill=1, stroke=1)
    c.setFillColor(GREEN)
    p = c.beginPath(); p.moveTo(-2, 11); p.curveTo(-2, 17, 1, 20, 4, 21); p.lineTo(5, 19); p.curveTo(3, 17, 2, 14, 2, 11); p.close(); c.drawPath(p, fill=1, stroke=1)
    p = c.beginPath(); p.moveTo(3, 16); p.curveTo(10, 22, 16, 18, 13, 14); p.curveTo(10, 17, 7, 17, 3, 16); c.drawPath(p, fill=1, stroke=1)
    c.restoreState()

def apple(c, x, y, s):
    c.saveState(); c.translate(x, y); c.scale(s, s); c.setStrokeColor(INK); c.setLineWidth(1.2)
    c.setFillColor(RED)
    p = c.beginPath(); p.moveTo(0, 10); p.curveTo(8, 16, 18, 10, 16, -2); p.curveTo(15, -12, 8, -18, 0, -14)
    p.curveTo(-8, -18, -15, -12, -16, -2); p.curveTo(-18, 10, -8, 16, 0, 10); p.close(); c.drawPath(p, fill=1, stroke=1)
    c.setLineWidth(1.6); c.line(0, 10, 2, 19); c.setLineWidth(1.2)
    c.setFillColor(GREEN)
    p = c.beginPath(); p.moveTo(2, 16); p.curveTo(6, 23, 14, 22, 15, 19); p.curveTo(11, 15, 5, 15, 2, 16); c.drawPath(p, fill=1, stroke=1)
    c.setStrokeColor(white); c.setLineWidth(1.5); c.arc(-12, -6, -4, 6, 110, 50)
    c.restoreState()

def page(c, r, with_qr=True):
    W, H = A5; M = 34
    c.setFillColor(PAPER); c.rect(0, 0, W, H, fill=1, stroke=0)
    top = H - M
    c.setFillColor(ACC); c.setFont("Sans-B", 7.5); c.drawString(M, top - 4, r["kapitel"])
    if r.get("art"): {"pumpkin": pumpkin, "apple": apple}[r["art"]](c, W - M - 22, top - 22, 1.15)
    c.setFillColor(INK); c.setFont("Serif-B", 24); c.drawString(M, top - 32, r["title"])
    c.setFont("Serif-I", 11); c.setFillColor(SOFT); c.drawString(M, top - 48, r["subtitle"])
    c.setFont("Sans", 8); c.drawString(M, top - 63, r["meta"])
    c.setStrokeColor(LINE); c.setLineWidth(0.8); c.line(M, top - 73, W - M, top - 73)
    colL = M; colW = 140; y = top - 94
    c.setFont("Sans-B", 8); c.setFillColor(ACC); c.drawString(colL, y, "ZUTATEN"); y -= 16
    off = max(34, max(pdfmetrics.stringWidth(a, "Serif-B", 9.5) for a, _ in r["ingredients"]) + 7)
    for a, n in r["ingredients"]:
        c.setFont("Serif-B", 9.5); c.setFillColor(INK)
        if a: c.drawString(colL, y, a)
        c.setFont("Serif", 9.5)
        for ln in simpleSplit(n, "Serif", 9.5, colW - off):
            c.drawString(colL + (off if a else 0), y, ln); y -= 12
        y -= 3
    if with_qr:
        qs = 96; qx = colL; qy = M + 46
        c.setFillColor(white); c.setStrokeColor(LINE)
        c.roundRect(qx - 6, qy - 40, colW + 6, qs + 52, 6, fill=1, stroke=1)
        url = payload(r)
        w = QrCodeWidget(url); w.barLevel = "L"
        b = w.getBounds(); bw, bh = b[2]-b[0], b[3]-b[1]
        d = Drawing(qs, qs, transform=[qs/bw, 0, 0, qs/bh, 0, 0]); d.add(w)
        qxx = qx + (colW - 6 - qs)/2
        renderPDF.draw(d, c, qxx, qy)
        c.linkURL(url, (qxx, qy, qxx + qs, qy + qs), relative=0)
        c.setFillColor(INK); c.setFont("Sans-B", 7.5)
        c.drawCentredString(qx + (colW-6)/2, qy - 12, "Scannen: Rezept & Bring!-Einkaufsliste")
        c.setFont("Sans", 6.5); c.setFillColor(SOFT)
        c.drawCentredString(qx + (colW-6)/2, qy - 22, "Öffnet die Kochansicht mit Knopf")
        c.drawCentredString(qx + (colW-6)/2, qy - 30, "für die Einkaufsliste.")
    rx = M + colW + 22; rw = W - M - rx; y = top - 94
    c.setFont("Sans-B", 8); c.setFillColor(ACC); c.drawString(rx, y, "ZUBEREITUNG"); y -= 16
    for i, s in enumerate(r["steps"], 1):
        c.setFillColor(ACC); c.circle(rx + 6, y + 3, 6.5, fill=1, stroke=0)
        c.setFillColor(white); c.setFont("Sans-B", 7.5); c.drawCentredString(rx + 6, y + 0.5, str(i))
        c.setFillColor(INK); c.setFont("Serif", 9.5)
        for ln in simpleSplit(s, "Serif", 9.5, rw - 20):
            c.drawString(rx + 20, y, ln); y -= 12.5
        y -= 6
    y -= 4
    nl = simpleSplit(r["note"] or "", "Serif-I", 10, rw - 12)
    if nl: c.setStrokeColor(ACC); c.setLineWidth(1.5); c.line(rx, y + 9, rx, y - 12.5*len(nl) + 9)
    c.setFont("Serif-I", 10); c.setFillColor(INK)
    for ln in nl: c.drawString(rx + 9, y, ln); y -= 12.5
    c.setFont("Sans", 7); c.setFillColor(SOFT); c.drawCentredString(W/2, M - 14, f"– {r['seite']} –")
    c.showPage()

out = sys.argv[1] if len(sys.argv) > 1 else "kochbuch.pdf"
c = canvas.Canvas(out, pagesize=A5); c.setTitle("Familienkochbuch")
for r in RECIPES: page(c, r)
c.save()
for r in RECIPES: print(payload(r))
