// 賽程：全年行事曆、資格、報名 / 取消、週一資格賽、申請贊助外卡
import { register, go, toast, dialog, refresh } from './shell.js';
import { cur, localSave } from '../state.js';
import { esc, money, MONTH_ZH, MONTH_OF_WEEK, seeded } from '../util.js';
import { eventsOfYear, weekEvents } from '../life.js';
import { eligibility } from '../tours.js';
import { TOUR_ZH } from '../data/calendar.js';
import { cinfo } from '../event.js';
import { isEntered } from './home.js';

register('calendar', (body, arg) => {
  const st = cur(); if (!st) return go('slots');
  const y = (arg && arg.y) || st.year, filter = (arg && arg.f) || 'mine';
  const all = eventsOfYear(st, y).map(e => ({ ...e, el: eligibility(st, e) })).filter(e => e.w >= (y === st.year ? st.week : 1));
  const mine = e => e.el.ok || ['major'].includes(e.tour) || e.tour === st.status.mainTour || (st.status.amateur && ['junior', 'am', 'ncaa'].includes(e.tour) && e.el.ok);
  const list = (filter === 'mine' ? all.filter(mine) : all).sort((a, b) => a.w - b.w);
  const byM = {};
  for (const e of list) (byM[MONTH_OF_WEEK(e.w)] = byM[MONTH_OF_WEEK(e.w)] || []).push(e);
  const spLeft = 7 - Object.keys(st.sponsorInv || {}).filter(k => k.startsWith(st.year + ':')).length;
  body.innerHTML = `<div class="cm-card"><h3>${y} 年賽程</h3><div class="cm-row wrap"><div class="cm-seg"><button data-f="mine" class="${filter === 'mine' ? 'on' : ''}">我的比賽</button><button data-f="all" class="${filter === 'all' ? 'on' : ''}">全部</button></div><span style="flex:1"></span>
      ${y === st.year ? `<button class="cm-btn small ghost" data-y="${y + 1}">明年 ›</button>` : `<button class="cm-btn small ghost" data-y="${st.year}">‹ 今年</button>`}</div>
      <p class="cm-note" style="margin-top:8px">「自動」= 有資格的比賽會自動報名（巡迴卡、大賽、邀請、國內青少年排名賽）；可以手動取消或加入。${!st.status.amateur && !st.status.cards.pga ? `沒有 PGA TOUR 卡時可以打週一資格賽，或申請贊助外卡（今年還剩 ${Math.max(0, spLeft)} 次）。` : ''}</p></div>
    ${Object.keys(byM).map(m => `<div class="cm-card"><h3>${MONTH_ZH[m]}</h3><div class="cm-list">${byM[m].map(e => row(st, e)).join('')}</div></div>`).join('') || '<div class="cm-empty">沒有比賽</div>'}`;
  body.querySelectorAll('[data-f]').forEach(b => b.onclick = () => go('calendar', { y, f: b.dataset.f }));
  body.querySelectorAll('[data-y]').forEach(b => b.onclick = () => go('calendar', { y: Number(b.dataset.y), f: filter }));
  body.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
    const k = b.dataset.k, act = b.dataset.a;
    if (act === 'in') st.entered[k] = true;
    if (act === 'out') st.entered[k] = false;
    if (act === 'sp') {
      // 贊助外卡：人氣、世界排名、經紀人決定機率
      const r = seeded(st, 'sp', k)(), p = Math.min(0.9, 0.15 + st.player.fame / 60000 + (st.team.agent ? 0.15 : 0) + ((st.rankNow || 9999) < 300 ? 0.2 : 0));
      st.sponsorInv = st.sponsorInv || {};
      if (r < p) { st.sponsorInv[k] = true; st.entered[k] = true; toast('拿到贊助外卡！'); }
      else { st.sponsorInv[k] = false; toast('主辦單位這次沒有給外卡'); }
    }
    localSave(st); go('calendar', { y, f: filter });
  });
  body.querySelectorAll('[data-info]').forEach(b => b.onclick = () => info(st, list.find(e => e.key === b.dataset.info)));
});
function row(st, e) {
  const ent = isEntered(st, e), ci = cinfo(e.course);
  const how = { card: '巡迴卡', exempt: '免資格', invite: '邀請', team: '球隊', fee: '報名', mq: '週一資格賽', qual: '資格賽', sponsor: '贊助外卡' }[e.el.how] || '';
  const thisWeek = e.year === st.year && e.w === st.week;
  let act = '';
  if (e.el.ok) act = ent ? `<button class="cm-btn small ghost" data-k="${e.key}" data-a="out">取消</button>` : `<button class="cm-btn small green" data-k="${e.key}" data-a="in">${e.el.how === 'mq' ? '報名資格賽' : '報名'}</button>`;
  if (e.el.how === 'mq' && e.tour === 'pga' && !e.sig && st.sponsorInv?.[e.key] === undefined && !st.status.amateur) act += ` <button class="cm-btn small ghost" data-k="${e.key}" data-a="sp">申請外卡</button>`;
  return `<div class="cm-li ${e.el.ok ? '' : 'dim'}"><div class="main" data-info="${e.key}" style="cursor:pointer"><b>${esc(e.name)}${e.major ? ' <span class="cm-pill gold">大賽</span>' : e.sig ? ' <span class="cm-pill">Signature</span>' : ''}${thisWeek ? ' <span class="cm-pill green">本週</span>' : ''}</b>
    <span>第 ${e.w} 週 · ${esc(TOUR_ZH[e.tour] || '')} · ${esc(ci ? ci.name : '')}${e.purse && !st.status.amateur ? ' · ' + money(e.purse, { short: true }) : ''}</span>
    <span>${e.el.ok ? (ent ? '已報名' : '可報名') + (how ? '（' + how + '）' : '') : esc(e.el.why || '沒有資格')}${e.el.ok && e.el.why ? ' · ' + esc(e.el.why) : ''}</span></div><div class="side">${act}</div></div>`;
}
function info(st, e) {
  if (!e) return;
  const ci = cinfo(e.course), past = (st.world.hist[e.id] || {});
  const champs = Object.entries(past).sort((a, b) => b[0] - a[0]).slice(0, 5).map(([y, id]) => `${y}：${id === 'ME' ? st.player.name : (st.world.players.find(p => p.id === id) || {}).zh || (st.world.players.find(p => p.id === id) || {}).en || { usa: '美國隊', eur: '歐洲隊', intl: '國際隊' }[id] || '—'}`);
  dialog(`<p><b>${esc(e.name)}</b></p><p class="cm-note">${esc(ci.name)}（${esc(ci.en)}）· Par ${ci.par} · ${ci.blackYards.toLocaleString()} 碼 · 第 ${e.w} 週</p>${e.note ? `<p style="margin-top:8px;font-size:13px">${esc(e.note)}</p>` : ''}
    <p class="cm-note" style="margin-top:8px">${e.field ? `參賽人數 ${e.field}` : ''}${e.cut ? ` · 晉級線：前 ${e.cut} 名（含同分）` : e.cut === 0 ? ' · 不設晉級線' : ''}</p>
    ${champs.length ? `<p class="cm-note" style="margin-top:8px">歷屆冠軍：<br>${champs.map(esc).join('<br>')}</p>` : ''}`, { title: '賽事資訊' });
}
