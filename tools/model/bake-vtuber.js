#!/usr/bin/env node
/**
 * Bakes a character .glb into a plain JavaScript file, keeping only
 * face/head/hair meshes and discarding the body.
 *
 *     node tools/model/bake-vtuber.js path/to/character.glb
 *
 * Produces src/models/vtuber-model.js with window.vtuberModel.
 * The deck opens from file:// where fetch and ES modules fail, so the
 * geometry arrives as base64 typed arrays — same strategy as bake.js.
 *
 * Mesh inclusion is driven by MESH_INCLUDE patterns below. Edit the
 * regex list when a new character uses different naming conventions.
 */
const fs = require('fs');
const path = require('path');

/* ── Mesh name patterns to KEEP (everything else is discarded) ─────── */
const MESH_INCLUDE = [
  /face/i,
  /eyes?/i,
  /jiemao/i,       // eyelashes
  /gaoguang/i,     // highlights / specular
  /mask/i,         // face mask
  /hair/i,
];

/* ── glTF helpers (shared with bake.js) ───────────────────────────── */

const COMPONENT_TYPES = {
  5120: Int8Array, 5121: Uint8Array, 5122: Int16Array,
  5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array,
};
const TYPE_COUNTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

function readGlb(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a .glb file');

  let offset = 12;
  let json = null;
  let bin = null;
  while (offset < buf.length) {
    const length = buf.readUInt32LE(offset);
    const type = buf.readUInt32LE(offset + 4);
    const chunk = buf.subarray(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8'));
    if (type === 0x004e4942) bin = chunk;
    offset += 8 + length + ((4 - (length % 4)) % 4);
  }
  if (!json) throw new Error('no JSON chunk');
  return { json, bin };
}

function accessor(gltf, bin, index) {
  const acc = gltf.json.accessors[index];
  if (acc.sparse) throw new Error('sparse accessors not supported');
  const view = gltf.json.bufferViews[acc.bufferView];
  const Type = COMPONENT_TYPES[acc.componentType];
  const items = TYPE_COUNTS[acc.type];
  const start = (view.byteOffset || 0) + (acc.byteOffset || 0);
  const stride = view.byteStride;

  if (!stride || stride === items * Type.BYTES_PER_ELEMENT) {
    const slice = bin.subarray(start, start + acc.count * items * Type.BYTES_PER_ELEMENT);
    return new Type(new Uint8Array(slice).buffer, 0, acc.count * items);
  }
  const out = new Type(acc.count * items);
  for (let i = 0; i < acc.count; i++) {
    const src = new Type(new Uint8Array(bin.subarray(start + i * stride, start + i * stride + items * Type.BYTES_PER_ELEMENT)).buffer);
    out.set(src, i * items);
  }
  return out;
}

function nodeMatrix(node) {
  if (node.matrix) return node.matrix.slice();
  const [tx, ty, tz] = node.translation || [0, 0, 0];
  const [qx, qy, qz, qw] = node.rotation || [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale || [1, 1, 1];
  const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz;
  const xx = qx * x2, xy = qx * y2, xz = qx * z2;
  const yy = qy * y2, yz = qy * z2, zz = qz * z2;
  const wx = qw * x2, wy = qw * y2, wz = qw * z2;
  return [
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    tx, ty, tz, 1,
  ];
}

function multiply(a, b) {
  const out = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      for (let k = 0; k < 4; k++) out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
    }
  }
  return out;
}

function applyMatrix(positions, m, isDirection) {
  const out = new Float32Array(positions.length);
  for (let i = 0; i < positions.length; i += 3) {
    const [x, y, z] = [positions[i], positions[i + 1], positions[i + 2]];
    const w = isDirection ? 0 : 1;
    out[i] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
    out[i + 1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
    out[i + 2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
  }
  return out;
}

const imageCaches = new WeakMap();
function imageDataUri(gltf, bin, index) {
  let cache = imageCaches.get(gltf);
  if (!cache) { cache = new Map(); imageCaches.set(gltf, cache); }
  if (cache.has(index)) return cache.get(index);
  const img = gltf.json.images[index];
  if (img.bufferView === undefined) throw new Error('external image URIs not supported');
  const view = gltf.json.bufferViews[img.bufferView];
  const start = view.byteOffset || 0;
  const bytes = bin.subarray(start, start + view.byteLength);
  const uri = `data:${img.mimeType};base64,${Buffer.from(bytes).toString('base64')}`;
  cache.set(index, uri);
  return uri;
}

function textureUri(gltf, bin, textureInfo) {
  if (!textureInfo) return null;
  const texture = gltf.json.textures[textureInfo.index];
  const source = texture.source !== undefined ? texture.source : texture.extensions?.KHR_texture_basisu?.source;
  if (source === undefined) return null;
  return imageDataUri(gltf, bin, source);
}

function material(gltf, bin, index) {
  const mat = (gltf.json.materials || [])[index];
  if (!mat) return { color: 0xcccccc, roughness: 0.8, metalness: 0 };
  const pbr = mat.pbrMetallicRoughness || {};
  const [r, g, b] = pbr.baseColorFactor || [0.8, 0.8, 0.8, 1];
  const toHex = (v) => Math.round(Math.min(1, Math.max(0, v)) * 255);
  const emissive = mat.emissiveFactor || [0, 0, 0];
  return {
    name: mat.name || 'material' + index,
    color: (toHex(r) << 16) | (toHex(g) << 8) | toHex(b),
    roughness: pbr.roughnessFactor !== undefined ? pbr.roughnessFactor : 1,
    metalness: pbr.metallicFactor !== undefined ? pbr.metallicFactor : 0,
    emissive: (toHex(emissive[0]) << 16) | (toHex(emissive[1]) << 8) | toHex(emissive[2]),
    map: textureUri(gltf, bin, pbr.baseColorTexture),
    roughnessMap: textureUri(gltf, bin, pbr.metallicRoughnessTexture),
  };
}

function b64(typed) {
  return Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength).toString('base64');
}

function shouldInclude(meshName) {
  return MESH_INCLUDE.some((pat) => pat.test(meshName));
}

function bake(file) {
  const gltf = readGlb(file);
  const { json, bin } = gltf;
  const parts = {};
  const bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  let included = 0;
  let skipped = 0;

  const walk = (nodeIndex, parentMatrix) => {
    const node = json.nodes[nodeIndex];
    const world = multiply(parentMatrix, nodeMatrix(node));

    if (node.mesh !== undefined) {
      const mesh = json.meshes[node.mesh];
      const meshName = mesh.name || node.name || 'part' + nodeIndex;

      if (!shouldInclude(meshName)) {
        skipped++;
        (node.children || []).forEach((child) => walk(child, world));
        return;
      }

      included++;
      const name = meshName
        .replace(/player_019_mint_skin_LOD1_MI_/, '')
        .replace(/player_019_mint_/, '')
        .replace(/common_/, '')
        .replace(/_0$/, '')
        .replace(/_/g, '-');

      parts[name] = mesh.primitives.map((prim) => {
        const position = applyMatrix(accessor(gltf, bin, prim.attributes.POSITION), world, false);
        const normal = prim.attributes.NORMAL !== undefined
          ? applyMatrix(accessor(gltf, bin, prim.attributes.NORMAL), world, true)
          : null;
        const uv = prim.attributes.TEXCOORD_0 !== undefined
          ? accessor(gltf, bin, prim.attributes.TEXCOORD_0)
          : null;
        const index = prim.indices !== undefined ? accessor(gltf, bin, prim.indices) : null;

        for (let p = 0; p < position.length; p += 3) {
          for (let axis = 0; axis < 3; axis++) {
            bounds.min[axis] = Math.min(bounds.min[axis], position[p + axis]);
            bounds.max[axis] = Math.max(bounds.max[axis], position[p + axis]);
          }
        }

        return {
          position: b64(position),
          normal: normal ? b64(normal) : null,
          uv: uv ? b64(uv) : null,
          index: index ? b64(index) : null,
          indexBits: index ? index.BYTES_PER_ELEMENT * 8 : 0,
          vertices: position.length / 3,
          material: material(gltf, bin, prim.material),
        };
      });
    }
    (node.children || []).forEach((child) => walk(child, world));
  };

  const scene = json.scenes[json.scene || 0];
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  scene.nodes.forEach((n) => walk(n, identity));

  return { parts, bounds, source: path.basename(file), _included: included, _skipped: skipped };
}

function main() {
  const input = process.argv[2];
  if (!input) {
    console.error('usage: node tools/model/bake-vtuber.js <character.glb>');
    process.exit(2);
  }
  const model = bake(input);
  const names = Object.keys(model.parts);
  const out = path.join(__dirname, '..', '..', 'src', 'models', 'vtuber-model.js');

  fs.writeFileSync(out,
    '// Generated by tools/model/bake-vtuber.js — do not edit.\n' +
    `// Source: ${model.source}\n` +
    '// Face/head/hair only — body meshes excluded.\n' +
    'window.vtuberModel = ' + JSON.stringify(model, null, 1) + ';\n');

  const size = (fs.statSync(out).size / 1024).toFixed(0);
  const textured = names.filter((n) => model.parts[n].some((p) => p.material.map || p.material.roughnessMap));
  console.log(`baked ${names.length} parts (${model._included} kept, ${model._skipped} skipped) → src/models/vtuber-model.js (${size} KB)`);
  console.log('parts:', names.join(', '));
  console.log('textured:', textured.length ? textured.join(', ') : 'none');
  const span = model.bounds.max.map((v, i) => (v - model.bounds.min[i]).toFixed(3));
  console.log('bounds (x y z):', span.join(' × '));
}

if (require.main === module) main();
module.exports = { bake, shouldInclude };
