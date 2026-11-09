/* 每週回顧：體重、訓練、教練課、飲食、熱量收支，一頁看完，可分享給教練 */
(function () {
  const { $, esc, has, num, signed, icon, toast } = W;
  const C = window.Charts;

  function defaultWeek() {
    const t = W.today();
    const ws = W.weekStart(t);
    // 週一、週二還沒什麼資料 → 預設看上週
    return W.daysBetween(ws, t) < 2 ? W.addDays(ws, -7) : ws;
  }

  function collect(ws) {
    const we = W.addDays(ws, 6);
    const inWeek = (d) => d >= ws && d <= we;
    const t = W.today();
    // 體重
    const series = W.weightSeries();
    const ma = W.movingAvg(series);
    const maAt = (d) => { const l = ma.filter((p) => p.date <= d); return l.length ? l[l.length - 1].value : null; };
    const wk = series.filter((p) => inWeek(p.date));
    const endD = we > t ? t : we;
    const wStart = maAt(W.addDays(ws, -1)), wEnd = maAt(endD);
    const wDelta = wStart != null && wEnd != null && wk.length ? wEnd - wStart : null;
    const ib = W.S.data.inbody.filter((r) => inWeek(W.dayOf(r.date)));
    // 訓練
    const wos = W.S.data.workout.filter((w) => inWeek(w.date));
    const prevWos = W.S.data.workout.filter((w) => w.date >= W.addDays(ws, -7) && w.date < ws);
    const kcal = W.sum(wos, (w) => (W.T.burn(w) || {}).total || 0);
    const prs = [];
    wos.forEach((w) => (w.exercises || []).forEach((e) => { if (W.T.isPR(w, e)) prs.push({ w, e }); }));
    const coach = wos.filter((w) => w.isCoach === 'V');
    const cues = [];
    coach.forEach((w) => (w.cues || []).forEach((c) => cues.push({ c, w })));
    // 飲食
    const tg = W.nutritionTargets();
    const days = Array.from({ length: 7 }, (_, i) => W.addDays(ws, i)).filter((d) => d <= t);
    const tots = days.map((d) => W.F.dayTotals(d)).filter((x) => x.count);
    const avg = (f) => (tots.length ? W.sum(tots, f) / tots.length : null);
    const pMet = tots.filter((x) => x.protein >= tg.protein * 0.9).length;
    const bal = W.F.weekBalance(ws);
    return { ws, we, wk, wStart, wEnd, wDelta, ib, wos, prevWos, kcal, prs, coach, cues, tg, days, tots, avgK: avg((x) => x.kcal), avgP: avg((x) => x.protein), pMet, bal };
  }

  function highlights(r) {
    const h = [];
    if (r.wDelta != null) {
      const pct = r.wEnd ? (r.wDelta / r.wEnd) * 100 : 0;
      h.push([r.wDelta <= 0 ? 'good' : 'bad', `體重 7 日平均 ${signed(r.wDelta, 2)} kg${r.wDelta < 0 ? (pct < -1 ? '，速度偏快，留意肌肉流失' : pct <= -0.5 ? '，速度理想' : '，穩定下降') : '，本週沒有下降'}`]);
    }
    if (r.wos.length) h.push([r.wos.length >= r.prevWos.length ? 'good' : '', `訓練 ${r.wos.length} 次（上週 ${r.prevWos.length} 次），消耗約 ${r.kcal.toLocaleString()} kcal`]);
    else h.push(['bad', '本週還沒有訓練紀錄']);
    if (r.prs.length) h.push(['good', `新紀錄：${[...new Set(r.prs.map((p) => p.e.name))].join('、')}`]);
    if (r.tots.length) h.push([r.pMet >= r.tots.length * 0.7 ? 'good' : 'bad', `蛋白質達標 ${r.pMet} / ${r.tots.length} 天（目標 ${r.tg.protein} g）`]);
    if (r.bal.logged && r.bal.avgBal != null) h.push([r.bal.avgBal < 0 ? 'good' : 'bad', `平均每日熱量${r.bal.avgBal < 0 ? '赤字' : '盈餘'} ${Math.abs(Math.round(r.bal.avgBal))} kcal`]);
    if (r.coach.length) h.push(['', `上了 ${r.coach.length} 堂教練課，記了 ${r.cues.length} 個重點`]);
    return h;
  }

  function shareText(r) {
    const L = [`【週回顧】${W.fmtDate(r.ws, 'short')}–${W.fmtDate(r.we, 'short')}`];
    if (r.wEnd != null) L.push(`體重：7 日平均 ${num(r.wEnd, 1)} kg（${r.wDelta == null ? '–' : signed(r.wDelta, 2)} kg）`);
    r.ib.forEach((x) => L.push(`InBody ${W.fmtDate(x.date, 'short')}：體重 ${num(x.weight, 1)}・骨骼肌 ${num(x.smm, 1)}・體脂率 ${num(x.pbf, 1)}%`));
    L.push(`訓練：${r.wos.length} 次，約 ${r.kcal} kcal`);
    r.wos.forEach((w) => L.push(`・${W.fmtDate(w.date, 'sw')} ${w.title}${w.summary ? '：' + w.summary : ''}`));
    if (r.prs.length) L.push(`新紀錄：${[...new Set(r.prs.map((p) => p.e.name))].join('、')}`);
    if (r.tots.length) L.push(`飲食：${r.tots.length} 天有紀錄，平均 ${Math.round(r.avgK)} kcal、蛋白質 ${Math.round(r.avgP)} g（達標 ${r.pMet} 天）`);
    if (r.bal.avgBal != null) L.push(`熱量收支：每日平均 ${Math.round(r.bal.avgBal)} kcal`);
    return L.join('\n');
  }

  function viewReview() {
    const ws = W.query().w || defaultWeek();
    const r = collect(ws);
    const t = W.today();
    const cur = W.weekStart(t);
    const h = highlights(r);
    const wkPts = r.wk.map((p) => ({ date: p.date, value: p.value, source: p.source }));
    return W.pageHead('週回顧', 'Weekly Review', { back: '#/home', right: `<button class="icon-btn" id="rvShare" aria-label="分享">${icon('link')}</button>` }) + `
      <div class="datebar">
        <a href="#/review?w=${W.addDays(ws, -7)}" class="db-arrow">${icon('back')}</a>
        <div class="db-mid"><b>${W.fmtDate(ws, 'md')} – ${W.fmtDate(r.we, 'md')}</b><span>${ws === cur ? '本週（進行中）' : ws === W.addDays(cur, -7) ? '上週' : ''}</span></div>
        <a href="#/review?w=${W.addDays(ws, 7)}" class="db-arrow ${ws >= cur ? 'disabled' : ''}">${icon('chevron')}</a>
      </div>
      <div class="card hl">${h.map(([c, txt]) => `<div class="hl-i hl-${c || 'n'}"><i></i><span>${txt}</span></div>`).join('')}</div>

      <div class="card tone-weight">
        <div class="card-h"><h3>體重</h3><span class="muted sm">${r.wk.length} 天有量</span></div>
        <div class="ana">
          <div><span>週末 7 日平均</span><b>${num(r.wEnd, 1)}<small>kg</small></b><em>上週 ${num(r.wStart, 1)}</em></div>
          <div><span>本週變化</span><b class="${r.wDelta == null ? '' : r.wDelta <= 0 ? 'good' : 'bad'}">${r.wDelta == null ? '–' : signed(r.wDelta, 2)}<small>kg</small></b><em>依 7 日平均</em></div>
          <div><span>最低 / 最高</span><b>${r.wk.length ? num(Math.min(...r.wk.map((p) => p.value)), 1) : '–'}</b><em>${r.wk.length ? '最高 ' + num(Math.max(...r.wk.map((p) => p.value)), 1) : ''}</em></div>
        </div>
        ${wkPts.length >= 2 ? C.timeChart({ series: [{ points: wkPts, line: true, dots: true, cls: 'raw', dotClass: (p) => (p.source === 'InBody' ? 'ib' : '') }], from: ws, to: r.we, height: 120 }) : ''}
        ${r.ib.map((x) => `<a class="rv-ib" href="#/inbody/r/${x.id}">InBody ${W.fmtDate(x.date, 'short')}・骨骼肌 <b>${num(x.smm, 1)}</b>・體脂率 <b>${num(x.pbf, 1)}%</b>・分數 <b>${num(x.score, 0)}</b> ›</a>`).join('')}
      </div>

      <div class="card tone-train">
        <div class="card-h"><h3>訓練</h3><span class="muted sm">上週 ${r.prevWos.length} 次</span></div>
        <div class="ana">
          <div><span>次數</span><b>${r.wos.length}<small>次</small></b><em>${r.coach.length} 堂教練課</em></div>
          <div><span>總時長</span><b>${W.sum(r.wos, (w) => w.duration)}<small>分</small></b><em>${Math.round(W.sum(r.wos, W.T.woVol)).toLocaleString()} kg</em></div>
          <div><span>消耗</span><b>${r.kcal.toLocaleString()}<small>kcal</small></b><em>估算</em></div>
        </div>
        ${r.wos.map((w) => `<a class="rv-row" href="#/training/w/${w.id}"><span>${W.fmtDate(w.date, 'sw')}</span><b>${esc(w.title)}</b><em>${(W.T.burn(w) || {}).total || '–'} kcal</em></a>`).join('')}
        ${r.prs.length ? `<div class="rv-pr">${icon('trophy')}新紀錄：${[...new Set(r.prs.map((p) => esc(p.e.name)))].join('、')}</div>` : ''}
      </div>

      ${r.cues.length ? `<div class="card tone-coach"><div class="card-h"><h3>教練重點</h3><span class="muted sm">${r.cues.length} 則</span></div>
        ${r.cues.map(({ c, w }) => `<a class="cue-row" href="#/training/w/${w.id}"><span class="pill ok">${esc(c.cat || '其他')}</span><p>${c.ex ? `<b>${esc(c.ex)}</b>：` : ''}${esc(c.text)}</p><em>${W.fmtDate(w.date, 'short')}</em></a>`).join('')}</div>` : ''}

      <div class="card tone-food">
        <div class="card-h"><h3>飲食</h3><span class="muted sm">${r.tots.length} / ${r.days.length} 天有紀錄</span></div>
        <div class="ana">
          <div><span>平均熱量</span><b>${r.avgK == null ? '–' : Math.round(r.avgK).toLocaleString()}</b><em>目標 ${r.tg.kcal.toLocaleString()}</em></div>
          <div><span>平均蛋白質</span><b>${r.avgP == null ? '–' : Math.round(r.avgP)}<small>g</small></b><em>目標 ${r.tg.protein} g</em></div>
          <div><span>蛋白質達標</span><b>${r.pMet}<small>/ ${r.tots.length} 天</small></b><em>≥ 目標 90%</em></div>
        </div>
        ${r.bal.avgBal != null ? `<div class="bal-cmp"><span>每日收支 <b class="${r.bal.avgBal < 0 ? 'good' : 'bad'}">${r.bal.avgBal > 0 ? '+' : ''}${Math.round(r.bal.avgBal)} kcal</b></span><span>預估 <b>${r.bal.pred == null ? '–' : signed(r.bal.pred, 2)}</b>・實際 <b>${r.bal.actual == null ? '–' : signed(r.bal.actual, 2)}</b> kg</span></div>` : ''}
      </div>
      <button class="btn primary block" id="rvShare2">${icon('link')}分享給教練</button>
      <div class="foot-space"></div>`;
  }
  viewReview.mount = (v) => {
    const ws = W.query().w || defaultWeek();
    const doShare = async () => {
      const text = shareText(collect(ws));
      try {
        if (navigator.share) { await navigator.share({ title: '週回顧', text }); return; }
      } catch (e) { if (e.name === 'AbortError') return; }
      try { await navigator.clipboard.writeText(text); toast('已複製，可以貼到 LINE 給教練', 'ok'); } catch (e) { toast('無法複製', 'err'); }
    };
    $('#rvShare', v).onclick = doShare;
    $('#rvShare2', v).onclick = doShare;
  };

  W.route(/^#\/review$/, viewReview, { tab: 'home' });
})();
