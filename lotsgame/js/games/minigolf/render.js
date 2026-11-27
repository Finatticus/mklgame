// 迷你高爾夫繪圖：靜態層（地面、草皮光影、沙坑、水池、圍欄、球洞）預先算好，
// 每一格只畫會動的東西（水光、旋轉槳、旗子、球、推桿）。光源在左上方。
import { loadImage, asset } from '../../ui.js';
import { BALL_R, CUP_R, moverShapes, inPoly } from './physics.js';

const THEMES = {
  garden: { ground: 'golf/pebbles.jpg', groundScale: 0.75, wall: 'wood/walnut.jpg', wallScale: 0.6, post: 'golf/mossrock.jpg', rock: 'golf/mossrock.jpg', sand: 'golf/sand.jpg', turf: [46, 122, 58], turfAlt: [52, 132, 64], stone: 'golf/granite.jpg' },
  bamboo: { ground: 'golf/gravel.jpg', groundScale: 0.45, dim: 0.06, wall: 'wood/bamboo.jpg', wallScale: 0.45, post: 'golf/mossrock.jpg', rock: 'golf/mossrock.jpg', sand: 'golf/gravel.jpg', turf: [38, 106, 58], turfAlt: [44, 116, 64], stone: 'golf/granite.jpg' },
  snow: { ground: 'golf/snow.jpg', groundScale: 0.9, dim: 0, tint: 'rgba(248,251,255,0.32)', wall: 'golf/bark.jpg', wallScale: 0.45, post: 'golf/granite.jpg', rock: 'golf/granite.jpg', sand: 'golf/sand.jpg', turf: [40, 112, 76], turfAlt: [46, 122, 82], stone: 'golf/granite.jpg' },
  harbor: { ground: 'golf/dock.jpg', groundScale: 1.1, dim: 0.12, wall: 'golf/cedar.jpg', wallScale: 0.6, post: 'golf/granite.jpg', rock: 'golf/granite.jpg', sand: 'golf/sand.jpg', turf: [38, 112, 82], turfAlt: [44, 122, 90], stone: 'golf/granite.jpg' },
  ruins: { ground: 'golf/cobble.jpg', groundScale: 0.75, dim: 0.12, wall: 'golf/mosswall.jpg', wallScale: 0.55, post: 'golf/mossrock.jpg', rock: 'golf/mossrock.jpg', sand: 'golf/sand.jpg', turf: [44, 112, 54], turfAlt: [50, 122, 60], stone: 'golf/mosswall.jpg' },
  canyon: { ground: 'golf/desert.jpg', groundScale: 0.6, wall: 'golf/sandstone.jpg', wallScale: 0.9, post: 'golf/canyonrock.jpg', rock: 'golf/canyonrock.jpg', sand: 'golf/sand.jpg', turf: [40, 116, 72], turfAlt: [46, 126, 80], stone: 'golf/sandstone.jpg' },
};
const LIGHT = (() => { const v = [-0.5, -0.75, 1.1], l = Math.hypot(...v); return v.map((c) => c / l); })();
const IMG = {};
let IMG_WOOD = null; // 石材主題裡的木欄改用胡桃木
loadImage(asset('wood/walnut.jpg')).then((im) => { IMG_WOOD = im; }).catch(() => {});
const img = (p) => (IMG[p] = IMG[p] || loadImage(asset(p)));

// 草皮紋理：細微雜點與絨毛方向的明暗
function turfTile(rgb, alt) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), d = g.createImageData(256, 256);
  let s = 1234567;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const n = (rnd() - 0.5) * 0.16 + Math.sin((x + y * 0.3) * 0.21) * 0.015;
    const k = 1 + n, i = (y * 256 + x) * 4, base = rnd() < 0.5 ? rgb : alt;
    d.data[i] = base[0] * k; d.data[i + 1] = base[1] * k; d.data[i + 2] = base[2] * k; d.data[i + 3] = 255;
  }
  g.putImageData(d, 0, 0);
  return c;
}

const polyPath = (ctx, pts, T) => { ctx.beginPath(); pts.forEach(([x, y], i) => { const [px, py] = T(x, y); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.closePath(); };

export class CourseView {
  // opts.size：固定畫布大小（封面用）；opts.view：{ cx, cy, span } 以指定中心與寬度取景
  constructor(canvas, theme, opts = {}) {
    this.canvas = canvas;
    this.opts = opts;
    this.theme = THEMES[theme] || THEMES.garden;
    this.world = null;
    this.static = null;
    this.tex = null;
    this.ready = (async () => {
      const tex = {};
      for (const [k, v] of Object.entries(this.theme)) if (typeof v === 'string' && /\.(jpg|png)$/.test(v)) tex[k] = await img(v);
      this.tex = tex;
    })();
    this.turf = turfTile(this.theme.turf, this.theme.turfAlt);
  }

  // 世界座標 → 畫面座標（CSS px）
  layout() {
    const r = this.opts.size || this.canvas.getBoundingClientRect();
    const dpr = this.opts.dpr || Math.min(2.5, window.devicePixelRatio || 1);
    const W = Math.max(50, r.W || r.width), H = Math.max(50, r.H || r.height);
    let s, ox, oy;
    if (this.opts.view) {
      const v = this.opts.view;
      s = W / v.span; ox = W / 2 - v.cx * s; oy = H / 2 - v.cy * s;
    } else {
      const xs = this.world.def.green.map((p) => p[0]), ys = this.world.def.green.map((p) => p[1]);
      const x0 = Math.min(...xs) - 0.1, x1 = Math.max(...xs) + 0.1, y0 = Math.min(...ys) - 0.3, y1 = Math.max(...ys) + 0.1;
      s = Math.min(W / (x1 - x0), H / (y1 - y0));
      ox = (W - (x1 - x0) * s) / 2 - x0 * s; oy = (H - (y1 - y0) * s) / 2 - y0 * s;
    }
    this.L = { W, H, dpr, s, ox, oy };
    if (this.canvas.width !== Math.round(W * dpr) || this.canvas.height !== Math.round(H * dpr)) { this.canvas.width = Math.round(W * dpr); this.canvas.height = Math.round(H * dpr); }
    return this.L;
  }
  T = (x, y) => [this.L.ox + x * this.L.s, this.L.oy + y * this.L.s];
  toWorld(px, py) { return [(px - this.L.ox) / this.L.s, (py - this.L.oy) / this.L.s]; }

  async setHole(world) {
    this.world = world;
    await this.ready;
    this.buildStatic();
    this.slopes = this.slopeField();
  }

  resize() { if (this.world && this.tex) this.buildStatic(); }

  pattern(ctx, im, worldSize, rot = 0) {
    const p = ctx.createPattern(im, 'repeat');
    const k = (worldSize * this.L.s) / im.width; // 用於已套用 dpr 縮放的畫布
    p.setTransform(new DOMMatrix().scale(k).rotate(rot));
    return p;
  }

  buildStatic() {
    const { W, H, dpr, s } = this.layout();
    const w = this.world, def = w.def, T = this.T, th = this.theme, tex = this.tex;
    const c = document.createElement('canvas'); c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 地面
    g.fillStyle = this.pattern(g, tex.ground, th.groundScale); g.fillRect(0, 0, W, H);
    g.fillStyle = `rgba(20,14,8,${th.dim != null ? th.dim : 0.18})`; g.fillRect(0, 0, W, H);
    if (th.tint) { g.fillStyle = th.tint; g.fillRect(0, 0, W, H); }

    // 裝飾石
    for (const d of def.decor || []) {
      if (d.t !== 'rock') continue;
      const pts = [];
      for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, k = 1 + 0.18 * Math.sin(a * 3 + d.x * 9) + 0.08 * Math.sin(a * 5 + d.y * 7); pts.push([d.x + Math.cos(a) * d.r * k, d.y + Math.sin(a) * d.r * k * 0.85]); }
      g.save();
      g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = d.r * s * 0.5; g.shadowOffsetX = d.r * s * 0.25; g.shadowOffsetY = d.r * s * 0.35;
      polyPath(g, pts, T); g.fillStyle = '#555'; g.fill();
      g.restore();
      g.save(); polyPath(g, pts, T); g.clip();
      g.fillStyle = this.pattern(g, tex.rock, 0.5, d.x * 40); g.fillRect(0, 0, W, H);
      const [cx, cy] = T(d.x, d.y), rr = d.r * s;
      const gr = g.createRadialGradient(cx - rr * 0.4, cy - rr * 0.5, rr * 0.1, cx, cy, rr * 1.2);
      gr.addColorStop(0, 'rgba(255,255,240,0.28)'); gr.addColorStop(0.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.5)');
      g.fillStyle = gr; g.fillRect(cx - rr * 2, cy - rr * 2, rr * 4, rr * 4);
      g.restore();
    }

    // 草皮與地形光影
    g.save();
    polyPath(g, def.green, T); g.clip();
    g.fillStyle = this.pattern(g, this.turf, 0.45); g.fillRect(0, 0, W, H);
    // 修剪方向的寬條紋
    g.globalAlpha = 0.05;
    for (let y = -1; y < 4; y += 0.36) { const [, py] = T(0, y); g.fillStyle = '#fff'; g.fillRect(0, py, W, 0.18 * s); }
    g.globalAlpha = 1;
    this.shade(g, def.green, 1);
    // 沙坑（略為凹陷）
    for (const sp of w.sand) {
      g.save(); polyPath(g, sp, T); g.clip();
      g.fillStyle = this.pattern(g, tex.sand, 0.5); g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(232,200,140,0.35)'; g.fillRect(0, 0, W, H);
      this.shade(g, sp, 0.8);
      g.lineWidth = 0.05 * s; g.strokeStyle = 'rgba(70,50,20,0.35)'; g.shadowColor = 'rgba(60,40,10,0.6)'; g.shadowBlur = 0.03 * s * dpr; polyPath(g, sp, T); g.stroke();
      g.restore();
    }
    // 冰面：淡藍的光滑表面，帶斜向反光
    for (const ip of w.ice || []) {
      g.save(); polyPath(g, ip, T); g.clip();
      const xs = ip.map((p) => p[0]), ys = ip.map((p) => p[1]);
      const [ax, ay] = T(Math.min(...xs), Math.min(...ys)), [bx, by] = T(Math.max(...xs), Math.max(...ys));
      const gr = g.createLinearGradient(ax, ay, bx, by);
      gr.addColorStop(0, 'rgba(232,246,252,0.93)'); gr.addColorStop(0.5, 'rgba(204,230,242,0.9)'); gr.addColorStop(1, 'rgba(178,212,230,0.92)');
      g.fillStyle = gr; g.fillRect(ax, ay, bx - ax, by - ay);
      g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = Math.max(1, 0.006 * s);
      for (let k = -6; k < 12; k++) { const x0 = ax + k * 0.18 * s; g.beginPath(); g.moveTo(x0, ay); g.lineTo(x0 + (by - ay) * 0.6, by); g.stroke(); }
      g.strokeStyle = 'rgba(120,160,185,0.25)'; g.lineWidth = Math.max(0.6, 0.002 * s);
      for (let k = 0; k < 14; k++) { const px = ax + ((k * 0.37) % 1) * (bx - ax), py = ay + ((k * 0.61) % 1) * (by - ay); g.beginPath(); g.moveTo(px, py); g.lineTo(px + 0.08 * s, py + 0.03 * s); g.lineTo(px + 0.12 * s, py - 0.02 * s); g.stroke(); }
      this.shade(g, ip, 0.7);
      g.restore();
      g.save(); polyPath(g, ip, T); g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = Math.max(1, 0.006 * s); g.stroke(); g.restore();
    }
    // 水池
    for (const wp of w.water) {
      g.save(); polyPath(g, wp, T); g.clip();
      const xs = wp.map((p) => p[0]), ys = wp.map((p) => p[1]);
      const [ax, ay] = T(Math.min(...xs), Math.min(...ys)), [bx, by] = T(Math.max(...xs), Math.max(...ys));
      const gr = g.createLinearGradient(ax, ay, bx, by);
      gr.addColorStop(0, '#1d4a52'); gr.addColorStop(0.6, '#123a44'); gr.addColorStop(1, '#0b2a33');
      g.fillStyle = gr; g.fillRect(ax, ay, bx - ax, by - ay);
      g.lineWidth = 0.06 * s; g.strokeStyle = 'rgba(0,0,0,0.55)'; g.shadowColor = 'rgba(0,0,0,0.8)'; g.shadowBlur = 0.04 * s * dpr; polyPath(g, wp, T); g.stroke();
      g.restore();
      // 卵石護岸
      g.save(); polyPath(g, wp, T);
      g.lineWidth = 0.032 * s; g.lineJoin = 'round';
      g.strokeStyle = this.pattern(g, tex.ground, 0.35);
      g.stroke(); g.restore();
    }
    // 管道：地下管線的淡痕，以及有金屬框的管口（兩組管道用黃銅、紅銅區分）
    const RIMS = [['#e3c98f', '#8a6a35'], ['#e2a283', '#7d4128']];
    w.tunnels.forEach((tn, k) => {
      const [ix, iy] = T(tn.in[0], tn.in[1]), [ox2, oy2] = T(tn.out[0], tn.out[1]);
      g.save(); g.setLineDash([0.025 * s, 0.03 * s]); g.lineCap = 'round';
      g.strokeStyle = 'rgba(0,0,0,0.16)'; g.lineWidth = 0.028 * s;
      g.beginPath(); g.moveTo(ix, iy); g.lineTo(ox2, oy2); g.stroke(); g.restore();
      const [hi, lo] = RIMS[k % RIMS.length];
      for (const [p, isIn] of [[tn.in, true], [tn.out, false]]) {
        const [px, py] = T(p[0], p[1]), r = (tn.r || 0.05) * s, R2 = r * 1.32;
        g.save();
        g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 0.02 * s * dpr; g.shadowOffsetX = 0.008 * s * dpr; g.shadowOffsetY = 0.012 * s * dpr;
        const rim = g.createLinearGradient(px - R2, py - R2, px + R2, py + R2);
        rim.addColorStop(0, hi); rim.addColorStop(1, lo);
        g.fillStyle = rim; g.beginPath(); g.arc(px, py, R2, 0, Math.PI * 2); g.fill();
        g.restore();
        const hole = g.createRadialGradient(px + r * 0.2, py + r * 0.25, r * 0.1, px, py, r);
        hole.addColorStop(0, '#000'); hole.addColorStop(0.75, '#14100c'); hole.addColorStop(1, '#3a2f25');
        g.fillStyle = hole; g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill();
        if (!isIn) { // 出口：標出球滾出的方向
          const a = (tn.dir * Math.PI) / 180;
          g.fillStyle = 'rgba(255,255,255,0.55)';
          const tx = px + Math.cos(a) * R2 * 1.45, ty = py + Math.sin(a) * R2 * 1.45, nx = -Math.sin(a), ny = Math.cos(a), k2 = r * 0.32;
          g.beginPath(); g.moveTo(tx + Math.cos(a) * k2, ty + Math.sin(a) * k2); g.lineTo(tx + nx * k2, ty + ny * k2); g.lineTo(tx - nx * k2, ty - ny * k2); g.closePath(); g.fill();
        }
      }
    });
    g.restore();

    // 發球墊
    {
      const [tx, ty] = T(w.tee.x, w.tee.y), tw = 0.2 * s, thh = 0.13 * s;
      g.save();
      g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 3 * dpr; g.shadowOffsetY = 1;
      g.fillStyle = '#1e3a24'; g.beginPath(); g.roundRect(tx - tw / 2, ty - thh / 2, tw, thh, thh * 0.18); g.fill();
      g.restore();
      g.strokeStyle = 'rgba(255,255,255,0.2)'; g.lineWidth = 1; g.beginPath(); g.roundRect(tx - tw / 2 + 2, ty - thh / 2 + 2, tw - 4, thh - 4, thh * 0.14); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(tx, ty, Math.max(1.2, 0.008 * s), 0, Math.PI * 2); g.fill();
    }

    // 球洞
    {
      const [cx, cy] = T(w.cup.x, w.cup.y), r = CUP_R * s;
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.arc(cx + 0.6, cy + 0.6, r + 1.2, 0, Math.PI * 2); g.fill();
      const gr = g.createRadialGradient(cx + r * 0.25, cy + r * 0.3, r * 0.1, cx, cy, r);
      gr.addColorStop(0, '#2a2622'); gr.addColorStop(0.65, '#0d0b09'); gr.addColorStop(0.86, '#d9d6cf'); gr.addColorStop(1, '#8b8780');
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.55)'; g.beginPath(); g.arc(cx - r * 0.12, cy - r * 0.14, r * 0.8, 0, Math.PI * 2); g.fill();
    }

    // 圍欄、牆與石柱：先畫在獨立圖層，加上斜面光影，再連同陰影貼回
    const wc = document.createElement('canvas'); wc.width = c.width; wc.height = c.height;
    const q = wc.getContext('2d');
    q.setTransform(dpr, 0, 0, dpr, 0, 0);
    q.lineCap = 'round'; q.lineJoin = 'round';
    const baseMat = def.wallMat || 'wood';
    const lines = [{ pts: def.green, closed: true, w: def.wallW || 0.07, mat: baseMat }].concat((def.walls || []).map((x) => ({ pts: x.pts, closed: !!x.closed, w: x.w || 0.06, mat: x.mat || baseMat })));
    const wallStyle = (mat) => mat === 'rubber' ? '#7e2219' : mat === 'metal' ? '#8d8f92'
      : mat === baseMat || (mat === 'wood' && !tex.stone) ? this.pattern(q, tex.wall, th.wallScale, 90)
      : mat === 'stone' ? this.pattern(q, tex.stone || tex.post, 0.5, 90) : this.pattern(q, IMG_WOOD || tex.wall, 0.5, 90);
    for (const l of lines) {
      q.strokeStyle = wallStyle(l.mat);
      q.lineWidth = l.w * s;
      q.beginPath(); l.pts.forEach(([x, y], i) => { const [px, py] = T(x, y); i ? q.lineTo(px, py) : q.moveTo(px, py); }); if (l.closed) q.closePath(); q.stroke();
    }
    for (const p of w.posts) {
      const [px, py] = T(p.x, p.y);
      q.fillStyle = p.mat === 'metal' ? '#8d8f92' : p.mat === 'rubber' ? '#9a2a1f' : this.pattern(q, tex.post, 0.4, p.x * 50);
      q.beginPath(); q.arc(px, py, p.r * s, 0, Math.PI * 2); q.fill();
    }
    // 斜面：只畫在既有像素上
    q.globalCompositeOperation = 'source-atop';
    for (const l of lines) {
      const off = l.w * s * 0.28;
      q.lineWidth = l.w * s * 0.5;
      for (const [dx, dy, col] of [[-off, -off, 'rgba(255,245,225,0.22)'], [off, off, 'rgba(0,0,0,0.32)']]) {
        q.strokeStyle = col;
        q.beginPath(); l.pts.forEach(([x, y], i) => { const [px, py] = T(x, y); i ? q.lineTo(px + dx, py + dy) : q.moveTo(px + dx, py + dy); }); if (l.closed) q.closePath(); q.stroke();
      }
    }
    for (const p of w.posts) {
      const [px, py] = T(p.x, p.y), r = p.r * s;
      const gr = q.createRadialGradient(px - r * 0.4, py - r * 0.45, r * 0.05, px, py, r * 1.05);
      gr.addColorStop(0, p.mat === 'metal' ? 'rgba(255,255,255,0.75)' : p.mat === 'rubber' ? 'rgba(255,200,180,0.5)' : 'rgba(255,250,235,0.32)'); gr.addColorStop(0.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.45)');
      q.fillStyle = gr; q.beginPath(); q.arc(px, py, r, 0, Math.PI * 2); q.fill();
    }
    q.globalCompositeOperation = 'source-over';
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 0.03 * s * dpr; g.shadowOffsetX = 0.018 * s * dpr; g.shadowOffsetY = 0.026 * s * dpr;
    g.drawImage(wc, 0, 0);
    g.restore();

    // 四周暗角
    g.setTransform(1, 0, 0, 1, 0, 0);
    const vg = g.createRadialGradient(c.width / 2, c.height / 2, Math.min(c.width, c.height) * 0.35, c.width / 2, c.height / 2, Math.max(c.width, c.height) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.38)');
    g.fillStyle = vg; g.fillRect(0, 0, c.width, c.height);
    this.static = c;
  }

  // 依地形坡度畫出明暗與淡淡的等高線（在已裁切的範圍內）
  shade(g, poly, strength) {
    const w = this.world;
    const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
    const [ax, ay] = this.T(Math.min(...xs), Math.min(...ys)), [bx, by] = this.T(Math.max(...xs), Math.max(...ys));
    const step = 1.5; // 取樣間距（CSS px）
    const cw = Math.ceil((bx - ax) / step) + 1, ch = Math.ceil((by - ay) / step) + 1;
    const sc = document.createElement('canvas'); sc.width = cw; sc.height = ch;
    const sg = sc.getContext('2d'), d = sg.createImageData(cw, ch);
    const band = new Int32Array(cw * ch);
    const E = 4.2, base = LIGHT[2], CONTOUR = 0.009;
    let any = false;
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
      const [x, y] = this.toWorld(ax + i * step, ay + j * step);
      const hh = w.h(x, y), k = j * cw + i;
      band[k] = Math.floor(hh / CONTOUR + 1e-6);
      const [gx, gy] = w.grad(x, y);
      let r = 0, gg = 0, bb = 0, a = 0;
      if (gx || gy) {
        const nx = -gx * E, ny = -gy * E, l = Math.hypot(nx, ny, 1);
        const v = (nx * LIGHT[0] + ny * LIGHT[1] + LIGHT[2]) / l - base;
        a = Math.min(0.38, Math.abs(v) * 2.2 * strength);
        if (v > 0) { r = 255; gg = 250; bb = 220; a *= 0.55; }
      }
      const edge = this.L.s > 150 && ((i > 0 && band[k - 1] !== band[k]) || (j > 0 && band[k - cw] !== band[k]));
      if (edge) { r = 235; gg = 245; bb = 225; a = Math.max(a, 0.13 * strength); }
      if (a < 0.01) continue;
      any = true;
      const o = k * 4; d.data[o] = r; d.data[o + 1] = gg; d.data[o + 2] = bb; d.data[o + 3] = a * 255;
    }
    if (!any) return;
    sg.putImageData(d, 0, 0);
    g.save(); g.imageSmoothingEnabled = true; g.drawImage(sc, ax, ay, cw * step, ch * step); g.restore();
  }

  // 坡度提示點：沿下坡方向流動（瞄準時顯示）
  slopeField() {
    const w = this.world, pts = [], gap = 0.075;
    const xs = w.def.green.map((p) => p[0]), ys = w.def.green.map((p) => p[1]);
    for (let y = Math.min(...ys) + gap / 2; y < Math.max(...ys); y += gap) for (let x = Math.min(...xs) + gap / 2; x < Math.max(...xs); x += gap) {
      if (!inPoly(w.def.green, x, y) || w.water.some((p) => inPoly(p, x, y))) continue;
      const [gx, gy] = w.grad(x, y), m = Math.hypot(gx, gy);
      if (m < 0.004) continue;
      pts.push({ x, y, dx: -gx / m, dy: -gy / m, m: Math.min(1, m / 0.12), ph: ((x * 7.13 + y * 3.7) % 1 + 1) % 1 });
    }
    return pts;
  }

  // ---------- 每一格 ----------
  draw(state) {
    if (!this.static || !this.world) return;
    const c = this.canvas, g = c.getContext('2d'), { dpr, s } = this.L, T = this.T, w = this.world, t = state.time;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(this.static, 0, 0);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 水面反光
    for (const wp of w.water) {
      g.save(); polyPath(g, wp, T); g.clip();
      g.strokeStyle = 'rgba(190,230,235,0.13)'; g.lineWidth = Math.max(1, 0.006 * s);
      const xs = wp.map((p) => p[0]), ys = wp.map((p) => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      for (let k = 0; k < 7; k++) {
        const yy = y0 + ((y1 - y0) * (k + 0.5)) / 7 + Math.sin(t * 0.7 + k) * 0.015;
        g.beginPath();
        for (let xx = x0; xx <= x1; xx += 0.02) { const [px, py] = T(xx, yy + Math.sin(xx * 14 + t * 1.6 + k * 2) * 0.008); xx === x0 ? g.moveTo(px, py) : g.lineTo(px, py); }
        g.stroke();
      }
      g.restore();
    }
    // 漣漪（落水）
    for (const rp of state.ripples || []) {
      const age = t - rp.t; if (age > 1.6) continue;
      const [px, py] = T(rp.x, rp.y);
      for (let k = 0; k < 3; k++) {
        const a = age - k * 0.18; if (a < 0) continue;
        g.strokeStyle = `rgba(220,240,240,${Math.max(0, 0.5 - a * 0.32)})`; g.lineWidth = 1.2;
        g.beginPath(); g.arc(px, py, (0.02 + a * 0.12) * s, 0, Math.PI * 2); g.stroke();
      }
    }

    // 移動障礙
    for (const m of w.movers) {
      for (const sh of moverShapes(m, t)) {
        const [ax, ay] = T(sh.ax, sh.ay), [bx, by] = T(sh.bx, sh.by), lw = sh.rr * 2 * s;
        g.save();
        g.lineCap = m.t === 'spinner' ? 'round' : 'butt';
        g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 0.03 * s * dpr; g.shadowOffsetX = 0.02 * s * dpr; g.shadowOffsetY = 0.03 * s * dpr;
        g.strokeStyle = m.t === 'spinner' ? '#7b4a26' : '#b09878'; g.lineWidth = lw;
        g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
        g.restore();
        g.save();
        g.strokeStyle = this.pattern(g, m.t === 'spinner' ? this.tex.wall : this.tex.post, 0.35, m.t === 'spinner' ? 0 : 45);
        g.lineCap = m.t === 'spinner' ? 'round' : 'butt'; g.lineWidth = lw * 0.86; g.globalAlpha = 0.9;
        g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
        // 迎光面的高光
        g.globalAlpha = 1; g.strokeStyle = 'rgba(255,240,210,0.25)'; g.lineWidth = lw * 0.22;
        const o = lw * 0.2;
        g.beginPath(); g.moveTo(ax - o, ay - o); g.lineTo(bx - o, by - o); g.stroke();
        g.restore();
      }
    }
    // 轉軸（石柱已畫在靜態層，這裡加一顆鉚釘）
    for (const m of w.movers) if (m.t === 'spinner' || m.t === 'pendulum') { const [px, py] = T(m.x, m.y); g.fillStyle = '#d8d6d0'; g.beginPath(); g.arc(px, py, 0.012 * s, 0, Math.PI * 2); g.fill(); }

    // 坡度提示
    if (state.showSlope && this.slopes) {
      for (const p of this.slopes) {
        const u = (t * (0.25 + p.m * 0.6) + p.ph) % 1, dist = 0.05;
        const x = p.x + p.dx * (u - 0.5) * dist, y = p.y + p.dy * (u - 0.5) * dist;
        const [px, py] = T(x, y), a = Math.sin(u * Math.PI) * (0.25 + 0.55 * p.m);
        g.fillStyle = `rgba(255,255,240,${a.toFixed(3)})`;
        g.beginPath(); g.arc(px, py, Math.max(1, 0.0055 * s), 0, Math.PI * 2); g.fill();
      }
    }

    const ball = state.ball;
    // 旗桿（以斜投影畫出高度），球靠近時變淡
    {
      const [cx, cy] = T(w.cup.x, w.cup.y);
      const near = ball && !ball.holed ? Math.hypot(ball.x - w.cup.x, ball.y - w.cup.y) : 9;
      const alpha = state.flagOut ? 0 : Math.min(1, Math.max(0.22, (near - 0.12) / 0.3));
      if (alpha > 0) {
        const hgt = 0.42 * s, tx = cx - hgt * 0.18, ty = cy - hgt;
        g.save(); g.globalAlpha = alpha;
        // 影子：高度 u（0 底、1 頂）的點投影到地面右下方
        const shadowOf = (dx, u) => [cx + dx + hgt * 0.55 * u, cy + hgt * 0.32 * u];
        g.strokeStyle = 'rgba(0,0,0,0.28)'; g.lineWidth = Math.max(1.2, 0.007 * s);
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(...shadowOf(0, 1)); g.stroke();
        const fw0 = 0.13 * s, fu = 0.075 * s / hgt;
        g.fillStyle = 'rgba(0,0,0,0.2)';
        g.beginPath(); g.moveTo(...shadowOf(0, 1)); g.lineTo(...shadowOf(fw0, 1 - fu * 0.15)); g.lineTo(...shadowOf(fw0, 1 - fu)); g.lineTo(...shadowOf(0, 1 - fu)); g.closePath(); g.fill();
        // 桿
        const pg = g.createLinearGradient(cx - 2, 0, cx + 2, 0); pg.addColorStop(0, '#f2efe8'); pg.addColorStop(1, '#a9a59c');
        g.strokeStyle = pg; g.lineWidth = Math.max(1.5, 0.008 * s); g.lineCap = 'round';
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(tx, ty); g.stroke();
        // 旗（飄動）
        const fw = 0.13 * s, fh = 0.075 * s;
        g.beginPath(); g.moveTo(tx, ty);
        for (let k = 0; k <= 10; k++) { const u = k / 10; g.lineTo(tx + fw * u, ty + Math.sin(t * 5 + u * 4) * fh * 0.12 * u); }
        for (let k = 10; k >= 0; k--) { const u = k / 10; g.lineTo(tx + fw * u, ty + fh + Math.sin(t * 5 + u * 4 + 0.6) * fh * 0.12 * u - fh * 0.15 * u); }
        g.closePath();
        const fg = g.createLinearGradient(tx, ty, tx + fw, ty + fh); fg.addColorStop(0, '#b3261c'); fg.addColorStop(0.5, '#d23a2b'); fg.addColorStop(1, '#8e1d15');
        g.fillStyle = fg; g.fill();
        g.restore();
      }
    }

    // 推桿與瞄準線
    if (state.aim && ball && !ball.moving) {
      const { ang, f } = state.aim;
      const [bx, by] = T(ball.x, ball.y), ux = Math.cos(ang), uy = Math.sin(ang);
      // 瞄準虛線
      const len = (0.12 + f * 0.55) * s;
      g.save();
      g.setLineDash([0.018 * s, 0.022 * s]); g.lineCap = 'round';
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = Math.max(1.5, 0.008 * s);
      g.beginPath(); g.moveTo(bx + ux * BALL_R * s * 1.8, by + uy * BALL_R * s * 1.8); g.lineTo(bx + ux * len, by + uy * len); g.stroke();
      g.restore();
      // 推桿頭（拉得越遠力道越大）
      const back = (BALL_R * 1.6 + f * 0.16) * s, hx = bx - ux * back, hy = by - uy * back;
      const px = -uy, py = ux, hw = 0.05 * s, hd = 0.016 * s;
      g.save();
      g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 4 * dpr; g.shadowOffsetX = 2; g.shadowOffsetY = 3;
      g.fillStyle = '#c8cbd0';
      g.beginPath();
      g.moveTo(hx + px * hw, hy + py * hw); g.lineTo(hx - px * hw, hy - py * hw);
      g.lineTo(hx - px * hw - ux * hd, hy - py * hw - uy * hd); g.lineTo(hx + px * hw - ux * hd, hy + py * hw - uy * hd);
      g.closePath(); g.fill();
      g.restore();
      g.strokeStyle = '#2b2d31'; g.lineWidth = Math.max(1.5, 0.006 * s);
      g.beginPath(); g.moveTo(hx - ux * hd * 0.5, hy - uy * hd * 0.5); g.lineTo(hx - ux * hd * 0.5 - 0.05 * s, hy - uy * hd * 0.5 - 0.2 * s); g.stroke();
      // 力道弧
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = Math.max(3, 0.012 * s);
      g.beginPath(); g.arc(bx, by, BALL_R * s * 2.6, -Math.PI / 2, Math.PI * 1.5); g.stroke();
      const col = f < 0.6 ? '#e8d9a8' : f < 0.85 ? '#e7b25a' : '#e0663f';
      g.strokeStyle = col;
      g.beginPath(); g.arc(bx, by, BALL_R * s * 2.6, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); g.stroke();
    }

    // 球
    if (ball && !(ball.hidden > 0)) {
      const [bx, by] = T(ball.x, ball.y);
      let r = BALL_R * s, a = 1;
      if (ball.holed) { const k = Math.min(1, (t - (state.holedAt || t)) / 0.35); const [cx, cy] = T(w.cup.x, w.cup.y); r *= 1 - k * 0.45; a = 1 - k * 0.85; g.globalAlpha = a; void cx; void cy; }
      g.fillStyle = 'rgba(0,0,0,0.32)';
      g.beginPath(); g.ellipse(bx + r * 0.45, by + r * 0.6, r * 1.05, r * 0.85, 0.5, 0, Math.PI * 2); g.fill();
      const gr = g.createRadialGradient(bx - r * 0.4, by - r * 0.45, r * 0.1, bx, by, r * 1.05);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.55, '#f1f0eb'); gr.addColorStop(1, '#a8a69e');
      g.fillStyle = gr; g.beginPath(); g.arc(bx, by, r, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 1;
    }
  }
}
