// 營地（設施、研究、派遣、農田料理、訪客）、英雄、祭壇（天賦樹、祈福、覺醒、記憶）、更多
const UI = {
  res(k) { return `<span class="ri">${Art.img(RES[k].icon)}</span>`; },
  cost(c) {
    return Object.keys(c).map(k => `<span class="chip" data-res="${k}" data-need="${c[k]}">${UI.res(k)}${fmt(c[k])}</span>`).join('');
  },
  costBtn(act, arg, cost, label = '', cls = '') {
    return `<button class="btn cost ${cls}" data-act="${act}" data-arg="${arg}" data-cost='${JSON.stringify(cost)}'>${label}<span>${UI.cost(cost)}</span></button>`;
  },
  token(icon, cls = '', badge = '') {
    return `<span class="tok-wrap ${cls}">${Art.img(icon, 'tok')}${badge ? Art.img(badge, 'badge') : ''}</span>`;
  },
  ico(icon, cls = '') { return `<span class="ico ${cls}">${Art.img(icon)}</span>`; },
  bar(v, max, cls = '') {
    const p = Math.max(0, Math.min(100, v / max * 100));
    return `<div class="bar ${cls}"><i style="width:${p}%"></i><span>${fmt(v)} / ${fmt(max)}</span></div>`;
  },
  tabs(act, cur, list) {
    return `<div class="subtabs">${list.map(([k, n, dot]) => `<button class="${cur === k ? 'on' : ''}" data-act="${act}" data-arg="${k}">${n}${dot ? '<i class="tdot"></i>' : ''}</button>`).join('')}</div>`;
  },
  // 計時進度條：data-end 讓主迴圈每秒更新
  timer(start, end) {
    return `<div class="bar timer" data-start="${start}" data-end="${end}"><i style="width:${Math.min(100, (Date.now() - start) / (end - start) * 100)}%"></i><span>${fmtTime(end - Date.now())}</span></div>`;
  },
};

// 營地成員站位：x%、地面 y%、尺寸 px
const CAMP_LAYOUT = {
  altar:      [50, 40, 58],
  study:      [83, 44, 58],
  tavern:     [17, 46, 62],
  apothecary: [68, 55, 56],
  keysmith:   [32, 56, 56],
  farm:       [88, 64, 56],
  lumber:     [12, 74, 64],
  mine:       [84, 84, 62],
  hearth:     [50, 80, 100],
  market:     [27, 97, 66],
  forge:      [66, 98, 66],
};

const Camp = {
  tab: 'base',
  canUp(id) { return !Store.bLocked(id) && Store.S.buildings[id] < Store.bMax(id) && Store.canAfford(Store.bCost(id)); },
  prodText(id, l) {
    const b = BUILDINGS[id];
    if (!b.prod) return '';
    const k = Object.keys(b.prod)[0];
    return (b.prod[k] * l * Math.pow(1.08, l - 1) * Store.prodMult()).toFixed(2);
  },
  sub(id) {
    const b = BUILDINGS[id], l = Store.S.buildings[id];
    if (b.prod) return `${UI.res(Object.keys(b.prod)[0])}+${this.prodText(id, Math.max(1, l))}/s`;
    if (id === 'keysmith' && l) { const r = Store.stashRates(); return `每小時 ${r.Y.toFixed(1)} 把黃鑰匙${r.B ? `、${r.B.toFixed(2)} 把藍鑰匙` : ''}`; }
    if (id === 'apothecary' && l) return `每小時 ${Store.stashRates().potion.toFixed(1)} 瓶藥水`;
    if (id === 'farm' && l) return `${Store.plotCount()} 塊田`;
    return b.desc;
  },
  dots() {
    const S = Store.S, now = Date.now();
    return {
      study: !S.research.cur && S.buildings.study > 0 && RESEARCH_ORDER.some(id => Store.canResearch(id)),
      exp: S.expeditions.some(e => e.end <= now),
      farm: S.farm.plots.some(p => p && p.end <= now),
    };
  },

  scene() {
    const S = Store.S, r = Store.rates();
    const spots = BUILDING_ORDER.map(id => {
      const [x, y, w] = CAMP_LAYOUT[id], b = BUILDINGS[id], l = S.buildings[id];
      const locked = Store.bLocked(id);
      const cls = [id === 'hearth' ? 'hearth' : '', locked ? 'locked' : '', !l ? 'empty' : '', this.canUp(id) ? 'can' : ''].join(' ');
      const plate = locked ? '' : `<span class="plate">${l ? `${b.name} ${l}` : '可建造'}</span>`;
      const art = id === 'hearth'
        ? '<span class="glow"></span><span class="fire"><i></i><i></i><i></i></span><span class="logs"></span>'
        : Art.img(b.npc, 'tok') + Art.img(b.tool, 'badge');
      return `<button class="spot ${cls}" data-act="bld" data-arg="${id}" data-spot="${id}" style="left:${x}%;top:${y}%;--w:${w}px">${art}${plate}</button>`;
    }).join('');
    // 篝火越高級，營地越熱鬧：燈籠、帳篷
    const deco = Array.from({ length: Math.min(8, S.buildings.hearth) }, (_, i) => {
      const x = [6, 94, 40, 60, 22, 78, 3, 97][i], y = [58, 60, 66, 66, 88, 90, 90, 94][i];
      return `<span class="lantern" style="left:${x}%;top:${y}%;animation-delay:${-i * 0.7}s"></span>`;
    }).join('');
    const v = S.visitor && VISITORS.find(x => x.id === S.visitor.id);
    const visitor = v ? `<button class="spot visitor" data-act="visitor" style="left:40%;top:72%;--w:46px">${Art.img(v.icon, 'tok')}<i class="bang">!</i><span class="plate">${v.name}</span></button>` : '';
    const st = S.stash;
    return `<section class="camp" id="campScene">
      <div class="stars"></div><span class="moon"></span>
      <svg class="hills" viewBox="0 0 400 300" preserveAspectRatio="none">
        <defs>
          <linearGradient id="h1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4b3a7c"/><stop offset="1" stop-color="#2c2456"/></linearGradient>
          <linearGradient id="h2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d6b5c"/><stop offset=".5" stop-color="#2b4a48"/><stop offset="1" stop-color="#1c2a3c"/></linearGradient>
          <radialGradient id="h3" cx="50%" cy="55%" r="60%"><stop offset="0" stop-color="#e09a6a" stop-opacity=".6"/><stop offset=".45" stop-color="#7a4a5a" stop-opacity=".2"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
        </defs>
        <path d="M0 70 C 60 30, 110 40, 160 62 S 260 20, 320 48 S 380 50, 400 40 L400 300 L0 300Z" fill="url(#h1)"/>
        <path d="M0 110 C 70 88, 140 96, 200 104 S 330 84, 400 100 L400 300 L0 300Z" fill="url(#h2)"/>
        <ellipse cx="200" cy="210" rx="230" ry="110" fill="url(#h3)"/>
      </svg>
      ${deco}${spots}${visitor}
      <div class="camp-title"><h1>燼火營地</h1><p>離線收益上限 ${Store.offlineCapHours()} 小時</p>
        <div class="rates">${['wood', 'ore', 'gold'].map(k => `<span>${UI.res(k)}${r[k].toFixed(1)}/s</span>`).join('')}</div>
        <div class="rates">${UI.ico('item/key_y', 'ri')}${Math.floor(st.Y)} ${UI.ico('item/key_b', 'ri')}${Math.floor(st.B)} ${UI.ico('item/potion_red', 'ri')}${Math.floor(st.potion)}</div></div>
    </section>`;
  },

  render() {
    const d = this.dots();
    const tabs = UI.tabs('campTab', this.tab, [['base', '設施'], ['study', '研究', d.study], ['exp', '派遣', d.exp], ['farm', '農田料理', d.farm]]);
    const body = { base: () => this.renderBase(), study: () => this.renderStudy(), exp: () => this.renderExp(), farm: () => this.renderFarm() }[this.tab]();
    return this.scene() + tabs + body;
  },
  renderBase() {
    const S = Store.S;
    const rows = BUILDING_ORDER.map(id => {
      const b = BUILDINGS[id], l = S.buildings[id], max = Store.bMax(id);
      const face = id === 'hearth' ? UI.ico('item/torch', 'portrait-ico') : UI.token(b.npc, l ? '' : 'off', b.tool);
      if (Store.bLocked(id)) return `<div class="bld-row glass locked">${face}<div class="info"><b>${b.name}</b><div class="dim">篝火 Lv${b.req} 解鎖</div></div></div>`;
      const btn = l >= max ? `<button class="btn sm" disabled>${l >= (b.max || 99) || id === 'hearth' ? '已滿級' : '需篝火'}</button>`
        : UI.costBtn('upgrade', id, Store.bCost(id), '', 'sm' + (this.canUp(id) ? ' go' : ''));
      return `<div class="bld-row glass" data-act="bld" data-arg="${id}">${face}
        <div class="info"><b>${b.name}</b><span class="lv">${l ? 'Lv' + l : '未建造'}</span><div class="dim">${this.sub(id)}</div></div>${btn}</div>`;
    }).join('');
    const v = S.visitor && VISITORS.find(x => x.id === S.visitor.id);
    return (v ? `<button class="visitor-bar glass" data-act="visitor">${UI.token(v.icon)}<span><b>${v.name}</b>來到了營地！</span><span class="gold">查看</span></button>` : '') +
      `<div class="list">${rows}</div>`;
  },

  sheet(id) {
    const S = Store.S, b = BUILDINGS[id], l = S.buildings[id], max = Store.bMax(id);
    let kv = `<span>等級</span><b>${l} / ${max}${l >= max && id !== 'hearth' && !(l >= (b.max || 99)) ? '（提升篝火可解鎖）' : ''}</b>`;
    if (b.prod) {
      const k = Object.keys(b.prod)[0];
      kv += `<span>產量</span><b>${UI.res(k)}${l ? this.prodText(id, l) : 0}/s ${l < max ? `<span class="up">→ ${this.prodText(id, l + 1)}/s</span>` : ''}</b>`;
    }
    if (id === 'hearth') kv += `<span>離線上限</span><b>${Store.offlineCapHours()} 小時 ${l < max ? '<span class="up">→ ' + (Store.offlineCapHours() + 1) + ' 小時</span>' : ''}</b>`;
    if (id === 'keysmith' || id === 'apothecary') {
      const cap = Store.stashCap(), st = S.stash;
      kv += id === 'keysmith' ? `<span>倉庫</span><b>黃 ${Math.floor(st.Y)}/${cap.Y}・藍 ${Math.floor(st.B)}/${cap.B}</b>` : `<span>倉庫</span><b>藥水 ${Math.floor(st.potion)}/${cap.potion}</b>`;
    }
    const btn = l >= max ? '<button class="btn" disabled>已達目前上限</button>' : UI.costBtn('upgrade', id, Store.bCost(id), `<span class="lbl">${l ? '升級' : '建造'}</span>`, 'go');
    const face = id === 'hearth' ? UI.ico('item/torch', 'portrait-ico big') : UI.token(b.npc, 'big', b.tool);
    const go = { study: '研究', tavern: '英雄', farm: '農田料理', altar: '祭壇' }[id];
    return `<div class="sheet-head">${face}<div><h3>${b.name}</h3><div class="dim">${b.desc}</div></div></div>
      <div class="kv">${kv}</div>${btn}${go && l ? `<button class="btn" style="margin-top:8px" data-act="campJump" data-arg="${id}">前往${go}</button>` : ''}`;
  },
  openSheet(id) { if (Store.bLocked(id)) return; FX.sfx('click'); App.openSheet(() => this.sheet(id)); },
  jump(id) {
    App.closeSheet();
    if (id === 'study') { this.tab = 'study'; App.go('camp'); }
    if (id === 'farm') { this.tab = 'farm'; App.go('camp'); }
    if (id === 'tavern') App.go('heroes');
    if (id === 'altar') App.go('altar');
  },
  upgrade(id) {
    if (Store.S.buildings[id] >= Store.bMax(id)) return;
    if (!Store.pay(Store.bCost(id))) return FX.toast('資源不足', 'bad');
    Store.S.buildings[id]++;
    FX.sfx('upgrade');
    FX.toast(`${BUILDINGS[id].name} 提升至 Lv${Store.S.buildings[id]}`);
    App.commit();
    const el = document.querySelector(`[data-spot="${id}"]`);
    if (el) FX.anim(el, 'pop-in', 400);
  },

  // ---------- 研究 ----------
  renderStudy() {
    const S = Store.S, cur = S.research.cur;
    if (!S.buildings.study) return `<div class="glass pad center"><p>建造<b>研究院</b>後就能研究新技術。</p><p class="dim">研究可以解鎖塔裡的新道具、提升產量、增加派遣隊伍等等。</p></div>`;
    const branches = [...new Set(RESEARCH_ORDER.map(id => RESEARCH[id].branch))];
    const now = Date.now();
    return (cur ? `<div class="glass pad research-cur">${UI.ico(RESEARCH[cur.id].icon)}<div><b>研究中：${RESEARCH[cur.id].name}</b>${UI.timer(cur.end - Store.researchMins(cur.id) * 60000, cur.end)}</div></div>` : '') +
      branches.map(br => `<h2 class="sec">${br}</h2><div class="list">` + RESEARCH_ORDER.filter(id => RESEARCH[id].branch === br).map(id => {
        const r = RESEARCH[id], done = Store.has(id), active = cur && cur.id === id;
        let btn;
        if (done) btn = '<span class="done-tag">✓ 完成</span>';
        else if (active) btn = '<span class="dim">研究中</span>';
        else if (S.buildings.study < r.study) btn = `<button class="btn sm" disabled>研究院 Lv${r.study}</button>`;
        else if (r.need && !Store.has(r.need)) btn = `<button class="btn sm" disabled>需先完成${RESEARCH[r.need].name}</button>`;
        else if (cur) btn = '<button class="btn sm" disabled>一次只能研究一項</button>';
        else btn = UI.costBtn('research', id, r.cost, `<span class="lbl">${Math.round(Store.researchMins(id))} 分鐘</span>`, 'sm');
        return `<div class="bld-row glass ${done ? 'done' : ''}">${UI.ico(r.icon, 'portrait-ico')}<div class="info"><b>${r.name}</b><div class="dim wrap">${r.desc}</div></div>${btn}</div>`;
      }).join('') + '</div>').join('');
  },
  research(id) {
    if (!Store.startResearch(id)) return FX.toast('資源不足或條件未達成', 'bad');
    FX.sfx('upgrade'); FX.toast(`開始研究：${RESEARCH[id].name}`); App.commit();
  },

  // ---------- 派遣 ----------
  expPick: { id: null, hero: null },
  renderExp() {
    const S = Store.S, slots = Store.expSlots(), now = Date.now();
    if (!slots) return `<div class="glass pad center"><p>建造<b>酒館</b>後，沒有出征的英雄可以派去探索。</p></div>`;
    const active = S.expeditions.map((e, i) => {
      const x = EXPEDITIONS[e.id], done = e.end <= now;
      return `<div class="bld-row glass">${UI.token(HEROES[e.hero].icon, '', x.icon)}<div class="info"><b>${x.name}</b><span class="lv">${e.hours} 小時</span>
        ${done ? '<div class="gold">探索完成！</div>' : UI.timer(e.end - e.hours * 3600000, e.end)}</div>
        ${done ? `<button class="btn sm primary" data-act="expCollect" data-arg="${i}">收成</button>` : ''}</div>`;
    }).join('');
    const reachZone = Math.floor(Math.max(0, S.stats.bestFloor - 1) / 10);
    const free = HERO_ORDER.filter(h => S.heroes[h].owned && h !== S.active && !S.expeditions.some(e => e.hero === h));
    const sel = this.expPick;
    const places = Object.keys(EXPEDITIONS).map(id => {
      const x = EXPEDITIONS[id], ok = x.zone <= reachZone;
      return `<button class="pick ${sel.id === id ? 'on' : ''}" ${ok ? `data-act="expPlace" data-arg="${id}"` : 'disabled'}>${UI.ico(x.icon)}<b>${x.name}</b><small>${ok ? x.desc : `主塔抵達第 ${x.zone * 10 + 1} 層解鎖`}</small></button>`;
    }).join('');
    const heroes = free.length ? free.map(h => `<button class="pick hero ${sel.hero === h ? 'on' : ''}" data-act="expHero" data-arg="${h}">${UI.token(HEROES[h].icon)}<b>${HEROES[h].name}</b><small>Lv ${S.heroes[h].lvl}</small></button>`).join('')
      : '<p class="dim">沒有閒置的英雄（出征中的英雄不能派遣，招募更多英雄吧）</p>';
    const can = S.expeditions.length < slots && sel.id && sel.hero && free.includes(sel.hero);
    return `<p class="dim">隊伍 ${S.expeditions.length} / ${slots}。英雄等級越高、時間越長，帶回的越多；也會獲得經驗。</p>${active ? `<div class="list">${active}</div>` : ''}
      ${S.expeditions.length < slots ? `<h2 class="sec">選擇地點</h2><div class="picks">${places}</div><h2 class="sec">選擇英雄</h2><div class="picks">${heroes}</div>
        <div class="row" style="margin-top:12px">${(sel.id ? EXPEDITIONS[sel.id].hours : [1, 4, 8]).map(h => `<button class="btn ${can ? 'primary' : ''}" ${can ? '' : 'disabled'} data-act="expSend" data-arg="${h}">出發 ${h} 小時</button>`).join('')}</div>` : ''}`;
  },
  expSend(h) {
    const sel = this.expPick;
    if (!Store.sendExpedition(sel.id, sel.hero, +h)) return FX.toast('無法派遣', 'bad');
    FX.sfx('upgrade'); FX.toast(`${HEROES[sel.hero].name} 出發前往${EXPEDITIONS[sel.id].name}`);
    this.expPick = { id: null, hero: null }; App.commit();
  },
  expCollect(i) {
    const r = Store.collectExpedition(+i);
    if (!r) return;
    const extra = { potion: '1 瓶藥水', keyY: '1 把黃鑰匙', keyB: '1 把藍鑰匙', seed: '1 顆星莓種子', ember: '1 餘燼' }[r.extra];
    FX.sfx('coin');
    FX.modal(`<div class="center">${UI.token(HEROES[r.hero].icon, 'big')}<h3>探索歸來</h3><div class="loot">${Object.keys(r.got).filter(k => r.got[k] >= 1).map(k => `<span>${UI.res(k)}+${fmt(r.got[k])}</span>`).join('')}</div>${extra ? `<p class="gold">額外帶回：${extra}</p>` : ''}</div>`);
    App.commit();
  },

  // ---------- 農田與料理 ----------
  renderFarm() {
    const S = Store.S, n = Store.plotCount(), now = Date.now(), p = S.farm.pantry;
    if (!n) return `<div class="glass pad center"><p>建造<b>農田</b>後就能種植作物、做料理。</p><p class="dim">料理可以在進塔前吃，獲得當次爬塔的加成。</p></div>`;
    const plots = Array.from({ length: n }, (_, i) => {
      const pl = S.farm.plots[i];
      if (!pl) return `<button class="plot empty" data-act="plotMenu" data-arg="${i}"><span class="dirt"></span><b>空地</b><small>點一下種植</small></button>`;
      const c = CROPS[pl.crop], ready = pl.end <= now;
      return `<button class="plot ${ready ? 'ready' : ''}" ${ready ? `data-act="harvest" data-arg="${i}"` : ''}><span class="dirt"></span>${UI.ico(c.icon)}<b>${c.name}</b>${ready ? '<small class="gold">可以收成！</small>' : UI.timer(pl.end - Store.cropMins(pl.crop) * 60000, pl.end)}</button>`;
    }).join('');
    const pantry = Object.keys(CROPS).map(k => `<span>${UI.ico(CROPS[k].icon, 'ri')}${CROPS[k].name} ${p[k]}</span>`).join('') + `<span>星莓種子 ${p.seed}</span>`;
    const dishes = Object.keys(DISHES).map(id => {
      const d = DISHES[id], locked = d.pro && !Store.has('kitchen');
      const ok = !locked && Object.keys(d.need).every(k => p[k] >= d.need[k]);
      const need = Object.keys(d.need).map(k => `${CROPS[k].name}×${d.need[k]}`).join('、');
      return `<div class="bld-row glass">${UI.ico(d.icon, 'portrait-ico')}<div class="info"><b>${d.name}</b><span class="lv">擁有 ${S.farm.dishes[id] || 0}</span><div class="dim wrap">${d.desc}・${need}</div></div>
        ${locked ? '<button class="btn sm" disabled>需要烹飪學</button>' : `<button class="btn sm ${ok ? 'primary' : ''}" ${ok ? '' : 'disabled'} data-act="cook" data-arg="${id}">烹飪</button>`}</div>`;
    }).join('');
    return `<h2 class="sec">農田 <small>${n} 塊</small></h2><div class="plots">${plots}</div>
      <div class="pantry glass">${pantry}</div>
      <h2 class="sec">廚房 <small>做好的料理在「爬塔」頁選擇要吃哪一道</small></h2><div class="list">${dishes}</div>`;
  },
  plotMenu(i) {
    const p = Store.S.farm.pantry;
    App.openSheet(() => `<h3>種什麼？</h3><div class="col">${Object.keys(CROPS).map(k => {
      const c = CROPS[k], noSeed = c.seed && p.seed <= 0;
      return noSeed ? `<button class="btn" disabled>${UI.ico(c.icon, 'ri')}${c.name}（需要種子）</button>`
        : UI.costBtn('plant', i + ':' + k, c.cost, `<span class="lbl">${UI.ico(c.icon, 'ri')}${c.name}・${Math.round(Store.cropMins(k))} 分鐘・收成 ${c.yield}${c.seed ? '・用 1 顆種子' : ''}</span>`);
    }).join('')}</div>`);
  },
  plant(arg) {
    const [i, k] = arg.split(':');
    if (!Store.plant(+i, k)) return FX.toast('資源或種子不足', 'bad');
    App.closeSheet(); FX.sfx('click'); App.commit();
  },
  harvest(i) { const n = Store.harvest(+i); if (n) { FX.sfx('coin'); FX.toast(`收成 ${n} 份`); App.commit(); } },
  cook(id) { if (!Store.cook(id)) return FX.toast('材料不足', 'bad'); FX.sfx('upgrade'); FX.toast(`做好了 ${DISHES[id].name}`); App.commit(); App.checkAch(); },

  // ---------- 訪客 ----------
  async visitor() {
    const S = Store.S, v = S.visitor && VISITORS.find(x => x.id === S.visitor.id);
    if (!v) return;
    const idx = await FX.modal(`<div class="center">${UI.token(v.icon, 'big')}<h3>${v.name}</h3><p>${v.text}</p></div>`,
      v.opts.map((o, i) => ({ label: o.t, value: i, cls: i === 0 ? 'primary' : '' })), { cls: 'vertical' });
    const o = v.opts[idx];
    if (o.give) {
      const g = o.give;
      if (g.potion && S.stash.potion < g.potion) return FX.toast('倉庫裡沒有藥水', 'bad');
      const res = { ...g }; delete res.potion;
      if (!Store.canAfford(res)) return FX.toast('資源不足', 'bad');
      Store.pay(res);
      if (g.potion) S.stash.potion -= g.potion;
    }
    const got = o.get || {};
    if (got.gamble) { if (Math.random() < 0.5) { S.res.gold += got.gamble; FX.toast(`賭贏了！獲得 ${got.gamble} 金幣`, 'gold'); } else FX.toast('賭輸了……', 'bad'); }
    if (got.buff === 'bard') S.buffs.bard = Store.today();
    if (got.keyY) S.stash.Y += got.keyY;
    if (got.seed) S.farm.pantry.seed += got.seed;
    const res = {}; for (const k of ['wood', 'ore', 'gold', 'soul', 'ember']) if (got[k]) res[k] = got[k];
    Store.gain(res);
    if (Object.keys(res).length) FX.toast('獲得 ' + Object.keys(res).map(k => `${RES[k].name} ${res[k]}`).join('、'));
    S.visitor = null;
    FX.sfx('coin'); App.commit();
  },

  // 有產量的建築偶爾冒出收益數字，營造放置感
  popTick() {
    const scene = document.getElementById('campScene');
    if (!scene || document.hidden) return;
    const ids = ['lumber', 'mine', 'market'].filter(id => Store.S.buildings[id]);
    if (!ids.length || Math.random() < .4) return;
    const id = pick(ids), k = Object.keys(BUILDINGS[id].prod)[0];
    const [x, y, w] = CAMP_LAYOUT[id];
    const d = document.createElement('div');
    d.className = 'pop';
    d.innerHTML = `${UI.res(k)}+${(Store.rates()[k] * 3).toFixed(1)}`;
    d.style.left = x + '%';
    d.style.top = `calc(${y}% - ${w + 10}px)`;
    scene.appendChild(d);
    setTimeout(() => d.remove(), 1700);
  },
};

const Heroes = {
  render() {
    const S = Store.S;
    return '<div class="list">' + HERO_ORDER.map(hid => {
      const d = HEROES[hid], h = S.heroes[hid], st = Store.heroStats(hid);
      const active = S.active === hid, away = S.expeditions.some(e => e.hero === hid);
      const aw = h.awaken ? `<span class="awk">${'✦'.repeat(h.awaken)}</span>` : '';
      const kit = `<div class="kit"><div><b>被動</b>${h.awaken >= 1 ? d.passive2 : d.passive}</div><div><b>${d.skill.name}</b>${d.skill.desc}（每層 ${d.skill.uses + (h.branch === 'A' ? 1 : 0)} 次）${h.branch ? `<span class="gold">・${d.branch[h.branch]}</span>` : ''}</div></div>`;
      if (!h.owned) {
        const need = S.buildings.tavern < d.tavern;
        return `<div class="card hero-card"><div class="hero-top">${UI.token(d.icon, 'big off')}<div class="card-body">
          <div class="card-head"><b>${d.name}</b></div><div class="dim">${d.lore}</div></div></div>${kit}
          ${need ? `<button class="btn" disabled>需要酒館 Lv${d.tavern}</button>` : UI.costBtn('recruit', hid, d.cost, '<span class="lbl">招募</span>', 'go')}</div>`;
      }
      const gm = Store.gearMax();
      const gear = ['weapon', 'armor'].map(slot => {
        const l = h[slot], nm = slot === 'weapon' ? '武器（攻擊 +2）' : '護甲（防禦 +2）';
        const btn = l >= gm ? `<button class="btn sm" disabled>${gm ? '已達上限' : '需鐵匠鋪'}</button>` : UI.costBtn('gear', hid + ':' + slot, Store.gearCost(slot, l), '', 'sm');
        return `<div class="gear-row"><span>${nm} <b>+${l}</b></span>${btn}</div>`;
      }).join('');
      return `<div class="card hero-card ${active ? 'active' : ''}"><div class="hero-top">${UI.token(d.icon, 'big')}<div class="card-body">
        <div class="card-head"><b>${d.name}${aw}</b><span class="lv">Lv ${h.lvl}</span></div>
        ${UI.bar(h.xp, Store.xpNeed(h.lvl), 'xp')}
        <div class="stats"><span>攻擊<b>${st.atk}</b></span><span>防禦<b>${st.def}</b></span><span>生命<b>${st.hp}</b></span></div></div></div>
        ${kit}${gear}
        ${away ? '<button class="btn" disabled>派遣中</button>' : active ? '<button class="btn" disabled>✓ 目前的英雄</button>' : `<button class="btn primary" data-act="setActive" data-arg="${hid}">設為出征英雄</button>`}</div>`;
    }).join('') + '</div>';
  },
  recruit(hid) {
    if (!Store.pay(HEROES[hid].cost)) return FX.toast('資源不足', 'bad');
    Store.S.heroes[hid].owned = true;
    FX.sfx('win'); FX.toast(`${HEROES[hid].name} 加入了營地！`);
    App.commit(); App.checkAch();
  },
  gear(arg) {
    const [hid, slot] = arg.split(':'), h = Store.S.heroes[hid];
    if (h[slot] >= Store.gearMax()) return;
    if (!Store.pay(Store.gearCost(slot, h[slot]))) return FX.toast('資源不足', 'bad');
    h[slot]++; FX.sfx('upgrade'); App.commit();
  },
  setActive(hid) {
    if (Store.S.expeditions.some(e => e.hero === hid)) return FX.toast('這位英雄正在派遣中', 'bad');
    Store.S.active = hid; FX.sfx('click'); App.commit();
  },
};

const Altar = {
  tab: 'tree',
  render() {
    const S = Store.S;
    const head = `<div class="altar-head">${UI.token(BUILDINGS.altar.npc, 'huge')}<h1>魂之祭壇</h1>`;
    if (!S.buildings.altar) return head + `<p class="dim">在營地建造魂之祭壇後，可以學習天賦、每日祈福、讓英雄覺醒、銘刻寶物記憶。</p></div>`;
    const prayed = S.prayer && S.prayer.date === Store.today();
    const tabs = UI.tabs('altarTab', this.tab, [['tree', '天賦樹'], ['pray', '祈福', !prayed], ['awaken', '覺醒'], ['memory', '記憶']]);
    return head + `<p class="dim">祭壇 Lv${S.buildings.altar}・天賦等級上限 ${S.buildings.altar}</p></div>` + tabs + this['r_' + this.tab]();
  },
  r_tree() {
    const S = Store.S;
    return '<div class="tree">' + Object.keys(TALENT_TREE).map(b => {
      const br = TALENT_TREE[b];
      return `<div class="branch" style="--c:${br.color}"><h3>${br.name}</h3>` + br.nodes.map((id, i) => {
        const t = TALENTS[id], r = S.talents[id], cap = Store.talentCap(id), open = Store.talentUnlocked(id);
        let btn;
        if (!open) btn = '<button class="btn sm" disabled>先學上一個</button>';
        else if (t.altar && S.buildings.altar < t.altar) btn = `<button class="btn sm" disabled>祭壇 Lv${t.altar}</button>`;
        else if (r >= t.max) btn = '<button class="btn sm" disabled>已精通</button>';
        else if (r >= cap) btn = '<button class="btn sm" disabled>需提升祭壇</button>';
        else btn = UI.costBtn('talent', id, Store.talentCost(id), '', 'sm');
        const pips = Array.from({ length: t.max }, (_, k) => `<i class="${k < r ? 'on' : ''}"></i>`).join('');
        return `${i ? '<div class="link"></div>' : ''}<div class="tnode glass ${r ? 'on' : ''} ${open ? '' : 'lock'}">${UI.ico(t.icon)}<b>${t.name}</b><span class="dim">${t.desc}</span><span class="rank">${pips}</span>${btn}</div>`;
      }).join('') + '</div>';
    }).join('') + '</div>';
  },
  talent(id) {
    const S = Store.S;
    if (!Store.talentUnlocked(id) || S.talents[id] >= Store.talentCap(id)) return;
    if (!Store.pay(Store.talentCost(id))) return FX.toast('材料不足', 'bad');
    S.talents[id]++;
    if (id === 'vigor' && S.tower.main) S.tower.main.hp += 100;
    FX.sfx('upgrade'); App.commit();
  },
  prayerChoices() {
    const R = Tower.rng(Tower.hash('pray-' + Store.today() + Store.playerId()));
    return R.shuffle(PRAYERS.slice()).slice(0, 3);
  },
  r_pray() {
    const S = Store.S, p = S.prayer && S.prayer.date === Store.today() ? PRAYERS.find(x => x.id === S.prayer.id) : null;
    if (p) return `<div class="glass pad center"><h3>今天的祝福：${p.name}</h3><p>${p.desc}</p><p class="dim">明天可以再祈福一次。</p></div>`;
    return `<p class="dim center">每天可以祈福一次，從三個祝福中選一個，效果到今天結束。</p><div class="picks">` +
      this.prayerChoices().map(x => `<button class="pick" data-act="pray" data-arg="${x.id}"><b>${x.name}</b><small>${x.desc}</small></button>`).join('') + '</div>';
  },
  pray(id) {
    const S = Store.S;
    if (S.prayer && S.prayer.date === Store.today()) return;
    S.prayer = { date: Store.today(), id };
    if (id === 'gift') { S.stash.potion += 2; S.stash.Y += 2; }
    FX.sfx('win'); FX.toast(`獲得祝福：${PRAYERS.find(x => x.id === id).name}`, 'gold'); App.commit();
  },
  r_awaken() {
    const S = Store.S;
    return '<p class="dim center">用餘燼喚醒英雄的潛力：覺醒 1 強化被動、覺醒 2 選擇技能分支、覺醒 3 全屬性 +10%。</p><div class="list">' + HERO_ORDER.filter(h => S.heroes[h].owned).map(hid => {
      const d = HEROES[hid], h = S.heroes[hid], lv = h.awaken;
      let act;
      if (lv >= 3) act = '<span class="done-tag">✦✦✦ 完全覺醒</span>';
      else if (lv === 1) act = `<div class="col">${['A', 'B'].map(b => UI.costBtn('awaken', hid + ':' + b, { ember: AWAKEN_COST[1] }, `<span class="lbl">分支 ${b}：${d.branch[b]}</span>`, 'sm')).join('')}</div>`;
      else act = UI.costBtn('awaken', hid + ':', { ember: AWAKEN_COST[lv] }, `<span class="lbl">覺醒 ${lv + 1}：${lv === 0 ? d.passive2 : '全屬性 +10%'}</span>`, 'sm');
      return `<div class="card hero-card"><div class="hero-top">${UI.token(d.icon)}<div class="card-body"><div class="card-head"><b>${d.name}</b><span class="awk">${'✦'.repeat(lv) || '未覺醒'}</span></div>
        ${h.branch ? `<div class="dim">分支 ${h.branch}：${d.branch[h.branch]}</div>` : ''}</div></div>${act}</div>`;
    }).join('') + '</div>';
  },
  awaken(arg) {
    const [hid, b] = arg.split(':'), h = Store.S.heroes[hid];
    if (h.awaken >= 3) return;
    if (!Store.pay({ ember: AWAKEN_COST[h.awaken] })) return FX.toast('餘燼不足', 'bad');
    if (h.awaken === 1) h.branch = b || 'A';
    h.awaken++;
    FX.sfx('win'); FX.toast(`${HEROES[hid].name} 覺醒到 ${h.awaken} 階！`, 'gold'); App.commit();
  },
  r_memory() {
    const S = Store.S, m = S.memory, slots = Store.memorySlots();
    const ids = Object.keys(TREASURES).filter(k => m.seen[k]);
    if (!ids.length) return '<div class="glass pad center"><p>在塔裡開寶箱拿到的寶物會被記錄在這裡。</p><p class="dim">銘刻後可以裝備，讓每日挑戰塔一開始就帶著它。</p></div>';
    return `<p class="dim center">銘刻過的寶物可以裝備 ${slots} 件，每日挑戰塔開局就帶著（研究「銘刻術」可以多一格）。</p><div class="list">` + ids.map(id => {
      const t = TREASURES[id], ins = m.inscribed[id], eq = m.equipped.includes(id);
      const btn = !ins ? UI.costBtn('inscribe', id, Store.inscribeCost(id), '<span class="lbl">銘刻</span>', 'sm')
        : `<button class="btn sm ${eq ? 'primary' : ''}" data-act="equipMem" data-arg="${id}">${eq ? '已裝備' : '裝備'}</button>`;
      return `<div class="bld-row glass">${UI.ico(t.icon, 'portrait-ico')}<div class="info"><b style="color:${RARITY[t.r].color}">${t.name}</b><div class="dim wrap">${t.desc}</div></div>${btn}</div>`;
    }).join('') + '</div>';
  },
  inscribe(id) {
    if (!Store.pay(Store.inscribeCost(id))) return FX.toast('魂晶不足', 'bad');
    Store.S.memory.inscribed[id] = 1; FX.sfx('upgrade'); App.commit();
  },
  equipMem(id) {
    const m = Store.S.memory, i = m.equipped.indexOf(id);
    if (i >= 0) m.equipped.splice(i, 1);
    else { if (m.equipped.length >= Store.memorySlots()) m.equipped.shift(); m.equipped.push(id); }
    FX.sfx('click'); App.commit();
  },
};

const More = {
  tab: 'ach',
  render() {
    const dot = Store.newAchievements().length > 0;
    const tabs = UI.tabs('moreTab', this.tab, [['ach', '成就', dot], ['codex', '圖鑑'], ['set', '設定']]);
    return tabs + this['r_' + this.tab]();
  },
  r_ach() {
    const S = Store.S;
    const ach = ACHIEVEMENTS.map(a => {
      const done = a.test(S), claimed = S.ach[a.id];
      const rw = Object.keys(a.reward).map(k => UI.res(k) + a.reward[k]).join(' ');
      return `<div class="ach ${claimed ? 'claimed' : done ? 'ready' : ''}">${UI.ico('icon/chest')}
        <div><b>${a.name}</b>${a.title ? `<span class="ttl">稱號「${a.title}」</span>` : ''}<div class="dim">${a.desc}</div></div>
        ${claimed ? '<span class="dim">已領取</span>' : done ? `<button class="btn sm primary" data-act="claim" data-arg="${a.id}">領取 ${rw}</button>` : `<span class="dim">${rw}</span>`}</div>`;
    }).join('');
    const titles = Store.titles(), st = S.stats;
    return `${titles.length ? `<h2 class="sec">稱號</h2><div class="row">${titles.map(t => `<button class="chipbtn ${S.title === t ? 'on' : ''}" data-act="setTitle" data-arg="${t}"><b>${t}</b></button>`).join('')}</div>` : ''}
      <h2 class="sec">紀錄</h2><div class="glass pad stats-grid">
        <span>主塔最高<b>${st.bestFloor} 層</b></span><span>挑戰塔最高<b>${st.bestDaily} 層</b></span>
        <span>星星<b>${st.stars}</b></span><span>通關次數<b>${st.clears}</b></span>
        <span>累計擊殺<b>${st.kills}</b></span><span>首領擊殺<b>${st.bossKills}</b></span></div>
      <h2 class="sec">成就</h2><div class="glass pad">${ach}</div>`;
  },
  r_codex() {
    const S = Store.S, all = new Set();
    ZONES.forEach(z => { z.mobs.forEach(k => all.add(k)); all.add(z.elite); all.add(z.boss); });
    const n = [...all].filter(k => S.codex[k]).length;
    return `<p class="dim center">已登錄 ${n} / ${all.size} 種怪物。打倒一次就會登錄。</p>` + ZONES.map(z => {
      const keys = [...z.mobs, z.elite, z.boss];
      return `<h2 class="sec">${z.name}</h2><div class="codex">${keys.map((k, i) => {
        const seen = S.codex[k], fx = i < 9 ? z.fx[i] : i === 9 ? z.eliteFx : z.bossFx;
        return `<div class="cx ${seen ? '' : 'unk'}">${UI.token('mon/' + k)}<b>${seen ? MON_NAMES[k] : '？？？'}</b><small>${seen ? `${fx ? MON_FX[fx].name + '・' : ''}${MON_FAMILY[k] ? FAMILY[MON_FAMILY[k]] : ''}${i === 9 ? '・精英' : i === 10 ? '・首領' : ''}<br>擊敗 ${seen}` : ''}</small></div>`;
      }).join('')}</div>`;
    }).join('');
  },
  setTitle(t) { Store.S.title = Store.S.title === t ? null : t; App.commit(); },
  r_set() {
    const S = Store.S;
    const syncTxt = { off: '未設定', idle: '待命', syncing: '同步中…', ok: '已同步', error: '同步失敗', offline: '離線中' }[Sync.status];
    return `<h2 class="sec">雲端同步</h2><div class="glass pad form">
        <label>狀態：<b class="sync-${Sync.status}">${syncTxt}</b>${Sync.lastSync ? `<span class="dim">（${new Date(Sync.lastSync).toLocaleTimeString()}）</span>` : ''}</label>
        <label>GAS 網址<input id="gasUrl" placeholder="https://script.google.com/macros/s/.../exec" value="${Sync.url()}"></label>
        <div class="row"><button class="btn" data-act="saveUrl">儲存網址</button><button class="btn primary" data-act="syncNow">立即同步</button><button class="btn" data-act="loadLevels">下載自訂關卡</button></div>
        <label>你的同步碼（換手機時輸入，請勿外流）<input readonly value="${Store.playerId()}" onclick="this.select()"></label>
        <div class="row"><button class="btn" data-act="copyId">複製同步碼</button><button class="btn" data-act="restore">用同步碼還原</button></div>
        <p class="dim">自訂關卡：${Levels.list().length} 個（在 Google 試算表的 levels 工作表編輯）</p>
      </div>
      <h2 class="sec">設定</h2><div class="glass pad form">
        <div class="row"><button class="btn" data-act="toggleSfx">音效：${S.settings.sfx ? '開' : '關'}</button>
        <button class="btn" data-act="exportSave">匯出存檔</button><button class="btn" data-act="importSave">匯入存檔</button></div>
        <button class="btn danger" data-act="resetSave">重置所有進度</button>
      </div>
      <p class="credits"><a href="guide.html" target="_blank">📖 完整玩法說明</a><br><br>燼火營地 v${CONFIG.VERSION}<br>美術：Justin Nichol（CC-BY 4.0）、CraftPix（免費授權／OGA-BY）、LudicArts（CC-BY 3.0）、drummyfish（CC0）、bevouliin（CC-BY 4.0）。<a href="CREDITS.md" target="_blank">完整出處</a></p>`;
  },
  claim(id) {
    const a = ACHIEVEMENTS.find(x => x.id === id);
    if (!a || Store.S.ach[id] || !a.test(Store.S)) return;
    Store.S.ach[id] = true; Store.gain(a.reward); FX.sfx('coin');
    if (a.title && !Store.S.title) Store.S.title = a.title;
    FX.toast(`成就「${a.name}」獎勵已領取${a.title ? `，獲得稱號「${a.title}」` : ''}`); App.commit();
  },
  saveUrl() {
    const u = document.getElementById('gasUrl').value.trim();
    if (u && !/^https:\/\/script\.google(usercontent)?\.com\//.test(u)) return FX.toast('網址格式看起來不對', 'bad');
    Sync.setUrl(u); FX.toast(u ? '已儲存，開始同步' : '已關閉雲端同步');
    if (u) More.syncNow(); else App.render();
  },
  async syncNow() {
    if (!Sync.enabled()) return FX.toast('請先填入 GAS 網址', 'bad');
    App.render();
    let r = await Sync.pull();
    if (r === 'pulled') { FX.toast('已載入雲端較新的存檔'); App.reload(); return; }
    r = await Sync.push();
    FX.toast({ saved: '已上傳至雲端', replaced: '雲端存檔較新，已載入', offline: '目前離線，稍後自動同步', error: '同步失敗，請檢查網址與部署權限' }[r] || r, r === 'error' ? 'bad' : '');
    if (r === 'replaced') App.reload(); else App.render();
  },
  async loadLevels() {
    const r = await Levels.fetch();
    FX.toast(r >= 0 ? `下載了 ${r} 個自訂關卡` : '下載失敗（請先設定 GAS 網址並重新部署最新版 Code.gs）', r >= 0 ? '' : 'bad');
    App.render();
  },
  async copyId() {
    try { await navigator.clipboard.writeText(Store.playerId()); FX.toast('已複製同步碼'); } catch (e) { FX.toast('複製失敗，請手動選取', 'bad'); }
  },
  async restore() {
    if (!Sync.enabled()) return FX.toast('請先填入 GAS 網址', 'bad');
    const ok = await FX.modal(`<h3>用同步碼還原</h3><p class="dim">輸入另一台裝置的同步碼。本機目前的進度會被雲端存檔覆蓋。</p>
      <input id="restoreId" placeholder="xxxxxxxx-xxxx-...">`, [{ label: '取消', value: false }, { label: '還原', value: true, cls: 'primary' }]);
    if (!ok) return;
    const id = (document.getElementById('restoreId') || {}).value;
    if (!id || id.trim().length < 16) return FX.toast('同步碼格式錯誤', 'bad');
    const old = Store.playerId();
    Store.setPlayerId(id.trim());
    const r = await Sync.pull(true);
    if (r === 'pulled') { FX.toast('還原成功！'); App.reload(); }
    else { Store.setPlayerId(old); FX.toast(r === 'empty' ? '雲端找不到這個同步碼' : '還原失敗', 'bad'); }
  },
  toggleSfx() { Store.S.settings.sfx = !Store.S.settings.sfx; App.commit(); },
  exportSave() {
    const blob = new Blob([JSON.stringify(Store.S)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'emberhold-save.json'; a.click();
  },
  importSave() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = async () => {
      try {
        const s = JSON.parse(await inp.files[0].text());
        if (!s.res || !s.buildings) throw 0;
        s.updatedAt = Date.now(); Store.replace(s); FX.toast('匯入成功'); App.reload();
      } catch (e) { FX.toast('檔案格式錯誤', 'bad'); }
    };
    inp.click();
  },
  async resetSave() {
    const ok = await FX.modal('<h3>重置所有進度？</h3><p>營地、英雄、天賦全部歸零，且無法復原。</p>',
      [{ label: '取消', value: false }, { label: '確定重置', value: true, cls: 'danger' }]);
    if (!ok) return;
    const s = Store.fresh(); s.updatedAt = Date.now();
    Store.replace(s); App.reload();
  },
};
