# S.A.F.E. Research Proposal Defense

This is the slide deck for a Grade 12 research proposal defense at Hua Siong
College of Iloilo. The study it presents is "A Dual-Factor NFC and Facial
Recognition Attendance System with Passive Liveness Detection and Real-Time
Guardian Notification", S.A.F.E. for short. The deck is one web page in plain
HTML, CSS and JavaScript: the presenter steps through animated slides from the
keyboard, and some slides render 3D models with WebGL.

Live copy: https://ymr-gif.github.io/dual-factor-attendance-defense/

## Run it locally

```
git clone https://github.com/ymr-gif/dual-factor-attendance-defense.git
```

Open `index.html` in a browser. The docs and `tools/check-flash.py` assume
Chrome or Chromium. There is nothing to build, install or serve: every script
and stylesheet is a local file, so the page works from the filesystem with no
connection. One exception: if the vendored anime.js or GSAP file fails to load,
`index.html` asks jsDelivr for it.

`npm install` is only for the authoring script `tools/model/bake-vtuber.js`,
which uses `sharp`. Presenting the deck does not need it.

## Controls

| Input | What it does |
|-------|--------------|
| `Right arrow` or `Space` | Plays the next step of the current slide. After the last step, moves to the next slide |
| `Left arrow` | Moves to the previous slide, which replays from its first step. There is no step back within a slide |
| `F` | Toggles fullscreen |
| `R` | Returns to the first slide |
| Click | Same as `Right arrow` |
| Swipe left, on a touch screen | Same as `Right arrow` |
| Swipe right, on a touch screen | Same as `Left arrow` |

Input handling is in `src/js/main.js`. Letter keys work in either case, and a
swipe needs more than 50 pixels of horizontal travel. The deck does not turn
off the browser's own swipe gestures: in Chrome, a right swipe can go back in
the tab's history when there is an earlier page there, which leaves the deck.

## What is in the repo

| Path | Contents |
|------|----------|
| `index.html` | The markup for every slide, and the tags that load the scripts and stylesheets |
| `src/js/` | Navigation (`main.js`), animation dispatch (`timeline.js`), one animation function per slide type (`animations.js`), slide scaling (`fit.js`), the WebGL scenes (`hardware-3d.js`, `vtuber-3d.js`, `phone-3d.js`) and the decoder for baked models (`model-loader.js`) |
| `src/css/` | Reset, theme variables, slide layout and shared animation classes |
| `src/models/` | The 3D models as generated scripts. They are build output, not edited by hand |
| `src/vendor/` | Minified three.js, anime.js and GSAP |
| `tools/` | Authoring and checking scripts: `check-flash.py` finds elements that would paint before their entrance animation, `scene/` generates the isometric SVG of the prototype rig, `model/` bakes the 3D models. None of them run while presenting |
| `docs/` | Design documents, listed in the next section |
| `backend/` | Git submodule, described under Companion repository |

## Docs

- [Project](docs/PROJECT.md): the study's full title, the team, the school, the audience and the design rules the slides follow.
- [Architecture](docs/ARCHITECTURE.md): folder layout, slide order, how `main.js`, `timeline.js` and `fit.js` drive a slide, how stepped slides work, and notes on individual scenes.
- [Animations](docs/ANIMATIONS.md): the rules every animation follows, what each slide's animation does, quirks found in the vendored anime.js build, and a change log.
- [Hosting](docs/HOSTING.md): GitHub Pages setup through the Actions workflow, the offline fallback, and a checklist for presentation day.
- [Cache Busting](docs/CACHE_BUSTING.md): what to try when an edited script or stylesheet seems not to reload over `file://`, and how to confirm a file was re-read. Start with the dated note at the top, which corrects the rest.
- [3D Model Pipeline](docs/3D_MODEL_PIPELINE.md): how a `.glb` becomes a script the deck can load, what the source file has to look like, the bake commands, and the attribution table for the models.
- [3D Deconstruction](docs/3D_DECONSTRUCTION.md): the original plan for the exploded Arduino board, with a table near the top of what shipped instead. The effect now plays on the title slide.

## How the 3D models get in

A page opened from `file://` cannot fetch a `.glb` file, and three.js ships its
loader for that format only as an ES module, which does not load from there
either. So each model is converted ahead of time: a Node script in
`tools/model/` writes a plain script into `src/models/` that carries the
geometry as base64 typed arrays, and `src/js/model-loader.js` decodes it into
three.js meshes in the browser. Details: [docs/3D_MODEL_PIPELINE.md](docs/3D_MODEL_PIPELINE.md).

## Credits

Third-party 3D models, all CC BY 4.0:

- [Arduino UNO](https://sketchfab.com/3d-models/arduino-uno-51dd4e0cdfad4c4c95354bc5e29dcf1a) by Helindu
- [Mint - Neverness To Everness](https://sketchfab.com/3d-models/mint-neverness-to-everness-d29dd26ffcbc4ef0a1fd326f34ae6d14) by [Jun Hungry](https://sketchfab.com/JunHungry)
- [samsung s 26 ultra 3d model](https://sketchfab.com/3d-models/samsung-s-26-ultra-3d-model-3356099ca99d488d95a6a253d05577f7) by [achrixx](https://sketchfab.com/achrixx)

What was changed in each: [3D Model Pipeline](docs/3D_MODEL_PIPELINE.md#attribution).

The libraries in `src/vendor/` are third-party too, checked in as plain scripts:

| Library | Version | License | Used for |
|---------|---------|---------|----------|
| [three.js](https://threejs.org/) | r149 | MIT | The WebGL scenes |
| [anime.js](https://animejs.com/) | 4.5.0 | MIT | The slide animations in `src/js/animations.js` |
| [GSAP](https://gsap.com/) | 3.12.5 | GreenSock standard license | The phone scene in `src/js/phone-3d.js` |

GSAP is not open source. Its header reads "Copyright 2024, GreenSock. All rights
reserved", under the terms at https://gsap.com/standard-license.

## Companion repository

The system this deck defends is in
[Dual-Factor-Attendance-System](https://github.com/ymr-gif/Dual-Factor-Attendance-System),
included here as a git submodule at `backend/` for reference. The deck loads
nothing from it, and a plain clone leaves that directory empty. To fill it:

```
git submodule update --init backend
```

## License

- The deck's own code (markup, scripts, styles and `tools/`) is under the
  [MIT License](LICENSE).
- The research content shown on the slides, meaning the study's text and
  figures, belongs to the four authors named on the title slide. All rights
  reserved.
- The 3D models and the libraries in `src/vendor/` keep their own licenses,
  listed under Credits. The files in `src/models/` are built from those models
  and stay under CC BY 4.0.
