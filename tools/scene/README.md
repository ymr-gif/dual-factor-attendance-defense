# Isometric scene generator

Draws the prototype rig on slide 8 — RC522, MIFARE card, Arduino, webcam,
laptop, jumper wires — as isometric SVG, plus the labels for both steps.
Original artwork; the reference photos were only used to get proportions right.

## Regenerate

```
python3 tools/scene/compose.py          # writes tools/scene/scene.svg
python3 tools/scene/embed.py            # drops it into index.html
```

## Files

| File | Contents |
|------|----------|
| `iso.py` | Projection maths and primitives: `box`, `plate`, `ring`, `shadow`, `line3` |
| `scene.py` | The objects: `arduino`, `rc522`, `nfc_card`, `webcam`, `laptop`, plus the `RISE` table |
| `compose.py` | Placement, wire routing, labels, and the act-2 zoom |
| `embed.py` | Replaces the `<svg class="rig-svg">` block in `index.html` |

## Two things the animation reads

- `data-rise` on each `.part` group — how far it lifts in the exploded view.
  `RISE` in `scene.py` is the source of truth; `animations.js` just reads it.
- `ZOOM`, `ARD_C`, `TARGET` in `compose.py` — the act-2 camera. If you change
  them, update the matching numbers in `hardware()` in `src/js/animations.js`
  and `transform-origin` on `.rig-stage` in `src/css/layout.css`.
