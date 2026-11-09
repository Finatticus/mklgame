/* Workout — 主程式（hash router + views） */
(function () {
  const { call, isDemo, apiUrl, LS } = window.API;
  const { GROUPS, SEGMENTS, EXERCISES, METRICS, allKeys, TEXT_KEYS } = window.SCHEMA;
  const C = window.Charts;

  /* ---------------- 狀態 ---------------- */
  const S = {
    session: LS.get('wo.session', null), // {account, token}
    records: [],
    loaded: false,
    draft: null, // {record, photo, notes, source, editId}
    metric: LS.get('wo.metric', 'weight'),
    segMode: 'lean',
  };
  if (S.session) S.records = LS.get(cacheKey(), []);

  function cacheKey() { return 'wo.cache.inbody.' + (S.session ? S.session.account : ''); }
  function setRecords(list) {
    S.records = list.slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
    LS.set(cacheKey(), S.records);
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
  const WD = ['日', '一', '二', '三', '四', '五', '六'];
  function fmtDate(s, mode) {
    const d = C.parseDate(s);
    if (!d) return esc(s || '');
    const p = (n) => String(n).padStart(2, '0');
    if (mode === 'short') return `${d.getMonth() + 1}/${d.getDate()}`;
    if (mode === 'day') return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
    return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  function relDays(s) {
    const d = C.parseDate(s);
    if (!d) return '';
    const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 864e5);
    return days < 0 ? '' : days === 0 ? '今天' : days === 1 ? '昨天' : `${days} 天前`;
  }

  const ICON = {
    home: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
    body: '<circle cx="12" cy="4.8" r="2.2"/><path d="M7 9h10M12 9v6m0 0-3 6m3-6 3 6M7 9l-1.5 5M17 9l1.5 5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
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
    list: '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.8" cy="6.5" r=".8"/><circle cx="4.8" cy="12" r=".8"/><circle cx="4.8" cy="17.5" r=".8"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m20.5 16-5-5-8.5 8.5"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    download: '<path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14"/>',
    refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4"/>',
    logout: '<path d="M14 4.5H6.5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1H14M10.5 12H20m0 0-3.5-3.5M20 12l-3.5 3.5"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    sparkle: '<path d="M12 3.5 13.8 10l6.7 2-6.7 2L12 20.5 10.2 14 3.5 12l6.7-2z"/>',
  };
  const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[n] || ''}</svg>`;

  function toast(msg, type = '') {
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2600);
  }

  function sheet(html, onMount) {
    const wrap = document.createElement('div');
    wrap.className = 'sheet-wrap';
    wrap.innerHTML = `<div class="sheet-bg"></div><div class="sheet"><div class="sheet-grip"></div>${html}</div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('show'));
    const close = () => { wrap.classList.remove('show'); setTimeout(() => wrap.remove(), 260); };
    $('.sheet-bg', wrap).onclick = close;
    onMount && onMount(wrap, close);
    return close;
  }

  function confirmSheet(title, text, okLabel, danger) {
    return new Promise((resolve) => {
      let done = false;
      const close = sheet(`<div class="sheet-body">
          <h3>${esc(title)}</h3><p class="muted">${esc(text)}</p>
          <div class="btn-row"><button class="btn ghost" data-a="no">取消</button>
          <button class="btn ${danger ? 'danger' : 'primary'}" data-a="yes">${esc(okLabel)}</button></div></div>`,
        (w, cl) => {
          $$('[data-a]', w).forEach((b) => (b.onclick = () => { done = true; resolve(b.dataset.a === 'yes'); cl(); }));
          $('.sheet-bg', w).addEventListener('click', () => { if (!done) resolve(false); });
        });
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

  async function guard(fn) {
    try { return await fn(); } catch (e) {
      busy(false);
      if (e.code === 'AUTH' || e.code === 'PENDING') { logout(); toast(e.message, 'err'); return; }
      toast(e.message || '發生錯誤', 'err');
      throw e;
    }
  }

  /* ---------------- 資料 ---------------- */
  async function loadRecords(force) {
    if (S.loaded && !force) return S.records;
    const list = await call('inbody.list');
    setRecords(list || []);
    S.loaded = true;
    return S.records;
  }
  const latest = () => S.records[S.records.length - 1];
  const prevOf = (rec) => {
    const i = S.records.findIndex((r) => r.id === rec.id);
    return i > 0 ? S.records[i - 1] : null;
  };

  function logout() {
    LS.del('wo.session');
    S.session = null; S.records = []; S.loaded = false;
    location.hash = '#/login';
    render();
  }

  /* ---------------- Router ---------------- */
  const routes = [
    [/^#\/login$/, viewLogin, { auth: false, tab: false }],
    [/^#\/home$/, viewHome, { tab: 'home' }],
    [/^#\/inbody$/, viewInbody, { tab: 'inbody' }],
    [/^#\/inbody\/r\/([\w-]+)$/, viewDetail, { tab: 'inbody', sub: true }],
    [/^#\/inbody\/scan$/, viewScan, { tab: false, sub: true }],
    [/^#\/inbody\/new$/, viewNew, { tab: false, sub: true }],
    [/^#\/inbody\/edit\/([\w-]+)$/, viewEdit, { tab: false, sub: true }],
    [/^#\/inbody\/review$/, viewReview, { tab: false, sub: true }],
    [/^#\/training$/, viewTraining, { tab: 'training' }],
    [/^#\/me$/, viewMe, { tab: 'me' }],
  ];

  let renderSeq = 0;
  async function render() {
    const seq = ++renderSeq;
    let hash = location.hash || '#/home';
    if (!S.session && hash !== '#/login') { location.replace('#/login'); return; }
    if (S.session && hash === '#/login') { location.replace('#/home'); return; }
    if (S.session && !S.loaded && !S.syncing) {
      S.syncing = true;
      syncThenRefresh().finally(() => (S.syncing = false));
    }
    let match = null;
    for (const [re, fn, opt] of routes) {
      const m = hash.match(re);
      if (m) { match = { fn, opt, args: m.slice(1) }; break; }
    }
    if (!match) { location.replace('#/home'); return; }
    const view = $('#view');
    const tabbar = $('#tabbar');
    tabbar.hidden = match.opt.tab === false;
    document.body.classList.toggle('no-tab', match.opt.tab === false);
    $$('#tabbar [data-tab]').forEach((a) => a.classList.toggle('on', a.dataset.tab === match.opt.tab));
    const html = await match.fn(...match.args);
    if (seq !== renderSeq || html == null) return;
    view.innerHTML = html;
    view.classList.remove('enter');
    void view.offsetWidth;
    view.classList.add('enter');
    window.scrollTo(0, 0);
    const mount = match.fn.mount;
    if (mount) mount(view, ...match.args);
  }

  // 在背景同步資料後重繪目前頁面（不重設捲動）
  async function syncThenRefresh() {
    try {
      const before = JSON.stringify(S.records);
      await loadRecords(true);
      if (JSON.stringify(S.records) === before) return;
      const h = location.hash;
      if (/^#\/(home|inbody)(\/r\/.*)?$/.test(h) || h === '') render();
    } catch (e) {
      if (e.code === 'AUTH' || e.code === 'PENDING') { logout(); toast(e.message, 'err'); }
    }
  }

  const back = (to) => `<a class="nav-back" href="${to}" data-back>${icon('back')}</a>`;

  /* =========================================================
   * 登入 / 註冊
   * ========================================================= */
  function viewLogin() {
    return `<div class="auth">
      <div class="auth-top">
        <div class="brand-mark">${brandSvg()}</div>
        <h1 class="auth-title">Workout</h1>
        <p class="auth-sub">身體數據・訓練・教練課，一個地方記錄</p>
      </div>
      <div class="auth-card card">
        <div class="seg" role="tablist">
          <button class="on" data-mode="login">登入</button>
          <button data-mode="register">註冊</button>
        </div>
        <form id="authForm" autocomplete="on">
          <label class="field"><span>帳號</span>
            <input name="account" autocomplete="username" autocapitalize="off" spellcheck="false" required minlength="3"></label>
          <label class="field"><span>密碼</span>
            <input name="password" type="password" autocomplete="current-password" required minlength="4"></label>
          <button class="btn primary block" type="submit">登入</button>
        </form>
        <div id="authMsg"></div>
      </div>
      ${isDemo() ? `<p class="auth-foot">目前為<b>示範模式</b>（尚未連接後端），資料只存在此裝置。</p>` : ''}
    </div>`;
  }
  viewLogin.mount = (v) => {
    let mode = 'login';
    const form = $('#authForm', v);
    const msg = $('#authMsg', v);
    $$('.seg button', v).forEach((b) => (b.onclick = () => {
      mode = b.dataset.mode;
      $$('.seg button', v).forEach((x) => x.classList.toggle('on', x === b));
      $('button[type=submit]', form).textContent = mode === 'login' ? '登入' : '建立帳號';
      form.password.autocomplete = mode === 'login' ? 'current-password' : 'new-password';
      msg.innerHTML = '';
    }));
    form.onsubmit = async (e) => {
      e.preventDefault();
      const account = form.account.value.trim();
      const password = form.password.value;
      const btn = $('button[type=submit]', form);
      btn.disabled = true;
      msg.innerHTML = '';
      try {
        if (mode === 'register') {
          await call('register', { account, password });
          msg.innerHTML = isDemo()
            ? `<div class="notice ok">${icon('check')}<div><b>註冊成功</b><br>示範模式自動通過審核，可以直接登入。</div></div>`
            : `<div class="notice">${icon('check')}<div><b>註冊成功，等待審核</b><br>到 Google Sheets 的 <code>account</code> 工作頁，在該帳號的 C 欄輸入 <code>V</code> 後即可登入。</div></div>`;
          $$('.seg button', v)[0].click();
          form.account.value = account;
          form.password.value = '';
        } else {
          const data = await call('login', { account, password });
          S.session = { account: data.account, token: data.token };
          LS.set('wo.session', S.session);
          S.records = LS.get(cacheKey(), []);
          S.loaded = false;
          location.hash = '#/home';
        }
      } catch (err) {
        const pending = err.code === 'PENDING';
        msg.innerHTML = `<div class="notice ${pending ? '' : 'err'}">${icon(pending ? 'calendar' : 'warn')}<div>${esc(err.message)}${pending ? '<br><span class="muted">請到 Google Sheets 的 account 工作頁 C 欄輸入 V</span>' : ''}</div></div>`;
      } finally {
        btn.disabled = false;
      }
    };
  };

  function brandSvg() {
    return `<svg viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="13" fill="var(--ink)"/>
      <path d="M12 18v12M16.5 14.5v19M31.5 14.5v19M36 18v12M16.5 24h15" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/></svg>`;
  }

  /* =========================================================
   * 首頁
   * ========================================================= */
  async function viewHome() {
    const now = new Date();
    const hr = now.getHours();
    const hello = hr < 5 ? '夜深了' : hr < 11 ? '早安' : hr < 14 ? '午安' : hr < 18 ? '午安' : '晚安';
    const r = latest();
    const first = S.records[0];
    let hero = '';
    if (r) {
      const p = prevOf(r);
      const dW = p && has(r.weight) && has(p.weight) ? r.weight - p.weight : null;
      const target = r.target_weight;
      let progress = '';
      if (has(target) && has(r.weight)) {
        const start = Math.max(first.weight ?? r.weight, r.weight);
        const total = start - target;
        const doneKg = start - r.weight;
        const pct = total > 0 ? Math.max(0, Math.min(doneKg / total, 1)) * 100 : 100;
        const left = r.weight - target;
        progress = `<div class="goal">
          <div class="goal-row"><span>目標體重 <b>${num(target, 1)}</b> kg</span><span>${left > 0 ? `還差 <b>${num(left, 1)}</b> kg` : '已達成 🎯'}</span></div>
          <div class="goal-bar"><i style="width:${Math.max(pct, 2)}%"></i></div>
          <div class="goal-row sub"><span>起點 ${num(start, 1)}</span><span>已減 ${num(Math.max(doneKg, 0), 1)} kg</span></div>
        </div>`;
      }
      hero = `<a class="card hero" href="#/inbody/r/${r.id}">
        <div class="hero-top"><span class="eyebrow">最新身體組成</span><span class="hero-date">${fmtDate(r.date, 'day')}・${relDays(r.date)}</span></div>
        <div class="hero-main">
          <div><div class="big">${num(r.weight, 1)}<small>kg</small></div>
            <div class="delta ${dW == null ? '' : dW <= 0 ? 'good' : 'bad'}">${dW == null ? '第一次量測' : `較上次 ${signed(dW)} kg`}</div></div>
          ${C.ring(r.score, 100, 'InBody')}
        </div>
        <div class="stat3">
          <div><span>骨骼肌</span><b>${num(r.smm, 1)}<small>kg</small></b></div>
          <div><span>體脂率</span><b>${num(r.pbf, 1)}<small>%</small></b></div>
          <div><span>內臟脂肪</span><b>${num(r.vfl, 0)}<small>級</small></b></div>
        </div>
        ${progress}
      </a>`;
    } else {
      hero = `<div class="card hero empty">
        <span class="eyebrow">身體組成</span>
        <h3>還沒有 InBody 紀錄</h3>
        <p class="muted">拍下報告照片，AI 會讀出所有數值讓你確認後匯入。</p>
        <div class="btn-row"><a class="btn primary" href="#/inbody/scan">${icon('camera')}拍照匯入</a><a class="btn ghost" href="#/inbody/new">手動輸入</a></div>
      </div>`;
    }

    const seedCard = !S.records.some((x) => String(x.date).startsWith('2026-11-09')) && window.SEED_INBODY && S.session
      ? `<div class="card seed">
          <div class="seed-ic">${icon('sparkle')}</div>
          <div class="seed-txt"><b>11/09 教練課的 InBody 已轉錄好</b><span>共 ${Object.keys(window.SEED_INBODY).length} 項數值，確認無誤即可匯入</span></div>
          <button class="btn sm primary" id="seedBtn">檢查並匯入</button>
        </div>` : '';

    const tiles = [
      { href: '#/inbody', ic: 'body', t: '身體組成', d: S.records.length ? `${S.records.length} 筆 InBody` : 'InBody 紀錄', on: true },
      { href: '#/training', ic: 'dumbbell', t: '訓練日誌', d: '即將推出' },
      { href: '#/training', ic: 'calendar', t: '教練課程', d: '即將推出' },
      { href: '#/training', ic: 'food', t: '飲食紀錄', d: '即將推出' },
      { href: '#/training', ic: 'ruler', t: '身體圍度', d: '即將推出' },
      { href: '#/training', ic: 'target', t: '目標設定', d: '即將推出' },
    ];

    return `<header class="page-head">
        <div class="eyebrow">${now.getMonth() + 1}月${now.getDate()}日 星期${WD[now.getDay()]}</div>
        <h1>${hello}，${esc(S.session.account)}</h1>
      </header>
      ${seedCard}
      ${hero}
      <div class="sec-head"><h2>功能</h2></div>
      <div class="tiles">${tiles.map((x) => `<a class="tile ${x.on ? '' : 'soon'}" href="${x.href}">
          <span class="tile-ic">${icon(x.ic)}</span><b>${x.t}</b><span>${x.d}</span></a>`).join('')}</div>
      ${r ? insightCard(r) : ''}
      <div class="foot-space"></div>`;
  }
  viewHome.mount = (v) => {
    const b = $('#seedBtn', v);
    if (b) b.onclick = () => {
      S.draft = { record: Object.assign({}, window.SEED_INBODY), photo: null, notes: '', source: 'seed' };
      location.hash = '#/inbody/review';
    };
  };

  function insightCard(r) {
    const items = [];
    if (has(r.fat_ctrl) && r.fat_ctrl < 0) items.push(['脂肪', `建議減少 <b>${num(-r.fat_ctrl, 1)} kg</b> 體脂肪`]);
    if (has(r.muscle_ctrl)) items.push(['肌肉', r.muscle_ctrl > 0 ? `建議增加 <b>${num(r.muscle_ctrl, 1)} kg</b> 肌肉` : '肌肉量已達標準，<b>維持</b>即可']);
    if (has(r.vfl)) items.push(['內臟脂肪', r.vfl >= 10 ? `級別 <b>${r.vfl}</b>，已超過標準 (≤9)` : `級別 <b>${r.vfl}</b>，標準 ≤ 9${r.vfl >= 8 ? '，接近上限' : ''}`]);
    if (has(r.kcal_rec)) items.push(['熱量', `建議每日攝取 <b>${num(r.kcal_rec, 0)} kcal</b>・基礎代謝 ${num(r.bmr, 0)}`]);
    if (!items.length) return '';
    return `<div class="sec-head"><h2>重點</h2><span class="muted sm">依 ${fmtDate(r.date, 'short')} 量測</span></div>
      <div class="card list-card">${items.map(([k, t]) => `<div class="li"><span class="li-k">${k}</span><span class="li-v">${t}</span></div>`).join('')}</div>`;
  }

  /* =========================================================
   * InBody 總覽：趨勢 + 歷程
   * ========================================================= */
  async function viewInbody() {
    const recs = S.records;
    const head = `<header class="page-head row">
        <div class="grow"><div class="eyebrow">InBody</div><h1>身體組成</h1></div>
        <button class="icon-btn solid" id="addBtn" aria-label="新增">${icon('plus')}</button>
      </header>`;
    if (!recs.length) {
      return head + `<div class="card empty-state">${icon('chart', 'xl')}<h3>還沒有紀錄</h3>
        <p class="muted">新增第一筆 InBody 後，這裡會出現各項指標的趨勢。</p>
        <div class="btn-row center"><a class="btn primary" href="#/inbody/scan">${icon('camera')}拍照匯入</a><a class="btn ghost" href="#/inbody/new">手動輸入</a></div></div>`;
    }
    const r = latest();
    const first = recs[0];
    const kpi = [
      ['weight', '體重', 'kg', 1, 'down'], ['smm', '骨骼肌', 'kg', 1, 'up'],
      ['pbf', '體脂率', '%', 1, 'down'], ['bfm', '體脂肪', 'kg', 1, 'down'],
    ].map(([k, l, u, d, better]) => {
      const dv = recs.length > 1 && has(r[k]) && has(first[k]) ? r[k] - first[k] : null;
      const good = dv == null || dv === 0 ? '' : (dv < 0) === (better === 'down') ? 'good' : 'bad';
      return `<div class="kpi"><span>${l}</span><b>${num(r[k], d)}<small>${u}</small></b>
        <em class="${good}">${dv == null ? '&nbsp;' : `累計 ${signed(dv, d)}`}</em></div>`;
    }).join('');

    return head + `
      <div class="kpis">${kpi}</div>
      <div class="sec-head"><h2>趨勢</h2><span class="muted sm">${recs.length} 次量測</span></div>
      <div class="chips" id="metricChips">${METRICS.map((m) => `<button class="chip ${m.k === S.metric ? 'on' : ''}" data-k="${m.k}">${m.label}</button>`).join('')}</div>
      <div class="card chart-card" id="chartCard"></div>
      <div class="sec-head"><h2>組成歷程</h2></div>
      <div class="card hist">${historyTable(recs)}</div>
      <div class="sec-head"><h2>所有紀錄</h2></div>
      <div class="card list-card">${recs.slice().reverse().map((x) => `<a class="rec" href="#/inbody/r/${x.id}">
          <div class="rec-date"><b>${fmtDate(x.date, 'short')}</b><span>${C.parseDate(x.date) ? C.parseDate(x.date).getFullYear() : ''}</span></div>
          <div class="rec-vals"><span><i>體重</i>${num(x.weight, 1)}</span><span><i>骨骼肌</i>${num(x.smm, 1)}</span><span><i>體脂率</i>${num(x.pbf, 1)}%</span><span><i>分數</i>${num(x.score, 0)}</span></div>
          ${icon('chevron', 'chev')}</a>`).join('')}</div>
      <div class="foot-space"></div>`;
  }
  viewInbody.mount = (v) => {
    const addBtn = $('#addBtn', v);
    if (addBtn) addBtn.onclick = openAddSheet;
    const card = $('#chartCard', v);
    if (!card) return;
    const draw = () => {
      const m = METRICS.find((x) => x.k === S.metric) || METRICS[0];
      card.innerHTML = metricChart(m);
      bindChartTap(card, m);
    };
    $$('#metricChips .chip', v).forEach((b) => (b.onclick = () => {
      S.metric = b.dataset.k; LS.set('wo.metric', S.metric);
      $$('#metricChips .chip', v).forEach((x) => x.classList.toggle('on', x === b));
      draw();
    }));
    draw();
    const on = $('#metricChips .chip.on', v);
    if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
  };

  function metricBand(m, r) {
    if (m.lo && has(r[m.lo]) && has(r[m.hi])) return [r[m.lo], r[m.hi]];
    if (m.band) return m.band(r);
    return null;
  }

  function metricChart(m) {
    const recs = S.records.filter((r) => has(r[m.k]));
    const r = recs[recs.length - 1];
    if (!r) return `<div class="chart-head"><div><span class="muted">${m.label}</span></div></div><div class="chart-empty">這個指標還沒有資料</div>`;
    const p = recs.length > 1 ? recs[recs.length - 2] : null;
    const f = recs[0];
    const band = metricBand(m, r);
    const dPrev = p ? r[m.k] - p[m.k] : null;
    const dFirst = recs.length > 1 ? r[m.k] - f[m.k] : null;
    const cls = (dv) => (dv == null || dv === 0 ? '' : (dv < 0) === (m.better === 'down') ? 'good' : 'bad');
    const state = band ? (r[m.k] < band[0] ? ['低於標準', 'low'] : r[m.k] > band[1] ? ['高於標準', 'high'] : ['標準範圍', 'ok']) : null;
    return `<div class="chart-head">
        <div><span class="muted">${m.label}</span>
          <div class="chart-v"><b data-cv>${num(r[m.k], m.d)}</b><small>${m.unit}</small>
          ${state ? `<span class="pill ${state[1]}">${state[0]}</span>` : ''}</div>
          <div class="muted sm" data-cd>${fmtDate(r.date, 'day')}${band ? `・標準 ${band[0]}–${band[1]}` : ''}</div></div>
        <div class="chart-deltas">
          <div><span>較上次</span><b class="${cls(dPrev)}">${dPrev == null ? '–' : signed(dPrev, m.d)}</b></div>
          <div><span>較第一次</span><b class="${cls(dFirst)}">${dFirst == null ? '–' : signed(dFirst, m.d)}</b></div>
        </div>
      </div>
      ${C.line({ points: recs.map((x) => ({ date: x.date, value: x[m.k], id: x.id })), band, unit: m.unit, decimals: m.d, id: m.k })}
      ${recs.length < 2 ? '<p class="muted sm center">再量一次就能看到變化趨勢</p>' : ''}`;
  }

  function bindChartTap(card, m) {
    const recs = S.records.filter((r) => has(r[m.k]));
    $$('.hit', card).forEach((h) => (h.onclick = () => {
      const x = recs[+h.dataset.i];
      $('[data-cv]', card).textContent = num(x[m.k], m.d);
      $('[data-cd]', card).innerHTML = `${fmtDate(x.date, 'day')}・<a href="#/inbody/r/${x.id}">查看這次報告 ›</a>`;
      $$('.dot', card).forEach((d, i) => d.classList.toggle('sel', i === +h.dataset.i));
    }));
  }

  function historyTable(recs) {
    const rows = [['weight', '體重', 'kg', 1], ['smm', '骨骼肌', 'kg', 1], ['bfm', '體脂肪', 'kg', 1], ['pbf', '體脂率', '%', 1], ['vfl', '內臟脂肪', '級', 0], ['score', '分數', '', 0]];
    const cols = recs.slice(-6);
    return `<div class="hist-scroll"><table>
      <thead><tr><th></th>${cols.map((r) => `<th>${fmtDate(r.date, 'short')}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(([k, l, u, d]) => `<tr><th>${l}<small>${u}</small></th>${cols.map((r) => `<td>${num(r[k], d)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>`;
  }

  function openAddSheet() {
    sheet(`<div class="sheet-body">
      <h3>新增紀錄</h3>
      <a class="act" href="#/inbody/scan"><span class="act-ic">${icon('camera')}</span><div><b>拍照匯入 InBody</b><span>AI 讀取報告，確認後匯入</span></div>${icon('chevron', 'chev')}</a>
      <a class="act" href="#/inbody/new"><span class="act-ic">${icon('edit')}</span><div><b>手動輸入 InBody</b><span>逐欄填寫</span></div>${icon('chevron', 'chev')}</a>
      <a class="act soon" href="#/training"><span class="act-ic">${icon('dumbbell')}</span><div><b>訓練紀錄</b><span>即將推出</span></div>${icon('chevron', 'chev')}</a>
    </div>`, (w, close) => $$('a', w).forEach((a) => a.addEventListener('click', close)));
  }

  /* =========================================================
   * 單筆報告
   * ========================================================= */
  async function viewDetail(id) {
    const r = S.records.find((x) => x.id === id);
    if (!r) {
      if (!S.loaded) { await guard(() => loadRecords()); return viewDetail(id); }
      return `<header class="page-head">${back('#/inbody')}<h1>找不到紀錄</h1></header>`;
    }
    const p = prevOf(r);
    const d = (k, dec = 1, better = 'down') => {
      if (!p || !has(r[k]) || !has(p[k])) return '';
      const dv = r[k] - p[k];
      const cls = dv === 0 ? '' : (dv < 0) === (better === 'down') ? 'good' : 'bad';
      return `<em class="${cls}">${signed(dv, dec)}</em>`;
    };

    const kpis = [
      ['體重', r.weight, 'kg', 1, d('weight')], ['骨骼肌', r.smm, 'kg', 1, d('smm', 1, 'up')],
      ['體脂率', r.pbf, '%', 1, d('pbf')], ['體脂肪', r.bfm, 'kg', 1, d('bfm')],
      ['BMI', r.bmi, '', 1, d('bmi')], ['內臟脂肪', r.vfl, '級', 0, d('vfl', 0)],
    ].map(([l, v, u, dec, dd]) => `<div class="kpi"><span>${l}</span><b>${num(v, dec)}<small>${u}</small></b>${dd || '<em>&nbsp;</em>'}</div>`).join('');

    // 身體組成堆疊條
    const parts = [['tbw', '水分', 'c1'], ['protein', '蛋白質', 'c2'], ['mineral', '礦物質', 'c3'], ['bfm', '體脂肪', 'c4']];
    const total = parts.reduce((s, [k]) => s + (r[k] || 0), 0) || 1;
    const stack = `<div class="stack">${parts.map(([k, , c]) => `<i class="${c}" style="width:${((r[k] || 0) / total) * 100}%"></i>`).join('')}</div>
      <div class="legend">${parts.map(([k, l, c]) => `<span><i class="${c}"></i>${l} ${num(((r[k] || 0) / total) * 100, 0)}%</span>`).join('')}</div>`;

    const compRow = (k, label, unit) => {
      if (!has(r[k])) return '';
      const lo = r[k + '_lo'], hi = r[k + '_hi'];
      const st = has(lo) && has(hi) ? (r[k] < lo ? ['低', 'low'] : r[k] > hi ? ['高', 'high'] : ['標準', 'ok']) : null;
      return `<div class="mrow">
        <div class="mrow-top"><span>${label}</span><span><b>${num(r[k])}</b> ${unit}${st ? ` <span class="pill ${st[1]}">${st[0]}</span>` : ''}</span></div>
        ${C.rangeBar(r[k], lo, hi)}</div>`;
    };

    const evalPill = (v) => {
      if (!v) return '<span class="muted">–</span>';
      const cls = v === '正常' || v === '平衡' ? 'ok' : v === '低' ? 'low' : v === '稍高' || v === '輕度失衡' ? 'warn' : 'high';
      return `<span class="pill ${cls}">${esc(v)}</span>`;
    };

    const ctrl = has(r.target_weight) ? `<div class="card">
        <div class="card-h"><h3>體重控制</h3><span class="muted sm">InBody 建議</span></div>
        <div class="ctrl-main">
          <div><span class="muted sm">目前</span><b>${num(r.weight, 1)}</b></div>
          <div class="ctrl-arrow">→</div>
          <div><span class="muted sm">目標</span><b>${num(r.target_weight, 1)}</b></div>
          <div class="ctrl-unit">kg</div>
        </div>
        <div class="ctrl-list">
          <div><span>體重控制</span><b>${signed(r.weight_ctrl)} kg</b></div>
          <div><span>脂肪控制</span><b class="${r.fat_ctrl < 0 ? 'bad-soft' : ''}">${signed(r.fat_ctrl)} kg</b></div>
          <div><span>肌肉控制</span><b>${signed(r.muscle_ctrl)} kg</b></div>
        </div></div>` : '';

    const bodyType = r.bodyType ? `<div class="card">
        <div class="card-h"><h3>體型分類</h3><span class="muted sm">肌肉脂肪分析</span></div>
        <div class="btype">${[['C', 'C 型', '體重、體脂肪 > 骨骼肌'], ['I', 'I 型', '三者均衡'], ['D', 'D 型', '骨骼肌 > 體重、體脂肪']].map(([k, t, dsc]) => `
          <div class="bt ${r.bodyType === k ? 'on' : ''}">${btGlyph(k)}<b>${t}</b><span>${dsc}</span></div>`).join('')}</div>
        <p class="muted sm">目標是往 <b>I 型</b> 甚至 <b>D 型</b>：減脂的同時維持或增加骨骼肌。</p></div>` : '';

    const exList = EXERCISES.filter(([k]) => has(r['ex_' + k])).sort((a, b) => r['ex_' + b[0]] - r['ex_' + a[0]]);
    const exMax = Math.max(...exList.map(([k]) => r['ex_' + k]), 1);
    const ex = exList.length ? `<details class="card fold"><summary><h3>運動熱量消耗</h3><span class="muted sm">每 30 分鐘・依當時體重</span>${icon('chevron', 'chev')}</summary>
        <div class="exl">${exList.map(([k, l]) => `<div class="ex"><span>${l}</span><i style="width:${(r['ex_' + k] / exMax) * 100}%"></i><b>${r['ex_' + k]}</b></div>`).join('')}</div></details>` : '';

    const zHas = SEGMENTS.some(([s]) => has(r['z20_' + s]) || has(r['z100_' + s]));
    const zt = zHas ? `<details class="card fold"><summary><h3>阻抗 Z(Ω)</h3><span class="muted sm">原始量測值</span>${icon('chevron', 'chev')}</summary>
        <table class="tbl"><thead><tr><th></th>${SEGMENTS.map(([, l]) => `<th>${l}</th>`).join('')}</tr></thead><tbody>
        ${['20', '100'].map((f) => `<tr><th>${f} kHz</th>${SEGMENTS.map(([s]) => `<td>${num(r[`z${f}_${s}`])}</td>`).join('')}</tr>`).join('')}
        </tbody></table></details>` : '';

    return `<header class="page-head row">
        ${back('#/inbody')}
        <div class="grow"><div class="eyebrow">${esc(r.device || 'InBody')}${r.gym ? '・' + esc(r.gym) : ''}</div><h1>${fmtDate(r.date)}</h1></div>
        <button class="icon-btn" id="moreBtn" aria-label="更多">${icon('edit')}</button>
      </header>

      <div class="card score-card">
        ${C.ring(r.score, 100, '/ 100')}
        <div class="score-txt"><span class="eyebrow">InBody 評分</span>
          <p>${has(r.height) ? `${num(r.height)} cm・` : ''}${has(r.age) ? `${r.age} 歲・` : ''}${esc(r.sex || '')}</p>
          <div class="score-pills">${r.bodyType ? `<span class="pill dark">${esc(r.bodyType)} 型</span>` : ''}${p ? `<span class="pill">${p.score != null && r.score != null ? `較上次 ${signed(r.score - p.score, 0)} 分` : ''}</span>` : '<span class="pill">第一次量測</span>'}</div>
        </div>
      </div>

      <div class="kpis six">${kpis}</div>

      <div class="card">
        <div class="card-h"><h3>身體組成分析</h3></div>
        ${stack}
        <div class="mrows">${compRow('weight', '體重', 'kg')}${compRow('tbw', '身體總水重', 'L')}${compRow('protein', '蛋白質', 'kg')}${compRow('mineral', '礦物質', 'kg')}${compRow('bfm', '體脂肪', 'kg')}</div>
      </div>

      ${bodyType}

      <div class="card">
        <div class="card-h"><h3>部位別分析</h3>
          <div class="seg sm" id="segMode"><button data-m="lean" class="${S.segMode === 'lean' ? 'on' : ''}">肌肉</button><button data-m="fat" class="${S.segMode === 'fat' ? 'on' : ''}">脂肪</button></div></div>
        <div id="segFig">${segFigure(r, S.segMode)}</div>
      </div>

      ${ctrl}

      <div class="card">
        <div class="card-h"><h3>評估</h3></div>
        <div class="evals">
          <div><span>BMI</span><b>${num(r.bmi, 1)}</b>${evalPill(r.bmi_eval)}</div>
          <div><span>體脂率 PBF</span><b>${num(r.pbf, 1)}%</b>${evalPill(r.pbf_eval)}</div>
          <div><span>上半身平衡</span><b></b>${evalPill(r.bal_upper)}</div>
          <div><span>下半身平衡</span><b></b>${evalPill(r.bal_lower)}</div>
          <div><span>上－下半身平衡</span><b></b>${evalPill(r.bal_ul)}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-h"><h3>腰臀圍比・內臟脂肪</h3></div>
        <div class="mrows">
          ${has(r.whr) ? `<div class="mrow"><div class="mrow-top"><span>腰臀圍比</span><span><b>${num(r.whr, 2)}</b>${has(r.whr_hi) ? ` <span class="pill ${r.whr > r.whr_hi ? 'high' : r.whr < r.whr_lo ? 'low' : 'ok'}">${r.whr > r.whr_hi ? '高' : r.whr < r.whr_lo ? '低' : '標準'}</span>` : ''}</span></div>${C.rangeBar(r.whr, r.whr_lo, r.whr_hi, { scale: [0.7, 1.05] })}</div>` : ''}
          ${has(r.vfl) ? `<div class="mrow"><div class="mrow-top"><span>內臟脂肪級別</span><span><b>${num(r.vfl, 0)}</b> 級 <span class="pill ${r.vfl >= 10 ? 'high' : 'ok'}">${r.vfl >= 10 ? '高' : '標準'}</span></span></div>${C.rangeBar(r.vfl, 1, 9, { scale: [1, 20] })}</div>` : ''}
        </div>
      </div>

      <div class="card">
        <div class="card-h"><h3>研究參數</h3></div>
        <div class="params">
          <div><span>除脂體重</span><b>${num(r.ffm, 1)}<small>kg</small></b></div>
          <div><span>基礎代謝率</span><b>${num(r.bmr, 0)}<small>kcal</small></b>${has(r.bmr_lo) ? `<em class="${r.bmr < r.bmr_lo ? 'bad' : ''}">標準 ${r.bmr_lo}–${r.bmr_hi}</em>` : ''}</div>
          <div><span>SMI</span><b>${num(r.smi, 1)}<small>kg/m²</small></b></div>
          <div><span>建議熱量攝取</span><b>${num(r.kcal_rec, 0)}<small>kcal</small></b></div>
        </div>
      </div>

      ${ex}
      ${zt}

      ${r.coachNote ? `<div class="card"><div class="card-h"><h3>備註</h3></div><p class="note">${esc(r.coachNote).replace(/\n/g, '<br>')}</p></div>` : ''}
      ${r.photoUrl ? `<a class="card link-row" href="${esc(r.photoUrl)}" target="_blank" rel="noopener">${icon('image')}<span>查看原始報告照片</span>${icon('chevron', 'chev')}</a>` : ''}

      <div class="foot-actions">
        <a class="btn ghost" href="#/inbody/edit/${r.id}">${icon('edit')}編輯</a>
        <button class="btn ghost danger-text" id="delBtn">${icon('trash')}刪除</button>
      </div>
      <div class="foot-space"></div>`;
  }
  viewDetail.mount = (v, id) => {
    const r = S.records.find((x) => x.id === id);
    if (!r) return;
    $$('#segMode button', v).forEach((b) => (b.onclick = () => {
      S.segMode = b.dataset.m;
      $$('#segMode button', v).forEach((x) => x.classList.toggle('on', x === b));
      $('#segFig', v).innerHTML = segFigure(r, S.segMode);
    }));
    const more = $('#moreBtn', v);
    if (more) more.onclick = () => (location.hash = '#/inbody/edit/' + id);
    const del = $('#delBtn', v);
    if (del) del.onclick = async () => {
      if (!(await confirmSheet('刪除這筆紀錄？', `${fmtDate(r.date)} 的 InBody 資料將從 Google Sheets 移除，無法復原。`, '刪除', true))) return;
      busy(true, '刪除中…');
      await guard(() => call('inbody.delete', { id }));
      busy(false);
      setRecords(S.records.filter((x) => x.id !== id));
      toast('已刪除');
      location.hash = '#/inbody';
    };
  };

  function btGlyph(k) {
    const L = { C: [34, 22, 34], I: [28, 28, 28], D: [20, 36, 20] }[k];
    return `<svg viewBox="0 0 44 30" class="bt-g">${L.map((w, i) => `<rect x="4" y="${3 + i * 9}" width="${w}" height="5" rx="2.5"/>`).join('')}</svg>`;
  }

  function segColor(mode, pct, ev) {
    if (!has(pct)) return 'var(--seg-na)';
    if (mode === 'lean') {
      if (ev === '低' || pct < 90) return 'var(--low)';
      if (ev === '高' || pct > 110) return 'var(--good-strong)';
      return 'var(--good)';
    }
    if (ev === '低' || pct < 80) return 'var(--low)';
    if (ev === '正常' || pct <= 160) return 'var(--good)';
    return pct > 250 ? 'var(--high-strong)' : 'var(--high)';
  }

  function segFigure(r, mode) {
    const g = (s) => ({ kg: r[`${mode}_${s}`], pct: r[`${mode}_${s}_pct`], ev: r[`${mode}_${s}_eval`] });
    const seg = Object.fromEntries(SEGMENTS.map(([s]) => [s, g(s)]));
    const fill = (s) => segColor(mode, seg[s].pct, seg[s].ev);
    const label = (s, name, x, y, anchor) => {
      const v = seg[s];
      return `<g class="seg-l" text-anchor="${anchor}">
        <text x="${x}" y="${y}" class="sl-n">${name}</text>
        <text x="${x}" y="${y + 19}" class="sl-v">${num(v.kg)}<tspan class="sl-u"> kg</tspan></text>
        <text x="${x}" y="${y + 35}" class="sl-p">${has(v.pct) ? num(v.pct, 1) + '%' : ''}${v.ev ? '・' + esc(v.ev) : ''}</text></g>`;
    };
    // 依報告：圖的左側為「左」
    return `<svg viewBox="0 0 320 262" class="segfig">
      <circle cx="160" cy="22" r="15" class="sf-head"/>
      <rect x="128" y="43" width="64" height="98" rx="16" fill="${fill('tr')}"/>
      <rect x="104" y="45" width="20" height="92" rx="10" fill="${fill('la')}"/>
      <rect x="196" y="45" width="20" height="92" rx="10" fill="${fill('ra')}"/>
      <rect x="131" y="146" width="27" height="108" rx="13" fill="${fill('ll')}"/>
      <rect x="162" y="146" width="27" height="108" rx="13" fill="${fill('rl')}"/>
      <text x="160" y="88" text-anchor="middle" class="sf-in">${num(seg.tr.kg)}</text>
      <text x="160" y="104" text-anchor="middle" class="sf-in2">${has(seg.tr.pct) ? num(seg.tr.pct, 0) + '%' : ''}</text>
      ${label('la', '左臂', 6, 62, 'start')}
      ${label('ra', '右臂', 314, 62, 'end')}
      ${label('ll', '左腿', 6, 180, 'start')}
      ${label('rl', '右腿', 314, 180, 'end')}
    </svg>
    <div class="seg-tr">軀幹 <b>${num(seg.tr.kg)} kg</b>・${has(seg.tr.pct) ? num(seg.tr.pct, 1) + '%' : '–'}${seg.tr.ev ? '・' + esc(seg.tr.ev) : ''}</div>
    <div class="legend center">${mode === 'lean'
      ? '<span><i style="background:var(--low)"></i>低於標準</span><span><i style="background:var(--good)"></i>標準</span><span><i style="background:var(--good-strong)"></i>高於標準</span>'
      : '<span><i style="background:var(--good)"></i>標準</span><span><i style="background:var(--high)"></i>偏高</span><span><i style="background:var(--high-strong)"></i>過高 (>250%)</span>'}</div>
    <p class="muted sm center">% 為相對於該身高體重的標準值</p>`;
  }

  /* =========================================================
   * 拍照匯入
   * ========================================================= */
  function viewScan() {
    return `<header class="page-head row">${back('#/inbody')}<div class="grow"><div class="eyebrow">InBody</div><h1>拍照匯入</h1></div></header>
      <label class="drop card" id="drop">
        <input type="file" accept="image/*" id="file" hidden>
        <div class="drop-empty">${icon('camera', 'xl')}<b>拍攝或選擇報告照片</b><span>支援手機相簿・相機</span></div>
        <img id="prev" alt="" hidden>
      </label>
      <div class="card tips">
        <h3>拍攝建議</h3>
        <ul><li>報告<b>平放</b>，整張完整入鏡，四角不要被切掉</li>
        <li>光線充足、避免反光與陰影</li>
        <li>教練的筆跡沒關係，AI 會忽略手寫標註</li>
        <li>解析後會逐欄讓你核對，確認才會存入</li></ul>
      </div>
      ${isDemo() ? '<p class="muted sm center">示範模式：解析會回傳範例資料</p>' : ''}
      <div class="sticky-cta"><button class="btn primary block" id="goBtn" disabled>${icon('sparkle')}開始解析</button></div>`;
  }
  viewScan.mount = (v) => {
    let photo = null;
    const file = $('#file', v), prev = $('#prev', v), go = $('#goBtn', v);
    file.onchange = async () => {
      const f = file.files[0];
      if (!f) return;
      busy(true, '處理照片…');
      try {
        photo = await compressImage(f, 2000, 0.85);
        prev.src = photo.preview; prev.hidden = false;
        $('.drop-empty', v).hidden = true;
        $('#drop', v).classList.add('has');
        go.disabled = false;
      } catch (e) { toast('無法讀取這張照片', 'err'); }
      busy(false);
    };
    go.onclick = async () => {
      if (!photo) return;
      const steps = ['上傳照片…', 'AI 正在讀取數值…', '整理欄位…'];
      let i = 0;
      busy(true, steps[0]);
      const timer = setInterval(() => { i = Math.min(i + 1, steps.length - 1); busy(true, steps[i]); }, 3500);
      try {
        const res = await guard(() => call('inbody.parse', { image: { data: photo.data, mimeType: photo.mimeType } }));
        clearInterval(timer);
        busy(false);
        if (!res) return;
        S.draft = { record: res.record || {}, photo, notes: res.notes || '', source: 'ai' };
        location.hash = '#/inbody/review';
      } catch (e) { clearInterval(timer); busy(false); }
    };
  };

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

  /* =========================================================
   * 表單：新增 / 編輯 / 核對
   * ========================================================= */
  function viewNew() {
    S.draft = { record: { date: nowLocal() }, photo: null, notes: '', source: 'manual' };
    return formView({ title: '手動輸入', eyebrow: 'InBody', backTo: '#/inbody' });
  }
  viewNew.mount = (v) => formMount(v);

  function viewEdit(id) {
    const r = S.records.find((x) => x.id === id);
    if (!r) { location.replace('#/inbody'); return null; }
    S.draft = { record: Object.assign({}, r), photo: null, notes: '', source: 'edit', editId: id };
    return formView({ title: '編輯紀錄', eyebrow: fmtDate(r.date), backTo: '#/inbody/r/' + id });
  }
  viewEdit.mount = (v) => formMount(v);

  function viewReview() {
    if (!S.draft) { location.replace('#/inbody'); return null; }
    const src = S.draft.source;
    return formView({
      title: '核對數值', eyebrow: src === 'ai' ? 'AI 解析結果' : src === 'seed' ? '已從照片轉錄' : 'InBody',
      backTo: src === 'seed' ? '#/home' : '#/inbody/scan', review: true,
    });
  }
  viewReview.mount = (v) => formMount(v);

  function nowLocal() {
    const d = new Date(), p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function inputFor(k, rec, opts = {}) {
    const v = rec[k];
    const filled = has(v) ? 'filled' : 'empty';
    const ai = S.draft && (S.draft.source === 'ai' || S.draft.source === 'seed') && has(v) ? ' ai' : '';
    if (opts.type === 'select') {
      return `<select name="${k}" class="inp ${filled}${ai}"><option value="">–</option>${opts.options.map((o) => `<option ${String(v) === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
    }
    if (opts.type === 'datetime') {
      const val = has(v) ? String(v).replace(' ', 'T').slice(0, 16) : '';
      return `<input type="datetime-local" name="${k}" value="${esc(val)}" class="inp ${filled}${ai}">`;
    }
    if (opts.type === 'text') return `<input name="${k}" value="${esc(v ?? '')}" class="inp ${filled}${ai}">`;
    if (opts.type === 'textarea') return `<textarea name="${k}" rows="3" class="inp ${filled}">${esc(v ?? '')}</textarea>`;
    return `<input name="${k}" inputmode="decimal" value="${has(v) ? esc(v) : ''}" class="inp num ${filled}${ai}" placeholder="–" ${opts.small ? 'data-sm' : ''}>`;
  }

  function formView({ title, eyebrow, backTo, review }) {
    const rec = S.draft.record;
    const d = S.draft;
    const groups = GROUPS.map((g) => {
      let body = '';
      if (g.rows) {
        body = g.rows.map((row) => {
          if (row.type === 'textarea') return `<div class="frow col"><label>${row.label}</label>${inputFor(row.k, rec, row)}</div>`;
          if (row.range) {
            return `<div class="frow range"><label>${row.label}${row.unit ? `<small>${row.unit}</small>` : ''}</label>
              <div class="fr-in">${inputFor(row.k, rec, row)}<span class="rng">${inputFor(row.k + '_lo', rec, { small: 1 })}<i>–</i>${inputFor(row.k + '_hi', rec, { small: 1 })}</span></div></div>`;
          }
          return `<div class="frow"><label>${row.label}${row.unit ? `<small>${row.unit}</small>` : ''}</label>${inputFor(row.k, rec, row)}</div>`;
        }).join('');
        if (g.id === 'comp') body += `<p class="hint">右側兩格為報告括號中的標準範圍（下限–上限）</p>`;
      } else if (g.seg) {
        body = `<table class="ftbl"><thead><tr><th></th><th>kg</th><th>%</th><th>評估</th></tr></thead><tbody>
          ${SEGMENTS.map(([s, l]) => `<tr><th>${l}</th><td>${inputFor(`${g.seg}_${s}`, rec)}</td><td>${inputFor(`${g.seg}_${s}_pct`, rec)}</td>
          <td>${inputFor(`${g.seg}_${s}_eval`, rec, { type: 'select', options: ['低', '正常', '高'] })}</td></tr>`).join('')}</tbody></table>`;
      } else if (g.ex) {
        body = `<div class="fgrid">${EXERCISES.map(([e, l]) => `<div class="fcell"><label>${l}</label>${inputFor('ex_' + e, rec)}</div>`).join('')}</div>`;
      } else if (g.z) {
        body = `<table class="ftbl"><thead><tr><th></th><th>20 kHz</th><th>100 kHz</th></tr></thead><tbody>
          ${SEGMENTS.map(([s, l]) => `<tr><th>${l}</th><td>${inputFor('z20_' + s, rec)}</td><td>${inputFor('z100_' + s, rec)}</td></tr>`).join('')}</tbody></table>`;
      }
      const collapsed = ['ex', 'z'].includes(g.id) && !review;
      return `<details class="card fgroup" ${collapsed ? '' : 'open'} data-g="${g.id}">
        <summary><h3>${g.title}</h3><span class="gcount"></span>${icon('chevron', 'chev')}</summary><div class="fbody">${body}</div></details>`;
    }).join('');

    const photoPanel = d.photo ? `<div class="photo-panel" id="photoPanel">
        <div class="pp-scroll"><img src="${d.photo.preview}" alt="原始照片"></div>
        <div class="pp-bar"><span>${icon('image')}原始照片・可拖曳、雙指縮放比對</span><button type="button" id="ppToggle">收合</button></div>
      </div>` : '';

    return `<header class="page-head row">${back(backTo)}<div class="grow"><div class="eyebrow">${esc(eyebrow)}</div><h1>${title}</h1></div></header>
      ${photoPanel}
      ${review ? `<div class="card review-sum" id="reviewSum"></div>` : ''}
      ${d.notes ? `<div class="notice">${icon('warn')}<div><b>AI 備註</b><br>${esc(d.notes)}</div></div>` : ''}
      <div class="card checks" id="checks"></div>
      <form id="ibForm" novalidate>${groups}</form>
      <div class="sticky-cta"><button class="btn primary block" id="saveBtn">${icon('check')}${review ? '確認無誤，匯入' : '儲存'}</button></div>`;
  }

  function collect(form) {
    const rec = {};
    allKeys().forEach((k) => {
      const el = form.elements[k];
      if (!el) return;
      let v = el.value.trim();
      if (k === 'date' && v) v = v.replace('T', ' ');
      if (v === '') { rec[k] = ''; return; }
      if (TEXT_KEYS.has(k)) rec[k] = v;
      else {
        const n = Number(v.replace(/[^\d.\-]/g, ''));
        rec[k] = isNaN(n) ? '' : n;
      }
    });
    return rec;
  }

  function checks(r) {
    const out = [];
    const near = (a, b, tol) => Math.abs(a - b) <= tol;
    const add = (ok, label, detail) => out.push({ ok, label, detail });
    if (!has(r.date)) add(false, '缺少檢測日期', '');
    if (!has(r.weight)) add(false, '缺少體重', '');
    if ([r.tbw, r.protein, r.mineral, r.bfm, r.weight].every(has)) {
      const s = r.tbw + r.protein + r.mineral + r.bfm;
      add(near(s, r.weight, 0.35), '水分＋蛋白質＋礦物質＋體脂肪 ≈ 體重', `${s.toFixed(2)} vs ${r.weight}`);
    }
    if ([r.weight, r.bfm, r.ffm].every(has)) add(near(r.weight - r.bfm, r.ffm, 0.3), '體重 − 體脂肪 ≈ 除脂體重', `${(r.weight - r.bfm).toFixed(1)} vs ${r.ffm}`);
    if ([r.weight, r.height, r.bmi].every(has)) {
      const b = r.weight / Math.pow(r.height / 100, 2);
      add(near(b, r.bmi, 0.2), '體重 ÷ 身高² ≈ BMI', `${b.toFixed(1)} vs ${r.bmi}`);
    }
    if ([r.weight, r.bfm, r.pbf].every(has)) {
      const p = (r.bfm / r.weight) * 100;
      add(near(p, r.pbf, 0.3), '體脂肪 ÷ 體重 ≈ 體脂率', `${p.toFixed(1)}% vs ${r.pbf}%`);
    }
    if ([r.target_weight, r.weight, r.weight_ctrl].every(has)) add(near(r.target_weight - r.weight, r.weight_ctrl, 0.2), '目標 − 體重 ≈ 體重控制', `${(r.target_weight - r.weight).toFixed(1)} vs ${r.weight_ctrl}`);
    if ([r.weight_ctrl, r.fat_ctrl, r.muscle_ctrl].every(has)) add(near(r.fat_ctrl + r.muscle_ctrl, r.weight_ctrl, 0.2), '脂肪控制 ＋ 肌肉控制 ≈ 體重控制', `${(r.fat_ctrl + r.muscle_ctrl).toFixed(1)} vs ${r.weight_ctrl}`);
    if ([r.lean_la, r.lean_ra, r.lean_ll, r.lean_rl, r.height, r.smi].every(has)) {
      const smi = (r.lean_la + r.lean_ra + r.lean_ll + r.lean_rl) / Math.pow(r.height / 100, 2);
      add(near(smi, r.smi, 0.2), '四肢肌肉 ÷ 身高² ≈ SMI', `${smi.toFixed(2)} vs ${r.smi}`);
    }
    ['tbw', 'protein', 'mineral', 'bfm', 'weight', 'whr', 'bmr'].forEach((k) => {
      if (has(r[k + '_lo']) && has(r[k + '_hi']) && r[k + '_lo'] >= r[k + '_hi']) add(false, `${k} 標準範圍下限 ≥ 上限`, '');
    });
    return out;
  }

  function formMount(v) {
    const form = $('#ibForm', v);
    const keysTotal = allKeys().length;
    const refresh = () => {
      const rec = collect(form);
      // 各組填寫數
      $$('.fgroup', v).forEach((g) => {
        const ins = $$('.inp', g).filter((i) => i.tagName !== 'TEXTAREA');
        const n = ins.filter((i) => i.value.trim() !== '').length;
        $('.gcount', g).textContent = ins.length ? `${n}/${ins.length}` : '';
        $('.gcount', g).classList.toggle('full', n === ins.length && ins.length > 0);
      });
      const cs = checks(rec);
      const bad = cs.filter((c) => !c.ok);
      $('#checks', v).innerHTML = `<div class="card-h"><h3>一致性檢查</h3><span class="pill ${bad.length ? 'warn' : 'ok'}">${bad.length ? `${bad.length} 項需確認` : '全部通過'}</span></div>
        ${cs.length ? cs.map((c) => `<div class="chk ${c.ok ? 'ok' : 'bad'}">${icon(c.ok ? 'check' : 'warn')}<span>${c.label}</span><em>${c.detail}</em></div>`).join('') : '<p class="muted sm">填入數值後會自動驗算</p>'}`;
      const sum = $('#reviewSum', v);
      if (sum) {
        const filled = Object.values(rec).filter((x) => x !== '').length;
        sum.innerHTML = `<div class="rs"><b>${filled}</b><span>/ ${keysTotal} 欄已讀取</span></div>
          <p class="muted sm">請對照照片確認數值。<span class="ai-mark"></span> 標示的是自動帶入的欄位，修改過的會變成深色。</p>`;
      }
    };
    form.addEventListener('input', (e) => {
      const t = e.target;
      t.classList.remove('ai');
      t.classList.add('edited');
      t.classList.toggle('empty', t.value.trim() === '');
      t.classList.toggle('filled', t.value.trim() !== '');
      refresh();
    });
    form.addEventListener('change', refresh);
    refresh();

    const pp = $('#photoPanel', v);
    if (pp) {
      $('#ppToggle', v).onclick = () => {
        pp.classList.toggle('min');
        $('#ppToggle', v).textContent = pp.classList.contains('min') ? '展開' : '收合';
      };
      const img = $('img', pp);
      img.ondblclick = () => pp.classList.toggle('zoom');
    }

    $('#saveBtn', v).onclick = async (e) => {
      e.preventDefault();
      const rec = collect(form);
      if (!rec.date || !has(rec.weight)) { toast('至少需要檢測日期與體重', 'err'); return; }
      const bad = checks(rec).filter((c) => !c.ok);
      if (bad.length && !(await confirmSheet('有欄位未通過驗算', bad.map((b) => b.label).join('、') + '。仍要儲存嗎？', '仍要儲存'))) return;
      if (S.draft.editId) rec.id = S.draft.editId;
      if (S.draft.editId && S.draft.record.photoUrl) rec.photoUrl = S.draft.record.photoUrl;
      busy(true, '儲存中…');
      const saved = await guard(() => call('inbody.save', {
        record: rec,
        photo: S.draft.photo ? { data: S.draft.photo.data, mimeType: S.draft.photo.mimeType } : null,
      })).catch(() => null);
      busy(false);
      if (!saved) return;
      const list = S.records.filter((x) => x.id !== saved.id);
      list.push(saved);
      setRecords(list);
      S.draft = null;
      toast('已儲存', 'ok');
      location.replace('#/inbody/r/' + saved.id);
    };
  }

  /* =========================================================
   * 訓練（預留）
   * ========================================================= */
  function viewTraining() {
    const plan = [
      ['dumbbell', '訓練日誌', '動作、組數、重量、RPE，自動計算訓練量'],
      ['calendar', '教練課程', '課表、剩餘堂數、每堂課重點筆記'],
      ['food', '飲食紀錄', '依 InBody 建議熱量追蹤蛋白質與熱量'],
      ['ruler', '身體圍度', '腰圍、臀圍、手臂等，搭配進度照片'],
      ['target', '目標設定', '體重、體脂率目標與預估達成日期'],
    ];
    return `<header class="page-head"><div class="eyebrow">Coming soon</div><h1>訓練</h1></header>
      <div class="card soon-hero"><p>InBody 先上線，下面這些功能會陸續加入。</p></div>
      <div class="card list-card">${plan.map(([ic, t, d]) => `<div class="act static"><span class="act-ic">${icon(ic)}</span><div><b>${t}</b><span>${d}</span></div><span class="pill">規劃中</span></div>`).join('')}</div>
      <div class="foot-space"></div>`;
  }

  /* =========================================================
   * 我的
   * ========================================================= */
  function viewMe() {
    const url = apiUrl();
    return `<header class="page-head"><div class="eyebrow">帳號</div><h1>我的</h1></header>
      <div class="card me">
        <div class="avatar">${esc((S.session.account || '?').slice(0, 1).toUpperCase())}</div>
        <div><b>${esc(S.session.account)}</b><span class="muted sm">${isDemo() ? '示範模式・資料存在此裝置' : '已連線 Google Sheets'}</span></div>
      </div>
      <div class="sec-head"><h2>資料</h2></div>
      <div class="card list-card">
        <button class="act" id="syncBtn"><span class="act-ic">${icon('refresh')}</span><div><b>重新同步</b><span>從 Google Sheets 重新載入</span></div></button>
        <button class="act" id="csvBtn"><span class="act-ic">${icon('download')}</span><div><b>匯出 CSV</b><span>${S.records.length} 筆 InBody 紀錄</span></div></button>
      </div>
      <div class="sec-head"><h2>後端連線</h2></div>
      <div class="card">
        <label class="field"><span>GAS 網頁應用程式網址</span>
          <input id="apiInp" value="${esc(LS.get('wo.apiUrl', '') || '')}" placeholder="${esc((window.APP_CONFIG.API_URL) || 'https://script.google.com/macros/s/…/exec')}" autocapitalize="off" spellcheck="false"></label>
        <p class="muted sm">留空會使用 config.js 的設定${window.APP_CONFIG.API_URL ? '' : '（目前也是空的 → 示範模式）'}。目前：${url ? '<code>…' + esc(url.slice(-24)) + '</code>' : '示範模式'}</p>
        <button class="btn ghost sm" id="apiSave">${icon('link')}儲存並重新登入</button>
      </div>
      <div class="card list-card">
        <button class="act" id="logoutBtn"><span class="act-ic">${icon('logout')}</span><div><b>登出</b></div></button>
      </div>
      <p class="muted sm center">Workout v${esc(window.APP_CONFIG.VERSION)}</p>
      <div class="foot-space"></div>`;
  }
  viewMe.mount = (v) => {
    $('#logoutBtn', v).onclick = async () => { if (await confirmSheet('登出？', '下次需要重新輸入帳號密碼。', '登出')) logout(); };
    $('#syncBtn', v).onclick = async () => {
      busy(true, '同步中…');
      await guard(() => loadRecords(true)).catch(() => {});
      busy(false);
      toast(`已同步 ${S.records.length} 筆`, 'ok');
    };
    $('#csvBtn', v).onclick = exportCsv;
    $('#apiSave', v).onclick = () => {
      const val = $('#apiInp', v).value.trim();
      if (val && !/^https:\/\/script\.google(usercontent)?\.com\//.test(val)) { toast('網址看起來不是 GAS 網頁應用程式', 'err'); return; }
      LS.set('wo.apiUrl', val);
      toast('已更新，請重新登入');
      logout();
    };
  };

  function exportCsv() {
    if (!S.records.length) { toast('沒有資料'); return; }
    const keys = allKeys();
    const lines = [keys.join(',')].concat(S.records.map((r) => keys.map((k) => {
      const v = r[k] ?? '';
      return /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v;
    }).join(',')));
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `inbody_${S.session.account}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ---------------- 啟動 ---------------- */
  function boot() {
    $('#tabAdd').onclick = (e) => { e.preventDefault(); openAddSheet(); };
    window.addEventListener('hashchange', render);
    render();
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
