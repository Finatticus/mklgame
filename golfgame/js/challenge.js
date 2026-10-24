// 挑戰模式：每一關是一個專門設計的洞（不是現有球場的洞），三顆星各有不同的條件，越後面越難
// 每關的球場資料用 spec 指定（距離都從發球台量，單位碼）：bendAt / bend2At 轉彎、water / bunkers 障礙、
// specials 機關（ring 螢火之環、orb 金球、portal 星門、vent 噴發口、shroom 彈跳巨菇、wall 冰鏡牆）、gaps 浮島裂縫
// 星星：第 1 顆 = 在桿數上限內進洞，第 2、3 顆 = 各關自己的條件（也要先進洞才算）
import { registerCourse } from './courses.js';
import { SURF } from './physics.js';

const T = y => ({ black: y, blue: y, white: y, red: y });
const BASE = { stimp: 9, firm: 1.0, altitude: 100, temp: 22, wind: [2, 6], fairwayW: 34, roughW: 16, corridor: 76, trees: 0.7 };

// 目標的種類（evaluate 用）：
//   clear 進洞、strokes 桿數 ≤ v、teeGreen 開球上果嶺、teeNear 開球離旗桿 ≤ v 碼、teeFairway 開球停在球道、
//   noHazard 沒有落水 / 掉崖 / OB、noSand 沒進沙坑、fx 機關觸發累計 ≥ v、fxOne 同一桿觸發 ≥ v、fxGreen 觸發機關那一桿停上果嶺、
//   orbs 金球 ≥ v、drive 開球 ≥ v 碼、putts 推桿 ≤ v、greenIn 第 v 桿以內上果嶺、all 子條件全部達成
const LV = [
  { title: '鏡湖初陣', en: 'Mirror Pond', style: 'parkland', theme: null, intro: '一切從這裡開始：越過果嶺前的小湖，把球送上果嶺。',
    c: { wind: [1, 3], stimp: 8 }, hole: [3, 145, 0, 'b0', { green: { size: [26, 30] }, water: [{ g: 'F', size: [36, 16] }], bunkers: [{ g: 'BL' }, { g: 'R' }] }],
    max: 6, goals: [{ t: 'teeGreen', text: '開球直接上果嶺' }, { t: 'strokes', v: 2, text: '2 桿以內進洞' }] },
  { title: '風之丘', en: 'Windy Knoll', style: 'links', intro: '海邊的林克斯，左邊吹來 12 mph 的強風，球道中間三個壺型沙坑排成一排。',
    c: { wind: [12, 12], fairwayW: 36 }, wind: { mph: 12, from: 'L' },
    hole: [4, 360, 18, 'sl', { bendAt: 220, bunkers: [{ at: 205, side: 'C', n: 3 }, { at: 255, side: 'R' }, { g: 'FL' }, { g: 'FR' }] }],
    max: 7, goals: [{ t: 'noSand', text: '一次都沒進沙坑' }, { t: 'strokes', v: 4, text: '標準桿以內' }] },
  { title: '螢火隧道', en: 'Firefly Tunnel', style: 'parkland', theme: 'jungle', intro: '兩旁是密林的窄球道，空中排著三個螢火之環。穿過光環會加速飛更遠。',
    c: { fairwayW: 30, trees: 1.1 }, hole: [4, 380, 0, 'tr nw', { bunkers: [{ g: 'FL' }],
      specials: [{ kind: 'ring', at: 90, h: 18 }, { kind: 'ring', at: 140, h: 25 }, { kind: 'ring', at: 300, h: 9 }] }],
    max: 7, goals: [{ t: 'fx', kind: 'ring', v: 1, text: '至少穿過 1 個螢火之環' }, { t: 'fxOne', kind: 'ring', v: 2, text: '同一桿穿過 2 個光環' }] },
  { title: '金球庭苑', en: 'Golden Garden', style: 'parkland', theme: 'sakura', intro: 'S 型的庭園五桿洞，空中漂著 5 顆金球，球飛過金球旁邊就能收集。',
    hole: [5, 500, 35, '', { bendAt: 220, bend2At: 380, bend2: -70, water: [{ from: 240, to: 330, side: 'R', w: 30 }], bunkers: [{ g: 'FL' }, { g: 'BR' }],
      specials: [{ kind: 'orb', at: 120, h: 8, lat: -6 }, { kind: 'orb', at: 210, h: 10, lat: 8 }, { kind: 'orb', at: 300, h: 6, lat: -8 }, { kind: 'orb', at: 390, h: 9, lat: 6 }, { kind: 'orb', at: 460, h: 3, lat: 0 }] }],
    max: 8, goals: [{ t: 'orbs', v: 3, text: '收集 3 顆金球' }, { t: 'orbs', v: 5, text: '5 顆金球全部收集' }] },
  { title: '沙海長打', en: 'Dune Drive', style: 'dunes', theme: 'dunes', intro: '筆直又寬的沙漠五桿洞，盡情揮大桿吧。',
    c: { fairwayW: 40, roughW: 8 }, hole: [5, 570, 0, 'wd', { bunkers: [{ at: 270, side: 'L' }, { at: 300, side: 'R' }, { g: 'F', n: 2 }] }],
    max: 8, goals: [{ t: 'drive', v: 250, text: '開球 250 碼以上' }, { t: 'strokes', v: 4, text: '4 桿以內進洞' }] },
  { title: '冰鏡迴廊', en: 'Mirror Bend', style: 'frost', theme: 'frost', intro: '75 度的急轉彎，彎道外側立著冰鏡牆。打向冰牆，讓球彈回球道。',
    hole: [4, 400, 75, '', { bendAt: 215, bunkers: [{ g: 'FR' }],
      specials: [{ kind: 'wall', at: 232, lat: -30, len: 52, ang: 35 }, { kind: 'wall', at: 300, lat: 24, len: 30 }] }],
    max: 7, goals: [{ t: 'fx', kind: 'wall', v: 1, text: '撞冰鏡牆反彈 1 次' }, { t: 'greenIn', v: 2, text: '兩桿內上果嶺' }] },
  { title: '一桿走天下', en: 'One Iron Wonder', style: 'alpine', theme: 'alpine', intro: '整洞只能用 7 號鐵和推桿。一路下坡，算好每一桿的距離。',
    clubs: ['7I', 'PT'], hole: [4, 330, -20, 'DN', { bendAt: 170, elev: [[160, -12], [330, -22]], bunkers: [{ at: 150, side: 'L' }, { g: 'FL' }, { g: 'R' }] }],
    max: 7, goals: [{ t: 'strokes', v: 4, text: '標準桿以內' }, { t: 'putts', v: 1, text: '只用 1 次推桿' }] },
  { title: '浮島三連跳', en: 'Island Hop', style: 'void', theme: 'void', intro: '三座浮島排成一線，中間是兩道虛空裂縫，每一桿都要飛過去。',
    c: { fairwayW: 30, roughW: 12, trees: 0.3 }, hole: [4, 410, 0, '', { gaps: [{ at: 160, half: 10 }, { at: 300, half: 9 }], bunkers: [{ g: 'L' }] }],
    max: 7, goals: [{ t: 'noHazard', text: '一次都沒掉進虛空' }, { t: 'strokes', v: 4, text: '標準桿以內' }] },
  { title: '菇菇彈跳', en: 'Bounce Grove', style: 'parkland', theme: 'mushroom', intro: '密林中的球道被三朵巨菇擋住，落在菇傘上會彈起來繼續往前飛。',
    c: { trees: 1.0 }, hole: [4, 360, 15, 'tr', { bendAt: 200, water: [{ g: 'BR' }],
      specials: [{ kind: 'shroom', at: 150, lat: 0, h: 5, r: 6 }, { kind: 'shroom', at: 230, lat: -8, h: 6, r: 5.5 }, { kind: 'shroom', at: 305, lat: 7, h: 4.5, r: 5 }] }],
    max: 7, goals: [{ t: 'fx', kind: 'shroom', v: 1, text: '被巨菇彈起來 1 次' }, { t: 'fxGreen', kind: 'shroom', text: '彈菇的那一桿停在果嶺上' }] },
  { title: '熔岩孤島', en: 'Lava Island', style: 'volcanic', theme: 'lava', intro: '果嶺是熔岩湖中央的孤島，逆風 6 mph。只有一次機會，打不上就掉進熔岩。',
    wind: { mph: 6, from: 'H' }, hole: [3, 190, 0, 'IG', { bunkers: [{ g: 'B' }] }],
    max: 6, goals: [{ t: 'teeGreen', text: '開球直接上果嶺' }, { t: 'teeNear', v: 6, text: '開球停在旗桿 6 碼內' }] },
  { title: '斷崖跨海', en: 'Cliff Carry', style: 'links', theme: 'cliffs', intro: '從崖頂開球，中間是整段海灣，右邊吹來 10 mph 的海風。',
    wind: { mph: 10, from: 'R' }, hole: [3, 225, 0, 'xc sr', { bunkers: [{ g: 'FL' }, { g: 'B' }] }],
    max: 6, goals: [{ t: 'noHazard', text: '一次都沒掉進海灣' }, { t: 'strokes', v: 2, text: '2 桿以內進洞' }] },
  { title: '星門捷徑', en: 'Gate Run', style: 'void', theme: 'void', intro: '600 碼的五桿洞，中間兩道大裂縫。前方有一座星門，穿過去會從果嶺前飛出來。',
    c: { trees: 0.3 }, hole: [5, 600, 0, '', { gaps: [{ at: 220, half: 14 }, { at: 420, half: 13 }],
      specials: [{ kind: 'portal', at: 140, h: 5.5, exitAt: 560 }] }],
    max: 9, goals: [{ t: 'fx', kind: 'portal', v: 1, text: '穿過星門' }, { t: 'strokes', v: 3, text: '3 桿以內進洞' }] },
  { title: '噴發口賭局', en: 'Vent Gamble', style: 'volcanic', theme: 'lava', intro: '熔岩河橫越球道，落點區有三個噴發口，兩側還有熔岩湖。要賭噴發口，還是穩穩打？',
    hole: [4, 420, -15, 'xc', { bendAt: 230, water: [{ from: 110, to: 190, side: 'L', w: 34 }, { from: 300, to: 380, side: 'R', w: 30 }],
      specials: [{ kind: 'vent', at: 225, lat: -7 }, { kind: 'vent', at: 245, lat: 7 }, { kind: 'vent', at: 265, lat: 0 }] }],
    max: 8, goals: [{ t: 'fx', kind: 'vent', v: 1, text: '被噴發口噴上天' }, { t: 'noHazard', text: '一次都沒掉進熔岩' }] },
  { title: '白鹽強風', en: 'Salt Gale', style: 'salt', theme: 'salt', intro: '一望無際的鹽湖，右邊吹來 15 mph 的強風，球道兩側都是鹽水池。',
    wind: { mph: 15, from: 'R' }, hole: [4, 450, 0, '', { water: [{ from: 180, to: 280, side: 'L', w: 40 }, { from: 250, to: 340, side: 'R', w: 40 }], bunkers: [{ g: 'FL' }, { g: 'FR' }] }],
    max: 8, goals: [{ t: 'noHazard', text: '一次都沒落水' }, { t: 'strokes', v: 4, text: '標準桿以內' }] },
  { title: '海上窄橋', en: 'Sea Bridge', style: 'parkland', theme: 'tropical', intro: '球道是一條伸進海裡的窄長陸橋，左邊是海、右邊是潟湖。',
    c: { fairwayW: 26, roughW: 6 }, hole: [4, 390, 0, 'sl nw', { water: [{ from: 20, to: 370, side: 'R', w: 60 }], bunkers: [{ at: 240, side: 'C', n: 2 }] }],
    max: 8, goals: [{ t: 'teeFairway', text: '開球停在球道上' }, { t: 'strokes', v: 3, text: '3 桿以內進洞' }] },
  { title: '九十度峽谷', en: 'Canyon Elbow', style: 'canyon', intro: '幾乎 90 度的左轉彎，轉角前要先飛過峽谷。',
    hole: [4, 400, -88, 'xc', { bendAt: 200, bunkers: [{ g: 'R' }] }],
    max: 8, goals: [{ t: 'noHazard', text: '一次都沒掉進峽谷' }, { t: 'greenIn', v: 2, text: '兩桿內上果嶺' }] },
  { title: '雨林金球', en: 'Canopy Gold', style: 'parkland', theme: 'jungle', intro: '繞成大弧形的雨林五桿洞，有兩個螢火之環，四顆金球藏在高處。',
    hole: [5, 540, 40, '', { bendAt: 230, bend2At: 400, bend2: 40, water: [{ g: 'FR' }],
      specials: [{ kind: 'ring', at: 95, h: 19 }, { kind: 'ring', at: 330, h: 12 }, { kind: 'orb', at: 150, h: 26 }, { kind: 'orb', at: 250, h: 10, lat: -10 }, { kind: 'orb', at: 360, h: 14, lat: 6 }, { kind: 'orb', at: 470, h: 5 }] }],
    max: 9, goals: [{ t: 'orbs', v: 4, text: '4 顆金球全部收集' }, { t: 'all', text: '穿過 2 個光環，而且標準桿以內', sub: [{ t: 'fx', kind: 'ring', v: 2 }, { t: 'strokes', v: 5 }] }] },
  { title: '推桿迷宮', en: 'Putting Maze', style: 'parkland', theme: 'sakura', intro: '只有 125 碼，但果嶺又大又陡、分成上下兩層，被六個沙坑和池塘包圍。果嶺速度 11。',
    c: { stimp: 11 }, hole: [3, 125, 0, '', { green: { size: [36, 46], slope: 0.035, side: 0.02, tier: true }, water: [{ g: 'F', size: [30, 12] }],
      bunkers: [{ g: 'FL' }, { g: 'FR' }, { g: 'BL' }, { g: 'BR' }, { g: 'L' }, { g: 'R' }] }],
    max: 6, goals: [{ t: 'putts', v: 2, text: '推桿不超過 2 次' }, { t: 'strokes', v: 2, text: '2 桿以內進洞' }] },
  { title: '極光蛇道', en: 'Aurora Serpent', style: 'frost', theme: 'frost', intro: 'S 型的冰原五桿洞，兩個彎道都有冰鏡牆，冰河橫越球道，果嶺是冰湖中的孤島。',
    hole: [5, 560, 50, 'xc IG', { bendAt: 220, bend2At: 400, bend2: -100,
      specials: [{ kind: 'wall', at: 228, lat: -28, len: 44, ang: 25 }, { kind: 'wall', at: 405, lat: 26, len: 44, ang: -25 }] }],
    max: 9, goals: [{ t: 'fx', kind: 'wall', v: 2, text: '撞冰鏡牆 2 次以上' }, { t: 'strokes', v: 5, text: '標準桿以內' }] },
  { title: '星環終局', en: 'Starfall Finale', style: 'void', theme: 'void', intro: '最後的試煉：窄島、兩道虛空裂縫。開球先穿過螢火之環飛過第一道裂縫，第二桿再穿過星門直達果嶺前。',
    c: { trees: 0.3 }, hole: [5, 580, 0, 'nw', { gaps: [{ at: 190, half: 12 }, { at: 370, half: 12 }],
      specials: [{ kind: 'ring', at: 90, h: 16 }, { kind: 'portal', at: 300, h: 5.5, exitAt: 530 }] }],
    max: 9, goals: [{ t: 'all', text: '穿過星門，也穿過螢火之環', sub: [{ t: 'fx', kind: 'portal', v: 1 }, { t: 'fx', kind: 'ring', v: 1 }] }, { t: 'strokes', v: 4, text: '4 桿以內進洞' }] },
];

export const LEVELS = LV.map((l, i) => {
  const n = i + 1, id = 'lv' + String(n).padStart(2, '0');
  const [par, yards, bend, feat, spec] = l.hole;
  const course = {
    ...BASE, ...(l.c || {}), id, name: `挑戰 ${n}・${l.title}`, en: l.en, style: l.style, theme: l.theme || null, group: 'challenge', challenge: true,
    holes: [[par, yards, bend, feat, 1, { ...spec, tees: T(yards), note: l.intro }]],
  };
  registerCourse(course);
  return { n, id, title: l.title, en: l.en, intro: l.intro, par, yards, max: l.max, clubs: l.clubs || null, wind: l.wind || null,
    goals: [{ t: 'clear', text: `${l.max} 桿以內進洞` }, ...l.goals], course, style: l.style, theme: l.theme || null };
});
export const levelById = id => LEVELS.find(l => l.id === id);
export const STYLE_NAME = { parkland: '林間', links: '林克斯', canyon: '峽谷', volcanic: '火山', void: '浮島', frost: '冰原', alpine: '高山', dunes: '沙丘', salt: '鹽湖' };
export const THEME_NAME = { jungle: '雨林', sakura: '庭園', lava: '熔岩', void: '浮島', mushroom: '螢光森林', frost: '極光冰原', alpine: '高山', dunes: '沙丘', salt: '鹽湖', cliffs: '海崖', tropical: '熱帶海島' };

// 一次挑戰的紀錄 att = { holed, failed, strokes, putts, hazards, sand, shots: [{ onGreen, endSurf, distAfter, total, fx: {kind: n}, orbs }] }
// done = false 時是打到一半（畫面上即時打勾用）：只回答已經確定達成的條件
export function goalMet(g, att, par, done = true) {
  const shots = att.shots, s0 = shots[0];
  const fxSum = k => shots.reduce((a, s) => a + (s.fx[k] || 0), 0);
  const end = v => done ? v : false;
  switch (g.t) {
    case 'clear': return end(att.holed && !att.failed);
    case 'strokes': return end(att.holed && !att.failed && att.strokes <= g.v);
    case 'teeGreen': return !!s0 && s0.onGreen;
    case 'teeNear': return !!s0 && s0.distAfter <= g.v;
    case 'teeFairway': return !!s0 && s0.endSurf === SURF.FAIRWAY;
    case 'noHazard': return end(att.holed && !att.failed && att.hazards === 0);
    case 'noSand': return end(att.holed && !att.failed && !att.sand);
    case 'fx': return fxSum(g.kind) >= g.v;
    case 'fxOne': return shots.some(s => (s.fx[g.kind] || 0) >= g.v);
    case 'fxGreen': return shots.some(s => s.fx[g.kind] && s.onGreen);
    case 'orbs': return shots.reduce((a, s) => a + s.orbs, 0) >= g.v;
    case 'drive': return !!s0 && s0.total >= g.v;
    case 'putts': return end(att.holed && !att.failed && att.putts <= g.v);
    case 'greenIn': return shots.slice(0, g.v).some(s => s.onGreen);
    case 'all': return g.sub.every(x => goalMet(x, att, par, done));
    default: return false;
  }
}
// 星數：沒進洞 0 星；進洞 1 星，另外兩個條件各 1 星
export function evaluate(level, att) {
  const met = level.goals.map(g => goalMet(g, att, level.par, true));
  return { met, stars: met[0] ? met.filter(Boolean).length : 0 };
}
