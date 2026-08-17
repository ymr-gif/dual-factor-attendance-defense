# Animation Concepts

> CHANGE FREELY. These are starting points. Swap, tweak, replace
> based on taste, feedback, or new ideas. Only rule: minimal, visual, impactful.

## Global Animation Rules

- Duration: 600-1200ms per transition
- Easing: `easeOutExpo` or spring for natural feel
- No animation should feel slow — cut if it drags
- If in doubt, remove — simplicity wins
- All animations play on keyboard/click trigger, not autoplay

---

## Slide 1: Title — "S.A.F.E."

### Concept
Scramble text resolves "S.A.F.E." from random characters. Team names stagger fade in below.

### Visual References
- [Scramble Text Playground](https://codepen.io/juliangarnier/pen/gbLOvrw) — Official anime.js v4 demo
- [Scramble Text Docs](https://animejs.com/documentation/text/scrambletext/) — API reference
- [IBM THINK](https://codepen.io/ainalem/pen/WORzLN) — Text reveal with SVG blend modes

### Alternatives
- Typewriter effect (character-by-character reveal)
- Particle assembly (letters form from scattered dots)
- Glitch decode (CRT-style scan lines resolving text)

### Status
- [ ] Not started

---

## Slide 2: The Problem

### Concept
Fingerprint icon → SVG morphs to broken/rejected state → X stamp appears with spring bounce.

### Visual References
- [SVG Morphing](https://codepen.io/Paolo-Duzioni/pen/jvrxpL) — Basic polygon morph
- [morphTo Docs](https://animejs.com/documentation/svg/morphto/) — Official API
- [Banksy Morph](https://codepen.io/ainalem/pen/wdQzBB) — Complex 87-node SVG morph
- [Red Stapler Tutorial](https://redstapler.co/svg-morphing-animation-animejs/) — Step-by-step morph guide

### Alternatives
- Glitch/distortion effect on the icon
- Color bleed (icon fills with red, cracks appear)
- Shatter animation (icon breaks into pieces)

### Status
- [ ] Not started

---

## Slide 3: NFC + Face

### Concept
NFC card icon and face icon animate from opposite sides, merge in center. Motion path convergence.

### Visual References
- [createMotionPath Docs](https://animejs.com/documentation/svg/createmotionpath/) — Animate along path
- [Motion Path CodePen](https://codepen.io/Shokeen/pen/Ngrjqo/) — Element following SVG path
- [Layered Animations](https://codepen.io/juliangarnier/pen/LMrddV) — Multiple elements, layered timing

### Alternatives
- Icons orbit each other before settling
- One icon "scans" the other (beam animation)
- Merge into a single combined icon

### Status
- [ ] Not started

---

## Slide 4: Liveness Detection

### Concept
Photo/screen icon → "REJECTED" stamp slams down with spring bounce.

### Visual References
- [Spring Easing](https://animejs.com/documentation/easings/spring/) — Physics-based spring
- [Achievement Animation](https://codepen.io/Rowanism/pen/XgeqPb) — Pop-in with bounce

### Alternatives
- Shatter effect (photo cracks and falls away)
- Scan line passes, photo fades
- X mark draws itself (stroke animation)

### Status
- [ ] Not started

---

## Slide 5: Architecture

### Concept
System diagram — nodes cascade in left-to-right, arrows draw between them.

### Visual References
- [SVG Line Drawing](https://animejs.com/documentation/svg/createdrawable/) — Stroke animation
- [Advanced Staggering](https://codepen.io/juliangarnier/pen/MZXQNV) — Grid stagger
- [Grid Staggering Demo](https://codepen.io/juliangarnier/pen/XvjWvx) — Official demo
- [Stagger Docs](https://animejs.com/documentation/utilities/stagger/) — Full API

### Alternatives
- Nodes pop in simultaneously with scale spring
- Blueprint style (white lines on dark, drawing effect)
- Flowchart builds top-to-bottom instead of left-to-right

### Status
- [ ] Not started

---

## Slides 6-8: Research Questions

### Concept
"1" / "2" / "3" scales in with spring bounce. Question mark icon spins.

### Visual References
- [Staggered Layout](https://animejs.com/documentation/layout/usage/staggered-layout-animation/) — Layout animation
- [Easings Visualizer](https://codepen.io/juliangarnier/pen/dwKGoW) — All easing curves

### Alternatives
- Numbers count up (1→1→1 with counter effect)
- Each RQ has unique icon that morphs in
- Cards flip to reveal question content

### Status
- [ ] Not started

---

## Slide 9: Instruments

### Concept
Icons for each instrument (log, trial record, survey) pop in with stagger.

### Visual References
- [SVG Icon Animations](https://codepen.io/collection/XLebem/) — Julian's v3 collection
- [Animated Hexagon Logo](https://codepen.io/hexagoncircle/pen/gjPoxN) — Shape animations

### Alternatives
- Instruments appear as floating cards
- Checklist animation (items check off one by one)
- Tool reveal (instruments slide out from a toolbox)

### Status
- [ ] Not started

---

## Slide 10: Hardware Specs

### Concept
Component icons grid lights up row by row, each card enters with stagger.

### Visual References
- [Stagger Animation Week 18](https://codepen.io/knyttneve/pen/vMqmKb) — Artistic stagger
- [Grid Loading](https://tympanus.net/codrops/2017/04/11/inspiration-for-grid-loading-animations/) — Grid patterns

### Alternatives
- Cards cascade in from bottom
- Each component "plugs in" to a diagram
- Circuit board trace animation connecting components

### Status
- [ ] Not started

---

## Slide 11: Testing Protocols

### Concept
Split layout: Protocol 1 (left) and Protocol 2 (right) enter separately.

### Visual References
- [Timeline Demo](https://codepen.io/calvindavis/pen/dqYYOL) — Sequential animations
- [Timeline Docs](https://animejs.com/documentation/timeline/) — Official API

### Alternatives
- Two columns slide in from opposite sides
- Protocol numbers count up
- Stopwatch/test tube icons animate

### Status
- [ ] Not started

---

## Slides 12-14: Survey

### Concept
Table rows cascade in with stagger. Animated bar chart replaces Likert text.

### Visual References
- [Stagger Docs](https://animejs.com/documentation/utilities/stagger/) — Row timing
- [Flower Timeline](https://frontendin.com/anime-js-examples/) — Timeline sequencing

### Alternatives
- Rows fade in with slight translateX
- Bar chart bars grow from zero
- Likert scale dots fill left-to-right

### Status
- [ ] Not started

---

## Slide 15: Thank You

### Concept
All text splits into words, flies out in directions. Reassembles after pause.

### Visual References
- [Text Split API](https://animejs.com/documentation/text/splittext/) — Word/char splitting
- [Thank You Animation](https://frontendin.com/anime-js-examples/) — Closing animation

### Alternatives
- Reverse scatter (words assemble from chaos)
- Fade to school logo
- Question mark morphs into logo

### Status
- [ ] Not started

---

## Change Log

| Date | Slide | Change | Reason |
|------|-------|--------|--------|
| 2026-08-17 | All | Initial concepts | Planning phase |
