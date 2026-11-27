// 2048：4 × 4 盤面，滑動合併相同數字。依最大方塊決定返還倍數。
import * as store from '../../store.js';
import * as audio from '../../audio.js';
import { h, fmt, toast, modal, confirmBox } from '../../ui.js';
import { segmented, hero, stakeSummary, stakeOptions, defaultStake } from '../shared/setup.js';

const ID = 'g2048', NAME = '2048', N = 4;
// 最大方塊 → 返還倍數（含本金）
const LADDER = [[256, 0.5], [512, 1], [1024, 2], [2048, 4], [4096, 8], [8192, 16]];
const returnOf = (max) => { let m = 0; for (const [v, x] of LADDER) if (max >= v) m = x; return m; };

export const RULES = `
<h4>怎麼玩</h4>
<ul>
<li>往上、下、左、右滑動，所有方塊會一起往那個方向移動。</li>
<li>兩塊相同數字碰在一起會合併成兩倍（2 + 2 = 4、4 + 4 = 8…）。一次滑動中，每塊最多合併一次。</li>
<li>每滑動一次，空格中會隨機出現一塊 2（九成）或 4（一成）。</li>
<li>盤面滿了而且沒有任何方向可以合併時，遊戲結束。</li>
</ul>
<h4>操作</h4>
<ul>
<li>手機：在盤面上滑動。電腦：方向鍵或 W A S D。</li>
<li>合出 2048 之後可以繼續玩，挑戰更大的方塊。</li>
<li>中途離開會保留盤面，回來可以接著玩；也可以隨時按「結算」提前結束。</li>
</ul>
<h4>遊戲幣</h4>
<p>開局先扣賭注，結束時依合出的<strong>最大方塊</strong>返還：</p>
<table>
<tr><th>最大方塊</th><th>返還</th><th>下 1,000 拿回</th></tr>
<tr><td>128 以下</td><td>0</td><td>0</td></tr>
${LADDER.map(([v, x]) => `<tr><td>${v}${v === 8192 ? ' 以上' : ''}</td><td>賭注 × ${x}</td><td>${fmt(1000 * x)}</td></tr>`).join('')}
</table>
<p>返還多於賭注算贏，剛好拿回算和，少於賭注算輸。</p>`;

export async function mount(root) {
  let alive = true, G = null, cleanup = null;
  const prefs = Object.assign({ stake: 1000, best: 0, bestTile: 0 }, store.getData().settings.g2048 || {});
  const savePrefs = () => store.setSetting('g2048', { stake: prefs.stake, best: prefs.best, bestTile: prefs.bestTile });

  function showSetup() {
    if (cleanup) { cleanup(); cleanup = null; }
    G = null;
    const bal = store.balance();
    let stake = defaultStake(bal, prefs.stake);
    const ladder = h('div', { class: 'g48-ladder' });
    const startBtn = h('button', { class: 'btn btn-gold btn-block' }, '開始');
    const refresh = () => {
      ladder.replaceChildren(...LADDER.map(([v, x]) => h('div', { class: x > 1 ? 'up' : x === 1 ? 'even' : '' }, h('small', null, String(v)), h('b', null, fmt(stake * x)))));
      startBtn.disabled = !stake;
      startBtn.textContent = stake ? '開始' : '遊戲幣不足';
    };
    root.replaceChildren(h('div', { class: 'setup' },
      hero(ID, NAME, '合出越大的方塊，拿回越多' + (prefs.bestTile ? ' · 最佳 ' + prefs.bestTile : '')),
      segmented({ label: '賭注', hint: '餘額 ' + fmt(bal), numeric: true, value: stake, options: stakeOptions(bal), onChange: (v) => { stake = v; prefs.stake = v; refresh(); } }),
      h('div', { class: 'opt-label', style: 'margin-top:18px' }, h('span', null, '最大方塊與返還'), h('em', null, '128 以下全輸')),
      ladder, startBtn,
      !stake ? h('p', { class: 'login-note', style: 'text-align:center' }, '餘額低於 1,000 時，可回大廳領取補給金。') : null));
    refresh();
    startBtn.onclick = () => {
      if (!stake || !store.hold(ID, stake)) return toast('遊戲幣不足');
      savePrefs();
      audio.play('chips');
      startGame({ stake, cells: null, score: 0, moves: 0 });
    };
  }

  function startGame(saved) {
    let seq = 0;
    G = { stake: saved.stake, score: saved.score, moves: saved.moves, over: false, busy: false, tiles: [] };
    const boardEl = h('div', { class: 'g48-board' }, Array.from({ length: N * N }, () => h('div', { class: 'g48-cell' })));
    const scoreEl = h('b', { class: 'num' }), bestEl = h('b', { class: 'num' }), maxEl = h('b', { class: 'num' }), payEl = h('b', { class: 'num' });
    const status = h('div', { class: 'match-status' });
    const endBtn = h('button', { class: 'btn', onClick: cashOut }, '結算');
    const actions = h('div', { class: 'match-actions' }, endBtn);
    root.replaceChildren(h('div', { class: 'g48' },
      h('div', { class: 'g48-top' },
        h('div', null, h('small', null, '分數'), scoreEl),
        h('div', null, h('small', null, '最高分'), bestEl),
        h('div', null, h('small', null, '最大方塊'), maxEl),
        h('div', null, h('small', null, '目前可拿回'), payEl)),
      h('div', { class: 'g48-wrap' }, boardEl),
      status, actions));

    const tileEl = (t) => {
      const el = h('div', { class: 'g48-tile' }, h('span'));
      t.el = el;
      boardEl.append(el);
      paintTile(t);
      return el;
    };
    function paintTile(t) {
      t.el.style.setProperty('--r', t.r);
      t.el.style.setProperty('--c', t.c);
      t.el.dataset.v = t.v > 8192 ? 'big' : t.v;
      t.el.firstChild.textContent = t.v;
      t.el.classList.toggle('d4', t.v >= 1000);
      t.el.classList.toggle('d5', t.v >= 10000);
    }
    const maxTile = () => G.tiles.reduce((m, t) => Math.max(m, t.v), 0);
    function spawn() {
      const free = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!G.tiles.some((t) => t.r === r && t.c === c)) free.push([r, c]);
      if (!free.length) return;
      const [r, c] = free[(Math.random() * free.length) | 0];
      const t = { id: ++seq, v: Math.random() < 0.9 ? 2 : 4, r, c };
      G.tiles.push(t);
      tileEl(t).classList.add('new');
    }
    function canMove() {
      const g = grid();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if (!g[r][c]) return true;
        if (c + 1 < N && g[r][c + 1] && g[r][c + 1].v === g[r][c].v) return true;
        if (r + 1 < N && g[r + 1][c] && g[r + 1][c].v === g[r][c].v) return true;
      }
      return false;
    }
    function grid() {
      const g = Array.from({ length: N }, () => Array(N).fill(null));
      for (const t of G.tiles) g[t.r][t.c] = t;
      return g;
    }
    function hud() {
      const mx = maxTile();
      if (G.score > prefs.best) prefs.best = G.score;
      scoreEl.textContent = fmt(G.score);
      bestEl.textContent = fmt(prefs.best);
      maxEl.textContent = String(mx);
      payEl.textContent = fmt(G.stake * returnOf(mx));
      payEl.className = 'num ' + (returnOf(mx) > 1 ? 'pos' : returnOf(mx) < 1 ? 'neg' : '');
      const next = LADDER.find(([v]) => v > mx);
      if (!G.over) status.textContent = next ? '合出 ' + next[0] + ' 可拿回 ' + fmt(G.stake * next[1]) : '已達最高返還 × 16';
    }
    function save() {
      store.saveGame(ID, { stake: G.stake, score: G.score, moves: G.moves, cells: G.tiles.map((t) => [t.r, t.c, t.v]) });
    }

    // dir: 0 上 1 右 2 下 3 左
    function move(dir) {
      if (G.over || G.busy) return;
      const vec = [[-1, 0], [0, 1], [1, 0], [0, -1]][dir];
      const g = grid();
      const order = [0, 1, 2, 3];
      const rows = vec[0] === 1 ? order.slice().reverse() : order;
      const cols = vec[1] === 1 ? order.slice().reverse() : order;
      let moved = false, gained = 0;
      const merged = new Set(), dying = [];
      for (const r of rows) for (const c of cols) {
        const t = g[r][c];
        if (!t) continue;
        let nr = r, nc = c;
        while (true) {
          const rr = nr + vec[0], cc = nc + vec[1];
          if (rr < 0 || rr >= N || cc < 0 || cc >= N) break;
          const o = g[rr][cc];
          if (!o) { nr = rr; nc = cc; continue; }
          if (o.v === t.v && !merged.has(o.id)) {
            g[r][c] = null;
            t.r = rr; t.c = cc;
            o.v *= 2; gained += o.v;
            merged.add(o.id);
            dying.push(t);
            moved = true;
            nr = -1;
          }
          break;
        }
        if (nr >= 0 && (nr !== r || nc !== c)) { g[r][c] = null; g[nr][nc] = t; t.r = nr; t.c = nc; moved = true; }
      }
      if (!moved) return;
      G.busy = true;
      G.moves++;
      G.score += gained;
      for (const t of G.tiles) { t.el.classList.remove('new', 'pop'); t.el.style.setProperty('--r', t.r); t.el.style.setProperty('--c', t.c); }
      G.tiles = G.tiles.filter((t) => !dying.includes(t));
      for (const t of dying) t.el.style.zIndex = 1;
      audio.play(gained ? 'chip' : 'card', { volume: gained ? 0.5 : 0.35, rate: gained >= 512 ? 0.85 : 1.1 });
      setTimeout(() => {
        if (!alive) return;
        for (const t of dying) t.el.remove();
        for (const t of G.tiles) if (merged.has(t.id)) { paintTile(t); t.el.classList.add('pop'); }
        spawn();
        G.busy = false;
        hud();
        save();
        if (!canMove()) finish(false);
      }, 120);
    }

    async function cashOut() {
      if (G.over) return;
      const back = G.stake * returnOf(maxTile());
      if (!(await confirmBox('結算', '現在結束這一局，依最大方塊 ' + maxTile() + ' 拿回 ' + fmt(back) + '？', '結算', '繼續玩'))) return;
      if (!G.over) finish(true);
    }

    function finish(early) {
      G.over = true;
      const mx = maxTile();
      const payout = Math.round(G.stake * returnOf(mx));
      const result = payout > G.stake ? 'win' : payout < G.stake ? 'lose' : 'draw';
      if (mx > prefs.bestTile) prefs.bestTile = mx;
      savePrefs();
      const ev = store.settle(ID, { gameName: NAME, mode: '最大 ' + mx, result, payout, note: '分數 ' + fmt(G.score) + ' · ' + G.moves + ' 步' + (early ? ' · 提前結算' : ''), marks: mx >= 2048 ? { tile2048: 1 } : null });
      status.textContent = (early ? '已結算' : '沒有可以移動的方向了') + ' · 最大 ' + mx;
      boardEl.classList.add('over');
      actions.replaceChildren(h('button', { class: 'btn', onClick: () => { location.hash = '#/'; } }, '回大廳'), h('button', { class: 'btn btn-gold', onClick: showSetup }, '再來一局'));
      setTimeout(() => {
        if (!alive) return;
        audio.chime(result === 'win' ? 'win' : result === 'lose' ? 'lose' : 'draw');
        if (result === 'win') audio.play('payout');
        modal({
          title: early ? '結算' : '遊戲結束', center: true,
          body: h('div', null, h('div', { class: 'result-figure ' + (ev.delta > 0 ? 'pos' : ev.delta < 0 ? 'neg' : '') }, (ev.delta > 0 ? '+' : ev.delta < 0 ? '−' : '') + fmt(Math.abs(ev.delta))),
            h('div', { class: 'result-lines' },
              h('div', null, h('span', null, '最大方塊'), h('span', null, String(mx))),
              h('div', null, h('span', null, '分數'), h('span', null, fmt(G.score))),
              h('div', null, h('span', null, '拿回'), h('span', null, fmt(payout) + '（× ' + returnOf(mx) + '）')),
              h('div', null, h('span', null, '結算後餘額'), h('span', null, fmt(ev.balance))))),
          actions: [{ label: '看盤面', value: 'view' }, { label: '再來一局', value: 'again', kind: 'gold' }],
        }).then((v) => { if (v === 'again' && alive) showSetup(); });
      }, early ? 50 : 700);
    }

    // ---------------- 輸入 ----------------
    const KEYS = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3, w: 0, d: 1, s: 2, a: 3, W: 0, D: 1, S: 2, A: 3 };
    const onKey = (e) => { if (e.key in KEYS && !document.querySelector('.modal-wrap')) { e.preventDefault(); move(KEYS[e.key]); } };
    let start = null;
    const onDown = (e) => { start = { x: e.clientX, y: e.clientY }; boardEl.setPointerCapture && boardEl.setPointerCapture(e.pointerId); };
    const onUp = (e) => {
      if (!start) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      start = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
    };
    boardEl.addEventListener('pointerdown', onDown);
    boardEl.addEventListener('pointerup', onUp);
    boardEl.addEventListener('pointercancel', () => { start = null; });
    document.addEventListener('keydown', onKey);
    cleanup = () => document.removeEventListener('keydown', onKey);

    if (saved.cells) for (const [r, c, v] of saved.cells) { const t = { id: ++seq, v, r, c }; G.tiles.push(t); tileEl(t); }
    else { spawn(); spawn(); }
    hud();
    save();
    if (!canMove()) finish(false);
  }

  const saved = store.loadGame(ID);
  if (saved && store.heldAmount(ID) > 0) startGame(saved); else { store.release(ID); showSetup(); }

  return () => { alive = false; if (cleanup) cleanup(); };
}
