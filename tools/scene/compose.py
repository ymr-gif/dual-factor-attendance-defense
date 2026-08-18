import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from iso import *
import scene
from scene import S, OX, OY, arduino, rc522, nfc_card, webcam, laptop, wire

VB_W, VB_H = 1280, 570

# ---------- unit placement (world mm) ----------
ARD = (10, 10)
RC  = (-70, 90)
CARD = (-67, 93, 32)
CAM = (-46, -40)
LAP = (52, -88)
LAP_SC = 0.78
CAM_SC = 0.9

units = []
units.append((laptop(*LAP, sc=LAP_SC), LAP[0] + LAP[1] + 100))
units.append((webcam(*CAM, sc=CAM_SC), CAM[0] + CAM[1]))
units.append((rc522(*RC), RC[0] + RC[1]))
units.append((arduino(*ARD), ARD[0] + ARD[1] + 40))
units.append((nfc_card(*CARD), CARD[0] + CARD[1] + 60))

# ---------- wires ----------
wires = []
# RC522 header -> Arduino analog header (three jumpers with a slight sag)
for i, col in enumerate(("#ff6b6b", "#ffd166", "#06d6a0")):
    wires.append(wire([
        (RC[0] + 46 + i * 4, RC[1] + 34, 8.5),
        (RC[0] + 62 + i * 4, RC[1] + 28, 1.5),
        (RC[0] + 78 + i * 2, RC[1] - 14 - i * 3, 1.2),
        (ARD[0] - 8 - i * 2, ARD[1] - 14, 1.2),
        (ARD[0] + 14 + i * 5, ARD[1] - 6, 1.5),
        (ARD[0] + 14 + i * 5, ARD[1] + 3, 9.5),
    ], col, 1.6))
# Arduino USB -> laptop
wires.append(wire([(ARD[0] - 3, ARD[1] + 38, 6),
                   (ARD[0] - 14, ARD[1] + 20, 1.2),
                   (ARD[0] - 14, ARD[1] - 30, 1.2),
                   (LAP[0] - 20, LAP[1] + 35, 1.2),
                   (LAP[0] - 2, LAP[1] + 30, 3.5)], "#79838f", 2.0))
# webcam -> laptop
wires.append(wire([(CAM[0] + 30, CAM[1] + 16, 1.0),
                   (CAM[0] + 56, CAM[1] - 10, 1.0),
                   (LAP[0] + 10, LAP[1] - 6, 1.0),
                   (LAP[0] + 16, LAP[1] + 4, 3.5)], "#79838f", 2.0))

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
            % (cls, align, leader, dot, tx, ly - 3, text, tx, ly + 13, sub))

rig_labels = [
    label("rig-label", "RC522", "13.56 MHz NFC reader", (RC[0] + 20, RC[1] + 20, 2), -60, 95, "start"),
    label("rig-label", "MIFARE Card", "Student credential", (CARD[0] + 27, CARD[1] + 17, 31), -78, -70, "end"),
    label("rig-label", "Arduino", "Serial relay", (ARD[0] + 34, ARD[1] + 27, 2), 8, 118, "start"),
    label("rig-label", "Webcam", "Logitech 1080p", (CAM[0] + 15, CAM[1] + 9, 30), 34, -78, "start"),
    label("rig-label", "Laptop", "Acer Nitro 5 · GTX 1050", (LAP[0] + 48, LAP[1] + 34, 5), 40, 116, "start"),
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
            % (cls, align, leader, dot, tx, ly - 3, text, tx, ly + 13, sub))


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

print("ARD_C=%.1f,%.1f  TX=%.1f TY=%.1f" % (ARD_C[0], ARD_C[1], TX, TY))

svg = f'''<svg class="rig-svg" viewBox="0 0 {VB_W} {VB_H}" xmlns="http://www.w3.org/2000/svg">
  <g class="rig-stage">
    <g class="wires rig-context">
{chr(10).join(wires)}
    </g>
{sort_join(units)}
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
