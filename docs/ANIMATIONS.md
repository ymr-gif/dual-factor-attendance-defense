# Animation State

> Two phases. **Phase 1 (done):** every slide has a skeleton animation — entrances,
> staggers, stamps. Structure and content are locked in.
> **Phase 2 (next):** heavy set pieces on the slides that carry the story.
> Change anything here freely. Only rule: minimal, visual, impactful.

## Global Rules

- Duration 600–1200ms per beat; cut anything that drags
- Easing: `outExpo` default, `outBack` / `outElastic` for impacts
- Animations trigger on navigation, never autoplay
- Every function is keyed by `data-anim` and receives its slide element
- Queries are scoped with `q()` / `qa()` — never global selectors
- Anything animated in from 0 must also rest at 0 in CSS — see the no-flash
  rules in `ARCHITECTURE.md`

## Phase 1 — Skeleton (all shipped)

| data-anim | Current animation |
|-----------|-------------------|
| `title` | School fades, shield scales, checkmark draws, S.A.F.E. scrambles, team staggers |
| `problem` | Logbook draws, ruled lines scrawl in, UNVERIFIED stamps down with back-ease |
| `solution` | NFC and Face slide in from opposite sides, `+` pops, verdict rises |
| `liveness` | Photo appears, scan line sweeps, ✕ stamp slams |
| `notify` | Verified badge pops, dot trail fires across, phone slides in, envelope pops, chips rise |
| `framework` | IPO stages stagger left to right, arrows draw, list items cascade, feedback bar widens |
| `architecture` | Seven nodes cascade with scale, arrows draw between them |
| `hardware` | **Step 1:** rig units drop in, jumper wires draw themselves, labels attach. **Step 2:** the rig clears and a real-time WebGL Arduino takes over — parts lift off the board under studio lighting while callout labels track them. Falls back to the isometric explode without WebGL |
| `rq` | "RESEARCH QUESTION" eyebrow fades in with drawing rules, number elastic-scales, icon pops, label and stat rise (shared by slides 9–11) |
| `instruments` | Three cards stagger up |
| `protocols` | Two halves enter from opposite sides, divider draws |
| `survey` | Version cards scale in, trait chips with item-count badges stagger, footnote fades |
| `scale` | Interpretation rows cascade upward from the bottom band |
| `scope` | In and Out columns split apart, divider draws, items cascade |
| `output` | Three deliverable cards stagger up |
| `thanks` | Words rise, question line fades |

## Phase 2 — Heavy Set Pieces (planned)

Do these one at a time. Each is a full scene, not an entrance.

### 1. Hardware exploded view — `hardware` — SHIPPED 2026-08-18
Two beats on one slide. The guardpost rig assembles — RC522, MIFARE card,
Arduino, webcam, laptop, jumper wires drawing between them. Next press: the rest
fades, the camera pushes into the Arduino, and thirteen parts lift off the board
with leader lines naming them.

- Art: generated isometric SVG, `tools/scene/` — original, drawn from reference
- Lift distances live on `data-rise`; the camera lives in `compose.py`
- Still open: parts fan only along Z. Adding a slight lateral drift, and a
  reassembly on the way back, would sell it further.

### 2. Architecture packet flow — `architecture`
A pulse travels the seven nodes: card tap lights the reader, packet moves to
FastAPI, camera shutter fires, match and liveness resolve, log writes, envelope
flies out. Nodes light as the pulse passes.

- Hook: `.arch-node--1` … `--7` are already numbered for per-node targeting
- Technique: motion path along the arrow row + per-node glow timeline

### 3. Liveness spoof comparison — `liveness`
Split scene: real face passes, printed photo fails. Texture/frequency overlay
scanning both, scores counting up in opposite directions.

### 4. Title assembly — `title`
Shield builds from scattered NFC and face fragments before the scramble resolves.

### 5. Notification arc — `notify`
Replace the dot trail with an arced motion path and a latency counter ticking
from 0.0s to the delivery number.

## Anime.js v4 Reference

```js
const { animate, stagger, createTimeline, svg, utils, scrambleText } = anime;

createTimeline({ defaults: { ease: 'outExpo' } })
  .add(el, { opacity: [0, 1], y: [20, 0], duration: 500 })
  .add(els, { scale: [0, 1], delay: stagger(120) }, '-=200');

animate(svg.createDrawable('.line'), { draw: '0 1', ease: 'inOutExpo' });
animate('.title', { innerHTML: scrambleText({ chars: 'A-Z0-9' }) });
```

## Change Log

| Date | Slide | Change | Reason |
|------|-------|--------|--------|
| 2026-08-17 | All | Initial concepts | Planning phase |
| 2026-08-18 | All | Keyed animations by `data-anim`, scoped queries to the slide element | Slides can be inserted or reordered without renumbering animation code |
| 2026-08-18 | `notify`, `framework`, `scope`, `output` | New slides and animations | Guardian notification, IPO paradigm, scope, and expected output were missing from the deck |
| 2026-08-18 | `survey`, `scale` | Replaced invented bar chart and percentage ring with instrument structure and interpretation ranges | Proposal stage — the study has no results yet |
| 2026-08-18 | `problem` | Fingerprint icon → logbook; REJECTED → UNVERIFIED | The study uses no fingerprints; the problem is the manual logbook |
| 2026-08-18 | `architecture` | Reordered flow, added notify node, emoji → SVG icons | Camera fired after the backend; notification was missing; emoji render inconsistently on projector laptops |
| 2026-08-18 | `rq` | Added "RESEARCH QUESTION" eyebrow above the number | Panel could not tell at a glance that slides 9–11 are the research questions |
| 2026-08-18 | `survey` | 12 → 20 items per version, per-characteristic count badges | Instrument revised to 5 items per characteristic |
| 2026-08-18 | `hardware` | Step 2 rebuilt in WebGL: PBR board built from primitives, studio environment, camera framed on the exploded bounds, HTML callouts tracking projected part positions | Apple-style product explosion; the isometric version stays as the fallback |
| 2026-08-18 | All | Added CSS resting states for every entrance, reset inline styles on slide entry, play on the next frame instead of a 100ms timer, slide cross-fade 800ms → 260ms with an instant exit | Slides painted their finished content for a beat before animating, and the outgoing slide ghosted over the incoming one |
| 2026-08-18 | `hardware` | Spec card grid replaced with the isometric rig and the exploded Arduino, on two presenter-driven steps | The hero moment of the deck; spec text now labels the objects it describes |
| 2026-08-18 | `hardware` | Step 2's built-in primitive board replaced with a Blender-processed scan of a real Arduino Uno (textured PCB, decimated/classified parts); bake.js and model-loader.js extended to carry UV + base colour/roughness maps as embedded textures; fixed a latent label-tracking bug where every model-loaded part projected to nearly the same screen point; added on-screen CC BY credit | Code-built primitives read as "video game Arduino," not evidence; the label bug only surfaced once a real multi-part model existed to expose it |
