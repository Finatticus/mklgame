// 迷你高爾夫的電腦球友與解題工具：路徑距離場（繞過牆、水、熔岩）＋取樣搜尋最佳一桿。
import { simulate, inPoly, BALL_R, MAX_SPEED } from './physics.js';

// 以 2 公分格點計算每一點到洞的「繞路距離」（Dijkstra，二元堆積）
export function distanceField(world, cell = 0.02) {
  const xs = world.def.green.map((p) => p[0]), ys = world.def.green.map((p) => p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), x1 = Math.max(...xs), y1 = Math.max(...ys);
  const W = Math.ceil((x1 - x0) / cell) + 1, H = Math.ceil((y1 - y0) / cell) + 1;
  const free = new Uint8Array(W * H), dist = new Float64Array(W * H).fill(1e9);
  const segD = (px, py, s) => {
    const dx = s.bx - s.ax, dy = s.by - s.ay, L = dx * dx + dy * dy;
    let t = L ? ((px - s.ax) * dx + (py - s.ay) * dy) / L : 0; t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (s.ax + dx * t), py - (s.ay + dy * t));
  };
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const x = x0 + i * cell, y = y0 + j * cell;
    let ok = inPoly(world.def.green, x, y);
    if (ok) for (const s of world.segs) if (segD(x, y, s) < s.rr + BALL_R) { ok = false; break; }
    if (ok) for (const p of world.posts) if (Math.hypot(x - p.x, y - p.y) < p.r + BALL_R) { ok = false; break; }
    if (ok) for (const w of world.water) if (inPoly(w, x, y)) { ok = false; break; }
    free[j * W + i] = ok ? 1 : 0;
  }
  const idx = (x, y) => { const i = Math.round((x - x0) / cell), j = Math.round((y - y0) / cell); return i >= 0 && j >= 0 && i < W && j < H ? j * W + i : -1; };
  const links = new Map();
  for (const tn of world.tunnels) { const a = idx(tn.out[0], tn.out[1]), b = idx(tn.in[0], tn.in[1]); if (a >= 0 && b >= 0) links.set(a, (links.get(a) || []).concat([b])); }
  // 二元堆積
  const heap = [];
  const push = (n, d) => { heap.push([d, n]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  const start = idx(world.cup.x, world.cup.y);
  if (start >= 0) { dist[start] = 0; push(start, 0); }
  const nb = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  while (heap.length) {
    const [d, c] = pop();
    if (d > dist[c]) continue;
    const ci = c % W, cj = (c / W) | 0;
    for (const [di, dj, w] of nb) {
      const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
      const n = nj * W + ni; if (!free[n]) continue;
      const nd = d + w * cell; if (nd < dist[n]) { dist[n] = nd; push(n, nd); }
    }
    for (const n of links.get(c) || []) { const nd = d + 0.1; if (nd < dist[n]) { dist[n] = nd; push(n, nd); } }
  }
  return (x, y) => { const k = idx(x, y); return k >= 0 && dist[k] < 1e8 ? dist[k] : 9; };
}

// 找最好的一桿。能進洞時，在所有進洞的推法中挑：撞牆次數最少 → 小誤差下仍能進洞的比例最高 → 力道最輕。
// 一定會把「直接瞄洞」的方向納入取樣，短推不會繞去打牆。
export function bestShot(world, x, y, t0 = 0, { A = 120, N = 16, D = null } = {}) {
  D = D || distanceField(world);
  const spAt = (k, n) => MAX_SPEED * Math.pow(k / n, 1.3);
  const run = (ang, sp) => simulate(world, x, y, ang, sp, t0, 20);
  const holes = [];
  let best = null;
  const consider = (ang, sp) => {
    const r = run(ang, sp);
    if (r.holed) { holes.push({ ang, sp, bounces: r.bounces }); return; }
    const s = r.water ? 99 : D(r.x, r.y) + r.bounces * 0.004;
    if (!best || s < best.s) best = { s, ang, sp };
  };
  for (let a = 0; a < A; a++) for (let k = 1; k <= N; k++) consider((a / A) * Math.PI * 2, spAt(k, N));
  // 直接瞄洞的方向細掃
  const direct = Math.atan2(world.cup.y - y, world.cup.x - x);
  for (let da = -2; da <= 2; da += 0.5) for (let k = 1; k <= 28; k++) consider(direct + (da * Math.PI) / 180, spAt(k, 28));

  if (holes.length) {
    // 先依撞牆次數排序，只對前面的候選做容錯測試
    holes.sort((p, q) => p.bounces - q.bounces || p.sp - q.sp);
    const minB = holes[0].bounces;
    const pool = holes.filter((hh) => hh.bounces <= minB + 1).slice(0, 30);
    let pick = null;
    for (const c of pool) {
      let ok = 0;
      for (const [da, ds] of [[-0.7, 0], [0.7, 0], [0, -0.06], [0, 0.06], [-0.5, 0.04], [0.5, -0.04]]) if (run(c.ang + (da * Math.PI) / 180, c.sp * (1 + ds)).holed) ok++;
      const v = ok * 3 - c.bounces * 4 - c.sp * 0.6;
      if (!pick || v > pick.v) pick = { v, ang: c.ang, sp: c.sp };
    }
    return { s: -1, ang: pick.ang, sp: pick.sp };
  }
  // 進不了洞：在最佳落點附近細搜
  const step = (Math.PI * 2) / A;
  let fine = best;
  for (let da = -1.5; da <= 1.5; da += 0.25) for (let dk = -0.12; dk <= 0.12; dk += 0.03) {
    const ang = best.ang + da * step, sp = best.sp * (1 + dk);
    const r = run(ang, sp);
    if (r.holed) return { s: -1, ang, sp };
    const s = r.water ? 99 : D(r.x, r.y) + r.bounces * 0.004;
    if (s < fine.s) fine = { s, ang, sp };
  }
  return fine;
}

// 電腦球友的程度：瞄準誤差（度）與力道誤差（比例）
export const GOLFERS = {
  rookie: { name: '新手', ang: 4.0, sp: 0.14, bonus: 200 },
  amateur: { name: '業餘', ang: 2.4, sp: 0.09, bonus: 400 },
  skilled: { name: '好手', ang: 1.3, sp: 0.055, bonus: 800 },
  pro: { name: '職業', ang: 0.65, sp: 0.03, bonus: 1500 },
};
