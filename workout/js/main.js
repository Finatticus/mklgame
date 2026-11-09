/* 登入、我的、新增選單、啟動 */
(function () {
  const { $, $$, esc, has, icon, toast, sheet, confirmSheet, call, act, isDemo, apiUrl, LS } = W;

  /* =========================================================
   * 登入 / 註冊
   * ========================================================= */
  function viewLogin() {
    return `<div class="auth">
      <div class="auth-top">
        <div class="brand-mark">${brandSvg()}</div>
        <h1 class="auth-title">Workout</h1>
        <p class="auth-sub">身體數據・訓練・教練課・飲食，一個地方記錄</p>
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
          W.login({ account: data.account, token: data.token });
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
   * 我的
   * ========================================================= */
  function viewMe() {
    const url = apiUrl();
    const st = W.S.data.settings || {};
    const d = W.S.data;
    const ib = W.latestInbody();
    return W.pageHead('我的', '帳號與設定', { back: '#/home' }) + `
      <div class="card me">
        <div class="avatar">${esc((W.S.session.account || '?').slice(0, 1).toUpperCase())}</div>
        <div><b>${esc(W.S.session.account)}</b><span class="muted sm">${isDemo() ? '示範模式・資料存在此裝置' : '已連線 Google Sheets'}</span></div>
      </div>
      <div class="sec-head"><h2>個人設定</h2></div>
      <div class="card form-card">
        <div class="frow"><label>目標體重<small>kg</small></label><input class="inp num w90" inputmode="decimal" id="stTarget" value="${has(st.targetWeight) ? st.targetWeight : ''}" placeholder="${ib && has(ib.target_weight) ? ib.target_weight : '–'}"></div>
        <div class="frow"><label>常去的健身房</label><input class="inp" id="stGym" value="${esc(st.gym || '')}" placeholder="健身工廠"></div>
        <p class="hint">目標體重留空會用最近一次 InBody 的目標體重。營養目標在「飲食」頁設定，教練課堂數在「教練課」頁設定。</p>
        <button class="btn ghost sm" id="stSave">${icon('check')}儲存設定</button>
      </div>
      <div class="sec-head"><h2>資料</h2></div>
      <div class="card list-card">
        <button class="act" id="syncBtn"><span class="act-ic">${icon('refresh')}</span><div><b>重新同步</b><span>InBody ${d.inbody.length}・體重 ${d.weight.length}・訓練 ${d.workout.length}・飲食 ${d.food.length}</span></div></button>
        <button class="act" id="csvBtn"><span class="act-ic">${icon('download')}</span><div><b>匯出 InBody CSV</b><span>${d.inbody.length} 筆</span></div></button>
      </div>
      <div class="sec-head"><h2>後端連線</h2></div>
      <div class="card">
        <label class="field"><span>GAS 網頁應用程式網址</span>
          <input id="apiInp" value="${esc(LS.get('wo.apiUrl', '') || '')}" placeholder="${esc(window.APP_CONFIG.API_URL || 'https://script.google.com/macros/s/…/exec')}" autocapitalize="off" spellcheck="false"></label>
        <p class="muted sm">留空 = 使用預設網址。目前：${url ? '<code>…' + esc(url.slice(-24)) + '</code>' : '示範模式'}${W.S.backendOld ? '<br><b class="bad">後端是舊版，請更新部署</b>' : ''}</p>
        <button class="btn ghost sm" id="apiSave">${icon('link')}儲存並重新登入</button>
      </div>
      <div class="card list-card">
        <button class="act" id="logoutBtn"><span class="act-ic">${icon('logout')}</span><div><b>登出</b></div></button>
      </div>
      <p class="muted sm center">Workout v${esc(window.APP_CONFIG.VERSION)}</p>
      <div class="foot-space"></div>`;
  }
  viewMe.mount = (v) => {
    $('#logoutBtn', v).onclick = async () => { if (await confirmSheet('登出？', '下次需要重新輸入帳號密碼。', '登出')) W.logout(); };
    $('#syncBtn', v).onclick = async () => {
      if (await act('同步中…', () => W.sync().then(() => true))) { toast('已同步', 'ok'); W.render.keepScroll = true; W.render(); }
    };
    $('#csvBtn', v).onclick = exportCsv;
    $('#stSave', v).onclick = async () => {
      const tv = $('#stTarget', v).value.trim();
      if (await W.saveSettings({ targetWeight: tv === '' ? '' : +tv, gym: $('#stGym', v).value.trim() })) toast('已儲存', 'ok');
    };
    $('#apiSave', v).onclick = () => {
      const val = $('#apiInp', v).value.trim();
      if (val && val !== 'demo' && !/^https:\/\/script\.google(usercontent)?\.com\//.test(val)) { toast('網址看起來不是 GAS 網頁應用程式', 'err'); return; }
      LS.set('wo.apiUrl', val);
      toast('已更新，請重新登入');
      W.logout();
    };
  };

  function exportCsv() {
    const recs = W.S.data.inbody;
    if (!recs.length) { toast('沒有資料'); return; }
    const keys = window.SCHEMA.allKeys();
    const lines = [keys.join(',')].concat(recs.map((r) => keys.map((k) => {
      const v = r[k] ?? '';
      return /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v;
    }).join(',')));
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `inbody_${W.S.session.account}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ---------------- 新增選單 ---------------- */
  function openAddSheet() {
    const opts = [
      ['scale', '記錄體重', '每天一筆，同天覆蓋', 'weight'],
      ['food', '記錄飲食', '搜尋・AI・手動', '#/food/new'],
      ['dumbbell', '記錄訓練', '動作・重量・次數', '#/training/new'],
      ['whistle', '記錄教練課', '訓練＋教練重點', '#/training/new?coach=1'],
      ['camera', 'InBody 拍照', 'AI 讀取後核對', '#/inbody/scan'],
      ['edit', 'InBody 手動', '逐欄填寫', '#/inbody/new'],
    ];
    sheet(`<div class="sheet-body"><h3>新增</h3><div class="add-grid">${opts.map(([ic, t, d, h]) =>
      `<a class="add-op" ${h.startsWith('#') ? `href="${h}"` : `data-op="${h}" role="button"`}><span class="act-ic">${icon(ic)}</span><b>${t}</b><span>${d}</span></a>`).join('')}</div></div>`,
    (w, close) => {
      $$('a', w).forEach((a) => a.addEventListener('click', () => {
        close();
        if (a.dataset.op === 'weight') setTimeout(() => W.openWeightSheet(), 280);
      }));
    });
  }
  W.openAddSheet = openAddSheet;

  W.route(/^#\/login$/, viewLogin, { tab: false });
  W.route(/^#\/me$/, viewMe, { tab: false });

  function boot() {
    $('#tabAdd').onclick = (e) => { e.preventDefault(); openAddSheet(); };
    window.addEventListener('hashchange', () => W.render());
    W.render();
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
