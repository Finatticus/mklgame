// 21 點：六副牌、莊家 17 點停牌、Blackjack 賠 3:2，支援加倍、分牌、保險、投降。
import * as store from '../../store.js';
import * as audio from '../../audio.js';
import { h, fmt, toast, asset } from '../../ui.js';

const ID = 'blackjack', NAME = '21 點';
const DECKS = 6, MIN_BET = 100, MAX_BET = 50000, MAX_HANDS = 3;
const CHIPS = [100, 500, 1000, 5000, 10000];
const RANKS = 'A23456789TJQK', SUITS = 'SHDC';

export const RULES = `
<h4>目標</h4>
<p>手牌點數比莊家更接近 21 點，但不能超過（超過就是「爆牌」，直接輸）。</p>
<h4>點數</h4>
<ul>
<li>2–10 依牌面，J、Q、K 算 10 點，A 可算 1 或 11 點。</li>
<li>前兩張牌剛好是 A 加 10 點牌，稱為 <strong>Blackjack</strong>。</li>
</ul>
<h4>操作</h4>
<ul>
<li><strong>要牌</strong>：再拿一張。<strong>停牌</strong>：不再拿牌，換莊家。</li>
<li><strong>加倍</strong>：前兩張牌時可用，賭注加倍、只再拿一張牌。</li>
<li><strong>分牌</strong>：前兩張點數相同時，可再下一份賭注分成兩手，最多分成 3 手。分開的 A 每手只補一張。</li>
<li><strong>投降</strong>：前兩張牌、尚未分牌時可用，拿回一半賭注。</li>
<li><strong>保險</strong>：莊家明牌是 A 時可買，金額為賭注的一半。</li>
</ul>
<h4>莊家規則</h4>
<p>使用 6 副牌，剩下約四分之一時重新洗牌。莊家不到 17 點必須要牌，17 點（含軟 17）以上停牌。</p>
<h4>遊戲幣</h4>
<table>
<tr><th>結果</th><th>賠率</th></tr>
<tr><td>Blackjack</td><td>賠 3:2（下 1,000 贏 1,500）</td></tr>
<tr><td>一般獲勝</td><td>賠 1:1</td></tr>
<tr><td>平手</td><td>退回賭注</td></tr>
<tr><td>保險（莊家 Blackjack）</td><td>賠 2:1</td></tr>
<tr><td>投降</td><td>輸一半</td></tr>
<tr><td>爆牌或點數較小</td><td>輸掉賭注</td></tr>
</table>
<p>單手下注 ${fmt(MIN_BET)}–${fmt(MAX_BET)}。分牌後的 21 點不算 Blackjack，照 1:1 賠。</p>`;

const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
const cardValue = (c) => (c[0] === 'A' ? 11 : 'TJQK'.includes(c[0]) ? 10 : +c[0]);

function handValue(cards) {
  let total = 0, aces = 0;
  for (const c of cards) { total += cardValue(c); if (c[0] === 'A') aces++; }
  while (total > 21 && aces) { total -= 10; aces--; }
  return { total, soft: aces > 0 };
}
const isNatural = (hand) => hand.cards.length === 2 && !hand.fromSplit && handValue(hand.cards).total === 21;

function newShoe() {
  const shoe = [];
  for (let d = 0; d < DECKS; d++) for (const s of SUITS) for (const r of RANKS) shoe.push(r + s);
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
  return shoe;
}

export async function mount(root) {
  let alive = true;
  let lock = false;
  const prefs = Object.assign({ bet: 1000 }, store.getData().settings.blackjack || {});
  let S = { phase: 'bet', shoe: newShoe(), bet: 0, dealer: [], hole: true, hands: [], active: 0, insurance: 0, lastBet: prefs.bet, message: null };

  const saved = store.loadGame(ID);
  if (saved && store.heldAmount(ID) > 0) S = Object.assign(S, saved); else store.release(ID);

  // ---------------- 畫面 ----------------
  const dealerCards = h('div', { class: 'bj-cards' });
  const dealerTotal = h('div', { class: 'bj-total' });
  const handsEl = h('div', { class: 'bj-hands' });
  const msg = h('div', { class: 'bj-msg bj-mid' });
  const dock = h('div', { class: 'bj-dock-in' });
  root.replaceChildren(h('div', { class: 'bj' },
    h('div', { class: 'bj-arc' }),
    h('div', { class: 'bj-legend' }, h('b', null, 'BLACKJACK 賠 3 : 2'), '莊家 17 點停牌 · 保險賠 2 : 1'),
    h('div', { class: 'bj-table' },
      h('div', { class: 'bj-zone dealer' }, h('div', { class: 'bj-label' }, '莊家'), dealerCards, dealerTotal),
      msg,
      h('div', { class: 'bj-zone player' }, handsEl)),
    h('div', { class: 'bj-dock' }, dock)));

  function cardEl(code, down, animate) {
    const el = h('div', { class: 'bj-card' + (down ? ' down' : '') },
      h('div', { class: 'bj-card-in' },
        h('div', { class: 'bj-face' }, h('img', { src: asset('cards/' + code + '.webp'), alt: code, draggable: false })),
        h('div', { class: 'bj-back' })));
    if (!animate) el.style.animation = 'none';
    el.dataset.code = code;
    return el;
  }

  // 只新增多出來的牌（新牌才有發牌動畫），其餘更新正反面
  function syncCards(box, cards, downIndex, animate = true) {
    while (box.children.length > cards.length) box.lastChild.remove();
    cards.forEach((c, i) => {
      const down = i === downIndex;
      let el = box.children[i];
      if (!el || el.dataset.code !== c) {
        const fresh = cardEl(c, down, animate);
        if (el) el.replaceWith(fresh); else box.append(fresh);
        el = fresh;
      }
      el.classList.toggle('down', down);
    });
  }

  let handNodes = [];
  function render(animate = true) {
    // 莊家
    syncCards(dealerCards, S.dealer, S.hole && S.dealer.length > 1 ? 1 : -1, animate);
    if (!S.dealer.length) dealerTotal.hidden = true;
    else {
      dealerTotal.hidden = false;
      const shown = S.hole ? [S.dealer[0]] : S.dealer;
      const v = handValue(shown);
      dealerTotal.textContent = S.hole ? String(v.total === 11 ? 'A' : v.total) : v.total > 21 ? '爆牌 ' + v.total : String(v.total);
      dealerTotal.className = 'bj-total' + (!S.hole && v.total > 21 ? ' bust' : '');
    }
    // 玩家
    handsEl.className = 'bj-hands' + (S.hands.length === 2 ? ' multi' : S.hands.length >= 3 ? ' triple' : '');
    if (handNodes.length !== S.hands.length) { handsEl.replaceChildren(); handNodes = []; }
    S.hands.forEach((hand, i) => {
      let node = handNodes[i];
      if (!node) {
        node = { cards: h('div', { class: 'bj-cards' }), total: h('div', { class: 'bj-total' }), bet: h('div', { class: 'bj-bet' }), outcome: h('div', { class: 'bj-outcome' }) };
        node.el = h('div', { class: 'bj-hand' }, node.outcome, node.cards, node.total, node.bet);
        handNodes[i] = node;
        handsEl.append(node.el);
      }
      syncCards(node.cards, hand.cards, -1, animate);
      const v = handValue(hand.cards);
      node.total.textContent = v.total > 21 ? '爆牌 ' + v.total : isNatural(hand) ? 'Blackjack' : (v.soft && v.total < 21 && S.phase === 'player' ? (v.total - 10) + ' / ' + v.total : String(v.total));
      node.total.className = 'bj-total' + (v.total > 21 ? ' bust' : v.total === 21 ? ' good' : '');
      node.total.style.visibility = hand.cards.length ? '' : 'hidden';
      node.bet.replaceChildren(h('i'), fmt(hand.bet) + (hand.doubled ? ' · 加倍' : ''));
      node.outcome.textContent = hand.outcomeText || '';
      node.outcome.className = 'bj-outcome ' + (hand.net > 0 ? 'pos' : hand.net < 0 ? 'neg' : '');
      node.el.classList.toggle('active', S.phase === 'player' && i === S.active && S.hands.length > 1);
      node.el.classList.toggle('dim', S.phase === 'player' && i !== S.active);
    });
    // 中央訊息
    if (S.message) msg.replaceChildren(h('div', null, S.message[0], S.message[1] ? h('small', null, S.message[1]) : null));
    else msg.replaceChildren();
    renderDock();
  }

  const btn = (label, sub, onClick, cls = '', disabled = false) => h('button', { class: 'btn ' + cls, disabled, onClick: () => { if (!lock) onClick(); } }, h('span', null, label), sub ? h('small', null, sub) : null);

  function renderDock() {
    const bal = store.balance();
    if (S.phase === 'bet') {
      const canAdd = (v) => S.bet + v <= MAX_BET && S.bet + v <= bal;
      dock.replaceChildren(
        h('div', { class: 'bj-betline' }, h('small', null, '下注'), h('b', null, fmt(S.bet)), h('small', null, '餘額 ' + fmt(bal))),
        h('div', { class: 'bj-chips' }, CHIPS.map((v) => h('button', { class: 'chip', dataset: { v }, disabled: !canAdd(v), 'aria-label': '加注 ' + v, onClick: () => { if (!canAdd(v)) return; S.bet += v; audio.play('chip'); render(); } }, h('span', null, v >= 1000 ? v / 1000 + 'K' : String(v))))),
        h('div', { class: 'bj-row' },
          btn('清除', '', () => { S.bet = 0; render(); }, '', !S.bet),
          btn('重複', fmt(S.lastBet), () => { S.bet = Math.min(S.lastBet, bal, MAX_BET); audio.play('chips'); render(); }, '', !S.lastBet || S.lastBet > bal),
          btn('發牌', '', deal, 'btn-gold', S.bet < MIN_BET)));
      if (bal < MIN_BET) dock.append(h('p', { class: 'login-note', style: 'text-align:center;margin:0' }, '遊戲幣不足，可回大廳領取補給金。'));
      return;
    }
    if (S.phase === 'insurance') {
      const cost = S.hands[0].bet / 2;
      dock.replaceChildren(h('div', { class: 'bj-row' },
        btn('不買', '', () => resolveInsurance(false)),
        btn('買保險', fmt(cost), () => resolveInsurance(true), 'btn-gold', cost > bal)));
      return;
    }
    if (S.phase === 'player') {
      const hand = S.hands[S.active];
      const two = hand.cards.length === 2;
      const canDouble = two && !hand.splitAces && bal >= hand.bet;
      const canSplit = two && S.hands.length < MAX_HANDS && cardValue(hand.cards[0]) === cardValue(hand.cards[1]) && bal >= hand.bet;
      const canSurrender = two && S.hands.length === 1;
      dock.replaceChildren(
        h('div', { class: 'bj-row' },
          btn('要牌', '', hit, 'btn-gold'),
          btn('停牌', '', stand)),
        h('div', { class: 'bj-row' },
          btn('加倍', canDouble ? '+' + fmt(hand.bet) : '', double, '', !canDouble),
          btn('分牌', canSplit ? '+' + fmt(hand.bet) : '', split, '', !canSplit),
          btn('投降', canSurrender ? '退 ' + fmt(hand.bet / 2) : '', surrender, '', !canSurrender)));
      return;
    }
    if (S.phase === 'done') {
      dock.replaceChildren(h('div', { class: 'bj-row' },
        btn('改下注', '', () => { clearTable(0); }),
        btn('再來一局', fmt(Math.min(S.lastBet, MAX_BET)), () => { clearTable(S.lastBet); if (S.bet >= MIN_BET) deal(); }, 'btn-gold', S.lastBet > bal || S.lastBet < MIN_BET)));
      return;
    }
    dock.replaceChildren(h('div', { class: 'bj-row', style: 'visibility:hidden' }, btn('　', '', () => {}, '', true)));
  }

  function clearTable(bet) {
    S.phase = 'bet'; S.dealer = []; S.hands = []; S.hole = true; S.insurance = 0; S.message = null;
    S.bet = Math.min(bet, store.balance(), MAX_BET);
    render();
  }

  const persist = () => store.saveGame(ID, { phase: S.phase, shoe: S.shoe, dealer: S.dealer, hole: S.hole, hands: S.hands, active: S.active, insurance: S.insurance, lastBet: S.lastBet, bet: S.bet });
  const draw = () => S.shoe.pop();
  const say = (a, b) => { S.message = a ? [a, b] : null; };

  // ---------------- 流程 ----------------
  async function deal() {
    if (S.bet < MIN_BET || !store.hold(ID, S.bet)) return toast('遊戲幣不足');
    lock = true;
    S.lastBet = S.bet;
    store.setSetting('blackjack', { bet: S.bet });
    S.phase = 'dealing';
    S.dealer = []; S.hole = true; S.insurance = 0;
    S.hands = [{ cards: [], bet: S.bet }];
    S.active = 0;
    say(null);
    audio.play('chips');
    if (S.shoe.length < DECKS * 52 * 0.25) {
      S.shoe = newShoe();
      say('洗牌中', '牌靴用到四分之一，換上新洗好的六副牌');
      render();
      audio.play('shuffle', { volume: 0.7 });
      await sleep(1500);
      if (!alive) return;
      say(null);
    }
    render();
    for (const step of ['p', 'd', 'p', 'd']) {
      await sleep(280);
      if (!alive) return;
      (step === 'p' ? S.hands[0].cards : S.dealer).push(draw());
      audio.play('card', { volume: 0.8 });
      render();
    }
    await sleep(380);
    if (!alive) return;
    lock = false;
    if (S.dealer[0][0] === 'A') { S.phase = 'insurance'; say('要買保險嗎？', '莊家明牌是 A；若莊家是 Blackjack，保險賠 2 : 1'); persist(); render(); return; }
    afterInsurance();
  }

  function resolveInsurance(buy) {
    if (buy) {
      const cost = S.hands[0].bet / 2;
      if (!store.hold(ID, cost)) return toast('遊戲幣不足');
      S.insurance = cost;
      audio.play('chip');
    }
    afterInsurance();
  }

  async function afterInsurance() {
    const up = cardValue(S.dealer[0]);
    const dealerBJ = (up === 11 || up === 10) && handValue(S.dealer).total === 21;
    const playerBJ = isNatural(S.hands[0]);
    if (dealerBJ || playerBJ) {
      lock = true;
      S.phase = 'dealer';
      say(null);
      render();
      await sleep(350);
      if (!alive) return;
      S.hole = false;
      audio.play('flip');
      render();
      await sleep(600);
      if (!alive) return;
      return finishRound();
    }
    if (S.insurance) say('莊家不是 Blackjack', '保險金 ' + fmt(S.insurance) + ' 沒收，繼續這一局');
    else say(null);
    S.phase = 'player';
    persist();
    render();
    autoAdvance();
  }

  // 21 點自動停牌
  function autoAdvance() {
    const hand = S.hands[S.active];
    if (hand && handValue(hand.cards).total >= 21) nextHand();
  }

  async function hit() {
    const hand = S.hands[S.active];
    say(null);
    hand.cards.push(draw());
    audio.play('card', { volume: 0.8 });
    persist();
    render();
    const v = handValue(hand.cards).total;
    if (v >= 21) { lock = true; await sleep(v > 21 ? 650 : 400); lock = false; if (alive) nextHand(); }
  }

  function stand() { say(null); nextHand(); }

  async function double() {
    const hand = S.hands[S.active];
    if (!store.hold(ID, hand.bet)) return toast('遊戲幣不足');
    lock = true;
    say(null);
    hand.bet *= 2;
    hand.doubled = true;
    audio.play('chips');
    render();
    await sleep(300);
    if (!alive) return;
    hand.cards.push(draw());
    audio.play('card', { volume: 0.8 });
    persist();
    render();
    await sleep(650);
    lock = false;
    if (alive) nextHand();
  }

  async function split() {
    const hand = S.hands[S.active];
    if (!store.hold(ID, hand.bet)) return toast('遊戲幣不足');
    lock = true;
    say(null);
    const aces = hand.cards[0][0] === 'A';
    const b = { cards: [hand.cards.pop()], bet: hand.bet, fromSplit: true, splitAces: aces };
    hand.fromSplit = true;
    hand.splitAces = aces;
    S.hands.splice(S.active + 1, 0, b);
    audio.play('chips');
    render(false);
    for (const target of [hand, b]) {
      await sleep(320);
      if (!alive) return;
      target.cards.push(draw());
      audio.play('card', { volume: 0.8 });
      render();
    }
    persist();
    await sleep(300);
    lock = false;
    if (!alive) return;
    if (aces) { S.active = S.hands.length - 1; return nextHand(); }
    autoAdvance();
  }

  function surrender() {
    const hand = S.hands[S.active];
    hand.surrendered = true;
    say(null);
    nextHand();
  }

  function nextHand() {
    for (let i = S.active + 1; i < S.hands.length; i++) {
      const hd = S.hands[i];
      if (hd.splitAces) continue;
      S.active = i;
      persist();
      render();
      if (handValue(hd.cards).total >= 21) continue;
      return;
    }
    dealerPlay();
  }

  async function dealerPlay() {
    lock = true;
    S.phase = 'dealer';
    persist();
    render();
    await sleep(450);
    if (!alive) return;
    S.hole = false;
    audio.play('flip');
    render();
    const live = S.hands.some((hd) => !hd.surrendered && handValue(hd.cards).total <= 21);
    if (live) {
      while (handValue(S.dealer).total < 17) {
        await sleep(620);
        if (!alive) return;
        S.dealer.push(draw());
        audio.play('card', { volume: 0.8 });
        render();
      }
    }
    await sleep(550);
    if (!alive) return;
    finishRound();
  }

  function finishRound() {
    const dv = handValue(S.dealer).total;
    const dealerBJ = S.dealer.length === 2 && dv === 21;
    let payout = 0, wagered = S.insurance, naturals = 0, doubleWins = 0;
    for (const hd of S.hands) {
      const v = handValue(hd.cards).total;
      wagered += hd.bet;
      let back = 0, text = '';
      if (hd.surrendered) { back = hd.bet / 2; text = '投降'; }
      else if (v > 21) { text = '爆牌'; }
      else if (isNatural(hd)) {
        if (dealerBJ) { back = hd.bet; text = '平手'; } else { back = hd.bet * 2.5; text = 'Blackjack'; naturals++; }
      }
      else if (dealerBJ) { text = '莊家 Blackjack'; }
      else if (dv > 21 || v > dv) { back = hd.bet * 2; text = '贏'; if (hd.doubled) doubleWins++; }
      else if (v === dv) { back = hd.bet; text = '平手'; }
      else { text = '輸'; }
      hd.net = back - hd.bet;
      hd.outcomeText = text + (hd.net ? ' ' + (hd.net > 0 ? '+' : '−') + fmt(Math.abs(hd.net)) : '');
      payout += back;
    }
    if (S.insurance && dealerBJ) payout += S.insurance * 3;
    payout = Math.round(payout);
    const net = payout - wagered;
    const result = net > 0 ? 'win' : net < 0 ? 'lose' : 'draw';
    const mode = [S.hands.length > 1 ? '分牌' : '', S.hands.some((x) => x.doubled) ? '加倍' : '', S.insurance ? '保險' : '', S.hands.some((x) => x.surrendered) ? '投降' : ''].filter(Boolean).join('、');
    const note = '玩家 ' + S.hands.map((x) => (isNatural(x) ? 'BJ' : handValue(x.cards).total)).join('／') + ' 對 莊家 ' + (dealerBJ ? 'BJ' : dv);
    const marks = {};
    if (naturals) marks.bjNaturals = naturals;
    if (doubleWins) marks.bjDoubleWins = doubleWins;
    store.settle(ID, { gameName: NAME, mode, result, payout, note, marks });
    S.phase = 'done';
    S.bet = 0;
    const insNote = S.insurance ? (dealerBJ ? '保險賠付 +' + fmt(S.insurance * 2) : '') : '';
    if (naturals && net > 0) say('Blackjack！', '賠 3 : 2　+' + fmt(net));
    else if (net > 0) say('你贏了 +' + fmt(net), insNote || (dv > 21 ? '莊家爆牌' : ''));
    else if (net < 0) say('莊家贏 −' + fmt(-net), dealerBJ ? '莊家 Blackjack' + (insNote ? ' · ' + insNote : '') : '');
    else say('平手', insNote || '退回賭注');
    lock = false;
    render();
    if (net > 0) { audio.play('payout'); audio.chime('win'); } else if (net < 0) audio.chime('lose'); else audio.chime('draw');
  }

  // ---------------- 啟動 ----------------
  audio.preload('card', 'flip', 'chip', 'chips', 'payout');
  render(false);
  if (S.phase === 'dealer' || S.phase === 'dealing') {
    if (S.dealer.length < 2 || !S.hands.length || S.hands[0].cards.length < 2) { store.release(ID); clearTable(0); }
    else dealerPlay();
  } else if (S.phase === 'player') autoAdvance();

  return () => { alive = false; };
}
