// 蒼穹戰機的美術：所有機體、車輛、艦艇與子彈都以向量繪製，載入時預先算成高解析度點陣圖。
// 座標單位與遊戲相同（畫面寬 360 單位），機首朝上（-y）。

export const RES = Math.min(2, window.devicePixelRatio || 1) * 2.2; // 每單位幾個像素

// 建立一張以中心為原點的畫布
function canvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * RES); c.height = Math.ceil(h * RES);
  const g = c.getContext('2d');
  g.scale(RES, RES); g.translate(w / 2, h / 2);
  g.lineJoin = 'round'; g.lineCap = 'round';
  draw(g);
  return { c, w, h };
}

// 對稱外形：給右半邊的點（x ≥ 0），自動鏡射
function sym(g, half) {
  g.beginPath();
  half.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  for (let i = half.length - 1; i >= 0; i--) g.lineTo(-half[i][0], half[i][1]);
  g.closePath();
}
function poly(g, pts) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); }

const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, gg = (n >> 8) & 255, b = n & 255;
  const f = (v) => Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k))));
  return `rgb(${f(r)},${f(gg)},${f(b)})`;
};

// 圓柱形明暗：左暗右亮再轉暗（光從左上來）
function cylinder(g, x0, x1, base) {
  const gr = g.createLinearGradient(x0, 0, x1, 0);
  gr.addColorStop(0, shade(base, -0.45)); gr.addColorStop(0.32, shade(base, 0.22)); gr.addColorStop(0.55, shade(base, 0.05)); gr.addColorStop(1, shade(base, -0.5));
  return gr;
}
// 平面明暗：由上往下、由左往右略暗
function plate(g, w, h, base) {
  const gr = g.createLinearGradient(-w, -h, w, h);
  gr.addColorStop(0, shade(base, 0.18)); gr.addColorStop(0.5, base); gr.addColorStop(1, shade(base, -0.35));
  return gr;
}
function panelLines(g, lines, a = 0.28) {
  g.save(); g.strokeStyle = `rgba(0,0,0,${a})`; g.lineWidth = 0.35;
  for (const l of lines) { g.beginPath(); l.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
  g.restore();
}
function mirrorLines(lines) { return lines.concat(lines.map((l) => l.map(([x, y]) => [-x, y]))); }
function edge(g, a = 0.55, w = 0.5) { g.strokeStyle = `rgba(10,12,14,${a})`; g.lineWidth = w; g.stroke(); }

function canopy(g, x, y, w, h) {
  g.beginPath(); g.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
  const gr = g.createLinearGradient(x - w, y - h, x + w, y + h);
  gr.addColorStop(0, '#9fd2f0'); gr.addColorStop(0.35, '#2b5d86'); gr.addColorStop(0.7, '#0f2440'); gr.addColorStop(1, '#06101c');
  g.fillStyle = gr; g.fill(); edge(g, 0.7, 0.45);
  g.beginPath(); g.ellipse(x - w * 0.35, y - h * 0.35, w * 0.22, h * 0.35, -0.3, 0, Math.PI * 2);
  g.fillStyle = 'rgba(255,255,255,0.55)'; g.fill();
}
function nozzle(g, x, y, r) {
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2);
  const gr = g.createRadialGradient(x, y, r * 0.2, x, y, r);
  gr.addColorStop(0, '#120c08'); gr.addColorStop(0.65, '#2a2622'); gr.addColorStop(0.8, '#8a8478'); gr.addColorStop(1, '#3a3632');
  g.fillStyle = gr; g.fill();
}

// ---------------------------------------------------------------------------
// 戰機（玩家與敵機共用的外形描述）

const JETS = {
  // 玩家：前翼加三角翼的雙發多用途戰機
  player: {
    len: 46, span: 36, base: '#8c99a6', accent: '#c9a55f', camo: null,
    wing: [[2.5, -6], [17.5, 9], [17.5, 12.5], [4, 12]],
    canard: [[3, -12], [9, -7.5], [9, -6], [3, -7]],
    tail: [[3, 13], [10.5, 19.5], [10.5, 21.5], [3, 20]],
    body: [[0, -23], [1.6, -19], [3.2, -12], [4.4, -2], [4.6, 12], [4, 21], [2.8, 22.5]],
    canopy: [0, -12, 1.9, 4.6], nozzles: [[-1.9, 22.6, 1.7], [1.9, 22.6, 1.7]], fins: [[2.6, 10, 5.2, 20], [-2.6, 10, -5.2, 20]],
    stores: [[12.5, 4], [8.5, 1]],
  },
  // 小型敵機：後掠翼單發
  fighter: {
    len: 30, span: 26, base: '#7d7b5a', accent: '#a84034', camo: ['#5d5c40', '#97936a'],
    wing: [[2, -2], [12.5, 6.5], [12.5, 9], [2.6, 7.5]],
    tail: [[2, 10], [6.5, 13.5], [6.5, 15], [2, 14]],
    body: [[0, -15], [1.4, -11], [2.6, -5], [3, 8], [2.4, 14.5], [1.6, 15.2]],
    canopy: [0, -6.5, 1.4, 3.2], nozzles: [[0, 15.2, 1.6]], fins: [[0, 8, 0, 15]],
  },
  // 重型敵機：雙發、寬翼
  heavy: {
    len: 40, span: 38, base: '#6c7480', accent: '#a84034', camo: ['#535a64', '#8a929c'],
    wing: [[3, -6], [18.5, 4], [18.5, 8.5], [3.5, 9]],
    tail: [[3, 11], [9, 15.5], [9, 18], [3, 17]],
    body: [[0, -20], [2, -15], [3.8, -7], [5, 3], [5, 14], [4, 18.5], [2.6, 19.5]],
    canopy: [0, -10, 1.8, 4], nozzles: [[-2, 19.6, 1.8], [2, 19.6, 1.8]], fins: [[3.2, 9, 5.5, 17], [-3.2, 9, -5.5, 17]],
    stores: [[13, 2], [8, 0]],
  },
};

function paintJet(g, s, pal) {
  const base = pal.base || s.base;
  const wingFill = (half) => {
    sym(g, half);
    g.fillStyle = plate(g, s.span / 2, s.len / 3, base); g.fill();
    if (s.camo || pal.camo) {
      // 迷彩斑塊
      g.save(); sym(g, half); g.clip();
      const cm = pal.camo || s.camo;
      let seed = 7;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 26; i++) {
        g.beginPath(); g.ellipse((rnd() - 0.5) * s.span, (rnd() - 0.5) * s.len, 2 + rnd() * 4, 1.4 + rnd() * 2.4, rnd() * 3, 0, Math.PI * 2);
        g.fillStyle = cm[i % cm.length]; g.globalAlpha = 0.55; g.fill();
      }
      g.restore();
    }
    sym(g, half); edge(g);
  };
  // 外掛彈藥
  for (const [x, y] of s.stores || []) for (const sx of [x, -x]) {
    g.beginPath(); g.roundRect(sx - 0.8, y - 4.5, 1.6, 9, 0.8);
    g.fillStyle = cylinder(g, sx - 0.8, sx + 0.8, '#d8d4c8'); g.fill(); edge(g, 0.5, 0.3);
    g.fillStyle = '#7a2a22'; g.fillRect(sx - 0.8, y - 4.5, 1.6, 1.2);
  }
  wingFill(s.wing);
  if (s.canard) wingFill(s.canard);
  wingFill(s.tail);
  // 主翼前緣高光、翼尖色帶
  g.save(); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 0.5;
  for (const k of [1, -1]) { g.beginPath(); g.moveTo(s.wing[0][0] * k, s.wing[0][1]); g.lineTo(s.wing[1][0] * k, s.wing[1][1]); g.stroke(); }
  g.restore();
  g.fillStyle = pal.accent || s.accent;
  for (const k of [1, -1]) {
    const [x1, y1] = s.wing[1], [x2, y2] = s.wing[2];
    g.beginPath(); g.moveTo(x1 * k, y1); g.lineTo(x2 * k, y2); g.lineTo((x2 - 2.2) * k, y2 - 0.2); g.lineTo((x1 - 2.2) * k, y1 - 1.6 + 0.4); g.closePath(); g.fill();
  }
  panelLines(g, mirrorLines([[[s.wing[0][0] + 3, s.wing[0][1] + 5], [s.wing[1][0] - 3, s.wing[1][1] + 1.6]], [[s.wing[0][0] + 1.5, s.wing[3][1] - 1], [s.wing[2][0] - 2, s.wing[2][1] - 0.6]]]));
  // 機身
  const bx = Math.max(...s.body.map((p) => p[0]));
  sym(g, s.body);
  g.fillStyle = cylinder(g, -bx, bx, base); g.fill(); edge(g);
  panelLines(g, [[[-bx * 0.8, -s.len * 0.12], [bx * 0.8, -s.len * 0.12]], [[-bx, s.len * 0.18], [bx, s.len * 0.18]], [[0, -s.len * 0.05], [0, s.len * 0.45]]], 0.22);
  // 機首雷達罩
  g.save(); sym(g, s.body); g.clip();
  g.fillStyle = 'rgba(30,32,36,0.55)'; g.fillRect(-bx, s.body[0][1], bx * 2, s.len * 0.09);
  g.restore();
  // 垂直尾翼（俯視只看到一道）
  for (const [x0, y0, x1, y1] of s.fins || []) {
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1);
    g.strokeStyle = shade(base, -0.55); g.lineWidth = 1.5; g.stroke();
    g.strokeStyle = shade(base, 0.3); g.lineWidth = 0.45; g.stroke();
  }
  // 機身識別帶
  g.save(); sym(g, s.body); g.clip();
  g.fillStyle = pal.accent || s.accent; g.globalAlpha = 0.85; g.fillRect(-bx, s.len * 0.02, bx * 2, 1.1);
  g.restore();
  if (s.canopy) canopy(g, ...s.canopy);
  for (const [x, y, r] of s.nozzles) nozzle(g, x, y, r);
}

// ---------------------------------------------------------------------------
// 直升機（旋翼即時繪製）
function paintHeli(g, pal) {
  const base = pal.base || '#5f6b4a';
  // 尾桁
  g.beginPath(); g.roundRect(-1.1, 4, 2.2, 17, 1);
  g.fillStyle = cylinder(g, -1.1, 1.1, base); g.fill(); edge(g);
  poly(g, [[-4.5, 19], [4.5, 19], [4.5, 21], [-4.5, 21]]); g.fillStyle = plate(g, 4, 2, base); g.fill(); edge(g);
  // 短翼與火箭莢艙
  poly(g, [[-9, -1], [9, -1], [9, 2], [-9, 2]]); g.fillStyle = plate(g, 9, 2, base); g.fill(); edge(g);
  for (const x of [-7.5, 7.5]) { g.beginPath(); g.roundRect(x - 1.3, -3.2, 2.6, 6.5, 1.2); g.fillStyle = cylinder(g, x - 1.3, x + 1.3, '#3d3f3a'); g.fill(); edge(g, 0.6, 0.3); }
  // 機身
  g.beginPath(); g.ellipse(0, -1, 4.2, 8.5, 0, 0, Math.PI * 2);
  g.fillStyle = cylinder(g, -4.2, 4.2, base); g.fill(); edge(g);
  canopy(g, 0, -5.2, 2.2, 3.2);
  g.beginPath(); g.ellipse(0, 3, 2.4, 2.4, 0, 0, Math.PI * 2); g.fillStyle = shade(base, -0.35); g.fill();
}

// ---------------------------------------------------------------------------
// 地面載具：車身與砲塔分開

function treads(g, x, y0, y1, w) {
  g.beginPath(); g.roundRect(x - w / 2, y0, w, y1 - y0, w * 0.4);
  g.fillStyle = '#26241f'; g.fill();
  g.save(); g.clip();
  g.strokeStyle = 'rgba(120,112,96,0.55)'; g.lineWidth = 0.5;
  for (let y = y0 + 0.8; y < y1; y += 1.6) { g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x + w / 2, y); g.stroke(); }
  g.restore();
}
function paintTankHull(g, pal, L = 24, W = 16) {
  const base = pal.base;
  treads(g, -W / 2 + 2, -L / 2, L / 2, 4); treads(g, W / 2 - 2, -L / 2, L / 2, 4);
  g.beginPath(); g.roundRect(-W / 2 + 3, -L / 2 + 1, W - 6, L - 2, 1.5);
  g.fillStyle = plate(g, W / 2, L / 2, base); g.fill(); edge(g);
  // 引擎蓋格柵、備用油桶
  g.fillStyle = shade(base, -0.3);
  for (let i = 0; i < 4; i++) g.fillRect(-W / 2 + 5, L / 2 - 6 + i * 1.3, W - 10, 0.6);
  g.beginPath(); g.arc(-W / 2 + 5.2, -L / 2 + 3.5, 1.2, 0, Math.PI * 2); g.fillStyle = shade(base, -0.15); g.fill(); edge(g, 0.5, 0.3);
}
function paintTurret(g, pal, r = 5.5, barrel = 14, twin = false) {
  const base = pal.base;
  const bs = twin ? [-1.4, 1.4] : [0];
  for (const x of bs) {
    g.beginPath(); g.roundRect(x - 0.8, -barrel, 1.6, barrel, 0.6);
    g.fillStyle = cylinder(g, x - 0.8, x + 0.8, shade(base, -0.1)); g.fill(); edge(g, 0.6, 0.3);
    g.fillStyle = shade(base, -0.5); g.fillRect(x - 1, -barrel, 2, 1.4);
  }
  g.beginPath(); g.moveTo(-r, -r * 0.4); g.lineTo(-r * 0.55, -r); g.lineTo(r * 0.55, -r); g.lineTo(r, -r * 0.4); g.lineTo(r, r * 0.6); g.lineTo(r * 0.6, r); g.lineTo(-r * 0.6, r); g.lineTo(-r, r * 0.6); g.closePath();
  const gr = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.3);
  gr.addColorStop(0, shade(base, 0.3)); gr.addColorStop(0.6, base); gr.addColorStop(1, shade(base, -0.45));
  g.fillStyle = gr; g.fill(); edge(g);
  g.beginPath(); g.arc(r * 0.25, r * 0.2, r * 0.28, 0, Math.PI * 2); g.fillStyle = shade(base, -0.3); g.fill(); edge(g, 0.4, 0.3);
}
// 固定砲台底座（混凝土）
function paintPad(g, r = 9) {
  g.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  g.closePath();
  const gr = g.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r * 1.2);
  gr.addColorStop(0, '#b7b2a6'); gr.addColorStop(1, '#6a665d');
  g.fillStyle = gr; g.fill(); edge(g, 0.5, 0.6);
  g.beginPath(); g.arc(0, 0, r * 0.62, 0, Math.PI * 2); g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 0.6; g.stroke();
}

// 艦艇：船身（俯視）
function hullPath(g, L, W) {
  g.beginPath();
  g.moveTo(0, -L / 2);
  g.bezierCurveTo(W * 0.45, -L * 0.36, W / 2, -L * 0.15, W / 2, L * 0.05);
  g.lineTo(W / 2, L * 0.42); g.quadraticCurveTo(W / 2, L / 2, W * 0.3, L / 2); g.lineTo(-W * 0.3, L / 2); g.quadraticCurveTo(-W / 2, L / 2, -W / 2, L * 0.42);
  g.lineTo(-W / 2, L * 0.05); g.bezierCurveTo(-W / 2, -L * 0.15, -W * 0.45, -L * 0.36, 0, -L / 2);
  g.closePath();
}
function paintHull(g, L, W, base, deck = '#8b8070') {
  hullPath(g, L, W);
  g.fillStyle = cylinder(g, -W / 2, W / 2, base); g.fill(); edge(g, 0.7, 0.7);
  // 甲板
  g.save(); g.scale(0.84, 0.95); hullPath(g, L, W); g.restore();
  g.fillStyle = plate(g, W / 2, L / 2, deck); g.fill();
  g.save(); g.scale(0.84, 0.95); hullPath(g, L, W); g.clip(); g.restore();
  g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 0.3;
  for (let x = -W / 2; x < W / 2; x += 1.4) { g.beginPath(); g.moveTo(x, -L / 2); g.lineTo(x, L / 2); g.stroke(); }
}
function block(g, x, y, w, h, base) {
  g.beginPath(); g.roundRect(x - w / 2, y - h / 2, w, h, 1);
  g.fillStyle = plate(g, w / 2, h / 2, base); g.fill(); edge(g, 0.6, 0.5);
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x - w / 2 + 0.6, y - h / 2 + 0.6, w - 1.2, 0.8);
}

// ---------------------------------------------------------------------------
// 子彈與道具

function glowDot(r, inner, outer) {
  return canvas(r * 2.6, r * 2.6, (g) => {
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, r * 1.3);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.32, inner); gr.addColorStop(0.62, outer); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 1.3, 0, Math.PI * 2); g.fill();
  });
}
function needle(len, w, inner, outer) {
  return canvas(w * 3, len + w * 2, (g) => {
    g.shadowColor = outer; g.shadowBlur = w * 2 * RES;
    g.beginPath(); g.ellipse(0, 0, w / 2, len / 2, 0, 0, Math.PI * 2); g.fillStyle = inner; g.fill();
    g.shadowBlur = 0;
    g.beginPath(); g.ellipse(0, 0, w / 4, len / 2.4, 0, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill();
  });
}
function itemCap(color, letter) {
  return canvas(20, 20, (g) => {
    g.shadowColor = color; g.shadowBlur = 5 * RES;
    g.beginPath(); g.roundRect(-8, -6.5, 16, 13, 4);
    const gr = g.createLinearGradient(0, -6.5, 0, 6.5);
    gr.addColorStop(0, shade(color, 0.55)); gr.addColorStop(0.45, color); gr.addColorStop(1, shade(color, -0.5));
    g.fillStyle = gr; g.fill(); g.shadowBlur = 0;
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 0.7; g.stroke();
    g.fillStyle = '#fff'; g.font = '700 9.5px "LG Latin", Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 1.5 * RES; g.fillText(letter, 0, 0.6);
  });
}
function medal() {
  return canvas(16, 16, (g) => {
    g.shadowColor = '#ffd27a'; g.shadowBlur = 4 * RES;
    g.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 3.4 : 6.6; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath();
    const gr = g.createLinearGradient(-6, -6, 6, 6); gr.addColorStop(0, '#fff3c4'); gr.addColorStop(0.5, '#e0b24f'); gr.addColorStop(1, '#8a6420');
    g.fillStyle = gr; g.fill(); g.shadowBlur = 0; g.strokeStyle = 'rgba(80,50,10,0.7)'; g.lineWidth = 0.5; g.stroke();
  });
}

// ---------------------------------------------------------------------------
// 陰影與受擊閃白版本
function silhouette(sp, color) {
  const c = document.createElement('canvas'); c.width = sp.c.width; c.height = sp.c.height;
  const g = c.getContext('2d');
  g.drawImage(sp.c, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  return { c, w: sp.w, h: sp.h };
}
function withFx(sp) { sp.flash = silhouette(sp, 'rgba(255,255,255,0.85)'); sp.shadow = silhouette(sp, 'rgba(0,0,0,1)'); return sp; }

// 依各關配色建立所有圖
export function buildSprites() {
  const S = {};
  S.player = withFx(canvas(42, 52, (g) => paintJet(g, JETS.player, {})));
  const enemyPal = {
    olive: { base: '#7d7b5a', camo: ['#5d5c40', '#97936a'], accent: '#a84034' },
    sand: { base: '#b39d72', camo: ['#8f7a52', '#cbb98e'], accent: '#7d3a2c' },
    grey: { base: '#7b838d', camo: ['#5f666f', '#9aa2ab'], accent: '#a84034' },
    snow: { base: '#c4cbd0', camo: ['#9aa3aa', '#e3e7ea'], accent: '#6e2f2a' },
    dark: { base: '#4a4f58', camo: ['#363a41', '#62686f'], accent: '#b6402f' },
  };
  for (const [k, p] of Object.entries(enemyPal)) {
    S['fighter_' + k] = withFx(canvas(30, 34, (g) => paintJet(g, JETS.fighter, p)));
    S['heavy_' + k] = withFx(canvas(42, 44, (g) => paintJet(g, JETS.heavy, p)));
    S['heli_' + k] = withFx(canvas(22, 46, (g) => paintHeli(g, p)));
    S['hull_' + k] = withFx(canvas(18, 26, (g) => paintTankHull(g, { base: p.base })));
    S['turret_' + k] = withFx(canvas(16, 34, (g) => { g.translate(0, 0); paintTurret(g, { base: shade(p.base, -0.05) }); }));
  }
  S.pad = canvas(20, 20, (g) => paintPad(g));
  S.aa = withFx(canvas(16, 34, (g) => paintTurret(g, { base: '#6a6e66' }, 5, 12, true)));
  S.truck = withFx(canvas(12, 22, (g) => {
    g.beginPath(); g.roundRect(-4.5, -10, 9, 7, 1.5); g.fillStyle = plate(g, 4, 3, '#6b6a4c'); g.fill(); edge(g);
    canopy(g, 0, -8.2, 2.6, 0.9);
    g.beginPath(); g.roundRect(-5, -2.5, 10, 12.5, 1); g.fillStyle = plate(g, 5, 6, '#7c7556'); g.fill(); edge(g);
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 0.4; for (let y = -1; y < 10; y += 2.2) { g.beginPath(); g.moveTo(-5, y); g.lineTo(5, y); g.stroke(); }
  }));
  S.boat = withFx(canvas(16, 42, (g) => {
    paintHull(g, 38, 12, '#6e767c', '#8d8f88');
    block(g, 0, 2, 6, 8, '#9aa0a2');
    canopy(g, 0, -0.5, 2.2, 1);
  }));
  S.boatTurret = withFx(canvas(12, 24, (g) => paintTurret(g, { base: '#7d8488' }, 3.6, 9)));
  // 第一關頭目：巡洋艦船身（砲塔另外畫）
  S.cruiser = withFx(canvas(84, 236, (g) => {
    paintHull(g, 230, 76, '#5d666d', '#867f72');
    block(g, 0, -10, 30, 44, '#8e969a'); block(g, 0, -16, 20, 22, '#a3aaad'); block(g, 0, 30, 24, 26, '#8e969a');
    g.beginPath(); g.arc(0, 12, 6, 0, Math.PI * 2); g.fillStyle = cylinder(g, -6, 6, '#555b5f'); g.fill(); edge(g);
    g.beginPath(); g.arc(0, 12, 3.6, 0, Math.PI * 2); g.fillStyle = '#1b1c1d'; g.fill();
    for (const y of [-60, 70]) { g.beginPath(); g.arc(0, y, 13, 0, Math.PI * 2); g.strokeStyle = 'rgba(255,255,255,0.15)'; g.lineWidth = 0.6; g.stroke(); }
    // 直升機甲板
    g.beginPath(); g.arc(0, 92, 12, 0, Math.PI * 2); g.strokeStyle = 'rgba(240,235,220,0.55)'; g.lineWidth = 0.9; g.stroke();
    g.fillStyle = 'rgba(240,235,220,0.55)'; g.font = '700 10px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('H', 0, 92.5);
  }));
  S.bigTurret = withFx(canvas(26, 52, (g) => paintTurret(g, { base: '#7a8286' }, 9, 22, true)));
  // 第二關頭目：重型戰車
  S.tankBoss = withFx(canvas(112, 150, (g) => {
    for (const x of [-46, 46]) treads(g, x, -70, 70, 16);
    g.beginPath(); g.roundRect(-38, -66, 76, 132, 6); g.fillStyle = plate(g, 38, 66, '#6f6c4d'); g.fill(); edge(g, 0.7, 0.8);
    block(g, 0, 48, 56, 22, '#5d5b40');
    g.fillStyle = 'rgba(0,0,0,0.3)'; for (let i = 0; i < 6; i++) g.fillRect(-24, 41 + i * 2.6, 48, 1.1);
    for (const [x, y] of [[-26, -50], [26, -50]]) { g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fillStyle = shade('#6f6c4d', -0.25); g.fill(); edge(g, 0.4, 0.4); }
  }));
  S.bossTurretBig = withFx(canvas(44, 96, (g) => paintTurret(g, { base: '#7b7856' }, 17, 44)));
  S.bossTurretSmall = withFx(canvas(22, 44, (g) => paintTurret(g, { base: '#7b7856' }, 7.5, 18, true)));
  // 第三關頭目：沙漠要塞（固定在地面）
  S.fortress = canvas(240, 200, (g) => {
    g.beginPath(); g.moveTo(-110, -60); g.lineTo(-60, -95); g.lineTo(60, -95); g.lineTo(110, -60); g.lineTo(110, 70); g.lineTo(70, 95); g.lineTo(-70, 95); g.lineTo(-110, 70); g.closePath();
    g.fillStyle = plate(g, 110, 95, '#b9a27a'); g.fill(); edge(g, 0.6, 1.2);
    g.save(); g.clip();
    g.strokeStyle = 'rgba(60,40,20,0.22)'; g.lineWidth = 0.6;
    for (let y = -95; y < 95; y += 6) { g.beginPath(); g.moveTo(-110, y); g.lineTo(110, y); g.stroke(); }
    g.restore();
    block(g, 0, 0, 120, 100, '#a68e66'); block(g, 0, 0, 70, 60, '#c2ad86');
    for (const [x, y] of [[-80, -55], [80, -55], [-80, 60], [80, 60]]) { g.beginPath(); g.arc(x, y, 18, 0, Math.PI * 2); g.fillStyle = plate(g, 18, 18, '#9d8660'); g.fill(); edge(g, 0.6, 0.8); }
  });
  S.core = withFx(canvas(40, 40, (g) => {
    g.beginPath(); g.arc(0, 0, 16, 0, Math.PI * 2); g.fillStyle = cylinder(g, -16, 16, '#5b5f63'); g.fill(); edge(g, 0.7, 0.8);
    const gr = g.createRadialGradient(0, 0, 1, 0, 0, 10); gr.addColorStop(0, '#fff1c4'); gr.addColorStop(0.4, '#f08a3a'); gr.addColorStop(1, '#5a1608');
    g.beginPath(); g.arc(0, 0, 10, 0, Math.PI * 2); g.fillStyle = gr; g.fill();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.beginPath(); g.moveTo(Math.cos(a) * 11, Math.sin(a) * 11); g.lineTo(Math.cos(a) * 15.5, Math.sin(a) * 15.5); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1; g.stroke(); }
  }));
  // 第四關頭目：重轟炸機
  S.bomber = withFx(canvas(300, 150, (g) => {
    const base = '#c3c9cf';
    sym(g, [[6, -30], [146, 18], [146, 28], [100, 30], [8, 14]]);
    g.fillStyle = plate(g, 146, 30, base); g.fill(); edge(g, 0.6, 0.8);
    panelLines(g, mirrorLines([[[20, -16], [140, 20]], [[14, 6], [120, 26]]]), 0.2);
    sym(g, [[5, 38], [34, 54], [34, 60], [5, 56]]); g.fillStyle = plate(g, 34, 10, base); g.fill(); edge(g, 0.6, 0.6);
    sym(g, [[0, -70], [5, -62], [8, -45], [9, 30], [7, 60], [4, 68]]); g.fillStyle = cylinder(g, -9, 9, base); g.fill(); edge(g, 0.6, 0.8);
    canopy(g, 0, -56, 4, 6);
    g.fillStyle = '#7a2a22'; g.fillRect(-140, 20, 12, 7); g.fillRect(128, 20, 12, 7);
  }));
  S.engine = withFx(canvas(22, 40, (g) => {
    g.beginPath(); g.roundRect(-6, -16, 12, 32, 5); g.fillStyle = cylinder(g, -6, 6, '#9aa1a8'); g.fill(); edge(g, 0.6, 0.6);
    g.beginPath(); g.ellipse(0, -15, 5, 2.2, 0, 0, Math.PI * 2); g.fillStyle = '#1d1f22'; g.fill();
    nozzle(g, 0, 16, 4);
  }));
  // 第五關頭目：空中要塞（飛翼）
  S.wing = withFx(canvas(340, 200, (g) => {
    const base = '#4c525b';
    sym(g, [[0, -90], [40, -60], [168, 40], [168, 52], [120, 70], [70, 54], [36, 80], [0, 66]]);
    g.fillStyle = plate(g, 168, 90, base); g.fill(); edge(g, 0.7, 1);
    g.save(); sym(g, [[0, -90], [40, -60], [168, 40], [168, 52], [120, 70], [70, 54], [36, 80], [0, 66]]); g.clip();
    g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 0.6;
    for (let i = -10; i < 30; i++) { g.beginPath(); g.moveTo(-170, i * 8 - 90); g.lineTo(170, i * 8 - 30); g.stroke(); }
    g.restore();
    panelLines(g, mirrorLines([[[0, -40], [140, 44]], [[30, 10], [100, 56]]]), 0.35);
    g.fillStyle = '#b6402f'; for (const x of [-150, 140]) g.fillRect(x, 42, 10, 6);
    canopy(g, 0, -64, 6, 10);
  }));
  // 子彈
  S.vulcan = needle(9, 2.2, '#fff0b0', '#ffb33a');
  S.vulcanSide = needle(7, 1.8, '#ffe2a0', '#ff8a2a');
  S.missile = canvas(6, 14, (g) => {
    g.beginPath(); g.roundRect(-1.1, -5, 2.2, 10, 1); g.fillStyle = cylinder(g, -1.1, 1.1, '#e2ded4'); g.fill(); edge(g, 0.6, 0.3);
    g.fillStyle = '#9a3326'; g.beginPath(); g.moveTo(-1.1, -3.6); g.lineTo(0, -6); g.lineTo(1.1, -3.6); g.fill();
    poly(g, [[-2.4, 5], [-1.1, 2.5], [1.1, 2.5], [2.4, 5]]); g.fillStyle = '#8a8a86'; g.fill();
  });
  S.ebSmall = glowDot(3, '#ffb0d0', 'rgba(230,40,110,0.75)');
  S.ebMid = glowDot(4.4, '#ffc4a0', 'rgba(240,90,30,0.8)');
  S.ebBig = glowDot(7, '#e0d0ff', 'rgba(140,70,255,0.8)');
  S.ebNeedle = needle(11, 2.6, '#c8f0ff', 'rgba(40,160,255,0.9)');
  S.spark = glowDot(2, '#fff2c0', 'rgba(255,160,40,0.7)');
  S.itemV = itemCap('#c8402f', 'V');
  S.itemL = itemCap('#2f78c8', 'L');
  S.itemM = itemCap('#3c8f4e', 'M');
  S.itemB = itemCap('#c08a2a', 'B');
  S.itemP = itemCap('#7b5bb0', 'P');
  S.medal = medal();
  return S;
}

// 大廳封面用：只建玩家機與一種敵機
export function coverSprites() {
  return {
    player: withFx(canvas(42, 52, (g) => paintJet(g, JETS.player, {}))),
    fighter: withFx(canvas(30, 34, (g) => paintJet(g, JETS.fighter, { base: '#7b838d', camo: ['#5f666f', '#9aa2ab'], accent: '#a84034' }))),
  };
}

// 畫一張精靈：中心對齊，可旋轉、縮放
export function blit(ctx, sp, x, y, rot = 0, scale = 1, alpha = 1) {
  if (!sp) return;
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  if (alpha !== 1) ctx.globalAlpha *= alpha;
  ctx.drawImage(sp.c, (-sp.w / 2) * scale, (-sp.h / 2) * scale, sp.w * scale, sp.h * scale);
  ctx.restore();
}

// 旋翼：半透明圓盤加四片槳葉
export function rotor(ctx, x, y, r, t) {
  ctx.save(); ctx.translate(x, y);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(40,40,40,0.18)'; ctx.fill();
  ctx.rotate(t * 40);
  ctx.strokeStyle = 'rgba(25,25,25,0.55)'; ctx.lineWidth = 1.1;
  for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r, 0); ctx.stroke(); }
  ctx.restore();
}
