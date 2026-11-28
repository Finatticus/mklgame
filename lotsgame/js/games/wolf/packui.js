// 狼群模式的畫面：領地地圖、營地、出征前確認、戰後結算、收服
import * as store from '../../store.js';
import * as audio from '../../audio.js';
import { h, fmt, toast, modal, confirmBox, loadImage, asset } from '../../ui.js';
import { REGIONS, FACTIONS, BREEDS, BUILDINGS, regionById, newCampaign, owned, canAttack, ownedCount, healthyWolves, income, upkeep, battleSpec, endDay, resolveThreat, afterBattle, addWolf, hunt, packCap, allyStats, xpToNext, BATTLE_ALLIES, WOLF_MAX_LV } from './pack.js';

// ---------------- 領地地圖（Voronoi 分區，用遊戲本身的地面貼圖上色） ----------------
function clipPoly(poly, a, b, c) { // 保留 a*x + b*y <= c 的部分
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const fp = a * p[0] + b * p[1] - c, fq = a * q[0] + b * q[1] - c;
    if (fp <= 0) out.push(p);
    if ((fp < 0) !== (fq < 0) && fp !== fq) { const t = fp / (fp - fq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
  }
  return out;
}
function cells(W, H, pad) {
  const pts = REGIONS.map((r) => [r.x * W, r.y * H]);
  return pts.map((p, i) => {
    let poly = [[pad, pad], [W - pad, pad], [W - pad, H - pad], [pad, H - pad]];
    pts.forEach((q, j) => {
      if (i === j) return;
      const a = q[0] - p[0], b = q[1] - p[1], c = (q[0] * q[0] + q[1] * q[1] - p[0] * p[0] - p[1] * p[1]) / 2;
      poly = clipPoly(poly, a, b, c);
    });
    return poly;
  });
}
// 邊界加上自然的起伏：以端點排序後的固定方向計算，相鄰兩區算出來的點一模一樣
function wobble(poly, W, H, pad) {
  const out = [];
  const n = (x, y) => Math.sin(x * 0.051 + y * 0.083) * 0.6 + Math.sin(x * 0.13 - y * 0.071) * 0.4;
  const onFrame = (p) => Math.abs(p[0] - pad) < 0.5 || Math.abs(p[1] - pad) < 0.5 || Math.abs(p[0] - (W - pad)) < 0.5 || Math.abs(p[1] - (H - pad)) < 0.5;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    out.push(p);
    if (onFrame(p) && onFrame(q)) continue; // 外框不加起伏
    const swap = p[0] > q[0] || (p[0] === q[0] && p[1] > q[1]);
    const A = swap ? q : p, B = swap ? p : q;
    const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const seg = Math.max(1, Math.round(len / (W * 0.035)));
    const nx = -(B[1] - A[1]) / (len || 1), ny = (B[0] - A[0]) / (len || 1);
    const mid = [];
    for (let k = 1; k < seg; k++) {
      const t = k / seg, x = A[0] + (B[0] - A[0]) * t, y = A[1] + (B[1] - A[1]) * t;
      const o = n(x, y) * W * 0.014 * Math.sin(Math.PI * t);
      mid.push([x + nx * o, y + ny * o]);
    }
    out.push(...(swap ? mid.reverse() : mid));
  }
  return out;
}

let texCache = null;
async function textures() {
  if (!texCache) texCache = Promise.all(['forest_leaves_04', 'forest_leaves_03', 'snow_02', 'burned_ground_01'].map((n) => loadImage(asset('wolf/ground/' + n + '_diff.jpg'))));
  return texCache;
}

export async function drawMap(cv, c, sel) {
  const r = cv.getBoundingClientRect();
  const dpr = Math.min(2, devicePixelRatio || 1);
  const W = r.width, H = r.height;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const [leaf, leaf2, snow, burnt] = await textures();
  const pat = (img, s) => { const p = g.createPattern(img, 'repeat'); p.setTransform(new DOMMatrix().scale(s)); return p; };
  const P = { forest: pat(leaf, W / 2600), forest2: pat(leaf2, W / 2400), frost: pat(snow, W / 2400), frost2: pat(burnt, W / 2600) };
  g.fillStyle = '#07080b'; g.fillRect(0, 0, W, H);
  const pad = W * 0.03;
  const polys = cells(W, H, pad).map((p) => wobble(p, W, H, pad));
  cv._polys = polys;
  const t = performance.now() / 1000;
  REGIONS.forEach((reg, i) => {
    const poly = polys[i];
    g.save();
    g.beginPath(); poly.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
    g.clip();
    g.fillStyle = P[reg.biome]; g.fillRect(0, 0, W, H);
    // 第二種地面：雪原裡的焦土、林地裡的深色落葉
    g.globalAlpha = 0.3; g.fillStyle = P[reg.biome + '2'];
    g.fillRect(0, 0, W, H); g.globalAlpha = 1;
    const cx = reg.x * W, cy = reg.y * H, rg = g.createRadialGradient(cx, cy, 0, cx, cy, W * 0.24);
    // 光影：我方領地有月光、敵方陰暗
    const mine = owned(c, reg.id);
    rg.addColorStop(0, mine ? 'rgba(190,205,255,0.18)' : 'rgba(0,0,0,0.35)');
    rg.addColorStop(1, mine ? 'rgba(10,12,20,0.35)' : 'rgba(0,0,0,0.72)');
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
    if (!mine) { const fc = FACTIONS[c.owner[reg.id]].color; g.fillStyle = `rgba(${fc[0]},${fc[1]},${fc[2]},0.08)`; g.fillRect(0, 0, W, H); }
    g.restore();
  });
  // 邊界
  polys.forEach((poly, i) => {
    const reg = REGIONS[i];
    g.beginPath(); poly.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
    g.lineWidth = 1; g.strokeStyle = 'rgba(232,211,160,0.28)'; g.stroke();
  });
  // 可出征、受威脅、選取中的領地
  polys.forEach((poly, i) => {
    const reg = REGIONS[i];
    const att = canAttack(c, reg), threat = c.threat && c.threat.region === reg.id, isSel = sel === reg.id;
    if (!att && !threat && !isSel) return;
    g.beginPath(); poly.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
    g.lineWidth = isSel ? 2.2 : 1.4;
    g.strokeStyle = threat ? 'rgba(224,110,90,0.95)' : isSel ? 'rgba(244,226,180,0.95)' : 'rgba(232,211,160,0.6)';
    if (att && !isSel && !threat) g.setLineDash([5, 4]);
    g.stroke(); g.setLineDash([]);
  });
  // 名稱
  const serif = getComputedStyle(document.body).getPropertyValue('--serif') || 'serif';
  REGIONS.forEach((reg) => {
    const x = reg.x * W, y = reg.y * H, mine = owned(c, reg.id);
    g.textAlign = 'center';
    g.font = `700 ${Math.round(Math.max(13, W * 0.036))}px ${serif}`;
    g.shadowColor = 'rgba(0,0,0,0.9)'; g.shadowBlur = 6;
    g.fillStyle = mine ? '#f4ead2' : 'rgba(225,215,195,0.78)';
    g.fillText(reg.name, x, y);
    g.font = `${Math.round(Math.max(10, W * 0.026))}px ${serif}`;
    g.fillStyle = mine ? 'rgba(200,214,255,0.9)' : c.threat && c.threat.region === reg.id ? 'rgba(235,140,120,0.95)' : 'rgba(232,211,160,0.75)';
    const sub = reg.id === 'vale' ? '巢穴' : mine ? (c.threat && c.threat.region === reg.id ? '遭到進攻' : '食物 +' + reg.food) : FACTIONS[c.owner[reg.id]].name + ' Lv ' + c.rlv[reg.id];
    g.fillText(sub, x, y + Math.max(14, W * 0.04));
    g.shadowBlur = 0;
  });
  // 外框暗角與細金線
  const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(232,211,160,0.35)'; g.lineWidth = 1; g.strokeRect(pad - 0.5, pad - 0.5, W - pad * 2 + 1, H - pad * 2 + 1);
}
export function hitRegion(cv, x, y) {
  const polys = cv._polys; if (!polys) return null;
  for (let i = 0; i < polys.length; i++) {
    const p = polys[i]; let inside = false;
    for (let a = 0, b = p.length - 1; a < p.length; b = a++) {
      if ((p[a][1] > y) !== (p[b][1] > y) && x < ((p[b][0] - p[a][0]) * (y - p[a][1])) / (p[b][1] - p[a][1]) + p[a][0]) inside = !inside;
    }
    if (inside) return REGIONS[i].id;
  }
  return null;
}

// ---------------- 畫面 ----------------
const breedTag = (w) => BREEDS[w.breed].name + ' Lv ' + w.lv;
export function wolfRow(w, c, extra) {
  const st = allyStats(w, c);
  return h('div', { class: 'wp-wolf' + (w.injured ? ' hurt' : '') },
    h('div', { class: 'wp-wolf-main' }, h('b', null, w.name), h('span', null, breedTag(w) + (w.injured ? ' · 受傷 ' + w.injured + ' 天' : ''))),
    h('div', { class: 'wp-wolf-sub' }, h('span', null, '生命 ' + st.hp + ' · 攻擊 ' + Math.round(st.atk) + ' · ' + BREEDS[w.breed].skill), w.lv < WOLF_MAX_LV ? h('span', { class: 'wp-xp' }, h('i', { style: `width:${Math.round((w.xp / xpToNext(w.lv)) * 100)}%` })) : null),
    extra || null);
}

// opts: { save, startBattle(spec, allies, hungry), back }
export function showCampaign(root, c, opts) {
  let sel = null;
  const cv = h('canvas', { class: 'wp-map' });
  const info = h('div', { class: 'wp-info' });
  const head = h('div', { class: 'wp-head' });
  const alert = h('div', { class: 'wp-alert' });
  const wrap = h('div', { class: 'wp' }, head, alert, h('div', { class: 'wp-mapbox' }, cv), info);
  root.replaceChildren(wrap);
  const redraw = () => drawMap(cv, c, sel);
  const ro = new ResizeObserver(() => redraw()); ro.observe(cv);
  cv.addEventListener('click', (e) => {
    const r = cv.getBoundingClientRect();
    const id = hitRegion(cv, e.clientX - r.left, e.clientY - r.top);
    if (!id) return;
    sel = id; audio.play('flip', { volume: 0.25 }); redraw(); renderInfo();
  });
  function renderHead() {
    const net = income(c) - upkeep(c);
    head.replaceChildren(
      h('div', null, h('small', null, '第'), h('b', { class: 'num' }, String(c.day)), h('small', null, '天')),
      h('div', null, h('small', null, '食物'), h('b', { class: 'num' }, fmt(c.food)), h('small', { class: net >= 0 ? 'pos' : 'neg' }, (net >= 0 ? '+' : '') + net)),
      h('div', null, h('small', null, '領地'), h('b', { class: 'num' }, ownedCount(c) + '/' + REGIONS.length)),
      h('div', null, h('small', null, '狼群'), h('b', { class: 'num' }, healthyWolves(c).length + '/' + c.wolves.length)));
    if (c.threat) {
      const t = c.threat;
      alert.replaceChildren(h('span', null, FACTIONS[t.faction].name + ' 進攻 ' + regionById(t.region).name), h('button', { class: 'btn btn-sm btn-gold', onClick: () => go(t.region, 'defend') }, '防守'));
      alert.hidden = false;
    } else alert.hidden = true;
  }
  function renderInfo() {
    const r = sel && regionById(sel);
    const actions = h('div', { class: 'wp-actions' },
      h('button', { class: 'btn', onClick: () => showCamp(c, opts.save, () => { renderHead(); redraw(); }) }, '營地'),
      h('button', { class: 'btn', onClick: doHunt }, '狩獵休養'));
    if (!r) {
      info.replaceChildren(h('p', { class: 'wp-hint' }, '點選虛線框起來的領地出征。每次出征、狩獵都會過一天。'), actions);
      return;
    }
    const mine = owned(c, r.id), F = FACTIONS[c.owner[r.id]];
    const lines = mine
      ? [r.id === 'vale' ? '狼群的巢穴，不會被奪走。' : '我方領地，每天產出食物 ' + r.food + '。', c.threat && c.threat.region === r.id ? '正在遭到進攻，今天不防守就會失守。' : '']
      : [F.name + ' 盤據 · 等級 ' + c.rlv[r.id] + ' · 攻下後每天食物 +' + r.food, r.final ? '最終之地：打倒焚翼即完成征途。' : FACTIONS[c.owner[r.id]].boss ? '擊倒足夠敵人後，頭目會現身。' : ''];
    const btn = mine
      ? c.threat && c.threat.region === r.id ? h('button', { class: 'btn btn-gold btn-block', onClick: () => go(r.id, 'defend') }, '前往防守') : null
      : canAttack(c, r) ? h('button', { class: 'btn btn-gold btn-block', onClick: () => go(r.id, 'conquer') }, '出征 ' + r.name) : h('p', { class: 'wp-hint' }, '要先攻下相鄰的領地才能出征。');
    info.replaceChildren(h('div', { class: 'wp-region' }, h('b', null, r.name), ...lines.filter(Boolean).map((t) => h('span', null, t))), btn, actions);
  }
  function go(id, kind) {
    const ready = healthyWolves(c).slice().sort((a, b) => b.lv - a.lv).slice(0, BATTLE_ALLIES);
    const spec = battleSpec(c, id, kind);
    const goal = kind === 'defend' ? '撐過 ' + Math.floor(spec.time / 60) + ' 分 ' + (spec.time % 60) + ' 秒' : '擊倒 ' + spec.kills + ' 隻敵人後打倒頭目';
    modal({
      title: (kind === 'defend' ? '防守 ' : '出征 ') + spec.name, center: true,
      body: h('div', null,
        h('div', { class: 'result-lines' },
          h('div', null, h('span', null, '敵方'), h('span', null, FACTIONS[spec.faction].name + ' Lv ' + spec.lv)),
          h('div', null, h('span', null, '目標'), h('span', null, goal)),
          h('div', null, h('span', null, '同行'), h('span', null, ready.length ? ready.map((w) => w.name).join('、') : '只有白狼'))),
        c.hungry ? h('p', { class: 'login-note', style: 'text-align:center;margin-top:10px' }, '狼群挨餓中：生命與攻擊 −20%') : null),
      actions: [{ label: '再想想', value: false }, { label: '出發', value: true, kind: 'gold' }],
    }).then((ok) => { if (ok) opts.startBattle(spec, ready.map((w) => ({ ...w, ...allyStats(w, c) })), !!c.hungry); });
  }
  function doHunt() {
    const msgs = [];
    const f = hunt(c);
    msgs.push('狩獵收穫食物 ' + f + '，受傷的狼多休養一天');
    if (c.threat) resolveThreat(c, msgs);
    endDay(c, msgs);
    opts.save();
    audio.play('power', { volume: 0.25, rate: 0.8 });
    modal({ title: '第 ' + (c.day - 1) + ' 天結束', body: h('div', { class: 'wp-msgs' }, ...msgs.map((m) => h('p', null, m))), actions: [{ label: '好', value: true, kind: 'gold' }] }).then(() => { renderHead(); redraw(); renderInfo(); });
  }
  renderHead(); renderInfo();
  return () => ro.disconnect();
}

export function showCamp(c, save, done) {
  const body = h('div', null);
  const draw = () => {
    const cap = packCap(c);
    body.replaceChildren(
      h('div', { class: 'wf-shop-head' }, h('span', null, '食物'), h('b', { class: 'num' }, fmt(c.food))),
      ...Object.entries(BUILDINGS).map(([k, b]) => {
        const lv = c.camp[k] || 0, max = lv >= b.max, cost = b.cost[lv];
        return h('div', { class: 'wf-shop-row' },
          h('div', { class: 'wf-shop-text' }, h('b', null, b.name, h('small', { class: 'num' }, ' ' + lv + ' / ' + b.max)), h('span', null, b.label + ' ' + b.val(lv) + (max ? '' : ' → ' + b.val(lv + 1)))),
          h('button', { class: 'btn btn-sm' + (max ? '' : ' btn-gold'), disabled: max || c.food < cost, onClick: () => { c.food -= cost; c.camp[k] = lv + 1; save(); audio.play('power', { volume: 0.3 }); draw(); } }, max ? '已滿' : '食物 ' + cost));
      }),
      h('div', { class: 'wp-sub' }, '狼群 ' + c.wolves.length + ' / ' + cap),
      ...c.wolves.map((w) => wolfRow(w, c, c.wolves.length > 1 ? h('button', { class: 'wp-release', onClick: async () => { if (await confirmBox('放生 ' + w.name, w.name + ' 會離開狼群，不會再回來。', '放生', '取消', 'danger')) { c.wolves = c.wolves.filter((x) => x !== w); save(); draw(); } } }, '放生') : null)));
  };
  draw();
  modal({ title: '營地', body, actions: [{ label: '完成', value: true, kind: 'gold' }] }).then(() => done && done());
}

// 戰後：結算訊息、升級、收服
export async function battleReport(c, spec, res, reward, save) {
  const r = afterBattle(c, spec, res);
  const msgs = r.msgs.slice();
  if (spec.kind !== 'defend' && c.threat) resolveThreat(c, msgs);
  if (!c.won) endDay(c, msgs);
  save();
  await modal({
    title: res.win ? (spec.kind === 'defend' ? '守住了' : '攻下' + spec.name) : '出征失敗', center: true,
    body: h('div', null,
      h('div', { class: 'result-figure ' + (reward.delta > 0 ? 'pos' : '') }, '+' + fmt(reward.delta)),
      h('div', { class: 'result-lines' },
        h('div', null, h('span', null, '擊倒'), h('span', { class: 'num' }, fmt(res.kills))),
        r.food ? h('div', null, h('span', null, '食物'), h('span', { class: 'num' }, '+' + r.food)) : null,
        h('div', null, h('span', null, '魂石'), h('span', { class: 'num' }, '+' + reward.souls)),
        h('div', null, h('span', null, '結算後餘額'), h('span', { class: 'num' }, fmt(reward.balance)))),
      h('div', { class: 'wp-msgs' }, ...r.gained.map((m) => h('p', { class: 'up' }, m)), ...msgs.map((m) => h('p', null, m)))),
    actions: [{ label: '好', value: true, kind: 'gold' }],
  });
  if (r.recruit) await recruitDialog(c, r.recruit, save);
  if (c.won) {
    await modal({ title: '征途完成', center: true, body: h('div', null, h('p', { class: 'login-note', style: 'text-align:center' }, '焚翼倒下，整片夜林與霜原都歸於白狼的狼群。共花了 ' + c.day + ' 天、' + c.battles + ' 場出征。')), actions: [{ label: '好', value: true, kind: 'gold' }] });
  }
}
async function recruitDialog(c, w, save) {
  const cap = packCap(c);
  const full = c.wolves.length >= cap;
  const ok = await modal({
    title: '收服', center: true,
    body: h('div', null, h('p', { class: 'login-note', style: 'text-align:center;margin-bottom:10px' }, '一匹' + BREEDS[w.breed].name + '願意加入狼群'), wolfRow(w, c),
      h('p', { class: 'wp-hint', style: 'margin-top:8px' }, BREEDS[w.breed].skill + '：' + BREEDS[w.breed].desc),
      full ? h('p', { class: 'wp-hint' }, '狼群已滿（' + cap + ' 匹），收下牠要先放生一匹，或到營地擴建巢穴。') : null),
    actions: [{ label: '不收', value: false }, { label: full ? '放生一匹並收下' : '收下', value: true, kind: 'gold' }],
  });
  if (!ok) return;
  if (full) {
    pickId = null;
    const pick = await modal({ title: '放生哪一匹？', body: h('div', null, ...c.wolves.map((x) => h('button', { class: 'wp-pick', 'data-id': x.id, onClick: (e) => { e.currentTarget.closest('.modal-wrap')?.querySelectorAll('.wp-pick').forEach((b) => b.classList.remove('on')); e.currentTarget.classList.add('on'); pickId = x.id; } }, wolfRow(x, c)))), actions: [{ label: '取消', value: false }, { label: '放生並收下', value: true, kind: 'gold' }] });
    if (!pick || !pickId) return;
    c.wolves = c.wolves.filter((x) => x.id !== pickId);
  }
  addWolf(c, w);
  save();
  audio.play('power', { volume: 0.4 });
  toast(w.name + ' 加入狼群');
}
let pickId = null;

export { newCampaign };
