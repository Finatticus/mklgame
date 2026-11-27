// 台灣十六張麻將：牌、向聽數、胡牌拆解與台數計算。
// 牌種 0–8 萬、9–17 筒、18–26 條、27–30 東南西北、31–33 中發白、34–41 春夏秋冬梅蘭竹菊。
// 實體牌 id：0–135 為 type*4+copy；136–143 為八張花牌。

export const typeOf = (id) => (id < 136 ? id >> 2 : 34 + (id - 136));
export const isFlower = (id) => id >= 136;
export const isHonor = (t) => t >= 27 && t < 34;
export const suitOf = (t) => (t < 27 ? (t / 9) | 0 : 3);
const NUM = '一二三四五六七八九';
export const tileName = (t) => (t < 9 ? NUM[t] + '萬' : t < 18 ? NUM[t - 9] + '筒' : t < 27 ? NUM[t - 18] + '條' : t < 34 ? '東南西北中發白'[t - 27] : '春夏秋冬梅蘭竹菊'[t - 34]);
export const WINDS = '東南西北';

export function newWall() {
  const w = Array.from({ length: 144 }, (_, i) => i);
  for (let i = w.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [w[i], w[j]] = [w[j], w[i]]; }
  return w;
}

export function counts(ids) {
  const c = new Array(34).fill(0);
  for (const id of ids) { const t = typeOf(id); if (t < 34) c[t]++; }
  return c;
}

// ---------------------------------------------------------------------------
// 向聽數：需要 m 組面子 + 1 對。-1 表示已胡。

const suitMemo = new Map();
// 回傳 [[sets, partials, pair(0/1)], ...] 的非劣解
function suitOptions(cs, honor) {
  const key = (honor ? 'h' : 's') + cs.join('');
  const hit = suitMemo.get(key);
  if (hit) return hit;
  const best = new Map(); // key "s,p,pair" 只保留
  const add = (s, p, pr) => { const k = s * 100 + pr * 50 + p; best.set(k, [s, p, pr]); };
  const c = cs.slice();
  const n = c.length;
  function dfs(i, s, p, pr) {
    while (i < n && !c[i]) i++;
    if (i >= n) { add(s, p, pr); return; }
    // 刻子
    if (c[i] >= 3) { c[i] -= 3; dfs(i, s + 1, p, pr); c[i] += 3; }
    // 順子
    if (!honor && i + 2 < n && c[i + 1] && c[i + 2]) { c[i]--; c[i + 1]--; c[i + 2]--; dfs(i, s + 1, p, pr); c[i]++; c[i + 1]++; c[i + 2]++; }
    // 對子（當眼或搭子）
    if (c[i] >= 2) {
      c[i] -= 2;
      if (!pr) dfs(i, s, p, 1);
      dfs(i, s, p + 1, pr);
      c[i] += 2;
    }
    // 搭子
    if (!honor) {
      if (i + 1 < n && c[i + 1]) { c[i]--; c[i + 1]--; dfs(i, s, p + 1, pr); c[i]++; c[i + 1]++; }
      if (i + 2 < n && c[i + 2]) { c[i]--; c[i + 2]--; dfs(i, s, p + 1, pr); c[i]++; c[i + 2]++; }
    }
    // 孤張
    const k = c[i]; c[i] = 0; dfs(i + 1, s, p, pr); c[i] = k;
  }
  dfs(0, 0, 0, 0);
  // 去掉被支配的解
  const arr = [...best.values()];
  const res = arr.filter((a) => !arr.some((b) => b !== a && b[0] >= a[0] && b[1] >= a[1] && b[2] >= a[2] && (b[0] > a[0] || b[1] > a[1] || b[2] > a[2])));
  suitMemo.set(key, res);
  return res;
}

export function shanten(c, m) {
  const groups = [suitOptions(c.slice(0, 9)), suitOptions(c.slice(9, 18)), suitOptions(c.slice(18, 27)), honorOptions(c)];
  let best = 99;
  const walk = (g, s, p, pr) => {
    if (g === 4) {
      const ss = Math.min(s, m);
      const pp = Math.min(p, m - ss);
      const v = 2 * (m - ss) - pp - pr;
      if (v < best) best = v;
      return;
    }
    for (const [a, b, q] of groups[g]) { if (q && pr) { walk(g + 1, s + a, p + b + 1, pr); } else walk(g + 1, s + a, p + b, pr | q); }
  };
  walk(0, 0, 0, 0);
  return best;
}
function honorOptions(c) {
  // 字牌只能成刻或對，逐張獨立：直接合成
  let s = 0, pairs = 0;
  for (let t = 27; t < 34; t++) { if (c[t] >= 3) s++; else if (c[t] === 2) pairs++; }
  const opts = [[s, pairs, 0]];
  if (pairs) opts.push([s, pairs - 1, 1]);
  // 把一組刻子拆成眼也可能較好（例如手上只有刻子沒有眼）
  for (let t = 27; t < 34; t++) if (c[t] >= 3) { opts.push([s - 1, pairs + (c[t] === 4 ? 0 : 0), 1]); break; }
  return opts;
}

// 可以胡的牌種（聽牌時）
export function waits(c, m, unseen = null) {
  const out = [];
  for (let t = 0; t < 34; t++) {
    if (c[t] >= 4) continue;
    c[t]++;
    if (shanten(c, m) === -1) out.push(t);
    c[t]--;
  }
  return unseen ? out.filter((t) => unseen[t] > 0 || true) : out;
}

// 有效進張數：摸到後向聽數會下降的牌（依未見張數加權）
export function ukeire(c, m, unseen) {
  const base = shanten(c, m);
  let n = 0, kinds = 0;
  for (let t = 0; t < 34; t++) {
    if (!unseen[t] || c[t] >= 4) continue;
    c[t]++;
    if (shanten(c, m) < base) { n += unseen[t]; kinds++; }
    c[t]--;
  }
  return { n, kinds };
}

// ---------------------------------------------------------------------------
// 胡牌拆解：回傳所有 { pair, sets: [{ kind: 'chow'|'pung', t }] }

export function decompose(c) {
  const res = [];
  const sets = [];
  const cc = c.slice();
  function dfs(i) {
    while (i < 34 && !cc[i]) i++;
    if (i >= 34) { res.push(sets.slice()); return; }
    if (cc[i] >= 3) { cc[i] -= 3; sets.push({ kind: 'pung', t: i }); dfs(i); sets.pop(); cc[i] += 3; }
    if (i < 27 && i % 9 <= 6 && cc[i + 1] && cc[i + 2]) { cc[i]--; cc[i + 1]--; cc[i + 2]--; sets.push({ kind: 'chow', t: i }); dfs(i); sets.pop(); cc[i]++; cc[i + 1]++; cc[i + 2]++; }
  }
  const out = [];
  for (let p = 0; p < 34; p++) {
    if (c[p] < 2) continue;
    cc[p] -= 2;
    res.length = 0;
    dfs(0);
    for (const s of res) out.push({ pair: p, sets: s });
    cc[p] += 2;
  }
  return out;
}

// ---------------------------------------------------------------------------
// 台數
// ctx: { hand: 手牌 id（含胡的那張）, melds: [{ kind: 'chow'|'pung'|'kong', t, concealed }], flowers: [id], win: 胡的牌種,
//        selfDraw, seat (0 東 1 南 2 西 3 北 的門風), round (圈風), lastTile, kongDraw, robKong, heaven, earth, waitKinds }
export function scoreHand(ctx) {
  const c = counts(ctx.hand);
  const decs = decompose(c);
  let best = null;
  for (const d of decs) {
    // 胡別人的牌時，胡的那張可能落在不同組合中，影響「暗刻」
    const places = [];
    if (!ctx.selfDraw) {
      if (d.pair === ctx.win) places.push(-1);
      d.sets.forEach((s, k) => { if ((s.kind === 'pung' && s.t === ctx.win) || (s.kind === 'chow' && ctx.win >= s.t && ctx.win <= s.t + 2)) places.push(k); });
    } else places.push(-2);
    for (const pl of places) {
      const r = scoreDecomp(ctx, d, pl);
      if (!best || r.tai > best.tai) best = r;
    }
  }
  return best;
}

function scoreDecomp(ctx, d, winPlace) {
  const items = [];
  const add = (name, n) => items.push([name, n]);
  const exposed = ctx.melds.filter((m) => !m.concealed);
  const menqing = exposed.length === 0;
  const allSets = d.sets.map((s, k) => ({ ...s, concealed: !(winPlace === k && s.kind === 'pung') })).concat(ctx.melds.map((m) => ({ kind: m.kind === 'kong' ? 'pung' : m.kind, t: m.t, concealed: !!m.concealed })));
  const tilesTypes = allSets.flatMap((s) => (s.kind === 'chow' ? [s.t, s.t + 1, s.t + 2] : [s.t])).concat([d.pair]);
  const suits = new Set(tilesTypes.filter((t) => t < 27).map((t) => suitOf(t)));
  const honors = tilesTypes.some(isHonor);

  if (ctx.heaven) add('天胡', 24);
  if (ctx.earth) add('地胡', 16);
  if (menqing && ctx.selfDraw) add('門清自摸', 3);
  else { if (menqing) add('門清', 1); if (ctx.selfDraw) add('自摸', 1); }
  if (exposed.length === 5 && !ctx.selfDraw) add('全求人', 2);
  if (ctx.kongDraw && ctx.selfDraw) add('槓上開花', 1);
  if (ctx.lastTile) add(ctx.selfDraw ? '海底撈月' : '河底撈魚', 1);
  if (ctx.robKong) add('搶槓', 1);
  if (ctx.waitKinds === 1 && exposed.length < 5) add('獨聽', 1);

  const pungs = allSets.filter((s) => s.kind === 'pung');
  if (pungs.length === 5) add('碰碰胡', 4);
  const hidden = pungs.filter((s) => s.concealed).length;
  if (hidden >= 5) add('五暗刻', 8); else if (hidden === 4) add('四暗刻', 5); else if (hidden === 3) add('三暗刻', 2);

  if (!honors && suits.size === 1) add('清一色', 8);
  else if (honors && suits.size === 1) add('混一色', 4);
  else if (honors && suits.size === 0) add('字一色', 16);

  const dragon = (t) => t >= 31;
  const dPungs = pungs.filter((s) => dragon(s.t)).length;
  if (dPungs === 3) add('大三元', 8);
  else if (dPungs === 2 && dragon(d.pair)) add('小三元', 4);
  else for (const s of pungs) if (dragon(s.t)) add(tileName(s.t), 1);
  const wPungs = pungs.filter((s) => s.t >= 27 && s.t <= 30).length;
  if (wPungs === 4) add('大四喜', 16);
  else if (wPungs === 3 && d.pair >= 27 && d.pair <= 30) add('小四喜', 8);
  else {
    for (const s of pungs) {
      if (s.t === 27 + ctx.round) add('圈風 ' + WINDS[ctx.round], 1);
      if (s.t === 27 + ctx.seat) add('門風 ' + WINDS[ctx.seat], 1);
    }
  }
  // 平胡：無花、無字、全順子、胡別人、兩面聽
  if (!ctx.flowers.length && !honors && pungs.length === 0 && !ctx.selfDraw && ctx.waitKinds >= 2) add('平胡', 2);
  // 花牌
  const fl = ctx.flowers.map(typeOf);
  const seasons = fl.filter((t) => t < 38).length, plants = fl.filter((t) => t >= 38).length;
  if (seasons === 4) add('花槓（春夏秋冬）', 2);
  else if (fl.includes(34 + ctx.seat)) add('正花 ' + tileName(34 + ctx.seat), 1);
  if (plants === 4) add('花槓（梅蘭竹菊）', 2);
  else if (fl.includes(38 + ctx.seat)) add('正花 ' + tileName(38 + ctx.seat), 1);

  const tai = items.reduce((a, [, n]) => a + n, 0);
  return { tai, items };
}
