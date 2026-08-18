# Model Pipeline — Blender to Slides 3 and 8

How a modelled asset gets into the deck, and exactly what the file has to look
like. Both the Arduino on slide 8 and the vtuber portrait on slide 3 use the
same bake-and-decode pipeline; each has its own bake script and model file.

---

## Why there is a pipeline at all

The deck is opened straight from the filesystem. On `file://`:

- `fetch()` / `XMLHttpRequest` of a `.glb` is CORS-blocked
- `GLTFLoader` only ships as an ES module, and ES modules do not load either
- three.js dropped its classic-script builds after r149, which is why the deck
  pins r149

So the model is **baked at authoring time** into base64 typed arrays inside a
plain script. Nothing is fetched, nothing is decompressed, and the same file
works over `http://` if the deck is ever hosted.

```
arduino.glb → python3 tools/model/blender_prep.py → processed.glb → node tools/model/bake.js → src/models/arduino-model.js → browser
vtuber.glb  → node tools/model/bake-vtuber.js → src/models/vtuber-model.js → browser
```

The Blender step is only needed when the source .glb does not already meet
the requirements below by itself — a clean, small, correctly-named export can
skip straight to `bake.js`. The deck's current model (a Sketchfab download,
see Attribution) needed it: 53 generically-named loose objects, 4096px
textures, and a 62MB file size. See "Preparing a messy source" further down.

---

## What to hand over

A single **`.glb`** (glTF Binary), exported from Blender.

### Required

| Requirement | Why |
|---|---|
| **One object per component, named** | Object names become part names. The explode animation and the callout labels look parts up by name. |
| **Names from the list below** | Anything else still animates, just with a default lift and no label. |
| **No Draco compression** | The baker reads uncompressed accessors. Untick *Compression* on export. |
| **Apply modifiers on export** | Bevel and Subdivision must be baked into the mesh. |
| **+Y up** | Blender's glTF exporter does this by default — leave it alone. |
| **Materials as Principled BSDF** | Base colour, roughness, metallic and emission are always read. A base colour map and a metallic-roughness map are read too, if present, and baked in as data: URIs — see "Textures" below. |
| **License and author** | It ships in a defence deck. A CC-BY model is fine with attribution; note it in this file. |

### Names the deck knows

`pcb`, `mcu`, `usb`, `jack`, `xtal`, `reg`, `icsp`, `reset`, `leds`,
`hdr-d1`, `hdr-d2`, `hdr-a1`, `hdr-a2`

Underscores work too — `hdr_d1` is read as `hdr-d1`. Labels currently point at
`pcb`, `mcu`, `usb`, `jack`, `xtal` and `hdr-d2`. A part can have more than one
material/primitive (bake.js keeps them together as one named part, so the
explode animation still moves it as one rigid body — see the comment above
`walk()` in bake.js) — this is how the PCB carries top, bottom and side
materials as a single `pcb` part.

### Textures

Optional. If a material has a `baseColorTexture` and/or a
`metallicRoughnessTexture`, bake.js pulls the encoded image bytes straight out
of the .glb's binary chunk (no decoding, no re-encoding — whatever format the
.glb already carries, usually JPEG after blender_prep.py) and embeds each as a
`data:` URI, wired to `MeshStandardMaterial.map` / `.roughnessMap` in
model-loader.js. Untextured materials work exactly as before (flat colour).
Keep textures small going in — nothing at the deck's viewing distance needs
more than ~1024px, and every embedded byte counts against the ~4MB budget
below.

### Not required

- Real-world scale — the deck normalises the model to a 68.6 mm board
- Centring — the model is re-centred and dropped onto the board plane
- Lights, cameras, animation — all ignored
- Vertex counts inside any particular budget; the baked file is what matters —
  keep the total comfortably under ~4 MB once textures are included

### Blender export settings

```
File → Export → glTF 2.0 (.glb)
  Format:        glTF Binary (.glb)
  Include:       Selected Objects (or the whole scene)
  Transform:     +Y Up            ✔
  Data:          Apply Modifiers  ✔
                 Materials: Export
                 Compression      ✘   ← must stay off
```

---

## Preparing a messy source

Real downloads — Sketchfab, TurboSquid, a CAD export — rarely arrive already
matching "What to hand over" above. `tools/model/blender_prep.py` is a
headless Blender script (via `pip install bpy`, authoring-time only — the
deck itself never runs Python or Blender) that turns one into the other:

```
python3 tools/model/blender_prep.py <input.glb> <output.glb>
```

It imports the source, classifies its objects into the deck's part names,
decimates anything absurdly over-detailed, downscales and recompresses
textures, and exports uncompressed with modifiers applied and +Y up. Read the
module docstring and the `NAME_MAP` comments at the top of the file before
running it on a *different* model — the classification is a hand-built
lookup keyed by the source's own object names (derived by rendering that
specific model top-down and cross-checking part dimensions against the
2.54mm pin pitch), not a generic shape classifier. A new source's objects
will have different names; that mapping has to be re-derived the same way,
by diagnosing the new file, not assumed to carry over.

Feed its output into `bake.js`:

```
python3 tools/model/blender_prep.py ~/Downloads/arduino.glb /tmp/processed.glb
node tools/model/bake.js /tmp/processed.glb
```

## Baking

```
node tools/model/bake.js ~/Downloads/arduino.glb
```

Prints the parts it found, the file size, whether any parts carry textures,
and the model's bounds — check the part names in that list before going
further. Writes `src/models/arduino-model.js`, which `index.html` already
loads.

To go back to the built-in geometry, replace that file with the placeholder
comment it shipped with.

---

## What happens at runtime

1. `src/models/arduino-model.js` defines `window.arduinoModel` (or does not)
2. `src/js/model-loader.js` decodes each part's primitive(s) into
   `BufferGeometry`s (position, normal, and UV if present), builds a
   `MeshStandardMaterial` per primitive from the baked material values —
   decoding any embedded texture `data:` URI via `THREE.TextureLoader`, which
   never fetches anything since the bytes are already inline — scales the
   model so the board matches the deck's dimensions, and re-centres it
3. `src/js/hardware-3d.js` uses those parts if they exist, its own primitives if
   not — lighting, camera framing, shadows and the explode choreography are the
   same either way. It also computes each part's own bounding-box centre right
   after building it (`partAnchor()`), in the part's local space — this is
   what the callout labels aim at (`project()`), and it is why label tracking
   works the same whether a part's offset lives on the group (procedural
   parts) or on its mesh (baked parts, re-centred as a whole model rather than
   individually)
4. Parts not named in the explode table still lift, by a default amount
5. Labels whose part is missing from the model hide themselves

---

## Slide 3 — Vtuber portrait

`tools/model/bake-vtuber.js` works like `bake.js` but filters meshes by name.
It keeps face, hair, eyes, eyelashes, highlights, and face-mask meshes and
discards the body. The mesh-inclusion patterns are in the `MESH_INCLUDE` array
at the top of the file — edit them when a new character uses different naming.

```
node tools/model/bake-vtuber.js ~/Downloads/character.glb
```

Writes `src/models/vtuber-model.js` (`window.vtuberModel`), which
`src/js/vtuber-3d.js` reads at runtime. The scene is a simple turntable — no
explode, no labels — with portrait framing and studio lighting.

### Mesh filtering

bake-vtuber.js walks the same glTF node tree as bake.js. For each mesh, it
tests `mesh.name` against `MESH_INCLUDE` regexes. Matching meshes are baked;
everything else is skipped. The part names in the output are cleaned-up mesh
names (prefixes stripped, underscores → hyphens).

### Vertex counts to expect

A typical character model has 15-30K vertices across face/hair meshes. The
current model (Mint from Neverness to Everness) bakes to ~7K vertices across
7 parts, with ~6MB of embedded textures. Running the model through
`blender_prep.py` first (which downscales textures) reduces this significantly.

---

## Checking a model without the deck

`tools/model/bake.js` prints bounds and part names, which catches the two
mistakes that actually happen: everything exported as a single merged object,
and Draco left switched on.

---

## Attribution

| Model | Author | License | Added |
|-------|--------|---------|-------|
| [Arduino UNO](https://sketchfab.com/3d-models/arduino-uno-51dd4e0cdfad4c4c95354bc5e29dcf1a) (Sketchfab) | Helindu | CC BY 4.0 — http://creativecommons.org/licenses/by/4.0/ | 2026-08-18 |
| [Mint — Neverness to Everness](https://sketchfab.com/3d-models) (Sketchfab) | — | — | 2026-08-19 |

CC BY requires visible attribution, not just a credit buried in the repo —
the deck is hosted publicly, so slide 8 carries an on-screen credit line
("Arduino model by Helindu · CC BY 4.0") under the spec-stack text, in both
steps of the slide. The vtuber model attribution should be added once the
license is confirmed.
