// 挑戰模式：每一關是一個專門設計的洞，用的都是一般球場沒有的風格（糖果、屋頂、雲海、月面、火星、珊瑚礁、楓紅、
// 薰衣草、鬱金香、神殿、沼澤、恐龍谷、霓虹、水晶洞窟），越後面越難
// 每關的球場資料用 spec 指定（距離都從發球台量，單位碼）：bendAt / bend2At 轉彎、water / bunkers 障礙、
// specials 機關（ring 螢火之環、orb 金球、portal 星門、vent 噴發口、shroom 彈跳巨菇、wall 冰鏡牆、tramp 彈跳床、boost 加速帶、cannon 大砲）、
// gaps 浮島 / 屋頂之間的裂縫
// 星星：第 1 顆 = 在桿數上限內進洞，第 2、3 顆 = 各關自己的條件（也要先進洞才算）
import { registerCourse } from './courses.js';
import { SURF } from './physics.js';

const T = y => ({ black: y, blue: y, white: y, red: y });
const BASE = { stimp: 9, firm: 1.0, altitude: 100, temp: 22, wind: [2, 6], fairwayW: 34, roughW: 16, corridor: 76, trees: 0.7 };
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
};
export const THEME_NAME = { candy: '糖果王國', city: '天際屋頂', sky: '雲海天空城', moon: '月面基地', mars: '紅色火星', reef: '海底珊瑚礁', autumn: '楓紅山谷',
  lavender: '薰衣草花田', tulip: '風車鬱金香', egypt: '法老神殿', swamp: '迷霧沼澤', dino: '恐龍谷', neon: '霓虹夜城', crystal: '水晶洞窟' };

// 目標的種類（goalMet 用）：
//   clear 進洞、strokes 桿數 ≤ v、hio 一桿進洞、teeGreen 開球上果嶺、teeNear 開球離旗桿 ≤ v 碼、teeFairway 開球停在球道、
//   driveRange 開球 v[0]~v[1] 碼、drive 開球 ≥ v 碼、noHazard 沒落水 / 掉落 / OB、noSand 沒進沙坑、noRough 沒進長草、
//   fairwayAll 每一桿都停在球道或果嶺、fx 機關累計 ≥ v、fxOne 同一桿觸發 ≥ v、fxGreen 觸發那一桿停上果嶺、fxTotal 所有機關合計 ≥ v、
//   avoid 完全沒碰到某種機關、orbs 金球 ≥ v、putts 推桿 ≤ v、noPutt 不用推桿進洞、longPutt 從 ≥ v 碼推進、greenIn 第 v 桿以內上果嶺、
//   airTime 某一桿在空中 ≥ v 秒、apex 某一桿最高點 ≥ v 公尺、lastClub 用指定的球桿進洞、clubCount 最多用 v 種球桿、all 子條件全部達成
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
];

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
    case 'all': return g.sub.every(x => goalMet(x, att, par, done));
    default: return false;
  }
}
// 星數：沒進洞 0 星；進洞 1 星，另外兩個條件各 1 星
export function evaluate(level, att) {
  const met = level.goals.map(g => goalMet(g, att, level.par, true));
  return { met, stars: met[0] ? met.filter(Boolean).length : 0 };
}
