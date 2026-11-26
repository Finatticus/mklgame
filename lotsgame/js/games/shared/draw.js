// 共用繪圖：棋子、木質棋盤、籌碼，以及大廳封面圖。
// 所有畫面都以實際素材即時繪製，封面就是遊戲本身的樣子。
import { loadImage, asset } from '../../ui.js';

const SPRITES = {};

// 預先繪好的棋子（含陰影），pad 為外圍留白比例
export function stoneSprite(color, r, dpr = 1) {
  const key = color + ':' + Math.round(r * dpr * 10);
  if (SPRITES[key]) return SPRITES[key];
  const R = r * dpr, pad = Math.ceil(R * 0.35), size = Math.ceil(R * 2 + pad * 2);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const cx = size / 2, cy = size / 2;
  // 陰影
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.55)';
  g.shadowBlur = R * 0.28;
  g.shadowOffsetX = R * 0.07;
  g.shadowOffsetY = R * 0.16;
  g.beginPath(); g.arc(cx, cy, R * 0.97, 0, Math.PI * 2); g.fillStyle = '#000'; g.fill();
  g.restore();
  g.beginPath(); g.arc(cx, cy, R * 0.98, 0, Math.PI * 2);
  if (color === 1) {
    const grad = g.createRadialGradient(cx - R * 0.35, cy - R * 0.42, R * 0.05, cx, cy, R * 1.05);
    grad.addColorStop(0, '#6a6a6e'); grad.addColorStop(0.18, '#343437'); grad.addColorStop(0.55, '#151517'); grad.addColorStop(1, '#030303');
    g.fillStyle = grad; g.fill();
    // 板岩的霧面高光
    const hl = g.createRadialGradient(cx - R * 0.3, cy - R * 0.5, 0, cx - R * 0.3, cy - R * 0.5, R * 0.55);
    hl.addColorStop(0, 'rgba(255,255,255,0.16)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = hl; g.fill();
  } else {
    const grad = g.createRadialGradient(cx - R * 0.3, cy - R * 0.4, R * 0.05, cx, cy, R * 1.05);
    grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.5, '#f1eee6'); grad.addColorStop(0.85, '#d6d1c4'); grad.addColorStop(1, '#a9a394');
    g.fillStyle = grad; g.fill();
    // 蛤碁石的細紋
    g.save();
    g.clip();
    g.strokeStyle = 'rgba(120,110,90,0.10)';
    g.lineWidth = Math.max(0.5, R * 0.025);
    for (let i = -6; i <= 6; i++) {
      g.beginPath();
      g.arc(cx + R * 2.6, cy + i * R * 0.17, R * 2.9, Math.PI * 0.8, Math.PI * 1.2);
      g.stroke();
    }
    g.restore();
    g.beginPath(); g.arc(cx, cy, R * 0.98, 0, Math.PI * 2);
    g.strokeStyle = 'rgba(90,80,60,0.25)'; g.lineWidth = Math.max(0.5, R * 0.03); g.stroke();
  }
  const out = { canvas: c, size: size / dpr, half: size / dpr / 2 };
  SPRITES[key] = out;
  return out;
}

export function drawStone(ctx, color, x, y, r, dpr, alpha = 1) {
  const s = stoneSprite(color, r, dpr);
  if (alpha !== 1) ctx.globalAlpha = alpha;
  ctx.drawImage(s.canvas, x - s.half, y - s.half, s.size, s.size);
  if (alpha !== 1) ctx.globalAlpha = 1;
}

export const WOOD = { go: 'wood/bamboo.jpg', gomoku: 'wood/cherry.jpg' };
export const woodImage = (name) => loadImage(asset(WOOD[name]));

// 以 cover 方式鋪滿木紋，並加上柔和的光影
export function paintWood(ctx, img, x, y, w, h, tint) {
  const s = Math.max(w / img.width, h / img.height);
  ctx.drawImage(img, x + (w - img.width * s) / 2, y + (h - img.height * s) / 2, img.width * s, img.height * s);
  if (tint) { ctx.fillStyle = tint; ctx.fillRect(x, y, w, h); }
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, 'rgba(255,244,214,0.10)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(40,20,0,0.16)');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
}

export function drawChip(ctx, x, y, r, base, edge = '#f4ecd8') {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = r * 0.3; ctx.shadowOffsetY = r * 0.12;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = base; ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = edge;
  for (let i = 0; i < 6; i++) {
    ctx.save(); ctx.translate(x, y); ctx.rotate((i * Math.PI) / 3);
    ctx.fillRect(-r * 0.14, -r, r * 0.28, r * 0.24);
    ctx.restore();
  }
  ctx.restore();
  ctx.beginPath(); ctx.arc(x, y, r * 0.7, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = Math.max(1, r * 0.045); ctx.setLineDash([r * 0.1, r * 0.1]); ctx.stroke(); ctx.setLineDash([]);
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, 0, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,0.28)'); g.addColorStop(0.6, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
}

export function paintFelt(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h * 0.35, 0, w / 2, h * 0.5, Math.max(w, h) * 0.8);
  g.addColorStop(0, '#1f6b4c'); g.addColorStop(0.55, '#134a35'); g.addColorStop(1, '#082419');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}

// ---------------------------------------------------------------------------
// 封面

function boardCloseup(ctx, w, h, img, { cell, ox, oy, stones, lineColor, star }) {
  paintWood(ctx, img, 0, 0, w, h);
  ctx.strokeStyle = lineColor; ctx.lineWidth = Math.max(1, cell * 0.035);
  ctx.beginPath();
  for (let i = -1; i < 20; i++) {
    const x = ox + i * cell, y = oy + i * cell;
    if (i >= 0) { ctx.moveTo(x, oy); ctx.lineTo(x, h + cell); ctx.moveTo(ox, y); ctx.lineTo(w + cell, y); }
  }
  ctx.stroke();
  ctx.lineWidth = Math.max(1.5, cell * 0.06);
  ctx.strokeRect(ox, oy, w * 2, h * 2);
  if (star) for (const [sx, sy] of star) { ctx.beginPath(); ctx.arc(ox + sx * cell, oy + sy * cell, cell * 0.09, 0, Math.PI * 2); ctx.fillStyle = lineColor; ctx.fill(); }
  for (const [x, y, c] of stones) drawStone(ctx, c, ox + x * cell, oy + y * cell, cell * 0.47, 2);
  const v = ctx.createRadialGradient(w * 0.4, h * 0.35, 0, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
}

const COVERS = {
  async go(ctx, w, h) {
    const img = await woodImage('go');
    const cell = Math.max(w, h * 1.2) / 8.6;
    // 小目定式一角
    const stones = [[3, 2, 1], [2, 4, 2], [5, 2, 2], [3, 5, 1], [2, 3, 1], [4, 4, 2], [6, 3, 1], [5, 5, 2], [1, 5, 2], [4, 1, 1], [6, 5, 1]];
    boardCloseup(ctx, w, h, img, { cell, ox: cell * 0.85, oy: cell * 0.85, stones, lineColor: 'rgba(38,26,12,0.85)', star: [[3, 3]] });
  },
  async gomoku(ctx, w, h) {
    const img = await woodImage('gomoku');
    const cell = Math.max(w, h * 1.2) / 7.4;
    const stones = [[1, 4, 1], [2, 3, 1], [3, 2, 1], [4, 1, 1], [5, 0, 1], [2, 2, 2], [3, 3, 2], [1, 3, 2], [4, 2, 2], [3, 1, 2], [2, 4, 1], [4, 3, 2], [5, 2, 1]];
    boardCloseup(ctx, w, h, img, { cell, ox: -cell * 0.1, oy: cell * 0.45, stones, lineColor: 'rgba(50,24,10,0.8)' });
  },
  async blackjack(ctx, w, h) {
    paintFelt(ctx, w, h);
    const [a, k] = await Promise.all([loadImage(asset('cards/AS.webp')), loadImage(asset('cards/KH.webp'))]);
    const ch = h * 0.74, cw = ch * 0.6886;
    const card = (img, x, y, rot) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = ch * 0.08; ctx.shadowOffsetY = ch * 0.04;
      ctx.fillStyle = '#fbf9f3';
      ctx.beginPath(); ctx.roundRect(-cw / 2, -ch / 2, cw, ch, cw * 0.07); ctx.fill();
      ctx.shadowColor = 'transparent';
      const m = cw * 0.05;
      ctx.drawImage(img, -cw / 2 + m, -ch / 2 + m, cw - 2 * m, ch - 2 * m);
      ctx.restore();
    };
    card(k, w * 0.44, h * 0.5, -0.2);
    card(a, w * 0.62, h * 0.52, 0.12);
    const r = h * 0.13;
    drawChip(ctx, w * 0.16, h * 0.74, r, '#8c2f2a');
    drawChip(ctx, w * 0.2, h * 0.68, r, '#1d1d20');
    drawChip(ctx, w * 0.87, h * 0.24, r * 0.9, '#b08a45', '#2a2216');
    const v = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
  },
};

export async function paintCover(canvas, id) {
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(160, r.width), hh = Math.max(100, r.height);
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(hh * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  try { await COVERS[id](ctx, w, hh); } catch (e) { ctx.fillStyle = '#1a1714'; ctx.fillRect(0, 0, w, hh); }
}
