// 音效：全部用 WebAudio 即時合成，不需要音效檔
//   每個聲音都是「真實聲音的組成」拼出來的：撞擊的瞬間（短促的濾波雜訊 + 快速衰減的共鳴）、材質的共鳴頻率、尾音
let ctx = null;
let enabled = true;
let master = null, verb = null;

function ac() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    // 總音量 + 一點點空間殘響（戶外，很短），讓聲音不會乾巴巴的
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    verb = ctx.createConvolver(); verb.buffer = impulse(ctx, 0.9, 3.2);
    const wet = ctx.createGain(); wet.gain.value = 0.16; verb.connect(wet); wet.connect(master);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export const setSound = v => { enabled = v; };
export const unlockAudio = () => ac();

// 殘響用的衝激響應：指數衰減的雜訊
function impulse(c, dur, decay) {
  const n = Math.ceil(c.sampleRate * dur), b = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
  return b;
}

let noiseBuf = null;
function noise(c, dur) {
  // 共用一段 2 秒的白雜訊，每次從隨機位置開始播
  if (!noiseBuf) { noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  s._dur = dur;
  return s;
}
const startN = (n, t, dur) => { n.start(t, Math.random() * 1.5); n.stop(t + dur); };

// 包絡線：a = 起音時間、peak = 音量、dec = 衰減時間（接到總音量與殘響）
function env(c, node, t0, a, peak, dec) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + dec);
  node.connect(g);
  g.connect(master);
  g.connect(verb);
  return g;
}
const filt = (c, type, freq, q = 0.8) => { const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; return f; };
// 濾波雜訊爆一下（撞擊、沙、水花的基本單位）
function burst(c, t, type, freq, q, a, peak, dec) {
  const n = noise(c), f = filt(c, type, freq, q);
  n.connect(f); env(c, f, t, a, peak, dec); startN(n, t, a + dec + 0.05);
  return f;
}
// 有音高的短音（共鳴、氣泡、金屬聲）
function tone(c, t, wave, f0, f1, a, peak, dec) {
  const o = c.createOscillator(); o.type = wave;
  o.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + a + dec);
  env(c, o, t, a, peak, dec); o.start(t); o.stop(t + a + dec + 0.05);
  return o;
}

export function playHit(kind = 'iron', strength = 1) {
  const c = enabled && ac();
  if (!c) return;
  const t = c.currentTime;
  if (kind === 'putter') {
    // 推桿：輕輕的「嗒」
    burst(c, t, 'bandpass', 2200, 3, 0.001, 0.45 * strength, 0.035);
    tone(c, t, 'sine', 1400, 900, 0.001, 0.12 * strength, 0.04);
    return;
  }
  // 木桿：比較厚、有一點「鏘」的金屬殼聲；鐵桿：清脆的「咔」+ 一點草皮聲
  burst(c, t, 'bandpass', kind === 'driver' ? 2400 : 3800, kind === 'driver' ? 1.4 : 2.6, 0.001, 0.9 * strength, kind === 'driver' ? 0.11 : 0.07);
  tone(c, t, 'triangle', kind === 'driver' ? 1150 : 1700, kind === 'driver' ? 700 : 900, 0.001, 0.22 * strength, kind === 'driver' ? 0.12 : 0.06);
  if (kind !== 'driver') burst(c, t + 0.005, 'lowpass', 900, 0.7, 0.004, 0.25 * strength, 0.12);     // 鐵桿削到草皮
}

// 球進洞：球掉進塑膠洞杯，「咚—喀喀」撞兩三下、越撞越快越小聲
export function playCup() {
  const c = enabled && ac();
  if (!c) return;
  const t0 = c.currentTime + 0.02;
  [0, 0.11, 0.18, 0.225].forEach((dt, i) => {
    const t = t0 + dt, k = 1 / (1 + i * 0.9);
    burst(c, t, 'bandpass', 950 + i * 80, 4, 0.001, 0.55 * k, 0.03);        // 撞到杯壁 / 杯底
    tone(c, t, 'sine', 420 - i * 15, 380, 0.001, 0.32 * k, 0.09);           // 洞杯空空的共鳴
    if (i === 0) tone(c, t, 'sine', 160, 120, 0.002, 0.3, 0.12);            // 第一下比較沉
  });
}

// 上果嶺：兩個音的輕柔鐘聲（往上的大三度），配 NICE ON 動畫
export function playNiceOn() {
  const c = enabled && ac();
  if (!c) return;
  const t0 = c.currentTime + 0.03;
  [[880, 0], [1108.7, 0.11]].forEach(([f, dt]) => {
    tone(c, t0 + dt, 'sine', f, f, 0.004, 0.16, 0.55);
    tone(c, t0 + dt, 'sine', f * 2.01, f * 2.01, 0.003, 0.04, 0.3);         // 一點泛音，像小鐘
  });
}

// 擦過洞口：球擦到杯緣的一聲短「叮」
export function playLip() {
  const c = enabled && ac();
  if (!c) return;
  const t = c.currentTime;
  burst(c, t, 'bandpass', 1300, 5, 0.001, 0.3, 0.025);
  tone(c, t, 'sine', 640, 600, 0.001, 0.12, 0.08);
}

// 掉進水裡：「噗通」— 球砸進水面的低沉一聲（咚）+ 水被挖開又闔上的往上滑音（通）+ 濺起的水花，最後幾個氣泡
export function playSplash() {
  const c = enabled && ac();
  if (!c) return;
  const t = c.currentTime;
  tone(c, t, 'sine', 160, 55, 0.004, 0.75, 0.22);                         // 噗：低沉的撞擊
  burst(c, t, 'lowpass', 700, 0.8, 0.003, 0.5, 0.12);
  tone(c, t + 0.05, 'sine', 230, 820, 0.01, 0.55, 0.11);                 // 通：空腔闔上的往上滑音
  tone(c, t + 0.05, 'sine', 460, 1500, 0.01, 0.12, 0.09);
  const f = burst(c, t + 0.02, 'bandpass', 1800, 0.9, 0.01, 0.32, 0.45);  // 水花
  f.frequency.exponentialRampToValueAtTime(700, t + 0.5);
  for (let i = 0; i < 5; i++) {
    const tt = t + 0.3 + Math.random() * 0.5, f0 = 600 + Math.random() * 600;
    tone(c, tt, 'sine', f0, f0 * 1.8, 0.002, 0.05 + Math.random() * 0.04, 0.05);   // 冒上來的氣泡
  }
}

// 掉進熔岩：「嘶—」的蒸發聲
export function playSizzle() {
  const c = enabled && ac();
  if (!c) return;
  const t = c.currentTime;
  tone(c, t, 'sine', 500, 160, 0.003, 0.3, 0.15);
  const f = burst(c, t, 'highpass', 3500, 0.5, 0.05, 0.3, 1.1);
  f.frequency.exponentialRampToValueAtTime(6000, t + 1.1);
}

// 掉進峽谷 / 虛空：越來越遠的風聲
export function playFall() {
  const c = enabled && ac();
  if (!c) return;
  const t = c.currentTime;
  const f = burst(c, t, 'bandpass', 900, 1.2, 0.1, 0.3, 1.2);
  f.frequency.exponentialRampToValueAtTime(250, t + 1.3);
}

// 落地：落在草地上的悶聲；沙坑是「噗沙」、果嶺比較清脆、路面是硬的「喀」
export function playThud(strength = 0.5, surf = 'grass') {
  const c = enabled && ac();
  if (!c) return;
  const t = c.currentTime, s = Math.min(1, strength);
  if (surf === 'sand') {
    burst(c, t, 'lowpass', 1400, 0.6, 0.004, 0.45 * s + 0.08, 0.16);
    burst(c, t + 0.01, 'bandpass', 4200, 0.8, 0.01, 0.12 * s + 0.03, 0.22);      // 沙粒散開的沙沙聲
    tone(c, t, 'sine', 120, 70, 0.002, 0.18 * s, 0.08);
    return;
  }
  if (surf === 'hard') {
    burst(c, t, 'bandpass', 2600, 2, 0.001, 0.5 * s, 0.03);
    tone(c, t, 'sine', 900, 500, 0.001, 0.15 * s, 0.05);
    return;
  }
  const green = surf === 'green';
  tone(c, t, 'sine', green ? 210 : 150, green ? 120 : 70, 0.002, 0.32 * s, green ? 0.07 : 0.11);
  burst(c, t, 'lowpass', green ? 1600 : 1000, 0.7, 0.002, 0.22 * s, green ? 0.05 : 0.09);
}

// 打到樹：樹葉沙沙聲（偶爾打到樹幹的「叩」）
export function playLeaves() {
  const c = enabled && ac();
  if (!c) return;
  const t = c.currentTime;
  burst(c, t, 'highpass', 2600, 0.5, 0.015, 0.32, 0.45);
  burst(c, t + 0.05, 'bandpass', 5200, 0.7, 0.03, 0.14, 0.35);
  if (Math.random() < 0.5) { burst(c, t, 'bandpass', 700, 3, 0.001, 0.4, 0.05); tone(c, t, 'sine', 330, 260, 0.001, 0.25, 0.09); }
}

// 奇幻機關：每一種各有自己的聲音
export function playSpecial(kind) {
  const c = enabled && ac();
  if (!c) return;
  const t = c.currentTime;
  if (kind === 'ring' || kind === 'wisp' || kind === 'orb') {
    // 光環 / 引魂燈 / 金球：亮晶晶的上行鈴聲
    [0, 0.06, 0.12].forEach((dt, i) => tone(c, t + dt, 'sine', [1320, 1760, 2350][i], null, 0.003, 0.12, 0.35));
    if (kind === 'wisp') tone(c, t, 'sine', 300, 600, 0.2, 0.08, 0.6);
  } else if (kind === 'portal') {
    // 星門：往上掃的嗡嗡聲
    tone(c, t, 'sawtooth', 120, 900, 0.05, 0.06, 0.55);
    burst(c, t, 'bandpass', 1500, 2, 0.05, 0.12, 0.5).frequency.exponentialRampToValueAtTime(5000, t + 0.55);
  } else if (kind === 'shroom' || kind === 'tramp' || kind === 'bumper') {
    // 彈跳：「啵嚶」
    tone(c, t, 'sine', kind === 'bumper' ? 520 : 180, kind === 'bumper' ? 1040 : 520, 0.003, 0.32, 0.22);
    if (kind === 'bumper') { burst(c, t, 'bandpass', 2400, 3, 0.001, 0.35, 0.04); tone(c, t, 'square', 880, null, 0.002, 0.06, 0.12); }
  } else if (kind === 'vent' || kind === 'cannon') {
    // 噴發 / 大砲：低沉的爆裂 + 噴氣
    tone(c, t, 'sine', 90, 40, 0.004, 0.55, 0.35);
    burst(c, t, 'lowpass', kind === 'cannon' ? 700 : 1500, 0.7, 0.005, 0.55, kind === 'cannon' ? 0.5 : 0.8);
  } else if (kind === 'boost') {
    burst(c, t, 'bandpass', 800, 1, 0.02, 0.3, 0.4).frequency.exponentialRampToValueAtTime(3500, t + 0.4);
  } else if (kind === 'wall') {
    // 冰牆：清脆的「鏘」+ 冰的高頻
    burst(c, t, 'highpass', 4000, 1, 0.001, 0.35, 0.08);
    [1800, 2700, 3900].forEach(f => tone(c, t, 'sine', f, null, 0.001, 0.07, 0.5));
  } else if (kind === 'honey') {
    // 蜂蜜：黏黏的「啪嘰」
    burst(c, t, 'lowpass', 600, 1.5, 0.004, 0.45, 0.12);
    tone(c, t, 'sine', 260, 90, 0.004, 0.2, 0.18);
  } else if (kind === 'gear') {
    // 齒輪：金屬的「喀啦喀啦」
    for (let i = 0; i < 5; i++) { burst(c, t + i * 0.045, 'bandpass', 3000 + i * 150, 6, 0.001, 0.25, 0.02); tone(c, t + i * 0.045, 'square', 1200, null, 0.001, 0.03, 0.02); }
    tone(c, t, 'triangle', 220, 330, 0.01, 0.12, 0.3);
  } else if (kind === 'cloud') {
    // 雷雲：閃電的「霹」+ 拖長的雷聲
    burst(c, t, 'highpass', 2500, 0.5, 0.001, 0.6, 0.12);
    const f = burst(c, t + 0.08, 'lowpass', 400, 0.6, 0.15, 0.7, 2.2);
    f.frequency.exponentialRampToValueAtTime(120, t + 2.3);
  } else {
    tone(c, t, 'triangle', 600, 900, 0.003, 0.15, 0.2);
  }
}

// 老鷹 / 信天翁慶祝：觀眾歡呼（濾波雜訊慢慢升起再退）+ 上行和弦鐘聲
export function playCheer() {
  const c = enabled && ac();
  if (!c) return;
  const t = c.currentTime;
  // 歡呼：幾層不同音高的人聲雜訊疊起來，加一點起伏
  [700, 1100, 1700].forEach((fq, i) => {
    const n = noise(c), f = filt(c, 'bandpass', fq, 0.7);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16 / (i + 1) + 0.04, t + 0.4 + i * 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
    n.connect(f); f.connect(g); g.connect(master); g.connect(verb);
    startN(n, t, 3);
  });
  // 拍手：一堆隨機的短爆音
  for (let i = 0; i < 40; i++) burst(c, t + 0.3 + Math.random() * 2, 'bandpass', 1800 + Math.random() * 1500, 1.5, 0.001, 0.05 + Math.random() * 0.05, 0.03);
  [523, 659, 784, 1047].forEach((hz, i) => tone(c, t + i * 0.12, 'triangle', hz, null, 0.005, 0.14, 0.9));
}

// ---------- 生涯模式的比賽氣氛（v93）：環境音（風、鳥）、觀眾的嘈雜聲與反應、心跳、頒獎配樂 ----------
//   全部即時合成；主遊戲不會呼叫，所以單人 / 連線回合的聲音不變
let amb = null;
function loopNoise(c, type, freq, q, gain) {
  const n = noise(c), f = filt(c, type, freq, q), g = c.createGain();
  g.gain.value = 0.0001; n.connect(f); f.connect(g); g.connect(master);
  n.start(c.currentTime, Math.random() * 1.5);
  g.gain.setTargetAtTime(gain, c.currentTime, 0.8);
  return { n, f, g };
}
// crowd：0 = 沒有觀眾（訓練）、1 = 地方賽、2 = 巡迴賽、3 = 大賽
export function startAmbience(o = {}) {
  stopAmbience();
  const c = enabled && ac();
  if (!c) return;
  const lv = o.crowd || 0;
  amb = { lv, hush: 0, wind: loopNoise(c, 'lowpass', 420, 0.5, 0.012), crowd: lv ? loopNoise(c, 'bandpass', 520, 0.6, 0.006 + lv * 0.007) : null, crowd2: lv >= 2 ? loopNoise(c, 'bandpass', 1150, 0.9, 0.003 + lv * 0.002) : null, timers: [], heart: null };
  // 觀眾的嘈雜聲慢慢起伏（像人群在聊天、走動）
  if (amb.crowd) amb.timers.push(setInterval(() => { if (!amb || !amb.crowd) return; const base = (0.006 + amb.lv * 0.007) * (1 - amb.hush * 0.85); amb.crowd.g.gain.setTargetAtTime(base * (0.75 + Math.random() * 0.5), c.currentTime, 1.2); }, 1700));
  // 鳥叫：每隔幾秒一串短短的上下滑音
  amb.timers.push(setInterval(() => { if (amb && Math.random() < 0.55) chirp(c); }, 2600));
}
export function stopAmbience() {
  if (!amb) return;
  const c = ctx;
  for (const t of amb.timers) clearInterval(t);
  if (amb.heart) clearInterval(amb.heart);
  for (const k of ['wind', 'crowd', 'crowd2']) { const s = amb[k]; if (!s) continue; try { s.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.3); s.n.stop(c.currentTime + 1.2); } catch (e) { /* 已經停了 */ } }
  amb = null;
}
function chirp(c) {
  const t = c.currentTime, f0 = 2600 + Math.random() * 1800, n = 2 + Math.floor(Math.random() * 4);
  for (let i = 0; i < n; i++) {
    const o = c.createOscillator(), g = c.createGain(), tt = t + i * (0.09 + Math.random() * 0.05);
    o.type = 'sine'; o.frequency.setValueAtTime(f0, tt); o.frequency.exponentialRampToValueAtTime(f0 * (1.25 + Math.random() * 0.3), tt + 0.05);
    g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.012, tt + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.07);
    o.connect(g); g.connect(master); g.connect(verb); o.start(tt); o.stop(tt + 0.1);
  }
}
// 風聲跟著這一洞的風速（mph）
export function setWindSound(mph) {
  if (!amb || !ctx) return;
  amb.wind.g.gain.setTargetAtTime(0.006 + Math.min(20, mph) * 0.0022, ctx.currentTime, 1.5);
  amb.wind.f.frequency.setTargetAtTime(300 + Math.min(20, mph) * 22, ctx.currentTime, 1.5);
}
// 壓力：觀眾安靜下來（0~1）；2 級以上加心跳
export function setPressureSound(lvl) {
  if (!amb || !ctx) return;
  amb.hush = Math.min(1, lvl / 3);
  if (amb.crowd) amb.crowd.g.gain.setTargetAtTime((0.006 + amb.lv * 0.007) * (1 - amb.hush * 0.85), ctx.currentTime, 0.6);
  if (lvl >= 2 && !amb.heart) {
    const beat = () => { const c = ctx, t = c.currentTime; tone(c, t, 'sine', 62, 48, 0.008, 0.16, 0.16); tone(c, t + 0.24, 'sine', 56, 44, 0.008, 0.1, 0.14); };
    beat(); amb.heart = setInterval(beat, lvl >= 3 ? 720 : 880);
  } else if (lvl < 2 && amb.heart) { clearInterval(amb.heart); amb.heart = null; }
}
const crowdLv = () => (amb ? amb.lv : 1);
// 掌聲：strength 0~1（觀眾越多越熱烈）
export function playApplause(strength = 0.5) {
  const c = enabled && ac();
  if (!c || !crowdLv()) return;
  const t = c.currentTime, n = Math.round(12 + strength * 30 * crowdLv()), dur = 1.4 + strength * 1.6;
  for (let i = 0; i < n; i++) { const tt = t + Math.random() * dur * Math.random(); burst(c, tt, 'bandpass', 1500 + Math.random() * 1800, 1.4, 0.001, (0.03 + Math.random() * 0.04) * (0.6 + strength * 0.6), 0.03); }
}
// 歡呼（抓鳥、救 Par 的長推）：人聲雜訊升起再退 + 掌聲
export function playRoar(strength = 0.6) {
  const c = enabled && ac();
  if (!c || !crowdLv()) return;
  const t = c.currentTime, k = strength * (0.4 + crowdLv() * 0.25);
  [600, 950, 1500].forEach((fq, i) => {
    const n = noise(c), f = filt(c, 'bandpass', fq, 0.7), g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime((0.11 / (i + 1) + 0.03) * k, t + 0.35 + i * 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8 + strength * 1.5);
    n.connect(f); f.connect(g); g.connect(master); g.connect(verb); startN(n, t, 3.6);
  });
  playApplause(strength);
}
// 惋惜聲（差一點進、掉水）：「喔——」往下掉的人聲
export function playGroan() {
  const c = enabled && ac();
  if (!c || !crowdLv()) return;
  const t = c.currentTime, n = noise(c), f = filt(c, 'bandpass', 700, 2.2), g = c.createGain();
  f.frequency.setValueAtTime(760, t); f.frequency.exponentialRampToValueAtTime(330, t + 1.3);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05 + crowdLv() * 0.025, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
  n.connect(f); f.connect(g); g.connect(master); g.connect(verb); startN(n, t, 1.7);
}
// 遠方其他洞的歡呼（大賽的招牌氣氛）：悶悶的、從遠處傳來
export function playDistantRoar() {
  const c = enabled && ac();
  if (!c) return;
  const t = c.currentTime, n = noise(c), f = filt(c, 'lowpass', 650, 0.6), g = c.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.035, t + 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
  n.connect(f); f.connect(g); g.connect(master); g.connect(verb); startN(n, t, 3.4);
}
// 頒獎配樂：銅管風格的和弦進行（鋸齒波 + 低通，I–IV–V–I）
export function playFanfare() {
  const c = enabled && ac();
  if (!c) return;
  const t = c.currentTime;
  const chords = [[261.6, 329.6, 392], [349.2, 440, 523.3], [392, 493.9, 587.3], [523.3, 659.3, 784]];
  const lens = [0.45, 0.45, 0.45, 1.8];
  let tt = t;
  chords.forEach((ch, i) => {
    for (const hz of ch) {
      const o = c.createOscillator(), f = filt(c, 'lowpass', 1800, 0.7), g = c.createGain();
      o.type = 'sawtooth'; o.frequency.value = hz;
      g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.045, tt + 0.04); g.gain.setTargetAtTime(0.03, tt + 0.1, 0.2); g.gain.exponentialRampToValueAtTime(0.0001, tt + lens[i] + 0.25);
      o.connect(f); f.connect(g); g.connect(master); g.connect(verb); o.start(tt); o.stop(tt + lens[i] + 0.3);
    }
    tt += lens[i];
  });
  setTimeout(() => playApplause(0.9), 300);
}
