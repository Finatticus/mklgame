// 球員：素質（基礎值、上限、訓練經驗、加成）、技能點、天賦、球風、技能卡、裝備（穿戴、升級、商店）、訓練關卡
import { register, go, toast, dialog, story, storyResult, refresh, bar } from './shell.js';
import { cur, localSave } from '../state.js';
import { esc, money, clamp } from '../util.js';
import { STAT_KEYS, STAT_ZH, GROUPS, GROUP_ZH, spendPoint, skillCost, capOf, TALENTS, STYLES, CARDS, cardSlots, TRAIN, train, trainNeed, effectiveStats, addXp, equippedItems, BONUS_CAP, setBonus, cardLv, cardUp, cardDesc, CARD_COST, xpForLevel, partStats } from '../growth.js';
import { ITEMS, SLOTS, RARITY, BRANDS, itemById, upgradeCost, CLOTHES, SLOT_GROUPS, FIT_SLOTS, FIT_COST, FIT_RESPEC, FEEL, FEEL_COST, SKIN_SLOT, SKIN_PRICE, BRAND_SET, SHAFT, GRIP, SHAFT_COST, GRIP_COST, PAINT_COST, ENGRAVE_COST, PAINTS, FITTING, PAINT_SLOT } from '../data/items.js';
import { SKINS } from '../../../js/progress.js';
import { giveItem, spend, lengthXp, coachMul, familyPart, FAMILY } from '../life.js';
const FAMILY_NAME = Object.fromEntries(Object.entries(FAMILY).map(([k, v]) => [k, v.name]));
import { ratingOf, driveCarry } from '../sim.js';
import { CHARACTERS } from '../../../js/config.js';
import { drill, ironDrill } from '../childhood.js';

register('player', (body, arg) => {
  const st = cur(); if (!st) return go('slots');
  const tab = (arg && arg.t) || 'stats';
  const back = st.ev && !st.ev.done ? `<button class="cm-btn green" id="pl-back" style="width:100%;margin-bottom:10px">回到比賽：${esc(st.ev.name || '')}</button>` : '';
  body.innerHTML = back + `<div class="cm-seg" style="margin-bottom:12px">${[['stats', '素質'], ['cards', '技能卡'], ['gear', '裝備'], ['shop', '商店'], ['talent', '天賦與球風']].map(([k, n]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${n}</button>`).join('')}</div><div id="pl-body"></div>`;
  body.querySelectorAll('[data-t]').forEach(b => b.onclick = () => go('player', { t: b.dataset.t }));
  if (back) document.getElementById('pl-back').onclick = () => go('event');
  ({ stats, cards, gear, shop, talent })[tab](document.getElementById('pl-body'), st);
});

function stats(el, st) {
  const p = st.player, eff = effectiveStats(st), R = ratingOf(eff);
  el.innerHTML = `<div class="cm-card"><h3>實力 <span class="num" style="font-size:26px">${R.toFixed(1)}</span><small>技能點 ${p.skillPts}</small></h3>
      <div class="cm-row wrap" style="font-size:12px;color:var(--mut)"><span>Lv.${p.level}</span><span>經驗 ${p.xp} / ${xpForLevel(p.level)}</span><span>一號木 Carry 約 <b class="num" style="color:var(--ink);font-size:15px">${driveCarry(eff.power, eff._spd)}</b> 碼</span><span>球風：${p.style ? STYLES[p.style].name : '青少年結束時決定'}</span></div>
      <p class="cm-note" style="margin-top:6px">基礎素質 + 裝備、手感、桿弟等加成（每項最多 +${BONUS_CAP}）= 上場的素質。直線是上限（球風決定）。</p></div>
    ${Object.entries(GROUPS).map(([g, keys]) => `<div class="cm-card"><h3>${GROUP_ZH[g]}</h3>${keys.map(k => {
      const v = p.stats[k], cap = capOf(p, k), e = eff[k], c = skillCost(v), tx = Math.round(p.trainXp[k] || 0);
      return `<div class="cm-statrow"><span>${STAT_ZH[k]}</span><div class="cap">${bar(v, 100, '')}<i class="cap-mark" style="left:${cap}%"></i><span class="cm-note">訓練 ${tx}/${trainNeed(v)}${Math.round(e - v) ? ` · 上場 ${Math.round(e)}` : ''}</span></div><span class="v">${v.toFixed(0)}</span><button data-k="${k}" ${p.skillPts < c || v >= cap ? 'disabled' : ''} title="花 ${c} 點">+</button></div>`;
    }).join('')}</div>`).join('')}`;
  el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { const err = spendPoint(p, b.dataset.k); if (err) toast(err); localSave(st); go('player', { t: 'stats' }); });
}

function cards(el, st) {
  const p = st.player, slots = cardSlots(p), use = p.cardUse || {};
  p.cardEq = (p.cardEq || []).filter(id => p.cards.includes(id)).slice(0, slots);
  const tab = st._cardTab || 'all';
  const list = Object.entries(CARDS).filter(([id]) => tab === 'all' || (tab === 'own' ? p.cards.includes(id) : !p.cards.includes(id)));
  el.innerHTML = `<div class="cm-card"><h3>技能卡<small>欄位 ${p.cardEq.length} / ${slots} · 已取得 ${p.cards.length} / ${Object.keys(CARDS).length}</small></h3>
      <p class="cm-note">特定情況生效的招牌技能。同一種誤差最多減到原本的 60%。欄位：Lv.1 有 2 格，每 15 級多 1 格（最多 7 格）。<br>
      <b>升級</b>：在自己打的回合裡，這張卡生效的擊球次數達到門檻（重來卡 = 用掉的次數），再花技能點（Lv.2 花 ${CARD_COST[1]} 點、Lv.3 花 ${CARD_COST[2]} 點）。Lv.2 效果 ×1.35、Lv.3 效果 ×1.7。模擬的洞不算次數。</p>
      <div class="cm-seg" style="margin-top:8px">${[['all', '全部'], ['own', '已取得'], ['lock', '未取得']].map(([k, n]) => `<button data-ct="${k}" class="${tab === k ? 'on' : ''}">${n}</button>`).join('')}</div></div>
    <div class="cm-card"><div class="cm-list">${list.map(([id, c]) => {
      const has = p.cards.includes(id), on = p.cardEq.includes(id), lv = cardLv(p, id), up = cardUp(id), n = use[id] || 0;
      const need = lv < 3 ? up[lv - 1] : 0, cost = lv < 3 ? CARD_COST[lv] : 0, ready = has && lv < 3 && n >= need;
      return `<div class="cm-li ${has ? '' : 'dim'}"><div class="main"><b>${c.name}${has ? ` <span class="cm-pill gold">Lv.${lv}</span>` : ''}${on ? ' <span class="cm-pill green">裝備中</span>' : ''}</b>
        <span>${esc(cardDesc(c, has ? lv : 1))}</span>
        <span>${has ? (lv < 3 ? `升級到 Lv.${lv + 1}（${esc(cardDesc(c, lv + 1))}）：${c.kind === 'mull' ? '用掉' : '生效'} ${Math.min(n, need)} / ${need} 次 ＋ 技能點 ${cost}` : '已經是最高等級') : '取得方式：' + esc(c.unlock)}</span></div>
        <div class="side">${has ? `<button class="cm-btn small ${on ? 'ghost' : 'green'}" data-c="${id}">${on ? '卸下' : '裝備'}</button>${ready ? `<button class="cm-btn small" data-up="${id}" ${p.skillPts < cost ? 'disabled' : ''}>升級</button>` : ''}` : ''}</div></div>`;
    }).join('') || '<div class="cm-empty">沒有卡片</div>'}</div></div>`;
  el.querySelectorAll('[data-ct]').forEach(b => b.onclick = () => { st._cardTab = b.dataset.ct; cards(el, st); });
  el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => {
    const id = b.dataset.c;
    if (p.cardEq.includes(id)) p.cardEq = p.cardEq.filter(x => x !== id);
    else if (p.cardEq.length >= slots) return toast('技能卡欄位已滿');
    else p.cardEq.push(id);
    localSave(st); cards(el, st);
  });
  el.querySelectorAll('[data-up]').forEach(b => b.onclick = () => {
    const id = b.dataset.up, lv = cardLv(p, id), cost = CARD_COST[lv];
    if (p.skillPts < cost) return toast(`技能點不夠（需要 ${cost} 點）`);
    p.skillPts -= cost; p.cardLv = { ...(p.cardLv || {}), [id]: lv + 1 };
    localSave(st); toast(`「${CARDS[id].name}」升到 Lv.${lv + 1}`); cards(el, st);
  });
}

// 裝備的能力（含強化等級：每升 1 級 ×1.25）
const lvStats = it => Object.fromEntries(Object.entries(it.stats || {}).map(([k, v]) => [k, Math.round(v * (1 + ((it.lv || 1) - 1) * 0.25) * 10) / 10]));
const statTxt = s => Object.entries(s || {}).map(([k, v]) => `${STAT_ZH[k]} ${v > 0 ? '+' : ''}${v}`).join('、') || '（外觀）';
const itemTxt = it => statTxt(lvStats(it));
// 價格標示：業餘時期家人分擔的部分
function priceTxt(st, amt) {
  const fam = familyPart(st, amt);
  return fam ? `${money(amt)}（家人出 ${money(fam)}，你付 ${money(amt - fam)}）` : money(amt);
}
function gear(el, st) {
  const eq = st.gear.eq;
  // 裝備的總加成：每一項的合計（含強化）、套裝、桿弟；超過 +8 的部分不算
  const tot = {};
  for (const it of equippedItems(st)) for (const [k, v] of Object.entries(lvStats(it))) tot[k] = (tot[k] || 0) + v;
  const set = setBonus(st);
  for (const k in set) tot[k] = (tot[k] || 0) + set[k];
  // 工坊訂製與手感也算進去
  for (const [slot, f] of Object.entries(st.fit || {})) {
    if (f && f.stat && f.lv) tot[f.stat] = (tot[f.stat] || 0) + f.lv;
    const ps = partStats(slot, f); for (const k in ps) tot[k] = (tot[k] || 0) + ps[k];
  }
  const rows = STAT_KEYS.filter(k => tot[k]).map(k => { const v = Math.round(tot[k] * 10) / 10, cap = Math.max(-8, Math.min(BONUS_CAP, v)); return `<span class="${v < 0 ? 'neg' : ''}">${STAT_ZH[k]} ${v > 0 ? '+' : ''}${v}${cap !== v ? `（算 ${cap > 0 ? '+' : ''}${cap}）` : ''}</span>`; });
  el.innerHTML = `<div class="cm-card"><h3>裝備的總加成</h3>${rows.length ? `<div class="cm-chips">${rows.join('')}</div>` : '<p class="cm-note">目前沒有加成</p>'}
      <p class="cm-note" style="margin-top:8px">強化 1 級 = 這件裝備的能力 ×1.25（Lv.5 = ×2）。每項加成（裝備 + 套裝 + 桿弟）合計最多 +${BONUS_CAP}。品牌套裝：同一品牌穿 3 件、5 件各有效果（${Object.entries(BRAND_SET).map(([b, v]) => `${BRANDS[b]} ${Object.keys(v[0]).map(k => STAT_ZH[k]).join('')}`).join('、')}），聯名套裝穿齊 4 件讀果嶺、抗壓 +1${Object.keys(set).length ? '（目前生效：' + Object.entries(set).map(([k, v]) => `${STAT_ZH[k]} +${v}`).join('、') + '）' : ''}。外觀與能力可以分開（「只換外觀」）。</p></div>
    ${Object.entries(SLOT_GROUPS).map(([g, slots]) => `<div class="cm-card"><h3>${g}</h3><div class="cm-list">${slots.map(s => { const it = st.gear.items.find(x => x.uid === eq[s]); const n = st.gear.items.filter(x => x.slot === s).length; return `<div class="cm-li click" data-s="${s}"><div class="main"><b>${SLOTS[s]}：${it ? esc(it.name) : '—'}</b><span>${it ? `<span style="color:${RARITY[it.rarity].color}">${RARITY[it.rarity].name}</span> · Lv.${it.lv} · ${itemTxt(it)}` : '沒有裝備'} · 擁有 ${n} 件</span></div><div class="side">›</div></div>`; }).join('')}</div></div>`).join('')}`;
  el.querySelectorAll('[data-s]').forEach(b => b.onclick = () => slotDlg(st, b.dataset.s));
  if (!st.status.amateur) { el.insertAdjacentHTML('beforeend', workshopHtml(st)); bindWorkshop(el, st); }
}
// ---------- 球具工坊（職業）：訂製方向與等級、桿頭手感、桿身、握把、自選顏色、刻字、星星商店造型；試桿日 ----------
const HEX = n => '#' + (n >>> 0).toString(16).padStart(6, '0');
const NUM = h => parseInt(String(h).replace('#', ''), 16);
const recOf = (st, slot, kind, id) => { const f = st.fitting; return !!(f && f.y >= st.year - 1 && f.rec && f.rec[slot] && f.rec[slot][kind] === id); };
const priceOf = (st, slot, kind, id, base) => Math.round(base * (recOf(st, slot, kind, id) ? FITTING.discount : 1));
function workshopHtml(st) {
  const fit = st.fit || {}, F = st.fitting;
  const partTxt = (s, f) => [FEEL[s] && (FEEL[s].find(x => x[0] === (f.feel || 'std')) || [])[1], SHAFT[s] && (SHAFT[s].find(x => x[0] === (f.shaft || 'std')) || [])[1], s !== 'ball' && (GRIP[s === 'putter' ? 'putter' : 'club'].find(x => x[0] === (f.grip || 'std')) || [])[1]].filter(Boolean).join('、');
  return `<div class="cm-card"><h3>球具工坊<small>職業選手的量身訂製</small></h3><p class="cm-note">每個部位：訂製方向（一項素質 +1~+3）、桿頭、桿身、握把（各是一項 +1、一項 −1 的取捨）、自選桿頭 / 桿身 / 握把顏色或星星商店的造型（比賽的 3D 畫面看得到）、刻字。全部計入加成上限 +${BONUS_CAP}。</p>
    <div class="cm-row wrap" style="margin:8px 0"><button class="cm-btn green" id="ws-fit">試桿日（練習場打 6 球）</button><button class="cm-btn ghost" id="ws-fitsim">試桿日（快速分析）</button></div>
    ${F && F.y >= st.year - 1 ? `<p class="cm-note" style="color:var(--aug)">${F.y} 年試桿建議（建議的零件 ${Math.round((1 - FITTING.discount) * 100)}% off，到 ${F.y + 1} 年底）：${esc(F.text)}</p>` : '<p class="cm-note">還沒做過試桿：做完會依你的揮桿數據建議桿頭、桿身、握把，建議的零件打 7 折。</p>'}
    <div class="cm-list">${Object.keys(FIT_SLOTS).map(s => { const f = fit[s] || {}, sk = SKIN_SLOT[s] && (st.clubLook || {})[SKIN_SLOT[s]], col = PAINT_SLOT[s] && (st.clubColor || {})[PAINT_SLOT[s]];
      return `<div class="cm-li click" data-ws="${s}"><div class="main"><b>${SLOTS[s]}${f.engrave ? ` <span class="cm-pill">「${esc(f.engrave)}」</span>` : ''}</b><span>${f.stat ? `${STAT_ZH[f.stat]} +${f.lv}` : '還沒訂製'} · ${partTxt(s, f)}${col ? ` · <i class="ws-sw" style="background:${HEX(col.head)}"></i><i class="ws-sw" style="background:${HEX(col.shaft)}"></i><i class="ws-sw" style="background:${HEX(col.grip)}"></i>` : sk ? ' · 外觀：' + esc((SKINS.find(x => x.id === sk) || {}).name || '') : ''}</span></div><div class="side">›</div></div>`; }).join('')}</div></div>`;
}
function bindWorkshop(el, st) {
  el.querySelectorAll('[data-ws]').forEach(b => b.onclick = () => workshopDlg(st, b.dataset.ws));
  const a = document.getElementById('ws-fit'); if (a) a.onclick = () => fittingDay(st, false);
  const b = document.getElementById('ws-fitsim'); if (b) b.onclick = () => fittingDay(st, true);
}
function workshopDlg(st, slot) {
  st.fit = st.fit || {};
  const f = st.fit[slot] = st.fit[slot] || {}, lv = f.lv || 0, sk = SKIN_SLOT[slot], curSkin = sk && (st.clubLook || {})[sk];
  const ps = PAINT_SLOT[slot], col = ps && (st.clubColor || {})[ps];
  const skins = sk ? SKINS.filter(x => x.slot === sk && (x.price || x.std)) : [];
  const gripList = slot === 'ball' ? [] : GRIP[slot === 'putter' ? 'putter' : 'club'];
  const effTxt = eff => Object.entries(eff).map(([k, v]) => `${STAT_ZH[k]} ${v > 0 ? '+' : ''}${v}`).join(' ');
  const seg = (kind, list, cur, base) => `<div class="cm-seg wrap">${list.map(([id, n, eff]) => `<button data-${kind}="${id}" class="${(cur || 'std') === id ? 'on' : ''}">${n}${recOf(st, slot, kind, id) ? ' ★' : ''}${Object.keys(eff).length ? '<br><small>' + effTxt(eff) + '</small>' : ''}${(cur || 'std') !== id && id !== 'std' ? `<br><small>${money(priceOf(st, slot, kind, id, base), { short: true })}</small>` : ''}</button>`).join('')}</div>`;
  const sw = (part, v) => `<div class="ws-paint" data-part="${part}">${PAINTS.map(c => `<i class="ws-sw big ${v != null && NUM(c) === v ? 'on' : ''}" data-c="${c}" style="background:${c}"></i>`).join('')}<input type="color" value="${v != null ? HEX(v) : '#d8dde0'}" data-cp="${part}"></div>`;
  const tot = partStats(slot, f);
  dialog(`<p class="cm-note">這個部位的零件合計：${effTxt(tot) || '沒有增減'}${f.stat ? `；訂製 ${STAT_ZH[f.stat]} +${lv}` : ''}。★ = 試桿日的建議（7 折）。</p>
    <h4 style="margin:10px 0 6px">訂製方向</h4>
    <div class="cm-list">${FIT_SLOTS[slot].map(k => `<div class="cm-li"><div class="main"><b>${STAT_ZH[k]}${f.stat === k ? ' <span class="cm-pill green">目前</span>' : ''}</b><span>${f.stat === k ? (lv < 3 ? `升到 +${lv + 1}：${money(FIT_COST[lv])}` : '已經是最高 +3') : lv ? `改成這一項（等級保留）：${money(FIT_RESPEC)}` : `訂製 +1：${money(FIT_COST[0])}`}</span></div>
      <div class="side">${f.stat === k ? (lv < 3 ? `<button class="cm-btn small green" data-fit="${k}">升級</button>` : '') : `<button class="cm-btn small ${lv ? 'ghost' : 'green'}" data-fit="${k}">${lv ? '改方向' : '訂製'}</button>`}</div></div>`).join('')}</div>
    ${FEEL[slot] ? `<h4 style="margin:12px 0 6px">${slot === 'ball' ? '球心' : '桿頭'}（換一次 ${money(FEEL_COST)}）</h4>${seg('feel', FEEL[slot], f.feel, FEEL_COST)}` : ''}
    ${SHAFT[slot] ? `<h4 style="margin:12px 0 6px">桿身（換一次 ${money(SHAFT_COST)}）</h4>${seg('shaft', SHAFT[slot], f.shaft, SHAFT_COST)}` : ''}
    ${gripList.length ? `<h4 style="margin:12px 0 6px">握把（換一次 ${money(GRIP_COST)}）</h4>${seg('grip', gripList, f.grip, GRIP_COST)}` : ''}
    ${ps ? `<h4 style="margin:12px 0 6px">自選顏色（烤漆 ${money(PAINT_COST)}，套用後取代星星商店的造型）</h4>
      <div class="ws-prev"><i style="background:${HEX(col ? col.head : 0xd8dde0)}" id="ws-ph"></i><i style="background:${HEX(col ? col.shaft : 0xd8dde0)}" id="ws-ps"></i><i style="background:${HEX(col ? col.grip : 0x1b1b1b)}" id="ws-pg"></i></div>
      <p class="cm-note">桿頭</p>${sw('head', col ? col.head : null)}<p class="cm-note">桿身</p>${sw('shaft', col ? col.shaft : null)}<p class="cm-note">握把</p>${sw('grip', col ? col.grip : null)}
      <label class="cm-note" style="display:block;margin-top:6px"><input type="checkbox" id="ws-metal" ${!col || col.metal ? 'checked' : ''}> 金屬光澤</label>
      <div class="cm-row wrap" style="margin-top:6px"><button class="cm-btn small green" id="ws-paint">套用顏色</button>${col ? '<button class="cm-btn small ghost" id="ws-unpaint">改回原廠顏色</button>' : ''}</div>` : ''}
    ${skins.length ? `<h4 style="margin:12px 0 6px">星星商店的造型（星星數 × ${money(SKIN_PRICE)}，買過可以隨時換）</h4><div class="cm-list">${skins.map(x => { const owned = x.std || (st.skinsOwned || []).includes(x.id); const on = !col && ((curSkin || 'std') === x.id || (!curSkin && x.std));
      return `<div class="cm-li"><div class="main"><b>${esc(x.name)}${on ? ' <span class="cm-pill green">使用中</span>' : ''}</b><span>${esc(x.desc || '')}</span></div><div class="side">${on ? '' : `<button class="cm-btn small ${owned ? 'ghost' : 'green'}" data-skin="${x.id}">${owned ? '換上' : money(x.price * SKIN_PRICE, { short: true })}</button>`}</div></div>`; }).join('')}</div>` : ''}
    ${slot !== 'ball' ? `<h4 style="margin:12px 0 6px">刻字（${money(ENGRAVE_COST)}，最多 8 個字）</h4><div class="cm-row"><input id="ws-eng" maxlength="8" value="${esc(f.engrave || '')}" placeholder="例如：家人的名字" style="flex:1"><button class="cm-btn small ghost" id="ws-engb">刻上去</button></div>` : ''}`, {
    title: `球具工坊 · ${SLOTS[slot]}`, wide: true, bind: (ov, close) => {
      const done = () => { localSave(st); close(); go('player', { t: 'gear' }); };
      const pay = (c, what) => { if (st.money.cash < c) { toast('資金不夠'); return false; } spend(st, c, `球具工坊：${SLOTS[slot]}${what}`); return true; };
      ov.querySelectorAll('[data-fit]').forEach(b => b.onclick = () => {
        const k = b.dataset.fit, c = f.stat === k ? FIT_COST[lv] : lv ? FIT_RESPEC : FIT_COST[0];
        if (!pay(c, `${f.stat === k || !lv ? '訂製' : '改方向'}（${STAT_ZH[k]}）`)) return;
        if (f.stat === k) f.lv = lv + 1; else if (lv) f.stat = k; else { f.stat = k; f.lv = 1; }
        toast(`${SLOTS[slot]}：${STAT_ZH[f.stat]} +${f.lv}`); done();
      });
      for (const [kind, base, name] of [['feel', FEEL_COST, slot === 'ball' ? '球心' : '桿頭'], ['shaft', SHAFT_COST, '桿身'], ['grip', GRIP_COST, '握把']]) {
        ov.querySelectorAll(`[data-${kind}]`).forEach(b => b.onclick = () => {
          const id = b.dataset[kind]; if ((f[kind] || 'std') === id) return;
          if (id !== 'std' && !pay(priceOf(st, slot, kind, id, base), `換${name}`)) return;
          f[kind] = id; done();
        });
      }
      // 自選顏色
      const pick = { head: col ? col.head : 0xd8dde0, shaft: col ? col.shaft : 0xd8dde0, grip: col ? col.grip : 0x1b1b1b };
      const prev = () => { const h = ov.querySelector('#ws-ph'), s = ov.querySelector('#ws-ps'), g = ov.querySelector('#ws-pg'); if (h) { h.style.background = HEX(pick.head); s.style.background = HEX(pick.shaft); g.style.background = HEX(pick.grip); } };
      ov.querySelectorAll('.ws-paint').forEach(row => {
        const part = row.dataset.part;
        row.querySelectorAll('[data-c]').forEach(c => c.onclick = () => { pick[part] = NUM(c.dataset.c); row.querySelectorAll('.ws-sw').forEach(x => x.classList.toggle('on', x === c)); prev(); });
        const cp = row.querySelector('[data-cp]'); if (cp) cp.oninput = () => { pick[part] = NUM(cp.value); row.querySelectorAll('.ws-sw').forEach(x => x.classList.remove('on')); prev(); };
      });
      const pb = ov.querySelector('#ws-paint'); if (pb) pb.onclick = () => { if (!pay(PAINT_COST, '烤漆')) return; st.clubColor = { ...(st.clubColor || {}), [ps]: { ...pick, metal: ov.querySelector('#ws-metal').checked } }; toast('烤漆完成，比賽時就看得到'); done(); };
      const ub = ov.querySelector('#ws-unpaint'); if (ub) ub.onclick = () => { const c = { ...(st.clubColor || {}) }; delete c[ps]; st.clubColor = c; done(); };
      ov.querySelectorAll('[data-skin]').forEach(b => b.onclick = () => {
        const x = SKINS.find(z => z.slot === sk && z.id === b.dataset.skin); if (!x) return;
        st.skinsOwned = st.skinsOwned || [];
        if (!x.std && !st.skinsOwned.includes(x.id)) { if (!pay(x.price * SKIN_PRICE, `造型 ${x.name}`)) return; st.skinsOwned.push(x.id); }
        st.clubLook = { ...(st.clubLook || {}), [sk]: x.std ? null : x.id };
        if (ps && st.clubColor) { const c = { ...st.clubColor }; delete c[ps]; st.clubColor = c; }      // 換成造型就不用自選顏色
        done();
      });
      const eb = ov.querySelector('#ws-engb'); if (eb) eb.onclick = () => { const v = ov.querySelector('#ws-eng').value.trim().slice(0, 8); if (!pay(ENGRAVE_COST, '刻字')) return; f.engrave = v; done(); };
    },
  });
}
// 試桿日：打 6 球（或快速分析），依距離、左右散布、彈道高度建議零件
async function fittingDay(st, sim) {
  if (st.money.cash < FITTING.cost) return toast('資金不夠');
  spend(st, FITTING.cost, '試桿日（球具商的試桿車）');
  const shots = [];
  if (sim) {
    const e = effectiveStats(st), r = Math.random;
    for (let i = 0; i < 6; i++) shots.push({ carry: driveCarry(e.power, e._spd) * (0.94 + r() * 0.08), side: (r() - 0.5) * (40 - e.accuracy * 0.3), apex: 28 + (e.launch - 60) * 0.25 + (r() - 0.5) * 4 });
  } else {
    await drill(st, { mode: 'range', balls: 6, title: '試桿日', goal: '用一號木全力打 6 球，工坊會記錄距離、左右與彈道', score: res => { shots.push({ carry: res.carry / 0.9144, side: res.offline / 0.9144, apex: res.apex || 30 }); return 1; } });
  }
  if (!shots.length) return;
  const avg = a => a.reduce((s, x) => s + x, 0) / a.length;
  const carry = avg(shots.map(s => s.carry)), spread = Math.sqrt(avg(shots.map(s => s.side * s.side))), apex = avg(shots.map(s => s.apex));
  const e = effectiveStats(st), expect = driveCarry(e.power, e._spd);
  const rec = { driver: {}, irons: {}, putter: {} }, why = [];
  if (spread > 14) { rec.driver.shaft = 'lowtq'; rec.irons.grip = 'mid'; why.push(`左右散布 ±${spread.toFixed(0)} 碼偏大 → 低扭力桿身、加粗握把`); }
  else if (carry < expect * 0.97) { rec.driver.shaft = 'light'; rec.irons.shaft = 'graph'; why.push(`Carry ${carry.toFixed(0)} 碼比預期短 → 輕量桿身、碳纖維鐵桿桿身`); }
  else { rec.driver.shaft = 'tour'; rec.irons.shaft = 'steel'; why.push(`距離與方向都穩（Carry ${carry.toFixed(0)}、左右 ±${spread.toFixed(0)}）→ 巡迴硬桿身`); }
  if (apex < 26) { rec.driver.feel = 'high'; why.push(`彈道偏低（最高 ${apex.toFixed(0)} 公尺）→ 高拋重心桿頭`); }
  else if (apex > 36) { rec.driver.feel = 'low'; why.push(`彈道偏高（最高 ${apex.toFixed(0)} 公尺）→ 低旋重心桿頭`); }
  rec.putter.grip = e.touch >= e.line ? 'jumbo' : 'pistol'; why.push(`推桿：${e.touch >= e.line ? '方向比距離感弱 → 超粗握把' : '距離感比方向弱 → 手槍型握把'}`);
  st.fitting = { y: st.year, rec, text: why.join('；'), data: { carry: Math.round(carry), spread: Math.round(spread), apex: Math.round(apex) } };
  localSave(st);
  await storyResult('試桿日的報告', `Carry 平均 ${carry.toFixed(0)} 碼、左右散布 ±${spread.toFixed(0)} 碼、彈道最高 ${apex.toFixed(0)} 公尺。`, why);
  go('player', { t: 'gear' });
}
function slotDlg(st, slot) {
  const own = st.gear.items.filter(x => x.slot === slot);
  dialog(`<div class="cm-list">${own.map(it => { const nxt = { ...it, lv: (it.lv || 1) + 1 }; return `<div class="cm-li"><div class="main"><b style="color:${RARITY[it.rarity].color}">${esc(it.name)} Lv.${it.lv}</b><span>${itemTxt(it)}${it.brand && BRANDS[it.brand] ? ' · ' + BRANDS[it.brand] : ''}</span>
      ${it.rarity !== 'champ' && it.lv < 5 && Object.keys(it.stats || {}).length ? `<span>強化到 Lv.${it.lv + 1}：${itemTxt(nxt)} · 費用 ${priceTxt(st, upgradeCost(it))}</span>` : ''}${itemById(it.id) && itemById(it.id).note ? `<span>${esc(itemById(it.id).note)}</span>` : ''}</div><div class="side">
      ${st.gear.eq[slot] === it.uid ? '<span class="cm-pill green">裝備中</span>' : `<button class="cm-btn small green" data-eq="${it.uid}">裝備</button>`}
      ${it.rarity !== 'champ' && it.lv < 5 && Object.keys(it.stats || {}).length ? `<button class="cm-btn small ghost" data-up="${it.uid}">強化</button>` : ''}
      ${CLOTHES.includes(slot) ? `<button class="cm-btn small ghost" data-look="${it.uid}">只換外觀</button>` : ''}</div></div>`; }).join('') || '<div class="cm-empty">這個部位沒有裝備，去商店看看</div>'}</div>`, {
    title: SLOTS[slot], wide: true, bind: (ov, close) => {
      ov.querySelectorAll('[data-eq]').forEach(b => b.onclick = () => { st.gear.eq[slot] = b.dataset.eq; localSave(st); close(); go('player', { t: 'gear' }); });
      ov.querySelectorAll('[data-up]').forEach(b => b.onclick = () => {
        const it = st.gear.items.find(x => x.uid === b.dataset.up), c = upgradeCost(it), pay = c - familyPart(st, c);
        if (st.money.cash < pay) return toast('資金不夠');
        spend(st, c, `強化 ${it.name}（Lv.${it.lv} → ${it.lv + 1}）`); it.lv++; localSave(st);
        toast(`${it.name} 強化到 Lv.${it.lv}：${itemTxt(it)}`); close(); slotDlg(st, slot);
      });
      ov.querySelectorAll('[data-look]').forEach(b => b.onclick = () => { const it = st.gear.items.find(x => x.uid === b.dataset.look); st.lookOverride = { ...(st.lookOverride || {}), ...(it.look || {}) }; localSave(st); toast('外觀已更換（能力照原本的裝備）'); close(); });
    },
  });
}
// 買得到嗎：14 歲以前只有一般 / 精良；傳奇要職業選手或 Lv.25 以上
function canBuy(st, x) {
  const p = st.player;
  if (p.age < 14 && !['common', 'fine'].includes(x.rarity)) return '14 歲以後';
  if (x.rarity === 'legend' && st.status.amateur && p.level < 25) return '職業選手或 Lv.25 以上';
  if (x.kid && p.age >= 14) return '兒童尺寸（14 歲以前）';
  if (x.season && (st.week < x.season[0] || st.week > x.season[1])) return `限定：第 ${x.season[0]}~${x.season[1]} 週`;
  if (x.spon && !st.sponsors.some(s => s.name === x.spon && ['apparel', 'equipment', 'ball', 'putter'].includes(s.kind))) return `${x.spon} 簽約球員專屬`;
  return '';
}
function shop(el, st) {
  const g = st._shopG || '球具', slot = st._shopS || 'all';
  const slots = SLOT_GROUPS[g];
  const list = ITEMS.filter(x => x.rarity !== 'champ' && slots.includes(x.slot) && (slot === 'all' || x.slot === slot)).sort((a, b) => slots.indexOf(a.slot) - slots.indexOf(b.slot) || a.price - b.price);
  const cmp = x => {
    const cur = st.gear.items.find(i => i.uid === st.gear.eq[x.slot]); if (!cur) return '';
    const a = lvStats(cur), b = x.stats || {}, keys = new Set([...Object.keys(a), ...Object.keys(b)]), d = [];
    for (const k of keys) { const v = Math.round(((b[k] || 0) - (a[k] || 0)) * 10) / 10; if (v) d.push(`${STAT_ZH[k]} ${v > 0 ? '+' : ''}${v}`); }
    return d.length ? `和目前的 ${cur.name} 比：${d.join('、')}` : `和目前的 ${cur.name} 一樣`;
  };
  el.innerHTML = `<div class="cm-card"><h3>球具店<small>資金 ${money(st.money.cash)}</small></h3>
      <p class="cm-note">${st.status.amateur ? `業餘時期家人會分擔一部分（${FAMILY_NAME[st.player.family] || ''}，家人關係越好分擔越多），價格旁邊標示你實際要付的錢。` : '職業選手全部自己付。'}14 歲以前只有一般與精良的裝備；傳奇裝備要轉職業或 Lv.25 以上。</p>
      <div class="cm-seg" style="margin-top:8px">${Object.keys(SLOT_GROUPS).map(k => `<button data-g="${k}" class="${g === k ? 'on' : ''}">${k}</button>`).join('')}</div>
      <div class="cm-chips sel" style="margin-top:8px">${['all', ...slots].map(s => `<span data-sl="${s}" class="${slot === s ? 'on' : ''}">${s === 'all' ? '全部' : SLOTS[s]}</span>`).join('')}</div></div>
    <div class="cm-card"><div class="cm-list">${list.map(x => {
      const own = st.gear.items.some(i => i.id === x.id), why = canBuy(st, x);
      return `<div class="cm-li ${why && !own ? 'dim' : ''}"><div class="main"><b style="color:${RARITY[x.rarity].color}">${esc(x.name)}${x.season ? ' <span class="cm-pill gold">季節限定</span>' : ''}${x.spon ? ' <span class="cm-pill gold">贊助商專屬</span>' : ''}${x.set ? ' <span class="cm-pill">聯名</span>' : ''}</b><span>${SLOTS[x.slot]} · ${RARITY[x.rarity].name}${x.brand && BRANDS[x.brand] ? ' · ' + BRANDS[x.brand] : ''} · ${statTxt(x.stats)}${x.note ? ' · ' + esc(x.note) : ''}</span>
        ${!own ? `<span>${cmp(x)}</span><span>${x.spon ? '簽約球員免費領取 · 穿著時每週贊助商好感 +0.3' : '價格 ' + priceTxt(st, x.price)}</span>` : ''}</div>
        <div class="side">${own ? '<span class="cm-pill">已擁有</span>' : why ? `<span class="cm-pill red">${esc(why)}</span>` : `<button class="cm-btn small green" data-buy="${x.id}">${x.spon ? '領取' : '購買'}</button>`}</div></div>`;
    }).join('') || '<div class="cm-empty">沒有商品</div>'}</div></div>`;
  el.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { st._shopG = b.dataset.g; st._shopS = 'all'; shop(el, st); });
  el.querySelectorAll('[data-sl]').forEach(b => b.onclick = () => { st._shopS = b.dataset.sl; shop(el, st); });
  el.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
    const x = itemById(b.dataset.buy), pay = x.price - familyPart(st, x.price);
    if (st.money.cash < pay) return toast(`資金不夠（你要付 ${money(pay)}）`);
    const paid = spend(st, x.price, `購買 ${x.name}`);
    giveItem(st, x.id, true);
    localSave(st); toast(`買了 ${x.name}，已經裝備（你付 ${money(paid)}${paid < x.price ? `，家人出 ${money(x.price - paid)}` : ''}）`); shop(el, st);
  });
}
function talent(el, st) {
  const p = st.player, model = p.look.model || 'classic';
  el.innerHTML = `<div class="cm-card"><h3>角色外觀</h3><div class="cm-seg" style="flex-wrap:wrap">${CHARACTERS.map(c => `<button data-model="${c.id}" class="${model === c.id ? 'on' : ''}">${c.id === 'classic' ? '經典' : esc(c.name)}</button>`).join('')}</div>
      <p class="cm-note" style="margin-top:6px">經典角色的上衣、褲子、帽子跟著裝備換顏色；寫實角色的外觀由模型決定（第一次選用要下載約 1.5～6 MB）。</p></div>
    <div class="cm-card"><h3>天賦</h3><div class="cm-list">${p.talents.map(t => `<div class="cm-li"><div class="main"><b>${TALENTS[t].name}</b><span>${TALENTS[t].desc}</span></div></div>`).join('') || '<div class="cm-empty">還沒有天賦</div>'}</div></div>
    <div class="cm-card"><h3>球風</h3>${p.style ? `<p><b>${STYLES[p.style].name}</b>：${STYLES[p.style].desc}</p>` : '<p class="cm-note">青少年的最後一年決定球風；之前每一項的上限都是 99。</p>'}
      ${Object.keys(p.breaks || {}).length ? `<p class="cm-note" style="margin-top:6px">突破：${Object.entries(p.breaks).map(([k, v]) => `${STAT_ZH[k]} +${v}`).join('、')}</p>` : ''}</div>
    <div class="cm-card"><h3>身高與體型</h3><p class="cm-note">成年身高 ${p.height} cm（${p.age < 18 ? '還在長' : '已經長完'}）</p></div>`;
  el.querySelectorAll('[data-model]').forEach(b => b.onclick = () => { p.look.model = b.dataset.model === 'classic' ? undefined : b.dataset.model; localSave(st); talent(el, st); toast('角色外觀已更換（下一輪開始生效）'); });
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
