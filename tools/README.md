# tools

Authoring and checking scripts. None of them run at presentation time — the deck
stays plain HTML, CSS and JS with no build step.

| Tool | What it does |
|------|--------------|
| `check-flash.py` | Fails if any element would paint at full strength before its entrance animation. Loads the real deck in headless Chrome and measures computed styles, since resting states often come from a base class. Run it after adding or changing an entrance animation. |
| `scene/` | Generates the isometric prototype scene on slide 8 — see `scene/README.md`. |

## Requirements

Python 3 and a Chrome or Chromium binary on PATH (or `CHROME=/path/to/chrome`).
No npm packages, no build tools.
