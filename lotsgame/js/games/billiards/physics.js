// 撞球物理（9 呎球檯，單位公尺、秒）。座標：x 向右、y 朝檯尾（遠端）、z 朝上，右手座標系。
// 每顆球有線速度與三軸角速度：與檯呢有滑動時受滑動摩擦（同時改變旋轉），滑動消失後進入純滾動，
// 因此推桿、拉桿、定桿會自然出現；側旋撞庫時經庫邊摩擦改變反彈角度。
export const W = 1.27, L = 2.54, R = 0.028575;
export const HEAD_Y = L / 4, FOOT_Y = (L * 3) / 4;
const G = 9.81;
const MU_SLIDE = 0.2, MU_ROLL = 0.011, SPIN_DECAY = 7; // 側旋衰減（rad/s²）
const E_BALL = 0.94, E_CUSH = 0.78, MU_CUSH = 0.18;
export const DT = 1 / 1000;

// ---------- 球檯輪廓 ----------
export const A = 0.084; // 角袋袋口到檯角的距離（沿庫邊）
export const HS = 0.066; // 中袋半寬
// 庫邊與袋角線段。角袋袋角與庫邊夾 142°，中袋袋角夾 104°（向袋內收）。
function buildCushions() {
  const s = [[A, 0, W - A, 0], [A, L, W - A, L], [0, A, 0, L / 2 - HS], [0, L / 2 + HS, 0, L - A], [W, A, W, L / 2 - HS], [W, L / 2 + HS, W, L - A]];
  const c = 0.788, d = 0.616, J = 0.065, SJ = 0.045, sx = 0.97, sy = 0.242;
  const jaws = [
    [A, 0, -c, -d, J], [0, A, -d, -c, J], [W - A, 0, c, -d, J], [W, A, d, -c, J],
    [A, L, -c, d, J], [0, L - A, -d, c, J], [W - A, L, c, d, J], [W, L - A, d, c, J],
    [0, L / 2 - HS, -sx, sy, SJ], [0, L / 2 + HS, -sx, -sy, SJ], [W, L / 2 - HS, sx, sy, SJ], [W, L / 2 + HS, sx, -sy, SJ],
  ];
  for (const [x, y, dx, dy, len] of jaws) s.push([x, y, x + dx * len, y + dy * len]);
  return s.map(([ax, ay, bx, by]) => ({ ax, ay, bx, by }));
}
export const CUSHIONS = buildCushions();
// 袋口：球心進入此圓即落袋
export const POCKETS = [
  { x: -0.016, y: -0.016, r: 0.06, name: '左下角袋' },
  { x: W + 0.016, y: -0.016, r: 0.06, name: '右下角袋' },
  { x: -0.034, y: L / 2, r: 0.056, name: '左中袋' },
  { x: W + 0.034, y: L / 2, r: 0.056, name: '右中袋' },
  { x: -0.016, y: L + 0.016, r: 0.06, name: '左上角袋' },
  { x: W + 0.016, y: L + 0.016, r: 0.06, name: '右上角袋' },
];

// ---------- 球 ----------
export function makeBall(n, x, y) {
  return { n, x, y, vx: 0, vy: 0, wx: 0, wy: 0, wz: 0, on: true, moving: false, q: [1, 0, 0, 0] };
}

// 8 號球擺球：頂點球在置球點，8 號在第三排中央，最後一排兩角一顆全色一顆花色
export function rack8(rand = Math.random) {
  const solids = [1, 2, 3, 4, 5, 6, 7], stripes = [9, 10, 11, 12, 13, 14, 15];
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  shuffle(solids); shuffle(stripes);
  const slots = [];
  for (let k = 0; k < 5; k++) for (let i = 0; i <= k; i++) slots.push([k, i]);
  const order = new Array(15).fill(0);
  const idx = (k, i) => slots.findIndex(([a, b]) => a === k && b === i);
  order[idx(2, 1)] = 8;
  const cornerSolid = rand() < 0.5;
  order[idx(4, 0)] = cornerSolid ? solids.pop() : stripes.pop();
  order[idx(4, 4)] = cornerSolid ? stripes.pop() : solids.pop();
  const rest = shuffle([...solids, ...stripes]);
  for (let i = 0; i < 15; i++) if (!order[i]) order[i] = rest.pop();
  const balls = [makeBall(0, W / 2, HEAD_Y * 0.55)];
  const gap = 0.0002, dy = (2 * R + gap) * Math.sqrt(3) / 2;
  slots.forEach(([k, i], j) => balls.push(makeBall(order[j], W / 2 + (i - k / 2) * (2 * R + gap), FOOT_Y + k * dy)));
  return balls;
}

// 擊球：angle 行進方向，speed 公尺/秒，side / vert 為擊點偏移（以球半徑為單位，±0.5 內）
export function strike(cue, angle, speed, side = 0, vert = 0) {
  cue.vx = Math.cos(angle) * speed; cue.vy = Math.sin(angle) * speed;
  const k = (2.5 * vert) / R;
  cue.wx = -cue.vy * k; cue.wy = cue.vx * k;
  cue.wz = (-2.5 * side * speed) / R;
  cue.moving = true;
}

function segHit(b, s, ev, track) {
  const dx = s.bx - s.ax, dy = s.by - s.ay, LL = dx * dx + dy * dy;
  let t = ((b.x - s.ax) * dx + (b.y - s.ay) * dy) / LL; t = t < 0 ? 0 : t > 1 ? 1 : t;
  const qx = s.ax + dx * t, qy = s.ay + dy * t;
  let nx = b.x - qx, ny = b.y - qy;
  const d = Math.hypot(nx, ny);
  if (d >= R || d < 1e-9) return;
  nx /= d; ny /= d;
  b.x = qx + nx * R; b.y = qy + ny * R;
  const vn = b.vx * nx + b.vy * ny;
  if (vn >= 0) return;
  const jn = -(1 + E_CUSH) * vn; // 法向衝量（單位質量）
  b.vx += jn * nx; b.vy += jn * ny;
  // 切向：接觸點相對庫邊的滑動，受庫邊摩擦（側旋因此改變反彈角）
  const tx = -ny, ty = nx;
  const rcx = -nx * R, rcy = -ny * R; // 球心到接觸點
  const slip = b.vx * tx + b.vy * ty + b.wz * (-rcy * tx + rcx * ty);
  let jt = -slip / 3.5;
  const lim = MU_CUSH * jn;
  if (jt > lim) jt = lim; else if (jt < -lim) jt = -lim;
  b.vx += jt * tx; b.vy += jt * ty;
  b.wz += (2.5 / (R * R)) * (rcx * jt * ty - rcy * jt * tx);
  // 撞庫時球的上下旋多半被吃掉
  b.wx *= 0.6; b.wy *= 0.6;
  if (track) ev.push({ type: 'cushion', n: b.n, speed: -vn });
}

function rotateQ(b, dt) {
  const w = Math.hypot(b.wx, b.wy, b.wz);
  if (w < 1e-6) return;
  const a = w * dt * 0.5, s = Math.sin(a) / w, c = Math.cos(a);
  const dq = [c, b.wx * s, b.wy * s, b.wz * s], q = b.q;
  b.q = [
    dq[0] * q[0] - dq[1] * q[1] - dq[2] * q[2] - dq[3] * q[3],
    dq[0] * q[1] + dq[1] * q[0] + dq[2] * q[3] - dq[3] * q[2],
    dq[0] * q[2] - dq[1] * q[3] + dq[2] * q[0] + dq[3] * q[1],
    dq[0] * q[3] + dq[1] * q[2] - dq[2] * q[1] + dq[3] * q[0],
  ];
  const n = Math.hypot(...b.q); b.q = b.q.map((v) => v / n);
}

// 前進一步。track 為 true 時記錄事件（介面音效與規則判定用）；orient 為 true 時更新球的姿態（繪圖用）
export function step(balls, ev, track = true, orient = false) {
  const dt = DT;
  let any = false;
  for (const b of balls) {
    if (!b.on || !b.moving) continue;
    any = true;
    const ux = b.vx - R * b.wy, uy = b.vy + R * b.wx, u = Math.hypot(ux, uy);
    if (u > 1e-4) {
      const f = MU_SLIDE * G * dt;
      if (u <= 3.5 * f) { // 這一步內就會進入滾動
        const k = u / 3.5;
        const fx = (-ux / u) * k, fy = (-uy / u) * k;
        b.vx += fx; b.vy += fy;
        b.wx += (2.5 / R) * fy; b.wy -= (2.5 / R) * fx;
      } else {
        const fx = (-ux / u) * f, fy = (-uy / u) * f;
        b.vx += fx; b.vy += fy;
        b.wx += (2.5 / R) * fy; b.wy -= (2.5 / R) * fx;
      }
    } else {
      const sp = Math.hypot(b.vx, b.vy), dec = MU_ROLL * G * dt;
      if (sp <= dec) { b.vx = b.vy = 0; } else { b.vx -= (b.vx / sp) * dec; b.vy -= (b.vy / sp) * dec; }
      b.wx = -b.vy / R; b.wy = b.vx / R;
    }
    if (b.wz) { const d = SPIN_DECAY * dt; b.wz = Math.abs(b.wz) <= d ? 0 : b.wz - Math.sign(b.wz) * d; }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (orient) rotateQ(b, dt);
    if (Math.hypot(b.vx, b.vy) < 1e-4 && Math.abs(b.wz) < 0.05 && Math.hypot(b.wx, b.wy) < 0.01) { b.vx = b.vy = b.wx = b.wy = b.wz = 0; b.moving = false; }
  }
  if (!any) return false;
  // 球與球
  for (let i = 0; i < balls.length; i++) {
    const a = balls[i];
    if (!a.on) continue;
    for (let j = i + 1; j < balls.length; j++) {
      const b = balls[j];
      if (!b.on || (!a.moving && !b.moving)) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
      if (d2 >= 4 * R * R) continue;
      const d = Math.sqrt(d2) || 1e-9, nx = dx / d, ny = dy / d;
      const over = 2 * R - d;
      a.x -= nx * over / 2; a.y -= ny * over / 2; b.x += nx * over / 2; b.y += ny * over / 2;
      const rv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (rv <= 0) continue;
      const j2 = ((1 + E_BALL) / 2) * rv;
      a.vx -= j2 * nx; a.vy -= j2 * ny; b.vx += j2 * nx; b.vy += j2 * ny;
      a.moving = b.moving = true;
      if (track) ev.push({ type: 'ball', a: a.n, b: b.n, speed: rv });
    }
  }
  // 庫邊、袋口
  for (const b of balls) {
    if (!b.on || !b.moving) continue;
    if (b.x < R + 0.01 || b.x > W - R - 0.01 || b.y < R + 0.01 || b.y > L - R - 0.01) for (const s of CUSHIONS) segHit(b, s, ev, track);
    for (let p = 0; p < POCKETS.length; p++) {
      const pk = POCKETS[p];
      if ((b.x - pk.x) ** 2 + (b.y - pk.y) ** 2 < pk.r * pk.r) { pocket(b, p, ev, track); break; }
    }
    // 保險：飛出檯面視為落入最近的袋
    if (b.on && (b.x < -0.05 || b.x > W + 0.05 || b.y < -0.05 || b.y > L + 0.05)) {
      let best = 0, bd = 1e9;
      POCKETS.forEach((pk, i) => { const d = Math.hypot(b.x - pk.x, b.y - pk.y); if (d < bd) { bd = d; best = i; } });
      pocket(b, best, ev, track);
    }
  }
  return true;
}

function pocket(b, p, ev, track) {
  b.on = false; b.moving = false; b.pocket = p;
  if (track) ev.push({ type: 'pocket', n: b.n, pocket: p, speed: Math.hypot(b.vx, b.vy) });
  b.vx = b.vy = b.wx = b.wy = b.wz = 0;
}

export const cloneBalls = (balls) => balls.map((b) => ({ ...b, q: b.q.slice() }));

// 完整模擬一桿（AI 與測試用）。回傳事件列表與最後的球位
export function simulateShot(balls0, angle, speed, side = 0, vert = 0, maxT = 25) {
  const balls = cloneBalls(balls0);
  const cue = balls.find((b) => b.n === 0);
  strike(cue, angle, speed, side, vert);
  const ev = [];
  let n = 0;
  while (n++ < maxT / DT) if (!step(balls, ev, true, false)) break;
  return { balls, ev };
}
