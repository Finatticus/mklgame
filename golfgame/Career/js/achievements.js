// 生涯成就（63 個）：加進主遊戲的成就系統（「生涯」分類，只有開放名單內的帳號看得到）
//   能力點：主帳號只從生涯成就拿能力點，合計 40 點（伺服器每個成就最多加 3 點）
import { ACH, ACH_CATS, unlock, save as saveProgress } from '../../js/progress.js';
import { MAJORS } from './data/calendar.js';
import { slamStatus } from './slam.js';

const A = (id, tier, glyph, name, desc, sub, pts = 0) => ({ id: 'cm_' + id, cat: 'career', sub, tier, glyph, name, desc, pts });
export const CAREER_ACH = [
  // 序章・童年
  A('dream', 'bronze', '夢', '夢想起點', '看完名人賽之夜', 'child'), A('swing', 'bronze', '揮', '第一次揮桿', '在練習場打完第一籃球', 'child'),
  A('birdie', 'bronze', '鳥', '第一隻鳥', '生涯中第一次打出小鳥', 'child'), A('break100', 'bronze', '百', '破百', '18 洞桿數低於 100（任何梯台）', 'child'),
  A('kidcup', 'silver', '盃', '第一座兒童盃', '拿到兒童賽的冠軍', 'child'), A('kidnat', 'gold', '全', '全國兒童冠軍', '兒童時期拿到全國排名第一或家鄉兒童盃冠軍兩次', 'child'),
  A('uskids', 'gold', '世', 'U.S. Kids 世界錦標賽', '參加 U.S. Kids Golf 世界錦標賽', 'child'), A('adultset', 'bronze', '桿', '第一套成人球桿', '拿到第一套成人球桿', 'child'),
  A('know40', 'gold', '知', '知識卡收集', '收集 40 張知識卡', 'child'),
  // 青少年
  A('coach', 'bronze', '師', '拜師', '第二章選擇第一位教練', 'junior'), A('school', 'silver', '校', '校隊團體金牌', '學校團體賽拿到冠軍', 'junior'),
  A('national', 'gold', '國', '入選國家代表隊', '青少年國家代表隊', 'junior', 1), A('jr1', 'gold', '青', '全國青少年排名第一', '國內青少年排名第一', 'junior'),
  A('ajga', 'gold', '美', 'AJGA 冠軍', '拿到 AJGA 或世界青少年錦標賽冠軍', 'junior'), A('jteam', 'gold', '隊', 'Junior 總統盃 / 萊德盃', '入選 Junior Presidents Cup 或 Junior Ryder Cup', 'junior'),
  A('asiangames', 'legend', '亞', '亞運獎牌', '亞運高爾夫前三名', 'junior'), A('scholar', 'silver', '獎', '大學獎學金', '拿到大學的運動獎學金', 'junior'),
  // 大學・業餘
  A('ncaa', 'gold', '學', 'NCAA 冠軍', 'NCAA Championship 個人冠軍', 'college'), A('usam', 'legend', '業', '美國業餘冠軍', '贏得 U.S. Amateur', 'college', 2),
  A('amateur', 'legend', '英', '英國業餘冠軍', '贏得 The Amateur Championship', 'college', 1), A('aac', 'legend', '太', '亞太業餘冠軍', '贏得 Asia-Pacific Amateur Championship', 'college', 1),
  A('lowam', 'legend', '銀', '名人賽最佳業餘', '以業餘身分在名人賽拿到最佳業餘（銀盃）', 'college', 1), A('wagr1', 'legend', '冠', '世界業餘排名第一', '世界業餘排名第一（McCormack 獎章）', 'college'),
  A('turnpro', 'bronze', '轉', '轉職業', '轉為職業選手', 'college'),
  // 職業之路
  A('monday', 'silver', '一', '週一資格賽過關', '從週一資格賽打進正賽', 'road'), A('qline', 'gold', '線', '資格賽線上驚魂', '在 Q-School 決賽剛好在資格線上過關', 'road'),
  A('pgacard', 'gold', '卡', '拿到 PGA TOUR 卡', '拿到 PGA TOUR 全季資格', 'road', 2), A('asiawin', 'gold', '亞', '亞巡冠軍', '拿到亞巡冠軍', 'road'),
  A('kftwin', 'gold', '晉', 'Korn Ferry 冠軍', '拿到 Korn Ferry Tour 冠軍', 'road'), A('homewin', 'legend', '家', '衣錦還鄉', '在家鄉國家拿到職業冠軍', 'road'),
  // PGA TOUR
  A('rookie', 'gold', '新', '新人王', '年度最佳新人（Arnold Palmer Award）', 'tour', 1), A('firstwin', 'gold', '勝', 'PGA TOUR 首勝', '拿到 PGA TOUR 冠軍', 'tour', 2),
  A('three', 'legend', '三', '單季三勝', '同一季拿到 3 場 PGA TOUR 冠軍', 'tour'), A('playoff', 'gold', '延', '延長賽勝利', '在延長賽贏得冠軍', 'tour'),
  A('comeback', 'legend', '逆', '大逆轉', '最後一輪落後 5 桿以上逆轉奪冠', 'tour'), A('fiftynine', 'legend', '奇', '59 俱樂部', '在職業賽打出 59 桿以下', 'tour'),
  A('players', 'legend', '島', 'THE PLAYERS 冠軍', '贏得 THE PLAYERS Championship', 'tour', 1), A('fedex', 'legend', '快', '聯邦快遞盃總冠軍', '贏得 TOUR Championship', 'tour', 2),
  A('poy', 'legend', '年', '年度最佳球員', 'PGA TOUR 年度最佳球員', 'tour'), A('top10', 'gold', '十', '世界前十', '世界排名前十', 'tour', 1),
  A('no1', 'legend', '王', '世界第一', '世界排名第一', 'tour', 2), A('no1_52', 'legend', '久', '世界第一 52 週', '累計 52 週世界第一', 'tour'),
  // 大賽・團體
  A('green', 'legend', '綠', '綠夾克', '名人賽冠軍', 'major', 3), A('defend', 'legend', '衛', '名人賽衛冕', '連續兩年名人賽冠軍', 'major', 2),
  A('jug', 'legend', '壺', '英國公開賽冠軍', 'The Open Championship 冠軍', 'major', 2), A('usopen', 'legend', '美', '美國公開賽冠軍', 'U.S. Open 冠軍', 'major', 2),
  A('wanamaker', 'legend', '杯', 'PGA 錦標賽冠軍', 'PGA Championship 冠軍', 'major', 2), A('slam', 'legend', '滿', '生涯大滿貫', '四大賽都拿過冠軍', 'major', 3),
  A('yslam', 'legend', '霸', '年度大滿貫', '同一年拿下四大賽', 'major', 3), A('tslam', 'legend', '虎', '連續四大賽', '連續四場大賽都是冠軍（跨年也算）', 'major', 3),
  A('dslam', 'legend', '雙', '雙料生涯大滿貫', '四大賽都拿過至少兩次', 'major', 3), A('major5', 'legend', '五', '大賽五冠', '累積 5 座大賽冠軍', 'major', 2),
  A('host', 'gold', '主', '主辦人', '自己主辦一場邀請賽', 'tour'), A('estate', 'gold', '莊', '海景莊園', '住進海景莊園', 'tour'), A('owner', 'legend', '場', '球場主人', '家鄉球場四項設施全部升到 3 級', 'tour'),
  A('skills', 'gold', '技', '技巧賽冠軍', '在明星技巧賽拿下長打或近旗冠軍', 'tour'), A('classic', 'gold', '憶', '經典重現', '在經典重現挑戰成功', 'tour'), A('gold', 'legend', '金', '奧運金牌', '奧運高爾夫金牌', 'major', 2),
  A('cup', 'gold', '盟', '總統盃 / 萊德盃勝利', '代表球隊贏得總統盃或萊德盃', 'major'),
  // 傳奇
  A('hof', 'legend', '堂', '名人堂', '入選世界高爾夫名人堂', 'legend', 3), A('captain', 'legend', '帥', '冠軍隊長', '以隊長身分贏得總統盃或萊德盃', 'legend'),
  A('honorary', 'gold', '開', '榮譽開球', '名人賽榮譽開球', 'legend'), A('senior', 'gold', '長', '長青巡迴冠軍', 'PGA TOUR Champions 冠軍', 'legend'),
  A('farewell', 'gold', '別', '告別賽', '打完自己的告別賽', 'legend'), A('designer', 'gold', '設', '設計師', '設計一座球場並投稿', 'legend'),
  A('academy', 'gold', '徒', '桃李滿門', '學院的學員拿到職業冠軍', 'legend'), A('legacy', 'legend', '承', '傳承生涯首勝', '傳承生涯拿到第一座冠軍', 'legend', 1),
  A('charity', 'silver', '善', '成立慈善基金會', '成立自己的慈善基金會', 'legend'), A('chem5', 'gold', '伴', '和桿弟默契滿級', '和一位桿弟的默契到 5 級', 'legend'),
  A('rivalend', 'gold', '敵', '宿敵終結者', '對宿敵的對戰紀錄贏 20 場以上', 'legend'), A('thirty', 'legend', '老', '生涯滿 30 年', '從 8 歲開始，生涯滿 30 年', 'legend'),
];
export const CAREER_CAT = ['career', '生涯'];

// 加進主遊戲的成就清單（只做一次）
let registered = false;
export function registerAch() {
  if (registered) return;
  registered = true;
  if (!ACH_CATS.some(c => c[0] === 'career')) ACH_CATS.push(CAREER_CAT);
  for (const a of CAREER_ACH) if (!ACH.some(x => x.id === a.id)) ACH.push(a);
}
registerAch();

// 解鎖（生涯存檔也記一份，伺服器的主帳號透過 saveProgress 合併）
export function cmUnlock(st, id) {
  const full = 'cm_' + id;
  if (st.ach[full]) return false;
  st.ach[full] = new Date().toISOString();
  // 測試工具的模擬生涯（autosim、平衡測試）只記在模擬存檔裡，不解鎖登入帳號的主遊戲成就
  if (st.user === 'sim' || st.user === '__test') return true;
  unlock(full);
  saveProgress();
  return true;
}

// 依生涯狀態檢查（每週、每場比賽、主線事件之後）
export function checkAch(st) {
  const T = st.tally, t = st.titles, has = id => t.some(x => x.id === id), U = id => cmUnlock(st, id), y = st.year;
  if (st.story.done.prologue) U('dream');
  if (st.cnt.swing) U('swing');
  if (st.cnt.birdie) U('birdie');
  if (st.cnt.best18 && st.cnt.best18 < 100) U('break100');
  if (t.some(x => x.tour === 'kids')) U('kidcup');
  if (t.filter(x => x.tour === 'kids').length >= 2 || st.cnt.kidNat) U('kidnat');
  if (st.cnt.uskids) U('uskids');
  if (st.story.done.first_set) U('adultset');
  if ((st.know || []).length >= 40) U('know40');
  if (st.team.jcoach) U('coach');
  if (st.cnt.schoolGold) U('school');
  if (st.status.natTeam) U('national');
  if (st.jrRank === 1 && st.status.stage === 'junior') U('jr1');
  if (t.some(x => /^jr_ajga|^jr_img/.test(x.id))) U('ajga');
  if (st.status.jteam) U('jteam');
  if (st.cnt.asianMedal) U('asiangames');
  if (st.school && st.school.scholar) U('scholar');
  if (has('nc_ncaa')) U('ncaa');
  if (has('usam')) U('usam');
  if (has('amateur')) U('amateur');
  if (has('aac')) U('aac');
  if (st.cnt.lowam) U('lowam');
  if (st.wagr === 1 && st.status.amateur && st.player.age >= 16) U('wagr1');
  if (!st.status.amateur) U('turnpro');
  if (st.cnt.mqPass) U('monday');
  if (st.cnt.qline) U('qline');
  if ((st.status.cards || {}).pga) U('pgacard');
  if (t.some(x => x.tour === 'asia')) U('asiawin');
  if (t.some(x => x.tour === 'kft')) U('kftwin');
  if (st.cnt.homeWin) U('homewin');
  if (T.rookie) U('rookie');
  if (T.pgaWins >= 1) U('firstwin');
  if (Object.values(groupBy(t.filter(x => x.tour === 'pga' || x.tour === 'major'), 'y')).some(a => a.length >= 3)) U('three');
  if (T.playoffs >= 1) U('playoff');
  if (st.cnt.comeback) U('comeback');
  if (st.cnt.fiftynine) U('fiftynine');
  if (has('players')) U('players');
  if (has('tourchamp')) U('fedex');
  if (T.poy) U('poy');
  if ((st.bestRank || 9999) <= 10) U('top10');
  if ((st.bestRank || 9999) <= 1) U('no1');
  if ((st.cnt.no1Weeks || 0) >= 52) U('no1_52');
  if (has('masters')) U('green');
  if (t.filter(x => x.id === 'masters').some(x => t.some(z => z.id === 'masters' && z.y === x.y - 1))) U('defend');
  if (has('open')) U('jug');
  if (has('usopen')) U('usopen');
  if (has('pgachamp')) U('wanamaker');
  if (MAJORS.every(m => has(m))) U('slam');
  if (Object.values(groupBy(t.filter(x => MAJORS.includes(x.id)), 'y')).some(a => new Set(a.map(z => z.id)).size === 4)) U('yslam');
  { const sl = slamStatus(st); if (sl.tiger) U('tslam'); if (sl.slams >= 2) U('dslam'); if (sl.total >= 5) U('major5'); }
  if (st.cnt.hosted) U('host');
  if ((st.homeLv || 0) >= 3) U('estate');
  if (st.courseUp && ['club', 'turf', 'range', 'hotel'].every(k => (st.courseUp[k] || 0) >= 3)) U('owner');
  if (st.cnt.skillsWin) U('skills');
  if (st.cnt.classicWin) U('classic');
  if (st.cnt.olyGold) U('gold');
  if (st.cnt.cupWin) U('cup');
  if (st.legacy && st.legacy.hof) U('hof');
  if (st.cnt.captainWin) U('captain');
  if (st.cnt.honorary) U('honorary');
  if (t.some(x => x.tour === 'champions')) U('senior');
  if (st.cnt.farewell) U('farewell');
  if (st.cnt.designer) U('designer');
  if (st.cnt.academyWin) U('academy');
  if (st.legacyOf && T.wins >= 1) U('legacy');
  if (st.assets.foundation) U('charity');
  if (st.team.caddie && (st.team.caddie.chem || 0) >= 5) U('chem5');
  if (Object.values((st.story.h2h) || {}).some(k => k.w >= 20)) U('rivalend');
  if (y - (st.player.birthYear + 8) >= 30) U('thirty');
  checkCards(st, effectiveStats(st));
}
import { effectiveStats } from './growth.js';
// 技能卡的解鎖（條件寫在 growth.js 的 CARDS.unlock）
import { CARDS } from './growth.js';
import { driveCarry } from './sim.js';
export function checkCards(st, eff) {
  const p = st.player, T = st.tally, c = st.cnt, give = id => { if (!p.cards.includes(id)) { p.cards.push(id); if ((p.cardEq || []).length < 2) (p.cardEq = p.cardEq || []).push(id); st.news.unshift({ y: st.year, w: st.week, text: `解鎖技能卡「${CARDS[id].name}」`, kind: 'me' }); } };
  if (T.wins - (T.jrWins || 0) - (T.amWins || 0) >= 1 && !st.status.amateur) give('closer');
  if (c.putts26) give('short_putt');
  if ((T.jrWins || 0) >= 1) give('sand_save');
  if ((T.kftWins || 0) >= 1) give('rough_rider');
  if ((T.playoffs || 0) >= 1) give('ice');
  if (eff && driveCarry(eff.power, eff._spd) >= 300) give('bomber');
  if (c.gir16) give('dart');
  if (c.saves6) give('scrambler');
  if (c.majorTop10) give('major_heart');
  if (c.homeWin) give('home_hero');
  if ((c.cutStreak || 0) >= 10) give('first_tee');
  if ((T.masters || 0) >= 1) give('green_jacket');
  if ((c.holesOwn || 0) >= 54) give('mulligan');
  if (c.fw13) give('fairway');
  if (c.par3clean) give('par3');
  if (c.eagle) give('par5');
  if (c.windUnder) give('wind');
  if ((c.holesOwn || 0) >= 300) give('long_putt');
  if (c.bounce2) give('bounce');
  if (c.birdie3) give('hot');
  if (c.bogeyFree) give('par_save');
  if (c.birdies5) give('wedge');
  if ((T.amWins || 0) >= 1) give('opening');
  if (T.wins - (T.jrWins || 0) - (T.amWins || 0) >= 3 && !st.status.amateur) give('sunday');
  if (c.mqPass || c.qline) give('qs');
  if (c.linksUnder) give('links');
}
const groupBy = (arr, k) => arr.reduce((o, x) => ((o[x[k]] = o[x[k]] || []).push(x), o), {});
