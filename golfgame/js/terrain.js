// 由球場資料生成單洞：中心線、球道、果嶺（含坡度）、沙坑、水障礙、樹木、高度與地面種類
import { makeRng, makeNoise, hashStr, clamp, lerp, rad, YD } from './util.js';
import { SURF } from './physics.js';
import { TEE_SETS } from './courses.js';

const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// 奇幻主題（其他主題是寫實的球場外觀）
export const THEME_FANTASY = { jungle: 1, lava: 1, void: 1, mushroom: 1, frost: 1 };

// 挑戰模式專用的新主題：樹（trees）、遠景（scen）、地標（marks）用資料描述，程式共用
//   每一項 [種類, 權重, 高度下限, 高度上限, 半徑下限, 半徑上限, 額外屬性]；dens：樹林密度（park = 沿走廊越外越密、數字 = 每次嘗試種下的機率）
//   marks：[種類, 數量, 距離下限, 距離上限, 高度…, 半徑…, 額外屬性]（fy = 指定高度、不貼地）
//   void：島外是虛空（屋頂、雲海）；waste：長草外是荒地
export const TDEF = {
  candy: { dens: 'park', trees: [['lolli', 45, 4, 8, 1.6, 2.6], ['gumdrop', 35, 1.4, 3, 1.4, 2.4], ['broad', 20, 7, 11, 3.5, 5, { candy: 1 }]],
    scen: [1100, [['lolli', 50, 5, 10, 2, 3], ['broad', 50, 8, 12, 4, 5.5, { candy: 1 }]]], marks: [['lolli', 22, 280, 1100, 30, 70, 10, 18]] },
  city: { void: true, dens: 0.18, trees: [['lantern', 70, 4, 6, 0.4, 0.5], ['rock', 30, 0.8, 1.6, 1, 1.6]], scen: [0, []],
    marks: [['tower', 150, 140, 1500, 280, 520, 14, 42, { fy: -320 }]] },
  sky: { void: true, dens: 0.4, trees: [['broad', 45, 8, 13, 3.5, 5], ['pine', 25, 10, 15, 2.6, 3.4], ['obelisk', 30, 7, 12, 0.9, 1.3, { marble: 1 }]], scen: [0, []],
    marks: [['isle', 60, 180, 1300, 30, 120, 10, 70, { fyR: [-120, 160] }], ['castle', 7, 320, 1100, 60, 110, 24, 40, { white: 1, fyR: [-30, 70] }]] },
  moon: { waste: true, dens: 0.35, trees: [['rock', 70, 0.8, 2.6, 1, 2.6], ['crystal', 30, 2, 4, 0.8, 1.4]], scen: [300, [['rock', 100, 1, 3, 1.5, 3]]],
    marks: [['dome', 9, 220, 900, 18, 40, 18, 40], ['mesa', 18, 1300, 2300, 120, 260, 260, 420, { tint3: [0.62, 0.62, 0.68] }]] },
  mars: { waste: true, dens: 0.4, trees: [['rock', 60, 0.8, 2.8, 1, 2.8], ['basalt', 30, 2, 6, 1.2, 2.2], ['dome', 10, 3, 5, 3, 5]], scen: [400, [['rock', 70, 1, 3, 1.5, 3], ['basalt', 30, 3, 8, 1.5, 3]]],
    marks: [['mesa', 22, 700, 1900, 120, 300, 200, 380, { tint3: [1.1, 0.62, 0.45] }]] },
  reef: { waste: true, dens: 'park', trees: [['coral', 50, 3, 7, 2, 3.5], ['fern', 30, 1.6, 3, 1.6, 2.4, { anemone: 1 }], ['rock', 20, 1, 2.4, 1.2, 2.4]],
    scen: [1300, [['coral', 70, 4, 9, 2.5, 4], ['fern', 30, 2, 3, 2, 3, { anemone: 1 }]]], marks: [['coral', 40, 200, 900, 30, 70, 14, 26], ['karst', 12, 500, 1300, 90, 200, 30, 55]] },
  autumn: { dens: 'park', trees: [['broad', 70, 11, 18, 4, 6, { autumn: 1 }], ['pine', 30, 13, 20, 2.8, 3.6]],
    scen: [2600, [['broad', 75, 12, 18, 4.5, 6.5, { autumn: 1 }], ['pine', 25, 13, 20, 3, 3.8]]], marks: [['peak', 14, 1500, 2600, 350, 700, 260, 440]] },
  lavender: { dens: 0.5, trees: [['pine', 55, 9, 14, 1.6, 2.2, { cypress: 1 }], ['broad', 30, 6, 9, 3, 4.2, { olive: 1 }], ['rock', 15, 0.8, 1.6, 1, 1.6]],
    scen: [500, [['pine', 70, 9, 15, 1.8, 2.4, { cypress: 1 }], ['broad', 30, 6, 9, 3.5, 4.5, { olive: 1 }]]], marks: [['windmill', 3, 500, 1100, 22, 30, 4, 5]] },
  tulip: { dens: 0.35, trees: [['broad', 50, 8, 12, 3.5, 5, { willow: 1 }], ['shrub', 50, 1, 1.6, 1.2, 2]],
    scen: [400, [['broad', 100, 8, 13, 4, 5.5, { willow: 1 }]]], marks: [['windmill', 12, 220, 1000, 20, 30, 4, 5]] },
  egypt: { waste: true, dens: 0.45, trees: [['palm', 50, 9, 15, 3, 4], ['obelisk', 30, 9, 16, 1.1, 1.6], ['rock', 20, 1, 2, 1.2, 2]],
    scen: [260, [['palm', 100, 9, 15, 3.2, 4]]], marks: [['pyramid', 5, 700, 1500, 150, 260, 120, 200], ['obelisk', 12, 160, 520, 18, 30, 1.8, 2.6]] },
  swamp: { dens: 'park', trees: [['deadtree', 45, 7, 13, 2.2, 3.2], ['broad', 35, 9, 14, 4, 5.5, { swamp: 1 }], ['fern', 20, 1.4, 2.4, 1.6, 2.4]],
    scen: [1500, [['deadtree', 50, 8, 14, 2.4, 3.4], ['broad', 50, 9, 14, 4.5, 6, { swamp: 1 }]]], marks: [] },
  dino: { dens: 'park', trees: [['palm', 30, 10, 16, 3.5, 4.5], ['fern', 40, 2.4, 4.5, 2.4, 3.6], ['broad', 30, 12, 18, 4.5, 6.5, { jungle: 1 }]],
    scen: [1800, [['fern', 40, 3, 5, 3, 4], ['palm', 30, 11, 16, 3.5, 4.5], ['broad', 30, 12, 18, 5, 7, { jungle: 1 }]]],
    marks: [['volcano', 2, 1500, 2100, 420, 650, 700, 950], ['bone', 7, 110, 420, 14, 24, 10, 16]] },
  neon: { dens: 0.4, trees: [['palm', 80, 9, 14, 3, 4, { neon: 1 }], ['lantern', 20, 5, 7, 0.4, 0.5, { neon: 1 }]],
    scen: [300, [['palm', 100, 10, 15, 3.2, 4.2, { neon: 1 }]]], marks: [['tower', 70, 500, 1600, 90, 320, 16, 40, { neon: 1 }]] },
  crystal: { dens: 0.45, trees: [['crystal', 70, 3, 9, 1.2, 2.4], ['rock', 30, 1, 2.6, 1.2, 2.6]],
    scen: [700, [['crystal', 100, 4, 12, 1.5, 3]]], marks: [['crystal', 46, 150, 900, 30, 90, 8, 20]] },
  // ---- 奇幻球場第二批 ----
  // 蜂蜜花谷：巨大的花、金黃的樹、遠方一座座蜂巢
  honey: { dens: 'park', trees: [['flower', 45, 5, 10, 2.2, 3.6], ['broad', 35, 8, 13, 3.8, 5.2, { honey: 1 }], ['shrub', 20, 1, 1.8, 1.4, 2.2, { honey: 1 }]],
    scen: [1500, [['flower', 45, 6, 12, 2.5, 4], ['broad', 55, 9, 14, 4.2, 5.8, { honey: 1 }]]], marks: [['hive', 14, 260, 1100, 26, 46, 14, 22], ['flower', 30, 200, 800, 30, 55, 12, 20]] },
  // 齒輪工坊：立著的大齒輪、冒煙的煙囪、銅色路燈
  clock: { dens: 0.32, trees: [['cog', 50, 4, 8, 1, 1], ['chimney', 12, 7, 13, 1, 1.6], ['lantern', 38, 4, 6, 0.4, 0.5, { brass: 1 }]],
    scen: [500, [['chimney', 55, 9, 18, 1.2, 2], ['cog', 45, 6, 12, 1, 1]]], marks: [['cog', 18, 300, 1200, 60, 140, 1, 1, { big: 1 }], ['chimney', 26, 250, 1100, 50, 110, 5, 9]] },
  // 幽光古堡：枯樹、墓碑、南瓜燈，遠方的古堡塔樓
  haunt: { dens: 'park', trees: [['deadtree', 40, 7, 13, 2.2, 3.2], ['grave', 25, 1.2, 1.9, 0.6, 0.8], ['pumpkin', 15, 0.8, 1.3, 0.8, 1.2], ['broad', 20, 10, 15, 4, 5.5, { night: 1 }]],
    scen: [1400, [['deadtree', 55, 8, 14, 2.4, 3.4], ['broad', 45, 11, 16, 4.5, 6, { night: 1 }]]], marks: [['castle', 7, 650, 1300, 90, 160, 40, 70], ['grave', 60, 90, 300, 2, 3, 1, 1.3]] },
  // 積木樂園：一疊疊的積木、玩具樹
  toy: { dens: 0.45, trees: [['block', 55, 3, 7, 1.6, 2.6], ['pine', 45, 6, 10, 2.4, 3.2, { toy: 1 }]],
    scen: [700, [['block', 45, 4, 9, 2, 3], ['pine', 55, 7, 11, 2.6, 3.4, { toy: 1 }]]], marks: [['block', 30, 260, 1100, 40, 110, 14, 28]] },
  // 雷鳴高原：玄武岩、枯樹、避雷針，遠方灰色的山
  storm: { waste: true, dens: 0.4, trees: [['basalt', 35, 2, 6, 1.2, 2.2], ['deadtree', 30, 6, 11, 2, 3], ['rock', 20, 1, 2.6, 1.2, 2.6], ['lantern', 15, 6, 9, 0.4, 0.5, { rod: 1 }]],
    scen: [500, [['basalt', 50, 3, 8, 1.5, 3], ['deadtree', 50, 7, 12, 2.2, 3]]], marks: [['peak', 22, 1300, 2300, 300, 560, 220, 380]] },
};

const NO_TRUNK = { rock: 1, basalt: 1, crystal: 1, icespike: 1, gumdrop: 1, dome: 1, obelisk: 1, grave: 1, pumpkin: 1, block: 1, chimney: 1, cog: 1, hive: 1 };      // 整顆都是實心的（不另外算樹幹）

const STYLE = {
  links: { macroA: 2.2, macroL: 120, microA: 1.5, microL: 16, edgeRise: 3, potDepth: 0.85, bunkerSize: [3.4, 4.6] },
  parkland: { macroA: 4.5, macroL: 110, microA: 0.6, microL: 28, edgeRise: 9, potDepth: 0.45, bunkerSize: [5, 9] },
  canyon: { macroA: 3.0, macroL: 90, microA: 0.8, microL: 24, edgeRise: 24, potDepth: 0.45, bunkerSize: [4.5, 8] },
  // 奇幻球場：火山地形起伏比較碎；浮島本身平緩（島外是虛空）
  volcanic: { macroA: 4.0, macroL: 90, microA: 1.1, microL: 18, edgeRise: 18, potDepth: 0.5, bunkerSize: [4.5, 8.5] },
  void: { macroA: 2.4, macroL: 120, microA: 0.5, microL: 26, edgeRise: 0, potDepth: 0.5, bunkerSize: [4, 7] },
  frost: { macroA: 3.4, macroL: 110, microA: 0.8, microL: 20, edgeRise: 16, potDepth: 0.5, bunkerSize: [4, 8] },
  // 寫實主題球場：高山（起伏大、兩側陡坡）、沙丘（大波浪起伏）、鹽湖（幾乎全平）
  alpine: { macroA: 6.5, macroL: 120, microA: 0.8, microL: 26, edgeRise: 30, potDepth: 0.45, bunkerSize: [5, 8] },
  dunes: { macroA: 6.0, macroL: 75, microA: 0.7, microL: 20, edgeRise: 12, potDepth: 0.55, bunkerSize: [5, 9] },
  salt: { macroA: 1.2, macroL: 140, microA: 0.3, microL: 30, edgeRise: 5, potDepth: 0.45, bunkerSize: [5, 9] },
};

// ---------- 真實球場的描圖地圖（球場官網球道配置圖判讀而來） ----------
// 類別：0 圖外 1 長草 2 球道 3 果嶺 4 發球台 5 沙坑 6 水 7 車道 8 樹下 9 果嶺邊
// 解碼一次後快取：外圍多補 PAD 格空白，順便算好「離畫面內多遠」「沙坑內深度」「水池編號與離水多遠」
const PAD = 40;
// 描圖地圖的清理（判讀官網圖留下的瑕疵）：
//   1. 果嶺裡的小塊雜色（圖上的旗子、洞杯記號、文字）→ 果嶺；周圍大多是果嶺 / 果嶺邊的小塊都算
//   2. 球道裡的小洞（雜點）→ 球道
//   3. 零星的沙坑 / 水 / 車道小點（不到約 2.5 平方公尺）→ 周圍最多的那一類
function cleanMap(g, W, H, mpp) {
  const a2 = mpp * mpp, seen = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (seen[i] || g[i] === 0) continue;
    const c = g[i], st = [i], comp = []; seen[i] = 1;
    while (st.length) {
      const j = st.pop(); comp.push(j); const x = j % W, y = (j / W) | 0;
      if (x > 0 && !seen[j - 1] && g[j - 1] === c) { seen[j - 1] = 1; st.push(j - 1); }
      if (x < W - 1 && !seen[j + 1] && g[j + 1] === c) { seen[j + 1] = 1; st.push(j + 1); }
      if (y > 0 && !seen[j - W] && g[j - W] === c) { seen[j - W] = 1; st.push(j - W); }
      if (y < H - 1 && !seen[j + W] && g[j + W] === c) { seen[j + W] = 1; st.push(j + W); }
    }
    const area = comp.length * a2;
    if (area > 80) continue;
    const cnt = {}; let nb = 0;
    const cs = new Set(comp);
    for (const j of comp) {
      const x = j % W;
      for (const k of [x > 0 ? j - 1 : -1, x < W - 1 ? j + 1 : -1, j - W, j + W]) {
        if (k < 0 || k >= W * H || cs.has(k)) continue;
        cnt[g[k]] = (cnt[g[k]] || 0) + 1; nb++;
      }
    }
    if (!nb) continue;
    const greenish = ((cnt[3] || 0) + (cnt[9] || 0)) / nb;
    let to = -1;
    if (c !== 3 && c !== 5 && c !== 6 && greenish >= 0.6 && (cnt[3] || 0) / nb >= 0.3 && area < 60) to = 3;      // 沙坑、水不動（果嶺旁的沙坑也被果嶺邊包著）
    else if (c !== 2 && c !== 6 && c !== 3 && (cnt[2] || 0) / nb >= 0.7 && area < 15) to = 2;
    else if ((c === 5 || c === 6 || c === 7 || c === 4) && area < 2.5) to = +Object.keys(cnt).filter(k => k !== '0').sort((p, q) => cnt[q] - cnt[p])[0];
    if (to >= 0 && to !== c) for (const j of comp) g[j] = to;
  }
  // 4. 每塊果嶺：被果嶺整個包住的其他地面（判讀錯的亮色、沙、果嶺邊、車道色）→ 果嶺；太小的果嶺（不到 220 平方公尺）往外長到約 300
  const gs = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (g[i] !== 3 || gs[i]) continue;
    const st = [i], comp = []; gs[i] = 1; let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
    while (st.length) {
      const j = st.pop(); comp.push(j); const x = j % W, y = (j / W) | 0;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      for (const k of [x > 0 ? j - 1 : -1, x < W - 1 ? j + 1 : -1, j - W, j + W]) if (k >= 0 && k < W * H && !gs[k] && g[k] === 3) { gs[k] = 1; st.push(k); }
    }
    if (comp.length * a2 < 40) continue;
    x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1); x1 = Math.min(W - 1, x1 + 1); y1 = Math.min(H - 1, y1 + 1);
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1, reach = new Uint8Array(bw * bh), q = [];
    for (let x = 0; x < bw; x++) q.push(x, (bh - 1) * bw + x);
    for (let y = 0; y < bh; y++) q.push(y * bw, y * bw + bw - 1);
    for (const k of q) reach[k] = 1;
    for (let h = 0; h < q.length; h++) {
      const k = q[h], x = k % bw, y = (k / bw) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= bw || yy >= bh) continue;
        const kk = yy * bw + xx; if (reach[kk] || g[(y0 + yy) * W + x0 + xx] === 3) continue; reach[kk] = 1; q.push(kk);
      }
    }
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) { const j = (y0 + y) * W + x0 + x; if (!reach[y * bw + x] && g[j] !== 3 && g[j] !== 6) { g[j] = 3; comp.push(j); gs[j] = 1; } }
    let n = comp.length;
    const small = n * a2 < 220;
    for (let it = 0; small && it < 40 && n * a2 < 300; it++) {
      const add = [];
      for (const j of comp) { const x = j % W; for (const k of [x > 0 ? j - 1 : -1, x < W - 1 ? j + 1 : -1, j - W, j + W]) if (k >= 0 && k < W * H && (g[k] === 1 || g[k] === 2 || g[k] === 9)) add.push(k); }
      if (!add.length) break;
      for (const k of add) if (g[k] !== 3) { g[k] = 3; gs[k] = 1; comp.push(k); n++; }
    }
  }
}

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
  cleanMap(g, W, H, m.mpp);
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
  // 編輯器畫的地形高低（map.hg）：粗網格（每格 cell 公尺，左上角 x0, y0），值是公寸，雙線性內插
  const HG = map && map.hg && map.hg.d ? map.hg : null;
  const hgAt = (u, v) => {
    const x = (u - HG.x0) / HG.cell, y = (HG.y0 - v) / HG.cell;
    const i = clamp(Math.floor(x), 0, HG.w - 2), j = clamp(Math.floor(y), 0, HG.h - 2);
    const fx = clamp(x - i, 0, 1), fy = clamp(y - j, 0, 1), d = HG.d, k = j * HG.w + i;
    return ((d[k] * (1 - fx) + d[k + 1] * fx) * (1 - fy) + (d[k + HG.w] * (1 - fx) + d[k + HG.w + 1] * fx) * fy) / 10;
  };
  // 左右兩個果嶺：每回合依旗桿種子選一個（另一個當果嶺邊短草）
  const mapGreens = map ? (map.greens && map.greens.length ? map.greens : [map.green]) : null;
  const gIdx = mapGreens && mapGreens.length > 1 ? (((opts.pinSeed || 0) % mapGreens.length) + mapGreens.length) % mapGreens.length : 0;
  const mapGreen = mapGreens ? mapGreens[gIdx] : null;
  let activeGid = -1;
  if (MG && MG.gcent.length) {
    const cx = (mapGreen.c[0] - MG.u0) / MG.mpp, cy = (MG.v0 - mapGreen.c[1]) / MG.mpp;
    let best = 1e18; MG.gcent.forEach(([x, y], k) => { const d = (x - cx) ** 2 + (y - cy) ** 2; if (d < best) { best = d; activeGid = k; } });
    const ci = Math.round(cy) * MG.W + Math.round(cx);
    if (MG.gid[ci] >= 0) activeGid = MG.gid[ci];
  }
  // 國外真實球場（OSM 圖資）：整座球場共用的數值地形（DEM，球場本地公尺座標）；geo = 這一洞原點（最後面梯台）在球場座標的位置
  const DEM = map && map.scene && map.scene.dem ? map.scene.dem : null;
  // 精確高程點（map.anc，梯台 / 果嶺 / 路線上直接查原始 DEM 的值）：跟網格內插的差，用高斯權重平滑地補到附近（網格 4 公尺，第一次用到才算）
  let corrG = null;
  const corrAt = (u, v) => {
    if (!map.anc || !map.anc.length) return 0;
    if (!corrG) {
      const st = 4, u0 = MG.u0 - 40, v0 = MG.v0 + 40, w = Math.ceil((MG.W * MG.mpp + 80) / st) + 1, h = Math.ceil((MG.H * MG.mpp + 80) / st) + 1;
      const res = map.anc.map(([au, av, ah]) => [au, av, ah / 10 - demBase(au, av)]);
      const g = new Float32Array(w * h);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const gu = u0 + i * st, gv = v0 - j * st;
        let sw = 0, sr = 0;
        for (const [au, av, r] of res) { const d2 = (au - gu) ** 2 + (av - gv) ** 2; if (d2 > 1600) continue; const wt = Math.exp(-d2 / 288); sw += wt; sr += wt * r; }
        g[j * w + i] = sr / (sw + 0.15);
      }
      corrG = { st, u0, v0, w, h, g };
    }
    const x = (u - corrG.u0) / corrG.st, y = (corrG.v0 - v) / corrG.st;
    if (x < 0 || y < 0 || x >= corrG.w - 1 || y >= corrG.h - 1) return 0;
    const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, G4 = corrG.g, k = j * corrG.w + i;
    return lerp(lerp(G4[k], G4[k + 1], fx), lerp(G4[k + corrG.w], G4[k + corrG.w + 1], fx), fy);
  };
  const demH = DEM ? (u, v) => demBase(u, v) + corrAt(u, v) : null;
  const demBase = DEM ? (u, v) => {
    const x = (u + map.geo[0] - DEM.x0) / DEM.step, y = (v + map.geo[1] - DEM.y0) / DEM.step;
    const i = clamp(Math.floor(x), 0, DEM.w - 2), j = clamp(Math.floor(y), 0, DEM.h - 2);
    const fx = clamp(x - i, 0, 1), fy = clamp(y - j, 0, 1), sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const d = DEM.d, k = j * DEM.w + i;
    const c4 = [d[k], d[k + 1], d[k + DEM.w], d[k + DEM.w + 1]], w4 = [(1 - sx) * (1 - sy), sx * (1 - sy), (1 - sx) * sy, sx * sy];
    const ci = cellAt(u, v), land = ci >= 0 && MG.g[ci] !== 6;
    // 超出 DEM 範圍：邊上的高度不要無限延伸成一圈高牆，往外 900 公尺慢慢降到低地
    const over = Math.max(0, -x, x - (DEM.w - 1), -y, y - (DEM.h - 1)) * DEM.step;
    if (over > 0) {
      let sw = 0, sh = 0; for (let q = 0; q < 4; q++) if (c4[q] > -39) { sw += w4[q]; sh += w4[q] * c4[q]; }
      if (sw < 0.5) return -4;
      return lerp(sh / sw / 10, 12, ss(0, 900, over));
    }
    let hh;
    if (land) {
      // 陸地只用陸地的取樣點內插（海的取樣點 = -4m）：海崖頂端一直到崖邊都保持實際高度，不會被海拉低成斜坡
      let sw = 0, sh = 0;
      for (let q = 0; q < 4; q++) if (c4[q] > -39) { sw += w4[q]; sh += w4[q] * c4[q]; }
      hh = sw > 0.001 ? sh / sw / 10 : 0.5;
      // 地圖上是陸地的格子一定比海面高
      hh = Math.max(hh, 0.3 + 0.5 * ss(0, 12, MG.watOut[ci] * MG.mpp));
    } else if (ci < 0) {
      // 地圖範圍外：看最近的取樣點是海還是陸地，海就是海底、陸地只用陸地的點（不會在海上浮出一圈長方形的框）
      let sw = 0, sh = 0, sea = 0;
      for (let q = 0; q < 4; q++) { if (c4[q] > -39) { sw += w4[q]; sh += w4[q] * c4[q]; } else sea += w4[q]; }
      hh = sea > 0.5 || sw < 0.001 ? -3 - 1.5 * ss(0.5, 1, sea) : Math.max(sh / sw / 10, 0.4);
    } else hh = (c4[0] * w4[0] + c4[1] * w4[1] + c4[2] * w4[2] + c4[3] * w4[3]) / 10;
    return hh;
  } : null;
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
  const theme = course.theme || null, TD = TDEF[theme], isVoid = theme === 'void' || !!(TD && TD.void);
  const lift = (links ? 3.5 : 0) + (theme === 'cliffs' ? 16 : 0);          // 陸地墊高（林克斯 3.5m，斷崖再高 16m）
  const desertWaste = canyon || theme === 'dunes' || theme === 'salt' || !!(TD && TD.waste);      // 長草外面是荒地

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
    // 洞型代號：S = S 型彎（先往一邊再往另一邊）、E = 早轉（約 150m）、J = 晚轉（果嶺前才轉）
    if (F.has('S')) {
      const c1 = clamp(L * 0.38, 130, 175), c2 = clamp(L * 0.3, 90, 130);
      legs.push([c1, h], [c2, h + rad(bend)], [L - c1 - c2, h + rad(bend - bend * 1.8)]);
    } else {
      const c = F.has('E') ? clamp(L * 0.4, 140, 170) : F.has('J') ? clamp(L * 0.75, 240, 300) : clamp(L * 0.6, 200, 255);
      legs.push([c, h], [L - c, h + rad(bend)]);
    }
  } else {
    const c1 = clamp(L * 0.45, 220, 265), c2 = clamp(L * 0.3, 140, 190);
    // S = 兩個彎方向相反、D = 兩個彎同方向（繞成大弧形）
    const s2 = F.has('S') ? -1.8 : F.has('D') ? 0.9 : rng() < 0.5 ? -0.6 : 0.5;
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
  // nw = 窄球道、wd = 寬球道（浮島的 nw 是窄島，另外處理）
  const fwBase = course.fairwayW * (F.has('tr') ? 0.85 : 1) * (F.has('nw') && !isVoid ? 0.72 : 1) * (F.has('wd') ? 1.3 : 1);
  // 自創球場（@C，spec.lands）：落點區比較寬、中間收窄（沙漏形），左右兩邊的寬度各自起伏得更明顯
  const landS = spec && spec.lands && !map ? spec.lands.map(y => atY(y)) : null;
  const fwShape = s => { let b = 0; for (const l of landS) b = Math.max(b, 1 - ss(15, 50, Math.abs(s - l))); return 0.86 + 0.26 * b; };
  const fwHalf = landS ? (s, side) => fwBase / 2 * (1 + 0.22 * nz(s * 0.014, side * 3.1) + 0.08 * nz(s * 0.06, side * 7.7)) * fwShape(s)
    : (s, side) => fwBase / 2 * (1 + 0.14 * nz(s * 0.018, side * 3.1) + 0.06 * nz(s * 0.07, side * 7.7));
  // 描圖地圖漏畫球道的洞（中心線上一半以上是長草）：沿中心線補一條 24 公尺寬的球道（梯台前 45 公尺、果嶺前 25 公尺以內不補），只蓋掉長草
  //   編輯器畫的球洞（drawn / 有固定旗位 pin）照畫的樣子，不補
  const drawn = !!(map && (map.drawn || map.pin));
  if (MG && par > 3 && !drawn) {
    let n = 0, fwc = 0;
    for (let s = 45; s < Lp - 30; s += 4) { const p = pointAt(s), ci = cellAt(p[0], p[1]); n++; if (ci >= 0 && MG.g[ci] === 2) fwc++; }
    if (n && fwc / n < 0.45) {
      const r = 12 / MG.mpp;
      for (let s = 45; s < Lp - 25; s += 1.5) {
        const p = pointAt(s), ci0 = (p[0] - MG.u0) / MG.mpp, cj0 = (MG.v0 - p[1]) / MG.mpp;
        for (let j = Math.floor(cj0 - r); j <= cj0 + r; j++) for (let i = Math.floor(ci0 - r); i <= ci0 + r; i++) {
          if (i < 0 || j < 0 || i >= MG.W || j >= MG.H || (i - ci0) ** 2 + (j - cj0) ** 2 > r * r) continue;
          if (MG.g[j * MG.W + i] === 1) MG.g[j * MG.W + i] = 2;
        }
      }
    }
  }
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
    // 編輯器畫了地形的球洞：果嶺的起伏就照畫的（相對果嶺中心），不另外加隨機的坡度與起伏
    if (HG) return hgAt(u, v) - hgAt(G[0], G[1]);
    const [lu, lv] = gLocal(u, v);
    let hh = lv * slopeBack + lu * slopeSide;
    if (sg.tier) hh += 0.24 * ss(-3.5, 3.5, lv - (sg.tierAt || 0) * gry);      // 雙層果嶺：中間一道約 24 公分的階
    // sg.crown：正 = 龜背果嶺（中間高、往四周掉，Pinehurst 那種），負 = 碗形果嶺（四周高、往中間收）；數值 = 邊緣比中心低多少公尺
    if (sg.crown) hh -= sg.crown * Math.min(1.3, (lu / grx) ** 2 + (lv / gry) ** 2);
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
        // 自創球場（spec.lands）：球道沙坑只咬進球道邊一點（原本 65% 壓在球道上，窄球道的落點兩側唇邊都是斜坡）
        const lat = b.side === 'C' ? (i - (n - 1) / 2) * (fwBase * 1.05 / n) : sd * (fwHalf(sAt, sd) + rx * (b.inside ? -0.6 : spec.lands ? 0.8 : 0.35));
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
    // 自創球場（spec.lands）：水池的內緣在球道邊外 3 公尺（原本 38% 的水池壓在球道上，岸邊斜坡橫跨落點，球停不住）
    const lat = sd * (fwHalf(sm, sd || 1) + rx * (w.ditch ? 1.5 : spec.lands ? 1.08 : 0.62) + (spec.lands && !w.ditch ? 3 : 0) + (w.gap || 0) * YD);
    waters.push({ u: pt[0] + dir[1] * lat, v: pt[1] - dir[0] * lat, rx, ry, rot: Math.atan2(dir[0], dir[1]), kind: 'pond', ph: w.ditch ? 0 : rng() * 6 });
  }
  if (F.has('wc')) {
    const depth = par === 3 ? 22 + rng() * 12 : 11 + rng() * 4;
    const sAt = Lp - gry - depth - (par === 3 ? 4 : 6);
    const pt = pointAt(sAt), dir = dirAt(sAt);
    waters.push({ u: pt[0], v: pt[1], rx: grx + 16 + rng() * 8, ry: depth, rot: Math.atan2(dir[0], dir[1]), kind: pondKind, ph: rng() * 6 });
  }
  // spec.wash：乾河床 / 荒地溝（例如加州球場的 barranca）：球可以打，地面是荒地、比旁邊低一點
  //   {from, to, side, w} 沿球道一側（距白梯碼數、寬度碼）、{at, w} 橫越整條球道
  const washes = [];
  if (spec && spec.wash && !map) for (const w of spec.wash) {
    if (w.at != null) {
      const sA = atY(w.at), pt = pointAt(sA), dir = dirAt(sA);
      washes.push({ u: pt[0], v: pt[1], rx: fwBase / 2 + course.roughW + 24, ry: (w.w || 14) * YD * 0.75, rot: Math.atan2(dir[0], dir[1]), ph: rng() * 6 });
      continue;
    }
    const s0 = atY(w.from), s1 = atY(w.to), sm = (s0 + s1) / 2, pt = pointAt(sm), dir = dirAt(sm), sd = w.side === 'L' ? -1 : 1;
    const rx = (w.w || 12) * YD / 2, lat = sd * (fwHalf(sm, sd) + rx * 0.7);
    washes.push({ u: pt[0] + dir[1] * lat, v: pt[1] - dir[0] * lat, rx, ry: (s1 - s0) / 2 + 6, rot: Math.atan2(dir[0], dir[1]), ph: rng() * 6 });
  }
  // IG（浮島以外的主題）：果嶺孤島，果嶺邊外面一圈水 / 熔岩，只能飛上去
  const moat = F.has('IG') && !isVoid ? { rIn: fringeR + 0.1, rOut: 1 + 15 / Math.min(grx, gry), level: 0 } : null;
  const moatOut = (u, v) => moat.rOut * (1 + 0.08 * nz2(u * 0.08, v * 0.08));
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
    // 斷崖的 xc = 要飛越的海灣（崖下是海，照峽谷規則）
    cross = { s: sc, half: canyon ? 13 : theme === 'cliffs' ? 17 : links ? 2.8 : theme === 'lava' ? 7 : 3.6, kind: canyon || theme === 'cliffs' ? 'chasm' : 'creek' };
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
      let [u, v] = map.tees[t.id];
      // 描圖算出來的梯台四周 3 公尺內有水、沙坑或果嶺 → 沿洞線前後找最近的乾地（優先往果嶺方向，最多前 90、後 40 公尺），梯台放在洞線上
      //   樹林、車道、荒地、圖邊不算：發球台那一塊本來就會畫成發球台（inTee），樹也會清掉；
      //   以前這些也算「不乾」，貼著圖邊或樹叢的梯台會被往前推好幾十公尺（例：南一 8 號 135 碼變 58 碼）
      const dryAt = (uu, vv) => { const i = cellAt(uu, vv); return i >= 0 && ![3, 5, 6].includes(MG.g[i]); };
      const padOk = (uu, vv) => dryAt(uu, vv) && dryAt(uu + 3, vv) && dryAt(uu - 3, vv) && dryAt(uu, vv + 3) && dryAt(uu, vv - 3);      // 四周 3 公尺（很多梯台就在水邊）
      const onPad = (() => { const i = cellAt(u, v); return i >= 0 && MG.g[i] === 4; })();      // 站在官網圖上畫的梯台方塊上：照圖放，不挪
      if (!padOk(u, v) && !onPad) {
        const s0 = near(u, v).s;
        for (let k = 2; k <= 90; k += 2) {
          const f = pointAt(s0 + k); if (padOk(f[0], f[1])) { [u, v] = f; break; }
          if (k <= 40) { const b = pointAt(s0 - k); if (s0 - k >= 0 && padOk(b[0], b[1])) { [u, v] = b; break; } }
        }
      }
      const sT = near(u, v).s;
      return { id: t.id, s: sT, u, v, dir: dirAt(Math.max(0, sT)), color: t.color };
    }
    const sT = spec && spec.tees[t.id] ? clamp(Lp - spec.tees[t.id] * YD, 0, Lp - 40) : Lp * (1 - t.ratio);
    const pt = pointAt(sT), dir = dirAt(sT);
    const off = (rng() - 0.5) * 3;
    return { id: t.id, s: sT, u: pt[0] + dir[1] * off, v: pt[1] - dir[0] * off, dir, color: t.color };
  });
  if (map) { const wt = tees.find(t => t.id === 'white'); atY = y => clamp(wt.s + y * YD, 0, Lp); }
  // 發球台正前方 45 公尺內、往前漸寬的走道
  const teeLane = (u, v) => {
    for (const t of tees) {
      const du = u - t.u, dv = v - t.v, a = du * t.dir[0] + dv * t.dir[1];
      if (a > -4 && a < 45 && Math.abs(du * t.dir[1] - dv * t.dir[0]) < 6 + Math.max(0, a) * 0.12) return true;
    }
    return false;
  };
  const inTee = (u, v, margin = 0) => {
    for (const t of tees) {
      const du = u - t.u, dv = v - t.v;
      const al = du * t.dir[0] + dv * t.dir[1], la = du * t.dir[1] - dv * t.dir[0];
      if (Math.abs(al) < 5.5 + margin && Math.abs(la) < 4 + margin) return t;
    }
    return null;
  };

  // 球道起點：自創球場每洞不一樣（spec.fwStart = 距白梯碼數；短的要先飛越一段長草）；spec.fwGap = 五桿洞中段切斷球道的長草帶
  const fs = par === 3 ? (spec && spec.fwStart != null && !map ? clamp(atY(spec.fwStart), 25, Lp - gry - 20) : Lp - gry - 30) : spec && spec.fwStart != null && !map ? clamp(atY(spec.fwStart), 60, Lp - 120) : clamp(Lp * 0.3, 110, 190);
  const fwGapS = spec && spec.fwGap != null && !map ? atY(spec.fwGap) : null;
  const fe = Lp - gry * 0.7;
  const roughW = course.roughW;

  // ---------- 浮島（星環浮島）：島上才有地面，其他地方是虛空（掉下去照峽谷規則）----------
  // islandF > 0 = 在島上。IG = 果嶺浮島（只有發球台和果嶺兩座島）、g1 / g2 = 球道中間有幾道虛空裂縫、nw = 窄島
  const gaps = [];
  if (isVoid && spec && spec.gaps) for (const g of spec.gaps) gaps.push({ s: atY(g.at), half: g.half });     // 挑戰關卡指定的裂縫
  else if (isVoid && par >= 4) {
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
  // 10 = 判讀時的暫用類別（不會出現）、11 = 廢沙地（Kiawah 這類「沙地不算沙坑」的球場，照一般區域打）
  const MAP_SURF = [SURF.OB, SURF.ROUGH, SURF.FAIRWAY, SURF.GREEN, SURF.TEE, SURF.SAND, SURF.WATER, SURF.ROUGH, SURF.DEEP, SURF.FRINGE, SURF.ROUGH, SURF.WASTE];
  function mapSurface(u, v) {
    const i = cellAt(u, v);
    if (i < 0) return SURF.OB;
    const c = MG.g[i];
    if (cross && cross.kind === 'valley' && c !== 3 && c !== 4 && !inTee(u, v)) { const { s, d } = near(u, v); if (crossDist(s, d) < 0) return SURF.OB; }
    if (c === 0 && inTee(u, v)) return SURF.TEE;                    // 梯台貼著圖邊（一部分在圖外）：發球台照樣是發球台
    if (c === 0) {
      // 圖外：OB 那一側直接界外；其他地方 14 公尺內是樹林（深草），再外面界外
      if (obSide) { const { d } = near(u, v); if (obSide * d > 0) return SURF.OB; }
      return MG.outD[i] * MG.mpp < 14 ? SURF.DEEP : SURF.OB;
    }
    for (const b of bunkers) if (b.grass && bunkerR(b, u, v) < 1) return SURF.DEEP;
    if (c === 3 && MG.gid[i] !== activeGid) return SURF.FRINGE;          // 今天沒用的那個果嶺
    if (c === 1 && MG.greenD[i] * MG.mpp < 1.6) return SURF.FRINGE;
    if (c !== 6 && c !== 5 && inTee(u, v)) return SURF.TEE;        // 各梯台的發球區（官網碼數的位置）
    if (c === 8 && teeLane(u, v)) return SURF.ROUGH;              // 發球台正前方的樹林邊改成長草（開球視野要清楚）
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
    if (moat && gr > moat.rIn && gr < moatOut(u, v)) return SURF.WATER;
    if (gr < 1) return SURF.GREEN;
    for (const b of bunkers) if (bunkerR(b, u, v) < 1) return b.grass ? SURF.DEEP : SURF.SAND;
    if (gr < fringeR) return SURF.FRINGE;
    for (const z of zones) if (Math.hypot(u - z.u, v - z.v) < z.r * (1 + 0.15 * nz2(u * 0.1, v * 0.1))) return z.surf;
    if (inTee(u, v)) return SURF.TEE;
    for (const w of washes) if (waterR(w, u, v) < 1) return SURF.WASTE;
    const fh = fwHalf(s, d > 0 ? 1 : -1);
    if (obSide && obSide * d > fh + 18 && s > 0 && s < Lp + 10 && gr > 2.2) return SURF.OB;
    if (s > fs && s < fe && !(fwGapS != null && Math.abs(s - fwGapS) < 9 + 3 * nz2(d * 0.05, 3))) {
      const taper = s < fs + 18 ? Math.sqrt((s - fs) / 18) : fwGapS != null && s > fwGapS && s < fwGapS + 24 ? Math.sqrt(clamp((s - fwGapS - 9) / 15, 0.05, 1)) : 1;
      if (ad < fh * taper) return SURF.FAIRWAY;
    }
    if (seaSide && seaSide * d > seaEdge(s) - 10) return SURF.WASTE;
    if (gr < 2.1 || ad < fh + roughW * (1 + 0.3 * nz2(s * 0.03, d > 0 ? 2 : 9))) return SURF.ROUGH;
    if (desertWaste) return SURF.WASTE;
    return F.has('ww') ? SURF.WASTE : SURF.DEEP;
  }

  // ---------- 8. 高度 ----------
  // 林克斯陸地的平滑地板：高度不低於約 1.3m（海面 -0.9m），下坡洞也不會低到被海面穿透
  const floorL = x => links ? 0.5 * (x + 0.8 + Math.sqrt((x - 0.8) ** 2 + 1)) : x;
  const gCenterBase = demH ? demH(G[0], G[1]) + 0.55 : baseElev(Lp) + st.macroA * nz.fbm(G[0] / st.macroL, G[1] / st.macroL, 3) * (HG ? 0.15 : 1) + 0.55 + lift + (HG ? hgAt(G[0], G[1]) : 0);
  const gCenterBaseF = demH ? gCenterBase : floorL(gCenterBase - 0.55) + 0.55;
  const teeBase = {};
  tees.forEach(t => (teeBase[t.id] = baseElev(t.s) + st.macroA * nz.fbm(t.u / st.macroL, t.v / st.macroL, 3) * (HG ? 0.15 : 1) + 0.7 + lift + (HG ? hgAt(t.u, t.v) : 0)));
  if (links && !demH) tees.forEach(t => (teeBase[t.id] = floorL(teeBase[t.id] - 0.7) + 0.7));
  if (demH) tees.forEach(t => (teeBase[t.id] = demH(t.u, t.v) + 0.45));          // 真實地形：梯台比旁邊略高一點
  // 大尺度起伏沿中心線取值：球道上只有前後起伏、左右是平的（避免球落地後往側邊滾進樹林），
  // 離開球道 4~30 公尺再慢慢恢復成真正的地形起伏
  const macro = (u, v) => st.macroA * nz.fbm(u / st.macroL, v / st.macroL, 3);
  const macroTab = [];
  for (let s = 0; s <= Lp + 2; s += 2) { const p = pointAt(s); macroTab.push(macro(p[0], p[1])); }
  const macroC0 = s => { const f = clamp(s, 0, Lp) / 2, i = Math.floor(f); return lerp(macroTab[i], macroTab[Math.min(i + 1, macroTab.length - 1)], f - i); };
  // 自創球場（@C）的落點平台：spec.lands = [距白梯碼數…]。沿中心線的大尺度起伏在落點前後 ±25 公尺幾乎不變（球停得住），
  //   起伏的變化移到落點之間（整條洞的總起伏不變）
  let macroC = macroC0;
  if (spec && spec.lands && !map) {
    const ls = spec.lands.map(y => atY(y)), n = Math.ceil(Lp / 2) + 2, cum = [0];
    for (let i = 1; i < n; i++) { const s = i * 2; let b = 0; for (const l of ls) b = Math.max(b, 1 - ss(25, 45, Math.abs(s - l))); cum.push(cum[i - 1] + 2 * (1 - 0.85 * b)); }
    const k = (n - 1) * 2 / cum[n - 1];
    macroC = s => { const f = clamp(s, 0, (n - 1) * 2) / 2, i = Math.floor(f); return macroC0(lerp(cum[i], cum[Math.min(i + 1, n - 1)], f - i) * k); };
  }
  // 真實地形的球道整地：沿中心線取 DEM 高度、前後 16 公尺平滑，球道上只留前後起伏、左右是平的
  //   （DEM 網格 30 公尺左右，山坡上的球道直接用會整條斜向一邊，開球停不住、都滾進樹林）；離開球道 4~30 公尺再慢慢回到真正的地形
  let profC = null;
  if (demH) {
    const raw = [];
    for (let s = 0; s <= Lp + 2; s += 2) { const p = pointAt(s); raw.push(demH(p[0], p[1])); }
    const n = raw.length, sm = raw.map((_, i) => { let a = 0, c = 0; for (let k = Math.max(0, i - 8); k <= Math.min(n - 1, i + 8); k++) { a += raw[k]; c++; } return a / c; });
    // 兩端接回梯台與果嶺的實際高度（果嶺前 30 公尺、梯台後 20 公尺內漸變），果嶺邊不會出現台階
    const gEnd = gCenterBase - 0.55, tEnd = raw[0];
    for (let i = 0; i < n; i++) { const s = i * 2; sm[i] = lerp(sm[i], gEnd, ss(Lp - 30, Lp, s)); sm[i] = lerp(tEnd, sm[i], ss(0, 20, s)); }
    profC = s => { const f = clamp(s, 0, Lp) / 2, i = Math.floor(f); return lerp(sm[i], sm[Math.min(i + 1, n - 1)], f - i); };
  }
  const rawH = (u, v, s, ad) => {
    if (demH) {
      const w = ss(fwBase / 2 + 4, fwBase / 2 + 30, ad);
      let hh = lerp(profC(s), demH(u, v), w) + st.microA * 0.7 * nz2.fbm(u / st.microL, v / st.microL, 3) * (0.12 + 0.88 * ss(fwBase / 2, fwBase / 2 + 20, ad));
      if (links) hh += 1.4 * Math.max(0, nz3.fbm(u / 18, v / 18, 2)) * ss(fwBase / 2 + 5, fwBase / 2 + 30, ad);
      return hh;
    }
    const w = ss(fwBase / 2 + 4, fwBase / 2 + 30, ad);
    // 林克斯球場整體墊高 3.5m，陸地一定高於海面（-0.9m），海面不會從球道透出來閃爍
    //   自製 / 修改過的球洞有自己畫的地形（map.hg）：照畫的高低，隨機起伏只留一點點
    let hh = baseElev(clamp(s, 0, Lp)) + lerp(macroC(s), macro(u, v), w) * (HG ? 0.15 : 1) + lift + (HG ? hgAt(u, v) : 0);
    const k = 0.12 + 0.88 * ss(fwBase / 2, fwBase / 2 + 20, ad);
    hh += st.microA * nz2.fbm(u / st.microL, v / st.microL, 3) * k;
    if (links) hh += 2.2 * Math.max(0, nz3.fbm(u / 22, v / 22, 2)) * ss(fwBase / 2 + 5, fwBase / 2 + 30, ad);
    return floorL(hh);
  };
  // 梯台要看得到前方：從梯台用 8° 仰角往打球方向看，前方 60 公尺內的地面都要在這條線下面；
  //   擋住的話把梯台墊高（最多 12 公尺，周圍做成緩坡土台）。海崖、山坡邊的梯台，DEM 查到的高度常常被崖下拉低，梯台變成陷在坑裡、前面一面牆
  const teeLift = {};
  const groundAt = demH ? (u, v) => { const q = near(u, v); return rawH(u, v, q.s, Math.abs(q.d)); }      // 整地後的地面
    : map ? (u, v) => rawH(u, v, near(u, v).s, 0) : null;      // 描圖球場（沒有 DEM）也檢查
  if (groundAt) tees.forEach(t => {
    let tu = G[0], tv = G[1];
    if (Math.hypot(G[0] - t.u, G[1] - t.v) > 160) for (const p of path) if (Math.hypot(p[0] - t.u, p[1] - t.v) >= 150) { tu = p[0]; tv = p[1]; break; }
    const L = Math.hypot(tu - t.u, tv - t.v) || 1, du = (tu - t.u) / L, dv = (tv - t.v) / L, k8 = Math.tan(rad(8));
    let need = -Infinity;
    for (let sd = 6; sd <= Math.min(60, L - 10); sd += 2) need = Math.max(need, groundAt(t.u + du * sd, t.v + dv * sd) - sd * k8);
    const lift = clamp(need - teeBase[t.id], 0, 12);
    teeBase[t.id] += lift; teeLift[t.id] = lift;
  });
  // 第二輪：後面的梯台也要看得過前面梯台的土台（前面的梯台墊得比較高時）
  if (groundAt) tees.forEach(t => {
    let need = -Infinity;
    for (const o of tees) {
      if (o === t) continue;
      const sd = (o.u - t.u) * t.dir[0] + (o.v - t.v) * t.dir[1], lat = Math.abs((o.u - t.u) * t.dir[1] - (o.v - t.v) * t.dir[0]);
      if (sd > 2 && sd < 60 && lat < 12) need = Math.max(need, teeBase[o.id] + 0.3 - Math.max(0, sd - 6) * Math.tan(rad(8)));
    }
    const lift = clamp(need - teeBase[t.id], 0, 12);
    if (lift > 0) { teeBase[t.id] += lift; teeLift[t.id] = (teeLift[t.id] || 0) + lift; }
  });
  waters.forEach(w => { w.level = rawH(w.u, w.v, near(w.u, w.v).s, 0) - 1.1; });
  if (moat) moat.level = gCenterBaseF - 1.3;
  if (cross) cross.level = rawH(...pointAt(cross.s), cross.s, 0) - (cross.kind === 'chasm' ? 26 : cross.kind === 'valley' ? 9 : 1.3);

  // 描圖水池的水面高度：取岸邊一圈（水池外 4 格內，含旁邊的果嶺 / 梯台）最低的地面再低 0.5 公尺。
  //   原本用水池中心的地面高度，地勢一邊高一邊低的地方，低的那一岸會比水面還低，水面就淹到岸上（蓋住球和擊球線）
  const seaIds = new Set();
  if (map && map.sea) for (const [u, v] of map.sea) { const ci = cellAt(u, v); if (ci >= 0 && MG.wid[ci] >= 0) seaIds.add(MG.wid[ci]); }
  if (map) MG.waters.forEach((w, id) => {
    if (seaIds.has(id)) { w.level = -0.95; return; }
    let lo = Infinity;
    for (let k = 0; k < MG.g.length; k += 2) {
      if (MG.nearW[k] !== id || MG.g[k] === 6 || MG.watOut[k] > 4.5) continue;
      const u = MG.u0 + (k % MG.W) * MG.mpp, v = MG.v0 - Math.floor(k / MG.W) * MG.mpp;
      let h = rawH(u, v, near(u, v).s, 0);
      if (greenR(u, v) < 2.0) h = Math.min(h, gCenterBaseF - 0.2);
      for (const t of tees) if (Math.hypot(u - t.u, v - t.v) < 10) h = Math.min(h, teeBase[t.id]);
      lo = Math.min(lo, h);
    }
    if (!Number.isFinite(lo)) { const u = MG.u0 + w.cx * MG.mpp, v = MG.v0 - w.cy * MG.mpp; lo = rawH(u, v, near(u, v).s, 0) - 0.6; }
    w.level = lo - 0.5;
  });
  function mapHeight(u, v, s, ad) {
    let hh = rawH(u, v, s, ad);
    const i = cellAt(u, v);
    const od = i < 0 ? 200 : MG.outD[i] * MG.mpp;
    // 畫面外慢慢抬升，形成樹林山坡（有真實地形的球場不用）
    if (!demH) hh += ss(6, 70, od) * st.edgeRise * (0.6 + 0.6 * nz3.fbm(u / 80, v / 80, 2));
    for (const t of tees) {
      const du = u - t.u, dv = v - t.v;
      const al = Math.abs(du * t.dir[0] + dv * t.dir[1]) - 5.5, la = Math.abs(du * t.dir[1] - dv * t.dir[0]) - 4;
      const e = Math.max(al, la), B = 4 + (teeLift[t.id] || 0) * 1.8;          // 墊高的梯台周圍緩坡跟著加寬
      if (e < B) hh = lerp(teeBase[t.id], hh, ss(0, B, e));
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
      else { const bd = MG.watOut[i] * MG.mpp; if (bd < 5) hh = Math.max(Math.min(hh, lerp(w.level + 0.3, hh, ss(0, 5, bd))), w.level + 0.15); }     // 岸上一定比水面高
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
      hh = lerp(hh, -3.2, theme === 'cliffs' ? ss(-6, 4, beyond) : ss(-14, 3, beyond));
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
    for (const w of washes) { const wr = waterR(w, u, v); if (wr < 1.4) hh -= gk * 1.7 * ss(1.4, 0.75, wr); }
    if (cross) {
      const cd = crossDist(s, d);
      if (cd < (cross.kind === 'chasm' || cross.kind === 'valley' ? 2 : 5)) {
        if (cross.kind === 'chasm' || cross.kind === 'valley') hh = lerp(hh, cross.level, ss(0.5, -2.5, cd));
        else hh = Math.min(hh, lerp(cross.level - 0.6, hh, ss(-0.5, 5, cd)));
      }
    }
    if (moat) {
      const gr0 = greenR(u, v), ro = moatOut(u, v);
      if (gr0 > moat.rIn - 0.15 && gr0 < ro + 0.3) {
        const e = Math.min(gr0 - moat.rIn, ro - gr0) * Math.min(grx, gry);
        hh = Math.min(hh, lerp(moat.level + 0.35, moat.level - 1.4, ss(-0.6, 3, e)));
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
  // 編輯器指定的旗桿位置（map.pin，在果嶺上才用）；沒有的話每回合在果嶺上挑一個平的地方
  if (map && map.pin && surface(map.pin[0], map.pin[1]) === SURF.GREEN) pin = [map.pin[0], map.pin[1]];
  for (let i = 0; i < (pin ? 0 : 10); i++) {
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

  // ---------- 9.5 奇幻機關 ----------
  // 球碰到機關時，遊戲從那一點用同一套物理重新起飛（game.js applySpecials），物理公式本身不變
  //   fr1 / fr2 螢火之環：球從環中穿過 → 速度 ×1.3
  //   pt 星門：球穿過入口 → 從果嶺附近的出口飛出（速度不變）
  //   gv 噴發口：球落到噴發口 → 被噴上天往前飛
  //   mu 彈跳巨菇：球落在菇傘上 → 彈起來
  //   iw 冰鏡牆：球撞到冰牆 → 反彈
  const specials = [];
  const sW = (tees.find(t => t.id === 'white') || tees[0]).s;
  const srng = makeRng(seed + 77);
  const at = (sA, lat) => { const p = pointAt(sA), d = dirAt(sA); return [p[0] + d[1] * lat, p[1] - d[0] * lat, d]; };
  const okSpot = (u, v) => { const sf = surface(u, v); return sf !== SURF.WATER && sf !== SURF.CHASM && sf !== SURF.GREEN && sf !== SURF.TEE && sf !== SURF.OB; };
  if (F.has('fr1') || F.has('fr2')) {
    const list = par === 3 ? [[(sW + Lp - gry) / 2, 11 + srng() * 4, 4.6]] : [[sW + 100 + srng() * 25, 13 + srng() * 5, 4.6]];
    if (F.has('fr2')) list.push([Lp - gry - 55 - srng() * 25, 7 + srng() * 3, 4.2]);
    for (const [sA, hgt, r] of list) {
      const [u, v, d] = at(sA, (srng() - 0.5) * 8);
      specials.push({ kind: 'ring', u, v, y: height(u, v) + hgt, r, dir: d, boost: 1.3 });
    }
  }
  if (F.has('pt')) {
    const sIn = par === 3 ? sW + 30 : sW + clamp(Lp * 0.36, 110, 170) + srng() * 20;
    const sOut = Lp - gry - (par === 3 ? 18 : 45);
    const [u, v, d] = at(sIn, (srng() - 0.5) * 10), [eu, ev, ed] = at(sOut, (srng() - 0.5) * 6);
    // 高度用島面（入口可能剛好懸在虛空裂縫上方，正好穿過星門跳過裂縫）
    const top = (uu, vv, ss0) => Math.max(height(uu, vv), rawH(uu, vv, ss0, 0));
    specials.push({ kind: 'portal', u, v, y: top(u, v, sIn) + 5.5, r: 5, dir: d, exit: { u: eu, v: ev, y: top(eu, ev, sOut) + 6, dir: ed } });
  }
  if (F.has('gv')) {
    for (let i = 0, tries = 0; i < 4 && tries < 40; tries++) {
      const sA = lerp(sW + 140, Lp - gry - 35, srng()), lat = (srng() - 0.5) * fwBase * 1.5;
      const [u, v] = at(sA, lat);
      if (!okSpot(u, v) || specials.some(q => Math.hypot(q.u - u, q.v - v) < 25)) continue;
      specials.push({ kind: 'vent', u, v, y: height(u, v), r: 3.6, avoid: 6 }); i++;
    }
  }
  if (F.has('mu')) {
    for (let i = 0, tries = 0; i < 6 && tries < 60; tries++) {
      const sA = lerp(sW + 70, Lp - gry - 25, srng());
      const side = srng() < 0.5 ? -1 : 1, mid = srng() < 0.3;
      const r = 4 + srng() * 2.5, lat = mid ? (srng() - 0.5) * fwBase * 0.5 : side * (fwHalf(sA, side) + r * 0.4 + srng() * 6);
      const [u, v] = at(sA, lat);
      if (!okSpot(u, v) || specials.some(q => Math.hypot(q.u - u, q.v - v) < (q.r || 4) + r + 6)) continue;
      const gh = height(u, v);
      specials.push({ kind: 'shroom', u, v, y: gh, top: gh + 3.5 + srng() * 3.5, r, tint: srng(), avoid: r + 3 }); i++;
    }
  }
  if (F.has('iw')) {
    // 球道兩側的冰牆（擋住往外飛的球），狗腿洞在彎道外側多一道斜牆
    const segs = [];
    for (let i = 0; i < 3; i++) segs.push([lerp(sW + 120, Lp - gry - 40, (i + 0.5) / 3) + (srng() - 0.5) * 30, srng() < 0.5 ? -1 : 1, 26 + srng() * 18]);
    if (par >= 4 && Math.abs(bend) >= 15) segs.push([clamp(L * (F.has('E') ? 0.4 : F.has('J') ? 0.75 : 0.6), 140, 300) + 15, bend > 0 ? -1 : 1, 40]);
    for (const [sA, side, len] of segs) {
      const lat = side * (fwHalf(sA, side) + 5 + srng() * 4);
      const a = at(sA - len / 2, lat), b = at(sA + len / 2, lat);
      if (!okSpot(a[0], a[1]) || !okSpot(b[0], b[1])) continue;
      specials.push({ kind: 'wall', a: [a[0], a[1]], b: [b[0], b[1]], y0: Math.min(height(a[0], a[1]), height(b[0], b[1])), h: 4, u: (a[0] + b[0]) / 2, v: (a[1] + b[1]) / 2, avoid: len / 2 + 3 });
    }
  }
  // ---- 奇幻球場第二批的機關 ----
  //   hy 蜂蜜池：球碰到蜂蜜（落地或滾進去）→ 立刻黏住停下
  //   gr 轉向齒輪：球碰到旋轉中的齒輪盤 → 從齒輪邊緣往轉過去的方向甩出去
  //   ws 引魂燈：球從燈旁邊飛過 → 水平方向被拉向旗桿（速度不變）
  //   bp 彈珠柱：球撞到柱子 → 加速彈開
  //   cl 雷雲：球穿過雷雲 → 被閃電打中，幾乎垂直掉下來
  const fwAt = (sA, side) => fwHalf(sA, side);
  if (F.has('hy')) {
    // 一塊在果嶺前（接住打短的球），其他在開球落點兩側與果嶺後
    const list = [[Lp - gry - 10 - srng() * 8, (srng() - 0.5) * 8, 4.5 + srng()]];
    if (par >= 4) for (let i = 0; i < (par === 5 ? 3 : 2); i++) { const sA = sW + 190 + srng() * 70 + i * (par === 5 ? 90 : 0), side = srng() < 0.5 ? -1 : 1; list.push([sA, side * (fwAt(sA, side) * (0.6 + srng() * 0.6)), 4.5 + srng() * 1.5]); }
    if (srng() < 0.6) list.push([Lp + gry + 8, (srng() - 0.5) * 6, 4.5]);
    for (const [sA, lat, r] of list) {
      const [u, v] = at(sA, lat);
      if (!okSpot(u, v) || specials.some(q => Math.hypot(q.u - u, q.v - v) < (q.r || 4) + r + 4)) continue;
      specials.push({ kind: 'honey', u, v, y: height(u, v), r, avoid: r + 2 });
    }
  }
  if (F.has('gr')) {
    // 狗腿洞的轉角放一個（往彎過去的方向轉），其他是隨機方向的齒輪（轉向 35~60 度）
    const list = [];
    if (par >= 4 && Math.abs(bend) >= 15) list.push([clamp(L * (F.has('E') ? 0.4 : F.has('J') ? 0.75 : 0.6), 140, 300) , 0, clamp(rad(bend) * 0.9, -1.2, 1.2)]);
    const extra = par === 3 ? 1 : par === 4 ? 1 : 2;
    for (let i = 0; i < extra; i++) list.push([lerp(sW + 150, Lp - gry - 45, srng()), (srng() - 0.5) * fwBase, (srng() < 0.5 ? -1 : 1) * rad(35 + srng() * 25)]);
    for (const [sA, lat, turn] of list) {
      const [u, v] = at(sA, lat);
      if (!okSpot(u, v) || specials.some(q => Math.hypot(q.u - u, q.v - v) < 16)) continue;
      specials.push({ kind: 'gear', u, v, y: height(u, v), r: 5, turn, avoid: 7 });
    }
  }
  if (F.has('ws')) {
    const n = par === 3 ? 1 : par === 4 ? 2 : 3;
    for (let i = 0; i < n; i++) {
      const sA = par === 3 ? (sW + Lp - gry) / 2 : lerp(sW + 120, Lp - gry - 60, (i + 0.3 + srng() * 0.4) / n), side = srng() < 0.5 ? -1 : 1;
      const [u, v] = at(sA, side * fwAt(sA, side) * (0.4 + srng() * 0.9));
      specials.push({ kind: 'wisp', u, v, y: Math.max(height(u, v), rawH(u, v, sA, 0)) + 9 + srng() * 7, r: 6, skipT: 1.2 });
    }
  }
  if (F.has('bp')) {
    // 球道兩側一根根的彈珠柱，果嶺兩旁各一根
    const list = [];
    const n = par === 3 ? 2 : par === 4 ? 4 : 6;
    for (let i = 0; i < n; i++) { const sA = lerp(sW + 120, Lp - gry - 30, (i + 0.5) / n) + (srng() - 0.5) * 20, side = i % 2 ? 1 : -1; list.push([sA, side * (fwAt(sA, side) + 1 + srng() * 4)]); }
    if (srng() < 0.5) { const sA = lerp(sW + 160, Lp - gry - 60, srng()); list.push([sA, (srng() - 0.5) * fwBase * 0.4]); }     // 偶爾一根在球道中間
    for (const sd of [-1, 1]) list.push([Lp, sd * (grx + 4 + srng() * 2)]);
    for (const [sA, lat] of list) {
      const [u, v] = at(sA, lat);
      if (!okSpot(u, v) || specials.some(q => Math.hypot(q.u - u, q.v - v) < 8)) continue;
      specials.push({ kind: 'bumper', u, v, y: height(u, v), r: 1.8, h: 3.2, avoid: 4, skipT: 0.3 });
    }
  }
  if (F.has('cl')) {
    // 一朵在開球落點附近、一朵在果嶺前或後；五桿洞多一朵
    const list = par === 3 ? [[(sW + Lp - gry) / 2 + 10, (srng() - 0.5) * 16]] : [[sW + 170 + srng() * 60, (srng() < 0.5 ? -1 : 1) * (8 + srng() * 10)]];
    list.push([srng() < 0.5 ? Lp - gry - 22 : Lp + gry + 14, (srng() - 0.5) * 12]);
    if (par === 5) list.push([lerp(sW + 280, Lp - 120, srng()), (srng() - 0.5) * 20]);
    for (const [sA, lat] of list) {
      const [u, v] = at(sA, lat);
      specials.push({ kind: 'cloud', u, v, y: Math.max(height(u, v), rawH(u, v, sA, 0)) + 17 + srng() * 6, r: 8, th: 3.6, skipT: 4 });
    }
  }
  // ---- 奇幻球場第三批：挑戰模式的地面機關自動擺位 ----
  //   tp 彈跳床：開球落點與第二桿落點各幾塊、果嶺前一塊（接打短的球）
  //   bo 加速帶：球道中間一段段朝向果嶺（沿球道方向）
  //   cn 大砲：開球落點附近一座，轟向果嶺
  if (F.has('tp')) {
    const list = [[Lp - gry - 14 - srng() * 6, (srng() - 0.5) * 6]];
    const n = par === 3 ? 1 : par === 4 ? 3 : 4;
    for (let i = 0; i < n; i++) { const sA = par === 3 ? lerp(sW + 40, Lp - gry - 30, srng()) : lerp(sW + 170, Lp - gry - 50, (i + srng()) / n), side = srng() < 0.5 ? -1 : 1; list.push([sA, side * fwAt(sA, side) * srng() * 0.8]); }
    for (const [sA, lat] of list) {
      const [u, v] = at(sA, lat), r = 3.8 + srng() * 1.2;
      if (!okSpot(u, v) || specials.some(q => Math.hypot(q.u - u, q.v - v) < (q.r || 4) + r + 6)) continue;
      specials.push({ kind: 'tramp', u, v, y: height(u, v), r, avoid: r + 3 });
    }
  }
  if (F.has('bo')) {
    const n = par === 3 ? 1 : par === 4 ? 2 : 3;
    for (let i = 0; i < n; i++) {
      const sA = par === 3 ? lerp(sW + 50, Lp - gry - 30, 0.5 + (srng() - 0.5) * 0.3) : lerp(sW + 200, Lp - gry - 60, (i + 0.3 + srng() * 0.4) / n);
      const [u, v, d] = at(sA, (srng() - 0.5) * fwBase * 0.4);
      if (!okSpot(u, v) || specials.some(q => Math.hypot(q.u - u, q.v - v) < 14)) continue;
      specials.push({ kind: 'boost', u, v, y: height(u, v), r: 4.5, dir: d, avoid: 7 });
    }
  }
  if (F.has('cn') && par >= 4) {
    for (let tries = 0; tries < 8; tries++) {
      const sA = sW + 200 + srng() * 50, [u, v] = at(sA, (srng() - 0.5) * fwBase * 0.6);
      if (!okSpot(u, v)) continue;
      specials.push({ kind: 'cannon', u, v, y: height(u, v), r: 4.2, target: [G[0], G[1]], ty: gCenterBaseF, avoid: 7 });
      break;
    }
  }
  // 挑戰關卡指定位置的機關：at = 距發球台碼數、lat = 橫向（公尺，右正）、h = 離地高度；orb = 金球（只收集，不改變飛行）
  if (spec && spec.specials) {
    let orbIdx = 0;
    for (const q of spec.specials) {
      const sA = atY(q.at), [u, v, d] = at(sA, q.lat || 0);
      const gh = Math.max(height(u, v), rawH(u, v, sA, 0));
      if (q.kind === 'ring' || q.kind === 'orb') specials.push({ kind: q.kind, u, v, y: gh + (q.h ?? 12), r: q.r ?? (q.kind === 'orb' ? 2.6 : 4.6), dir: d, boost: 1.3, idx: q.kind === 'orb' ? orbIdx++ : undefined });
      else if (q.kind === 'portal') {
        const sB = atY(q.exitAt), [eu, ev, ed] = at(sB, q.exitLat || 0);
        specials.push({ kind: 'portal', u, v, y: gh + (q.h ?? 5.5), r: q.r ?? 5, dir: d, exit: { u: eu, v: ev, y: Math.max(height(eu, ev), rawH(eu, ev, sB, 0)) + 6, dir: ed } });
      } else if (q.kind === 'vent') specials.push({ kind: 'vent', u, v, y: gh, r: q.r ?? 3.6, avoid: 6 });
      else if (q.kind === 'tramp') specials.push({ kind: 'tramp', u, v, y: gh, r: q.r ?? 4, avoid: (q.r ?? 4) + 3 });
      else if (q.kind === 'boost') {
        const an = rad(q.ang || 0), bd = [d[0] * Math.cos(an) + d[1] * Math.sin(an), -d[0] * Math.sin(an) + d[1] * Math.cos(an)];
        specials.push({ kind: 'boost', u, v, y: gh, r: q.r ?? 4.5, dir: bd, avoid: 7 });
      } else if (q.kind === 'cannon') specials.push({ kind: 'cannon', u, v, y: gh, r: q.r ?? 3.6, target: [G[0], G[1]], ty: gCenterBaseF, avoid: 7 });
      else if (q.kind === 'shroom') specials.push({ kind: 'shroom', u, v, y: gh, top: gh + (q.h ?? 5), r: q.r ?? 5, tint: q.tint ?? srng(), avoid: (q.r ?? 5) + 3 });
      else if (q.kind === 'wall') {
        const len = q.len || 40, an = rad(q.ang || 0), wd = [d[0] * Math.cos(an) + d[1] * Math.sin(an), -d[0] * Math.sin(an) + d[1] * Math.cos(an)];
        const a = [u - wd[0] * len / 2, v - wd[1] * len / 2], b = [u + wd[0] * len / 2, v + wd[1] * len / 2];
        specials.push({ kind: 'wall', a, b, y0: Math.min(height(a[0], a[1]), height(b[0], b[1])), h: q.h || 4, u, v, avoid: len / 2 + 3 });
      }
    }
  }
  const nearSpecial = (u, v) => specials.some(q => q.avoid && Math.hypot(q.u - u, q.v - v) < q.avoid);

  // ---------- 10. 樹木 ----------
  const trees = [];
  const treeGrid = new Map();
  const key = (x, z) => Math.floor(x / 10) + ',' + Math.floor(z / 10);
  // 開球區要視野清楚：每個發球台後方 10 公尺到前方 90 公尺、往前越來越寬的扇形裡不種樹（描圖的樹林邊緣常常貼著發球台）
  // 瀑布（spec.falls）：果嶺邊的岩壁與瀑布位置，只有外觀；cave = 白梯在瀑布後的洞穴裡（洞穴、岩壁的範圍也不種樹）
  const falls = spec && spec.falls ? spec.falls.map(f => { const [u, v] = nearGreen(f.g, f.d); return { u, v, w: f.w, h: f.h, club: !!f.club, face: Math.atan2(G[0] - u, G[1] - v) }; }) : [];
  const caveTee = spec && spec.cave ? tees.find(t => t.id === 'white') : null;
  const teeBlocked = (x, z, r) => {
    const u = x, v = -z;
    for (const f of falls) if (Math.hypot(u - f.u, v - f.v) < f.w * 0.7 + 6 + r) return true;
    if (caveTee) {
      const du = u - caveTee.u, dv = v - caveTee.v, a = du * caveTee.dir[0] + dv * caveTee.dir[1], lat = Math.abs(du * caveTee.dir[1] - dv * caveTee.dir[0]);
      if (a > -34 && a < 14 && lat - r < 36) return true;
    }
    for (const t of tees) {
      const du = u - t.u, dv = v - t.v, a = du * t.dir[0] + dv * t.dir[1], lat = Math.abs(du * t.dir[1] - dv * t.dir[0]);
      if (a > -10 && a < 90 && lat - r < 9 + Math.max(0, a) * 0.22) return true;
    }
    return false;
  };
  const addTree = t => {
    if (teeBlocked(t.x, t.z, t.r || 0)) return;
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
  // 自創球場（@C，spec.lands）：每個梯台往開球落點的球路（前方約 190 公尺、往前漸寬的扇形）不種樹，開球前面不會剛好一棵樹
  const teeLines = spec && spec.lands && !map ? tees.filter(t => ['black', 'white', 'red'].includes(t.id)).map(t => {
    const tgt = par === 3 ? [G[0], G[1]] : pointAt(Math.min(Lp - 20, t.s + (t.id === 'red' ? 175 : 210)));
    const D = Math.hypot(tgt[0] - t.u, tgt[1] - t.v) || 1;
    return { u: t.u, v: t.v, du: (tgt[0] - t.u) / D, dv: (tgt[1] - t.v) / D, D };
  }) : null;
  const inTeeLine = (u, v) => {
    if (!teeLines) return false;
    for (const l of teeLines) {
      const a = (u - l.u) * l.du + (v - l.v) * l.dv;
      if (a < -3 || a > l.D) continue;
      if (Math.abs((u - l.u) * l.dv - (v - l.v) * l.du) < 7 + a * 0.05) return true;
    }
    return false;
  };
  const area = (bbox.maxU - bbox.minU) * (bbox.maxV - bbox.minV);
  const attempts = Math.floor(area / 18 * Math.min(1.4, course.trees * (F.has('tr') ? 1.35 : 1)) + (canyon ? area / 60 : 0));
  // 奇幻主題的樹：叢林 = 棕櫚 / 大闊葉 / 蕨類，熔岩 = 玄武岩柱 / 枯樹 / 岩石，浮島 = 水晶
  const pick = list => { let w = list.reduce((a, x) => a + x[1], 0) * trng(); for (const x of list) { w -= x[1]; if (w <= 0) return x; } return list[0]; };
  const mk = x => ({ type: x[0], h: lerp(x[2], x[3], trng()), r: lerp(x[4], x[5], trng()), ...(x[6] || {}) });
  const themeTree = (ad, minAd) => {
    if (TD) {
      if (TD.dens === 'park' ? trng() > 0.35 + 0.65 * ss(minAd, minAd + 14, ad) : trng() > TD.dens) return null;
      return mk(pick(TD.trees));
    }
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
    if (theme === 'tropical') {
      if (trng() > 0.6) return null;
      return r0 < 0.6 ? { type: 'palm', h: 10 + trng() * 8, r: 3.3 + trng() * 1.2 } : r0 < 0.85 ? { type: 'broad', h: 8 + trng() * 6, r: 3.5 + trng() * 2, jungle: 1 } : { type: 'fern', h: 1.2 + trng(), r: 1.5 + trng() };
    }
    if (theme === 'cliffs') {
      if (trng() > 0.55) return null;
      return r0 < 0.45 ? { type: 'pine', h: 9 + trng() * 7, r: 3.2 + trng() * 1.8, cypress: 1 } : r0 < 0.8 ? { type: 'shrub', h: 1 + trng() * 0.8, r: 1.3 + trng() } : { type: 'rock', h: 1.2 + trng() * 2.5, r: 1 + trng() * 2 };
    }
    if (theme === 'alpine') {
      if (trng() > 0.3 + 0.7 * ss(minAd, minAd + 14, ad)) return null;
      return r0 < 0.78 ? { type: 'pine', h: 14 + trng() * 12, r: 2.8 + trng() * 1.2 } : r0 < 0.92 ? { type: 'broad', h: 10 + trng() * 6, r: 3 + trng() * 1.5, birch: 1 } : { type: 'rock', h: 1.5 + trng() * 3, r: 1.2 + trng() * 2.4 };
    }
    if (theme === 'sakura') {
      if (trng() > 0.32 + 0.68 * ss(minAd, minAd + 12, ad)) return null;
      return r0 < 0.5 ? { type: 'broad', h: 8 + trng() * 5, r: 4 + trng() * 2.2, sakura: 1 } : r0 < 0.8 ? { type: 'bamboo', h: 10 + trng() * 6, r: 2 + trng() * 1.5 } : { type: 'pine', h: 7 + trng() * 4, r: 3 + trng(), bonsai: 1 };
    }
    if (theme === 'dunes') {
      if (trng() > 0.4) return null;
      return r0 < 0.55 ? { type: 'palm', h: 9 + trng() * 7, r: 3 + trng() } : r0 < 0.85 ? { type: 'shrub', h: 0.8 + trng() * 0.6, r: 1 + trng() * 0.8 } : { type: 'rock', h: 1 + trng() * 1.5, r: 1 + trng() * 1.5 };
    }
    if (theme === 'salt') {
      if (trng() > 0.25) return null;
      return r0 < 0.6 ? { type: 'rock', h: 0.8 + trng() * 2, r: 1 + trng() * 2 } : { type: 'deadtree', h: 4 + trng() * 4, r: 2 };
    }
    if (theme === 'mushroom') {
      if (trng() > 0.3 + 0.7 * ss(minAd, minAd + 12, ad)) return null;
      return r0 < 0.45 ? { type: 'shroom', h: 4 + trng() * 7, r: 2 + trng() * 2.5 }
        : r0 < 0.75 ? { type: 'broad', h: 12 + trng() * 8, r: 4 + trng() * 2.5, night: 1 }
          : { type: 'fern', h: 1.2 + trng(), r: 1.4 + trng() * 1.2, night: 1 };
    }
    if (theme === 'frost') {
      if (trng() > 0.25 + 0.75 * ss(minAd, minAd + 14, ad)) return null;
      return r0 < 0.62 ? { type: 'pine', h: 12 + trng() * 9, r: 3 + trng() * 1.3, snow: 1 }
        : r0 < 0.85 ? { type: 'icespike', h: 3 + trng() * 6, r: 1 + trng() * 1.3 }
          : { type: 'rock', h: 1 + trng() * 2, r: 0.9 + trng() * 1.6 };
    }
    if (trng() > 0.5) return null;
    return r0 < 0.78 ? { type: 'crystal', h: 3 + trng() * 7, r: 1 + trng() * 1.4 } : { type: 'rock', h: 1 + trng() * 2, r: 0.8 + trng() * 1.6 };
  };
  // 碰撞球的中心高度與半徑
  const treeColl = t => {
    const k = { rock: [0.3, 0.8], pine: [0.5, 0.9], palm: [0.93, 0.75], basalt: [0.45, 0.85], crystal: [0.4, 0.8], icespike: [0.4, 0.8], deadtree: [0.62, 0.55], shroom: [0.85, 1], bamboo: [0.55, 0.7],
      lolli: [0.85, 1], gumdrop: [0.4, 0.9], lantern: [0.5, 0.6], obelisk: [0.5, 0.9], dome: [0.3, 0.9], coral: [0.55, 0.75],
      flower: [0.85, 0.9], grave: [0.45, 0.8], pumpkin: [0.45, 0.9], block: [0.5, 0.95], chimney: [0.5, 0.9], cog: [0.55, 1.2] }[t.type] || [0.66, 1];
    t.cy = t.y + t.h * k[0];
    t.cr = t.type === 'cactus' ? 0.6 : t.r * k[1];
    if (t.type === 'cactus') t.cy = t.y + t.h * 0.5;
  };
  const localTree = (kind, src) => {
    const r0 = trng();
    if (kind === 'gorse') return src === 'n' ? { type: 'broad', h: 7 + trng() * 4, r: 3 + trng() * 1.5 } : { type: 'shrub', h: 1.3 + trng() * 0.8, r: 1.6 + trng() * 1.2, gorse: 1 };
    if (kind === 'cypress') return r0 < 0.75 || src === 'n' ? { type: 'broad', h: 12 + trng() * 8, r: 5 + trng() * 2.5, mcyp: 1 } : { type: 'pine', h: 14 + trng() * 8, r: 3 + trng() };
    if (kind === 'jpine') return r0 < 0.7 ? { type: 'broad', h: 8 + trng() * 6, r: 3.6 + trng() * 1.6, jpine: 1 } : { type: 'broad', h: 9 + trng() * 5, r: 3.4 + trng() * 1.8, jungle: 1 };
    if (kind === 'florida') return r0 < 0.55 ? { type: 'pine', h: 16 + trng() * 9, r: 2.8 + trng() } : r0 < 0.8 ? { type: 'palm', h: 9 + trng() * 6, r: 3 + trng() } : { type: 'broad', h: 9 + trng() * 5, r: 4.5 + trng() * 2 };      // 佛州：高瘦的松、棕櫚、橡樹
    // 海岸沙丘（Kiawah）：大多是低矮的棕櫚灌叢與海濱植物，偶爾一棵矮棕櫚、海岸活橡樹
    if (kind === 'dune') return r0 < 0.7 && src !== 'n' ? { type: 'shrub', h: 1.1 + trng() * 1.1, r: 1.5 + trng() * 1.3, jungle: 1 } : r0 < 0.88 ? { type: 'palm', h: 6 + trng() * 5, r: 2.6 + trng() } : { type: 'broad', h: 6 + trng() * 4, r: 4.5 + trng() * 2 };
    // 墨爾本沙帶地：茶樹叢（矮、圓）與高瘦的尤加利
    if (kind === 'sandbelt') return r0 < 0.45 && src !== 'n' ? { type: 'shrub', h: 2.6 + trng() * 1.6, r: 2.4 + trng() * 1.2 } : { type: 'broad', h: 13 + trng() * 8, r: 4 + trng() * 2 };
    // ---- 非真實球場（@C）用的地區樹種 ----
    // 喬治亞州：高聳的火炬松，林下開著杜鵑與山茱萸
    if (kind === 'azalea') return r0 < 0.72 || src === 'n' ? { type: 'pine', h: 22 + trng() * 10, r: 2.6 + trng() * 0.8, tall: 1 } : r0 < 0.95 ? { type: 'shrub', h: 1.2 + trng() * 0.7, r: 1.5 + trng(), azalea: 1 } : { type: 'broad', h: 5 + trng() * 2, r: 1.8 + trng() * 0.7, dogwood: 1 };
    // 北卡沙丘地：稀疏的長葉松，地上是一叢叢鐵線草
    if (kind === 'longleaf') return r0 < 0.6 || src === 'n' ? { type: 'pine', h: 18 + trng() * 9, r: 2.4 + trng() * 0.8, tall: 1 } : { type: 'shrub', h: 0.7 + trng() * 0.4, r: 0.9 + trng() * 0.5, wire: 1 };
    // 美國東北 / 中西部林木球場：大橡樹、楓樹、少量松
    if (kind === 'oak') return r0 < 0.6 ? { type: 'broad', h: 14 + trng() * 8, r: 5 + trng() * 2.5, oak: 1 } : r0 < 0.82 ? { type: 'maple', h: 12 + trng() * 6, r: 4.5 + trng() * 2 } : { type: 'pine', h: 16 + trng() * 6, r: 3 + trng() };
    // 英國石南荒原：歐洲赤松、白樺，地面是紫色石南
    if (kind === 'heath') return r0 < 0.45 || src === 'n' ? { type: 'pine', h: 15 + trng() * 8, r: 3 + trng(), scots: 1 } : r0 < 0.7 ? { type: 'broad', h: 10 + trng() * 5, r: 3 + trng() * 1.4, birch: 1 } : { type: 'shrub', h: 0.8 + trng() * 0.5, r: 1.6 + trng(), heather: 1 };
    // 太平洋西北：又高又暗的花旗松
    if (kind === 'fir') return { type: 'pine', h: 24 + trng() * 12, r: 3 + trng() * 1.2, fir: 1 };
    // 索諾拉沙漠：仙人掌、假紫荊灌木、偶爾一棵棕櫚
    if (kind === 'desert') return r0 < 0.45 ? { type: 'cactus', h: 3 + trng() * 4, r: 0.8 } : r0 < 0.85 ? { type: 'shrub', h: 2.4 + trng() * 2, r: 2.2 + trng() * 1.4, palo: 1 } : { type: 'palm', h: 10 + trng() * 6, r: 3 + trng() };
    // 美國東南低地：垂著鬆蘿的活橡樹、棕櫚灌叢、松
    if (kind === 'lowcountry') return r0 < 0.5 ? { type: 'broad', h: 10 + trng() * 5, r: 6 + trng() * 3, liveoak: 1 } : r0 < 0.75 ? { type: 'pine', h: 18 + trng() * 8, r: 2.8 + trng(), tall: 1 } : { type: 'palm', h: 6 + trng() * 4, r: 2.6 + trng() };
    // 南加州：尤加利、松，球道邊偶爾一棵棕櫚
    if (kind === 'eucalyptus') return r0 < 0.6 ? { type: 'broad', h: 16 + trng() * 9, r: 4 + trng() * 2, euc: 1 } : r0 < 0.85 ? { type: 'pine', h: 14 + trng() * 6, r: 3 + trng() } : { type: 'palm', h: 12 + trng() * 8, r: 3 + trng() };
    if (kind === 'tropic') return r0 < 0.35 ? { type: 'palm', h: 9 + trng() * 7, r: 3 + trng() } : r0 < 0.8 ? { type: 'broad', h: 6 + trng() * 5, r: 3 + trng() * 2, jungle: 1 } : { type: 'shrub', h: 1.6 + trng(), r: 1.8 + trng(), jungle: 1 };
    return null;
  };
  // 編輯器指定的樹種
  const kindTree = k => {
    const R = trng;
    switch (k) {
      case 'broad': return { type: 'broad', h: 11 + R() * 6, r: 3.4 + R() * 2.2 };
      case 'pine': return { type: 'pine', h: 14 + R() * 10, r: 3 + R() };
      case 'maple': return { type: 'maple', h: 9 + R() * 5, r: 3.4 + R() * 1.8 };
      case 'autumn': return { type: 'broad', h: 10 + R() * 6, r: 3.6 + R() * 2, autumn: 1 };
      case 'palm': return { type: 'palm', h: 9 + R() * 7, r: 3 + R() };
      case 'jungle': return { type: 'broad', h: 7 + R() * 6, r: 3.2 + R() * 2, jungle: 1 };
      case 'sakura': return { type: 'broad', h: 8 + R() * 5, r: 4 + R() * 2, sakura: 1 };
      case 'birch': return { type: 'broad', h: 10 + R() * 6, r: 3 + R() * 1.5, birch: 1 };
      case 'cypress': return { type: 'broad', h: 12 + R() * 8, r: 5 + R() * 2.5, mcyp: 1 };
      case 'jpine': return { type: 'broad', h: 8 + R() * 6, r: 3.6 + R() * 1.6, jpine: 1 };
      case 'bamboo': return { type: 'bamboo', h: 10 + R() * 6, r: 2 + R() * 1.5 };
      case 'shrub': return { type: 'shrub', h: 1.6 + R(), r: 1.8 + R() };
    }
    return null;
  };
  const plantMapTree = (u, v, big, src, kind) => {
    const pine = trng() < 0.25;
    const t = (kind && kindTree(kind)) || (course.treeKind && localTree(course.treeKind, src)) || { type: pine ? 'pine' : (trng() < 0.1 ? 'maple' : 'broad'), h: (pine ? 14 : 11) + trng() * (big ? 9 : 6), r: pine ? 3 + trng() : 3.4 + trng() * 2.2 };
    const x = u, z = -v;
    if (tooClose(x, z, t.r * 0.75)) return;
    // 樹位置加了隨機偏移，落到球道、果嶺、梯台、沙坑、水裡就不種
    const sf0 = surface(u, v);
    if (sf0 === SURF.FAIRWAY || sf0 === SURF.GREEN || sf0 === SURF.FRINGE || sf0 === SURF.TEE || sf0 === SURF.SAND || sf0 === SURF.WATER) return;
    t.x = x; t.z = z; t.y = height(u, v); t.rot = trng() * 6.28; t.tint = trng();
    t.cy = t.type === 'pine' ? t.y + t.h * 0.5 : t.type === 'shrub' ? t.y + t.h * 0.45 : t.y + t.h * 0.66;
    t.cr = t.type === 'pine' ? t.r * 0.9 : t.r;
    if (t.mcyp || t.jpine) { t.cy = t.y + t.h * 0.75; t.cr = t.r * 0.9; }
    if (t.type === 'palm' || t.type === 'bamboo') treeColl(t);
    addTree(t);
  };
  if (map) {
    for (const [u, v, src, kind] of map.trees) plantMapTree(u + (src === 'n' ? 0 : (trng() - 0.5) * 2), v + (src === 'n' ? 0 : (trng() - 0.5) * 2), false, src, kind);
    // 畫面外 6 公尺起是樹林（OSM 球場的圖外是海、街道、別的球場，不種）
    for (let i = 0; i < (map.scene ? 0 : attempts * 1.2); i++) {
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
    if (ad < minAd || greenR(u, v) < 2.8 || inTee(u, v, 6) || nearSpecial(u, v) || inTeeLine(u, v)) continue;
    const sf = surface(u, v);
    if (sf === SURF.WATER || sf === SURF.CHASM || sf === SURF.SAND) continue;
    let t;
    // 指定當地樹種的球場（非真實球場 @C）：走廊邊混灌木與花，越往外越是高樹
    if (course.treeKind) {
      const edge = ss(minAd, minAd + 14, ad);
      if (trng() > (links ? 0.45 : 0.35 + 0.65 * edge)) continue;
      t = localTree(course.treeKind, edge > 0.6 ? 'n' : 'e');
      if (!t) continue;
    } else if (theme) { t = themeTree(ad, minAd); if (!t) continue; }
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

  // 真實球場指定的樹叢：spec.trees = [{at, side, n}]，在球道邊（距白梯 at 碼）種一排高樹（自創球場的樹叢也不種在開球的球路上）
  if (spec && spec.trees && !map) for (const c of spec.trees) {
    const sd = c.side === 'L' ? -1 : 1;
    for (let i = 0; i < (c.n || 8) * 4; i++) {
      const sAt = atY(c.at) + (trng() - 0.5) * (c.len || 45);
      const fh = fwHalf(sAt, sd), lat = sd * (fh + (c.gap ?? 3) + trng() * 14);
      const pt = pointAt(sAt), dir = dirAt(sAt);
      const u = pt[0] + dir[1] * lat, v = pt[1] - dir[0] * lat;
      const sf = surface(u, v);
      if (sf === SURF.WATER || sf === SURF.SAND || sf === SURF.GREEN || sf === SURF.TEE || sf === SURF.FAIRWAY || inTeeLine(u, v)) continue;
      const pine = trng() < 0.3;
      // 有當地樹種的球場（treeKind）：樹叢也種當地的樹（只取高樹，不要灌木）
      let t = course.treeKind ? localTree(course.treeKind, 'n') : null;
      if (!t || t.type === 'shrub' || t.h < 6) t = { type: pine ? 'pine' : 'broad', h: (pine ? 15 : 12) + trng() * 8, r: pine ? 3.2 : 4 + trng() * 2 };
      const x = u, z = -v;
      if (tooClose(x, z, t.r * 0.8)) continue;
      t.x = x; t.z = z; t.y = height(u, v); t.rot = trng() * 6.28; t.tint = trng();
      treeColl(t);
      addTree(t);
    }
  }

  // 遠景樹（只畫不碰撞）
  const scenery = [];
  const bc = [(bbox.minU + bbox.maxU) / 2, (bbox.minV + bbox.maxV) / 2];
  const ring = (n, r0, r1, fn) => { for (let i = 0; i < n; i++) { const a = trng() * Math.PI * 2, r = lerp(r0, r1, trng()); fn(bc[0] + Math.cos(a) * r, bc[1] + Math.sin(a) * r); } };
  if (TD) {
    const [n, list] = TD.scen;
    for (let i = 0; i < n; i++) {
      const u = lerp(bbox.minU - 250, bbox.maxU + 250, trng()), v = lerp(bbox.minV - 150, bbox.maxV + 350, trng());
      const { s, d } = near(u, v);
      if (Math.abs(d) < corridor + 20 && s > -40 && s < Lp + 60) continue;
      scenery.push({ x: u, z: -v, uv: [u, v], ...mk(pick(list)), rot: trng() * 6.28, tint: trng() });
    }
    for (const m of TD.marks) {
      const [type, cnt, d0, d1, h0, h1, r0, r1, ex = {}] = m;
      ring(cnt, d0, d1, (u, v) => {
        const t = { x: u, z: -v, uv: [u, v], type, h: lerp(h0, h1, trng()), r: lerp(r0, r1, trng()), rot: trng() * 6.28, tint: trng(), ...ex };
        if (ex.fyR) t.fy = lerp(ex.fyR[0], ex.fyR[1], trng());
        scenery.push(t);
      });
    }
  } else if (theme === 'jungle') {
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
  } else if (theme && !THEME_FANTASY[theme]) {
    // 寫實主題：近處的樹 + 遠方地標
    const sc = { tropical: [700, () => trng() < 0.75 ? ['palm', 10 + trng() * 8, 3.4] : ['broad', 9 + trng() * 6, 4]], cliffs: [260, () => ['pine', 9 + trng() * 7, 3.5]],
      alpine: [2600, () => trng() < 0.85 ? ['pine', 14 + trng() * 12, 3] : ['broad', 10 + trng() * 5, 3]], sakura: [2000, () => { const r0 = trng(); return r0 < 0.45 ? ['broad', 8 + trng() * 5, 4.5] : r0 < 0.75 ? ['bamboo', 11 + trng() * 6, 2.5] : ['pine', 11 + trng() * 8, 3.2]; }],
      dunes: [110, () => ['palm', 9 + trng() * 7, 3.2]], salt: [0, null] }[theme];
    for (let i = 0; i < sc[0]; i++) {
      const u = lerp(bbox.minU - 250, bbox.maxU + 250, trng()), v = lerp(bbox.minV - 150, bbox.maxV + 350, trng());
      const { s, d } = near(u, v);
      if (Math.abs(d) < corridor + 20 && s > -40 && s < Lp + 60) continue;
      if (seaSide && seaSide * d > seaEdge(s) - 8) continue;
      const [type, h, r] = sc[1]();
      scenery.push({ x: u, z: -v, uv: [u, v], type, h, r, rot: trng() * 6.28, tint: trng(), sakura: theme === 'sakura' && type === 'broad' ? 1 : 0, jungle: theme === 'tropical' && type === 'broad' ? 1 : 0, cypress: theme === 'cliffs' ? 1 : 0 });
    }
    if (theme === 'alpine') ring(26, 1500, 2600, (u, v) => scenery.push({ x: u, z: -v, uv: [u, v], type: 'peak', h: 350 + trng() * 450, r: 260 + trng() * 220, rot: trng() * 6.28, tint: trng() }));
    if (theme === 'salt') ring(18, 1300, 2100, (u, v) => scenery.push({ x: u, z: -v, uv: [u, v], type: 'peak', h: 160 + trng() * 220, r: 300 + trng() * 250, rot: trng() * 6.28, tint: trng(), desert: 1 }));
  } else if (theme === 'mushroom') {
    // 夜晚的螢光森林：遠處一棵棵巨大的發光蘑菇
    for (let i = 0; i < 1600; i++) {
      const u = lerp(bbox.minU - 250, bbox.maxU + 250, trng()), v = lerp(bbox.minV - 150, bbox.maxV + 350, trng());
      const { s, d } = near(u, v);
      if (Math.abs(d) < corridor + 20 && s > -40 && s < Lp + 60) continue;
      const sh = trng() < 0.4;
      scenery.push({ x: u, z: -v, uv: [u, v], type: sh ? 'shroom' : 'broad', night: 1, h: sh ? 5 + trng() * 8 : 13 + trng() * 9, r: sh ? 2.5 + trng() * 2.5 : 5 + trng() * 2.5, rot: trng() * 6.28, tint: trng() });
    }
    ring(40, 300, 1300, (u, v) => scenery.push({ x: u, z: -v, uv: [u, v], type: 'bigshroom', h: 40 + trng() * 70, r: 18 + trng() * 30, rot: trng() * 6.28, tint: trng() }));
  } else if (theme === 'frost') {
    for (let i = 0; i < 1500; i++) {
      const u = lerp(bbox.minU - 250, bbox.maxU + 250, trng()), v = lerp(bbox.minV - 150, bbox.maxV + 350, trng());
      const { s, d } = near(u, v);
      if (Math.abs(d) < corridor + 20 && s > -40 && s < Lp + 60) continue;
      scenery.push({ x: u, z: -v, uv: [u, v], type: 'pine', snow: 1, h: 12 + trng() * 10, r: 3 + trng() * 1.5, rot: trng() * 6.28, tint: trng() });
    }
    ring(22, 600, 1600, (u, v) => scenery.push({ x: u, z: -v, uv: [u, v], type: 'iceberg', h: 90 + trng() * 220, r: 60 + trng() * 90, rot: trng() * 6.28, tint: trng() }));
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
      // 真實地形的球場：只種在陸地上（海拔 1.5 公尺以上），用當地的樹種
      if (demH) { if (demH(u, v) < 1.5) continue; const lt = course.treeKind && localTree(course.treeKind, 'n'); if (lt) { scenery.push({ x: u, z: -v, uv: [u, v], ...lt, rot: trng() * 6.28, tint: trng() }); continue; } }
      const pine = trng() < 0.3;
      scenery.push({ x: u, z: -v, uv: [u, v], type: park ? (pine ? 'pine' : (trng() < 0.15 ? 'maple' : 'broad')) : 'juniper', h: park ? 12 + trng() * 10 : 3 + trng() * 2, r: park ? 4 + trng() * 2.5 : 1.6, rot: trng() * 6.28, tint: trng() });
    }
  }

  // ---------- 世界座標介面（x = u, z = -v） ----------
  const H = (x, z) => height(x, -z);
  const api = {
    course, holeIdx, par, hcp, yards, feat: F, spec, L: Lp, path, S, bbox, tees, pin: [pin[0], -pin[1]], drawn,
    greenSide: mapGreens && mapGreens.length > 1 ? (gIdx === 0 ? '左' : '右') : null,      // 有兩個果嶺時今天用哪一個
    green: { u: G[0], v: G[1], rx: grx, ry: gry, rot: gRot }, bunkers, waters: map ? MG.waters.map((w, id) => ({ kind: 'pond', level: w.level, cells: w.cells, grid: MG, sea: seaIds.has(id) })) : waters, mapSea: seaIds.size > 0, scene: map && map.scene, geo: map && map.geo, cross, seaSide, seaEdge, trees, scenery,
    near, pointAt, dirAt, fwHalf, greenR, surfaceUV: surface, heightUV: height, heightVisUV: heightVis, fs, fe, theme,
    falls, cave: caveTee ? { u: caveTee.u, v: caveTee.v, dir: caveTee.dir } : null,
    specials, moat: moat ? { u: G[0], v: G[1], r: (moat.rOut + 0.3) * Math.max(grx, gry), level: moat.level } : null,
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
        if (!NO_TRUNK[t.type] && y < t.y + t.h * 0.4 && Math.hypot(x - t.x, z - t.z) < 0.35) return t; // 樹幹
      }
      return null;
    },
    teePos(teeId) {
      const t = tees.find(q => q.id === teeId) || tees[1];
      return [t.u, H(t.u, -t.v) + 0.0213, -t.v];   // 球心在地面上一個半徑
    },
    // 生涯模式的兒童梯 / 年齡梯台：沿洞線離果嶺 yards 碼的地方開球（落在水、沙坑、界外就往果嶺方向找乾地）
    teeAt(yards) {
      let s = clamp(Lp - yards * YD, 0, Lp - 30);
      for (let k = 0; k < 60; k++, s = Math.min(Lp - 30, s + 3)) {
        const p = pointAt(s), sf = surface(p[0], p[1]);
        if (sf !== SURF.WATER && sf !== SURF.CHASM && sf !== SURF.OB && sf !== SURF.SAND && sf !== SURF.GREEN) break;
      }
      const p = pointAt(s);
      return [p[0], H(p[0], -p[1]) + 0.0213, -p[1]];
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
  tropical: { fair: [88, 168, 70], fair2: [78, 156, 62], cut: [70, 146, 56], rough: [70, 132, 52], deep: [60, 110, 44], green: [92, 176, 78], green2: [82, 164, 70], fringe: [80, 160, 66], sand: [248, 244, 228], waste: [226, 214, 176], tee: [88, 168, 70], ob: [56, 100, 40], water: [40, 190, 200] },
  cliffs: { fair: [102, 134, 70], fair2: [92, 124, 62], cut: [86, 116, 58], rough: [96, 112, 66], deep: [118, 120, 84], green: [94, 140, 66], green2: [84, 130, 58], fringe: [92, 134, 62], sand: [214, 204, 176], waste: [150, 144, 118], tee: [102, 134, 70], ob: [110, 112, 84] },
  alpine: { fair: [96, 150, 64], fair2: [84, 138, 56], cut: [78, 128, 52], rough: [72, 116, 50], deep: [58, 96, 42], green: [96, 156, 70], green2: [86, 144, 62], fringe: [88, 148, 64], sand: [222, 216, 200], waste: [140, 134, 118], tee: [96, 150, 64], ob: [52, 84, 40], water: [50, 110, 120] },
  sakura: { fair: [104, 160, 74], fair2: [92, 148, 66], cut: [86, 138, 60], rough: [78, 126, 58], deep: [64, 106, 50], green: [100, 164, 80], green2: [90, 152, 72], fringe: [92, 154, 70], sand: [236, 228, 214], waste: [160, 150, 130], tee: [104, 160, 74], ob: [60, 96, 48], water: [56, 110, 96] },
  dunes: { fair: [104, 164, 66], fair2: [92, 152, 58], cut: [86, 142, 54], rough: [130, 150, 74], deep: [196, 170, 116], green: [100, 168, 72], green2: [90, 156, 64], fringe: [96, 160, 66], sand: [240, 222, 176], waste: [230, 196, 136], tee: [104, 164, 66], ob: [224, 188, 128], water: [40, 150, 170] },
  salt: { fair: [98, 158, 72], fair2: [88, 146, 64], cut: [82, 136, 58], rough: [128, 138, 92], deep: [196, 186, 160], green: [96, 162, 78], green2: [86, 150, 70], fringe: [92, 154, 72], sand: [232, 226, 214], waste: [240, 236, 226], tee: [98, 158, 72], ob: [238, 232, 220], water: [80, 200, 196] },
  candy: { fair: [150, 225, 190], fair2: [138, 212, 178], cut: [128, 200, 168], rough: [250, 196, 218], deep: [240, 166, 204], green: [170, 240, 200], green2: [156, 228, 188], fringe: [160, 232, 196], sand: [255, 244, 210], waste: [255, 222, 186], tee: [150, 225, 190], ob: [230, 156, 196], water: [110, 64, 36] },
  city: { fair: [90, 170, 120], fair2: [80, 156, 110], cut: [74, 144, 102], rough: [118, 122, 128], deep: [100, 104, 110], green: [110, 190, 130], green2: [100, 176, 120], fringe: [100, 180, 124], sand: [210, 200, 180], waste: [90, 92, 98], tee: [90, 170, 120], ob: [60, 62, 68], chasm: [10, 12, 24], water: [40, 120, 170] },
  sky: { fair: [120, 200, 110], fair2: [108, 186, 100], cut: [100, 176, 94], rough: [150, 210, 130], deep: [130, 190, 110], green: [130, 215, 120], green2: [118, 202, 110], fringe: [124, 208, 114], sand: [250, 240, 215], waste: [220, 214, 200], tee: [120, 200, 110], ob: [200, 200, 210], chasm: [190, 214, 240], water: [90, 180, 230] },
  moon: { fair: [70, 170, 150], fair2: [62, 156, 138], cut: [56, 144, 128], rough: [140, 140, 146], deep: [118, 118, 124], green: [90, 210, 190], green2: [80, 196, 178], fringe: [80, 180, 166], sand: [74, 74, 80], waste: [128, 128, 134], tee: [70, 170, 150], ob: [96, 96, 102], water: [30, 30, 44] },
  mars: { fair: [110, 150, 70], fair2: [100, 138, 62], cut: [92, 128, 58], rough: [176, 96, 62], deep: [156, 76, 48], green: [120, 172, 80], green2: [110, 160, 72], fringe: [112, 162, 74], sand: [206, 128, 86], waste: [186, 90, 58], tee: [110, 150, 70], ob: [146, 64, 42], water: [80, 50, 40] },
  reef: { fair: [90, 170, 140], fair2: [80, 156, 128], cut: [74, 146, 120], rough: [214, 204, 164], deep: [194, 180, 140], green: [110, 202, 162], green2: [100, 188, 150], fringe: [100, 190, 154], sand: [242, 232, 204], waste: [204, 192, 152], tee: [90, 170, 140], ob: [40, 90, 120], water: [12, 44, 86] },
  autumn: { fair: [122, 152, 62], fair2: [110, 140, 56], cut: [102, 130, 52], rough: [146, 124, 62], deep: [156, 94, 42], green: [112, 162, 72], green2: [102, 150, 64], fringe: [106, 154, 66], sand: [232, 216, 182], waste: [162, 122, 72], tee: [122, 152, 62], ob: [124, 72, 32], water: [50, 92, 112] },
  lavender: { fair: [110, 162, 80], fair2: [98, 150, 72], cut: [92, 140, 66], rough: [146, 116, 186], deep: [124, 94, 172], green: [112, 172, 92], green2: [102, 160, 84], fringe: [104, 164, 86], sand: [236, 226, 206], waste: [172, 152, 122], tee: [110, 162, 80], ob: [102, 82, 152], water: [62, 112, 142] },
  tulip: { fair: [100, 172, 72], fair2: [90, 160, 64], cut: [84, 150, 60], rough: [232, 84, 94], deep: [250, 204, 66], green: [102, 178, 82], green2: [92, 164, 74], fringe: [96, 168, 76], sand: [236, 226, 202], waste: [152, 132, 102], tee: [100, 172, 72], ob: [82, 122, 62], water: [62, 112, 152] },
  egypt: { fair: [120, 166, 72], fair2: [108, 154, 64], cut: [100, 144, 60], rough: [212, 182, 122], deep: [202, 166, 106], green: [112, 172, 82], green2: [102, 160, 74], fringe: [106, 164, 76], sand: [242, 222, 172], waste: [226, 192, 132], tee: [120, 166, 72], ob: [216, 182, 122], water: [40, 122, 142] },
  swamp: { fair: [82, 122, 62], fair2: [74, 112, 56], cut: [68, 104, 52], rough: [62, 92, 52], deep: [50, 72, 42], green: [92, 142, 72], green2: [84, 132, 66], fringe: [86, 134, 66], sand: [172, 162, 122], waste: [92, 92, 62], tee: [82, 122, 62], ob: [40, 56, 36], water: [36, 58, 56] },
  dino: { fair: [102, 152, 62], fair2: [92, 140, 56], cut: [86, 130, 52], rough: [82, 122, 52], deep: [62, 96, 42], green: [102, 162, 72], green2: [92, 150, 64], fringe: [96, 154, 66], sand: [212, 192, 142], waste: [142, 112, 72], tee: [102, 152, 62], ob: [72, 82, 42], water: [62, 122, 112] },
  neon: { fair: [34, 24, 70], fair2: [40, 28, 80], cut: [48, 34, 94], rough: [16, 12, 34], deep: [12, 9, 26], green: [44, 34, 100], green2: [52, 40, 114], fringe: [64, 44, 130], sand: [255, 96, 206], waste: [22, 16, 44], tee: [34, 24, 70], ob: [8, 6, 18], water: [0, 200, 255] },
  crystal: { fair: [82, 72, 142], fair2: [74, 64, 130], cut: [68, 58, 120], rough: [52, 42, 92], deep: [42, 32, 72], green: [112, 102, 192], green2: [102, 92, 178], fringe: [96, 86, 172], sand: [202, 182, 242], waste: [62, 52, 102], tee: [82, 72, 142], ob: [32, 26, 62], water: [122, 62, 222] },
  mushroom: { fair: [64, 140, 116], fair2: [56, 126, 104], cut: [50, 116, 96], rough: [46, 86, 96], deep: [40, 60, 84], green: [92, 182, 148], green2: [82, 168, 138], fringe: [72, 152, 128], sand: [214, 196, 236], waste: [74, 64, 96], tee: [64, 140, 116], ob: [30, 30, 62], water: [60, 200, 220] },
  frost: { fair: [146, 188, 186], fair2: [134, 176, 176], cut: [124, 166, 168], rough: [222, 230, 240], deep: [238, 243, 250], green: [104, 166, 138], green2: [94, 154, 128], fringe: [124, 176, 156], sand: [196, 208, 224], waste: [188, 198, 214], tee: [146, 188, 186], ob: [234, 240, 248], water: [70, 120, 170] },
  honey: { fair: [126, 176, 62], fair2: [114, 164, 54], cut: [106, 154, 50], rough: [168, 160, 66], deep: [196, 150, 52], green: [120, 186, 70], green2: [110, 174, 62], fringe: [114, 178, 64], sand: [250, 230, 170], waste: [200, 162, 82], tee: [126, 176, 62], ob: [176, 128, 40], water: [70, 160, 170] },
  clock: { fair: [92, 140, 104], fair2: [82, 128, 94], cut: [76, 118, 88], rough: [122, 98, 72], deep: [96, 74, 56], green: [104, 160, 116], green2: [94, 148, 106], fringe: [96, 150, 108], sand: [196, 142, 96], waste: [104, 86, 70], tee: [92, 140, 104], ob: [62, 52, 46], water: [40, 96, 92] },
  haunt: { fair: [58, 96, 82], fair2: [50, 86, 74], cut: [46, 78, 68], rough: [64, 62, 82], deep: [46, 42, 62], green: [70, 116, 96], green2: [62, 106, 88], fringe: [62, 104, 88], sand: [152, 146, 160], waste: [56, 52, 66], tee: [58, 96, 82], ob: [30, 28, 42], water: [70, 140, 96] },
  toy: { fair: [92, 196, 84], fair2: [84, 184, 76], cut: [78, 174, 72], rough: [96, 160, 230], deep: [150, 132, 226], green: [110, 214, 100], green2: [100, 202, 92], fringe: [104, 206, 96], sand: [255, 236, 150], waste: [250, 206, 90], tee: [92, 196, 84], ob: [132, 112, 210], water: [60, 150, 240] },
  storm: { fair: [86, 126, 82], fair2: [78, 116, 76], cut: [72, 108, 70], rough: [96, 104, 100], deep: [78, 84, 88], green: [94, 142, 92], green2: [86, 132, 84], fringe: [88, 134, 86], sand: [150, 150, 156], waste: [92, 96, 100], tee: [86, 126, 82], ob: [64, 68, 74], water: [64, 84, 104] },
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
  const salt = hole.course.theme === 'salt';
  const g = hole.green;
  const gc = Math.cos(g.rot + 0.4), gs = Math.sin(g.rot + 0.4);
  // 小地圖用的版本：水改成水藍色（3D 畫面的地面是水池底的顏色，上面還有一層水面；小地圖沒有水面，要直接塗成水的顏色才看得出來）
  //   熔岩主題的「水」是熔岩，不改
  const wet = new Uint8Array(W * Hh), recolorWater = hole.course.theme !== 'lava';
  // 小地圖 / 18 洞預覽只畫這一洞：真實球場的地圖常常連隔壁的球道、果嶺都在範圍裡，離這一洞球道邊 30 公尺外、梯台後 / 果嶺後 35 公尺外的都塗成樹林色
  //   一洞一張的描圖地圖本來就只有這一洞，不用遮；整座球場共用的地圖（OSM）才遮，而且 20 公尺內慢慢淡成樹林色，不會切出一條直邊
  const ownOnly = !!hole.course.sceneUrl, away = ownOnly ? new Float32Array(W * Hh) : null;
  const seaBlock = new Map();
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
          if (hole.drawn) { c = Math.floor(v / 8) % 2 ? pal.fair : pal.fair2; break; }      // 編輯器畫的球道：跟編輯器一樣每 8 公尺一條（東西向）
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
        default: c = pal.ob; sand = hole.course.style === 'canyon' || hole.course.theme === 'dunes' || hole.course.theme === 'salt' ? 1 : 0;
      }
      const thm = hole.course.theme;
      if ((thm === 'lavender' || thm === 'tulip') && (sf === SURF.ROUGH || sf === SURF.DEEP || sf === SURF.OB)) {
        const row = Math.floor((u * 0.8 + v * 0.6) / 2.4);
        if (thm === 'lavender') c = row % 2 ? [150, 118, 196] : [96, 132, 70];
        else c = [[232, 70, 84], [252, 206, 60], [246, 150, 196], [96, 150, 66], [250, 120, 40]][((row % 5) + 5) % 5];
      }
      if (thm === 'neon' && sf !== SURF.WATER) {
        const gx = Math.abs(((u % 6) + 6) % 6 - 3), gy = Math.abs(((v % 6) + 6) % 6 - 3);
        if (gx > 2.75 || gy > 2.75) c = sf === SURF.FAIRWAY || sf === SURF.GREEN || sf === SURF.FRINGE || sf === SURF.TEE ? [0, 230, 255] : [255, 60, 200];
      }
      if (thm === 'candy' && (sf === SURF.ROUGH || sf === SURF.DEEP) && n2 > 0.55) c = [[255, 90, 120], [90, 200, 255], [255, 230, 90], [160, 110, 255]][Math.floor((u * 13.7 + v * 7.3) % 4 + 4) % 4];
      if (thm === 'moon' && (sf === SURF.WASTE || sf === SURF.OB || sf === SURF.ROUGH)) {
        // 隕石坑：每 36 公尺一格隨機放一個圓坑（坑內暗、坑緣亮）
        const cx = Math.floor(u / 36), cy = Math.floor(v / 36), hs = k => { const x = Math.sin(cx * 127.1 + cy * 311.7 + k * 74.7) * 43758.5453; return x - Math.floor(x); };
        if (hs(1) < 0.55) { const ox = (cx + 0.2 + hs(2) * 0.6) * 36, oy = (cy + 0.2 + hs(3) * 0.6) * 36, rr = 3 + hs(4) * 9, dd = Math.hypot(u - ox, v - oy);
          if (dd < rr - 1) c = [104, 104, 110]; else if (dd < rr + 1.2) c = [176, 176, 182]; }
      }
      // 鹽湖：鹽殼上的多邊形龜裂紋
      if (salt && (sf === SURF.WASTE || sf === SURF.OB)) { const k = Math.abs(nz(u * 0.11, v * 0.11)) + Math.abs(nz(u * 0.23 + 7, v * 0.23)) * 0.5; if (k < 0.05) c = [196, 184, 160]; }
      if (ownOnly && hole.greenR(u, v) > 3) {
        const q = hole.near(u, v);
        const ex = Math.max(-35 - q.s, q.s - hole.L - 40, Math.abs(q.d) - hole.fwHalf(q.s, q.d > 0 ? 1 : -1) - 38);
        if (ex > 0) away[j * W + i] = ss(0, 20, ex);
      }
      if (recolorWater && sf === SURF.WATER) wet[j * W + i] = 1;
      else if (recolorWater && hole.mapSea && sf === SURF.OB) {
        // 國外球場地圖範圍外的海：每 4×4 格查一次地面是不是在海面下
        const bk = (j >> 2) * 100000 + (i >> 2);
        if (!seaBlock.has(bk)) seaBlock.set(bk, hole.heightUV(u, v) < -1.2);
        if (seaBlock.get(bk)) wet[j * W + i] = 1;
      }
      const f = 1 + n1 * 0.10 + n2 * 0.05;
      const o = (j * W + i) * 4;
      cd[o] = clamp(c[0] * f, 0, 255); cd[o + 1] = clamp(c[1] * f, 0, 255); cd[o + 2] = clamp(c[2] * f, 0, 255); cd[o + 3] = 255;
      md[o] = sand * 255; md[o + 1] = sf === SURF.GREEN || sf === SURF.FRINGE ? 255 : 0; md[o + 2] = 0; md[o + 3] = 255;
    }
  }
  cx.putImageData(cimg, 0, 0);
  mx.putImageData(mimg, 0, 0);
  const mini = document.createElement('canvas');
  mini.width = W; mini.height = Hh;
  for (let k = 0; k < W * Hh; k++) {
    if (!wet[k]) continue;
    const o = k * 4, f = 0.92 + ((k * 2654435761) >>> 28) / 15 * 0.12;
    cd[o] = 64 * f; cd[o + 1] = 168 * f; cd[o + 2] = 222 * f;
  }
  if (away) for (let k = 0; k < W * Hh; k++) {
    const w = away[k]; if (!w) continue;
    const o = k * 4, f = 0.94 + ((k * 2654435761) >>> 28) / 15 * 0.1;
    cd[o] = lerp(cd[o], pal.deep[0] * 0.8 * f, w); cd[o + 1] = lerp(cd[o + 1], pal.deep[1] * 0.8 * f, w); cd[o + 2] = lerp(cd[o + 2], pal.deep[2] * 0.8 * f, w);
  }
  mini.getContext('2d').putImageData(cimg, 0, 0);
  return { color, mask, px, mini };
}

// 除錯用：解碼後的描圖地圖（含清理）
export { decodeMap as _decodeMap };
