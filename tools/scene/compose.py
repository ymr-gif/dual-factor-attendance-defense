import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from iso import *
import scene
from scene import (S, OX, OY, arduino, rc522, nfc_card, webcam, laptop, wire,
                   rc522_pin, arduino_pin, arduino_usb, webcam_port, laptop_ports,
                   LAP_W, LAP_D, CAM_W, CAM_D)

VB_W, VB_H = 1280, 570


# ---------- placement ----------
# Units are positioned by where they should land ON SCREEN, and the world
# coordinate is solved back out. Composing in mm was guesswork; composing in
# screen space is what the slide is actually judged on.
def place(sx, sy, w=0.0, d=0.0, z=0.0):
    """World (x0, y0) putting a w x d footprint's centre at screen (sx, sy)."""
    u = (sx - OX) / (COS30 * S)
    v = (sy - OY + z * S) / (0.5 * S)
    return ((u + v) / 2 - w / 2, (v - u) / 2 - d / 2)


RC   = place(300, 400, 60, 40, 2)
CARD = place(300, 245, 54, 34, 33) + (33,)
ARD  = place(645, 415, 68.6, 53.4, 2)
LAP  = place(1000, 320, LAP_W, LAP_D, 2.5)
CAM  = place(792, 150, CAM_W, CAM_D, 20)

units = []
units.append((laptop(*LAP), LAP[0] + LAP[1] + 100))
units.append((webcam(*CAM), CAM[0] + CAM[1]))
units.append((rc522(*RC), RC[0] + RC[1]))
units.append((arduino(*ARD), ARD[0] + ARD[1] + 40))
units.append((nfc_card(*CARD), CARD[0] + CARD[1] + 60))

# ---------- wires ----------
# Every endpoint comes from the port helper on the object it plugs into, so a
# cable cannot drift away from its socket the way the old hand-tuned ones did.
PORT = laptop_ports(*LAP)

# Two layers, because the two kinds of cable sit differently in the real rig.
# `cables` are the USB tails — they run on the desk, so they render BEHIND the
# units and every route below stays clear of the footprints it passes.
# `jumpers` lie on top of the boards they connect, so they render AFTER the
# units; drawn behind, their endpoints vanish under the very headers they
# plug into and only a stub shows in the gap.
cables = []
jumpers = []

# RC522 header -> Arduino D2 header: three jumpers arcing over the gap, each
# riding a little higher and wider than the last so they read as three wires.
for i, col in enumerate(("#ff6b6b", "#ffd166", "#06d6a0")):
    a = rc522_pin(*RC, i)
    b = arduino_pin(*ARD, i)
    jumpers.append(wire([
        a,
        (a[0] + 4, a[1] - 9, 13.5 + i * 1.2),
        ((a[0] + b[0]) / 2 - 4, 74 + i * 2.5, 17 + i * 1.6),
        (b[0] - 8, b[1] + 11, 13 + i * 1.2),
        b,
    ], col, 2.0))

# Arduino USB-B -> laptop. Leaves on the board's left edge, drops to the desk,
# runs back along the left side and crosses the open gap behind the Arduino.
u = arduino_usb(*ARD)
p = PORT["serial"]
cables.append(wire([
    u,
    (u[0] - 5, u[1] - 6, 1.5),
    (u[0] - 7, ARD[1] + 4, 1.5),
    (p[0] - 22, p[1] + 16, 1.5),
    (p[0] - 8, p[1] + 6, 1.5),
    p,
], "#79838f", 2.2))

# webcam foot -> laptop. Comes forward past the laptop's front edge first, so
# the run never disappears behind the shell.
c = webcam_port(*CAM)
p = PORT["usb"]
cables.append(wire([
    c,
    (c[0] + 4, c[1] + 18, 1.2),
    (c[0] + 16, p[1] + 6, 1.2),
    (p[0] - 12, p[1] + 7, 1.2),
    p,
], "#79838f", 2.2))


# ---------- act 1 labels ----------
def label(cls, text, sub, anchor_world, dx, dy, align="start"):
    ax, ay = iso(*anchor_world, s=S, ox=OX, oy=OY)
    lx, ly = ax + dx, ay + dy
    leader = ('<path class="lead" d="M %.1f %.1f L %.1f %.1f" fill="none" stroke="%s" '
              'stroke-width="1" opacity="0.5"/>' % (ax, ay, lx, ly, ACCENT))
    dot = '<circle class="lead-dot" cx="%.1f" cy="%.1f" r="2.4" fill="%s"/>' % (ax, ay, ACCENT)
    tx = lx + (8 if align == "start" else -8)
    return ('<g class="%s" text-anchor="%s">%s%s'
            '<text class="lbl" x="%.1f" y="%.1f">%s</text>'
            '<text class="lbl-sub" x="%.1f" y="%.1f">%s</text></g>'
            % (cls, align, leader, dot, tx, ly - 4, text, tx, ly + 15, sub))


rig_labels = [
    label("rig-label", "MIFARE Card", "Student credential",
          (CARD[0] + 39, CARD[1] + 17, 34), 150, -74, "start"),
    label("rig-label", "RC522", "13.56 MHz NFC reader",
          (RC[0] + 20, RC[1] + 20, 2), -70, 104, "start"),
    label("rig-label", "Arduino", "Serial relay",
          (ARD[0] + 34, ARD[1] + 27, 2), 6, 116, "start"),
    label("rig-label", "Webcam", "Logitech 1080p",
          (CAM[0] + 15, CAM[1] + 9, 30), 52, -66, "start"),
    label("rig-label", "Laptop", "Acer Nitro 5 · GTX 1050",
          (LAP[0] + 44, LAP[1] + 40, 5), 66, 118, "start"),
]

# ---------- act 2: zoom transform ----------
# The stage scales about the Arduino's centre, then shifts so the board lands
# in the middle of the frame. Part labels are placed in post-zoom screen space.
ZOOM = 1.45
ARD_C = iso(ARD[0] + 34.3, ARD[1] + 26.7, 0, S, OX, OY)
TARGET = (566, 352)
TX = TARGET[0] - ARD_C[0]
TY = TARGET[1] - ARD_C[1]

from scene import RISE


def zoom(p):
    return (ARD_C[0] + (p[0] - ARD_C[0]) * ZOOM + TX,
            ARD_C[1] + (p[1] - ARD_C[1]) * ZOOM + TY)


def screen_label(cls, text, sub, sx, sy, dx, dy, align="start"):
    lx, ly = sx + dx, sy + dy
    leader = ('<path class="lead" d="M %.1f %.1f L %.1f %.1f" fill="none" stroke="%s" '
              'stroke-width="1" opacity="0.5"/>' % (sx, sy, lx, ly, ACCENT))
    dot = '<circle class="lead-dot" cx="%.1f" cy="%.1f" r="2.6" fill="%s"/>' % (sx, sy, ACCENT)
    tx = lx + (8 if align == "start" else -8)
    return ('<g class="%s" text-anchor="%s">%s%s'
            '<text class="lbl" x="%.1f" y="%.1f">%s</text>'
            '<text class="lbl-sub" x="%.1f" y="%.1f">%s</text></g>'
            % (cls, align, leader, dot, tx, ly - 4, text, tx, ly + 15, sub))


def part_label(part, text, sub, world, dx, dy, align="start"):
    """world: a point on the part, in mm. Rise is applied before the zoom."""
    sx, sy = iso(*world, s=S, ox=OX, oy=OY)
    sx, sy = zoom((sx, sy - RISE[part]))
    return screen_label("part-label part-label--" + part, text, sub, sx, sy, dx, dy, align)


part_labels = [
    part_label("hdr-d2", "Headers", "RC522 jumpers land here",
               (ARD[0] + 50, ARD[1] + 49, 10), 90, -30, "start"),
    part_label("usb", "USB-B", "Serial link to the laptop",
               (ARD[0] + 5, ARD[1] + 38, 13), -70, -20, "end"),
    part_label("mcu", "ATmega328P", "Reads the card ID, relays it",
               (ARD[0] + 45, ARD[1] + 24, 6), 110, 10, "start"),
    part_label("jack", "Power Jack", "7–12 V input",
               (ARD[0] + 4, ARD[1] + 9, 13), -90, 20, "end"),
    part_label("xtal", "16 MHz Crystal", "Clock source",
               (ARD[0] + 23, ARD[1] + 32, 5), -110, 20, "end"),
    part_label("pcb", "PCB", "68.6 × 53.4 mm",
               (ARD[0] + 62, ARD[1] + 8, 1.6), 80, 40, "start"),
]


# ---------- composition report ----------
def bounds(x0, y0, w, d, zmax, zmin=0.0):
    """Projected extent of a footprint, so drift off-frame is caught here."""
    corners = [(x0 + a * w, y0 + b * d, c)
               for a in (0, 1) for b in (0, 1) for c in (zmin, zmax)]
    ps = [iso(*p, s=S, ox=OX, oy=OY) for p in corners]
    return (min(p[0] for p in ps), min(p[1] for p in ps),
            max(p[0] for p in ps), max(p[1] for p in ps))


report = [
    ("rc522", bounds(*RC, 60, 40, 8.6)),
    ("card", bounds(CARD[0], CARD[1], 54, 34, CARD[2] + 1, CARD[2])),
    ("arduino", bounds(*ARD, 68.6, 53.4, 12.6)),
    ("webcam", bounds(*CAM, CAM_W, CAM_D, 28.5)),
    ("laptop", bounds(*LAP, LAP_W, LAP_D, 52)),
]
print("viewBox %dx%d   S=%.2f" % (VB_W, VB_H, S))
for name, b in report:
    flag = "  <-- OFF FRAME" if b[0] < 0 or b[2] > VB_W or b[1] < 0 or b[3] > VB_H else ""
    print("  %-8s x %7.1f..%-7.1f  y %7.1f..%-7.1f%s" % (name, b[0], b[2], b[1], b[3], flag))
print("ARD_C=%.1f,%.1f  TX=%.1f TY=%.1f" % (ARD_C[0], ARD_C[1], TX, TY))

svg = f'''<svg class="rig-svg" viewBox="0 0 {VB_W} {VB_H}" xmlns="http://www.w3.org/2000/svg">
  <g class="rig-stage">
    <g class="wires rig-context">
{chr(10).join(cables)}
    </g>
{sort_join(units)}
    <g class="wires wires--top rig-context">
{chr(10).join(jumpers)}
    </g>
  </g>
  <g class="rig-labels">
{chr(10).join(rig_labels)}
  </g>
  <g class="part-labels">
{chr(10).join(part_labels)}
  </g>
</svg>'''

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'scene.svg')
open(OUT, 'w').write(svg)
print("wrote %s (%d bytes)" % (OUT, len(svg)))
