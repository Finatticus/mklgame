// 生涯首頁：這一週的狀態與安排、主線事件、隨機事件、快轉到下一場比賽
import { register, go, story, storyResult, dialog, toast, bar, header, refresh, ui } from './shell.js';
import { cur, localSave, sync } from '../state.js';
import { esc, money, toPar, weekLabel, isHoliday, examWeek, MONTH_OF_WEEK, clamp, seeded } from '../util.js';
import { endWeek, weekEvents, upcoming, actionsFor, slotsOf, ACTIONS, CHAPTER_ZH, addTimeline, addNews, addPhoto, queueMain, spend, earn, giveItem, LENGTH, turnProCore, lengthXp } from '../life.js';
import { MAIN } from '../data/story.js';
import { text, applyFx, checkMain, rollRandom, resolveRandom, personality, menuFor } from '../story.js';
import { TRAIN, STYLES, playerRating, train } from '../growth.js';
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
  const plan = same ? st.plan.week.list : defaultPlan(st);
  st.plan.week = { key: st.year * 100 + st.week, list: plan, used };
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
      <div class="cm-row wrap" style="margin-top:10px;font-size:12px;color:var(--mut)"><span>實力 <b class="num" style="font-size:15px;color:var(--ink)">${playerRating(st).toFixed(1)}</b></span><span>技能點 <b class="num" style="font-size:15px;color:var(--ink)">${p.skillPts}</b></span>${st.school && st.status.amateur ? `<span>學業 <b class="num" style="font-size:15px;color:var(--ink)">${Math.round(st.school.grade)}</b></span>` : ''}<span>追蹤 <b class="num" style="font-size:15px;color:var(--ink)">${p.followers.toLocaleString()}</b></span></div>
    </div>
    ${!ev ? `<div class="cm-card"><h3>這一週的安排<small>${nSlots} 個行動</small></h3><div id="hm-plan"></div>
      <div class="cm-row" style="margin-top:12px"><button class="cm-btn green" id="hm-go" style="flex:1">開始這一週</button><button class="cm-btn ghost" id="hm-ff">快轉 ›</button></div>
      <p class="cm-note" style="margin-top:8px">快轉：照這一週的安排一直過，直到下一場比賽、主線事件或隨機事件（最多 8 週）。</p></div>` : ''}
    <div class="cm-card"><h3>接下來的比賽<small><a href="#" id="hm-cal">完整賽程 ›</a></small></h3><div class="cm-list">${next.length ? next.map(e => `<div class="cm-li"><div class="main"><b>${esc(e.name)}</b><span>${MONTH_OF_WEEK(e.w)} 月 · 第 ${e.w} 週 · ${esc(cinfo(e.course)?.name || '')}</span></div><div class="side">${isEntered(st, e) ? '<span class="cm-pill green">已報名</span>' : e.el.ok ? '<span class="cm-pill">可報名</span>' : '<span class="cm-pill red">沒有資格</span>'}</div></div>`).join('') : '<div class="cm-empty">近期沒有比賽</div>'}</div></div>
    <div class="cm-card"><h3>新聞</h3>${st.news.slice(0, 6).map(n => `<div class="cm-news ${n.kind === 'major' ? 'major' : ''}"><small>${n.y}·W${n.w}</small>${esc(n.text)}</div>`).join('') || '<div class="cm-empty">還沒有新聞</div>'}</div>`;
  if (res) document.getElementById('hm-resume').onclick = async () => { const { resumeRound } = await import('./eventview.js'); resumeRound(st, res); };
  if (ev) document.getElementById('hm-event').onclick = () => startEventWeek(st, ev);
  document.getElementById('hm-cal').onclick = e => { e.preventDefault(); go('calendar'); };
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
function defaultPlan(st) {
  const p = st.player, n = slotsOf(st), out = [];
  const kinds = ['iron', 'putt', 'long', 'short', 'putt', 'mind'];
  for (let i = 0; i < n; i++) {
    if (p.energy < 40 && i === 0) out.push({ k: 'rest' });
    else if (st.school && examWeek(st.week + 1) && st.status.amateur && i === n - 1) out.push({ k: 'study' });
    else out.push({ k: 'train', sub: kinds[(st.week + i) % kinds.length] });
  }
  return out;
}
function drawPlan(st, plan, n, acts) {
  const box = document.getElementById('hm-plan');
  const sel = (i) => {
    const a = plan[i] || { k: 'rest' };
    return `<div class="cm-li"><div class="main"><b>行動 ${i + 1}</b><span>${esc(ACTIONS[a.k].desc)}</span></div><div class="side"><select data-i="${i}" class="hm-a">${acts.map(x => `<option value="${x.k}" ${x.k === a.k ? 'selected' : ''}>${x.name}</option>`).join('')}</select>
      ${a.k === 'train' ? `<select data-i="${i}" class="hm-t">${Object.entries(TRAIN).map(([k, t]) => `<option value="${k}" ${k === a.sub ? 'selected' : ''}>${t.name}</option>`).join('')}</select><button class="cm-btn small ghost hm-drill" data-i="${i}">訓練關卡</button>` : ''}</div></div>`;
  };
  plan.length = Math.min(plan.length, n);
  while (plan.length < n) plan.push({ k: 'rest' });
  box.innerHTML = n ? `<div class="cm-list">${Array.from({ length: n }, (_, i) => sel(i)).join('')}</div>` : '<div class="cm-empty">這一週的行動都用完了</div>';
  box.querySelectorAll('.hm-a').forEach(s => s.onchange = () => { plan[Number(s.dataset.i)] = { k: s.value, sub: s.value === 'train' ? 'iron' : undefined }; drawPlan(st, plan, n, acts); });
  box.querySelectorAll('.hm-t').forEach(s => s.onchange = () => { plan[Number(s.dataset.i)].sub = s.value; });
  box.querySelectorAll('.hm-drill').forEach(b => b.onclick = async () => {
    const i = Number(b.dataset.i), kind = plan[i].sub || 'iron';
    const { trainingDrill } = await import('./player.js');
    const done = await trainingDrill(st, kind);
    // 打完訓練關卡 = 用掉這一個行動
    if (done) { st.plan.week.used = (st.plan.week.used || 0) + 1; plan.splice(i, 1); localSave(st); if (!plan.length) runWeeks(st, 1); else go('home'); }
    else go('home');
  });
}

// ---------- 過一週 / 快轉 ----------
export async function runWeeks(st, maxW) {
  ui.ctx.ui.loading(true, '這一週…');
  await new Promise(r => setTimeout(r, 30));
  let logs = [];
  try {
    for (let k = 0; k < maxW; k++) {
      const plan = (st.plan.week && st.plan.week.key === st.year * 100 + st.week) ? st.plan.week.list : defaultPlan(st);
      const log = endWeek(st, plan);
      logs = logs.concat(log.map(t => `${st.year}·W${st.week} ${t}`));
      // 技術派教練：重建揮桿半年後，穩定度回來
      if (st.story.flags.rebuild && st.year * 52 + st.week >= st.story.flags.rebuild) { st.player.stats.consistency += 6; st.story.flags.rebuild = 0; logs.push('重建揮桿完成：穩定度回來了，而且更穩'); }
      if (st.retired) legacyWeek(st, logs);
      if (st.week === 1 && !st.retired) hofCheck(st);
      checkMain(st);
      checkAch(st);
      const e = rollRandom(st);
      if (e) {
        ui.ctx.ui.loading(false);
        const i = await story({ small: `${st.year} · 第 ${st.week} 週`, title: '這一週發生的事', paras: [text(st, e.text)], choices: e.choices.map(c => [c[0]]), skip: false });
        const r = resolveRandom(st, e, Math.max(0, i));
        await storyResult(e.choices[Math.max(0, i)][0], r.text, r.log);
        break;
      }
      if (st.story.queue.length || thisWeekEvent(st) || st.player.injury > 0 && k > 0) break;
    }
  } finally { ui.ctx.ui.loading(false); }
  st.plan.week = null;
  localSave(st); sync();
  if (logs.length) toast(logs.slice(-4).map(esc).join('<br>'), 4200);
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
