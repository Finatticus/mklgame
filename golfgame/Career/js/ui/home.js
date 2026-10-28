// 生涯首頁：這一週的狀態與安排、主線事件、隨機事件、快轉到下一場比賽
import { register, go, story, storyResult, dialog, toast, bar, header, refresh, ui } from './shell.js';
import { cur, localSave, sync } from '../state.js';
import { esc, money, toPar, weekLabel, isHoliday, examWeek, MONTH_OF_WEEK, clamp, seeded } from '../util.js';
import { endWeek, weekEvents, upcoming, actionsFor, slotsOf, ACTIONS, CHAPTER_ZH, addTimeline, addNews, addPhoto, queueMain, spend, earn, giveItem, LENGTH, turnProCore, lengthXp, weekGoal, goalMet, lowCash, focusMul } from '../life.js';
import { MAIN } from '../data/story.js';
import { text, applyFx, checkMain, rollRandom, resolveRandom, personality, menuFor } from '../story.js';
import { TRAIN, STYLES, playerRating, train, xpForLevel, STAT_ZH, STAT_KEYS } from '../growth.js';
import { JUNIOR_COACHES, AGENTS, CADDIES, caddieById } from '../data/items.js';
import { TOUR_ZH, domesticName } from '../data/calendar.js';
import { checkAch } from '../achievements.js';
import { createEvent, cinfo } from '../event.js';
import { pendingResume } from './ingame.js';
import { legacyWeek, hofCheck } from '../legacy.js';

// ---------- 報名（自動與手動）----------
export function isEntered(st, ev) {
  if (st.entered[ev.key] === false) return false;
  if (st.entered[ev.key]) return ev.el.ok;
  if (!ev.el.ok) return false;
  const how = ev.el.how, s = st.status;
  if (st.player.injury > 0) return false;
  // 自動報名：巡迴卡的比賽、免資格的大賽、邀請、國內青少年排名賽、大學球隊的比賽、資格賽的下一關
  if (['card', 'exempt', 'invite', 'team'].includes(how)) {
    if (ev.tour === 'junior' && !ev.rank && !ev.national && !ev.team) return false;
    // 手上有好幾張巡迴卡時，只自動報主要巡迴（其他巡迴的比賽到賽程手動報名）
    if (how === 'card' && s.mainTour && ev.tour !== s.mainTour && !['major', 'team', 'olympic', 'ncaa', 'junior', 'am'].includes(ev.tour)) return false;
    // 經紀人避開太密的行程：連續打了 4 週，這週的一般比賽先休息（大賽、Signature、季後賽、團體賽照打）
    if (!s.amateur && !ev.major && !ev.sig && !ev.playoff && ev.tour !== 'team' && ev.tour !== 'olympic' && ev.id !== 'players' && streak(st) >= 4) return false;
    if (ev.tour === 'junior' && ev.open && st.player.age < 15) return false;
    if (s.mainTour && ['dp', 'asia', 'jp', 'tpga', 'pta', 'kft'].includes(ev.tour) && ev.tour !== s.mainTour && how !== 'card') return false;
    if (ev.tour === 'pga' && how === 'exempt' && !st.status.cards.pga && !ev.major && ev.id !== 'players') return false;
    return true;
  }
  if (ev.tour === 'qs' && how === 'fee' && ev.stage >= 1 && ev.stage <= 3 && !st.status.amateur) return true;      // 職業選手：過了上一關就自動報下一關
  return false;
}
// 連續打了幾週比賽（到上一週為止）
export function streak(st) {
  const played = new Set(st.results.map(r => r.y * 52 + r.w));
  let n = 0, k = st.year * 52 + st.week - 1;
  while (played.has(k)) { n++; k--; }
  return n;
}
export function thisWeekEvent(st) {
  const list = weekEvents(st).filter(e => isEntered(st, e));
  // 同一週報了好幾場：大賽 > 團體 > PGA > 其他
  const order = e => (e.major ? 0 : e.tour === 'team' || e.tour === 'olympic' ? 1 : e.tour === 'pga' ? 2 : e.tour === 'qs' ? 3 : 4);
  return list.sort((a, b) => order(a) - order(b))[0] || null;
}

// ---------- 主線事件的佇列 ----------
export async function runQueue(st) {
  while (st.story.queue.length) {
    const id = st.story.queue.shift();
    if (st.story.done[id]) continue;
    const m = MAIN[id];
    if (!m) continue;
    st.story.done[id] = st.year;
    const paras = m.text.map(t => text(st, t, { fed: domesticName(st.player.country).fed, tour: TOUR_ZH[st.status.firstCardTour] || '', prev: st.story.prevChamp || '上屆冠軍', years: st.year - st.player.birthYear - 8 }));
    if (m.choose) await choose(st, id, m, paras);
    else await story({ small: (CHAPTER_ZH[m.ch] || '').toUpperCase(), title: m.title, img: m.img, paras });
    if (m.fx) applyFx(st, m.fx);
    if (id === 'national') addTimeline(st, '入選國家代表隊');
    if (['national', 'first_card', 'pga_card', 'turn_pro', 'ch3_start', 'masters_am', 'rookie_year', 'invite'].includes(id)) addPhoto(st, m.title, m.img);
    if (id === 'first_card') addTimeline(st, `拿到 ${TOUR_ZH[st.status.firstCardTour] || ''} 卡`);
    checkAch(st);
    localSave(st);
  }
}
async function choose(st, id, m, paras) {
  const p = st.player;
  if (id === 'ch2_start' || id === 'coach') {
    const i = await story({ small: 'CHAPTER 2 · 13 歲', title: m.title, img: m.img, paras, choices: JUNIOR_COACHES.map(c => [`${c.type} · ${c.name}`, `「${c.quote}」 ${c.desc}`]), skip: false });
    const c = JUNIOR_COACHES[Math.max(0, i)];
    st.team.jcoach = { ...c, fee: 400 };
    if (c.id === 'tech') { p.stats.consistency -= 5; st.story.flags.rebuild = st.year * 52 + st.week + 26; }
    addTimeline(st, `拜師：${c.type} ${c.name}`);
    return;
  }
  if (id === 'style') {
    const keys = Object.keys(STYLES);
    const i = await story({ small: 'CHAPTER 2 · 17 歲', title: m.title, img: m.img, paras, choices: keys.map(k => [STYLES[k].name, STYLES[k].desc]), skip: false });
    p.style = keys[Math.max(0, i)];
    addTimeline(st, `球風：${STYLES[p.style].name}`);
    return;
  }
  if (id === 'crossroads') {
    const wjr = st.wjr || 999, g = st.school ? st.school.grade : 60;
    const ncaaOk = wjr <= 400 && g >= 45, full = wjr <= 250 && g >= 55;
    const i = await story({ small: 'CHAPTER 2 · 18 歲', title: m.title, img: m.img, paras: paras.concat([`你的世界青少年排名：${wjr < 900 ? wjr : '—'}　學業：${Math.round(g)}`]), choices: [
      ['穩健：國內大學（體育保送）', '比賽多在國內與亞洲，家人關係好、花費少；之後走亞巡路線為主'],
      ['推薦：美國 NCAA 一級大學', ncaaOk ? (full ? '全額運動獎學金！打 NCAA 聯賽，畢業前有機會透過 PGA TOUR University 拿到巡迴資格' : '部分獎學金（學費要自己負擔一部分）') : '需要世界青少年排名前 400 與學業 45 分以上', !ncaaOk],
      ['冒險：直接轉職業', '跳過大學。不能再打業餘賽（也就拿不到業餘冠軍的名人賽邀請），但提早進入職業世界']], skip: false });
    // 大學從隔年開始算一年級（年底升級時 0 → 1）
    if (i === 0) { st.status.stage = 'college'; st.status.college = { type: 'dom', name: '國立體育大學', year: 0 }; addTimeline(st, '進入國內大學（體育保送）'); }
    else if (i === 1) { st.status.stage = 'college'; st.status.college = { type: 'ncaa', name: ncaaName(st), year: 0 }; st.school.scholar = full; if (!full) st.story.flags.tuition = 1; addTimeline(st, `進入 ${st.status.college.name}（NCAA 一級）${full ? '，全額獎學金' : ''}`); }
    else { turnPro(st, '17 歲直接轉職業'); }
    p.age = st.year - p.birthYear;
    return;
  }
  if (id === 'agent') {
    const i = await story({ small: 'CHAPTER 4', title: m.title, img: m.img, paras, choices: AGENTS.map(a => [`${a.name}（${a.firm}）`, `擅長：${a.type}的贊助 · 抽成 ${Math.round(a.cut * 100)}%`]).concat([['先不要經紀人', '自己談合約：沒有抽成，但贊助比較少']]), skip: false });
    if (i >= 0 && i < AGENTS.length) { st.team.agent = { ...AGENTS[i] }; addTimeline(st, `簽下經紀人 ${AGENTS[i].name}`); }
    else st.team.agent = null, (st.story.flags.noAgent = 1);
    return;
  }
  if (id === 'base') {
    const i = await story({ small: 'CHAPTER 4', title: m.title, img: m.img, paras, choices: [[`留在${p.home || '家鄉'}`, '家人近（心情 +），但每次出國比賽都很累'], ['搬到美國佛州', '去美國比賽都近、佛州沒有州所得稅；離家遠，房租比較貴']], skip: false });
    st.base = i === 1 ? 'florida' : 'home';
    addTimeline(st, i === 1 ? '把基地搬到佛州' : `基地留在${p.home || '家鄉'}`);
    return;
  }
  if (id === 'first_caddie') {
    const list = CADDIES.filter(c => !c.need || (c.need.stage && st.status.college) || (c.need.rank && (st.rankNow || 9999) <= c.need.rank));
    const i = await story({ small: 'CHAPTER 4', title: m.title, img: m.img, paras, choices: list.map(c => [`${c.name}（${c.bg}）`, `${c.abilityText} · ${c.fee ? money(c.fee) + ' / 週' : '免費'}`]), skip: false });
    hireCaddie(st, list[Math.max(0, i)]);
    return;
  }
  if (id === 'defend') {
    const opts = menuFor(p.country);
    await story({ small: 'CHAMPIONS DINNER', title: m.title, img: m.img, paras: paras.concat([`你端出的菜單：${opts.join('、')}。`, '歷屆冠軍們吃得很開心，有人問你能不能再來一碗。']) });
    addTimeline(st, `主辦名人賽冠軍晚宴（${opts.join('、')}）`);
    return;
  }
  if (id === 'hof') { const { hofCeremony } = await import('../legacy.js'); return hofCeremony(st, m, paras); }
  if (id === 'retire') { const { secondLife } = await import('../legacy.js'); return secondLife(st, m, paras); }
  await story({ title: m.title, img: m.img, paras });
}
const ncaaName = st => ['Stanford', 'Oklahoma State', 'Texas', 'Arizona State', 'Vanderbilt', 'Florida State', 'Auburn', 'Georgia Tech', 'North Carolina', 'Illinois'][Math.min(9, Math.max(0, Math.floor((st.wjr || 200) / 25)))] + ' University';
export function hireCaddie(st, c) {
  if (!c) return;
  st.team.caddie = { id: c.id, name: c.name, fee: c.fee, bonus: c.bonus, chem: st.team.caddie && st.team.caddie.id === c.id ? st.team.caddie.chem : 1, weeks: 0 };
  addTimeline(st, `桿弟：${c.name}`);
}
export const turnPro = (st, why) => turnProCore(st, why);

// ---------- 首頁 ----------
register('home', async body => {
  const st = cur();
  if (!st) return go('slots');
  // 先跑完主線事件
  checkMain(st);
  if (st.story.queue.length) { await runQueue(st); header(); }
  if (st.ev && !st.ev.done) return go('event');
  if (st.status.stage === 'child') { const { resumeChildhood } = await import('../childhood.js'); return resumeChildhood(st); }
  if (st.retired && !st.legacyOf) { const { legacyHome } = await import('../legacy.js'); return legacyHome(body, st); }
  if (st.opt.realBonus) checkRealBonus(st);
  const p = st.player, ev = thisWeekEvent(st);
  const same = st.plan.week && st.plan.week.key === st.year * 100 + st.week;
  const used = same ? st.plan.week.used || 0 : 0;
  const notes = same ? st.plan.week.notes || [] : [];
  const plan = same ? st.plan.week.list : defaultPlan(st, notes);
  st.plan.week = { key: st.year * 100 + st.week, list: plan, used, notes };
  const nSlots = Math.max(0, slotsOf(st) - used), hol = isHoliday(st.week, st.status.stage === 'college');
  const acts = actionsFor(st);
  const res = pendingResume(st);
  const next = upcoming(st, 6).filter(e => e.key !== (ev && ev.key)).slice(0, 4);
  body.innerHTML = `
    ${res ? `<div class="cm-card" style="border-color:var(--champ)"><h3>上次沒打完的一輪</h3><p>${esc(res.m.label || '')}</p><button class="cm-btn green" id="hm-resume">接著打</button></div>` : ''}
    <div class="cm-hero"><small>${weekLabel(st.year, st.week)}${hol ? ' · 假期' : ''}${examWeek(st.week) && st.school ? ' · 考試週' : ''}</small><h2>${esc(CHAPTER_ZH[st.chapter] || '')}</h2>
      <div class="meta">${p.age} 歲 · ${esc(stageText(st))} · 個性：${personality(p)}</div>
      ${ev ? `<div class="ev"><span>這一週的比賽 · ${esc(TOUR_ZH[ev.tour] || '')}</span><b>${esc(ev.name)}</b><span>${esc(cinfo(ev.course)?.name || '')}${ev.purse && !st.status.amateur ? ' · 總獎金 ' + money(ev.purse, { short: true }) : ''}${ev.el.how === 'mq' ? ' · 要先打週一資格賽' : ''}</span>
        <div style="margin-top:8px"><button class="cm-btn" id="hm-event">進入比賽週</button></div></div>` : ''}
      ${p.injury > 0 ? `<div class="ev"><b>受傷休養中</b><span>還要休息 ${p.injury} 週</span></div>` : ''}
    </div>
    <div class="cm-card"><div class="cm-stat3">
      <div><span>體能 ${Math.round(p.energy)}</span>${bar(p.energy)}</div><div><span>心情 ${Math.round(p.mood)}</span>${bar(p.mood)}</div>
      <div><span>手感 ${p.form > 0 ? '+' : ''}${p.form.toFixed(1)}</span>${bar(p.form + 3, 6)}</div></div>
      <div class="cm-row wrap" style="margin-top:10px;font-size:12px;color:var(--mut)"><span>實力 <b class="num" style="font-size:15px;color:var(--ink)">${playerRating(st).toFixed(1)}</b></span><span>Lv.${p.level} <b class="num" style="font-size:15px;color:var(--ink)">${p.xp}</b> / ${xpForLevel(p.level)}</span><span>技能點 <b class="num" style="font-size:15px;color:var(--ink)">${p.skillPts}</b></span>${st.school && st.status.amateur ? `<span>學業 <b class="num" style="font-size:15px;color:var(--ink)">${Math.round(st.school.grade)}</b> <a href="#" id="hm-school">說明</a></span>` : ''}<span>追蹤 <b class="num" style="font-size:15px;color:var(--ink)">${p.followers.toLocaleString()}</b></span></div>
      ${st.focus && st.focus.n > 1 ? `<p class="cm-note" style="margin-top:6px">專注：連續 ${st.focus.n} 週主練「${TRAIN[st.focus.kind].name}」，這一項訓練經驗 +${Math.round((focusMul(st, st.focus.kind) - 1) * 100)}%</p>` : ''}
    </div>
    ${!ev ? `<div class="cm-card"><h3>這一週的安排<small>${nSlots} 個行動</small></h3>
      ${nSlots ? `<div class="cm-goal" id="hm-goal"></div>` : ''}
      ${notes.length ? `<p class="cm-note" style="margin-bottom:8px;color:var(--champ-d,#8a6d1f)">${notes.map(esc).join('<br>')}</p>` : ''}
      <div id="hm-plan"></div>
      <div class="cm-row" style="margin-top:12px"><button class="cm-btn green" id="hm-go" style="flex:1">開始這一週</button><button class="cm-btn ghost" id="hm-ff">快轉 ›</button></div>
      <p class="cm-note" style="margin-top:8px">快轉：之後每一週都照這一週的安排過（體能太低會自動排休息、存款不夠會自動排打工、考試前會排念書），直到下一場比賽、主線事件或隨機事件（最多 8 週）。結束後會列出這段時間做了什麼、加了哪些能力與錢。</p></div>` : ''}
    <div class="cm-card"><h3>接下來的比賽<small><a href="#" id="hm-cal">完整賽程 ›</a></small></h3><div class="cm-list">${next.length ? next.map(e => `<div class="cm-li"><div class="main"><b>${esc(e.name)}</b><span>${MONTH_OF_WEEK(e.w)} 月 · 第 ${e.w} 週 · ${esc(cinfo(e.course)?.name || '')}</span></div><div class="side">${isEntered(st, e) ? '<span class="cm-pill green">已報名</span>' : e.el.ok ? '<span class="cm-pill">可報名</span>' : '<span class="cm-pill red">沒有資格</span>'}</div></div>`).join('') : '<div class="cm-empty">近期沒有比賽</div>'}</div></div>
    <div class="cm-card"><h3>新聞</h3>${st.news.slice(0, 6).map(n => `<div class="cm-news ${n.kind === 'major' ? 'major' : ''}"><small>${n.y}·W${n.w}</small>${esc(n.text)}</div>`).join('') || '<div class="cm-empty">還沒有新聞</div>'}</div>`;
  if (res) document.getElementById('hm-resume').onclick = async () => { const { resumeRound } = await import('./eventview.js'); resumeRound(st, res); };
  if (ev) document.getElementById('hm-event').onclick = () => startEventWeek(st, ev);
  document.getElementById('hm-cal').onclick = e => { e.preventDefault(); go('calendar'); };
  const sb = document.getElementById('hm-school');
  if (sb) sb.onclick = e => { e.preventDefault(); schoolInfo(st); };
  if (!ev) {
    drawPlan(st, plan, nSlots, acts);
    document.getElementById('hm-go').onclick = () => runWeeks(st, 1);
    document.getElementById('hm-ff').onclick = () => runWeeks(st, 8);
  }
});
function stageText(st) {
  const s = st.status;
  if (s.stage === 'junior') { const a = st.player.age; return a <= 15 ? `國${'一二三'[a - 13] || ''}學生` : `高${'一二三'[a - 16] || '三'}學生`; }
  if (s.stage === 'college') return s.college.year < 1 ? `${s.college.name}（即將入學）` : `${s.college.name} ${['一', '二', '三', '四'][Math.min(3, s.college.year - 1)]}年級`;
  if (s.stage === 'road') return `職業選手 · ${TOUR_ZH[s.mainTour] || '沒有巡迴卡'}`;
  if (s.stage === 'tour') return 'PGA TOUR 會員';
  if (s.stage === 'retired') return '退休';
  return '';
}
// 這一週預設的安排：沿用上一次的安排（快轉也照這個），再依狀況自動調整；notes 收集自動調整的原因（顯示在畫面上）
function defaultPlan(st, notes = []) {
  const p = st.player, n = slotsOf(st), ok = new Set(actionsFor(st).map(a => a.k));
  const kinds = ['iron', 'putt', 'long', 'short', 'putt', 'mind'];
  const tpl = (st.plan.template || []).filter(a => ok.has(a.k) && !ACTIONS[a.k].full);
  const out = [];
  for (let i = 0; i < n; i++) out.push(tpl[i] ? { ...tpl[i] } : { k: 'train', sub: kinds[(st.week + i) % kinds.length] });
  const student = st.school && st.status.amateur && (st.status.stage === 'junior' || st.status.stage === 'college');
  const swap = (k, why, avoid) => {
    if (out.some(a => a.k === k)) return;
    let i = -1;
    for (let j = out.length - 1; j >= 0; j--) if (!avoid.includes(out[j].k)) { i = j; break; }
    if (i < 0) return;
    out[i] = { k, auto: true, was: out[i] }; notes.push(why);
  };
  if (p.energy < 35) swap('rest', `體能只剩 ${Math.round(p.energy)}：自動排了「休息」`, ['rest', 'work', 'study', 'tutor']);
  if (student && (examWeek(st.week) || examWeek(st.week + 1))) swap('study', '考試週快到了：自動排了「念書」', ['rest', 'work', 'study', 'tutor']);
  if (lowCash(st) && ok.has('work')) swap('work', `存款只剩 ${money(st.money.cash)}：自動排了「打工」`, ['rest', 'work', 'study', 'tutor']);
  return out;
}
function schoolInfo(st) {
  const g = Math.round(st.school.grade), college = st.status.stage === 'college';
  dialog(`<p style="font-size:14px">學業 <b class="num" style="font-size:20px">${g}</b> / 100</p>
    <div class="cm-list" style="margin-top:8px">
      <div class="cm-li"><div class="main"><b>會怎麼變</b><span>每週沒有念書、補習${college ? '' : '、校隊練習'}的話學業 −0.8。念書 +6、補習 +10（學費 $60）${college ? '' : '、校隊練習 +1'}。部分隨機事件也會加減學業。</span></div></div>
      <div class="cm-li"><div class="main"><b>考試週（第 2、12、24、44 週）</b><span>學業低於 40：家人限制下一週的練球（訓練經驗 −50%）、心情 −8。${college ? '' : '學業 80 以上：家人給獎勵金、心情 +6。'}考試週的前一週，預設安排會自動排「念書」。</span></div></div>
      <div class="cm-li"><div class="main"><b>18 歲的十字路口</b><span>美國 NCAA 一級大學需要學業 45 以上（加上世界青少年排名前 400）；全額運動獎學金需要學業 55 以上（排名前 250）。學業太低只能選國內大學或直接轉職業。</span></div></div>
      <div class="cm-li"><div class="main"><b>其他</b><span>學業太低時，部分隨機事件（老師、家長的事件）的選項會變少；轉職業之後就不用再顧學業。</span></div></div>
    </div>`, { title: '學業' });
}
// 一段時間的前後比較（週報、快轉總結）
function snap(st) {
  const p = st.player;
  return { stats: { ...p.stats }, lv: p.level, xp: p.xp, pts: p.skillPts, cash: st.money.cash, energy: p.energy, mood: p.mood, grade: st.school ? st.school.grade : null, fol: p.followers, fam: st.rel.family, led: st.money.ledger[0], y: st.year, w: st.week };
}
function reportHtml(st, a, logs) {
  const b = snap(st), p = st.player;
  const weeks = (b.y - a.y) * 52 + (b.w - a.w);
  // 經驗：跨過的等級加起來
  let xp = b.xp - a.xp;
  for (let l = a.lv; l < b.lv; l++) xp += xpForLevel(l);
  const gains = STAT_KEYS.map(k => [k, Math.round((b.stats[k] - a.stats[k]) * 10) / 10]).filter(([, d]) => Math.abs(d) >= 0.1);
  // 錢：這段時間新增的帳目
  const led = [];
  for (const x of st.money.ledger) { if (x === a.led) break; led.push(x); }
  const inc = {}, out = {};
  for (const x of led) { const k = x.what.replace(/（.*$/, ''); if (x.amt >= 0) inc[k] = (inc[k] || 0) + x.amt; else out[k] = (out[k] || 0) + x.amt; }
  const line = (o) => Object.entries(o).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])).map(([k, v]) => `<div class="cm-kv"><span>${esc(k)}</span><b class="${v < 0 ? 'neg' : 'pos'}">${v < 0 ? '−' : '+'}${money(Math.abs(v))}</b></div>`).join('');
  const d = (x, y) => { const v = Math.round(y - x); return `<b class="${v < 0 ? 'neg' : v > 0 ? 'pos' : ''}">${v > 0 ? '+' : ''}${v}</b>`; };
  return `<div class="cm-report">
    <h4>素質</h4>${gains.length ? `<div class="cm-chips">${gains.map(([k, v]) => `<span class="${v < 0 ? 'neg' : ''}">${STAT_ZH[k]} ${v > 0 ? '+' : ''}${v}</span>`).join('')}</div>` : '<p class="cm-note">這段時間沒有素質升級（訓練經驗有累積，看下面的進度）</p>'}
    <h4>經驗與等級</h4><div class="cm-kv"><span>經驗</span><b class="pos">+${xp}</b></div>${b.lv > a.lv ? `<div class="cm-kv"><span>升級</span><b class="pos">Lv.${a.lv} → Lv.${b.lv}</b></div>` : ''}<div class="cm-kv"><span>技能點</span><b>${a.pts} → ${b.pts}</b></div>
    <h4>資金</h4>${line(inc)}${line(out)}<div class="cm-kv total"><span>合計</span><b class="${b.cash - a.cash < 0 ? 'neg' : 'pos'}">${b.cash - a.cash < 0 ? '−' : '+'}${money(Math.abs(b.cash - a.cash))}</b></div><div class="cm-kv"><span>現在的資金</span><b>${money(b.cash)}</b></div>
    <h4>狀態</h4><div class="cm-kv"><span>體能</span><span>${Math.round(a.energy)} → ${Math.round(b.energy)}（${d(a.energy, b.energy)}）</span></div><div class="cm-kv"><span>心情</span><span>${Math.round(a.mood)} → ${Math.round(b.mood)}（${d(a.mood, b.mood)}）</span></div>
    ${a.grade != null && b.grade != null ? `<div class="cm-kv"><span>學業</span><span>${Math.round(a.grade)} → ${Math.round(b.grade)}（${d(a.grade, b.grade)}）</span></div>` : ''}<div class="cm-kv"><span>家人關係</span><span>${Math.round(a.fam)} → ${Math.round(b.fam)}</span></div>${b.fol !== a.fol ? `<div class="cm-kv"><span>追蹤</span><span>+${(b.fol - a.fol).toLocaleString()}</span></div>` : ''}
    <h4>每週明細</h4><div class="cm-log">${logs.map(l => `<div class="${l.wk ? 'wk' : ''}">${esc(l.t)}</div>`).join('')}</div>
  </div>`;
}
const openInfo = new Set();      // 哪幾個行動的說明是展開的
function drawPlan(st, plan, n, acts) {
  const box = document.getElementById('hm-plan');
  const sel = (i) => {
    const a = plan[i] || { k: 'rest' }, desc = ACTIONS[a.k].desc, tr = a.k === 'train' && TRAIN[a.sub || 'iron'];
    // 只顯示一行重點，按「更多資訊」才展開全部說明（練球的進度也收在裡面）
    const short = tr ? tr.desc : desc.split(/[；。（]/)[0];
    const full = desc + (tr ? '\n' + trainHint(st, a.sub || 'iron') : '');
    const more = full !== short ? `<button class="cm-more" data-more="${i}">${openInfo.has(i) ? '收起' : '更多資訊'}</button>` : '';
    return `<div class="cm-li"><div class="main"><b>行動 ${i + 1}</b><span>${esc(short)} ${more}</span>${openInfo.has(i) ? `<span class="cm-note" style="display:block;margin-top:4px;white-space:pre-line">${esc(full)}</span>` : ''}</div><div class="side"><select data-i="${i}" class="hm-a">${acts.map(x => `<option value="${x.k}" ${x.k === a.k ? 'selected' : ''}>${x.name}</option>`).join('')}</select>
      ${a.k === 'train' ? `<select data-i="${i}" class="hm-t">${Object.entries(TRAIN).map(([k, t]) => `<option value="${k}" ${k === a.sub ? 'selected' : ''}>${t.name}</option>`).join('')}</select><button class="cm-btn small ghost hm-drill" data-i="${i}">訓練關卡</button>` : ''}</div></div>`;
  };
  plan.length = Math.min(plan.length, n);
  while (plan.length < n) plan.push({ k: 'rest' });
  box.innerHTML = n ? `<div class="cm-list">${Array.from({ length: n }, (_, i) => sel(i)).join('')}</div>` : '<div class="cm-empty">這一週的行動都用完了</div>';
  drawGoal(st, plan);
  box.querySelectorAll('.hm-a').forEach(s => s.onchange = () => { plan[Number(s.dataset.i)] = { k: s.value, sub: s.value === 'train' ? 'iron' : undefined }; drawPlan(st, plan, n, acts); localSave(st); });
  box.querySelectorAll('.hm-t').forEach(s => s.onchange = () => { plan[Number(s.dataset.i)].sub = s.value; drawPlan(st, plan, n, acts); localSave(st); });
  box.querySelectorAll('[data-more]').forEach(b => b.onclick = () => { const i = Number(b.dataset.more); if (openInfo.has(i)) openInfo.delete(i); else openInfo.add(i); drawPlan(st, plan, n, acts); });
  box.querySelectorAll('.hm-drill').forEach(b => b.onclick = async () => {
    const i = Number(b.dataset.i), kind = plan[i].sub || 'iron';
    const { trainingDrill } = await import('./player.js');
    const done = await trainingDrill(st, kind);
    // 打完訓練關卡 = 用掉這一個行動
    if (done) { st.plan.week.used = (st.plan.week.used || 0) + 1; plan.splice(i, 1); localSave(st); if (!plan.length) runWeeks(st, 1); else go('home'); }
    else go('home');
  });
}

// 本週目標：符合就打勾
function drawGoal(st, plan) {
  const el = document.getElementById('hm-goal'); if (!el) return;
  const g = weekGoal(st), ok = goalMet(st, g, plan);
  el.className = 'cm-goal' + (ok ? ' ok' : '');
  el.innerHTML = `<b>本週目標</b>${esc(g.text)}<span>${ok ? '安排符合，完成後：' : '獎勵：'}${esc(g.reward)}</span>`;
}
// 一項訓練的預估：訓練經驗、每一項素質的進度
function trainHint(st, kind) {
  const p = st.player, t = TRAIN[kind];
  const prog = t.stats.map(k => `${STAT_ZH[k]} ${Math.round(p.trainXp[k] || 0)}/${Math.round(100 * (1 + Math.max(0, p.stats[k] - 30) / 30))}`).join('、');
  return `${t.desc}｜進度 ${prog}`;
}

// ---------- 過一週 / 快轉 ----------
export async function runWeeks(st, maxW) {
  ui.ctx.ui.loading(true, '這一週…');
  await new Promise(r => setTimeout(r, 30));
  const logs = [], before = snap(st);
  // 這一週的安排存成範本：之後的週（快轉、下一次打開首頁）都沿用
  //   自動排進去的（休息、念書、打工）不算進範本，下一週重新判斷
  if (st.plan.week && st.plan.week.key === st.year * 100 + st.week && st.plan.week.list.length) st.plan.template = st.plan.week.list.map(a => (a.auto && a.was ? a.was : a)).map(a => ({ k: a.k, sub: a.sub }));
  try {
    for (let k = 0; k < maxW; k++) {
      const notes = [];
      const plan = (st.plan.week && st.plan.week.key === st.year * 100 + st.week) ? st.plan.week.list : defaultPlan(st, notes);
      const wk = `${st.year} 年第 ${st.week} 週`;
      const log = endWeek(st, plan);
      logs.push({ t: wk, wk: true }, ...notes.map(t => ({ t })), ...log.map(t => ({ t })));
      const extra = [];
      // 技術派教練：重建揮桿半年後，穩定度回來
      if (st.story.flags.rebuild && st.year * 52 + st.week >= st.story.flags.rebuild) { st.player.stats.consistency += 6; st.story.flags.rebuild = 0; extra.push('重建揮桿完成：穩定度回來了，而且更穩'); }
      if (st.retired) legacyWeek(st, extra);
      logs.push(...extra.map(t => ({ t })));
      if (st.week === 1 && !st.retired) hofCheck(st);
      checkMain(st);
      checkAch(st);
      const e = rollRandom(st);
      if (e) {
        ui.ctx.ui.loading(false);
        const i = await story({ small: `${st.year} · 第 ${st.week} 週`, title: '這一週發生的事', paras: [text(st, e.text)], choices: e.choices.map(c => [c[0]]), skip: false });
        const r = resolveRandom(st, e, Math.max(0, i));
        await storyResult(e.choices[Math.max(0, i)][0], r.text, r.log);
        logs.push({ t: `事件：${e.choices[Math.max(0, i)][0]}` }, ...(r.log || []).map(t => ({ t })));
        break;
      }
      if (st.story.queue.length || thisWeekEvent(st) || st.player.injury > 0 && k > 0) break;
    }
  } finally { ui.ctx.ui.loading(false); }
  st.plan.week = null;
  localSave(st); sync();
  const n = (st.year - before.y) * 52 + (st.week - before.w);
  if (n > 0) await dialog(reportHtml(st, before, logs), { title: n === 1 ? `${before.y} 年第 ${before.w} 週的結果` : `快轉 ${n} 週的總結（${before.y} 年第 ${before.w} 週 → ${st.year} 年第 ${st.week} 週）`, wide: true, buttons: [['繼續', 'green']] });
  go('home');
}

// 現實練球也算數：這個現實的星期在「實際下場」記了一場，生涯多一次免費訓練（每現實週一次）
async function checkRealBonus(st) {
  const { weekKey } = await import('./more.js');
  const wk = weekKey();
  if (st.realClaim === wk) return;
  try {
    const list = await ui.ctx.call('realList');
    if (!(list || []).some(r => r.date && weekKey(new Date(r.date)) === wk) || st.realClaim === wk) return;
    st.realClaim = wk;
    const kinds = ['iron', 'putt', 'short', 'long'], kind = kinds[Number(wk.slice(-2)) % kinds.length];
    const g = train(st.player, kind, 60 * lengthXp(st));
    localSave(st);
    toast(`現實練球也算數：這週記了一場實際下場，生涯多一次免費訓練（${TRAIN[kind].name}${g.length ? '，' + g.length + ' 項素質 +1' : ''}）`, 4200);
  } catch (e) { /* 離線：下次再檢查 */ }
}

// 進入比賽週
export function startEventWeek(st, ev) {
  st.ev = createEvent(st, ev, st.world, ev.el.how);
  localSave(st);
  go('event');
}
