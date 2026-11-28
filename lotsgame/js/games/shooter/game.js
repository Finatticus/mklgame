// 蒼穹戰機的遊戲引擎：固定時間步長更新、手指相對拖曳操控、自動射擊。
import { buildSprites, blit, rotor } from './sprites.js';
import { Terrain, W, TEXTURES, pathX } from './terrain.js';
import { STAGES } from './stages.js';
import * as audio from '../../audio.js';
import { asset } from '../../ui.js';

const DT = 1 / 120;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rand = (a, b) => a + Math.random() * (b - a);
const ang = (x0, y0, x1, y1) => Math.atan2(y1 - y0, x1 - x0);

let SPR = null;
const texCache = {};
async function loadTextures() {
  await Promise.all(TEXTURES.map((n) => texCache[n] || (texCache[n] = new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = asset('shooter/' + n + '.jpg'); }))));
  const out = {};
  for (const n of TEXTURES) out[n] = await texCache[n];
  return out;
}

export async function createGame(canvas, { difficulty = 'normal', onEvent = () => {}, onHud = () => {} } = {}) {
  if (!SPR) { try { await Promise.all([document.fonts.load('700 12px "LG Latin"'), document.fonts.load('700 12px "LG Serif TC"', '第一關海岸')]); } catch (e) { /* 字型載入失敗仍可玩 */ } SPR = buildSprites(); }
  const TEX = await loadTextures();
  const ctx = canvas.getContext('2d');
  const hard = difficulty === 'hard';
  const BS = hard ? 1.22 : 1; // 敵彈速度倍率
  const G = {
    H: 640, ppu: 2, scroll: 0, speed: 34, t: 0, stageIdx: 0, stage: null, terrain: null,
    shots: [], eshots: [], enemies: [], items: [], fx: [], under: [],
    score: 0, state: 'load', stateT: 0, spawnIdx: 0, boss: null, shake: 0, paused: false, banner: null, flash: 0,
  };
  const P = { x: W / 2, y: 560, alive: true, inv: 0, weapon: 'V', lv: 1, mis: 0, bombs: 3, lives: 3, fireT: 0, misT: 0, deadT: 0, bank: 0, laserOn: 0, laserHits: [] };
  G.P = P;

  // ---------------- 畫布尺寸 ----------------
  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    G.ppu = canvas.width / W;
    G.H = canvas.height / G.ppu;
    if (G.terrain) { G.terrain.ppu = G.ppu; G.terrain.cache.clear(); }
  }
  resize();
  const ro = new ResizeObserver(resize); ro.observe(canvas);

  // ---------------- 操作 ----------------
  let drag = null;
  const keys = new Set();
  const toUnits = (e) => { const r = canvas.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * G.H }; };
  const onDown = (e) => { if (G.paused) return; const p = toUnits(e); drag = { id: e.pointerId, sx: p.x, sy: p.y, px: P.x, py: P.y }; canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); e.preventDefault(); };
  const onMove = (e) => {
    if (!drag || drag.id !== e.pointerId || !P.alive) return;
    const p = toUnits(e);
    const k = 1.25; // 手指移動 1 公分，飛機移動 1.25 公分，手指不會擋住機身
    P.tx = clamp(drag.px + (p.x - drag.sx) * k, 12, W - 12);
    P.ty = clamp(drag.py + (p.y - drag.sy) * k, 30, G.H - 22);
  };
  const onUp = (e) => { if (drag && drag.id === e.pointerId) drag = null; };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  const kd = (e) => { keys.add(e.key.toLowerCase()); if (e.key === ' ' || e.key.toLowerCase() === 'x') { bomb(); e.preventDefault(); } if (e.key.startsWith('Arrow')) e.preventDefault(); };
  const ku = (e) => keys.delete(e.key.toLowerCase());
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);

  // ---------------- 關卡 ----------------
  function startStage(i, carry) {
    const st = STAGES[i];
    G.stageIdx = i; G.stage = st;
    G.terrain = new Terrain(st, TEX, G.ppu);
    G.scroll = 0; G.speed = st.speed; G.spawnIdx = 0; G.boss = null;
    G.shots = []; G.eshots = []; G.enemies = []; G.items = []; G.fx = []; G.under = [];
    if (carry) Object.assign(P, carry);
    Object.assign(P, { x: W / 2, y: G.H + 30, tx: W / 2, ty: G.H - 90, alive: true, inv: 3, deadT: 0 });
    G.state = 'intro'; G.stateT = 0;
    G.banner = { title: st.title, sub: st.sub, t: 0 };
    hud();
  }
  const snapshot = () => ({ stage: G.stageIdx, score: G.score, lives: P.lives, bombs: P.bombs, weapon: P.weapon, lv: P.lv, mis: P.mis });
  // 分數達到 10 萬、30 萬各加一架
  const EXTENDS = [100000, 300000];
  function hud() {
    G.ext = G.ext || 0;
    if (G.ext < EXTENDS.length && G.score >= EXTENDS[G.ext]) { G.ext++; P.lives++; audio.play('power', { volume: 0.6, rate: 0.8 }); floatText(P.x, P.y - 30, '增加一架'); }
    onHud({ score: G.score, lives: P.lives, bombs: P.bombs, stage: G.stageIdx + 1, weapon: P.weapon, lv: P.lv, mis: P.mis }); }

  // ---------------- 敵人 ----------------
  const pal = () => G.stage.pal;
  function addEnemy(e) {
    e.t = 0; e.flash = 0; e.fire = e.fire || 0; e.maxhp = e.hp; e.rot = e.rot ?? Math.PI;
    G.enemies.push(e);
    return e;
  }
  // 地面單位的畫面 y
  const gy = (d) => G.H - (d - G.scroll);

  const SPAWN = {
    // 小型戰機：沿路徑飛
    fighter(s) {
      const n = s.n || 1;
      for (let i = 0; i < n; i++) {
        addEnemy({ kind: 'fighter', air: true, hp: hard ? 4 : 3, r: 11, score: 200, sp: 'fighter_' + (s.pal || pal()), path: s.path || 'dive', x0: s.x ?? rand(40, W - 40), delay: i * (s.gap ?? 0.35), i, shoot: s.shoot ?? 0.5, x: -999, y: -999 });
      }
    },
    heavy(s) { addEnemy({ kind: 'heavy', air: true, hp: hard ? 34 : 28, r: 17, score: 1500, sp: 'heavy_' + (s.pal || pal()), x: s.x ?? W / 2, y: -30, ty: s.ty ?? 130, stay: s.stay ?? 5, drop: s.drop }); },
    heli(s) { addEnemy({ kind: 'heli', air: true, hp: s.carrier ? 10 : 12, r: 13, score: 600, sp: 'heli_' + (s.carrier ? 'sand' : s.pal || pal()), x: s.x ?? rand(60, W - 60), y: -30, ty: s.ty ?? rand(90, 200), stay: s.stay ?? 4.5, drop: s.carrier ? (s.drop || 'W') : null, carrier: !!s.carrier }); },
    tank(s) {
      const n = s.n || 1;
      for (let i = 0; i < n; i++) addEnemy({ kind: 'tank', ground: true, hp: 9, r: 10, score: 400, sp: 'hull_' + (s.pal || pal()), tsp: 'turret_' + (s.pal || pal()), x: s.x ?? 180, d: s.d + 30 + i * 26, road: s.road, vd: s.vd ?? -8, rot: s.road ? Math.PI : (s.rot ?? Math.PI), trot: Math.PI, drop: s.drop });
    },
    aa(s) { addEnemy({ kind: 'aa', ground: true, hp: 16, r: 10, score: 700, sp: 'aa', pad: true, x: s.x, d: s.d + 30, trot: Math.PI, rot: 0 }); },
    boat(s) { addEnemy({ kind: 'boat', ground: true, hp: 18, r: 14, score: 900, sp: 'boat', tsp: 'boatTurret', x: s.x, d: s.d + 40, vd: s.vd ?? 14, vx: s.vx || 0, rot: s.vx ? Math.atan2(-s.vx, s.vd ?? 14) + Math.PI : 0, trot: Math.PI, wake: true, drop: s.drop }); },
    truck(s) {
      const n = s.n || 3;
      for (let i = 0; i < n; i++) addEnemy({ kind: 'truck', ground: true, hp: 4, r: 8, score: 300, sp: 'truck', x: s.x ?? 180, d: s.d + 30 + i * 22, road: s.road, vd: s.vd ?? 18, rot: 0, drop: i === n - 1 ? (s.drop || 'P') : null });
    },
    boss(s) { G.boss = makeBoss(s.kind); G.enemies.push(G.boss); G.state = 'boss'; G.banner = { title: G.stage.bossName, sub: '注意', t: 0, warn: true }; },
  };

  // 小型戰機的飛行路徑（t：秒）回傳畫面座標
  const PATHS = {
    dive: (e, t) => ({ x: e.x0 + Math.sin(t * 1.6 + e.i) * 18, y: -20 + t * 150 }),
    curveL: (e, t) => { const a = t * 0.9; return { x: -20 + Math.sin(a) * 260 + e.i * 0, y: -20 + (1 - Math.cos(a)) * 300 }; },
    curveR: (e, t) => { const a = t * 0.9; return { x: W + 20 - Math.sin(a) * 260, y: -20 + (1 - Math.cos(a)) * 300 }; },
    vee: (e, t) => { const y = -20 + t * 170; return { x: e.x0 + (e.i % 2 ? 1 : -1) * Math.ceil(e.i / 2) * 22, y }; },
    swoopL: (e, t) => (t < 1.4 ? { x: e.x0, y: -20 + t * 160 } : { x: e.x0 - (t - 1.4) * 170, y: 204 - (t - 1.4) * 60 }),
    swoopR: (e, t) => (t < 1.4 ? { x: e.x0, y: -20 + t * 160 } : { x: e.x0 + (t - 1.4) * 170, y: 204 - (t - 1.4) * 60 }),
    loop: (e, t) => { if (t < 1.2) return { x: e.x0, y: -20 + t * 170 }; const a = (t - 1.2) * 2.4; return { x: e.x0 + Math.sin(a) * 50 * (e.x0 < W / 2 ? 1 : -1), y: 184 + Math.cos(a) * -50 + 50 - (t > 3.8 ? (t - 3.8) * 260 : 0) }; },
    straight: (e, t) => ({ x: e.x0, y: -20 + t * 220 }),
  };

  // 子彈
  function bullet(x, y, a, spd, kind = 'ebSmall', r = 3) { G.eshots.push({ x, y, vx: Math.cos(a) * spd * BS, vy: Math.sin(a) * spd * BS, sp: kind, r, rot: a + Math.PI / 2 }); }
  function aimed(x, y, spd, n = 1, spread = 0.18, kind, r) { const a = ang(x, y, P.x, P.y); for (let i = 0; i < n; i++) bullet(x, y, a + (i - (n - 1) / 2) * spread, spd, kind, r); }
  function ring(x, y, n, spd, off = 0, kind, r) { for (let i = 0; i < n; i++) bullet(x, y, off + (i / n) * TAU, spd, kind, r); }
  const onScreen = (e, m = 10) => e.y > -m && e.y < G.H + m && e.x > -m && e.x < W + m;

  function updateEnemy(e, dt) {
    e.t += dt; if (e.flash > 0) e.flash -= dt;
    if (e.ground && e.kind !== 'boss') {
      if (e.road) { e.d += (e.vd || 0) * dt; e.x = pathX(e.road, e.d); const nx = pathX(e.road, e.d + Math.sign(e.vd || 1) * 4); e.rot = (e.vd || 1) > 0 ? Math.atan2(nx - e.x, 4) : Math.PI + Math.atan2(e.x - nx, 4); }
      else if (e.vd) { e.d += e.vd * dt; e.x += (e.vx || 0) * dt; }
      e.y = gy(e.d);
    }
    switch (e.kind) {
      case 'fighter': {
        const t = e.t - e.delay; if (t < 0) { e.x = -999; return; }
        const p = PATHS[e.path](e, t), dx = p.x - e.x, dy = p.y - e.y;
        if (e.x > -900) e.rot = Math.atan2(dy, dx) + Math.PI / 2;
        e.x = p.x; e.y = p.y;
        if (!e.shot && t > e.shoot && onScreen(e) && e.y < G.H * 0.6) { e.shot = true; aimed(e.x, e.y, 120); }
        if (t > 1 && !onScreen(e, 40)) e.dead = 'gone';
        break;
      }
      case 'heavy': {
        if (e.t < 1.5) e.y += (e.ty - e.y) * Math.min(1, dt * 2.2) + 0.4;
        else if (e.t < 1.5 + e.stay) { e.x += Math.sin(e.t * 0.9) * 22 * dt; if ((e.fire -= dt) <= 0) { e.fire = 1.3; if (e.t % 2.6 < 1.3) aimed(e.x, e.y + 12, 115, hard ? 7 : 5, 0.2, 'ebMid', 4); else { aimed(e.x - 10, e.y + 6, 150, 1, 0, 'ebNeedle', 3); aimed(e.x + 10, e.y + 6, 150, 1, 0, 'ebNeedle', 3); } } }
        else { e.y -= 90 * dt; if (e.y < -40) e.dead = 'gone'; }
        e.rot = Math.PI;
        break;
      }
      case 'heli': {
        if (e.t < 1.4) e.y += (e.ty - e.y) * Math.min(1, dt * 2.5) + 0.5;
        else if (e.t < 1.4 + e.stay) { e.x += Math.sin(e.t * 1.3) * 16 * dt; if (!e.carrier && (e.fire -= dt) <= 0) { e.fire = 1.6; e.burst = 3; } if (e.burst > 0 && (e.bt = (e.bt || 0) - dt) <= 0) { e.bt = 0.12; e.burst--; aimed(e.x, e.y + 8, 140, 1, 0, 'ebSmall', 3); } }
        else { e.y -= 70 * dt; e.x += (e.x < W / 2 ? -1 : 1) * 40 * dt; if (e.y < -40) e.dead = 'gone'; }
        e.rot = Math.PI + clamp((P.x - e.x) * 0.004, -0.4, 0.4);
        break;
      }
      case 'tank': case 'aa': case 'boat': {
        e.trot = ang(e.x, e.y, P.x, P.y) + Math.PI / 2;
        if (onScreen(e, -8) && e.y < G.H - 60 && (e.fire -= dt) <= 0) {
          e.fire = e.kind === 'aa' ? 1.5 : rand(1.6, 2.6);
          const a = e.trot - Math.PI / 2, mx = e.x + Math.cos(a) * 10, my = e.y + Math.sin(a) * 10;
          if (e.kind === 'aa') { e.burst = 4; } else aimed(mx, my, e.kind === 'boat' ? 110 : 100, e.kind === 'boat' ? 3 : 1, 0.22, 'ebMid', 4);
          G.fx.push({ k: 'muzzle', x: mx, y: my, t: 0, life: 0.1, a });
        }
        if (e.burst > 0 && (e.bt = (e.bt || 0) - dt) <= 0) { e.bt = 0.1; e.burst--; aimed(e.x, e.y, 150, 2, 0.08, 'ebSmall', 3); }
        if (e.wake && Math.random() < dt * 14) G.under.push({ k: 'wake', x: e.x + rand(-3, 3), d: e.d - 16, t: 0, life: 1.6, r: rand(2, 4) });
        if (e.y > G.H + 40 || e.y < -200 && e.vd > 0 && e.d > G.scroll + G.H + 300) e.dead = 'gone';
        break;
      }
      case 'truck': {
        if (e.y > G.H + 40) e.dead = 'gone';
        break;
      }
      case 'boss': updateBoss(e, dt); break;
      default: break;
    }
  }

  // ---------------- 頭目 ----------------
  function part(ox, oy, sp, hp, r, extra = {}) { return { ox, oy, sp, hp, maxhp: hp, r, rot: Math.PI, flash: 0, dead: false, fire: rand(0.5, 1.5), ...extra }; }
  function makeBoss(kind) {
    const k = hard ? 1.25 : 1;
    const B = { kind: 'boss', boss: kind, air: false, x: W / 2, y: -160, t: 0, flash: 0, phase: 1, rot: 0, fire: 2, parts: [], r: 30, score: 30000 };
    if (kind === 'cruiser') Object.assign(B, { sp: 'cruiser', hp: 420 * k, r: 26, ty: 200, parts: [part(0, -78, 'bigTurret', 60 * k, 12), part(0, -48, 'bigTurret', 60 * k, 12), part(0, 52, 'bigTurret', 60 * k, 12), part(0, 76, 'boatTurret', 30 * k, 8)], name: '巡洋艦' });
    if (kind === 'tank') Object.assign(B, { sp: 'tankBoss', hp: 520 * k, r: 34, ty: 210, parts: [part(0, -8, 'bossTurretBig', 110 * k, 16, { main: true }), part(-26, -50, 'bossTurretSmall', 40 * k, 9), part(26, -50, 'bossTurretSmall', 40 * k, 9)] });
    if (kind === 'fortress') Object.assign(B, { sp: 'fortress', ground: true, hp: 560 * k, r: 18, ty: 220, coreSp: 'core', parts: [part(-80, -55, 'bigTurret', 70 * k, 12), part(80, -55, 'bigTurret', 70 * k, 12), part(-80, 60, 'bigTurret', 70 * k, 12), part(80, 60, 'bigTurret', 70 * k, 12)] });
    if (kind === 'bomber') Object.assign(B, { sp: 'bomber', air: true, hp: 600 * k, r: 18, ty: 170, parts: [part(-96, 6, 'engine', 55 * k, 11, { eng: true }), part(-54, -14, 'engine', 55 * k, 11, { eng: true }), part(54, -14, 'engine', 55 * k, 11, { eng: true }), part(96, 6, 'engine', 55 * k, 11, { eng: true })] });
    if (kind === 'wing') Object.assign(B, { sp: 'wing', air: true, hp: 900 * k, r: 22, ty: 170, coreSp: 'core', parts: [part(-120, 30, 'bigTurret', 60 * k, 12), part(-64, 0, 'bossTurretSmall', 45 * k, 9), part(64, 0, 'bossTurretSmall', 45 * k, 9), part(120, 30, 'bigTurret', 60 * k, 12), part(-30, 40, 'aa', 40 * k, 9), part(30, 40, 'aa', 40 * k, 9)] });
    B.maxhp = B.hp;
    return B;
  }
  function updateBoss(B, dt) {
    // 進場
    if (B.y < B.ty) { B.y += Math.max(20, (B.ty - B.y) * 0.9) * dt; if (B.y >= B.ty) { B.y = B.ty; B.ready = true; } }
    const ready = B.ready;
    if (B.hp < B.maxhp * 0.5 && B.phase === 1) { B.phase = 2; G.shake = 0.5; audio.play('bigboom', { volume: 0.6 }); }
    B.x = W / 2 + Math.sin(B.t * 0.35) * (B.boss === 'fortress' ? 0 : 46);
    if (B.air) B.rot = Math.sin(B.t * 0.7) * 0.04;
    // 部件射擊
    for (const p of B.parts) {
      if (p.dead) continue;
      p.flash > 0 && (p.flash -= dt);
      p.x = B.x + p.ox; p.y = B.y + p.oy;
      p.rot = p.eng ? 0 : ang(p.x, p.y, P.x, P.y) + Math.PI / 2;
      if (!ready) continue;
      if ((p.fire -= dt) <= 0) {
        if (p.main) { p.fire = B.phase === 2 ? 1.4 : 2; aimed(p.x, p.y + 10, 120, 3, 0.26, 'ebBig', 6); }
        else if (p.eng) { p.fire = 2.2; bullet(p.x, p.y + 14, Math.PI / 2, 70, 'ebBig', 6); aimed(p.x, p.y + 14, 130, 2, 0.4, 'ebMid', 4); }
        else if (p.sp === 'aa') { p.fire = 1.6; p.burst = 5; }
        else { p.fire = rand(1.4, 2.2) / (B.phase === 2 ? 1.3 : 1); aimed(p.x, p.y, 125, 2, 0.12, 'ebMid', 4); }
        G.fx.push({ k: 'muzzle', x: p.x, y: p.y + 8, t: 0, life: 0.1, a: p.rot - Math.PI / 2 });
      }
      if (p.burst > 0 && (p.bt = (p.bt || 0) - dt) <= 0) { p.bt = 0.09; p.burst--; aimed(p.x, p.y, 160, 1, 0, 'ebNeedle', 3); }
    }
    if (!ready) return;
    // 本體招式
    B.fire -= dt;
    if (B.fire <= 0) {
      const ph2 = B.phase === 2;
      switch (B.boss) {
        case 'cruiser': B.fire = ph2 ? 1.6 : 2.4; ring(B.x, B.y + 12, hard ? 22 : 16, 85, B.t, 'ebSmall', 3); if (ph2) setTimeout(() => G.boss && ring(B.x, B.y + 12, 16, 70, B.t + 0.2, 'ebMid', 4), 300); break;
        case 'tank': B.fire = ph2 ? 1.3 : 2; for (let i = -2; i <= 2; i++) bullet(B.x + i * 12, B.y + 40, Math.PI / 2 + i * 0.12, 105, 'ebMid', 4); break;
        case 'fortress': B.fire = 0.12; B.spin = (B.spin || 0) + (ph2 ? 0.37 : 0.29); for (let k = 0; k < (ph2 ? 4 : 3); k++) bullet(B.x, B.y, B.spin + (k * TAU) / (ph2 ? 4 : 3), 80, 'ebSmall', 3); if (B.t % 6 > 4.5) B.fire = 0.4; break;
        case 'bomber': B.fire = ph2 ? 1 : 1.6; aimed(B.x, B.y - 40, 150, ph2 ? 7 : 5, 0.15, 'ebNeedle', 3); break;
        case 'wing': {
          B.fire = hard ? (ph2 ? 0.1 : 0.16) : (ph2 ? 0.16 : 0.22); B.spin = (B.spin || 0) + (ph2 ? 0.21 : 0.17);
          const n = ph2 ? (hard ? 5 : 4) : 3;
          for (let k = 0; k < n; k++) bullet(B.x, B.y + 20, B.spin + (k * TAU) / n, 90, ph2 && k % 2 ? 'ebMid' : 'ebSmall', 3.5);
          if (B.t % 5 < (hard ? 0.2 : 0.22) && !B.ringed) { B.ringed = true; ring(B.x, B.y + 20, hard ? 24 : 16, 60, B.t, 'ebBig', 6); }
          if (B.t % 5 > 0.5) B.ringed = false;
          break;
        }
        default: break;
      }
    }
    if (B.boss === 'tank') B.ty = 210 + (B.phase === 2 ? Math.sin(B.t * 0.8) * 50 : 0);
  }

  // ---------------- 玩家武器 ----------------
  function firePlayer(dt) {
    P.fireT -= dt; P.misT -= dt;
    if (P.weapon === 'V') {
      if (P.fireT <= 0) {
        P.fireT = 0.072;
        const lv = P.lv, n = [2, 3, 4, 5, 6, 7, 8, 9][lv - 1], spread = [0, 0.07, 0.09, 0.11, 0.12, 0.13, 0.14, 0.15][lv - 1];
        for (let i = 0; i < n; i++) {
          const off = i - (n - 1) / 2, a = -Math.PI / 2 + off * spread * (lv <= 1 ? 0 : 1);
          const x = P.x + (lv <= 1 ? off * 7 : off * 2.4);
          G.shots.push({ x, y: P.y - 16, vx: Math.cos(a) * 560, vy: Math.sin(a) * 560, dmg: 1, sp: Math.abs(off) > 1.5 ? 'vulcanSide' : 'vulcan', rot: a + Math.PI / 2 });
        }
        audio.gun(0.06);
      }
      P.laserOn = 0;
    } else {
      P.laserOn = Math.min(1, P.laserOn + dt * 8);
      if (P.fireT <= 0) { P.fireT = 0.4; audio.play('laser', { volume: 0.12, rate: 1.3 }); }
    }
    if (P.mis > 0 && P.misT <= 0) {
      P.misT = 0.62 - P.mis * 0.06;
      for (const s of [-1, 1]) for (let k = 0; k < Math.ceil(P.mis / 2); k++) G.shots.push({ x: P.x + s * (10 + k * 4), y: P.y + 2, vx: s * 60, vy: -60, dmg: 3, sp: 'missile', missile: true, rot: 0, t: 0 });
      audio.play('missile', { volume: 0.08, rate: 1.4 });
    }
  }
  // 雷射：從機首往上，碰到的所有目標都受傷害
  function laserTick(dt) {
    if (P.weapon !== 'L' || !P.alive || P.laserOn <= 0) return;
    const w = 5 + P.lv * 1.6, dps = 34 + P.lv * 8;
    P.laserHits = [];
    for (const e of G.enemies) {
      if (e.dead || e.y > P.y || e.y < -20) continue;
      const tg = e.parts && e.ready ? [...e.parts.filter((p) => !p.dead), e] : [e];
      for (const o of tg) if (Math.abs(o.x - P.x) < o.r + w / 2 && o.y < P.y) { hit(e, o, dps * dt); if (Math.random() < dt * 30) P.laserHits.push({ x: P.x + rand(-w / 2, w / 2), y: o.y + rand(-4, 4) }); }
    }
  }

  // 擊中：o 是本體或部件
  function hit(e, o, dmg) {
    if (e.dead) return;
    if (e.kind === 'boss' && !e.ready) return;
    o.hp -= dmg; o.flash = 0.05;
    if (o !== e) { if (o.hp <= 0 && !o.dead) { o.dead = true; G.score += 2000; explode(o.x, o.y, 1.4, e.air); hud(); } return; }
    if (e.hp <= 0) kill(e);
  }
  function kill(e) {
    e.dead = 'killed';
    G.score += e.score;
    const big = e.kind === 'heavy' || e.kind === 'boat' || e.kind === 'aa';
    explode(e.x, e.y, e.kind === 'boss' ? 3 : big ? 1.6 : e.kind === 'fighter' ? 1 : 1.2, e.air);
    if (e.ground && e.kind !== 'boat') G.terrain.decal(e.x, e.d, big ? 14 : 10);
    if (e.ground && e.kind !== 'boat') G.under.push({ k: 'wreck', sp: e.sp, x: e.x, d: e.d, rot: e.rot, t: 0, life: 9 });
    if (e.drop) dropItem(e.x, e.y, e.drop);
    else if (e.kind === 'heavy' || (e.kind !== 'fighter' && Math.random() < 0.18)) dropItem(e.x, e.y, 'medal');
    if (e.kind === 'boss') bossDown(e);
    hud();
  }

  // ---------------- 道具 ----------------
  function dropItem(x, y, type) { G.items.push({ type, x, y, vx: rand(-30, 30), vy: rand(20, 40), t: 0 }); }
  function pickup(it) {
    const at = (k) => { G.score += 5000; floatText(it.x, it.y, '5000'); return k; };
    let label = '';
    if (it.type === 'medal') { G.medal = Math.min(10000, (G.medal || 500) + 500); G.score += G.medal; label = String(G.medal); audio.play('hitm', { volume: 0.25, rate: 1.8 }); }
    else {
      audio.play('power', { volume: 0.5 });
      if (it.type === 'W') { const w = Math.floor(it.t / 2.2) % 2 ? 'L' : 'V'; if (P.weapon === w) P.lv < 8 ? (P.lv++, (label = '火力提升')) : at(); else { P.weapon = w; label = w === 'V' ? '機砲' : '雷射'; } }
      else if (it.type === 'P') { if (P.lv < 8) { P.lv++; label = '火力提升'; } else at(); }
      else if (it.type === 'M') { if (P.mis < 4) { P.mis++; label = '追蹤飛彈'; } else at(); }
      else if (it.type === 'B') { if (P.bombs < 6) { P.bombs++; label = '炸彈'; } else at(); }
    }
    if (label) floatText(it.x, it.y, label);
    hud();
  }
  function floatText(x, y, s) { G.fx.push({ k: 'text', x, y, s, t: 0, life: 1 }); }

  // ---------------- 爆炸與特效 ----------------
  function explode(x, y, size = 1, air = true) {
    if (!Number.isFinite(x + y)) return;
    G.fx.push({ k: 'fire', x, y, t: 0, life: 0.55 + size * 0.15, r: 14 * size, air });
    G.fx.push({ k: 'ring', x, y, t: 0, life: 0.35, r: 22 * size });
    for (let i = 0; i < 6 + size * 6; i++) { const a = rand(0, TAU), v = rand(40, 150) * size; G.fx.push({ k: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: rand(0.25, 0.6) }); }
    for (let i = 0; i < 3 + size * 3; i++) { const a = rand(0, TAU), v = rand(10, 40); G.fx.push({ k: 'smoke', x: x + rand(-6, 6) * size, y: y + rand(-6, 6) * size, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: rand(0.9, 1.6) * Math.sqrt(size), r: rand(6, 10) * size, ground: !air }); }
    for (let i = 0; i < 3 + size * 2; i++) { const a = rand(0, TAU), v = rand(50, 120) * size; G.fx.push({ k: 'debris', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: rand(0.5, 0.9), rot: rand(0, 6), w: rand(1.5, 3.5) }); }
    if (size >= 1.5) G.shake = Math.max(G.shake, 0.12 * size);
    audio.play(size >= 2.5 ? 'bigboom' : 'boom', { volume: Math.min(0.9, 0.3 + size * 0.15), rate: size >= 1.5 ? 0.85 : 1.1 });
  }
  function bossDown(B) {
    for (const p of B.parts) p.dead = true;
    G.state = 'bossdown'; G.stateT = 0; G.eshots = [];
    for (let i = 0; i < 14; i++) setTimeout(() => explode(B.x + rand(-60, 60), B.y + rand(-60, 60), rand(1.2, 2.4), B.air), i * 140);
    setTimeout(() => { explode(B.x, B.y, 4, B.air); G.flash = 1; }, 2100);
  }

  function bomb() {
    if (G.paused || !P.alive || P.bombs <= 0 || G.state === 'load' || G.bombT > 0) return;
    P.bombs--; P.inv = Math.max(P.inv, 2.6); G.bombT = 2.4;
    G.fx.push({ k: 'bomb', x: P.x, y: P.y - 120, t: 0, life: 2.2 });
    audio.play('bigboom', { volume: 0.8 });
    hud();
  }
  function bombTick(dt) {
    if (!(G.bombT > 0)) return;
    G.bombT -= dt;
    G.eshots = [];
    G.shake = Math.max(G.shake, 0.15);
    for (const e of G.enemies) {
      if (e.dead || !onScreen(e, 20)) continue;
      if (e.kind === 'boss') { if (e.ready) { hit(e, e, 45 * dt); for (const p of e.parts) if (!p.dead) hit(e, p, 30 * dt); } }
      else hit(e, e, 60 * dt);
    }
    if (Math.random() < dt * 22) explode(rand(20, W - 20), rand(40, G.H - 120), rand(0.8, 1.6), false);
  }

  function playerDie() {
    P.alive = false; P.deadT = 0;
    explode(P.x, P.y, 2, true);
    G.eshots = [];
    // 掉落部分火力
    if (P.lv > 1) dropItem(P.x, P.y - 20, 'P');
    P.lv = Math.max(1, P.lv - 2); P.mis = Math.max(0, P.mis - 1);
    P.lives--;
    hud();
  }

  // ---------------- 主更新 ----------------
  function step(dt) {
    G.t += dt;
    const st = G.stage;
    if (G.state === 'intro') { G.stateT += dt; if (G.stateT > 1.2) G.state = 'play'; }
    // 捲動與出場
    const halted = G.state === 'boss' || G.state === 'bossdown' || G.state === 'clear';
    if (!halted) G.scroll += G.speed * dt;
    else if (G.boss && G.boss.ground && !G.boss.ready) G.scroll += G.speed * 0.5 * dt;
    while (G.spawnIdx < st.spawns.length && st.spawns[G.spawnIdx].d <= G.scroll + G.H) {
      const s = st.spawns[G.spawnIdx++];
      if (s.type === 'boss') { if (G.state !== 'boss') SPAWN.boss(s); }
      else SPAWN[s.type](s);
    }
    // 玩家
    if (P.alive) {
      let kx = 0, ky = 0;
      if (keys.has('arrowleft') || keys.has('a')) kx--; if (keys.has('arrowright') || keys.has('d')) kx++;
      if (keys.has('arrowup') || keys.has('w')) ky--; if (keys.has('arrowdown') || keys.has('s')) ky++;
      if (kx || ky) { P.tx = clamp((P.tx ?? P.x) + kx * 230 * dt, 12, W - 12); P.ty = clamp((P.ty ?? P.y) + ky * 230 * dt, 30, G.H - 22); }
      const ox = P.x;
      P.x += ((P.tx ?? P.x) - P.x) * Math.min(1, dt * 22);
      P.y += ((P.ty ?? P.y) - P.y) * Math.min(1, dt * 22);
      P.bank += (clamp((P.x - ox) / dt / 300, -1, 1) - P.bank) * Math.min(1, dt * 10);
      if (P.inv > 0) P.inv -= dt;
      if (G.state !== 'intro' && G.state !== 'clear') firePlayer(dt);
      laserTick(dt);
    } else {
      P.deadT += dt;
      if (P.deadT > 1.6) {
        if (P.lives < 0) { if (G.state !== 'over') { G.state = 'over'; onEvent('over', snapshot()); } }
        else { Object.assign(P, { alive: true, x: W / 2, y: G.H + 30, tx: W / 2, ty: G.H - 90, inv: 3, bombs: Math.max(P.bombs, 3) }); hud(); }
      }
    }
    bombTick(dt);
    // 玩家子彈
    for (const s of G.shots) {
      if (s.missile) {
        s.t += dt;
        let tg = s.tg;
        if (!tg || tg.dead || !onScreen(tg)) { tg = null; let best = 1e9; for (const e of G.enemies) { if (e.dead || !onScreen(e) || e.y > s.y) continue; const d = Math.hypot(e.x - s.x, e.y - s.y); if (d < best) { best = d; tg = e; } } s.tg = tg; }
        const want = tg ? ang(s.x, s.y, tg.x, tg.y) : -Math.PI / 2;
        const cur = Math.atan2(s.vy, s.vx);
        let da = want - cur; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
        const na = cur + clamp(da, -6 * dt, 6 * dt), sp = Math.min(420, Math.hypot(s.vx, s.vy) + 500 * dt);
        s.vx = Math.cos(na) * sp; s.vy = Math.sin(na) * sp; s.rot = na + Math.PI / 2;
        if (Math.random() < dt * 40) G.fx.push({ k: 'puff', x: s.x, y: s.y, t: 0, life: 0.45, r: 2 });
      }
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.y < -20 || s.x < -20 || s.x > W + 20 || s.y > G.H + 20) s.dead = true;
    }
    // 碰撞：玩家子彈 → 敵人
    for (const s of G.shots) {
      if (s.dead) continue;
      for (const e of G.enemies) {
        if (e.dead || e.x < -900) continue;
        if (e.parts && e.ready) {
          let done = false;
          for (const p of e.parts) if (!p.dead && Math.abs(s.x - p.x) < p.r + 2 && Math.abs(s.y - p.y) < p.r + 4) { hit(e, p, s.dmg); done = true; break; }
          if (done) { s.dead = true; spark(s); break; }
        }
        const hx = e.kind === 'boss' ? bossBox(e) : null;
        if (hx ? s.x > hx[0] && s.x < hx[2] && s.y > hx[1] && s.y < hx[3] : Math.abs(s.x - e.x) < e.r + 2 && Math.abs(s.y - e.y) < e.r + 4) {
          s.dead = true;
          hit(e, e, s.dmg); spark(s);
          if (e.ground) audio.play('hitm', { volume: 0.05, rate: 1.6 });
          break;
        }
      }
    }
    G.shots = G.shots.filter((s) => !s.dead);
    // 敵人
    for (const e of G.enemies) updateEnemy(e, dt);
    // 撞機
    if (P.alive && P.inv <= 0) for (const e of G.enemies) if (!e.dead && e.air && e.kind !== 'boss' && e.x > -900 && Math.hypot(e.x - P.x, e.y - P.y) < e.r * 0.7 + 4) { hit(e, e, 999); playerDie(); break; }
    G.enemies = G.enemies.filter((e) => !e.dead);
    // 敵彈
    for (const b of G.eshots) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y < -30 || b.y > G.H + 30 || b.x < -30 || b.x > W + 30) b.dead = true;
      else if (P.alive && P.inv <= 0 && Math.hypot(b.x - P.x, b.y - P.y) < b.r * 0.75 + 2.6) { b.dead = true; playerDie(); }
    }
    G.eshots = G.eshots.filter((b) => !b.dead);
    // 道具
    for (const it of G.items) {
      it.t += dt; it.x += it.vx * dt; it.y += it.vy * dt;
      if (it.type !== 'medal') { if (it.x < 14 || it.x > W - 14) it.vx *= -1; if (it.y < 30 && it.vy < 0) it.vy *= -1; if (it.t > 10) it.vy += 30 * dt; else if (it.y > G.H - 60 && it.vy > 0) it.vy = -Math.abs(it.vy); }
      else it.vy = Math.min(70, it.vy + 40 * dt);
      if (P.alive && Math.hypot(it.x - P.x, it.y - P.y) < 18) { it.dead = true; pickup(it); }
      if (it.y > G.H + 20) it.dead = true;
    }
    G.items = G.items.filter((i) => !i.dead);
    // 特效
    for (const f of G.fx) {
      f.t += dt;
      if (f.vx != null) { f.x += f.vx * dt; f.y += f.vy * dt; const dr = f.k === 'smoke' ? 0.9 : 3; f.vx *= 1 - dr * dt; f.vy *= 1 - dr * dt; }
      if (f.k === 'smoke' && f.ground) f.y += G.speed * (G.state === 'boss' ? 0 : 1) * dt;
      if (f.k === 'text') f.y -= 24 * dt;
    }
    G.fx = G.fx.filter((f) => f.t < f.life);
    for (const u of G.under) u.t += dt;
    G.under = G.under.filter((u) => u.t < u.life);
    // 冒煙的殘骸
    for (const u of G.under) if (u.k === 'wreck' && Math.random() < dt * 6 * (1 - u.t / u.life)) G.fx.push({ k: 'smoke', x: u.x + rand(-3, 3), y: gy(u.d), vx: rand(-6, 6), vy: rand(-14, -4), t: 0, life: 1.4, r: rand(3, 6), ground: true, dark: true });
    if (G.shake > 0) G.shake -= dt;
    if (G.flash > 0) G.flash -= dt * 1.5;
    if (G.banner) { G.banner.t += dt; if (G.banner.t > 2.6) G.banner = null; }
    // 頭目倒下 → 過關
    if (G.state === 'bossdown') {
      G.stateT += dt;
      if (G.stateT > 3.6) { G.state = 'clear'; G.stateT = 0; P.ty = -80; onEvent('clear', snapshot()); }
    }
    if (G.state === 'clear' && P.alive) { P.ty = -120; }
  }
  const bossBox = (B) => {
    const sp = SPR[B.sp];
    const w = B.boss === 'cruiser' ? 30 : B.boss === 'tank' ? 40 : B.boss === 'fortress' ? 20 : B.boss === 'bomber' ? 18 : 26;
    const h = B.boss === 'cruiser' ? 110 : B.boss === 'tank' ? 64 : B.boss === 'fortress' ? 20 : B.boss === 'bomber' ? 60 : 50;
    void sp;
    return [B.x - w, B.y - h, B.x + w, B.y + h];
  };
  function spark(s) { if (Math.random() < 0.5) G.fx.push({ k: 'hit', x: s.x + rand(-2, 2), y: s.y - 2, t: 0, life: 0.12 }); }

  // ---------------- 繪製 ----------------
  function draw() {
    const g = ctx, H = G.H;
    g.setTransform(G.ppu, 0, 0, G.ppu, 0, 0);
    if (G.shake > 0) g.translate(rand(-2, 2) * G.shake * 6, rand(-2, 2) * G.shake * 6);
    if (!G.terrain) { g.fillStyle = '#0c0a08'; g.fillRect(0, 0, W, H); return; }
    G.terrain.draw(g, G.scroll, H);
    // 水面反光（動態）
    // 地面殘骸與航跡
    for (const u of G.under) {
      const y = gy(u.d);
      if (u.k === 'wake') { g.globalAlpha = 0.35 * (1 - u.t / u.life); g.fillStyle = '#e8f4f4'; g.beginPath(); g.arc(u.x, y, u.r + u.t * 6, 0, TAU); g.fill(); g.globalAlpha = 1; }
      else if (u.k === 'wreck') { const sp = SPR[u.sp]; if (sp && sp.shadow) { blit(g, sp, u.x, y, u.rot); blit(g, sp.shadow, u.x, y, u.rot, 1, 0.72); } }
    }
    // 地面單位
    for (const e of G.enemies) if (!e.air) drawEnemy(g, e);
    // 空中陰影
    const sh = (sp, x, y, rot, sc = 1) => { const s = SPR[sp]; if (s && s.shadow) blit(g, s.shadow, x + 16, y + 26, rot, 0.82 * sc, 0.26); };
    for (const e of G.enemies) if (e.air && e.x > -900) { sh(e.sp, e.x, e.y, e.rot); }
    if (P.alive) sh('player', P.x, P.y, 0, 1 - Math.abs(P.bank) * 0.15);
    // 地面煙霧
    for (const f of G.fx) if (f.k === 'smoke' && f.ground) drawFx(g, f);
    // 道具
    for (const it of G.items) {
      const sp = it.type === 'medal' ? SPR.medal : it.type === 'W' ? (Math.floor(it.t / 2.2) % 2 ? SPR.itemL : SPR.itemV) : SPR['item' + it.type];
      const blink = it.t > 9 && Math.floor(it.t * 8) % 2;
      if (!blink) blit(g, sp, it.x, it.y, it.type === 'medal' ? Math.sin(it.t * 4) * 0.3 : 0, 1 + Math.sin(it.t * 6) * 0.04);
    }
    // 空中敵機
    for (const e of G.enemies) if (e.air) drawEnemy(g, e);
    // 玩家子彈
    g.globalCompositeOperation = 'lighter';
    for (const s of G.shots) if (!s.missile) blit(g, SPR[s.sp], s.x, s.y, s.rot);
    g.globalCompositeOperation = 'source-over';
    for (const s of G.shots) if (s.missile) { blit(g, SPR.missile, s.x, s.y, s.rot); g.globalCompositeOperation = 'lighter'; blit(g, SPR.spark, s.x - Math.sin(s.rot) * -6, s.y + Math.cos(s.rot) * 6, 0, 0.8); g.globalCompositeOperation = 'source-over'; }
    drawLaser(g);
    // 玩家
    if (P.alive && !(P.inv > 0 && Math.floor(P.inv * 14) % 2)) drawPlayer(g);
    // 特效
    for (const f of G.fx) if (!(f.k === 'smoke' && f.ground)) drawFx(g, f);
    // 敵彈
    g.globalCompositeOperation = 'lighter';
    for (const b of G.eshots) blit(g, SPR[b.sp], b.x, b.y, b.sp === 'ebNeedle' ? b.rot : 0);
    g.globalCompositeOperation = 'source-over';
    // 色調與暗角
    if (G.stage.grade) { g.fillStyle = G.stage.grade; g.fillRect(-10, -10, W + 20, H + 20); }
    const v = g.createRadialGradient(W / 2, H * 0.5, H * 0.3, W / 2, H * 0.5, H * 0.78);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.35)');
    g.fillStyle = v; g.fillRect(-10, -10, W + 20, H + 20);
    if (G.flash > 0) { g.fillStyle = `rgba(255,248,230,${Math.min(1, G.flash)})`; g.fillRect(-10, -10, W + 20, H + 20); }
    drawHud(g);
  }

  function drawEnemy(g, e) {
    if (e.x < -900) return;
    const sp = SPR[e.sp];
    if (e.kind === 'boss') return drawBoss(g, e);
    if (e.pad) blit(g, SPR.pad, e.x, e.y);
    if (e.air) {
      blit(g, sp, e.x, e.y, e.rot);
      if (e.kind === 'heli') rotor(g, e.x, e.y - 1, 15, G.t);
      // 尾焰
      if (e.kind === 'fighter' || e.kind === 'heavy') { g.globalCompositeOperation = 'lighter'; const a = e.rot, bx = e.x - Math.sin(a) * -(e.kind === 'heavy' ? 20 : 15), by = e.y + Math.cos(a) * (e.kind === 'heavy' ? 20 : 15); blit(g, SPR.spark, bx, by, 0, 1 + Math.random() * 0.4, 0.8); g.globalCompositeOperation = 'source-over'; }
    } else {
      blit(g, sp, e.x, e.y, e.rot);
      if (e.tsp) blit(g, SPR[e.tsp], e.x, e.y, e.trot);
      else if (e.kind === 'aa') blit(g, sp, e.x, e.y, e.trot);
    }
    if (e.flash > 0 && sp.flash) blit(g, sp.flash, e.x, e.y, e.rot, 1, 0.7);
  }
  function drawBoss(g, B) {
    const sp = SPR[B.sp];
    if (B.air) blit(g, sp.shadow, B.x + 24, B.y + 40, B.rot, 0.85, 0.25);
    blit(g, sp, B.x, B.y, B.rot);
    const fl = Math.floor(G.t * 30) % 2 ? 0.22 : 0.1; // 持續被打時閃得淡一點，不會整台發白
    if (B.flash > 0 && sp.flash) blit(g, sp.flash, B.x, B.y, B.rot, 1, fl);
    if (B.coreSp) { blit(g, SPR.core, B.x, B.y); if (B.flash > 0) blit(g, SPR.core.flash, B.x, B.y, 0, 1, fl * 2); }
    for (const p of B.parts) {
      const ps = SPR[p.sp];
      if (p.dead) { g.fillStyle = 'rgba(20,16,12,0.7)'; g.beginPath(); g.arc(p.x ?? B.x + p.ox, p.y ?? B.y + p.oy, p.r * 0.9, 0, TAU); g.fill(); if (Math.random() < 0.15) G.fx.push({ k: 'smoke', x: (p.x ?? B.x + p.ox) + rand(-3, 3), y: p.y ?? B.y + p.oy, vx: rand(-5, 5), vy: rand(-20, -8), t: 0, life: 1.2, r: rand(3, 6), dark: true }); continue; }
      const x = B.x + p.ox, y = B.y + p.oy;
      if (p.sp === 'aa') blit(g, SPR.pad, x, y, 0, 0.8);
      blit(g, ps, x, y, p.rot);
      if (p.flash > 0 && ps.flash) blit(g, ps.flash, x, y, p.rot, 1, fl * 2.5);
      if (p.eng) { g.globalCompositeOperation = 'lighter'; blit(g, SPR.spark, x, y + 18, 0, 1.6 + Math.random() * 0.5, 0.8); g.globalCompositeOperation = 'source-over'; }
    }
    if (B.air) { g.globalCompositeOperation = 'lighter'; for (const s of [-1, 1]) blit(g, SPR.spark, B.x + s * 8, B.y + (B.boss === 'bomber' ? 70 : 78), 0, 2 + Math.random(), 0.7); g.globalCompositeOperation = 'source-over'; }
  }
  function drawPlayer(g) {
    const sc = 1 - Math.abs(P.bank) * 0.12;
    g.save(); g.translate(P.x, P.y); g.scale(sc, 1);
    blit(g, SPR.player, 0, 0);
    g.restore();
    // 後燃器
    g.globalCompositeOperation = 'lighter';
    for (const s of [-1.9, 1.9]) {
      const fl = 1 + Math.random() * 0.35;
      const gr = g.createRadialGradient(P.x + s * sc, P.y + 25, 0, P.x + s * sc, P.y + 25, 7 * fl);
      gr.addColorStop(0, 'rgba(255,250,230,0.95)'); gr.addColorStop(0.3, 'rgba(255,170,80,0.7)'); gr.addColorStop(0.7, 'rgba(120,140,255,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(P.x + s * sc, P.y + 27, 3 * fl, 8 * fl, 0, 0, TAU); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
    // 判定點（受保護時不顯示）
    if (drag && P.inv <= 0) { g.beginPath(); g.arc(P.x, P.y, 2.6, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.9)'; g.fill(); g.strokeStyle = 'rgba(200,40,60,0.9)'; g.lineWidth = 0.8; g.stroke(); }
  }
  function drawLaser(g) {
    if (P.weapon !== 'L' || !P.alive || P.laserOn <= 0) return;
    const w = (5 + P.lv * 1.6) * P.laserOn, y0 = P.y - 20;
    g.globalCompositeOperation = 'lighter';
    const gr = g.createLinearGradient(P.x - w, 0, P.x + w, 0);
    gr.addColorStop(0, 'rgba(40,120,255,0)'); gr.addColorStop(0.3, 'rgba(70,150,255,0.55)'); gr.addColorStop(0.5, 'rgba(235,245,255,0.95)'); gr.addColorStop(0.7, 'rgba(70,150,255,0.55)'); gr.addColorStop(1, 'rgba(40,120,255,0)');
    g.fillStyle = gr;
    const wob = Math.sin(G.t * 60) * 0.6;
    g.fillRect(P.x - w + wob, -10, w * 2, y0 + 10);
    blit(g, SPR.ebBig, P.x, y0, 0, 0.9 + Math.random() * 0.2);
    for (const hpt of P.laserHits) blit(g, SPR.spark, hpt.x, hpt.y, 0, 1.4);
    g.globalCompositeOperation = 'source-over';
  }
  function drawFx(g, f) {
    if (!Number.isFinite(f.x + f.y)) { f.t = f.life; return; }
    const k = f.t / f.life;
    switch (f.k) {
      case 'fire': {
        g.globalCompositeOperation = 'lighter';
        const r = f.r * (0.4 + Math.pow(k, 0.5) * 0.9);
        const gr = g.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
        gr.addColorStop(0, `rgba(255,250,220,${1 - k})`); gr.addColorStop(0.3, `rgba(255,190,80,${0.9 * (1 - k)})`); gr.addColorStop(0.65, `rgba(220,80,20,${0.6 * (1 - k)})`); gr.addColorStop(1, 'rgba(80,20,0,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(f.x, f.y, r, 0, TAU); g.fill();
        g.globalCompositeOperation = 'source-over';
        break;
      }
      case 'ring': g.strokeStyle = `rgba(255,230,180,${0.6 * (1 - k)})`; g.lineWidth = 2 * (1 - k) + 0.3; g.beginPath(); g.arc(f.x, f.y, f.r * k, 0, TAU); g.stroke(); break;
      case 'spark': g.globalCompositeOperation = 'lighter'; blit(g, SPR.spark, f.x, f.y, 0, 1 - k * 0.6); g.globalCompositeOperation = 'source-over'; break;
      case 'smoke': {
        const r = f.r * (0.6 + k * 1.2), a = (f.dark ? 0.45 : 0.38) * (1 - k);
        const gr = g.createRadialGradient(f.x - r * 0.3, f.y - r * 0.3, 0, f.x, f.y, r);
        const c = f.dark ? '40,36,32' : '90,84,78';
        gr.addColorStop(0, `rgba(${c},${a})`); gr.addColorStop(1, `rgba(${c},0)`);
        g.fillStyle = gr; g.beginPath(); g.arc(f.x, f.y, r, 0, TAU); g.fill();
        break;
      }
      case 'puff': g.fillStyle = `rgba(230,230,230,${0.35 * (1 - k)})`; g.beginPath(); g.arc(f.x, f.y, f.r + k * 3, 0, TAU); g.fill(); break;
      case 'debris': g.save(); g.translate(f.x, f.y); g.rotate(f.rot + f.t * 12); g.fillStyle = `rgba(30,26,22,${1 - k})`; g.fillRect(-f.w / 2, -f.w / 4, f.w, f.w / 2); g.restore(); break;
      case 'hit': g.globalCompositeOperation = 'lighter'; blit(g, SPR.spark, f.x, f.y, 0, 1.3 - k); g.globalCompositeOperation = 'source-over'; break;
      case 'muzzle': g.globalCompositeOperation = 'lighter'; blit(g, SPR.ebMid, f.x, f.y, 0, 0.9 * (1 - k)); g.globalCompositeOperation = 'source-over'; break;
      case 'text':
        g.font = '700 11px "LG Latin", "LG Serif TC", serif'; g.textAlign = 'center';
        g.fillStyle = `rgba(0,0,0,${0.6 * (1 - k)})`; g.fillText(f.s, f.x + 0.8, f.y + 0.8);
        g.fillStyle = `rgba(255,236,180,${1 - k})`; g.fillText(f.s, f.x, f.y);
        break;
      case 'bomb': {
        g.globalCompositeOperation = 'lighter';
        const r = 30 + k * 420;
        const gr = g.createRadialGradient(f.x, f.y, r * 0.5, f.x, f.y, r);
        gr.addColorStop(0, 'rgba(255,200,120,0)'); gr.addColorStop(0.8, `rgba(255,170,80,${0.45 * (1 - k)})`); gr.addColorStop(1, 'rgba(255,120,40,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(f.x, f.y, r, 0, TAU); g.fill();
        g.globalCompositeOperation = 'source-over';
        break;
      }
      default: break;
    }
  }

  function drawHud(g) {
    const H = G.H;
    g.font = '700 15px "LG Latin", Georgia, serif'; g.textAlign = 'left'; g.textBaseline = 'top';
    const sc = String(G.score).padStart(8, '0');
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillText(sc, 11, 9);
    g.fillStyle = '#f3e7c9'; g.fillText(sc, 10, 8);
    // 剩餘機數
    for (let i = 0; i < Math.max(0, P.lives); i++) blit(g, SPR.player, 16 + i * 15, 36, 0, 0.3);
    // 火力等級
    g.font = '600 10px "LG Serif TC", serif'; g.fillStyle = 'rgba(243,231,201,0.85)';
    g.fillText((P.weapon === 'V' ? '機砲 ' : '雷射 ') + P.lv + (P.mis ? ' · 飛彈 ' + P.mis : ''), 10, 46);
    // 頭目血條
    if (G.boss && !G.boss.dead && G.state === 'boss') {
      const B = G.boss, k = Math.max(0, B.hp / B.maxhp);
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(70, H - 14, W - 140, 5);
      g.fillStyle = k > 0.5 ? '#e3c27a' : '#e0745a'; g.fillRect(70, H - 14, (W - 140) * k, 5);
      g.strokeStyle = 'rgba(255,240,210,0.5)'; g.lineWidth = 0.5; g.strokeRect(70, H - 14, W - 140, 5);
    }
    // 標題
    if (G.banner) {
      const b = G.banner, a = Math.min(1, b.t * 3, (2.6 - b.t) * 2.5);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = `rgba(0,0,0,${0.4 * a})`; g.fillRect(0, H * 0.36, W, 64);
      g.strokeStyle = `rgba(201,165,95,${0.8 * a})`; g.lineWidth = 0.6;
      g.beginPath(); g.moveTo(40, H * 0.36 + 4); g.lineTo(W - 40, H * 0.36 + 4); g.moveTo(40, H * 0.36 + 60); g.lineTo(W - 40, H * 0.36 + 60); g.stroke();
      g.font = '700 26px "LG Serif TC", serif';
      g.fillStyle = b.warn ? `rgba(240,120,90,${a})` : `rgba(246,234,205,${a})`; g.fillText(b.title, W / 2, H * 0.36 + 27);
      g.font = '500 11px "LG Serif TC", serif'; g.fillStyle = `rgba(230,214,170,${a})`; g.fillText(b.sub, W / 2, H * 0.36 + 48);
    }
  }

  // ---------------- 主迴圈 ----------------
  let raf = 0, last = 0, acc = 0, running = true;
  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (!last) last = now;
    let dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (G.paused) { draw(); return; }
    acc += dt;
    let n = 0;
    while (acc >= DT && n < 12) { step(DT); acc -= DT; n++; }
    draw();
  }

  return {
    G,
    start(stageIdx = 0, carry = null) { if (carry) { G.score = carry.score ?? G.score; } startStage(stageIdx, carry && { lives: carry.lives, bombs: carry.bombs, weapon: carry.weapon, lv: carry.lv, mis: carry.mis }); last = 0; acc = 0; if (!raf) raf = requestAnimationFrame(frame); },
    next() { if (G.stageIdx + 1 < STAGES.length) startStage(G.stageIdx + 1); },
    continueGame() { P.lives = 2; P.bombs = 3; P.alive = true; Object.assign(P, { x: W / 2, y: G.H + 30, tx: W / 2, ty: G.H - 90, inv: 3 }); G.state = G.boss ? 'boss' : 'play'; hud(); },
    pause(v) { G.paused = v; last = 0; },
    // 本機測試用：直接推進 sec 秒
    debugStep(sec) { for (let i = 0; i < sec / DT; i++) step(DT); draw(); },
    bomb,
    snapshot,
    destroy() { running = false; cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); },
  };
}
