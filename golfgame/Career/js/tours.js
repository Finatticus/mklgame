// 巡迴賽的規則：玩家這一週可以打哪些比賽、資格（巡迴卡、大賽邀請、Signature、季後賽、團體賽、奧運）、
//   積分（聯邦快遞盃、各巡迴的年度積分 / 獎金榜）、世界排名積分、季末的升降與保卡
import { tourCalendar, teamEvents, amateurEvents, collegeEvents, juniorEvents, QSCHOOL, MAJORS, TOUR_ZH, resolveCourse } from './data/calendar.js';
import { MASTERS_PAST, teamSide, EUROPE } from './data/players.js';
import { ABS, ME, owgrAvg, rankList } from './world.js';

// 世界排名：各等級冠軍拿到的積分（實際再乘上賽事強度）
export const TIER = {
  major: { owgr: 100, fedex: 750 }, players: { owgr: 80, fedex: 750 }, sig: { owgr: 66, fedex: 700 }, playoff: { owgr: 70, fedex: 2000 }, pga: { owgr: 46, fedex: 500 },
  exh: { owgr: 0, fedex: 0 }, 'dp+': { owgr: 48, fedex: 0, race: 2000 }, dp: { owgr: 28, race: 1000 }, kft: { owgr: 15, kft: 500 }, pta: { owgr: 7, pta: 500 },
  'asia+': { owgr: 20 }, asia: { owgr: 12 }, 'jp+': { owgr: 18 }, jp: { owgr: 12 }, 'tpga+': { owgr: 7 }, tpga: { owgr: 4 }, olympic: { owgr: 40 }, team: { owgr: 0 }, qs: { owgr: 0 },
  // 業餘（世界業餘排名、青少年排名）
  am_major: { wagr: 60 }, am: { wagr: 30 }, 'college+': { wagr: 45 }, college: { wagr: 25 }, 'junior+': { wagr: 22, jr: 60 }, junior: { wagr: 8, jr: 30 },
};
// 名次 → 冠軍積分的比例
export const shareOf = pos => (pos <= 1 ? 1 : 0.6 * Math.pow(pos - 1, -0.72));
// 聯邦快遞盃的分配（冠軍 500 分的表，其他等級等比例）
const FEDEX500 = [500, 300, 190, 135, 110, 100, 90, 85, 80, 75, 70, 65, 60, 57, 56, 55, 54, 53, 52, 51, 50, 48, 46, 44, 42, 40, 38, 36, 34, 32.5, 31, 29.5, 28, 26.5, 25, 24, 23, 22, 21, 20.25, 19.5, 18.75, 18, 17.25, 16.5, 15.75, 15, 14.25, 13.5, 13, 12.5, 12, 11.5, 11, 10.5, 10, 9.5, 9, 8.5, 8, 7.75, 7.5, 7.25, 7, 6.75, 6.5, 6.25, 6, 5.75, 5.5];
export const fedexPts = (tierWin, pos) => (pos >= 1 && pos <= FEDEX500.length ? FEDEX500[pos - 1] * tierWin / 500 : 0);

// ---------- 這一年的所有比賽 ----------
export function yearEvents(year, st) {
  const country = st.player.country;
  const all = [
    ...tourCalendar('pga', year), ...tourCalendar('kft', year), ...tourCalendar('pta', year), ...tourCalendar('dp', year),
    ...tourCalendar('asia', year), ...tourCalendar('jp', year), ...tourCalendar('tpga', year),
    ...teamEvents(year).map(e => ({ ...e, year })), ...QSCHOOL.map(e => ({ ...e, year })),
    ...amateurEvents(year).map(e => ({ ...e, year })), ...collegeEvents(year).map(e => ({ ...e, year })), ...juniorEvents(year, country).map(e => ({ ...e, year })),
  ];
  // 季外：表演賽、Skins Game、長青巡迴（50 歲以上）
  all.push({ w: 48, id: 'skins', name: 'Skins Game（季末表演賽）', tour: 'exh', course: 'pebble', field: 4, kind: 'skins', tier: 'exh', exh: true, region: 'na', year, purse: 1e6, note: '四人表演賽：每洞獎金，同分累積到下一洞' });
  // 自己主辦的邀請賽（財務 → 事業；第 50 週，30 人、不計正式積分）
  const h = (st.host || {})[year];
  if (h) all.push({ w: 50, id: 'host', name: h.name, tour: 'exh', course: h.course, field: 30, cut: 0, tier: 'exh', exh: true, hosted: true, region: h.region || 'na', year, purse: 4e6, note: '你主辦的邀請賽：獎金由你出，冠軍獎盃上刻著你的名字' });
  if (st.player.age >= 50) all.push(...champions(year));
  return all.map(e => ({ ...e, key: `${year}:${e.id}`, course: resolveCourse(e.course, year) }));
}
function champions(year) {
  const C = (w, id, name, course, o = {}) => ({ w, id: 'ch_' + id, name: 'PGA TOUR Champions · ' + name, course, purse: 2.2e6, tour: 'champions', field: 78, cut: 0, rounds: 3, tier: 'pga', region: 'na', year, ...o });
  return [C(4, 'hawaii', 'Mitsubishi Electric Championship', 'c_waialae'), C(10, 'cologuard', 'Cologuard Classic', 'c_tpcsanantonio'), C(17, 'insperity', 'Insperity Invitational', 'c_colonial'),
    C(21, 'regions', 'Regions Tradition', 'c_sugarloaf', { senior: 'major' }), C(22, 'srpga', 'Senior PGA Championship', 'c_valhalla', { senior: 'major', rounds: 4 }), C(27, 'usso', 'U.S. Senior Open', 'c_oaklandhills', { senior: 'major', rounds: 4 }),
    C(29, 'sropen', 'Senior Open Championship', 'carnoustie', { senior: 'major', rounds: 4, region: 'eu' }), C(33, 'boeing', 'Boeing Classic', 'c_chambersbay'), C(44, 'schwab', 'Charles Schwab Cup Championship', 'c_grayhawk', { finals: true })];
}

// ---------- 資格 ----------
const isAsiaPac = c => ['TPE', 'JPN', 'KOR', 'CHN', 'THA', 'IND', 'PHI', 'MAS', 'SGP', 'AUS', 'NZL'].includes(c);
export function cardsOf(st, year) { const c = st.status.cards || {}; return Object.keys(c).filter(t => c[t] >= year); }
export const hasCard = (st, tour, year = st.year) => (st.status.cards || {})[tour] >= year;
export const myRank = st => st.rankNow || 9999;

// 玩家能不能報名這場比賽：回傳 { ok, why, how }（how：exempt 免資格、card 巡迴卡、mq 週一資格賽、sponsor 贊助外卡、invite 邀請、qual 資格賽、fee 報名）
export function eligibility(st, ev) {
  const p = st.player, s = st.status, age = p.age, y = ev.year;
  const no = why => ({ ok: false, why });
  const am = s.amateur;
  if (ev.tour === 'junior') {
    if (s.stage !== 'junior' && !(s.stage === 'college' && ev.open)) return no('青少年賽限 13~17 歲');
    if (ev.asiaOnly && !isAsiaPac(p.country)) return no('只限亞洲國家');
    if (ev.national && !(s.natTeam >= y)) return no('需要入選國家代表隊');
    if (ev.inv === 'ajga' && !(st.jrRank <= 15 || st.wjr <= 250)) return no('需要國內青少年排名前 15 或世界青少年排名前 250');
    if (ev.inv === 'ajga_elite' && !(st.wjr <= 60)) return no('需要世界青少年排名前 60');
    if (ev.inv === 'jteam') return s.jteam === y ? { ok: true, how: 'invite' } : no('需要入選（世界青少年排名、依國籍分隊）');
    if (ev.inv === 'img' && age < 13) return no('13 歲以上');
    return { ok: true, how: ev.inv ? 'fee' : 'exempt' };
  }
  if (ev.tour === 'ncaa') {
    if (s.stage !== 'college' || !am || !s.college || s.college.type !== 'ncaa') return no('NCAA 大學球隊的賽事');
    if (ev.kind === 'palmer') return s.palmer === y ? { ok: true, how: 'invite' } : no('依大學排名入選');
    return { ok: true, how: 'team' };
  }
  if (ev.tour === 'am') {
    if (!am) return no('業餘賽事（已經轉職業）');
    if (age < 15) return no('15 歲以上');
    if (ev.asiaOnly && !isAsiaPac(p.country)) return no('只限亞太地區的國家');
    if (ev.national) return s.natTeam >= y ? { ok: true, how: 'invite' } : no('國家代表隊才能參加');
    if (ev.kind === 'walker') { const sd = teamSide(p.country); if (!(sd === 'usa' || ['ENG', 'SCO', 'IRL', 'NIR', 'WAL'].includes(p.country))) return no('限美國、英國與愛爾蘭'); return st.wagr <= 30 ? { ok: true, how: 'invite' } : no('需要世界業餘排名前 30'); }
    if (ev.id === 'usam' || ev.id === 'amateur') return st.wagr <= 400 ? { ok: true, how: 'exempt' } : { ok: true, how: 'qual', why: '世界業餘排名不夠，要先過資格賽' };
    return { ok: true, how: 'exempt' };
  }
  if (ev.tour === 'qs') {
    if (age < 17) return no('17 歲以上');
    if (am && s.stage === 'junior') return no('高中畢業後');
    if (ev.stage === 0) return !hasCard(st, 'kft', y + 1) && !hasCard(st, 'pga', y + 1) && !s.qsSkip ? { ok: true, how: 'fee', why: am ? '業餘也能報名（拿到巡迴卡就要轉職業）' : '' } : no('有更高的資格，可以跳過');
    if (ev.stage === 1) return s.qs === 'first' || s.qsSkip === 'first' ? { ok: true, how: 'fee' } : no('要先通過預選賽（或有 PGA TOUR Americas 卡）');
    if (ev.stage === 2) return s.qs === 'second' || s.qsSkip === 'second' ? { ok: true, how: 'fee' } : no('要先通過第一關（或有 Korn Ferry Tour 卡）');
    if (ev.stage === 3) return s.qs === 'final' ? { ok: true, how: 'fee' } : no('要先通過第二關');
    return { ok: true, how: 'fee' };
  }
  if (ev.tour === 'exh') {
    if (ev.kind === 'skins') return st.tally.majors >= 1 || (st.tally.wins >= 3 && myRank(st) <= 20) ? { ok: true, how: 'invite' } : no('只邀請大賽冠軍與明星球員');
    if (ev.id === 'host') return { ok: true, how: 'invite', why: '主辦人' };
    if (ev.id === 'hero') return myRank(st) <= 20 && !am ? { ok: true, how: 'invite' } : no('只邀請世界前 20 名');
  }
  if (ev.tour === 'champions') return age >= 50 && !am ? { ok: true, how: 'exempt' } : no('50 歲以上');
  if (ev.tour === 'team' || ev.tour === 'olympic') {
    const sel = (st.teamSel || {})[ev.key];
    return sel ? { ok: true, how: 'invite' } : no(ev.tour === 'olympic' ? '依世界排名入選（每國最多 2 人，世界前 15 名最多 4 人）' : '依積分與隊長外卡入選');
  }
  // 四大賽
  if (ev.major) return majorEligibility(st, ev);
  if (am) {
    // 業餘可以拿贊助外卡（不能拿獎金）
    if (ev.tour === 'pga' && !ev.sig && !ev.playoff && (st.amInvites || {})[ev.key]) return { ok: true, how: 'sponsor' };
    return no('職業賽事（業餘只能用贊助外卡）');
  }
  if (ev.tour === 'pga') {
    if (ev.playoff) { const fr = st.fedexRank || 999, need = ev.playoff === 1 ? 70 : ev.playoff === 2 ? 50 : 30; return fr <= need && hasCard(st, 'pga', y) ? { ok: true, how: 'exempt' } : no(`需要聯邦快遞盃前 ${need} 名`); }
    if (ev.id === 'sentry') return (st.status.winYears || []).includes(y - 1) || (st.prevFedex || 999) <= 50 ? { ok: true, how: 'exempt' } : no('前一年的冠軍與聯邦快遞盃前 50 名');
    if (ev.sig) return hasCard(st, 'pga', y) && ((st.prevFedex || 999) <= 50 || (st.fedexRank || 999) <= 50 || (s.sigUntil || 0) >= y) ? { ok: true, how: 'exempt' } : no('Signature Event：前一季聯邦快遞盃前 50 名或今年的冠軍');
    if (ev.id === 'players') return hasCard(st, 'pga', y) || myRank(st) <= 50 ? { ok: true, how: 'exempt' } : no('PGA TOUR 會員或世界前 50 名');
    if (ev.id === 'hero') return no('只邀請世界前 20 名');
    if (hasCard(st, 'pga', y)) return { ok: true, how: 'card' };
    if ((st.sponsorInv || {})[ev.key]) return { ok: true, how: 'sponsor' };
    return { ok: true, how: 'mq', why: '沒有 PGA TOUR 卡：可以打週一資格賽（前 4 名進正賽）或申請贊助外卡' };
  }
  if (ev.tour === 'kft') { if (hasCard(st, 'kft', y) || hasCard(st, 'pga', y)) return { ok: true, how: 'card' }; return ev.finals ? no('Korn Ferry 季後賽限積分前段') : { ok: true, how: 'mq', why: '週一資格賽（前 4 名進正賽）' }; }
  if (['dp', 'asia', 'jp', 'tpga', 'pta'].includes(ev.tour)) {
    if (hasCard(st, ev.tour, y)) return ev.finals && !(st.tourRank?.[ev.tour] <= (ev.field || 60)) ? no('年終賽限積分前段') : { ok: true, how: 'card' };
    if (ev.tour === 'dp' && (hasCard(st, 'pga', y) || myRank(st) <= 60) && !ev.finals) return { ok: true, how: 'exempt' };
    if (ev.tour === 'asia' && ev.co === 'dp' && hasCard(st, 'dp', y)) return { ok: true, how: 'card' };
    if (ev.tour === 'tpga' && p.country === 'TPE' && !ev.finals) return { ok: true, how: 'mq', why: '沒有台巡會員卡：打資格賽（前 10 名進正賽）' };
    return no(`需要 ${TOUR_ZH[ev.tour]} 會員卡`);
  }
  return no('');
}

// 四大賽的資格（照真實的邀請類別簡化）
export function majorEligibility(st, ev) {
  const y = ev.year, s = st.status, r = myRank(st), wins = st.titles || [];
  const won = (id, n) => wins.some(t => t.id === id && y - t.y <= n);
  const anyMajor = n => wins.some(t => MAJORS.includes(t.id) && y - t.y <= n);
  const ok = why => ({ ok: true, how: 'exempt', why }), no = why => ({ ok: false, why });
  if ((s.invites || []).some(i => i.ev === ev.id && i.y === y)) return { ok: true, how: 'invite', why: '收到邀請' };
  if (ev.id === 'masters') {
    if (won('masters', 999)) return ok('歷屆名人賽冠軍（終身）');
    if (anyMajor(5)) return ok('最近 5 年的大賽冠軍');
    if (won('players', 3)) return ok('最近 3 年的 THE PLAYERS 冠軍');
    if (st.prevMasters <= 12) return ok('前一年名人賽前 12 名');
    if (st.prevMajorTop4) return ok('前一年其他三大賽前 4 名');
    if (st.prevTourChamp) return ok('前一年 TOUR Championship 參賽者');
    if (wins.some(t => t.tier === 'pga' || t.tier === 'sig' || t.tier === 'playoff') && wins.some(t => t.y === y - 1 || (t.y === y && t.w < ev.w))) return ok('PGA TOUR 積分全額賽事的冠軍');
    if (st.rankDec <= 50 || r <= 50) return ok('世界排名前 50');
    return no('名人賽是邀請賽：冠軍、世界前 50、大賽前段…');
  }
  if (ev.id === 'usopen') {
    if (won('usopen', 10)) return ok('最近 10 年的美國公開賽冠軍');
    if (anyMajor(5)) return ok('最近 5 年的大賽冠軍');
    if (r <= 60) return ok('世界排名前 60');
    if (st.prevUSOpen <= 10) return ok('前一年美國公開賽前 10 名');
    if (s.amateur && st.amMajorWin === y - 1) return ok('業餘大賽冠軍');
    return { ok: true, how: 'qual', why: '要打美國公開賽資格賽（36 洞，前段晉級）' };
  }
  if (ev.id === 'open') {
    if (won('open', 999) && st.player.age <= 60) return ok('歷屆英國公開賽冠軍（60 歲以下）');
    if (anyMajor(5)) return ok('最近 5 年的大賽冠軍');
    if (r <= 50) return ok('世界排名前 50');
    if (st.prevOpen <= 10) return ok('前一年英國公開賽前 10 名');
    if (s.amateur && st.amMajorWin === y - 1) return ok('業餘大賽冠軍');
    return { ok: true, how: 'qual', why: '要打英國公開賽最終資格賽' };
  }
  if (ev.id === 'pgachamp') {
    if (s.amateur) return no('PGA 錦標賽只限職業選手');
    if (won('pgachamp', 999)) return ok('歷屆 PGA 錦標賽冠軍');
    if (anyMajor(5)) return ok('最近 5 年的大賽冠軍');
    if (r <= 100) return ok('世界排名前 100');
    if (wins.some(t => y - t.y <= 1 && (t.tier === 'pga' || t.tier === 'sig'))) return ok('最近一年的 PGA TOUR 冠軍');
    return no('世界前 100、PGA TOUR 冠軍或大賽冠軍');
  }
  return no('');
}

// ---------- 季末：升降、保卡（玩家）----------
// 升級門檻（v96 放寬：轉職業後平均 2~3 年拿到 PGA TOUR 卡）：Korn Ferry 積分前 40、PGA TOUR Americas 前 20 升 Korn Ferry、Q-School 決賽前 10
export const KFT_UP = 40, PTA_UP = 20, QS_PGA = 10;
export function seasonEndCards(st, year, ranks) {
  const s = st.status, out = [];
  const give = (tour, until, text) => { s.cards[tour] = Math.max(s.cards[tour] || 0, until); out.push(text); };
  if (!s.amateur) {
    if (hasCard(st, 'pga', year)) {
      if ((ranks.pga || 999) <= 100) give('pga', year + 1, `聯邦快遞盃第 ${ranks.pga} 名：保住下一季 PGA TOUR 全卡`);
      else if ((ranks.pga || 999) <= 150) { give('kft', year + 1, `聯邦快遞盃第 ${ranks.pga} 名：下一季降到 Korn Ferry Tour（保有部分 PGA TOUR 資格）`); s.cards.pgaPartial = year + 1; }
      else if (!((s.cards.pga || 0) > year)) give('kft', year + 1, '沒有保住 PGA TOUR 卡：下一季回到 Korn Ferry Tour');
    }
    if (hasCard(st, 'kft', year) && (ranks.kft || 999) <= KFT_UP) give('pga', year + 1, `Korn Ferry Tour 積分第 ${ranks.kft} 名：拿到 PGA TOUR 卡！`);
    else if (hasCard(st, 'kft', year) && (ranks.kft || 999) <= 75) give('kft', year + 1, `Korn Ferry Tour 積分第 ${ranks.kft} 名：保住下一季 Korn Ferry 卡`);
    else if (hasCard(st, 'kft', year) && !hasCard(st, 'pga', year + 1)) give('pta', year + 1, `Korn Ferry Tour 積分第 ${ranks.kft || '—'} 名：沒保住 Korn Ferry 卡，下一季降到 PGA TOUR Americas`);
    if (hasCard(st, 'pta', year) && (ranks.pta || 999) <= PTA_UP) give('kft', year + 1, `PGA TOUR Americas 第 ${ranks.pta} 名：升上 Korn Ferry Tour`);
    else if (hasCard(st, 'pta', year) && (ranks.pta || 999) <= 60) give('pta', year + 1, '保住 PGA TOUR Americas 卡');
    if (hasCard(st, 'dp', year) && (ranks.dp || 999) <= 10 && !hasCard(st, 'pga', year + 1)) give('pga', year + 1, `Race to Dubai 第 ${ranks.dp} 名：拿到 PGA TOUR 卡！`);
    if (hasCard(st, 'dp', year) && (ranks.dp || 999) <= 115) give('dp', year + 1, '保住 DP World Tour 卡');
    if (hasCard(st, 'asia', year) && (ranks.asia || 999) <= 2) give('dp', year + 1, `亞巡獎金榜第 ${ranks.asia} 名：拿到 DP World Tour 卡！`);
    if (hasCard(st, 'asia', year) && (ranks.asia || 999) <= 60) give('asia', year + 1, '保住亞巡卡');
    if (hasCard(st, 'jp', year) && (ranks.jp || 999) <= 2) give('dp', year + 1, `日巡獎金王前段：拿到 DP World Tour 卡！`);
    if (hasCard(st, 'jp', year) && (ranks.jp || 999) <= 65) give('jp', year + 1, '保住日巡種子');
    if (hasCard(st, 'tpga', year) && (ranks.tpga || 999) <= 3) give('asia', year + 1, `台巡獎金榜第 ${ranks.tpga} 名：拿到亞巡卡！`);
    if (hasCard(st, 'tpga', year) && (ranks.tpga || 999) <= 60) give('tpga', year + 1, '保住台巡卡');
  }
  return out;
}

// Q-School 的結果
export function qschoolResult(st, ev, pos, tieN) {
  const s = st.status, y = ev.year, out = [];
  // 年初的資格賽（台巡、亞巡）給的是今年的卡；年底的（PGA、DP）給明年的卡
  const season = ev.w <= 6 ? y : y + 1;
  const card = (t, text) => { s.cards[t] = Math.max(s.cards[t] || 0, season); out.push(text); };
  if (ev.stage === 0) { if (pos <= ev.adv) { s.qs = 'first'; out.push('通過預選賽，晉級第一關'); } }
  else if (ev.stage === 1) { if (pos <= ev.adv) { s.qs = 'second'; out.push('通過第一關，晉級第二關'); } else card('pta', '第一關沒過：拿到 PGA TOUR Americas 的部分資格'); }
  else if (ev.stage === 2) { if (pos <= ev.adv) { s.qs = 'final'; out.push('通過第二關，晉級決賽！'); } else card('pta', '第二關沒過：拿到 PGA TOUR Americas 資格'); }
  else if (ev.stage === 3) {
    if (pos <= QS_PGA) card('pga', `Q-School 決賽第 ${pos} 名：直接拿到 PGA TOUR 資格！`);
    else if (pos <= 45) card('kft', `Q-School 決賽第 ${pos} 名：拿到 Korn Ferry Tour 資格`);
    else card('pta', `Q-School 決賽第 ${pos} 名：拿到 PGA TOUR Americas 資格`);
    s.qs = null;
  } else if (ev.stage === 9) { if (pos <= ev.adv) card('asia', `亞巡資格賽第 ${pos} 名：拿到亞巡卡`); }
  else if (ev.stage === 8) { if (pos <= ev.adv) card('dp', `DP World Tour 資格賽第 ${pos} 名：拿到 DP World Tour 卡`); }
  else if (ev.stage === 7) { if (pos <= ev.adv) card('tpga', `台巡資格賽第 ${pos} 名：拿到台巡卡`); }
  return out;
}

// 團體賽與奧運的選拔（每年 8 月底）
export function teamSelection(st, ev, world, now) {
  const list = rankList(world, st.player.pro ? { ...st.player, id: ME, ow: st.ow, pro: true } : null, now);
  const sideOf = x => (x.p.id === ME ? teamSide(st.player.country) : teamSide(x.p.c));
  if (ev.kind === 'olympic') {
    const per = {}, sel = [];
    for (const x of list) {
      const c = x.p.id === ME ? st.player.country : x.p.c, top15 = sel.length < 15 && list.indexOf(x) < 15;
      if ((per[c] || 0) >= (top15 ? 4 : 2)) continue;
      per[c] = (per[c] || 0) + 1; sel.push(x);
      if (sel.length >= 60) break;
    }
    return sel.map(x => x.p.id);
  }
  const sides = ev.kind === 'ryder' ? ['usa', 'eur'] : ['usa', 'intl'];
  const teams = {};
  for (const sd of sides) {
    const pool = list.filter(x => sideOf(x) === sd && (x.p.id === ME || x.p.tour !== 'liv' || sd !== 'usa'));
    const auto = pool.slice(0, 6), picks = [];
    // 隊長外卡：接下來 10 個人裡挑 6 個（近期狀態好的優先；玩家有表達意願會加分）
    const cand = pool.slice(6, 18).map(x => ({ x, s: x.avg * (x.p.id === ME && st.story.flags.wantPick ? 1.25 : 1) * (0.85 + ((x.p.id.charCodeAt(1) * 7 + now) % 30) / 100) }));
    cand.sort((a, b) => b.s - a.s).slice(0, 6).forEach(c => picks.push(c.x));
    teams[sd] = auto.concat(picks).map(x => x.p.id);
  }
  return teams;
}
