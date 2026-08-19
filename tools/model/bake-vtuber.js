#!/usr/bin/env node
/**
 * Bakes a character .glb into a plain JavaScript file, keeping only the
 * top half (head to torso) and discarding the legs/feet.
 *
 *     node tools/model/bake-vtuber.js path/to/character.glb
 *
 * Produces src/models/vtuber-model.js with window.vtuberModel.
 * The deck opens from file:// where fetch and ES modules fail, so the
 * geometry arrives as base64 typed arrays — same strategy as bake.js.
 *
 * Y_MIN_THRESHOLD below controls where the torso is cut. Vertices with
 * Y below that value are discarded. Adjust for different characters.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

/* ── Cut the model at this Y value — below is discarded ───────────── */
const Y_MIN_THRESHOLD = 0.45;   // roughly waist level for this model

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

const MAX_TEX_SIZE = 512;

const imageCaches = new WeakMap();
async function imageDataUri(gltf, bin, index) {
  let cache = imageCaches.get(gltf);
  if (!cache) { cache = new Map(); imageCaches.set(gltf, cache); }
  if (cache.has(index)) return cache.get(index);
  const img = gltf.json.images[index];
  if (img.bufferView === undefined) throw new Error('external image URIs not supported');
  const view = gltf.json.bufferViews[img.bufferView];
  const start = view.byteOffset || 0;
  const bytes = Buffer.from(bin.subarray(start, start + view.byteLength));

  let resized = bytes;
  try {
    const meta = await sharp(bytes).metadata();
    if (meta.width > MAX_TEX_SIZE || meta.height > MAX_TEX_SIZE) {
      resized = await sharp(bytes).resize({ width: MAX_TEX_SIZE, height: MAX_TEX_SIZE, fit: 'inside', withoutEnlargement: true }).toBuffer();
    }
  } catch (_) {
    // keep original if sharp can't process it
  }

  const mime = img.mimeType || 'image/png';
  const uri = `data:${mime};base64,${resized.toString('base64')}`;
  cache.set(index, uri);
  return uri;
}

async function textureUri(gltf, bin, textureInfo) {
  if (!textureInfo) return null;
  const texture = gltf.json.textures[textureInfo.index];
  const source = texture.source !== undefined ? texture.source : texture.extensions?.KHR_texture_basisu?.source;
  if (source === undefined) return null;
  return imageDataUri(gltf, bin, source);
}

async function material(gltf, bin, index) {
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
    map: await textureUri(gltf, bin, pbr.baseColorTexture),
    roughnessMap: await textureUri(gltf, bin, pbr.metallicRoughnessTexture),
  };
}

function b64(typed) {
  return Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength).toString('base64');
}

// Filter indexed geometry: only keep triangles where all three vertices
// have Y >= Y_MIN_THRESHOLD. Returns null if no vertices survive.
function filterTopHalf(position, normal, uv, index, indexBits) {
  const posArr = new Float32Array(position);
  const vertCount = posArr.length / 3;

  // Mark which vertices survive the Y cut
  const alive = new Uint8Array(vertCount);
  let aliveCount = 0;
  for (let v = 0; v < vertCount; v++) {
    if (posArr[v * 3 + 1] >= Y_MIN_THRESHOLD) {
      alive[v] = 1;
      aliveCount++;
    }
  }
  if (aliveCount === 0) return null;

  // Build index buffer — only triangles where all 3 vertices survive
  let triCount = 0;
  if (index) {
    const IdxType = indexBits === 32 ? Uint32Array : Uint16Array;
    const idx = new IdxType(index);
    const kept = [];
    for (let i = 0; i < idx.length; i += 3) {
      if (alive[idx[i]] && alive[idx[i + 1]] && alive[idx[i + 2]]) {
        kept.push(idx[i], idx[i + 1], idx[i + 2]);
        triCount++;
      }
    }
    if (triCount === 0) return null;
    index = new Uint16Array(kept);
  }

  // Remap vertex indices so there are no gaps
  const remap = new Int32Array(vertCount).fill(-1);
  let newIdx = 0;
  for (let v = 0; v < vertCount; v++) {
    if (alive[v]) remap[v] = newIdx++;
  }

  const newPosition = new Float32Array(aliveCount * 3);
  const newNormal = normal ? new Float32Array(aliveCount * 3) : null;
  const newUv = uv ? new Float32Array(aliveCount * 2) : null;
  let write = 0;
  for (let v = 0; v < vertCount; v++) {
    if (!alive[v]) continue;
    newPosition[write * 3] = posArr[v * 3];
    newPosition[write * 3 + 1] = posArr[v * 3 + 1];
    newPosition[write * 3 + 2] = posArr[v * 3 + 2];
    if (newNormal) {
      newNormal[write * 3] = normal[v * 3];
      newNormal[write * 3 + 1] = normal[v * 3 + 1];
      newNormal[write * 3 + 2] = normal[v * 3 + 2];
    }
    if (newUv) {
      newUv[write * 2] = uv[v * 2];
      newUv[write * 2 + 1] = uv[v * 2 + 1];
    }
    write++;
  }

  // Remap indices
  if (index) {
    for (let i = 0; i < index.length; i++) {
      index[i] = remap[index[i]];
    }
  }

  return { position: newPosition, normal: newNormal, uv: newUv, index, indexBits: 16 };
}

async function bake(file) {
  const gltf = readGlb(file);
  const { json, bin } = gltf;
  const parts = {};
  const bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  let included = 0;
  let skipped = 0;
  let verticesKept = 0;
  let verticesDropped = 0;

  const walk = async (nodeIndex, parentMatrix) => {
    const node = json.nodes[nodeIndex];
    const world = multiply(parentMatrix, nodeMatrix(node));

    if (node.mesh !== undefined) {
      const mesh = json.meshes[node.mesh];
      const meshName = mesh.name || node.name || 'part' + nodeIndex;

      const name = meshName
        .replace(/player_019_mint_skin_LOD1_MI_/, '')
        .replace(/player_019_mint_/, '')
        .replace(/common_/, '')
        .replace(/_0$/, '')
        .replace(/_/g, '-');

      const prims = [];
      for (const prim of mesh.primitives) {
        // Read raw local-space data first
        let rawPosition = accessor(gltf, bin, prim.attributes.POSITION);
        let rawNormal = prim.attributes.NORMAL !== undefined
          ? accessor(gltf, bin, prim.attributes.NORMAL)
          : null;
        let rawUv = prim.attributes.TEXCOORD_0 !== undefined
          ? accessor(gltf, bin, prim.attributes.TEXCOORD_0)
          : null;
        let rawIndex = prim.indices !== undefined ? accessor(gltf, bin, prim.indices) : null;
        const indexBits = prim.indices !== undefined ? json.accessors[prim.indices].componentType === 5125 ? 32 : 16 : 0;

        // Filter in local space (Y is up for this model) before applying
        // the world transform — the world matrix may swap axes.
        const beforeCount = rawPosition.length / 3;
        const filtered = filterTopHalf(rawPosition, rawNormal, rawUv, rawIndex, indexBits);
        if (!filtered) {
          verticesDropped += beforeCount;
          continue;
        }

        rawPosition = filtered.position;
        rawNormal = filtered.normal;
        rawUv = filtered.uv;
        rawIndex = filtered.index;

        const afterCount = rawPosition.length / 3;
        verticesKept += afterCount;
        verticesDropped += (beforeCount - afterCount);

        // Now apply the world transform
        let position = applyMatrix(rawPosition, world, false);
        let normal = rawNormal ? applyMatrix(rawNormal, world, true) : null;
        let uv = rawUv;
        let index = rawIndex;

        for (let p = 0; p < position.length; p += 3) {
          for (let axis = 0; axis < 3; axis++) {
            bounds.min[axis] = Math.min(bounds.min[axis], position[p + axis]);
            bounds.max[axis] = Math.max(bounds.max[axis], position[p + axis]);
          }
        }

        prims.push({
          position: b64(position),
          normal: normal ? b64(normal) : null,
          uv: uv ? b64(uv) : null,
          index: index ? b64(index) : null,
          indexBits: filtered.indexBits,
          vertices: afterCount,
          material: await material(gltf, bin, prim.material),
        });
      }

      if (prims.length > 0) {
        included++;
        parts[name] = prims;
      } else {
        skipped++;
      }
    }
    await Promise.all((node.children || []).map((child) => walk(child, world)));
  };

  const scene = json.scenes[json.scene || 0];
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  await Promise.all(scene.nodes.map((n) => walk(n, identity)));

  return { parts, bounds, source: path.basename(file), _included: included, _skipped: skipped, _kept: verticesKept, _dropped: verticesDropped };
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error('usage: node tools/model/bake-vtuber.js <character.glb>');
    process.exit(2);
  }
  const model = await bake(input);
  const names = Object.keys(model.parts);
  const out = path.join(__dirname, '..', '..', 'src', 'models', 'vtuber-model.js');

  fs.writeFileSync(out,
    '// Generated by tools/model/bake-vtuber.js — do not edit.\n' +
    `// Source: ${model.source}\n` +
    `// Top half only — vertices below Y=${Y_MIN_THRESHOLD} discarded.\n` +
    'window.vtuberModel = ' + JSON.stringify(model, null, 1) + ';\n');

  const size = (fs.statSync(out).size / 1024).toFixed(0);
  const textured = names.filter((n) => model.parts[n].some((p) => p.material.map || p.material.roughnessMap));
  console.log(`baked ${names.length} parts (${model._included} kept, ${model._skipped} empty) → src/models/vtuber-model.js (${size} KB)`);
  console.log('parts:', names.join(', '));
  console.log('textured:', textured.length ? textured.join(', ') : 'none');
  console.log(`vertices: ${model._kept} kept, ${model._dropped} dropped (Y < ${Y_MIN_THRESHOLD})`);
  const span = model.bounds.max.map((v, i) => (v - model.bounds.min[i]).toFixed(3));
  console.log('bounds (x y z):', span.join(' × '));
}

if (require.main === module) main();
module.exports = { bake, Y_MIN_THRESHOLD };
