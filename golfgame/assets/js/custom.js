// 自製球場：管理員畫的球洞草稿、發布的自製球場、修改過的現有球洞
//   資料存在 Google 試算表的「自製球場」工作頁（gas/Code.gs 的 customList / customGet / customSave / customDelete）；
//   玩家第一次打某座自製球場（或載入有修改過的球洞的球場）才下載，之後存在手機的快取裡（更新時間變了才重新下載）
import { call, session } from './api.js';
import { registerCourse, setMapsHook, COURSES, resetCourseMaps } from './courses.js';
import { YD } from './util.js';

// ---------------- 草稿的格式（編輯器內部用）----------------
// { id, name, par, note, mpp, w, h,
//   rle      地面類別（0 界外、1 長草、2 球道、3 果嶺、4 梯台、5 沙坑、6 水、7 車道、8 深草 / 樹林、9 果嶺邊），列優先，跟遊戲描圖地圖同一種編碼
//   forest   哪些格子要種樹（0 / 1，同樣的 RLE 編碼；深草只有種樹的地方才是樹林）
//   hg       { cell, w, h, z }  地形高低：每 cell 公尺一格，z = 壓縮過的公寸值
//   tees     { black: [x, y], blue, white, red }  格子座標（像素）
//   pin      [x, y]   旗桿     via [[x, y]…] 攻略線的轉折點     trees [[x, y]…] 單棵樹
//   src      { course, idx }  修改現有球洞時：原本是哪座球場的第幾洞 }
export const CLASS = [
  { id: 0, name: '界外', color: [214, 205, 186] },
  { id: 1, name: '長草', color: [104, 150, 66] },
  { id: 2, name: '球道', color: [150, 200, 92] },
  { id: 3, name: '果嶺', color: [176, 226, 120] },
  { id: 4, name: '梯台', color: [196, 232, 150] },
  { id: 5, name: '沙坑', color: [238, 226, 186] },
  { id: 6, name: '水', color: [72, 150, 210] },
  { id: 7, name: '車道', color: [190, 176, 160] },
  { id: 8, name: '深草', color: [64, 104, 46] },
  { id: 9, name: '果嶺邊', color: [160, 214, 106] },
];
export const NEW_W_M = 360, NEW_H_M = 640, NEW_MPP = 0.6, HG_CELL = 4;
export const TEE_IDS = ['black', 'blue', 'white', 'red'];
// 樹種（編輯器長按「樹林」或「單棵樹」選）：樹林格子存的是 1 + 編號（1 = 球場預設），單棵樹存在第三個值；遊戲裡照這個種
export const TREE_KINDS = [
  { k: 'auto', name: '球場預設', col: '#2c4a20' }, { k: 'broad', name: '闊葉樹', col: '#3f6b2a' }, { k: 'pine', name: '松樹', col: '#24452a' },
  { k: 'maple', name: '楓樹', col: '#8c3a22' }, { k: 'autumn', name: '秋色樹', col: '#b8742a' }, { k: 'palm', name: '椰子樹', col: '#6f8f3a' },
  { k: 'jungle', name: '熱帶闊葉', col: '#2f7a2e' }, { k: 'sakura', name: '櫻花', col: '#e6a3b8' }, { k: 'birch', name: '白樺', col: '#a8b04a' },
  { k: 'cypress', name: '柏樹', col: '#1d3b28' }, { k: 'jpine', name: '黑松', col: '#284a30' }, { k: 'bamboo', name: '竹子', col: '#7fa04a' },
  { k: 'shrub', name: '灌木', col: '#3a5326' },
];
export const TEE_NAME = { black: '黑梯', blue: '藍梯', white: '白梯', red: '紅梯' };

export function rleEncode(arr, w) {
  const out = [];
  for (let k = 0; k < arr.length;) {
    const c = arr[k]; let n = 1;
    while (k + n < arr.length && arr[k + n] === c && (k + n) % w !== 0) n++;
    out.push(String.fromCharCode(65 + c) + (n > 1 ? n.toString(16) : '')); k += n;
  }
  return out.join('');
}
export function rleDecode(s, n) {
  const g = new Uint8Array(n); let k = 0, p = 0;
  while (k < s.length && p < n) {
    const c = s.charCodeAt(k) - 65; k++;
    let j = k; while (j < s.length && !(s.charCodeAt(j) >= 65 && s.charCodeAt(j) <= 90)) j++;
    const m = j > k ? parseInt(s.slice(k, j), 16) : 1; k = j;
    g.fill(c, p, Math.min(n, p + m)); p += m;
  }
  return g;
}
// 地形：連續的 0 寫成 z<個數>，其他用逗號分隔（公寸）
export function hgEncode(d) {
  const out = []; let z = 0;
  for (const x of d) { const v = Math.round(x); if (!v) { z++; continue; } if (z) { out.push('z' + z); z = 0; } out.push(String(v)); }
  if (z) out.push('z' + z);
  return out.join(',');
}
export function hgDecode(s, n) {
  const d = new Int16Array(n); let p = 0;
  for (const t of (s || '').split(',')) { if (!t) continue; if (t[0] === 'z') p += parseInt(t.slice(1), 10); else d[p++] = parseInt(t, 10); }
  return d;
}

export function newDraft() {
  const w = Math.round(NEW_W_M / NEW_MPP), h = Math.round(NEW_H_M / NEW_MPP);
  const g = new Uint8Array(w * h).fill(8), f = new Uint8Array(w * h).fill(1);
  const hw = Math.ceil(NEW_W_M / HG_CELL) + 1, hh = Math.ceil(NEW_H_M / HG_CELL) + 1;
  return { id: 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: '', par: 4, note: '', mpp: NEW_MPP, w, h,
    rle: rleEncode(g, w), forest: rleEncode(f, w), hg: { cell: HG_CELL, w: hw, h: hh, z: hgEncode(new Int16Array(hw * hh)) },
    tees: {}, pin: null, via: [], trees: [] };
}

// ---------------- 距離 / 標準桿建議 ----------------
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
// 攻略線：黑梯 → 轉折點 → 旗桿（格子座標）
export function routeOf(D) {
  const bt = D.tees.black; if (!bt || !D.pin) return null;
  return [bt, ...(D.via || []), D.pin];
}
// 某個梯台到旗桿沿攻略線的碼數：梯台投影到攻略線上，從那一點量到旗桿
export function yardsFrom(D, p) {
  const r = routeOf(D); if (!r || !p) return null;
  let best = null;
  for (let i = 1; i < r.length; i++) {
    const a = r[i - 1], b = r[i], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
    const q = [a[0] + dx * t, a[1] + dy * t], d = dist(p, q);
    if (!best || d < best.d) best = { d, i, q };
  }
  let L = dist(p, best.q) * 0.25 + dist(best.q, r[best.i]);           // 梯台偏離攻略線的那一段只算一點點（梯台本來就在攻略線附近）
  for (let k = best.i + 1; k < r.length; k++) L += dist(r[k - 1], r[k]);
  if (best.i === 1 && dist(p, r[0]) < 1) L = r.slice(1).reduce((s, q, k) => s + dist(r[k], q), 0);
  return Math.round(L * D.mpp / YD);
}
export function teeYardsOf(D) {
  const o = {};
  for (const t of TEE_IDS) if (D.tees[t]) o[t] = yardsFrom(D, D.tees[t]);
  return o;
}
// USGA 建議的碼數（男子 / 女子），以最後面的梯台判斷
export const PAR_GUIDE = {
  3: { men: [100, 260], women: [80, 220], typical: '一般 130~230 碼' },
  4: { men: [240, 490], women: [200, 420], typical: '一般 330~450 碼' },
  5: { men: [450, 710], women: [370, 600], typical: '一般 480~600 碼' },
};
export function suggestPar(yds) {
  if (!yds) return null;
  return yds <= 250 ? 3 : yds <= 470 ? 4 : 5;
}

// ---------------- 草稿 → 遊戲地圖 ----------------
function greenStats(g, w, h, pin) {
  // 旗桿所在（或最近）的果嶺塊
  const isG = i => g[i] === 3;
  let start = -1, bestD = 1e18;
  for (let i = 0; i < g.length; i += 3) if (isG(i)) { const d = (i % w - pin[0]) ** 2 + ((i / w | 0) - pin[1]) ** 2; if (d < bestD) { bestD = d; start = i; } }
  if (start < 0) return null;
  const seen = new Uint8Array(g.length), st = [start], pts = []; seen[start] = 1;
  while (st.length) {
    const j = st.pop(); pts.push(j); const x = j % w, y = j / w | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy, k = yy * w + xx;
      if (xx >= 0 && yy >= 0 && xx < w && yy < h && !seen[k] && isG(k)) { seen[k] = 1; st.push(k); }
    }
  }
  let gx = 0, gy = 0; for (const j of pts) { gx += j % w; gy += j / w | 0; } gx /= pts.length; gy /= pts.length;
  let sxx = 0, syy = 0, sxy = 0;
  for (const j of pts) { const dx = j % w - gx, dy = (j / w | 0) - gy; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
  sxx /= pts.length; syy /= pts.length; sxy /= pts.length;
  const tr = sxx + syy, det = sxx * syy - sxy * sxy, r = Math.sqrt(Math.max(0, tr * tr / 4 - det));
  return { x: gx, y: gy, l1: tr / 2 + r, l2: tr / 2 - r, ang: 0.5 * Math.atan2(2 * sxy, sxx - syy), n: pts.length };
}

export function draftToMap(D, base = null) {
  const w = D.w, h = D.h, m = D.mpp, g = rleDecode(D.rle, w * h), forest = D.forest ? rleDecode(D.forest, w * h) : null;
  const bt = D.tees.black, rel = p => [+((p[0] - bt[0]) * m).toFixed(2), +((bt[1] - p[1]) * m).toFixed(2)];
  const route = routeOf(D);
  const gs = greenStats(g, w, h, D.pin) || { x: D.pin[0], y: D.pin[1], l1: (14 / m) ** 2 / 4, l2: (12 / m) ** 2 / 4, ang: 0 };
  const green = { c: rel([gs.x, gs.y]), rx: +(Math.sqrt(gs.l2) * 2 * m).toFixed(2), ry: +(Math.sqrt(gs.l1) * 2 * m).toFixed(2), rot: +(-gs.ang).toFixed(3) };
  const tees = {};
  const yb = yardsFrom(D, bt);
  for (const t of TEE_IDS) {
    if (D.tees[t]) { tees[t] = rel(D.tees[t]); continue; }
    // 沒放的梯台：沿攻略線放在黑梯碼數的 95% / 90% / 80%
    const k = { black: 1, blue: 0.95, white: 0.9, red: 0.8 }[t], want = (1 - k) * yb * YD / m;
    let acc = 0, p = route[0];
    for (let i = 1; i < route.length; i++) { const l = dist(route[i - 1], route[i]); if (acc + l >= want) { const f = (want - acc) / l; p = [route[i - 1][0] + (route[i][0] - route[i - 1][0]) * f, route[i - 1][1] + (route[i][1] - route[i - 1][1]) * f]; break; } acc += l; }
    tees[t] = rel(p);
  }
  // 樹：樹林格子裡離打球區 30 公尺內每 7 公尺一棵，加上單棵樹
  const trees = [];
  if (forest) {
    const step = Math.max(1, Math.round(7 / m)), near = Math.round(30 / m);
    const play = new Uint8Array(w * h); for (let i = 0; i < g.length; i++) play[i] = g[i] !== 8 && g[i] !== 0 ? 1 : 0;
    // 每一列 / 每一欄最近的打球區（粗略的距離）：先標出打球區外擴 near 格的範圍
    const nearMask = new Uint8Array(w * h);
    for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (play[y * w + x]) {
      for (let dy = -near; dy <= near; dy += step) for (let dx = -near; dx <= near; dx += step) {
        const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < w && yy < h) nearMask[yy * w + xx] = 1;
      }
      x += step - 2;
    }
    for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
      const jx = Math.min(w - 1, x + ((x * 7 + y * 3) % 5 - 2) * Math.floor(step / 5)), k = y * w + jx;
      if (forest[k] && g[k] === 8 && nearMask[y * w + x]) { const kd = TREE_KINDS[forest[k] - 1]; trees.push(kd && kd.k !== 'auto' ? [...rel([jx, y]), 0, kd.k] : rel([jx, y])); }
    }
  }
  for (const t of D.trees || []) trees.push(t[2] && t[2] !== 'auto' ? [...rel(t), 0, t[2]] : rel(t));      // 單棵樹：第三個值是樹種
  const out = {
    ...(base || {}), hole: D.name || 'H', mpp: m, w, h, origin: rel([0, 0]), rle: D.rle, path: route.map(rel), tees, green, greens: [green], main: 0, trees,
    pin: rel(D.pin), drawn: true, _g: undefined,
  };
  delete out._g;
  if (D.hg) {
    const d = hgDecode(D.hg.z, D.hg.w * D.hg.h);
    if (d.some(v => v)) out.hg = { cell: D.hg.cell, w: D.hg.w, h: D.hg.h, x0: out.origin[0], y0: out.origin[1], d: Array.from(d) };
    else delete out.hg;
  }
  if (out.hg) delete out.elev;
  return out;
}

// ---------------- 遊戲地圖 → 草稿（修改現有球洞）----------------
// 描圖的路線點很密：簡化成幾個轉折點（Douglas–Peucker，誤差 tol 格內）
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  let k = 0, dm = 0;
  for (let i = 1; i < pts.length - 1; i++) { const d = Math.abs((pts[i][0] - a[0]) * dy - (pts[i][1] - a[1]) * dx) / L; if (d > dm) { dm = d; k = i; } }
  if (dm <= tol) return [a, b];
  return [...simplify(pts.slice(0, k + 1), tol).slice(0, -1), ...simplify(pts.slice(k), tol)];
}
export function mapToDraft(map, row, src) {
  const m = map.mpp, w = map.w, h = map.h, ox = map.origin[0], oy = map.origin[1];
  const px = p => [+((p[0] - ox) / m).toFixed(1), +((oy - p[1]) / m).toFixed(1)];
  const g = rleDecode(map.rle, w * h);
  // 原本的樹：每棵樹所在的格子標成樹林（之後轉回遊戲地圖時重新種）；不在深草上的樹當單棵樹
  const forest = new Uint8Array(w * h), single = [];
  for (const t of map.trees || []) {
    const [x, y] = px(t), xi = Math.round(x), yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= w || yi >= h) continue;
    const ki = t[3] ? Math.max(0, TREE_KINDS.findIndex(q => q.k === t[3])) : 0;          // 地圖上的樹有指定樹種（之前在編輯器選的）
    if (g[yi * w + xi] === 8) { const r = Math.round(4 / m); for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const xx = xi + dx, yy = yi + dy; if (xx >= 0 && yy >= 0 && xx < w && yy < h && g[yy * w + xx] === 8) forest[yy * w + xx] = ki + 1; } }
    else single.push(ki ? [x, y, TREE_KINDS[ki].k] : [x, y]);
  }
  const path = map.path || [];
  const pin = map.pin ? px(map.pin) : px(map.green.c);
  const hw = Math.ceil(w * m / HG_CELL) + 1, hh = Math.ceil(h * m / HG_CELL) + 1;
  let hgz = hgEncode(new Int16Array(hw * hh));
  if (map.hg && map.hg.d) { const d = new Int16Array(hw * hh); for (let j = 0; j < Math.min(hh, map.hg.h); j++) for (let i = 0; i < Math.min(hw, map.hg.w); i++) d[j * hw + i] = map.hg.d[j * map.hg.w + i]; hgz = hgEncode(d); }
  const tees = {};
  for (const t of TEE_IDS) if (map.tees && map.tees[t]) tees[t] = px(map.tees[t]);
  return {
    id: 'o_' + src.course + '_' + src.idx, name: src.label || `第 ${src.idx + 1} 洞`, par: row ? row[0] : 4, note: (row && row[5] && row[5].note) || '',
    mpp: m, w, h, rle: map.rle, forest: rleEncode(forest, w), hg: { cell: HG_CELL, w: hw, h: hh, z: hgz },
    tees, pin, via: simplify(path.map(px), 4 / m).slice(1, -1), trees: single, src,
  };
}

// ---------------- 檢查（發布 / 存檔前）----------------
export function checkDraft(D) {
  const errs = [], warns = [];
  const g = rleDecode(D.rle, D.w * D.h), at = p => g[Math.round(p[1]) * D.w + Math.round(p[0])];
  if (!D.tees.black) errs.push('還沒放黑梯（最後面的梯台）');
  if (!D.pin) errs.push('還沒放旗桿');
  if (D.pin && at(D.pin) !== 3) errs.push('旗桿不在果嶺上');
  for (const t of TEE_IDS) if (D.tees[t] && [0, 5, 6, 8].includes(at(D.tees[t]))) errs.push(`${TEE_NAME[t]}在${CLASS[at(D.tees[t])].name}裡`);
  if (!g.some(v => v === 3)) errs.push('沒有畫果嶺');
  const y = D.tees.black && D.pin ? yardsFrom(D, D.tees.black) : null;
  if (y) {
    const G = PAR_GUIDE[D.par];
    if (y < G.men[0] || y > G.men[1]) warns.push(`Par ${D.par} 的黑梯建議 ${G.men[0]}~${G.men[1]} 碼，現在 ${y} 碼（建議改成 Par ${suggestPar(y)}）`);
    if (D.par > 3 && !g.some(v => v === 2)) warns.push('沒有畫球道');
  }
  for (const t of ['blue', 'white', 'red']) {
    const yt = D.tees[t] ? yardsFrom(D, D.tees[t]) : null, yb = y;
    if (yt && yb && yt > yb) warns.push(`${TEE_NAME[t]}比黑梯還遠`);
  }
  return { errs, warns, yards: y };
}

// 發布規則：9 洞（Par 3 / 4 / 5 各 3 洞，標準桿 36）或 18 洞（各 6 洞，標準桿 72）
export function checkPublish(drafts) {
  const n = drafts.length, c = { 3: 0, 4: 0, 5: 0 };
  for (const d of drafts) c[d.par] = (c[d.par] || 0) + 1;
  const need = n === 18 ? 6 : n === 9 ? 3 : 0, errs = [];
  if (!need) errs.push(`要選 9 洞或 18 洞（現在 ${n} 洞）`);
  else for (const p of [3, 4, 5]) if (c[p] !== need) errs.push(`Par ${p} 要 ${need} 洞（現在 ${c[p] || 0} 洞）`);
  return { errs, counts: c, par: drafts.reduce((s, d) => s + d.par, 0) };
}

// ---------------- 伺服器 + 快取 ----------------
export const store = { courses: [], overrides: [], drafts: [], loaded: false };
const CACHE = 'dixen-assets-v1';
async function cached(kind, id, updated) {
  const key = new Request(`./custom-cache/${kind}/${encodeURIComponent(id)}?v=${encodeURIComponent(updated || '')}`);
  try { const c = await caches.open(CACHE); const hit = await c.match(key); if (hit) return hit.json(); } catch (e) { /* 沒有快取也沒關係 */ }
  const r = await call('customGet', { kind, id });
  try { const c = await caches.open(CACHE); await c.put(key, new Response(JSON.stringify(r), { headers: { 'content-type': 'application/json' } })); } catch (e) { /* 存不了就下次再下載 */ }
  return r;
}
export async function getRecord(kind, id) {
  const list = kind === 'course' ? store.courses : kind === 'override' ? store.overrides : store.drafts;
  const meta = list.find(x => x.id === id);
  if (kind === 'draft') return call('customGet', { kind, id });            // 草稿只有管理員在改，不快取
  return cached(kind, id, meta && meta.updated);
}

// 發布的自製球場 → 球場物件（地圖第一次打才下載）
function courseFromMeta(c) {
  let holes = (c.meta.holes || []).map(h => [h.par, h.tees.black, 0, '', h.hcp, { tees: h.tees, note: h.note || '', tip: h.tip || '' }]);
  const nine = holes.length === 9;
  // 9 洞的自製球場打兩輪成 18 洞（差點：第一輪單數、第二輪雙數）
  if (nine) holes = [...holes.map(h => { const x = h.slice(); x[4] = h[4] * 2 - 1; return x; }), ...holes.map(h => { const x = h.slice(); x[4] = h[4] * 2; return x; })];
  return {
    id: c.id, name: c.name, en: 'Custom Course', style: 'parkland', group: 'custom', real: true, desc: c.meta.desc || '管理員自製的球場。',
    stimp: 8, firm: 1.05, altitude: 100, temp: 23, wind: [3, 12], fairwayW: 34, roughW: 16, corridor: 72, trees: 0.7, holes, custom: true,
    loadMaps: async course => {
      const r = await getRecord('course', c.id), m = (r.data.maps || []).map(unpackMap);
      course.maps = nine ? [...m, ...m.map(x => ({ ...x }))] : m;
    },
  };
}
function unpackMap(m) { if (m.hg && typeof m.hg.d === 'string') m.hg.d = Array.from(hgDecode(m.hg.d, m.hg.w * m.hg.h)); return m; }
export function packMap(m) { const o = { ...m }; if (o.hg) o.hg = { ...o.hg, d: hgEncode(o.hg.d) }; delete o._g; return o; }

export const customCourses = () => store.courses.map(c => c.course);
// 球場第 idx 洞（地圖順序）的球洞資料：分區球場的地圖順序（mapsOrder）可能跟 nines 的順序不同
export function rowFor(course, idx) {
  if (course.nines) {
    const order = course.mapsOrder || course.nines.map(n => n.id), nine = course.nines.find(n => n.id === order[Math.floor(idx / 9)]);
    return nine && nine.holes[idx % 9];
  }
  return course.holes[idx];
}

export async function refreshCustom() {
  const r = await call('customList');
  store.courses = (r.courses || []).map(c => ({ ...c, course: courseFromMeta(c) }));
  for (const c of store.courses) registerCourse(c.course);
  store.overrides = r.overrides || [];
  store.drafts = r.drafts || [];
  store.loaded = true;
  return store;
}

// 修改過的現有球洞：球場地圖載入後，把那幾洞換成修改的版本（球洞資料 row 的碼數也一起換）
setMapsHook(async course => {
  if (!store.loaded) { try { await refreshCustom(); } catch (e) { return; } }
  const mine = store.overrides.filter(o => o.id.startsWith(course.id + '#'));
  for (const o of mine) {
    const idx = Number(o.id.split('#')[1]);
    const rec = await getRecord('override', o.id);
    if (!rec || !rec.data || !course.maps[idx]) continue;
    const merged = { ...course.maps[idx], ...rec.data.map }; delete merged._g;          // _g = 解碼過的格子（舊的不能沿用）
    course.maps[idx] = unpackMap(merged);
    const row = rowFor(course, idx), spec = row && row[5];
    if (row && !row._orig) row._orig = { y: row[1], tees: spec && spec.tees ? { ...spec.tees } : null };      // 還原時用
    if (spec && rec.data.tees) { spec.tees = { ...spec.tees, ...rec.data.tees }; row[1] = rec.data.tees.black || row[1]; }
    if (row && !spec && rec.data.tees) row[1] = rec.data.tees.black || row[1];
  }
});

// ---------------- 編輯器的實景預覽 / 試打 ----------------
// 用目前的草稿（不用先存檔）蓋一座只有一洞的暫時球場；修改現有球洞時沿用原球場的設定與真實地形
export const PREVIEW_ID = '_edpreview';
export async function previewCourse(D) {
  const ys = teeYardsOf(D), map = draftToMap(D);
  const tees = { ...ys };
  for (const [k, f] of [['blue', 0.95], ['white', 0.9], ['red', 0.8]]) if (!tees[k] && tees.black) tees[k] = Math.round(tees.black * f);
  let base = { style: 'parkland', stimp: 8, firm: 1.05, altitude: 100, temp: 23, wind: [3, 12], fairwayW: 34, roughW: 16, corridor: 72, trees: 0.7 };
  let hmap = map;
  if (D.src) {
    const course = COURSES.find(c => c.id === D.src.course);
    await import('./courses.js').then(m => m.loadCourseMaps(course));
    const orig = course.maps[D.src.idx];
    hmap = { ...orig, ...draftToMap(D, { elev: orig.elev }) };
    const sx = D.tees.black[0] * D.mpp + orig.origin[0], sy = orig.origin[1] - D.tees.black[1] * D.mpp;
    if (orig.geo) hmap.geo = [orig.geo[0] + sx, orig.geo[1] + sy];
    if (orig.anc) hmap.anc = orig.anc.map(([u, v, hh]) => [u - sx, v - sy, hh]);
    if (orig.sea) hmap.sea = orig.sea.map(([u, v]) => [u - sx, v - sy]);
    const { nines, mapsOrder, holes, maps, _mapsP, _hookP, loadMaps, mapsUrl, ...rest } = course;
    base = rest;
  }
  delete hmap._g;
  const c = {
    ...base, id: PREVIEW_ID, name: D.name || '未命名', en: 'Preview', group: 'custom', real: true, custom: true, preview: true,
    holes: [[D.par, tees.black || 0, 0, '', 1, { tees, note: D.note || '' }]], maps: [hmap],
  };
  c.loadMaps = async course => { course.maps = [hmap]; };
  registerCourse(c);
  return c;
}

// ---------------- 管理員：存檔 / 發布 ----------------
function thumbOf(D) {
  // 草稿清單的小縮圖（60 寬）
  const g = rleDecode(D.rle, D.w * D.h), W = 60, H = Math.round(60 * D.h / D.w), cv = document.createElement('canvas');
  cv.width = W; cv.height = H; const x = cv.getContext('2d'), img = x.createImageData(W, H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const c = CLASS[g[Math.floor(j * D.h / H) * D.w + Math.floor(i * D.w / W)]].color, o = (j * W + i) * 4;
    img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return cv.toDataURL('image/png');
}
export async function saveDraft(D) {
  const chk = checkDraft(D);
  const meta = { par: D.par, yards: teeYardsOf(D), ok: !chk.errs.length, thumb: thumbOf(D), src: D.src || null };
  if (D.src) {
    // 修改現有球洞：直接存成修改版本（遊戲裡馬上生效），不進草稿
    if (chk.errs.length) throw new Error(chk.errs.join('、'));
    const course = COURSES.find(c => c.id === D.src.course);
    await import('./courses.js').then(m => m.loadCourseMaps(course));
    const base = course.maps[D.src.idx];
    const map = packMap(draftToMap(D, { elev: base.elev }));
    // 地圖座標以黑梯為原點：黑梯移動了，真實地形（DEM）的對應位置也要跟著平移
    const sx = D.tees.black[0] * D.mpp + base.origin[0], sy = base.origin[1] - D.tees.black[1] * D.mpp;
    if (base.geo) map.geo = [base.geo[0] + sx, base.geo[1] + sy];
    if (base.anc) map.anc = base.anc.map(([u, v, hh]) => [u - sx, v - sy, hh]);
    if (base.sea) map.sea = base.sea.map(([u, v]) => [u - sx, v - sy]);
    // 碼數：球場卡是量到果嶺中心，移旗桿、改路線都不變；只有梯台移動了，才把球場卡加減梯台前後移動的碼數
    const row = rowFor(course, D.src.idx), cur = (row && row[5] && row[5].tees) || (row ? { black: row[1] } : {}), tees = {};
    const old = mapToDraft(base, row, D.src).tees;
    for (const [k, y] of Object.entries(meta.yards)) {
      if (!cur[k] || !old[k]) { tees[k] = y; continue; }
      const moved = Math.hypot(D.tees[k][0] - old[k][0], D.tees[k][1] - old[k][1]) * D.mpp;
      tees[k] = moved < 1 ? cur[k] : cur[k] + y - yardsFrom(D, old[k]);
    }
    meta.yards = tees;
    const r = await call('customSave', { kind: 'override', id: `${D.src.course}#${D.src.idx}`, name: `${course.name} ${D.name}`, meta, data: { map, tees, draft: D } });
    const i = store.overrides.findIndex(o => o.id === `${D.src.course}#${D.src.idx}`);
    if (i >= 0) store.overrides[i].updated = r.updated; else store.overrides.push({ id: `${D.src.course}#${D.src.idx}`, updated: r.updated });
    // 這座球場已經載入的地圖要重新套用
    resetCourseMaps(course.id);
    return r;
  }
  const r = await call('customSave', { kind: 'draft', id: D.id, name: D.name, meta, data: D });
  const i = store.drafts.findIndex(d => d.id === D.id), rec = { id: D.id, name: D.name, updated: r.updated, meta };
  if (i >= 0) store.drafts[i] = rec; else store.drafts.unshift(rec);
  return r;
}
export async function deleteRecord(kind, id) {
  await call('customDelete', { kind, id });
  if (kind === 'draft') store.drafts = store.drafts.filter(d => d.id !== id);
  if (kind === 'course') store.courses = store.courses.filter(d => d.id !== id);
  if (kind === 'override') {
    store.overrides = store.overrides.filter(d => d.id !== id);
    const c = COURSES.find(x => x.id === id.split('#')[0]);
    if (c) {
      const row = rowFor(c, Number(id.split('#')[1]));
      if (row && row._orig) { row[1] = row._orig.y; if (row[5] && row._orig.tees) row[5].tees = row._orig.tees; delete row._orig; }
      resetCourseMaps(c.id);
    }
  }
}
export async function publish(name, draftIds) {
  const drafts = [];
  for (const id of draftIds) drafts.push((await call('customGet', { kind: 'draft', id })).data);
  const pc = checkPublish(drafts);
  if (pc.errs.length) throw new Error(pc.errs.join('、'));
  for (const d of drafts) { const c = checkDraft(d); if (c.errs.length) throw new Error(`「${d.name || '未命名'}」：${c.errs.join('、')}`); }
  // 差點：依碼數 / 標準桿排（18 洞：前九單數、後九雙數）
  const ys = drafts.map(d => teeYardsOf(d));
  const order = (a, b) => [...Array(b - a).keys()].map(k => k + a).sort((i, j) => ys[j].black / drafts[j].par - ys[i].black / drafts[i].par);
  const hcp = [];
  if (drafts.length === 18) { order(0, 9).forEach((i, r) => (hcp[i] = 2 * r + 1)); order(9, 18).forEach((i, r) => (hcp[i] = 2 * r + 2)); }
  else order(0, 9).forEach((i, r) => (hcp[i] = r + 1));
  const holes = drafts.map((d, i) => {
    const t = { ...ys[i] };
    for (const [k, f] of [['blue', 0.95], ['white', 0.9], ['red', 0.8]]) if (!t[k]) t[k] = Math.round(t.black * f);
    return { par: d.par, tees: t, hcp: hcp[i], note: d.note || '', name: d.name || '' };
  });
  const maps = drafts.map(d => packMap(draftToMap(d)));
  const id = 'custom_' + Date.now().toString(36);
  const meta = { holes, par: pc.par, n: drafts.length, by: session.user, desc: `管理員自製的 ${drafts.length} 洞球場，標準桿 ${pc.par}。` };
  const r = await call('customSave', { kind: 'course', id, name, meta, data: { maps } });
  const rec = { id, name, updated: r.updated, meta };
  rec.course = courseFromMeta(rec); registerCourse(rec.course);
  store.courses.push(rec);
  return rec;
}
