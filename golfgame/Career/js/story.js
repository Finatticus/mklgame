// 劇情的觸發：主線事件、隨機事件（每週約 22%）、事件效果、記者會、宿敵
import { clamp, seeded, hash } from './util.js';
import { MAIN, RANDOM, eventsFor, PRESS, MENUS, NEWS } from './data/story.js';
import { addNews, addTimeline, queueMain, fill, earn, spend } from './life.js';
import { train, addXp, STAT_KEYS, capOf } from './growth.js';
import { findP, nameOf, peerRating, rankList, ABS, ME } from './world.js';
import { MASTERS_PAST, teamSide } from './data/players.js';

export { queueMain };
export const FAMILY_WHO = { grandpa: '爺爺', tv: '媽媽', minigolf: '爸爸' };
export const MENTOR_NAME = { grandpa: '爺爺', tv: '兒童班的李教練', minigolf: '場主阿伯' };

// 文字裡的代稱
export function vars(st, extra = {}) {
  const W = st.world, fr = findP(W, st.story.friend), rv = st.story.rival ? findP(W, st.story.rival) : fr;
  return {
    name: st.player.name, home: st.player.home || '家鄉', friend: fr ? nameOf(fr) : '童年玩伴', rival: rv ? nameOf(rv) : '宿敵',
    mentor: MENTOR_NAME[st.player.origin] || '啟蒙導師', family_who: FAMILY_WHO[st.player.origin] || '媽媽', caddie: st.team.caddie ? st.team.caddie.name : '桿弟',
    fed: '', champ: st.story.prologueChamp || '冠軍', ...extra,
  };
}
export const text = (st, t, extra) => fill(t, vars(st, extra));

// ---------- 效果 ----------
export function applyFx(st, fx = {}, log = []) {
  const p = st.player;
  if (fx.mood) p.mood = clamp(p.mood + fx.mood, 0, 100);
  if (fx.energy) p.energy = clamp(p.energy + fx.energy, 0, 100);
  if (fx.form) p.form = clamp(p.form + fx.form, -3, 3);
  if (fx.money) { if (fx.money > 0) earn(st, fx.money, '事件', 'other'); else spend(st, -fx.money, '事件'); }
  if (fx.fame) p.fame += fx.fame;
  if (fx.fol) p.followers += fx.fol;
  if (fx.grade && st.school) st.school.grade = clamp((st.school.grade || 60) + fx.grade, 0, 100);
  if (fx.xp) addXp(p, fx.xp);
  if (fx.rel) for (const k in fx.rel) st.rel[k] = clamp((st.rel[k] ?? 50) + fx.rel[k], 0, 100);
  if (fx.train) for (const k in fx.train) train(p, k, fx.train[k]);
  if (fx.stat) for (const k in fx.stat) p.stats[k] = clamp(p.stats[k] + fx.stat[k], 1, capOf(p, k));
  if (fx.pers) for (const k in fx.pers) p.pers[k] = (p.pers[k] || 0) + fx.pers[k];
  if (fx.injury && st.opt.injuries && seeded(st, 'inj', st.year, st.week)() < fx.injury) { p.injury = 2; log.push('受傷了：休息 2 週'); }
  if (fx.flag) st.story.flags[fx.flag] = st.year;
  if (fx.skipEvent) st.story.flags.skipWeek = st.year * 100 + st.week;
  return log;
}
export const personality = p => { const v = p.pers || {}; const k = ['gent', 'conf', 'humor'].sort((a, b) => (v[b] || 0) - (v[a] || 0))[0]; return (v[k] || 0) >= 3 ? { gent: '紳士', conf: '自信', humor: '幽默' }[k] : '尚未定型'; };

// ---------- 主線事件的觸發（每週結束、比賽結束時檢查）----------
export function checkMain(st) {
  const p = st.player, s = st.status, a = p.age, w = st.week;
  const q = id => queueMain(st, id);
  if (s.stage === 'junior') {
    if (a === 13 && !st.story.done.ch2_start) q('ch2_start');
    if (a >= 14 && w >= 30 && !st.story.done.first_set) q('first_set');
    if (a >= 15 && !st.story.done.social) q('social');
    if (a >= 17 && w >= 40) q('style');
    if (a >= 17 && w >= 47 && st.story.done.style) q('crossroads');
  }
  if (s.stage === 'college' && !st.story.done.ch3_start) q('ch3_start');
  if (s.stage === 'road' && !st.story.done.ch4_start) q('ch4_start');
  if (s.stage === 'road' && !st.team.agent && st.story.done.ch4_start) q('agent');
  if (s.stage === 'road' && !st.base && st.story.done.agent) q('base');
  if (!s.amateur && !st.team.caddie && st.story.done.base) q('first_caddie');
  if (s.stage === 'tour' && !st.story.done.ch5_start) { q('ch5_start'); }
  if (s.stage === 'tour' && st.story.done.ch5_start && !st.story.done.rival2) { pickRival2(st); q('rival2'); }
  if (st.chapter >= 6 && !st.story.done.ch6_start) q('ch6_start');
  if (st.chapter >= 6 && st.story.done.ch6_start && !st.story.done.rival3 && st.year > (st.story.ch6y || 0)) { pickRival3(st); q('rival3'); }
}
function pickRival2(st) {
  const W = st.world, y = st.year;
  const cand = W.players.filter(p => !p.ret && p.tour === 'pga' && Math.abs((y - p.by) - st.player.age) <= 2 && p.id !== st.story.friend).sort((a, b) => b.r - a.r);
  const fr = findP(W, st.story.friend);
  st.story.rival = (fr && fr.tour === 'pga' && !fr.ret) ? fr.id : (cand[0] ? cand[0].id : st.story.friend);
  st.story.rivals.push(st.story.rival);
}
function pickRival3(st) {
  const top = rankList(st.world, null, ABS(st.year, st.week))[0];
  if (top) { st.story.rival = top.p.id; st.story.rivals.push(top.p.id); }
  st.story.ch6y = st.year;
}
// 宿敵的素質跟著你成長：永遠在你附近
export function rivalKeepUp(st, myR) {
  const W = st.world;
  for (const id of new Set([st.story.friend, ...(st.story.rivals || [])])) {
    const r = findP(W, id);
    if (!r) continue;
    if (r.am !== false && r.pot != null && st.status.amateur) { r.pot = Math.max(r.pot, Math.min(95, myR / Math.max(0.4, peerRatioAge(st.player.age)) + 1)); }
    else if (r.r != null && !r.ret) r.r = clamp(Math.max(r.r, myR - 2.5), 40, 97);
  }
}
const peerRatioAge = a => (a <= 12 ? 0.42 : a <= 17 ? 0.42 + (a - 12) * 0.048 : a <= 21 ? 0.66 + (a - 17) * 0.04 : 0.82 + Math.min(5, a - 21) * 0.026);
// 宿敵的對戰紀錄
export function rivalRecord(st, rows) {
  const rv = st.story.rival || st.story.friend;
  const me = rows.find(x => x.id === ME), r = rows.find(x => x.id === rv);
  if (!me || !r) return null;
  const rec = st.story.h2h = st.story.h2h || {};
  const k = rec[rv] = rec[rv] || { w: 0, l: 0 };
  const a = me.cut ? 9999 : me.total, b = r.cut ? 9999 : r.total;
  if (a < b) k.w++; else if (b < a) k.l++;
  return k;
}

// ---------- 隨機事件 ----------
export function rollRandom(st) {
  const p = st.player, s = st.status.stage, r = seeded(st, 'rnd', st.year, st.week);
  const stage = s === 'child' ? null : s === 'road' ? 'road' : s === 'tour' ? (st.chapter >= 8 ? 'legend' : 'tour') : s;
  if (!stage || r() > 0.22) return null;
  const done = st.story.rdone = st.story.rdone || {};
  const pool = eventsFor(stage).filter(e => {
    if (e.age && (p.age < e.age[0] || p.age > e.age[1])) return false;
    if (e.holiday && !(st.week >= 27 && st.week <= 35)) return false;
    if (e.cashBelow && st.money.cash >= e.cashBelow) return false;
    if (e.cashAbove && st.money.cash < e.cashAbove) return false;
    if (e.grade && (!st.school || st.school.grade < e.grade)) return false;
    return (done[e.id] || 0) < 2 && st.year - (st.story.rlast?.[e.id] || 0) >= 2;
  });
  if (!pool.length) return null;
  const e = pool[Math.floor(r() * pool.length)];
  return e;
}
export function resolveRandom(st, e, i) {
  const c = e.choices[i];
  st.story.rdone = st.story.rdone || {}; st.story.rlast = st.story.rlast || {};
  st.story.rdone[e.id] = (st.story.rdone[e.id] || 0) + 1; st.story.rlast[e.id] = st.year;
  const log = applyFx(st, c[1]);
  return { text: text(st, c[2]), log };
}

// ---------- 記者會 ----------
export function pressFor(st, kind) {
  const list = PRESS.filter(q => q.when === kind);
  if (!list.length) return null;
  return list[hash(st.seed + st.year + st.week + kind) % list.length];
}
export function answerPress(st, q, i) {
  const [k] = q.a[i];
  st.player.pers[k] = (st.player.pers[k] || 0) + 1;
  st.player.fame += 300;
  return k;
}

// 名人賽的冠軍晚宴菜單（依國籍）
export const menuFor = c => MENUS[c] || (teamSide(c) === 'eur' ? MENUS.EUR : MENUS.TPE);
export { MAIN };
