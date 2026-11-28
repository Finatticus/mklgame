// 五個關卡：地形圖層與出場表。d 為飛行距離（捲動速度約每秒 34 單位）。
import { pathX } from './terrain.js';

// 蜿蜒的路徑
function wind(from, to, x0, amp, step = 380, ph = 0) {
  const pts = [];
  for (let d = from, i = 0; d <= to + step; d += step, i++) pts.push([Math.max(40, Math.min(320, x0 + Math.sin(i * 1.3 + ph) * amp)), d]);
  return pts;
}
const away = (path, w) => (x, d) => Math.abs(x - pathX(path, d)) > w;
const both = (...fs) => (x, d) => fs.every((f) => f(x, d));

// 出場表小工具
function script() {
  const S = [];
  const at = (d, type, o = {}) => S.push({ d, type, ...o });
  return { S, at, done: () => S.sort((a, b) => a.d - b.d) };
}

// ---------------- 第一關：海岸 ----------------
function stage1() {
  const road = wind(1500, 4300, 190, 80, 420);
  const { at, done } = script();
  at(260, 'fighter', { path: 'curveL', n: 5, gap: 0.3 });
  at(420, 'fighter', { path: 'curveR', n: 5, gap: 0.3 });
  at(620, 'boat', { x: 90, vd: 12 }); at(660, 'boat', { x: 270, vd: 10 });
  at(760, 'fighter', { path: 'dive', n: 3, gap: 0.5 });
  at(900, 'heli', { carrier: true, x: 180, drop: 'W' });
  at(1040, 'fighter', { path: 'vee', x: 180, n: 5, gap: 0.12 });
  at(1180, 'boat', { x: 200, vd: 16 });
  at(1260, 'heavy', { x: 120, ty: 120 });
  at(1380, 'fighter', { path: 'swoopR', x: 60, n: 4, gap: 0.25 });
  at(1500, 'fighter', { path: 'swoopL', x: 300, n: 4, gap: 0.25 });
  at(1650, 'tank', { road, n: 3, vd: -10 });
  at(1720, 'aa', { x: 60 }); at(1760, 'aa', { x: 300 });
  at(1850, 'fighter', { path: 'loop', x: 90, n: 3, gap: 0.3 }); at(1880, 'fighter', { path: 'loop', x: 270, n: 3, gap: 0.3 });
  at(2000, 'heli', { x: 100 }); at(2020, 'heli', { x: 260 });
  at(2150, 'heli', { carrier: true, x: 180, drop: 'M' });
  at(2250, 'tank', { x: 70, rot: Math.PI }); at(2280, 'tank', { x: 290, rot: Math.PI });
  at(2400, 'heavy', { x: 240, ty: 140 });
  at(2520, 'fighter', { path: 'curveL', n: 6, gap: 0.25 });
  at(2700, 'truck', { road, n: 4, vd: 16, drop: 'P' });
  at(2800, 'fighter', { path: 'dive', n: 4, gap: 0.35 });
  at(2950, 'aa', { x: 80 }); at(2990, 'aa', { x: 280 });
  at(3100, 'tank', { road, n: 4, vd: -12 });
  at(3250, 'fighter', { path: 'vee', x: 120, n: 5, gap: 0.12 }); at(3330, 'fighter', { path: 'vee', x: 240, n: 5, gap: 0.12 });
  at(3450, 'heli', { x: 70 }); at(3470, 'heli', { x: 180 }); at(3490, 'heli', { x: 290 });
  at(3700, 'tank', { x: 230, rot: Math.PI }); at(3720, 'tank', { x: 270, rot: Math.PI }); at(3740, 'tank', { x: 310, rot: Math.PI });
  at(3800, 'heli', { carrier: true, x: 120, drop: 'B' });
  at(3900, 'heavy', { x: 180, ty: 110 });
  at(4150, 'fighter', { path: 'curveR', n: 6, gap: 0.25 });
  at(4380, 'boat', { x: 80, vd: 12 }); at(4420, 'boat', { x: 280, vd: 12 });
  at(4600, 'heli', { carrier: true, x: 180, drop: 'W' });
  at(4950, 'boss', { kind: 'cruiser' });
  return {
    title: '第一關 · 海岸', sub: '突破海岸防線', pal: 'olive', speed: 34, bossName: '巡洋艦「海神」',
    grade: 'rgba(30,50,60,0.06)',
    terrain: [
      { t: 'fill', tex: 'aerial_grass_rock', from: 1380, to: 4320, tint: 'rgba(40,60,20,0.18)' },
      { t: 'fill', tex: 'aerial_beach_01', from: 1330, to: 1520, wav: 16 },
      { t: 'fill', tex: 'aerial_beach_01', from: 4200, to: 4400, wav: 16, seed: 3 },
      { t: 'rocks', from: 1360, to: 1560, n: 8, size: 4, light: '#cfc6b4' },
      { t: 'sea', from: -400, to: 1400 },
      { t: 'sea', from: 4330, to: 9000 },
      { t: 'fields', from: 1750, to: 2600, x0: 10, x1: 140, seed: 1 },
      { t: 'fields', from: 2100, to: 2700, x0: 230, x1: 350, seed: 2 },
      { t: 'road', path: road, from: 1500, to: 4300, w: 14, marks: true },
      { t: 'forest', from: 1600, to: 4200, density: 0.4, mask: both(away(road, 24), (x, d) => !(d > 1750 && d < 2700 && (x < 145 || x > 225))) },
      { t: 'town', from: 2900, to: 3450, x0: 20, x1: 340, road, seed: 4 },
      { t: 'base', from: 3660, to: 3800, x0: 200, x1: 340, tanks: 2 },
    ],
    spawns: done(),
  };
}

// ---------------- 第二關：山谷 ----------------
function stage2() {
  const river = wind(-200, 5600, 170, 110, 500, 1);
  const road = wind(-200, 5600, 260, 60, 460, 3).map(([x, d]) => [Math.min(330, x + 20), d]);
  const { at, done } = script();
  at(200, 'fighter', { path: 'curveR', n: 5, gap: 0.28 });
  at(360, 'tank', { road, n: 3, vd: -10 });
  at(480, 'fighter', { path: 'curveL', n: 5, gap: 0.28 });
  at(600, 'heli', { carrier: true, x: 150, drop: 'W' });
  at(700, 'aa', { x: 60 }); at(760, 'aa', { x: 110 });
  at(860, 'heavy', { x: 230, ty: 130 });
  at(1000, 'fighter', { path: 'loop', x: 80, n: 3, gap: 0.3 }); at(1030, 'fighter', { path: 'loop', x: 280, n: 3, gap: 0.3 });
  at(1150, 'tank', { road, n: 5, vd: -12 });
  at(1300, 'heli', { x: 80 }); at(1320, 'heli', { x: 180 }); at(1340, 'heli', { x: 280 });
  at(1500, 'truck', { road, n: 4, vd: 18, drop: 'M' });
  at(1620, 'fighter', { path: 'vee', x: 180, n: 7, gap: 0.1 });
  at(1800, 'aa', { x: 50 }); at(1820, 'aa', { x: 310 }); at(1860, 'aa', { x: 120 });
  at(1950, 'heavy', { x: 110, ty: 120 }); at(2000, 'heavy', { x: 250, ty: 150 });
  at(2200, 'fighter', { path: 'swoopL', x: 300, n: 5, gap: 0.2 }); at(2260, 'fighter', { path: 'swoopR', x: 60, n: 5, gap: 0.2 });
  at(2400, 'heli', { carrier: true, x: 240, drop: 'B' });
  at(2550, 'tank', { road, n: 4, vd: -10 }); at(2600, 'tank', { x: 60, rot: Math.PI }); at(2630, 'tank', { x: 100, rot: Math.PI });
  at(2800, 'fighter', { path: 'dive', n: 5, gap: 0.3 });
  at(2950, 'heavy', { x: 180, ty: 110, stay: 6 });
  at(3150, 'heli', { x: 90 }); at(3170, 'heli', { x: 270 });
  at(3300, 'fighter', { path: 'curveL', n: 6, gap: 0.22 }); at(3420, 'fighter', { path: 'curveR', n: 6, gap: 0.22 });
  at(3550, 'aa', { x: 70 }); at(3570, 'aa', { x: 290 });
  at(3700, 'truck', { road, n: 5, vd: 16, drop: 'P' });
  at(3850, 'heli', { carrier: true, x: 180, drop: 'W' });
  at(4000, 'fighter', { path: 'vee', x: 110, n: 5, gap: 0.12 }); at(4060, 'fighter', { path: 'vee', x: 250, n: 5, gap: 0.12 });
  at(4250, 'heavy', { x: 120, ty: 130 }); at(4280, 'heavy', { x: 240, ty: 160 });
  at(4700, 'boss', { kind: 'tank' });
  return {
    title: '第二關 · 山谷', sub: '沿河谷北上', pal: 'olive', speed: 34, bossName: '重型戰車「巨像」',
    grade: 'rgba(40,40,10,0.05)',
    terrain: [
      { t: 'fill', tex: 'aerial_grass_rock', from: -400, to: 9000, tint: 'rgba(30,50,10,0.15)' },
      { t: 'fill', tex: 'aerial_rocks_02', from: 1700, to: 2500, wav: 30, seed: 2 },
      { t: 'fill', tex: 'aerial_ground_rock', from: 3300, to: 3900, wav: 30, seed: 5 },
      { t: 'river', path: river, from: -200, to: 9000, w: 26 },
      { t: 'road', path: road, from: -200, to: 9000, w: 12, tex: 'aerial_mud_1', dirt: true },
      { t: 'fields', from: 300, to: 1400, x0: 10, x1: 110, seed: 3 },
      { t: 'forest', from: -200, to: 9000, density: 0.42, seed: 9, mask: both(away(river, 30), away(road, 20), (x, d) => !(d > 300 && d < 1400 && x < 115)) },
      { t: 'rocks', from: 1600, to: 4000, n: 14, size: 6, mask: away(river, 26) },
      { t: 'town', from: 2650, to: 3050, x0: 200, x1: 345, road, seed: 6 },
    ],
    spawns: done(),
  };
}

// ---------------- 第三關：沙漠 ----------------
function stage3() {
  const road = wind(-200, 6000, 180, 90, 520, 2);
  const { at, done } = script();
  at(200, 'fighter', { path: 'curveL', n: 6, gap: 0.25, pal: 'sand' });
  at(380, 'truck', { road, n: 5, vd: 20, drop: 'W' });
  at(500, 'fighter', { path: 'curveR', n: 6, gap: 0.25, pal: 'sand' });
  at(700, 'tank', { road, n: 4, vd: -12 });
  at(820, 'aa', { x: 60 }); at(840, 'aa', { x: 300 });
  at(950, 'heavy', { x: 180, ty: 120, pal: 'sand' });
  at(1100, 'heli', { x: 80 }); at(1120, 'heli', { x: 280 });
  at(1250, 'fighter', { path: 'vee', x: 180, n: 7, gap: 0.1 });
  at(1400, 'tank', { x: 70, rot: Math.PI }); at(1420, 'tank', { x: 110, rot: Math.PI }); at(1440, 'tank', { x: 250, rot: Math.PI }); at(1460, 'tank', { x: 290, rot: Math.PI });
  at(1550, 'heli', { carrier: true, x: 180, drop: 'M' });
  at(1700, 'fighter', { path: 'loop', x: 90, n: 4, gap: 0.28 }); at(1740, 'fighter', { path: 'loop', x: 270, n: 4, gap: 0.28 });
  at(1900, 'aa', { x: 230 }); at(1920, 'aa', { x: 270 }); at(1940, 'aa', { x: 310 });
  at(2050, 'heavy', { x: 100, ty: 120 }); at(2100, 'heavy', { x: 260, ty: 150 });
  at(2300, 'truck', { road, n: 6, vd: 18, drop: 'P' });
  at(2450, 'fighter', { path: 'swoopL', x: 300, n: 5, gap: 0.2 }); at(2500, 'fighter', { path: 'swoopR', x: 60, n: 5, gap: 0.2 });
  at(2650, 'tank', { road, n: 5, vd: -12 });
  at(2800, 'heli', { carrier: true, x: 100, drop: 'B' });
  at(2950, 'fighter', { path: 'dive', n: 6, gap: 0.25 });
  at(3100, 'heavy', { x: 180, ty: 110, stay: 6 });
  at(3300, 'aa', { x: 50 }); at(3320, 'aa', { x: 90 }); at(3340, 'aa', { x: 310 });
  at(3450, 'fighter', { path: 'curveL', n: 7, gap: 0.2 }); at(3600, 'fighter', { path: 'curveR', n: 7, gap: 0.2 });
  at(3750, 'heli', { x: 70 }); at(3770, 'heli', { x: 180 }); at(3790, 'heli', { x: 290 });
  at(3950, 'heli', { carrier: true, x: 180, drop: 'W' });
  at(4100, 'tank', { road, n: 4, vd: -10 }); at(4150, 'heavy', { x: 120, ty: 120 });
  at(4900, 'boss', { kind: 'fortress' });
  return {
    title: '第三關 · 沙漠', sub: '穿越砂海', pal: 'sand', speed: 34, bossName: '沙漠要塞',
    grade: 'rgba(80,40,0,0.06)',
    terrain: [
      { t: 'fill', tex: 'aerial_sand', from: -400, to: 9000, tint: 'rgba(120,70,20,0.12)' },
      { t: 'fill', tex: 'dirt_aerial_02', from: 1300, to: 2200, wav: 40, seed: 3 },
      { t: 'fill', tex: 'dirt_aerial_02', from: 3600, to: 4400, wav: 40, seed: 7 },
      { t: 'dunes', from: -200, to: 1300 }, { t: 'dunes', from: 2200, to: 3600 },
      { t: 'road', path: road, from: -200, to: 9000, w: 13, tex: 'aerial_mud_1', dirt: true },
      { t: 'rocks', from: 1300, to: 2200, n: 10, size: 6, light: '#d8b88a', dark: '#6d4a2a', mask: away(road, 18) },
      { t: 'forest', from: 2700, to: 3000, density: 0.35, palm: true, mask: (x, d) => Math.hypot(x - 80, d - 2850) < 90 },
      { t: 'sea', from: 2780, to: 2920, side: 'left', shore: [[40, 2780], [70, 2850], [40, 2920]], deep: '#1e5560' },
      { t: 'base', from: 1850, to: 2000, x0: 210, x1: 340, tanks: 3 },
      { t: 'base', from: 4700, to: 5300, x0: 40, x1: 320, tanks: 0 },
    ],
    spawns: done(),
  };
}

// ---------------- 第四關：雪原 ----------------
function stage4() {
  const river = wind(-200, 6000, 200, 90, 520, 4);
  const road = wind(-200, 6000, 100, 50, 480, 1);
  const { at, done } = script();
  at(200, 'fighter', { path: 'curveR', n: 6, gap: 0.25, pal: 'snow' });
  at(350, 'fighter', { path: 'curveL', n: 6, gap: 0.25, pal: 'snow' });
  at(520, 'heli', { carrier: true, x: 180, drop: 'W' });
  at(650, 'tank', { road, n: 4, vd: -12 });
  at(780, 'heavy', { x: 240, ty: 120, pal: 'snow' });
  at(900, 'aa', { x: 290 }); at(920, 'aa', { x: 330 });
  at(1050, 'fighter', { path: 'vee', x: 180, n: 7, gap: 0.1, pal: 'snow' });
  at(1200, 'heli', { x: 90 }); at(1220, 'heli', { x: 270 });
  at(1350, 'heavy', { x: 110, ty: 110, pal: 'snow' }); at(1380, 'heavy', { x: 250, ty: 150, pal: 'snow' });
  at(1550, 'truck', { road, n: 5, vd: 18, drop: 'M' });
  at(1700, 'fighter', { path: 'loop', x: 80, n: 4, gap: 0.26 }); at(1720, 'fighter', { path: 'loop', x: 280, n: 4, gap: 0.26 });
  at(1850, 'aa', { x: 220 }); at(1870, 'aa', { x: 300 });
  at(2000, 'fighter', { path: 'straight', x: 60, n: 4, gap: 0.2 }); at(2040, 'fighter', { path: 'straight', x: 300, n: 4, gap: 0.2 });
  at(2150, 'heli', { carrier: true, x: 260, drop: 'B' });
  at(2300, 'heavy', { x: 180, ty: 120, stay: 7, pal: 'snow' });
  at(2500, 'tank', { road, n: 5, vd: -10 }); at(2550, 'tank', { x: 300, rot: Math.PI }); at(2580, 'tank', { x: 260, rot: Math.PI });
  at(2750, 'fighter', { path: 'curveL', n: 7, gap: 0.2, pal: 'snow' }); at(2850, 'fighter', { path: 'curveR', n: 7, gap: 0.2, pal: 'snow' });
  at(3000, 'heli', { x: 60 }); at(3020, 'heli', { x: 140 }); at(3040, 'heli', { x: 220 }); at(3060, 'heli', { x: 300 });
  at(3250, 'heli', { carrier: true, x: 180, drop: 'P' });
  at(3400, 'heavy', { x: 100, ty: 110, pal: 'snow' }); at(3420, 'heavy', { x: 260, ty: 140, pal: 'snow' });
  at(3600, 'fighter', { path: 'dive', n: 7, gap: 0.22, pal: 'snow' });
  at(3800, 'aa', { x: 60 }); at(3810, 'aa', { x: 120 }); at(3820, 'aa', { x: 300 });
  at(4000, 'heli', { carrier: true, x: 180, drop: 'W' });
  at(4700, 'boss', { kind: 'bomber' });
  return {
    title: '第四關 · 雪原', sub: '追擊北方機隊', pal: 'snow', speed: 34, bossName: '重轟炸機「白鯨」',
    grade: 'rgba(20,40,70,0.07)',
    terrain: [
      { t: 'fill', tex: 'snow_field_aerial', from: -400, to: 9000 },
      { t: 'fill', tex: 'aerial_ground_rock', from: 1500, to: 2100, wav: 40, seed: 4, tint: 'rgba(230,240,250,0.35)' },
      { t: 'river', path: river, from: -200, to: 9000, w: 30, frozen: true },
      { t: 'road', path: road, from: -200, to: 9000, w: 12, tex: 'aerial_mud_1', dirt: true },
      { t: 'forest', from: -200, to: 9000, density: 0.5, snow: true, seed: 3, mask: both(away(river, 32), away(road, 18)) },
      { t: 'town', from: 2400, to: 2700, x0: 220, x1: 345, road, seed: 8, palette: ['#e8ecef', '#c9cfd4', '#8a3f35', '#6d7780'] },
      { t: 'base', from: 3750, to: 3880, x0: 30, x1: 330, tanks: 4 },
    ],
    spawns: done(),
  };
}

// ---------------- 第五關：要塞 ----------------
function stage5() {
  const road = wind(-200, 6000, 120, 40, 600, 2);
  const road2 = wind(-200, 6000, 280, 30, 600, 5);
  const { at, done } = script();
  at(180, 'fighter', { path: 'curveL', n: 7, gap: 0.22, pal: 'dark' });
  at(320, 'fighter', { path: 'curveR', n: 7, gap: 0.22, pal: 'dark' });
  at(450, 'heli', { carrier: true, x: 180, drop: 'W' });
  at(600, 'tank', { road, n: 4, vd: -12, pal: 'grey' }); at(620, 'tank', { road: road2, n: 4, vd: -12, pal: 'grey' });
  at(760, 'aa', { x: 50 }); at(780, 'aa', { x: 200 }); at(800, 'aa', { x: 330 });
  at(900, 'heavy', { x: 110, ty: 110, pal: 'dark' }); at(930, 'heavy', { x: 250, ty: 150, pal: 'dark' });
  at(1100, 'fighter', { path: 'vee', x: 100, n: 7, gap: 0.1, pal: 'dark' }); at(1160, 'fighter', { path: 'vee', x: 260, n: 7, gap: 0.1, pal: 'dark' });
  at(1300, 'heli', { x: 60 }); at(1310, 'heli', { x: 140 }); at(1320, 'heli', { x: 220 }); at(1330, 'heli', { x: 300 });
  at(1450, 'heli', { carrier: true, x: 120, drop: 'M' });
  at(1600, 'truck', { road, n: 5, vd: 18, drop: 'P' });
  at(1700, 'fighter', { path: 'loop', x: 80, n: 5, gap: 0.24, pal: 'dark' }); at(1720, 'fighter', { path: 'loop', x: 280, n: 5, gap: 0.24, pal: 'dark' });
  at(1900, 'heavy', { x: 180, ty: 110, stay: 7, pal: 'dark' });
  at(2050, 'aa', { x: 60 }); at(2060, 'aa', { x: 100 }); at(2070, 'aa', { x: 260 }); at(2080, 'aa', { x: 300 });
  at(2200, 'fighter', { path: 'straight', x: 50, n: 5, gap: 0.18 }); at(2220, 'fighter', { path: 'straight', x: 310, n: 5, gap: 0.18 });
  at(2350, 'heli', { carrier: true, x: 180, drop: 'B' });
  at(2500, 'tank', { road, n: 5, vd: -12, pal: 'grey' }); at(2520, 'tank', { road: road2, n: 5, vd: -12, pal: 'grey' });
  at(2700, 'heavy', { x: 90, ty: 110, pal: 'dark' }); at(2720, 'heavy', { x: 180, ty: 150, pal: 'dark' }); at(2740, 'heavy', { x: 270, ty: 110, pal: 'dark' });
  at(2950, 'fighter', { path: 'curveL', n: 8, gap: 0.18, pal: 'dark' }); at(3050, 'fighter', { path: 'curveR', n: 8, gap: 0.18, pal: 'dark' });
  at(3200, 'heli', { carrier: true, x: 180, drop: 'P' });
  at(3350, 'aa', { x: 160 }); at(3360, 'aa', { x: 200 });
  at(3450, 'fighter', { path: 'dive', n: 8, gap: 0.2, pal: 'dark' });
  at(3650, 'heavy', { x: 120, ty: 120, pal: 'dark' }); at(3680, 'heavy', { x: 240, ty: 150, pal: 'dark' });
  at(3900, 'heli', { carrier: true, x: 180, drop: 'W' }); at(3950, 'heli', { carrier: true, x: 100, drop: 'B' });
  at(4700, 'boss', { kind: 'wing' });
  return {
    title: '第五關 · 要塞', sub: '直搗敵軍總部', pal: 'dark', speed: 34, bossName: '空中要塞「天穹」',
    grade: 'rgba(20,20,40,0.1)',
    terrain: [
      { t: 'fill', tex: 'aerial_ground_rock', from: -400, to: 9000, tint: 'rgba(30,30,40,0.25)' },
      { t: 'fill', tex: 'aerial_asphalt_01', from: 600, to: 2300, wav: 4, seed: 1 },
      { t: 'fill', tex: 'aerial_asphalt_01', from: 3300, to: 9000, wav: 4, seed: 2 },
      { t: 'road', path: road, from: -200, to: 9000, w: 14, marks: true },
      { t: 'road', path: road2, from: -200, to: 9000, w: 14, marks: true },
      { t: 'town', from: 700, to: 2200, x0: 10, x1: 350, road, seed: 11, palette: ['#6f757c', '#8a8f94', '#55595e', '#9a6b4a', '#a9a59b'] },
      { t: 'runway', from: 2500, to: 3300, x: 200, w: 40 },
      { t: 'base', from: 3400, to: 3700, x0: 20, x1: 340, tanks: 6 },
      { t: 'base', from: 3900, to: 4300, x0: 30, x1: 330, tanks: 3 },
      { t: 'forest', from: -200, to: 600, density: 0.4, seed: 4, mask: both(away(road, 20), away(road2, 20)) },
    ],
    spawns: done(),
  };
}

export const STAGES = [stage1(), stage2(), stage3(), stage4(), stage5()];
export const STAGE_BONUS = [500, 700, 900, 1100, 1500];
