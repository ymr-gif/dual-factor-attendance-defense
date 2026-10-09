# S.A.F.E. — Research Proposal Defense

Web-based animated presentation built with anime.js v4.

This repo is the presentation only. The system it defends — NFC + facial
recognition attendance with passive liveness detection — lives in
[Dual-Factor-Attendance-System](https://github.com/ymr-gif/Dual-Factor-Attendance-System),
vendored here as a git submodule at [`backend/`](backend) for reference.

```
git submodule update --init backend   # pull the backend code in
```

## Quick Start

```
Open index.html in Chrome → F11 for fullscreen
```

## Docs

- [Project](docs/PROJECT.md) — What this is
- [Architecture](docs/ARCHITECTURE.md) — Tech stack
- [Animations](docs/ANIMATIONS.md) — Animation concepts (mutable)
- [Hosting](docs/HOSTING.md) — Deploy instructions
- [Cache Busting](docs/CACHE_BUSTING.md) — Dev workflow for asset changes
- [3D Model Pipeline](docs/3D_MODEL_PIPELINE.md) — Blender → baked model → runtime
- [3D Deconstruction](docs/3D_DECONSTRUCTION.md) — The exploded-board effect (title slide)

## Credits

Third-party 3D models, both CC BY 4.0:

- [Arduino UNO](https://sketchfab.com/3d-models/arduino-uno-51dd4e0cdfad4c4c95354bc5e29dcf1a) by Helindu
- [Mint - Neverness To Everness](https://sketchfab.com/3d-models/mint-neverness-to-everness-d29dd26ffcbc4ef0a1fd326f34ae6d14) by [Jun Hungry](https://sketchfab.com/JunHungry)

What was changed in each: [3D Model Pipeline](docs/3D_MODEL_PIPELINE.md#attribution).

## Presentation Controls

| Key | Action |
|-----|--------|
| `→` / `Space` / `Click` | Next step or slide |
| `←` | Previous step |
| `F` | Toggle fullscreen |
| `R` | Restart presentation |
| `P` | Reserved — not implemented |
