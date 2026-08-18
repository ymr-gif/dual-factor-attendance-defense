// Real-time 3D vtuber portrait for slide 3.
//
// Displays the top half (head to torso) of a baked Blender character model
// with studio lighting. Static — no rotation, no explode. The model arrives
// as base64 typed arrays (same pipeline as the Arduino on slide 8).
//
// Exposed as window.vtuber3D — animations.js drives mount/stop.
(function () {
  'use strict';

  const TARGET_WIDTH = 0.55;   // normalise model to this width in scene units

  // Fraction of the model's height, measured down from the top of the hair,
  // that the camera frames. From the model's own width profile: head and hair
  // are the top 25%, the neck is the narrowest slice at 25%, shoulders run
  // 29-37%, arms spread past 42%. 0.26 lands on the shoulder line.
  //
  // Framing fits this band by HEIGHT only. The shoulders are wider than the
  // canvas at this zoom and are meant to run off both sides — fitting their
  // width instead would pull the camera back and shrink the face.
  const PORTRAIT = 0.26;

  // Breathing room above the hair, as a fraction of the visible height
  const TOP_MARGIN = 0.06;

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
    const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 50);

    // Build the model — model-loader handles re-centring and scaling
    const model = window.modelLoader.build(window.vtuberModel, TARGET_WIDTH);
    const group = new THREE.Group();
    Object.keys(model).forEach((name) => group.add(model[name]));
    // The world matrix swaps Y↔Z (Z-up → Y-up conversion). Rotate to
    // stand upright (−π/2 around X) and face the camera (π around Y).
    group.rotation.x = Math.PI / 2;
    scene.add(group);

    // Key light — warm, from upper-right-front
    const key = new THREE.DirectionalLight(0xfff5e8, 1.3);
    key.position.set(2, 3, 3);
    scene.add(key);

    // Fill — cool, from left
    const fill = new THREE.DirectionalLight(0xc8d8f0, 0.5);
    fill.position.set(-3, 1, 2);
    scene.add(fill);

    // Rim — subtle back-light for edge separation
    const rim = new THREE.DirectionalLight(0x88aaff, 0.3);
    rim.position.set(0, 2, -3);
    scene.add(rim);

    // Camera looks straight at the model from the front.
    // VIEW_DIR points from the model toward the camera.
    const VIEW_DIR = new THREE.Vector3(0, 0.05, 1).normalize();
    const lookAt = new THREE.Vector3(0, 0, 0);

    // Reused across frame() calls so a resize does not churn allocations
    const _v = new THREE.Vector3();

    function frame() {
      const full = new THREE.Box3().setFromObject(group);
      const cutY = full.max.y - (full.max.y - full.min.y) * PORTRAIT;

      // Raising full.min.y would crop the height but keep the box's X extent,
      // which spans the outstretched arms — well below the cut. The camera
      // would then pull back to fit geometry it is not even showing. Measure
      // the vertices above the cut instead, so the width is the chest's.
      const box = new THREE.Box3();
      group.updateWorldMatrix(true, true);
      group.traverse((node) => {
        const pos = node.geometry && node.geometry.attributes && node.geometry.attributes.position;
        if (!pos) return;
        for (let i = 0; i < pos.count; i++) {
          _v.fromBufferAttribute(pos, i).applyMatrix4(node.matrixWorld);
          if (_v.y >= cutY) box.expandByPoint(_v);
        }
      });
      if (box.isEmpty()) box.copy(full);

      const center = box.getCenter(new THREE.Vector3());
      lookAt.copy(center);

      const fovV = (camera.fov * Math.PI) / 180;
      const tanV = Math.tan(fovV / 2);

      const forward = VIEW_DIR.clone().negate();
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
      const up = new THREE.Vector3().crossVectors(right, forward).normalize();

      // Height-only fit. Starting at 2 used to clamp every result, so the
      // camera never moved in and the whole body stayed in frame no matter
      // what TARGET_WIDTH was set to.
      let distance = 0;
      const corner = new THREE.Vector3();
      for (let i = 0; i < 8; i++) {
        corner.set(
          i & 1 ? box.max.x : box.min.x,
          i & 2 ? box.max.y : box.min.y,
          i & 4 ? box.max.z : box.min.z
        ).sub(center);
        const needed = Math.abs(corner.dot(up)) / tanV - corner.dot(forward);
        distance = Math.max(distance, needed);
      }
      distance *= 1.06;

      // Anchor the top of the hair near the top of the canvas rather than
      // centring the band, so the face sits high and the shoulders fill the
      // bottom — centring leaves a wide empty gap above the head.
      const visibleHalf = distance * tanV;
      lookAt.set(center.x, box.max.y - visibleHalf + visibleHalf * 2 * TOP_MARGIN, center.z);

      camera.position.copy(VIEW_DIR).multiplyScalar(distance).add(lookAt);
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
