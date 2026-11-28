// 極速山道：車款、賽道、賽事與升級資料。單位：公尺、秒、公斤、千瓦。

// ---------------- 車款 ----------------
// model：assets/racer/cars/<model>.glb（車內完整）與 <model>_lod.glb（電腦車用）
// eye：駕駛視角相對於方向盤中心的位置；drive：驅動方式
export const CARS = {
  hatch: {
    name: '疾風 GTI', cls: 'D', model: 'polo', price: 0, desc: '輕巧的前驅掀背車，轉向靈敏、好上手',
    mass: 1180, power: 118, redline: 6800, idle: 850, gears: [3.6, 2.1, 1.45, 1.1, 0.88, 0.72], final: 3.9, drive: 'F',
    grip: 1.0, cd: 0.31, area: 2.1, down: 0, brake: 1.0, steer: 34, lead: 0.39, cyl: 4, paint: null,
  },
  wide: {
    name: '鋼翼 993', cls: 'C', model: 'rwb', price: 32000, desc: '寬體改裝的經典後驅跑車，尾巴很活',
    mass: 1320, power: 255, redline: 7400, idle: 900, gears: [3.2, 2.05, 1.52, 1.2, 0.98, 0.82], final: 3.6, drive: 'R',
    grip: 1.08, cd: 0.34, area: 1.95, down: 0.6, brake: 1.12, steer: 32, lead: 0.42, cyl: 6, paint: null, eye: [0.255, 1.03, -0.36],
  },
  panther: {
    name: '黑豹 V8', cls: 'B', model: 'c8', price: 68000, desc: '中置 V8 超跑，加速猛烈、高速穩定',
    mass: 1530, power: 370, redline: 6600, idle: 900, gears: [2.9, 1.95, 1.47, 1.15, 0.94, 0.77, 0.63], final: 3.6, drive: 'R',
    grip: 1.16, cd: 0.32, area: 2.0, down: 1.2, brake: 1.25, steer: 30, lead: 0.4, cyl: 8, paint: null,
  },
  blaze: {
    name: '烈焰 R', cls: 'A', model: 'nsx', price: 125000, desc: '賽道規格的競技車，下壓力與煞車都是頂級',
    mass: 1150, power: 405, redline: 8200, idle: 1100, gears: [3.0, 2.15, 1.65, 1.32, 1.1, 0.94], final: 3.9, drive: 'R',
    grip: 1.28, cd: 0.38, area: 1.9, down: 2.6, brake: 1.45, steer: 30, lead: 0.43, cyl: 6, paint: null,
  },
};
// 只出現在電腦對手的車
export const AI_CARS = {
  silver: { name: '銀翼 S', model: 's13', base: { mass: 1240, power: 150, drive: 'R', grip: 1.0 } },
  thunder: { name: '雷神 R', model: 'r32', base: { mass: 1430, power: 235, drive: 'A', grip: 1.06 } },
  knight: { name: '夜騎 M', model: 'e46', base: { mass: 1450, power: 250, drive: 'R', grip: 1.05 } },
};
// 車身上立體的廠徽與車名字樣：載入時刪除（[mesh 名稱規則, 方塊最小角, 最大角]，車身座標，+z 為車頭）
export const BADGES = {
  polo: [
    ['chassis10', [-0.07, 0.58, 1.9], [0.07, 0.72, 2.03]],
    ['chassis10|chassis1$', [-0.075, 0.82, -1.9], [0.075, 0.96, -1.8]],
    ['chassis8', [0.35, 0.8, -1.85], [0.49, 0.87, -1.77]],
    ['chassis10', [-0.54, 0.8, -1.85], [-0.37, 0.87, -1.77]],
  ],
  polo_lod: [
    ['solid', [-0.07, 0.58, 1.9], [0.07, 0.72, 2.03]],
    ['solid|chassis1$', [-0.075, 0.82, -1.9], [0.075, 0.96, -1.8]],
    ['solid', [0.35, 0.8, -1.85], [0.49, 0.87, -1.77]],
    ['solid', [-0.54, 0.8, -1.85], [-0.37, 0.87, -1.77]],
  ],
  rwb: [['Kit_color|body_Paint', [-0.36, 0.7, -2.0], [0.34, 0.82, -1.9]]],
  rwb_lod: [['solid|Paint|Kit', [-0.36, 0.7, -2.0], [0.34, 0.82, -1.9]]],
  r32_lod: [['solid', [0.26, 0.83, -2.24], [0.46, 0.92, -2.13]], ['solid', [-0.33, 0.75, -2.26], [-0.24, 0.82, -2.2]]],
};
// 方向盤沒有獨立物件的車：從內裝切出方向盤（盤心、轉軸為車身座標）
export const STEER_FIX = {
  rwb: { mesh: 'interior_Leather', c: [0.252, 0.744, 0.231], n: [-0.025, 0.314, -0.949], r: 0.218, t: 0.055 },
};
export const CLASS_ORDER = ['D', 'C', 'B', 'A'];
export const CLASS_NAME = { D: 'D 級', C: 'C 級', B: 'B 級', A: 'A 級' };

// ---------------- 升級 ----------------
export const UPGRADES = {
  engine: { name: '引擎', desc: (lv) => '馬力 +' + lv * 8 + '%', max: 3, cost: [6000, 12000, 22000] },
  tires: { name: '輪胎', desc: (lv) => '抓地力 +' + lv * 4 + '%', max: 3, cost: [5000, 10000, 18000] },
  weight: { name: '輕量化', desc: (lv) => '車重 −' + lv * 4 + '%', max: 2, cost: [8000, 16000] },
};
export function tunedSpec(id, up) {
  const c = { ...CARS[id] }; up = up || {};
  c.power *= 1 + 0.08 * (up.engine || 0);
  c.grip *= 1 + 0.04 * (up.tires || 0);
  c.mass *= 1 - 0.04 * (up.weight || 0);
  return c;
}

// ---------------- 賽道 ----------------
// ctrl：封閉路線的控制點 [x, z, 高度]；路寬 11 公尺（雙線道）
// theme 決定地形、植被、天空
export const TRACKS = {
  ridge: {
    name: '山嵐公路', sub: '午後的高原山路，連續髮夾彎', theme: 'mountain', laps: 2,
    sky: 'kloofendal_48d_partly_cloudy_puresky', sunAz: 0.6, sunEl: 30, sun: 0xfff1de, sunI: 3.6, envI: 0.5, exposure: 0.8, fog: 0xbfcad6, fogD: 0.0007,
    ground: ['leafy_grass', 'sparse_grass', 'rock_face_03'], hill: 55,
    ctrl: [[0, 0, 8], [130, 6, 10], [250, 40, 14], [330, 120, 20], [312, 222, 26], [228, 282, 31], [122, 296, 36], [52, 352, 41], [-48, 410, 44], [-160, 392, 41], [-236, 318, 35], [-226, 214, 29], [-148, 168, 24], [-176, 84, 18], [-280, 44, 14], [-306, -56, 10], [-232, -142, 7], [-110, -124, 6]],
  },
  coast: {
    name: '海岸懸崖', sub: '傍晚的濱海公路，一側是斷崖與大海', theme: 'coast', laps: 2,
    sky: 'qwantani_late_afternoon_puresky', sunAz: 0.63, sunEl: 19, sun: 0xffe2b8, sunI: 3.6, envI: 0.5, exposure: 0.82, fog: 0xd8c9b6, fogD: 0.0009,
    ground: ['withered_grass', 'coast_sand_01', 'marble_cliff_02'], hill: 40,
    ctrl: [[0, 0, 22], [150, -22, 24], [300, -62, 20], [424, -40, 18], [506, 42, 22], [474, 152, 30], [362, 202, 35], [222, 192, 38], [118, 244, 40], [0, 232, 36], [-122, 182, 31], [-222, 204, 28], [-334, 142, 24], [-366, 32, 20], [-306, -58, 18], [-182, -62, 20], [-90, -22, 21]],
  },
  canyon: {
    name: '赤岩峽谷', sub: '夕陽下的紅岩峽谷，長距離高速彎', theme: 'canyon', laps: 2,
    sky: 'qwantani_sunset_puresky', sunAz: 0.63, sunEl: 9, sun: 0xffa868, sunI: 3.4, envI: 0.55, exposure: 0.9, fog: 0xc89a78, fogD: 0.001,
    ground: ['red_sand', 'rocky_gravel', 'rock_face_03'], hill: 60,
    ctrl: [[0, 0, 5], [200, 30, 6], [384, 2, 8], [520, -82, 10], [600, -222, 12], [560, -362, 14], [420, -424, 15], [262, -382, 13], [142, -302, 11], [40, -342, 10], [-100, -422, 9], [-242, -382, 8], [-322, -242, 7], [-302, -100, 6], [-200, -22, 5]],
  },
};
export const TRACK_ORDER = ['ridge', 'coast', 'canyon'];

// ---------------- 生涯賽事 ----------------
// fee：報名費（遊戲幣）；prize：前三名獎金（遊戲幣）；credit：依名次的賽車獎金（買車、升級用）
export const CUPS = [
  { id: 'rookie', name: '新人盃', cls: 'D', fee: 500, prize: [1500, 900, 600], credit: [6000, 4200, 3000, 2000, 1400, 1000], skill: 0.8, need: null },
  { id: 'club', name: '進階盃', cls: 'C', fee: 1500, prize: [4500, 2700, 1800], credit: [11000, 8000, 6000, 4000, 3000, 2000], skill: 0.86, need: 'rookie' },
  { id: 'pro', name: '職業盃', cls: 'B', fee: 4000, prize: [12000, 7200, 4800], credit: [20000, 15000, 11000, 8000, 6000, 4000], skill: 0.91, need: 'club' },
  { id: 'master', name: '大師盃', cls: 'A', fee: 10000, prize: [30000, 18000, 12000], credit: [36000, 26000, 19000, 14000, 10000, 7000], skill: 0.955, need: 'pro' },
];
// 各級別的對手車陣（車款 id 與性能倍率）
export const GRID = {
  D: [['hatch', 1], ['silver', 0.82], ['knight', 0.55], ['thunder', 0.6], ['hatch', 1.02]],
  C: [['wide', 1], ['silver', 1.25], ['thunder', 1.02], ['knight', 0.98], ['wide', 0.97]],
  B: [['panther', 1], ['wide', 1.25], ['thunder', 1.45], ['knight', 1.38], ['panther', 0.98]],
  A: [['blaze', 1], ['panther', 1.12], ['wide', 1.5], ['thunder', 1.7], ['blaze', 0.98]],
};
export const DRIVERS = ['林凱', '陳宥', '王昊', '張睿', '黃晨', '吳翔', '周宸', '蔡宇', '鄭澄', '許航', '謝岳', '郭承'];
