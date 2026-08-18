// Real-time 3D vtuber portrait for slide 3.
//
// Displays a face/head bust from a baked Blender model with idle turntable
// rotation and studio lighting. No explode — just a showcase. The model
// arrives as base64 typed arrays (same pipeline as the Arduino on slide 8).
//
// Exposed as window.vtuber3D — animations.js drives mount/stop.
(function () {
  'use strict';

  const TARGET_WIDTH = 0.55;   // normalise model to this width in scene units
  const ROTATION_SPEED = 0.25; // radians per second (slow turntable)

  // A two-tone gradient standing in for a softbox — same approach as
  // hardware-3d.js. Without an environment map, metalness reads as black.
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

  function mount(canvas) {
    const cached = views.get(canvas);
    if (cached) { cached.resize(); return cached; }

    if (!window.modelLoader || !window.modelLoader.available('vtuber')) return null;

    if (THREE.ColorManagement) {
      if ('legacyMode' in THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;
      if ('enabled' in THREE.ColorManagement) THREE.ColorManagement.enabled = true;
    }

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    const scene = new THREE.Scene();
    scene.environment = studioEnvironment(renderer);

    // Portrait lens — slightly wider than the Arduino's product-shot look
    const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 10);

    // Build the model — model-loader handles re-centring and scaling
    const model = window.modelLoader.build(window.vtuberModel, TARGET_WIDTH);
    const group = new THREE.Group();
    Object.keys(model).forEach((name) => group.add(model[name]));
    scene.add(group);

    // Key light — warm, from upper-right
    const key = new THREE.DirectionalLight(0xfff5e8, 1.2);
    key.position.set(2, 3, 2);
    scene.add(key);

    // Fill — cool, from left
    const fill = new THREE.DirectionalLight(0xc8d8f0, 0.45);
    fill.position.set(-3, 1, 1);
    scene.add(fill);

    // Rim — subtle back-light for edge separation
    const rim = new THREE.DirectionalLight(0x88aaff, 0.35);
    rim.position.set(0, 1, -3);
    scene.add(rim);

    // Centre the camera on the model's vertical midpoint
    // model-loader re-centres to y=0, so the model sits around y=0
    const VIEW_DIR = new THREE.Vector3(0, 0.15, 1).normalize();
    const lookAt = new THREE.Vector3(0, 0, 0);

    function frame() {
      // Compute bounding box of the model group
      const box = new THREE.Box3().setFromObject(group);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

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

    function resize() {
      const w = canvas.clientWidth || canvas.parentElement.clientWidth;
      const h = canvas.clientHeight || Math.round(w * 1.2);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      frame();
    }

    let loop = null;
    let angle = 0;
    let lastTime = 0;

    function render() { renderer.render(scene, camera); }

    function tick(time) {
      if (!lastTime) lastTime = time;
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      angle += ROTATION_SPEED * dt;
      group.rotation.y = angle;

      render();
      if (api.onFrame) api.onFrame();
      loop = requestAnimationFrame(tick);
    }

    function start() {
      if (loop) return;
      lastTime = 0;
      loop = requestAnimationFrame(tick);
    }

    function stop() {
      if (loop) cancelAnimationFrame(loop);
      loop = null;
    }

    resize();
    window.addEventListener('resize', () => { resize(); render(); });

    const api = {
      renderer, scene, camera, group, model,
      onFrame: null,
      resize, render, start, stop, frame,
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

  window.vtuber3D = { supported, mount, stopAll };
})();
