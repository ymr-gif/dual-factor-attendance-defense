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
│   │   ├── timeline.js       # Dispatch by data-anim
│   │   ├── animations.js     # One function per data-anim name
│   │   ├── hardware-3d.js    # WebGL Arduino for slide 8, step 2
│   │   └── model-loader.js   # Builds meshes from a baked Blender model
│   └── vendor/
│       ├── anime.umd.min.js  # anime.js v4.5.0, local copy
│       └── three.min.js      # three.js r149, local copy
├── src/models/               # Baked Blender model, or a placeholder
├── tools/
│   ├── model/                # .glb → baked JS geometry
│   └── scene/                # Isometric SVG generator for slide 8
└── index.html                # Main entry — 18 slides
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
| three.js | r149 | `src/vendor/` | WebGL board on slide 8 |

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

## Slide Order (18)

| # | data-anim | Slide |
|---|-----------|-------|
| 1 | `title` | Title — school, S.A.F.E., team, section |
| 2 | `problem` | Manual logbook page, forged signature, UNVERIFIED stamp (3 steps) |
| 3 | `solution` | NFC + Face converge |
| 4 | `liveness` | Spoof rejected |
| 5 | `notify` | Guardian notified — email, Messenger, < 60s |
| 6 | `framework` | Conceptual framework (IPO) |
| 7 | `architecture` | Tap → reader → API → capture → match → log → notify |
| 8 | `hardware` | Prototype rig, then the Arduino exploded — **2 steps** |
| 9 | `rq` | RQ1 — spoof rejection rate |
| 10 | `rq` | RQ2 — system performance |
| 11 | `rq` | RQ3 — acceptability |
| 12 | `instruments` | Three instruments |
| 13 | `protocols` | Protocol 1 and 2 |
| 14 | `survey` | Instrument structure |
| 15 | `scale` | Interpretation ranges |
| 16 | `scope` | In scope / out of scope |
| 17 | `output` | Expected output |
| 18 | `thanks` | Thank you |

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
    <span class="slide-counter__total">18</span>
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
step 1. Slides 2 and 8 are the stepped slides today.

A later step must not assume the previous one finished — the presenter can press
early. `hardware()` pauses the step-1 timeline and sets its end state before
step 2 animates, otherwise the older tweens land after the newer ones.

`problem()` does the same across three steps, and additionally clears the
`stroke-dasharray` / `stroke-dashoffset` that `svg.createDrawable` writes — a
half-drawn signature keeps those values and would stay half-drawn forever.

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

Step 1 is the isometric rig — generated, not hand-written, see
`tools/scene/README.md`. `data-rise` on each part group carries how far it lifts,
so the geometry stays the single source of truth for the animation.

Step 2 hands over to WebGL. `hardware-3d.js` builds the Arduino from primitives,
lights it with a procedural studio environment, frames the camera on the board's
exploded bounds, and exposes `project(part)` so HTML callout labels can track
each part as it travels. If WebGL is missing the same step runs the isometric
explode instead, so the slide always has a second beat. `stopAll()` halts the
render loop on every slide change — see `docs/3D_DECONSTRUCTION.md`.

A modelled board can replace the built-in geometry: `tools/model/bake.js` turns
a `.glb` into base64 geometry that loads without a fetch or a loader, which is
what `file://` forces. The handover spec is in `docs/3D_MODEL_PIPELINE.md`.

## 3D Exploded View

Slide 8 includes a hyper-realistic 3D exploded view of the Arduino Uno,
inspired by Apple's product visualizations. See `docs/3D_DECONSTRUCTION.md`
for full technical details on:

- Blender workflow (modeling, materials, export)
- Three.js integration (GLTF loading, PBR rendering)
- Animation sequence (assembled → exploded)
- File structure and dependencies

## Theming

All colors are CSS custom properties in `variables.css` (`--accent`,
`--success`, `--danger`, `--warning`, background and text ramps). Change them
there to retheme every slide.
