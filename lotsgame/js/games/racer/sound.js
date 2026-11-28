// 引擎、胎噪與風切聲：以 Web Audio 即時合成，隨轉速、油門、車速變化。
export class CarSound {
  constructor() {
    const C = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
    this.master = C.createGain(); this.master.gain.value = 0.0; this.master.connect(C.destination);
    // 引擎：爆發頻率的鋸齒波＋次諧波方波，經過失真與低通
    this.eng = C.createGain(); this.eng.gain.value = 0;
    const shaper = C.createWaveShaper();
    const curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 2.6); }
    shaper.curve = curve;
    this.lp = C.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 900; this.lp.Q.value = 0.8;
    this.o1 = C.createOscillator(); this.o1.type = 'sawtooth';
    this.o2 = C.createOscillator(); this.o2.type = 'square';
    this.o3 = C.createOscillator(); this.o3.type = 'sawtooth';
    const g1 = C.createGain(), g2 = C.createGain(), g3 = C.createGain(); g1.gain.value = 0.5; g2.gain.value = 0.28; g3.gain.value = 0.18;
    this.o1.connect(g1).connect(shaper); this.o2.connect(g2).connect(shaper); this.o3.connect(g3).connect(shaper);
    shaper.connect(this.lp).connect(this.eng).connect(this.master);
    // 進氣：帶通雜訊
    const noise = C.createBuffer(1, C.sampleRate * 2, C.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const mk = (type, f, q) => { const s = C.createBufferSource(); s.buffer = noise; s.loop = true; const fl = C.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = C.createGain(); g.gain.value = 0; s.connect(fl).connect(g).connect(this.master); s.start(); return { fl, g }; };
    this.intake = mk('bandpass', 400, 1.2);
    this.tire = mk('bandpass', 2200, 6);
    this.wind = mk('lowpass', 700, 0.5);
    this.rumble = mk('lowpass', 160, 0.8);
    // 其他車的引擎（混成一個聲源，音量依最近距離）
    this.other = C.createOscillator(); this.other.type = 'sawtooth';
    this.otherG = C.createGain(); this.otherG.gain.value = 0;
    const olp = C.createBiquadFilter(); olp.type = 'lowpass'; olp.frequency.value = 700;
    this.other.connect(olp).connect(this.otherG).connect(this.master);
    for (const o of [this.o1, this.o2, this.o3, this.other]) { o.frequency.value = 40; o.start(); }
  }
  resume() { if (this.ctx.state !== 'running') this.ctx.resume(); this.master.gain.setTargetAtTime(0.55, this.ctx.currentTime, 0.3); }
  mute(v) { this.master.gain.setTargetAtTime(v ? 0 : 0.55, this.ctx.currentTime, 0.1); }
  // p：玩家車；others：{ rpm, dist }
  update(p, throttle, offroad, other) {
    const t = this.ctx.currentTime, k = 0.04;
    const cyl = p.spec.cyl || 6;
    const f = Math.max(18, (p.rpm / 60) * (cyl / 2));
    this.o1.frequency.setTargetAtTime(f, t, k);
    this.o2.frequency.setTargetAtTime(f / 2, t, k);
    this.o3.frequency.setTargetAtTime(f * 1.5, t, k);
    const load = 0.35 + throttle * 0.65;
    this.eng.gain.setTargetAtTime(0.16 + load * 0.2, t, 0.05);
    this.lp.frequency.setTargetAtTime(500 + p.rpm * 0.32 * (0.5 + throttle * 0.7), t, k);
    this.intake.fl.frequency.setTargetAtTime(f * 2.1, t, k);
    this.intake.g.gain.setTargetAtTime(0.03 + throttle * 0.07, t, 0.05);
    const v = p.speed;
    this.wind.g.gain.setTargetAtTime(Math.min(0.22, v * v * 0.00004), t, 0.2);
    this.tire.g.gain.setTargetAtTime(Math.min(0.25, Math.max(0, p.slip - 0.06) * 1.6) * (v > 4 ? 1 : 0), t, 0.05);
    this.rumble.g.gain.setTargetAtTime(offroad ? Math.min(0.35, v * 0.012) : 0, t, 0.08);
    if (other) {
      this.other.frequency.setTargetAtTime(Math.max(20, (other.rpm / 60) * 3), t, 0.1);
      this.otherG.gain.setTargetAtTime(Math.max(0, 0.12 - other.dist * 0.004), t, 0.1);
    }
  }
  close() { try { this.ctx.close(); } catch (e) {} }
}
