/* Workout — 核心：工具、UI 元件、資料快取、路由。各功能頁以 W.route() 註冊。 */
window.W = (function () {
  const { call, isDemo, apiUrl, LS } = window.API;

  /* ---------------- 狀態 ---------------- */
  const S = {
    session: LS.get('wo.session', null),
    data: { inbody: [], weight: [], workout: [], food: [], settings: {} },
    loaded: false,
    syncing: false,
    backendOld: false,
    draft: null,
  };
  const COLS = ['inbody', 'weight', 'workout', 'food'];
  const cacheKey = () => 'wo.cache.v2.' + (S.session ? S.session.account : '');
  function loadCache() {
    const c = LS.get(cacheKey(), null);
    if (c) Object.assign(S.data, c);
    else {
      // 舊版只快取 InBody
      const old = LS.get('wo.cache.inbody.' + (S.session ? S.session.account : ''), null);
      if (old) S.data.inbody = old;
    }
  }
  if (S.session) loadCache();
  const saveCache = () => LS.set(cacheKey(), S.data);

  const sortKey = (r) => String(r.date || '') + ' ' + String(r.time || '');
  function setCol(col, list) {
    S.data[col] = (list || []).slice().sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
    saveCache();
  }
  function put(col, rec) {
    setCol(col, S.data[col].filter((x) => x.id !== rec.id).concat([rec]));
    return rec;
  }
  function drop(col, id) { setCol(col, S.data[col].filter((x) => x.id !== id)); }
  function setSettings(obj) { S.data.settings = obj || {}; saveCache(); }

  async function sync() {
    try {
      const d = await call('sync');
      COLS.forEach((c) => (S.data[c] = (d[c] || []).slice().sort((a, b) => sortKey(a).localeCompare(sortKey(b)))));
      S.data.settings = d.settings || {};
      S.backendOld = false;
    } catch (e) {
      if (e.code !== 'UNKNOWN_ACTION') throw e;
      // 後端還是舊版：至少把 InBody 拿回來
      S.backendOld = true;
      S.data.inbody = await call('inbody.list');
    }
    applyQueue();
    saveCache();
    S.loaded = true;
    setTimeout(() => flush(), 300);
  }

  /* ---------------- 工具 ---------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const has = (v) => v !== undefined && v !== null && v !== '' && !(typeof v === 'number' && isNaN(v));
  const num = (v, d) => {
    if (!has(v)) return '–';
    if (d != null) return Number(v).toFixed(d);
    return String(+Number(v).toFixed(2));
  };
  const signed = (v, d = 1) => (!has(v) ? '–' : (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toFixed(d));
  const round = (v, d = 0) => Math.round(v * Math.pow(10, d)) / Math.pow(10, d);
  const sum = (arr, f) => arr.reduce((s, x) => s + (Number(f ? f(x) : x) || 0), 0);
  const WD = ['日', '一', '二', '三', '四', '五', '六'];
  const p2 = (n) => String(n).padStart(2, '0');

  function parseDate(s) {
    const m = String(s || '').match(/(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
  }
  const ymd = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  const today = () => ymd(new Date());
  const nowHM = () => { const d = new Date(); return `${p2(d.getHours())}:${p2(d.getMinutes())}`; };
  const dayOf = (s) => String(s || '').slice(0, 10);
  function addDays(s, n) { const d = parseDate(s) || new Date(); d.setDate(d.getDate() + n); return ymd(d); }
  function weekStart(s) { const d = parseDate(s) || new Date(); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return ymd(d); }
  function daysBetween(a, b) { return Math.round((parseDate(b) - parseDate(a)) / 864e5); }

  function fmtDate(s, mode) {
    const d = parseDate(s);
    if (!d) return esc(s || '');
    if (mode === 'short') return `${d.getMonth() + 1}/${d.getDate()}`;
    if (mode === 'md') return `${d.getMonth() + 1}月${d.getDate()}日`;
    if (mode === 'mdw') return `${d.getMonth() + 1}月${d.getDate()}日 週${WD[d.getDay()]}`;
    if (mode === 'sw') return `${d.getMonth() + 1}/${d.getDate()}（${WD[d.getDay()]}）`;
    if (mode === 'day') return `${d.getFullYear()}.${p2(d.getMonth() + 1)}.${p2(d.getDate())}`;
    return `${d.getFullYear()}.${p2(d.getMonth() + 1)}.${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
  }
  function relDay(s) {
    const n = daysBetween(dayOf(s), today());
    if (isNaN(n)) return '';
    return n < 0 ? (n === -1 ? '明天' : `${-n} 天後`) : n === 0 ? '今天' : n === 1 ? '昨天' : `${n} 天前`;
  }

  /* ---------------- 圖示 ---------------- */
  const ICON = {
    home: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
    body: '<circle cx="12" cy="4.8" r="2.2"/><path d="M7 9h10M12 9v6m0 0-3 6m3-6 3 6M7 9l-1.5 5M17 9l1.5 5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    dumbbell: '<path d="M3 10v4M6 7.5v9M18 7.5v9M21 10v4M6 12h12"/>',
    user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c1.2-3.6 4-5.2 7.5-5.2s6.3 1.6 7.5 5.2"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    back: '<path d="m15 6-6 6 6 6"/>',
    camera: '<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.4-2h6.2l1.4 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="12.8" r="3.4"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    trash: '<path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    warn: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2v.3"/>',
    calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
    food: '<path d="M7 3v8a2 2 0 0 0 2 2v8M5 3v5M9 3v5M16.5 21V3c-2 1-3.5 3.5-3.5 7s1.5 4 3.5 4"/>',
    ruler: '<path d="M3.5 15.5 15.5 3.5l5 5-12 12z"/><path d="m7 12 2 2M10 9l2 2M13 6l2 2"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".6"/>',
    chart: '<path d="M4 19h16"/><path d="m5 15 4.5-5 4 3L19 7"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m20.5 16-5-5-8.5 8.5"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    download: '<path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14"/>',
    refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4"/>',
    logout: '<path d="M14 4.5H6.5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1H14M10.5 12H20m0 0-3.5-3.5M20 12l-3.5 3.5"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    sparkle: '<path d="M12 3.5 13.8 10l6.7 2-6.7 2L12 20.5 10.2 14 3.5 12l6.7-2z"/>',
    scale: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8.5 9a5 5 0 0 1 7 0l-2.2 2.6a1.7 1.7 0 0 0-2.6 0z"/>',
    whistle: '<circle cx="8.5" cy="14.5" r="5"/><path d="M12 11 20.5 7v4.5L13.5 13"/><circle cx="8.5" cy="14.5" r="1.2"/>',
    note: '<path d="M6 3.5h9l3.5 3.5v13.5H6z"/><path d="M14.5 3.5V7.5h4M9 12h6.5M9 15.5h6.5"/>',
    search: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5v1.5A3.5 3.5 0 0 0 8 11M16 6h3.5v1.5A3.5 3.5 0 0 1 16 11M12 13v4M8.5 20.5h7M10 17h4v3.5h-4z"/>',
    flame: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.8 3-5.6 3.7-9.3 2.3 1.4 3.6 3.6 3.8 5.7.8-.6 1.4-1.7 1.6-2.9 2.1 1.7 3.9 4.1 3.9 6.5 0 3.6-2.6 6.2-6.5 6.2z"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  };
  const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[n] || ''}</svg>`;

  /* ---------------- UI 元件 ---------------- */
  function toast(msg, type = '') {
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2600);
  }

  function sheet(html, onMount, opts = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'sheet-wrap';
    wrap.innerHTML = `<div class="sheet-bg"></div><div class="sheet ${opts.tall ? 'tall' : ''}"><div class="sheet-grip"></div>${html}</div>`;
    document.body.appendChild(wrap);
    document.body.classList.add('sheet-open');
    requestAnimationFrame(() => wrap.classList.add('show'));
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      wrap.classList.remove('show');
      setTimeout(() => { wrap.remove(); if (!$('.sheet-wrap')) document.body.classList.remove('sheet-open'); }, 260);
      opts.onClose && opts.onClose();
    };
    $('.sheet-bg', wrap).onclick = close;
    onMount && onMount(wrap, close);
    return close;
  }

  function confirmSheet(title, text, okLabel, danger) {
    return new Promise((resolve) => {
      let answered = false;
      sheet(`<div class="sheet-body">
          <h3>${esc(title)}</h3><p class="muted">${esc(text)}</p>
          <div class="btn-row"><button class="btn ghost" data-a="no">取消</button>
          <button class="btn ${danger ? 'danger' : 'primary'}" data-a="yes">${esc(okLabel)}</button></div></div>`,
      (w, cl) => {
        $$('[data-a]', w).forEach((b) => (b.onclick = () => { answered = true; resolve(b.dataset.a === 'yes'); cl(); }));
      }, { onClose: () => { if (!answered) resolve(false); } });
    });
  }

  function busy(on, text) {
    let el = $('#busy');
    if (on) {
      if (!el) {
        el = document.createElement('div');
        el.id = 'busy';
        el.innerHTML = '<div class="busy-card"><div class="spinner"></div><div class="busy-text"></div></div>';
        document.body.appendChild(el);
      }
      $('.busy-text', el).textContent = text || '處理中…';
      requestAnimationFrame(() => el.classList.add('show'));
    } else if (el) {
      el.classList.remove('show');
      setTimeout(() => el && el.remove(), 200);
    }
  }

  /** 呼叫 API 並統一處理錯誤；失敗回傳 null */
  async function act(text, fn) {
    if (text) busy(true, text);
    try {
      const r = await fn();
      busy(false);
      return r;
    } catch (e) {
      busy(false);
      if (e.code === 'AUTH' || e.code === 'PENDING') { logout(); toast(e.message, 'err'); return null; }
      if (e.code === 'UNKNOWN_ACTION') { toast('後端需要更新到新版本（見 README）', 'err'); return null; }
      toast(e.message || '發生錯誤', 'err');
      return null;
    }
  }

  function logout() {
    LS.del('wo.session');
    S.session = null;
    S.data = { inbody: [], weight: [], workout: [], food: [], settings: {} };
    S.loaded = false;
    location.hash = '#/login';
    render();
  }

  function login(sess) {
    S.session = sess;
    LS.set('wo.session', sess);
    S.data = { inbody: [], weight: [], workout: [], food: [], settings: {} };
    loadCache();
    S.loaded = false;
  }

  /* 共用小元件 */
  const back = (to) => `<a class="nav-back" href="${to}">${icon('back')}</a>`;
  const pageHead = (title, eyebrow, opts = {}) => `<header class="page-head row">
      ${opts.back ? back(opts.back) : ''}
      <div class="grow">${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ''}<h1>${title}</h1></div>
      ${opts.right || ''}</header>`;
  const segNav = (items, active, tone = '') => `<nav class="seg-nav ${tone}">${items.map(([href, label, key]) =>
    `<a href="${href}" class="${key === active ? 'on' : ''}">${label}</a>`).join('')}</nav>`;
  const empty = (ic, title, text, actions = '') => `<div class="card empty-state">${icon(ic, 'xl')}<h3>${title}</h3><p class="muted">${text}</p>${actions ? `<div class="btn-row center">${actions}</div>` : ''}</div>`;

  /** 數字步進輸入（體重等） */
  function stepper(name, value, step = 0.1, dec = 1) {
    return `<div class="stepper" data-step="${step}" data-dec="${dec}">
      <button type="button" data-d="-1">${icon('minus')}</button>
      <input name="${name}" inputmode="decimal" value="${has(value) ? Number(value).toFixed(dec) : ''}">
      <button type="button" data-d="1">${icon('plus')}</button></div>`;
  }
  function bindSteppers(root) {
    $$('.stepper', root).forEach((st) => {
      const inp = $('input', st);
      const step = +st.dataset.step, dec = +st.dataset.dec;
      $$('button', st).forEach((b) => (b.onclick = () => {
        const v = parseFloat(inp.value) || 0;
        inp.value = Math.max(0, v + step * +b.dataset.d).toFixed(dec);
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      }));
    });
  }

  /* ---------------- Router ---------------- */
  const routes = [];
  function route(re, fn, opt = {}) { routes.push([re, fn, opt]); }

  let seq = 0;
  async function render() {
    const my = ++seq;
    const hash = location.hash || '#/home';
    if (!S.session && hash !== '#/login') { location.replace('#/login'); return; }
    if (S.session && hash === '#/login') { location.replace('#/home'); return; }
    if (S.session && !S.loaded && !S.syncing) backgroundSync();
    let match = null;
    for (const [re, fn, opt] of routes) {
      const m = hash.split('?')[0].match(re);
      if (m) { match = { fn, opt, args: m.slice(1).map(decodeURIComponent) }; break; }
    }
    if (!match) { location.replace('#/home'); return; }
    const tab = match.opt.tab;
    const tabbar = $('#tabbar');
    tabbar.hidden = tab === false || tab === undefined && match.opt.sub;
    document.body.classList.toggle('no-tab', tabbar.hidden);
    $$('#tabbar [data-tab]').forEach((a) => a.classList.toggle('on', a.dataset.tab === tab));
    const bodyLink = $('#tabbar [data-tab=body]');
    if (bodyLink) bodyLink.setAttribute('href', LS.get('wo.bodyTab', '#/weight'));
    const html = await match.fn(...match.args);
    if (my !== seq || html == null) return;
    const view = $('#view');
    const keepScroll = render.keepScroll;
    render.keepScroll = false;
    const y = window.scrollY;
    view.innerHTML = html;
    if (!keepScroll) {
      view.classList.remove('enter');
      void view.offsetWidth;
      view.classList.add('enter');
      window.scrollTo(0, 0);
    } else window.scrollTo(0, y);
    if (match.fn.mount) match.fn.mount(view, ...match.args);
  }

  async function backgroundSync() {
    S.syncing = true;
    try {
      const before = JSON.stringify(S.data);
      await sync();
      if (JSON.stringify(S.data) !== before && !/^#\/(login|.*\/(new|edit|review|scan).*)$/.test(location.hash)) {
        render.keepScroll = true;
        render();
      }
    } catch (e) {
      if (e.code === 'AUTH' || e.code === 'PENDING') { logout(); toast(e.message, 'err'); }
    } finally {
      S.syncing = false;
    }
  }

  function query() {
    const q = {};
    const s = location.hash.split('?')[1];
    if (s) s.split('&').forEach((kv) => { const [k, v] = kv.split('='); q[k] = decodeURIComponent(v || ''); });
    return q;
  }

  /* ---------------- 共用計算 ---------------- */
  const latest = (col) => S.data[col][S.data[col].length - 1];
  const latestInbody = () => latest('inbody');

  /** 每日體重序列（每天一筆，InBody 優先） */
  function weightSeries() {
    const byDay = {};
    S.data.weight.forEach((w) => {
      const k = dayOf(w.date);
      if (!byDay[k] || w.source === 'InBody') byDay[k] = { date: k, value: w.weight, source: w.source, id: w.id, inbodyId: w.inbodyId, note: w.note };
    });
    // 後端舊版或尚未同步時，用 InBody 補
    S.data.inbody.forEach((r) => {
      const k = dayOf(r.date);
      if (has(r.weight) && (!byDay[k] || byDay[k].source !== 'InBody')) byDay[k] = { date: k, value: r.weight, source: 'InBody', inbodyId: r.id };
    });
    return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
  }
  function movingAvg(series, days = 7) {
    return series.map((p) => {
      const win = series.filter((q) => q.date <= p.date && daysBetween(q.date, p.date) < days);
      return { date: p.date, value: sum(win, (q) => q.value) / win.length };
    });
  }
  function targetWeight() {
    const st = S.data.settings || {};
    if (has(st.targetWeight)) return +st.targetWeight;
    const ib = latestInbody();
    return ib && has(ib.target_weight) ? ib.target_weight : null;
  }

  /** 營養目標 */
  function nutritionTargets() {
    const st = S.data.settings || {};
    const ib = latestInbody();
    const ws = weightSeries();
    const bw = ws.length ? ws[ws.length - 1].value : ib && ib.weight;
    const kcal = has(st.kcal) ? +st.kcal : ib && has(ib.kcal_rec) ? ib.kcal_rec : 2000;
    const protein = has(st.protein) ? +st.protein : ib && has(ib.ffm) ? round(ib.ffm * 2) : bw ? round(bw * 1.6) : 100;
    const fat = has(st.fat) ? +st.fat : round((kcal * 0.25) / 9);
    const carb = has(st.carb) ? +st.carb : Math.max(0, round((kcal - protein * 4 - fat * 9) / 4));
    const fiber = has(st.fiber) ? +st.fiber : 25;
    return { kcal, protein, fat, carb, fiber, custom: has(st.kcal) };
  }

  /* ---------------- 離線佇列：沒網路時先存在手機，連線後自動上傳 ---------------- */
  const QKEY = () => 'wo.queue.' + (S.session ? S.session.account : '');
  const queue = () => LS.get(QKEY(), []);
  const setQueue = (q) => { LS.set(QKEY(), q); updateBanner(); };
  const isLocal = (id) => String(id || '').startsWith('local-');
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const offline = () => navigator.onLine === false;
  const COL_NAME = { weight: '體重', workout: '訓練', food: '飲食' };

  function updateBanner() {
    const n = S.session ? queue().length : 0;
    let el = document.getElementById('offlineBar');
    if (!n) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('button');
      el.id = 'offlineBar';
      el.onclick = () => flush(true);
      document.body.appendChild(el);
    }
    el.innerHTML = `${icon('refresh')}${offline() ? '離線中・' : ''}${n} 筆待上傳${offline() ? '' : '・點此重試'}`;
  }

  function applyQueue() {
    queue().forEach((it) => {
      if (it.op === 'save') {
        S.data[it.col] = S.data[it.col].filter((x) => x.id !== it.rec.id && !(it.col === 'weight' && x.date === it.rec.date && x.source !== 'InBody'));
        S.data[it.col].push(it.rec);
      } else S.data[it.col] = S.data[it.col].filter((x) => x.id !== it.id);
    });
    COLS.forEach((c) => S.data[c].sort((a, b) => sortKey(a).localeCompare(sortKey(b))));
  }

  /** 儲存（體重 / 訓練 / 飲食）：失敗於網路時改存佇列 */
  async function save(col, rec) {
    const action = col === 'weight' ? 'weight.save' : 'data.save';
    if (!isLocal(rec.id) && !offline()) {
      try { return await call(action, { col, record: rec }); } catch (e) { if (e.code !== 'NETWORK') throw e; }
    }
    const local = Object.assign({}, rec, { id: rec.id || 'local-' + uid(), _pending: true, updatedAt: ymd(new Date()) + ' ' + nowHM() });
    const q = queue().filter((x) => !(x.op === 'save' && x.rec.id === local.id));
    q.push({ qid: uid(), op: 'save', col, action, rec: local });
    setQueue(q);
    toast(offline() || !isLocal(rec.id) ? '目前沒有網路，已先存在手機，連線後自動上傳' : '已更新（等待上傳）');
    if (!offline()) setTimeout(() => flush(), 500);
    return local;
  }

  async function del(col, id) {
    if (isLocal(id)) { setQueue(queue().filter((x) => !(x.rec && x.rec.id === id))); return { id }; }
    if (!offline()) {
      try { return await call('data.delete', { col, id }); } catch (e) { if (e.code !== 'NETWORK') throw e; }
    }
    setQueue(queue().filter((x) => !(x.op === 'save' && x.rec.id === id)).concat([{ qid: uid(), op: 'delete', col, id }]));
    toast('目前沒有網路，連線後會自動刪除');
    return { id };
  }

  let flushing = false;
  async function flush(manual) {
    if (flushing || !S.session || !queue().length) { updateBanner(); return; }
    if (offline()) { if (manual) toast('還沒有網路'); updateBanner(); return; }
    flushing = true;
    let done = 0;
    try {
      for (const it of queue()) {
        try {
          if (it.op === 'save') {
            const rec = Object.assign({}, it.rec);
            delete rec._pending;
            if (isLocal(rec.id)) rec.id = '';
            const saved = await call(it.action, { col: it.col, record: rec });
            S.data[it.col] = S.data[it.col].filter((x) => x.id !== it.rec.id && x.id !== saved.id && !(it.col === 'weight' && x.date === saved.date && x.source !== 'InBody'));
            put(it.col, saved);
            if (location.hash.includes(it.rec.id)) location.replace(location.hash.replace(it.rec.id, saved.id));
          } else {
            await call('data.delete', { col: it.col, id: it.id }).catch((e) => { if (e.code !== 'NOT_FOUND') throw e; });
          }
          done++;
        } catch (e) {
          if (e.code === 'NETWORK' || e.code === 'AUTH' || e.code === 'PENDING') break;
          // 資料本身有問題（例如當天已有 InBody）：放棄這筆並告知
          toast(`一筆${COL_NAME[it.col] || ''}紀錄無法上傳：${e.message}`, 'err');
          if (it.op === 'save' && isLocal(it.rec.id)) drop(it.col, it.rec.id);
        }
        setQueue(queue().filter((x) => x.qid !== it.qid));
      }
    } finally {
      flushing = false;
      updateBanner();
    }
    if (done) {
      toast(`已上傳 ${done} 筆離線紀錄`, 'ok');
      render.keepScroll = true;
      render();
    }
  }
  window.addEventListener('online', () => { updateBanner(); flush(); });
  window.addEventListener('offline', updateBanner);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') flush(); });

  async function saveSettings(patch) {
    if (S.backendOld) { toast('後端需要更新才能儲存設定', 'err'); return null; }
    const r = await act('儲存中…', () => call('settings', { data: patch }));
    if (r) setSettings(r);
    return r;
  }

  function compressImage(file, maxDim, quality) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, maxDim / Math.max(img.width, img.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        const dataUrl = cv.toDataURL('image/jpeg', quality);
        URL.revokeObjectURL(url);
        resolve({ preview: dataUrl, data: dataUrl.split(',')[1], mimeType: 'image/jpeg' });
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  return {
    S, LS, call, isDemo, apiUrl, compressImage,
    setCol, put, drop, setSettings, sync, saveSettings,
    $, $$, esc, has, num, signed, round, sum, WD, p2,
    parseDate, ymd, today, nowHM, dayOf, addDays, weekStart, daysBetween, fmtDate, relDay,
    icon, toast, sheet, confirmSheet, busy, act, logout, login,
    back, pageHead, segNav, empty, stepper, bindSteppers,
    route, render, query, save, del, flush, updateBanner, uid,
    latest, latestInbody, weightSeries, movingAvg, targetWeight, nutritionTargets,
  };
})();
