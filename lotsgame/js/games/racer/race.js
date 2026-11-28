// 一場比賽：場景、車輛、電腦駕駛、圈數與名次、鏡頭、幽靈車
import * as THREE from '../../../vendor/three/three.module.js';
import { buildTrack, glb, HW, EDGE, addMask, SHM } from './track.js';
import { Car } from './car.js';
import { CarSound } from './sound.js';
import * as audio from '../../audio.js';
import { BADGES, STEER_FIX } from './data.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const wrap = (a) => ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;

// ---------------- 電腦駕駛 ----------------
function makeAI(car, track, skill, rnd) {
  const n = track.n, sp = car.spec, mu = sp.grip, VT = new Float32Array(n);
  const vtop = Math.cbrt((2 * sp.power * 1000) / (1.2 * sp.cd * sp.area)) * 0.97;
  for (let i = 0; i < n; i++) {
    const k = Math.abs(track.K[i]) + 1e-5;
    // 有下壓力時可以過得更快（以 40 m/s 估算）
    const dfac = 1 + (sp.down * 1600 * 0.28) / (sp.mass * 9.81);
    VT[i] = Math.min(vtop, Math.sqrt((mu * 9.81 * dfac * 0.93) / k)) * skill;
  }
  const dec = mu * 9.81 * 0.82 * Math.min(1.3, sp.brake);
  for (let pass = 0; pass < 3; pass++) for (let i = n - 1; i >= 0; i--) { const j = (i + 1) % n; VT[i] = Math.min(VT[i], Math.sqrt(VT[j] * VT[j] + 2 * dec * track.STEP)); }
  const ai = { car, skill, VT, avoid: 0, wobble: rnd() * 10, line: (rnd() - 0.5) * 1.2, stuckT: 0 };
  ai.control = (dt, cars, rubber) => {
    const L = car.loc, i = L ? L.i : 0, v = car.speed;
    const la = 6 + v * 0.45, idx = (i + Math.round(la / track.STEP)) % n;
    // 超車：前方有車就換邊
    let want = track.LINE[idx] + ai.line + Math.sin(performance.now() / 1300 + ai.wobble) * (1 - skill) * 2;
    let blocked = 0;
    for (const o of cars) {
      if (o === car || !o.loc) continue;
      let ds = o.s - car.s; if (ds < -track.total / 2) ds += track.total; if (ds > track.total / 2) ds -= track.total;
      if (ds > 0 && ds < 16 && Math.abs(o.loc.off - L.off) < 2.4) { want = o.loc.off + (o.loc.off > 0 ? -3 : 3); blocked = Math.max(blocked, 1 - ds / 16); }
    }
    ai.avoid += (want - ai.avoid) * Math.min(1, dt * 1.5);
    const off = clamp(ai.avoid, -(HW - 1.1), HW - 1.1);
    const [rx, rz] = track.right(idx);
    const tx = track.X[idx] + rx * off, tz = track.Z[idx] + rz * off;
    const des = Math.atan2(tx - car.x, tz - car.z);
    const diff = wrap(des - car.h);
    let steer = clamp(-diff * 2.4 - car.r * 0.12, -1, 1);
    // 目標速度：看前方一段距離內最低者
    let vt = 1e9; for (let k = 0; k < 12; k++) vt = Math.min(vt, ai.VT[(i + k * 2) % n]);
    vt *= rubber;
    if (blocked > 0.6) vt = Math.min(vt, v * 0.995);
    let throttle = v < vt - 0.5 ? 1 : v < vt ? 0.5 : 0;
    let brake = v > vt + 1.2 ? clamp((v - vt) / 6, 0.2, 1) : 0;
    // 卡住就倒退重來
    if (v < 1 && throttle > 0) { ai.stuckT += dt; if (ai.stuckT > 3) { ai.stuckT = 0; ai.respawn = true; } } else ai.stuckT = 0;
    return { steer, throttle, brake };
  };
  return ai;
}

export async function createRace(canvas, opts) {
  const { track: def, mobile } = opts;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = def.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 5000);
  const progress = (f) => opts.onProgress && opts.onProgress(f);

  const T = await buildTrack(def, renderer, scene, { mobile, onProgress: (f) => progress(f * 0.7) });
  const hemi = new THREE.HemisphereLight(0xcfe0ff, 0x3a3226, 0.06); scene.add(hemi);
  const sun = new THREE.DirectionalLight(def.sun, def.sunI);
  sun.castShadow = true;
  const SH = mobile ? 1024 : 2048;
  sun.shadow.mapSize.set(SH, SH);
  Object.assign(sun.shadow.camera, { left: -38, right: 38, top: 38, bottom: -38, near: 1, far: 260 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);

  // ---------------- 車輛 ----------------
  const mkCar = async (c, lod, o = {}) => { const g = await glb(`cars/${c.model}${lod ? '_lod' : ''}.glb`); return new Car(c.spec, g.scene, { ...o, erase: BADGES[c.model + (lod ? '_lod' : '')], steerFix: lod ? null : STEER_FIX[c.model] }); };
  const player = await mkCar(opts.player, false);
  player.name = '你'; player.isPlayer = true;
  progress(0.8);
  const cars = [player];
  const AIs = [];
  const rnd = (() => { let a = 99; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; })();
  for (const o of opts.opponents) {
    const c = await mkCar(o, true, { paint: o.paint });
    c.name = o.name;
    cars.push(c);
    AIs.push(makeAI(c, T, o.skill, rnd));
  }
  progress(0.92);
  // 起跑格：玩家排在最後（計時賽單獨在最前）
  const order = cars.slice(1).concat([player]);
  order.forEach((c, k) => { const g = T.gridSlot(k); c.place(g.x, g.z, g.h, T); scene.add(c.root); c.updateVisual(0.1, T); });
  // 車也吃烘焙的地形陰影（開進山影裡會變暗）
  for (const c of cars) c.root.traverse((o) => { if (o.isMesh) addMask(o.material, SHM, { trees: false }); });
  for (const c of cars) Object.assign(c, { lap: 0, half: true, lapStart: 0, laps: [], finishT: null, best: null });
  // 幽靈車（計時賽的個人最佳圈）
  let ghost = null;
  if (opts.ghost && opts.ghost.frames && opts.ghost.frames.length > 10) { ghost = await mkCar(opts.player, true, { ghost: true }); scene.add(ghost.root); ghost.root.visible = false; }

  // 駕駛視角：方向盤後上方
  const eye = new THREE.Vector3();
  {
    const st = player.steerObj;
    if (opts.player.eye) eye.fromArray(opts.player.eye);
    else if (st) { player.root.updateMatrixWorld(true); const p = st.getWorldPosition(new THREE.Vector3()); player.body.worldToLocal(p); eye.set(p.x, p.y + 0.22, p.z - 0.56); }
    else eye.set(0.36, 1.05, -0.3);
  }
  const head = new THREE.Object3D(); head.position.copy(eye); player.body.add(head);
  let view = opts.view || 'cockpit';

  // ---------------- 狀態 ----------------
  const S = { t: 0, state: 'count', count: 3.4, paused: false, laps: opts.laps || 0, trial: !opts.opponents.length, finished: false, wrongT: 0, msg: '', shake: 0, results: null, best: opts.bestLap || null };
  const input = { steer: 0, throttle: 0, brake: 0 };
  const sound = new CarSound();
  player.onHit = (vn) => { S.shake = Math.min(1, vn / 12); audio.play('hitm', { volume: Math.min(0.7, vn / 20), rate: 0.55 }); };
  let ghostRec = [], ghostT = 0;

  function lapLogic(c, now) {
    const tot = T.total;
    if (c.s > tot * 0.42 && c.s < tot * 0.58) c.half = true;
    if (c.prevS != null && c.prevS > tot * 0.8 && c.s < tot * 0.2 && c.half) {
      c.half = false;
      if (c.lap > 0) {
        const lt = now - c.lapStart;
        c.laps.push(lt);
        if (!c.best || lt < c.best) c.best = lt;
        if (c.isPlayer) {
          const pb = !S.best || lt < S.best;
          if (pb) S.best = lt;
          opts.onEvent && opts.onEvent('lap', { time: lt, lap: c.lap, pb, ghost: pb ? ghostRec : null });
        }
      }
      c.lap++;
      c.lapStart = now;
      if (c.isPlayer) { ghostRec = []; ghostT = 0; if (ghost) ghost.lapT0 = now; }
      if (S.laps && c.lap > S.laps && c.finishT == null) { c.finishT = now; if (c.isPlayer) finishRace(); }
    }
    c.prevS = c.s;
  }
  const progressOf = (c) => (c.finishT != null ? 1e9 - c.finishT : c.lap * T.total + (c.lap === 0 ? c.s - T.total : c.s));
  function positions() { return cars.slice().sort((a, b) => progressOf(b) - progressOf(a)); }
  function finishRace() {
    if (S.finished) return;
    S.finished = true;
    // 尚未完賽的電腦車以目前平均速度推算完賽時間
    const res = cars.map((c) => {
      let time = c.finishT;
      if (time == null) { const remain = (S.laps + 1) * T.total - progressOf(c) - T.total; const avg = Math.max(15, progressOf(c) / Math.max(1, S.t)); time = S.t + Math.max(0, remain) / avg; }
      return { name: c.name, car: c.spec.name, time, isPlayer: !!c.isPlayer, best: c.best };
    }).sort((a, b) => a.time - b.time);
    S.results = res;
    setTimeout(() => opts.onEvent && opts.onEvent('finish', { results: res, pos: res.findIndex((r) => r.isPlayer) + 1 }), 1800);
  }
  function respawn(c) {
    const i = c.loc ? c.loc.i : 0;
    const j = (i + 3) % T.n;
    const off = clamp(c.loc ? c.loc.off : 0, -2.5, 2.5) * 0.5;
    const [rx, rz] = T.right(j);
    const lap = c.lap, half = c.half, ls = c.lapStart, laps = c.laps, best = c.best, prevS = c.prevS;
    c.place(T.X[j] + rx * off, T.Z[j] + rz * off, Math.atan2(T.TX[j], T.TZ[j]), T);
    Object.assign(c, { lap, half, lapStart: ls, laps, best, prevS });
  }

  // 車與車碰撞：每台車用前後兩個圓近似
  function collide() {
    for (let a = 0; a < cars.length; a++) for (let b = a + 1; b < cars.length; b++) {
      const A = cars[a], B = cars[b];
      if (Math.abs(A.x - B.x) > 6 || Math.abs(A.z - B.z) > 6) continue;
      for (const ka of [1.1, -1.1]) for (const kb of [1.1, -1.1]) {
        const ax = A.x + Math.sin(A.h) * ka, az = A.z + Math.cos(A.h) * ka, bx = B.x + Math.sin(B.h) * kb, bz = B.z + Math.cos(B.h) * kb;
        const dx = bx - ax, dz = bz - az, d = Math.hypot(dx, dz), R = 1.9;
        if (d >= R || d < 1e-4) continue;
        const nx = dx / d, nz = dz / d, ov = (R - d) / 2;
        A.x -= nx * ov; A.z -= nz * ov; B.x += nx * ov; B.z += nz * ov;
        const rv = (B.vx - A.vx) * nx + (B.vz - A.vz) * nz;
        if (rv < 0) {
          const mA = A.spec.mass, mB = B.spec.mass, j = (-(1.25) * rv) / (1 / mA + 1 / mB);
          A.vx -= (j / mA) * nx; A.vz -= (j / mA) * nz; B.vx += (j / mB) * nx; B.vz += (j / mB) * nz;
          A.r += (Math.random() - 0.5) * 0.3; B.r += (Math.random() - 0.5) * 0.3;
          if ((A.isPlayer || B.isPlayer) && -rv > 2) { S.shake = Math.min(1, -rv / 10); audio.play('hitm', { volume: Math.min(0.6, -rv / 15), rate: 0.7 }); }
        }
      }
    }
  }

  // ---------------- 每格 ----------------
  const DT = 1 / 120;
  let acc = 0, last = performance.now(), raf = 0, alive = true;
  function step(dt) {
    if (S.state === 'count') {
      S.count -= dt;
      if (S.count <= 0) { S.state = 'race'; S.t = 0; opts.onEvent && opts.onEvent('go', {}); }
      // 倒數時可以踩油門拉轉，但車不動
      player.rpm += ((player.spec.idle + (player.spec.redline * 0.7 - player.spec.idle) * input.throttle) - player.rpm) * Math.min(1, dt * 6);
      return;
    }
    S.t += dt;
    const lead = positions()[0];
    for (const c of cars) {
      let inp;
      if (c.isPlayer) inp = S.finished ? { steer: 0, throttle: 0, brake: 0.4 } : S.auto ? (S.autoAI || (S.autoAI = makeAI(player, T, 0.95, rnd))).control(dt, cars, 1) : input;
      else {
        const ai = AIs.find((x) => x.car === c);
        // 輕微的跟車效果：落後玩家太多就稍微加速，太前面就稍微收油
        let rubber = 1;
        if (!S.trial) { let gap = progressOf(player) - progressOf(c); rubber = 1 + clamp(gap / 900, -0.035, 0.03); }
        inp = c.finishT != null ? { steer: 0, throttle: 0.3, brake: 0 } : ai.control(dt, cars, rubber);
        if (ai.respawn) { ai.respawn = false; respawn(c); }
      }
      c.step(dt, inp, T, opts.assist !== false || !c.isPlayer);
      lapLogic(c, S.t);
    }
    collide();
    // 倒車、逆向偵測
    const tdir = Math.atan2(T.TX[player.loc.i], T.TZ[player.loc.i]);
    if (Math.abs(wrap(player.h - tdir)) > 2.1 && player.speed > 3) S.wrongT += dt; else S.wrongT = 0;
    // 幽靈車錄影（每 0.05 秒）
    ghostT += dt;
    if (ghostT >= 0.05) { ghostT -= 0.05; ghostRec.push([+player.x.toFixed(2), +player.y.toFixed(2), +player.z.toFixed(2), +player.h.toFixed(3)]); }
  }

  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), tmp = new THREE.Vector3();
  let fovNow = 62, headYaw = 0;
  const qHead = new THREE.Quaternion(), eHead = new THREE.Euler(), zAxis = new THREE.Vector3(0, 0, 1);
  function draw(dt) {
    for (const c of cars) c.updateVisual(dt, T);
    // 幽靈車
    if (ghost) {
      const f = opts.ghost.frames, k = ((S.t - (ghost.lapT0 ?? 1e9)) / 0.05);
      if (player.lap >= 1 && k >= 0 && k < f.length - 1) {
        const i = Math.floor(k), u = k - i, a = f[i], b = f[i + 1];
        ghost.root.visible = true;
        ghost.root.position.set(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u);
        ghost.root.rotation.y = a[3] + wrap(b[3] - a[3]) * u;
        // 太靠近時淡出，免得擋住車內視線
        const gd = Math.hypot(ghost.root.position.x - player.x, ghost.root.position.z - player.z), op = 0.3 * clamp((gd - 3) / 7, 0, 1);
        if (op <= 0.01) ghost.root.visible = false; else if (op !== ghost.op) { ghost.op = op; ghost.root.traverse((o) => { if (o.isMesh) o.material.opacity = op; }); }
      } else ghost.root.visible = false;
    }
    // 鏡頭
    const v = player.speed;
    if (S.shake > 0) S.shake = Math.max(0, S.shake - dt * 2.5);
    const shk = S.shake * S.shake * 0.05 + Math.min(1, v / 70) * 0.0025 * (player.offroad ? 6 : 1);
    if (view === 'cockpit') {
      headYaw += (clamp(player.delta * 1.2 + player.r * 0.1, -0.35, 0.35) - headYaw) * Math.min(1, dt * 4); // 往彎心看
      // 鏡頭固定在車內：跟著車身的俯仰與側傾，視線隨方向盤略轉向彎心
      head.getWorldPosition(camPos);
      camera.position.copy(camPos).add(tmp.set((Math.random() - 0.5) * shk, (Math.random() - 0.5) * shk, 0));
      player.body.getWorldQuaternion(camera.quaternion);
      camera.quaternion.multiply(qHead.setFromEuler(eHead.set(camera.aspect < 0.8 ? -0.01 : -0.06, Math.PI + headYaw, 0, 'YXZ')));
      // 車身的側傾只傳一半給頭部（人會本能地保持水平）
      camera.quaternion.multiply(qHead.setFromAxisAngle(zAxis, player.roll * 0.5));
      // 直向螢幕水平視野太窄：加大垂直視野
      const fb = camera.aspect < 0.8 ? 76 : camera.aspect < 1.2 ? 66 : 60;
      fovNow += (fb + Math.min(14, v * 0.17) - fovNow) * Math.min(1, dt * 2);
    } else {
      const back = 6.2, up = 2.1, sh = Math.sin(player.h), ch = Math.cos(player.h);
      tmp.set(player.x - sh * back, player.y + up, player.z - ch * back);
      camPos.lerp(tmp, Math.min(1, dt * 7));
      const gy = T.heightAt(camPos.x, camPos.z, null) + 0.6; if (camPos.y < gy) camPos.y = gy;
      camera.position.copy(camPos).add(tmp.set((Math.random() - 0.5) * shk * 3, (Math.random() - 0.5) * shk * 3, 0));
      camera.up.set(0, 1, 0);
      camLook.set(player.x + sh * 4, player.y + 1.0, player.z + ch * 4);
      camera.lookAt(camLook);
      fovNow += ((camera.aspect < 0.8 ? 72 : 58) + Math.min(16, v * 0.2) - fovNow) * Math.min(1, dt * 2);
    }
    camera.fov = fovNow; camera.updateProjectionMatrix();
    // 陰影相機跟著玩家（對齊貼圖像素避免閃爍）
    const texel = 76 / sun.shadow.mapSize.x, cx = Math.round(player.x / texel) * texel, cz = Math.round(player.z / texel) * texel;
    sun.target.position.set(cx, player.y, cz);
    sun.position.set(cx + T.sunDir.x * 120, player.y + T.sunDir.y * 120, cz + T.sunDir.z * 120);
    if (T.water) { const nm = T.water.material.normalMap; nm.offset.x = (S.t * 0.004) % 1; nm.offset.y = (S.t * 0.0025) % 1; }
    camera.updateMatrixWorld();
    T.update(camera, performance.now() / 1000, sun.target.position, 36);
    renderer.render(scene, camera);
    // 音效
    let near = null; for (const c of cars) { if (c === player) continue; const d = Math.hypot(c.x - player.x, c.z - player.z); if (!near || d < near.dist) near = { rpm: c.rpm, dist: d }; }
    sound.update(player, S.state === 'race' && !S.finished ? input.throttle : S.state === 'count' ? input.throttle : 0, player.offroad, near);
  }
  function frame(now) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    let dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (S.paused) dt = 0;
    acc += dt;
    while (acc >= DT) { step(DT); acc -= DT; }
    draw(dt);
    opts.onHud && opts.onHud(hud());
  }
  function hud() {
    const pos = positions();
    return {
      speed: player.speed * 3.6, gear: player.gear, rpm: player.rpm, redline: player.spec.redline, state: S.state, count: S.count,
      lap: Math.max(1, Math.min(player.lap, S.laps || player.lap)), laps: S.laps, pos: pos.indexOf(player) + 1, n: cars.length,
      t: S.t, lapT: player.finishT != null ? player.laps[player.laps.length - 1] : player.lap >= 1 ? S.t - player.lapStart : 0, best: S.best, last: player.laps[player.laps.length - 1] || null,
      wrong: S.wrongT > 1.2, offroad: player.offroad, finished: S.finished,
      dots: cars.map((c) => [c.x, c.z, c.isPlayer]),
    };
  }
  function resize(w, h) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }

  return {
    S, T, player, cars,
    start() { last = performance.now(); raf = requestAnimationFrame(frame); sound.resume(); },
    setInput(i) { Object.assign(input, i); },
    setView(v) { view = v; },
    get view() { return view; },
    pause(v) { S.paused = v; sound.mute(v); },
    reset() { if (S.state === 'race' && !S.finished) respawn(player); },
    resize,
    destroy() { alive = false; cancelAnimationFrame(raf); sound.close(); scene.traverse((o) => { if (o.geometry) o.geometry.dispose?.(); }); renderer.dispose(); renderer.forceContextLoss?.(); },
    debug: { renderer, scene, sun, hemi, camera, step, draw, AIs, sim(sec) { const k = Math.round(sec / DT); for (let i = 0; i < k; i++) step(DT); draw(1 / 60); return hud(); } },
  };
}
