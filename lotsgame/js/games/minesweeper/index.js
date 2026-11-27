// 踩地雷：標準三種盤面（初級 9×9／10、中級 16×16／40、高級 16×30／99），第一下必定打開一片空地。
import * as store from '../../store.js';
import * as audio from '../../audio.js';
import { h, fmt, toast, modal, confirmBox, fitCanvas } from '../../ui.js';
import { segmented, hero, stakeSummary, stakeOptions, defaultStake } from '../shared/setup.js';

const ID = 'minesweeper', NAME = '踩地雷';
const LEVELS = {
  easy: { label: '初級', sub: '9 × 9', rows: 9, cols: 9, mines: 10, mult: 0.25, desc: '81 格、10 顆地雷' },
  mid: { label: '中級', sub: '16 × 16', rows: 16, cols: 16, mines: 40, mult: 1, desc: '256 格、40 顆地雷' },
  hard: { label: '高級', sub: '16 × 30', rows: 16, cols: 30, mines: 99, mult: 3, desc: '480 格、99 顆地雷' },
};
const NUM_COLORS = ['', '#2f62b5', '#2f7d45', '#b8382e', '#26357a', '#7a2a24', '#1f7a7a', '#222', '#6b6b6b'];

export const RULES = `
<h4>目標</h4>
<p>把所有<strong>沒有地雷</strong>的格子都翻開就獲勝；翻到地雷就輸。</p>
<h4>數字</h4>
<ul>
<li>翻開的格子上的數字，代表它周圍 8 格裡有幾顆地雷。</li>
<li>空白格代表周圍沒有地雷，會自動把相連的空地一起打開。</li>
<li>第一下一定不會踩到地雷，而且會打開一片空地。</li>
</ul>
<h4>操作</h4>
<ul>
<li><strong>翻開</strong>：點一下格子。</li>
<li><strong>插旗</strong>：長按格子，或把下方模式切到「插旗」再點。電腦可用滑鼠右鍵。</li>
<li><strong>快速翻開</strong>：點已翻開的數字，若周圍旗子數量剛好等於數字，會一次翻開周圍其餘格子（旗子插錯就會踩雷）。</li>
<li>格子太小時可按「放大」，拖曳畫面移動。</li>
</ul>
<h4>遊戲幣</h4>
<table>
<tr><th>盤面</th><th>大小／地雷</th><th>過關獎金</th></tr>
<tr><td>初級</td><td>9 × 9／10</td><td>賭注 × 0.25</td></tr>
<tr><td>中級</td><td>16 × 16／40</td><td>賭注 × 1</td></tr>
<tr><td>高級</td><td>16 × 30／99</td><td>賭注 × 3</td></tr>
</table>
<p>開局先扣賭注。過關拿回賭注並加上獎金；踩到地雷或放棄則失去賭注。高級盤面難免需要猜測，獎金因此最高。中途離開會保留盤面與時間，回來可以接著玩。</p>`;

const neighbors = (i, rows, cols) => {
  const r = (i / cols) | 0, c = i % cols, out = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const rr = r + dr, cc = c + dc;
    if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) out.push(rr * cols + cc);
  }
  return out;
};

export async function mount(root) {
  let alive = true, G = null, timer = null, cleanupBoard = null;
  const prefs = Object.assign({ level: 'easy', stake: 1000, best: {} }, store.getData().settings.minesweeper || {});
  const savePrefs = () => store.setSetting('minesweeper', { level: prefs.level, stake: prefs.stake, best: prefs.best });

  function showSetup() {
    if (cleanupBoard) { cleanupBoard(); cleanupBoard = null; }
    G = null;
    const bal = store.balance();
    let stake = defaultStake(bal, prefs.stake);
    const summary = stakeSummary();
    const startBtn = h('button', { class: 'btn btn-gold btn-block' }, '開始');
    const bestLine = () => { const b = prefs.best[prefs.level]; return LEVELS[prefs.level].desc + (b ? ' · 最佳 ' + fmtTime(b) : ''); };
    const levelOpt = segmented({
      label: '盤面', hint: bestLine(), value: prefs.level,
      options: Object.entries(LEVELS).map(([k, v]) => ({ value: k, label: v.label, sub: v.sub })),
      onChange: (v) => { prefs.level = v; levelOpt.setHint(bestLine()); refresh(); },
    });
    const refresh = () => {
      summary.update(stake, Math.round(stake * LEVELS[prefs.level].mult));
      startBtn.disabled = !stake;
      startBtn.textContent = stake ? '開始' : '遊戲幣不足';
    };
    root.replaceChildren(h('div', { class: 'setup' },
      hero(ID, NAME, '翻開所有安全的格子'),
      levelOpt,
      segmented({ label: '賭注', hint: '餘額 ' + fmt(bal), numeric: true, value: stake, options: stakeOptions(bal), onChange: (v) => { stake = v; prefs.stake = v; refresh(); } }),
      summary, startBtn,
      !stake ? h('p', { class: 'login-note', style: 'text-align:center' }, '餘額低於 1,000 時，可回大廳領取補給金。') : null));
    refresh();
    startBtn.onclick = () => {
      if (!stake || !store.hold(ID, stake)) return toast('遊戲幣不足');
      savePrefs();
      audio.play('chips');
      const lv = LEVELS[prefs.level];
      // 直式螢幕把高級盤面轉成 30 列 × 16 行
      const tall = root.clientHeight > root.clientWidth * 1.15;
      const rows = tall ? Math.max(lv.rows, lv.cols) : Math.min(lv.rows, lv.cols);
      const cols = tall ? Math.min(lv.rows, lv.cols) : Math.max(lv.rows, lv.cols);
      startGame({ level: prefs.level, stake, rows, cols, mines: null, open: [], flags: [], elapsed: 0, started: false });
    };
  }

  const fmtTime = (ms) => { const s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  function startGame(saved) {
    const lv = LEVELS[saved.level];
    const { rows, cols } = saved;
    const N = rows * cols;
    G = {
      ...saved, over: false, mode: 'open', zoom: false, t0: 0,
      mine: new Uint8Array(N), count: new Uint8Array(N), open: new Uint8Array(N), flag: new Uint8Array(N), boom: -1, wrongFlags: [],
    };
    if (saved.mines) { for (const m of saved.mines) G.mine[m] = 1; computeCounts(); }
    for (const i of saved.open) G.open[i] = 1;
    for (const i of saved.flags) G.flag[i] = 1;

    function computeCounts() { for (let i = 0; i < N; i++) G.count[i] = neighbors(i, rows, cols).reduce((s, j) => s + G.mine[j], 0); }

    const minesLeft = h('b', { class: 'num' });
    const clock = h('b', { class: 'num' });
    const status = h('div', { class: 'ms-status' });
    const canvas = h('canvas', { class: 'ms-cv' });
    const scroller = h('div', { class: 'ms-scroll' }, h('div', { class: 'ms-pad' }, canvas));
    const modeBtns = h('div', { class: 'seg ms-mode' });
    const zoomBtn = h('button', { class: 'btn', onClick: () => { G.zoom = !G.zoom; layout(); } }, '放大');
    const quitBtn = h('button', { class: 'btn btn-danger', onClick: quit }, '放棄');
    const actions = h('div', { class: 'ms-actions' }, modeBtns, zoomBtn, quitBtn);
    root.replaceChildren(h('div', { class: 'ms' },
      h('div', { class: 'ms-top' },
        h('div', null, h('small', null, '剩餘地雷'), minesLeft),
        h('div', null, h('small', null, lv.label + ' · 賭注 ' + fmt(G.stake)), status),
        h('div', null, h('small', null, '時間'), clock)),
      scroller, actions));

    const paintMode = () => modeBtns.replaceChildren(...[['open', '翻開'], ['flag', '插旗']].map(([k, label]) => h('button', { type: 'button', class: G.mode === k ? 'on' : '', onClick: () => { G.mode = k; paintMode(); } }, h('span', null, label))));
    paintMode();

    let cell = 30;
    function layout() {
      const W = scroller.clientWidth - 12, H = scroller.clientHeight - 12;
      const fit = Math.floor(Math.min(W / cols, H / rows, 46));
      const small = fit < 32;
      zoomBtn.hidden = !small;
      zoomBtn.textContent = G.zoom ? '縮小' : '放大';
      cell = G.zoom && small ? 40 : Math.max(12, fit);
      canvas.style.width = cell * cols + 'px';
      canvas.style.height = cell * rows + 'px';
      scroller.classList.toggle('zoomed', G.zoom && small);
      draw();
    }

    function save() {
      if (G.over) return;
      const pick = (arr) => { const out = []; for (let i = 0; i < N; i++) if (arr[i]) out.push(i); return out; };
      store.saveGame(ID, { level: G.level, stake: G.stake, rows, cols, mines: G.started ? pick(G.mine) : null, open: pick(G.open), flags: pick(G.flag), elapsed: elapsed(), started: G.started });
    }
    const elapsed = () => G.elapsed + (G.t0 ? performance.now() - G.t0 : 0);
    function tick() { clock.textContent = fmtTime(elapsed()); }
    function startClock() { if (!G.t0 && !G.over) { G.t0 = performance.now(); timer = setInterval(tick, 250); } }
    function stopClock() { if (G.t0) { G.elapsed = elapsed(); G.t0 = 0; } clearInterval(timer); timer = null; tick(); }

    function plant(first) {
      const banned = new Set([first, ...neighbors(first, rows, cols)]);
      const pool = [];
      for (let i = 0; i < N; i++) if (!banned.has(i)) pool.push(i);
      for (let k = 0; k < lv.mines; k++) { const j = k + Math.floor(Math.random() * (pool.length - k)); [pool[k], pool[j]] = [pool[j], pool[k]]; G.mine[pool[k]] = 1; }
      computeCounts();
      G.started = true;
    }

    function flood(start) {
      const stack = [start];
      let opened = 0;
      while (stack.length) {
        const i = stack.pop();
        if (G.open[i] || G.flag[i]) continue;
        G.open[i] = 1; opened++;
        if (!G.mine[i] && G.count[i] === 0) for (const j of neighbors(i, rows, cols)) if (!G.open[j]) stack.push(j);
      }
      return opened;
    }

    function reveal(i) {
      if (G.over || G.flag[i]) return;
      if (!G.started) plant(i);
      startClock();
      if (G.open[i]) return chord(i);
      if (G.mine[i]) { G.open[i] = 1; return lose(i); }
      const n = flood(i);
      audio.play(n > 6 ? 'flip' : 'card', { volume: 0.55, rate: 1.1 });
      afterMove();
    }

    function chord(i) {
      if (!G.open[i] || !G.count[i]) return;
      const nb = neighbors(i, rows, cols);
      if (nb.filter((j) => G.flag[j]).length !== G.count[i]) return;
      let hit = -1, any = false;
      for (const j of nb) {
        if (G.open[j] || G.flag[j]) continue;
        any = true;
        if (G.mine[j]) { G.open[j] = 1; if (hit < 0) hit = j; } else flood(j);
      }
      if (hit >= 0) return lose(hit);
      if (any) { audio.play('card', { volume: 0.55, rate: 1.1 }); afterMove(); }
    }

    function toggleFlag(i) {
      if (G.over || G.open[i]) return;
      G.flag[i] ^= 1;
      audio.play('chip', { volume: 0.5 });
      if (navigator.vibrate) navigator.vibrate(12);
      afterMove(false);
    }

    function afterMove(checkWin = true) {
      let flags = 0, closedSafe = 0;
      for (let i = 0; i < N; i++) { flags += G.flag[i]; if (!G.open[i] && !G.mine[i]) closedSafe++; }
      minesLeft.textContent = String(lv.mines - flags);
      if (checkWin && G.started && closedSafe === 0) return win();
      save();
      draw();
    }

    function finish(result) {
      G.over = true;
      stopClock();
      const ms = G.elapsed;
      const profit = Math.round(G.stake * lv.mult);
      const payout = result === 'win' ? G.stake + profit : 0;
      let record = false;
      if (result === 'win') {
        const b = prefs.best[G.level];
        if (!b || ms < b) { prefs.best[G.level] = Math.round(ms); record = true; savePrefs(); }
      }
      const ev = store.settle(ID, { gameName: NAME, mode: lv.label, result, payout, note: (result === 'win' ? '過關' : G.boom >= 0 ? '踩到地雷' : '放棄') + ' · ' + fmtTime(ms), marks: result === 'win' && G.level === 'hard' ? { msHardWins: 1 } : null });
      actions.replaceChildren(h('button', { class: 'btn', onClick: () => { location.hash = '#/'; } }, '回大廳'), h('button', { class: 'btn btn-gold', onClick: showSetup }, '再來一局'));
      layout();
      setTimeout(() => {
        if (!alive) return;
        audio.chime(result === 'win' ? 'win' : 'lose');
        if (result === 'win') audio.play('payout');
        modal({
          title: result === 'win' ? '過關' : G.boom >= 0 ? '踩到地雷' : '已放棄', center: true,
          body: h('div', null, h('div', { class: 'result-figure ' + (ev.delta > 0 ? 'pos' : 'neg') }, (ev.delta > 0 ? '+' : '−') + fmt(Math.abs(ev.delta))),
            h('div', { class: 'result-lines' },
              h('div', null, h('span', null, '盤面'), h('span', null, lv.label + ' ' + lv.sub)),
              h('div', null, h('span', null, '用時'), h('span', null, fmtTime(ms) + (record ? ' · 新紀錄' : ''))),
              h('div', null, h('span', null, '結算後餘額'), h('span', null, fmt(ev.balance))))),
          actions: [{ label: '看盤面', value: 'view' }, { label: '再來一局', value: 'again', kind: 'gold' }],
        }).then((v) => { if (v === 'again' && alive) showSetup(); });
      }, result === 'win' ? 300 : 900);
    }

    function win() {
      for (let i = 0; i < N; i++) if (G.mine[i]) G.flag[i] = 1;
      minesLeft.textContent = '0';
      status.textContent = '過關';
      finish('win');
    }
    function lose(i) {
      G.boom = i;
      for (let k = 0; k < N; k++) if (G.flag[k] && !G.mine[k]) G.wrongFlags.push(k);
      status.textContent = '踩到地雷';
      audio.play('capture', { volume: 0.9, rate: 0.6 });
      if (navigator.vibrate) navigator.vibrate([30, 40, 60]);
      finish('lose');
    }
    async function quit() {
      if (G.over) return;
      if (!(await confirmBox('放棄', '確定要放棄這一局嗎？會失去賭注 ' + fmt(G.stake) + '。', '放棄', '繼續玩', 'danger'))) return;
      if (G.over) return;
      status.textContent = '已放棄';
      finish('lose');
    }

    // ---------------- 繪製 ----------------
    function draw() {
      const { ctx } = fitCanvas(canvas, 2);
      const s = cell;
      ctx.clearRect(0, 0, cols * s, rows * s);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '700 ' + Math.round(s * 0.62) + 'px ' + getComputedStyle(document.body).getPropertyValue('--serif');
      const r = Math.max(2, s * 0.12);
      for (let i = 0; i < N; i++) {
        const x = (i % cols) * s, y = ((i / cols) | 0) * s;
        const showMine = G.over && G.mine[i] && !G.flag[i];
        if (G.open[i] || showMine) {
          ctx.fillStyle = i === G.boom ? '#b8433a' : (((i % cols) + ((i / cols) | 0)) % 2 ? '#e9e0cc' : '#efe7d4');
          ctx.fillRect(x, y, s, s);
          ctx.strokeStyle = 'rgba(90,70,40,0.18)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
          if (G.mine[i]) drawMine(ctx, x + s / 2, y + s / 2, s * 0.3);
          else if (G.count[i]) { ctx.fillStyle = NUM_COLORS[G.count[i]]; ctx.fillText(String(G.count[i]), x + s / 2, y + s * 0.54); }
        } else {
          const g = ctx.createLinearGradient(x, y, x, y + s);
          g.addColorStop(0, '#5b4a37'); g.addColorStop(1, '#3d3124');
          ctx.fillStyle = '#2a2118'; ctx.fillRect(x, y, s, s);
          ctx.beginPath(); ctx.roundRect(x + 1, y + 1, s - 2, s - 2, r); ctx.fillStyle = g; ctx.fill();
          ctx.strokeStyle = 'rgba(255,236,200,0.16)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x + 2, y + s - 3); ctx.lineTo(x + 2, y + 2 + r * 0.4); ctx.lineTo(x + s - 3, y + 2); ctx.stroke();
          if (G.flag[i]) drawFlag(ctx, x + s / 2, y + s / 2, s, G.wrongFlags.includes(i));
        }
      }
      // 選取到的格子以金框表示
      if (hoverIdx >= 0 && !G.over) {
        const x = (hoverIdx % cols) * s, y = ((hoverIdx / cols) | 0) * s;
        ctx.strokeStyle = 'rgba(232,211,160,0.9)'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, s - 2, s - 2);
      }
    }
    function drawMine(ctx, x, y, r) {
      ctx.save();
      ctx.strokeStyle = '#1a1714'; ctx.lineWidth = Math.max(1.2, r * 0.22); ctx.lineCap = 'round';
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 4;
        ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * r * 1.35, y - Math.sin(a) * r * 1.35); ctx.lineTo(x + Math.cos(a) * r * 1.35, y + Math.sin(a) * r * 1.35); ctx.stroke();
      }
      const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
      g.addColorStop(0, '#6d6a66'); g.addColorStop(0.5, '#262422'); g.addColorStop(1, '#0d0c0b');
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
      ctx.restore();
    }
    function drawFlag(ctx, x, y, s, wrong) {
      ctx.save();
      const u = s / 20;
      ctx.fillStyle = '#d9cdb3';
      ctx.fillRect(x - 5 * u, y + 5 * u, 10 * u, 2 * u);
      ctx.fillRect(x - 0.8 * u, y - 6 * u, 1.6 * u, 12 * u);
      ctx.beginPath(); ctx.moveTo(x + 0.8 * u, y - 6.5 * u); ctx.lineTo(x - 6.5 * u, y - 3 * u); ctx.lineTo(x + 0.8 * u, y + 0.5 * u); ctx.closePath();
      ctx.fillStyle = '#c9443a'; ctx.fill();
      if (wrong) {
        ctx.strokeStyle = '#f2e6c8'; ctx.lineWidth = 2 * u; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x - 6 * u, y - 6 * u); ctx.lineTo(x + 6 * u, y + 6 * u); ctx.moveTo(x + 6 * u, y - 6 * u); ctx.lineTo(x - 6 * u, y + 6 * u); ctx.stroke();
      }
      ctx.restore();
    }

    // ---------------- 操作 ----------------
    let press = null, hoverIdx = -1;
    const idxAt = (e) => {
      const rc = canvas.getBoundingClientRect();
      const c = Math.floor((e.clientX - rc.left) / cell), r = Math.floor((e.clientY - rc.top) / cell);
      return c >= 0 && c < cols && r >= 0 && r < rows ? r * cols + c : -1;
    };
    const onDown = (e) => {
      if (G.over) return;
      const i = idxAt(e);
      if (i < 0) return;
      if (e.button === 2) { e.preventDefault(); toggleFlag(i); return; }
      if (e.button !== 0) { chord(i); return; }
      press = { i, x: e.clientX, y: e.clientY, long: false, timer: setTimeout(() => { if (!press) return; press.long = true; if (!G.open[press.i]) toggleFlag(press.i); }, 380) };
      hoverIdx = i; draw();
    };
    const onMove = (e) => {
      if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) { clearTimeout(press.timer); press = null; hoverIdx = -1; draw(); }
    };
    const onUp = () => {
      if (!press) return;
      clearTimeout(press.timer);
      const { i, long } = press;
      press = null; hoverIdx = -1;
      if (long || G.over) { draw(); return; }
      if (G.open[i]) chord(i);
      else if (G.mode === 'flag') toggleFlag(i);
      else reveal(i);
      draw();
    };
    const onCancel = () => { if (press) clearTimeout(press.timer); press = null; hoverIdx = -1; draw(); };
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onCancel);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    const onResize = () => layout();
    window.addEventListener('resize', onResize);
    const onHide = () => { if (document.hidden && G && !G.over) { stopClock(); save(); } else if (!document.hidden && G && G.started && !G.over) startClock(); };
    document.addEventListener('visibilitychange', onHide);
    cleanupBoard = () => {
      stopClock();
      if (!G.over) save();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onHide);
    };

    tick();
    afterMove(false);
    requestAnimationFrame(layout);
    if (G.started) startClock();
    save();
  }

  const saved = store.loadGame(ID);
  if (saved && store.heldAmount(ID) > 0) startGame(saved); else { store.release(ID); showSetup(); }

  return () => { alive = false; if (cleanupBoard) cleanupBoard(); };
}
