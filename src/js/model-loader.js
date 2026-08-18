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
    if (part.uv) {
      geometry.setAttribute('uv', new THREE.BufferAttribute(typedFrom(part.uv, Float32Array), 2));
    }
    if (part.index) {
      const Type = part.indexBits === 32 ? Uint32Array : Uint16Array;
      geometry.setIndex(new THREE.BufferAttribute(typedFrom(part.index, Type), 1));
    }
    if (!part.normal) geometry.computeVertexNormals();

    return geometry;
  }

  // Baked textures are data: URIs, decoded in place by the browser's own
  // image decoder — nothing is fetched, so this is safe under file://.
  // TextureLoader defaults flipY to true for ordinary images; glTF UVs (what
  // bake.js copied straight out of the .glb) assume the opposite, so every
  // baked texture needs it turned off or the artwork mirrors vertically.
  const textureLoader = new THREE.TextureLoader();
  function textureFrom(dataUri, colorSpace) {
    const texture = textureLoader.load(dataUri);
    texture.flipY = false;
    if (colorSpace) texture.encoding = colorSpace;
    return texture;
  }

  function materialFor(spec) {
    return new THREE.MeshStandardMaterial({
      color: spec.color,
      roughness: spec.roughness,
      metalness: spec.metalness,
      emissive: spec.emissive || 0x000000,
      emissiveIntensity: spec.emissive ? 1 : 0,
      // present only for parts the Blender prep step textured (the PCB's
      // top/bottom faces) — everything else keeps the flat colour above
      map: spec.map ? textureFrom(spec.map, THREE.sRGBEncoding) : null,
      roughnessMap: spec.roughnessMap ? textureFrom(spec.roughnessMap) : null,
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
      // A part can bake to more than one primitive (the PCB has top/bottom/
      // side materials; a part joined from several source objects in
      // Blender carries whatever materials those objects had) — see the
      // comment in bake.js's walk(). Every primitive belonging to a part
      // shares the same re-centring offset, so the part still moves as one
      // rigid body during the explode.
      const group = new THREE.Group();
      model.parts[name].forEach((prim) => {
        const mesh = new THREE.Mesh(geometryFor(prim), materialFor(prim.material));
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // re-centre on the board and drop it onto y = 0, so the animation
        // can move the group without touching the geometry
        mesh.position.set(-centre[0], -model.bounds.min[1], -centre[2]);
        group.add(mesh);
      });
      group.scale.setScalar(scale);
      parts[name] = group;
    });

    return parts;
  }

  window.modelLoader = { build, available: () => !!window.arduinoModel };
})();
