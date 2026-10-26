// 挑戰模式：每一關是一個專門設計的洞，用的都是一般球場沒有的風格（糖果、屋頂、雲海、月面、火星、珊瑚礁、楓紅、
// 薰衣草、鬱金香、神殿、沼澤、恐龍谷、霓虹、水晶洞窟），越後面越難
// 每關的球場資料用 spec 指定（距離都從發球台量，單位碼）：bendAt / bend2At 轉彎、water / bunkers 障礙、
// specials 機關（ring 螢火之環、orb 金球、portal 星門、vent 噴發口、shroom 彈跳巨菇、wall 冰鏡牆、tramp 彈跳床、boost 加速帶、cannon 大砲）、
// gaps 浮島 / 屋頂之間的裂縫
// 51~100 關換到新的世界（雨林、櫻花、玩具城、蜂蜜、冰原、墓園、齒輪、雷鳴、菇林、熔岩、海灣、虛空），也用到奇幻球場的機關
//   （feat 代號 hy 蜂蜜池、gr 齒輪、ws 引魂燈、bp 彈珠柱、cl 雷雲，位置由球場生成決定）；越後面桿數上限越緊、條件越刁鑽
// 星星：第 1 顆 = 在桿數上限內進洞，第 2、3 顆 = 各關自己的條件（也要先進洞才算）
import { registerCourse } from './courses.js';
import { SURF } from './physics.js';
import { genLevels, CHAPTERS_2 } from './challenge-gen.js';

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
const R = (at, h = 12, lat = 0) => ({ kind: 'ring', at, h, lat });
const O = (at, h = 6, lat = 0) => ({ kind: 'orb', at, h, lat });
const LV = [
  // ---------- 1~10：入門，熟悉各種風格與機關 ----------
  { t: 'candy', title: '棉花糖小丘', en: 'Marshmallow Hill', intro: '粉紅色的糖霜草地，果嶺前是一條巧克力河。先把球送上果嶺吧！',
    hole: [3, 140, 0, '', { green: { size: [28, 32] }, water: [{ g: 'F', size: [36, 14] }], bunkers: [{ g: 'BL' }, { g: 'R' }] }],
    max: 6, goals: [{ t: 'teeGreen', text: '開球直接上果嶺' }, { t: 'strokes', v: 3, text: '標準桿以內' }] },
  { t: 'tulip', title: '鬱金香直道', en: 'Tulip Lane', intro: '一條筆直寬敞的球道，兩旁是一排排彩色的鬱金香花田，遠方風車慢慢轉。',
    c: { fairwayW: 40 }, hole: [4, 340, 0, 'wd', { bunkers: [{ at: 230, side: 'R' }, { g: 'FL' }] }],
    max: 7, goals: [{ t: 'teeFairway', text: '開球停在球道上' }, { t: 'strokes', v: 4, text: '標準桿以內' }] },
  { t: 'lavender', title: '紫色小彎', en: 'Lavender Bend', intro: '夕陽下的普羅旺斯，球道輕輕往右轉，長草都是薰衣草。',
    hole: [4, 360, 30, '', { bendAt: 200, bunkers: [{ at: 210, side: 'L' }, { g: 'FR' }] }],
    max: 7, goals: [{ t: 'noRough', text: '一次都沒掉進薰衣草（長草）' }, { t: 'strokes', v: 4, text: '標準桿以內' }] },
  { t: 'autumn', title: '楓葉溪谷', en: 'Maple Brook', intro: '紅葉飄落的山谷，小溪橫越球道，空中漂著三顆金球。',
    hole: [4, 370, -15, 'xc', { bendAt: 220, bunkers: [{ g: 'FL' }], specials: [O(110, 9), O(220, 6, 6), O(320, 4, -4)] }],
    max: 7, goals: [{ t: 'orbs', v: 2, text: '收集 2 顆金球' }, { t: 'noHazard', text: '一次都沒掉進溪裡' }] },
  { t: 'egypt', title: '法老大道', en: 'Pharaoh Road', intro: '兩旁是方尖碑的筆直五桿洞，遠方是金字塔。盡量打遠一點。',
    hole: [5, 520, 0, '', { bunkers: [{ at: 250, side: 'L' }, { at: 260, side: 'R' }, { g: 'F', n: 2 }] }],
    max: 8, goals: [{ t: 'drive', v: 230, text: '開球 230 碼以上' }, { t: 'greenIn', v: 3, text: '三桿內上果嶺' }] },
  { t: 'reef', title: '珊瑚孤島', en: 'Coral Atoll', intro: '海底的珊瑚礁，果嶺被深海溝包圍。在水裡空氣阻力照舊（別擔心）。',
    hole: [3, 160, 0, 'IG', { bunkers: [{ g: 'B' }] }],
    max: 6, goals: [{ t: 'teeGreen', text: '開球直接上果嶺' }, { t: 'teeNear', v: 8, text: '開球停在旗桿 8 碼內' }] },
  { t: 'neon', title: '霓虹大道', en: 'Neon Boulevard', intro: '霓虹格線的夜城球道，球道中間有兩條加速帶，滾過去會被往前推。',
    hole: [4, 380, 0, '', { bunkers: [{ g: 'FL' }, { g: 'FR' }], specials: [{ kind: 'boost', at: 150 }, { kind: 'boost', at: 250 }] }],
    max: 7, goals: [{ t: 'fx', kind: 'boost', v: 1, text: '經過加速帶 1 次' }, { t: 'strokes', v: 4, text: '標準桿以內' }] },
  { t: 'moon', title: '月面初登', en: 'Lunar Landing', intro: '月球基地的球場，空氣稀薄，球會飛得很遠很遠。遍地都是隕石坑沙坑。',
    hole: [4, 420, 0, '', { bunkers: [{ at: 180, side: 'C', n: 2 }, { at: 260, side: 'L' }, { at: 300, side: 'R' }, { g: 'FL' }, { g: 'BR' }] }],
    max: 7, goals: [{ t: 'drive', v: 280, text: '開球 280 碼以上（空氣稀薄）' }, { t: 'noSand', text: '一次都沒進隕石坑' }] },
  { t: 'sky', title: '雲端初航', en: 'Cloud Voyage', intro: '漂在雲海上的島嶼，中間一道裂縫，掉下去就是雲海。',
    hole: [4, 360, 0, '', { gaps: [{ at: 190, half: 11 }], bunkers: [{ g: 'R' }] }],
    max: 7, goals: [{ t: 'noHazard', text: '一次都沒掉進雲海' }, { t: 'greenIn', v: 2, text: '兩桿內上果嶺' }] },
  { t: 'candy', title: '果凍彈跳床', en: 'Jelly Bounce', intro: '落點區有兩張果凍彈跳床，落上去會被彈得老高。',
    hole: [4, 350, 0, '', { bunkers: [{ g: 'FL' }], specials: [{ kind: 'tramp', at: 190, lat: -4 }, { kind: 'tramp', at: 230, lat: 5 }] }],
    max: 7, goals: [{ t: 'fx', kind: 'tramp', v: 1, text: '落上彈跳床 1 次' }, { t: 'fxGreen', kind: 'tramp', text: '彈跳床那一桿直接上果嶺' }] },
  // ---------- 11~20：中等，開始組合 ----------
  { t: 'swamp', title: '迷霧沼澤', en: 'Misty Marsh', intro: '霧氣瀰漫的沼澤，球道被兩片泥塘切斷，看不太到遠方。',
    hole: [4, 380, 0, '', { water: [{ from: 115, to: 165, side: 'C', w: 56 }, { from: 255, to: 295, side: 'C', w: 50 }], bunkers: [{ g: 'FR' }] }],
    max: 7, goals: [{ t: 'noHazard', text: '一次都沒掉進泥塘' }, { t: 'strokes', v: 4, text: '標準桿以內' }] },
  { t: 'dino', title: '恐龍谷', en: 'Dino Valley', intro: '翼龍在天上飛的史前山谷，大弧形的五桿洞，轉角有一個會噴發的火山口。',
    hole: [5, 540, 35, 'D', { bendAt: 230, bend2At: 400, bend2: 35, bunkers: [{ g: 'FL' }], specials: [{ kind: 'vent', at: 300, lat: 0 }] }],
    max: 8, goals: [{ t: 'fx', kind: 'vent', v: 1, text: '被火山口噴上天' }, { t: 'strokes', v: 5, text: '標準桿以內' }] },
  { t: 'city', title: '屋頂跳躍', en: 'Rooftop Hop', intro: '夜晚的摩天大樓頂樓，從一棟跳到另一棟。掉下去就沒了。',
    hole: [4, 400, 0, '', { gaps: [{ at: 150, half: 10 }, { at: 290, half: 11 }], bunkers: [{ g: 'L' }] }],
    max: 7, goals: [{ t: 'noHazard', text: '一次都沒從屋頂掉下去' }, { t: 'strokes', v: 4, text: '標準桿以內' }] },
  { t: 'mars', title: '火星峽谷', en: 'Martian Rift', intro: '紅色的火星峽谷，球道 60 度轉彎，轉角前要飛越裂谷。',
    hole: [4, 410, -60, 'xc', { bendAt: 210, bunkers: [{ g: 'R' }] }],
    max: 7, goals: [{ t: 'noHazard', text: '一次都沒掉進裂谷' }, { t: 'teeFairway', text: '開球停在球道上' }] },
  { t: 'crystal', title: '水晶洞窟', en: 'Crystal Cavern', intro: '發光的水晶洞窟，空中有一個螢火之環，穿過去加速。',
    hole: [3, 175, 0, '', { bunkers: [{ g: 'FL' }, { g: 'BR' }], specials: [R(85, 14)] }],
    max: 6, goals: [{ t: 'fx', kind: 'ring', v: 1, text: '穿過螢火之環' }, { t: 'teeNear', v: 10, text: '開球停在旗桿 10 碼內' }] },
  { t: 'tulip', title: '風車運河', en: 'Canal Run', intro: '荷蘭的運河五桿洞，兩側是長長的運河，中間還有一條橫的。',
    hole: [5, 530, 0, '', { water: [{ from: 40, to: 500, side: 'L', w: 30, gap: 7 }, { from: 40, to: 500, side: 'R', w: 30, gap: 7 }, { from: 300, to: 330, side: 'C', w: 60 }], bunkers: [{ g: 'F' }] }],
    max: 8, goals: [{ t: 'fairwayAll', text: '每一桿都停在球道或果嶺' }, { t: 'strokes', v: 5, text: '標準桿以內' }] },
  { t: 'autumn', title: '紅葉迴廊', en: 'Crimson Corridor', intro: '窄窄的 S 型林道，兩旁滿是紅葉，落點很小。',
    c: { fairwayW: 28 }, hole: [4, 390, 30, 'tr nw', { bendAt: 150, bend2At: 280, bend2: -60, bunkers: [{ g: 'FR' }] }],
    max: 7, goals: [{ t: 'noRough', text: '一次都沒進長草' }, { t: 'greenIn', v: 2, text: '兩桿內上果嶺' }] },
  { t: 'egypt', title: '金字塔大砲', en: 'Pyramid Cannon', intro: '神殿前的大砲：球落進砲台，會直接被轟向果嶺。',
    hole: [5, 560, 0, '', { bunkers: [{ g: 'FL' }, { g: 'FR' }], specials: [{ kind: 'cannon', at: 255, lat: 0, r: 4.2 }] }],
    max: 8, goals: [{ t: 'fx', kind: 'cannon', v: 1, text: '被大砲轟出去' }, { t: 'strokes', v: 4, text: '4 桿以內進洞' }] },
  { t: 'lavender', title: '紫色迷宮', en: 'Violet Maze', intro: '只有 150 碼，但果嶺又大又陡、分成上下兩層，四周都是沙坑。',
    c: { stimp: 10.5 }, hole: [3, 150, 0, '', { green: { size: [36, 44], slope: 0.034, tier: true, side: 0.015 }, bunkers: [{ g: 'FL' }, { g: 'FR' }, { g: 'BL' }, { g: 'BR' }, { g: 'L' }] }],
    max: 6, goals: [{ t: 'putts', v: 2, text: '推桿不超過 2 次' }, { t: 'strokes', v: 2, text: '2 桿以內進洞' }] },
  { t: 'neon', title: '霓虹彈射', en: 'Neon Pinball', intro: '像彈珠台一樣的夜城：加速帶、兩道霓虹牆，看你能觸發幾次機關。',
    hole: [4, 420, 25, '', { bendAt: 220, specials: [{ kind: 'boost', at: 140 }, { kind: 'wall', at: 238, lat: -26, len: 46, ang: 28 }, { kind: 'wall', at: 330, lat: 22, len: 34 }, { kind: 'boost', at: 300, ang: 25 }] }],
    max: 7, goals: [{ t: 'fx', kind: 'wall', v: 1, text: '撞霓虹牆反彈 1 次' }, { t: 'fxTotal', v: 3, text: '觸發機關合計 3 次以上' }] },
  // ---------- 21~30：進階 ----------
  { t: 'reef', title: '深海星門', en: 'Abyss Gate', intro: '一條深海溝橫斷球道，前方的星門可以直接把你送到果嶺前。',
    hole: [5, 580, 0, '', { water: [{ from: 280, to: 380, side: 'C', w: 80 }], specials: [{ kind: 'portal', at: 150, h: 5.5, exitAt: 530 }] }],
    max: 8, goals: [{ t: 'fx', kind: 'portal', v: 1, text: '穿過星門' }, { t: 'strokes', v: 4, text: '4 桿以內進洞' }] },
  { t: 'moon', title: '低重力長洞', en: 'Low-G Long', intro: '640 碼的月面五桿洞。空氣稀薄，兩桿上果嶺不是夢。',
    hole: [5, 640, 0, '', { bunkers: [{ at: 300, side: 'C', n: 3 }, { at: 460, side: 'L' }, { g: 'FL' }, { g: 'FR' }] }],
    max: 8, goals: [{ t: 'drive', v: 300, text: '開球 300 碼以上' }, { t: 'greenIn', v: 2, text: '兩桿內上果嶺' }] },
  { t: 'sky', title: '天空神殿', en: 'Sky Temple', intro: '果嶺是漂在雲上的神殿小島，只有發球台和果嶺，逆風 10 mph。',
    wind: { mph: 10, from: 'H' }, hole: [3, 205, 0, 'IG', { bunkers: [{ g: 'B' }] }],
    max: 5, goals: [{ t: 'teeGreen', text: '開球直接上果嶺' }, { t: 'strokes', v: 2, text: '2 桿以內進洞' }] },
  { t: 'candy', title: '巧克力瀑布', en: 'Cocoa Falls', intro: '兩側都是巧克力河，四顆金球分散在球道上空。',
    hole: [4, 400, 0, '', { water: [{ from: 60, to: 380, side: 'L', w: 34, gap: 6 }, { from: 140, to: 360, side: 'R', w: 34, gap: 6 }], specials: [O(100, 7, -3), O(190, 10, 5), O(280, 6, -6), O(360, 4, 3)] }],
    max: 7, goals: [{ t: 'orbs', v: 3, text: '收集 3 顆金球' }, { t: 'noHazard', text: '一次都沒掉進巧克力河' }] },
  { t: 'swamp', title: '螢火沼澤夜', en: 'Firefly Bog', intro: '螢火蟲在沼澤上飛舞，兩個螢火之環排成一線。',
    hole: [4, 360, 0, '', { water: [{ from: 200, to: 250, side: 'R', w: 40 }], specials: [R(85, 16), R(130, 23)] }],
    max: 7, goals: [{ t: 'fxOne', kind: 'ring', v: 2, text: '同一桿穿過 2 個光環' }, { t: 'strokes', v: 4, text: '標準桿以內' }] },
  { t: 'dino', title: '巨骨峽道', en: 'Bone Canyon', intro: '70 度的早轉彎，轉角前有一道溪谷，旁邊是巨大的恐龍骨架。',
    hole: [4, 430, 70, 'E xc', { bendAt: 160, bunkers: [{ g: 'FL' }] }],
    max: 7, goals: [{ t: 'greenIn', v: 2, text: '兩桿內上果嶺' }, { t: 'noHazard', text: '一次都沒落水' }] },
  { t: 'city', title: '霓虹天台', en: 'Skyline Gate', intro: '三棟大樓的屋頂，星門可以讓你直接跳到最後一棟。',
    hole: [5, 590, 0, '', { gaps: [{ at: 210, half: 13 }, { at: 400, half: 13 }], specials: [{ kind: 'portal', at: 130, h: 5.5, exitAt: 540 }] }],
    max: 8, goals: [{ t: 'fx', kind: 'portal', v: 1, text: '穿過星門' }, { t: 'noHazard', text: '一次都沒從屋頂掉下去' }] },
  { t: 'mars', title: '沙塵暴', en: 'Dust Storm', intro: '火星沙塵暴：左邊吹來 15 mph 的強風，兩側都是裂谷。',
    wind: { mph: 15, from: 'L' }, hole: [4, 450, 0, 'wl wr', { bunkers: [{ g: 'FR' }] }],
    max: 7, goals: [{ t: 'noHazard', text: '一次都沒掉進裂谷' }, { t: 'strokes', v: 4, text: '標準桿以內' }] },
  { t: 'crystal', title: '水晶鏡廊', en: 'Prism Hall', intro: '水晶鏡牆排成的走廊，轉角要靠反彈過彎。',
    hole: [4, 380, -70, '', { bendAt: 200, specials: [{ kind: 'wall', at: 215, lat: 28, len: 50, ang: -32 }, { kind: 'wall', at: 300, lat: -22, len: 36 }, { kind: 'wall', at: 120, lat: 20, len: 30 }] }],
    max: 7, goals: [{ t: 'fx', kind: 'wall', v: 2, text: '撞水晶牆 2 次以上' }, { t: 'greenIn', v: 2, text: '兩桿內上果嶺' }] },
  { t: 'tulip', title: '花海精準', en: 'Petal Precision', intro: '果嶺被花田團團包圍，看你能停多近。',
    hole: [3, 185, 0, '', { green: { size: [24, 28] }, bunkers: [{ g: 'FL' }, { g: 'R' }] }],
    max: 5, goals: [{ t: 'teeNear', v: 5, text: '開球停在旗桿 5 碼內' }, { t: 'putts', v: 1, text: '只推 1 次' }] },
  // ---------- 31~40：困難，條件更刁鑽 ----------
  { t: 'autumn', title: '一支鐵桿', en: 'Single Iron', intro: '整洞只能用 8 號鐵和推桿。紅葉林中的短四桿。',
    clubs: ['8I', 'PT'], hole: [4, 340, 20, '', { bendAt: 180, elev: [[180, -6], [340, -10]], bunkers: [{ at: 170, side: 'R' }, { g: 'FL' }] }],
    max: 6, goals: [{ t: 'strokes', v: 4, text: '標準桿以內' }, { t: 'putts', v: 1, text: '只推 1 次' }] },
  { t: 'egypt', title: '法老試煉', en: 'Trial of Ra', intro: '噴發口、大砲、三顆金球，神殿的試煉。',
    hole: [5, 560, -20, '', { bendAt: 260, specials: [{ kind: 'vent', at: 200, lat: -6 }, { kind: 'cannon', at: 300, lat: 4 }, O(120, 10), O(250, 8, 6), O(420, 6, -4)] }],
    max: 7, goals: [{ t: 'orbs', v: 3, text: '3 顆金球全部收集' }, { t: 'fxTotal', v: 2, text: '觸發機關合計 2 次以上' }] },
  { t: 'reef', title: '海葵彈床', en: 'Anemone Trampolines', intro: '三張彈跳床排在球道上，連續彈過去。',
    hole: [4, 370, 0, '', { water: [{ g: 'BR' }], specials: [{ kind: 'tramp', at: 170 }, { kind: 'tramp', at: 230, lat: 3 }, { kind: 'tramp', at: 290, lat: -3 }] }],
    max: 6, goals: [{ t: 'fx', kind: 'tramp', v: 2, text: '落上彈跳床 2 次以上' }, { t: 'strokes', v: 4, text: '標準桿以內' }] },
  { t: 'neon', title: '精準落點', en: 'Laser Zone', intro: '開球要停在指定的距離區間，太短太長都不行。',
    hole: [4, 360, 0, '', { bunkers: [{ at: 200, side: 'L' }, { at: 260, side: 'R' }, { g: 'FL' }] }],
    max: 6, goals: [{ t: 'driveRange', v: [215, 245], text: '開球停在 215~245 碼之間' }, { t: 'teeFairway', text: '開球停在球道上' }] },
  { t: 'moon', title: '隕石坑', en: 'Crater Rim', intro: '果嶺在一個大隕石坑的中央，四周全是沙坑。',
    hole: [3, 210, 0, 'b4', { bunkers: [{ g: 'F', n: 2 }, { g: 'L' }, { g: 'R' }, { g: 'B', n: 2 }] }],
    max: 5, goals: [{ t: 'noSand', text: '一次都沒進沙坑' }, { t: 'strokes', v: 2, text: '2 桿以內進洞' }] },
  { t: 'sky', title: '浮空迷航', en: 'Drift Isles', intro: '600 碼、四座浮島、三道裂縫，一桿都不能失誤。',
    hole: [5, 600, 0, 'nw', { gaps: [{ at: 170, half: 10 }, { at: 330, half: 11 }, { at: 480, half: 10 }] }],
    max: 7, goals: [{ t: 'noHazard', text: '一次都沒掉進雲海' }, { t: 'strokes', v: 5, text: '標準桿以內' }] },
  { t: 'candy', title: '糖果大砲', en: 'Candy Cannon', intro: '彈跳床、大砲和金球的糖果樂園，盡量把機關都玩過一遍。',
    hole: [5, 580, 30, '', { bendAt: 250, specials: [{ kind: 'tramp', at: 200, lat: -5 }, { kind: 'cannon', at: 300 }, O(150, 12), O(380, 9, 5)] }],
    max: 7, goals: [{ t: 'fxTotal', v: 3, text: '觸發機關合計 3 次以上' }, { t: 'orbs', v: 2, text: '2 顆金球全部收集' }] },
  { t: 'swamp', title: '泥沼孤島', en: 'Bog Island', intro: '沼澤中央的孤島果嶺。不准用推桿進洞！',
    hole: [3, 160, 0, 'IG', { bunkers: [{ g: 'L' }] }],
    max: 5, goals: [{ t: 'teeGreen', text: '開球直接上果嶺' }, { t: 'noPutt', text: '不用推桿進洞（切進或一桿進洞）' }] },
  { t: 'dino', title: '火山噴發', en: 'Eruption', intro: '五個火山口和一條熔岩河，要不要賭一把？',
    hole: [4, 440, 0, 'xc', { specials: [{ kind: 'vent', at: 210, lat: -8 }, { kind: 'vent', at: 230, lat: 6 }, { kind: 'vent', at: 250, lat: -2 }, { kind: 'vent', at: 300, lat: 7 }, { kind: 'vent', at: 320, lat: -6 }] }],
    max: 6, goals: [{ t: 'fx', kind: 'vent', v: 2, text: '被火山口噴上天 2 次以上' }, { t: 'noHazard', text: '一次都沒落水' }] },
  { t: 'city', title: '大樓強風', en: 'Tower Gust', intro: '高樓之間右邊吹來 14 mph 的強風，屋頂又窄。',
    wind: { mph: 14, from: 'R' }, hole: [4, 420, 0, 'nw', { gaps: [{ at: 170, half: 11 }, { at: 310, half: 10 }] }],
    max: 6, goals: [{ t: 'noHazard', text: '一次都沒從屋頂掉下去' }, { t: 'greenIn', v: 2, text: '兩桿內上果嶺' }] },
  // ---------- 41~50：大師 ----------
  { t: 'mars', title: '奧林帕斯山', en: 'Olympus Climb', intro: '一路上坡的火星巨山，越往上越陡。',
    hole: [5, 620, 25, 'UP', { bendAt: 300, elev: [[200, 8], [400, 22], [620, 34]], bunkers: [{ g: 'FL' }, { g: 'B' }] }],
    max: 7, goals: [{ t: 'strokes', v: 5, text: '標準桿以內' }, { t: 'noHazard', text: '一次都沒失誤' }] },
  { t: 'crystal', title: '雙重星門', en: 'Twin Gates', intro: '兩座星門串在一起：第一座送你到中段，第二座送你到果嶺前。',
    hole: [5, 600, 0, 'wl wr', { specials: [{ kind: 'portal', at: 110, h: 5.5, exitAt: 300 }, { kind: 'portal', at: 360, h: 5.5, exitAt: 560 }] }],
    max: 7, goals: [{ t: 'fx', kind: 'portal', v: 2, text: '穿過兩座星門' }, { t: 'strokes', v: 4, text: '4 桿以內進洞' }] },
  { t: 'tulip', title: '一線天', en: 'Ribbon Fairway', intro: '兩側都是運河的窄長球道，像一條緞帶。',
    c: { fairwayW: 24, roughW: 6 }, hole: [4, 400, 0, 'nw', { water: [{ from: 30, to: 400, side: 'L', w: 30, gap: 9 }, { from: 30, to: 400, side: 'R', w: 30, gap: 9 }] }],
    max: 6, goals: [{ t: 'fairwayAll', text: '每一桿都停在球道或果嶺' }, { t: 'strokes', v: 4, text: '標準桿以內' }] },
  { t: 'autumn', title: '高空吊球', en: 'Sky Lob', intro: '果嶺被高高的楓樹包圍，要打出很高的球才進得去。',
    c: { trees: 1.3 }, hole: [3, 160, 0, 'tr nw', { green: { size: [22, 26] }, bunkers: [{ g: 'F' }] }],
    max: 5, goals: [{ t: 'apex', v: 32, text: '打出最高點 32 公尺以上的球' }, { t: 'teeGreen', text: '開球直接上果嶺' }] },
  { t: 'lavender', title: '挖起桿之王', en: 'Wedge Master', intro: '只能用 L 挖起桿和推桿的 300 碼四桿洞。',
    clubs: ['LW', 'PT'], hole: [4, 300, -25, '', { bendAt: 150, bunkers: [{ at: 150, side: 'L' }, { g: 'FL' }, { g: 'BR' }] }],
    max: 6, goals: [{ t: 'strokes', v: 4, text: '標準桿以內' }, { t: 'putts', v: 1, text: '只推 1 次' }] },
  { t: 'egypt', title: '尼羅孤島', en: 'Nile Isle', intro: '尼羅河中的孤島果嶺，逆風 12 mph。',
    wind: { mph: 12, from: 'H' }, hole: [3, 230, 0, 'IG', { bunkers: [{ g: 'BL' }] }],
    max: 5, goals: [{ t: 'teeGreen', text: '開球直接上果嶺' }, { t: 'strokes', v: 2, text: '2 桿以內進洞' }] },
  { t: 'neon', title: '終極彈珠台', en: 'Mega Pinball', intro: '三條加速帶、兩道霓虹牆、兩個光環，夜城的終極彈珠台。',
    hole: [5, 600, 0, '', { specials: [{ kind: 'boost', at: 150 }, { kind: 'boost', at: 330 }, { kind: 'boost', at: 470 }, { kind: 'wall', at: 260, lat: -24, len: 40, ang: 20 }, { kind: 'wall', at: 400, lat: 24, len: 40, ang: -20 }, R(95, 16), R(380, 10)] }],
    max: 7, goals: [{ t: 'fxTotal', v: 4, text: '觸發機關合計 4 次以上' }, { t: 'strokes', v: 4, text: '4 桿以內進洞' }] },
  { t: 'sky', title: '雲中星門', en: 'Gate in the Clouds', intro: '先穿過光環飛越第一道裂縫，再穿星門直達果嶺前。',
    hole: [5, 620, 0, 'nw', { gaps: [{ at: 190, half: 12 }, { at: 420, half: 13 }], specials: [R(90, 16), { kind: 'portal', at: 300, h: 5.5, exitAt: 570 }] }],
    max: 7, goals: [{ t: 'all', text: '穿過光環，也穿過星門', sub: [{ t: 'fx', kind: 'ring', v: 1 }, { t: 'fx', kind: 'portal', v: 1 }] }, { t: 'strokes', v: 4, text: '4 桿以內進洞' }] },
  { t: 'moon', title: '月面一擊', en: 'Lunar Ace', intro: '250 碼的月面三桿洞。空氣稀薄，挑戰極限精準度。',
    hole: [3, 250, 0, '', { green: { size: [26, 30] }, bunkers: [{ g: 'FL' }, { g: 'FR' }, { g: 'B' }] }],
    max: 4, goals: [{ t: 'teeNear', v: 5, text: '開球停在旗桿 5 碼內' }, { t: 'strokes', v: 2, text: '2 桿以內進洞' }] },
  { t: 'crystal', title: '水晶終章', en: 'Crystal Finale', intro: '最後的試煉：水晶牆、光環、噴發口、金球，全部都在這一洞。',
    hole: [5, 640, -30, '', { bendAt: 300, water: [{ g: 'FR' }], specials: [R(95, 17), { kind: 'wall', at: 318, lat: 26, len: 46, ang: -28 }, { kind: 'vent', at: 420, lat: 0 }, O(160, 12), O(300, 8, -6), O(520, 6, 4)] }],
    max: 7, goals: [{ t: 'all', text: '收集 3 顆金球，也穿過光環', sub: [{ t: 'orbs', v: 3 }, { t: 'fx', kind: 'ring', v: 1 }] }, { t: 'strokes', v: 4, text: '4 桿以內進洞' }] },
  // ---------- 51~60：異界巡禮（新的世界，難度從第 50 關接著往上）----------
  { t: 'jungle', title: '叢林初探', en: 'Jungle Trail', intro: '藤蔓垂掛的雨林，左邊是一整條翡翠色的溪流，空中漂著兩顆金球。',
    hole: [4, 370, -15, '', { bendAt: 210, water: [{ from: 60, to: 340, side: 'L', w: 30, gap: 6 }], bunkers: [{ g: 'FR' }], specials: [O(140, 9, 4), O(260, 6, -2)] }],
    max: 6, goals: [{ t: 'orbs', v: 2, text: '收集 2 顆金球' }, { t: 'noHazard', text: '一次都沒掉進溪裡' }] },
  { t: 'sakura', title: '櫻花台階', en: 'Petal Steps', intro: '櫻花飄落的日式庭園，果嶺分成上下兩層，旗桿在上層。',
    c: { stimp: 10.5 }, hole: [3, 155, 0, '', { green: { size: [30, 34], slope: 0.03, tier: true, tierAt: 0.2 }, bunkers: [{ g: 'FL' }, { g: 'BR' }] }],
    max: 5, goals: [{ t: 'teeGreen', text: '開球直接上果嶺' }, { t: 'putts', v: 1, text: '只推 1 次' }] },
  { t: 'toy', title: '積木跳台', en: 'Block Jump', intro: '積木堆成的玩具城，落點區放了兩張彈跳床。',
    hole: [4, 350, 0, '', { bunkers: [{ g: 'FL' }, { g: 'FR' }], specials: [{ kind: 'tramp', at: 200, lat: -3 }, { kind: 'tramp', at: 240, lat: 4 }] }],
    max: 6, goals: [{ t: 'fx', kind: 'tramp', v: 1, text: '落上彈跳床 1 次' }, { t: 'strokes', v: 4, text: '標準桿以內' }] },
  { t: 'honey', title: '蜂蜜陷阱', en: 'Honey Trap', intro: '花谷裡散落著金黃色的蜂蜜池，掉進去球會立刻黏住。',
    hole: [4, 380, 20, 'hy', { bendAt: 220, bunkers: [{ g: 'FL' }] }],
    max: 6, goals: [{ t: 'avoid', kind: 'honey', text: '一次都沒被蜂蜜黏住' }, { t: 'strokes', v: 4, text: '標準桿以內' }] },
  { t: 'frost', title: '冰原折返', en: 'Glacier Bounce', intro: '極地冰原上的左狗腿洞，轉角立著一道冰牆，可以靠反彈過彎。',
    hole: [4, 400, -55, '', { bendAt: 210, specials: [{ kind: 'wall', at: 225, lat: 28, len: 46, ang: -28 }], bunkers: [{ g: 'FR' }] }],
    max: 6, goals: [{ t: 'fx', kind: 'wall', v: 1, text: '撞冰牆反彈 1 次' }, { t: 'greenIn', v: 2, text: '兩桿內上果嶺' }] },
  { t: 'haunt', title: '幽光墓園', en: 'Lantern Graves', intro: '古堡後的墓園，引魂燈會把飛過的球拉向旗桿。',
    hole: [3, 175, 0, 'ws', { bunkers: [{ g: 'FL' }, { g: 'R' }] }],
    max: 5, goals: [{ t: 'fx', kind: 'wisp', v: 1, text: '被引魂燈拉過 1 次' }, { t: 'teeNear', v: 10, text: '開球停在旗桿 10 碼內' }] },
  { t: 'clock', title: '齒輪迴廊', en: 'Cog Corridor', intro: '巨大的齒輪工坊，轉角的齒輪會把球甩向彎過去的方向。',
    hole: [5, 530, 40, 'gr', { bendAt: 260, bunkers: [{ g: 'FL' }, { g: 'BR' }] }],
    max: 7, goals: [{ t: 'fx', kind: 'gear', v: 1, text: '被齒輪甩出去 1 次' }, { t: 'strokes', v: 5, text: '標準桿以內' }] },
  { t: 'storm', title: '雷暴前夕', en: 'Before the Storm', intro: '高原上烏雲密布，球穿過雷雲會被閃電打下來。左邊吹來 10 mph 的風。',
    wind: { mph: 10, from: 'L' }, hole: [4, 410, 0, 'cl', { bunkers: [{ g: 'FL' }, { at: 240, side: 'R' }] }],
    max: 6, goals: [{ t: 'avoid', kind: 'cloud', text: '一次都沒被雷打中' }, { t: 'strokes', v: 4, text: '標準桿以內' }] },
  { t: 'mushroom', title: '螢光菇林', en: 'Glowcap Grove', intro: '發光的巨菇林，落點有兩朵彈跳巨菇，落上去會被彈起來。',
    hole: [4, 380, 0, '', { bunkers: [{ g: 'FR' }], specials: [{ kind: 'shroom', at: 210, lat: -4 }, { kind: 'shroom', at: 250, lat: 5, h: 6 }] }],
    max: 6, goals: [{ t: 'fx', kind: 'shroom', v: 1, text: '被巨菇彈起來' }, { t: 'fxGreen', kind: 'shroom', text: '被巨菇彈起的那一桿直接上果嶺' }] },
  { t: 'lava', title: '熔岩孤島', en: 'Magma Isle', intro: '果嶺浮在一片熔岩湖中央，只有發球台和果嶺是陸地。',
    hole: [3, 190, 0, 'IG', { bunkers: [{ g: 'B' }] }],
    max: 4, goals: [{ t: 'teeGreen', text: '開球直接上果嶺' }, { t: 'strokes', v: 2, text: '2 桿以內進洞' }] },
  // ---------- 61~70：組合技 ----------
  { t: 'tropical', title: '椰林海灣', en: 'Palm Bay', intro: '右邊整片都是碧藍的海灣，球道沿著海岸彎過去。',
    hole: [5, 560, 25, 'wr', { bendAt: 300, bunkers: [{ at: 260, side: 'L' }, { g: 'FL' }] }],
    max: 7, goals: [{ t: 'fairwayAll', text: '每一桿都停在球道或果嶺' }, { t: 'strokes', v: 5, text: '標準桿以內' }] },
  { t: 'void', title: '虛空三島', en: 'Three Isles', intro: '漂在星空裡的三座浮島，兩道裂縫一失手就掉進虛空。',
    hole: [4, 420, 0, 'nw', { gaps: [{ at: 170, half: 11 }, { at: 310, half: 11 }] }],
    max: 6, goals: [{ t: 'noHazard', text: '一次都沒掉進虛空' }, { t: 'greenIn', v: 2, text: '兩桿內上果嶺' }] },
  { t: 'toy', title: '玩具彈珠台', en: 'Toy Pinball', intro: '球道兩側立著一根根彈珠柱，撞到會加速彈開。',
    hole: [4, 400, 0, 'bp', { bunkers: [{ g: 'FL' }] }],
    max: 6, goals: [{ t: 'fx', kind: 'bumper', v: 2, text: '撞彈珠柱 2 次以上' }, { t: 'strokes', v: 4, text: '標準桿以內' }] },
  { t: 'jungle', title: '雙環峽谷', en: 'Twin Ring Gorge', intro: '峽谷上方兩個螢火之環排成一線，一桿穿過兩個才算厲害。',
    hole: [4, 390, 0, 'xc', { bunkers: [{ g: 'FR' }], specials: [R(90, 15), R(145, 22)] }],
    max: 6, goals: [{ t: 'fxOne', kind: 'ring', v: 2, text: '同一桿穿過 2 個光環' }, { t: 'noHazard', text: '一次都沒掉進峽谷' }] },
  { t: 'frost', title: '冰鏡迷宮', en: 'Mirror Maze', intro: '三道冰牆排成之字形，轉角要靠反彈過去。',
    hole: [4, 370, -65, '', { bendAt: 190, specials: [{ kind: 'wall', at: 205, lat: 27, len: 48, ang: -30 }, { kind: 'wall', at: 290, lat: -22, len: 34 }, { kind: 'wall', at: 110, lat: 20, len: 28 }] }],
    max: 6, goals: [{ t: 'fx', kind: 'wall', v: 2, text: '撞冰牆 2 次以上' }, { t: 'strokes', v: 4, text: '標準桿以內' }] },
  { t: 'honey', title: '黏黏五桿', en: 'Sticky Five', intro: '蜂蜜池和轉向齒輪混在一起的五桿洞，閃過蜂蜜、看準齒輪。',
    hole: [5, 545, -30, 'hy gr', { bendAt: 280, bunkers: [{ g: 'FR' }] }],
    max: 7, goals: [{ t: 'avoid', kind: 'honey', text: '一次都沒被蜂蜜黏住' }, { t: 'greenIn', v: 3, text: '三桿內上果嶺' }] },
  { t: 'haunt', title: '午夜引魂', en: 'Midnight Wisps', intro: '五桿洞上飄著三盞引魂燈，連續被拉兩次就能直奔旗桿。',
    hole: [5, 580, 0, 'ws', { bunkers: [{ g: 'FL' }, { g: 'FR' }] }],
    max: 7, goals: [{ t: 'fx', kind: 'wisp', v: 2, text: '被引魂燈拉過 2 次以上' }, { t: 'strokes', v: 5, text: '標準桿以內' }] },
  { t: 'storm', title: '落雷禁區', en: 'Lightning Zone', intro: '果嶺前飄著一朵雷雲，逆風 12 mph，要從雷雲下面鑽過去。',
    wind: { mph: 12, from: 'H' }, hole: [3, 205, 0, 'cl', { bunkers: [{ g: 'FL' }, { g: 'FR' }] }],
    max: 5, goals: [{ t: 'teeGreen', text: '開球直接上果嶺' }, { t: 'avoid', kind: 'cloud', text: '一次都沒被雷打中' }] },
  { t: 'sakura', title: '一支七號鐵', en: 'Seven Only', intro: '整洞只能用 7 號鐵和推桿。櫻花樹下的短四桿。',
    clubs: ['7I', 'PT'], hole: [4, 330, 15, '', { bendAt: 170, bunkers: [{ at: 160, side: 'R' }, { g: 'FL' }] }],
    max: 6, goals: [{ t: 'strokes', v: 4, text: '標準桿以內' }, { t: 'putts', v: 1, text: '只推 1 次' }] },
  { t: 'lava', title: '熔岩大砲', en: 'Magma Cannon', intro: '熔岩河兩岸各有噴發口，中間一座大砲直接轟向果嶺。',
    hole: [5, 600, 0, 'xc', { specials: [{ kind: 'vent', at: 180, lat: -7 }, { kind: 'vent', at: 200, lat: 6 }, { kind: 'cannon', at: 260, r: 4.2 }] }],
    max: 7, goals: [{ t: 'fx', kind: 'cannon', v: 1, text: '被大砲轟出去' }, { t: 'strokes', v: 4, text: '4 桿以內進洞' }] },
  // ---------- 71~80：專家 ----------
  { t: 'clock', title: '精密齒輪', en: 'Precision Gear', intro: '小小的果嶺旁邊有一個齒輪，差一點就被甩走。',
    hole: [3, 165, 0, 'gr', { green: { size: [20, 24] }, bunkers: [{ g: 'FL' }, { g: 'BR' }] }],
    max: 4, goals: [{ t: 'teeNear', v: 4, text: '開球停在旗桿 4 碼內' }, { t: 'putts', v: 1, text: '只推 1 次' }] },
  { t: 'mushroom', title: '菇菇連彈', en: 'Triple Bounce', intro: '三朵巨菇排在球道中央，一桿連彈兩次以上。',
    hole: [5, 560, 0, '', { bunkers: [{ g: 'FL' }], specials: [{ kind: 'shroom', at: 230 }, { kind: 'shroom', at: 275, lat: 2, h: 6 }, { kind: 'shroom', at: 320, lat: -2, h: 7 }] }],
    max: 6, goals: [{ t: 'fxOne', kind: 'shroom', v: 2, text: '同一桿被巨菇彈 2 次以上' }, { t: 'strokes', v: 5, text: '標準桿以內' }] },
  { t: 'tropical', title: '海島孤峰', en: 'Lonely Atoll', intro: '海中央的孤島果嶺，右邊吹來 12 mph 的海風。',
    wind: { mph: 12, from: 'R' }, hole: [3, 230, 0, 'IG', { bunkers: [{ g: 'BL' }] }],
    max: 4, goals: [{ t: 'teeGreen', text: '開球直接上果嶺' }, { t: 'strokes', v: 2, text: '2 桿以內進洞' }] },
  { t: 'void', title: '星門迷航', en: 'Lost Gate', intro: '四座浮島、三道裂縫，前面有一座星門可以直接跳到果嶺前。',
    hole: [5, 640, 0, 'nw', { gaps: [{ at: 200, half: 11 }, { at: 360, half: 12 }, { at: 510, half: 11 }], specials: [{ kind: 'portal', at: 140, h: 5.5, exitAt: 590 }] }],
    max: 6, goals: [{ t: 'all', text: '穿過星門，而且一次都沒掉下去', sub: [{ t: 'fx', kind: 'portal', v: 1 }, { t: 'noHazard' }] }, { t: 'strokes', v: 4, text: '4 桿以內進洞' }] },
  { t: 'toy', title: '只用沙坑桿', en: 'Sand Wedge Only', intro: '只能用沙坑桿和推桿的 280 碼右狗腿。',
    clubs: ['SW', 'PT'], hole: [4, 280, 30, '', { bendAt: 140, bunkers: [{ at: 140, side: 'R' }, { g: 'FL' }] }],
    max: 6, goals: [{ t: 'strokes', v: 4, text: '標準桿以內' }, { t: 'noRough', text: '一次都沒進長草' }] },
  { t: 'jungle', title: '叢林巨砲', en: 'Canopy Cannon', intro: '470 碼的長四桿，開球要越過叢林才看得到果嶺。',
    hole: [4, 470, 0, 'tr', { bunkers: [{ at: 280, side: 'L' }, { at: 300, side: 'R' }, { g: 'F' }] }],
    max: 6, goals: [{ t: 'drive', v: 280, text: '開球 280 碼以上' }, { t: 'greenIn', v: 2, text: '兩桿內上果嶺' }] },
  { t: 'frost', title: '冰上推桿', en: 'Ice Rink Green', intro: '結了霜的果嶺又快又陡（果嶺速度 13），分成兩層。',
    c: { stimp: 13 }, hole: [3, 140, 0, '', { green: { size: [32, 36], slope: 0.04, tier: true, side: 0.02 }, bunkers: [{ g: 'FL' }, { g: 'FR' }] }],
    max: 4, goals: [{ t: 'putts', v: 1, text: '只推 1 次' }, { t: 'strokes', v: 2, text: '2 桿以內進洞' }] },
  { t: 'haunt', title: '墓園精準', en: 'Graveyard Line', intro: '開球要剛好停在 220~240 碼之間，太短太長都會進墓園。',
    hole: [4, 360, 0, '', { bunkers: [{ at: 205, side: 'L' }, { at: 255, side: 'R' }, { g: 'FL' }] }],
    max: 5, goals: [{ t: 'driveRange', v: [220, 240], text: '開球停在 220~240 碼之間' }, { t: 'teeFairway', text: '開球停在球道上' }] },
  { t: 'storm', title: '暴風之眼', en: 'Eye of the Storm', intro: '左邊吹來 18 mph 的暴風，雷雲在球道上空盤旋。',
    wind: { mph: 18, from: 'L' }, hole: [4, 420, 0, 'cl wr', { bunkers: [{ g: 'FL' }] }],
    max: 6, goals: [{ t: 'noHazard', text: '一次都沒失誤' }, { t: 'strokes', v: 4, text: '標準桿以內' }] },
  { t: 'lava', title: '熔岩深淵', en: 'Magma Abyss', intro: '熔岩裂谷橫斷球道，裂谷前後三個噴發口隨時待命。',
    hole: [4, 440, 0, 'xc', { specials: [{ kind: 'vent', at: 200, lat: -5 }, { kind: 'vent', at: 230, lat: 6 }, { kind: 'vent', at: 300, lat: 0 }] }],
    max: 5, goals: [{ t: 'fx', kind: 'vent', v: 1, text: '被噴發口噴上天' }, { t: 'strokes', v: 4, text: '標準桿以內' }] },
  // ---------- 81~90：大師 ----------
  { t: 'clock', title: '時間競賽', en: 'Race Against Time', intro: '齒輪和彈珠柱交錯的長五桿，看你能玩出幾種機關。',
    hole: [5, 610, 30, 'gr bp', { bendAt: 300, bunkers: [{ g: 'FL' }] }],
    max: 6, goals: [{ t: 'fxKinds', v: 2, text: '觸發 2 種以上不同的機關' }, { t: 'strokes', v: 5, text: '標準桿以內' }] },
  { t: 'honey', title: '甜蜜孤島', en: 'Nectar Isle', intro: '孤島果嶺四周是蜂蜜，不准用推桿進洞！',
    hole: [3, 180, 0, 'IG hy', { bunkers: [{ g: 'L' }] }],
    max: 4, goals: [{ t: 'teeGreen', text: '開球直接上果嶺' }, { t: 'noPutt', text: '不用推桿進洞（切進或一桿進洞）' }] },
  { t: 'sakura', title: '櫻吹雪', en: 'Petal Storm', intro: '又窄又長的櫻花林道，花瓣滿天飛，每一桿都要在球道上。',
    c: { fairwayW: 26 }, hole: [5, 560, -20, 'nw tr', { bendAt: 280, bunkers: [{ g: 'FR' }, { at: 260, side: 'L' }] }],
    max: 6, goals: [{ t: 'fairwayAll', text: '每一桿都停在球道或果嶺' }, { t: 'strokes', v: 5, text: '標準桿以內' }] },
  { t: 'mushroom', title: '巨菇天梯', en: 'Fungal Stairway', intro: '一路往上爬的四桿洞，要打出超高的球才上得去。',
    hole: [4, 420, 0, 'UP', { elev: [[150, 6], [300, 16], [420, 24]], specials: [{ kind: 'shroom', at: 230, h: 7 }], bunkers: [{ g: 'FL' }] }],
    max: 6, goals: [{ t: 'apex', v: 40, text: '打出最高點 40 公尺以上的球' }, { t: 'greenIn', v: 2, text: '兩桿內上果嶺' }] },
  { t: 'tropical', title: '珍珠小島', en: 'Pearl Islet', intro: '130 碼的孤島短洞，果嶺小得像一顆珍珠。',
    hole: [3, 130, 0, 'IG', { green: { size: [18, 22] }, bunkers: [{ g: 'B' }] }],
    max: 4, goals: [{ t: 'teeNear', v: 3, text: '開球停在旗桿 3 碼內' }, { t: 'strokes', v: 2, text: '2 桿以內進洞' }] },
  { t: 'void', title: '虛空長征', en: 'Void March', intro: '680 碼、五座浮島、四道裂縫，一桿都不能失誤。',
    hole: [5, 680, 0, 'nw', { gaps: [{ at: 170, half: 10 }, { at: 320, half: 11 }, { at: 460, half: 11 }, { at: 590, half: 10 }] }],
    max: 6, goals: [{ t: 'noHazard', text: '一次都沒掉進虛空' }, { t: 'strokes', v: 5, text: '標準桿以內' }] },
  { t: 'toy', title: '積木大亂鬥', en: 'Toybox Brawl', intro: '彈跳床、加速帶、玩具牆、大砲和彈珠柱，全部塞在同一洞。',
    hole: [5, 600, 0, 'bp', { specials: [{ kind: 'tramp', at: 190, lat: -4 }, { kind: 'boost', at: 260 }, { kind: 'wall', at: 360, lat: 24, len: 40, ang: -20 }, { kind: 'cannon', at: 330, lat: -5 }] }],
    max: 6, goals: [{ t: 'fxTotal', v: 5, text: '觸發機關合計 5 次以上' }, { t: 'strokes', v: 5, text: '標準桿以內' }] },
  { t: 'jungle', title: '叢林神射', en: 'Jungle Sniper', intro: '果嶺前是一條溪，從 60 碼外直接打進洞才算神射手。',
    hole: [4, 330, 0, '', { water: [{ g: 'F' }], bunkers: [{ g: 'BL' }, { g: 'BR' }] }],
    max: 5, goals: [{ t: 'holeOut', v: 60, text: '從 60 碼外直接打進洞（不用推桿）' }, { t: 'strokes', v: 3, text: '3 桿以內進洞' }] },
  { t: 'frost', title: '極地雙門', en: 'Polar Gates', intro: '兩座星門串連冰原，兩側都是冰湖。',
    hole: [5, 620, 0, 'wl wr', { specials: [{ kind: 'portal', at: 120, h: 5.5, exitAt: 320 }, { kind: 'portal', at: 380, h: 5.5, exitAt: 580 }] }],
    max: 6, goals: [{ t: 'all', text: '穿過兩座星門，而且一次都沒落水', sub: [{ t: 'fx', kind: 'portal', v: 2 }, { t: 'noHazard' }] }, { t: 'strokes', v: 4, text: '4 桿以內進洞' }] },
  { t: 'lava', title: '火山心臟', en: 'Heart of the Volcano', intro: '火山口裡的四桿洞，熔岩溪橫越、果嶺前還有熔岩池。',
    hole: [4, 460, 0, 'xc', { water: [{ g: 'F' }], specials: [{ kind: 'vent', at: 250, lat: 0 }], bunkers: [{ g: 'BR' }] }],
    max: 5, goals: [{ t: 'greenIn', v: 2, text: '兩桿內上果嶺' }, { t: 'strokes', v: 3, text: '3 桿以內進洞' }] },
  // ---------- 91~100：深淵（終極）----------
  { t: 'haunt', title: '亡魂之路', en: 'Path of Souls', intro: '引魂燈與雷雲交織的五桿洞，至少玩出兩種機關，還要 4 桿進洞。',
    hole: [5, 640, 0, 'ws cl', { bunkers: [{ g: 'FL' }, { g: 'FR' }] }],
    max: 6, goals: [{ t: 'fxKinds', v: 2, text: '觸發 2 種以上不同的機關' }, { t: 'strokes', v: 4, text: '4 桿以內進洞' }] },
  { t: 'storm', title: '雷神之怒', en: 'Wrath of Thunder', intro: '逆風 20 mph，風大到球像撞上一面牆。',
    wind: { mph: 20, from: 'H' }, hole: [4, 400, 0, 'cl', { bunkers: [{ g: 'FL' }, { g: 'FR' }] }],
    max: 5, goals: [{ t: 'noHazard', text: '一次都沒失誤' }, { t: 'strokes', v: 4, text: '標準桿以內' }] },
  { t: 'clock', title: '鐘樓一擊', en: 'Clocktower Drop', intro: '從鐘樓頂往下打的 190 碼短洞，果嶺小、落差 18 公尺。',
    hole: [3, 190, 0, 'DN', { elev: [[190, -18]], green: { size: [20, 24] }, bunkers: [{ g: 'FL' }, { g: 'FR' }, { g: 'B' }] }],
    max: 3, goals: [{ t: 'teeNear', v: 3, text: '開球停在旗桿 3 碼內' }, { t: 'strokes', v: 2, text: '2 桿以內進洞' }] },
  { t: 'honey', title: '花蜜迷宮', en: 'Nectar Maze', intro: '蜂蜜池、彈珠柱、齒輪擠成一座迷宮，避開蜂蜜還要玩到機關。',
    hole: [4, 380, -25, 'hy bp gr', { bendAt: 200 }],
    max: 5, goals: [{ t: 'all', text: '沒被蜂蜜黏住，也觸發 2 次以上機關', sub: [{ t: 'avoid', kind: 'honey' }, { t: 'fxTotal', v: 2 }] }, { t: 'strokes', v: 4, text: '標準桿以內' }] },
  { t: 'mushroom', title: '夜光一擊', en: 'Glowing Ace', intro: '果嶺前有一朵巨菇，彈上去直接上果嶺最理想。',
    hole: [3, 160, 0, '', { specials: [{ kind: 'shroom', at: 120, h: 5 }], bunkers: [{ g: 'BL' }, { g: 'BR' }] }],
    max: 3, goals: [{ t: 'fxGreen', kind: 'shroom', text: '被巨菇彈起的那一桿停上果嶺' }, { t: 'strokes', v: 2, text: '2 桿以內進洞' }] },
  { t: 'tropical', title: '珊瑚緞帶', en: 'Coral Ribbon', intro: '650 碼的緞帶球道，兩側都是海，球道只有 24 碼寬。',
    c: { fairwayW: 24, roughW: 6 }, hole: [5, 650, 0, 'nw', { water: [{ from: 30, to: 640, side: 'L', w: 30, gap: 9 }, { from: 30, to: 640, side: 'R', w: 30, gap: 9 }] }],
    max: 6, goals: [{ t: 'fairwayAll', text: '每一桿都停在球道或果嶺' }, { t: 'strokes', v: 5, text: '標準桿以內' }] },
  { t: 'void', title: '黑洞邊緣', en: 'Event Horizon', intro: '窄窄的浮島四桿洞，三道裂縫緊緊相連。',
    hole: [4, 450, 0, 'nw', { gaps: [{ at: 150, half: 10 }, { at: 260, half: 11 }, { at: 370, half: 10 }] }],
    max: 5, goals: [{ t: 'noHazard', text: '一次都沒掉進虛空' }, { t: 'strokes', v: 3, text: '3 桿以內進洞' }] },
  { t: 'toy', title: '五號鐵之王', en: 'Five Iron King', intro: '整洞只能用 5 號鐵和推桿的 400 碼四桿洞。',
    clubs: ['5I', 'PT'], hole: [4, 400, 0, '', { bunkers: [{ at: 190, side: 'L' }, { at: 350, side: 'R' }, { g: 'F' }] }],
    max: 5, goals: [{ t: 'strokes', v: 4, text: '標準桿以內' }, { t: 'putts', v: 1, text: '只推 1 次' }] },
  { t: 'lava', title: '熔岩終焉', en: 'Magma Finale', intro: '熔岩裂谷、噴發口、大砲、光環和三顆金球，地心的最後試煉。',
    hole: [5, 660, 25, 'xc', { bendAt: 320, specials: [R(95, 16), { kind: 'vent', at: 230, lat: -6 }, { kind: 'cannon', at: 380, lat: 3 }, O(150, 11), O(300, 8, 5), O(520, 6, -4)] }],
    max: 5, goals: [{ t: 'all', text: '收集 3 顆金球，也穿過光環', sub: [{ t: 'orbs', v: 3 }, { t: 'fx', kind: 'ring', v: 1 }] }, { t: 'strokes', v: 4, text: '4 桿以內進洞' }] },
  { t: 'void', title: '無盡深淵', en: 'Endless Abyss', intro: '最終關：浮島、裂縫、星門、冰牆、光環和金球，全部在這裡。',
    hole: [5, 700, -20, 'nw', { bendAt: 330, gaps: [{ at: 190, half: 11 }, { at: 430, half: 12 }], specials: [R(95, 16), { kind: 'portal', at: 300, h: 5.5, exitAt: 620 }, { kind: 'wall', at: 345, lat: 26, len: 44, ang: -25 }, O(160, 12), O(260, 8, -5), O(560, 6, 4)] }],
    max: 5, goals: [{ t: 'all', text: '收集 3 顆金球、穿過星門，而且一次都沒掉下去', sub: [{ t: 'orbs', v: 3 }, { t: 'fx', kind: 'portal', v: 1 }, { t: 'noHazard' }] }, { t: 'strokes', v: 4, text: '4 桿以內進洞' }] },
];

// 前 70 關裡籠統的「標準桿以內」換成跟這一洞有關的條件（有水 → 不落水、沙坑多 → 不進沙坑、三桿洞 → 開球靠近旗桿…）
function specificGoal(l, n) {
  const [par, , , feat, spec] = l.hole, has = t => l.goals.some(g => g.t === t);
  const wet = (spec.water && spec.water.length) || (spec.gaps && spec.gaps.length) || /xc|wl|wr|IG/.test(feat);
  if (wet && !has('noHazard')) return { t: 'noHazard', text: '一次都沒失誤（落水 / 掉落 / OB）' };
  if ((spec.bunkers || []).length >= 2 && !has('noSand')) return { t: 'noSand', text: '一次都沒進沙坑' };
  if (par === 3 && !has('teeNear')) { const v = n < 30 ? 12 : 8; return { t: 'teeNear', v, text: `開球停在旗桿 ${v} 碼內` }; }
  if (par >= 4 && !has('greenIn')) return { t: 'greenIn', v: par - 2, text: `${par - 2} 桿內上果嶺` };
  if (!has('noRough')) return { t: 'noRough', text: '一次都沒進長草' };
  return null;
}
for (const [i, l] of LV.entries()) {
  if (i >= 70) break;
  l.goals = l.goals.map(g => g.t === 'strokes' && g.v === l.hole[0] ? (specificGoal(l, i + 1) || g) : g);
}
// 第 101~300 關（challenge-gen.js 產生）
LV.push(...genLevels());
// 章節：前 100 關每 10 關一章，101 關以後每 20 關一章（第 20 關是頭目關）
export const CHAPTERS = [
  ...['入門', '中等', '進階', '困難', '大師', '異界巡禮', '組合技', '專家', '大師之路', '深淵'].map((name, k) => ({ name, from: k * 10 + 1, to: k * 10 + 10 })),
  ...CHAPTERS_2.map((c, k) => ({ name: c.name, from: 101 + k * 20, to: 120 + k * 20 })),
];
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
    case 'all': return g.sub.every(x => goalMet(x, att, par, done));
    default: return false;
  }
}
// 星數：沒進洞 0 星；進洞 1 星，另外兩個條件各 1 星
export function evaluate(level, att) {
  const met = level.goals.map(g => goalMet(g, att, level.par, true));
  return { met, stars: met[0] ? met.filter(Boolean).length : 0 };
}
