/* 飲食紀錄：每餐多品項，熱量＋三大營養素＋纖維；資料庫搜尋、常吃、AI 估算 */
(function () {
  const { $, $$, esc, has, num, icon, toast, sheet, confirmSheet, call, act, LS } = W;
  const C = window.Charts;
  const DB = window.FOOD_DB;
  const MEALS = ['早餐', '午餐', '晚餐', '點心', '宵夜'];
  const NUT = [['kcal', '熱量', 'kcal'], ['protein', '蛋白質', 'g'], ['carb', '碳水', 'g'], ['fat', '脂肪', 'g'], ['fiber', '纖維', 'g']];

  const foods = () => W.S.data.food;
  const r1 = (v) => Math.round((+v || 0) * 10) / 10;
  function dayEntries(d) { return foods().filter((f) => f.date === d); }
  function dayTotals(d) {
    const l = dayEntries(d);
    const t = { count: l.length };
    NUT.forEach(([k]) => (t[k] = W.sum(l, (f) => f[k])));
    return t;
  }
  function mealByTime(hm) {
    const m = +hm.slice(0, 2) * 60 + +hm.slice(3, 5);
    return m < 630 ? '早餐' : m < 870 ? '午餐' : m < 1020 ? '點心' : m < 1260 ? '晚餐' : '宵夜';
  }
  /** 把品項整理成一筆飲食紀錄（含合計） */
  function buildRecord(items, meta) {
    const rec = Object.assign({ id: '', note: '' }, meta, {
      items: items.map((i) => {
        const o = { name: (i.name || '').trim() || '未命名', amount: i.amount || '' };
        NUT.forEach(([k]) => (o[k] = r1(i[k])));
        if (i.src) o.src = i.src;
        return o;
      }),
    });
    NUT.forEach(([k]) => (rec[k] = r1(W.sum(rec.items, (i) => i[k]))));
    rec.title = rec.items.map((i) => i.name).join('、').slice(0, 60);
    return rec;
  }

  /* ---------------- 熱量收支 ----------------
   * 每日消耗 = BMR × 日常活動係數（不含運動）＋ 當天訓練的淨消耗
   * 缺口 = 攝取 − 消耗；7700 kcal ≈ 1 kg 體脂肪 */
  const NEAT = [[1.2, '久坐', '辦公室、多半坐著'], [1.3, '輕度活動', '常走動、通勤走路'], [1.45, '活動量大', '站立工作、勞動']];
  const neat = () => +((W.S.data.settings || {}).neat) || 1.2;
  function dayBalance(d) {
    const t = dayTotals(d);
    const b = W.T.bodyAt(d);
    if (!b.bmr) return null;
    const ex = W.sum(W.S.data.workout.filter((w) => w.date === d), (w) => (W.T.burn(w) || {}).net || 0);
    const base = b.bmr * neat();
    return { date: d, logged: t.count > 0, intake: t.kcal, base, ex, out: base + ex, bal: t.kcal - (base + ex) };
  }
  function maAt(d) {
    const ma = W.movingAvg(W.weightSeries()).filter((p) => p.date <= d);
    return ma.length ? ma[ma.length - 1] : null;
  }
  function weekBalance(ws) {
    // 今天還沒結束（飲食可能還沒記完），不列入
    const days = Array.from({ length: 7 }, (_, i) => W.addDays(ws, i)).filter((d) => d < W.today());
    const list = days.map(dayBalance).filter(Boolean);
    const logged = list.filter((b) => b.logged);
    const avg = (f) => (logged.length ? W.sum(logged, f) / logged.length : null);
    const avgBal = avg((b) => b.bal);
    const end = days[days.length - 1];
    const a = maAt(W.addDays(ws, -1)), z = maAt(end);
    const actual = a && z && a.date !== z.date && W.daysBetween(a.date, z.date) >= 4 ? z.value - a.value : null;
    return {
      ws, days, list, logged: logged.length, avgIn: avg((b) => b.intake), avgOut: avg((b) => b.out), avgBal,
      pred: avgBal != null ? (avgBal * days.length) / 7700 : null, actual,
    };
  }

  W.F = { dayTotals, MEALS, dayBalance, weekBalance, neat };

  /* =========================================================
   * 每日總覽
   * ========================================================= */
  function viewFood() {
    const q = W.query();
    const day = q.d || W.today();
    const tg = W.nutritionTargets();
    const tot = dayTotals(day);
    const entries = dayEntries(day);
    const exBurn = W.sum(W.S.data.workout.filter((w) => w.date === day), (w) => ((W.T && W.T.burn(w)) || {}).net || 0);
    const remain = tg.kcal - tot.kcal;
    const pct = Math.min(tot.kcal / tg.kcal, 1.2);
    const ring = (() => {
      const r = 52, c = 2 * Math.PI * r;
      return `<svg class="kring" viewBox="0 0 128 128"><circle cx="64" cy="64" r="${r}" class="ring-bg"/>
        <circle cx="64" cy="64" r="${r}" class="ring-fg ${tot.kcal > tg.kcal ? 'over' : ''}" stroke-dasharray="${c * Math.min(pct, 1)} ${c}" transform="rotate(-90 64 64)"/>
        <text x="64" y="58" text-anchor="middle" class="kr-l">${remain >= 0 ? '還可以吃' : '超過'}</text>
        <text x="64" y="80" text-anchor="middle" class="kr-v">${Math.abs(Math.round(remain)).toLocaleString()}</text>
        <text x="64" y="96" text-anchor="middle" class="kr-l">kcal</text></svg>`;
    })();
    const bar = (k, label, unit) => {
      const v = tot[k], t = tg[k];
      const p = t ? Math.min(v / t, 1) * 100 : 0;
      return `<div class="mbar ${k}"><div class="mbar-top"><span>${label}</span><span><b>${Math.round(v)}</b> / ${t} ${unit}</span></div><div class="mbar-t"><i style="width:${p}%"></i></div></div>`;
    };
    // 近 7 天
    const days7 = Array.from({ length: 7 }, (_, i) => W.addDays(day, i - 6));
    const totals7 = days7.map((d) => dayTotals(d));
    const logged = totals7.filter((t) => t.count);
    const avgK = logged.length ? W.sum(logged, (t) => t.kcal) / logged.length : 0;
    const avgP = logged.length ? W.sum(logged, (t) => t.protein) / logged.length : 0;

    const emptyMeals = MEALS.filter((m) => !entries.some((f) => f.meal === m));
    const mealHtml = MEALS.map((m) => {
      const l = entries.filter((f) => f.meal === m);
      const mk = W.sum(l, (f) => f.kcal);
      if (!l.length) return '';
      return `<div class="card meal tone-food"><div class="meal-h"><h3>${m}</h3><span><b>${Math.round(mk)}</b> kcal</span>
          <a class="icon-btn sm" href="#/food/new?d=${day}&meal=${encodeURIComponent(m)}" aria-label="新增${m}">${icon('plus')}</a></div>
        ${l.map((f) => `<a class="fentry" href="#/food/e/${f.id}">
          <div class="fe-main"><b>${esc(f.title || '未命名')}</b><span>${f.time ? f.time + '・' : ''}${(f.items || []).length} 項・P ${Math.round(f.protein || 0)}・C ${Math.round(f.carb || 0)}・F ${Math.round(f.fat || 0)}</span></div>
          <div class="fe-k"><b>${Math.round(f.kcal || 0)}</b><small>kcal</small></div></a>`).join('')}</div>`;
    }).join('') + (emptyMeals.length ? `<div class="meal-adds">${emptyMeals.map((m) => `<a href="#/food/new?d=${day}&meal=${encodeURIComponent(m)}">${icon('plus')}${m}</a>`).join('')}</div>` : '');

    return W.pageHead('飲食', '每日營養', { right: `<a class="icon-btn solid" href="#/food/new?d=${day}" aria-label="新增">${icon('plus')}</a>` }) + `
      <div class="datebar">
        <a href="#/food?d=${W.addDays(day, -1)}" class="db-arrow">${icon('back')}</a>
        <label class="db-mid"><b>${W.fmtDate(day, 'mdw')}</b><span>${W.relDay(day)}</span><input type="date" id="dayPick" value="${day}" max="${W.today()}"></label>
        <a href="#/food?d=${W.addDays(day, 1)}" class="db-arrow ${day >= W.today() ? 'disabled' : ''}">${icon('chevron')}</a>
      </div>
      <div class="card nut tone-food">
        <div class="nut-top">${ring}
          <div class="nut-side"><div><span>目標</span><b>${tg.kcal.toLocaleString()}</b></div><div><span>已攝取</span><b>${Math.round(tot.kcal).toLocaleString()}</b></div>
            ${exBurn ? `<div><span>運動消耗（淨）</span><b class="good">+${exBurn}</b></div>` : ''}</div>
        </div>
        ${bar('protein', '蛋白質', 'g')}${bar('carb', '碳水', 'g')}${bar('fat', '脂肪', 'g')}${bar('fiber', '膳食纖維', 'g')}
        <button class="link-btn" id="goalBtn">${icon('target')}調整目標${tg.custom ? '' : '（目前依 InBody 建議）'}</button>
      </div>
      ${mealHtml}
      ${balanceCard(day)}
      <div class="sec-head"><h2>近 7 天</h2><span class="muted sm">${logged.length} 天有紀錄</span></div>
      <div class="card chart-card tone-food">
        ${C.bars({ items: days7.map((d, i) => ({ label: W.fmtDate(d, 'short'), value: totals7[i].kcal, cls: (d === day ? 'today ' : '') + (totals7[i].kcal > tg.kcal ? 'over' : '') })), target: tg.kcal })}
        <div class="stat3 tight"><div><span>平均熱量</span><b>${Math.round(avgK).toLocaleString()}<small>kcal</small></b></div>
          <div><span>平均蛋白質</span><b>${Math.round(avgP)}<small>g</small></b></div>
          <div><span>蛋白質達標</span><b>${logged.filter((t) => t.protein >= tg.protein * 0.9).length}<small>/ ${logged.length} 天</small></b></div></div>
      </div>
      ${foodAnalysis(days7, totals7, tg)}
      <div class="foot-space"></div>`;
  }
  /* ---------------- 常用組合（在新增飲食頁面裡選，依餐別分類） ---------------- */
  const combos = () => ((W.S.data.settings || {}).combos || []);
  const comboKcal = (c) => Math.round(W.sum(c.items, (i) => i.kcal));
  const setCombos = (list) => W.saveSettings({ combos: list });
  /** 選常用：預設顯示目前餐別，可切換其他餐別或全部；可修改、刪除 */
  function pickCombo(onPick, meal, current) {
    let cat = meal || '全部';
    sheet(`<div class="sheet-body"><h3>常用組合</h3>
      <div class="chips" id="cbCats"></div>
      <div id="cbList" class="cb-list"></div>
      <p class="muted sm">在新增飲食畫面加好品項後，按「存成常用組合」就會出現在這裡。點組合加入這餐，點鉛筆可修改。</p></div>`, (w, close) => {
      const draw = () => {
        const all = combos();
        const count = (m) => (m === '全部' ? all.length : all.filter((c) => c.meal === m).length);
        $('#cbCats', w).innerHTML = MEALS.concat(['全部']).map((m) => `<button type="button" class="chip sm ${m === cat ? 'on' : ''}" data-cat="${m}">${m}${count(m) ? ` <small>${count(m)}</small>` : ''}</button>`).join('');
        const list = cat === '全部' ? all : all.filter((c) => c.meal === cat);
        $('#cbList', w).innerHTML = list.length ? list.map((c) => `<div class="cb-item"><button class="cb-main" data-id="${c.id}"><b>${esc(c.name)}</b>
            <span>${cat === '全部' ? esc(c.meal || '未分類') + '・' : ''}${comboKcal(c)} kcal・${c.items.map((i) => esc(i.name)).join('、')}</span></button>
            <button class="x" data-edit="${c.id}" aria-label="修改">${icon('edit')}</button>
            <button class="x" data-del="${c.id}" aria-label="刪除">${icon('trash')}</button></div>`).join('')
          : `<p class="muted sm pad">${cat === '全部' ? '還沒有常用組合' : `${cat}還沒有常用組合，可以切到其他餐別看看`}</p>`;
        $$('[data-cat]', w).forEach((b) => (b.onclick = () => { cat = b.dataset.cat; draw(); }));
        $$('.cb-main', w).forEach((b) => (b.onclick = () => { onPick(combos().find((c) => c.id === b.dataset.id)); close(); }));
        $$('[data-edit]', w).forEach((b) => (b.onclick = () => editCombo(combos().find((c) => c.id === b.dataset.edit), current, draw)));
        $$('[data-del]', w).forEach((b) => (b.onclick = async () => {
          const c = combos().find((x) => x.id === b.dataset.del);
          if (!c || !(await confirmSheet(`刪除「${c.name}」？`, '只會刪掉這個常用組合，已記錄的飲食不受影響。', '刪除', true))) return;
          if (await setCombos(combos().filter((x) => x.id !== c.id))) { toast('已刪除'); draw(); }
        }));
      };
      draw();
    }, { tall: true });
  }
  /** 修改常用：名稱、餐別、移除品項，或換成目前畫面上的品項 */
  function editCombo(c, current, onDone) {
    if (!c) return;
    const E = { meal: c.meal || '', items: JSON.parse(JSON.stringify(c.items || [])) };
    const cur = (current ? current() : []).filter((i) => (i.name || '').trim());
    sheet(`<div class="sheet-body"><h3>修改常用組合</h3>
      <label class="field"><span>名稱</span><input name="cn" value="${esc(c.name)}"></label>
      <div class="chips wrap" id="ceMeal">${MEALS.map((m) => `<button type="button" class="chip sm ${m === E.meal ? 'on' : ''}" data-m="${m}">${m}</button>`).join('')}</div>
      <div id="ceItems" class="cb-list"></div>
      ${cur.length ? `<button type="button" class="link-btn" data-a="replace">${icon('refresh')}換成目前畫面上的 ${cur.length} 個品項</button>` : ''}
      <div class="btn-row"><button class="btn primary" data-a="save">儲存修改</button></div></div>`, (w, close) => {
      const drawItems = () => {
        $('#ceItems', w).innerHTML = (E.items.length ? E.items.map((i, n) => `<div class="cb-item"><div class="cb-main"><b>${esc(i.name || '未命名')}</b>
            <span>${i.amount ? esc(i.amount) + '・' : ''}${Math.round(+i.kcal || 0)} kcal・P ${r1(+i.protein || 0)}</span></div>
            <button class="x" data-rm="${n}" aria-label="移除">${icon('close')}</button></div>`).join('') : '<p class="muted sm pad">沒有品項</p>')
          + `<p class="muted sm">共 ${Math.round(W.sum(E.items, (i) => +i.kcal || 0))} kcal</p>`;
        $$('[data-rm]', w).forEach((b) => (b.onclick = () => { E.items.splice(+b.dataset.rm, 1); drawItems(); }));
      };
      drawItems();
      $$('#ceMeal .chip', w).forEach((b) => (b.onclick = () => { E.meal = b.dataset.m; $$('#ceMeal .chip', w).forEach((x) => x.classList.toggle('on', x === b)); }));
      const rep = $('[data-a=replace]', w);
      if (rep) rep.onclick = () => { E.items = buildRecord(cur, {}).items.map((i) => { const o = Object.assign({}, i); delete o.src; return o; }); drawItems(); toast('已換成目前的品項，按儲存生效'); };
      $('[data-a=save]', w).onclick = async () => {
        if (!E.items.length) { toast('至少要有一個品項', 'err'); return; }
        const upd = Object.assign({}, c, { name: $('[name=cn]', w).value.trim() || c.name, meal: E.meal, items: E.items });
        if (await setCombos(combos().map((x) => (x.id === c.id ? upd : x)))) { toast('已更新', 'ok'); close(); onDone && onDone(); }
      };
    });
  }
  function saveCombo(items, meal) {
    sheet(`<div class="sheet-body"><h3>存成常用組合</h3>
      <label class="field"><span>名稱</span><input name="cn" value="${esc(meal)}固定"></label>
      <div class="chips wrap" id="cbMeal">${MEALS.map((m) => `<button type="button" class="chip sm ${m === meal ? 'on' : ''}" data-m="${m}">${m}</button>`).join('')}</div>
      <p class="muted sm">${items.map((i) => esc(i.name)).join('、')}・共 ${Math.round(W.sum(items, (i) => i.kcal))} kcal</p>
      <div class="btn-row"><button class="btn primary" data-a="save">儲存組合</button></div></div>`, (w, close) => {
      let m = meal;
      $$('#cbMeal .chip', w).forEach((b) => (b.onclick = () => { m = b.dataset.m; $$('#cbMeal .chip', w).forEach((x) => x.classList.toggle('on', x === b)); }));
      $('[data-a=save]', w).onclick = async () => {
        const name = $('[name=cn]', w).value.trim() || m + '固定';
        const clean = buildRecord(items, {}).items.map((i) => { const o = Object.assign({}, i); delete o.src; return o; });
        if (await setCombos(combos().concat([{ id: W.uid(), name, meal: m, items: clean }]))) { toast(`已存到「${m}」常用`, 'ok'); close(); }
      };
    });
  }

  /* ---------------- 熱量收支卡 ---------------- */
  function balanceCard(day) {
    if (!W.T || !W.T.bodyAt(day).bmr) return '';
    const wb = weekBalance(W.weekStart(day));
    if (!wb.logged) return '';
    const items = wb.list.filter((b) => b.logged).map((b) => ({ label: W.fmtDate(b.date, 'short'), value: b.bal, text: `${b.bal > 0 ? '+' : ''}${Math.round(b.bal)}` }));
    return `<a class="card tone-food bal" href="#/balance">
      <div class="card-h"><h3>熱量收支</h3><span class="muted sm">本週・${wb.logged} 天有紀錄 ›</span></div>
      <div class="ana">
        <div><span>平均攝取</span><b>${Math.round(wb.avgIn).toLocaleString()}</b><em>kcal / 天</em></div>
        <div><span>平均消耗</span><b>${Math.round(wb.avgOut).toLocaleString()}</b><em>含訓練</em></div>
        <div><span>每日缺口</span><b class="${wb.avgBal < 0 ? 'good' : 'bad'}">${wb.avgBal > 0 ? '+' : ''}${Math.round(wb.avgBal)}</b><em>${wb.avgBal < 0 ? '熱量赤字' : '熱量盈餘'}</em></div>
      </div>
      ${C.dbars(items)}
      <div class="bal-cmp"><span>依缺口預估 <b>${wb.pred == null ? '–' : W.signed(wb.pred, 2)} kg</b></span><span>實際（7 日平均）<b>${wb.actual == null ? '–' : W.signed(wb.actual, 2)} kg</b></span></div>
    </a>`;
  }

  /* ---------------- 熱量收支頁 ---------------- */
  function viewBalance() {
    const t = W.today();
    const ws0 = W.weekStart(t);
    const weeks = [];
    for (let i = 7; i >= 0; i--) weeks.push(weekBalance(W.addDays(ws0, -7 * i)));
    const shown = weeks.filter((w) => w.logged);
    const b = W.T.bodyAt(t);
    // 預估 vs 實際：累積體重變化
    let cumP = 0, cumA = 0;
    const start = shown.length ? [{ date: W.addDays(shown[0].ws, -1), value: 0 }] : [];
    const pP = start.slice(), pA = start.slice();
    shown.forEach((w) => {
      cumP += w.pred || 0; cumA += w.actual || 0;
      const d = w.days[w.days.length - 1];
      pP.push({ date: d, value: cumP }); if (w.actual != null) pA.push({ date: d, value: cumA });
    });
    const totalPred = W.sum(shown, (w) => w.pred || 0), totalAct = W.sum(shown, (w) => w.actual || 0);
    return W.pageHead('熱量收支', '攝取 vs 消耗', { back: '#/food' }) + `
      <div class="card tone-food">
        <div class="card-h"><h3>日常活動量</h3><span class="muted sm">不含運動</span></div>
        <div class="neat">${NEAT.map(([f, l, d]) => `<button class="${neat() === f ? 'on' : ''}" data-f="${f}"><b>${l}</b><span>${d}</span><em>BMR × ${f}</em></button>`).join('')}</div>
        <p class="hint">每日消耗 = 基礎代謝 ${b.bmr ? Math.round(b.bmr) : '–'} kcal × 活動係數 ＋ 當天訓練淨消耗。7,700 kcal ≈ 1 kg 體脂肪。只計算有記錄飲食的日子。</p>
      </div>
      ${shown.length >= 2 ? `<div class="card chart-card tone-food"><div class="chart-head"><div><span class="muted">累積體重變化：預估 vs 實際</span></div></div>
        ${C.timeChart({ series: [{ points: pP, line: true, dots: true, cls: 'pred' }, { points: pA, line: true, dots: true, cls: 'act' }], height: 150 })}
        <div class="legend center"><span><i style="background:var(--t-food)"></i>依熱量缺口預估</span><span><i style="background:var(--t-weight)"></i>實際（7 日平均）</span></div>
        <p class="hint">${Math.abs(totalPred - totalAct) > 1 ? '預估和實際差距較大：可能有漏記的飲食、份量估得偏少，或活動係數需要調整。' : '預估和實際接近，代表記錄和設定都滿準的。'}</p></div>` : ''}
      <div class="card tone-food">
        <div class="card-h"><h3>每週明細</h3></div>
        ${shown.length ? `<table class="btbl"><thead><tr><th>週</th><th>天</th><th>攝取</th><th>消耗</th><th>缺口/日</th><th>預估</th><th>實際</th></tr></thead><tbody>
          ${shown.slice().reverse().map((w) => `<tr><td>${W.fmtDate(w.ws, 'short')}</td><td>${w.logged}</td><td>${Math.round(w.avgIn)}</td><td>${Math.round(w.avgOut)}</td>
            <td class="${w.avgBal < 0 ? 'good' : 'bad'}">${Math.round(w.avgBal)}</td><td>${w.pred == null ? '–' : W.signed(w.pred, 1)}</td><td>${w.actual == null ? '–' : W.signed(w.actual, 1)}</td></tr>`).join('')}
        </tbody></table><p class="hint">單位：kcal/天、kg/週。</p>` : '<p class="muted sm">記錄幾天飲食後就會出現。</p>'}
      </div><div class="foot-space"></div>`;
  }
  viewBalance.mount = (v) => {
    $$('.neat button', v).forEach((b) => (b.onclick = async () => {
      if (await W.saveSettings({ neat: +b.dataset.f })) { W.render.keepScroll = true; W.render(); }
    }));
  };

  /** 營養分析：三大營養素比例、蛋白質每日、各餐分佈 */
  function foodAnalysis(days7, totals7, tg) {
    const logged = totals7.filter((t) => t.count);
    if (!logged.length) return '';
    const P = W.sum(logged, (t) => t.protein) * 4, Cb = W.sum(logged, (t) => t.carb) * 4, F = W.sum(logged, (t) => t.fat) * 9;
    const all = P + Cb + F || 1;
    const pct = (v) => Math.round((v / all) * 100);
    const tAll = tg.protein * 4 + tg.carb * 4 + tg.fat * 9;
    const tp = (v) => Math.round((v / tAll) * 100);
    const entries = foods().filter((f) => days7.includes(f.date));
    const byMeal = MEALS.map((m) => ({ m, k: W.sum(entries.filter((f) => f.meal === m), (f) => f.kcal) / logged.length })).filter((x) => x.k > 0);
    const maxMeal = Math.max(...byMeal.map((x) => x.k), 1);
    return `<div class="card tone-food">
      <div class="card-h"><h3>營養分析</h3><span class="muted sm">近 7 天平均</span></div>
      <div class="sub-h">熱量來源比例</div>
      <div class="ratio"><i class="p" style="flex:${P}">${pct(P)}%</i><i class="c" style="flex:${Cb}">${pct(Cb)}%</i><i class="f" style="flex:${F}">${pct(F)}%</i></div>
      <div class="ratio-l"><span>蛋白質・目標 ${tp(tg.protein * 4)}%</span><span>碳水・目標 ${tp(tg.carb * 4)}%</span><span>脂肪・目標 ${tp(tg.fat * 9)}%</span></div>
      <div class="sub-h">每日蛋白質（g）</div>
      ${C.bars({ items: days7.map((d, i) => ({ label: W.fmtDate(d, 'short'), value: totals7[i].protein, cls: (i === 6 ? 'today ' : '') })), target: tg.protein, height: 105 })}
      ${byMeal.length ? `<div class="sub-h">各餐平均熱量</div>${C.hbars(byMeal.map((x) => ({ label: x.m, value: x.k, text: `${Math.round(x.k)}<small>kcal</small>` })), maxMeal)}` : ''}
    </div>`;
  }

  viewFood.mount = (v) => {
    $('#dayPick', v).onchange = (e) => { if (e.target.value) location.hash = '#/food?d=' + e.target.value; };
    $('#goalBtn', v).onclick = editGoals;
  };

  function editGoals() {
    const tg = W.nutritionTargets();
    const ib = W.latestInbody();
    const ws = W.weightSeries();
    const bw = ws.length ? ws[ws.length - 1].value : ib && ib.weight;
    const st = W.S.data.settings || {};
    sheet(`<div class="sheet-body"><h3>營養目標</h3>
      <div class="goal-grid">
        ${[['kcal', '熱量', 'kcal'], ['protein', '蛋白質', 'g'], ['carb', '碳水', 'g'], ['fat', '脂肪', 'g'], ['fiber', '膳食纖維', 'g']].map(([k, l, u]) => `
          <label class="field"><span>${l}（${u}）</span><input name="${k}" inputmode="numeric" value="${has(st[k]) ? st[k] : ''}" placeholder="${tg[k]}"></label>`).join('')}
      </div>
      <div class="ref-box">
        ${ib && has(ib.kcal_rec) ? `<div><span>InBody 建議熱量</span><b>${ib.kcal_rec} kcal</b></div>` : ''}
        ${ib && has(ib.bmr) ? `<div><span>基礎代謝率 BMR</span><b>${ib.bmr} kcal</b></div>` : ''}
        ${ib && has(ib.ffm) ? `<div><span>蛋白質（除脂體重 × 2）</span><b>${Math.round(ib.ffm * 2)} g</b></div>` : ''}
        ${bw ? `<div><span>蛋白質（體重 × 1.6–2.2）</span><b>${Math.round(bw * 1.6)}–${Math.round(bw * 2.2)} g</b></div>` : ''}
      </div>
      <p class="muted sm">留空 = 自動：熱量用 InBody 建議值，蛋白質用除脂體重 × 2，脂肪約佔熱量 25%，其餘給碳水。目標可跟教練討論後調整。</p>
      <div class="btn-row"><button class="btn primary" data-a="save">儲存</button></div></div>`, (w, close) => {
      $('[data-a=save]', w).onclick = async () => {
        const patch = {};
        ['kcal', 'protein', 'carb', 'fat', 'fiber'].forEach((k) => { const v = $(`[name=${k}]`, w).value.trim(); patch[k] = v === '' ? '' : +v; });
        if (!(await W.saveSettings(patch))) return;
        close(); W.render.keepScroll = true; W.render();
      };
    });
  }

  /* =========================================================
   * 新增 / 編輯
   * ========================================================= */
  let D = null;
  function viewEditor(id) {
    const q = W.query();
    if (id) {
      const f = foods().find((x) => x.id === id);
      if (!f) return W.pageHead('找不到紀錄', '', { back: '#/food' });
      D = JSON.parse(JSON.stringify(f));
      D.items = D.items || [];
    } else {
      const t = W.nowHM();
      const day = q.d || W.today();
      D = { id: '', date: day, time: day === W.today() ? t : '', meal: q.meal || mealByTime(t), items: [], note: '' };
    }
    D.aiNotes = '';
    // 匯入連結：#/food/new?import=<base64url JSON>，預先填好品項，按儲存才會寫入
    if (!id && q.import) {
      try {
        const b64 = q.import.replace(/-/g, '+').replace(/_/g, '/');
        const bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
        const im = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
        ['date', 'time', 'meal', 'note'].forEach((k) => { if (im[k]) D[k] = String(im[k]); });
        if (D.date > W.today()) D.date = W.today();
        D.items = (im.items || []).map((it) => {
          const o = { name: String(it.name || ''), amount: String(it.amount || ''), src: it.src || 'AI' };
          NUT.forEach(([k]) => (o[k] = +it[k] || 0));
          return o;
        });
        D.aiNotes = String(im.notes || '');
      } catch (e) { toast('匯入連結格式不正確', 'err'); }
    }
    return W.pageHead(id ? '編輯飲食' : '新增飲食', W.fmtDate(D.date, 'mdw'), { back: '#/food?d=' + D.date }) + `
      <div class="card form-card">
        <div class="chips wrap" id="mealChips">${MEALS.map((m) => `<button type="button" class="chip ${D.meal === m ? 'on' : ''}" data-meal="${m}">${m}</button>`).join('')}</div>
        <div class="frow"><label>日期</label><input type="date" class="inp" data-k="date" value="${D.date}" max="${W.today()}"></div>
        <div class="frow"><label>時間</label><input type="time" class="inp" data-k="time" value="${esc(D.time || '')}"></div>
      </div>
      <div class="add3">
        <button type="button" id="addSearch">${icon('search')}<b>搜尋食物</b><span>資料庫・常吃</span></button>
        <button type="button" id="addAI">${icon('camera')}<b>拍照估算</b><span>便當・營養標示</span></button>
        <button type="button" id="addCombo">${icon('copy')}<b>常用</b><span>依餐別選</span></button>
        <button type="button" id="addManual">${icon('edit')}<b>手動輸入</b><span>看包裝填</span></button>
      </div>
      <div id="aiNote"></div>
      <div id="items"></div>
      <button type="button" class="link-btn save-combo" id="saveCombo">${icon('copy')}把這些品項存成常用組合</button>
      <div class="card form-card"><div class="frow col"><label>備註</label><textarea class="inp" rows="2" data-k="note" placeholder="例如：外食、聚餐、訓練後">${esc(D.note || '')}</textarea></div></div>
      ${id ? `<button class="btn ghost block danger-text" id="fDel">${icon('trash')}刪除這筆</button>` : ''}
      <div class="sticky-cta"><div class="tot-bar" id="totBar"></div><button class="btn primary block" id="fSave">${icon('check')}儲存</button></div>`;
  }
  viewEditor.mount = (v, id) => {
    if (!D) return;
    const box = $('#items', v);
    const drawTot = () => {
      const t = {};
      NUT.forEach(([k]) => (t[k] = W.sum(D.items, (i) => i[k])));
      $('#totBar', v).innerHTML = `<span><b>${Math.round(t.kcal)}</b> kcal</span><span>P <b>${r1(t.protein)}</b></span><span>C <b>${r1(t.carb)}</b></span><span>F <b>${r1(t.fat)}</b></span>`;
    };
    const draw = () => {
      box.innerHTML = D.items.length ? D.items.map((it, i) => `<div class="card fitem" data-i="${i}">
          <div class="fi-h"><input class="inp fi-name" data-f="name" value="${esc(it.name)}" placeholder="品項名稱">
            ${it.src ? `<span class="pill ${it.src === 'AI' ? 'ok' : ''}">${it.src}</span>` : ''}
            <button type="button" class="x" data-del="${i}">${icon('close')}</button></div>
          <input class="inp sm fi-amt" data-f="amount" value="${esc(it.amount || '')}" placeholder="份量，例如 1 碗、200g">
          <div class="fi-nut">${NUT.map(([k, l, u]) => `<label><span>${l}</span><input class="inp num" inputmode="decimal" data-f="${k}" value="${has(it[k]) ? it[k] : ''}" placeholder="0"><em>${u}</em></label>`).join('')}</div>
        </div>`).join('')
        : `<div class="card empty-mini">用上面三種方式加入這餐吃的東西</div>`;
      drawTot();
    };
    draw();
    const showAiNote = () => { $('#aiNote', v).innerHTML = D.aiNotes ? `<div class="notice">${icon('sparkle')}<div><b>AI 估算說明</b><br>${esc(D.aiNotes)}<br><span class="muted sm">數值為估計，可直接修改。</span></div></div>` : ''; };
    showAiNote();
    v.addEventListener('input', (e) => {
      const t = e.target;
      if (t.dataset.k) D[t.dataset.k] = t.value;
      if (t.dataset.f) {
        const it = D.items[+t.closest('[data-i]').dataset.i];
        it[t.dataset.f] = ['name', 'amount'].includes(t.dataset.f) ? t.value : t.value === '' ? '' : +t.value;
        drawTot();
      }
    });
    v.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.meal) { D.meal = b.dataset.meal; $$('#mealChips .chip', v).forEach((x) => x.classList.toggle('on', x === b)); }
      if (b.dataset.del != null) { D.items.splice(+b.dataset.del, 1); draw(); }
    });
    $('#addManual', v).onclick = () => { D.items.push({ name: '', amount: '', kcal: '', protein: '', carb: '', fat: '', fiber: '', src: '' }); draw(); const ins = $$('.fi-name', v); ins[ins.length - 1].focus(); };
    const onAi = (res) => {
      res.items.forEach((it) => D.items.push(Object.assign({}, it, { src: 'AI' })));
      D.aiNotes = res.notes || '';
      showAiNote(); draw();
    };
    $('#addSearch', v).onclick = () => searchFood((it) => { D.items.push(it); draw(); }, onAi);
    $('#addCombo', v).onclick = () => pickCombo((c) => { c.items.forEach((i) => D.items.push(Object.assign({}, i))); draw(); toast(`已加入「${c.name}」`); }, D.meal, () => D.items);
    $('#saveCombo', v).onclick = () => {
      const items = D.items.filter((i) => (i.name || '').trim());
      if (!items.length) { toast('先加入品項', 'err'); return; }
      saveCombo(items, D.meal);
    };
    $('#addAI', v).onclick = () => aiEstimate(onAi);
    const del = $('#fDel', v);
    if (del) del.onclick = async () => {
      if (!(await confirmSheet('刪除這筆飲食紀錄？', '刪除後無法復原。', '刪除', true))) return;
      if (!(await act('刪除中…', () => W.del('food', id)))) return;
      W.drop('food', id);
      toast('已刪除');
      location.replace('#/food?d=' + D.date);
    };
    $('#fSave', v).onclick = async () => {
      const items = D.items.filter((i) => (i.name || '').trim() || i.kcal);
      if (!items.length) { toast('至少加入一個品項', 'err'); return; }
      const rec = buildRecord(items, { id: D.id || '', date: D.date, time: D.time || '', meal: D.meal, note: (D.note || '').trim() });
      const saved = await act('儲存中…', () => W.save('food', rec));
      if (!saved) return;
      W.put('food', saved);
      toast(`已記錄 ${Math.round(saved.kcal || 0)} kcal`, 'ok');
      location.replace('#/food?d=' + saved.date);
    };
  };

  /** 搜尋比對：空白分隔的每個詞都要出現在名稱、別名或分類 */
  function match(f, ql) {
    if (!ql) return true;
    const hay = (f.name + ' ' + (f.kw || '') + ' ' + (f.cat || '')).toLowerCase();
    return ql.split(/\s+/).every((t) => hay.includes(t));
  }

  /** 搜尋：常吃 + 資料庫 */
  function searchFood(onPick, onAi) {
    const hist = {};
    foods().forEach((f) => (f.items || []).forEach((i) => {
      const k = i.name;
      hist[k] = { item: Object.assign({}, i), n: ((hist[k] && hist[k].n) || 0) + 1 };
    }));
    const frequent = Object.values(hist).sort((a, b) => b.n - a.n).map((h) => Object.assign(h.item, { cat: '常吃', times: h.n }));
    const cats = ['常吃', ...new Set(DB.map((f) => f.cat))];
    let cat = frequent.length ? '常吃' : '', q = '';
    sheet(`<div class="sheet-body picker">
        <h3>搜尋食物</h3>
        <div class="search">${icon('search')}<input id="fq" placeholder="例如：雞胸、便當、豆漿" autocomplete="off"></div>
        <div class="chips" id="fcat"><button class="chip sm ${!cat ? 'on' : ''}" data-c="">全部</button>${cats.map((c) => `<button class="chip sm ${c === cat ? 'on' : ''}" data-c="${c}">${c}</button>`).join('')}</div>
        <div class="pick-list" id="flist"></div>
        <p class="muted sm">資料庫數值為台灣常見份量的估計值。</p>
      </div>`, (w, close) => {
      const list = $('#flist', w);
      const draw = () => {
        const ql = q.trim().toLowerCase();
        const all = frequent.concat(DB.filter((f) => !hist[f.name]));
        const pool = ql ? all : cat === '常吃' ? frequent : cat ? DB.filter((f) => f.cat === cat) : all;
        const items = pool.filter((f) => match(f, ql)).slice(0, 150);
        list.innerHTML = items.length ? items.map((f, i) => `<div class="fpick" data-i="${i}">
            <button class="fp-main"><b>${esc(f.name)}</b><span>${esc(f.amount || '')}・${Math.round(f.kcal)} kcal・P ${r1(f.protein)} C ${r1(f.carb)} F ${r1(f.fat)}${f.times ? `・吃過 ${f.times} 次` : ''}</span></button>
            <div class="fp-qty">${[0.5, 1, 1.5, 2].map((m) => `<button data-m="${m}" class="${m === 1 ? 'on' : ''}">${m === 0.5 ? '½' : m === 1.5 ? '1½' : m}</button>`).join('')}<button class="fp-add">加入</button></div>
          </div>`).join('') : `<div class="pad"><p class="muted sm">資料庫沒有「${esc(q)}」。</p><button class="btn sm" id="fAi">${icon('sparkle')}用 AI 估算「${esc(q)}」</button></div>`;
        const aiB = $('#fAi', list);
        if (aiB) aiB.onclick = () => { close(); aiEstimate((res) => onAi && onAi(res), q.trim()); };
        $$('.fpick', list).forEach((row) => {
          const f = items[+row.dataset.i];
          let mult = 1;
          $('.fp-main', row).onclick = () => { $$('.fpick.open', list).forEach((x) => x !== row && x.classList.remove('open')); row.classList.toggle('open'); };
          $$('[data-m]', row).forEach((b) => (b.onclick = () => { mult = +b.dataset.m; $$('[data-m]', row).forEach((x) => x.classList.toggle('on', x === b)); }));
          $('.fp-add', row).onclick = () => {
            const it = { name: f.name, amount: mult === 1 ? f.amount : `${f.amount} ×${mult}`, src: f.cat === '常吃' ? '' : '資料庫' };
            NUT.forEach(([k]) => (it[k] = r1((f[k] || 0) * mult)));
            onPick(it);
            close();
          };
        });
      };
      $('#fq', w).oninput = (e) => { q = e.target.value; draw(); };
      $$('#fcat .chip', w).forEach((b) => (b.onclick = () => { cat = b.dataset.c; $$('#fcat .chip', w).forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
      draw();
    }, { tall: true });
  }

  /** AI 估算（照片 / 文字）：最多 4 張，可拍便當或營養標示 */
  function aiEstimate(onDone, preset) {
    const photos = [];
    sheet(`<div class="sheet-body">
        <h3>${icon('sparkle')} AI 估算</h3>
        <div class="ai-shots" id="aiShots"></div>
        <div class="ai-src">
          <label class="btn"><input type="file" accept="image/*" capture="environment" hidden id="aiCam">${icon('camera')}拍照</label>
          <label class="btn"><input type="file" accept="image/*" multiple hidden id="aiLib">${icon('image')}相簿</label>
        </div>
        <label class="field"><span>補充說明（選填，越具體越準）</span>
          <textarea id="aiText" rows="2" class="inp" placeholder="例如：飯只吃一半、雞腿去皮、飲料半糖。沒照片也可以直接打字描述"></textarea></label>
        <p class="muted sm">可以拍整個便當、自助餐盤，或包裝背面的營養標示（會直接讀標示數字）。最多 4 張。</p>
        <div class="btn-row"><button class="btn primary" id="aiGo">${icon('sparkle')}開始估算</button></div>
      </div>`, (w, close) => {
      if (preset) $('#aiText', w).value = preset;
      const drawShots = () => {
        $('#aiShots', w).innerHTML = photos.map((p, i) => `<div class="ai-shot"><img src="${p.preview}" alt=""><button type="button" data-rm="${i}" aria-label="移除">×</button></div>`).join('');
        $$('[data-rm]', w).forEach((b) => (b.onclick = () => { photos.splice(+b.dataset.rm, 1); drawShots(); }));
        $('.ai-src', w).hidden = photos.length >= 4;
      };
      const add = async (e) => {
        const files = [...e.target.files].slice(0, 4 - photos.length);
        e.target.value = '';
        for (const f of files) {
          try { photos.push(await W.compressImage(f, 1024, 0.8)); } catch (err) { toast('這張照片讀不到', 'err'); }
        }
        drawShots();
      };
      $('#aiCam', w).onchange = add;
      $('#aiLib', w).onchange = add;
      $('#aiGo', w).onclick = async () => {
        const text = $('#aiText', w).value.trim();
        if (!text && !photos.length) { toast('請拍照或輸入描述', 'err'); return; }
        const images = photos.map((p) => ({ data: p.data, mimeType: p.mimeType }));
        const res = await act('AI 估算中…', () => call('food.estimate', { text, images, image: images[0] || null }));
        if (!res) return;
        if (!res.items || !res.items.length) { toast('AI 沒有辨識出食物，請補充描述', 'err'); return; }
        close();
        onDone(res);
      };
      drawShots();
    });
  }

  const viewNew = () => viewEditor('');
  viewNew.mount = (v) => viewEditor.mount(v, '');
  W.route(/^#\/food$/, viewFood, { tab: 'food' });
  W.route(/^#\/balance$/, viewBalance, { tab: 'food' });
  W.route(/^#\/food\/new$/, viewNew, { tab: false });
  W.route(/^#\/food\/e\/([\w-]+)$/, viewEditor, { tab: false });
})();
