// 遊戲狀態、本地存檔、放置收益、營地計時系統與數值公式
const Store = (() => {
  const KEY = 'emberhold_save_v1';
  const ID_KEY = 'emberhold_player_id';
  const VER = 3;
  let S = null;
  let dirty = false;

  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16);
    });
  }
  function playerId() {
    let id = localStorage.getItem(ID_KEY);
    if (!id) { id = uuid(); localStorage.setItem(ID_KEY, id); }
    return id;
  }
  function setPlayerId(id) { localStorage.setItem(ID_KEY, id); }
  function today(d = new Date()) { return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }

  function fresh() {
    const now = Date.now();
    const heroes = {};
    HERO_ORDER.forEach(h => heroes[h] = { owned: h === 'knight', lvl: 1, xp: 0, awaken: 0, branch: null });
    const buildings = {};
    BUILDING_ORDER.forEach(b => buildings[b] = 0);
    buildings.hearth = 1; buildings.lumber = 1;
    const talents = {};
    Object.keys(TALENTS).forEach(t => talents[t] = 0);
    return {
      v: VER, createdAt: now, updatedAt: now, lastTick: now,
      res: { wood: 20, ore: 0, gold: 0, soul: 0, ember: 0 },
      stash: { Y: 0, B: 0, potion: 0 },
      buildings, heroes, talents, active: 'knight',
      tower: { main: null, daily: null, weekly: null, inside: null, dailyBest: null, weeklyBest: null, cycle: 0, mods: [] },
      stars: {}, starClaimed: 0, zoneQuest: {},
      research: { done: {}, cur: null },
      expeditions: [],
      farm: { plots: [], pantry: { wheat: 0, mush: 0, berry: 0, seed: 1 }, dishes: {}, meal: null },
      visitor: null, nextVisitor: now + 20 * 60000,
      prayer: null, buffs: {},
      memory: { seen: {}, inscribed: {}, equipped: [] },
      bag: [], gear: { weapon: null, offhand: null, armor: null, hands: null, boots: null, trinket: null }, gearSeq: 1,
      pets: { own: {}, active: null, assist: null, eggs: 0, eggDay: null, gift: false },
      training: [], quests: null,
      codex: {}, title: null, story: {},
      stats: { kills: 0, bestFloor: 0, bestDaily: 0, bossKills: 0, towers: 0, clears: 0, bestCurse: -1, stars: 0, weekly: 0, dishes: 0 },
      ach: {}, tutorial: 0,
      settings: { sfx: true },
    };
  }

  // 舊版（v3 之前）存檔：依玩家選擇整個重新開始，只保留設定
  function migrate(s) {
    const f = fresh();
    if (!s || (s.v || 1) < VER) { f.settings = (s && s.settings) || f.settings; return f; }
    // 舊的「武器／護甲等級」（每級 +2）換成一件同等強度的普通裝備
    if (!s.bag) {
      s.bag = []; s.gearSeq = 1; s.gear = {};
      for (const [slot, key] of [['weapon', 'weapon'], ['armor', 'armor']]) {
        const lv = Math.max(0, ...HERO_ORDER.map(h => (s.heroes[h] && s.heroes[h][key]) || 0));
        if (!lv) continue;
        const it = { id: s.gearSeq++, s: slot, b: 0, t: 1, r: 0, p: Math.min(20, Math.max(0, lv * 2 - 3)), a: [] };
        s.bag.push(it); s.gear[slot] = it.id;
      }
    }
    // v3.1 的「飾品」部位改名、寵物加上星級
    if (s.gear && 'charm' in s.gear) { s.gear.trinket = s.gear.charm; delete s.gear.charm; }
    for (const it of s.bag || []) { if (it.s === 'charm') it.s = 'trinket'; if (!GEAR_BASES[it.s][it.b]) it.b = 0; }
    if (s.pets) for (const id in s.pets.own) { if (!PETS[id]) { delete s.pets.own[id]; continue; } s.pets.own[id].star = s.pets.own[id].star || 1; s.pets.own[id].dup = s.pets.own[id].dup || 0; }
    for (const k in f) if (s[k] === undefined) s[k] = f[k];
    for (const grp of ['res', 'stash', 'buildings', 'talents', 'stats', 'settings', 'tower', 'research', 'farm', 'memory', 'gear', 'pets'])
      for (const k in f[grp]) if (s[grp][k] === undefined) s[grp][k] = f[grp][k];
    for (const h of HERO_ORDER) { if (!s.heroes[h]) s.heroes[h] = f.heroes[h]; for (const k in f.heroes[h]) if (s.heroes[h][k] === undefined) s.heroes[h][k] = f.heroes[h][k]; }
    for (const k in s.buildings) if (!BUILDINGS[k]) delete s.buildings[k];
    return s;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      S = raw ? migrate(JSON.parse(raw)) : fresh();
    } catch (e) { S = fresh(); }
    return S;
  }
  function replace(s) { S = migrate(s); saveLocal(true); return S; }
  function saveLocal(keepTime) {
    if (!keepTime) S.updatedAt = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { console.error(e); }
    dirty = true;
  }

  // ---------- 資源 ----------
  const round = c => { const o = {}; for (const k in c) o[k] = Math.ceil(c[k]); return o; };
  function canAfford(cost) { for (const k in cost) if ((S.res[k] || 0) < cost[k]) return false; return true; }
  function pay(cost) { if (!canAfford(cost)) return false; for (const k in cost) S.res[k] -= cost[k]; return true; }
  function gain(r) { for (const k in r) S.res[k] = (S.res[k] || 0) + r[k]; }
  const has = id => !!S.research.done[id];
  const buff = id => S.prayer && S.prayer.date === today() && S.prayer.id === id;

  // ---------- 建築 ----------
  function bMax(id) {
    const b = BUILDINGS[id];
    if (id === 'hearth') return b.max;
    const cap = S.buildings.hearth * 5;
    return b.max ? Math.min(b.max, cap) : cap;
  }
  function bCost(id) {
    const b = BUILDINGS[id], l = S.buildings[id];
    if (b.cost) return round(b.cost(l));
    const c = {};
    for (const k in b.base) c[k] = b.base[k] * Math.pow(b.growth, l);
    return round(c);
  }
  function bLocked(id) { return (BUILDINGS[id].req || 0) > S.buildings.hearth; }
  function prodMult() { return 1 + S.talents.industry * 0.1 + (has('prosper') ? 0.25 : 0) + (buff('prod') ? 0.3 : 0); }
  function rates() {
    const r = { wood: 0, ore: 0, gold: 0 }, mult = prodMult();
    for (const id of BUILDING_ORDER) {
      const b = BUILDINGS[id], l = S.buildings[id];
      if (!b.prod || !l) continue;
      for (const k in b.prod) r[k] += b.prod[k] * l * Math.pow(1.08, l - 1) * mult * (has('deepcore') ? 1.3 : 1);
    }
    return r;
  }
  // 倉庫：鑰匙工坊與藥師小屋的慢速產出（每小時）
  function stashRates() {
    const k = S.buildings.keysmith, a = S.buildings.apothecary, m = has('keys') ? 1.5 : 1;
    return { Y: k * 0.5 * m, B: k >= 3 ? (k - 2) * 0.15 * m : 0, potion: a * 0.4 };
  }
  function stashCap() { const v = S.buildings.vault * 2, k = has('logistics') ? 1.5 : 1; return { Y: Math.floor((3 + S.buildings.keysmith * 2 + v) * k), B: Math.floor((1 + Math.floor(S.buildings.keysmith / 2) + Math.floor(v / 2)) * k), potion: Math.floor((2 + S.buildings.apothecary * 2 + v) * k) }; }
  function offlineCapHours() { return CONFIG.OFFLINE_BASE_HOURS + S.buildings.hearth + (has('prosper') ? 4 : 0) + S.buildings.vault + S.talents.offline * 2; }

  // ---------- 研究 ----------
  function researchMins(id) { return RESEARCH[id].time / (1 + S.buildings.study * 0.1 + S.talents.researcher * 0.05 + (buff('study') ? 0.5 : 0)); }
  function canResearch(id) {
    const r = RESEARCH[id];
    return !has(id) && !S.research.cur && S.buildings.study >= r.study && (!r.need || has(r.need));
  }
  function startResearch(id) {
    if (!canResearch(id) || !pay(RESEARCH[id].cost)) return false;
    S.research.cur = { id, end: Date.now() + researchMins(id) * 60000 };
    return true;
  }

  // ---------- 派遣 ----------
  function expSlots() { return S.buildings.tavern >= 1 ? 1 + (has('expedition') ? 1 : 0) + (S.buildings.tavern >= 6 ? 1 : 0) : 0; }
  function sendExpedition(id, hid, hours) {
    if (S.expeditions.length >= expSlots() || S.expeditions.some(e => e.hero === hid) || S.active === hid) return false;
    S.expeditions.push({ id, hero: hid, hours, end: Date.now() + hours * 3600000 });
    S.training = (S.training || []).filter(h => h !== hid);
    return true;
  }
  // 收成：依時數給獎勵（越長越划算），並有機會帶回額外物品
  function collectExpedition(idx) {
    const e = S.expeditions[idx];
    if (!e || e.end > Date.now()) return null;
    const x = EXPEDITIONS[e.id], mult = e.hours * (1 + 0.05 * e.hours) * (1 + S.heroes[e.hero].lvl * 0.03);
    const got = {};
    for (const k in x.reward) got[k] = Math.round(x.reward[k] * mult * 100) / 100;
    if (got.ember) got.ember = Math.floor(got.ember + Math.random());
    gain(got);
    const extra = Math.random() < 0.25 + e.hours * 0.06 ? x.extra : null;
    if (extra === 'potion') S.stash.potion += 1;
    if (extra === 'keyY') S.stash.Y += 1;
    if (extra === 'keyB') S.stash.B += 1;
    if (extra === 'seed') S.farm.pantry.seed += 1;
    if (extra === 'ember') S.res.ember += 1;
    const egg = S.buildings.nest > 0 && Math.random() < 0.04 + e.hours * 0.01;
    if (egg) S.pets.eggs++;
    addXp(e.hero, Math.round(8 * e.hours));
    S.expeditions.splice(idx, 1);
    qAdd('exp');
    return { got, extra, egg, hero: e.hero };
  }

  // ---------- 農田與料理 ----------
  function plotCount() { return S.buildings.farm + (has('farming') ? 2 : 0); }
  function cropMins(id) { return CROPS[id].mins / (has('farming') ? 1.25 : 1); }
  function plant(idx, id) {
    const c = CROPS[id];
    if (idx >= plotCount() || S.farm.plots[idx]) return false;
    if (c.seed && S.farm.pantry.seed <= 0) return false;
    if (!pay(c.cost)) return false;
    if (c.seed) S.farm.pantry.seed--;
    S.farm.plots[idx] = { crop: id, end: Date.now() + cropMins(id) * 60000 };
    return true;
  }
  function harvest(idx) {
    const p = S.farm.plots[idx];
    if (!p || p.end > Date.now()) return 0;
    const n = CROPS[p.crop].yield;
    S.farm.pantry[p.crop] += n;
    if (p.crop === 'berry' && Math.random() < 0.5) S.farm.pantry.seed++;
    qAdd('harvest');
    S.farm.plots[idx] = null;
    return n;
  }
  function cook(id) {
    const d = DISHES[id];
    if (d.pro && !has('kitchen')) return false;
    for (const k in d.need) if ((S.farm.pantry[k] || 0) < d.need[k]) return false;
    for (const k in d.need) S.farm.pantry[k] -= d.need[k];
    S.farm.dishes[id] = (S.farm.dishes[id] || 0) + 1;
    S.stats.dishes++;
    qAdd('cook');
    return true;
  }

  // ---------- 訪客 ----------
  function spawnVisitor(now) {
    if (S.visitor || now < S.nextVisitor || S.buildings.hearth < 2) return;
    S.visitor = { id: VISITORS[Math.floor(Math.random() * VISITORS.length)].id, at: now };
    S.nextVisitor = now + (40 + Math.random() * 50) * 60000;
  }

  // 依經過時間發放收益；回傳獲得量
  function tick(now = Date.now(), capped = false) {
    let dt = Math.max(0, (now - S.lastTick) / 1000);
    if (capped) dt = Math.min(dt, offlineCapHours() * 3600);
    S.lastTick = now;
    const r = rates(), got = {};
    for (const k in r) { got[k] = r[k] * dt; S.res[k] += got[k]; }
    const sr = stashRates(), cap = stashCap();
    for (const k in sr) {
      const before = Math.floor(S.stash[k]);
      if (S.stash[k] < cap[k]) S.stash[k] = Math.min(cap[k], S.stash[k] + sr[k] * dt / 3600);
      got['stash_' + k] = Math.floor(S.stash[k]) - before;
    }
    if (S.research.cur && S.research.cur.end <= now) {
      S.research.done[S.research.cur.id] = true;
      got.research = S.research.cur.id;
      S.research.cur = null;
    }
    got.train = trainTick(dt);
    spawnVisitor(now);
    return { got, dt };
  }

  // ---------- 英雄 ----------
  function xpNeed(lvl) { return Math.round(15 * Math.pow(lvl, 1.6)); }
  function xpMult() {
    return (1 + S.buildings.tavern * 0.1 + S.talents.scholar * 0.05) * (buff('xp') ? 1.3 : 1) * (S.buffs.bard === today() ? 1.1 : 1) * (has('bestiary') ? 1.15 : 1);
  }
  function addXp(hid, xp) {
    const h = S.heroes[hid];
    h.xp += xp;
    let ups = 0;
    while (h.lvl < 99 && h.xp >= xpNeed(h.lvl)) { h.xp -= xpNeed(h.lvl); h.lvl++; ups++; }
    return { xp, ups };
  }
  // 英雄的永久屬性（不含塔內寶石）
  function heroStats(hid) {
    const d = HEROES[hid], h = S.heroes[hid], t = S.talents;
    const g = gearTotals();
    let atk = d.atk + (h.lvl - 1) + g.atk + t.might + (has('heroics') ? 5 : 0) + (has('tactics') ? 2 : 0) + (buff('atk') ? 3 : 0);
    let def = d.def + (h.lvl - 1) + g.def + t.guard + (has('heroics') ? 5 : 0) + (has('armor') ? 2 : 0) + (buff('def') ? 3 : 0);
    let hp = d.hp + (h.lvl - 1) * 50 + t.vigor * 100;
    if (h.awaken >= 3) { atk = Math.floor(atk * 1.1); def = Math.floor(def * 1.1); hp = Math.floor(hp * 1.1); }
    return { atk, def, hp };
  }

  // ---------- 裝備 ----------
  function rollIdx(w) { let x = Math.random() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < w.length; i++) { x -= w[i]; if (x <= 0) return i; } return 0; }
  const randKey = arr => arr[Math.floor(Math.random() * arr.length)];
  function rollAffix(r, except = []) {
    const keys = Object.keys(AFFIXES).filter(k => !except.includes(k)), k = randKey(keys);
    return [k, AFFIXES[k].v[r - 1]];
  }
  // set：套裝 id（只會出現在史詩以上）
  function makeGear(slot, t, r, set = null) {
    slot = slot || randKey(GEAR_SLOT_ORDER);
    const a = [];
    while (a.length < GEAR_RARITY[r].affix) a.push(rollAffix(r, a.map(x => x[0])));
    const it = { s: slot, b: Math.floor(Math.random() * GEAR_BASES[slot].length), t: Math.max(1, Math.min(GEAR_TIER.length, t)), r, p: 0, a };
    if (set && r >= 2) it.set = set;
    return it;
  }
  function gearMain(it, p = it.p) {
    // 每強化一級 +10% 基礎值（至少 +1），確保每一級都看得到成長
    const w = GEAR_BASES[it.s][it.b][2] || GEAR_SLOTS[it.s].main, k = GEAR_TIER[it.t - 1] * GEAR_RARITY[it.r].mult, o = { atk: 0, def: 0 };
    for (const x in w) { const b = w[x] * k; o[x] = Math.round(b) + p * Math.max(1, Math.round(b * 0.1)); }
    return o;
  }
  const gearName = it => (it.set ? GEAR_SETS[it.set].name + '・' : GEAR_TIER_NAME[it.t - 1]) + GEAR_BASES[it.s][it.b][1];
  const gearIcon = it => GEAR_BASES[it.s][it.b][0];
  function gearScore(it) { const m = gearMain(it); return m.atk + m.def + it.a.length * 2 * GEAR_TIER[it.t - 1] + (it.set ? 3 * GEAR_TIER[it.t - 1] : 0); }
  const gearById = id => S.bag.find(x => x.id === id) || null;
  const equipped = slot => gearById(S.gear[slot]);
  const isEquipped = it => S.gear[it.s] === it.id;
  function gearTotals() {
    const o = { atk: 0, def: 0 };
    for (const slot of GEAR_SLOT_ORDER) { const it = equipped(slot); if (it) { const m = gearMain(it); o.atk += m.atk; o.def += m.def; } }
    return o;
  }
  // 身上每個套裝穿了幾件
  function setCounts() {
    const c = {};
    for (const slot of GEAR_SLOT_ORDER) { const it = equipped(slot); if (it && it.set) c[it.set] = (c[it.set] || 0) + 1; }
    return c;
  }
  // 詞綴與套裝效果加總（% 類轉成小數）
  function gearMods() {
    const m = {}, add = (k, v) => { if (k === 'gOpen') k = 'petOpen'; m[k] = (m[k] || 0) + v; };
    for (const slot of GEAR_SLOT_ORDER) {
      const it = equipped(slot); if (!it) continue;
      for (const [k, v] of it.a) add(k, AFFIXES[k].raw ? v : v / 100);
    }
    const c = setCounts();
    for (const id in c) for (const n of [2, 4, 6]) if (c[id] >= n) { const b = GEAR_SETS[id].b[n]; for (const k in b) add(k, b[k]); }
    return m;
  }
  function addGear(it) {
    it.id = S.gearSeq++;
    S.stats.bestGear = Math.max(S.stats.bestGear || 0, it.r);
    if (S.bag.length >= GEAR_BAG) { const g = salvageValue(it); gain(g); return { it, salvaged: g }; }
    S.bag.push(it);
    return { it };
  }
  // 塔內掉落：品階跟著區域與詛咒等級走；首領、精英、黃金怪有機會掉該區套裝
  function dropGear(kind, floor, curse) {
    const zone = Math.min(ZONES.length - 1, Math.floor((floor - 1) / 10));
    const t = 1 + zone + Math.floor((curse || 0) / 3);
    const w = GEAR_DROP[kind].slice();
    if (kind === 'boss' && S.talents.legend) { w[0] *= 1 - 0.3 * S.talents.legend; w[3] *= 1 + 0.3 * S.talents.legend; w[4] *= 1 + 0.4 * S.talents.legend; }
    const r = rollIdx(w);
    const set = r >= 2 && Math.random() < (kind === 'boss' ? 0.45 : 0.25) * (has('setcraft') ? 1.4 : 1) ? SET_ORDER[zone] : null;
    return addGear(makeGear(null, t, r, set));
  }
  function forgeTier() { return Math.min(GEAR_TIER.length, 1 + Math.floor(S.buildings.forge / 3)); }
  function plusCap() { return Math.min(25, S.buildings.forge * 2); }
  function craftCost() { const t = forgeTier(), k = has('forging') ? 0.8 : 1; return round({ ore: 60 * Math.pow(2.1, t - 1) * k, gold: 45 * Math.pow(2.1, t - 1) * k }); }
  function craftOdds() {
    const f = S.buildings.forge, k = 1 + S.talents.smith * 0.08;
    return [Math.max(25, 70 - f * 1.5), 25, (4 + f * 0.5) * k, (1 + f * 0.18) * k, (f >= 15 ? 0.2 + (f - 15) * 0.05 : 0) * k];
  }
  function craft(slot) {
    if (!S.buildings.forge || !pay(craftCost())) return null;
    const r = addGear(makeGear(slot, forgeTier(), rollIdx(craftOdds())));
    qAdd('craft');
    return r;
  }
  function enhanceCost(it) { const k = GEAR_TIER[it.t - 1] * (1 + 0.3 * it.r) * Math.pow(1.28, it.p); return round({ ore: 15 * k * (has('enchant') ? 0.8 : 1), gold: 12 * k * (has('enchant') ? 0.8 : 1) }); }
  function enhance(id) {
    const it = gearById(id);
    if (!it || it.p >= plusCap() || !pay(enhanceCost(it))) return false;
    it.p++; S.stats.bestPlus = Math.max(S.stats.bestPlus || 0, it.p);
    qAdd('enhance');
    return true;
  }
  function salvageValue(it) {
    const k = GEAR_TIER[it.t - 1] * (1 + it.r) * (1 + 0.25 * it.p) * (1 + S.talents.salvager * 0.15), o = { ore: Math.round(20 * k), gold: Math.round(10 * k) };
    if (it.r >= 2) o.soul = Math.round(it.r * 2 * it.t * (1 + S.talents.salvager * 0.15));
    return o;
  }
  function salvage(id) {
    const i = S.bag.findIndex(x => x.id === id), it = S.bag[i];
    if (!it || isEquipped(it) || it.lock) return null;
    S.bag.splice(i, 1);
    const g = salvageValue(it); gain(g); return g;
  }
  function equip(id) {
    const it = gearById(id); if (!it) return null;
    S.gear[it.s] = it.id;
    const c = setCounts(); S.stats.bestSet = Math.max(S.stats.bestSet || 0, ...Object.values(c), 0);
    return it;
  }
  function unequip(slot) { S.gear[slot] = null; }
  // 符文工坊：洗練一條詞綴、三合一
  function reforgeCost(it) { return round({ soul: 4 * GEAR_TIER[it.t - 1] * (1 + it.r) * (1 - S.buildings.rune * 0.05), gold: 60 * GEAR_TIER[it.t - 1] }); }
  function reforge(id, idx) {
    const it = gearById(id);
    if (!it || !S.buildings.rune || !it.a[idx] || !pay(reforgeCost(it))) return false;
    it.a[idx] = rollAffix(it.r, it.a.map(x => x[0]));
    return true;
  }
  function fuseCost(r) { return round({ gold: 300 * Math.pow(3, r), soul: 10 * Math.pow(2.2, r) }); }
  function canFuse(ids) {
    const its = ids.map(gearById);
    return S.buildings.rune > 0 && its.length === 3 && its.every(x => x && !isEquipped(x) && !x.lock) && new Set(ids).size === 3
      && its.every(x => x.r === its[0].r) && its[0].r < GEAR_RARITY.length - 1 && (its[0].r < 3 || S.buildings.rune >= 6);
  }
  function fuse(ids) {
    if (!canFuse(ids)) return null;
    const its = ids.map(gearById);
    if (!pay(fuseCost(its[0].r))) return null;
    S.bag = S.bag.filter(x => !ids.includes(x.id));
    const t = Math.max(...its.map(x => x.t)), set = its.find(x => x.set);
    S.stats.fuses = (S.stats.fuses || 0) + 1;
    qAdd('craft');
    return addGear(makeGear(randKey(its).s, t, its[0].r + 1, set ? set.set : null));
  }

  // ---------- 寵物 ----------
  function petCap(id) { const p = id && S.pets.own[id]; return 5 + S.buildings.nest * 3 + ((p ? p.star || 1 : 1) - 1) * 5; }
  const petScale = (l, star = 1) => (1 + 0.04 * (l - 1)) * (1 + 0.15 * (star - 1));
  function petFx(id, lvl, star = 1, k = 1) {
    const d = PETS[id], o = {}, g = (1 + S.talents.tamer * 0.03 + (gearMods().petPct || 0)) * k;
    for (const x in d.fx) o[x] = d.fx[x] * petScale(lvl, star) * g;
    return Object.assign(o, d.flag || {});
  }
  function petDesc(id, lvl, star = 1, k = 1) {
    const d = PETS[id], v = petFx(id, lvl, star, k);
    return d.desc.replace(/\{(\w+)\}/g, (_, x) => ['killHeal', 'stairHeal'].includes(x) ? (+v[x].toFixed(2)) : Math.round(v[x] * 100));
  }
  function assistSlot() { return S.buildings.nest >= 5; }
  // 出戰寵物全效，助戰寵物 50%（布林能力照樣有效）
  function petMods() {
    const m = {}, add = (id, k) => {
      const p = id && S.pets.own[id]; if (!p) return;
      const f = petFx(id, p.lvl, p.star || 1, k);
      for (const x in f) m[x] = (PETS[id].flag && PETS[id].flag[x]) ? Math.max(m[x] || 0, f[x]) : (m[x] || 0) + f[x];
      if (PETS[id].every) m.petEvery = Math.max(m.petEvery || 1, PETS[id].every);
    };
    add(S.pets.active, 1);
    if (assistSlot() && S.pets.assist !== S.pets.active) add(S.pets.assist, 0.5);
    return m;
  }
  function petUpCost(l) { const k = has('beast') ? 0.8 : 1; return round({ gold: 40 * Math.pow(1.25, l - 1) * k, soul: l * 0.8 * k }); }
  function petUp(id) {
    const p = S.pets.own[id];
    if (!p || p.lvl >= petCap(id) || !pay(petUpCost(p.lvl))) return false;
    p.lvl++; qAdd('petup'); return true;
  }
  function eggPrice() { return { soul: 30 + S.buildings.nest * 5 }; }
  function eggMult() { return 1 + S.talents.eggLuck * 0.2 + (petMods().eggPct || 0) + (has('incubate') ? 0.25 : 0); }
  function buyEgg() {
    if (!S.buildings.nest || S.pets.eggDay === today() || !pay(eggPrice())) return false;
    S.pets.eggDay = today(); S.pets.eggs++; return true;
  }
  function hatch() {
    if (!S.buildings.nest || S.pets.eggs <= 0) return null;
    S.pets.eggs--;
    const l = S.talents.eggLuck, w = [PET_HATCH[0] - 4 * l, PET_HATCH[1], PET_HATCH[2] + 2 * l, PET_HATCH[3] + 1.5 * l];
    const r = rollIdx(w), pool = PET_ORDER.filter(k => PETS[k].r === r), id = randKey(pool);
    const p = S.pets.own[id];
    if (p) {
      // 重複的寵物累積成星級
      if ((p.star || 1) >= 5) { const g = { soul: 20 * (r + 1) }; gain(g); return { id, dup: true, soul: g.soul }; }
      p.dup = (p.dup || 0) + 1;
      let up = false;
      if (p.dup >= PET_STAR_NEED[p.star || 1]) { p.dup = 0; p.star = (p.star || 1) + 1; up = true; }
      return { id, dup: true, star: up ? p.star : 0 };
    }
    S.pets.own[id] = { lvl: 1, star: 1, dup: 0 };
    if (!S.pets.active) S.pets.active = id;
    return { id };
  }

  // ---------- 訓練場 ----------
  function trainSlots() { const l = S.buildings.training; return l >= 8 ? 3 : l >= 4 ? 2 : l >= 1 ? 1 : 0; }
  function trainCap() { return Math.max(...HERO_ORDER.map(h => S.heroes[h].lvl)) - 3; }
  function trainRate(hid) { return xpNeed(S.heroes[hid].lvl) * 0.015 * S.buildings.training * (1 + S.talents.trainer * 0.1 + (has('drill') ? 0.25 : 0)); }
  function trainTick(dt) {
    const out = {};
    S.training = (S.training || []).filter(h => h && S.heroes[h] && S.heroes[h].owned && h !== S.active).slice(0, trainSlots());
    for (const h of S.training) {
      if (S.heroes[h].lvl >= trainCap()) continue;
      const r = addXp(h, trainRate(h) * dt / 3600);
      if (r.ups) out[h] = r.ups;
      if (S.heroes[h].lvl > trainCap()) { S.heroes[h].lvl = trainCap(); S.heroes[h].xp = 0; }
    }
    return out;
  }

  // ---------- 每日任務（星象台） ----------
  function questCount() { return S.buildings.observatory ? 3 + Math.floor(S.buildings.observatory / 3) + (has('astrology') ? 1 : 0) : 0; }
  function questMult() { return (1 + S.buildings.observatory * 0.1) * (1 + S.talents.bounty * 0.15) * (1 + S.stats.bestFloor / 25); }
  function quests() {
    const d = today();
    if (!S.quests || S.quests.date !== d || S.quests.list.length < questCount()) {
      const keep = S.quests && S.quests.date === d ? S.quests.list : [];
      const R = Tower.rng(Tower.hash('quest-' + d + playerId())), tierI = S.stats.bestFloor < 20 ? 0 : S.stats.bestFloor < 50 ? 1 : 2;
      const types = R.shuffle(Object.keys(QUEST_TYPES).filter(k => !keep.some(q => q.type === k)));
      const list = keep.slice();
      while (list.length < questCount() && types.length) { const type = types.pop(); list.push({ type, need: QUEST_TYPES[type].n[tierI], have: 0, claimed: false }); }
      S.quests = { date: d, list, bonus: S.quests && S.quests.date === d ? S.quests.bonus : false };
    }
    return S.quests.list;
  }
  function questReward(q) {
    const r = {}, m = questMult(), base = QUEST_TYPES[q.type].rw;
    for (const k in base) r[k] = k === 'ember' ? base[k] : Math.round(base[k] * m);
    return r;
  }
  // 任務進度：一般是累加，daily 類型記最高值
  function qAdd(type, n = 1) {
    if (!S || !S.buildings.observatory) return;
    for (const q of quests()) if (q.type === type && !q.claimed) q.have = type === 'daily' ? Math.max(q.have, n) : q.have + n;
  }
  function claimQuest(i) {
    const q = quests()[i];
    if (!q || q.claimed || q.have < q.need) return null;
    q.claimed = true; S.stats.quests = (S.stats.quests || 0) + 1;
    const r = questReward(q); gain(r);
    return r;
  }
  function claimQuestBonus() {
    const list = quests();
    if (S.quests.bonus || !list.length || !list.every(q => q.claimed)) return false;
    S.quests.bonus = true; S.pets.eggs++; gain({ ember: 1 });
    return true;
  }

  // ---------- 天賦樹 ----------
  function talentBranch(id) { return Object.keys(TALENT_TREE).find(b => TALENT_TREE[b].nodes.includes(id)); }
  function talentUnlocked(id) {
    const nodes = TALENT_TREE[talentBranch(id)].nodes, i = nodes.indexOf(id);
    return i === 0 || S.talents[nodes[i - 1]] > 0;
  }
  function talentCost(id) {
    const t = TALENTS[id], r = S.talents[id];
    return { [t.cur]: t.cur === 'ember' ? t.base + Math.floor(r / 2) * t.base : Math.ceil(t.base * Math.pow(t.g || 1.45, r)) };
  }
  function talentCap(id) { return Math.min(TALENTS[id].max, S.buildings.altar * 3); }

  // ---------- 寶物記憶 ----------
  function memorySlots() { return 1 + (has('memory') ? 1 : 0); }
  function inscribeCost(id) { return { soul: [0, 20, 45, 90][TREASURES[id].r] }; }

  // ---------- 星星 ----------
  function starCount() { return Object.values(S.stars).reduce((s, b) => s + (b & 1) + (b >> 1 & 1) + (b >> 2 & 1), 0); }
  function zoneStars(z) { let n = 0; for (let f = z * 10 + 1; f <= z * 10 + 10; f++) { const b = S.stars[f] || 0; n += (b & 1) + (b >> 1 & 1) + (b >> 2 & 1); } return n; }

  // ---------- 成就與稱號 ----------
  function newAchievements() { return ACHIEVEMENTS.filter(a => !S.ach[a.id] && a.test(S)); }
  function titles() { return ACHIEVEMENTS.filter(a => a.title && S.ach[a.id]).map(a => a.title); }

  return {
    get S() { return S; }, load, replace, saveLocal, fresh, playerId, setPlayerId, uuid, today, has, buff,
    isDirty: () => dirty, clearDirty: () => { dirty = false; },
    canAfford, pay, gain, bMax, bCost, bLocked, rates, prodMult, stashRates, stashCap, tick, offlineCapHours,
    researchMins, canResearch, startResearch, expSlots, sendExpedition, collectExpedition,
    plotCount, cropMins, plant, harvest, cook,
    xpNeed, xpMult, addXp, heroStats,
    makeGear, gearMain, gearName, gearIcon, gearScore, gearById, equipped, isEquipped, gearTotals, setCounts, gearMods, addGear, dropGear,
    forgeTier, plusCap, craftCost, craftOdds, craft, enhanceCost, enhance, salvageValue, salvage, equip, unequip,
    reforgeCost, reforge, fuseCost, canFuse, fuse,
    petCap, petFx, petDesc, assistSlot, petMods, petUpCost, petUp, eggPrice, eggMult, buyEgg, hatch,
    trainSlots, trainCap, trainRate, quests, questCount, questReward, qAdd, claimQuest, claimQuestBonus, talentBranch, talentUnlocked, talentCost, talentCap,
    memorySlots, inscribeCost, starCount, zoneStars, newAchievements, titles,
  };
})();

function fmt(n) {
  n = Math.floor(n);
  if (n < 10000) return String(n);
  const u = ['K', 'M', 'B', 'T'];
  let i = -1;
  while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
  return (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n)) + u[i];
}
// 內容沒變就不動 DOM，避免圖片重建造成閃爍
function setHtml(el, html) { if (el && el._h !== html) { el._h = html; el.innerHTML = html; } }
function fmtTime(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
  return h ? `${h}時${String(m).padStart(2, '0')}分` : m ? `${m}分${String(sec).padStart(2, '0')}秒` : `${sec}秒`;
}
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
