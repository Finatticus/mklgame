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

export const WOOD = { go: 'wood/bamboo.jpg', gomoku: 'wood/cherry.jpg', xiangqi: 'wood/cherry.jpg', light: 'wood/bamboo.jpg', dark: 'wood/walnut.jpg' };
export const woodImage = (name) => loadImage(asset(WOOD[name]));

// ---------- 象棋棋子與棋盤 ----------
export const XQ_FACE = [['帥', '仕', '相', '傌', '俥', '炮', '兵'], ['將', '士', '象', '馬', '車', '砲', '卒']];
export const XQ_INK = ['#a8231a', '#1d1a16'];

// 木製圓棋子：側邊厚度、黃楊木面、刻槽內圈與刻字
export function xqSprite(side, type, r, dpr = 1) {
  const key = 'xq' + side + type + ':' + Math.round(r * dpr * 10);
  if (SPRITES[key]) return SPRITES[key];
  const R = r * dpr, pad = Math.ceil(R * 0.3), size = Math.ceil(R * 2 + pad * 2);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const cx = size / 2, cy = size / 2, th = R * 0.1;
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = R * 0.25; g.shadowOffsetY = R * 0.14;
  g.beginPath(); g.arc(cx, cy + th / 2, R * 0.98, 0, Math.PI * 2); g.fillStyle = '#7b542c'; g.fill();
  g.restore();
  const top = cy - th / 2;
  const grad = g.createRadialGradient(cx - R * 0.35, top - R * 0.4, R * 0.1, cx, top, R * 1.02);
  grad.addColorStop(0, '#fbefd3'); grad.addColorStop(0.55, '#ecd3a0'); grad.addColorStop(1, '#c79a5c');
  g.beginPath(); g.arc(cx, top, R * 0.96, 0, Math.PI * 2); g.fillStyle = grad; g.fill();
  // 木紋
  g.save(); g.clip();
  g.strokeStyle = 'rgba(130,85,40,0.10)'; g.lineWidth = Math.max(0.6, R * 0.03);
  for (let i = -5; i <= 5; i++) { g.beginPath(); g.ellipse(cx + R * 1.8, top + i * R * 0.2, R * 2.2, R * 0.9, 0.15, Math.PI * 0.82, Math.PI * 1.18); g.stroke(); }
  g.restore();
  g.beginPath(); g.arc(cx, top, R * 0.96, 0, Math.PI * 2); g.strokeStyle = 'rgba(90,55,20,0.45)'; g.lineWidth = Math.max(0.6, R * 0.04); g.stroke();
  // 刻槽內圈
  const ink = XQ_INK[side];
  g.beginPath(); g.arc(cx, top + R * 0.02, R * 0.79, 0, Math.PI * 2); g.strokeStyle = 'rgba(255,248,230,0.7)'; g.lineWidth = Math.max(0.6, R * 0.04); g.stroke();
  g.beginPath(); g.arc(cx, top, R * 0.79, 0, Math.PI * 2); g.strokeStyle = ink; g.globalAlpha = 0.85; g.lineWidth = Math.max(0.8, R * 0.055); g.stroke(); g.globalAlpha = 1;
  // 刻字
  g.font = `700 ${Math.round(R * 1.0)}px ${serifFamily()}`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const ty = top + R * 0.05, ch = XQ_FACE[side][type];
  g.fillStyle = 'rgba(255,250,238,0.75)'; g.fillText(ch, cx + R * 0.02, ty + R * 0.035);
  g.fillStyle = ink; g.fillText(ch, cx, ty);
  const out = { canvas: c, size: size / dpr, half: size / dpr / 2 };
  SPRITES[key] = out;
  return out;
}

export function drawXq(ctx, side, type, x, y, r, dpr, alpha = 1) {
  const s = xqSprite(side, type, r, dpr);
  if (alpha !== 1) ctx.globalAlpha = alpha;
  ctx.drawImage(s.canvas, x - s.half, y - s.half, s.size, s.size);
  if (alpha !== 1) ctx.globalAlpha = 1;
}

// 象棋盤面線條：P(x, y) 回傳交叉點座標（已處理翻轉）
export function xqLines(ctx, P, cell, { line = 'rgba(48,24,8,0.88)', river = true, flip = false } = {}) {
  const lw = Math.max(0.8, cell * 0.032);
  ctx.strokeStyle = line; ctx.lineWidth = lw;
  ctx.beginPath();
  for (let y = 0; y < 10; y++) { const [x0, yy] = P(0, y), [x1] = P(8, y); ctx.moveTo(x0, yy); ctx.lineTo(x1, yy); }
  for (let x = 0; x < 9; x++) {
    if (x === 0 || x === 8) { const [xx, y0] = P(x, 0), [, y1] = P(x, 9); ctx.moveTo(xx, y0); ctx.lineTo(xx, y1); continue; }
    const [xx, a] = P(x, 0), [, b] = P(x, 4), [, c] = P(x, 5), [, d] = P(x, 9);
    ctx.moveTo(xx, a); ctx.lineTo(xx, b); ctx.moveTo(xx, c); ctx.lineTo(xx, d);
  }
  // 九宮斜線
  for (const [y0, y1] of [[0, 2], [7, 9]]) {
    let [ax, ay] = P(3, y0), [bx, by] = P(5, y1); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
    [ax, ay] = P(5, y0); [bx, by] = P(3, y1); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
  }
  ctx.stroke();
  // 外框（粗線）
  const [l, t] = P(flip ? 8 : 0, flip ? 9 : 0), [r, b] = P(flip ? 0 : 8, flip ? 0 : 9);
  const o = cell * 0.12;
  ctx.lineWidth = lw * 2.4; ctx.strokeRect(l - o, t - o, r - l + 2 * o, b - t + 2 * o);
  // 炮位、兵位的花記
  const mark = (x, y) => {
    const [cx, cy] = P(x, y), g = cell * 0.08, s = cell * 0.2;
    ctx.beginPath();
    for (const dx of [-1, 1]) for (const dy of [-1, 1]) {
      const ex = flip ? -dx : dx;
      if ((x === 0 && ex < 0) || (x === 8 && ex > 0)) continue;
      ctx.moveTo(cx + dx * (g + s), cy + dy * g); ctx.lineTo(cx + dx * g, cy + dy * g); ctx.lineTo(cx + dx * g, cy + dy * (g + s));
    }
    ctx.lineWidth = lw; ctx.stroke();
  };
  for (const x of [1, 7]) { mark(x, 2); mark(x, 7); }
  for (const x of [0, 2, 4, 6, 8]) { mark(x, 3); mark(x, 6); }
  if (river) {
    const [lx, ry0] = P(flip ? 8 : 0, flip ? 5 : 4), [rx, ry1] = P(flip ? 0 : 8, flip ? 4 : 5);
    const my = (ry0 + ry1) / 2, span = rx - lx;
    ctx.fillStyle = 'rgba(60,30,10,0.72)';
    ctx.font = `600 ${Math.round(cell * 0.52)}px ${serifFamily()}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const words = ['楚', '河', '漢', '界'], xs = [0.16, 0.3, 0.7, 0.84];
    words.forEach((w, i) => ctx.fillText(w, lx + span * xs[i], my + cell * 0.02));
  }
}

// ---------- 西洋棋 ----------
const CHESS_IMG = {};
export function chessImages() {
  const all = [];
  for (const c of 'wb') for (const p of 'kqrbnp') {
    const k = c + p;
    if (!CHESS_IMG[k]) CHESS_IMG[k] = loadImage(asset('chess/' + k + '.svg'));
    all.push(CHESS_IMG[k].then((img) => [k, img]));
  }
  return Promise.all(all).then((list) => Object.fromEntries(list));
}

// 木質棋盤格：淺色竹、深色胡桃木
export function chessSquares(ctx, light, dark, ox, oy, cell, files = 8, ranks = 8, startDark = false) {
  paintWood(ctx, light, ox, oy, cell * files, cell * ranks, 'rgba(255,240,210,0.08)');
  ctx.save();
  ctx.beginPath();
  for (let r = 0; r < ranks; r++) for (let f = 0; f < files; f++) if (((r + f) % 2 === 1) !== startDark) ctx.rect(ox + f * cell, oy + r * cell, cell, cell);
  ctx.clip();
  paintWood(ctx, dark, ox, oy, cell * files, cell * ranks, 'rgba(60,30,10,0.12)');
  ctx.restore();
}

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
  // 月下白狼：遊戲本身 3D 場景的渲染畫面（白狼對峙狼王與狼群）
  async wolf(ctx, w, h) {
    const img = await loadImage(asset('wolf/cover.jpg'));
    const s = Math.max(w / img.width, h / img.height), iw = img.width * s, ih = img.height * s;
    const x = Math.min(0, Math.max(w - iw, w / 2 - iw * 0.46)); // 讓白狼與狼王都在畫面內
    ctx.drawImage(img, x, (h - ih) / 2, iw, ih);
    const g = ctx.createLinearGradient(0, h * 0.45, 0, h);
    g.addColorStop(0, 'rgba(8,8,10,0)'); g.addColorStop(1, 'rgba(8,8,10,0.55)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  },
  // 極速山道：遊戲本身的渲染畫面（海岸懸崖路段上的兩台車）
  async racer(ctx, w, h) {
    const img = await loadImage(asset('racer/cover.jpg'));
    const s = Math.max(w / img.width, h / img.height), iw = img.width * s, ih = img.height * s;
    // 兩台車在畫面中段偏下：寬版裁掉上方天空
    ctx.drawImage(img, (w - iw) / 2, Math.min(0, Math.max(h - ih, h * 0.5 - ih * 0.56)), iw, ih);
    const g = ctx.createLinearGradient(0, h * 0.45, 0, h);
    g.addColorStop(0, 'rgba(8,8,10,0)'); g.addColorStop(1, 'rgba(8,8,10,0.55)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  },
  // 開球前的特寫：擺好的球、母球與球桿
  async billiards(ctx, w, h) {
    const [{ TableView }, B] = await Promise.all([import('../billiards/render.js'), import('../billiards/physics.js')]);
    const cv = document.createElement('canvas');
    const span = Math.max(0.9, 0.62 * w / h);
    const view = new TableView(cv, { size: { W: w, H: h }, dpr: 2, view: { cx: B.W / 2 + 0.06, cy: B.FOOT_Y - 0.12, span } });
    await view.build();
    const balls = B.rack8(() => 0.37);
    balls[0].x = B.W / 2 + 0.05; balls[0].y = B.FOOT_Y - 0.42;
    view.draw({ balls, cue: { show: true, ang: Math.atan2(B.FOOT_Y - balls[0].y, B.W / 2 - balls[0].x), pull: 0.25 } });
    ctx.drawImage(cv, 0, 0, w, h);
    vignette(ctx, w, h);
  },
  // 錦鯉池的洞口特寫：用遊戲本身的繪圖程式即時畫出
  async minigolf(ctx, w, h) {
    const [{ CourseView }, P, { COURSES }] = await Promise.all([import('../minigolf/render.js'), import('../minigolf/physics.js'), import('../minigolf/holes.js')]);
    const world = P.buildHole(COURSES[0].holes[2]);
    const cv = document.createElement('canvas');
    const k = P.SCALE, span = Math.max(1.05, (0.95 * w) / h) * k;
    const view = new CourseView(cv, 'garden', { size: { W: w, H: h }, dpr: 2, view: { cx: 0.66 * k, cy: 0.64 * k, span } });
    await view.setHole(world);
    view.draw({ time: 0.9, ball: P.newBall(world, 0.58 * k, 0.72 * k) });
    ctx.drawImage(cv, 0, 0, w, h);
    vignette(ctx, w, h);
  },
  // 中炮對屏風馬的盤面中段，含楚河漢界
  async xiangqi(ctx, w, h) {
    const img = await woodImage('xiangqi');
    await document.fonts.load('700 20px ' + serifFamily(), '帥炮兵傌將砲卒馬楚河漢界').catch(() => {});
    paintWood(ctx, img, 0, 0, w, h);
    // 炮二平五 馬８進７ 傌二進三 車９平８ 俥一平二 卒７進１ 俥二進四 之後
    const cell = Math.max(w / 7.4, h / 4), ox = w / 2 - 4.4 * cell, oy = cell * 0.2 - 2 * cell;
    const P = (x, y) => [ox + x * cell, oy + y * cell];
    xqLines(ctx, P, cell);
    const pcs = [[1, 2, 1, 5], [7, 2, 1, 5], [6, 2, 1, 3], [0, 3, 1, 6], [2, 3, 1, 6], [4, 3, 1, 6], [6, 4, 1, 6], [8, 3, 1, 6],
      [7, 5, 0, 4], [0, 6, 0, 6], [2, 6, 0, 6], [4, 6, 0, 6], [6, 6, 0, 6], [8, 6, 0, 6], [1, 7, 0, 5], [4, 7, 0, 5], [6, 7, 0, 3]];
    for (const [x, y, s, t] of pcs) { const [px, py] = P(x, y); drawXq(ctx, s, t, px, py, cell * 0.45, 2); }
    vignette(ctx, w, h);
  },
  // 義大利開局的中央四列
  async chess(ctx, w, h) {
    const [light, dark, imgs] = await Promise.all([woodImage('light'), woodImage('dark'), chessImages()]);
    const cell = Math.max(w / 6, h / 3.6), ox = (w - 6 * cell) / 2, oy = (h - 4 * cell) / 2;
    chessSquares(ctx, light, dark, ox, oy, cell, 6, 4, true);
    // 欄 b–g、列 6–3（b6 為深色格）
    const pcs = [['bn', 1, 0], ['bp', 3, 1], ['bb', 1, 1], ['bp', 2, 0], ['wp', 3, 2], ['wb', 1, 2], ['wn', 4, 3], ['wp', 2, 3], ['bn', 4, 0]];
    for (const [k, c, r] of pcs) {
      const s = cell * 0.94;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = cell * 0.08; ctx.shadowOffsetY = cell * 0.05;
      ctx.drawImage(imgs[k], ox + c * cell + (cell - s) / 2, oy + r * cell + (cell - s) / 2, s, s);
      ctx.restore();
    }
    vignette(ctx, w, h);
  },
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
  async baccarat(ctx, w, h) {
    feltGradient(ctx, w, h, ['#24695f', '#163f3a', '#081d1b']);
    const [nine, king, five] = await Promise.all(['9D', 'KC', '5S'].map((c) => loadImage(asset('cards/' + c + '.webp'))));
    const ch = h * 0.66, cw = ch * 0.6886;
    playingCard(ctx, five, w * 0.25, h * 0.52, cw * 0.9, ch * 0.9, -0.16);
    playingCard(ctx, king, w * 0.55, h * 0.48, cw, ch, -0.08);
    playingCard(ctx, nine, w * 0.7, h * 0.52, cw, ch, 0.14);
    const r = h * 0.12;
    drawChip(ctx, w * 0.12, h * 0.82, r, '#5a2c6e');
    drawChip(ctx, w * 0.9, h * 0.2, r * 0.9, '#9a7631', '#2a2216');
    vignette(ctx, w, h);
  },
  async holdem(ctx, w, h) {
    feltGradient(ctx, w, h, ['#1f6b4c', '#134a35', '#061a12']);
    const codes = ['AS', 'KS', 'QS', 'JS', 'TS', 'AH', 'AD'];
    const im = await Promise.all(codes.map((c) => loadImage(asset('cards/' + c + '.webp'))));
    const ch = Math.min(h * 0.4, (w * 0.92) / 5 / 0.6886 / 1.1), cw = ch * 0.6886;
    const gap = cw * 0.1, x0 = w / 2 - (cw * 5 + gap * 4) / 2 + cw / 2;
    for (let i = 0; i < 5; i++) playingCard(ctx, im[i], x0 + i * (cw + gap), h * 0.3, cw, ch, 0);
    const big = h * 0.56, bw = big * 0.6886;
    playingCard(ctx, im[5], w * 0.44, h * 0.78, bw, big, -0.12);
    playingCard(ctx, im[6], w * 0.56, h * 0.8, bw, big, 0.1);
    const r = h * 0.1;
    for (let k = 0; k < 4; k++) drawChip(ctx, w * 0.14, h * 0.86 - k * r * 0.32, r, k % 2 ? '#1d1d20' : '#8c2f2a');
    drawChip(ctx, w * 0.86, h * 0.82, r, '#2d4f86');
    vignette(ctx, w, h);
  },
  async shooter(ctx, w, h) {
    const [img, m] = await Promise.all([loadImage(asset('shooter/aerial_grass_rock.jpg')), import('../shooter/sprites.js')]);
    const s = Math.max(w, h) / 300;
    const pat = ctx.createPattern(img, 'repeat');
    pat.setTransform(new DOMMatrix([s * 0.6, 0, 0, s * 0.6, 0, 0]));
    ctx.fillStyle = pat; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(20,30,10,0.25)'; ctx.fillRect(0, 0, w, h);
    // 一條道路斜穿畫面
    ctx.save(); ctx.translate(w * 0.72, h * 0.5); ctx.rotate(0.35);
    ctx.fillStyle = 'rgba(40,36,30,0.55)'; ctx.fillRect(-14 * s, -h, 28 * s, h * 2);
    ctx.setLineDash([7 * s, 9 * s]); ctx.strokeStyle = 'rgba(235,225,190,0.6)'; ctx.lineWidth = 1.2 * s; ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(0, h); ctx.stroke();
    ctx.restore();
    const S = m.coverSprites();
    const put = (sp, x, y, sc, rot = 0) => { m.blit(ctx, sp.shadow, x + 16 * sc, y + 26 * sc, rot, sc * 0.82, 0.3); m.blit(ctx, sp, x, y, rot, sc); };
    ctx.save(); ctx.scale(1, 1);
    put(S.fighter, w * 0.2, h * 0.22, s * 1.2, Math.PI + 0.25);
    put(S.fighter, w * 0.82, h * 0.16, s * 1.1, Math.PI - 0.2);
    put(S.player, w * 0.7, h * 0.6, s * 2.1);
    // 機砲曳光彈
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) for (const dx of [-0.03, 0.03]) {
      const x = w * (0.7 + dx), y = h * (0.34 - i * 0.07);
      const gr = ctx.createLinearGradient(x, y - 8 * s, x, y + 8 * s); gr.addColorStop(0, 'rgba(255,200,90,0)'); gr.addColorStop(0.5, 'rgba(255,240,190,0.95)'); gr.addColorStop(1, 'rgba(255,200,90,0)');
      ctx.fillStyle = gr; ctx.fillRect(x - 1.2 * s, y - 8 * s, 2.4 * s, 16 * s);
    }
    ctx.restore();
    vignette(ctx, w, h);
  },
  async bigtwo(ctx, w, h) {
    feltGradient(ctx, w, h, ['#1d6248', '#124532', '#061a12']);
    const codes = ['3C', '2C', '2D', '2H', '2S'];
    const im = await Promise.all(codes.map((c) => loadImage(asset('cards/' + c + '.webp'))));
    const ch = Math.min(h * 0.58, w * 0.32), cw = ch * 0.6886;
    const cx = w * 0.62, cy = h * 0.95 + ch * 0.25;
    im.forEach((img, k) => {
      const a = (k - 2) * 0.2;
      const x = cx + Math.sin(a) * ch * 0.95, y = cy - Math.cos(a) * ch * 0.95;
      playingCard(ctx, img, x, y, cw, ch, a);
    });
    const r = h * 0.1;
    for (let k = 0; k < 3; k++) drawChip(ctx, w * 0.12, h * 0.3 - k * r * 0.32, r, k % 2 ? '#1d1d20' : '#8c2f2a');
    drawChip(ctx, w * 0.88, h * 0.26, r * 0.9, '#9a7631', '#2a2216');
    vignette(ctx, w, h);
  },
  async mahjong(ctx, w, h) {
    feltGradient(ctx, w, h, ['#22694a', '#14432f', '#081e15']);
    const front = [27, 27, 27, 31, 31, 0, 1, 2, 13, 13];
    const back = [33, 33, 32, 9, 10, 11, 18, 18, 18];
    const im = await Promise.all([...new Set(front.concat(back))].map(async (t) => [t, await loadImage(asset('mahjong/t' + t + '.webp'))]));
    const map = new Map(im);
    const tw = Math.min(w / 6.2, h * 0.36), th = tw * 1.36;
    const row = (y, scale, offs, list) => {
      const ww = tw * scale, hh = th * scale;
      const x0 = w / 2 - (list.length * ww) / 2 + offs;
      list.forEach((t, i) => mjTile(ctx, map.get(t), x0 + i * ww, y, ww, hh));
    };
    row(h * 0.12, 0.62, -tw * 0.4, back);
    row(h * 0.5, 1, tw * 0.1, front.slice(0, Math.floor(w / tw) + 1));
    vignette(ctx, w, h);
  },
  async minesweeper(ctx, w, h) {
    ctx.fillStyle = '#1e150d'; ctx.fillRect(0, 0, w, h);
    const s = Math.max(w, h) / 9;
    const open = new Set(['2,3', '3,3', '4,3', '2,4', '3,4', '4,4', '5,4', '3,5', '4,5', '5,5', '4,2', '5,3']);
    const nums = { '2,3': 1, '4,2': 2, '5,3': 1, '2,4': 1, '5,4': 2, '3,5': 1, '5,5': 3 };
    for (let r = -1; r < 8; r++) for (let c = -1; c < 11; c++) {
      const x = c * s + s * 0.3, y = r * s + s * 0.2, k = c + ',' + r;
      if (open.has(k)) {
        ctx.fillStyle = (c + r) % 2 ? '#e9e0cc' : '#efe7d4'; ctx.fillRect(x, y, s, s);
        if (nums[k]) { ctx.fillStyle = ['', '#2f62b5', '#2f7d45', '#b8382e'][nums[k]]; ctx.font = '700 ' + Math.round(s * 0.6) + 'px ' + serifFamily(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(nums[k]), x + s / 2, y + s * 0.54); }
      } else {
        const g = ctx.createLinearGradient(x, y, x, y + s); g.addColorStop(0, '#5b4a37'); g.addColorStop(1, '#3d3124');
        ctx.fillStyle = '#2a2118'; ctx.fillRect(x, y, s, s);
        ctx.beginPath(); ctx.roundRect(x + 1.5, y + 1.5, s - 3, s - 3, s * 0.12); ctx.fillStyle = g; ctx.fill();
        if (k === '6,4' || k === '3,2') {
          const u = s / 20, cx = x + s / 2, cy = y + s / 2;
          ctx.fillStyle = '#d9cdb3'; ctx.fillRect(cx - 5 * u, cy + 5 * u, 10 * u, 2 * u); ctx.fillRect(cx - 0.8 * u, cy - 6 * u, 1.6 * u, 12 * u);
          ctx.beginPath(); ctx.moveTo(cx + 0.8 * u, cy - 6.5 * u); ctx.lineTo(cx - 6.5 * u, cy - 3 * u); ctx.lineTo(cx + 0.8 * u, cy + 0.5 * u); ctx.fillStyle = '#c9443a'; ctx.fill();
        }
      }
    }
    vignette(ctx, w, h);
  },
  async g2048(ctx, w, h) {
    const img = await loadImage(asset('wood/walnut.jpg'));
    paintWood(ctx, img, 0, 0, w, h, 'rgba(20,12,6,0.55)');
    const s = Math.min(w, h * 1.3) / 3.4, gap = s * 0.1;
    const tiles = [[2048, '#6a1c1c', '#f6e2ab'], [1024, '#8e2f2a', '#f3dca2'], [512, '#a8812f', '#fff4d8'], [256, '#c19d4c', '#2e200a'], [64, '#b9653b', '#fbf1dc'], [8, '#e6c78e', '#4a361d']];
    const pos = [[1, 0.5], [0, 0.5], [2, 0.5], [1, 1.6], [0, 1.6], [2, 1.6]];
    const x0 = w / 2 - (s * 3 + gap * 2) / 2, y0 = h / 2 - s * 1.05;
    tiles.forEach(([v, bg, fg], i) => {
      const [c, r] = pos[i];
      const x = x0 + c * (s + gap), y = y0 + (r - 0.5) * (s + gap);
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = s * 0.12; ctx.shadowOffsetY = s * 0.05;
      ctx.beginPath(); ctx.roundRect(x, y, s, s, s * 0.1); ctx.fillStyle = bg; ctx.fill(); ctx.restore();
      const g = ctx.createLinearGradient(x, y, x, y + s); g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.12)');
      ctx.beginPath(); ctx.roundRect(x, y, s, s, s * 0.1); ctx.fillStyle = g; ctx.fill();
      if (v === 2048) { ctx.strokeStyle = 'rgba(232,211,160,0.75)'; ctx.lineWidth = Math.max(1.5, s * 0.03); ctx.stroke(); }
      ctx.fillStyle = fg; ctx.font = '700 ' + Math.round(s * (v >= 1000 ? 0.3 : 0.4)) + 'px ' + serifFamily(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(v), x + s / 2, y + s * 0.53);
    });
    vignette(ctx, w, h);
  },
};

export const serifFamily = () => getComputedStyle(document.body).getPropertyValue('--serif') || 'serif';
function feltGradient(ctx, w, h, [a, b, c]) {
  const g = ctx.createRadialGradient(w / 2, h * 0.35, 0, w / 2, h * 0.5, Math.max(w, h) * 0.8);
  g.addColorStop(0, a); g.addColorStop(0.55, b); g.addColorStop(1, c);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}
function vignette(ctx, w, h) {
  const v = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
}
function playingCard(ctx, img, x, y, cw, ch, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = ch * 0.08; ctx.shadowOffsetY = ch * 0.04;
  ctx.fillStyle = '#fbf9f3';
  ctx.beginPath(); ctx.roundRect(-cw / 2, -ch / 2, cw, ch, cw * 0.07); ctx.fill();
  ctx.shadowColor = 'transparent';
  const m = cw * 0.05;
  ctx.drawImage(img, -cw / 2 + m, -ch / 2 + m, cw - 2 * m, ch - 2 * m);
  ctx.restore();
}
function mjTile(ctx, img, x, y, tw, th) {
  const d = tw * 0.12, r = tw * 0.13;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = tw * 0.2; ctx.shadowOffsetY = tw * 0.08;
  ctx.beginPath(); ctx.roundRect(x + 1, y + d, tw - 2, th, r); ctx.fillStyle = '#1e6a44'; ctx.fill();
  ctx.restore();
  const g = ctx.createLinearGradient(x, y, x, y + th);
  g.addColorStop(0, '#fffdf6'); g.addColorStop(0.7, '#f1e9d5'); g.addColorStop(1, '#e6dcc3');
  ctx.beginPath(); ctx.roundRect(x + 1, y, tw - 2, th, r); ctx.fillStyle = g; ctx.fill();
  if (img) ctx.drawImage(img, x + tw * 0.08, y + th * 0.05, tw * 0.84, th * 0.9);
}

export async function paintCover(canvas, id) {
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(160, r.width), hh = Math.max(100, r.height);
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(hh * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  try { await COVERS[id](ctx, w, hh); } catch (e) { ctx.fillStyle = '#1a1714'; ctx.fillRect(0, 0, w, hh); }
}
