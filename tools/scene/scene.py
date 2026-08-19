"""Builds the hardware scene SVG: rig units + an Arduino that explodes into parts."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from iso import *

S = 3.5           # px per mm — bumped with the 2x design pass the deck's other slides got

# How far each part rises during the exploded view, in user units before the
# act-2 zoom. animations.js reads these off data-rise, so this table is the
# single source of truth.
RISE = {
    "pcb": 0, "leds": 20, "reg": 38, "xtal": 44, "reset": 46, "icsp": 46,
    "mcu": 66, "usb": 84, "jack": 84,
    "hdr-d1": 106, "hdr-d2": 106, "hdr-a1": 106, "hdr-a2": 106,
}
OX, OY = 600, 300  # projection origin inside the viewBox


def arduino(x0, y0, scale=1.0):
    """Arduino Uno. Each part is its own <g class="part part--name"> so it can fly."""
    s = S * scale
    W, D, T = 68.6, 53.4, 1.6
    parts = []

    # --- PCB ---
    sh = shadow(x0 + W / 2, y0 + D / 2, W * 0.62, D * 0.62, s, OX, OY, 0.32)
    pcb, _ = box(x0, y0, 0, W, D, T, PCB, s, OX, OY)
    pcb = sh + pcb
    silk = [
        plate(x0 + 4, y0 + 4, T + 0.01, W - 8, D - 8, "none", s, OX, OY, 1, ACCENT, 0.5),
        ring(x0 + 8, y0 + 8, T + 0.02, 2.2, s, OX, OY, "#7f8b96", 0.9, 0.7),
        ring(x0 + W - 8, y0 + 8, T + 0.02, 2.2, s, OX, OY, "#7f8b96", 0.9, 0.7),
        ring(x0 + 8, y0 + D - 8, T + 0.02, 2.2, s, OX, OY, "#7f8b96", 0.9, 0.7),
        ring(x0 + W - 8, y0 + D - 8, T + 0.02, 2.2, s, OX, OY, "#7f8b96", 0.9, 0.7),
    ]
    parts.append(('<g class="part part--pcb" data-rise="0">%s%s</g>' % (pcb, "".join(silk)), -100))

    def part(name, bx, by, w, d, h, colors, extra=""):
        svg, depth = box(x0 + bx, y0 + by, T, w, d, h, colors, s, OX, OY)
        parts.append(('<g class="part part--%s" data-rise="%d">%s%s</g>'
                      % (name, RISE.get(name, 60), svg, extra), depth))

    # --- headers (top and bottom edge strips) ---
    part("hdr-d1", 14, 46.5, 22, 5, 8.5, HEADER)
    part("hdr-d2", 39, 46.5, 22, 5, 8.5, HEADER)
    part("hdr-a1", 12, 2, 20, 5, 8.5, HEADER)
    part("hdr-a2", 36, 2, 18, 5, 8.5, HEADER)

    # --- ATmega328P DIP-28 with pin rows and the orientation notch ---
    pin_rows = []
    for i in range(14):
        px = x0 + 24 + 1.2 + i * 2.0
        pin_rows.append(line3((px, y0 + 20.2, T), (px, y0 + 21.6, T), s, OX, OY, "#9aa4b0", 0.9, 0.85))
        pin_rows.append(line3((px, y0 + 27.4, T), (px, y0 + 28.8, T), s, OX, OY, "#9aa4b0", 0.9, 0.85))
    notch = ring(x0 + 26.5, y0 + 24.5, T + 4.01, 1.4, s, OX, OY, "#5d6470", 1.0, 0.9)
    part("mcu", 24, 21, 29, 7, 4, CHIP, "".join(pin_rows) + notch)

    # --- USB-B jack (overhangs the left edge) ---
    part("usb", -3, 32, 16, 12, 11, METAL)
    # --- barrel power jack ---
    part("jack", -3, 5, 14, 9, 11, DARK)
    # --- 16 MHz crystal ---
    part("xtal", 20, 30, 7, 3.5, 3.5, METAL)
    # --- reset button ---
    part("reset", 60, 44, 5, 5, 4, DARK,
         ring(x0 + 62.5, y0 + 46.5, T + 4.02, 1.6, s, OX, OY, "#c0392b", 1.2, 0.9))
    # --- ICSP header ---
    part("icsp", 60, 20, 5, 8, 5, HEADER)
    # --- voltage regulator ---
    part("reg", 12, 12, 8, 5, 4, CHIP)
    # --- status LEDs ---
    leds = []
    for i, col in enumerate(("#2ecc71", "#f1c40f", "#f1c40f", "#e74c3c")):
        leds.append(plate(x0 + 40 + i * 3, y0 + 40, T + 0.03, 1.8, 1.8, col, s, OX, OY, 0.95))
    parts.append(('<g class="part part--leds" data-rise="%d">%s</g>' % (RISE["leds"], "".join(leds)), 60))

    return '<g id="arduino" class="unit unit--arduino">\n%s\n</g>' % sort_join(parts)


def rc522_pin(x0, y0, i):
    """Top of the RC522's pin header — jumper i lands here."""
    return (x0 + 45 + i * 4, y0 + 34, 8.7)


def arduino_pin(x0, y0, i):
    """Top of the Arduino's D2 header — the other end of jumper i.

    The near-edge digital strip, not the far-edge analog one: it is the header
    the part label on step 2 points at, and it faces the reader."""
    return (x0 + 44 + i * 4, y0 + 49, 10.2)


def arduino_usb(x0, y0):
    """Mouth of the USB-B jack, which overhangs the board's left edge."""
    return (x0 - 3.5, y0 + 38, 7.0)


def rc522(x0, y0):
    s = S
    W, D, T = 60, 40, 1.6
    sh = shadow(x0 + W / 2, y0 + D / 2, W * 0.62, D * 0.62, s, OX, OY, 0.32)
    body, _ = box(x0, y0, 0, W, D, T, PCB_RC, s, OX, OY)
    body = sh + body
    art = [ring(x0 + 20, y0 + 20, T + 0.02, r, s, OX, OY, "#cfe6f2", 1.0, 0.5) for r in (4, 7, 10, 13, 16)]
    art.append(ring(x0 + 20, y0 + 20, T + 0.02, 1.2, s, OX, OY, "#cfe6f2", 1.4, 0.7))
    chip, _ = box(x0 + 40, y0 + 16, T, 9, 9, 1.6, CHIP, s, OX, OY)
    xtal, _ = box(x0 + 50, y0 + 6, T, 6, 3, 2.5, METAL, s, OX, OY)
    hdr, _ = box(x0 + 42, y0 + 32, T, 16, 4, 7, HEADER, s, OX, OY)
    return ('<g class="unit rig-context unit--rc522">%s%s%s%s%s</g>'
            % (body, "".join(art), chip, xtal, hdr))


def nfc_card(x0, y0, z0):
    """MIFARE card — white stock with the contactless mark printed on it.

    The art is INK, not ACCENT: cyan on white is invisible at projector gamma."""
    s = S
    W, D, T = 54, 34, 0.9
    z = z0 + T + 0.02
    body, _ = box(x0, y0, z0, W, D, T, CARD, s, OX, OY)
    art = [plate(x0 + 4, y0 + 4, z - 0.01, W - 8, D - 8, "none", s, OX, OY, 0.35, INK, 0.5)]
    # contactless mark — four arcs opening away from the card's leading edge
    cx, cy = x0 + 39, y0 + 17
    for i, r in enumerate((2.6, 5.2, 7.8, 10.4)):
        art.append(arc(cx, cy, z, r, -52, 52, s, OX, OY, INK, 1.5, 0.9 - i * 0.12))
    # chip contact pad, so it reads as a smart card and not a blank
    art.append(plate(x0 + 9, y0 + 12, z, 9, 7, "#c9a227", s, OX, OY, 0.9, "#8a6f1a", 0.5))
    return '<g class="unit rig-context unit--card">%s%s</g>' % (body, "".join(art))


# Geometry the wire routing in compose.py reads, so a cable endpoint is derived
# from the object it plugs into instead of being a hand-tuned magic number.
CAM_W, CAM_D, CAM_H, CAM_Z = 30, 18, 17, 11.5


def webcam_port(x0, y0):
    """Where the USB tail reaches the ground — the foot, not the body.

    Dropping the cable at the stand keeps it under the laptop lid instead of
    crossing in front of it."""
    return (x0 + 15, y0 + 11, 1.6)


def webcam(x0, y0):
    """Clip-style webcam: a foot narrower than the body, on a visible neck.

    The old version had a 32x20 stand under a 30x18 body, so the foot read as a
    detached plate, and the neck was swallowed whole by the body drawn over it."""
    s = S
    sh = shadow(x0 + CAM_W / 2, y0 + CAM_D / 2, 11, 7, s, OX, OY, 0.35)
    stand, _ = box(x0 + 8, y0 + 4, 0, 14, 10, 1.6, DARK, s, OX, OY)
    neck, _ = box(x0 + 12, y0 + 6, 1.6, 6.5, 6, CAM_Z - 1.6, DARK, s, OX, OY)
    body, _ = box(x0, y0, CAM_Z, CAM_W, CAM_D, CAM_H, BODY, s, OX, OY)
    # lens barrel on the near-right face, with the accent glint inside it
    lens = ring(x0 + CAM_W + 0.01, y0 + CAM_D / 2, CAM_Z + CAM_H * 0.5, 5.5,
                s, OX, OY, "#0b1116", 6.0, 1.0)
    glint = ring(x0 + CAM_W + 0.05, y0 + CAM_D / 2, CAM_Z + CAM_H * 0.5, 2.6,
                 s, OX, OY, ACCENT, 1.6, 0.8)
    # status pip on the top face so the body is not a blank slab
    pip = plate(x0 + 4, y0 + 4, CAM_Z + CAM_H + 0.01, 3, 2, ACCENT, s, OX, OY, 0.7)
    return ('<g class="unit rig-context unit--webcam">%s%s%s%s%s%s%s</g>'
            % (sh, stand, neck, body, lens, glint, pip))


LAP_W, LAP_D, LAP_H = 88, 62, 5
LID_T, LID_H = 4, 52


def laptop_ports(x0, y0):
    """Sockets the cables actually plug into, in world mm.

    Both sit on faces box() draws (front = y+d, right = x+w), so a cable that
    ends here is visibly connected rather than disappearing behind the shell."""
    return {
        "serial": (x0 + 12, y0 + LAP_D + 0.5, 2.6),   # Arduino USB-B lead
        "usb": (x0 + 40, y0 + LAP_D + 0.5, 2.6),      # webcam tail
    }


def laptop(x0, y0):
    """Laptop with the lid hinged at the FAR edge.

    The old version stood the lid at y0+68 — the near edge in this projection —
    so the screen sat in front of the keyboard facing away from the viewer, and
    the screen quad was placed 5mm off its own bezel plane."""
    s = S
    yl = y0 + LID_T - 0.01          # the lid's near face; all screen art lives on it

    def panel(x, z, w, h, fill, stroke="none", op=1.0, sw=0.5):
        quad = [(x0 + x, yl, z), (x0 + x + w, yl, z),
                (x0 + x + w, yl, z + h), (x0 + x, yl, z + h)]
        return ('<polygon points="%s" fill="%s" stroke="%s" stroke-width="%.2f" opacity="%.2f"/>'
                % (pts(quad, s, OX, OY), fill, stroke, sw, op))

    def seg(xa, za, xb, zb, col, sw=1.2, op=1.0):
        return line3((x0 + xa, yl, za), (x0 + xb, yl, zb), s, OX, OY, col, sw, op)

    sh = shadow(x0 + LAP_W / 2, y0 + LAP_D / 2, LAP_W * 0.6, LAP_D * 0.6, s, OX, OY, 0.35)
    lid, _ = box(x0, y0, 0, LAP_W, LID_T, LID_H, BODY, s, OX, OY)

    # --- what the laptop is doing: a 1:1 match against a live capture ---
    screen = [panel(4, 8, LAP_W - 8, LID_H - 13, SCREEN[0], "#39414f", 1.0, 0.8)]
    screen.append(panel(4, LID_H - 10, LAP_W - 8, 5, "#132430", "none", 0.9))
    screen.append(panel(9, 13, 30, 27, "#0b1f2b"))              # camera preview
    # face-detect bracket over the preview — four corner ticks
    for cx, cz, sx, sz in ((13, 36, 1, -1), (35, 36, -1, -1), (13, 17, 1, 1), (35, 17, -1, 1)):
        screen.append(seg(cx, cz, cx + 5 * sx, cz, ACCENT, 1.3, 0.95))
        screen.append(seg(cx, cz, cx, cz + 4 * sz, ACCENT, 1.3, 0.95))
    # attendance log rows beside it — the top one is the entry just verified
    for i in range(4):
        z = 36 - i * 6
        screen.append(seg(46, z, 46 + (30 if i == 0 else [22, 26, 18][i - 1]), z,
                          ACCENT if i == 0 else "#4a6b7d", 1.6, 0.9 if i == 0 else 0.45))

    base, _ = box(x0, y0, 0, LAP_W, LAP_D, LAP_H, BODY, s, OX, OY)
    # hinge lip, so the lid reads as attached instead of stuck on
    hinge = plate(x0, y0, LAP_H + 0.01, LAP_W, LID_T + 2, "#171c24", s, OX, OY, 1, "#39414f", 0.4)
    keys = [plate(x0 + 8 + (i % 10) * 7.6, y0 + 12 + (i // 10) * 7, LAP_H + 0.02, 6, 5.4,
                  "#232a36", s, OX, OY, 1, "#39414f", 0.4) for i in range(40)]
    pad = plate(x0 + 31, y0 + 44, LAP_H + 0.02, 26, 14, "#2b3341", s, OX, OY, 1, "#3d4655", 0.6)
    return ('<g class="unit rig-context unit--laptop">%s%s%s%s%s%s%s</g>'
            % (sh, lid, "".join(screen), base, hinge, "".join(keys), pad))


BB_W, BB_D, BB_H = 70, 46, 8


def breadboard(x0, y0):
    """Solderless breadboard — in the specs table and the ₱4,245 budget, but
    never drawn until now. Nothing is wired to it; it sits in the rig as the
    prototyping surface, which is what the budget line pays for.

    Offsets are fractions of the footprint, so resizing it for the composition
    does not pull the rails and tie points out of alignment."""
    s = S
    top = BB_H + 0.02
    row = BB_D / 19.0          # tie-point row pitch
    inset = BB_W * 0.075
    sh = shadow(x0 + BB_W / 2, y0 + BB_D / 2, BB_W * 0.58, BB_D * 0.58, s, OX, OY, 0.32)
    body, _ = box(x0, y0, 0, BB_W, BB_D, BB_H, BBOARD, s, OX, OY)
    # centre channel, recessed a hair below the deck
    art = [plate(x0 + inset * 0.6, y0 + BB_D / 2 - row, top - 0.01,
                 BB_W - inset * 1.2, row * 2, "#a7aeb9", s, OX, OY, 1, "#8f96a1", 0.4)]

    def run(yy, col, sw, op, dash=None):
        art.append(line3((x0 + inset, y0 + yy, top), (x0 + BB_W - inset, y0 + yy, top),
                         s, OX, OY, col, sw, op, dash=dash))

    # power rails — red outer, blue inner, on both banks
    for f, col in ((0.055, "#d9534f"), (0.12, "#4a90d9"),
                   (0.88, "#4a90d9"), (0.945, "#d9534f")):
        run(BB_D * f, col, 1.1, 0.75)
    for f in (0.088, 0.912):
        run(BB_D * f, "#7f8792", 0.9, 0.4, dash=(row * 0.4, row * 0.62))
    # ten tie-point rows, five each side of the channel, as dashed runs
    for i in range(10):
        run(BB_D * 0.21 + (i if i < 5 else i + 2.2) * row, "#7f8792", 1.0, 0.55,
            dash=(row * 0.4, row * 0.62))
    return '<g class="unit rig-context unit--breadboard">%s%s%s</g>' % (sh, body, "".join(art))


def wire(points, color, sw=1.6, cls="wire"):
    return polyline3(points, S, OX, OY, color, sw, 0.9, cls)
