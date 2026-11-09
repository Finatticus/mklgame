/* 首頁 */
(function () {
  const { $, esc, has, num, signed, icon } = W;
  const C = window.Charts;

  function viewHome() {
    const now = new Date();
    const hr = now.getHours();
    const hello = hr < 5 ? '夜深了' : hr < 11 ? '早安' : hr < 18 ? '午安' : '晚安';
    const t = W.today();
    const acc = W.S.session.account;
    const ws = W.weightSeries();
    const lastW = ws[ws.length - 1];
    const todayW = ws.find((p) => p.date === t);
    const ma = W.movingAvg(ws);
    const lastMa = ma.length ? ma[ma.length - 1].value : null;
    const target = W.targetWeight();
    const tg = W.nutritionTargets();
    const ft = W.F.dayTotals(t);
    const todayWo = W.S.data.workout.filter((w) => w.date === t);
    const ib = W.latestInbody();

    const seed = !W.S.data.inbody.some((x) => String(x.date).startsWith('2026-11-09')) && window.SEED_INBODY
      ? `<div class="card seed"><div class="seed-ic">${icon('sparkle')}</div>
          <div class="seed-txt"><b>11/09 教練課的 InBody 已轉錄好</b><span>共 ${Object.keys(window.SEED_INBODY).length} 項數值，確認無誤即可匯入</span></div>
          <button class="btn sm primary" id="seedBtn">檢查並匯入</button></div>` : '';

    const today = `<div class="card today">
      <div class="card-h"><h3>今天</h3><span class="muted sm">${W.fmtDate(t, 'mdw')}</span></div>
      <div class="t3">
        <button class="t-cell tone-weight" id="tWeight">
          <span class="t-ic">${icon('scale')}</span><span class="t-l">體重</span>
          ${todayW ? `<b>${num(todayW.value, 1)}<small>kg</small></b><em>${todayW.source === 'InBody' ? 'InBody' : '已記錄'}</em>` : `<b class="t-add">${icon('plus')}記錄</b><em>${lastW ? '上次 ' + num(lastW.value, 1) : '&nbsp;'}</em>`}
        </button>
        <a class="t-cell tone-food" href="#/food">
          <span class="t-ic">${icon('food')}</span><span class="t-l">熱量</span>
          <b>${Math.round(ft.kcal).toLocaleString()}<small>kcal</small></b>
          <div class="t-bar"><i style="width:${Math.min(ft.kcal / tg.kcal, 1) * 100}%" class="${ft.kcal > tg.kcal ? 'over' : ''}"></i></div>
          <em>目標 ${tg.kcal.toLocaleString()}</em>
        </a>
        <a class="t-cell ${todayWo.some((w) => w.isCoach === 'V') ? 'tone-coach' : 'tone-train'}" href="${todayWo.length ? '#/training/w/' + todayWo[0].id : '#/training/new'}">
          <span class="t-ic">${icon(todayWo.some((w) => w.isCoach === 'V') ? 'whistle' : 'dumbbell')}</span><span class="t-l">訓練</span>
          ${todayWo.length ? `<b class="t-txt">${esc(todayWo[0].title)}</b><em>${(todayWo[0].exercises || []).length} 個動作</em>` : `<b class="t-add">${icon('plus')}記錄</b><em>&nbsp;</em>`}
        </a>
      </div></div>`;

    let weightCard = '';
    if (lastW) {
      const start = Math.max(...ws.map((p) => p.value));
      let goal = '';
      if (target) {
        const total = start - target, done = start - lastW.value;
        const pct = total > 0 ? Math.max(0, Math.min(done / total, 1)) * 100 : 100;
        goal = `<div class="goal"><div class="goal-row"><span>目標 <b>${num(target, 1)}</b> kg</span><span>${lastW.value > target ? `還差 <b>${num(lastW.value - target, 1)}</b> kg` : '已達成'}</span></div>
          <div class="goal-bar"><i style="width:${Math.max(pct, 2)}%"></i></div>
          <div class="goal-row sub"><span>最高 ${num(start, 1)}</span><span>已減 ${num(Math.max(done, 0), 1)} kg</span></div></div>`;
      }
      weightCard = `<a class="card wcard tone-weight" href="#/weight">
        <div class="card-h"><h3>體重</h3><span class="muted sm">${W.fmtDate(lastW.date, 'short')}・${W.relDay(lastW.date)}</span></div>
        <div class="w-main"><div><div class="big">${num(lastW.value, 1)}<small>kg</small></div>
          <div class="muted sm">7 日平均 <b>${num(lastMa, 1)}</b> kg</div></div>
          ${C.spark(ws.slice(-30).map((p) => p.value), 120, 44)}</div>
        ${goal}</a>`;
    }

    // 本週訓練 + 教練課
    const wk = W.T.weekStats(W.weekStart(t));
    const days = Array.from({ length: 7 }, (_, i) => W.addDays(W.weekStart(t), i));
    const pkg = W.T.coachPkg();
    const next = W.T.nextCoachDate();
    const weekCard = `<a class="card tone-train" href="#/training">
      <div class="card-h"><h3>本週訓練</h3><span class="muted sm">${wk.count} 次・${wk.minutes} 分</span></div>
      <div class="week-strip mini">${days.map((d) => {
        const l = W.S.data.workout.filter((w) => w.date === d);
        return `<span class="wd ${d === t ? 'today' : ''} ${l.length ? 'done' : ''} ${l.some((w) => w.isCoach === 'V') ? 'coach' : ''}"><span>${W.WD[W.parseDate(d).getDay()]}</span><i></i></span>`;
      }).join('')}</div>
      ${pkg.total || next || pkg.used ? `<div class="coach-line">${icon('whistle')}<span>教練課${pkg.total ? ` 剩 <b>${Math.max(pkg.total - pkg.used, 0)}</b> 堂` : ` 已上 <b>${pkg.used}</b> 堂`}</span>${next ? `<span class="muted">下次 ${W.fmtDate(next, 'sw')}</span>` : ''}</div>` : ''}
    </a>`;

    const ibCard = ib ? `<a class="card ibcard tone-inbody" href="#/inbody/r/${ib.id}">
      ${C.ring(ib.score, 100, 'InBody')}
      <div class="ib-txt"><div class="card-h"><h3>身體組成</h3><span class="muted sm">${W.fmtDate(ib.date, 'short')}・${W.relDay(ib.date)}</span></div>
        <div class="ib-vals"><span><i>骨骼肌</i>${num(ib.smm, 1)}<small>kg</small></span><span><i>體脂率</i>${num(ib.pbf, 1)}<small>%</small></span><span><i>內臟脂肪</i>${num(ib.vfl, 0)}<small>級</small></span></div></div>
    </a>` : `<div class="card hero empty"><span class="eyebrow">身體組成</span><h3>還沒有 InBody 紀錄</h3>
      <div class="btn-row"><a class="btn primary" href="#/inbody/scan">${icon('camera')}拍照匯入</a><a class="btn ghost" href="#/inbody/new">手動輸入</a></div></div>`;

    const tiles = [
      ['#/weight', 'scale', '體重', 0, 'weight'], ['#/inbody', 'body', 'InBody', 0, 'inbody'], ['#/training', 'dumbbell', '訓練', 0, 'train'],
      ['#/coach', 'whistle', '教練課', 0, 'coach'], ['#/food', 'food', '飲食', 0, 'food'], ['#/review', 'chart', '週回顧', 0, 'inbody'],
    ];

    return `<header class="page-head row">
        <div class="grow"><div class="eyebrow">${now.getMonth() + 1}月${now.getDate()}日 星期${W.WD[now.getDay()]}</div><h1>${hello}，${esc(acc)}</h1></div>
        <a class="avatar sm" href="#/me" aria-label="我的">${esc(acc.slice(0, 1).toUpperCase())}</a>
      </header>
      ${W.S.backendOld ? `<div class="notice err">${icon('warn')}<div><b>後端需要更新</b><br>請依 README 把新版 Code.gs 貼到 Apps Script 並部署新版本，體重、訓練、飲食才能儲存。</div></div>` : ''}
      <div class="tiles">${tiles.map(([h, ic, l, soon, tone]) => `<a class="tile ${soon ? 'soon' : 'tone-' + tone}" ${h ? `href="${h}"` : ''}><span class="tile-ic">${icon(ic)}</span><b>${l}</b><span>${soon ? '即將推出' : '&nbsp;'}</span></a>`).join('')}</div>
      ${seed}${today}${weightCard}${weekCard}${ibCard}
      ${ib ? insight(ib) : ''}
      <div class="foot-space"></div>`;
  }
  viewHome.mount = (v) => {
    const b = $('#seedBtn', v);
    if (b) b.onclick = () => {
      W.S.draft = { record: Object.assign({}, window.SEED_INBODY), photo: null, notes: '', source: 'seed' };
      location.hash = '#/inbody/review';
    };
    const tw = $('#tWeight', v);
    if (tw) tw.onclick = () => {
      const p = W.weightSeries().find((x) => x.date === W.today());
      if (p && p.source === 'InBody') location.hash = '#/inbody/r/' + p.inbodyId;
      else W.openWeightSheet(p ? p.date : undefined);
    };
  };

  function insight(r) {
    const items = [];
    if (has(r.fat_ctrl) && r.fat_ctrl < 0) items.push(['脂肪', `建議減少 <b>${num(-r.fat_ctrl, 1)} kg</b> 體脂肪`]);
    if (has(r.muscle_ctrl)) items.push(['肌肉', r.muscle_ctrl > 0 ? `建議增加 <b>${num(r.muscle_ctrl, 1)} kg</b> 肌肉` : '肌肉量已達標準，<b>維持</b>即可']);
    if (has(r.vfl)) items.push(['內臟脂肪', r.vfl >= 15 ? `級別 <b>${r.vfl}</b>，過高（≥15）` : r.vfl >= 10 ? `級別 <b>${r.vfl}</b>，偏高（標準 1–9）` : `級別 <b>${r.vfl}</b>，標準 1–9${r.vfl >= 8 ? '，接近上限' : ''}`]);
    if (has(r.kcal_rec)) items.push(['熱量', `InBody 建議每日 <b>${num(r.kcal_rec, 0)} kcal</b>・基礎代謝 ${num(r.bmr, 0)}`]);
    if (!items.length) return '';
    return `<div class="sec-head"><h2>InBody 重點</h2><span class="muted sm">${W.fmtDate(r.date, 'short')} 量測</span></div>
      <div class="card list-card tone-inbody">${items.map(([k, t]) => `<div class="li"><span class="li-k">${k}</span><span class="li-v">${t}</span></div>`).join('')}</div>`;
  }

  W.route(/^#\/home$/, viewHome, { tab: 'home' });
})();
