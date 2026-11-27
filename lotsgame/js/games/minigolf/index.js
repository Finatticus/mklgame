// 迷你高爾夫（只用推桿）：六座九洞球場（54 洞），可打單座九洞、兩座連打十八洞、單洞練習與每日挑戰。
// 依世界迷你高爾夫聯盟（WMF）的計分方式：每洞最多 6 桿，第 6 桿仍未進洞記 7 桿；落水罰一桿，從上一桿的位置重打。
import * as store from '../../store.js';
import * as audio from '../../audio.js';
import { h, fmt, modal, confirmBox } from '../../ui.js';
import { segmented, hero } from '../shared/setup.js';
import { buildHole, newBall, strike, step, STEP_DT, MAX_SPEED } from './physics.js';
import { CourseView } from './render.js';
import { COURSES } from './holes.js';
import { GOLFERS } from './ai.js';

// 本機測試用：網址加 ?fast=1 時每格推進較多模擬時間（結果不變）
const FAST = typeof location !== 'undefined' && location.hostname === 'localhost' && location.search.includes('fast=1');
const ID = 'minigolf', NAME = '迷你高爾夫';
const MAX_STROKES = 6;
const PER_UNDER = 300, PER_ACE = 500;
const PAIRS = [[0, 1], [2, 3], [4, 5], [6, 7]];
const DAILY_BASE = 400;
const holeDef = ([c, i]) => COURSES[c].holes[i];
const courseHoles = (ci) => COURSES[ci].holes.map((_, i) => [ci, i]);
const holeKey = ([c, i]) => c + '-' + i;
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

// 每日挑戰：依日期決定三個不同球場的洞，所有人同一天相同
function dailyHoles(date) {
  let s = 0;
  for (const ch of date) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const cs = COURSES.map((_, i) => i);
  for (let i = cs.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [cs[i], cs[j]] = [cs[j], cs[i]]; }
  return cs.slice(0, 3).map((c) => [c, Math.floor(rnd() * COURSES[c].holes.length)]);
}

// 一輪的定義。key：c:<球場>、p:<組合>、x:<球場>:<洞>（練習）、d:<日期>（每日）
const OLD_KEYS = { front: 'c:0', back: 'c:1', full: 'p:0' };
function roundOf(key) {
  key = OLD_KEYS[key] || key;
  const [k, a, b] = String(key).split(':');
  if (k === 'c' && COURSES[+a]) { const c = COURSES[+a]; return { key, kind: 'course', label: c.name, sub: '九洞', holes: courseHoles(+a), base: c.reward }; }
  if (k === 'p' && PAIRS[+a]) { const [x, y] = PAIRS[+a]; return { key, kind: 'pair', label: COURSES[x].name + '・' + COURSES[y].name, sub: '十八洞', holes: [...courseHoles(x), ...courseHoles(y)], base: COURSES[x].reward + COURSES[y].reward + 300 }; }
  if (k === 'x' && COURSES[+a] && COURSES[+a].holes[+b]) return { key, kind: 'practice', label: '練習', sub: COURSES[+a].holes[+b].name, holes: [[+a, +b]], base: 0 };
  if (k === 'd' && a) return { key, kind: 'daily', label: '每日挑戰', sub: a, holes: dailyHoles(a), base: DAILY_BASE };
  return null;
}
const roundPar = (R) => R.holes.reduce((s, x) => s + holeDef(x).par, 0);

// 星等：進洞 1 顆、平標準桿 2 顆、低於標準桿 3 顆（記 7 桿為 0 顆）
const starsOf = (best, par) => (best == null || best > MAX_STROKES ? 0 : best < par ? 3 : best === par ? 2 : 1);
const starText = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
// 球款：以總星數解鎖
export const BALLS = [
  { id: 'white', name: '白球', need: 0, c: [255, 255, 255] },
  { id: 'cream', name: '象牙', need: 12, c: [246, 232, 196] },
  { id: 'coral', name: '珊瑚', need: 30, c: [236, 112, 92] },
  { id: 'sky', name: '天藍', need: 50, c: [104, 168, 230] },
  { id: 'mint', name: '薄荷', need: 75, c: [120, 214, 170] },
  { id: 'stripe', name: '紅條紋', need: 100, c: [255, 255, 255], stripe: [196, 44, 36] },
  { id: 'ink', name: '墨黑', need: 130, c: [52, 52, 58] },
  { id: 'navy', name: '藍條紋', need: 160, c: [255, 255, 255], stripe: [34, 70, 160] },
  { id: 'gold', name: '金球', need: 195, c: [226, 182, 78], gloss: true },
];
const ballById = (id) => BALLS.find((b) => b.id === id) || BALLS[0];

export const RULES = `
<h4>怎麼玩</h4>
<ul>
<li>用最少的桿數把球推進洞。每洞有標準桿（2–4 桿），打完後比較總桿數與標準桿。</li>
<li>草皮有起伏：上坡要多用力，下坡會越滾越快，斜坡會讓球轉彎。圍欄會反彈，木材、石材、橡膠的彈性不同。</li>
<li>機關：水池、沙坑（大幅減速）、冰面（幾乎沒有阻力）、旋轉木槳、擺錘、滑動石閘、地下管道（從另一端出來）。</li>
</ul>
<h4>八座球場</h4>
<ul>
<li>松庭、赤岩、竹林、雪嶺、港灣、遺跡、秋楓、熔岩八座球場，每座九洞，共 72 洞。熔岩和水池一樣，掉進去罰一桿。</li>
<li>可以打單座九洞、兩座連打十八洞，或在「練習」裡挑任何一洞反覆練習（練習沒有獎勵）。</li>
<li>每日挑戰：每天從三座不同球場各抽一洞，大家同一天打的洞相同，每天第一次完成可領獎勵。</li>
<li>對戰：和電腦球友（新手、業餘、好手、職業）輪流打同一座九洞，總桿數少的獲勝；也可以兩個人用同一支手機輪流打（不計遊戲幣）。</li>
</ul>
<h4>計分</h4>
<ul>
<li>每洞最多 6 桿；第 6 桿仍未進洞，記 7 桿並進入下一洞。球落水罰一桿，從上一桿出發的位置重打。</li>
<li>成績名稱：一桿進洞、老鷹（低於標準桿 2 桿）、小鳥（低 1 桿）、平標準桿、柏忌（多 1 桿）、雙柏忌（多 2 桿）。</li>
<li>星等：每洞以最佳成績計，進洞 1 顆、平標準桿 2 顆、低於標準桿 3 顆。累積星星可以解鎖不同顏色與花紋的球。</li>
</ul>
<h4>操作</h4>
<ul>
<li>在球場任何位置按住後往<strong>反方向</strong>拉，像拉弓一樣：拉的方向決定推桿方向，拉得越遠力道越大，放開就推出。拉回起點附近再放開可以取消。</li>
<li>瞄準時，草皮上的小光點會沿著下坡方向流動，流得越快坡越陡。按「坡度」可以一直顯示。</li>
<li>中途離開會保留進度，回來從同一洞、同一位置繼續。</li>
</ul>
<h4>遊戲幣</h4>
<p>不需下注。打完一輪可得完成獎勵：松庭 600、竹林 700、赤岩與秋楓 800、雪嶺與港灣 900、遺跡 1,000、熔岩 1,100；十八洞為兩座相加再加 300；每日挑戰 ${fmt(DAILY_BASE)}。對戰電腦獲勝另有獎金：新手 200、業餘 400、好手 800、職業 1,500。</p>
<p>總桿數每低於標準桿 1 桿，再加 ${fmt(PER_UNDER)}；每次一桿進洞，再加 ${fmt(PER_ACE)}。</p>`;

function scoreName(strokes, par) {
  if (strokes === 1) return '一桿進洞';
  const d = strokes - par;
  return d <= -3 ? '信天翁' : d === -2 ? '老鷹' : d === -1 ? '小鳥' : d === 0 ? '平標準桿' : d === 1 ? '柏忌' : d === 2 ? '雙柏忌' : '多 ' + d + ' 桿';
}
const toPar = (n) => (n === 0 ? '平' : n > 0 ? '+' + n : '−' + -n);

export async function mount(root) {
  let alive = true, raf = 0, view = null, viewTheme = '', game = null;
  const cleanups = [];
  const prefs = Object.assign({ mode: 'course', course: 0, slope: false, ball: 'white', opp: 'amateur' }, store.getData().settings.minigolf || {});
  if (!['course', 'pair', 'versus', 'practice', 'daily'].includes(prefs.mode)) prefs.mode = 'course';
  const settings = () => store.getData().settings;
  const bestOf = (key) => { const b = settings().minigolfBest || {}; const old = Object.keys(OLD_KEYS).find((k) => OLD_KEYS[k] === key); return b[key] != null ? b[key] : old ? b[old] : undefined; };
  const holeBest = (ref) => (settings().minigolfHoles || {})[holeKey(ref)];
  const savePrefs = () => store.setSetting('minigolf', { mode: prefs.mode, course: prefs.course, slope: prefs.slope, ball: prefs.ball, opp: prefs.opp });
  const courseStars = (ci) => COURSES[ci].holes.reduce((n, d, hi) => n + starsOf(holeBest([ci, hi]), d.par), 0);
  const totalStars = () => COURSES.reduce((n, _, ci) => n + courseStars(ci), 0);
  if (ballById(prefs.ball).need > totalStars()) prefs.ball = 'white';

  // 球場縮圖（以該場第一洞繪製）
  function preview(ci) {
    const cv = h('canvas', { class: 'golf-thumb' });
    requestAnimationFrame(async () => {
      if (!alive || !cv.isConnected) return;
      const world = buildHole(COURSES[ci].holes[0]);
      const v = new CourseView(cv, COURSES[ci].theme);
      await v.setHole(world);
      v.draw({ time: 1, ball: newBall(world, world.tee.x, world.tee.y) });
    });
    return cv;
  }

  // ---------- 選單 ----------
  function showSetup() {
    stopLoop();
    game = null;
    const body = h('div', { class: 'golf-menu' });
    const modeOpt = segmented({
      label: '玩法', hint: '', value: prefs.mode,
      options: [{ value: 'course', label: '九洞' }, { value: 'pair', label: '十八' }, { value: 'versus', label: '對戰' }, { value: 'practice', label: '練習' }, { value: 'daily', label: '每日' }],
      onChange: (v) => { prefs.mode = v; savePrefs(); paint(); },
    });
    const me = () => ({ name: store.getData().user, ai: null, style: prefs.ball, scores: [] });
    const start = (key, players = null) => {
      savePrefs();
      startRound({ round: key, idx: 0, turn: 0, players: players || [me()], strokes: 0, ball: null, last: null, aces: 0 });
    };
    const parLine = (R) => {
      const b = bestOf(R.key);
      return '標準桿 ' + roundPar(R) + (b != null ? ' · 最佳 ' + b + '（' + toPar(b - roundPar(R)) + '）' : '');
    };
    function paint() {
      if (prefs.mode === 'course') {
        modeOpt.setHint('選一座球場打九洞');
        body.replaceChildren(h('div', { class: 'golf-courses' }, ...COURSES.map((c, ci) => {
          const R = roundOf('c:' + ci);
          return h('button', { class: 'golf-course', onClick: () => start(R.key) }, preview(ci),
            h('div', { class: 'golf-course-text' }, h('b', null, c.name), h('span', null, c.sub + ' · ★ ' + courseStars(ci) + '/27'), h('small', null, parLine(R)), h('em', { class: 'num' }, '+' + fmt(c.reward))));
        })));
      } else if (prefs.mode === 'versus') {
        const oppOpt = segmented({
          label: '對手', hint: prefs.opp === 'local' ? '兩人用同一支手機輪流打，不計遊戲幣' : '電腦' + GOLFERS[prefs.opp].name + '：獲勝另得 +' + fmt(GOLFERS[prefs.opp].bonus), value: prefs.opp,
          options: [...Object.entries(GOLFERS).map(([k, v]) => ({ value: k, label: v.name })), { value: 'local', label: '雙人' }],
          onChange: (v) => { prefs.opp = v; savePrefs(); paint(); },
        });
        modeOpt.setHint('輪流打同一座九洞，總桿數少的獲勝');
        const players = () => [me(), prefs.opp === 'local' ? { name: '玩家二', ai: null, style: 'sky', scores: [] } : { name: GOLFERS[prefs.opp].name + '球友', ai: prefs.opp, style: 'coral', scores: [] }];
        body.replaceChildren(oppOpt, h('div', { class: 'golf-courses' }, ...COURSES.map((c, ci) => h('button', { class: 'golf-course', onClick: () => start('c:' + ci, players()) }, preview(ci),
          h('div', { class: 'golf-course-text' }, h('b', null, c.name), h('span', null, c.sub), h('small', null, '標準桿 ' + roundPar(roundOf('c:' + ci))))))));
      } else if (prefs.mode === 'pair') {
        modeOpt.setHint('兩座球場連打十八洞');
        body.replaceChildren(h('div', { class: 'golf-pairs' }, ...PAIRS.map((pr, i) => {
          const R = roundOf('p:' + i);
          return h('button', { class: 'golf-pair', onClick: () => start(R.key) },
            h('div', { class: 'golf-pair-thumbs' }, preview(pr[0]), preview(pr[1])),
            h('div', { class: 'golf-course-text' }, h('b', null, R.label), h('span', null, '十八洞'), h('small', null, parLine(R)), h('em', { class: 'num' }, '+' + fmt(R.base))));
        })));
      } else if (prefs.mode === 'practice') {
        modeOpt.setHint('任選一洞反覆練習，沒有獎勵');
        const ci = prefs.course;
        const chips = segmented({ label: '球場', hint: COURSES[ci].sub, value: ci, options: COURSES.map((c, i) => ({ value: i, label: c.name })), onChange: (v) => { prefs.course = v; savePrefs(); paint(); } });
        body.replaceChildren(chips, h('div', { class: 'golf-holes' }, ...COURSES[ci].holes.map((d, hi) => {
          const b = holeBest([ci, hi]);
          return h('button', { class: 'golf-holebtn' + (b === 1 ? ' ace' : b != null && b < d.par ? ' under' : ''), onClick: () => start('x:' + ci + ':' + hi) },
            h('i', { class: 'num' }, String(hi + 1)), h('b', null, d.name), h('span', { class: 'golf-stars' }, starText(starsOf(b, d.par))), h('small', null, '標準 ' + d.par + (b != null ? ' · 最佳 ' + b : '')));
        })));
      } else {
        const date = today(), R = roundOf('d:' + date), dd = settings().minigolfDaily || {};
        const claimed = dd.date === date;
        modeOpt.setHint(claimed ? '今天已完成，再打不會有獎勵' : '每天三洞，首次完成可領獎勵');
        body.replaceChildren(h('div', { class: 'golf-daily' },
          h('div', { class: 'golf-daily-head' }, h('b', null, '每日挑戰'), h('span', { class: 'num' }, date)),
          ...R.holes.map((ref, i) => h('div', { class: 'golf-daily-row' }, h('i', { class: 'num' }, String(i + 1)), h('b', null, holeDef(ref).name), h('span', null, COURSES[ref[0]].name + ' · 標準 ' + holeDef(ref).par))),
          h('div', { class: 'golf-daily-foot' }, claimed ? '今日成績 ' + dd.score + ' 桿（' + toPar(dd.score - roundPar(R)) + '）' : '完成獎勵 +' + fmt(DAILY_BASE) + ' 起'),
          h('button', { class: 'btn btn-gold btn-block', onClick: () => start(R.key) }, claimed ? '再打一次' : '開始挑戰')));
      }
    }
    const stars = totalStars();
    const balls = h('div', { class: 'golf-balls' });
    const paintBalls = () => balls.replaceChildren(...BALLS.map((b) => {
      const locked = b.need > stars;
      const [r, g, bl] = b.c, st = b.stripe ? `, linear-gradient(90deg, transparent 32%, rgb(${b.stripe}) 32% 68%, transparent 68%)` : '';
      return h('button', { class: 'golf-ballbtn' + (prefs.ball === b.id ? ' on' : '') + (locked ? ' locked' : ''), disabled: locked, title: b.name, onClick: () => { prefs.ball = b.id; savePrefs(); paintBalls(); } },
        h('i', { style: `background: radial-gradient(circle at 35% 30%, rgba(255,255,255,0.85), rgba(255,255,255,0) 45%)${st}, rgb(${r},${g},${bl})` }),
        h('small', null, locked ? '★ ' + b.need : b.name));
    }));
    paintBalls();
    const ballOpt = h('div', { class: 'opt' }, h('div', { class: 'opt-label' }, h('span', null, '球款'), h('em', null, '已收集 ★ ' + stars + ' / ' + COURSES.length * 27)), balls);
    root.replaceChildren(h('div', { class: 'setup golf-setup' },
      hero(ID, NAME, COURSES.length + ' 座球場 · ' + COURSES.length * 9 + ' 洞'),
      modeOpt, body, ballOpt,
      h('p', { class: 'login-note', style: 'text-align:center' }, '不需下注。低於標準桿與一桿進洞有額外獎勵。')));
    paint();
  }

  // ---------- 對局 ----------
  function startRound(saved) {
    game = Object.assign({}, saved);
    const R = roundOf(game.round);
    game.round = R.key;
    // 舊存檔只有 scores：轉成單人
    if (!game.players) game.players = [{ name: store.getData().user, ai: null, style: prefs.ball, scores: game.scores || [] }];
    game.turn = game.turn || 0;
    const versus = game.players.length > 1;
    const cur = () => game.players[game.turn];
    const mine = () => game.players[0];
    let aiBusy = false, aiShot = null, worker = null, seqId = 0;
    const holeLabel = h('div', { class: 'golf-hole' });
    const statPar = h('b', { class: 'num' }), statNow = h('b', { class: 'num' }), statTot = h('b', { class: 'num' });
    const canvas = h('canvas', { class: 'golf-canvas' });
    const banner = h('div', { class: 'golf-banner' });
    const tip = h('div', { class: 'golf-tip' });
    const slopeBtn = h('button', { class: 'btn btn-sm' + (prefs.slope ? ' on' : ''), onClick: () => { prefs.slope = !prefs.slope; slopeBtn.classList.toggle('on', prefs.slope); savePrefs(); } }, '坡度');
    const cardBtn = h('button', { class: 'btn btn-sm', onClick: () => showCard(false) }, '計分卡');
    const quitBtn = h('button', { class: 'btn btn-sm', onClick: quit }, R.kind === 'practice' ? '選洞' : '放棄');
    root.replaceChildren(h('div', { class: 'golf' },
      h('div', { class: 'golf-top' }, holeLabel,
        h('div', { class: 'golf-stat' }, h('small', null, '標準桿'), statPar),
        h('div', { class: 'golf-stat' }, h('small', null, '本洞'), statNow),
        h('div', { class: 'golf-stat' }, h('small', null, '總計'), statTot)),
      h('div', { class: 'golf-stage' }, canvas, banner),
      h('div', { class: 'golf-bottom' }, tip, h('div', { class: 'golf-actions' }, quitBtn, cardBtn, slopeBtn))));

    let world = null, ball = null, phase = 'aim', aim = null, drag = null, holedAt = 0, ripples = [], rollTime = 0, flagOut = false;

    const totals = (pl = mine()) => {
      let s = 0, p = 0;
      pl.scores.forEach((sc, i) => { s += sc; p += holeDef(R.holes[i]).par; });
      return { s, p, n: pl.scores.length };
    };
    function paintTotal() { const t = totals(cur()); statTot.textContent = t.n ? toPar(t.s - t.p) : '—'; }
    function paintInfo() {
      const def = holeDef(R.holes[game.idx]);
      const title = R.kind === 'practice' ? '練習' : R.kind === 'daily' ? '挑戰第 ' + (game.idx + 1) + ' 洞' : '第 ' + (game.idx + 1) + ' 洞';
      holeLabel.replaceChildren(h('b', null, title + (versus ? ' · ' + cur().name : '')), h('span', null, def.name + ' · ' + COURSES[R.holes[game.idx][0]].name + (R.kind === 'practice' ? ' 第 ' + (R.holes[0][1] + 1) + ' 洞' : '')));
      statPar.textContent = def.par;
      statNow.textContent = game.strokes;
      tip.textContent = versus ? game.players.map((pl) => { const t = totals(pl); return pl.name + ' ' + (t.n ? toPar(t.s - t.p) : '—'); }).join('　') : def.tip;
      paintTotal();
    }
    const save = (shot = null) => store.saveGame(ID, { round: game.round, idx: game.idx, turn: game.turn, players: game.players, strokes: game.strokes, ball: ball && !ball.holed ? [ball.x, ball.y] : null, last: game.last, aces: game.aces, shot });

    async function loadHole() {
      const ref = R.holes[game.idx], def = holeDef(ref), theme = COURSES[ref[0]].theme;
      world = buildHole(def);
      if (!view || viewTheme !== theme) { view = new CourseView(canvas, theme); viewTheme = theme; }
      const start = game.ball || [world.tee.x, world.tee.y];
      const replay = game.shot;
      game.shot = null;
      ball = newBall(world, start[0], start[1], replay ? replay.t : ball ? ball.t : 0);
      phase = 'aim'; aim = null; drag = null; ripples = []; flagOut = false; aiBusy = false; aiShot = null;
      paintInfo();
      banner.className = 'golf-banner';
      await view.setHole(world);
      startLoop();
      if (replay) { strike(ball, replay.ang, replay.speed); phase = 'roll'; rollTime = 0; }
    }

    // 拉桿操作
    const stageRect = () => canvas.getBoundingClientRect();
    canvas.addEventListener('pointerdown', (e) => {
      if (phase !== 'aim' || ball.moving || cur().ai) return;
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
      const ref = R.holes[game.idx], def = holeDef(ref), who = cur(), isMe = game.turn === 0;
      who.scores.push(score);
      // 單洞紀錄與星等（只算登入的玩家）
      if (isMe) {
        const hb = Object.assign({}, settings().minigolfHoles || {});
        if (hb[holeKey(ref)] == null || score < hb[holeKey(ref)]) { hb[holeKey(ref)] = score; store.setSetting('minigolfHoles', hb); }
        if (score === 1) game.aces = (game.aces || 0) + 1;
      }
      if (game.turn < game.players.length - 1) game.turn++;
      else { game.turn = 0; game.idx++; }
      game.strokes = 0; game.ball = null; game.last = null;
      save();
      paintTotal();
      show((versus ? who.name + ' · ' : '') + (extra || scoreName(score, def.par)), score + ' 桿 · 標準桿 ' + def.par, score < def.par ? 'good' : score > def.par ? 'bad' : '');
      if (score === 1) { audio.chime('win'); audio.play('payout'); } else if (score < def.par && !who.ai) audio.chime('win');
      const g = game;
      setTimeout(() => {
        if (!alive || game !== g) return;
        hideBanner();
        if (game.idx >= R.holes.length) (R.kind === 'practice' ? endPractice : endRound)(); else loadHole();
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
      if (phase === 'aim' && cur().ai && !ball.moving) aiTurn();
      if (aiShot && phase === 'aim') {
        const k = Math.min(1, Math.max(0, 1 - (aiShot.at - ball.t) / 0.9));
        aim = { ang: aiShot.ang, f: aiShot.f * Math.min(1, k * 1.6) };
        if (ball.t >= aiShot.at) { const sh = aiShot; aiShot = null; aim = null; shoot(sh.ang, sh.speed, sh.f); }
      }
      if (phase === 'roll') {
        rollTime += dt;
        if (ball.holed && ball.t - holedAt > 0.45) finishHole(game.strokes);
        else if (!ball.holed && !ball.moving && !(ball.hidden > 0)) {
          if (game.strokes >= MAX_STROKES) finishHole(MAX_STROKES + 1, '已達 6 桿');
          else { phase = 'aim'; save(); }
        } else if (rollTime > 25) { ball.vx = ball.vy = 0; ball.moving = false; }
      }
      view.draw({ time: ball.t, ball, ballStyle: ballById(cur().style), aim: phase === 'aim' ? aim : null, showSlope: phase === 'aim' && (prefs.slope || !!aim), ripples, holedAt, flagOut: flagOut || (ball.moving && Math.hypot(ball.x - world.cup.x, ball.y - world.cup.y) < 0.3) });
    }
    function startLoop() { if (!raf) { lastNow = 0; acc = 0; raf = requestAnimationFrame(frame); } }

    // 電腦球友：在背景算好這一桿，瞄準約一秒後推出（含移動機關的時機）
    function aiTurn() {
      if (aiBusy || aiShot) return;
      aiBusy = true;
      if (!worker) {
        worker = new Worker(new URL('./ai-worker.js', import.meta.url), { type: 'module' });
        cleanups.push(() => worker.terminate());
      }
      const ref = R.holes[game.idx], at = ball.t + 1.3, id = ++seqId, g = game, lvl = cur().ai;
      worker.onmessage = (e) => {
        if (e.data.id !== id || !alive || game !== g) return;
        aiBusy = false;
        if (e.data.error) { tip.textContent = '電腦發生問題：' + e.data.error; return; }
        const { ang, speed } = e.data.result;
        aiShot = { ang, speed, f: Math.pow(Math.min(1, speed / MAX_SPEED), 1 / 1.4), at: Math.max(e.data.result.at || at, ball.t + 0.4) };
      };
      worker.postMessage({ id, payload: { def: holeDef(ref), key: holeKey(ref), x: ball.x, y: ball.y, t0: at, level: lvl } });
    }

    function showCard(final) {
      const cell = (sc, def) => { const cls = sc == null ? '' : sc === 1 ? 'ace' : sc < def.par ? 'under' : sc > def.par ? 'over' : ''; return h('td', { class: 'num' }, sc == null ? '' : h('i', { class: 'sc ' + cls }, String(sc))); };
      const rows = R.holes.map((ref, i) => {
        const def = holeDef(ref);
        return h('tr', { class: i === game.idx && !final ? 'cur' : '' }, h('td', null, String(i + 1)), h('td', null, def.name), h('td', { class: 'num' }, String(def.par)), ...game.players.map((pl) => cell(pl.scores[i], def)));
      });
      return modal({
        title: final ? '本輪成績' : '計分卡', center: true,
        body: h('div', { class: 'golf-card' }, h('table', null, h('tr', null, h('th', null, '洞'), h('th', null, '名稱'), h('th', null, '標準'), ...game.players.map((pl) => h('th', null, versus ? pl.name : '桿數'))), ...rows,
          h('tr', { class: 'sum' }, h('td', null, ''), h('td', null, '合計'), h('td', { class: 'num' }, String(roundPar(R))), ...game.players.map((pl) => { const t = totals(pl); return h('td', { class: 'num' }, t.n ? String(t.s) : ''); })))),
        actions: final ? undefined : [{ label: '繼續', value: true, kind: 'gold' }],
      });
    }

    async function quit() {
      if (R.kind !== 'practice' && !(await confirmBox('放棄這一輪', '目前成績不會保存，也不會獲得獎勵。', '放棄', '繼續打', 'danger'))) return;
      store.clearGame(ID);
      showSetup();
    }

    // 練習：打完一洞後選擇重打、下一洞或回選單
    async function endPractice() {
      stopLoop();
      store.clearGame(ID);
      const [ci, hi] = R.holes[0], d = holeDef([ci, hi]), sc = mine().scores[0], b = holeBest([ci, hi]);
      const v = await modal({
        title: d.name, center: true,
        body: h('div', { class: 'result-lines' },
          h('div', null, h('span', null, '這次'), h('span', null, sc + ' 桿（' + scoreName(sc, d.par) + '）')),
          h('div', null, h('span', null, '這洞最佳'), h('span', null, b + ' 桿 · ' + starText(starsOf(b, d.par))))),
        actions: [{ label: '選洞', value: 'menu' }, { label: '下一洞', value: 'next' }, { label: '再打一次', value: 'again', kind: 'gold' }],
      });
      if (!alive) return;
      const fresh = (key) => startRound({ round: key, idx: 0, turn: 0, players: [{ name: store.getData().user, ai: null, style: prefs.ball, scores: [] }], strokes: 0, ball: null, last: null, aces: 0 });
      if (v === 'again') fresh(R.key);
      else if (v === 'next') { const nh = (hi + 1) % COURSES[ci].holes.length, nc = nh === 0 ? (ci + 1) % COURSES.length : ci; prefs.course = nc; savePrefs(); fresh('x:' + nc + ':' + nh); }
      else showSetup();
    }

    function endRound() {
      stopLoop();
      if (versus) return endVersus();
      const t = totals(), par = roundPar(R), diff = t.s - par;
      const under = Math.max(0, -diff), aces = game.aces || 0;
      const result = diff < 0 ? 'win' : diff === 0 ? 'draw' : 'lose';
      const bests = Object.assign({}, settings().minigolfBest || {});
      const prevBest = bestOf(R.key);
      const newBest = prevBest == null || t.s < prevBest;
      if (newBest) { bests[R.key] = t.s; store.setSetting('minigolfBest', bests); }
      // 每日挑戰每天只發一次獎勵
      const dd = settings().minigolfDaily || {};
      const dailyRepeat = R.kind === 'daily' && dd.date === R.sub;
      if (R.kind === 'daily' && !dailyRepeat) store.setSetting('minigolfDaily', { date: R.sub, score: t.s });
      const payout = R.base + under * PER_UNDER + aces * PER_ACE;
      const ev = dailyRepeat ? (store.clearGame(ID), { delta: 0, balance: store.balance() }) : store.settle(ID, { gameName: NAME, mode: R.label + R.sub, result, payout, note: t.s + ' 桿（' + toPar(diff) + '）' + (aces ? ' · 一桿進洞 ' + aces + ' 次' : ''), marks: aces ? { golfAces: aces } : null });
      audio.chime(diff <= 0 ? 'win' : 'draw');
      audio.play('payout');
      const g = game;
      modal({
        title: '打完了', center: true,
        body: h('div', null,
          h('div', { class: 'result-figure ' + (ev.delta ? 'pos' : '') }, ev.delta ? '+' + fmt(ev.delta) : '今日已領過'),
          h('div', { class: 'result-lines' },
            h('div', null, h('span', null, '總桿數'), h('span', null, t.s + ' 桿（' + toPar(diff) + '）')),
            h('div', null, h('span', null, '一桿進洞'), h('span', null, aces + ' 次')),
            h('div', null, h('span', null, '個人最佳'), h('span', null, newBest ? '新紀錄' : prevBest + ' 桿')),
            h('div', null, h('span', null, '餘額'), h('span', null, fmt(ev.balance))))),
        actions: [{ label: '看計分卡', value: 'card' }, { label: '再打一輪', value: 'again', kind: 'gold' }],
      }).then(async (v) => {
        if (!alive) return;
        if (v === 'card') { await showCard(true); }
        showSetup();
      });
    }

    function endVersus() {
      const ts = game.players.map((pl) => totals(pl).s), best = Math.min(...ts);
      const winners = game.players.filter((_, i) => ts[i] === best);
      const opp = game.players[1], human = mine(), t = totals(human), diff = t.s - roundPar(R);
      const result = ts[0] < ts[1] ? 'win' : ts[0] > ts[1] ? 'lose' : 'draw';
      let ev = null;
      if (opp.ai) {
        const lv = GOLFERS[opp.ai], aces = game.aces || 0;
        const payout = R.base + Math.max(0, -diff) * PER_UNDER + aces * PER_ACE + (result === 'win' ? lv.bonus : 0);
        ev = store.settle(ID, { gameName: NAME, mode: '對戰' + lv.name + ' · ' + R.label, result, payout, note: t.s + ' 比 ' + ts[1] + ' 桿' + (aces ? ' · 一桿進洞 ' + aces + ' 次' : ''), marks: aces ? { golfAces: aces } : null });
      } else store.clearGame(ID);
      audio.chime(result === 'win' ? 'win' : result === 'lose' ? 'lose' : 'draw');
      if (ev && ev.delta > 0) audio.play('payout');
      const head = winners.length > 1 ? '平手' : winners[0].name + ' 獲勝';
      modal({
        title: head, center: true,
        body: h('div', null,
          ev ? h('div', { class: 'result-figure ' + (ev.delta > 0 ? 'pos' : '') }, '+' + fmt(ev.delta)) : null,
          h('div', { class: 'result-lines' },
            ...game.players.map((pl, i) => h('div', null, h('span', null, pl.name), h('span', null, ts[i] + ' 桿（' + toPar(ts[i] - roundPar(R)) + '）'))),
            ev ? h('div', null, h('span', null, '餘額'), h('span', null, fmt(ev.balance))) : null)),
        actions: [{ label: '看計分卡', value: 'card' }, { label: '回選單', value: 'menu', kind: 'gold' }],
      }).then(async (v) => { if (!alive) return; if (v === 'card') await showCard(true); showSetup(); });
    }

    // 本機開發時提供除錯用的狀態讀取
    if (location.hostname === 'localhost') window.__minigolf = { state: () => ({ phase, idx: game && game.idx, turn: game && game.turn, ai: cur().ai, strokes: game && game.strokes, ball: ball && { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy, moving: ball.moving, hidden: ball.hidden, holed: ball.holed, t: ball.t }, world }) };
    loadHole();
  }

  function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

  const onResize = () => { if (view) view.resize(); };
  window.addEventListener('resize', onResize);

  const saved = store.loadGame(ID);
  const sr = saved && roundOf(saved.round);
  if (sr && saved.idx < sr.holes.length) startRound(saved); else showSetup();

  return () => { alive = false; stopLoop(); window.removeEventListener('resize', onResize); cleanups.forEach((f) => f()); };
}

