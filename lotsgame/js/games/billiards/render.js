// 撞球繪圖：直式畫面時球檯直放（開球區在下），寬螢幕時橫放（開球區在左）。
// 球以逐像素方式依實際姿態著色，花色帶與號碼會隨滾動轉動。
import { loadImage, asset } from '../../ui.js';
import { W, L, R, A, HS, POCKETS, HEAD_Y, FOOT_Y } from './physics.js';

const CUSH = 0.045, RAIL = 0.095; // 庫邊橡膠寬、木框寬
export const COLORS = { 1: [236, 184, 38], 2: [28, 72, 178], 3: [200, 36, 32], 4: [84, 40, 124], 5: [236, 108, 36], 6: [22, 112, 60], 7: [120, 30, 30], 8: [22, 22, 24] };
export const colorOf = (n) => COLORS[n > 8 ? n - 8 : n] || [245, 243, 234];

// 號碼字形（取 alpha 當遮罩）
const DIGITS = {};
function digitMask(n) {
  if (DIGITS[n]) return DIGITS[n];
  const S = 48, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `700 ${n >= 10 ? 25 : 30}px "Helvetica Neue", Arial, sans-serif`;
  g.fillText(String(n), S / 2, S / 2 + 2);
  const d = g.getImageData(0, 0, S, S).data, m = new Uint8Array(S * S);
  for (let i = 0; i < S * S; i++) m[i] = d[i * 4 + 3];
  return (DIGITS[n] = { S, m });
}

export class TableView {
  // opts.size：固定大小（封面用）；opts.view：{ cx, cy, span } 以橫放方式特寫
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.opts = opts;
    this.static = null;
    this.ready = Promise.all([loadImage(asset('wood/walnut.jpg')), loadImage(asset('img/felt.png'))]).then(([wood, felt]) => { this.wood = wood; this.felt = felt; });
  }

  layout() {
    const r = this.opts.size || this.canvas.getBoundingClientRect();
    const dpr = this.opts.dpr || Math.min(2.5, window.devicePixelRatio || 1);
    const CW = Math.max(50, r.W || r.width), CH = Math.max(50, r.H || r.height);
    const OW = W + 2 * (CUSH + RAIL), OL = L + 2 * (CUSH + RAIL);
    let portrait = CH >= CW, s, ox, oy;
    if (this.opts.view) {
      const v = this.opts.view; portrait = false; s = CW / v.span;
      ox = CW / 2 - v.cy * s; oy = CH / 2 - (W - v.cx) * s;
    } else {
      s = portrait ? Math.min(CW / OW, CH / OL) : Math.min(CW / OL, CH / OW);
      ox = portrait ? (CW - W * s) / 2 : (CW - L * s) / 2;
      oy = portrait ? (CH - L * s) / 2 : (CH - W * s) / 2;
    }
    this.L = { CW, CH, dpr, s, ox, oy, portrait };
    const pw = Math.round(CW * dpr), ph = Math.round(CH * dpr);
    if (this.canvas.width !== pw || this.canvas.height !== ph) { this.canvas.width = pw; this.canvas.height = ph; }
    return this.L;
  }
  // 世界 → 畫面（CSS px）
  T = (x, y) => (this.L.portrait ? [this.L.ox + x * this.L.s, this.L.oy + (L - y) * this.L.s] : [this.L.ox + y * this.L.s, this.L.oy + (W - x) * this.L.s]);
  toWorld(px, py) {
    const { ox, oy, s, portrait } = this.L;
    return portrait ? [(px - ox) / s, L - (py - oy) / s] : [W - (py - oy) / s, (px - ox) / s];
  }
  // 世界方向向量 → 畫面方向
  dir(dx, dy) { return this.L.portrait ? [dx, -dy] : [dy, -dx]; }

  async build() {
    await this.ready;
    const { CW, CH, dpr, s } = this.layout();
    const c = document.createElement('canvas'); c.width = Math.round(CW * dpr); c.height = Math.round(CH * dpr);
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const T = this.T;
    const rect = (x0, y0, x1, y1) => { const [ax, ay] = T(x0, y0), [bx, by] = T(x1, y1); return [Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay)]; };

    // 房間的燈光
    const room = g.createRadialGradient(CW / 2, CH / 2, 0, CW / 2, CH / 2, Math.max(CW, CH) * 0.7);
    room.addColorStop(0, '#2a241e'); room.addColorStop(1, '#0d0b09');
    g.fillStyle = room; g.fillRect(0, 0, CW, CH);

    // 木框
    const o = CUSH + RAIL;
    const [rx, ry, rw, rh] = rect(-o, -o, W + o, L + o);
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 0.08 * s * dpr; g.shadowOffsetY = 0.03 * s * dpr;
    g.beginPath(); g.roundRect(rx, ry, rw, rh, 0.06 * s); g.fillStyle = '#3a2414'; g.fill();
    g.restore();
    g.save(); g.beginPath(); g.roundRect(rx, ry, rw, rh, 0.06 * s); g.clip();
    const wp = g.createPattern(this.wood, 'repeat'); wp.setTransform(new DOMMatrix().scale((0.7 * s) / this.wood.width).rotate(this.L.portrait ? 90 : 0));
    g.fillStyle = wp; g.fillRect(rx, ry, rw, rh);
    const sheen = g.createLinearGradient(rx, ry, rx + rw, ry + rh);
    sheen.addColorStop(0, 'rgba(255,220,180,0.16)'); sheen.addColorStop(0.5, 'rgba(0,0,0,0)'); sheen.addColorStop(1, 'rgba(0,0,0,0.25)');
    g.fillStyle = sheen; g.fillRect(rx, ry, rw, rh);
    g.restore();
    g.strokeStyle = 'rgba(255,230,190,0.18)'; g.lineWidth = 1; g.beginPath(); g.roundRect(rx + 1.5, ry + 1.5, rw - 3, rh - 3, 0.055 * s); g.stroke();

    // 檯呢（含庫邊）
    const [cx0, cy0, cw0, ch0] = rect(-CUSH, -CUSH, W + CUSH, L + CUSH);
    const fp = g.createPattern(this.felt, 'repeat'); fp.setTransform(new DOMMatrix().scale((0.5 * s) / this.felt.width));
    g.fillStyle = '#1f6b50'; g.fillRect(cx0, cy0, cw0, ch0);
    g.globalAlpha = 0.35; g.fillStyle = fp; g.fillRect(cx0, cy0, cw0, ch0); g.globalAlpha = 1;
    g.fillStyle = 'rgba(16,80,58,0.55)'; g.fillRect(cx0, cy0, cw0, ch0);
    // 燈光：中央亮、四周暗
    const lamp = g.createRadialGradient(cx0 + cw0 / 2, cy0 + ch0 / 2, 0, cx0 + cw0 / 2, cy0 + ch0 / 2, Math.max(cw0, ch0) * 0.62);
    lamp.addColorStop(0, 'rgba(255,255,220,0.12)'); lamp.addColorStop(0.6, 'rgba(0,0,0,0)'); lamp.addColorStop(1, 'rgba(0,0,0,0.28)');
    g.fillStyle = lamp; g.fillRect(cx0, cy0, cw0, ch0);

    // 袋口（先畫，庫邊橡膠蓋在上面形成袋角）
    for (const p of POCKETS) {
      const [x, y] = T(p.x, p.y), r = (p.r + 0.014) * s;
      g.fillStyle = '#20150c'; g.beginPath(); g.arc(x, y, r * 1.2, 0, Math.PI * 2); g.fill();
      const hg = g.createRadialGradient(x, y, r * 0.15, x, y, r);
      hg.addColorStop(0, '#000'); hg.addColorStop(0.78, '#0a0705'); hg.addColorStop(1, '#2a1d13');
      g.fillStyle = hg; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    // 庫邊橡膠：每段由鼻線延伸到木框，兩端沿袋角斜切
    const cd = 0.788 / 0.616, sd = 0.242 / 0.97, C = CUSH;
    const quads = [
      [[A, 0], [W - A, 0], [W - A + C * cd, -C], [A - C * cd, -C]],
      [[A, L], [W - A, L], [W - A + C * cd, L + C], [A - C * cd, L + C]],
      [[0, A], [0, L / 2 - HS], [-C, L / 2 - HS + C * sd], [-C, A - C * cd]],
      [[0, L / 2 + HS], [0, L - A], [-C, L - A + C * cd], [-C, L / 2 + HS - C * sd]],
      [[W, A], [W, L / 2 - HS], [W + C, L / 2 - HS + C * sd], [W + C, A - C * cd]],
      [[W, L / 2 + HS], [W, L - A], [W + C, L - A + C * cd], [W + C, L / 2 + HS - C * sd]],
    ];
    for (const q of quads) {
      g.beginPath(); q.forEach(([x, y], i) => { const [px, py] = T(x, y); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath();
      g.fillStyle = '#185a43'; g.fill();
      g.globalAlpha = 0.3; g.fillStyle = fp; g.fill(); g.globalAlpha = 1;
      // 鼻線高光與陰影
      const [ax, ay] = T(q[0][0], q[0][1]), [bx, by] = T(q[1][0], q[1][1]);
      g.strokeStyle = 'rgba(160,230,200,0.18)'; g.lineWidth = Math.max(1, 0.004 * s);
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
    }
    // 庫邊投在檯面上的細影
    const inward = [[0, 1], [0, -1], [1, 0], [1, 0], [-1, 0], [-1, 0]];
    g.strokeStyle = 'rgba(0,0,0,0.28)'; g.lineWidth = 0.008 * s;
    quads.forEach((q, i) => {
      const [dx, dy] = this.dir(inward[i][0], inward[i][1]), o = 0.006 * s;
      const [ax, ay] = T(q[0][0], q[0][1]), [bx, by] = T(q[1][0], q[1][1]);
      g.beginPath(); g.moveTo(ax + dx * o, ay + dy * o); g.lineTo(bx + dx * o, by + dy * o); g.stroke();
    });

    // 菱形標點（貝殼）
    const dot = (x, y) => { const [px, py] = T(x, y), r = Math.max(1.6, 0.009 * s); g.fillStyle = '#efe6d2'; g.beginPath(); g.moveTo(px, py - r * 1.4); g.lineTo(px + r, py); g.lineTo(px, py + r * 1.4); g.lineTo(px - r, py); g.closePath(); g.fill(); };
    const off = CUSH + RAIL / 2;
    for (const k of [1, 2, 3, 5, 6, 7]) { dot(-off, (L * k) / 8); dot(W + off, (L * k) / 8); }
    for (const k of [1, 2, 3]) { dot((W * k) / 4, -off); dot((W * k) / 4, L + off); }
    // 置球點
    { const [x, y] = T(W / 2, FOOT_Y); g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.arc(x, y, Math.max(1.2, 0.006 * s), 0, Math.PI * 2); g.fill(); }
    this.static = c;
  }

  // 逐像素繪製一顆球（含姿態、陰影由呼叫端處理）
  ballSprite(b, rpx) {
    const dpr = this.L.dpr, r = rpx * dpr, size = Math.ceil(r * 2) + 2, c0 = size / 2;
    if (!this._bc || this._bc.width < size) { this._bc = document.createElement('canvas'); this._bc.width = this._bc.height = size + 8; this._bx = this._bc.getContext('2d'); }
    const id = this._bx.createImageData(size, size), d = id.data;
    const [qw, qx, qy, qz] = b.q;
    // 旋轉矩陣（局部 → 世界）
    const m00 = 1 - 2 * (qy * qy + qz * qz), m01 = 2 * (qx * qy - qz * qw), m02 = 2 * (qx * qz + qy * qw);
    const m10 = 2 * (qx * qy + qz * qw), m11 = 1 - 2 * (qx * qx + qz * qz), m12 = 2 * (qy * qz - qx * qw);
    const m20 = 2 * (qx * qz - qy * qw), m21 = 2 * (qy * qz + qx * qw), m22 = 1 - 2 * (qx * qx + qy * qy);
    const base = colorOf(b.n), stripe = b.n > 8, isCue = b.n === 0;
    const digit = b.n ? digitMask(b.n) : null;
    const portrait = this.L.portrait;
    const lx = -0.35, ly = -0.45, lz = 0.82;
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
      const sx = (i + 0.5 - c0) / r, sy = (j + 0.5 - c0) / r, d2 = sx * sx + sy * sy;
      if (d2 > 1.04) continue;
      const k = (j * size + i) * 4;
      const dd = Math.min(1, d2), sz = Math.sqrt(1 - dd);
      // 畫面法向 → 世界法向
      const wx = portrait ? sx : -sy, wy = portrait ? -sy : sx, wz = sz;
      // 世界 → 局部（乘轉置矩陣）
      const ux = m00 * wx + m10 * wy + m20 * wz, uy = m01 * wx + m11 * wy + m21 * wz, uz = m02 * wx + m12 * wy + m22 * wz;
      let cr, cg, cb;
      const inDisc = !isCue && Math.abs(uz) > 0.86;
      if (isCue) { cr = 246; cg = 244; cb = 236; }
      else if (inDisc) {
        cr = cg = cb = 246;
        if (digit) {
          const sgn = uz > 0 ? 1 : -1, S = digit.S;
          const tu = Math.floor(((ux * sgn) / 0.5 * 0.5 + 0.5) * S), tv = Math.floor((-uy / 0.5 * 0.5 + 0.5) * S);
          if (tu >= 0 && tv >= 0 && tu < S && tv < S && digit.m[tv * S + tu] > 110) { cr = cg = cb = 18; }
        }
      } else if (stripe && Math.abs(ux) > 0.5) { cr = 246; cg = 244; cb = 236; }
      else { cr = base[0]; cg = base[1]; cb = base[2]; }
      const diff = Math.max(0, sx * lx + sy * ly + sz * lz);
      const shade = 0.32 + 0.78 * diff;
      const hx = lx, hy = ly, hz = lz + 1, hl = Math.hypot(hx, hy, hz);
      const spec = Math.pow(Math.max(0, (sx * hx + sy * hy + sz * hz) / hl), 70) * 255 * 0.9;
      d[k] = Math.min(255, cr * shade + spec); d[k + 1] = Math.min(255, cg * shade + spec); d[k + 2] = Math.min(255, cb * shade + spec);
      const edge = (1 - Math.sqrt(d2)) * r;
      d[k + 3] = edge >= 1 ? 255 : Math.max(0, edge) * 255;
    }
    this._bx.clearRect(0, 0, this._bc.width, this._bc.height);
    this._bx.putImageData(id, 0, 0);
    return { canvas: this._bc, size };
  }

  // state：{ balls, aim: { ang, power, guide }, cue: { show, pull }, ghost, inHand, kitchen, called, sinking:[{n,x,y,t}] }
  draw(st) {
    if (!this.static) return;
    const { dpr, s } = this.L, T = this.T, c = this.canvas, g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(this.static, 0, 0);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 開球區（自由球限開球線後方時）
    if (st.kitchen) {
      const [ax, ay] = T(0, HEAD_Y), [bx, by] = T(W, HEAD_Y);
      g.save(); g.setLineDash([6, 6]); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); g.restore();
    }
    // 指定袋口
    if (st.called != null) {
      const p = POCKETS[st.called], [x, y] = T(p.x, p.y);
      g.strokeStyle = 'rgba(232,196,110,0.95)'; g.lineWidth = 2.5;
      g.beginPath(); g.arc(x, y, (p.r + 0.02) * s, 0, Math.PI * 2); g.stroke();
    }
    if (st.choosePocket) for (const p of POCKETS) { const [x, y] = T(p.x, p.y); g.strokeStyle = 'rgba(232,196,110,0.45)'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, (p.r + 0.02) * s, 0, Math.PI * 2); g.stroke(); }

    const rpx = R * s;
    // 影子
    for (const b of st.balls) {
      if (!b.on) continue;
      const [x, y] = T(b.x, b.y);
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.beginPath(); g.ellipse(x + rpx * 0.28, y + rpx * 0.36, rpx * 1.02, rpx * 0.9, 0, 0, Math.PI * 2); g.fill();
    }
    // 瞄準輔助
    if (st.aim && st.aim.guide) {
      const gd = st.aim.guide, [cx, cy] = T(gd.from[0], gd.from[1]), [gx, gy] = T(gd.ghost[0], gd.ghost[1]);
      g.save();
      g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(gx, gy); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(gx, gy, rpx, 0, Math.PI * 2); g.stroke();
      if (gd.obj) {
        const [ox2, oy2] = T(gd.obj.from[0], gd.obj.from[1]), [ex, ey] = T(gd.obj.to[0], gd.obj.to[1]);
        g.strokeStyle = gd.obj.ok ? 'rgba(255,255,255,0.75)' : 'rgba(230,110,90,0.85)'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(ox2, oy2); g.lineTo(ex, ey); g.stroke();
        const [tx, ty] = T(gd.tan[0], gd.tan[1]);
        g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.2; g.setLineDash([4, 4]);
        g.beginPath(); g.moveTo(gx, gy); g.lineTo(tx, ty); g.stroke();
      }
      g.restore();
    }
    // 球
    for (const b of st.balls) {
      if (!b.on) continue;
      const [x, y] = T(b.x, b.y);
      const sp = this.ballSprite(b, rpx);
      g.drawImage(sp.canvas, 0, 0, sp.size, sp.size, x - sp.size / dpr / 2, y - sp.size / dpr / 2, sp.size / dpr, sp.size / dpr);
    }
    // 落袋中的球（縮小淡出）
    for (const k of st.sinking || []) {
      const p = POCKETS[k.pocket], [x, y] = T(p.x, p.y), a = 1 - k.p;
      if (a <= 0) continue;
      g.globalAlpha = a;
      const sp = this.ballSprite({ n: k.n, q: k.q }, rpx * (1 - k.p * 0.4));
      g.drawImage(sp.canvas, 0, 0, sp.size, sp.size, x - sp.size / dpr / 2, y - sp.size / dpr / 2, sp.size / dpr, sp.size / dpr);
      g.globalAlpha = 1;
    }
    // 自由球提示環
    if (st.inHand) {
      const cue = st.balls.find((b) => b.n === 0 && b.on);
      if (cue) { const [x, y] = T(cue.x, cue.y); g.strokeStyle = st.inHand.bad ? 'rgba(230,90,70,0.9)' : 'rgba(232,196,110,0.9)'; g.lineWidth = 2; g.setLineDash([4, 3]); g.beginPath(); g.arc(x, y, rpx * 1.9, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); }
    }
    // 球桿
    if (st.cue && st.cue.show) {
      const cue = st.balls.find((b) => b.n === 0 && b.on);
      if (cue) this.drawCue(g, cue, st.cue.ang, st.cue.pull || 0);
    }
  }

  drawCue(g, cue, ang, pull) {
    const { s } = this.L, T = this.T;
    const [bx, by] = T(cue.x, cue.y);
    const [dx, dy] = this.dir(Math.cos(ang), Math.sin(ang));
    const back = (R + 0.012 + pull * 0.22) * s, len = 1.45 * s;
    const tx = bx - dx * back, ty = by - dy * back, ex = tx - dx * len, ey = ty - dy * len;
    const nx = -dy, ny = dx;
    const wTip = 0.0065 * s, wEnd = 0.015 * s;
    const quad = (u0, u1, w0, w1, fill) => {
      const ax = tx - dx * len * u0, ay = ty - dy * len * u0, cx = tx - dx * len * u1, cy = ty - dy * len * u1;
      g.beginPath(); g.moveTo(ax + nx * w0, ay + ny * w0); g.lineTo(cx + nx * w1, cy + ny * w1); g.lineTo(cx - nx * w1, cy - ny * w1); g.lineTo(ax - nx * w0, ay - ny * w0); g.closePath();
      g.fillStyle = fill; g.fill();
    };
    const wAt = (u) => wTip + (wEnd - wTip) * u;
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 0.03 * s; g.shadowOffsetX = 0.02 * s; g.shadowOffsetY = 0.03 * s;
    quad(0, 1, wTip, wEnd, '#000');
    g.restore();
    const shaft = g.createLinearGradient(tx + nx * wEnd, ty + ny * wEnd, tx - nx * wEnd, ty - ny * wEnd);
    shaft.addColorStop(0, '#f3dfb3'); shaft.addColorStop(0.5, '#e2c388'); shaft.addColorStop(1, '#b58c52');
    quad(0.012, 0.62, wAt(0.012), wAt(0.62), shaft);
    quad(0.62, 0.66, wAt(0.62), wAt(0.66), '#d8d2c4'); // 接牙
    quad(0.66, 0.8, wAt(0.66), wAt(0.8), '#2a1a12'); // 前節
    quad(0.8, 0.93, wAt(0.8), wAt(0.93), '#141214'); // 握把線
    quad(0.93, 1, wAt(0.93), wEnd, '#2a1a12');
    quad(0.004, 0.012, wAt(0.004), wAt(0.012), '#f4f1ea'); // 先角
    quad(0, 0.004, wTip, wAt(0.004), '#3c6ea8'); // 皮頭（巧克）
    g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(tx + nx * wTip * 0.5, ty + ny * wTip * 0.5); g.lineTo(ex + nx * wEnd * 0.5, ey + ny * wEnd * 0.5); g.stroke();
  }
}
