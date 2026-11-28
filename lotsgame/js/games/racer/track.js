// 賽道：樣條曲線道路（含路拱傾斜、標線）、與道路接合的地形、護欄、路邊物件與天空。
import * as THREE from '../../../vendor/three/three.module.js';
import { GLTFLoader } from '../../../vendor/three/GLTFLoader.js';
import { HDRLoader } from '../../../vendor/three/HDRLoader.js';

export const BASE = new URL('../../../assets/racer/', import.meta.url).href;
const gltfLoader = new GLTFLoader(), texLoader = new THREE.TextureLoader();
const cache = new Map();
export function glb(path) { if (!cache.has(path)) cache.set(path, gltfLoader.loadAsync(BASE + path)); return cache.get(path); }
export function tex(path, srgb = false) {
  const k = path + srgb;
  if (!cache.has(k)) cache.set(k, texLoader.loadAsync(BASE + path).then((t) => { if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; }));
  return cache.get(k);
}

const STEP = 2; // 取樣間距（公尺）
export const SHM = { shMask: { value: null }, maskXf: { value: new THREE.Vector4() }, maskNear: { value: new THREE.Vector3(0, 0, 1e5) } };
const WHITE = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); WHITE.needsUpdate = true;
export const HW = 5.5; // 半路寬
export const EDGE = 6.6; // 含路肩
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ---------------- 雜訊 ----------------
function hash(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, z) { const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz; const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz); const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, z) { let s = 0, a = 0.5, f = 1; for (let o = 0; o < 5; o++) { s += a * vnoise(x * f, z * f); f *= 2.03; a *= 0.5; } return s; }
// 有些模型的三角形繞向和頂點法線相反（雙面材質時會被照成全黑）：依法線把繞向轉正
function fixWinding(g) {
  if (g.userData.wound || !g.index || !g.attributes.normal) return;
  g.userData.wound = true;
  const I = g.index.array, P = g.attributes.position.array, N = g.attributes.normal.array;
  let s = 0;
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    s += (uy * vz - uz * vy) * (N[a] + N[b] + N[c]) + (uz * vx - ux * vz) * (N[a + 1] + N[b + 1] + N[c + 1]) + (ux * vy - uy * vx) * (N[a + 2] + N[b + 2] + N[c + 2]);
  }
  if (s >= 0) return;
  for (let t = 0; t < I.length; t += 3) { const k = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = k; }
  g.index.needsUpdate = true;
}
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------------- 樣條 ----------------
function catmull(p0, p1, p2, p3, t) {
  // 向心 Catmull-Rom
  const d = (a, b) => Math.pow(Math.hypot(b[0] - a[0], b[1] - a[1], (b[2] - a[2]) * 0.3) + 1e-6, 0.5);
  const t0 = 0, t1 = t0 + d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3);
  const tt = t1 + (t2 - t1) * t;
  const L = (a, b, ta, tb) => a.map((v, i) => ((tb - tt) / (tb - ta)) * v + ((tt - ta) / (tb - ta)) * b[i]);
  const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3);
  const B1 = L(A1, A2, t0, t2), B2 = L(A2, A3, t1, t3);
  return L(B1, B2, t1, t2);
}
function sampleSpline(ctrl) {
  const n = ctrl.length, dense = [];
  for (let i = 0; i < n; i++) {
    const p0 = ctrl[(i - 1 + n) % n], p1 = ctrl[i], p2 = ctrl[(i + 1) % n], p3 = ctrl[(i + 2) % n];
    for (let k = 0; k < 60; k++) dense.push(catmull(p0, p1, p2, p3, k / 60));
  }
  // 依弧長重新等距取樣
  const cum = [0];
  for (let i = 1; i <= dense.length; i++) { const a = dense[i - 1], b = dense[i % dense.length]; cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const total = cum[cum.length - 1], N = Math.round(total / STEP), out = [];
  let j = 0;
  for (let k = 0; k < N; k++) {
    const s = (k / N) * total;
    while (cum[j + 1] < s) j++;
    const a = dense[j], b = dense[(j + 1) % dense.length], f = (s - cum[j]) / (cum[j + 1] - cum[j] || 1);
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]);
  }
  return { pts: out, total };
}

// ---------------- 建立賽道 ----------------
export async function buildTrack(def, renderer, scene, { mobile, onProgress }) {
  const { pts, total } = sampleSpline(def.ctrl);
  const n = pts.length;
  const X = new Float32Array(n), Z = new Float32Array(n), Y = new Float32Array(n), TX = new Float32Array(n), TZ = new Float32Array(n), K = new Float32Array(n), BANK = new Float32Array(n);
  for (let i = 0; i < n; i++) { X[i] = pts[i][0]; Z[i] = pts[i][1]; Y[i] = pts[i][2]; }
  // 高度平滑
  for (let pass = 0; pass < 3; pass++) { const c = Y.slice(); for (let i = 0; i < n; i++) { let s = 0; for (let k = -6; k <= 6; k++) s += c[(i + k + n) % n]; Y[i] = s / 13; } }
  for (let i = 0; i < n; i++) { const a = (i + 1) % n, b = (i - 1 + n) % n; const dx = X[a] - X[b], dz = Z[a] - Z[b], l = Math.hypot(dx, dz); TX[i] = dx / l; TZ[i] = dz / l; }
  const head = (i) => Math.atan2(TX[i], TZ[i]);
  for (let i = 0; i < n; i++) { let d = head((i + 2) % n) - head((i - 2 + n) % n); d = ((d + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; K[i] = d / (4 * STEP); }
  { const c = K.slice(); for (let i = 0; i < n; i++) { let s = 0; for (let k = -4; k <= 4; k++) s += c[(i + k + n) % n]; K[i] = s / 9; } }
  for (let i = 0; i < n; i++) BANK[i] = clamp(K[i] * 3.2, -0.075, 0.075);
  const right = (i) => [-TZ[i], TX[i]];
  const roadH = (i, off) => Y[i] + off * Math.tan(BANK[i]);

  // 空間索引：找最近的道路取樣
  const CELL = 24, grid = new Map();
  const gk = (cx, cz) => cx * 92821 + cz;
  for (let i = 0; i < n; i++) { const k = gk(Math.floor(X[i] / CELL), Math.floor(Z[i] / CELL)); let a = grid.get(k); if (!a) grid.set(k, (a = [])); a.push(i); }
  function nearestAny(x, z, rad = 3) {
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL); let best = -1, bd = Infinity;
    for (let r = 0; r <= rad; r++) {
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const a = grid.get(gk(cx + dx, cz + dz)); if (!a) continue;
        for (const i of a) { const d = (X[i] - x) ** 2 + (Z[i] - z) ** 2; if (d < bd) { bd = d; best = i; } }
      }
      if (best >= 0 && r >= 1) break;
    }
    return best < 0 ? null : { i: best, d: Math.sqrt(bd) };
  }
  // 以前一次的位置附近搜尋（車輛每格使用）
  function locate(x, z, hint) {
    let i = hint;
    if (i == null || i < 0) { const r = nearestAny(x, z, 6); i = r ? r.i : 0; }
    let best = i, bd = (X[i] - x) ** 2 + (Z[i] - z) ** 2;
    for (let k = -14; k <= 14; k++) { const j = (i + k + n) % n; const d = (X[j] - x) ** 2 + (Z[j] - z) ** 2; if (d < bd) { bd = d; best = j; } }
    // 在相鄰兩點之間插值，得到連續的里程與側向位移
    const j = best, a = (j + 1) % n;
    const ex = X[a] - X[j], ez = Z[a] - Z[j], L2 = ex * ex + ez * ez;
    let f = ((x - X[j]) * ex + (z - Z[j]) * ez) / L2;
    let base = j;
    if (f < 0) { base = (j - 1 + n) % n; const ex2 = X[j] - X[base], ez2 = Z[j] - Z[base]; f = ((x - X[base]) * ex2 + (z - Z[base]) * ez2) / (ex2 * ex2 + ez2 * ez2); }
    f = clamp(f, 0, 1);
    const b2 = (base + 1) % n;
    const px = X[base] + (X[b2] - X[base]) * f, pz = Z[base] + (Z[b2] - Z[base]) * f;
    const [rx, rz] = right(base);
    const off = (x - px) * rx + (z - pz) * rz;
    return { i: best, base, f, off, s: (base + f) * STEP };
  }

  // ---------------- 自然地形高度 ----------------
  const minX = Math.min(...X), maxX = Math.max(...X), minZ = Math.min(...Z), maxZ = Math.max(...Z);
  const margin = 900;
  const gx0 = minX - margin, gz0 = minZ - margin, gw = maxX - minX + margin * 2, gd = maxZ - minZ + margin * 2;
  const RES = mobile ? 190 : 250;
  const cs = Math.max(gw, gd) / RES, GX = Math.ceil(gw / cs) + 1, GZ = Math.ceil(gd / cs) + 1;
  const theme = def.theme;
  // 海岸線：沿著賽道南側（−z）留一段草坡後就是斷崖，讓濱海路段貼著海
  const CST = 10, cx0 = gx0, CN = Math.ceil(gw / CST) + 1, CZ = new Float32Array(CN);
  if (theme === 'coast') {
    for (let k = 0; k < CN; k++) { const x = cx0 + k * CST; let m = Infinity; for (let i = 0; i < n; i++) if (Math.abs(X[i] - x) < 28) m = Math.min(m, Z[i]); CZ[k] = (m === Infinity ? minZ : m) - 22; }
    for (let pass = 0; pass < 1; pass++) { const c = CZ.slice(); for (let k = 0; k < CN; k++) { let s = Infinity; for (let j = -2; j <= 2; j++) s = Math.min(s, c[clamp(k + j, 0, CN - 1)]); CZ[k] = s; } }
    for (let pass = 0; pass < 3; pass++) { const c = CZ.slice(); for (let k = 0; k < CN; k++) { let s = 0; for (let j = -3; j <= 3; j++) s += c[clamp(k + j, 0, CN - 1)]; CZ[k] = s / 7; } }
  }
  const coastZ = (x) => { const f = clamp((x - cx0) / CST, 0, CN - 1.001), k = Math.floor(f); return CZ[k] + (CZ[k + 1] - CZ[k]) * (f - k) + 3 * Math.sin(x / 37); };
  function natural(x, z, near) {
    const ry = near ? Y[near.i] : 10, d = near ? near.d : 400;
    const amp = 5 + Math.min(d / 160, 1) * def.hill;
    let h = ry + amp * (fbm(x / 260 + 11, z / 260 + 3) - 0.42) + Math.min(d / 400, 1) * def.hill * 0.35;
    if (theme === 'canyon') h = ry + (def.hill * smooth(16, 52, d) * (0.75 + 0.5 * fbm(x / 90, z / 90))) + 3 * (fbm(x / 40, z / 40) - 0.5);
    if (theme === 'coast') { const sz = z - coastZ(x); const land = ry - 2.5 - 0.04 * Math.max(0, sz); if (sz > 0) h += (land - h) * smooth(70, 4, sz); else h = land + (-14 - land) * smooth(0, 16, -sz) + 3 * (fbm(x / 9, z / 9) - 0.5) * smooth(0, 6, -sz) * smooth(16, 8, -sz); }
    return h;
  }
  const HT = new Float32Array(GX * GZ);
  for (let gz = 0; gz < GZ; gz++) for (let gx = 0; gx < GX; gx++) {
    const x = gx0 + gx * cs, z = gz0 + gz * cs;
    let near = nearestAny(x, z, 3);
    if (!near) { // 遠處：取粗略最近點
      let bd = Infinity, bi = 0; for (let i = 0; i < n; i += 8) { const d = (X[i] - x) ** 2 + (Z[i] - z) ** 2; if (d < bd) { bd = d; bi = i; } } near = { i: bi, d: Math.sqrt(bd) };
    }
    let h = natural(x, z, near);
    if (near.d < 40) {
      const L = locate(x, z, near.i), ao = Math.abs(L.off);
      const edgeH = roadH(L.i, clamp(L.off, -EDGE, EDGE)) - 0.25;
      if (ao < EDGE + 1) h = edgeH;
      else h = edgeH + (h - edgeH) * smooth(EDGE + 1, EDGE + 14, ao);
    }
    HT[gz * GX + gx] = h;
  }
  function terrainH(x, z) {
    const fx = clamp((x - gx0) / cs, 0, GX - 1.001), fz = clamp((z - gz0) / cs, 0, GZ - 1.001);
    const ix = Math.floor(fx), iz = Math.floor(fz), u = fx - ix, v = fz - iz;
    const a = HT[iz * GX + ix], b = HT[iz * GX + ix + 1], c = HT[(iz + 1) * GX + ix], d = HT[(iz + 1) * GX + ix + 1];
    // 網格的三角形切法與繪製一致
    return u + v < 1 ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v);
  }
  onProgress && onProgress(0.25);

  // ---------------- 路邊：護欄、峭壁、緩衝區 ----------------
  const RAIL = [new Uint8Array(n), new Uint8Array(n)], LIM = [new Float32Array(n), new Float32Array(n)], WALL = [new Uint8Array(n), new Uint8Array(n)];
  for (let i = 0; i < n; i++) {
    const [rx, rz] = right(i);
    for (let side = 0; side < 2; side++) {
      const sg = side ? 1 : -1;
      const hx = X[i] + rx * sg * (EDGE + 9), hz = Z[i] + rz * sg * (EDGE + 9);
      const nat = natural(hx, hz, { i, d: EDGE + 9 });
      const dh = nat - roadH(i, sg * EDGE);
      const far = theme === 'coast' ? natural(X[i] + rx * sg * (EDGE + 24), Z[i] + rz * sg * (EDGE + 24), { i, d: EDGE + 24 }) - roadH(i, sg * EDGE) : 0;
      const drop = dh < -3 || far < -8, wall = dh > 3.5;
      RAIL[side][i] = drop || (Math.abs(K[i]) > 0.012 && Math.sign(K[i]) === -sg && theme !== 'canyon') ? 1 : 0;
      WALL[side][i] = wall ? 1 : 0;
      LIM[side][i] = RAIL[side][i] ? EDGE + 0.45 : wall ? EDGE + 2.2 : EDGE + 10;
    }
  }
  // 平滑護欄區段（避免零碎）
  for (let side = 0; side < 2; side++) { const r = RAIL[side], c = r.slice(); for (let i = 0; i < n; i++) { let s = 0; for (let k = -6; k <= 6; k++) s += c[(i + k + n) % n]; r[i] = s >= 4 ? 1 : 0; LIM[side][i] = r[i] ? EDGE + 0.45 : WALL[side][i] ? EDGE + 2.2 : EDGE + 10; } }

  // ---------------- 地形網格 ----------------
  const tg = new THREE.PlaneGeometry(1, 1, GX - 1, GZ - 1);
  { const p = tg.attributes.position; for (let gz = 0; gz < GZ; gz++) for (let gx = 0; gx < GX; gx++) { const k = gz * GX + gx; p.setXYZ(k, gx0 + gx * cs, HT[k], gz0 + gz * cs); } }
  tg.computeVertexNormals(); // 列數往 +Z 增加時，PlaneGeometry 的三角形方向剛好朝上
  const G = def.ground;
  const [gA, gB, gR, nA, nB, nR, aA, aB, aR, asphD, asphN, asphA] = await Promise.all([
    tex(`tex/${G[0]}_diff.jpg`, true), tex(`tex/${G[1]}_diff.jpg`, true), tex(`tex/${G[2]}_diff.jpg`, true),
    tex(`tex/${G[0]}_nor_gl.jpg`), tex(`tex/${G[1]}_nor_gl.jpg`), tex(`tex/${G[2]}_nor_gl.jpg`),
    tex(`tex/${G[0]}_arm.jpg`), tex(`tex/${G[1]}_arm.jpg`), tex(`tex/${G[2]}_arm.jpg`),
    tex('tex/asphalt_02_diff.jpg', true), tex('tex/asphalt_02_nor_gl.jpg'), tex('tex/asphalt_02_arm.jpg'),
  ]);
  onProgress && onProgress(0.4);
  // 預先烘焙的陰影圖（地形自遮蔽＋樹影＋樹下環境遮蔽），涵蓋整個地形；建完植被後才填入
  // 材質（含快取的模型材質）在不同賽道之間共用同一組 uniform，所以用模組層級的 SHM 只更新數值
  SHM.maskXf.value.set(gx0, gz0, 1 / gw, 1 / gd); SHM.maskNear.value.set(0, 0, 1e5);
  if (SHM.shMask.value && SHM.shMask.value !== WHITE) SHM.shMask.value.dispose();
  SHM.shMask.value = WHITE;
  const terrain = new THREE.Mesh(tg, terrainMaterial({ gA, gB, gR, nA, nB, nR, aA, aB, aR }, theme, SHM));
  terrain.receiveShadow = true;
  scene.add(terrain);

  // ---------------- 路面 ----------------
  const cols = 9, offs = [-EDGE, -HW - 0.2, -HW, -2.75, 0, 2.75, HW, HW + 0.2, EDGE];
  const rp = new Float32Array(n * cols * 3), ruv = new Float32Array(n * cols * 2), ridx = [];
  for (let i = 0; i < n; i++) {
    const [rx, rz] = right(i);
    for (let c = 0; c < cols; c++) {
      const o = offs[c], k = i * cols + c;
      rp[k * 3] = X[i] + rx * o; rp[k * 3 + 1] = roadH(i, o) + 0.02; rp[k * 3 + 2] = Z[i] + rz * o;
      ruv[k * 2] = o; ruv[k * 2 + 1] = i * STEP;
    }
  }
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; for (let c = 0; c < cols - 1; c++) { const a = i * cols + c, b = j * cols + c; ridx.push(a, a + 1, b, a + 1, b + 1, b); } } // 逆時針朝上
  // 最後一段的 v 座標要接續（避免貼圖在起點跳一下）
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
  rg.setAttribute('uv', new THREE.BufferAttribute(ruv, 2));
  rg.setIndex(ridx);
  rg.computeVertexNormals();
  const road = new THREE.Mesh(rg, roadMaterial(asphD, asphN, asphA, total, SHM));
  road.receiveShadow = true;
  scene.add(road);
  onProgress && onProgress(0.5);

  // ---------------- 護欄 ----------------
  const metal = new THREE.MeshStandardMaterial({ color: 0xaab0b6, metalness: 0.85, roughness: 0.42, side: THREE.DoubleSide });
  const railGeo = (side) => {
    const P = [], I = [], sg = side ? 1 : -1, prof = [[0.0, 0.45], [0.04, 0.55], [0.0, 0.62], [0.04, 0.7], [0.0, 0.8]];
    let run = null;
    const flush = () => { run = null; };
    for (let i = 0; i <= n; i++) {
      const ii = i % n;
      if (!RAIL[side][ii]) { flush(); continue; }
      const [rx, rz] = right(ii), o = sg * (EDGE + 0.3);
      const base = P.length / 3;
      for (const [d, h] of prof) P.push(X[ii] + rx * (o + sg * d), roadH(ii, o) + h, Z[ii] + rz * (o + sg * d));
      if (run !== null) for (let k = 0; k < prof.length - 1; k++) { const a = run + k, b = base + k; I.push(a, b, a + 1, a + 1, b, b + 1, a, a + 1, b, a + 1, b + 1, b); }
      run = base;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals(); return g;
  };
  for (let side = 0; side < 2; side++) { const m = new THREE.Mesh(railGeo(side), metal); m.castShadow = true; m.receiveShadow = true; scene.add(m); }
  // 立柱與路邊反光柱
  const postGeo = new THREE.BoxGeometry(0.1, 0.8, 0.1).translate(0, 0.4, 0);
  const postMats = [];
  const railPosts = [], marks = [];
  for (let i = 0; i < n; i += 2) for (let side = 0; side < 2; side++) {
    const sg = side ? 1 : -1, [rx, rz] = right(i);
    if (RAIL[side][i]) { const o = sg * (EDGE + 0.42); railPosts.push([X[i] + rx * o, roadH(i, o), Z[i] + rz * o, Math.atan2(TX[i], TZ[i])]); }
    else if (i % 20 === 0) { const o = sg * (EDGE + 1.1); marks.push([X[i] + rx * o, roadH(i, sg * EDGE), Z[i] + rz * o, Math.atan2(TX[i], TZ[i]), side]); }
  }
  const instance = (geo, mat, list, sx = 1) => {
    const im = new THREE.InstancedMesh(geo, mat, list.length); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    list.forEach((p, k) => { q.setFromAxisAngle(up, p[3]); m4.compose(new THREE.Vector3(p[0], p[1], p[2]), q, new THREE.Vector3(sx, 1, sx)); im.setMatrixAt(k, m4); });
    im.castShadow = true; im.receiveShadow = true; scene.add(im); return im;
  };
  instance(postGeo, metal, railPosts);
  const markTex = (() => { const c = document.createElement('canvas'); c.width = 16; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#e8e6df'; g.fillRect(0, 0, 16, 64); g.fillStyle = '#16171a'; g.fillRect(0, 6, 16, 12); g.fillStyle = '#d8a020'; g.fillRect(4, 8, 8, 8); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  instance(new THREE.BoxGeometry(0.12, 1.0, 0.12).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ map: markTex, roughness: 0.6 }), marks);
  postMats.push(metal);

  // ---------------- 天空、光線 ----------------
  const [bg, envRaw] = await Promise.all([tex(`sky/${def.sky}_bg.jpg`, true), new HDRLoader().loadAsync(BASE + `sky/${def.sky}_env.hdr`)]);
  bg.mapping = THREE.EquirectangularReflectionMapping; bg.wrapS = THREE.ClampToEdgeWrapping;
  scene.background = bg;
  envRaw.mapping = THREE.EquirectangularReflectionMapping;
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromEquirectangular(envRaw).texture; pm.dispose(); envRaw.dispose();
  scene.environmentIntensity = def.envI;
  scene.backgroundIntensity = 1;
  scene.fog = new THREE.FogExp2(def.fog, def.fogD);
  const sunAz = (def.sunAz - 0.5) * Math.PI * 2, el = THREE.MathUtils.degToRad(def.sunEl);
  const sunDir = new THREE.Vector3(Math.cos(sunAz) * Math.cos(el), Math.sin(el), Math.sin(sunAz) * Math.cos(el)).normalize();
  FOL.uSunW.value.copy(sunDir); FOL.uSunC.value.set(def.sun).multiplyScalar(def.sunI);
  onProgress && onProgress(0.6);

  // ---------------- 海 ----------------
  let water = null;
  if (theme === 'coast') {
    const wn = (() => { const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); const img = g.createImageData(S, S); const h = (x, y) => fbm(x / 22, y / 22) * 0.7 + fbm(x / 7 + 9, y / 7) * 0.3; for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const dx = h((x + 1) % S, y) - h((x - 1 + S) % S, y), dy = h(x, (y + 1) % S) - h(x, (y - 1 + S) % S); const nx = -dx * 6, ny = -dy * 6, l = Math.hypot(nx, ny, 1); const k = (y * S + x) * 4; img.data[k] = (nx / l * 0.5 + 0.5) * 255; img.data[k + 1] = (ny / l * 0.5 + 0.5) * 255; img.data[k + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[k + 3] = 255; } g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(220, 220); return t; })();
    water = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1c4856, roughness: 0.06, metalness: 0.15, normalMap: wn, normalScale: new THREE.Vector2(0.55, 0.55), envMapIntensity: 1.2 }));
    water.position.set((minX + maxX) / 2, 0, (minZ + maxZ) / 2);
    scene.add(water);
  }

  // ---------------- 植被與岩石 ----------------
  const R = rng(def.name.length * 977 + n);
  const place = [];
  const tryPos = (dmin, dmax, tries = 1) => {
    for (let t = 0; t < tries; t++) {
      const i = Math.floor(R() * n), side = R() < 0.5 ? -1 : 1, [rx, rz] = right(i);
      if (LIM[side > 0 ? 1 : 0][i] < EDGE + 3 && dmin < 12) continue;
      const d = dmin + R() * (dmax - dmin), x = X[i] + rx * side * (EDGE + d), z = Z[i] + rz * side * (EDGE + d);
      const near = nearestAny(x, z, 2); if (near && near.d < EDGE + dmin * 0.8) continue;
      if (theme === 'coast' && z - coastZ(x) < 4) continue;
      return [x, terrainH(x, z), z];
    }
    return null;
  };
  const kinds = theme === 'mountain'
    ? [['rock_face_02', 70, 10, 60, [0.8, 1.6], true], ['rock_face_01', 30, 20, 90, [1, 2], true], ['shrub_02', 70, 2, 30, [0.6, 1.1], false], ['wild_rooibos_bush', 80, 2, 25, [0.9, 1.4], false], ['shrub_04', 60, 1.5, 15, [2.5, 4], false]]
    : theme === 'coast'
      ? [['rock_face_02', 50, 8, 70, [0.8, 1.5], true], ['rock_face_01', 25, 15, 90, [1, 2.2], true], ['wild_rooibos_bush', 90, 2, 30, [0.8, 1.3], false], ['shrub_02', 50, 3, 35, [0.6, 1], false]]
      : [['namaqualand_boulder_03', 70, 6, 60, [0.8, 2.2], true], ['namaqualand_boulder_04', 70, 6, 60, [0.8, 2.2], true], ['quiver_tree_02', 70, 4, 40, [2.4, 3.6], true], ['rock_face_01', 30, 25, 80, [1.5, 3], true], ['wild_rooibos_bush', 50, 2, 20, [0.7, 1.1], false]];
  const scale = mobile ? 0.65 : 1;
  // 只畫鏡頭附近的物件（灌木很細，遠處看不出來卻很耗效能）
  const lodGroups = [];
  for (const [file, count, dmin, dmax, [s0, s1], shadow] of kinds) {
    const g = await glb(`props/${file}.glb`);
    const list = [];
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    for (let k = 0; k < count * scale; k++) {
      const p = tryPos(dmin, dmax, 4); if (!p) continue;
      const sc = s0 + R() * (s1 - s0);
      q.setFromAxisAngle(up, R() * Math.PI * 2);
      list.push({ x: p[0], z: p[2], m: m4.compose(new THREE.Vector3(p[0], p[1] - 0.1, p[2]), q, new THREE.Vector3(sc, sc, sc)).clone() });
      if (shadow) place.push([p[0], p[1], p[2], sc * (file.startsWith('quiver') ? 2.2 : 1.4), file.startsWith('quiver') ? 3.5 * sc : 1.2 * sc]);
    }
    const parts = [];
    g.scene.traverse((o) => {
      if (!o.isMesh) return;
      fixWinding(o.geometry);
      if (o.material.alphaTest === 0 && !o.material.transparent) o.material.side = THREE.FrontSide;
      const im = new THREE.InstancedMesh(o.geometry, o.material, Math.max(1, list.length));
      im.count = 0; im.castShadow = shadow; im.receiveShadow = true; im.frustumCulled = false; scene.add(im); parts.push(im);
      addMask(o.material, SHM, { trees: false });
    });
    const shrub = !shadow;
    lodGroups.push({ list, parts, bb: null, near: shrub ? (mobile ? 55 : 85) : (mobile ? 240 : 380), back: shrub ? 12 : 45 });
  }
  onProgress && onProgress(0.75);
  // 樹木：近處用真實 3D 樹（樹幹、枝條、葉片卡），遠處用同一棵樹渲染的看板
  const trees = [];
  let forest = null;
  if (theme !== 'canyon') {
    const species = theme === 'mountain'
      ? [{ file: 'tree_jacaranda', img: 'tree_a.png', count: 650, s: [0.34, 0.66], size: 26.55, d: [10, 320] }, { file: 'tree_island', img: 'tree_b.png', count: 320, s: [1.9, 3.0], size: 4.36, d: [8, 220] }]
      : [{ file: 'tree_island', img: 'tree_b.png', count: 300, s: [1.7, 2.9], size: 4.36, d: [8, 260] }, { file: 'tree_jacaranda', img: 'tree_a.png', count: 60, s: [0.32, 0.5], size: 26.55, d: [14, 260] }];
    forest = await buildForest(species, { tryPos, R, scale, mobile, scene, SHM });
    trees.push(...forest.trees); lodGroups.push(...forest.groups);
  }

  const lodState = { x: 1e9, z: 1e9, t: -1 };
  // 烘焙陰影圖
  onProgress && onProgress(0.85);
  SHM.shMask.value = bakeShadowMask({ gx0, gz0, gw, gd, terrainH, sunDir, trees, rocks: place, mobile });
  // 護欄、立柱等其他材質也套用地形陰影
  for (const m of [metal]) addMask(m, SHM, { trees: true });

  // 起跑線位置與起跑格
  const gridSlot = (k) => { // k = 0 為第一排內側
    const i = (n - 6 - Math.floor(k / 2) * 5) % n, [rx, rz] = right(i), o = (k % 2 ? 1 : -1) * 2.6;
    return { x: X[i] + rx * o, z: Z[i] + rz * o, h: Math.atan2(TX[i], TZ[i]), i };
  };

  // 電腦車的行車線與目標速度
  const LINE = new Float32Array(n), VMAX = new Float32Array(n);
  for (let i = 0; i < n; i++) LINE[i] = -clamp(K[i] * 260, -1, 1) * (HW - 1.4);
  for (let pass = 0; pass < 4; pass++) { const c = LINE.slice(); for (let i = 0; i < n; i++) { let s = 0; for (let k = -10; k <= 10; k++) s += c[(i + k + n) % n]; LINE[i] = s / 21; } }

  function heightAt(x, z, L) {
    if (L && Math.abs(L.off) < EDGE + 0.4) { const b = L.base, b2 = (b + 1) % n; return roadH(b, L.off) * (1 - L.f) + roadH(b2, L.off) * L.f; }
    return terrainH(x, z);
  }

  return {
    n, STEP, total, X, Y, Z, TX, TZ, K, BANK, RAIL, LIM, WALL, LINE, VMAX, right, roadH, locate, nearestAny, heightAt, terrainH, gridSlot,
    sunDir, water, theme, bounds: { minX, maxX, minZ, maxZ }, SHM,
    // 每格呼叫：樹木遠近切換與風、陰影圖在即時陰影範圍內淡出樹影
    update(cam, t, shadowCenter, shadowR) {
      lodUpdate(lodGroups, cam, t, lodState);
      SHM.maskNear.value.set(shadowCenter.x, shadowCenter.z, shadowR);
    },
  };
}

// ---------------- 材質 ----------------
const NOISE = `
float wh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float wn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix(mix(wh(i), wh(i + vec2(1, 0)), u.x), mix(wh(i + vec2(0, 1)), wh(i + vec2(1, 1)), u.x), u.y); }
float wf(vec2 p){ return wn(p) * 0.55 + wn(p * 2.03 + 7.1) * 0.28 + wn(p * 4.1 + 3.3) * 0.17; }
`;
function terrainMaterial(t, theme, SHM) {
  const mat = new THREE.MeshStandardMaterial({ map: t.gA, roughness: 1, metalness: 0 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { mapB: { value: t.gB }, mapR: { value: t.gR }, norA: { value: t.nA }, norB: { value: t.nB }, norR: { value: t.nR }, armA: { value: t.aA }, armR: { value: t.aR } });
    sh.vertexShader = 'varying vec3 vWP; varying vec3 vWN;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = 'varying vec3 vWP; varying vec3 vWN; uniform sampler2D mapB, mapR, norA, norB, norR, armA, armR;\n' + NOISE + sh.fragmentShader
      .replace('#include <map_fragment>', `
        const mat2 RT = mat2(0.799, 0.602, -0.602, 0.799);
        vec2 uv1 = vWP.xz / 5.0, uv2 = RT * vWP.xz / 7.1 + 0.37, uvR = vWP.xz / 9.0;
        float hm = smoothstep(0.3, 0.7, wf(vWP.xz * 0.05 + 4.0));
        float gm = smoothstep(0.45, 0.65, wf(vWP.xz * 0.012) + (wn(vWP.xz * 0.2) - 0.5) * 0.15);
        float slope = 1.0 - vWN.y;
        float rm = smoothstep(${theme === 'canyon' ? '0.18, 0.32' : '0.26, 0.42'}, slope);
        vec3 cA = mix(texture2D(map, uv1).rgb, texture2D(map, uv2).rgb, hm);
        vec3 cB = mix(texture2D(mapB, uv1).rgb, texture2D(mapB, uv2).rgb, hm);
        // 側面的岩壁用三軸投影避免拉伸
        vec3 an = abs(vWN); an /= (an.x + an.y + an.z);
        vec3 cR = texture2D(mapR, vWP.zy / 7.0).rgb * an.x + texture2D(mapR, uvR).rgb * an.y + texture2D(mapR, vWP.xy / 7.0).rgb * an.z;
        vec3 col = mix(mix(cA, cB, gm), cR, rm);
        // 遠處的大尺度色塊變化
        col *= 0.82 + 0.36 * wf(vWP.xz * 0.004 + 9.0);
        float arm = mix(texture2D(armA, uv1).g, texture2D(armR, uvR).g, rm);
        diffuseColor *= vec4(col, 1.0);`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = clamp(arm, 0.6, 1.0);')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = 0.0;')
      .replace('#include <normal_fragment_maps>', `
        vec3 tn = mix(mix(texture2D(norA, uv1).xyz, texture2D(norB, uv1).xyz, gm), texture2D(norR, uvR).xyz, rm) * 2.0 - 1.0;
        vec3 up = normalize(vWN), tx = normalize(cross(vec3(0.0, 0.0, 1.0), up)), tz = cross(up, tx);
        normal = normalize((viewMatrix * vec4(normalize(tx * tn.x + tz * -tn.y + up * tn.z * 1.6), 0.0)).xyz);`);
  };
  addMask(mat, SHM);
  return mat;
}
function roadMaterial(d, nrm, arm, total, SHM) {
  const mat = new THREE.MeshStandardMaterial({ map: d, roughness: 1, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { norT: { value: nrm }, armT: { value: arm }, total: { value: total } });
    sh.vertexShader = 'varying vec2 vRoad;\n' + sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n vRoad = uv;');
    sh.fragmentShader = 'varying vec2 vRoad; uniform sampler2D norT, armT; uniform float total;\n' + NOISE + sh.fragmentShader
      .replace('#include <map_fragment>', `
        float o = vRoad.x, s = vRoad.y;
        vec2 ruv = vec2(o / 4.0, s / 4.0);
        vec3 c = texture2D(map, ruv).rgb;
        c *= 0.86 + 0.24 * wf(vec2(o * 0.15, s * 0.02));
        // 輪胎磨亮的兩條行車軌跡
        float lane = 1.0 - smoothstep(0.0, 0.6, abs(abs(o) - 2.75 + 0.0) - 0.35);
        c *= 1.0 - 0.06 * lane;
        float ao = abs(o);
        // 路肩：碎石與灰塵
        float shoulder = smoothstep(${HW + 0.15}, ${HW + 0.35}, ao);
        c = mix(c, c * vec3(1.18, 1.12, 1.02) + 0.04, shoulder);
        // 白色邊線與中央虛線
        float edge = smoothstep(0.012, 0.0, abs(ao - ${HW - 0.18}) - 0.075);
        float dash = step(fract(s / 9.0), 0.36) * smoothstep(0.012, 0.0, abs(o) - 0.06);
        // 起點線（黑白格）
        float sl = step(mod(s + 1.0, total), 2.4);
        float ck = mod(floor(o / 0.6) + floor(s / 0.6), 2.0);
        vec3 paint = vec3(0.86, 0.85, 0.80) * (0.88 + 0.12 * wn(vec2(o, s) * 3.0));
        c = mix(c, paint, max(edge, dash) * 0.9);
        c = mix(c, vec3(ck * 0.85 + 0.05), sl * step(ao, ${HW}));
        float paintMask = max(max(edge, dash), sl);
        diffuseColor *= vec4(c, 1.0);`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mix(clamp(texture2D(armT, ruv).g * 1.05, 0.5, 1.0), 0.55, paintMask);')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = 0.0;')
      .replace('#include <normal_fragment_maps>', `
        vec3 tn = texture2D(norT, ruv).xyz * 2.0 - 1.0; tn.xy *= 0.8 * (1.0 - paintMask * 0.7);
        normal = normalize(normal + (viewMatrix * vec4(tn.x, 0.0, -tn.y, 0.0)).xyz * 0.6);`);
  };
  addMask(mat, SHM);
  return mat;
}
// ---------------- 烘焙陰影圖 ----------------
// 把整個地形的「太陽是否被山擋住」「樹影」「樹下環境遮蔽」烘成一張貼圖（R：地形、G：樹影、B：遮蔽）
// 即時陰影只涵蓋車子周圍幾十公尺，遠處的山影與樹影靠這張圖
function bakeShadowMask({ gx0, gz0, gw, gd, terrainH, sunDir, trees, rocks, mobile }) {
  const N = mobile ? 512 : 1024, cx = gw / N, cz = gd / N;
  const hl = Math.hypot(sunDir.x, sunDir.z) || 1e-3, dx = sunDir.x / hl, dz = sunDir.z / hl, tanE = sunDir.y / hl;
  let maxH = -Infinity; for (let j = 0; j < N; j += 4) for (let i = 0; i < N; i += 4) maxH = Math.max(maxH, terrainH(gx0 + i * cx, gz0 + j * cz));
  const data = new Uint8Array(N * N * 4);
  const step0 = Math.min(cx, cz);
  for (let j = 0; j < N; j++) {
    const z = gz0 + (j + 0.5) * cz;
    for (let i = 0; i < N; i++) {
      const x = gx0 + (i + 0.5) * cx, h0 = terrainH(x, z) + 0.4;
      let lit = 1, d = step0;
      while (d < 1400) {
        const y = h0 + d * tanE;
        if (y > maxH) break;
        const gap = y - terrainH(x + dx * d, z + dz * d);
        // 柔和的半影：越遠越寬
        lit = Math.min(lit, clamp(gap / (0.6 + d * 0.025) + 0.5, 0, 1));
        if (lit <= 0) break;
        d += Math.max(step0, d * 0.07);
      }
      const k = (j * N + i) * 4; data[k] = lit * 255; data[k + 1] = 255; data[k + 2] = 255; data[k + 3] = 255;
    }
  }
  // 樹影與遮蔽：在畫布上畫柔邊橢圓
  const cS = document.createElement('canvas'), cA = document.createElement('canvas');
  cS.width = cS.height = cA.width = cA.height = N;
  const gS = cS.getContext('2d'), gA = cA.getContext('2d');
  const blob = (g, x, z, r, stretch, ang, a) => {
    const px = (x - gx0) / cx, pz = (z - gz0) / cz, pr = r / cx;
    if (pr < 0.4) return;
    g.save(); g.translate(px, pz); g.rotate(ang); g.scale(stretch, 1);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, pr);
    gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(0.55, `rgba(0,0,0,${a * 0.8})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, pr, 0, Math.PI * 2); g.fill(); g.restore();
  };
  const ang = Math.atan2(dz / cz, dx / cx), stretch = Math.min(3, 1 / Math.max(0.33, Math.sin(Math.atan(tanE))));
  for (const t of trees) {
    const off = Math.min(70, t.hc / tanE);
    blob(gS, t.x - dx * off, t.z - dz * off, t.rc, stretch, ang, 0.72);
    blob(gA, t.x, t.z, t.rc * 0.95, 1, 0, 0.42);
  }
  for (const [x, , z, r, h] of rocks) { const off = Math.min(30, h * 0.5 / tanE); blob(gS, x - dx * off, z - dz * off, r, stretch, ang, 0.5); blob(gA, x, z, r * 1.3, 1, 0, 0.3); }
  const ps = gS.getImageData(0, 0, N, N).data, pa = gA.getImageData(0, 0, N, N).data;
  for (let k = 0; k < N * N; k++) { data[k * 4 + 1] = 255 - ps[k * 4 + 3]; data[k * 4 + 2] = 255 - pa[k * 4 + 3]; }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true;
  return t;
}

// 讓材質使用烘焙陰影圖：只擋直射陽光（環境光另外乘遮蔽）。trees：是否套用樹影與樹下遮蔽
export function addMask(mat, SHM, { trees = true, custom = false } = {}) {
  if (!mat || mat.userData.masked) return;
  mat.userData.masked = true;
  const prev = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey.call(mat);
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev.call(mat, sh, r);
    Object.assign(sh.uniforms, SHM);
    sh.vertexShader = 'varying vec3 vMWP;\n' + (custom ? sh.vertexShader : sh.vertexShader.replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
      #ifdef USE_INSTANCING
        vMWP = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
      #else
        vMWP = (modelMatrix * vec4(transformed, 1.0)).xyz;
      #endif`));
    sh.fragmentShader = 'varying vec3 vMWP; uniform sampler2D shMask; uniform vec4 maskXf; uniform vec3 maskNear;\n' + sh.fragmentShader.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
      {
        vec4 mk = texture2D(shMask, (vMWP.xz - maskXf.xy) * maskXf.zw);
        float nf = smoothstep(maskNear.z * 0.7, maskNear.z, max(abs(vMWP.x - maskNear.x), abs(vMWP.z - maskNear.y)));
        float vis = mk.r * mix(1.0, mk.g, nf * ${trees ? '1.0' : '0.0'});
        reflectedLight.directDiffuse *= vis; reflectedLight.directSpecular *= vis;
        float ao = mix(1.0, mk.b, ${trees ? '1.0' : '0.0'}) * mix(0.9, 1.0, mk.r);
        reflectedLight.indirectDiffuse *= ao; reflectedLight.indirectSpecular *= mix(1.0, ao, 0.6);
      }`);
  };
  mat.customProgramCacheKey = () => prevKey + '|mask' + trees + custom;
  mat.needsUpdate = true;
}

// ---------------- 樹林 ----------------
const WIND = { value: 0 };
// 葉子的透光：逆光時亮起來（太陽方向與顏色由各賽道設定）
const FOL = { uSunW: { value: new THREE.Vector3(0, 1, 0) }, uSunC: { value: new THREE.Color(1, 1, 1) } };
const FOL_DECL = 'uniform vec3 uSunW; uniform vec3 uSunC;\n';
const TRANSLUCENT = `#include <lights_fragment_end>
  {
    vec3 Vw = normalize(cameraPosition - vMWP);
    float bl = pow(max(0.0, dot(-Vw, uSunW)), 2.5);
    reflectedLight.indirectDiffuse += diffuseColor.rgb * uSunC * (0.04 + 0.26 * bl);
  }`;
async function buildForest(species, { tryPos, R, scale, mobile, scene, SHM }) {
  const NEAR = mobile ? 85 : 150;
  const trees = [], groups = [];
  for (const sp of species) {
    const [g, img] = await Promise.all([glb(`props/${sp.file}.glb`), tex(`props/${sp.img}`, true)]);
    const list = [];
    for (let k = 0; k < sp.count * scale; k++) {
      const p = tryPos(sp.d[0], sp.d[1], 4); if (!p) continue;
      const s = sp.s[0] + R() * (sp.s[1] - sp.s[0]), rot = R() * Math.PI * 2;
      const m = new THREE.Matrix4().compose(new THREE.Vector3(p[0], p[1] - 0.15, p[2]), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot), new THREE.Vector3(s, s, s));
      const b = new THREE.Matrix4().makeScale(sp.size * s, sp.size * s, sp.size * s).setPosition(p[0], p[1] - 0.15, p[2]);
      const t = { x: p[0], y: p[1], z: p[2], m, b, hc: sp.size * s * 0.55, rc: sp.size * s * 0.3 };
      list.push(t); trees.push(t);
    }
    const parts = [];
    g.scene.traverse((o) => {
      if (!o.isMesh) return;
      const mat = o.material, leaf = o.name === 'foliage' || /foliage/.test(mat.name);
      if (leaf) {
        o.geometry.computeBoundingBox();
        const H = o.geometry.boundingBox.max.y, amp = (H * 0.011).toFixed(4);
        mat.onBeforeCompile = (sh) => {
          sh.uniforms.uWind = WIND;
          sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
            {
              float ph = instanceMatrix[3][0] * 0.071 + instanceMatrix[3][2] * 0.053;
              float w = pow(max(0.0, position.y) / ${H.toFixed(3)}, 1.6);
              transformed.x += (sin(uWind * 1.3 + ph) * 0.6 + sin(uWind * 3.3 + ph * 2.0 + position.x * 0.7) * 0.3) * w * ${amp};
              transformed.z += (cos(uWind * 1.1 + ph) * 0.45 + sin(uWind * 2.9 + position.z * 0.7) * 0.25) * w * ${amp};
            }`);
          // 葉片卡雙面都用朝外的法線，背面才不會變黑
          Object.assign(sh.uniforms, FOL);
          sh.fragmentShader = FOL_DECL + sh.fragmentShader.replace('#include <normal_fragment_begin>', 'float faceDirection = 1.0; vec3 normal = normalize(vNormal); vec3 nonPerturbedNormal = normal;').replace('#include <lights_fragment_end>', TRANSLUCENT);
        };
        mat.customProgramCacheKey = () => 'foliage' + H;
        mat.side = THREE.DoubleSide;
        if (!mat.userData.tinted) { mat.userData.tinted = true; mat.color.multiplyScalar(1.25); }
      } else mat.side = THREE.FrontSide;
      addMask(mat, SHM, { trees: false });
      const im = new THREE.InstancedMesh(o.geometry, mat, Math.max(1, list.length));
      im.count = 0; im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
      scene.add(im); parts.push(im);
    });
    const bb = billboards(img, list.length, SHM);
    scene.add(bb);
    groups.push({ list, parts, bb, near: NEAR, back: 45 });
  }
  return { trees, groups };
}

// 依鏡頭距離決定每組物件要畫哪些（每移動 3 公尺或 0.4 秒更新一次）；有看板的組，遠處改畫看板
const _fw = new THREE.Vector3();
function lodUpdate(groups, cam, t, st) {
  WIND.value = t;
  const cp = cam.position;
  if (Math.hypot(cp.x - st.x, cp.z - st.z) < 3 && t - st.t < 0.4 && t >= st.t) return;
  st.x = cp.x; st.z = cp.z; st.t = t;
  cam.getWorldDirection(_fw);
  for (const G of groups) {
    let n = 0, f = 0;
    const N2 = G.near * G.near, bA = G.bb && G.bb.instanceMatrix.array;
    for (const tr of G.list) {
      const ex = tr.x - cp.x, ez = tr.z - cp.z, d2 = ex * ex + ez * ez;
      if (d2 < N2) {
        // 鏡頭後方較遠的不畫（近處保留，影子需要）
        if (d2 > G.back * G.back && ex * _fw.x + ez * _fw.z < -0.2 * Math.sqrt(d2)) continue;
        for (const im of G.parts) im.instanceMatrix.array.set(tr.m.elements, n * 16);
        n++;
      } else if (bA) { bA.set(tr.b.elements, f * 16); f++; }
    }
    for (const im of G.parts) { im.count = n; im.instanceMatrix.needsUpdate = true; }
    if (G.bb) { G.bb.count = f; G.bb.instanceMatrix.needsUpdate = true; }
  }
}

// 看板樹：繞 Y 軸轉向鏡頭；法線依看板上的位置彎成球面，光影才有體積感
function billboards(t, max, SHM) {
  const g = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  const mat = new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.9 });
  mat.color.setScalar(1.2);
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = 'varying vec3 vBR; varying vec3 vBC; varying vec2 vBP;\n' + sh.vertexShader.replace('#include <project_vertex>', `
      vec4 ip = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      float sc = length(instanceMatrix[0].xyz);
      vec3 toCam = cameraPosition - ip.xyz; toCam.y = 0.0; toCam = normalize(toCam);
      vec3 rgt = vec3(toCam.z, 0.0, -toCam.x);
      vec3 wp = ip.xyz + rgt * position.x * sc + vec3(0.0, position.y * sc, 0.0);
      vMWP = wp; vBR = rgt; vBC = toCam; vBP = position.xy;
      vec4 mvPosition = viewMatrix * vec4(wp, 1.0);
      gl_Position = projectionMatrix * mvPosition;`);
    sh.fragmentShader = 'varying vec3 vBR; varying vec3 vBC; varying vec2 vBP;\n' + sh.fragmentShader.replace('#include <normal_fragment_begin>', `
      float faceDirection = 1.0;
      vec3 nW = normalize(vBR * vBP.x * 1.5 + vec3(0.0, 1.0, 0.0) * (vBP.y - 0.45) * 1.1 + vBC * 0.75);
      vec3 normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz); vec3 nonPerturbedNormal = normal;`).replace('#include <lights_fragment_end>', TRANSLUCENT);
    sh.fragmentShader = FOL_DECL + sh.fragmentShader;
    Object.assign(sh.uniforms, FOL);
  };
  mat.customProgramCacheKey = () => 'billboard';
  addMask(mat, SHM, { trees: false, custom: true });
  const im = new THREE.InstancedMesh(g, mat, Math.max(1, max));
  im.count = 0;
  im.frustumCulled = false;
  return im;
}
