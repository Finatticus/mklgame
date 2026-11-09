/* 每日體重：一天一筆；當天有 InBody 時以 InBody 為準 */
(function () {
  const { $, $$, esc, has, num, signed, icon, toast, sheet, confirmSheet, call, act, LS } = W;
  const C = window.Charts;
  const RANGES = [['30', '30 天'], ['90', '90 天'], ['365', '1 年'], ['all', '全部']];

  function viewWeight() {
    LS.set('wo.bodyTab', '#/weight');
    const series = W.weightSeries();
    const head = W.segNav([['#/weight', '體重', 'weight'], ['#/inbody', 'InBody', 'inbody']], 'weight', 'tone-weight') +
      W.pageHead('體重', '每日紀錄', { right: `<button class="icon-btn solid" id="wAdd" aria-label="記體重">${icon('plus')}</button>` });
    if (!series.length) {
      return head + W.empty('scale', '還沒有體重紀錄', '每天固定時間量（建議早上起床、如廁後、進食前），趨勢會最準。',
        `<button class="btn primary" id="wAdd2">${icon('plus')}記錄今天體重</button>`);
    }
    const last = series[series.length - 1];
    const ma = W.movingAvg(series);
    const avgOf = (from, to) => {
      const w = series.filter((p) => p.date > from && p.date <= to);
      return w.length ? W.sum(w, (p) => p.value) / w.length : null;
    };
    const t = W.today();
    const a7 = avgOf(W.addDays(t, -7), t), p7 = avgOf(W.addDays(t, -14), W.addDays(t, -7));
    const target = W.targetWeight();
    const range = LS.get('wo.wRange', '90');
    const from = range === 'all' ? null : [W.addDays(t, -+range), series[0].date].sort()[1];
    const shown = from ? series.filter((p) => p.date >= from) : series;
    const shownMa = from ? ma.filter((p) => p.date >= from) : ma;
    const showTarget = !!target && target >= Math.min(...shown.map((p) => p.value)) - 3;
    const chart = C.timeChart({
      series: [
        { points: shownMa, line: true, cls: 'ma' },
        { points: shown, dots: true, cls: 'raw', r: 3, dotClass: (p) => (p.source === 'InBody' ? 'ib' : '') },
      ],
      // 目標太遠時不畫（避免把曲線壓扁），距目標已顯示在上方
      refs: showTarget ? [{ value: target, label: `目標 ${target}`, cls: 'target' }] : [],
      from: from || undefined, to: t, height: 165,
    });

    // 依月份分組的清單
    const groups = {};
    series.slice().reverse().forEach((p, i, arr) => {
      const k = p.date.slice(0, 7);
      (groups[k] = groups[k] || []).push({ p, prev: arr[i + 1] });
    });

    return head + `
      <div class="card w-hero tone-weight">
        <div class="w-main">
          <div><span class="eyebrow">最新</span><div class="big">${num(last.value, 1)}<small>kg</small></div>
            <div class="muted sm">${W.fmtDate(last.date, 'mdw')}・${W.relDay(last.date)}${last.source === 'InBody' ? '・InBody' : ''}</div></div>
          ${C.spark(series.slice(-30).map((p) => p.value), 110, 40)}
        </div>
        <div class="stat3">
          <div><span>7 日平均</span><b>${num(a7, 1)}<small>kg</small></b></div>
          <div><span>較前 7 日</span><b class="${a7 != null && p7 != null ? (a7 - p7 <= 0 ? 'good' : 'bad') : ''}">${a7 != null && p7 != null ? signed(a7 - p7) : '–'}<small>kg</small></b></div>
          <div><span>距目標</span><b>${target ? num(Math.max(last.value - target, 0), 1) : '–'}<small>kg</small></b></div>
        </div>
      </div>
      <div class="chips" id="wRange">${RANGES.map(([k, l]) => `<button class="chip ${k === range ? 'on' : ''}" data-k="${k}">${l}</button>`).join('')}</div>
      <div class="card chart-card tone-weight">${chart}
        <div class="legend center"><span><i class="lg-dot"></i>每日</span><span><i class="lg-dot ib"></i>InBody</span><span><i class="lg-line"></i>7 日平均</span>${showTarget ? '<span><i class="lg-dash"></i>目標</span>' : ''}</div>
      </div>
      ${analysis(series, ma, target)}
      <p class="muted sm pad">每天體重會因水分、鹽分、排便上下 1–2 kg，看 <b>7 日平均</b>的走向比單日數字準。</p>
      ${Object.keys(groups).map((m) => `<div class="sec-head"><h2>${+m.slice(5)} 月</h2><span class="muted sm">${m.slice(0, 4)}</span></div>
        <div class="card list-card">${groups[m].map(({ p, prev }) => {
          const d = prev ? p.value - prev.value : null;
          return `<button class="wrow" data-date="${p.date}">
            <div class="wrow-d"><b>${W.fmtDate(p.date, 'short')}</b><span>週${W.WD[W.parseDate(p.date).getDay()]}</span></div>
            <div class="wrow-v"><b>${num(p.value, 1)}</b><small>kg</small>${p.source === 'InBody' ? '<span class="pill dark">InBody</span>' : ''}${p.note ? `<span class="wrow-note">${esc(p.note)}</span>` : ''}</div>
            <em class="${d == null ? '' : d <= 0 ? 'good' : 'bad'}">${d == null ? '' : signed(d)}</em></button>`;
        }).join('')}</div>`).join('')}
      <div class="foot-space"></div>`;
  }
  viewWeight.mount = (v) => {
    ['#wAdd', '#wAdd2'].forEach((s) => { const b = $(s, v); if (b) b.onclick = () => openWeightSheet(); });
    $$('#wRange .chip', v).forEach((b) => (b.onclick = () => { LS.set('wo.wRange', b.dataset.k); W.render.keepScroll = true; W.render(); }));
    $$('.wrow', v).forEach((b) => (b.onclick = () => {
      const p = W.weightSeries().find((x) => x.date === b.dataset.date);
      if (!p) return;
      if (p.source === 'InBody' && p.inbodyId) location.hash = '#/inbody/r/' + p.inbodyId;
      else openWeightSheet(p.date);
    }));
  };

  /** 分析：減重速度、預估達標、每週變化 */
  function analysis(series, ma, target) {
    if (series.length < 2) return '';
    const t = W.today();
    const maAt = (d) => { const l = ma.filter((p) => p.date <= d); return l.length ? l[l.length - 1].value : null; };
    const now = maAt(t);
    // 用近 28 天的 7 日平均做線性回歸，得到每週變化速度
    const win = ma.filter((p) => W.daysBetween(p.date, t) <= 28);
    let rate = null;
    if (win.length >= 2 && W.daysBetween(win[0].date, win[win.length - 1].date) >= 4) {
      const xs = win.map((p) => W.daysBetween(win[0].date, p.date)), ys = win.map((p) => p.value);
      const mx = W.sum(xs) / xs.length, my = W.sum(ys) / ys.length;
      const slope = W.sum(xs.map((x, i) => (x - mx) * (ys[i] - my))) / (W.sum(xs.map((x) => (x - mx) ** 2)) || 1);
      rate = slope * 7;
    }
    const bw = now || series[series.length - 1].value;
    const pctRate = rate != null ? (rate / bw) * 100 : null;
    let eta = '–', etaSub = '';
    if (target && rate != null && rate < -0.05 && bw > target) {
      const weeks = (bw - target) / -rate;
      eta = W.fmtDate(W.addDays(t, Math.round(weeks * 7)), 'short');
      etaSub = `約 ${Math.round(weeks)} 週`;
    } else if (target && bw <= target) { eta = '已達成'; }
    const pace = pctRate == null ? '' : pctRate < -1 ? '偏快，注意肌肉流失' : pctRate <= -0.5 ? '理想速度' : pctRate < 0 ? '穩定下降' : '持平或上升';
    // 近 8 週每週平均的變化
    const ws0 = W.weekStart(t);
    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const s = W.addDays(ws0, -7 * i), e = W.addDays(s, 7);
      const l = series.filter((p) => p.date >= s && p.date < e);
      weeks.push({ s, avg: l.length ? W.sum(l, (p) => p.value) / l.length : null, n: l.length });
    }
    const deltas = [];
    weeks.forEach((w, i) => {
      const prev = weeks.slice(0, i).reverse().find((x) => x.avg != null);
      if (w.avg != null && prev) deltas.push({ label: W.fmtDate(w.s, 'short'), value: w.avg - prev.avg, text: signed(w.avg - prev.avg) });
    });
    const logged = series.filter((p) => W.daysBetween(p.date, t) < 30).length;
    return `<div class="card tone-weight">
      <div class="card-h"><h3>分析</h3><span class="muted sm">依 7 日平均</span></div>
      <div class="ana">
        <div><span>每週變化</span><b>${rate == null ? '–' : signed(rate, 2)}<small>kg</small></b><em>${pace}</em></div>
        <div><span>預估達標</span><b>${eta}</b><em>${etaSub || (target ? '目標 ' + target + ' kg' : '未設定目標')}</em></div>
        <div><span>近 30 天記錄</span><b>${logged}<small>天</small></b><em>${logged >= 20 ? '很規律' : '多量幾天更準'}</em></div>
      </div>
      ${deltas.length ? `<div class="sub-h">每週平均變化</div>${C.dbars(deltas.slice(-6))}` : ''}
      <p class="hint">減脂建議速度約每週體重的 0.5–1%（你約 ${num(bw * 0.005, 1)}–${num(bw * 0.01, 1)} kg）。</p>
    </div>`;
  }

  /** 記錄 / 編輯體重 */
  function openWeightSheet(date) {
    const series = W.weightSeries();
    let day = date || W.today();
    const existing = () => series.find((p) => p.date === day);
    const lastVal = series.length ? series[series.length - 1].value : null;
    const cur = existing();
    const editId = date && cur && cur.source !== 'InBody' ? cur.id : '';
    sheet(`<div class="sheet-body">
        <h3>${editId ? '編輯體重' : '記錄體重'}</h3>
        <label class="field"><span>日期</span><input type="date" name="date" value="${day}" max="${W.today()}"></label>
        <div class="w-input">${W.stepper('weight', cur ? cur.value : lastVal, 0.1, 1)}<span>kg</span></div>
        <div id="wNotice"></div>
        <label class="field"><span>備註（選填）</span><input name="note" value="${esc(cur && cur.note || '')}" placeholder="例如：晚上量、前一天吃火鍋"></label>
        <div class="btn-row">${editId ? `<button class="btn ghost danger-text" data-a="del">${icon('trash')}刪除</button>` : ''}
          <button class="btn primary" data-a="save">${icon('check')}儲存</button></div>
      </div>`, (w, close) => {
      W.bindSteppers(w);
      const dateInp = $('[name=date]', w), wInp = $('[name=weight]', w), saveBtn = $('[data-a=save]', w);
      const check = () => {
        day = dateInp.value;
        const e = series.find((p) => p.date === day);
        const ib = e && e.source === 'InBody';
        $('#wNotice', w).innerHTML = ib
          ? `<div class="notice">${icon('warn')}<div>這天已有 InBody 量測 <b>${num(e.value, 1)} kg</b>，以 InBody 為準。</div></div>`
          : e && !editId ? `<div class="notice">${icon('refresh')}<div>這天已記錄 <b>${num(e.value, 1)} kg</b>，儲存會覆蓋。</div></div>` : '';
        saveBtn.disabled = ib;
      };
      dateInp.onchange = check;
      check();
      setTimeout(() => { wInp.focus(); wInp.select(); }, 320);
      saveBtn.onclick = async () => {
        const val = parseFloat(wInp.value);
        if (!(val > 20 && val < 400)) { toast('請輸入正確的體重', 'err'); return; }
        const rec = await act('儲存中…', () => call('weight.save', { record: { id: editId, date: day, weight: W.round(val, 1), note: $('[name=note]', w).value.trim() } }));
        if (!rec) return;
        W.setCol('weight', W.S.data.weight.filter((x) => x.id !== rec.id && !(x.date === rec.date && x.source !== 'InBody')).concat([rec]));
        close();
        toast(`已記錄 ${num(rec.weight, 1)} kg`, 'ok');
        W.render.keepScroll = true;
        W.render();
      };
      const del = $('[data-a=del]', w);
      if (del) del.onclick = async () => {
        const r = await act('刪除中…', () => call('data.delete', { col: 'weight', id: editId }));
        if (!r) return;
        W.drop('weight', editId);
        close();
        toast('已刪除');
        W.render.keepScroll = true;
        W.render();
      };
    });
  }

  W.openWeightSheet = openWeightSheet;
  W.route(/^#\/weight$/, viewWeight, { tab: 'body' });
})();
