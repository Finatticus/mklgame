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
  W.F = { dayTotals, MEALS };

  /* =========================================================
   * 每日總覽
   * ========================================================= */
  function viewFood() {
    const q = W.query();
    const day = q.d || W.today();
    const tg = W.nutritionTargets();
    const tot = dayTotals(day);
    const entries = dayEntries(day);
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
      return `<div class="card meal"><div class="meal-h"><h3>${m}</h3><span><b>${Math.round(mk)}</b> kcal</span>
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
      <div class="card nut">
        <div class="nut-top">${ring}
          <div class="nut-side"><div><span>目標</span><b>${tg.kcal.toLocaleString()}</b></div><div><span>已攝取</span><b>${Math.round(tot.kcal).toLocaleString()}</b></div></div>
        </div>
        ${bar('protein', '蛋白質', 'g')}${bar('carb', '碳水', 'g')}${bar('fat', '脂肪', 'g')}${bar('fiber', '膳食纖維', 'g')}
        <button class="link-btn" id="goalBtn">${icon('target')}調整目標${tg.custom ? '' : '（目前依 InBody 建議）'}</button>
      </div>
      ${mealHtml}
      <div class="sec-head"><h2>近 7 天</h2><span class="muted sm">${logged.length} 天有紀錄</span></div>
      <div class="card chart-card">
        ${C.bars({ items: days7.map((d, i) => ({ label: W.fmtDate(d, 'short'), value: totals7[i].kcal, cls: (d === day ? 'today ' : '') + (totals7[i].kcal > tg.kcal ? 'over' : '') })), target: tg.kcal })}
        <div class="stat3 tight"><div><span>平均熱量</span><b>${Math.round(avgK).toLocaleString()}<small>kcal</small></b></div>
          <div><span>平均蛋白質</span><b>${Math.round(avgP)}<small>g</small></b></div>
          <div><span>蛋白質達標</span><b>${logged.filter((t) => t.protein >= tg.protein * 0.9).length}<small>/ ${logged.length} 天</small></b></div></div>
      </div>
      <div class="foot-space"></div>`;
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
    return W.pageHead(id ? '編輯飲食' : '新增飲食', W.fmtDate(D.date, 'mdw'), { back: '#/food?d=' + D.date }) + `
      <div class="card form-card">
        <div class="chips wrap" id="mealChips">${MEALS.map((m) => `<button type="button" class="chip ${D.meal === m ? 'on' : ''}" data-meal="${m}">${m}</button>`).join('')}</div>
        <div class="frow"><label>日期</label><input type="date" class="inp" data-k="date" value="${D.date}" max="${W.today()}"></div>
        <div class="frow"><label>時間</label><input type="time" class="inp" data-k="time" value="${esc(D.time || '')}"></div>
      </div>
      <div class="add3">
        <button type="button" id="addSearch">${icon('search')}<b>搜尋食物</b><span>資料庫・常吃</span></button>
        <button type="button" id="addAI">${icon('sparkle')}<b>AI 估算</b><span>打字或拍照</span></button>
        <button type="button" id="addManual">${icon('edit')}<b>手動輸入</b><span>看包裝填</span></button>
      </div>
      <div id="aiNote"></div>
      <div id="items"></div>
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
    $('#addSearch', v).onclick = () => searchFood((it) => { D.items.push(it); draw(); });
    $('#addAI', v).onclick = () => aiEstimate((res) => {
      res.items.forEach((it) => D.items.push(Object.assign({}, it, { src: 'AI' })));
      D.aiNotes = res.notes || '';
      showAiNote(); draw();
    });
    const del = $('#fDel', v);
    if (del) del.onclick = async () => {
      if (!(await confirmSheet('刪除這筆飲食紀錄？', '刪除後無法復原。', '刪除', true))) return;
      if (!(await act('刪除中…', () => call('data.delete', { col: 'food', id })))) return;
      W.drop('food', id);
      toast('已刪除');
      location.replace('#/food?d=' + D.date);
    };
    $('#fSave', v).onclick = async () => {
      const items = D.items.filter((i) => (i.name || '').trim() || i.kcal);
      if (!items.length) { toast('至少加入一個品項', 'err'); return; }
      const rec = { id: D.id || '', date: D.date, time: D.time || '', meal: D.meal, note: (D.note || '').trim(), items: items.map((i) => {
        const o = { name: (i.name || '').trim() || '未命名', amount: i.amount || '' };
        NUT.forEach(([k]) => (o[k] = r1(i[k])));
        if (i.src) o.src = i.src;
        return o;
      }) };
      NUT.forEach(([k]) => (rec[k] = r1(W.sum(rec.items, (i) => i[k]))));
      rec.title = rec.items.map((i) => i.name).join('、').slice(0, 60);
      const saved = await act('儲存中…', () => call('data.save', { col: 'food', record: rec }));
      if (!saved) return;
      W.put('food', saved);
      toast(`已記錄 ${Math.round(saved.kcal || 0)} kcal`, 'ok');
      location.replace('#/food?d=' + saved.date);
    };
  };

  /** 搜尋：常吃 + 資料庫 */
  function searchFood(onPick) {
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
        const items = pool.filter((f) => !ql || f.name.toLowerCase().includes(ql)).slice(0, 80);
        list.innerHTML = items.length ? items.map((f, i) => `<div class="fpick" data-i="${i}">
            <button class="fp-main"><b>${esc(f.name)}</b><span>${esc(f.amount || '')}・${Math.round(f.kcal)} kcal・P ${r1(f.protein)} C ${r1(f.carb)} F ${r1(f.fat)}${f.times ? `・吃過 ${f.times} 次` : ''}</span></button>
            <div class="fp-qty">${[0.5, 1, 1.5, 2].map((m) => `<button data-m="${m}" class="${m === 1 ? 'on' : ''}">${m === 0.5 ? '½' : m === 1.5 ? '1½' : m}</button>`).join('')}<button class="fp-add">加入</button></div>
          </div>`).join('') : `<p class="muted sm pad">找不到「${esc(q)}」。可以改用 AI 估算或手動輸入。</p>`;
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

  /** AI 估算（文字 / 照片） */
  function aiEstimate(onDone) {
    let photo = null;
    sheet(`<div class="sheet-body">
        <h3>${icon('sparkle')} AI 估算</h3>
        <label class="field"><span>描述這餐（越具體越準）</span>
          <textarea id="aiText" rows="3" class="inp" placeholder="例如：自助餐，白飯半碗、滷雞腿、高麗菜、番茄炒蛋，一杯無糖綠茶"></textarea></label>
        <label class="ai-photo" id="aiPhotoLbl"><input type="file" accept="image/*" hidden id="aiPhoto">${icon('camera')}<span>附上照片（選填）</span><img hidden id="aiPrev" alt=""></label>
        <p class="muted sm">AI 會參考台灣食品營養成分資料庫與常見份量估算，結果可以再修改。</p>
        <div class="btn-row"><button class="btn primary" id="aiGo">${icon('sparkle')}開始估算</button></div>
      </div>`, (w, close) => {
      $('#aiPhoto', w).onchange = async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        photo = await W.compressImage(f, 1280, 0.8);
        const img = $('#aiPrev', w);
        img.src = photo.preview; img.hidden = false;
        $('#aiPhotoLbl span', w).textContent = '更換照片';
      };
      $('#aiGo', w).onclick = async () => {
        const text = $('#aiText', w).value.trim();
        if (!text && !photo) { toast('請輸入描述或附上照片', 'err'); return; }
        const res = await act('AI 估算中…', () => call('food.estimate', { text, image: photo ? { data: photo.data, mimeType: photo.mimeType } : null }));
        if (!res) return;
        if (!res.items || !res.items.length) { toast('AI 沒有辨識出食物，請描述得更具體', 'err'); return; }
        close();
        onDone(res);
      };
    });
  }

  const viewNew = () => viewEditor('');
  viewNew.mount = (v) => viewEditor.mount(v, '');
  W.route(/^#\/food$/, viewFood, { tab: 'food' });
  W.route(/^#\/food\/new$/, viewNew, { tab: false });
  W.route(/^#\/food\/e\/([\w-]+)$/, viewEditor, { tab: false });
})();
