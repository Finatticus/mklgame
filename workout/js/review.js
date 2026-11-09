/* 每週回顧：習慣達成、每日一覽、體重、訓練、教練課、飲食、熱量收支、下週建議；可存成圖片 */
(function () {
  const { $, esc, num, signed, icon, toast, sheet } = W;
  const C = window.Charts;

  function defaultWeek() {
    const t = W.today();
    const ws = W.weekStart(t);
    return W.daysBetween(ws, t) < 2 ? W.addDays(ws, -7) : ws; // 週一、二預設看上週
  }

  function collect(ws) {
    const we = W.addDays(ws, 6);
    const t = W.today();
    const inWeek = (d) => d >= ws && d <= we;
    const days = Array.from({ length: 7 }, (_, i) => W.addDays(ws, i));
    const past = days.filter((d) => d <= t);
    // 體重
    const series = W.weightSeries();
    const ma = W.movingAvg(series);
    const maAt = (d) => { const l = ma.filter((p) => p.date <= d); return l.length ? l[l.length - 1].value : null; };
    const wk = series.filter((p) => inWeek(p.date));
    const endD = we > t ? t : we;
    const wStart = maAt(W.addDays(ws, -1)), wEnd = maAt(endD);
    const wDelta = wStart != null && wEnd != null && wk.length ? wEnd - wStart : null;
    const w3 = maAt(W.addDays(endD, -21));
    const rate = w3 != null && wEnd != null ? (wEnd - w3) / 3 : null; // 近 3 週平均每週
    const target = W.targetWeight();
    const eta = target && rate && rate < -0.05 && wEnd > target ? W.addDays(endD, Math.round(((wEnd - target) / -rate) * 7)) : null;
    const ib = W.S.data.inbody.filter((r) => inWeek(W.dayOf(r.date)));
    const ibPrev = ib.length ? W.S.data.inbody.filter((r) => W.dayOf(r.date) < W.dayOf(ib[0].date)).slice(-1)[0] : null;
    // 訓練
    const wos = W.S.data.workout.filter((w) => inWeek(w.date));
    const prevWos = W.S.data.workout.filter((w) => w.date >= W.addDays(ws, -7) && w.date < ws);
    const vol = W.sum(wos, W.T.woVol), prevVol = W.sum(prevWos, W.T.woVol);
    const kcal = W.sum(wos, (w) => (W.T.burn(w) || {}).total || 0);
    const prs = [];
    const best = {};
    wos.forEach((w) => (w.exercises || []).forEach((e) => {
      if (W.T.isPR(w, e)) prs.push(e.name);
      const k = e.kind || W.T.exInfo(e.name).k;
      if (k !== 'w') return;
      (e.sets || []).forEach((s) => {
        const r1 = +s.w * (1 + (+s.r) / 30);
        if (+s.w > 0 && +s.r > 0 && (!best[e.name] || r1 > best[e.name].r1)) best[e.name] = { s, r1 };
      });
    }));
    const parts = {};
    wos.forEach((w) => (w.exercises || []).forEach((e) => {
      const c = e.cat || W.T.exInfo(e.name).c;
      if (c !== '有氧') parts[c] = (parts[c] || 0) + (e.sets || []).length;
    }));
    const coach = wos.filter((w) => w.isCoach === 'V');
    const cues = [];
    coach.forEach((w) => (w.cues || []).forEach((c) => cues.push({ c, w })));
    // 飲食
    const tg = W.nutritionTargets();
    const dayT = days.map((d) => ({ d, t: W.F.dayTotals(d) }));
    const logged = dayT.filter((x) => x.t.count && x.d <= t);
    const avg = (f) => (logged.length ? W.sum(logged, (x) => f(x.t)) / logged.length : null);
    const pMet = logged.filter((x) => x.t.protein >= tg.protein * 0.9).length;
    const P = W.sum(logged, (x) => x.t.protein) * 4, Cb = W.sum(logged, (x) => x.t.carb) * 4, F = W.sum(logged, (x) => x.t.fat) * 9;
    const bal = W.F.weekBalance(ws);
    const trainGoal = +((W.S.data.settings || {}).trainGoal) || 3;
    return {
      ws, we, t, days, past, wk, wStart, wEnd, wDelta, rate, target, eta, ib, ibPrev,
      wos, prevWos, vol, prevVol, kcal, prs: [...new Set(prs)], best, parts, coach, cues,
      tg, dayT, logged, avgK: avg((x) => x.kcal), avgP: avg((x) => x.protein), avgFiber: avg((x) => x.fiber), pMet, macro: { P, Cb, F },
      bal, trainGoal, next: W.T.nextCoachDate(),
    };
  }

  function highlights(r) {
    const h = [];
    if (r.wDelta != null) {
      const pct = r.wEnd ? (r.wDelta / r.wEnd) * 100 : 0;
      h.push([r.wDelta <= 0 ? 'good' : 'bad', `體重 7 日平均 ${signed(r.wDelta, 2)} kg${r.wDelta < 0 ? (pct < -1 ? '，速度偏快' : pct <= -0.5 ? '，速度理想' : '，穩定下降') : '，本週沒有下降'}`]);
    }
    h.push([r.wos.length >= r.trainGoal ? 'good' : r.wos.length ? '' : 'bad', `訓練 ${r.wos.length} 次（上週 ${r.prevWos.length}），消耗約 ${r.kcal.toLocaleString()} kcal`]);
    if (r.prs.length) h.push(['good', `新紀錄：${r.prs.join('、')}`]);
    if (r.logged.length) h.push([r.pMet >= r.logged.length * 0.7 ? 'good' : 'bad', `蛋白質達標 ${r.pMet} / ${r.logged.length} 天`]);
    if (r.bal.avgBal != null) h.push([r.bal.avgBal < 0 ? 'good' : 'bad', `平均每日熱量${r.bal.avgBal < 0 ? '赤字' : '盈餘'} ${Math.abs(Math.round(r.bal.avgBal))} kcal`]);
    if (r.ib.length) h.push(['', `本週量了 InBody：骨骼肌 ${num(r.ib[r.ib.length - 1].smm, 1)} kg、體脂率 ${num(r.ib[r.ib.length - 1].pbf, 1)}%`]);
    return h;
  }

  /** 下週建議：依本週資料給 2–4 點 */
  function advice(r) {
    const a = [];
    if (r.logged.length && r.pMet < r.logged.length * 0.7) a.push(`蛋白質只有 ${r.pMet} 天達標，平均 ${Math.round(r.avgP)} g（目標 ${r.tg.protein} g）。每天多一份蛋白質來源，例如無糖豆漿、希臘優格或一包雞胸。`);
    if (r.wos.length < r.trainGoal) a.push(`訓練 ${r.wos.length} 次，比目標 ${r.trainGoal} 次少。下週先把時間排進行事曆。`);
    if (r.bal.avgBal != null && r.bal.avgBal < -1000) a.push(`每日赤字約 ${Math.abs(Math.round(r.bal.avgBal))} kcal，偏大，容易掉肌肉與影響訓練表現，可以把赤字控制在 300–700 kcal。`);
    if (r.bal.avgBal != null && r.bal.avgBal > 0) a.push('本週熱量是盈餘，減脂期可以從飲料、宵夜或外食的油脂先調整。');
    if (r.logged.length && r.logged.length < r.past.length - 1) a.push(`飲食只記了 ${r.logged.length} 天，記錄越完整，熱量收支越準。可以用「常吃組合」一鍵記錄。`);
    if (r.wk.length < 4) a.push('體重量測天數偏少，固定早上起床後量，7 日平均才準。');
    const lowPart = ['胸', '背', '腿'].filter((c) => (r.parts[c] || 0) < 6 && r.wos.length);
    if (lowPart.length) a.push(`${lowPart.join('、')}本週組數偏少（< 6 組），可以請教練安排。`);
    if (!a.length) a.push('各項都很穩定，維持同樣的節奏就好！');
    return a.slice(0, 4);
  }

  function ringMini(v, max, label, sub) {
    const p = Math.max(0, Math.min(max ? v / max : 0, 1));
    const r = 22, c = 2 * Math.PI * r;
    return `<div class="hab"><svg viewBox="0 0 54 54"><circle cx="27" cy="27" r="${r}" class="hab-bg"/><circle cx="27" cy="27" r="${r}" class="hab-fg ${p >= 1 ? 'full' : ''}" stroke-dasharray="${c * p} ${c}" transform="rotate(-90 27 27)"/>
      <text x="27" y="31" text-anchor="middle">${v}/${max}</text></svg><b>${label}</b><span>${sub}</span></div>`;
  }

  function viewReview() {
    const ws = W.query().w || defaultWeek();
    const r = collect(ws);
    const cur = W.weekStart(r.t);
    const tot = r.macro.P + r.macro.Cb + r.macro.F || 1;
    const pct = (v) => Math.round((v / tot) * 100);
    const parts = Object.entries(r.parts).sort((a, b) => b[1] - a[1]);
    const bestList = Object.entries(r.best).sort((a, b) => b[1].r1 - a[1].r1).slice(0, 6);
    const volChg = r.prevVol ? Math.round(((r.vol - r.prevVol) / r.prevVol) * 100) : null;
    const wkPts = r.wk.map((p) => ({ date: p.date, value: p.value, source: p.source }));
    const ibl = r.ib[r.ib.length - 1];

    const daily = `<table class="rv-days"><thead><tr><th></th>${r.days.map((d) => `<th class="${d === r.t ? 'today' : ''}">${W.WD[W.parseDate(d).getDay()]}<small>${W.fmtDate(d, 'short')}</small></th>`).join('')}</tr></thead><tbody>
      <tr><th>體重</th>${r.days.map((d) => { const p = r.wk.find((x) => x.date === d); return `<td>${p ? num(p.value, 1) : '·'}</td>`; }).join('')}</tr>
      <tr><th>熱量</th>${r.dayT.map((x) => `<td class="${x.t.count && x.t.kcal > r.tg.kcal ? 'bad' : ''}">${x.t.count ? Math.round(x.t.kcal) : '·'}</td>`).join('')}</tr>
      <tr><th>蛋白質</th>${r.dayT.map((x) => `<td class="${x.t.count ? (x.t.protein >= r.tg.protein * 0.9 ? 'good' : 'bad') : ''}">${x.t.count ? Math.round(x.t.protein) : '·'}</td>`).join('')}</tr>
      <tr><th>訓練</th>${r.days.map((d) => { const l = r.wos.filter((w) => w.date === d); return `<td>${l.length ? `<i class="dot ${l.some((w) => w.isCoach === 'V') ? 'coach' : 'train'}"></i>` : '·'}</td>`; }).join('')}</tr>
    </tbody></table>`;

    return W.pageHead('週回顧', 'Weekly Review', { back: '#/home', right: `<button class="icon-btn" id="rvImg" aria-label="存成圖片">${icon('image')}</button>` }) + `
      <div class="datebar">
        <a href="#/review?w=${W.addDays(ws, -7)}" class="db-arrow">${icon('back')}</a>
        <div class="db-mid"><b>${W.fmtDate(ws, 'md')} – ${W.fmtDate(r.we, 'md')}</b><span>${ws === cur ? '本週（進行中）' : ws === W.addDays(cur, -7) ? '上週' : ''}</span></div>
        <a href="#/review?w=${W.addDays(ws, 7)}" class="db-arrow ${ws >= cur ? 'disabled' : ''}">${icon('chevron')}</a>
      </div>

      <div id="rvCapture">
        <div class="rv-cap-head"><b>週回顧</b><span>${W.fmtDate(ws, 'day')} – ${W.fmtDate(r.we, 'day')}・${esc(W.S.session.account)}</span></div>

        <div class="card rv-hab">
          ${ringMini(r.wos.length, r.trainGoal, '訓練', `目標 ${r.trainGoal} 次`)}
          ${ringMini(r.logged.length, r.past.length, '飲食記錄', `${r.past.length} 天中`)}
          ${ringMini(r.pMet, r.past.length, '蛋白質達標', `≥ ${Math.round(r.tg.protein * 0.9)} g`)}
          ${ringMini(r.wk.length, r.past.length, '體重量測', '早上起床')}
        </div>

        <div class="card hl">${highlights(r).map(([c, txt]) => `<div class="hl-i hl-${c || 'n'}"><i></i><span>${txt}</span></div>`).join('')}</div>

        <div class="card"><div class="card-h"><h3>每日一覽</h3><span class="muted sm">綠＝達標・紅＝超標/未達</span></div>${daily}</div>

        <div class="card tone-weight">
          <div class="card-h"><h3>體重</h3><span class="muted sm">${r.wk.length} 天有量</span></div>
          <div class="ana">
            <div><span>7 日平均</span><b>${num(r.wEnd, 1)}<small>kg</small></b><em>上週 ${num(r.wStart, 1)}</em></div>
            <div><span>本週變化</span><b class="${r.wDelta == null ? '' : r.wDelta <= 0 ? 'good' : 'bad'}">${r.wDelta == null ? '–' : signed(r.wDelta, 2)}<small>kg</small></b><em>近 3 週 ${r.rate == null ? '–' : signed(r.rate, 2)}/週</em></div>
            <div><span>距目標</span><b>${r.target && r.wEnd ? num(Math.max(r.wEnd - r.target, 0), 1) : '–'}<small>kg</small></b><em>${r.eta ? '預估 ' + W.fmtDate(r.eta, 'short') : r.target ? '目標 ' + r.target : ''}</em></div>
          </div>
          ${wkPts.length >= 2 ? C.timeChart({ series: [{ points: wkPts, line: true, dots: true, cls: 'raw', dotClass: (p) => (p.source === 'InBody' ? 'ib' : '') }], from: ws, to: r.we, height: 110 }) : ''}
          ${ibl ? `<div class="rv-ib"><b>InBody ${W.fmtDate(ibl.date, 'short')}</b>　骨骼肌 ${num(ibl.smm, 1)}${r.ibPrev ? `（${signed(ibl.smm - r.ibPrev.smm)}）` : ''}・體脂率 ${num(ibl.pbf, 1)}%${r.ibPrev ? `（${signed(ibl.pbf - r.ibPrev.pbf)}）` : ''}・分數 ${num(ibl.score, 0)}</div>` : ''}
        </div>

        <div class="card tone-train">
          <div class="card-h"><h3>訓練</h3><span class="muted sm">上週 ${r.prevWos.length} 次</span></div>
          <div class="ana">
            <div><span>次數 / 時長</span><b>${r.wos.length}<small>次</small></b><em>${W.sum(r.wos, (w) => w.duration)} 分・${r.coach.length} 堂教練課</em></div>
            <div><span>訓練量</span><b>${(r.vol / 1000).toFixed(1)}<small>t</small></b><em>${volChg == null ? '上週無資料' : `較上週 ${volChg > 0 ? '+' : ''}${volChg}%`}</em></div>
            <div><span>消耗</span><b>${r.kcal.toLocaleString()}<small>kcal</small></b><em>估算</em></div>
          </div>
          ${parts.length ? `<div class="sub-h">部位組數</div>${C.hbars(parts.map(([c, n]) => ({ label: c, value: n, text: `${n}<small>組</small>` })))}` : ''}
          ${bestList.length ? `<div class="sub-h">本週最佳組</div><div class="rv-best">${bestList.map(([n, b]) => `<div><span>${esc(n)}${r.prs.includes(n) ? ' 🏆' : ''}</span><b>${num(b.s.w)}kg × ${b.s.r}</b></div>`).join('')}</div>` : ''}
        </div>

        ${r.cues.length ? `<div class="card tone-coach"><div class="card-h"><h3>教練重點</h3><span class="muted sm">${r.coach.length} 堂・${r.next ? '下次 ' + W.fmtDate(r.next, 'sw') : ''}</span></div>
          ${r.cues.map(({ c }) => `<div class="cue-row"><span class="pill ok">${esc(c.cat || '其他')}</span><p>${c.ex ? `<b>${esc(c.ex)}</b>：` : ''}${esc(c.text)}</p><em></em></div>`).join('')}</div>` : ''}

        <div class="card tone-food">
          <div class="card-h"><h3>飲食</h3><span class="muted sm">${r.logged.length} 天有紀錄</span></div>
          <div class="ana">
            <div><span>平均熱量</span><b>${r.avgK == null ? '–' : Math.round(r.avgK).toLocaleString()}</b><em>目標 ${r.tg.kcal.toLocaleString()}</em></div>
            <div><span>平均蛋白質</span><b>${r.avgP == null ? '–' : Math.round(r.avgP)}<small>g</small></b><em>目標 ${r.tg.protein} g</em></div>
            <div><span>每日收支</span><b class="${r.bal.avgBal == null ? '' : r.bal.avgBal < 0 ? 'good' : 'bad'}">${r.bal.avgBal == null ? '–' : (r.bal.avgBal > 0 ? '+' : '') + Math.round(r.bal.avgBal)}</b><em>預估 ${r.bal.pred == null ? '–' : signed(r.bal.pred, 2)} kg</em></div>
          </div>
          ${r.logged.length ? `<div class="sub-h">熱量來源</div>
            <div class="ratio"><i class="p" style="flex:${r.macro.P}">蛋白 ${pct(r.macro.P)}%</i><i class="c" style="flex:${r.macro.Cb}">碳水 ${pct(r.macro.Cb)}%</i><i class="f" style="flex:${r.macro.F}">脂肪 ${pct(r.macro.F)}%</i></div>
            <p class="hint">平均膳食纖維 ${Math.round(r.avgFiber || 0)} g（建議 ≥ 25 g）</p>` : ''}
        </div>

        <div class="card rv-adv"><div class="card-h"><h3>下週建議</h3></div>
          ${advice(r).map((t) => `<div class="adv">${t}</div>`).join('')}</div>
      </div>
      <button class="btn primary block" id="rvImg2">${icon('image')}存成圖片</button>
      <div class="foot-space"></div>`;
  }

  /* ---------------- 存成圖片 ---------------- */
  function loadH2C() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      s.onload = () => res(window.html2canvas);
      s.onerror = () => rej(new Error('無法載入圖片工具（需要網路）'));
      document.head.appendChild(s);
    });
  }
  /** SVG 的樣式來自 CSS class，截圖前先寫成 inline，圖表顏色才會正確 */
  function inlineSvgStyles(root) {
    root.querySelectorAll('svg, svg *').forEach((el) => {
      const cs = getComputedStyle(el);
      el.style.fill = cs.fill; el.style.stroke = cs.stroke; el.style.strokeWidth = cs.strokeWidth;
      el.style.strokeDasharray = cs.strokeDasharray; el.style.opacity = cs.opacity;
      if (el.tagName === 'text' || el.tagName === 'tspan') { el.style.fontSize = cs.fontSize; el.style.fontWeight = cs.fontWeight; el.style.fontFamily = cs.fontFamily; }
    });
  }
  async function exportImage(ws) {
    W.busy(true, '產生圖片中…');
    try {
      const h2c = await loadH2C();
      const el = $('#rvCapture');
      inlineSvgStyles(el);
      el.classList.add('capturing');
      const canvas = await h2c(el, { scale: 3, backgroundColor: getComputedStyle(document.body).backgroundColor, useCORS: true, logging: false, windowWidth: 420 });
      el.classList.remove('capturing');
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
      const name = `週回顧_${ws}.png`;
      const file = new File([blob], name, { type: 'image/png' });
      W.busy(false);
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: '週回顧' }); return; } catch (e) { if (e.name === 'AbortError') return; }
      }
      const url = URL.createObjectURL(blob);
      sheet(`<div class="sheet-body"><h3>週回顧圖片</h3><p class="muted sm">手機：長按圖片 →「儲存到照片」。電腦：按下載。</p>
        <img class="rv-out" src="${url}" alt="週回顧"><div class="btn-row"><a class="btn primary" href="${url}" download="${name}">${icon('download')}下載</a></div></div>`, null, { tall: true });
    } catch (e) {
      W.busy(false);
      $('#rvCapture') && $('#rvCapture').classList.remove('capturing');
      toast(e.message || '產生圖片失敗', 'err');
    }
  }

  viewReview.mount = (v) => {
    const ws = W.query().w || defaultWeek();
    $('#rvImg', v).onclick = () => exportImage(ws);
    $('#rvImg2', v).onclick = () => exportImage(ws);
  };

  W.route(/^#\/review$/, viewReview, { tab: 'home' });
})();
