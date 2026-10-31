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

// 營地版面：篝火在上方，其他設施依用途排成四欄（信仰與知識、英雄與夥伴、補給、生產）
const CAMP_GRID = ['altar', 'study', 'observatory', 'rune', 'tavern', 'training', 'nest', 'forge', 'keysmith', 'apothecary', 'farm', 'vault', 'lumber', 'mine', 'market'];

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
    const S = Store.S, r = Store.rates(), st = S.stash, hl = S.buildings.hearth;
    const plot = id => {
      const b = BUILDINGS[id], l = S.buildings[id], locked = Store.bLocked(id);
      const cls = [locked ? 'locked' : '', !l ? 'empty' : '', this.canUp(id) ? 'can' : ''].join(' ');
      const plate = locked ? `<span class="plate">篝火 ${b.req}</span>` : `<span class="plate">${b.name}${l ? ` <b>${l}</b>` : ''}</span>`;
      const dot = this.plotDot(id) ? '<i class="bang">!</i>' : '';
      return `<button class="cplot ${cls}" data-act="bld" data-arg="${id}" data-spot="${id}" data-tip="${b.name}：${b.desc}"><span class="pad"></span>${Art.img(b.npc, 'tok')}${Art.img(b.tool, 'badge')}${dot}${plate}</button>`;
    };
    const v = S.visitor && VISITORS.find(x => x.id === S.visitor.id);
    const visitor = v ? `<button class="cplot visitor" data-act="visitor"><span class="pad"></span>${Art.img(v.icon, 'tok')}<i class="bang">!</i><span class="plate">${v.name}</span></button>` : '';
    const lanterns = Array.from({ length: Math.min(10, hl * 2) }, (_, i) => `<i style="left:${5 + i * 10}%;animation-delay:${-i * 0.6}s"></i>`).join('');
    return `<section class="camp v2" id="campScene">
      <div class="stars"></div><span class="moon"></span>
      <div class="camp-top">
        <div class="camp-title"><h1>燼火營地</h1><p>離線收益上限 ${Store.offlineCapHours()} 小時</p>
          <div class="rates">${['wood', 'ore', 'gold'].map(k => `<span>${UI.res(k)}${r[k] < 10 ? r[k].toFixed(1) : fmt(r[k])}/s</span>`).join('')}</div>
          <div class="rates stash" data-tip="營地倉庫：鑰匙工坊與藥師小屋做好的東西，進主塔時會自動帶上。">${UI.ico('item/key_y', 'ri')}${Math.floor(st.Y)} ${UI.ico('item/key_b', 'ri')}${Math.floor(st.B)} ${UI.ico('item/potion_red', 'ri')}${Math.floor(st.potion)}</div></div>
        <button class="hearth-big ${this.canUp('hearth') ? 'can' : ''}" data-act="bld" data-arg="hearth" data-spot="hearth" data-tip="篝火：${BUILDINGS.hearth.desc}">
          <span class="glow"></span><span class="fire"><i></i><i></i><i></i></span><span class="logs"></span><span class="plate">篝火 <b>${hl}</b></span></button>
      </div>
      <div class="lantern-line">${lanterns}</div>
      <div class="camp-grid">${CAMP_GRID.map(plot).join('')}${visitor}</div>
    </section>`;
  },
  // 設施上的驚嘆號：有東西可以收或可以做
  plotDot(id) {
    const S = Store.S, d = this.dots();
    if (id === 'study') return d.study;
    if (id === 'tavern') return d.exp;
    if (id === 'farm') return d.farm;
    if (id === 'observatory') return Store.quests().some(q => !q.claimed && q.have >= q.need);
    if (id === 'nest') return S.pets.eggs > 0;
    if (id === 'training') return S.buildings.training > 0 && (S.training || []).length < Store.trainSlots() && HERO_ORDER.some(h => S.heroes[h].owned && h !== S.active && !(S.training || []).includes(h));
    return false;
  },

  render() {
    const d = this.dots();
    const qd = Store.quests().some(q => !q.claimed && q.have >= q.need);
    const tabs = UI.tabs('campTab', this.tab, [['base', '設施'], ['study', '研究', d.study], ['exp', '派遣', d.exp], ['farm', '農田', d.farm], ['quest', '任務', qd], ['train', '訓練']]);
    const body = { base: () => this.renderBase(), study: () => this.renderStudy(), exp: () => this.renderExp(), farm: () => this.renderFarm(), quest: () => this.renderQuest(), train: () => this.renderTrain() }[this.tab]();
    return this.scene() + tabs + body;
  },
  // ---------- 每日任務 ----------
  renderQuest() {
    const S = Store.S;
    if (!S.buildings.observatory) return `<div class="glass pad center"><p>建造<b>星象台</b>後，每天都會發布任務。</p><p class="dim">完成任務可以拿魂晶與資源，全部完成還有寵物蛋與餘燼。</p></div>`;
    const list = Store.quests(), done = list.filter(q => q.claimed).length;
    const rows = list.map((q, i) => {
      const t = QUEST_TYPES[q.type], ok = q.have >= q.need, rw = Store.questReward(q);
      const btn = q.claimed ? '<span class="done-tag">✓ 已領取</span>' : ok ? `<button class="btn sm primary" data-act="claimQuest" data-arg="${i}">領取</button>` : `<span class="dim">${Math.min(q.have, q.need)} / ${q.need}</span>`;
      return `<div class="bld-row glass quest ${q.claimed ? 'done' : ''}"><div class="info"><b>${t.text.replace('{n}', q.need)}</b>
        ${UI.bar(Math.min(q.have, q.need), q.need, 'xp')}<div class="loot sm">${Object.keys(rw).map(k => `<span>${UI.res(k)}+${fmt(rw[k])}</span>`).join('')}</div></div>${btn}</div>`;
    }).join('');
    const all = done === list.length;
    return `<p class="dim center">星象台 Lv${S.buildings.observatory}・每天 ${list.length} 個任務，午夜更新。獎勵會隨著你的主塔進度變多。</p><div class="list">${rows}</div>
      <div class="glass pad center quest-bonus"><div class="loot sm"><b>全部完成獎勵</b><span>${UI.ico('item/backpack', 'ri')}寵物蛋 ×1</span><span>${UI.res('ember')}+1</span></div>${S.quests.bonus ? '<span class="done-tag">✓ 今天已領取</span>' : `<button class="btn ${all ? 'primary' : ''}" data-act="questBonus" ${all ? '' : 'disabled'}>${all ? '領取' : `完成 ${done} / ${list.length}`}</button>`}</div>`;
  },
  claimQuest(i) {
    const r = Store.claimQuest(i); if (!r) return;
    FX.sfx('coin'); FX.toast('任務獎勵：' + Object.keys(r).map(k => `${RES[k].name} +${fmt(r[k])}`).join('、'), 'gold');
    App.commit(); App.checkAch();
  },
  questBonus() { if (!Store.claimQuestBonus()) return; FX.sfx('win'); FX.toast('今天的任務全部完成！寵物蛋 +1、餘燼 +1', 'gold'); App.commit(); },

  // ---------- 訓練場 ----------
  renderTrain() {
    const S = Store.S, slots = Store.trainSlots();
    if (!S.buildings.training) return `<div class="glass pad center"><p>建造<b>訓練場</b>後，沒出戰的英雄可以在這裡訓練。</p><p class="dim">訓練中的英雄會持續獲得經驗（離線也會），但等級不會超過「最高等級英雄 − 3」。</p></div>`;
    S.training = (S.training || []).filter(h => S.heroes[h] && S.heroes[h].owned && h !== S.active);
    const cap = Store.trainCap();
    const rows = HERO_ORDER.filter(h => S.heroes[h].owned && h !== S.active).map(h => {
      const d = HEROES[h], hh = S.heroes[h], on = S.training.includes(h), away = S.expeditions.some(e => e.hero === h);
      const rate = Store.trainRate(h), full = hh.lvl >= cap;
      const btn = on ? `<button class="btn sm" data-act="trainSet" data-arg="${h}:0">停止訓練</button>`
        : away ? '<button class="btn sm" disabled>派遣中</button>'
        : S.training.length >= slots ? '<button class="btn sm" disabled>訓練位已滿</button>' : `<button class="btn sm primary" data-act="trainSet" data-arg="${h}:1">開始訓練</button>`;
      return `<div class="bld-row glass ${on ? 'on' : ''}">${UI.token(d.icon)}<div class="info"><b>${d.name}</b><span class="lv">Lv ${hh.lvl}</span>
        ${UI.bar(hh.xp, Store.xpNeed(hh.lvl), 'xp')}<div class="dim">${on ? (full ? `已達上限 Lv${cap}，提升出戰英雄的等級才能繼續` : `每小時 +${fmt(rate)} 經驗`) : `訓練時每小時 +${fmt(rate)} 經驗`}</div></div>${btn}</div>`;
    }).join('');
    return `<p class="dim center">訓練場 Lv${S.buildings.training}・訓練位 ${S.training.length} / ${slots}（Lv1、4、8 各開一格）・等級上限 Lv${cap}</p>
      <div class="list">${rows || '<p class="dim center">招募更多英雄後才能訓練（出戰中的英雄不能訓練）。</p>'}</div>`;
  },
  trainSet(arg) {
    const [h, on] = arg.split(':'), S = Store.S;
    S.training = (S.training || []).filter(x => x !== h);
    if (on === '1' && S.training.length < Store.trainSlots() && !S.expeditions.some(e => e.hero === h)) S.training.push(h);
    FX.sfx('click'); App.commit();
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
    if (id === 'vault') { const cap = Store.stashCap(); kv += `<span>存放上限</span><b>黃 ${cap.Y}・藍 ${cap.B}・藥水 ${cap.potion}</b><span>離線上限</span><b>${Store.offlineCapHours()} 小時</b>`; }
    if (id === 'training') kv += `<span>訓練位</span><b>${Store.trainSlots()}</b>`;
    if (id === 'observatory') kv += `<span>每日任務</span><b>${Store.questCount()} 個</b>`;
    if (id === 'nest') kv += `<span>寵物等級上限</span><b>${5 + l * 3}${l < 5 ? '（Lv5 開放助戰寵物）' : '・助戰寵物已開放'}</b>`;
    if (id === 'forge') kv += `<span>打造品階</span><b>${Store.forgeTier()}（${GEAR_TIER_NAME[Store.forgeTier() - 1]}）</b><span>強化上限</span><b>+${Store.plusCap()}</b>`;
    if (id === 'rune') kv += `<span>洗練費用</span><b>−${l * 5}%</b><span>合成</span><b>${l >= 6 ? '可合成到神話' : '可合成到傳說（Lv6 起可合成神話）'}</b>`;
    const go = { study: '研究', tavern: '英雄', farm: '農田料理', altar: '祭壇', training: '訓練場', observatory: '任務', nest: '寵物', forge: '鐵匠鋪', rune: '符文工坊' }[id];
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
    if (id === 'training') { this.tab = 'train'; App.go('camp'); }
    if (id === 'observatory') { this.tab = 'quest'; App.go('camp'); }
    if (id === 'nest') { App.go('heroes'); Heroes.petSheet(); }
    if (id === 'forge') { App.go('heroes'); Heroes.forgeSheet(); }
    if (id === 'rune') { App.go('heroes'); Heroes.runeSheet(); }
  },
  upgrade(id) {
    if (Store.S.buildings[id] >= Store.bMax(id)) return;
    if (!Store.pay(Store.bCost(id))) return FX.toast('資源不足', 'bad');
    Store.S.buildings[id]++;
    Store.qAdd('build');
    if (id === 'nest' && !Store.S.pets.gift) { Store.S.pets.gift = true; Store.S.pets.eggs++; FX.toast('寵物小窩送你一顆寵物蛋！到「英雄」頁孵化', 'gold'); }
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
    FX.modal(`<div class="center">${UI.token(HEROES[r.hero].icon, 'big')}<h3>探索歸來</h3><div class="loot">${Object.keys(r.got).filter(k => r.got[k] >= 1).map(k => `<span>${UI.res(k)}+${fmt(r.got[k])}</span>`).join('')}</div>${extra ? `<p class="gold">額外帶回：${extra}</p>` : ''}${r.egg ? '<p class="gold">還撿到一顆寵物蛋！</p>' : ''}</div>`);
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
    const id = pick(ids), k = Object.keys(BUILDINGS[id].prod)[0], el = scene.querySelector(`[data-spot="${id}"]`);
    if (!el) return;
    const d = document.createElement('div');
    d.className = 'pop';
    d.innerHTML = `${UI.res(k)}+${(Store.rates()[k] * 3).toFixed(1)}`;
    el.appendChild(d);
    setTimeout(() => d.remove(), 1700);
  },
};

const Heroes = {
  // 主畫面：出戰英雄、六格裝備與套裝、出戰／助戰寵物；點了才打開更換清單
  render() {
    const S = Store.S, hid = S.active, d = HEROES[hid], h = S.heroes[hid], st = Store.heroStats(hid), g = Store.gearTotals();
    const aw = h.awaken ? `<span class="awk">${'✦'.repeat(h.awaken)}</span>` : '';
    const owned = HERO_ORDER.filter(x => S.heroes[x].owned).length;
    const plus = v => v ? `<small>+${v}</small>` : '';
    const hero = `<div class="card hero-card hero-main" data-act="heroPick"><div class="hero-top">${UI.token(d.icon, 'huge')}<div class="card-body">
        <div class="card-head"><b>${d.name}${aw}</b><span class="lv">Lv ${h.lvl}</span></div>
        ${UI.bar(h.xp, Store.xpNeed(h.lvl), 'xp')}
        <div class="stats"><span>攻擊<b>${st.atk}</b>${plus(g.atk)}</span><span>防禦<b>${st.def}</b>${plus(g.def)}</span><span>生命<b>${st.hp}</b></span></div></div></div>
        ${this.kit(hid)}
        <div class="swap"><span>更換英雄</span><b>${owned} / ${HERO_ORDER.length}</b></div></div>`;
    const slots = GEAR_SLOT_ORDER.map(slot => {
      const it = Store.equipped(slot);
      if (!it) return `<button class="eq-slot empty" data-act="gearSlot" data-arg="${slot}">${UI.ico(GEAR_SLOTS[slot].icon, 'eq-ico')}<b>${GEAR_SLOTS[slot].name}</b><small>未裝備</small></button>`;
      return `<button class="eq-slot" data-act="gearSlot" data-arg="${slot}" style="--rc:${it.set ? GEAR_SETS[it.set].color : GEAR_RARITY[it.r].color}">${UI.ico(Store.gearIcon(it), 'eq-ico')}${it.p ? `<i class="plus">+${it.p}</i>` : ''}${it.set ? '<i class="set-dot"></i>' : ''}
        <b style="color:${GEAR_RARITY[it.r].color}">${Store.gearName(it)}</b><small>${this.mainText(it)}</small></button>`;
    }).join('');
    const nest = S.buildings.nest;
    const petBox = (id, which) => {
      const pet = id && S.pets.own[id];
      if (!pet) return which === 'assist' ? `<button class="pet-slot empty assist" data-act="petSheet">${UI.token('mon/blob1', 'off')}<div class="card-body"><b>助戰寵物（空）</b><span class="dim">選一隻寵物助戰，效果 50%</span></div></button>`
        : `<button class="pet-slot empty" data-act="petSheet">${UI.token('mon/blob1', 'big off')}<div class="card-body"><b>還沒有寵物</b>
          <span class="dim">${nest ? (S.pets.eggs ? `你有 ${S.pets.eggs} 顆蛋，點這裡孵化` : '到寵物小窩買蛋，或打倒首領取得') : '在營地蓋好「寵物小窩」就能孵蛋'}</span></div></button>`;
      const d = PETS[id], k = which === 'assist' ? 0.5 : 1;
      return `<button class="pet-slot ${which}" data-act="petSheet" style="--rc:${PET_ROLES[d.role].color}">${UI.token(d.icon, which === 'assist' ? '' : 'big')}<div class="card-body">
          <div class="card-head"><b>${which === 'assist' ? '助戰・' : ''}${d.name}</b><span class="lv">Lv ${pet.lvl} <span class="star">${'★'.repeat(pet.star || 1)}</span></span></div>
          <span class="role">${PET_ROLES[d.role].name}・<em style="color:${GEAR_RARITY[d.r].color}">${GEAR_RARITY[d.r].name}</em>${which === 'assist' ? '・效果 50%' : ''}</span>
          <span class="dim">${Store.petDesc(id, pet.lvl, pet.star || 1, k)}</span></div>${which === 'active' && S.pets.eggs ? `<i class="egg-badge">蛋 ×${S.pets.eggs}</i>` : ''}</button>`;
    };
    const sets = Object.entries(Store.setCounts()).map(([id, n]) => {
      const st = GEAR_SETS[id];
      return `<div class="set-box" style="--rc:${st.color}"><b>${st.name}套裝 ${n}/6</b>${[2, 4, 6].map(k => `<span class="${n >= k ? 'on' : ''}">${k} 件：${st.d[k]}</span>`).join('')}</div>`;
    }).join('');
    return `<div class="party">${hero}
      <div class="sec">裝備<small>穿在隊伍身上，換英雄也會跟著走</small></div>
      <div class="eq-grid">${slots}</div>${sets}
      <div class="row eq-tools"><button class="btn sm" data-act="bagSheet">背包 ${S.bag.length}/${GEAR_BAG}</button><button class="btn sm" data-act="forgeSheet">打造裝備</button><button class="btn sm" data-act="runeSheet">符文工坊</button></div>
      <div class="sec">寵物<small>跟著英雄進塔，幫忙打怪、治療或輔助</small></div>
      ${petBox(S.pets.active, 'active')}${Store.assistSlot() ? petBox(S.pets.assist !== S.pets.active ? S.pets.assist : null, 'assist') : ''}</div>`;
  },
  kit(hid) {
    const d = HEROES[hid], h = Store.S.heroes[hid];
    return `<div class="kit"><div><b>被動</b>${h.awaken >= 1 ? d.passive2 : d.passive}</div><div><b>${d.skill.name}</b>${d.skill.desc}（每層 ${d.skill.uses + (h.branch === 'A' ? 1 : 0)} 次）${h.branch ? `<span class="gold">・${d.branch[h.branch]}</span>` : ''}</div></div>`;
  },
  mainText(it, p) {
    const m = Store.gearMain(it, p);
    return [m.atk && `攻擊 +${m.atk}`, m.def && `防禦 +${m.def}`].filter(Boolean).join('　');
  },
  affixText(it) {
    return it.a.map(([k, v]) => `<span class="afx">${AFFIXES[k].text.replace('{v}', v)}</span>`).join('') +
      (it.set ? `<span class="afx set" style="--rc:${GEAR_SETS[it.set].color}">${GEAR_SETS[it.set].name}套裝</span>` : '');
  },

  // ---------- 英雄清單 ----------
  pick() {
    App.openSheet(() => {
      const S = Store.S;
      return '<h3>選擇出戰英雄</h3><p class="dim">裝備與寵物會跟著出戰英雄。正在派遣的英雄不能出戰；沒出戰的英雄可以送去營地的訓練場練等級。</p><div class="list hero-list">' + HERO_ORDER.map(hid => {
        const d = HEROES[hid], h = S.heroes[hid], away = S.expeditions.some(e => e.hero === hid), act = S.active === hid;
        if (!h.owned) {
          const need = S.buildings.tavern < d.tavern;
          return `<div class="hrow off" data-tip="${d.name}：${d.lore}">${UI.token(d.icon, 'off')}<div class="card-body"><b>${d.name}</b><span class="dim">${d.passive}</span>
            ${need ? `<button class="btn sm" disabled>需要酒館 Lv${d.tavern}</button>` : UI.costBtn('recruit', hid, d.cost, '<span class="lbl">招募</span>', 'sm go')}</div></div>`;
        }
        const st = Store.heroStats(hid);
        return `<div class="hrow ${act ? 'on' : ''}">${UI.token(d.icon)}<div class="card-body">
          <div class="card-head"><b>${d.name}${h.awaken ? `<span class="awk">${'✦'.repeat(h.awaken)}</span>` : ''}</b><span class="lv">Lv ${h.lvl}</span></div>
          <div class="stats"><span>攻<b>${st.atk}</b></span><span>防<b>${st.def}</b></span><span>命<b>${st.hp}</b></span></div>
          <span class="dim">${h.awaken >= 1 ? d.passive2 : d.passive}・${d.skill.name}：${d.skill.desc}</span>
          ${act ? '<button class="btn sm" disabled>✓ 出戰中</button>' : away ? '<button class="btn sm" disabled>派遣中</button>' : `<button class="btn sm primary" data-act="setActive" data-arg="${hid}">出戰</button>`}</div></div>`;
      }).join('') + '</div>';
    });
  },
  recruit(hid) {
    if (!Store.pay(HEROES[hid].cost)) return FX.toast('資源不足', 'bad');
    Store.S.heroes[hid].owned = true;
    FX.sfx('win'); FX.toast(`${HEROES[hid].name} 加入了營地！`);
    App.commit(); App.checkAch();
  },
  setActive(hid) {
    if (Store.S.expeditions.some(e => e.hero === hid)) return FX.toast('這位英雄正在派遣中', 'bad');
    const S = Store.S;
    S.active = hid; S.training = (S.training || []).filter(h => h !== hid);
    FX.sfx('click'); App.closeSheet(); App.commit();
  },

  // ---------- 裝備 ----------
  // 一列裝備：圖示、名稱、主屬性、詞綴，以及和目前裝備的差距
  row(it, cur, btns) {
    const m = Store.gearMain(it), c = cur ? Store.gearMain(cur) : { atk: 0, def: 0 };
    const diff = cur && cur.id !== it.id ? ['atk', 'def'].map(k => m[k] - c[k] ? `<i class="${m[k] > c[k] ? 'up' : 'down'}">${k === 'atk' ? '攻' : '防'}${m[k] > c[k] ? '▲' : '▼'}${Math.abs(m[k] - c[k])}</i>` : '').join('') : '';
    return `<div class="grow" style="--rc:${GEAR_RARITY[it.r].color}">${UI.ico(Store.gearIcon(it), 'eq-ico')}<div class="card-body">
      <div class="card-head"><b>${Store.gearName(it)}${it.p ? ` <span class="plus">+${it.p}</span>` : ''}</b><span class="rar">${it.lock ? '🔒' : ''}${GEAR_RARITY[it.r].name}・品階 ${it.t}</span></div>
      <div class="gmain">${this.mainText(it)}${diff ? `<span class="diff">${diff}</span>` : ''}</div>${it.a.length || it.set ? `<div class="afxs">${this.affixText(it)}</div>` : ''}
      <div class="row">${btns}</div></div></div>`;
  },
  rowBtns(it) {
    if (Store.isEquipped(it)) return '<button class="btn sm" disabled>✓ 已裝備</button>';
    return `<button class="btn sm primary" data-act="equip" data-arg="${it.id}">裝備</button>
      <button class="btn sm ghost" data-act="lockGear" data-arg="${it.id}">${it.lock ? '解鎖' : '鎖定'}</button>
      ${it.lock ? '' : `<button class="btn sm ghost" data-act="salvage" data-arg="${it.id}">分解</button>`}`;
  },
  slotSheet(slot) {
    App.openSheet(() => {
      const S = Store.S, cur = Store.equipped(slot), cap = Store.plusCap();
      const list = S.bag.filter(x => x.s === slot && x !== cur).sort((a, b) => Store.gearScore(b) - Store.gearScore(a));
      let top = `<p class="dim">還沒有裝備${GEAR_SLOTS[slot].name}。到鐵匠鋪打造，或打倒塔裡的精英與首領取得。</p>`;
      if (cur) {
        const up = cur.p >= cap ? `<button class="btn sm" disabled>${S.buildings.forge ? `強化上限 +${cap}（提升鐵匠鋪）` : '需要鐵匠鋪'}</button>`
          : UI.costBtn('enhance', cur.id, Store.enhanceCost(cur), `<span class="lbl">強化 +${cur.p + 1}：${this.mainText(cur, cur.p + 1)}</span>`, 'sm go');
        top = this.row(cur, null, `${up}<button class="btn sm ghost" data-act="unequip" data-arg="${slot}">卸下</button>`);
      }
      return `<h3>${GEAR_SLOTS[slot].name}</h3><div class="sec">目前裝備</div>${top}
        <div class="sec">背包裡的${GEAR_SLOTS[slot].name}<small>${list.length} 件</small></div>
        <div class="list">${list.map(it => this.row(it, cur, this.rowBtns(it))).join('') || '<p class="dim center">沒有其他的了</p>'}</div>`;
    });
  },
  bagSheet() {
    App.openSheet(() => {
      const S = Store.S, junk = S.bag.filter(x => x.r === 0 && !Store.isEquipped(x) && !x.lock).length;
      const list = S.bag.slice().sort((a, b) => GEAR_SLOT_ORDER.indexOf(a.s) - GEAR_SLOT_ORDER.indexOf(b.s) || Store.gearScore(b) - Store.gearScore(a));
      return `<h3>背包 <small class="dim">${S.bag.length} / ${GEAR_BAG}</small></h3><p class="dim">背包滿了以後，新拿到的裝備會自動分解成材料。鎖定的裝備不會被分解。長按詞綴可以看說明。</p>
        <div class="row"><button class="btn sm" data-act="salvageJunk" ${junk ? '' : 'disabled'}>分解全部普通裝備（${junk}）</button></div>
        <div class="list">${list.map(it => this.row(it, Store.equipped(it.s), this.rowBtns(it))).join('') || '<p class="dim center">背包是空的</p>'}</div>`;
    });
  },
  equip(id) {
    const it = Store.equip(+id); if (!it) return;
    FX.sfx('upgrade'); FX.toast(`裝備了 ${Store.gearName(it)}`);
    App.commit();
  },
  unequip(slot) { Store.unequip(slot); FX.sfx('click'); App.commit(); },
  enhance(id) {
    if (!Store.enhance(+id)) return FX.toast('材料不足', 'bad');
    FX.sfx('upgrade'); App.commit(); App.checkAch();
  },
  lock(id) { const it = Store.gearById(+id); if (it) { it.lock = !it.lock; App.commit(); } },
  async salvage(id) {
    const it = Store.gearById(+id); if (!it) return;
    if (it.r >= 2 && !await FX.modal(`<h3>分解 ${Store.gearName(it)}？</h3><p class="dim">這是${GEAR_RARITY[it.r].name}裝備，分解後就沒了。</p>`, [{ label: '取消', value: false }, { label: '分解', value: true, cls: 'danger' }])) return;
    const g = Store.salvage(+id); if (!g) return;
    FX.sfx('click'); FX.toast('分解獲得 ' + Object.keys(g).map(k => `${RES[k].name} ${g[k]}`).join('、'));
    App.commit();
  },
  salvageJunk() {
    const S = Store.S, ids = S.bag.filter(x => x.r === 0 && !Store.isEquipped(x) && !x.lock).map(x => x.id), sum = {};
    for (const id of ids) { const g = Store.salvage(id); for (const k in g) sum[k] = (sum[k] || 0) + g[k]; }
    if (ids.length) FX.toast(`分解 ${ids.length} 件，獲得 ` + Object.keys(sum).map(k => `${RES[k].name} ${sum[k]}`).join('、'));
    App.commit();
  },
  forgeSheet() {
    App.openSheet(() => {
      const S = Store.S, f = S.buildings.forge;
      if (!f) return `<div class="sheet-head">${UI.token(BUILDINGS.forge.npc, 'big')}<div><h3>鐵匠鋪</h3><p class="dim">在營地蓋好鐵匠鋪，就能打造與強化裝備。</p></div></div>`;
      const odds = Store.craftOdds(), sum = odds.reduce((a, b) => a + b, 0), full = S.bag.length >= GEAR_BAG;
      const pct = i => { const v = odds[i] / sum * 100; return v ? (v < 10 ? v.toFixed(1) : v.toFixed(0)) + '%' : '—'; };
      return `<div class="sheet-head">${UI.token(BUILDINGS.forge.npc, 'big')}<div><h3>鐵匠鋪 Lv${f}</h3>
          <p class="dim">打造品階 ${Store.forgeTier()}（${GEAR_TIER_NAME[Store.forgeTier() - 1]}）・強化上限 +${Store.plusCap()}。每 3 級品階 +1。</p></div></div>
        <div class="odds">${GEAR_RARITY.map((r, i) => `<span style="color:${r.color}">${r.name} ${pct(i)}</span>`).join('')}</div>
        ${full ? '<p class="dim center">背包已滿，先整理背包吧</p>' : ''}
        <div class="col">${GEAR_SLOT_ORDER.map(slot => UI.costBtn('craft', slot, Store.craftCost(), `<span class="lbl">${UI.ico(GEAR_SLOTS[slot].icon, 'ri')} 打造${GEAR_SLOTS[slot].name}</span>`, 'go')).join('')}</div>
        <p class="dim">精良 1 條詞綴、史詩與傳說 2 條、神話 3 條（鐵匠鋪 Lv15 起才打得出神話）。塔裡的精英有機會、首領與黃金怪物一定會掉裝備，越高層品階越高，史詩以上還可能是該區的套裝。</p>`;
    });
  },
  craft(slot) {
    const S = Store.S;
    if (S.bag.length >= GEAR_BAG) return FX.toast('背包已滿', 'bad');
    const r = Store.craft(slot);
    if (!r) return FX.toast('材料不足', 'bad');
    const it = r.it, cur = Store.equipped(slot);
    FX.sfx(it.r >= 2 ? 'win' : 'upgrade');
    App.commit(); App.checkAch();
    FX.modal(`<div class="center"><h3 style="color:${GEAR_RARITY[it.r].color}">${GEAR_RARITY[it.r].name}${it.set ? '・' + GEAR_SETS[it.set].name + '套裝' : ''}！</h3></div>${this.row(it, cur, '')}`,
      [{ label: '收進背包', value: false }, { label: '直接裝備', value: true, cls: 'primary' }]).then(v => { if (v) this.equip(it.id); });
  },

  // ---------- 符文工坊 ----------
  runeTab: 'reforge', fuseSel: [], reforgeId: null,
  runeSheet(tab) {
    if (tab) this.runeTab = tab;
    App.openSheet(() => {
      const S = Store.S, l = S.buildings.rune;
      const head = `<div class="sheet-head">${UI.token(BUILDINGS.rune.npc, 'big')}<div><h3>符文工坊${l ? ' Lv' + l : ''}</h3><p class="dim">${l ? '洗練：重新抽一條詞綴。合成：三件同稀有度的裝備（未裝備、未鎖定）合成一件更高稀有度的裝備，品階取最高的那件。' : '在營地蓋好符文工坊（篝火 Lv4）就能洗練與合成裝備。'}</p></div></div>`;
      if (!l) return head;
      const tabs = UI.tabs('runeTab', this.runeTab, [['reforge', '洗練'], ['fuse', '合成']]);
      if (this.runeTab === 'reforge') {
        const list = S.bag.filter(x => x.a.length).sort((a, b) => b.r - a.r || Store.gearScore(b) - Store.gearScore(a));
        const sel = this.reforgeId && Store.gearById(this.reforgeId);
        if (sel) {
          const c = Store.reforgeCost(sel);
          return head + tabs + this.row(sel, null, '<button class="btn sm ghost" data-act="reforge" data-arg="back">換一件</button>') +
            `<div class="col">${sel.a.map(([k, v], i) => UI.costBtn('reforge', sel.id + ':' + i, c, `<span class="lbl">重抽「${AFFIXES[k].text.replace('{v}', v)}」</span>`, 'sm')).join('')}</div>`;
        }
        return head + tabs + `<p class="dim">選一件有詞綴的裝備：</p><div class="list">${list.map(it => this.row(it, null, `<button class="btn sm primary" data-act="reforge" data-arg="${it.id}">洗練這件</button>`)).join('') || '<p class="dim center">背包裡沒有帶詞綴的裝備</p>'}</div>`;
      }
      this.fuseSel = this.fuseSel.filter(id => { const x = Store.gearById(id); return x && !Store.isEquipped(x) && !x.lock; });
      const first = this.fuseSel[0] && Store.gearById(this.fuseSel[0]);
      const pool = S.bag.filter(x => !Store.isEquipped(x) && !x.lock && x.r < GEAR_RARITY.length - 1 && (!first || x.r === first.r)).sort((a, b) => a.r - b.r || a.t - b.t);
      const ok = Store.canFuse(this.fuseSel);
      const go = this.fuseSel.length === 3 ? (ok ? UI.costBtn('fuse', '', Store.fuseCost(first.r), `<span class="lbl">合成一件${GEAR_RARITY[first.r + 1].name}裝備</span>`, 'go')
        : `<button class="btn" disabled>${first && first.r >= 3 && S.buildings.rune < 6 ? '符文工坊 Lv6 才能合成神話' : '無法合成'}</button>`) : `<button class="btn" disabled>已選 ${this.fuseSel.length} / 3 件</button>`;
      return head + tabs + go + `<div class="list fuse-list">${pool.map(it => this.row(it, null, `<button class="btn sm ${this.fuseSel.includes(it.id) ? 'primary' : ''}" data-act="fusePick" data-arg="${it.id}">${this.fuseSel.includes(it.id) ? '✓ 已選' : '選擇'}</button>`)).join('') || '<p class="dim center">沒有可以合成的裝備</p>'}</div>`;
    });
  },
  reforge(arg) {
    if (arg === 'back') { this.reforgeId = null; return App.render(); }
    if (!String(arg).includes(':')) { this.reforgeId = +arg; return App.render(); }
    const [id, i] = arg.split(':').map(Number), it = Store.gearById(id), old = it.a[i][0];
    if (!Store.reforge(id, i)) return FX.toast('材料不足', 'bad');
    FX.sfx('upgrade'); FX.toast(`「${AFFIXES[old].text.replace('{v}', '')}」→「${AFFIXES[it.a[i][0]].text.replace('{v}', it.a[i][1])}」`);
    App.commit();
  },
  fusePick(id) {
    id = +id;
    this.fuseSel = this.fuseSel.includes(id) ? this.fuseSel.filter(x => x !== id) : this.fuseSel.length < 3 ? [...this.fuseSel, id] : this.fuseSel;
    App.render();
  },
  async fuse() {
    const r = Store.fuse(this.fuseSel);
    if (!r) return FX.toast('無法合成或材料不足', 'bad');
    this.fuseSel = [];
    FX.sfx('win'); App.commit(); App.checkAch();
    await FX.modal(`<div class="center"><h3 style="color:${GEAR_RARITY[r.it.r].color}">合成出${GEAR_RARITY[r.it.r].name}！</h3></div>${this.row(r.it, Store.equipped(r.it.s), '')}`,
      [{ label: '收進背包', value: false }, { label: '直接裝備', value: true, cls: 'primary' }]).then(v => { if (v) this.equip(r.it.id); });
  },

  // ---------- 寵物 ----------
  petSheet() {
    App.openSheet(() => {
      const S = Store.S, P = S.pets, nest = S.buildings.nest;
      if (!nest) return `<div class="sheet-head">${UI.token(BUILDINGS.nest.npc, 'big')}<div><h3>寵物小窩</h3><p class="dim">在營地蓋好寵物小窩，就能孵化寵物蛋。第一次蓋好會送你一顆蛋。</p></div></div>`;
      const bought = P.eggDay === Store.today();
      const eggs = `<div class="egg-bar glass"><span class="egg">${UI.ico('item/backpack')}<b>寵物蛋 ×${P.eggs}</b></span>
        <button class="btn sm ${P.eggs ? 'primary' : ''}" data-act="hatch" ${P.eggs ? '' : 'disabled'}>孵化</button>
        ${bought ? '<button class="btn sm" disabled>今天已買過蛋</button>' : UI.costBtn('buyEgg', '', Store.eggPrice(), '<span class="lbl">買一顆</span>', 'sm')}</div>
        <p class="dim">寵物等級上限＝5 + 小窩等級×3 + (星級−1)×5。重複孵到的寵物會累積成星級（★5 封頂後換成魂晶），每顆星效果 +15%。小窩 Lv5 開放助戰寵物（效果 50%）。首領必掉蛋，精英、黃金怪、派遣、任務也有機會。</p>`;
      const rows = PET_ORDER.map(id => {
        const d = PETS[id], own = P.own[id], role = PET_ROLES[d.role], rar = GEAR_RARITY[d.r];
        if (!own) return `<div class="prow off">${UI.token(d.icon, 'off')}<div class="card-body"><b>？？？</b><span class="role" style="color:${role.color}">${role.name}・<em style="color:${rar.color}">${rar.name}</em></span><span class="dim">還沒孵出來</span></div></div>`;
        const act = P.active === id, asst = Store.assistSlot() && P.assist === id && !act, cap = Store.petCap(id), star = own.star || 1;
        const up = own.lvl >= cap ? `<button class="btn sm" disabled>${star < 5 || nest < 10 ? '已達上限' : '已滿級'}</button>` : UI.costBtn('petUp', id, Store.petUpCost(own.lvl), `<span class="lbl">升到 Lv${own.lvl + 1}</span>`, 'sm');
        const starTxt = `<span class="star">${'★'.repeat(star)}<i>${'★'.repeat(5 - star)}</i></span>${star < 5 ? `<small class="dim">（重複 ${own.dup || 0}/${PET_STAR_NEED[star]}）</small>` : ''}`;
        return `<div class="prow ${act ? 'on' : asst ? 'on2' : ''}">${UI.token(d.icon)}<div class="card-body">
          <div class="card-head"><b>${d.name}</b><span class="lv">Lv ${own.lvl}/${cap}</span></div>
          <span class="role" style="color:${role.color}">${role.name}・<em style="color:${rar.color}">${rar.name}</em> ${starTxt}</span>
          <span class="dim">${Store.petDesc(id, own.lvl, star)}</span>
          <div class="row">${act ? '<button class="btn sm" disabled>✓ 出戰中</button>' : `<button class="btn sm primary" data-act="petSet" data-arg="${id}">出戰</button>`}
          ${Store.assistSlot() && !act ? (asst ? '<button class="btn sm" disabled>✓ 助戰中</button>' : `<button class="btn sm" data-act="petAssist" data-arg="${id}">助戰</button>`) : ''}${up}</div></div></div>`;
      }).join('');
      const n = Object.keys(P.own).length;
      return `<h3>寵物 <small class="dim">${n} / ${PET_ORDER.length}</small></h3>${eggs}<div class="list">${rows}</div>`;
    });
  },
  petSet(id) { const P = Store.S.pets; if (!P.own[id]) return; if (P.assist === id) P.assist = P.active; P.active = id; FX.sfx('click'); App.commit(); },
  petAssist(id) { const P = Store.S.pets; if (!P.own[id] || P.active === id) return; P.assist = id; FX.sfx('click'); App.commit(); },
  petUp(id) { if (!Store.petUp(id)) return FX.toast('材料不足', 'bad'); FX.sfx('upgrade'); App.commit(); },
  buyEgg() { if (!Store.buyEgg()) return FX.toast('魂晶不足', 'bad'); FX.sfx('upgrade'); App.commit(); },
  async hatch() {
    const r = Store.hatch(); if (!r) return;
    const d = PETS[r.id];
    App.commit(); App.checkAch();
    FX.sfx('win');
    const own = Store.S.pets.own[r.id];
    const dupTxt = !r.dup ? '' : r.star ? `<p class="gold">升到 ${'★'.repeat(r.star)}！效果 +15%、等級上限 +5</p>` : r.soul ? `<p class="dim">已經是 ★5，化為魂晶 +${r.soul}</p>` : `<p class="dim">重複累積 ${own.dup}/${PET_STAR_NEED[own.star]}，集滿就升星</p>`;
    await FX.modal(`<div class="center hatch">${UI.token(d.icon, 'huge')}<h3>${r.dup ? `又是${d.name}！` : `${d.name} 誕生了！`}</h3>
      <p style="color:${PET_ROLES[d.role].color}">${PET_ROLES[d.role].name}・<b style="color:${GEAR_RARITY[d.r].color}">${GEAR_RARITY[d.r].name}</b></p>
      <p>${Store.petDesc(r.id, own.lvl, own.star)}</p>${dupTxt}</div>`, [{ label: '太好了', value: true, cls: 'primary' }]);
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
        const pips = t.max <= 10 ? Array.from({ length: t.max }, (_, k) => `<i class="${k < r ? 'on' : ''}"></i>`).join('') : `<b class="rk">${r} / ${t.max}</b>`;
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
