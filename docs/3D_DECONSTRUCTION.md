# 3D Deconstruction — Exploded View System

## Concept

Hyper-realistic 3D exploded view of the Arduino Uno, inspired by Apple's product visualizations (iPhone/MacBook teardowns). Components lift off the PCB in a choreographed animation, revealing internal architecture while labels identify each part.

**Current state:** Shipped 2026-08-18 — real-time WebGL board with PBR materials,
studio lighting and tracked callout labels (slide 8, step 2). The isometric SVG
explode is still there as the fallback when WebGL is unavailable.

## What shipped, and where it departs from the plan below

| Plan | Shipped | Why |
|------|---------|-----|
| Three.js 0.170 as ESM + import map | **three.js r149, vendored to `src/vendor/three.min.js`** | The deck is opened straight from the filesystem. ES modules and import maps are blocked by CORS on `file://`, and a CDN fetch fails on venue wifi. r149 is the last release with a plain-script build. |
| Model authored in Blender, exported to `.glb` | **Geometry built in code** (`src/js/hardware-3d.js`) | No model exists, and a licensed download has the same problem as a stock image. Extruded rounded boxes, cylinders and pin strips read as well as a mesh at this scale, and nothing has to load. |
| GLTFLoader + DRACOLoader | **Neither** | Nothing to load, so nothing to decompress — and the DRACO decoder path in the plan pointed at a CDN. |
| Labels positioned via CSS percentages | **HTML callouts in fixed columns, leader lines re-aimed each frame** | Percentages drift as parts move. `view.project(part)` gives the part's screen position; the label stays put and only its leader moves. |
| `renderer.outputColorSpace`, `THREE.SRGBColorSpace` | `renderer.outputEncoding`, `THREE.sRGBEncoding`, `ColorManagement.legacyMode = false` | r149 spellings. Without the colour-management flag every material renders washed out. |

Still open from the plan: camera orbit, depth of field, drag-to-rotate, and the
Blender path if the procedural board ever stops being good enough.

**Original target state:** WebGL-rendered 3D model with PBR materials, realistic lighting, smooth camera movement

---

## Inspiration

Apple product pages use:
- Pre-rendered 3D from Cinema 4D/Blender
- Physically-based rendering (PBR) materials
- Smooth camera orbits during exploded views
- Depth of field for cinematic feel
- Components with realistic reflections (metal, glass, plastic)

We adapt this for real-time WebGL using Three.js.

---

## Technical Approach

### Stack Addition

| Package | Version | Purpose |
|---------|---------|---------|
| Three.js | **r149, vendored locally** | WebGL renderer, scene graph |
| ~~GLTFLoader~~ | — | Not used; geometry is built in code |
| ~~DRACOLoader~~ | — | Not used; nothing is loaded |

### Why GLTF/GLB

- Industry standard for 3D on the web
- Supports PBR materials (Principled BSDF from Blender)
- Draco compression reduces file size 5-10×
- Separate meshes per component = easy animation

### Why Not Pre-Rendered Sprites

| Approach | Quality | File Size | Load Time |
|----------|---------|-----------|-----------|
| GLTF + Three.js | ★★★★★ | 200-500 KB | ~100ms |
| Sprite sheet (60 frames) | ★★★★★ | 5-20 MB | ~2s |
| CSS 3D transforms | ★★★☆☆ | 10-50 KB | ~10ms |

GLTF wins on quality/size ratio.

---

## Blender Workflow

### 1. Modeling

Model each component as a **separate object**:

| Object Name | Component | Material |
|-------------|-----------|----------|
| `pcb` | PCB board | Dark green matte |
| `usb_b` | USB Type-B connector | Brushed metal |
| `power_jack` | DC power barrel jack | Black plastic |
| `hdr_a1` | Analog header strip | Black plastic |
| `hdr_a2` | Analog header strip | Black plastic |
| `hdr_d1` | Digital header strip | Black plastic |
| `hdr_d2` | Digital header strip | Black plastic |
| `mcu` | ATmega328P chip | Black IC matte |
| `xtal` | 16 MHz crystal | Silver metallic |
| `regulator` | Voltage regulator (LM7805) | Black IC matte |
| `icsp` | ICSP header | Black plastic |
| `leds` | Power/status LEDs (4×) | Emissive colored |
| `reset` | Reset button | Black plastic |

### 2. Materials (Principled BSDF)

**PCB:**
```
Base Color: #0b5345 (dark green)
Roughness: 0.7
Metallic: 0.1
```

**Metallic parts (USB, Crystal):**
```
Base Color: #8b95a4 (silver)
Roughness: 0.3
Metallic: 0.9
```

**Black plastic (headers, ICs):**
```
Base Color: #1a1a24
Roughness: 0.8
Metallic: 0.0
```

**LEDs (emissive):**
```
Base Color: #2ecc71 (green), #f1c40f (yellow), #e74c3c (red)
Emission Strength: 2.0
```

### 3. Positioning

**Assembled state** (default):
- All components flat on PCB surface
- Headers at board edges
- MCU centered
- USB/Power jacks at board corners

**Exploded state** (target):
- Components lift along Z-axis (upward from PCB)
- Spacing: 1.5-3.0 units between layers
- Slight rotation for visual interest

### 4. Export Settings

**Blender → File → Export → glTF 2.0 (.glb/.gltf):**

```
Format: glTF Binary (.glb)
Include: Selected Objects (if isolating)
Transform: +Y Up (Three.js default)
Compression: DRACO (check box)
  - Compression Level: 6
  - Quantization: 14
```

**Output:** `src/models/arduino.glb` (~200-500 KB)

---

## Three.js Integration

### File Structure

```
src/
  models/
    arduino.glb           # Compressed GLTF model
  js/
    three-manager.js      # WebGL renderer singleton
    hardware-3d.js        # Slide 8 scene + animation
    animations.js         # Updated hardware() function
```

### three-manager.js

Singleton WebGL renderer shared across slides:

```javascript
// Singleton pattern — one canvas, one context
let renderer = null;

export function getRenderer() {
  if (!renderer) {
    const canvas = document.getElementById('three-canvas');
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,        // Transparent background
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
  }
  return renderer;
}

export function disposeRenderer() {
  if (renderer) {
    renderer.dispose();
    renderer = null;
  }
}
```

### hardware-3d.js

Scene setup and animation for slide 8:

```javascript
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { getRenderer } from './three-manager.js';

const MODEL_PATH = 'src/models/arduino.glb';

// Component positions — assembled vs exploded
const LAYERS = {
  pcb:        { assembled: [0, 0, 0],    exploded: [0, 0, 0] },
  usb_b:      { assembled: [-1.2, 0.3, 0], exploded: [-1.2, 2.5, 0] },
  power_jack: { assembled: [1.0, 0.3, 0],  exploded: [1.0, 2.0, 0] },
  hdr_a1:     { assembled: [0.8, 0.4, 0],  exploded: [0.8, 3.5, 0] },
  hdr_a2:     { assembled: [0.8, 0.4, 0.3], exploded: [0.8, 3.5, 0.3] },
  hdr_d1:     { assembled: [-0.8, 0.4, 0], exploded: [-0.8, 3.5, 0] },
  hdr_d2:     { assembled: [-0.8, 0.4, 0.3], exploded: [-0.8, 3.5, 0.3] },
  mcu:        { assembled: [0, 0.35, 0],   exploded: [0, 3.0, 0] },
  xtal:       { assembled: [-0.5, 0.25, 0], exploded: [-0.5, 1.8, 0] },
  regulator:  { assembled: [0.3, 0.2, 0],  exploded: [0.3, 1.5, 0] },
  icsp:       { assembled: [0.9, 0.3, 0],  exploded: [0.9, 2.2, 0] },
  leds:       { assembled: [0, 0.15, 0],   exploded: [0, 1.0, 0] },
  reset:      { assembled: [0.6, 0.2, 0],  exploded: [0.6, 1.8, 0] },
};

let scene, camera, model, parts = {};

export async function initHardwareScene() {
  const renderer = getRenderer();
  const canvas = renderer.domElement;

  scene = new THREE.Scene();

  // Camera — isometric-ish perspective
  camera = new THREE.PerspectiveCamera(35, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(4, 5, 6);
  camera.lookAt(0, 0, 0);

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);

  const directional = new THREE.DirectionalLight(0xffffff, 0.8);
  directional.position.set(5, 8, 4);
  scene.add(directional);

  // Load model
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/');
  loader.setDRACOLoader(dracoLoader);

  const gltf = await loader.loadAsync(MODEL_PATH);
  model = gltf.scene;
  scene.add(model);

  // Index parts by name
  model.traverse((child) => {
    if (child.isMesh) {
      parts[child.name] = child;
    }
  });

  // Set initial assembled positions
  Object.entries(LAYERS).forEach(([name, pos]) => {
    if (parts[name]) {
      parts[name].position.set(...pos.assembled);
    }
  });

  return { scene, camera, parts };
}

export function renderFrame() {
  const renderer = getRenderer();
  renderer.render(scene, camera);
}

export function getParts() {
  return parts;
}

export function getLayers() {
  return LAYERS;
}
```

### animations.js Integration

Update `hardware(el)` Step 2 to use Three.js:

```javascript
import { initHardwareScene, renderFrame, getParts, getLayers } from './hardware-3d.js';

// ... existing code ...

// Step 2 — the explode animation
const explode = async () => {
  // Initialize Three.js scene if not already done
  const { parts, layers } = await initHardwareScene();

  // Fade out SVG rig
  tl.add(context, {
    opacity: [1, 0],
    duration: 400,
  });

  // Show Three.js canvas
  tl.add('#three-canvas', {
    opacity: [0, 1],
    duration: 400,
  }, '-=200');

  // Animate parts from assembled → exploded
  const partNames = Object.keys(parts);
  partNames.forEach((name) => {
    const target = layers[name].exploded;
    tl.add(parts[name].position, {
      x: target[0],
      y: target[1],
      z: target[2],
      duration: 1200,
      ease: 'outExpo',
    }, `<${stagger(50)}`);
  });

  // Render loop during animation
  tl.onUpdate = () => renderFrame();

  return tl;
};
```

---

## HTML Changes

### index.html

Add import map in `<head>`:

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"
  }
}
</script>
```

Add canvas to slide 8:

```html
<section class="slide slide--specs" data-slide="8" data-anim="hardware">
  <div class="slide__content">
    <h2 class="specs-title">Prototype</h2>

    <!-- Existing SVG rig -->
    <svg class="rig-svg" viewBox="0 0 1280 570">
      <!-- ... existing SVG content ... -->
    </svg>

    <!-- Three.js canvas (hidden by default) -->
    <canvas id="three-canvas" class="three-canvas"></canvas>

    <p class="specs-caption">Guardpost rig</p>
    <p class="specs-stack">FastAPI · PostgreSQL · Redis · face_recognition · MiniFASNet</p>
  </div>
</section>
```

### layout.css

```css
.three-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  pointer-events: none;
}

.slide--specs .three-canvas.visible {
  opacity: 1;
  pointer-events: auto;
}
```

---

## Animation Sequence

### Step 1 (Current — Keep)

1. Title fades in
2. Units (RC522, webcam, laptop, card) drop in with stagger
3. Wires draw themselves (SVG path animation)
4. Rig labels appear

### Step 2 (New — 3D Explode)

1. SVG rig fades out (400ms)
2. Three.js canvas fades in (400ms)
3. Parts animate from assembled → exploded (1200ms, staggered 50ms)
4. Camera slowly orbits (optional, adds cinematic feel)
5. Part labels fade in (HTML overlays positioned via CSS)

---

## Performance Considerations

| Metric | Target | Notes |
|--------|--------|-------|
| File size | < 500 KB | Draco compression |
| Load time | < 200ms | CDN + cache |
| FPS during animation | 60 fps | requestAnimationFrame |
| Memory | < 50 MB | Single model, no textures |

### Optimization Tips

1. **Draco compression** — 5-10× size reduction
2. **No textures** — Use material colors only (keeps file small)
3. **Reuse renderer** — Singleton pattern, one WebGL context
4. **Dispose on slide leave** — Free memory when not viewing slide 8
5. **Lazy load** — Only initialize Three.js when slide 8 is first visited

---

## Label Overlays

Labels can be HTML elements positioned over the canvas:

```html
<div class="part-label-3d" style="--x: 50%; --y: 30%;">
  <span class="label-line"></span>
  <span class="label-text">ATmega328P</span>
  <span class="label-sub">Reads card ID, relays to backend</span>
</div>
```

```css
.part-label-3d {
  position: absolute;
  left: var(--x);
  top: var(--y);
  transform: translate(-50%, -50%);
  opacity: 0;
  pointer-events: none;
}
```

Animate opacity in Step 2 after parts settle.

---

## Fallback Strategy

If WebGL is unavailable or model fails to load:

```javascript
// In hardware-3d.js
export async function initHardwareScene() {
  try {
    // Attempt Three.js initialization
    // ...
  } catch (err) {
    console.warn('3D unavailable, using SVG fallback');
    // Show original SVG rig instead
    document.querySelector('.rig-svg').style.opacity = 1;
    return null;
  }
}
```

---

## Testing Checklist

- [ ] Blender model exports cleanly as .glb
- [ ] Draco compression works (< 500 KB)
- [ ] Three.js loads model without errors
- [ ] PBR materials render correctly
- [ ] Exploded animation plays smoothly (60 fps)
- [ ] Labels position correctly over 3D model
- [ ] Fallback to SVG works if WebGL unavailable
- [ ] Memory freed when leaving slide 8
- [ ] Works on Chrome, Firefox, Safari
- [ ] Works on projector (test venue display)

---

## Future Enhancements

1. **Camera orbit** — Slow rotation during exploded view
2. **Depth of field** — Blur background for cinematic feel
3. **Interactive rotation** — Drag to rotate (if time permits)
4. **Component glow** — Emissive pulse on hover/focus
5. **Wireframe toggle** — Show/hide wireframe overlay
6. **Exploded view presets** — Different camera angles for different parts

---

## References

- [Three.js GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader)
- [Draco Compression](https://google.github.io/draco/)
- [PBR Materials in Blender](https://docs.blender.org/manual/en/latest/render/materials/properties/principled.html)
- [Apple iPhone Teardown](https://www.ifixit.com/Teardown/iPhone+Teardown/8628) (visual reference)
