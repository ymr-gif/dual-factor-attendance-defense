// Real-time 3D Arduino for slide 8, step 2.
//
// The geometry is built in code rather than loaded from a model file: it keeps
// the deck to plain files with nothing to fetch at the venue, and the board is
// simple enough that primitives read as well as a mesh would. Materials are
// physically based and lit by a small procedural studio environment, which is
// what gives the parts their metal and matte-plastic feel.
//
// Exposed as window.hardware3D — animations.js drives the choreography.
(function () {
  'use strict';

  const MM = 0.1;          // scene units per millimetre
  const W = 68.6 * MM;     // Arduino Uno footprint
  const D = 53.4 * MM;
  const T = 1.6 * MM;

  // How far each part lifts in the exploded view, in scene units. Mirrors the
  // isometric scene's RISE table so both versions read the same.
  //
  // Two entries are deliberately 0. In the modelled board, `components` is a
  // board-sized catch-all for everything not classified, and `leds` turned out
  // to be flat decal planes, not parts — lifting either sends a slab the size of
  // the PCB into the air. They stay put and travel with the board.
  const EXPLODE = {
    pcb: 0, components: 0, leds: 0, reg: 0.95, xtal: 1.15, reset: 1.25, icsp: 1.4,
    mcu: 1.85, usb: 2.35, jack: 2.35,
    'hdr-d1': 3.0, 'hdr-d2': 3.0, 'hdr-a1': 3.0, 'hdr-a2': 3.0,
  };

  const COLORS = {
    pcb: 0x0a3542,
    pcbEdge: 0x0a3543,
    silk: 0xdfeaf0,
    plastic: 0x14141b,
    ic: 0x1c1c24,
    metal: 0x9aa4b2,
    gold: 0xc8a24a,
  };

  function materials() {
    return {
      pcb: new THREE.MeshStandardMaterial({ color: COLORS.pcb, roughness: 0.74, metalness: 0.08 }),
      plastic: new THREE.MeshStandardMaterial({ color: COLORS.plastic, roughness: 0.78, metalness: 0.04 }),
      ic: new THREE.MeshStandardMaterial({ color: COLORS.ic, roughness: 0.55, metalness: 0.08 }),
      metal: new THREE.MeshStandardMaterial({ color: COLORS.metal, roughness: 0.28, metalness: 0.94 }),
      gold: new THREE.MeshStandardMaterial({ color: COLORS.gold, roughness: 0.35, metalness: 0.9 }),
      silk: new THREE.MeshStandardMaterial({ color: COLORS.silk, roughness: 0.9, metalness: 0 }),
    };
  }

  // A box with softened edges — bevels are most of what makes a primitive
  // stop looking like a primitive under studio light.
  function roundedBox(w, h, d, radius, material) {
    const r = Math.min(radius, w / 2.2, d / 2.2);
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2 + r, -d / 2);
    shape.lineTo(w / 2 - r, -d / 2);
    shape.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
    shape.lineTo(w / 2, d / 2 - r);
    shape.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
    shape.lineTo(-w / 2 + r, d / 2);
    shape.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r);
    shape.lineTo(-w / 2, -d / 2 + r);
    shape.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);

    const bevel = Math.min(h * 0.18, 0.012);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: h - bevel * 2,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 2,
      curveSegments: 6,
    });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, bevel, 0);

    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function pinStrip(count, material) {
    const group = new THREE.Group();
    const pitch = 2.54 * MM;
    for (let i = 0; i < count; i++) {
      const pin = new THREE.Mesh(
        new THREE.BoxGeometry(0.64 * MM, 6 * MM, 0.64 * MM),
        material
      );
      pin.position.set((i - (count - 1) / 2) * pitch, 3 * MM, 0);
      pin.castShadow = true;
      group.add(pin);
    }
    return group;
  }

  // Places a part at board coordinates measured in millimetres from the
  // bottom-left corner, the same frame the isometric generator uses.
  function place(obj, xmm, zmm, ymm) {
    obj.position.set(xmm * MM - W / 2, (ymm || 0) * MM + T, zmm * MM - D / 2);
    return obj;
  }

  function buildBoard(mat) {
    const parts = {};

    // --- PCB with mounting holes ---
    const pcb = new THREE.Group();
    const slab = roundedBox(W, T, D, 3 * MM, mat.pcb);
    slab.position.y = 0;
    pcb.add(slab);
    [[8, 8], [60.6, 8], [8, 45.4], [60.6, 45.4]].forEach(([x, z]) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.6 * MM, 0.5 * MM, 8, 20),
        mat.gold
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x * MM - W / 2, T + 0.01, z * MM - D / 2);
      pcb.add(ring);
    });
    parts.pcb = pcb;

    // --- headers ---
    const header = (name, count, xmm, zmm) => {
      const g = new THREE.Group();
      const body = roundedBox(count * 2.54 * MM, 2.5 * MM, 2.54 * MM, 0.3 * MM, mat.plastic);
      g.add(body);
      const pins = pinStrip(count, mat.gold);
      pins.position.y = -1 * MM;
      g.add(pins);
      parts[name] = place(g, xmm, zmm);
    };
    header('hdr-d1', 8, 24, 49.5);
    header('hdr-d2', 10, 47, 49.5);
    header('hdr-a1', 8, 22, 3.5);
    header('hdr-a2', 6, 44, 3.5);

    // --- ATmega328P, pins and orientation notch ---
    const mcu = new THREE.Group();
    const chip = roundedBox(35 * MM, 4 * MM, 7.5 * MM, 0.4 * MM, mat.ic);
    mcu.add(chip);
    for (let i = 0; i < 14; i++) {
      [-1, 1].forEach((side) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.5 * MM, 1.6 * MM, 2.2 * MM), mat.metal);
        leg.position.set((i - 6.5) * 2.54 * MM, 0.8 * MM, side * 4.6 * MM);
        mcu.add(leg);
      });
    }
    const notch = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1 * MM, 1.1 * MM, 0.6 * MM, 18),
      new THREE.MeshStandardMaterial({ color: 0x0c0c11, roughness: 0.9 })
    );
    notch.position.set(-15 * MM, 4 * MM, 0);
    mcu.add(notch);
    parts.mcu = place(mcu, 38, 24.5);

    // --- USB-B, overhanging the left edge ---
    const usb = new THREE.Group();
    usb.add(roundedBox(16 * MM, 11 * MM, 12 * MM, 0.8 * MM, mat.metal));
    const throat = new THREE.Mesh(
      new THREE.BoxGeometry(11 * MM, 7 * MM, 1.5 * MM),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0e, roughness: 0.85 })
    );
    throat.position.set(-2.6 * MM, 5.5 * MM, -6 * MM);
    usb.add(throat);
    parts.usb = place(usb, 5, 38);

    // --- barrel power jack ---
    const jack = new THREE.Group();
    jack.add(roundedBox(13 * MM, 11 * MM, 9 * MM, 1.2 * MM, mat.plastic));
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2 * MM, 3.2 * MM, 4 * MM, 20, 1, true),
      mat.plastic
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 5.5 * MM, -6 * MM);
    jack.add(barrel);
    parts.jack = place(jack, 5, 9.5);

    // --- 16 MHz crystal ---
    const xtal = roundedBox(7 * MM, 3.2 * MM, 3.5 * MM, 1.4 * MM, mat.metal);
    parts.xtal = place(new THREE.Group().add(xtal), 22, 31);

    // --- voltage regulator ---
    const reg = new THREE.Group();
    reg.add(roundedBox(8 * MM, 4 * MM, 5 * MM, 0.3 * MM, mat.ic));
    parts.reg = place(reg, 16, 14);

    // --- ICSP header ---
    const icsp = new THREE.Group();
    icsp.add(roundedBox(3 * 2.54 * MM, 2.5 * MM, 2 * 2.54 * MM, 0.3 * MM, mat.plastic));
    parts.icsp = place(icsp, 62, 24);

    // --- reset button ---
    const reset = new THREE.Group();
    reset.add(roundedBox(6 * MM, 3 * MM, 6 * MM, 0.5 * MM, mat.plastic));
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8 * MM, 1.8 * MM, 1.4 * MM, 20),
      new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.5 })
    );
    cap.position.y = 3.4 * MM;
    reset.add(cap);
    parts.reset = place(reset, 62.5, 46);

    // --- status LEDs ---
    const leds = new THREE.Group();
    [0x2ecc71, 0xf1c40f, 0xf1c40f, 0xe74c3c].forEach((color, i) => {
      const led = new THREE.Mesh(
        new THREE.BoxGeometry(2 * MM, 1 * MM, 1.4 * MM),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.9,
          roughness: 0.4,
        })
      );
      led.position.x = i * 3.2 * MM;
      leds.add(led);
    });
    parts.leds = place(leds, 40, 41);

    return parts;
  }

  // A two-tone gradient standing in for a softbox — without an environment,
  // metalness reads as black.
  function studioEnvironment(renderer) {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, '#6c7076');
    grad.addColorStop(0.45, '#252c36');
    grad.addColorStop(0.75, '#0e1015');
    grad.addColorStop(1, '#07080c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromEquirectangular(texture).texture;
    pmrem.dispose();
    texture.dispose();
    return env;
  }

  // Where a part's callout leader line should point, in the part group's own
  // local space (before that group's position/rotation/scale are applied).
  // Procedural parts (buildBoard) put their true board position on the group
  // itself via place() and leave their meshes near local (0,0,0), so their
  // anchor comes out close to the origin — fine, that already worked. Baked
  // model parts (model-loader.js) do the opposite: the group stays at local
  // (0,0,0) so the explode animation can move it freely, and each part's
  // real position lives in its mesh(es)' local offset instead. Reading the
  // group's own position (the old code) collapses every model part to
  // nearly the same point. Computing the actual bounding-box centre of the
  // part's geometry works for both.
  function partAnchor(group) {
    const box = new THREE.Box3();
    group.children.forEach((child) => {
      if (!child.geometry) return;
      if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
      child.updateMatrix();
      box.union(child.geometry.boundingBox.clone().applyMatrix4(child.matrix));
    });
    return box.isEmpty() ? new THREE.Vector3() : box.getCenter(new THREE.Vector3());
  }

  const mounted = [];
  // One view per canvas. playSlide() re-runs a slide's animation on every
  // entry, so mounting unconditionally leaked a WebGL context per visit and
  // browsers cap them near 16 — the 3D died after enough Q&A backtracking.
  const views = new Map();

  // The render loop must not keep running once the deck has moved on — the
  // slide engine calls this on every slide change.
  function stopAll() {
    mounted.forEach((view) => view.stop());
  }

  function supported() {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.THREE && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
    } catch (err) {
      return false;
    }
  }

  function mount(canvas) {
    const cached = views.get(canvas);
    if (cached) {
      cached.resize();   // the canvas may have resized since the last visit
      return cached;
    }

    // Treat material hex values as sRGB, or every colour renders washed out.
    // r149 spells this legacyMode; later versions use enabled.
    if (THREE.ColorManagement) {
      if ('legacyMode' in THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;
      if ('enabled' in THREE.ColorManagement) THREE.ColorManagement.enabled = true;
    }

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.environment = studioEnvironment(renderer);

    // Long lens, well back — the product-shot look comes from low perspective
    // distortion, not from a wide dramatic angle. Distance is computed in
    // frame(), so the board fills the canvas at any aspect ratio.
    const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
    const VIEW_DIR = new THREE.Vector3(6.2, 7.6, 11.4).normalize();

    const key = new THREE.DirectionalLight(0xffffff, 1.55);
    key.position.set(4, 7, 3.5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 24;
    key.shadow.camera.left = -4.5;
    key.shadow.camera.right = 4.5;
    key.shadow.camera.top = 4.5;
    key.shadow.camera.bottom = -4.5;
    key.shadow.radius = 3;
    key.shadow.bias = -0.0012;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xbcd2de, 0.42);
    fill.position.set(-6, 3, -4);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0x00d4ff, 0.32);
    rim.position.set(-2, 1.5, -7);
    scene.add(rim);

    const board = new THREE.Group();
    const mat = materials();
    // A baked Blender model wins when one is present; the primitives stay as
    // the always-available version. See docs/3D_MODEL_PIPELINE.md.
    const parts = (window.modelLoader && window.modelLoader.available())
      ? window.modelLoader.build(window.arduinoModel, W)
      : buildBoard(mat);
    Object.keys(parts).forEach((name) => {
      parts[name].userData.anchor = partAnchor(parts[name]);
      board.add(parts[name]);
    });
    board.rotation.y = -0.42;
    scene.add(board);

    // catches the drop shadow so the board sits on something
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.ShadowMaterial({ opacity: 0.26 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.55;
    floor.receiveShadow = true;
    scene.add(floor);

    const rest = {};
    Object.keys(parts).forEach((name) => { rest[name] = parts[name].position.y; });

    // Fits the board — in its exploded spread, so nothing leaves the frame
    // mid-animation — into the canvas. Fitting the bounding box corners rather
    // than a bounding sphere matters here: the board is wide and flat, and a
    // sphere would leave it floating in the middle of a lot of empty frame.
    function frame(pad) {
      const held = {};
      Object.keys(parts).forEach((name) => {
        held[name] = parts[name].position.y;
        parts[name].position.y = rest[name] + riseFor(name);
      });
      const box = new THREE.Box3().setFromObject(board);
      Object.keys(parts).forEach((name) => { parts[name].position.y = held[name]; });

      const center = box.getCenter(new THREE.Vector3());
      const fovV = (camera.fov * Math.PI) / 180;
      const tanV = Math.tan(fovV / 2);
      const tanH = tanV * camera.aspect;

      const forward = VIEW_DIR.clone().negate();
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
      const up = new THREE.Vector3().crossVectors(right, forward).normalize();

      let distance = 0;
      const corner = new THREE.Vector3();
      for (let i = 0; i < 8; i++) {
        corner.set(
          i & 1 ? box.max.x : box.min.x,
          i & 2 ? box.max.y : box.min.y,
          i & 4 ? box.max.z : box.min.z
        ).sub(center);
        const depth = corner.dot(forward);
        const needed = Math.max(
          Math.abs(corner.dot(right)) / tanH,
          Math.abs(corner.dot(up)) / tanV
        ) - depth;
        distance = Math.max(distance, needed);
      }

      camera.position.copy(VIEW_DIR).multiplyScalar(distance * (pad || 1.04)).add(center);
      camera.lookAt(center);
    }

    function resize() {
      const w = canvas.clientWidth || canvas.parentElement.clientWidth;
      const h = canvas.clientHeight || Math.round(w * 0.5);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      frame();
    }

    let loop = null;
    function render() { renderer.render(scene, camera); }
    function start() {
      if (loop) return;
      const tick = () => {
        render();
        if (api.onFrame) api.onFrame();
        loop = requestAnimationFrame(tick);
      };
      loop = requestAnimationFrame(tick);
    }
    function stop() {
      if (loop) cancelAnimationFrame(loop);
      loop = null;
    }

    resize();
    window.addEventListener('resize', () => { resize(); render(); });

    const api = {
      renderer, scene, camera, board, parts, rest, explode: EXPLODE, riseFor,
      onFrame: null,
      resize, render, start, stop, frame,

      // drops every part back onto the board without animating
      assemble() {
        Object.keys(parts).forEach((name) => { parts[name].position.y = rest[name]; });
        render();
      },
      // where a part currently sits, in canvas pixels — for HTML labels
      project(name) {
        const target = parts[name];
        if (!target) return null;
        const v = target.userData.anchor.clone();
        target.localToWorld(v);
        v.project(camera);
        const rect = canvas.getBoundingClientRect();
        return {
          x: (v.x * 0.5 + 0.5) * rect.width,
          y: (-v.y * 0.5 + 0.5) * rect.height,
        };
      },
      dispose() {
        stop();
        api.onFrame = null;
        renderer.dispose();
        scene.traverse((node) => {
          if (node.geometry) node.geometry.dispose();
          if (node.material) [].concat(node.material).forEach((m) => m.dispose());
        });
      },
    };

    views.set(canvas, api);
    mounted.push(api);
    return api;
  }

  // Parts the explode table does not name still travel, just less far
  function riseFor(name) {
    return EXPLODE[name] !== undefined ? EXPLODE[name] : 1.5;
  }

  window.hardware3D = { supported, mount, stopAll, riseFor, EXPLODE, MM, W, D, T };
})();
