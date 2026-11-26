// 五子棋：15 路，自由規則（五子或以上連線即勝）。
import * as store from '../../store.js';
import * as audio from '../../audio.js';
import { h, fmt, toast, modal, confirmBox } from '../../ui.js';
import { BoardView } from '../shared/boardview.js';
import { segmented, hero, stakeSummary, stakeOptions, defaultStake } from '../shared/setup.js';

const ID = 'gomoku', NAME = '五子棋', N = 15;

const LEVELS = {
  easy: { label: '初級', sub: '會擋會連', title: '學徒', mult: 1, desc: '會擋四、會做三，但看得不深' },
  mid: { label: '中級', sub: '算到四步', title: '棋手', mult: 1.5, desc: '會算連續沖四，失誤很少' },
  hard: { label: '高級', sub: '深度搜尋', title: '宗師', mult: 2.5, desc: '深度搜尋，會預先化解殺棋' },
};

export const RULES = `
<h4>怎麼玩</h4>
<ul>
<li>15 × 15 棋盤，黑棋先下，雙方輪流在交叉點落子。</li>
<li>先在橫、直、斜任一方向連成<strong>五子或以上</strong>的一方獲勝。</li>
<li>棋盤下滿仍無人連五則為和棋。採自由規則，沒有禁手。</li>
</ul>
<h4>操作</h4>
<ul>
<li>手機：點一下交叉點出現預覽子，再點一次同位置或按「確認落子」。</li>
<li>電腦：滑鼠移到交叉點會出現預覽，點擊落子。</li>
<li>中途離開對局會保留，回來可以接著下。</li>
</ul>
<h4>遊戲幣</h4>
<table>
<tr><th>難度</th><th>對手</th><th>獲勝獎金</th></tr>
<tr><td>初級</td><td>看得不深</td><td>賭注 × 1</td></tr>
<tr><td>中級</td><td>會算殺棋</td><td>賭注 × 1.5</td></tr>
<tr><td>高級</td><td>深度搜尋</td><td>賭注 × 2.5</td></tr>
</table>
<p>開局時先扣賭注。獲勝拿回賭注並加上獎金；落敗或認輸失去賭注；和棋退回賭注。黑棋先手較有利，想挑戰可以選執白。</p>`;

function winningLine(stones, last) {
  const c = stones[last];
  if (!c) return null;
  const x = last % N, y = (last / N) | 0;
  for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
    const line = [last];
    for (const s of [1, -1]) {
      let nx = x + dx * s, ny = y + dy * s;
      while (nx >= 0 && nx < N && ny >= 0 && ny < N && stones[ny * N + nx] === c) { if (s === 1) line.push(ny * N + nx); else line.unshift(ny * N + nx); nx += dx * s; ny += dy * s; }
    }
    if (line.length >= 5) return line;
  }
  return null;
}

export async function mount(root) {
  let alive = true, view = null, worker = null, game = null, seq = 0;
  const waiting = new Map();
  const prefs = Object.assign({ level: 'easy', color: 'black', stake: 5000 }, store.getData().settings.gomoku || {});

  function ask(payload) {
    if (!worker) {
      worker = new Worker(new URL('./ai-worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = (e) => { const p = waiting.get(e.data.id); if (!p) return; waiting.delete(e.data.id); e.data.error ? p.reject(new Error(e.data.error)) : p.resolve(e.data.result); };
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
      label: '對手難度', hint: LEVELS[prefs.level].desc, value: prefs.level,
      options: Object.entries(LEVELS).map(([k, v]) => ({ value: k, label: v.label, sub: v.sub })),
      onChange: (v) => { prefs.level = v; levelOpt.setHint(LEVELS[v].desc); refresh(); },
    });
    const refresh = () => {
      summary.update(stake, Math.round(stake * LEVELS[prefs.level].mult));
      startBtn.disabled = !stake;
      startBtn.textContent = stake ? '開始對局' : '遊戲幣不足';
    };
    root.replaceChildren(h('div', { class: 'setup' },
      hero(ID, NAME, '15 路 · 先連成五子者勝'),
      levelOpt,
      segmented({ label: '執子', hint: '黑棋先行', value: prefs.color, options: [{ value: 'black', label: '執黑', sub: '先手' }, { value: 'white', label: '執白', sub: '後手' }, { value: 'random', label: '猜先', sub: '隨機' }], onChange: (v) => { prefs.color = v; } }),
      segmented({ label: '賭注', hint: '餘額 ' + fmt(bal), numeric: true, value: stake, options: stakeOptions(bal), onChange: (v) => { stake = v; prefs.stake = v; refresh(); } }),
      summary, startBtn,
      !stake ? h('p', { class: 'login-note', style: 'text-align:center' }, '餘額低於 1,000 時，可回大廳領取補給金。') : null));
    refresh();
    startBtn.onclick = () => {
      if (!stake || !store.hold(ID, stake)) return toast('遊戲幣不足');
      store.setSetting('gomoku', { level: prefs.level, color: prefs.color, stake });
      audio.play('chips');
      const human = prefs.color === 'random' ? (Math.random() < 0.5 ? 1 : 2) : prefs.color === 'black' ? 1 : 2;
      startGame({ level: prefs.level, human, stake, moves: [] });
    };
  }

  function startGame(saved) {
    game = Object.assign({}, saved, { stones: new Int8Array(N * N), over: false, busy: false, ghost: -1 });
    saved.moves.forEach((m, k) => { game.stones[m] = (k % 2) + 1; });
    const lv = LEVELS[game.level], ai = 3 - game.human;
    const colorName = (c) => (c === 1 ? '黑' : '白');
    const toPlay = () => (game.moves.length % 2) + 1;

    const canvas = h('canvas');
    const status = h('div', { class: 'match-status' });
    const strip = (name, sub, color) => h('div', { class: 'pstrip' }, h('i', { class: 'pstone ' + (color === 1 ? 'b' : 'w') }), h('div', { class: 'pstrip-name' }, h('b', null, name), h('span', null, sub)));
    const aiStrip = strip(lv.title, lv.label + ' · 執' + colorName(ai), ai);
    const meStrip = strip(store.getData().user, '你 · 執' + colorName(game.human), game.human);
    const resignBtn = h('button', { class: 'btn btn-danger', onClick: resign }, '認輸');
    const confirmBtn = h('button', { class: 'btn btn-gold', onClick: () => { if (game.ghost >= 0) humanMove(game.ghost); } }, '確認落子');
    const actions = h('div', { class: 'match-actions' }, resignBtn, confirmBtn);
    const info = h('div', { class: 'match-info' }, '賭注 ', h('b', { class: 'num' }, fmt(game.stake)), '　勝 ', h('b', { class: 'num pos' }, '+' + fmt(Math.round(game.stake * lv.mult))));
    root.replaceChildren(h('div', { class: 'match' },
      h('div', { class: 'match-board' }, h('div', { class: 'board-frame' }, canvas)),
      h('div', { class: 'match-side' }, aiStrip, status, meStrip, info, actions)));

    const useConfirm = () => store.getData().settings.confirmMove !== false;
    const canPlay = () => game && !game.over && !game.busy && toPlay() === game.human;
    view = new BoardView(canvas, {
      size: N, wood: 'gomoku', lineColor: 'rgba(52,24,10,0.85)',
      onPick: (i) => {
        if (!canPlay() || game.stones[i]) return;
        if (useConfirm() && game.ghost !== i) { game.ghost = i; paint(); return; }
        humanMove(i);
      },
      onHover: (i) => { if (!useConfirm()) view.set({ ghost: i >= 0 && canPlay() && !game.stones[i] ? { idx: i, color: game.human } : null }); },
    });

    function paint() {
      view.enabled = canPlay();
      view.set({ stones: game.stones, last: game.moves.length ? game.moves[game.moves.length - 1] : -1, ghost: game.ghost >= 0 ? { idx: game.ghost, color: game.human, firm: true } : null });
      aiStrip.classList.toggle('turn', !game.over && toPlay() === ai);
      meStrip.classList.toggle('turn', !game.over && toPlay() === game.human);
      resignBtn.disabled = game.over || game.busy;
      confirmBtn.hidden = !useConfirm();
      confirmBtn.disabled = !canPlay() || game.ghost < 0;
      if (!game.over) status.textContent = game.busy ? lv.title + '思考中…' : '輪到你，第 ' + (game.moves.length + 1) + ' 手';
    }

    // 回傳 true 表示對局結束
    function apply(i) {
      const c = toPlay();
      game.stones[i] = c;
      game.moves.push(i);
      game.ghost = -1;
      audio.play('stone');
      store.saveGame(ID, { level: game.level, human: game.human, stake: game.stake, moves: game.moves });
      const line = winningLine(game.stones, i);
      if (line) { finish(c, line); return true; }
      if (game.moves.length >= N * N) { finish(0, null); return true; }
      return false;
    }

    async function aiTurn() {
      game.busy = true;
      paint();
      const g = game;
      try {
        const t0 = performance.now();
        const r = await ask({ moves: g.moves, level: g.level });
        const wait = 500 - (performance.now() - t0);
        if (wait > 0) await new Promise((ok) => setTimeout(ok, wait));
        if (!alive || game !== g || g.over) return;
        g.busy = false;
        if (!apply(r.move)) paint();
      } catch (e) {
        g.busy = false;
        status.textContent = 'AI 發生問題：' + e.message;
      }
    }

    function humanMove(i) {
      if (!canPlay()) return;
      if (!apply(i)) aiTurn();
    }

    async function resign() {
      if (game.over) return;
      if (!(await confirmBox('認輸', '確定要認輸嗎？會失去賭注 ' + fmt(game.stake) + '。', '認輸', '繼續下', 'danger'))) return;
      if (!game.over) finish(ai, null, true);
    }

    function finish(winner, line, resigned = false) {
      const g = game;
      g.over = true;
      g.busy = false;
      const result = winner === 0 ? 'draw' : winner === g.human ? 'win' : 'lose';
      const profit = Math.round(g.stake * lv.mult);
      const payout = result === 'win' ? g.stake + profit : result === 'draw' ? g.stake : 0;
      const note = '執' + colorName(g.human) + ' · ' + (resigned ? '認輸' : winner === 0 ? '和棋' : colorName(winner) + '棋連五 · 共 ' + g.moves.length + ' 手');
      const ev = store.settle(ID, { gameName: NAME, mode: lv.label, result, payout, note, marks: result === 'win' && g.level === 'hard' ? { gomokuHardWins: 1 } : null });
      paint();
      if (line) view.set({ line });
      const headline = result === 'win' ? '你贏了' : result === 'lose' ? '你輸了' : '和棋';
      status.textContent = headline + ' · ' + note.split(' · ').slice(1).join(' · ');
      actions.replaceChildren(h('button', { class: 'btn', onClick: () => { location.hash = '#/'; } }, '回大廳'), h('button', { class: 'btn btn-gold', onClick: showSetup }, '再來一局'));
      setTimeout(() => {
        if (!alive) return;
        audio.chime(result === 'win' ? 'win' : result === 'lose' ? 'lose' : 'draw');
        if (result === 'win') audio.play('payout');
        modal({
          title: headline, center: true,
          body: h('div', null, h('div', { class: 'result-figure ' + (ev.delta > 0 ? 'pos' : ev.delta < 0 ? 'neg' : '') }, (ev.delta > 0 ? '+' : ev.delta < 0 ? '−' : '') + fmt(Math.abs(ev.delta))),
            h('div', { class: 'result-lines' },
              h('div', null, h('span', null, '結果'), h('span', null, resigned ? '你認輸' : winner === 0 ? '棋盤下滿' : colorName(winner) + '棋連成五子')),
              h('div', null, h('span', null, '對手'), h('span', null, lv.title + '（' + lv.label + '）')),
              h('div', null, h('span', null, '結算後餘額'), h('span', null, fmt(ev.balance))))),
          actions: [{ label: '看棋盤', value: 'view' }, { label: '再來一局', value: 'again', kind: 'gold' }],
        }).then((v) => { if (v === 'again' && alive) showSetup(); });
      }, line ? 900 : 100);
    }

    paint();
    audio.preload('stone');
    if (toPlay() === ai) aiTurn();
  }

  const saved = store.loadGame(ID);
  if (saved && store.heldAmount(ID) > 0) startGame(saved); else { store.release(ID); showSetup(); }

  return () => { alive = false; if (view) view.destroy(); if (worker) worker.terminate(); };
}
