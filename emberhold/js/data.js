// 所有靜態遊戲資料（圖片 key 對應 assets/<key>.webp）
const RES = {
  wood:  { name: '木材', icon: 'item/axe',           tip: '伐木場產出。用來蓋設施、研究、種田。' },
  ore:   { name: '礦石', icon: 'item/crystal_green', tip: '礦坑產出、分解裝備獲得。用來蓋設施、打造與強化裝備。' },
  gold:  { name: '金幣', icon: 'icon/goldcoins',     tip: '市集產出（營地金幣，和塔裡的金幣分開）。用來招募英雄、打造裝備、升級寵物。' },
  soul:  { name: '魂晶', icon: 'item/gem_purple',    tip: '在塔裡首次抵達新樓層、打倒精英與首領、完成任務獲得。用來學天賦、買寵物蛋、洗練裝備。' },
  ember: { name: '餘燼', icon: 'item/torch',         tip: '打倒首領、通關、成就獲得的稀有資源。用來覺醒英雄、學高階天賦。' },
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
  training: { name: '訓練場', npc: 'mon/orcishberserker', tool: 'item/sword', max: 10,
    desc: '沒出戰的英雄可以在這裡訓練，離線也會持續獲得經驗。Lv1、4、8 各開放一個訓練位。', base: { wood: 120, ore: 80, gold: 60 }, growth: 1.75, req: 3 },
  vault: { name: '倉庫', npc: 'mon/goblinrunts', tool: 'icon/bag', max: 10,
    desc: '每級鑰匙與藥水的存放上限 +2，離線收益時數 +1。', base: { wood: 150, ore: 60 }, growth: 1.7, req: 3 },
  observatory: { name: '星象台', npc: 'mon/darkapprentice', tool: 'item/crystal', max: 10,
    desc: '每天發布任務。每 3 級多一個任務，每級任務獎勵 +10%。', base: { wood: 100, gold: 80, soul: 5 }, growth: 1.8, req: 2 },
  rune: { name: '符文工坊', npc: 'mon/dragonkinevoker', tool: 'item/scroll_red', max: 10,
    desc: '洗練裝備詞綴、把三件同稀有度的裝備合成更高稀有度。等級越高洗練越便宜。', base: { wood: 200, ore: 150, soul: 15 }, growth: 1.85, req: 4 },
  altar: { name: '魂之祭壇', npc: 'mon/cabalistnun', tool: 'item/book', max: 10,
    desc: '以魂晶習得天賦、每日祈福、英雄覺醒。天賦等級上限 = 祭壇等級 × 3。', base: { wood: 100, ore: 60, soul: 10 }, growth: 1.9, req: 2 },
};
const BUILDING_ORDER = ['hearth', 'lumber', 'mine', 'market', 'forge', 'keysmith', 'apothecary', 'farm', 'tavern', 'nest', 'study', 'altar', 'training', 'vault', 'observatory', 'rune'];

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
  battle:  { name: '戰鬥', color: '#ff8a65', nodes: ['might', 'pierceT', 'hunter', 'slayer', 'fury', 'focus'] },
  guard:   { name: '守護', color: '#74c0fc', nodes: ['guard', 'vigor', 'bulwark', 'antidote', 'firstAid', 'aegis'] },
  explore: { name: '探索', color: '#7ee08a', nodes: ['locksmith', 'alchemy', 'scout', 'keen', 'luck', 'blessing'] },
  wealth:  { name: '財富', color: '#ffd27a', nodes: ['fortune', 'reaper', 'industry', 'merchant', 'salvager', 'midas'] },
  growth:  { name: '養成', color: '#c58bff', nodes: ['scholar', 'smith', 'tamer', 'trainer', 'researcher', 'chef'] },
  legacy:  { name: '傳承', color: '#9ad8ff', nodes: ['gemStart', 'offline', 'eggLuck', 'curseRes', 'bounty', 'legend'] },
};
// max：最高等級；g：費用成長倍率（預設 1.45）；altar：需要的祭壇等級
const TALENTS = {
  might:     { name: '力量',     icon: 'item/sword',          max: 30, g: 1.2,  desc: '攻擊 +1',                          base: 5,  cur: 'soul' },
  pierceT:   { name: '破甲',     icon: 'item/dagger',         max: 10, g: 1.3,  desc: '怪物防禦 −2%',                     base: 8,  cur: 'soul' },
  hunter:    { name: '獵手',     icon: 'item/bow',            max: 10, g: 1.3,  desc: '對精英與首領攻擊 +4%',             base: 8,  cur: 'soul' },
  slayer:    { name: '屠戮',     icon: 'icon/swordblood',     max: 10, g: 1.3,  desc: '對不死、野獸、元素、惡魔攻擊 +3%', base: 10, cur: 'soul', altar: 2 },
  fury:      { name: '戰意',     icon: 'item/sword_fire',     max: 5,           desc: '每層第一場戰鬥攻擊 +10%',          base: 10, cur: 'soul' },
  focus:     { name: '專注',     icon: 'item/scroll_red',     max: 2,           desc: '英雄技能每層 +1 次',               base: 4,  cur: 'ember', altar: 3 },
  guard:     { name: '守護',     icon: 'item/shield',         max: 30, g: 1.2,  desc: '防禦 +1',                          base: 5,  cur: 'soul' },
  vigor:     { name: '活力',     icon: 'item/potion_red',     max: 30, g: 1.2,  desc: '初始生命 +100',                    base: 4,  cur: 'soul' },
  bulwark:   { name: '壁壘',     icon: 'item/shield_wood_gold', max: 10, g: 1.3, desc: '受到的傷害 −2%',                  base: 10, cur: 'soul', altar: 2 },
  antidote:  { name: '抗毒',     icon: 'item/ring_green',     max: 3,           desc: '中毒、岩漿、反傷、爆裂、感電的損失 −25%', base: 10, cur: 'soul' },
  firstAid:  { name: '急救',     icon: 'item/potion_teal',    max: 5,           desc: '每次上樓回復 0.5U 生命',           base: 12, cur: 'soul', altar: 3 },
  aegis:     { name: '神盾',     icon: 'item/shield_gold',    max: 1,           desc: '每層第一場戰鬥損失 −50%',          base: 6,  cur: 'ember', altar: 5 },
  locksmith: { name: '鎖匠',     icon: 'item/key_y',          max: 5,           desc: '挑戰塔開局、主塔進入新區域時 +1 黃鑰匙', base: 10, cur: 'soul' },
  alchemy:   { name: '煉金',     icon: 'item/potion_purple',  max: 10, g: 1.3,  desc: '所有藥水回復 +8%',                 base: 8,  cur: 'soul' },
  scout:     { name: '斥候',     icon: 'icon/helmet',         max: 1,           desc: '看得見暗牆',                       base: 25, cur: 'soul' },
  keen:      { name: '鷹眼',     icon: 'item/torch',          max: 2,           desc: '黑暗樓層視野 +1',                  base: 20, cur: 'soul', altar: 2 },
  luck:      { name: '幸運',     icon: 'icon/goldcoins',      max: 5,           desc: '黃金怪物出現機率 +20%',            base: 15, cur: 'soul', altar: 3 },
  blessing:  { name: '先祖祝福', icon: 'icon/bookholy',       max: 1,           desc: '挑戰塔開局獲得一件寶物',           base: 6,  cur: 'ember', altar: 5 },
  fortune:   { name: '財運',     icon: 'icon/bag',            max: 15, g: 1.25, desc: '塔內金幣 +8%',                     base: 4,  cur: 'soul' },
  reaper:    { name: '收割',     icon: 'item/gem_purple',     max: 15, g: 1.25, desc: '魂晶 +8%',                         base: 6,  cur: 'soul' },
  industry:  { name: '勤勉',     icon: 'item/axe',            max: 20, g: 1.25, desc: '建築產量 +10%',                    base: 4,  cur: 'soul' },
  merchant:  { name: '議價',     icon: 'item/key_b',          max: 5,           desc: '鑰匙商人價格 −6%',                 base: 10, cur: 'soul', altar: 2 },
  salvager:  { name: '拆解',     icon: 'icon/hammerheavy',    max: 5,           desc: '分解裝備得到的材料 +15%',          base: 10, cur: 'soul', altar: 3 },
  midas:     { name: '點石成金', icon: 'icon/goldcoins',      max: 1,           desc: '祭壇修女的價格 −20%',              base: 5,  cur: 'ember', altar: 4 },
  scholar:   { name: '博學',     icon: 'item/book',           max: 15, g: 1.25, desc: '經驗 +5%',                         base: 6,  cur: 'soul' },
  smith:     { name: '鍛造',     icon: 'item/gauntlet',       max: 10, g: 1.3,  desc: '打造時史詩以上的機率 +8%（相對）', base: 10, cur: 'soul', altar: 2 },
  tamer:     { name: '馴獸',     icon: 'item/backpack',       max: 10, g: 1.3,  desc: '寵物效果 +3%',                     base: 10, cur: 'soul', altar: 2 },
  trainer:   { name: '教練',     icon: 'item/sword_ice',      max: 10, g: 1.3,  desc: '訓練場經驗 +10%',                  base: 8,  cur: 'soul', altar: 3 },
  researcher:{ name: '研究員',   icon: 'item/scroll_blue',    max: 10, g: 1.3,  desc: '研究速度 +5%',                     base: 8,  cur: 'soul', altar: 3 },
  chef:      { name: '主廚',     icon: 'item/potion_yellow',  max: 2,           desc: '料理效果 +50%',                    base: 4,  cur: 'ember', altar: 4 },
  gemStart:  { name: '天生神力', icon: 'item/gem_red',        max: 10,          desc: '開新的主塔或挑戰塔時，攻擊與防禦 +2', base: 2, cur: 'ember', altar: 5 },
  offline:   { name: '守夜人',   icon: 'icon/potionempty',    max: 5,           desc: '離線收益時數 +2',                  base: 2,  cur: 'ember', altar: 5 },
  eggLuck:   { name: '孵化師',   icon: 'icon/chest',          max: 5,           desc: '寵物蛋掉落機率 +20%，孵出稀有寵物機率提升', base: 2, cur: 'ember', altar: 6 },
  curseRes:  { name: '抗咒',     icon: 'icon/aurared',        max: 5,           desc: '新周目詛咒讓怪物增加的攻擊與生命 −6%', base: 3, cur: 'ember', altar: 7 },
  bounty:    { name: '賞金獵人', icon: 'item/crystal',        max: 5,           desc: '每日任務獎勵 +15%',                base: 2,  cur: 'ember', altar: 6 },
  legend:    { name: '傳說之路', icon: 'item/sword_fire',     max: 3,           desc: '首領掉落的裝備稀有度更高',         base: 4,  cur: 'ember', altar: 8 },
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
  forging:   { name: '鍛造學', icon: 'item/sword',         branch: '戰鬥', need: 'tactics',    study: 3, time: 60,  cost: { ore: 400, gold: 300 }, desc: '打造裝備的費用 −20%' },
  enchant:   { name: '附魔學', icon: 'item/sword_ice',     branch: '戰鬥', need: 'forging',    study: 5, time: 120, cost: { ore: 900, gold: 700, soul: 40 }, desc: '強化裝備的費用 −20%' },
  setcraft:  { name: '套裝學', icon: 'icon/armorgold',     branch: '戰鬥', need: 'enchant',    study: 7, time: 240, cost: { ore: 3000, gold: 2500, soul: 150 }, desc: '首領與精英掉落套裝的機率 +40%' },
  heroics:   { name: '英雄學', icon: 'icon/helmet',        branch: '戰鬥', need: 'bestiary',   study: 8, time: 300, cost: { ore: 5000, gold: 4000, soul: 300, ember: 5 }, desc: '所有英雄攻擊、防禦 +5' },
  beast:     { name: '馴獸學', icon: 'item/backpack',      branch: '生活', need: 'farming',    study: 3, time: 60,  cost: { wood: 500, gold: 400 }, desc: '寵物升級費用 −20%' },
  incubate:  { name: '孵化學', icon: 'icon/chest',         branch: '生活', need: 'beast',      study: 5, time: 150, cost: { wood: 1500, gold: 1200, soul: 60 }, desc: '寵物蛋掉落機率 +25%' },
  drill:     { name: '操練學', icon: 'item/sword_fire',    branch: '生活', need: 'beast',      study: 4, time: 90,  cost: { wood: 800, ore: 600, gold: 500 }, desc: '訓練場經驗 +25%' },
  logistics: { name: '後勤學', icon: 'icon/bag',           branch: '補給', need: 'kitchen',    study: 4, time: 90,  cost: { wood: 900, ore: 500 }, desc: '鑰匙與藥水存放上限 +50%' },
  deepcore:  { name: '深層開採', icon: 'item/crystal_green', branch: '補給', need: 'logistics', study: 6, time: 200, cost: { wood: 3000, ore: 2500, gold: 1500 }, desc: '伐木場、礦坑、市集產量 +30%' },
  astrology: { name: '星象學', icon: 'item/crystal',       branch: '探索', need: 'stars',      study: 5, time: 150, cost: { gold: 1500, soul: 80 }, desc: '每日任務 +1 個' },
  goldrush:  { name: '淘金術', icon: 'icon/goldcoins',     branch: '探索', need: 'astrology',  study: 6, time: 200, cost: { gold: 3000, soul: 120 }, desc: '黃金怪物出現機率 +30%' },
  voidlore:  { name: '虛空學', icon: 'item/gem_purple',    branch: '探索', need: 'goldrush',   study: 9, time: 480, cost: { gold: 10000, soul: 600, ember: 10 }, desc: '詛咒等級帶來的魂晶加成 +50%' },
  prosper:   { name: '繁榮學', icon: 'icon/bag',           branch: '生活', need: 'memory',     study: 6, time: 150, cost: { wood: 1000, ore: 800, gold: 600 }, desc: '建築產量 +25%，離線上限 +4 小時' },
};
const RESEARCH_ORDER = ['bomb', 'pick', 'feather', 'keys', 'potions', 'kitchen', 'logistics', 'deepcore', 'tactics', 'armor', 'bestiary', 'heroics', 'forging', 'enchant', 'setcraft',
  'maps', 'expedition', 'stars', 'astrology', 'goldrush', 'voidlore', 'farming', 'memory', 'prosper', 'beast', 'incubate', 'drill'];

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
  cloak:  { name: '寒冰斗篷', icon: 'icon/armor',     desc: '「冰凍」對你無效，在冰面上不會滑動' },
  mask:   { name: '防毒面具', icon: 'icon/helmet',    desc: '免疫中毒，走過毒沼不受傷' },
  rod:    { name: '避雷針',   icon: 'item/arrows_ice', desc: '「感電」對你無效，「閃避」也躲不過你' },
  ward:   { name: '暗影護符', icon: 'icon/ringmagic', desc: '看得見暗牆與隱形怪物，黑暗樓層視野 +3' },
  relic:  { name: '星辰聖物', icon: 'item/gem_purple', desc: '走過岩漿、毒沼不受傷；反傷、爆裂、感電傷害 −50%' },
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
ZONES.push(
  { id: 'frost',  name: '霜白冰原', pal: ['#2a3a52', '#2f405a', '#8fb8e0', '#4f7096', '#e8f6ff'], sky: ['#14243f', '#4a6a90'], fog: [200, 230, 255], ember: [210, 240, 255],
    mobs: ['v_frost_blob1', 'v_frost_ratling', 'v_frost_skeleton', 'draugr', 'v_frost_werewolfcub', 'v_frost_giantspider', 'v_frost_goblinveteran', 'v_frost_bonegolem', 'v_frost_wight'],
    fx:   [null, 'first', 'undead', 'chill', 'double', 'chill', 'armor', 'hard', 'regen'],
    elite: 'v_frost_chibi_orc', eliteFx: 'armor', boss: 'v_frost_giant', bossFx: 'chill', seals: 4, mech: ['ice', 'patrol', 'hidden', 'iron', 'plate'], tool: 'cloak',
    story: '深淵之主的身後還有路。往上是一片永不融化的冰原，連時間都被凍住了。' },
  { id: 'miasma', name: '毒瘴沼澤', pal: ['#2a3324', '#2f3a28', '#7a9a4a', '#4a6030', '#d8ff7a'], sky: ['#1a2614', '#4a5a2a'], fog: [190, 240, 140], ember: [200, 255, 120],
    mobs: ['ooze', 'zombie', 'v_toxic_frogling', 'v_toxic_ratling', 'v_toxic_naga', 'v_toxic_treefolk', 'v_toxic_goblin', 'v_toxic_hag', 'v_toxic_ghoul'],
    fx:   ['split', 'undead', 'poison', 'poison', 'pierce', 'regen', 'steal', 'curse', 'drain'],
    elite: 'v_toxic_chibi_ogre', eliteFx: 'regen', boss: 'v_toxic_medusa', bossFx: 'triple', seals: 4, mech: ['swamp', 'vine', 'patrol', 'hidden', 'dark'], tool: 'mask',
    story: '冰原底下是腐爛的沼澤。毒氣讓視線模糊，泥裡的東西會自己長回來。' },
  { id: 'storm',  name: '雷霆天穹', pal: ['#262a4a', '#2b2f52', '#8a8ae0', '#4a4a90', '#f0e8ff'], sky: ['#141838', '#4a4aa0'], fog: [190, 190, 255], ember: [230, 220, 255],
    mobs: ['v_storm_blob5', 'v_storm_imp', 'v_storm_airelemental', 'v_storm_merfolk', 'v_storm_centaur', 'v_storm_waterelemental', 'v_storm_crystalgolem', 'v_storm_orcishberserker', 'v_storm_dragonkinevoker'],
    fx:   ['shock', 'evade', 'magic', 'thorns', 'first', 'shock', 'hard', 'rage', 'magic'],
    elite: 'v_storm_skygiant', eliteFx: 'heavy', boss: 'v_storm_drake', bossFx: 'shock', seals: 5, mech: ['teleport', 'plate', 'patrol', 'iron', 'ice'], tool: 'rod',
    story: '塔穿過了雲層。雷電在石柱之間跳躍，風把每一步都推向懸崖。' },
  { id: 'shadow', name: '暗影迷宮', pal: ['#1c1828', '#211c2e', '#5a4a7a', '#352a4a', '#c8a0ff'], sky: ['#0c0a18', '#2a1a40'], fog: [170, 140, 220], ember: [200, 160, 255],
    mobs: ['v_shadow_deepelf', 'v_shadow_deepranger', 'v_shadow_deepelfassassin', 'v_shadow_darkapprentice', 'v_shadow_catkinwarlock', 'v_shadow_deepelfwizard', 'v_shadow_vampirechilder', 'v_shadow_sanctumguardian', 'v_shadow_dragonkinknight'],
    fx:   ['pierce', 'first', 'evade', 'invisible', 'curse', 'magic', 'drain', 'guard', 'armor'],
    elite: 'v_shadow_doppelganger', eliteFx: 'evade', boss: 'v_shadow_wraith', bossFx: 'heavy', seals: 5, mech: ['dark', 'hidden', 'teleport', 'patrol', 'iron'], tool: 'ward',
    story: '迷宮裡的敵人長著你熟悉的臉——那是走錯了路的英雄們的影子。' },
  { id: 'void',   name: '虛空終焉', pal: ['#24142c', '#2a1834', '#9a4aa0', '#5a2a64', '#ffb0f0'], sky: ['#10061a', '#5a1a5a'], fog: [255, 150, 230], ember: [255, 170, 240],
    mobs: ['v_void_chaosspawn', 'v_void_starelemental', 'v_void_banshee', 'v_void_hellion', 'v_void_deepspawn', 'v_void_demilich', 'v_void_earthelemental', 'v_void_minotaur', 'v_void_gorgoth'],
    fx:   ['split', 'magic', 'pierce', 'rage', 'triple', 'undead', 'regen', 'heavy', 'armor'],
    elite: 'v_void_heresiarch', eliteFx: 'shock', boss: 'v_void_abyssal', bossFx: 'rage', seals: 6, mech: ['teleport', 'dark', 'lava', 'ice', 'swamp', 'plate', 'patrol'], tool: 'relic',
    story: '塔的盡頭沒有天空，只有吞噬一切的虛空。真正的敵人，一直在這裡等你。' },
);
const FINAL_FLOOR = 100;

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
  v_frost_blob1: '冰晶史萊姆', v_frost_ratling: '雪原鼠人', v_frost_skeleton: '冰霜骷髏', draugr: '冰原屍鬼', v_frost_werewolfcub: '雪狼', v_frost_giantspider: '霜蛛',
  v_frost_goblinveteran: '雪原老兵', v_frost_bonegolem: '冰骨魔像', v_frost_wight: '冰霜屍妖', v_frost_chibi_orc: '冰原獸人王', v_frost_giant: '冰霜巨人',
  ooze: '腐蝕軟泥', zombie: '沼澤殭屍', v_toxic_frogling: '毒蛙人', v_toxic_ratling: '瘟疫鼠', v_toxic_naga: '毒鱗娜迦', v_toxic_treefolk: '枯萎樹人',
  v_toxic_goblin: '沼地哥布林', v_toxic_hag: '瘴氣巫婆', v_toxic_ghoul: '腐屍鬼', v_toxic_chibi_ogre: '瘴氣食人魔', v_toxic_medusa: '沼澤女王',
  v_storm_blob5: '電光水母', v_storm_imp: '雷精', v_storm_airelemental: '雷雲元素', v_storm_merfolk: '風暴魚人', v_storm_centaur: '雷霆半人馬',
  v_storm_waterelemental: '暴雨元素', v_storm_crystalgolem: '雷晶魔像', v_storm_orcishberserker: '雷鎚狂戰士', v_storm_dragonkinevoker: '雷龍術士',
  v_storm_skygiant: '雷霆巨人', v_storm_drake: '雷霆古龍',
  v_shadow_deepelf: '暗精靈', v_shadow_deepranger: '暗影遊俠', v_shadow_deepelfassassin: '暗影刺客', v_shadow_darkapprentice: '星象叛徒',
  v_shadow_catkinwarlock: '冥貓術士', v_shadow_deepelfwizard: '暗影法師', v_shadow_vampirechilder: '血族貴族', v_shadow_sanctumguardian: '墮落守衛',
  v_shadow_dragonkinknight: '暗影騎士', v_shadow_doppelganger: '千面魔', v_shadow_wraith: '影之王',
  v_void_chaosspawn: '虛空之子', v_void_starelemental: '墮星', v_void_banshee: '虛空哭靈', v_void_hellion: '虛空獄卒', v_void_deepspawn: '虛空觸手',
  v_void_demilich: '虛空巫妖', v_void_earthelemental: '崩壞巨岩', v_void_minotaur: '虛空牛魔', v_void_gorgoth: '虛空戈格斯', v_void_heresiarch: '虛空主教',
  v_void_abyssal: '終焉之主',
  v_gold_blob1: '黃金史萊姆', v_gold_frogling: '黃金蛙', v_gold_merfolk: '黃金魚人', v_gold_imp: '黃金小惡魔', v_gold_crystalgolem: '黃金魔像',
  v_gold_ratling: '金鼠', v_gold_ooze: '黃金軟泥', v_gold_airelemental: '金雲', v_gold_doppelganger: '金面魔', v_gold_minotaur: '黃金牛魔',
};
// 怪物家族（剋制用）
const FAMILY = { undead: '不死', beast: '野獸', element: '元素', demon: '惡魔' };
const MON_FAMILY = {
  skeleton: 'undead', bonegolem: 'undead', demilich: 'undead', ghoul: 'undead', wight: 'undead', banshee: 'undead', wraith: 'undead', plaguezombie: 'undead',
  ratling: 'beast', giantspider: 'beast', frogling: 'beast', werewolfcub: 'beast', naga: 'beast', centaur: 'beast', minotaur: 'beast', drake: 'beast', dragonwhelp: 'beast', medusa: 'beast',
  goblin: 'beast', goblinscout: 'beast', goblinveteran: 'beast', chibi_goblin: 'beast', chibi_orc: 'beast', chibi_ogre: 'beast', orcishberserker: 'beast', giant: 'beast', skygiant: 'beast', hag: 'beast', merfolk: 'beast',
  blob1: 'element', blob6: 'element', blob3: 'element', blob26: 'element', blob16: 'element', blob38: 'element', blob20: 'element', blob40: 'element', blob5: 'element',
  waterelemental: 'element', fireelemental: 'element', airelemental: 'element', starelemental: 'element', earthelemental: 'element', crystalgolem: 'element', treefolk: 'element',
  draugr: 'undead', zombie: 'undead', v_frost_skeleton: 'undead', v_frost_bonegolem: 'undead', v_frost_wight: 'undead', v_toxic_ghoul: 'undead', v_shadow_vampirechilder: 'undead', v_shadow_wraith: 'undead',
  v_void_banshee: 'undead', v_void_demilich: 'undead',
  v_frost_ratling: 'beast', v_frost_werewolfcub: 'beast', v_frost_giantspider: 'beast', v_frost_goblinveteran: 'beast', v_frost_chibi_orc: 'beast', v_frost_giant: 'beast',
  v_toxic_frogling: 'beast', v_toxic_ratling: 'beast', v_toxic_naga: 'beast', v_toxic_goblin: 'beast', v_toxic_hag: 'beast', v_toxic_chibi_ogre: 'beast', v_toxic_medusa: 'beast',
  v_storm_merfolk: 'beast', v_storm_centaur: 'beast', v_storm_orcishberserker: 'beast', v_storm_skygiant: 'beast', v_storm_drake: 'beast', v_void_minotaur: 'beast',
  v_frost_blob1: 'element', ooze: 'element', v_toxic_treefolk: 'element', v_storm_blob5: 'element', v_storm_airelemental: 'element', v_storm_waterelemental: 'element',
  v_storm_crystalgolem: 'element', v_void_starelemental: 'element', v_void_earthelemental: 'element',
  v_storm_imp: 'demon', v_storm_dragonkinevoker: 'demon', v_shadow_deepelf: 'demon', v_shadow_deepranger: 'demon', v_shadow_deepelfassassin: 'demon', v_shadow_darkapprentice: 'demon',
  v_shadow_catkinwarlock: 'demon', v_shadow_deepelfwizard: 'demon', v_shadow_sanctumguardian: 'demon', v_shadow_dragonkinknight: 'demon', v_shadow_doppelganger: 'demon',
  v_void_chaosspawn: 'demon', v_void_hellion: 'demon', v_void_deepspawn: 'demon', v_void_gorgoth: 'demon', v_void_heresiarch: 'demon', v_void_abyssal: 'demon',
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
  armor:     { name: '鐵壁', desc: '牠受到的前 3 下攻擊傷害減半' },
  regen:     { name: '再生', desc: '牠每次出手後回復 8% 生命；傷害太低會打不死' },
  rage:      { name: '狂怒', desc: '每回合攻擊力 +12%，越拖越危險' },
  chill:     { name: '冰凍', desc: '你每攻擊 2 下就會被凍住一回合，讓牠多打一次' },
  shock:     { name: '感電', desc: '牠每次攻擊額外造成 0.1U 的雷擊傷害（無視防禦）' },
  evade:     { name: '閃避', desc: '你每 3 次攻擊會有 1 次落空' },
  pierce:    { name: '穿刺', desc: '牠的攻擊無視你一半的防禦' },
  heavy:     { name: '重擊', desc: '每 3 回合一次重擊，造成 2.5 倍傷害' },
  triple:    { name: '三連擊', desc: '每回合攻擊三次（每次較輕）' },
};
// 黃金怪物：隨機出現的稀有怪，金幣 ×5、經驗 ×3，必掉裝備
const GOLDEN = ['v_gold_blob1', 'v_gold_frogling', 'v_gold_merfolk', 'v_gold_imp', 'v_gold_crystalgolem', 'v_gold_ratling', 'v_gold_ooze', 'v_gold_airelemental', 'v_gold_doppelganger', 'v_gold_minotaur'];

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
  { stars: 180, reward: { soul: 400, ember: 8 } },
  { stars: 210, reward: { soul: 500, ember: 10 } },
  { stars: 240, reward: { soul: 650, ember: 12 } },
  { stars: 270, reward: { soul: 800, ember: 15 } },
  { stars: 300, reward: { soul: 1200, ember: 25 } },
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
    '深淵之主崩解成星光。但在牠消散的地方，一道冰冷的階梯繼續往上延伸——牠只是某個更大存在的影子。',
    '冰霜巨人碎成冰晶。融化的雪水往下流，滲進一片冒著毒氣的沼澤。',
    '沼澤女王沉入泥中，毒霧散開，露出一根直通雲端的雷柱。',
    '雷霆古龍墜落，雲層裂開。裂縫之後是一座沒有光的迷宮。',
    '影之王消散時，你在牠的臉上看到了自己。迷宮的出口通向一片虛無。',
    '終焉之主崩解成無數星光，落回營地的篝火裡。火焰從此不再熄滅。',
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
  { id: 'f50',     name: '深淵征服者', desc: '主塔抵達第 50 層',         test: s => s.stats.bestFloor >= 50,  reward: { ember: 8 }, title: '深淵征服者' },
  { id: 'f60',     name: '冰原行者',   desc: '主塔抵達第 60 層',         test: s => s.stats.bestFloor >= 60,  reward: { ember: 10 }, title: '冰原行者' },
  { id: 'f70',     name: '毒沼倖存者', desc: '主塔抵達第 70 層',         test: s => s.stats.bestFloor >= 70,  reward: { ember: 12 }, title: '毒沼倖存者' },
  { id: 'f80',     name: '御雷者',     desc: '主塔抵達第 80 層',         test: s => s.stats.bestFloor >= 80,  reward: { ember: 14 }, title: '御雷者' },
  { id: 'f90',     name: '影之剋星',   desc: '主塔抵達第 90 層',         test: s => s.stats.bestFloor >= 90,  reward: { ember: 16 }, title: '影之剋星' },
  { id: 'ng10',    name: '咒縛之王',   desc: '在詛咒等級 10 以上通關',   test: s => s.stats.bestCurse >= 10,  reward: { ember: 30 }, title: '咒縛之王' },
  { id: 'ng20',    name: '永恆守護者', desc: '在詛咒等級 20 通關',       test: s => s.stats.bestCurse >= 20,  reward: { ember: 60 }, title: '永恆守護者' },
  { id: 'star250', name: '群星之主',   desc: '主塔累積 250 顆星',        test: s => s.stats.stars >= 250,     reward: { ember: 20 }, title: '群星之主' },
  { id: 'k2000',   name: '千軍辟易',   desc: '累計擊敗 2000 隻怪物',     test: s => s.stats.kills >= 2000,    reward: { ember: 10 } },
  { id: 'k10000',  name: '萬夫莫敵',   desc: '累計擊敗 10000 隻怪物',    test: s => s.stats.kills >= 10000,   reward: { ember: 25 }, title: '萬夫莫敵' },
  { id: 'boss20',  name: '首領剋星',   desc: '累計擊敗 20 位首領',       test: s => s.stats.bossKills >= 20,  reward: { ember: 8 } },
  { id: 'boss100', name: '弒王者',     desc: '累計擊敗 100 位首領',      test: s => s.stats.bossKills >= 100, reward: { ember: 25 }, title: '弒王者' },
  { id: 'gold1',   name: '閃閃發亮',   desc: '擊敗一隻黃金怪物',         test: s => (s.stats.golden || 0) >= 1,  reward: { soul: 30 } },
  { id: 'gold30',  name: '淘金客',     desc: '擊敗 30 隻黃金怪物',       test: s => (s.stats.golden || 0) >= 30, reward: { ember: 10 }, title: '淘金客' },
  { id: 'codex80', name: '怪物百科',   desc: '圖鑑登錄 80 種怪物',       test: s => Object.keys(s.codex).length >= 80, reward: { ember: 10 }, title: '怪物百科' },
  { id: 'codex120',name: '萬物圖鑑',   desc: '圖鑑登錄全部怪物',         test: s => Object.keys(s.codex).length >= Object.keys(MON_NAMES).length, reward: { ember: 30 }, title: '萬物圖鑑' },
  { id: 'myth',    name: '神話降臨',   desc: '獲得神話裝備',             test: s => (s.stats.bestGear || 0) >= 4, reward: { ember: 15 }, title: '神話之手' },
  { id: 'plus20',  name: '登峰造極',   desc: '把一件裝備強化到 +20',     test: s => (s.stats.bestPlus || 0) >= 20, reward: { ember: 10 } },
  { id: 'set4',    name: '成套收藏',   desc: '穿上 4 件同套裝',          test: s => (s.stats.bestSet || 0) >= 4, reward: { ember: 6 } },
  { id: 'set6',    name: '完美套裝',   desc: '穿上 6 件同套裝',          test: s => (s.stats.bestSet || 0) >= 6, reward: { ember: 15 }, title: '套裝大師' },
  { id: 'fuse',    name: '合成師',     desc: '在符文工坊合成 10 次',     test: s => (s.stats.fuses || 0) >= 10, reward: { soul: 80 } },
  { id: 'pet20',   name: '小精怪樂園', desc: '擁有 20 種寵物',           test: s => Object.keys(s.pets.own).length >= 20, reward: { ember: 8 } },
  { id: 'petstar', name: '寵物大師',   desc: '一隻寵物升到 ★5',          test: s => Object.values(s.pets.own).some(p => (p.star || 1) >= 5), reward: { ember: 12 }, title: '寵物大師' },
  { id: 'talent50',name: '天賦異稟',   desc: '天賦總等級達到 50',        test: s => Object.values(s.talents).reduce((a, b) => a + b, 0) >= 50,  reward: { ember: 6 } },
  { id: 'talent200',name: '天選之人',  desc: '天賦總等級達到 200',       test: s => Object.values(s.talents).reduce((a, b) => a + b, 0) >= 200, reward: { ember: 20 }, title: '天選之人' },
  { id: 'quest30', name: '可靠的幫手', desc: '完成 30 個每日任務',       test: s => (s.stats.quests || 0) >= 30,  reward: { ember: 6 } },
  { id: 'quest300',name: '營地支柱',   desc: '完成 300 個每日任務',      test: s => (s.stats.quests || 0) >= 300, reward: { ember: 25 }, title: '營地支柱' },
  { id: 'lv50',    name: '傳奇英雄',   desc: '任一英雄達到 Lv50',        test: s => HERO_ORDER.some(h => s.heroes[h].lvl >= 50), reward: { ember: 10 }, title: '傳奇英雄' },
  { id: 'lv99',    name: '登峰',       desc: '任一英雄達到 Lv99',        test: s => HERO_ORDER.some(h => s.heroes[h].lvl >= 99), reward: { ember: 40 }, title: '登峰之人' },
  { id: 'awaken8', name: '眾神甦醒',   desc: '8 位英雄全部完全覺醒',     test: s => HERO_ORDER.every(h => s.heroes[h].awaken >= 3), reward: { ember: 40 }, title: '眾神甦醒' },
  { id: 'camp10',  name: '繁華營地',   desc: '所有設施都達到 Lv10',      test: s => BUILDING_ORDER.every(b => s.buildings[b] >= 10), reward: { ember: 30 }, title: '營地之主' },
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
// 裝備穿在隊伍身上：換出戰英雄時裝備跟著走。主屬性 = 部位基礎 × 品階倍率 × 稀有度倍率，每強化一級 +10% 基礎值
const GEAR_SLOTS = {
  weapon:  { name: '武器', icon: 'item/sword',       main: { atk: 2.4 } },
  offhand: { name: '副手', icon: 'item/shield',      main: { def: 1.4, atk: 0.3 } },
  armor:   { name: '鎧甲', icon: 'item/armor',       main: { def: 2.4 } },
  hands:   { name: '手套', icon: 'item/gauntlet',    main: { atk: 1.0, def: 0.4 } },
  boots:   { name: '鞋子', icon: 'item/boots',       main: { def: 0.8, atk: 0.5 } },
  trinket: { name: '飾品', icon: 'item/ring_red',    main: { atk: 0.9, def: 0.9 } },
};
const GEAR_SLOT_ORDER = ['weapon', 'offhand', 'armor', 'hands', 'boots', 'trinket'];
const GEAR_RARITY = [
  { name: '普通', color: '#cfc9ea', mult: 1,    affix: 0 },
  { name: '精良', color: '#74c0fc', mult: 1.25, affix: 1 },
  { name: '史詩', color: '#c58bff', mult: 1.6,  affix: 2 },
  { name: '傳說', color: '#ffc35c', mult: 2,    affix: 2 },
  { name: '神話', color: '#ff6b8a', mult: 2.6,  affix: 3 },
];
const GEAR_TIER = [1, 2, 3, 4.5, 6, 8, 10, 13, 16, 20, 25, 31];
const GEAR_TIER_NAME = ['粗製', '鐵製', '精鋼', '秘銀', '符文', '龍骨', '霜晶', '瘴骨', '雷紋', '暗影', '星辰', '虛空'];
// 款式：[圖示, 名稱, 屬性權重（不寫就用部位預設）]
const GEAR_BASES = {
  weapon: [['item/sword', '長劍'], ['item/sword_fire', '炎之劍'], ['item/sword_ice', '霜之劍'], ['item/axe', '戰斧'], ['item/axe_fire', '熔岩斧'], ['item/axe_ice', '冰晶斧'],
    ['item/dagger', '短刃', { atk: 2.2, def: 0.2 }], ['item/dagger_fire', '火紋匕首', { atk: 2.2, def: 0.2 }], ['item/dagger_ice', '寒光匕首', { atk: 2.2, def: 0.2 }], ['item/bow', '長弓'],
    ['icon/crossbow', '十字弩'], ['icon/hammerheavy', '重錘', { atk: 2.7 }], ['icon/swordblood', '血紋大劍', { atk: 2.7 }], ['icon/axe', '雙刃斧']],
  offhand: [['item/shield', '鐵盾'], ['item/shield_gold', '聖盾'], ['item/shield_wood', '木盾'], ['item/shield_wood_gold', '鑲金木盾'], ['icon/shield', '騎士盾'], ['icon/shield2', '紋章盾'],
    ['item/book', '魔導書', { atk: 1.0, def: 0.7 }], ['icon/bookholy', '聖典', { atk: 0.7, def: 1.0 }], ['item/scroll_blue', '秘術卷軸', { atk: 1.1, def: 0.6 }], ['item/torch', '引路火炬', { atk: 0.9, def: 0.8 }]],
  armor: [['item/armor', '皮甲'], ['item/armor_gold', '金邊鎧甲'], ['icon/armorgold', '王者胸甲'], ['icon/armor', '鎖子甲'], ['icon/legarmor', '戰鎧', { def: 2.2, atk: 0.2 }]],
  hands: [['item/gauntlet', '護手'], ['item/gauntlet_gold', '金色拳套'], ['icon/glove', '皮手套', { atk: 0.8, def: 0.6 }]],
  boots: [['item/boots', '皮靴'], ['item/boots_gold', '疾風靴', { atk: 0.7, def: 0.6 }], ['icon/boots', '旅人之靴']],
  trinket: [['item/ring_red', '紅玉戒指', { atk: 1.35, def: 0.45 }], ['item/ring_green', '翠玉戒指', { atk: 0.45, def: 1.35 }], ['icon/ringmagic', '秘法指環'], ['icon/aurared', '紅焰護符', { atk: 1.35, def: 0.45 }],
    ['item/crystal', '星之結晶'], ['item/crystal_green', '森之結晶', { atk: 0.45, def: 1.35 }], ['item/gem_purple', '紫晶墜飾'], ['icon/potionblue', '藍色護身瓶', { atk: 0.45, def: 1.35 }]],
};
// 詞綴：數值依稀有度（精良 / 史詩 / 傳說 / 神話），% 類存成小數
const AFFIXES = {
  atkPct:      { text: '攻擊 +{v}%',                 v: [3, 4, 6, 8] },
  defPct:      { text: '防禦 +{v}%',                 v: [3, 4, 6, 8] },
  reduce:      { text: '受到的傷害 −{v}%',           v: [2, 3, 4, 6] },
  bossAtk:     { text: '對精英與首領攻擊 +{v}%',     v: [5, 7, 10, 14] },
  bossRes:     { text: '精英與首領對你的傷害 −{v}%', v: [4, 6, 8, 11] },
  brk:         { text: '怪物防禦 −{v}%',             v: [2, 3, 4, 6] },
  gOpen:       { text: '開戰先打一下（你一擊的 {v}%）', v: [8, 12, 16, 22] },
  leech:       { text: '攻擊時回復傷害的 {v}%',      v: [3, 4, 6, 8] },
  killHeal:    { text: '每次擊殺回復 {v}U 生命',     v: [0.05, 0.07, 0.1, 0.14], raw: true },
  stairHeal:   { text: '每次上樓回復 {v}U 生命',     v: [0.3, 0.5, 0.7, 1], raw: true },
  potionPct:   { text: '藥水效果 +{v}%',             v: [3, 5, 7, 9] },
  gemPct:      { text: '寶石效果 +{v}%',             v: [2, 3, 4, 6] },
  goldPct:     { text: '塔內金幣 +{v}%',             v: [8, 12, 18, 25] },
  expPct:      { text: '經驗 +{v}%',                 v: [4, 6, 9, 12] },
  soulPct:     { text: '魂晶 +{v}%',                 v: [4, 6, 9, 12] },
  petPct:      { text: '寵物效果 +{v}%',             v: [4, 6, 9, 12] },
  shopOff:     { text: '祭壇修女價格 −{v}%',         v: [4, 6, 9, 12] },
  magicRes:    { text: '魔法傷害 −{v}%',             v: [8, 12, 18, 24] },
  hazard:      { text: '中毒・反傷・爆炸・岩漿・感電 −{v}%', v: [10, 15, 20, 28] },
  fam_undead:  { text: '對不死系攻擊 +{v}%',         v: [6, 9, 13, 18] },
  fam_beast:   { text: '對野獸系攻擊 +{v}%',         v: [6, 9, 13, 18] },
  fam_element: { text: '對元素系攻擊 +{v}%',         v: [6, 9, 13, 18] },
  fam_demon:   { text: '對惡魔系攻擊 +{v}%',         v: [6, 9, 13, 18] },
};
// 套裝：每區的首領與精英有機會掉落該區套裝（史詩以上），穿越多件效果越強
const GEAR_SETS = {
  bone:   { name: '骸骨守望', zone: 0, color: '#d6d0f0', b: { 2: { fam_undead: 0.12 }, 4: { killHeal: 0.15 }, 6: { cross: 1, fam_undead: 0.15 } },
            d: { 2: '對不死系攻擊 +12%', 4: '每次擊殺回復 0.15U', 6: '不死系只要打一次，對不死系再 +15%' } },
  grove:  { name: '林語',     zone: 1, color: '#7ee08a', b: { 2: { potionPct: 0.08 }, 4: { noPoison: 1 }, 6: { petHeal: 0.08, fam_beast: 0.15 } },
            d: { 2: '藥水效果 +8%', 4: '免疫中毒', 6: '受傷後治療 8%，對野獸系 +15%' } },
  tide:   { name: '潮汐',     zone: 2, color: '#74c0fc', b: { 2: { magicRes: 0.15 }, 4: { defPct: 0.06 }, 6: { noThorns: 1, reduce: 0.06 } },
            d: { 2: '魔法傷害 −15%', 4: '防禦 +6%', 6: '反傷、爆裂無效，受到的傷害 −6%' } },
  magma:  { name: '熔火',     zone: 3, color: '#ff8a65', b: { 2: { atkPct: 0.05 }, 4: { fam_demon: 0.15 }, 6: { petOpen: 0.4, bossAtk: 0.1 } },
            d: { 2: '攻擊 +5%', 4: '對惡魔系 +15%', 6: '開戰先打一下（40%），對精英首領 +10%' } },
  star:   { name: '星輝',     zone: 4, color: '#d6c8ff', b: { 2: { gemPct: 0.05 }, 4: { expPct: 0.12 }, 6: { skillPlus: 1, fam_element: 0.15 } },
            d: { 2: '寶石效果 +5%', 4: '經驗 +12%', 6: '英雄技能每層 +1 次，對元素系 +15%' } },
  frost:  { name: '霜語',     zone: 5, color: '#bfe6ff', b: { 2: { noChill: 1 }, 4: { reduce: 0.05 }, 6: { noFirst: 1, stairHeal: 1.2 } },
            d: { 2: '冰凍無效', 4: '受到的傷害 −5%', 6: '怪物先攻無效，每次上樓回復 1.2U' } },
  venom:  { name: '腐毒',     zone: 6, color: '#b6e36a', b: { 2: { hazard: 0.2 }, 4: { leech: 0.04 }, 6: { noRegen: 1, atkPct: 0.06 } },
            d: { 2: '中毒等環境傷害 −20%', 4: '攻擊時回復傷害的 4%', 6: '怪物的再生無效，攻擊 +6%' } },
  thunder:{ name: '雷鳴',     zone: 7, color: '#a99cff', b: { 2: { noShock: 1 }, 4: { brk: 0.06 }, 6: { noEvade: 1, petHit: 0.12 } },
            d: { 2: '感電無效', 4: '怪物防禦 −6%', 6: '閃避無效，每次攻擊後追加一擊（12%）' } },
  umbra:  { name: '幽影',     zone: 8, color: '#9a7ae0', b: { 2: { seeAll: 1 }, 4: { bossRes: 0.1 }, 6: { skipFirstHit: 1, defPct: 0.06 } },
            d: { 2: '看得見暗牆與隱形怪物', 4: '精英與首領對你的傷害 −10%', 6: '擋下怪物的第一下攻擊，防禦 +6%' } },
  abyss:  { name: '終焉',     zone: 9, color: '#ff8ae0', b: { 2: { atkPct: 0.06, defPct: 0.06 }, 4: { noPierce: 1, noHeavy: 1 }, 6: { brk: 0.1, reduce: 0.08, petHit: 0.1 } },
            d: { 2: '攻擊、防禦 +6%', 4: '穿刺與重擊無效', 6: '怪物防禦 −10%，受到傷害 −8%，追加一擊（10%）' } },
};
const SET_ORDER = Object.keys(GEAR_SETS);
// 掉落稀有度權重：普通 / 精良 / 史詩 / 傳說 / 神話
const GEAR_DROP = { elite: [50, 34, 12, 3.5, 0.5], boss: [10, 40, 33, 14, 3], golden: [0, 45, 38, 14, 3] };
const GEAR_BAG = 60;

// ---------- 寵物 ----------
// 稀有度沿用裝備的顏色；fx 數值 × 等級倍率 × 星級倍率，flag 是不隨等級變化的能力
// 效果代號：petOpen 開場撞擊、petHit 追擊（every 每幾下一次）、petHeal 受傷後治療、petBreak 破甲，其他與裝備詞綴相同
const PETS = {
  horn:    { name: '角角',     icon: 'mon/blob34', r: 0, role: 'atk',   fx: { petOpen: 0.18 },                 desc: '開戰先撞一下，造成你一擊 {petOpen}% 的傷害' },
  ember:   { name: '火球球',   icon: 'mon/blob40', r: 1, role: 'atk',   fx: { petHit: 0.09 },                  desc: '你每次攻擊後追擊，造成你一擊 {petHit}% 的傷害' },
  crab:    { name: '鉗鉗蟹',   icon: 'mon/blob25', r: 1, role: 'atk',   fx: { petBreak: 0.16 },                desc: '夾碎護甲：怪物防禦 −{petBreak}%' },
  squid:   { name: '小章魚',   icon: 'mon/blob17', r: 2, role: 'atk',   fx: { petHit: 0.35 }, every: 2,        desc: '你每攻擊 2 下，觸手連打造成你一擊 {petHit}% 的傷害' },
  cube:    { name: '方塊牛',   icon: 'mon/blob24', r: 3, role: 'atk',   fx: { petHit: 0.15, bossAtk: 0.1 },    desc: '每次攻擊後追擊 {petHit}%；對精英與首領攻擊 +{bossAtk}%' },
  zap:     { name: '電電',     icon: 'mon/blob7',  r: 1, role: 'atk',   fx: { petOpen: 0.12 }, flag: { noShock: 1 }, desc: '開戰電擊 {petOpen}%；感電對你無效' },
  imp2:    { name: '綠角魔',   icon: 'mon/blob27', r: 1, role: 'atk',   fx: { petHit: 0.06, fam_undead: 0.1 }, desc: '追擊 {petHit}%；對不死系攻擊 +{fam_undead}%' },
  blu:     { name: '藍眼球',   icon: 'mon/blob19', r: 2, role: 'atk',   fx: { petBreak: 0.1, fam_element: 0.12 }, desc: '怪物防禦 −{petBreak}%；對元素系攻擊 +{fam_element}%' },
  worm:    { name: '紫蟲蟲',   icon: 'mon/blob31', r: 2, role: 'atk',   fx: { petHit: 0.5 }, every: 3,         desc: '你每攻擊 3 下，紫蟲猛咬一口：你一擊 {petHit}% 的傷害' },
  chomp:   { name: '大嘴怪',   icon: 'mon/blob12', r: 3, role: 'atk',   fx: { petHit: 0.1, killHeal: 0.06, goldPct: 0.15 }, desc: '追擊 {petHit}%；擊殺後回復 {killHeal}U、金幣 +{goldPct}%' },
  drop:    { name: '翅翅水滴', icon: 'mon/blob9',  r: 0, role: 'heal',  fx: { petHeal: 0.08 },                 desc: '你每次受傷後，治療該次傷害的 {petHeal}%' },
  jelly:   { name: '綠果凍',   icon: 'mon/blob16', r: 1, role: 'heal',  fx: { killHeal: 0.12 },                desc: '每次擊殺怪物，回復 {killHeal}U 生命' },
  pinky:   { name: '粉粉',     icon: 'mon/blob3',  r: 0, role: 'heal',  fx: { potionPct: 0.06 },               desc: '藥水效果 +{potionPct}%' },
  bun:     { name: '角兔',     icon: 'mon/blob8',  r: 0, role: 'heal',  fx: { stairHeal: 0.5 },                desc: '每次上樓回復 {stairHeal}U 生命' },
  peach:   { name: '桃桃',     icon: 'mon/blob32', r: 1, role: 'heal',  fx: { petHeal: 0.04, potionPct: 0.04 }, desc: '受傷後治療 {petHeal}%；藥水效果 +{potionPct}%' },
  berry:   { name: '莓莓',     icon: 'mon/blob22', r: 2, role: 'heal',  fx: { petHeal: 0.05, killHeal: 0.06 }, desc: '受傷後治療 {petHeal}%；擊殺回復 {killHeal}U' },
  cloudy:  { name: '藍雲朵',   icon: 'mon/blob39', r: 2, role: 'heal',  fx: { petHeal: 0.08, potionPct: 0.03 }, desc: '受傷後治療 {petHeal}%；藥水效果 +{potionPct}%' },
  lazy:    { name: '懶懶',     icon: 'mon/blob18', r: 0, role: 'guard', fx: { reduce: 0.05 },                  desc: '躺在你前面擋刀：受到的傷害 −{reduce}%' },
  pigtail: { name: '雙馬尾',   icon: 'mon/blob29', r: 1, role: 'guard', fx: {}, flag: { noFirst: 1 },          desc: '擋在你前面：怪物的先攻失效' },
  sunny:   { name: '陽陽',     icon: 'mon/blob13', r: 1, role: 'guard', fx: { reduce: 0.03 }, flag: { noChill: 1 }, desc: '冰凍對你無效；受到的傷害 −{reduce}%' },
  rock:    { name: '石頭蟲',   icon: 'mon/blob28', r: 1, role: 'guard', fx: { bossRes: 0.06 },                 desc: '精英與首領對你的傷害 −{bossRes}%' },
  mud:     { name: '泥巴人',   icon: 'mon/blob21', r: 2, role: 'guard', fx: { defPct: 0.04 }, flag: { noHeavy: 1 }, desc: '重擊無效；防禦 +{defPct}%' },
  night:   { name: '夜夜',     icon: 'mon/blob23', r: 2, role: 'guard', fx: { magicRes: 0.15, fam_demon: 0.1 }, desc: '魔法傷害 −{magicRes}%；對惡魔系攻擊 +{fam_demon}%' },
  mage:    { name: '紫小妖',   icon: 'mon/blob10', r: 2, role: 'guard', fx: { magicRes: 0.3, hazard: 0.3 },    desc: '魔法傷害 −{magicRes}%；中毒・反傷・爆炸・岩漿・感電 −{hazard}%' },
  ghost:   { name: '冰翼怪',   icon: 'mon/blob15', r: 3, role: 'guard', fx: { reduce: 0.06, petHeal: 0.06 },   desc: '冰翼護身：受到的傷害 −{reduce}%，受傷後治療 {petHeal}%' },
  coin:    { name: '金錢怪',   icon: 'mon/blob33', r: 0, role: 'aid',   fx: { goldPct: 0.3 },                  desc: '塔內金幣 +{goldPct}%' },
  nerd:    { name: '書蟲',     icon: 'mon/blob2',  r: 0, role: 'aid',   fx: { expPct: 0.1 },                   desc: '經驗 +{expPct}%' },
  pinky2:  { name: '小紅',     icon: 'mon/blob35', r: 0, role: 'aid',   fx: { soulPct: 0.08 },                 desc: '魂晶 +{soulPct}%' },
  eye:     { name: '獨眼仔',   icon: 'mon/blob30', r: 1, role: 'aid',   fx: {}, flag: { seeAll: 1, sight: 1 }, desc: '看得見暗牆與隱形怪物；黑暗樓層視野 +1' },
  pea:     { name: '豆豆眼',   icon: 'mon/blob11', r: 1, role: 'aid',   fx: { eggPct: 0.3 },                   desc: '寵物蛋掉落機率 +{eggPct}%' },
  stalk:   { name: '長腳怪',   icon: 'mon/blob14', r: 1, role: 'aid',   fx: {}, flag: { sight: 2, noEvade: 1 }, desc: '黑暗樓層視野 +2；怪物的閃避無效' },
  medusa:  { name: '水母仙',   icon: 'mon/blob36', r: 2, role: 'aid',   fx: { gemPct: 0.06 },                  desc: '寶石效果 +{gemPct}%' },
  eyes:    { name: '百眼怪',   icon: 'mon/blob4',  r: 2, role: 'aid',   fx: { goldenPct: 0.5 }, flag: { seeAll: 1 }, desc: '看穿一切；黃金怪物出現機率 +{goldenPct}%' },
  crown:   { name: '金毛王',   icon: 'mon/blob37', r: 3, role: 'aid',   fx: { goldPct: 0.3, expPct: 0.1, potionPct: 0.06, gemPct: 0.03 }, desc: '金幣 +{goldPct}%、經驗 +{expPct}%、藥水 +{potionPct}%、寶石 +{gemPct}%' },
};
const PET_ORDER = Object.keys(PETS);
const PET_ROLES = { atk: { name: '攻擊', color: '#ff8a65' }, heal: { name: '治療', color: '#7ee08a' }, guard: { name: '守護', color: '#74c0fc' }, aid: { name: '輔助', color: '#ffd27a' } };
const PET_HATCH = [50, 32, 14, 4];
const PET_STAR_NEED = [0, 1, 2, 3, 4]; // 從 ★n 升到 ★n+1 需要的重複數量

// ---------- 每日任務（星象台） ----------
// need 會依進度（主塔最高層）放大；rw 是基礎獎勵
const QUEST_TYPES = {
  kill:    { text: '擊敗 {n} 隻怪物',          n: [20, 40, 60],  rw: { soul: 10, gold: 150 } },
  elite:   { text: '擊敗 {n} 隻精英或首領',    n: [1, 2, 3],     rw: { soul: 15 } },
  floor:   { text: '在任一座塔抵達 {n} 個新樓層', n: [2, 3, 5],   rw: { soul: 15, ore: 100 } },
  potion:  { text: '喝 {n} 瓶藥水',            n: [2, 4, 6],     rw: { soul: 8, wood: 200 } },
  door:    { text: '打開 {n} 扇門',            n: [3, 6, 10],    rw: { soul: 8, gold: 120 } },
  gem:     { text: '撿起 {n} 顆寶石',          n: [4, 8, 12],    rw: { soul: 10, ore: 120 } },
  craft:   { text: '打造或合成 {n} 件裝備',    n: [1, 2, 3],     rw: { soul: 12, ore: 200 } },
  enhance: { text: '強化裝備 {n} 次',          n: [2, 4, 6],     rw: { soul: 10, gold: 200 } },
  cook:    { text: '做 {n} 道料理',            n: [1, 2, 3],     rw: { soul: 10, wood: 200 } },
  harvest: { text: '收成 {n} 次',              n: [2, 3, 5],     rw: { soul: 8, gold: 100 } },
  exp:     { text: '收回 {n} 次派遣',          n: [1, 2, 3],     rw: { soul: 10, wood: 250 } },
  build:   { text: '升級設施 {n} 次',          n: [2, 3, 5],     rw: { soul: 8, ore: 150 } },
  petup:   { text: '升級寵物 {n} 次',          n: [1, 2, 4],     rw: { soul: 10 } },
  daily:   { text: '在挑戰塔抵達第 {n} 層',    n: [3, 6, 10],    rw: { soul: 15, ember: 1 } },
};

