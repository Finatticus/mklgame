// 存檔：本機（每一桿、每一週）+ 伺服器（每一輪、每一週同步到「生涯_帳號」工作頁）
//   存檔有版本號（rev），只收比較新的：兩台手機不會互相覆蓋
//   3 個生涯欄位：slot 1~3
export const SAVE_V = 1;
let ctx = null, st = null, syncTimer = null, syncing = false, pendingSync = false;

export const bind = c => { ctx = c; };
export const cur = () => st;
import { registerDreams } from '../../js/dream.js';
// 換生涯欄位時，把這個生涯設計的夢想球場加進球場清單（比賽、邀請賽才找得到）
export const setCur = s => { st = s; if (s && s.designs && s.designs.length) registerDreams(s.designs, s.player.name); };
const key = (user, slot) => `dixen.career.${user}.${slot}`;

export function localLoad(user, slot) {
  try { const j = JSON.parse(localStorage.getItem(key(user, slot)) || 'null'); return j && j.v ? j : null; } catch (e) { return null; }
}
export function localSave(s = st) {
  if (!s) return;
  s.updated = Date.now();
  try { localStorage.setItem(key(s.user, s.slot), JSON.stringify(s)); }
  catch (e) {
    // 手機空間不夠：先把相簿的照片縮掉再試一次
    try { s.photos = (s.photos || []).slice(-12); localStorage.setItem(key(s.user, s.slot), JSON.stringify(s)); } catch (e2) { console.warn('生涯本機存檔失敗', e2); }
  }
}
export function localDelete(user, slot) { try { localStorage.removeItem(key(user, slot)); } catch (e) { /* 略過 */ } }

// 存檔摘要（伺服器的基本資料區塊、生涯欄位清單、大廳卡片的副標題）
export function summary(s) {
  const p = s.player;
  return {
    slot: s.slot, name: p.name, country: p.country, age: p.age, chapter: s.chapter, year: s.year, week: s.week, level: p.level,
    rank: s.rankNow || null, money: Math.round(s.money.cash), prize: Math.round(s.money.careerPrize), wins: s.tally.wins, majors: s.tally.majors,
    difficulty: s.opt.difficulty, title: s.title || '', rev: s.rev, retired: !!s.retired, updated: s.updated,
  };
}

// 伺服器同步：比賽一輪結束、每週結束時呼叫；連線失敗就等下一次
export function sync(now = false) {
  if (!st || !ctx) return Promise.resolve();
  st.rev = (st.rev || 0) + 1;
  localSave();
  clearTimeout(syncTimer);
  return new Promise(res => {
    syncTimer = setTimeout(async () => {
      if (syncing) { pendingSync = true; return res(); }
      syncing = true;
      try {
        await ctx.call('cmSave', { slot: st.slot, rev: st.rev, data: JSON.stringify(st), summary: summary(st) });
        st.syncedRev = st.rev; st.syncErr = null;
      } catch (e) { st.syncErr = e.message; console.warn('生涯同步失敗（稍後再試）', e); }
      syncing = false;
      if (pendingSync) { pendingSync = false; sync(); }
      res();
    }, now ? 0 : 2500);
  });
}

// 讀檔：本機與伺服器比較，用版本比較新的那一份
export async function load(user, slot) {
  const loc = localLoad(user, slot);
  let srv = null;
  try { const r = await ctx.call('cmLoad', { slot }); if (r && r.data) srv = JSON.parse(r.data); } catch (e) { console.warn('讀取伺服器的生涯存檔失敗，用手機裡的', e); }
  const pick = !srv ? loc : !loc ? srv : (srv.rev || 0) > (loc.rev || 0) ? srv : loc;
  return pick ? migrate(pick) : null;
}
export async function listSlots(user) {
  const out = {};
  for (const s of [1, 2, 3]) { const l = localLoad(user, s); if (l) out[s] = summary(l); }
  try { const r = await ctx.call('cmList'); for (const x of r || []) if (!out[x.slot] || (x.rev || 0) > (out[x.slot].rev || 0)) out[x.slot] = x; } catch (e) { /* 離線：只顯示本機 */ }
  return out;
}
export async function removeSlot(user, slot) {
  localDelete(user, slot);
  try { await ctx.call('cmDelete', { slot }); } catch (e) { /* 伺服器下次再刪 */ }
}

// 舊版本的存檔：補上新欄位
export function migrate(s) {
  s.v = s.v || 1;
  s.tally = s.tally || { wins: 0, majors: 0, top10: 0, cuts: 0, events: 0 };
  s.story = s.story || { done: {}, flags: {}, queue: [] };
  s.news = s.news || []; s.inbox = s.inbox || []; s.photos = s.photos || []; s.timeline = s.timeline || [];
  s.ach = s.ach || {}; s.cnt = s.cnt || {}; s.corr = s.corr || [];
  s.gear = s.gear || { items: [], eq: {} };
  s.team = s.team || {}; s.rel = s.rel || {};
  return s;
}
