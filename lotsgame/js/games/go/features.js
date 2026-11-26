// KataGo V7 輸入特徵（22 個平面 + 19 個全域值），對應官方 NNInputs::fillRowV7。
// 規則固定為：數子法、單劫、不可自殺、無讓子。
import { EMPTY, PASS, ladderInfo, calculateArea } from './rules.js';

export const NUM_SPATIAL = 22, NUM_GLOBAL = 19;

// 八種對稱：回傳 idx -> 轉換後 idx 的對照表
const SYM_CACHE = {};
export function symmetryMap(n, sym) {
  const key = n + ':' + sym;
  if (SYM_CACHE[key]) return SYM_CACHE[key];
  const map = new Int32Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let tx = x, ty = y;
    if (sym & 1) tx = n - 1 - tx;
    if (sym & 2) ty = n - 1 - ty;
    if (sym & 4) { const t = tx; tx = ty; ty = t; }
    map[y * n + x] = ty * n + tx;
  }
  return (SYM_CACHE[key] = map);
}

export function buildFeatures(pos, sym = 0) {
  const b = pos.board, n = b.n, n2 = n * n;
  const pla = pos.toPlay, op = 3 - pla;
  const map = symmetryMap(n, sym);
  const bin = new Float32Array(NUM_SPATIAL * n2);
  const glob = new Float32Array(NUM_GLOBAL);
  const set = (plane, i) => { bin[plane * n2 + map[i]] = 1; };

  const done = new Uint8Array(n2);
  for (let i = 0; i < n2; i++) {
    set(0, i);
    const col = b.c[i];
    if (col === EMPTY) continue;
    set(col === pla ? 1 : 2, i);
    if (done[i]) continue;
    const ch = b.chain(i);
    const L = ch.libs.length;
    for (const s of ch.stones) {
      done[s] = 1;
      if (L >= 1 && L <= 3) set(2 + L, s);
    }
  }
  if (b.ko >= 0) set(6, b.ko);

  // 18, 19：目前的領地（含 Benson 活棋）
  const area = calculateArea(b);
  for (let i = 0; i < n2; i++) {
    if (area[i] === pla) set(18, i);
    else if (area[i] === op) set(19, i);
  }

  // 9–13：最近五手；全域 0–4：該手是否虛手
  const h = pos.hist;
  for (let k = 0; k < 5 && k < h.length; k++) {
    if (h[k] === PASS) glob[k] = 1;
    else set(9 + k, h[k]);
  }

  // 14–17：征子
  const cur = ladderInfo(b, op);
  for (let i = 0; i < n2; i++) if (cur.laddered[i]) set(14, i);
  for (const w of cur.working) set(17, w);
  const pb1 = h.length >= 1 && pos.prev1 ? pos.prev1 : b;
  const l1 = pb1 === b ? cur : ladderInfo(pb1, op);
  for (let i = 0; i < n2; i++) if (l1.laddered[i]) set(15, i);
  const pb2 = h.length >= 2 && pos.prev2 ? pos.prev2 : pb1;
  const l2 = pb2 === pb1 ? l1 : ladderInfo(pb2, op);
  for (let i = 0; i < n2; i++) if (l2.laddered[i]) set(16, i);

  // 全域
  const selfKomi = pla === 2 ? pos.komi : -pos.komi;
  glob[5] = selfKomi / 20;
  glob[14] = h.length >= 1 && h[0] === PASS ? 1 : 0;
  const even = n2 % 2 === 0;
  const floorK = even ? Math.floor(selfKomi / 2) * 2 : Math.floor((selfKomi - 1) / 2) * 2 + 1;
  let delta = Math.min(2, Math.max(0, selfKomi - floorK));
  glob[18] = delta < 0.5 ? delta : delta < 1.5 ? 1 - delta : delta - 2;

  return { bin, glob };
}
