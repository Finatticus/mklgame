// 無限注德州撲克的牌局流程（六人桌）與電腦玩家決策。狀態全部是可 JSON 化的資料，方便存檔接續。
import { evaluate, handName, handTop, equity, draws, madeLevel } from './engine.js';

export const STREETS = ['preflop', 'flop', 'turn', 'river'];
export const STREET_NAMES = { preflop: '翻牌前', flop: '翻牌', turn: '轉牌', river: '河牌' };
const SEATS = 6;

// 個性：
// open 主動加注的範圍、loose 跟注／平跟的範圍、aggr 主動下注傾向、bluff 詐唬頻率、sticky 跟注傾向、limp 平跟進場、
// slow 拿大牌慢打、adapt 依對手打法調整的程度（讀人）、show 詐唬得手後亮牌的機率
export const STYLES = {
  nit: { open: 0.75, loose: 0.75, aggr: 0.85, bluff: 0.14, sticky: -0.02, limp: 0.02, slow: 0.08, adapt: 0.5, show: 0, name: '保守' },
  tag: { open: 1.0, loose: 1.0, aggr: 1.0, bluff: 0.36, sticky: 0, limp: 0.04, slow: 0.15, adapt: 0.8, show: 0.08, name: '緊兇' },
  reg: { open: 1.12, loose: 1.12, aggr: 1.12, bluff: 0.44, sticky: 0.02, limp: 0.03, slow: 0.2, adapt: 1, show: 0.15, name: '穩健' },
  lag: { open: 1.35, loose: 1.35, aggr: 1.3, bluff: 0.5, sticky: 0.04, limp: 0.1, slow: 0.22, adapt: 0.9, show: 0.4, name: '鬆兇' },
  station: { open: 0.9, loose: 2.0, aggr: 0.6, bluff: 0.1, sticky: 0.13, limp: 0.75, slow: 0.1, adapt: 0.2, show: 0, name: '愛跟注' },
  maniac: { open: 2.2, loose: 2.3, aggr: 1.8, bluff: 0.85, sticky: 0.05, limp: 0.25, slow: 0.05, adapt: 0.3, show: 0.6, name: '瘋狂' },
};
const NAMES = ['阿傑', '小雯', '老K', '志明', '春嬌', '大偉', '阿哲', '小芸', '冠宇', '柏翰', '怡君', '品妤', '家豪', '宗翰', '雅婷', '俊宏', '詩涵', '建宏', '佩珊', '承恩', '老周', '阿德', '小安', '思妤'];

const nextSeat = (i) => (i + 1) % SEATS;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// ---------------- 讀人：全桌都看得到的打法統計 ----------------
// h 手數、vp 主動入池、pf 翻牌前加注、agg 翻牌後下注／加注、pas 翻牌後跟注、chk 翻牌後過牌、sd 攤牌、bl 攤牌時亮出的詐唬
const newStats = () => ({ h: 0, vp: 0, pf: 0, agg: 0, pas: 0, chk: 0, sd: 0, bl: 0 });
const PRIOR = { vp: 0.26, pf: 0.17 };
// 觀察到的打法（樣本少時往一般玩家靠攏）
export function reads(s) {
  const t = s.st || newStats();
  const K = 12;
  const vpip = (t.vp + PRIOR.vp * K) / (t.h + K);
  const pfr = (t.pf + PRIOR.pf * K) / (t.h + K);
  const af = (t.agg + 2) / (t.agg + t.pas + t.chk + 6); // 翻牌後主動出手的比例
  const bluffy = clamp(0.14 + (af - 0.33) * 0.7 + ((t.bl + 0.3) / (t.sd + 3) - 0.1) * 0.9, 0.05, 0.6); // 下注時是空氣的比例
  return { vpip, pfr, af, bluffy, n: t.h };
}
// 對手範圍：位置推定（教科書）與讀人推定，依自己會不會讀人混合
const topOf = (o, adapt) => { const a = o.rangePos ?? o.range ?? 1, b = o.rangeRead ?? a; return clamp(a + (b - a) * adapt, 0.015, 1); };
const bluffOf = (o, adapt) => 0.18 + ((o.bluffy ?? 0.18) - 0.18) * adapt;

export function createTable({ sb, bb, buyIn, human, styles, lively = 1 }) {
  const T = { sb, bb, buyIn, lively, button: Math.floor(Math.random() * SEATS), hand: 0, seats: [], board: [], deck: [], street: 'idle', toAct: -1, currentBet: 0, minRaise: bb, raises: 0, opener: -1, result: null, styles, usedNames: [] };
  for (let i = 0; i < SEATS; i++) T.seats.push(i === 0 ? { name: human, human: true, stack: buyIn, st: newStats() } : newBot(T, buyIn));
  return T;
}

function newBot(T, buyIn) {
  const pool = NAMES.filter((n) => !T.seats.some((s) => s && s.name === n) && !T.usedNames.slice(-8).includes(n));
  const name = pool[(Math.random() * pool.length) | 0] || '玩家';
  T.usedNames.push(name);
  const style = T.styles[(Math.random() * T.styles.length) | 0];
  return { name, human: false, style, stack: Math.round((buyIn * (0.7 + Math.random() * 0.8)) / T.bb) * T.bb, st: newStats() };
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
    Object.assign(s, { hole: [], folded: s.stack <= 0, allIn: false, bet: 0, total: 0, acted: false, action: '', range: 1, rangePos: 1, rangeRead: 1, aggr: 0, shown: false, won: 0,
      vpHand: false, pfHand: false, betStreets: [], bluffing: false, trap: false, float: false, drew: false, checkedStreet: '' });
    if (!s.st) s.st = newStats();
    if (!s.folded) s.st.h++;
    s.bluffy = reads(s).bluffy;
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
// 舊存檔（改版前開始的一手）沒有這些欄位
function ensure(s) { if (!s.st) s.st = newStats(); if (!s.betStreets) s.betStreets = []; }

export function act(T, i, action) {
  const s = T.seats[i];
  ensure(s);
  const L = legal(T, i);
  const pre = T.street === 'preflop';
  const r = reads(s);
  if (action.type === 'fold') { s.folded = true; s.action = '棄牌'; }
  else if (action.type === 'check' || (action.type === 'call' && L.toCall === 0)) {
    s.action = '過牌';
    if (!pre) { s.st.chk++; s.checkedStreet = T.street; }
  } else if (action.type === 'call') {
    const a = L.toCall;
    s.stack -= a; s.bet += a; s.total += a;
    if (!s.stack) s.allIn = true;
    s.action = s.allIn ? '全下' : '跟注';
    if (pre) {
      if (!s.vpHand) { s.vpHand = true; s.st.vp++; }
      const k = T.raises === 0 ? 1 : T.raises === 1 ? 0.62 : 0.22;
      s.rangePos = Math.min(s.rangePos, T.raises === 0 ? 0.55 : T.raises === 1 ? 0.24 : 0.07);
      s.rangeRead = Math.min(s.rangeRead, clamp(r.vpip * k * 1.1, 0.03, 0.95));
    } else s.st.pas++;
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
      if (!s.vpHand) { s.vpHand = true; s.st.vp++; }
      if (!s.pfHand) { s.pfHand = true; s.st.pf++; }
      const posR = T.raises === 0 ? openRange(T, i) : T.raises === 1 ? 0.06 : 0.028;
      // 讀人：常加注的人，加注範圍就寬
      const readR = T.raises === 0 ? clamp(r.pfr * (openRange(T, i) / 0.29), 0.04, 0.92) : T.raises === 1 ? clamp(r.pfr * 0.36, 0.025, 0.6) : clamp(r.pfr * 0.14, 0.015, 0.35);
      s.rangePos = Math.min(s.rangePos, posR);
      s.rangeRead = Math.min(s.rangeRead, readR);
      if (T.raises === 0) T.opener = i;
    } else { s.aggr++; s.st.agg++; if (!s.betStreets.includes(T.street)) s.betStreets.push(T.street); }
    T.raises++;
    T.lastAggressor = i;
    s.action = s.allIn ? '全下' : T.raises === 1 && !pre ? '下注' : '加注';
  }
  s.range = s.rangeRead;
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
    // 詐唬得手：有些對手會故意亮牌給你看
    const st = STYLES[s.style];
    const air = T.board.length < 3 || madeLevel(s.hole, T.board) <= 1; // 只有真的是空氣或小對子才算詐唬
    if (!s.human && s.bluffing && air && st && Math.random() < st.show && amt >= T.bb * 4) {
      s.shown = true; s.st.bl++; s.st.sd++;
      T.result.note = s.name + ' 亮牌' + (T.board.length >= 3 ? '：只有' + handName(evaluate(s.hole.concat(T.board))) : '') + '，剛才是詐唬';
      T.result.bluffShow = i;
    }
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
    // 攤牌時揭曉詐唬：最後下注的人其實只有高牌或小對子
    for (const [o] of live) {
      o.st.sd++;
      if (o.aggr > 0 && madeLevel(o.hole, T.board) <= 1) o.st.bl++;
    }
    const la = T.lastAggressor;
    const ag = la >= 0 ? T.seats[la] : null;
    // 電腦以「是否有意詐唬」判斷；你的部分看牌力（只有高牌或小對子還下注，就算詐唬）
    const bluffed = ag && !ag.folded && ag.aggr > 0 && madeLevel(ag.hole, T.board) <= 1 && (ag.human || ag.bluffing);
    if (bluffed) {
      const won = winners.some((w) => w.seat === la);
      const cw = winners.find((w) => w.seat !== la);
      if (!won && cw) {
        const c = T.seats[cw.seat], who = cw.seat === 0 ? '你' : c.name;
        const strong = madeLevel(c.hole, T.board) >= 4; // 兩對以上：不是「抓」，是撞上大牌
        const ch = handName(c.score);
        if (ag.human) T.result.note = strong ? '你的詐唬撞上' + c.name + '的' + ch : c.name + ' 用' + ch + '抓到你的詐唬';
        else T.result.note = strong ? ag.name + ' 詐唬，撞上' + who + '的' + ch : ag.name + ' 詐唬被' + who + '用' + ch + '抓到';
      } else if (won && !ag.human) T.result.note = ag.name + ' 下注時只有' + handName(ag.score) + '，硬是贏了';
    }
  }
  T.street = 'done';
  T.toAct = -1;
  for (const s of T.seats) s.bet = 0;
}

// ---------------------------------------------------------------------------
// 電腦玩家

// 由小盲到按鈕的行動順序（翻牌後）；數字大的較晚行動＝有位置
const postOrder = (T, i) => (i - T.button - 1 + SEATS) % SEATS;
// 嚇人的牌：轉牌／河牌出現 J 以上的高張，或讓牌面三張同花、四張順
function scareCard(board) {
  if (board.length < 4) return false;
  const last = board[board.length - 1], prev = board.slice(0, -1);
  const over = (last >> 2) >= 9 && prev.every((c) => (c >> 2) < (last >> 2));
  const suit = board.filter((c) => (c & 3) === (last & 3)).length;
  let mask = 0;
  for (const c of board) mask |= 1 << (c >> 2);
  if (mask & (1 << 12)) mask |= 1 << 13;
  const m2 = ((mask & ~(1 << 13)) << 1) | (mask & (1 << 13) ? 1 : 0);
  let four = false;
  for (let lo = 0; lo <= 9; lo++) { let w = (m2 >> lo) & 0x1f, n = 0; while (w) { w &= w - 1; n++; } if (n >= 4) four = true; }
  return over || suit === 3 || four;
}
// 適合拿來 3-bet 詐唬的牌：同花 A、同花連張、同花大牌
function bluff3Hand(a, b) {
  const ra = a >> 2, rb = b >> 2, hi = Math.max(ra, rb), lo = Math.min(ra, rb), suited = (a & 3) === (b & 3);
  if (!suited) return false;
  return (hi === 12 && lo <= 4) || (hi - lo <= 2 && lo >= 3 && hi <= 10) || (lo >= 8);
}

// 牌桌熱鬧程度：新手桌、進階桌的電腦比真實牌桌更愛入池與跟注（高手桌維持真實強度）
export const LIVELY = { low: 1.3, mid: 1.15, high: 1 };
function livelier(st, T) {
  const f = T.lively ?? (T.bb <= 100 ? LIVELY.low : T.bb <= 400 ? LIVELY.mid : LIVELY.high);
  if (f === 1) return st;
  return { ...st, open: st.open * f, loose: st.loose * f * f, limp: Math.min(0.9, st.limp + (f - 1) * 0.6), sticky: st.sticky + (f - 1) * 0.12, bluff: st.bluff * f };
}

export function decide(T, i) {
  const s = T.seats[i];
  ensure(s);
  const st = livelier(STYLES[s.style] || STYLES.tag, T);
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
      // 後面的人越常棄牌，越敢偷盲
      const preIdx = (k) => (k - T.bbSeat - 1 + SEATS) % SEATS; // 翻牌前行動順序：UTG 為 0、大盲最後
      const behind = T.seats.filter((o, k) => k !== i && !o.folded && preIdx(k) > preIdx(i));
      const foldy = behind.length ? behind.reduce((a, o) => a + (1 - reads(o).vpip), 0) / behind.length : 0.7;
      const steal = ['CO', 'BTN', 'SB'].includes(pos) ? 1 + (foldy - 0.72) * 1.2 * st.adapt : 1;
      const th = Math.min(0.85, (pos === 'BB' ? 0.12 : openRange(T, i)) * st.open * clamp(steal, 0.8, 1.35));
      if (p <= th && L.canRaise) {
        // 愛跟注的人偶爾只加到兩倍，瘋狂型偶爾直接大加
        const mult = s.style === 'maniac' && rnd < 0.3 ? 4.5 : s.style === 'station' && rnd < 0.4 ? 2 : pos === 'SB' ? 3 : 2.5;
        return raiseTo(T.bb * mult + limpers * T.bb);
      }
      if (L.canCheck) return { type: 'check' };
      const limpTh = Math.min(0.75, (pos === 'BB' ? 0.12 : openRange(T, i)) * st.loose * 1.6 + st.sticky);
      if (p <= limpTh && rnd < st.limp + (limpers > 0 ? 0.2 : 0)) return { type: 'call' };
      if (pos === 'SB' && p <= 0.5 * st.loose && rnd < st.limp + 0.25) return { type: 'call' };
      return { type: 'fold' };
    }
    const raiser = T.seats[T.lastAggressor];
    const rTop = raiser ? topOf(raiser, st.adapt) : 0.2;
    const price = L.toCall / (s.stack + s.bet);
    const late = ['CO', 'BTN', 'SB', 'BB'].includes(pos);
    if (T.raises === 1) {
      // 價值 3-bet：比對手的加注範圍好很多的牌；對手越鬆，這個範圍越寬
      const tb = Math.min(0.12, rTop * 0.3) * st.aggr;
      const b3 = bluff3Hand(s.hole[0], s.hole[1]) && rnd < st.bluff * (rTop > 0.3 ? 0.75 : 0.28) * (late ? 1 : 0.5);
      if (L.canRaise && (p <= tb || b3)) { s.bluffing = !(p <= tb); return raiseTo(T.currentBet * (late && pos !== 'SB' && pos !== 'BB' ? 3 : 3.8)); }
      let callTh = Math.min(rTop * 0.9, 0.4) * st.loose + st.sticky;
      if (pos === 'BB') callTh += 0.1 * Math.min(1, (T.bb * 3) / T.currentBet);
      if (limpers > 0 || T.seats.some((o) => !o.folded && o !== s && o !== raiser && o.bet === T.currentBet)) callTh *= 1.1; // 多人底池賠率較好
      if (p <= callTh && price < (s.style === 'station' ? 0.35 : 0.25)) return { type: 'call' };
      // 小對子：賠率夠才去中暗三條
      const villain = raiser ? raiser.stack + raiser.bet : 0;
      if (pair && L.toCall * 14 <= Math.min(s.stack, villain) && price < 0.1) return { type: 'call' };
      return passive();
    }
    // 面對再加注：對手 3-bet 範圍越寬，越不輕易放棄
    const vTop = Math.max(0.015, rTop);
    const v4 = Math.min(0.04, vTop * 0.4);
    if (p <= Math.max(0.018, v4) && L.canRaise) return stackBB < 60 ? raiseTo(L.maxTo) : raiseTo(T.currentBet * 2.3);
    if (L.canRaise && T.raises === 2 && vTop > 0.08 && (s.hole[0] >> 2) === 12 && (s.hole[0] & 3) === (s.hole[1] & 3) && rnd < st.bluff * 0.3) { s.bluffing = true; return raiseTo(T.currentBet * 2.3); }
    if (p <= Math.min(0.12, vTop * 0.85) + st.sticky * 0.3 && price < 0.38) return { type: 'call' };
    if (p <= 0.022) return { type: 'call' };
    return passive();
  }

  // ---------------- 翻牌後 ----------------
  const others = T.seats.map((o, k) => [o, k]).filter(([o, k]) => k !== i && !o.folded);
  const opps = others.map(([o]) => ({ top: topOf(o, st.adapt), aggr: o.aggr, bluff: bluffOf(o, st.adapt) }));
  const n = opps.length;
  const eq = equity(s.hole, T.board, opps, T.street === 'river' ? 600 : 420);
  const d = draws(s.hole, T.board);
  const drawing = T.street !== 'river' && (d.flushDraw || d.oesd);
  if (T.street === 'turn' && (drawing || d.gut)) s.drew = true;
  const made = madeLevel(s.hole, T.board);
  const wasAggressor = T.pfAggressor === i;
  const scare = scareCard(T.board);
  const inPos = others.every(([, k]) => postOrder(T, k) < postOrder(T, i));
  const prevStreet = T.street === 'turn' ? 'flop' : T.street === 'river' ? 'turn' : '';
  const betPrev = prevStreet && s.betStreets.includes(prevStreet);
  const weak = eq < 0.38;
  const bet = (frac, bluff = weak) => { s.bluffing = bluff && made <= 1; return raiseTo(Math.max(T.bb, potNow * frac)); };

  if (L.canCheck) {
    const valueTh = n === 1 ? 0.6 : n === 2 ? 0.5 : 0.42;
    if (L.canRaise) {
      if (eq >= valueTh) {
        // 慢打：拿到怪物牌先過牌，等對手下注再加注
        if (eq > 0.82 && T.street !== 'river' && n <= 2 && rnd < st.slow) { s.trap = true; return { type: 'check' }; }
        if (rnd < 0.85 + 0.1 * st.aggr) return bet(eq > 0.82 ? 0.7 + rnd * 0.3 : T.street === 'river' ? 0.6 : 0.5, false);
      }
      // 持續下注：翻牌前加注的人在翻牌先開一槍（有沒有中都會打）
      if (wasAggressor && T.street === 'flop' && n <= 2 && rnd < (n === 1 ? 0.66 : 0.38) * st.aggr) return bet(0.33 + rnd * 0.2);
      // 二次開火：翻牌打過、轉牌出現嚇人的牌或有聽牌就繼續打
      if (T.street === 'turn' && betPrev && n === 1 && (eq >= 0.45 || drawing || (scare && rnd < st.bluff * 1.2)) && rnd < 0.72 * st.aggr) return bet(0.55 + rnd * 0.15);
      // 對手示弱（上一條街過牌）就搶池
      if (T.street !== 'flop' && n === 1 && !betPrev && others.every(([o]) => o.checkedStreet === prevStreet || o.checkedStreet === T.street) && rnd < (0.25 + (s.float ? 0.4 : 0)) * st.aggr + st.bluff * 0.15) return bet(0.5 + rnd * 0.2);
      // 半詐唬：聽牌主動下注
      if (drawing && rnd < st.bluff) return bet(0.5 + rnd * 0.2);
      // 河牌詐唬：聽牌落空或一路打上來的空氣，下重注
      if (T.street === 'river' && n === 1 && eq < 0.2 && (s.drew || betPrev || scare) && rnd < st.bluff * 0.8) return bet(0.75 + rnd * 0.35, true);
      // 薄價值
      if (T.street === 'river' && n === 1 && eq >= 0.55 && rnd < 0.5 * st.aggr) return bet(0.4, false);
    }
    return { type: 'check' };
  }

  const potOdds = L.toCall / (potNow + L.toCall);
  const implied = drawing ? (T.street === 'flop' ? 0.08 : 0.05) : 0;
  const raiseTh = n === 1 ? 0.72 : 0.62;
  const bettor = T.seats[T.lastAggressor];
  if (L.canRaise) {
    // 慢打的陷阱：過牌後對手下注，再加注
    if (s.trap && eq >= 0.66) { s.trap = false; s.bluffing = false; return raiseTo(T.currentBet * 2.8 + potNow * 0.15); }
    if (eq >= raiseTh && rnd < 0.7 * st.aggr) { s.bluffing = false; return raiseTo(T.currentBet * 2.6 + potNow * 0.2); }
    // 聽牌加注（含過牌加注）
    if (drawing && T.street !== 'river' && n === 1 && rnd < st.bluff * (s.checkedStreet === T.street ? 0.55 : 0.3) && L.toCall < s.stack * 0.3) { s.bluffing = true; return raiseTo(T.currentBet * 2.8); }
    // 對很會詐唬的人，偶爾用空氣反打回去
    if (bettor && n === 1 && T.street !== 'river' && weak && bluffOf(bettor, st.adapt) > 0.32 && rnd < st.bluff * 0.22 * st.adapt && L.toCall < s.stack * 0.2) { s.bluffing = true; return raiseTo(T.currentBet * 2.7); }
  }
  // 漂浮跟注：有位置時先跟一槍，下一條街對手示弱就搶池
  if (T.street === 'flop' && n === 1 && inPos && eq < potOdds && L.toCall <= potNow * 0.6 && rnd < st.bluff * 0.45 && L.toCall < s.stack * 0.15) { s.float = true; return { type: 'call' }; }
  if (eq + implied + st.sticky >= potOdds * 1.02) return { type: 'call' };
  return { type: 'fold' };
}
