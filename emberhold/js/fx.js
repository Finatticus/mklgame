// 視覺特效、音效、提示框
const FX = (() => {
  // ---------- 背景：霧氣與餘燼 ----------
  const cv = document.getElementById('bg');
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  let theme = { sky: ['#1b1840', '#3a2c63'], fog: [180, 160, 255], ember: [255, 200, 140] };
  const embers = [], fogs = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function spawnEmber(init) {
    return { x: Math.random() * W, y: init ? Math.random() * H : H + 10, r: rand(0.6, 2.2),
      vy: rand(12, 40), vx: rand(-8, 8), life: rand(0.5, 1), ph: Math.random() * 6.28 };
  }
  for (let i = 0; i < 46; i++) embers.push(spawnEmber(true));
  for (let i = 0; i < 6; i++) fogs.push({ x: Math.random(), y: rand(0.35, 1), r: rand(0.35, 0.7), v: rand(0.004, 0.012) * (Math.random() < .5 ? -1 : 1) });

  let last = performance.now();
  function frame(t) {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (!document.hidden) {
      ctx.clearRect(0, 0, W, H);
      const [fr, fg, fb] = theme.fog;
      for (const f of fogs) {
        f.x += f.v * dt; if (f.x < -0.5) f.x = 1.5; if (f.x > 1.5) f.x = -0.5;
        const g = ctx.createRadialGradient(f.x * W, f.y * H, 0, f.x * W, f.y * H, f.r * Math.max(W, H));
        g.addColorStop(0, `rgba(${fr},${fg},${fb},0.10)`); g.addColorStop(1, `rgba(${fr},${fg},${fb},0)`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      const [er, eg, eb] = theme.ember;
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < embers.length; i++) {
        const e = embers[i];
        e.y -= e.vy * dt; e.ph += dt * 3; e.x += (e.vx + Math.sin(e.ph) * 10) * dt;
        e.life -= dt * 0.06;
        if (e.y < -10 || e.life <= 0) { embers[i] = spawnEmber(false); continue; }
        const a = Math.max(0, e.life) * (0.55 + 0.45 * Math.sin(e.ph * 1.7));
        const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 5);
        g.addColorStop(0, `rgba(${er},${eg},${eb},${a})`); g.addColorStop(1, `rgba(${er},${eg},${eb},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 5, 0, 6.28); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    requestAnimationFrame(frame);
  }
  addEventListener('resize', resize); resize(); requestAnimationFrame(frame);

  function setTheme(zoneIdx) {
    const z = zoneIdx == null ? { sky: ['#1b1840', '#3a2c63'], fog: [180, 160, 255], ember: [255, 200, 140] } : ZONES[zoneIdx];
    theme = z;
    document.documentElement.style.setProperty('--sky-a', z.sky[0]);
    document.documentElement.style.setProperty('--sky-b', z.sky[1]);
  }

  // ---------- 音效（WebAudio 合成） ----------
  let ac = null;
  function audio() {
    if (!Store.S || !Store.S.settings.sfx) return null;
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(freq, dur, type = 'sine', vol = 0.15, slide = 0, delay = 0) {
    const a = audio(); if (!a) return;
    const t = a.currentTime + delay;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol = 0.2, freq = 1200) {
    const a = audio(); if (!a) return;
    const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    f.type = 'lowpass'; f.frequency.value = freq; g.gain.value = vol;
    s.buffer = buf; s.connect(f).connect(g).connect(a.destination); s.start();
  }
  const SFX = {
    click: () => tone(520, 0.05, 'triangle', 0.06),
    hit: () => { noise(0.12, 0.25, 900); tone(110, 0.12, 'sine', 0.2, -60); },
    crit: () => { noise(0.18, 0.3, 2400); tone(180, 0.2, 'sawtooth', 0.08, -120); },
    hurt: () => { noise(0.2, 0.3, 500); tone(80, 0.25, 'sine', 0.25, -40); },
    block: () => { tone(900, 0.08, 'square', 0.05); tone(600, 0.1, 'triangle', 0.08, 0, 0.03); },
    heal: () => { tone(440, 0.25, 'sine', 0.08, 220); tone(660, 0.3, 'sine', 0.06, 220, 0.08); },
    coin: () => { tone(1320, 0.08, 'triangle', 0.07); tone(1760, 0.12, 'triangle', 0.06, 0, 0.06); },
    upgrade: () => { [392, 523, 659].forEach((f, i) => tone(f, 0.18, 'triangle', 0.07, 0, i * 0.07)); },
    win: () => { [392, 494, 587, 784].forEach((f, i) => tone(f, 0.3, 'triangle', 0.07, 0, i * 0.1)); },
    lose: () => { [330, 262, 196].forEach((f, i) => tone(f, 0.45, 'sine', 0.09, -20, i * 0.18)); },
  };
  const sfx = name => SFX[name] && SFX[name]();

  // ---------- 浮動文字、震動 ----------
  function float(el, text, cls = '') {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const d = document.createElement('div');
    d.className = 'float ' + cls;
    d.textContent = text;
    d.style.left = (r.left + r.width / 2 + rand(-24, 24)) + 'px';
    d.style.top = (r.top + r.height * 0.35) + 'px';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1100);
  }
  function anim(el, cls, ms = 400) {
    if (!el) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), ms);
  }

  // ---------- Toast 與對話框 ----------
  function toast(msg, kind = '') {
    const box = document.getElementById('toasts');
    const d = document.createElement('div');
    d.className = 'toast ' + kind; d.innerHTML = msg;
    box.appendChild(d);
    while (box.children.length > 4) box.firstChild.remove(); // 最多同時顯示 4 則
    setTimeout(() => d.classList.add('out'), 2600);
    setTimeout(() => d.remove(), 3100);
  }

  // buttons: [{label, value, cls}]
  function modal(html, buttons = [{ label: '確定', value: true, cls: 'primary' }], opts = {}) {
    return new Promise(resolve => {
      const wrap = document.createElement('div');
      wrap.className = 'modal-wrap';
      wrap.innerHTML = `<div class="modal ${opts.cls || ''}">${html}<div class="modal-btns ${opts.cls === 'vertical' ? 'vertical' : ''}">` +
        buttons.map((b, i) => `<button class="btn ${b.cls || ''}" data-i="${i}">${b.label}</button>`).join('') + '</div></div>';
      document.body.appendChild(wrap);
      requestAnimationFrame(() => wrap.classList.add('in'));
      wrap.querySelectorAll('[data-i]').forEach(btn => btn.onclick = () => {
        sfx('click');
        wrap.classList.remove('in');
        setTimeout(() => wrap.remove(), 200);
        resolve(buttons[+btn.dataset.i].value);
      });
    });
  }

  return { setTheme, sfx, float, anim, toast, modal };
})();
