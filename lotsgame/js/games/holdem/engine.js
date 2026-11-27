// 德州撲克核心：七張牌評分、起手牌強度、對手範圍抽樣與勝率模擬。
// 牌以 0–51 表示：點數 = c >> 2（0 = 2 … 12 = A），花色 = c & 3。

export const RANKS = '23456789TJQKA';
export const SUITS = 'SHDC';
export const code = (c) => RANKS[c >> 2] + SUITS[c & 3]; // 對應 assets/cards/<code>.webp
export const CAT_NAMES = ['高牌', '一對', '兩對', '三條', '順子', '同花', '葫蘆', '四條', '同花順'];

const STRAIGHTS = [];
for (let hi = 12; hi >= 4; hi--) STRAIGHTS.push([hi, 0x1f << (hi - 4)]);
STRAIGHTS.push([3, (1 << 12) | 0xf]); // A2345

function straightHigh(mask) {
  for (const [hi, m] of STRAIGHTS) if ((mask & m) === m) return hi;
  return -1;
}

const rc = new Int8Array(13);
// 回傳可比較的分數：類別 << 20 | 牌點（每張 4 bits）
export function evaluate(cards, n = cards.length) {
  rc.fill(0);
  let sm0 = 0, sm1 = 0, sm2 = 0, sm3 = 0, s0 = 0, s1 = 0, s2 = 0, s3 = 0, mask = 0;
  for (let i = 0; i < n; i++) {
    const c = cards[i], r = c >> 2, b = 1 << r;
    rc[r]++; mask |= b;
    switch (c & 3) { case 0: s0++; sm0 |= b; break; case 1: s1++; sm1 |= b; break; case 2: s2++; sm2 |= b; break; default: s3++; sm3 |= b; }
  }
  const fm = s0 >= 5 ? sm0 : s1 >= 5 ? sm1 : s2 >= 5 ? sm2 : s3 >= 5 ? sm3 : 0;
  if (fm) {
    const sf = straightHigh(fm);
    if (sf >= 0) return (8 << 20) | sf;
  }
  let quad = -1, trip = -1, trip2 = -1, p1 = -1, p2 = -1;
  for (let r = 12; r >= 0; r--) {
    const k = rc[r];
    if (k === 4) quad = r;
    else if (k === 3) { if (trip < 0) trip = r; else if (trip2 < 0) trip2 = r; }
    else if (k === 2) { if (p1 < 0) p1 = r; else if (p2 < 0) p2 = r; }
  }
  if (quad >= 0) {
    let k = -1; for (let r = 12; r >= 0; r--) if (r !== quad && rc[r]) { k = r; break; }
    return (7 << 20) | (quad << 4) | k;
  }
  if (trip >= 0 && (p1 >= 0 || trip2 >= 0)) {
    const pr = Math.max(p1, trip2);
    return (6 << 20) | (trip << 4) | pr;
  }
  if (fm) {
    let v = 0, k = 0;
    for (let r = 12; r >= 0 && k < 5; r--) if (fm & (1 << r)) { v = (v << 4) | r; k++; }
    return (5 << 20) | v;
  }
  const st = straightHigh(mask);
  if (st >= 0) return (4 << 20) | st;
  const kick = (skip, cnt) => { let v = 0, k = 0; for (let r = 12; r >= 0 && k < cnt; r--) if (rc[r] && !skip.includes(r)) { v = (v << 4) | r; k++; } return { v, k }; };
  if (trip >= 0) { const { v } = kick([trip], 2); return (3 << 20) | (trip << 8) | v; }
  if (p1 >= 0 && p2 >= 0) { const { v } = kick([p1, p2], 1); return (2 << 20) | (p1 << 8) | (p2 << 4) | v; }
  if (p1 >= 0) { const { v } = kick([p1], 3); return (1 << 20) | (p1 << 12) | v; }
  return kick([], 5).v;
}
export const category = (score) => score >> 20;

export function handName(score) {
  const cat = score >> 20;
  if (cat === 8 && (score & 0xf) === 12) return '皇家同花順';
  return CAT_NAMES[cat];
}

// ---------------------------------------------------------------------------
// 起手牌強度：169 種起手牌依「對一手隨機牌的勝率」排序，換算成前百分之幾（0 最強）
export const classOf = (a, b) => {
  const ra = a >> 2, rb = b >> 2, hi = Math.max(ra, rb), lo = Math.min(ra, rb);
  if (ra === rb) return hi * 13 + lo; // 對子在對角線
  return (a & 3) === (b & 3) ? hi * 13 + lo : lo * 13 + hi; // 同花：上三角；不同花：下三角
};
export const className = (cls) => {
  const r = (cls / 13) | 0, c = cls % 13;
  if (r === c) return RANKS[r] + RANKS[r];
  return r > c ? RANKS[r] + RANKS[c] + 's' : RANKS[c] + RANKS[r] + 'o';
};

// 預先算好的排序（最強在前）：對 1 手隨機牌與對 3 手隨機牌的勝率排名各半平均，由 equityTable() 模擬產生
const ORDER = 'AA KK QQ JJ TT 99 AKs AQs 88 AJs AKo ATs KQs AQo 77 AJo KJs KQo KTs ATo A9s QJs A8s 66 KJo A7s QTs KTo K9s QJo JTs A9o A5s A6s Q9s A8o A4s QTo A7o K8s K9o A3s J9s 55 K7s A2s JTo A5o K6s Q8s T9s A6o Q9o A4o K5s J8s 44 Q7s K8o K4s T8s J9o A3o K3s 98s K6o K7o Q6s Q5s T9o T7s A2o Q8o J7s K2s J8o 33 J6s 97s Q4s T8o K5o J5s K4o Q7o Q3s Q2s 87s K3o T6s J3s 98o Q6o J4s 96s T7o 86s 76s K2o Q5o J7o J2s T5s 22 95s 97o Q4o 75s J6o T4s 87o 85s T3s T6o 65s Q3o J5o Q2o T2s 94s 96o 54s 64s J4o 86o 76o 74s 93s J3o 84s 92s T5o 63s J2o T4o 73s 95o 53s 83s 65o 43s 75o T3o 85o 82s 52s 62s T2o 74o 94o 54o 64o 42s 84o 93o 92o 72s 53o 32s 63o 83o 73o 43o 82o 52o 72o 62o 42o 32o'.split(' ');
export const TOP = new Float32Array(169); // 每一類起手牌的「前百分比」（含自身組合數）
{
  let acc = 0;
  for (const name of ORDER) {
    const hi = RANKS.indexOf(name[0]), lo = RANKS.indexOf(name[1]);
    let cls, combos;
    if (name.length === 2) { cls = hi * 13 + lo; combos = 6; }
    else if (name[2] === 's') { cls = hi * 13 + lo; combos = 4; }
    else { cls = lo * 13 + hi; combos = 12; }
    acc += combos;
    TOP[cls] = acc / 1326;
  }
}
export const handTop = (a, b) => TOP[classOf(a, b)];

// ---------------------------------------------------------------------------
// 牌面判斷（給 AI 用）

// 聽牌：同花聽牌（差一張）或兩頭順子聽牌
export function draws(hole, board) {
  const all = hole.concat(board);
  const sc = [0, 0, 0, 0];
  for (const c of all) sc[c & 3]++;
  let flushDraw = false;
  for (let s = 0; s < 4; s++) if (sc[s] === 4 && hole.some((c) => (c & 3) === s)) flushDraw = true;
  let mask = 0;
  for (const c of all) mask |= 1 << (c >> 2);
  if (mask & (1 << 12)) mask |= 1 << 13; // A 也可當 1（位移後檢查）
  let oesd = false, gut = false;
  const m2 = ((mask & ~(1 << 13)) << 1) | (mask & (1 << 13) ? 1 : 0); // 第 0 位 = A 當 1
  for (let lo = 0; lo <= 9; lo++) {
    const w = (m2 >> lo) & 0x1f;
    const bits = popcount(w);
    if (bits === 4) { if (w === 0x1e || w === 0x0f) oesd = true; else gut = true; }
  }
  return { flushDraw, oesd: oesd && !hasStraight(m2), gut };
}
const popcount = (x) => { let n = 0; while (x) { x &= x - 1; n++; } return n; };
const hasStraight = (m2) => { for (let lo = 0; lo <= 9; lo++) if (((m2 >> lo) & 0x1f) === 0x1f) return true; return false; };

// 牌力等級：0 空氣、1 弱對、2 中對、3 頂對、4 超對/兩對以上
export function madeLevel(hole, board) {
  const score = evaluate(hole.concat(board));
  const cat = score >> 20;
  if (cat >= 2) {
    // 兩對以上但兩對都在公牌上就不算
    const bscore = board.length >= 5 ? evaluate(board) : -1;
    if (bscore >= 0 && (bscore >> 20) === cat && score === bscore) return 0;
    return 4;
  }
  if (cat === 1) {
    const pr = (score >> 12) & 0xf;
    const boardRanks = board.map((c) => c >> 2).sort((a, b) => b - a);
    const holeRanks = hole.map((c) => c >> 2);
    if (!holeRanks.includes(pr)) return 0; // 公牌上的對子
    if (holeRanks[0] === holeRanks[1]) return pr > boardRanks[0] ? 4 : pr > boardRanks[1] ? 2 : 1;
    if (pr === boardRanks[0]) return 3;
    return pr >= boardRanks[1] ? 2 : 1;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// 勝率模擬：opps 為每位對手的範圍描述 { top, aggr }。
// top：起手牌前百分比上限；aggr：翻牌後主動下注／加注的次數（用來縮小範圍）。
export function equity(hole, board, opps, iters = 400) {
  const used = new Uint8Array(52);
  for (const c of hole) used[c] = 1;
  for (const c of board) used[c] = 1;
  const deck = [];
  for (let c = 0; c < 52; c++) if (!used[c]) deck.push(c);
  const need = 5 - board.length;
  const all = new Array(7);
  let win = 0;
  const oppHands = opps.map(() => [0, 0]);
  const taken = new Uint8Array(52);
  for (let it = 0; it < iters; it++) {
    taken.fill(0);
    for (let k = 0; k < opps.length; k++) {
      const o = opps[k];
      let a, b, tries = 0;
      while (true) {
        a = deck[(Math.random() * deck.length) | 0];
        b = deck[(Math.random() * deck.length) | 0];
        if (a === b || taken[a] || taken[b]) continue;
        tries++;
        if (tries > 60 || fits(a, b, board, o)) break;
      }
      taken[a] = taken[b] = 1;
      oppHands[k][0] = a; oppHands[k][1] = b;
    }
    const runout = board.slice();
    while (runout.length < 5) {
      const c = deck[(Math.random() * deck.length) | 0];
      if (taken[c]) continue;
      taken[c] = 1;
      runout.push(c);
    }
    for (let i = 0; i < 5; i++) all[i] = runout[i];
    all[5] = hole[0]; all[6] = hole[1];
    const mine = evaluate(all, 7);
    let best = 0, ties = 0;
    for (const [a, b] of oppHands) {
      all[5] = a; all[6] = b;
      const s = evaluate(all, 7);
      if (s > best) best = s;
    }
    if (mine > best) win += 1;
    else if (mine === best) {
      for (const [a, b] of oppHands) { all[5] = a; all[6] = b; if (evaluate(all, 7) === mine) ties++; }
      win += 1 / (ties + 1);
    }
  }
  return need >= 0 ? win / iters : 0;
}

function fits(a, b, board, o) {
  if (o.top < 1 && handTop(a, b) > o.top) return false;
  if (!o.aggr || board.length < 3) return true;
  // 翻牌後下注過：大多是有牌或有聽牌，少數是詐唬
  const lvl = madeLevel([a, b], board);
  const d = draws([a, b], board);
  const drawing = board.length < 5 && (d.flushDraw || d.oesd);
  if (o.aggr >= 2) return lvl >= 3 || (drawing && lvl >= 1) || Math.random() < 0.1;
  return lvl >= 2 || drawing || Math.random() < 0.22;
}

// 產生 ORDER 用（開發時在主控台執行 equityTable() 可重新計算）
export function equityTable(iters = 20000) {
  const res = [];
  for (let hi = 12; hi >= 0; hi--) for (let lo = hi; lo >= 0; lo--) {
    const kinds = hi === lo ? [[hi * 4, lo * 4 + 1]] : [[hi * 4, lo * 4], [hi * 4, lo * 4 + 1]];
    for (const [a, b] of kinds) res.push([className(classOf(a, b)), equity([a, b], [], [{ top: 1 }], iters)]);
  }
  return res.sort((x, y) => y[1] - x[1]).map((x) => x[0]).join(' ');
}
