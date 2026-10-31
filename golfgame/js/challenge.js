// 挑戰模式：每一關是一個專門設計的洞，用的都是一般球場沒有的風格（糖果、屋頂、雲海、月面、火星、珊瑚礁、楓紅、
// 薰衣草、鬱金香、神殿、沼澤、恐龍谷、霓虹、水晶洞窟、雨林、櫻花、玩具城、冰原、墓園、齒輪、雷鳴、菇林、熔岩、海灣、虛空）
// 全部 500 關由 challenge-design.js 產生（v109 重新設計）：條件都是桿數、不落水、不進沙坑、上果嶺這類玩家能控制的事，
//   難度靠球洞本身（球道變窄、果嶺變小變快、水和沙坑變多、狗腿、強風、桿數上限變緊）。以前的光環、金球、滯空、彈跳任務都拿掉了
// 星星：第 1 顆 = 在桿數上限內進洞，第 2、3 顆 = 各關自己的條件（也要先進洞才算）
import { registerCourse } from './courses.js';
import { SURF } from './physics.js';
import { designLevels, CHAPTERS_ALL } from './challenge-design.js';

const T = y => ({ black: y, blue: y, white: y, red: y });
const BASE = { stimp: 8, firm: 1.0, altitude: 100, temp: 22, wind: [2, 6], fairwayW: 34, roughW: 16, corridor: 76, trees: 0.7 };
// 每個主題的地形風格與環境
const TH = {
  candy: { style: 'parkland', c: { temp: 24, wind: [1, 5] } },
  city: { style: 'void', c: { temp: 18, wind: [4, 10], trees: 0.3, fairwayW: 30, roughW: 10 } },
  sky: { style: 'void', c: { temp: 14, wind: [5, 12], trees: 0.35, fairwayW: 32, roughW: 12 } },
  moon: { style: 'salt', c: { altitude: 4500, temp: -20, wind: [0, 0], trees: 0.4, roughW: 10 } },
  mars: { style: 'canyon', c: { altitude: 2500, temp: -5, wind: [5, 14], trees: 0.4, roughW: 10 } },
  reef: { style: 'dunes', c: { temp: 20, wind: [0, 2], trees: 0.9 } },
  autumn: { style: 'alpine', c: { altitude: 900, temp: 14, wind: [2, 8], trees: 1.0 } },
  lavender: { style: 'parkland', c: { temp: 26, wind: [2, 7], trees: 0.5 } },
  tulip: { style: 'salt', c: { temp: 16, wind: [5, 13], trees: 0.4, roughW: 14 } },
  egypt: { style: 'dunes', c: { temp: 38, wind: [3, 10], trees: 0.4, roughW: 8 } },
  swamp: { style: 'salt', c: { temp: 26, wind: [0, 4], trees: 1.0, roughW: 14 } },
  dino: { style: 'volcanic', c: { temp: 30, wind: [2, 7], trees: 1.0 } },
  neon: { style: 'salt', c: { temp: 22, wind: [1, 6], trees: 0.4 } },
  crystal: { style: 'canyon', c: { temp: 12, wind: [0, 3], trees: 0.6, roughW: 12 } },
  // 51 關以後的新世界（沿用奇幻球場的地形風格與環境）
  jungle: { style: 'parkland', c: { temp: 30, wind: [0, 5], trees: 1.1 } },
  sakura: { style: 'parkland', c: { temp: 18, wind: [1, 6], trees: 0.8 } },
  toy: { style: 'parkland', c: { temp: 22, wind: [1, 6], trees: 0.6 } },
  honey: { style: 'parkland', c: { temp: 26, wind: [1, 5], trees: 0.8 } },
  frost: { style: 'frost', c: { altitude: 1500, temp: -8, wind: [3, 10], trees: 0.6 } },
  haunt: { style: 'parkland', c: { temp: 12, wind: [1, 6], trees: 0.9 } },
  clock: { style: 'parkland', c: { temp: 20, wind: [0, 4], trees: 0.6 } },
  storm: { style: 'alpine', c: { altitude: 1200, temp: 10, wind: [6, 14], trees: 0.5 } },
  mushroom: { style: 'parkland', c: { temp: 16, wind: [0, 3], trees: 0.9 } },
  lava: { style: 'volcanic', c: { temp: 34, wind: [2, 8], trees: 0.5, roughW: 12 } },
  tropical: { style: 'parkland', c: { temp: 30, wind: [3, 10], trees: 0.8 } },
  void: { style: 'void', c: { temp: 0, wind: [0, 4], trees: 0.3, fairwayW: 32, roughW: 10 } },
};
export const THEME_NAME = { candy: '糖果王國', city: '天際屋頂', sky: '雲海天空城', moon: '月面基地', mars: '紅色火星', reef: '海底珊瑚礁', autumn: '楓紅山谷',
  lavender: '薰衣草花田', tulip: '風車鬱金香', egypt: '法老神殿', swamp: '迷霧沼澤', dino: '恐龍谷', neon: '霓虹夜城', crystal: '水晶洞窟',
  jungle: '翡翠雨林', sakura: '櫻花庭園', toy: '積木玩具城', honey: '蜂蜜花谷', frost: '極地冰原', haunt: '幽光墓園', clock: '齒輪工坊', storm: '雷鳴高原',
  mushroom: '螢光菇林', lava: '熔岩地心', tropical: '椰林海灣', void: '星環虛空' };

// 目標的種類（goalMet 用）：
//   clear 進洞、strokes 桿數 ≤ v、hio 一桿進洞、teeGreen 開球上果嶺、teeNear 開球離旗桿 ≤ v 碼、teeFairway 開球停在球道、
//   driveRange 開球 v[0]~v[1] 碼、drive 開球 ≥ v 碼、noHazard 沒落水 / 掉落 / OB、noSand 沒進沙坑、noRough 沒進長草、
//   fairwayAll 每一桿都停在球道或果嶺、fx 機關累計 ≥ v、fxOne 同一桿觸發 ≥ v、fxGreen 觸發那一桿停上果嶺、fxTotal 所有機關合計 ≥ v、
//   avoid 完全沒碰到某種機關、orbs 金球 ≥ v、putts 推桿 ≤ v、noPutt 不用推桿進洞、longPutt 從 ≥ v 碼推進、greenIn 第 v 桿以內上果嶺、
//   airTime 某一桿在空中 ≥ v 秒、apex 某一桿最高點 ≥ v 公尺、lastClub 用指定的球桿進洞、clubCount 最多用 v 種球桿、
//   holeOut 從 ≥ v 碼外不用推桿直接進洞、fxKinds 觸發 ≥ v 種不同的機關、all 子條件全部達成
const LV = designLevels();
// 不同產生器之間偶爾會撞名：後面的加上關卡編號
{ const seen = new Set(); LV.forEach((l, i) => { if (seen.has(l.title)) l.title += '・' + (i + 1); seen.add(l.title); }); }
// 章節：前 100 關每 10 關一章，101 關以後每 20 關一章（最後一關是頭目關）
export const CHAPTERS = CHAPTERS_ALL.map(c => ({ name: c.name, from: c.from, to: c.to }));
export const chapterOf = n => CHAPTERS.findIndex(c => n >= c.from && n <= c.to);

export const LEVELS = LV.map((l, i) => {
  const n = i + 1, id = 'lv' + String(n).padStart(2, '0'), th = TH[l.t];
  const [par, yards, bend, feat, spec] = l.hole;
  const course = {
    ...BASE, ...th.c, ...(l.c || {}), id, name: `挑戰 ${n}・${l.title}`, en: l.en, style: th.style, theme: l.t, group: 'challenge', challenge: true,
    holes: [[par, yards, bend, feat, 1, { ...spec, tees: T(yards), note: l.intro }]],
  };
  registerCourse(course);
  return { n, id, title: l.title, en: l.en, intro: l.intro, par, yards, max: l.max, clubs: l.clubs || null, wind: l.wind || null,
    goals: [{ t: 'clear', text: `${l.max} 桿以內進洞` }, ...l.goals], course, style: th.style, theme: l.t };
});
export const levelById = id => LEVELS.find(l => l.id === id);

// 一次挑戰的紀錄 att = { holed, failed, strokes, putts, hazards, sand, rough, shots: [{ club, putter, holed, onGreen, endSurf, distBefore, distAfter, total, flight, apex, fx, orbs }] }
// done = false 時是打到一半（畫面上即時打勾用）：只回答已經確定達成的條件
export function goalMet(g, att, par, done = true) {
  const shots = att.shots, s0 = shots[0], ok = att.holed && !att.failed;
  const fxSum = k => shots.reduce((a, s) => a + (s.fx[k] || 0), 0);
  const end = v => done ? v : false;
  switch (g.t) {
    case 'clear': return end(ok);
    case 'strokes': return end(ok && att.strokes <= g.v);
    case 'hio': return ok && att.strokes === 1;
    case 'teeGreen': return !!s0 && s0.onGreen;
    case 'teeNear': return !!s0 && s0.distAfter <= g.v;
    case 'teeFairway': return !!s0 && s0.endSurf === SURF.FAIRWAY;
    case 'driveRange': return !!s0 && s0.total >= g.v[0] && s0.total <= g.v[1];
    case 'drive': return !!s0 && s0.total >= g.v;
    case 'noHazard': return end(ok && att.hazards === 0);
    case 'noSand': return end(ok && !att.sand);
    case 'noRough': return end(ok && !shots.some(s => s.endSurf === SURF.ROUGH || s.endSurf === SURF.DEEP));
    case 'fairwayAll': return end(ok && shots.every(s => s.holed || s.onGreen || s.endSurf === SURF.FAIRWAY || s.endSurf === SURF.FRINGE));
    case 'fx': return fxSum(g.kind) >= g.v;
    case 'fxOne': return shots.some(s => (s.fx[g.kind] || 0) >= g.v);
    case 'fxGreen': return shots.some(s => s.fx[g.kind] && s.onGreen);
    case 'fxTotal': return shots.reduce((a, s) => a + Object.values(s.fx).reduce((x, y) => x + y, 0), 0) >= g.v;
    case 'avoid': return end(ok && fxSum(g.kind) === 0);
    case 'orbs': return shots.reduce((a, s) => a + s.orbs, 0) >= g.v;
    case 'putts': return end(ok && att.putts <= g.v);
    case 'noPutt': return end(ok && !shots.some(s => s.putter));
    case 'longPutt': return shots.some(s => s.putter && s.holed && s.distBefore >= g.v);
    case 'greenIn': return shots.slice(0, g.v).some(s => s.onGreen);
    case 'airTime': return shots.some(s => s.flight >= g.v);
    case 'apex': return shots.some(s => s.apex >= g.v);
    case 'lastClub': return end(ok && shots.length && g.clubs.includes(shots[shots.length - 1].club));
    case 'clubCount': return end(ok && new Set(shots.map(s => s.club)).size <= g.v);
    case 'holeOut': return shots.some(s => s.holed && !s.putter && s.distBefore >= g.v);
    case 'fxKinds': return new Set(shots.flatMap(s => Object.keys(s.fx).filter(k => s.fx[k] > 0))).size >= g.v;
    // ---- 第 301 關以後的新條件 ----
    case 'clubNear': return shots.some(s => s.club === g.club && s.distBefore >= (g.min || 0) && (s.holed || s.distAfter <= g.v));      // 用某支桿從 min 碼外打到旗桿 v 碼內
    case 'useClub': return shots.some(s => s.club === g.club);
    case 'notClub': return end(ok && !shots.some(s => s.club === g.club));
    case 'teeMax': return !!s0 && s0.endSurf != null && s0.total <= g.v;                                       // 開球放短（沒落水 / 出界）
    case 'avoidAll': return end(ok && shots.every(s => Object.values(s.fx).every(v => !v)));
    case 'lastNonPutt': { const on = shots.find(s => s.onGreen && !s.putter); return !!on && g.clubs.includes(on.club); }      // 上果嶺的那一桿用指定的桿
    case 'all': return g.sub.every(x => goalMet(x, att, par, done));
    default: return false;
  }
}
// 星數：沒進洞 0 星；進洞 1 星，另外兩個條件各 1 星
export function evaluate(level, att) {
  const met = level.goals.map(g => goalMet(g, att, level.par, true));
  return { met, stars: met[0] ? met.filter(Boolean).length : 0 };
}
