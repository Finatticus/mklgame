'use strict';

/* ============================================================
   Ledger 帳簿 — 前端
   資料流程：所有變更先寫入本機 (localStorage)，再排入佇列送到 GAS。
   本機快取依帳號分開存放，登出時清除。
   ============================================================ */

const SESSION_KEY = 'ledger:session';
const API_KEY = 'ledger:api';
// 依目前登入的帳號區分本機快取
const KEYS = {
  get tx() { return `ledger:${state.session.user}:tx`; },
  get cfg() { return `ledger:${state.session.user}:cfg`; },
  get queue() { return `ledger:${state.session.user}:queue`; }
};

const DEFAULT_CFG = {
  categories: {
    expense: ['餐飲', '交通', '購物', '居家', '帳單', '娛樂', '醫療', '教育', '其他'],
    income: ['薪資', '獎金', '投資', '兼職', '其他']
  },
  accounts: ['現金', '銀行帳戶', '信用卡'],
  budget: 0
};

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 儲存空間不可用 */ } }
};

function normCfg(c) {
  c = c || {};
  const cats = c.categories || {};
  return {
    categories: {
      expense: Array.isArray(cats.expense) && cats.expense.length ? cats.expense : DEFAULT_CFG.categories.expense.slice(),
      income: Array.isArray(cats.income) && cats.income.length ? cats.income : DEFAULT_CFG.categories.income.slice()
    },
    accounts: Array.isArray(c.accounts) && c.accounts.length ? c.accounts : DEFAULT_CFG.accounts.slice(),
    budget: Number(c.budget) || 0,
    cityBudgets: c.cityBudgets && typeof c.cityBudgets === 'object' ? c.cityBudgets : {}
  };
}

/* ---------- Utils ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 2 });
const money = n => nf.format(Math.round((Number(n) || 0) * 100) / 100);
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const ymOf = d => ymd(d).slice(0, 7);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

function shiftMonth(m, k) {
  const [y, mo] = m.split('-').map(Number);
  return ymOf(new Date(y, mo - 1 + k, 1));
}
function monthLabel(m) {
  const [y, mo] = m.split('-');
  return `${y} 年 ${Number(mo)} 月`;
}
function dayLabel(s) {
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const now = new Date();
  const yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const name = s === ymd(now) ? '今天' : s === ymd(yest) ? '昨天' : `${m} 月 ${d} 日`;
  return `${name} · 週${WEEK[dt.getDay()]}`;
}
function daysIn(m) {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo, 0).getDate();
}

const ICON = {
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/></svg>',
  check: '<svg class="mark-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  upload: '<svg viewBox="0 0 24 24"><path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M4.5 14.5v3a2 2 0 002 2h11a2 2 0 002-2v-3"/></svg>'
};

/* ---------- State ---------- */
const state = {
  session: store.get(SESSION_KEY, null),
  tx: [],
  cfg: normCfg(null),
  queue: [],
  view: 'overview',
  month: ymOf(new Date()),
  filter: { type: 'all', q: '' },
  selecting: false,
  selected: new Set(),
  syncing: false,
  syncError: ''
};

const apiUrl = () => (window.LEDGER_API_URL || store.get(API_KEY, '') || '').trim();

function loadUserData() {
  state.tx = store.get(KEYS.tx, []);
  state.cfg = normCfg(store.get(KEYS.cfg, null));
  state.queue = store.get(KEYS.queue, []);
  state.view = 'overview';
  state.month = ymOf(new Date());
  state.filter = { type: 'all', q: '' };
  state.syncError = '';
  setSelecting(false);
}

function persist() {
  store.set(KEYS.tx, state.tx);
  store.set(KEYS.cfg, state.cfg);
}

/* ---------- API ---------- */
async function api(action, payload, withSession = true) {
  const url = apiUrl();
  if (!url) throw new Error('尚未設定伺服器網址');
  const body = Object.assign({ action }, payload);
  if (withSession) body.session = state.session && state.session.token;
  // text/plain 可避免 CORS 預檢，GAS 才能正常接收
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  if (!data.ok) {
    const err = new Error(data.error || '未知錯誤');
    err.code = data.code;
    throw err;
  }
  return data;
}

function enqueue(op) {
  state.queue.push(op);
  store.set(KEYS.queue, state.queue);
  flush();
}

async function flush() {
  if (state.syncing || !state.session || !state.queue.length) return;
  state.syncing = true;
  renderStatus();
  try {
    while (state.queue.length) {
      const { action, ...payload } = state.queue[0];
      await api(action, payload);
      state.queue.shift();
      store.set(KEYS.queue, state.queue);
    }
    state.syncError = '';
  } catch (e) {
    state.syncError = e.message;
    if (e.code === 'AUTH') { state.syncing = false; return expireSession(); }
  }
  state.syncing = false;
  renderStatus();
}

// 將尚未送出的變更套用到伺服器回傳的資料上，避免同步時覆蓋掉
function applyQueue() {
  for (const op of state.queue) {
    if (op.action === 'save') upsertLocal(op.tx);
    else if (op.action === 'saveMany') op.txs.forEach(upsertLocal);
    else if (op.action === 'delete') state.tx = state.tx.filter(t => t.id !== op.id);
    else if (op.action === 'deleteMany') { const gone = new Set(op.ids); state.tx = state.tx.filter(t => !gone.has(t.id)); }
    else if (op.action === 'saveConfig') state.cfg = normCfg(op.config);
  }
}

async function pull(silent) {
  if (!state.session) return;
  await flush();
  if (state.syncing || !state.session) return;
  state.syncing = true;
  renderStatus();
  try {
    const d = await api('list');
    state.tx = (d.transactions || []).map(t => Object.assign(t, { amount: Number(t.amount) || 0 }));
    if (d.config) state.cfg = normCfg(d.config);
    applyQueue();
    persist();
    state.syncError = '';
    if (!silent) toast('已同步最新資料');
  } catch (e) {
    state.syncError = e.message;
    if (e.code === 'AUTH') { state.syncing = false; return expireSession(); }
    if (!silent) toast('同步失敗：' + e.message);
  }
  state.syncing = false;
  render();
}

/* ---------- Auth ---------- */
const authEl = $('#auth');
const appEl = $('#app');
const authForm = $('#auth-form');

function showAuth(message) {
  appEl.hidden = true;
  authEl.hidden = false;
  $('#auth-url-field').hidden = !!window.LEDGER_API_URL;
  $('#auth-url').value = store.get(API_KEY, '');
  $('#auth-pass').value = '';
  $('#auth-error').textContent = message || '';
}

function enterApp() {
  loadUserData();
  authEl.hidden = true;
  appEl.hidden = false;
  render();
  pull(true);
}

function clearUserData() {
  ['tx', 'cfg', 'queue'].forEach(k => localStorage.removeItem(KEYS[k]));
}

function logout() {
  if (state.queue.length && !confirm(`還有 ${state.queue.length} 筆變更尚未同步，登出後將會遺失。確定登出？`)) return;
  clearUserData();
  localStorage.removeItem(SESSION_KEY);
  state.session = null;
  if (form) closeForm();
  showAuth();
}

// 金鑰過期：保留本機快取（含未同步的變更），重新登入同一帳號後會繼續同步
function expireSession() {
  localStorage.removeItem(SESSION_KEY);
  const user = state.session && state.session.user;
  state.session = null;
  if (form) closeForm();
  showAuth('登入已過期，請重新登入');
  $('#auth-user').value = user || '';
}

async function submitAuth(mode) {
  const username = $('#auth-user').value.trim();
  const password = $('#auth-pass').value;
  const errEl = $('#auth-error');
  if (!window.LEDGER_API_URL) {
    const url = $('#auth-url').value.trim();
    if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(url)) { errEl.textContent = '請輸入正確的 GAS 網址'; return; }
    store.set(API_KEY, url);
  }
  if (!/^[A-Za-z0-9_.\-一-鿿]{2,20}$/.test(username)) { errEl.textContent = '帳號需為 2–20 字，可用中英文、數字及 _ . -'; return; }
  if (password.length < 6) { errEl.textContent = '密碼至少需要 6 個字元'; return; }

  const buttons = authForm.querySelectorAll('button');
  const btn = authForm.querySelector(`[data-auth="${mode}"]`);
  const label = btn.textContent;
  buttons.forEach(b => { b.disabled = true; });
  btn.textContent = '處理中…';
  errEl.textContent = '';
  try {
    const d = await api(mode, { username, password }, false);
    state.session = { user: d.user, token: d.token };
    store.set(SESSION_KEY, state.session);
    enterApp();
    toast(mode === 'register' ? `註冊成功，歡迎 ${d.user}` : `歡迎回來，${d.user}`);
  } catch (e) {
    errEl.textContent = e.message === 'Failed to fetch' ? '無法連線到伺服器，請確認網址與網路' : e.message;
  }
  buttons.forEach(b => { b.disabled = false; });
  btn.textContent = label;
}

authForm.addEventListener('submit', e => { e.preventDefault(); submitAuth('login'); });
authForm.querySelector('[data-auth="register"]').addEventListener('click', () => submitAuth('register'));

/* ---------- Mutations ---------- */
function upsertLocal(tx) {
  const i = state.tx.findIndex(t => t.id === tx.id);
  if (i >= 0) state.tx[i] = tx; else state.tx.push(tx);
}
function saveTx(tx) {
  upsertLocal(tx);
  persist();
  enqueue({ action: 'save', tx });
}
function deleteTx(id) {
  state.tx = state.tx.filter(t => t.id !== id);
  persist();
  enqueue({ action: 'delete', id });
}
function saveCfg() {
  persist();
  enqueue({ action: 'saveConfig', config: state.cfg });
}

/* ---------- Selectors ---------- */
function monthTx(m = state.month) {
  return state.tx.filter(t => t.date && t.date.startsWith(m));
}
function sums(list) {
  let income = 0, expense = 0;
  for (const t of list) t.type === 'income' ? income += t.amount : expense += t.amount;
  return { income, expense, balance: income - expense };
}
function sortTx(list) {
  return list.slice().sort((a, b) => b.date.localeCompare(a.date) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

/* ---------- Components ---------- */
// pick：選取模式，點擊切換選取而非開啟編輯
function txRow(t, pick = false) {
  const title = t.note || t.category;
  const sub = t.note ? `${t.category} · ${t.account}` : t.account;
  const picked = pick && state.selected.has(t.id);
  return `<button class="tx ${pick ? 'picking' : ''} ${picked ? 'picked' : ''}" ${pick ? 'data-pick' : 'data-edit'}="${esc(t.id)}">
    <span class="tx-mark ${t.type}"><span class="mark-text">${esc((t.category || '?').slice(0, 1))}</span>${ICON.check}</span>
    <span class="tx-main"><span class="tx-title">${esc(title)}</span><span class="tx-sub">${esc(sub)}</span></span>
    <span class="tx-amt ${t.type}">${t.type === 'income' ? '+' : '−'}${money(t.amount)}</span>
  </button>`;
}

function empty(title, text) {
  return `<div class="empty"><strong>${title}</strong>${text || ''}</div>`;
}

function breakdown(list, type, key = 'category', limit = 0) {
  const map = new Map();
  let total = 0;
  for (const t of list) {
    if (t.type !== type) continue;
    map.set(t[key], (map.get(t[key]) || 0) + t.amount);
    total += t.amount;
  }
  if (!total) return empty('本月尚無' + (type === 'income' ? '收入' : '支出'));
  let rows = [...map.entries()].sort((a, b) => b[1] - a[1]);
  if (limit && rows.length > limit) {
    const rest = rows.slice(limit - 1).reduce((s, r) => s + r[1], 0);
    rows = rows.slice(0, limit - 1).concat([['其餘', rest]]);
  }
  const max = rows[0][1];
  return `<div class="breakdown">${rows.map(([name, v]) => `
    <div class="bd-row ${type === 'income' ? 'inc' : ''}">
      <span class="bd-name">${esc(name || '未分類')}<small>${Math.round(v / total * 100)}%</small></span>
      <span class="bd-amt num">${money(v)}</span>
      <div class="track"><i style="width:${(v / max * 100).toFixed(1)}%"></i></div>
    </div>`).join('')}</div>`;
}

function dailyChart(list) {
  const days = daysIn(state.month);
  const arr = new Array(days).fill(0);
  for (const t of list) if (t.type === 'expense') arr[Number(t.date.slice(8, 10)) - 1] += t.amount;
  const max = Math.max(...arr, 1);
  const today = ymd(new Date());
  const W = days * 12, H = 120;
  const [, mo] = state.month.split('-').map(Number);
  const bars = arr.map((v, i) => {
    const x = i * 12 + 2;
    const date = `${state.month}-${pad(i + 1)}`;
    if (!v) return `<rect class="zero" x="${x}" y="${H - 1.5}" width="8" height="1.5"/>`;
    const h = Math.max(2, v / max * (H - 6));
    const cls = date > today ? 'bar dim' : 'bar';
    return `<rect class="${cls}" x="${x}" y="${H - h}" width="8" height="${h}" rx="1.5"><title>${mo}/${i + 1}  ${money(v)}</title></rect>`;
  }).join('');
  return `<div class="chart">
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="每日支出">${bars}</svg>
    <div class="chart-axis"><span>${mo}/1</span><span>${mo}/${Math.ceil(days / 2)}</span><span>${mo}/${days}</span></div>
  </div>`;
}

function trendChart() {
  const months = [];
  for (let i = 5; i >= 0; i--) months.push(shiftMonth(state.month, -i));
  const data = months.map(m => sums(monthTx(m)));
  const max = Math.max(1, ...data.flatMap(d => [d.income, d.expense]));
  const W = 600, H = 170, gw = W / 6, bw = 22;
  const grid = [0.25, 0.5, 0.75].map(p => `<line class="grid-line" x1="0" x2="${W}" y1="${H - p * (H - 6)}" y2="${H - p * (H - 6)}"/>`).join('');
  const bars = data.map((d, i) => {
    const cx = i * gw + gw / 2;
    const hi = d.income / max * (H - 6), he = d.expense / max * (H - 6);
    const label = monthLabel(months[i]);
    return `<rect class="bar inc" x="${cx - bw - 2}" y="${H - hi}" width="${bw}" height="${hi}" rx="2"><title>${label} 收入 ${money(d.income)}</title></rect>
      <rect class="bar" x="${cx + 2}" y="${H - he}" width="${bw}" height="${he}" rx="2"><title>${label} 支出 ${money(d.expense)}</title></rect>`;
  }).join('');
  return `<div class="chart tall">
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="近六個月收支">${grid}${bars}</svg>
    <div class="chart-axis even">${months.map(m => `<span>${Number(m.slice(5))} 月</span>`).join('')}</div>
  </div>`;
}

/* ---------- Views ---------- */
function viewOverview() {
  const list = monthTx();
  const s = sums(list);
  const budget = monthBudget(state.month);
  const isCurrent = state.month === ymOf(new Date());
  const elapsed = isCurrent ? new Date().getDate() : daysIn(state.month);
  const avg = s.expense / elapsed;
  const recent = sortTx(list).slice(0, 6);

  let budgetHtml = '';
  if (budget > 0) {
    const ratio = s.expense / budget;
    const left = budget - s.expense;
    budgetHtml = `<div class="budget">
      <div class="budget-row"><span>月預算 <b>${money(budget)}</b></span><span>${left >= 0 ? `剩餘 <b>${money(left)}</b>` : `<b style="color:var(--neg)">超支 ${money(-left)}</b>`}</span></div>
      <div class="track ${ratio > 1 ? 'over' : ''}"><i style="width:${Math.min(100, ratio * 100).toFixed(1)}%"></i></div>
    </div>`;
  }

  return `<div class="grid">
    <section class="card span-2">
      <div class="eyebrow">本月結餘</div>
      <div class="hero-amount ${s.balance < 0 ? 'neg' : ''}"><span class="cur">NT$</span>${s.balance < 0 ? '−' : ''}${money(Math.abs(s.balance))}</div>
      <div class="hero-stats">
        <div><span class="label">收入</span><span class="num pos">${money(s.income)}</span></div>
        <div><span class="label">支出</span><span class="num">${money(s.expense)}</span></div>
        <div><span class="label">日均支出</span><span class="num">${money(Math.round(avg))}</span></div>
      </div>
      ${budgetHtml}
    </section>
    <section class="card span-2">
      <div class="card-head"><h3>每日支出</h3><span class="meta">${list.filter(t => t.type === 'expense').length} 筆支出</span></div>
      ${dailyChart(list)}
    </section>
    <section class="card">
      <div class="card-head"><h3>支出分類</h3><button class="link" data-nav="stats">完整統計</button></div>
      ${breakdown(list, 'expense', 'category', 6)}
    </section>
    <section class="card">
      <div class="card-head"><h3>最近紀錄</h3><button class="link" data-nav="list">查看全部</button></div>
      ${recent.length ? `<div class="tx-list">${recent.map(t => txRow(t)).join('')}</div>` : empty('尚無紀錄', '點選「新增紀錄」開始記帳')}
    </section>
  </div>`;
}

function filteredTx() {
  const q = state.filter.q.trim().toLowerCase();
  let list = monthTx();
  if (state.filter.type !== 'all') list = list.filter(t => t.type === state.filter.type);
  if (q) list = list.filter(t => [t.note, t.category, t.account, String(t.amount)].some(v => String(v || '').toLowerCase().includes(q)));
  return list;
}

function listBody() {
  const list = filteredTx();
  if (!list.length) return empty(state.filter.q.trim() ? '找不到符合的紀錄' : '本月尚無紀錄');

  const s = sums(list);
  const groups = new Map();
  for (const t of sortTx(list)) {
    if (!groups.has(t.date)) groups.set(t.date, []);
    groups.get(t.date).push(t);
  }
  const summary = `<div class="list-summary"><span>共<b>${list.length}</b> 筆</span><span>收入<b class="pos">${money(s.income)}</b></span><span>支出<b>${money(s.expense)}</b></span></div>`;
  return summary + [...groups.entries()].map(([date, items]) => {
    const d = sums(items);
    const net = d.income - d.expense;
    const right = state.selecting
      ? `<button class="link" data-pick-day="${date}">選取當日</button>`
      : `<span class="num">${net >= 0 ? '+' : '−'}${money(Math.abs(net))}</span>`;
    return `<section class="card day">
      <div class="day-head"><b>${dayLabel(date)}</b>${right}</div>
      <div class="tx-list">${items.map(t => txRow(t, state.selecting)).join('')}</div>
    </section>`;
  }).join('');
}

/* ---------- Bulk select ---------- */
function setSelecting(on) {
  state.selecting = on;
  state.selected.clear();
}

function bulkbar() {
  return `<div class="bulkbar" id="bulkbar">
    <div class="bulk-info"><b id="bulk-count"></b><span id="bulk-sum"></span></div>
    <button class="btn btn-ghost" data-act="select-all" id="bulk-all"></button>
    <button class="btn btn-danger" data-act="bulk-delete" id="bulk-delete">刪除</button>
  </div>`;
}

function updateBulkbar() {
  if (!$('#bulkbar')) return;
  const picked = state.tx.filter(t => state.selected.has(t.id));
  const s = sums(picked);
  const visible = filteredTx();
  const allPicked = visible.length > 0 && visible.every(t => state.selected.has(t.id));
  $('#bulk-count').textContent = `已選取 ${picked.length} 筆`;
  $('#bulk-sum').textContent = picked.length ? `支出 ${money(s.expense)}${s.income ? ` · 收入 ${money(s.income)}` : ''}` : '點選紀錄以選取';
  $('#bulk-all').textContent = allPicked ? '取消全選' : '全選';
  $('#bulk-all').dataset.mode = allPicked ? 'none' : 'all';
  $('#bulk-delete').disabled = !picked.length;
}

function refreshPicks() {
  document.querySelectorAll('[data-pick]').forEach(b => b.classList.toggle('picked', state.selected.has(b.dataset.pick)));
  updateBulkbar();
}

function bulkDelete() {
  const ids = state.tx.filter(t => state.selected.has(t.id)).map(t => t.id);
  if (!ids.length) return;
  if (!confirm(`確定要刪除 ${ids.length} 筆紀錄？刪除後無法復原。`)) return;
  const gone = new Set(ids);
  state.tx = state.tx.filter(t => !gone.has(t.id));
  persist();
  enqueue({ action: 'deleteMany', ids });
  setSelecting(false);
  render();
  toast(`已刪除 ${ids.length} 筆`);
}

function viewList() {
  const f = state.filter.type;
  return `<div class="toolbar">
      <div class="seg">
        <button data-filter="all" class="${f === 'all' ? 'active' : ''}">全部</button>
        <button data-filter="expense" class="${f === 'expense' ? 'active' : ''}">支出</button>
        <button data-filter="income" class="${f === 'income' ? 'active' : ''}">收入</button>
      </div>
      <label class="search">${ICON.search}<input id="q" type="search" placeholder="搜尋備註、分類、金額" value="${esc(state.filter.q)}"></label>
      <button class="btn btn-ghost btn-import" data-act="import" title="匯入電子發票 CSV">${ICON.upload}<span>匯入發票</span></button>
      <button class="btn btn-ghost btn-select ${state.selecting ? 'on' : ''}" data-act="select-mode">${state.selecting ? '完成' : '選取'}</button>
    </div>
    <div id="list-body">${listBody()}</div>
    ${state.selecting ? bulkbar() : ''}`;
}

function viewStats() {
  const list = monthTx();
  return `<div class="grid">
    <section class="card span-2">
      <div class="card-head"><h3>近六個月收支</h3>
        <div class="legend"><span><i style="background:var(--pos)"></i>收入</span><span><i style="background:var(--accent)"></i>支出</span></div>
      </div>
      ${trendChart()}
    </section>
    <section class="card">
      <div class="card-head"><h3>支出分類</h3><span class="meta">${monthLabel(state.month)}</span></div>
      ${breakdown(list, 'expense')}
    </section>
    <section class="card">
      <div class="card-head"><h3>收入來源</h3><span class="meta">${monthLabel(state.month)}</span></div>
      ${breakdown(list, 'income')}
    </section>
    <section class="card span-2">
      <div class="card-head"><h3>帳戶支出</h3><span class="meta">${monthLabel(state.month)}</span></div>
      ${breakdown(list, 'expense', 'account')}
    </section>
  </div>`;
}

function tagList(items, attr) {
  return `<div class="tags">${items.map(n => `<span class="tag">${esc(n)}<button type="button" ${attr}="${esc(n)}" aria-label="移除 ${esc(n)}">${ICON.x}</button></span>`).join('')}</div>`;
}

function viewSettings() {
  const user = state.session.user;
  return `<div class="settings">
    <section class="card">
      <h3>帳號</h3>
      <div class="account-row">
        <div class="account-id"><span class="avatar">${esc(user.slice(0, 1).toUpperCase())}</span><div><b>${esc(user)}</b><div class="field-hint">資料儲存於試算表「${esc(user)}」工作頁</div></div></div>
        <button class="btn btn-ghost" data-act="logout">登出</button>
      </div>
    </section>

    <section class="card">
      <h3>每月預算</h3>
      <p class="desc">本月（${monthLabel(ymOf(new Date()))}）的預算。修改後套用到本月及之後的月份，過去月份不變；要改單一月份請到「小城市」頁。</p>
      <div class="inline-add">
        <input class="input" id="s-budget" inputmode="numeric" placeholder="0" value="${monthBudget(ymOf(new Date())) || ''}">
        <button class="btn btn-ghost" data-act="save-budget">儲存</button>
      </div>
    </section>

    <section class="card">
      <h3>分類</h3>
      <div class="sub-label">支出</div>
      ${tagList(state.cfg.categories.expense, 'data-del-expense')}
      <div class="inline-add"><input class="input" id="new-expense" placeholder="新增支出分類" maxlength="12"><button class="btn btn-ghost" data-act="add-cat" data-type="expense">新增</button></div>
      <div class="sub-label">收入</div>
      ${tagList(state.cfg.categories.income, 'data-del-income')}
      <div class="inline-add"><input class="input" id="new-income" placeholder="新增收入分類" maxlength="12"><button class="btn btn-ghost" data-act="add-cat" data-type="income">新增</button></div>
    </section>

    <section class="card">
      <h3>帳戶</h3>
      ${tagList(state.cfg.accounts, 'data-del-acc')}
      <div class="inline-add"><input class="input" id="new-acc" placeholder="新增帳戶，如：悠遊卡" maxlength="12"><button class="btn btn-ghost" data-act="add-acc">新增</button></div>
    </section>

    <section class="card">
      <h3>資料</h3>
      <p class="desc">目前共 ${state.tx.length} 筆紀錄。</p>
      <div class="row-actions">
        <button class="btn btn-ghost" data-act="import">匯入電子發票</button>
        <button class="btn btn-ghost" data-act="export">匯出 CSV</button>
      </div>
      <p class="field-hint">從電子發票整合服務平台下載載具發票 CSV 後匯入；已匯入過的發票會自動略過。</p>
    </section>
  </div>`;
}

const VIEWS = { overview: viewOverview, list: viewList, stats: viewStats, city: viewCity, settings: viewSettings };
const TITLES = { overview: '總覽', list: '明細', stats: '統計', city: '小城市', settings: '設定' };

/* ---------- Render ---------- */
function render() {
  document.querySelectorAll('[data-nav]').forEach(b => b.classList.toggle('active', b.dataset.nav === state.view));
  $('#title').textContent = TITLES[state.view];
  $('#monthbar').hidden = state.view === 'settings';
  $('#month-label').textContent = monthLabel(state.month);
  $('#view').innerHTML = VIEWS[state.view]();
  document.body.classList.toggle('is-selecting', state.view === 'list' && state.selecting);
  updateBulkbar();
  renderStatus();
}

function renderStatus() {
  const el = $('#status');
  let cls, txt;
  if (state.syncing) { cls = 'busy'; txt = '同步中'; }
  else if (state.syncError) { cls = 'err'; txt = '同步失敗'; }
  else if (state.queue.length) { cls = 'busy'; txt = `待同步 ${state.queue.length}`; }
  else { cls = 'ok'; txt = '已同步'; }
  el.className = 'status ' + cls;
  el.innerHTML = `<i></i>${txt}`;
  el.title = state.syncError || '點選重新同步';
}

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------- Form ---------- */
let form = null;
const sheet = $('#sheet');
const formEl = $('#tx-form');

function openForm(id) {
  const t = id ? state.tx.find(x => x.id === id) : null;
  const today = ymd(new Date());
  form = t ? Object.assign({}, t) : {
    id: '', type: 'expense', amount: '', category: '',
    account: state.cfg.accounts[0] || '',
    date: today.startsWith(state.month) ? today : `${state.month}-01`,
    note: ''
  };
  renderForm();
  sheet.classList.add('open');
  sheet.setAttribute('aria-hidden', 'false');
  if (!t && matchMedia('(pointer:fine)').matches) setTimeout(() => $('#f-amount').focus(), 60);
}

function closeForm() {
  sheet.classList.remove('open');
  sheet.setAttribute('aria-hidden', 'true');
  form = null;
}

function readForm() {
  form.amount = $('#f-amount').value;
  form.date = $('#f-date').value;
  form.account = $('#f-account').value;
  form.note = $('#f-note').value;
}

function renderForm() {
  const cats = state.cfg.categories[form.type];
  if (!form.category) form.category = cats[0];
  const catList = cats.includes(form.category) ? cats : cats.concat(form.category);
  const accs = state.cfg.accounts.includes(form.account) || !form.account ? state.cfg.accounts : state.cfg.accounts.concat(form.account);

  formEl.innerHTML = `
    <div class="sheet-head">
      <h2>${form.id ? '編輯紀錄' : '新增紀錄'}</h2>
      <button type="button" class="icon-btn" data-act="close" aria-label="關閉">${ICON.x}</button>
    </div>
    <div class="seg seg-lg">
      <button type="button" data-ftype="expense" class="${form.type === 'expense' ? 'active' : ''}">支出</button>
      <button type="button" data-ftype="income" class="${form.type === 'income' ? 'active' : ''}">收入</button>
    </div>
    <label class="amount-field"><span>NT$</span>
      <input id="f-amount" inputmode="decimal" placeholder="0" value="${esc(form.amount)}" aria-label="金額"></label>
    <div class="field">
      <span class="field-label">分類</span>
      <div class="chips">${catList.map(c => `<button type="button" class="chip ${c === form.category ? 'active' : ''}" data-fcat="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    </div>
    <div class="field-row">
      <label class="field"><span class="field-label">日期</span><input id="f-date" type="date" value="${esc(form.date)}" required></label>
      <label class="field"><span class="field-label">帳戶</span>
        <select id="f-account">${accs.map(a => `<option ${a === form.account ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select></label>
    </div>
    <label class="field"><span class="field-label">備註</span><input id="f-note" placeholder="選填" maxlength="100" value="${esc(form.note)}"></label>
    <div class="sheet-actions">
      ${form.id ? '<button type="button" class="btn btn-ghost danger" data-act="delete">刪除</button>' : ''}
      <button type="submit" class="btn btn-primary">儲存</button>
    </div>`;
}

formEl.addEventListener('submit', e => {
  e.preventDefault();
  readForm();
  const amount = Number(String(form.amount).replace(/,/g, ''));
  if (!(amount > 0)) { toast('請輸入金額'); $('#f-amount').focus(); return; }
  if (!form.date) { toast('請選擇日期'); return; }
  const now = new Date().toISOString();
  const tx = {
    id: form.id || uid(),
    date: form.date,
    type: form.type,
    amount: Math.round(amount * 100) / 100,
    category: form.category,
    account: form.account,
    note: form.note.trim(),
    createdAt: form.createdAt || now,
    updatedAt: now
  };
  const isNew = !form.id;
  saveTx(tx);
  closeForm();
  state.month = tx.date.slice(0, 7);
  render();
  toast(isNew ? '已新增' : '已更新');
});

/* ---------- Invoice import ----------
   電子發票整合服務平台匯出的 CSV：每列一個品項，同一張發票有多列；
   品名可能含未加引號的換行；檔尾有兩行說明文字。
   每張發票的 id 由發票號碼決定，因此已匯入過的發票不會重複匯入。 */

const SELLER_ALIASES = [
  [/統一超商/, '7-ELEVEN'], [/全家便利商店/, '全家'], [/萊爾富/, '萊爾富'], [/來來超商/, 'OK 超商'],
  [/全聯/, '全聯'], [/家福股份|家樂福/, '家樂福'], [/好市多/, 'Costco'], [/台灣中油|中國石油/, '中油'],
  [/台塑石化/, '台塑石油'], [/統一星巴克/, '星巴克'], [/麥當勞|和德昌/, '麥當勞'], [/路易莎/, '路易莎'],
  [/屈臣氏/, '屈臣氏'], [/康是美/, '康是美'], [/寶雅/, '寶雅'], [/中華電信/, '中華電信'], [/台灣電力/, '台電']
];

const CATEGORY_RULES = [
  ['交通', /加油|汽油|柴油|中油|台塑石化|停車|捷運|臺鐵|台鐵|高鐵|客運|計程|悠遊卡|一卡通|遠通電收|iRent|YouBike/i],
  ['娛樂', /Valve|Steam|Netflix|Spotify|YouTube|Google Play|KKBOX|Disney|PlayStation|Nintendo|影城|電影|KTV/i],
  ['帳單', /中華電信|台灣大哥大|遠傳|台灣之星|亞太電信|台灣電力|電費|自來水|水費|瓦斯|保險/],
  ['醫療', /醫院|診所|藥局|牙醫|中醫/],
  ['餐飲', /餐|食|飲|茶|咖啡|奶|麵|飯|丼|便當|早午?餐|小吃|雞|牛|豬|魚|湯|麥當勞|肯德基|摩斯|星巴克|路易莎|Uber ?Eats|foodpanda/i],
  ['購物', /全聯|家樂福|好市多|Costco|屈臣氏|康是美|寶雅|IKEA|無印良品|UNIQLO|momo|蝦皮|PChome|大創|小北百貨/i]
];

function shortSeller(name) {
  const hit = SELLER_ALIASES.find(([re]) => re.test(name));
  if (hit) return hit[1];
  return name.replace(/(股份)?有限公司|企業社|商行|分公司/g, ' ').replace(/\s+/g, ' ').trim() || name;
}

function guessCategory(text) {
  const cats = state.cfg.categories.expense;
  const hit = CATEGORY_RULES.find(([cat, re]) => cats.includes(cat) && re.test(text));
  if (hit) return hit[0];
  return cats.includes('其他') ? '其他' : cats[0];
}

// 多行品名（如停車費）通常前幾行是「進場時間:…」之類的說明，取最後一行非說明文字
function itemName(raw) {
  const parts = String(raw || '').split('\n').map(s => s.trim()).filter(Boolean);
  return parts.filter(p => !/[:：]\s*\S/.test(p)).pop() || parts[0] || '';
}

function parseInvoiceCsv(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  const hi = lines.findIndex(l => l.includes('發票號碼') && l.includes('發票日期'));
  if (hi < 0) throw new Error('這不是電子發票平台匯出的 CSV 檔');
  const head = lines[hi].split(',').map(s => s.trim());
  const col = name => head.indexOf(name);
  const C = {
    date: col('發票日期'), no: col('發票號碼'), amt: col('發票金額'), status: col('發票狀態'),
    sellerId: col('賣方統一編號'), seller: col('賣方名稱'), item: col('消費明細_品名'), itemAmt: col('消費明細_金額')
  };
  if (C.date < 0 || C.no < 0 || C.amt < 0 || C.seller < 0) throw new Error('CSV 缺少必要欄位');

  const rows = [];
  for (const line of lines.slice(hi + 1)) {
    if (!line.trim()) continue;
    const f = line.split(',');
    if (f.length >= head.length && /^\d{8}$/.test(f[C.date]) && /^[A-Z]{2}[0-9*]{8}$/.test(f[C.no])) {
      // 品名含逗號時欄位會變多，把多出的部分併回最後一欄
      if (f.length > head.length) f.splice(head.length - 1, f.length, f.slice(head.length - 1).join(','));
      rows.push(f);
    } else if (rows.length && !/^(捐贈或作廢|注意：)/.test(line)) {
      rows[rows.length - 1][head.length - 1] += '\n' + line;
    }
  }

  const groups = new Map();
  for (const f of rows) {
    const key = `${f[C.no]}|${f[C.date]}|${f[C.sellerId] || ''}`;
    let inv = groups.get(key);
    if (!inv) {
      const d = f[C.date];
      inv = {
        number: f[C.no], date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
        sellerId: f[C.sellerId] || '', sellerFull: (f[C.seller] || '').trim(),
        status: C.status >= 0 ? f[C.status] : '', total: 0, items: []
      };
      groups.set(key, inv);
    }
    const amt = Number(f[C.itemAmt >= 0 ? C.itemAmt : C.amt]) || 0;
    inv.total += amt;
    const name = C.item >= 0 ? itemName(f[C.item]) : '';
    if (amt > 0 && name) inv.items.push(name);
  }

  const existing = new Set(state.tx.map(t => t.id));
  return [...groups.values()].map(inv => {
    inv.total = Math.round(inv.total * 100) / 100;
    // 捐贈或作廢的發票號碼末 3 碼會被隱藏，改用日期、賣方、金額一起識別
    inv.id = inv.number.includes('*')
      ? `inv-${inv.number.replace(/\*/g, 'x')}-${inv.date}-${inv.sellerId}-${inv.total}`
      : `inv-${inv.number}`;
    inv.seller = shortSeller(inv.sellerFull);
    inv.category = guessCategory(inv.sellerFull + ' ' + inv.items.join(' '));
    const first = inv.items[0];
    inv.note = (first ? `${inv.seller}：${first}${inv.items.length > 1 ? ` 等 ${inv.items.length} 項` : ''}` : inv.seller).slice(0, 100);
    inv.dup = existing.has(inv.id);
    inv.skip = /作廢/.test(inv.status) ? '已作廢' : inv.total <= 0 ? '金額為 0' : '';
    inv.selected = !inv.dup && !inv.skip;
    return inv;
  }).sort((a, b) => b.date.localeCompare(a.date));
}

let importList = null;
const importSheet = $('#import-sheet');

async function readImportFile(file) {
  const buf = await file.arrayBuffer();
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); }
  catch (e) { return new TextDecoder('big5').decode(buf); }
}

function openImport(list) {
  importList = list;
  renderImport();
  importSheet.classList.add('open');
  importSheet.setAttribute('aria-hidden', 'false');
}

function closeImport() {
  importSheet.classList.remove('open');
  importSheet.setAttribute('aria-hidden', 'true');
  importList = null;
}

function importRow(inv, i) {
  const locked = inv.dup || inv.skip;
  const [, m, d] = inv.date.split('-').map(Number);
  const items = inv.items.length ? inv.items.slice(0, 3).join('、') + (inv.items.length > 3 ? '…' : '') : inv.sellerFull;
  const right = locked
    ? `<span class="badge">${inv.dup ? '已匯入' : inv.skip}</span>`
    : `<select class="inv-cat" data-inv-cat="${i}" aria-label="分類">${state.cfg.categories.expense.map(c => `<option ${c === inv.category ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>`;
  return `<label class="inv ${locked ? 'is-locked' : ''}">
    <input type="checkbox" data-inv="${i}" ${inv.selected ? 'checked' : ''} ${locked ? 'disabled' : ''}>
    <span class="inv-main">
      <span class="inv-title">${esc(inv.seller)}</span>
      <span class="inv-sub">${m}/${d} · ${esc(inv.number)} · ${esc(items)}</span>
    </span>
    <span class="inv-side"><span class="inv-amt num">${money(inv.total)}</span>${right}</span>
  </label>`;
}

function renderImport() {
  const list = importList;
  const fresh = list.filter(i => !i.dup && !i.skip).length;
  const dup = list.filter(i => i.dup).length;
  $('#import-body').innerHTML = `
    <div class="sheet-head">
      <h2>匯入電子發票</h2>
      <button type="button" class="icon-btn" data-act="close-import" aria-label="關閉">${ICON.x}</button>
    </div>
    <div class="import-summary">
      <div><span class="label">發票</span><b class="num">${list.length}</b></div>
      <div><span class="label">可匯入</span><b class="num">${fresh}</b></div>
      <div><span class="label">已匯入過</span><b class="num">${dup}</b></div>
    </div>
    <div class="import-controls">
      <label class="field"><span class="field-label">記入帳戶</span>
        <select id="imp-account">${state.cfg.accounts.map(a => `<option>${esc(a)}</option>`).join('')}</select></label>
      <div class="seg"><button type="button" data-imp-all="1">全選</button><button type="button" data-imp-all="0">全不選</button></div>
    </div>
    <div class="inv-list">${list.length ? list.map(importRow).join('') : empty('檔案中沒有發票')}</div>
    <div class="sheet-actions">
      <button type="button" class="btn btn-ghost" data-act="close-import">取消</button>
      <button type="button" class="btn btn-primary" id="imp-submit" data-act="do-import"></button>
    </div>`;
  updateImportButton();
}

function updateImportButton() {
  const sel = importList.filter(i => i.selected);
  const btn = $('#imp-submit');
  btn.disabled = !sel.length;
  btn.textContent = sel.length ? `匯入 ${sel.length} 筆 · ${money(sel.reduce((s, i) => s + i.total, 0))}` : '沒有可匯入的發票';
}

function doImport() {
  const account = $('#imp-account').value;
  const existing = new Set(state.tx.map(t => t.id));
  const now = new Date().toISOString();
  const txs = importList
    .filter(i => i.selected && !existing.has(i.id))
    .map(i => ({ id: i.id, date: i.date, type: 'expense', amount: i.total, category: i.category, account, note: i.note, createdAt: now, updatedAt: now }));
  if (!txs.length) { toast('沒有新的發票'); return; }
  txs.forEach(upsertLocal);
  persist();
  enqueue({ action: 'saveMany', txs });
  closeImport();
  state.month = txs[0].date.slice(0, 7);
  state.view = 'list';
  render();
  toast(`已匯入 ${txs.length} 筆發票`);
}

$('#import-file').addEventListener('change', async e => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    openImport(parseInvoiceCsv(await readImportFile(file)));
  } catch (err) {
    toast(err.message);
  }
});

importSheet.addEventListener('change', e => {
  if (!importList) return;
  const t = e.target;
  if (t.dataset.inv) { importList[t.dataset.inv].selected = t.checked; updateImportButton(); }
  else if (t.dataset.invCat) importList[t.dataset.invCat].category = t.value;
});

/* ---------- Actions ---------- */
function downloadCsv() {
  const head = ['日期', '類型', '金額', '分類', '帳戶', '備註'];
  const rows = sortTx(state.tx).map(t => [t.date, t.type === 'income' ? '收入' : '支出', t.amount, t.category, t.account, t.note]);
  const csv = [head].concat(rows).map(r => r.map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ledger-${ymd(new Date())}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function addToList(list, inputId) {
  const input = $('#' + inputId);
  const name = input.value.trim();
  if (!name) return false;
  if (list.includes(name)) { toast('已存在相同名稱'); return false; }
  list.push(name);
  return true;
}

const ACTIONS = {
  prev() { state.month = shiftMonth(state.month, -1); state.selected.clear(); cityEditing = false; render(); },
  next() { state.month = shiftMonth(state.month, 1); state.selected.clear(); cityEditing = false; render(); },
  'select-mode'() { setSelecting(!state.selecting); render(); },
  'select-all'(el) {
    const on = el.dataset.mode === 'all';
    filteredTx().forEach(t => on ? state.selected.add(t.id) : state.selected.delete(t.id));
    refreshPicks();
  },
  'bulk-delete'() { bulkDelete(); },
  'city-budget'() {
    const v = Number($('#city-budget').value.replace(/,/g, '')) || 0;
    if (v <= 0) { toast('請輸入月預算'); return; }
    setMonthBudget(state.month, v);
    render();
    toast('城市開始動工！');
  },
  'city-edit'() { cityEdit(true); },
  'city-cancel'() { cityEdit(false); },
  'city-save-budget'() { citySaveBudget(); },
  add() { openForm(); },
  close() { closeForm(); },
  delete() {
    if (!confirm('確定要刪除這筆紀錄？')) return;
    deleteTx(form.id);
    closeForm();
    render();
    toast('已刪除');
  },
  sync() { pull(); },
  logout() { logout(); },
  'save-budget'() {
    setMonthBudget(ymOf(new Date()), $('#s-budget').value.replace(/,/g, ''));
    toast('預算已儲存，套用到本月及之後的月份');
  },
  'add-cat'(el) {
    const type = el.dataset.type;
    if (addToList(state.cfg.categories[type], 'new-' + type)) { saveCfg(); render(); $('#new-' + type).focus(); }
  },
  'add-acc'() {
    if (addToList(state.cfg.accounts, 'new-acc')) { saveCfg(); render(); $('#new-acc').focus(); }
  },
  export() { downloadCsv(); },
  import() { $('#import-file').click(); },
  'close-import'() { closeImport(); },
  'do-import'() { doImport(); }
};

function removeFrom(list, name, label) {
  if (list.length <= 1) { toast(`至少保留一個${label}`); return; }
  list.splice(list.indexOf(name), 1);
  saveCfg();
  render();
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-nav],[data-act],[data-edit],[data-pick],[data-pick-day],[data-ftype],[data-fcat],[data-filter],[data-del-expense],[data-del-income],[data-del-acc],[data-imp-all],[data-city-month]');
  if (!el) return;
  const d = el.dataset;
  if (d.nav) { state.view = d.nav; setSelecting(false); render(); window.scrollTo(0, 0); }
  else if (d.cityMonth) { state.month = d.cityMonth; render(); window.scrollTo(0, 0); }
  else if (d.pick) {
    state.selected.has(d.pick) ? state.selected.delete(d.pick) : state.selected.add(d.pick);
    refreshPicks();
  }
  else if (d.pickDay) {
    const day = filteredTx().filter(t => t.date === d.pickDay);
    const on = !day.every(t => state.selected.has(t.id));
    day.forEach(t => on ? state.selected.add(t.id) : state.selected.delete(t.id));
    refreshPicks();
  }
  else if (d.impAll) {
    const on = d.impAll === '1';
    importList.forEach((inv, i) => {
      if (inv.dup || inv.skip) return;
      inv.selected = on;
      importSheet.querySelector(`[data-inv="${i}"]`).checked = on;
    });
    updateImportButton();
  }
  else if (d.edit) openForm(d.edit);
  else if (d.ftype) { readForm(); form.type = d.ftype; form.category = ''; renderForm(); }
  else if (d.fcat) {
    form.category = d.fcat;
    formEl.querySelectorAll('[data-fcat]').forEach(b => b.classList.toggle('active', b === el));
  }
  else if (d.filter) { state.filter.type = d.filter; render(); }
  else if (d.delExpense) removeFrom(state.cfg.categories.expense, d.delExpense, '分類');
  else if (d.delIncome) removeFrom(state.cfg.categories.income, d.delIncome, '分類');
  else if (d.delAcc) removeFrom(state.cfg.accounts, d.delAcc, '帳戶');
  else if (d.act && ACTIONS[d.act]) ACTIONS[d.act](el);
});

document.addEventListener('input', e => {
  if (e.target.id === 'q') { state.filter.q = e.target.value; $('#list-body').innerHTML = listBody(); updateBulkbar(); }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && importList) closeImport();
  else if (e.key === 'Escape' && form) closeForm();
  else if (e.key === 'Escape' && state.selecting) { setSelecting(false); render(); }
  if (e.key === 'Enter' && e.target.matches('.inline-add input')) {
    e.preventDefault();
    e.target.parentElement.querySelector('button').click();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.session) pull(true);
});
window.addEventListener('online', () => flush());

/* ---------- Boot ---------- */
if (state.session && state.session.token) enterApp();
else showAuth();
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
