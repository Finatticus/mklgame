// 月下白狼：武器、被動、敵人、波次與局外成長的數值表。
// 單位：公尺、秒。數值參考同類「倖存者」遊戲的節奏：前 5 分鐘建立組合，10 分鐘後敵潮成形，15 分鐘最終頭目。

export const RUN_SECONDS = 15 * 60;
export const MAX_WEAPONS = 6;
export const MAX_PASSIVES = 6;
export const WEAPON_MAX = 6;
export const PASSIVE_MAX = 5;

// 升級所需經驗
export const xpNeed = (lv) => Math.round(4 + (lv - 1) * 3.4 + Math.pow(lv - 1, 1.5) * 0.5);

// ---------------- 武器 ----------------
// lv 表示每一級的描述；evo 為進化條件（武器滿級 + 擁有指定被動）
export const WEAPONS = {
  claw: {
    name: '月牙爪', evo: 'clawX', need: 'might',
    desc: ['向前揮出月牙形爪擊', '範圍加大', '同時向後揮擊', '傷害 +40%', '冷卻縮短 15%', '傷害與範圍再提升'],
    base: { cd: 1.1, dmg: 18, range: 2.8, arc: 2.6 },
  },
  frost: {
    name: '霜息', evo: 'frostX', need: 'area',
    desc: ['朝前方吐出寒霜，緩速敵人', '射程加長', '傷害 +40%', '持續時間加長', '緩速更強', '傷害與射程再提升'],
    base: { cd: 3.2, dmg: 5, range: 4.6, cone: 0.55, dur: 1.2, slow: 0.35 },
  },
  orbit: {
    name: '月輪', evo: 'orbitX', need: 'cool',
    desc: ['月光碎片環繞身邊', '碎片 +1', '傷害 +40%', '碎片 +1', '持續時間加長', '碎片 +1，速度加快'],
    base: { cd: 6.5, dmg: 11, radius: 2.5, dur: 4, n: 1, speed: 3.2 },
  },
  ghost: {
    name: '幽狼', evo: 'ghostX', need: 'speed',
    desc: ['召喚幽靈狼撲向敵群', '幽狼 +1', '傷害 +40%', '幽狼 +1', '冷卻縮短 20%', '幽狼 +1，傷害再提升'],
    base: { cd: 4.2, dmg: 22, n: 1, dash: 13, dur: 0.95 },
  },
  thunder: {
    name: '雷擊', evo: 'thunderX', need: 'magnet',
    desc: ['落雷轟擊附近的敵人', '落雷 +1', '傷害 +40%', '落雷 +1', '範圍加大', '落雷 +2'],
    base: { cd: 2.9, dmg: 28, n: 1, aoe: 1.3 },
  },
  wisp: {
    name: '鬼火', evo: 'wispX', need: 'regen',
    desc: ['發射追蹤敵人的鬼火', '鬼火 +1', '傷害 +40%', '貫穿 +1', '鬼火 +1', '冷卻縮短 20%，傷害提升'],
    base: { cd: 1.45, dmg: 10, n: 1, speed: 10, pierce: 1 },
  },
};

// 進化後的武器（取代原本的武器）
export const EVOS = {
  clawX: { from: 'claw', name: '天狼裂爪', desc: '環身雙重爪擊，傷害翻倍，留下撕裂的爪痕' },
  frostX: { from: 'frost', name: '永凍風暴', desc: '身邊捲起不停的冰風，緩速並凍結敵人' },
  orbitX: { from: 'orbit', name: '滿月輪', desc: '六片月輪永久環繞，範圍與傷害大幅提升' },
  ghostX: { from: 'ghost', name: '狼魂群', desc: '八匹幽狼來回撲殺，冷卻大幅縮短' },
  thunderX: { from: 'thunder', name: '雷暴', desc: '落雷會連鎖跳到附近三個敵人' },
  wispX: { from: 'wisp', name: '魂燈', desc: '鬼火貫穿三個敵人，擊殺時回復生命' },
};

// ---------------- 被動 ----------------
export const PASSIVES = {
  might: { name: '利齒', desc: '傷害 +10%' },
  armor: { name: '厚毛', desc: '受到的傷害 −1' },
  speed: { name: '疾風', desc: '移動速度 +8%' },
  cool: { name: '月華', desc: '冷卻時間 −6%' },
  area: { name: '野性', desc: '攻擊範圍 +9%' },
  magnet: { name: '狼嗅', desc: '拾取範圍 +30%' },
  regen: { name: '恢復', desc: '每秒回復 0.3 生命' },
  vigor: { name: '血脈', desc: '生命上限 +15%' },
};

// ---------------- 敵人 ----------------
// model：使用的模型；scale：模型縮放；tint：毛色倍率；r：碰撞半徑
export const ENEMIES = {
  hatch: { name: '幼蛛', model: 'spider', scale: 0.42, tint: [0.85, 0.78, 0.72], r: 0.45, hp: 6, speed: 3.3, dmg: 3, xp: 1, anim: 'run' },
  wolf: { name: '暗狼', model: 'wolf', scale: 0.82, tint: [0.6, 0.56, 0.58], r: 0.6, hp: 14, speed: 3.9, dmg: 5, xp: 2, anim: 'run' },
  spider: { name: '巨蛛', model: 'spider', scale: 0.9, tint: [1, 1, 1], r: 0.95, hp: 40, speed: 2.5, dmg: 8, xp: 4, anim: 'walk' },
  horse: { name: '夢魘戰馬', model: 'horse', scale: 0.82, tint: [0.42, 0.38, 0.42], r: 0.95, hp: 70, speed: 3.0, dmg: 12, xp: 6, anim: 'walk', charger: true },
  drake: { name: '灰翼飛龍', model: 'drake', scale: 0.21, tint: [1, 0.95, 0.9], r: 0.9, hp: 45, speed: 3.6, dmg: 7, xp: 6, anim: 'fly', flyer: true, shooter: true },
};

export const BOSSES = [
  { at: 5 * 60, id: 'alpha', name: '狼王「灰鬃」', model: 'wolf', scale: 2.3, tint: [0.62, 0.58, 0.6], hp: 3200, speed: 4.6, dmg: 18, r: 1.6, reward: 400 },
  { at: 10 * 60, id: 'queen', name: '蛛后「織夜」', model: 'spider', scale: 3.0, tint: [0.75, 0.62, 0.62], hp: 9000, speed: 2.9, dmg: 22, r: 2.6, reward: 800 },
  { at: 15 * 60, id: 'dragon', name: '灰燼飛龍「焚翼」', model: 'drake', scale: 0.58, tint: [1, 0.9, 0.85], hp: 26000, speed: 3.8, dmg: 26, r: 2.8, reward: 1500 },
];

// 每分鐘的出怪設定：rate 每秒生成數、cap 場上上限、mix 種類權重
export const WAVES = [
  { t: 0, rate: 1.6, cap: 45, mix: { hatch: 6, wolf: 3 } },
  { t: 60, rate: 2.3, cap: 65, mix: { hatch: 5, wolf: 5, spider: 1 } },
  { t: 150, rate: 2.8, cap: 80, mix: { hatch: 4, wolf: 5, spider: 2, horse: 1 } },
  { t: 240, rate: 3.2, cap: 90, mix: { hatch: 3, wolf: 6, spider: 3, horse: 2 } },
  { t: 300, rate: 2.0, cap: 65, mix: { wolf: 4, hatch: 4 } }, // 狼王登場時減少雜兵
  { t: 360, rate: 3.6, cap: 105, mix: { hatch: 4, wolf: 5, spider: 3, horse: 2, drake: 1 } },
  { t: 480, rate: 4.0, cap: 120, mix: { hatch: 2, wolf: 5, spider: 4, horse: 3, drake: 2 } },
  { t: 600, rate: 2.4, cap: 85, mix: { hatch: 8, spider: 2 } }, // 蛛后
  { t: 660, rate: 4.4, cap: 135, mix: { hatch: 4, wolf: 6, spider: 4, horse: 3, drake: 3 } },
  { t: 780, rate: 5.0, cap: 150, mix: { hatch: 2, wolf: 6, spider: 5, horse: 4, drake: 4 } },
  { t: 900, rate: 2.6, cap: 90, mix: { wolf: 4, drake: 3 } }, // 最終頭目
];
// 包圍事件：時間點出現一圈敵人
export const SWARMS = [
  { t: 135, kind: 'hatch', n: 26 },
  { t: 270, kind: 'wolf', n: 18 },
  { t: 420, kind: 'hatch', n: 40 },
  { t: 540, kind: 'wolf', n: 28 },
  { t: 720, kind: 'spider', n: 22 },
  { t: 840, kind: 'horse', n: 16 },
];

// ---------------- 地圖 ----------------
export const MAPS = {
  forest: {
    name: '月影森林', sub: '苔蘚與落葉覆蓋的夜林', hp: 1, reward: 1,
    ground: ['forest_leaves_04', 'forest_leaves_03'], tile: [2.7, 2.3],
    moon: 0xa9bcff, moonI: 1.9, hemi: [0x6a7fb5, 0x16130f, 0.3], env: 'qwantani_night_256', envI: 0.32, exposure: 0.82,
    props: { rocks: 0.9, stump: 0.5, trunk: 0.5, quiver: 0.15, statue: 0.06, fire: 0.05, fern: 9, shrub: 4, branch: 3, pebble: 6 },
  },
  frost: {
    name: '霜原遺跡', sub: '雪原上的焦土與殘像', hp: 1.3, reward: 1.3, unlock: '在月影森林存活 10 分鐘',
    ground: ['snow_02', 'burned_ground_01'], tile: [3.0, 3.4],
    moon: 0xc4d4ff, moonI: 1.35, hemi: [0x9fb2d8, 0x2a2a30, 0.5], env: 'rogland_moonlit_night_256', envI: 0.5, exposure: 0.95,
    props: { rocks: 1.0, stump: 0.2, trunk: 0.4, quiver: 0.5, statue: 0.12, fire: 0.07, fern: 0, shrub: 1.2, branch: 2.5, pebble: 6 },
  },
};

// ---------------- 局外成長（魂石商店） ----------------
export const META = {
  vigor: { name: '血脈', desc: '生命上限 +8%', max: 5, cost: 40 },
  might: { name: '利齒', desc: '傷害 +5%', max: 5, cost: 50 },
  armor: { name: '厚毛', desc: '受到的傷害 −1', max: 3, cost: 70 },
  speed: { name: '疾風', desc: '移動速度 +4%', max: 3, cost: 60 },
  cool: { name: '月華', desc: '冷卻時間 −3%', max: 3, cost: 80 },
  area: { name: '野性', desc: '攻擊範圍 +4%', max: 3, cost: 60 },
  magnet: { name: '狼嗅', desc: '拾取範圍 +15%', max: 3, cost: 40 },
  growth: { name: '成長', desc: '獲得經驗 +5%', max: 5, cost: 60 },
  greed: { name: '貪婪', desc: '獲得魂石 +10%', max: 5, cost: 50 },
  revive: { name: '不屈', desc: '倒下時復活一次，回復一半生命', max: 1, cost: 400 },
};
export const metaCost = (k, lv) => Math.round(META[k].cost * (1 + lv * 0.75));
