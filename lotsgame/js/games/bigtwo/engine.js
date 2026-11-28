// 大老二（台灣規則）：牌型判定、比大小、出牌產生，以及電腦玩家的拆牌與出牌策略。
// 牌以 0–51 表示：點數 r = c >> 2（0 = 3 … 11 = A、12 = 2），花色 s = c & 3（梅花 < 方塊 < 紅心 < 黑桃）。
// 數字越大的牌越大，所以單張直接比 c。

export const RANKS = '3456789TJQKA2', SUITS = 'CDHS';
export const rankOf = (c) => c >> 2, suitOf = (c) => c & 3;
export const code = (c) => RANKS[c >> 2] + SUITS[c & 3]; // 對應 assets/cards/<code>.webp
const FACE = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
export const label = (c) => '♣♦♥♠'[c & 3] + FACE[c >> 2];
export const CLUB3 = 0;
export const TYPE_NAME = { single: '單張', pair: '對子', straight: '順子', full: '葫蘆', four: '鐵支', sflush: '同花順' };

// 順子大小：34567 最小 … 10JQKA，再來 A2345，最大 23456；JQKA2、QKA23、KA234 不算順子。
// 回傳強度 0–9 與決定同強度大小的關鍵牌點數（一般順子為最大張，含 2 的順子為 2）。
function straightInfo(ranks) {
  const f = ranks.map((r) => (r === 12 ? 2 : r + 3)).sort((a, b) => a - b); // 面值：2、3…14(A)
  const is = (arr) => arr.every((v, k) => f[k] === v);
  if (is([2, 3, 4, 5, 6])) return { st: 9, keyRank: 12 };
  if (is([2, 3, 4, 5, 14])) return { st: 8, keyRank: 12 };
  if (f[0] >= 3 && f[4] - f[0] === 4 && new Set(f).size === 5) return { st: f[0] - 3, keyRank: f[4] - 3 };
  return null;
}

// 判定一手牌的牌型；不合法回傳 null。key 越大越大；五張牌先比 cat（順子 1、葫蘆 2、鐵支 3、同花順 4）。
export function classify(cards) {
  const s = cards.slice().sort((a, b) => a - b), n = s.length;
  if (n === 1) return { type: 'single', n, cat: 0, key: s[0], cards: s };
  if (n === 2) return rankOf(s[0]) === rankOf(s[1]) ? { type: 'pair', n, cat: 0, key: s[1], cards: s } : null;
  if (n !== 5) return null;
  const cnt = new Map();
  for (const c of s) cnt.set(rankOf(c), (cnt.get(rankOf(c)) || 0) + 1);
  const g = [...cnt.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  if (g[0][1] === 4) return { type: 'four', n, cat: 3, key: g[0][0], cards: s };
  if (g[0][1] === 3 && g[1][1] === 2) return { type: 'full', n, cat: 2, key: g[0][0], cards: s };
  if (g.length === 5) {
    const si = straightInfo(s.map(rankOf));
    if (!si) return null;
    const kc = s.find((c) => rankOf(c) === si.keyRank);
    const flush = s.every((c) => suitOf(c) === suitOf(s[0]));
    return { type: flush ? 'sflush' : 'straight', n, cat: flush ? 4 : 1, key: si.st * 4 + suitOf(kc), cards: s };
  }
  return null;
}

export const isBomb = (p) => p && (p.type === 'four' || p.type === 'sflush');

// a 能不能壓過 b（b 為 null 表示自由出牌）。鐵支、同花順可以切單張與對子。
export function beats(a, b) {
  if (!a) return false;
  if (!b) return true;
  if (b.n !== 5 && isBomb(a)) return true;
  if (a.n !== b.n) return false;
  if (a.n === 5) return a.cat !== b.cat ? a.cat > b.cat : a.key > b.key;
  return a.key > b.key;
}

const byRank = (hand) => {
  const m = Array.from({ length: 13 }, () => []);
  for (const c of hand) m[rankOf(c)].push(c);
  for (const a of m) a.sort((x, y) => x - y);
  return m;
};
const combos = (arr, k) => {
  const out = [];
  const rec = (st, cur) => { if (cur.length === k) { out.push(cur.slice()); return; } for (let i = st; i < arr.length; i++) { cur.push(arr[i]); rec(i + 1, cur); cur.pop(); } };
  rec(0, []);
  return out;
};
// 所有順子的點數組合（r 索引）
const WINDOWS = [];
for (let st = 0; st <= 7; st++) WINDOWS.push([0, 1, 2, 3, 4].map((k) => st + k));
WINDOWS.push([11, 12, 0, 1, 2], [12, 0, 1, 2, 3]);

// 列出手上所有合法牌組（full = true 時列出每一種花色組合；否則同點數結構只留代表）
export function allPlays(hand, full = true) {
  const R = byRank(hand), out = [];
  for (const c of hand) out.push(classify([c]));
  for (const a of R) for (const p of combos(a, 2)) out.push(classify(p));
  for (const w of WINDOWS) {
    if (!w.every((r) => R[r].length)) continue;
    if (full) {
      const rec = (k, cur) => { if (k === 5) { out.push(classify(cur)); return; } for (const c of R[w[k]]) rec(k + 1, cur.concat(c)); };
      rec(0, []);
    } else {
      out.push(classify(w.map((r) => R[r][0])));
      for (let s = 0; s < 4; s++) { const f = w.map((r) => R[r].find((c) => suitOf(c) === s)); if (f.every((c) => c != null)) out.push(classify(f)); }
    }
  }
  for (let t = 0; t < 13; t++) {
    if (R[t].length < 3) continue;
    const trips = full ? combos(R[t], 3) : [R[t].slice(0, 3)];
    for (let p = 0; p < 13; p++) {
      if (p === t || R[p].length < 2) continue;
      const pairs = full ? combos(R[p], 2) : [R[p].slice(0, 2)];
      for (const a of trips) for (const b of pairs) out.push(classify(a.concat(b)));
    }
    if (R[t].length === 4) {
      const kick = hand.filter((c) => rankOf(c) !== t);
      for (const k of full ? kick : kick.slice().sort((a, b) => a - b).slice(0, 1)) out.push(classify(R[t].concat(k)));
    }
  }
  // 同點數的順子只留不同 key 的版本
  const seen = new Set();
  return out.filter((p) => { const k = p.cards.join(','); if (seen.has(k)) return false; seen.add(k); return true; });
}

// ---------------------------------------------------------------------------
// 電腦玩家：先把手牌拆成「最少手數、最少弱牌」的組合，再依局勢決定出牌。

// 一個組合的「弱度」：越難打出去越大。2 與炸彈是控制牌，弱度為負。
function weakness(p) {
  if (isBomb(p)) return -0.7;
  if (p.n === 5) return p.cat >= 2 ? 0.05 : 0.25 - (p.key >> 2) * 0.02;
  const r = rankOf(p.key);
  if (r === 12) return p.n === 2 ? -0.6 : -0.35;
  return (p.n === 2 ? 0.75 : 1) * (1 - r / 12);
}

// 剩下的牌（不再組五張）拆成對子與單張
function restPlan(hand) {
  const R = byRank(hand), plan = [];
  for (const a of R) {
    if (a.length >= 2) plan.push(classify(a.slice(0, 2)));
    if (a.length === 4) plan.push(classify(a.slice(2, 4)));
    else if (a.length === 3) plan.push(classify([a[2]]));
    else if (a.length === 1) plan.push(classify([a[0]]));
  }
  return plan;
}
const planScore = (plan) => plan.reduce((s, p) => s + 1 + 0.9 * weakness(p), 0);

// 找出最佳拆法（最多兩組五張牌）
export function bestPlan(hand) {
  const five = allPlays(hand, false).filter((p) => p.n === 5);
  let best = restPlan(hand), bestS = planScore(best);
  const without = (h, p) => h.filter((c) => !p.cards.includes(c));
  for (let i = 0; i < five.length; i++) {
    const h1 = without(hand, five[i]);
    const p1 = [five[i]].concat(restPlan(h1));
    const s1 = planScore(p1);
    if (s1 < bestS) { best = p1; bestS = s1; }
    for (let j = i + 1; j < five.length; j++) {
      if (five[j].cards.some((c) => five[i].cards.includes(c))) continue;
      const p2 = [five[i], five[j]].concat(restPlan(without(h1, five[j])));
      const s2 = planScore(p2);
      if (s2 < bestS) { best = p2; bestS = s2; }
    }
  }
  return { plan: best, score: bestS };
}

// 對手（看不到的牌）有沒有可能壓過 p。maxOpp：對手手牌最多幾張。
function beatable(p, unseen, maxOpp) {
  if (maxOpp < p.n) return false;
  const R = byRank(unseen);
  const bombs = maxOpp >= 5 && (R.some((a) => a.length === 4) || WINDOWS.some((w) => [0, 1, 2, 3].some((s) => w.every((r) => R[r].some((c) => suitOf(c) === s)))));
  if (p.n === 1) return unseen.some((c) => c > p.key) || bombs;
  if (p.n === 2) return R.some((a, r) => a.length >= 2 && a[a.length - 1] > p.key) || bombs;
  // 五張：只檢查同類更大或更高類
  return allPlays(unseen, false).some((q) => q.n === 5 && beats(q, p)) || unseen.length >= 5 && (p.type === 'straight' || p.type === 'full') && R.some((a) => a.length === 4);
}

export const TUNE = { lam: [0.03, 0.08, 0.18, 0.35], bomb: 1.6, two: 0.3, eager: 0 };

// 電腦決策。view：{ hand, cur（場上牌型或 null）, mustClub3, unseen, opp: [{ n, next }], ownerCards（場上牌主人剩幾張）, level }
// 回傳要出的牌陣列，或 null 表示過。
export function decide(view) {
  const { hand, cur, mustClub3, unseen, opp, level = 2 } = view;
  let legal = allPlays(hand).filter((p) => beats(p, cur));
  if (mustClub3) legal = legal.filter((p) => p.cards.includes(CLUB3));
  if (!legal.length) return null;
  // 一次出完就出
  const finish = legal.find((p) => p.n === hand.length);
  if (finish) return finish.cards;
  const maxOpp = Math.max(...opp.map((o) => o.n));
  const minOpp = Math.min(...opp.map((o) => o.n));
  const nextN = opp.find((o) => o.next).n;
  const counting = level >= 2; // 新手桌不記牌，只把 2 當控制牌
  const isControl = (p) => (counting ? !beatable(p, unseen, maxOpp) : rankOf(p.cards[p.cards.length - 1]) === 12 || isBomb(p));
  const tune = view.tune || TUNE;
  // 局面成本 = 還要幾手才出得完（拆牌分數）＋ 對手若此刻出完我要賠的點數 × 風險係數
  // 對手剩越少張，風險係數越高：越願意拆牌、先把 2 和大量的牌打掉
  const lam = minOpp >= 9 ? tune.lam[0] : minOpp >= 6 ? tune.lam[1] : minOpp >= 4 ? tune.lam[2] : tune.lam[3];
  const costOf = (h) => bestPlan(h).score + lam * penalty(h).points;
  const after = (p) => hand.filter((c) => !p.cards.includes(c));
  const noise = level <= 1 ? 0.45 : 0;
  const base = bestPlan(hand);

  if (!cur) {
    // 自由出牌：除了最後一手以外都是控制牌時，先出控制牌，最後一手留著收尾
    if (!mustClub3 && base.plan.length >= 2) {
      const ctrl = base.plan.filter(isControl);
      if (base.plan.length - ctrl.length <= 1 && ctrl.length) return ctrl.sort((a, b) => b.n - a.n)[0].cards;
    }
    let best = null;
    for (const p of legal) {
      let c = costOf(after(p));
      if (isBomb(p)) c += tune.bomb * 0.5;
      // 下家只剩一張：小單張等於送他出完
      if (nextN === 1 && p.n === 1 && !isControl(p)) c += 3 + (12 - rankOf(p.key)) * 0.1;
      // 有人只剩兩張：不出他可能用對子收掉的小對子
      if (minOpp === 2 && p.n === 2 && !isControl(p)) c += 1.2;
      c += Math.random() * noise;
      if (!best || c < best.c) best = { p, c };
    }
    return best.p.cards;
  }

  // 場上牌主人快出完：優先用壓得住的牌搶回出牌權，否則出最大的
  if (view.ownerCards <= 2 || (cur.n === 1 && nextN === 1)) {
    const ctrl = legal.filter(isControl).sort((a, b) => costOf(after(a)) - costOf(after(b)));
    if (ctrl.length) return ctrl[0].cards;
    return legal.slice().sort((a, b) => (b.n === 5 ? b.cat * 100 + b.key : b.key) - (a.n === 5 ? a.cat * 100 + a.key : a.key))[0].cards;
  }
  // 跟牌：比較每一種壓法與「過」的局面成本
  let best = null;
  for (const p of legal) {
    let c = costOf(after(p));
    if (isBomb(p) && cur.n !== 5) c += tune.bomb; // 炸彈留到關鍵時刻
    if (rankOf(p.cards[p.cards.length - 1]) === 12 && p.n < 5 && minOpp >= 8) c += tune.two; // 牌局初期 2 不急著用
    c += Math.random() * noise;
    if (!best || c < best.c) best = { p, c };
  }
  if (best.c < costOf(hand) - tune.eager) return best.p.cards;
  return null;
}

// ---------------------------------------------------------------------------
// 模擬推演：把看不到的牌隨機分給對手（張數與實際相同），每個候選出法各打到結束，
// 以實際計分（贏家收、輸家依剩牌與 2 加倍賠）的平均值挑最好的。

// 推演時用的快速策略：跟牌出能壓過的最小牌組（不拆對子優先），自由出牌先出張數多、最小的組合
function quickMove(hand, cur, mustClub3) {
  let L = allPlays(hand, false).filter((p) => beats(p, cur));
  if (mustClub3) L = L.filter((p) => p.cards.includes(CLUB3));
  if (!L.length) return null;
  const R = byRank(hand);
  const breaks = (p) => p.n === 1 && R[rankOf(p.key)].length >= 2 ? 1 : 0;
  const val = (p) => (p.n === 5 ? p.cat * 100 + p.key : p.key) + (isBomb(p) && cur && cur.n < 5 ? 1000 : 0);
  if (cur) { L.sort((a, b) => breaks(a) - breaks(b) || val(a) - val(b)); return L[0].cards; }
  L.sort((a, b) => b.n - a.n || val(a) - val(b));
  return L[0].cards;
}

// 從某個局面打到結束，回傳四家的得分（贏家 +、輸家 −，單位為點數）
function playout(hands, cur, owner, passed, turn, mustClub3) {
  hands = hands.map((h) => h.slice()); passed = passed.slice();
  for (let guard = 0; guard < 300; guard++) {
    const mv = quickMove(hands[turn], cur, mustClub3);
    if (mv) {
      hands[turn] = hands[turn].filter((c) => !mv.includes(c));
      cur = classify(mv); owner = turn; mustClub3 = false;
      if (!hands[turn].length) return score(hands, turn);
    } else if (cur) passed[turn] = true;
    // 下一位
    let j = turn;
    for (let k = 0; k < 4; k++) {
      j = (j + 1) % 4;
      if (j === owner) { cur = null; passed = [false, false, false, false]; break; }
      if (!passed[j]) break;
    }
    turn = j;
  }
  return [0, 0, 0, 0];
}
function score(hands, w) {
  const out = hands.map((h) => -penalty(h).points);
  out[w] = -out.reduce((a, b) => a + b, 0);
  return out;
}

// st：{ hands（只有 me 的手牌是真的，其餘只用張數）, me, cur, owner, passed, mustClub3, played }
export function searchMove(st, { samples = 24, width = 8 } = {}) {
  const { me } = st, hand = st.hands[me];
  let legal = allPlays(hand).filter((p) => beats(p, st.cur));
  if (st.mustClub3) legal = legal.filter((p) => p.cards.includes(CLUB3));
  if (!legal.length) return null;
  const fin = legal.find((p) => p.n === hand.length);
  if (fin) return fin.cards;
  // 候選：拆牌評分最好的幾種，加上快速策略的選擇，跟牌時再加上「過」
  const base = bestPlan(hand).score;
  const ranked = legal.map((p) => ({ p, s: bestPlan(hand.filter((c) => !p.cards.includes(c))).score - base + (isBomb(p) && st.cur && st.cur.n < 5 ? 1 : 0) }))
    .sort((a, b) => a.s - b.s).slice(0, width).map((x) => x.p.cards);
  const q = quickMove(hand, st.cur, st.mustClub3);
  if (q && !ranked.some((c) => c.join() === q.join())) ranked.push(q);
  const cands = ranked.slice();
  if (st.cur) cands.push(null);
  // 看不到的牌
  const known = new Set(hand.concat(st.played));
  const unseen = [];
  for (let c = 0; c < 52; c++) if (!known.has(c)) unseen.push(c);
  const total = cands.map(() => 0);
  for (let s = 0; s < samples; s++) {
    const d = unseen.slice();
    for (let i = d.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [d[i], d[j]] = [d[j], d[i]]; }
    const hands = [], need = st.hands.map((h) => h.length);
    let k = 0;
    for (let i = 0; i < 4; i++) { if (i === me) hands.push(hand); else { hands.push(d.slice(k, k + need[i])); k += need[i]; } }
    cands.forEach((mv, ci) => {
      const hs = hands.slice();
      let cur = st.cur, owner = st.owner, passed = st.passed.slice(), mc = st.mustClub3;
      if (mv) {
        hs[me] = hand.filter((c) => !mv.includes(c));
        cur = classify(mv); owner = me; mc = false;
      } else passed[me] = true;
      let j = me;
      for (let t = 0; t < 4; t++) { j = (j + 1) % 4; if (j === owner) { cur = null; passed = [false, false, false, false]; break; } if (!passed[j]) break; }
      total[ci] += playout(hs, cur, owner, passed, j, mc)[me];
    });
  }
  let bi = 0;
  for (let i = 1; i < cands.length; i++) if (total[i] > total[bi]) bi = i;
  return cands[bi];
}

// 提示：依電腦的判斷排序所有可出的牌
export function hints(hand, cur, mustClub3) {
  let legal = allPlays(hand).filter((p) => beats(p, cur));
  if (mustClub3) legal = legal.filter((p) => p.cards.includes(CLUB3));
  const base = bestPlan(hand).score;
  return legal
    .map((p) => ({ p, s: bestPlan(hand.filter((c) => !p.cards.includes(c))).score + (isBomb(p) && cur && cur.n !== 5 ? 1.5 : 0) + (!cur && p.n === 5 ? -0.3 : 0) - base }))
    .sort((a, b) => a.s - b.s || a.p.key - b.p.key)
    .map((x) => x.p.cards);
}

// 結算：剩 n 張扣 n 分；10 張以上加倍；手上每張 2 再加倍；最多 8 倍。
export function penalty(cards) {
  const n = cards.length;
  if (!n) return { n, mult: 1, points: 0 };
  let mult = n >= 10 ? 2 : 1;
  for (const c of cards) if (rankOf(c) === 12) mult *= 2;
  mult = Math.min(8, mult);
  return { n, mult, points: n * mult };
}

export function shuffled() {
  const d = Array.from({ length: 52 }, (_, i) => i);
  const rnd = new Uint32Array(52);
  crypto.getRandomValues(rnd);
  for (let i = 51; i > 0; i--) { const j = rnd[i] % (i + 1); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}
