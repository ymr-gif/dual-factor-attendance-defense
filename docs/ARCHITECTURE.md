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
│   ├── HOSTING.md
│   └── GUIDELINES.md
├── src/
│   ├── css/
│   │   ├── reset.css         # Normalize
│   │   ├── variables.css     # Theme tokens
│   │   ├── layout.css        # Slide container, grid
│   │   └── animations.css    # Keyframes, transition classes
│   ├── js/
│   │   ├── main.js           # Init, keyboard nav, slide engine
│   │   ├── timeline.js       # Master timeline (all slides)
│   │   └── animations.js     # All slide animations
│   └── assets/
│       └── icons/            # SVG icons
└── index.html                # Main entry
```

## Tech Stack

- **HTML5** — semantic markup, fullscreen slides
- **CSS3** — custom properties, grid, transforms, transitions
- **Vanilla JS** — no framework, no build tools
- **anime.js v4.5.0** — animation engine via CDN

## Dependencies

| Package | Version | Source | Purpose |
|---------|---------|--------|---------|
| anime.js | 4.5.0 | jsDelivr CDN | Animation engine |

CDN URL: `https://cdn.jsdelivr.net/npm/animejs@4.5.0/dist/bundles/anime.umd.min.js`

## DOM Structure

```html
<body>
  <div class="presentation">
    <section class="slide slide--1 active" data-slide="1">
      <!-- Slide content -->
    </section>
    <section class="slide slide--2" data-slide="2">
      <!-- Slide content -->
    </section>
    <!-- ... -->
  </div>

  <div class="progress-bar">
    <div class="progress-bar__fill"></div>
  </div>

  <div class="slide-counter">
    <span class="current">1</span> / <span class="total">15</span>
  </div>

  <div class="nav-hint">← → Space Click</div>
</body>
```

## Slide Engine (main.js)

1. On load: hide all slides except first
2. Keyboard/click listener → advance to next step or slide
3. Each slide has internal steps (sub-animations) tracked by `data-step`
4. When all steps done → transition to next slide
5. Progress bar updates on each step

## Timeline Engine (timeline.js)

- Master timeline with labeled sections per slide
- `timeline.add('slide-1', ...)` — each slide is a label
- Navigation calls `timeline.play('slide-N')` to jump
- Each slide timeline contains sub-animations sequenced

## Animation Engine (animations.js)

- Contains all animation definitions per slide
- Functions: `animateSlide1()`, `animateSlide2()`, etc.
- Called by timeline engine when slide becomes active
- Uses anime.js v4 API: `animate()`, `stagger()`, `createTimeline()`

## Keyboard Controls

| Key | Action |
|-----|--------|
| `→` | Next step / slide |
| `←` | Previous step |
| `Space` | Next step / slide |
| `Click` | Next step / slide |
| `F` | Toggle fullscreen |
| `R` | Restart presentation |
| `P` | Pause / resume |

## Theming

All colors defined as CSS custom properties in `variables.css`:

```css
:root {
  --bg-primary: #0a0a0f;
  --bg-secondary: #12121a;
  --text-primary: #e0e0e0;
  --text-secondary: #888;
  --accent: #00d4ff;
  --accent-secondary: #7b2ff7;
  --success: #00ff88;
  --danger: #ff3366;
}
```

Change these to retheme the entire presentation.
