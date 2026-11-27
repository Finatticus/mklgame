// 西洋棋：FIDE 規則，白先。電腦為 Stockfish 19（WASM），以等級分限制分成五級。
import * as store from '../../store.js';
import * as audio from '../../audio.js';
import { h, fmt, toast, modal, confirmBox, fitCanvas } from '../../ui.js';
import { segmented, hero, stakeSummary, stakeOptions, defaultStake } from '../shared/setup.js';
import { woodImage, chessImages, chessSquares } from '../shared/draw.js';
import { replay, legalMoves, apply as applyMove, san as sanOf, uci, fromUci, inCheck, outcome, posKey, material, isWhite } from './rules.js';
import { Fish } from './engine.js';

const ID = 'chess', NAME = '西洋棋';

const LEVELS = {
  l1: { label: '入門', sub: '1350', title: '新手', mult: 0.5, elo: 1350, time: 400, desc: '等級分約 1350：懂基本戰術，常有失誤' },
  l2: { label: '初級', sub: '1600', title: '棋友', mult: 1, elo: 1600, time: 500, desc: '等級分約 1600：一般俱樂部棋手' },
  l3: { label: '中級', sub: '1900', title: '棋士', mult: 1.5, elo: 1900, time: 600, desc: '等級分約 1900：戰術扎實、少失誤' },
  l4: { label: '高級', sub: '2300', title: '高手', mult: 2.5, elo: 2300, time: 800, desc: '等級分約 2300：接近國際大師' },
  l5: { label: '大師', sub: '全力', title: 'Stockfish', mult: 4, elo: 0, time: 1500, desc: '不限制強度：遠超人類頂尖棋手' },
};

export const RULES = `
<h4>怎麼玩</h4>
<ul>
<li>白方先走，雙方輪流走一步。將死對方國王即獲勝。</li>
<li><strong>國王</strong>：任意方向一格。<strong>皇后</strong>：直線、斜線任意格。<strong>城堡</strong>：直線任意格。<strong>主教</strong>：斜線任意格。<strong>騎士</strong>：走 L 形，可越過棋子。</li>
<li><strong>兵</strong>：向前一格，第一步可走兩格，斜前方吃子；走到底線時升變為皇后、城堡、主教或騎士。</li>
<li><strong>入堡</strong>：國王與城堡都沒動過、中間無子、國王沒被將軍且經過的格子不受攻擊時，國王向城堡方向走兩格。</li>
<li><strong>吃過路兵</strong>：對方的兵一次走兩格停在你的兵旁邊時，下一手可以斜吃它。</li>
</ul>
<h4>和棋</h4>
<ul>
<li>輪到的一方沒有被將軍、卻無合法著法（逼和）。</li>
<li>同一局面出現三次、連續 50 步雙方都沒有吃子或動兵、或雙方子力都不足以將死。</li>
</ul>
<h4>操作</h4>
<ul>
<li>點自己的棋子會標出可走位置，再點目的地。手機預設需按「確認走棋」（可在「我的」關閉）。</li>
<li>狀態列以國際通用記譜顯示上一手（如 Nf3）。中途離開會保留對局。</li>
</ul>
<h4>遊戲幣</h4>
<table>
<tr><th>難度</th><th>對手</th><th>獲勝獎金</th></tr>
<tr><td>入門</td><td>約 1350 分</td><td>賭注 × 0.5</td></tr>
<tr><td>初級</td><td>約 1600 分</td><td>賭注 × 1</td></tr>
<tr><td>中級</td><td>約 1900 分</td><td>賭注 × 1.5</td></tr>
<tr><td>高級</td><td>約 2300 分</td><td>賭注 × 2.5</td></tr>
<tr><td>大師</td><td>全力</td><td>賭注 × 4</td></tr>
</table>
<p>開局先扣賭注。獲勝拿回賭注並加上獎金；落敗或認輸失去賭注；和棋退回賭注。</p>`;

const colorName = (c) => (c === 'w' ? '白' : '黑');
const PROMO = [{ label: '皇后', value: 'q', kind: 'gold' }, { label: '城堡', value: 'r' }, { label: '主教', value: 'b' }, { label: '騎士', value: 'n' }];

class ChessView {
  constructor(canvas, { flip, onPick }) {
    this.canvas = canvas; this.flip = flip; this.onPick = onPick;
    this.st = { b: new Array(128).fill(''), last: null, sel: -1, targets: [], pending: null, check: -1 };
    this.enabled = true;
    this.anim = null;
    Promise.all([woodImage('light'), woodImage('dark'), chessImages()]).then(([l, d, imgs]) => { this.light = l; this.dark = d; this.imgs = imgs; this.draw(); }).catch(() => {});
    this.ro = new ResizeObserver(() => this.draw());
    this.ro.observe(canvas);
    this._up = (e) => { if (!this.enabled) return; const s = this.pick(e); if (s >= 0 && this.onPick) this.onPick(s); };
    canvas.addEventListener('pointerup', this._up);
  }

  destroy() { this.ro.disconnect(); this.canvas.removeEventListener('pointerup', this._up); cancelAnimationFrame(this.raf); }

  xy(s, cell) { const f = s & 7, r = s >> 4; return this.flip ? [(7 - f) * cell, r * cell] : [f * cell, (7 - r) * cell]; }

  pick(e) {
    const rc = this.canvas.getBoundingClientRect(), cell = rc.width / 8;
    const c = Math.floor((e.clientX - rc.left) / cell), rr = Math.floor((e.clientY - rc.top) / cell);
    if (c < 0 || c > 7 || rr < 0 || rr > 7) return -1;
    return this.flip ? rr * 16 + (7 - c) : (7 - rr) * 16 + c;
  }

  set(patch) { Object.assign(this.st, patch); this.draw(); }

  animate(from, to, piece) {
    const t0 = performance.now(), dur = 170;
    cancelAnimationFrame(this.raf);
    const a = { from, to, piece, p: 0 };
    this.anim = a;
    const step = () => {
      if (this.anim !== a) return;
      const p = Math.min(1, (performance.now() - t0) / dur);
      a.p = 1 - (1 - p) * (1 - p);
      this.draw();
      if (p < 1) this.raf = requestAnimationFrame(step); else { this.anim = null; this.draw(); }
    };
    step();
  }

  piece(ctx, p, x, y, cell, alpha = 1) {
    const img = this.imgs && this.imgs[(isWhite(p) ? 'w' : 'b') + p.toLowerCase()];
    if (!img) return;
    const s = cell * 0.94;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = 'rgba(0,0,0,0.38)'; ctx.shadowBlur = cell * 0.06; ctx.shadowOffsetY = cell * 0.035;
    ctx.drawImage(img, x + (cell - s) / 2, y + (cell - s) / 2, s, s);
    ctx.restore();
  }

  draw() {
    const { ctx, w } = fitCanvas(this.canvas);
    if (w < 20) return;
    const cell = w / 8, st = this.st;
    ctx.clearRect(0, 0, w, w);
    if (this.light && this.dark) chessSquares(ctx, this.light, this.dark, 0, 0, cell, 8, 8);
    else { ctx.fillStyle = '#b58863'; ctx.fillRect(0, 0, w, w); }
    const tint = (s, color) => { const [x, y] = this.xy(s, cell); ctx.fillStyle = color; ctx.fillRect(x, y, cell, cell); };
    if (st.last) { tint(st.last.from, 'rgba(214,178,70,0.38)'); tint(st.last.to, 'rgba(214,178,70,0.5)'); }
    if (st.sel >= 0) tint(st.sel, 'rgba(110,160,70,0.55)');
    if (st.check >= 0) {
      const [x, y] = this.xy(st.check, cell);
      const g = ctx.createRadialGradient(x + cell / 2, y + cell / 2, cell * 0.1, x + cell / 2, y + cell / 2, cell * 0.72);
      g.addColorStop(0, 'rgba(230,30,20,0.95)'); g.addColorStop(0.5, 'rgba(200,20,10,0.55)'); g.addColorStop(1, 'rgba(160,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(x, y, cell, cell);
    }
    // 座標：檔字母在最下列、列數字在最左行
    ctx.font = `700 ${Math.max(9, Math.round(cell * 0.2))}px system-ui, sans-serif`;
    for (let i = 0; i < 8; i++) {
      const file = this.flip ? 7 - i : i, rank = this.flip ? i + 1 : 8 - i;
      const darkBottom = (i + 7) % 2 === 1, darkLeft = i % 2 === 1;
      ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      ctx.fillStyle = darkBottom ? 'rgba(240,222,190,0.85)' : 'rgba(70,42,20,0.8)';
      ctx.fillText('abcdefgh'[file], (i + 1) * cell - cell * 0.06, w - cell * 0.04);
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillStyle = darkLeft ? 'rgba(240,222,190,0.85)' : 'rgba(70,42,20,0.8)';
      ctx.fillText(String(rank), cell * 0.06, i * cell + cell * 0.05);
    }
    const hideTo = this.anim ? this.anim.to : -1, pendFrom = st.pending ? st.pending.from : -1;
    for (let s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; }
      const p = st.b[s];
      if (!p || s === hideTo) continue;
      if (st.pending && s === st.pending.to) continue;
      const [x, y] = this.xy(s, cell);
      this.piece(ctx, p, x, y, cell, s === pendFrom ? 0.35 : 1);
    }
    for (const t of st.targets) {
      const [x, y] = this.xy(t.to, cell);
      ctx.beginPath();
      if (st.b[t.to] || t.flag === 'ep') { ctx.arc(x + cell / 2, y + cell / 2, cell * 0.45, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(30,85,40,0.6)'; ctx.lineWidth = cell * 0.08; ctx.stroke(); }
      else { ctx.arc(x + cell / 2, y + cell / 2, cell * 0.15, 0, Math.PI * 2); ctx.fillStyle = 'rgba(30,85,40,0.55)'; ctx.fill(); }
    }
    if (st.pending) {
      const [x, y] = this.xy(st.pending.to, cell);
      const p = st.b[st.pending.from], q = st.pending.promo;
      this.piece(ctx, q ? (isWhite(p) ? q.toUpperCase() : q) : p, x, y, cell, 0.85);
      ctx.strokeStyle = 'rgba(190,40,30,0.95)'; ctx.lineWidth = Math.max(2, cell * 0.06);
      ctx.strokeRect(x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, cell - ctx.lineWidth, cell - ctx.lineWidth);
    }
    if (this.anim) {
      const [x0, y0] = this.xy(this.anim.from, cell), [x1, y1] = this.xy(this.anim.to, cell), p = this.anim.p;
      this.piece(ctx, this.anim.piece, x0 + (x1 - x0) * p, y0 + (y1 - y0) * p, cell);
    }
  }
}

export async function mount(root) {
  let alive = true, view = null, fish = null, game = null;
  const prefs = Object.assign({ level: 'l2', color: 'w', stake: 5000 }, store.getData().settings.chess || {});
  if (!LEVELS[prefs.level]) prefs.level = 'l2';

  function showSetup() {
    if (view) { view.destroy(); view = null; }
    if (fish) { fish.destroy(); fish = null; }
    game = null;
    const bal = store.balance();
    let stake = defaultStake(bal, prefs.stake);
    const summary = stakeSummary();
    const startBtn = h('button', { class: 'btn btn-gold btn-block' }, '開始對局');
    const levelOpt = segmented({
      label: '對手強度', hint: LEVELS[prefs.level].desc, value: prefs.level,
      options: Object.entries(LEVELS).map(([k, v]) => ({ value: k, label: v.label, sub: v.sub })),
      onChange: (v) => { prefs.level = v; levelOpt.setHint(LEVELS[v].desc); refresh(); },
    });
    const refresh = () => {
      summary.update(stake, Math.round(stake * LEVELS[prefs.level].mult));
      startBtn.disabled = !stake;
      startBtn.textContent = stake ? '開始對局' : '遊戲幣不足';
    };
    root.replaceChildren(h('div', { class: 'setup' },
      hero(ID, NAME, '白先黑後 · 將死國王者勝'),
      levelOpt,
      segmented({ label: '執子', hint: '白方先走', value: prefs.color, options: [{ value: 'w', label: '執白', sub: '先手' }, { value: 'b', label: '執黑', sub: '後手' }, { value: 'random', label: '隨機', sub: '猜先' }], onChange: (v) => { prefs.color = v; } }),
      segmented({ label: '賭注', hint: '餘額 ' + fmt(bal), numeric: true, value: stake, options: stakeOptions(bal), onChange: (v) => { stake = v; prefs.stake = v; refresh(); } }),
      summary, startBtn,
      !stake ? h('p', { class: 'login-note', style: 'text-align:center' }, '餘額低於 1,000 時，可回大廳領取補給金。') : null));
    refresh();
    startBtn.onclick = () => {
      if (!stake || !store.hold(ID, stake)) return toast('遊戲幣不足');
      store.setSetting('chess', { level: prefs.level, color: prefs.color, stake });
      audio.play('chips');
      const human = prefs.color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : prefs.color;
      startGame({ level: prefs.level, human, stake, moves: [] });
    };
  }

  function startGame(saved) {
    const r = replay(saved.moves);
    game = Object.assign({}, saved, { st: r.st, keys: r.keys, sans: r.sans, over: false, busy: false, sel: -1, pending: null, lastMove: null });
    if (saved.moves.length) { const prev = r.states[r.states.length - 2]; game.lastMove = fromUci(prev, saved.moves[saved.moves.length - 1]); }
    const lv = LEVELS[game.level], ai = game.human === 'w' ? 'b' : 'w';
    fish = new Fish();
    fish.init(lv.elo).catch(() => {});

    const canvas = h('canvas');
    const status = h('div', { class: 'match-status' });
    const caps = { w: h('div', { class: 'pstrip-caps' }), b: h('div', { class: 'pstrip-caps' }) };
    const strip = (name, sub, c) => h('div', { class: 'pstrip' }, h('i', { class: 'pstone ch-' + c }), h('div', { class: 'pstrip-name' }, h('b', null, name), h('span', null, sub)), caps[c]);
    const aiStrip = strip(lv.title, lv.label + ' · 執' + colorName(ai), ai);
    const meStrip = strip(store.getData().user, '你 · 執' + colorName(game.human), game.human);
    const resignBtn = h('button', { class: 'btn btn-danger', onClick: resign }, '認輸');
    const confirmBtn = h('button', { class: 'btn btn-gold', onClick: () => { if (game.pending) commit(game.pending); } }, '確認走棋');
    const actions = h('div', { class: 'match-actions' }, resignBtn, confirmBtn);
    const info = h('div', { class: 'match-info' }, '賭注 ', h('b', { class: 'num' }, fmt(game.stake)), '　勝 ', h('b', { class: 'num pos' }, '+' + fmt(Math.round(game.stake * lv.mult))));
    root.replaceChildren(h('div', { class: 'match' },
      h('div', { class: 'match-board' }, h('div', { class: 'board-frame' }, canvas)),
      h('div', { class: 'match-side' }, aiStrip, status, meStrip, info, actions)));

    const useConfirm = () => store.getData().settings.confirmMove !== false;
    const canPlay = () => game && !game.over && !game.busy && game.st.turn === game.human;

    view = new ChessView(canvas, {
      flip: game.human === 'b',
      onPick: async (s) => {
        if (!canPlay()) return;
        const st = game.st, p = st.b[s];
        if (game.pending && game.pending.to === s) { commit(game.pending); return; }
        if (p && (isWhite(p) ? 'w' : 'b') === game.human) { game.sel = game.sel === s ? -1 : s; game.pending = null; paint(); return; }
        if (game.sel >= 0) {
          const opts = legalMoves(st).filter((m) => m.from === game.sel && m.to === s);
          if (opts.length) {
            let mv = opts[0];
            if (opts.length > 1) {
              const q = await modal({ title: '升變', body: h('p', null, '兵走到底線，選擇要升變的棋子。'), actions: PROMO, center: true });
              if (!q || !alive || game.st !== st) return;
              mv = opts.find((m) => m.promo === q) || opts[0];
            }
            if (useConfirm()) { game.pending = mv; paint(); } else commit(mv);
            return;
          }
        }
        game.sel = -1; game.pending = null; paint();
      },
    });

    function paint() {
      const st = game.st;
      view.enabled = canPlay();
      const targets = game.sel >= 0 && !game.pending ? legalMoves(st).filter((m) => m.from === game.sel && (!m.promo || m.promo === 'q')) : [];
      const king = st.b.indexOf(st.turn === 'w' ? 'K' : 'k');
      view.set({ b: st.b, last: game.lastMove, sel: game.sel, targets, pending: game.pending, check: inCheck(st) ? king : -1 });
      aiStrip.classList.toggle('turn', !game.over && st.turn === ai);
      meStrip.classList.toggle('turn', !game.over && st.turn === game.human);
      const m = material(st.b), diff = m.w - m.b;
      caps.w.textContent = diff > 0 ? '+' + diff : '';
      caps.b.textContent = diff < 0 ? '+' + -diff : '';
      resignBtn.disabled = game.over || game.busy;
      confirmBtn.hidden = !useConfirm();
      confirmBtn.disabled = !canPlay() || !game.pending;
      if (!game.over) {
        const last = game.sans.length ? game.sans[game.sans.length - 1] : '';
        const head = game.busy ? lv.title + '思考中' : inCheck(st) ? '你被將軍了' : '輪到你';
        status.textContent = game.pending ? '確認走 ' + sanOf(st, game.pending) + '？' : head + (last ? ' · ' + (Math.ceil(game.sans.length / 2)) + (game.sans.length % 2 ? '. ' : '… ') + last : '');
      }
    }

    function apply(mv) {
      const st = game.st, piece = st.b[mv.from];
      const s = sanOf(st, mv);
      const next = applyMove(st, mv);
      game.sans.push(s);
      game.moves.push(uci(mv));
      game.st = next;
      game.keys.push(posKey(next));
      game.lastMove = mv;
      game.sel = -1; game.pending = null;
      audio.play(next.cap ? 'capture' : 'stone');
      view.animate(mv.from, mv.to, mv.promo ? (piece === 'P' ? mv.promo.toUpperCase() : mv.promo) : piece);
      store.saveGame(ID, { level: game.level, human: game.human, stake: game.stake, moves: game.moves });
      const r = outcome(next, game.keys);
      if (r) { finish(r.winner, r.reason); return true; }
      return false;
    }

    async function aiTurn() {
      game.busy = true;
      paint();
      const g = game;
      try {
        const t0 = performance.now();
        await fish.init(lv.elo);
        const best = await fish.best(g.moves, lv.time);
        const wait = 450 - (performance.now() - t0);
        if (wait > 0) await new Promise((ok) => setTimeout(ok, wait));
        if (!alive || game !== g || g.over) return;
        const mv = fromUci(g.st, best);
        if (!mv) throw new Error('引擎回傳了不合法的走法');
        g.busy = false;
        if (!apply(mv)) paint();
      } catch (e) {
        g.busy = false;
        status.textContent = 'AI 發生問題：' + e.message;
      }
    }

    function commit(mv) {
      if (!canPlay()) return;
      if (!apply(mv)) aiTurn();
    }

    async function resign() {
      if (game.over) return;
      if (!(await confirmBox('認輸', '確定要認輸嗎？會失去賭注 ' + fmt(game.stake) + '。', '認輸', '繼續下', 'danger'))) return;
      if (!game.over) finish(ai, '認輸', true);
    }

    function finish(winner, reason, resigned = false) {
      const g = game;
      g.over = true; g.busy = false; g.sel = -1; g.pending = null;
      const result = !winner ? 'draw' : winner === g.human ? 'win' : 'lose';
      const profit = Math.round(g.stake * lv.mult);
      const payout = result === 'win' ? g.stake + profit : result === 'draw' ? g.stake : 0;
      const desc = resigned ? '你認輸' : !winner ? reason : colorName(winner) + '方勝 · ' + reason;
      const note = '執' + colorName(g.human) + ' · ' + desc + ' · ' + Math.ceil(g.moves.length / 2) + ' 回合';
      const ev = store.settle(ID, { gameName: NAME, mode: lv.label, result, payout, note, marks: result === 'win' && g.level === 'l5' ? { chessMasterWins: 1 } : null });
      paint();
      const headline = result === 'win' ? '你贏了' : result === 'lose' ? '你輸了' : '和棋';
      status.textContent = headline + ' · ' + (resigned ? '認輸' : reason);
      actions.replaceChildren(h('button', { class: 'btn', onClick: () => { location.hash = '#/'; } }, '回大廳'), h('button', { class: 'btn btn-gold', onClick: showSetup }, '再來一局'));
      setTimeout(() => {
        if (!alive) return;
        audio.chime(result === 'win' ? 'win' : result === 'lose' ? 'lose' : 'draw');
        if (result === 'win') audio.play('payout');
        modal({
          title: headline, center: true,
          body: h('div', null, h('div', { class: 'result-figure ' + (ev.delta > 0 ? 'pos' : ev.delta < 0 ? 'neg' : '') }, (ev.delta > 0 ? '+' : ev.delta < 0 ? '−' : '') + fmt(Math.abs(ev.delta))),
            h('div', { class: 'result-lines' },
              h('div', null, h('span', null, '結果'), h('span', null, desc)),
              h('div', null, h('span', null, '對手'), h('span', null, lv.title + '（' + lv.label + '）')),
              h('div', null, h('span', null, '結算後餘額'), h('span', null, fmt(ev.balance))))),
          actions: [{ label: '看棋盤', value: 'view' }, { label: '再來一局', value: 'again', kind: 'gold' }],
        }).then((v) => { if (v === 'again' && alive) showSetup(); });
      }, 700);
    }

    paint();
    audio.preload('stone', 'capture');
    if (game.st.turn === ai) aiTurn();
  }

  const saved = store.loadGame(ID);
  let resumed = false;
  if (saved && store.heldAmount(ID) > 0 && LEVELS[saved.level]) { try { startGame(saved); resumed = true; } catch (e) { resumed = false; } }
  if (!resumed) { store.release(ID); showSetup(); }

  return () => { alive = false; if (view) view.destroy(); if (fish) fish.destroy(); };
}
