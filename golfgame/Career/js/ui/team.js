// 團隊（教練、桿弟、經紀人、專業團隊、人際）與財務（收支、贊助合約、資產、旅行方式）
import { register, go, toast, dialog, confirm2, bar } from './shell.js';
import { cur, localSave } from '../state.js';
import { esc, money, clamp, seeded } from '../util.js';
import { fanLevel, FAN_LEVELS } from '../data/items.js';
import { CADDIES, caddieById, COACH_KIND, COACH_TIER, AGENTS, STAFF, STAFF_ELITE, SPONSOR_KINDS, SPONSOR_NAMES, ASSETS, ASSET_GRP, ROOM_LEVELS, FLIGHT, LODGE, HOMES, INVEST, COURSE_UP, HOST } from '../data/items.js';
import { homeCourses } from '../data/calendar.js';
import { cinfo } from '../event.js';
import { dreamId } from '../../../js/courses-creative.js';
import { GROUPS } from '../growth.js';
import { spend, earn, addTimeline, FAMILY, staffFee, isElite, courseIncome, investTotal, livingCost, baseRegion } from '../life.js';
import { hireCaddie } from './home.js';
import { findP, nameOf, styleOf, STYLE_ZH, STYLE_DESC, ME } from '../world.js';
import { MENTOR_NAME, FAMILY_WHO, mediaImage } from '../story.js';

register('team', body => {
  const st = cur(); if (!st) return go('slots');
  const t = st.team, pro = !st.status.amateur, rank = st.rankNow || 9999;
  const cad = t.caddie, coach = t.coach;
  const rv = findP(st.world, st.story.rival || st.story.friend), h2h = (st.story.h2h || {})[st.story.rival || st.story.friend] || { w: 0, l: 0 };
  body.innerHTML = `
    <div class="cm-card"><h3>教練</h3>
      ${t.jcoach ? `<div class="cm-li"><div class="main"><b>${esc(t.jcoach.type)} · ${esc(t.jcoach.name)}</b><span>${esc(t.jcoach.desc)}</span></div></div>` : ''}
      ${coach ? `<div class="cm-li"><div class="main"><b>${esc(coach.name)}</b><span>${COACH_KIND[coach.kind].name} · ${COACH_TIER[coach.tier].name} · 訓練 +${Math.round(coach.mul * 100)}% · ${money(coach.fee)} / 週</span></div><div class="side"><button class="cm-btn small ghost" id="tm-fire-c">解約</button></div></div>` : ''}
      ${st.player.age >= 18 ? `<p class="cm-note" style="margin:6px 0">揮桿、短桿、推桿、心理四種專長，各有三個等級。名師需要排名或人氣才願意收你。</p><div class="cm-list">${Object.entries(COACH_KIND).flatMap(([k, ck]) => Object.entries(COACH_TIER).map(([tk, tt]) => {
        const ok = !tt.need || rank <= tt.need.rank || st.player.fame >= tt.need.fame;
        return `<div class="cm-li ${ok ? '' : 'dim'}"><div class="main"><b>${tt.name}${ck.name}</b><span>訓練 +${Math.round(tt.mul * 100)}% · ${money(tt.fee)} / 週${ok ? '' : ` · 需要世界前 ${tt.need.rank} 或人氣 ${tt.need.fame.toLocaleString()}`}</span></div><div class="side">${ok ? `<button class="cm-btn small green" data-coach="${k}:${tk}">聘請</button>` : ''}</div></div>`;
      })).join('')}</div>` : '<p class="cm-note">18 歲以後可以聘請專任教練。</p>'}
    </div>
    <div class="cm-card"><h3>桿弟</h3>
      ${cad ? `<div class="cm-li"><div class="main"><b>${esc(cad.name)}</b><span>默契 ${'●'.repeat(cad.chem || 1)}${'○'.repeat(5 - (cad.chem || 1))} · ${esc(caddieById(cad.id)?.abilityText || '')}${(cad.chem || 1) >= 3 ? ' · ' + esc(caddieById(cad.id)?.chem3Text || '') : ''}</span></div><div class="side">${pro ? `<button class="cm-btn small ghost" id="tm-fire-cd">換人</button>` : ''}</div></div>` : '<p class="cm-note">還沒有全職桿弟。</p>'}
      ${pro ? `<p class="cm-note" style="margin:6px 0">桿弟主要提供「情報」，數值加成很小（+1~+3）。週薪 + 獎金分紅（一般名次約 5~7%、冠軍約 10%）。默契每一起比賽 6 場升一級，3 級解鎖特殊能力。</p><div class="cm-list">${CADDIES.filter(c => !cad || c.id !== cad.id).map(c => {
        const ok = !c.need || (c.need.rank && rank <= c.need.rank) || (c.need.stage && st.status.college);
        return `<div class="cm-li ${ok ? '' : 'dim'}"><div class="main"><b>${c.name}</b><span>${c.bg} · ${c.abilityText} · ${c.fee ? money(c.fee) + ' / 週' : '免費'}${ok ? '' : ' · 需要世界前 ' + (c.need.rank || '')}</span></div><div class="side">${ok ? `<button class="cm-btn small green" data-cad="${c.id}">簽下</button>` : ''}</div></div>`;
      }).join('')}</div>` : ''}
    </div>
    ${pro ? `<div class="cm-card"><h3>經紀人</h3>${t.agent ? `<div class="cm-li"><div class="main"><b>${esc(t.agent.name)}（${esc(t.agent.firm)}）</b><span>擅長：${esc(t.agent.type)} · 抽贊助收入 ${Math.round(t.agent.cut * 100)}%</span></div></div>` : '<p class="cm-note">沒有經紀人：贊助比較少、沒有抽成。</p>'}
      <div class="cm-list">${AGENTS.filter(a => !t.agent || a.id !== t.agent.id).map(a => `<div class="cm-li"><div class="main"><b>${a.name}（${a.firm}）</b><span>${a.type} · 抽成 ${Math.round(a.cut * 100)}%</span></div><div class="side"><button class="cm-btn small ghost" data-agent="${a.id}">換成他</button></div></div>`).join('')}</div></div>
    <div class="cm-card"><h3>專業團隊</h3><p class="cm-note" style="margin-bottom:6px">頂級團隊：週薪 ×${STAFF_ELITE.fee}、效果更強；需要世界前 ${STAFF_ELITE.need.rank} 或人氣 ${STAFF_ELITE.need.fame.toLocaleString()}。</p><div class="cm-list">${Object.entries(STAFF).map(([k, s]) => {
      const on = t.staff.includes(k), el = isElite(st, k), canElite = rank <= STAFF_ELITE.need.rank || st.player.fame >= STAFF_ELITE.need.fame;
      return `<div class="cm-li"><div class="main"><b>${el ? '頂級' : ''}${s.name}${on ? ' <span class="cm-pill green">合作中</span>' : ''}</b><span>${el ? STAFF_ELITE.desc[k] : s.desc} · ${money(staffFee(st, k))} / 週</span>${on && !el ? `<span>升級頂級：${STAFF_ELITE.desc[k]}（${money(s.fee * STAFF_ELITE.fee)} / 週）</span>` : ''}</div>
        <div class="side"><button class="cm-btn small ${on ? 'ghost' : 'green'}" data-staff="${k}">${on ? '解約' : '聘請'}</button>${on && !el && canElite ? `<br><button class="cm-btn small green" data-elite="${k}" style="margin-top:4px">升級頂級</button>` : ''}</div></div>`;
    }).join('')}</div></div>` : ''}
    <div class="cm-card"><h3>人際關係</h3>${[['family', `家人（${FAMILY_WHO[st.player.origin] || '家人'}）`], ['mentor', `啟蒙導師（${MENTOR_NAME[st.player.origin] || ''}）`], ['friend', '童年玩伴'], ['rival', '宿敵'], ['coach', '教練'], ['caddie', '桿弟'], ['agent', '經紀人'], ['team', '隊友'], ['sponsor', '贊助商']].map(([k, n]) => `<div class="cm-statrow" style="grid-template-columns:120px 1fr 40px"><span>${n}</span>${bar(st.rel[k] ?? 50)}<span class="v">${Math.round(st.rel[k] ?? 50)}</span></div>`).join('')}
      ${rv ? `<p class="cm-note" style="margin-top:8px">目前的宿敵：<b>${esc(nameOf(rv))}</b>（${STYLE_ZH[styleOf(rv.id)]}：${STYLE_DESC[styleOf(rv.id)]}）　對戰紀錄 ${h2h.w} 勝 ${h2h.l} 敗</p>` : ''}</div>
    ${fanHtml(st)}${oppHtml(st, rv)}${mediaHtml(st)}${kidsHtml(st)}`;
  const b = (sel, fn) => body.querySelectorAll(sel).forEach(x => x.onclick = () => { fn(x); localSave(st); go('team'); });
  b('[data-coach]', x => { const [k, tk] = x.dataset.coach.split(':'), tt = COACH_TIER[tk]; t.coach = { kind: k, tier: tk, name: `${tt.name}${COACH_KIND[k].name}`, groups: COACH_KIND[k].groups, mul: tt.mul, fee: tt.fee }; addTimeline(st, `聘請${tt.name}${COACH_KIND[k].name}`); toast('聘請了新教練'); });
  b('[data-cad]', x => hireCaddie(st, caddieById(x.dataset.cad)));
  b('[data-agent]', x => { t.agent = { ...AGENTS.find(a => a.id === x.dataset.agent) }; toast('換了經紀人'); });
  b('[data-staff]', x => { const k = x.dataset.staff; if (t.staff.includes(k)) { t.staff = t.staff.filter(s => s !== k); t.elite = (t.elite || []).filter(s => s !== k); } else t.staff = t.staff.concat(k); });
  b('[data-elite]', x => { t.elite = (t.elite || []).concat(x.dataset.elite); addTimeline(st, `專業團隊升級：頂級${STAFF[x.dataset.elite].name}`); toast('升級為頂級團隊'); });
  const fc = document.getElementById('tm-fire-c'); if (fc) fc.onclick = () => { t.coach = null; localSave(st); go('team'); };
  const fd = document.getElementById('tm-fire-cd'); if (fd) fd.onclick = () => { t.caddie = null; localSave(st); go('team'); };
});

// ---------- 財務 ----------
export function sponsorOffers(st) {
  const y = st.year;
  if (st.offers && st.offers.y === y && st.offers.n === st.tally.wins) return st.offers.list;
  const r = seeded(st, 'offers', y, st.tally.wins), p = st.player, rank = st.rankNow || 9999;
  const am = st.status.amateur, college = st.status.stage === 'college';
  const img = mediaImage(st), imgMul = !img ? 1 : img.k === 'gent' ? 1.15 : img.k === 'humor' ? 1.05 : img.k === 'edgy' ? 0.9 : 1;      // 媒體形象：紳士 +15%、開心果 +5%、話題人物 −10%
  const mult = (0.25 + p.fame / 40000 + (rank <= 200 ? (200 - rank) / 60 : 0) + st.tally.majors * 2) * (st.rel.sponsor / 60) * imgMul;
  const kinds = am ? (college ? ['drink', 'tech', 'bank'] : p.fame >= 400 ? ['bank'] : []) : Object.keys(SPONSOR_KINDS);
  const list = kinds.filter(k => !st.sponsors.some(s => s.kind === k)).map(k => {
    const base = SPONSOR_KINDS[k].base * (am ? (college ? 0.08 : 0.02) : 1), boost = st.team.agent ? (st.team.agent.boost[k] || 1) : 0.75;
    const amt = Math.round(base * mult * boost * (0.8 + r() * 0.5) / 100) * 100;
    return { kind: k, kindName: am && !college ? '地方贊助' : am ? 'NIL 合作' : SPONSOR_KINDS[k].name, name: r.pick(SPONSOR_NAMES[k]), year: amt, until: y + (am ? 1 : 1 + Math.floor(r() * 3)), bonus: Math.round(amt * 0.3) };
  }).filter(o => o.year >= 500);
  st.offers = { y, n: st.tally.wins, list };
  return list;
}
register('finance', body => {
  const st = cur(); if (!st) return go('slots');
  const m = st.money, s = m.season, offers = sponsorOffers(st), pro = !st.status.amateur;
  body.innerHTML = `
    <div class="cm-card"><h3>資金</h3><div class="cm-stat3"><div><span>可用資金</span><b class="num" style="font-size:24px">${money(m.cash)}</b></div><div><span>生涯總獎金</span><b class="num" style="font-size:24px">${money(m.careerPrize, { short: true })}</b></div><div><span>本季淨收入</span><b class="num" style="font-size:24px">${money((s.prize || 0) + (s.spon || 0) + (s.other || 0) - (s.cost || 0) - (s.tax || 0), { short: true })}</b></div></div>
      ${investTotal(st) ? `<p class="cm-note" style="margin-top:6px">另有投資市值 ${money(investTotal(st), { short: true })}，總資產 ${money(m.cash + investTotal(st), { short: true })}。</p>` : ''}
      <div class="cm-list" style="margin-top:8px">${[['獎金', s.prize], ['贊助與合約', s.spon], ['其他收入（教學、球場、酒莊…）', s.other], ['支出（團隊、旅費、生活、資產）', -(s.cost || 0)], ['稅', -(s.tax || 0)], ...(s.invest ? [['投資（年底結算）', s.invest]] : [])].map(([n, v]) => `<div class="cm-li"><div class="main">${n}</div><div class="side num" style="font-size:16px;color:${(v || 0) < 0 ? 'var(--red)' : 'var(--ink)'}">${money(v || 0)}</div></div>`).join('')}</div>
      ${st.status.amateur ? `<p class="cm-note" style="margin-top:6px">業餘時期：${FAMILY[st.player.family].name}，家人分擔 ${Math.round(FAMILY[st.player.family].share * 100)}% 的比賽費用（家人關係好會多一點）。業餘不能拿比賽獎金。</p>` : `<p class="cm-note" style="margin-top:6px">稅：依基地（${st.base === 'florida' ? '佛州：沒有州所得稅' : '家鄉'}）＋賽事所在地。</p>`}</div>
    <div class="cm-card"><h3>贊助合約</h3>${st.sponsors.length ? `<div class="cm-list">${st.sponsors.map(x => `<div class="cm-li"><div class="main"><b>${esc(x.name)}</b><span>${esc(x.kindName)} · 到 ${x.until} 年</span></div><div class="side num" style="font-size:15px">${money(x.year)} / 年</div></div>`).join('')}</div>` : '<p class="cm-note">還沒有贊助。</p>'}
      ${offers.length ? `<h4 style="margin:10px 0 4px;font-size:13px">新的邀約</h4><div class="cm-list">${offers.map((o, i) => `<div class="cm-li"><div class="main"><b>${esc(o.name)}</b><span>${esc(o.kindName)}${pro ? ' · ' + SPONSOR_KINDS[o.kind].spot : ''} · ${o.until - st.year + 1} 年</span></div><div class="side"><b class="num" style="font-size:15px">${money(o.year)} / 年</b><br><button class="cm-btn small green" data-off="${i}">簽約</button></div></div>`).join('')}</div>` : ''}</div>
    ${pro || st.player.age >= 16 ? `<div class="cm-card"><h3>旅行方式</h3><div class="cm-field"><label>機票（影響體能消耗）</label><div class="cm-seg">${Object.entries(FLIGHT).map(([k, f]) => `<button data-fl="${k}" class="${(st.flight || 'eco') === k ? 'on' : ''}">${f.name}</button>`).join('')}</div></div>
      <div class="cm-field"><label>住宿（影響心情）</label><div class="cm-seg">${Object.entries(LODGE).map(([k, f]) => `<button data-lo="${k}" class="${(st.lodge || (st.status.amateur ? 'motel' : 'hotel')) === k ? 'on' : ''}">${f.name}</button>`).join('')}</div></div></div>` : ''}
    ${pro ? wealthHtml(st) : ''}
    <div class="cm-card"><h3>收支明細</h3><div class="cm-list">${m.ledger.slice(0, 30).map(l => `<div class="cm-li"><div class="main"><span>${l.y}·W${l.w}</span> ${esc(l.what)}</div><div class="side num" style="font-size:15px;color:${l.amt < 0 ? 'var(--red)' : 'var(--aug)'}">${money(l.amt, { plus: true })}</div></div>`).join('') || '<div class="cm-empty">還沒有紀錄</div>'}</div></div>`;
  const b = (sel, fn) => body.querySelectorAll(sel).forEach(x => x.onclick = () => { fn(x); localSave(st); go('finance'); });
  b('[data-off]', x => { const o = offers[Number(x.dataset.off)]; st.sponsors.push(o); st.offers.list = offers.filter(z => z !== o); addTimeline(st, `簽下 ${o.name}（${o.kindName}）`); toast('簽約完成：每週入帳'); });
  b('[data-fl]', x => (st.flight = x.dataset.fl));
  b('[data-lo]', x => (st.lodge = x.dataset.lo));
  b('[data-as]', x => { const k = x.dataset.as, a = ASSETS[k]; if (st.money.cash < a.price) return toast('資金不夠'); spend(st, a.price, '購買 ' + a.name, 'cost'); st.assets[k] = (st.assets[k] || 0) + 1; if (k === 'share') st.homeBonus = Math.min(8, (st.homeBonus || 0) + 1); addTimeline(st, `購買${a.name}`); });
  bindWealth(st, body);
  const rm = document.getElementById('fn-room');
  if (rm) rm.onclick = () => { const nx = ROOM_LEVELS[(st.room || 0) + 1]; if (st.money.cash < nx.price) return toast('資金不夠'); spend(st, nx.price, '獎盃室升級', 'cost'); st.room = (st.room || 0) + 1; addTimeline(st, `獎盃室升級：${nx.name}`); localSave(st); go('finance'); };
});

// ---------- 後期的花錢地方：住所、資產、投資、球場經營、自辦邀請賽 ----------
const ok$ = (st, amt) => st.money.cash >= amt;
function wealthHtml(st) {
  const lv = st.homeLv || 0, cur = HOMES[lv], rank = st.rankNow || 9999, inv = st.invest || {};
  const homes = HOMES.map((h, i) => {
    if (i === 0) return '';
    const own = i === lv, price = Math.max(0, h.price - Math.round(cur.price * 0.5));
    return `<div class="cm-li ${i < lv ? 'dim' : ''}"><div class="main"><b>${h.name}${own ? ' <span class="cm-pill green">住在這裡</span>' : ''}</b><span>${h.desc}</span><span>休息體能 +${h.rest}、每週心情 +${h.mood}、家人關係 +${h.fam}${h.fame ? '、人氣 +' + h.fame : ''} · 維護 ${money(h.upkeep)} / 週（取代生活費）</span></div>
      <div class="side">${i > lv ? `<button class="cm-btn small green" data-home="${i}">${money(price, { short: true })}</button>${lv ? '<br><small>舊房子半價折抵</small>' : ''}` : ''}</div></div>`;
  }).join('');
  const groups = Object.entries(ASSET_GRP).map(([g, gn]) => {
    const list = Object.entries(ASSETS).filter(([, a]) => a.grp === g);
    if (!list.length) return '';
    return `<h4 style="margin:10px 0 4px;font-size:13px">${gn}</h4><div class="cm-list">${list.map(([k, a]) => { const n = st.assets[k] || 0, max = a.max || 1; return `<div class="cm-li"><div class="main"><b>${a.name}${n ? ` <span class="cm-pill green">${max > 1 ? n + ' / ' + max : '已擁有'}</span>` : ''}</b><span>${a.desc}</span></div><div class="side">${n < max ? `<button class="cm-btn small green" data-as="${k}">${money(a.price, { short: true })}</button>` : ''}</div></div>`; }).join('')}</div>`;
  }).join('');
  const invest = `<div class="cm-list">${Object.entries(INVEST).map(([k, v]) => `<div class="cm-li"><div class="main"><b>${v.name}${inv[k] ? ` <span class="cm-pill green">${money(inv[k], { short: true })}</span>` : ''}</b><span>${v.desc}</span></div><div class="side"><button class="cm-btn small green" data-inv="${k}:1000000">+$1M</button> <button class="cm-btn small green" data-inv="${k}:10000000">+$10M</button>${inv[k] ? `<br><button class="cm-btn small ghost" data-sell="${k}" style="margin-top:4px">全部賣出</button>` : ''}</div></div>`).join('')}</div>`;
  const shares = st.assets.share || 0, up = st.courseUp || {};
  const course = shares >= 5 ? `<div class="cm-card"><h3>球場經營：家鄉球場<small>每週營收 ${money(courseIncome(st))}</small></h3><p class="cm-note">球場是你的了。升級設施提高營收，退休之後也一直有收入。</p><div class="cm-list">${Object.entries(COURSE_UP).map(([k, u]) => { const l = up[k] || 0; return `<div class="cm-li"><div class="main"><b>${u.name} <span class="cm-pill">${l} / 3</span></b><span>${u.desc}</span></div><div class="side">${l < 3 ? `<button class="cm-btn small green" data-cup="${k}">${money(u.cost[l], { short: true })}</button>` : ''}</div></div>`; }).join('')}</div></div>`
    : `<div class="cm-card"><h3>球場經營</h3><p class="cm-note">買齊「家鄉球場股份」5 / 5 之後就能經營球場（目前 ${shares} / 5）。</p></div>`;
  const y = st.year, canHost = !st.retired && (rank <= HOST.need.rank || st.player.fame >= HOST.need.fame || st.tally.majors >= 1), hosted = (st.host || {})[y];
  const dreams = (st.designs || []).map(d => dreamId(d, st.player.name));
  const courses = [...new Set(dreams.concat(homeCourses(st.player.country), ['pebble', 'c_emeraldbay', 'c_kapalua']))].filter(c => cinfo(c) && (cinfo(c).id === c || dreams.includes(c)));
  const host = `<div class="cm-card"><h3>自己辦一場邀請賽</h3><p class="cm-note">每年第 50 週，邀請 30 位球員（不計正式積分）。花費 ${money(HOST.cost, { short: true })}（含總獎金 ${money(HOST.purse, { short: true })}），比賽結束時人氣 +${HOST.fame.toLocaleString()}、贊助商好感 +10。條件：世界前 ${HOST.need.rank}、大賽冠軍或人氣 ${HOST.need.fame.toLocaleString()}。</p>
    ${hosted ? `<p>今年：<b>${esc(hosted.name)}</b>（${esc(cinfo(hosted.course).name)}，第 50 週）</p>` : st.week >= 48 ? '<p class="cm-note">今年來不及了（第 48 週以前要決定）。</p>' : canHost ? `<div class="cm-field"><label>球場</label><select id="fn-hc">${courses.map(c => `<option value="${c}">${esc(cinfo(c).name)}</option>`).join('')}</select></div><button class="cm-btn green" id="fn-host">主辦今年的邀請賽</button>` : '<p class="cm-note">還沒有資格。</p>'}</div>`;
  const canDesign = st.player.age >= 30 || st.tally.majors >= 1 || st.retired;
  const designCard = `<div class="cm-card"><h3>球場設計<small>${(st.designs || []).length} 座</small></h3><p class="cm-note">30 歲以後（或拿過大賽）可以設計自己的夢想球場：選風格、長度、名字，做成可以打的 3D 球場。可以下場練習、用來辦自己的邀請賽，主遊戲「非真實球場 → 我的夢想球場」也看得到。</p>${canDesign ? '<button class="cm-btn green" id="fn-design">球場設計</button>' : '<p class="cm-note">還沒有資格。</p>'}</div>`;
  return designCard + `<div class="cm-card"><h3>住所<small>目前：${cur.name} · 每週 ${money(livingCost(st))}</small></h3><div class="cm-list">${homes}</div></div>
    <div class="cm-card"><h3>資產</h3>${groups}
      <h4 style="margin:10px 0 4px;font-size:13px">獎盃室</h4><div class="cm-li"><div class="main"><b>${ROOM_LEVELS[st.room || 0].name}</b><span>可以展示 ${ROOM_LEVELS[st.room || 0].slots} 座</span></div><div class="side">${(st.room || 0) < ROOM_LEVELS.length - 1 ? `<button class="cm-btn small green" id="fn-room">升級 ${money(ROOM_LEVELS[(st.room || 0) + 1].price, { short: true })}</button>` : ''}</div></div></div>
    <div class="cm-card"><h3>投資<small>市值 ${money(investTotal(st), { short: true })}</small></h3><p class="cm-note">每年年底結算報酬（可能賠錢）。賣出時錢回到可用資金，退休後也照樣結算。</p>${invest}</div>
    ${course}${host}`;
}
function bindWealth(st, body) {
  const b = (sel, fn) => body.querySelectorAll(sel).forEach(x => x.onclick = () => { if (fn(x) === false) return; localSave(st); go('finance'); });
  b('[data-home]', x => {
    const i = Number(x.dataset.home), h = HOMES[i], price = Math.max(0, h.price - Math.round(HOMES[st.homeLv || 0].price * 0.5));
    if (!ok$(st, price)) { toast('資金不夠'); return false; }
    spend(st, price, `購買${h.name}`, 'cost'); st.homeLv = i; addTimeline(st, `搬進${h.name}`); toast(`搬進${h.name}`);
  });
  b('[data-inv]', x => {
    const [k, a] = x.dataset.inv.split(':'), amt = Number(a);
    if (!ok$(st, amt)) { toast('資金不夠'); return false; }
    st.money.cash -= amt; st.invest = st.invest || {}; st.invest[k] = (st.invest[k] || 0) + amt;
    st.money.ledger.unshift({ y: st.year, w: st.week, what: `投資 ${INVEST[k].name}`, amt: -amt });
  });
  b('[data-sell]', x => {
    const k = x.dataset.sell, v = Math.round(st.invest[k] || 0);
    st.money.cash += v; st.invest[k] = 0; st.money.ledger.unshift({ y: st.year, w: st.week, what: `賣出 ${INVEST[k].name}`, amt: v }); toast(`賣出 ${money(v)}`);
  });
  b('[data-cup]', x => {
    const k = x.dataset.cup, u = COURSE_UP[k], up = st.courseUp = st.courseUp || {}, l = up[k] || 0;
    if (!ok$(st, u.cost[l])) { toast('資金不夠'); return false; }
    spend(st, u.cost[l], `球場升級：${u.name}`, 'cost'); up[k] = l + 1; addTimeline(st, `家鄉球場升級：${u.name} Lv.${l + 1}`);
  });
  const db = document.getElementById('fn-design'); if (db) db.onclick = async () => { const { design } = await import('../legacy.js'); design(st); };
  const hb = document.getElementById('fn-host');
  if (hb) hb.onclick = () => {
    if (!ok$(st, HOST.cost)) return toast('資金不夠');
    const c = document.getElementById('fn-hc').value;
    spend(st, HOST.cost, '主辦邀請賽', 'cost');
    st.host = st.host || {}; st.host[st.year] = { name: `${st.player.name} 邀請賽`, course: c, region: baseRegion(st) };
    st.entered[`${st.year}:host`] = true;
    addTimeline(st, `主辦 ${st.player.name} 邀請賽`);
    toast('邀請賽排進第 50 週的賽程'); localSave(st); go('finance');
  };
}

// 常碰到的對手（同場比賽的名次勝負）與他們的風格
function oppHtml(st, rv) {
  const H = st.h2h || {}, list = Object.entries(H).sort((a, b) => b[1].n - a[1].n).slice(0, 14);
  if (!list.length) return '';
  return `<div class="cm-card"><h3>常碰到的對手<small>同一場比賽，名次比較前面的算贏</small></h3>
    <p class="cm-note">風格：${Object.entries(STYLE_ZH).map(([k, n]) => `<b>${n}</b> ${STYLE_DESC[k]}`).join('；')}。</p>
    <div class="cm-scroll-x"><table class="lb"><tr><th>對手</th><th>風格</th><th style="text-align:center">同場</th><th style="text-align:center">勝 - 敗</th></tr>${list.map(([id, h]) => `<tr class="${rv && rv.id === id ? 'me' : ''}"><td>${esc(h.name)}${rv && rv.id === id ? ' <span class="cm-pill gold">宿敵</span>' : ''}</td><td><span class="sty sty-${styleOf(id)}">${STYLE_ZH[styleOf(id)]}</span></td><td class="th">${h.n}</td><td class="th">${h.w} - ${h.l}</td></tr>`).join('')}</table></div></div>`;
}
// 媒體形象（記者會的回答累積）
function mediaHtml(st) {
  const m = st.media || {}, img = mediaImage(st), tot = Object.values(m).reduce((a, b) => a + b, 0);
  if (!tot) return '';
  const eff = { gent: '贊助邀約 +15%', conf: '人氣成長快', humor: '追蹤成長快、贊助 +5%', edgy: '人氣暴漲、贊助邀約 −10%、宿敵更火爆' };
  return `<div class="cm-card"><h3>媒體形象<small>${img ? img.name + ' · ' + img.pct + '%' : '還沒成形（回答 5 次以上）'}</small></h3>
    <div class="cm-chips">${[['gent', '紳士'], ['conf', '自信'], ['humor', '幽默'], ['edgy', '話題']].map(([k, n]) => `<span>${n} ${m[k] || 0}</span>`).join('')}</div>
    <p class="cm-note" style="margin-top:6px">記者會的回答會累積成媒體形象：紳士讓贊助商安心、自信讓人氣上升但宿敵更不爽、幽默增加追蹤、話題讓人氣暴漲但贊助商退縮。${img ? `目前的效果：${eff[img.k]}。` : ''}</p></div>`;
}

// 粉絲團：等級、追蹤、周邊商品收入
function fanHtml(st) {
  const p = st.player; if (p.age < 15) return '';
  const f = fanLevel(p.followers || 0), merch = !st.status.amateur && f.merch ? Math.round(p.followers / 10000 * f.merch) : 0;
  return `<div class="cm-card"><h3>粉絲團<small>${f.name}</small></h3><div class="cm-grid3"><div><span class="cm-k">追蹤</span><div class="num" style="font-size:22px">${(p.followers || 0).toLocaleString()}</div></div><div><span class="cm-k">人氣</span><div class="num" style="font-size:22px">${Math.round(p.fame).toLocaleString()}</div></div><div><span class="cm-k">周邊收入 / 週</span><div class="num" style="font-size:22px">${money(merch)}</div></div></div>
    ${f.next ? `<p class="cm-note" style="margin-top:6px">再 ${(f.next.min - (p.followers || 0)).toLocaleString()} 追蹤升到「${f.next.name}」</p>` : ''}
    <p class="cm-note">等級：${FAN_LEVELS.slice(1).map(l => `${l.name} ${l.min.toLocaleString()}`).join(' · ')}。職業選手到「粉絲團」以上有周邊商品收入（每 1 萬追蹤每週 $${f.merch || 4}~12）。追蹤靠社群發文（可以選主題）、直播、記者會的回答、比賽成績。</p></div>`;
}
// 家人：孩子的年紀
function kidsHtml(st) {
  const K = st.kids || []; if (!K.length) return '';
  return `<div class="cm-card"><h3>家人</h3><div class="cm-list">${K.map(k => `<div class="cm-li"><div class="main"><b>${esc(k.name)}</b><span>${st.year - k.by} 歲 · ${k.by} 年出生</span></div></div>`).join('')}</div><p class="cm-note">孩子會長大：小時候拿你的推桿玩、上學、第一場兒童賽、青春期、幫你揹球袋。退休後可以用孩子開始傳承生涯。</p></div>`;
}
