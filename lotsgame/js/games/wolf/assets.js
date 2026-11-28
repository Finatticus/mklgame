// 載入模型與貼圖，並把骨架動畫「烘焙」成頂點動畫貼圖（VAT），
// 讓上百隻敵人可以用一次繪製（InstancedMesh）在手機上流暢地跑。
import * as THREE from '../../../vendor/three/three.module.js';
import { GLTFLoader } from '../../../vendor/three/GLTFLoader.js';
import { HDRLoader } from '../../../vendor/three/HDRLoader.js';
import { MeshoptSimplifier } from '../../../vendor/three/meshopt_simplifier.js';

const BASE = new URL('../../../assets/wolf/', import.meta.url).href;
const gltfLoader = new GLTFLoader();
const texLoader = new THREE.TextureLoader();
const cache = new Map();

export const url = (p) => BASE + p;
export function loadGLB(path) {
  if (!cache.has(path)) cache.set(path, gltfLoader.loadAsync(BASE + path));
  return cache.get(path);
}
export function loadTex(path, { srgb = false, repeat = true } = {}) {
  const key = 'tex:' + path + srgb;
  if (!cache.has(key)) cache.set(key, texLoader.loadAsync(BASE + path).then((t) => {
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  }));
  return cache.get(key);
}
export function loadEnv(renderer, name) {
  const key = 'env:' + name;
  if (!cache.has(key)) cache.set(key, new HDRLoader().loadAsync(BASE + 'env/' + name + '.hdr').then((t) => {
    t.mapping = THREE.EquirectangularReflectionMapping;
    const pm = new THREE.PMREMGenerator(renderer);
    const rt = pm.fromEquirectangular(t);
    pm.dispose(); t.dispose();
    return rt.texture;
  }));
  return cache.get(key);
}

export function findSkinned(root) {
  let sm = null;
  root.traverse((o) => { if (!sm && o.isSkinnedMesh) sm = o; });
  return sm;
}
export const clipByPrefix = (clips, p) => clips.find((c) => c.name.startsWith(p));

// 白狼：把原本灰褐色的毛皮去色、提亮，保留毛流的明暗
export function whitenTexture(tex) {
  const img = tex.image;
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height);
  const p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    const l = (p[i] * 0.3 + p[i + 1] * 0.55 + p[i + 2] * 0.15) / 255;
    // 提亮但保留陰影：曲線 0→0.18、0.5→0.82、1→1
    const v = Math.min(1, 0.18 + Math.pow(l, 0.62) * 0.95);
    p[i] = v * 238; p[i + 1] = v * 241; p[i + 2] = v * 248;
  }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.flipY = tex.flipY; t.anisotropy = 4;
  return t;
}

// ---------------- 頂點動畫烘焙 ----------------
// clips: [{ key:'run', name:'run_loop', fps:30 }]
// tris：減面後的目標三角形數
export async function bakeVAT(gltf, clips, tris) {
  await MeshoptSimplifier.ready;
  const root = gltf.scene;
  const sm = findSkinned(root);
  root.updateMatrixWorld(true);
  const geo = sm.geometry;
  const P = geo.attributes.position, N = geo.attributes.normal, UV = geo.attributes.uv;
  const SI = geo.attributes.skinIndex, SW = geo.attributes.skinWeight;
  let index = geo.index ? new Uint32Array(geo.index.array) : Uint32Array.from({ length: P.count }, (_, i) => i);
  if (index.length / 3 > tris) {
    const [res] = MeshoptSimplifier.simplify(index, new Float32Array(P.array), 3, tris * 3, 0.02, []);
    index = res;
  }
  // 只保留用到的頂點
  const map = new Int32Array(P.count).fill(-1);
  const keep = [];
  for (let i = 0; i < index.length; i++) { const v = index[i]; if (map[v] < 0) { map[v] = keep.length; keep.push(v); } }
  const nv = keep.length;
  const uv = new Float32Array(nv * 2);
  for (let i = 0; i < nv; i++) { uv[i * 2] = UV.getX(keep[i]); uv[i * 2 + 1] = UV.getY(keep[i]); }
  const idx = new Uint16Array(index.length);
  for (let i = 0; i < index.length; i++) idx[i] = map[index[i]];

  // 動畫：逐格算出蒙皮後的世界座標與法線
  const mixer = new THREE.AnimationMixer(root);
  const frames = [];
  const ranges = {};
  for (const c of clips) {
    const clip = gltf.animations.find((a) => a.name === c.name);
    const n = Math.max(2, Math.round(clip.duration * c.fps));
    ranges[c.key] = { start: frames.length, count: n, fps: n / clip.duration, loop: c.loop !== false, dur: clip.duration };
    mixer.stopAllAction();
    const act = mixer.clipAction(clip); act.reset().play();
    for (let f = 0; f < n; f++) {
      mixer.setTime((f / n) * clip.duration);
      root.updateMatrixWorld(true);
      frames.push(skinFrame(sm, keep, P, N, SI, SW));
    }
    act.stop();
  }
  mixer.stopAllAction();
  // 打包成半浮點貼圖：寬 = 頂點數，高 = 總格數
  const W = nv, H = frames.length;
  const pos = new Uint16Array(W * H * 4), nrm = new Uint16Array(W * H * 4);
  const toH = THREE.DataUtils.toHalfFloat;
  let ymin = Infinity, ymax = -Infinity, rmax = 0;
  for (let f = 0; f < H; f++) {
    const [fp, fn] = frames[f];
    for (let v = 0; v < W; v++) {
      const o = (f * W + v) * 4, s = v * 3;
      pos[o] = toH(fp[s]); pos[o + 1] = toH(fp[s + 1]); pos[o + 2] = toH(fp[s + 2]); pos[o + 3] = toH(1);
      nrm[o] = toH(fn[s]); nrm[o + 1] = toH(fn[s + 1]); nrm[o + 2] = toH(fn[s + 2]); nrm[o + 3] = toH(0);
      if (f === 0) { ymin = Math.min(ymin, fp[s + 1]); ymax = Math.max(ymax, fp[s + 1]); rmax = Math.max(rmax, Math.hypot(fp[s], fp[s + 2])); }
    }
  }
  const mk = (arr) => { const t = new THREE.DataTexture(arr, W, H, THREE.RGBAFormat, THREE.HalfFloatType); t.needsUpdate = true; return t; };
  const g = new THREE.BufferGeometry();
  // 位置只給包圍盒用；實際位置在著色器裡從貼圖讀出
  const p0 = frames[0][0];
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(p0), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(frames[0][1]), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return { geometry: g, posTex: mk(pos), nrmTex: mk(nrm), ranges, verts: W, frames: H, height: ymax - ymin, radius: rmax };
}

const _m = new THREE.Matrix4(), _acc = new THREE.Matrix4(), _v = new THREE.Vector3(), _n = new THREE.Vector3(), _nm = new THREE.Matrix3();
function skinFrame(sm, keep, P, N, SI, SW) {
  const sk = sm.skeleton;
  sk.update();
  const bm = sk.boneMatrices;
  const bind = sm.bindMatrix, bindInv = sm.bindMatrixInverse, world = sm.matrixWorld;
  const fp = new Float32Array(keep.length * 3), fn = new Float32Array(keep.length * 3);
  const e = _acc.elements;
  for (let k = 0; k < keep.length; k++) {
    const i = keep[k];
    e.fill(0);
    for (let j = 0; j < 4; j++) {
      const w = SW.getComponent(i, j);
      if (!w) continue;
      const b = SI.getComponent(i, j) * 16;
      for (let q = 0; q < 16; q++) e[q] += bm[b + q] * w;
    }
    // skinned = bindInv * (Σ w·bone) * bind ；世界 = world * skinned
    _m.multiplyMatrices(bindInv, _acc).multiply(bind).premultiply(world);
    _v.fromBufferAttribute(P, i).applyMatrix4(_m);
    _nm.getNormalMatrix(_m);
    _n.fromBufferAttribute(N, i).applyMatrix3(_nm).normalize();
    fp[k * 3] = _v.x; fp[k * 3 + 1] = _v.y; fp[k * 3 + 2] = _v.z;
    fn[k * 3] = _n.x; fn[k * 3 + 1] = _n.y; fn[k * 3 + 2] = _n.z;
  }
  return [fp, fn];
}

// 用 VAT 的實例化網格：每個實例有 aAnim(格A, 格B, 混合, 溶解) 與 aTint(rgb, 受擊閃白)
const VAT_HEAD = `
uniform sampler2D vatPos; uniform sampler2D vatNrm;
attribute vec4 aAnim; attribute vec4 aTint;
varying vec4 vTint; varying float vDissolve; varying vec2 vDUv;
`;
function vatVertex(shader, withNormal = true) {
  shader.vertexShader = VAT_HEAD + shader.vertexShader;
  if (withNormal) shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `
    vec3 objectNormal = normalize(mix(texelFetch(vatNrm, ivec2(gl_VertexID, int(aAnim.x)), 0).xyz, texelFetch(vatNrm, ivec2(gl_VertexID, int(aAnim.y)), 0).xyz, aAnim.z));
    #ifdef USE_TANGENT
      vec3 objectTangent = vec3( tangent.xyz );
    #endif`);
  shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
    vec3 transformed = mix(texelFetch(vatPos, ivec2(gl_VertexID, int(aAnim.x)), 0).xyz, texelFetch(vatPos, ivec2(gl_VertexID, int(aAnim.y)), 0).xyz, aAnim.z);
    vTint = aTint; vDissolve = aAnim.w; vDUv = uv;
    #ifdef USE_ALPHAHASH
      vPosition = vec3( position );
    #endif`);
}
const DISSOLVE = `
  float dn = fract(sin(dot(floor(vDUv * 320.0), vec2(12.9898, 78.233))) * 43758.5453);
  if (vDissolve > 0.0 && dn < vDissolve) discard;
`;

export function vatMaterial(vat, src, { ghost = false } = {}) {
  let mat;
  if (ghost) {
    mat = new THREE.MeshBasicMaterial({ color: 0x9fc4ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  } else {
    mat = new THREE.MeshStandardMaterial({ map: src.map, normalMap: src.normalMap, roughnessMap: src.roughnessMap, metalnessMap: src.metalnessMap, roughness: 1, metalness: 1, side: THREE.FrontSide });
  }
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.vatPos = { value: vat.posTex };
    shader.uniforms.vatNrm = { value: vat.nrmTex };
    vatVertex(shader);
    shader.fragmentShader = 'varying vec4 vTint; varying float vDissolve; varying vec2 vDUv;\n' + shader.fragmentShader;
    if (ghost) {
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        ${DISSOLVE}
        diffuseColor.a *= vTint.a;`);
    } else {
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        ${DISSOLVE}
        diffuseColor.rgb *= vTint.rgb;`);
      // 月光輪廓光：讓深色的狼與蜘蛛在夜裡仍看得出輪廓
      shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float vfr = pow(1.0 - clamp(abs(dot(normalize(vViewPosition), normal)), 0.0, 1.0), 2.4);
        totalEmissiveRadiance += vec3(0.32, 0.4, 0.62) * vfr * 0.55;`);
      shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0, 0.92, 0.85), vTint.a);
        if (vDissolve > 0.0) gl_FragColor.rgb += vec3(0.45, 0.58, 1.0) * smoothstep(vDissolve + 0.1, vDissolve, dn) * 0.9;`);
    }
  };
  mat.customProgramCacheKey = () => 'vat' + (ghost ? 'g' : 's');
  return mat;
}
export function vatDepthMaterial(vat) {
  const mat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.vatPos = { value: vat.posTex };
    shader.uniforms.vatNrm = { value: vat.nrmTex };
    vatVertex(shader, false);
    shader.fragmentShader = 'varying vec4 vTint; varying float vDissolve; varying vec2 vDUv;\n' + shader.fragmentShader.replace('void main() {', 'void main() {\n' + DISSOLVE);
  };
  mat.customProgramCacheKey = () => 'vatdepth';
  return mat;
}

// 一種敵人的群體：InstancedMesh + 每個實例的動畫狀態
export class Horde {
  constructor(vat, srcMat, max, { ghost = false, shadow = true } = {}) {
    this.vat = vat; this.max = max;
    const g = vat.geometry.clone();
    this.aAnim = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.aTint = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aAnim', this.aAnim); g.setAttribute('aTint', this.aTint);
    this.mesh = new THREE.InstancedMesh(g, vatMaterial(vat, srcMat, { ghost }), max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    if (!ghost && shadow) { this.mesh.castShadow = true; this.mesh.customDepthMaterial = vatDepthMaterial(vat); }
    this.mesh.receiveShadow = !ghost;
    this.n = 0;
  }
  begin() { this.n = 0; }
  // t：動畫時間（秒）；anim：clip key
  push(m, anim, t, tint, flash = 0, dissolve = 0) {
    if (this.n >= this.max) return;
    const i = this.n++;
    this.mesh.setMatrixAt(i, m);
    const r = this.vat.ranges[anim];
    let f = t * r.fps;
    if (r.loop) f = ((f % r.count) + r.count) % r.count; else f = Math.min(f, r.count - 1.001);
    const a = Math.floor(f), b = r.loop ? (a + 1) % r.count : Math.min(a + 1, r.count - 1);
    this.aAnim.setXYZW(i, r.start + a, r.start + b, f - a, dissolve);
    this.aTint.setXYZW(i, tint[0], tint[1], tint[2], flash);
  }
  end() {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.aAnim.needsUpdate = true; this.aTint.needsUpdate = true;
  }
}

// 取出模型的第一個材質（貼圖）
export function firstMaterial(root) {
  let m = null;
  root.traverse((o) => { if (!m && o.isMesh) m = o.material; });
  return m;
}
