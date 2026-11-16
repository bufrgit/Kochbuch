"""Kapitel-Themen für das Landhaus-Design: Akzentfarben, Papierton und kleines Motiv (SVG)."""

def _svg(inner, w=110, h=110):
    return f'<svg class="motiv" viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg">{inner}</svg>'

def stern(x, y, r, c, o=1):
    import math
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r * .45
        pts.append(f"{x + rr * math.cos(a):.1f},{y + rr * math.sin(a):.1f}")
    return f'<polygon points="{" ".join(pts)}" fill="{c}" opacity="{o}"/>'

TANNE = ('<g stroke="#2f5d3a" stroke-width="2.2" fill="none" stroke-linecap="round">'
         '<path d="M15 95 Q55 60 100 18"/>'
         + "".join(f'<path d="M{15+i*12} {95-i*11} l{-4+i} -14 M{15+i*12} {95-i*11} l14 {3-i*.3}"/>' for i in range(1, 7))
         + '</g><circle cx="44" cy="78" r="5" fill="#a8322d"/><circle cx="52" cy="72" r="4" fill="#a8322d"/>')

THEMEN = {
    "Weihnachtsbäckerei": dict(a="#a8322d", b="#2f5d3a", papier="#fbf3e8", zettel="#f6e2d6",
        motiv=_svg(TANNE + stern(90, 60, 7, "#c9a23a") + stern(70, 30, 5, "#c9a23a") + stern(30, 40, 4, "#c9a23a", .7)),
        extra=".rahmen{position:absolute;inset:5mm;border:1.2px dashed #a8322d55;border-radius:3mm;pointer-events:none}"
              ".stern{position:absolute;color:#c9a23a}"),
    "Backen": dict(a="#b06a2c", b="#7a5a3a", papier="#fbf5ea", zettel="#f3e6cc",
        motiv=_svg('<g fill="none" stroke="#b06a2c" stroke-width="2.2" stroke-linecap="round"><path d="M20 70 h70 l-6 22 h-58 z"/>'
                   '<path d="M24 70 q8 -28 32 -30 q24 2 30 30"/><path d="M40 62 q6 -10 14 -12 M62 52 q8 4 10 14"/></g>'
                   '<circle cx="56" cy="34" r="5" fill="#a8322d"/><path d="M56 29 q4 -8 10 -9" stroke="#2f5d3a" stroke-width="2" fill="none"/>')),
    "Suppen": dict(a="#3f6f86", b="#a0602f", papier="#f8f5ee", zettel="#e5ecee",
        motiv=_svg('<g fill="none" stroke="#3f6f86" stroke-width="2.2" stroke-linecap="round"><path d="M15 55 h80 q-4 32 -40 34 q-36 -2 -40 -34z"/>'
                   '<path d="M40 45 q-6 -10 0 -18 q6 -8 0 -16 M56 45 q-6 -10 0 -18 q6 -8 0 -16 M72 45 q-6 -10 0 -18 q6 -8 0 -16"/></g>')),
    "Salate, Dips & Saucen": dict(a="#5e7d4f", b="#a0602f", papier="#f9f6ec", zettel="#e8eddb",
        motiv=_svg('<g fill="none" stroke="#5e7d4f" stroke-width="2.2" stroke-linecap="round"><path d="M55 95 q-35 -25 -20 -70 q40 10 20 70z"/>'
                   '<path d="M55 95 q-12 -35 -20 -70"/><path d="M60 92 q30 -20 30 -55 q-30 5 -30 55z"/></g>')),
}
STANDARD = dict(a="#b4572a", b="#6f7f3e", papier="#fbf5ea", zettel="#f3e6cc", motiv="", extra="")


def css(kapitel, sel):
    t = {**STANDARD, **THEMEN.get(kapitel, {})}
    return (f"{sel}{{background:{t['papier']}}}{sel} .kap,{sel} h2,{sel} .steps li:before{{color:{t['a']}}}"
            f"{sel} .zut .grp{{color:{t['b']}}}{sel} .note{{background:{t['zettel']}}}"
            f"{sel} .motiv{{position:absolute;top:9mm;right:10mm;width:26mm;height:26mm;opacity:.9}}"
            f"{sel} h1{{padding-right:24mm}}{t.get('extra','')}"), t
