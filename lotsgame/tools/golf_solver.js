// 開發工具：以暴力取樣驗證迷你高爾夫球洞。在瀏覽器主控台 import 後呼叫 solveHole() 或 rateHole()。
// solveHole：貪婪最佳解需要幾桿；rateHole：再估計一般玩家（瞄準 ±2.5°、力道 ±11%）一桿進洞的機率，並建議標準桿。
import { buildHole, simulate, MAX_SPEED } from '../js/games/minigolf/physics.js';
import { distanceField, bestShot } from '../js/games/minigolf/ai.js';
export { distanceField };

export function solveHole(def, { maxShots = 7 } = {}) {
  const world = buildHole(def);
  const D = distanceField(world);
  let x = world.tee.x, y = world.tee.y, shots = 0;
  const path = [];
  while (shots < maxShots) {
    shots++;
    // 有移動機關時，試幾個不同的出桿時機（玩家會等空檔）
    const times = world.movers.length ? [0, 0.7, 1.4, 2.1, 2.8] : [0];
    let b = null, bt = 0;
    for (const t of times) { const c = bestShot(world, x, y, t, { D, A: 150, N: 18 }); if (!b || c.s < b.s) { b = c; bt = t; } if (b.s === -1) break; }
    path.push({ x: +x.toFixed(3), y: +y.toFixed(3), ang: +((b.ang * 180) / Math.PI).toFixed(1), sp: +b.sp.toFixed(2), score: +b.s.toFixed(3) });
    if (b.s === -1) return { shots, path };
    const r = simulate(world, x, y, b.ang, b.sp, bt, 20);
    if (r.holed) return { shots, path };
    if (!r.water) { x = r.x; y = r.y; }
  }
  return { shots: maxShots + 1, path };
}

const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
export function rateHole(def, trials = 100) {
  const g = solveHole(def);
  const world = buildHole(def), D = distanceField(world);
  const b = bestShot(world, world.tee.x, world.tee.y, 0, { D, A: 180, N: 20 });
  const moving = world.movers.length > 0;
  let ace = 0;
  for (let i = 0; i < trials; i++) {
    const t = moving ? Math.random() * 6 : 0;
    if (simulate(world, world.tee.x, world.tee.y, b.ang + (gauss() * 2.5 * Math.PI) / 180, b.sp * (1 + gauss() * 0.11), t, 20).holed) ace++;
  }
  const casual = ace / trials;
  const par = Math.min(5, Math.max(2, g.shots + 1 + (g.shots === 1 && casual < 0.12 ? 1 : 0)));
  return { S0: g.shots, casual, par };
}
void MAX_SPEED;
