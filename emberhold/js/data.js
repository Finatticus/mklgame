// 所有靜態遊戲資料（圖片 key 對應 assets/<key>.webp）
const RES = {
  wood:  { name: '木材', icon: 'item/axe' },
  ore:   { name: '礦石', icon: 'item/crystal_green' },
  gold:  { name: '金幣', icon: 'icon/goldcoins' },
  soul:  { name: '魂晶', icon: 'item/gem_purple' },
  ember: { name: '餘燼', icon: 'item/torch' },
};

// ---------- 營地建築：每棟由一位營地成員負責 ----------
const BUILDINGS = {
  hearth: {
    name: '篝火', npc: null, tool: null, max: 10,
    desc: '營地之心。每級使其他建築上限 +5，離線收益時數 +1，營地也會更熱鬧。',
    cost(l) {
      const c = { wood: 40 * Math.pow(2.2, l), ore: 20 * Math.pow(2.2, l - 1) };
      if (l >= 2) c.soul = 10 * Math.pow(1.8, l - 2);
      if (l >= 5) c.ember = (l - 4) * 2;
      return c;
    },
  },
  lumber: { name: '伐木場', npc: 'mon/giant', tool: 'item/axe', prod: { wood: 0.6 },
    desc: '巨人樵夫在林間伐木。', base: { wood: 12 }, growth: 1.45, req: 1 },
  mine: { name: '礦坑', npc: 'mon/orc', tool: 'item/crystal_green', prod: { ore: 0.35 },
    desc: '獸人礦工開採礦石。', base: { wood: 30 }, growth: 1.5, req: 1 },
  market: { name: '市集', npc: 'mon/goblinboomer', tool: 'icon/goldcoins', prod: { gold: 0.3 },
    desc: '哥布林商人帶來金幣。', base: { wood: 40, ore: 20 }, growth: 1.55, req: 2 },
  forge: { name: '鐵匠鋪', npc: 'mon/minotaur', tool: 'item/sword',
    desc: '打造與強化裝備。等級越高，打造的品階越高、強化上限越高。', base: { wood: 60, ore: 40 }, growth: 1.7, req: 1 },
  keysmith: { name: '鑰匙工坊', npc: 'mon/goblinhermit', tool: 'item/key_y', max: 10,
    desc: '隱士慢慢打造鑰匙，進主塔時自動帶上。Lv3 起也會做藍鑰匙。', base: { wood: 50, ore: 30 }, growth: 1.75, req: 1 },
  apothecary: { name: '藥師小屋', npc: 'mon/hag', tool: 'item/potion_red', max: 10,
    desc: '女巫熬製治療藥水，進主塔時自動帶上。', base: { wood: 50, ore: 20, gold: 30 }, growth: 1.75, req: 2 },
  farm: { name: '農田', npc: 'mon/treefolk', tool: 'item/potion_green', max: 10,
    desc: '樹人照顧作物。每級 +1 塊田，作物可以拿去做料理。', base: { wood: 60, gold: 20 }, growth: 1.6, req: 2 },
  tavern: { name: '酒館', npc: 'mon/hellionminstrel', tool: 'item/potion_yellow', max: 8,
    desc: '招募英雄、派遣探索。每級英雄經驗 +10%。', base: { wood: 80, gold: 50 }, growth: 1.8, req: 2 },
  study: { name: '研究院', npc: 'mon/planaradept', tool: 'item/scroll_blue', max: 10,
    desc: '研究新技術。每級研究速度 +10%，並解鎖更多研究項目。', base: { wood: 90, ore: 60, gold: 40 }, growth: 1.8, req: 2 },
  nest: { name: '寵物小窩', npc: 'mon/blob1', tool: 'item/backpack', max: 10,
    desc: '孵化寵物蛋、照顧寵物。每級寵物等級上限 +3，第一次蓋好送一顆蛋。', base: { wood: 70, gold: 40 }, growth: 1.75, req: 2 },
  altar: { name: '魂之祭壇', npc: 'mon/cabalistnun', tool: 'item/book', max: 10,
    desc: '以魂晶習得天賦、每日祈福、英雄覺醒。天賦等級上限 = 祭壇等級。', base: { wood: 100, ore: 60, soul: 10 }, growth: 1.9, req: 2 },
};
const BUILDING_ORDER = ['hearth', 'lumber', 'mine', 'market', 'forge', 'keysmith', 'apothecary', 'farm', 'tavern', 'nest', 'study', 'altar'];

// ---------- 英雄 ----------
// 覺醒 1 強化被動；覺醒 2 選分支 A／B；覺醒 3 全屬性 +10%
const HEROES = {
  knight: {
    name: '龍裔騎士', icon: 'mon/dragonkinknight', color: '#ff8a65', atk: 10, def: 12, hp: 1000, tavern: 0, cost: null,
    lore: '流著龍血的騎士，皮厚得連刀劍都怕他。',
    passive: '受到的傷害 −10%', passive2: '受到的傷害 −18%',
    skill: { id: 'shield', name: '龍鱗盾', uses: 1, desc: '下一場戰鬥完全不受傷' },
    branch: { A: '龍鱗盾每層 +1 次', B: '龍鱗盾那一場的經驗 ×2' },
  },
  ranger: {
    name: '深林遊俠', icon: 'mon/deepranger', color: '#7ee08a', atk: 12, def: 9, hp: 900, tavern: 1, cost: { gold: 150 },
    lore: '在深林裡長大，永遠比怪物快一步。',
    passive: '永遠先攻（無視怪物的先攻）', passive2: '永遠先攻，且對野獸系攻擊 +20%',
    skill: { id: 'pierce', name: '穿甲箭', uses: 1, desc: '下一場戰鬥無視怪物防禦' },
    branch: { A: '穿甲箭每層 +1 次', B: '穿甲箭那一場的怪物少攻擊一次' },
  },
  wizard: {
    name: '精靈法師', icon: 'mon/deepelfwizard', color: '#b892ff', atk: 11, def: 8, hp: 850, tavern: 2, cost: { gold: 400, soul: 20 },
    lore: '能看穿怪物的弱點，也能穿過牆壁。',
    passive: '魔法攻擊：無視怪物 20% 防禦', passive2: '魔法攻擊：無視怪物 35% 防禦',
    skill: { id: 'phase', name: '穿牆術', uses: 1, desc: '擊碎旁邊的一面牆' },
    branch: { A: '穿牆術每層 +1 次', B: '穿牆術也能擊碎鐵門與藤蔓' },
  },
  assassin: {
    name: '暗影刺客', icon: 'mon/deepelfassassin', color: '#ff7b8a', atk: 11, def: 9, hp: 900, tavern: 3, cost: { gold: 800, soul: 60 },
    lore: '沒有打不開的鎖，也沒有偷不到的錢包。',
    passive: '塔內金幣 +50%', passive2: '塔內金幣 +80%，且不會被偷錢',
    skill: { id: 'pick', name: '開鎖', uses: 2, desc: '不用鑰匙打開旁邊一扇黃門' },
    branch: { A: '開鎖每層 +1 次', B: '開鎖也能打開藍門' },
  },
  guardian: {
    name: '聖殿守衛', icon: 'mon/sanctumguardian', color: '#ffd27a', atk: 8, def: 16, hp: 1100, tavern: 4, cost: { gold: 1500, soul: 120 },
    lore: '古老神殿的守護者，盾牌從未倒下。',
    passive: '藍寶石效果 ×1.5，紅寶石效果 ×0.75', passive2: '藍寶石效果 ×1.75，紅寶石效果 ×0.85',
    skill: { id: 'bastion', name: '堡壘', uses: 1, desc: '本層所有怪物攻擊 −20%' },
    branch: { A: '堡壘改為 −30%', B: '堡壘同時讓本層怪物的先攻失效' },
  },
  vampire: {
    name: '血族公子', icon: 'mon/vampirechilder', color: '#ff5a7a', atk: 13, def: 8, hp: 800, tavern: 5, cost: { gold: 2500, soul: 200 },
    lore: '靠戰鬥維生的血族，藥水對他來說太淡了。',
    passive: '每次擊殺回復 0.8U 生命；藥水效果減半', passive2: '每次擊殺回復 1.2U 生命；藥水效果減半',
    skill: { id: 'feast', name: '血宴', uses: 1, desc: '下一場戰鬥損失的生命全部吸回' },
    branch: { A: '血宴每層 +1 次', B: '血宴吸回 150%' },
  },
  catkin: {
    name: '貓族術士', icon: 'mon/catkinwarlock', color: '#ffb547', atk: 11, def: 10, hp: 900, tavern: 6, cost: { gold: 4000, soul: 300 },
    lore: '對閃亮的東西毫無抵抗力。',
    passive: '塔內金幣 +100%，寶石效果 −25%', passive2: '塔內金幣 +150%，寶石效果 −15%',
    skill: { id: 'midas', name: '點金術', uses: 1, desc: '把旁邊一隻普通怪物變成金幣（沒有經驗）' },
    branch: { A: '點金術每層 +1 次', B: '點金術也能用在精英身上' },
  },
  apprentice: {
    name: '星象學徒', icon: 'mon/darkapprentice', color: '#9ad8ff', atk: 10, def: 10, hp: 950, tavern: 7, cost: { gold: 6000, soul: 450 },
    lore: '看得見別人看不見的東西：暗牆、隱形的怪、未來的路。',
    passive: '看得見暗牆與隱形怪物；黑暗樓層視野 +2', passive2: '同上，且經驗 +20%',
    skill: { id: 'analyze', name: '解析', uses: 1, desc: '下一場戰鬥怪物防禦 −50%' },
    branch: { A: '解析每層 +1 次', B: '解析改為 −75%' },
  },
};
const HERO_ORDER = ['knight', 'ranger', 'wizard', 'assassin', 'guardian', 'vampire', 'catkin', 'apprentice'];
const AWAKEN_COST = [3, 6, 10]; // 餘燼

// ---------- 天賦樹（祭壇） ----------
// 每條分支依序解鎖：前一個天賦至少 1 級才能學下一個
const TALENT_TREE = {
  battle:  { name: '戰鬥', color: '#ff8a65', nodes: ['might', 'hunter', 'fury', 'focus'] },
  guard:   { name: '守護', color: '#74c0fc', nodes: ['guard', 'vigor', 'antidote', 'aegis'] },
  explore: { name: '探索', color: '#7ee08a', nodes: ['locksmith', 'alchemy', 'scout', 'blessing'] },
  wealth:  { name: '財富', color: '#ffd27a', nodes: ['fortune', 'reaper', 'industry', 'midas'] },
};
const TALENTS = {
  might:    { name: '力量',     icon: 'item/sword',          max: 10, desc: '攻擊 +1',                       base: 5,  cur: 'soul' },
  hunter:   { name: '獵手',     icon: 'item/bow',            max: 5,  desc: '對精英與首領攻擊 +5%',          base: 8,  cur: 'soul' },
  fury:     { name: '戰意',     icon: 'item/sword_fire',     max: 5,  desc: '每層第一場戰鬥攻擊 +10%',       base: 10, cur: 'soul' },
  focus:    { name: '專注',     icon: 'item/scroll_red',     max: 1,  desc: '英雄技能每層 +1 次',            base: 4,  cur: 'ember', altar: 3 },
  guard:    { name: '守護',     icon: 'item/shield',         max: 10, desc: '防禦 +1',                       base: 5,  cur: 'soul' },
  vigor:    { name: '活力',     icon: 'item/potion_red',     max: 10, desc: '初始生命 +100',                 base: 4,  cur: 'soul' },
  antidote: { name: '抗毒',     icon: 'item/ring_green',     max: 3,  desc: '中毒、岩漿、反傷、爆裂的損失 −25%', base: 10, cur: 'soul' },
  aegis:    { name: '神盾',     icon: 'item/shield_gold',    max: 1,  desc: '每層第一場戰鬥損失 −50%',       base: 6,  cur: 'ember', altar: 5 },
  locksmith:{ name: '鎖匠',     icon: 'item/key_y',          max: 3,  desc: '挑戰塔開局、主塔進入新區域時 +1 黃鑰匙', base: 10, cur: 'soul' },
  alchemy:  { name: '煉金',     icon: 'item/potion_teal',    max: 5,  desc: '所有藥水回復 +10%',             base: 8,  cur: 'soul' },
  scout:    { name: '斥候',     icon: 'icon/helmet',         max: 1,  desc: '看得見暗牆',                    base: 25, cur: 'soul' },
  blessing: { name: '先祖祝福', icon: 'icon/bookholy',       max: 1,  desc: '挑戰塔開局獲得一件寶物',        base: 6,  cur: 'ember', altar: 5 },
  fortune:  { name: '財運',     icon: 'icon/goldcoins',      max: 10, desc: '塔內金幣 +10%',                 base: 4,  cur: 'soul' },
  reaper:   { name: '收割',     icon: 'item/gem_purple',     max: 10, desc: '魂晶 +10%',                     base: 6,  cur: 'soul' },
  industry: { name: '勤勉',     icon: 'item/axe',            max: 10, desc: '建築產量 +10%',                 base: 4,  cur: 'soul' },
  midas:    { name: '點石成金', icon: 'icon/bag',            max: 1,  desc: '祭壇修女的價格 −20%',           base: 5,  cur: 'ember', altar: 4 },
};

// ---------- 每日祈福 ----------
const PRAYERS = [
  { id: 'xp',    name: '智慧之光', desc: '今天經驗 +30%' },
  { id: 'gold',  name: '財富之光', desc: '今天塔內金幣 +30%' },
  { id: 'atk',   name: '戰神之光', desc: '今天攻擊 +3' },
  { id: 'def',   name: '守護之光', desc: '今天防禦 +3' },
  { id: 'soul',  name: '靈魂之光', desc: '今天魂晶 +25%' },
  { id: 'prod',  name: '豐收之光', desc: '今天建築產量 +30%' },
  { id: 'gift',  name: '恩賜之光', desc: '立刻獲得 2 瓶藥水與 2 把黃鑰匙（放進倉庫）' },
  { id: 'study', name: '學識之光', desc: '今天研究速度 +50%' },
];

// ---------- 研究（研究院） ----------
// study：需要的研究院等級；time：分鐘
const RESEARCH = {
  bomb:      { name: '爆破術', icon: 'icon/fireball',      branch: '道具', need: null,         study: 1, time: 20,  cost: { wood: 120, ore: 80 },  desc: '塔裡開始出現炸彈，鑰匙商人也會販賣' },
  pick:      { name: '開採術', icon: 'icon/hammerheavy',   branch: '道具', need: 'bomb',       study: 2, time: 40,  cost: { wood: 200, ore: 160 }, desc: '塔裡開始出現破牆鎬' },
  feather:   { name: '羽翼術', icon: 'icon/birdblue',      branch: '道具', need: 'pick',       study: 4, time: 90,  cost: { ore: 400, gold: 300 }, desc: '塔裡開始出現飛行羽毛' },
  keys:      { name: '鑰匙學', icon: 'item/key_b',         branch: '補給', need: null,         study: 1, time: 30,  cost: { wood: 150, gold: 80 }, desc: '鑰匙工坊產量 +50%' },
  potions:   { name: '藥理學', icon: 'item/potion_teal',   branch: '補給', need: 'keys',       study: 2, time: 45,  cost: { wood: 200, gold: 150 }, desc: '所有藥水回復 +20%' },
  kitchen:   { name: '烹飪學', icon: 'item/potion_yellow', branch: '補給', need: 'potions',    study: 3, time: 60,  cost: { wood: 300, gold: 250 }, desc: '解鎖高級料理' },
  tactics:   { name: '戰術學', icon: 'item/sword',         branch: '戰鬥', need: null,         study: 2, time: 45,  cost: { ore: 250, gold: 150 }, desc: '攻擊 +2' },
  armor:     { name: '護甲學', icon: 'item/armor',         branch: '戰鬥', need: 'tactics',    study: 3, time: 60,  cost: { ore: 350, gold: 200 }, desc: '防禦 +2' },
  bestiary:  { name: '怪物學', icon: 'icon/dragon',        branch: '戰鬥', need: 'armor',      study: 5, time: 120, cost: { ore: 600, gold: 500, soul: 30 }, desc: '經驗 +15%，看得見隱形怪物' },
  maps:      { name: '地圖學', icon: 'item/scroll_blue',   branch: '探索', need: null,         study: 2, time: 40,  cost: { wood: 250, gold: 120 }, desc: '黑暗樓層視野 +2' },
  expedition:{ name: '遠征學', icon: 'item/backpack',      branch: '探索', need: 'maps',       study: 3, time: 60,  cost: { wood: 400, gold: 300 }, desc: '派遣隊伍 +1' },
  stars:     { name: '占星學', icon: 'item/crystal',       branch: '探索', need: 'expedition', study: 4, time: 90,  cost: { ore: 500, gold: 400, soul: 20 }, desc: '挑戰塔與每週塔魂晶 +25%' },
  farming:   { name: '農耕學', icon: 'item/potion_green',  branch: '生活', need: null,         study: 1, time: 30,  cost: { wood: 150, gold: 60 }, desc: '農田 +2 塊，作物生長快 25%' },
  memory:    { name: '銘刻術', icon: 'item/ring_red',      branch: '生活', need: 'farming',    study: 4, time: 90,  cost: { ore: 400, soul: 40 }, desc: '寶物記憶槽 +1' },
  prosper:   { name: '繁榮學', icon: 'icon/bag',           branch: '生活', need: 'memory',     study: 6, time: 150, cost: { wood: 1000, ore: 800, gold: 600 }, desc: '建築產量 +25%，離線上限 +4 小時' },
};
const RESEARCH_ORDER = ['bomb', 'pick', 'feather', 'keys', 'potions', 'kitchen', 'tactics', 'armor', 'bestiary', 'maps', 'expedition', 'stars', 'farming', 'memory', 'prosper'];

// ---------- 派遣探索（酒館） ----------
// zone：主塔抵達該區域後才能派遣；reward 為 1 小時的量
const EXPEDITIONS = {
  woods: { name: '灰林採集', zone: 0, hours: [1, 4, 8],  icon: 'item/axe',           reward: { wood: 120, ore: 40 },  extra: 'potion', desc: '木材、礦石，偶爾帶回藥水' },
  mine:  { name: '廢棄礦脈', zone: 1, hours: [1, 4, 8],  icon: 'item/crystal_green', reward: { ore: 120, gold: 40 },  extra: 'keyY',   desc: '礦石、金幣，偶爾帶回黃鑰匙' },
  ruins: { name: '沉沒遺跡', zone: 2, hours: [2, 4, 8],  icon: 'item/scroll_blue',   reward: { gold: 120, soul: 4 },  extra: 'keyB',   desc: '金幣、魂晶，偶爾帶回藍鑰匙' },
  rift:  { name: '熔岩裂隙', zone: 3, hours: [2, 4, 8],  icon: 'icon/fireball',      reward: { soul: 8, ore: 150 },   extra: 'seed',   desc: '魂晶、礦石，偶爾帶回星莓種子' },
  stars: { name: '星界觀測', zone: 4, hours: [4, 8, 12], icon: 'item/crystal',       reward: { soul: 15, ember: 0.25 }, extra: 'ember', desc: '魂晶、少量餘燼' },
};

// ---------- 農田與料理 ----------
const CROPS = {
  wheat: { name: '小麥',     icon: 'item/potion_yellow', mins: 30,  cost: { wood: 20 },            yield: 2 },
  mush:  { name: '發光蘑菇', icon: 'item/potion_teal',   mins: 90,  cost: { wood: 40, gold: 10 },  yield: 2 },
  berry: { name: '星莓',     icon: 'item/potion_purple', mins: 240, cost: { gold: 60 },            yield: 1, seed: true },
};
const DISHES = {
  bread: { name: '暖烘烘麵包', icon: 'item/potion_yellow', need: { wheat: 2 },                     desc: '進塔時生命 +6U（以當層計）', pro: false },
  soup:  { name: '蘑菇濃湯',   icon: 'item/potion_teal',   need: { mush: 2 },                      desc: '這次爬塔攻擊 +5%', pro: false },
  stew:  { name: '獵人燉肉',   icon: 'item/potion_red',    need: { wheat: 1, mush: 1 },            desc: '這次爬塔防禦 +5%', pro: false },
  pie:   { name: '星莓派',     icon: 'item/potion_purple', need: { berry: 1, wheat: 2 },           desc: '這次爬塔每層技能 +1 次', pro: true },
  feast: { name: '王者全餐',   icon: 'icon/chest',         need: { berry: 1, mush: 2, wheat: 2 },  desc: '這次爬塔攻擊、防禦 +10%', pro: true },
};

// ---------- 營地訪客 ----------
const VISITORS = [
  { id: 'caravan', name: '旅行商隊', icon: 'mon/goblinboomer', text: '「木材換金幣，划算的買賣！」',
    opts: [{ t: '用 150 木材換 120 金幣', give: { wood: 150 }, get: { gold: 120 } }, { t: '不需要' }] },
  { id: 'smith', name: '流浪鐵匠', icon: 'mon/minotaur', text: '「給我點礦石，我幫你打磨裝備，順便分你點魂晶。」',
    opts: [{ t: '付 200 礦石，獲得 5 魂晶', give: { ore: 200 }, get: { soul: 5 } }, { t: '不需要' }] },
  { id: 'hurt', name: '受傷的冒險者', icon: 'mon/deepelf', text: '「我在塔裡受了傷……能分我一瓶藥水嗎？」',
    opts: [{ t: '給他 1 瓶藥水（倉庫），獲得 8 魂晶', give: { potion: 1 }, get: { soul: 8 } }, { t: '幫不上忙' }] },
  { id: 'raid', name: '哥布林來襲', icon: 'mon/goblinrunts', text: '一群哥布林衝進營地！',
    opts: [{ t: '付 80 金幣打發他們', give: { gold: 80 } }, { t: '奮力驅趕（損失 100 木材，獲得 3 魂晶）', give: { wood: 100 }, get: { soul: 3 } }] },
  { id: 'bard', name: '吟遊詩人', icon: 'mon/hellionminstrel', text: '「我聽說塔頂藏著讓篝火永不熄滅的祕密……」',
    opts: [{ t: '打賞 30 金幣（今天經驗 +10%）', give: { gold: 30 }, get: { buff: 'bard' } }, { t: '聽完就好' }] },
  { id: 'gambler', name: '神祕賭徒', icon: 'mon/doppelganger', text: '「押 100 金幣，猜對了給你三倍。」',
    opts: [{ t: '押了！（50% 機率得 300 金幣）', give: { gold: 100 }, get: { gamble: 300 } }, { t: '不賭' }] },
  { id: 'keyman', name: '鎖匠學徒', icon: 'mon/goblinscout', text: '「我在練習打鑰匙，給點材料就送你。」',
    opts: [{ t: '付 100 礦石，得 2 把黃鑰匙（倉庫）', give: { ore: 100 }, get: { keyY: 2 } }, { t: '不需要' }] },
  { id: 'farmer', name: '路過的農夫', icon: 'mon/frogling', text: '「我有多的種子，要不要？」',
    opts: [{ t: '收下（獲得 1 顆星莓種子）', get: { seed: 1 } }, { t: '不用了' }] },
];

// ---------- 塔內寶物（寶箱、首領掉落） ----------
const TREASURES = {
  ring_red:   { name: '力量指環',   icon: 'item/ring_red',       r: 1, mods: { atkPct: 0.1 },  desc: '攻擊 +10%' },
  shield_g:   { name: '守護金盾',   icon: 'item/shield_gold',    r: 1, mods: { defPct: 0.1 },  desc: '防禦 +10%' },
  potion_y:   { name: '煉金師之瓶', icon: 'item/potion_yellow',  r: 1, mods: { potionPct: 0.3 }, desc: '所有藥水回復 +30%' },
  bag:        { name: '貪婪錢袋',   icon: 'icon/bag',            r: 1, mods: { goldPct: 0.3 }, desc: '塔內金幣 +30%' },
  book:       { name: '智慧之書',   icon: 'item/book',           r: 1, mods: { expPct: 0.3 },  desc: '經驗 +30%' },
  bow:        { name: '獵人長弓',   icon: 'item/bow',            r: 1, mods: { fam_beast: 0.3 }, desc: '對野獸系攻擊 +30%' },
  water:      { name: '驅魔聖水',   icon: 'icon/potionblue',     r: 1, mods: { fam_demon: 0.3 }, desc: '對惡魔系攻擊 +30%' },
  orb:        { name: '元素寶珠',   icon: 'icon/frostball',      r: 1, mods: { fam_element: 0.3 }, desc: '對元素系攻擊 +30%' },
  boots:      { name: '疾風之靴',   icon: 'item/boots',          r: 2, mods: { noFirst: 1 },   desc: '怪物的先攻無效' },
  ring_g:     { name: '解毒指環',   icon: 'item/ring_green',     r: 2, mods: { noPoison: 1 },  desc: '免疫中毒與毒沼' },
  armor_g:    { name: '秘銀鎧甲',   icon: 'item/armor_gold',     r: 2, mods: { magicRes: 0.5 }, desc: '魔法攻擊傷害 −50%' },
  crystal:    { name: '共鳴水晶',   icon: 'item/crystal',        r: 2, mods: { gemPct: 0.5 },  desc: '寶石效果 +50%' },
  torch:      { name: '永恆火炬',   icon: 'item/arrows_fire',    r: 2, mods: { stairHeal: 3 }, desc: '每次上樓回復 3U 生命' },
  hammer:     { name: '碎骨重鎚',   icon: 'item/axe_ice',        r: 2, mods: { noHard: 1 },    desc: '怪物的「堅固」無效' },
  ringmagic:  { name: '吸魂之戒',   icon: 'icon/ringmagic',      r: 2, mods: { killHeal: 0.6 }, desc: '每次擊殺回復 0.6U 生命' },
  mirror:     { name: '鏡面護甲',   icon: 'icon/armorgold',      r: 2, mods: { noThorns: 1 },  desc: '反傷、爆裂無效' },
  scroll:     { name: '時光卷軸',   icon: 'item/scroll_red',     r: 3, mods: { skillPlus: 1 }, desc: '英雄技能每層 +1 次' },
  gauntlet:   { name: '屠龍手套',   icon: 'item/gauntlet_gold',  r: 3, mods: { bossAtk: 0.25 }, desc: '對精英與首領攻擊 +25%' },
  sword_fire: { name: '炎之劍',     icon: 'item/sword_fire',     r: 3, mods: { atkPct: 0.15, defPct: 0.05 }, desc: '攻擊 +15%、防禦 +5%' },
  holy:       { name: '聖典',       icon: 'icon/book',           r: 3, mods: { shopOff: 0.25 }, desc: '祭壇修女價格 −25%' },
  // 季節限定
  pumpkin:    { name: '南瓜燈籠',   icon: 'icon/fireball',       r: 3, mods: { goldPct: 0.5, fam_undead: 0.3 }, desc: '【萬聖夜】塔內金幣 +50%、對不死系攻擊 +30%', season: 'halloween' },
  snow:       { name: '雪花水晶',   icon: 'icon/frostball',      r: 3, mods: { defPct: 0.15, potionPct: 0.2 }, desc: '【冬日祭】防禦 +15%、藥水 +20%', season: 'winter' },
  lantern:    { name: '新春燈籠',   icon: 'item/torch',          r: 3, mods: { goldPct: 0.3, expPct: 0.3 }, desc: '【新春】金幣、經驗 +30%', season: 'spring' },
  sun:        { name: '盛夏之冠',   icon: 'icon/aurared',        r: 3, mods: { atkPct: 0.12, stairHeal: 2 }, desc: '【盛夏祭】攻擊 +12%、上樓回復 2U', season: 'summer' },
};
const RARITY = { 1: { name: '普通', color: '#b9b2dc' }, 2: { name: '稀有', color: '#74c0fc' }, 3: { name: '傳說', color: '#ffc35c' } };

// ---------- 塔內道具（消耗品）與工具（永久，限該座塔） ----------
const ITEMS = {
  bomb:    { name: '炸彈',     icon: 'icon/fireball',    desc: '炸掉身邊所有普通怪物（不給經驗與金幣）', research: 'bomb' },
  pick:    { name: '破牆鎬',   icon: 'icon/hammerheavy', desc: '敲掉身邊一面牆', research: 'pick' },
  feather: { name: '飛行羽毛', icon: 'icon/birdblue',    desc: '直接飛到本層上樓梯旁', research: 'feather' },
};
const TOOLS = {
  cross:  { name: '聖十字',   icon: 'icon/bookholy',  desc: '不死系只要打一次，且攻擊不死系 +20%' },
  axe:    { name: '樵夫斧',   icon: 'item/axe',       desc: '可以砍開藤蔓' },
  skates: { name: '冰爪靴',   icon: 'icon/boots',     desc: '在冰面上不會滑動' },
  frost:  { name: '冰霜護符', icon: 'icon/frostball', desc: '走過岩漿不受傷' },
  lamp:   { name: '星光提燈', icon: 'item/crystal',   desc: '黑暗樓層完全看得見' },
};

// ---------- 塔的區域（每 10 層一區，第 50 層是終點） ----------
// pal：地板、交錯地板、牆亮部、牆暗部、上樓光暈
// fx：與 mobs 一一對應的怪物特性；mech：本區會出現的機關；tool：本區第 1 層附近能拿到的工具
const ZONES = [
  { id: 'crypt',  name: '腐朽地窖', pal: ['#2e2a48', '#332f50', '#6d65a0', '#433c6e', '#ffd27a'], sky: ['#211c45', '#4a3a6b'], fog: [190, 170, 255], ember: [255, 200, 140],
    mobs: ['blob1', 'blob6', 'blob3', 'ratling', 'skeleton', 'goblinscout', 'giantspider', 'blob26', 'bonegolem'],
    fx:   [null, null, 'first', null, 'undead', 'double', 'poison', 'split', 'undead'],
    elite: 'chibi_goblin', eliteFx: 'first', boss: 'demilich', bossFx: 'undead', seals: 0, mech: ['hidden', 'iron'], tool: 'cross',
    story: '地窖裡堆滿了被遺忘的骸骨。有些骨頭，似乎還在動。' },
  { id: 'forest', name: '幽暗森林', pal: ['#1f3a34', '#234039', '#4f8a68', '#2f5a45', '#c8ff9a'], sky: ['#0f3a3a', '#3f6b4f'], fog: [150, 230, 190], ember: [190, 255, 170],
    mobs: ['blob16', 'frogling', 'goblin', 'goblinveteran', 'werewolfcub', 'blob38', 'treefolk', 'naga', 'centaur'],
    fx:   [null, 'poison', 'steal', 'double', 'first', 'split', 'hard', 'poison', 'first'],
    elite: 'chibi_orc', eliteFx: 'double', boss: 'giant', bossFx: 'hard', seals: 0, mech: ['swamp', 'vine', 'patrol', 'hidden', 'iron'], tool: 'axe',
    story: '塔的中段長出了一整座森林。毒沼與藤蔓之間，有東西在巡邏。' },
  { id: 'temple', name: '沉沒神殿', pal: ['#20354f', '#243a56', '#5a86b0', '#365a80', '#9ad8ff'], sky: ['#1a2d4f', '#3d6b8a'], fog: [150, 200, 255], ember: [160, 220, 255],
    mobs: ['blob20', 'merfolk', 'ghoul', 'wight', 'hag', 'medusa', 'waterelemental', 'deepspawn', 'banshee'],
    fx:   [null, 'thorns', 'undead', 'guard', 'curse', 'magic', 'thorns', 'double', 'drain'],
    elite: 'chibi_ogre', eliteFx: 'hard', boss: 'skygiant', bossFx: 'magic', seals: 2, mech: ['ice', 'plate', 'patrol', 'swamp', 'iron'], tool: 'skates',
    story: '被水淹沒的古神殿，地面結了一層薄冰。機關仍在運作。' },
  { id: 'abyss',  name: '熔岩深淵', pal: ['#3a1e28', '#41222d', '#9a4a50', '#622b35', '#ffb070'], sky: ['#33103a', '#8a2a3a'], fog: [255, 140, 140], ember: [255, 140, 90],
    mobs: ['blob40', 'imp', 'devilkin', 'hellion', 'fireelemental', 'orcishberserker', 'minotaur', 'dragonkinevoker', 'drake'],
    fx:   ['explode', 'first', 'steal', 'guard', 'explode', 'double', 'hard', 'magic', 'drain'],
    elite: 'heresiarch', eliteFx: 'magic', boss: 'dragonwhelp', bossFx: 'double', seals: 3, mech: ['lava', 'plate', 'iron', 'vine', 'hidden'], tool: 'frost',
    story: '岩漿在腳下流動，空氣灼熱。惡魔守著通往星空的門。' },
  { id: 'astral', name: '星界王座', pal: ['#1e1c44', '#22204b', '#5f5cb0', '#3a3880', '#d6c8ff'], sky: ['#120f30', '#3a2a7a'], fog: [200, 180, 255], ember: [200, 180, 255],
    mobs: ['blob5', 'airelemental', 'crystalgolem', 'wraith', 'plaguezombie', 'doppelganger', 'starelemental', 'chaosspawn', 'earthelemental'],
    fx:   ['invisible', 'first', 'hard', 'undead', 'drain', 'curse', 'magic', 'split', 'guard'],
    elite: 'gorgoth', eliteFx: 'guard', boss: 'abyssal', bossFx: 'double', seals: 4, mech: ['teleport', 'dark', 'ice', 'lava', 'patrol', 'plate'], tool: 'lamp',
    story: '星空之上的王座。深淵之主在這裡等你，一切的源頭。' },
];
const FINAL_FLOOR = 50;

// 怪物名稱（依圖片）
const MON_NAMES = {
  blob1: '藍史萊姆', blob6: '綠果凍', blob3: '粉角怪', blob26: '多眼泥怪', blob16: '苔蘚精', blob38: '毒液泥', blob20: '水泡怪',
  blob40: '熔岩球', blob5: '虛空水母', ratling: '鼠人', skeleton: '骷髏兵', goblinscout: '哥布林斥候', giantspider: '巨蛛',
  bonegolem: '骨魔像', chibi_goblin: '哥布林頭目', demilich: '半巫妖', frogling: '蛙人', goblin: '哥布林', goblinveteran: '哥布林老兵',
  werewolfcub: '狼人幼崽', treefolk: '樹人', naga: '娜迦', centaur: '半人馬', chibi_orc: '獸人隊長', giant: '森林巨人',
  merfolk: '魚人', ghoul: '食屍鬼', wight: '屍妖', hag: '沼澤女巫', medusa: '梅杜莎', waterelemental: '水元素', deepspawn: '深淵觸手',
  banshee: '女妖', chibi_ogre: '食人魔', skygiant: '風暴巨人', imp: '小惡魔', devilkin: '魔裔', hellion: '地獄卒',
  fireelemental: '火元素', orcishberserker: '狂戰士', minotaur: '牛頭人', dragonkinevoker: '龍裔術士', drake: '火龍',
  heresiarch: '異端主教', dragonwhelp: '古龍幼王', airelemental: '風元素', crystalgolem: '水晶魔像', wraith: '怨靈',
  plaguezombie: '瘟疫殭屍', doppelganger: '變形怪', starelemental: '星辰元素', chaosspawn: '混沌之子', earthelemental: '大地元素',
  gorgoth: '戈格斯', abyssal: '深淵之主',
};
// 怪物家族（剋制用）
const FAMILY = { undead: '不死', beast: '野獸', element: '元素', demon: '惡魔' };
const MON_FAMILY = {
  skeleton: 'undead', bonegolem: 'undead', demilich: 'undead', ghoul: 'undead', wight: 'undead', banshee: 'undead', wraith: 'undead', plaguezombie: 'undead',
  ratling: 'beast', giantspider: 'beast', frogling: 'beast', werewolfcub: 'beast', naga: 'beast', centaur: 'beast', minotaur: 'beast', drake: 'beast', dragonwhelp: 'beast', medusa: 'beast',
  goblin: 'beast', goblinscout: 'beast', goblinveteran: 'beast', chibi_goblin: 'beast', chibi_orc: 'beast', chibi_ogre: 'beast', orcishberserker: 'beast', giant: 'beast', skygiant: 'beast', hag: 'beast', merfolk: 'beast',
  blob1: 'element', blob6: 'element', blob3: 'element', blob26: 'element', blob16: 'element', blob38: 'element', blob20: 'element', blob40: 'element', blob5: 'element',
  waterelemental: 'element', fireelemental: 'element', airelemental: 'element', starelemental: 'element', earthelemental: 'element', crystalgolem: 'element', treefolk: 'element',
  imp: 'demon', devilkin: 'demon', hellion: 'demon', heresiarch: 'demon', chaosspawn: 'demon', abyssal: 'demon', deepspawn: 'demon', dragonkinevoker: 'demon', doppelganger: 'demon', gorgoth: 'demon',
};

// 怪物模板：rd 防禦佔玩家攻擊比、hits 需要幾下、dmg 每下傷害（以樓層單位 U 計）
const MON_TIERS = [
  { rd: 0.20, hits: 2, dmg: 0.4, exp: 1, gold: 1 },
  { rd: 0.30, hits: 3, dmg: 0.5, exp: 1, gold: 1 },
  { rd: 0.30, hits: 3, dmg: 0.7, exp: 2, gold: 2 },
  { rd: 0.40, hits: 4, dmg: 0.7, exp: 2, gold: 2 },
  { rd: 0.45, hits: 4, dmg: 0.8, exp: 3, gold: 2 },
  { rd: 0.35, hits: 5, dmg: 0.8, exp: 3, gold: 3 },
  { rd: 0.55, hits: 4, dmg: 1.0, exp: 4, gold: 3 },
  { rd: 0.60, hits: 5, dmg: 1.0, exp: 4, gold: 4 },
  { rd: 0.50, hits: 6, dmg: 1.2, exp: 5, gold: 5 },
];
const ELITE_TIER = { rd: 0.55, hits: 7, dmg: 1.4, exp: 10, gold: 10 };
const BOSS_TIER  = { rd: 0.60, hits: 8, dmg: 1.4, exp: 30, gold: 40 };
const MON_FX = {
  first:     { name: '先攻', desc: '戰鬥時先出手' },
  double:    { name: '連擊', desc: '每回合攻擊兩次' },
  poison:    { name: '劇毒', desc: '戰後中毒，每走一步扣血（喝藥水、上下樓解除）' },
  magic:     { name: '魔攻', desc: '攻擊無視你的防禦' },
  hard:      { name: '堅固', desc: '每次最多只受到固定傷害' },
  drain:     { name: '吸血', desc: '戰鬥開始先吸走你 1/5 的生命' },
  undead:    { name: '不死', desc: '倒下後會以一半生命再站起來一次（聖十字可以一次解決）' },
  split:     { name: '分裂', desc: '倒下時分裂成兩隻小怪（沒有經驗與金幣）' },
  thorns:    { name: '反傷', desc: '你每打牠一下，自己受到 0.15U 傷害' },
  guard:     { name: '護衛', desc: '旁邊的其他怪物防禦 +25%' },
  steal:     { name: '偷竊', desc: '戰後偷走你 25% 的塔內金幣' },
  curse:     { name: '詛咒', desc: '戰後攻擊 −10%，直到換樓層' },
  invisible: { name: '隱形', desc: '看不到牠的數值，打了才知道' },
  explode:   { name: '爆裂', desc: '倒下時爆炸，造成 1U 傷害' },
};

// 塔內 NPC
const NPCS = {
  altar: { name: '祭壇修女', icon: 'mon/cabalistnun', desc: '用金幣換取力量' },
  merch: { name: '鑰匙商人', icon: 'mon/goblinhermit', desc: '販賣鑰匙與道具' },
  sage:  { name: '星象學者', icon: 'mon/planaradept', desc: '給予忠告、禮物與任務' },
};

// ---------- 新周目詛咒（累加） ----------
const CURSES = [
  '怪物攻擊 +10%', '藥水回復 −20%', '精英與首領生命 +25%', '每層少一把黃鑰匙',
  '單數階的怪物獲得先攻', '寶石效果 −20%', '修女價格 +50%', '怪物防禦 +10%',
  '怪物攻擊再 +10%', '所有樓層都是黑暗的', '怪物生命 +15%', '藥水回復再 −20%',
  '首領攻擊 +25%', '每層少一顆藍寶石', '怪物防禦再 +10%', '怪物攻擊再 +15%',
  '精英與首領生命再 +25%', '寶石效果再 −15%', '怪物生命再 +15%', '終極詛咒：怪物攻擊再 +20%',
];

// ---------- 挑戰塔詞綴（自選，加成獎勵） ----------
const MODIFIERS = {
  mAtk:    { name: '狂暴', desc: '怪物攻擊 +20%',     bonus: 0.2 },
  noPot:   { name: '禁藥', desc: '地上沒有藥水',       bonus: 0.35 },
  fewKey:  { name: '鎖死', desc: '每層少一把黃鑰匙',   bonus: 0.25 },
  dark:    { name: '永夜', desc: '每一層都是黑暗的',   bonus: 0.15 },
  first:   { name: '迅捷', desc: '所有怪物都會先攻',   bonus: 0.3 },
  halfGem: { name: '貧瘠', desc: '寶石效果減半',       bonus: 0.3 },
};
// 每日規則（依日期固定）
const DAILY_RULES = [
  { id: 'gemNoPot', name: '寶石之日',   desc: '寶石效果 ×2，但地上沒有藥水' },
  { id: 'noBlue',   name: '黃鑰匙之日', desc: '沒有藍門，但黃鑰匙變少' },
  { id: 'patrol',   name: '巡邏之日',   desc: '一半的怪物會巡邏' },
  { id: 'gold',     name: '黃金之日',   desc: '塔內金幣 ×2，祭壇修女每層都在' },
  { id: 'dark',     name: '黑夜之日',   desc: '每一層都是黑暗的，但經驗 +50%' },
  { id: 'merchant', name: '商人之日',   desc: '鑰匙商人每層都在' },
  { id: 'giant',    name: '巨人之日',   desc: '怪物生命 ×1.5，經驗與金幣 ×1.5' },
];
// 季節活動（月, 日）區間
const SEASONS = [
  { id: 'halloween', name: '萬聖夜', from: [10, 20], to: [11, 5],  treasure: 'pumpkin', desc: '挑戰塔第 5 層必出南瓜燈籠；不死系經驗 ×2' },
  { id: 'winter',    name: '冬日祭', from: [12, 15], to: [1, 5],   treasure: 'snow',    desc: '挑戰塔第 5 層必出雪花水晶；地上的藥水 +50%' },
  { id: 'spring',    name: '新春',   from: [1, 20],  to: [2, 20],  treasure: 'lantern', desc: '挑戰塔第 5 層必出新春燈籠；塔內金幣 ×1.5' },
  { id: 'summer',    name: '盛夏祭', from: [7, 1],   to: [8, 31],  treasure: 'sun',     desc: '挑戰塔第 5 層必出盛夏之冠；經驗 ×1.5' },
];

// ---------- 星級獎勵（主塔累積星星） ----------
const STAR_REWARDS = [
  { stars: 10,  reward: { soul: 20 } },
  { stars: 25,  reward: { soul: 40, ember: 1 } },
  { stars: 45,  reward: { soul: 60, ember: 2 } },
  { stars: 70,  reward: { soul: 100, ember: 3 } },
  { stars: 100, reward: { soul: 150, ember: 4 } },
  { stars: 130, reward: { soul: 200, ember: 6 } },
  { stars: 150, reward: { soul: 300, ember: 10 } },
];
const ZONE_QUEST_STARS = 20; // 區域任務：在該區拿到的星數

// ---------- 劇情 ----------
const STORY = {
  intro: '世界被黑暗吞噬，只剩營地的篝火還在燃燒。傳說高塔頂端有讓篝火永不熄滅的祕密——還有吞噬一切的深淵之主。',
  bosses: [
    '半巫妖化為塵土。牠臨死前低語：「主人……在星空之上等你……」',
    '森林巨人倒下了，整座森林安靜下來。藤蔓之間，露出一條往上的石階。',
    '風暴巨人沉入水底。冰層碎裂，神殿深處傳來熔岩的熱氣。',
    '古龍幼王的火焰熄滅。天花板裂開，你看見了星星。',
    '深淵之主崩解成無數星光，落回營地的篝火裡。火焰從此不再熄滅。',
  ],
  ending: '篝火的光芒照亮了整片大地。但塔沒有消失——它在黑暗中重新長了出來，比以前更扭曲、更危險。也許這就是守護者的宿命。',
};

// ---------- 成就（部分會給稱號） ----------
const ACHIEVEMENTS = [
  { id: 'f5',      name: '踏入高塔',   desc: '主塔抵達第 5 層',          test: s => s.stats.bestFloor >= 5,   reward: { soul: 5 } },
  { id: 'f10',     name: '地窖征服者', desc: '主塔抵達第 10 層',         test: s => s.stats.bestFloor >= 10,  reward: { soul: 15 }, title: '地窖征服者' },
  { id: 'boss1',   name: '首領獵人',   desc: '擊敗第一位首領',           test: s => s.stats.bossKills >= 1,   reward: { ember: 2 } },
  { id: 'f20',     name: '森林行者',   desc: '主塔抵達第 20 層',         test: s => s.stats.bestFloor >= 20,  reward: { ember: 3 }, title: '森林行者' },
  { id: 'f30',     name: '神殿探索者', desc: '主塔抵達第 30 層',         test: s => s.stats.bestFloor >= 30,  reward: { ember: 5 }, title: '神殿探索者' },
  { id: 'f40',     name: '熔岩行者',   desc: '主塔抵達第 40 層',         test: s => s.stats.bestFloor >= 40,  reward: { ember: 7 }, title: '熔岩行者' },
  { id: 'clear',   name: '篝火守護者', desc: '擊敗深淵之主',             test: s => s.stats.clears >= 1,      reward: { ember: 15 }, title: '篝火守護者' },
  { id: 'ng5',     name: '詛咒行者',   desc: '在詛咒等級 5 以上通關',    test: s => s.stats.bestCurse >= 5,   reward: { ember: 20 }, title: '詛咒行者' },
  { id: 'star50',  name: '星星收集者', desc: '主塔累積 50 顆星',         test: s => s.stats.stars >= 50,      reward: { soul: 50 } },
  { id: 'star150', name: '完美主義者', desc: '主塔累積 150 顆星',        test: s => s.stats.stars >= 150,     reward: { ember: 10 }, title: '完美主義者' },
  { id: 'd10',     name: '每日挑戰者', desc: '挑戰塔單次抵達第 10 層',   test: s => s.stats.bestDaily >= 10,  reward: { soul: 20 } },
  { id: 'd25',     name: '挑戰大師',   desc: '挑戰塔單次抵達第 25 層',   test: s => s.stats.bestDaily >= 25,  reward: { ember: 5 }, title: '挑戰大師' },
  { id: 'week',    name: '解謎高手',   desc: '完成一次每週謎題塔',       test: s => s.stats.weekly >= 1,      reward: { soul: 30 } },
  { id: 'k100',    name: '百人斬',     desc: '累計擊敗 100 隻怪物',      test: s => s.stats.kills >= 100,     reward: { soul: 30 } },
  { id: 'k500',    name: '屍山血海',   desc: '累計擊敗 500 隻怪物',      test: s => s.stats.kills >= 500,     reward: { ember: 5 }, title: '屠戮者' },
  { id: 'codex',   name: '博物學家',   desc: '圖鑑登錄 40 種怪物',       test: s => Object.keys(s.codex).length >= 40, reward: { ember: 5 }, title: '博物學家' },
  { id: 'hearth5', name: '不滅篝火',   desc: '篝火達到 Lv5',             test: s => s.buildings.hearth >= 5,  reward: { ember: 3 } },
  { id: 'heroes4', name: '冒險小隊',   desc: '招募 4 位英雄',            test: s => HERO_ORDER.filter(h => s.heroes[h].owned).length >= 4, reward: { ember: 4 } },
  { id: 'heroes8', name: '傳奇軍團',   desc: '招募全部 8 位英雄',        test: s => HERO_ORDER.every(h => s.heroes[h].owned), reward: { ember: 10 }, title: '傳奇領袖' },
  { id: 'lv20',    name: '身經百戰',   desc: '任一英雄達到 Lv20',        test: s => HERO_ORDER.some(h => s.heroes[h].lvl >= 20), reward: { ember: 4 } },
  { id: 'research',name: '學者',       desc: '完成 8 項研究',            test: s => Object.keys(s.research.done).length >= 8, reward: { ember: 4 }, title: '學者' },
  { id: 'gear1',   name: '鍛造新手',   desc: '獲得第一件史詩以上的裝備', test: s => (s.stats.bestGear || 0) >= 2, reward: { soul: 20 } },
  { id: 'legend',  name: '傳說之手',   desc: '獲得傳說裝備',             test: s => (s.stats.bestGear || 0) >= 3, reward: { ember: 5 }, title: '傳說之手' },
  { id: 'plus10',  name: '千錘百鍊',   desc: '把一件裝備強化到 +10',     test: s => (s.stats.bestPlus || 0) >= 10, reward: { ember: 4 } },
  { id: 'pet1',    name: '新夥伴',     desc: '孵化第一隻寵物',           test: s => Object.keys(s.pets.own).length >= 1, reward: { soul: 10 } },
  { id: 'pet8',    name: '寵物大家族', desc: '擁有 8 種寵物',            test: s => Object.keys(s.pets.own).length >= 8, reward: { ember: 4 }, title: '小精怪之友' },
  { id: 'petall',  name: '全員到齊',   desc: '收集全部寵物',             test: s => PET_ORDER.every(k => s.pets.own[k]), reward: { ember: 12 }, title: '萬獸之主' },
  { id: 'chef',    name: '大廚',       desc: '做出 20 道料理',           test: s => s.stats.dishes >= 20,     reward: { soul: 30 }, title: '營地大廚' },
];

// ---------- 每週謎題塔（手工設計，地圖字元說明見 Tower.parseMap） ----------
const PUZZLES = [
  { name: '鑰匙的抉擇', hero: { atk: 10, def: 10, hp: 400 }, map: [
    'S.D#a.#..1.',
    '...y..#.#..',
    '.Y.#.0y.#d.',
    '####..###y#',
    '..1#.p.#...',
    '.d.y...y.2U',
    '..0#.Y.#...',
    '#y######b##',
    '.......#...',
    '.1.a.2.#.B.',
    '..p....#..c'] },
  { name: '守衛與鐵門', hero: { atk: 10, def: 10, hp: 500 }, map: [
    'S.D#.gY#a..',
    '.Y.....y.d.',
    '...#.0.#p..',
    '#y###y#####',
    '1..#..Y#.2.',
    '.a.#.g.....',
    '...#d.1#.3.',
    '#.#######I#',
    'g..#.a.#..p',
    '...I.4...2.',
    '..p#d..#.cU'] },
  { name: '壓力板', hero: { atk: 10, def: 10, hp: 450 }, map: [
    'S.D#.1.#..U',
    '.......L...',
    '.Y.#.a.#.2.',
    '#.###y#####',
    '..0#.4.####',
    '.p.#.Y.####',
    '...#d.a####',
    '#y#########',
    '..1########',
    '.o.########',
    'p..########'] },
  { name: '傳送迷宮', hero: { atk: 10, def: 10, hp: 450 }, map: [
    'S.D#.a.#.d.',
    '.T.y.1.y...',
    '..Y#...#.Y.',
    '####.######',
    '####T..####',
    '####.2.####',
    '####..p####',
    '#####y#####',
    '####.T.#...',
    '####.3.#.1.',
    '####.a.#T.U'] },
  { name: '毒沼與藤蔓', hero: { atk: 10, def: 10, hp: 450 }, map: [
    'S.D#~Y~#..U',
    '...y~1~y.2.',
    '.Y.#~~~#...',
    '#v##y######',
    'd.a#.0.####',
    '..p#.A.####',
    '...#.Y.####',
    '###########',
    '###########',
    '###########',
    '###########'] },
];

// ---------- 裝備 ----------
// 裝備穿在隊伍身上：換出戰英雄時裝備跟著走。主屬性 = 部位基礎 × 品階倍率 × 稀有度倍率 × (1 + 0.1 × 強化)
const GEAR_SLOTS = {
  weapon: { name: '武器', icon: 'item/sword',    main: { atk: 3 } },
  armor:  { name: '防具', icon: 'item/armor',    main: { def: 3 } },
  charm:  { name: '飾品', icon: 'item/ring_red', main: { atk: 1.2, def: 1.2 } },
};
const GEAR_SLOT_ORDER = ['weapon', 'armor', 'charm'];
const GEAR_RARITY = [
  { name: '普通', color: '#cfc9ea', mult: 1,    affix: 0 },
  { name: '精良', color: '#74c0fc', mult: 1.25, affix: 1 },
  { name: '史詩', color: '#c58bff', mult: 1.6,  affix: 1 },
  { name: '傳說', color: '#ffc35c', mult: 2,    affix: 2 },
];
const GEAR_TIER = [1, 2, 3, 4.5, 6, 8, 10, 13];
const GEAR_TIER_NAME = ['粗製', '鐵製', '精鋼', '秘銀', '符文', '龍骨', '星辰', '深淵'];
// 款式：[圖示, 名稱, 屬性權重（飾品才有，偏攻或偏防）]
const GEAR_BASES = {
  weapon: [['item/sword', '長劍'], ['item/sword_fire', '炎之劍'], ['item/sword_ice', '霜之劍'], ['item/axe', '戰斧'], ['item/axe_fire', '熔岩斧'], ['item/axe_ice', '冰晶斧'],
    ['item/dagger', '短刃'], ['item/dagger_fire', '火紋匕首'], ['item/dagger_ice', '寒光匕首'], ['item/bow', '長弓'], ['icon/crossbow', '十字弩'], ['icon/hammerheavy', '重錘'], ['icon/swordblood', '血紋大劍']],
  armor: [['item/armor', '皮甲'], ['item/armor_gold', '金邊鎧甲'], ['item/shield', '鐵盾'], ['item/shield_gold', '聖盾'], ['item/shield_wood', '木盾'], ['item/shield_wood_gold', '鑲金木盾'],
    ['icon/helmet', '頭盔'], ['icon/legarmor', '護腿'], ['icon/armorgold', '王者胸甲'], ['item/gauntlet', '護手']],
  charm: [['item/ring_red', '紅玉戒指', { atk: 1.8, def: 0.6 }], ['item/ring_green', '翠玉戒指', { atk: 0.6, def: 1.8 }], ['icon/ringmagic', '秘法指環'], ['icon/aurared', '紅焰護符', { atk: 1.8, def: 0.6 }],
    ['icon/bookholy', '聖典'], ['item/crystal_green', '森之結晶', { atk: 0.6, def: 1.8 }], ['item/gauntlet_gold', '金色拳套', { atk: 1.8, def: 0.6 }], ['item/boots_gold', '疾風靴']],
};
// 詞綴：數值依稀有度（精良 / 史詩 / 傳說），% 類存成小數
const AFFIXES = {
  atkPct:      { text: '攻擊 +{v}%',                 v: [3, 5, 7] },
  defPct:      { text: '防禦 +{v}%',                 v: [3, 5, 7] },
  reduce:      { text: '受到的傷害 −{v}%',           v: [3, 4, 6] },
  bossAtk:     { text: '對精英與首領攻擊 +{v}%',     v: [6, 9, 12] },
  killHeal:    { text: '每次擊殺回復 {v}U 生命',     v: [0.05, 0.08, 0.12], raw: true },
  goldPct:     { text: '塔內金幣 +{v}%',             v: [10, 15, 22] },
  expPct:      { text: '經驗 +{v}%',                 v: [5, 8, 12] },
  potionPct:   { text: '藥水效果 +{v}%',             v: [4, 6, 9] },
  magicRes:    { text: '魔法傷害 −{v}%',             v: [10, 16, 24] },
  hazard:      { text: '中毒・反傷・爆炸・岩漿 −{v}%', v: [12, 18, 25] },
  fam_undead:  { text: '對不死系攻擊 +{v}%',         v: [8, 12, 18] },
  fam_beast:   { text: '對野獸系攻擊 +{v}%',         v: [8, 12, 18] },
  fam_element: { text: '對元素系攻擊 +{v}%',         v: [8, 12, 18] },
  fam_demon:   { text: '對惡魔系攻擊 +{v}%',         v: [8, 12, 18] },
};
// 掉落稀有度權重：普通 / 精良 / 史詩 / 傳說
const GEAR_DROP = { elite: [55, 33, 10, 2], boss: [15, 45, 30, 10] };
const GEAR_BAG = 40;

// ---------- 寵物 ----------
// 稀有度沿用裝備的顏色；fx 數值 × (1 + 0.04 × (等級 − 1))，flag 是不隨等級變化的能力
// 效果代號：petOpen 開場撞擊、petHit 追擊（every 每幾下一次）、petHeal 受傷後治療、petBreak 破甲，其他與裝備詞綴相同
const PETS = {
  horn:    { name: '角角',     icon: 'mon/blob34', r: 0, role: 'atk',   fx: { petOpen: 0.18 },                 desc: '開戰先撞一下，造成你一擊 {petOpen}% 的傷害' },
  ember:   { name: '火球球',   icon: 'mon/blob40', r: 1, role: 'atk',   fx: { petHit: 0.09 },                  desc: '你每次攻擊後追擊，造成你一擊 {petHit}% 的傷害' },
  crab:    { name: '鉗鉗蟹',   icon: 'mon/blob25', r: 1, role: 'atk',   fx: { petBreak: 0.16 },                desc: '夾碎護甲：怪物防禦 −{petBreak}%' },
  squid:   { name: '小章魚',   icon: 'mon/blob17', r: 2, role: 'atk',   fx: { petHit: 0.35 }, every: 2,         desc: '你每攻擊 2 下，觸手連打造成你一擊 {petHit}% 的傷害' },
  cube:    { name: '方塊牛',   icon: 'mon/blob24', r: 3, role: 'atk',   fx: { petHit: 0.15, bossAtk: 0.1 },   desc: '每次攻擊後追擊 {petHit}%；對精英與首領攻擊 +{bossAtk}%' },
  drop:    { name: '翅翅水滴', icon: 'mon/blob9',  r: 0, role: 'heal',  fx: { petHeal: 0.08 },                 desc: '你每次受傷後，治療該次傷害的 {petHeal}%' },
  jelly:   { name: '綠果凍',   icon: 'mon/blob16', r: 1, role: 'heal',  fx: { killHeal: 0.12 },                desc: '每次擊殺怪物，回復 {killHeal}U 生命' },
  pinky:   { name: '粉粉',     icon: 'mon/blob3',  r: 0, role: 'heal',  fx: { potionPct: 0.06 },               desc: '藥水效果 +{potionPct}%' },
  cloudy:  { name: '藍雲朵',   icon: 'mon/blob39', r: 2, role: 'heal',  fx: { petHeal: 0.08, potionPct: 0.03 }, desc: '受傷後治療 {petHeal}%；藥水效果 +{potionPct}%' },
  lazy:    { name: '懶懶',     icon: 'mon/blob18', r: 0, role: 'guard', fx: { reduce: 0.05 },                  desc: '躺在你前面擋刀：受到的傷害 −{reduce}%' },
  pigtail: { name: '雙馬尾',   icon: 'mon/blob29', r: 1, role: 'guard', fx: {}, flag: { noFirst: 1 }, desc: '擋在你前面：怪物的先攻失效' },
  mage:    { name: '紫小妖',   icon: 'mon/blob10', r: 2, role: 'guard', fx: { magicRes: 0.3, hazard: 0.3 },    desc: '魔法傷害 −{magicRes}%；中毒・反傷・爆炸・岩漿 −{hazard}%' },
  ghost:   { name: '冰翼怪',   icon: 'mon/blob15', r: 3, role: 'guard', fx: { reduce: 0.06, petHeal: 0.06 },   desc: '冰翼護身：受到的傷害 −{reduce}%，受傷後治療 {petHeal}%' },
  coin:    { name: '金錢怪',   icon: 'mon/blob33', r: 0, role: 'aid',   fx: { goldPct: 0.3 },                  desc: '塔內金幣 +{goldPct}%' },
  nerd:    { name: '書蟲',     icon: 'mon/blob2',  r: 0, role: 'aid',   fx: { expPct: 0.1 },                   desc: '經驗 +{expPct}%' },
  eye:     { name: '獨眼仔',   icon: 'mon/blob30', r: 1, role: 'aid',   fx: {}, flag: { seeAll: 1, sight: 1 }, desc: '看得見暗牆與隱形怪物；黑暗樓層視野 +1' },
  medusa:  { name: '水母仙',   icon: 'mon/blob36', r: 2, role: 'aid',   fx: { gemPct: 0.06 },                  desc: '寶石效果 +{gemPct}%' },
  crown:   { name: '金毛王',   icon: 'mon/blob37', r: 3, role: 'aid',   fx: { goldPct: 0.3, expPct: 0.1, potionPct: 0.06, gemPct: 0.03 }, desc: '金幣 +{goldPct}%、經驗 +{expPct}%、藥水 +{potionPct}%、寶石 +{gemPct}%' },
};
const PET_ORDER = Object.keys(PETS);
const PET_ROLES = { atk: { name: '攻擊', color: '#ff8a65' }, heal: { name: '治療', color: '#7ee08a' }, guard: { name: '守護', color: '#74c0fc' }, aid: { name: '輔助', color: '#ffd27a' } };
const PET_HATCH = [50, 32, 14, 4];
