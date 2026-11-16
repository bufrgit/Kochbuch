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
        motiv=_svg(TANNE + stern(90, 60, 7, "#c9a23a") + stern(70, 30, 5, "#c9a23a") + stern(30, 40, 4, "#c9a23a", .7))),
    "Backen": dict(a="#b0566a", b="#7a5a3a", papier="#fbf5f0", zettel="#f3e2e2",
        motiv=_svg('<g fill="none" stroke="#b0566a" stroke-width="2.2" stroke-linecap="round"><path d="M20 70 h70 l-6 22 h-58 z"/>'
                   '<path d="M24 70 q8 -28 32 -30 q24 2 30 30"/><path d="M40 62 q6 -10 14 -12 M62 52 q8 4 10 14"/></g>'
                   '<circle cx="56" cy="34" r="5" fill="#a8322d"/><path d="M56 29 q4 -8 10 -9" stroke="#2f5d3a" stroke-width="2" fill="none"/>')),
    "Suppen": dict(a="#3f6f86", b="#a0602f", papier="#f8f5ee", zettel="#e5ecee",
        motiv=_svg('<g fill="none" stroke="#3f6f86" stroke-width="2.2" stroke-linecap="round"><path d="M15 55 h80 q-4 32 -40 34 q-36 -2 -40 -34z"/>'
                   '<path d="M40 45 q-6 -10 0 -18 q6 -8 0 -16 M56 45 q-6 -10 0 -18 q6 -8 0 -16 M72 45 q-6 -10 0 -18 q6 -8 0 -16"/></g>')),
    "Salate, Dips & Saucen": dict(a="#5e7d4f", b="#a0602f", papier="#f9f6ec", zettel="#e8eddb",
        motiv=_svg('<g fill="none" stroke="#5e7d4f" stroke-width="2.2" stroke-linecap="round"><path d="M55 95 q-35 -25 -20 -70 q40 10 20 70z"/>'
                   '<path d="M55 95 q-12 -35 -20 -70"/><path d="M60 92 q30 -20 30 -55 q-30 5 -30 55z"/></g>')),
}

def _linie(c, d):
    return _svg(f'<g fill="none" stroke="{c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">{d}</g>')

def _t(a, b, papier, zettel, d, extra=""):
    return dict(a=a, b=b, papier=papier, zettel=zettel, motiv=_linie(a, d), extra=extra)

THEMEN.update({
    "Hauptgerichte": _t("#b4572a", "#6f7f3e", "#fbf5ea", "#f3e6cc",
        '<ellipse cx="48" cy="62" rx="32" ry="14"/><path d="M16 62 q0 18 32 18 q32 0 32 -18 M80 60 l24 -8"/><path d="M38 44 q-4 -8 2 -14 M52 42 q-4 -8 2 -14"/>'),
    "Aufläufe": _t("#8c5a3c", "#6f7f3e", "#faf4ec", "#efe0cf",
        '<rect x="18" y="52" width="74" height="30" rx="6"/><path d="M10 58 h8 M92 58 h8"/><path d="M24 52 q10 -10 20 0 q10 -10 20 0 q10 -10 20 0"/><path d="M40 36 q-4 -8 2 -14 M60 36 q-4 -8 2 -14"/>'),
    "Pasta": _t("#a8851c", "#a0442a", "#fbf6e6", "#f2e8c4",
        '<path d="M55 95 v-40 M45 55 v-25 M55 55 v-25 M65 55 v-25 M45 55 q10 8 20 0"/><path d="M30 40 q25 -25 50 0 M28 52 q27 -22 54 0 M34 30 q21 -18 42 0"/>'),
    "Fisch": _t("#2f7a7a", "#b4572a", "#f5f6f0", "#dfece8",
        '<path d="M18 55 q30 -30 62 0 q-32 30 -62 0z M80 55 l18 -14 v28z"/><circle cx="32" cy="51" r="2.5"/><path d="M48 44 q6 11 0 22"/>'),
    "Snacks & Kleinigkeiten": _t("#6d5f9c", "#b4572a", "#f8f5f0", "#e7e3f0",
        '<path d="M20 90 L90 20"/><circle cx="40" cy="70" r="9"/><circle cx="56" cy="54" r="9"/><circle cx="72" cy="38" r="9"/>'),
    "Beilagen": _t("#7a7a35", "#b4572a", "#f9f7ec", "#ebebd3",
        '<ellipse cx="40" cy="62" rx="22" ry="16" transform="rotate(-20 40 62)"/><ellipse cx="72" cy="56" rx="18" ry="13" transform="rotate(15 72 56)"/><path d="M34 58 h2 M46 66 h2 M70 52 h2"/>'),
    "Desserts": _t("#9a4a78", "#5e7d4f", "#fbf4f3", "#f2e1ea",
        '<path d="M30 40 h50 q0 30 -25 34 q-25 -4 -25 -34z M55 74 v16 M42 92 h26"/><circle cx="55" cy="32" r="8"/><path d="M58 24 q4 -8 10 -8"/>'),
    "Getränke": _t("#3f86a8", "#b4572a", "#f4f7f6", "#dfecf1",
        '<path d="M32 30 h44 l-6 62 h-32z M35 52 h38"/><circle cx="80" cy="30" r="12"/><path d="M80 18 v24 M68 30 h24 M62 14 l-10 36"/>'),
})

STANDARD = dict(a="#b4572a", b="#6f7f3e", papier="#fbf5ea", zettel="#f3e6cc", motiv="", extra="")


def css(kapitel, sel):
    t = {**STANDARD, **THEMEN.get(kapitel, {})}
    return (f"{sel}{{background:{t['papier']}}}{sel} .kap,{sel} h2,{sel} .steps li:before{{color:{t['a']}}}"
            f"{sel} .zut .grp{{color:{t['b']}}}{sel} .note{{background:{t['zettel']}}}"
            f"{sel} .motiv{{position:absolute;top:9mm;right:10mm;width:26mm;height:26mm;opacity:.9}}"
            f"{sel} h1{{padding-right:24mm}}{t.get('extra','')}"), t
