// 無限注德州撲克的牌局流程（六人桌）與電腦玩家決策。狀態全部是可 JSON 化的資料，方便存檔接續。
import { evaluate, handName, handTop, equity, draws, madeLevel } from './engine.js';

export const STREETS = ['preflop', 'flop', 'turn', 'river'];
export const STREET_NAMES = { preflop: '翻牌前', flop: '翻牌', turn: '轉牌', river: '河牌' };
const SEATS = 6;

// 個性：loose 入池範圍、aggr 主動下注傾向、bluff 詐唬頻率、sticky 跟注傾向
export const STYLES = {
  tag: { loose: 1.0, aggr: 1.0, bluff: 0.3, sticky: 0 },
  reg: { loose: 1.08, aggr: 1.1, bluff: 0.36, sticky: 0.01 },
  lag: { loose: 1.35, aggr: 1.3, bluff: 0.45, sticky: 0.02 },
  nit: { loose: 0.72, aggr: 0.85, bluff: 0.12, sticky: -0.02 },
  station: { loose: 1.3, aggr: 0.65, bluff: 0.08, sticky: 0.07 },
};
const NAMES = ['阿傑', '小雯', '老K', '志明', '春嬌', '大偉', '阿哲', '小芸', '冠宇', '柏翰', '怡君', '品妤', '家豪', '宗翰', '雅婷', '俊宏', '詩涵', '建宏', '佩珊', '承恩', '老周', '阿德', '小安', '思妤'];

const nextSeat = (i) => (i + 1) % SEATS;

export function createTable({ sb, bb, buyIn, human, styles }) {
  const T = { sb, bb, buyIn, button: Math.floor(Math.random() * SEATS), hand: 0, seats: [], board: [], deck: [], street: 'idle', toAct: -1, currentBet: 0, minRaise: bb, raises: 0, opener: -1, result: null, styles, usedNames: [] };
  for (let i = 0; i < SEATS; i++) T.seats.push(i === 0 ? { name: human, human: true, stack: buyIn } : newBot(T, buyIn));
  return T;
}

function newBot(T, buyIn) {
  const pool = NAMES.filter((n) => !T.seats.some((s) => s && s.name === n) && !T.usedNames.slice(-8).includes(n));
  const name = pool[(Math.random() * pool.length) | 0] || '玩家';
  T.usedNames.push(name);
  const style = T.styles[(Math.random() * T.styles.length) | 0];
  return { name, human: false, style, stack: Math.round((buyIn * (0.7 + Math.random() * 0.8)) / T.bb) * T.bb };
}

function shuffled() {
  const d = Array.from({ length: 52 }, (_, i) => i);
  for (let i = 51; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}

// 開新的一手。回傳換人的訊息（若有）
export function startHand(T) {
  const notes = [];
  T.seats.forEach((s, i) => {
    if (!s.human && s.stack < T.bb * 2) {
      const old = s.name;
      T.seats[i] = newBot(T, T.buyIn);
      notes.push(old + ' 離桌，' + T.seats[i].name + ' 入座');
    }
  });
  T.hand++;
  T.deck = shuffled();
  T.board = [];
  T.result = null;
  T.street = 'preflop';
  T.raises = 0;
  T.opener = -1;
  T.lastAggressor = -1;
  T.pfAggressor = -1;
  T.log = [];
  for (const s of T.seats) {
    Object.assign(s, { hole: [], folded: s.stack <= 0, allIn: false, bet: 0, total: 0, acted: false, action: '', range: 1, aggr: 0, shown: false, won: 0 });
  }
  // 按鈕移到下一位有籌碼的玩家
  do { T.button = nextSeat(T.button); } while (T.seats[T.button].folded);
  const live = () => T.seats.filter((s) => !s.folded).length;
  if (live() < 2) return notes;
  let sbSeat = nextLive(T, T.button), bbSeat = nextLive(T, sbSeat);
  if (live() === 2) { sbSeat = T.button; bbSeat = nextLive(T, T.button); }
  T.sbSeat = sbSeat; T.bbSeat = bbSeat;
  post(T, sbSeat, T.sb, '小盲');
  post(T, bbSeat, T.bb, '大盲');
  T.currentBet = T.bb;
  T.minRaise = T.bb;
  for (let r = 0; r < 2; r++) for (let k = 0, i = nextSeat(T.button); k < SEATS; k++, i = nextSeat(i)) if (!T.seats[i].folded) T.seats[i].hole.push(T.deck.pop());
  T.toAct = nextActive(T, bbSeat);
  return notes;
}

function nextLive(T, i) { for (let k = 0; k < SEATS; k++) { i = nextSeat(i); if (!T.seats[i].folded) return i; } return -1; }
function nextActive(T, i) { for (let k = 0; k < SEATS; k++) { i = nextSeat(i); const s = T.seats[i]; if (!s.folded && !s.allIn) return i; } return -1; }

function post(T, i, amt, label) {
  const s = T.seats[i];
  const a = Math.min(amt, s.stack);
  s.stack -= a; s.bet += a; s.total += a;
  if (!s.stack) s.allIn = true;
  s.action = label;
}

export const pot = (T) => T.seats.reduce((a, s) => a + s.total, 0);
export const position = (T, i) => ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'][(i - T.button + SEATS) % SEATS];

export function legal(T, i) {
  const s = T.seats[i];
  const toCall = Math.min(T.currentBet - s.bet, s.stack);
  const maxTo = s.bet + s.stack;
  const minTo = Math.min(T.currentBet + T.minRaise, maxTo);
  // 沒有人能再回應加注時（其他人都全下）就不能加注
  const others = T.seats.filter((o, k) => k !== i && !o.folded && !o.allIn).length;
  const canRaise = s.stack > toCall && others > 0 && !(s.acted && s.raiseLocked);
  return { toCall, canCheck: toCall === 0, canRaise, minTo, maxTo };
}

// action: { type: 'fold' | 'check' | 'call' | 'raise', to }
export function act(T, i, action) {
  const s = T.seats[i];
  const L = legal(T, i);
  const pre = T.street === 'preflop';
  if (action.type === 'fold') { s.folded = true; s.action = '棄牌'; }
  else if (action.type === 'check' || (action.type === 'call' && L.toCall === 0)) { s.action = '過牌'; }
  else if (action.type === 'call') {
    const a = L.toCall;
    s.stack -= a; s.bet += a; s.total += a;
    if (!s.stack) s.allIn = true;
    s.action = s.allIn ? '全下' : '跟注';
    if (pre) s.range = Math.min(s.range, T.raises === 0 ? 0.55 : T.raises === 1 ? 0.24 : 0.07);
  } else {
    let to = Math.max(L.minTo, Math.min(action.to, L.maxTo));
    const add = to - s.bet;
    const raiseSize = to - T.currentBet;
    s.stack -= add; s.bet = to; s.total += add;
    if (!s.stack) s.allIn = true;
    const full = raiseSize >= T.minRaise;
    if (full) {
      T.minRaise = raiseSize;
      // 完整加注才重新開放其他人加注
      for (const o of T.seats) { o.raiseLocked = false; if (o !== s && !o.folded && !o.allIn) o.acted = false; }
    } else {
      // 不足額全下：已行動過的人只能跟或棄
      for (const o of T.seats) if (o !== s && !o.folded && !o.allIn) { if (o.acted) o.raiseLocked = true; o.acted = false; }
    }
    T.currentBet = Math.max(T.currentBet, to);
    if (pre) {
      s.range = Math.min(s.range, T.raises === 0 ? openRange(T, i) : T.raises === 1 ? 0.06 : 0.028);
      if (T.raises === 0) T.opener = i;
    } else s.aggr++;
    T.raises++;
    T.lastAggressor = i;
    s.action = s.allIn ? '全下' : T.raises === 1 && !pre ? '下注' : '加注';
  }
  s.acted = true;
  T.log.push({ street: T.street, seat: i, act: s.action, amt: s.bet });
  return advance(T);
}

function openRange(T, i) { return ({ UTG: 0.15, HJ: 0.19, CO: 0.27, BTN: 0.45, SB: 0.38, BB: 0.3 })[position(T, i)]; }

// 回傳 'next'（換人）、'street'（換街）、'end'（結束）
function advance(T) {
  const live = T.seats.filter((s) => !s.folded);
  if (live.length === 1) { finishHand(T); return 'end'; }
  const canAct = live.filter((s) => !s.allIn);
  const pending = canAct.filter((s) => !s.acted || s.bet < T.currentBet);
  if (pending.length && !(canAct.length === 1 && canAct[0].bet >= T.currentBet)) {
    T.toAct = nextActive(T, T.toAct);
    // 跳過已經行動完畢且跟足的人
    for (let k = 0; k < SEATS; k++) {
      const s = T.seats[T.toAct];
      if (!s.acted || s.bet < T.currentBet) break;
      T.toAct = nextActive(T, T.toAct);
    }
    return 'next';
  }
  returnUncalled(T);
  if (T.street === 'river' || canAct.length <= 1) {
    // 不需要再下注：把公牌發完後攤牌
    for (const s of T.seats) { s.bet = 0; }
    while (T.board.length < 5) { T.deck.pop(); dealStreet(T); }
    T.street = 'showdown';
    finishHand(T);
    return 'end';
  }
  nextStreet(T);
  return 'street';
}

function dealStreet(T) {
  const n = T.board.length === 0 ? 3 : 1;
  for (let k = 0; k < n; k++) T.board.push(T.deck.pop());
}

function nextStreet(T) {
  if (T.street === 'preflop') T.pfAggressor = T.lastAggressor;
  T.street =STREETS[STREETS.indexOf(T.street) + 1];
  T.deck.pop(); // 燒牌
  dealStreet(T);
  for (const s of T.seats) { s.bet = 0; s.acted = false; s.raiseLocked = false; if (!s.folded) s.action = s.allIn ? '全下' : ''; }
  T.currentBet = 0;
  T.minRaise = T.bb;
  T.raises = 0;
  T.toAct = nextActive(T, T.button);
}

// 沒人跟的多餘下注退回
function returnUncalled(T) {
  const bets = T.seats.map((s) => s.bet).sort((a, b) => b - a);
  if (bets[0] > bets[1]) {
    const s = T.seats.find((x) => x.bet === bets[0]);
    const back = bets[0] - bets[1];
    s.stack += back; s.bet -= back; s.total -= back;
    if (s.stack > 0) s.allIn = false;
  }
}

function finishHand(T) {
  returnUncalled(T);
  const live = T.seats.map((s, i) => [s, i]).filter(([s]) => !s.folded);
  const winners = [];
  if (live.length === 1) {
    const [s, i] = live[0];
    const amt = pot(T);
    s.stack += amt; s.won = amt;
    winners.push({ seat: i, amount: amt, hand: '' });
    T.result = { winners, showdown: false, pot: amt };
  } else {
    for (const [s] of live) { s.score = evaluate(s.hole.concat(T.board)); s.shown = true; }
    const levels = [...new Set(live.map(([s]) => s.total))].sort((a, b) => a - b);
    let prev = 0;
    const order = []; // 從按鈕左邊開始的順序（零頭給先出現者）
    for (let k = 0, i = nextSeat(T.button); k < SEATS; k++, i = nextSeat(i)) order.push(i);
    for (const lv of levels) {
      let amount = 0;
      for (const s of T.seats) amount += Math.max(0, Math.min(s.total, lv) - prev);
      const elig = live.filter(([s]) => s.total >= lv);
      const best = Math.max(...elig.map(([s]) => s.score));
      const ws = order.filter((i) => elig.some(([s, k]) => k === i && s.score === best));
      const share = Math.floor(amount / ws.length);
      let odd = amount - share * ws.length;
      for (const i of ws) {
        const get = share + (odd > 0 ? 1 : 0);
        if (odd > 0) odd--;
        T.seats[i].stack += get; T.seats[i].won += get;
        const w = winners.find((x) => x.seat === i);
        if (w) w.amount += get; else winners.push({ seat: i, amount: get, hand: handName(T.seats[i].score) });
      }
      prev = lv;
    }
    T.result = { winners, showdown: true, pot: pot(T) };
  }
  T.street = 'done';
  T.toAct = -1;
  for (const s of T.seats) s.bet = 0;
}

// ---------------------------------------------------------------------------
// 電腦玩家

export function decide(T, i) {
  const s = T.seats[i];
  const st = STYLES[s.style] || STYLES.tag;
  const L = legal(T, i);
  const potNow = pot(T);
  const rnd = Math.random();
  const raiseTo = (to) => {
    to = Math.round(to / T.sb) * T.sb;
    to = Math.max(L.minTo, Math.min(to, L.maxTo));
    if (to >= L.maxTo * 0.72) to = L.maxTo; // 剩下不多就直接全下
    return { type: 'raise', to };
  };
  const passive = () => (L.canCheck ? { type: 'check' } : { type: 'fold' });

  if (T.street === 'preflop') {
    const p = handTop(s.hole[0], s.hole[1]);
    const pos = position(T, i);
    const pair = (s.hole[0] >> 2) === (s.hole[1] >> 2);
    const stackBB = (s.stack + s.bet) / T.bb;
    const limpers = T.seats.filter((o, k) => k !== i && !o.folded && o.bet === T.bb && k !== T.bbSeat).length;
    if (T.raises === 0) {
      const th = (pos === 'BB' ? 0.12 : openRange(T, i)) * st.loose;
      if (p <= th && L.canRaise) return raiseTo(T.bb * (pos === 'SB' ? 3 : 2.5) + limpers * T.bb);
      if (L.canCheck) return { type: 'check' };
      if (pos === 'SB' && p <= 0.5 * st.loose && st.sticky > 0.03) return { type: 'call' };
      if (st.sticky > 0.03 && p <= 0.3 && limpers > 0) return { type: 'call' };
      return { type: 'fold' };
    }
    const raiser = T.seats[T.lastAggressor];
    const rTop = raiser ? raiser.range : 0.2;
    const price = L.toCall / (s.stack + s.bet);
    if (T.raises === 1) {
      const late = ['CO', 'BTN', 'SB', 'BB'].includes(pos);
      const tb = Math.min(0.065, rTop * 0.28) * st.loose * st.aggr;
      const suitedAceBluff = (s.hole[0] & 3) === (s.hole[1] & 3) && Math.max(s.hole[0] >> 2, s.hole[1] >> 2) === 12 && Math.min(s.hole[0] >> 2, s.hole[1] >> 2) <= 3;
      if (L.canRaise && (p <= tb || (late && suitedAceBluff && rnd < st.bluff * 0.5))) return raiseTo(T.currentBet * (late && pos !== 'SB' && pos !== 'BB' ? 3 : 3.8));
      let callTh = Math.min(rTop * 0.85, 0.2) * st.loose + st.sticky;
      if (pos === 'BB') callTh += 0.1 * Math.min(1, (T.bb * 3) / T.currentBet);
      if (p <= callTh && price < 0.25) return { type: 'call' };
      // 小對子：賠率夠才去中暗三條
      const villain = raiser ? raiser.stack + raiser.bet : 0;
      if (pair && L.toCall * 14 <= Math.min(s.stack, villain) && price < 0.1) return { type: 'call' };
      return passive();
    }
    // 面對再加注
    if (p <= 0.022 && L.canRaise) return stackBB < 60 ? raiseTo(L.maxTo) : raiseTo(T.currentBet * 2.3);
    if (p <= 0.045 + st.sticky * 0.3 && price < 0.35) return { type: 'call' };
    if (p <= 0.022) return { type: 'call' };
    return passive();
  }

  // 翻牌後
  const opps = T.seats.filter((o, k) => k !== i && !o.folded).map((o) => ({ top: o.range, aggr: o.aggr }));
  const n = opps.length;
  const eq = equity(s.hole, T.board, opps, T.street === 'river' ? 600 : 420);
  const d = draws(s.hole, T.board);
  const drawing = T.street !== 'river' && (d.flushDraw || d.oesd);
  const made = madeLevel(s.hole, T.board);
  const wasAggressor = T.pfAggressor === i;
  const betSize = (frac) => raiseTo(Math.max(T.bb, potNow * frac));

  if (L.canCheck) {
    const valueTh = n === 1 ? 0.6 : n === 2 ? 0.48 : 0.4;
    if (L.canRaise) {
      if (eq >= valueTh && rnd < 0.85 + 0.1 * st.aggr) return betSize(eq > 0.82 ? 0.75 : T.street === 'river' ? 0.65 : 0.55);
      if (wasAggressor && T.street === 'flop' && n <= 2 && rnd < 0.55 * st.aggr) return betSize(0.38);
      if (drawing && rnd < st.bluff) return betSize(0.55);
      if (T.street === 'turn' && wasAggressor && n === 1 && made >= 1 && rnd < 0.4 * st.aggr) return betSize(0.5);
      if (T.street === 'river' && n === 1 && eq < 0.15 && rnd < st.bluff * 0.35) return betSize(0.7);
    }
    return { type: 'check' };
  }
  const potOdds = L.toCall / (potNow + L.toCall);
  const implied = drawing ? (T.street === 'flop' ? 0.08 : 0.05) : 0;
  const raiseTh = n === 1 ? 0.74 : 0.62;
  if (L.canRaise) {
    if (eq >= raiseTh && rnd < 0.7 * st.aggr) return raiseTo(T.currentBet * 2.6 + potNow * 0.2);
    if (drawing && T.street === 'flop' && n === 1 && rnd < st.bluff * 0.3 && L.toCall < s.stack * 0.25) return raiseTo(T.currentBet * 2.8);
  }
  if (eq + implied + st.sticky >= potOdds * 1.05) return { type: 'call' };
  return { type: 'fold' };
}
