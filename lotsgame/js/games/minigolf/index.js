// 迷你高爾夫（只用推桿）：兩座九洞球場，可打前九、後九或全場十八洞。
// 依世界迷你高爾夫聯盟（WMF）的計分方式：每洞最多 6 桿，第 6 桿仍未進洞記 7 桿；落水罰一桿，從上一桿的位置重打。
import * as store from '../../store.js';
import * as audio from '../../audio.js';
import { h, fmt, modal, confirmBox } from '../../ui.js';
import { segmented, hero } from '../shared/setup.js';
import { buildHole, newBall, strike, step, STEP_DT, MAX_SPEED } from './physics.js';
import { CourseView } from './render.js';
import { COURSES } from './holes.js';

// 本機測試用：網址加 ?fast=1 時每格推進較多模擬時間（結果不變）
const FAST = typeof location !== 'undefined' && location.hostname === 'localhost' && location.search.includes('fast=1');
const ID = 'minigolf', NAME = '迷你高爾夫';
const MAX_STROKES = 6;

const ROUNDS = {
  front: { label: '松庭', sub: '前九洞', holes: COURSES[0].holes.map((_, i) => [0, i]), base: 600 },
  back: { label: '赤岩', sub: '後九洞', holes: COURSES[1].holes.map((_, i) => [1, i]), base: 800 },
  full: { label: '全場', sub: '十八洞', holes: [...COURSES[0].holes.map((_, i) => [0, i]), ...COURSES[1].holes.map((_, i) => [1, i])], base: 1800 },
};
const PER_UNDER = 300, PER_ACE = 500;
const holeDef = ([c, i]) => COURSES[c].holes[i];
const roundPar = (r) => ROUNDS[r].holes.reduce((s, x) => s + holeDef(x).par, 0);

export const RULES = `
<h4>怎麼玩</h4>
<ul>
<li>用最少的桿數把球推進洞。每洞有標準桿（2–4 桿），全部打完後比較總桿數與標準桿。</li>
<li>草皮有起伏：上坡要多用力，下坡會越滾越快，斜坡會讓球轉彎。圍欄會反彈，木材、石材的彈性不同。</li>
<li>有些洞有水池、沙坑、旋轉木槳、滑動石閘和地下管道。沙坑會大幅減速；球進管道會從另一端出來。</li>
</ul>
<h4>計分</h4>
<ul>
<li>每洞最多 6 桿；第 6 桿仍未進洞，記 7 桿並進入下一洞。</li>
<li>球落水罰一桿，從上一桿出發的位置重打。</li>
<li>成績名稱：一桿進洞、老鷹（低於標準桿 2 桿）、小鳥（低 1 桿）、平標準桿、柏忌（多 1 桿）、雙柏忌（多 2 桿）。</li>
</ul>
<h4>操作</h4>
<ul>
<li>在球場任何位置按住後往<strong>反方向</strong>拉，像拉弓一樣：拉的方向決定推桿方向，拉得越遠力道越大，放開就推出。</li>
<li>把手指拉回起點附近再放開，可以取消這一桿。</li>
<li>瞄準時，草皮上的小光點會沿著下坡方向流動，流得越快坡越陡。按「坡度」可以一直顯示。</li>
<li>中途離開會保留進度，回來從同一洞、同一位置繼續。</li>
</ul>
<h4>遊戲幣</h4>
<p>不需下注。打完一輪就能獲得獎勵：</p>
<table>
<tr><th>球場</th><th>完成獎勵</th></tr>
<tr><td>前九（松庭）</td><td>600</td></tr>
<tr><td>後九（赤岩）</td><td>800</td></tr>
<tr><td>全場十八洞</td><td>1,800</td></tr>
</table>
<p>總桿數每低於標準桿 1 桿，再加 ${fmt(PER_UNDER)}；每次一桿進洞，再加 ${fmt(PER_ACE)}。</p>`;

function scoreName(strokes, par) {
  if (strokes === 1) return '一桿進洞';
  const d = strokes - par;
  return d <= -3 ? '信天翁' : d === -2 ? '老鷹' : d === -1 ? '小鳥' : d === 0 ? '平標準桿' : d === 1 ? '柏忌' : d === 2 ? '雙柏忌' : '多 ' + d + ' 桿';
}
const toPar = (n) => (n === 0 ? '平' : n > 0 ? '+' + n : '−' + -n);

export async function mount(root) {
  let alive = true, raf = 0, view = null, viewTheme = '', game = null;
  const prefs = Object.assign({ round: 'front', slope: false }, store.getData().settings.minigolf || {});
  const best = () => (store.getData().settings.minigolfBest || {});

  // ---------- 開局 ----------
  function showSetup() {
    stopLoop();
    game = null;
    const b = best();
    const bestLine = (r) => (b[r] != null ? '最佳 ' + b[r] + ' 桿（' + toPar(b[r] - roundPar(r)) + '）' : '尚無紀錄');
    const info = h('div', { class: 'stake-summary' },
      h('div', null, h('small', null, '標準桿'), h('b', { class: 'num' })),
      h('div', null, h('small', null, '完成獎勵'), h('b', { class: 'num pos' })));
    const startBtn = h('button', { class: 'btn btn-gold btn-block' }, '開始');
    const roundOpt = segmented({
      label: '球場', hint: bestLine(prefs.round), value: prefs.round,
      options: Object.entries(ROUNDS).map(([k, v]) => ({ value: k, label: v.label, sub: v.sub })),
      onChange: (v) => { prefs.round = v; roundOpt.setHint(bestLine(v)); refresh(); },
    });
    const refresh = () => {
      info.children[0].lastChild.textContent = roundPar(prefs.round);
      info.children[1].lastChild.textContent = '+' + fmt(ROUNDS[prefs.round].base) + ' 起';
    };
    root.replaceChildren(h('div', { class: 'setup' },
      hero(ID, NAME, '只用推桿 · 起伏草皮與機關'),
      roundOpt, info, startBtn,
      h('p', { class: 'login-note', style: 'text-align:center' }, '不需下注。低於標準桿與一桿進洞有額外獎勵。')));
    refresh();
    startBtn.onclick = () => {
      store.setSetting('minigolf', { round: prefs.round, slope: prefs.slope });
      startRound({ round: prefs.round, idx: 0, scores: [], strokes: 0, ball: null, last: null, aces: 0 });
    };
  }

  // ---------- 對局 ----------
  function startRound(saved) {
    game = Object.assign({}, saved);
    const R = ROUNDS[game.round];
    const holeLabel = h('div', { class: 'golf-hole' });
    const statPar = h('b', { class: 'num' }), statNow = h('b', { class: 'num' }), statTot = h('b', { class: 'num' });
    const canvas = h('canvas', { class: 'golf-canvas' });
    const banner = h('div', { class: 'golf-banner' });
    const tip = h('div', { class: 'golf-tip' });
    const slopeBtn = h('button', { class: 'btn btn-sm' + (prefs.slope ? ' on' : ''), onClick: () => { prefs.slope = !prefs.slope; slopeBtn.classList.toggle('on', prefs.slope); store.setSetting('minigolf', { round: game.round, slope: prefs.slope }); } }, '坡度');
    const cardBtn = h('button', { class: 'btn btn-sm', onClick: () => showCard(false) }, '計分卡');
    const quitBtn = h('button', { class: 'btn btn-sm', onClick: quit }, '放棄');
    root.replaceChildren(h('div', { class: 'golf' },
      h('div', { class: 'golf-top' }, holeLabel,
        h('div', { class: 'golf-stat' }, h('small', null, '標準桿'), statPar),
        h('div', { class: 'golf-stat' }, h('small', null, '本洞'), statNow),
        h('div', { class: 'golf-stat' }, h('small', null, '總計'), statTot)),
      h('div', { class: 'golf-stage' }, canvas, banner),
      h('div', { class: 'golf-bottom' }, tip, h('div', { class: 'golf-actions' }, quitBtn, cardBtn, slopeBtn))));

    let world = null, ball = null, phase = 'aim', aim = null, drag = null, holedAt = 0, ripples = [], rollTime = 0, flagOut = false;

    const totals = () => {
      let s = 0, p = 0;
      game.scores.forEach((sc, i) => { s += sc; p += holeDef(R.holes[i]).par; });
      return { s, p };
    };
    function paintTotal() { const t = totals(); statTot.textContent = game.scores.length ? toPar(t.s - t.p) : '—'; }
    function paintInfo() {
      const def = holeDef(R.holes[game.idx]);
      holeLabel.replaceChildren(h('b', null, '第 ' + (game.idx + 1) + ' 洞'), h('span', null, def.name + ' · ' + COURSES[R.holes[game.idx][0]].name));
      statPar.textContent = def.par;
      statNow.textContent = game.strokes;
      tip.textContent = def.tip;
      paintTotal();
    }
    const save = (shot = null) => store.saveGame(ID, { round: game.round, idx: game.idx, scores: game.scores, strokes: game.strokes, ball: ball && !ball.holed ? [ball.x, ball.y] : null, last: game.last, aces: game.aces, shot });

    async function loadHole() {
      const ref = R.holes[game.idx], def = holeDef(ref), theme = COURSES[ref[0]].theme;
      world = buildHole(def);
      if (!view || viewTheme !== theme) { view = new CourseView(canvas, theme); viewTheme = theme; }
      const start = game.ball || [world.tee.x, world.tee.y];
      const replay = game.shot;
      game.shot = null;
      ball = newBall(world, start[0], start[1], replay ? replay.t : ball ? ball.t : 0);
      phase = 'aim'; aim = null; drag = null; ripples = []; flagOut = false;
      paintInfo();
      banner.className = 'golf-banner';
      await view.setHole(world);
      startLoop();
      if (replay) { strike(ball, replay.ang, replay.speed); phase = 'roll'; rollTime = 0; }
    }

    // 拉桿操作
    const stageRect = () => canvas.getBoundingClientRect();
    canvas.addEventListener('pointerdown', (e) => {
      if (phase !== 'aim' || ball.moving) return;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 部分瀏覽器不支援 */ }
      drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
      aim = null;
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const r = stageRect(), max = 0.36 * Math.min(r.width, r.height);
      const dx = drag.x - e.clientX, dy = drag.y - e.clientY, d = Math.hypot(dx, dy);
      aim = d < 6 ? null : { ang: Math.atan2(dy, dx), f: Math.min(1, d / max) };
    });
    const release = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
      if (aim && aim.f >= 0.03 && phase === 'aim' && !ball.moving) shoot(aim.ang, MAX_SPEED * Math.pow(aim.f, 1.4), aim.f);
      aim = null;
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', () => { drag = null; aim = null; });

    function shoot(ang, speed, f) {
      game.last = [ball.x, ball.y];
      game.strokes++;
      // 推出的當下存檔（含這一桿），中途關閉再開會重播同一桿
      save({ ang, speed, t: ball.t });
      paintInfo();
      strike(ball, ang, speed);
      phase = 'roll'; rollTime = 0;
      audio.play('putt', { volume: 0.35 + 0.65 * f, rate: 1.05 - f * 0.15 });
    }

    function show(text, sub, kind = '') {
      banner.replaceChildren(h('b', null, text), sub ? h('span', null, sub) : null);
      banner.className = 'golf-banner show ' + kind;
    }
    const hideBanner = () => { banner.className = 'golf-banner'; };

    function finishHole(score, extra) {
      phase = 'done';
      const def = holeDef(R.holes[game.idx]);
      game.scores.push(score);
      if (score === 1) game.aces = (game.aces || 0) + 1;
      game.idx++; game.strokes = 0; game.ball = null; game.last = null;
      save();
      paintTotal();
      show(extra || scoreName(score, def.par), score + ' 桿 · 標準桿 ' + def.par, score < def.par ? 'good' : score > def.par ? 'bad' : '');
      if (score === 1) { audio.chime('win'); audio.play('payout'); } else if (score < def.par) audio.chime('win');
      const g = game;
      setTimeout(() => {
        if (!alive || game !== g) return;
        hideBanner();
        if (game.idx >= R.holes.length) endRound(); else loadHole();
      }, score === 1 ? 2400 : 1700);
    }

    function onEvents(evs) {
      for (const e of evs) {
        if (e.type === 'wall') {
          const vol = Math.min(1, e.speed / 1.4);
          if (e.mat === 'stone') audio.play('wood', { volume: vol * 0.8, rate: 0.72 });
          else if (e.mat === 'metal') audio.play('ball', { volume: vol * 0.6, rate: 0.9 });
          else audio.play('wood', { volume: vol });
        } else if (e.type === 'lip') audio.play('cup', { volume: 0.25, rate: 1.25 });
        else if (e.type === 'holed') { holedAt = ball.t; flagOut = true; audio.play('cup', { volume: 0.9 }); }
        else if (e.type === 'tunnelIn') audio.play('wood', { volume: 0.35, rate: 0.55 });
        else if (e.type === 'tunnelOut') audio.play('wood', { volume: 0.25, rate: 0.6 });
        else if (e.type === 'water') {
          audio.splash(0.55);
          ripples.push({ x: ball.x, y: ball.y, t: ball.t });
          game.strokes++; // 罰一桿
          paintInfo();
          phase = 'water';
          show('落水', '罰一桿，從上一桿的位置重打', 'bad');
          const g = game;
          setTimeout(() => {
            if (!alive || game !== g) return;
            hideBanner();
            if (game.strokes >= MAX_STROKES) { finishHole(MAX_STROKES + 1, '已達 6 桿'); return; }
            ball.x = game.last[0]; ball.y = game.last[1]; ball.vx = ball.vy = 0; ball.moving = false;
            phase = 'aim'; save();
          }, 1500);
        }
      }
    }

    // 主迴圈：固定時間步長推進物理
    let lastNow = 0, acc = 0;
    function frame(now) {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      const dt = FAST ? 1 : lastNow ? Math.min(0.25, (now - lastNow) / 1000) : 0;
      lastNow = now;
      acc += dt;
      let n = 0;
      while (acc >= STEP_DT && n < (FAST ? 4000 : 600)) {
        acc -= STEP_DT; n++;
        if (phase === 'water' || phase === 'done') { ball.t += STEP_DT; continue; }
        const evs = step(world, ball, STEP_DT);
        if (evs.length) onEvents(evs);
      }
      if (phase === 'roll') {
        rollTime += dt;
        if (ball.holed && ball.t - holedAt > 0.45) finishHole(game.strokes);
        else if (!ball.holed && !ball.moving && !(ball.hidden > 0)) {
          if (game.strokes >= MAX_STROKES) finishHole(MAX_STROKES + 1, '已達 6 桿');
          else { phase = 'aim'; save(); }
        } else if (rollTime > 25) { ball.vx = ball.vy = 0; ball.moving = false; }
      }
      view.draw({ time: ball.t, ball, aim: phase === 'aim' ? aim : null, showSlope: phase === 'aim' && (prefs.slope || !!aim), ripples, holedAt, flagOut: flagOut || (ball.moving && Math.hypot(ball.x - world.cup.x, ball.y - world.cup.y) < 0.3) });
    }
    function startLoop() { if (!raf) { lastNow = 0; acc = 0; raf = requestAnimationFrame(frame); } }

    function showCard(final) {
      const rows = R.holes.map((ref, i) => {
        const def = holeDef(ref), sc = game.scores[i];
        const cls = sc == null ? '' : sc === 1 ? 'ace' : sc < def.par ? 'under' : sc > def.par ? 'over' : '';
        return h('tr', { class: i === game.idx && !final ? 'cur' : '' }, h('td', null, String(i + 1)), h('td', null, def.name), h('td', { class: 'num' }, String(def.par)), h('td', { class: 'num' }, sc == null ? '' : h('i', { class: 'sc ' + cls }, String(sc))));
      });
      const t = totals();
      return modal({
        title: final ? '本輪成績' : '計分卡', center: true,
        body: h('div', { class: 'golf-card' }, h('table', null, h('tr', null, h('th', null, '洞'), h('th', null, '名稱'), h('th', null, '標準'), h('th', null, '桿數')), ...rows,
          h('tr', { class: 'sum' }, h('td', null, ''), h('td', null, '合計'), h('td', { class: 'num' }, String(roundPar(game.round))), h('td', { class: 'num' }, game.scores.length ? String(t.s) : '')))),
        actions: final ? undefined : [{ label: '繼續', value: true, kind: 'gold' }],
      });
    }

    async function quit() {
      if (!(await confirmBox('放棄這一輪', '目前成績不會保存，也不會獲得獎勵。', '放棄', '繼續打', 'danger'))) return;
      store.clearGame(ID);
      showSetup();
    }

    function endRound() {
      stopLoop();
      const t = totals(), par = roundPar(game.round), diff = t.s - par;
      const under = Math.max(0, -diff), aces = game.aces || 0;
      const payout = R.base + under * PER_UNDER + aces * PER_ACE;
      const result = diff < 0 ? 'win' : diff === 0 ? 'draw' : 'lose';
      const bests = Object.assign({}, best());
      const newBest = bests[game.round] == null || t.s < bests[game.round];
      if (newBest) { bests[game.round] = t.s; store.setSetting('minigolfBest', bests); }
      const ev = store.settle(ID, { gameName: NAME, mode: R.label + R.sub, result, payout, note: t.s + ' 桿（' + toPar(diff) + '）' + (aces ? ' · 一桿進洞 ' + aces + ' 次' : ''), marks: aces ? { golfAces: aces } : null });
      audio.chime(diff <= 0 ? 'win' : 'draw');
      audio.play('payout');
      const g = game;
      modal({
        title: '打完了', center: true,
        body: h('div', null,
          h('div', { class: 'result-figure pos' }, '+' + fmt(ev.delta)),
          h('div', { class: 'result-lines' },
            h('div', null, h('span', null, '總桿數'), h('span', null, t.s + ' 桿（' + toPar(diff) + '）')),
            h('div', null, h('span', null, '一桿進洞'), h('span', null, aces + ' 次')),
            h('div', null, h('span', null, '個人最佳'), h('span', null, newBest ? '新紀錄' : bests[g.round] + ' 桿')),
            h('div', null, h('span', null, '餘額'), h('span', null, fmt(ev.balance))))),
        actions: [{ label: '看計分卡', value: 'card' }, { label: '再打一輪', value: 'again', kind: 'gold' }],
      }).then(async (v) => {
        if (!alive) return;
        if (v === 'card') { await showCard(true); }
        showSetup();
      });
    }

    // 本機開發時提供除錯用的狀態讀取
    if (location.hostname === 'localhost') window.__minigolf = { state: () => ({ phase, idx: game && game.idx, strokes: game && game.strokes, ball: ball && { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy, moving: ball.moving, hidden: ball.hidden, holed: ball.holed, t: ball.t }, world }) };
    loadHole();
  }

  function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

  const onResize = () => { if (view) view.resize(); };
  window.addEventListener('resize', onResize);

  const saved = store.loadGame(ID);
  if (saved && ROUNDS[saved.round] && saved.idx < ROUNDS[saved.round].holes.length) startRound(saved); else showSetup();

  return () => { alive = false; stopLoop(); window.removeEventListener('resize', onResize); };
}

