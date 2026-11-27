// 台灣十六張麻將的牌局流程與電腦玩家。狀態可 JSON 化以便存檔接續。
import { typeOf, isFlower, isHonor, counts, shanten, ukeire, waits, scoreHand, tileName } from './rules.js';

export const RESERVE = 16; // 留牌（最後 8 墩不摸）
const N = 4;
export const next = (p) => (p + 1) % N;

export function createGame({ names, chips, di, tai }) {
  return {
    di, tai, round: 0, dealer: 0, lian: 0, hands: 0, passes: 0,
    players: names.map((name, i) => ({ name, human: i === 0, chips: chips[i] })),
    phase: 'idle', log: [],
  };
}

export const liveLeft = (G) => G.wall.length - RESERVE;
const seatWind = (G, p) => (p - G.dealer + N) % N;

export function startHand(G) {
  G.hands++;
  G.wall = (function () { const w = Array.from({ length: 144 }, (_, i) => i); for (let i = w.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [w[i], w[j]] = [w[j], w[i]]; } return w; })();
  for (const P of G.players) Object.assign(P, { hand: [], melds: [], flowers: [], discards: [], drew: 0, lastDraw: -1, kongDraw: false });
  G.result = null;
  G.calls = 0;
  G.lastDiscard = null;
  G.events = [];
  for (let r = 0; r < 4; r++) for (let k = 0; k < N; k++) { const p = (G.dealer + k) % N; for (let j = 0; j < 4; j++) G.players[p].hand.push(G.wall.shift()); }
  G.players[G.dealer].hand.push(G.wall.shift());
  // 補花（從莊家開始）
  for (let k = 0; k < N; k++) {
    const p = (G.dealer + k) % N;
    replaceFlowers(G, p);
    if (G.result) return;
  }
  G.turn = G.dealer;
  G.players[G.dealer].lastDraw = G.players[G.dealer].hand[G.players[G.dealer].hand.length - 1];
  G.phase = 'act'; // 莊家直接打牌
  G.players[G.dealer].drew = 1;
}

// 把手上的花牌亮出並從牌尾補牌；回傳最後補到的牌
function replaceFlowers(G, p) {
  const P = G.players[p];
  let got = -1;
  for (let guard = 0; guard < 10; guard++) {
    const f = P.hand.find(isFlower);
    if (f === undefined) break;
    P.hand.splice(P.hand.indexOf(f), 1);
    P.flowers.push(f);
    G.events.push({ type: 'flower', p, id: f });
    if (checkFlowerWins(G, p)) return -1;
    got = G.wall.pop();
    P.hand.push(got);
  }
  return got;
}

function checkFlowerWins(G, p) {
  const P = G.players[p];
  if (P.flowers.length === 8) { finishWin(G, p, { special: '八仙過海', selfDraw: true }); return true; }
  // 七搶一：別人有七張花，你摸到第八張
  for (let q = 0; q < N; q++) {
    if (q !== p && G.players[q].flowers.length === 7) { finishWin(G, q, { special: '七搶一', selfDraw: false, from: p }); return true; }
  }
  return false;
}

// 摸牌：回傳 false 表示流局
export function draw(G, p, fromBack = false) {
  if (liveLeft(G) <= 0) { finishDraw(G); return false; }
  const P = G.players[p];
  let id = fromBack ? G.wall.pop() : G.wall.shift();
  P.hand.push(id);
  if (isFlower(id)) { const got = replaceFlowers(G, p); if (G.result) return true; id = got; }
  P.lastDraw = id;
  P.kongDraw = fromBack;
  P.drew++;
  G.turn = p;
  G.phase = 'act';
  return true;
}

const need = (P) => 5 - P.melds.length;
export const handCounts = (P) => counts(P.hand);

// 目前（自己回合）可做的事
export function selfOptions(G, p) {
  const P = G.players[p];
  const c = handCounts(P);
  const opts = { tsumo: false, ankan: [], kakan: [] };
  if (P.lastDraw < 0) return opts; // 吃碰後只能打牌
  if (shanten(c, need(P)) === -1) opts.tsumo = true;
  if (liveLeft(G) > 0) {
    for (let t = 0; t < 34; t++) if (c[t] === 4) opts.ankan.push(t);
    for (const m of P.melds) if (m.kind === 'pung' && c[m.t] >= 1) opts.kakan.push(m.t);
  }
  return opts;
}

// 別人打出 tile 後，玩家 p 可以做的事
export function claimOptions(G, p, id, from) {
  const P = G.players[p];
  const t = typeOf(id);
  const c = handCounts(P);
  const o = { ron: false, pung: false, kong: false, chows: [] };
  c[t]++;
  o.ron = shanten(c, need(P)) === -1;
  c[t]--;
  if (liveLeft(G) <= 0) return { ron: o.ron, pung: false, kong: false, chows: [] }; // 河底只能胡
  if (c[t] >= 2) o.pung = true;
  if (c[t] >= 3) o.kong = true;
  if (p === next(from) && t < 27) {
    const r = t % 9;
    for (const s of [t - 2, t - 1, t]) {
      if (s < 0 || s % 9 > 6 || (s / 9 | 0) !== (t / 9 | 0) || Math.abs(s % 9 - r) > 2 || s % 9 > r) continue;
      const others = [s, s + 1, s + 2].filter((x) => x !== t);
      if (others.every((x) => c[x] > 0)) o.chows.push(s);
    }
  }
  return o;
}
export const hasClaim = (o) => o.ron || o.pung || o.kong || o.chows.length > 0;

export function discard(G, p, id) {
  const P = G.players[p];
  P.hand.splice(P.hand.indexOf(id), 1);
  P.discards.push(id);
  P.lastDraw = -1;
  G.lastDiscard = { id, from: p };
  G.phase = 'claim';
}

const takeTypes = (P, t, n) => { const out = []; for (let k = 0; k < n; k++) { const i = P.hand.findIndex((x) => typeOf(x) === t); out.push(P.hand.splice(i, 1)[0]); } return out; };

export function doClaim(G, p, kind, chowStart) {
  const P = G.players[p];
  const { id, from } = G.lastDiscard;
  const t = typeOf(id);
  G.players[from].discards.pop();
  G.calls++;
  if (kind === 'pung') P.melds.push({ kind: 'pung', t, ids: [...takeTypes(P, t, 2), id], from });
  else if (kind === 'kong') P.melds.push({ kind: 'kong', t, ids: [...takeTypes(P, t, 3), id], from });
  else {
    const ids = [];
    for (const x of [chowStart, chowStart + 1, chowStart + 2]) ids.push(x === t ? id : takeTypes(P, x, 1)[0]);
    P.melds.push({ kind: 'chow', t: chowStart, ids, from });
  }
  G.lastDiscard = null;
  G.turn = p;
  P.lastDraw = -1;
  if (kind === 'kong') return draw(G, p, true);
  G.phase = 'act';
  return true;
}

export function doAnkan(G, p, t) {
  const P = G.players[p];
  P.melds.push({ kind: 'kong', t, ids: takeTypes(P, t, 4), concealed: true });
  return draw(G, p, true);
}
// 加槓：先讓別人有機會搶槓（由呼叫端處理），再補牌
export function doKakan(G, p, t) {
  const P = G.players[p];
  const m = P.melds.find((x) => x.kind === 'pung' && x.t === t);
  m.kind = 'kong';
  m.ids.push(takeTypes(P, t, 1)[0]);
  return draw(G, p, true);
}

// ---------------------------------------------------------------------------
// 結算

function finishDraw(G) {
  G.result = { type: 'draw' };
  G.phase = 'done';
  advanceDealer(G, true);
}

function advanceDealer(G, keep) {
  G.prevDealer = G.dealer;
  if (keep) { G.lian++; return; }
  G.lian = 0;
  G.dealer = next(G.dealer);
  G.passes++;
  if (G.passes % 4 === 0) G.round = (G.round + 1) % 4;
}

// opts: { selfDraw, from, robKong, special }
export function finishWin(G, w, opts) {
  const W = G.players[w];
  let tai, items;
  const dealer = G.dealer, lian = G.lian;
  if (opts.special) { tai = 8; items = [[opts.special, 8]]; }
  else {
    const winTile = opts.selfDraw ? typeOf(W.lastDraw) : typeOf(opts.tile);
    const hand = opts.selfDraw ? W.hand.slice() : W.hand.concat([opts.tile]);
    // 胡之前（少了胡的那張）聽幾種牌
    const before = hand.slice(); before.splice(before.findIndex((x) => typeOf(x) === winTile), 1);
    const waitKinds = waits(counts(before), need(W)).length;
    const r = scoreHand({
      hand, melds: W.melds, flowers: W.flowers, win: winTile, selfDraw: opts.selfDraw,
      seat: seatWind(G, w), round: G.round, lastTile: liveLeft(G) <= 0, kongDraw: opts.selfDraw && W.kongDraw, robKong: !!opts.robKong,
      heaven: opts.selfDraw && w === dealer && W.drew === 1 && G.calls === 0 && !G.players.some((P, k) => k !== w && P.discards.length),
      earth: opts.selfDraw && w !== dealer && G.calls === 0 && W.drew === 1 && W.discards.length === 0,
      waitKinds,
    });
    tai = r.tai; items = r.items;
    if (!opts.selfDraw) {
      W.hand.push(opts.tile);
      if (!opts.robKong) G.players[opts.from].discards.pop();
    }
  }
  const payers = opts.selfDraw ? [0, 1, 2, 3].filter((k) => k !== w) : [opts.from];
  const pays = payers.map((k) => {
    const extra = w === dealer || k === dealer ? 1 + 2 * lian : 0;
    const amount = G.di + G.tai * (tai + extra);
    return { from: k, amount, extra };
  });
  for (const x of pays) {
    const paid = Math.min(x.amount, Math.max(0, G.players[x.from].chips));
    x.paid = paid;
    G.players[x.from].chips -= paid;
    W.chips += paid;
  }
  G.result = { type: 'win', winner: w, selfDraw: opts.selfDraw, from: opts.from, tai, items, pays, dealer, lian, tile: opts.tile };
  G.phase = 'done';
  advanceDealer(G, w === dealer);
}

// ---------------------------------------------------------------------------
// 電腦玩家

// 從玩家 p 的角度，每種牌還有幾張沒看到
export function unseenFor(G, p) {
  const seen = new Array(34).fill(0);
  const P = G.players[p];
  for (const id of P.hand) { const t = typeOf(id); if (t < 34) seen[t]++; }
  for (const Q of G.players) {
    for (const id of Q.discards) seen[typeOf(id)]++;
    for (const m of Q.melds) for (const id of m.ids) seen[typeOf(id)]++;
  }
  return seen.map((s) => Math.max(0, 4 - s));
}

function danger(G, p) {
  // 有對手看起來快胡了：副露多或已到後段
  let d = 0;
  G.players.forEach((Q, k) => { if (k !== p) d = Math.max(d, Q.melds.length >= 3 ? 2 : Q.melds.length === 2 && liveLeft(G) < 50 ? 1 : 0); });
  if (liveLeft(G) < 24) d = Math.max(d, 1);
  return d;
}

function safety(G, p, t) {
  // 越大越安全
  const unseen = unseenFor(G, p);
  let s = 4 - unseen[t];
  if (isHonor(t)) s += 1.5;
  else { const r = t % 9; if (r === 0 || r === 8) s += 0.8; else if (r === 1 || r === 7) s += 0.3; }
  // 其他人最近打過的牌較安全
  G.players.forEach((Q, k) => { if (k !== p && Q.discards.slice(-6).some((id) => typeOf(id) === t)) s += 1; });
  return s;
}

const valueHonor = (G, p, t) => t >= 31 || t === 27 + seatWind(G, p) || t === 27 + G.round;

export function aiDiscard(G, p) {
  const P = G.players[p];
  const c = handCounts(P);
  const m = need(P);
  const unseen = unseenFor(G, p);
  const cur = shanten(c, m);
  const dz = danger(G, p);
  let best = null;
  const seenT = new Set();
  for (const id of P.hand) {
    const t = typeOf(id);
    if (seenT.has(t)) continue;
    seenT.add(t);
    c[t]--;
    const sh = shanten(c, m);
    const uk = ukeire(c, m, unseen).n;
    c[t]++;
    let score = -sh * 1000 + uk * 10;
    // 孤立字牌先打（但留著有台的字牌對子）
    if (isHonor(t)) score += c[t] === 1 ? (valueHonor(G, p, t) ? 4 : 8) : -6;
    else { const r = t % 9; if (r === 0 || r === 8) score += 3; }
    const safe = safety(G, p, t);
    if (dz && cur >= 2) score = -sh * 300 + uk * 2 + safe * 60;
    else if (dz) score += safe * 6;
    if (!best || score > best.score) best = { id, score };
  }
  // 優先打最近摸到的同種牌（視覺上比較自然）
  const t = typeOf(best.id);
  if (P.lastDraw >= 0 && typeOf(P.lastDraw) === t) return P.lastDraw;
  return best.id;
}

// 回傳 { kind: 'ron'|'kong'|'pung'|'chow'|'pass', chow }
export function aiClaim(G, p, o, id) {
  if (o.ron) return { kind: 'ron' };
  const P = G.players[p];
  const t = typeOf(id);
  const c = handCounts(P);
  const m = need(P);
  const cur = shanten(c, m);
  const afterCall = (remove) => {
    const cc = c.slice();
    for (const x of remove) cc[x]--;
    // 吃碰後還要打一張：取最好的結果
    let best = 99;
    for (let k = 0; k < 34; k++) if (cc[k]) { cc[k]--; best = Math.min(best, shanten(cc, m - 1)); cc[k]++; }
    return best;
  };
  if (o.kong) {
    const cc = c.slice(); cc[t] -= 3;
    if (shanten(cc, m - 1) <= cur && liveLeft(G) > 4) return { kind: 'kong' };
  }
  if (o.pung) {
    const after = afterCall([t, t]);
    if (after < cur || (after === cur && isHonor(t) && valueHonor(G, p, t)) || (valueHonor(G, p, t) && after <= cur + 0)) return { kind: 'pung' };
  }
  if (o.chows.length) {
    const open = P.melds.some((x) => !x.concealed);
    let bestS = null, bestV = 99;
    for (const s of o.chows) {
      const v = afterCall([s, s + 1, s + 2].filter((x) => x !== t));
      if (v < bestV) { bestV = v; bestS = s; }
    }
    if (bestV < cur && (open || cur >= 2)) return { kind: 'chow', chow: bestS };
  }
  return { kind: 'pass' };
}

export function aiSelf(G, p, so) {
  if (so.tsumo) return { kind: 'tsumo' };
  const P = G.players[p];
  const c = handCounts(P);
  const m = need(P);
  const cur = shanten(c, m);
  for (const t of so.ankan) { const cc = c.slice(); cc[t] -= 4; if (shanten(cc, m - 1) <= cur) return { kind: 'ankan', t }; }
  for (const t of so.kakan) { const cc = c.slice(); cc[t] -= 1; if (shanten(cc, m) <= cur) return { kind: 'kakan', t }; }
  return null;
}

export { tileName, typeOf, shanten, waits, counts };
