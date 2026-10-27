// 生涯模式的畫面框架：上方的狀態列、下方的分頁、全螢幕的劇情卡與對話框、各畫面的切換
import { esc, money, toPar } from '../util.js';
import { cur } from '../state.js';
import { CHAPTER_ZH } from '../life.js';

export const ui = { ctx: null, view: null, arg: null, views: {}, root: null };
const ICON = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  me: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/></svg>',
  team: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8" cy="9" r="3"/><circle cx="17" cy="9" r="3"/><path d="M2 20c.7-3 3-4.5 6-4.5s5.3 1.5 6 4.5M13 16c1-.4 2.2-.6 4-.6 3 0 5 1.6 5.6 4.6"/></svg>',
  money: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="6" width="20" height="13" rx="2"/><circle cx="12" cy="12.5" r="3"/></svg>',
  cup: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
};
const TABS = [['home', '首頁', 'home'], ['calendar', '賽程', 'cal'], ['player', '球員', 'me'], ['team', '團隊', 'team'], ['finance', '財務', 'money'], ['trophy', '獎盃', 'cup'], ['more', '更多', 'more']];

export function mount(ctx) {
  ui.ctx = ctx;
  const root = document.getElementById('scr-career');
  if (!root.dataset.mounted) {
    root.dataset.mounted = 1;
    root.innerHTML = `<header class="cm-top" id="cm-top"></header><div class="cm-main" id="cm-main"><div class="cm-wrap" id="cm-body"></div></div>
      <nav class="cm-tabs" id="cm-tabs">${TABS.map(([v, n, i]) => `<button data-v="${v}"><i>${ICON[i]}</i>${n}</button>`).join('')}</nav>`;
    root.querySelectorAll('#cm-tabs button').forEach(b => b.onclick = () => go(b.dataset.v));
    let ov = document.getElementById('cm-ov');
    if (!ov) { ov = document.createElement('div'); ov.id = 'cm-ov'; ov.className = 'cm-ov'; document.body.appendChild(ov); }
  }
  ui.root = root;
}
export const register = (name, fn) => { ui.views[name] = fn; };
export function go(view, arg) {
  ui.view = view; ui.arg = arg;
  ui.ctx.show('scr-career');
  const tabs = document.getElementById('cm-tabs');
  const full = ['slots', 'create', 'event'].includes(view);
  tabs.style.display = full ? 'none' : '';
  tabs.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === view));
  header();
  const body = document.getElementById('cm-body');
  body.innerHTML = '';
  document.getElementById('cm-main').scrollTop = 0;
  const fn = ui.views[view];
  if (fn) fn(body, arg);
}
export const refresh = () => go(ui.view, ui.arg);

// 上方的狀態列
export function header(extra) {
  const el = document.getElementById('cm-top'), st = cur();
  if (!st || ['slots', 'create'].includes(ui.view)) {
    el.innerHTML = `<small>MY CAREER · 測試中</small><h4>生涯模式</h4><div class="sub">從 8 歲的第一次揮桿，到奧古斯塔的綠夾克</div><div class="acts"><button id="cm-exit">回大廳</button></div>`;
  } else {
    const p = st.player;
    const rank = st.status.amateur ? (st.status.stage === 'junior' ? `國內青少年 <b>${st.jrRank || '—'}</b>` : `世界業餘 <b>${st.wagr && st.wagr < 600 ? st.wagr : '—'}</b>`) : `世界排名 <b>${st.rankNow && st.rankNow < 9999 ? st.rankNow : '—'}</b>`;
    el.innerHTML = `<small>${st.year} 年 · 第 ${st.week} 週 · ${CHAPTER_ZH[st.chapter] || ''}</small><h4>${esc(p.name)} <span class="cm-pill gold" style="vertical-align:middle">Lv.${p.level}</span></h4>
      <div class="sub"><span>${p.age} 歲</span><span>${rank}</span><span>資金 <b>${money(st.money.cash, { short: true })}</b></span>${extra || ''}</div>
      <div class="acts"><button id="cm-exit">回大廳</button></div>`;
  }
  document.getElementById('cm-exit').onclick = () => exitCareer();
}
export function exitCareer() {
  closeOv();
  ui.ctx.enterLobby();
}

// ---------- 全螢幕：劇情卡 ----------
//   card = { small, title, img, paras:[], goal, choices:[[label, sub]], skip }；回傳選擇的 index（沒有選項時回傳 -1）
export function story(card) {
  return new Promise(res => {
    const ov = document.getElementById('cm-ov');
    const img = card.img ? `<div class="ph" style="background-image:url('Career/img/s/${card.img}')"></div>` : '';
    ov.innerHTML = `<div class="cm-story">${img}<div class="bd">${card.skip !== false ? '<button class="skip" id="cs-skip">略過 ›</button>' : ''}<small>${esc(card.small || 'STORY')}</small><h2>${esc(card.title)}</h2>
      ${(card.paras || []).map(t => `<p>${esc(t)}</p>`).join('')}${card.goal ? `<div class="goal">章節目標：${esc(card.goal)}</div>` : ''}${card.html || ''}
      <div class="ch" id="cs-ch">${(card.choices || []).map((c, i) => `<button data-i="${i}" ${c[2] ? 'disabled style="opacity:.45"' : ''}>${esc(c[0])}${c[1] ? `<span>${esc(c[1])}</span>` : ''}</button>`).join('') || `<button data-i="-1" style="text-align:center">${esc(card.ok || '繼續')}</button>`}</div></div></div>`;
    ov.classList.add('open');
    const done = i => { ov.classList.remove('open'); ov.innerHTML = ''; res(i); };
    ov.querySelectorAll('#cs-ch button').forEach(b => b.onclick = () => done(Number(b.dataset.i)));
    const sk = document.getElementById('cs-skip');
    if (sk) sk.onclick = () => done(card.choices && card.choices.length ? 0 : -1);
  });
}
// 選擇之後顯示結果一句話
export function storyResult(title, txt, more) {
  return story({ small: 'RESULT', title, paras: [txt, ...(more || [])], skip: false });
}

// ---------- 對話框 ----------
export function dialog(html, opts = {}) {
  return new Promise(res => {
    const ov = document.getElementById('cm-ov');
    ov.innerHTML = `<div class="cm-dlg ${opts.wide ? 'wide' : ''}">${opts.title ? `<h3>${esc(opts.title)}</h3>` : ''}${html}<div class="btns">${(opts.buttons || [['關閉', 'ghost']]).map((b, i) => `<button class="cm-btn ${b[1] || ''}" data-i="${i}">${esc(b[0])}</button>`).join('')}</div></div>`;
    ov.classList.add('open');
    const close = v => { ov.classList.remove('open'); ov.innerHTML = ''; res(v); };
    ov.querySelectorAll('.btns button').forEach(b => b.onclick = () => close(Number(b.dataset.i)));
    if (opts.bind) opts.bind(ov, close);
  });
}
export const closeOv = () => { const ov = document.getElementById('cm-ov'); if (ov) { ov.classList.remove('open'); ov.innerHTML = ''; } };
export const confirm2 = (text, ok = '確定') => dialog(`<p class="cm-note" style="font-size:14px;color:var(--ink)">${text}</p>`, { buttons: [['取消', 'ghost'], [ok, 'green']] }).then(i => i === 1);

// 小提示（右下角）
export function toast(text, ms = 2600) {
  let el = document.getElementById('cm-toast');
  if (!el) { el = document.createElement('div'); el.id = 'cm-toast'; el.style.cssText = 'position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:70;background:rgba(11,46,28,.95);color:#f6f0e1;border:1px solid rgba(201,168,92,.6);border-radius:10px;padding:8px 14px;font-size:13px;max-width:88vw;text-align:center;transition:opacity .3s;pointer-events:none'; document.body.appendChild(el); }
  el.innerHTML = text; el.style.opacity = 1;
  clearTimeout(el._t); el._t = setTimeout(() => (el.style.opacity = 0), ms);
}

// 共用的小元件
export const bar = (v, max = 100, cls = '') => `<div class="cm-bar ${cls || (v / max < 0.3 ? 'bad' : v / max < 0.55 ? 'warn' : '')}"><i style="width:${Math.max(0, Math.min(100, v / max * 100))}%"></i></div>`;
export const tpHtml = v => `<span class="${v < 0 ? 'under' : ''}">${toPar(v)}</span>`;
export function loading(on, text) { ui.ctx.ui.loading(on, text); }
