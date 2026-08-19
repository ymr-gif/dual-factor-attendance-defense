// Real-time 3D Samsung phone for slide 4 (Liveness).
//
// Displays a baked Samsung S26 Ultra model. The entrance is a GSAP-driven
// Apple-style kinetic spin; after it settles the phone idly spins in place
// forever (a slow turntable/product-display rotation), screen off, and a
// red X stamp (matching the left scene's .liveness-stamp) slams onto it
// once and stays — a "rejected" verdict, not a demo of the screen content.
//
// The phone's screen mesh has a baked-in UV bug — confirmed with a labeled
// test-grid texture — that mirrors whatever's applied to it across the
// screen's centerline (both halves sample the same UV range in opposite
// directions, the classic symptom of a mirror-modifier-built mesh whose UVs
// were never split for the two mirrored halves). That's moot now (the
// screen never shows content, just a flat off/black glow), but is why one
// wasn't attempted here.
//
// Exposed as window.phone3D — animations.js drives mount/stop.
(function () {
  'use strict';

  const TARGET_WIDTH = 0.55;

  // Screen mesh names. The bake for this model produced 4 near-duplicate,
  // near-coplanar meshes covering the phone's front face (confirmed by
  // dumping every mesh's bounding box: Object_46/4/6/44 all share almost
  // the same box). Treating any single one as "the" screen and giving it a
  // texture only works until z-fighting picks a different winner — verified
  // this by coloring all 4 differently: the visible face flickered between
  // them. Applying the same material to every match sidesteps the z-fight
  // instead of trying to predict its winner.
  const SCREEN_CANDIDATES = ['Object_46', 'Object_4', 'Object_6', 'Object_44'];

  // ── Procedural environment ─────────────────────────────────────────

  function studioEnvironment(renderer) {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, '#8090a0');
    grad.addColorStop(0.4, '#303848');
    grad.addColorStop(0.75, '#101418');
    grad.addColorStop(1, '#080a0e');
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

  // ── Module state ───────────────────────────────────────────────────

  const mounted = [];
  const views = new Map();

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

  // ── Mount ──────────────────────────────────────────────────────────

  function mount(canvas) {
    const cached = views.get(canvas);
    if (cached) { cached.resize(); return cached; }

    if (!window.modelLoader || !window.modelLoader.available('phone')) return null;

    if (THREE.ColorManagement) {
      if ('legacyMode' in THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;
      if ('enabled' in THREE.ColorManagement) THREE.ColorManagement.enabled = true;
    }

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    // Scene + environment
    const scene = new THREE.Scene();
    scene.environment = studioEnvironment(renderer);

    // Camera — low FOV for hero product-shot feel
    const camera = new THREE.PerspectiveCamera(24, 1, 0.01, 100);

    // Build model
    const model = window.modelLoader.build(window.phoneModel, TARGET_WIDTH);
    const group = new THREE.Group();

    Object.keys(model).forEach((name) => {
      group.add(model[name]);
    });

    // Identify every screen-candidate mesh present (see SCREEN_CANDIDATES
    // comment) — all of them get the same material below.
    const screenMeshTargets = [];
    for (const name of SCREEN_CANDIDATES) {
      const part = model[name];
      if (!part) continue;
      part.traverse((child) => { if (child.isMesh) screenMeshTargets.push(child); });
    }

    // Body/casing recolor — the bake's own material is a light cream that
    // reads as an off-white phone; every mesh gets its own fresh material
    // instance (model-loader.js's materialFor() is called per-primitive,
    // never shared), so overriding properties here only touches these
    // parts, not the screen. Dark grey rather than pure black so the phone
    // still reads as a distinct silhouette against the slide's near-black
    // background, instead of disappearing into it.
    //
    // Verified live (dumped each mesh's material): color and envMapIntensity
    // WERE both applying correctly, yet the body still rendered off-white —
    // the real cause is roughness, baked near 0 (mirror-smooth) on most of
    // these parts. At that roughness, bright specular highlights from the
    // direct lights (not environment reflection) dominate the visible
    // surface regardless of diffuse color or envMapIntensity. model-
    // loader.js's roughnessFor() already patches this exact failure mode for
    // the Arduino shells, but only when metalness >= 0.9 — these parts sit
    // at 0.32-0.84, under that threshold, so it never kicked in here.
    const BODY_COLOR = 0x2b2d33;
    Object.keys(model).forEach((name) => {
      if (SCREEN_CANDIDATES.includes(name)) return;
      model[name].traverse((child) => {
        if (!child.isMesh) return;
        child.material.color.set(BODY_COLOR);
        child.material.roughness = Math.max(child.material.roughness, 0.6);
        child.material.envMapIntensity = 0.35;
      });
    });

    scene.add(group);

    // ── Screen material ────────────────────────────────────────────
    // Flat on/off backlight glow only — no texture (see file header for
    // why: the mesh mirrors any texture across the screen centerline).
    // Every screen-candidate mesh shares this one material instance, so
    // whichever one wins the z-fight on a given frame shows the same thing.
    const screenMaterial = new THREE.MeshStandardMaterial({
      roughness: 0.1,
      metalness: 0.0,
      emissive: 0xffffff,
      emissiveIntensity: 0.3,
    });
    screenMeshTargets.forEach((mesh) => { mesh.material = screenMaterial; });

    // ── Lighting ───────────────────────────────────────────────────

    // Key — warm, upper-right-front. Bumped from 1.4: with the hero-angle
    // VIEW_DIR the grey body (BODY_COLOR) was reading almost black — this
    // was tuned for the flat dead-on camera angle used briefly earlier.
    const key = new THREE.DirectionalLight(0xfff5e8, 2.4);
    key.position.set(2, 3, 3);
    scene.add(key);

    // Fill — cool, from left
    const fill = new THREE.DirectionalLight(0xc8d8f0, 0.5);
    fill.position.set(-3, 1, 2);
    scene.add(fill);

    // Rim — cyan accent from behind
    const rim = new THREE.DirectionalLight(0x88aaff, 0.35);
    rim.position.set(0, 2, -3);
    scene.add(rim);

    // ── Camera framing ─────────────────────────────────────────────

    // Off-axis "hero shot" angle. This was briefly flattened to (0,0,1)
    // dead-on while a flat 2D photo overlay needed to sit flush against the
    // screen's projected rect — now that the phone just spins with no
    // overlay to align, there's no reason not to have the more cinematic
    // angle back.
    const VIEW_DIR = new THREE.Vector3(0.3, 0.15, 1).normalize();
    const lookAt = new THREE.Vector3(0, 0, 0);

    function frame() {
      const box = new THREE.Box3().setFromObject(group);
      const center = box.getCenter(new THREE.Vector3());
      lookAt.copy(center);

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

      camera.position.copy(VIEW_DIR).multiplyScalar(distance * 1.15).add(center);
      camera.lookAt(lookAt);
    }

    // ── Sizing ─────────────────────────────────────────────────────

    function resize() {
      const w = canvas.clientWidth || canvas.parentElement.clientWidth;
      const h = canvas.clientHeight || Math.round(w * 1.3);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      frame();
    }

    // ── Render loop ────────────────────────────────────────────────

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
      if (entranceTimeline) { entranceTimeline.kill(); entranceTimeline = null; }
      if (idleTimeline)     { idleTimeline.kill();     idleTimeline = null; }
      if (scanTween)        { scanTween.kill();        scanTween = null; }
      if (stampTween)       { stampTween.kill();       stampTween = null; }
    }

    resize();
    window.addEventListener('resize', () => { resize(); render(); });

    // ── GSAP entrance + idle spin + scan + stamp ──────────────────────
    // All owned here so a single stop() can kill whichever is running:
    //   entranceTimeline — one-shot, slides the phone in with the screen off
    //   idleTimeline      — repeat:-1, slow turntable spin, forever
    //   scanTween         — one-shot, glow bar sweeps the screen once
    //   stampTween        — one-shot, the X stamp slams on and stays

    let entranceTimeline = null;
    let idleTimeline = null;
    let scanTween = null;
    let stampTween = null;

    const container = canvas.parentElement; // .phone-3d
    const scanEl = container.querySelector('.phone-scan-line');
    const stampEl = container.querySelector('.phone-stamp');

    function setScreenOff() {
      const m = screenMaterial;
      m.color.set(0x000000);
      m.emissive.set(0x000000);
      m.emissiveIntensity = 0;
      m.needsUpdate = true;
    }

    function playEntrance() {
      if (entranceTimeline) return;

      // Starting pose — far off-screen right and behind camera
      group.position.set(18, -4, -15);
      group.rotation.set(0.1, -Math.PI * 1.5, 0);

      // Start container off-screen right — computed from where the
      // container actually sits on screen right now, not a static guess.
      // A fixed '100vw' assumes the container's resting position is near
      // the left edge; wherever it really sits (nested in a centered flex
      // row, etc.), the true distance to clear the right edge is the
      // viewport width minus the container's own left edge, plus its own
      // width so it lands fully past the edge, not just touching it. A
      // static value being short of that is exactly what reads as the
      // phone "materializing" partway in rather than entering from off-
      // screen — it starts inside the visible area, just outside the
      // *container's* own footprint, not outside the *screen's*.
      const startRect = container.getBoundingClientRect();
      const offscreenX = window.innerWidth - startRect.left + startRect.width;
      gsap.set(container, { x: offscreenX });

      // Screen stays off — the phone never shows content beyond the scan
      // sweep below, just spins with a dark screen and takes the stamp.
      setScreenOff();
      if (scanEl) gsap.set(scanEl, { top: '12%', opacity: 0 });
      if (stampEl) gsap.set(stampEl, { opacity: 0, scale: 2.5, rotation: -30 });

      entranceTimeline = gsap.timeline({
        onComplete: () => { entranceTimeline = null; },
      });

      // 75% speed = duration / 0.75 (speed and duration are inverse for a
      // fixed distance) — was 4s.
      const ENTRANCE_DURATION = 4 / 0.75;

      // Phase 0: slide container in from right (matches 3D entrance timing)
      entranceTimeline.to(container, {
        x: 0,
        duration: ENTRANCE_DURATION,
        ease: 'power2.out',
      }, 0);

      // Phase 1: entrance spin (slow-mo for preview)
      entranceTimeline.to(group.position, {
        x: 0, y: 0, z: 0,
        duration: ENTRANCE_DURATION,
        ease: 'power2.out',
      }, 0);

      entranceTimeline.to(group.rotation, {
        y: Math.PI,
        x: 0,
        z: 0,
        duration: ENTRANCE_DURATION,
        ease: 'power2.out',
      }, 0);

      // Idle spin + scan start before the entrance finishes, not on its
      // onComplete — with power2.out easing the phone is already nearly
      // settled by 80% in, so this overlaps the tail of the arrival
      // instead of a dead "arrive, pause, then scan" beat. Same 80%
      // fraction as before, scaled to the new duration.
      entranceTimeline.call(() => {
        playIdleSpin();
        playScan();
      }, [], ENTRANCE_DURATION * 0.8);
    }

    // Infinite: a bounded showcase wobble, not a full spin — a full
    // rotation briefly shows the phone's back (camera bump, logo), and
    // .phone-stamp is a fixed 2D screen-space overlay that doesn't rotate
    // with it, so it would end up floating over the wrong side. Rocking
    // within a range that never turns the front away sidesteps that
    // entirely, and fits the story better besides: a liveness rejection is
    // a front-of-phone thing. yoyo:true reverses the same tween forever —
    // Math.PI (wherever it rests after the entrance) is one endpoint,
    // Math.PI + swing is the other.
    function playIdleSpin() {
      if (idleTimeline) return;
      const swing = Math.PI / 4; // 45° (was ~35°, +10° per user request)
      idleTimeline = gsap.timeline({ repeat: -1, yoyo: true });
      idleTimeline.to(group.rotation, {
        y: Math.PI + swing,
        duration: 3,
        ease: 'sine.inOut',
      });
    }

    // One-shot: a glow bar sweeps down the (still dark) screen once,
    // mirroring the left scene's .liveness-scan-line, then hands off to
    // playStamp() — this is the lead-in beat, so playStamp() no longer
    // needs its own fixed delay.
    function playScan() {
      if (scanTween || !scanEl) { playStamp(); return; }
      scanTween = gsap.timeline({
        delay: 0.3,
        onComplete: () => { scanTween = null; playStamp(); },
      });
      scanTween
        .to(scanEl, { opacity: 1, duration: 0.15 })
        .to(scanEl, { top: '85%', duration: 1.0, ease: 'none' })
        .to(scanEl, { opacity: 0, duration: 0.15 });
    }

    // One-shot: the X stamp slams on (matching .liveness-stamp's left-scene
    // entrance) right after the scan sweep, and stays — it does not repeat
    // or track the phone's continued rotation underneath it.
    function playStamp() {
      if (!stampEl || stampTween) return;
      stampTween = gsap.to(stampEl, {
        opacity: 1,
        scale: 1,
        rotation: -15,
        duration: 0.35,
        ease: 'back.out(1.7)',
        delay: 0.1,
        onComplete: () => { stampTween = null; },
      });
    }

    // ── API ────────────────────────────────────────────────────────

    const api = {
      renderer, scene, camera, group, model,
      onFrame: null,
      resize, render, start, stop, frame, playEntrance,
      dispose() {
        stop(); // also kills entranceTimeline/idleTimeline/stampTween
        api.onFrame = null;
        renderer.dispose();
        scene.traverse((node) => {
          if (node.geometry) node.geometry.dispose();
          if (node.material) {
            const mats = Array.isArray(node.material) ? node.material : [node.material];
            mats.forEach((m) => {
              if (m.map) m.map.dispose();
              if (m.emissiveMap) m.emissiveMap.dispose();
              m.dispose();
            });
          }
        });
      },
    };

    views.set(canvas, api);
    mounted.push(api);
    return api;
  }

  window.phone3D = { supported, mount, stopAll };
})();
