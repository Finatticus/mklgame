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
    HERO_ORDER.forEach(h => heroes[h] = { owned: h === 'knight', lvl: 1, xp: 0, weapon: 0, armor: 0, awaken: 0, branch: null });
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
    for (const k in f) if (s[k] === undefined) s[k] = f[k];
    for (const grp of ['res', 'stash', 'buildings', 'talents', 'stats', 'settings', 'tower', 'research', 'farm', 'memory'])
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
      for (const k in b.prod) r[k] += b.prod[k] * l * Math.pow(1.08, l - 1) * mult;
    }
    return r;
  }
  // 倉庫：鑰匙工坊與藥師小屋的慢速產出（每小時）
  function stashRates() {
    const k = S.buildings.keysmith, a = S.buildings.apothecary, m = has('keys') ? 1.5 : 1;
    return { Y: k * 0.5 * m, B: k >= 3 ? (k - 2) * 0.15 * m : 0, potion: a * 0.4 };
  }
  function stashCap() { return { Y: 3 + S.buildings.keysmith * 2, B: 1 + Math.floor(S.buildings.keysmith / 2), potion: 2 + S.buildings.apothecary * 2 }; }
  function offlineCapHours() { return CONFIG.OFFLINE_BASE_HOURS + S.buildings.hearth + (has('prosper') ? 4 : 0); }

  // ---------- 研究 ----------
  function researchMins(id) { return RESEARCH[id].time / (1 + S.buildings.study * 0.1 + (buff('study') ? 0.5 : 0)); }
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
    addXp(e.hero, Math.round(8 * e.hours));
    S.expeditions.splice(idx, 1);
    return { got, extra, hero: e.hero };
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
    spawnVisitor(now);
    return { got, dt };
  }

  // ---------- 英雄 ----------
  function xpNeed(lvl) { return Math.round(15 * Math.pow(lvl, 1.6)); }
  function xpMult() {
    return (1 + S.buildings.tavern * 0.1) * (buff('xp') ? 1.3 : 1) * (S.buffs.bard === today() ? 1.1 : 1) * (has('bestiary') ? 1.15 : 1);
  }
  function gearMax() { return S.buildings.forge * 2; }
  function gearCost(slot, l) {
    return slot === 'weapon'
      ? round({ ore: 15 * Math.pow(1.4, l), gold: 12 * Math.pow(1.4, l) })
      : round({ ore: 12 * Math.pow(1.4, l), wood: 20 * Math.pow(1.4, l) });
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
    let atk = d.atk + (h.lvl - 1) + h.weapon * 2 + t.might + (has('tactics') ? 2 : 0) + (buff('atk') ? 3 : 0);
    let def = d.def + (h.lvl - 1) + h.armor * 2 + t.guard + (has('armor') ? 2 : 0) + (buff('def') ? 3 : 0);
    let hp = d.hp + (h.lvl - 1) * 50 + t.vigor * 100;
    if (h.awaken >= 3) { atk = Math.floor(atk * 1.1); def = Math.floor(def * 1.1); hp = Math.floor(hp * 1.1); }
    return { atk, def, hp };
  }

  // ---------- 天賦樹 ----------
  function talentBranch(id) { return Object.keys(TALENT_TREE).find(b => TALENT_TREE[b].nodes.includes(id)); }
  function talentUnlocked(id) {
    const nodes = TALENT_TREE[talentBranch(id)].nodes, i = nodes.indexOf(id);
    return i === 0 || S.talents[nodes[i - 1]] > 0;
  }
  function talentCost(id) {
    const t = TALENTS[id], r = S.talents[id];
    return { [t.cur]: t.cur === 'ember' ? t.base : Math.ceil(t.base * Math.pow(1.45, r)) };
  }
  function talentCap(id) { return Math.min(TALENTS[id].max, S.buildings.altar); }

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
    xpNeed, xpMult, gearMax, gearCost, addXp, heroStats, talentBranch, talentUnlocked, talentCost, talentCap,
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
function fmtTime(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
  return h ? `${h}時${String(m).padStart(2, '0')}分` : m ? `${m}分${String(sec).padStart(2, '0')}秒` : `${sec}秒`;
}
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
