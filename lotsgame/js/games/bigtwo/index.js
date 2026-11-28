// 大老二（台灣規則）：四人桌，帶入籌碼入座，每局依輸家剩牌結算，離桌時以剩餘籌碼換回遊戲幣。
import * as store from '../../store.js';
import * as audio from '../../audio.js';
import { h, fmt, toast, modal, confirmBox, asset } from '../../ui.js';
import { segmented, hero } from '../shared/setup.js';
import { code, classify, rankOf, suitOf, TYPE_NAME, hints, searchMove, penalty, CLUB3 } from './engine.js';
import { createTable, startHand, check, play, pass, botMove, SEATS } from './table.js';

const ID = 'bigtwo', NAME = '大老二';
const TIERS = {
  low: { label: '新手桌', unit: 10, level: 1, desc: '對手照牌型出牌，適合熟悉規則' },
  mid: { label: '進階桌', unit: 50, level: 2, desc: '對手會記牌、推演剩下的牌' },
  high: { label: '高手桌', unit: 200, level: 3, desc: '推演更深，很少失誤' },
};
const BUYS = [100, 200, 300]; // 帶入幾倍底分
const MIN_UNITS = 100;

export const RULES = `
<h4>目標</h4>
<p>四人各拿 13 張牌，輪流出牌，<strong>最先把手牌出完的人贏</strong>，其他三家依手上剩的牌賠給他。</p>
<h4>牌的大小</h4>
<ul>
<li>點數：<strong>2 最大</strong>，接著 A、K、Q、J、10 … 3 最小。</li>
<li>同點數比花色：<strong>黑桃 ♠ ＞ 紅心 ♥ ＞ 方塊 ♦ ＞ 梅花 ♣</strong>。</li>
</ul>
<h4>可以出的牌型</h4>
<table>
<tr><td>單張</td><td>任一張牌</td></tr>
<tr><td>對子</td><td>兩張同點數，比較大的那張</td></tr>
<tr><td>順子</td><td>五張連續點數。最大 23456，其次 A2345，再來 10JQKA，最小 34567；JQKA2、QKA23、KA234 不算。同樣的順子比最大張的花色（含 2 的順子比 2）</td></tr>
<tr><td>葫蘆</td><td>三張同點數加一對，比三張的點數</td></tr>
<tr><td>鐵支</td><td>四張同點數加任一張，比四張的點數</td></tr>
<tr><td>同花順</td><td>同花色的順子</td></tr>
</table>
<p>五張牌型大小：同花順 ＞ 鐵支 ＞ 葫蘆 ＞ 順子。台灣規則<strong>不能出三條、四張，也沒有同花</strong>。</p>
<p><strong>鐵支與同花順可以「切」</strong>：任何單張或對子都能用它們壓過。</p>
<h4>出牌</h4>
<ul>
<li>拿到<strong>梅花 3</strong> 的人先出，第一手必須包含梅花 3。</li>
<li>依逆時針（你 → 右家 → 對家 → 左家）輪流，後面的人要出<strong>同樣張數、更大</strong>的牌，或選擇「過」。</li>
<li>這一輪喊過之後，就不能再出，要等下一輪。</li>
<li>其他三家都過，最後出牌的人收下這一輪，自由出任何牌型。</li>
</ul>
<h4>操作</h4>
<ul>
<li>點牌選取，或按住手指在牌上滑過一次選多張；再點一次取消。</li>
<li>「提示」會依序選出可以出的牌，第一個是電腦建議的出法。</li>
<li>右上角可以切換手牌依點數或花色排列。</li>
</ul>
<h4>計分與遊戲幣</h4>
<ul>
<li>輸家每剩一張牌算 1 點；<strong>剩 10 張以上加倍</strong>；手上<strong>每有一張 2 再加倍</strong>；最多 8 倍。</li>
<li>每點的籌碼依牌桌而定，三家賠的籌碼全部給贏家。籌碼不夠賠時，賠到 0 為止。</li>
</ul>
<table>
<tr><th>牌桌</th><th>每點</th><th>帶入</th></tr>
${Object.values(TIERS).map((t) => `<tr><td>${t.label}</td><td>${fmt(t.unit)}</td><td>${fmt(t.unit * BUYS[0])}–${fmt(t.unit * BUYS[2])}</td></tr>`).join('')}
</table>
<p>入座時從餘額帶入籌碼，桌上輸贏都是籌碼；<strong>離桌時剩下的籌碼全部換回遊戲幣</strong>。牌局進行中離桌，視同這一局輸，依手上剩牌賠出。</p>
<p>電腦玩家會把手牌拆成最省手數的組合；進階桌以上還會記住出過的牌，把看不到的牌隨機分給對手、推演到牌局結束，挑期望輸贏最好的出法。</p>`;

const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
const short = (n) => (n >= 100000 ? Math.round(n / 1000) + 'K' : n >= 10000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : fmt(n));
const POS = ['me', 'right', 'top', 'left'];

export async function mount(root, ctx) {
  let alive = true, T = null, M = null, V = null, busy = false, nextTimer = null;
  let sel = new Set(), hintList = null, hintIdx = 0;
  const prefs = Object.assign({ tier: 'low', buy: 1, sort: 'rank' }, store.getData().settings.bigtwo || {});
  const savePrefs = () => store.setSetting('bigtwo', { tier: prefs.tier, buy: prefs.buy, sort: prefs.sort });

  // ---------------- 入座 ----------------
  function showSetup() {
    T = null; M = null; V = null;
    const bal = store.balance();
    const startBtn = h('button', { class: 'btn btn-gold btn-block' }, '入座');
    const summary = h('div', { class: 'stake-summary' });
    const can = (k) => bal >= TIERS[k].unit * MIN_UNITS;
    if (!can(prefs.tier)) prefs.tier = 'low';
    const tierOpt = segmented({
      label: '牌桌', hint: TIERS[prefs.tier].desc, value: prefs.tier,
      options: Object.entries(TIERS).map(([k, t]) => ({ value: k, label: t.label, sub: '每點 ' + fmt(t.unit), disabled: !can(k) })),
      onChange: (v) => { prefs.tier = v; tierOpt.setHint(TIERS[v].desc); buyOpt.setOptions(buyOptions(), prefs.buy); refresh(); },
    });
    const buyOptions = () => BUYS.map((x, k) => ({ value: k, label: fmt(TIERS[prefs.tier].unit * x), sub: x + ' 點', disabled: bal < TIERS[prefs.tier].unit * x }));
    const buyOpt = segmented({ label: '帶入籌碼', hint: '餘額 ' + fmt(bal), value: prefs.buy, options: buyOptions(), onChange: (v) => { prefs.buy = v; refresh(); } });
    const amount = () => { const t = TIERS[prefs.tier]; let k = prefs.buy; while (k > 0 && t.unit * BUYS[k] > bal) k--; return t.unit * BUYS[k]; };
    const refresh = () => {
      const t = TIERS[prefs.tier], ok = can(prefs.tier);
      summary.replaceChildren(h('div', null, h('small', null, '每點'), h('b', null, fmt(t.unit))), h('div', null, h('small', null, '帶入'), h('b', { class: 'pos' }, ok ? fmt(amount()) : '—')));
      startBtn.disabled = !ok;
      startBtn.textContent = ok ? '入座' : '遊戲幣不足';
    };
    root.replaceChildren(h('div', { class: 'setup' },
      hero(ID, NAME, '四人桌 · 台灣規則 · 離桌時籌碼換回遊戲幣'),
      tierOpt, buyOpt, summary, startBtn,
      h('p', { class: 'login-note', style: 'text-align:center' }, '輸家每剩一張賠一點，十張以上與手上的 2 加倍。')));
    refresh();
    startBtn.onclick = () => {
      const t = TIERS[prefs.tier], a = amount();
      if (!store.hold(ID, a)) return toast('遊戲幣不足');
      savePrefs();
      audio.play('chips');
      T = createTable({ unit: t.unit, buyIn: a, human: store.getData().user, level: t.level });
      M = { tier: prefs.tier, bought: a, hands: 0, wins: 0, best: 0 };
      buildTable();
      nextHand();
    };
  }

  // ---------------- 牌桌畫面 ----------------
  function buildTable() {
    const seats = T.seats.map((_, i) => {
      const v = { name: h('b'), stack: h('span'), count: h('div', { class: 'bt-count' }), out: h('div', { class: 'bt-out ' + POS[i] }), think: h('i', { class: 'bt-think' }) };
      v.plate = h('div', { class: 'bt-plate' }, v.name, v.stack);
      v.el = h('div', { class: 'bt-seat ' + POS[i] }, i ? v.count : null, v.plate, v.think);
      return v;
    });
    const msg = h('div', { class: 'bt-msg' });
    const info = h('div', { class: 'bt-info' });
    const sortBtn = h('button', { class: 'bt-chip', onClick: () => { prefs.sort = prefs.sort === 'rank' ? 'suit' : 'rank'; savePrefs(); renderHand(); sortBtn.textContent = prefs.sort === 'rank' ? '依點數' : '依花色'; } }, prefs.sort === 'rank' ? '依點數' : '依花色');
    const leaveBtn = h('button', { class: 'bt-chip', onClick: leave }, '離桌');
    const hand = h('div', { class: 'bt-hand' });
    const dock = h('div', { class: 'bt-dock-in' });
    const result = h('div', { class: 'bt-result' });
    const el = h('div', { class: 'bt' },
      h('div', { class: 'bt-bar' }, info, sortBtn, leaveBtn),
      h('div', { class: 'bt-table' }, h('div', { class: 'bt-felt' }), ...seats.map((s) => s.el), ...seats.map((s) => s.out), msg, result),
      hand,
      h('div', { class: 'bt-dock' }, dock));
    root.replaceChildren(el);
    V = { el, seats, msg, info, hand, dock, result };
    bindHand(hand);
    new ResizeObserver(() => V && V.hand === hand && renderHand()).observe(hand);
  }

  const cardEl = (c, cls = '') => h('div', { class: 'bt-c ' + cls, dataset: { c } }, h('img', { src: asset('cards/' + code(c) + '.webp'), alt: '', draggable: false }));

  function render() {
    if (!V) return;
    const t = TIERS[M.tier];
    V.info.textContent = t.label + ' 每點 ' + fmt(t.unit) + ' · 第 ' + T.hand + ' 局';
    T.seats.forEach((s, i) => {
      const v = V.seats[i];
      v.name.textContent = i === 0 ? '你' : s.name;
      v.stack.textContent = fmt(s.stack);
      v.el.classList.toggle('turn', T.street === 'play' && T.turn === i);
      v.el.classList.toggle('win', T.street === 'done' && T.result && T.result.winner === i);
      if (i) {
        const n = s.cards.length;
        const key = String(n);
        if (v.count.dataset.key !== key) {
          v.count.dataset.key = key;
          v.count.replaceChildren(h('span', { class: 'bt-backs' }, ...[0, 1, 2].slice(0, Math.min(3, n)).map(() => h('i'))), h('b', null, n));
        }
        v.count.classList.toggle('alarm', T.street === 'play' && n > 0 && n <= 2);
      }
      // 這一輪的出牌（結算時亮出剩牌）
      let want = '';
      const sh = T.shown[i];
      if (T.street === 'done' && i !== 0) want = 'rest:' + s.cards.join(',');
      else if (sh === 'pass') want = 'pass';
      else if (sh) want = sh.type + ':' + sh.cards.join(',');
      if (v.out.dataset.key !== want) {
        v.out.dataset.key = want;
        if (!want) v.out.replaceChildren();
        else if (want === 'pass') v.out.replaceChildren(h('span', { class: 'bt-pass' }, '過'));
        else if (want.startsWith('rest:')) v.out.replaceChildren(h('div', { class: 'bt-cards rest' }, ...s.cards.map((c) => cardEl(c))));
        else v.out.replaceChildren(h('div', { class: 'bt-cards' }, ...sh.cards.map((c, k) => { const e = cardEl(c, 'deal'); e.style.animationDelay = k * 40 + 'ms'; return e; })), h('small', null, TYPE_NAME[sh.type]));
      }
      v.out.classList.toggle('lead', T.street === 'play' && T.owner === i && !!T.cur);
      v.out.classList.toggle('stale', T.street === 'play' && !!T.stale);
    });
    renderHand();
    renderDock();
  }

  function say(a, b) { V.msg.replaceChildren(...(a ? [h('b', null, a)].concat(b ? [h('small', null, b)] : []) : [])); }

  // 我的手牌：依寬度自動排開，選取的牌往上抬
  function sorted() {
    const cs = T.seats[0].cards.slice();
    return prefs.sort === 'rank' ? cs.sort((a, b) => a - b) : cs.sort((a, b) => suitOf(a) - suitOf(b) || rankOf(a) - rankOf(b));
  }
  function renderHand() {
    if (!V || !T) return;
    const cs = sorted();
    const W = V.hand.clientWidth || 360;
    const cw = Math.round(Math.min(84, Math.max(50, W * 0.19)));
    const n = cs.length;
    const step = n > 1 ? Math.min(cw * 0.66, (W - 8 - cw) / (n - 1)) : 0;
    const x0 = (W - (cw + step * (n - 1))) / 2;
    V.hand.style.setProperty('--cw', cw + 'px');
    const have = new Map([...V.hand.children].map((e) => [+e.dataset.c, e]));
    for (const [c, e] of have) if (!cs.includes(c)) e.remove();
    cs.forEach((c, k) => {
      let e = have.get(c);
      if (!e) {
        e = cardEl(c, V.dealing ? 'dealt' : '');
        if (V.dealing) { e.style.animationDelay = k * 45 + 'ms'; const el = e; setTimeout(() => el.classList.remove('dealt'), 1400); }
        V.hand.appendChild(e);
      }
      e.style.left = x0 + k * step + 'px';
      e.style.zIndex = k + 1;
      e.classList.toggle('sel', sel.has(c));
    });
    // 依排序調整 DOM 順序，讓重疊時右邊的牌在上
    cs.forEach((c) => { const e = V.hand.querySelector('[data-c="' + c + '"]'); if (e) V.hand.appendChild(e); });
  }

  function bindHand(el) {
    // 點一下切換一張；按住滑過時，從起點到目前位置之間的牌一起選取（或一起取消）
    let mode = null, last = -1; const seen = new Set();
    const at = (e) => { const t = document.elementFromPoint(e.clientX, e.clientY); const c = t && t.closest && t.closest('.bt-hand .bt-c'); return c ? +c.dataset.c : null; };
    const apply = (c) => {
      if (c == null) return;
      const order = sorted(), k = order.indexOf(c);
      if (k < 0) return;
      const from = last < 0 ? k : last;
      for (let j = Math.min(from, k); j <= Math.max(from, k); j++) {
        const x = order[j];
        if (seen.has(x)) continue;
        seen.add(x);
        if (mode) sel.add(x); else sel.delete(x);
      }
      last = k; hintList = null; renderHand(); renderDock();
    };
    el.addEventListener('pointerdown', (e) => {
      if (!T || T.street !== 'play') return;
      const c = at(e); if (c == null) return;
      e.preventDefault();
      seen.clear(); last = -1; mode = !sel.has(c); apply(c);
      audio.play('card', { volume: 0.18, rate: 1.6 });
      el.setPointerCapture && el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => { if (mode == null) return; apply(at(e)); });
    const end = () => { mode = null; };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }

  const button = (label, sub, fn, cls = '', disabled = false) => h('button', { class: 'btn ' + cls, disabled, onClick: fn }, h('span', null, label), sub ? h('small', null, sub) : null);

  function renderDock() {
    if (!V) return;
    const me = T.seats[0];
    if (T.street !== 'play') {
      if (T.street === 'done' || T.street === 'idle') {
        const need = Math.min(T.buyIn, store.balance());
        if (me.stack <= 0) {
          V.dock.replaceChildren(h('div', { class: 'bt-row' }, button('離桌', '', leave), button('補碼', need >= T.unit * MIN_UNITS / 2 ? fmt(need) : '遊戲幣不足', () => rebuy(need), 'btn-gold', need < T.unit * MIN_UNITS / 2)));
          return;
        }
        const top = Math.min(T.buyIn - me.stack, store.balance());
        V.dock.replaceChildren(h('div', { class: 'bt-row' },
          button('離桌', '帶走 ' + short(me.stack), leave),
          top >= T.unit * 10 ? button('補滿', '+' + short(top), () => rebuy(top)) : null,
          button('下一局', '', () => { clearTimeout(nextTimer); nextHand(); }, 'btn-gold')));
      }
      return;
    }
    const mine = T.turn === 0 && !busy;
    const cards = [...sel];
    const r = cards.length ? check(T, 0, cards) : null;
    const playSub = !cards.length ? (T.mustClub3 && mine ? '須含梅花 3' : '') : r.ok ? TYPE_NAME[r.combo.type] : r.why;
    V.dock.replaceChildren(h('div', { class: 'bt-row' },
      button('過', '', () => human(null), '', !mine || !T.cur),
      button('提示', '', hint, '', !mine),
      button('出牌', playSub, () => human(cards), 'btn-gold', !mine || !r || !r.ok)));
  }

  function hint() {
    if (T.turn !== 0) return;
    if (!hintList) {
      const hand = T.seats[0].cards;
      const list = hints(hand, T.cur, T.mustClub3);
      if (!list.length) { toast('沒有壓得過的牌，只能過'); return; }
      // 第一個提示用推演挑出的出法；推演認為該過時，第一次按只提示「過」
      const best = searchMove({ hands: T.seats.map((s) => s.cards), me: 0, cur: T.cur, owner: T.owner, passed: T.passed, mustClub3: T.mustClub3, played: T.played }, { samples: 16, width: 6 });
      hintList = best ? [best].concat(list.filter((c) => c.join() !== best.join())) : [null].concat(list);
      hintIdx = 0;
    }
    const pick = hintList[hintIdx % hintList.length];
    hintIdx++;
    if (!pick) toast('建議這一輪先過；再按提示可看其他出法');
    sel = new Set(pick || []);
    renderHand(); renderDock();
  }

  // ---------------- 流程 ----------------
  const save = () => store.saveGame(ID, { T, M });

  async function nextHand() {
    if (!alive || !T || busy) return;
    clearTimeout(nextTimer);
    if (T.seats[0].stack <= 0) { render(); return; }
    busy = true;
    if (T.street === 'done') {
      // 收牌清桌
      V.el.classList.add('mucking');
      await sleep(360);
      if (!alive || !V) return;
      V.el.classList.remove('mucking');
    }
    const notes = startHand(T);
    M.hands++;
    sel = new Set(); hintList = null;
    V.result.classList.remove('show');
    V.hand.replaceChildren();
    V.dealing = true;
    say(null);
    audio.play('shuffle', { volume: 0.45 });
    render();
    V.dealing = false;
    if (notes.length) toast(notes.join('；'), 2600);
    save();
    await sleep(900);
    busy = false;
    const first = T.seats[T.turn];
    say(T.turn === 0 ? '你有梅花 3，由你先出' : first.name + ' 有梅花 3，先出', T.turn === 0 ? '第一手要包含梅花 3' : '');
    render();
    await sleep(T.turn === 0 ? 0 : 900);
    loop();
  }

  async function loop() {
    if (busy || !T) return;
    busy = true;
    try {
      while (alive && T && T.street === 'play' && T.turn !== 0) {
        const i = T.turn;
        V.seats[i].think.textContent = '';
        render();
        const t0 = performance.now();
        await sleep(30);
        const mv = botMove(T, i);
        const wait = (T.level >= 2 ? 750 : 600) + Math.random() * 500 - (performance.now() - t0);
        await sleep(Math.max(120, wait));
        if (!alive || !T) return;
        step(i, mv);
        await sleep(mv ? 260 : 120);
      }
    } finally { busy = false; }
    if (!alive || !T) return;
    if (T.street === 'done') endHand();
    else { if (T.turn === 0 && !T.cur && !T.mustClub3) say('你收下這一輪', '自由出牌'); render(); }
  }

  function step(i, cards) {
    const r = cards ? play(T, i, cards) : pass(T, i);
    if (cards) {
      const p = classify(cards);
      audio.play(p.type === 'four' || p.type === 'sflush' ? 'chips' : 'card', { volume: 0.75 });
      say(null);
    } else audio.play('flip', { volume: 0.2, rate: 1.3 });
    save();
    render();
    return r;
  }

  async function human(cards) {
    if (busy || !T || T.turn !== 0 || T.street !== 'play') return;
    if (cards && !check(T, 0, cards).ok) return;
    if (!cards && !T.cur) return;
    sel = new Set(); hintList = null;
    step(0, cards);
    if (T.street === 'done') return endHand();
    await sleep(300);
    loop();
  }

  function endHand() {
    const R = T.result;
    if (!R) return;
    const me = R.rows[0];
    if (!R.handled) {
      R.handled = true;
      if (R.winner === 0) { M.wins++; M.best = Math.max(M.best, me.amount); audio.play('payout', { volume: 0.8 }); if (me.amount >= T.unit * 20) audio.chime('win'); }
      else audio.play('chip', { volume: 0.6 });
      save();
    }
    const w = T.seats[R.winner];
    say(null);
    V.result.replaceChildren(
      h('b', null, (R.winner === 0 ? '你' : w.name) + ' 出完了'),
      h('div', { class: 'bt-rows' }, ...R.rows.map((row) => {
        const s = T.seats[row.seat];
        return h('div', { class: 'bt-rrow' + (row.seat === R.winner ? ' won' : '') + (row.seat === 0 ? ' me' : '') },
          h('span', null, row.seat === 0 ? '你' : s.name),
          h('em', null, row.seat === R.winner ? '贏家' : row.n + ' 張' + (row.mult > 1 ? ' ×' + row.mult : '')),
          h('b', { class: 'num ' + (row.amount > 0 ? 'pos' : row.amount < 0 ? 'neg' : '') }, (row.amount > 0 ? '+' : row.amount < 0 ? '−' : '') + fmt(Math.abs(row.amount))));
      })));
    V.result.classList.add('show');
    render();
  }

  function rebuy(amount) {
    if (amount < T.unit * 10 || !store.hold(ID, amount)) return toast('遊戲幣不足');
    T.seats[0].stack += amount;
    M.bought += amount;
    audio.play('chips');
    toast('補入 ' + fmt(amount) + ' 籌碼');
    save();
    render();
  }

  async function leave() {
    const me = T.seats[0];
    const inHand = T.street === 'play';
    const p = inHand ? penalty(me.cards) : null;
    const lose = inHand ? Math.min(me.stack, p.points * T.unit) : 0;
    const body = inHand ? '這一局還沒打完，離桌視同輸，要賠 ' + fmt(lose) + '。<br>' : '';
    if (!(await confirmBox('離桌', body + '帶走 <b class="num">' + fmt(me.stack - lose) + '</b> 籌碼，換回遊戲幣？', '離桌', '繼續打'))) return;
    if (!T) return;
    clearTimeout(nextTimer);
    const stack = me.stack - lose;
    const net = stack - M.bought;
    const result = net > 0 ? 'win' : net < 0 ? 'lose' : 'draw';
    const t = TIERS[M.tier];
    const ev = store.settle(ID, { gameName: NAME, mode: t.label + ' 每點 ' + fmt(t.unit), result, payout: stack, note: M.hands + ' 局 · 贏 ' + M.wins + ' 局 · 帶入 ' + fmt(M.bought) + ' · 帶走 ' + fmt(stack), marks: { btHands: M.hands } });
    const hands = M.hands, best = M.best, bought = M.bought;
    T = null; V = null; busy = false;
    audio.chime(result === 'win' ? 'win' : result === 'lose' ? 'lose' : 'draw');
    showSetup();
    modal({
      title: '離桌結算', center: true,
      body: h('div', null, h('div', { class: 'result-figure ' + (ev.delta > 0 ? 'pos' : ev.delta < 0 ? 'neg' : '') }, (ev.delta > 0 ? '+' : ev.delta < 0 ? '−' : '') + fmt(Math.abs(ev.delta))),
        h('div', { class: 'result-lines' },
          h('div', null, h('span', null, '打了'), h('span', null, hands + ' 局')),
          h('div', null, h('span', null, '帶入／帶走'), h('span', null, fmt(bought) + ' → ' + fmt(stack))),
          h('div', null, h('span', null, '單局最多贏'), h('span', null, best ? fmt(best) : '—')),
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
    if (T.street === 'done') endHand();
    else if (T.street === 'idle') nextHand();
    else loop();
  } else { store.release(ID); showSetup(); }

  return () => { alive = false; clearTimeout(nextTimer); };
}
