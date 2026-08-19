"""Isometric SVG generator for the S.A.F.E. hardware scene."""
import math

COS30 = math.cos(math.radians(30))

# ---------- palette ----------
PCB      = ("#16394b", "#0f2a38", "#0b202b")   # top, right, front
PCB_RC   = ("#134a63", "#0d3547", "#0a2937")
HEADER   = ("#1e1e27", "#15151c", "#101015")
CHIP     = ("#262630", "#1b1b23", "#151519")
METAL    = ("#8b95a4", "#5e6875", "#48505b")
DARK     = ("#17171d", "#101015", "#0c0c10")
# The card is the only object in the rig that is not a PCB, so it must not read
# as one — white separates it instantly from the two teal boards it sits above.
CARD     = ("#e8edf2", "#c7d0da", "#aab5c2")
BODY     = ("#2b3240", "#1f2530", "#181d25")
SCREEN   = ("#0d1b24", "#0a151c", "#081117")

ACCENT = "#00d4ff"
EDGE   = "#05121a"
INK    = "#1d3a4d"   # dark mark on a light surface — the card's print colour


def iso(x, y, z, s, ox, oy):
    return (ox + (x - y) * COS30 * s, oy + (x + y) * 0.5 * s - z * s)


def pts(points, s, ox, oy):
    return " ".join("%.2f,%.2f" % iso(*p, s=s, ox=ox, oy=oy) for p in points)


def box(x, y, z, w, d, h, colors, s, ox, oy, cls="", stroke=EDGE, sw=0.8):
    top   = [(x, y, z + h), (x + w, y, z + h), (x + w, y + d, z + h), (x, y + d, z + h)]
    right = [(x + w, y, z), (x + w, y + d, z), (x + w, y + d, z + h), (x + w, y, z + h)]
    front = [(x, y + d, z), (x + w, y + d, z), (x + w, y + d, z + h), (x, y + d, z + h)]
    c = ' class="%s"' % cls if cls else ""
    out = ['<g%s>' % c]
    for face, col in ((front, colors[2]), (right, colors[1]), (top, colors[0])):
        out.append('<polygon points="%s" fill="%s" stroke="%s" stroke-width="%.2f" stroke-linejoin="round"/>'
                   % (pts(face, s, ox, oy), col, stroke, sw))
    out.append('</g>')
    return "\n".join(out), (x + y + z)


def plate(x, y, z, w, d, fill, s, ox, oy, opacity=1.0, stroke="none", sw=0.6):
    """Flat quad lying on the z plane — silkscreen, screens, labels on top faces."""
    quad = [(x, y, z), (x + w, y, z), (x + w, y + d, z), (x, y + d, z)]
    return ('<polygon points="%s" fill="%s" opacity="%.2f" stroke="%s" stroke-width="%.2f"/>'
            % (pts(quad, s, ox, oy), fill, opacity, stroke, sw))


def line3(a, b, s, ox, oy, stroke=ACCENT, sw=1.2, opacity=1.0, cls=""):
    p1 = iso(*a, s=s, ox=ox, oy=oy)
    p2 = iso(*b, s=s, ox=ox, oy=oy)
    c = ' class="%s"' % cls if cls else ""
    return ('<line%s x1="%.2f" y1="%.2f" x2="%.2f" y2="%.2f" stroke="%s" stroke-width="%.2f" '
            'opacity="%.2f" stroke-linecap="round"/>' % (c, p1[0], p1[1], p2[0], p2[1], stroke, sw, opacity))


def polyline3(points, s, ox, oy, stroke=ACCENT, sw=1.2, opacity=1.0, cls=""):
    d = " ".join("%.2f,%.2f" % iso(*p, s=s, ox=ox, oy=oy) for p in points)
    c = ' class="%s"' % cls if cls else ""
    return ('<polyline%s points="%s" fill="none" stroke="%s" stroke-width="%.2f" opacity="%.2f" '
            'stroke-linecap="round" stroke-linejoin="round"/>' % (c, d, stroke, sw, opacity))


def ring(cx, cy, z, r, s, ox, oy, stroke=ACCENT, sw=1.0, opacity=0.55, n=48):
    """Circle lying flat on the z plane, projected to iso."""
    p = []
    for i in range(n + 1):
        a = 2 * math.pi * i / n
        p.append((cx + r * math.cos(a), cy + r * math.sin(a), z))
    d = " ".join("%.2f,%.2f" % iso(*q, s=s, ox=ox, oy=oy) for q in p)
    return ('<polyline points="%s" fill="none" stroke="%s" stroke-width="%.2f" opacity="%.2f"/>'
            % (d, stroke, sw, opacity))


def arc(cx, cy, z, r, a0, a1, s, ox, oy, stroke=ACCENT, sw=1.0, opacity=1.0, n=24):
    """Partial circle on the z plane — the contactless mark is four of these."""
    p = []
    for i in range(n + 1):
        a = math.radians(a0 + (a1 - a0) * i / n)
        p.append((cx + r * math.cos(a), cy + r * math.sin(a), z))
    d = " ".join("%.2f,%.2f" % iso(*q, s=s, ox=ox, oy=oy) for q in p)
    return ('<polyline points="%s" fill="none" stroke="%s" stroke-width="%.2f" opacity="%.2f" '
            'stroke-linecap="round"/>' % (d, stroke, sw, opacity))


def sort_join(items):
    """items: list of (svg, depth) — painter's order, far to near."""
    return "\n".join(svg for svg, _ in sorted(items, key=lambda t: t[1]))


def shadow(cx, cy, rx, ry, s, ox, oy, opacity=0.30, n=40):
    """Soft ground patch under a unit — flat ellipse on z=0."""
    pl = []
    for i in range(n + 1):
        a = 2 * math.pi * i / n
        pl.append((cx + rx * math.cos(a), cy + ry * math.sin(a), 0))
    return ('<polygon points="%s" fill="#05070a" opacity="%.2f"/>'
            % (pts(pl, s, ox, oy), opacity))
