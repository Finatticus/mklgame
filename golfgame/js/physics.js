// 物理引擎：飛行（重力 + 空氣阻力 + 馬格努斯升力 + 風）、落地彈跳、滾動、推桿、進洞判定
import { MPH, clamp, rad, deg, makeRng } from './util.js';
import { derive } from './stats.js';

export const SURF = { TEE: 0, FAIRWAY: 1, FRINGE: 2, GREEN: 3, ROUGH: 4, DEEP: 5, SAND: 6, WATER: 7, OB: 8, CHASM: 9, WASTE: 10 };
export const SURF_NAME = ['發球台', '球道', '果嶺邊', '果嶺', '長草', '深草', '沙坑', '水障礙', '界外', '峽谷', '荒地'];

const R = 0.021335, AREA = Math.PI * R * R, MASS = 0.04593, G = 9.81;
const CUP_R = 0.054;
// 空氣動力係數：用 PGA TrackMan 平均數據回歸（Driver 167mph/10.9°/2686rpm → 275y；7I 120mph → 172y）
const CD0 = 0.215, CDK = 0.30, CLK = 1.8, CLQ = 1.5, CL_MAX = 0.34, SPIN_TAU = 25;

// 各地面：e = 法向恢復係數；keep = 落地切向速度保留；crr = 滾動阻力係數
export const GROUND = {
  [SURF.TEE]: { e: 0.30, keep: 0.62, crr: 0.12 },
  [SURF.FAIRWAY]: { e: 0.32, keep: 0.70, crr: 0.11 },
  [SURF.FRINGE]: { e: 0.27, keep: 0.62, crr: 0.085 },
  [SURF.GREEN]: { e: 0.22, keep: 0.62, crr: 0.05 },
  [SURF.ROUGH]: { e: 0.15, keep: 0.42, crr: 0.36 },
  [SURF.DEEP]: { e: 0.07, keep: 0.22, crr: 0.75 },
  [SURF.SAND]: { e: 0.03, keep: 0.10, crr: 1.6 },
  [SURF.WASTE]: { e: 0.20, keep: 0.50, crr: 0.30 },
};

export function airDensity(altitude, tempC) {
  const P = 101325 * Math.pow(1 - 2.25577e-5 * altitude, 5.25588);
  return P / (287.05 * (tempC + 273.15));
}

// 果嶺速度（Stimp 呎）→ 滾動阻力。Stimp 球道以約 1.83 m/s 滾出，滾 stimp 呎停下：a = v²/2d
export const stimpCrr = stimp => (1.83 * 1.83) / (2 * stimp * 0.3048) / G;

function windAt(env, h) {
  // 對數風廓線：地面風小、高空風大。顯示的風速是 10 公尺高度
  const f = clamp(Math.log(Math.max(h, 0.3) / 0.05) / Math.log(10 / 0.05), 0.3, 1.25);
  return [env.wind[0] * f, env.wind[1] * f];
}

export function groundFor(code, course) {
  const g = { ...(GROUND[code] || GROUND[SURF.ROUGH]) };
  if (code === SURF.GREEN) g.crr = stimpCrr(course.stimp);
  if (code === SURF.FAIRWAY || code === SURF.FRINGE || code === SURF.TEE || code === SURF.GREEN) {
    g.e *= course.firm; g.keep = Math.min(0.9, g.keep * (0.85 + 0.15 * course.firm));
    if (code !== SURF.GREEN) g.crr /= course.firm;
  }
  return g;
}

const isHazard = c => c === SURF.WATER || c === SURF.CHASM;

/**
 * 模擬一顆球從擊出到停止。
 * launch: { pos:[x,y,z], speed(m/s), launchDeg, yaw(rad, 0=朝 -z), spin(rpm), axisDeg(+右曲) , rollOnly }
 * 回傳 { frames:[[t,x,y,z]...]（60fps）, end, result, carry, total, apex, ... }
 */
export function simulate(launch, env, terrain) {
  const rho = env.rho;
  const course = terrain.course;
  let [x, y, z] = launch.pos;
  const dX = Math.sin(launch.yaw), dZ = -Math.cos(launch.yaw);
  const rX = Math.cos(launch.yaw), rZ = Math.sin(launch.yaw);
  const L = rad(launch.launchDeg);
  let vx = launch.speed * Math.cos(L) * dX, vy = launch.speed * Math.sin(L), vz = launch.speed * Math.cos(L) * dZ;
  let w = launch.spin * 2 * Math.PI / 60;
  const ax0 = rad(launch.axisDeg || 0);
  // 旋轉軸：純後旋時 = 右向量；傾斜 axis 產生側旋
  const sx = rX * Math.cos(ax0), sy = -Math.sin(ax0), sz = rZ * Math.cos(ax0);

  const frames = [];
  const events = [];
  const dt = 1 / 240;
  let t = 0, nextFrame = 0, apex = y, landed = false, carryPt = null, descent = 0, flightTime = 0;
  let mode = launch.rollOnly ? 'roll' : 'fly';
  let result = 'rest', bounces = 0, lastSafe = [x, z], hitTree = false;
  const startY = y;
  const push = () => { if (t >= nextFrame) { frames.push([t, x, y, z]); nextFrame += 1 / 60; } };

  while (t < 40) {
    push();
    if (mode === 'fly') {
      const [wx, wz] = windAt(env, y - terrain.height(x, z));
      const rvx = vx - wx, rvy = vy, rvz = vz - wz;
      const sp = Math.hypot(rvx, rvy, rvz) || 1e-6;
      const S = R * w / sp;
      const cd = CD0 + CDK * S;
      const cl = S < 0.3 ? Math.min(CL_MAX, CLK * S - CLQ * S * S) : CL_MAX;
      const k = 0.5 * rho * AREA * sp / MASS;
      // 升力方向 = 旋轉軸 × 相對速度（單位化）
      let lx = sy * rvz - sz * rvy, ly = sz * rvx - sx * rvz, lz = sx * rvy - sy * rvx;
      const ln = Math.hypot(lx, ly, lz) || 1;
      lx /= ln; ly /= ln; lz /= ln;
      vx += (-k * cd * rvx + k * cl * sp * lx) * dt;
      vy += (-G - k * cd * rvy + k * cl * sp * ly) * dt;
      vz += (-k * cd * rvz + k * cl * sp * lz) * dt;
      x += vx * dt; y += vy * dt; z += vz * dt;
      w *= Math.exp(-dt / SPIN_TAU);
      apex = Math.max(apex, y);
      t += dt;

      if (!terrain.inBounds(x, z)) { result = 'ob'; break; }
      // 樹冠：穿過時大幅減速並亂彈
      if (!hitTree || bounces > 0) {
        const tr = terrain.treeAt(x, y, z);
        if (tr) {
          hitTree = true;
          events.push({ t, type: 'tree' });
          const f = 0.25 + env.rng() * 0.25;
          const a = (env.rng() - 0.5) * 2.2;
          const nvx = vx * Math.cos(a) - vz * Math.sin(a), nvz = vx * Math.sin(a) + vz * Math.cos(a);
          vx = nvx * f; vz = nvz * f; vy = vy * f * 0.5 - 1; w *= 0.3;
        }
      }
      const gh = terrain.height(x, z);
      if (y - R <= gh) {
        const code = terrain.surface(x, z);
        if (!landed) {
          landed = true; carryPt = [x, z]; flightTime = t;
          descent = deg(Math.atan2(-vy, Math.hypot(vx, vz)));
          if (launch.carryOnly) break;     // 只要飛行距離（預估用），第一次落地就停，省計算
        }
        if (isHazard(code)) { result = code === SURF.WATER ? 'water' : 'chasm'; events.push({ t, type: 'splash' }); y = gh; break; }
        if (code === SURF.OB) { result = 'ob'; break; }
        // 進洞（直接飛進或彈跳時經過）
        if (terrain.distToPin(x, z) < CUP_R && Math.hypot(vx, vz) < 3) { result = 'holed'; break; }
        y = gh + R;
        const n = terrain.normal(x, z);
        const vn = vx * n[0] + vy * n[1] + vz * n[2];
        let tx = vx - vn * n[0], ty = vy - vn * n[1], tz = vz - vn * n[2];
        const gnd = groundFor(code, course);
        const tsp = Math.hypot(tx, ty, tz) || 1e-6;
        // 後旋讓球落地後「咬住」：切向速度扣掉 spin 造成的煞車，強後旋可以倒退一點
        const spinBrake = Math.min(tsp + 1.2, R * w * 0.55 * (code === SURF.GREEN ? 1 : 0.6) * clamp(-vn / 12, 0.2, 1.2));
        const keep = gnd.keep * (1 - Math.min(0.6, (-vn) * 0.02));
        const newT = Math.max(-1.0, tsp * keep - spinBrake);
        tx = tx / tsp * newT; ty = ty / tsp * newT; tz = tz / tsp * newT;
        const nvn = -vn * gnd.e;
        vx = tx + nvn * n[0]; vy = ty + nvn * n[1]; vz = tz + nvn * n[2];
        w *= 0.45;
        bounces++;
        events.push({ t, type: 'bounce', surf: code, speed: -vn });
        if (nvn < 0.6 || bounces > 12) mode = 'roll';
        lastSafe = [x, z];
      }
    } else {
      // 滾動：沿地面切線，重力分量推動，滾動阻力煞車
      const code = terrain.surface(x, z);
      if (isHazard(code)) { result = code === SURF.WATER ? 'water' : 'chasm'; events.push({ t, type: 'splash' }); break; }
      if (code === SURF.OB || !terrain.inBounds(x, z)) { result = 'ob'; break; }
      const gnd = groundFor(code, course);
      const n = terrain.normal(x, z);
      const gx = -G * n[1] * n[0] * -1, gz = -G * n[1] * n[2] * -1; // 重力沿坡面的水平分量 ≈ G·n_y·(n_x, n_z)
      let sp = Math.hypot(vx, vz);
      const slopeAcc = Math.hypot(gx, gz);
      if (sp < 0.03 && slopeAcc < gnd.crr * G * 1.3) { vx = vz = 0; break; }
      let ax = gx, az = gz;
      if (sp > 1e-4) { ax -= gnd.crr * G * vx / sp; az -= gnd.crr * G * vz / sp; }
      const ovx = vx, ovz = vz;
      vx += ax * dt; vz += az * dt;
      // 阻力不能讓球反向
      if (sp > 1e-4 && (vx * ovx + vz * ovz) < 0 && slopeAcc < gnd.crr * G) { vx = vz = 0; break; }
      x += vx * dt; z += vz * dt;
      y = terrain.height(x, z) + R;
      t += dt;
      sp = Math.hypot(vx, vz);
      const dp = terrain.distToPin(x, z);
      if (dp < CUP_R) {
        if (sp < 1.35) { result = 'holed'; events.push({ t, type: 'cup' }); break; }
        // 太快：擦邊，方向偏折、減速
        if (dp < CUP_R * 0.7) {
          const a = (env.rng() - 0.5) * 1.4;
          const nvx = vx * Math.cos(a) - vz * Math.sin(a), nvz = vx * Math.sin(a) + vz * Math.cos(a);
          vx = nvx * 0.6; vz = nvz * 0.6;
          events.push({ t, type: 'lip' });
        }
      }
      if (code === SURF.SAND && sp < 0.5) { vx = vz = 0; break; }
      // 只需要前面一段路線（推桿預測線）時，滾超過 maxDist 就停
      if (launch.maxDist && Math.hypot(x - launch.pos[0], z - launch.pos[2]) > launch.maxDist) break;
      lastSafe = [x, z];
    }
  }
  frames.push([t, x, y, z]);
  if (result === 'holed' && terrain.pin) {
    // 進洞：球滑到洞中央、往下掉 9 公分（掉到地面下就被草地蓋住，看起來就是掉進洞裡）
    if (!events.some(e => e.type === 'cup')) events.push({ t, type: 'cup' });
    const [px, pz] = terrain.pin, gy = terrain.height(px, pz);
    const x0 = x, z0 = z, y0 = y;
    for (let i = 1; i <= 14; i++) {
      const k = i / 14;
      x = x0 + (px - x0) * Math.min(1, k * 2);
      z = z0 + (pz - z0) * Math.min(1, k * 2);
      y = Math.min(y0, gy + R) - 0.11 * k * k;
      frames.push([t + i * 0.018, x, y, z]);
    }
    t += 14 * 0.018;
  }
  if (!carryPt) carryPt = [x, z];
  const sx0 = launch.pos[0], sz0 = launch.pos[2];
  const along = (px, pz) => (px - sx0) * dX + (pz - sz0) * dZ;
  return {
    frames, events, result,
    end: [x, y, z],
    lastSafe,
    carry: launch.rollOnly ? 0 : along(carryPt[0], carryPt[1]),
    total: along(x, z),
    offline: (x - sx0) * rX + (z - sz0) * rZ,
    apex: apex - startY,
    descent, flightTime,
    duration: t,
  };
}

const CLUB_NOMINAL_MPH = 113; // TrackMan 一號木平均桿頭速度，用來把 spin 換算到玩家速度

/**
 * 揮桿輸入 + 素質 + 球位 → 擊球參數
 * input: { power(0~1.1), curve(-1~1), aimYaw }
 * ctx:   { club, lie(SURF), stats, rng, pressure, distToPin(m), slope }
 */
export function makeLaunch(input, ctx) {
  const d = derive(ctx.stats);
  const rng = ctx.rng;
  const club = ctx.club;
  const pm = ctx.pressure ? d.pressureMul : 1;
  const lie = ctx.lie;
  const n = () => rng.normal();

  if (club.putter) {
    // 推桿：拉桿長度決定「平地滾動距離」，推的方向偏差造成推出偏左/偏右
    const crr = stimpCrr(ctx.stimp) * (lie === SURF.GREEN ? 1 : 1.6);
    const dist = Math.max(0.2, input.power * ctx.puttScale);
    let v0 = Math.sqrt(2 * crr * G * dist);
    v0 *= 1 + n() * d.touchSigma * pm;
    // 直直推出去（出桿偏移 < 4°）就照預測線走，不加隨機方向誤差；推歪了才會再加上「推桿方向」素質的誤差
    const lineErr = n() * d.lineSigma * pm;
    const yaw = input.aimYaw + rad(input.curve * 1.5 + (input.curve ? lineErr : 0));
    return { speed: v0, launchDeg: 0, yaw, spin: 0, axisDeg: 0, rollOnly: true, info: { clubMph: 0, smash: 0, ballMph: v0 / MPH } };
  }

  let pw = clamp(input.power, 0.05, 1.1);
  // 超揮（100~110%）：桿頭速度最多再快 10%（距離平均多約 8~19%，素質越低差越多；球速和距離不是等比例）；
  //   不穩定主要在方向：桿面 / 曲球誤差放大，準度越高放大越少（準度 50：110% 時 ×1.6、準度 99：×1.3）；
  //   距離的誤差只稍微變大（×1.15），而且打偏甜蜜點的程度封頂，再怎麼失誤也不會比 100% 短太多
  const over = Math.max(0, pw - 1);
  const speedF = pw <= 1 ? pw : 1 + over * 1.0;
  const sig = 1 + over * 1.5;
  const acc = (2.6 - d.faceSigma) / 0.019;                         // 準度素質（faceSigma = 2.6 − 準度 × 0.019 反推）
  const dirSig = 1 + over * (9 - acc * 0.06);

  // 球位影響
  let lieKeep = 1, lieSpin = 1, lieSig = 1, launchAdd = 0;
  const shortGame = ctx.distToPin < 55 && club.wedge;
  if (lie === SURF.ROUGH) { lieKeep = d.roughKeep; lieSpin = 0.62; lieSig = d.roughSigma; launchAdd = 1.2; }
  else if (lie === SURF.DEEP) { lieKeep = d.roughKeep * 0.72; lieSpin = 0.45; lieSig = d.roughSigma * 1.5; launchAdd = 3; }
  else if (lie === SURF.WASTE) { lieKeep = (d.roughKeep + 0.05) * 0.95; lieSpin = 0.7; lieSig = d.roughSigma * 1.1; }
  else if (lie === SURF.SAND) {
    if (shortGame) { lieKeep = 0.42 + (d.sandKeep - 0.62) * 0.8; lieSpin = 0.55; launchAdd = 6; }
    else { lieKeep = d.sandKeep; lieSpin = 0.8; }
    lieSig = d.sandSigma;
  } else if (lie === SURF.FAIRWAY || lie === SURF.FRINGE || lie === SURF.GREEN) {
    if (club.id === 'D') { lieKeep = 0.93; lieSig = 1.3; }  // 球道上直接用一號木
  }
  // 斜坡站位：坡度越大誤差越大
  lieSig *= 1 + Math.min(0.8, (ctx.slope || 0) * 6) * (1.2 - d.roughKeep);

  const clubMph = d.driverMph * club.ratio * speedF;
  const powerNoise = 1 + n() * (shortGame ? d.chipSigma : d.powerSigma) * sig * pm;
  const mis = Math.min(Math.abs(n()), over > 0 ? 2.5 : 9) * d.mishitSigma * sig * pm * lieSig;
  const smash = club.smash * d.smashMul * (1 - mis * 1.6);
  const ballMph = clubMph * powerNoise * smash * lieKeep;

  const launchDeg = club.launch * (0.85 + 0.15 * pw) + launchAdd + n() * d.launchSigma * Math.sqrt(sig) * pm;
  let spin = club.spin * (clubMph / (CLUB_NOMINAL_MPH * club.ratio)) * (0.6 + 0.4 * pw) * lieSpin;
  if (club.wedge || club.id === '9I' || club.id === '8I') spin *= d.spinMul;
  spin *= 1 + mis * 2.5 * (n() > 0 ? 1 : -0.4);

  const faceErr = n() * d.faceSigma * dirSig * pm * lieSig * (shortGame ? d.chipFace : 1);
  const intended = clamp(input.curve, -1, 1) * 30;                 // 出桿方向決定的旋轉軸（度），Draw/Fade 2~8°、Hook/Slice 12~28°
  const shaped = intended * (1 + n() * d.shapeSigma * dirSig * pm);
  const axisDeg = shaped + faceErr * 1.5;
  // 起飛方向：桿面誤差的 75%；小曲球會先往反方向開出去再彎回來，大曲球（Hook/Slice）只補 8° 份量，所以會彎出目標線
  const yaw = input.aimYaw + rad(faceErr * 0.75 - Math.sign(shaped) * Math.min(Math.abs(shaped), 8) * 0.36);

  return {
    speed: ballMph * MPH, launchDeg, yaw, spin: Math.max(600, spin), axisDeg,
    info: { clubMph: clubMph * powerNoise, smash, ballMph, faceErr, mis },
  };
}


// 平均距離表用的 80 組「平衡」種子：一般隨便挑的 80 組，前幾個亂數（力道浮動、打偏、發射角、桿面…）的平均
// 會剛好偏一邊，算出來的平均距離就差 1~3%。這裡從候選種子裡一個一個挑，讓前 7 個亂數的平均 ≈ 0、
// 絕對值平均 ≈ 0.798（常態分布的理論值），樣本就跟打很多很多球一樣有代表性。每次載入挑出來的都一樣
const TABLE_SEEDS = balancedSeeds(80, 7);
export const ADJ_SEEDS = balancedSeeds(12, 7);     // 特殊球位「預計少 xx%」用（每個力道 12 次揮桿）
function balancedSeeds(count, draws) {
  const S = new Array(draws).fill(0), A = new Array(draws).fill(0), out = [];
  const draw = seed => { const r = makeRng(seed); return Array.from({ length: draws }, () => r.normal()); };
  let cand = 1;
  while (out.length < count) {
    let best = null, bestScore = Infinity;
    for (let tries = 0; tries < 40; tries++, cand++) {
      const seed = (Math.imul(cand, 2654435761) ^ 0x9e3779b9) >>> 0;
      const v = draw(seed), n = out.length + 1;
      let score = 0;
      for (let j = 0; j < draws; j++) { const m = (S[j] + v[j]) / n, a = (A[j] + Math.abs(v[j])) / n - 0.798; score += m * m + a * a; }
      if (score < bestScore) { bestScore = score; best = { seed, v }; }
    }
    out.push(best.seed);
    best.v.forEach((x, j) => { S[j] += x; A[j] += Math.abs(x); });
  }
  return out;
}

// 球桿平均距離表（HUD「平均 Carry」、預估落點、自動選桿用）：
// 平坦、無風、發球台球位，用 TABLE_SEEDS 的 80 次揮桿（含打偏、力道浮動、桿面誤差）取平均 → 等於實際打很多球的平均
export function distanceTable(stats, clubs, course, rho = 1.2) {
  const flat = {
    course: course || { firm: 1, stimp: 11 },
    height: () => 0, surface: () => SURF.FAIRWAY, normal: () => [0, 1, 0], inBounds: () => true,
    treeAt: () => null, distToPin: () => 999,
  };
  const out = {};
  for (const c of clubs) {
    if (c.putter) continue;
    let carry = 0, total = 0;
    for (const seed of TABLE_SEEDS) {
      const rng = makeRng(seed);
      // 用「發球台」球位：一號木在球道上直接打有 7% 懲罰，平均距離表應該是正常（球座上）的距離
      const l = makeLaunch({ power: 1, curve: 0, aimYaw: 0 }, { club: c, lie: SURF.TEE, stats, rng, distToPin: 999 });
      const r = simulate({ ...l, pos: [0, R, 0] }, { rho, wind: [0, 0], rng }, flat);
      carry += r.carry; total += r.total;
    }
    out[c.id] = { carry: carry / TABLE_SEEDS.length, total: total / TABLE_SEEDS.length };
    // 各力道的 Carry（10%、20% … 110%）：距離和力道不是等比例（慢的球被空氣拖得比較多），所以每一段都實際模擬。
    // 每段用一次「沒有誤差的理想揮桿」算出平滑曲線，再乘上「平均 / 理想」的比例（隨機誤差讓平均比理想短約 7~11%）。
    // 這個比例在 50%、100%、110%（超揮誤差大很多）各量一次，中間內插；不會有少數樣本造成的忽高忽低
    const ideal = pw => {
      const l = makeLaunch({ power: pw, curve: 0, aimYaw: 0 }, { club: c, lie: SURF.TEE, stats, rng: ZERO_RNG, distToPin: 999 });
      return simulate({ ...l, pos: [0, R, 0], carryOnly: true }, { rho, wind: [0, 0], rng: ZERO_RNG }, flat).carry;
    };
    const mean = pw => {
      let sum = 0;
      for (const seed of TABLE_SEEDS) {
        const rng = makeRng(seed);
        const l = makeLaunch({ power: pw, curve: 0, aimYaw: 0 }, { club: c, lie: SURF.TEE, stats, rng, distToPin: 999 });
        sum += simulate({ ...l, pos: [0, R, 0], carryOnly: true }, { rho, wind: [0, 0], rng }, flat).carry;
      }
      return sum / TABLE_SEEDS.length;
    };
    const k1 = out[c.id].carry / ideal(1), kLo = mean(0.5) / ideal(0.5), kHi = mean(1.1) / ideal(1.1);
    const k = pw => pw <= 0.5 ? kLo : pw <= 1 ? kLo + (k1 - kLo) * (pw - 0.5) / 0.5 : k1 + (kHi - k1) * (pw - 1) / 0.1;
    out[c.id].curve = POWER_LEVELS.map(pw => pw === 1 ? out[c.id].carry : ideal(pw) * k(pw));
  }
  return out;
}

const ZERO_RNG = Object.assign(() => 0.5, { normal: () => 0 });
export const POWER_LEVELS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1];

// 依距離表算這個力道的平均 Carry（力道之間線性內插，0% = 0）
export function carryAt(entry, power) {
  const pw = Math.max(0, Math.min(1.1, power));
  if (!entry.curve) return entry.carry * Math.pow(pw, 1.08);
  if (pw <= POWER_LEVELS[0]) return entry.curve[0] * pw / POWER_LEVELS[0];
  for (let i = 1; i < POWER_LEVELS.length; i++) {
    if (pw <= POWER_LEVELS[i]) {
      const t = (pw - POWER_LEVELS[i - 1]) / (POWER_LEVELS[i] - POWER_LEVELS[i - 1]);
      return entry.curve[i - 1] + (entry.curve[i] - entry.curve[i - 1]) * t;
    }
  }
  return entry.curve[entry.curve.length - 1];
}
