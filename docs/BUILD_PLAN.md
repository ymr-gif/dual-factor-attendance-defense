# Build Plan — What Still Needs Work

> Status as of 2026-08-18. Deck: 18 slides, skeleton animations on all of them.
> Priority: P0 = defense-blocking. P1 = credibility. P2 = polish.

## P0 — Blocking — DONE 2026-08-18

### 1. Kill the fake data
Two slides show numbers the study does not have yet. This is a proposal, not a final defense.
Panel reads invented results as dishonesty.

| Slide | Current | Change to |
|-------|---------|-----------|
| 12 — Survey | Bar chart with made-up heights | Instrument structure: 12 items × 2 versions, 5-point Likert, ISO/IEC 25010:2023 |
| 14 — Acceptability | Ring animating to a % | Interpretation ranges (4.21–5.00 Highly Acceptable → 1.00–1.80 Not Acceptable), labeled **Expected Output** |

### 2. Vendor anime.js locally
Venue wifi fails → CDN fails → zero animations → dead deck.
- Download `anime.umd.min.js` v4.5.0 to `src/vendor/`
- Load local first, CDN as fallback
- `GUIDELINES.md` says do not change the CDN link — this is an addition, not a swap. Update that rule.

### 3. Missing slides (4 new)
| New slide | Why | Place after |
|-----------|-----|-------------|
| Conceptual Framework (IPO) | PPTX slide 4 was a placeholder. Panel always asks for it. | Liveness |
| Guardian Notification | Core component of the title. Deck never shows it. | Conceptual framework |
| Scope & Delimitation | Panel asks. Bounds the study, kills half the hard questions. | Survey scale |
| Expected Output | Proposal must state what it will produce, not what it found | Before Thank You |

### 4. Title slide is incomplete
Missing school, team names, section. PPTX slide 1 had them; deck slide 1 does not.
Add: HUA SIONG COLLEGE OF ILOILO · 4 names · STEM (Grade 12 — Euclid).

### What shipped

| Item | Result |
|------|--------|
| Fake data | Survey bar chart → instrument structure (12 items × 2 versions, 4 ISO characteristics). Percentage ring → interpretation ranges + Expected Output slide |
| anime.js | Vendored to `src/vendor/anime.umd.min.js`, CDN kept as fallback only |
| New slides | Guardian Notification (5), Conceptual Framework IPO (6), Scope (16), Expected Output (17) |
| Title slide | School, full title, four names, section |
| Architecture (P1.5, pulled in) | Flow corrected, notify node added, emoji → SVG icons |
| Problem icon (P1.6, pulled in) | Fingerprint → logbook, REJECTED → UNVERIFIED |
| Structure | Animations keyed by `data-anim`, scoped to the slide element; slide count read from the DOM |

Verified by headless render of all 18 slides at 1920×1080.

## P1 — Credibility

### 7. Per-slide steps
`ARCHITECTURE.md` promises `data-step` beats. Not implemented — every slide autoplays as one blob.
Presenter cannot pause mid-slide. Add stepping to slides 3, 5, 11 at minimum.

### 8. Presenter notes overlay
Four speakers, one deck. Press `N` → cue card for the current slide. Hidden from projector output if possible.

## P2 — Polish

- `P` (pause) is a no-op in `main.js:94` but README and ARCHITECTURE both list it. Implement or delete from docs.
- Number keys → jump to slide. Panel will say "go back to your architecture." Currently you arrow-spam.
- Backward nav replays animations from zero instead of restoring end state. `masterTimeline.resetSlide()` is never called.
- Test 1920×1080, 1366×768, **and 1024×768** — school projectors are often 4:3 XGA.
- Software stack slide (FastAPI / PostgreSQL / Redis / face_recognition / MiniFASNet) — currently only crammed into one hardware card.

## Order of work

1. ~~P0 batch~~ — done 2026-08-18
2. Fill in remaining content the panel will ask for (budget ₱4,245, participants, ethics)
3. Phase 2 heavy animations — see `ANIMATIONS.md` (hardware exploded view first)
4. P1.7 + P1.8 stepping and presenter notes
5. P2 pass
6. Full run on venue hardware
