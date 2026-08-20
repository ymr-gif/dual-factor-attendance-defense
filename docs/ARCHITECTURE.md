# Architecture

## Folder Structure

```
ppt-js/
├── README.md                 # Entry point
├── docs/                     # Documentation
│   ├── PROJECT.md
│   ├── CONTEXT.md
│   ├── ARCHITECTURE.md
│   ├── ANIMATIONS.md
│   ├── BUILD_PLAN.md
│   ├── DEFENSE_PLAN.md
│   ├── HOSTING.md
│   └── GUIDELINES.md
├── src/
│   ├── css/
│   │   ├── reset.css         # Normalize
│   │   ├── variables.css     # Theme tokens
│   │   ├── layout.css        # Slide container, per-slide styles
│   │   └── animations.css    # Shared keyframes, utility classes
│   ├── js/
│   │   ├── main.js           # Init, keyboard nav, slide engine
│   │   ├── fit.js             # Per-slide content scaling (--slide-scale)
│   │   ├── timeline.js       # Dispatch by data-anim
│   │   ├── animations.js     # One function per data-anim name
│   │   ├── hardware-3d.js    # WebGL exploded board, now used on the title slide
│   │   ├── vtuber-3d.js      # WebGL vtuber portrait for slide 3
│   │   ├── phone-3d.js       # WebGL phone for slide 4 (Liveness)
│   │   └── model-loader.js   # Builds meshes from baked Blender models
│   └── vendor/
│       ├── anime.umd.min.js  # anime.js v4.5.0, local copy
│       └── three.min.js      # three.js r149, local copy
├── src/models/               # Baked Blender models (arduino, vtuber, phone)
├── tools/
│   ├── model/                # .glb → baked JS geometry (bake.js, bake-vtuber.js)
│   └── scene/                # Isometric SVG generator — breadboard rig for slide 8
└── index.html                # Main entry — 16 slides
```

## Tech Stack

- **HTML5** — semantic markup, fullscreen slides
- **CSS3** — custom properties, flexbox, transforms, transitions
- **Vanilla JS** — no framework, no build tools
- **anime.js v4.5.0** — animation engine, loaded locally

## Dependencies

| Package | Version | Source | Purpose |
|---------|---------|--------|---------|
| anime.js | 4.5.0 | `src/vendor/` (CDN fallback) | Animation engine |
| three.js | r149 | `src/vendor/` | WebGL rendering — title board, slide 3 vtuber, slide 4 phone |

r149 is deliberate: it is the last release shipping a plain-script build. ES
modules and import maps do not load over `file://`, and the deck has to run from
the filesystem with no network.
| Three.js | 0.170.0 | CDN (import map) | WebGL 3D rendering |
| GLTFLoader | (Three.js addon) | CDN | Load .glb 3D models |
| DRACOLoader | (Three.js addon) | CDN | Decompress Draco geometry |

Load order in `index.html`:

```html
<script src="src/vendor/anime.umd.min.js"></script>
<script>
  window.anime || document.write('<script src="https://cdn.jsdelivr.net/npm/animejs@4.5.0/dist/bundles/anime.umd.min.js">\x3C/script>');
</script>
```

Local first so the deck works with no internet at the venue. The CDN line only
fires if the vendored file is missing.

## Slide Order (16)

| # | data-anim | Slide |
|---|-----------|-------|
| 1 | `title` | Title — school, S.A.F.E., team, section — 2 steps: intro, then the board assembles and blasts apart with shock rings |
| 2 | `problem` | A week of the manual attendance sheet, a tick added to an empty box, UNVERIFIED stamp (3 steps) |
| 3 | `solution` | NFC + Face converge — 3D vtuber portrait on right |
| 4 | `liveness` | Spoof rejected — left scene and the 3D phone's own scan/stamp are timed together, see `ANIMATIONS.md` |
| 5 | `notify` | Guardian notified — email, Messenger, < 60s |
| 6 | `framework` | Conceptual framework (IPO) |
| 7 | `architecture` | Tap → reader → API → capture → match → log → notify |
| 8 | `hardware` | Prototype rig — single step, SVG breadboard only |
| 9 | `rq` | RQ1 — spoof rejection rate |
| 10 | `rq` | RQ2 — system performance |
| 11 | `rq` | RQ3 — acceptability |
| 12 | `instruments` | Three instruments |
| 13 | `protocols` | Protocol 1 and 2 |
| 14 | `survey` | Instrument structure |
| 15 | `scale` | Interpretation ranges |
| 16 | `thanks` | Thank you |

Scope/Delimitation and Expected Output slides were cut from the deck (see
`DEFENSE_PLAN.md`'s Q&A Bank for that content now).

## DOM Structure

```html
<body>
  <div class="presentation">
    <section class="slide slide--title active" data-slide="1" data-anim="title">
      <div class="slide__content"><!-- slide content --></div>
    </section>
    <!-- ... -->
  </div>

  <div class="progress-bar"><div class="progress-bar__fill"></div></div>
  <div class="slide-counter">
    <span class="slide-counter__current">1</span>
    <span class="slide-counter__sep">/</span>
    <span class="slide-counter__total">16</span>
  </div>
  <div class="nav-hint">← → Space Click</div>
</body>
```

## Slide Engine (main.js)

1. `totalSlides` is read from the DOM — adding a section is enough
2. Counter total is written from that same count on init
3. Keyboard/click/touch listener → `goToSlide()`
4. `.active` moves to the new section. Only the incoming slide has a transition,
   so the outgoing one leaves instantly and the two are never legible at once
5. On the next animation frame — not a timer — `masterTimeline.playSlide()` runs
   that slide's animation
6. Progress bar updates on every move

### Per-slide fit (fit.js)

`--slide-scale` cannot be computed in pure CSS — `scale()` takes a `<number>`,
and there's no way to turn a viewport length into one. `fit.js` measures each
slide's `.slide__content` box (`offsetWidth`/`offsetHeight`, which report
layout size and ignore any transform already applied) and writes a scale
factor to `--slide-scale` on the `<section>` itself, capped by that slide's
own `data-fit-max`/`data-fit-pad` attributes (default `max: 1` — a no-op for
slides that already fit at any viewport size). Written to the section, not
`.slide__content`, because `masterTimeline.reset()` strips inline styles from
every *descendant* of a slide but not the slide itself, so the factor
survives a slide reset. `window.slideFit.schedule()` re-measures on resize,
fullscreen toggle, and once web fonts finish loading (metrics shift once the
real faces land); `main.js` also calls it on every slide change.

### No flash of finished content

Two rules keep a slide from showing its end state before it animates:

- Every element an animation starts from `opacity: 0` (or a scale) carries that
  same resting state in CSS. Add a new entrance animation, add the matching
  resting state, or the element paints once at full strength first.
- `playSlide()` calls `reset()` first, which pauses whatever that slide was still
  running and strips the inline styles the last visit left behind, handing the
  slide back to its CSS resting state.

## Dispatch (timeline.js)

`playSlide(n)` reads `data-anim` from the section and calls
`slideAnimations[name](slideEl)`. Animations are keyed by **name, not index**,
so slides can be reordered or inserted without touching animation code.
Three RQ slides share one `rq` function — the element is passed in, so the
function scopes its own queries.

Unknown `data-anim` values log a console warning instead of failing silently.

### Stepped slides

An animation returns either a timeline, or `{ steps: [fn, fn, ...] }` for a slide
the presenter advances through in beats. Step 1 plays on entry; each further
arrow press calls `masterTimeline.nextStep()`, which returns `true` while it
still has steps left — `nextSlide()` in `main.js` only moves on once it returns
`false`. Leaving the slide clears its step state, so coming back replays from
step 1. Slides 1 (title — intro, then the board assembles and blasts apart)
and 2 (problem) are the stepped slides today. Slide 8 (`hardware()`) used to
be a second stepped slide (rig, then an exploded-board beat) but is now a
single plain timeline — the exploded-board mechanism moved onto slide 1's
step 2 instead.

A later step must not assume the previous one finished — the presenter can press
early. `problem()` pauses each step's timeline (`fillTl.pause()`) and sets its
end state before the next step animates, across all three of its steps, and
additionally clears the `stroke-dasharray` / `stroke-dashoffset` that
`svg.createDrawable` writes — a half-drawn signature keeps those values and
would stay half-drawn forever.

## Animation Engine (animations.js)

- One function per `data-anim` name, each receiving the slide element
- `q(el, sel)` / `qa(el, sel)` scope every query to that slide
- Uses anime.js v4 API: `createTimeline()`, `animate()`, `stagger()`, `scrambleText()`
- Returns the timeline so the caller can hold or reverse it later

## Keyboard Controls

| Key | Action |
|-----|--------|
| `→` / `Space` / `Click` | Next slide |
| `←` | Previous slide |
| `F` | Toggle fullscreen |
| `R` | Restart |
| `P` | Reserved — not implemented |

## Slide 8 Scene

Single step now — the isometric breadboard rig, generated (not hand-written)
by `tools/scene/scene.py`'s `breadboard()` unit, see `tools/scene/README.md`.
`data-rise` on each part group carries how far it lifts, which is a holdover
from when this slide also had an explode step — that step, and the WebGL
board behind it, moved to the title slide (below). `.unit`/`.wire` fade and
draw in once; there's no second beat, no callouts, no WebGL on this slide
any more.

## Title Slide Scene

Step 2 of the title (`title()`'s `step2` in `animations.js`) hands off to
WebGL. `hardware-3d.js` (`window.hardware3D`) builds the board from
primitives, lights it with a procedural studio environment, and exposes
`parts`/`rest`/`riseFor(name)` so each part can rise off the board on its own
staggered tween. Three additive "shock ring" meshes (`api.shock`,
`shockRest`) sit flat on the board and expand outward with a short alpha
spike and a long decay, fired ~150ms apart alongside the part rise — the
"blast" the title now opens with. `assemble()` resets the rig (parts back to
rest, rings back to `shockRest`) so a revisit never opens on a spent blast.
`stopAll()` halts the render loop on every slide change — see
`docs/3D_DECONSTRUCTION.md`, though its slide-8-specific framing is now
historical (the mechanism it describes lives here).

A modelled board can replace the built-in geometry: `tools/model/bake.js` turns
a `.glb` into base64 geometry that loads without a fetch or a loader, which is
what `file://` forces. The handover spec is in `docs/3D_MODEL_PIPELINE.md`.

## Slide 3 Scene

The left side shows the NFC + Face icons with "Identity Verified" text. The
right side displays a 3D vtuber portrait (face + hair from a Blender model)
with idle turntable rotation and studio lighting.

`vtuber-3d.js` mounts a three.js scene on a `<canvas>` element. The model
arrives as baked base64 geometry via `tools/model/bake-vtuber.js`, which
filters the GLB to keep only face/hair/eye meshes and discards the body.
`model-loader.js` builds the geometry — same pipeline as the title slide's
board. The scene is simpler: no explode, no labels, just a showcase
turntable. `stopAll()` halts the render loop on slide change.

## 3D Exploded View

The title slide includes a hyper-realistic 3D exploded view of the Arduino
Uno, inspired by Apple's product visualizations — moved here from slide 8,
which now only shows the SVG breadboard rig. See `docs/3D_DECONSTRUCTION.md`
for full technical details on:

- Blender workflow (modeling, materials, export)
- Three.js integration (GLTF loading, PBR rendering)
- Animation sequence (assembled → exploded)
- File structure and dependencies

## Theming

All colors are CSS custom properties in `variables.css` (`--accent`,
`--success`, `--danger`, `--warning`, background and text ramps). Change them
there to retheme every slide.
