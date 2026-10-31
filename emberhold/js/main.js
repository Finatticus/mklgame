// 路由、頂部資源列、事件分派、啟動
const App = {
  view: 'camp',
  views: { camp: Camp, heroes: Heroes, run: Play, altar: Altar, more: More },

  actions: {
    go: v => App.go(v),
    upgrade: id => Camp.upgrade(id),
    recruit: id => Heroes.recruit(id),
    gear: a => Heroes.gear(a),
    setActive: id => Heroes.setActive(id),
    talent: id => Altar.talent(id),
    claim: id => More.claim(id),
    saveUrl: () => More.saveUrl(), syncNow: () => More.syncNow(), copyId: () => More.copyId(), restore: () => More.restore(),
    toggleSfx: () => More.toggleSfx(), exportSave: () => More.exportSave(), importSave: () => More.importSave(), resetSave: () => More.resetSave(),
    towerEnter: k => Play.enter(k), towerLeave: () => Play.leave(), towerTap: i => Play.tap(i), towerFight: i => Play.fightFromSheet(i),
    towerSkill: () => Play.skill(), towerPotion: () => Play.potion(), towerManual: () => Play.manual(), towerFly: () => Play.fly(),
    flyTo: f => Play.flyTo(f), shopBuy: k => Play.shopBuy(k), merchBuy: k => Play.merchBuy(k), treasureInfo: id => Play.treasureInfo(id),
    toolInfo: k => Play.toolInfo(k), towerItem: k => Play.useItem(k), toggleMod: k => Play.toggleMod(k), pickMeal: k => Play.pickMeal(k),
    claimStars: () => Play.claimStars(), newCycle: () => Play.confirmNewCycle(),
    bld: id => Camp.openSheet(id), closeSheet: () => App.closeSheet(), campJump: id => Camp.jump(id),
    campTab: t => { Camp.tab = t; App.render(); }, altarTab: t => { Altar.tab = t; App.render(); }, moreTab: t => { More.tab = t; App.render(); },
    research: id => Camp.research(id), expPlace: id => { Camp.expPick.id = id; App.render(); }, expHero: h => { Camp.expPick.hero = h; App.render(); },
    expSend: h => Camp.expSend(h), expCollect: i => Camp.expCollect(i), plotMenu: i => Camp.plotMenu(+i), plant: a => Camp.plant(a),
    harvest: i => Camp.harvest(i), cook: id => Camp.cook(id), visitor: () => Camp.visitor(),
    pray: id => Altar.pray(id), awaken: a => Altar.awaken(a), inscribe: id => Altar.inscribe(id), equipMem: id => Altar.equipMem(id),
    setTitle: t => More.setTitle(t), loadLevels: () => More.loadLevels(),
  },

  go(v) {
    if (!this.views[v]) return;
    this.view = v;
    FX.sfx('click');
    this.render();
    this.scrollTop();
  },
  scrollTop() { document.getElementById('main').scrollTo({ top: 0 }); },

  // 玩家行動後：存檔 + 重繪
  commit() {
    Store.saveLocal();
    this.checkAch();
    this.render();
  },

  render() {
    const main = document.getElementById('main');
    main.innerHTML = this.views[this.view].render();
    main.dataset.view = this.view;
    if (this.view === 'run') Play.afterRender();
    document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.arg === this.view));
    document.querySelectorAll('#nav .ni').forEach(n => { if (!n.firstChild) n.innerHTML = Art.img(n.dataset.i); });
    if (this.sheetFn) document.querySelector('#sheet .sheet-body').innerHTML = this.sheetFn();
    const runBadge = document.querySelector('#nav [data-arg="run"]');
    runBadge.classList.toggle('live', !!Store.S.tower.inside);
    this.refresh();
  },

  openSheet(fn) {
    this.sheetFn = fn;
    const el = document.getElementById('sheet');
    el.querySelector('.sheet-body').innerHTML = fn();
    el.classList.add('open');
    this.refresh();
  },
  closeSheet() { this.sheetFn = null; document.getElementById('sheet').classList.remove('open'); },

  // 每秒：更新資源與按鈕可否購買（不重繪整頁）
  refresh() {
    const S = Store.S, r = Store.rates();
    document.getElementById('top').innerHTML = Object.keys(RES).map(k =>
      `<div class="res">${UI.res(k)}<b>${fmt(S.res[k])}</b>${r[k] ? `<small>+${r[k] < 10 ? r[k].toFixed(1) : fmt(r[k])}</small>` : ''}</div>`).join('') +
      `<i class="sync-dot sync-${Sync.status}" title="同步狀態"></i>`;
    document.querySelectorAll('[data-cost]').forEach(btn => {
      const cost = JSON.parse(btn.dataset.cost);
      btn.disabled = !Store.canAfford(cost);
      if (btn.classList.contains('sm') && btn.closest('.bld-row')) btn.classList.toggle('go', !btn.disabled);
      btn.querySelectorAll('.chip').forEach(ch => ch.classList.toggle('short', (S.res[ch.dataset.res] || 0) < +ch.dataset.need));
    });
    document.querySelector('#nav [data-arg="more"]').classList.toggle('dot', Store.newAchievements().length > 0);
    const d = Camp.dots();
    document.querySelector('#nav [data-arg="camp"]').classList.toggle('dot', !!(d.exp || d.farm || S.visitor || (d.study && S.buildings.study)));
    document.querySelector('#nav [data-arg="altar"]').classList.toggle('dot', S.buildings.altar > 0 && !(S.prayer && S.prayer.date === Store.today()));
    // 計時條
    const now = Date.now();
    let finished = false;
    document.querySelectorAll('.bar.timer').forEach(b => {
      const st = +b.dataset.start, end = +b.dataset.end;
      b.querySelector('i').style.width = Math.min(100, (now - st) / (end - st) * 100) + '%';
      b.querySelector('span').textContent = fmtTime(end - now);
      if (end <= now) finished = true;
    });
    if (finished && !this.sheetFn && !this._rerender) { this._rerender = true; setTimeout(() => { this._rerender = false; this.render(); }, 50); }
  },

  checkAch() {
    const n = Store.newAchievements().filter(a => !this._told || !this._told.has(a.id));
    this._told = this._told || new Set();
    n.forEach(a => { this._told.add(a.id); FX.toast(`🏆 成就達成：${a.name}（到「更多」領取）`, 'gold'); });
  },

  reload() {
    Store.load();
    this.themeNow();
    this.render();
  },
  themeNow() { const T = Play.T; FX.setTheme(T ? T.floors[T.floor].zone : null); },

  async boot() {
    Store.load();
    document.getElementById('sheet').addEventListener('click', e => { if (e.target.id === 'sheet') this.closeSheet(); });

    document.body.addEventListener('click', e => {
      const t = e.target.closest('[data-act]');
      if (!t || t.disabled) return;
      const f = this.actions[t.dataset.act];
      if (f) f(t.dataset.arg);
    });

    // 先嘗試拉雲端（較新則覆蓋），再計算離線收益
    Sync.start(() => { FX.toast('已同步雲端較新的進度'); App.reload(); });
    if (Sync.enabled() && navigator.onLine) await Promise.race([Sync.pull(), sleep(4000)]);
    const off = Store.tick(Date.now(), true);
    Store.saveLocal(true);
    if (Store.S.tower.inside && !Play.T) Store.S.tower.inside = null;
    this.themeNow();
    if (Store.S.tower.inside) this.view = 'run';
    this.render();
    document.getElementById('loading').classList.add('done');
    setTimeout(() => document.getElementById('loading').remove(), 800);
    Sync.onStatus(() => this.refresh());

    if (off.dt > 60) {
      const g = off.got;
      const h = Math.floor(off.dt / 3600), mnt = Math.floor(off.dt % 3600 / 60);
      FX.modal(`<div class="center">${UI.ico('item/torch', 'hero-ico')}<h3>歡迎回來</h3>
        <p class="dim">篝火在你離開的 ${h ? h + ' 小時 ' : ''}${mnt} 分鐘裡持續燃燒${off.dt >= Store.offlineCapHours() * 3600 ? '（已達上限）' : ''}</p>
        <div class="loot">${['wood', 'ore', 'gold'].filter(k => g[k] >= 1).map(k => `<span>${UI.res(k)}+${fmt(g[k])}</span>`).join('') || '尚無產出'}${g.stash_Y > 0 ? `<span>${UI.ico('item/key_y', 'ri')}+${g.stash_Y}</span>` : ''}${g.stash_potion > 0 ? `<span>${UI.ico('item/potion_red', 'ri')}+${g.stash_potion}</span>` : ''}</div></div>`,
        [{ label: '收下', value: true, cls: 'primary' }]).then(() => FX.sfx('coin'));
    } else if (!Store.S.tutorial) {
      Store.S.tutorial = 1; Store.saveLocal();
      FX.modal(`<div class="center">${UI.token('mon/dragonkinknight', 'huge')}<h3>燼火營地</h3>
        <p>${STORY.intro}</p>
        <p class="dim">在<b>營地</b>經營設施累積資源（離線也會產出）；<br>帶著英雄<b>攀登高塔</b>，用鑰匙與寶石規劃路線；<br>卡關就回營地升級裝備、學習天賦，再挑戰更高層。</p></div>`,
        [{ label: '點燃篝火', value: true, cls: 'primary' }]);
    }

    // 主迴圈：每秒累積資源，每 10 秒寫入本機
    let n = 0;
    setInterval(() => {
      const t = Store.tick(Date.now(), true);
      if (t.got.research) { FX.toast(`研究完成：${RESEARCH[t.got.research].name}`, 'gold'); FX.sfx('win'); if (this.view === 'camp') this.render(); }
      this.refresh();
      if (this.view === 'camp' && n % 2 === 0) Camp.popTick();
      if (++n % 10 === 0) Store.saveLocal(true);
    }, 1000);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { Store.tick(); Store.saveLocal(true); }
      else { const o = Store.tick(Date.now(), true); if (o.dt > 5) this.refresh(); }
    });

    if (Sync.enabled() && navigator.onLine) Levels.fetch();

    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW', e));
    }
  },
};

App.boot();
