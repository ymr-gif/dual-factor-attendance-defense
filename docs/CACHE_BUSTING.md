# Cache Busting for file:// URLs

> **2026-08-19 — read this first.** This document was written while chasing a
> bug where edits to `vtuber-3d.js` "did nothing" to the model's on-screen size.
> Caching was **not** the cause, and the advice below did not fix it. The real
> cause is recorded in `docs/3D_MODEL_PIPELINE.md` under *Framing a portrait*:
>
> `frame()` auto-fits the camera to the model, which makes apparent size
> **scale-invariant**. Raising `TARGET_WIDTH` enlarges the model, but the
> computed camera distance grows by the same factor, so nothing changes on
> screen. Lowering it hit the `let distance = 2` floor, so the model only ever
> got smaller. The levers that actually move apparent size are the crop
> fraction (`PORTRAIT`) and the padding multiplier — not the model scale.
>
> Before assuming a file is stale, verify it with the tab-title trick below.
> In practice Chrome re-reads `file://` scripts on a normal reload.

## The Problem

This deck opens from `file://` (double-click `index.html`). Local files have
aggressive browser caching — **query-string cache busting does not work**.

Changing:
```html
<script src="src/js/vtuber-3d.js?v=5"></script>
```
has **zero effect**. The browser ignores `?v=5` and serves the cached original.

This means any change to a JS/CSS file referenced in `index.html` will appear
to do nothing until the browser decides to re-read the file from disk (which
may take hours, days, or never).

## Symptoms

- You edit a `.js` or `.css` file
- You reload the page (`F5` or even `Ctrl+R`)
- Nothing changes — same rendering, same behaviour
- The tab title trick (`document.title = 'TEST'`) at the top of the file
  doesn't fire — proving the file isn't being re-read

## Solutions (pick one)

### 1. Rename the file (most reliable)

Change the actual filename and update the `<script>` or `<link>` tag:

```bash
mv src/js/vtuber-3d.js src/js/vtuber-3d-v2.js
```
```html
<script src="src/js/vtuber-3d-v2.js"></script>
```

### 2. Add a file-system timestamp (good for iteration)

Embed a timestamp in the filename during development:

```html
<script src="src/js/vtuber-3d.js?t=20260819"></script>
```

**Note:** this is the same query-string trick — it may or may not work
depending on the browser. Test with the tab-title method first.

### 3. DevTools → disable cache (best during active development)

1. Open DevTools (F12)
2. Go to Network tab
3. Check **Disable cache** (while DevTools is open)
4. Now `Ctrl+Shift+R` will force-reload from disk

This only works while DevTools is open.

### 4. Hard refresh combo

`Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac) sometimes works but is unreliable
for `file://` URLs across browsers.

## How to Verify Your File Actually Loaded

Add this as the **first line** inside the IIFE (before any other code):

```js
document.title = 'LOADED: ' + Date.now();
```

Reload. The tab title should show a timestamp. If it doesn't change, the
browser is serving a cached copy.

Remove the line after verifying.

## Recommended Workflow During Development

1. Keep DevTools open with **Disable cache** checked
2. Use `Ctrl+Shift+R` to reload
3. If you still suspect caching, rename the file

## For Production

If this deck ever gets served over HTTP, standard cache-busting works:
```html
<script src="src/js/vtuber-3d.js?v=abc123"></script>
```
where `?v=abc123` is a content hash or build timestamp.
