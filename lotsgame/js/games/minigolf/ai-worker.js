// 迷你高爾夫電腦球友（Web Worker）：算出最佳一桿，再依程度加上瞄準與力道誤差。
import { buildHole } from './physics.js';
import { bestShot, distanceField, GOLFERS } from './ai.js';

const cache = new Map(); // 同一洞的距離場重複使用
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

self.onmessage = (e) => {
  const { id, payload } = e.data;
  try {
    const { def, key, x, y, t0, level } = payload;
    const world = buildHole(def);
    if (!cache.has(key)) { cache.clear(); cache.set(key, distanceField(world)); }
    // 有移動機關時，比較幾個出桿時機，必要時等空檔
    const waits = world.movers.length ? [0, 0.8, 1.6, 2.4] : [0];
    let shot = null, at = t0;
    for (const wdt of waits) { const c = bestShot(world, x, y, t0 + wdt, { D: cache.get(key) }); if (!shot || c.s < shot.s - 0.02) { shot = c; at = t0 + wdt; } if (shot.s === -1) break; }
    const lv = GOLFERS[level] || GOLFERS.amateur;
    const ang = shot.ang + (gauss() * lv.ang * Math.PI) / 180;
    const speed = Math.max(0.05, shot.sp * (1 + gauss() * lv.sp));
    self.postMessage({ id, result: { ang, speed, at } });
  } catch (err) {
    self.postMessage({ id, error: String((err && err.message) || err) });
  }
};
