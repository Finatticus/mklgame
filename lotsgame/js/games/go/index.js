// 圍棋：與 KataGo 神經網路對弈。
import * as store from '../../store.js';
import * as audio from '../../audio.js';
import { h, fmt, toast, modal, confirmBox } from '../../ui.js';
import { BoardView } from '../shared/boardview.js';
import { segmented, hero, stakeSummary, stakeOptions, defaultStake } from '../shared/setup.js';
import { BLACK, WHITE, PASS, newPosition, playPosition } from './rules.js';

const ID = 'go', NAME = '圍棋';

const LEVELS = {
  easy: { label: '入門', sub: '級位水準', title: '棋童', mult: 1, desc: '棋形正常但有緩著，適合初學' },
  mid: { label: '進階', sub: '業餘段位', title: '棋士', mult: 1.5, desc: '會計算、破綻少，約業餘段位' },
  hard: { label: '高段', sub: '業餘高段以上', title: '名人', mult: 3, desc: 'KataGo 主力網路，高段也難取勝' },
};
const KOMI = { 9: 7, 13: 7.5, 19: 7.5 };

export const RULES = `
<h4>怎麼玩</h4>
<ul>
<li>黑棋先下，雙方輪流在交叉點落子。</li>
<li>棋子四周相連的空點叫「氣」，氣被對方堵光就會被提走。</li>
<li>不能下在沒有氣又提不到子的地方，也不能立刻提回剛被提的劫。</li>
<li>覺得沒有地方可下時按「虛手」。雙方連續虛手，對局結束並自動數子。</li>
</ul>
<h4>操作</h4>
<ul>
<li>手機：點一下交叉點出現預覽子，再點一次同位置或按「確認落子」。可在「我的」關閉落子確認。</li>
<li>電腦：滑鼠移到交叉點會出現預覽，點擊落子。</li>
<li>中途離開對局會保留，回來可以接著下。</li>
</ul>
<h4>勝負判定</h4>
<p>採中國規則數子：活棋與圍住的空點都算自己的。白棋貼目 7.5 目（9 路為 7 目，可能和棋）。終局時由 AI 判定死活並標出雙方領地。也可以按「認輸」提前結束。</p>
<h4>遊戲幣</h4>
<table>
<tr><th>難度</th><th>對手</th><th>獲勝獎金</th></tr>
<tr><td>入門</td><td>級位水準</td><td>賭注 × 1</td></tr>
<tr><td>進階</td><td>業餘段位</td><td>賭注 × 1.5</td></tr>
<tr><td>高段</td><td>業餘高段以上</td><td>賭注 × 3</td></tr>
</table>
<p>開局時先扣賭注。獲勝拿回賭注並加上獎金；落敗或認輸失去賭注；和棋退回賭注。</p>`;

class Engine {
  constructor() {
    this.worker = new Worker(new URL('./engine-worker.js', import.meta.url), { type: 'module' });
    this.seq = 0;
    this.pending = new Map();
    this.worker.onmessage = (e) => {
      const p = this.pending.get(e.data.id);
      if (!p) return;
      if (e.data.progress != null) { p.onProgress && p.onProgress(e.data.progress); return; }
      this.pending.delete(e.data.id);
      if (e.data.error) p.reject(new Error(e.data.error)); else p.resolve(e.data.result);
    };
    this.worker.onerror = (e) => { for (const p of this.pending.values()) p.reject(new Error(e.message || '引擎錯誤')); this.pending.clear(); };
  }
  call(type, payload, onProgress) {
    return new Promise((resolve, reject) => { const id = ++this.seq; this.pending.set(id, { resolve, reject, onProgress }); this.worker.postMessage({ id, type, payload }); });
  }
  destroy() { this.worker.terminate(); this.pending.clear(); }
}

export async function mount(root) {
  let engine = null;
  let view = null;
  let alive = true;
  let game = null; // { size, level, human, stake, komi, moves, pos, caps:{1,2}, over, busy }
  const prefs = Object.assign({ size: 9, level: 'easy', color: 'black', stake: 5000 }, store.getData().settings.go || {});

  const getEngine = () => engine || (engine = new Engine());

  // ---------------- 開局設定 ----------------
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
      hero(ID, NAME, '與神經網路對弈 · 中國規則數子'),
      segmented({ label: '棋盤', hint: '白棋貼目 7.5（9 路 7 目）', value: prefs.size, options: [{ value: 9, label: '9 路', sub: '約 5 分鐘' }, { value: 13, label: '13 路', sub: '約 15 分鐘' }, { value: 19, label: '19 路', sub: '正式對局' }], onChange: (v) => { prefs.size = v; } }),
      levelOpt,
      segmented({ label: '執子', hint: '黑棋先行', value: prefs.color, options: [{ value: 'black', label: '執黑' }, { value: 'white', label: '執白' }, { value: 'random', label: '猜先' }], onChange: (v) => { prefs.color = v; } }),
      segmented({ label: '賭注', hint: '餘額 ' + fmt(bal), numeric: true, value: stake, options: stakeOptions(bal), onChange: (v) => { stake = v; prefs.stake = v; refresh(); } }),
      summary, startBtn,
      !stake ? h('p', { class: 'login-note', style: 'text-align:center' }, '餘額低於 1,000 時，可回大廳領取補給金。') : null));
    refresh();
    startBtn.onclick = () => {
      if (!stake || !store.hold(ID, stake)) return toast('遊戲幣不足');
      store.setSetting('go', { size: prefs.size, level: prefs.level, color: prefs.color, stake });
      audio.play('chips');
      const human = prefs.color === 'random' ? (Math.random() < 0.5 ? BLACK : WHITE) : prefs.color === 'black' ? BLACK : WHITE;
      startGame({ size: prefs.size, level: prefs.level, human, stake, komi: KOMI[prefs.size], moves: [] });
    };
  }

  // ---------------- 對局 ----------------
  function startGame(saved) {
    game = Object.assign({}, saved, { pos: newPosition(saved.size, saved.komi), caps: { 1: 0, 2: 0 }, over: false, busy: false, ghost: -1 });
    for (const m of saved.moves) { const col = game.pos.toPlay; game.pos = playPosition(game.pos, m); game.caps[col] += game.pos.captured.length; }
    const lv = LEVELS[game.level];
    const ai = 3 - game.human;
    const colorName = (c) => (c === BLACK ? '黑' : '白');

    const canvas = h('canvas');
    const overlay = h('div', { class: 'board-overlay', hidden: true });
    const status = h('div', { class: 'match-status' });
    const strip = (name, sub, color) => {
      const caps = h('span', { class: 'pstrip-caps' });
      const el = h('div', { class: 'pstrip' }, h('i', { class: 'pstone ' + (color === BLACK ? 'b' : 'w') }), h('div', { class: 'pstrip-name' }, h('b', null, name), h('span', null, sub)), caps);
      el.caps = caps;
      return el;
    };
    const aiStrip = strip(lv.title, lv.label + ' · 執' + colorName(ai), ai);
    const meStrip = strip(store.getData().user, '你 · 執' + colorName(game.human), game.human);
    const passBtn = h('button', { class: 'btn', onClick: () => humanMove(PASS) }, '虛手');
    const resignBtn = h('button', { class: 'btn btn-danger', onClick: resign }, '認輸');
    const confirmBtn = h('button', { class: 'btn btn-gold', onClick: () => { if (game.ghost >= 0) humanMove(game.ghost); } }, '確認落子');
    const actions = h('div', { class: 'match-actions' }, passBtn, resignBtn, confirmBtn);
    const info = h('div', { class: 'match-info' }, '賭注 ', h('b', { class: 'num' }, fmt(game.stake)), '　勝 ', h('b', { class: 'num pos' }, '+' + fmt(Math.round(game.stake * lv.mult))), '　貼目 ', h('b', { class: 'num' }, String(game.komi)));

    root.replaceChildren(h('div', { class: 'match' },
      h('div', { class: 'match-board' }, h('div', { class: 'board-frame' }, canvas, overlay)),
      h('div', { class: 'match-side' }, aiStrip, status, meStrip, info, actions)));

    const useConfirm = () => store.getData().settings.confirmMove !== false;
    view = new BoardView(canvas, {
      size: game.size, wood: 'go',
      onPick: (i) => {
        if (!canHumanPlay()) return;
        if (!game.pos.board.isLegal(i, game.human)) { if (game.pos.board.c[i] === 0) toast(i === game.pos.board.ko ? '打劫：要先在別處下一手' : '這裡不能落子（沒有氣）'); return; }
        if (useConfirm() && game.ghost !== i) { game.ghost = i; paint(); return; }
        humanMove(i);
      },
      onHover: (i) => {
        if (useConfirm()) return;
        const ok = i >= 0 && canHumanPlay() && game.pos.board.isLegal(i, game.human);
        view.set({ ghost: ok ? { idx: i, color: game.human } : null });
      },
    });

    const canHumanPlay = () => game && !game.over && !game.busy && game.pos.toPlay === game.human;

    function paint() {
      const last = game.moves.length && game.moves[game.moves.length - 1] !== PASS ? game.moves[game.moves.length - 1] : -1;
      view.enabled = canHumanPlay();
      view.set({ stones: game.pos.board.c, last, ghost: game.ghost >= 0 ? { idx: game.ghost, color: game.human, firm: true } : null });
      aiStrip.caps.textContent = '提子 ' + game.caps[ai];
      meStrip.caps.textContent = '提子 ' + game.caps[game.human];
      aiStrip.classList.toggle('turn', !game.over && game.pos.toPlay === ai);
      meStrip.classList.toggle('turn', !game.over && game.pos.toPlay === game.human);
      const myTurn = canHumanPlay();
      passBtn.disabled = !myTurn;
      resignBtn.disabled = game.over || game.busy;
      confirmBtn.hidden = !useConfirm();
      confirmBtn.disabled = !myTurn || game.ghost < 0;
      if (!game.over) {
        const lastPass = game.moves.length && game.moves[game.moves.length - 1] === PASS;
        status.textContent = game.busy ? lv.title + '思考中…' : (lastPass ? lv.title + '虛手了。' : '') + '輪到你，第 ' + (game.moves.length + 1) + ' 手';
      }
    }

    function persist() {
      store.saveGame(ID, { size: game.size, level: game.level, human: game.human, stake: game.stake, komi: game.komi, moves: game.moves });
    }

    function apply(move) {
      const col = game.pos.toPlay;
      game.pos = playPosition(game.pos, move);
      game.moves.push(move);
      game.caps[col] += game.pos.captured.length;
      game.ghost = -1;
      if (move !== PASS) { audio.play('stone'); if (game.pos.captured.length) setTimeout(() => audio.play('capture', { volume: 0.6 }), 90); }
      persist();
      const n = game.moves.length;
      return n >= 2 && game.moves[n - 1] === PASS && game.moves[n - 2] === PASS;
    }

    async function ensureReady() {
      overlay.hidden = false;
      overlay.textContent = game.level === 'hard' ? '準備高段引擎…（首次需下載 53 MB，之後離線可用）' : '準備引擎…';
      try {
        await getEngine().call('load', { level: game.level }, (p) => { overlay.textContent = '下載棋力引擎 ' + Math.round(p * 100) + '%'; });
      } finally { overlay.hidden = true; }
    }

    async function aiTurn() {
      game.busy = true;
      paint();
      const g = game;
      try {
        const t0 = performance.now();
        const r = await getEngine().call('genmove', { size: g.size, komi: g.komi, moves: g.moves, level: g.level });
        const wait = 550 - (performance.now() - t0);
        if (wait > 0) await new Promise((ok) => setTimeout(ok, wait));
        if (!alive || game !== g || g.over) return;
        g.busy = false;
        if (r.resign) return finish({ winner: g.human, reason: 'ai-resign' });
        const ended = apply(r.move);
        if (ended) return endByPasses();
        paint();
      } catch (e) {
        if (!alive || game !== g) return;
        g.busy = false;
        paint();
        status.textContent = '引擎發生問題：' + e.message;
        const retry = await confirmBox('引擎沒有回應', '可能是網路中斷導致引擎尚未下載完成。要再試一次嗎？', '重試', '稍後再說');
        if (retry && alive && game === g) aiTurn();
      }
    }

    function humanMove(move) {
      if (!canHumanPlay()) return;
      const ended = apply(move);
      if (ended) return endByPasses();
      aiTurn();
    }

    async function resign() {
      if (game.over) return;
      if (!(await confirmBox('認輸', '確定要認輸嗎？會失去賭注 ' + fmt(game.stake) + '。', '認輸', '繼續下', 'danger'))) return;
      if (!game.over) finish({ winner: ai, reason: 'resign' });
    }

    async function endByPasses() {
      game.busy = true;
      paint();
      status.textContent = '雙方虛手，數子中…';
      try {
        const sc = await getEngine().call('score', { size: game.size, komi: game.komi, moves: game.moves, level: game.level });
        if (!alive) return;
        view.set({ owner: sc.owner, dead: new Set(sc.dead), ghost: null });
        finish({ winner: sc.diff > 0 ? BLACK : sc.diff < 0 ? WHITE : 0, reason: 'score', score: sc });
      } catch (e) {
        game.busy = false;
        status.textContent = '數子失敗：' + e.message;
      }
    }

    function finish({ winner, reason, score }) {
      const g = game;
      g.over = true;
      g.busy = false;
      const result = winner === 0 ? 'draw' : winner === g.human ? 'win' : 'lose';
      const profit = Math.round(g.stake * lv.mult);
      const payout = result === 'win' ? g.stake + profit : result === 'draw' ? g.stake : 0;
      let note = g.size + ' 路 · 執' + colorName(g.human) + ' · ';
      if (reason === 'resign') note += '認輸';
      else if (reason === 'ai-resign') note += '對手認輸';
      else note += score.diff === 0 ? '和棋' : colorName(winner) + '勝 ' + Math.abs(score.diff) + ' 目';
      const humanMoves = g.moves.filter((m, i) => m !== PASS && (i % 2 === 0) === (g.human === BLACK)).length;
      const ev = store.settle(ID, { gameName: NAME, mode: lv.label, result, payout, note, marks: Object.assign({ goMoves: humanMoves }, result === 'win' && g.level === 'hard' ? { goHardWins: 1 } : {}) });
      audio.chime(result === 'win' ? 'win' : result === 'lose' ? 'lose' : 'draw');
      if (result === 'win') audio.play('payout');
      paint();
      const headline = result === 'win' ? '你贏了' : result === 'lose' ? '你輸了' : '和棋';
      status.textContent = headline + ' · ' + note.split(' · ').pop();
      actions.replaceChildren(h('button', { class: 'btn', onClick: () => { location.hash = '#/'; } }, '回大廳'), h('button', { class: 'btn btn-gold', onClick: showSetup }, '再來一局'));
      const lines = h('div', { class: 'result-lines' });
      if (score) lines.append(
        h('div', null, h('span', null, '黑棋（子＋地）'), h('span', null, score.black + ' 目')),
        h('div', null, h('span', null, '白棋（子＋地）＋貼目'), h('span', null, score.white + ' ＋ ' + g.komi + ' 目')));
      else lines.append(h('div', null, h('span', null, '結束方式'), h('span', null, reason === 'resign' ? '你認輸' : lv.title + '認輸')));
      lines.append(
        h('div', null, h('span', null, '對手'), h('span', null, lv.title + '（' + lv.label + '）')),
        h('div', null, h('span', null, '結算後餘額'), h('span', null, fmt(ev.balance))));
      modal({
        title: headline, center: true,
        body: h('div', null, h('div', { class: 'result-figure ' + (ev.delta > 0 ? 'pos' : ev.delta < 0 ? 'neg' : '') }, (ev.delta > 0 ? '+' : ev.delta < 0 ? '−' : '') + fmt(Math.abs(ev.delta))), lines),
        actions: [{ label: '看棋盤', value: 'view' }, { label: '再來一局', value: 'again', kind: 'gold' }],
      }).then((v) => { if (v === 'again' && alive) showSetup(); });
    }

    paint();
    audio.preload('stone', 'capture');
    ensureReady().then(() => { if (alive && game && !game.over && game.pos.toPlay === ai) aiTurn(); else if (alive) paint(); })
      .catch((e) => { status.textContent = '引擎載入失敗（' + e.message + '），請連上網路後重新進入。'; });
  }

  const saved = store.loadGame(ID);
  if (saved && store.heldAmount(ID) > 0) startGame(saved); else { store.release(ID); showSetup(); }

  return () => { alive = false; if (view) view.destroy(); if (engine) engine.destroy(); };
}
