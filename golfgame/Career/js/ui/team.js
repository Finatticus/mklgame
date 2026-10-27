// 團隊（教練、桿弟、經紀人、專業團隊、人際）與財務（收支、贊助合約、資產、旅行方式）
import { register, go, toast, dialog, confirm2, bar } from './shell.js';
import { cur, localSave } from '../state.js';
import { esc, money, clamp, seeded } from '../util.js';
import { CADDIES, caddieById, COACH_KIND, COACH_TIER, AGENTS, STAFF, SPONSOR_KINDS, SPONSOR_NAMES, ASSETS, ROOM_LEVELS, FLIGHT, LODGE } from '../data/items.js';
import { GROUPS } from '../growth.js';
import { spend, earn, addTimeline, FAMILY } from '../life.js';
import { hireCaddie } from './home.js';
import { findP, nameOf } from '../world.js';
import { MENTOR_NAME, FAMILY_WHO } from '../story.js';

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
    <div class="cm-card"><h3>專業團隊</h3><div class="cm-list">${Object.entries(STAFF).map(([k, s]) => { const on = t.staff.includes(k); return `<div class="cm-li"><div class="main"><b>${s.name}</b><span>${s.desc} · ${money(s.fee)} / 週</span></div><div class="side"><button class="cm-btn small ${on ? 'ghost' : 'green'}" data-staff="${k}">${on ? '解約' : '聘請'}</button></div></div>`; }).join('')}</div></div>` : ''}
    <div class="cm-card"><h3>人際關係</h3>${[['family', `家人（${FAMILY_WHO[st.player.origin] || '家人'}）`], ['mentor', `啟蒙導師（${MENTOR_NAME[st.player.origin] || ''}）`], ['friend', '童年玩伴'], ['rival', '宿敵'], ['coach', '教練'], ['caddie', '桿弟'], ['agent', '經紀人'], ['team', '隊友'], ['sponsor', '贊助商']].map(([k, n]) => `<div class="cm-statrow" style="grid-template-columns:120px 1fr 40px"><span>${n}</span>${bar(st.rel[k] ?? 50)}<span class="v">${Math.round(st.rel[k] ?? 50)}</span></div>`).join('')}
      ${rv ? `<p class="cm-note" style="margin-top:8px">目前的宿敵：<b>${esc(nameOf(rv))}</b>　對戰紀錄 ${h2h.w} 勝 ${h2h.l} 敗</p>` : ''}</div>`;
  const b = (sel, fn) => body.querySelectorAll(sel).forEach(x => x.onclick = () => { fn(x); localSave(st); go('team'); });
  b('[data-coach]', x => { const [k, tk] = x.dataset.coach.split(':'), tt = COACH_TIER[tk]; t.coach = { kind: k, tier: tk, name: `${tt.name}${COACH_KIND[k].name}`, groups: COACH_KIND[k].groups, mul: tt.mul, fee: tt.fee }; addTimeline(st, `聘請${tt.name}${COACH_KIND[k].name}`); toast('聘請了新教練'); });
  b('[data-cad]', x => hireCaddie(st, caddieById(x.dataset.cad)));
  b('[data-agent]', x => { t.agent = { ...AGENTS.find(a => a.id === x.dataset.agent) }; toast('換了經紀人'); });
  b('[data-staff]', x => { const k = x.dataset.staff; t.staff = t.staff.includes(k) ? t.staff.filter(s => s !== k) : t.staff.concat(k); });
  const fc = document.getElementById('tm-fire-c'); if (fc) fc.onclick = () => { t.coach = null; localSave(st); go('team'); };
  const fd = document.getElementById('tm-fire-cd'); if (fd) fd.onclick = () => { t.caddie = null; localSave(st); go('team'); };
});

// ---------- 財務 ----------
export function sponsorOffers(st) {
  const y = st.year;
  if (st.offers && st.offers.y === y && st.offers.n === st.tally.wins) return st.offers.list;
  const r = seeded(st, 'offers', y, st.tally.wins), p = st.player, rank = st.rankNow || 9999;
  const am = st.status.amateur, college = st.status.stage === 'college';
  const mult = (0.25 + p.fame / 40000 + (rank <= 200 ? (200 - rank) / 60 : 0) + st.tally.majors * 2) * (st.rel.sponsor / 60);
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
      <div class="cm-list" style="margin-top:8px">${[['獎金', s.prize], ['贊助與合約', s.spon], ['其他收入', s.other], ['支出（團隊、旅費、生活）', -(s.cost || 0)], ['稅', -(s.tax || 0)]].map(([n, v]) => `<div class="cm-li"><div class="main">${n}</div><div class="side num" style="font-size:16px;color:${(v || 0) < 0 ? 'var(--red)' : 'var(--ink)'}">${money(v || 0)}</div></div>`).join('')}</div>
      ${st.status.amateur ? `<p class="cm-note" style="margin-top:6px">業餘時期：${FAMILY[st.player.family].name}，家人分擔 ${Math.round(FAMILY[st.player.family].share * 100)}% 的比賽費用（家人關係好會多一點）。業餘不能拿比賽獎金。</p>` : `<p class="cm-note" style="margin-top:6px">稅：依基地（${st.base === 'florida' ? '佛州：沒有州所得稅' : '家鄉'}）＋賽事所在地。</p>`}</div>
    <div class="cm-card"><h3>贊助合約</h3>${st.sponsors.length ? `<div class="cm-list">${st.sponsors.map(x => `<div class="cm-li"><div class="main"><b>${esc(x.name)}</b><span>${esc(x.kindName)} · 到 ${x.until} 年</span></div><div class="side num" style="font-size:15px">${money(x.year)} / 年</div></div>`).join('')}</div>` : '<p class="cm-note">還沒有贊助。</p>'}
      ${offers.length ? `<h4 style="margin:10px 0 4px;font-size:13px">新的邀約</h4><div class="cm-list">${offers.map((o, i) => `<div class="cm-li"><div class="main"><b>${esc(o.name)}</b><span>${esc(o.kindName)}${pro ? ' · ' + SPONSOR_KINDS[o.kind].spot : ''} · ${o.until - st.year + 1} 年</span></div><div class="side"><b class="num" style="font-size:15px">${money(o.year)} / 年</b><br><button class="cm-btn small green" data-off="${i}">簽約</button></div></div>`).join('')}</div>` : ''}</div>
    ${pro || st.player.age >= 16 ? `<div class="cm-card"><h3>旅行方式</h3><div class="cm-field"><label>機票（影響體能消耗）</label><div class="cm-seg">${Object.entries(FLIGHT).map(([k, f]) => `<button data-fl="${k}" class="${(st.flight || 'eco') === k ? 'on' : ''}">${f.name}</button>`).join('')}</div></div>
      <div class="cm-field"><label>住宿（影響心情）</label><div class="cm-seg">${Object.entries(LODGE).map(([k, f]) => `<button data-lo="${k}" class="${(st.lodge || (st.status.amateur ? 'motel' : 'hotel')) === k ? 'on' : ''}">${f.name}</button>`).join('')}</div></div></div>` : ''}
    ${pro ? `<div class="cm-card"><h3>資產</h3><div class="cm-list">${Object.entries(ASSETS).map(([k, a]) => { const n = st.assets[k] || 0, max = a.max || 1; return `<div class="cm-li"><div class="main"><b>${a.name}${n ? ` <span class="cm-pill green">${max > 1 ? n + ' / ' + max : '已擁有'}</span>` : ''}</b><span>${a.desc}</span></div><div class="side">${n < max ? `<button class="cm-btn small green" data-as="${k}">${money(a.price, { short: true })}</button>` : ''}</div></div>`; }).join('')}
      <div class="cm-li"><div class="main"><b>獎盃室：${ROOM_LEVELS[st.room || 0].name}</b><span>可以展示 ${ROOM_LEVELS[st.room || 0].slots} 座</span></div><div class="side">${(st.room || 0) < ROOM_LEVELS.length - 1 ? `<button class="cm-btn small green" id="fn-room">升級 ${money(ROOM_LEVELS[(st.room || 0) + 1].price, { short: true })}</button>` : ''}</div></div></div></div>` : ''}
    <div class="cm-card"><h3>收支明細</h3><div class="cm-list">${m.ledger.slice(0, 30).map(l => `<div class="cm-li"><div class="main"><span>${l.y}·W${l.w}</span> ${esc(l.what)}</div><div class="side num" style="font-size:15px;color:${l.amt < 0 ? 'var(--red)' : 'var(--aug)'}">${money(l.amt, { plus: true })}</div></div>`).join('') || '<div class="cm-empty">還沒有紀錄</div>'}</div></div>`;
  const b = (sel, fn) => body.querySelectorAll(sel).forEach(x => x.onclick = () => { fn(x); localSave(st); go('finance'); });
  b('[data-off]', x => { const o = offers[Number(x.dataset.off)]; st.sponsors.push(o); st.offers.list = offers.filter(z => z !== o); addTimeline(st, `簽下 ${o.name}（${o.kindName}）`); toast('簽約完成：每週入帳'); });
  b('[data-fl]', x => (st.flight = x.dataset.fl));
  b('[data-lo]', x => (st.lodge = x.dataset.lo));
  b('[data-as]', x => { const k = x.dataset.as, a = ASSETS[k]; if (st.money.cash < a.price) return toast('資金不夠'); spend(st, a.price, '購買 ' + a.name, 'cost'); st.assets[k] = (st.assets[k] || 0) + 1; if (k === 'share') st.homeBonus = Math.min(8, (st.homeBonus || 0) + 1); addTimeline(st, `購買${a.name}`); });
  const rm = document.getElementById('fn-room');
  if (rm) rm.onclick = () => { const nx = ROOM_LEVELS[(st.room || 0) + 1]; if (st.money.cash < nx.price) return toast('資金不夠'); spend(st, nx.price, '獎盃室升級', 'cost'); st.room = (st.room || 0) + 1; addTimeline(st, `獎盃室升級：${nx.name}`); localSave(st); go('finance'); };
});
