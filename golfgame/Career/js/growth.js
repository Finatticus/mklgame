// 成長系統：年齡曲線、經驗值與等級、技能點、訓練、天賦、球風與上限、技能卡、實際上場用的素質（含加成上限）
import { FEEL, SHAFT, GRIP, BRAND_SET, COLLAB_SET, itemById } from './data/items.js';
import { STATS } from '../../js/stats.js';
import { clamp, seeded } from './util.js';
import { ratingOf } from './sim.js';

export const STAT_KEYS = STATS.map(s => s.key);
export const STAT_ZH = Object.fromEntries(STATS.map(s => [s.key, s.name]));
export const GROUPS = { long: ['power', 'contact', 'launch'], dir: ['accuracy', 'consistency', 'shaping'], short: ['spin', 'chipping', 'bunker', 'recovery'], putt: ['touch', 'line', 'reading'], mind: ['mental'] };
export const GROUP_ZH = { long: '長打', dir: '方向', short: '短桿', putt: '推桿', mind: '心理' };
export const groupOf = k => Object.keys(GROUPS).find(g => GROUPS[g].includes(k));

// ---------- 年齡 ----------
// 身體還沒長大時的桿頭速度倍率（8 歲約大人的 80%，一號木約 100 碼）；50 歲以後慢慢下降
export function bodySpeed(age) {
  if (age >= 18 && age < 50) return 1;
  if (age >= 50) return Math.max(0.86, 1 - (age - 50) * 0.006);
  const t = { 8: 0.8, 9: 0.82, 10: 0.85, 11: 0.88, 12: 0.9, 13: 0.92, 14: 0.94, 15: 0.96, 16: 0.98, 17: 0.99 };
  return t[Math.floor(age)] ?? 0.8;
}
// 每年生日的自然成長（之前那一年的年齡 → 這一年）：發育期力量長最快；13~15 歲的協調期穩定度暫時下降
export function yearlyGrowth(age) {
  const g = {};
  const add = (keys, v) => keys.forEach(k => (g[k] = (g[k] || 0) + v));
  if (age <= 12) { add(['power'], 3); add(['contact', 'launch'], 2.5); add(['accuracy', 'consistency', 'chipping', 'touch', 'line', 'reading', 'bunker', 'recovery', 'spin', 'shaping'], 1.5); add(['mental'], 1); }
  else if (age <= 16) { add(['power'], 5); add(['contact'], 3); add(['launch', 'spin', 'recovery'], 2); add(['accuracy', 'chipping', 'touch', 'line', 'reading', 'bunker', 'shaping'], 1.2); add(['mental'], 1); if (age === 13 || age === 14) add(['consistency'], -2); else add(['consistency'], 1); }
  else if (age <= 18) { add(['power'], 3); add(['contact', 'consistency'], 2); add(['launch', 'spin', 'recovery', 'accuracy'], 1); add(['mental', 'reading'], 1); }
  else if (age <= 24) { add(['power'], 1); add(['contact'], 0.6); add(['mental', 'reading'], 0.6); }
  else if (age <= 34) { add(['reading', 'mental'], 0.3); }
  // 35 歲以後（v106 加重）：力量、擊球、穩定度一年比一年掉；37 歲起準度與旋轉、38 歲起推桿手感、40 歲起切桿與沙坑也開始掉；經驗讓讀果嶺與抗壓還會小幅進步
  else if (age <= 44) {
    add(['power'], -1.8 - (age - 35) * 0.25); add(['contact', 'launch'], -1.2); add(['consistency'], -1.0); add(['reading', 'mental'], 0.3);
    if (age >= 37) add(['accuracy', 'spin', 'recovery'], -0.7);
    if (age >= 38) add(['touch', 'line'], -0.6);
    if (age >= 40) add(['chipping', 'bunker'], -0.4);
  }
  else { add(['power'], -2.4); add(['contact', 'launch', 'consistency', 'accuracy'], -1.0); add(['spin', 'recovery', 'chipping', 'bunker'], -0.5); add(['touch', 'line'], -0.6); add(['mental'], 0.1); }
  return g;
}

// ---------- 經驗值、等級、技能點 ----------
export const xpForLevel = lv => 120 + lv * 22;              // 從 lv 升到 lv+1 需要的經驗
export const XP = { holePlayed: 14, holeSim: 4, finishBonus: 0.15, win: 400, top10: 120, cut: 40, milestone: 250 };
// 年紀的成長速度（訓練與經驗值的倍率）：青少年慢慢來、22~29 歲是職業的黃金成長期、35 歲以後變慢
export const ageMul = a => (a <= 17 ? 0.85 : a <= 21 ? 1 : a <= 25 ? 2.2 : a <= 29 ? 0.6 : a <= 34 ? 0.35 : a <= 37 ? 0.2 : a <= 41 ? 0.1 : 0.05);      // 35 歲以後越練越慢（v106：以前 0.25 不分年紀，42 歲實力還在上升）      // 22~25 歲（剛轉職業）成長最快；之後放慢（v96：以前 43 歲平均約 75 勝）
export const PTS_PER_LEVEL = 2;
// 加 1 點素質要花的技能點：越高越貴
export const skillCost = v => (v < 65 ? 1 : v < 78 ? 2 : v < 84 ? 3 : v < 88 ? 4 : v < 92 ? 5 : 6);
export function addXp(p, n, log) {
  p.xp += Math.round(n);
  let ups = 0;
  while (p.xp >= xpForLevel(p.level)) { p.xp -= xpForLevel(p.level); p.level++; p.skillPts += PTS_PER_LEVEL; ups++; }
  if (ups && log) log(`升到 Lv.${p.level}（技能點 +${ups * PTS_PER_LEVEL}）`);
  return ups;
}
export function spendPoint(p, key) {
  const v = p.stats[key], cap = capOf(p, key);
  if (v + 1 > cap) return '已經到這一項的上限（' + cap + '）';
  const c = skillCost(v);
  if (p.skillPts < c) return `技能點不夠（需要 ${c} 點）`;
  p.skillPts -= c; p.stats[key] = Math.min(cap, Math.round((v + 1) * 10) / 10);
  return null;
}

// ---------- 訓練（練習場的訓練關卡 / 一般練球）----------
//   訓練經驗滿了 +1：低的時候 100 點，越高越難（50 約 167、70 約 233、85 約 283）；教練的專長加成 +30~60%；上限照球風
export const TRAIN = {
  long: { name: '長桿訓練', stats: ['power', 'contact', 'launch'], desc: '一號木與長鐵：力量、擊球效率、彈道', drill: 'range' },
  iron: { name: '鐵桿精準', stats: ['accuracy', 'consistency', 'shaping'], desc: '打進目標區：準度、穩定度、曲球', drill: 'target' },
  short: { name: '短桿與沙坑', stats: ['chipping', 'bunker', 'spin', 'recovery'], desc: '切球、沙坑、脫困、旋轉', drill: 'bunker' },
  putt: { name: '推桿', stats: ['touch', 'line', 'reading'], desc: '距離感、方向、讀果嶺', drill: 'putt' },
  mind: { name: '心理訓練', stats: ['mental'], desc: '冥想、壓力情境模擬：抗壓', drill: null },
  gym: { name: '體能訓練', stats: ['power'], desc: '健身房：力量 + 體能上限', drill: null },
};
export const trainNeed = v => Math.round(100 * (1 + Math.max(0, v - 30) / 30));
export function train(p, kind, amount, coachMul = 1) {
  const t = TRAIN[kind], gains = [];
  for (const k of t.stats) {
    p.trainXp[k] = (p.trainXp[k] || 0) + amount * coachMul / t.stats.length * (kind === 'mind' || kind === 'gym' ? 1 : 1.3);
    while (p.trainXp[k] >= trainNeed(p.stats[k])) {
      p.trainXp[k] -= trainNeed(p.stats[k]);
      if (p.stats[k] < capOf(p, k)) { p.stats[k] = Math.min(capOf(p, k), p.stats[k] + 1); gains.push(k); }
    }
  }
  return gains;
}

// ---------- 天賦（童年的選擇累積，跟著球員一輩子）----------
export const TALENTS = {
  putter: { name: '天生推桿手', desc: '推桿距離感、推桿方向起點 +4', stats: { touch: 4, line: 4 } },
  heart: { name: '大心臟', desc: '抗壓起點 +4；壓力等級的誤差少 10%', stats: { mental: 4 }, pressure: 0.9 },
  home: { name: '家鄉通', desc: '在家鄉的球場讀果嶺 +5、推桿方向 +2', home: { reading: 5, line: 2 } },
  basics: { name: '基本功扎實', desc: '準度、穩定度起點 +3', stats: { accuracy: 3, consistency: 3 } },
  long: { name: '長打天賦', desc: '力量起點 +4，力量的自然成長多 15%', stats: { power: 4 }, growth: { power: 1.15 } },
  touch: { name: '短桿魔術', desc: '切球、沙坑起點 +3', stats: { chipping: 3, bunker: 3 } },
  reader: { name: '讀線高手', desc: '讀果嶺起點 +4', stats: { reading: 4 } },
  grinder: { name: '苦練型', desc: '訓練經驗 +15%', trainMul: 1.15 },
  showman: { name: '天生明星', desc: '人氣成長 +25%', fameMul: 1.25 },
};

// ---------- 球風（青少年結束時決定）與素質上限 ----------
export const STYLES = {
  power: { name: '重砲手', desc: '力量與擊球效率的上限最高，推桿與準度稍低', caps: { power: 99, contact: 97, launch: 95, accuracy: 86, consistency: 88, shaping: 88, spin: 90, chipping: 88, bunker: 88, recovery: 94, touch: 86, line: 86, reading: 86, mental: 92 } },
  precise: { name: '精準射手', desc: '準度、穩定度、曲球上限最高，力量稍低', caps: { power: 88, contact: 94, launch: 94, accuracy: 99, consistency: 99, shaping: 97, spin: 94, chipping: 90, bunker: 88, recovery: 88, touch: 90, line: 90, reading: 90, mental: 92 } },
  wizard: { name: '短桿魔術師', desc: '切球、沙坑、脫困、旋轉上限最高', caps: { power: 87, contact: 90, launch: 90, accuracy: 90, consistency: 90, shaping: 92, spin: 99, chipping: 99, bunker: 99, recovery: 99, touch: 92, line: 90, reading: 92, mental: 92 } },
  putter: { name: '推桿名手', desc: '推桿三項與抗壓上限最高', caps: { power: 87, contact: 90, launch: 90, accuracy: 90, consistency: 90, shaping: 88, spin: 90, chipping: 92, bunker: 90, recovery: 90, touch: 99, line: 99, reading: 99, mental: 97 } },
  allround: { name: '全能型', desc: '每一項的上限都是 93，沒有弱點也沒有特長', caps: Object.fromEntries(STATS.map(s => [s.key, 93])) },
};
export const BREAK_MAX = 9;      // 傳奇章節「突破任務」每項最多 +9
export function capOf(p, k) {
  const base = p.style ? STYLES[p.style].caps[k] : 99;
  return Math.min(99, base + ((p.breaks && p.breaks[k]) || 0));
}

// ---------- 技能卡 ----------
//   when：生效的情況；mul：Lv.1 的誤差倍率（同一種誤差最多減到原本的 60%）；unlock：取得方式；up：升到 Lv.2 / Lv.3 要「生效」的次數
//   升級：自己打的回合裡，這張卡生效的擊球次數（重來卡 = 用掉的次數）達到 up，再花技能點（Lv.2 花 2 點、Lv.3 花 4 點）
//   Lv.2 的效果是 Lv.1 的 1.35 倍、Lv.3 是 1.7 倍（例：−20% → −27% → −34%）
export const CARDS = {
  mulligan: { name: '重來的機會', desc: '每一輪可以重打：18 洞 2 次、9 洞 1 次', kind: 'mull', unlock: '自己打的洞累計 54 洞（任何比賽的回合）', up: [6, 20], lvText: ['18 洞 2 次、9 洞 1 次', '18 洞 3 次、9 洞 1 次', '18 洞 3 次、9 洞 2 次'] },
  closer: { name: '收尾大師', desc: '最後三洞（16~18 洞）誤差 −15%', when: 'last3', mul: 0.85, unlock: '拿到第一座職業冠軍' },
  short_putt: { name: '短推不手軟', desc: '2 碼內推桿誤差 −50%', when: 'putt2', mul: 0.5, unlock: '自己打完 18 洞、推桿 26 次以內', up: [30, 100] },
  sand_save: { name: '沙坑救星', desc: '沙坑擊球誤差 −25%', when: 'sand', mul: 0.75, unlock: '青少年賽事冠軍', up: [20, 70] },
  rough_rider: { name: '長草脫困', desc: '長草、深草擊球誤差 −20%', when: 'rough', mul: 0.8, unlock: 'Korn Ferry Tour 冠軍' },
  ice: { name: '冰人', desc: '壓力等級 2 以上時誤差 −20%', when: 'press2', mul: 0.8, unlock: '延長賽勝利', up: [20, 70] },
  bomber: { name: '開球重砲', desc: '發球台上用一號木誤差 −12%', when: 'tee', mul: 0.88, unlock: '一號木平均 Carry 達到 300 碼' },
  dart: { name: '攻旗', desc: '150 碼內的進攻誤差 −15%', when: 'approach', mul: 0.85, unlock: '單場標準桿上果嶺 16 洞以上' },
  scrambler: { name: '救球王', desc: '果嶺邊 30 碼內的切球誤差 −20%', when: 'chip', mul: 0.8, unlock: '單場救 Par 6 次以上' },
  major_heart: { name: '大賽心臟', desc: '四大賽的週末誤差 −10%', when: 'majorWeekend', mul: 0.9, unlock: '四大賽前十名' },
  home_hero: { name: '主場英雄', desc: '家鄉國家的比賽誤差 −10%', when: 'home', mul: 0.9, unlock: '在家鄉拿到職業冠軍' },
  first_tee: { name: '第一洞的穩定', desc: '每一輪第 1 洞誤差 −20%', when: 'first', mul: 0.8, unlock: '連續 10 場晉級', up: [15, 50] },
  green_jacket: { name: '奧古斯塔的記憶', desc: '名人賽全部誤差 −8%', when: 'masters', mul: 0.92, unlock: '名人賽冠軍', up: [30, 100] },
  fairway: { name: '球道獵手', desc: '從球道上擊球誤差 −10%', when: 'fairway', mul: 0.9, unlock: '自己打完 18 洞、命中 13 個球道以上' },
  par3: { name: '三桿洞狙擊手', desc: '三桿洞的開球誤差 −15%', when: 'par3', mul: 0.85, unlock: '自己打完 18 洞、四個三桿洞都 Par 以下', up: [12, 40] },
  par5: { name: '五桿洞獵人', desc: '五桿洞的所有擊球誤差 −8%', when: 'par5', mul: 0.92, unlock: '打出一隻老鷹（比標準桿少 2 桿）' },
  wind: { name: '逆風而上', desc: '風速 12 mph 以上時誤差 −12%', when: 'wind', mul: 0.88, unlock: '強風日自己打完 18 洞、低於標準桿' },
  long_putt: { name: '長推高手', desc: '8 碼以上的推桿誤差 −20%', when: 'longPutt', mul: 0.8, unlock: '自己打的洞累計 300 洞', up: [25, 90] },
  bounce: { name: '柏忌反彈', desc: '上一洞柏忌以上，這一洞誤差 −15%', when: 'bounce', mul: 0.85, unlock: '同一輪 2 次「柏忌之後下一洞抓鳥」', up: [10, 35] },
  hot: { name: '手感連發', desc: '上一洞抓鳥，這一洞誤差 −12%', when: 'hot', mul: 0.88, unlock: '連續 3 洞小鳥', up: [10, 35] },
  par_save: { name: '保帕推', desc: '推 Par 的推桿誤差 −20%', when: 'parPutt', mul: 0.8, unlock: '自己打完 18 洞、零柏忌', up: [20, 70] },
  wedge: { name: '挖起桿專家', desc: '30~110 碼用挖起桿的誤差 −15%', when: 'wedge', mul: 0.85, unlock: '自己打完 18 洞、5 隻小鳥以上' },
  opening: { name: '開局衝刺', desc: '每一輪的前 3 洞誤差 −10%', when: 'opening', mul: 0.9, unlock: '業餘賽事冠軍（業餘排名賽、大學賽、業餘大賽）', up: [25, 90] },
  sunday: { name: '星期天的紅衣', desc: '最後一輪誤差 −8%', when: 'final', mul: 0.92, unlock: '職業冠軍 3 場', up: [30, 100] },
  qs: { name: '資格賽鬥士', desc: 'Q-School 的回合誤差 −12%', when: 'qual', mul: 0.88, unlock: '週一資格賽過關，或在 Q-School 決賽剛好過關', up: [25, 80] },
  links: { name: '林克斯之心', desc: '林克斯球場誤差 −10%', when: 'links', mul: 0.9, unlock: '在林克斯球場自己打完 18 洞、低於標準桿', up: [30, 100] },
};
export const CARD_UP = [40, 150];                 // 預設的升級門檻（生效次數）
export const CARD_COST = [0, 2, 4];               // 升到 Lv.2 / Lv.3 要花的技能點
export const cardLv = (p, id) => (p.cardLv && p.cardLv[id]) || 1;
export const cardUp = id => CARDS[id].up || CARD_UP;
// 這張卡在某個等級的誤差倍率
export const cardMul = (c, lv) => 1 - (1 - c.mul) * [1, 1.35, 1.7][clamp(lv, 1, 3) - 1];
export const cardDesc = (c, lv) => (c.kind === 'mull' ? c.lvText[clamp(lv, 1, 3) - 1] : c.desc.replace(/−\d+%/, `−${Math.round((1 - cardMul(c, lv)) * 100)}%`));
// 重來卡：這一輪多幾次重打（自己打的洞數）
export const cardMulligans = (lv, holes) => (holes >= 18 ? [2, 3, 3] : holes >= 9 ? [1, 1, 2] : [0, 0, 0])[clamp(lv, 1, 3) - 1];
export const cardSlots = p => clamp(2 + Math.floor((p.level || 1) / 15) + (p.legacyBonus ? 1 : 0), 2, 7);

// 球具工坊的零件（桿頭手感、桿身、握把）合計的素質增減
export function partStats(slot, f) {
  const out = {}, addAll = o => { for (const k in o || {}) out[k] = (out[k] || 0) + o[k]; };
  if (!f) return out;
  const fe = f.feel && (FEEL[slot] || []).find(x => x[0] === f.feel); if (fe) addAll(fe[2]);
  const sh = f.shaft && (SHAFT[slot] || []).find(x => x[0] === f.shaft); if (sh) addAll(sh[2]);
  const gr = f.grip && (GRIP[slot === 'putter' ? 'putter' : 'club'] || []).find(x => x[0] === f.grip); if (gr && slot !== 'ball') addAll(gr[2]);
  return out;
}
// ---------- 實際上場的素質 ----------
//   基礎素質 + 球具 + 服裝 + 手感 + 主場 + 桿弟（每項固定加成合計最多 +8，素質最高 99）
export const BONUS_CAP = 8;
export function effectiveStats(st, ctx = {}) {
  const p = st.player, b = {};
  const add = (k, v) => { b[k] = (b[k] || 0) + v; };
  for (const it of equippedItems(st)) for (const k in it.stats || {}) add(k, it.stats[k] * (1 + ((it.lv || 1) - 1) * 0.25));
  const set = setBonus(st);
  for (const k in set) add(k, set[k]);
  // 球具工坊訂製：每個部位一項素質 +1~+3
  for (const [slot, f] of Object.entries(st.fit || {})) {
    if (f && f.stat && f.lv) add(f.stat, f.lv);
    for (const k in partStats(slot, f)) add(k, partStats(slot, f)[k]);
  }
  // 數據分析師：讀果嶺 +2（頂級 +3）
  if (st.team && (st.team.staff || []).includes('analyst')) add('reading', (st.team.elite || []).includes('analyst') ? 3 : 2);
  if (ctx.home && p.talents.includes('home')) for (const [k, v] of Object.entries(TALENTS.home.home)) add(k, v);
  if (ctx.home) add('reading', st.homeBonus || 0);
  const cad = st.team && st.team.caddie;
  if (cad && cad.bonus) for (const k in cad.bonus) add(k, cad.bonus[k]);
  if (ctx.practiceRound) add('reading', 3);
  const out = {};
  // 手感 ±3 → 每項 ±3；體能低於 30 才開始扣（最多 −3）
  const form = (p.form || 0) * 1.0, tired = (p.energy < 30 ? -(30 - p.energy) / 10 : 0) - Math.min(3, Math.max(0, ((p.pain || 0) - 40) / 20));      // 體能低於 30、疼痛 40 以上都會扣
  for (const k of STAT_KEYS) out[k] = clamp(p.stats[k] + clamp(b[k] || 0, -8, BONUS_CAP) + form + tired, 5, 99);
  out._min = 5;
  out._spd = bodySpeed(p.age) * heightSpeed(p.height);
  return out;
}
// 身高：越高揮桿弧度越大（力量略高、準度略低，最多 ±2，換算成桿頭速度 ±1.5%）
export const heightSpeed = h => 1 + clamp(((h || 175) - 175) / 20, -1, 1) * 0.015;
export const heightAcc = h => -clamp(((h || 175) - 175) / 10, -2, 2);

export function equippedItems(st) {
  const g = st.gear || {};
  return Object.values(g.eq || {}).map(id => (g.items || []).find(x => x.uid === id)).filter(Boolean);
}
// 品牌套裝：同一品牌穿 3 件、5 件各有效果（BRAND_SET）；聯名套裝穿齊 4 件（COLLAB_SET）
export function setBonus(st) {
  const cnt = {}, sets = {}, out = {};
  const add = o => { for (const k in o) out[k] = (out[k] || 0) + o[k]; };
  for (const it of equippedItems(st)) {
    if (it.brand && BRAND_SET[it.brand]) cnt[it.brand] = (cnt[it.brand] || 0) + 1;
    const base = itemById(it.id); if (base && base.set) sets[base.set] = (sets[base.set] || 0) + 1;
  }
  for (const [b, n] of Object.entries(cnt)) { if (n >= 5) add(BRAND_SET[b][1]); else if (n >= 3) add(BRAND_SET[b][0]); }
  for (const [s, n] of Object.entries(sets)) if (COLLAB_SET[s] && n >= COLLAB_SET[s].need) add(COLLAB_SET[s].bonus);
  return out;
}

// 綜合實力（給模擬用）
export const playerRating = (st, ctx) => ratingOf(effectiveStats(st, ctx));

// 起點素質：8 歲平均約 20，天賦另外加
export function startStats(st) {
  const r = seeded(st, 'start');
  const s = {};
  for (const k of STAT_KEYS) s[k] = Math.round((17 + r() * 6) * 10) / 10;
  for (const t of st.player.talents) for (const [k, v] of Object.entries(TALENTS[t]?.stats || {})) s[k] += v;
  return s;
}
// 某個年齡的「從 13 歲開始」預設素質（第二個以後的生涯欄位可以跳過童年）
export function statsAtAge(st, age) {
  const s = startStats(st);
  for (let a = 8; a < age; a++) { const g = yearlyGrowth(a); for (const k in g) s[k] += g[k]; }
  for (const k in s) s[k] = Math.round(s[k] * 10) / 10 + 4;      // 童年的訓練、比賽經驗
  return s;
}
