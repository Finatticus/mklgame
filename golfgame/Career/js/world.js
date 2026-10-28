// AI 世界：真實球員 + 各巡迴的虛構球員 + 和玩家同年紀的青少年 / 大學生（同儕）
//   每年長大、老化、退休，新人遞補；世界排名（近兩年的積分平均）；各巡迴的年度積分榜
//   存檔用精簡格式（虛構球員的名字由種子重建）
import { REAL_PLAYERS, MASTERS_PAST, teamSide } from './data/players.js';
import { makeName, pickCountry, isEastern } from './data/names.js';
import { rng, hash, clamp } from './util.js';

export const ABS = (year, w) => year * 52 + w;          // 絕對週數（世界排名的時間軸）
// 積分紀錄（世界排名、業餘排名、青少年排名）：每 4 週合成一筆，存檔比較小
export function addPts(arr, abs, v) {
  if (!arr || !(v > 0)) return;
  const b = abs - (abs % 4), last = arr[arr.length - 1];
  if (last && last[0] === b) last[1] = Math.round((last[1] + v) * 10) / 10;
  else arr.push([b, Math.round(v * 10) / 10]);
}
export const ME = 'ME';

// 各巡迴要維持的人數與新人實力（虛構球員）；真實球員的實力在 players.js 統一減 RATING_SHIFT
export const RATING_SHIFT = 6;
const POOL = { pga: { n: 150, lo: 71, hi: 76 }, dp: { n: 90, lo: 67, hi: 73 }, kft: { n: 110, lo: 62, hi: 67 }, asia: { n: 70, lo: 63, hi: 69 }, jp: { n: 55, lo: 63, hi: 69 }, tpga: { n: 45, lo: 56, hi: 64 }, pta: { n: 70, lo: 55, hi: 61 } };
const TOUR_MIX = {
  pga: null, kft: null, pta: [['USA', 30], ['CAN', 8], ['MEX', 6], ['ARG', 5], ['COL', 5], ['CHI', 3], ['AUS', 2]],
  dp: [['ENG', 18], ['SCO', 6], ['IRL', 4], ['ESP', 9], ['SWE', 7], ['DEN', 6], ['GER', 5], ['FRA', 7], ['ITA', 5], ['NOR', 3], ['RSA', 10], ['AUS', 6], ['IND', 2], ['THA', 2], ['CHN', 2], ['JPN', 2]],
  asia: [['THA', 14], ['IND', 10], ['KOR', 10], ['AUS', 8], ['TPE', 9], ['CHN', 6], ['JPN', 5], ['PHI', 5], ['MAS', 4], ['SGP', 2], ['USA', 5], ['RSA', 4]],
  jp: [['JPN', 70], ['KOR', 12], ['TPE', 5], ['AUS', 5], ['THA', 4], ['USA', 4]],
  tpga: [['TPE', 100]],
};

// 球員物件（執行時用）：{ id, en, zh, c, by, r, pot, tour, ret, real, f(虛構的名字種子), titles:[[年, 賽事 id]], ow:[[絕對週, 積分]], wa（業餘排名積分）}
export const nameOf = p => (p.id === ME ? p.name : p.zh || p.en);
// 球員風格（v97）：依 id 固定，一輩子不變。比賽時依球場與輪次微調實力（見 event.js 的 styleAdj）
export const STYLE_KINDS = ['long', 'steady', 'short', 'clutch'];
export const STYLE_ZH = { long: '長打型', steady: '穩定型', short: '短桿型', clutch: '大場面型' };
export const STYLE_DESC = { long: '長球場（7,400 碼以上）+0.6、短球場 −0.3', steady: '強風、美國公開賽的設定 +0.5', short: '快果嶺（Stimp 12 以上）+0.5、林克斯 +0.3', clutch: '大賽與最後一輪 +0.5、其他輪 −0.1' };
export const styleOf = id => STYLE_KINDS[hash('style:' + id) % 4];
export const shortName = p => { const n = nameOf(p); return /[a-zA-Z]/.test(n) ? n.split(' ').slice(-1)[0] : n; };

function fictional(r, tour, year, opt = {}) {
  const c = opt.c || pickCountry(r, TOUR_MIX[tour] || undefined);
  const f = Math.floor(r() * 2 ** 31);
  const nr = rng(f), nm = makeName(nr, c, opt.female);
  const cfg = POOL[tour] || { lo: 70, hi: 76 };
  const age = opt.age ?? (22 + Math.floor(r() * 12));
  const rr = opt.r ?? cfg.lo + r() * (cfg.hi - cfg.lo);
  // 潛力：最多比現在高 9，但不超過這個巡迴設定的上限 +1.5（以前沒有上限，新人幾年後普遍長到比設定高 4~5，整個世界越來越強）
  const pot = Math.min(rr + r() * 9, Math.max(rr, cfg.hi + 1.5));
  return { id: 'F' + f.toString(36), en: isEastern(c) ? '' : nm, zh: isEastern(c) ? nm : '', c, by: year - age, r: Math.round(rr * 10) / 10, pot: Math.round(pot * 10) / 10, tour, titles: [], ow: [] };
}

// 建立世界（玩家 8 歲那年的 4 月）
export function createWorld(seed, year) {
  const r = rng(hash(seed + ':world'));
  const players = REAL_PLAYERS.map(([en, zh, c, by, rt0, tour]) => { const rt = rt0 - RATING_SHIFT; return { id: 'R' + hash(en).toString(36), en, zh, c, by, r: rt, pot: rt + (year - by < 26 ? 4 : 1), tour, real: true, titles: [], ow: [] }; });
  // 真實的名人賽歷屆冠軍
  for (const [y, en] of Object.entries(MASTERS_PAST)) { const p = players.find(q => q.en === en); if (p) p.titles.push([Number(y), 'masters']); }
  for (const [tour, cfg] of Object.entries(POOL)) {
    const have = players.filter(p => p.tour === tour).length;
    for (let i = have; i < cfg.n; i++) players.push(fictional(r, tour, year));
  }
  // 起始的世界排名積分：依實力推估過去兩年的成績
  for (const p of players) seedRanking(p, year, r);
  return { players, peers: [], hist: {}, season: {}, retired: [], hof: [], y0: year };
}
function seedRanking(p, year, r) {
  const lv = Math.max(0, p.r - 60);
  const per = Math.pow(lv, 2.15) / 12;           // 一場比賽的平均積分（實力越高越多）
  for (let k = 40; k >= 1; k--) { const v = per * (0.4 + r() * 1.3); if (v > 0.3) addPts(p.ow, ABS(year, 14) - k * 2, v); }
}

// ---------- 世界排名（近 104 週；前 13 週全額、之後線性遞減；除以場數 40~52）----------
export function owgrAvg(p, now) {
  let s = 0, n = 0;
  for (const [w, v] of p.ow || []) {
    const age = now - w;
    if (age < 0 || age >= 104) continue;
    n++; s += v * (age < 13 ? 1 : 1 - (age - 13) / 91);
  }
  return s / clamp(n, 40, 52);
}
export function rankList(world, me, now) {
  const all = world.players.filter(p => !p.ret && !p.am).concat(me && me.pro ? [me] : []);
  return all.map(p => ({ p, avg: owgrAvg(p, now) })).sort((a, b) => b.avg - a.avg);
}
export function prune(world, now) {
  for (const p of world.players) if (p.ow) p.ow = p.ow.filter(([w]) => now - w < 104);
  for (const p of world.peers) { if (p.wa) p.wa = p.wa.filter(([w]) => now - w < 52); if (p.jr) p.jr = p.jr.filter(([w]) => now - w < 52); }
}

// ---------- 每年的長大、老化、退休、新人 ----------
export function ageWorld(world, year, seed) {
  const r = rng(hash(seed + ':age:' + year));
  for (const p of world.players) {
    if (p.ret) continue;
    const age = year - p.by;
    let d;
    if (age < 25) d = Math.min(1.6, Math.max(0, p.pot - p.r) * 0.3) + r.normal() * 0.6;
    else if (age < 32) d = Math.max(0, p.pot - p.r) * 0.15 + r.normal() * 0.7;
    else if (age < 36) d = -0.3 + r.normal() * 0.7;
    else if (age < 41) d = -0.8 + r.normal() * 0.7;
    else if (age < 47) d = -1.3 + r.normal() * 0.6;
    else d = -1.8 + r.normal() * 0.5;
    p.r = Math.round(clamp(p.r + d, 40, 97) * 10) / 10;
    // 退休：年紀大、實力掉太多
    const retP = age >= 50 ? 0.35 : age >= 45 ? 0.12 + (p.r < 68 ? 0.2 : 0) : age >= 38 ? (p.r < 66 ? 0.25 : 0.04) : p.r < 60 ? 0.15 : 0;
    if (r() < retP) { p.ret = year; world.retired.push(p.id); }
  }
  // 北美三級（PGA TOUR → Korn Ferry → Americas）每年依實力重新排：最強的 150 人在 PGA TOUR、接下來 110 人在 Korn Ferry、其他在 Americas。
  //   以前 PGA TOUR 每年降 25 個還很強的人到 Korn Ferry，Korn Ferry 前段越來越強（前 25 名要實力 75），剛轉職業的玩家要 5~7 年才上得去
  { const na = world.players.filter(p => !p.ret && ['pga', 'kft', 'pta'].includes(p.tour)).sort((a, b) => b.r - a.r);
    na.forEach((p, i) => { p.tour = i < POOL.pga.n ? 'pga' : i < POOL.pga.n + POOL.kft.n ? 'kft' : 'pta'; }); }
  // 各巡迴人數超過上限：最弱的虛構球員退休（以前降級的人一直堆在下一級，Korn Ferry 十年後 250 人、平均實力比設定高 4~5，
  //   整個世界越來越強，玩家怎麼練都追不上）
  for (const [tour, cfg] of Object.entries(POOL)) {
    const list = world.players.filter(p => !p.ret && p.tour === tour);
    if (list.length <= cfg.n) continue;
    list.filter(p => !p.real && !p.titles.length).sort((a, b) => a.r - b.r).slice(0, list.length - cfg.n).forEach(p => { p.ret = year; world.retired.push(p.id); });
  }
  // 各巡迴補新人（北美三級合在一起算缺額：新人 25% 是 PGA TOUR 等級、35% Korn Ferry 等級、40% Americas 等級，隔年再依實力重排）
  const naN = POOL.pga.n + POOL.kft.n + POOL.pta.n;
  const naHave = world.players.filter(p => !p.ret && ['pga', 'kft', 'pta'].includes(p.tour)).length;
  for (let i = naHave; i < naN; i++) { const x = r(), tour = x < 0.25 ? 'pga' : x < 0.6 ? 'kft' : 'pta', cfg = POOL[tour]; world.players.push(fictional(r, tour, year, { age: 21 + Math.floor(r() * 4), r: cfg.lo - 1 + r() * (cfg.hi - cfg.lo + 1) })); }
  for (const [tour, cfg] of Object.entries(POOL)) {
    if (['pga', 'kft', 'pta'].includes(tour)) continue;
    const have = world.players.filter(p => !p.ret && p.tour === tour).length;
    for (let i = have; i < cfg.n; i++) world.players.push(fictional(r, tour, year, { age: 21 + Math.floor(r() * 4), r: cfg.lo - 1 + r() * (cfg.hi - cfg.lo + 1) }));
  }
  // 退休超過 10 年、沒有冠軍的虛構球員從存檔移除（真實球員與冠軍留著：名人堂、歷史紀錄要用）
  // 存檔瘦身（v98）：退休球員不再需要世界排名積分；冠軍只留 PGA TOUR 與大賽（歷史比較、名人堂用），小巡迴的冠軍丟掉；
  //   各巡迴的季積分只留最近兩年。36 歲的存檔約 616 KB → 一半左右（手機本機存檔上限約 5 MB，三個欄位都玩到後期會存不下）
  const MINOR = /^(kft_|pta_|as_|jp_|tp_|dp_|jr_|nc_|q_|ch_|am_)/;
  for (const p of world.players) if (p.ret) {
    if (p.ow && p.ow.length) p.ow = [];
    if (p.titles.length) p.titles = p.titles.filter(t => !MINOR.test(t[1]));
    delete p.wa; delete p.jr;
  }
  const gone = new Map(world.players.filter(p => p.ret && year - p.ret > 10 && !p.real && !p.titles.length).map(p => [p.id, nameOf(p)]));
  // 被移除的人如果在歷屆冠軍名單裡：把 id 換成「~名字」，名字才不會不見
  if (gone.size) for (const ev of Object.values(world.hist || {})) for (const y in ev) if (gone.has(ev[y])) ev[y] = '~' + gone.get(ev[y]);
  world.players = world.players.filter(p => !gone.has(p.id));
  for (const y of Object.keys(world.season || {})) if (Number(y) < year - 2) delete world.season[y];
  const alive = new Set(world.players.map(p => p.id)); world.retired = (world.retired || []).filter(id => alive.has(id));
}

// 歷屆冠軍的名字（id、玩家、已經從存檔移除的「~名字」）
export function histName(world, id, me) {
  if (id === ME) return me;
  if (typeof id === 'string' && id[0] === '~') return id.slice(1);
  const p = findP(world, id);
  return p ? nameOf(p) : { usa: '美國隊', eur: '歐洲隊', intl: '國際隊', gbi: '英國與愛爾蘭隊' }[id] || '—';
}

// ---------- 巡迴之間的升降（季末）----------
export function promote(world, standings) {
  // standings[tour] = [{ id, pts }] 依排名；KFT 前 20、DP 前 10（非 PGA）升 PGA；PGA 第 126 名以後降 KFT
  const byId = new Map(world.players.map(p => [p.id, p]));
  const move = (ids, to) => ids.forEach(id => { const p = byId.get(id); if (p && !p.real) p.tour = to; else if (p && p.real && p.tour !== 'liv') p.tour = to; });
  if (standings.kft) move(standings.kft.slice(0, 20).map(x => x.id), 'pga');
  if (standings.dp) move(standings.dp.filter(x => byId.get(x.id)?.tour === 'dp').slice(0, 10).map(x => x.id), 'pga');
  if (standings.pga) move(standings.pga.slice(125).map(x => x.id), 'kft');
  if (standings.pta) move(standings.pta.slice(0, 10).map(x => x.id), 'kft');
  if (standings.kft) move(standings.kft.slice(-25).map(x => x.id), 'pta');
  if (standings.asia) move(standings.asia.slice(0, 2).map(x => x.id), 'dp');
  if (standings.jp) move(standings.jp.slice(0, 2).map(x => x.id), 'dp');
  if (standings.tpga) move(standings.tpga.slice(0, 3).map(x => x.id), 'asia');
}

// ---------- 同儕：和玩家同年紀的青少年、大學生（之後一部分會轉職業，變成巡迴賽的對手）----------
export function makePeers(world, seed, myBirth, country, year) {
  const r = rng(hash(seed + ':peers'));
  const peers = [];
  // 國內同齡（同國籍，青少年排名賽的對手）＋國際同齡（AJGA、世界青少年賽、NCAA）
  for (let i = 0; i < 60; i++) peers.push(peer(r, myBirth + Math.round(r.normal() * 1.2), country, year, i < 6));
  for (let i = 0; i < 110; i++) peers.push(peer(r, myBirth + Math.round(r.normal() * 1.3), pickCountry(r), year, false));
  world.peers = peers;
}
function peer(r, by, c, year, top) {
  const f = Math.floor(r() * 2 ** 31), nm = makeName(rng(f), c);
  // 實力用「同年紀的相對水準」表示：pot = 成年後的實力潛力
  const pot = clamp(top ? 76 + r() * 12 : 60 + r.normal() * 7, 50, 92);
  return { id: 'P' + f.toString(36), en: isEastern(c) ? '' : nm, zh: isEastern(c) ? nm : '', c, by, pot: Math.round(pot * 10) / 10, titles: [], wa: [], jr: [], am: true };
}
// 同儕在某個年紀的實力：用潛力乘上年齡曲線（和玩家的平均成長大致相同）
export function peerRating(p, year) {
  const age = year - p.by;
  //   青少年的頂尖同儕（潛力 85 以上）17 歲約 59（藍梯約平標準桿），比玩家的平均成長快一點：要靠自己打或訓練才追得上
  const k = age <= 8 ? 0.27 : age <= 12 ? lerpAge(age, 8, 12, 0.27, 0.43) : age <= 17 ? lerpAge(age, 12, 17, 0.43, 0.68) : age <= 21 ? lerpAge(age, 17, 21, 0.68, 0.83) : age <= 26 ? lerpAge(age, 21, 26, 0.83, 0.95) : 1;
  return Math.round(p.pot * k * 10) / 10;
}
const lerpAge = (a, a0, a1, v0, v1) => v0 + (v1 - v0) * (a - a0) / (a1 - a0);
// 同儕轉職業：22 歲前後，實力夠的加入巡迴賽
export function peersTurnPro(world, year) {
  for (const p of world.peers) {
    if (!p.am || year - p.by < 22) continue;
    p.am = false;
    const r0 = peerRating(p, year);
    world.players.push({ ...p, am: false, r: r0, pot: p.pot, tour: r0 >= 70 ? 'kft' : r0 >= 64 ? (p.c === 'TPE' ? 'tpga' : p.c === 'JPN' ? 'jp' : 'pta') : 'tpga', ow: [], peer: true });
    p.gone = true;
  }
  world.peers = world.peers.filter(p => !p.gone || p.rival);
}

// 找球員
export const findP = (world, id) => world.players.find(p => p.id === id) || world.peers.find(p => p.id === id);
export const countryOf = p => p.c;
export const side = p => teamSide(p.c);
