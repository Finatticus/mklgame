// 迷你高爾夫物理：以公尺、秒為單位。純計算，不碰畫面（介面與解題程式共用）。
// 球在起伏的草皮上滾動：坡度產生 5/7·g·sinθ 的加速度（滾動球體），草皮有固定滾動阻力，
// 撞牆依材質反彈，球洞以「球通過洞口的時間是否足以落下」判定進洞或擦邊彈出。
export const BALL_R = 0.02135;
export const CUP_R = 0.054;
export const MAX_SPEED = 2.6;
const G = 9.81;
const ROLL = 0.6; // 草皮滾動減速度（m/s²），約相當於果嶺速度 10 呎
const SAND = 3.2;
const ICE = 0.16; // 冰面滾動阻力很小
const REST = 0.4; // 小於此坡度加速度時，靜止的球不會再滾
const DT = 1 / 600;
const TNEED = Math.sqrt((2 * BALL_R * 0.9) / G); // 球心下沉約一個半徑所需時間
export const MAT = {
  wood: { e: 0.62, f: 0.1 },
  stone: { e: 0.5, f: 0.14 },
  rubber: { e: 0.8, f: 0.06 },
  metal: { e: 0.55, f: 0.08 },
};

// ---------- 地形 ----------
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
  let t = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const qx = ax + dx * t, qy = ay + dy * t;
  return { d: Math.hypot(px - qx, py - qy), qx, qy, t };
}
function maskVal(m, x, y) {
  if (!m) return 1;
  const s = m.soft || 0.15;
  const fx = Math.min(smooth((x - m.x0) / s + 0.5), smooth((m.x1 - x) / s + 0.5));
  const fy = Math.min(smooth((y - m.y0) / s + 0.5), smooth((m.y1 - y) / s + 0.5));
  return fx * fy;
}

export function heightFn(list = []) {
  const prims = list.map((p) => {
    switch (p.t) {
      case 'tilt': return (x, y) => (p.gx || 0) * x + (p.gy || 0) * y;
      case 'ramp': {
        const [ax, ay] = p.a, [bx, by] = p.b, dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
        return (x, y) => p.h * smooth(((x - ax) * dx + (y - ay) * dy) / L2);
      }
      case 'hill': { const s2 = 2 * (p.r / 2.4) ** 2; return (x, y) => p.h * Math.exp(-((x - p.x) ** 2 + (y - p.y) ** 2) / s2); }
      case 'cone': return (x, y) => p.h * smooth(1 - Math.hypot(x - p.x, y - p.y) / p.r);
      case 'ring': { const s2 = 2 * ((p.w || 0.12) / 2.4) ** 2; return (x, y) => { const d = Math.hypot(x - p.x, y - p.y) - p.r; return p.h * Math.exp(-(d * d) / s2); }; }
      case 'mesa': return (x, y) => p.h * smooth((x - p.x0) / p.e + 0.5) * smooth((p.x1 - x) / p.e + 0.5) * smooth((y - p.y0) / p.e + 0.5) * smooth((p.y1 - y) / p.e + 0.5);
      case 'ridge': { const s2 = 2 * (p.r / 2.4) ** 2; return (x, y) => { const d = segDist(x, y, p.a[0], p.a[1], p.b[0], p.b[1]).d; return p.h * Math.exp(-(d * d) / s2); }; }
      default: return () => 0;
    }
  });
  const masks = list.map((p) => p.mask || null);
  const h = (x, y) => { let s = 0; for (let i = 0; i < prims.length; i++) { const m = masks[i] ? maskVal(masks[i], x, y) : 1; if (m) s += prims[i](x, y) * m; } return s; };
  const e = 0.004;
  const grad = (x, y) => [(h(x + e, y) - h(x - e, y)) / (2 * e), (h(x, y + e) - h(x, y - e)) / (2 * e)];
  return { h, grad };
}

export function inPoly(poly, x, y) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// ---------- 建立球洞 ----------
// 球洞資料以較小的尺寸繪製，建立時整體放大 SCALE 倍（坡度不變，球與洞維持標準尺寸）
export const SCALE = 1.45;
function scaleDef(d, k) {
  const P = (p) => [p[0] * k, p[1] * k];
  const sc = (m) => m && { x0: m.x0 * k, y0: m.y0 * k, x1: m.x1 * k, y1: m.y1 * k, soft: (m.soft || 0.15) * k };
  return Object.assign({}, d, {
    green: d.green.map(P), tee: P(d.tee), cup: P(d.cup),
    walls: (d.walls || []).map((w) => Object.assign({}, w, { pts: w.pts.map(P) })),
    posts: (d.posts || []).map((p) => Object.assign({}, p, { x: p.x * k, y: p.y * k, r: p.r * k })),
    sand: (d.sand || []).map((p) => p.map(P)), water: (d.water || []).map((p) => p.map(P)), ice: (d.ice || []).map((p) => p.map(P)), lava: (d.lava || []).map((p) => p.map(P)),
    decor: (d.decor || []).map((o) => Object.assign({}, o, { x: o.x * k, y: o.y * k, r: o.r * k })),
    tunnels: (d.tunnels || []).map((t) => Object.assign({}, t, { in: P(t.in), out: P(t.out) })),
    movers: (d.movers || []).map((m) => Object.assign({}, m, m.t === 'slider' ? { a: P(m.a), b: P(m.b), len: m.len * k } : { x: m.x * k, y: m.y * k, len: m.len * k })),
    height: (d.height || []).map((h) => {
      const o = Object.assign({}, h, { mask: sc(h.mask) });
      if (h.t === 'tilt') return o; // 坡度（無因次）不變
      for (const key of ['h', 'x', 'y', 'r', 'w', 'x0', 'y0', 'x1', 'y1', 'e']) if (h[key] != null) o[key] = h[key] * k;
      if (h.a) o.a = P(h.a); if (h.b) o.b = P(h.b);
      return o;
    }),
    wallW: d.wallW,
  });
}

export function buildHole(def0) {
  const def = scaleDef(def0, SCALE);
  const segs = [];
  const addLine = (pts, closed, w, mat) => {
    const n = pts.length;
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      segs.push({ ax: a[0], ay: a[1], bx: b[0], by: b[1], rr: w / 2, m: MAT[mat] || MAT.wood, mat });
    }
  };
  addLine(def.green, true, def.wallW || 0.07, def.wallMat || 'wood');
  for (const w of def.walls || []) addLine(w.pts, !!w.closed, w.w || 0.06, w.mat || def.wallMat || 'wood');
  const posts = (def.posts || []).map((p) => ({ x: p.x, y: p.y, r: p.r, m: MAT[p.mat || 'stone'], mat: p.mat || 'stone' }));
  const { h, grad } = heightFn(def.height);
  return {
    def, segs, posts, h, grad,
    sand: def.sand || [], water: (def.water || []).concat(def.lava || []), pools: def.water || [], lava: def.lava || [], ice: def.ice || [],
    movers: (def.movers || []).map((m) => Object.assign({ phase: 0 }, m)),
    tunnels: def.tunnels || [],
    cup: { x: def.cup[0], y: def.cup[1] },
    tee: { x: def.tee[0], y: def.tee[1] },
  };
}

// 移動障礙在時間 t 的碰撞形狀：[{ax, ay, bx, by, rr, vel(x, y)}]
export function moverShapes(m, t) {
  if (m.t === 'spinner') {
    const out = [], ang = m.phase + m.speed * t, n = m.arms || 2;
    const vel = (x, y) => [-m.speed * (y - m.y), m.speed * (x - m.x)];
    for (let k = 0; k < n; k++) {
      const a = ang + (k * Math.PI * 2) / n;
      out.push({ ax: m.x, ay: m.y, bx: m.x + Math.cos(a) * m.len, by: m.y + Math.sin(a) * m.len, rr: m.w / 2, vel, m: MAT[m.mat || 'wood'], mat: m.mat || 'wood' });
    }
    return out;
  }
  if (m.t === 'pendulum') {
    // 擺錘：以 x, y 為支點，在 base 方向左右擺動 amp 弧度
    const w = (Math.PI * 2) / m.period, ph = w * t + (m.phase || 0);
    const gate = m.mode === 'gate';
    const ang = gate ? m.base + m.amp * (0.5 - 0.5 * Math.cos(ph)) : m.base + m.amp * Math.sin(ph);
    const om = gate ? m.amp * 0.5 * w * Math.sin(ph) : m.amp * w * Math.cos(ph);
    const vel = (x, y) => [-om * (y - m.y), om * (x - m.x)];
    const r0 = m.from || 0;
    return [{ ax: m.x + Math.cos(ang) * r0, ay: m.y + Math.sin(ang) * r0, bx: m.x + Math.cos(ang) * m.len, by: m.y + Math.sin(ang) * m.len, rr: m.w / 2, vel, m: MAT[m.mat || 'wood'], mat: m.mat || 'wood' }];
  }
  if (m.t === 'slider') {
    const w = (Math.PI * 2) / m.period, s = 0.5 - 0.5 * Math.cos(w * t + m.phase), sv = 0.5 * w * Math.sin(w * t + m.phase);
    const cx = m.a[0] + (m.b[0] - m.a[0]) * s, cy = m.a[1] + (m.b[1] - m.a[1]) * s;
    const vx = (m.b[0] - m.a[0]) * sv, vy = (m.b[1] - m.a[1]) * sv;
    const ang = m.angle || 0, hx = Math.cos(ang) * m.len / 2, hy = Math.sin(ang) * m.len / 2;
    return [{ ax: cx - hx, ay: cy - hy, bx: cx + hx, by: cy + hy, rr: m.w / 2, vel: () => [vx, vy], m: MAT[m.mat || 'stone'], mat: m.mat || 'stone' }];
  }
  return [];
}

// ---------- 模擬 ----------
// 球的狀態：{ x, y, vx, vy, t, moving, over, holed, hidden, tunnel, inSand }
export function newBall(world, x, y, t = 0) {
  return { x, y, vx: 0, vy: 0, t, moving: false, over: false, holed: false, hidden: 0, tunnel: null, inSand: false, still: 0 };
}

export function strike(ball, angle, speed) {
  ball.vx = Math.cos(angle) * speed;
  ball.vy = Math.sin(angle) * speed;
  ball.moving = true;
  ball.still = 0;
}

function collideCapsule(b, s, ev, vel) {
  const r = segDist(b.x, b.y, s.ax, s.ay, s.bx, s.by), lim = BALL_R + s.rr;
  if (r.d >= lim) return;
  let nx, ny;
  if (r.d > 1e-9) { nx = (b.x - r.qx) / r.d; ny = (b.y - r.qy) / r.d; }
  else { const dx = s.bx - s.ax, dy = s.by - s.ay, L = Math.hypot(dx, dy) || 1; nx = -dy / L; ny = dx / L; }
  const [wx, wy] = vel ? vel(r.qx, r.qy) : [0, 0];
  let rvx = b.vx - wx, rvy = b.vy - wy;
  const vn = rvx * nx + rvy * ny;
  b.x = r.qx + nx * lim; b.y = r.qy + ny * lim;
  if (vn < 0) {
    const tx = rvx - vn * nx, ty = rvy - vn * ny;
    rvx = -vn * s.m.e * nx + tx * (1 - s.m.f);
    rvy = -vn * s.m.e * ny + ty * (1 - s.m.f);
    b.vx = rvx + wx; b.vy = rvy + wy;
    b.moving = true;
    if (-vn > 0.08) ev.push({ type: 'wall', speed: -vn, mat: s.mat });
  }
}

// 前進一個時間步；回傳事件陣列
export function step(world, b, dt = DT) {
  const ev = [];
  b.t += dt;
  if (b.holed) return ev;
  if (b.hidden > 0) {
    b.hidden -= dt;
    if (b.hidden <= 0) {
      const tn = b.tunnel, a = (tn.dir * Math.PI) / 180;
      b.x = tn.out[0]; b.y = tn.out[1];
      const sp = Math.max(0.35, b.tunnelSpeed * (tn.keep || 0.8));
      b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
      b.tunnel = null; b.moving = true; b.over = false;
      ev.push({ type: 'tunnelOut' });
    }
    return ev;
  }

  // 移動障礙即使球靜止也會撞到球
  for (const m of world.movers) for (const s of moverShapes(m, b.t)) collideCapsule(b, s, ev, s.vel);

  const [gx, gy] = world.grad(b.x, b.y);
  const sax = -(5 / 7) * G * gx, say = -(5 / 7) * G * gy;
  const slopeA = Math.hypot(sax, say);
  const inSand = world.sand.some((p) => inPoly(p, b.x, b.y));
  const onIce = !inSand && world.ice.length > 0 && world.ice.some((p) => inPoly(p, b.x, b.y));
  if (inSand && !b.inSand && b.moving) ev.push({ type: 'sand' });
  b.inSand = inSand;
  const fr = inSand ? SAND : onIce ? ICE : ROLL;
  const rest = REST * (inSand ? 4 : onIce ? 0.35 : 1);
  let sp = Math.hypot(b.vx, b.vy);

  if (!b.moving) {
    if (slopeA > rest) b.moving = true;
    else return ev;
  }
  if (sp > 1e-6) {
    const dec = Math.min(sp, fr * dt);
    b.vx += sax * dt - (b.vx / sp) * dec;
    b.vy += say * dt - (b.vy / sp) * dec;
  } else {
    b.vx += sax * dt; b.vy += say * dt;
  }
  sp = Math.hypot(b.vx, b.vy);
  // 停止判定：速度極小且坡度不足以推動
  if (sp < 0.012 && slopeA < rest) {
    b.still += dt;
    if (b.still > 0.08) { b.vx = 0; b.vy = 0; b.moving = false; b.still = 0; ev.push({ type: 'stop' }); }
  } else b.still = 0;

  b.x += b.vx * dt; b.y += b.vy * dt;

  for (const s of world.segs) collideCapsule(b, s, ev, null);
  for (const p of world.posts) {
    const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy), lim = BALL_R + p.r;
    if (d < lim && d > 1e-9) {
      const nx = dx / d, ny = dy / d, vn = b.vx * nx + b.vy * ny;
      b.x = p.x + nx * lim; b.y = p.y + ny * lim;
      if (vn < 0) {
        const tx = b.vx - vn * nx, ty = b.vy - vn * ny;
        b.vx = -vn * p.m.e * nx + tx * (1 - p.m.f); b.vy = -vn * p.m.e * ny + ty * (1 - p.m.f);
        if (-vn > 0.08) ev.push({ type: 'wall', speed: -vn, mat: p.mat });
      }
    }
  }

  // 球洞
  const c = world.cup, dx = c.x - b.x, dy = c.y - b.y, d = Math.hypot(dx, dy);
  if (d < CUP_R) {
    sp = Math.hypot(b.vx, b.vy);
    if (!b.over) {
      b.over = true;
      const ux = sp > 1e-6 ? b.vx / sp : 0, uy = sp > 1e-6 ? b.vy / sp : 0;
      const off = Math.abs(ux * dy - uy * dx); // 洞心到球路的距離
      const chord = 2 * Math.sqrt(Math.max(0, CUP_R * CUP_R - off * off));
      if (sp < 0.03 || chord / sp >= TNEED) { b.holed = true; b.moving = false; b.vx = b.vy = 0; ev.push({ type: 'holed', speed: sp }); return ev; }
      // 擦邊：球撞上對側洞緣，減速並偏離
      const side = Math.sign(ux * dy - uy * dx) || 1;
      const ang = -side * 0.55 * (1 - off / CUP_R) * Math.min(1, 1.6 / (sp + 0.4));
      const k = 0.72, ca = Math.cos(ang), sa = Math.sin(ang);
      const nvx = (b.vx * ca - b.vy * sa) * k, nvy = (b.vx * sa + b.vy * ca) * k;
      b.vx = nvx; b.vy = nvy;
      ev.push({ type: 'lip', speed: sp });
    } else if (sp < 0.05) { b.holed = true; b.moving = false; b.vx = b.vy = 0; ev.push({ type: 'holed', speed: sp }); return ev; }
  } else if (d > CUP_R + 0.002) b.over = false;

  // 水池
  for (const p of world.water) if (inPoly(p, b.x, b.y)) { b.moving = false; b.vx = b.vy = 0; ev.push({ type: 'water', lava: world.lava.includes(p) }); return ev; }
  // 管道入口
  for (const tn of world.tunnels) {
    if (Math.hypot(b.x - tn.in[0], b.y - tn.in[1]) < (tn.r || 0.05)) {
      b.tunnel = tn; b.tunnelSpeed = Math.hypot(b.vx, b.vy); b.hidden = tn.delay || 0.7;
      ev.push({ type: 'tunnelIn' });
      return ev;
    }
  }
  return ev;
}

// 快速模擬一整桿（解題與測試用）。回傳 { holed, water, x, y, time }
export function simulate(world, x, y, angle, speed, t0 = 0, maxTime = 30) {
  const b = newBall(world, x, y, t0);
  strike(b, angle, speed);
  let water = false, steps = 0;
  const lim = maxTime / DT;
  while (steps++ < lim) {
    const ev = step(world, b);
    if (b.holed) break;
    if (ev.some((e) => e.type === 'water')) { water = true; break; }
    if (!b.moving && b.hidden <= 0 && !world.movers.length) break;
    if (!b.moving && b.hidden <= 0 && steps > 60) break;
  }
  return { holed: b.holed, water, x: b.x, y: b.y, time: b.t - t0 };
}

export const STEP_DT = DT;
