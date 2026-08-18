# Cold Session Guidelines

## Read First (In Order)

1. `docs/CONTEXT.md` — Full project context, PPTX content dump
2. `docs/ARCHITECTURE.md` — How files connect
3. `docs/ANIMATIONS.md` — Current animation state + visual refs
4. `docs/PROJECT.md` — Identity, team, goals

## Do

- Keep text minimal (3-5 words max per slide; diagram slides may use short labels)
- Never show numbers the study has not measured — this is a proposal, not a final defense
- Use anime.js v4 syntax (not v3)
  - v4: `import { animate, stagger } from 'animejs';`
  - v3: `anime({ targets: ... })` — DO NOT USE
- Test all 18 slides after changes
- Update `ANIMATIONS.md` when changing animations
- Use CSS variables for theming
- Use `stagger()` for sequential animations
- Use `createTimeline()` for sequenced slide animations
- Key animations by `data-anim` name, one function per name, in `animations.js`
- Return `{ steps: [...] }` for slides the presenter walks through in beats
- Assume a step can start before the previous one finished — pause it and set its
  end state first
- Scope every query to the passed slide element with `q()` / `qa()`

## Don't

- Add paragraphs of text to slides
- Use jQuery or other animation libraries
- Break keyboard navigation
- Remove progress bar or slide counter
- Hand-edit the slide-8 SVG in `index.html` — regenerate it with
  `python3 tools/scene/compose.py && python3 tools/scene/embed.py`
- Remove `src/vendor/anime.umd.min.js` — it is what makes the deck work offline
- Change the anime.js version without checking compatibility
- Use `autoplay: true` on slide animations (trigger on nav only)
- Hardcode colors (use CSS variables)
- Add npm/node dependencies

## File Ownership

| File | Allowed Content |
|------|----------------|
| CSS files | Style only, no logic |
| JS files | Animation logic, no inline styles |
| HTML | Structure only, no animation code |
| Docs | Context and guidelines |

## When Modifying Animations

1. Read `docs/ANIMATIONS.md` for current state
2. Edit `src/js/animations.js`
3. Test ALL 18 slides (not just the changed one)
4. Update `docs/ANIMATIONS.md`:
   - What changed
   - Why it changed
   - New visual reference (if any)
5. Add entry to Change Log in `ANIMATIONS.md`

## When Modifying Style

1. Edit CSS files in `src/css/`
2. Check `variables.css` for existing tokens
3. Add new tokens if needed
4. Test on 1920x1080 resolution (projector)
5. Test on 1366x768 (laptop)

## When Adding New Slides

1. Add `<section class="slide" data-slide="N" data-anim="name">` to `index.html`
2. Renumber the `data-slide` values after the insertion point
3. Add slide styles to `src/css/layout.css`
4. Add a `name(el)` function to `src/js/animations.js`
5. Nothing to register — `timeline.js` dispatches on `data-anim`, and both the
   counter total and `totalSlides` are read from the DOM
6. Update the slide table in `ARCHITECTURE.md` and the running order in `DEFENSE_PLAN.md`

## Tech Stack (Do Not Change)

- anime.js v4.5.0
- Loaded from `src/vendor/anime.umd.min.js`, CDN only as fallback
- Vanilla JS (no framework)
- No build tools
- No npm/node

## Animation API Reference (v4)

```js
// Basic animation
import { animate, stagger } from 'animejs';

animate('.target', {
  x: 100,
  opacity: [0, 1],
  duration: 800,
  ease: 'outExpo'
});

// Stagger
animate('.item', {
  translateY: [-20, 0],
  delay: stagger(100, { from: 'center' })
});

// Timeline
import { createTimeline } from 'animejs';

createTimeline()
  .add('.title', { opacity: [0, 1] })
  .add('.subtitle', { y: [-20, 0] }, '-=400');

// SVG morph
import { svg } from 'animejs';

animate('path', {
  d: svg.morphTo('path-target')
});

// SVG line drawing
import { svg } from 'animejs';

animate(svg.createDrawable('path'), {
  draw: '0 1',
  ease: 'inOutExpo'
});

// Scramble text
import { scrambleText } from 'animejs';

animate('.title', {
  innerHTML: scrambleText({ chars: 'A-Z0-9' })
});
```
