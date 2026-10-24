// 成就徽章、球場護照、特殊皮膚：定義、進度計數、達成判定、達成時的動畫提示、存回伺服器
// 進度存在 session.profile.prog = { ach: {成就代號: 達成時間}, cnt: {計數: 數值}, stamps: {球場代號: {date, best, n}} }
// 挑戰星數存在 session.profile.chal = { stars: {關卡代號: 0~3}, best: {關卡代號: 最少桿數}, total }
import { call, session } from './api.js';
import { COURSES } from './courses.js';

// ---------------- 皮膚 ----------------
// slot：driver（一號木與木桿、混血）、iron（鐵桿與挖起桿）、putter、ball
// 球桿：head 桿頭顏色、glow 自發光顏色（沒有就不發光）、shaft 桿身顏色；球：color、glow、trail 彈道顏色
export const SKINS = [
  { id: 'std', slot: 'driver', name: '標準 Driver', std: true },
  { id: 'goldD', slot: 'driver', name: '黃金 Driver', head: 0xd8a830, metal: 1, shaft: 0xe8c860, ach: 'drive330' },
  { id: 'frostD', slot: 'driver', name: '冰霜 Driver', head: 0x9fdcff, glow: 0x3aa8ff, shaft: 0xd8f2ff, ach: 'aurora_par' },
  { id: 'galaxyD', slot: 'driver', name: '星河 Driver', head: 0x3a1a6a, glow: 0x9a5aff, shaft: 0xb89aff, ach: 'ch20_3' },
  { id: 'std', slot: 'iron', name: '標準鐵桿', std: true },
  { id: 'lavaI', slot: 'iron', name: '熔岩鐵桿', head: 0x2a1410, glow: 0xff5a10, shaft: 0x4a2a20, ach: 'ember_par' },
  { id: 'obsidianI', slot: 'iron', name: '黑曜石鐵桿', head: 0x161420, glow: 0x6a4aff, metal: 1, shaft: 0x2a2838, ach: 'ch10_3' },
  { id: 'std', slot: 'putter', name: '標準推桿', std: true },
  { id: 'moonP', slot: 'putter', name: '月光推桿', head: 0xe8eeff, glow: 0x8ab8ff, shaft: 0xf0f4ff, ach: 'putt20x3' },
  { id: 'lavaP', slot: 'putter', name: '熔岩推桿', head: 0x301410, glow: 0xff7a20, shaft: 0x502a1a, ach: 'vent_green3' },
  { id: 'sakuraP', slot: 'putter', name: '櫻花推桿', head: 0xffc8dc, glow: 0xff7aa8, shaft: 0xfff0f4, ach: 'sakura_no3' },
  { id: 'std', slot: 'ball', name: '標準白球', std: true },
  { id: 'gold', slot: 'ball', name: '黃金球', color: 0xffd860, glow: 0x8a6010, trail: 0xffd860, ach: 'hio' },
  { id: 'firefly', slot: 'ball', name: '螢火球', color: 0xeaffa0, glow: 0xa8ff4a, trail: 0xc8ff6a, ach: 'ring30' },
  { id: 'lava', slot: 'ball', name: '熔岩球', color: 0x3a1a10, glow: 0xff5a10, trail: 0xff7a2a, ach: 'vent25' },
  { id: 'frost', slot: 'ball', name: '冰晶球', color: 0xd8f4ff, glow: 0x4ab8ff, trail: 0x8ad8ff, ach: 'wall30' },
  { id: 'spore', slot: 'ball', name: '孢子球', color: 0xffb8e8, glow: 0xff4ac8, trail: 0xff8ae0, ach: 'double_bounce' },
  { id: 'portal', slot: 'ball', name: '星門球', color: 0xd8b8ff, glow: 0x8a3aff, trail: 0xb87aff, ach: 'portal_birdie' },
  { id: 'star', slot: 'ball', name: '星辰球', color: 0xfff4c8, glow: 0xffc84a, trail: 0xfff0a0, ach: 'ch_stars45' },
  { id: 'rainbow', slot: 'ball', name: '七彩球', color: 0xffffff, glow: 0xff6ae0, trail: 'rainbow', ach: 'stamps_world' },
];
export const SLOT_NAME = { driver: 'Driver / 木桿', iron: '鐵桿 / 挖起桿', putter: '推桿', ball: '高爾夫球' };
export const LOOK_KEY = { driver: 'drvSkin', iron: 'ironSkin', putter: 'putSkin', ball: 'ballSkin' };
export const skinById = (slot, id) => SKINS.find(s => s.slot === slot && s.id === (id || 'std')) || SKINS.find(s => s.slot === slot && s.std);
export const skinUnlocked = s => s.std || !!(prog().ach[s.ach]);
// 某個玩家外觀裡裝備的皮膚（球桿依類型分組）
export function equippedSkins(look = {}) {
  return { driver: skinById('driver', look.drvSkin), iron: skinById('iron', look.ironSkin), putter: skinById('putter', look.putSkin), ball: skinById('ball', look.ballSkin) };
}

// ---------------- 成就 ----------------
// tier：bronze / silver / gold / legend；glyph：徽章上的字；pts：達成給的能力點；cnt + n：計數型（顯示進度條）
export const ACH_CATS = [['mile', '里程碑'], ['shot', '精彩一桿'], ['fx', '奇幻機關'], ['pass', '球場護照'], ['chal', '挑戰模式']];
export const ACH = [
  { id: 'first_round', cat: 'mile', tier: 'bronze', glyph: '初', name: '初登場', desc: '打完第一場回合（9 或 18 洞）', cnt: 'rounds', n: 1 },
  { id: 'rounds10', cat: 'mile', tier: 'silver', glyph: '常', name: '球場常客', desc: '累計打完 10 場回合', cnt: 'rounds', n: 10, pts: 1 },
  { id: 'rounds50', cat: 'mile', tier: 'gold', glyph: '將', name: '球場老將', desc: '累計打完 50 場回合', cnt: 'rounds', n: 50, pts: 3 },
  { id: 'holes100', cat: 'mile', tier: 'silver', glyph: '百', name: '百洞之旅', desc: '累計打完 100 洞', cnt: 'holes', n: 100, pts: 1 },
  { id: 'holes500', cat: 'mile', tier: 'gold', glyph: '千', name: '千錘百鍊', desc: '累計打完 500 洞', cnt: 'holes', n: 500, pts: 3 },

  { id: 'birdie1', cat: 'shot', tier: 'bronze', glyph: '鳥', name: '第一隻小鳥', desc: '打出第一個小鳥（低於標準桿 1 桿）', cnt: 'birdie', n: 1 },
  { id: 'birdie50', cat: 'shot', tier: 'gold', glyph: '群', name: '百鳥朝鳳', desc: '累計打出 50 個小鳥', cnt: 'birdie', n: 50, pts: 2 },
  { id: 'eagle1', cat: 'shot', tier: 'silver', glyph: '鷹', name: '展翅老鷹', desc: '打出老鷹（低於標準桿 2 桿）', cnt: 'eagle', n: 1, pts: 1 },
  { id: 'albatross', cat: 'shot', tier: 'legend', glyph: '翔', name: '信天翁', desc: '打出信天翁（低於標準桿 3 桿）', cnt: 'albatross', n: 1, pts: 3 },
  { id: 'hio', cat: 'shot', tier: 'legend', glyph: '一', name: '一桿進洞', desc: '打出一桿進洞', cnt: 'hio', n: 1, pts: 3 },
  { id: 'drive300', cat: 'shot', tier: 'silver', glyph: '砲', name: '巨砲', desc: '一號木開球（飛行加滾動）達 300 碼', pts: 1 },
  { id: 'drive330', cat: 'shot', tier: 'gold', glyph: '天', name: '天外飛球', desc: '一號木開球達 330 碼（要借下坡和順風）', pts: 2 },
  { id: 'chipin', cat: 'shot', tier: 'silver', glyph: '切', name: '切進！', desc: '不用推桿、從果嶺外直接打進洞（開球不算）', pts: 1 },
  { id: 'sandout', cat: 'shot', tier: 'gold', glyph: '沙', name: '沙坑神救', desc: '從沙坑裡直接打進洞', pts: 2 },
  { id: 'putt15', cat: 'shot', tier: 'silver', glyph: '推', name: '長推高手', desc: '15 碼以上一推進洞', pts: 1 },
  { id: 'putt20x3', cat: 'shot', tier: 'gold', glyph: '月', name: '推桿魔術師', desc: '20 碼以上一推進洞，累計 3 次', cnt: 'putt20', n: 3, pts: 2 },
  { id: 'streak3', cat: 'shot', tier: 'gold', glyph: '連', name: '三連鳥', desc: '同一場連續 3 洞小鳥以下', pts: 2 },
  { id: 'clean18', cat: 'shot', tier: 'silver', glyph: '淨', name: '零失誤', desc: '打完 18 洞，沒有 OB、沒有落水、沒有掉進峽谷', pts: 1 },
  { id: 'nothree', cat: 'shot', tier: 'silver', glyph: '穩', name: '推桿穩健', desc: '打完 18 洞沒有三推', pts: 1 },
  { id: 'bogeyfree', cat: 'shot', tier: 'gold', glyph: '無', name: '無柏忌', desc: '打完 18 洞沒有任何一洞超過標準桿', pts: 2 },
  { id: 'under18', cat: 'shot', tier: 'gold', glyph: '破', name: '破標準桿', desc: '18 洞總桿低於標準桿', pts: 3 },

  { id: 'ring1', cat: 'fx', tier: 'bronze', glyph: '螢', name: '螢火初見', desc: '第一次穿過螢火之環', cnt: 'ring', n: 1 },
  { id: 'ring_two', cat: 'fx', tier: 'gold', glyph: '雙', name: '雙環連穿', desc: '同一桿穿過兩個螢火之環', pts: 2 },
  { id: 'ring30', cat: 'fx', tier: 'gold', glyph: '光', name: '螢火使者', desc: '累計穿過螢火之環 30 次', cnt: 'ring', n: 30, pts: 2 },
  { id: 'shroom1', cat: 'fx', tier: 'bronze', glyph: '菇', name: '彈彈菇', desc: '第一次被彈跳巨菇彈起來', cnt: 'shroom', n: 1 },
  { id: 'double_bounce', cat: 'fx', tier: 'gold', glyph: '彈', name: '菇菇連彈', desc: '同一桿被巨菇彈兩次以上，累計 3 次', cnt: 'doubleBounce', n: 3, pts: 2 },
  { id: 'vent1', cat: 'fx', tier: 'bronze', glyph: '火', name: '火山騎士', desc: '第一次被噴發口噴上天', cnt: 'vent', n: 1 },
  { id: 'vent_green3', cat: 'fx', tier: 'gold', glyph: '岩', name: '熔岩衝浪', desc: '被噴發口噴飛、球停在果嶺上，累計 3 次', cnt: 'ventGreen', n: 3, pts: 2 },
  { id: 'vent25', cat: 'fx', tier: 'gold', glyph: '爆', name: '噴發狂熱', desc: '累計被噴發口噴飛 25 次', cnt: 'vent', n: 25, pts: 2 },
  { id: 'wall1', cat: 'fx', tier: 'bronze', glyph: '冰', name: '冰鏡初體驗', desc: '第一次撞冰鏡牆反彈', cnt: 'wall', n: 1 },
  { id: 'wall_green', cat: 'fx', tier: 'silver', glyph: '反', name: '彈牆上果嶺', desc: '撞冰牆反彈的那一桿停在果嶺上', pts: 1 },
  { id: 'wall30', cat: 'fx', tier: 'gold', glyph: '鏡', name: '冰鏡大師', desc: '累計撞冰鏡牆 30 次', cnt: 'wall', n: 30, pts: 2 },
  { id: 'portal1', cat: 'fx', tier: 'bronze', glyph: '門', name: '星門旅人', desc: '第一次穿過星門', cnt: 'portal', n: 1 },
  { id: 'portal_birdie', cat: 'fx', tier: 'gold', glyph: '躍', name: '星門捷徑', desc: '穿過星門的那一洞打出小鳥以下，累計 3 次', cnt: 'portalBirdie', n: 3, pts: 2 },
  { id: 'void_clean', cat: 'fx', tier: 'gold', glyph: '浮', name: '不墜虛空', desc: '星環浮島打完 18 洞，一次都沒掉進虛空', pts: 2 },
  { id: 'ember_par', cat: 'fx', tier: 'legend', glyph: '炎', name: '熔岩征服者', desc: '熔岩之心 18 洞打出標準桿以內', pts: 3 },
  { id: 'aurora_par', cat: 'fx', tier: 'legend', glyph: '極', name: '極光之王', desc: '極光冰境 18 洞打出標準桿以內', pts: 3 },
  { id: 'sakura_no3', cat: 'fx', tier: 'gold', glyph: '櫻', name: '櫻下靜心', desc: '櫻川庭苑打完 18 洞沒有三推', pts: 2 },

  { id: 'stamp1', cat: 'pass', tier: 'bronze', glyph: '章', name: '第一個章', desc: '在任一球場打完 18 洞，蓋下第一個章', cnt: 'stamps', n: 1 },
  { id: 'stamps_tw', cat: 'pass', tier: 'silver', glyph: '台', name: '台灣巡禮', desc: '集滿 4 個台灣球場的章', pts: 1 },
  { id: 'stamps_fx', cat: 'pass', tier: 'gold', glyph: '幻', name: '奇幻旅人', desc: '集滿 5 個奇幻球場的章', pts: 2 },
  { id: 'stamps10', cat: 'pass', tier: 'gold', glyph: '旅', name: '旅行家', desc: '集滿 10 個球場的章', cnt: 'stamps', n: 10, pts: 2 },
  { id: 'stamps_world', cat: 'pass', tier: 'legend', glyph: '界', name: '環遊世界', desc: '集滿所有球場的章', pts: 3 },

  { id: 'ch_star1', cat: 'chal', tier: 'bronze', glyph: '星', name: '第一顆星', desc: '在挑戰模式拿到第一顆星', cnt: 'chalStars', n: 1 },
  { id: 'ch5', cat: 'chal', tier: 'bronze', glyph: '五', name: '挑戰入門', desc: '通過挑戰第 5 關' },
  { id: 'ch_stars30', cat: 'chal', tier: 'silver', glyph: '摘', name: '摘星者', desc: '挑戰模式累計 30 顆星', cnt: 'chalStars', n: 30, pts: 1 },
  { id: 'ch10_3', cat: 'chal', tier: 'gold', glyph: '曜', name: '熔岩試煉', desc: '挑戰第 10 關拿到 3 星', pts: 2 },
  { id: 'ch_stars45', cat: 'chal', tier: 'gold', glyph: '辰', name: '星光滿載', desc: '挑戰模式累計 45 顆星', cnt: 'chalStars', n: 45, pts: 2 },
  { id: 'ch20', cat: 'chal', tier: 'gold', glyph: '終', name: '終局', desc: '通過挑戰第 20 關', pts: 2 },
  { id: 'ch20_3', cat: 'chal', tier: 'legend', glyph: '河', name: '星河傳說', desc: '挑戰第 20 關拿到 3 星', pts: 3 },
  { id: 'ch_stars60', cat: 'chal', tier: 'legend', glyph: '滿', name: '全滿星', desc: '挑戰模式 20 關全部 3 星', cnt: 'chalStars', n: 60, pts: 3 },
];
export const TIER_NAME = { bronze: '銅', silver: '銀', gold: '金', legend: '傳說' };
export const achById = id => ACH.find(a => a.id === id);

// 球場護照：每座一般球場（分區球場算同一座）
export const PASSPORT = COURSES.map(c => ({ id: c.id, name: c.name, en: c.en, group: c.group }));

// ---------------- 進度 ----------------
export function prog() {
  const p = session.profile || (session.profile = {});
  const g = p.prog = p.prog || {};
  g.ach = g.ach || {}; g.cnt = g.cnt || {}; g.stamps = g.stamps || {};
  return g;
}
export function chal() {
  const p = session.profile || (session.profile = {});
  const c = p.chal = p.chal || {};
  c.stars = c.stars || {}; c.best = c.best || {};
  c.total = Object.values(c.stars).reduce((s, v) => s + v, 0);
  return c;
}
export const progressOf = a => a.cnt ? Math.min(a.n, Number(prog().cnt[a.cnt]) || 0) : (prog().ach[a.id] ? 1 : 0);

let dirty = false, dirtyChal = false, newly = [], saveTimer = null;
export function bump(key, n = 1) { const c = prog().cnt; c[key] = (Number(c[key]) || 0) + n; dirty = true; }
export function setMax(key, v) { const c = prog().cnt; if (v > (Number(c[key]) || 0)) { c[key] = v; dirty = true; } }

// 解鎖一個成就（已達成的不重複）；跳出動畫並排程存檔
export function unlock(id) {
  const g = prog();
  if (g.ach[id]) return false;
  const a = achById(id);
  if (!a) return false;
  g.ach[id] = new Date().toISOString();
  newly.push(id);
  dirty = true;
  popup(a);
  return true;
}

// 計數型成就：數字到了就解鎖
export function checkCounters() {
  const c = prog().cnt;
  c.stamps = Object.keys(prog().stamps).length;
  c.chalStars = chal().total;
  for (const a of ACH) if (a.cnt && (Number(c[a.cnt]) || 0) >= a.n) unlock(a.id);
  const st = prog().stamps, has = id => !!st[id];
  if (PASSPORT.filter(x => x.group === 'taiwan').every(x => has(x.id))) unlock('stamps_tw');
  if (PASSPORT.filter(x => x.group === 'fantasy').every(x => has(x.id))) unlock('stamps_fx');
  if (PASSPORT.every(x => has(x.id))) unlock('stamps_world');
  save();
}

// 蓋球場護照的章（打完 18 洞）
export function stamp(courseId, strokes) {
  const st = prog().stamps, cur = st[courseId];
  st[courseId] = cur ? { date: cur.date, best: Math.min(cur.best || 999, strokes), n: (cur.n || 1) + 1 } : { date: new Date().toISOString(), best: strokes, n: 1 };
  dirty = true;
}

// 挑戰星數（只會更新成比較好的成績）
export function setStars(levelId, stars, strokes) {
  const c = chal();
  if (stars > (c.stars[levelId] || 0)) { c.stars[levelId] = stars; dirtyChal = true; }
  if (strokes && (!c.best[levelId] || strokes < c.best[levelId])) { c.best[levelId] = strokes; dirtyChal = true; }
  c.total = Object.values(c.stars).reduce((s, v) => s + v, 0);
}

// 存回伺服器：合併後回傳新的個人資料（新成就的能力點在伺服器加）
export function save(now = false) {
  if (!dirty && !dirtyChal) return Promise.resolve();
  clearTimeout(saveTimer);
  return new Promise(res => {
    saveTimer = setTimeout(async () => {
      const points = {};
      for (const id of newly) points[id] = achById(id)?.pts || 0;
      const payload = { prog: prog(), points };
      if (dirtyChal) payload.chal = chal();
      const sent = newly; newly = []; dirty = false; dirtyChal = false;
      try {
        const r = await call('saveProgress', payload);
        const keepLook = session.profile.look;
        session.profile = { ...r.profile, look: r.profile.look || keepLook };
      } catch (e) {
        console.warn('進度儲存失敗，下次再試', e);
        newly = sent.concat(newly); dirty = true; if (payload.chal) dirtyChal = true;
      }
      res();
    }, now ? 0 : 1200);
  });
}

// ---------------- 達成時的動畫提示 ----------------
const queue = [];
let showing = false;
function popup(a) { queue.push(a); if (!showing) next(); }
function next() {
  const a = queue.shift();
  if (!a) { showing = false; return; }
  showing = true;
  let el = document.getElementById('ach-pop');
  if (!el) { el = document.createElement('div'); el.id = 'ach-pop'; document.body.appendChild(el); }
  const skin = SKINS.find(s => s.ach === a.id);
  el.className = 'ach-pop tier-' + a.tier;
  el.innerHTML = `<div class="ap-medal medal tier-${a.tier}"><span>${a.glyph}</span></div>
    <div class="ap-text"><small>成就達成 · ${TIER_NAME[a.tier]}</small><b>${a.name}</b><span>${a.desc}</span>
    ${a.pts || skin ? `<em>${[a.pts ? `能力點 +${a.pts}` : '', skin ? `解鎖「${skin.name}」` : ''].filter(Boolean).join('　')}</em>` : ''}</div>`;
  void el.offsetWidth;
  el.classList.add('show');
  try { navigator.vibrate && navigator.vibrate(a.tier === 'legend' ? [60, 40, 120] : 40); } catch (e) {}
  setTimeout(() => { el.classList.remove('show'); setTimeout(next, 450); }, a.tier === 'legend' || skin ? 4200 : 3200);
}

// 徽章圖示（紀錄頁、提示共用）
export const medalHtml = (a, got) => `<div class="medal tier-${a.tier} ${got ? '' : 'locked'}"><span>${a.glyph}</span></div>`;
