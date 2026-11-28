// 大老二牌桌流程：四人、逆時針出牌（你 → 右家 → 對家 → 左家）。
import { shuffled, classify, beats, decide, searchMove, CLUB3, penalty } from './engine.js';

export const SEATS = 4;
const NAMES = ['阿哲', '小芸', '老陳', '美玲', '建宏', '淑芬', '志明', '雅雯', '阿德', '佩君', '國峰', '惠如'];
const sortHand = (a) => a.sort((x, y) => x - y);

export function createTable({ unit, buyIn, human, level }) {
  const T = { unit, buyIn, level, hand: 0, seats: [{ name: human, human: true, stack: buyIn, cards: [] }], street: 'idle' };
  for (let i = 1; i < SEATS; i++) T.seats.push(newBot(T));
  return T;
}

function newBot(T) {
  const used = new Set((T.seats || []).map((s) => s.name));
  const free = NAMES.filter((n) => !used.has(n));
  return { name: free[Math.floor(Math.random() * free.length)], human: false, stack: T.buyIn, cards: [] };
}

export function startHand(T) {
  const notes = [];
  T.seats.forEach((s, i) => {
    if (!s.human && s.stack < T.unit * 40) {
      const old = s.name;
      T.seats[i] = newBot(T);
      notes.push(old + ' 離桌，' + T.seats[i].name + ' 入座');
    }
  });
  T.hand++;
  const deck = shuffled();
  T.seats.forEach((s, i) => { s.cards = sortHand(deck.slice(i * 13, i * 13 + 13)); });
  T.turn = T.seats.findIndex((s) => s.cards.includes(CLUB3));
  T.mustClub3 = true;
  T.cur = null;
  T.owner = -1;
  T.passed = [false, false, false, false];
  T.shown = [null, null, null, null]; // 每家這一輪最後的動作：{ cards, type } 或 'pass'
  T.stale = false;
  T.played = [];
  T.street = 'play';
  T.result = null;
  return notes;
}

// 檢查某家想出的牌；回傳 { ok, combo, why }
export function check(T, i, cards) {
  if (T.street !== 'play' || T.turn !== i) return { ok: false, why: '還沒輪到你' };
  const combo = classify(cards);
  if (!combo) return { ok: false, why: cards.length === 3 || cards.length === 4 ? '不能出三張或四張' : '不是合法牌型' };
  if (T.mustClub3 && !cards.includes(CLUB3)) return { ok: false, combo, why: '第一手要含梅花 3' };
  if (!beats(combo, T.cur)) return { ok: false, combo, why: T.cur && combo.n !== T.cur.n && !(combo.type === 'four' || combo.type === 'sflush') ? '張數要相同' : '壓不過' };
  return { ok: true, combo };
}

export function play(T, i, cards) {
  const r = check(T, i, cards);
  if (!r.ok) return null;
  const s = T.seats[i];
  if (T.stale) { T.shown = [null, null, null, null]; T.stale = false; }
  s.cards = s.cards.filter((c) => !cards.includes(c));
  T.cur = r.combo;
  T.owner = i;
  T.mustClub3 = false;
  T.played.push(...r.combo.cards);
  T.shown[i] = { cards: r.combo.cards, type: r.combo.type };
  if (!s.cards.length) { finish(T, i); return 'end'; }
  return advance(T);
}

export function pass(T, i) {
  if (T.street !== 'play' || T.turn !== i || !T.cur) return null;
  T.passed[i] = true;
  T.shown[i] = 'pass';
  return advance(T);
}

// 輪到下一位還沒過的人；繞回場上牌的主人時，這一輪結束，由他自由出牌
function advance(T) {
  let j = T.turn;
  for (let k = 0; k < SEATS; k++) {
    j = (j + 1) % SEATS;
    if (j === T.owner) {
      // 這一輪結束：桌上的牌先留著（畫面會淡出），收下的人出牌時才清掉
      T.cur = null;
      T.passed = [false, false, false, false];
      T.stale = true;
      T.turn = j;
      return 'trick';
    }
    if (!T.passed[j]) { T.turn = j; return 'play'; }
  }
  return 'play';
}

function finish(T, w) {
  let total = 0;
  const rows = T.seats.map((s, i) => {
    if (i === w) return { seat: i, cards: [], n: 0, mult: 1, points: 0, amount: 0 };
    const p = penalty(s.cards);
    const amount = Math.min(s.stack, p.points * T.unit);
    s.stack -= amount;
    total += amount;
    return { seat: i, cards: s.cards.slice(), ...p, amount: -amount };
  });
  T.seats[w].stack += total;
  rows[w].amount = total;
  T.result = { winner: w, rows };
  T.street = 'done';
  T.cur = null;
}

// 電腦出牌：只看得到自己的牌、已出過的牌與各家剩幾張
export function botMove(T, i) {
  const s = T.seats[i];
  if (T.level >= 2) {
    return searchMove({ hands: T.seats.map((x) => x.cards), me: i, cur: T.cur, owner: T.owner, passed: T.passed, mustClub3: T.mustClub3, played: T.played },
      T.level >= 3 ? { samples: 40, width: 10 } : { samples: 20, width: 7 });
  }
  const mine = new Set(s.cards), gone = new Set(T.played);
  const unseen = [];
  for (let c = 0; c < 52; c++) if (!mine.has(c) && !gone.has(c)) unseen.push(c);
  const opp = [1, 2, 3].map((k) => ({ n: T.seats[(i + k) % SEATS].cards.length, next: k === 1 }));
  return decide({
    hand: s.cards, cur: T.cur, mustClub3: T.mustClub3, unseen, opp, level: T.level, tune: s.tune,
    ownerCards: T.owner >= 0 && T.owner !== i ? T.seats[T.owner].cards.length : 13,
  });
}
