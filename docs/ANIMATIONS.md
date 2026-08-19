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
- **Keyframes must be plain value arrays.** The per-property
  `{ to: [...], ease }` form silently keeps only the first two stops in this
  build — `scale: { to: [0.96, 1.06, 1] }` ends stuck at 1.06 and never
  settles to 1. Write `scale: [0.96, 1.06, 1]` and set the ease on the tween
- **Transform properties must share one tween.** `x`/`y`/`scale`/`rotate`
  split across separate `.add()` calls become separate animations all writing
  the same `transform`, and the later one clobbers the other's axis

## Phase 1 — Skeleton (all shipped)

| data-anim | Current animation |
|-----------|-------------------|
| `title` | School fades, shield scales, checkmark draws, S.A.F.E. scrambles, team staggers |
| `problem` | **3 steps.** A week of the attendance sheet fills by hand (names drawn, ticks, blanks, lates); a tick is then drawn into a box that was blank and flagged red; UNVERIFIED stamps down |
| `solution` | NFC and Face slide in, the vtuber portrait fades up, a green reticle locks on, a glowing green line sweeps top to bottom (2100ms) while a band of projector dots tracks it — each row rises and falls as the beam passes — then IDENTITY VERIFIED at 2x |
| `liveness` | Photo appears, scan line sweeps, ✕ stamp slams (left scene). Phone slides in from the true screen edge on a hero angle, screen off, rocks in a bounded front-facing wobble forever, and — timed off the same `window.phone3D.timing` schedule the left scene now reads — sweeps its own scan-line and takes a red ✕ stamp in sync with the left scene's (right scene, `phone-3d.js`) |
| `notify` | Verified badge pops, dot trail fires across, phone slides in, envelope pops, chips rise |
| `framework` | IPO stages cascade left to right with overlapping entrances — each rises, overshoots and swells to 1.06 before settling, in one unbroken motion; arrows bridge between them, feedback bar widens. An ambient audio-spectrum bar visualizer runs under the row throughout, independent of the cards. (List items are not animated separately — they ride their card's fade) |
| `architecture` | Seven nodes cascade with scale, copper PCB traces draw between them |
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

### 2. Architecture packet flow — `architecture` — SHIPPED 2026-08-19
Rebuilt as a circuit-trace board, not a reskin of the flash below: the flow
now sits in an `.arch-board` panel with a faint PCB dot-grid texture, node
icons got pin-nub tabs and a copper border (component footprints, not plain
tiles), and the 6 `.arch-arrow` bars became `.arch-trace` SVGs — a copper
line with via dots at each end. Entrance draws each trace in with
`svg.createDrawable`. The pulse then races a bright overlay segment
(`.arch-trace__pulse`) along each trace's length via a `draw` keyframe sweep
— a real traveling highlight, not a color flash — while each node icon glows
as the light arrives (node 5 success-green as a pass, node 7 a bigger pop
for "flies out"). Sets up slide 8, which is the deck's actual PCB/Arduino.

~~A pulse travels the seven nodes left to right, once, appended to the
existing entrance timeline: each node icon flashes background/color and
scales up, then each arrow flashes brighter, in sequence. Sequential
per-element glow (same as `notify()`'s traveling dots and the corner echo),
not a motion-path dot. No new markup.~~ — read as flat: nothing on the slide
actually moved, just a color flicker on 56px icons.

- Hook: `.arch-node--1` … `--7` and `.arch-trace--1` … `--6`, both still
  numbered for direct per-element targeting
- Technique: `.arch-trace__line` (base, drawn once, stays put) and
  `.arch-trace__pulse` (overlay, hidden except during the pulse) are
  separate paths on the same geometry — animating draw on a single already-
  fully-drawn line would zero its length out and make the trace vanish
- Traces stay straight (no elbow routing) so the narrow-viewport column
  layout only needs `transform: rotate(90deg)` on `.arch-trace__svg` — no
  per-breakpoint path data

### 3. Liveness spoof comparison — `liveness` — SHIPPED 2026-08-19, synced 2026-08-20
Went through two builds before landing here. First: the phone's screen
displayed a swiping 3-photo carousel with a sliding red spoof-detection
box (superseding the split-scene/frequency-overlay idea below). That was
scrapped — simpler reads better: the phone slides in from the true edge
of the screen (computed from the container's real on-screen position, not
a static guess) on a hero angle, screen off, settles into a bounded
front-facing wobble (±45°, never turns far enough to show the back — a
full spin did, and the flat 2D `.phone-stamp` overlay doesn't rotate with
the model, so it ended up floating over the wrong side). Near the tail of
the entrance a scan-line sweeps the dark screen once — the same visual as
the left scene's `.liveness-scan-line` — then a red ✕ stamp (matching
`.liveness-stamp`) slams on and stays. No photos, no box, no per-photo
tuning.

The left scene's own scan-line + stamp no longer run on their own fixed
schedule: `phone-3d.js` exposes the derived timing of its scan/stamp beat
as `window.phone3D.timing`, and `animations.js`'s `liveness()` positions
`.liveness-scan-line`/`.liveness-stamp` at those same absolute
milliseconds, so both halves of the slide sweep and land their verdict at
the same moment instead of the left side finishing ~4s before the phone
even arrives. `.liveness-photo`/`.liveness-title`/`.liveness-subtitle`
stay on their own early schedule (not gated behind the now-later stamp)
so the slide doesn't sit blank while the phone is still gliding in.

~~Split scene: real face passes, printed photo fails. Texture/frequency
overlay scanning both, scores counting up in opposite directions.~~
~~3-photo swipe carousel with a sliding red spoof-detection box.~~

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
| 2026-08-19 | `framework` | Merged each card's entrance and its emphasis beat into one tween (`opacity`, `y:[30,-3,0]`, `scale:[0.96,1.06,1]`, 900ms, `inOutSine`) and tightened the stagger to 450ms so cards overlap by ~390ms. Arrows/feedback repositioned to bridge. Slide runs 3520ms -> 2600ms | Read as "rough and sequential". Two causes: the entrance decelerated to a dead stop at y:0 and a separate pop tween then jerked the card up again — a kink mid-motion; and consecutive cards had a ~100ms dead gap between them. **Per-property `{ to: [...], ease }` silently keeps only the first two stops in this vendored anime build** — a 3-stop scale written that way ended stuck at 1.06 instead of settling to 1. Use plain value arrays |
| 2026-08-19 | `framework` | Dropped the wave's travelling pulse entirely — `.ipo-wave` is now a purely ambient spectrum meter (`BAR_AMP` 1.5 → 6, brightness/glow now scale with each bar's own height). The emphasis beat moved onto the cards: each lifts 8px and swells to 1.06 over 520ms, then settles, sequenced 900ms apart. Deleted the dead `@keyframes ipo-shake` / `.ipo-stage--shake` CSS it supersedes | The pulse never read well across several attempts; a card that physically moves is far more legible than a bump under it. Went hop+rattle → hop+buzz (~10Hz) → hop+scale: a single swell is calmer and less fussy than a shake at defence-projector size. Transform properties must ride in **one** tween — split across separate `.add()` calls they become two animations writing the same `transform` and the later one clobbers the other's axis (caught by a headless probe: card fell at 1350ms instead of staying aloft) |
| 2026-08-19 | `framework` | Wave timeline moved from relative `'-=X'` offsets to absolute ms positions, with per-card beats that dip to a travel level while gliding and spike only once landed (`WAVE_PEAK`/`WAVE_REST`/`WAVE_TRAVEL`); `boostFrac` now normalizes against `WAVE_PEAK` instead of a hardcoded 6; duplicate resize listener per slide visit removed | Only two pulses read as distinct. The relative chain put pulses 2 and 3 *inside* their own glides (1600–2100 vs glide 1500–2000), so they fired in the gaps between cards, and their `[5,7,5]` delta was +2 against pulse 1's +7 while `boost/6` was already saturated at rest. Verified by seeking the real timeline headlessly: peaks now land at 800/1950/3050ms on card centres 152/523/894 with 0px offset |
| 2026-08-19 | `framework` | Rebuilt the `.ipo-wave` canvas as an audio-spectrum bar visualizer: thin bars with independent per-bar idle jitter (hashed phase/speed so the row never moves in lockstep), a Gaussian boost region that surges bars brighter/taller under whichever card is current, gliding card to card via the same `bumpX`/`bumpAmount` state and timeline beats. Canvas height 20px → 26px for more vertical throw | Two earlier versions (canvas repositioning itself per card, then a single line with a Gaussian bump) both read badly; asked for an EDM/YouTube-style spectrum visualizer instead |
| 2026-08-19 | `architecture` | Rebuilt as a circuit-trace board: `.arch-board` panel with PCB dot-grid texture, node icons restyled as component footprints (copper border, pin nubs), `.arch-arrow` bars replaced with `.arch-trace` SVGs (copper line + via dots + a separate `.arch-trace__pulse` overlay that travels via a `draw` keyframe sweep). New `--copper`/`--copper-glow` tokens | The flash-based pulse (previous entry, superseded) read as flat — nothing moved. This also sets up slide 8, the deck's actual PCB/Arduino, instead of sitting next to it as an unrelated flowchart |
| 2026-08-19 | `architecture` | Appended a packet-flow pulse to the existing entrance timeline: nodes flash and scale left to right once, arrows flash between them, node 5 flashes success-green, node 7 pops bigger | Slide 7's Phase 2 set piece — "walk the flow once" narration (DEFENSE_PLAN.md) needed a single clean left-to-right sweep, not a loop or a fragile per-breakpoint motion path |
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
| 2026-08-18 | `hardware` | Step 2's built-in primitive board replaced with a Blender-processed scan of a real Arduino Uno (textured PCB, decimated/classified parts); bake.js and model-loader.js extended to carry UV + base colour/roughness maps as embedded textures; fixed a latent label-tracking bug where every model-loaded part projected to nearly the same screen point; added on-screen CC BY credit |
| 2026-08-19 | `liveness` | Phone's off-screen slide-in distance fixed (own-width `x:'100%'` → viewport-relative `x:'100vw'`); the container's separate opacity fade removed since the container now genuinely starts off-screen | The container barely moved off-screen (only its own 280px width) while a much shorter opacity fade finished almost instantly, so the phone appeared to pop into view already mostly in place instead of sliding in |
| 2026-08-19 | `liveness` | Phone screen now black/off during the slide-in, powers on to photo 1 after settling, then loops a 3-photo swipe carousel forever (`playEntrance` → `playReveal` → `playCarousel` in `phone-3d.js`, one GSAP `repeat:-1` timeline driving both the texture offset and a new `.liveness-spoof-box`/`.liveness-spoof-label` DOM overlay); `stop()` now kills all three chained timelines | Demonstrates the deck's actual spoof-detection pitch on the phone itself instead of a generic fake-app-UI scroll | Code-built primitives read as "video game Arduino," not evidence; the label bug only surfaced once a real multi-part model existed to expose it |
| 2026-08-19 | `liveness` | Scrapped the photo carousel entirely — deleted `.liveness-photo-frame`/`.liveness-status-bar`/`.liveness-spoof-box`/`.liveness-spoof-label` markup+CSS, `FACE_RECTS`/`SPOOF_VALUES`, `src/models/phone-photos.js`, and `playReveal`/`playCarousel` in `phone-3d.js`. Phone now: slides in (screen off, `VIEW_DIR` restored to the tilted hero angle), then `playIdleSpin()` spins it forever (`rotation.y += 2π` every 10s, `repeat:-1`), and `playStamp()` slams a red ✕ (`.phone-stamp`, matching `.liveness-stamp`'s look) on once, ~0.6s into the spin, and leaves it. Key light 1.4 → 2.4 — the grey `BODY_COLOR` read almost black at the restored tilt with the old intensity |
| 2026-08-19 | `liveness` | `playIdleSpin()`'s continuous 360° `repeat:-1` rotation replaced with a bounded `yoyo:true` wobble (`Math.PI ± swing`, `sine.inOut`, 3s per leg) | A full spin briefly showed the phone's back (camera bump, logo); `.phone-stamp` is a fixed 2D screen-space overlay that doesn't rotate with the 3D model, so it ended up floating over the wrong side once the back came around. A rejection is inherently a front-of-phone story anyway |
| 2026-08-19 | `liveness` | Added `.phone-scan-line` to the phone screen, mirroring the left scene's `.liveness-scan-line` glow bar — sweeps once (`playScan()`) into `playStamp()` — instead of the stamp appearing on its own. Entrance now calls `playIdleSpin()`/`playScan()` at 80% through the arrival (overlapping its tail) instead of on `onComplete`. Wobble swing widened by +10° (~35° → 45°) | Ties the two halves of the slide together visually (both do "scan → verdict") instead of the phone just spinning and stamping with no scan beat; starting the lead-in before the phone fully settles reads as one continuous arrival instead of arrive-then-pause-then-scan |
| 2026-08-19 | `liveness` | Entrance's off-screen start recomputed from the container's actual `getBoundingClientRect()` (`window.innerWidth - left + width`) instead of a static `x:'100vw'`; overall entrance slowed to 75% speed (`4 / 0.75`s) | A fixed viewport-relative offset assumed the container rests near the left edge; nested in this slide's centered layout it didn't clear the visible area, so the phone appeared to materialize partway in rather than truly enter from off-screen |
| 2026-08-20 | `liveness` | `phone-3d.js` hoists its entrance/scan/stamp constants into one schedule and exposes the derived milestones as `window.phone3D.timing` (`scanStart`/`scanEnd`/`stampStart`, ms); `animations.js`'s `liveness()` reads it and positions `.liveness-scan-line`/`.liveness-stamp` at those same absolute ms instead of a `-=200`-style chain right after the photo fade-in. `.liveness-title`/`.liveness-subtitle` decoupled from the stamp chain onto their own early slots (500ms/800ms) so the heading still appears promptly. Falls back to the original ~400/1400ms timing when the phone isn't rendered (no WebGL) | The left scene's "verdict" (scan + stamp) previously finished ~1.7s in while the phone's own didn't land until ~6.3s in — two disconnected sequences rather than one. Verified with `performance.now()`-timestamped polling: both sides' scan-line opacity now rises/falls together and both stamps land within the same ~250ms sampling interval | Per-photo box/label tuning was three rounds of back-and-forth and still fragile; a simpler "spins, then gets rejected" reads clearly with far less to maintain |
