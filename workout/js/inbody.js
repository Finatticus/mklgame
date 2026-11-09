/* InBody：總覽、單筆報告、拍照匯入、表單 */
(function () {
  const { $, $$, esc, has, num, signed, fmtDate, icon, toast, sheet, confirmSheet, busy, call, back, LS, isDemo } = W;
  const C = window.Charts;
  const { GROUPS, SEGMENTS, EXERCISES, METRICS, allKeys, TEXT_KEYS } = window.SCHEMA;
  const S = {
    get records() { return W.S.data.inbody; },
    get draft() { return W.S.draft; },
    set draft(v) { W.S.draft = v; },
    get loaded() { return W.S.loaded; },
    metric: LS.get('wo.metric', 'weight'),
    segMode: 'lean',
  };
  const setRecords = (list) => W.setCol('inbody', list);
  const latest = () => W.latestInbody();
  const prevOf = (rec) => {
    const i = S.records.findIndex((r) => r.id === rec.id);
    return i > 0 ? S.records[i - 1] : null;
  };
  const loadRecords = () => W.sync();
  async function guard(fn) {
    try { return await fn(); } catch (e) {
      busy(false);
      if (e.code === 'AUTH' || e.code === 'PENDING') { W.logout(); toast(e.message, 'err'); return; }
      toast(e.message || '發生錯誤', 'err');
      throw e;
    }
  }
  const bodySeg = (k) => W.segNav([['#/weight', '體重', 'weight'], ['#/inbody', 'InBody', 'inbody']], k, 'tone-inbody');

  /* =========================================================
   * InBody 總覽：趨勢 + 歷程
   * ========================================================= */
  async function viewInbody() {
    const recs = S.records;
    W.LS.set('wo.bodyTab', '#/inbody');
    const head = bodySeg('inbody') + `<header class="page-head row">
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
      <div class="kpis tone-inbody">${kpi}</div>
      <div class="sec-head"><h2>趨勢</h2><button class="link-btn" id="mOrder">${icon('list')}調整順序</button></div>
      <div class="chips" id="metricChips">${orderedMetrics().map((m) => `<button class="chip ${m.k === S.metric ? 'on' : ''}" data-k="${m.k}">${m.label}</button>`).join('')}</div>
      <div class="card chart-card tone-inbody" id="chartCard"></div>
      <div class="sec-head"><h2>組成歷程</h2></div>
      <div class="card hist">${historyTable(recs)}</div>
      <div class="sec-head"><h2>所有紀錄</h2></div>
      <div class="card list-card">${recs.slice().reverse().map((x) => `<a class="rec" href="#/inbody/r/${x.id}">
          <div class="rec-date"><b>${fmtDate(x.date, 'short')}</b><span>${C.parseDate(x.date) ? C.parseDate(x.date).getFullYear() : ''}</span></div>
          <div class="rec-vals"><span><i>體重</i>${num(x.weight, 1)}</span><span><i>骨骼肌</i>${num(x.smm, 1)}</span><span><i>體脂率</i>${num(x.pbf, 1)}%</span><span><i>分數</i>${num(x.score, 0)}</span></div>
          ${icon('chevron', 'chev')}</a>`).join('')}</div>
      <div class="foot-space"></div>`;
  }
  /** 趨勢指標的順序：使用者可自訂（存在設定，換手機也同步） */
  function orderedMetrics() {
    const saved = (W.S.data.settings || {}).metricOrder || LS.get('wo.metricOrder', null) || [];
    const byKey = Object.fromEntries(METRICS.map((m) => [m.k, m]));
    const list = saved.filter((k) => byKey[k]).map((k) => byKey[k]);
    METRICS.forEach((m) => { if (!list.includes(m)) list.push(m); });
    return list;
  }
  function editOrder() {
    let order = orderedMetrics().map((m) => m.k);
    const label = (k) => METRICS.find((m) => m.k === k).label;
    sheet(`<div class="sheet-body"><h3>調整趨勢項目順序</h3><p class="muted sm">想常看的移到前面，第一個會是預設顯示的項目。</p>
      <div id="ordList" class="ord-list"></div>
      <div class="btn-row"><button class="btn ghost" data-a="reset">恢復預設</button><button class="btn primary" data-a="save">儲存</button></div></div>`, (w, close) => {
      const draw = () => {
        $('#ordList', w).innerHTML = order.map((k, i) => `<div class="ord"><span class="ord-n">${i + 1}</span><b>${label(k)}</b>
          <button data-top="${i}" ${i === 0 ? 'disabled' : ''} aria-label="移到最前">置頂</button>
          <button data-up="${i}" ${i === 0 ? 'disabled' : ''} aria-label="上移">${icon('back', 'rot90')}</button>
          <button data-dn="${i}" ${i === order.length - 1 ? 'disabled' : ''} aria-label="下移">${icon('chevron', 'rot90')}</button></div>`).join('');
      };
      draw();
      $('#ordList', w).onclick = (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        const mv = (from, to) => { const [x] = order.splice(from, 1); order.splice(to, 0, x); };
        if (b.dataset.top) mv(+b.dataset.top, 0);
        else if (b.dataset.up) mv(+b.dataset.up, +b.dataset.up - 1);
        else if (b.dataset.dn) mv(+b.dataset.dn, +b.dataset.dn + 1);
        draw();
      };
      const finish = async (o) => {
        LS.set('wo.metricOrder', o);
        S.metric = o[0]; LS.set('wo.metric', S.metric);
        if (!W.S.backendOld) W.saveSettings({ metricOrder: o });
        else W.setSettings(Object.assign({}, W.S.data.settings, { metricOrder: o }));
        close();
        W.render.keepScroll = true;
        W.render();
      };
      $('[data-a=save]', w).onclick = () => finish(order);
      $('[data-a=reset]', w).onclick = () => finish(METRICS.map((m) => m.k));
    });
  }

  viewInbody.mount = (v) => {
    const addBtn = $('#addBtn', v);
    if (addBtn) addBtn.onclick = openAddSheet;
    const ob = $('#mOrder', v);
    if (ob) ob.onclick = editOrder;
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
    const row = $('#metricChips', v);
    if (on && row) row.scrollLeft = on.offsetLeft - row.clientWidth / 2 + on.offsetWidth / 2;
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
      <h3>新增 InBody</h3>
      <a class="act" href="#/inbody/scan"><span class="act-ic">${icon('camera')}</span><div><b>拍照匯入 InBody</b><span>AI 讀取報告，確認後匯入</span></div>${icon('chevron', 'chev')}</a>
      <a class="act" href="#/inbody/new"><span class="act-ic">${icon('edit')}</span><div><b>手動輸入 InBody</b><span>逐欄填寫</span></div>${icon('chevron', 'chev')}</a>    </div>`, (w, close) => $$('a', w).forEach((a) => a.addEventListener('click', close)));
  }

  /* =========================================================
   * 單筆報告
   * ========================================================= */
  async function viewDetail(id) {
    const r = S.records.find((x) => x.id === id);
    if (!r) {
      if (!S.loaded) { await guard(() => loadRecords()); return viewDetail(id); }
      return `<header class="page-head row">${back('#/inbody')}<h1>找不到紀錄</h1></header>`;
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

    const ctrl = has(r.target_weight) ? `<div class="card tone-inbody">
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

    const bodyType = r.bodyType ? `<div class="card tone-inbody">
        <div class="card-h"><h3>體型分類</h3><span class="muted sm">肌肉脂肪分析</span></div>
        <div class="btype">${[['C', 'C 型', '體重、體脂肪 > 骨骼肌'], ['I', 'I 型', '三者均衡'], ['D', 'D 型', '骨骼肌 > 體重、體脂肪']].map(([k, t, dsc]) => `
          <div class="bt ${r.bodyType === k ? 'on' : ''}">${btGlyph(k)}<b>${t}</b><span>${dsc}</span></div>`).join('')}</div>
        <p class="muted sm">目標是往 <b>I 型</b> 甚至 <b>D 型</b>：減脂的同時維持或增加骨骼肌。</p></div>` : '';

    const exList = EXERCISES.filter(([k]) => has(r['ex_' + k])).sort((a, b) => r['ex_' + b[0]] - r['ex_' + a[0]]);
    const exMax = Math.max(...exList.map(([k]) => r['ex_' + k]), 1);
    const ex = exList.length ? `<details class="card fold tone-inbody"><summary><h3>運動熱量消耗</h3><span class="muted sm">每 30 分鐘・依當時體重</span>${icon('chevron', 'chev')}</summary>
        <div class="exl">${exList.map(([k, l]) => `<div class="ex"><span>${l}</span><i style="width:${(r['ex_' + k] / exMax) * 100}%"></i><b>${r['ex_' + k]}</b></div>`).join('')}</div></details>` : '';

    const zHas = SEGMENTS.some(([s]) => has(r['z20_' + s]) || has(r['z100_' + s]));
    const zt = zHas ? `<details class="card fold tone-inbody"><summary><h3>阻抗 Z(Ω)</h3><span class="muted sm">原始量測值</span>${icon('chevron', 'chev')}</summary>
        <table class="tbl"><thead><tr><th></th>${SEGMENTS.map(([, l]) => `<th>${l}</th>`).join('')}</tr></thead><tbody>
        ${['20', '100'].map((f) => `<tr><th>${f} kHz</th>${SEGMENTS.map(([s]) => `<td>${num(r[`z${f}_${s}`])}</td>`).join('')}</tr>`).join('')}
        </tbody></table></details>` : '';

    return `<header class="page-head row">
        ${back('#/inbody')}
        <div class="grow"><div class="eyebrow">${esc(r.device || 'InBody')}${r.gym ? '・' + esc(r.gym) : ''}</div><h1>${fmtDate(r.date)}</h1></div>
        <button class="icon-btn" id="moreBtn" aria-label="更多">${icon('edit')}</button>
      </header>

      <div class="card score-card tone-inbody">
        ${C.ring(r.score, 100, '/ 100')}
        <div class="score-txt"><span class="eyebrow">InBody 評分</span>
          <p>${has(r.height) ? `${num(r.height)} cm・` : ''}${has(r.age) ? `${r.age} 歲・` : ''}${esc(r.sex || '')}</p>
          <div class="score-pills">${r.bodyType ? `<span class="pill dark">${esc(r.bodyType)} 型</span>` : ''}${p ? `<span class="pill">${p.score != null && r.score != null ? `較上次 ${signed(r.score - p.score, 0)} 分` : ''}</span>` : '<span class="pill">第一次量測</span>'}</div>
        </div>
      </div>

      <div class="kpis six tone-inbody">${kpis}</div>

      <div class="card tone-inbody">
        <div class="card-h"><h3>身體組成分析</h3></div>
        ${stack}
        <div class="mrows">${compRow('weight', '體重', 'kg')}${compRow('tbw', '身體總水重', 'L')}${compRow('protein', '蛋白質', 'kg')}${compRow('mineral', '礦物質', 'kg')}${compRow('bfm', '體脂肪', 'kg')}</div>
      </div>

      ${bodyType}

      <div class="card tone-inbody">
        <div class="card-h"><h3>部位別分析</h3>
          <div class="seg sm" id="segMode"><button data-m="lean" class="${S.segMode === 'lean' ? 'on' : ''}">肌肉</button><button data-m="fat" class="${S.segMode === 'fat' ? 'on' : ''}">脂肪</button></div></div>
        <div id="segFig">${segFigure(r, S.segMode)}</div>
      </div>

      ${ctrl}

      <div class="card tone-inbody">
        <div class="card-h"><h3>評估</h3></div>
        <div class="evals">
          <div><span>BMI<small class="block">國健署標準 18.5–24</small></span><b>${num(r.bmi, 1)}</b>${evalPill(r.bmi_eval)}</div>
          <div><span>體脂率 PBF</span><b>${num(r.pbf, 1)}%</b>${evalPill(r.pbf_eval)}</div>
          <div><span>上半身平衡</span><b></b>${evalPill(r.bal_upper)}</div>
          <div><span>下半身平衡</span><b></b>${evalPill(r.bal_lower)}</div>
          <div><span>上－下半身平衡</span><b></b>${evalPill(r.bal_ul)}</div>
        </div>
      </div>

      <div class="card tone-inbody">
        <div class="card-h"><h3>腰臀圍比・內臟脂肪</h3></div>
        <div class="mrows">
          ${has(r.whr) ? `<div class="mrow"><div class="mrow-top"><span>腰臀圍比</span><span><b>${num(r.whr, 2)}</b>${has(r.whr_hi) ? ` <span class="pill ${r.whr > r.whr_hi ? 'high' : r.whr < r.whr_lo ? 'low' : 'ok'}">${r.whr > r.whr_hi ? '高' : r.whr < r.whr_lo ? '低' : '標準'}</span>` : ''}</span></div>${C.rangeBar(r.whr, r.whr_lo, r.whr_hi, { scale: [0.7, 1.05] })}</div>` : ''}
          ${has(r.vfl) ? `<div class="mrow"><div class="mrow-top"><span>內臟脂肪級別</span><span><b>${num(r.vfl, 0)}</b> 級 <span class="pill ${r.vfl >= 15 ? 'high' : r.vfl >= 10 ? 'warn' : 'ok'}">${r.vfl >= 15 ? '過高' : r.vfl >= 10 ? '偏高' : '標準'}</span></span></div>${C.rangeBar(r.vfl, 1, 9, { scale: [1, 20] })}<p class="hint">InBody 標準：1–9 正常・10–14 偏高・15 以上過高</p></div>` : ''}
        </div>
      </div>

      <div class="card tone-inbody">
        <div class="card-h"><h3>研究參數</h3></div>
        <div class="params">
          <div><span>除脂體重</span><b>${num(r.ffm, 1)}<small>kg</small></b></div>
          <div><span>基礎代謝率</span><b>${num(r.bmr, 0)}<small>kcal</small></b>${has(r.bmr_lo) ? `<em class="${r.bmr < r.bmr_lo ? 'bad' : ''}">標準 ${r.bmr_lo}–${r.bmr_hi}</em>` : ''}</div>
          <div><span>SMI</span><b>${num(r.smi, 1)}<small>kg/m²</small></b>${has(r.smi) ? `<em class="${r.smi < (r.sex === '女' ? 5.7 : 7) ? 'bad' : ''}">${r.sex === '女' ? '女性' : '男性'}參考 ≥ ${r.sex === '女' ? 5.7 : 7.0}</em>` : ''}</div>
          <div><span>建議熱量攝取</span><b>${num(r.kcal_rec, 0)}<small>kcal</small></b></div>
        </div>
      </div>

      ${ex}
      ${zt}

      ${r.coachNote ? `<div class="card tone-inbody"><div class="card-h"><h3>備註</h3></div><p class="note">${esc(r.coachNote).replace(/\n/g, '<br>')}</p></div>` : ''}
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
      const res = await guard(() => call('inbody.delete', { id })).catch(() => null);
      busy(false);
      if (!res) return;
      if (res.weight) W.setCol('weight', res.weight);
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
    const evCls = (v) => (!v.ev ? '' : v.ev === '正常' ? 'ok' : v.ev === '低' ? 'low' : 'high');
    const cell = (s, name) => {
      const v = seg[s];
      return `<div class="segc"><span class="segc-n"><i style="background:${fill(s)}"></i>${name}</span>
        <b>${num(v.kg)}<small>kg</small></b>
        <span class="segc-p">${has(v.pct) ? num(v.pct, 1) + '%' : ''}${v.ev ? ` <span class="pill ${evCls(v)}">${esc(v.ev)}</span>` : ''}</span></div>`;
    };
    // 依報告：圖的左側為「左」
    return `<div class="segv">
      <div class="segv-col">${cell('la', '左臂')}${cell('ll', '左腿')}</div>
      <svg viewBox="0 0 100 244" class="segfig2">
        <circle cx="50" cy="15" r="12" class="sf-head"/>
        <rect x="24" y="31" width="52" height="88" rx="14" fill="${fill('tr')}"/>
        <rect x="4" y="33" width="16" height="84" rx="8" fill="${fill('la')}"/>
        <rect x="80" y="33" width="16" height="84" rx="8" fill="${fill('ra')}"/>
        <rect x="26" y="123" width="23" height="117" rx="11" fill="${fill('ll')}"/>
        <rect x="51" y="123" width="23" height="117" rx="11" fill="${fill('rl')}"/>
      </svg>
      <div class="segv-col right">${cell('ra', '右臂')}${cell('rl', '右腿')}</div>
    </div>
    <div class="segv-tr">${cell('tr', '軀幹')}</div>
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
      const savedRec = saved.record || saved;
      if (saved.weight) W.setCol('weight', saved.weight);
      setRecords(S.records.filter((x) => x.id !== savedRec.id).concat([savedRec]));
      S.draft = null;
      toast('已儲存', 'ok');
      location.replace('#/inbody/r/' + savedRec.id);
    };
  }


  W.route(/^#\/inbody$/, viewInbody, { tab: 'body' });
  W.route(/^#\/inbody\/r\/([\w-]+)$/, viewDetail, { tab: 'body' });
  W.route(/^#\/inbody\/scan$/, viewScan, { tab: false });
  W.route(/^#\/inbody\/new$/, viewNew, { tab: false });
  W.route(/^#\/inbody\/edit\/([\w-]+)$/, viewEdit, { tab: false });
  W.route(/^#\/inbody\/review$/, viewReview, { tab: false });
  W.inbodyChecks = checks;
})();
