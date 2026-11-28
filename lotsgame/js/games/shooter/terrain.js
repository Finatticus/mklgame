// 地形：以實拍航照貼圖（Poly Haven，CC0）為底，依關卡資料疊上海岸、河流、道路、田地、樹林、城鎮。
// 世界座標：x 為 0–360（畫面寬），d 為飛行距離（越往前越大）。地形切成 CH 高的區塊，畫好後快取。

export const W = 360, CH = 240;
const TEX_UNITS = 170; // 一張 512 貼圖鋪滿幾個單位

let seedState = 1;
const rnd = () => ((seedState = (seedState * 16807) % 2147483647) / 2147483647);
const seed = (s) => { seedState = (Math.abs(Math.floor(s * 9301 + 49297)) % 2147483646) + 1; };

// 沿路徑在某個 d 的 x（路徑點依 d 遞增）
export function pathX(path, d) {
  if (d <= path[0][1]) return path[0][0];
  for (let i = 1; i < path.length; i++) {
    const [x0, d0] = path[i - 1], [x1, d1] = path[i];
    if (d <= d1) { const t = (d - d0) / (d1 - d0), s = t * t * (3 - 2 * t); return x0 + (x1 - x0) * s; }
  }
  return path[path.length - 1][0];
}

export class Terrain {
  constructor(stage, tex, ppu) {
    this.stage = stage; this.tex = tex; this.ppu = ppu;
    this.cache = new Map(); this.decals = [];
    this.water = makeWater(ppu);
    this.layers = stage.terrain;
  }
  // 依目前的捲動距離畫出可見的地形；viewH：畫面高（單位）
  draw(ctx, scroll, viewH) {
    const k0 = Math.floor(scroll / CH), k1 = Math.floor((scroll + viewH) / CH);
    for (let k = k0; k <= k1; k++) {
      const c = this.chunk(k);
      const top = viewH - ((k + 1) * CH - scroll);
      ctx.drawImage(c, 0, top, W, CH);
    }
    for (const key of this.cache.keys()) if (key < k0 - 1 || key > k1 + 1) this.cache.delete(key);
  }
  chunk(k) {
    let c = this.cache.get(k);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = Math.ceil(W * this.ppu); c.height = Math.ceil(CH * this.ppu);
    const g = c.getContext('2d');
    g.scale(this.ppu, this.ppu);
    this.paint(g, k);
    for (const dc of this.decals) if (dc.d > k * CH - 40 && dc.d < (k + 1) * CH + 40) paintDecal(g, dc, k);
    this.cache.set(k, c);
    return c;
  }
  // 地面被炸出的焦痕：直接畫進已快取的區塊
  decal(x, d, r) {
    const dc = { x, d, r, s: Math.random() * 1000 };
    this.decals.push(dc);
    for (const [k, c] of this.cache) if (d > k * CH - 40 && d < (k + 1) * CH + 40) { const g = c.getContext('2d'); g.save(); g.setTransform(this.ppu, 0, 0, this.ppu, 0, 0); paintDecal(g, dc, k); g.restore(); }
  }
  pattern(g, name, k, alpha = 1) {
    const img = this.tex[name];
    const p = g.createPattern(img, 'repeat');
    const s = TEX_UNITS / img.width;
    const off = (((k + 1) * CH) % TEX_UNITS + TEX_UNITS) % TEX_UNITS;
    p.setTransform(new DOMMatrix([s, 0, 0, s, 0, off]));
    return p;
  }
  paint(g, k) {
    const Y = (d) => (k + 1) * CH - d;
    const d0 = k * CH - 30, d1 = (k + 1) * CH + 30;
    for (const L of this.layers) {
      if (L.to != null && (L.to < d0 - 200 || L.from > d1 + 200)) continue;
      seed(k * 31 + (L.seed || 0) + 7);
      PAINT[L.t](g, L, k, Y, d0, d1, this);
    }
  }
}

// 帶狀區域的上下邊緣用波浪柔化
function bandPath(g, Y, from, to, d0, d1, wav = 10, ph = 0) {
  const a = Math.max(from, d0 - 40), b = Math.min(to, d1 + 40);
  if (a >= b) return false;
  g.beginPath();
  const edgeY = (d, x) => d + Math.sin(x * 0.045 + ph + d * 0.01) * wav + Math.sin(x * 0.13 + ph * 2) * wav * 0.35;
  g.moveTo(0, Y(a === from ? edgeY(from, 0) : a));
  for (let x = 0; x <= W; x += 12) g.lineTo(x, Y(a === from ? edgeY(from, x) : a));
  for (let x = W; x >= 0; x -= 12) g.lineTo(x, Y(b === to ? edgeY(to, x) : b));
  g.closePath();
  return true;
}

// 側邊的海岸線：海在 side 那一側，邊界 x = shore(d)
function sidePath(g, Y, L, d0, d1, inset = 0) {
  const a = Math.max(L.from, d0 - 40), b = Math.min(L.to, d1 + 40);
  if (a >= b) return false;
  g.beginPath();
  const sx = (d) => pathX(L.shore, d) + Math.sin(d * 0.05) * 6 + Math.sin(d * 0.017) * 10 + inset * (L.side === 'left' ? 1 : -1);
  const edgeX = L.side === 'left' ? -20 : W + 20;
  g.moveTo(edgeX, Y(a));
  for (let d = a; d <= b; d += 8) g.lineTo(sx(d), Y(d));
  g.lineTo(sx(b), Y(b)); g.lineTo(edgeX, Y(b));
  g.closePath();
  return true;
}

const PAINT = {
  // 底材：一段距離內鋪某種貼圖
  fill(g, L, k, Y, d0, d1, T) {
    if (!bandPath(g, Y, L.from, L.to, d0, d1, L.wav ?? 12, L.seed || 0)) return;
    g.fillStyle = T.pattern(g, L.tex, k); g.fill();
    if (L.tint) { g.fillStyle = L.tint; g.fill(); }
  },
  // 整片海（可給上緣海岸線）
  sea(g, L, k, Y, d0, d1, T) {
    if (L.side) { if (!sidePath(g, Y, L, d0, d1)) return; }
    else if (!bandPath(g, Y, L.from, L.to, d0, d1, 14, 2)) return;
    g.save(); g.clip();
    paintWater(g, T, k, L.deep || '#0d3a4c');
    // 淺灘與浪花：只沿海岸線描
    const shore = [];
    if (L.side) {
      for (let d = Math.max(L.from, d0 - 40); d <= Math.min(L.to, d1 + 40); d += 8) shore.push([[pathX(L.shore, d) + Math.sin(d * 0.05) * 6 + Math.sin(d * 0.017) * 10, Y(d)]]);
    } else {
      for (const e of [L.from, L.to]) {
        if (e < d0 - 40 || e > d1 + 40 || Math.abs(e) > 8000) continue;
        const line = [];
        for (let x = -12; x <= W + 12; x += 12) line.push([x, Y(e + Math.sin(x * 0.045 + 2 + e * 0.01) * 14 + Math.sin(x * 0.13 + 4) * 14 * 0.35)]);
        shore.push(line);
      }
    }
    const lines = L.side ? [shore.map((p) => p[0])] : shore;
    for (const line of lines) {
      if (line.length < 2) continue;
      const path = () => { g.beginPath(); line.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); };
      path(); g.lineWidth = 34; g.strokeStyle = 'rgba(90,180,180,0.16)'; g.stroke();
      path(); g.lineWidth = 12; g.strokeStyle = 'rgba(140,210,205,0.22)'; g.stroke();
      path(); g.setLineDash([3, 5, 9, 4]); g.lineWidth = 1.6; g.strokeStyle = 'rgba(255,255,255,0.6)'; g.stroke(); g.setLineDash([]);
    }
    g.restore();
  },
  // 河流：沿路徑的帶狀水面
  river(g, L, k, Y, d0, d1, T) {
    const pts = [];
    for (let d = Math.max(L.from, d0 - 40); d <= Math.min(L.to, d1 + 40); d += 6) pts.push([pathX(L.path, d) + Math.sin(d * 0.04) * 8, d]);
    if (pts.length < 2) return;
    const stroke = (w, style) => { g.beginPath(); pts.forEach(([x, d], i) => (i ? g.lineTo(x, Y(d)) : g.moveTo(x, Y(d)))); g.lineWidth = w; g.strokeStyle = style; g.stroke(); };
    stroke(L.w + 10, 'rgba(70,60,40,0.35)');
    stroke(L.w + 4, 'rgba(110,150,120,0.5)');
    stroke(L.w, '#1d4a55');
    stroke(L.w * 0.55, 'rgba(60,120,130,0.55)');
    g.setLineDash([2, 7]); stroke(1, 'rgba(220,240,240,0.35)'); g.setLineDash([]);
    if (L.frozen) { stroke(L.w, 'rgba(225,238,245,0.82)'); g.setLineDash([12, 6]); stroke(0.8, 'rgba(120,150,170,0.6)'); g.setLineDash([]); }
  },
  // 道路
  road(g, L, k, Y, d0, d1, T) {
    const pts = [];
    for (let d = Math.max(L.from, d0 - 40); d <= Math.min(L.to, d1 + 40); d += 6) pts.push([pathX(L.path, d), d]);
    if (pts.length < 2) return;
    const line = () => { g.beginPath(); pts.forEach(([x, d], i) => (i ? g.lineTo(x, Y(d)) : g.moveTo(x, Y(d)))); };
    g.lineCap = 'round';
    line(); g.lineWidth = L.w + 5; g.strokeStyle = 'rgba(40,34,26,0.35)'; g.stroke();
    line(); g.lineWidth = L.w; g.strokeStyle = T.pattern(g, L.tex || 'aerial_asphalt_01', k); g.stroke();
    if (L.dirt) { line(); g.lineWidth = L.w; g.strokeStyle = 'rgba(120,95,60,0.35)'; g.stroke(); }
    if (L.marks) { line(); g.setLineDash([7, 9]); g.lineWidth = 0.9; g.strokeStyle = 'rgba(235,225,190,0.75)'; g.stroke(); g.setLineDash([]); }
  },
  // 田地：拼布狀的長方形色塊
  fields(g, L, k, Y, d0, d1, T) {
    const cols = ['rgba(150,160,60,0.38)', 'rgba(110,130,50,0.42)', 'rgba(170,150,80,0.4)', 'rgba(90,110,45,0.4)', 'rgba(180,170,110,0.32)'];
    for (let d = Math.floor(L.from / 50) * 50; d < L.to; d += 50) {
      if (d + 60 < d0 || d - 60 > d1) continue;
      seed(d * 7 + (L.seed || 0));
      let x = L.x0;
      while (x < L.x1) {
        const w = 26 + rnd() * 30;
        g.save(); g.translate(x + w / 2, Y(d + 25)); g.rotate((rnd() - 0.5) * 0.06);
        g.fillStyle = cols[(rnd() * cols.length) | 0]; g.fillRect(-w / 2, -24, w - 2, 48);
        g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 0.5;
        for (let yy = -22; yy < 24; yy += 3) { g.beginPath(); g.moveTo(-w / 2 + 1, yy); g.lineTo(w / 2 - 3, yy); g.stroke(); }
        g.restore();
        x += w;
      }
    }
  },
  // 樹林：一叢叢樹冠
  forest(g, L, k, Y, d0, d1) {
    const cell = 13;
    for (let d = Math.floor(L.from / cell) * cell; d < L.to; d += cell) {
      if (d < d0 - 20 || d > d1 + 20) continue;
      for (let x = 0; x < W; x += cell) {
        seed(d * 131 + x * 7 + (L.seed || 0));
        const inside = L.mask ? L.mask(x, d) : true;
        if (!inside || rnd() > (L.density ?? 0.6)) continue;
        tree(g, x + rnd() * cell, Y(d + rnd() * cell), 4 + rnd() * 4.5, L.snow, L.palm);
      }
    }
  },
  // 城鎮：沿道路兩側的建築
  town(g, L, k, Y, d0, d1) {
    for (let d = L.from; d < L.to; d += 26) {
      if (d < d0 - 40 || d > d1 + 40) continue;
      seed(d * 17 + (L.seed || 0));
      for (let x = L.x0; x < L.x1; x += 30 + rnd() * 10) {
        if (L.road && Math.abs(x - pathX(L.road, d)) < 26) continue;
        if (rnd() < 0.25) continue;
        building(g, x + rnd() * 6, Y(d + rnd() * 6), 14 + rnd() * 12, 12 + rnd() * 10, L.palette);
      }
    }
  },
  // 機場跑道
  runway(g, L, k, Y, d0, d1, T) {
    if (L.to < d0 - 40 || L.from > d1 + 40) return;
    g.save();
    g.fillStyle = T.pattern(g, 'aerial_asphalt_01', k); g.fillRect(L.x - L.w / 2, Y(L.to), L.w, L.to - L.from);
    g.fillStyle = 'rgba(20,20,22,0.25)'; g.fillRect(L.x - L.w / 2, Y(L.to), L.w, L.to - L.from);
    g.fillStyle = 'rgba(240,236,220,0.8)';
    for (let d = L.from + 10; d < L.to - 10; d += 26) g.fillRect(L.x - 0.8, Y(d + 12), 1.6, 12);
    g.fillRect(L.x - L.w / 2 + 2, Y(L.to), 1, L.to - L.from); g.fillRect(L.x + L.w / 2 - 3, Y(L.to), 1, L.to - L.from);
    for (let i = -3; i <= 3; i++) if (i) g.fillRect(L.x + i * 4 - 1, Y(L.from + 16), 2, 12);
    g.restore();
  },
  // 沙丘：明暗條紋
  dunes(g, L, k, Y, d0, d1) {
    for (let d = Math.floor(L.from / 22) * 22; d < L.to; d += 22) {
      if (d < d0 - 30 || d > d1 + 30) continue;
      seed(d * 3 + 5);
      const ph = rnd() * 6, amp = 6 + rnd() * 8;
      g.beginPath();
      for (let x = -10; x <= W + 10; x += 8) g.lineTo(x, Y(d + Math.sin(x * 0.03 + ph) * amp));
      g.lineWidth = 7; g.strokeStyle = 'rgba(90,60,30,0.16)'; g.stroke();
      g.translate(0, -3); g.lineWidth = 3; g.strokeStyle = 'rgba(255,240,210,0.16)'; g.stroke(); g.translate(0, 3);
    }
  },
  // 岩塊與彈坑點綴
  rocks(g, L, k, Y, d0, d1) {
    const n = L.n ?? 10;
    for (let d = Math.floor(L.from / 60) * 60; d < L.to; d += 60) {
      if (d < d0 - 40 || d > d1 + 40) continue;
      seed(d * 11 + (L.seed || 0));
      for (let i = 0; i < n; i++) {
        const x = rnd() * W, dd = d + rnd() * 60, r = 2 + rnd() * (L.size || 5);
        if (L.mask && !L.mask(x, dd)) continue;
        g.beginPath(); g.ellipse(x + r * 0.4, Y(dd) + r * 0.4, r * 1.1, r * 0.8, 0.3, 0, Math.PI * 2); g.fillStyle = 'rgba(0,0,0,0.28)'; g.fill();
        g.beginPath(); g.ellipse(x, Y(dd), r, r * 0.75, rnd() * 3, 0, Math.PI * 2);
        const gr = g.createRadialGradient(x - r * 0.4, Y(dd) - r * 0.4, 0.2, x, Y(dd), r * 1.2);
        gr.addColorStop(0, L.light || '#c8c0b0'); gr.addColorStop(1, L.dark || '#5c564c');
        g.fillStyle = gr; g.fill();
      }
    }
  },
  // 停機坪、儲油槽等基地設施
  base(g, L, k, Y, d0, d1, T) {
    if (L.to < d0 - 60 || L.from > d1 + 60) return;
    g.save();
    g.fillStyle = T.pattern(g, 'aerial_asphalt_01', k); g.fillRect(L.x0, Y(L.to), L.x1 - L.x0, L.to - L.from);
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(L.x0, Y(L.to), L.x1 - L.x0, L.to - L.from);
    g.strokeStyle = 'rgba(235,225,160,0.6)'; g.lineWidth = 0.8; g.strokeRect(L.x0 + 3, Y(L.to) + 3, L.x1 - L.x0 - 6, L.to - L.from - 6);
    seed(L.from);
    for (let i = 0; i < (L.tanks || 0); i++) {
      const x = L.x0 + 14 + rnd() * (L.x1 - L.x0 - 28), d = L.from + 14 + rnd() * (L.to - L.from - 28);
      g.beginPath(); g.arc(x + 2.5, Y(d) + 3, 8, 0, Math.PI * 2); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fill();
      g.beginPath(); g.arc(x, Y(d), 8, 0, Math.PI * 2);
      const gr = g.createRadialGradient(x - 3, Y(d) - 3, 1, x, Y(d), 9); gr.addColorStop(0, '#e8e6e0'); gr.addColorStop(1, '#8d8a82');
      g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 0.5; g.stroke();
    }
    g.restore();
  },
};

// 樹冠
function tree(g, x, y, r, snow, palm) {
  g.beginPath(); g.ellipse(x + r * 0.55, y + r * 0.6, r * 1.05, r * 0.9, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fill();
  if (palm) {
    g.save(); g.translate(x, y);
    for (let i = 0; i < 7; i++) { g.rotate((Math.PI * 2) / 7); g.beginPath(); g.ellipse(r * 0.55, 0, r * 0.62, r * 0.18, 0, 0, Math.PI * 2); g.fillStyle = i % 2 ? '#4f6b2e' : '#3f5a24'; g.fill(); }
    g.restore();
    return;
  }
  const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.1);
  if (snow) { gr.addColorStop(0, '#f4f7f8'); gr.addColorStop(0.45, '#bcc8c9'); gr.addColorStop(1, '#3d4d47'); }
  else { gr.addColorStop(0, '#7f9a4c'); gr.addColorStop(0.5, '#4c6a2c'); gr.addColorStop(1, '#22351a'); }
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = gr; g.fill();
}

// 建築：屋頂分兩面明暗，加落影
function building(g, x, y, w, h, pal = ['#a8573f', '#8a8579', '#b9b2a2', '#6f7a80', '#9c6b4a']) {
  const c = pal[(rnd() * pal.length) | 0];
  g.fillStyle = 'rgba(0,0,0,0.32)'; g.fillRect(x - w / 2 + 3, y - h / 2 + 4, w, h);
  g.fillStyle = c; g.fillRect(x - w / 2, y - h / 2, w, h);
  if (rnd() < 0.6) {
    g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(x - w / 2, y - h / 2, w, h / 2);
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x - w / 2, y, w, h / 2);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x - w / 2, y - 0.3, w, 0.6);
  } else {
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 0.6; g.strokeRect(x - w / 2 + 1.5, y - h / 2 + 1.5, w - 3, h - 3);
    g.fillStyle = 'rgba(40,40,40,0.35)'; g.fillRect(x - 2, y - 2, 4, 4);
  }
}

// 焦痕
function paintDecal(g, dc, k) {
  const y = (k + 1) * CH - dc.d;
  const gr = g.createRadialGradient(dc.x, y, 0, dc.x, y, dc.r);
  gr.addColorStop(0, 'rgba(18,14,10,0.75)'); gr.addColorStop(0.55, 'rgba(30,24,16,0.45)'); gr.addColorStop(1, 'rgba(30,24,16,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(dc.x, y, dc.r, 0, Math.PI * 2); g.fill();
  let s = dc.s;
  for (let i = 0; i < 6; i++) {
    s = (s * 16807) % 2147483647; const a = (s / 2147483647) * Math.PI * 2;
    g.beginPath(); g.moveTo(dc.x, y); g.lineTo(dc.x + Math.cos(a) * dc.r * 1.2, y + Math.sin(a) * dc.r * 1.2);
    g.strokeStyle = 'rgba(20,16,12,0.35)'; g.lineWidth = 1; g.stroke();
  }
}

// 海水：深淺漸層加細浪紋（可無縫拼接的小圖）
function makeWater(ppu) {
  const S = 120, c = document.createElement('canvas');
  c.width = c.height = Math.ceil(S * ppu);
  const g = c.getContext('2d'); g.scale(ppu, ppu);
  let s = 3;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.strokeStyle = 'rgba(190,235,240,0.16)'; g.lineWidth = 0.7;
  for (let i = 0; i < 70; i++) {
    const x = r() * S, y = r() * S, w = 4 + r() * 10;
    for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) {
      g.beginPath(); g.moveTo(x + ox - w / 2, y + oy); g.quadraticCurveTo(x + ox, y + oy - 1.6, x + ox + w / 2, y + oy); g.stroke();
    }
  }
  return { c, S };
}
function paintWater(g, T, k, deep) {
  g.fillStyle = deep; g.fillRect(-20, -20, W + 40, CH + 40);
  // 只沿 x 方向漸層，區塊上下接縫才不會斷開
  const gr = g.createLinearGradient(0, 0, W, 0);
  gr.addColorStop(0, 'rgba(40,110,120,0.25)'); gr.addColorStop(0.5, 'rgba(30,90,100,0.12)'); gr.addColorStop(1, 'rgba(0,20,30,0.25)');
  g.fillStyle = gr; g.fillRect(-20, -20, W + 40, CH + 40);
  const p = g.createPattern(T.water.c, 'repeat');
  const s = 1 / T.ppu, off = ((k + 1) * CH) % T.water.S;
  p.setTransform(new DOMMatrix([s, 0, 0, s, 0, off]));
  g.fillStyle = p; g.fillRect(-20, -20, W + 40, CH + 40);
}

export const TEXTURES = ['aerial_beach_01', 'aerial_grass_rock', 'aerial_sand', 'aerial_rocks_02', 'aerial_asphalt_01', 'snow_field_aerial', 'dirt_aerial_02', 'aerial_ground_rock', 'coast_sand_rocks_02', 'aerial_mud_1'];
