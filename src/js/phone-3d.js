// Real-time 3D Samsung phone for slide 4 (Liveness).
//
// Displays a baked Samsung S26 Ultra model with a procedural screen texture
// that scrolls to simulate an app swipe. The entrance is a GSAP-driven
// Apple-style kinetic spin. The SVG liveness scene runs alongside it.
//
// Exposed as window.phone3D — animations.js drives mount/stop.
(function () {
  'use strict';

  const TARGET_WIDTH = 0.55;

  // Screen mesh names — the largest flat black plane on the front face.
  // Tried in order; first match wins.
  const SCREEN_CANDIDATES = ['Object_46', 'Object_4', 'Object_6'];

  // ── Procedural screen texture ──────────────────────────────────────
  // A tall canvas with coloured bands and simple shapes to read as
  // scrolling app UI. Different colours make the swipe obvious.

  const UI_WIDTH = 300;
  const UI_HEIGHT = 1200;

  function createScreenCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = UI_WIDTH;
    canvas.height = UI_HEIGHT;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, UI_WIDTH, UI_HEIGHT);

    const bands = [
      { y: 0,   h: 140, color: '#161b22' },
      { y: 140, h: 120, color: '#1a1f2e' },
      { y: 260, h: 160, color: '#0d1117' },
      { y: 420, h: 100, color: '#1c2333' },
      { y: 520, h: 140, color: '#161b22' },
      { y: 660, h: 120, color: '#1a1f2e' },
      { y: 780, h: 160, color: '#0d1117' },
      { y: 940, h: 130, color: '#1c2333' },
      { y: 1070,h: 130, color: '#161b22' },
    ];

    bands.forEach((b) => {
      ctx.fillStyle = b.color;
      ctx.fillRect(0, b.y, UI_WIDTH, b.h);

      // Card-like rounded rects
      ctx.fillStyle = '#21262d';
      roundRect(ctx, 20, b.y + 15, UI_WIDTH - 40, b.h - 30, 8);
      ctx.fill();

      // Coloured accent dots
      const colors = ['#00d4ff', '#7b2ff7', '#00ff88', '#ff3366', '#ffaa00'];
      const dotColor = colors[(b.y / 140) % colors.length | 0];
      ctx.beginPath();
      ctx.arc(50, b.y + b.h / 2, 12, 0, Math.PI * 2);
      ctx.fillStyle = dotColor;
      ctx.fill();

      // Fake text lines
      ctx.fillStyle = '#30363d';
      ctx.fillRect(80, b.y + b.h / 2 - 10, 140, 6);
      ctx.fillRect(80, b.y + b.h / 2 + 4, 100, 6);
    });

    return canvas;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

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
    let screenMesh = null;

    Object.keys(model).forEach((name) => {
      const part = model[name];
      group.add(part);

      // Identify screen mesh
      if (!screenMesh && SCREEN_CANDIDATES.includes(name)) {
        screenMesh = part;
      }
    });

    scene.add(group);

    // ── Screen texture ─────────────────────────────────────────────

    const screenCanvas = createScreenCanvas();
    const screenTexture = new THREE.CanvasTexture(screenCanvas);
    screenTexture.wrapS = THREE.ClampToEdgeWrapping;
    screenTexture.wrapT = THREE.RepeatWrapping;
    screenTexture.repeat.set(1, 0.33); // show ~1/3 of the UI at a time
    screenTexture.offset.y = 0;
    screenTexture.minFilter = THREE.LinearFilter;
    screenTexture.magFilter = THREE.LinearFilter;

    // Apply screen material
    if (screenMesh) {
      // The baked model has geometry in groups — find the mesh inside
      let target = null;
      screenMesh.traverse((child) => {
        if (child.isMesh && !target) target = child;
      });
      if (target) {
        target.material = new THREE.MeshStandardMaterial({
          map: screenTexture,
          roughness: 0.1,
          metalness: 0.0,
          emissive: 0xffffff,
          emissiveIntensity: 0.3,
          emissiveMap: screenTexture,
        });
      }
    }

    // ── Lighting ───────────────────────────────────────────────────

    // Key — warm, upper-right-front
    const key = new THREE.DirectionalLight(0xfff5e8, 1.4);
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
    }

    resize();
    window.addEventListener('resize', () => { resize(); render(); });

    // ── GSAP entrance + scroll animation ───────────────────────────

    let entranceTimeline = null;

    function playEntrance() {
      if (entranceTimeline) return;

      // Starting pose — off-screen right, mid-spin
      group.position.set(12, -3, -5);
      group.rotation.set(0.1, -Math.PI * 2.5, 0);

      entranceTimeline = gsap.timeline({
        onComplete: () => { entranceTimeline = null; },
      });

      // Phase 1: entrance spin
      entranceTimeline.to(group.position, {
        x: 0, y: 0, z: 0,
        duration: 1.2,
        ease: 'power3.out',
      }, 0);

      entranceTimeline.to(group.rotation, {
        y: -0.2,
        x: 0.1,
        z: 0,
        duration: 1.2,
        ease: 'power3.out',
      }, 0);

      // Phase 2: screen scroll — overlaps the end of the entrance
      entranceTimeline.to(screenTexture.offset, {
        y: 0.67,
        duration: 1.5,
        ease: 'power2.inOut',
      }, 0.6);
    }

    // ── API ────────────────────────────────────────────────────────

    const api = {
      renderer, scene, camera, group, model, screenTexture,
      onFrame: null,
      resize, render, start, stop, frame, playEntrance,
      dispose() {
        stop();
        if (entranceTimeline) { entranceTimeline.kill(); entranceTimeline = null; }
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
