// 「全模擬三十年」的平衡測試（本機用，不上傳）：從 13 歲開始自動過每一週、每一場比賽都用模擬，
//   記下第一次拿到 PGA TOUR 卡、首勝、第一座大賽、綠夾克的年紀，以及推估的遊玩時數
//   用法（在本機伺服器的遊戲頁）：(await import('/Career/tools/autosim.js?v=' + Date.now())).run({ years: 30, seed: 'a1' })
import { newCareer, skipChildhood, endWeek, settleEvent, weekEvents, turnProCore, queueMain } from '../js/life.js';
import { createEvent, prepareRound, finishMyRound, applyCut, finalStandings, playoffNeeded, cinfo } from '../js/event.js';
import { afterSettle } from '../js/ui/eventview.js';
import { isEntered } from '../js/ui/home.js';
import { addXp, spendPoint, STAT_KEYS, capOf, skillCost, playerRating, effectiveStats, STYLES } from '../js/growth.js';
import { checkMain } from '../js/story.js';
import { checkAch } from '../js/achievements.js';
import { JUNIOR_COACHES, CADDIES, AGENTS } from '../js/data/items.js';
import { rng, hash } from '../js/util.js';
import { driveCarry } from '../js/sim.js';

// 最後一輪開始前的名次（玩家）
function finalStandingsLite(E, ri) {
  const mine = E.me.sc.slice(0, ri).reduce((s, x) => s + (x ? x.reduce((a, b) => a + b, 0) : 0), 0);
  return E.field.filter(e => !e.cut && e.sc.slice(0, ri).reduce((s, x) => s + (x ? x.reduce((a, b) => a + b, 0) : 0), 0) < mine).length + 1;
}
// 同一週報了好幾場：大賽 > 團體 > PGA > 資格賽 > 其他（和首頁的 thisWeekEvent 一樣）
const order = e => (e.major ? 0 : e.tour === 'team' || e.tour === 'olympic' ? 1 : e.tour === 'pga' ? 2 : e.tour === 'qs' ? 3 : 4);
// 推估的時間（分鐘）：大賽與爭冠的最後一輪自己打 18 洞、一般比賽打精華 9 洞或關鍵時刻、小比賽模擬
const MIN = { full: 42, nine: 21, key: 8, sim: 0.3, week: 0.6, eventWeek: 3 };

export async function run(o = {}) {
  const st = newCareer({ user: 'sim', slot: 9, name: '模擬', country: o.country || 'TPE', home: '台中', family: 'middle', look: {}, difficulty: o.difficulty || 'standard', length: o.length || 'standard', seed: o.seed || 'auto' + Math.random() });
  st.player.talents = ['basics', 'heart'];
  skipChildhood(st);
  st.school = { grade: 68 };
  st.team.jcoach = { ...JUNIOR_COACHES[1], fee: 400 };
  const r = rng(hash(st.seed + 'auto'));
  const marks = {}, mark = (k, v = st.player.age) => { if (marks[k] == null) marks[k] = v; };
  let minutes = 180;      // 童年的新手引導約 3 小時（這裡跳過）
  const rows = [], logs = [];
  const yEnd = st.year + (o.years || 30);
  while (st.year < yEnd) {
    // 自動回答主線事件的選擇
    checkMain(st);
    for (const id of st.story.queue.splice(0)) {
      st.story.done[id] = st.year;
      if (id === 'style') st.player.style = o.style || 'allround';
      if (id === 'crossroads') { const ok = (st.wjr || 999) <= 400 && st.school.grade >= 45; if (ok) { st.status.stage = 'college'; st.status.college = { type: 'ncaa', name: 'Auto U', year: 0 }; st.school.scholar = (st.wjr || 999) <= 250; } else { st.status.stage = 'college'; st.status.college = { type: 'dom', name: '國內大學', year: 0 }; } }
      if (id === 'agent') st.team.agent = { ...AGENTS[0] };
      if (id === 'base') st.base = 'florida';
      if (id === 'first_caddie') st.team.caddie = { id: 'family', name: '家人', fee: 0, chem: 1 };
    }
    // 技能點：平均分配到最低的素質
    let guard = 0;
    while (st.player.skillPts > 0 && guard++ < 50) {
      const k = STAT_KEYS.filter(k => st.player.stats[k] < capOf(st.player, k)).sort((a, b) => st.player.stats[a] - st.player.stats[b])[0];
      if (!k || spendPoint(st.player, k)) break;
    }
    // 這一週的比賽
    // 沒有巡迴卡的職業選手：報 Q-School 預選賽、亞巡 / 台巡資格賽，週一資格賽用模擬（前 4 名進正賽的機率依實力）
    const wk = weekEvents(st);
    // PGA TOUR Q-School：沒有下一季的 PGA TOUR / Korn Ferry 卡就去考；台巡、亞巡資格賽：手上沒有任何卡才考
    const c = st.status.cards;
    if (!st.status.amateur) for (const e of wk) if (e.tour === 'qs' && e.el.ok && ((e.stage === 0 && !(c.pga >= st.year) && !(c.kft > st.year)) || ([7, 9].includes(e.stage) && !Object.values(c).some(y => y >= st.year)))) st.entered[e.key] = true;
    if (o.log && st.player.age >= (o.logFrom || 0)) for (const e of wk) if (e.tour === 'qs' || (e.tour === st.status.mainTour)) logs.push(`  ${st.year}w${st.week} ${e.name}: ${e.el.ok ? e.el.how : '× ' + e.el.why} ${isEntered(st, e) ? '[報名]' : ''} inj${st.player.injury}`);
    let ev = wk.filter(e => isEntered(st, e) && !['usam', 'ryder', 'presidents', 'walker', 'palmer', 'jryder', 'jpres', 'skins'].includes(e.kind) && e.el.how !== 'mq' && e.el.how !== 'qual').sort((a, b) => order(a) - order(b))[0];
    if (!ev && !st.status.amateur) { const mq = wk.find(e => e.el.ok && e.el.how === 'mq' && (e.tour === st.status.mainTour || e.tour === 'kft')); if (mq && r() < Math.max(0.03, Math.min(0.5, (playerRating(st) - 60) / 30))) ev = mq; }
    if (ev && st.player.injury <= 0) {
      const E = createEvent(st, ev, st.world, ev.el.how);
      for (let ri = 0; ri < E.rounds; ri++) {
        if (E.madeCut === false) break;
        prepareRound(st, E, ri);
        E.me.sc[ri] = E.me.sim[ri].slice();
        const final = ri === E.rounds - 1;
        // 企劃書的時間假設：大賽最後一輪自己打 18 洞、大賽與 PGA TOUR 打精華 9 洞、其他打關鍵時刻（4 洞）
        // 時間假設：大賽前三輪打精華 9 洞、最後一輪 18 洞；其他比賽打關鍵時刻，最後一輪爭冠時打精華 9 洞
        const contend = final && (() => { const lb = finalStandingsLite(E, ri); return lb <= 10; })();
        const mode = E.major ? (final ? 'full' : 'nine') : contend ? 'nine' : 'key';
        const nPlay = { full: 18, nine: 9, key: 4 }[mode];
        E.me.played[ri] = Array.from({ length: 18 }, (_, h) => (mode === 'key' ? h >= 14 : h >= 18 - nPlay));
        minutes += MIN[mode];
        finishMyRound(E, ri);
        if (ri === 1) applyCut(E);
      }
      if (E.madeCut === false) for (const e of E.field) if (!e.cut) for (let k = 2; k < E.rounds; k++) e.sc[k] = e.sc[k] || e.sc[1];
      const tied = playoffNeeded(E);
      if (tied) E.playoffWinner = tied[Math.floor(r() * tied.length)].id;
      const rowsF = finalStandings(E), rec = settleEvent(st, E, rowsF);
      afterSettle(st, E, rowsF, rec);
      if (o.log && st.player.age >= (o.logFrom || 0)) logs.push(`${st.year}w${st.week} ${st.player.age}y ${E.name} ${rec.pos} R${playerRating(st).toFixed(1)} E${Math.round(st.player.energy)} F${st.player.form} field${Math.round(E.field.reduce((a, e) => a + e.R, 0) / E.field.length)}`);
      minutes += MIN.eventWeek;
      if (rec.posN === 1 && (E.tour === 'pga' || E.tour === 'major')) mark('firstPgaWin');
      if (rec.posN === 1 && E.major) mark('firstMajor');
      if (rec.posN === 1 && E.id === 'masters') { mark('greenJacket'); mark('greenHours', Math.round(minutes / 60)); }
      endWeek(st, [], { eventWeek: true, eventKey: E.key });
    } else {
      const broke = !st.status.amateur && st.money.cash < 3000;
      const plan = [{ k: 'train', sub: ['iron', 'putt', 'long', 'short'][st.week % 4] }, { k: st.player.energy < 50 ? 'rest' : 'train', sub: 'putt' }, { k: broke ? 'work' : 'train', sub: 'long' }];
      endWeek(st, plan.slice(0, st.status.stage === 'junior' || st.status.stage === 'college' ? 2 : 3));
      minutes += MIN.week;
    }
    if (st.status.cards.pga) mark('pgaCard');
    if (st.status.stage === 'road') mark('turnPro');
    checkAch(st);
    if (st.week === 1) rows.push({ y: st.year - 1, age: st.player.age - 1, R: playerRating(st).toFixed(1), drive: driveCarry(effectiveStats(st).power, effectiveStats(st)._spd), stage: st.status.stage, rank: st.status.amateur ? 'wagr ' + st.wagr + ' / jr ' + st.jrRank : st.rankNow, wins: st.tally.wins, majors: st.tally.majors, cash: Math.round(st.money.cash), hours: Math.round(minutes / 60), cards: Object.entries(st.status.cards).filter(([t, y]) => y >= st.year).map(([t]) => t).join('+'), ev: st.results.filter(x => x.y === st.year - 1).length });
  }
  return { marks, rows, logs, tally: st.tally, titles: st.titles.map(t => `${t.y} ${t.name}`).slice(-20), size: JSON.stringify(st).length };
}
