// 比賽引擎（不含畫面）：參賽名單、每輪的成績（AI 每洞先用種子決定）、即時排行榜、晉級線、延長賽、比洞賽、
//   名次、獎金、積分、世界排名積分
import { courseById } from '../../js/courses.js';
import { rng, hash, clamp, sum } from './util.js';
import { simEventScores, expectRound, holeAdjs, holeScore, roundMean, courseAdj } from './sim.js';
import { makeName, pickCountry, isEastern } from './data/names.js';
import { PAYOUT, MAJOR_ZH } from './data/calendar.js';
import { ME, nameOf, peerRating, owgrAvg, rankList, ABS, styleOf } from './world.js';
import { TIER, shareOf, fedexPts } from './tours.js';
import { playerRating } from './growth.js';

// ---------- 球場資訊 ----------
const REAL_DIFF = { pebble: 4, standrews: 4, troon: 4, carnoustie: 5, kiawah: 5, rsg: 4, rmw: 4, marcosimone: 3, sawgrass: 4, kawana: 3, mangilao: 3, cliffhangers: 2 };
export function cinfo(id) {
  const c = courseById(id);
  if (!c) return null;
  const holes = c.holes.slice(0, 18);
  return {
    id: c.id, baseId: c.baseId || c.id, name: c.name, en: c.en || '', group: c.group, style: c.style, stimp: c.stimp || 10, theme: c.theme,
    holes, par: sum(holes.map(h => h[0])), blackYards: sum(holes.map(h => (h[5] && h[5].tees && h[5].tees.black) || h[1])),
    diff: c.diff || REAL_DIFF[c.id] || (c.group === 'taiwan' ? 2.5 : 3),
  };
}

// 每輪的天氣（風：0 平靜、1 一般、2 強風）：林克斯球場比較常颳強風
export function weatherOf(ev, round) {
  const r = rng(hash(ev.key + ':wx:' + round)), links = cinfo(ev.course)?.style === 'links';
  const x = r();
  return links ? (x < 0.25 ? 0 : x < 0.65 ? 1 : 2) : (x < 0.45 ? 0 : x < 0.88 ? 1 : 2);
}
export const WIND_CFG = ['light', 'normal', 'strong'];
export const WIND_ZH = ['微風', '一般', '強風'];

// 賽事的球場設定
// 球員風格對這一輪的實力修正（只用在 AI；最多約 ±0.6，大概是一輪 0.1~0.2 桿）
export function styleAdj(k, ci, E, ri, wx) {
  const final = ri === E.rounds - 1, yd = ci.blackYards || 7200;
  if (k === 'long') return yd >= 7400 ? 0.6 : yd < 7100 ? -0.3 : 0;
  if (k === 'steady') return (wx || 0) >= 2 || E.id === 'usopen' ? 0.5 : 0;
  if (k === 'short') return ((ci.stimp || 11) >= 12 ? 0.5 : 0) + (ci.style === 'links' ? 0.3 : 0);
  if (k === 'clutch') return E.major || final ? 0.5 : -0.1;
  return 0;
}
export const setupOf = ev => (ev.id === 'usopen' ? 'usopen' : ev.major ? 'major' : null);
export const teeOf = (st, ev) => {
  const age = st.player.age;
  if (ev.tour === 'junior' || ev.tour === 'kids') return age <= 14 ? 'white' : 'blue';
  return 'black';
};
export const roundsOf = ev => ev.rounds || (ev.tour === 'junior' ? 2 : 4);

// ---------- 參賽名單 ----------
// AI 選手：{ id, name, c, R（這週的實力）, real }
function filler(r, n, lo, hi, mix, tag) {
  return Array.from({ length: n }, (_, i) => {
    const c = pickCountry(r, mix), nm = makeName(r, c);
    return { id: `X${tag}${i}`, name: nm, c, R: lo + r() * (hi - lo), fill: true };
  });
}
const toEntry = (p, R) => ({ id: p.id, name: nameOf(p), c: p.c, R, real: !!p.real });

export function buildField(st, ev, world) {
  const r = rng(hash(st.seed + ':field:' + ev.key));
  const y = ev.year, now = ABS(y, ev.w), n = (ev.field || 120) - 1;
  const form = () => r.normal() * 1.1;
  const act = world.players.filter(p => !p.ret);
  const ranked = rankList(world, null, now).map(x => x.p);
  let list = [];
  const take = (arr, k) => { for (const p of arr) { if (list.length >= k) break; if (!list.some(q => q.id === p.id)) list.push(toEntry(p, p.r + form())); } };
  switch (ev.tour) {
    case 'major': case 'pga': {
      if (ev.major || ev.sig || ev.playoff || ev.id === 'players') {
        // 依世界排名（大賽也邀請 LIV 的前段球員）
        const pool = ranked.filter(p => ev.major || p.tour === 'pga');
        take(pool, ev.major ? n - (ev.id === 'masters' ? 5 : ev.id === 'pgachamp' ? 20 : 8) : n);
        if (ev.id === 'masters') world.peers.filter(p => p.am && y - p.by >= 18).sort((a, b) => peerRating(b, y) - peerRating(a, y)).slice(0, 5).forEach(p => list.push({ ...toEntry(p, peerRating(p, y) + form()), am: true }));
        if (ev.id === 'pgachamp') list.push(...filler(r, 20, 54, 62, [['USA', 1]], 'club').map(x => ({ ...x, club: true })));
        if (ev.id === 'usopen' || ev.id === 'open') list.push(...filler(r, n - list.length, 66, 73, undefined, 'q'));
      } else {
        take(act.filter(p => p.tour === 'pga').sort((a, b) => b.r - a.r + r.normal() * 3), n - 6);
        take(act.filter(p => p.tour === 'kft').sort((a, b) => b.r - a.r), n);
      }
      break;
    }
    case 'kft': case 'pta': case 'dp': case 'asia': case 'jp': case 'tpga': case 'champions': {
      const tour = ev.tour === 'champions' ? null : ev.tour;
      const pool = tour ? act.filter(p => p.tour === tour) : world.players.filter(p => y - p.by >= 50 && (!p.ret || y - p.ret < 12));
      take(pool.sort((a, b) => b.r - a.r + r.normal() * 4), n);
      if (ev.co) take(act.filter(p => p.tour === ev.co).sort((a, b) => b.r - a.r), n);
      if (ev.tour === 'dp' && ev.tier === 'dp+') take(ranked.filter(p => p.tour === 'pga' && teamSide(p.c) === 'eur'), Math.min(n, list.length + 12));
      if (list.length < n) list.push(...filler(r, n - list.length, ev.tour === 'champions' ? 56 : ev.tour === 'tpga' ? 54 : 60, ev.tour === 'champions' ? 66 : ev.tour === 'tpga' ? 62 : 68, undefined, 't'));
      if (ev.tour === 'champions') list.forEach(e => (e.R = e.R * 0.97 - 1));
      break;
    }
    case 'qs': {
      const lo = ev.stage === 3 ? 64 : ev.stage === 2 ? 62 : ev.stage === 1 ? 59 : ev.stage === 7 ? 54 : ev.stage === 9 ? 61 : ev.stage === 8 ? 63 : 58, hi = lo + 7;
      list.push(...filler(r, n, lo, hi, ev.stage === 7 ? [['TPE', 1]] : ev.stage === 9 ? undefined : undefined, 'q'));
      break;
    }
    case 'junior': case 'kids': case 'am': case 'ncaa': {
      const domestic = ev.tour === 'junior' && !ev.inv && !ev.national;
      const pool = world.peers.filter(p => p.am !== false && (!domestic || p.c === st.player.country) && Math.abs((y - p.by) - st.player.age) <= (ev.tour === 'junior' ? 3 : 4));
      take(pool.sort((a, b) => peerRating(b, y) - peerRating(a, y) + r.normal() * 3), n);
      list.forEach(e => { const p = world.peers.find(q => q.id === e.id); if (p) e.R = peerRating(p, y) + form(); });
      if (list.length < n) {
        const base = avgAgeRating(st.player.age, ev);
        list.push(...filler(r, n - list.length, base - 8, base + 3, domestic ? [[st.player.country, 1]] : undefined, 'a'));
      }
      break;
    }
    default: list.push(...filler(r, n, 64, 74, undefined, 'g'));
  }
  return list.slice(0, n);
}
// 某個年紀的業餘比賽，一般選手的實力
function avgAgeRating(age, ev) {
  const lvl = ev.tier === 'am_major' ? 1.06 : ev.tier === 'junior+' || ev.tier === 'college+' ? 1.03 : 1;
  const base = age <= 12 ? 22 + (age - 8) * 3.5 : age <= 17 ? 36 + (age - 12) * 3.6 : age <= 22 ? 54 + (age - 17) * 3 : 68;
  return base * lvl;
}
import { teamSide } from './data/players.js';

// ---------- 建立一場比賽 ----------
export function createEvent(st, ev, world, how) {
  const ci = cinfo(ev.course);
  const field = buildField(st, ev, world);
  const nR = roundsOf(ev);
  return {
    key: ev.key, id: ev.id, name: ev.name, tour: ev.tour, tier: ev.tier, year: ev.year, w: ev.w, course: ev.course, courseName: ci.name, par: ci.par,
    major: ev.major || null, sig: !!ev.sig, playoff: ev.playoff || 0, purse: ev.purse || 0, cutTop: ev.cut ?? 65, rounds: nR, how,
    kind: ev.kind || 'stroke', note: ev.note || '', region: ev.region, stage: ev.stage, adv: ev.adv,
    field: field.map(e => ({ ...e, sc: [] })),                  // sc[round] = [18 洞]
    me: { sc: [], mode: [], played: [], sim: [] },
    round: 0, cutDone: false, madeCut: null, done: false, day: 'mon', wx: [], practice: false, proam: false,
  };
}

// 這一輪：AI 每洞的成績（種子決定）；玩家的模擬成績（給精華、關鍵時刻、模擬用）
export function prepareRound(st, E, ri) {
  const ci = cinfo(E.course);
  const wx = E.wx[ri] = weatherOf({ key: E.key, course: E.course }, ri);
  const o = { setup: setupOf(E), wind: wx, tee: ['junior', 'ncaa', 'am', 'kids'].includes(E.tour) ? 'junior' : null };
  // 難度：AI 的實力加減（休閒 −0.3、寫實 +2.2，和 life.js 的 DIFF.ai 一致）。以前 DIFF.ai 寫了卻沒有用到，三種難度的對手一樣強
  const dAi = ({ casual: -0.3, standard: 0, real: 2.2 })[st.opt && st.opt.difficulty] || 0;
  // 晉級線以後，沒晉級的 AI 不打
  for (const e of E.field) {
    if (e.cut) continue;
    e.sc[ri] = simEventScores(hash(E.key + ':' + e.id + ':' + ri), ci.holes, e.R + dAi + styleAdj(styleOf(e.id), ci, E, ri, wx), ci, [o])[0];
  }
  const R = st.meR = playerRating(st, { home: isHome(st, E), practiceRound: E.practice });
  const corr = personalCorr(st);
  E.me.sim[ri] = simEventScores(hash(E.key + ':ME:' + ri + ':' + st.seed), ci.holes, R - corr * 3, ci, [o])[0];
  E.me.sc[ri] = Array(18).fill(null);
  // 開球順序：前兩輪隨機，之後成績差的先開球（領先的最後）
  const order = E.field.filter(e => !e.cut).map(e => ({ id: e.id, t: ri < 2 ? hash(E.key + e.id + ri) % 1000 : -totalOf(e, ri) * 1000 + hash(e.id) % 100 }));
  order.push({ id: ME, t: ri < 2 ? hash(E.key + 'ME' + ri) % 1000 : -myTotal(E, ri) * 1000 + 50 });
  order.sort((a, b) => a.t - b.t);
  E.order = order.map(x => x.id);
  return { wind: wx, setup: o.setup };
}
export const isHome = (st, E) => st.player.country === 'TPE' ? cinfo(E.course)?.group === 'taiwan' : false;
// 個人修正：最近 20 輪自己打的成績和預期的差（模擬更像你自己），取一半
export function personalCorr(st) {
  const c = st.corr.slice(-20);
  if (c.length < 3) return 0;
  return clamp(sum(c) / c.length * 0.5, -2.5, 2.5);
}

const parOf = (E, h) => cinfo(E.course).holes[h][0];
// 已完成的洞對標準桿
export function toParThru(E, sc, thru) { let s = 0; for (let h = 0; h < thru; h++) if (sc[h] != null) s += sc[h] - parOf(E, h); return s; }
export const totalOf = (e, upto) => { let s = 0; for (let r = 0; r < upto; r++) if (e.sc[r]) s += sum(e.sc[r]); return s; };
export const myTotal = (E, upto) => { let s = 0; for (let r = 0; r < upto; r++) if (E.me.sc[r]) s += sum(E.me.sc[r].map((v, h) => v ?? E.me.sim[r][h])); return s; };

// 即時排行榜：玩家打完 myThru 洞時，其他人各打完幾洞（開球比較早的人打得比較多）
export function leaderboard(E, ri, myThru) {
  const ci = cinfo(E.course), parTot = ci.par;
  const N = E.order ? E.order.length : E.field.length + 1, im = E.order ? E.order.indexOf(ME) : 0;
  const rows = [];
  const prevPar = (scArr) => { let s = 0; for (let r = 0; r < ri; r++) if (scArr[r]) s += sum(scArr[r]) - parTot; return s; };
  for (const e of E.field) {
    if (e.cut && ri >= 2) { rows.push({ id: e.id, name: e.name, c: e.c, toPar: prevPar(e.sc), thru: 'CUT', cut: true, R: e.R, am: e.am }); continue; }
    const ia = E.order ? E.order.indexOf(e.id) : 0;
    // 開球前（myThru = 0）大家都還沒開始；之後開球比較早的人打得比較多
    const thru = myThru >= 18 ? 18 : myThru === 0 ? 0 : clamp(Math.round(myThru + (im - ia) * 18 / N * 1.7), 0, 18);
    rows.push({ id: e.id, name: e.name, c: e.c, toPar: prevPar(e.sc) + (e.sc[ri] ? toParThru(E, e.sc[ri], thru) : 0), thru, today: e.sc[ri] ? toParThru(E, e.sc[ri], thru) : 0, R: e.R, am: e.am, real: e.real });
  }
  const mine = E.me.sc[ri] || [];
  let mt = 0; for (let h = 0; h < myThru; h++) mt += (mine[h] ?? E.me.sim[ri][h]) - parOf(E, h);
  const meRow = { id: ME, name: '你', toPar: prevPar(E.me.sc.map((s, r) => s && s.map((v, h) => v ?? E.me.sim[r][h]))) + mt, thru: myThru, today: mt, me: true, cut: E.madeCut === false };
  rows.push(meRow);
  rows.sort((a, b) => (a.cut - b.cut) || a.toPar - b.toPar || (b.thru === 'CUT' ? -1 : 0));
  rows.forEach((x, i) => { const tie = rows.filter(y => !y.cut && y.toPar === x.toPar).length > 1; const first = rows.findIndex(y => y.toPar === x.toPar && !y.cut); x.pos = x.cut ? '—' : (tie ? 'T' : '') + (first + 1); x.posN = x.cut ? 999 : first + 1; });
  return rows;
}

// 玩家這一洞的分數寫回（遊戲回呼用）
export function setMyHole(E, ri, h, strokes) { E.me.sc[ri][h] = strokes; }
// 這一輪結束：沒打的洞用模擬補上
export function finishMyRound(E, ri) {
  const sc = E.me.sc[ri];
  for (let h = 0; h < 18; h++) if (sc[h] == null) sc[h] = E.me.sim[ri][h];
  return sum(sc);
}

// ---------- 晉級線（第 2 輪後；cutTop = 前幾名含同分）----------
export function applyCut(E) {
  if (E.cutDone || !E.cutTop || E.rounds < 3) { E.cutDone = true; return null; }
  const all = E.field.map(e => ({ e, t: totalOf(e, 2) })).concat([{ e: null, t: myTotal(E, 2) }]).sort((a, b) => a.t - b.t);
  const line = all[Math.min(all.length - 1, E.cutTop - 1)].t;
  for (const x of all) if (x.e && x.t > line) x.e.cut = true;
  E.madeCut = myTotal(E, 2) <= line;
  E.cutLine = line - cinfo(E.course).par * 2;
  E.cutDone = true;
  return { line: E.cutLine, made: E.madeCut };
}
// 晉級線附近（第 2 輪後九洞）：壓力等級用
export function projectedCut(E, ri, myThru) {
  if (ri !== 1 || !E.cutTop) return null;
  const lb = leaderboard(E, ri, myThru).filter(x => !x.cut);
  const row = lb[Math.min(lb.length - 1, E.cutTop - 1)];
  return row ? row.toPar : null;
}

// ---------- 最終名次 ----------
export function finalStandings(E) {
  const rows = E.field.map(e => ({ id: e.id, name: e.name, c: e.c, real: e.real, am: e.am, cut: !!e.cut, total: totalOf(e, e.cut ? 2 : E.rounds), rounds: e.sc.map(s => (s ? sum(s) : null)) }));
  rows.push({ id: ME, name: '你', me: true, cut: E.madeCut === false, total: myTotal(E, E.madeCut === false ? 2 : E.rounds), rounds: E.me.sc.map(s => (s ? sum(s) : null)) });
  rows.sort((a, b) => (a.cut - b.cut) || a.total - b.total);
  rows.forEach(x => { const same = rows.filter(y => y.cut === x.cut && y.total === x.total); x.pos = x.cut ? null : rows.findIndex(y => !y.cut && y.total === x.total) + 1; x.tie = same.length > 1 && !x.cut; });
  // 延長賽決定的冠軍
  if (E.playoffWinner) {
    const w = rows.find(x => x.id === E.playoffWinner);
    rows.filter(x => x.pos === 1 && x !== w).forEach(x => { x.pos = 2; });
    if (w) { w.pos = 1; w.tie = false; }
    const twos = rows.filter(x => x.pos === 2); twos.forEach(x => (x.tie = twos.length > 1));
    rows.sort((a, b) => (a.cut - b.cut) || (a.pos || 999) - (b.pos || 999) || a.total - b.total);
  }
  return rows;
}
// 同分爭冠的人（延長賽）
export function playoffNeeded(E) {
  const rows = finalStandings(E).filter(x => !x.cut);
  const best = rows[0].total, tied = rows.filter(x => x.total === best);
  return tied.length > 1 && !E.playoffWinner ? tied : null;
}
// 延長賽一洞（AI）：用第 18 洞的難度抽樣
export function playoffHole(E, ids, n) {
  const ci = cinfo(E.course), par = ci.holes[17][0], out = {};
  for (const id of ids) {
    if (id === ME) continue;
    const e = E.field.find(x => x.id === id), r = rng(hash(E.key + ':po:' + id + ':' + n));
    out[id] = holeScore(r, par, roundMean(e.R) / 18 + courseAdj(ci, { setup: setupOf(E), wind: E.wx[E.rounds - 1] || 1 }) / 18 + 0.08, e.R);
  }
  return out;
}

// ---------- 獎金（同分平分；業餘不拿獎金）----------
export function prizeOf(E, rows, id) {
  if (!E.purse || E.tour === 'team' || E.tour === 'olympic') return 0;
  const x = rows.find(q => q.id === id);
  if (!x || x.cut || !x.pos) return 0;
  const pros = rows.filter(q => !q.cut && !q.am);
  const same = pros.filter(q => q.total === x.total && (!E.playoffWinner || (q.pos === x.pos)));
  const start = pros.findIndex(q => q === same[0]);
  let pct = 0;
  for (let k = 0; k < same.length; k++) pct += PAYOUT[start + k] ?? Math.max(0.15, 0.205 - (start + k - 69) * 0.002);
  const field = E.field.length + 1, scale = E.tour === 'tpga' || E.tour === 'pta' || field < 60 ? 1 : 1;
  return Math.round(E.purse * pct / 100 / same.length * scale);
}
// 世界排名積分（賽事強度：參賽者的實力）
export function owgrPoints(E, pos) {
  const t = TIER[E.tier] || {};
  if (!t.owgr || !pos) return 0;
  const strength = clamp(avgTop(E) / 80, 0.7, 1.15);
  return Math.round(t.owgr * strength * shareOf(pos) * 100) / 100;
}
const avgTop = E => { const a = E.field.map(e => e.R).sort((x, y) => y - x).slice(0, 30); return a.reduce((s, v) => s + v, 0) / Math.max(1, a.length); };
export const fedexFor = (E, pos) => (E.tour === 'pga' || E.tour === 'major') && TIER[E.tier]?.fedex ? fedexPts(TIER[E.tier].fedex, pos) : 0;
// 各巡迴的年度積分（KFT、PTA 用積分；DP 用 Race to Dubai 積分；亞巡、日巡、台巡用獎金）
export function tourPoints(E, pos, prize) {
  if (E.tour === 'kft' || E.tour === 'pta') return fedexPts(E.tier === 'kft' ? (E.id === 'kft_kftchamp' ? 1000 : 500) : 500, pos);
  if (E.tour === 'dp') return fedexPts(E.tier === 'dp+' ? 2000 : 1000, pos) * 0.75;
  if (['asia', 'jp', 'tpga'].includes(E.tour)) return prize;
  return 0;
}
// 業餘排名 / 青少年排名積分
export function amPoints(E, pos, n) {
  const t = TIER[E.tier] || {};
  const k = clamp(1.4 - pos / Math.max(10, n), 0, 1.4);
  return { wagr: Math.round((t.wagr || 0) * shareOf(pos) * 10) / 10 + (k > 0 ? (t.wagr || 0) * 0.02 * k : 0), jr: Math.round((t.jr || 0) * shareOf(pos) * 10) / 10 };
}

// ---------- 世界的背景賽事（玩家沒參加的週）：只算每輪總桿，快 ----------
import { quickRound } from './sim.js';
export function simBackground(st, ev, world) {
  const ci = cinfo(ev.course); if (!ci) return null;
  const E = { key: ev.key, field: buildField({ ...st, seed: st.seed }, ev, world), course: ev.course, tier: ev.tier, tour: ev.tour };
  const r = rng(hash(st.seed + ':bg:' + ev.key));
  const nR = roundsOf(ev), cut = ev.cut;
  const o = { setup: setupOf(ev), wind: 1 };
  for (const e of E.field) e.t = [];
  for (let k = 0; k < nR; k++) {
    for (const e of E.field) if (!e.cut) e.t.push(quickRound(r, e.R, ci, { ...o, wind: weatherOf(ev, k) }));
    if (k === 1 && cut && nR > 2) {
      const s = E.field.map(e => sum(e.t)).sort((a, b) => a - b), line = s[Math.min(s.length - 1, cut - 1)];
      for (const e of E.field) if (sum(e.t) > line) e.cut = true;
    }
  }
  const rows = E.field.map(e => ({ id: e.id, name: e.name, total: sum(e.t), cut: !!e.cut, fill: e.fill })).sort((a, b) => (a.cut - b.cut) || a.total - b.total);
  rows.forEach(x => { x.pos = x.cut ? null : rows.findIndex(y => !y.cut && y.total === x.total) + 1; });
  return { rows, par: ci.par * nR, E };
}
