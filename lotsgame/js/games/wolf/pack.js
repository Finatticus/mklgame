// 狼群模式：領地、狼群、營地與每日流程（純資料與規則，不碰畫面）

// ---------------- 品種與技能 ----------------
// hp／atk 為倍率；tint 為毛色倍率（套在原本灰褐色的狼貼圖上）
export const BREEDS = {
  grey: { name: '灰狼', skill: '撲擊', desc: '撲向遠處的敵人，造成三倍傷害並擊退', hp: 1, atk: 1, tint: [0.92, 0.92, 0.95] },
  red: { name: '赤狼', skill: '撕咬', desc: '咬中的敵人持續流血', hp: 0.9, atk: 1.15, tint: [1.08, 0.66, 0.46] },
  frost: { name: '霜狼', skill: '冰牙', desc: '咬擊緩速，並定時放出冰霜震波', hp: 1, atk: 0.95, tint: [0.88, 0.97, 1.15] },
  shadow: { name: '影狼', skill: '暗襲', desc: '容易爆擊，會閃到敵人背後重擊', hp: 0.8, atk: 1.25, tint: [0.34, 0.32, 0.38] },
  dark: { name: '黑狼', skill: '守護', desc: '血量最厚，吼叫吸引周圍敵人攻擊自己', hp: 1.6, atk: 0.85, tint: [0.5, 0.47, 0.52] },
};
export const WOLF_MAX_LV = 10;
export const allyStats = (w, camp) => {
  const b = BREEDS[w.breed], boost = 1 + 0.1 * ((camp && camp.altar) || 0);
  return { hp: Math.round((100 + 16 * (w.lv - 1)) * b.hp * boost), atk: +((10 + 2.4 * (w.lv - 1)) * b.atk * boost).toFixed(1) };
};
export const xpToNext = (lv) => 18 + lv * 10;

const NAMES = ['霜牙', '灰影', '赤鬃', '夜歌', '銀爪', '疾風', '寒星', '破曉', '墨痕', '鐵脊', '落葉', '孤嶺', '朔月', '白霧', '青嵐', '烈牙', '雪痕', '石心', '殘月', '長嘯'];

// ---------------- 勢力 ----------------
// mix：出征時的敵人組成；boss：攻下領地前要打倒的頭目
export const FACTIONS = {
  den: { name: '狼群', color: [200, 214, 255] },
  spiders: { name: '蛛巢', mix: { hatch: 6, spider: 3 }, boss: 'queen', recruit: 0.25, color: [140, 150, 110] },
  darkwolves: { name: '暗狼部族', mix: { wolf: 7, hatch: 1 }, boss: 'alpha', recruit: 0.75, color: [150, 140, 150] },
  nightmare: { name: '夢魘', mix: { horse: 3, wolf: 4 }, boss: 'stallion', recruit: 0.3, color: [160, 110, 110] },
  drakes: { name: '灰翼', mix: { drake: 3, wolf: 3, spider: 1 }, boss: 'dragon', recruit: 0.2, color: [170, 120, 90] },
  mixed: { name: '混亂之地', mix: { hatch: 3, wolf: 4, spider: 2, horse: 2, drake: 1 }, boss: 'alpha', recruit: 0.45, color: [130, 130, 140] },
};

// ---------------- 領地 ----------------
// x,y 是地圖上的位置（0–1，直式地圖），adj 是相鄰的領地
export const REGIONS = [
  { id: 'vale', name: '月光谷', biome: 'forest', faction: 'den', lv: 0, food: 3, x: 0.5, y: 0.88, adj: ['moss', 'deadwood', 'howl'] },
  { id: 'moss', name: '苔石林', biome: 'forest', faction: 'darkwolves', lv: 1, food: 2, x: 0.2, y: 0.78, adj: ['vale', 'deadwood', 'creek'] },
  { id: 'deadwood', name: '枯木坡', biome: 'forest', faction: 'spiders', lv: 1, food: 2, x: 0.78, y: 0.76, adj: ['vale', 'moss', 'howl', 'altar'] },
  { id: 'howl', name: '狼嚎崖', biome: 'forest', faction: 'darkwolves', lv: 2, food: 3, x: 0.52, y: 0.64, adj: ['vale', 'deadwood', 'creek', 'pines', 'altar'] },
  { id: 'creek', name: '蛛網溪谷', biome: 'forest', faction: 'spiders', lv: 2, food: 3, x: 0.18, y: 0.56, adj: ['moss', 'howl', 'pines'] },
  { id: 'altar', name: '古祭壇', biome: 'forest', faction: 'nightmare', lv: 3, food: 3, x: 0.82, y: 0.54, adj: ['deadwood', 'howl', 'pines', 'moor'] },
  { id: 'pines', name: '黑松林', biome: 'forest', faction: 'mixed', lv: 3, food: 4, x: 0.42, y: 0.45, adj: ['howl', 'creek', 'altar', 'tundra', 'moor'] },
  { id: 'tundra', name: '霜原', biome: 'frost', faction: 'darkwolves', lv: 3, food: 3, x: 0.2, y: 0.33, adj: ['pines', 'lake', 'ruins'] },
  { id: 'moor', name: '夢魘荒原', biome: 'frost', faction: 'nightmare', lv: 4, food: 3, x: 0.78, y: 0.36, adj: ['altar', 'pines', 'ruins', 'nest'] },
  { id: 'lake', name: '冰湖', biome: 'frost', faction: 'spiders', lv: 4, food: 4, x: 0.16, y: 0.15, adj: ['tundra', 'ruins'] },
  { id: 'ruins', name: '斷碑遺跡', biome: 'frost', faction: 'drakes', lv: 4, food: 4, x: 0.48, y: 0.24, adj: ['tundra', 'moor', 'lake', 'nest'] },
  { id: 'nest', name: '焚翼之巢', biome: 'frost', faction: 'drakes', lv: 5, food: 5, x: 0.74, y: 0.12, adj: ['moor', 'ruins'], final: true },
];
export const regionById = (id) => REGIONS.find((r) => r.id === id);

// ---------------- 營地建築 ----------------
export const BUILDINGS = {
  den: { name: '巢穴', label: '狼群上限', val: (lv) => 3 + lv + ' 匹', max: 3, cost: [25, 50, 90] },
  hunt: { name: '獵場', label: '每天食物', val: (lv) => '+' + lv * 2, max: 3, cost: [20, 40, 70] },
  altar: { name: '月石', label: '狼群生命與攻擊', val: (lv) => '+' + lv * 10 + '%', max: 3, cost: [30, 60, 100] },
};
export const packCap = (c) => 3 + (c.camp.den || 0);
export const BATTLE_ALLIES = 5;

// ---------------- 存檔 ----------------
let uid = 0;
function newWolf(breed, lv = 1, used = []) {
  const pool = NAMES.filter((n) => !used.includes(n));
  const name = pool[Math.floor(Math.random() * pool.length)] || '無名';
  return { id: Date.now().toString(36) + (uid++), name, breed, lv, xp: 0, injured: 0 };
}
export function newCampaign() {
  const owner = {};
  for (const r of REGIONS) owner[r.id] = r.faction;
  const c = { v: 1, day: 1, food: 20, owner, rlv: Object.fromEntries(REGIONS.map((r) => [r.id, r.lv])), wolves: [], camp: { den: 0, hunt: 0, altar: 0 }, threat: null, log: [], won: false, battles: 0 };
  const a = newWolf('grey', 1, []);
  c.wolves.push(a, newWolf('red', 1, [a.name]));
  return c;
}
export const owned = (c, id) => c.owner[id] === 'den';
export const canAttack = (c, r) => !owned(c, r.id) && r.adj.some((a) => owned(c, a));
export const ownedCount = (c) => REGIONS.filter((r) => owned(c, r.id)).length;
export const healthyWolves = (c) => c.wolves.filter((w) => !w.injured);
export const income = (c) => REGIONS.filter((r) => owned(c, r.id)).reduce((a, r) => a + r.food, 0) + 2 * (c.camp.hunt || 0);
export const upkeep = (c) => c.wolves.length;

// 出征設定：敵人組成與難度
export function battleSpec(c, regionId, kind) {
  const r = regionById(regionId);
  const lv = kind === 'defend' ? Math.max(1, (c.threat && c.threat.lv) || r.lv) : c.rlv[regionId] || r.lv;
  const faction = kind === 'defend' ? c.threat.faction : c.owner[regionId];
  const F = FACTIONS[faction];
  return {
    kind, regionId, name: r.name, biome: r.biome, faction, lv, final: !!r.final,
    mix: F.mix, boss: r.final ? 'dragon' : F.boss,
    kills: kind === 'defend' ? 0 : 120 + lv * 60, // 壓制度：擊倒數
    time: kind === 'defend' ? 140 + lv * 15 : 0, // 防守：撐過的秒數
  };
}

// 一天結束：收入、消耗、傷勢恢復、敵方反攻
export function endDay(c, msgs) {
  const inc = income(c), up = upkeep(c);
  c.food += inc - up;
  msgs.push('領地產出食物 ' + inc + '，狼群吃掉 ' + up);
  if (c.food < 0) { c.food = 0; c.hungry = true; msgs.push('食物不足，狼群挨餓：下一場出征生命與攻擊 −20%'); } else c.hungry = false;
  for (const w of c.wolves) if (w.injured > 0) { w.injured--; if (!w.injured) msgs.push(w.name + ' 傷癒歸隊'); }
  c.day++;
  // 敵方反攻：從相鄰的敵方領地挑一塊我方邊境（不含月光谷）
  if (!c.threat && c.day >= 3 && Math.random() < 0.3) {
    const targets = REGIONS.filter((r) => owned(c, r.id) && r.id !== 'vale' && r.adj.some((a) => !owned(c, a)));
    if (targets.length) {
      const t = targets[Math.floor(Math.random() * targets.length)];
      const from = t.adj.map(regionById).filter((r) => !owned(c, r.id));
      const src = from[Math.floor(Math.random() * from.length)];
      c.threat = { region: t.id, faction: c.owner[src.id], lv: c.rlv[src.id] || src.lv, from: src.id, day: c.day };
      msgs.push(FACTIONS[c.threat.faction].name + ' 從' + src.name + '進攻' + t.name + '，今天不防守就會失守');
    }
  }
}
// 當天沒有去防守（或防守失敗）就失守
export function resolveThreat(c, msgs) {
  if (!c.threat) return;
  const t = c.threat;
  c.owner[t.region] = t.faction;
  c.rlv[t.region] = Math.max(c.rlv[t.region] || 1, t.lv);
  msgs.push(regionById(t.region).name + ' 失守，被' + FACTIONS[t.faction].name + '佔領');
  c.threat = null;
}

// 出征結束
// res: { win, allies: [{id, kills, down}], elitesWolf }
export function afterBattle(c, spec, res) {
  const msgs = [];
  const gained = [];
  c.battles++;
  for (const a of res.allies) {
    const w = c.wolves.find((x) => x.id === a.id);
    if (!w) continue;
    if (a.down) { w.injured = 2; msgs.push(w.name + ' 受傷，需要休養兩天'); }
    if (w.lv < WOLF_MAX_LV) {
      w.xp += Math.round(a.kills * 0.35 + (res.win ? 10 + spec.lv * 4 : 3));
      while (w.lv < WOLF_MAX_LV && w.xp >= xpToNext(w.lv)) { w.xp -= xpToNext(w.lv); w.lv++; gained.push(w.name + ' 升到 Lv ' + w.lv); }
    }
  }
  let food = 0, recruit = null;
  if (res.win) {
    food = 4 + spec.lv * 4;
    c.food += food;
    if (spec.kind === 'defend') { msgs.push('守住了' + spec.name); c.threat = null; }
    else {
      c.owner[spec.regionId] = 'den';
      msgs.push('攻下' + spec.name);
      if (spec.final || REGIONS.every((r) => owned(c, r.id))) c.won = true;
    }
    // 收服：暗狼部族最容易，其他勢力偶爾遇到流浪狼
    const F = FACTIONS[spec.faction];
    const chance = Math.min(0.95, (F.recruit || 0.3) + (res.elitesWolf || 0) * 0.2);
    if (Math.random() < chance) {
      const r = regionById(spec.regionId);
      const breeds = spec.faction === 'darkwolves' ? ['dark', 'grey', 'shadow'] : r.biome === 'frost' ? ['frost', 'shadow', 'grey'] : ['grey', 'red', 'red'];
      const lv = Math.max(1, Math.min(WOLF_MAX_LV, spec.lv + Math.floor(Math.random() * 2)));
      recruit = newWolf(breeds[Math.floor(Math.random() * breeds.length)], lv, c.wolves.map((w) => w.name));
    }
  } else {
    msgs.push(spec.kind === 'defend' ? spec.name + ' 沒守住' : '撤退回月光谷');
    if (spec.kind === 'defend') resolveThreat(c, msgs);
  }
  return { msgs, gained, food, recruit };
}
export function addWolf(c, w) { c.wolves.push(w); }
export function hunt(c) {
  const f = 6 + 2 * (c.camp.hunt || 0);
  c.food += f;
  for (const w of c.wolves) if (w.injured > 0) w.injured = Math.max(0, w.injured - 1); // 休養多恢復一天
  return f;
}
