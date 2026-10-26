// 後端呼叫：有 GAS 網址就打 GAS，沒有就用瀏覽器本機模擬（同一套動作）
import { gasUrl, ADMIN_USER } from './config.js';
import { START_POINTS, START_RESPECS } from './stats.js';

export const session = { user: null, pass: null, isAdmin: false, profile: null };

export async function call(action, payload = {}) {
  const body = { action, user: session.user, pass: session.pass, ...payload };
  const url = gasUrl();
  if (!url) return local(body);
  let res;
  // 90 秒沒回應就放棄（不然按鈕會一直停在等待中）
  const ac = new AbortController(), timer = setTimeout(() => ac.abort(), 90000);
  try {
    // text/plain 避免 CORS 預檢，GAS 才收得到
    res = await fetch(url, { method: 'POST', body: JSON.stringify(body), redirect: 'follow', signal: ac.signal });
  } catch (e) {
    throw new Error(e.name === 'AbortError' ? '伺服器太久沒有回應，請稍後再試一次' : '連不到伺服器，請檢查網路或 GAS 網址');
  } finally { clearTimeout(timer); }
  const j = await res.json().catch(() => ({ ok: false, error: '伺服器回應格式錯誤' }));
  // 伺服器回「未知動作」= 試算表的 Apps Script 還是舊版程式，沒有這個功能
  if (!j.ok && /^未知動作/.test(j.error || '')) throw new Error(`伺服器的程式是舊版（沒有「${action}」功能）。請把 gas/Code.gs 整份貼到 Apps Script，然後按「部署 → 管理部署作業 → 編輯（鉛筆）→ 版本選『新版本』→ 部署」。不要用「新增部署作業」，那會產生新網址。`);
  if (!j.ok) throw new Error(j.error || '發生錯誤');
  return j.data;
}

export const isLocalMode = () => !gasUrl();

// ---------------- 讀取型資料的快取（排行、回合紀錄、實際下場）----------------
// 先顯示上次讀到的資料（記憶體 → 手機裡的備份），同時在背景向伺服器要新的；同一個動作同時只會有一個請求
const memo = {}, inflight = {};
const ckey = a => `dixen.cache.${session.user || ''}.${a}`;
export function peek(action) {
  const k = ckey(action);
  if (memo[k]) return memo[k];
  try { const v = JSON.parse(localStorage.getItem(k)); if (v) memo[k] = v; return v; } catch (e) { return null; }
}
export function refresh(action) {
  const k = ckey(action);
  if (!inflight[k]) inflight[k] = call(action).then(d => {
    memo[k] = d;
    try { localStorage.setItem(k, JSON.stringify(d)); } catch (e) { /* 太大存不下（排行很多場）就只留在記憶體 */ }
    return d;
  }).finally(() => { delete inflight[k]; });
  return inflight[k];
}
// 改了資料（存回合、改實際下場紀錄）後：直接換成新的清單，或在背景重新讀
export function setCache(action, data) { const k = ckey(action); memo[k] = data; try { localStorage.setItem(k, JSON.stringify(data)); } catch (e) { /* 存不下就算了 */ } }
export function prefetch(actions) { for (const a of actions) refresh(a).catch(() => {}); }

// ---------------- 本機模式 ----------------
const DBK = 'dixen.localdb';
function db() {
  let d;
  try { d = JSON.parse(localStorage.getItem(DBK)); } catch (e) { d = null; }
  if (!d) d = { accounts: [{ user: ADMIN_USER, pass: '1220', active: true }], profiles: {}, rounds: {}, rooms: {}, msgs: {} };
  return d;
}
function save(d) { localStorage.setItem(DBK, JSON.stringify(d)); }
const CDBK = 'dixen.localcustom';
function cdb() { try { return JSON.parse(localStorage.getItem(CDBK)) || []; } catch (e) { return []; } }
function csave(c) {
  try { localStorage.setItem(CDBK, JSON.stringify(c)); }
  catch (e) { throw new Error('本機測試模式的瀏覽器儲存空間滿了（正式版存在 Google 試算表，沒有這個限制）'); }
}
function prof(d, u) {
  if (!d.profiles[u]) d.profiles[u] = { user: u, points: START_POINTS, respecs: START_RESPECS, stats: {}, look: {}, rounds: 0, best: null, spent: 0, earned: START_POINTS };
  const p = d.profiles[u];
  p.prog = p.prog || {}; p.chal = p.chal || {};
  return p;
}
function auth(d, b) {
  const a = d.accounts.find(x => x.user === b.user);
  if (!a || a.pass !== String(b.pass)) throw new Error('帳號或密碼錯誤');
  if (!a.active) throw new Error('帳號尚未啟用，請等待管理員核准');
  return a;
}
function admin(d, b) { const a = auth(d, b); if (a.user !== ADMIN_USER) throw new Error('需要管理員權限'); }

async function local(b) {
  await new Promise(r => setTimeout(r, 60));
  const d = db();
  const out = (() => {
    switch (b.action) {
      case 'ping': return 'pong';
      case 'register': {
        const u = String(b.user || '').trim();
        if (!/^[A-Za-z0-9_\-一-鿿]{2,20}$/.test(u)) throw new Error('帳號限 2~20 字（中英數字、_ -）');
        if (d.accounts.some(a => a.user.toLowerCase() === u.toLowerCase())) throw new Error('帳號已存在');
        if (!b.pass) throw new Error('請輸入密碼');
        d.accounts.push({ user: u, pass: String(b.pass), active: u === ADMIN_USER });
        prof(d, u);
        return { user: u };
      }
      case 'login': { const a = auth(d, b); return { user: a.user, isAdmin: a.user === ADMIN_USER, profile: prof(d, a.user) }; }
      case 'getProfile': auth(d, b); return prof(d, b.user);
      case 'saveProfile': {
        auth(d, b);
        const cur = prof(d, b.user), p = b.profile;
        const respecs = Math.max(0, Math.min(cur.respecs, p.respecs));
        const cap = respecs < cur.respecs ? cur.earned : cur.points;
        Object.assign(cur, { stats: p.stats, look: p.look, respecs, points: Math.max(0, Math.min(cap, p.points)), spent: p.spent });
        return cur;
      }
      case 'saveRound': {
        auth(d, b);
        const r = b.round, cur = prof(d, b.user);
        const date = new Date().toISOString();
        (d.rounds[b.user] = d.rounds[b.user] || []).push({ ...r, date });
        // 排行（跟 GAS 的「排行」工作頁同一個格式）
        (d.rankings = d.rankings || []).push({ date, user: b.user, course: r.course, courseId: r.courseId, holes: r.holes,
          range: r.range === 'front' ? '前 9 洞' : r.range === 'back' ? '後 9 洞' : '18 洞', tee: r.tee, strokes: r.strokes, par: r.par, toPar: r.toPar, mode: r.mode, events: r.events || [], rankable: r.rankable !== false, mulligans: Number(r.mulligans) || 0 });
        const earned = Math.floor(r.holes / 9);
        cur.rounds++; cur.points += earned; cur.earned += earned;
        // 最佳 18 洞只算一般長度的球場（三桿洞球場 Par 54 不算）
        if (r.holes === 18 && r.blackTee === true && !(Number(r.mulligans) > 0) && r.rankable !== false && !(r.par < 66) && (!cur.best || r.strokes < cur.best)) cur.best = r.strokes;      // 只算黑梯
        return { earned, profile: cur };
      }
      case 'saveProgress': {
        // 跟 GAS 的 saveProgress 同樣的合併規則
        auth(d, b);
        const cur = prof(d, b.user), before = Object.assign({}, (cur.prog.ach || {}));
        cur.prog = mergeProg(cur.prog, b.prog || {});
        cur.chal = mergeChal(cur.chal, b.chal || {});
        let add = 0;
        for (const id of Object.keys(cur.prog.ach)) if (!before[id]) add += Math.max(0, Math.min(3, Number((b.points || {})[id]) || 0));
        cur.points += add; cur.earned += add;
        if (b.chal) {
          const far = Object.keys(cur.chal.stars).reduce((m, k) => cur.chal.stars[k] > 0 ? Math.max(m, Number(k.replace(/\D/g, '')) || 0) : m, 0);
          d.starRank = d.starRank || {};
          d.starRank[b.user] = { user: b.user, stars: cur.chal.total, level: far, date: new Date().toISOString() };
        }
        return { added: add, profile: cur };
      }
      case 'getStarRanking': auth(d, b); return Object.values(d.starRank || {});
      case 'getRounds': auth(d, b); return (d.rounds[b.user] || []).slice(-3000).reverse();      // 全部（個人紀錄要算生涯統計）
      case 'getRankings': auth(d, b); return (d.rankings || []).slice(-5000);
      case 'listAccounts': admin(d, b); return d.accounts.map(a => ({ ...a, ...pick(prof(d, a.user)) }));
      case 'setActive': {
        admin(d, b);
        if (b.target === ADMIN_USER) throw new Error('管理員帳號不能停用');
        d.accounts.find(a => a.user === b.target).active = !!b.value;
        return true;
      }
      case 'grantPoints': { admin(d, b); const p = prof(d, b.target); p.points = Math.max(0, p.points + b.amount); if (b.amount > 0) p.earned += b.amount; return p; }
      case 'grantRespecs': { admin(d, b); const p = prof(d, b.target); p.respecs = Math.max(0, p.respecs + b.amount); return p; }
      // 遊戲間：本機模式下只能在同一台電腦的兩個分頁之間測試
      case 'createRoom': {
        auth(d, b);
        const code = String(Math.floor(100000 + Math.random() * 900000));
        d.rooms[code] = { code, host: b.user, offer: b.offer || null, answer: null, guest: null, config: b.config || null };
        d.msgs[code] = [];
        return d.rooms[code];
      }
      case 'getRoom': { auth(d, b); const r = d.rooms[b.code]; if (!r) throw new Error('驗證碼錯誤或遊戲間已關閉'); return r; }
      case 'joinRoom': {
        auth(d, b);
        const r = d.rooms[b.code];
        if (!r) throw new Error('驗證碼錯誤或遊戲間已關閉');
        if (r.guest && r.guest !== b.user) throw new Error('遊戲間已滿');
        r.guest = b.user; if (b.answer) r.answer = b.answer;
        return r;
      }
      case 'updateRoom': { auth(d, b); const r = d.rooms[b.code]; if (!r) throw new Error('遊戲間已關閉'); ['offer', 'answer', 'config'].forEach(k => { if (b[k] !== undefined) r[k] = b[k]; }); return r; }
      case 'sendMsg': {
        auth(d, b);
        const l = d.msgs[b.code]; if (!l) throw new Error('遊戲間已關閉');
        const seq = l.length ? l[l.length - 1].seq + 1 : 1;
        l.push({ seq, from: b.user, msg: b.msg });
        while (l.length > 40) l.shift();
        return seq;
      }
      case 'getMsgs': { auth(d, b); const l = d.msgs[b.code]; if (!l) throw new Error('遊戲間已關閉'); return l.filter(m => m.seq > (b.since || 0) && m.from !== b.user); }
      case 'closeRoom': delete d.rooms[b.code]; delete d.msgs[b.code]; return true;
      // 自製球場（本機模式另外存一份，不跟帳號資料擠在一起）
      case 'customList': {
        const a = auth(d, b), cs = cdb();
        const pick = k => cs.filter(r => r.kind === k).map(r => ({ id: r.id, name: r.name, updated: r.updated, meta: r.meta }));
        const out = { courses: pick('course'), overrides: pick('override').map(r => ({ id: r.id, updated: r.updated })) };
        if (a.user === ADMIN_USER) out.drafts = pick('draft');
        return out;
      }
      case 'customGet': {
        auth(d, b);
        const r = cdb().find(x => x.kind === b.kind && x.id === b.id);
        if (!r) throw new Error('找不到這筆自製資料');
        return r;
      }
      case 'customSave': {
        admin(d, b);
        const cs = cdb(), now = new Date().toISOString();
        const rec = { kind: b.kind, id: String(b.id), name: String(b.name || ''), updated: now, meta: b.meta || {}, data: typeof b.data === 'string' ? JSON.parse(b.data) : b.data };
        const i = cs.findIndex(x => x.kind === b.kind && x.id === rec.id);
        if (i >= 0) cs[i] = rec; else cs.push(rec);
        csave(cs);
        return { id: rec.id, updated: now };
      }
      case 'customDelete': { admin(d, b); csave(cdb().filter(x => !(x.kind === b.kind && x.id === String(b.id)))); return true; }
      // 實際下場紀錄（現實世界的回合）：每個帳號一份清單，用 id 新增 / 更新 / 刪除
      case 'realList': { const a = auth(d, b); return ((d.real || {})[a.user] || []).slice().sort((x, y) => String(y.date).localeCompare(String(x.date)) || String(y.updated).localeCompare(String(x.updated))); }
      case 'realSave': {
        const a = auth(d, b), rec = { ...(b.rec || {}), id: String((b.rec || {}).id || Date.now().toString(36)), updated: new Date().toISOString() };
        d.real = d.real || {}; const l = d.real[a.user] = d.real[a.user] || [];
        const i = l.findIndex(x => x.id === rec.id); if (i >= 0) l[i] = rec; else l.push(rec);
        return rec;
      }
      case 'realDelete': { const a = auth(d, b); d.real = d.real || {}; d.real[a.user] = (d.real[a.user] || []).filter(x => x.id !== String(b.id)); return true; }
      default: throw new Error('未知動作');
    }
  })();
  save(d);
  return JSON.parse(JSON.stringify(out));
}
const pick = p => ({ points: p.points, respecs: p.respecs, rounds: p.rounds });
function mergeProg(a, b) {
  const o = { ach: { ...(a.ach || {}) }, cnt: { ...(a.cnt || {}) }, stamps: { ...(a.stamps || {}) } };
  for (const k in b.ach || {}) if (!o.ach[k]) o.ach[k] = b.ach[k];
  for (const k in b.cnt || {}) o.cnt[k] = Math.max(Number(o.cnt[k]) || 0, Number(b.cnt[k]) || 0);
  for (const k in b.stamps || {}) {
    const x = o.stamps[k], y = b.stamps[k];
    if (!x) { o.stamps[k] = y; continue; }
    const best = Math.min(Number(x.best) || 999, Number(y.best) || 999), nineN = { ...(x.nineN || {}) };
    for (const q in y.nineN || {}) nineN[q] = Math.max(Number(nineN[q]) || 0, Number(y.nineN[q]) || 0);
    o.stamps[k] = { date: x.date || y.date, n: Math.max(Number(x.n) || 0, Number(y.n) || 0), nines: { ...(y.nines || {}), ...(x.nines || {}) }, nineN };
    if (best < 999) o.stamps[k].best = best;
  }
  return o;
}
function mergeChal(a, b) {
  const o = { stars: { ...(a.stars || {}) }, best: { ...(a.best || {}) } };
  for (const k in b.stars || {}) o.stars[k] = Math.max(Number(o.stars[k]) || 0, Math.min(3, Number(b.stars[k]) || 0));
  for (const k in b.best || {}) o.best[k] = o.best[k] ? Math.min(o.best[k], b.best[k]) : b.best[k];
  o.total = Object.values(o.stars).reduce((s, v) => s + v, 0);
  o.owned = [...new Set([...(a.owned || []), ...(b.owned || [])])];
  o.spent = Math.min(o.total, Math.max(Number(a.spent) || 0, Number(b.spent) || 0));
  return o;
}
