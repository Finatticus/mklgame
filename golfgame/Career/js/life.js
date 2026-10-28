// 人生：建立球員、每週的行動（練球、比賽、打工、念書、陪家人、休息、社群…）、心情 / 體能 / 手感、
//   每週的世界（背景賽事、世界排名）、比賽結果的結算、年底（長大、老化、巡迴卡、獎項、國家隊）
import { clamp, seeded, rng, hash, sum, isHoliday, examWeek, money, MONTH_OF_WEEK } from './util.js';
import { createWorld, ageWorld, makePeers, peersTurnPro, peerRating, rankList, owgrAvg, prune, promote, ABS, ME, nameOf, findP, addPts } from './world.js';
import { STAT_KEYS, startStats, statsAtAge, yearlyGrowth, train, addXp, XP, TALENTS, capOf, cardSlots, CARDS, ageMul, TRAIN } from './growth.js';
import { yearEvents, eligibility, seasonEndCards, qschoolResult, teamSelection, hasCard, majorEligibility } from './tours.js';
import { simBackground, owgrPoints, fedexFor, tourPoints, amPoints, prizeOf, cinfo } from './event.js';
import { STARTER, itemById, ROOM_LEVELS, CADDIES, FLIGHT, LODGE, STAFF, COACH_TIER, ASSETS } from './data/items.js';
import { MAJORS, MAJOR_ZH, TOUR_ZH, homeCourses } from './data/calendar.js';
import { NEWS, eventsFor } from './data/story.js';
import { teamSide } from './data/players.js';

export const START_YEAR = 2026;
export const CHAPTER_ZH = ['序章', '第一章 · 童年', '第二章 · 青少年', '第三章 · 大學與業餘', '第四章 · 職業之路', '第五章 · PGA TOUR', '第六章 · 大賽挑戰者', '第七章 · 綠夾克', '第八章 · 傳奇'];
export const DIFF = { casual: { name: '休閒', ai: -2.5, xp: 1.3, mull: 1 }, standard: { name: '標準', ai: 0, xp: 1, mull: 0 }, real: { name: '寫實', ai: 1.5, xp: 1, mull: 0, injuries: true, noSpread: true } };
export const LENGTH = { fast: { name: '快速', events: 0.6, weeks: 0.7, xp: 1.9 }, standard: { name: '標準', events: 1, weeks: 1, xp: 1 }, full: { name: '完整', events: 1.25, weeks: 1.2, xp: 0.75 } };
export const FAMILY = { modest: { name: '小康家庭', allow: 15, share: 0.4, cash: 200 }, middle: { name: '中產家庭', allow: 40, share: 0.7, cash: 800 }, wealthy: { name: '富裕家庭', allow: 120, share: 1, cash: 4000 } };

// ---------- 建立生涯 ----------
export function newCareer(o) {
  const seed = o.seed || (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
  const birth = START_YEAR - 8;
  const st = {
    v: 1, seed, user: o.user, slot: o.slot, created: Date.now(), rev: 0,
    year: START_YEAR, week: 15, chapter: 0, opt: { difficulty: o.difficulty || 'standard', length: o.length || 'standard', injuries: o.difficulty === 'real', realBonus: true },
    player: {
      name: o.name, country: o.country, home: o.home || '', family: o.family || 'middle', origin: o.origin || 'tv', gender: o.gender || 'm', height: o.height || 175, birthYear: birth, age: 8,
      look: o.look || {}, stats: {}, trainXp: {}, level: 1, xp: 0, skillPts: 0, talents: o.talents || [], style: null, breaks: {}, cards: [], cardEq: [],
      form: 0, energy: 90, mood: 75, fame: 0, followers: 0, pers: { gent: 0, conf: 0, humor: 0 }, pro: false, injury: 0, personality: '',
    },
    status: { amateur: true, stage: 'child', cards: {}, invites: [], winYears: [] },
    money: { cash: FAMILY[o.family || 'middle'].cash, careerPrize: 0, season: { prize: 0, spon: 0, other: 0, cost: 0, tax: 0 }, ledger: [] },
    rel: { family: 75, mentor: 70, friend: 70, rival: 50, coach: 50, caddie: 50, agent: 50, team: 50, sponsor: 50 },
    team: { coach: null, caddie: null, agent: null, staff: [], jcoach: null },
    gear: { items: [], eq: {} }, sponsors: [], assets: {}, room: 0, homeBonus: 0,
    tally: { wins: 0, majors: 0, top10: 0, cuts: 0, events: 0, pgaWins: 0, kftWins: 0, amWins: 0, jrWins: 0, playoffs: 0 },
    titles: [], results: [], trophies: [], timeline: [], news: [], inbox: [], photos: [], ach: {}, cnt: {}, corr: [], ow: [], wa: [], jr: [],
    story: { done: {}, flags: {}, queue: [], rivals: [] }, season: {}, plan: {}, entered: {}, mq: {},
  };
  st.world = createWorld(seed, START_YEAR);
  makePeers(st.world, seed, birth, o.country, START_YEAR);
  // 童年玩伴：同國籍、同年紀、潛力高（第二章變成第一位宿敵）
  const friend = st.world.peers.find(p => p.c === o.country && p.by === birth) || st.world.peers[0];
  friend.rival = 1; friend.pot = Math.max(friend.pot, 84);
  st.story.friend = friend.id;
  st.player.stats = startStats(st);
  // 起始裝備
  for (const id of STARTER) giveItem(st, id, true);
  st.player.stats.power = Math.max(12, st.player.stats.power);
  addTimeline(st, '名人賽之夜，定下夢想');
  return st;
}
// 第二個以後的生涯欄位可以直接從 13 歲開始（預設天賦）
export function skipChildhood(st) {
  st.player.talents = st.player.talents.length ? st.player.talents : ['basics', 'heart'];
  st.player.stats = statsAtAge(st, 13);
  st.year = st.player.birthYear + 13; st.week = 1; st.player.age = 13;
  st.chapter = 2; st.status.stage = 'junior'; st.player.level = 6; st.story.done.childhood = true;
  for (let y = START_YEAR; y < st.year; y++) yearWorld(st, y);
  addTimeline(st, '跳過童年，從 13 歲開始');
}

// ---------- 裝備 ----------
let uidN = 0;
export function giveItem(st, id, equip = false) {
  const base = itemById(id); if (!base) return null;
  const it = { uid: `${id}_${Date.now().toString(36)}${(uidN++).toString(36)}`, id, slot: base.slot, name: base.name, brand: base.brand, rarity: base.rarity, stats: { ...base.stats }, lv: 1, price: base.price, look: base.look || null };
  st.gear.items.push(it);
  if (equip) st.gear.eq[it.slot] = it.uid;
  return it;
}

// ---------- 階段與章節 ----------
export function stageOf(st) { return st.status.stage; }
export function updateChapter(st) {
  const s = st.status, a = st.player.age;
  let ch = st.chapter;
  if (s.stage === 'child') ch = a <= 7 ? 0 : 1;
  else if (s.stage === 'junior') ch = 2;
  else if (s.stage === 'college') ch = 3;
  else if (s.stage === 'road') ch = 4;
  else if (s.stage === 'tour') ch = st.tally.pgaWins >= 1 || a >= 27 || (st.rankNow || 999) <= 50 ? 6 : 5;
  if (st.tally.masters) ch = 8;
  if (s.stage === 'retired') ch = 8;
  if (ch !== st.chapter) { st.chapter = Math.max(st.chapter, ch); return true; }
  return false;
}

// ---------- 每週的行動 ----------
export const ACTIONS = {
  train: { name: '練球', desc: '訓練經驗累積滿了，那一項素質 +1；連續幾週練同一項有「專注」加成；也可以打訓練關卡（經驗更多）', energy: -8, mood: 0 },
  rest: { name: '休息', desc: '體能 +22、心情 +5', energy: 22, mood: 5 },
  study: { name: '念書', desc: '學業 +6（體能 −3、心情 −2）', energy: -3, mood: -2, need: s => s === 'junior' || s === 'college' },
  tutor: { name: '補習', desc: '學業 +10，學費 $60（家人分擔一部分）；體能 −5、心情 −4', energy: -5, mood: -4, need: s => s === 'junior' || s === 'college' },
  team: { name: '校隊練習', desc: '和校隊一起練：隨機一項訓練（約一般練球的 75%）、學業 +1、心情 +3', energy: -6, mood: 3, need: s => s === 'junior' },
  work: { name: '打工', desc: '青少年：家鄉球場桿弟（$60~120，家鄉讀果嶺加成 +0.25）；大學：夏令營助教（$250，暑假 $800）；職業：開班教學', energy: -8, mood: 0 },
  family: { name: '陪家人', desc: '家人關係 +6、心情 +8', energy: 2, mood: 8 },
  social: { name: '社群發文', desc: '追蹤數增加（精彩的比賽會讓追蹤數暴增）', energy: -1, mood: 2, need: (s, st) => st.player.age >= 15 },
  sponsor: { name: '贊助活動', desc: '拍廣告、出席活動：收入與人氣，體能 −10', energy: -10, mood: -1, need: (s, st) => st.sponsors.length > 0 },
  corp: { name: '企業球敘', desc: '陪企業客戶打球：收入高，但佔掉整週', energy: -12, mood: -2, full: true, need: (s, st) => !st.status.amateur && (st.player.fame >= 20000) },
  clinic: { name: '球迷營隊', desc: '開球迷營隊、教學：收入與人氣', energy: -6, mood: 4, need: (s, st) => !st.status.amateur && st.player.fame >= 50000 },
};
export function slotsOf(st, w = st.week) {
  const s = st.status.stage;
  if (s === 'junior') return isHoliday(w) ? 3 : 2;
  if (s === 'college') return isHoliday(w, true) ? 3 : 2;
  return 3;
}
export function actionsFor(st) { return Object.entries(ACTIONS).filter(([k, a]) => !a.need || a.need(st.status.stage, st)).map(([k, a]) => ({ k, ...a })); }

// 一個行動的效果（log 回傳文字）
export function doAction(st, a, sub, log) {
  const p = st.player, s = st.status.stage, A = ACTIONS[a], r = seeded(st, 'act', st.year, st.week, a, sub || '', log.length);
  p.energy = clamp(p.energy + (A.energy || 0) * staffMul(st, 'energy'), 0, 100);
  p.mood = clamp(p.mood + (A.mood || 0), 0, 100);
  const g0 = st._wg || null;      // 這一週達成的本週目標（倍率型的獎勵在行動裡套用）
  switch (a) {
    case 'train': case 'team': {
      const kind = a === 'team' ? ['long', 'iron', 'short', 'putt'][Math.floor(r() * 4)] : sub || 'iron';
      const limited = st.story.flags.limit === st.year * 100 + st.week;
      const fm = a === 'team' ? 1 : focusMul(st, kind), gm = g0 && g0.id === 'focus' && g0.sub === kind && a === 'train' ? 1.3 : 1;
      const amt = (24 + r() * 6) * coachMul(st, kind) * (p.talents.includes('grinder') ? 1.15 : 1) * lengthXp(st) * assetMul(st, kind) * fm * gm * (limited ? 0.5 : 1) * (a === 'team' ? 0.75 : 1);
      const g = train(p, kind, amt);
      const xp = Math.round(15 * lengthXp(st));
      addXp(p, xp, x => log.push(x));
      const prog = TRAIN[kind].stats.map(k => `${STAT_NAME[k]} ${Math.round(p.trainXp[k] || 0)}/${trainNeedOf(p.stats[k])}`).join('、');
      const tags = [fm > 1 ? `專注 +${Math.round((fm - 1) * 100)}%` : '', gm > 1 ? '本週目標 +30%' : '', limited ? '被限制練球 −50%' : ''].filter(Boolean).join('、');
      if (a === 'team') st.school.grade = clamp((st.school.grade || 60) + 1, 0, 100);
      const per = Math.round(amt / TRAIN[kind].stats.length * (kind === 'mind' || kind === 'gym' ? 1 : 1.3));
      log.push(`${a === 'team' ? '校隊練習' : '練球'}（${TRAIN_SHORT[kind]}）：訓練經驗${TRAIN[kind].stats.length > 1 ? '每項' : ''} +${per}${tags ? `（${tags}）` : ''}${g.length ? '，' + g.map(k => STAT_NAME[k] + ' +1').join('、') : ''} · 經驗 +${xp}${a === 'team' ? ' · 學業 +1' : ''}｜進度 ${prog}`);
      break;
    }
    case 'rest': log.push(`休息：體能 +${A.energy}、心情 +${A.mood}`); break;
    case 'study': st.school.grade = clamp((st.school.grade || 60) + 6, 0, 100); log.push(`念書：學業 +6（現在 ${Math.round(st.school.grade)}）`); break;
    case 'tutor': { const paid = spend(st, 60, '補習費'); st.school.grade = clamp((st.school.grade || 60) + 10, 0, 100); log.push(`補習：學業 +10（現在 ${Math.round(st.school.grade)}）· 學費 ${money(paid)}${paid < 60 ? '（其餘家人出）' : ''}`); break; }
    case 'work': {
      let pay = s === 'junior' ? 60 + Math.round(r() * 60) : s === 'college' ? (isHoliday(st.week, true) ? 800 : 250) : 1500 + Math.round(p.fame / 200);
      if (g0 && g0.id === 'work') pay = Math.round(pay * 1.5);
      earn(st, pay, s === 'junior' ? '桿弟打工' : s === 'college' ? '夏令營助教' : '教學收入', 'other');
      if (s === 'junior') { st.homeBonus = Math.min(5, (st.homeBonus || 0) + 0.25); }
      log.push(`打工：收入 ${money(pay)}${g0 && g0.id === 'work' ? '（本週目標 ×1.5）' : ''}${s === 'junior' ? ' · 家鄉讀果嶺加成 +0.25' : ''}`);
      break;
    }
    case 'family': st.rel.family = clamp(st.rel.family + 6, 0, 100); log.push(`陪家人：家人關係 +6（現在 ${Math.round(st.rel.family)}）、心情 +${A.mood}`); break;
    case 'social': {
      let add = Math.round(20 + p.followers * 0.01 + p.fame * 0.02 + r() * 40);
      if (g0 && g0.id === 'social') add *= 2;
      p.followers += add; log.push(`社群發文：追蹤 +${add.toLocaleString()}${g0 && g0.id === 'social' ? '（本週目標 ×2）' : ''}`);
      break;
    }
    case 'sponsor': {
      const pay = Math.round(sum(st.sponsors.map(x => x.year)) * 0.02 + 5000);
      earn(st, pay, '贊助活動', 'spon'); p.fame += 400; st.rel.sponsor = clamp(st.rel.sponsor + 4, 0, 100);
      log.push(`贊助活動：${money(pay)}`);
      break;
    }
    case 'corp': { const pay = Math.round(30000 + p.fame * 0.15); earn(st, pay, '企業球敘', 'other'); log.push(`企業球敘：${money(pay)}`); break; }
    case 'clinic': { const pay = Math.round(10000 + p.fame * 0.05); earn(st, pay, '球迷營隊', 'other'); p.fame += 800; log.push(`球迷營隊：${money(pay)}`); break; }
  }
}
const TRAIN_SHORT = { long: '長桿', iron: '鐵桿', short: '短桿', putt: '推桿', mind: '心理', gym: '體能' };
const trainNeedOf = v => Math.round(100 * (1 + Math.max(0, v - 30) / 30));
// 專注：連續幾週把同一項當主要訓練，每多一週 +5%（最多 +20%）
export function focusMul(st, kind) { const f = st.focus; return f && f.kind === kind && f.n > 1 ? 1 + Math.min(4, f.n - 1) * 0.05 : 1; }
function updateFocus(st, plan) {
  const cnt = {};
  for (const a of plan) if (a.k === 'train') cnt[a.sub || 'iron'] = (cnt[a.sub || 'iron'] || 0) + 1;
  const main = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
  if (!main) { st.focus = null; return; }
  st.focus = st.focus && st.focus.kind === main ? { kind: main, n: st.focus.n + 1 } : { kind: main, n: 1 };
}

// ---------- 本週目標（每週不一樣：教練、家人、球場給的小任務，安排符合就有額外獎勵）----------
const isStudent = st => !!st.school && st.status.amateur && (st.status.stage === 'junior' || st.status.stage === 'college');
export function weekGoal(st) {
  const r = seeded(st, 'wgoal', st.year, st.week), p = st.player, list = [];
  const k = ['long', 'iron', 'short', 'putt'][Math.floor(r() * 4)];
  list.push({ id: 'focus', sub: k, w: 3, text: `教練：這週至少練兩次「${TRAIN[k].name}」`, reward: '這一項的訓練經驗 +30%、經驗 +40' });
  list.push({ id: 'mix', w: 2, text: '均衡發展：這週練兩種不同的訓練', reward: '經驗 +60' });
  list.push({ id: 'family', w: 2, text: '家人：這週一起吃頓飯（陪家人一次）', reward: '家人關係再 +4、心情 +6' });
  if (p.energy < 55) list.push({ id: 'rest', w: 3, text: '防護員：體能偏低，這週至少休息一次', reward: '體能再 +10' });
  if (isStudent(st) && (examWeek(st.week) || examWeek(st.week + 1))) list.push({ id: 'exam', w: 6, text: '考試快到了：念書或補習一次', reward: '學業再 +4' });
  list.push({ id: 'work', w: st.money.cash < 200 ? 4 : 1, text: st.status.amateur ? '家鄉球場缺人手：打工一次' : '球迷想上你的課：開班教學（打工）一次', reward: '這次打工的收入 ×1.5' });
  if (p.age >= 15) list.push({ id: 'social', w: 1, text: '粉絲想看你練球：社群發文一次', reward: '這次發文的追蹤數 ×2' });
  const tot = list.reduce((s, g) => s + g.w, 0);
  let x = r() * tot;
  for (const g of list) { x -= g.w; if (x <= 0) return g; }
  return list[0];
}
export function goalMet(st, g, plan) {
  const has = k => plan.some(a => a.k === k);
  switch (g.id) {
    case 'focus': return plan.filter(a => a.k === 'train' && (a.sub || 'iron') === g.sub).length >= 2;
    case 'mix': return new Set(plan.filter(a => a.k === 'train').map(a => a.sub || 'iron')).size >= 2;
    case 'family': return has('family');
    case 'rest': return has('rest');
    case 'exam': return has('study') || has('tutor');
    case 'work': return has('work');
    case 'social': return has('social');
  }
  return false;
}
// 每週固定的開銷（給「存款不夠時自動排打工」判斷）
export function weeklyCost(st) {
  const s = st.status;
  let c = 0;
  if (st.team.coach) c += st.team.coach.fee || 0;
  if (st.team.caddie && st.team.caddie.fee && !s.amateur) c += st.team.caddie.fee;
  for (const k of st.team.staff) c += (STAFF[k] && STAFF[k].fee) || 0;
  if (!s.amateur) c += st.base === 'florida' ? 900 : 500;
  return c;
}
export const lowCash = st => st.money.cash < (st.status.amateur ? 30 : Math.max(500, weeklyCost(st) * 2));

const STAT_NAME = { power: '力量', contact: '擊球效率', launch: '彈道', accuracy: '準度', consistency: '穩定度', shaping: '曲球', spin: '旋轉', chipping: '切球', bunker: '沙坑', recovery: '脫困', touch: '推桿距離感', line: '推桿方向', reading: '讀果嶺', mental: '抗壓' };
export const lengthXp = st => LENGTH[st.opt.length].xp * DIFF[st.opt.difficulty].xp * (st.legacyOf ? 1.2 : 1) * ageMul(st.player.age);      // 生涯長度、難度、傳承（+20%）、年紀
// 教練加成
export function coachMul(st, kind) {
  let m = 1;
  const grp = { long: 'long', iron: 'dir', short: 'short', putt: 'putt', mind: 'mind', gym: 'long' }[kind];
  const jc = st.team.jcoach;
  if (jc && jc.groups.includes(grp)) m += jc.mul;
  const c = st.team.coach;
  if (c && c.groups.includes(grp)) m += c.mul;
  return m;
}
const assetMul = (st, kind) => (kind === 'short' && st.assets.shortarea ? 1.2 : 1) * (kind === 'gym' && st.assets.gym ? 1.2 : 1);
const staffMul = (st, k) => 1;

// ---------- 金錢 ----------
export function earn(st, amt, what, cat = 'other') {
  st.money.cash += amt;
  st.money.season[cat] = (st.money.season[cat] || 0) + amt;
  st.money.ledger.unshift({ y: st.year, w: st.week, what, amt: Math.round(amt) });
  st.money.ledger = st.money.ledger.slice(0, 60);
}
// 業餘時期家人分擔的金額（依家庭背景與家人關係）：商店與升級的價格標示也用這個
export function familyPart(st, amt) {
  if (!st.status.amateur || amt <= 0) return 0;
  return Math.min(amt, Math.round(amt * FAMILY[st.player.family].share * clamp(st.rel.family / 80, 0.4, 1.1)));
}
export function spend(st, amt, what, cat = 'cost') {
  const fam = familyPart(st, amt), paid = amt - fam;
  st.money.cash -= paid;
  st.money.season[cat] = (st.money.season[cat] || 0) + paid;
  st.money.ledger.unshift({ y: st.year, w: st.week, what: what + (fam ? `（家人出 ${money(fam)}）` : ''), amt: -Math.round(paid) });
  st.money.ledger = st.money.ledger.slice(0, 60);
  return paid;
}
// 旅費（依基地與比賽地區、艙等）
const REGION_HOME = { TPE: 'tw', JPN: 'jp', KOR: 'asia', CHN: 'asia', USA: 'na' };
export function baseRegion(st) { return st.base === 'florida' ? 'na' : REGION_HOME[st.player.country] || (teamSide(st.player.country) === 'eur' ? 'eu' : 'asia'); }
export function travelCost(st, region) {
  const b = baseRegion(st);
  const near = { tw: ['tw'], jp: ['jp', 'tw', 'asia'], asia: ['asia', 'tw', 'jp'], na: ['na', 'latam'], eu: ['eu', 'me'], latam: ['latam', 'na'], oce: ['oce'], me: ['me', 'eu'] };
  const base = region === b ? (b === 'tw' ? 80 : 350) : (near[b] || []).includes(region) ? 700 : 1600;
  const fl = FLIGHT[st.flight || 'eco'], lodge = LODGE[st.lodge || (st.status.amateur ? 'motel' : 'hotel')];
  return { cost: Math.round(base * fl.mul + lodge.cost * 6), energy: region === b ? 3 : fl.energy, mood: lodge.mood };
}
// 稅：依基地所在地（佛州沒有州所得稅）＋賽事所在地（在美國以外比賽、外國基地在美國比賽多 5%）
export function taxRate(st, region) {
  const base = st.base === 'florida' ? 0.30 : st.player.country === 'TPE' ? 0.28 : st.player.country === 'USA' ? 0.35 : 0.33;
  return base + (region !== baseRegion(st) ? 0.05 : 0);
}

// ---------- 一週的開始：可以打的比賽 ----------
// 一年的賽程（快取在記憶體，不放進存檔）
const yevCache = new Map();
export function eventsOfYear(st, y) {
  const k = `${st.seed}:${y}:${st.player.country}:${st.player.age >= 50 ? 1 : 0}`;
  if (!yevCache.has(k)) { if (yevCache.size > 6) yevCache.clear(); yevCache.set(k, yearEvents(y, st)); }
  return yevCache.get(k);
}
export function weekEvents(st, y = st.year, w = st.week) {
  return eventsOfYear(st, y).filter(e => e.w === w).map(e => ({ ...e, el: eligibility(st, e) }));
}
export const findEvent = (st, key) => { const [y] = key.split(':'); return eventsOfYear(st, Number(y)).find(e => e.key === key); };
export function upcoming(st, n = 12) {
  const out = [];
  for (let k = 0; k < 52 && out.length < n; k++) {
    let w = st.week + k, y = st.year;
    if (w > 52) { w -= 52; y++; }
    // 業餘時期只列可以報名的比賽與四大賽（PGA TOUR 的一般賽事對青少年沒有意義）
    for (const e of weekEvents(st, y, w)) if (e.el.ok || e.tour === 'major' || (!st.status.amateur && ['pga', 'team', 'olympic'].includes(e.tour)) || e.tour === st.status.mainTour) out.push(e);
  }
  return out;
}

// ---------- 每週的世界 ----------
// skip = 玩家這週參加的比賽（那一場由比賽引擎處理）
export function worldWeek(st, skip = null) {
  const y = st.year, w = st.week, now = ABS(y, w);
  const list = eventsOfYear(st, y).filter(e => e.w === w && e.key !== skip);
  for (const ev of list) {
    if (['team', 'olympic', 'qs', 'exh', 'kids'].includes(ev.tour)) { if (ev.tour === 'team' || ev.tour === 'olympic') bgTeam(st, ev); continue; }
    if (['junior', 'am', 'ncaa'].includes(ev.tour)) { bgAmateur(st, ev); continue; }
    if (ev.tour === 'champions' && st.player.age < 50) continue;
    const res = simBackground(st, ev, st.world);
    if (!res) continue;
    applyWorldResult(st, ev, res.rows, res.E);
  }
  // 各巡迴的年度積分排名（聯邦快遞盃、Korn Ferry、Race to Dubai、獎金榜）：季後賽與年終賽的資格
  if (st.player.pro) {
    const S = st.world.season[y] || {}, mine = st.season[y] || {};
    st.tourRank = {};
    for (const t of ['pga', 'kft', 'pta', 'dp', 'asia', 'jp', 'tpga']) {
      if (mine[t] == null) continue;
      st.tourRank[t] = Object.values(S[t] || {}).filter(v => v > mine[t]).length + 1;
    }
    st.fedexRank = st.tourRank.pga || 999;
  }
  // 世界排名
  if (st.player.pro) { st.rankNow = myWorldRank(st, now); st.bestRank = Math.min(st.bestRank || 9999, st.rankNow); if (st.rankNow === 1) st.cnt.no1Weeks = (st.cnt.no1Weeks || 0) + 1; }
  if (w % 4 === 0) prune(st.world, now);
}
export function myWorldRank(st, now) {
  const mine = owgrAvg({ ow: st.ow }, now);
  if (mine <= 0) return 9999;
  return st.world.players.filter(p => !p.ret && owgrAvg(p, now) > mine).length + 1;
}
// 把一場比賽（背景或玩家參加的）的結果寫進世界：AI 的世界排名積分、年度積分、冠軍、歷史、新聞
export function applyWorldResult(st, ev, rows, E) {
  const y = ev.year, now = ABS(y, ev.w), W = st.world;
  const season = W.season[y] = W.season[y] || {};
  const tour = ev.tour === 'major' ? 'pga' : ev.tour;
  const pts = season[tour] = season[tour] || {};
  for (const x of rows) {
    if (x.cut || !x.pos || x.me || x.id === ME) continue;
    const p = findP(W, x.id); if (!p) continue;
    const o = owgrPoints(E || ev, x.pos);
    if (o >= 0.3 && p.ow) addPts(p.ow, now, o);
    const pr = prizeOf(E || { ...ev, field: rows }, rows, x.id);
    const f = (ev.tour === 'pga' || ev.tour === 'major') ? fedexFor(ev, x.pos) : tourPoints(ev, x.pos, pr);
    if (f) pts[x.id] = (pts[x.id] || 0) + f;
    if (pr && (ev.tour === 'pga' || ev.tour === 'major')) { season.money = season.money || {}; season.money[x.id] = (season.money[x.id] || 0) + pr; }
  }
  const win = rows.find(x => x.pos === 1);
  if (win) {
    const wp = findP(W, win.id);
    if (wp) wp.titles.push([y, ev.id]);
    if (['pga', 'major', 'team', 'olympic'].includes(ev.tour) || ev.tier === 'dp+') { W.hist[ev.id] = W.hist[ev.id] || {}; W.hist[ev.id][y] = win.id === ME ? ME : win.id; }
    // 新聞：四大賽、THE PLAYERS、季後賽、DP 旗艦賽
    if (win.id !== ME && (ev.major || ev.id === 'players' || ev.playoff || ev.tier === 'dp+')) {
      const par = (cinfo(ev.course)?.par || 72) * (ev.rounds || 4);
      const t = (ev.major ? NEWS.world_major : NEWS.world)[hash(ev.key) % (ev.major ? 2 : 3)];
      addNews(st, fill(t, { winner: win.name, event: ev.name, major: MAJOR_ZH[ev.id] || '', toPar: toParStr(win.total - par) }), ev.major ? 'major' : 'world');
    }
  }
}
const toParStr = v => (v === 0 ? 'E' : v > 0 ? '+' + v : String(v));
function bgTeam(st, ev) {
  if ((st.teamSel || {})[ev.key]) return;
  const W = st.world, sides = ev.kind === 'olympic' ? null : ev.kind === 'ryder' ? ['usa', 'eur'] : ['usa', 'intl'];
  const r = rng(hash(st.seed + ':bgteam:' + ev.key));
  if (sides) {
    const win = r() < 0.55 ? sides[0] : sides[1];
    W.hist[ev.id] = W.hist[ev.id] || {}; W.hist[ev.id][ev.year] = win;
    addNews(st, `${ev.name}：${{ usa: '美國隊', eur: '歐洲隊', intl: '國際隊' }[win]}獲勝`, 'world');
  } else {
    const res = simBackground(st, { ...ev, tour: 'pga', field: 60, cut: 0 }, W);
    if (res) { const g = res.rows[0]; W.hist.olympics = W.hist.olympics || {}; W.hist.olympics[ev.year] = g.id; addNews(st, `${ev.name} 金牌：${g.name}`, 'world'); }
  }
}
// 業餘、青少年的背景賽事：同儕的排名積分
function bgAmateur(st, ev) {
  const W = st.world, y = ev.year, r = rng(hash(st.seed + ':bgam:' + ev.key));
  const age = st.player.age;
  if (age < 12 || !st.status.amateur) return;      // 童年與轉職業之後不用算同儕的業餘排名
  const pool = W.peers.filter(p => p.am !== false && Math.abs((y - p.by) - age) <= 3 && (ev.tour !== 'junior' || ev.inv || ev.national || p.c === st.player.country));
  if (!pool.length) return;
  const sc = pool.map(p => ({ p, t: peerRating(p, y) + r.normal() * 3.2 })).sort((a, b) => b.t - a.t);
  // 只有前段的人拿積分（排名只看最近 52 週，每 4 週合成一筆）
  sc.slice(0, Math.max(8, Math.ceil(sc.length * 0.3))).forEach((x, i) => {
    const ap = amPoints(ev, i + 1, sc.length);
    if (ap.wagr >= 0.3) addPts(x.p.wa = x.p.wa || [], ABS(y, ev.w), ap.wagr);
    if (ap.jr >= 0.3) addPts(x.p.jr = x.p.jr || [], ABS(y, ev.w), ap.jr);
  });
  if (sc[0]) sc[0].p.titles.push([y, ev.id]);
}

// 青少年排名（國內）與世界青少年 / 業餘排名
export function amRanks(st) {
  const W = st.world, now = ABS(st.year, st.week);
  const sumPts = arr => (arr || []).filter(([w]) => now - w < 52).reduce((s, [, v]) => s + v, 0);
  const mineJr = sumPts(st.jr), mineWa = sumPts(st.wa);
  const dom = W.peers.filter(p => p.c === st.player.country && Math.abs((st.year - p.by) - st.player.age) <= 2);
  st.jrRank = dom.filter(p => sumPts(p.jr) > mineJr).length + 1;
  st.wjr = W.peers.filter(p => sumPts(p.jr) + sumPts(p.wa) > mineJr + mineWa).length + 1;
  st.wagr = W.peers.filter(p => sumPts(p.wa) > mineWa).length + 1 + (mineWa < 5 ? 600 : 0);
}

// ---------- 新聞、年表 ----------
export function fill(t, v) { return t.replace(/\{(\w+)\}/g, (m, k) => (v[k] ?? m)); }
export function addNews(st, text, kind = 'me') { st.news.unshift({ y: st.year, w: st.week, text, kind }); st.news = st.news.slice(0, 60); }
export function addTimeline(st, text) { st.timeline.push({ y: st.year, age: st.player.age, text }); }
// 生涯相簿：重要時刻自動留一張（用授權的實景照片 + 說明）
export function addPhoto(st, title, img) {
  st.photos = st.photos || [];
  if (st.photos.some(p => p.title === title && p.y === st.year)) return;
  st.photos.push({ y: st.year, age: st.player.age, title, img });
  st.photos = st.photos.slice(-80);
}

// ---------- 一週結束 ----------
//   plan = [行動, …]；回傳這一週發生的事（文字）
export function endWeek(st, plan, opts = {}) {
  const p = st.player, log = [];
  if (!opts.eventWeek) {
    updateFocus(st, plan);
    const g = weekGoal(st);
    st._wg = goalMet(st, g, plan) ? g : null;
    for (const a of plan) doAction(st, a.k, a.sub, log);
    if (st._wg) {
      const w = st._wg;
      if (w.id === 'focus') addXp(p, 40, x => log.push(x));
      if (w.id === 'mix') addXp(p, 60, x => log.push(x));
      if (w.id === 'family') { st.rel.family = clamp(st.rel.family + 4, 0, 100); p.mood = clamp(p.mood + 6, 0, 100); }
      if (w.id === 'rest') p.energy = clamp(p.energy + 10, 0, 100);
      if (w.id === 'exam' && st.school) st.school.grade = clamp(st.school.grade + 4, 0, 100);
      log.push(`本週目標達成：${w.text.replace(/^.*?：/, '')} → ${w.reward}`);
    }
    delete st._wg;
  }
  // 自然變化：體能恢復、心情回到 60、手感回到 0
  p.energy = clamp(p.energy + 10 + (st.team.staff.includes('fitness') ? 4 : 0) + (st.assets.gym ? 3 : 0), 0, 100);
  p.mood = clamp(p.mood + (60 - p.mood) * 0.08 + (st.rel.family - 60) * 0.02, 0, 100);
  const r = seeded(st, 'form', st.year, st.week);
  // 手感：每週回到 0 附近（上一週的六成 + 隨機），心情很差時往下一點
  p.form = clamp(Math.round((p.form * 0.6 + r.normal() * 0.7 + (p.mood - 55) / 120) * 10) / 10, -3, 3);
  // 學業
  if (st.school && (st.status.stage === 'junior' || st.status.stage === 'college')) {
    if (!plan.some(a => a.k === 'study' || a.k === 'tutor' || a.k === 'team')) st.school.grade = clamp((st.school.grade || 60) - (st.school.sports ? 0.4 : 0.8), 0, 100);
    if (examWeek(st.week) && st.school.grade < 40) { p.mood -= 8; log.push('考試成績不理想（學業低於 40）：家人限制了下一週的練球（訓練經驗 −50%）'); st.story.flags.limit = st.year * 100 + st.week + 1; }
    else if (examWeek(st.week) && st.school.grade >= 80 && st.status.stage === 'junior') { const bonus = Math.round(FAMILY[p.family].allow * 3); earn(st, bonus, '考試考得好，家人給的獎勵', 'other'); p.mood = clamp(p.mood + 6, 0, 100); log.push(`考試考得好（學業 80 以上）：家人獎勵 ${money(bonus)}、心情 +6`); }
  }
  // 每週的固定收入與支出
  weeklyMoney(st, log);
  // 傷病（寫實難度，或玩家打開傷病）
  if (st.opt.injuries && p.injury <= 0 && p.energy < 25 && r() < (st.team.staff.includes('physio') ? 0.03 : 0.07)) { p.injury = 1 + Math.floor(r() * 3); log.push(`小傷：需要休息 ${p.injury} 週`); }
  else if (p.injury > 0) p.injury--;
  worldWeek(st, opts.eventKey || null);
  if (st.status.amateur) amRanks(st);
  else selections(st, log);
  // 下一週
  st.week++;
  if (st.week > 52) { yearEnd(st, log); st.week = 1; st.year++; }
  st.player.age = st.year - st.player.birthYear;
  updateChapter(st);
  return log;
}
function weeklyMoney(st, log) {
  const s = st.status;
  if (s.amateur && s.stage !== 'college') earn(st, FAMILY[st.player.family].allow * clamp(st.rel.family / 70, 0.5, 1.2), '零用錢', 'other');
  // 贊助合約（每週入帳）
  for (const sp of st.sponsors) {
    const pay = sp.year / 52, cut = st.team.agent ? pay * st.team.agent.cut : 0;
    earn(st, pay - cut, `${sp.name}（${sp.kindName}）`, 'spon');
  }
  // 付不出薪水：桿弟、教練、專業團隊暫時離開（存款低於 −$5,000）
  if (!s.amateur && st.money.cash < -5000 && (st.team.coach || (st.team.caddie && st.team.caddie.fee) || st.team.staff.length)) {
    st.team.coach = null; st.team.staff = [];
    if (st.team.caddie && st.team.caddie.fee) st.team.caddie = { ...CADDIES.find(c => c.id === 'family'), chem: 1 };
    log.push('付不出薪水：教練、專業團隊暫時離開，改由家人揹球袋');
    addNews(st, `${st.player.name} 精簡團隊，家人接手揹球袋`);
  }
  // 團隊薪水
  const fees = [];
  if (st.team.coach) fees.push([st.team.coach.fee, st.team.coach.name]);
  if (st.team.caddie && st.team.caddie.fee && !s.amateur) fees.push([st.team.caddie.fee, '桿弟 ' + st.team.caddie.name]);
  for (const k of st.team.staff) fees.push([STAFF[k].fee, STAFF[k].name]);
  for (const [f, n] of fees) if (f) spend(st, f, n);
  // 生活費（職業後自己付）
  if (!s.amateur) spend(st, (st.base === 'florida' ? 900 : 500) * (st.money.cash < 0 ? 0.6 : 1), st.money.cash < 0 ? '生活費（省吃儉用）' : '生活費與房租');
  if (st.money.cash < 0 && !st.story.flags.debtWarn) { st.story.flags.debtWarn = st.year; log.push('存款變成負的了！接教學、打工，或少打幾站。'); }
  // 剛轉職業的前幾年：存款見底時家人每個月寄一筆生活費（家人關係越好越多）
  if (!s.amateur && st.money.cash < 0 && st.player.age <= 25 && st.week % 4 === 0 && st.rel.family >= 40) { const aid = Math.round(FAMILY[st.player.family].cash * 1.5 * st.rel.family / 70); earn(st, aid, '家人寄來的生活費', 'other'); st.rel.family = clamp(st.rel.family - 1, 0, 100); }
}

// 團體賽（8 月底）與奧運（7 月初）的選拔：玩家入選就寄通知
function selections(st, log) {
  const y = st.year, w = st.week;
  for (const ev of eventsOfYear(st, y).filter(e => (e.tour === 'team' && w === 34) || (e.tour === 'olympic' && w === 27))) {
    const now = ABS(y, w), sel = teamSelection(st, ev, st.world, now);
    st.teamSel = st.teamSel || {};
    if (ev.tour === 'olympic') {
      if (sel.includes(ME)) { st.teamSel[ev.key] = { olympic: true }; log.push(`入選${ev.name}！`); addNews(st, `${st.player.name} 入選奧運代表隊`); addTimeline(st, `入選${ev.name}`); }
    } else {
      const sides = Object.keys(sel), mine = sides.find(s => sel[s].includes(ME));
      if (mine) { st.teamSel[ev.key] = { teams: sel, sides, mine }; log.push(`入選 ${ev.name}！`); addNews(st, `${st.player.name} 入選 ${ev.name}`); addTimeline(st, `入選 ${ev.name}`); }
    }
  }
}

// ---------- 比賽結算（玩家參加的那一場）----------
export function settleEvent(st, E, rows) {
  const me = rows.find(x => x.id === ME), ev = E, p = st.player, now = ABS(E.year, E.w);
  const pos = me.cut ? null : me.pos, n = rows.length;
  const prize = st.status.amateur ? 0 : prizeOf(E, rows, ME);
  const rec = { y: E.year, w: E.w, age: p.age, key: E.key, id: E.id, name: E.name, tour: E.tour, tourZh: TOUR_ZH[E.tour] || E.tour, course: E.course, courseName: E.courseName, pos: me.cut ? 'CUT' : (me.tie ? 'T' : '') + pos, posN: pos || 999, rounds: me.rounds, total: me.total, toPar: me.total - E.par * (me.cut ? 2 : E.rounds), prize, pts: 0, mode: E.me.mode.join('/'), major: E.major };
  // 積分
  const ow = st.status.amateur ? 0 : owgrPoints(E, pos);
  if (ow >= 0.3) addPts(st.ow, now, ow);
  const ap = amPoints(E, pos || n, n);
  if (st.status.amateur && !me.cut) { if (ap.wagr) addPts(st.wa, now, ap.wagr); if (ap.jr) addPts(st.jr, now, ap.jr); }
  const fx = fedexFor(E, pos), tp = tourPoints(E, pos, prize);
  const tour = E.tour === 'major' ? 'pga' : E.tour;
  st.season[E.year] = st.season[E.year] || {};
  const S = st.season[E.year];
  if (fx && hasCard(st, 'pga', E.year)) { S.pga = (S.pga || 0) + fx; rec.pts = fx; }
  else if (tp && tour !== 'pga') { S[tour] = (S[tour] || 0) + tp; rec.pts = Math.round(tp); }
  if (prize) {
    const tax = Math.round(prize * taxRate(st, E.region));
    const cadCut = st.team.caddie && !st.status.amateur ? Math.round(prize * (pos === 1 ? 0.1 : pos <= 10 ? 0.07 : 0.05)) : 0;
    earn(st, prize, `${E.name} 獎金（${rec.pos}）`, 'prize');
    if (tax) spend(st, tax, `${E.name} 稅金`, 'tax');
    if (cadCut) spend(st, cadCut, `桿弟分紅`, 'cost');
    st.money.careerPrize += prize;
    S.money = (S.money || 0) + prize;
  }
  // 統計
  const T = st.tally;
  T.events++;
  if (!me.cut) T.cuts++;
  if (!st.status.amateur) st.cnt.cutStreak = me.cut ? 0 : (st.cnt.cutStreak || 0) + 1;
  // 桿弟的默契：一起比賽 6 場升一級（最多 5 級）
  const cad = st.team.caddie;
  if (cad) { cad.events = (cad.events || 0) + 1; cad.chem = Math.min(5, 1 + Math.floor(cad.events / 6)); st.rel.caddie = clamp((st.rel.caddie || 50) + 1, 0, 100); }
  if (pos && pos <= 10) T.top10++;
  st.results.push(rec);
  // 經驗值
  const played = E.me.played.flat().filter(Boolean).length, simmed = E.me.played.flat().filter(x => x === false).length;
  let xp = played * XP.holePlayed + simmed * XP.holeSim + (pos === 1 ? XP.win : pos && pos <= 10 ? XP.top10 : !me.cut ? XP.cut : 0);
  xp *= lengthXp(st);
  addXp(p, xp);
  // 人氣
  const fameAdd = Math.round((pos === 1 ? 4000 : pos && pos <= 10 ? 900 : !me.cut ? 150 : 20) * fameMul(E) * (p.talents.includes('showman') ? 1.25 : 1));
  p.fame += fameAdd; p.followers += Math.round(fameAdd * 0.4);
  // 手感、心情
  p.form = clamp(p.form + (pos === 1 ? 1.2 : pos && pos <= 10 ? 0.5 : me.cut ? -0.3 : 0), -3, 3);
  p.mood = clamp(p.mood + (pos === 1 ? 25 : pos && pos <= 10 ? 8 : me.cut ? -4 : 1), 0, 100);
  // 冠軍
  if (pos === 1) winEvent(st, E, rec);
  // 世界（AI 的積分）
  applyWorldResult(st, E, rows, E);
  return rec;
}
const fameMul = E => (E.major ? 6 : E.tour === 'pga' ? 2.5 : E.tour === 'am' ? 1.5 : E.tour === 'junior' ? 0.4 : E.tour === 'ncaa' ? 0.8 : 1);
function winEvent(st, E, rec) {
  const T = st.tally;
  T.wins++;
  if (E.tour === 'pga' || E.tour === 'major') { T.pgaWins++; st.status.winYears = (st.status.winYears || []).concat(E.year); st.status.sigUntil = E.year + 1; if (E.tour !== 'major' || true) st.status.cards.pga = Math.max(st.status.cards.pga || 0, E.year + 2); }
  if (E.tour === 'kft') T.kftWins++;
  if (E.tour === 'am' || E.tour === 'ncaa') T.amWins++;
  if (E.tour === 'junior') T.jrWins++;
  if (E.major) { T.majors++; T[E.id] = (T[E.id] || 0) + 1; if (E.id === 'masters') T.masters = (T.masters || 0) + 1; }
  st.titles.push({ y: E.year, w: E.w, id: E.id, name: E.name, tier: E.tier, tour: E.tour });
  st.trophies.push({ y: E.year, id: E.id, name: E.name, tier: E.tier, tour: E.tour, kind: trophyKind(E), score: rec.total, toPar: rec.toPar, course: E.courseName });
  // 業餘大賽冠軍 → 名人賽邀請（隔年 4 月，還是業餘才算）
  if (['usam', 'amateur', 'aac'].includes(E.id)) { st.amMajorWin = E.year; st.status.invites.push({ ev: 'masters', y: E.year + 1, am: true }); if (E.id !== 'aac') { st.status.invites.push({ ev: 'usopen', y: E.year + 1, am: true }); st.status.invites.push({ ev: 'open', y: E.year + 1, am: true }); } }
  if (E.id === 'valero') st.status.invites.push({ ev: 'masters', y: E.year });
}
export function trophyKind(E) {
  if (E.id === 'masters') return 'jacket';
  if (E.id === 'open') return 'jug';
  if (E.id === 'pgachamp') return 'wanamaker';
  if (E.id === 'usopen') return 'usopen';
  if (E.id === 'players') return 'players';
  if (E.id === 'tourchamp') return 'fedex';
  if (E.tour === 'team') return 'teamcup';
  if (E.tour === 'olympic') return 'medal';
  if (E.tour === 'junior' || E.tour === 'kids') return 'kidcup';
  if (E.tour === 'am' || E.tour === 'ncaa') return 'amcup';
  return E.tour === 'pga' ? 'silver' : 'plate';
}

// ---------- 年底 ----------
export function yearEnd(st, log) {
  const y = st.year, p = st.player, W = st.world;
  // 季末積分排名
  const S = (W.season[y] = W.season[y] || {}), mine = st.season[y] || {};
  const ranks = {}, stand = {};
  for (const tour of ['pga', 'kft', 'pta', 'dp', 'asia', 'jp', 'tpga']) {
    const list = Object.entries(S[tour] || {}).map(([id, pts]) => ({ id, pts }));
    if (mine[tour] != null) list.push({ id: ME, pts: mine[tour] });
    list.sort((a, b) => b.pts - a.pts);
    stand[tour] = list.filter(x => x.id !== ME);
    const i = list.findIndex(x => x.id === ME);
    if (i >= 0) ranks[tour] = i + 1;
  }
  st.lastRanks = ranks;
  st.prevFedex = ranks.pga || 999;
  if (!st.retired) for (const t of seasonEndCards(st, y, ranks)) { log.push(t); addNews(st, t); }      // 退休了就不再算巡迴卡
  promote(W, stand);
  stageAdvance(st, y, log);
  // 年度獎項
  awards(st, y, ranks, log);
  // 長大：自然成長（天賦影響）
  const g = yearlyGrowth(p.age);
  for (const k in g) {
    const mul = g[k] > 0 && p.talents.includes('long') && k === 'power' ? 1.15 : 1;
    const slow = g[k] < 0 && st.team.staff.includes('fitness') ? 0.6 : 1;
    p.stats[k] = clamp(p.stats[k] + g[k] * mul * slow, 1, capOf(p, k));
  }
  // 世界的老化、退休、新人
  ageWorld(W, y + 1, st.seed);
  peersTurnPro(W, y + 1);
  // 國家代表隊（青少年、業餘）：國內排名前 6
  if (st.status.amateur && (st.status.stage === 'junior' || st.status.stage === 'college')) {
    amRanks(st);
    if (st.jrRank <= 6 || (st.status.stage === 'college' && st.wagr <= 80)) { if (!(st.status.natTeam >= y)) queueMain(st, 'national'); st.status.natTeam = y + 1; }
    if (st.status.stage === 'junior' && p.age >= 15 && st.wjr <= 24) st.status.jteam = y + 1;
    if (st.status.stage === 'college' && st.wagr <= 40) st.status.palmer = y + 1;
  }
  // 季末的名人賽邀請（12 月檢查）
  if (!st.status.amateur || st.amMajorWin === y) {
    st.rankDec = st.rankNow || 9999;
    const el = majorEligibility(st, { id: 'masters', year: y + 1, w: 15 });
    if (el.ok && !st.story.flags['inv' + (y + 1)]) { st.story.flags['inv' + (y + 1)] = 1; st.inbox.unshift({ y, kind: 'masters', y2: y + 1, why: el.why }); queueMain(st, 'invite'); }
  }
  // 清掉兩年前的季資料（省存檔空間）
  delete W.season[y - 2]; delete st.season[y - 3];
  st.money.season = { prize: 0, spon: 0, other: 0, cost: 0, tax: 0 };
  // 贊助合約到期
  st.sponsors = st.sponsors.filter(sp => sp.until > y);
  log.push(`${y} 年結束`);
}
// 階段的轉換：大學升級 / 畢業（PGA TOUR University）、拿到 PGA TOUR 卡進入第五章、主要巡迴
function stageAdvance(st, y, log) {
  const s = st.status;
  if (s.stage === 'college' && s.college) {
    s.college.year++;
    if (s.college.year > 4) {
      if (s.college.type === 'ncaa') {
        const w = st.wagr || 999, rank = w <= 3 ? 1 : w <= 30 ? 2 + Math.floor((w - 4) / 3) : w <= 90 ? 11 + Math.floor((w - 31) / 4) : 99;
        st.pgaU = rank;
        if (rank === 1) s.cards.pga = y + 1; else if (rank <= 10) s.cards.kft = y + 1; else if (rank <= 25) s.cards.pta = y + 1;
        log.push(rank <= 25 ? `PGA TOUR University 第 ${rank} 名：拿到 ${rank === 1 ? 'PGA TOUR' : rank <= 10 ? 'Korn Ferry Tour' : 'PGA TOUR Americas'} 資格` : 'PGA TOUR University 沒有進前 25 名：要走資格賽');
        queueMain(st, 'pga_u');
      }
      turnProCore(st, '大學畢業，轉職業');
    }
  }
  if (!s.amateur && (s.cards.pga || 0) > y && s.stage !== 'tour' && s.stage !== 'retired') { s.stage = 'tour'; if (!s.rookieYear) s.rookieYear = y + 1; addTimeline(st, `${y + 1} 年 PGA TOUR 新人`); }
  // 主要巡迴：下一年手上最高等級的卡
  const order = ['pga', 'kft', 'dp', 'asia', 'jp', 'pta', 'tpga'];
  const best = order.find(t => (s.cards[t] || 0) > y);
  if (!s.amateur) { const before = s.mainTour; s.mainTour = best || s.mainTour; if (best && !s.firstCardTour) { s.firstCardTour = best; queueMain(st, 'first_card'); } if (best === 'pga' && before !== 'pga') queueMain(st, 'pga_card'); }
}
// 轉職業（第三章結束、或第二章直接轉）
export function turnProCore(st, why) {
  const s = st.status;
  if (!s.amateur) return;
  s.amateur = false; s.stage = 'road'; st.player.pro = true;
  if (s.college) { s.collegeDone = { ...s.college }; s.college = null; }
  s.mainTour = s.mainTour || (st.player.country === 'TPE' ? 'tpga' : st.player.country === 'JPN' ? 'jp' : st.player.country === 'USA' || st.player.country === 'CAN' ? 'pta' : 'asia');
  // 業餘的名人賽 / 大賽邀請轉職業後就失效
  s.invites = (s.invites || []).filter(i => !i.am);
  addTimeline(st, why || '轉職業');
  queueMain(st, 'turn_pro');
  addNews(st, `${st.player.name} 宣布轉為職業選手`);
}

function awards(st, y, ranks, log) {
  if (!st.player.pro) return;
  const wins = st.titles.filter(t => t.y === y && (t.tour === 'pga' || t.tour === 'major'));
  if (ranks.pga === 1 || (wins.length >= 3 && wins.some(t => t.tour === 'major'))) { st.tally.poy = (st.tally.poy || 0) + 1; addTimeline(st, `${y} 年度最佳球員`); log.push('年度最佳球員！'); st.cnt.poy = (st.cnt.poy || 0) + 1; }
  if (st.status.rookieYear === y && (ranks.pga || 999) <= 40) { st.tally.rookie = y; queueMain(st, 'rookie_year'); addTimeline(st, `${y} 年度最佳新人（Arnold Palmer Award）`); }
}
// 主線事件排進佇列（下一次回到生涯首頁時顯示）
export function queueMain(st, id) { if (!st.story.done[id] && !st.story.queue.includes(id)) st.story.queue.push(id); }

// ---------- 背景：玩家 8~12 歲期間的世界（童年一次跳過整年）----------
export function yearWorld(st, y) {
  const save = { year: st.year, week: st.week };
  st.year = y;
  for (let w = (y === START_YEAR ? 15 : 1); w <= 52; w++) { st.week = w; worldWeek(st); }
  ageWorld(st.world, y + 1, st.seed); peersTurnPro(st.world, y + 1);
  Object.assign(st, save);
}
