// Turns the baked model (src/models/arduino-model.js) into three.js meshes.
//
// The deck runs from the filesystem, where fetching a .glb and importing
// GLTFLoader both fail, so the geometry arrives as base64 typed arrays in a
// plain script and is decoded here. See docs/3D_MODEL_PIPELINE.md.
(function () {
  'use strict';

  function typedFrom(base64, Type) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Type(bytes.buffer);
  }

  function geometryFor(part) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(typedFrom(part.position, Float32Array), 3));

    if (part.normal) {
      geometry.setAttribute('normal', new THREE.BufferAttribute(typedFrom(part.normal, Float32Array), 3));
    }
    if (part.index) {
      const Type = part.indexBits === 32 ? Uint32Array : Uint16Array;
      geometry.setIndex(new THREE.BufferAttribute(typedFrom(part.index, Type), 1));
    }
    if (!part.normal) geometry.computeVertexNormals();

    return geometry;
  }

  function materialFor(spec) {
    return new THREE.MeshStandardMaterial({
      color: spec.color,
      roughness: spec.roughness,
      metalness: spec.metalness,
      emissive: spec.emissive || 0x000000,
      emissiveIntensity: spec.emissive ? 1 : 0,
    });
  }

  // Models arrive at whatever scale and origin the author used. Normalising to
  // the real board width keeps the camera, lighting and explode distances the
  // same whichever model is dropped in.
  function build(model, targetWidth) {
    const span = model.bounds.max.map((v, i) => v - model.bounds.min[i]);
    const scale = targetWidth / Math.max(span[0], span[2]);
    const centre = model.bounds.min.map((v, i) => (v + model.bounds.max[i]) / 2);

    const parts = {};
    Object.keys(model.parts).forEach((name) => {
      const spec = model.parts[name];
      const mesh = new THREE.Mesh(geometryFor(spec), materialFor(spec.material));
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // re-centre on the board and drop it onto y = 0, then wrap it so the
      // animation can move the group without touching the geometry
      mesh.position.set(-centre[0], -model.bounds.min[1], -centre[2]);
      const group = new THREE.Group();
      group.add(mesh);
      group.scale.setScalar(scale);
      parts[name] = group;
    });

    return parts;
  }

  window.modelLoader = { build, available: () => !!window.arduinoModel };
})();
