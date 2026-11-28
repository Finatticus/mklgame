// 3D 世界：渲染器、月光、混合材質地面、隨玩家串流的地形物件、粒子與特效。
import * as THREE from '../../../vendor/three/three.module.js';
import { loadGLB, loadTex, loadEnv } from './assets.js';
import { MAPS } from './data.js';
import { MeshoptSimplifier } from '../../../vendor/three/meshopt_simplifier.js';

const CHUNK = 16;

// ---------------- 亂數 ----------------
function hash2(x, z, s) {
  let h = (x * 374761393 + z * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// 只重排索引的減面：頂點（含 uv、法線）原封不動
function simplifyIndex(geo, tris) {
  const idx = new Uint32Array(geo.index.array);
  const [res] = MeshoptSimplifier.simplify(idx, new Float32Array(geo.attributes.position.array), geo.attributes.position.itemSize, tris * 3, 0.08, []);
  const g = geo.clone();
  g.setIndex(new THREE.BufferAttribute(geo.attributes.position.count < 65536 ? new Uint16Array(res) : res, 1));
  return g;
}

// ---------------- 地面材質 ----------------
const NOISE = `
float wh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float wn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(wh(i), wh(i + vec2(1, 0)), u.x), mix(wh(i + vec2(0, 1)), wh(i + vec2(1, 1)), u.x), u.y); }
float wf(vec2 p){ return wn(p) * 0.55 + wn(p * 2.03 + 7.1) * 0.28 + wn(p * 4.1 + 3.3) * 0.17; }
`;
function groundMaterial(t, tile) {
  const mat = new THREE.MeshStandardMaterial({ map: t.dA, roughness: 1, metalness: 0 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, {
      mapB: { value: t.dB }, norA: { value: t.nA }, norB: { value: t.nB }, armA: { value: t.aA }, armB: { value: t.aB },
      tileA: { value: tile[0] }, tileB: { value: tile[1] },
    });
    sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = `varying vec3 vWP; uniform sampler2D mapB, norA, norB, armA, armB; uniform float tileA, tileB;\n${NOISE}\n` + sh.fragmentShader
      .replace('#include <map_fragment>', `
        // 去重複：同一張貼圖再以旋轉、縮放後的座標取樣一次，用雜訊遮罩混合
        const mat2 RT = mat2(0.799, 0.602, -0.602, 0.799);
        vec2 uvA = vWP.xz / tileA, uvB = vWP.xz / tileB;
        vec2 uvA2 = RT * vWP.xz / (tileA * 1.37) + 0.37, uvB2 = RT * vWP.xz / (tileB * 1.29) + 0.61;
        float hm = smoothstep(0.32, 0.68, wf(vWP.xz * 0.23 + 5.0));
        float gm = smoothstep(0.48, 0.62, wf(vWP.xz * 0.045) + (wn(vWP.xz * 0.7) - 0.5) * 0.12);
        vec4 cA = mix(texture2D(map, uvA), texture2D(map, uvA2), hm), cB = mix(texture2D(mapB, uvB), texture2D(mapB, uvB2), hm);
        // 低頻明暗變化
        float var = 0.84 + 0.3 * wf(vWP.xz * 0.11 + 13.0);
        vec4 ga = mix(texture2D(armA, uvA), texture2D(armA, uvA2), hm), gb = mix(texture2D(armB, uvB), texture2D(armB, uvB2), hm);
        vec4 gArm = mix(ga, gb, gm);
        diffuseColor *= vec4(mix(cA.rgb, cB.rgb, gm) * var * mix(1.0, gArm.r, 0.7), 1.0);`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = clamp(gArm.g * 1.05, 0.35, 1.0);')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = 0.0;')
      .replace('#include <normal_fragment_maps>', `
        vec3 na1 = texture2D(norA, uvA).xyz * 2.0 - 1.0, na2 = texture2D(norA, uvA2).xyz * 2.0 - 1.0;
        vec3 nb1 = texture2D(norB, uvB).xyz * 2.0 - 1.0, nb2 = texture2D(norB, uvB2).xyz * 2.0 - 1.0;
        // 旋轉取樣的法線要轉回世界方向
        na2.xy = vec2(RT[0][0] * na2.x + RT[0][1] * na2.y, RT[1][0] * na2.x + RT[1][1] * na2.y);
        nb2.xy = vec2(RT[0][0] * nb2.x + RT[0][1] * nb2.y, RT[1][0] * nb2.x + RT[1][1] * nb2.y);
        vec3 tn = normalize(mix(mix(na1, na2, hm), mix(nb1, nb2, hm), gm) * vec3(1.15, 1.15, 1.0));
        normal = normalize((viewMatrix * vec4(tn.x, tn.z, tn.y, 0.0)).xyz);`);
  };
  return mat;
}

// ---------------- 粒子 ----------------
function softDot() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.75)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export class Particles {
  constructor(max, tex) {
    this.max = max; this.n = 0;
    this.p = new Float32Array(max * 3); this.v = new Float32Array(max * 3); this.c = new Float32Array(max * 3);
    this.life = new Float32Array(max); this.age = new Float32Array(max); this.s0 = new Float32Array(max); this.s1 = new Float32Array(max);
    this.drag = new Float32Array(max); this.grav = new Float32Array(max);
    this.size = new Float32Array(max); this.alpha = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    this.aP = new THREE.BufferAttribute(this.p, 3).setUsage(THREE.DynamicDrawUsage);
    this.aC = new THREE.BufferAttribute(this.c, 3).setUsage(THREE.DynamicDrawUsage);
    this.aS = new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage);
    this.aA = new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.aP); g.setAttribute('color', this.aC); g.setAttribute('size', this.aS); g.setAttribute('alpha', this.aA);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { tex: { value: tex }, scale: { value: 800 } },
      vertexShader: `attribute float size; attribute float alpha; attribute vec3 color; varying vec3 vC; varying float vA; uniform float scale;
        void main(){ vC = color; vA = alpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * scale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D tex; varying vec3 vC; varying float vA; void main(){ vec4 t = texture2D(tex, gl_PointCoord); gl_FragColor = vec4(vC * t.rgb * vA, t.a * vA); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
  }
  // o: {x,y,z,vx,vy,vz,life,size,size1,color:[r,g,b],drag,grav}
  emit(x, y, z, vx, vy, vz, life, size, size1, r, g, b, drag = 0, grav = 0) {
    if (this.n >= this.max) return;
    const i = this.n++, k = i * 3;
    this.p[k] = x; this.p[k + 1] = y; this.p[k + 2] = z;
    this.v[k] = vx; this.v[k + 1] = vy; this.v[k + 2] = vz;
    this.c[k] = r; this.c[k + 1] = g; this.c[k + 2] = b;
    this.life[i] = life; this.age[i] = 0; this.s0[i] = size; this.s1[i] = size1; this.drag[i] = drag; this.grav[i] = grav;
  }
  update(dt) {
    let n = this.n;
    for (let i = 0; i < n; i++) {
      this.age[i] += dt;
      if (this.age[i] >= this.life[i]) { // 用最後一個填補
        n--;
        if (i !== n) this.copy(n, i);
        i--; continue;
      }
      const k = i * 3, d = Math.max(0, 1 - this.drag[i] * dt);
      this.v[k] *= d; this.v[k + 1] = this.v[k + 1] * d - this.grav[i] * dt; this.v[k + 2] *= d;
      this.p[k] += this.v[k] * dt; this.p[k + 1] += this.v[k + 1] * dt; this.p[k + 2] += this.v[k + 2] * dt;
      const t = this.age[i] / this.life[i];
      this.size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * t;
      this.alpha[i] = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
    }
    this.n = n;
    const g = this.points.geometry;
    g.setDrawRange(0, n);
    this.aP.needsUpdate = this.aC.needsUpdate = this.aS.needsUpdate = this.aA.needsUpdate = true;
  }
  copy(from, to) {
    const a = from * 3, b = to * 3;
    for (let q = 0; q < 3; q++) { this.p[b + q] = this.p[a + q]; this.v[b + q] = this.v[a + q]; this.c[b + q] = this.c[a + q]; }
    this.life[to] = this.life[from]; this.age[to] = this.age[from]; this.s0[to] = this.s0[from]; this.s1[to] = this.s1[from];
    this.drag[to] = this.drag[from]; this.grav[to] = this.grav[from]; this.size[to] = this.size[from]; this.alpha[to] = this.alpha[from];
  }
}

// ---------------- 地面特效用的貼圖 ----------------
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// 月牙爪擊：三道平行的爪痕，沿弧線由尾端漸亮到前緣
const slashTex = () => canvasTex(256, 64, (g, w, h) => {
  const img = g.createImageData(w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = x / (w - 1), v = y / (h - 1);
    const taper = Math.sin(Math.PI * Math.min(1, u * 1.08)) ** 0.8;
    let a = 0;
    for (const c of [0.22, 0.5, 0.78]) { const dv = Math.abs(v - c) / (0.055 * (0.35 + taper)); a = Math.max(a, Math.exp(-dv * dv)); }
    a *= taper * (0.25 + 0.75 * u ** 1.6);
    const i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = Math.round(a * 255);
  }
  g.putImageData(img, 0, 0);
});
const ringTex = () => canvasTex(256, 256, (g, w) => {
  const gr = g.createRadialGradient(w / 2, w / 2, w * 0.3, w / 2, w / 2, w / 2);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.8, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.93, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, w);
});
// 焦痕：不規則的暗色斑
const scorchTex = () => canvasTex(128, 128, (g, w) => {
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * 6.28, r = Math.random() * 22;
    const x = 64 + Math.cos(a) * r, y = 64 + Math.sin(a) * r, s = 18 + Math.random() * 26;
    const gr = g.createRadialGradient(x, y, 0, x, y, s);
    gr.addColorStop(0, 'rgba(10,8,8,0.55)'); gr.addColorStop(1, 'rgba(10,8,8,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  }
});
// 蛛網：放射絲與螺旋
const webTex = () => canvasTex(256, 256, (g, w) => {
  g.strokeStyle = 'rgba(235,235,245,0.75)'; g.lineWidth = 1.4;
  const c = w / 2;
  for (let i = 0; i < 14; i++) { const a = (i / 14) * 6.283 + Math.random() * 0.1; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(a) * c * 0.98, c + Math.sin(a) * c * 0.98); g.stroke(); }
  g.lineWidth = 1;
  for (let r = 10; r < c * 0.95; r += 9 + r * 0.06) {
    g.beginPath();
    for (let i = 0; i <= 14; i++) { const a = (i / 14) * 6.283; const rr = r * (0.93 + Math.random() * 0.1); const x = c + Math.cos(a) * rr, y = c + Math.sin(a) * rr; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  }
});
const clawTex = () => canvasTex(128, 128, (g, w) => {
  g.strokeStyle = 'rgba(20,10,10,0.7)'; g.lineCap = 'round';
  for (let i = 0; i < 3; i++) { g.lineWidth = 7 - i; g.beginPath(); g.moveTo(30 + i * 24, 18); g.quadraticCurveTo(48 + i * 22, 64, 34 + i * 24, 112); g.stroke(); }
});

// ---------------- 世界 ----------------
export async function createWorld(canvas, mapId, { mobile }) {
  const map = MAPS[mapId];
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.6 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = map.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070c);
  const camera = new THREE.PerspectiveCamera(38, 1, 1, 200);

  // 燈光：月光（產生陰影）、天空反射、環境貼圖
  const hemi = new THREE.HemisphereLight(map.hemi[0], map.hemi[1], map.hemi[2]);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight(map.moon, map.moonI);
  moon.castShadow = true;
  const SH = mobile ? 1024 : 2048;
  moon.shadow.mapSize.set(SH, SH);
  Object.assign(moon.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 90 });
  moon.shadow.bias = -0.0006; moon.shadow.normalBias = 0.03;
  scene.add(moon, moon.target);
  const MOON_DIR = new THREE.Vector3(-0.45, 1, 0.35).normalize();
  // 白狼身上的月光
  const aura = new THREE.PointLight(0xa8c6ff, 8, 0, 2);
  scene.add(aura);
  // 火盆與落雷用的光（數量固定，避免重新編譯著色器）
  const fireLights = [0, 1].map(() => { const l = new THREE.PointLight(0xff8a3a, 0, 11, 1.8); scene.add(l); return l; });
  const flash = new THREE.PointLight(0xcfe0ff, 0, 18, 1.5); scene.add(flash);

  const [envTex, dA, dB, nA, nB, aA, aB] = await Promise.all([
    loadEnv(renderer, map.env),
    loadTex(`ground/${map.ground[0]}_diff.jpg`, { srgb: true }), loadTex(`ground/${map.ground[1]}_diff.jpg`, { srgb: true }),
    loadTex(`ground/${map.ground[0]}_nor_gl.jpg`), loadTex(`ground/${map.ground[1]}_nor_gl.jpg`),
    loadTex(`ground/${map.ground[0]}_arm.jpg`), loadTex(`ground/${map.ground[1]}_arm.jpg`),
  ]);
  scene.environment = envTex;
  scene.environmentIntensity = map.envI;

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(150, 150).rotateX(-Math.PI / 2), groundMaterial({ dA, dB, nA, nB, aA, aB }, map.tile));
  ground.receiveShadow = true;
  scene.add(ground);

  // ---------------- 地形物件 ----------------
  // tris：載入時減面的目標（小石塊、枯枝在俯視下不需要高面數）
  const PROPS = {
    rocks: { files: [0, 1, 2, 3, 4, 5].map((i) => `rock_moss_set_01_${i}`), col: 0.42, scale: [0.55, 1.0], shadow: true },
    stump: { files: ['tree_stump_01'], col: 0.5, scale: [0.9, 1.3], shadow: true },
    trunk: { files: ['dead_tree_trunk'], col: 0, log: true, scale: [1.2, 1.8], shadow: true, tris: 2000 },
    quiver: { files: ['dead_quiver_trunk'], col: 0.25, scale: [1.6, 2.4], shadow: true, tris: 1500 },
    statue: { files: ['gothic_statue'], col: 0.6, scale: [1.2, 1.5], shadow: true, tris: 3500 },
    fire: { files: ['stone_fire_pit'], col: 0.6, scale: [1, 1.1], shadow: true, fire: true, tris: 1600 },
    fern: { files: ['fern_02'], scale: [0.8, 1.4], decor: true, shadow: !mobile },
    shrub: { files: ['shrub_03'], scale: [1.2, 2.2], decor: true },
    branch: { files: ['dry_branches_medium_01'], scale: [0.9, 1.6], decor: true, tris: 900 },
    pebble: { files: ['rock_07', 'rock_09'], scale: [2, 4.5], decor: true, tris: 260 },
  };
  await MeshoptSimplifier.ready;
  const kinds = [];
  for (const [key, def] of Object.entries(PROPS)) {
    let dens = map.props[key] || 0;
    if (mobile && def.decor) dens *= 0.7;
    if (!dens) continue;
    const variants = [];
    for (const f of def.files) {
      const g = await loadGLB(`props/${f}.glb`);
      const parts = [];
      const box = new THREE.Box3().setFromObject(g.scene);
      g.scene.traverse((o) => { if (o.isMesh) parts.push(o); });
      const total = parts.reduce((a, o) => a + (o.geometry.index ? o.geometry.index.count / 3 : 0), 0);
      const cap = Math.ceil((dens + 2) * 12 / def.files.length) + 6;
      const meshes = parts.map((o) => {
        const m = o.material;
        if (m.map) m.map.anisotropy = 4;
        if (mapId === 'frost' && def.decor) m.color = new THREE.Color(0.85, 0.88, 0.95);
        let geo = o.geometry;
        if (def.tris && geo.index && total > def.tris) geo = simplifyIndex(geo, Math.max(60, Math.round(def.tris * (geo.index.count / 3) / total)));
        const im = new THREE.InstancedMesh(geo, m, cap);
        im.castShadow = !!def.shadow;
        im.receiveShadow = true;
        im.frustumCulled = false; im.count = 0;
        scene.add(im);
        return im;
      });
      variants.push({ meshes, size: box.getSize(new THREE.Vector3()), cap, n: 0 });
    }
    kinds.push({ key, def, dens, variants });
  }

  // 每個區塊的內容只算一次（固定亂數種子，回來時一模一樣）
  const chunks = new Map();
  function chunk(cx, cz) {
    const key = cx + ',' + cz;
    let c = chunks.get(key);
    if (c) return c;
    c = { items: [], cols: [], fires: [] };
    const R = rng(hash2(cx, cz, mapId === 'frost' ? 7 : 3));
    const local = [];
    for (const kd of kinds) {
      const cnt = Math.floor(kd.dens + R());
      for (let i = 0; i < cnt; i++) {
        const x = (cx + R()) * CHUNK, z = (cz + R()) * CHUNK;
        const vi = Math.floor(R() * kd.variants.length), v = kd.variants[vi];
        const sc = kd.def.scale[0] + R() * (kd.def.scale[1] - kd.def.scale[0]);
        const rot = R() * Math.PI * 2;
        let ext = Math.max(v.size.x, v.size.z) * sc * 0.6;
        if (!kd.def.decor) {
          if (Math.hypot(x, z) < 7) continue; // 出生點保持空曠
          const rad = kd.def.log ? 0.35 * sc : Math.max(v.size.x, v.size.z) * kd.def.col * sc;
          if (local.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + rad + 1.2)) continue;
          if (kd.def.log) {
            const hl = (v.size.x * sc) / 2, dx = Math.cos(rot) * hl, dz = -Math.sin(rot) * hl;
            c.cols.push({ x: x - dx, z: z - dz, x2: x + dx, z2: z + dz, r: rad, cx: x, cz: z, ext: hl + rad });
            local.push({ x, z, r: hl });
          } else { const o = { x, z, r: rad, cx: x, cz: z, ext: rad }; c.cols.push(o); local.push(o); }
          if (kd.def.fire) c.fires.push({ x, z, ph: R() * 10 });
        }
        _q.setFromAxisAngle(_y, rot); _s.setScalar(sc); _p.set(x, kd.def.decor ? -0.02 : 0, z);
        c.items.push({ v, x, z, ext, m: new THREE.Matrix4().compose(_p, _q, _s) });
      }
    }
    chunks.set(key, c);
    if (chunks.size > 400) chunks.delete(chunks.keys().next().value);
    return c;
  }

  const colliders = []; // {x,z,r} 或 {x,z,r, x2,z2}（橫倒的樹幹視為線段）
  const fires = [];
  const _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _y = new THREE.Vector3(0, 1, 0);
  let lastX = 1e9, lastZ = 1e9;
  const view = { hw: 12, hh: 12 };
  // 只把畫面附近的物件放進實例（相機移動超過 3 公尺才重算）
  function rebuild(px, pz, force) {
    if (!force && Math.abs(px - lastX) < 3 && Math.abs(pz - lastZ) < 3) return;
    lastX = px; lastZ = pz;
    const hw = view.hw + 6, hh = view.hh + 6;
    const ch = Math.max(hw, hh) + 14; // 碰撞範圍比畫面大（畫面外的敵人也要繞開）
    colliders.length = 0; fires.length = 0;
    for (const kd of kinds) for (const v of kd.variants) v.n = 0;
    const c0 = Math.floor((px - ch) / CHUNK), c1 = Math.floor((px + ch) / CHUNK), d0 = Math.floor((pz - ch) / CHUNK), d1 = Math.floor((pz + ch) / CHUNK);
    for (let cz = d0; cz <= d1; cz++) for (let cx = c0; cx <= c1; cx++) {
      const c = chunk(cx, cz);
      for (const o of c.cols) colliders.push(o);
      for (const f of c.fires) fires.push(f);
      for (const it of c.items) {
        if (Math.abs(it.x - px) > hw + it.ext || Math.abs(it.z - pz) > hh + it.ext) continue;
        const v = it.v;
        if (v.n >= v.cap) continue;
        for (const m of v.meshes) m.setMatrixAt(v.n, it.m);
        v.n++;
      }
    }
    for (const kd of kinds) for (const v of kd.variants) for (const m of v.meshes) { m.count = v.n; m.instanceMatrix.needsUpdate = true; }
  }

  // ---------------- 特效 ----------------
  const particles = new Particles(mobile ? 2200 : 3500, softDot());
  scene.add(particles.points);
  const tex = { slash: slashTex(), ring: ringTex(), scorch: scorchTex(), web: webTex(), claw: clawTex() };
  // 平放在地面的特效（爪擊、震波、焦痕、蛛網）
  const flats = [];
  function flat(kind, x, z, { r = 1, rot = 0, life = 0.4, color = 0xffffff, grow = 1, y = 0.06, additive = true, opacity = 1, arc = 0, sweep = false } = {}) {
    let f = flats.find((o) => !o.on && o.kind === kind + (additive ? 'a' : 'n') + arc);
    if (!f) {
      const geo = arc ? new THREE.RingGeometry(0.7, 1, 40, 1, -arc / 2, arc) : new THREE.PlaneGeometry(2, 2);
      if (arc) { // 把弧形的 uv 改成沿角度方向
        const uv = geo.attributes.uv, pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) { const a = Math.atan2(pos.getY(i), pos.getX(i)); const rr = Math.hypot(pos.getX(i), pos.getY(i)); uv.setXY(i, (a + arc / 2) / arc, (rr - 0.7) / 0.3); }
      }
      geo.rotateX(-Math.PI / 2);
      const t = kind === 'slash' ? tex.slash : kind === 'ring' ? tex.ring : kind === 'scorch' ? tex.scorch : kind === 'web' ? tex.web : tex.claw;
      const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, polygonOffset: true, polygonOffsetFactor: -2 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.renderOrder = additive ? 4 : 1;
      scene.add(mesh);
      f = { kind: kind + (additive ? 'a' : 'n') + arc, mesh, on: false };
      flats.push(f);
    }
    Object.assign(f, { on: true, age: 0, life, r, grow, opacity, sweep });
    f.mesh.visible = true;
    f.mesh.position.set(x, y, z);
    f.mesh.rotation.set(0, rot, 0);
    f.mesh.scale.setScalar(r);
    f.mesh.material.color.set(color);
    f.mesh.material.opacity = opacity;
    if (f.mesh.material.map) { f.mesh.material.map.offset.x = 0; }
    return f;
  }
  function updateFlats(dt) {
    for (const f of flats) {
      if (!f.on) continue;
      f.age += dt;
      const t = f.age / f.life;
      if (t >= 1) { f.on = false; f.mesh.visible = false; continue; }
      f.mesh.scale.setScalar(f.r * (1 + (f.grow - 1) * t));
      f.mesh.material.opacity = f.opacity * (f.sweep ? Math.min(1, (1 - t) * 2.2) : t < 0.1 ? t / 0.1 : 1 - (t - 0.1) / 0.9);
    }
  }

  // 落雷：面向鏡頭的鋸齒光帶
  const bolts = [];
  const boltMat = new THREE.MeshBasicMaterial({ color: 0xd8e6ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, vertexColors: false });
  function bolt(x, z, x0 = null, z0 = null, y0 = 16) {
    let b = bolts.find((o) => !o.on);
    if (!b) {
      const SEG = 14;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((SEG + 1) * 2 * 3), 3));
      const idx = []; for (let i = 0; i < SEG; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      g.setIndex(idx);
      const mesh = new THREE.Mesh(g, boltMat.clone()); mesh.frustumCulled = false; mesh.renderOrder = 6;
      scene.add(mesh); b = { mesh, SEG, on: false }; bolts.push(b);
    }
    b.on = true; b.age = 0; b.life = 0.22; b.mesh.visible = true;
    const pos = b.mesh.geometry.attributes.position;
    const sx = x0 == null ? x + (Math.random() - 0.5) * 3 : x0, sz = z0 == null ? z + (Math.random() - 0.5) * 3 : z0, sy = x0 == null ? y0 : 1;
    const side = new THREE.Vector3();
    const camDir = new THREE.Vector3(); camera.getWorldDirection(camDir);
    for (let i = 0; i <= b.SEG; i++) {
      const t = i / b.SEG;
      const j = i === 0 || i === b.SEG ? 0 : 1;
      const px = sx + (x - sx) * t + (Math.random() - 0.5) * 0.9 * j, py = sy + (0.1 - sy) * t + (x0 == null ? 0 : Math.sin(t * Math.PI) * 0.8), pz = sz + (z - sz) * t + (Math.random() - 0.5) * 0.9 * j;
      side.set(x - sx, 0.1 - sy, z - sz).cross(camDir).normalize().multiplyScalar(0.09 + 0.06 * (1 - t));
      pos.setXYZ(i * 2, px - side.x, py - side.y, pz - side.z);
      pos.setXYZ(i * 2 + 1, px + side.x, py + side.y, pz + side.z);
    }
    pos.needsUpdate = true;
  }
  function updateBolts(dt) {
    for (const b of bolts) {
      if (!b.on) continue;
      b.age += dt;
      if (b.age >= b.life) { b.on = false; b.mesh.visible = false; continue; }
      b.mesh.material.opacity = (1 - b.age / b.life) * (0.7 + Math.random() * 0.3);
    }
  }

  // ---------------- 鏡頭 ----------------
  const cam = { x: 0, z: 0, shake: 0, dist: 40, pitch: 0.92 };
  function resize(w, h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // 讓畫面較短的一邊大約看到 15 公尺
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const want = camera.aspect < 1 ? 12.5 : 15;
    cam.dist = camera.aspect < 1 ? want / (2 * tan * camera.aspect) : want / (2 * tan) * 1.08;
    cam.dist = Math.min(cam.dist, 52);
    view.hw = cam.dist * tan * camera.aspect * 1.25;
    view.hh = cam.dist * tan / Math.sin(cam.pitch) * 1.1;
    lastX = 1e9;
    camera.far = cam.dist + 60;
    camera.updateProjectionMatrix();
    particles.mat.uniforms.scale.value = (h * renderer.getPixelRatio()) / (2 * tan);
  }
  function setView(px, pz, dt) {
    cam.x += (px - cam.x) * Math.min(1, dt * 8);
    cam.z += (pz - cam.z) * Math.min(1, dt * 8);
    let sx = 0, sz = 0;
    if (cam.shake > 0) { cam.shake = Math.max(0, cam.shake - dt * 2.2); const s = cam.shake * cam.shake * 0.6; sx = (Math.random() - 0.5) * s; sz = (Math.random() - 0.5) * s; }
    const y = Math.sin(cam.pitch) * cam.dist, back = Math.cos(cam.pitch) * cam.dist;
    camera.position.set(cam.x + sx, y, cam.z + back + sz);
    camera.lookAt(cam.x + sx, 0, cam.z + sz);
    ground.position.set(Math.round(cam.x), 0, Math.round(cam.z));
    // 陰影相機跟著玩家，對齊陰影貼圖的像素避免閃爍
    const texel = 44 / moon.shadow.mapSize.x;
    const tx = Math.round(cam.x / texel) * texel, tz = Math.round(cam.z / texel) * texel;
    moon.target.position.set(tx, 0, tz);
    moon.position.set(tx + MOON_DIR.x * 40, MOON_DIR.y * 40, tz + MOON_DIR.z * 40);
    rebuild(cam.x, cam.z);
  }

  let time = 0;
  function update(dt, px, pz) {
    time += dt;
    aura.position.set(px, 4.5, pz);
    // 最近的兩個火盆點亮，火焰閃爍並冒出火星
    const near = fires.map((f) => ({ f, d: Math.hypot(f.x - px, f.z - pz) })).filter((o) => o.d < 30).sort((a, b) => a.d - b.d);
    fireLights.forEach((l, i) => {
      const o = near[i];
      if (!o) { l.intensity = 0; return; }
      const fl = 0.8 + Math.sin(time * 13 + o.f.ph) * 0.1 + Math.sin(time * 23.7 + o.f.ph * 2) * 0.08 + Math.random() * 0.06;
      l.position.set(o.f.x, 1.1, o.f.z); l.intensity = 26 * fl;
    });
    for (const o of near.slice(0, 4)) {
      const f = o.f;
      if (Math.random() < dt * 34) particles.emit(f.x + (Math.random() - 0.5) * 0.5, 0.35, f.z + (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.3, 1.1 + Math.random() * 0.8, (Math.random() - 0.5) * 0.3, 0.5 + Math.random() * 0.4, 0.55, 0.12, 1.0, 0.45, 0.12, 1.2, -0.4);
      if (Math.random() < dt * 6) particles.emit(f.x, 0.6, f.z, (Math.random() - 0.5) * 0.6, 2 + Math.random(), (Math.random() - 0.5) * 0.6, 1.2 + Math.random(), 0.09, 0.03, 1, 0.6, 0.25, 0.6, 0.6);
    }
    if (flash.intensity > 0) flash.intensity = Math.max(0, flash.intensity - dt * 260);
    particles.update(dt);
    updateFlats(dt);
    updateBolts(dt);
  }
  function lightning(x, z) { flash.position.set(x, 4, z); flash.intensity = 70; }

  function render() { renderer.render(scene, camera); }
  function dispose() {
    scene.traverse((o) => { if (o.geometry) o.geometry.dispose?.(); });
    renderer.dispose();
    renderer.forceContextLoss?.();
  }

  // 與物件碰撞：把圓（x,z,r）推出障礙物，回傳修正後座標
  function collide(x, z, r) {
    for (let k = 0; k < colliders.length; k++) {
      const c = colliders[k];
      let cx = c.x, cz = c.z;
      if (c.x2 !== undefined) { // 線段最近點
        const dx = c.x2 - c.x, dz = c.z2 - c.z, L = dx * dx + dz * dz;
        const t = Math.max(0, Math.min(1, ((x - c.x) * dx + (z - c.z) * dz) / L));
        cx = c.x + dx * t; cz = c.z + dz * t;
      }
      const ex = x - cx, ez = z - cz, d2 = ex * ex + ez * ez, rr = r + c.r;
      if (d2 < rr * rr) {
        const d = Math.sqrt(d2) || 0.001;
        x = cx + (ex / d) * rr; z = cz + (ez / d) * rr;
      }
    }
    return [x, z];
  }

  return { renderer, scene, camera, cam, resize, setView, update, render, dispose, particles, flat, bolt, lightning, collide, colliders, aura, moon, map };
}
