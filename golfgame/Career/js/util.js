// 生涯模式共用的小工具：亂數、日期（季 / 週 → 月份）、金額、格式
export const $ = id => document.getElementById(id);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sum = arr => arr.reduce((s, v) => s + (v || 0), 0);
export const avg = arr => (arr.length ? sum(arr) / arr.length : 0);
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// 可重現的亂數（mulberry32）；normal() = 標準常態
export function rng(seed) {
  let a = seed >>> 0;
  const r = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.normal = () => { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  r.int = (a0, b0) => a0 + Math.floor(r() * (b0 - a0 + 1));
  r.pick = arr => arr[Math.floor(r() * arr.length)];
  r.chance = p => r() < p;
  r.shuffle = arr => { const o = arr.slice(); for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } return o; };
  return r;
}
export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
// 同一個生涯、同一件事永遠擲出同樣的結果（存檔重開不能重擲）
export const seeded = (st, ...keys) => rng(hash(st.seed + ':' + keys.join(':')));

// ---------- 日期：一年 52 週；第 1 週 = 1 月第 1 週 ----------
export const MONTH_OF_WEEK = w => clamp(Math.floor((w - 1) / 4.34) + 1, 1, 12);
export const weekLabel = (year, w) => `${year} 年 ${MONTH_OF_WEEK(w)} 月 · 第 ${w} 週`;
export const MONTH_ZH = ['', '1 月', '2 月', '3 月', '4 月', '5 月', '6 月', '7 月', '8 月', '9 月', '10 月', '11 月', '12 月'];
// 學校的假期：寒假（第 3~6 週）、暑假（第 27~35 週）；大學的暑假較長（第 20~35 週）
export const isHoliday = (w, college = false) => (w >= 3 && w <= 6) || (college ? w >= 20 && w <= 35 : w >= 27 && w <= 35) || w >= 52;
export const examWeek = w => w === 12 || w === 24 || w === 44 || w === 2;

// ---------- 金額 ----------
export function money(v, opt = {}) {
  const n = Math.round(Number(v) || 0), a = Math.abs(n), sign = n < 0 ? '−' : opt.plus && n > 0 ? '+' : '';
  if (opt.short && a >= 1e6) return `${sign}$${(a / 1e6).toFixed(a >= 1e7 ? 1 : 2)}M`;
  if (opt.short && a >= 1e4) return `${sign}$${Math.round(a / 1000)}K`;
  return `${sign}$${a.toLocaleString('en-US')}`;
}
export const toPar = v => (v === 0 ? 'E' : v > 0 ? '+' + v : String(v));
export const ordinal = (pos, tie) => (tie ? 'T' : '') + pos;
export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

// 名次字串：同分加 T
export function placeStr(list, i, key = 'total') {
  const v = list[i][key], tie = list.filter(x => x[key] === v).length > 1;
  const pos = list.findIndex(x => x[key] === v) + 1;
  return (tie ? 'T' : '') + pos;
}

export const delay = ms => new Promise(r => setTimeout(r, ms));
export function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }

// 星等（1~5）
export const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
