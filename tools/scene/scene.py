"""Builds the hardware scene SVG: rig units + an Arduino that explodes into parts."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from iso import *

S = 3.05          # px per mm

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
    s = S
    W, D, T = 54, 34, 0.9
    body, _ = box(x0, y0, z0, W, D, T, CARD, s, OX, OY)
    art = [
        plate(x0 + 5, y0 + 5, z0 + T + 0.01, W - 10, D - 10, "none", s, OX, OY, 0.6, ACCENT, 0.5),
        ring(x0 + 40, y0 + 17, z0 + T + 0.02, 5, s, OX, OY, ACCENT, 1.0, 0.65),
        ring(x0 + 40, y0 + 17, z0 + T + 0.02, 8, s, OX, OY, ACCENT, 1.0, 0.4),
    ]
    return '<g class="unit rig-context unit--card">%s%s</g>' % (body, "".join(art))


def webcam(x0, y0, sc=1.0):
    s = S * sc
    sh = shadow(x0 + 15, y0 + 9, 22, 14, s, OX, OY, 0.35)
    stand, _ = box(x0 - 1, y0 - 1, 0, 32, 20, 2.0, DARK, s, OX, OY)
    neck, _ = box(x0 + 11, y0 + 7, 2.0, 8, 5, 8, DARK, s, OX, OY)
    body, _ = box(x0, y0, 10, 30, 18, 17, BODY, s, OX, OY)
    lens = ring(x0 + 30.01, y0 + 9, 18.5, 5.5, s, OX, OY, "#0b1116", 6.0, 1.0)
    glint = ring(x0 + 30.05, y0 + 9, 18.5, 2.6, s, OX, OY, ACCENT, 1.6, 0.8)
    return '<g class="unit rig-context unit--webcam">%s%s%s%s%s%s</g>' % (sh, stand, neck, body, lens, glint)


def laptop(x0, y0, sc=1.0):
    s = S * sc
    sh = shadow(x0 + 48, y0 + 34, 62, 46, s, OX, OY, 0.35)
    base, _ = box(x0, y0, 0, 96, 68, 5, BODY, s, OX, OY)
    pad = plate(x0 + 34, y0 + 8, 5.02, 28, 20, "#2b3341", s, OX, OY, 1, "#3d4655", 0.6)
    keys = [plate(x0 + 10 + (i % 10) * 7.6, y0 + 34 + (i // 10) * 7, 5.02, 6, 5.4, "#232a36",
                  s, OX, OY, 1, "#39414f", 0.4) for i in range(40)]
    lid, _ = box(x0, y0 + 68, 0, 96, 5, 62, BODY, s, OX, OY)
    quad = [(x0 + 4, y0 + 68 - 0.01, 4), (x0 + 92, y0 + 68 - 0.01, 4),
            (x0 + 92, y0 + 68 - 0.01, 58), (x0 + 4, y0 + 68 - 0.01, 58)]
    screen = ['<polygon points="%s" fill="%s" stroke="%s" stroke-width="0.8"/>'
              % (pts(quad, s, OX, OY), SCREEN[0], "#39414f")]
    for i in range(5):
        z = 12 + i * 9
        screen.append(line3((x0 + 12, y0 + 67.9, z), (x0 + 12 + [58, 40, 66, 30, 50][i], y0 + 67.9, z),
                            s, OX, OY, ACCENT, 1.6, 0.45 - i * 0.05))
    return ('<g class="unit rig-context unit--laptop">%s%s%s%s%s%s</g>'
            % (sh, lid, "".join(screen), base, pad, "".join(keys)))


def wire(points, color, sw=1.6, cls="wire"):
    return polyline3(points, S, OX, OY, color, sw, 0.9, cls)
