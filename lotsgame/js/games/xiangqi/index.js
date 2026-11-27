// 象棋：亞洲象棋規則，紅先。電腦為迭代加深 alpha-beta 搜尋，五級強度。
import * as store from '../../store.js';
import * as audio from '../../audio.js';
import { h, fmt, toast, modal, confirmBox, fitCanvas } from '../../ui.js';
import { segmented, hero, stakeSummary, stakeOptions, defaultStake } from '../shared/setup.js';
import { woodImage, paintWood, drawXq, xqLines, serifFamily, XQ_FACE } from '../shared/draw.js';
import { Position, RED, BLACK, sideOf, typeOf, xOf, yOf, sqOf, moveName, moveToIccs, iccsToMove, adjudicate } from './engine.js';

const ID = 'xiangqi', NAME = '象棋';

const LEVELS = {
  l1: { label: '入門', sub: '看兩步', title: '新手', mult: 0.5, desc: '會吃子、會躲將，但看得淺' },
  l2: { label: '初級', sub: '看四步', title: '棋友', mult: 1, desc: '懂基本戰術，偶爾走緩' },
  l3: { label: '中級', sub: '快棋', title: '棋士', mult: 1.5, desc: '每步約 0.6 秒，算到七、八步' },
  l4: { label: '高級', sub: '深算', title: '高手', mult: 2.5, desc: '每步約 2 秒，很少失誤' },
  l5: { label: '大師', sub: '全力', title: '大師', mult: 4, desc: '每步約 5 秒，全力計算' },
};

export const RULES = `
<h4>怎麼玩</h4>
<ul>
<li>紅方先走，雙方輪流走一步。將死對方的帥（將），或讓對方無棋可走（困斃），就獲勝。</li>
<li><strong>帥將</strong>：只在九宮內直走一格，雙方帥將不能在同一直線上直接照面。</li>
<li><strong>仕士</strong>：九宮內斜走一格。<strong>相象</strong>：斜走兩格（田字），不能過河，田字中心有子時不能走（塞象眼）。</li>
<li><strong>傌馬</strong>：走日字，緊鄰的直線方向有子時不能走（蹩馬腿）。<strong>俥車</strong>：直線任意格。</li>
<li><strong>炮砲</strong>：移動同俥，吃子時必須隔一個子（炮架）。<strong>兵卒</strong>：未過河只能前進一格，過河後可前進或左右一格，不能後退。</li>
</ul>
<h4>和棋與禁著</h4>
<ul>
<li>同一局面出現三次時：一方每步都在將軍（長將）判負；一方每步都在捉對方無保護的子或用小子捉大子（長捉）判負；其餘情形和棋。</li>
<li>連續 60 回合沒有吃子，或雙方都沒有能過河攻擊的子時，和棋。</li>
</ul>
<h4>操作</h4>
<ul>
<li>點自己的棋子，會標出可以走的位置；再點目的地。手機預設需按「確認走棋」（可在「我的」關閉）。</li>
<li>棋盤下方的數字是路數，狀態列顯示中文棋譜（如「炮二平五」）。中途離開會保留對局。</li>
</ul>
<h4>遊戲幣</h4>
<table>
<tr><th>難度</th><th>對手</th><th>獲勝獎金</th></tr>
<tr><td>入門</td><td>看兩步</td><td>賭注 × 0.5</td></tr>
<tr><td>初級</td><td>看四步</td><td>賭注 × 1</td></tr>
<tr><td>中級</td><td>每步 0.6 秒</td><td>賭注 × 1.5</td></tr>
<tr><td>高級</td><td>每步 2 秒</td><td>賭注 × 2.5</td></tr>
<tr><td>大師</td><td>每步 5 秒</td><td>賭注 × 4</td></tr>
</table>
<p>開局先扣賭注。獲勝拿回賭注並加上獎金；落敗或認輸失去賭注；和棋退回賭注。</p>`;

const sideName = (s) => (s === RED ? '紅' : '黑');

// ---------- 棋盤 ----------
class XqView {
  constructor(canvas, { flip, onPick }) {
    this.canvas = canvas; this.flip = flip; this.onPick = onPick;
    this.st = { board: new Uint8Array(256), last: 0, sel: 0, targets: [], pending: 0, check: 0 };
    this.anim = null;
    this.enabled = true;
    this.img = null;
    woodImage('xiangqi').then((img) => { this.img = img; this.draw(); }).catch(() => {});
    document.fonts.load('700 20px ' + serifFamily(), XQ_FACE.flat().join('') + '楚河漢界').then(() => this.draw()).catch(() => {});
    this.ro = new ResizeObserver(() => this.draw());
    this.ro.observe(canvas);
    this._up = (e) => { if (!this.enabled) return; const s = this.pick(e); if (s && this.onPick) this.onPick(s); };
    canvas.addEventListener('pointerup', this._up);
  }

  destroy() { this.ro.disconnect(); this.canvas.removeEventListener('pointerup', this._up); cancelAnimationFrame(this.raf); }

  geom(w, h) {
    const cell = Math.min(w / 9.6, h / 10.6);
    return { cell, ox: (w - 8 * cell) / 2, oy: (h - 9 * cell) / 2 };
  }

  P(x, y, g) { const fx = this.flip ? 8 - x : x, fy = this.flip ? 9 - y : y; return [g.ox + fx * g.cell, g.oy + fy * g.cell]; }
  sqXY(sq, g) { return this.P(xOf(sq), yOf(sq), g); }

  pick(e) {
    const r = this.canvas.getBoundingClientRect();
    const g = this.geom(r.width, r.height);
    const fx = Math.round((e.clientX - r.left - g.ox) / g.cell), fy = Math.round((e.clientY - r.top - g.oy) / g.cell);
    if (fx < 0 || fx > 8 || fy < 0 || fy > 9) return 0;
    return sqOf(this.flip ? 8 - fx : fx, this.flip ? 9 - fy : fy);
  }

  set(patch) { Object.assign(this.st, patch); this.draw(); }

  // 走子動畫
  animate(mv, pc) {
    const t0 = performance.now(), dur = 170;
    cancelAnimationFrame(this.raf);
    const a = { mv, pc, p: 0 };
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

  draw() {
    const { ctx, w, h, dpr } = fitCanvas(this.canvas);
    if (w < 20) return;
    const g = this.geom(w, h), { cell } = g, st = this.st;
    ctx.clearRect(0, 0, w, h);
    if (this.img) paintWood(ctx, this.img, 0, 0, w, h); else { ctx.fillStyle = '#c98f58'; ctx.fillRect(0, 0, w, h); }
    const P = (x, y) => this.P(x, y, g);
    xqLines(ctx, P, cell, { flip: this.flip });

    // 路數
    ctx.font = `600 ${Math.max(9, Math.round(cell * 0.24))}px ${serifFamily()}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(60,32,12,0.62)';
    const CN = '一二三四五六七八九', FW = '１２３４５６７８９';
    for (let x = 0; x < 9; x++) {
      const [rx, ry] = P(x, 9), [bx, by] = P(x, 0);
      ctx.fillText(CN[8 - x], rx, ry + (this.flip ? -1 : 1) * cell * 0.66);
      ctx.fillText(FW[x], bx, by + (this.flip ? 1 : -1) * cell * 0.66);
    }

    // 上一手：起點與落點的角標
    const corner = (sq, color) => {
      const [x, y] = this.sqXY(sq, g), a = cell * 0.47, s = cell * 0.15;
      ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.5, cell * 0.05);
      ctx.beginPath();
      for (const dx of [-1, 1]) for (const dy of [-1, 1]) {
        ctx.moveTo(x + dx * a, y + dy * (a - s)); ctx.lineTo(x + dx * a, y + dy * a); ctx.lineTo(x + dx * (a - s), y + dy * a);
      }
      ctx.stroke();
    };
    if (st.last) { corner(st.last & 255, 'rgba(30,70,150,0.75)'); corner(st.last >> 8, 'rgba(30,70,150,0.95)'); }

    const r = cell * 0.45;
    const animSrc = this.anim ? this.anim.mv & 255 : 0, animDst = this.anim ? this.anim.mv >> 8 : 0;
    const pendSrc = st.pending ? st.pending & 255 : 0;
    for (let s = 51; s <= 203; s++) {
      const pc = st.board[s];
      if (!pc || s === animDst) continue;
      const [x, y] = this.sqXY(s, g);
      if (s === st.check) {
        const gl = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 1.45);
        gl.addColorStop(0, 'rgba(220,40,25,0.75)'); gl.addColorStop(1, 'rgba(220,40,25,0)');
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, r * 1.45, 0, Math.PI * 2); ctx.fill();
      }
      const lifted = s === st.sel && !st.pending;
      drawXq(ctx, sideOf(pc), typeOf(pc), x, y - (lifted ? r * 0.12 : 0), lifted ? r * 1.06 : r, dpr, s === pendSrc ? 0.35 : 1);
    }
    if (this.anim) {
      const [x0, y0] = this.sqXY(animSrc, g), [x1, y1] = this.sqXY(animDst, g), p = this.anim.p;
      drawXq(ctx, sideOf(this.anim.pc), typeOf(this.anim.pc), x0 + (x1 - x0) * p, y0 + (y1 - y0) * p, r, dpr);
    }
    // 選取與可走位置
    if (st.sel) {
      const [x, y] = this.sqXY(st.sel, g);
      ctx.beginPath(); ctx.arc(x, y - (st.pending ? 0 : r * 0.12), r * 1.12, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(230,190,90,0.95)'; ctx.lineWidth = Math.max(2, cell * 0.06); ctx.stroke();
    }
    for (const d of st.targets) {
      const [x, y] = this.sqXY(d, g);
      if (st.board[d]) { ctx.beginPath(); ctx.arc(x, y, r * 1.08, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(20,110,70,0.9)'; ctx.lineWidth = Math.max(2, cell * 0.07); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(x, y, cell * 0.12, 0, Math.PI * 2); ctx.fillStyle = 'rgba(20,100,62,0.82)'; ctx.fill(); }
    }
    if (st.pending) {
      const [x, y] = this.sqXY(st.pending >> 8, g), pc = st.board[st.pending & 255];
      drawXq(ctx, sideOf(pc), typeOf(pc), x, y, r, dpr, 0.85);
      ctx.beginPath(); ctx.arc(x, y, r * 1.14, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(190,40,30,0.95)'; ctx.lineWidth = Math.max(2, cell * 0.06); ctx.stroke();
    }
  }
}

// ---------- 對局 ----------
export async function mount(root) {
  let alive = true, view = null, worker = null, game = null, seq = 0;
  const waiting = new Map();
  const prefs = Object.assign({ level: 'l2', color: 'red', stake: 5000 }, store.getData().settings.xiangqi || {});
  if (!LEVELS[prefs.level]) prefs.level = 'l2';

  function ask(payload) {
    if (!worker) {
      worker = new Worker(new URL('./ai-worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = (e) => { const p = waiting.get(e.data.id); if (!p) return; waiting.delete(e.data.id); e.data.error ? p.reject(new Error(e.data.error)) : p.resolve(e.data.result); };
      worker.onerror = (e) => { for (const p of waiting.values()) p.reject(new Error(e.message || 'AI 載入失敗')); waiting.clear(); };
    }
    return new Promise((resolve, reject) => { const id = ++seq; waiting.set(id, { resolve, reject }); worker.postMessage({ id, payload }); });
  }

  function showSetup() {
    if (view) { view.destroy(); view = null; }
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
      hero(ID, NAME, '紅先黑後 · 將死對方者勝'),
      levelOpt,
      segmented({ label: '執子', hint: '紅方先走', value: prefs.color, options: [{ value: 'red', label: '執紅', sub: '先手' }, { value: 'black', label: '執黑', sub: '後手' }, { value: 'random', label: '隨機', sub: '猜先' }], onChange: (v) => { prefs.color = v; } }),
      segmented({ label: '賭注', hint: '餘額 ' + fmt(bal), numeric: true, value: stake, options: stakeOptions(bal), onChange: (v) => { stake = v; prefs.stake = v; refresh(); } }),
      summary, startBtn,
      !stake ? h('p', { class: 'login-note', style: 'text-align:center' }, '餘額低於 1,000 時，可回大廳領取補給金。') : null));
    refresh();
    startBtn.onclick = () => {
      if (!stake || !store.hold(ID, stake)) return toast('遊戲幣不足');
      store.setSetting('xiangqi', { level: prefs.level, color: prefs.color, stake });
      audio.play('chips');
      const human = prefs.color === 'random' ? (Math.random() < 0.5 ? RED : BLACK) : prefs.color === 'red' ? RED : BLACK;
      startGame({ level: prefs.level, human, stake, moves: [] });
    };
  }

  function startGame(saved) {
    const pos = new Position();
    const names = [];
    const captured = [[], []]; // 各方吃到的子
    for (const s of saved.moves) {
      const mv = iccsToMove(s);
      names.push(moveName(pos, mv));
      const cap = pos.sq[mv >> 8];
      if (cap) captured[pos.side].push(cap);
      pos.make(mv);
    }
    game = Object.assign({}, saved, { pos, names, captured, over: false, busy: false, sel: 0, pending: 0 });
    const lv = LEVELS[game.level], ai = game.human ^ 1;

    const canvas = h('canvas');
    const status = h('div', { class: 'match-status' });
    const caps = [h('div', { class: 'pstrip-caps xq-caps' }), h('div', { class: 'pstrip-caps xq-caps' })];
    const strip = (name, sub, side) => h('div', { class: 'pstrip' }, h('i', { class: 'pstone xq-' + (side === RED ? 'r' : 'b') }, XQ_FACE[side][0]), h('div', { class: 'pstrip-name' }, h('b', null, name), h('span', null, sub)), caps[side]);
    const aiStrip = strip(lv.title, lv.label + ' · 執' + sideName(ai), ai);
    const meStrip = strip(store.getData().user, '你 · 執' + sideName(game.human), game.human);
    const resignBtn = h('button', { class: 'btn btn-danger', onClick: resign }, '認輸');
    const confirmBtn = h('button', { class: 'btn btn-gold', onClick: () => { if (game.pending) commit(game.pending); } }, '確認走棋');
    const actions = h('div', { class: 'match-actions' }, resignBtn, confirmBtn);
    const info = h('div', { class: 'match-info' }, '賭注 ', h('b', { class: 'num' }, fmt(game.stake)), '　勝 ', h('b', { class: 'num pos' }, '+' + fmt(Math.round(game.stake * lv.mult))));
    root.replaceChildren(h('div', { class: 'match xq' },
      h('div', { class: 'match-board' }, h('div', { class: 'board-frame' }, canvas)),
      h('div', { class: 'match-side' }, aiStrip, status, meStrip, info, actions)));

    const useConfirm = () => store.getData().settings.confirmMove !== false;
    const canPlay = () => game && !game.over && !game.busy && game.pos.side === game.human;
    const legal = () => game.pos.legalMoves();

    view = new XqView(canvas, {
      flip: game.human === BLACK,
      onPick: (s) => {
        if (!canPlay()) return;
        const pos = game.pos, pc = pos.sq[s];
        if (game.pending && (game.pending >> 8) === s) { commit(game.pending); return; }
        if (pc && sideOf(pc) === game.human) {
          game.sel = game.sel === s ? 0 : s; game.pending = 0; paint(); return;
        }
        if (game.sel) {
          const mv = game.sel | (s << 8);
          if (legal().includes(mv)) {
            if (useConfirm()) { game.pending = mv; paint(); } else commit(mv);
            return;
          }
        }
        game.sel = 0; game.pending = 0; paint();
      },
    });

    function kingInCheck() {
      const pos = game.pos;
      return pos.inCheck ? pos.king[pos.side] : 0;
    }

    function paint() {
      const pos = game.pos;
      view.enabled = canPlay();
      const targets = game.sel && !game.pending ? legal().filter((m) => (m & 255) === game.sel).map((m) => m >> 8) : [];
      view.set({ board: pos.sq, last: pos.mvs.length ? pos.mvs[pos.mvs.length - 1] : 0, sel: game.sel, targets, pending: game.pending, check: kingInCheck() });
      aiStrip.classList.toggle('turn', !game.over && pos.side === ai);
      meStrip.classList.toggle('turn', !game.over && pos.side === game.human);
      for (const s of [RED, BLACK]) {
        const list = game.captured[s].map((pc) => XQ_FACE[sideOf(pc)][typeOf(pc)]);
        caps[s].textContent = list.length > 6 ? '…' + list.slice(-6).join('') : list.join('');
        caps[s].classList.toggle('red', s === BLACK); // 黑方吃到的是紅子
      }
      resignBtn.disabled = game.over || game.busy;
      confirmBtn.hidden = !useConfirm();
      confirmBtn.disabled = !canPlay() || !game.pending;
      if (!game.over) {
        const lastName = game.names.length ? game.names[game.names.length - 1] : '';
        const head = game.busy ? lv.title + '思考中' : pos.inCheck ? '你被將軍了' : '輪到你';
        status.textContent = game.pending ? '確認走 ' + moveName(pos, game.pending) + '？' : head + (lastName ? ' · ' + lastName : '');
      }
    }

    // 回傳 true 表示對局結束
    function apply(mv) {
      const pos = game.pos, pc = pos.sq[mv & 255], cap = pos.sq[mv >> 8];
      game.names.push(moveName(pos, mv));
      if (cap) game.captured[pos.side].push(cap);
      pos.make(mv);
      game.moves.push(moveToIccs(mv));
      game.sel = 0; game.pending = 0;
      audio.play(cap ? 'capture' : 'stone');
      view.animate(mv, pc);
      store.saveGame(ID, { level: game.level, human: game.human, stake: game.stake, moves: game.moves });
      const r = adjudicate(pos.mvs);
      if (r) { finish(r.winner, r.reason); return true; }
      return false;
    }

    async function aiTurn() {
      game.busy = true;
      paint();
      const g = game;
      try {
        const t0 = performance.now();
        const r = await ask({ moves: g.moves, level: g.level });
        const wait = 450 - (performance.now() - t0);
        if (wait > 0) await new Promise((ok) => setTimeout(ok, wait));
        if (!alive || game !== g || g.over) return;
        g.busy = false;
        if (!apply(iccsToMove(r.move))) paint();
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
      g.over = true; g.busy = false; g.sel = 0; g.pending = 0;
      const result = winner === -1 ? 'draw' : winner === g.human ? 'win' : 'lose';
      const profit = Math.round(g.stake * lv.mult);
      const payout = result === 'win' ? g.stake + profit : result === 'draw' ? g.stake : 0;
      const plies = g.moves.length;
      const desc = resigned ? '你認輸' : winner === -1 ? reason : (sideName(winner) + '方勝 · ' + reason);
      const note = '執' + sideName(g.human) + ' · ' + desc + ' · ' + Math.ceil(plies / 2) + ' 回合';
      const ev = store.settle(ID, { gameName: NAME, mode: lv.label, result, payout, note, marks: result === 'win' && g.level === 'l5' ? { xqMasterWins: 1 } : null });
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
    if (game.pos.side === ai) aiTurn();
  }

  const saved = store.loadGame(ID);
  if (saved && store.heldAmount(ID) > 0 && LEVELS[saved.level]) startGame(saved); else { store.release(ID); showSetup(); }

  return () => { alive = false; if (view) view.destroy(); if (worker) worker.terminate(); };
}

