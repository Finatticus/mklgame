// 撞球：8 號球（WPA 規則），對手為依物理模擬規劃的電腦，五級強度。
import * as store from '../../store.js';
import * as audio from '../../audio.js';
import { h, fmt, toast, modal, confirmBox } from '../../ui.js';
import { segmented, hero, stakeSummary, stakeOptions, defaultStake } from '../shared/setup.js';
import { W, L, R, HEAD_Y, POCKETS, rack8, makeBall, strike, step, cloneBalls } from './physics.js';
import { judge, legalTargets, remaining, GROUP_NAME, respot } from './rules.js';
import { TableView, colorOf } from './render.js';

// 本機測試用：網址加 ?fast=1 時每格推進較多模擬時間（結果不變）
const FAST = typeof location !== 'undefined' && location.hostname === 'localhost' && location.search.includes('fast=1');
const ID = 'billiards', NAME = '撞球';
const LEVELS = {
  l1: { label: '入門', sub: '基本', title: '新手', mult: 0.5, desc: '會找最簡單的球打，準度普通' },
  l2: { label: '初級', sub: '會選球', title: '球友', mult: 1, desc: '會挑好進的球，偶爾失手' },
  l3: { label: '中級', sub: '會走位', title: '球手', mult: 1.5, desc: '會控制母球走位，也會打防守' },
  l4: { label: '高級', sub: '穩定', title: '高手', mult: 2.5, desc: '準度高，進攻與防守都穩' },
  l5: { label: '大師', sub: '職業', title: '大師', mult: 4, desc: '接近職業水準，很少失誤' },
};
const MAX_SPEED = 8.5;

export const RULES = `
<h4>8 號球</h4>
<ul>
<li>一方打全色球（1–7 號），另一方打花色球（9–15 號）。先把自己的七顆球打進，再合法打進 8 號球的一方獲勝。</li>
<li><strong>開球</strong>：母球放在開球線後方。開球要進球或至少 4 顆球碰庫才合法，否則對手可選擇接受球局或重新擺球自己開球。開球打進 8 號球會放回置球點；開球母球落袋，對手在開球線後方自由球。</li>
<li><strong>決定花色</strong>：開球後是開放球局，之後第一位合法進球的玩家，以第一顆進袋的球決定花色。開放球局時先碰 8 號球不算犯規，但這一桿不計分、換對手。</li>
<li><strong>合法擊球</strong>：母球要先碰到自己的球（打 8 號球時先碰 8 號），之後要有球進袋或有任何球碰庫。打進自己的球就繼續擊球。一般球不需指定袋口。</li>
<li><strong>犯規</strong>：母球落袋、先碰到別人的球、沒碰到球、碰球後沒有球碰庫也沒進球。犯規後對手可把母球放在檯面任何位置（自由球）。</li>
<li><strong>8 號球</strong>：必須指定袋口。打進指定的袋獲勝；8 號球在清完自己的球之前落袋、進錯袋、或打進 8 號球時犯規，直接判負。</li>
</ul>
<h4>操作</h4>
<ul>
<li>在球檯上按住拖曳，母球會瞄向手指的位置；白線是母球的路線，圓圈是碰撞位置，粗線是目標球的去向。</li>
<li>下方的滑輪可以微調角度。右側的力道條往下拉，放開就出桿。</li>
<li>左下的母球圖示可以拖動紅點設定擊點：上方推桿、下方拉桿、左右是側旋。</li>
<li>自由球時，按住母球拖到想放的位置。打 8 號球時會自動指定袋口，點其他袋口可以更改。</li>
</ul>
<h4>遊戲幣</h4>
<table>
<tr><th>難度</th><th>獲勝獎金</th></tr>
<tr><td>入門</td><td>賭注 × 0.5</td></tr><tr><td>初級</td><td>賭注 × 1</td></tr><tr><td>中級</td><td>賭注 × 1.5</td></tr><tr><td>高級</td><td>賭注 × 2.5</td></tr><tr><td>大師</td><td>賭注 × 4</td></tr>
</table>
<p>開局先扣賭注；獲勝拿回賭注並加上獎金，落敗或認輸失去賭注。</p>`;

const ballIcon = (n, dim = false) => {
  const [r, g, b] = colorOf(n), col = `rgb(${r},${g},${b})`;
  const bg = n > 8 ? `linear-gradient(#f3f0e6 0 26%, ${col} 26% 74%, #f3f0e6 74%)` : col;
  return h('i', { class: 'bb-ico' + (dim ? ' dim' : ''), style: `background:${bg}` }, h('b', null, String(n)));
};

export async function mount(root) {
  let alive = true, raf = 0, view = null, worker = null, seq = 0, game = null;
  const waiting = new Map();
  const prefs = Object.assign({ level: 'l2', stake: 5000, breaker: 'me' }, store.getData().settings.billiards || {});
  if (!LEVELS[prefs.level]) prefs.level = 'l2';

  function ask(payload) {
    if (!worker) {
      worker = new Worker(new URL('./ai-worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = (e) => { const p = waiting.get(e.data.id); if (!p) return; waiting.delete(e.data.id); e.data.error ? p.reject(new Error(e.data.error)) : p.resolve(e.data.result); };
      worker.onerror = (e) => { for (const p of waiting.values()) p.reject(new Error(e.message || 'AI 載入失敗')); waiting.clear(); };
    }
    return new Promise((resolve, reject) => { const id = ++seq; waiting.set(id, { resolve, reject }); worker.postMessage({ id, payload }); });
  }

  function showSetup() {
    stopLoop();
    game = null;
    const bal = store.balance();
    let stake = defaultStake(bal, prefs.stake);
    const summary = stakeSummary();
    const startBtn = h('button', { class: 'btn btn-gold btn-block' }, '開始對局');
    const levelOpt = segmented({
      label: '對手強度', hint: LEVELS[prefs.level].desc, value: prefs.level,
      options: Object.entries(LEVELS).map(([k, v]) => ({ value: k, label: v.label, sub: v.sub })),
      onChange: (v) => { prefs.level = v; levelOpt.setHint(LEVELS[v].desc); refresh(); },
    });
    const refresh = () => { summary.update(stake, Math.round(stake * LEVELS[prefs.level].mult)); startBtn.disabled = !stake; startBtn.textContent = stake ? '開始對局' : '遊戲幣不足'; };
    root.replaceChildren(h('div', { class: 'setup' },
      hero(ID, NAME, '8 號球 · WPA 規則'),
      levelOpt,
      segmented({ label: '開球', hint: '開球方可先進攻', value: prefs.breaker, options: [{ value: 'me', label: '我開球' }, { value: 'ai', label: '對手開' }, { value: 'random', label: '隨機' }], onChange: (v) => { prefs.breaker = v; } }),
      segmented({ label: '賭注', hint: '餘額 ' + fmt(bal), numeric: true, value: stake, options: stakeOptions(bal), onChange: (v) => { stake = v; prefs.stake = v; refresh(); } }),
      summary, startBtn,
      !stake ? h('p', { class: 'login-note', style: 'text-align:center' }, '餘額低於 1,000 時，可回大廳領取補給金。') : null));
    refresh();
    startBtn.onclick = () => {
      if (!stake || !store.hold(ID, stake)) return toast('遊戲幣不足');
      store.setSetting('billiards', { level: prefs.level, stake, breaker: prefs.breaker });
      audio.play('chips');
      const breaker = prefs.breaker === 'random' ? (Math.random() < 0.5 ? 0 : 1) : prefs.breaker === 'me' ? 0 : 1;
      startGame({ level: prefs.level, stake, balls: null, turn: breaker, groups: [null, null], isBreak: true, inHand: 'kitchen' });
    };
  }

  function startGame(saved) {
    const balls = saved.balls ? saved.balls.map(([n, x, y, on]) => Object.assign(makeBall(n, x, y), { on: !!on })) : rack8();
    game = { level: saved.level, stake: saved.stake, balls, turn: saved.turn, groups: saved.groups, isBreak: saved.isBreak, inHand: saved.inHand, called: null, over: false, busy: false };
    const lv = LEVELS[game.level];

    const canvas = h('canvas', { class: 'bb-canvas' });
    const status = h('div', { class: 'bb-status' });
    const strips = [0, 1].map((p) => {
      const name = h('b', null, p === 0 ? store.getData().user : lv.title);
      const sub = h('span');
      const icons = h('div', { class: 'bb-icons' });
      const el = h('div', { class: 'bb-player' }, h('div', { class: 'bb-pname' }, name, sub), icons);
      return { el, sub, icons };
    });
    const powerFill = h('div', { class: 'bb-power-fill' }), powerKnob = h('div', { class: 'bb-power-knob' });
    const power = h('div', { class: 'bb-power' }, h('div', { class: 'bb-power-track' }, powerFill, powerKnob), h('small', null, '力道'));
    const spinDot = h('i', { class: 'bb-spin-dot' });
    const spin = h('div', { class: 'bb-spin', title: '擊點' }, spinDot);
    const wheel = h('div', { class: 'bb-wheel' }, h('div', { class: 'bb-wheel-ridges' }), h('small', null, '微調'));
    const resignBtn = h('button', { class: 'btn btn-sm btn-danger', onClick: resign }, '認輸');
    root.replaceChildren(h('div', { class: 'bb' },
      h('div', { class: 'bb-top' }, strips[0].el, strips[1].el),
      h('div', { class: 'bb-stage' }, canvas, power),
      status,
      h('div', { class: 'bb-controls' }, spin, wheel, resignBtn)));

    view = new TableView(canvas);
    let aim = { ang: Math.PI / 2, power: 0, side: 0, vert: 0 };
    let shooting = false, sinking = [], shotEv = [], before = null, pending = null;

    const human = () => game.turn === 0 && !game.over;
    const cueBall = () => game.balls.find((b) => b.n === 0);
    const myOnEight = () => { const g = game.groups[game.turn]; return !!g && remaining(game.balls, g).length === 0; };

    // ---------- 介面 ----------
    function paintStrips() {
      for (const p of [0, 1]) {
        const g = game.groups[p], s = strips[p];
        s.el.classList.toggle('turn', game.turn === p && !game.over);
        s.sub.textContent = g ? GROUP_NAME[g] : game.isBreak ? (game.turn === p ? '開球' : '') : '未定花色';
        const list = g ? (g === 'solid' ? [1, 2, 3, 4, 5, 6, 7] : [9, 10, 11, 12, 13, 14, 15]) : [];
        const icons = list.map((n) => ballIcon(n, !game.balls.find((b) => b.n === n).on));
        if (g) icons.push(ballIcon(8, !game.balls.find((b) => b.n === 8).on));
        s.icons.replaceChildren(...icons);
      }
    }
    function say(t) { status.textContent = t; }
    function prompt() {
      if (game.over) return;
      if (!human()) { say(lv.title + '思考中…'); return; }
      const g = game.groups[0];
      if (game.inHand === 'kitchen') say(game.isBreak ? '開球：可移動母球（限開球線後方），拉力道條出桿' : '自由球（限開球線後方）：拖動母球後擊球');
      else if (game.inHand === 'anywhere') say('自由球：按住母球拖到任何位置');
      else if (myOnEight()) say('打 8 號球：指定 ' + (game.called != null ? POCKETS[game.called].name : '袋口'));
      else say(g ? '輪到你 · ' + GROUP_NAME[g] : '輪到你 · 開放球局');
    }

    // 瞄準線：找出母球第一個碰到的球或庫邊
    function guide() {
      const c = cueBall();
      if (!c || !c.on) return null;
      const dx = Math.cos(aim.ang), dy = Math.sin(aim.ang);
      let best = null;
      for (const b of game.balls) {
        if (!b.on || b.n === 0) continue;
        const px = b.x - c.x, py = b.y - c.y, t = px * dx + py * dy;
        if (t <= 0) continue;
        const perp = Math.abs(px * dy - py * dx);
        if (perp >= 2 * R) continue;
        const th = t - Math.sqrt(4 * R * R - perp * perp);
        if (!best || th < best.t) best = { t: th, b };
      }
      let tw = 1e9;
      if (dx > 0) tw = Math.min(tw, (W - R - c.x) / dx); if (dx < 0) tw = Math.min(tw, (R - c.x) / dx);
      if (dy > 0) tw = Math.min(tw, (L - R - c.y) / dy); if (dy < 0) tw = Math.min(tw, (R - c.y) / dy);
      const t = best && best.t < tw ? best.t : tw;
      const gx = c.x + dx * t, gy = c.y + dy * t;
      const out = { from: [c.x, c.y], ghost: [gx, gy] };
      if (best && best.t < tw) {
        const b = best.b; let ox = b.x - gx, oy = b.y - gy; const ol = Math.hypot(ox, oy); ox /= ol; oy /= ol;
        const ok = legalTargets({ turn: game.turn, groups: game.groups }, game.balls).includes(b.n);
        out.obj = { n: b.n, from: [b.x, b.y], to: [b.x + ox * 0.38, b.y + oy * 0.38], ok, dir: [ox, oy] };
        let tx = dx - (dx * ox + dy * oy) * ox, ty = dy - (dx * ox + dy * oy) * oy; const tl = Math.hypot(tx, ty) || 1;
        out.tan = [gx + (tx / tl) * 0.22, gy + (ty / tl) * 0.22];
      }
      return out;
    }
    // 打 8 號球時自動指定：目標球去向最接近的袋口
    function autoCall(gd) {
      if (!myOnEight() || !gd || !gd.obj || gd.obj.n !== 8 || game.calledManual) return;
      const [bx, by] = gd.obj.from, [ox, oy] = gd.obj.dir;
      let best = 0, bv = -2;
      POCKETS.forEach((p, i) => { const vx = p.x - bx, vy = p.y - by, l = Math.hypot(vx, vy); const v = (vx * ox + vy * oy) / l; if (v > bv) { bv = v; best = i; } });
      if (game.called !== best) { game.called = best; prompt(); }
    }

    // ---------- 操作 ----------
    const rectOf = () => canvas.getBoundingClientRect();
    let drag = null;
    canvas.addEventListener('pointerdown', (e) => {
      if (!human() || shooting || game.busy) return;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 略 */ }
      const r = rectOf(), px = e.clientX - r.left, py = e.clientY - r.top;
      const [wx, wy] = view.toWorld(px, py), c = cueBall();
      // 點袋口：指定 8 號球袋口
      if (myOnEight()) {
        const pi = POCKETS.findIndex((p) => Math.hypot(p.x - wx, p.y - wy) < 0.09);
        if (pi >= 0) { game.called = pi; game.calledManual = true; prompt(); return; }
      }
      if (game.inHand && c && Math.hypot(c.x - wx, c.y - wy) < Math.max(3 * R, 24 / view.L.s)) { drag = { mode: 'place', id: e.pointerId }; return; }
      drag = { mode: 'aim', id: e.pointerId };
      if (c && c.on) aim.ang = Math.atan2(wy - c.y, wx - c.x);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const r = rectOf(), [wx, wy] = view.toWorld(e.clientX - r.left, e.clientY - r.top), c = cueBall();
      if (drag.mode === 'place') placeCue(wx, wy);
      else if (c && c.on) aim.ang = Math.atan2(wy - c.y, wx - c.x);
    });
    const endDrag = (e) => { if (drag && e.pointerId === drag.id) { if (drag.mode === 'place') save(); drag = null; } };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    function placeOk(x, y) {
      if (x < R || x > W - R || y < R || y > L - R) return false;
      if (game.inHand === 'kitchen' && y > HEAD_Y - 0.002) return false;
      return game.balls.every((b) => !b.on || b.n === 0 || Math.hypot(b.x - x, b.y - y) >= 2 * R + 0.001);
    }
    function placeCue(x, y) {
      const c = cueBall();
      x = Math.max(R, Math.min(W - R, x)); y = Math.max(R, Math.min(L - R, y));
      if (game.inHand === 'kitchen') y = Math.min(y, HEAD_Y - 0.003);
      if (placeOk(x, y)) Object.assign(c, { x, y, on: true });
    }

    // 力道條
    let pdrag = null;
    const track = power.querySelector('.bb-power-track');
    track.addEventListener('pointerdown', (e) => {
      if (!human() || shooting || game.busy) return;
      try { track.setPointerCapture(e.pointerId); } catch (err) { /* 略 */ }
      pdrag = { id: e.pointerId, y0: e.clientY };
      aim.power = 0;
    });
    track.addEventListener('pointermove', (e) => {
      if (!pdrag || e.pointerId !== pdrag.id) return;
      const hgt = track.getBoundingClientRect().height;
      aim.power = Math.max(0, Math.min(1, (e.clientY - pdrag.y0) / (hgt * 0.85)));
      paintPower();
    });
    const pEnd = (e) => {
      if (!pdrag || e.pointerId !== pdrag.id) return;
      pdrag = null;
      if (aim.power >= 0.03) humanShoot(); else { aim.power = 0; paintPower(); }
    };
    track.addEventListener('pointerup', pEnd);
    track.addEventListener('pointercancel', () => { pdrag = null; aim.power = 0; paintPower(); });
    function paintPower() { powerFill.style.height = (aim.power * 100).toFixed(1) + '%'; powerKnob.style.top = (aim.power * 100).toFixed(1) + '%'; }

    // 擊點
    let sdrag = null;
    const setSpin = (e) => {
      const r = spin.getBoundingClientRect();
      let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = -(e.clientY - r.top - r.height / 2) / (r.height / 2);
      const m = Math.hypot(x, y); if (m > 0.8) { x *= 0.8 / m; y *= 0.8 / m; }
      aim.side = +(x * 0.6).toFixed(3); aim.vert = +(y * 0.6).toFixed(3);
      paintSpin();
    };
    spin.addEventListener('pointerdown', (e) => { try { spin.setPointerCapture(e.pointerId); } catch (err) { /* 略 */ } sdrag = e.pointerId; setSpin(e); });
    spin.addEventListener('pointermove', (e) => { if (sdrag === e.pointerId) setSpin(e); });
    spin.addEventListener('pointerup', () => { sdrag = null; });
    spin.addEventListener('dblclick', () => { aim.side = aim.vert = 0; paintSpin(); });
    function paintSpin() { spinDot.style.left = (50 + (aim.side / 0.6) * 50) + '%'; spinDot.style.top = (50 - (aim.vert / 0.6) * 50) + '%'; }

    // 微調滑輪
    let wdrag = null;
    const ridges = wheel.querySelector('.bb-wheel-ridges');
    let wheelOff = 0;
    wheel.addEventListener('pointerdown', (e) => { if (!human()) return; try { wheel.setPointerCapture(e.pointerId); } catch (err) { /* 略 */ } wdrag = { id: e.pointerId, x: e.clientX }; });
    wheel.addEventListener('pointermove', (e) => {
      if (!wdrag || e.pointerId !== wdrag.id) return;
      const dx = e.clientX - wdrag.x; wdrag.x = e.clientX;
      aim.ang += dx * 0.0012; // 往右拖＝畫面上順時針
      wheelOff += dx; ridges.style.backgroundPositionX = wheelOff + 'px';
    });
    wheel.addEventListener('pointerup', () => { wdrag = null; });

    // ---------- 擊球與模擬 ----------
    function humanShoot() {
      if (!human() || shooting) return;
      const c = cueBall();
      if (game.inHand && !placeOk(c.x, c.y)) { toast('母球位置不合法'); return; }
      if (myOnEight() && game.called == null) { toast('請先點選要指定的袋口'); aim.power = 0; paintPower(); return; }
      fire(aim.ang, MAX_SPEED * Math.pow(aim.power, 1.5) + 0.15, aim.side, aim.vert);
      aim.power = 0; paintPower();
    }

    function fire(ang, speed, side, vert, called) {
      // 出桿當下就存檔（含這一桿的參數），中途關閉再開會重播同一桿，無法反悔
      pending = { called: called !== undefined ? called : myOnEight() ? game.called : null };
      save({ ang, speed, side, vert, called: pending.called });
      before = cloneBalls(game.balls);
      shotEv = [];
      const c = cueBall();
      strike(c, ang, speed, side, vert);
      shooting = true;
      audio.play('putt', { volume: Math.min(1, 0.3 + speed / 7), rate: 0.9 });
    }

    function onEvents(evs) {
      for (const e of evs) {
        shotEv.push(e);
        if (e.type === 'ball') audio.play('ball', { volume: Math.min(1, e.speed / 3.5) * 0.9 + 0.05, rate: 1.1 });
        else if (e.type === 'cushion' && e.speed > 0.15) audio.play('cushion', { volume: Math.min(0.8, e.speed / 4) });
        else if (e.type === 'pocket') {
          audio.play('pocket', { volume: 0.7 });
          const b = game.balls.find((x) => x.n === e.n);
          sinking.push({ n: e.n, pocket: e.pocket, q: b.q.slice(), t: performance.now(), p: 0 });
        }
      }
    }

    function shotDone() {
      shooting = false;
      const st = { turn: game.turn, groups: game.groups, isBreak: game.isBreak, called: pending ? pending.called : null };
      const j = judge(st, before, game.balls, shotEv);
      const me = game.turn, opp = 1 - me;
      game.groups = j.groups;
      game.calledManual = false; game.called = null;
      if (j.winner != null) return finish(j.winner, j.msg);
      if (j.respot8) respot(game.balls, 8);
      const cue = cueBall();
      if (j.illegalBreak) return illegalBreak(me);
      game.isBreak = false;
      if (j.foul) {
        game.turn = opp; game.inHand = j.inHand || 'anywhere';
        if (!cue.on) { cue.on = true; delete cue.pocket; }
        cue.vx = cue.vy = cue.wx = cue.wy = cue.wz = 0;
        if (!placeOk(cue.x, cue.y) || !cue.on) defaultSpot(cue);
        toast(j.reason + (game.turn === 0 ? '，你有自由球' : '，對手自由球'));
      } else {
        game.inHand = null;
        if (!j.keep) game.turn = opp;
        if (j.msg && j.msg.startsWith('確定花色')) toast(j.msg);
      }
      save();
      paintStrips();
      nextTurn();
    }

    function defaultSpot(cue) {
      const tries = game.inHand === 'kitchen' ? [[W / 2, HEAD_Y * 0.6], [W * 0.3, HEAD_Y * 0.6], [W * 0.7, HEAD_Y * 0.6]] : [[W / 2, HEAD_Y * 0.6], [W / 2, L / 2], [W * 0.3, L * 0.3]];
      for (const [x, y] of tries) if (placeOk(x, y)) { Object.assign(cue, { x, y, on: true }); return; }
      Object.assign(cue, { x: W / 2, y: R * 2, on: true });
    }

    async function illegalBreak(breaker) {
      if (breaker === 0) {
        toast('開球不合法：對手選擇重新擺球並開球');
        reRack(1);
      } else {
        const v = await modal({ title: '對手開球不合法', body: h('p', null, '開球沒有進球，碰庫的球也少於 4 顆。你可以接受目前的球局直接擊球，或重新擺球由你開球。'), actions: [{ label: '接受球局', value: 'accept' }, { label: '重新開球', value: 'rerack', kind: 'gold' }], dismiss: false, center: true });
        if (!alive) return;
        if (v === 'accept') { game.isBreak = false; game.turn = 0; game.inHand = null; save(); paintStrips(); nextTurn(); }
        else reRack(0);
      }
    }
    function reRack(breaker) {
      game.balls = rack8();
      Object.assign(game, { turn: breaker, groups: [null, null], isBreak: true, inHand: 'kitchen' });
      save(); paintStrips(); nextTurn();
    }

    function nextTurn() {
      if (game.over) return;
      aim.power = 0; paintPower();
      const c = cueBall();
      if (human()) {
        // 預設瞄準最近的合法目標球
        const t = legalTargets({ turn: 0, groups: game.groups }, game.balls).map((n) => game.balls.find((b) => b.n === n)).filter((b) => b && b.on)
          .sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0];
        if (t) aim.ang = Math.atan2(t.y - c.y, t.x - c.x);
        prompt();
      } else aiTurn();
    }

    async function aiTurn() {
      game.busy = true; prompt();
      const g = game;
      try {
        const t0 = performance.now();
        const res = await ask({ balls: g.balls, st: { turn: 1, groups: g.groups, isBreak: g.isBreak }, level: g.level, inHand: g.inHand });
        if (!alive || game !== g || g.over) return;
        if (res.place) { const c = cueBall(); Object.assign(c, { x: res.place[0], y: res.place[1], on: true }); }
        if (res.called != null) game.called = res.called;
        // 瞄準動畫
        const from = aim.ang, to = res.ang;
        let d = to - from; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
        const wait = Math.max(500, 1100 - (performance.now() - t0));
        const t1 = performance.now();
        await new Promise((ok) => { const tick = () => { const k = Math.min(1, (performance.now() - t1) / wait); aim.ang = from + d * (1 - (1 - k) * (1 - k)); aim.power = Math.max(0, (k - 0.55) / 0.45) * Math.min(1, Math.pow((res.speed - 0.15) / MAX_SPEED, 1 / 1.5)); if (k < 1 && alive) requestAnimationFrame(tick); else ok(); }; tick(); });
        if (!alive || game !== g) return;
        g.busy = false;
        aim.power = 0;
        fire(res.ang, res.speed, res.side || 0, res.vert || 0, res.called != null ? res.called : null);
      } catch (err) {
        g.busy = false;
        say('AI 發生問題：' + err.message);
      }
    }

    function save(shot = null) {
      store.saveGame(ID, { level: game.level, stake: game.stake, balls: game.balls.map((b) => [b.n, b.x, b.y, b.on ? 1 : 0]), turn: game.turn, groups: game.groups, isBreak: game.isBreak, inHand: game.inHand, shot });
    }

    async function resign() {
      if (game.over) return;
      if (!(await confirmBox('認輸', '確定要認輸嗎？會失去賭注 ' + fmt(game.stake) + '。', '認輸', '繼續打', 'danger'))) return;
      if (!game.over) finish(1, '你認輸');
    }

    function finish(winner, msg) {
      const g = game;
      g.over = true; shooting = false;
      const result = winner === 0 ? 'win' : 'lose';
      const profit = Math.round(g.stake * lv.mult);
      const payout = result === 'win' ? g.stake + profit : 0;
      const ev = store.settle(ID, { gameName: NAME, mode: lv.label, result, payout, note: msg, marks: result === 'win' && g.level === 'l5' ? { poolMasterWins: 1 } : null });
      paintStrips();
      say((result === 'win' ? '你贏了 · ' : '你輸了 · ') + msg);
      setTimeout(() => {
        if (!alive) return;
        audio.chime(result === 'win' ? 'win' : 'lose');
        if (result === 'win') audio.play('payout');
        modal({
          title: result === 'win' ? '你贏了' : '你輸了', center: true,
          body: h('div', null, h('div', { class: 'result-figure ' + (ev.delta > 0 ? 'pos' : 'neg') }, (ev.delta > 0 ? '+' : '−') + fmt(Math.abs(ev.delta))),
            h('div', { class: 'result-lines' },
              h('div', null, h('span', null, '結果'), h('span', null, msg)),
              h('div', null, h('span', null, '對手'), h('span', null, lv.title + '（' + lv.label + '）')),
              h('div', null, h('span', null, '結算後餘額'), h('span', null, fmt(ev.balance))))),
          actions: [{ label: '看球檯', value: 'view' }, { label: '再來一局', value: 'again', kind: 'gold' }],
        }).then((v) => { if (v === 'again' && alive) showSetup(); });
      }, 600);
    }

    // ---------- 主迴圈 ----------
    let lastNow = 0, acc = 0;
    function frame(now) {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      const dt = FAST ? 2 : lastNow ? Math.min(0.25, (now - lastNow) / 1000) : 0;
      lastNow = now;
      if (shooting) {
        acc += dt;
        let n = 0;
        while (acc >= 0.001 && n < 2000) {
          acc -= 0.001; n++;
          const evs = [];
          const moving = step(game.balls, evs, true, true);
          if (evs.length) onEvents(evs);
          if (!moving) { acc = 0; shotDone(); break; }
        }
      }
      for (const k of sinking) k.p = Math.min(1, (now - k.t) / 450);
      sinking = sinking.filter((k) => k.p < 1);
      const gd = human() && !shooting && !game.busy && cueBall().on ? guide() : null;
      if (gd) autoCall(gd);
      view.draw({
        balls: game.balls, sinking,
        aim: gd ? { guide: gd } : null,
        cue: { show: !shooting && !game.over && cueBall().on, ang: aim.ang, pull: aim.power },
        inHand: game.inHand && !shooting && !game.over ? { bad: !placeOk(cueBall().x, cueBall().y) } : null,
        kitchen: game.inHand === 'kitchen' && !shooting,
        called: myOnEight() && !game.over ? game.called : null,
        choosePocket: human() && myOnEight() && !shooting,
      });
    }

    // 本機開發時提供除錯用的狀態讀取
    if (location.hostname === 'localhost') window.__billiards = { state: () => ({ turn: game.turn, groups: game.groups, isBreak: game.isBreak, inHand: game.inHand, over: game.over, shooting, busy: game.busy, called: game.called, status: status.textContent, balls: game.balls.map((b) => [b.n, +b.x.toFixed(3), +b.y.toFixed(3), b.on]) }), aim, fire: (a, sp, sd, vt) => fire(a, sp, sd || 0, vt || 0), place: (x, y) => placeCue(x, y) };
    view.build().then(() => {
      paintStrips(); paintPower(); paintSpin();
      if (!raf) raf = requestAnimationFrame(frame);
      if (saved.shot) { const k = saved.shot; aim.ang = k.ang; fire(k.ang, k.speed, k.side, k.vert, k.called); }
      else { save(); nextTurn(); }
    });
    game.onResize = () => view.build();
  }

  function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  const onResize = () => { if (game && game.onResize) game.onResize(); };
  window.addEventListener('resize', onResize);

  const saved = store.loadGame(ID);
  if (saved && store.heldAmount(ID) > 0 && LEVELS[saved.level]) startGame(saved); else { store.release(ID); showSetup(); }

  return () => { alive = false; stopLoop(); window.removeEventListener('resize', onResize); if (worker) worker.terminate(); };
}
