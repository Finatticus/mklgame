// 車輛：物理（單車模型＋前後載重轉移＋輪胎飽和＋摩擦圓＋引擎扭力曲線與自排）與畫面（車輪、方向盤、車身姿態）
// 座標：航向 h，前方 F = (sin h, cos h)，左方 Lf = (cos h, −sin h)；橫擺角速度 r 與舵角 δ 都以向左為正。
import * as THREE from '../../../vendor/three/three.module.js';
import { clone as cloneScene } from '../../../vendor/three/SkeletonUtils.js';
import { EDGE } from './track.js';

const G = 9.81;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const tireCurve = (a) => Math.sin(1.5 * Math.atan(7.2 * a)); // 側滑角 → 側向力比例（約 7 度達到最大，之後略降）

// 去除廠徽與車名字樣：刪掉完全落在指定方塊內的三角形（方塊為車身座標 [mesh 名稱規則, [x0,y0,z0], [x1,y1,z1]]）
// 幾何在各台車之間共用，只處理一次
function eraseBadges(body, boxes) {
  body.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  body.traverse((o) => {
    if (!o.isMesh || o.geometry.userData.erased) return;
    const mine = boxes.filter(([re]) => new RegExp(re).test(o.name));
    if (!mine.length) return;
    const g = o.geometry, P = g.attributes.position;
    if (!g.index) g.setIndex([...Array(P.count).keys()]);
    const I = g.index.array, keep = [];
    const inside = (k) => { v.fromBufferAttribute(P, k).applyMatrix4(o.matrixWorld); return mine.some(([, a, b]) => v.x >= a[0] && v.x <= b[0] && v.y >= a[1] && v.y <= b[1] && v.z >= a[2] && v.z <= b[2]); };
    for (let t = 0; t < I.length; t += 3) if (!(inside(I[t]) && inside(I[t + 1]) && inside(I[t + 2]))) keep.push(I[t], I[t + 1], I[t + 2]);
    g.setIndex(keep);
    g.userData.erased = true;
  });
}

// 方向盤和內裝合成同一個 mesh 的車：把盤面範圍內的三角形切出來成為可轉動的方向盤
// fix：{ mesh, c: 盤心（車身座標）, n: 轉軸, r: 半徑, t: 厚度 }
function splitSteer(body, fix) {
  body.updateMatrixWorld(true);
  let src = null; body.traverse((o) => { if (o.isMesh && o.name === fix.mesh) src = o; });
  if (!src) return null;
  const g = src.geometry;
  if (!g.userData.steerGeo) {
    const M = new THREE.Matrix4().copy(body.matrixWorld).invert().multiply(src.matrixWorld), NM = new THREE.Matrix3().getNormalMatrix(M);
    const c = new THREE.Vector3(...fix.c), n = new THREE.Vector3(...fix.n).normalize(), v = new THREE.Vector3(), w = new THREE.Vector3();
    const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
    const inside = (k) => { v.fromBufferAttribute(P, k).applyMatrix4(M).sub(c); const a = v.dot(n); return Math.abs(a) < fix.t && w.copy(v).addScaledVector(n, -a).length() < fix.r; };
    if (!g.index) g.setIndex([...Array(P.count).keys()]);
    const I = g.index.array, keep = [], pos = [], nor = [], uv = [];
    for (let t = 0; t < I.length; t += 3) {
      if (inside(I[t]) && inside(I[t + 1]) && inside(I[t + 2])) {
        for (let j = 0; j < 3; j++) {
          const k = I[t + j];
          v.fromBufferAttribute(P, k).applyMatrix4(M).sub(c); pos.push(v.x, v.y, v.z);
          if (N) { w.fromBufferAttribute(N, k).applyMatrix3(NM).normalize(); nor.push(w.x, w.y, w.z); }
          if (U) uv.push(U.getX(k), U.getY(k));
        }
      } else keep.push(I[t], I[t + 1], I[t + 2]);
    }
    g.setIndex(keep);
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    if (N) sg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    if (U) sg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.userData.steerGeo = sg;
  }
  const grp = new THREE.Group(); grp.name = 'steer'; grp.position.fromArray(fix.c); grp.userData.axis = fix.n;
  const mesh = new THREE.Mesh(g.userData.steerGeo, src.material); mesh.castShadow = src.castShadow; mesh.receiveShadow = src.receiveShadow;
  grp.add(mesh); body.add(grp);
  return grp;
}

export class Car {
  constructor(spec, model, { ghost = false, paint = null, erase = null, steerFix = null } = {}) {
    this.spec = spec;
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);
    const m = cloneScene(model);
    this.model = m;
    this.body.add(m);
    this.wheels = {};
    m.traverse((o) => {
      if (o.name && o.name.startsWith('wheel_')) this.wheels[o.name.slice(6)] = o;
      if (o.name === 'steer') this.steerObj = o;
      if (o.isMesh) {
        o.castShadow = !ghost; o.receiveShadow = !ghost;
        if (ghost) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.3; o.material.depthWrite = false; }
        else if (paint && /paint|carpaint|body_color|^body|primary|kit_color|solid/i.test(o.material.name || '')) { o.material = o.material.clone(); o.material.color.multiply(new THREE.Color(paint)); }
      }
    });
    const W = ['LF', 'RF', 'LR', 'RR'].map((k) => this.wheels[k]).filter(Boolean);
    if (W.length === 4) {
      const fz = (this.wheels.LF.position.z + this.wheels.RF.position.z) / 2, rz = (this.wheels.LR.position.z + this.wheels.RR.position.z) / 2;
      this.wheelbase = clamp(fz - rz, 2.1, 3.2);
      this.radius = W.reduce((a, w) => a + (w.userData.radius || 0.32), 0) / 4;
      const bottom = Math.min(...W.map((w) => w.position.y - (w.userData.radius || 0.32)));
      m.position.set(0, -bottom, -(fz + rz) / 2); // 兩軸中點為原點，輪胎貼地
    } else { this.wheelbase = 2.65; this.radius = 0.32; }
    if (erase) eraseBadges(this.body, erase);
    if (!this.steerObj && steerFix && !ghost) this.steerObj = splitSteer(this.body, steerFix);
    if (this.steerObj) { const a = this.steerObj.userData.axis || [0, 0.35, -0.94]; this.steerAxis = new THREE.Vector3(...a).normalize(); this.steerQ0 = this.steerObj.quaternion.clone(); }
    Object.assign(this, { x: 0, y: 0, z: 0, h: 0, vx: 0, vz: 0, r: 0, delta: 0, gear: 1, rpm: spec.idle, shiftT: 0, spin: 0, pitch: 0, roll: 0, ax: 0, ay: 0, slip: 0, wheelspin: 0, offroad: false, loc: null, s: 0, hitT: 0, drift: false, driftDir: 0, driftScore: 0, driftT: 0, hbT: 0 });
    this.L = this.wheelbase;
    this.a = this.L * (1 - spec.lead); // 重心到前軸
    this.b = this.L * spec.lead; // 重心到後軸
    this.hcg = 0.47;
    this.Iz = spec.mass * (this.a * this.a + this.b * this.b) * 0.6;
    const wPeak = (spec.redline * 0.86 * Math.PI * 2) / 60;
    this.Tmax = (spec.power * 1000) / wPeak / this.torqueShape(0.86);
  }
  torqueShape(rn) { return clamp(0.6 + 0.62 * rn - 0.36 * rn * rn, 0.3, 1); }
  get speed() { return Math.hypot(this.vx, this.vz); }
  get forwardSpeed() { return this.vx * Math.sin(this.h) + this.vz * Math.cos(this.h); }
  place(x, z, h, track) {
    Object.assign(this, { x, z, h, vx: 0, vz: 0, r: 0, delta: 0, gear: 1, ax: 0, ay: 0, drift: false, hbT: 0 });
    this.loc = track.locate(x, z, null);
    this.y = track.heightAt(x, z, this.loc);
    this.s = this.loc.s;
  }

  // input：{ steer −1..1（向右為正）, throttle 0..1, brake 0..1 }；assist：駕駛輔助（循跡、穩定、隨速轉向）
  step(dt, input, track, assist = true) {
    const sp = this.spec, m = sp.mass;
    const sh = Math.sin(this.h), ch = Math.cos(this.h);
    const vf = this.vx * sh + this.vz * ch; // 前進速度
    const vl = this.vx * ch - this.vz * sh; // 向左速度
    const v = Math.hypot(vf, vl);
    // 轉向（高速時自動縮小舵角）
    const maxSteer = THREE.MathUtils.degToRad(sp.steer) / (1 + Math.max(0, v - 6) / (assist ? 20 : 36));
    const hb = input.handbrake ? 1 : 0;
    const beta0 = v > 2 ? Math.atan2(vl, Math.abs(vf)) : 0; // 車身與行進方向的夾角（向左為正）
    // 甩尾中：前輪自動回正到行進方向（反打），玩家的方向只做微調
    const target = this.drift ? clamp(beta0 * 0.9 - clamp(input.steer, -1, 1) * 0.12, -0.6, 0.6) : -clamp(input.steer, -1, 1) * maxSteer;
    const rate = this.drift ? 4 : 3.4 * maxSteer + 0.5;
    this.delta += clamp(target - this.delta, -rate * dt, rate * dt);
    const L = (this.loc = track.locate(this.x, this.z, this.loc ? this.loc.i : null));
    this.offroad = Math.abs(L.off) > EDGE + 0.15;
    const mu = sp.grip * (this.offroad ? 0.6 : 1);
    // 載重：靜態分配＋下壓力＋加減速轉移
    const Wt = m * G + sp.down * v * v * 0.28;
    const Fzf = Math.max(Wt * 0.15, Wt * this.b / this.L - m * this.ax * this.hcg / this.L);
    const Fzr = Math.max(Wt * 0.15, Wt * this.a / this.L + m * this.ax * this.hcg / this.L);
    // 引擎轉速與自排
    const wheelRpm = (Math.abs(vf) / this.radius) * 60 / (Math.PI * 2);
    if (this.shiftT > 0) this.shiftT -= dt;
    const ratio = (g) => sp.gears[g - 1] * sp.final;
    if (this.shiftT <= 0) {
      if (wheelRpm * ratio(this.gear) > sp.redline * 0.95 && this.gear < sp.gears.length && input.throttle > 0.2) { this.gear++; this.shiftT = 0.2; }
      else if (this.gear > 1 && wheelRpm * ratio(this.gear - 1) < sp.redline * (input.brake > 0.1 ? 0.8 : 0.6)) { this.gear--; this.shiftT = 0.15; }
    }
    let rpm = Math.max(sp.idle, wheelRpm * ratio(this.gear));
    if (Math.abs(vf) < 4 && input.throttle > 0.1) rpm = Math.max(rpm, sp.idle + (sp.redline * 0.5 - sp.idle) * input.throttle); // 起步半離合
    rpm = Math.min(rpm, sp.redline * 1.03);
    this.rpm += (rpm - this.rpm) * Math.min(1, dt * 14);
    const thr = this.shiftT > 0 ? 0 : input.throttle;
    let Fdrive = thr * this.Tmax * this.torqueShape(this.rpm / sp.redline) * ratio(this.gear) * 0.88 / this.radius;
    if (this.rpm >= sp.redline) Fdrive *= 0.25;
    if (vf < -0.5) Fdrive = 0;
    // 側滑角與側向力（向左為正）
    const low = Math.abs(vf) < 2.5;
    let Fyf = 0, Fyr = 0, af = 0, ar = 0;
    if (!low) {
      af = Math.atan2(vl + this.r * this.a, Math.abs(vf)) - this.delta * Math.sign(vf);
      ar = Math.atan2(vl - this.r * this.b, Math.abs(vf));
      Fyf = -mu * Fzf * tireCurve(af);
      Fyr = -mu * Fzr * tireCurve(ar);
      if (hb) Fyr *= 0.32; // 手煞車鎖死後輪，後輪抓地力大減
    }
    // 驅動力分配與摩擦圓（循跡控制）
    const fr = sp.drive === 'F' ? 1 : sp.drive === 'A' ? 0.42 : 0;
    let FxF = Fdrive * fr, FxR = Fdrive * (1 - fr) * (1 - hb);
    // 後驅車全油門大轉向：讓後輪打滑甩尾（循跡控制放手）
    const power = this.isPlayer && assist && fr < 1 && thr > 0.8 && Math.abs(input.steer) > 0.85 && v > 14 && !low;
    const capF = Math.sqrt(Math.max(0, (mu * Fzf) ** 2 - Fyf * Fyf)), capR = Math.sqrt(Math.max(0, (mu * Fzr) ** 2 - Fyr * Fyr));
    this.wheelspin = 0;
    if (FxR > capR) { this.wheelspin = Math.min(1, (FxR - capR) / (capR + 500)); if (assist && !power) FxR = capR; else { FxR = capR * 0.92; Fyr *= 0.6; } }
    if (FxF > capF) { this.wheelspin = Math.max(this.wheelspin, Math.min(1, (FxF - capF) / (capF + 500))); FxF = capF; Fyf *= assist ? 1 : 0.8; }
    // 煞車（ABS）
    const Fb = input.brake * m * G * 1.08 * sp.brake;
    const sgn = Math.sign(vf);
    const Bf = Math.min(Fb * 0.62, mu * Fzf), Br = Math.min(Fb * 0.38 + hb * mu * Fzr * 0.7, mu * Fzr);
    // 阻力
    const drag = 0.5 * 1.2 * sp.cd * sp.area * v * v, roll = (this.offroad ? 0.08 : 0.013) * m * G;
    const cd = Math.cos(this.delta), sd = Math.sin(this.delta);
    const Fx = FxF * cd + FxR - (Bf + Br + drag + roll) * sgn - Fyf * sd;
    const Fy = Fyf * cd + Fyr + FxF * sd;
    let Mz = this.a * (Fyf * cd + FxF * sd) - this.b * Fyr;
    // 世界座標加速度：前方 (sh, ch)、左方 (ch, −sh)
    const axL = Fx / m, ayL = Fy / m;
    this.vx += (sh * axL + ch * ayL) * dt;
    this.vz += (ch * axL - sh * ayL) * dt;
    if (low) {
      if (this.drift) this.endDrift();
      // 低速：運動學轉向，側向速度收斂
      const rT = vf * Math.tan(this.delta) / this.L;
      this.r += (rT - this.r) * Math.min(1, dt * 10);
      const vf2 = this.vx * sh + this.vz * ch, vl2 = (this.vx * ch - this.vz * sh) * Math.max(0, 1 - dt * 10);
      this.vx = sh * vf2 + ch * vl2; this.vz = ch * vf2 - sh * vl2;
      if (Math.abs(vf2) < 0.4 && input.brake > 0.05 && thr < 0.05) { this.vx = this.vz = 0; }
    } else {
      if (!this.drift) this.r += (Mz / this.Iz) * dt; // 飄移中由輔助接手車身轉動
      if (assist && !this.drift && !hb && !power && this.hbT <= 0) { // 穩定輔助：側滑角太大時拉回
        const beta = Math.atan2(vl, Math.abs(vf));
        if (Math.abs(beta) > 0.12) { const k = Math.min(1, (Math.abs(beta) - 0.12) * 3) * dt * 5; this.r -= Math.sign(this.r) * Math.min(Math.abs(this.r), Math.abs(this.r) * k); }
      }
      if (assist && this.isPlayer) this.driftAssist(dt, input, thr, hb, power, v, Fdrive, drag + roll, mu);
    }
    if (input.brake > 0.05 && thr < 0.05 && vf < 0.3) { const vf2 = this.vx * sh + this.vz * ch; if (vf2 < 0) { this.vx -= sh * vf2; this.vz -= ch * vf2; } } // 不倒車
    this.h += this.r * dt;
    this.ax += (axL - this.ax) * Math.min(1, dt * 8);
    this.ay += (ayL - this.ay) * Math.min(1, dt * 8);
    this.slip = (v > 6 ? Math.max(Math.abs(af), Math.abs(ar)) : 0) + this.wheelspin * 0.2 + (this.drift ? 0.25 : 0) + hb * (v > 6 ? 0.2 : 0);
    this.x += this.vx * dt; this.z += this.vz * dt;
    // 邊界：護欄、岩壁、出界
    const L2 = (this.loc = track.locate(this.x, this.z, L.i));
    const lim = track.LIM[L2.off > 0 ? 1 : 0][L2.base];
    if (Math.abs(L2.off) > lim) {
      const [rx, rz] = track.right(L2.base), sg = L2.off > 0 ? 1 : -1, over = Math.abs(L2.off) - lim;
      this.x -= rx * sg * over; this.z -= rz * sg * over;
      const vn = (this.vx * rx + this.vz * rz) * sg;
      if (vn > 0) {
        this.vx -= rx * sg * vn * 1.25; this.vz -= rz * sg * vn * 1.25;
        this.vx *= 0.95; this.vz *= 0.95; this.r *= 0.5;
        if (vn > 2.5 && this.hitT <= 0) { this.hitT = 0.4; this.onHit && this.onHit(vn); }
        if (vn > 4) { this.driftScore = 0; this.endDrift(); } // 撞牆：這次甩尾不算分
      }
      this.loc = track.locate(this.x, this.z, L2.i);
    }
    if (this.hitT > 0) this.hitT -= dt;
    const gy = track.heightAt(this.x, this.z, this.loc);
    this.y += (gy - this.y) * Math.min(1, dt * 30);
    this.s = this.loc.s;
  }

  // 甩尾輔助（只在駕駛輔助開啟時）：進入甩尾後由這裡接手車身角度與行進路線
  // 油門加大角度、方向往彎內加大、反打或收油就回正；速度損失有上限，才甩得出一整個彎
  driftAssist(dt, input, thr, hb, power, v0, Fdrive, resist, mu) {
    const sh = Math.sin(this.h), ch = Math.cos(this.h);
    const vf = this.vx * sh + this.vz * ch, vl = this.vx * ch - this.vz * sh, v = Math.hypot(vf, vl);
    const beta = Math.atan2(vl, Math.max(0.1, Math.abs(vf)));
    if (hb) this.hbT = 0.7; else if (this.hbT > 0) this.hbT -= dt;
    if (!this.drift) {
      if (v > 9 && Math.abs(beta) > 0.14 && (hb || this.hbT > 0 || power)) { this.drift = true; this.driftDir = Math.sign(beta); this.driftScore = 0; this.driftT = 0; }
      else return;
    }
    const d = this.driftDir, into = clamp(input.steer * d, -1, 1);
    const fwd = this.spec.drive === 'F';
    let bt = (fwd ? 0.3 : 0.36) + (fwd ? 0.06 : 0.2) * thr + 0.08 * into + 0.12 * hb;
    if (into < -0.5 && thr < 0.3) bt = 0; // 反打又收油：回正出彎
    bt = d * clamp(bt, 0, 0.62);
    // 速度：油門維持、收油與煞車掉速
    const brake = input.brake || 0;
    const acc = thr * (Fdrive / this.spec.mass) * 0.45 - resist / this.spec.mass - (1 - thr) * 1.6 - brake * 7 - 0.6 - hb * 2;
    const vn = Math.max(0, v0 + acc * dt);
    // 行進路線：往彎內持續轉向（方向越往內轉越急）
    const lat = mu * 9.81 * (0.2 + 0.82 * clamp((into + 1) / 2, 0, 1)) * (fwd ? 0.92 : 1); // 反打：路線變直；往內打：路線變急
    const psi = Math.atan2(this.vx, this.vz) - d * (lat / Math.max(vn, 8)) * dt;
    this.vx = Math.sin(psi) * vn; this.vz = Math.cos(psi) * vn;
    // 車身角度：追蹤目標甩尾角
    const pathRate = -d * lat / Math.max(vn, 8);
    const rDes = pathRate + 3.2 * (beta - bt);
    this.r += (rDes - this.r) * Math.min(1, dt * 14);
    this.driftT += dt;
    this.driftScore += vn * Math.abs(beta) * dt * 14;
    if (vn < 8 || (Math.abs(bt) < 0.02 && Math.abs(beta) < 0.08) || Math.abs(beta) > 1.2) this.endDrift();
  }
  endDrift() {
    if (!this.drift) return;
    this.drift = false;
    if (this.driftT > 0.8 && this.driftScore > 50 && this.onDrift) this.onDrift(Math.round(this.driftScore), this.driftT);
  }

  updateVisual(dt, track) {
    const sh = Math.sin(this.h), ch = Math.cos(this.h);
    const hf = track.heightAt(this.x + sh * this.a, this.z + ch * this.a, this.loc), hr = track.heightAt(this.x - sh * this.b, this.z - ch * this.b, this.loc);
    const hl = track.heightAt(this.x + ch * 0.8, this.z - sh * 0.8, this.loc), hq = track.heightAt(this.x - ch * 0.8, this.z + sh * 0.8, this.loc);
    // 加速抬頭、煞車點頭；左轉時車身向右側傾（左側抬高）
    const tp = Math.atan2(hf - hr, this.L) + clamp(this.ax * 0.005, -0.04, 0.035);
    const tr = Math.atan2(hl - hq, 1.6) + clamp(this.ay * 0.0065, -0.055, 0.055);
    this.pitch += (tp - this.pitch) * Math.min(1, dt * 8);
    this.roll += (tr - this.roll) * Math.min(1, dt * 8);
    this.root.position.set(this.x, this.y, this.z);
    this.root.rotation.set(0, this.h, 0);
    this.body.rotation.set(-this.pitch, 0, this.roll, 'YXZ');
    this.spin += (this.forwardSpeed / this.radius) * dt * (1 + this.wheelspin * 0.8);
    for (const k in this.wheels) this.wheels[k].rotation.set(this.spin, k[1] === 'F' ? this.delta : 0, 0, 'YXZ');
    if (this.steerObj) this.steerObj.quaternion.copy(this.steerQ0).premultiply(new THREE.Quaternion().setFromAxisAngle(this.steerAxis, -this.delta * 12));
  }
}
