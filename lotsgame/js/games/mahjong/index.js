// 台灣十六張麻將：你與三位電腦玩家，底／台計分，帶入籌碼，離桌時換回遊戲幣。
import * as store from '../../store.js';
import * as audio from '../../audio.js';
import { h, fmt, toast, modal, confirmBox, asset } from '../../ui.js';
import { segmented, hero } from '../shared/setup.js';
import {
  createGame, startHand, draw, selfOptions, claimOptions, hasClaim, discard, doClaim, doAnkan, doKakan, finishWin,
  aiDiscard, aiClaim, aiSelf, next, liveLeft, unseenFor, tileName, typeOf, shanten, waits, counts,
} from './game.js';
import { WINDS } from './rules.js';

const ID = 'mahjong', NAME = '台灣麻將';
const STAKES = {
  s: { label: '小場', di: 100, tai: 50, buy: 10000 },
  m: { label: '中場', di: 300, tai: 100, buy: 30000 },
  l: { label: '大場', di: 1000, tai: 500, buy: 100000 },
};
const BOT_NAMES = ['阿嬤', '王董', '小陳', '林姐', '阿忠', '美玲', '老張', '阿明', '淑芬', '志偉'];

export const RULES = `
<h4>目標</h4>
<p>手上湊成<strong>五組面子加一對眼</strong>（共 17 張）就胡牌。面子是順子（同花色連續三張，例如三四五萬）或刻子（三張相同）。</p>
<h4>牌</h4>
<ul>
<li>萬、筒、條各 1–9 每種 4 張；東南西北、中發白各 4 張；春夏秋冬梅蘭竹菊花牌各 1 張，共 144 張。</li>
<li>每人 16 張，莊家 17 張。摸到花牌會自動亮出，從牌尾補一張。</li>
<li>牌牆最後 16 張不摸，摸完仍無人胡就是流局。</li>
</ul>
<h4>流程與操作</h4>
<ul>
<li>輪到你時先摸牌，再<strong>點一張牌選起、再點一次打出</strong>（或按「打出」）。選起時下方會提示打這張之後聽哪些牌。</li>
<li><strong>吃</strong>：只能吃上家（左邊）打的牌組成順子。<strong>碰</strong>：任何人打出你有一對的牌。<strong>槓</strong>：四張相同，暗槓、明槓、加槓都可以，槓完從牌尾補牌。</li>
<li><strong>胡</strong>：別人打出或自己摸到能胡的牌。同時有人要胡、碰、吃時，胡優先，其次碰槓，最後才是吃；兩人都要胡時由下家先胡（截胡）。</li>
<li>有人加槓時，若那張牌你能胡，可以<strong>搶槓</strong>。</li>
</ul>
<h4>台數</h4>
<table>
<tr><th>台型</th><th>台數</th></tr>
<tr><td>莊家（莊家胡或放槍給莊家、莊家被自摸）</td><td>1，連莊再加 2 × 連莊數</td></tr>
<tr><td>門清（沒有吃、碰、明槓）／自摸</td><td>各 1</td></tr>
<tr><td>門清自摸</td><td>3</td></tr>
<tr><td>中、發、白刻子；圈風刻；門風刻；正花</td><td>各 1</td></tr>
<tr><td>獨聽（邊張、中洞、單吊）；槓上開花；海底撈月；河底撈魚；搶槓</td><td>各 1</td></tr>
<tr><td>平胡（無花無字、全順子、兩面聽、胡別人）；全求人；三暗刻；花槓</td><td>各 2</td></tr>
<tr><td>碰碰胡；混一色；小三元</td><td>各 4</td></tr>
<tr><td>四暗刻</td><td>5</td></tr>
<tr><td>清一色；大三元；小四喜；五暗刻；八仙過海；七搶一</td><td>各 8</td></tr>
<tr><td>地胡</td><td>16</td></tr>
<tr><td>大四喜；字一色</td><td>16</td></tr>
<tr><td>天胡</td><td>24</td></tr>
</table>
<p>正花：東家（莊）是春、梅，南家是夏、蘭，西家是秋、竹，北家是冬、菊。集滿春夏秋冬或梅蘭竹菊為花槓。沒有台也可以胡（屁胡）。</p>
<h4>遊戲幣</h4>
<table>
<tr><th>場次</th><th>底 / 台</th><th>帶入</th></tr>
${Object.values(STAKES).map((s) => `<tr><td>${s.label}</td><td>${fmt(s.di)} / ${fmt(s.tai)}</td><td>${fmt(s.buy)}</td></tr>`).join('')}
</table>
<p>每把結算：<strong>放槍</strong>的人付給胡牌者「底 + 台 × 台數」；<strong>自摸</strong>則另外三家各付一份。莊家相關的那一份另加莊家台與連莊台。流局或莊家胡牌則連莊。</p>
<p>入座時從餘額帶入籌碼，<strong>離桌時剩下的籌碼換回遊戲幣</strong>，比帶入多就算贏。籌碼不夠付時付到 0 為止，可以補碼再打。牌局中途離開會保留牌局，回來可以接著打。</p>`;

const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
const short = (n) => (Math.abs(n) >= 100000 ? Math.round(n / 1000) + 'K' : fmt(n));
const sortHand = (ids) => ids.slice().sort((a, b) => typeOf(a) - typeOf(b) || a - b);

export async function mount(root) {
  let alive = true, G = null, M = null, V = null, waiter = null, sel = -1, running = false;
  const prefs = Object.assign({ stake: 's' }, store.getData().settings.mahjong || {});

  // ---------------- 入座 ----------------
  function showSetup() {
    G = null; M = null; V = null;
    const bal = store.balance();
    if (bal < STAKES[prefs.stake].buy) prefs.stake = 's';
    const summary = h('div', { class: 'stake-summary' });
    const startBtn = h('button', { class: 'btn btn-gold btn-block' }, '入座');
    const refresh = () => {
      const s = STAKES[prefs.stake];
      summary.replaceChildren(h('div', null, h('small', null, '底 / 台'), h('b', null, fmt(s.di) + ' / ' + fmt(s.tai))), h('div', null, h('small', null, '帶入'), h('b', { class: 'pos' }, fmt(s.buy))));
      startBtn.disabled = bal < s.buy;
      startBtn.textContent = bal < s.buy ? '遊戲幣不足' : '入座';
    };
    root.replaceChildren(h('div', { class: 'setup' },
      hero(ID, NAME, '十六張 · 四人對局 · 台數照台灣規矩'),
      segmented({ label: '場次', hint: '餘額 ' + fmt(bal), value: prefs.stake, options: Object.entries(STAKES).map(([k, s]) => ({ value: k, label: s.label, sub: fmt(s.di) + '/' + fmt(s.tai), disabled: bal < s.buy })), onChange: (v) => { prefs.stake = v; refresh(); } }),
      summary, startBtn,
      h('p', { class: 'login-note', style: 'text-align:center' }, '離桌時剩下的籌碼換回遊戲幣。')));
    refresh();
    startBtn.onclick = () => {
      const s = STAKES[prefs.stake];
      if (!store.hold(ID, s.buy)) return toast('遊戲幣不足');
      store.setSetting('mahjong', { stake: prefs.stake });
      audio.play('chips');
      const names = BOT_NAMES.slice().sort(() => Math.random() - 0.5).slice(0, 3);
      G = createGame({ names: [store.getData().user, ...names], chips: [s.buy, s.buy, s.buy, s.buy], di: s.di, tai: s.tai });
      G.dealer = Math.floor(Math.random() * 4);
      M = { stake: prefs.stake, bought: s.buy, hands: 0, wins: 0, best: 0 };
      build();
      newHand();
    };
  }

  // ---------------- 畫面 ----------------
  const tileEl = (id, cls = '') => {
    const t = typeOf(id);
    return h('div', { class: 'mj-t ' + cls, dataset: { id } }, h('img', { src: asset('mahjong/t' + t + '.webp'), alt: tileName(t), draggable: false }));
  };
  const backEl = (cls = '') => h('div', { class: 'mj-t back ' + cls });

  function build() {
    const opp = (p, pos) => {
      const o = { name: h('b'), chips: h('span'), badge: h('i', { class: 'mj-wind' }), melds: h('div', { class: 'mj-melds' }), hand: h('div', { class: 'mj-backs' }), flowers: h('div', { class: 'mj-flowers' }) };
      o.el = h('div', { class: 'mj-opp ' + pos }, h('div', { class: 'mj-plate' }, o.badge, h('div', null, o.name, o.chips)), o.flowers, o.melds, o.hand);
      return o;
    };
    const rivers = [0, 1, 2, 3].map((p) => h('div', { class: 'mj-river r' + p }));
    const center = h('div', { class: 'mj-center' });
    const me = { melds: h('div', { class: 'mj-melds' }), flowers: h('div', { class: 'mj-flowers' }), hand: h('div', { class: 'mj-hand' }), badge: h('i', { class: 'mj-wind' }), chips: h('span') };
    const status = h('div', { class: 'mj-status' });
    const bar = h('div', { class: 'mj-bar' });
    const info = h('div', { class: 'pk-info' });
    const top = opp(2, 'top'), left = opp(3, 'left'), right = opp(1, 'right');
    root.replaceChildren(h('div', { class: 'mj' },
      h('div', { class: 'pk-bar' }, info, h('button', { class: 'pk-leave', onClick: leave }, '離桌')),
      h('div', { class: 'mj-table' },
        top.el,
        h('div', { class: 'mj-mid' }, left.el,
          h('div', { class: 'mj-pond' }, rivers[2], h('div', { class: 'mj-pond-mid' }, rivers[3], center, rivers[1]), rivers[0]),
          right.el)),
      h('div', { class: 'mj-me' },
        h('div', { class: 'mj-me-top' }, h('div', { class: 'mj-plate me' }, me.badge, h('div', null, h('b', null, '你'), me.chips)), me.flowers, me.melds),
        me.hand, status, bar)));
    V = { opp: { 1: right, 2: top, 3: left }, rivers, center, me, status, bar, info };
  }

  const seatWind = (p) => (p - G.dealer + 4) % 4;
  const RELN = { 1: '下家', 2: '對家', 3: '上家' };

  function render() {
    if (!V || !G) return;
    const s = STAKES[M.stake];
    V.info.textContent = s.label + ' ' + fmt(s.di) + '/' + fmt(s.tai) + ' · ' + WINDS[G.round] + '風圈 · 第 ' + G.hands + ' 把';
    const last = G.lastDiscard;
    for (const p of [1, 2, 3]) {
      const P = G.players[p], o = V.opp[p];
      o.name.textContent = P.name;
      o.chips.textContent = short(P.chips);
      paintBadge(o.badge, p);
      o.el.classList.toggle('turn', G.phase !== 'done' && G.turn === p);
      setKids(o.flowers, P.flowers.map((id) => tileEl(id, 'xs')), 'f' + P.flowers.join());
      setKids(o.melds, P.melds.map(meldEl), 'm' + P.melds.map((m) => m.ids.join('.') + (m.concealed ? 'c' : '')).join());
      const showHand = G.phase === 'done' && G.result;
      setKids(o.hand, showHand ? sortHand(P.hand).map((id) => tileEl(id, 'xs')) : P.hand.map(() => backEl('xs')), (showHand ? 'o' : 'b') + P.hand.length + (showHand ? P.hand.join() : ''));
    }
    G.players.forEach((P, p) => {
      setKids(V.rivers[p], P.discards.map((id, k) => tileEl(id, 'rv' + (last && last.from === p && k === P.discards.length - 1 && G.phase === 'claim' ? ' hot' : ''))), 'r' + P.discards.join() + (last && last.from === p && G.phase === 'claim' ? 'h' : ''));
    });
    V.center.replaceChildren(h('b', null, WINDS[G.round] + '風'), h('span', null, '剩 ' + Math.max(0, liveLeft(G)) + ' 張'), ...(G.lian ? [h('small', null, '連 ' + G.lian)] : []));
    // 自己
    const me = G.players[0];
    V.me.chips.textContent = fmt(me.chips);
    V.me.hand.parentElement.classList.toggle('turn', G.phase !== 'done' && G.turn === 0);
    paintBadge(V.me.badge, 0);
    setKids(V.me.flowers, me.flowers.map((id) => tileEl(id, 'xs')), 'f' + me.flowers.join());
    setKids(V.me.melds, me.melds.map(meldEl), 'm' + me.melds.map((m) => m.ids.join('.')).join());
    renderHand();
  }

  function setKids(el, kids, key) { if (el.dataset.key === key) return; el.dataset.key = key; el.replaceChildren(...kids); }
  function paintBadge(el, p) { el.textContent = WINDS[seatWind(p)]; el.classList.toggle('dealer', p === G.dealer); el.title = p === G.dealer ? '莊' : ''; }
  function meldEl(m) {
    const ids = m.kind === 'chow' ? m.ids.slice().sort((a, b) => typeOf(a) - typeOf(b)) : m.ids;
    return h('div', { class: 'mj-meld' }, ids.map((id, k) => (m.concealed && (k === 0 || k === 3) ? backEl('sm') : tileEl(id, 'sm'))));
  }

  function renderHand() {
    const me = G.players[0];
    const myTurn = G.phase === 'act' && G.turn === 0 && waiter && waiter.kind === 'act';
    const drawn = myTurn && me.lastDraw >= 0 && me.hand.includes(me.lastDraw) ? me.lastDraw : -1;
    const rest = sortHand(me.hand.filter((id) => id !== drawn));
    const done = G.phase === 'done';
    const mk = (id, extra = '') => {
      const el = tileEl(id, 'hd' + extra + (id === sel ? ' sel' : ''));
      if (myTurn) el.onclick = () => onTile(id);
      return el;
    };
    const tiles = rest.map((id) => mk(id));
    if (drawn >= 0) tiles.push(h('i', { class: 'mj-gap' }), mk(drawn, ' new'));
    V.me.hand.classList.toggle('two', me.hand.length > 9);
    V.me.hand.classList.toggle('live', myTurn);
    V.me.hand.classList.toggle('done', done);
    V.me.hand.replaceChildren(...tiles);
  }

  function onTile(id) {
    if (!waiter || waiter.kind !== 'act') return;
    if (sel === id) { const w = waiter; waiter = null; sel = -1; w.resolve({ kind: 'discard', id }); return; }
    sel = id;
    audio.play('chip', { volume: 0.25, rate: 1.4 });
    renderHand();
    showActBar();
  }

  // 打某張之後聽哪些牌
  function waitHint(id) {
    const me = G.players[0];
    const c = counts(me.hand.filter((x) => x !== id));
    const m = 5 - me.melds.length;
    const sh = shanten(c, m);
    if (sh > 0) return sh === 1 ? '打這張：一向聽' : '';
    const unseen = unseenFor(G, 0);
    const ws = waits(c, m);
    const left = ws.reduce((a, t) => a + unseen[t], 0);
    return '打這張聽：' + ws.map(tileName).join('、') + '（剩 ' + left + ' 張）';
  }

  const btn = (label, fn, cls = '') => h('button', { class: 'btn ' + cls, onClick: fn }, label);

  function showActBar() {
    if (!waiter || waiter.kind !== 'act') return;
    const so = waiter.so;
    const resolve = (v) => { const w = waiter; waiter = null; sel = -1; w.resolve(v); };
    const kids = [];
    if (so.tsumo) kids.push(btn('自摸', () => resolve({ kind: 'tsumo' }), 'btn-gold'));
    for (const t of so.ankan) kids.push(btn('暗槓 ' + tileName(t), () => resolve({ kind: 'ankan', t })));
    for (const t of so.kakan) kids.push(btn('加槓 ' + tileName(t), () => resolve({ kind: 'kakan', t })));
    kids.push(btn('打出', () => { if (sel >= 0) resolve({ kind: 'discard', id: sel }); }, so.tsumo ? '' : 'btn-gold'));
    V.bar.replaceChildren(...kids);
    V.bar.lastChild.disabled = sel < 0;
    V.status.textContent = sel >= 0 ? waitHint(sel) || '再點一次同一張，或按「打出」' : so.tsumo ? '可以自摸！' : '點選要打出的牌';
  }

  function showClaimBar(o, id) {
    const resolve = (v) => { const w = waiter; waiter = null; w.resolve(v); };
    const kids = [];
    if (o.ron) kids.push(btn('胡', () => resolve({ kind: 'ron' }), 'btn-gold'));
    if (o.kong) kids.push(btn('槓', () => resolve({ kind: 'kong' })));
    if (o.pung) kids.push(btn('碰', () => resolve({ kind: 'pung' })));
    for (const s of o.chows) kids.push(h('button', { class: 'btn mj-chow', onClick: () => resolve({ kind: 'chow', chow: s }) }, h('span', null, '吃'), h('span', { class: 'mj-chow-tiles' }, [s, s + 1, s + 2].map((t) => h('img', { src: asset('mahjong/t' + t + '.webp'), alt: tileName(t) })))));
    kids.push(btn('過', () => resolve({ kind: 'pass' })));
    V.bar.replaceChildren(...kids);
    V.status.textContent = RELN[G.lastDiscard ? G.lastDiscard.from : 1] ? RELN[G.lastDiscard.from] + '打出 ' + tileName(typeOf(id)) : '';
  }

  function idleBar(text) { V.bar.replaceChildren(); V.status.textContent = text || ''; }

  // ---------------- 流程 ----------------
  const save = () => { if (G && G.phase !== 'idle') store.saveGame(ID, { G, M }); };
  const ask = (kind, extra) => new Promise((resolve) => { waiter = { kind, resolve, ...extra }; });

  function newHand() {
    if (!G) return;
    if (G.players[0].chips <= 0) return showBroke();
    // 輸光的電腦玩家換人
    G.players.forEach((P, p) => {
      if (p && P.chips <= 0) {
        const old = P.name;
        const pool = BOT_NAMES.filter((n) => !G.players.some((x) => x.name === n));
        P.name = pool[(Math.random() * pool.length) | 0];
        P.chips = STAKES[M.stake].buy;
        toast(old + ' 離桌，' + P.name + ' 入座');
      }
    });
    startHand(G);
    M.hands++;
    sel = -1;
    audio.play('shuffle', { volume: 0.5 });
    render();
    save();
    run();
  }

  async function run() {
    if (running) return;
    running = true;
    try {
      while (alive && G && G.phase !== 'done') {
        render();
        if (G.phase === 'act') await actPhase();
        else if (G.phase === 'claim') await claimPhase();
        else break;
        save();
      }
    } finally { running = false; }
    if (alive && G && G.phase === 'done') showResult();
  }

  async function actPhase() {
    const p = G.turn;
    const so = selfOptions(G, p);
    let a;
    if (p === 0) {
      sel = -1;
      const pr = ask('act', { so });
      render();
      showActBar();
      a = await pr;
      idleBar();
    } else {
      await sleep(520 + Math.random() * 380);
      if (!alive) return;
      a = aiSelf(G, p, so) || { kind: 'discard', id: aiDiscard(G, p) };
    }
    if (!G) return;
    if (a.kind === 'tsumo') { finishWin(G, p, { selfDraw: true }); return; }
    if (a.kind === 'ankan') { audio.play('stone'); doAnkan(G, p, a.t); return; }
    if (a.kind === 'kakan') {
      // 搶槓
      const P = G.players[p];
      const id = P.hand.find((x) => typeOf(x) === a.t);
      for (let k = 1; k < 4; k++) {
        const q = (p + k) % 4;
        const o = claimOptions(G, q, id, p);
        if (!o.ron) continue;
        let take = q !== 0;
        if (q === 0) { const pr = ask('claim'); render(); showClaimBar({ ron: true, pung: false, kong: false, chows: [] }, id); V.status.textContent = RELN[p] + '加槓 ' + tileName(a.t) + '，可以搶槓'; take = (await pr).kind === 'ron'; idleBar(); }
        if (take) { P.hand.splice(P.hand.indexOf(id), 1); finishWin(G, q, { selfDraw: false, from: p, tile: id, robKong: true }); return; }
      }
      audio.play('stone');
      doKakan(G, p, a.t);
      return;
    }
    discard(G, p, a.id);
    audio.play('stone', { volume: 0.9 });
  }

  async function claimPhase() {
    const { id, from } = G.lastDiscard;
    render();
    const decisions = [];
    for (let k = 1; k < 4; k++) {
      const q = (from + k) % 4;
      const o = claimOptions(G, q, id, from);
      if (!hasClaim(o)) continue;
      if (q === 0) {
        const pr = ask('claim');
        showClaimBar(o, id);
        const d = await pr;
        idleBar();
        decisions.push({ q, ...d });
      } else decisions.push({ q, ...aiClaim(G, q, o, id) });
    }
    if (!G) return;
    const ron = decisions.find((d) => d.kind === 'ron');
    if (ron) { finishWin(G, ron.q, { selfDraw: false, from, tile: id }); return; }
    const pk = decisions.find((d) => d.kind === 'pung' || d.kind === 'kong');
    const ch = decisions.find((d) => d.kind === 'chow');
    const take = pk || ch;
    if (take) {
      await sleep(take.q === 0 ? 120 : 380);
      if (!alive || !G) return;
      flash(take.q, { pung: '碰', kong: '槓', chow: '吃' }[take.kind]);
      audio.play('stone', { rate: 0.9 });
      doClaim(G, take.q, take.kind, take.chow);
      return;
    }
    await sleep(from === 3 ? 120 : 200);
    if (!alive || !G) return;
    const r = draw(G, next(from));
    if (r && next(from) === 0) audio.play('chip', { volume: 0.4, rate: 1.2 });
  }

  function flash(p, text) {
    const host = p === 0 ? V.me.hand : V.opp[p].el;
    const el = h('div', { class: 'mj-flash' }, text);
    host.append(el);
    setTimeout(() => el.remove(), 900);
  }

  function showResult() {
    const R = G.result;
    if (!R || R.shown) { render(); return endBar(); }
    R.shown = true;
    render();
    const s = STAKES[M.stake];
    let delta = 0;
    if (R.type === 'win') {
      for (const x of R.pays) { if (x.from === 0) delta -= x.paid; }
      if (R.winner === 0) { delta = R.pays.reduce((a, x) => a + x.paid, 0); M.wins++; M.best = Math.max(M.best, R.tai); }
    }
    save();
    const W = R.type === 'win' ? G.players[R.winner] : null;
    const who = (p) => (p === 0 ? '你' : G.players[p].name);
    const title = R.type === 'draw' ? '流局' : (R.winner === 0 ? '你' : W.name) + (R.selfDraw ? ' 自摸' : ' 胡牌');
    if (R.type === 'win') { if (R.winner === 0) { audio.chime('win'); audio.play('payout'); } else if (delta < 0) audio.chime('lose'); else audio.chime('draw'); }
    else audio.chime('draw');
    const body = h('div', { class: 'mj-result' });
    if (R.type === 'win') {
      const melds = W.melds.map(meldEl);
      body.append(h('div', { class: 'mj-res-hand' }, melds, sortHand(W.hand).map((id) => tileEl(id, 'sm' + (R.tile === id || (R.selfDraw && W.lastDraw === id) ? ' win' : '')))));
      body.append(h('div', { class: 'mj-res-sub' }, R.selfDraw ? '自摸 ' + tileName(typeOf(W.lastDraw)) : who(R.from) + ' 放槍 ' + tileName(typeOf(R.tile))));
      const lines = R.items.map(([n, t]) => h('div', null, h('span', null, n), h('span', null, t + ' 台')));
      if (R.pays.some((x) => x.extra)) lines.push(h('div', null, h('span', null, '莊家' + (R.lian ? '（連 ' + R.lian + ' 拉 ' + R.lian + '）' : '')), h('span', null, (1 + 2 * R.lian) + ' 台')));
      if (!R.items.length) lines.push(h('div', null, h('span', null, '屁胡'), h('span', null, '0 台')));
      body.append(h('div', { class: 'result-lines' }, ...lines,
        h('div', null, h('span', null, '牌型台數'), h('span', null, R.tai + ' 台 · 底 ' + fmt(s.di) + ' · 每台 ' + fmt(s.tai))),
        ...R.pays.map((x) => h('div', null, h('span', null, who(x.from) + ' 付'), h('span', null, fmt(x.paid) + (x.paid < x.amount ? '（不足 ' + fmt(x.amount) + '）' : ''))))));
    } else body.append(h('p', { style: 'text-align:center' }, '牌摸完了，沒有人胡牌。莊家連莊。'));
    body.prepend(h('div', { class: 'result-figure ' + (delta > 0 ? 'pos' : delta < 0 ? 'neg' : '') }, (delta > 0 ? '+' : delta < 0 ? '−' : '') + fmt(Math.abs(delta))));
    endBar();
    setTimeout(() => {
      if (!alive || !G) return;
      modal({ title, body, center: true, actions: [{ label: '看牌桌', value: 'view' }, { label: '下一把', value: 'next', kind: 'gold' }] })
        .then((v) => { if (v === 'next' && alive && G) newHand(); });
    }, 500);
  }

  function endBar() {
    const me = G.players[0];
    V.status.textContent = '帶入 ' + fmt(M.bought) + ' · 目前 ' + fmt(me.chips);
    V.bar.replaceChildren(btn('離桌', leave), me.chips > 0 ? btn('下一把', () => newHand(), 'btn-gold') : btn('補碼', rebuy, 'btn-gold'));
  }

  function showBroke() { render(); endBar(); toast('籌碼不足，可以補碼或離桌'); }

  function rebuy() {
    const s = STAKES[M.stake];
    if (!store.hold(ID, s.buy)) return toast('遊戲幣不足');
    G.players[0].chips += s.buy;
    M.bought += s.buy;
    audio.play('chips');
    save();
    render();
    endBar();
  }

  async function leave() {
    if (!G) return;
    const me = G.players[0];
    const mid = G.phase !== 'done';
    if (!(await confirmBox('離桌', (mid ? '這把還沒打完，離桌後這把不計輸贏。<br>' : '') + '帶走 <b class="num">' + fmt(me.chips) + '</b> 籌碼，換回遊戲幣？', '離桌', '繼續打'))) return;
    if (!G) return;
    const chips = Math.max(0, me.chips);
    const net = chips - M.bought;
    const result = net > 0 ? 'win' : net < 0 ? 'lose' : 'draw';
    const s = STAKES[M.stake];
    const ev = store.settle(ID, { gameName: NAME, mode: s.label + ' ' + fmt(s.di) + '/' + fmt(s.tai), result, payout: chips, note: M.hands + ' 把 · 胡 ' + M.wins + ' 把 · 帶入 ' + fmt(M.bought), marks: M.best >= 8 ? { mjBigHands: 1 } : null });
    const info = M;
    if (waiter) { waiter = null; }
    G = null; V = null;
    audio.chime(result === 'win' ? 'win' : result === 'lose' ? 'lose' : 'draw');
    showSetup();
    modal({
      title: '離桌結算', center: true,
      body: h('div', null, h('div', { class: 'result-figure ' + (ev.delta > 0 ? 'pos' : ev.delta < 0 ? 'neg' : '') }, (ev.delta > 0 ? '+' : ev.delta < 0 ? '−' : '') + fmt(Math.abs(ev.delta))),
        h('div', { class: 'result-lines' },
          h('div', null, h('span', null, '打了'), h('span', null, info.hands + ' 把 · 胡 ' + info.wins + ' 把')),
          h('div', null, h('span', null, '最大一把'), h('span', null, info.best ? info.best + ' 台' : '—')),
          h('div', null, h('span', null, '結算後餘額'), h('span', null, fmt(ev.balance))))),
      actions: [{ label: '好', value: true, kind: 'gold' }],
    });
  }

  // ---------------- 啟動 ----------------
  audio.preload('stone', 'chip', 'chips', 'shuffle', 'payout');
  const saved = store.loadGame(ID);
  if (saved && saved.G && store.heldAmount(ID) > 0) {
    G = saved.G; M = saved.M;
    build();
    render();
    if (G.phase === 'done') { if (G.result) G.result.shown = false; showResult(); }
    else run();
  } else { store.release(ID); showSetup(); }

  return () => { alive = false; if (waiter) waiter = null; };
}
