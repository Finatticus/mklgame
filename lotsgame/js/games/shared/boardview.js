// 交叉點棋盤（圍棋、五子棋共用）：木紋、格線、棋子、最後一手標記、預覽子、領地標示。
import { fitCanvas } from '../../ui.js';
import { drawStone, woodImage, paintWood } from './draw.js';

const STARS = {
  9: [[2, 2], [6, 2], [4, 4], [2, 6], [6, 6]],
  13: [[3, 3], [9, 3], [6, 6], [3, 9], [9, 9]],
  15: [[3, 3], [11, 3], [7, 7], [3, 11], [11, 11]],
  19: [[3, 3], [9, 3], [15, 3], [3, 9], [9, 9], [15, 9], [3, 15], [9, 15], [15, 15]],
};
const LETTERS = 'ABCDEFGHJKLMNOPQRST';

export class BoardView {
  constructor(canvas, { size, wood = 'go', lineColor = 'rgba(40,27,12,0.88)', onPick, onHover }) {
    this.canvas = canvas;
    this.size = size;
    this.wood = wood;
    this.lineColor = lineColor;
    this.onPick = onPick;
    this.onHover = onHover;
    this.state = { stones: new Int8Array(size * size), last: -1, ghost: null, owner: null, dead: null, line: null };
    this.img = null;
    this.enabled = true;
    woodImage(wood).then((img) => { this.img = img; this.draw(); }).catch(() => {});
    this.ro = new ResizeObserver(() => this.draw());
    this.ro.observe(canvas);
    this._up = (e) => { if (!this.enabled) return; const i = this.pick(e); if (i >= 0 && this.onPick) this.onPick(i); };
    this._move = (e) => { if (e.pointerType !== 'mouse' || !this.onHover) return; this.onHover(this.enabled ? this.pick(e) : -1); };
    this._leave = () => { if (this.onHover) this.onHover(-1); };
    canvas.addEventListener('pointerup', this._up);
    canvas.addEventListener('pointermove', this._move);
    canvas.addEventListener('pointerleave', this._leave);
  }

  destroy() {
    this.ro.disconnect();
    this.canvas.removeEventListener('pointerup', this._up);
    this.canvas.removeEventListener('pointermove', this._move);
    this.canvas.removeEventListener('pointerleave', this._leave);
  }

  geom(w) {
    const n = this.size;
    const cell = w / (n - 1 + 1.5);
    return { cell, m: cell * 0.75 };
  }

  pick(e) {
    const r = this.canvas.getBoundingClientRect();
    const { cell, m } = this.geom(r.width);
    const x = Math.round((e.clientX - r.left - m) / cell), y = Math.round((e.clientY - r.top - m) / cell);
    if (x < 0 || y < 0 || x >= this.size || y >= this.size) return -1;
    return y * this.size + x;
  }

  set(patch) { Object.assign(this.state, patch); this.draw(); }

  draw() {
    const { ctx, w, h, dpr } = fitCanvas(this.canvas);
    if (w < 20) return;
    const n = this.size, st = this.state;
    const { cell, m } = this.geom(w);
    const P = (i) => [m + (i % n) * cell, m + ((i / n) | 0) * cell];
    ctx.clearRect(0, 0, w, h);
    if (this.img) paintWood(ctx, this.img, 0, 0, w, h);
    else { ctx.fillStyle = this.wood === 'go' ? '#d9b572' : '#c98f58'; ctx.fillRect(0, 0, w, h); }

    // 格線
    const lw = Math.max(0.7, Math.min(1.4, cell * 0.035));
    ctx.strokeStyle = this.lineColor;
    ctx.lineWidth = lw;
    ctx.beginPath();
    const end = m + (n - 1) * cell;
    for (let i = 0; i < n; i++) {
      const p = Math.round((m + i * cell) * dpr) / dpr;
      ctx.moveTo(p, m); ctx.lineTo(p, end);
      ctx.moveTo(m, p); ctx.lineTo(end, p);
    }
    ctx.stroke();
    ctx.lineWidth = lw * 1.9;
    ctx.strokeRect(m, m, end - m, end - m);
    ctx.fillStyle = this.lineColor;
    for (const [sx, sy] of STARS[n] || []) { ctx.beginPath(); ctx.arc(m + sx * cell, m + sy * cell, Math.max(1.6, cell * 0.1), 0, Math.PI * 2); ctx.fill(); }

    // 座標（格子夠大才顯示）
    if (cell >= 25) {
      ctx.fillStyle = 'rgba(50,34,16,0.6)';
      ctx.font = '600 ' + Math.round(cell * 0.3) + 'px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let i = 0; i < n; i++) {
        ctx.fillText(LETTERS[i], m + i * cell, m * 0.3);
        ctx.fillText(String(n - i), m * 0.3, m + i * cell);
      }
    }

    const r = cell * 0.485;
    const dead = st.dead;
    for (let i = 0; i < n * n; i++) {
      const c = st.stones[i];
      if (!c) continue;
      const [x, y] = P(i);
      drawStone(ctx, c, x, y, r, dpr, dead && dead.has(i) ? 0.45 : 1);
    }

    // 連線（五子棋勝利線）
    if (st.line && st.line.length) {
      const [x1, y1] = P(st.line[0]), [x2, y2] = P(st.line[st.line.length - 1]);
      ctx.save();
      ctx.strokeStyle = 'rgba(214,60,40,0.9)'; ctx.lineWidth = Math.max(2.5, cell * 0.12); ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 4;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.restore();
    }

    // 最後一手
    if (st.last >= 0 && st.stones[st.last]) {
      const [x, y] = P(st.last);
      ctx.beginPath(); ctx.arc(x, y, r * 0.42, 0, Math.PI * 2);
      ctx.strokeStyle = st.stones[st.last] === 1 ? 'rgba(255,255,255,0.9)' : 'rgba(20,20,20,0.85)';
      ctx.lineWidth = Math.max(1.3, r * 0.14); ctx.stroke();
    }

    // 預覽子
    if (st.ghost && st.ghost.idx >= 0 && !st.stones[st.ghost.idx]) {
      const [x, y] = P(st.ghost.idx);
      drawStone(ctx, st.ghost.color, x, y, r, dpr, st.ghost.firm ? 0.78 : 0.45);
      if (st.ghost.firm) {
        ctx.beginPath(); ctx.arc(x, y, r * 1.18, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(190,40,30,0.9)'; ctx.lineWidth = Math.max(1.5, r * 0.12); ctx.stroke();
      }
    }

    // 領地
    if (st.owner) {
      const s = Math.max(3, cell * 0.26);
      for (let i = 0; i < n * n; i++) {
        const o = st.owner[i];
        if (!o) continue;
        if (st.stones[i] === o && !(dead && dead.has(i))) continue;
        const [x, y] = P(i);
        ctx.fillStyle = o === 1 ? 'rgba(12,12,12,0.9)' : 'rgba(250,248,240,0.95)';
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
        ctx.strokeStyle = o === 1 ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.8;
        ctx.strokeRect(x - s / 2, y - s / 2, s, s);
      }
    }
  }
}
