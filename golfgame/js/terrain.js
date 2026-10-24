// 由球場資料生成單洞：中心線、球道、果嶺（含坡度）、沙坑、水障礙、樹木、高度與地面種類
import { makeRng, makeNoise, hashStr, clamp, lerp, rad, YD } from './util.js';
import { SURF } from './physics.js';
import { TEE_SETS } from './courses.js';

const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

const STYLE = {
  links: { macroA: 2.2, macroL: 120, microA: 1.5, microL: 16, edgeRise: 3, potDepth: 0.85, bunkerSize: [3.4, 4.6] },
  parkland: { macroA: 4.5, macroL: 110, microA: 0.6, microL: 28, edgeRise: 9, potDepth: 0.45, bunkerSize: [5, 9] },
  canyon: { macroA: 3.0, macroL: 90, microA: 0.8, microL: 24, edgeRise: 24, potDepth: 0.45, bunkerSize: [4.5, 8] },
  // 奇幻球場：火山地形起伏比較碎；浮島本身平緩（島外是虛空）
  volcanic: { macroA: 4.0, macroL: 90, microA: 1.1, microL: 18, edgeRise: 18, potDepth: 0.5, bunkerSize: [4.5, 8.5] },
  void: { macroA: 2.4, macroL: 120, microA: 0.5, microL: 26, edgeRise: 0, potDepth: 0.5, bunkerSize: [4, 7] },
};

// ---------- 真實球場的描圖地圖（球場官網球道配置圖判讀而來） ----------
// 類別：0 圖外 1 長草 2 球道 3 果嶺 4 發球台 5 沙坑 6 水 7 車道 8 樹下 9 果嶺邊
// 解碼一次後快取：外圍多補 PAD 格空白，順便算好「離畫面內多遠」「沙坑內深度」「水池編號與離水多遠」
const PAD = 40;
function decodeMap(m) {
  if (m._g) return m._g;
  const w0 = m.w, h0 = m.h, W = w0 + PAD * 2, H = h0 + PAD * 2;
  const g = new Uint8Array(W * H);
  let k = 0, row = 0, col = 0;
  const s = m.rle;
  while (k < s.length) {
    const c = s.charCodeAt(k) - 65; k++;
    let j = k; while (j < s.length && s.charCodeAt(j) >= 48 && (s.charCodeAt(j) < 65 || s.charCodeAt(j) > 90)) j++;
    const n = j > k ? parseInt(s.slice(k, j), 16) : 1; k = j;
    for (let t = 0; t < n; t++) { g[(row + PAD) * W + col + PAD] = c; if (++col >= w0) { col = 0; row++; } }
  }
  // 多來源距離（8 鄰居，格數）
  const bfs = (isSrc, pass) => {
    const d = new Float32Array(W * H).fill(1e9), q = new Int32Array(W * H); let qh = 0, qt = 0;
    for (let i = 0; i < W * H; i++) if (isSrc(i)) { d[i] = 0; q[qt++] = i; }
    while (qh < qt) {
      const i = q[qh++], x = i % W, y = (i / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const j = yy * W + xx, nd = d[i] + (dx && dy ? 1.414 : 1);
        if (nd < d[j] && (!pass || pass(j))) { d[j] = nd; q[qt++] = j; }
      }
    }
    return d;
  };
  const outD = bfs(i => g[i] > 0);                     // 離球場畫面內多遠
  const sandD = bfs(i => g[i] !== 5, j => g[j] === 5);   // 沙坑內離邊緣多遠
  const watIn = bfs(i => g[i] !== 6, j => g[j] === 6);   // 水裡離岸多遠
  const watOut = bfs(i => g[i] === 6);                   // 岸上離水多遠
  const greenD = bfs(i => g[i] === 3);                   // 離果嶺多遠（果嶺邊用）
  // 水池分塊
  const wid = new Int16Array(W * H).fill(-1), waters = [];
  for (let i = 0; i < W * H; i++) {
    if (g[i] !== 6 || wid[i] >= 0) continue;
    const id = waters.length, st = [i]; wid[i] = id; let sx = 0, sy = 0, n = 0;
    const cells = [];
    while (st.length) {
      const j = st.pop(), x = j % W, y = (j / W) | 0; sx += x; sy += y; n++; cells.push(j);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const k2 = yy * W + xx; if (g[k2] === 6 && wid[k2] < 0) { wid[k2] = id; st.push(k2); }
      }
    }
    waters.push({ cx: sx / n, cy: sy / n, n, cells });
  }
  // 岸邊屬於哪一個水池：從水往外擴散
  const nearW = new Int16Array(W * H).fill(-1);
  { const q = []; for (let i = 0; i < W * H; i++) if (wid[i] >= 0) { nearW[i] = wid[i]; q.push(i); }
    for (let h = 0; h < q.length; h++) { const i = q[h], x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const j = yy * W + xx; if (nearW[j] < 0 && watOut[j] < 12) { nearW[j] = nearW[i]; q.push(j); } } } }
  // 果嶺分塊（有左右兩個果嶺的洞）
  const gid = new Int16Array(W * H).fill(-1), gcent = [];
  for (let i = 0; i < W * H; i++) {
    if (g[i] !== 3 || gid[i] >= 0) continue;
    const id = gcent.length, st = [i]; gid[i] = id; let sx = 0, sy = 0, n = 0;
    while (st.length) {
      const j = st.pop(), x = j % W, y = (j / W) | 0; sx += x; sy += y; n++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const k2 = yy * W + xx; if (g[k2] === 3 && gid[k2] < 0) { gid[k2] = id; st.push(k2); } }
    }
    gcent.push([sx / n, sy / n]);
  }
  m._g = { g, W, H, outD, sandD, watIn, watOut, greenD, wid, nearW, waters, gid, gcent,
    u0: m.origin[0] - PAD * m.mpp, v0: m.origin[1] + PAD * m.mpp, mpp: m.mpp };
  return m._g;
}

export function buildHole(course, holeIdx, opts = {}) {
  // 第 6 個欄位（spec）= 真實球場的逐洞細節：各梯台碼數、狗腿位置、沙坑 / 水池 / OB 的實際位置、高低起伏、果嶺坡度…
  // 沒有 spec 的洞照原本的特徵代號隨機產生
  const [par, yards, bend, feat, hcp, spec = null] = course.holes[holeIdx];
  const F = new Set(feat.split(/\s+/));
  // 有描圖地圖的洞：路線、地面、沙坑、水、果嶺、發球台、樹都照地圖
  const map = course.maps && course.maps[holeIdx] ? course.maps[holeIdx] : null;
  const MG = map ? decodeMap(map) : null;
  // 左右兩個果嶺：每回合依旗桿種子選一個（另一個當果嶺邊短草）
  const mapGreens = map ? (map.greens && map.greens.length ? map.greens : [map.green]) : null;
  const gIdx = mapGreens && mapGreens.length > 1 ? (((opts.pinSeed || 0) % mapGreens.length) + mapGreens.length) % mapGreens.length : 0;
  const mapGreen = mapGreens ? mapGreens[gIdx] : null;
  let activeGid = -1;
  if (MG && MG.gcent.length) {
    const cx = (mapGreen.c[0] - MG.u0) / MG.mpp, cy = (MG.v0 - mapGreen.c[1]) / MG.mpp;
    let best = 1e18; MG.gcent.forEach(([x, y], k) => { const d = (x - cx) ** 2 + (y - cy) ** 2; if (d < best) { best = d; activeGid = k; } });
  }
  const cellAt = (u, v) => {
    const i = Math.round((u - MG.u0) / MG.mpp), j = Math.round((MG.v0 - v) / MG.mpp);
    return (i < 0 || j < 0 || i >= MG.W || j >= MG.H) ? -1 : j * MG.W + i;
  };
  const seed = hashStr(course.id + ':' + holeIdx);
  const rng = makeRng(seed);
  const nz = makeNoise(seed), nz2 = makeNoise(seed + 911), nz3 = makeNoise(seed + 3301);
  const st = STYLE[course.style];
  const L = yards * YD;
  const canyon = course.style === 'canyon', links = course.style === 'links', park = course.style === 'parkland';
  // 奇幻主題（只改外觀與地形配置，物理照舊）：jungle 叢林、lava 熔岩（熔岩 = 水障礙）、void 浮島（虛空 = 峽谷）
  const theme = course.theme || null, isVoid = theme === 'void';

  // ---------- 1. 中心線 ----------
  const raw = [[0, 0]];
  let h = rad((rng() - 0.5) * 6);
  const legs = [];
  // 真實球場的距離都是從白梯（一般男士梯）量起
  const whiteOff = spec ? L - spec.tees.white * YD : 0;
  if (spec && par >= 4 && spec.bendAt != null) {
    const b1 = whiteOff + spec.bendAt * YD;
    if (spec.bend2At != null) {
      const b2 = whiteOff + spec.bend2At * YD;
      legs.push([b1, h], [b2 - b1, h + rad(bend)], [L - b2, h + rad(bend + spec.bend2)]);
    } else legs.push([b1, h], [L - b1, h + rad(bend)]);
  } else if (par === 3) legs.push([L, h + rad(bend + (spec ? 0 : (rng() - 0.5) * 6))]);
  else if (par === 4) {
    const c = clamp(L * 0.6, 200, 255);
    legs.push([c, h], [L - c, h + rad(bend)]);
  } else {
    const c1 = clamp(L * 0.45, 220, 265), c2 = clamp(L * 0.3, 140, 190);
    const s2 = rng() < 0.5 ? -0.6 : 0.5;
    legs.push([c1, h], [c2, h + rad(bend)], [L - c1 - c2, h + rad(bend + bend * s2)]);
  }
  if (map) { raw.length = 0; for (const p of map.path) raw.push([p[0], p[1]]); legs.length = 0; }
  for (const [len, hd] of legs) {
    const [pu, pv] = raw[raw.length - 1];
    const n = Math.ceil(len / 2);
    for (let i = 1; i <= n; i++) raw.push([pu + Math.sin(hd) * len * i / n, pv + Math.cos(hd) * len * i / n]);
  }
  // 平滑轉角（移動平均 ±18 m；描圖路線已經平滑過）
  const W = map ? 0 : 9;
  const P = raw.map((_, i) => {
    let su = 0, sv = 0, c = 0;
    for (let k = -W; k <= W; k++) { const p = raw[clamp(i + k, 0, raw.length - 1)]; su += p[0]; sv += p[1]; c++; }
    return [su / c, sv / c];
  });
  P[0] = [0, 0];
  // 每 6 m 取一點
  const path = [P[0]];
  for (let i = map ? 1 : 3; i < P.length; i += map ? 1 : 3) path.push(P[i]);
  if (path[path.length - 1] !== P[P.length - 1]) path.push(P[P.length - 1]);
  const S = [0];
  for (let i = 1; i < path.length; i++) S.push(S[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  const Lp = S[S.length - 1];
  const dirAt = s => {
    let i = 1;
    while (i < S.length - 1 && S[i] < s) i++;
    const a = path[i - 1], b = path[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  };
  const pointAt = s => {
    s = clamp(s, 0, Lp);
    let i = 1;
    while (i < S.length - 1 && S[i] < s) i++;
    const t = (s - S[i - 1]) / (S[i] - S[i - 1] || 1);
    return [lerp(path[i - 1][0], path[i][0], t), lerp(path[i - 1][1], path[i][1], t)];
  };

  let atY = y => clamp(Lp - (spec ? spec.tees.white * YD : L) + y * YD, 0, Lp);   // 距白梯 y 碼的位置

  // ---------- 範圍與最近點加速格 ----------
  const corridor = course.corridor;
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  for (const [u, v] of path) { minU = Math.min(minU, u); maxU = Math.max(maxU, u); minV = Math.min(minV, v); maxV = Math.max(maxV, v); }
  const pad = corridor + 70;
  const bbox = map
    ? { minU: Math.min(minU, MG.u0) - 70, maxU: Math.max(maxU, MG.u0 + MG.W * MG.mpp) + 70, minV: Math.min(minV, MG.v0 - MG.H * MG.mpp) - 50, maxV: Math.max(maxV, MG.v0) + 70 }
    : { minU: minU - pad, maxU: maxU + pad, minV: minV - 90, maxV: maxV + 110 };
  const CELL = 6;
  const gw = Math.ceil((bbox.maxU - bbox.minU) / CELL) + 1, gh = Math.ceil((bbox.maxV - bbox.minV) / CELL) + 1;
  const segIdx = new Int16Array(gw * gh);
  const segDist2 = (u, v, i) => {
    const a = path[i], b = path[i + 1];
    const ex = b[0] - a[0], ey = b[1] - a[1];
    const l2 = ex * ex + ey * ey || 1;
    const t = clamp(((u - a[0]) * ex + (v - a[1]) * ey) / l2, 0, 1);
    const qx = a[0] + ex * t - u, qy = a[1] + ey * t - v;
    return [qx * qx + qy * qy, t];
  };
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const u = bbox.minU + i * CELL, v = bbox.minV + j * CELL;
    let best = 1e18, bi = 0;
    for (let k = 0; k < path.length - 1; k++) { const d = segDist2(u, v, k)[0]; if (d < best) { best = d; bi = k; } }
    segIdx[j * gw + i] = bi;
  }
  // 回傳 s（沿中心線距離）、d（橫向距離，右正）
  const near = (u, v) => {
    const gi = clamp(Math.round((u - bbox.minU) / CELL), 0, gw - 1), gj = clamp(Math.round((v - bbox.minV) / CELL), 0, gh - 1);
    const c = segIdx[gj * gw + gi];
    let best = 1e18, bi = c, bt = 0;
    for (let k = Math.max(0, c - 4); k <= Math.min(path.length - 2, c + 4); k++) {
      const [d2, t] = segDist2(u, v, k);
      if (d2 < best) { best = d2; bi = k; bt = t; }
    }
    const a = path[bi], b = path[bi + 1];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const du = (b[0] - a[0]) / l, dv = (b[1] - a[1]) / l;
    let s = S[bi] + bt * l;
    const ru = dv, rv = -du;
    const d = (u - a[0]) * ru + (v - a[1]) * rv;
    if (bt === 0 && bi === 0) s = (u - a[0]) * du + (v - a[1]) * dv;
    if (bt === 1 && bi === path.length - 2) s = Lp + (u - b[0]) * du + (v - b[1]) * dv;
    return { s, d };
  };

  // ---------- 2. 球道寬度、高低差 ----------
  const fwBase = course.fairwayW * (F.has('tr') ? 0.85 : 1);
  const fwHalf = (s, side) => fwBase / 2 * (1 + 0.14 * nz(s * 0.018, side * 3.1) + 0.06 * nz(s * 0.07, side * 7.7));
  const elevTotal = F.has('UP') ? 14 : F.has('DN') ? -14 : F.has('up') ? 6 : F.has('dn') ? -6 : (rng() - 0.5) * 3;
  // spec.elev = [[距白梯碼數, 相對發球台高度(公尺)], …]，中間平滑內插（例如開球下坡、第二桿上坡）
  // 起伏來源：逐洞描述（spec.elev）優先，沒有的話用描圖地圖附的實際地形高程（map.elev）
  const elevSrc = spec && spec.elev ? spec.elev : map && map.elev ? map.elev : null;
  const elevPts = elevSrc ? (elevSrc[0] && elevSrc[0][0] === 0 ? elevSrc : [[0, 0], ...elevSrc]).map(([y, m]) => [atY(y), m]) : null;
  const baseElev = !elevPts ? s => elevTotal * ss(0, Lp, s) : s => {
    if (s <= elevPts[0][0]) return elevPts[0][1];
    for (let i = 1; i < elevPts.length; i++) {
      const [s1, m1] = elevPts[i];
      if (s <= s1) { const [s0, m0] = elevPts[i - 1]; return lerp(m0, m1, ss(s0, s1, s)); }
    }
    return elevPts[elevPts.length - 1][1];
  };

  // ---------- 3. 果嶺 ----------
  const G = map ? mapGreen.c.slice() : path[path.length - 1];
  const endDir = dirAt(Lp);
  const sg = spec && spec.green || {};
  // 地圖模式：果嶺中心、長短軸、方向都照描圖（rot 是影像座標的角度）
  const gRot = map ? Math.PI / 2 - mapGreen.rot : Math.atan2(endDir[0], endDir[1]) + rad(spec ? (sg.rot || 0) : (rng() - 0.5) * 50);
  // sg.size = [寬, 長]（碼）
  const grx = map ? mapGreen.rx : sg.size ? sg.size[0] * YD / 2 : (par === 3 ? 10.5 : 11) + rng() * 2;
  const gry = map ? mapGreen.ry : sg.size ? sg.size[1] * YD / 2 : (par === 3 ? 11 : 11.5) + rng() * 2;
  const gPh = [rng() * 6.28, rng() * 6.28];
  const gLocal = (u, v) => {
    const du = u - G[0], dv = v - G[1];
    const c = Math.cos(gRot), s = Math.sin(gRot);
    return [du * c - dv * s, du * s + dv * c]; // [橫向, 縱深]
  };
  const greenR = (u, v) => {
    const [lu, lv] = gLocal(u, v);
    const th = Math.atan2(lv, lu);
    return Math.hypot(lu / grx, lv / gry) * (1 + 0.07 * Math.sin(3 * th + gPh[0]) + 0.045 * Math.sin(5 * th + gPh[1]));
  };
  const fringeR = 1 + 2.2 / Math.min(grx, gry);
  // sg.slope = 前低後高的坡度（例如 0.022 = 2.2%），sg.side = 左右坡度（正 = 右高），sg.tier = 前後雙層
  const slopeBack = sg.slope ?? 0.008 + rng() * 0.01, slopeSide = sg.side ?? (rng() - 0.5) * 0.014;
  const bumps = [];
  const nb = 1 + (rng() < 0.5 ? 1 : 0);
  for (let i = 0; i < nb; i++) bumps.push({ lu: (rng() - 0.5) * grx * 1.2, lv: (rng() - 0.5) * gry * 1.2, a: (rng() < 0.5 ? -1 : 1) * (0.05 + rng() * 0.07), s: 4 + rng() * 2.5 });
  const greenShape = (u, v) => {
    const [lu, lv] = gLocal(u, v);
    let hh = lv * slopeBack + lu * slopeSide;
    if (sg.tier) hh += 0.24 * ss(-3.5, 3.5, lv - (sg.tierAt || 0) * gry);      // 雙層果嶺：中間一道約 24 公分的階
    for (const b of bumps) hh += b.a * Math.exp(-((lu - b.lu) ** 2 + (lv - b.lv) ** 2) / (2 * b.s * b.s));
    return hh;
  };

  // ---------- 4. 沙坑 ----------
  const bunkers = [];
  const bl = [0, 1, 2, 3, 4].find(i => F.has('b' + i)) ?? 2;
  const nGreenside = spec ? 0 : links ? bl + 1 : bl;
  const [bmin, bmax] = st.bunkerSize;
  // 果嶺周圍的方位代號 → （往前後, 往左右）：F 果嶺前、B 後、L 左、R 右、FL 左前…
  const GSIDE = { F: [-1, 0], B: [1, 0], L: [0, -1], R: [0, 1], FL: [-0.72, -0.72], FR: [-0.72, 0.72], BL: [0.72, -0.72], BR: [0.72, 0.72] };
  const gRight = [endDir[1], -endDir[0]];
  const nearGreen = (code, gap, latShift = 0) => {
    const [f, l] = GSIDE[code];
    const fwd = f * (gry + gap), lat = l * (grx + gap) + latShift;
    return [G[0] + endDir[0] * fwd + gRight[0] * lat, G[1] + endDir[1] * fwd + gRight[1] * lat];
  };
  if (spec && spec.bunkers) for (const b of spec.bunkers) {
    if (map && !b.grass) continue;                       // 地圖模式的沙坑照描圖，描述只補草坑
    const n = b.n || 1;
    for (let i = 0; i < n; i++) {
      const brx = bmin + rng() * (bmax - bmin);
      if (b.g) {
        // 果嶺邊：多個時沿果嶺邊排開
        const rx = brx * (b.big ? 1.3 : 0.95), ry = brx * (b.big ? 0.75 : 0.55);
        const spread = n > 1 ? (i - (n - 1) / 2) * (GSIDE[b.g][1] === 0 ? grx * 0.95 : 0) : 0;
        const along = n > 1 && GSIDE[b.g][1] !== 0 ? (i - (n - 1) / 2) * gry * 0.9 : 0;
        const [u, v] = nearGreen(b.g, Math.max(rx, ry) * 0.62 + 1.2, spread);
        bunkers.push({ u: u + endDir[0] * along, v: v + endDir[1] * along, rx, ry, rot: gRot + Math.atan2(GSIDE[b.g][1], GSIDE[b.g][0]) + Math.PI / 2,
          depth: b.grass ? 0.9 : st.potDepth * 1.1, grass: !!b.grass, ph: rng() * 6 });
      } else {
        // 球道沙坑：at = 距白梯碼數；side L / R 在球道邊、C 橫跨球道；n 個時沿球道（或橫向）排開
        const sAt = atY(b.at) + (b.side === 'C' ? 0 : (i - (n - 1) / 2) * 13);
        const dir = dirAt(sAt), pt = pointAt(sAt);
        const sd = b.side === 'L' ? -1 : 1;
        const rx = brx * 0.6, ry = brx * (b.long ? 3 : 1.4);
        const lat = b.side === 'C' ? (i - (n - 1) / 2) * (fwBase * 1.05 / n) : sd * (fwHalf(sAt, sd) + rx * (b.inside ? -0.6 : 0.35));
        bunkers.push({ u: pt[0] + dir[1] * lat, v: pt[1] - dir[0] * lat, rx: b.side === 'C' ? brx * 0.7 : rx, ry: b.side === 'C' ? brx * 0.7 : ry,
          rot: Math.atan2(dir[0], dir[1]), depth: st.potDepth, grass: !!b.grass, ph: rng() * 6 });
      }
    }
  }
  for (let i = 0; i < nGreenside; i++) {
    const a = (i / nGreenside) * Math.PI * 2 + rng() * 0.9 - Math.PI / 2 + 0.6;
    const brx = bmin + rng() * (bmax - bmin), bry = links ? brx * (0.85 + rng() * 0.2) : brx * (0.45 + rng() * 0.2);
    const dist = 1 + (links ? 0.25 : 0.12) + (Math.max(brx, bry) * 0.6) / Math.min(grx, gry);
    const lu = Math.cos(a) * grx * dist, lv = Math.sin(a) * gry * dist;
    const c = Math.cos(-gRot), s = Math.sin(-gRot);
    bunkers.push({ u: G[0] + lu * c - lv * s, v: G[1] + lu * s + lv * c, rx: brx, ry: bry, rot: a + Math.PI / 2, depth: st.potDepth * (links ? 1 : 1.1), ph: rng() * 6 });
  }
  if (par >= 4 && !spec) {
    const zones = par === 4 ? [clamp(L * 0.62, 215, 265)] : [clamp(L * 0.45, 220, 265), clamp(L * 0.75, 380, 440)];
    for (const zs of zones) {
      const cnt = links ? bl : Math.min(2, Math.ceil(bl / 2));
      for (let i = 0; i < cnt; i++) {
        const sAt = zs + (rng() - 0.5) * 40;
        const side = rng() < 0.5 ? -1 : 1;
        const dir = dirAt(sAt), pt = pointAt(sAt);
        const brx = bmin + rng() * (bmax - bmin) * (links ? 1 : 0.8);
        const lat = links ? (rng() - 0.5) * fwBase * 1.1 : side * (fwHalf(sAt, side) + brx * 0.35);
        bunkers.push({ u: pt[0] + dir[1] * lat, v: pt[1] - dir[0] * lat, rx: links ? brx : brx * 0.55, ry: links ? brx * 0.9 : brx * 1.5, rot: Math.atan2(dir[0], dir[1]), depth: st.potDepth, ph: rng() * 6 });
      }
    }
  }
  const bunkerR = (b, u, v) => {
    const du = u - b.u, dv = v - b.v;
    const c = Math.cos(b.rot), s = Math.sin(b.rot);
    const lu = du * c - dv * s, lv = du * s + dv * c;
    const th = Math.atan2(lv, lu);
    return Math.hypot(lu / b.rx, lv / b.ry) * (1 + 0.12 * Math.sin(2 * th + b.ph) + 0.06 * Math.sin(5 * th + b.ph * 2));
  };

  // ---------- 5. 水障礙 / 峽谷 ----------
  const waters = [];
  const pondKind = canyon || isVoid ? 'chasm' : 'pond';
  for (const side of [-1, 1]) {
    if (!F.has(side < 0 ? 'wl' : 'wr')) continue;
    const sAt = par === 5 ? clamp(L * 0.5, 240, 300) : clamp(L * 0.58, 200, 260);
    const pt = pointAt(sAt), dir = dirAt(sAt);
    const rx = canyon ? 26 + rng() * 10 : 20 + rng() * 10, ry = 55 + rng() * 30;
    const lat = side * (fwHalf(sAt, side) + rx * 0.62);
    waters.push({ u: pt[0] + dir[1] * lat, v: pt[1] - dir[0] * lat, rx, ry, rot: Math.atan2(dir[0], dir[1]), kind: pondKind, ph: rng() * 6 });
  }
  // spec.water：{from, to, side} 球道左/右側（距白梯碼數）、{g:'FR'} 果嶺旁、{ditch:true} 細長水溝
  if (spec && spec.water && !map) for (const w of spec.water) {
    if (w.g) {
      const rx = w.size ? w.size[0] * YD / 2 : 13, ry = w.size ? w.size[1] * YD / 2 : 10;
      const [u, v] = nearGreen(w.g, Math.max(rx, ry) * 0.75 + 1.5);
      waters.push({ u, v, rx, ry, rot: gRot, kind: 'pond', ph: rng() * 6 });
      continue;
    }
    const s0 = atY(w.from), s1 = atY(w.to), sm = (s0 + s1) / 2;
    const pt = pointAt(sm), dir = dirAt(sm), sd = w.side === 'L' ? -1 : w.side === 'R' ? 1 : 0;
    const rx = w.ditch ? 2.4 : w.w ? w.w * YD / 2 : 15, ry = (s1 - s0) / 2 + (w.ditch ? 0 : 6);
    const lat = sd * (fwHalf(sm, sd || 1) + rx * (w.ditch ? 1.5 : 0.62) + (w.gap || 0) * YD);
    waters.push({ u: pt[0] + dir[1] * lat, v: pt[1] - dir[0] * lat, rx, ry, rot: Math.atan2(dir[0], dir[1]), kind: 'pond', ph: w.ditch ? 0 : rng() * 6 });
  }
  if (F.has('wc')) {
    const depth = par === 3 ? 22 + rng() * 12 : 11 + rng() * 4;
    const sAt = Lp - gry - depth - (par === 3 ? 4 : 6);
    const pt = pointAt(sAt), dir = dirAt(sAt);
    waters.push({ u: pt[0], v: pt[1], rx: grx + 16 + rng() * 8, ry: depth, rot: Math.atan2(dir[0], dir[1]), kind: pondKind, ph: rng() * 6 });
  }
  const waterR = (w, u, v) => {
    const du = u - w.u, dv = v - w.v;
    // rot 指的是長軸方向；把座標轉到水體自己的座標系
    const c = Math.cos(w.rot), s = Math.sin(w.rot);
    const lu = du * c - dv * s, lv = du * s + dv * c;
    const th = Math.atan2(lv, lu);
    return Math.hypot(lu / w.rx, lv / w.ry) * (1 + 0.1 * Math.sin(3 * th + w.ph) + 0.05 * Math.sin(7 * th + w.ph));
  };
  let cross = null;
  if (spec && spec.valley) {
    const s0 = atY(spec.valley.from), s1 = atY(spec.valley.to);
    cross = { s: (s0 + s1) / 2, half: (s1 - s0) / 2, kind: 'valley' };
  } else if (F.has('xc')) {
    const sc = par === 5 ? clamp(L * 0.66, 330, 380) : par === 4 ? clamp(L * 0.42, 150, 185) : Lp * 0.5;
    cross = { s: sc, half: canyon ? 13 : links ? 2.8 : theme === 'lava' ? 7 : 3.6, kind: canyon ? 'chasm' : 'creek' };
  }
  const crossDist = (s, d) => cross ? Math.abs(s - cross.s + (cross.kind === 'valley' ? 3 : 6) * nz2(d * 0.02, 5)) - cross.half : 99;
  // 其他區域：spec.waste = [{g:'R'}] 果嶺旁的荒地（很難切）
  const zones = [];
  if (spec && spec.waste) for (const z of spec.waste) { const [u, v] = nearGreen(z.g, 9); zones.push({ u, v, r: 11, surf: SURF.WASTE }); }
  const obSide = spec && spec.ob ? (spec.ob === 'L' ? -1 : 1) : 0;      // OB 在哪一邊：球道外約 18 公尺就是界外
  const seaSide = F.has('sl') ? -1 : F.has('sr') ? 1 : 0;
  const seaEdge = s => fwBase / 2 + 30 + 9 * nz3(s * 0.012, 1);

  // ---------- 6. 發球台 ----------
  const tees = TEE_SETS.map(t => {
    if (map && map.tees[t.id]) {
      const [u, v] = map.tees[t.id], sT = near(u, v).s;
      return { id: t.id, s: sT, u, v, dir: dirAt(Math.max(0, sT)), color: t.color };
    }
    const sT = spec && spec.tees[t.id] ? clamp(Lp - spec.tees[t.id] * YD, 0, Lp - 40) : Lp * (1 - t.ratio);
    const pt = pointAt(sT), dir = dirAt(sT);
    const off = (rng() - 0.5) * 3;
    return { id: t.id, s: sT, u: pt[0] + dir[1] * off, v: pt[1] - dir[0] * off, dir, color: t.color };
  });
  if (map) { const wt = tees.find(t => t.id === 'white'); atY = y => clamp(wt.s + y * YD, 0, Lp); }
  const inTee = (u, v, margin = 0) => {
    for (const t of tees) {
      const du = u - t.u, dv = v - t.v;
      const al = du * t.dir[0] + dv * t.dir[1], la = du * t.dir[1] - dv * t.dir[0];
      if (Math.abs(al) < 5.5 + margin && Math.abs(la) < 4 + margin) return t;
    }
    return null;
  };

  const fs = par === 3 ? Lp - gry - 30 : clamp(Lp * 0.3, 110, 190);
  const fe = Lp - gry * 0.7;
  const roughW = course.roughW;

  // ---------- 浮島（星環浮島）：島上才有地面，其他地方是虛空（掉下去照峽谷規則）----------
  // islandF > 0 = 在島上。IG = 果嶺浮島（只有發球台和果嶺兩座島）、g1 / g2 = 球道中間有幾道虛空裂縫、nw = 窄島
  const gaps = [];
  if (isVoid && par >= 4) {
    const ng = F.has('g2') ? 2 : F.has('g1') ? 1 : 0;
    const s0 = Lp * 0.22 + 30, s1 = Lp - gry - 50;          // 紅梯之後、果嶺前
    for (let i = 0; i < ng; i++) gaps.push({ s: lerp(s0, s1, ng === 1 ? 0.45 : (i + 0.5) / ng), half: 7 + rng() * 5 });
  }
  const islandF = (u, v, s, d) => {
    const ad = Math.abs(d);
    const n = 2.6 * nz3(u * 0.035, v * 0.035) + 1.2 * nz2(u * 0.11, v * 0.11);
    let f = -99;
    if (!F.has('IG')) {
      const half = fwHalf(s, d > 0 ? 1 : -1) + (F.has('nw') ? 4 : roughW * 0.75);
      f = Math.min(half - ad, s + 14, Lp + gry + 12 - s) + n;
      for (const gp of gaps) f = Math.min(f, Math.abs(s - gp.s + 5 * nz2(d * 0.03, gp.s)) - gp.half);
    }
    for (const t of tees) {
      const du = u - t.u, dv = v - t.v;
      const e = Math.max(Math.abs(du * t.dir[0] + dv * t.dir[1]) - 5.5, Math.abs(du * t.dir[1] - dv * t.dir[0]) - 4);
      f = Math.max(f, 5 + n * 0.4 - e);
    }
    return Math.max(f, (fringeR + 0.5 - greenR(u, v)) * Math.min(grx, gry) + n * 0.4);
  };

  // ---------- 7. 地面種類 ----------
  const MAP_SURF = [SURF.OB, SURF.ROUGH, SURF.FAIRWAY, SURF.GREEN, SURF.TEE, SURF.SAND, SURF.WATER, SURF.ROUGH, SURF.DEEP, SURF.FRINGE];
  function mapSurface(u, v) {
    const i = cellAt(u, v);
    if (i < 0) return SURF.OB;
    const c = MG.g[i];
    if (cross && cross.kind === 'valley' && c !== 3 && c !== 4 && !inTee(u, v)) { const { s, d } = near(u, v); if (crossDist(s, d) < 0) return SURF.OB; }
    if (c === 0) {
      // 圖外：OB 那一側直接界外；其他地方 14 公尺內是樹林（深草），再外面界外
      if (obSide) { const { d } = near(u, v); if (obSide * d > 0) return SURF.OB; }
      return MG.outD[i] * MG.mpp < 14 ? SURF.DEEP : SURF.OB;
    }
    for (const b of bunkers) if (b.grass && bunkerR(b, u, v) < 1) return SURF.DEEP;
    if (c === 3 && MG.gid[i] !== activeGid) return SURF.FRINGE;          // 今天沒用的那個果嶺
    if (c === 1 && MG.greenD[i] * MG.mpp < 1.6) return SURF.FRINGE;
    if (c !== 6 && c !== 5 && inTee(u, v)) return SURF.TEE;        // 各梯台的發球區（官網碼數的位置）
    return MAP_SURF[c];
  }
  function surface(u, v) {
    if (map) return mapSurface(u, v);
    const { s, d } = near(u, v);
    const ad = Math.abs(d);
    if (isVoid && islandF(u, v, s, d) < 0) return SURF.CHASM;
    if (ad > corridor || s < -45 || s > Lp + 55) return SURF.OB;
    if (seaSide && seaSide * d > seaEdge(s)) return SURF.WATER;
    for (const w of waters) if (waterR(w, u, v) < 1) return w.kind === 'chasm' ? SURF.CHASM : SURF.WATER;
    if (cross && crossDist(s, d) < 0) return cross.kind === 'chasm' ? SURF.CHASM : cross.kind === 'valley' ? SURF.OB : SURF.WATER;
    const gr = greenR(u, v);
    if (gr < 1) return SURF.GREEN;
    for (const b of bunkers) if (bunkerR(b, u, v) < 1) return b.grass ? SURF.DEEP : SURF.SAND;
    if (gr < fringeR) return SURF.FRINGE;
    for (const z of zones) if (Math.hypot(u - z.u, v - z.v) < z.r * (1 + 0.15 * nz2(u * 0.1, v * 0.1))) return z.surf;
    if (inTee(u, v)) return SURF.TEE;
    const fh = fwHalf(s, d > 0 ? 1 : -1);
    if (obSide && obSide * d > fh + 18 && s > 0 && s < Lp + 10 && gr > 2.2) return SURF.OB;
    if (s > fs && s < fe) {
      const taper = s < fs + 18 ? Math.sqrt((s - fs) / 18) : 1;
      if (ad < fh * taper) return SURF.FAIRWAY;
    }
    if (seaSide && seaSide * d > seaEdge(s) - 10) return SURF.WASTE;
    if (gr < 2.1 || ad < fh + roughW * (1 + 0.3 * nz2(s * 0.03, d > 0 ? 2 : 9))) return SURF.ROUGH;
    if (canyon) return SURF.WASTE;
    return F.has('ww') ? SURF.WASTE : SURF.DEEP;
  }

  // ---------- 8. 高度 ----------
  // 林克斯陸地的平滑地板：高度不低於約 1.3m（海面 -0.9m），下坡洞也不會低到被海面穿透
  const floorL = x => links ? 0.5 * (x + 0.8 + Math.sqrt((x - 0.8) ** 2 + 1)) : x;
  const gCenterBase = baseElev(Lp) + st.macroA * nz.fbm(G[0] / st.macroL, G[1] / st.macroL, 3) + 0.55 + (links ? 3.5 : 0);
  const gCenterBaseF = floorL(gCenterBase - 0.55) + 0.55;
  const teeBase = {};
  tees.forEach(t => (teeBase[t.id] = baseElev(t.s) + st.macroA * nz.fbm(t.u / st.macroL, t.v / st.macroL, 3) + 0.7 + (links ? 3.5 : 0)));
  if (links) tees.forEach(t => (teeBase[t.id] = floorL(teeBase[t.id] - 0.7) + 0.7));
  // 大尺度起伏沿中心線取值：球道上只有前後起伏、左右是平的（避免球落地後往側邊滾進樹林），
  // 離開球道 4~30 公尺再慢慢恢復成真正的地形起伏
  const macro = (u, v) => st.macroA * nz.fbm(u / st.macroL, v / st.macroL, 3);
  const macroTab = [];
  for (let s = 0; s <= Lp + 2; s += 2) { const p = pointAt(s); macroTab.push(macro(p[0], p[1])); }
  const macroC = s => { const f = clamp(s, 0, Lp) / 2, i = Math.floor(f); return lerp(macroTab[i], macroTab[Math.min(i + 1, macroTab.length - 1)], f - i); };
  const rawH = (u, v, s, ad) => {
    const w = ss(fwBase / 2 + 4, fwBase / 2 + 30, ad);
    // 林克斯球場整體墊高 3.5m，陸地一定高於海面（-0.9m），海面不會從球道透出來閃爍
    let hh = baseElev(clamp(s, 0, Lp)) + lerp(macroC(s), macro(u, v), w) + (links ? 3.5 : 0);
    const k = 0.12 + 0.88 * ss(fwBase / 2, fwBase / 2 + 20, ad);
    hh += st.microA * nz2.fbm(u / st.microL, v / st.microL, 3) * k;
    if (links) hh += 2.2 * Math.max(0, nz3.fbm(u / 22, v / 22, 2)) * ss(fwBase / 2 + 5, fwBase / 2 + 30, ad);
    return floorL(hh);
  };
  waters.forEach(w => { w.level = rawH(w.u, w.v, near(w.u, w.v).s, 0) - 1.1; });
  if (cross) cross.level = rawH(...pointAt(cross.s), cross.s, 0) - (cross.kind === 'chasm' ? 26 : cross.kind === 'valley' ? 9 : 1.3);

  if (map) MG.waters.forEach(w => { const u = MG.u0 + w.cx * MG.mpp, v = MG.v0 - w.cy * MG.mpp; w.level = rawH(u, v, near(u, v).s, 0) - 1.1; });
  function mapHeight(u, v, s, ad) {
    let hh = rawH(u, v, s, ad);
    const i = cellAt(u, v);
    const od = i < 0 ? 200 : MG.outD[i] * MG.mpp;
    // 畫面外慢慢抬升，形成樹林山坡
    hh += ss(6, 70, od) * st.edgeRise * (0.6 + 0.6 * nz3.fbm(u / 80, v / 80, 2));
    for (const t of tees) {
      const du = u - t.u, dv = v - t.v;
      const al = Math.abs(du * t.dir[0] + dv * t.dir[1]) - 5.5, la = Math.abs(du * t.dir[1] - dv * t.dir[0]) - 4;
      const e = Math.max(al, la);
      if (e < 4) hh = lerp(teeBase[t.id], hh, ss(0, 4, e));
    }
    const gr = greenR(u, v);
    if (gr < 2.0) hh = lerp(gCenterBaseF + greenShape(u, v), hh, ss(1.15, 2.0, gr));
    if (i < 0) return hh;
    const gk = ss(0.3, 2.5, MG.greenD[i] * MG.mpp);
    // 沙坑：坑底平、邊坡緩
    const sd = MG.sandD[i] * MG.mpp;
    if (MG.g[i] === 5) hh -= gk * st.potDepth * 1.05 * ss(0, 1.8, sd);
    for (const b of bunkers) { if (!b.grass) continue; const br = bunkerR(b, u, v); if (br < 1.6) hh -= gk * b.depth * ss(1.12, 0.8, br); }
    // 水池：水面以下，岸邊緩坡
    const wi = MG.nearW[i];
    if (wi >= 0) {
      const w = MG.waters[wi];
      if (MG.g[i] === 6) hh = Math.min(hh, w.level - 0.4 - 1.4 * ss(0, 5, MG.watIn[i] * MG.mpp));
      else { const bd = MG.watOut[i] * MG.mpp; if (bd < 5) hh = Math.min(hh, lerp(w.level + 0.3, hh, ss(0, 5, bd))); }
    }
    if (cross && cross.kind === 'valley') { const { s: s2, d } = near(u, v); const cd = crossDist(s2, d); if (cd < 2 && MG.g[i] !== 3 && MG.g[i] !== 4) hh = lerp(hh, cross.level, ss(0.5, -2.5, cd)); }
    return hh;
  }
  function height(u, v) {
    const { s, d } = near(u, v);
    const ad = Math.abs(d);
    if (map) return mapHeight(u, v, s, ad);
    let hh = rawH(u, v, s, ad);
    // 走廊外：地形抬升，形成視覺邊界
    const out = ss(corridor * 0.8, corridor + (canyon ? 25 : 90), ad);
    if (canyon) {
      const mesa = ss(-0.1, 0.25, nz3.fbm(u / 60, v / 60, 3));
      hh += out * (st.edgeRise * (0.55 + 0.6 * mesa));
    } else hh += out * st.edgeRise * (0.6 + 0.6 * nz3.fbm(u / 80, v / 80, 2));
    if (seaSide) {
      const beyond = seaSide * d - seaEdge(s);
      hh = lerp(hh, -3.2, ss(-14, 3, beyond));
      if (seaSide * d > 0) hh -= out * st.edgeRise;
    }
    // 發球台平台
    for (const t of tees) {
      const du = u - t.u, dv = v - t.v;
      const al = Math.abs(du * t.dir[0] + dv * t.dir[1]) - 5.5, la = Math.abs(du * t.dir[1] - dv * t.dir[0]) - 4;
      const e = Math.max(al, la);
      if (e < 4) hh = lerp(teeBase[t.id], hh, ss(0, 4, e));
    }
    // 果嶺：平台 + 坡度 + 起伏
    const gr = greenR(u, v);
    if (gr < 2.0) hh = lerp(gCenterBaseF + greenShape(u, v), hh, ss(1.15, 2.0, gr));
    // 果嶺與果嶺邊不受沙坑、水池影響，坡度只由果嶺本身決定
    const gk = ss(1.12, 1.4, gr);
    // 沙坑凹陷與唇邊
    for (const b of bunkers) {
      const br = bunkerR(b, u, v);
      if (br < 1.6) {
        // 坑底平（半徑 80% 內同一個深度），邊坡較緩，唇邊只微微隆起
        hh -= gk * b.depth * ss(1.12, 0.8, br);
        hh += gk * 0.15 * Math.exp(-(((br - 1.12) / 0.12) ** 2));
      }
    }
    const beforeWater = hh;
    // 水池 / 峽谷
    for (const w of waters) {
      const wr = waterR(w, u, v);
      if (wr < 1.6) {
        if (w.kind === 'chasm') {
          hh = lerp(hh, w.level - 24, ss(1.04, 0.86, wr));
        } else {
          const bank = lerp(w.level + 0.3, hh, ss(1.0, 1.6, wr));
          hh = Math.min(hh, wr < 1 ? w.level - 0.4 - 1.4 * ss(1, 0.5, wr) : bank);
        }
      }
    }
    hh = lerp(beforeWater, hh, gk);
    if (cross) {
      const cd = crossDist(s, d);
      if (cd < (cross.kind === 'chasm' || cross.kind === 'valley' ? 2 : 5)) {
        if (cross.kind === 'chasm' || cross.kind === 'valley') hh = lerp(hh, cross.level, ss(0.5, -2.5, cd));
        else hh = Math.min(hh, lerp(cross.level - 0.6, hh, ss(-0.5, 5, cd)));
      }
    }
    // 浮島邊緣：物理上掉到島面下 30 公尺就算掉進虛空
    if (isVoid) { const f = islandF(u, v, s, d); if (f < 0.5) hh -= 30 * ss(0.5, -2.5, f); }
    return hh;
  }
  // 畫面用的高度：浮島外的虛空往下一路延伸到雲霧裡（物理仍用 height）
  function heightVis(u, v) {
    const hh = height(u, v);
    if (!isVoid) return hh;
    const { s, d } = near(u, v), f = islandF(u, v, s, d);
    return f < 0 ? hh - 40 * ss(0, -12, f) - 900 * ss(-6, -60, f) : hh;
  }

  // ---------- 9. 旗桿位置 ----------
  const prng = makeRng(seed ^ (opts.pinSeed || 1));
  let pin = null, bestSlope = 1e9;
  for (let i = 0; i < 10; i++) {
    const a = prng() * Math.PI * 2, r = 0.25 + prng() * 0.45;
    const lu = Math.cos(a) * grx * r, lv = Math.sin(a) * gry * r;
    const c = Math.cos(-gRot), s = Math.sin(-gRot);
    const u = G[0] + lu * c - lv * s, v = G[1] + lu * s + lv * c;
    if (map && surface(u, v) !== SURF.GREEN) continue;
    const e = 0.6;
    const sl = Math.hypot(height(u + e, v) - height(u - e, v), height(u, v + e) - height(u, v - e)) / (2 * e);
    const score = sl + prng() * 0.01;
    if (score < bestSlope) { bestSlope = score; pin = [u, v]; }
  }

  if (!pin) pin = [G[0], G[1]];

  // ---------- 10. 樹木 ----------
  const trees = [];
  const treeGrid = new Map();
  const key = (x, z) => Math.floor(x / 10) + ',' + Math.floor(z / 10);
  const addTree = t => {
    trees.push(t);
    const k = key(t.x, t.z);
    if (!treeGrid.has(k)) treeGrid.set(k, []);
    treeGrid.get(k).push(t);
  };
  const tooClose = (x, z, r) => {
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const arr = treeGrid.get((Math.floor(x / 10) + i) + ',' + (Math.floor(z / 10) + j));
      if (arr) for (const t of arr) if (Math.hypot(t.x - x, t.z - z) < r + t.r * 0.6) return true;
    }
    return false;
  };
  const trng = makeRng(seed + 5);
  const area = (bbox.maxU - bbox.minU) * (bbox.maxV - bbox.minV);
  const attempts = Math.floor(area / 18 * Math.min(1.4, course.trees * (F.has('tr') ? 1.35 : 1)) + (canyon ? area / 60 : 0));
  // 奇幻主題的樹：叢林 = 棕櫚 / 大闊葉 / 蕨類，熔岩 = 玄武岩柱 / 枯樹 / 岩石，浮島 = 水晶
  const themeTree = (ad, minAd) => {
    const r0 = trng();
    if (theme === 'jungle') {
      if (trng() > 0.35 + 0.65 * ss(minAd, minAd + 14, ad)) return null;
      return r0 < 0.34 ? { type: 'palm', h: 10 + trng() * 7, r: 3.2 + trng() * 1.2 }
        : r0 < 0.72 ? { type: 'broad', h: 13 + trng() * 10, r: 4.5 + trng() * 3, jungle: 1 }
          : { type: 'fern', h: 1.4 + trng() * 1.2, r: 1.6 + trng() * 1.4 };
    }
    if (theme === 'lava') {
      if (trng() > 0.55) return null;
      return r0 < 0.4 ? { type: 'basalt', h: 2 + trng() * 6, r: 1.2 + trng() * 1.8 }
        : r0 < 0.75 ? { type: 'deadtree', h: 6 + trng() * 6, r: 2.2 + trng() * 1.5 }
          : { type: 'rock', h: 1 + trng() * 2.4, r: 0.8 + trng() * 2.2 };
    }
    if (trng() > 0.5) return null;
    return r0 < 0.78 ? { type: 'crystal', h: 3 + trng() * 7, r: 1 + trng() * 1.4 } : { type: 'rock', h: 1 + trng() * 2, r: 0.8 + trng() * 1.6 };
  };
  // 碰撞球的中心高度與半徑
  const treeColl = t => {
    const k = { rock: [0.3, 0.8], pine: [0.5, 0.9], palm: [0.93, 0.75], basalt: [0.45, 0.85], crystal: [0.4, 0.8], deadtree: [0.62, 0.55] }[t.type] || [0.66, 1];
    t.cy = t.y + t.h * k[0];
    t.cr = t.type === 'cactus' ? 0.6 : t.r * k[1];
    if (t.type === 'cactus') t.cy = t.y + t.h * 0.5;
  };
  const plantMapTree = (u, v, big) => {
    const pine = trng() < 0.25;
    const t = { type: pine ? 'pine' : (trng() < 0.1 ? 'maple' : 'broad'), h: (pine ? 14 : 11) + trng() * (big ? 9 : 6), r: pine ? 3 + trng() : 3.4 + trng() * 2.2 };
    const x = u, z = -v;
    if (tooClose(x, z, t.r * 0.75)) return;
    t.x = x; t.z = z; t.y = height(u, v); t.rot = trng() * 6.28; t.tint = trng();
    t.cy = t.type === 'pine' ? t.y + t.h * 0.5 : t.y + t.h * 0.66;
    t.cr = t.type === 'pine' ? t.r * 0.9 : t.r;
    addTree(t);
  };
  if (map) {
    for (const [u, v] of map.trees) plantMapTree(u + (trng() - 0.5) * 2, v + (trng() - 0.5) * 2, false);
    // 畫面外 6 公尺起是樹林
    for (let i = 0; i < attempts * 1.2; i++) {
      const u = lerp(bbox.minU, bbox.maxU, trng()), v = lerp(bbox.minV, bbox.maxV, trng());
      const ci = cellAt(u, v);
      const od = ci < 0 ? 99 : MG.outD[ci] * MG.mpp;
      if (od < 6 || od > 60) continue;
      if (trng() > 0.4 + 0.6 * ss(6, 20, od)) continue;
      plantMapTree(u, v, true);
    }
  }
  for (let i = 0; i < (map ? 0 : attempts); i++) {
    const u = lerp(bbox.minU, bbox.maxU, trng()), v = lerp(bbox.minV, bbox.maxV, trng());
    const { s, d } = near(u, v);
    const ad = Math.abs(d);
    const fh = fwHalf(s, d > 0 ? 1 : -1);
    const minAd = fh + (isVoid ? 5 : park ? 9 : 14) + (s < fs ? 4 : 0);
    if (ad < minAd || greenR(u, v) < 2.8 || inTee(u, v, 6)) continue;
    const sf = surface(u, v);
    if (sf === SURF.WATER || sf === SURF.CHASM || sf === SURF.SAND) continue;
    let t;
    if (theme) { t = themeTree(ad, minAd); if (!t) continue; }
    else if (park) {
      // 越靠近走廊邊越密，形成樹牆
      const edge = ss(minAd, minAd + 14, ad);
      if (trng() > 0.35 + 0.65 * edge) continue;
      const pine = trng() < 0.26;
      const hgt = (pine ? 14 : 11) + trng() * 9;
      t = { type: pine ? 'pine' : (trng() < 0.12 ? 'maple' : 'broad'), h: hgt, r: pine ? 3 + trng() * 1.2 : 3.6 + trng() * 2.6 };
    } else if (links) {
      if (trng() > 0.5) continue;
      t = trng() < 0.85 ? { type: 'shrub', h: 1.2 + trng() * 0.8, r: 1.2 + trng() * 1.2 } : { type: 'broad', h: 7 + trng() * 4, r: 3 + trng() };
    } else {
      const r0 = trng();
      t = r0 < 0.45 ? { type: 'rock', h: 1 + trng() * 2.4, r: 0.8 + trng() * 2.2 }
        : r0 < 0.75 ? { type: 'juniper', h: 3 + trng() * 2.5, r: 1.4 + trng() * 1.2 }
          : { type: 'cactus', h: 3 + trng() * 4, r: 0.5 };
    }
    const x = u, z = -v;
    if (tooClose(x, z, t.r * 0.8)) continue;
    t.x = x; t.z = z; t.y = height(u, v); t.rot = trng() * 6.28; t.tint = trng();
    treeColl(t);
    addTree(t);
  }

  // 真實球場指定的樹叢：spec.trees = [{at, side, n}]，在球道邊（距白梯 at 碼）種一排高樹
  if (spec && spec.trees && !map) for (const c of spec.trees) {
    const sd = c.side === 'L' ? -1 : 1;
    for (let i = 0; i < (c.n || 8) * 4; i++) {
      const sAt = atY(c.at) + (trng() - 0.5) * (c.len || 45);
      const fh = fwHalf(sAt, sd), lat = sd * (fh + (c.gap ?? 3) + trng() * 14);
      const pt = pointAt(sAt), dir = dirAt(sAt);
      const u = pt[0] + dir[1] * lat, v = pt[1] - dir[0] * lat;
      const sf = surface(u, v);
      if (sf === SURF.WATER || sf === SURF.SAND || sf === SURF.GREEN || sf === SURF.TEE || sf === SURF.FAIRWAY) continue;
      const pine = trng() < 0.3;
      const t = { type: pine ? 'pine' : 'broad', h: (pine ? 15 : 12) + trng() * 8, r: pine ? 3.2 : 4 + trng() * 2 };
      const x = u, z = -v;
      if (tooClose(x, z, t.r * 0.8)) continue;
      t.x = x; t.z = z; t.y = height(u, v); t.rot = trng() * 6.28; t.tint = trng();
      t.cy = t.type === 'pine' ? t.y + t.h * 0.5 : t.y + t.h * 0.66;
      t.cr = t.type === 'pine' ? t.r * 0.9 : t.r;
      addTree(t);
    }
  }

  // 遠景樹（只畫不碰撞）
  const scenery = [];
  const bc = [(bbox.minU + bbox.maxU) / 2, (bbox.minV + bbox.maxV) / 2];
  const ring = (n, r0, r1, fn) => { for (let i = 0; i < n; i++) { const a = trng() * Math.PI * 2, r = lerp(r0, r1, trng()); fn(bc[0] + Math.cos(a) * r, bc[1] + Math.sin(a) * r); } };
  if (theme === 'jungle') {
    // 叢林：近處棕櫚與大樹，遠方一根根高聳的石柱山
    for (let i = 0; i < 2400; i++) {
      const u = lerp(bbox.minU - 250, bbox.maxU + 250, trng()), v = lerp(bbox.minV - 150, bbox.maxV + 350, trng());
      const { s, d } = near(u, v);
      if (Math.abs(d) < corridor + 20 && s > -40 && s < Lp + 60) continue;
      const palm = trng() < 0.35;
      scenery.push({ x: u, z: -v, uv: [u, v], type: palm ? 'palm' : 'broad', jungle: 1, h: palm ? 11 + trng() * 7 : 14 + trng() * 10, r: palm ? 3.5 : 5 + trng() * 3, rot: trng() * 6.28, tint: trng() });
    }
    ring(34, 520, 1500, (u, v) => scenery.push({ x: u, z: -v, uv: [u, v], type: 'karst', h: 130 + trng() * 230, r: 22 + trng() * 34, rot: trng() * 6.28, tint: trng() }));
  } else if (theme === 'lava') {
    for (let i = 0; i < 700; i++) {
      const u = lerp(bbox.minU - 250, bbox.maxU + 250, trng()), v = lerp(bbox.minV - 150, bbox.maxV + 350, trng());
      const { s, d } = near(u, v);
      if (Math.abs(d) < corridor + 20 && s > -40 && s < Lp + 60) continue;
      const b = trng() < 0.55;
      scenery.push({ x: u, z: -v, uv: [u, v], type: b ? 'basalt' : 'deadtree', h: b ? 3 + trng() * 9 : 6 + trng() * 6, r: b ? 1.5 + trng() * 2.5 : 2.5, rot: trng() * 6.28, tint: trng() });
    }
    // 遠方的火山（山頂發光）
    ring(3, 1400, 2000, (u, v) => scenery.push({ x: u, z: -v, uv: [u, v], type: 'volcano', h: 380 + trng() * 320, r: 700 + trng() * 300, rot: trng() * 6.28, tint: trng() }));
  } else if (isVoid) {
    // 浮島：四周飄著大大小小的浮空島（高度自己指定，不貼地）
    ring(70, 160, 1300, (u, v) => { const r = 8 + trng() ** 2 * 70; scenery.push({ x: u, z: -v, uv: [u, v], type: 'isle', h: r * (1.6 + trng()), r, fy: -160 + trng() * 280, rot: trng() * 6.28, tint: trng() }); });
  } else if (!links) {
    const n = park ? 2600 : 500;
    for (let i = 0; i < n; i++) {
      const u = lerp(bbox.minU - 250, bbox.maxU + 250, trng()), v = lerp(bbox.minV - 150, bbox.maxV + 350, trng());
      const { s, d } = near(u, v);
      if (map) { const ci = cellAt(u, v); if (ci >= 0 && MG.outD[ci] * MG.mpp < 50) continue; }
      else if (Math.abs(d) < corridor + 20 && s > -40 && s < Lp + 60) continue;
      const pine = trng() < 0.3;
      scenery.push({ x: u, z: -v, uv: [u, v], type: park ? (pine ? 'pine' : (trng() < 0.15 ? 'maple' : 'broad')) : 'juniper', h: park ? 12 + trng() * 10 : 3 + trng() * 2, r: park ? 4 + trng() * 2.5 : 1.6, rot: trng() * 6.28, tint: trng() });
    }
  }

  // ---------- 世界座標介面（x = u, z = -v） ----------
  const H = (x, z) => height(x, -z);
  const api = {
    course, holeIdx, par, hcp, yards, feat: F, spec, L: Lp, path, S, bbox, tees, pin: [pin[0], -pin[1]],
    greenSide: mapGreens && mapGreens.length > 1 ? (gIdx === 0 ? '左' : '右') : null,      // 有兩個果嶺時今天用哪一個
    green: { u: G[0], v: G[1], rx: grx, ry: gry, rot: gRot }, bunkers, waters: map ? MG.waters.map(w => ({ kind: 'pond', level: w.level, cells: w.cells, grid: MG })) : waters, cross, seaSide, seaEdge, trees, scenery,
    near, pointAt, dirAt, fwHalf, greenR, surfaceUV: surface, heightUV: height, heightVisUV: heightVis, fs, fe, theme,
    islandUV: isVoid ? (u, v) => { const { s, d } = near(u, v); return islandF(u, v, s, d); } : null,
    height: H,
    surface: (x, z) => surface(x, -z),
    normal(x, z) {
      const e = 0.3;
      const hx = (H(x + e, z) - H(x - e, z)) / (2 * e), hz = (H(x, z + e) - H(x, z - e)) / (2 * e);
      const l = Math.hypot(hx, 1, hz);
      return [-hx / l, 1 / l, -hz / l];
    },
    inBounds: (x, z) => x > bbox.minU && x < bbox.maxU && -z > bbox.minV && -z < bbox.maxV,
    distToPin: (x, z) => Math.hypot(x - api.pin[0], z - api.pin[1]),
    treeAt(x, y, z) {
      const arr = treeGrid.get(key(x, z));
      if (!arr) return null;
      for (const t of arr) {
        if (t.type === 'shrub' || t.type === 'fern') { if (y < t.y + t.h && Math.hypot(x - t.x, z - t.z) < t.r) return t; continue; }
        if (Math.hypot(x - t.x, y - t.cy, z - t.z) < t.cr) return t;
        if (t.type !== 'rock' && t.type !== 'basalt' && t.type !== 'crystal' && y < t.y + t.h * 0.4 && Math.hypot(x - t.x, z - t.z) < 0.35) return t; // 樹幹
      }
      return null;
    },
    teePos(teeId) {
      const t = tees.find(q => q.id === teeId) || tees[1];
      return [t.u, H(t.u, -t.v) + 0.0213, -t.v];   // 球心在地面上一個半徑
    },
    // 果嶺高度統計：平均高度與最大高低差（色階用）
    greenStats() {
      if (api._gs) return api._gs;
      let sum = 0, n = 0;
      const hs = [];
      for (let i = -20; i <= 20; i++) for (let j = -20; j <= 20; j++) {
        const u = G[0] + i * 0.7, v = G[1] + j * 0.7;
        if (greenR(u, v) >= 1) continue;
        const h = height(u, v);
        hs.push(h); sum += h; n++;
      }
      const h0 = sum / Math.max(1, n);
      const range = Math.max(0.12, ...hs.map(h => Math.abs(h - h0)));
      api._gs = { h0, range };
      return api._gs;
    },
    // 球道上第 dist 公尺處的中心點（給預設瞄準用）
    centerAt(s) { const p = pointAt(s); return [p[0], -p[1]]; },
  };
  return api;
}

// ---------- 地圖貼圖：顏色圖 + 材質遮罩 ----------
const PALETTE = {
  links: { fair: [128, 148, 78], fair2: [116, 136, 70], cut: [110, 128, 64], rough: [108, 120, 62], deep: [160, 146, 94], green: [104, 140, 64], green2: [94, 130, 58], fringe: [110, 140, 66], sand: [222, 204, 160], waste: [196, 178, 132], tee: [128, 158, 72], ob: [150, 140, 92] },
  parkland: { fair: [92, 134, 58], fair2: [80, 120, 50], cut: [76, 114, 48], rough: [62, 98, 42], deep: [50, 82, 34], green: [90, 138, 60], green2: [80, 128, 54], fringe: [84, 130, 56], sand: [232, 222, 196], waste: [130, 118, 84], tee: [90, 134, 58], ob: [46, 76, 32] },
  canyon: { fair: [100, 142, 60], fair2: [88, 130, 52], cut: [84, 122, 50], rough: [92, 116, 54], deep: [178, 112, 72], green: [94, 144, 62], green2: [84, 134, 56], fringe: [90, 136, 58], sand: [222, 200, 160], waste: [186, 118, 76], tee: [108, 158, 64], ob: [170, 104, 66] },
  // 奇幻主題（依 course.theme）
  jungle: { fair: [74, 156, 62], fair2: [64, 142, 54], cut: [58, 132, 50], rough: [44, 112, 44], deep: [30, 84, 36], green: [84, 170, 76], green2: [74, 158, 68], fringe: [70, 150, 62], sand: [238, 224, 176], waste: [120, 104, 70], tee: [74, 156, 62], ob: [26, 70, 30], water: [40, 150, 140] },
  lava: { fair: [78, 128, 66], fair2: [68, 116, 58], cut: [62, 106, 54], rough: [62, 58, 56], deep: [44, 40, 40], green: [92, 150, 74], green2: [82, 138, 66], fringe: [76, 128, 62], sand: [74, 70, 74], waste: [118, 54, 36], tee: [78, 128, 66], ob: [36, 32, 32], water: [255, 110, 30] },
  void: { fair: [72, 182, 160], fair2: [62, 166, 148], cut: [56, 152, 138], rough: [52, 116, 108], deep: [86, 70, 140], green: [96, 200, 176], green2: [86, 186, 164], fringe: [76, 176, 156], sand: [226, 220, 250], waste: [70, 60, 110], tee: [64, 164, 150], ob: [40, 30, 70], chasm: [16, 12, 34] },
};

// opts.px：每像素幾公尺（縮圖用大一點的值，畫得很快）
export function paintMaps(hole, opts = {}) {
  const { bbox } = hole;
  const w = bbox.maxU - bbox.minU, h = bbox.maxV - bbox.minV;
  const px = opts.px || Math.max(0.3, Math.max(w, h) / 2048);
  const W = Math.round(w / px), Hh = Math.round(h / px);
  const pal = PALETTE[hole.course.theme] || PALETTE[hole.course.style];
  const color = document.createElement('canvas');
  color.width = W; color.height = Hh;
  const mask = document.createElement('canvas');
  mask.width = W; mask.height = Hh;
  const cx = color.getContext('2d'), mx = mask.getContext('2d');
  const cimg = cx.createImageData(W, Hh), mimg = mx.createImageData(W, Hh);
  const cd = cimg.data, md = mimg.data;
  const nz = makeNoise(hashStr(hole.course.id + hole.holeIdx + 'paint'));
  const stripe = 9;
  const g = hole.green;
  const gc = Math.cos(g.rot + 0.4), gs = Math.sin(g.rot + 0.4);
  for (let j = 0; j < Hh; j++) {
    // 畫布第 0 列 = 最遠處（v 最大），對應世界 z 最小
    const v = bbox.maxV - (j + 0.5) * px;
    for (let i = 0; i < W; i++) {
      const u = bbox.minU + (i + 0.5) * px;
      const sf = hole.surfaceUV(u, v);
      const n1 = nz(u * 0.08, v * 0.08), n2 = nz(u * 0.5, v * 0.5);
      let c, sand = 0;
      switch (sf) {
        case SURF.FAIRWAY: {
          const { s, d } = hole.near(u, v);
          const edge = hole.fwHalf(s, d > 0 ? 1 : -1) - Math.abs(d);
          c = edge < 1.6 ? pal.cut : (Math.floor(s / stripe) % 2 ? pal.fair : pal.fair2);
          break;
        }
        case SURF.GREEN: {
          const lu = (u - g.u) * gc - (v - g.v) * gs, lv = (u - g.u) * gs + (v - g.v) * gc;
          c = (Math.floor(lu / 3.2) + Math.floor(lv / 3.2)) % 2 ? pal.green : pal.green2;
          break;
        }
        case SURF.FRINGE: c = pal.fringe; break;
        case SURF.TEE: c = (Math.floor(v / 2.5) % 2) ? pal.tee : pal.fair2; break;
        case SURF.ROUGH: c = pal.rough; break;
        case SURF.DEEP: c = pal.deep; break;
        case SURF.SAND: c = pal.sand; sand = 1; break;
        case SURF.WASTE: c = pal.waste; sand = 1; break;
        case SURF.WATER: c = pal.water || [70, 92, 70]; break;
        case SURF.CHASM: c = pal.chasm || pal.waste; sand = pal.chasm ? 0 : 1; break;
        default: c = pal.ob; sand = hole.course.style === 'canyon' ? 1 : 0;
      }
      const f = 1 + n1 * 0.10 + n2 * 0.05;
      const o = (j * W + i) * 4;
      cd[o] = clamp(c[0] * f, 0, 255); cd[o + 1] = clamp(c[1] * f, 0, 255); cd[o + 2] = clamp(c[2] * f, 0, 255); cd[o + 3] = 255;
      md[o] = sand * 255; md[o + 1] = sf === SURF.GREEN || sf === SURF.FRINGE ? 255 : 0; md[o + 2] = 0; md[o + 3] = 255;
    }
  }
  cx.putImageData(cimg, 0, 0);
  mx.putImageData(mimg, 0, 0);
  return { color, mask, px };
}
