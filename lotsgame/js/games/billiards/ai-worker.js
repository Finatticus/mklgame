// 撞球 AI：以「假想球」找出可進的球與袋口，對候選擊球做完整物理模擬（不同力道與旋轉），
// 依進球與母球走位評分；高難度再以加入誤差的多次模擬估計成功率，沒有好球時打防守。
import { W, L, R, POCKETS, HEAD_Y, FOOT_Y, simulateShot, cloneBalls } from './physics.js';
import { judge, legalTargets, remaining } from './rules.js';

export const LEVELS = {
  l1: { ang: 1.25, sp: 0.08, cand: 3, speeds: [1.3], spins: [[0, 0]], mc: 0, safety: false, place: 2 },
  l2: { ang: 0.75, sp: 0.06, cand: 5, speeds: [1.1, 1.6], spins: [[0, 0]], mc: 0, safety: false, place: 4 },
  l3: { ang: 0.42, sp: 0.045, cand: 7, speeds: [1.0, 1.4, 2.0], spins: [[0, 0], [0, 0.3], [0, -0.3]], mc: 5, safety: true, place: 8 },
  l4: { ang: 0.26, sp: 0.032, cand: 9, speeds: [0.9, 1.25, 1.7, 2.4], spins: [[0, 0], [0, 0.35], [0, -0.35]], mc: 8, safety: true, place: 12 },
  l5: { ang: 0.14, sp: 0.022, cand: 11, speeds: [0.85, 1.15, 1.5, 2.0, 2.7], spins: [[0, 0], [0, 0.4], [0, -0.4], [0.3, 0.1], [-0.3, 0.1]], mc: 10, safety: true, place: 16 },
};

const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
function segClear(balls, ax, ay, bx, by, skip, rad = 2 * R) {
  const dx = bx - ax, dy = by - ay, LL = dx * dx + dy * dy;
  for (const o of balls) {
    if (!o.on || skip.includes(o.n)) continue;
    let t = ((o.x - ax) * dx + (o.y - ay) * dy) / LL; t = Math.max(0, Math.min(1, t));
    if (Math.hypot(o.x - (ax + dx * t), o.y - (ay + dy * t)) < rad - 0.001) return false;
  }
  return true;
}
// 袋口瞄準點（略往袋內）
const AIMPT = POCKETS.map((p) => ({ x: Math.min(W - 0.01, Math.max(0.01, p.x)), y: Math.min(L - 0.01, Math.max(0.01, p.y)), side: Math.abs(p.y - L / 2) < 0.1 }));

// 幾何候選：回傳 [{ n, pocket, ang, cut, d1, d2, score }]
export function candidates(balls, targets) {
  const cue = balls.find((b) => b.n === 0 && b.on);
  if (!cue) return [];
  const out = [];
  for (const n of targets) {
    const ob = balls.find((b) => b.n === n && b.on);
    if (!ob) continue;
    POCKETS.forEach((pk, p) => {
      const ap = AIMPT[p];
      let dx = ap.x - ob.x, dy = ap.y - ob.y;
      const d2 = Math.hypot(dx, dy); dx /= d2; dy /= d2;
      if (ap.side && Math.abs(dy) > 0.82) return; // 中袋太斜進不去
      const gx = ob.x - dx * 2 * R, gy = ob.y - dy * 2 * R;
      if (gx < R || gx > W - R || gy < R || gy > L - R) return;
      const cx = gx - cue.x, cy = gy - cue.y, d1 = Math.hypot(cx, cy);
      if (d1 < 1e-6) return;
      const cos = (cx * dx + cy * dy) / d1;
      if (cos < 0.2) return; // 切角超過約 78°
      if (!segClear(balls, cue.x, cue.y, gx, gy, [0, n])) return;
      if (!segClear(balls, ob.x, ob.y, ap.x, ap.y, [0, n])) return;
      const score = Math.pow(cos, 1.6) / (0.35 + d1 * 0.6 + d2);
      out.push({ n, pocket: p, ang: Math.atan2(cy, cx), cut: Math.acos(Math.min(1, cos)), d1, d2, score });
    });
  }
  return out.sort((a, b) => b.score - a.score);
}

// 估計需要的母球速度：讓目標球滾到袋口還有餘速
function baseSpeed(c) {
  const vObj = Math.sqrt(2 * 0.011 * 9.81 * (c.d2 + 0.25)) + 0.35;
  return Math.min(6.5, vObj / Math.max(0.3, Math.cos(c.cut)) + Math.sqrt(2 * 0.12 * 9.81 * c.d1) * 0.35 + 0.15);
}

function nextShotValue(balls, st, me) {
  const t = legalTargets({ ...st, turn: me }, balls);
  const c = candidates(balls, t);
  if (!c.length) return 0;
  return Math.min(1, c[0].score * 2.2) + Math.min(0.3, c.length * 0.03);
}

export function evaluate(balls, st, shot) {
  const r = simulateShot(balls, shot.ang, shot.speed, shot.side, shot.vert);
  const j = judge({ ...st, called: shot.called }, balls, r.balls, r.ev);
  const me = st.turn;
  if (j.winner === me) return { v: 100, j, r };
  if (j.winner != null) return { v: -100, j, r };
  if (j.foul) return { v: -8 - nextShotValue(r.balls, { ...st, groups: j.groups }, 1 - me) * 2, j, r };
  if (j.keep) return { v: 6 + nextShotValue(r.balls, { ...st, groups: j.groups }, me) * 4, j, r };
  return { v: -nextShotValue(r.balls, { ...st, groups: j.groups }, 1 - me) * 3, j, r };
}

export function plan(balls, st, lv) {
  const me = st.turn, myGroup = st.groups[me];
  const onEight = myGroup && remaining(balls, myGroup).length === 0;
  const targets = legalTargets(st, balls);
  const cands = candidates(balls, targets).slice(0, lv.cand);
  const tries = [];
  for (const c of cands) {
    const base = baseSpeed(c);
    for (const k of lv.speeds) for (const [side, vert] of lv.spins) {
      const shot = { ang: c.ang, speed: Math.min(7, base * k), side, vert, called: onEight ? c.pocket : null, cand: c };
      const e = evaluate(balls, st, shot);
      tries.push({ shot, v: e.v });
    }
  }
  tries.sort((a, b) => b.v - a.v);
  // 以加入誤差的模擬估計期望值
  if (lv.mc && tries.length) {
    const top = tries.slice(0, 4);
    for (const t of top) {
      let sum = 0;
      for (let i = 0; i < lv.mc; i++) {
        const s = { ...t.shot, ang: t.shot.ang + gauss() * lv.ang * Math.PI / 180, speed: t.shot.speed * (1 + gauss() * lv.sp) };
        sum += evaluate(balls, st, s).v;
      }
      t.ev = sum / lv.mc;
    }
    top.sort((a, b) => b.ev - a.ev);
    tries.splice(0, top.length, ...top);
  }
  let best = tries[0];
  const bestVal = best ? (best.ev != null ? best.ev : best.v) : -99;
  // 防守：沒有把握時，找合法且讓對手最難打的球
  if (lv.safety && bestVal < 2) {
    const cue = balls.find((b) => b.n === 0);
    let safe = null;
    for (let a = 0; a < 72; a++) {
      const ang = (a / 72) * Math.PI * 2;
      for (const sp of [0.7, 1.1, 1.7]) {
        const shot = { ang, speed: sp, side: 0, vert: 0, called: onEight ? 0 : null };
        const e = evaluate(balls, st, shot);
        if (e.j.foul || e.j.winner != null) continue;
        const v = e.j.keep ? 5 : -nextShotValue(e.r.balls, { ...st, groups: e.j.groups }, 1 - me) * 3 + 0.5;
        if (!safe || v > safe.v) safe = { shot, v };
      }
    }
    void cue;
    if (safe && safe.v > bestVal) best = safe;
  }
  if (!best) {
    // 最後手段：朝最近的合法球直打
    const cue = balls.find((b) => b.n === 0);
    const t = balls.filter((b) => b.on && targets.includes(b.n)).sort((a, b) => Math.hypot(a.x - cue.x, a.y - cue.y) - Math.hypot(b.x - cue.x, b.y - cue.y))[0];
    best = { shot: { ang: Math.atan2(t.y - cue.y, t.x - cue.x), speed: 1.8, side: 0, vert: 0, called: onEight ? 0 : null } };
  }
  return best.shot;
}

// 自由球擺放：嘗試在各目標球的直線進球位置擺母球
function placeCue(balls, st, lv, kitchen) {
  const targets = legalTargets(st, balls);
  const spots = [];
  for (const n of targets) {
    const ob = balls.find((b) => b.n === n && b.on);
    if (!ob || (kitchen && ob.y < HEAD_Y)) continue;
    POCKETS.forEach((pk, p) => {
      const ap = AIMPT[p];
      let dx = ap.x - ob.x, dy = ap.y - ob.y; const d = Math.hypot(dx, dy); dx /= d; dy /= d;
      for (const back of [0.25, 0.4, 0.6]) for (const off of [0, 0.08, -0.08]) {
        const x = ob.x - dx * (2 * R + back) - dy * off, y = ob.y - dy * (2 * R + back) + dx * off;
        if (x < R + 0.01 || x > W - R - 0.01 || y < R + 0.01 || y > L - R - 0.01) continue;
        if (kitchen && y > HEAD_Y - 0.005) continue;
        if (balls.some((o) => o.on && o.n !== 0 && Math.hypot(o.x - x, o.y - y) < 2 * R + 0.003)) continue;
        spots.push([x, y]);
      }
    });
  }
  if (kitchen) spots.push([W / 2, HEAD_Y * 0.6], [W * 0.3, HEAD_Y * 0.6], [W * 0.7, HEAD_Y * 0.6]);
  let best = null;
  const tryN = Math.min(spots.length, lv.place * 3);
  for (let i = 0; i < tryN; i++) {
    const sp = spots[Math.floor((i / tryN) * spots.length)];
    const b2 = cloneBalls(balls); const cue = b2.find((b) => b.n === 0);
    Object.assign(cue, { x: sp[0], y: sp[1], on: true, moving: false, vx: 0, vy: 0, wx: 0, wy: 0, wz: 0 });
    const c = candidates(b2, legalTargets(st, b2));
    const v = c.length ? c[0].score : -1;
    if (!best || v > best.v) best = { v, sp };
  }
  return best ? best.sp : [W / 2, kitchen ? HEAD_Y * 0.6 : L / 2];
}

if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) self.onmessage = (e) => {
  const { id, payload } = e.data;
  try {
    const { balls, st, level, inHand } = payload;
    const lv = LEVELS[level] || LEVELS.l3;
    const b = cloneBalls(balls);
    let place = null;
    if (inHand) {
      place = st.isBreak ? [W / 2 + (Math.random() - 0.5) * 0.25, HEAD_Y * 0.6] : placeCue(b, st, lv, inHand === 'kitchen');
      const cue = b.find((x) => x.n === 0);
      Object.assign(cue, { x: place[0], y: place[1], on: true, moving: false, vx: 0, vy: 0, wx: 0, wy: 0, wz: 0 });
    }
    let shot;
    if (st.isBreak) {
      const cue = b.find((x) => x.n === 0);
      const ang = Math.atan2(FOOT_Y - cue.y, W / 2 - cue.x);
      shot = { ang, speed: 8.2 + Math.random() * 0.6, side: 0, vert: -0.08, called: null };
    } else shot = plan(b, st, lv);
    // 執行誤差
    const out = { ...shot, ang: shot.ang + gauss() * lv.ang * Math.PI / 180 * (st.isBreak ? 0.5 : 1), speed: shot.speed * (1 + gauss() * lv.sp), place };
    delete out.cand;
    self.postMessage({ id, result: out });
  } catch (err) {
    self.postMessage({ id, error: String((err && err.message) || err) });
  }
};
