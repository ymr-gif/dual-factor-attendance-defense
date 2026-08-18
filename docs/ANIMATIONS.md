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
- **Do not use `'<'` to mean "start with the previous animation".** In the
  vendored anime build it appends, exactly like the default position. Verified
  with a two-tween timeline: the result ran 2000ms, not 1000ms. For a genuine
  overlap use `'-=<previous duration>'`, or an absolute number of milliseconds

## Phase 1 — Skeleton (all shipped)

| data-anim | Current animation |
|-----------|-------------------|
| `title` | School fades, shield scales, checkmark draws, S.A.F.E. scrambles, team staggers |
| `problem` | **3 steps.** A week of the attendance sheet fills by hand (names drawn, ticks, blanks, lates); a tick is then drawn into a box that was blank and flagged red; UNVERIFIED stamps down |
| `solution` | NFC and Face slide in, the vtuber portrait fades up, a green reticle locks on, a glowing green line sweeps top to bottom (2100ms) while a band of projector dots tracks it — each row rises and falls as the beam passes — then IDENTITY VERIFIED at 2x |
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
| 2026-08-19 | `problem` | 200px icon → full ruled logbook page on three presenter-driven steps; handwriting drawn as SVG paths via `createDrawable` | The slide holds a 1:15 slot and stopped moving after 3s. Paper and ink deliberately oppose slide 3's scan |
| 2026-08-19 | `problem` | Signature column → a week of tick boxes (`FULL NAME` + MON–FRI, ticks, blanks for absent, `L` for late). Beat 2 draws a tick into a box that was blank and rings it: PRESENT OR ABSENT? Subtitle softened to "Recorded by hand, without verification" | A tick box shows the gap better than a signature does — the sheet records a mark, never who made it. The softer subtitle describes the process instead of judging it, so the panel is not invited to argue |
| 2026-08-19 | All | Slides are stripped back to their CSS resting state when left, and again before being shown | A revisited slide painted the state it was left in — finished handwriting appeared for a moment, then animated again |
| 2026-08-19 | `solution` | Scan overlay added: reticle, sweeping glow line, and a 16x19 dot grid revealed row by row; IDENTITY VERIFIED moved to after the scan; `.solution-merge` given the resting state and entrance it never had | The dot grid is the pattern a real face scanner projects, so the beat shows the mechanism the study relies on. The verdict has to land after the scan, not before it |
| 2026-08-19 | `solution` | Scan turned green and slowed to 2100ms; dots now rise and fall as a band tracking the beam instead of filling in and staying; edge fade moved off `.vtuber-3d` onto a `.vtuber-3d__fade` overlay beneath `.scan`; verdict text doubled | The container mask was dimming the scan along with the model. Dots that persist read as a static grid; dots that follow the beam read as tracking. The verdict has to carry to the back of a hall |
| 2026-08-18 | `architecture` | Reordered flow, added notify node, emoji → SVG icons | Camera fired after the backend; notification was missing; emoji render inconsistently on projector laptops |
| 2026-08-18 | `rq` | Added "RESEARCH QUESTION" eyebrow above the number | Panel could not tell at a glance that slides 9–11 are the research questions |
| 2026-08-18 | `survey` | 12 → 20 items per version, per-characteristic count badges | Instrument revised to 5 items per characteristic |
| 2026-08-18 | `hardware` | Step 2 rebuilt in WebGL: PBR board built from primitives, studio environment, camera framed on the exploded bounds, HTML callouts tracking projected part positions | Apple-style product explosion; the isometric version stays as the fallback |
| 2026-08-18 | All | Added CSS resting states for every entrance, reset inline styles on slide entry, play on the next frame instead of a 100ms timer, slide cross-fade 800ms → 260ms with an instant exit | Slides painted their finished content for a beat before animating, and the outgoing slide ghosted over the incoming one |
| 2026-08-18 | `hardware` | Spec card grid replaced with the isometric rig and the exploded Arduino, on two presenter-driven steps | The hero moment of the deck; spec text now labels the objects it describes |
| 2026-08-18 | `hardware` | Step 2's built-in primitive board replaced with a Blender-processed scan of a real Arduino Uno (textured PCB, decimated/classified parts); bake.js and model-loader.js extended to carry UV + base colour/roughness maps as embedded textures; fixed a latent label-tracking bug where every model-loaded part projected to nearly the same screen point; added on-screen CC BY credit | Code-built primitives read as "video game Arduino," not evidence; the label bug only surfaced once a real multi-part model existed to expose it |
