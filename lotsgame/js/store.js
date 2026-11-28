// 帳號、錢包、統計與離線同步。
// 所有資料先寫入 localStorage，有網路時把尚未上傳的事件送到 GAS。
import { GAS_URL, START_COINS, DAILY_BASE, DAILY_STEP, DAILY_MAX, RELIEF_THRESHOLD, RELIEF_AMOUNT, RELIEF_PER_DAY } from './config.js';

const K_SESSION = 'lots.session';
const userKey = (name) => 'lots.user.' + name.toLowerCase();
const listeners = new Set();
let data = null;          // 目前登入帳號的本機資料
let syncing = false;
let syncTimer = null;
export const syncState = { status: GAS_URL ? 'idle' : 'local', lastError: '' };

export const hasBackend = () => !!GAS_URL;
export const getData = () => data;
export const isLoggedIn = () => !!data;

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { for (const fn of listeners) { try { fn(data); } catch (e) { console.error(e); } } }

function persist() {
  if (!data) return;
  try { localStorage.setItem(userKey(data.user), JSON.stringify(data)); } catch (e) { /* 空間不足時略過 */ }
}
function save() { persist(); emit(); }

const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function deviceName() {
  const ua = navigator.userAgent;
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'macOS' : '其他';
  const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : '瀏覽器';
  return os + ' / ' + br;
}

const emptyBucket = () => ({ plays: 0, wins: 0, losses: 0, draws: 0, wagered: 0, net: 0, biggestWin: 0, biggestLoss: 0, curStreak: 0, bestStreak: 0 });
function emptyStats() {
  return { total: emptyBucket(), games: {}, days: [], peak: START_COINS, low: START_COINS, marks: {}, bonus: 0 };
}

function freshData(user, hash) {
  return {
    user, hash, createdAt: new Date().toISOString(), balance: START_COINS,
    holds: {}, saves: {}, pending: [], history: [], stats: emptyStats(),
    daily: { last: '', streak: 0 }, relief: { day: '', count: 0 },
    settings: { sound: true, confirmMove: true },
    localCreated: false, lastSync: '', conflict: false,
  };
}

function normalize(d) {
  const f = freshData(d.user, d.hash);
  const out = Object.assign(f, d);
  out.stats = Object.assign(emptyStats(), d.stats || {});
  out.stats.total = Object.assign(emptyBucket(), out.stats.total || {});
  out.settings = Object.assign({ sound: true, confirmMove: true }, d.settings || {});
  // 舊資料沒有進度時間：用這台裝置最後一筆紀錄的時間（最近玩過的裝置較新）
  if (!out.settingsAt) out.settingsAt = Date.parse((out.history[0] && out.history[0].t) || out.lastSync || out.createdAt) || 1;
  return out;
}

// ---------------------------------------------------------------------------
// 遊戲進度（各遊戲的 settings）跨裝置同步
// 上傳時去掉很大的資料（計時賽幽靈車）；下載時保留只屬於這台裝置的設定
const DEVICE_ONLY = { racer: ['control'] };
function slimSettings(st) {
  const out = JSON.parse(JSON.stringify(st || {}));
  if (out.racer && out.racer.trial) for (const k in out.racer.trial) if (out.racer.trial[k]) delete out.racer.trial[k].ghost;
  return out;
}
function mergeRemoteSettings(remote, local) {
  const out = JSON.parse(JSON.stringify(remote || {}));
  local = local || {};
  for (const g in DEVICE_ONLY) for (const k of DEVICE_ONLY[g]) if (local[g] && local[g][k] !== undefined) (out[g] || (out[g] = {}))[k] = local[g][k];
  // 幽靈車：同一個最佳圈速就沿用本機的錄影
  const rt = out.racer && out.racer.trial, lt = local.racer && local.racer.trial;
  if (rt && lt) for (const k in rt) if (rt[k] && lt[k] && lt[k].ghost && Math.abs((lt[k].best || 0) - (rt[k].best || 0)) < 1e-6) rt[k].ghost = lt[k].ghost;
  return out;
}
function adoptSettings(d, st) {
  if (!st || !st.settings || !st.settingsAt) return false;
  d.settings = Object.assign({ sound: true, confirmMove: true }, mergeRemoteSettings(st.settings, d.settings));
  d.settingsAt = st.settingsAt;
  return true;
}

export async function hashPassword(user, pass) {
  const text = user.toLowerCase() + '\u0000' + pass + '\u0000lots-game';
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function validateName(name) {
  if (!/^[A-Za-z0-9_一-鿿]{2,12}$/.test(name)) return '帳號需為 2–12 個字，可用中文、英文、數字與底線';
  return '';
}

async function call(payload, timeoutMs = 15000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST', body: JSON.stringify(payload), signal: ctl.signal,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow',
    });
    return await res.json();
  } finally { clearTimeout(t); }
}

// 啟動時還原登入狀態（除非自行登出，否則永遠保持登入）
export function restoreSession() {
  try {
    const s = JSON.parse(localStorage.getItem(K_SESSION) || 'null');
    if (!s) return false;
    const raw = localStorage.getItem(userKey(s.user));
    if (!raw) return false;
    data = normalize(JSON.parse(raw));
    return true;
  } catch (e) { return false; }
}

function openSession(d) {
  data = d;
  localStorage.setItem(K_SESSION, JSON.stringify({ user: d.user, at: Date.now() }));
  save();
  scheduleSync(300);
}

function loadLocal(user) {
  try { const raw = localStorage.getItem(userKey(user)); return raw ? normalize(JSON.parse(raw)) : null; } catch (e) { return null; }
}

function adoptServerProfile(local, user, hash, p) {
  const d = local || freshData(p.user || user, hash);
  d.user = p.user || user;
  d.hash = hash;
  d.createdAt = p.createdAt || d.createdAt;
  d.localCreated = false;
  d.conflict = false;
  // 雲端的遊戲進度比較新（或這台裝置沒有資料）就採用
  if (p.state && p.state.settings && (!local || (p.state.settingsAt || 0) > (d.settingsAt || 0))) adoptSettings(d, p.state);
  if (!local) {
    if (p.state && p.state.stats) d.stats = Object.assign(emptyStats(), p.state.stats);
    if (p.state && p.state.daily) d.daily = p.state.daily;
    if (p.state && p.state.relief) d.relief = p.state.relief;
    d.history = (p.recent || []).filter((e) => e.type !== 'lap').slice(0, 300);
  }
  applyServerBalance(d, p.balance);
  return d;
}

function applyServerBalance(d, serverBalance) {
  let pend = 0, held = 0;
  for (const e of d.pending) pend += e.delta;
  for (const k in d.holds) held += d.holds[k];
  d.balance = serverBalance + pend - held;
}

// 登入。回傳 { ok } | { needCreate } | { error }
export async function login(user, pass, { create = false } = {}) {
  const err = validateName(user);
  if (err) return { error: err };
  if (pass.length < 4) return { error: '密碼至少需要 4 個字元' };
  const hash = await hashPassword(user, pass);
  const local = loadLocal(user);

  if (hasBackend() && navigator.onLine) {
    try {
      const r = await call({ action: 'login', user, hash, create, device: deviceName() });
      if (r.ok) { openSession(adoptServerProfile(local && local.hash === hash ? local : null, user, hash, r.profile)); return { ok: true, created: !!r.created }; }
      if (r.code === 'NO_ACCOUNT') return { needCreate: true };
      if (r.code === 'BAD_PASSWORD') return { error: '密碼不正確' };
      return { error: r.message || '登入失敗，請稍後再試' };
    } catch (e) { /* 連不上後端 → 改用本機資料 */ }
  }

  if (local) {
    if (local.hash !== hash) return { error: '密碼不正確' };
    openSession(local);
    return { ok: true, offline: hasBackend() };
  }
  if (!create) return { needCreate: true, offline: hasBackend() };
  const d = freshData(user, hash);
  d.localCreated = true;
  openSession(d);
  return { ok: true, created: true, offline: hasBackend() };
}

export function logout() {
  persist();
  localStorage.removeItem(K_SESSION);
  data = null;
  emit();
}

// ---------------------------------------------------------------------------
// 錢包

function pushEvent(ev) {
  const e = Object.assign({ id: uid(), t: new Date().toISOString(), device: deviceName() }, ev, { balance: data.balance });
  data.pending.push(e);
  data.history.unshift(e);
  if (data.history.length > 300) data.history.length = 300;
  const st = data.stats;
  if (data.balance > st.peak) st.peak = data.balance;
  if (data.balance < st.low) st.low = data.balance;
  const day = today();
  if (st.days[st.days.length - 1] !== day) { st.days.push(day); if (st.days.length > 400) st.days.shift(); }
  save();
  scheduleSync(1500);
  return e;
}

export const balance = () => (data ? data.balance : 0);
export const heldAmount = (gameId) => (data && data.holds[gameId]) || 0;

// 開局時先扣住賭注（中途離開不會憑空拿回）
export function hold(gameId, amount) {
  if (amount <= 0 || amount > data.balance) return false;
  data.balance -= amount;
  data.holds[gameId] = (data.holds[gameId] || 0) + amount;
  save();
  return true;
}

// 結算：payout 為實際返還金額（含本金）。result: 'win' | 'lose' | 'draw'
export function settle(gameId, { gameName, mode = '', result, payout, note = '', marks = null }) {
  const held = data.holds[gameId] || 0;
  delete data.holds[gameId];
  delete data.saves[gameId];
  data.balance += payout;
  const delta = payout - held;
  const st = data.stats;
  const g = st.games[gameId] || (st.games[gameId] = Object.assign(emptyBucket(), { name: gameName }));
  g.name = gameName;
  for (const b of [st.total, g]) {
    b.plays++;
    b.wagered += held;
    b.net += delta;
    if (result === 'win') { b.wins++; b.curStreak = b.curStreak > 0 ? b.curStreak + 1 : 1; }
    else if (result === 'lose') { b.losses++; b.curStreak = b.curStreak < 0 ? b.curStreak - 1 : -1; }
    else { b.draws++; }
    if (b.curStreak > b.bestStreak) b.bestStreak = b.curStreak;
    if (delta > b.biggestWin) b.biggestWin = delta;
    if (delta < b.biggestLoss) b.biggestLoss = delta;
  }
  if (marks) for (const k in marks) st.marks[k] = (st.marks[k] || 0) + marks[k];
  const label = { win: '勝', lose: '負', draw: '和' }[result];
  return pushEvent({ type: 'game', gameId, game: gameName, mode, result: label, bet: held, delta, note });
}

// 對局資料遺失時把扣住的賭注原封退回（不計入紀錄）
export function release(gameId) {
  const held = data.holds[gameId] || 0;
  delete data.saves[gameId];
  if (!held) return;
  delete data.holds[gameId];
  data.balance += held;
  save();
}

export function saveGame(gameId, state) { data.saves[gameId] = state; persist(); }
export const loadGame = (gameId) => (data && data.saves[gameId]) || null;
export function clearGame(gameId) { delete data.saves[gameId]; persist(); }

export function setSetting(key, value) { data.settings[key] = value; data.settingsAt = Date.now(); save(); scheduleSync(4000); }

// 每日簽到
export function dailyInfo() {
  const d = data.daily, t = today();
  const y = new Date(Date.now() - 86400000);
  const yd = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
  const claimed = d.last === t;
  const streak = claimed ? d.streak : (d.last === yd ? d.streak + 1 : 1);
  return { claimed, streak, amount: Math.min(DAILY_MAX, DAILY_BASE + (streak - 1) * DAILY_STEP) };
}
export function claimDaily() {
  const info = dailyInfo();
  if (info.claimed) return null;
  data.daily = { last: today(), streak: info.streak };
  data.balance += info.amount;
  data.stats.bonus += info.amount;
  pushEvent({ type: 'bonus', game: '每日簽到', mode: '連續 ' + info.streak + ' 天', result: '領取', bet: 0, delta: info.amount, note: '' });
  return info;
}

// 補給金
export function reliefInfo() {
  const r = data.relief.day === today() ? data.relief : { day: today(), count: 0 };
  let held = 0;
  for (const k in data.holds) held += data.holds[k];
  return { available: data.balance < RELIEF_THRESHOLD && held === 0 && r.count < RELIEF_PER_DAY, left: RELIEF_PER_DAY - r.count, amount: RELIEF_AMOUNT };
}
export function claimRelief() {
  const info = reliefInfo();
  if (!info.available) return null;
  const r = data.relief.day === today() ? data.relief : { day: today(), count: 0 };
  data.relief = { day: r.day, count: r.count + 1 };
  data.balance += RELIEF_AMOUNT;
  data.stats.bonus += RELIEF_AMOUNT;
  pushEvent({ type: 'bonus', game: '補給金', mode: '', result: '領取', bet: 0, delta: RELIEF_AMOUNT, note: '餘額不足時的補助' });
  return info;
}

// ---------------------------------------------------------------------------
// 同步

export function scheduleSync(ms = 1500) {
  if (!hasBackend()) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(sync, ms);
}

export async function sync() {
  if (!hasBackend() || !data || syncing) return;
  if (!navigator.onLine) { syncState.status = 'offline'; emit(); return; }
  syncing = true;
  syncState.status = 'syncing';
  emit();
  const me = data;
  const sent = me.pending.slice(0, 200);
  try {
    const r = await call({
      action: 'sync', user: me.user, hash: me.hash, create: me.localCreated, createdAt: me.createdAt,
      device: deviceName(), events: sent,
      state: { stats: me.stats, daily: me.daily, relief: me.relief, settings: slimSettings(me.settings), settingsAt: me.settingsAt || 1 },
    }, 30000);
    if (data !== me) return;
    if (r.ok) {
      const ids = new Set(sent.map((e) => e.id));
      me.pending = me.pending.filter((e) => !ids.has(e.id));
      me.localCreated = false;
      me.conflict = false;
      applyServerBalance(me, r.balance);
      // 別的裝置有更新的進度：採用
      if (r.state && (r.state.settingsAt || 0) > (me.settingsAt || 0)) adoptSettings(me, r.state);
      me.lastSync = new Date().toISOString();
      syncState.status = 'ok';
      syncState.lastError = '';
      save();
      if (me.pending.length) scheduleSync(500);
    } else {
      syncState.status = 'error';
      syncState.lastError = r.code === 'BAD_PASSWORD' ? '這個帳號名稱已在雲端被使用（密碼不同），目前資料只保存在本機。' : (r.message || '同步失敗');
      if (r.code === 'BAD_PASSWORD') { me.conflict = true; persist(); }
      emit();
    }
  } catch (e) {
    syncState.status = navigator.onLine ? 'error' : 'offline';
    syncState.lastError = '暫時連不上伺服器，稍後會自動重試';
    emit();
  } finally { syncing = false; }
}

// 賽車圈速：只排入同步佇列（不列入對局紀錄），由後端維護「賽車排行」
export function queueLap({ track, trackName, car, ms }) {
  if (!data) return;
  data.pending.push({ id: uid(), t: new Date().toISOString(), device: deviceName(), type: 'lap', game: '極速山道', mode: trackName, result: '圈速', bet: 0, delta: 0, track, car, ms: Math.round(ms), note: car + ' · ' + (ms / 1000).toFixed(3) + ' 秒' });
  save();
  scheduleSync(1500);
}
export async function fetchRaceBoard(track) {
  if (!hasBackend() || !navigator.onLine) return null;
  try { const r = await call({ action: 'raceboard', track }); return r.ok ? r.rows : null; } catch (e) { return null; }
}

export async function fetchLeaderboard() {
  if (!hasBackend() || !navigator.onLine) return null;
  try { const r = await call({ action: 'leaderboard' }); return r.ok ? r.rows : null; } catch (e) { return null; }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => scheduleSync(500));
  window.addEventListener('offline', () => { syncState.status = hasBackend() ? 'offline' : 'local'; emit(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') scheduleSync(800); else persist(); });
  setInterval(() => { if (data && data.pending.length) sync(); }, 60000);
}
