// 德州撲克：六人桌無限注現金桌。帶入籌碼入座，離桌時以剩餘籌碼結算。
import * as store from '../../store.js';
import * as audio from '../../audio.js';
import { h, fmt, toast, modal, confirmBox, asset } from '../../ui.js';
import { segmented, hero } from '../shared/setup.js';
import { code, evaluate, handName } from './engine.js';
import { createTable, startHand, act, decide, legal, pot } from './table.js';

const ID = 'holdem', NAME = '德州撲克';
const TIERS = {
  low: { label: '新手桌', sb: 50, bb: 100, styles: ['station', 'nit', 'lag', 'tag', 'station'], desc: '對手較常跟注，適合練習' },
  mid: { label: '進階桌', sb: 200, bb: 400, styles: ['tag', 'reg', 'lag', 'nit', 'station'], desc: '各種打法都有' },
  high: { label: '高手桌', sb: 500, bb: 1000, styles: ['tag', 'reg', 'lag', 'reg'], desc: '緊兇為主，會詐唬也會抓詐唬' },
};
const MIN_BB = 40, MAX_BB = 100;

export const RULES = `
<h4>目標</h4>
<p>用你的兩張底牌，加上桌面五張公牌，組成最大的五張牌型，或讓其他人都棄牌，贏得底池。</p>
<h4>流程</h4>
<ul>
<li>按鈕（D）左邊兩位先下小盲、大盲注，每人發兩張底牌。</li>
<li>四輪下注：<strong>翻牌前</strong> → 翻出三張公牌（<strong>翻牌</strong>）→ 第四張（<strong>轉牌</strong>）→ 第五張（<strong>河牌</strong>）。</li>
<li>每輪可以棄牌、過牌（沒人下注時）、跟注或加注。無限注：任何時候都可以全下。</li>
<li>最後還沒棄牌的人攤牌比大小；有人全下時會分出主池與邊池。</li>
</ul>
<h4>牌型大小（由大到小）</h4>
<table>
<tr><td>同花順</td><td>同花色的順子，A 開頭為皇家同花順</td></tr>
<tr><td>四條</td><td>四張同點數</td></tr>
<tr><td>葫蘆</td><td>三條加一對</td></tr>
<tr><td>同花</td><td>五張同花色</td></tr>
<tr><td>順子</td><td>五張連續點數（A 可當 1 或 14）</td></tr>
<tr><td>三條</td><td>三張同點數</td></tr>
<tr><td>兩對</td><td>兩組對子</td></tr>
<tr><td>一對</td><td>一組對子</td></tr>
<tr><td>高牌</td><td>以上皆非，比最大的牌</td></tr>
</table>
<h4>操作</h4>
<ul>
<li>輪到你時，下方會出現「棄牌」「過牌／跟注」「加注」。按加注可選最小加注、半池、四分之三池、底池或全下，也可以拖曳調整金額。</li>
<li>每手結束後會自動發下一手；想休息可以按「離桌」。</li>
<li>回到大廳不會離桌，牌桌會保留，下次回來接著打。</li>
</ul>
<h4>遊戲幣</h4>
<table>
<tr><th>牌桌</th><th>盲注</th><th>帶入</th></tr>
${Object.values(TIERS).map((t) => `<tr><td>${t.label}</td><td>${fmt(t.sb)} / ${fmt(t.bb)}</td><td>${fmt(t.bb * MIN_BB)}–${fmt(t.bb * MAX_BB)}</td></tr>`).join('')}
</table>
<p>入座時從餘額帶入籌碼，桌上的輸贏都是籌碼；<strong>離桌時剩下的籌碼全部換回遊戲幣</strong>，比帶入多就算贏。籌碼輸光可以補碼。牌局進行中離桌，等於放棄這一手，已經下的注拿不回來。</p>
<p>每張牌桌另外五位都是電腦玩家，會依位置挑選起手牌，翻牌後模擬計算勝率、看底池賠率決定跟注或加注，也會適度詐唬。</p>`;

const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
const short = (n) => (n >= 100000 ? Math.round(n / 1000) + 'K' : n >= 10000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : fmt(n));

export async function mount(root, ctx) {
  let alive = true, T = null, M = null, busy = false, nextTimer = null, raiseOpen = false, raiseTo = 0;
  const prefs = Object.assign({ tier: 'low', bb: MAX_BB }, store.getData().settings.holdem || {});

  // ---------------- 入座 ----------------
  function showSetup() {
    T = null; M = null;
    const bal = store.balance();
    const startBtn = h('button', { class: 'btn btn-gold btn-block' }, '入座');
    const summary = h('div', { class: 'stake-summary' });
    const tierOpt = segmented({
      label: '牌桌', hint: TIERS[prefs.tier].desc, value: prefs.tier,
      options: Object.entries(TIERS).map(([k, t]) => ({ value: k, label: t.label, sub: fmt(t.sb) + '/' + fmt(t.bb), disabled: bal < t.bb * MIN_BB })),
      onChange: (v) => { prefs.tier = v; tierOpt.setHint(TIERS[v].desc); buyOpt.setOptions(buyOptions(), prefs.bb); refresh(); },
    });
    const buyOptions = () => [40, 60, 100].map((x) => ({ value: x, label: fmt(TIERS[prefs.tier].bb * x), sub: x + ' 個大盲', disabled: bal < TIERS[prefs.tier].bb * x }));
    if (bal < TIERS[prefs.tier].bb * MIN_BB) prefs.tier = 'low';
    const buyOpt = segmented({ label: '帶入籌碼', hint: '餘額 ' + fmt(bal), value: prefs.bb, options: buyOptions(), onChange: (v) => { prefs.bb = v; refresh(); } });
    const amount = () => { const t = TIERS[prefs.tier]; let x = prefs.bb; while (x > MIN_BB && t.bb * x > bal) x = x === 100 ? 60 : 40; return t.bb * x; };
    const refresh = () => {
      const t = TIERS[prefs.tier], a = amount();
      const ok = bal >= t.bb * MIN_BB;
      summary.replaceChildren(h('div', null, h('small', null, '盲注'), h('b', null, fmt(t.sb) + ' / ' + fmt(t.bb))), h('div', null, h('small', null, '帶入'), h('b', { class: 'pos' }, ok ? fmt(a) : '—')));
      startBtn.disabled = !ok;
      startBtn.textContent = ok ? '入座' : '遊戲幣不足';
    };
    root.replaceChildren(h('div', { class: 'setup' },
      hero(ID, NAME, '六人桌 · 無限注 · 離桌時籌碼換回遊戲幣'),
      tierOpt, buyOpt, summary, startBtn,
      h('p', { class: 'login-note', style: 'text-align:center' }, '籌碼輸光可以補碼；離桌時剩多少就換回多少。')));
    refresh();
    startBtn.onclick = () => {
      const t = TIERS[prefs.tier], a = amount();
      if (!store.hold(ID, a)) return toast('遊戲幣不足');
      store.setSetting('holdem', { tier: prefs.tier, bb: prefs.bb });
      audio.play('chips');
      T = createTable({ sb: t.sb, bb: t.bb, buyIn: a, human: store.getData().user, styles: t.styles });
      M = { tier: prefs.tier, bought: a, hands: 0, best: 0 };
      buildTable();
      nextHand();
    };
  }

  // ---------------- 牌桌畫面 ----------------
  let V = null;
  function buildTable() {
    const seats = T.seats.map((_, i) => {
      const s = {
        hole: h('div', { class: 'pk-hole' }), name: h('b'), stack: h('span'), act: h('div', { class: 'pk-act' }),
        bet: h('div', { class: 'pk-bet' }), btn: h('div', { class: 'pk-dealer' }, 'D'),
      };
      s.plate = h('div', { class: 'pk-plate' }, s.name, s.stack);
      s.el = h('div', { class: 'pk-seat s' + i + (i === 0 ? ' me' : '') }, s.hole, s.plate, s.act, s.bet, s.btn);
      return s;
    });
    const board = h('div', { class: 'pk-board' });
    const potEl = h('div', { class: 'pk-pot' });
    const msg = h('div', { class: 'pk-msg' });
    const handEl = h('div', { class: 'pk-myhand' });
    const dock = h('div', { class: 'pk-dock-in' });
    const leaveBtn = h('button', { class: 'pk-leave', onClick: leave }, '離桌');
    const info = h('div', { class: 'pk-info' });
    root.replaceChildren(h('div', { class: 'pk' },
      h('div', { class: 'pk-bar' }, info, leaveBtn),
      h('div', { class: 'pk-table' }, h('div', { class: 'pk-felt' }), h('div', { class: 'pk-center' }, potEl, board, msg), ...seats.map((s) => s.el), handEl),
      h('div', { class: 'pk-dock' }, dock)));
    V = { seats, board, potEl, msg, dock, info, handEl };
    ctx && ctx.setGuard && ctx.setGuard(null);
  }

  const cardEl = (c, cls = '') => h('div', { class: 'pk-c ' + cls }, c == null ? null : h('img', { src: asset('cards/' + code(c) + '.webp'), alt: '', draggable: false }));

  function render() {
    if (!V) return;
    const t = TIERS[M.tier];
    V.info.textContent = t.label + ' ' + fmt(t.sb) + '/' + fmt(t.bb) + ' · 第 ' + T.hand + ' 手';
    T.seats.forEach((s, i) => {
      const v = V.seats[i];
      v.name.textContent = i === 0 ? '你' : s.name;
      v.stack.textContent = s.allIn && T.street !== 'done' ? '全下' : fmt(s.stack);
      // 底牌
      const showFace = i === 0 || s.shown;
      const want = !s.hole || !s.hole.length || (s.folded && i !== 0) ? [] : s.hole.map((c) => (showFace ? c : null));
      const key = want.map((c) => (c == null ? 'x' : c)).join(',') + (s.folded ? 'f' : '');
      if (v.hole.dataset.key !== key) {
        v.hole.dataset.key = key;
        v.hole.replaceChildren(...want.map((c) => cardEl(c, c == null ? 'back' : '')));
      }
      v.hole.classList.toggle('folded', !!s.folded && i === 0);
      v.el.classList.toggle('out', !!s.folded);
      v.el.classList.toggle('turn', T.toAct === i && T.street !== 'done');
      const winner = T.result && T.result.winners.find((w) => w.seat === i);
      v.el.classList.toggle('win', !!winner);
      v.act.textContent = winner ? '+' + fmt(winner.amount) : s.action || '';
      v.act.className = 'pk-act' + (winner ? ' won' : s.action === '棄牌' ? ' fold' : '') + (v.act.textContent ? ' on' : '');
      v.bet.replaceChildren(...(s.bet ? [h('i'), short(s.bet)] : []));
      v.btn.hidden = T.button !== i;
    });
    // 公牌
    const bkey = T.board.join(',');
    if (V.board.dataset.key !== bkey) {
      const prev = V.board.dataset.key ? V.board.dataset.key.split(',').length : 0;
      V.board.dataset.key = bkey;
      V.board.replaceChildren(...[0, 1, 2, 3, 4].map((k) => (k < T.board.length ? cardEl(T.board[k], k >= prev ? 'deal' : '') : h('div', { class: 'pk-c slot' }))));
    }
    const p = pot(T);
    const live = T.seats.reduce((a, s) => a + s.bet, 0);
    V.potEl.textContent = T.street === 'idle' ? '' : T.street === 'done' ? '' : '底池 ' + fmt(p - live > 0 ? p - live : p) + (live && p - live > 0 ? ' · 本輪 ' + fmt(live) : '');
    // 我的牌型
    const me = T.seats[0];
    if (me.hole && me.hole.length === 2 && !me.folded && T.board.length >= 3) {
      V.handEl.textContent = handName(evaluate(me.hole.concat(T.board)));
    } else V.handEl.textContent = '';
    renderDock();
  }

  function say(a, b) { V.msg.replaceChildren(...(a ? [h('b', null, a), b ? h('small', null, b) : null] : [])); }

  const button = (label, sub, fn, cls = '', disabled = false) => h('button', { class: 'btn ' + cls, disabled, onClick: () => { if (!busy || cls.includes('free')) fn(); } }, h('span', null, label), sub ? h('small', null, sub) : null);

  function renderDock() {
    const me = T.seats[0];
    if (T.street === 'done' || T.street === 'idle') {
      if (me.stack <= 0) {
        const need = Math.min(T.buyIn, store.balance());
        V.dock.replaceChildren(h('div', { class: 'pk-row' },
          button('離桌', '', leave, 'free'),
          button('補碼', need >= T.bb * MIN_BB ? fmt(need) : '遊戲幣不足', () => rebuy(need), 'btn-gold free', need < T.bb * MIN_BB)));
        return;
      }
      const top = Math.min(T.buyIn - me.stack, store.balance());
      V.dock.replaceChildren(h('div', { class: 'pk-row' },
        button('離桌', '帶走 ' + short(me.stack), leave, 'free'),
        top >= T.bb && me.stack < T.buyIn ? button('補滿', '+' + short(top), () => rebuy(top), 'free') : null,
        button('下一手', '', () => { clearTimeout(nextTimer); nextHand(); }, 'btn-gold free')));
      return;
    }
    if (T.toAct !== 0 || me.folded || me.allIn) {
      V.dock.replaceChildren(h('div', { class: 'pk-row' }, h('div', { class: 'pk-wait' }, me.folded ? '你已棄牌，等這手結束' : me.allIn ? '你已全下' : '等待 ' + (T.seats[T.toAct] ? T.seats[T.toAct].name : '') + ' 行動…')));
      return;
    }
    const L = legal(T, 0);
    if (raiseOpen && L.canRaise) return renderRaise(L);
    raiseOpen = false;
    V.dock.replaceChildren(h('div', { class: 'pk-row' },
      button('棄牌', '', () => human({ type: 'fold' }), 'btn-danger'),
      L.canCheck ? button('過牌', '', () => human({ type: 'check' })) : button(L.toCall >= me.stack ? '全下跟注' : '跟注', fmt(L.toCall), () => human({ type: 'call' })),
      L.canRaise ? button(T.currentBet ? '加注' : '下注', '', () => { raiseOpen = true; raiseTo = L.minTo; renderDock(); }, 'btn-gold') : null));
  }

  function renderRaise(L) {
    const p = pot(T);
    const me = T.seats[0];
    const presetTo = (frac) => Math.min(L.maxTo, Math.max(L.minTo, Math.round((T.currentBet + (p + (T.currentBet - me.bet)) * frac) / T.sb) * T.sb));
    const presets = [['最小', L.minTo], ['半池', presetTo(0.5)], ['¾ 池', presetTo(0.75)], ['底池', presetTo(1)], ['全下', L.maxTo]];
    const amountEl = h('b', { class: 'num' });
    const confirm = h('button', { class: 'btn btn-gold' });
    const slider = h('input', { type: 'range', min: L.minTo, max: L.maxTo, step: T.sb, value: raiseTo, class: 'pk-slider' });
    const sync = () => {
      amountEl.textContent = fmt(raiseTo);
      confirm.replaceChildren(h('span', null, raiseTo >= L.maxTo ? '全下' : (T.currentBet ? '加注到 ' : '下注 ') + short(raiseTo)));
      slider.value = raiseTo;
      presetRow.querySelectorAll('button').forEach((b) => b.classList.toggle('on', +b.dataset.to === raiseTo));
    };
    slider.oninput = () => { raiseTo = Math.min(L.maxTo, Math.max(L.minTo, +slider.value)); if (L.maxTo - raiseTo < T.sb) raiseTo = L.maxTo; sync(); };
    const presetRow = h('div', { class: 'pk-presets' }, presets.map(([label, to]) => h('button', { dataset: { to }, onClick: () => { raiseTo = to; sync(); } }, label)));
    confirm.onclick = () => { raiseOpen = false; human({ type: 'raise', to: raiseTo }); };
    V.dock.replaceChildren(
      presetRow,
      h('div', { class: 'pk-slide' }, slider, amountEl),
      h('div', { class: 'pk-row' }, button('取消', '', () => { raiseOpen = false; renderDock(); }), confirm));
    sync();
  }

  // ---------------- 流程 ----------------
  const save = () => store.saveGame(ID, { T, M });

  async function nextHand() {
    if (!alive || !T) return;
    clearTimeout(nextTimer);
    if (T.seats[0].stack <= 0) { render(); return; }
    const notes = startHand(T);
    M.hands++;
    raiseOpen = false;
    say(null);
    V.board.dataset.key = '';
    audio.play('shuffle', { volume: 0.4 });
    render();
    if (notes.length) toast(notes.join('；'), 2600);
    save();
    await sleep(500);
    loop();
  }

  async function loop() {
    if (busy) return;
    busy = true;
    try {
      while (alive && T && T.street !== 'done') {
        const i = T.toAct;
        if (i === 0) { render(); break; }
        render();
        const quick = T.seats[0].folded || T.seats[0].allIn;
        await sleep(quick ? 380 + Math.random() * 300 : 650 + Math.random() * 700);
        if (!alive || !T) return;
        const a = decide(T, i);
        apply(i, a);
        await afterStep();
      }
    } finally { busy = false; }
    if (alive && T && T.street === 'done') endHand();
  }

  let lastResult = null;
  function apply(i, a) {
    const streetBefore = T.street, boardBefore = T.board.length;
    lastResult = act(T, i, a);
    const s = T.seats[i];
    if (s.action === '棄牌') audio.play('flip', { volume: 0.35 });
    else if (s.action === '過牌') audio.play('chip', { volume: 0.25, rate: 0.8 });
    else audio.play(s.action === '全下' ? 'chips' : 'chip', { volume: 0.7 });
    lastResult = { r: lastResult, streetBefore, boardBefore };
    save();
  }

  async function afterStep() {
    render();
    const { r, boardBefore } = lastResult;
    if (r === 'street' || (r === 'end' && T.board.length > boardBefore)) {
      await sleep(450);
      // 逐張翻開公牌
      const full = T.board.slice();
      if (r === 'end' && full.length - boardBefore > 1) {
        for (const s of T.seats) if (!s.folded && T.result && T.result.showdown) s.shown = true;
        let n = boardBefore;
        while (n < full.length) {
          n = n === 0 ? 3 : n + 1;
          T.board = full.slice(0, n);
          render();
          audio.play('card', { volume: 0.7 });
          await sleep(900);
          if (!alive) return;
        }
        T.board = full;
      } else {
        audio.play('card', { volume: 0.7 });
        render();
        await sleep(350);
      }
    }
  }

  async function human(a) {
    if (busy || T.toAct !== 0) return;
    busy = true;
    apply(0, a);
    await afterStep();
    busy = false;
    if (T.street === 'done') endHand(); else loop();
  }

  function endHand() {
    const R = T.result;
    if (!R || R.handled) { render(); return; }
    R.handled = true;
    const me = T.seats[0];
    const won = R.winners.find((w) => w.seat === 0);
    if (R.pot > M.best && won) M.best = R.pot;
    const names = R.winners.map((w) => (w.seat === 0 ? '你' : T.seats[w.seat].name));
    if (R.showdown) {
      const w = R.winners[0];
      say(names.join('、') + (R.winners.length > 1 ? ' 平分' : ' 贏得') + ' ' + fmt(R.winners.reduce((a, x) => a + x.amount, 0)), w.hand ? '以' + w.hand + '勝出' : '');
    } else say(names[0] + ' 贏得 ' + fmt(R.pot), '其他人都棄牌');
    if (won) { audio.play('payout', { volume: 0.8 }); if (R.pot >= T.bb * 20) audio.chime('win'); }
    render();
    save();
    if (me.stack > 0) nextTimer = setTimeout(() => { if (alive && T && T.street === 'done' && !document.querySelector('.modal-wrap')) nextHand(); }, R.showdown ? 4200 : 2600);
  }

  function rebuy(amount) {
    if (amount < T.bb || !store.hold(ID, amount)) return toast('遊戲幣不足');
    T.seats[0].stack += amount;
    M.bought += amount;
    audio.play('chips');
    toast('補入 ' + fmt(amount) + ' 籌碼');
    save();
    render();
  }

  async function leave() {
    const me = T.seats[0];
    const inHand = T.street !== 'done' && T.street !== 'idle' && !me.folded;
    const body = inHand ? '這一手還沒打完，離桌等於棄牌，已經下的 ' + fmt(me.total) + ' 拿不回來。<br>' : '';
    if (!(await confirmBox('離桌', body + '帶走 <b class="num">' + fmt(me.stack) + '</b> 籌碼，換回遊戲幣？', '離桌', '繼續打'))) return;
    if (!T) return;
    clearTimeout(nextTimer);
    const stack = me.stack;
    const net = stack - M.bought;
    const result = net > 0 ? 'win' : net < 0 ? 'lose' : 'draw';
    const t = TIERS[M.tier];
    const ev = store.settle(ID, { gameName: NAME, mode: t.label + ' ' + fmt(t.sb) + '/' + fmt(t.bb), result, payout: stack, note: M.hands + ' 手 · 帶入 ' + fmt(M.bought) + ' · 帶走 ' + fmt(stack), marks: { pkHands: M.hands } });
    T = null; V = null;
    audio.chime(result === 'win' ? 'win' : result === 'lose' ? 'lose' : 'draw');
    showSetup();
    modal({
      title: '離桌結算', center: true,
      body: h('div', null, h('div', { class: 'result-figure ' + (ev.delta > 0 ? 'pos' : ev.delta < 0 ? 'neg' : '') }, (ev.delta > 0 ? '+' : ev.delta < 0 ? '−' : '') + fmt(Math.abs(ev.delta))),
        h('div', { class: 'result-lines' },
          h('div', null, h('span', null, '打了'), h('span', null, M.hands + ' 手')),
          h('div', null, h('span', null, '帶入／帶走'), h('span', null, fmt(M.bought) + ' → ' + fmt(stack))),
          h('div', null, h('span', null, '最大底池'), h('span', null, M.best ? fmt(M.best) : '—')),
          h('div', null, h('span', null, '結算後餘額'), h('span', null, fmt(ev.balance))))),
      actions: [{ label: '好', value: true, kind: 'gold' }],
    });
  }

  // ---------------- 啟動 ----------------
  audio.preload('card', 'flip', 'chip', 'chips', 'payout', 'shuffle');
  const saved = store.loadGame(ID);
  if (saved && saved.T && store.heldAmount(ID) > 0) {
    T = saved.T; M = saved.M;
    buildTable();
    render();
    if (T.street === 'done' || T.street === 'idle') { if (T.result) { T.result.handled = false; endHand(); } else nextHand(); }
    else loop();
  } else { store.release(ID); showSetup(); }

  return () => { alive = false; clearTimeout(nextTimer); };
}
