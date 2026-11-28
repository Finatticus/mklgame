// 月下白狼：遊戲邏輯（玩家、敵群、武器、頭目、拾取物、升級）
import * as THREE from '../../../vendor/three/three.module.js';
import { clone as cloneSkinned } from '../../../vendor/three/SkeletonUtils.js';
import * as audio from '../../audio.js';
import { loadGLB, bakeVAT, Horde, findSkinned, whitenTexture, firstMaterial } from './assets.js';
import { createWorld } from './world.js';
import { WEAPONS, EVOS, PASSIVES, ENEMIES, BOSSES, WAVES, SWARMS, MAPS, RUN_SECONDS, MAX_WEAPONS, MAX_PASSIVES, WEAPON_MAX, PASSIVE_MAX, xpNeed } from './data.js';
import { BREEDS } from './pack.js';

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const angTo = (dx, dz) => Math.atan2(dx, dz); // 模型正面朝 +Z
function lerpAng(a, b, t) { let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a + d * t; }

// 各模型烘焙哪些動作
const CLIPS = {
  wolf: [{ key: 'run', name: 'run_loop', fps: 30 }, { key: 'walk', name: 'walk_loop', fps: 24 }, { key: 'bite', name: 'bite', fps: 30, loop: false }, { key: 'idle', name: 'idle_loop', fps: 10 }],
  spider: [{ key: 'run', name: 'run_loop', fps: 30 }, { key: 'walk', name: 'walk_loop', fps: 24 }, { key: 'bite', name: 'bite', fps: 30, loop: false }],
  horse: [{ key: 'walk', name: 'walk_loop', fps: 24 }, { key: 'run', name: 'canter_loop', fps: 30 }, { key: 'bite', name: 'rear', fps: 20, loop: false }],
  drake: [{ key: 'fly', name: 'fly_loop', fps: 30 }, { key: 'bite', name: 'bite', fps: 24, loop: false }],
};
const TRIS = { wolf: 2600, spider: 2600, horse: 2600, drake: 3200 };
// 動作播放速度：配合移動速度，避免滑步
const ANIM_RATE = { wolf: { run: 0.9, walk: 1, bite: 1, idle: 1 }, spider: { run: 0.8, walk: 1.1, bite: 1 }, horse: { walk: 1.1, run: 1, bite: 1.6 }, drake: { fly: 0.85, bite: 1 } };

export async function createGame(canvas, { mapId, meta, mobile, saved, onEvent, onProgress, pack = null }) {
  const map = MAPS[mapId];
  const hpMul = pack ? 1 : map.hp; // 狼群模式的難度由領地等級決定
  const W = await createWorld(canvas, mapId, { mobile });
  const { scene, particles: P } = W;
  onProgress && onProgress(0.35);

  // ---------------- 模型 ----------------
  const models = {};
  const names = ['wolf', 'spider', 'horse', 'drake'];
  const gltfs = await Promise.all(names.map((n) => loadGLB(`models/${n}.glb`)));
  names.forEach((n, i) => (models[n] = gltfs[i]));
  onProgress && onProgress(0.6);
  const vats = {};
  for (const n of names) { vats[n] = await bakeVAT(models[n], CLIPS[n], TRIS[n]); onProgress && onProgress(0.6 + 0.08 * (names.indexOf(n) + 1)); await new Promise((r) => setTimeout(r, 0)); }
  const caps = mobile ? { wolf: 90, spider: 110, horse: 30, drake: 30 } : { wolf: 130, spider: 160, horse: 40, drake: 40 };
  const hordes = {};
  for (const n of names) {
    hordes[n] = new Horde(vats[n], firstMaterial(models[n].scene), caps[n], { shadow: true });
    scene.add(hordes[n].mesh);
  }
  const ghosts = new Horde(vats.wolf, null, 10, { ghost: true });
  scene.add(ghosts.mesh);
  // 狼群模式：同行的狼與腳下的月光圈
  const allyHorde = new Horde(vats.wolf, firstMaterial(models.wolf.scene), 6, { shadow: true });
  scene.add(allyHorde.mesh);
  const ringCv = document.createElement('canvas'); ringCv.width = ringCv.height = 128;
  { const g = ringCv.getContext('2d'), gr = g.createRadialGradient(64, 64, 38, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.72, 'rgba(255,255,255,0.35)'); gr.addColorStop(0.88, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
  const allyRings = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.5, 1.5).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(ringCv), color: 0x8fa8e8, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }), 6);
  allyRings.frustumCulled = false; allyRings.count = 0; allyRings.renderOrder = 3;
  scene.add(allyRings);

  // ---------------- 玩家：白狼 ----------------
  const pg = cloneSkinned(models.wolf.scene);
  const psm = findSkinned(pg);
  const srcMat = psm.material;
  const pmat = srcMat.clone();
  pmat.map = whitenTexture(srcMat.map);
  pmat.roughness = 1; pmat.metalness = 1;
  pmat.onBeforeCompile = (sh) => {
    sh.uniforms.rim = { value: new THREE.Color(0.38, 0.5, 0.85) };
    sh.uniforms.hurt = { value: 0 };
    pmat.userData.sh = sh;
    sh.fragmentShader = 'uniform vec3 rim; uniform float hurt;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float fr = pow(1.0 - clamp(abs(dot(normalize(vViewPosition), normal)), 0.0, 1.0), 2.6);
      totalEmissiveRadiance += rim * fr * 0.9 + vec3(1.0, 0.25, 0.2) * hurt * 0.6;`);
  };
  psm.material = pmat;
  pg.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
  scene.add(pg);
  const pmix = new THREE.AnimationMixer(pg);
  const act = {};
  for (const [k, n] of [['idle', 'idle_loop'], ['walk', 'walk_loop'], ['run', 'run_loop'], ['bite', 'bite']]) {
    act[k] = pmix.clipAction(models.wolf.animations.find((a) => a.name === n));
  }
  act.bite.setLoop(THREE.LoopOnce); act.bite.clampWhenFinished = false;
  act.idle.play(); act.run.play(); act.walk.play();
  act.run.setEffectiveWeight(0); act.walk.setEffectiveWeight(0);

  // 頭目用完整模型
  function makeBossModel(model, scale, tint) {
    const g = cloneSkinned(models[model].scene);
    const sm = findSkinned(g);
    sm.material = sm.material.clone();
    sm.material.color = new THREE.Color(...tint);
    sm.material.emissive = new THREE.Color(0, 0, 0);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
    g.scale.setScalar(scale);
    const mixer = new THREE.AnimationMixer(g);
    const acts = {};
    for (const a of models[model].animations) acts[a.name.replace('_loop', '')] = mixer.clipAction(a);
    scene.add(g);
    return { g, sm, mixer, acts, cur: null };
  }
  function bossAnim(b, name, fade = 0.2, once = false) {
    const m = b.model;
    if (m.cur === name) return;
    const a = m.acts[name];
    if (!a) return;
    a.reset();
    if (once) { a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; } else a.setLoop(THREE.LoopRepeat);
    a.play();
    if (m.cur && m.acts[m.cur]) a.crossFadeFrom(m.acts[m.cur], fade, false);
    m.cur = name;
  }

  // ---------------- 拾取物與投射物的外觀 ----------------
  const gemGeo = new THREE.OctahedronGeometry(0.17, 0).scale(0.8, 1.25, 0.8);
  // 三種魂晶各一組實例：淡藍（1）、青綠（5）、金色（25）
  const GEM_MAX = 600;
  const gemKinds = { 1: [0x6f9cff, 0x3f6fe0], 5: [0x7ff0d0, 0x2fb890], 25: [0xffd27a, 0xe09a2a] };
  const gemMeshes = {};
  for (const v in gemKinds) {
    const m = new THREE.InstancedMesh(gemGeo, new THREE.MeshStandardMaterial({ color: gemKinds[v][0], emissive: gemKinds[v][1], emissiveIntensity: 1.6, roughness: 0.2, metalness: 0.1 }), GEM_MAX);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.count = 0;
    scene.add(m); gemMeshes[v] = m;
  }
  const shardMat = new THREE.MeshStandardMaterial({ color: 0xe6efff, emissive: 0x9cc0ff, emissiveIntensity: 2.2, roughness: 0.2, metalness: 0.3 });
  const shardGeo = new THREE.OctahedronGeometry(0.22, 0).scale(0.45, 0.35, 1.6);
  const shards = [];
  for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(shardGeo, shardMat); m.visible = false; m.castShadow = true; scene.add(m); shards.push(m); }
  const orbGeo = new THREE.SphereGeometry(0.22, 16, 12);
  const orbMats = { heal: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xbfe3ff, emissiveIntensity: 2.4 }), magnet: new THREE.MeshStandardMaterial({ color: 0xffe2b0, emissive: 0xffb24a, emissiveIntensity: 2.4 }) };
  const chestG = await loadGLB('props/treasure_chest.glb');

  // ---------------- 狀態 ----------------
  const metaLv = (k) => (meta && meta[k]) || 0;
  const S = {
    mapId, t: 0, kills: 0, lv: 1, xp: 0, hp: 100, maxhp: 100,
    x: 0, z: 0, face: 0, vx: 0, vz: 0, moving: 0,
    weapons: [{ id: 'claw', lv: 1, cd: 0.4, evo: false }], passives: {},
    ult: 0, bossesDone: [], boss: null, revives: metaLv('revive'), state: 'play', paused: false,
    pendingLv: 0, hurtT: 0, slowT: 0, won: false, dead: false, elitesKilled: 0, wispHeal: 0,
  };
  const ST = {};
  function recalc() {
    const p = (k) => S.passives[k] || 0;
    ST.might = 1 + 0.1 * p('might') + 0.05 * metaLv('might');
    ST.armor = p('armor') + metaLv('armor');
    ST.speed = 5.4 * (1 + 0.08 * p('speed') + 0.04 * metaLv('speed'));
    ST.cool = Math.max(0.4, 1 - 0.06 * p('cool') - 0.03 * metaLv('cool'));
    ST.area = 1 + 0.09 * p('area') + 0.04 * metaLv('area');
    ST.magnet = 2.6 * (1 + 0.3 * p('magnet') + 0.15 * metaLv('magnet'));
    ST.regen = 0.3 * p('regen');
    ST.growth = 1 + 0.05 * metaLv('growth');
    const mh = Math.round(120 * (1 + 0.15 * p('vigor') + 0.08 * metaLv('vigor')));
    if (S.maxhp && mh > S.maxhp) S.hp += mh - S.maxhp;
    S.maxhp = mh; S.hp = Math.min(S.hp, S.maxhp);
  }
  if (saved) {
    Object.assign(S, { t: saved.t, kills: saved.kills, lv: saved.lv, xp: saved.xp, weapons: saved.weapons.map((w) => ({ ...w, cd: 1 })), passives: { ...saved.passives }, ult: saved.ult || 0, bossesDone: saved.bossesDone || [], revives: saved.revives ?? S.revives, elitesKilled: saved.elitesKilled || 0 });
    recalc(); S.hp = Math.min(S.maxhp, saved.hp || S.maxhp);
  } else { recalc(); S.hp = S.maxhp; }
  // 狼群模式：同行的狼
  S.allies = [];
  S.cmd = 'attack';
  S.goal = pack ? { kind: pack.spec.kind, need: pack.spec.kills, time: pack.spec.time, boss: false, name: pack.spec.name } : null;
  S.elitesWolf = 0;
  if (pack) {
    const hungry = pack.hungry ? 0.8 : 1;
    pack.allies.forEach((w, k) => {
      const a = Math.PI + (k - (pack.allies.length - 1) / 2) * 0.75;
      S.allies.push({ id: w.id, name: w.name, breed: w.breed, lv: w.lv, x: Math.sin(a) * 2.6, z: Math.cos(a) * 2.6, face: 0, vx: 0, vz: 0, hp: w.hp * hungry, maxhp: w.hp * hungry, atk: w.atk * hungry, cd: rand(0, 0.8), skill: rand(1.5, 4), t: Math.random() * 3, anim: 'idle', animT: 0, biteT: 0, down: false, dis: 0, kills: 0, flash: 0, guardT: 0, buffT: 0, bossHitT: 0, leap: null, tgt: null });
    });
  }

  const enemies = [];
  const gems = [];
  const items = []; // heal / magnet / chest
  const shots = []; // 敵方投射物
  const wisps = [];
  const ghostList = [];
  const webs = []; // 減速區
  // 遊戲內排程（跟著暫停一起停）
  const timers = [];
  const later = (sec, fn) => timers.push({ t: S.t + sec, fn });
  let spawnAcc = 0, eliteT = 90, swarmIdx = SWARMS.findIndex((s) => s.t > S.t);
  if (swarmIdx < 0) swarmIdx = SWARMS.length;
  const input = { x: 0, z: 0 };
  // 本機測試用的自動走位：遠離敵群、閃火球、順路撿魂晶
  const auto = { on: false };
  function autopilot() {
    let tx = 0, tz = 0;
    for (const e of enemies) { if (e.dying) continue; const dx = S.x - e.x, dz = S.z - e.z, d2 = dx * dx + dz * dz; if (d2 < 49) { const w = 1 / Math.max(0.5, d2); tx += dx * w; tz += dz * w; } }
    const b = S.boss; if (b && !b.dying) { const dx = S.x - b.x, dz = S.z - b.z, d2 = dx * dx + dz * dz; if (d2 < 100) { tx += dx / d2 * 6; tz += dz / d2 * 6; } }
    for (const s of shots) { const dx = S.x - s.x, dz = S.z - s.z, d2 = dx * dx + dz * dz; if (d2 < 16) { tx += -s.vz / 3 / Math.max(0.5, d2); tz += s.vx / 3 / Math.max(0.5, d2); } }
    let g = null, gd = 1e9; for (const o of gems) { const d = (o.x - S.x) ** 2 + (o.z - S.z) ** 2; if (d < gd) { gd = d; g = o; } }
    for (const it of items) { const d = (it.x - S.x) ** 2 + (it.z - S.z) ** 2; if (d < gd * 2) { gd = d; g = it; } }
    const tl = Math.hypot(tx, tz);
    if (g && (tl < 0.25 || gd < 9)) { const d = Math.sqrt(gd) || 1; tx += (g.x - S.x) / d * 0.6; tz += (g.z - S.z) / d * 0.6; }
    if (tl > 0) { tx += -tz * 0.35; tz += tx * 0.35; }
    const l = Math.hypot(tx, tz);
    input.x = l > 0.05 ? tx / l : 0; input.z = l > 0.05 ? tz / l : 0;
  }
  let hitSfxT = 0;

  // ---------------- 空間格網（找附近敵人） ----------------
  const CELL = 2.5, grid = new Map();
  const gkey = (cx, cz) => cx * 73856093 ^ cz * 19349663;
  function buildGrid() {
    grid.clear();
    for (const e of enemies) {
      if (e.dying) continue;
      const k = gkey(Math.floor(e.x / CELL), Math.floor(e.z / CELL));
      let a = grid.get(k); if (!a) grid.set(k, (a = [])); a.push(e);
    }
  }
  function near(x, z, r, fn) {
    const c0 = Math.floor((x - r) / CELL), c1 = Math.floor((x + r) / CELL), d0 = Math.floor((z - r) / CELL), d1 = Math.floor((z + r) / CELL);
    for (let cx = c0; cx <= c1; cx++) for (let cz = d0; cz <= d1; cz++) {
      const a = grid.get(gkey(cx, cz)); if (!a) continue;
      for (let i = 0; i < a.length; i++) { const e = a[i]; const dx = e.x - x, dz = e.z - z, rr = r + e.r; if (dx * dx + dz * dz <= rr * rr) fn(e, dx, dz); }
    }
  }
  function nearest(x, z, maxR, exclude) {
    let best = null, bd = maxR * maxR;
    for (const e of enemies) {
      if (e.dying || e.hp <= 0 || (exclude && exclude.has(e))) continue;
      const d = (e.x - x) ** 2 + (e.z - z) ** 2; if (d < bd) { bd = d; best = e; }
    }
    if (S.boss && !S.boss.dying && (!exclude || !exclude.has(S.boss))) { const b = S.boss, d = (b.x - x) ** 2 + (b.z - z) ** 2; if (d < bd) best = b; }
    return best;
  }

  // ---------------- 視野範圍 ----------------
  function viewRadius() {
    const cam = W.camera, tan = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const hh = W.cam.dist * tan / Math.sin(W.cam.pitch), hw = W.cam.dist * tan * cam.aspect;
    return Math.hypot(hw, hh);
  }

  // ---------------- 敵人 ----------------
  const scaleT = () => pack ? (1 + (pack.spec.lv - 1) * 0.32) * (1 + (S.t / 60) * 0.08) : (1 + (S.t / 60) * 0.1) * map.hp;
  function spawn(kind, x, z, { elite = false } = {}) {
    const D = ENEMIES[kind];
    if (enemies.length >= 240) return null;
    const e = {
      kind, D, x, z, vx: 0, vz: 0, r: D.r * (elite ? 1.5 : 1), face: 0,
      hp: D.hp * scaleT() * (elite ? 14 : 1), dmg: D.dmg * (pack ? 1 + (pack.spec.lv - 1) * 0.15 : 1 + S.t / 60 * 0.05) * (elite ? 1.5 : 1),
      speed: D.speed * rand(0.92, 1.08) * (elite ? 1.05 : 1), scale: D.scale * (elite ? 1.55 : 1) * rand(0.94, 1.06),
      t: Math.random() * 5, anim: D.anim, atk: 0, flash: 0, slowT: 0, slowF: 0, freezeT: 0, fearT: 0,
      dying: 0, born: 0.001, elite, tint: elite ? [Math.min(1.6, D.tint[0] * 1.5 + 0.3), D.tint[1] * 1.15 + 0.15, D.tint[2] * 0.8] : D.tint,
      state: 0, st: rand(0, 2), shootT: rand(1.5, 3.5), y: D.flyer ? 2.6 : 0, hitBy: null,
    };
    e.maxhp = e.hp;
    enemies.push(e);
    return e;
  }
  function spawnRing(kind) {
    const R = viewRadius() + rand(1.5, 4);
    // 往前進方向多生一些
    let a = Math.random() * TAU;
    if (S.moving > 0.2 && Math.random() < 0.55) a = Math.atan2(S.vx, S.vz) + rand(-0.9, 0.9);
    const x = S.x + Math.sin(a) * R, z = S.z + Math.cos(a) * R;
    return spawn(kind, x, z);
  }
  function pickKind(mix) {
    let tot = 0; for (const k in mix) tot += mix[k];
    let r = Math.random() * tot;
    for (const k in mix) { r -= mix[k]; if (r <= 0) return k; }
    return Object.keys(mix)[0];
  }
  const waveAt = (t) => { let w = WAVES[0]; for (const x of WAVES) if (x.t <= t) w = x; return w; };

  function damageEnemy(e, dmg, kx = 0, kz = 0, knock = 0, src = '', by = null) {
    if (e.dying || e.hp <= 0) return;
    const d = by ? dmg : dmg * ST.might; // 同伴的傷害不吃白狼的加成
    e.lastAlly = by;
    e.hp -= d; e.flash = 1;
    if (knock && !e.isBoss) { const l = Math.hypot(kx, kz) || 1; const k = knock / (e.elite ? 3 : 1); e.vx += (kx / l) * k; e.vz += (kz / l) * k; }
    const ey = (e.y || 0) + 0.6 * (e.isBoss ? e.scale * 0.8 : 1);
    for (let i = 0; i < 3; i++) P.emit(e.x, ey, e.z, rand(-2.5, 2.5), rand(0.5, 3), rand(-2.5, 2.5), rand(0.18, 0.32), 0.16, 0.04, 1, 0.85, 0.6, 3, 4);
    if (hitSfxT <= 0) { audio.play('hitm', { volume: 0.16, rate: rand(0.9, 1.15) }); hitSfxT = 0.07; }
    if (e.hp <= 0) kill(e, src);
  }
  function kill(e, src) {
    if (e.isBoss) return bossDie(e);
    e.dying = 0.001;
    S.kills++;
    if (e.lastAlly) e.lastAlly.kills++;
    if (e.elite && e.kind === 'wolf') S.elitesWolf++;
    S.ult = Math.min(1, S.ult + (e.elite ? 0.08 : 0.011));
    if (src === 'wisp' && S.wispHeal) S.hp = Math.min(S.maxhp, S.hp + S.wispHeal);
    const y = (e.y || 0) + 0.5;
    for (let i = 0; i < (e.elite ? 30 : 9); i++) P.emit(e.x + rand(-0.4, 0.4), y, e.z + rand(-0.4, 0.4), rand(-0.6, 0.6), rand(1.2, 2.8), rand(-0.6, 0.6), rand(0.6, 1.1), rand(0.14, 0.24), 0.02, 0.55, 0.7, 1.0, 1.2, -0.6);
    // 掉落
    const xp = e.D.xp;
    dropGem(e.x, e.z, xp >= 5 ? 5 : 1, xp >= 5 ? 1 : xp);
    if (e.elite) { S.elitesKilled++; items.push(makeItem('chest', e.x, e.z, { big: false })); }
    else if (Math.random() < 0.012) items.push(makeItem('heal', e.x, e.z));
    else if (Math.random() < 0.0035) items.push(makeItem('magnet', e.x, e.z));
  }
  function dropGem(x, z, val, n = 1) {
    for (let i = 0; i < n; i++) gems.push({ x: x + rand(-0.4, 0.4), z: z + rand(-0.4, 0.4), val, pull: false, t: Math.random() * 6, vx: 0, vz: 0 });
    if (gems.length > GEM_MAX - 20) mergeGems();
  }
  function mergeGems() { // 太多時把遠處的合成一顆金色魂晶
    gems.sort((a, b) => ((b.x - S.x) ** 2 + (b.z - S.z) ** 2) - ((a.x - S.x) ** 2 + (a.z - S.z) ** 2));
    let sum = 0; const take = gems.splice(0, 200);
    for (const g of take) sum += g.val;
    const far = take[0];
    gems.push({ x: far.x, z: far.z, val: 25, extra: sum - 25, pull: false, t: 0, vx: 0, vz: 0 });
  }

  // ---------------- 拾取物 ----------------
  function makeItem(kind, x, z, o = {}) {
    let mesh;
    if (kind === 'chest') {
      mesh = chestG.scene.clone(); mesh.scale.setScalar(o.big ? 1.3 : 1);
      mesh.traverse((c) => { if (c.isMesh) c.castShadow = true; });
    } else { mesh = new THREE.Mesh(orbGeo, orbMats[kind]); }
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    return { kind, x, z, mesh, t: 0, big: !!o.big };
  }

  // ---------------- 頭目 ----------------
  function spawnBoss(def) {
    const a = Math.random() * TAU, R = viewRadius() * 0.85;
    const m = makeBossModel(def.model, def.scale, def.tint);
    const b = { isBoss: true, def, model: m, x: S.x + Math.sin(a) * R, z: S.z + Math.cos(a) * R, r: def.r, scale: def.scale, hp: def.hp * hpMul, maxhp: def.hp * hpMul, dmg: def.dmg * hpMul, speed: def.speed, face: 0, flash: 0, slowT: 0, slowF: 0, freezeT: 0, fearT: 0, vx: 0, vz: 0, atk: 0, st: 0, phase: 'walk', pt: 0, y: 0, dying: 0, hitBy: null };
    if (def.id === 'dragon') { b.phase = 'fly'; b.y = 3.4; bossAnim(b, 'fly'); }
    else bossAnim(b, def.id === 'queen' ? 'walk' : 'run');
    S.boss = b;
    W.cam.shake = 0.8;
    onEvent('boss', { name: def.name });
    audio.play('bigboom', { volume: 0.35, rate: 0.7 });
  }
  // 狼群模式的領地頭目（依領地等級加強）
  const PACK_BOSS = {
    alpha: { id: 'alpha', name: '暗狼頭目', model: 'wolf', scale: 2.0, tint: [0.55, 0.5, 0.55], hp: 900, speed: 4.5, dmg: 14, r: 1.4 },
    queen: { id: 'queen', name: '蛛母', model: 'spider', scale: 2.4, tint: [0.75, 0.62, 0.62], hp: 1200, speed: 2.8, dmg: 16, r: 2.1 },
    stallion: { id: 'stallion', name: '夢魘之王', model: 'horse', scale: 1.6, tint: [0.32, 0.26, 0.32], hp: 1100, speed: 3.4, dmg: 18, r: 1.6 },
    dragon: { id: 'dragon', name: '灰翼飛龍', model: 'drake', scale: 0.45, tint: [1, 0.9, 0.85], hp: 1700, speed: 3.8, dmg: 18, r: 2.4 },
  };
  function packBoss() {
    const sp = pack.spec, d = { ...PACK_BOSS[sp.boss] }, k = 1 + (sp.lv - 1) * 0.6;
    d.hp = Math.round(d.hp * k); d.dmg *= 1 + (sp.lv - 1) * 0.15;
    if (sp.final) Object.assign(d, { name: '焚翼', scale: 0.58, hp: 9500, dmg: 24 });
    return d;
  }
  const packResult = (win) => ({ win, allies: S.allies.map((a) => ({ id: a.id, kills: a.kills, down: a.down })), elitesWolf: S.elitesWolf, kills: S.kills, t: S.t, lv: S.lv });
  function bossDie(b) {
    if (b.dying) return;
    b.dying = 0.001;
    S.kills++;
    S.bossesDone.push(b.def.id);
    W.cam.shake = 1.2;
    audio.play('bigboom', { volume: 0.6 });
    for (let i = 0; i < 80; i++) P.emit(b.x + rand(-1.5, 1.5), rand(0.5, 2.5), b.z + rand(-1.5, 1.5), rand(-3, 3), rand(1, 6), rand(-3, 3), rand(0.8, 1.6), rand(0.2, 0.4), 0.03, 0.6, 0.75, 1, 1.4, -0.5);
    for (let i = 0; i < 14; i++) dropGem(b.x + rand(-2, 2), b.z + rand(-2, 2), 25);
    items.push(makeItem('chest', b.x, b.z, { big: true }));
    onEvent('bossdown', { name: b.def.name, final: b.def.id === 'dragon' });
    if (pack) { S.won = true; later(2.4, () => onEvent('packend', packResult(true))); return; }
    if (b.def.id === 'dragon') { S.won = true; later(2.6, () => onEvent('victory', {})); }
  }
  function bossShot(b, ang, speed, kind = 'fire', dmg = b.dmg * 0.7) {
    shots.push({ x: b.x + Math.sin(ang) * 1.5, z: b.z + Math.cos(ang) * 1.5, y: Math.max(0.9, b.y * 0.8), vx: Math.sin(ang) * speed, vz: Math.cos(ang) * speed, dmg, life: kind === 'web' ? 1.4 : 3.5, kind, r: kind === 'web' ? 0.6 : 0.45 });
  }
  function updateBoss(b, dt) {
    const m = b.model;
    m.mixer.update(dt);
    if (b.dying) {
      b.dying += dt;
      m.g.position.y -= dt * 0.4 * (b.def.id === 'dragon' ? 3 : 1);
      if (b.dying > 2.4) { scene.remove(m.g); S.boss = null; }
      else m.sm.material.opacity = 1 - b.dying / 2.4, m.sm.material.transparent = true;
      return;
    }
    const dx = S.x - b.x, dz = S.z - b.z, dist = Math.hypot(dx, dz) || 1;
    const enrage = b.hp < b.maxhp * 0.5 ? 1.25 : 1;
    b.flash = Math.max(0, b.flash - dt * 6);
    m.sm.material.emissive.setRGB(b.flash * 0.5, b.flash * 0.42, b.flash * 0.38);
    b.st += dt; b.pt += dt;
    const sp = b.speed * enrage * (b.slowT > 0 ? 1 - b.slowF * 0.5 : 1);
    if (b.slowT > 0) b.slowT -= dt;
    let mvx = 0, mvz = 0;
    if (b.def.id === 'alpha') {
      if (b.phase === 'walk') {
        mvx = dx / dist * sp; mvz = dz / dist * sp; bossAnim(b, 'run');
        if (b.pt > 5.5 / enrage && dist < 12) { b.phase = 'wind'; b.pt = 0; b.lx = dx / dist; b.lz = dz / dist; W.flat('ring', S.x, S.z, { r: 1.2, life: 0.7, color: 0xff5a40, grow: 0.6, opacity: 0.7 }); bossAnim(b, 'idle', 0.15); }
        if (b.st > 11) { b.st = 0; for (let i = 0; i < 6 + Math.floor(S.t / 120); i++) { const a = (i / 6) * TAU; spawn('wolf', b.x + Math.sin(a) * 3, b.z + Math.cos(a) * 3); } }
      } else if (b.phase === 'wind') {
        b.face = lerpAng(b.face, angTo(b.lx, b.lz), dt * 10);
        if (b.pt > 0.6) { b.phase = 'lunge'; b.pt = 0; bossAnim(b, 'bite', 0.08, true); audio.play('hitm', { volume: 0.4, rate: 0.6 }); }
      } else if (b.phase === 'lunge') {
        mvx = b.lx * 16; mvz = b.lz * 16;
        if (b.pt > 0.55) { b.phase = 'walk'; b.pt = 0; }
      }
    } else if (b.def.id === 'queen') {
      mvx = dx / dist * sp; mvz = dz / dist * sp; bossAnim(b, dist > 3 ? 'walk' : 'bite');
      if (b.pt > 3.8 / enrage) { b.pt = 0; const a0 = angTo(dx, dz); for (let i = -1; i <= 1; i++) bossShot(b, a0 + i * 0.35, 9, 'web', b.dmg * 0.4); }
      if (b.st > 8.5) { b.st = 0; for (let i = 0; i < 10; i++) { const a = Math.random() * TAU; spawn('hatch', b.x + Math.sin(a) * 2.5, b.z + Math.cos(a) * 2.5); } }
    } else if (b.def.id === 'stallion') {
      // 夢魘之王：揚蹄蓄力後直線衝鋒，定時召來戰馬
      if (b.phase === 'walk') {
        mvx = dx / dist * sp; mvz = dz / dist * sp; bossAnim(b, 'walk');
        if (b.pt > 4.5 / enrage && dist < 14) { b.phase = 'rear'; b.pt = 0; b.lx = dx / dist; b.lz = dz / dist; bossAnim(b, 'rear', 0.15, true); W.flat('ring', b.x, b.z, { r: 1.5, life: 0.9, color: 0xff6040, grow: 1.6, opacity: 0.6 }); }
        if (b.st > 10) { b.st = 0; for (let i = 0; i < 2 + Math.floor(pack ? pack.spec.lv / 2 : 2); i++) spawn('horse', b.x + rand(-4, 4), b.z + rand(-4, 4)); }
      } else if (b.phase === 'rear') {
        b.face = lerpAng(b.face, angTo(b.lx, b.lz), dt * 8);
        if (b.pt > 0.9) { b.phase = 'charge'; b.pt = 0; bossAnim(b, 'canter', 0.1); audio.play('hitm', { volume: 0.4, rate: 0.5 }); }
      } else if (b.phase === 'charge') {
        mvx = b.lx * 15; mvz = b.lz * 15;
        if (Math.random() < 0.6) P.emit(b.x, 0.2, b.z, rand(-1, 1), rand(0.5, 1.5), rand(-1, 1), 0.6, 0.5, 0.9, 0.35, 0.3, 0.28, 1, 0);
        if (b.pt > 1.2) { b.phase = 'walk'; b.pt = 0; }
      }
    } else if (b.def.id === 'dragon') {
      if (b.phase === 'fly') {
        b.y += (3.4 - b.y) * dt * 2;
        // 繞著玩家盤旋（偏向畫面下方，避免飛出鏡頭）
        const want = 6.8, ta = Math.atan2(-dx, -dz) + dt * 0.5;
        const tx = S.x + Math.sin(ta) * want, tz = S.z + Math.cos(ta) * want;
        const ex = tx - b.x, ez = tz - b.z, el = Math.hypot(ex, ez) || 1;
        mvx = ex / el * Math.min(sp * 1.6, el * 2); mvz = ez / el * Math.min(sp * 1.6, el * 2);
        bossAnim(b, 'fly');
        b.shootT = (b.shootT || 0) - dt;
        if (b.shootT <= 0) { b.shootT = 2.1 / enrage; const a0 = angTo(dx, dz); for (let i = -2; i <= 2; i++) bossShot(b, a0 + i * 0.22, 8.5); audio.play('missile', { volume: 0.22, rate: 0.7 }); }
        if (b.st > 9) { b.st = 0; for (let i = 0; i < 18; i++) bossShot(b, (i / 18) * TAU, 6.5); }
        if (b.pt > 15) { b.phase = 'land'; b.pt = 0; }
      } else if (b.phase === 'land') {
        b.y = Math.max(0, b.y - dt * 4); mvx = dx / dist * sp * 0.4; mvz = dz / dist * sp * 0.4;
        if (b.y <= 0) { b.phase = 'roar'; b.pt = 0; bossAnim(b, 'roar', 0.3, true); W.cam.shake = 0.7; for (let i = 0; i < 3; i++) spawn('drake', b.x + rand(-4, 4), b.z + rand(-4, 4)); }
      } else if (b.phase === 'roar') {
        if (b.pt > 2) { b.phase = 'ground'; b.pt = 0; }
      } else if (b.phase === 'ground') {
        mvx = dx / dist * sp; mvz = dz / dist * sp;
        bossAnim(b, dist < 4 ? 'bite' : 'walk');
        if (b.pt > 11) { b.phase = 'takeoff'; b.pt = 0; bossAnim(b, 'takeoff', 0.2, true); }
      } else if (b.phase === 'takeoff') {
        if (b.pt > 1.2) b.y += dt * 4;
        if (b.pt > 2.3) { b.phase = 'fly'; b.pt = 0; b.st = 0; }
      }
    }
    if (b.fearT > 0) { b.fearT -= dt; mvx *= 0.3; mvz *= 0.3; }
    b.x += (mvx + b.vx) * dt; b.z += (mvz + b.vz) * dt;
    b.vx *= 0.9; b.vz *= 0.9;
    if (b.y < 0.5) [b.x, b.z] = W.collide(b.x, b.z, b.r * 0.6);
    if (Math.hypot(mvx, mvz) > 0.3 && b.phase !== 'wind') b.face = lerpAng(b.face, angTo(mvx, mvz), dt * 6);
    else if (b.phase !== 'wind') b.face = lerpAng(b.face, angTo(dx, dz), dt * 3);
    m.g.position.set(b.x, b.y, b.z);
    m.g.rotation.y = b.face;
    // 接觸傷害（地面上）
    b.atk -= dt;
    if (b.y < 1.5 && dist < b.r + 0.6 && b.atk <= 0) { hurtPlayer(b.dmg); b.atk = 1.0; }
    if (b.y < 1.5) for (const a of S.allies) if (!a.down && a.bossHitT <= 0 && Math.hypot(a.x - b.x, a.z - b.z) < b.r + 0.6) { hurtAlly(a, b.dmg); a.bossHitT = 1.1; }
  }

  // ---------------- 玩家受傷 ----------------
  function hurtPlayer(d) {
    if (S.dead || S.won || S.iframe > 0) return;
    const dmg = Math.max(1, d - ST.armor);
    S.hp -= dmg; S.hurtT = 0.35; S.iframe = 0.3; // 受傷後短暫無敵，避免被圍時瞬間蒸發
    if (S.hp <= 0) {
      if (S.revives > 0) {
        S.revives--; S.hp = S.maxhp * 0.5; S.ult = 1; howl(true);
        onEvent('revive', {});
      } else { S.hp = 0; S.dead = true; onEvent(pack ? 'packend' : 'dead', pack ? packResult(false) : {}); }
    }
  }

  // ---------------- 同伴 ----------------
  function hurtAlly(a, d) {
    if (a.down || S.won || S.dead || a.ifr > 0) return;
    a.hp -= Math.max(1, d * 0.55 * (a.guardT > 0 ? 0.55 : 1)); // 狼皮粗厚，受傷較輕
    a.flash = 1; a.ifr = 0.35; a.calm = 0;
    if (a.hp <= 0) {
      a.hp = 0; a.down = true; a.dis = 0.001; a.tgt = null;
      for (let i = 0; i < 24; i++) P.emit(a.x + rand(-0.5, 0.5), rand(0.2, 1), a.z + rand(-0.5, 0.5), rand(-0.5, 0.5), rand(1, 2.5), rand(-0.5, 0.5), rand(0.7, 1.2), 0.2, 0.03, 0.7, 0.8, 1, 1, -0.5);
      onEvent('allydown', { name: a.name });
    }
  }
  function allyHit(a, e, dmg, knock) {
    let d = dmg * (a.buffT > 0 ? 1.25 : 1);
    if (a.breed === 'shadow' && Math.random() < 0.35) { d *= 2.2; for (let i = 0; i < 6; i++) P.emit(e.x, 0.7, e.z, rand(-2, 2), rand(0.5, 2), rand(-2, 2), 0.3, 0.2, 0.04, 0.5, 0.35, 0.8, 3, 2); }
    damageEnemy(e, d, e.x - a.x, e.z - a.z, knock, 'ally', a);
    if (a.breed === 'red' && !e.isBoss) { e.bleedT = 4; e.bleedD = a.atk * 0.45; e.bleedBy = a; }
    if (a.breed === 'frost') { e.slowT = 2; e.slowF = Math.max(e.slowF || 0, 0.45); }
  }
  function allySkill(a, tgt, d) {
    switch (a.breed) {
      case 'grey': // 撲擊：飛撲到遠處的敵人
        if (d > 2.2 && d < 7.5) { a.skill = 6; a.leap = { t: 0, dur: Math.max(0.2, d / 16), x0: a.x, z0: a.z, x1: tgt.x - ((tgt.x - a.x) / d) * 0.9, z1: tgt.z - ((tgt.z - a.z) / d) * 0.9, e: tgt }; }
        break;
      case 'frost': // 冰牙：冰霜震波
        if (d < 3) {
          a.skill = 8;
          W.flat('ring', a.x, a.z, { r: 0.8, life: 0.5, grow: 4, color: 0xbfe0ff, opacity: 0.8 });
          for (let i = 0; i < 26; i++) { const t = Math.random() * TAU; P.emit(a.x, 0.4, a.z, Math.sin(t) * 6, rand(0, 0.6), Math.cos(t) * 6, 0.5, 0.35, 0.6, 0.2, 0.3, 0.45, 2.5, 0); }
          near(a.x, a.z, 3.2, (e, ex, ez) => { damageEnemy(e, a.atk * 1.5, ex, ez, 2, 'ally', a); e.slowT = 3; e.slowF = 0.5; });
        }
        break;
      case 'shadow': // 暗襲：閃到敵人背後重擊
        if (d < 6 && !tgt.isBoss) {
          a.skill = 7;
          for (let i = 0; i < 10; i++) P.emit(a.x, 0.6, a.z, rand(-1, 1), rand(0.5, 1.5), rand(-1, 1), 0.5, 0.45, 0.1, 0.25, 0.2, 0.35, 1, 0);
          a.x = tgt.x - Math.sin(tgt.face || 0) * 1.1; a.z = tgt.z - Math.cos(tgt.face || 0) * 1.1;
          a.face = tgt.face || 0;
          allyHit(a, tgt, a.atk * 3.2, 3);
        }
        break;
      case 'dark': // 守護：吸引周圍敵人並減傷
        if (d < 4) {
          a.skill = 10; a.guardT = 4;
          W.flat('ring', a.x, a.z, { r: 1, life: 0.7, grow: 5, color: 0xff7a5a, opacity: 0.55 });
          near(a.x, a.z, 6, (e) => { e.tauntT = 4; e.tauntBy = a; });
        }
        break;
      default: a.skill = 99; // 赤狼：撕咬是被動
    }
  }
  function updateAllies(dt) {
    const live = S.allies.filter((a) => !a.down);
    const spd = ST.speed * 1.12;
    live.forEach((a, k) => {
      a.cd -= dt; a.skill -= dt; a.flash = Math.max(0, a.flash - dt * 6);
      if (a.guardT > 0) a.guardT -= dt;
      if (a.buffT > 0) a.buffT -= dt;
      if (a.bossHitT > 0) a.bossHitT -= dt;
      if (a.ifr > 0) a.ifr -= dt;
      a.calm = (a.calm || 0) + dt;
      if (a.calm > 2 && a.hp < a.maxhp) a.hp = Math.min(a.maxhp, a.hp + a.maxhp * (a.retreat ? 0.07 : 0.03) * dt); // 脫離戰鬥後慢慢回血
      // 重傷就退回白狼身邊，回到七成再上
      if (a.hp < a.maxhp * 0.3) a.retreat = true; else if (a.hp > a.maxhp * 0.7) a.retreat = false;
      if (a.leap) { // 飛撲途中
        const L = a.leap; L.t += dt;
        const f = Math.min(1, L.t / L.dur);
        a.x = L.x0 + (L.x1 - L.x0) * f; a.z = L.z0 + (L.z1 - L.z0) * f;
        a.anim = 'run'; a.t += dt * 2;
        if (f >= 1) { a.leap = null; if (L.e && !L.e.dying && L.e.hp > 0) allyHit(a, L.e, a.atk * 3, 6); W.flat('ring', a.x, a.z, { r: 0.6, life: 0.35, grow: 2.2, color: 0xd8e4ff, opacity: 0.6 }); }
        return;
      }
      const lead = Math.hypot(a.x - S.x, a.z - S.z);
      const range = S.cmd === 'follow' ? 3.2 : 9;
      let tgt = a.tgt;
      if (tgt && (tgt.dying || tgt.hp <= 0 || (tgt.y || 0) > 2 || Math.hypot(tgt.x - a.x, tgt.z - a.z) > range + 2)) tgt = null;
      if (!tgt && lead < 12) { // 找目標：離自己近、也不離白狼太遠
        let bd = range * range;
        near(a.x, a.z, range, (e, ex, ez) => { if (e.D.flyer) return; const d2 = ex * ex + ez * ez; if (d2 < bd && Math.hypot(e.x - S.x, e.z - S.z) < 12) { bd = d2; tgt = e; } });
        const b = S.boss; if (!tgt && b && !b.dying && b.y < 1.5 && Math.hypot(b.x - a.x, b.z - a.z) < range + b.r) tgt = b;
      }
      if (lead > 14 || a.retreat) tgt = null; // 離白狼太遠或重傷就先回來
      a.tgt = tgt;
      let mx = 0, mz = 0;
      if (tgt) {
        const dx = tgt.x - a.x, dz = tgt.z - a.z, d = Math.hypot(dx, dz) || 0.01, reach = (tgt.r || 0.6) + 0.55;
        if (d > reach) { mx = (dx / d) * spd; mz = (dz / d) * spd; }
        a.face = lerpAng(a.face, Math.atan2(dx, dz), Math.min(1, dt * 10));
        if (a.skill <= 0) allySkill(a, tgt, d);
        if (d <= reach + 0.15 && a.cd <= 0) { a.cd = 0.85; a.biteT = 0.001; allyHit(a, tgt, a.atk, 2); }
      } else {
        // 跟隨：在白狼身後排成弧形
        const n = live.length, ang = S.face + Math.PI + (k - (n - 1) / 2) * 0.75, rad = 2.3 + (k % 2) * 0.7;
        const dx = S.x + Math.sin(ang) * rad - a.x, dz = S.z + Math.cos(ang) * rad - a.z, d = Math.hypot(dx, dz);
        if (d > 0.4) { const v = Math.min(spd * 1.15, d * 3.2); mx = (dx / d) * v; mz = (dz / d) * v; }
      }
      for (const o of live) { if (o === a) continue; const ox = a.x - o.x, oz = a.z - o.z, d = Math.hypot(ox, oz); if (d < 1.1 && d > 0.001) { mx += (ox / d) * (1.1 - d) * 4; mz += (oz / d) * (1.1 - d) * 4; } }
      { const ox = a.x - S.x, oz = a.z - S.z, d = Math.hypot(ox, oz); if (d < 1.2 && d > 0.001) { mx += (ox / d) * (1.2 - d) * 4; mz += (oz / d) * (1.2 - d) * 4; } }
      a.vx += (mx - a.vx) * Math.min(1, dt * 10); a.vz += (mz - a.vz) * Math.min(1, dt * 10);
      a.x += a.vx * dt; a.z += a.vz * dt;
      [a.x, a.z] = W.collide(a.x, a.z, 0.5);
      const v = Math.hypot(a.vx, a.vz);
      if (v > 0.3 && !tgt) a.face = lerpAng(a.face, Math.atan2(a.vx, a.vz), Math.min(1, dt * 10));
      if (a.biteT > 0) { a.biteT += dt; a.anim = 'bite'; a.animT = a.biteT; if (a.biteT > 0.5) a.biteT = 0; }
      else { a.anim = v > 0.6 ? 'run' : 'idle'; a.t += dt * (v > 0.6 ? 0.75 + (v / spd) * 0.4 : 1); }
      if (lead > 22) { a.x = S.x - Math.sin(S.face) * 2; a.z = S.z - Math.cos(S.face) * 2; a.vx = a.vz = 0; } // 卡住就回到身邊
    });
    for (const a of S.allies) if (a.down && a.dis < 1) a.dis = Math.min(1, a.dis + dt * 1.2);
  }

  // ---------------- 狼群模式的出怪與目標 ----------------
  let packEliteT = 45, leaderSpawned = false;
  function makeElite(e) { if (!e) return; e.elite = true; e.hp = e.maxhp = e.hp * 14; e.r *= 1.5; e.scale *= 1.55; e.dmg *= 1.5; e.tint = [e.D.tint[0] * 1.3 + 0.25, e.D.tint[1] * 1.05 + 0.12, e.D.tint[2] * 0.6]; }
  function packSpawn(dt) {
    const sp = pack.spec, n = S.allies.filter((a) => !a.down).length;
    const rate = (1.3 + sp.lv * 0.35 + n * 0.25) * (1 + S.t / 240) * (mobile ? 0.85 : 1);
    const cap = Math.round((32 + sp.lv * 12 + n * 5) * (mobile ? 0.85 : 1));
    spawnAcc += dt * rate;
    while (spawnAcc >= 1) { spawnAcc--; if (enemies.length < cap) spawnRing(pickKind(sp.mix)); }
    packEliteT -= dt;
    if (packEliteT <= 0) { packEliteT = 55; const ks = Object.keys(sp.mix).filter((k) => k !== 'hatch'); makeElite(spawnRing(ks[Math.floor(Math.random() * ks.length)] || 'wolf')); }
    if (sp.kind === 'defend') {
      if (!leaderSpawned && S.t > sp.time * 0.5) { leaderSpawned = true; const ks = Object.keys(sp.mix).filter((k) => k !== 'hatch'); makeElite(spawnRing(ks[0] || 'wolf')); onEvent('banner', { text: '敵方首領現身' }); }
      if (S.t >= sp.time) { S.won = true; onEvent('banner', { text: '守住了' }); later(1.8, () => onEvent('packend', packResult(true))); }
    } else if (!S.goal.boss && S.kills >= sp.kills) { S.goal.boss = true; spawnBoss(packBoss()); }
  }

  // ---------------- 武器 ----------------
  const lvOf = (id) => { const w = S.weapons.find((x) => x.id === id || EVOS[x.id]?.from === id); return w ? w.lv : 0; };
  function wstats(w) {
    const L = w.lv, ge = (n) => L >= n;
    const a = ST.area, c = ST.cool;
    switch (w.id) {
      case 'claw': return { cd: 1.1 * (ge(5) ? 0.85 : 1) * c, dmg: (18 + 4 * (L - 1)) * (ge(4) ? 1.4 : 1) * (ge(6) ? 1.3 : 1), range: 2.8 * (ge(2) ? 1.2 : 1) * (ge(6) ? 1.15 : 1) * a, back: ge(3) };
      case 'clawX': return { cd: 1.0 * c, dmg: 70, range: 3.5 * a, back: true, full: true };
      case 'frost': return { cd: 3.0 * c, dmg: (6 + (L - 1)) * (ge(3) ? 1.4 : 1) * (ge(6) ? 1.3 : 1), range: 4.6 * (ge(2) ? 1.2 : 1) * (ge(6) ? 1.15 : 1) * a, dur: 1.2 * (ge(4) ? 1.5 : 1), slow: ge(5) ? 0.55 : 0.35 };
      case 'frostX': return { dmg: 9, range: 4.3 * a, slow: 0.55 };
      case 'orbit': return { cd: 5.5 * c, dmg: 13 * (ge(3) ? 1.4 : 1) * (ge(6) ? 1.2 : 1) + (L - 1) * 2, n: 1 + ge(2) + ge(4) + ge(6), radius: 2.5 * a, dur: 4 * (ge(5) ? 1.5 : 1), speed: 3.2 * (ge(6) ? 1.3 : 1) };
      case 'orbitX': return { cd: 0, dmg: 24, n: 6, radius: 3.1 * a, dur: 1e9, speed: 3.6 };
      case 'ghost': return { cd: 3.8 * (ge(5) ? 0.8 : 1) * c, dmg: (24 + 4 * (L - 1)) * (ge(3) ? 1.4 : 1) * (ge(6) ? 1.25 : 1), n: 1 + ge(2) + ge(4) + ge(6) };
      case 'ghostX': return { cd: 2.6 * c, dmg: 44, n: 8, ret: true };
      case 'thunder': return { cd: 2.6 * c, dmg: (30 + 5 * (L - 1)) * (ge(3) ? 1.4 : 1), n: 1 + ge(2) + ge(4) + (ge(6) ? 2 : 0), aoe: 1.3 * (ge(5) ? 1.35 : 1) * a };
      case 'thunderX': return { cd: 2.4 * c, dmg: 55, n: 5, aoe: 1.8 * a, chain: 3 };
      case 'wisp': return { cd: 1.3 * (ge(6) ? 0.8 : 1) * c, dmg: (12 + 2 * (L - 1)) * (ge(3) ? 1.4 : 1) * (ge(6) ? 1.25 : 1), n: 1 + ge(2) + ge(5), pierce: 1 + ge(4) };
      case 'wispX': return { cd: 1.1 * c, dmg: 26, n: 4, pierce: 3, heal: 1 };
    }
  }
  function slash(dir, range, dmg, full) {
    const arc = full ? TAU * 0.98 : 2.6;
    W.flat('slash', S.x + Math.sin(dir) * 0.3, S.z + Math.cos(dir) * 0.3, { r: range, rot: dir - Math.PI / 2, life: 0.24, color: full ? 0xb8ceff : 0xd6e2ff, arc, sweep: true, y: 0.75, opacity: 0.85 });
    near(S.x, S.z, range, (e, dx, dz) => {
      if (!full) { let da = Math.abs(((Math.atan2(dx, dz) - dir + Math.PI) % TAU + TAU) % TAU - Math.PI); if (da > arc / 2 + 0.15) return; }
      damageEnemy(e, dmg, dx, dz, 5, 'claw');
    });
    if (S.boss && !S.boss.dying) { const b = S.boss, dx = b.x - S.x, dz = b.z - S.z; if (Math.hypot(dx, dz) < range + b.r) { const da = Math.abs(((Math.atan2(dx, dz) - dir + Math.PI) % TAU + TAU) % TAU - Math.PI); if (full || da < arc / 2 + 0.3) damageEnemy(b, dmg); } }
  }
  function fireWeapons(dt) {
    for (const w of S.weapons) {
      const s = wstats(w);
      w.cd -= dt;
      switch (w.id) {
        case 'claw': case 'clawX': {
          if (w.cd > 0) break;
          w.cd = s.cd;
          const tgt = nearest(S.x, S.z, s.range + 2.5);
          const dir = tgt ? Math.atan2(tgt.x - S.x, tgt.z - S.z) : S.face;
          slash(dir, s.range, s.dmg, s.full);
          if (s.back && !s.full) later(0.14, () => slash(dir + Math.PI, s.range, s.dmg * 0.8, false));
          if (s.full) { later(0.16, () => slash(dir + 1.2, s.range * 1.1, s.dmg * 0.8, true)); W.flat('claw', S.x, S.z, { r: 1.2, rot: dir, life: 2.5, additive: false, opacity: 0.8, y: 0.03 }); }
          act.bite.reset().setEffectiveWeight(1).fadeIn(0.06).play();
          audio.play('hitm', { volume: 0.12, rate: 1.6 });
          break;
        }
        case 'frost': {
          if (w.cd <= 0) { w.cd = s.cd + s.dur; w.on = s.dur; }
          if (w.on > 0) {
            w.on -= dt; w.tick = (w.tick || 0) - dt;
            const dir = S.face, half = 0.55;
            for (let i = 0; i < (mobile ? 4 : 6); i++) {
              const a = dir + rand(-half, half), sp = rand(5, 8) * (s.range / 4.6);
              P.emit(S.x + Math.sin(dir) * 0.9, 0.85, S.z + Math.cos(dir) * 0.9, Math.sin(a) * sp, rand(-0.2, 0.4), Math.cos(a) * sp, rand(0.45, 0.7), 0.3, 1.1, 0.16, 0.26, 0.42, 1.6, -0.3);
            }
            if (w.tick <= 0) {
              w.tick = 0.2;
              near(S.x, S.z, s.range, (e, dx, dz) => {
                const da = Math.abs(((Math.atan2(dx, dz) - dir + Math.PI) % TAU + TAU) % TAU - Math.PI);
                if (da > half + 0.1) return;
                damageEnemy(e, s.dmg, dx, dz, 0.6, 'frost'); e.slowT = 1.6; e.slowF = Math.max(e.slowF, s.slow);
              });
              const b = S.boss; if (b && !b.dying && Math.hypot(b.x - S.x, b.z - S.z) < s.range + b.r) { damageEnemy(b, s.dmg); b.slowT = 1.6; b.slowF = s.slow; }
            }
          }
          break;
        }
        case 'frostX': {
          w.tick = (w.tick || 0) - dt;
          for (let i = 0; i < (mobile ? 3 : 5); i++) { const a = Math.random() * TAU, r = rand(0.6, s.range); P.emit(S.x + Math.sin(a) * r, rand(0.2, 1.2), S.z + Math.cos(a) * r, Math.cos(a) * 2.5, rand(-0.2, 0.3), -Math.sin(a) * 2.5, rand(0.5, 0.9), 0.35, 0.8, 0.18, 0.28, 0.45, 0.5, 0); }
          if (w.tick <= 0) {
            w.tick = 0.25;
            near(S.x, S.z, s.range, (e, dx, dz) => { damageEnemy(e, s.dmg, dx, dz, 0.3, 'frost'); e.slowT = 1.2; e.slowF = s.slow; if (Math.random() < 0.06) e.freezeT = 1.2; });
            const b = S.boss; if (b && !b.dying && Math.hypot(b.x - S.x, b.z - S.z) < s.range + b.r) { damageEnemy(b, s.dmg); b.slowT = 1.2; b.slowF = s.slow; }
          }
          break;
        }
        case 'orbit': case 'orbitX': {
          if (w.on === undefined) w.on = 0;
          if (w.on <= 0 && w.cd <= 0) { w.on = s.dur; w.cd = s.cd + s.dur; }
          if (w.on > 0) {
            w.on -= dt; w.ang = (w.ang || 0) + dt * s.speed;
            w.hits = w.hits || new Map();
            for (let i = 0; i < s.n; i++) {
              const a = w.ang + (i / s.n) * TAU, x = S.x + Math.sin(a) * s.radius, z = S.z + Math.cos(a) * s.radius;
              const m = shards[i]; m.visible = true; m.position.set(x, 0.9, z); m.rotation.set(0, a + Math.PI / 2, 0);
              m.scale.setScalar(w.on < 0.3 ? w.on / 0.3 : 1);
              if (Math.random() < 0.6) P.emit(x, 0.9, z, 0, 0.1, 0, 0.35, 0.32, 0.05, 0.55, 0.7, 1, 0, 0);
              near(x, z, 0.55, (e, dx, dz) => { const last = w.hits.get(e) || 0; if (S.t - last > 0.55) { w.hits.set(e, S.t); damageEnemy(e, s.dmg, dx, dz, 3, 'orbit'); } });
              const b = S.boss; if (b && !b.dying && Math.hypot(b.x - x, b.z - z) < b.r + 0.5) { const last = w.hits.get(b) || 0; if (S.t - last > 0.55) { w.hits.set(b, S.t); damageEnemy(b, s.dmg); } }
            }
            if (w.hits.size > 400) w.hits.clear();
          }
          for (let i = (w.on > 0 ? s.n : 0); i < shards.length; i++) shards[i].visible = false;
          break;
        }
        case 'ghost': case 'ghostX': {
          if (w.cd > 0) break;
          w.cd = s.cd;
          const used = new Set();
          for (let i = 0; i < s.n; i++) {
            const t = nearest(S.x, S.z, 14, used);
            let a = t ? Math.atan2(t.x - S.x, t.z - S.z) : S.face + (i - (s.n - 1) / 2) * 0.5;
            if (t) used.add(t);
            a += rand(-0.08, 0.08);
            ghostList.push({ x: S.x, z: S.z, dx: Math.sin(a), dz: Math.cos(a), t: 0, life: s.ret ? 1.5 : 0.95, dmg: s.dmg, hit: new Set(), ret: s.ret, delay: i * 0.07 });
          }
          break;
        }
        case 'thunder': case 'thunderX': {
          if (w.cd > 0) break;
          w.cd = s.cd;
          const R = viewRadius() * 0.75;
          const cands = enemies.filter((e) => !e.dying && (e.x - S.x) ** 2 + (e.z - S.z) ** 2 < R * R);
          if (S.boss && !S.boss.dying) cands.push(S.boss);
          if (!cands.length) { w.cd = 0.3; break; }
          for (let i = 0; i < s.n; i++) {
            const t = cands[Math.floor(Math.random() * cands.length)];
            const tx = t.x, tz = t.z;
            later(i * 0.09, () => {
              strike(tx, tz, s);
              if (s.chain) { let px = t.x, pz = t.z; const hit = new Set([t]); for (let c = 0; c < s.chain; c++) { const n2 = nearest(px, pz, 6, hit); if (!n2) break; hit.add(n2); W.bolt(n2.x, n2.z, px, pz); damageEnemy(n2, s.dmg * 0.7, 0, 0, 0, 'thunder'); px = n2.x; pz = n2.z; } }
            });
          }
          audio.play('boom', { volume: 0.2, rate: rand(1.2, 1.5) });
          break;
        }
        case 'wisp': case 'wispX': {
          if (w.cd > 0) break;
          w.cd = s.cd;
          S.wispHeal = s.heal || 0;
          for (let i = 0; i < s.n; i++) {
            const a = S.face + (i - (s.n - 1) / 2) * 0.6 + Math.PI;
            wisps.push({ x: S.x, z: S.z, y: 1.3, vx: Math.sin(a) * 4, vz: Math.cos(a) * 4, life: 3.5, dmg: s.dmg, pierce: s.pierce, hit: new Set(), tgt: null });
          }
          break;
        }
      }
    }
  }
  function strike(x, z, s) {
    W.bolt(x, z); W.lightning(x, z);
    W.flat('scorch', x, z, { r: s.aoe * 0.75, rot: Math.random() * TAU, life: 2.5, additive: false, opacity: 0.4, y: 0.025 });
    W.flat('ring', x, z, { r: s.aoe * 0.5, life: 0.35, grow: 2.2, color: 0xbcd4ff });
    for (let i = 0; i < 14; i++) P.emit(x, 0.2, z, rand(-4, 4), rand(1, 5), rand(-4, 4), rand(0.2, 0.4), 0.14, 0.03, 0.8, 0.9, 1, 3, 9);
    near(x, z, s.aoe, (e, dx, dz) => damageEnemy(e, s.dmg, dx, dz, 2, 'thunder'));
    const b = S.boss; if (b && !b.dying && Math.hypot(b.x - x, b.z - z) < s.aoe + b.r) damageEnemy(b, s.dmg);
  }
  function howl(free) {
    if (!free && S.ult < 1) return false;
    S.ult = 0;
    W.cam.shake = 1;
    const R = 9 * ST.area;
    W.flat('ring', S.x, S.z, { r: 1.5, life: 0.75, grow: R / 1.5 * 1.15, color: 0xcfe0ff, opacity: 1 });
    W.flat('ring', S.x, S.z, { r: 1, life: 1.0, grow: R * 0.8, color: 0x7f9fff, opacity: 0.6 });
    for (let i = 0; i < 90; i++) { const a = Math.random() * TAU; P.emit(S.x, 0.4, S.z, Math.sin(a) * rand(8, 13), rand(0, 1), Math.cos(a) * rand(8, 13), rand(0.5, 0.8), 0.3, 0.1, 0.6, 0.75, 1, 2, 0); }
    near(S.x, S.z, R, (e, dx, dz) => { damageEnemy(e, 60 + S.lv * 4, dx, dz, 14, 'howl'); e.fearT = 2.5; });
    const b = S.boss; if (b && !b.dying && Math.hypot(b.x - S.x, b.z - S.z) < R + b.r) { damageEnemy(b, 120 + S.lv * 6); b.fearT = 1.2; }
    for (const s of shots) s.life = 0; // 吼聲震散投射物
    for (const a of S.allies) if (!a.down) { a.hp = Math.min(a.maxhp, a.hp + a.maxhp * 0.3); a.buffT = 8; } // 狼群士氣大振
    audio.play('bigboom', { volume: 0.4, rate: 1.3 });
    return true;
  }

  // ---------------- 升級 ----------------
  function evoReady() {
    const out = [];
    for (const w of S.weapons) {
      const def = WEAPONS[w.id];
      if (!def || w.lv < WEAPON_MAX) continue;
      if (S.passives[def.need]) out.push(def.evo);
    }
    return out;
  }
  function choices(n = 3) {
    const pool = [];
    for (const id of evoReady()) pool.push({ type: 'evo', id, w: 6 });
    for (const w of S.weapons) if (WEAPONS[w.id] && w.lv < WEAPON_MAX) pool.push({ type: 'weapon', id: w.id, lv: w.lv + 1, w: 3 });
    if (S.weapons.length < MAX_WEAPONS) for (const id in WEAPONS) if (!lvOf(id)) pool.push({ type: 'weapon', id, lv: 1, w: S.weapons.length < 3 ? 3 : 1.6 });
    for (const id in S.passives) if (S.passives[id] < PASSIVE_MAX) pool.push({ type: 'passive', id, lv: S.passives[id] + 1, w: 2 });
    if (Object.keys(S.passives).length < MAX_PASSIVES) for (const id in PASSIVES) if (!S.passives[id]) pool.push({ type: 'passive', id, lv: 1, w: 1.4 });
    const out = [];
    while (out.length < n && pool.length) {
      let tot = pool.reduce((a, c) => a + c.w, 0), r = Math.random() * tot, i = 0;
      for (; i < pool.length; i++) { r -= pool[i].w; if (r <= 0) break; }
      out.push(pool.splice(Math.min(i, pool.length - 1), 1)[0]);
    }
    if (!out.length) out.push({ type: 'heal' }, { type: 'souls' });
    return out;
  }
  function apply(c) {
    if (c.type === 'weapon') {
      const w = S.weapons.find((x) => x.id === c.id);
      if (w) w.lv++; else S.weapons.push({ id: c.id, lv: 1, cd: 0.3 });
    } else if (c.type === 'passive') { S.passives[c.id] = (S.passives[c.id] || 0) + 1; recalc(); }
    else if (c.type === 'evo') {
      const from = EVOS[c.id].from, w = S.weapons.find((x) => x.id === from);
      if (w) { w.id = c.id; w.cd = 0.3; w.on = undefined; }
    } else if (c.type === 'heal') S.hp = Math.min(S.maxhp, S.hp + 30);
    else if (c.type === 'souls') S.bonusSouls = (S.bonusSouls || 0) + 5;
  }
  function gainXP(v) {
    S.xp += v * ST.growth;
    while (S.xp >= xpNeed(S.lv)) { S.xp -= xpNeed(S.lv); S.lv++; S.pendingLv++; }
    if (S.pendingLv && S.state === 'play') nextLevelUp();
  }
  function nextLevelUp() {
    if (!S.pendingLv || S.won) { S.pendingLv = 0; S.state = 'play'; return; } // 已經獲勝就不再跳升級
    S.pendingLv--;
    S.state = 'choose';
    audio.play('power', { volume: 0.4 });
    onEvent('levelup', { choices: choices(metaLv('luck') ? 4 : 3), lv: S.lv });
  }
  function openChest(big) {
    const got = [];
    const times = big ? 3 : 1;
    for (let i = 0; i < times; i++) {
      const ev = evoReady();
      let c;
      if (ev.length) c = { type: 'evo', id: ev[0] };
      else {
        const pool = [];
        for (const w of S.weapons) if (WEAPONS[w.id] && w.lv < WEAPON_MAX) pool.push({ type: 'weapon', id: w.id, lv: w.lv + 1 });
        for (const id in S.passives) if (S.passives[id] < PASSIVE_MAX) pool.push({ type: 'passive', id, lv: S.passives[id] + 1 });
        c = pool.length ? pool[Math.floor(Math.random() * pool.length)] : { type: 'heal' };
      }
      apply(c); got.push(c);
    }
    S.state = 'chest';
    audio.play('power', { volume: 0.5, rate: 0.8 });
    onEvent('chest', { got, big });
  }

  // ---------------- 每格更新 ----------------
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
  let lastBite = 0;
  function step(dt) {
    S.t += dt;
    hitSfxT -= dt;
    for (let i = timers.length - 1; i >= 0; i--) if (timers[i].t <= S.t) { const f = timers[i].fn; timers.splice(i, 1); if (!S.dead) f(); }
    if (S.hurtT > 0) S.hurtT -= dt;
    if (S.iframe > 0) S.iframe -= dt;
    if (auto.on) autopilot();
    // 玩家移動
    const il = Math.hypot(input.x, input.z);
    let mx = 0, mz = 0;
    if (il > 0.08) { mx = input.x / Math.max(1, il); mz = input.z / Math.max(1, il); }
    let sp = ST.speed;
    for (const wz of webs) if (Math.hypot(wz.x - S.x, wz.z - S.z) < wz.r) { sp *= 0.55; break; }
    S.vx += (mx * sp - S.vx) * Math.min(1, dt * 12);
    S.vz += (mz * sp - S.vz) * Math.min(1, dt * 12);
    S.x += S.vx * dt; S.z += S.vz * dt;
    [S.x, S.z] = W.collide(S.x, S.z, 0.55);
    S.moving = Math.hypot(S.vx, S.vz) / ST.speed;
    if (S.moving > 0.05) S.face = lerpAng(S.face, Math.atan2(S.vx, S.vz), Math.min(1, dt * 12));
    S.hp = Math.min(S.maxhp, S.hp + ST.regen * dt);

    // 出怪
    if (pack) { if (!S.won) packSpawn(dt); }
    else if (!S.won) {
      const wv = waveAt(S.t);
      const alive = enemies.length;
      spawnAcc += dt * wv.rate * (mobile ? 0.85 : 1);
      const cap = mobile ? Math.round(wv.cap * 0.82) : wv.cap;
      while (spawnAcc >= 1) { spawnAcc--; if (alive < cap) spawnRing(pickKind(wv.mix)); }
      if (swarmIdx < SWARMS.length && S.t >= SWARMS[swarmIdx].t) {
        const sw = SWARMS[swarmIdx++], R = viewRadius() * 0.9;
        for (let i = 0; i < sw.n; i++) { const a = (i / sw.n) * TAU; spawn(sw.kind, S.x + Math.sin(a) * R, S.z + Math.cos(a) * R); }
        onEvent('banner', { text: '被包圍了' });
      }
      eliteT -= dt;
      if (eliteT <= 0 && S.t > 80) {
        eliteT = 70;
        const kinds = Object.keys(wv.mix).filter((k) => k !== 'hatch');
        const e = spawnRing(kinds[Math.floor(Math.random() * kinds.length)] || 'wolf');
        if (e) { e.elite = true; e.hp = e.maxhp = e.hp * 14; e.r *= 1.5; e.scale *= 1.55; e.dmg *= 1.5; e.tint = [e.D.tint[0] * 1.3 + 0.25, e.D.tint[1] * 1.05 + 0.12, e.D.tint[2] * 0.6]; }
      }
      for (const b of BOSSES) if (S.t >= b.at && !S.bossesDone.includes(b.id) && !(S.boss && S.boss.def.id === b.id)) { if (!S.boss) spawnBoss(b); }
    }
    buildGrid();

    // 敵人
    const R = viewRadius();
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.dying) {
        e.dying += dt;
        if (e.dying > 0.75) enemies.splice(i, 1);
        continue;
      }
      if (e.born > 0) { e.born += dt; if (e.born > 0.45) e.born = 0; }
      e.flash = Math.max(0, e.flash - dt * 7);
      // 流血（赤狼）
      if (e.bleedT > 0) { e.bleedT -= dt; e.bleedAcc = (e.bleedAcc || 0) + dt; if (e.bleedAcc >= 0.5) { e.bleedAcc = 0; damageEnemy(e, e.bleedD * 0.5, 0, 0, 0, 'ally', e.bleedBy); if (e.dying) continue; } }
      // 目標：白狼或最近的同伴（被黑狼嘲諷時只追牠）
      let tx = S.x, tz = S.z, tgt = null;
      if (S.allies.length) {
        if (e.tauntT > 0 && e.tauntBy && !e.tauntBy.down) { e.tauntT -= dt; tgt = e.tauntBy; }
        else { let bd = ((S.x - e.x) ** 2 + (S.z - e.z) ** 2) * 0.6; for (const a of S.allies) { if (a.down) continue; const d2 = (a.x - e.x) ** 2 + (a.z - e.z) ** 2; if (d2 < bd) { bd = d2; tgt = a; } } }
        if (tgt) { tx = tgt.x; tz = tgt.z; }
      }
      const dx = tx - e.x, dz = tz - e.z, dist = Math.hypot(dx, dz) || 0.001;
      // 太遠就移到前方
      if (Math.hypot(S.x - e.x, S.z - e.z) > R * 1.7 && !e.elite) {
        const a = Math.atan2(S.vx, S.vz) + rand(-1, 1) + (S.moving > 0.2 ? 0 : Math.random() * TAU);
        e.x = S.x + Math.sin(a) * (R + 2); e.z = S.z + Math.cos(a) * (R + 2); e.born = 0.001;
        continue;
      }
      let sp = e.speed;
      if (e.slowT > 0) { e.slowT -= dt; sp *= 1 - e.slowF; } else e.slowF = 0;
      if (e.freezeT > 0) { e.freezeT -= dt; sp = 0; }
      let mvx = (dx / dist) * sp, mvz = (dz / dist) * sp;
      e.anim = e.D.anim;
      // 夢魘戰馬：靠近後揚蹄蓄力，再直線衝鋒
      if (e.D.charger) {
        e.st += dt;
        if (e.state === 0) { if (dist < 10 && e.st > 2) { e.state = 1; e.st = 0; e.lx = dx / dist; e.lz = dz / dist; } }
        if (e.state === 1) { mvx = mvz = 0; e.anim = 'bite'; e.animT = e.st; e.face = lerpAng(e.face, angTo(e.lx, e.lz), dt * 8); if (e.st > 0.75) { e.state = 2; e.st = 0; } }
        else if (e.state === 2) { mvx = e.lx * 11; mvz = e.lz * 11; e.anim = 'run'; if (e.st > 1.3) { e.state = 0; e.st = 0; } }
      }
      // 飛龍：保持距離盤旋並吐火球
      if (e.D.flyer) {
        const want = 7.5, tang = 0.7;
        const rx = -dz / dist, rz = dx / dist;
        const k = (dist - want) / 3;
        mvx = (dx / dist * clamp(k, -1, 1) + rx * tang) * sp; mvz = (dz / dist * clamp(k, -1, 1) + rz * tang) * sp;
        e.shootT -= dt;
        if (e.shootT <= 0 && dist < 13) {
          e.shootT = rand(2.8, 3.6);
          const a = angTo(dx, dz);
          shots.push({ x: e.x, z: e.z, y: e.y, vx: Math.sin(a) * 7.5, vz: Math.cos(a) * 7.5, dmg: e.dmg, life: 3, kind: 'fire', r: 0.35 });
        }
      }
      if (e.fearT > 0) { e.fearT -= dt; mvx = -mvx * 0.8; mvz = -mvz * 0.8; }
      // 互相推開
      let px = 0, pz = 0;
      near(e.x, e.z, e.r * 1.1, (o, ox, oz) => {
        if (o === e) return;
        const d = Math.hypot(ox, oz) || 0.01, ov = e.r + o.r - d;
        if (ov > 0) { px -= (ox / d) * ov; pz -= (oz / d) * ov; }
      });
      e.vx *= Math.max(0, 1 - dt * 6); e.vz *= Math.max(0, 1 - dt * 6);
      e.x += (mvx + e.vx) * dt + px * Math.min(1, dt * 8);
      e.z += (mvz + e.vz) * dt + pz * Math.min(1, dt * 8);
      if (!e.D.flyer) [e.x, e.z] = W.collide(e.x, e.z, e.r * 0.8);
      if (Math.hypot(mvx, mvz) > 0.2 && !(e.D.charger && e.state === 1)) e.face = lerpAng(e.face, angTo(mvx, mvz), Math.min(1, dt * 7));
      // 攻擊
      e.atk -= dt;
      if (!e.D.flyer && dist < e.r + 0.55 && e.atk <= 0) {
        if (tgt) hurtAlly(tgt, e.dmg); else hurtPlayer(e.dmg);
        e.atk = 0.9; e.biteT = 0.001;
      }
      if (e.biteT > 0) { e.biteT += dt; e.anim = 'bite'; e.animT = e.biteT; if (e.biteT > 0.5) e.biteT = 0; }
      e.t += dt * (ANIM_RATE[e.D.model][e.anim] || 1) * (e.freezeT > 0 ? 0 : sp / e.speed || 0.3);
    }

    if (S.allies.length) updateAllies(dt);
    // 頭目
    if (S.boss) updateBoss(S.boss, dt);

    // 敵方投射物
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      s.life -= dt;
      s.x += s.vx * dt; s.z += s.vz * dt;
      if (s.kind === 'web') {
        s.y = Math.max(0.1, s.y + (1.4 - s.life) * 0.0 - dt * 0.6);
        P.emit(s.x, s.y, s.z, 0, 0, 0, 0.08, 0.7, 0.6, 0.6, 0.6, 0.65);
        if (s.life <= 0) { webs.push({ x: s.x, z: s.z, r: 2.3, life: 6 }); W.flat('web', s.x, s.z, { r: 2.4, rot: Math.random() * TAU, life: 6, additive: false, opacity: 0.55, y: 0.03 }); shots.splice(i, 1); continue; }
      } else {
        P.emit(s.x, s.y, s.z, 0, 0, 0, 0.06, 0.85, 0.7, 1, 0.55, 0.18);
        if (Math.random() < 0.7) P.emit(s.x, s.y, s.z, rand(-0.4, 0.4), rand(0, 0.6), rand(-0.4, 0.4), rand(0.25, 0.45), 0.4, 0.05, 1, 0.35, 0.08, 1, -0.5);
        s.y = Math.max(0.6, s.y - dt * 0.4);
      }
      if (s.kind !== 'web' && Math.hypot(s.x - S.x, s.z - S.z) < s.r + 0.5) { hurtPlayer(s.dmg); shots.splice(i, 1); continue; }
      if (s.kind !== 'web' && S.allies.length) { const a = S.allies.find((o) => !o.down && Math.hypot(s.x - o.x, s.z - o.z) < s.r + 0.5); if (a) { hurtAlly(a, s.dmg); shots.splice(i, 1); continue; } }
      if (s.life <= 0) shots.splice(i, 1);
    }
    for (let i = webs.length - 1; i >= 0; i--) { webs[i].life -= dt; if (webs[i].life <= 0) webs.splice(i, 1); }

    // 武器
    fireWeapons(dt);
    // 幽狼
    for (let i = ghostList.length - 1; i >= 0; i--) {
      const g = ghostList[i];
      if (g.delay > 0) { g.delay -= dt; continue; }
      g.t += dt;
      let k = 13;
      if (g.ret && g.t > g.life / 2) { k = -13; }
      g.x += g.dx * k * dt; g.z += g.dz * k * dt;
      near(g.x, g.z, 0.9, (e, dx, dz) => { if (g.hit.has(e) && !(g.ret && g.t > g.life / 2 && !g.hit2?.has(e))) return; if (g.ret && g.t > g.life / 2) (g.hit2 || (g.hit2 = new Set())).add(e); g.hit.add(e); damageEnemy(e, g.dmg, g.dx, g.dz, 4, 'ghost'); });
      const b = S.boss; if (b && !b.dying && !g.hit.has(b) && Math.hypot(b.x - g.x, b.z - g.z) < b.r + 0.8) { g.hit.add(b); damageEnemy(b, g.dmg); }
      if (Math.random() < 0.7) P.emit(g.x, 0.7, g.z, 0, 0.3, 0, 0.4, 0.4, 0.1, 0.35, 0.5, 0.9);
      if (g.t >= g.life) ghostList.splice(i, 1);
    }
    // 鬼火
    for (let i = wisps.length - 1; i >= 0; i--) {
      const w = wisps[i];
      w.life -= dt;
      if (!w.tgt || w.tgt.dying || w.tgt.hp <= 0) w.tgt = nearest(w.x, w.z, 12, w.hit);
      if (w.tgt) { const dx = w.tgt.x - w.x, dz = w.tgt.z - w.z, d = Math.hypot(dx, dz) || 1; w.vx += (dx / d * 11 - w.vx) * Math.min(1, dt * 5); w.vz += (dz / d * 11 - w.vz) * Math.min(1, dt * 5); }
      w.x += w.vx * dt; w.z += w.vz * dt;
      P.emit(w.x, w.y, w.z, 0, 0, 0, 0.05, 0.75, 0.6, 0.45, 0.85, 0.8);
      P.emit(w.x, w.y, w.z, rand(-0.3, 0.3), rand(0.2, 0.7), rand(-0.3, 0.3), rand(0.3, 0.5), 0.3, 0.05, 0.3, 0.8, 0.7, 0.5, -0.2);
      let done = false;
      near(w.x, w.z, 0.4, (e) => { if (done || w.hit.has(e)) return; w.hit.add(e); damageEnemy(e, w.dmg, w.vx, w.vz, 2, 'wisp'); w.tgt = null; if (w.hit.size >= w.pierce) done = true; });
      const b = S.boss; if (!done && b && !b.dying && !w.hit.has(b) && Math.hypot(b.x - w.x, b.z - w.z) < b.r + 0.3) { w.hit.add(b); damageEnemy(b, w.dmg); done = true; }
      if (done || w.life <= 0) wisps.splice(i, 1);
    }

    // 魂晶
    const mg2 = ST.magnet * ST.magnet;
    for (let i = gems.length - 1; i >= 0; i--) {
      const g = gems[i];
      g.t += dt;
      const dx = S.x - g.x, dz = S.z - g.z, d2 = dx * dx + dz * dz;
      if (!g.pull && d2 < mg2) g.pull = true;
      if (g.pull) {
        const d = Math.sqrt(d2) || 0.01, v = 6 + g.t * 0 + (g.pv = (g.pv || 4) + dt * 26);
        g.x += (dx / d) * v * dt; g.z += (dz / d) * v * dt;
        if (d < 0.6) { gems.splice(i, 1); gainXP(g.val + (g.extra || 0)); if (Math.random() < 0.3) audio.play('power', { volume: 0.05, rate: 2.2 }); }
      }
    }
    // 拾取物
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.t += dt;
      if (it.kind === 'chest') {
        it.mesh.rotation.y += dt * 0.6;
        if (Math.random() < dt * 16) P.emit(it.x + rand(-0.4, 0.4), rand(0.1, 0.6), it.z + rand(-0.4, 0.4), 0, rand(1.5, 3), 0, rand(0.6, 1.1), 0.22, 0.05, 1, 0.78, 0.4, 0.4, 0);
      } else {
        it.mesh.position.y = 0.45 + Math.sin(it.t * 3) * 0.1;
        if (Math.random() < dt * 8) P.emit(it.x, 0.45, it.z, rand(-0.3, 0.3), rand(0.3, 0.9), rand(-0.3, 0.3), 0.6, 0.25, 0.05, it.kind === 'heal' ? 0.7 : 1, it.kind === 'heal' ? 0.85 : 0.7, it.kind === 'heal' ? 1 : 0.3);
      }
      if (Math.hypot(it.x - S.x, it.z - S.z) < 1.1) {
        scene.remove(it.mesh); items.splice(i, 1);
        if (it.kind === 'heal') { S.hp = Math.min(S.maxhp, S.hp + 30); audio.play('power', { volume: 0.3, rate: 1.3 }); }
        else if (it.kind === 'magnet') { for (const g of gems) g.pull = true; audio.play('power', { volume: 0.3, rate: 0.9 }); }
        else if (it.kind === 'chest') { openChest(it.big); return; }
      }
    }

    if (S.pendingLv && S.state === 'play') nextLevelUp();
  }

  // ---------------- 畫面 ----------------
  function draw(dt) {
    // 玩家
    pg.position.set(S.x, 0, S.z);
    pg.rotation.y = S.face;
    const mv = clamp(S.moving, 0, 1);
    act.idle.setEffectiveWeight(1 - mv);
    act.run.setEffectiveWeight(mv);
    act.run.timeScale = 0.75 + mv * 0.45;
    if (act.bite.isRunning()) { act.bite.setEffectiveWeight(Math.max(0, 1 - act.bite.time / 0.9)); }
    pmix.update(dt);
    if (pmat.userData.sh) pmat.userData.sh.uniforms.hurt.value = Math.max(0, S.hurtT / 0.35);
    // 敵群
    for (const n in hordes) hordes[n].begin();
    for (const e of enemies) {
      const h = hordes[e.D.model];
      const sc = e.scale * (e.born > 0 ? 0.6 + 0.4 * Math.min(1, e.born / 0.45) : 1);
      _q.setFromAxisAngle(_up, e.face); _s.setScalar(sc); _p.set(e.x, e.y + (e.D.flyer ? Math.sin(S.t * 2 + e.st) * 0.2 : 0), e.z);
      _m.compose(_p, _q, _s);
      const anim = e.anim, t = (anim === 'bite' && e.animT !== undefined) ? e.animT : e.t;
      const dis = e.dying ? Math.min(1, e.dying / 0.7) : e.born > 0 ? 1 - Math.min(1, e.born / 0.45) : 0;
      h.push(_m, anim, t, e.tint, e.flash * 0.75, dis);
      if (e.elite && Math.random() < 0.3) P.emit(e.x + rand(-0.6, 0.6), rand(0.2, 1.2), e.z + rand(-0.6, 0.6), 0, rand(0.5, 1.2), 0, 0.7, 0.2, 0.05, 1, 0.7, 0.3, 0.5, 0);
      if (e.biteT === 0) e.animT = undefined;
    }
    for (const n in hordes) hordes[n].end();
    // 同伴
    if (S.allies.length) {
      allyHorde.begin();
      let ri = 0;
      for (const a of S.allies) {
        if (a.down && a.dis >= 1) continue;
        _q.setFromAxisAngle(_up, a.face); _s.setScalar(0.9); _p.set(a.x, 0, a.z);
        _m.compose(_p, _q, _s);
        const anim = a.anim || 'idle';
        allyHorde.push(_m, anim, anim === 'bite' ? a.animT : a.t, BREEDS[a.breed].tint, a.flash * 0.6, a.down ? a.dis : 0);
        if (!a.down) { _q.identity(); _s.setScalar(a.guardT > 0 ? 1.4 : 1); _p.set(a.x, 0.04, a.z); _m.compose(_p, _q, _s); allyRings.setMatrixAt(ri++, _m); }
      }
      allyHorde.end();
      allyRings.count = ri; allyRings.instanceMatrix.needsUpdate = true;
    }
    // 幽狼
    ghosts.begin();
    for (const g of ghostList) {
      if (g.delay > 0) continue;
      const back = g.ret && g.t > g.life / 2;
      _q.setFromAxisAngle(_up, Math.atan2(g.dx, g.dz) + (back ? Math.PI : 0)); _s.setScalar(0.85); _p.set(g.x, 0.05, g.z);
      _m.compose(_p, _q, _s);
      const a = Math.min(1, g.t / 0.15) * Math.min(1, (g.life - g.t) / 0.25);
      ghosts.push(_m, 'run', g.t * 1.2, [1, 1, 1, a * 0.9], 0, 0);
      ghosts.aTint.setW(ghosts.n - 1, a * 0.9);
    }
    ghosts.end();
    // 魂晶
    const gc = { 1: 0, 5: 0, 25: 0 };
    for (const g of gems) {
      const v = g.val >= 25 ? 25 : g.val >= 5 ? 5 : 1, mesh = gemMeshes[v];
      if (gc[v] >= GEM_MAX) continue;
      const bob = Math.sin(g.t * 3 + g.x) * 0.06;
      _q.setFromAxisAngle(_up, g.t * 2); _s.setScalar(v === 25 ? 1.8 : v === 5 ? 1.3 : 1); _p.set(g.x, 0.32 + bob, g.z);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(gc[v]++, _m);
    }
    for (const v in gemMeshes) { gemMeshes[v].count = gc[v]; gemMeshes[v].instanceMatrix.needsUpdate = true; }
    W.update(dt, S.x, S.z);
    W.setView(S.x, S.z, dt);
    W.render();
  }

  // ---------------- 主迴圈 ----------------
  let raf = 0, last = performance.now(), alive = true, acc = 0;
  function frame(now) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    let dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (S.paused || S.state !== 'play' || S.dead) dt = 0;
    if (dt > 0) {
      acc += dt;
      // 固定步長，避免高速時穿透
      while (acc >= 1 / 60) { step(1 / 60); acc -= 1 / 60; if (S.state !== 'play' || S.dead) { acc = 0; break; } }
    }
    draw(dt || 0);
  }
  W.setView(S.x, S.z, 1);
  onProgress && onProgress(1);

  return {
    S, ST, W,
    start() { last = performance.now(); raf = requestAnimationFrame(frame); },
    setInput(x, z) { input.x = x; input.z = z; },
    howl: () => howl(false),
    setCommand(c) { S.cmd = c; },
    choose(c) { apply(c); S.state = 'play'; if (S.pendingLv) nextLevelUp(); },
    resume() { S.state = 'play'; if (S.pendingLv) nextLevelUp(); },
    pause(v) { S.paused = v; },
    resize(w, h) { W.resize(w, h); },
    // 存檔：只保存成長狀態，場上敵人不保存
    snapshot() { return { mapId, t: S.t, kills: S.kills, lv: S.lv, xp: S.xp, hp: S.hp, weapons: S.weapons.map((w) => ({ id: w.id, lv: w.lv })), passives: { ...S.passives }, ult: S.ult, bossesDone: [...S.bossesDone], revives: S.revives, elitesKilled: S.elitesKilled }; },
    // 頭上血條的螢幕座標
    project(v3) { return v3.project(W.camera); },
    destroy() { alive = false; cancelAnimationFrame(raf); W.dispose(); },
    debug: {
      enemies, spawn, gems, step, items, setT: (t) => (S.t = t), howl, openChest, auto,
      // 本機測試：直接模擬若干秒（背景分頁時 requestAnimationFrame 會被節流）
      sim(sec, autoPick = true) {
        const n = Math.round(sec * 60);
        for (let i = 0; i < n; i++) {
          if (S.state === 'choose' && autoPick) { /* 由外部處理 */ break; }
          if (S.state !== 'play' || S.dead) break;
          step(1 / 60);
          if (i % 3 === 0) draw(1 / 20);
        }
        draw(1 / 60);
        return { t: S.t, state: S.state, hp: S.hp, kills: S.kills, lv: S.lv, enemies: enemies.length };
      },
    },
  };
}
