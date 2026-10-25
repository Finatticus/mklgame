'use strict';

/* ============================================================
   小城市 — 用月預算蓋一座城市
   城市完全由「紀錄 + 月預算」計算，不另存遊戲進度：
   每台裝置看到的城市都一樣，修改舊紀錄也會反映在城市上。

   規則
   - 日預算 = 月預算 ÷ 當月天數，每天結算一次（今天為即時預覽）
   - 有記帳且守住日預算：基礎 10 + 記帳 5 + 節省獎勵 0–10（省越多越高）
   - 當天沒有任何紀錄：空地整理 +4（不影響連續天數）
   - 超過日預算：停工，0 點，連續天數歸零
   - 超過日預算 3 倍：火災，扣 15 點，點數不足時最新的建築會被燒掉
   - 連續守住 7 天：+20 獎勵（每滿 7 天一次）
   - 建設點依序解鎖 25 棟建築；月底依結餘比例評等 S / A / B / C

   每座城市都不一樣
   - 地形與名字：依「帳號 + 月份」產生固定的亂數，決定平原 / 河畔 / 湖濱 / 海港
   - 季節：依月份呈現春櫻、夏綠、秋楓、冬雪
   - 建築：每棟在完工當天，依「當月到那天為止的消費組成」抽出風格
     （餐飲多 → 美食建築、交通多 → 交通建築…），完工後就固定
   - 天空：夜晚亮燈、停工陰天、火災冒煙；達成條件會出現彩虹、煙火、熱氣球、飛行船

   畫面以建築模型的質感呈現：真實材質色、牆面明暗與投影、
   街廓與道路、車輛與路燈。
   ============================================================ */

const CITY = {
  GRID: 6, TW: 64, TH: 32, SLOTS: 25,
  BASE: 10, RECORD: 5, SAVE_MAX: 10, IDLE: 4,
  FIRE: -15, FIRE_X: 3, STREAK: 7, STREAK_BONUS: 20
};

// 第 k 棟需要的建設點（越後面越貴）；完美的一個月大約能蓋滿
const SLOT_COST = [10, 8, 14, 12, 16, 16, 18, 8, 24, 22, 26, 16, 26, 22, 36, 30, 42, 34, 32, 36, 44, 48, 52, 64, 80];
const COST_SUM = SLOT_COST.reduce((acc, c, i) => { acc.push((acc[i - 1] || 0) + c); return acc; }, []);

function builtCount(points) {
  let n = 0;
  while (n < COST_SUM.length && COST_SUM[n] <= points) n++;
  return n;
}

/* ---------- Seeded random ---------- */

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function rngOf(s) {
  let a = hashStr(s);
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (r, list) => list[Math.floor(r() * list.length)];

/* ---------- World: season, terrain, name ---------- */

const SEASONS = {
  spring: { label: '春', road: '#D6D4CF', grass: '#C8D3B6', water: '#9FB7C4', sky: ['#D8E1E7', '#F4F2EE'],
    canopy: ['#D8B4BB', '#E2C6CB', '#8EA57D', '#97AC86'], flowers: ['#D99AA8', '#EBC8CF', '#F4F1EC'] },
  summer: { label: '夏', road: '#D2D0CB', grass: '#BCCBA9', water: '#93B3C3', sky: ['#CEDCE5', '#F2F3F0'],
    canopy: ['#6E8A5D', '#7B9768', '#5E7B51'], flowers: ['#D8B65A', '#C9786A', '#F4F1EC'] },
  autumn: { label: '秋', road: '#D5D2CC', grass: '#CEC7A6', water: '#9BB0BC', sky: ['#DEDBD5', '#F4F1EC'],
    canopy: ['#B8743F', '#C99A50', '#A65F3B', '#8E8A4F'], flowers: ['#C98048', '#D9AE5A'] },
  winter: { label: '冬', road: '#E1E4E7', grass: '#E8ECEF', water: '#B7C7D1', sky: ['#D7DDE2', '#F2F3F4'],
    canopy: ['#56705F', '#4D6656'], flowers: ['#F4F6F8', '#A8433A'], snow: true }
};
const TERRAIN_NAME = { plain: '平原', river: '河畔', lake: '湖濱', coast: '海港' };
const NAME_A = { spring: ['櫻', '春', '花', '柳', '杏'], summer: ['夏', '藍', '晴', '荷', '綠'], autumn: ['楓', '秋', '金', '桂', '橙'], winter: ['雪', '冬', '霜', '銀', '松'] };
const NAME_B = ['光', '風', '木', '石', '雲', '星', '月', '田', '山', '野', '原', '溪'];
const NAME_C = { plain: ['鎮', '城', '村', '里'], river: ['川', '渡', '橋', '津'], lake: ['湖', '潭', '池'], coast: ['港', '灣', '岬'] };

function worldOf(m) {
  const G = CITY.GRID;
  const seed = `${state.session ? state.session.user : ''}|${m}`;
  const r = rngOf(seed + '|world');
  const mo = Number(m.slice(5));
  const season = mo >= 3 && mo <= 5 ? 'spring' : mo >= 6 && mo <= 8 ? 'summer' : mo >= 9 && mo <= 11 ? 'autumn' : 'winter';
  const terrain = pick(r, ['plain', 'river', 'lake', 'coast']);
  const key = (i, j) => i + ',' + j;

  const water = new Set();
  if (terrain === 'river') {
    const row = pick(r, [1, 4]), row2 = row === 1 ? 2 : 3, bend = 2 + Math.floor(r() * 2);
    for (let i = 0; i < G; i++) water.add(key(i, i < bend ? row : row2));
    water.add(key(bend, row));
  } else if (terrain === 'lake') {
    const [ci, cj] = pick(r, [[0, 0], [0, 4], [4, 0]]);
    [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([di, dj]) => water.add(key(ci + di, cj + dj)));
  } else if (terrain === 'coast') {
    const alongI = r() < 0.5;
    for (let k = 0; k < G; k++) water.add(alongI ? key(k, 0) : key(0, k));
  }

  const center = [[2, 2], [3, 3], [2, 3], [3, 2]].find(([i, j]) => !water.has(key(i, j)));
  const land = [];
  for (let i = 0; i < G; i++) {
    for (let j = 0; j < G; j++) {
      if (water.has(key(i, j)) || (i === center[0] && j === center[1])) continue;
      land.push({ i, j, ring: Math.max(Math.abs(i - center[0]), Math.abs(j - center[1])), tie: r() });
    }
  }
  // 由中心往外蓋；同一圈裡前排先蓋（前排是較早、較矮的建築，不會擋住後面）
  land.sort((a, b) => a.ring - b.ring || (b.i + b.j) - (a.i + a.j) || a.tie - b.tie);
  const order = land.slice(0, CITY.SLOTS - 1).map(c => [c.i, c.j]).concat([center]);
  const spare = land.slice(CITY.SLOTS - 1).map(c => [c.i, c.j]);

  const waterCells = [...water].map(s => s.split(',').map(Number));
  const boats = terrain === 'coast' ? [waterCells[1 + Math.floor(r() * 2)], waterCells[3 + Math.floor(r() * 2)]] : [];

  return {
    seed, season, terrain, theme: SEASONS[season], water, waterCells, order, spare, boats,
    name: pick(r, NAME_A[season]) + pick(r, NAME_B) + pick(r, NAME_C[terrain])
  };
}

/* ---------- Building library ---------- */

const mkBox = (f, h, c, o) => Object.assign({ t: 'box', f, h, c }, o);
const mkRoof = (f, z, h, c, o) => Object.assign({ t: 'roof', f, z, h, c }, o);
const mkGable = (f, z, h, c, wall, o) => Object.assign({ t: 'gable', f, z, h, c, wall }, o);
const mkTree = (dx, dy, s, c) => ({ t: 'tree', dx, dy, s, c });
const mkLot = (f, kind) => ({ t: 'lot', f, kind });
const win = (type, rows, cols, o) => Object.assign({ type, rows, cols }, o);

// 真實建材的色票
const PLASTER = ['#EDE8DF', '#E6E0D5', '#F2EEE7', '#DED7CB'];
const BRICK = ['#A86A52', '#9A5F4A', '#B07A62', '#8E5A48'];
const STONE = ['#D8D2C6', '#CFC8BA', '#E0DBD1'];
const CONCRETE = ['#CFCDC8', '#C4C2BD', '#D9D7D2'];
const DARK = ['#4A4F57', '#3F444B', '#575C63'];
const GLASS = ['#8DA0B2', '#7F95A9', '#93A5B5'];
const TILES = ['#9E5B45', '#8A4F3D', '#6E6A66', '#5B6168', '#7A5240'];
const AWNING = ['#3F5A4A', '#7E3A2F', '#2F4458', '#A8843C', '#5B5F66'];
const CARS = ['#F2F2F0', '#C9CCCF', '#2E3338', '#7A8590', '#3D4E63', '#8C2F2A', '#E9E6DF'];

function flowerBed(r, colors, n) {
  const list = [];
  for (let i = 0; i < n; i++) {
    const u = r() * 0.6 - 0.3, v = r() * 0.6 - 0.3;
    list.push([(u - v) * CITY.TW / 2, (u + v) * CITY.TH / 2, pick(r, colors)]);
  }
  return { t: 'dots', list };
}

function house(r, f, h, cols) {
  const wall = pick(r, PLASTER);
  return [mkBox(f, h, wall, { win: win('grid', 1, cols) }), mkGable(f + 0.06, h, h * 0.7, pick(r, TILES), wall)];
}

const LIB = {
  home: {
    S: [
      r => ({ name: '小屋', pop: 3, parts: house(r, .54, 15, 2) }),
      r => ({ name: '雙併住宅', pop: 6, parts: house(r, .7, 18, 3) }),
      (r, T) => {
        const wall = pick(r, PLASTER), o = { dx: -6, dy: -3 };
        return { name: '庭院小屋', pop: 3, parts: [mkLot(.84, 'grass'), mkBox(.44, 13, wall, Object.assign({ win: win('grid', 1, 1) }, o)), mkGable(.5, 13, 9, pick(r, TILES), wall, o), mkTree(12, 6, .75, pick(r, T.canopy))] };
      }
    ],
    M: [
      r => {
        const h = 30 + Math.round(r() * 8);
        return { name: '公寓', pop: 12, parts: [mkBox(.66, h, pick(r, BRICK), { win: win('grid', Math.round(h / 9), 3), parapet: true, units: 1 })] };
      },
      r => {
        const t = pick(r, TILES), w1 = pick(r, PLASTER), w2 = pick(r, BRICK), a = { dx: -9, dy: -4.5 }, b = { dx: 9, dy: 4.5 };
        return { name: '連棟住宅', pop: 10, parts: [
          mkBox(.4, 22, w1, Object.assign({ win: win('grid', 2, 1) }, a)), mkGable(.44, 22, 12, t, w1, a),
          mkBox(.4, 22, w2, Object.assign({ win: win('grid', 2, 1) }, b)), mkGable(.44, 22, 12, t, w2, b)] };
      }
    ],
    L: [
      r => {
        const h = 54 + Math.round(r() * 14);
        return { name: '住宅大樓', pop: 30, parts: [mkBox(.62, h, pick(r, STONE), { win: win('band', Math.round(h / 8), 4), parapet: true, units: 2 })] };
      }
    ]
  },
  food: {
    S: [
      (r, T) => {
        const wall = pick(r, PLASTER);
        return { name: '咖啡廳', pop: 3, parts: [mkBox(.58, 14, wall, { win: win('band', 1, 3) }), mkBox(.64, 1.2, pick(r, AWNING), { z: 7.5, noAo: true }), mkGable(.64, 14, 8, pick(r, TILES), wall), mkTree(16, 6, .65, pick(r, T.canopy))] };
      },
      r => ({ name: '麵包店', pop: 4, parts: [mkBox(.64, 16, pick(r, BRICK), { win: win('grid', 1, 2), parapet: true }), mkBox(.7, 1.2, pick(r, AWNING), { z: 6.5, noAo: true }), mkBox(.12, 8, '#6E5646', { z: 16, dx: 7, dy: -1 })] }),
      r => {
        const stall = (dx, dy) => [mkBox(.2, 6, '#E6E0D5', { dx, dy }), mkBox(.26, 1.2, pick(r, AWNING), { dx, dy, z: 6, noAo: true })];
        return { name: '夜市小攤', pop: 2, parts: [mkLot(.84, 'paving'), ...stall(0, -7), ...stall(-12, 0), ...stall(12, 0), ...stall(0, 7)] };
      }
    ],
    M: [
      r => ({ name: '餐廳', pop: 6, parts: [mkBox(.76, 20, pick(r, STONE), { win: win('band', 2, 4), parapet: true }), mkBox(.8, 1.2, pick(r, AWNING), { z: 7.5, noAo: true })] }),
      r => ({ name: '美食廣場', pop: 8, parts: [mkBox(.86, 16, pick(r, CONCRETE), { win: win('band', 1, 6), parapet: true, units: 2 }), mkBox(.3, 7, pick(r, DARK), { z: 16 })] })
    ],
    L: [
      r => {
        const h = 40 + Math.round(r() * 10);
        return { name: '美食大樓', pop: 18, parts: [mkBox(.86, 14, pick(r, STONE), { win: win('band', 1, 6), parapet: true }), mkBox(.56, h, pick(r, PLASTER), { z: 14, win: win('grid', Math.round(h / 9), 3), parapet: true, units: 1 })] };
      }
    ]
  },
  transport: {
    S: [
      (r, T) => {
        const g = '#5B6066';
        return { name: '公車站', pop: 1, parts: [mkLot(.84, 'paving'), mkBox(.04, 10, g, { dx: -10, dy: -1, noAo: true }), mkBox(.04, 10, g, { dx: 10, dy: 1, noAo: true }), mkBox(.46, 1.2, '#9FB0BF', { z: 10, noAo: true }), mkTree(-14, 8, .65, pick(r, T.canopy))] };
      },
      r => {
        const g = '#7D838A';
        return { name: '加油站', pop: 2, parts: [mkLot(.86, 'paving'), mkBox(.06, 13, g, { dx: -9, dy: -4.5, noAo: true }), mkBox(.2, 8, pick(r, PLASTER), { win: win('band', 1, 2) }), mkBox(.06, 13, g, { dx: 9, dy: 4.5, noAo: true }), mkBox(.7, 2.2, '#F2F1EE', { z: 13, noAo: true }), mkBox(.71, .8, pick(r, AWNING), { z: 12.4, noAo: true })] };
      }
    ],
    M: [
      r => ({ name: '立體停車場', pop: 4, parts: [mkBox(.78, 26, pick(r, CONCRETE), { win: win('band', 3, 1, { dark: true }), parapet: true })] }),
      r => {
        const w = pick(r, STONE), slate = '#5B6168', t = { dx: -14, dy: -7 };
        return { name: '火車站', pop: 8, parts: [mkBox(.18, 36, w, Object.assign({ win: win('grid', 3, 1) }, t)), mkRoof(.22, 36, 8, slate, t), mkBox(.82, 16, w, { win: win('band', 1, 6) }), mkGable(.88, 16, 12, slate, w)] };
      }
    ],
    L: [
      r => ({ name: '轉運中心', pop: 20, parts: [mkBox(.86, 20, pick(r, GLASS), { win: win('curtain', 2, 8) }), mkBox(.52, 30, pick(r, GLASS), { z: 20, win: win('curtain', 4, 4), parapet: true })] })
    ]
  },
  fun: {
    S: [
      (r, T) => ({ name: '小遊樂場', pop: 0, parts: [mkLot(.84, 'grass'), mkBox(.16, 8, '#E6E0D5', { dx: -8, dy: -3 }), mkRoof(.22, 8, 7, pick(r, AWNING), { dx: -8, dy: -3 }), mkBox(.18, 5, '#A8843C', { dx: 9, dy: 4 }), mkTree(-12, 7, .65, pick(r, T.canopy))] })
    ],
    M: [
      r => ({ name: '電影院', pop: 10, parts: [mkBox(.78, 24, pick(r, DARK), { win: win('band', 1, 3), parapet: true }), mkBox(.34, 8, '#A8843C', { z: 24 })] }),
      r => ({ name: '遊戲中心', pop: 8, parts: [mkBox(.74, 22, pick(r, DARK), { win: win('band', 2, 5), parapet: true, units: 1 })] })
    ],
    L: [
      () => ({ name: '摩天輪', pop: 0, parts: [mkLot(.8, 'plaza'), { t: 'wheel' }] }),
      () => ({ name: '體育館', pop: 15, parts: [mkBox(.88, 18, '#D3D1CC', { win: win('band', 1, 8) }), mkRoof(.92, 18, 9, '#8C9298')] })
    ]
  },
  shop: {
    S: [
      r => ({ name: '便利商店', pop: 4, parts: [mkBox(.7, 12, pick(r, PLASTER), { win: win('band', 1, 4), parapet: true }), mkBox(.72, 1.2, pick(r, AWNING), { z: 10, noAo: true })] }),
      r => ({ name: '精品店', pop: 3, parts: [mkBox(.58, 16, pick(r, DARK), { win: win('band', 1, 2), parapet: true })] })
    ],
    M: [
      r => ({ name: '超市', pop: 8, parts: [mkBox(.86, 14, pick(r, CONCRETE), { win: win('band', 1, 6), parapet: true, units: 2 }), mkBox(.3, 6, pick(r, AWNING), { z: 14 })] }),
      r => { const s = pick(r, STONE); return { name: '百貨公司', pop: 12, parts: [mkBox(.8, 34, s, { win: win('band', 3, 5) }), mkBox(.84, 2, shade(s, -0.1), { z: 34, parapet: true })] }; }
    ],
    L: [
      r => ({ name: '購物中心', pop: 25, parts: [mkBox(.88, 20, pick(r, STONE), { win: win('band', 1, 8), parapet: true }), mkBox(.6, 26, pick(r, GLASS), { z: 20, win: win('curtain', 3, 4), parapet: true, units: 1 })] }),
      r => {
        const h = 50 + Math.round(r() * 14), g = pick(r, GLASS);
        return { name: '辦公大樓', pop: 20, parts: [mkBox(.62, h, g, { win: win('curtain', Math.round(h / 7), 4), parapet: true }), mkBox(.4, 8, g, { z: h, win: win('curtain', 1, 3), parapet: true })] };
      }
    ]
  },
  civic: {
    S: [
      () => ({ name: '診所', pop: 5, parts: [mkBox(.66, 18, '#F1EFEA', { win: win('grid', 2, 3), parapet: true }), mkBox(.12, 3, '#B04A3A', { z: 18 })] })
    ],
    M: [
      r => ({ name: '學校', pop: 10, parts: [mkBox(.82, 20, pick(r, BRICK), { win: win('grid', 2, 5) }), mkRoof(.88, 20, 10, '#5B6168')] }),
      r => ({ name: '圖書館', pop: 6, parts: [mkBox(.78, 18, pick(r, STONE), { win: win('band', 1, 5), parapet: true }), mkBox(.3, 3, '#8DA0B2', { z: 18 })] })
    ],
    L: [
      () => ({ name: '醫院', pop: 20, parts: [mkBox(.8, 44, '#F1EFEA', { win: win('band', 5, 6), parapet: true, units: 2 }), mkBox(.14, 4, '#B04A3A', { z: 44 })] }),
      r => {
        const h = 80 + Math.round(r() * 10);
        return { name: '地標高塔', pop: 25, parts: [mkBox(.42, h, pick(r, GLASS), { win: win('curtain', Math.round(h / 6), 2), parapet: true }), mkBox(.05, 16, '#9AA3AB', { z: h, noAo: true })] };
      }
    ]
  },
  nature: {
    S: [
      (r, T) => ({ name: '小公園', pop: 0, parts: [mkLot(.84, 'grass'), mkTree(-10, -1, .85, pick(r, T.canopy)), mkTree(9, -4, .75, pick(r, T.canopy)), mkTree(4, 7, .8, pick(r, T.canopy))] }),
      (r, T) => ({ name: '花圃', pop: 0, parts: [mkLot(.84, 'grass'), flowerBed(r, T.flowers, 16), mkTree(0, -5, .75, pick(r, T.canopy))] }),
      () => ({ name: '噴水池', pop: 0, parts: [mkLot(.84, 'plaza'), mkBox(.5, 1.6, '#D8D2C6', { noAo: true }), Object.assign(mkLot(.42, 'water'), { z: 1.6 }), mkBox(.05, 9, '#E9EEF2', { z: 1.6, noAo: true })] })
    ]
  }
};

const MONUMENT = {
  name: '城市之心', pop: 0, style: 'home',
  parts: [mkLot(.86, 'plaza'), mkBox(.36, 5, '#D8D2C6', { parapet: true }), mkBox(.14, 44, '#DCD6CA', { z: 5 }), mkRoof(.16, 49, 8, '#B8975A')]
};

const STYLE_NAME = { home: '宜居小鎮', food: '美食之都', transport: '交通樞紐', shop: '購物天堂', fun: '娛樂之城', civic: '文教之城' };
const STYLE_OF = { '餐飲': 'food', '交通': 'transport', '購物': 'shop', '娛樂': 'fun', '醫療': 'civic', '教育': 'civic' };
const STYLES = Object.keys(STYLE_NAME);
const styleOf = cat => STYLE_OF[cat] || 'home';
const tierOf = k => k < 8 ? 'S' : k < 18 ? 'M' : 'L';

function sharesOf(cum) {
  const total = STYLES.reduce((s, k) => s + (cum[k] || 0), 0);
  if (!total) return null;
  const out = {};
  STYLES.forEach(k => { out[k] = (cum[k] || 0) / total; });
  return out;
}

// 第 k 棟的樣子：用該格固定的亂數，加上完工當時的消費組成決定風格
function makeBuilding(world, k, shares) {
  if (k === CITY.SLOTS - 1) return MONUMENT;
  const r = rngOf(world.seed + '#' + k);
  const tier = tierOf(k);
  const pool = STYLES.map(s => [s, 0.1 + (shares ? shares[s] : 0.1)]);
  if (tier === 'S') pool.push(['nature', 0.18]);
  let roll = r() * pool.reduce((s, p) => s + p[1], 0);
  let style = pool[pool.length - 1][0];
  for (const [s, w] of pool) { if ((roll -= w) < 0) { style = s; break; } }
  const list = (LIB[style] && LIB[style][tier]) || LIB.home[tier];
  return Object.assign({ style }, pick(r, list)(r, world.theme));
}

/* ---------- Budget per month ---------- */

/* 每月預算
   - cityBudgets[月份]：該月自己的預算（過去月份、本月、或被單獨設定過的未來月份）
   - cfg.budget：預設值，沒有單獨設定的月份（主要是未來月份）都用它
   修改某個月時：
   - 過去月份：只改那個月
   - 本月或未來月份：改那個月，並讓之後尚未開始的月份一起改；
     更早的月份（含過去）先鎖定原本的預算，所以不會被回溯 */
function monthBudget(m) {
  return Number(state.cfg.cityBudgets[m]) || state.cfg.budget;
}

// 已結束的月份鎖定當時的預算，之後改預算不會改變過去的城市
function snapshotBudgets(save = true) {
  if (!state.cfg.budget) return false;
  const now = ymOf(new Date());
  let changed = false;
  new Set(state.tx.map(t => t.date.slice(0, 7))).forEach(m => {
    if (m < now && !state.cfg.cityBudgets[m]) { state.cfg.cityBudgets[m] = state.cfg.budget; changed = true; }
  });
  if (changed && save) saveCfg();
  return changed;
}

function setMonthBudget(m, value) {
  const cfg = state.cfg;
  const now = ymOf(new Date());
  const v = Math.max(0, Math.round(Number(value) || 0));
  snapshotBudgets(false);
  if (m < now) {
    cfg.cityBudgets[m] = v;
  } else {
    // 本月到 m 之前、還沒單獨設定的月份維持原本的預算
    if (cfg.budget) {
      for (let k = now; k < m; k = shiftMonth(k, 1)) {
        if (!cfg.cityBudgets[k]) cfg.cityBudgets[k] = cfg.budget;
      }
    }
    // m 之後的月份改為跟隨新的預算
    Object.keys(cfg.cityBudgets).forEach(k => { if (k > m) delete cfg.cityBudgets[k]; });
    cfg.cityBudgets[m] = v;
    cfg.budget = v;
  }
  saveCfg();
}

/* ---------- Game state (derived) ---------- */

function gradeOf(ratio) {
  if (ratio >= 0.3) return { key: 'S', name: '繁榮都市' };
  if (ratio >= 0.15) return { key: 'A', name: '熱鬧城鎮' };
  if (ratio >= 0) return { key: 'B', name: '寧靜小鎮' };
  return { key: 'C', name: '荒廢村落' };
}

const PERKS = [
  { key: 'rainbow', name: '彩虹', desc: '滿 7 天且整月沒有停工', on: '白天出現在天空', test: c => c.log.length >= 7 && !c.log.some(e => e.kind === 'halt' || e.kind === 'fire') },
  { key: 'fireworks', name: '煙火', desc: '連續守住預算 7 天', on: '入夜後施放', test: c => c.bestStreak >= CITY.STREAK },
  { key: 'balloon', name: '熱氣球', desc: '本月記帳滿 15 天', on: '白天出現在天空', test: c => c.recordDays >= 15 },
  { key: 'airship', name: '飛行船', desc: '城市人口達 150', on: '已出現在天空', test: c => c.pop >= 150 }
];

function cityOf(m) {
  const K = CITY;
  const world = worldOf(m);
  const budget = monthBudget(m);
  const days = daysIn(m);
  const daily = budget / days;
  const today = ymd(new Date());
  const final = m < ymOf(new Date());

  const byDay = {};
  let spent = 0;
  for (const t of monthTx(m)) {
    const e = byDay[t.date] || (byDay[t.date] = { spent: 0, count: 0, styles: {} });
    e.count++;
    if (t.type === 'expense') {
      e.spent += t.amount;
      spent += t.amount;
      const s = styleOf(t.category);
      e.styles[s] = (e.styles[s] || 0) + t.amount;
    }
  }

  let points = 0, streak = 0, bestStreak = 0, goodDays = 0, builtNow = 0;
  const cum = {};
  const slotShares = [];
  const log = [];
  for (let i = 1; i <= days; i++) {
    const date = `${m}-${pad(i)}`;
    if (date > today) break;
    const e = byDay[date] || { spent: 0, count: 0, styles: {} };
    Object.keys(e.styles).forEach(s => { cum[s] = (cum[s] || 0) + e.styles[s]; });
    let kind, gain = 0, bonus = 0;
    if (e.spent > daily * K.FIRE_X) { kind = 'fire'; gain = K.FIRE; streak = 0; }
    else if (e.spent > daily) { kind = 'halt'; streak = 0; }
    else if (!e.count) { kind = 'idle'; gain = K.IDLE; }
    else {
      kind = 'build';
      gain = K.BASE + K.RECORD + Math.round(K.SAVE_MAX * (daily - e.spent) / daily);
      streak++;
      goodDays++;
      if (streak % K.STREAK === 0) bonus = K.STREAK_BONUS;
    }
    bestStreak = Math.max(bestStreak, streak);
    const before = points;
    points = Math.max(0, points + gain + bonus);
    const nb = builtCount(points);
    // 新完工的建築記下當天的消費組成，之後就固定
    for (let k = builtNow; k < nb; k++) slotShares[k] = sharesOf(cum);
    log.push({ date, spent: e.spent, count: e.count, kind, bonus, gain: points - before, live: date === today, lost: builtNow - nb > 0 ? builtNow - nb : 0 });
    builtNow = nb;
  }

  const built = builtCount(points);
  const buildings = slotShares.slice(0, built).map((s, k) => makeBuilding(world, k, s));
  const prevSum = built ? COST_SUM[built - 1] : 0;
  const next = built < K.SLOTS ? makeBuilding(world, built, sharesOf(cum)) : null;
  const nextCost = next ? SLOT_COST[built] : 0;
  const elapsed = final ? days : Math.max(1, log.length);
  // 進行中的月份依目前花費速度推估月底結餘
  const projected = final ? spent : spent / elapsed * days;
  const ratio = budget ? (budget - projected) / budget : 0;
  const shares = sharesOf(cum);
  const style = shares ? STYLES.reduce((a, b) => (shares[b] > shares[a] ? b : a), 'home') : 'home';

  const c = {
    m, world, budget, daily, days, spent, projected, ratio, final, log, points, built, buildings,
    next, nextCost,
    progress: next ? (points - prevSum) / nextCost : 1,
    need: next ? nextCost - (points - prevSum) : 0,
    pop: buildings.reduce((s, b) => s + b.pop, 0),
    grade: gradeOf(ratio), style,
    streak, bestStreak, goodDays,
    recordDays: log.filter(e => e.count).length,
    last: log[log.length - 1] || null,
    gray: ratio < 0
  };
  c.perks = PERKS.filter(p => p.test(c)).map(p => p.key);
  return c;
}

/* ---------- Renderer primitives ---------- */

let THEME = SEASONS.spring;
let NIGHT = false;
let UID = 0;
const CURB = 1.6;  // 街廓高出路面的高度，建築蓋在街廓上

const fx = n => Math.round(n * 10) / 10;
const pts = list => list.map(p => fx(p[0]) + ',' + fx(p[1])).join(' ');
const pt = p => fx(p[0]) + ' ' + fx(p[1]);
const poly = (list, fill, extra) => `<polygon points="${pts(list)}" fill="${fill}"${extra ? ' ' + extra : ''}/>`;

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const mix = v => Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt));
  return '#' + ((1 << 24) | (mix(n >> 16) << 16) | (mix((n >> 8) & 255) << 8) | mix(n & 255)).toString(16).slice(1);
}

function mixHex(a, b, t) {
  const p = parseInt(a.slice(1), 16), q = parseInt(b.slice(1), 16);
  const ch = s => Math.round(((p >> s) & 255) * (1 - t) + ((q >> s) & 255) * t);
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}

// 夜晚把所有材質壓暗偏藍，亮燈的窗戶與路燈不經過這裡
const tone = c => NIGHT ? mixHex(c, '#1F2838', 0.55) : c;

function isoFaces(cx, cy, f, h, z) {
  const a = CITY.TW / 2 * f, b = CITY.TH / 2 * f, y = cy - z;
  return {
    a, b, y,
    top: [[cx, y - b - h], [cx + a, y - h], [cx, y + b - h], [cx - a, y - h]],
    left: [[cx - a, y - h], [cx, y + b - h], [cx, y + b], [cx - a, y]],
    right: [[cx, y + b - h], [cx + a, y - h], [cx + a, y], [cx, y + b]]
  };
}

function diamondPts(cx, cy, f) {
  const a = CITY.TW / 2 * f, b = CITY.TH / 2 * f;
  return [[cx, cy - b], [cx + a, cy], [cx, cy + b], [cx - a, cy]];
}

const litAt = (r, k, side, cx) => (r * 7 + k * 13 + side * 5 + Math.round(cx * 3)) % 5 !== 0;

function drawWindows(cx, F, h, w) {
  const { a, b, y } = F;
  const faces = [
    [(u, v) => [cx - a + u * a, y + u * b - v * h], `url(#gl${UID})`, '#F2D7A0', 0],
    [(u, v) => [cx + u * a, y + b - u * b - v * h], `url(#gr${UID})`, '#DDBA7E', 1]
  ];
  const quad = (P, u0, u1, v0, v1) => [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)];
  const night = (side) => side ? '#3B4557' : '#465166';
  let s = '', lit = '';
  for (const [P, glass, warm, side] of faces) {
    const fill = w.dark ? tone(side ? '#4E5359' : '#5E636A') : NIGHT ? night(side) : glass;
    if (w.type === 'curtain') {
      s += poly(quad(P, 0.03, 0.97, 0.03, 0.97), fill);
      let lines = '';
      for (let r = 1; r < w.rows; r++) { const v = 0.03 + r * 0.94 / w.rows; lines += `M${pt(P(0.03, v))}L${pt(P(0.97, v))}`; }
      for (let k = 1; k < w.cols; k++) { const u = 0.03 + k * 0.94 / w.cols; lines += `M${pt(P(u, 0.03))}L${pt(P(u, 0.97))}`; }
      s += `<path d="${lines}" stroke="#FFFFFF" stroke-opacity="${NIGHT ? .08 : .3}" stroke-width=".6" fill="none"/>`;
      if (NIGHT) {
        for (let r = 0; r < w.rows; r++) {
          for (let k = 0; k < w.cols; k++) {
            if (!litAt(r, k, side, cx) || (r + k) % 3 === 0) continue;
            const u0 = 0.03 + k * 0.94 / w.cols, v0 = 0.03 + r * 0.94 / w.rows;
            lit += poly(quad(P, u0 + 0.01, u0 + 0.94 / w.cols - 0.01, v0 + 0.01, v0 + 0.94 / w.rows - 0.01), warm);
          }
        }
      }
    } else if (w.type === 'band') {
      const rh = 0.84 / w.rows;
      for (let r = 0; r < w.rows; r++) {
        const v0 = 0.1 + r * rh + rh * 0.22, v1 = v0 + rh * 0.52;
        const on = NIGHT && !w.dark && litAt(r, 1, side, cx);
        const band = poly(quad(P, 0.06, 0.94, v0, v1), on ? warm : fill);
        if (on) lit += band; else s += band;
        let m = '';
        for (let k = 1; k < w.cols; k++) { const u = 0.06 + k * 0.88 / w.cols; m += `M${pt(P(u, v0))}L${pt(P(u, v1))}`; }
        if (m) (on ? (lit += `<path d="${m}" stroke="#8A6E40" stroke-width=".5"/>`) : (s += `<path d="${m}" stroke="#FFFFFF" stroke-opacity=".3" stroke-width=".5"/>`));
      }
    } else {
      const cw = 0.76 / w.cols, rh = 0.74 / w.rows;
      for (let r = 0; r < w.rows; r++) {
        for (let k = 0; k < w.cols; k++) {
          const u0 = 0.12 + k * cw + cw * 0.22, u1 = u0 + cw * 0.56;
          const v0 = 0.14 + r * rh + rh * 0.2, v1 = v0 + rh * 0.56;
          const on = NIGHT && litAt(r, k, side, cx);
          const pane = poly(quad(P, u0, u1, v0, v1), on ? warm : fill);
          if (on) lit += pane; else s += pane;
          s += `<path d="M${pt(P(u0 - 0.01, v0 - 0.03))}L${pt(P(u1 + 0.01, v0 - 0.03))}" stroke="${tone('#FFFFFF')}" stroke-opacity=".45" stroke-width=".7"/>`;
        }
      }
    }
  }
  return s + (lit ? `<g filter="url(#gw${UID})">${lit}</g>` : '');
}

function drawBox(cx, cy, p) {
  const z = p.z || 0;
  const F = isoFaces(cx, cy, p.f, p.h, z);
  let s = poly(F.left, tone(shade(p.c, -0.02))) + poly(F.right, tone(shade(p.c, -0.16)));
  if (!p.noAo) s += poly(F.left, `url(#ao${UID})`) + poly(F.right, `url(#ao${UID})`);
  if (p.win) s += drawWindows(cx, F, p.h, p.win);
  const topC = THEME.snow && !p.noSnow ? '#F3F5F7' : shade(p.c, 0.16);
  s += poly(F.top, tone(topC));
  if (p.parapet && p.f > 0.2) {
    // 女兒牆：屋頂內縮一圈較暗，看起來有深度
    s += poly(diamondPts(cx, F.y - p.h, p.f * 0.84), tone(THEME.snow ? '#E6EAEE' : shade(topC, -0.1)));
  }
  for (let i = 0; i < (p.units || 0); i++) {
    const ox = (i ? 6 : -5) * p.f, oy = (i ? 1 : -2) * p.f;
    s += drawBox(cx + ox, cy + oy, { f: 0.1, h: 3.5, c: '#B9B7B2', z: z + p.h, noAo: true });
  }
  return s;
}

function drawRoof(cx, cy, p) {
  const a = CITY.TW / 2 * p.f, b = CITY.TH / 2 * p.f, y = cy - p.z;
  const L = [cx - a, y], B = [cx, y + b], R = [cx + a, y], A = [cx, y - p.h];
  const left = THEME.snow ? '#EEF1F4' : shade(p.c, 0.05), right = THEME.snow ? '#D9DFE4' : shade(p.c, -0.18);
  return poly([L, B, A], tone(left)) + poly([B, R, A], tone(right));
}

// 雙斜屋頂：屋脊沿 i 方向，看得到前後兩片屋面與右側山牆
function drawGable(cx, cy, p) {
  const a = CITY.TW / 2 * p.f, b = CITY.TH / 2 * p.f, y = cy - p.z;
  const T = [cx, y - b], R = [cx + a, y], B = [cx, y + b], L = [cx - a, y];
  const M1 = [(L[0] + T[0]) / 2, (L[1] + T[1]) / 2 - p.h], M2 = [(B[0] + R[0]) / 2, (B[1] + R[1]) / 2 - p.h];
  const back = THEME.snow ? '#F3F5F7' : shade(p.c, 0.12), front = THEME.snow ? '#E3E8EC' : p.c;
  return poly([M1, M2, R, T], tone(back))
    + poly([L, B, M2, M1], tone(front))
    + `<path d="M${pt(L)}L${pt(B)}" stroke="${tone(shade(p.c, -0.3))}" stroke-width=".8"/>`
    + poly([B, R, M2], tone(shade(p.wall, -0.16)));
}

function drawTree(cx, cy, p) {
  const s = p.s, x = cx + p.dx, y = cy + p.dy - CURB, c = tone(p.c || THEME.canopy[0]);
  const blobs = [[-3, -11, 5.2], [3.5, -10.5, 4.8], [0, -15, 5.8]];
  let out = `<ellipse cx="${fx(x + 6 * s)}" cy="${fx(y + 2 * s)}" rx="${fx(8 * s)}" ry="${fx(3.2 * s)}" fill="#1F1D1A" opacity=".14"/>`
    + `<path d="M${fx(x)} ${fx(y)}L${fx(x)} ${fx(y - 9 * s)}" stroke="${tone('#5E4B3C')}" stroke-width="${fx(1.8 * s)}"/>`;
  out += blobs.map(([dx, dy, r]) => `<circle cx="${fx(x + dx * s)}" cy="${fx(y + dy * s)}" r="${fx(r * s)}" fill="${c}"/>`).join('');
  out += blobs.map(([dx, dy, r]) => `<circle cx="${fx(x + dx * s)}" cy="${fx(y + dy * s)}" r="${fx(r * s)}" fill="url(#lf${UID})"/>`).join('');
  if (THEME.snow) out += `<ellipse cx="${fx(x)}" cy="${fx(y - 19 * s)}" rx="${fx(4.2 * s)}" ry="${fx(1.8 * s)}" fill="#F7F9FB"/>`;
  return out;
}

function drawWheel(cx, cy) {
  const hx = cx, hy = cy - CURB - 38, r = 27;
  const steel = tone('#E9EBEC'), dark = tone('#8C9298');
  let s = `<path d="M${cx - 13} ${cy - CURB + 3}L${hx} ${hy}L${cx + 13} ${cy - CURB + 3}" fill="none" stroke="${dark}" stroke-width="2"/>`
    + `<circle cx="${hx}" cy="${hy}" r="${r}" fill="none" stroke="${steel}" stroke-width="1.6"/>`
    + `<circle cx="${hx}" cy="${hy}" r="${r - 3}" fill="none" stroke="${steel}" stroke-width=".7"/>`;
  for (let i = 0; i < 12; i++) {
    const t = i * Math.PI / 6, x = hx + r * Math.cos(t), y = hy + r * Math.sin(t);
    s += `<path d="M${hx} ${hy}L${fx(x)} ${fx(y)}" stroke="${steel}" stroke-width=".5"/>`
      + `<rect x="${fx(x - 2.2)}" y="${fx(y)}" width="4.4" height="4" rx="1.4" fill="${NIGHT && i % 2 ? '#F2D7A0' : tone(i % 3 ? '#F2F1EE' : '#2F4458')}"/>`;
  }
  return s + `<circle cx="${hx}" cy="${hy}" r="2.4" fill="${dark}"/>`;
}

function drawLot(cx, cy, p) {
  const fill = p.kind === 'grass' ? THEME.grass : p.kind === 'water' ? `url(#wt${UID})` : p.kind === 'plaza' ? '#E9E5DD' : '#E2DFD8';
  return poly(diamondPts(cx, cy - CURB - (p.z || 0), p.f), p.kind === 'water' ? fill : tone(fill));
}

function drawParts(parts, cx, cy) {
  return parts.map(p => {
    const x = cx + (p.t !== 'tree' && p.dx || 0), y = cy + (p.t !== 'tree' && p.dy || 0) - CURB;
    if (p.t === 'box') return drawBox(x, y, p);
    if (p.t === 'roof') return drawRoof(x, y, p);
    if (p.t === 'gable') return drawGable(x, y, p);
    if (p.t === 'lot') return drawLot(cx, cy, p);
    if (p.t === 'tree') return drawTree(cx, cy, p);
    if (p.t === 'wheel') return drawWheel(cx, cy);
    if (p.t === 'dots') return p.list.map(([dx, dy, c]) => `<circle cx="${fx(cx + dx)}" cy="${fx(cy - CURB + dy)}" r="1.5" fill="${tone(c)}"/>`).join('');
    return '';
  }).join('');
}

// 建築在地面上的投影：光從左上方來，影子落向右前方
function drawShadows(parts, cx, cy) {
  let s = '';
  for (const p of parts) {
    if (p.t !== 'box' || p.z || p.f < 0.12) continue;
    const top = parts.filter(q => (q.dx || 0) === (p.dx || 0) && (q.dy || 0) === (p.dy || 0) && (q.t === 'box' || q.t === 'roof' || q.t === 'gable'))
      .reduce((m, q) => Math.max(m, (q.t === 'box' ? (q.z || 0) + q.h : q.z + q.h * 0.6)), 0);
    if (top < 5) continue;
    const x = cx + (p.dx || 0), y = cy + (p.dy || 0) - CURB;
    const [T, R, B, L] = diamondPts(x, y, p.f);
    const ox = top * 0.42, oy = ox * 0.5;
    s += poly([L, T, [T[0] + ox, T[1] + oy], [R[0] + ox, R[1] + oy], [B[0] + ox, B[1] + oy], B], '#1F1D1A');
  }
  return s;
}

// 任意底面多邊形往上長出的立體（用於車輛）：只畫朝向觀看者的側面
function drawPrism(base, h, c) {
  let area = 0;
  base.forEach((p, i) => { const q = base[(i + 1) % base.length]; area += p[0] * q[1] - q[0] * p[1]; });
  let s = '';
  base.forEach((p, i) => {
    const q = base[(i + 1) % base.length];
    let nx = q[1] - p[1], ny = -(q[0] - p[0]);
    if (area < 0) { nx = -nx; ny = -ny; }
    if (ny > 0.01) s += poly([p, q, [q[0], q[1] - h], [p[0], p[1] - h]], tone(shade(c, nx < 0 ? -0.04 : -0.2)));
  });
  return s + poly(base.map(p => [p[0], p[1] - h]), tone(shade(c, 0.1)));
}

function drawCar(x, y, dir, c) {
  const { TW, TH } = CITY;
  const u = dir === 'i' ? [TW / 2, TH / 2] : [-TW / 2, TH / 2];
  const v = dir === 'i' ? [-TW / 2, TH / 2] : [TW / 2, TH / 2];
  const P = (l, w) => [x + u[0] * l + v[0] * w, y + u[1] * l + v[1] * w];
  const body = [P(-0.085, -0.04), P(0.085, -0.04), P(0.085, 0.04), P(-0.085, 0.04)];
  const cabin = [P(-0.045, -0.034), P(0.04, -0.034), P(0.04, 0.034), P(-0.045, 0.034)].map(p => [p[0], p[1] - 2.4]);
  return `<ellipse cx="${fx(x + 2)}" cy="${fx(y + 1)}" rx="6" ry="2.4" fill="#1F1D1A" opacity=".12"/>`
    + drawPrism(body, 2.4, c) + drawPrism(cabin, 1.6, NIGHT ? '#3B4557' : '#5F6B78');
}

function drawWater(cx, cy) {
  return poly(diamondPts(cx, cy + 1, 1), `url(#wt${UID})`)
    + `<path d="M${fx(cx - 14)} ${fx(cy - 1)}q4 -1.5 8 0t8 0M${fx(cx - 3)} ${fx(cy + 6)}q4 -1.5 8 0t8 0" fill="none" stroke="#FFFFFF" stroke-width=".7" opacity="${NIGHT ? .15 : .45}"/>`;
}

function drawBoat(cx, cy) {
  const hull = tone('#F2F1EE'), deck = tone('#A88463');
  return `<g class="bob"><ellipse cx="${cx + 3}" cy="${cy + 3}" rx="10" ry="2.6" fill="#1F2838" opacity=".12"/>`
    + poly([[cx - 10, cy], [cx + 10, cy], [cx + 7, cy + 4], [cx - 7, cy + 4]], hull)
    + poly([[cx - 8, cy], [cx + 8, cy], [cx + 7, cy - 1.2], [cx - 7, cy - 1.2]], deck)
    + poly([[cx, cy - 17], [cx, cy - 2], [cx + 9, cy - 2]], tone('#FBFAF7'))
    + `<path d="M${cx} ${cy - 18}L${cx} ${cy}" stroke="${tone('#6B5A48')}" stroke-width=".8"/></g>`;
}

// 施工中的工地：鷹架虛線框 + 依進度填滿；停工時改為紅色並放三角錐
function drawSite(cx, cy, progress, halted) {
  const f = 0.6, h = 26, y = cy - CURB;
  const F = isoFaces(cx, y, f, h, 0);
  const stroke = halted ? '#B04A3A' : '#8F8676';
  let s = poly(diamondPts(cx, y, 0.8), tone('#E3DACB'));
  if (progress > 0) s += drawBox(cx, y, { f, h: Math.max(2, h * progress), c: '#CFC8BA', noSnow: true });
  s += [F.left, F.right, F.top].map(p => poly(p, 'none', `stroke="${stroke}" stroke-width=".8" stroke-dasharray="2.5 2"`)).join('');
  if (halted) {
    s += poly([[cx + 20, y + 4], [cx + 23, y - 6], [cx + 26, y + 4]], '#D06A3F') + `<rect x="${cx + 19}" y="${y + 3}" width="8" height="1.6" fill="#9E4A2E"/>`;
  } else {
    const steel = tone('#C8A04A');
    s += `<path d="M${cx - 22} ${y + 2}L${cx - 22} ${y - 50}M${cx - 30} ${y - 50}L${cx + 16} ${y - 50}" stroke="${steel}" stroke-width="1.6"/>`
      + `<path d="M${cx - 22} ${y - 56}L${cx - 30} ${y - 50}M${cx - 22} ${y - 56}L${cx + 16} ${y - 50}" stroke="${steel}" stroke-width=".5"/>`
      + `<path d="M${cx + 8} ${y - 50}L${cx + 8} ${y - 34}" stroke="${tone('#5B6066')}" stroke-width=".6"/>`
      + `<rect x="${cx + 5.5}" y="${y - 34}" width="5" height="3" fill="${tone('#8A7058')}"/>`;
  }
  return s;
}

/* ---------- Sky ---------- */

function defsOf(sky) {
  const u = UID, wtr = THEME.water;
  return `<defs>
    <linearGradient id="sky${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>
    <linearGradient id="ao${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".1"/><stop offset=".55" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity=".17"/></linearGradient>
    <linearGradient id="gl${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B7C5D1"/><stop offset="1" stop-color="#7D90A2"/></linearGradient>
    <linearGradient id="gr${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#93A4B4"/><stop offset="1" stop-color="#5F7286"/></linearGradient>
    <linearGradient id="wt${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${tone(shade(wtr, 0.14))}"/><stop offset="1" stop-color="${tone(shade(wtr, -0.1))}"/></linearGradient>
    <linearGradient id="mt${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EEF0F1"/><stop offset="1" stop-color="#9DA3A9"/></linearGradient>
    <radialGradient id="lf${u}" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".28"/><stop offset=".55" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity=".24"/></radialGradient>
    <filter id="bl${u}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
    <filter id="gw${u}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>`;
}

function drawBalloon(x, y, a, b, i) {
  return `<g class="float f${i}">`
    + `<path d="M${x} ${y - 15}C${x + 12} ${y - 15} ${x + 12} ${y - 1} ${x + 4} ${y + 7}L${x - 4} ${y + 7}C${x - 12} ${y - 1} ${x - 12} ${y - 15} ${x} ${y - 15}Z" fill="${a}"/>`
    + `<path d="M${x} ${y - 15}C${x + 5} ${y - 15} ${x + 5} ${y - 1} ${x + 1.6} ${y + 7}L${x - 1.6} ${y + 7}C${x - 5} ${y - 1} ${x - 5} ${y - 15} ${x} ${y - 15}Z" fill="${b}"/>`
    + `<path d="M${x} ${y - 15}C${x + 12} ${y - 15} ${x + 12} ${y - 1} ${x + 4} ${y + 7}L${x - 4} ${y + 7}C${x - 12} ${y - 1} ${x - 12} ${y - 15} ${x} ${y - 15}Z" fill="url(#lf${UID})"/>`
    + `<path d="M${x - 4} ${y + 7}L${x - 2} ${y + 12}M${x + 4} ${y + 7}L${x + 2} ${y + 12}" stroke="#6E5640" stroke-width=".5"/>`
    + `<rect x="${x - 2.2}" y="${y + 12}" width="4.4" height="3.2" fill="#6E5640"/></g>`;
}

function drawSky(c, vb, mini) {
  const r = rngOf(c.world.seed + '|sky');
  const kind = !c.final && c.last ? c.last.kind : 'build';
  const gloomy = !mini && (kind === 'halt' || kind === 'fire');
  const sky = NIGHT ? ['#1A2130', '#36415A'] : gloomy ? ['#C9CDD1', '#ECECEA'] : THEME.sky;
  let s = defsOf(sky) + `<rect x="${vb.x}" y="${vb.y}" width="${vb.w}" height="${vb.h}" fill="url(#sky${UID})"/>`;

  if (NIGHT) {
    for (let i = 0; i < 22; i++) s += `<circle cx="${fx(vb.x + r() * vb.w)}" cy="${fx(vb.y + r() * 120)}" r="${fx(0.4 + r() * 0.6)}" fill="#FFFFFF" opacity="${fx(0.3 + r() * 0.5)}"/>`;
    const mx = vb.x + vb.w - 56, my = vb.y + 36;
    s += `<circle cx="${mx}" cy="${my}" r="18" fill="#F4EBCF" opacity=".12" filter="url(#bl${UID})"/><circle cx="${mx}" cy="${my}" r="7" fill="#EFE6CB"/>`;
  }
  if (c.perks.includes('rainbow') && !NIGHT && !gloomy) {
    s += `<g opacity=".28" filter="url(#bl${UID})">${['#E9A9A4', '#EFD39B', '#B9D8B9', '#A9C7E3'].map((col, i) => {
      const rad = 180 - i * 7;
      return `<path d="M${-rad} 30A${rad} ${rad} 0 0 1 ${rad} 30" fill="none" stroke="${col}" stroke-width="7"/>`;
    }).join('')}</g>`;
  }
  const cloudC = NIGHT ? '#4A5670' : gloomy ? '#B9BEC4' : '#FFFFFF';
  for (let i = 0; i < (gloomy ? 6 : 4); i++) {
    const x = vb.x + 30 + r() * (vb.w - 60), y = vb.y + 20 + r() * 70, w = 30 + r() * 30;
    s += `<g class="cloud d${i % 3}" filter="url(#bl${UID})" opacity="${NIGHT ? .5 : .85}"><ellipse cx="${fx(x)}" cy="${fx(y)}" rx="${fx(w)}" ry="${fx(w * 0.22)}" fill="${cloudC}"/><ellipse cx="${fx(x + w * 0.2)}" cy="${fx(y - w * 0.12)}" rx="${fx(w * 0.45)}" ry="${fx(w * 0.2)}" fill="${cloudC}"/></g>`;
  }
  if (c.perks.includes('airship')) {
    const x = vb.x + 74, y = vb.y + 58;
    s += `<g class="drift"><ellipse cx="${x}" cy="${y}" rx="25" ry="7" fill="url(#mt${UID})"/>`
      + poly([[x - 21, y - 2], [x - 30, y - 8], [x - 29, y + 1]], '#8C9298') + poly([[x - 21, y + 2], [x - 29, y + 7], [x - 27, y + 1]], '#7A8086')
      + `<rect x="${x - 6}" y="${y + 6}" width="12" height="3.2" rx="1.4" fill="#5B6066"/>`
      + (NIGHT ? `<circle cx="${x - 6}" cy="${y + 7.6}" r="1" fill="#F2D7A0" filter="url(#gw${UID})"/>` : '') + '</g>';
  }
  if (c.perks.includes('balloon') && !NIGHT) {
    s += drawBalloon(vb.x + vb.w - 74, vb.y + 96, '#9C4537', '#E9DFCF', 0) + drawBalloon(vb.x + 52, vb.y + 128, '#2F4458', '#D9DEE3', 1);
  }
  if (c.perks.includes('fireworks') && NIGHT) {
    [[-120, vb.y + 50, '#F2D7A0'], [130, vb.y + 74, '#F0B9AE'], [10, vb.y + 34, '#BFD6EA']].forEach(([x, y, col], i) => {
      let rays = '';
      for (let k = 0; k < 16; k++) {
        const t = k * Math.PI / 8, r1 = 3, r2 = 12 + (k % 2) * 3;
        rays += `M${fx(x + r1 * Math.cos(t))} ${fx(y + r1 * Math.sin(t))}L${fx(x + r2 * Math.cos(t))} ${fx(y + r2 * Math.sin(t))}`;
      }
      s += `<g class="burst b${i}" filter="url(#gw${UID})"><path d="${rays}" stroke="${col}" stroke-width=".8" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="1.2" fill="${col}"/></g>`;
    });
  }
  return s;
}

function drawWeatherFront(c, vb, mini, smokeAt) {
  const r = rngOf(c.world.seed + '|snow');
  let s = '';
  if (THEME.snow) {
    for (let i = 0; i < (mini ? 24 : 46); i++) {
      s += `<circle class="${mini ? '' : 'snow s' + (i % 4)}" cx="${fx(vb.x + r() * vb.w)}" cy="${fx(vb.y + r() * (vb.h - 40))}" r="${fx(0.6 + r() * 0.8)}" fill="#FFFFFF" opacity=".85"/>`;
    }
  }
  if (smokeAt) {
    const [x, y] = smokeAt;
    s += `<g filter="url(#bl${UID})">`;
    for (let i = 0; i < 4; i++) s += `<circle class="smoke m${i}" cx="${x + (i % 2 ? 5 : -4)}" cy="${y - 24 - i * 13}" r="${7 + i * 3}" fill="#6F737A" opacity=".45"/>`;
    s += '</g>';
  }
  return s;
}

/* ---------- City scene ---------- */

function citySvg(c, mini) {
  const { GRID: G, TW, TH } = CITY;
  const w = c.world;
  THEME = w.theme;
  UID++;
  const hour = new Date().getHours();
  NIGHT = !mini && !c.final && (hour >= 18 || hour < 6);

  const xy = (i, j) => [(i - j) * TW / 2, (i + j) * TH / 2];
  const corner = (u, v) => [(u - v) * TW / 2, (u + v) * TH / 2 - TH / 2];
  const key = (i, j) => i + ',' + j;
  const isLand = (i, j) => i >= 0 && j >= 0 && i < G && j < G && !w.water.has(key(i, j));
  const D = 12;
  const vb = { x: -G * TW / 2 - 24, y: -150, w: G * TW + 48, h: (G - 0.5) * TH + D + 168 };

  // 地台：道路鋪面 + 側面
  const T = corner(0, 0), R = corner(G, 0), B = corner(G, G), L = corner(0, G);
  const down = p => [p[0], p[1] + D];
  let ground = poly([L, B, down(B), down(L)], tone('#C3BFB7')) + poly([B, R, down(R), down(B)], tone('#AEAAA2'))
    + poly([L, B, down(B), down(L)], `url(#ao${UID})`) + poly([B, R, down(R), down(B)], `url(#ao${UID})`)
    + poly([T, R, B, L], tone(THEME.road));

  // 水域
  for (const [i, j] of w.waterCells) ground += drawWater(...xy(i, j));

  // 車道標線
  const r = rngOf(w.seed + '|street');
  let lanes = '';
  const segs = [];
  for (let i = 0; i < G; i++) {
    for (let j = 0; j < G; j++) {
      if (!isLand(i, j)) continue;
      if (isLand(i + 1, j)) segs.push({ a: corner(i + 1, j), b: corner(i + 1, j + 1), dir: 'j', d: i + j + 0.5 });
      if (isLand(i, j + 1)) segs.push({ a: corner(i, j + 1), b: corner(i + 1, j + 1), dir: 'i', d: i + j + 0.5 });
    }
  }
  segs.forEach(sg => { lanes += `M${pt(sg.a)}L${pt(sg.b)}`; });
  ground += `<path d="${lanes}" stroke="${tone('#FFFFFF')}" stroke-opacity=".75" stroke-width=".8" stroke-dasharray="3 4" fill="none"/>`;

  // 街廓：人行道（略高於路面）與內部地面
  const site = !mini && !c.final && c.built < CITY.SLOTS ? c.built : -1;
  const slotOf = {};
  w.order.forEach(([i, j], k) => { slotOf[key(i, j)] = k; });
  const spareSet = new Set(w.spare.map(([i, j]) => key(i, j)));
  for (let i = 0; i < G; i++) {
    for (let j = 0; j < G; j++) {
      if (!isLand(i, j)) continue;
      const [x, y] = xy(i, j);
      ground += drawBox(x, y, { f: 0.88, h: CURB, c: '#E9E7E2', noAo: true, noSnow: false });
      const k = slotOf[key(i, j)];
      const inner = spareSet.has(key(i, j)) ? THEME.grass : k !== undefined && k < c.built ? '#E2DFD8' : '#E6E3DC';
      ground += poly(diamondPts(x, y - CURB, 0.78), tone(THEME.snow ? '#EEF1F4' : inner));
    }
  }

  // 投影
  let shadows = '';
  c.buildings.forEach((b, k) => { shadows += drawShadows(b.parts, ...xy(...w.order[k])); });
  // 投影只落在地台上，不超出邊緣
  ground += `<clipPath id="cp${UID}">${poly([T, R, B, L], '#000')}</clipPath>`
    + `<g clip-path="url(#cp${UID})"><g opacity="${NIGHT ? .25 : .14}">${shadows}</g></g>`;

  // 依前後深度排序：建築、工地、樹、船、車、路燈
  const items = [];
  c.buildings.forEach((b, k) => {
    const [i, j] = w.order[k];
    items.push({ d: i + j, x: i, draw: () => {
      const rise = !mini && !c.final && k === c.built - 1 ? ' class="rise"' : '';
      return `<g${rise}>${drawParts(b.parts, ...xy(i, j))}</g>`;
    } });
  });
  const halted = c.last && !c.final && (c.last.kind === 'halt' || c.last.kind === 'fire');
  if (site >= 0) {
    const [i, j] = w.order[site];
    items.push({ d: i + j, x: i, draw: () => drawSite(...xy(i, j), c.progress, halted) });
  }
  const dr = rngOf(w.seed + '|decor');
  w.spare.forEach(([i, j]) => {
    const t1 = pick(dr, THEME.canopy), t2 = pick(dr, THEME.canopy), two = dr() < 0.65;
    items.push({ d: i + j, x: i, draw: () => {
      const [x, y] = xy(i, j);
      return drawTree(x, y, { dx: two ? -8 : 0, dy: two ? -2 : 0, s: .85, c: t1 }) + (two ? drawTree(x, y, { dx: 9, dy: 4, s: .75, c: t2 }) : '');
    } });
  });
  w.boats.forEach(([i, j]) => items.push({ d: i + j, x: i, draw: () => drawBoat(...xy(i, j)) }));
  segs.forEach(sg => {
    if (r() > 0.32) return;
    const t = 0.25 + r() * 0.5, lane = r() < 0.5 ? -0.05 : 0.05;
    const perp = sg.dir === 'j' ? [TW / 2, TH / 2] : [-TW / 2, TH / 2];
    const x = sg.a[0] + (sg.b[0] - sg.a[0]) * t + perp[0] * lane, y = sg.a[1] + (sg.b[1] - sg.a[1]) * t + perp[1] * lane;
    const color = pick(r, CARS);
    items.push({ d: sg.d, x: x / TW, draw: () => drawCar(x, y, sg.dir, color) });
  });
  for (let u = 1; u < G; u++) {
    for (let v = 1; v < G; v++) {
      if (!isLand(u - 1, v - 1) || !isLand(u, v) || r() > 0.4) continue;
      const [x, y] = corner(u, v);
      const lx = x + 3, ly = y - 1;
      items.push({ d: u + v - 1, x: u, draw: () => `<path d="M${fx(lx)} ${fx(ly)}L${fx(lx)} ${fx(ly - 10)}" stroke="${tone('#4B5056')}" stroke-width=".7"/>`
        + (NIGHT
          ? `<ellipse cx="${fx(lx)}" cy="${fx(ly + 1)}" rx="7" ry="3" fill="#FFE2A6" opacity=".18"/><circle cx="${fx(lx)}" cy="${fx(ly - 10)}" r="1.3" fill="#FFE7B5" filter="url(#gw${UID})"/>`
          : `<circle cx="${fx(lx)}" cy="${fx(ly - 10)}" r=".9" fill="#E8E4DA"/>`) });
    }
  }
  items.sort((p, q) => p.d - q.d || p.x - q.x);
  const body = items.map(it => it.draw()).join('');

  let smokeAt = null;
  if (!mini && !c.final && c.last && c.last.kind === 'fire') smokeAt = xy(...w.order[Math.max(0, Math.min(c.built, CITY.SLOTS - 1))]);

  const svg = `<svg viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" role="img" aria-label="${w.name}：${c.built} 棟建築">`
    + drawSky(c, vb, mini)
    + `<g${c.gray ? ' class="ruins"' : ''}>${ground}${body}</g>`
    + drawWeatherFront(c, vb, mini, smokeAt)
    + '</svg>';
  NIGHT = false;
  return svg;
}

/* ---------- Budget editor ---------- */

let cityEditing = false;

function cityBudgetBar() {
  const m = state.month;
  const b = monthBudget(m);
  if (!cityEditing) {
    return `<div class="budget-line">
      <span>月預算 <b class="num">${money(b)}</b><span class="muted"> · 日預算 ${money(Math.round(b / daysIn(m)))}</span></span>
      <button class="link" data-act="city-edit">修改</button>
    </div>`;
  }
  const scope = m < ymOf(new Date())
    ? `只會修改 ${monthLabel(m)}，其他月份不受影響。`
    : `會套用到 ${monthLabel(m)}及之後尚未開始的月份；之前的月份維持原本的預算。`;
  return `<div class="budget-editor">
    <div class="inline-add">
      <input class="input" id="city-budget-input" inputmode="numeric" value="${b || ''}" placeholder="月預算">
      <button class="btn btn-primary" data-act="city-save-budget">儲存</button>
      <button class="btn btn-ghost" data-act="city-cancel">取消</button>
    </div>
    <p class="city-hint">${scope}</p>
  </div>`;
}

function citySaveBudget() {
  const v = Number($('#city-budget-input').value.replace(/,/g, '')) || 0;
  if (v <= 0) { toast('請輸入大於 0 的預算'); return; }
  setMonthBudget(state.month, v);
  cityEditing = false;
  render();
  toast(`${monthLabel(state.month)}預算已更新`);
}

function cityEdit(on) {
  cityEditing = on;
  render();
  if (on) { const el = $('#city-budget-input'); el.focus(); el.select(); }
}

/* ---------- View ---------- */

const LOG_TEXT = {
  build: e => e.bonus ? `建設 +${e.gain}（含連續獎勵）` : `建設 +${e.gain}`,
  idle: e => `空地整理 +${e.gain}`,
  halt: () => '停工',
  fire: e => `火災 −${-e.gain}${e.lost ? ` · 燒毀 ${e.lost} 棟` : ''}`
};

function cityStatus(c) {
  if (c.final) return { cls: 'done', text: '已完工' };
  const k = c.last ? c.last.kind : 'idle';
  if (k === 'fire') return { cls: 'fire', text: '發生火災' };
  if (k === 'halt') return { cls: 'halt', text: '今日停工' };
  if (k === 'idle') return { cls: 'idle', text: '等待記帳' };
  return { cls: 'build', text: '施工中' };
}

function cityPerks(c) {
  return `<div class="perks">${PERKS.map(p => {
    const on = c.perks.includes(p.key);
    return `<div class="perk ${on ? 'on' : ''}"><span class="perk-dot p-${p.key}"></span><div><b>${p.name}</b><span>${on ? p.on : p.desc}</span></div></div>`;
  }).join('')}</div>`;
}

function cityHero(c) {
  const st = cityStatus(c);
  const w = c.world;
  return `<section class="card span-2 city-hero">
    <div class="city-head">
      <div>
        <div class="eyebrow">${c.m.slice(0, 4)} 年 ${Number(c.m.slice(5))} 月 · ${w.theme.label} · ${TERRAIN_NAME[w.terrain]}</div>
        <h2 class="city-name">${w.name}</h2>
        <div class="city-tags">
          <span class="grade g-${c.grade.key}">${c.grade.key}</span><span>${c.grade.name}${c.final ? '' : '<small>（預估）</small>'}</span>
          <span class="sep"></span><span>${STYLE_NAME[c.style]}</span>
        </div>
      </div>
      <span class="chip ${st.cls}"><i></i>${st.text}</span>
    </div>
    <div class="city-stage">${citySvg(c)}</div>
    <div class="hero-stats four">
      <div><span class="label">建築</span><span class="num">${c.built}<small> / ${CITY.SLOTS}</small></span></div>
      <div><span class="label">人口</span><span class="num">${c.pop}</span></div>
      <div><span class="label">建設點</span><span class="num">${c.points}</span></div>
      <div><span class="label">連續守住</span><span class="num">${c.streak}<small> 天</small></span></div>
    </div>
    ${cityPerks(c)}
    ${cityBudgetBar()}
  </section>`;
}

function cityNext(c) {
  if (!c.next) return '<p class="city-hint">25 棟建築全部完工，這是一座完整的城市！</p>';
  const toBonus = CITY.STREAK - (c.streak % CITY.STREAK);
  return `<div class="next-row"><span>下一棟 <b>${c.next.name}</b></span><span class="num">${c.nextCost - c.need} / ${c.nextCost}</span></div>
    <div class="track"><i style="width:${(c.progress * 100).toFixed(1)}%"></i></div>
    <p class="city-hint">還差 ${c.need} 點 · 再連續守住 ${toBonus} 天可得 +${CITY.STREAK_BONUS} 獎勵<br>建築種類依完工當天的消費組成決定，現在看起來會是「${c.next.name}」。</p>`;
}

function cityToday(c) {
  const t = c.last;
  const left = c.daily - t.spent;
  const over = left < 0;
  const potential = CITY.BASE + CITY.RECORD + Math.round(CITY.SAVE_MAX * Math.max(0, left) / c.daily);
  let hint;
  if (t.kind === 'fire') hint = `今天花費超過日預算 ${CITY.FIRE_X} 倍，發生火災，扣 ${-CITY.FIRE} 點。`;
  else if (over) hint = '今天已超過日預算，工地停工。明天重新開始！';
  else if (!t.count) hint = `記一筆並守住預算，今天可得 <b>+${potential}</b> 點。`;
  else hint = `守住預算到今天結束，可得 <b>+${potential}</b> 點。`;
  return `<section class="card">
    <div class="card-head"><h3>今日工地</h3><span class="meta">日預算 ${money(Math.round(c.daily))}</span></div>
    <div class="today-amt ${over ? 'neg' : ''}"><span class="label">${over ? '今天已超出' : '今天還能花'}</span><span class="num">NT$ ${money(Math.round(Math.abs(left)))}</span></div>
    <div class="track ${over ? 'over' : ''}"><i style="width:${Math.min(100, t.spent / c.daily * 100).toFixed(1)}%"></i></div>
    <p class="city-hint">${hint}</p>
    <div class="divider"></div>
    ${cityNext(c)}
  </section>`;
}

function citySummary(c) {
  const left = c.budget - c.spent;
  const rows = [
    ['月預算', money(c.budget)],
    ['實際支出', money(c.spent)],
    ['結餘', `<span class="${left < 0 ? 'neg-text' : 'pos'}">${left < 0 ? '−' : ''}${money(Math.abs(left))}</span>`],
    ['守住預算', `${c.goodDays} / ${c.days} 天`],
    ['最長連續', `${c.bestStreak} 天`],
    ['完成建築', `${c.built} / ${CITY.SLOTS} 棟`]
  ];
  return `<section class="card">
    <div class="card-head"><h3>月結報告</h3><span class="meta">結餘 ${Math.round(c.ratio * 100)}%</span></div>
    <dl class="kv">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd class="num">${v}</dd></div>`).join('')}</dl>
  </section>`;
}

function cityLog(c) {
  const rows = c.log.slice(-7).reverse();
  return `<section class="card">
    <div class="card-head"><h3>施工日誌</h3><span class="meta">最近 ${rows.length} 天</span></div>
    ${rows.length ? `<div class="log-list">${rows.map(e => `
      <div class="log-row">
        <div class="log-main"><b>${dayLabel(e.date)}</b>${e.live ? '<span class="tag">進行中</span>' : ''}
          <span class="tx-sub">花費 ${money(e.spent)} · ${e.count} 筆紀錄</span></div>
        <span class="chip ${e.kind}">${LOG_TEXT[e.kind](e)}</span>
      </div>`).join('')}</div>` : empty('還沒有施工紀錄')}
  </section>`;
}

function cityRules() {
  const K = CITY;
  return `<section class="card span-2">
    <details class="rules">
      <summary><h3>遊戲規則</h3><span class="meta">展開</span></summary>
      <ul>
        <li><b>日預算</b> = 月預算 ÷ 當月天數，每天結算一次建設點。</li>
        <li><b>有記帳且守住日預算</b>：基礎 +${K.BASE}、記帳 +${K.RECORD}，再依省下的比例給 0 到 +${K.SAVE_MAX}（一整天沒花錢就拿滿）。</li>
        <li><b>沒有任何紀錄的日子</b>：只得空地整理 +${K.IDLE}，連續天數不增加也不中斷。記帳才有完整獎勵。</li>
        <li><b>超過日預算</b>：工地停工、天空變陰，當天 0 點，連續天數歸零。</li>
        <li><b>超過日預算 ${K.FIRE_X} 倍</b>：發生火災，扣 ${-K.FIRE} 點；點數不夠時，最新蓋好的建築會被燒掉。</li>
        <li><b>連續守住 ${K.STREAK} 天</b>：額外 +${K.STREAK_BONUS}，每滿 ${K.STREAK} 天一次。</li>
        <li><b>城市風格</b>：每棟建築在完工當天，依這個月到那天為止的消費組成抽出種類——餐飲多會蓋咖啡廳、夜市；交通多會蓋車站、加油站；娛樂多會蓋遊戲中心、摩天輪；購物、醫療教育、居家也各有建築。完工後就固定不變。</li>
        <li><b>地形與季節</b>：每座城市有自己的名字和地形（平原、河畔、湖濱、海港），並隨月份呈現春櫻、夏綠、秋楓、冬雪；晚上打開會看到夜景。</li>
        <li><b>天空成就</b>：${PERKS.map(p => `${p.name}（${p.desc}）`).join('、')}。</li>
        <li><b>月底評等</b>：依結餘比例評為 S 繁榮都市（30% 以上）、A 熱鬧城鎮（15% 以上）、B 寧靜小鎮（0% 以上）、C 荒廢村落（超支，城市會變成灰色）。進行中的月份依目前花費速度推估。</li>
        <li><b>修改預算</b>：每個月都能單獨修改（包含過去）。改本月或未來月份時，之後尚未開始的月份會一起改；之前的月份維持原本的預算，不會被回溯。</li>
      </ul>
    </details>
  </section>`;
}

function cityCollection() {
  const y = state.month.slice(0, 4);
  const now = ymOf(new Date());
  let finished = 0;
  const cells = [];
  for (let i = 1; i <= 12; i++) {
    const m = `${y}-${pad(i)}`;
    let art, label = `${i} 月`, foot = '';
    if (m > now) art = '<div class="thumb-empty">未開始</div>';
    else if (!monthBudget(m) || !monthTx(m).length) art = '<div class="thumb-empty">無紀錄</div>';
    else {
      const c = cityOf(m);
      art = citySvg(c, true);
      label = `${i} 月 · ${c.world.name}`;
      foot = `<span class="grade sm g-${c.grade.key}">${c.grade.key}</span>`;
      if (c.final) finished++;
    }
    cells.push(`<button class="thumb ${m === state.month ? 'active' : ''}" data-city-month="${m}">
      <div class="thumb-art">${art}</div>
      <div class="thumb-foot"><span>${label}</span>${foot}</div>
    </button>`);
  }
  return `<section class="card span-2">
    <div class="card-head"><h3>${y} 城市收藏</h3><span class="meta">已完工 ${finished} 座</span></div>
    <div class="city-thumbs">${cells.join('')}</div>
  </section>`;
}

function cityBudgetPrompt() {
  return `<div class="grid"><section class="card span-2 city-intro">
    <h3>先設定每月預算</h3>
    <p class="desc">小城市用你的月預算來建設：每天守住預算就能累積建設點，一棟一棟蓋出你的城市。</p>
    <div class="inline-add">
      <input class="input" id="city-budget" inputmode="numeric" placeholder="例如 30000">
      <button class="btn btn-primary" data-act="city-budget">開始建設</button>
    </div>
  </section></div>`;
}

function viewCity() {
  const m = state.month;
  const now = ymOf(new Date());
  snapshotBudgets();
  if (!monthBudget(m)) { cityEditing = false; return cityBudgetPrompt(); }
  if (m > now) {
    return `<div class="grid"><section class="card span-2">${empty('這個月還沒開始', '月初就會開始動工，可以先設定這個月的預算')}${cityBudgetBar()}</section>${cityCollection()}</div>`;
  }
  if (m < now && !monthTx(m).length) {
    return `<div class="grid"><section class="card span-2">${empty('這個月沒有紀錄', '城市沒有動工')}${cityBudgetBar()}</section>${cityCollection()}</div>`;
  }
  const c = cityOf(m);
  return `<div class="grid">
    ${cityHero(c)}
    ${c.final ? citySummary(c) : cityToday(c)}
    ${cityLog(c)}
    ${cityCollection()}
    ${cityRules()}
  </div>`;
}
