// 球員：素質（基礎值、上限、訓練經驗、加成）、技能點、天賦、球風、技能卡、裝備（穿戴、升級、商店）、訓練關卡
import { register, go, toast, dialog, story, refresh, bar } from './shell.js';
import { cur, localSave } from '../state.js';
import { esc, money, clamp } from '../util.js';
import { STAT_KEYS, STAT_ZH, GROUPS, GROUP_ZH, spendPoint, skillCost, capOf, TALENTS, STYLES, CARDS, cardSlots, TRAIN, train, trainNeed, effectiveStats, addXp, equippedItems, BONUS_CAP } from '../growth.js';
import { ITEMS, SLOTS, RARITY, BRANDS, itemById, upgradeCost, CLOTHES } from '../data/items.js';
import { giveItem, spend, lengthXp, coachMul } from '../life.js';
import { ratingOf, driveCarry } from '../sim.js';
import { drill, ironDrill } from '../childhood.js';

register('player', (body, arg) => {
  const st = cur(); if (!st) return go('slots');
  const tab = (arg && arg.t) || 'stats';
  body.innerHTML = `<div class="cm-seg" style="margin-bottom:12px">${[['stats', '素質'], ['cards', '技能卡'], ['gear', '裝備'], ['shop', '商店'], ['talent', '天賦與球風']].map(([k, n]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${n}</button>`).join('')}</div><div id="pl-body"></div>`;
  body.querySelectorAll('[data-t]').forEach(b => b.onclick = () => go('player', { t: b.dataset.t }));
  ({ stats, cards, gear, shop, talent })[tab](document.getElementById('pl-body'), st);
});

function stats(el, st) {
  const p = st.player, eff = effectiveStats(st), R = ratingOf(eff);
  el.innerHTML = `<div class="cm-card"><h3>實力 <span class="num" style="font-size:26px">${R.toFixed(1)}</span><small>技能點 ${p.skillPts}</small></h3>
      <div class="cm-row wrap" style="font-size:12px;color:var(--mut)"><span>Lv.${p.level}</span><span>經驗 ${p.xp} / ${120 + p.level * 30}</span><span>一號木 Carry 約 <b class="num" style="color:var(--ink);font-size:15px">${driveCarry(eff.power, eff._spd)}</b> 碼</span><span>球風：${p.style ? STYLES[p.style].name : '青少年結束時決定'}</span></div>
      <p class="cm-note" style="margin-top:6px">基礎素質 + 裝備、手感、桿弟等加成（每項最多 +${BONUS_CAP}）= 上場的素質。直線是上限（球風決定）。</p></div>
    ${Object.entries(GROUPS).map(([g, keys]) => `<div class="cm-card"><h3>${GROUP_ZH[g]}</h3>${keys.map(k => {
      const v = p.stats[k], cap = capOf(p, k), e = eff[k], c = skillCost(v), tx = Math.round(p.trainXp[k] || 0);
      return `<div class="cm-statrow"><span>${STAT_ZH[k]}</span><div class="cap">${bar(v, 100, '')}<i class="cap-mark" style="left:${cap}%"></i><span class="cm-note">訓練 ${tx}/${trainNeed(v)}${Math.round(e - v) ? ` · 上場 ${Math.round(e)}` : ''}</span></div><span class="v">${v.toFixed(0)}</span><button data-k="${k}" ${p.skillPts < c || v >= cap ? 'disabled' : ''} title="花 ${c} 點">+</button></div>`;
    }).join('')}</div>`).join('')}`;
  el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { const err = spendPoint(p, b.dataset.k); if (err) toast(err); localSave(st); go('player', { t: 'stats' }); });
}

function cards(el, st) {
  const p = st.player, slots = cardSlots(p);
  p.cardEq = (p.cardEq || []).filter(id => p.cards.includes(id)).slice(0, slots);
  el.innerHTML = `<div class="cm-card"><h3>技能卡<small>欄位 ${p.cardEq.length} / ${slots}</small></h3><p class="cm-note">特定情況生效的招牌技能；從生涯成就解鎖。同一種誤差最多減到原本的 60%。欄位隨等級增加（最多 6 格）。</p></div>
    <div class="cm-card"><div class="cm-list">${Object.entries(CARDS).map(([id, c]) => {
      const has = p.cards.includes(id), on = p.cardEq.includes(id);
      return `<div class="cm-li ${has ? '' : 'dim'}"><div class="main"><b>${c.name}${on ? ' <span class="cm-pill green">裝備中</span>' : ''}</b><span>${c.desc}</span><span>${has ? '' : '解鎖：' + c.unlock}</span></div><div class="side">${has ? `<button class="cm-btn small ${on ? 'ghost' : 'green'}" data-c="${id}">${on ? '卸下' : '裝備'}</button>` : ''}</div></div>`;
    }).join('')}</div></div>`;
  el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => {
    const id = b.dataset.c;
    if (p.cardEq.includes(id)) p.cardEq = p.cardEq.filter(x => x !== id);
    else if (p.cardEq.length >= slots) return toast('技能卡欄位已滿');
    else p.cardEq.push(id);
    localSave(st); go('player', { t: 'cards' });
  });
}

const statTxt = s => Object.entries(s || {}).map(([k, v]) => `${STAT_ZH[k]} ${v > 0 ? '+' : ''}${v}`).join('、') || '（外觀）';
function gear(el, st) {
  const eq = st.gear.eq;
  el.innerHTML = `<div class="cm-card"><h3>裝備中</h3><p class="cm-note">服裝加小幅、有個性的能力，球具加主要的距離與控制；所有加成算在「每項最多 +8」裡。同一個品牌穿滿 3 件：抗壓 +1。外觀與能力可以分開（「只換外觀」）。</p>
    <div class="cm-list">${Object.entries(SLOTS).map(([s, n]) => { const it = st.gear.items.find(x => x.uid === eq[s]); return `<div class="cm-li click" data-s="${s}"><div class="main"><b>${n}：${it ? esc(it.name) : '—'}</b><span>${it ? `<span style="color:${RARITY[it.rarity].color}">${RARITY[it.rarity].name}</span> · Lv.${it.lv} · ${statTxt(it.stats)}` : ''}</span></div><div class="side">›</div></div>`; }).join('')}</div></div>`;
  el.querySelectorAll('[data-s]').forEach(b => b.onclick = () => slotDlg(st, b.dataset.s));
}
function slotDlg(st, slot) {
  const own = st.gear.items.filter(x => x.slot === slot);
  dialog(`<div class="cm-list">${own.map(it => `<div class="cm-li"><div class="main"><b style="color:${RARITY[it.rarity].color}">${esc(it.name)} Lv.${it.lv}</b><span>${statTxt(it.stats)}${it.brand && BRANDS[it.brand] ? ' · ' + BRANDS[it.brand] : ''}</span></div><div class="side">
      ${st.gear.eq[slot] === it.uid ? '<span class="cm-pill green">裝備中</span>' : `<button class="cm-btn small green" data-eq="${it.uid}">裝備</button>`}
      ${it.rarity !== 'champ' && it.lv < 5 ? `<button class="cm-btn small ghost" data-up="${it.uid}">升級 ${money(upgradeCost(it))}</button>` : ''}
      ${CLOTHES.includes(slot) ? `<button class="cm-btn small ghost" data-look="${it.uid}">只換外觀</button>` : ''}</div></div>`).join('') || '<div class="cm-empty">這個欄位沒有裝備，去商店看看</div>'}</div>`, {
    title: SLOTS[slot], wide: true, bind: (ov, close) => {
      ov.querySelectorAll('[data-eq]').forEach(b => b.onclick = () => { st.gear.eq[slot] = b.dataset.eq; localSave(st); close(); go('player', { t: 'gear' }); });
      ov.querySelectorAll('[data-up]').forEach(b => b.onclick = () => { const it = st.gear.items.find(x => x.uid === b.dataset.up), c = upgradeCost(it); if (st.money.cash < c) return toast('資金不夠'); spend(st, c, `升級 ${it.name}`); it.lv++; localSave(st); close(); slotDlg(st, slot); });
      ov.querySelectorAll('[data-look]').forEach(b => b.onclick = () => { const it = st.gear.items.find(x => x.uid === b.dataset.look); st.lookOverride = { ...(st.lookOverride || {}), ...(it.look || {}) }; localSave(st); toast('外觀已更換（能力照原本的裝備）'); close(); });
    },
  });
}
function shop(el, st) {
  const p = st.player, adult = p.age >= 14;
  const list = ITEMS.filter(x => x.rarity !== 'champ' && (adult || ['common', 'fine'].includes(x.rarity)));
  el.innerHTML = `<div class="cm-card"><h3>球具店<small>資金 ${money(st.money.cash)}</small></h3><p class="cm-note">${adult ? '' : '14 歲以前只有一般與精良的裝備（兒童尺寸）。'}業餘時期家人會分擔一部分費用。</p></div>
    <div class="cm-card"><div class="cm-list">${list.map(x => { const own = st.gear.items.some(i => i.id === x.id); return `<div class="cm-li"><div class="main"><b style="color:${RARITY[x.rarity].color}">${esc(x.name)}</b><span>${SLOTS[x.slot]} · ${RARITY[x.rarity].name} · ${statTxt(x.stats)}${x.note ? ' · ' + esc(x.note) : ''}</span></div><div class="side">${own ? '<span class="cm-pill">已擁有</span>' : `<button class="cm-btn small green" data-buy="${x.id}">${money(x.price)}</button>`}</div></div>`; }).join('')}</div></div>`;
  el.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
    const x = itemById(b.dataset.buy);
    if (st.money.cash < x.price * (st.status.amateur ? 0.3 : 1)) return toast('資金不夠');
    spend(st, x.price, `購買 ${x.name}`);
    giveItem(st, x.id, true);
    localSave(st); toast(`買了 ${x.name}，已經裝備`); go('player', { t: 'shop' });
  });
}
function talent(el, st) {
  const p = st.player;
  el.innerHTML = `<div class="cm-card"><h3>天賦</h3><div class="cm-list">${p.talents.map(t => `<div class="cm-li"><div class="main"><b>${TALENTS[t].name}</b><span>${TALENTS[t].desc}</span></div></div>`).join('') || '<div class="cm-empty">還沒有天賦</div>'}</div></div>
    <div class="cm-card"><h3>球風</h3>${p.style ? `<p><b>${STYLES[p.style].name}</b>：${STYLES[p.style].desc}</p>` : '<p class="cm-note">青少年的最後一年決定球風；之前每一項的上限都是 99。</p>'}
      ${Object.keys(p.breaks || {}).length ? `<p class="cm-note" style="margin-top:6px">突破：${Object.entries(p.breaks).map(([k, v]) => `${STAT_ZH[k]} +${v}`).join('、')}</p>` : ''}</div>
    <div class="cm-card"><h3>身高與體型</h3><p class="cm-note">成年身高 ${p.height} cm（${p.age < 18 ? '還在長' : '已經長完'}）</p></div>`;
}

// ---------- 訓練關卡（練習場；比一般練球多一倍的經驗）----------
export async function trainingDrill(st, kind) {
  const t = TRAIN[kind];
  if (!t.drill) { toast('這一項沒有訓練關卡：用一般練球'); return false; }
  const age = st.player.age;
  let r;
  if (kind === 'long') r = await drill(st, { mode: 'range', balls: 10, title: '長桿訓練', goal: `一號木：飛超過 ${Math.round(140 + Math.max(0, age - 8) * 12)} 碼、左右 25 碼內算 1 分`, score: res => (res.result === 'rest' && res.carry / 0.9144 >= 140 + Math.max(0, age - 8) * 12 && Math.abs(res.offline / 0.9144) <= 25 ? 1 : 0) });
  else if (kind === 'iron') r = await ironDrill(st, 10);
  else if (kind === 'short') r = await drill(st, { mode: 'bunker', balls: 10, title: '沙坑與短桿', goal: '從沙坑打上果嶺、停在旗桿 5 碼內算 1 分', score: (res, g) => (res.result === 'holed' ? 2 : res.result === 'rest' && g.hole.distToPin(res.end[0], res.end[2]) <= 5 * 0.9144 ? 1 : 0) });
  else if (kind === 'putt') r = await drill(st, { mode: 'putt', balls: 12, title: '推桿訓練', goal: '推進 1 顆 = 1 分（點小地圖的果嶺可以換站位）', score: res => (res.result === 'holed' ? 1 : 0) });
  if (!r) return false;
  const pct = r.score / Math.max(1, r.n);
  const amt = (35 + pct * 55) * coachMul(st, kind) * lengthXp(st) * (st.player.talents.includes('grinder') ? 1.15 : 1);
  const g = train(st.player, kind, amt);
  addXp(st.player, 40 + r.score * 6);
  st.player.energy = clamp(st.player.energy - 8, 0, 100);
  localSave(st);
  await story({ small: 'TRAINING', title: `${t.name}：${r.score} 分`, paras: [`訓練經驗 +${Math.round(amt)}${g.length ? '，' + g.map(k => STAT_ZH[k] + ' +1').join('、') : ''}。`], skip: false });
  return true;
}
