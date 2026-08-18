# Model Pipeline — Blender to Slide 8

How a modelled Arduino gets into the deck, and exactly what the file has to look
like. The 3D board on slide 8 works without one; a model replaces its built-in
geometry with something more detailed.

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
arduino.glb  →  node tools/model/bake.js  →  src/models/arduino-model.js  →  browser
```

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
| **Materials as Principled BSDF** | Base colour, roughness, metallic and emission are read. Textures are ignored. |
| **License and author** | It ships in a defence deck. A CC-BY model is fine with attribution; note it in this file. |

### Names the deck knows

`pcb`, `mcu`, `usb`, `jack`, `xtal`, `reg`, `icsp`, `reset`, `leds`,
`hdr-d1`, `hdr-d2`, `hdr-a1`, `hdr-a2`

Underscores work too — `hdr_d1` is read as `hdr-d1`. Labels currently point at
`pcb`, `mcu`, `usb`, `jack`, `xtal` and `hdr-d2`.

### Not required

- Real-world scale — the deck normalises the model to a 68.6 mm board
- Centring — the model is re-centred and dropped onto the board plane
- Textures, UVs, lights, cameras, animation — all ignored
- Vertex counts inside any particular budget; the baked file is what matters,
  and anything under ~2 MB is fine

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

## Baking

```
node tools/model/bake.js ~/Downloads/arduino.glb
```

Prints the parts it found, the file size, and the model's bounds — check the
part names in that list before going further. Writes
`src/models/arduino-model.js`, which `index.html` already loads.

To go back to the built-in geometry, replace that file with the placeholder
comment it shipped with.

---

## What happens at runtime

1. `src/models/arduino-model.js` defines `window.arduinoModel` (or does not)
2. `src/js/model-loader.js` decodes each part into a `BufferGeometry`, builds a
   `MeshStandardMaterial` from the baked material values, scales the model so
   the board matches the deck's dimensions, and re-centres it
3. `src/js/hardware-3d.js` uses those parts if they exist, its own primitives if
   not — lighting, camera framing, shadows and the explode choreography are the
   same either way
4. Parts not named in the explode table still lift, by a default amount
5. Labels whose part is missing from the model hide themselves

---

## Checking a model without the deck

`tools/model/bake.js` prints bounds and part names, which catches the two
mistakes that actually happen: everything exported as a single merged object,
and Draco left switched on.

---

## Attribution

Record the model's source and license here when one is added.

| Model | Author | License | Added |
|-------|--------|---------|-------|
| _none yet — deck uses built-in geometry_ | — | — | — |
