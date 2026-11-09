/* 訓練日誌 + 教練課（教練課 = 勾選「教練課」的訓練紀錄，多了教練筆記欄位） */
(function () {
  const { $, $$, esc, has, num, signed, icon, toast, sheet, confirmSheet, call, act, LS } = W;
  const C = window.Charts;
  const CATS = window.EXERCISE_CATS;
  const LIB = window.EXERCISE_LIB;
  const CUE_CATS = ['動作要點', '姿勢修正', '訓練觀念', '飲食建議', '生活作息', '其他'];
  const KIND_LABEL = { w: '重量', b: '自體', t: '計時', c: '有氧' };
  const RPE_TXT = ['', '非常輕鬆', '輕鬆', '輕鬆', '適中', '適中', '有點吃力', '吃力', '很吃力', '接近極限', '極限'];

  /* ---------------- 計算 ---------------- */
  const workouts = () => W.S.data.workout;
  const n = (v) => (has(v) && !isNaN(+v) ? +v : 0);
  function exInfo(name) {
    const lib = LIB.find((e) => e.n === name);
    if (lib) return lib;
    for (let i = workouts().length - 1; i >= 0; i--) {
      const e = (workouts()[i].exercises || []).find((x) => x.name === name);
      if (e) return { n: name, c: e.cat || '其他', k: e.kind || 'w' };
    }
    return { n: name, c: '其他', k: 'w' };
  }
  const e1rm = (s) => (n(s.w) > 0 && n(s.r) > 0 ? (n(s.r) === 1 ? n(s.w) : n(s.w) * (1 + n(s.r) / 30)) : 0);
  const setVol = (s) => n(s.w) * n(s.r);
  const exVol = (e) => W.sum(e.sets || [], setVol);
  const woVol = (w) => W.sum(w.exercises || [], exVol);
  const woSets = (w) => W.sum(w.exercises || [], (e) => (e.sets || []).length);
  function setStr(s, k) {
    if (k === 't') return `${n(s.t)} 秒`;
    if (k === 'c') return [n(s.m) ? `${n(s.m)} 分` : '', n(s.d) ? `${n(s.d)} km` : ''].filter(Boolean).join('・') || '–';
    if (k === 'b') return n(s.w) ? `+${num(s.w)}kg × ${n(s.r)}` : `${n(s.r)} 下`;
    return `${num(s.w)}kg × ${n(s.r)}`;
  }
  /** 一次訓練中某動作的代表成績（用於比較/圖表） */
  function exScore(e, k) {
    const sets = e.sets || [];
    if (k === 'w') return Math.max(0, ...sets.map(e1rm));
    if (k === 'b') return Math.max(0, ...sets.map((s) => n(s.r)));
    if (k === 't') return Math.max(0, ...sets.map((s) => n(s.t)));
    return Math.max(0, ...sets.map((s) => n(s.d) || n(s.m)));
  }
  const SCORE_LABEL = { w: '估計 1RM', b: '最多次數', t: '最長秒數', c: '距離/時間' };
  function exHistory(name) {
    const out = [];
    workouts().forEach((w) => (w.exercises || []).forEach((e) => { if (e.name === name) out.push({ w, e }); }));
    return out.sort((a, b) => a.w.date.localeCompare(b.w.date));
  }
  function lastPerf(name, excludeId) {
    const h = exHistory(name).filter((x) => x.w.id !== excludeId);
    return h.length ? h[h.length - 1] : null;
  }
  function isPR(w, e) {
    const k = exInfo(e.name).k;
    const mine = exScore(e, k);
    if (!mine) return false;
    const before = (a) => a.date < w.date || (a.date === w.date && String(a.createdAt || '') < String(w.createdAt || ''));
    const prev = exHistory(e.name).filter((x) => x.w.id !== w.id && before(x.w));
    return prev.length > 0 && mine > Math.max(...prev.map((x) => exScore(x.e, k)));
  }
  function weekStats(start) {
    const end = W.addDays(start, 7);
    const list = workouts().filter((w) => w.date >= start && w.date < end);
    return { count: list.length, minutes: W.sum(list, (w) => w.duration), volume: W.sum(list, woVol), list };
  }
  const coachSessions = () => workouts().filter((w) => w.isCoach === 'V');
  function coachPkg() {
    const c = (W.S.data.settings || {}).coach || {};
    const all = coachSessions();
    const used = c.start ? all.filter((w) => w.date >= c.start) : all;
    return { total: n(c.total), start: c.start || '', name: c.name || '', used: used.length, all };
  }
  function nextCoachDate() {
    const t = W.today();
    const dates = coachSessions().map((w) => w.nextDate).filter((d) => d && d >= t).sort();
    return dates[0] || null;
  }
  W.T = { weekStats, coachPkg, nextCoachDate, woVol, coachSessions };

  const fmtVol = (v) => (v >= 10000 ? `${num(v / 1000, 1)}<small>t</small>` : `${Math.round(v).toLocaleString()}<small>kg</small>`);
  const trainSeg = (k) => W.segNav([['#/training', '訓練日誌', 'log'], ['#/coach', '教練課', 'coach']], k);

  /* =========================================================
   * 訓練日誌首頁
   * ========================================================= */
  function viewTraining() {
    LS.set('wo.lastTrainSeg', 'log');
    const t = W.today();
    const ws = W.weekStart(t);
    const cur = weekStats(ws), prev = weekStats(W.addDays(ws, -7));
    const days = Array.from({ length: 7 }, (_, i) => W.addDays(ws, i));
    const byDate = {};
    workouts().forEach((w) => (byDate[w.date] = byDate[w.date] || []).push(w));

    const week = `<div class="card week">
        <div class="card-h"><h3>本週</h3><span class="muted sm">${W.fmtDate(ws, 'short')} – ${W.fmtDate(W.addDays(ws, 6), 'short')}</span></div>
        <div class="stat3 flat">
          <div><span>訓練次數</span><b>${cur.count}<small>次</small></b><em class="${cur.count >= prev.count ? 'good' : ''}">上週 ${prev.count}</em></div>
          <div><span>總時長</span><b>${cur.minutes}<small>分</small></b><em>上週 ${prev.minutes}</em></div>
          <div><span>總訓練量</span><b>${fmtVol(cur.volume)}</b><em>上週 ${fmtVol(prev.volume).replace(/<[^>]+>/g, '')}</em></div>
        </div></div>`;

    // 常練動作
    const freq = {};
    workouts().forEach((w) => (w.exercises || []).forEach((e) => { if ((e.sets || []).length) freq[e.name] = (freq[e.name] || 0) + 1; }));
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const topHtml = top.length ? `<div class="sec-head"><h2>常練動作</h2><span class="muted sm">點進去看進步</span></div>
      <div class="ex-grid">${top.map(([name, c]) => {
        const info = exInfo(name);
        const h = exHistory(name);
        const best = Math.max(...h.map((x) => exScore(x.e, info.k)));
        return `<a class="ex-tile" href="#/training/ex/${encodeURIComponent(name)}"><b>${esc(name)}</b>
          <span>${c} 次・${SCORE_LABEL[info.k]} <strong>${info.k === 'w' ? num(best, 1) + 'kg' : num(best, 0)}</strong></span></a>`;
      }).join('')}</div>` : '';

    const list = workouts().slice().reverse();
    const groups = {};
    list.forEach((w) => (groups[w.date.slice(0, 7)] = groups[w.date.slice(0, 7)] || []).push(w));

    return trainSeg('log') + W.pageHead('訓練日誌', esc((W.S.data.settings || {}).gym || '健身工廠'), { right: `<a class="icon-btn solid" href="#/training/new" aria-label="新增訓練">${icon('plus')}</a>` }) +
      week + calendar(byDate) + topHtml +
      (list.length ? Object.keys(groups).map((m) => `<div class="sec-head"><h2>${+m.slice(5)} 月</h2><span class="muted sm">${groups[m].length} 次</span></div>
        <div class="card list-card">${groups[m].map(woRow).join('')}</div>`).join('')
        : W.empty('dumbbell', '還沒有訓練紀錄', '每次訓練記下動作、重量、次數，就能看到每個動作的進步曲線。', `<a class="btn primary" href="#/training/new">${icon('plus')}記錄第一次訓練</a>`)) +
      '<div class="foot-space"></div>';
  }
  viewTraining.mount = (v) => {
    $$('.wd, .cal-d', v).forEach((b) => (b.onclick = () => openDay(b.dataset.day)));
    $$('[data-cal]', v).forEach((b) => (b.onclick = () => {
      LS.set('wo.calMonth', b.dataset.cal);
      W.render.keepScroll = true; W.render();
    }));
  };

  function openDay(day) {
    if (!day) return;
    const l = workouts().filter((w) => w.date === day);
    if (l.length === 1) location.hash = '#/training/w/' + l[0].id;
    else if (l.length > 1) sheet(`<div class="sheet-body"><h3>${W.fmtDate(day, 'mdw')}</h3>${l.map((w) => `<a class="act" href="#/training/w/${w.id}"><span class="act-ic">${icon(w.isCoach === 'V' ? 'whistle' : 'dumbbell')}</span><div><b>${esc(w.title)}</b><span>${esc(w.summary || '')}</span></div>${icon('chevron', 'chev')}</a>`).join('')}</div>`, (wr, close) => $$('a', wr).forEach((a) => a.addEventListener('click', close)));
    else if (day <= W.today()) location.hash = '#/training/new?date=' + day;
  }

  function calendar(byDate) {
    const t = W.today();
    const month = LS.get('wo.calMonth', t.slice(0, 7));
    const first = month + '-01';
    const d0 = W.parseDate(first);
    const daysIn = new Date(d0.getFullYear(), d0.getMonth() + 1, 0).getDate();
    const lead = (d0.getDay() + 6) % 7;
    const prevM = W.addDays(first, -1).slice(0, 7), nextM = W.addDays(first, 32).slice(0, 7);
    const cnt = Object.keys(byDate).filter((d) => d.startsWith(month)).length;
    let cells = '';
    for (let i = 0; i < lead; i++) cells += '<span></span>';
    for (let i = 1; i <= daysIn; i++) {
      const d = `${month}-${W.p2(i)}`;
      const l = byDate[d] || [];
      cells += `<button class="cal-d ${l.length ? 'done' : ''} ${l.some((w) => w.isCoach === 'V') ? 'coach' : ''} ${d === t ? 'today' : ''} ${d > t ? 'future' : ''}" data-day="${d}">${i}</button>`;
    }
    return `<div class="card cal">
      <div class="cal-h"><button data-cal="${prevM}">${icon('back')}</button><b>${d0.getFullYear()} 年 ${d0.getMonth() + 1} 月</b><span class="muted sm">${cnt} 天</span><button data-cal="${nextM}" ${month >= t.slice(0, 7) ? 'disabled' : ''}>${icon('chevron')}</button></div>
      <div class="cal-g">${['一', '二', '三', '四', '五', '六', '日'].map((x) => `<em>${x}</em>`).join('')}${cells}</div>
      <div class="legend center"><span><i style="background:var(--ink)"></i>訓練</span><span><i style="background:var(--accent)"></i>教練課</span></div>
    </div>`;
  }

  function woRow(w) {
    const vol = woVol(w);
    return `<a class="wo-row" href="#/training/w/${w.id}">
      <div class="rec-date"><b>${W.fmtDate(w.date, 'short')}</b><span>週${W.WD[W.parseDate(w.date).getDay()]}</span></div>
      <div class="wo-main"><b>${esc(w.title || '訓練')}${w.isCoach === 'V' ? ` <span class="pill ok">教練課${w.sessionNo ? ' #' + w.sessionNo : ''}</span>` : ''}</b>
        <span>${(w.exercises || []).length} 個動作${w.duration ? `・${w.duration} 分` : ''}${vol ? `・${Math.round(vol).toLocaleString()} kg` : ''}</span></div>
      ${icon('chevron', 'chev')}</a>`;
  }

  /* =========================================================
   * 單次訓練
   * ========================================================= */
  function viewWorkout(id) {
    const w = workouts().find((x) => x.id === id);
    if (!w) return W.pageHead('找不到紀錄', '', { back: '#/training' });
    const vol = woVol(w);
    const backTo = w.isCoach === 'V' && LS.get('wo.lastTrainSeg', '') === 'coach' ? '#/coach' : '#/training';
    const coach = w.isCoach === 'V' ? coachCard(w) : '';
    const exs = (w.exercises || []).map((e) => {
      const info = exInfo(e.name);
      const k = e.kind || info.k;
      const bestScore = exScore(e, k);
      const pr = isPR(w, e);
      return `<div class="card ex-view">
        <div class="card-h"><a href="#/training/ex/${encodeURIComponent(e.name)}" class="ex-name"><h3>${esc(e.name)}</h3>${icon('chevron', 'chev')}</a>
          ${pr ? `<span class="pill pr">${icon('trophy')}新紀錄</span>` : `<span class="pill">${esc(e.cat || info.c)}</span>`}</div>
        <table class="sets"><tbody>${(e.sets || []).map((s, i) => `<tr class="${k === 'w' && e1rm(s) === bestScore && bestScore ? 'best' : ''}"><td>${i + 1}</td><td>${setStr(s, k)}</td><td class="muted">${k === 'w' && e1rm(s) ? '1RM≈' + num(e1rm(s), 1) : ''}</td></tr>`).join('')}</tbody></table>
        ${k === 'w' && exVol(e) ? `<div class="ex-foot"><span>訓練量 <b>${Math.round(exVol(e)).toLocaleString()} kg</b></span><span>最佳 1RM≈<b>${num(bestScore, 1)}</b></span></div>` : ''}
        ${e.note ? `<p class="ex-note">${icon('note')}${esc(e.note)}</p>` : ''}
      </div>`;
    }).join('');
    return W.pageHead(esc(w.title || '訓練'), `${W.fmtDate(w.date, 'mdw')}${w.location ? '・' + esc(w.location) : ''}`, {
      back: backTo, right: `<a class="icon-btn" href="#/training/edit/${w.id}" aria-label="編輯">${icon('edit')}</a>`,
    }) + `
      <div class="kpis four">
        <div class="kpi"><span>時長</span><b>${w.duration || '–'}<small>分</small></b></div>
        <div class="kpi"><span>動作</span><b>${(w.exercises || []).length}</b></div>
        <div class="kpi"><span>組數</span><b>${woSets(w)}</b></div>
        <div class="kpi"><span>訓練量</span><b>${vol ? fmtVol(vol) : '–'}</b></div>
      </div>
      ${w.rpe || w.tags ? `<div class="tag-row">${(w.tags || '').split(',').filter(Boolean).map((t) => `<span class="pill">${esc(t)}</span>`).join('')}${w.rpe ? `<span class="pill dark">RPE ${w.rpe}・${RPE_TXT[w.rpe]}</span>` : ''}</div>` : ''}
      ${coach}
      ${exs}
      ${w.note ? `<div class="card"><div class="card-h"><h3>備註</h3></div><p class="note">${esc(w.note).replace(/\n/g, '<br>')}</p></div>` : ''}
      <div class="foot-actions">
        <a class="btn ghost" href="#/training/new?copy=${w.id}">${icon('copy')}再做一次</a>
        <button class="btn ghost danger-text" id="woDel">${icon('trash')}刪除</button>
      </div><div class="foot-space"></div>`;
  }
  viewWorkout.mount = (v, id) => {
    const b = $('#woDel', v);
    if (b) b.onclick = async () => {
      if (!(await confirmSheet('刪除這次訓練？', '刪除後無法復原。', '刪除', true))) return;
      if (!(await act('刪除中…', () => call('data.delete', { col: 'workout', id })))) return;
      W.drop('workout', id);
      toast('已刪除');
      history.length > 1 ? history.back() : (location.hash = '#/training');
    };
  };

  function coachCard(w) {
    const byCat = {};
    (w.cues || []).forEach((c) => (byCat[c.cat || '其他'] = byCat[c.cat || '其他'] || []).push(c));
    return `<div class="card coach-card">
      <div class="card-h"><h3>${icon('whistle')}教練課${w.sessionNo ? ` <span class="muted">第 ${w.sessionNo} 堂</span>` : ''}</h3><span class="muted sm">${esc(w.coach || '')}</span></div>
      ${w.focus ? `<div class="focus">${esc(w.focus)}</div>` : ''}
      ${CUE_CATS.filter((c) => byCat[c]).map((c) => `<div class="cue-g"><h4>${c}</h4>${byCat[c].map((q) => `<div class="cue">${q.ex ? `<a class="cue-ex" href="#/training/ex/${encodeURIComponent(q.ex)}">${esc(q.ex)}</a>` : ''}<p>${esc(q.text).replace(/\n/g, '<br>')}</p></div>`).join('')}</div>`).join('')}
      ${w.homework ? `<div class="cue-g"><h4>回家功課</h4><p class="note">${esc(w.homework).replace(/\n/g, '<br>')}</p></div>` : ''}
      ${w.nextDate ? `<div class="next-row">${icon('calendar')}下次上課 <b>${W.fmtDate(w.nextDate, 'mdw')}</b><span class="muted">${W.relDay(w.nextDate)}</span></div>` : ''}
    </div>`;
  }

  /* =========================================================
   * 動作歷史
   * ========================================================= */
  function viewExercise(name) {
    const info = exInfo(name);
    const h = exHistory(name).filter((x) => (x.e.sets || []).length);
    const k = info.k;
    const pts = h.map((x) => ({ date: x.w.date, value: exScore(x.e, k) })).filter((p) => p.value);
    const maxW = Math.max(0, ...h.flatMap((x) => (x.e.sets || []).map((s) => n(s.w))));
    const maxVol = Math.max(0, ...h.map((x) => exVol(x.e)));
    const best = Math.max(0, ...pts.map((p) => p.value));
    const cues = [];
    coachSessions().forEach((w) => (w.cues || []).forEach((c) => { if (c.ex === name) cues.push({ c, w }); }));
    cues.sort((a, b) => b.w.date.localeCompare(a.w.date));
    const stats = k === 'w'
      ? [['估計 1RM', num(best, 1), 'kg'], ['最大重量', num(maxW, 1), 'kg'], ['單次最大量', Math.round(maxVol).toLocaleString(), 'kg'], ['練過', h.length, '次']]
      : [[SCORE_LABEL[k], num(best, k === 'c' ? 1 : 0), k === 't' ? '秒' : k === 'b' ? '下' : ''], ['練過', h.length, '次']];
    return W.pageHead(esc(name), `${esc(info.c)}・${KIND_LABEL[k]}`, { back: '#/training' }) + `
      <div class="kpis ${stats.length === 4 ? 'four' : ''}">${stats.map(([l, v, u]) => `<div class="kpi"><span>${l}</span><b>${v}<small>${u}</small></b></div>`).join('')}</div>
      ${pts.length ? `<div class="card chart-card"><div class="chart-head"><div><span class="muted">${SCORE_LABEL[k]}趨勢</span></div></div>
        ${C.timeChart({ series: [{ points: pts, line: true, dots: true, cls: 'raw' }], height: 150 })}
        ${k === 'w' ? '<p class="muted sm center">估計 1RM = 重量 × (1 + 次數 ÷ 30)，用來比較不同次數的組</p>' : ''}</div>` : ''}
      ${cues.length ? `<div class="sec-head"><h2>教練提醒</h2><span class="muted sm">${cues.length} 則</span></div>
        <div class="card list-card">${cues.map(({ c, w }) => `<a class="cue-row" href="#/training/w/${w.id}"><span class="pill ok">${esc(c.cat || '其他')}</span><p>${esc(c.text)}</p><em>${W.fmtDate(w.date, 'short')}</em></a>`).join('')}</div>` : ''}
      <div class="sec-head"><h2>紀錄</h2></div>
      <div class="card list-card">${h.length ? h.slice().reverse().map((x) => `<a class="hist-row" href="#/training/w/${x.w.id}">
          <div class="rec-date"><b>${W.fmtDate(x.w.date, 'short')}</b><span>${x.w.date.slice(0, 4)}</span></div>
          <div class="hist-sets">${(x.e.sets || []).map((s) => `<span>${setStr(s, k)}</span>`).join('')}${x.e.note ? `<em>${esc(x.e.note)}</em>` : ''}</div>
          ${isPR(x.w, x.e) ? `<span class="pr-ic">${icon('trophy')}</span>` : ''}</a>`).join('') : '<p class="muted sm pad">還沒有紀錄</p>'}</div>
      <div class="foot-space"></div>`;
  }

  /* =========================================================
   * 編輯器
   * ========================================================= */
  function blankDraft(opts = {}) {
    const st = W.S.data.settings || {};
    const lastCoach = coachSessions().slice(-1)[0];
    return {
      id: '', date: opts.date || W.today(), title: '', tags: [], duration: '', rpe: '', location: st.gym || '健身工廠', note: '',
      exercises: [], isCoach: !!opts.coach, coach: (st.coach && st.coach.name) || (lastCoach && lastCoach.coach) || '',
      sessionNo: '', focus: '', cues: [], homework: '', nextDate: '',
    };
  }
  function fromRecord(w, copy) {
    const d = JSON.parse(JSON.stringify(w));
    d.tags = (w.tags || '').split(',').filter(Boolean);
    d.isCoach = w.isCoach === 'V';
    d.cues = d.cues || [];
    d.exercises = d.exercises || [];
    if (copy) {
      Object.assign(d, { id: '', date: W.today(), note: '', isCoach: false, cues: [], focus: '', homework: '', nextDate: '', sessionNo: '' });
      d.exercises.forEach((e) => (e.sets = e.sets.map(() => ({})))); // 保留組數，數值顯示為上次提示
    }
    return d;
  }
  const DKEY = 'wo.draftWorkout';
  let D = null; // 編輯中的草稿

  function viewEditor(id) {
    const q = W.query();
    const isNew = !id;
    const key = isNew ? 'new:' + (q.copy || '') + (q.coach || '') + (q.date || '') : 'edit:' + id;
    const saved = LS.get(DKEY, null);
    // 未送出的草稿保留 12 小時（避免切 App 時資料遺失）
    if (saved && saved.key === key && saved.d && Date.now() - (saved.ts || 0) < 432e5) D = saved.d;
    else if (id) {
      const w = workouts().find((x) => x.id === id);
      if (!w) return W.pageHead('找不到紀錄', '', { back: '#/training' });
      D = fromRecord(w);
    } else if (q.copy) {
      const w = workouts().find((x) => x.id === q.copy);
      D = w ? fromRecord(w, true) : blankDraft();
    } else D = blankDraft({ date: q.date, coach: q.coach === '1' });
    D._key = key;
    if (D.isCoach && !D.sessionNo) D.sessionNo = defaultSessionNo();
    const coachHint = '例如：深蹲時膝蓋對準腳尖方向；或：每天蛋白質至少 120g';
    return W.pageHead(isNew ? (D.isCoach ? '記錄教練課' : '記錄訓練') : '編輯訓練', isNew ? '' : W.fmtDate(D.date, 'mdw'), { back: id ? '#/training/w/' + id : D.isCoach ? '#/coach' : '#/training' }) + `
      <div class="card form-card">
        <div class="frow"><label>日期</label><input type="date" class="inp" data-k="date" value="${D.date}" max="${W.today()}"></div>
        <div class="frow"><label>標題</label><input class="inp" data-k="title" value="${esc(D.title)}" placeholder="例如：胸＋三頭（可留空自動產生）"></div>
        <div class="frow col"><label>部位</label><div class="chips wrap" id="tagChips">${CATS.map((c) => `<button type="button" class="chip sm ${D.tags.includes(c) ? 'on' : ''}" data-tag="${c}">${c}</button>`).join('')}</div></div>
        <div class="frow"><label>時長<small>分鐘</small></label><div class="inline"><div class="quick">${[45, 60, 90].map((m) => `<button type="button" class="chip sm" data-dur="${m}">${m}</button>`).join('')}</div><input class="inp num w70" inputmode="numeric" data-k="duration" value="${esc(D.duration)}" placeholder="–"></div></div>
        <div class="frow col"><label>整體強度 RPE <span class="muted sm" id="rpeTxt">${D.rpe ? D.rpe + '・' + RPE_TXT[D.rpe] : '1 很輕鬆 – 10 極限'}</span></label>
          <div class="rpe">${Array.from({ length: 10 }, (_, i) => `<button type="button" data-rpe="${i + 1}" class="${+D.rpe === i + 1 ? 'on' : ''}">${i + 1}</button>`).join('')}</div></div>
        <div class="frow"><label>地點</label><input class="inp" data-k="location" value="${esc(D.location)}" list="locList"></div>
        <datalist id="locList">${[...new Set(workouts().map((w) => w.location).filter(Boolean))].map((l) => `<option value="${esc(l)}">`).join('')}</datalist>
      </div>

      <div class="card form-card coach-box ${D.isCoach ? 'on' : ''}">
        <label class="switch-row"><span>${icon('whistle')}<b>這是教練課</b></span><input type="checkbox" id="isCoach" ${D.isCoach ? 'checked' : ''}><i class="switch"></i></label>
        <div class="coach-fields">
          <div class="frow"><label>教練</label><input class="inp" data-k="coach" value="${esc(D.coach)}" list="coachList" placeholder="教練名字"></div>
          <datalist id="coachList">${[...new Set(coachSessions().map((w) => w.coach).filter(Boolean))].map((l) => `<option value="${esc(l)}">`).join('')}</datalist>
          <div class="frow"><label>第幾堂</label><input class="inp num w70" inputmode="numeric" data-k="sessionNo" value="${esc(D.sessionNo)}"></div>
          <div class="frow"><label>課程主題</label><input class="inp" data-k="focus" value="${esc(D.focus)}" placeholder="例如：深蹲動作模式"></div>
          <div class="frow col"><label>教練重點<span class="muted sm">　教練教的、提醒的都記這裡</span></label><div id="cueList"></div>
            <button type="button" class="btn ghost sm" id="addCue">${icon('plus')}新增重點</button><p class="hint">${coachHint}</p></div>
          <div class="frow col"><label>回家功課</label><textarea class="inp" rows="2" data-k="homework" placeholder="例如：每天髖關節伸展 2 組">${esc(D.homework)}</textarea></div>
          <div class="frow"><label>下次上課</label><input type="date" class="inp" data-k="nextDate" value="${esc(D.nextDate)}"></div>
        </div>
      </div>

      <div class="sec-head"><h2>動作</h2><span class="muted sm" id="exCount"></span></div>
      <div id="exList"></div>
      <button type="button" class="btn ghost block add-ex" id="addEx">${icon('plus')}新增動作</button>

      <div class="card form-card"><div class="frow col"><label>備註</label><textarea class="inp" rows="3" data-k="note" placeholder="今天狀況、睡眠、哪裡不舒服…">${esc(D.note)}</textarea></div></div>
      <div class="sticky-cta"><button class="btn primary block" id="woSave">${icon('check')}儲存</button></div>`;
  }

  function defaultSessionNo() {
    const pkg = coachPkg();
    const list = coachSessions().filter((w) => w.id !== D.id && w.date <= D.date && (!pkg.start || w.date >= pkg.start));
    return list.length + 1;
  }

  function persist() { if (D) LS.set(DKEY, { key: D._key, d: D, ts: Date.now() }); }

  viewEditor.mount = (v) => {
    if (!D) return;
    const exList = $('#exList', v), cueList = $('#cueList', v);
    const renderEx = () => {
      exList.innerHTML = D.exercises.length ? D.exercises.map(exCard).join('') : `<div class="card empty-mini">還沒有動作，點下方「新增動作」</div>`;
      $('#exCount', v).textContent = D.exercises.length ? `${D.exercises.length} 個動作・${W.sum(D.exercises, (e) => e.sets.length)} 組` : '';
    };
    const renderCues = () => {
      cueList.innerHTML = D.cues.map((c, i) => `<div class="cue-edit" data-c="${i}">
        <div class="cue-top"><select class="inp sm" data-cf="cat">${CUE_CATS.map((x) => `<option ${c.cat === x ? 'selected' : ''}>${x}</option>`).join('')}</select>
        <select class="inp sm" data-cf="ex"><option value="">（不限動作）</option>${[...new Set(D.exercises.map((e) => e.name).concat(c.ex ? [c.ex] : []))].map((x) => `<option ${c.ex === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>
        <button type="button" class="x" data-cdel="${i}">${icon('close')}</button></div>
        <textarea class="inp" rows="2" data-cf="text" placeholder="重點內容">${esc(c.text || '')}</textarea></div>`).join('');
    };
    renderEx(); renderCues();

    // 欄位綁定
    v.addEventListener('input', (e) => {
      const t = e.target;
      if (t.dataset.k) D[t.dataset.k] = t.value;
      if (t.dataset.f) {
        const ex = D.exercises[+t.closest('[data-i]').dataset.i];
        const set = ex.sets[+t.dataset.j];
        set[t.dataset.f] = t.value === '' ? '' : +t.value;
      }
      if (t.dataset.en != null) D.exercises[+t.dataset.en].note = t.value;
      if (t.dataset.cf) D.cues[+t.closest('[data-c]').dataset.c][t.dataset.cf] = t.value;
      if (t.dataset.k === 'date' && D.isCoach) { D.sessionNo = defaultSessionNo(); $('[data-k=sessionNo]', v).value = D.sessionNo; }
      persist();
    });
    v.addEventListener('change', (e) => { if (e.target.dataset.cf) { D.cues[+e.target.closest('[data-c]').dataset.c][e.target.dataset.cf] = e.target.value; persist(); } });
    v.addEventListener('click', (e) => {
      const t = e.target.closest('button');
      if (!t) return;
      if (t.dataset.tag) {
        const tag = t.dataset.tag;
        D.tags = D.tags.includes(tag) ? D.tags.filter((x) => x !== tag) : D.tags.concat([tag]);
        t.classList.toggle('on');
      } else if (t.dataset.dur) {
        D.duration = +t.dataset.dur; $('[data-k=duration]', v).value = D.duration;
      } else if (t.dataset.rpe) {
        D.rpe = +t.dataset.rpe;
        $$('.rpe button', v).forEach((b) => b.classList.toggle('on', b === t));
        $('#rpeTxt', v).textContent = D.rpe + '・' + RPE_TXT[D.rpe];
      } else if (t.dataset.addset != null) {
        const ex = D.exercises[+t.dataset.addset];
        const lastSet = ex.sets[ex.sets.length - 1] || {};
        ex.sets.push(Object.assign({}, lastSet));
        renderEx();
      } else if (t.dataset.delset != null) {
        const [i, j] = t.dataset.delset.split(':').map(Number);
        D.exercises[i].sets.splice(j, 1);
        renderEx();
      } else if (t.dataset.fill != null) {
        const ex = D.exercises[+t.dataset.fill];
        const lp = lastPerf(ex.name, D.id);
        if (lp) ex.sets = lp.e.sets.map((s) => Object.assign({}, s));
        renderEx();
      } else if (t.dataset.delex != null) {
        D.exercises.splice(+t.dataset.delex, 1);
        renderEx(); renderCues();
      } else if (t.dataset.up != null) {
        const i = +t.dataset.up;
        if (i > 0) { [D.exercises[i - 1], D.exercises[i]] = [D.exercises[i], D.exercises[i - 1]]; renderEx(); }
      } else if (t.dataset.cdel != null) {
        D.cues.splice(+t.dataset.cdel, 1); renderCues();
      } else return;
      persist();
    });
    $('#isCoach', v).onchange = (e) => {
      D.isCoach = e.target.checked;
      $('.coach-box', v).classList.toggle('on', D.isCoach);
      if (D.isCoach && !D.sessionNo) { D.sessionNo = defaultSessionNo(); $('[data-k=sessionNo]', v).value = D.sessionNo; }
      persist();
    };
    $('#addCue', v).onclick = () => {
      D.cues.push({ cat: '動作要點', ex: D.exercises.length ? D.exercises[D.exercises.length - 1].name : '', text: '' });
      renderCues(); persist();
      const ta = $$('[data-cf=text]', cueList).pop(); ta && ta.focus();
    };
    $('#addEx', v).onclick = () => pickExercise((info) => {
      const lp = lastPerf(info.n, D.id);
      const count = lp ? lp.e.sets.length : info.k === 'c' ? 1 : 3;
      D.exercises.push({ name: info.n, cat: info.c, kind: info.k, note: '', sets: Array.from({ length: count }, () => ({})) });
      renderEx(); renderCues(); persist();
      setTimeout(() => { const last = $$('.ex-card', v).pop(); last && last.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50);
    });
    $('#woSave', v).onclick = save;
  };

  function exCard(e, i) {
    const k = e.kind || exInfo(e.name).k;
    const lp = lastPerf(e.name, D.id);
    const ls = lp ? lp.e.sets : [];
    const cols = k === 'w' ? [['w', 'kg'], ['r', '次']] : k === 'b' ? [['w', '+kg'], ['r', '次']] : k === 't' ? [['t', '秒']] : [['m', '分鐘'], ['d', 'km']];
    return `<div class="card ex-card" data-i="${i}">
      <div class="ex-h"><div><b>${esc(e.name)}</b><span class="muted sm">${esc(e.cat || '')}・${KIND_LABEL[k]}</span></div>
        <div class="ex-tools">${i > 0 ? `<button type="button" data-up="${i}" aria-label="上移">${icon('back', 'rot90')}</button>` : ''}<button type="button" data-delex="${i}" aria-label="移除">${icon('trash')}</button></div></div>
      ${lp ? `<div class="ex-last"><span>上次 ${W.fmtDate(lp.w.date, 'short')}：${ls.map((s) => setStr(s, k)).join('、')}</span><button type="button" data-fill="${i}">照上次</button></div>` : ''}
      <table class="set-tbl"><thead><tr><th>組</th>${cols.map(([, l]) => `<th>${l}</th>`).join('')}<th></th></tr></thead><tbody>
      ${e.sets.map((s, j) => `<tr><td class="si">${j + 1}</td>${cols.map(([f]) => `<td><input class="inp num" inputmode="decimal" data-j="${j}" data-f="${f}" value="${has(s[f]) ? s[f] : ''}" placeholder="${ls[j] && has(ls[j][f]) ? ls[j][f] : ls.length && has(ls[ls.length - 1][f]) ? ls[ls.length - 1][f] : ''}"></td>`).join('')}
        <td><button type="button" class="x" data-delset="${i}:${j}">${icon('close')}</button></td></tr>`).join('')}
      </tbody></table>
      <div class="ex-f"><button type="button" class="btn ghost sm" data-addset="${i}">${icon('plus')}加一組</button>
        <input class="inp sm grow" data-en="${i}" value="${esc(e.note || '')}" placeholder="備註：座椅高度、握法…"></div>
    </div>`;
  }

  function pickExercise(onPick) {
    const recent = [];
    workouts().slice().reverse().forEach((w) => (w.exercises || []).forEach((e) => { if (!recent.includes(e.name)) recent.push(e.name); }));
    let cat = '', q = '';
    sheet(`<div class="sheet-body picker">
        <h3>新增動作</h3>
        <div class="search">${icon('search')}<input id="pq" placeholder="搜尋或輸入新動作名稱" autocomplete="off"></div>
        <div class="chips" id="pcat"><button class="chip sm on" data-c="">全部</button>${CATS.map((c) => `<button class="chip sm" data-c="${c}">${c}</button>`).join('')}</div>
        <div class="pick-list" id="plist"></div>
      </div>`, (w, close) => {
      const list = $('#plist', w);
      const draw = () => {
        const ql = q.trim().toLowerCase();
        const custom = recent.filter((r) => !LIB.some((e) => e.n === r)).map(exInfo);
        let items = LIB.concat(custom).filter((e) => (!cat || e.c === cat) && (!ql || e.n.toLowerCase().includes(ql)));
        const rec = !ql && !cat ? recent.slice(0, 8).map(exInfo) : [];
        if (rec.length) items = items.filter((e) => !rec.some((r) => r.n === e.n));
        const exact = LIB.concat(custom).some((e) => e.n === q.trim());
        list.innerHTML = (q.trim() && !exact ? `<div class="pick-new"><b>新增自訂動作「${esc(q.trim())}」</b>
            <div class="seg sm" id="pkind">${Object.entries(KIND_LABEL).map(([kk, l], i) => `<button class="${i === 0 ? 'on' : ''}" data-k="${kk}">${l}</button>`).join('')}</div>
            <button class="btn primary sm" id="pnew">新增${cat ? '到「' + cat + '」' : ''}</button></div>` : '') +
          (rec.length ? `<h4>最近做過</h4>${rec.map(item).join('')}<h4>全部動作</h4>` : '') + items.map(item).join('');
        $$('[data-n]', list).forEach((b) => (b.onclick = () => { onPick(exInfo(b.dataset.n)); close(); }));
        const pk = $('#pkind', list);
        if (pk) $$('button', pk).forEach((b) => (b.onclick = () => $$('button', pk).forEach((x) => x.classList.toggle('on', x === b))));
        const pn = $('#pnew', list);
        if (pn) pn.onclick = () => { onPick({ n: q.trim(), c: cat || '其他', k: $('#pkind .on', list).dataset.k }); close(); };
      };
      const item = (e) => `<button class="pick" data-n="${esc(e.n)}"><b>${esc(e.n)}</b><span>${e.c}・${KIND_LABEL[e.k]}</span></button>`;
      $('#pq', w).oninput = (e) => { q = e.target.value; draw(); };
      $$('#pcat .chip', w).forEach((b) => (b.onclick = () => { cat = b.dataset.c; $$('#pcat .chip', w).forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
      draw();
    }, { tall: true });
  }

  async function save() {
    if (!D.date) { toast('請選日期', 'err'); return; }
    const exercises = D.exercises.map((e) => ({
      name: e.name, cat: e.cat, kind: e.kind, note: (e.note || '').trim(),
      sets: e.sets.filter((s) => ['w', 'r', 't', 'm', 'd'].some((f) => has(s[f]))),
    })).filter((e) => e.sets.length || e.note);
    if (!exercises.length && !D.isCoach && !D.note) { toast('至少新增一個動作', 'err'); return; }
    const tags = D.tags.length ? D.tags : [...new Set(exercises.map((e) => e.cat).filter((c) => c && c !== '其他'))];
    const rec = {
      id: D.id || '', date: D.date, tags: tags.join(','),
      title: D.title.trim() || (D.isCoach && D.focus ? D.focus : tags.length ? tags.join('＋') : D.isCoach ? '教練課' : '訓練'),
      duration: has(D.duration) ? +D.duration : '', rpe: D.rpe || '', location: D.location || '', note: (D.note || '').trim(),
      exercises,
      volume: Math.round(W.sum(exercises, exVol)),
      summary: exercises.map((e) => {
        const k = e.kind || 'w';
        const best = e.sets.slice().sort((a, b) => (k === 'w' ? e1rm(b) - e1rm(a) : 0))[0];
        return `${e.name} ${best ? setStr(best, k).replace(/ /g, '') : ''}×${e.sets.length}組`;
      }).join('、'),
      isCoach: D.isCoach ? 'V' : '',
      coach: D.isCoach ? D.coach : '', sessionNo: D.isCoach && has(D.sessionNo) ? +D.sessionNo : '',
      focus: D.isCoach ? D.focus : '', cues: D.isCoach ? D.cues.filter((c) => (c.text || '').trim()) : [],
      homework: D.isCoach ? D.homework : '', nextDate: D.isCoach ? D.nextDate : '',
    };
    const saved = await act('儲存中…', () => call('data.save', { col: 'workout', record: rec }));
    if (!saved) return;
    W.put('workout', saved);
    LS.del(DKEY);
    D = null;
    toast(rec.isCoach ? '教練課已記錄' : '訓練已記錄', 'ok');
    location.replace('#/training/w/' + saved.id);
  }

  /* =========================================================
   * 教練課
   * ========================================================= */
  function viewCoach() {
    LS.set('wo.lastTrainSeg', 'coach');
    const pkg = coachPkg();
    const sessions = pkg.all.slice().reverse();
    const next = nextCoachDate();
    const remain = pkg.total ? Math.max(pkg.total - pkg.used, 0) : null;
    const pkgCard = `<div class="card pkg">
      <div class="card-h"><h3>課程方案</h3><button class="link-btn" id="pkgEdit">${pkg.total ? '編輯' : '設定'}</button></div>
      ${pkg.total ? `<div class="pkg-main"><div><span class="muted sm">已上</span><div class="big">${pkg.used}<small>/ ${pkg.total} 堂</small></div></div>
          <div class="pkg-remain"><span class="muted sm">剩餘</span><b>${remain}</b><small>堂</small></div></div>
        <div class="goal-bar"><i style="width:${Math.min((pkg.used / pkg.total) * 100, 100)}%"></i></div>
        <div class="goal-row sub"><span>${pkg.name ? '教練 ' + esc(pkg.name) : ''}</span><span>${pkg.start ? W.fmtDate(pkg.start, 'day') + ' 開始' : ''}</span></div>`
        : `<p class="muted sm">設定購買的堂數，就能自動算剩餘堂數。目前已記錄 ${pkg.used} 堂。</p>`}
    </div>`;
    const nextCard = next ? `<div class="card next-card">${icon('calendar')}<div><span class="muted sm">下次上課</span><b>${W.fmtDate(next, 'mdw')}</b></div><span class="pill ok">${W.relDay(next)}</span></div>` : '';

    // 教練重點總覽
    const cues = [];
    pkg.all.forEach((w) => (w.cues || []).forEach((c) => cues.push({ c, w })));
    const cueCat = LS.get('wo.cueCat', '');
    return trainSeg('coach') + W.pageHead('教練課', '上課紀錄與重點', { right: `<a class="icon-btn solid" href="#/training/new?coach=1" aria-label="記錄教練課">${icon('plus')}</a>` }) +
      pkgCard + nextCard +
      `<div class="sec-head"><h2>教練重點</h2><span class="muted sm">${cues.length} 則</span></div>` +
      (cues.length ? `<div class="search card-search">${icon('search')}<input id="cueQ" placeholder="搜尋重點、動作…"></div>
        <div class="chips" id="cueCats"><button class="chip sm ${!cueCat ? 'on' : ''}" data-c="">全部</button>${CUE_CATS.filter((c) => cues.some((x) => (x.c.cat || '其他') === c)).map((c) => `<button class="chip sm ${cueCat === c ? 'on' : ''}" data-c="${c}">${c}</button>`).join('')}</div>
        <div id="cueBox">${cueGroups(cues, cueCat, '')}</div>`
        : `<div class="card"><p class="muted sm">上教練課時把教練教的重點記下來（例如「深蹲：膝蓋對準腳尖」），這裡會依動作整理成你的專屬筆記。</p></div>`) +
      `<div class="sec-head"><h2>上課紀錄</h2><span class="muted sm">${sessions.length} 堂</span></div>` +
      (sessions.length ? `<div class="card list-card">${sessions.map((w) => `<a class="wo-row" href="#/training/w/${w.id}">
          <div class="rec-date"><b>${w.sessionNo ? '#' + w.sessionNo : '–'}</b><span>第幾堂</span></div>
          <div class="wo-main"><b>${esc(w.focus || w.title || '教練課')}</b><span>${W.fmtDate(w.date, 'sw')}${(w.cues || []).length ? `・${w.cues.length} 個重點` : ''}${(w.exercises || []).length ? `・${w.exercises.length} 個動作` : ''}</span></div>
          ${icon('chevron', 'chev')}</a>`).join('')}</div>`
        : W.empty('whistle', '還沒有教練課紀錄', '上完課記下這堂練了什麼、教練提醒了什麼。', `<a class="btn primary" href="#/training/new?coach=1">${icon('plus')}記錄教練課</a>`)) +
      '<div class="foot-space"></div>';
  }
  function cueGroups(cues, cat, q) {
    const ql = q.trim().toLowerCase();
    const list = cues.filter(({ c }) => (!cat || (c.cat || '其他') === cat) && (!ql || (c.text + ' ' + (c.ex || '') + ' ' + c.cat).toLowerCase().includes(ql)));
    if (!list.length) return '<p class="muted sm pad">沒有符合的重點</p>';
    const groups = {};
    list.forEach((x) => (groups[x.c.ex || '一般'] = groups[x.c.ex || '一般'] || []).push(x));
    const keys = Object.keys(groups).sort((a, b) => (a === '一般') - (b === '一般') || groups[b].length - groups[a].length);
    return keys.map((k) => `<div class="card cue-card"><div class="card-h"><h3>${k === '一般' ? '一般觀念' : `<a href="#/training/ex/${encodeURIComponent(k)}">${esc(k)}</a>`}</h3><span class="muted sm">${groups[k].length}</span></div>
      ${groups[k].sort((a, b) => b.w.date.localeCompare(a.w.date)).map(({ c, w }) => `<a class="cue-row" href="#/training/w/${w.id}"><span class="pill ${c.cat === '姿勢修正' ? 'warn' : 'ok'}">${esc(c.cat || '其他')}</span><p>${esc(c.text)}</p><em>${W.fmtDate(w.date, 'short')}</em></a>`).join('')}</div>`).join('');
  }
  viewCoach.mount = (v) => {
    $('#pkgEdit', v).onclick = editPackage;
    const box = $('#cueBox', v);
    if (!box) return;
    const cues = [];
    coachSessions().forEach((w) => (w.cues || []).forEach((c) => cues.push({ c, w })));
    let cat = LS.get('wo.cueCat', ''), q = '';
    $$('#cueCats .chip', v).forEach((b) => (b.onclick = () => {
      cat = b.dataset.c; LS.set('wo.cueCat', cat);
      $$('#cueCats .chip', v).forEach((x) => x.classList.toggle('on', x === b));
      box.innerHTML = cueGroups(cues, cat, q);
    }));
    $('#cueQ', v).oninput = (e) => { q = e.target.value; box.innerHTML = cueGroups(cues, cat, q); };
  };

  function editPackage() {
    const pkg = coachPkg();
    sheet(`<div class="sheet-body"><h3>課程方案</h3>
      <label class="field"><span>購買堂數</span><input name="total" inputmode="numeric" value="${pkg.total || ''}" placeholder="例如 12"></label>
      <label class="field"><span>方案開始日期</span><input type="date" name="start" value="${pkg.start || (pkg.all[0] && pkg.all[0].date) || W.today()}"></label>
      <label class="field"><span>教練</span><input name="name" value="${esc(pkg.name)}" placeholder="教練名字"></label>
      <p class="muted sm">開始日期之後的教練課才會計入已上堂數。換新方案時改這裡即可。</p>
      <div class="btn-row"><button class="btn primary" data-a="save">儲存</button></div></div>`, (w, close) => {
      $('[data-a=save]', w).onclick = async () => {
        const r = await W.saveSettings({ coach: { total: +$('[name=total]', w).value || 0, start: $('[name=start]', w).value, name: $('[name=name]', w).value.trim() } });
        if (!r) return;
        close(); W.render.keepScroll = true; W.render();
      };
    });
  }

  const viewEditorNew = () => viewEditor('');
  viewEditorNew.mount = viewEditor.mount;
  W.route(/^#\/training$/, viewTraining, { tab: 'training' });
  W.route(/^#\/training\/w\/([\w-]+)$/, viewWorkout, { tab: 'training' });
  W.route(/^#\/training\/ex\/(.+)$/, viewExercise, { tab: 'training' });
  W.route(/^#\/training\/new$/, viewEditorNew, { tab: false });
  W.route(/^#\/training\/edit\/([\w-]+)$/, viewEditor, { tab: false });
  W.route(/^#\/coach$/, viewCoach, { tab: 'training' });
})();
