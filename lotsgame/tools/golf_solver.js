// 開發工具：以暴力取樣驗證每個迷你高爾夫球洞。在瀏覽器主控台 import 後呼叫 solveHole()。
// 1) 計算繞過牆與水池的路徑距離場；2) 每一桿取樣多個方向與力道，貪婪選擇（能進洞就進、否則最接近）；
// 3) 回報一桿進洞的取樣比例與貪婪解需要的桿數，用來決定標準桿與調整難度。
import { buildHole, simulate, inPoly, BALL_R, MAX_SPEED } from '../js/games/minigolf/physics.js';

export function distanceField(world, cell = 0.02) {
  const xs = [], ys = [];
  for (const [x, y] of world.def.green) { xs.push(x); ys.push(y); }
  const x0 = Math.min(...xs), y0 = Math.min(...ys), x1 = Math.max(...xs), y1 = Math.max(...ys);
  const W = Math.ceil((x1 - x0) / cell) + 1, H = Math.ceil((y1 - y0) / cell) + 1;
  const free = new Uint8Array(W * H), dist = new Float32Array(W * H).fill(1e9);
  const segDist = (px, py, s) => {
    const dx = s.bx - s.ax, dy = s.by - s.ay, L = dx * dx + dy * dy;
    let t = L ? ((px - s.ax) * dx + (py - s.ay) * dy) / L : 0; t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (s.ax + dx * t), py - (s.ay + dy * t));
  };
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const x = x0 + i * cell, y = y0 + j * cell;
    let ok = inPoly(world.def.green, x, y);
    if (ok) for (const s of world.segs) if (segDist(x, y, s) < s.rr + BALL_R) { ok = false; break; }
    if (ok) for (const p of world.posts) if (Math.hypot(x - p.x, y - p.y) < p.r + BALL_R) { ok = false; break; }
    if (ok) for (const w of world.water) if (inPoly(w, x, y)) { ok = false; break; }
    free[j * W + i] = ok ? 1 : 0;
  }
  // 管道視為連通
  const idx = (x, y) => { const i = Math.round((x - x0) / cell), j = Math.round((y - y0) / cell); return i >= 0 && j >= 0 && i < W && j < H ? j * W + i : -1; };
  const start = idx(world.cup.x, world.cup.y);
  dist[start] = 0;
  const q = [start];
  const links = new Map();
  for (const tn of world.tunnels) { const a = idx(tn.out[0], tn.out[1]), b = idx(tn.in[0], tn.in[1]); if (a >= 0 && b >= 0) links.set(a, (links.get(a) || []).concat([b])); }
  // Dijkstra 簡化版（8 鄰）
  const nb = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  while (q.length) {
    q.sort((a, b) => dist[b] - dist[a]);
    const c = q.pop(), ci = c % W, cj = (c / W) | 0;
    for (const [di, dj, w] of nb) {
      const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
      const n = nj * W + ni; if (!free[n]) continue;
      const nd = dist[c] + w * cell; if (nd < dist[n]) { dist[n] = nd; q.push(n); }
    }
    for (const n of links.get(c) || []) { const nd = dist[c] + 0.1; if (nd < dist[n]) { dist[n] = nd; q.push(n); } }
  }
  return (x, y) => { const k = idx(x, y); return k >= 0 && dist[k] < 1e8 ? dist[k] : 9; };
}

export function solveHole(def, { angles = 240, speeds = 24, maxShots = 7 } = {}) {
  const world = buildHole(def);
  const D = distanceField(world);
  let x = world.tee.x, y = world.tee.y, shots = 0, firstShotHoleRate = 0;
  const path = [];
  while (shots < maxShots) {
    shots++;
    let best = null, holes = 0, total = 0;
    for (let a = 0; a < angles; a++) {
      const ang = (a / angles) * Math.PI * 2;
      for (let s = 1; s <= speeds; s++) {
        const sp = MAX_SPEED * Math.pow(s / speeds, 1.3);
        const r = simulate(world, x, y, ang, sp, 0, 20);
        total++;
        const score = r.holed ? -1 : r.water ? 99 : D(r.x, r.y);
        if (r.holed) holes++;
        if (!best || score < best.score) best = { score, ang, sp, r };
      }
    }
    if (shots === 1) firstShotHoleRate = holes / total;
    path.push({ x: +x.toFixed(3), y: +y.toFixed(3), ang: +(best.ang * 180 / Math.PI).toFixed(1), sp: +best.sp.toFixed(2), holes, score: +best.score.toFixed(3) });
    if (best.r.holed) return { shots, firstShotHoleRate, path };
    x = best.r.x; y = best.r.y;
  }
  return { shots: maxShots + 1, firstShotHoleRate, path };
}
