// Three.js 3D 場景：天空 HDR、地形（顏色圖 + 寫實細節材質）、水面、樹、旗桿、球、彈道線、瞄準標記
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { paintMaps } from './terrain.js';
import { makeNoise, makeRng, clamp } from './util.js';
import { heatColor } from './hud.js';

const BALL_R = 0.021335;
const QUALITY = {
  high: { ratio: 2, shadow: 2048, grid: 1.5, trees: 1, far: 1 },
  medium: { ratio: 1.5, shadow: 1536, grid: 2, trees: 0.8, far: 0.6 },
  low: { ratio: 1, shadow: 1024, grid: 3, trees: 0.55, far: 0.3 },
};

// 奇幻主題：天空、霧、光線、岩壁顏色、外圍地形顏色（只改外觀）
// 台灣真實球場的周邊景色（方位：0 = 球洞往前、270 = 西邊；towers：[方位, 距離, 棟數, 最低高度, 最高高度]）
const LANDMARKS = {
  // 桃園龜山：湖泊環繞的丘陵球場，四周是林口台地邊緣的山丘，遠處有林口新市鎮的大樓
  orient: { hills: 10, towers: [[30, 1500, 18, 70, 120]], egrets: 4, eagles: 2, magpies: 1 },
  // 林口台地西側：看得到台灣海峽、海邊的林口發電廠煙囪與風力發電機
  donghua: { sea: [270, 1500], plant: [245, 1700], turbines: [290, 1550, 7], towers: [[90, 1400, 22, 70, 130]], egrets: 4, eagles: 2 },
  // 龜山長庚：旁邊是長庚醫院與長庚大學，遠方是林口的大樓群
  cggc: { hospital: [60, 800], towers: [[140, 1400, 24, 70, 130]], hills: 4, egrets: 4, eagles: 1, magpies: 1 },
  // 林口：新市鎮的高樓就在球場旁邊，12 個水池常有白鷺鷥
  miramar: { towers: [[20, 1300, 30, 80, 150], [110, 1700, 16, 70, 120]], egrets: 7, eagles: 2 },
  // 林口下福：眺望山林海景，海岸有風力發電機；球道邊有奇石
  hsingfu: { sea: [270, 1500], turbines: [270, 1550, 6], towers: [[80, 1500, 14, 70, 120]], rocks: 6, egrets: 4, eagles: 2, magpies: 1 },
  // 林口 / 龜山交界的山坡地：松林、遠方大樓，偶爾有往桃園機場的飛機飛過
  taipei: { hills: 8, towers: [[100, 1500, 16, 70, 120]], planes: 300, egrets: 3, eagles: 3, magpies: 1 },
  // 台南關廟：南部平原上的丘陵，遠處是低矮的山，球場裡有很多大水池
  nanyi: { hills: 12, egrets: 6, eagles: 2 },
  // 桃園大溪：河階台地，遠方是大溪的山，旁邊是威斯汀度假酒店
  tashee: { hills: 12, hotel: [70, 900], egrets: 4, eagles: 3, magpies: 1 },
  // 桃園龍潭：平坦、遠處有龍潭的社區大樓，旁邊是悅華大酒店
  taoyuan: { towers: [[60, 1600, 14, 50, 100]], hotel: [200, 800], hills: 4, egrets: 5, eagles: 2 },
  // 桃園蘆竹：林口台地邊緣的丘陵林地，緊鄰桃園機場，客機低空起降；遠方是林口台地的大樓
  yunghan: { hills: 8, towers: [[60, 1700, 12, 60, 110]], planes: 250, egrets: 3, eagles: 2, magpies: 1 },
  // 桃園楊梅：高台上的球場，看得到遠方的高壓電塔與社區；會館旁是飯店
  sunrise: { hills: 6, pylons: [[80, 700, 4]], hotel: [180, 700], towers: [[40, 1800, 10, 50, 100]], egrets: 4, eagles: 3 },
  // 桃園龍潭：平坦地形加大水池，遠方是龍潭的社區
  lungtan: { towers: [[30, 1700, 12, 50, 100]], hills: 5, egrets: 7, eagles: 2 },
  // 新竹關西：赤柯山、東山里的山谷，四周是層層的山林（新竹的東北季風強），常見白鷺鷥與大冠鷲
  royalkh: { hills: 14, egrets: 5, eagles: 3, magpies: 1 },
  lilygolf: { hills: 12, egrets: 4, eagles: 3, magpies: 1 },
  // 新竹湖口：湖口台地邊緣的丘陵，南邊是高速公路與湖口的社區，北邊遠處是新豐的海岸風車
  zaixing: { hills: 8, towers: [[200, 1600, 10, 40, 90]], turbines: [320, 6000, 4], egrets: 5, eagles: 2, magpies: 1 },
  // 新竹寶山：丘陵上的球場，西北邊緊鄰中山高速公路與寶山的社區，四周是山林與果園
  paoshan: { hills: 10, towers: [[300, 1400, 8, 30, 70]], egrets: 4, eagles: 3, magpies: 1 },
  // 新竹關西旭陽：山林裡的球場，四周層層山巒、杉木林，常見白鷺鷥
  sunvalley: { hills: 14, egrets: 6, eagles: 3, magpies: 1 },
  // 台中大坑：群山環抱的山谷，遠方是台中市區的大樓
  ticc: { hills: 14, towers: [[250, 2500, 14, 60, 120]], egrets: 4, eagles: 3, magpies: 1 },
  // 台中太平頭汴坑：山區的球場，四周是層層的山
  hunghsi: { hills: 16, egrets: 3, eagles: 3, magpies: 1 },
  // 彰化大村：八卦山台地西側，往西看得到彰化平原與遠方的社區
  taifong: { hills: 8, towers: [[260, 3000, 10, 40, 80]], egrets: 6, eagles: 2 },
  // 南投鳳山：八卦山南側的丘陵，遠方是中央山脈
  nanfeng: { hills: 14, egrets: 4, eagles: 3, magpies: 1 },
  // 嘉義番路：阿里山腳下的湖泊與椰林
  palmlakes: { hills: 16, egrets: 6, eagles: 2 },
  // 台南：平地上的湖泊與水道，遠方是社區
  chianan: { hills: 3, towers: [[200, 2500, 10, 40, 80]], egrets: 8, eagles: 1 },
  // 台南大內：曾文溪畔的丘陵，四周是低矮的山林與果園，會館旁有度假住宿
  nanpao: { hills: 14, hotel: [80, 900], egrets: 5, eagles: 3, magpies: 1 },
  // 台南：平地上的老球場，椰林夾道，遠方是台南市區的社區大樓
  tainan: { hills: 2, towers: [[100, 2600, 14, 40, 90]], egrets: 8, eagles: 1 },
  // 高雄鳥松：澄清湖旁的丘陵林地，西南方看得到高雄市區的大樓與 85 大樓
  kaohsiung: { hills: 6, towers: [[225, 2600, 26, 60, 150], [230, 3200, 1, 330, 345]], egrets: 4, eagles: 2, magpies: 1 },
  // 高雄大樹：高屏溪西岸的丘陵，球道起伏大，四周是山林與鳳梨田
  hsinyi: { hills: 14, egrets: 4, eagles: 3, magpies: 1 },
  // 新竹新豐：靠海的平緩台地，北邊是工業區與社區大樓，遠方海岸有風力發電機
  hsinchu: { hills: 4, towers: [[10, 1200, 10, 30, 70]], turbines: [290, 2600, 6], egrets: 6, eagles: 1 },
  // 美國密蘇里州 Ozark 山區：俯瞰 Table Rock 湖，四周是長滿橡樹的山丘與灰白色的石灰岩峭壁，天上有白頭海鵰盤旋
  cliffhangers: { sea: [20, 650], hills: 14, bluffs: 9, eagles: 2 },
};
// 國外真實球場（OSM 圖資）：建築外觀（牆 / 屋頂顏色）、有名建築的實際高度與顏色、遠方的山與島
//   mounts：[方位, 實際距離(公尺), 實際高度, 山腳半徑, 山頂積雪比例]，依實際的視角縮小放到遠景
const OSM_SCENE = {
  // 聖安德魯斯：灰色砂岩牆、深灰石板屋頂；18 洞後方的 R&A 會館、紅砂岩的 Hamilton Grand、17 洞旁的 Old Course Hotel
  standrews: { wall: [0xc9b48f, 0xbca988, 0xd2bf9c, 0xb09a78], roof: 0x464a52, pitch: 1, named: { 'The Royal and Ancient Golf Club of St Andrews': { h: 15, wall: 0xb8ad97 }, 'Hamilton Grand': { h: 25, wall: 0xa0563e },
    'Old Course Hotel': { h: 22, wall: 0xd8cfbd }, 'Marine & Lawn Rusacks': { h: 17 } }, mounts: [[330, 9000, 160, 4000, 0], [20, 14000, 120, 5000, 0]] },
  // 圓石灘：白、米色的木造房子；對岸是 Carmel Highlands 與 Point Lobos 的山
  pebble: { wall: [0xeee6d4, 0xdccfb4, 0xd2d6d0, 0xc9b79a], roof: 0x5f5a54, pitch: 1, named: { 'The Lodge at Pebble Beach': { h: 12, wall: 0xf0ebe0 } }, mounts: [[160, 6500, 260, 3200, 0], [185, 9000, 420, 4200, 0], [140, 12000, 520, 5000, 0]] },
  // 川奈：遠方西北的富士山（約 59 公里、3,776 公尺）、東南的伊豆大島、東北的初島；川奈飯店是紅瓦白牆
  //   川奈飯店在 OSM 沒有名字：用位置（球場座標）認出來
  kawana: { wall: [0xece6da, 0xd8d4cc, 0xc9c2b6], roof: 0x4c4e55, pitch: 1, named: {}, at: [[-274, -975, { h: 20, wall: 0xf1eadb, roof: 0xb4553a }]],
    //   伊豆的山：西北約 10 公里的巣雲山一帶（約 580 公尺）、西南 4.5 公里的大室山（580 公尺的圓錐火山）
    mounts: [[321, 59000, 3776, 22000, 0.18], [137, 34000, 758, 7000, 0], [17, 10500, 50, 1200, 0], [298, 12000, 520, 3200, 0], [262, 8000, 480, 3600, 0], [236, 4500, 580, 650, 0]] },
  // 曼吉勞：白色水泥建築；四周是太平洋
  mangilao: { wall: [0xeeeeea, 0xdedad0], roof: 0x9a9a96, named: {}, mounts: [] },
};
const SURF_ROUGH = 4;      // physics.js 的 SURF.ROUGH
const hashStrR = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const lerpR = (a, b, t) => a + (b - a) * t;

const THEMES = {
  jungle: { fog: 0xa6cdb8, fogNear: 240, fogFar: 2600, sun: 0xfff1cc, sunI: 2.7, hemi: [0xd9f6e2, 0x2c5a28, 0.5], exposure: 1.0, rock: 0.5, rockTint: [0.78, 0.86, 0.72], skirt: [0.15, 0.34, 0.13], water: 0x1f9a8a },
  lava: { fog: 0x55291f, fogNear: 180, fogFar: 2300, sun: 0xffb27a, sunI: 2.3, hemi: [0xffa070, 0x2a120e, 0.55], exposure: 1.05, rock: 0.9, rockTint: [0.5, 0.46, 0.48], skirt: [0.11, 0.09, 0.09] },
  mushroom: { fog: 0x241e4a, fogNear: 140, fogFar: 1900, sun: 0xb4c4ff, sunI: 1.25, hemi: [0x8c7cff, 0x162a40, 0.8], exposure: 1.18, rock: 0.6, rockTint: [0.5, 0.5, 0.72], skirt: [0.09, 0.11, 0.2], water: 0x1b8fa6 },
  frost: { fog: 0x93a9c8, fogNear: 260, fogFar: 2700, sun: 0xdde8ff, sunI: 1.9, hemi: [0xbcd6ff, 0x7c8ca6, 0.75], exposure: 1.0, rock: 0.85, rockTint: [0.78, 0.88, 1.0], skirt: [0.86, 0.89, 0.95], water: 0x24486e },
  // 寫實主題（sky: 'hdr' = 用原本的真實天空）
  tropical: { sky: 'hdr', fog: 0xc4e6ee, fogNear: 420, fogFar: 3400, sun: 0xfff4dc, sunI: 3.0, hemi: [0xd8f0ff, 0x6a8a4a, 0.42], exposure: 1.0, rock: 0.35, rockTint: [1.0, 0.92, 0.8], skirt: [0.3, 0.5, 0.24], water: 0x1fb4c2, rockCol: 0x8a8070 },
  cliffs: { fog: 0xaeb8c0, fogNear: 260, fogFar: 2600, sun: 0xf2eee6, sunI: 2.2, hemi: [0xc8d2dc, 0x55603e, 0.5], exposure: 0.98, rock: 1.0, rockTint: [0.78, 0.76, 0.72], skirt: [0.4, 0.44, 0.28], water: 0x1c3f4a, rockCol: 0x6e6a64 },
  alpine: { sky: 'hdr', fog: 0xc6d6e6, fogNear: 420, fogFar: 3600, sun: 0xfff2e0, sunI: 2.9, hemi: [0xd0e4ff, 0x4a5a32, 0.4], exposure: 0.97, rock: 0.75, rockTint: [0.85, 0.85, 0.85], skirt: [0.2, 0.32, 0.15], water: 0x2a6070, rockCol: 0x7a7a76 },
  sakura: { fog: 0xead8d8, fogNear: 300, fogFar: 2800, sun: 0xfff0e4, sunI: 2.6, hemi: [0xffe6ee, 0x52603a, 0.45], exposure: 1.0, rock: 0.35, rockTint: [0.9, 0.86, 0.82], skirt: [0.22, 0.34, 0.17], water: 0x2e6a5e, rockCol: 0x8a8680 },
  dunes: { fog: 0xead6ae, fogNear: 360, fogFar: 3000, sun: 0xfff0d0, sunI: 3.1, hemi: [0xf6e6c8, 0x9a7a4a, 0.45], exposure: 0.95, rock: 0.6, rockTint: [1.1, 0.88, 0.66], skirt: [0.86, 0.68, 0.42], water: 0x1f8ea6, rockCol: 0xb08a5e },
  salt: { sky: 'hdr', fog: 0xdfe6ec, fogNear: 700, fogFar: 4200, sun: 0xffffff, sunI: 3.0, hemi: [0xe8f0ff, 0xd8d4c8, 0.5], exposure: 0.92, rock: 0.6, rockTint: [0.9, 0.82, 0.86], skirt: [0.9, 0.9, 0.87], water: 0x3cc2bc, rockCol: 0x9a8a88 },
  // 挑戰模式專用（voidLike = 島外是虛空；under = 島下岩座顏色）
  candy: { fog: 0xffd8ec, fogNear: 380, fogFar: 3000, sun: 0xfff4f0, sunI: 2.8, hemi: [0xffe8f4, 0xc8f0dc, 0.6], exposure: 1.0, rock: 0.3, rockTint: [1.1, 0.9, 1.0], skirt: [0.92, 0.7, 0.8], water: 0x6e3e22, rockCol: 0xf0b8d0 },
  city: { fog: 0x1a2240, fogNear: 300, fogFar: 2600, sun: 0xc8d4ff, sunI: 1.4, hemi: [0x7a8cc8, 0x202838, 0.75], exposure: 1.15, rock: 1, rockTint: [0.55, 0.56, 0.62], skirt: null, water: 0x2a7ab0, rockCol: 0x6a6c74, voidLike: true, under: [0.36, 0.37, 0.42] },
  sky: { fog: 0x9cc2ea, fogNear: 900, fogFar: 5200, sun: 0xfff6e8, sunI: 3.0, hemi: [0xe0f0ff, 0xf0f0f0, 0.6], exposure: 0.98, rock: 0.9, rockTint: [0.9, 0.82, 0.7], skirt: null, water: 0x4ab4e8, rockCol: 0xc8c0b0, voidLike: true, under: [0.5, 0.42, 0.32] },
  moon: { fog: 0x0a0a12, fogNear: 900, fogFar: 4200, sun: 0xffffff, sunI: 3.2, hemi: [0x8890a8, 0x202024, 0.35], exposure: 1.0, rock: 0.9, rockTint: [0.7, 0.7, 0.74], skirt: [0.42, 0.42, 0.45], water: 0x1a1a2a, rockCol: 0x7a7a80 },
  mars: { fog: 0xd8956a, fogNear: 300, fogFar: 2600, sun: 0xfff0e0, sunI: 2.6, hemi: [0xf0b890, 0x6a2a18, 0.5], exposure: 1.0, rock: 1, rockTint: [1.1, 0.62, 0.45], skirt: [0.66, 0.32, 0.2], water: 0x5a3020, rockCol: 0x9a4a30 },
  reef: { fog: 0x0e5a7a, fogNear: 60, fogFar: 900, sun: 0xc8f0ff, sunI: 2.2, hemi: [0x8ae0ff, 0x1a3a40, 0.8], exposure: 1.05, rock: 0.6, rockTint: [0.7, 0.85, 0.9], skirt: [0.72, 0.68, 0.52], water: 0x0a2a50, rockCol: 0x8a9aa0 },
  autumn: { sky: 'hdr', fog: 0xe8d8b8, fogNear: 360, fogFar: 3200, sun: 0xffe0b0, sunI: 2.8, hemi: [0xffe8c8, 0x5a4a2a, 0.45], exposure: 0.98, rock: 0.6, rockTint: [0.9, 0.82, 0.72], skirt: [0.42, 0.3, 0.14], water: 0x2e5a6e, rockCol: 0x8a7a68 },
  lavender: { fog: 0xf0d0c8, fogNear: 400, fogFar: 3200, sun: 0xffd8b0, sunI: 2.7, hemi: [0xffe0d8, 0x5a5a3a, 0.45], exposure: 1.0, rock: 0.4, rockTint: [1.0, 0.9, 0.8], skirt: [0.42, 0.36, 0.52], water: 0x3a6e8a, rockCol: 0xb0a090 },
  tulip: { sky: 'hdr', fog: 0xd0e0f0, fogNear: 500, fogFar: 3600, sun: 0xfff6e8, sunI: 3.0, hemi: [0xe0eeff, 0x5a7a3a, 0.42], exposure: 0.97, rock: 0.3, rockTint: [1, 0.95, 0.9], skirt: [0.4, 0.58, 0.28], water: 0x3a6e9a, rockCol: 0x9a948a },
  egypt: { fog: 0xf0dcb0, fogNear: 700, fogFar: 4600, sun: 0xfff0d0, sunI: 3.1, hemi: [0xf8e8c8, 0xa8844a, 0.45], exposure: 0.95, rock: 0.7, rockTint: [1.1, 0.9, 0.66], skirt: [0.86, 0.72, 0.46], water: 0x1f7a90, rockCol: 0xc8a870 },
  swamp: { fog: 0x7a8a70, fogNear: 60, fogFar: 1100, sun: 0xd8e0c8, sunI: 1.6, hemi: [0xa8b898, 0x2a3020, 0.7], exposure: 1.05, rock: 0.5, rockTint: [0.7, 0.75, 0.6], skirt: [0.22, 0.28, 0.16], water: 0x243a38, rockCol: 0x5a6050 },
  dino: { fog: 0xe0c898, fogNear: 300, fogFar: 2800, sun: 0xffe4b8, sunI: 2.7, hemi: [0xf0e0c0, 0x4a5a2a, 0.5], exposure: 0.98, rock: 0.7, rockTint: [0.9, 0.8, 0.66], skirt: [0.3, 0.38, 0.16], water: 0x3a7a70, rockCol: 0x7a6a54 },
  neon: { fog: 0x2a0e44, fogNear: 300, fogFar: 2400, sun: 0xff8ad8, sunI: 1.2, hemi: [0xb86aff, 0x0a0420, 0.9], exposure: 1.2, rock: 0.4, rockTint: [0.6, 0.4, 0.8], skirt: [0.06, 0.04, 0.12], water: 0x00c8ff, rockCol: 0x3a2a5a },
  crystal: { fog: 0x1a1030, fogNear: 120, fogFar: 1500, sun: 0xd8c8ff, sunI: 1.5, hemi: [0xa890ff, 0x1a1030, 0.85], exposure: 1.15, rock: 1, rockTint: [0.5, 0.42, 0.7], skirt: [0.16, 0.12, 0.26], water: 0x7a3ae0, rockCol: 0x4a3a6a },
  // 奇幻球場第二批
  honey: { fog: 0xf2dca0, fogNear: 380, fogFar: 3000, sun: 0xffe2a0, sunI: 2.9, hemi: [0xfff0c8, 0x7a6a2a, 0.5], exposure: 1.0, rock: 0.35, rockTint: [1.05, 0.9, 0.7], skirt: [0.5, 0.5, 0.2], water: 0x3aa0a8, rockCol: 0xb89a60 },
  clock: { fog: 0x8a7a68, fogNear: 220, fogFar: 2200, sun: 0xffc890, sunI: 2.2, hemi: [0xe0c8a8, 0x3a2e24, 0.55], exposure: 1.02, rock: 0.8, rockTint: [0.75, 0.62, 0.5], skirt: [0.3, 0.24, 0.18], water: 0x2a5a58, rockCol: 0x6a5a4a },
  haunt: { fog: 0x2a2a44, fogNear: 90, fogFar: 1300, sun: 0xb8c4ff, sunI: 1.3, hemi: [0x8a8ac8, 0x22222e, 0.95], exposure: 1.3, rock: 0.7, rockTint: [0.55, 0.55, 0.65], skirt: [0.12, 0.13, 0.16], water: 0x2a6a4a, rockCol: 0x4a4a5a },
  toy: { fog: 0xcfe8ff, fogNear: 500, fogFar: 3600, sun: 0xffffff, sunI: 3.0, hemi: [0xeaf4ff, 0x7aa8e0, 0.55], exposure: 0.98, rock: 0.3, rockTint: [1, 1, 1], skirt: [0.4, 0.62, 0.9], water: 0x3a96f0, rockCol: 0xe86a4a },
  storm: { fog: 0x4a525c, fogNear: 160, fogFar: 1900, sun: 0xc8d4e8, sunI: 1.5, hemi: [0x9aa8bc, 0x2a2e34, 0.7], exposure: 1.08, rock: 1, rockTint: [0.6, 0.62, 0.66], skirt: [0.3, 0.33, 0.32], water: 0x3a5068, rockCol: 0x5a5e66 },
  void: { fog: 0x2c1c50, fogNear: 320, fogFar: 2600, sun: 0xeee8ff, sunI: 2.6, hemi: [0xbfb0ff, 0x352258, 0.65], exposure: 1.05, rock: 1, rockTint: [0.6, 0.56, 0.82], skirt: null },
};

export class World {
  constructor(canvas, quality = 'high') {
    this.canvas = canvas;
    this.q = QUALITY[quality] || QUALITY.high;
    this.holeGroup = null;
    this.time = 0;
  }

  async init(onProgress = () => {}) {
    const r = this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.q.ratio));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.95;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.05, 6000);
    this.resize();
    window.addEventListener('resize', () => this.resize());

    const sun = this.sun = new THREE.DirectionalLight(0xfff0d8, 2.8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(this.q.shadow, this.q.shadow);
    const sc = sun.shadow.camera;
    sc.left = sc.bottom = -45; sc.right = sc.top = 45; sc.near = 1; sc.far = 400;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.04;
    this.sunDir = new THREE.Vector3(-0.45, 0.78, 0.35).normalize();
    this.scene.add(sun, sun.target);
    this.hemi = new THREE.HemisphereLight(0xcfe3ff, 0x4a5a32, 0.35);
    this.scene.add(this.hemi);

    const tl = new THREE.TextureLoader();
    const load = (url, srgb) => new Promise(res => tl.load(url, t => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = r.capabilities.getMaxAnisotropy();
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      onProgress();
      res(t);
    }, undefined, () => { onProgress(); res(null); }));
    const [hdr, grassD, grassN, sandD, sandN, rockD, rockN] = await Promise.all([
      new Promise(res => new RGBELoader().load('assets/textures/sky.hdr', t => { onProgress(); res(t); }, undefined, () => { onProgress(); res(null); })),
      load('assets/textures/grass_d.jpg', true), load('assets/textures/grass_n.jpg'),
      load('assets/textures/sand_d.jpg', true), load('assets/textures/sand_n.jpg'),
      load('assets/textures/rock_d.jpg', true), load('assets/textures/rock_n.jpg'),
    ]);
    this.tex = { grassD, grassN, sandD, sandN, rockD, rockN };
    if (hdr) {
      hdr.mapping = THREE.EquirectangularReflectionMapping;
      this.scene.background = hdr;
      const pm = new THREE.PMREMGenerator(r);
      this.scene.environment = pm.fromEquirectangular(hdr).texture;
      pm.dispose();
    } else {
      this.scene.background = new THREE.Color(0xbcd2df);
    }
    this.skyDefault = { bg: this.scene.background, env: this.scene.environment };
    this.skies = {};
    this.grassAvg = avgLum(grassD) || 0.3;
    this.sandAvg = avgLum(sandD) || 0.5;
    this.waterNormal = makeWaterNormal();

    this.buildBall();
    this.buildMarkers();
    this.buildTracer();
    return this;
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    // 視窗被隱藏/切到背景時大小可能是 0，這時不更新（否則比例變成 NaN，鏡頭會壞掉）
    if (w < 2 || h < 2) return;
    this._w = w; this._h = h;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.camera.aspect = aspect;
    // 橫向寬螢幕時限制水平視角約 72°，避免畫面邊緣的人物和樹被拉寬變胖
    this.camera.fov = aspect < 1 ? 62 : Math.min(50, 2 * Math.atan(Math.tan(36 * Math.PI / 180) / aspect) * 180 / Math.PI);
    this.camera.updateProjectionMatrix();
  }

  // ---------- 地形材質：顏色圖 × 照片細節（近距離）+ 陡坡岩石 ----------
  terrainMaterial(colorTex, maskTex, style, vertexColors, theme = null) {
    const th = THEMES[theme];
    const m = new THREE.MeshStandardMaterial({
      map: colorTex || null, vertexColors: !!vertexColors, roughness: 0.93, metalness: 0,
      normalMap: this.tex.grassN, normalScale: new THREE.Vector2(0.55, 0.55), envMapIntensity: 0.55,
    });
    if (colorTex) colorTex.channel = 1;
    const tex = this.tex;
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, {
        tGrassD: { value: tex.grassD }, tSandD: { value: tex.sandD }, tRock: { value: tex.rockD },
        tMask: { value: maskTex || tex.grassD }, uHasMask: { value: maskTex ? 1 : 0 },
        uGAvg: { value: this.grassAvg }, uSAvg: { value: this.sandAvg },
        uRock: { value: th ? th.rock : style === 'canyon' ? 1 : style === 'links' ? 0.15 : 0.35 },
        uSandAll: { value: !maskTex && style === 'canyon' ? 1 : 0 },
        uRockTint: { value: new THREE.Vector3(...(th ? th.rockTint : [1.08, 0.82, 0.72])) },
        // 浮島：島面以下的岩壁越往下越融入星雲色，看起來像懸在空中
        uVoid: { value: theme === 'void' || (th && th.voidLike) ? 1 : 0 }, uVoidY: { value: this.voidY || 0 }, uVoidCol: { value: new THREE.Color(th ? th.fog : 0) },
      });
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWPos; varying vec3 vWN; varying vec2 vMaskUv;')
        .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
          vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);
          #ifdef USE_MAP
            vMaskUv = vMapUv;
          #else
            vMaskUv = vec2(0.0);
          #endif`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec3 vWPos; varying vec3 vWN; varying vec2 vMaskUv;
          uniform sampler2D tGrassD; uniform sampler2D tSandD; uniform sampler2D tRock; uniform sampler2D tMask;
          uniform float uHasMask; uniform float uGAvg; uniform float uSAvg; uniform float uRock; uniform float uSandAll;
          uniform vec3 uRockTint; uniform float uVoid; uniform float uVoidY; uniform vec3 uVoidCol;
          float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }`)
        .replace('#include <map_fragment>', `#include <map_fragment>
          vec4 mk = uHasMask > 0.5 ? texture2D(tMask, vMaskUv) : vec4(uSandAll, 0.0, 0.0, 1.0);
          float dist = length(vWPos - cameraPosition);
          float fade = smoothstep(260.0, 12.0, dist);
          float g1 = lum(texture2D(tGrassD, vWPos.xz / 3.4).rgb) / uGAvg;
          float g2 = lum(texture2D(tGrassD, vWPos.xz / 29.0 + 0.37).rgb) / uGAvg;
          float s1 = lum(texture2D(tSandD, vWPos.xz / 2.6).rgb) / uSAvg;
          float det = mix(g1, s1, mk.r);
          float k = mix(1.0, det, mix(0.6, 0.22, mk.g) * fade) * mix(1.0, g2, 0.22 * (1.0 - mk.r));
          diffuseColor.rgb *= clamp(k, 0.55, 1.5);
          vec3 an = abs(vWN);
          vec3 rk = texture2D(tRock, vWPos.zy / 7.0).rgb * an.x + texture2D(tRock, vWPos.xy / 7.0).rgb * an.z + texture2D(tRock, vWPos.xz / 7.0).rgb * an.y;
          rk /= (an.x + an.y + an.z);
          float steep = smoothstep(0.42, 0.62, 1.0 - vWN.y) * uRock;
          diffuseColor.rgb = mix(diffuseColor.rgb, rk * uRockTint, steep);`)
        .replace('#include <fog_fragment>', `float vk = uVoid * smoothstep(uVoidY - 1.0, uVoidY - 12.0, vWPos.y);
          // 島邊岩壁約 10 公尺內逐漸淡出（抖動透空），下面接倒錐形的岩石底座
          if (vk > 0.0 && vk > fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))))) discard;
          gl_FragColor.rgb = mix(gl_FragColor.rgb, uVoidCol, vk * 0.7);
          #include <fog_fragment>`);
    };
    return m;
  }

  disposeHole() {
    if (!this.holeGroup) return;
    this.scene.remove(this.holeGroup);
    this.holeGroup.traverse(o => {
      // 樹的形狀是所有洞共用的，不釋放（否則每洞都要重新上傳到顯示卡）
      if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach(mt => { if (mt.map && mt.map.isCanvasTexture) mt.map.dispose(); mt.dispose(); });
      }
    });
    // 地形的顏色圖 / 材質遮罩（遮罩不在 material.map 上，要另外釋放，否則每換一洞就漏掉幾 MB 顯示記憶體）
    (this.holeTextures || []).forEach(t => t.dispose());
    this.holeTextures = [];
    this.waterMats = [];
    this.holeGroup = null;
  }

  async loadHole(hole) {
    this.disposeHole();
    this.hole = hole;
    const g = this.holeGroup = new THREE.Group();
    this.scene.add(g);
    const style = hole.course.style, theme = hole.course.theme || null, th = THEMES[theme];
    const fogCol = th ? th.fog : style === 'canyon' ? 0xd9c3a8 : style === 'links' ? 0xc8d6dc : 0xc6d4d6;
    this.scene.fog = new THREE.Fog(fogCol, th ? th.fogNear : 380, th ? th.fogFar : 3200);
    this.applyTheme(theme);
    // 浮島：島面大約的高度（岩壁從這裡往下漸隱）
    this.voidY = theme === 'void' || (th && th.voidLike) ? Math.min(hole.heightUV(hole.tees[0].u, hole.tees[0].v), hole.heightUV(hole.green.u, hole.green.v)) - 4 : 0;

    // 顏色圖
    const maps = paintMaps(hole);
    const colorTex = new THREE.CanvasTexture(maps.color);
    colorTex.colorSpace = THREE.SRGBColorSpace;
    colorTex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const maskTex = new THREE.CanvasTexture(maps.mask);
    this.holeTextures = [colorTex, maskTex];
    this.colorCanvas = maps.color;
    this.miniCanvas = maps.mini;          // 小地圖用（水是水藍色）

    // 精細地形網格
    const b = hole.bbox, step = this.q.grid;
    const nx = Math.ceil((b.maxU - b.minU) / step) + 1, nz = Math.ceil((b.maxV - b.minV) / step) + 1;
    const pos = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2), uv1 = new Float32Array(nx * nz * 2);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const u = Math.min(b.minU + i * step, b.maxU), v = Math.min(b.minV + j * step, b.maxV);
      const k = j * nx + i;
      pos[k * 3] = u; pos[k * 3 + 1] = (hole.heightVisUV || hole.heightUV)(u, v); pos[k * 3 + 2] = -v;
      uv[k * 2] = u / 4; uv[k * 2 + 1] = v / 4;
      uv1[k * 2] = (u - b.minU) / (b.maxU - b.minU); uv1[k * 2 + 1] = (v - b.minV) / (b.maxV - b.minV);
    }
    const idx = new Uint32Array((nx - 1) * (nz - 1) * 6);
    let p = 0;
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i, c = a + nx;
      idx[p++] = a; idx[p++] = a + 1; idx[p++] = c; idx[p++] = a + 1; idx[p++] = c + 1; idx[p++] = c;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    this.tgrid = { minU: b.minU, minV: b.minV, step, nx, nz, pos };
    const terrain = new THREE.Mesh(geo, this.terrainMaterial(colorTex, maskTex, style, false, theme));
    terrain.receiveShadow = true;
    g.add(terrain);
    this.terrainMesh = terrain;
    await frame();

    // 外圍大地形（同一個高度函數，地圖範圍內往下壓避免重疊）
    if (!th || th.skirt) g.add(this.buildSkirt(hole, style, theme));
    if (hole.seaSide || style === 'links' || hole.mapSea) g.add(this.buildSea(hole));
    this.buildWaters(hole, g);
    if (hole.islandUV) g.add(this.buildUnderside(hole));
    if (hole.moat) {
      // 果嶺孤島：果嶺下方一整片水 / 熔岩（果嶺和果嶺邊比較高，會把中間蓋住）
      const geo = new THREE.CircleGeometry(hole.moat.r, 64); geo.rotateX(-Math.PI / 2); worldUv(geo);
      const mat = this.hazardMaterial(); this.waterMats.push(mat);
      const m = new THREE.Mesh(geo, mat); m.position.set(hole.moat.u, hole.moat.level + 0.05, -hole.moat.v); m.receiveShadow = true; g.add(m);
    }
    this.buildSpecials(hole, g);
    this.buildSkyFx(hole, g);
    await frame();
    this.buildTrees(hole, g);
    this.buildLandmarks(hole, g);
    this.buildFalls(hole, g);
    this.buildOsmScene(hole, g);
    await frame();
    this.buildTeeMarkers(hole, g);
    this.buildFlag(hole, g);
    this.buildGreenGrid(hole, g);
  }

  // 主題的天空、環境光、太陽；沒有主題就換回原本的 HDR 天空
  applyTheme(theme) {
    const th = THEMES[theme];
    if (this.curTheme === theme) return;
    this.curTheme = theme;
    if (!th) {
      this.scene.background = this.skyDefault.bg; this.scene.environment = this.skyDefault.env;
      this.sun.color.set(0xfff0d8); this.sun.intensity = 2.8;
      this.hemi.color.set(0xcfe3ff); this.hemi.groundColor.set(0x4a5a32); this.hemi.intensity = 0.35;
      this.renderer.toneMappingExposure = 0.95;
      return;
    }
    if (th.sky === 'hdr') this.skies[theme] = this.skyDefault;
    if (!this.skies[theme]) {
      const tex = new THREE.CanvasTexture(paintSky(theme));
      tex.mapping = THREE.EquirectangularReflectionMapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      const pm = new THREE.PMREMGenerator(this.renderer);
      this.skies[theme] = { bg: tex, env: pm.fromEquirectangular(tex).texture };
      pm.dispose();
    }
    this.scene.background = this.skies[theme].bg; this.scene.environment = this.skies[theme].env;
    this.sun.color.set(th.sun); this.sun.intensity = th.sunI;
    this.hemi.color.set(th.hemi[0]); this.hemi.groundColor.set(th.hemi[1]); this.hemi.intensity = th.hemi[2];
    this.renderer.toneMappingExposure = th.exposure;
  }

  buildSkirt(hole, style, theme = null) {
    const b = hole.bbox;
    const cu = (b.minU + b.maxU) / 2, cv = (b.minV + b.maxV) / 2;
    const size = 4200, n = Math.round(150 * (0.6 + 0.4 * this.q.far)) + 40;
    const geo = new THREE.PlaneGeometry(size, size, n, n);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const nz = makeNoise(77 + hole.holeIdx);
    const lmSea = (LANDMARKS[hole.course.baseId || hole.course.id] || {}).sea;
    const seaDir = lmSea ? [Math.sin(lmSea[0] * Math.PI / 180), Math.cos(lmSea[0] * Math.PI / 180)] : null, seaD = lmSea ? lmSea[1] : 0;
    const base = THEMES[theme] ? THEMES[theme].skirt : style === 'canyon' ? [0.70, 0.42, 0.27] : style === 'links' ? [0.55, 0.53, 0.33] : [0.24, 0.36, 0.16];
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i) + cu, v = -pos.getZ(i) + cv;
      const inside = Math.min(u - b.minU, b.maxU - u, v - b.minV, b.maxV - v);
      let hh = hole.heightUV(u, v);
      const far = Math.hypot(u - cu, v - cv);
      if (theme === 'crystal') hh += 150 * (0.4 + nz.fbm(u / 200, v / 200, 3)) * clamp((far - 300) / 300, 0, 1);
      else if (theme === 'mars') hh += 80 * Math.max(0, nz.fbm(u / 260, v / 260, 3) + 0.1) * clamp((far - 450) / 500, 0, 1);
      else if (theme === 'autumn' || theme === 'dino') hh += 110 * (0.4 + nz.fbm(u / 420, v / 420, 3)) * clamp((far - 450) / 700, 0, 1);
      else if (theme === 'reef' || theme === 'egypt') hh += (14 * Math.abs(Math.sin(u / 80 + nz(u / 300, v / 300) * 3)) + 16 * Math.max(0, nz.fbm(u / 250, v / 250, 3))) * clamp((far - 350) / 400, 0, 1);
      else if (theme === 'dunes') hh += (18 * Math.abs(Math.sin(u / 90 + nz(u / 400, v / 400) * 3)) + 30 * Math.max(0, nz.fbm(u / 300, v / 300, 3))) * clamp((far - 350) / 400, 0, 1);
      else if (theme === 'alpine') hh += 140 * (0.4 + nz.fbm(u / 420, v / 420, 3)) * clamp((far - 450) / 700, 0, 1);
      else if (theme === 'salt' || theme === 'toy' || theme === 'clock') hh += 0;
      else if (theme === 'storm') hh += 130 * (0.4 + nz.fbm(u / 380, v / 380, 3)) * clamp((far - 420) / 650, 0, 1);
      else if (theme === 'haunt' || theme === 'honey') hh += 40 * (0.5 + nz.fbm(u / 300, v / 300, 3)) * clamp((far - 380) / 500, 0, 1);
      else if (theme === 'lava') hh += 70 * Math.max(0, nz.fbm(u / 260, v / 260, 3) + 0.1) * clamp((far - 450) / 500, 0, 1);
      else if (style === 'canyon') hh += 45 * Math.max(0, nz.fbm(u / 300, v / 300, 3) + 0.05) * clamp((far - 500) / 500, 0, 1);
      else if (style === 'parkland') hh += 30 * (0.5 + nz.fbm(u / 500, v / 500, 3)) * clamp((far - 450) / 700, 0, 1);
      else hh += 6 * nz.fbm(u / 120, v / 120, 2) * clamp((far - 400) / 400, 0, 1);
      // 球場範圍內這層粗網格要藏在真正的地面下面：起伏大的真實地形，粗網格在凹處會比細地形高，浮出一塊一塊的平台（球像埋在裡面）
      if (inside > 0) hh -= 0.6 * clamp(inside / 6, 0, 1) + 150 * clamp((inside - 6) / 14, 0, 1);
      // 靠海的真實球場：海那一側的地面往下降成海岸，讓遠方的海露出來
      if (seaDir) { const along = (u - cu) * seaDir[0] + (v - cv) * seaDir[1]; const k = clamp((along - (seaD - 250)) / 250, 0, 1); hh = hh * (1 - k) + (-14) * k; }
      pos.setXYZ(i, u, hh, -v);
      const f = 0.85 + 0.25 * nz(u / 40, v / 40);
      col[i * 3] = base[0] * f; col[i * 3 + 1] = base[1] * f; col[i * 3 + 2] = base[2] * f;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 4, -pos.getZ(i) / 4);
    geo.computeVertexNormals();
    const mat = this.terrainMaterial(null, null, style, true, theme);
    mat.polygonOffset = true; mat.polygonOffsetFactor = 2; mat.polygonOffsetUnits = 2;
    const m = new THREE.Mesh(geo, mat);
    m.receiveShadow = true;
    return m;
  }

  // 浮島的岩石底座：島越寬的地方越深，往中間收成倒錐形（從下面或側面看像懸在空中）
  buildUnderside(hole) {
    const b = hole.bbox, step = 2.5, nz = makeNoise(13 + hole.holeIdx);
    const nx = Math.ceil((b.maxU - b.minU) / step) + 1, nzc = Math.ceil((b.maxV - b.minV) / step) + 1;
    const F = new Float32Array(nx * nzc), pos = new Float32Array(nx * nzc * 3), col = new Float32Array(nx * nzc * 3);
    for (let j = 0; j < nzc; j++) for (let i = 0; i < nx; i++) {
      const u = b.minU + i * step, v = b.minV + j * step, k = j * nx + i;
      const f = hole.islandUV(u, v); F[k] = f;
      const top = hole.heightUV(u, v) + (f < 0 ? 30 * Math.min(1, -f / 2.5) : 0);       // 島外的物理高度往下壓了 30 m，加回來
      const depth = 3 + 1.7 * Math.max(0, f) + 5 * Math.max(0, f) / (f + 8) * (1 + nz(u / 9, v / 9));
      pos[k * 3] = u; pos[k * 3 + 1] = top - depth; pos[k * 3 + 2] = -v;
      const t = clamp(depth / 40, 0, 1), n = 0.85 + 0.3 * Math.abs(nz(u / 4, v / 4));
      const uc = (THEMES[hole.course.theme] || {}).under || [0.46, 0.38, 0.6];
      col[k * 3] = (uc[0] - t * 0.28) * n; col[k * 3 + 1] = (uc[1] - t * 0.26) * n; col[k * 3 + 2] = (uc[2] - t * 0.3) * n;
    }
    const idx = [];
    for (let j = 0; j < nzc - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i, c = a + nx;
      if (Math.min(F[a], F[a + 1], F[c], F[c + 1]) < -1.5) continue;
      idx.push(a, c, a + 1, a + 1, c, c + 1);           // 面朝下
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true, side: THREE.DoubleSide }));
    return m;
  }

  // ---------- 奇幻機關的模型與動畫 ----------
  buildSpecials(hole, g) {
    this.specialAnims = [];
    this.specialPulses = {};
    this.ensureSpark();
    const glowBasic = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    this.orbMeshes = {};
    const th = hole.theme;      // 第三批奇幻球場：機關換成當地的顏色（海底氣泡環、金色聖甲蟲門、紫水晶壁、泥沼、月面信標、白色棉花雲）
    for (const sp of hole.specials || []) {
      if (sp.kind === 'orb') {
        // 金球：發光的金色球、外面一圈光暈，上下浮動、慢慢轉
        const grp = new THREE.Group();
        grp.position.set(sp.u, sp.y, -sp.v);
        const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 2), glowMaterial({ color: 0xffd04a, roughness: 0.25, metalness: 0.6, flatShading: true }, 0.7));
        const shell = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.07, 8, 40), glowBasic(0xffe08a, 0.8));
        grp.add(core, shell, glowSprite(this, new THREE.Vector3(0, 0, 0), 5.5, 0xffc84a, 0.55));
        g.add(grp);
        this.orbMeshes[sp.idx] = grp;
        const ph = sp.idx * 1.7;
        this.specialAnims.push(t => { if (!grp.visible) return; grp.position.y = sp.y + Math.sin(t * 1.6 + ph) * 0.35; core.rotation.y = t * 0.8; shell.rotation.x = t * 1.1 + ph; shell.rotation.y = t * 0.7; });
        continue;
      }
      if (sp.kind === 'ring' || sp.kind === 'portal') {
        const fire = sp.kind === 'ring';
        const ends = fire ? [[sp.u, sp.y, sp.v, sp.dir]] : [[sp.u, sp.y, sp.v, sp.dir], [sp.exit.u, sp.exit.y, sp.exit.v, sp.exit.dir]];
        ends.forEach(([u, y, v, dir], k) => {
          const grp = new THREE.Group();
          grp.position.set(u, y, -v);
          grp.lookAt(u + dir[0], y, -(v + dir[1]));
          const col = fire ? (th === 'reef' ? 0x9ae8ff : 0xd8ff6a) : th === 'egypt' ? (k === 0 ? 0xffd070 : 0xffa040) : k === 0 ? 0x7ad8ff : 0xd07aff;
          const torus = new THREE.Mesh(new THREE.TorusGeometry(sp.r, fire ? 0.12 : 0.32, 10, 64), glowBasic(col, fire ? 0.55 : 0.9));
          grp.add(torus);
          if (!fire) {
            // 星門中間旋轉的漩渦
            const disc = new THREE.Mesh(new THREE.CircleGeometry(sp.r * 0.96, 48), new THREE.MeshBasicMaterial({ map: swirlTexture(), color: col, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
            grp.add(disc);
            // 底座：兩根石柱
            for (const sd of [-1, 1]) {
              const col2 = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, y - hole.heightUV(u, v) + 1.5, 6), new THREE.MeshStandardMaterial({ color: th === 'egypt' ? 0xc8a060 : 0x5a4f80, roughness: 0.6, flatShading: true }));
              col2.position.set(sd * (sp.r + 0.5), -(y - hole.heightUV(u, v)) / 2 + 0.25, 0); grp.add(col2);
            }
            this.specialAnims.push(t => { disc.rotation.z = -t * (k ? -1.4 : 1.4); torus.material.opacity = 0.75 + 0.25 * Math.sin(t * 3 + k); });
          }
          // 繞著圓環飛的螢火蟲 / 光點
          const N = fire ? 70 : 40, pos = new Float32Array(N * 3), seeds = Array.from({ length: N }, () => [Math.random() * 6.28, 0.6 + Math.random() * 1.2, (Math.random() - 0.5) * 1.6, Math.random() * 6.28]);
          const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
          const pts = new THREE.Points(pg, new THREE.PointsMaterial({ map: this.sparkTex, color: fire ? (th === 'reef' ? 0xe0faff : 0xeaff8a) : col, size: fire ? 0.55 : 0.45, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
          pts.frustumCulled = false; grp.add(pts);
          this.specialAnims.push(t => {
            for (let i = 0; i < N; i++) { const [a0, sp0, off, ph] = seeds[i]; const a = a0 + t * sp0 * (fire ? 0.6 : 1.5); const rr = sp.r + off * (fire ? 1 : 0.4) + 0.3 * Math.sin(t * 2 + ph); pos[i * 3] = Math.cos(a) * rr; pos[i * 3 + 1] = Math.sin(a) * rr; pos[i * 3 + 2] = Math.sin(t * 1.3 + ph) * (fire ? 0.8 : 0.3); }
            pg.attributes.position.needsUpdate = true;
            const pu = this.specialPulses[sp.kind] || 0;
            pts.material.opacity = (fire ? 0.55 + 0.45 * Math.sin(t * 2.2) ** 2 : 0.9) + pu;
            torus.scale.setScalar(1 + pu * 0.25);
          });
          g.add(grp);
        });
        if (fire) g.add(glowSprite(this, new THREE.Vector3(sp.u, sp.y, -sp.v), sp.r * 3.2, th === 'reef' ? 0x7ad8ff : 0xb8ff5a, 0.25));
      } else if (sp.kind === 'vent') {
        // 噴發口：黑色小火山丘 + 發光的口 + 一直往上冒的火星與煙，每隔幾秒大噴發一次
        const gy = sp.y;
        const cone = new THREE.Mesh(new THREE.CylinderGeometry(sp.r * 0.55, sp.r * 1.5, 1.4, 12, 1, true), new THREE.MeshStandardMaterial({ color: 0x241c1c, roughness: 0.95, flatShading: true, side: THREE.DoubleSide }));
        cone.position.set(sp.u, gy + 0.3, -sp.v); g.add(cone);
        const mouth = new THREE.Mesh(new THREE.CircleGeometry(sp.r * 0.55, 20), new THREE.MeshBasicMaterial({ color: 0xff6a1a })); mouth.rotation.x = -Math.PI / 2; mouth.position.set(sp.u, gy + 0.9, -sp.v); g.add(mouth);
        const glow = glowSprite(this, new THREE.Vector3(sp.u, gy + 2, -sp.v), sp.r * 3, 0xff6a1a, 0.6); g.add(glow);
        const N = 80, pos = new Float32Array(N * 3), seeds = Array.from({ length: N }, () => [Math.random(), Math.random() * 6.28, Math.random()]);
        const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const pts = new THREE.Points(pg, new THREE.PointsMaterial({ map: this.sparkTex, color: 0xff8a3a, size: 0.7, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        pts.frustumCulled = false; g.add(pts);
        const ph0 = Math.random() * 5;
        this.specialAnims.push(t => {
          const cyc = (t + ph0) % 5, burst = cyc < 1.2 ? Math.sin(cyc / 1.2 * Math.PI) : 0;
          for (let i = 0; i < N; i++) {
            const [a, ang, sp2] = seeds[i]; const life = (t * (0.35 + sp2 * 0.3) + a) % 1;
            const hgt = life * (4 + burst * 22), rr = 0.4 + life * (1 + burst * 2.5);
            pos[i * 3] = sp.u + Math.cos(ang + t) * rr; pos[i * 3 + 1] = gy + 0.9 + hgt; pos[i * 3 + 2] = -sp.v + Math.sin(ang + t) * rr;
          }
          pg.attributes.position.needsUpdate = true;
          glow.material.opacity = 0.45 + burst * 0.5 + (this.specialPulses.vent || 0);
          mouth.material.color.setRGB(1, 0.35 + burst * 0.4, 0.08);
        });
      } else if (sp.kind === 'shroom') {
        // 彈跳巨菇：發光的菇傘、淡色菇柄、地上一圈光
        const hue = 0.78 + sp.tint * 0.3;
        const capCol = new THREE.Color().setHSL(hue % 1, 0.85, 0.6);
        const stemH = sp.top - sp.y;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(sp.r * 0.16, sp.r * 0.22, stemH, 12), glowMaterial({ color: 0xe8e2f2, roughness: 0.7 }, 0.18));
        stem.position.set(sp.u, sp.y + stemH / 2, -sp.v); stem.castShadow = true; g.add(stem);
        const capGeo = new THREE.SphereGeometry(sp.r, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2); capGeo.scale(1, 0.42, 1);
        const capMat = glowMaterial({ color: capCol, roughness: 0.45 }, 0.55);
        const cap = new THREE.Mesh(capGeo, capMat); cap.position.set(sp.u, sp.top - 0.1, -sp.v); cap.castShadow = true; g.add(cap);
        const under = new THREE.Mesh(new THREE.CircleGeometry(sp.r * 0.98, 32), new THREE.MeshStandardMaterial({ color: capCol.clone().multiplyScalar(0.35), side: THREE.DoubleSide, roughness: 0.9 }));
        under.rotation.x = Math.PI / 2; under.position.set(sp.u, sp.top - 0.12, -sp.v); g.add(under);
        // 菇傘上的白色斑點
        for (let i = 0; i < 7; i++) {
          const a = i / 7 * 6.28 + sp.tint * 3, rr = sp.r * (0.25 + (i % 3) * 0.22), yy = Math.sqrt(Math.max(0, 1 - (rr / sp.r) ** 2)) * sp.r * 0.42;
          const dot = new THREE.Mesh(new THREE.SphereGeometry(sp.r * 0.09, 8, 6), glowMaterial({ color: 0xffffff, roughness: 0.6 }, 0.5));
          dot.scale.y = 0.4; dot.position.set(sp.u + Math.cos(a) * rr, sp.top - 0.1 + yy, -sp.v + Math.sin(a) * rr); g.add(dot);
        }
        const halo = glowSprite(this, new THREE.Vector3(sp.u, sp.y + 0.6, -sp.v), sp.r * 3, capCol.getHex(), 0.35); g.add(halo);
        const ph0 = Math.random() * 6;
        this.specialAnims.push(t => { const pu = this.specialPulses.shroom || 0; cap.scale.set(1 + pu * 0.15, 1 - pu * 0.3 + 0.03 * Math.sin(t * 1.6 + ph0), 1 + pu * 0.15); halo.material.opacity = 0.28 + 0.12 * Math.sin(t * 1.6 + ph0) + pu; });
      } else if (sp.kind === 'tramp' || sp.kind === 'boost' || sp.kind === 'cannon') {
        // 地面機關：彈跳床 = 會一縮一彈的彩色墊子；加速帶 = 會流動的箭頭；大砲 = 朝果嶺的砲管
        const gy = sp.y, grp = new THREE.Group();
        grp.position.set(sp.u, gy + 0.05, -sp.v);
        g.add(grp);
        if (sp.kind === 'tramp') {
          const rim = new THREE.Mesh(new THREE.TorusGeometry(sp.r, 0.22, 8, 32), new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.5 }));
          rim.rotation.x = -Math.PI / 2; rim.position.y = 0.35;
          const pad = new THREE.Mesh(new THREE.CircleGeometry(sp.r, 32), glowMaterial({ color: 0xff5ab0, roughness: 0.4, side: THREE.DoubleSide }, 0.45));
          pad.rotation.x = -Math.PI / 2; pad.position.y = 0.3;
          grp.add(rim, pad);
          for (let i = 0; i < 6; i++) { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.4, 6), rim.material); const a = i / 6 * Math.PI * 2; lg.position.set(Math.cos(a) * sp.r, 0.15, Math.sin(a) * sp.r); grp.add(lg); }
          this.specialAnims.push(t => { const pu = this.specialPulses.tramp || 0; pad.position.y = 0.3 - pu * 0.25 + 0.03 * Math.sin(t * 3); pad.material.color.setHSL((t * 0.05) % 1, 0.8, 0.6); });
        } else if (sp.kind === 'boost') {
          grp.rotation.y = Math.atan2(sp.dir[0], sp.dir[1]) + Math.PI;
          const arrows = [];
          for (let i = 0; i < 4; i++) {
            const sh = new THREE.Shape(); sh.moveTo(-1.4, 0); sh.lineTo(0, 1.1); sh.lineTo(1.4, 0); sh.lineTo(1.4, -0.5); sh.lineTo(0, 0.6); sh.lineTo(-1.4, -0.5);
            const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), glowBasic(0x4ae8ff, 0.9));
            m.rotation.x = -Math.PI / 2; m.position.set(0, 0.08, (i - 1.5) * 1.6); grp.add(m); arrows.push(m);
          }
          const base = new THREE.Mesh(new THREE.PlaneGeometry(sp.r * 0.9, sp.r * 1.6), new THREE.MeshStandardMaterial({ color: 0x14202a, roughness: 0.4, transparent: true, opacity: 0.85 }));
          base.rotation.x = -Math.PI / 2; base.position.y = 0.04; grp.add(base);
          this.specialAnims.push(t => arrows.forEach((m, i) => { m.material.opacity = 0.25 + 0.75 * Math.max(0, Math.sin(t * 6 - i * 1.2)) + (this.specialPulses.boost || 0); }));
        } else {
          const aim = Math.atan2(sp.target[0] - sp.u, sp.target[1] - sp.v);
          grp.rotation.y = -aim;
          const metal = new THREE.MeshStandardMaterial({ color: 0x3a3430, roughness: 0.4, metalness: 0.8 });
          const base = new THREE.Mesh(new THREE.CylinderGeometry(sp.r * 0.75, sp.r * 0.9, 0.8, 16), new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.8 }));
          base.position.y = 0.4;
          const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.0, 4.2, 18, 1, true), metal);
          barrel.rotation.x = Math.PI / 4; barrel.position.set(0, 2.0, -1.2);
          const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.72, 18), new THREE.MeshBasicMaterial({ color: 0x0a0806 }));
          mouth.position.set(0, 3.5, -2.7); mouth.rotation.x = -Math.PI / 4;
          const pad = new THREE.Mesh(new THREE.RingGeometry(sp.r * 0.9, sp.r, 32), glowBasic(0xffb04a, 0.8));
          pad.rotation.x = -Math.PI / 2; pad.position.y = 0.06;
          grp.add(base, barrel, mouth, pad);
          this.specialAnims.push(t => { pad.material.opacity = 0.5 + 0.4 * Math.sin(t * 3) + (this.specialPulses.cannon || 0); barrel.position.z = -1.2 + (this.specialPulses.cannon || 0) * 0.8; });
        }
      } else if (sp.kind === 'honey') {
        // 蜂蜜池：六角形、亮晶晶的金色蜂蜜，外圈蜂巢色的邊
        const grp = new THREE.Group(); grp.position.set(sp.u, sp.y + 0.08, -sp.v); g.add(grp);
        const mud = th === 'swamp';
        const mat = mud ? new THREE.MeshStandardMaterial({ color: 0x3e3418, roughness: 0.35, metalness: 0.1 }) : glowMaterial({ color: 0xd87800, roughness: 0.06, metalness: 0.2 }, 0.22);
        const disc = new THREE.Mesh(new THREE.CircleGeometry(sp.r, mud ? 20 : 6), mat); disc.rotation.x = -Math.PI / 2; disc.receiveShadow = true;
        const rim = new THREE.Mesh(new THREE.RingGeometry(sp.r, sp.r + 0.45, mud ? 20 : 6), new THREE.MeshStandardMaterial({ color: mud ? 0x2a2a12 : 0x8a4a06, roughness: 0.9 })); rim.rotation.x = -Math.PI / 2; rim.position.y = 0.01;
        const shine = new THREE.Mesh(new THREE.CircleGeometry(sp.r * 0.35, mud ? 16 : 6), glowBasic(mud ? 0x8aa060 : 0xfff2b0, 0.35)); shine.rotation.x = -Math.PI / 2; shine.position.set(-sp.r * 0.3, 0.02, -sp.r * 0.25);
        grp.add(disc, rim, shine);
        this.specialAnims.push(t => { const pu = this.specialPulses.honey || 0; shine.material.opacity = 0.25 + 0.15 * Math.sin(t * 1.3 + sp.u) + pu; grp.scale.setScalar(1 + pu * 0.08); });
      } else if (sp.kind === 'gear') {
        // 轉向齒輪：平躺、一直在轉的銅齒輪，上面一個彎箭頭標出轉向（左轉 / 右轉）
        const grp = new THREE.Group(); grp.position.set(sp.u, sp.y + 0.05, -sp.v); g.add(grp);
        const geo = new THREE.ExtrudeGeometry(gearShape(16, 0.86, 0.18), { depth: 0.35, bevelEnabled: false });
        geo.rotateX(-Math.PI / 2);
        const gearM = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xc89a50, roughness: 0.35, metalness: 0.75 }));
        gearM.scale.set(sp.r, 1, sp.r); gearM.castShadow = true; gearM.receiveShadow = true; grp.add(gearM);
        const sgn = Math.sign(sp.turn) || 1;
        const arc = new THREE.Mesh(new THREE.RingGeometry(sp.r * 0.42, sp.r * 0.58, 32, 1, Math.PI / 2, -sgn * 2.2), glowBasic(0xffa030, 0.9));
        arc.rotation.x = -Math.PI / 2; arc.position.y = 0.42;
        const endA = Math.PI / 2 - sgn * 2.2, rr = sp.r * 0.5;
        const head = new THREE.Mesh(new THREE.ConeGeometry(sp.r * 0.16, sp.r * 0.3, 3), glowBasic(0xffa030, 0.9));
        head.rotation.x = -Math.PI / 2; head.rotation.z = endA - sgn * Math.PI / 2 + Math.PI; head.position.set(Math.cos(endA) * rr, 0.43, -Math.sin(endA) * rr);
        const deco = new THREE.Group(); deco.add(arc, head);
        // 箭頭的起點朝發球台那一側（齒輪中心看向旗桿的反方向）
        const dirTee = Math.atan2(-(hole.pin[0] - sp.u), -(-hole.pin[1] - sp.v));
        deco.rotation.y = dirTee + Math.PI / 2 * 0;
        grp.add(deco);
        this.specialAnims.push(t => { gearM.rotation.y = -sgn * t * 0.8; const pu = this.specialPulses.gear || 0; arc.material.opacity = 0.55 + 0.35 * Math.sin(t * 3) + pu; head.material.opacity = arc.material.opacity; });
      } else if (sp.kind === 'wisp') {
        // 引魂燈：飄在空中的綠色鬼火，周圍一圈淡淡的光環（觸發範圍）
        const grp = new THREE.Group(); grp.position.set(sp.u, sp.y, -sp.v); g.add(grp);
        const wc = th === 'moon' ? [0xe8f2ff, 0x8ab8ff, 0xb8d4ff] : [0xc8ffe0, 0x7affb8, 0x9affc8];
        const core = new THREE.Mesh(th === 'moon' ? new THREE.OctahedronGeometry(0.85, 0) : new THREE.SphereGeometry(0.7, 16, 12), glowBasic(wc[0], 0.95));
        const halo = glowSprite(this, new THREE.Vector3(0, 0, 0), 7, wc[1], 0.55);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(sp.r, 0.05, 6, 64), glowBasic(wc[2], 0.28));
        grp.add(core, halo, ring);
        const N = 26, pos = new Float32Array(N * 3), seeds = Array.from({ length: N }, () => [Math.random() * 6.28, 0.5 + Math.random(), Math.random() * 6.28]);
        const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const pts = new THREE.Points(pg, new THREE.PointsMaterial({ map: this.sparkTex, color: wc[2], size: 0.6, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
        pts.frustumCulled = false; grp.add(pts);
        // 地上的燈影：讓人看得出燈在哪裡
        const gy = hole.heightUV(sp.u, sp.v);
        const mark = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.2, 24), glowBasic(wc[1], 0.35)); mark.rotation.x = -Math.PI / 2; mark.position.set(sp.u, gy + 0.08, -sp.v); g.add(mark);
        const ph0 = Math.random() * 6;
        this.specialAnims.push(t => {
          core.position.y = Math.sin(t * 1.4 + ph0) * 0.5; halo.position.y = core.position.y; if (th === 'moon') core.rotation.y = t * 1.2;
          ring.rotation.y = t * 0.4; ring.rotation.x = 0.5 * Math.sin(t * 0.3 + ph0);
          for (let i = 0; i < N; i++) { const [a, s0, ph] = seeds[i]; const aa = a + t * s0; pos[i * 3] = Math.cos(aa) * (1.5 + Math.sin(t + ph)); pos[i * 3 + 1] = Math.sin(t * 2 + ph) * 1.2 + core.position.y; pos[i * 3 + 2] = Math.sin(aa) * (1.5 + Math.sin(t + ph)); }
          pg.attributes.position.needsUpdate = true;
          const pu = this.specialPulses.wisp || 0; halo.material.opacity = 0.45 + 0.2 * Math.sin(t * 2.3 + ph0) + pu; ring.material.opacity = 0.22 + pu;
        });
      } else if (sp.kind === 'bumper') {
        // 彈珠柱：紅白條紋的柱子、頂上一圈會發光的環，被撞到會彈一下
        const grp = new THREE.Group(); grp.position.set(sp.u, sp.y - 0.2, -sp.v); g.add(grp);
        const geo = new THREE.CylinderGeometry(sp.r, sp.r * 1.08, sp.h + 0.2, 24, 6); geo.translate(0, (sp.h + 0.2) / 2, 0);
        const p = geo.attributes.position, cc = new Float32Array(p.count * 3);
        for (let i = 0; i < p.count; i++) { const red = Math.floor(p.getY(i) / ((sp.h + 0.2) / 6) + 0.001) % 2 === 0; cc[i * 3] = red ? 0.92 : 1; cc[i * 3 + 1] = red ? 0.16 : 1; cc[i * 3 + 2] = red ? 0.2 : 1; }
        geo.setAttribute('color', new THREE.BufferAttribute(cc, 3));
        const body = new THREE.Mesh(geo.toNonIndexed(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.1, flatShading: true }));
        body.castShadow = true;
        const top = new THREE.Mesh(new THREE.TorusGeometry(sp.r, 0.2, 8, 32), glowBasic(0xffe04a, 0.9)); top.rotation.x = -Math.PI / 2; top.position.y = sp.h + 0.25;
        const cap = new THREE.Mesh(new THREE.CircleGeometry(sp.r, 24), glowMaterial({ color: 0xffd040, roughness: 0.3 }, 0.6)); cap.rotation.x = -Math.PI / 2; cap.position.y = sp.h + 0.21;
        grp.add(body, top, cap);
        this.specialAnims.push(t => { const pu = this.specialPulses.bumper || 0; grp.scale.set(1 + pu * 0.18, 1, 1 + pu * 0.18); top.material.opacity = 0.6 + 0.3 * Math.sin(t * 4 + sp.u) + pu; });
      } else if (sp.kind === 'cloud') {
        // 雷雲：一團灰黑色的雲，裡面不時閃著藍白色的光；地上有雲影
        const grp = new THREE.Group(); grp.position.set(sp.u, sp.y, -sp.v); g.add(grp);
        const soft = th === 'sky';
        const mat = new THREE.MeshStandardMaterial({ color: soft ? 0xffffff : 0x5a6070, emissive: soft ? 0x8a96a8 : 0x000000, roughness: 1, flatShading: !soft, transparent: true, opacity: soft ? 0.96 : 0.93 });
        const crng = makeRng(Math.round(sp.u * 7 + sp.v * 13));
        for (let i = 0; i < 9; i++) {
          const a = crng() * Math.PI * 2, rr = crng() * sp.r * 0.65, s = 2.6 + crng() * 2.2;
          const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, soft ? 2 : 1), mat); m.position.set(Math.cos(a) * rr, (crng() - 0.4) * sp.th * 0.6, Math.sin(a) * rr); m.scale.y = 0.65; m.castShadow = true; grp.add(m);
        }
        const flash = glowSprite(this, new THREE.Vector3(0, 0, 0), sp.r * 2.6, 0xa8c8ff, 0); grp.add(flash);
        let next = 1 + Math.random() * 4;
        this.specialAnims.push(t => {
          grp.position.x = sp.u + Math.sin(t * 0.2 + sp.v) * 0.6;
          if (t > next) next = t + 2.5 + Math.random() * 5;
          const k = next - t > 2.3 ? 1 : 0;
          flash.material.opacity = Math.max(soft ? 0 : k * 0.8, (this.specialPulses.cloud || 0) * (soft ? 0.4 : 1));
        });
      } else if (sp.kind === 'wall') {
        // 冰鏡牆：半透明的冰板 + 發光的邊
        const ax = sp.a[0], az = -sp.a[1], bx = sp.b[0], bz = -sp.b[1], L = Math.hypot(bx - ax, bz - az);
        const geo = new THREE.BoxGeometry(L, sp.h + 1.2, 0.5);
        const cry = th === 'crystal';
        const mat = new THREE.MeshStandardMaterial({ color: cry ? 0xd8b8ff : 0xbfe6ff, emissive: cry ? 0x7a3aff : 0x2a7acc, emissiveIntensity: 0.35, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.55 });
        const m = new THREE.Mesh(geo, mat);
        m.position.set((ax + bx) / 2, sp.y0 + (sp.h + 1.2) / 2 - 0.9, (az + bz) / 2);
        m.rotation.y = -Math.atan2(bz - az, bx - ax);
        g.add(m);
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: cry ? 0xf0d8ff : 0xc8f2ff, transparent: true, opacity: 0.9 }));
        edges.position.copy(m.position); edges.rotation.copy(m.rotation); g.add(edges);
        this.specialAnims.push(t => { const pu = this.specialPulses.wall || 0; mat.emissiveIntensity = 0.3 + 0.12 * Math.sin(t * 1.4 + ax) + pu * 1.5; });
      }
    }
  }

  // 收集到的金球：消失 + 金色光點
  collectOrb(idx) {
    const m = this.orbMeshes && this.orbMeshes[idx];
    if (!m || !m.visible) return;
    m.visible = false;
    this.cupBurst(m.position.x, m.position.y, m.position.z, 0.12, 2.4);
  }

  // 各主題的「活的」氛圍（只動霧、光、曝光，不影響打球）：
  //   海底：陽光穿過水面一明一暗；沼澤：濃霧時聚時散；法老神殿：不時颳起一陣沙塵暴；
  //   恐龍谷：遠方火山偶爾噴發、天邊一亮；霓虹夜城：霓虹燈輕微閃爍；水晶洞窟：水晶一起慢慢呼吸發光；
  //   火星：沙塵暴一陣一陣；天空之城：雲海的陽光慢慢變化
  themeAtmos() {
    const th = THEMES[this.curTheme], fog = this.scene.fog, t = this.time;
    if (!th || !fog || !fog.isFog) return;
    let near = th.fogNear, far = th.fogFar, sunK = 1;
    switch (this.curTheme) {
      case 'reef': sunK = 1 + 0.14 * Math.sin(t * 1.7) + 0.07 * Math.sin(t * 3.3 + 1); break;
      case 'swamp': { const k = 0.5 + 0.5 * Math.sin(t * 0.13) * Math.sin(t * 0.07 + 2); near *= 0.55 + k * 0.9; far *= 0.6 + k * 0.8; break; }
      case 'egypt': case 'mars': {
        // 沙塵暴：每 25~40 秒一陣，約 8 秒，霧拉近、陽光變暗
        if (t > (this.dustNext || 0)) { this.dustAt = this.dustNext ? t : -99; this.dustNext = t + 25 + Math.random() * 15; }
        const e = t - (this.dustAt ?? -99), k = e >= 0 && e < 8 ? Math.sin(e / 8 * Math.PI) : 0;
        near *= 1 - k * 0.8; far *= 1 - k * (this.curTheme === 'mars' ? 0.7 : 0.6); sunK = 1 - k * 0.35; break;
      }
      case 'dino':
        if (t > (this.eruptNext || 0)) { if (this.eruptNext) this.flashT = Math.max(this.flashT || 0, 0.1); this.eruptNext = t + 18 + Math.random() * 14; }
        break;
      case 'neon': sunK = 1 + 0.06 * Math.sin(t * 9) * (Math.sin(t * 0.7) > 0.6 ? 1 : 0.2); break;
      case 'crystal': sunK = 1 + 0.18 * Math.sin(t * 0.9); break;
      case 'sky': sunK = 1 + 0.08 * Math.sin(t * 0.25); break;
      default: return;
    }
    fog.near = near; fog.far = far;
    this.sun.intensity = th.sunI * sunK;
  }

  // 機關觸發時，同一種機關一起閃一下
  specialPulse(kind) { (this.specialPulses = this.specialPulses || {})[kind] = 1; }

  // 雷雲打中球：從雲到地面一道鋸齒狀的閃電，畫面亮一下
  lightning(pos) {
    const [x, y, z] = pos, gy = this.hole ? this.hole.height(x, z) : y - 20;
    const pts = [new THREE.Vector3(x, y + 4, z)];
    let cx = x, cz = z;
    for (let yy = y + 4; yy > gy; yy -= 1.6 + Math.random() * 1.6) { cx += (Math.random() - 0.5) * 1.8; cz += (Math.random() - 0.5) * 1.8; pts.push(new THREE.Vector3(cx, yy, cz)); }
    pts.push(new THREE.Vector3(x, gy, z));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xeef4ff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
    const glow = glowSprite(this, new THREE.Vector3(x, y, z), 14, 0xb8d0ff, 0.9);
    this.scene.add(line, glow);
    this.flashT = 0.35;
    let life = 0.45;
    const fade = dt => { life -= dt; line.material.opacity = Math.max(0, life / 0.45) * (0.6 + 0.4 * Math.random()); glow.material.opacity = line.material.opacity * 0.8; if (life <= 0) { this.scene.remove(line, glow); line.geometry.dispose(); return false; } return true; };
    (this.fxFades = this.fxFades || []).push(fade);
  }

  // 天空的動態效果：極光（冰原、蘑菇森林）、雲海（天空城）
  buildSkyFx(hole, g) {
    this.aurora = null;
    this.skyAnims = [];
    const th = hole.course.theme;
    if (th === 'sky') {
      const b = hole.bbox, cu = (b.minU + b.maxU) / 2, cv = (b.minV + b.maxV) / 2;
      this.ensureSpark();
      // 飛艇：白色氣囊、木頭吊艙、紅色尾翼，在島的周圍慢慢繞圈
      const env = new THREE.MeshStandardMaterial({ color: 0xf4f0e8, roughness: 0.7 }), wood = new THREE.MeshStandardMaterial({ color: 0x7a5232, roughness: 0.8 }), fin = new THREE.MeshStandardMaterial({ color: 0xb8302a, roughness: 0.6 });
      const baseY = hole.heightUV(hole.green.u, hole.green.v);
      for (let i = 0; i < 5; i++) {
        const ship = new THREE.Group(), L = 26 + Math.random() * 18;
        const bag = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), env); bag.scale.set(L / 2, L / 6.5, L / 6.5); ship.add(bag);
        const gon = new THREE.Mesh(new THREE.BoxGeometry(L * 0.28, L * 0.07, L * 0.1), wood); gon.position.y = -L / 6.5 - L * 0.06; ship.add(gon);
        for (const sd of [-1, 1]) { const f = new THREE.Mesh(new THREE.BoxGeometry(L * 0.14, L * 0.02, L * 0.18), fin); f.position.set(-L * 0.44, 0, sd * L * 0.08); ship.add(f); }
        const vf = new THREE.Mesh(new THREE.BoxGeometry(L * 0.14, L * 0.18, L * 0.02), fin); vf.position.set(-L * 0.44, L * 0.08, 0); ship.add(vf);
        g.add(ship);
        const R = 380 + Math.random() * 600, a0 = Math.random() * Math.PI * 2, h = baseY + 50 + Math.random() * 90, sp0 = (Math.random() < 0.5 ? -1 : 1) * (0.006 + Math.random() * 0.006);
        this.skyAnims.push(t => { const a = a0 + t * sp0; ship.position.set(cu + Math.cos(a) * R, h + Math.sin(t * 0.3 + a0) * 2, -cv + Math.sin(a) * R); ship.rotation.y = -a + (sp0 > 0 ? -Math.PI / 2 : Math.PI / 2); });
      }
      for (let i = 0; i < 160; i++) {
        const sp = glowSprite(this, new THREE.Vector3(cu + (Math.random() - 0.5) * 2400, this.voidY - 130 - Math.random() * 90, -cv + (Math.random() - 0.5) * 2400), 260 + Math.random() * 300, [0xffffff, 0xe8f0ff, 0xfff0f4][i % 3], 0.4, true);
        sp.material.fog = true; g.add(sp);
      }
    }
    if (th !== 'frost' && th !== 'mushroom') return;
    const b = hole.bbox, cu = (b.minU + b.maxU) / 2, cv = (b.minV + b.maxV) / 2;
    const geo = new THREE.CylinderGeometry(1600, 1600, 560, 96, 1, true);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uA: { value: th === 'frost' ? 1 : 0.45 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec2 vUv; uniform float uTime; uniform float uA;
        void main(){
          float x = vUv.x * 40.0;
          float w = sin(x * 0.9 + uTime * 0.25) * 0.5 + sin(x * 2.3 - uTime * 0.4) * 0.25 + sin(x * 5.1 + uTime * 0.7) * 0.1;
          float band = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.45, vUv.y);
          float curtain = pow(0.5 + 0.5 * sin(x * 3.0 + w * 4.0 + uTime * 0.3), 3.0) * (0.6 + 0.4 * sin(x * 0.37 + uTime * 0.1));
          vec3 col = mix(vec3(0.2, 1.0, 0.55), vec3(0.85, 0.35, 1.0), smoothstep(0.35, 0.95, vUv.y + w * 0.15));
          float a = band * curtain * uA * 0.55;
          gl_FragColor = vec4(col * a, a);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide, fog: false,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(cu, 300, -cv);
    m.renderOrder = -1;
    g.add(m);
    this.aurora = mat;
  }

  waterMaterial() {
    return new THREE.MeshStandardMaterial({
      // 反射天空太強（低角度看過去整片泛白）會被看成沙地：反射調弱、水色偏藍綠一點
      color: 0x1d4f60, roughness: 0.14, metalness: 0.0, normalMap: this.waterNormal, normalScale: new THREE.Vector2(0.35, 0.35),
      envMapIntensity: 0.5, transparent: true, opacity: 0.96,
    });
  }

  // 主題的水面：叢林 = 綠松石潟湖、熔岩 = 會流動發光的熔岩（規則仍是水障礙）
  hazardMaterial() {
    const theme = this.hole && this.hole.course.theme;
    if (theme === 'lava') {
      if (!this.lavaTex) { this.lavaTex = makeLavaTexture(); }
      return new THREE.MeshStandardMaterial({ color: 0x140300, emissive: 0xffffff, emissiveMap: this.lavaTex, emissiveIntensity: 1.5, roughness: 0.85, metalness: 0,
        normalMap: this.waterNormal, normalScale: new THREE.Vector2(0.6, 0.6) });
    }
    const m = this.waterMaterial();
    if (THEMES[theme] && THEMES[theme].water && !['jungle', 'mushroom', 'frost'].includes(theme)) { m.color.set(THEMES[theme].water); m.envMapIntensity = 0.6; }
    if (theme === 'tropical' || theme === 'salt') { m.opacity = 0.9; m.envMapIntensity = 0.7; }
    if (theme === 'candy') { m.opacity = 1; m.roughness = 0.28; m.envMapIntensity = 0.35; }
    if (theme === 'neon' || theme === 'crystal') { m.emissive = new THREE.Color(THEMES[theme].water); m.emissiveIntensity = 0.6; }
    if (theme === 'swamp') { m.opacity = 0.97; m.roughness = 0.2; m.envMapIntensity = 0.3; }
    if (theme === 'haunt') { m.emissive = new THREE.Color(0x1a6a3a); m.emissiveIntensity = 0.5; m.opacity = 0.96; }
    if (theme === 'toy') { m.opacity = 1; m.roughness = 0.2; m.envMapIntensity = 0.4; }
    if (theme === 'mushroom') { m.color.set(THEMES.mushroom.water); m.emissive = new THREE.Color(0x0c6a86); m.emissiveIntensity = 0.7; m.envMapIntensity = 0.6; }
    if (theme === 'frost') { m.color.set(THEMES.frost.water); m.roughness = 0.03; m.envMapIntensity = 1.4; m.opacity = 0.97; }
    if (theme === 'jungle') { m.color.set(THEMES.jungle.water); m.opacity = 0.95; m.envMapIntensity = 0.45; m.roughness = 0.12; }
    return m;
  }

  // ---------- 台灣真實球場的周邊景色 ----------
  // 依球場所在地放遠景地標與動物（只畫不碰撞）：林口台地的高樓社區、林口發電廠的煙囪、海岸的風力發電機、
  // 台灣海峽、長庚醫院、往桃園機場起降的飛機，以及球場常見的白鷺鷥、天上盤旋的大冠鷲、成群飛過的台灣藍鵲
  buildLandmarks(hole, g) {
    const conf = LANDMARKS[hole.course.baseId || hole.course.id];
    if (!conf) return;
    const b = hole.bbox, cu = (b.minU + b.maxU) / 2, cv = (b.minV + b.maxV) / 2;
    const rng = makeRng(hashStrR(hole.course.id + ':' + hole.holeIdx + 'lm'));
    const gy = (u, v) => hole.heightUV(u, v);
    // 方位：u 負方向當西邊（海那一側）
    const at = (angDeg, dist) => { const a = angDeg * Math.PI / 180; return [cu + Math.sin(a) * dist, cv + Math.cos(a) * dist]; };
    const winMat = (base, lit) => { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const x = c.getContext('2d'); x.fillStyle = base; x.fillRect(0, 0, 64, 256); for (let j = 0; j < 32; j++) for (let i = 0; i < 6; i++) { x.fillStyle = Math.random() < 0.85 ? lit : 'rgba(60,70,80,0.9)'; x.fillRect(4 + i * 10, 4 + j * 8, 6, 4); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 }); };
    // 高樓社區：一群大樓（20~38 層），分布在指定方位
    if (conf.towers) for (const [ang, dist, n, hMin, hMax] of conf.towers) {
      const mat = winMat('#d8d6d0', 'rgba(120,150,175,0.9)');
      const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
      const im = new THREE.InstancedMesh(geo, mat, n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
      const [ou, ov] = at(ang, dist);
      for (let i = 0; i < n; i++) {
        const u = ou + (rng() - 0.5) * dist * 0.5, v = ov + (rng() - 0.5) * dist * 0.35;
        const h = hMin + rng() * (hMax - hMin), w = 22 + rng() * 14;
        p.set(u, gy(u, v) - 2, -v); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng() * 0.6); s.set(w, h, w * (0.6 + rng() * 0.5));
        m4.compose(p, q, s); im.setMatrixAt(i, m4);
      }
      im.instanceMatrix.needsUpdate = true; g.add(im);
    }
    // 長庚醫院 / 大學：幾棟白色大型建築
    if (conf.hospital) {
      const [ang, dist] = conf.hospital, [ou, ov] = at(ang, dist);
      const mat = winMat('#eeeeea', 'rgba(90,130,160,0.95)');
      [[0, 0, 70, 95, 40], [90, 30, 60, 70, 36], [-80, 40, 50, 60, 30], [40, -70, 80, 45, 50]].forEach(([dx, dz, w, h, d]) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); const u = ou + dx, v = ov + dz; m.position.set(u, gy(u, v) + h / 2 - 2, -v); m.rotation.y = 0.3; g.add(m);
      });
    }
    // 度假酒店 / 會館：一棟寬的低層建築加幾層樓的主樓，暖色的窗
    if (conf.hotel) {
      const [ang, dist] = conf.hotel, [ou, ov] = at(ang, dist);
      const mat = winMat('#e8e0d0', 'rgba(255,214,150,0.9)');
      [[0, 0, 140, 28, 50], [0, 10, 60, 55, 40], [-90, 30, 50, 18, 40]].forEach(([dx, dz, w, h, d]) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); const u = ou + dx, v = ov + dz; m.position.set(u, gy(u, v) + h / 2 - 1, -v); m.rotation.y = 0.2; g.add(m);
      });
    }
    // 高壓電塔：格子狀的鐵塔與電線
    if (conf.pylons) for (const [ang, dist, n] of conf.pylons) {
      const steel = new THREE.MeshStandardMaterial({ color: 0x8a8e94, roughness: 0.6, metalness: 0.5 });
      const tops = [];
      for (let k = 0; k < n; k++) {
        const [u, v] = at(ang - 20 + k * 40 / Math.max(1, n - 1), dist + k * 60);
        const y0 = gy(u, v), grp = new THREE.Group(); grp.position.set(u, y0, -v);
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 6, 55, 4, 6, true), new THREE.MeshStandardMaterial({ color: 0x8a8e94, wireframe: true }));
        body.position.y = 27.5; grp.add(body);
        for (const hgt of [40, 48]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(18, 0.6, 0.6), steel); arm.position.y = hgt; grp.add(arm); }
        g.add(grp); tops.push(new THREE.Vector3(u, y0 + 48, -v));
      }
      for (let k = 1; k < tops.length; k++) {
        const pts = []; for (let t = 0; t <= 12; t++) { const p = tops[k - 1].clone().lerp(tops[k], t / 12); p.y -= Math.sin(Math.PI * t / 12) * 6; pts.push(p); }
        g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x3a3a3a })));
      }
    }
    // 林口發電廠：三根紅白相間的高煙囪
    if (conf.plant) {
      const [ang, dist] = conf.plant, [ou, ov] = at(ang, dist);
      const geo = new THREE.CylinderGeometry(6, 9, 200, 16, 10); geo.translate(0, 100, 0);
      const p = geo.attributes.position, cc = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) { const red = p.getY(i) > 140 && Math.floor(p.getY(i) / 20) % 2 === 1; cc[i * 3] = red ? 0.8 : 0.9; cc[i * 3 + 1] = red ? 0.2 : 0.9; cc[i * 3 + 2] = red ? 0.18 : 0.9; }
      geo.setAttribute('color', new THREE.BufferAttribute(cc, 3));
      const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
      for (let k = 0; k < 3; k++) { const u = ou + k * 40, v = ov + k * 10; const m = new THREE.Mesh(geo, mat); m.position.set(u, gy(u, v) - 2, -v); g.add(m); g.add(glowSprite(this, new THREE.Vector3(u + 20, gy(u, v) + 230, -v), 60, 0xe8e8e8, 0.35, true)); }
      const hall = new THREE.Mesh(new THREE.BoxGeometry(160, 50, 70), new THREE.MeshStandardMaterial({ color: 0xb8bcc0, roughness: 0.8 })); hall.position.set(ou + 40, gy(ou, ov) + 23, -(ov - 80)); g.add(hall);
    }
    // 台灣海峽：西邊一大片海
    if (conf.sea) {
      const [ang, dist] = conf.sea, a = ang * Math.PI / 180;
      const geo = new THREE.PlaneGeometry(9000, 9000); geo.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(geo, this.hazardMaterial()); this.waterMats = (this.waterMats || []).concat(m.material);
      m.position.set(cu + Math.sin(a) * (dist + 4500), -7, -(cv + Math.cos(a) * (dist + 4500))); g.add(m);
    }
    // 風力發電機：沿著海岸排成一列，葉片會轉
    if (conf.turbines) {
      const [ang, dist, n] = conf.turbines, white = new THREE.MeshStandardMaterial({ color: 0xf2f2f0, roughness: 0.5 });
      const tower = new THREE.CylinderGeometry(1.4, 2.6, 80, 10); tower.translate(0, 40, 0);
      const blade = new THREE.BoxGeometry(2.2, 42, 0.6); blade.translate(0, 21, 0);
      for (let k = 0; k < n; k++) {
        const [u, v] = at(ang - 25 + k * 50 / Math.max(1, n - 1), dist + (rng() - 0.5) * 120);
        const y0 = Math.max(gy(u, v), -4);
        const t = new THREE.Mesh(tower, white); t.position.set(u, y0, -v); g.add(t);
        const hub = new THREE.Group(); hub.position.set(u, y0 + 81, -v); hub.rotation.y = rng() * 6.28;
        const rot = new THREE.Group(); for (let i = 0; i < 3; i++) { const bl = new THREE.Mesh(blade, white); bl.rotation.z = i * Math.PI * 2 / 3; rot.add(bl); } hub.add(rot); g.add(hub);
        const sp0 = 0.6 + rng() * 0.4; this.specialAnims.push(tt => { rot.rotation.z = tt * sp0; });
      }
    }
    // 遠方的山丘
    if (conf.hills) for (let i = 0; i < conf.hills; i++) {
      const [u, v] = at(rng() * 360, 1500 + rng() * 900);
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.27, 0.35, 0.22 + rng() * 0.06), roughness: 1 }));
      m.scale.set(300 + rng() * 300, 90 + rng() * 120, 260 + rng() * 260); m.position.set(u, gy(u, v) - 10, -v); g.add(m);
    }
    // 石灰岩峭壁：球場外圍一塊塊灰白色的大岩壁
    if (conf.bluffs) {
      const G = this.treeGeos(), mat = new THREE.MeshStandardMaterial({ map: this.tex.rockD, color: 0xc8c0b0, roughness: 0.95 });
      for (let i = 0, tries = 0; i < conf.bluffs && tries < 300; tries++) {
        const [u, v] = at(rng() * 360, 140 + rng() * 380);
        if (u > b.minU && u < b.maxU && v > b.minV && v < b.maxV) continue;
        const m = new THREE.Mesh(G.rock, mat), r = 14 + rng() * 18;
        m.scale.set(r * (1.4 + rng()), r * (0.9 + rng() * 0.8), r * (0.6 + rng() * 0.5)); m.rotation.y = rng() * 6; m.position.set(u, gy(u, v) - r * 0.25, -v); g.add(m); i++;
      }
    }
    // 球道旁的大石頭（幸福的奇石）
    if (conf.rocks) {
      const G = this.treeGeos(), mat = new THREE.MeshStandardMaterial({ map: this.tex.rockD, color: 0x9a948c, roughness: 0.95 });
      for (let i = 0, tries = 0; i < conf.rocks && tries < 200; tries++) {
        const t = hole.tees[Math.floor(rng() * hole.tees.length)], side = rng() < 0.5 ? -1 : 1, a = 10 + rng() * 30, l = side * (14 + rng() * 10);
        const u = t.u + t.dir[0] * a + t.dir[1] * l, v = t.v + t.dir[1] * a - t.dir[0] * l;
        if (hole.surface(u, -v) !== SURF_ROUGH) continue;
        const m = new THREE.Mesh(G.rock, mat); const r = 1.5 + rng() * 1.8; m.scale.set(r, r * (0.8 + rng() * 0.6), r * (0.7 + rng() * 0.5)); m.rotation.y = rng() * 6; m.position.set(u, gy(u, v) - 0.3, -v); m.castShadow = true; g.add(m); i++;
      }
    }
    // 白鷺鷥：站在長草、水邊，偶爾低頭啄食
    const birdBody = (col, len) => { const grp = new THREE.Group(); const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.7 });
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mat); body.scale.set(1, 0.8, len); grp.add(body); return { grp, mat, body }; };
    if (conf.egrets) for (let i = 0, tries = 0; i < conf.egrets && tries < 300; tries++) {
      const s0 = hole.L * (0.25 + rng() * 0.6), p0 = hole.path[Math.min(hole.path.length - 1, Math.floor(s0 / hole.L * hole.path.length))];
      const u = p0[0] + (rng() - 0.5) * 70, v = p0[1] + (rng() - 0.5) * 70;
      const sf = hole.surface(u, -v);
      if (sf !== SURF_ROUGH) continue;
      const { grp, mat, body } = birdBody(0xf8f8f4, 1.6);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.42, 6), mat); neck.position.set(0, 0.22, 0.25); neck.rotation.x = 0.35;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), mat); head.position.set(0, 0.42, 0.33);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.16, 5), new THREE.MeshStandardMaterial({ color: 0x1a1a1a })); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.42, 0.45);
      const legM = new THREE.MeshStandardMaterial({ color: 0x222222 });
      for (const sd of [-1, 1]) { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 4), legM); lg.position.set(sd * 0.06, -0.38, -0.02); grp.add(lg); }
      const headG = new THREE.Group(); headG.add(neck, head, beak); grp.add(headG);
      grp.position.set(u, gy(u, v) + 0.62, -v); grp.rotation.y = rng() * 6.28; grp.scale.setScalar(1.3); g.add(grp);
      const ph = rng() * 10; this.specialAnims.push(tt => { const k = ((tt + ph) % 7) < 1.2 ? Math.sin(((tt + ph) % 7) / 1.2 * Math.PI) : 0; headG.rotation.x = k * 0.9; headG.position.z = k * 0.08; });
      i++;
    }
    // 大冠鷲：高空慢慢盤旋
    const glider = (col, span) => { const sh = new THREE.Shape(); sh.moveTo(0, 0.3); sh.lineTo(span / 2, -0.05); sh.lineTo(span * 0.42, -0.25); sh.lineTo(0, -0.4); sh.lineTo(-span * 0.42, -0.25); sh.lineTo(-span / 2, -0.05); sh.lineTo(0, 0.3);
      const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshStandardMaterial({ color: col, roughness: 0.9, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; const grp = new THREE.Group(); grp.add(m); return grp; };
    if (conf.eagles) for (let i = 0; i < conf.eagles; i++) {
      const grp = glider(0x3a2a1c, 1.6); grp.scale.setScalar(1.4); g.add(grp);
      const c0u = cu + (rng() - 0.5) * (b.maxU - b.minU), c0v = cv + (rng() - 0.5) * (b.maxV - b.minV), R = 25 + rng() * 30, H = 55 + rng() * 40, w = 0.12 + rng() * 0.08, ph = rng() * 6;
      this.specialAnims.push(tt => { const a = tt * w + ph; grp.position.set(c0u + Math.cos(a) * R, gy(c0u, c0v) + H + Math.sin(tt * 0.3 + ph) * 4, -(c0v + Math.sin(a) * R)); grp.rotation.set(0, -a, 0.35); });
    }
    // 台灣藍鵲：一小群拖著長尾巴、時不時從球道上空飛過
    if (conf.magpies) {
      const flock = [];
      for (let i = 0; i < 4; i++) {
        const grp = new THREE.Group(); const bl = new THREE.MeshStandardMaterial({ color: 0x1f4fb8, roughness: 0.6 });
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), bl); body.scale.set(0.8, 0.8, 1.6); grp.add(body);
        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.9), bl); tail.position.z = -0.6; grp.add(tail);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshStandardMaterial({ color: 0x111111 })); head.position.z = 0.3; grp.add(head);
        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 5), new THREE.MeshStandardMaterial({ color: 0xd8282a })); beak.rotation.x = Math.PI / 2; beak.position.z = 0.42; grp.add(beak);
        const wings = []; for (const sd of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.22), bl); w.position.x = sd * 0.3; grp.add(w); wings.push(w); }
        grp.scale.setScalar(1.6); grp.visible = false; g.add(grp); flock.push({ grp, wings, off: [(rng() - 0.5) * 6, (rng() - 0.5) * 2, i * 2.2] });
      }
      let start = 6 + rng() * 10, from = null, to = null;
      this.specialAnims.push(tt => {
        if (tt > start + 18) { start = tt + 25 + Math.random() * 30; from = null; }
        if (tt < start) { flock.forEach(f => f.grp.visible = false); return; }
        if (!from) { const a = Math.random() * 6.28, mid = hole.path[Math.floor(hole.path.length * (0.3 + Math.random() * 0.5))]; from = [mid[0] + Math.cos(a) * 160, mid[1] + Math.sin(a) * 160]; to = [mid[0] - Math.cos(a) * 160, mid[1] - Math.sin(a) * 160]; }
        const k = (tt - start) / 18, u = lerpR(from[0], to[0], k), v = lerpR(from[1], to[1], k), yaw = Math.atan2(to[0] - from[0], to[1] - from[1]);
        flock.forEach(f => { f.grp.visible = true; f.grp.position.set(u + f.off[0], gy(u, v) + 18 + f.off[1] + Math.sin(tt * 3 + f.off[2]) * 0.6, -(v + f.off[2] * 0)); f.grp.position.x += Math.sin(yaw) * -f.off[2]; f.grp.position.z -= Math.cos(yaw) * -f.off[2]; f.grp.rotation.y = yaw + Math.PI; f.wings.forEach((w, j) => { w.rotation.z = (j ? 1 : -1) * Math.sin(tt * 14 + f.off[2]) * 0.6; }); });
      });
    }
    // 往桃園機場起降的客機：每隔一段時間從高空飛過
    if (conf.planes) {
      const grp = new THREE.Group(), wm = new THREE.MeshStandardMaterial({ color: 0xf4f4f6, roughness: 0.4, metalness: 0.2 });
      const fus = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 40, 12), wm); fus.rotation.x = Math.PI / 2; grp.add(fus);
      const nose = new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 8), wm); nose.position.z = 20; grp.add(nose);
      const wing = new THREE.Mesh(new THREE.BoxGeometry(38, 0.5, 6), wm); wing.position.z = 2; grp.add(wing);
      const tailF = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8, 5), new THREE.MeshStandardMaterial({ color: 0x1a4a8a })); tailF.position.set(0, 4, -18); grp.add(tailF);
      const stab = new THREE.Mesh(new THREE.BoxGeometry(14, 0.4, 3.5), wm); stab.position.set(0, 0.5, -18); grp.add(stab);
      grp.visible = false; g.add(grp);
      let start = 8 + rng() * 15;
      const a0 = conf.planes * Math.PI / 180, dx = Math.sin(a0), dz = Math.cos(a0);
      this.specialAnims.push(tt => {
        if (tt > start + 40) start = tt + 35 + Math.random() * 40;
        if (tt < start) { grp.visible = false; return; }
        const k = (tt - start) / 40, d = -2500 + 5000 * k;
        grp.visible = true; grp.position.set(cu + dx * d + dz * 300, 380 - k * 120, -(cv + dz * d - dx * 300)); grp.rotation.set(0.04, Math.atan2(dx, -dz) + Math.PI, 0);
      });
    }
  }

  // ---------- 國外真實球場的場景：OSM 的建築（照實際的形狀與高度）、橋、遠方的山與島、海岸的浪花 ----------
  buildOsmScene(hole, g) {
    const sc = hole.scene, conf = OSM_SCENE[hole.course.baseId || hole.course.id];
    if (!sc || !conf) return;
    const [gx, gy0] = hole.geo, b = hole.bbox, cu = (b.minU + b.maxU) / 2, cv = (b.minV + b.maxV) / 2;
    const H = (u, v) => hole.heightUV(u, v);
    const rng = makeRng(hashStrR(hole.course.id + ':' + hole.holeIdx + 'osm'));
    // 建築：每棟擠出成實際的平面形狀，屋頂另一個顏色；全部合併成一個網格
    const geos = [], col = new THREE.Color();
    for (const bd of sc.buildings) {
      const pts = bd.p.map(([x, y]) => [x - gx, y - gy0]);
      let mu = 0, mv = 0; for (const [u, v] of pts) { mu += u; mv += v; } mu /= pts.length; mv /= pts.length;
      const dist = Math.hypot(mu - cu, mv - cv);
      if (dist > 1500 || (dist > 700 && pts.length < 5 && bd.h < 6)) continue;
      let nm = conf.named[bd.n] || {};
      if (conf.at) { const cx = mu + gx, cy = mv + gy0; for (const [ax, ay, o] of conf.at) if (Math.hypot(cx - ax, cy - ay) < 30) nm = o; }
      const h = nm.h || bd.h;
      const shape = new THREE.Shape(pts.map(([u, v]) => new THREE.Vector2(u, v)));
      let geo;
      try { geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 1 }); } catch (e) { continue; }
      geo.rotateX(-Math.PI / 2);
      let base = Infinity; for (const [u, v] of pts) base = Math.min(base, H(u, v));
      geo.translate(0, base - 0.4, 0);
      geo = geo.index ? geo.toNonIndexed() : geo;
      geo.computeVertexNormals();
      const wall = new THREE.Color(nm.wall || conf.wall[Math.floor(rng() * conf.wall.length)]).offsetHSL(0, 0, (rng() - 0.5) * 0.05), roof = new THREE.Color(nm.roof || conf.roof);
      const n = geo.attributes.normal, cc = new Float32Array(n.count * 3);
      for (let i = 0; i < n.count; i++) { const c0 = n.getY(i) > 0.5 ? roof : wall; cc[i * 3] = c0.r; cc[i * 3 + 1] = c0.g; cc[i * 3 + 2] = c0.b; }
      geo.setAttribute('color', new THREE.BufferAttribute(cc, 3));
      for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'color'].includes(k)) geo.deleteAttribute(k);
      geos.push(geo);
      // 斜屋頂：一般大小的房子沿著平面的長軸加一個人字形屋頂（大型建築維持平頂）
      if (conf.pitch && pts.length >= 4) {
        let sxx = 0, syy = 0, sxy = 0; for (const [u, v] of pts) { sxx += (u - mu) ** 2; syy += (v - mv) ** 2; sxy += (u - mu) * (v - mv); }
        const th = 0.5 * Math.atan2(2 * sxy, sxx - syy), ax = Math.cos(th), ay = Math.sin(th);
        let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
        for (const [u, v] of pts) { const a = (u - mu) * ax + (v - mv) * ay, bb = -(u - mu) * ay + (v - mv) * ax; a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, bb); b1 = Math.max(b1, bb); }
        const Wd = b1 - b0, Ln = a1 - a0;
        if (Wd > 3 && Wd < 22 && Ln * Wd < 1400) {
          const rh = Math.min(5, Wd * 0.42), y0 = base - 0.4 + h, bc = (b0 + b1) / 2;
          const P = (a, bb, y) => [mu + a * ax - bb * ay, y, -(mv + a * ay + bb * ax)];
          const A = P(a0, b0, y0), B = P(a1, b0, y0), Cc = P(a1, b1, y0), Dd = P(a0, b1, y0), R0 = P(a0, bc, y0 + rh), R1 = P(a1, bc, y0 + rh);
          const tri = [A, B, R1, A, R1, R0, Cc, Dd, R0, Cc, R0, R1, A, R0, Dd, B, Cc, R1].flat();
          const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(tri, 3)); rg.computeVertexNormals();
          const rc = new Float32Array(18 * 3); for (let i = 0; i < 18; i++) { const c0 = i >= 12 ? wall : roof; rc[i * 3] = c0.r; rc[i * 3 + 1] = c0.g; rc[i * 3 + 2] = c0.b; }
          rg.setAttribute('color', new THREE.BufferAttribute(rc, 3)); geos.push(rg);
        }
      }
    }
    if (geos.length) {
      const m = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }));
      m.castShadow = true; m.receiveShadow = true; g.add(m);
    }
    // 有名字的石橋（Swilcan Bridge）：小小的單拱石橋跨過溪
    const stone = new THREE.MeshStandardMaterial({ map: this.tex.rockD, color: 0xb5ab98, roughness: 0.95 });
    for (const br of sc.bridges || []) {
      const a = br.p[0], z = br.p[br.p.length - 1];
      const u0 = a[0] - gx, v0 = a[1] - gy0, u1 = z[0] - gx, v1 = z[1] - gy0;
      const L = Math.hypot(u1 - u0, v1 - v0); if (L < 2 || Math.hypot((u0 + u1) / 2 - cu, (v0 + v1) / 2 - cv) > 900) continue;
      const len = Math.max(L, 9), w = 2.6, rise = 1.3;
      const sh = new THREE.Shape(); sh.moveTo(-len / 2, 0);
      for (let i = 0; i <= 16; i++) { const t = i / 16; sh.lineTo(-len / 2 + len * t, rise * Math.sin(Math.PI * t) + 0.45); }
      sh.lineTo(len / 2, 0); sh.lineTo(len * 0.22, 0); sh.absarc(0, 0, len * 0.22, 0, Math.PI, false); sh.lineTo(-len / 2, 0);
      const geo = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false }); geo.translate(0, 0, -w / 2);
      const m = new THREE.Mesh(geo, stone);
      const mu = (u0 + u1) / 2, mv = (v0 + v1) / 2;
      m.position.set(mu, Math.min(H(u0, v0), H(u1, v1)) - 0.25, -mv); m.rotation.y = Math.atan2(v1 - v0, u1 - u0);
      m.castShadow = true; g.add(m);
    }
    // 遠方的山與島：依實際方位、用實際的視角大小放到 3.4 公里外（不受霧影響，顏色帶一點大氣的藍）
    const D = 3400;
    for (const [ang, dist, hgt, rad, snow] of conf.mounts || []) {
      // 有積雪的高山（富士山）照片和肉眼看起來都比相機的視角大，放大 1.6 倍才看得出那種「遠方巨大的山」的感覺
      const k = D / dist * (snow ? 1.6 : 1), hh = hgt * k, rr = rad * k, a = ang * Math.PI / 180;
      const geo = new THREE.ConeGeometry(1, 1, 48, 6, true); geo.translate(0, 0.5, 0);
      const pos = geo.attributes.position, cc = new Float32Array(pos.count * 3), hz = new THREE.Color(0x8a9cb0), sn = new THREE.Color(0xf2f4f8), gr = new THREE.Color(0x5d7464);
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i), th = Math.atan2(pos.getZ(i), pos.getX(i));
        // 富士山那種下緣往外張開的曲線；小島比較圓
        const f = snow ? Math.pow(1 - y, 2.2) : Math.sqrt(Math.max(0, 1 - y * y));
        const wob = 1 + 0.05 * Math.sin(th * 5 + ang) * (1 - y);
        pos.setX(i, Math.cos(th) * f * wob); pos.setZ(i, Math.sin(th) * f * wob); pos.setY(i, snow ? y : Math.pow(y, 1.4));
        const c0 = snow && y > 1 - snow - 0.03 * Math.sin(th * 7) ? sn : (dist > 20000 ? hz : gr.clone().lerp(hz, Math.min(1, dist / 15000)));
        cc[i * 3] = c0.r; cc[i * 3 + 1] = c0.g; cc[i * 3 + 2] = c0.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(cc, 3)); geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
      m.scale.set(rr, hh, rr); m.position.set(cu + Math.sin(a) * D, -1.5, -(cv + Math.cos(a) * D)); g.add(m);
    }
    // 海岸的浪花：沿著海岸線一段段白色的泡沫，慢慢起伏
    if (hole.mapSea && sc.coast) {
      const pos = [], al = [];
      for (const [x0, y0, x1, y1] of sc.coast) {
        const u0 = x0 - gx, v0 = y0 - gy0, u1 = x1 - gx, v1 = y1 - gy0;
        if (Math.hypot((u0 + u1) / 2 - cu, (v0 + v1) / 2 - cv) > 1200) continue;
        const L = Math.hypot(u1 - u0, v1 - v0); if (L < 0.5) continue;
        const nu = (v1 - v0) / L, nv = -(u1 - u0) / L;                // 海在右側
        for (const off of [0.5, 3.5]) {
          const a0 = [u0 + nu * off, v0 + nv * off], a1 = [u1 + nu * off, v1 + nv * off], b0 = [u0 + nu * (off + 4), v0 + nv * (off + 4)], b1 = [u1 + nu * (off + 4), v1 + nv * (off + 4)];
          pos.push(a0[0], -0.86, -a0[1], b1[0], -0.86, -b1[1], a1[0], -0.86, -a1[1], a0[0], -0.86, -a0[1], b0[0], -0.86, -b0[1], b1[0], -0.86, -b1[1]);
          const k = off < 1 ? 1 : 0.5; al.push(k, 0, k, k, 0, 0);
        }
      }
      if (pos.length) {
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('a', new THREE.Float32BufferAttribute(al, 1));
        const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { t: { value: 0 } },
          vertexShader: 'attribute float a; varying float va; varying vec3 wp; void main(){ va=a; wp=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
          fragmentShader: 'uniform float t; varying float va; varying vec3 wp; void main(){ float w=0.55+0.45*sin(t*1.3+wp.x*0.05+wp.z*0.07); gl_FragColor=vec4(1.0,1.0,1.0,va*w*0.75); }' });
        const m = new THREE.Mesh(geo, mat); m.renderOrder = 4; g.add(m);
        this.specialAnims.push(tt => { mat.uniforms.t.value = tt; });
      }
    }
  }

  // ---------- 瀑布與洞穴發球台（Cliffhangers，只有外觀）----------
  // falls：果嶺邊的石灰岩壁與往下沖的瀑布（club = 岩壁上方加一棟山頂會館）；cave：白梯在岩壁裡的洞穴，洞口掛著瀑布，從洞裡隔著水簾開球
  buildFalls(hole, g) {
    if (!(hole.falls && hole.falls.length) && !hole.cave) return;
    const gy = (u, v) => hole.heightUV(u, v);
    const rockTex = rp => { const t = this.tex.rockD.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rp[0], rp[1]); t.needsUpdate = true; return t; };
    const rockMat = (rp, col = 0xb8b0a2, side = THREE.FrontSide) => new THREE.MeshStandardMaterial({ map: rockTex(rp), color: col, roughness: 0.95, side });
    // 水簾：直條紋的半透明貼圖往下捲動
    if (!this.fallTex) {
      const c = document.createElement('canvas'); c.width = 128; c.height = 256; const x = c.getContext('2d');
      for (let i = 0; i < 260; i++) {
        const px = Math.random() * 128, len = 30 + Math.random() * 120, py = Math.random() * 256, a = 0.25 + Math.random() * 0.6, wd = 1 + Math.random() * 2.5;
        for (const oy of [0, -256]) {
          const gr = x.createLinearGradient(0, py + oy, 0, py + oy + len); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, `rgba(235,245,250,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
          x.fillStyle = gr; x.fillRect(px, py + oy, wd, len);
        }
      }
      this.fallTex = new THREE.CanvasTexture(c); this.fallTex.wrapS = this.fallTex.wrapT = THREE.RepeatWrapping; this.fallTex.colorSpace = THREE.SRGBColorSpace;
    }
    const curtain = (w, h, speed) => {
      const t = this.fallTex.clone(); t.needsUpdate = true; t.repeat.set(w / 6, h / 10);
      const mat = new THREE.MeshBasicMaterial({ map: t, color: 0xdfeef4, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide });
      const back = new THREE.MeshBasicMaterial({ color: 0xb8d6e0, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide });
      const grp = new THREE.Group();
      const geo = new THREE.PlaneGeometry(w, h, 1, 1); geo.translate(0, -h / 2, 0);
      const m0 = new THREE.Mesh(geo, back), m1 = new THREE.Mesh(geo, mat); m1.position.z = 0.15; m0.renderOrder = m1.renderOrder = 6;
      grp.add(m0, m1);
      this.specialAnims.push(tt => { t.offset.y = tt * speed; });
      return grp;
    };
    const mist = (grp, x, y, z, w) => { for (let k = 0; k < 4; k++) grp.add(glowSprite(this, new THREE.Vector3(x + (k - 1.5) * w * 0.25, y + 1 + k % 2, z), w * 0.55, 0xffffff, 0.22, true)); };
    const G = this.treeGeos();
    const rr = makeRng(hashStrR(hole.course.id + ':' + hole.holeIdx + 'falls'));
    // 灰白色的石灰岩：低面數、表面凹凸的方塊（平面著色，跟樹的風格一致）
    const lime = new THREE.MeshStandardMaterial({ color: 0x8f8b80, roughness: 0.95, flatShading: true });
    const nzR = makeNoise(hashStrR(hole.course.id + hole.holeIdx));
    const craggy = (w, h, d) => {
      const geo = new THREE.BoxGeometry(w, h, d, Math.max(2, Math.round(w / 3)), Math.max(2, Math.round(h / 3)), 2).toNonIndexed();
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1.3 * nzR(x * 0.25 + z * 0.1, y * 0.3);
        p.setXYZ(i, x + k * 0.6, y + (y > h / 2 - 0.1 ? k * 0.8 : 0), z + k);
      }
      geo.computeVertexNormals(); return geo;
    };
    // 果嶺邊的瀑布：岩壁 + 幾塊大石頭 + 水簾 + 底部水霧
    for (const f of hole.falls || []) {
      const y0 = gy(f.u, f.v), grp = new THREE.Group();
      grp.position.set(f.u, y0, -f.v); grp.rotation.y = Math.atan2(Math.sin(f.face), -Math.cos(f.face));      // 本地 +z 朝向果嶺
      // 石灰岩是一層一層的：三段寬窄、前後錯開的岩層，上面散著大石頭
      [[2.3, 0.45, -4.5, 0], [1.9, 0.8, -6, 0.15], [1.5, 1.08, -7.5, -0.1]].forEach(([kw, kh, z, dx]) => {
        const hh = f.h * kh + 6, m = new THREE.Mesh(craggy(f.w * kw, hh, 7), lime);
        m.position.set(dx * f.w, hh / 2 - 6, z); m.rotation.y = (rr() - 0.5) * 0.12; m.castShadow = true; grp.add(m);
      });
      const stone = lime;
      for (let k = 0; k < 14; k++) {
        const m = new THREE.Mesh(G.rock, stone), r = 1.6 + rr() * 3.4, sx = (rr() - 0.5) * f.w * 2.3;
        if (Math.abs(sx) < f.w * 0.3 && rr() < 0.7) continue;          // 瀑布正前方少放
        m.scale.set(r * (1 + rr() * 0.8), r * (0.6 + rr() * 0.6), r); m.rotation.set(rr() * 0.4, rr() * 6, rr() * 0.4);
        m.position.set(sx, rr() < 0.4 ? f.h * (0.45 + rr() * 0.7) : rr() * 2, -1 + rr() * 2.5); m.castShadow = true; grp.add(m);
      }
      // 主瀑布 + 旁邊一道細的
      const main = curtain(f.w * 0.62, f.h * 1.08 + 1.4, 1.5); main.position.set(0, f.h * 1.08 + 0.6, -0.9); grp.add(main);
      const side1 = curtain(f.w * 0.16, f.h * 0.7, 1.2); side1.position.set(f.w * 0.55, f.h * 0.75, -0.6); grp.add(side1);
      mist(grp, 0, -0.2, 1, f.w * 0.8);
      if (f.club) {
        // Mountain Top 會館：岩壁上方的石砌木屋，長窗透出暖光
        const lodge = new THREE.Group(), stoneM = rockMat([2, 1], 0x9c9284), wood = new THREE.MeshStandardMaterial({ color: 0x6a4a32, roughness: 0.85 }), glass = new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0x6a4a20, roughness: 0.3 });
        const base = new THREE.Mesh(new THREE.BoxGeometry(30, 5, 12), stoneM); base.position.y = 2.5; lodge.add(base);
        const win = new THREE.Mesh(new THREE.BoxGeometry(25, 2.6, 0.3), glass); win.position.set(0, 2.8, 6.1); lodge.add(win);
        const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 10, 3, 4, 1), wood); roof.rotation.y = Math.PI / 4; roof.scale.set(2.3, 1, 1); roof.position.y = 6.5; lodge.add(roof);
        const deck = new THREE.Mesh(new THREE.BoxGeometry(36, 0.6, 5), wood); deck.position.set(0, 0.3, 9); lodge.add(deck);
        lodge.position.set(f.w * 0.15, f.h * 1.08 - 0.3, -9); grp.add(lodge);
      }
      g.add(grp);
    }
    // 洞穴發球台：岩壁（中間挖一個拱形洞口）+ 拱形隧道 + 洞頂的山丘；洞口外掛一道水簾
    const cv = hole.cave;
    if (cv) {
      const y0 = gy(cv.u, cv.v), grp = new THREE.Group();
      grp.position.set(cv.u, y0, -cv.v); grp.rotation.y = Math.atan2(cv.dir[0], -cv.dir[1]);     // 本地 +z = 開球方向
      const AR = 6.5, AH = 10, FACE = 5, BACK = -17;
      const arch = (sh, close) => { sh.moveTo(AR, -0.5); sh.lineTo(AR, 0); sh.absellipse(0, 0, AR, AH, 0, Math.PI, false); sh.lineTo(-AR, -0.5); if (close) sh.lineTo(AR, -0.5); };
      const sh = new THREE.Shape(); sh.moveTo(-34, -20); sh.lineTo(34, -20); sh.lineTo(34, 13); sh.lineTo(16, 18); sh.lineTo(-12, 17); sh.lineTo(-34, 12); sh.lineTo(-34, -20);
      const hole0 = new THREE.Path(); arch(hole0, true); sh.holes.push(hole0);
      const face = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 4, bevelEnabled: false }), lime); face.position.z = FACE; face.castShadow = true; grp.add(face);
      const tun = new THREE.CylinderGeometry(AR, AR, FACE - BACK + 0.5, 28, 1, true, Math.PI / 2, Math.PI); tun.rotateX(Math.PI / 2); tun.scale(1, AH / AR, 1);
      const tunnel = new THREE.Mesh(tun, rockMat([4, 2], 0x7a7064, THREE.DoubleSide)); tunnel.position.set(0, 0, (FACE + BACK) / 2 + 0.25); tunnel.castShadow = true; grp.add(tunnel);
      const capS = new THREE.Shape(); arch(capS, true);
      const cap = new THREE.Mesh(new THREE.ShapeGeometry(capS), rockMat([0.2, 0.2], 0x5e564c, THREE.DoubleSide)); cap.position.z = BACK; grp.add(cap);
      const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x4f6234, roughness: 1 }));
      mound.scale.set(34, 18, 26); mound.position.set(0, -1, FACE - 18); grp.add(mound);
      const stone = lime;
      for (let k = 0; k < 12; k++) {
        const m = new THREE.Mesh(G.rock, stone), r = 2.5 + rr() * 4, sx = (rr() - 0.5) * 64;
        m.scale.set(r * 1.4, r, r); m.rotation.y = rr() * 6; m.position.set(sx, 11 + rr() * 6 - Math.abs(sx) * 0.08, FACE + 1 + rr() * 3); grp.add(m);
      }
      // 洞內的暖色小燈，看得清楚洞穴的岩壁
      const lamp = new THREE.PointLight(0xffc888, 18, 26, 1.6); lamp.position.set(0, AH - 2, -4); grp.add(lamp);
      // 水簾從洞口上方落下，蓋住洞口（從洞裡隔著水簾看得到外面的球道）
      const fall = curtain(AR * 2.4, AH + 18, 1.7); fall.position.set(0, AH + 4, FACE + 4.3); grp.add(fall);
      mist(grp, 0, -12, FACE + 6, 14);
      g.add(grp);
    }
  }

  buildSea(hole) {
    const geo = new THREE.PlaneGeometry(8000, 8000, 1, 1);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, this.hazardMaterial());
    m.position.y = -0.9;
    m.receiveShadow = true;
    this.waterMats = (this.waterMats || []).concat(m.material);
    return m;
  }

  buildWaters(hole, g) {
    this.waterMats = this.waterMats || [];
    for (const w of hole.waters) {
      if (w.kind !== 'pond' || w.sea) continue;          // OSM 球場的海：用遠方那一整片海面
      if (w.cells) {
        // 描圖水池：每一列裡連續的水格子合成一段長條（凹進去的岸不會被補成水），往外只多半格，岸邊的緩坡會蓋住鋸齒
        //   原本整列取最左到最右、再往外多 3 格：C 字形的水池中間的陸地、比水面低的岸邊都會被水面蓋住（球和擊球線看起來在水裡）
        const G = w.grid, rows = new Map();
        for (const i of w.cells) { const y = (i / G.W) | 0; (rows.get(y) || rows.set(y, []).get(y)).push(i % G.W); }
        const pos = [];
        for (const [y, xs] of rows) {
          xs.sort((p, q) => p - q);
          for (let k = 0; k < xs.length;) {
            let e = k; while (e + 1 < xs.length && xs[e + 1] === xs[e] + 1) e++;
            const ua = G.u0 + (xs[k] - 0.6) * G.mpp, ub = G.u0 + (xs[e] + 0.6) * G.mpp;
            const va = G.v0 - (y - 0.6) * G.mpp, vb = G.v0 - (y + 0.6) * G.mpp;
            // 三角形要逆時針（從上面看），法線朝上；順時針會被背面剔除，水面整片看不見
            pos.push(ua, 0, -va, ub, 0, -vb, ub, 0, -va, ua, 0, -va, ua, 0, -vb, ub, 0, -vb);
            k = e + 1;
          }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.computeVertexNormals();
        const mat = this.hazardMaterial();
        this.waterMats.push(mat);
        const m = new THREE.Mesh(geo, mat);
        m.position.y = w.level + 0.05;
        m.receiveShadow = true;
        g.add(m);
        continue;
      }
      const shape = new THREE.Shape();
      for (let i = 0; i <= 64; i++) {
        const a = i / 64 * Math.PI * 2;
        const lu = Math.cos(a) * w.rx * 1.35, lv = Math.sin(a) * w.ry * 1.35;
        const c = Math.cos(-w.rot), s = Math.sin(-w.rot);
        const u = w.u + lu * c - lv * s, v = w.v + lu * s + lv * c;
        if (i === 0) shape.moveTo(u, v); else shape.lineTo(u, v);
      }
      const geo = new THREE.ShapeGeometry(shape);
      geo.rotateX(-Math.PI / 2);
      worldUv(geo);
      const mat = this.hazardMaterial();
      this.waterMats.push(mat);
      const m = new THREE.Mesh(geo, mat);
      m.position.y = w.level + 0.05;
      m.receiveShadow = true;
      g.add(m);
    }
    const cr = hole.cross;
    if (cr && cr.kind === 'creek') {
      const pts = [];
      for (let d = -hole.course.corridor - 40; d <= hole.course.corridor + 40; d += 4) {
        const p = hole.pointAt(cr.s), dir = hole.dirAt(cr.s);
        pts.push([p[0] + dir[1] * d, p[1] - dir[0] * d, dir]);
      }
      const verts = [], idx = [];
      pts.forEach(([u, v, dir], i) => {
        const hw = cr.half + 3;
        verts.push(u - dir[0] * hw, 0, -(v - dir[1] * hw), u + dir[0] * hw, 0, -(v + dir[1] * hw));
        if (i > 0) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      worldUv(geo);
      const mat = this.hazardMaterial();
      mat.side = THREE.DoubleSide;
      this.waterMats.push(mat);
      const m = new THREE.Mesh(geo, mat);
      m.position.y = cr.level + 0.25;
      g.add(m);
    }
  }

  // ---------- 樹木 ----------
  treeGeos() {
    if (this._treeGeos) return this._treeGeos;
    const nz = makeNoise(42);
    const blob = (r, seg = 2) => {
      const gg = new THREE.IcosahedronGeometry(r, seg);
      const p = gg.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const k = 1 + 0.2 * nz(x * 2.2 + 3, y * 2.2 + z * 1.7) + 0.09 * nz(x * 7, z * 7 + y * 3) + 0.05 * nz(x * 16 + y * 9, z * 16);
        p.setXYZ(i, x * k, y * k, z * k);
      }
      return gg;
    };
    const colorize = (gg, top, bot) => {
      const p = gg.attributes.position, c = new Float32Array(p.count * 3);
      gg.computeBoundingBox();
      const y0 = gg.boundingBox.min.y, y1 = gg.boundingBox.max.y;
      for (let i = 0; i < p.count; i++) {
        const t = (p.getY(i) - y0) / (y1 - y0);
        const n = 0.85 + 0.3 * Math.abs(nz(p.getX(i) * 5, p.getZ(i) * 5 + p.getY(i) * 3));
        for (let k = 0; k < 3; k++) c[i * 3 + k] = (bot[k] + (top[k] - bot[k]) * t) * n;
      }
      gg.setAttribute('color', new THREE.BufferAttribute(c, 3));
      return gg;
    };
    // 闊葉樹冠：多顆凹凸球合併，半徑約 1
    const parts = [[0, 0, 0, 0.72], [0.45, -0.15, 0.2, 0.55], [-0.42, -0.1, -0.25, 0.55], [0.1, 0.4, -0.3, 0.5], [-0.2, 0.35, 0.35, 0.48], [0.25, -0.35, -0.45, 0.45], [-0.35, -0.4, 0.4, 0.42]];
    const smoothBlob = (r, x, y, z) => { const gg = blob(r, 3); gg.deleteAttribute('uv'); gg.deleteAttribute('normal'); const m = mergeVertices(gg); m.computeVertexNormals(); return m.translate(x, y, z); };
    const broad = colorize(mergeGeometries(parts.map(([x, y, z, r]) => smoothBlob(r, x, y, z))), [1, 1, 1], [0.42, 0.48, 0.42]);
    // 松樹：四層錐體，高度 1、半徑約 0.35
    const cones = [];
    for (let i = 0; i < 8; i++) {
      const cg = new THREE.ConeGeometry(0.44 - i * 0.048, 0.26, 14, 3, true);
      const p = cg.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const x = p.getX(k), y = p.getY(k), z = p.getZ(k);
        const a = Math.atan2(z, x);
        const f = 1 + 0.16 * nz(Math.cos(a) * 3 + i, Math.sin(a) * 3) + 0.12 * Math.sin(a * 7 + i) * (0.5 - y);
        p.setX(k, x * f); p.setZ(k, z * f); p.setY(k, y - 0.05 * Math.abs(Math.sin(a * 5 + i)) * (0.5 - y));
      }
      cg.translate(0, 0.24 + i * 0.095, 0);
      cg.deleteAttribute('uv');
      cones.push(cg);
    }
    const pine = colorize(mergeGeometries(cones), [0.95, 1, 0.95], [0.45, 0.5, 0.45]);
    pine.computeVertexNormals();
    const trunk = new THREE.CylinderGeometry(0.7, 1, 1, 7, 1);
    trunk.translate(0, 0.5, 0);
    const rock = blob(1, 1);
    rock.scale(1, 0.62, 1);
    rock.computeVertexNormals();
    // 仙人掌：主幹 + 兩支手臂
    const cyl = (r, h) => new THREE.CapsuleGeometry(r, h, 4, 8);
    const arm1 = cyl(0.11, 0.4).translate(0.32, 0.45, 0), arm1b = cyl(0.1, 0.35).rotateZ(Math.PI / 2).translate(0.2, 0.25, 0);
    const arm2 = cyl(0.1, 0.32).translate(-0.3, 0.55, 0), arm2b = cyl(0.09, 0.3).rotateZ(Math.PI / 2).translate(-0.18, 0.38, 0);
    const cactus = mergeGeometries([cyl(0.15, 0.8).translate(0, 0.5, 0), arm1, arm1b, arm2, arm2b].map(gg => { gg.deleteAttribute('uv'); return gg; }));
    this._treeGeos = { broad, pine, trunk, rock, cactus, shrub: broad, ...fantasyGeos(nz, blob, colorize) };
    for (const gg of Object.values(this._treeGeos)) gg.userData.shared = true;
    return this._treeGeos;
  }

  buildTrees(hole, g) {
    const G = this.treeGeos();
    const leafMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0, envMapIntensity: 0.5 });
    // 樹冠隨風擺動：位移方向 = 風向，幅度隨風速與高度增加，每棵樹相位不同
    this.windU = this.windU || { uTime: { value: 0 }, uWind: { value: new THREE.Vector2() } };
    leafMat.onBeforeCompile = sh => {
      sh.uniforms.uTime = this.windU.uTime;
      sh.uniforms.uWind = this.windU.uWind;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime; uniform vec2 uWind;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          #ifdef USE_INSTANCING
            mat3 swIm = mat3(instanceMatrix);
            float swPh = instanceMatrix[3].x * 0.13 + instanceMatrix[3].z * 0.17;
            float swWs = length(uWind);
            float swAmt = 0.6 + 0.4 * sin(uTime * (1.1 + swWs * 0.18) + swPh) + 0.15 * sin(uTime * 3.7 + swPh * 2.0);
            float swH = clamp(position.y + 0.7, 0.0, 1.8);
            vec3 swD = vec3(uWind.x, 0.0, uWind.y) * swAmt * swH * 0.05;
            vec3 swL = transpose(swIm) * swD;
            swL /= vec3(dot(swIm[0], swIm[0]), dot(swIm[1], swIm[1]), dot(swIm[2], swIm[2]));
            transformed += swL;
          #endif`);
    };
    const barkMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 0.95 });
    const rockMat = new THREE.MeshStandardMaterial({ map: this.tex.rockD, normalMap: this.tex.rockN, color: 0xd29a7a, roughness: 0.95 });
    const cactusMat = new THREE.MeshStandardMaterial({ color: 0x4f6b3a, roughness: 0.75 });
    // 奇幻主題的材質
    const palmBark = new THREE.MeshStandardMaterial({ color: 0x8a7154, roughness: 0.9 });
    // 棕櫚 / 蕨類的葉子是薄片，兩面都要畫（一樣隨風擺動）
    const frondMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, envMapIntensity: 0.5, side: THREE.DoubleSide });
    frondMat.onBeforeCompile = leafMat.onBeforeCompile;
    const vcolMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, flatShading: true });
    const basaltMat = new THREE.MeshStandardMaterial({ color: 0x3e393b, roughness: 0.92, flatShading: true });
    const deadMat = new THREE.MeshStandardMaterial({ color: 0x2c2420, roughness: 1 });
    const crystalMat = glowMaterial({ roughness: 0.18, metalness: 0.15, flatShading: true }, 0.55);
    const shroomStemMat = glowMaterial({ color: 0xded6ea, roughness: 0.75 }, 0.15);
    const candyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.05 });
    const gumMat = new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.05 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf6f2ea, roughness: 0.6 });
    const towerMat = glowMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.2 }, 0.9);
    const coralMat = glowMaterial({ roughness: 0.7, flatShading: true }, 0.25);
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.8 });
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.6, metalness: 0.6 });
    const bulbMat = glowMaterial({ roughness: 0.3 }, 1.4);
    const all = hole.trees.map(t => ({ ...t, near: true }));
    const keep = this.q.trees;
    const rng = makeRng(9);
    const BIG = { karst: 1, volcano: 1, isle: 1, bigshroom: 1, iceberg: 1, peak: 1, mesa: 1, tower: 1, pyramid: 1, windmill: 1, dome: 1, bone: 1, hive: 1, castle: 1 };     // 遠景的大型地標一定畫
    for (const t of hole.scenery) if (BIG[t.type] || rng() < keep * this.q.far + 0.15) all.push({ ...t, y: t.fy ?? hole.heightUV(t.uv[0], t.uv[1]), near: false });
    const groups = {};
    const add = (k, t) => (groups[k] = groups[k] || []).push(t);
    for (const t of all) {
      if (t.type === 'broad' || t.type === 'maple' || t.type === 'shrub' || t.type === 'juniper') { add('canopy' + (t.near ? 'N' : 'F'), t); if (t.type !== 'shrub') add('trunk' + (t.near ? 'N' : 'F'), t); }
      else if (t.type === 'pine') { add('pine' + (t.near ? 'N' : 'F'), t); add('trunk' + (t.near ? 'N' : 'F'), t); }
      else if (t.type === 'palm') add('palm' + (t.near ? 'N' : 'F'), t);
      else if (t.type === 'shroom') add('shroom' + (t.near ? 'N' : 'F'), t);
      else if (t.type === 'lolli') add('lolli' + (t.near ? 'N' : 'F'), t);
      else add(t.type, t);
    }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
    const up = new THREE.Vector3(0, 1, 0);
    const make = (geo, mat, list, fn, shadow) => {
      if (!list || !list.length) return;
      const im = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((t, i) => {
        const col = fn(t, p, s);
        q.setFromAxisAngle(up, t.rot);
        m4.compose(p, q, s);
        im.setMatrixAt(i, m4);
        if (col) im.setColorAt(i, col);
      });
      im.castShadow = shadow; im.receiveShadow = true;
      im.instanceMatrix.needsUpdate = true;
      g.add(im);
    };
    const canopyColor = t => {
      if (t.candy) return c.setHSL([0.92, 0.55, 0.13, 0.8][Math.floor(t.tint * 4)], 0.7, 0.8);
      if (t.autumn) return c.setHSL(0.02 + t.tint * 0.11, 0.75, 0.42 + t.tint * 0.1);
      if (t.olive) return c.setHSL(0.2, 0.22, 0.42 + t.tint * 0.08);
      if (t.willow) return c.setHSL(0.24, 0.45, 0.36 + t.tint * 0.08);
      if (t.swamp) return c.setHSL(0.22, 0.3, 0.16 + t.tint * 0.05);
      if (t.anemone) return c.setHSL((0.85 + t.tint * 0.3) % 1, 0.75, 0.55);
      if (t.neon) return c.setHSL(t.tint < 0.5 ? 0.88 : 0.5, 0.95, 0.55);
      if (t.sakura) return c.setHSL(0.94 + t.tint * 0.04, 0.55 + t.tint * 0.2, 0.78 + t.tint * 0.08);
      if (t.birch) return c.setHSL(0.16 + t.tint * 0.04, 0.55, 0.42 + t.tint * 0.08);
      if (t.night) return c.setHSL(0.5 + t.tint * 0.12, 0.45, 0.16 + t.tint * 0.06);
      if (t.jungle) return c.setHSL(0.27 + t.tint * 0.07, 0.55 + t.tint * 0.15, 0.24 + t.tint * 0.08);
      if (t.honey) return c.setHSL(0.11 + t.tint * 0.05, 0.75, 0.48 + t.tint * 0.1);
      // 國外真實球場的當地植物：金雀花（蘇格蘭林克斯，深綠帶黃花）、蒙特利柏樹（加州海岸，深墨綠）、日本黑松
      if (t.gorse) return t.tint < 0.3 ? c.setHSL(0.13, 0.75, 0.42 + t.tint * 0.2) : c.setHSL(0.22 + t.tint * 0.04, 0.32, 0.17 + t.tint * 0.05);
      if (t.mcyp) return c.setHSL(0.3 + t.tint * 0.04, 0.3, 0.15 + t.tint * 0.05);
      if (t.jpine) return c.setHSL(0.32 + t.tint * 0.04, 0.35, 0.17 + t.tint * 0.05);
      if (t.type === 'maple') return c.setHSL(0.04 + t.tint * 0.06, 0.62, 0.36 + t.tint * 0.08);
      if (t.type === 'shrub') return c.setHSL(0.2, 0.3, 0.15 + t.tint * 0.05);
      if (t.type === 'juniper') return c.setHSL(0.22, 0.2, 0.17 + t.tint * 0.05);
      return c.setHSL(0.24 + t.tint * 0.06, 0.38 + t.tint * 0.12, 0.25 + t.tint * 0.07);
    };
    for (const sfx of ['N', 'F']) {
      make(G.broad, leafMat, groups['canopy' + sfx], (t, P, S) => {
        const lowCanopy = t.type === 'shrub' || t.type === 'juniper';
        // 蒙特利柏樹、日本黑松：平頂、往兩側展開的樹冠，樹幹露出來
        if (t.mcyp || t.jpine) { P.set(t.x, t.y + t.h * 0.78, t.z); S.set(t.r * 1.35, t.r * (t.mcyp ? 0.5 : 0.6), t.r * 1.15); return canopyColor(t); }
        P.set(t.x, lowCanopy ? t.y + t.h * 0.45 : t.y + t.h * 0.64, t.z);
        S.set(t.r, lowCanopy ? t.h * 0.55 : t.r * 1.08 + t.h * 0.05, t.r);
        return canopyColor(t);
      }, sfx === 'N');
      make(G.pine, leafMat, groups['pine' + sfx], (t, P, S) => {
        P.set(t.x, t.y, t.z); S.set(t.r / 0.4, t.h, t.r / 0.4);
        return t.toy ? c.setHSL(0.3 + t.tint * 0.06, 0.75, 0.4 + t.tint * 0.08) : t.snow ? c.setHSL(0.58, 0.12, 0.72 + t.tint * 0.12) : t.cypress ? c.setHSL(0.33, 0.28, 0.14 + t.tint * 0.04) : t.bonsai ? c.setHSL(0.3, 0.35, 0.22 + t.tint * 0.05) : c.setHSL(0.36, 0.3, 0.2 + t.tint * 0.05);
      }, sfx === 'N');
      make(G.trunk, barkMat, groups['trunk' + sfx], (t, P, S) => {
        P.set(t.x, t.y - 0.3, t.z);
        const tr = t.type === 'juniper' ? 0.12 : 0.16 + t.h * 0.012 + (t.mcyp ? 0.25 : 0);
        S.set(tr, t.type === 'pine' ? t.h * 0.4 : t.mcyp || t.jpine ? t.h * 0.78 : t.h * 0.55, tr);
        return null;
      }, sfx === 'N');
    }
    const thc = THEMES[hole.course.theme];
    make(G.rock, hole.course.theme ? new THREE.MeshStandardMaterial({ map: this.tex.rockD, color: thc && thc.rockCol ? thc.rockCol : hole.course.theme === 'void' ? 0x8a80b0 : 0x5a5254, roughness: 0.95 }) : rockMat, groups.rock, (t, P, S) => { P.set(t.x, t.y + t.h * 0.15, t.z); S.set(t.r, t.h * 0.7, t.r * (0.7 + t.tint * 0.5)); return null; }, true);
    // ---- 奇幻主題 ----
    for (const sfx of ['N', 'F']) {
      const list = groups['palm' + sfx];
      // 棕櫚：樹幹往一側彎，樹冠在彎過去的頂端
      make(G.palmTrunk, palmBark, list, (t, P, S) => { P.set(t.x, t.y - 0.2, t.z); S.set(0.3 + t.h * 0.008, t.h, 0.3 + t.h * 0.008); return null; }, sfx === 'N');
      make(G.palmCrown, frondMat, list, (t, P, S) => {
        const bend = (0.3 + t.h * 0.008) * 6; P.set(t.x + Math.cos(t.rot) * bend, t.y + t.h * 0.97, t.z - Math.sin(t.rot) * bend); S.set(t.r, t.r * 0.85, t.r);
        return t.neon ? c.setHSL(t.tint < 0.5 ? 0.88 : 0.5, 0.95, 0.55) : c.setHSL(0.24 + t.tint * 0.06, 0.55, 0.26 + t.tint * 0.06);
      }, sfx === 'N');
    }
    make(G.fern, frondMat, groups.fern, (t, P, S) => { P.set(t.x, t.y - 0.05, t.z); S.set(t.r, t.h, t.r); return t.anemone ? canopyColor(t) : c.setHSL(0.28 + t.tint * 0.05, 0.6, 0.22 + t.tint * 0.06); }, true);
    for (const sfx of ['N', 'F']) {
      const list = groups['shroom' + sfx];
      make(G.shroomStem, shroomStemMat, list, (t, P, S) => { P.set(t.x, t.y - 0.1, t.z); S.set(t.r * 0.18, t.h, t.r * 0.18); return null; }, sfx === 'N');
      make(G.shroomCap, crystalMat, list, (t, P, S) => { P.set(t.x, t.y + t.h * 0.97, t.z); S.set(t.r, t.r * 0.45, t.r); return c.setHSL((0.78 + t.tint * 0.35) % 1, 0.8, 0.55); }, sfx === 'N');
    }
    make(G.shroomStem, shroomStemMat, groups.bigshroom, (t, P, S) => { P.set(t.x, t.y - 2, t.z); S.set(t.r * 0.14, t.h, t.r * 0.14); return null; }, false);
    make(G.shroomCap, crystalMat, groups.bigshroom, (t, P, S) => { P.set(t.x, t.y - 2 + t.h * 0.97, t.z); S.set(t.r, t.r * 0.42, t.r); return c.setHSL((0.75 + t.tint * 0.4) % 1, 0.75, 0.5); }, false);
    make(G.crystal, crystalMat, groups.icespike, (t, P, S) => { P.set(t.x, t.y - 0.3, t.z); S.set(t.r, t.h, t.r); return c.setHSL(0.53 + t.tint * 0.06, 0.55, 0.78); }, true);
    // ---- 挑戰模式主題 ----
    for (const sfx of ['N', 'F']) {
      const list = groups['lolli' + sfx];
      make(G.lolliStick, whiteMat, list, (t, P, S) => { P.set(t.x, t.y - 0.1, t.z); S.set(1, t.h, 1); return null; }, sfx === 'N');
      make(G.lolliDisc, candyMat, list, (t, P, S) => { P.set(t.x, t.y + t.h, t.z); S.set(t.r, t.r, t.r); return c.setHSL([0.95, 0.5, 0.12, 0.78, 0.0][Math.floor(t.tint * 5)], 0.8, 0.62); }, sfx === 'N');
    }
    make(G.rock, gumMat, groups.gumdrop, (t, P, S) => { P.set(t.x, t.y, t.z); S.set(t.r, t.h, t.r); return c.setHSL([0.95, 0.12, 0.33, 0.55, 0.78][Math.floor(t.tint * 5)], 0.75, 0.6); }, true);
    make(G.tower, towerMat, groups.tower, (t, P, S) => { P.set(t.x, t.fy ?? t.y - 5, t.z); S.set(t.r, t.h, t.r * (0.7 + t.tint * 0.6)); return t.neon ? c.setHSL(t.tint < 0.5 ? 0.88 : 0.52, 0.9, 0.6) : t.haunt ? c.setRGB(0.42, 0.38, 0.55) : c.setRGB(1, 1, 1); }, false);
    // ---- 奇幻球場第二批 ----
    const metalVcol = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.65 });
    const pumpkinMat = glowMaterial({ vertexColors: true, roughness: 0.6 }, 0.45);
    make(G.flowerStem, vcolMat, groups.flower, (t, P, S) => { P.set(t.x, t.y - 0.1, t.z); S.set(t.r, t.h, t.r); return null; }, true);
    make(G.flowerHead, candyMat, groups.flower, (t, P, S) => { P.set(t.x, t.y + t.h - 0.1, t.z); S.set(t.r, t.r * 1.6, t.r); return c.setHSL([0.95, 0.12, 0.8, 0.02, 0.6, 0.15][Math.floor(t.tint * 6)], 0.9, 0.6); }, true);
    make(G.hive, vcolMat, groups.hive, (t, P, S) => { P.set(t.x, t.y - 1, t.z); S.set(t.r, t.h, t.r); return null; }, false);
    make(G.cog, metalVcol, groups.cog, (t, P, S) => { P.set(t.x, t.y - 0.2, t.z); S.setScalar(t.h / 2.25); return null; }, true);
    make(G.chimney, vcolMat, groups.chimney, (t, P, S) => { P.set(t.x, t.y - 0.5, t.z); S.set(t.r, t.h, t.r); return null; }, true);
    for (const t of groups.chimney || []) if (t.h > 40) for (let k = 0; k < 4; k++) g.add(glowSprite(this, new THREE.Vector3(t.x + k * 6, t.y + t.h * (1.05 + k * 0.12), t.z + k * 3), t.r * (2.5 + k * 1.2), 0x4a4440, 0.5, true));
    make(G.grave, vcolMat, groups.grave, (t, P, S) => { P.set(t.x, t.y - 0.15, t.z); S.set(t.r, t.h / 1.2, t.r); return null; }, true);
    make(G.pumpkin, pumpkinMat, groups.pumpkin, (t, P, S) => { P.set(t.x, t.y - 0.1, t.z); S.set(t.r, t.h / 1.45, t.r); return null; }, true);
    // 古堡：幽光古堡是黑色剪影 + 窗戶燈光；天空之城是白色城堡，坐在浮空岩島上（fy = 浮空高度）
    make(G.castle, vcolMat, groups.castle, (t, P, S) => { P.set(t.x, (t.fy ?? t.y) - 4, t.z); S.set(t.r, t.h, t.r); return t.white ? c.setRGB(2.6, 2.6, 2.75) : null; }, false);
    const isleRock = new THREE.MeshStandardMaterial({ color: 0x9a8a72, roughness: 0.95, flatShading: true });
    for (const t of groups.castle || []) {
      if (t.white) { const base = new THREE.Mesh(new THREE.ConeGeometry(t.r * 0.95, t.h * 0.75, 8), isleRock); base.rotation.x = Math.PI; base.position.set(t.x, (t.fy ?? t.y) - 4 - t.h * 0.37, t.z); g.add(base); continue; }
      for (let k = 0; k < 6; k++) g.add(glowSprite(this, new THREE.Vector3(t.x + (k - 2.5) * t.r * 0.25, t.y - 4 + t.h * (0.35 + (k % 3) * 0.12), t.z), 3.5, 0xffc860, 0.9));
    }
    make(G.block, vcolMat, groups.block, (t, P, S) => { P.set(t.x, t.y - 0.05, t.z); S.set(t.r, t.h / 1.8, t.r); return null; }, true);
    make(G.pyramid, vcolMat, groups.pyramid, (t, P, S) => { P.set(t.x, t.y - 10, t.z); S.set(t.r, t.h, t.r); return null; }, false);
    make(G.obelisk, vcolMat, groups.obelisk, (t, P, S) => { P.set(t.x, t.y - 0.3, t.z); S.set(t.r, t.h, t.r); return t.marble ? c.setRGB(1.25, 1.25, 1.3) : null; }, true);
    make(G.windBody, vcolMat, groups.windmill, (t, P, S) => { P.set(t.x, t.y - 0.5, t.z); S.set(t.r, t.h, t.r); return null; }, false);
    make(G.dome, whiteMat, groups.dome, (t, P, S) => { P.set(t.x, t.y - 0.3, t.z); S.set(t.r, t.h, t.r); return null; }, true);
    make(G.deadtree, coralMat, groups.coral, (t, P, S) => { P.set(t.x, t.y - 0.2, t.z); S.set(t.h * 0.7, t.h, t.h * 0.7); return c.setHSL([0.96, 0.05, 0.8, 0.12][Math.floor(t.tint * 4)], 0.8, 0.6); }, true);
    make(G.lanternPole, poleMat, groups.lantern, (t, P, S) => { P.set(t.x, t.y - 0.1, t.z); S.set(1, t.h, 1); return null; }, true);
    make(G.lanternBulb, bulbMat, groups.lantern, (t, P, S) => { P.set(t.x, t.y + t.h, t.z); S.set(1, 1, 1); return t.neon ? c.setHSL(t.tint < 0.5 ? 0.88 : 0.5, 1, 0.6) : t.rod ? c.setHSL(0.6, 0.9, 0.75) : c.setHSL(0.1, 0.9, 0.65); }, false);
    make(G.bone, boneMat, groups.bone, (t, P, S) => { P.set(t.x, t.y - 1, t.z); S.set(t.r, t.h, t.r); return null; }, true);
    // 風車：葉片另外一組，每幀轉動
    this.windmills = null;
    if (groups.windmill && groups.windmill.length) {
      const im = new THREE.InstancedMesh(G.windBlades, whiteMat, groups.windmill.length);
      im.castShadow = true;
      g.add(im);
      this.windmills = { im, list: groups.windmill };
    }
    make(G.bamboo, vcolMat, groups.bamboo, (t, P, S) => { P.set(t.x, t.y - 0.2, t.z); S.set(t.r, t.h, t.r); return null; }, true);
    make(G.mesa, vcolMat, (groups.mesa || []), (t, P, S) => { P.set(t.x, t.y - 20, t.z); S.set(t.r, t.h, t.r); return t.tint3 ? c.setRGB(...t.tint3) : null; }, false);
    make(G.peak, vcolMat, (groups.peak || []).filter(t => !t.desert), (t, P, S) => { P.set(t.x, t.y - 30, t.z); S.set(t.r, t.h, t.r); return null; }, false);
    make(G.mesa, vcolMat, (groups.peak || []).filter(t => t.desert), (t, P, S) => { P.set(t.x, t.y - 20, t.z); S.set(t.r, t.h, t.r); return c.setRGB(1.06, 0.66, 0.85); }, false);
    make(G.iceberg, vcolMat, groups.iceberg, (t, P, S) => { P.set(t.x, t.y - 15, t.z); S.set(t.r, t.h, t.r); return null; }, false);
    make(G.crystal, crystalMat, groups.crystal, (t, P, S) => { P.set(t.x, t.y - 0.3, t.z); S.set(t.r, t.h, t.r); return c.setHSL(0.5 + t.tint * 0.36, 0.75, 0.55); }, true);
    make(G.basalt, basaltMat, groups.basalt, (t, P, S) => { P.set(t.x, t.y - 0.4, t.z); S.set(t.r, t.h, t.r); return null; }, true);
    make(G.deadtree, deadMat, groups.deadtree, (t, P, S) => { P.set(t.x, t.y - 0.2, t.z); S.set(t.h * 0.55, t.h, t.h * 0.55); return null; }, true);
    make(G.karst, vcolMat, groups.karst, (t, P, S) => { P.set(t.x, t.y - 25, t.z); S.set(t.r, t.h, t.r); return null; }, false);
    make(G.isle, vcolMat, groups.isle, (t, P, S) => { P.set(t.x, t.y, t.z); S.set(t.r, t.h, t.r); return null; }, false);
    make(G.volcano, vcolMat, groups.volcano, (t, P, S) => { P.set(t.x, t.y - 20, t.z); S.set(t.r, t.h, t.r); return null; }, false);
    // 火山口的光與煙
    for (const t of groups.volcano || []) {
      const top = new THREE.Vector3(t.x, t.y - 20 + t.h * 0.93, t.z);
      g.add(glowSprite(this, top, t.r * 0.55, 0xff6a1a, 0.9));
      g.add(glowSprite(this, top.clone().add(new THREE.Vector3(0, t.h * 0.05, 0)), t.r * 0.22, 0xffd27a, 1));
      for (let k = 0; k < 5; k++) g.add(glowSprite(this, top.clone().add(new THREE.Vector3(k * 40, t.h * (0.15 + k * 0.17), k * 15)), t.r * (0.25 + k * 0.1), 0x3a2a26, 0.55, true));
    }
    make(G.cactus, cactusMat, groups.cactus, (t, P, S) => { P.set(t.x, t.y - 0.2, t.z); S.set(t.h * 0.28, t.h * 0.95, t.h * 0.28); return null; }, true);
  }

  buildTeeMarkers(hole, g) {
    const geo = new THREE.SphereGeometry(0.11, 16, 12);
    for (const t of hole.tees) {
      if (hole.course.challenge && t.id !== 'white') continue;          // 挑戰關卡只有一個發球位置
      const mat = new THREE.MeshStandardMaterial({ color: t.color, roughness: 0.35, metalness: 0.1 });
      for (const side of [-1, 1]) {
        const u = t.u + t.dir[1] * side * 3.6 + t.dir[0] * 1.5, v = t.v - t.dir[0] * side * 3.6 + t.dir[1] * 1.5;
        const m = new THREE.Mesh(geo, mat);
        m.position.set(u, hole.heightUV(u, v) + 0.08, -v);
        m.castShadow = true;
        g.add(m);
      }
    }
  }

  buildFlag(hole, g) {
    const [px, pz] = hole.pin;
    const py = hole.height(px, pz);
    const grp = this.flag = new THREE.Group();
    grp.position.set(px, py, pz);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 2.4, 8), new THREE.MeshStandardMaterial({ color: 0xf2e6a8, roughness: 0.4 }));
    pole.position.y = 1.2;
    pole.castShadow = true;
    const cloth = new THREE.PlaneGeometry(0.55, 0.38, 12, 6);
    cloth.translate(0.275, 0, 0);
    this.flagCloth = cloth;
    this.flagBase = cloth.attributes.position.array.slice();
    const flag = new THREE.Mesh(cloth, new THREE.MeshStandardMaterial({ color: 0xb2332b, roughness: 0.8, side: THREE.DoubleSide }));
    flag.position.y = 2.2;
    flag.castShadow = true;
    this.flagMesh = flag;
    // 洞口：寫入模板值 1，掉進洞的球只畫在洞口範圍裡（看起來就是在洞裡）
    const cup = new THREE.Mesh(new THREE.CircleGeometry(0.054, 24), new THREE.MeshBasicMaterial({ color: 0x0b0d08, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp }));
    cup.renderOrder = 4;
    cup.rotation.x = -Math.PI / 2;
    cup.position.y = 0.006;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.056, 24), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.007;
    grp.add(pole, flag, cup, ring);
    g.add(grp);
  }

  // 果嶺高低格線（推桿時顯示）：比果嶺平均高 → 紅、低 → 藍、平 → 綠
  buildGreenGrid(hole, g) {
    const gr = hole.green;
    const pts = [], cols = [];
    const R = Math.max(gr.rx, gr.ry) * 1.3;
    const col = new THREE.Color();
    const gs = hole.greenStats();
    const addSeg = (u0, v0, u1, v1) => {
      const h0 = hole.heightUV(u0, v0) + 0.02, h1 = hole.heightUV(u1, v1) + 0.02;
      const [cr, cg, cb] = heatColor(((h0 + h1) / 2 - 0.02 - gs.h0) / gs.range);
      col.setRGB(cr / 255, cg / 255, cb / 255, THREE.SRGBColorSpace);
      pts.push(u0, h0, -v0, u1, h1, -v1);
      cols.push(col.r, col.g, col.b, col.r, col.g, col.b);
    };
    const stp = 1;
    for (let a = -R; a <= R; a += stp) for (let b2 = -R; b2 <= R; b2 += stp * 0.5) {
      for (const dirc of [0, 1]) {
        const u0 = gr.u + (dirc ? a : b2), v0 = gr.v + (dirc ? b2 : a);
        const u1 = u0 + (dirc ? 0 : stp * 0.5), v1 = v0 + (dirc ? stp * 0.5 : 0);
        if (hole.greenR(u0, v0) < 1.02 && hole.greenR(u1, v1) < 1.02) addSeg(u0, v0, u1, v1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    this.greenGrid = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.75, depthWrite: false }));
    this.greenGrid.visible = false;
    // 坡度箭頭：每 1.6 公尺一個「往下坡」的箭頭，越陡越長、顏色越暖（< 1% 白、1~2% 黃、2~3% 橘、> 3% 紅）；
    //   格線顏色是整個果嶺的相對高低，箭頭是腳下的坡，兩個一起看才知道球會往哪邊轉
    //   箭頭本身不動，箭身上的亮點像水一樣往低處流：越斜流越快（1% 約每秒 0.3 公尺、3% 約 0.8 公尺）
    const ap = [], ac = [], aa = [], st2 = 1.6, e = 0.3;
    const slopeCol = s => s < 0.01 ? [0.92, 0.95, 0.98] : s < 0.02 ? [1, 0.9, 0.25] : s < 0.03 ? [1, 0.55, 0.12] : [1, 0.18, 0.12];
    for (let a = -R; a <= R; a += st2) for (let b2 = -R; b2 <= R; b2 += st2) {
      const u = gr.u + a, v = gr.v + b2;
      if (hole.greenR(u, v) > 0.92) continue;
      const gu = (hole.heightUV(u + e, v) - hole.heightUV(u - e, v)) / (2 * e), gv = (hole.heightUV(u, v + e) - hole.heightUV(u, v - e)) / (2 * e);
      const s = Math.hypot(gu, gv);
      if (s < 0.004) continue;
      const du = -gu / s, dv = -gv / s, L = clamp(0.35 + s * 25, 0.35, 1.15), w = 0.14 + L * 0.28;
      const pt = (pu, pv) => [pu, hole.heightUV(pu, pv) + 0.035, -pv];
      const tip = [u + du * L / 2, v + dv * L / 2], tail = [u - du * L / 2, v - dv * L / 2];
      const c = Math.cos(2.6), sn = Math.sin(2.6);
      const w1 = [tip[0] + (du * c - dv * sn) * w, tip[1] + (du * sn + dv * c) * w], w2 = [tip[0] + (du * c + dv * sn) * w, tip[1] + (-du * sn + dv * c) * w];
      const [r0, g0, b0] = slopeCol(s);
      // 箭身切成小段（才能貼著果嶺起伏），每個點記下「沿箭身的距離」和流速；箭頭兩撇的距離記 -1 = 不流動、一直亮著
      const spd = 0.1 + s * 22, ph = (Math.sin(u * 12.9898 + v * 78.233) * 43758.5453 % 1 + 1) % 1 * 0.4;
      const n = Math.max(2, Math.round(L / 0.12));
      for (let j = 0; j < n; j++) {
        const f0 = j / n, f1 = (j + 1) / n;
        ap.push(...pt(tail[0] + du * L * f0, tail[1] + dv * L * f0), ...pt(tail[0] + du * L * f1, tail[1] + dv * L * f1));
        ac.push(r0, g0, b0, r0, g0, b0);
        aa.push(L * f0 + ph, spd, L * f1 + ph, spd);
      }
      for (const p1 of [w1, w2]) { ap.push(...pt(...tip), ...pt(...p1)); ac.push(r0, g0, b0, r0, g0, b0); aa.push(-1, 0, -1, 0); }
    }
    if (ap.length) {
      const ag = new THREE.BufferGeometry();
      ag.setAttribute('position', new THREE.Float32BufferAttribute(ap, 3));
      ag.setAttribute('color', new THREE.Float32BufferAttribute(ac, 3));
      ag.setAttribute('flow', new THREE.Float32BufferAttribute(aa, 2));
      this.slopeFlow = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, uniforms: { uTime: { value: 0 } },
        vertexShader: `attribute vec3 color; attribute vec2 flow; varying vec3 vC; varying vec2 vF;
          void main() { vC = color; vF = flow; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform float uTime; varying vec3 vC; varying vec2 vF;
          void main() {
            float a = 0.95;
            vec3 c = vC;
            if (vF.x >= 0.0) {
              // 每 0.3 公尺一顆亮點，隨時間往箭頭方向移動（偏白、比較醒目）；亮點之間保留淡淡的箭身
              float k = fract((vF.x - uTime * vF.y) / 0.3);
              float b = smoothstep(0.0, 0.2, k) * (1.0 - smoothstep(0.4, 0.55, k));
              a = 0.18 + 0.82 * b;
              c = mix(vC, vec3(1.0), 0.45 * b);
            }
            gl_FragColor = vec4(c, a);
            #include <colorspace_fragment>
          }`,
      });
      this.greenGrid.add(new THREE.LineSegments(ag, this.slopeFlow));
    } else this.slopeFlow = null;
    g.add(this.greenGrid);
  }

  // 練習場沙坑：把發球台換成一片沙地（傳 null 隱藏）
  setSandPatch(tee) {
    if (!this.sandPatch) {
      const tex = this.tex.sandD.clone();
      tex.needsUpdate = true;
      tex.repeat.set(3, 2);
      const m = new THREE.MeshStandardMaterial({ map: tex, normalMap: this.tex.sandN, color: 0xf2e6c8, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      const g = new THREE.PlaneGeometry(12, 9, 1, 1);
      g.rotateX(-Math.PI / 2);
      this.sandPatch = new THREE.Mesh(g, m);
      this.sandPatch.receiveShadow = true;
      this.scene.add(this.sandPatch);
    }
    this.sandPatch.visible = !!tee && !!this.hole;
    if (!this.sandPatch.visible) return;
    this.sandPatch.position.set(tee.u, this.hole.heightUV(tee.u, tee.v) + 0.004, -tee.v);
    this.sandPatch.rotation.y = -Math.atan2(tee.dir[0], tee.dir[1]);
  }

  // ---------- 球、陰影、彈道、瞄準 ----------
  buildBall() {
    const tex = makeDimpleNormal();
    const ball = this.ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 32, 20), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, normalMap: tex, normalScale: new THREE.Vector2(0.6, 0.6), envMapIntensity: 0.9 }));
    // 洞裡的球：只保留洞口以下的部分（裁切面 y ≤ 洞口），不做深度測試，畫在黑色洞口上面；洞裡比較暗
    this.renderer.localClippingEnabled = true;
    this.cupClip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    this.cupBall = new THREE.Mesh(ball.geometry, new THREE.MeshBasicMaterial({ color: 0x9a9a92, depthTest: false, depthWrite: false, clippingPlanes: [this.cupClip],
      stencilWrite: true, stencilRef: 1, stencilFunc: THREE.EqualStencilFunc, stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp }));
    this.cupBall.renderOrder = 5; this.cupBall.visible = false;
    ball.castShadow = true;
    this.scene.add(ball);
    this.scene.add(this.cupBall);
    const sh = this.ballShadow = new THREE.Mesh(new THREE.CircleGeometry(BALL_R * 1.1, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2;
    this.scene.add(sh);
  }

  // 球的皮膚：顏色、自發光、彈道顏色（七彩球的彈道會變色）
  setBallSkin(skin) {
    const m = this.ball.material;
    const std = !skin || skin.std;
    m.color.set(std ? 0xffffff : skin.color);
    m.emissive.set(std || !skin.glow ? 0x000000 : skin.glow);
    m.emissiveIntensity = std ? 0 : 0.9;
    this.trailMode = std ? null : skin.trail === 'rainbow' || skin.trail === 'galaxy' ? skin.trail : null;
    this.tracer.material.color.set(std ? 0xf2d27a : this.trailMode ? 0xb87aff : skin.trail);
    this.tracer.material.opacity = std ? 0.85 : 0.95;
  }

  // 特殊外觀的小特效（只是畫面，不影響打球）：球飛行時拖著粒子、靜止時偶爾冒一點；桿頭一直飄出粒子，揮桿時變多
  // ballFx / clubFx = progress.js 外觀的 fx；clubHead() 回傳目前桿頭的模型
  setSkinFx(ballFx, clubFx, clubHead) { this.ballFx = ballFx || null; this.clubFx = clubFx || null; this.clubHead = clubHead || null; }
  updateSkinFx(dt) {
    const N = 360;
    if (!this.skinPts) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3).fill(-9999), 3));
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
      this.ensureSpark();
      this.skinPts = new THREE.Points(geo, new THREE.PointsMaterial({ map: this.sparkTex, size: 0.16, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      this.skinPts.renderOrder = 10;      // 跟彈道線一樣排在水面之後畫
      this.skinPts.frustumCulled = false;
      this.scene.add(this.skinPts);
      this.skinP = Array.from({ length: N }, () => ({ p: new THREE.Vector3(0, -9999, 0), v: new THREE.Vector3(), life: 0, max: 1, c: new THREE.Color() }));
      this.skinNext = 0; this.lastBall = new THREE.Vector3(); this.lastHead = new THREE.Vector3(); this.emitAcc = [0, 0];
    }
    const FX = {
      gold: [[0xffd860, 0xfff0a0, 0xffb830], 0.2], frost: [[0xbfefff, 0xffffff, 0x8ad8ff], 0.1], galaxy: [[0x9a4aff, 0x4a8aff, 0xff6ae0, 0xffffff], 0.15],
      ember: [[0xff6a1a, 0xffb04a, 0xff3a0a], 0.9], void: [[0x8a5aff, 0x5a3aff], 0.2], moon: [[0xe0e8ff, 0xb8c8ff], 0.15], petal: [[0xffc8dc, 0xffe0ea], -0.4],
      firefly: [[0xd8ff5a, 0xa8ff8a], 0.25], spore: [[0xff8ae0, 0xffc8f0, 0xb08aff], 0.3], portal: [[0xb87aff, 0x7ad8ff], 0.2], star: [[0xfff0a0, 0xffffff], 0.15],
      rainbow: [null, 0.3], neon: [[0xff4ac8, 0x4ae8ff], 0.2], aurora: [[0x3aff9a, 0xb88aff], 0.4], sun: [[0xffc040, 0xff7a10, 0xffe080], 0.6],
    };
    const emit = (pos, fx, spread) => {
      const conf = FX[fx]; if (!conf) return;
      const a = this.skinP[this.skinNext]; this.skinNext = (this.skinNext + 1) % N;
      a.p.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread));
      a.v.set((Math.random() - 0.5) * 0.6, conf[1] + Math.random() * 0.3, (Math.random() - 0.5) * 0.6);
      a.life = a.max = 0.6 + Math.random() * 0.7;
      if (conf[0]) a.c.set(conf[0][Math.floor(Math.random() * conf[0].length)]); else a.c.setHSL(Math.random(), 0.9, 0.6);
    };
    // 球：飛行（每幀移動超過 5 公分）時大量、靜止時偶爾
    const b = this.ball.position;
    if (this.ballFx && this.hole) {
      const moving = b.distanceTo(this.lastBall) > 0.05;
      this.emitAcc[0] += dt * (moving ? 90 : 5);
      const spread = moving ? 0.25 * this.ball.scale.x : 0.12;
      while (this.emitAcc[0] >= 1) { this.emitAcc[0]--; emit(b, this.ballFx, spread); }
    }
    this.lastBall.copy(b);
    // 桿頭：揮桿（移動快）時多、平常少
    const head = this.clubFx && this.clubHead && this.clubHead();
    if (head && head.visible !== false) {
      const hp = new THREE.Vector3(); head.getWorldPosition(hp);
      const fast = hp.distanceTo(this.lastHead) / Math.max(dt, 1e-3) > 4;
      this.emitAcc[1] += dt * (fast ? 120 : 8);
      while (this.emitAcc[1] >= 1) { this.emitAcc[1]--; emit(hp, this.clubFx, 0.06); }
      this.lastHead.copy(hp);
    }
    const pos = this.skinPts.geometry.attributes.position.array, col = this.skinPts.geometry.attributes.color.array;
    for (let i = 0; i < N; i++) {
      const a = this.skinP[i];
      if (a.life > 0) { a.life -= dt; a.p.addScaledVector(a.v, dt); a.v.multiplyScalar(0.97); }
      const k = a.life > 0 ? Math.min(1, a.life / a.max * 1.6) : 0;
      pos[i * 3] = a.p.x; pos[i * 3 + 1] = a.life > 0 ? a.p.y : -9999; pos[i * 3 + 2] = a.p.z;
      col[i * 3] = a.c.r * k; col[i * 3 + 1] = a.c.g * k; col[i * 3 + 2] = a.c.b * k;
    }
    this.skinPts.geometry.attributes.position.needsUpdate = true;
    this.skinPts.geometry.attributes.color.needsUpdate = true;
    // 粒子大小跟著球放大（遠處的球也看得到）
    this.skinPts.material.size = 0.22 * Math.min(4, Math.max(1, this.ball.scale.x * 0.6));
  }

  // 畫面上地形網格（每 1.5m 一個點、三角形內插）的高度。凹下去的地方（沙坑）網格會比物理高度高一點
  meshHeight(x, z) {
    const g = this.tgrid;
    if (!g) return this.hole ? this.hole.height(x, z) : 0;
    const fi = (x - g.minU) / g.step, fj = (-z - g.minV) / g.step;
    const i = Math.max(0, Math.min(g.nx - 2, Math.floor(fi))), j = Math.max(0, Math.min(g.nz - 2, Math.floor(fj)));
    const fx = Math.max(0, Math.min(1, fi - i)), fz = Math.max(0, Math.min(1, fj - j));
    const H = (ii, jj) => g.pos[((jj * g.nx) + ii) * 3 + 1];
    const h00 = H(i, j), h10 = H(i + 1, j), h01 = H(i, j + 1), h11 = H(i + 1, j + 1);
    if (fx + fz <= 1) return h00 + (h10 - h00) * fx + (h01 - h00) * fz;
    return h11 + (h01 - h11) * (1 - fx) + (h10 - h11) * (1 - fz);
  }

  setBall(x, y, z) {
    const gh0 = this.hole ? this.hole.height(x, z) : y - BALL_R;
    // 洞杯範圍內不把球往上墊：進洞時球會真的往下掉
    const pin = this.hole && this.hole.pin, inCup = pin && Math.hypot(x - pin[0], z - pin[1]) < 0.056;
    // 球在地面上時，畫在「畫面網格」上面，不會看起來陷進沙裡或草裡
    if (this.hole && !inCup && y - gh0 < BALL_R + 0.05) y = Math.max(y, this.meshHeight(x, z) + BALL_R);
    this.ball.position.set(x, y, z);
    // 掉進洞裡的那一段：草地會把球蓋住，所以另外畫一顆「從洞口看進去」的球（只畫地面以下的部分、不被草地擋住）
    if (this.cupBall) {
      const cupY = pin ? this.hole.height(pin[0], pin[1]) + 0.006 : 0;
      const show = !!inCup && y - BALL_R < cupY;
      this.cupBall.visible = show;
      if (show) { this.cupBall.position.set(x, y, z); this.cupBall.scale.copy(this.ball.scale); this.cupClip.constant = cupY; this.cupBall.material.color.copy(this.ball.material.color).multiplyScalar(0.62); }
    }
    const gh = gh0;
    this.ballShadow.position.set(x, gh + 0.01, z);
    const air = y - gh - BALL_R;
    this.ballShadow.visible = air > 0.05;
    this.ballShadow.material.opacity = clamp(0.35 - air * 0.006, 0.08, 0.35);
  }

  buildMarkers() {
    // 預估落點：一個白點（外圈一點深色邊，在亮草地上也看得到）
    const edge = new THREE.Mesh(new THREE.CircleGeometry(0.62, 32), new THREE.MeshBasicMaterial({ color: 0x0b1510, transparent: true, opacity: 0.45, depthWrite: false }));
    edge.rotation.x = -Math.PI / 2;
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, depthWrite: false }));
    dot.rotation.x = -Math.PI / 2;
    dot.position.y = 0.01;
    const tgt = this.target = new THREE.Group();
    tgt.add(edge, dot);
    tgt.renderOrder = 5;
    this.scene.add(tgt);
    // 推桿預測線
    const pl = new THREE.BufferGeometry();
    pl.setAttribute('position', new THREE.BufferAttribute(new Float32Array(600 * 3), 3));
    this.puttLine = new THREE.Points(pl, new THREE.PointsMaterial({ color: 0xffffff, size: 0.07, transparent: true, opacity: 0.95, depthWrite: false, depthTest: false }));
    this.puttLine.visible = false;
    this.puttLine.renderOrder = 10;   // 不做深度測試：草地網格起伏不會把引導線蓋掉
    this.puttLine.frustumCulled = false;
    this.scene.add(this.puttLine);
  }

  setTarget(x, z, scale = 1, visible = true) {
    this.target.visible = visible;
    if (!visible || !this.hole) return;
    this.target.position.set(x, this.hole.height(x, z) + 0.08, z);

  }

  setPuttLine(points) {
    if (!points) { this.puttLine.visible = false; return; }
    const arr = this.puttLine.geometry.attributes.position.array;
    const n = Math.min(points.length, 600);
    for (let i = 0; i < n; i++) { arr[i * 3] = points[i][0]; arr[i * 3 + 1] = points[i][1] + 0.015; arr[i * 3 + 2] = points[i][2]; }
    this.puttLine.geometry.setDrawRange(0, n);
    this.puttLine.geometry.attributes.position.needsUpdate = true;
    this.puttLine.visible = true;
  }

  buildTracer() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(1200 * 6), 3));
    const idx = [];
    for (let i = 0; i < 1199; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    geo.setIndex(idx);
    this.tracer = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xf2d27a, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
    this.tracer.frustumCulled = false;
    // 半透明的彈道線不寫深度：要排在水面（也是半透明）之後畫，不然水面會整片蓋在飛越水池的彈道上
    this.tracer.renderOrder = 10;
    this.tracerPts = [];
    this.scene.add(this.tracer);
  }

  clearTracer() { this.tracerPts = []; this.tracer.geometry.setDrawRange(0, 0); }
  pushTracer(x, y, z) { if (this.tracerPts.length < 1200) this.tracerPts.push(new THREE.Vector3(x, y, z)); }

  updateTracer() {
    const pts = this.tracerPts, n = pts.length;
    if (n < 2) { this.tracer.geometry.setDrawRange(0, 0); return; }
    const arr = this.tracer.geometry.attributes.position.array;
    const cam = this.camera.position, t = new THREE.Vector3(), v = new THREE.Vector3(), o = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      t.subVectors(b, a).normalize();
      v.subVectors(pts[i], cam);
      const w = Math.max(0.025, v.length() * 0.0022);
      o.crossVectors(t, v).normalize().multiplyScalar(w);
      arr[i * 6] = pts[i].x + o.x; arr[i * 6 + 1] = pts[i].y + o.y; arr[i * 6 + 2] = pts[i].z + o.z;
      arr[i * 6 + 3] = pts[i].x - o.x; arr[i * 6 + 4] = pts[i].y - o.y; arr[i * 6 + 5] = pts[i].z - o.z;
    }
    this.tracer.geometry.attributes.position.needsUpdate = true;
    this.tracer.geometry.setDrawRange(0, (n - 1) * 6);
  }

  // OK 推範圍：以洞為中心、半徑 = OK 推距離的淡白色圓圈（貼著果嶺起伏）。radius = 0 隱藏
  setGimmeRing(radius) {
    if (this.gimmeRing && (this.gimmeRing.userData.r !== radius || this.gimmeRing.userData.hole !== this.hole)) {
      this.scene.remove(this.gimmeRing); this.gimmeRing.geometry.dispose(); this.gimmeRing.material.dispose(); this.gimmeRing = null;
    }
    if (!radius || !this.hole) { if (this.gimmeRing) this.gimmeRing.visible = false; return; }
    if (!this.gimmeRing) {
      const [px, pz] = this.hole.pin;
      const pts = [];
      for (let i = 0; i < 96; i++) {
        const a = i / 96 * Math.PI * 2, x = px + Math.cos(a) * radius, z = pz + Math.sin(a) * radius;
        pts.push(new THREE.Vector3(x, this.meshHeight(x, z) + 0.02, z));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      this.gimmeRing = new THREE.LineLoop(geo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }));
      this.gimmeRing.renderOrder = 6;
      this.gimmeRing.userData = { r: radius, hole: this.hole };
      this.scene.add(this.gimmeRing);
    }
    this.gimmeRing.visible = true;
  }

  // 進洞小動畫：洞口噴出金色、白色小火花（受重力落下、慢慢淡出）
  cupBurst(x, y, z, hue = null, scale = 1) {
    const n = Math.round(80 * Math.min(2, scale));
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const vel = [];
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      pos[i * 3] = x; pos[i * 3 + 1] = y + 0.02; pos[i * 3 + 2] = z;
      const a = Math.random() * Math.PI * 2, sp = (0.4 + Math.random() * 0.9) * scale;
      vel.push([Math.cos(a) * sp, (1.6 + Math.random() * 1.8) * scale, Math.sin(a) * sp]);
      c.setHSL((hue ?? 0.09) + Math.random() * 0.06, 1, Math.random() < 0.25 ? 0.85 : 0.55);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.ensureSpark();
    const mat = new THREE.PointsMaterial({ map: this.sparkTex, size: 0.11 * scale * scale, vertexColors: true, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    this.scene.add(pts);
    (this.bursts = this.bursts || []).push({ pts, vel, t: 0, y0: y });
  }

  // 圓形光點貼圖（中心亮、邊緣漸淡；進洞火花、環境粒子、光暈共用）
  ensureSpark() {
    if (!this.sparkTex) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 64;
      const cx = cv.getContext('2d');
      const gr = cx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      cx.fillStyle = gr; cx.fillRect(0, 0, 64, 64);
      this.sparkTex = new THREE.CanvasTexture(cv);
    }
  }

  updateBursts(dt) {
    if (!this.bursts || !this.bursts.length) return;
    for (const b of this.bursts) {
      b.t += dt;
      const p = b.pts.geometry.attributes.position;
      for (let i = 0; i < b.vel.length; i++) {
        const v = b.vel[i];
        v[1] -= 6 * dt;
        p.setXYZ(i, p.getX(i) + v[0] * dt, Math.max(b.y0 - 50, p.getY(i) + v[1] * dt), p.getZ(i) + v[2] * dt);
      }
      p.needsUpdate = true;
      b.pts.material.opacity = Math.max(0, 1 - b.t / 1.3);
    }
    this.bursts = this.bursts.filter(b => {
      if (b.t < 1.3) return true;
      this.scene.remove(b.pts); b.pts.geometry.dispose(); b.pts.material.dispose();   // 貼圖共用，不釋放
      return false;
    });
  }

  // 風紋：鏡頭附近飄過的細白線，數量、速度、亮度隨風速增加（15 mph 最明顯）
  updateWindStreaks(dt, windVec) {
    const N = 140;
    if (!this.streaks) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 6), 3));
      const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
      this.streaks = new THREE.LineSegments(geo, mat);
      this.streaks.frustumCulled = false;
      this.scene.add(this.streaks);
      this.streakData = Array.from({ length: N }, () => ({ p: new THREE.Vector3(), life: 0, len: 2, phase: Math.random() * 6 }));
    }
    const ws = windVec ? Math.hypot(windVec[0], windVec[1]) : 0;
    const strength = clamp(ws / 6.7, 0, 1);            // 6.7 m/s ≈ 15 mph
    const count = Math.round(strength * N);
    this.streaks.visible = count > 0 && !!this.hole;
    if (!this.streaks.visible) return;
    this.streaks.material.opacity = 0.12 + 0.28 * strength;
    const dir = new THREE.Vector3(windVec[0], 0, windVec[1]).normalize();
    const cam = this.camera.position;
    const fwd = new THREE.Vector3(); this.camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
    const center = cam.clone().addScaledVector(fwd, 18);
    const R = 26;
    const arr = this.streaks.geometry.attributes.position.array;
    const speed = ws * 1.6 + 2;
    for (let i = 0; i < N; i++) {
      const s = this.streakData[i];
      if (i >= count) { arr.fill(0, i * 6, i * 6 + 6); continue; }
      s.life -= dt;
      const ox = s.p.x - center.x, oz = s.p.z - center.z;   // 不建立新物件，避免每幀大量垃圾回收造成卡頓
      if (s.life <= 0 || ox * ox + oz * oz > R * R) {
        // 從上風處重新出現
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * R;
        s.p.set(center.x + Math.cos(a) * r, 0, center.z + Math.sin(a) * r).addScaledVector(dir, -R * 0.5 * Math.random());
        const gh = this.hole.height(s.p.x, s.p.z);
        s.p.y = gh + 0.4 + Math.random() * 6;
        s.life = 1.5 + Math.random() * 2.5;
        s.len = (1.2 + Math.random() * 2.5) * (0.6 + strength);
      }
      s.p.addScaledVector(dir, speed * dt);
      s.p.y += Math.sin(this.time * 2 + s.phase) * 0.15 * dt;
      arr[i * 6] = s.p.x; arr[i * 6 + 1] = s.p.y; arr[i * 6 + 2] = s.p.z;
      arr[i * 6 + 3] = s.p.x - dir.x * s.len; arr[i * 6 + 4] = s.p.y; arr[i * 6 + 5] = s.p.z - dir.z * s.len;
    }
    this.streaks.geometry.attributes.position.needsUpdate = true;
  }

  // ---------- 每幀 ----------
  // 自動畫質：連續約 2 秒每幀超過 1/32 秒（低於約 30fps），就把解析度降一級；最後一級再縮小陰影。只降不升，確保流暢
  watchPerf(dt) {
    const pf = this.perf || (this.perf = { ema: 1 / 60, slow: 0, level: 0 });
    pf.ema += (dt - pf.ema) * 0.05;
    if (pf.ema > 1 / 32) pf.slow += dt; else pf.slow = Math.max(0, pf.slow - dt * 0.5);
    if (pf.slow < 2 || pf.level >= 4) return;
    pf.slow = 0;
    pf.level++;
    const r = this.renderer;
    if (pf.level <= 3) {
      r.setPixelRatio(Math.max(0.75, r.getPixelRatio() * 0.8));
      this._w = 0;                     // 讓下一幀重新設定畫布大小
    } else {
      this.sun.shadow.mapSize.set(1024, 1024);
      if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    }
    console.info('[Dixen] 畫面較慢，自動降低畫質一級', pf.level, r.getPixelRatio());
  }

  frame(dt, windVec) {
    this.time += dt;
    this.watchPerf(dt);
    // 手機轉向時 resize 事件可能比版面更新早，所以每幀檢查一次畫布大小
    if (this.canvas.clientWidth !== this._w || this.canvas.clientHeight !== this._h) this.resize();
    // 球在遠處放大，維持最小可見尺寸
    const d = this.camera.position.distanceTo(this.ball.position);
    this.ball.scale.setScalar(Math.max(1, d * 0.0028 / (2 * BALL_R)));
    this.ballShadow.scale.setScalar(this.ball.scale.x);
    // 陰影跟著鏡頭關注點
    const focus = this.shadowFocus || this.ball.position;
    this.sun.target.position.copy(focus);
    this.sun.position.copy(focus).addScaledVector(this.sunDir, 200);
    if (this.waterMats) for (const m of this.waterMats) { m.normalMap.offset.x = this.time * 0.012; m.normalMap.offset.y = this.time * 0.007; if (m.emissiveMap) m.emissiveIntensity = 1.35 + 0.25 * Math.sin(this.time * 1.3); }
    if (this.lavaTex) { this.lavaTex.offset.x = this.time * 0.006; this.lavaTex.offset.y = Math.sin(this.time * 0.1) * 0.03; }
    this.updateAmbient(dt);
    if (this.specialAnims) for (const f of this.specialAnims) f(this.time);
    if (this.skyAnims) for (const f of this.skyAnims) f(this.time);
    if (this.specialPulses) for (const k in this.specialPulses) this.specialPulses[k] = Math.max(0, this.specialPulses[k] - dt * 1.5);
    if (this.aurora) this.aurora.uniforms.uTime.value = this.time;
    if (this.fxFades) this.fxFades = this.fxFades.filter(f => f(dt));
    // 雷鳴高原：天空偶爾閃一下；閃電打中球時畫面也亮一下
    if (this.curTheme === 'storm' && this.time > (this.stormNext || 0)) { if (this.stormNext) this.flashT = Math.max(this.flashT || 0, 0.18); this.stormNext = this.time + 6 + Math.random() * 9; }
    this.themeAtmos();
    if (THEMES[this.curTheme]) {
      const base = THEMES[this.curTheme].exposure;
      this.flashT = Math.max(0, (this.flashT || 0) - dt);
      this.renderer.toneMappingExposure = base * (1 + (this.flashT > 0 ? 1.6 * this.flashT / 0.35 * (0.6 + 0.4 * Math.random()) : 0));
    }
    if (this.windmills) {
      const { im, list } = this.windmills, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
      list.forEach((t, i) => { e.set(0, t.rot, this.time * (0.6 + t.tint * 0.4), 'YXZ'); q.setFromEuler(e); p.set(t.x - Math.sin(t.rot) * t.r * 0.9, t.y - 0.5 + t.h * 1.05, t.z - Math.cos(t.rot) * t.r * 0.9); sc.setScalar(t.h * 0.5); m4.compose(p, q, sc); im.setMatrixAt(i, m4); });
      im.instanceMatrix.needsUpdate = true;
    }
    if (this.trailMode === 'rainbow') this.tracer.material.color.setHSL((this.time * 0.35) % 1, 0.9, 0.62);
    else if (this.trailMode === 'galaxy') this.tracer.material.color.setHSL(0.68 + 0.14 * Math.sin(this.time * 1.6), 0.85, 0.62);
    this.updateSkinFx(dt);
    if (this.flagCloth && windVec) {
      const p = this.flagCloth.attributes.position, base = this.flagBase;
      const ws = Math.hypot(windVec[0], windVec[1]);
      for (let i = 0; i < p.count; i++) {
        const x = base[i * 3], y = base[i * 3 + 1];
        const amp = 0.02 + ws * 0.006;
        p.setZ(i, Math.sin(x * 9 - this.time * (4 + ws * 0.6) + y * 2) * amp * (x / 0.55));
        p.setY(i, y - x * Math.max(0, 0.5 - ws * 0.06) * 0.6);
      }
      p.needsUpdate = true;
      this.flagCloth.computeVertexNormals();
      if (ws > 0.1) this.flagMesh.rotation.y = Math.atan2(-windVec[1], windVec[0]);
    }
    if (this.greenGrid && this.greenGrid.visible) {
      this.greenGrid.material.opacity = 0.68 + 0.1 * Math.sin(this.time * 2);
      if (this.slopeFlow) this.slopeFlow.uniforms.uTime.value = this.time;
    }
    // 落點白點依距離放大，在畫面上大約維持同樣大小
    if (this.target.visible) this.target.scale.setScalar(Math.max(0.3, this.camera.position.distanceTo(this.target.position) * 0.011));
    this.updateBursts(dt);
    if (this.windU && windVec) { this.windU.uTime.value = this.time; this.windU.uWind.value.set(windVec[0], windVec[1]); }
    this.updateWindStreaks(dt, windVec);
    this.updateTracer();
    this.renderer.render(this.scene, this.camera);
  }

  // 主題的空氣粒子：叢林 = 一明一滅的螢火蟲、熔岩 = 往上飄的火星、浮島 = 星塵、蘑菇森林 = 螢火蟲與彩色孢子、冰原 = 飄雪
  updateAmbient(dt) {
    const theme = this.hole && this.hole.course.theme;
    const N = 320;
    if (!this.ambient) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
      this.ensureSpark();
      const mat = new THREE.PointsMaterial({ map: this.sparkTex, size: 0.35, vertexColors: true, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending });
      this.ambient = new THREE.Points(geo, mat);
      this.ambient.frustumCulled = false;
      this.scene.add(this.ambient);
      this.ambData = Array.from({ length: N }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0, ph: Math.random() * 6, c: new THREE.Color(), blink: 1 + Math.random() * 2 }));
    }
    this.ambient.visible = !!theme;
    if (!theme) return;
    // [顏色們, 大小, 數量, 是否閃爍, 上下速度, 範圍]
    const conf = {
      jungle: [[0xd8ff5a, 0xfff07a, 0xa8ff8a], 0.42, 240, true, 0, 30],
      lava: [[0xff7a2a, 0xffb04a, 0xff4a1a], 0.32, 260, false, 1.2, 34],
      void: [[0xb8e6ff, 0xe0b8ff, 0xffffff], 0.3, 220, true, 0, 36],
      mushroom: [[0x7af0ff, 0xff8ae8, 0xc8ff7a, 0xb08aff], 0.45, 320, true, 0.15, 30],
      frost: [[0xffffff, 0xe8f2ff], 0.22, 320, false, -1.4, 28],
      sakura: [[0xffc8dc, 0xffe0ea, 0xf4a8c4], 0.28, 220, false, -0.5, 30],
      candy: [[0xff6a9a, 0x6ac8ff, 0xfff06a, 0xa06aff, 0x6aff9a], 0.3, 240, false, -0.4, 30],
      reef: [[0xd8f8ff, 0xaaeeff], 0.32, 260, false, 1.1, 26],
      autumn: [[0xe86a2a, 0xf0a030, 0xc83a1a], 0.3, 200, false, -0.6, 30],
      lavender: [[0xb08ae0, 0xd8b8ff], 0.24, 160, false, -0.4, 30],
      swamp: [[0xc8ff6a, 0xa8ff8a], 0.42, 200, true, 0, 28],
      egypt: [[0xf0d8a0], 0.2, 160, false, 0.1, 30],
      mars: [[0xe0a070, 0xc8805a], 0.24, 200, false, 0.1, 32],
      neon: [[0xff4ac8, 0x4ae8ff, 0xb86aff], 0.34, 220, true, 0.1, 30],
      crystal: [[0xb88aff, 0x6ad8ff, 0xffffff], 0.3, 240, true, 0.05, 30],
      sky: [[0xffffff], 0.22, 120, false, -0.3, 30],
      honey: [[0xffd84a, 0xfff2a0, 0xffb020], 0.26, 220, true, 0.05, 28],
      clock: [[0xffa040, 0xffd080], 0.16, 160, false, 0.7, 28],
      haunt: [[0x9affc8, 0xc8d8ff], 0.5, 110, true, 0.05, 30],
      toy: [[0xff5a5a, 0xffd84a, 0x4a9aff, 0x6ae86a], 0.28, 180, false, -0.4, 30],
      storm: [[0xc8d8f0, 0xa8b8d0], 0.14, 380, false, -9, 24],
    }[theme];
    if (!conf) { this.ambient.visible = false; return; }
    const [cols, size, n, blink, vy0, R] = conf;
    this.ambient.material.size = size;
    const cam = this.camera.position, pos = this.ambient.geometry.attributes.position.array, col = this.ambient.geometry.attributes.color.array;
    if (this.ambTheme !== theme) { this.ambTheme = theme; this.ambData.forEach((a, i) => { a.life = 0; a.c.set(cols[i % cols.length]); }); }
    for (let i = 0; i < N; i++) {
      const a = this.ambData[i];
      if (i >= n) { pos[i * 3 + 1] = -9999; continue; }
      a.life -= dt;
      const dx = a.p.x - cam.x, dz = a.p.z - cam.z;
      if (a.life <= 0 || dx * dx + dz * dz > R * R || (vy0 < 0 && a.p.y < this.hole.height(a.p.x, a.p.z))) {
        const ang = Math.random() * Math.PI * 2, r = 3 + Math.sqrt(Math.random()) * R;
        a.p.set(cam.x + Math.cos(ang) * r, 0, cam.z + Math.sin(ang) * r);
        const gh = this.hole.height(a.p.x, a.p.z);
        a.p.y = vy0 < 0 ? cam.y + 4 + Math.random() * 16 : Math.max(gh, cam.y - 25) + 0.5 + Math.random() * (theme === 'jungle' || theme === 'mushroom' ? 6 : 14);
        a.v.set((Math.random() - 0.5) * 0.6, vy0 + (vy0 > 0.5 ? Math.random() * 1.4 : (Math.random() - 0.5) * 0.3), (Math.random() - 0.5) * 0.6);
        a.life = 3 + Math.random() * 6;
      }
      a.p.addScaledVector(a.v, dt);
      a.p.x += Math.sin(this.time * 0.9 + a.ph) * (vy0 < 0 ? 0.6 : 0.25) * dt;
      a.p.y += (theme === 'jungle' || theme === 'mushroom') ? Math.sin(this.time * 1.7 + a.ph) * 0.25 * dt : 0;
      pos[i * 3] = a.p.x; pos[i * 3 + 1] = a.p.y; pos[i * 3 + 2] = a.p.z;
      // 螢火蟲：一明一滅（每隻節奏不同）
      const k = blink ? Math.max(0.05, Math.sin(this.time * a.blink + a.ph)) ** 2 : 0.85;
      col[i * 3] = a.c.r * k; col[i * 3 + 1] = a.c.g * k; col[i * 3 + 2] = a.c.b * k;
    }
    this.ambient.geometry.attributes.position.needsUpdate = true;
    this.ambient.geometry.attributes.color.needsUpdate = true;
  }

  // 把世界座標投影成畫面像素（HUD 標籤用）
  project(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    return { x: (v.x + 1) / 2 * w, y: (1 - v.y) / 2 * h, visible: v.z < 1 && v.z > -1 };
  }
}

// 讓出一個畫面更新；分頁在背景時 requestAnimationFrame 不會觸發，用 setTimeout 保底
const frame = () => new Promise(r => { requestAnimationFrame(() => r()); setTimeout(r, 60); });

// 星門中間的漩渦（白色，材質再上色）
let _swirl = null;
function swirlTexture() {
  if (_swirl) return _swirl;
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d'), img = x.createImageData(S, S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const dx = i / S * 2 - 1, dy = j / S * 2 - 1, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    const arm = 0.5 + 0.5 * Math.sin(a * 3 + r * 14);
    const v = r > 1 ? 0 : Math.pow(arm, 2) * (1 - r) * 1.2 + Math.max(0, 0.6 - r) * 0.8;
    const o = (j * S + i) * 4; img.data[o] = img.data[o + 1] = img.data[o + 2] = 255 * clamp(v, 0, 1); img.data[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  _swirl = new THREE.CanvasTexture(c);
  return _swirl;
}

// 用世界座標當 UV（熔岩貼圖約 36 公尺重複一次）
function worldUv(geo) {
  const p = geo.attributes.position, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) / 36; uv[i * 2 + 1] = p.getZ(i) / 36; }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

// 自己會發光的材質（顏色 = 實例顏色）：水晶
function glowMaterial(opts, glow) {
  const m = new THREE.MeshStandardMaterial(opts);
  m.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance += diffuseColor.rgb * ${glow.toFixed(2)};`);
  };
  return m;
}

// 柔和的光暈 / 煙（永遠面向鏡頭）
function glowSprite(world, pos, size, color, opacity, smoke = false) {
  world.ensureSpark();
  const m = new THREE.SpriteMaterial({ map: world.sparkTex, color, transparent: true, opacity, depthWrite: false, blending: smoke ? THREE.NormalBlending : THREE.AdditiveBlending, fog: false });
  const sp = new THREE.Sprite(m);
  sp.position.copy(pos); sp.scale.set(size, size, 1);
  return sp;
}

// 熔岩：黑色的冷卻外殼 + 發光的裂縫（可無縫重複）
function makeLavaTexture() {
  const S = 512, n = makeNoise(31);
  const c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d'), img = x.createImageData(S, S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const a = i / S * Math.PI * 2, b = j / S * Math.PI * 2;
    const X = Math.cos(a) * 1.6, Y = Math.sin(a) * 1.6, Z = Math.cos(b) * 1.6, W = Math.sin(b) * 1.6;
    const f = n.fbm(X + Z * 0.7 + 5, Y + W * 0.7, 5);
    const cr = 1 - Math.min(1, Math.abs(n(X * 2.2 + W, Y * 2.2 + Z) * 3.2));      // 裂縫（雜訊接近 0 的細線）
    let h = clamp(0.55 + f * 0.9, 0, 1) * 0.65 + Math.pow(cr, 3) * 0.6;
    h = clamp(h, 0, 1);
    const o = (j * S + i) * 4;
    img.data[o] = 255 * clamp(h * 1.6, 0, 1); img.data[o + 1] = 255 * clamp((h - 0.35) * 1.5, 0, 1) * 0.8; img.data[o + 2] = 255 * clamp((h - 0.8) * 3, 0, 1) * 0.5; img.data[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// 主題天空（等距長方投影：上半是天空，下半是地平線以下）
function paintSky(theme) {
  const W = 2048, H = 1024, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d'), rng = makeRng(theme.length * 97 + 3);
  const grad = stops => { const g = x.createLinearGradient(0, 0, 0, H); stops.forEach(([t, col]) => g.addColorStop(t, col)); x.fillStyle = g; x.fillRect(0, 0, W, H); };
  const blob = (cx, cy, r, col, a, sy = 1, wrap = true) => {
    x.save(); x.translate(cx, cy); x.scale(1, sy);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, col.replace('A', a)); g.addColorStop(1, col.replace('A', 0));
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, r, 0, Math.PI * 2); x.fill(); x.restore();
    if (wrap && cx - r < 0) blob(cx + W, cy, r, col, a, sy, false); else if (wrap && cx + r > W) blob(cx - W, cy, r, col, a, sy, false);   // 左右接縫
  };
  const stars = (n, y0, y1, maxA) => { for (let i = 0; i < n; i++) { const a = rng() * maxA; x.fillStyle = `rgba(255,255,255,${a})`; const r = rng() < 0.03 ? 1.6 : 0.8; x.fillRect(rng() * W, y0 + rng() * (y1 - y0), r, r); } };
  if (theme === 'jungle') {
    grad([[0, '#3d86b8'], [0.32, '#7fbfd2'], [0.47, '#d9ecd0'], [0.5, '#e8efc8'], [0.53, '#a9cdb6'], [1, '#2e5a3c']]);
    for (let i = 0; i < 70; i++) blob(rng() * W, H * (0.18 + rng() * 0.28), 40 + rng() * 120, 'rgba(255,255,255,A)', 0.25 + rng() * 0.3, 0.35);
    blob(W * 0.62, H * 0.3, 160, 'rgba(255,240,200,A)', 0.55);
    blob(W * 0.62, H * 0.3, 40, 'rgba(255,255,240,A)', 1);
  } else if (theme === 'lava') {
    grad([[0, '#0c0507'], [0.25, '#2a0d0c'], [0.42, '#6e1f12'], [0.49, '#d8501c'], [0.5, '#f07a2a'], [0.52, '#8a2a14'], [1, '#1a0806']]);
    for (let i = 0; i < 90; i++) blob(rng() * W, H * (0.1 + rng() * 0.36), 60 + rng() * 160, 'rgba(20,10,10,A)', 0.35 + rng() * 0.35, 0.3);   // 火山灰雲
    for (let i = 0; i < 40; i++) blob(rng() * W, H * (0.38 + rng() * 0.1), 50 + rng() * 120, 'rgba(255,90,30,A)', 0.15 + rng() * 0.2, 0.4);
    stars(300, 0, H * 0.3, 0.5);
    blob(W * 0.3, H * 0.36, 90, 'rgba(255,160,90,A)', 0.5);
  } else if (theme === 'candy') {
    grad([[0, '#8ac8f0'], [0.3, '#c8e4f8'], [0.46, '#ffd8ec'], [0.5, '#ffe8f0'], [0.53, '#f8c8e0'], [1, '#e8a8c8']]);
    for (let i = 0; i < 70; i++) blob(rng() * W, H * (0.12 + rng() * 0.32), 40 + rng() * 120, rng() < 0.5 ? 'rgba(255,255,255,A)' : 'rgba(255,200,230,A)', 0.4 + rng() * 0.3, 0.45);
    // 彩虹
    x.save(); x.lineWidth = 16; ['#ff6a6a', '#ffb04a', '#fff06a', '#6aff8a', '#6ac8ff', '#a06aff'].forEach((c, i) => { x.strokeStyle = c; x.globalAlpha = 0.35; x.beginPath(); x.arc(W * 0.4, H * 0.5, 260 - i * 16, Math.PI, 2 * Math.PI); x.stroke(); }); x.restore();
  } else if (theme === 'city') {
    grad([[0, '#04060e'], [0.35, '#0c1430'], [0.47, '#2a3a6a'], [0.5, '#4a5a8a'], [0.53, '#1a2240'], [1, '#080a14']]);
    stars(900, 0, H * 0.4, 0.6);
    blob(W * 0.7, H * 0.2, 30, 'rgba(240,244,255,A)', 1); blob(W * 0.7, H * 0.2, 110, 'rgba(200,210,255,A)', 0.2);
    // 地平線上的城市剪影與燈光
    for (let i = 0; i < 520; i++) { const bx = rng() * W, bw = 6 + rng() * 22, bh = 10 + rng() ** 2 * 90; x.fillStyle = 'rgba(14,18,34,0.95)'; x.fillRect(bx, H * 0.5 - bh, bw, bh); for (let k = 0; k < bh / 6; k++) if (rng() < 0.35) { x.fillStyle = rng() < 0.8 ? 'rgba(255,214,140,0.8)' : 'rgba(140,220,255,0.8)'; x.fillRect(bx + 2 + rng() * (bw - 4), H * 0.5 - bh + k * 6, 2, 2); } }
  } else if (theme === 'sky') {
    grad([[0, '#2a7ad8'], [0.3, '#6aaef0'], [0.47, '#c8e4fa'], [0.5, '#eef6ff'], [0.53, '#ffffff'], [1, '#e4ecf6']]);
    for (let i = 0; i < 60; i++) blob(rng() * W, H * (0.25 + rng() * 0.22), 60 + rng() * 160, 'rgba(255,255,255,A)', 0.5 + rng() * 0.3, 0.4);
    for (let i = 0; i < 140; i++) blob(rng() * W, H * (0.52 + rng() * 0.4), 80 + rng() * 200, 'rgba(255,255,255,A)', 0.6, 0.35);
    blob(W * 0.3, H * 0.2, 200, 'rgba(255,250,230,A)', 0.5); blob(W * 0.3, H * 0.2, 36, 'rgba(255,255,250,A)', 1);
  } else if (theme === 'moon') {
    grad([[0, '#000004'], [0.49, '#04040a'], [0.5, '#0a0a12'], [1, '#000000']]);
    stars(6000, 0, H * 0.5, 1);
    // 地球
    const ex = W * 0.62, ey = H * 0.24, er = 80;
    const eg = x.createRadialGradient(ex - er * 0.3, ey - er * 0.3, er * 0.1, ex, ey, er); eg.addColorStop(0, '#9ad8ff'); eg.addColorStop(0.6, '#2a6ac8'); eg.addColorStop(1, '#0a1a40');
    x.fillStyle = eg; x.beginPath(); x.arc(ex, ey, er, 0, Math.PI * 2); x.fill();
    x.save(); x.beginPath(); x.arc(ex, ey, er, 0, Math.PI * 2); x.clip();
    for (let i = 0; i < 14; i++) blob(ex + (rng() - 0.5) * er * 1.6, ey + (rng() - 0.5) * er * 1.6, 10 + rng() * 22, 'rgba(80,170,90,A)', 0.8, 0.6);
    for (let i = 0; i < 20; i++) blob(ex + (rng() - 0.5) * er * 1.8, ey + (rng() - 0.5) * er * 1.8, 8 + rng() * 26, 'rgba(255,255,255,A)', 0.7, 0.4);
    x.restore(); blob(ex, ey, er * 1.25, 'rgba(120,180,255,A)', 0.25, 1, false);
  } else if (theme === 'mars') {
    grad([[0, '#b87a50'], [0.3, '#d8a070'], [0.46, '#ecc090'], [0.5, '#f0c898'], [0.53, '#c88458'], [1, '#7a3a20']]);
    for (let i = 0; i < 40; i++) blob(rng() * W, H * (0.2 + rng() * 0.3), 80 + rng() * 200, 'rgba(200,120,80,A)', 0.15 + rng() * 0.2, 0.3);
    blob(W * 0.45, H * 0.3, 18, 'rgba(230,240,255,A)', 1); blob(W * 0.45, H * 0.3, 90, 'rgba(180,200,240,A)', 0.35);
    blob(W * 0.2, H * 0.18, 9, 'rgba(240,230,220,A)', 1); blob(W * 0.8, H * 0.28, 6, 'rgba(240,230,220,A)', 1);
  } else if (theme === 'reef') {
    grad([[0, '#6ae0ff'], [0.25, '#2ab0e0'], [0.45, '#0a6a9a'], [0.5, '#0a4a7a'], [1, '#021428']]);
    // 從水面照下來的光束
    for (let i = 0; i < 40; i++) { const cx = rng() * W, w0 = 20 + rng() * 60; const g2 = x.createLinearGradient(0, 0, 0, H * 0.5); g2.addColorStop(0, 'rgba(220,250,255,0.18)'); g2.addColorStop(1, 'rgba(220,250,255,0)'); x.fillStyle = g2; x.beginPath(); x.moveTo(cx, 0); x.lineTo(cx + w0, 0); x.lineTo(cx + w0 * 2.4 + 60, H * 0.5); x.lineTo(cx + 60, H * 0.5); x.fill(); }
    for (let i = 0; i < 600; i++) { x.fillStyle = `rgba(220,250,255,${rng() * 0.5})`; x.beginPath(); x.arc(rng() * W, rng() * H * 0.6, 1 + rng() * 2.5, 0, 7); x.fill(); }
  } else if (theme === 'lavender') {
    grad([[0, '#6a8ac8'], [0.3, '#c8a8d8'], [0.45, '#f8c8a8'], [0.5, '#ffd8a8'], [0.53, '#d8a8b8'], [1, '#6a5a7a']]);
    for (let i = 0; i < 40; i++) blob(rng() * W, H * (0.2 + rng() * 0.25), 60 + rng() * 140, 'rgba(255,220,220,A)', 0.25 + rng() * 0.25, 0.3);
    blob(W * 0.55, H * 0.44, 220, 'rgba(255,200,140,A)', 0.55); blob(W * 0.55, H * 0.44, 40, 'rgba(255,240,210,A)', 1);
  } else if (theme === 'egypt') {
    grad([[0, '#7aa8d0'], [0.3, '#b8d0e0'], [0.46, '#f0e0b8'], [0.5, '#f8e8c0'], [0.53, '#d8b880'], [1, '#a07a48']]);
    blob(W * 0.5, H * 0.18, 260, 'rgba(255,240,200,A)', 0.55); blob(W * 0.5, H * 0.18, 34, 'rgba(255,255,240,A)', 1);
  } else if (theme === 'swamp') {
    grad([[0, '#5a6a5a'], [0.35, '#8a9a84'], [0.48, '#a8b4a0'], [0.5, '#b0bca8'], [0.53, '#6a7a60'], [1, '#2a3424']]);
    for (let i = 0; i < 80; i++) blob(rng() * W, H * (0.1 + rng() * 0.38), 80 + rng() * 200, 'rgba(160,172,150,A)', 0.2 + rng() * 0.25, 0.3);
  } else if (theme === 'dino') {
    grad([[0, '#c8a070'], [0.3, '#e8c890'], [0.46, '#f8e0b0'], [0.5, '#fce8b8'], [0.53, '#c8a870'], [1, '#5a4a2a']]);
    for (let i = 0; i < 30; i++) blob(rng() * W, H * (0.15 + rng() * 0.3), 80 + rng() * 180, 'rgba(255,240,210,A)', 0.2 + rng() * 0.25, 0.3);
    blob(W * 0.35, H * 0.32, 200, 'rgba(255,220,160,A)', 0.5);
    // 遠方飛過的翼龍
    x.strokeStyle = 'rgba(60,40,30,0.7)'; x.lineWidth = 3;
    for (let i = 0; i < 9; i++) { const px = rng() * W, py = H * (0.12 + rng() * 0.2), sz = 10 + rng() * 14; x.beginPath(); x.moveTo(px - sz, py - sz * 0.3); x.quadraticCurveTo(px - sz * 0.4, py - sz * 0.5, px, py); x.quadraticCurveTo(px + sz * 0.4, py - sz * 0.5, px + sz, py - sz * 0.3); x.stroke(); }
  } else if (theme === 'neon') {
    grad([[0, '#0a0420'], [0.25, '#2a0a5a'], [0.42, '#a02a9a'], [0.49, '#ff6aa8'], [0.5, '#ff8ac0'], [0.52, '#3a0a5a'], [1, '#05020e']]);
    stars(1200, 0, H * 0.35, 0.8);
    // 有橫條紋的大夕陽
    const sx = W * 0.5, sy = H * 0.43, sr = 150;
    const sg = x.createLinearGradient(0, sy - sr, 0, sy + sr); sg.addColorStop(0, '#ffe66a'); sg.addColorStop(0.5, '#ff7ab0'); sg.addColorStop(1, '#c03aff');
    x.save(); x.beginPath(); x.arc(sx, sy, sr, 0, Math.PI * 2); x.clip(); x.fillStyle = sg; x.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
    x.fillStyle = '#2a0a5a'; for (let i = 0; i < 9; i++) x.fillRect(sx - sr, sy + i * 16, sr * 2, 3 + i * 1.2); x.restore();
    blob(sx, sy, sr * 1.8, 'rgba(255,100,200,A)', 0.25);
  } else if (theme === 'crystal') {
    grad([[0, '#05020c'], [0.4, '#140a2a'], [0.5, '#2a1a4a'], [0.53, '#1a1030'], [1, '#05020c']]);
    for (let i = 0; i < 1500; i++) { const a = rng(); x.fillStyle = rng() < 0.5 ? `rgba(180,140,255,${a})` : `rgba(120,220,255,${a})`; x.fillRect(rng() * W, rng() * H, 1.5, 1.5); }
    for (let i = 0; i < 25; i++) blob(rng() * W, H * (0.1 + rng() * 0.5), 60 + rng() * 160, rng() < 0.5 ? 'rgba(140,80,255,A)' : 'rgba(60,180,255,A)', 0.08 + rng() * 0.1, 0.6);
  } else if (theme === 'honey') {
    // 暖黃色的午後：淡藍的天、金色的地平線、柔和的雲
    grad([[0, '#6aa8d8'], [0.3, '#a8d0e8'], [0.45, '#f8e4a8'], [0.5, '#ffe8a0'], [0.53, '#e0c070'], [1, '#8a7a30']]);
    for (let i = 0; i < 50; i++) blob(rng() * W, H * (0.15 + rng() * 0.28), 50 + rng() * 130, 'rgba(255,248,220,A)', 0.3 + rng() * 0.3, 0.4);
    blob(W * 0.42, H * 0.34, 260, 'rgba(255,220,120,A)', 0.55); blob(W * 0.42, H * 0.34, 40, 'rgba(255,252,230,A)', 1);
  } else if (theme === 'clock') {
    // 煙霧瀰漫的黃昏：琥珀色的天空、地平線上一排工廠煙囪
    grad([[0, '#3a3028'], [0.28, '#6a5440'], [0.44, '#c08a50'], [0.5, '#d89a58'], [0.53, '#6a5444'], [1, '#2a221c']]);
    for (let i = 0; i < 90; i++) blob(rng() * W, H * (0.1 + rng() * 0.38), 70 + rng() * 180, rng() < 0.6 ? 'rgba(70,60,52,A)' : 'rgba(200,150,100,A)', 0.2 + rng() * 0.3, 0.35);
    blob(W * 0.6, H * 0.42, 120, 'rgba(255,170,90,A)', 0.6); blob(W * 0.6, H * 0.42, 30, 'rgba(255,230,180,A)', 1);
    for (let i = 0; i < 70; i++) { const bx = rng() * W, bw = 10 + rng() * 30, bh = 20 + rng() * 60; x.fillStyle = 'rgba(40,32,28,0.95)'; x.fillRect(bx, H * 0.5 - bh, bw, bh); if (rng() < 0.5) { const cw = 4 + rng() * 5, chh = 30 + rng() * 60; x.fillRect(bx + rng() * bw, H * 0.5 - bh - chh, cw, chh); } }
  } else if (theme === 'haunt') {
    // 深夜：大大的白月亮、飄過的雲、成群的蝙蝠
    grad([[0, '#05050e'], [0.3, '#12122c'], [0.46, '#2a2a50'], [0.5, '#3a3a64'], [0.53, '#1c1c30'], [1, '#08080e']]);
    stars(2000, 0, H * 0.45, 0.8);
    const mx = W * 0.58, my = H * 0.22, mr = 90;
    blob(mx, my, mr * 3.2, 'rgba(200,210,255,A)', 0.22);
    const mg = x.createRadialGradient(mx - 20, my - 20, 10, mx, my, mr); mg.addColorStop(0, '#fffbe8'); mg.addColorStop(1, '#c8c4b0');
    x.fillStyle = mg; x.beginPath(); x.arc(mx, my, mr, 0, Math.PI * 2); x.fill();
    for (let i = 0; i < 50; i++) blob(rng() * W, H * (0.12 + rng() * 0.32), 60 + rng() * 160, 'rgba(30,30,50,A)', 0.4 + rng() * 0.3, 0.3);
    x.fillStyle = 'rgba(10,10,16,0.9)';
    for (let i = 0; i < 24; i++) { const bx = mx + (rng() - 0.5) * 500, by = my + (rng() - 0.5) * 260, s = 5 + rng() * 8; x.beginPath(); x.moveTo(bx, by); x.quadraticCurveTo(bx - s, by - s, bx - s * 2, by); x.quadraticCurveTo(bx - s, by - s * 0.3, bx, by + s * 0.3); x.quadraticCurveTo(bx + s, by - s * 0.3, bx + s * 2, by); x.quadraticCurveTo(bx + s, by - s, bx, by); x.fill(); }
  } else if (theme === 'toy') {
    // 圖畫書一樣的藍天：圓滾滾的白雲、有光芒的太陽
    grad([[0, '#3a8ae8'], [0.3, '#7ab8f4'], [0.46, '#c8e4ff'], [0.5, '#e4f2ff'], [0.53, '#9ac4ec'], [1, '#5a8ac8']]);
    for (let i = 0; i < 26; i++) { const cx = rng() * W, cy = H * (0.15 + rng() * 0.3), s = 20 + rng() * 30; x.fillStyle = 'rgba(255,255,255,0.95)'; for (let k = 0; k < 5; k++) { x.beginPath(); x.arc(cx + (k - 2) * s * 0.8, cy - (k % 2) * s * 0.4, s * (0.7 + (k % 2) * 0.3), 0, Math.PI * 2); x.fill(); } }
    const sx = W * 0.3, sy = H * 0.2;
    x.strokeStyle = 'rgba(255,220,80,0.9)'; x.lineWidth = 8;
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; x.beginPath(); x.moveTo(sx + Math.cos(a) * 70, sy + Math.sin(a) * 70); x.lineTo(sx + Math.cos(a) * 100, sy + Math.sin(a) * 100); x.stroke(); }
    x.fillStyle = '#ffd84a'; x.beginPath(); x.arc(sx, sy, 56, 0, Math.PI * 2); x.fill();
  } else if (theme === 'storm') {
    // 暴風雨：厚重的烏雲、遠處的閃電
    grad([[0, '#14181e'], [0.3, '#2a323c'], [0.46, '#4a525c'], [0.5, '#5a626c'], [0.53, '#30363e'], [1, '#14181c']]);
    for (let i = 0; i < 150; i++) blob(rng() * W, H * (0.03 + rng() * 0.44), 70 + rng() * 200, rng() < 0.7 ? 'rgba(20,24,30,A)' : 'rgba(120,130,145,A)', 0.25 + rng() * 0.35, 0.4);
    x.strokeStyle = 'rgba(220,230,255,0.85)'; x.lineWidth = 2.5;
    for (let k = 0; k < 6; k++) { let bx = rng() * W, by = H * (0.12 + rng() * 0.1); x.beginPath(); x.moveTo(bx, by); while (by < H * 0.5) { bx += (rng() - 0.5) * 40; by += 12 + rng() * 20; x.lineTo(bx, by); } x.stroke(); blob(bx, H * 0.2, 120, 'rgba(160,180,255,A)', 0.12); }
  } else if (theme === 'cliffs') {
    // 陰天的海岸：厚雲、偶爾透出的陽光
    grad([[0, '#5a6a7a'], [0.3, '#8a98a6'], [0.47, '#c4ccd2'], [0.5, '#d4d8da'], [0.53, '#7a8a94'], [1, '#3a4a54']]);
    for (let i = 0; i < 120; i++) blob(rng() * W, H * (0.05 + rng() * 0.42), 60 + rng() * 180, rng() < 0.6 ? 'rgba(90,100,112,A)' : 'rgba(230,234,238,A)', 0.2 + rng() * 0.3, 0.4);
    blob(W * 0.4, H * 0.3, 220, 'rgba(255,248,230,A)', 0.4);
  } else if (theme === 'sakura') {
    // 春天早晨：淡藍到粉橘的天空、柔和的雲
    grad([[0, '#7aa6d8'], [0.3, '#b4cbe8'], [0.44, '#f2d6dc'], [0.5, '#fbe4d4'], [0.53, '#d8c8c4'], [1, '#6a7a5a']]);
    for (let i = 0; i < 60; i++) blob(rng() * W, H * (0.15 + rng() * 0.3), 50 + rng() * 140, 'rgba(255,240,244,A)', 0.25 + rng() * 0.3, 0.35);
    blob(W * 0.25, H * 0.36, 150, 'rgba(255,230,210,A)', 0.55);
    blob(W * 0.25, H * 0.36, 34, 'rgba(255,252,240,A)', 1);
  } else if (theme === 'dunes') {
    // 沙漠的熱霾：淡藍的天，地平線一片亮金色
    grad([[0, '#5c94c8'], [0.3, '#9cc0dc'], [0.45, '#e8dcc0'], [0.5, '#f6e6c4'], [0.53, '#d8b884'], [1, '#a07a48']]);
    for (let i = 0; i < 20; i++) blob(rng() * W, H * (0.12 + rng() * 0.25), 60 + rng() * 120, 'rgba(255,255,255,A)', 0.12 + rng() * 0.15, 0.25);
    blob(W * 0.55, H * 0.26, 240, 'rgba(255,240,200,A)', 0.5);
    blob(W * 0.55, H * 0.26, 36, 'rgba(255,255,245,A)', 1);
  } else if (theme === 'mushroom') {
    grad([[0, '#060818'], [0.28, '#141a44'], [0.44, '#3a2a70'], [0.49, '#5a4a9a'], [0.51, '#3f6a8a'], [0.54, '#1e1e44'], [1, '#0a0a1c']]);
    stars(3000, 0, H * 0.48, 0.9);
    for (let i = 0; i < 30; i++) blob(rng() * W, H * (0.3 + rng() * 0.18), 40 + rng() * 140, rng() < 0.5 ? 'rgba(80,220,255,A)' : 'rgba(255,110,220,A)', 0.05 + rng() * 0.08, 0.5);
    // 兩個月亮
    const moon = (mx, my, r, c0, c1) => { const g2 = x.createRadialGradient(mx - r * 0.3, my - r * 0.3, r * 0.1, mx, my, r); g2.addColorStop(0, c0); g2.addColorStop(1, c1); blob(mx, my, r * 3, 'rgba(200,210,255,A)', 0.18); x.fillStyle = g2; x.beginPath(); x.arc(mx, my, r, 0, Math.PI * 2); x.fill(); };
    moon(W * 0.62, H * 0.22, 70, '#f4f2ff', '#8a8ac8');
    moon(W * 0.7, H * 0.3, 26, '#ffd8f0', '#b05a98');
  } else if (theme === 'frost') {
    grad([[0, '#040814'], [0.3, '#0c1a38'], [0.45, '#2a4a78'], [0.495, '#8aa8d0'], [0.5, '#b8cce4'], [0.52, '#8aa0c0'], [1, '#d8e2f0']]);
    stars(4000, 0, H * 0.46, 1);
    // 靜態的極光（動態的那層另外畫）
    for (let i = 0; i < 160; i++) {
      const cx = rng() * W, top = H * (0.08 + rng() * 0.12), len = H * (0.12 + rng() * 0.18), wd = 6 + rng() * 22;
      const g2 = x.createLinearGradient(0, top, 0, top + len);
      const pink = rng() < 0.25;
      g2.addColorStop(0, pink ? 'rgba(220,90,255,0)' : 'rgba(80,255,170,0)'); g2.addColorStop(0.6, pink ? 'rgba(220,90,255,0.12)' : 'rgba(80,255,170,0.16)'); g2.addColorStop(1, 'rgba(80,255,170,0)');
      x.fillStyle = g2; x.fillRect(cx + Math.sin(cx * 0.01) * 40, top, wd, len);
    }
    blob(W * 0.35, H * 0.25, 30, 'rgba(240,248,255,A)', 1);
    blob(W * 0.35, H * 0.25, 120, 'rgba(200,220,255,A)', 0.2);
  } else {
    grad([[0, '#05030c'], [0.3, '#120a2a'], [0.47, '#3a2468'], [0.5, '#4a3080'], [0.53, '#2c1c50'], [1, '#0c0618']]);
    // 星雲
    for (let i = 0; i < 26; i++) blob(rng() * W, H * (0.08 + rng() * 0.4), 80 + rng() * 260, rng() < 0.5 ? 'rgba(220,70,200,A)' : 'rgba(60,170,255,A)', 0.06 + rng() * 0.12, 0.6 + rng() * 0.5);
    stars(5000, 0, H * 0.5, 1); stars(900, H * 0.5, H, 0.35);
    // 環狀行星
    const px = W * 0.7, py = H * 0.28, pr = 120;
    x.save(); x.translate(px, py); x.rotate(-0.35);
    const ring = (w, a) => { x.strokeStyle = `rgba(230,210,255,${a})`; x.lineWidth = w; x.beginPath(); x.ellipse(0, 0, pr * 2.1, pr * 0.5, 0, 0, Math.PI * 2); x.stroke(); };
    ring(18, 0.18); ring(6, 0.35);
    const pg = x.createRadialGradient(-pr * 0.4, -pr * 0.4, pr * 0.1, 0, 0, pr);
    pg.addColorStop(0, '#f2c9ff'); pg.addColorStop(0.5, '#a05ad8'); pg.addColorStop(1, '#2a104a');
    x.fillStyle = pg; x.beginPath(); x.arc(0, 0, pr, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.ellipse(0, 0, pr * 2.1, pr * 0.5, 0, 0, Math.PI); x.strokeStyle = 'rgba(240,220,255,0.55)'; x.lineWidth = 7; x.stroke();     // 前面那半圈環
    x.restore();
    // 小衛星
    const mg = x.createRadialGradient(W * 0.22 - 10, H * 0.2 - 10, 2, W * 0.22, H * 0.2, 34);
    mg.addColorStop(0, '#e8fbff'); mg.addColorStop(1, '#3a7a9a'); x.fillStyle = mg; x.beginPath(); x.arc(W * 0.22, H * 0.2, 34, 0, Math.PI * 2); x.fill();
  }
  return c;
}

// 齒輪形狀（半徑 1，n 齒）
function gearShape(n, inner = 0.82, hole = 0.22) {
  const sh = new THREE.Shape();
  for (let i = 0; i < n * 4; i++) { const a = i / (n * 4) * Math.PI * 2, r = (i % 4 === 1 || i % 4 === 2) ? 1 : inner; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  if (hole) { const hp = new THREE.Path(); hp.absarc(0, 0, hole, 0, Math.PI * 2, true); sh.holes.push(hp); }
  return sh;
}

// 奇幻主題的樹 / 地標形狀（單位大小，擺放時縮放）
function fantasyGeos(nz, blob, colorize) {
  const clean = gg => { if (gg.attributes.uv) gg.deleteAttribute('uv'); return gg.index ? gg.toNonIndexed() : gg; };
  // 葉片：細長、往下垂的薄片（長 1，從原點往 +x 長）
  const frond = (len, wid, droop) => {
    const gg = new THREE.PlaneGeometry(len, wid, 8, 2);
    gg.translate(len / 2, 0, 0); gg.rotateX(-Math.PI / 2);
    const p = gg.attributes.position;
    for (let i = 0; i < p.count; i++) { const t = p.getX(i) / len; p.setZ(i, p.getZ(i) * (1 - t * 0.85)); p.setY(i, -droop * t * t + 0.25 * t); }
    return clean(gg);
  };
  // 棕櫚樹幹：往 +x 彎的錐形（高 1）
  const pt = new THREE.CylinderGeometry(0.6, 1, 1, 8, 10, true);
  pt.translate(0, 0.5, 0);
  { const p = pt.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = 1 + 0.08 * Math.sin(y * 40); p.setX(i, p.getX(i) * k + y * y * 6); p.setZ(i, p.getZ(i) * k); } }
  pt.computeVertexNormals();
  // 棕櫚樹冠：11 片下垂的大葉
  const crown = [];
  for (let i = 0; i < 11; i++) { const f = frond(1, 0.32, 0.75); f.rotateZ(0.15); f.rotateY(i / 11 * Math.PI * 2 + (i % 2) * 0.2); crown.push(f); }
  const palmCrown = colorize(mergeGeometries(crown), [0.9, 1, 0.8], [0.45, 0.55, 0.4]);
  palmCrown.computeVertexNormals();
  // 蕨類：從地面往外翻的葉子
  const fr = [];
  for (let i = 0; i < 12; i++) { const f = frond(1, 0.22, 0.6); f.rotateZ(0.9 + (i % 3) * 0.15); f.rotateY(i / 12 * Math.PI * 2); f.translate(0, 0.05, 0); fr.push(f); }
  const fern = colorize(mergeGeometries(fr), [0.85, 1, 0.75], [0.35, 0.45, 0.3]);
  fern.computeVertexNormals();
  // 水晶：幾根六角尖柱（高 1）
  const cs = [];
  const shard = (h, r, ax, az, ox, oz) => {
    const body = new THREE.CylinderGeometry(r, r * 0.8, h * 0.78, 6, 1); body.translate(0, h * 0.39, 0);
    const tip = new THREE.ConeGeometry(r, h * 0.22, 6, 1); tip.translate(0, h * 0.89, 0);
    const m = mergeGeometries([clean(body), clean(tip)]); m.rotateX(ax); m.rotateZ(az); m.translate(ox, 0, oz); return m;
  };
  cs.push(shard(1, 0.2, 0, 0, 0, 0), shard(0.7, 0.15, 0.3, 0.25, 0.2, 0.1), shard(0.55, 0.13, -0.35, -0.2, -0.18, -0.1), shard(0.45, 0.12, 0.2, -0.45, -0.1, 0.22), shard(0.35, 0.1, -0.4, 0.5, 0.15, -0.2));
  const crystal = mergeGeometries(cs); crystal.computeVertexNormals();
  // 玄武岩柱：高高低低的六角柱（高 1、半徑 1）
  const bs = [];
  const rr = makeRng(17);
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2, r = i === 0 ? 0 : 0.55, h = i === 0 ? 1 : 0.35 + rr() * 0.55;
    const cg = new THREE.CylinderGeometry(0.34, 0.36, h, 6, 1); cg.translate(Math.cos(a) * r, h / 2, Math.sin(a) * r); bs.push(clean(cg));
  }
  const basalt = mergeGeometries(bs); basalt.computeVertexNormals();
  // 枯樹：歪斜的樹幹 + 幾根光禿的枝
  const br = [];
  const limb = (len, r, rx, rz, y) => { const cg = new THREE.CylinderGeometry(r * 0.35, r, len, 5, 1); cg.translate(0, len / 2, 0); cg.rotateZ(rz); cg.rotateY(rx); cg.translate(0, y, 0); return clean(cg); };
  br.push(limb(1, 0.06, 0, 0.08, 0), limb(0.45, 0.03, 0.4, 0.9, 0.55), limb(0.4, 0.028, 2.6, 0.8, 0.68), limb(0.35, 0.025, 4.4, 1.0, 0.45), limb(0.3, 0.02, 1.4, 0.6, 0.82));
  const deadtree = mergeGeometries(br); deadtree.computeVertexNormals();
  // 石柱山：粗糙的高柱（高 1、半徑 1），頂上一叢綠
  const kc = new THREE.CylinderGeometry(0.75, 1, 1, 14, 16, false);
  kc.translate(0, 0.5, 0);
  { const p = kc.attributes.position; for (let i = 0; i < p.count; i++) { const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i), a = Math.atan2(Z, X); const k = 1 + 0.18 * nz(Math.cos(a) * 2, Y * 4) + 0.08 * nz(a * 3, Y * 12); p.setXYZ(i, X * k, Y, Z * k); } }
  const kcap = blob(0.95, 2); kcap.scale(0.92, 0.2, 0.92); kcap.translate(0, 1.0, 0);
  const vcol = (gg, fn) => { const p = gg.attributes.position, cc = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const col = fn(p.getX(i), p.getY(i), p.getZ(i)); cc[i * 3] = col[0]; cc[i * 3 + 1] = col[1]; cc[i * 3 + 2] = col[2]; } gg.setAttribute('color', new THREE.BufferAttribute(cc, 3)); return clean(gg); };
  const karst = mergeGeometries([
    vcol(kc, (X, Y) => { const n = 0.85 + 0.3 * Math.abs(nz(X * 5, Y * 9)); const g = Math.max(0, nz(X * 3 + 7, Y * 6) * 1.5); return [0.36 * n * (1 - g * 0.4), 0.4 * n + g * 0.12, 0.34 * n * (1 - g * 0.4)]; }),
    vcol(kcap, (X, Y, Z) => { const n = 0.8 + 0.4 * Math.abs(nz(X * 6, Z * 6)); return [0.1 * n, 0.26 * n, 0.09 * n]; }),
  ]);
  karst.computeVertexNormals();
  // 浮空島：上面是草地、下面是倒錐形的岩石（頂面在 y = 0，底到 y = -1）
  const top = new THREE.CylinderGeometry(1, 0.96, 0.06, 18, 1); top.translate(0, -0.03, 0);
  const under = new THREE.ConeGeometry(0.96, 0.94, 18, 6); under.rotateX(Math.PI); under.translate(0, -0.06 - 0.47, 0);
  { const p = under.attributes.position; for (let i = 0; i < p.count; i++) { const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i), a = Math.atan2(Z, X); const k = 1 + 0.22 * nz(Math.cos(a) * 2.5, Y * 5) ; p.setXYZ(i, X * k, Y, Z * k); } }
  const isle = mergeGeometries([vcol(top, () => [0.22, 0.62, 0.56]), vcol(under, (X, Y) => { const t = clamp(-Y, 0, 1); const n = 0.8 + 0.3 * Math.abs(nz(X * 6, Y * 6)); return [(0.42 - t * 0.25) * n, (0.36 - t * 0.24) * n, (0.55 - t * 0.25) * n]; })]);
  isle.computeVertexNormals();
  // 火山：中間有火山口的錐形（高 1、半徑 1），越往上越紅
  const prof = [[0.001, 0], [1, 0], [0.6, 0.35], [0.28, 0.75], [0.13, 0.96], [0.1, 0.98], [0.07, 0.9], [0.001, 0.88]].map(([r, y]) => new THREE.Vector2(r, y));
  const vc = new THREE.LatheGeometry(prof, 40);
  { const p = vc.attributes.position; for (let i = 0; i < p.count; i++) { const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i), a = Math.atan2(Z, X); const k = 1 + 0.12 * nz(Math.cos(a) * 3, Y * 6) * (1 - Y); p.setXYZ(i, X * k, Y, Z * k); } }
  const volcano = vcol(vc, (X, Y, Z) => { const hot = clamp((Y - 0.8) / 0.2, 0, 1); const streak = Math.max(0, Math.sin(Math.atan2(Z, X) * 7) - 0.85) * 4 * clamp((Y - 0.4) / 0.5, 0, 1); return [0.1 + hot * 0.9 + streak * 0.8, 0.07 + hot * 0.3 + streak * 0.25, 0.07]; });
  volcano.computeVertexNormals();
  // 蘑菇：菇柄（高 1、半徑 1）與半球形菇傘（半徑 1、頂在 y = 1）
  const shroomStem = new THREE.CylinderGeometry(0.8, 1, 1, 10, 1); shroomStem.translate(0, 0.5, 0);
  { const p = shroomStem.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + Math.sin(y * 2.5) * 0.6); } }
  shroomStem.computeVertexNormals();
  const shroomCap = new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2); shroomCap.translate(0, -0.15, 0);
  // 冰山：尖銳的冰峰（高 1、半徑 1），越高越白
  const ib = new THREE.ConeGeometry(1, 1, 9, 6); ib.translate(0, 0.5, 0);
  { const p = ib.attributes.position; for (let i = 0; i < p.count; i++) { const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i), a = Math.atan2(Z, X); const k = 1 + 0.3 * nz(Math.cos(a) * 3, Y * 4) + 0.15 * nz(a * 4, Y * 9); p.setXYZ(i, X * k, Y * (1 + 0.15 * nz(X * 3, Z * 3)), Z * k); } }
  const iceberg = vcol(ib, (X, Y, Z) => { const n = 0.85 + 0.2 * Math.abs(nz(X * 7, Z * 7 + Y * 5)); const b = clamp(0.55 + Y * 0.6, 0, 1); return [0.62 * b * n + 0.2, 0.74 * b * n + 0.2, 0.9 * n]; });
  iceberg.computeVertexNormals();
  // 竹叢：幾根細長的竹竿（高 1、半徑 1）+ 頂上的竹葉
  const bb = [], br2 = makeRng(23);
  for (let i = 0; i < 9; i++) {
    const a = br2() * 6.28, r = br2() * 0.7, h = 0.7 + br2() * 0.3, x0 = Math.cos(a) * r, z0 = Math.sin(a) * r;
    const cane = new THREE.CylinderGeometry(0.035, 0.045, h, 5, 4); cane.translate(x0, h / 2, z0);
    { const p = cane.attributes.position; for (let k = 0; k < p.count; k++) { const y = p.getY(k); p.setX(k, p.getX(k) + y * y * 0.12 * Math.cos(a)); p.setZ(k, p.getZ(k) + y * y * 0.12 * Math.sin(a)); } }
    bb.push(vcol(cane, (X, Y) => [0.24 + 0.06 * Math.sin(Y * 30), 0.4, 0.14]));
    const leaf = blob(0.22, 1); leaf.scale(1, 0.5, 1); leaf.translate(x0 + h * h * 0.12 * Math.cos(a), h - 0.05, z0 + h * h * 0.12 * Math.sin(a));
    bb.push(vcol(leaf, (X, Y, Z) => { const n = 0.8 + 0.4 * Math.abs(nz(X * 9, Z * 9)); return [0.25 * n, 0.5 * n, 0.16 * n]; }));
  }
  const bamboo = mergeGeometries(bb); bamboo.computeVertexNormals();
  // 雪峰：岩石山、上面是雪（高 1、半徑 1）
  const pk = new THREE.ConeGeometry(1, 1, 12, 10); pk.translate(0, 0.5, 0);
  { const p = pk.attributes.position; for (let i = 0; i < p.count; i++) { const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i), a = Math.atan2(Z, X); const k = 1 + 0.28 * nz(Math.cos(a) * 2.5, Y * 3) + 0.12 * nz(a * 5, Y * 8); p.setXYZ(i, X * k, Y * (1 + 0.12 * nz(X * 2, Z * 2)), Z * k); } }
  const peak = vcol(pk, (X, Y, Z) => { const snow = clamp((Y - 0.7 + 0.1 * nz(X * 6, Z * 6)) / 0.08, 0, 1); const n = 0.75 + 0.35 * Math.abs(nz(X * 8, Y * 8 + Z * 3)); const rock = [0.3 * n, 0.32 * n, 0.34 * n]; return rock.map(c => c + (0.95 - c) * snow); });
  peak.computeVertexNormals();
  const ms = new THREE.ConeGeometry(1, 1, 12, 8); ms.translate(0, 0.5, 0);
  { const p = ms.attributes.position; for (let i = 0; i < p.count; i++) { const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i), a = Math.atan2(Z, X); const k = 1 + 0.3 * nz(Math.cos(a) * 2, Y * 2.5); p.setXYZ(i, X * k, Y * 0.8, Z * k); } }
  const mesa = vcol(ms, (X, Y) => { const n = 0.85 + 0.2 * Math.abs(nz(X * 5, Y * 9)); return [(0.66 + Y * 0.1) * n, (0.66 + Y * 0.1) * n, (0.66 + Y * 0.1) * n]; });     // 中性灰，顏色由擺放時指定
  mesa.computeVertexNormals();
  // 棒棒糖：細棍 + 漩渦圓盤（圓盤半徑 1、厚 0.3，面向側邊）
  const lolliStick = new THREE.CylinderGeometry(0.06, 0.07, 1, 6); lolliStick.translate(0, 0.5, 0);
  const ld = new THREE.CylinderGeometry(1, 1, 0.3, 28, 1); ld.rotateX(Math.PI / 2);
  const lolliDisc = vcol(ld, (X, Y) => { const r = Math.hypot(X, Y), a = Math.atan2(Y, X); const k = 0.5 + 0.5 * Math.sin(a * 2 + r * 9); return k > 0.5 ? [1, 1, 1] : [0.82, 0.82, 0.82].map(v => v * 0.9); });
  lolliDisc.computeVertexNormals();
  // 摩天大樓：方柱 + 窗戶（高 1、半徑 1）
  // 每一格（兩個三角形）是一扇窗：整格同一個顏色，亮的窗戶不會糊成一片
  const tw = new THREE.BoxGeometry(1.6, 1, 1.6, 6, 40, 6).toNonIndexed(); tw.translate(0, 0.5, 0);
  { const tr2 = makeRng(5), p = tw.attributes.position, cc = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i += 6) {
      const top = Math.abs(p.getY(i) - p.getY(i + 1)) < 1e-6 && Math.abs(p.getY(i) - p.getY(i + 2)) < 1e-6;      // 屋頂 / 底部
      const lit = !top && tr2() < 0.32, col = lit ? (tr2() < 0.85 ? [1, 0.8, 0.48] : [0.6, 0.85, 1]) : [0.022, 0.025, 0.04];
      for (let k = 0; k < 6; k++) { cc[(i + k) * 3] = col[0]; cc[(i + k) * 3 + 1] = col[1]; cc[(i + k) * 3 + 2] = col[2]; }
    }
    tw.setAttribute('color', new THREE.BufferAttribute(cc, 3)); tw.deleteAttribute('uv'); }
  const tower = tw;
  // 金字塔、方尖碑
  const py2 = new THREE.ConeGeometry(1, 1, 4, 8); py2.translate(0, 0.5, 0); py2.rotateY(Math.PI / 4);
  const pyramid = vcol(py2, (X, Y, Z) => { const n = 0.85 + 0.2 * Math.abs(nz(X * 6, Y * 12 + Z * 6)); return [0.86 * n, 0.72 * n, 0.48 * n].map((v, i) => Y > 0.9 ? [1, 0.84, 0.4][i] : v); });
  pyramid.computeVertexNormals();
  const ob1 = new THREE.CylinderGeometry(0.55, 1, 0.9, 4, 1); ob1.rotateY(Math.PI / 4); ob1.translate(0, 0.45, 0);
  const ob2 = new THREE.ConeGeometry(0.78, 0.1, 4, 1); ob2.rotateY(Math.PI / 4); ob2.translate(0, 0.95, 0);
  const obelisk = mergeGeometries([vcol(ob1, (X, Y) => [0.84, 0.7, 0.46].map(v => v * (0.9 + 0.1 * Math.sin(Y * 60)))), vcol(ob2, () => [1, 0.84, 0.4])]);
  obelisk.computeVertexNormals();
  // 風車：塔身（高 1、半徑 1）與葉片（中心在原點、半徑約 1.1）
  const wb = new THREE.CylinderGeometry(0.55, 1, 1, 8, 1); wb.translate(0, 0.5, 0);
  const wr = new THREE.ConeGeometry(0.75, 0.3, 8, 1); wr.translate(0, 1.15, 0);
  const windBody = mergeGeometries([vcol(wb, () => [0.92, 0.88, 0.8]), vcol(wr, () => [0.55, 0.22, 0.16])]);
  windBody.computeVertexNormals();
  const blades = [];
  for (let i = 0; i < 4; i++) { const bl = new THREE.BoxGeometry(0.22, 1.1, 0.03); bl.translate(0.06, 0.6, 0); bl.rotateZ(i * Math.PI / 2); blades.push(clean(bl)); }
  const windBlades = mergeGeometries(blades); windBlades.computeVertexNormals();
  // 圓頂基地、路燈、恐龍骨（一根肋骨弧）
  const dome = new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  const lanternPole = new THREE.CylinderGeometry(0.06, 0.09, 1, 6); lanternPole.translate(0, 0.5, 0);
  const lanternBulb = new THREE.SphereGeometry(0.32, 12, 8);
  const bn = new THREE.TorusGeometry(1, 0.06, 6, 24, Math.PI); bn.translate(0, 0, 0);
  const bone = bn;
  // ---- 奇幻球場第二批 ----
  // 巨花：花莖（高 1）+ 朝上的花（半徑約 1，花瓣白色、由每棵樹的顏色上色）
  const flowerStem = vcol(new THREE.CylinderGeometry(0.05, 0.08, 1, 6).translate(0, 0.5, 0), () => [0.26, 0.55, 0.2]);
  const petals = [];
  for (let i = 0; i < 8; i++) { const pg = new THREE.SphereGeometry(0.34, 10, 6); pg.scale(1.15, 0.16, 0.55); pg.translate(0.58, 0, 0); pg.rotateY(i * Math.PI / 4); petals.push(vcol(pg, () => [1, 1, 1])); }
  const fc = new THREE.SphereGeometry(0.3, 12, 8); fc.scale(1, 0.45, 1); fc.translate(0, 0.04, 0);
  petals.push(vcol(fc, () => [0.42, 0.26, 0.06]));
  const flowerHead = mergeGeometries(petals); flowerHead.computeVertexNormals();
  // 蜂巢：一圈圈往上縮的金色環
  const hv = [];
  for (let k = 0; k < 6; k++) { const R = 0.86 * Math.sqrt(1 - (k / 6.4) ** 2) + 0.06; const tg = new THREE.TorusGeometry(R, 0.17, 6, 18); tg.rotateX(Math.PI / 2); tg.translate(0, 0.1 + k * 0.17, 0); hv.push(vcol(tg, () => k % 2 ? [0.82, 0.56, 0.16] : [0.96, 0.72, 0.22])); }
  const hvTop = new THREE.SphereGeometry(0.3, 10, 6); hvTop.translate(0, 1.1, 0); hv.push(vcol(hvTop, () => [0.9, 0.66, 0.2]));
  const hvDoor = new THREE.CircleGeometry(0.16, 12); hvDoor.translate(0, 0.25, 0.9); hv.push(vcol(hvDoor, () => [0.12, 0.06, 0.02]));
  const hive = mergeGeometries(hv); hive.computeVertexNormals();
  // 立著的大齒輪（高約 2.25）
  const cg = new THREE.ExtrudeGeometry(gearShape(12), { depth: 0.22, bevelEnabled: false }); cg.translate(0, 0, -0.11); cg.translate(0, 1.25, 0);
  const cpost = new THREE.BoxGeometry(0.22, 1.3, 0.22); cpost.translate(0, 0.65, 0);
  const cog = mergeGeometries([vcol(cg, () => [0.8, 0.6, 0.3]), vcol(cpost, () => [0.32, 0.29, 0.27])]); cog.computeVertexNormals();
  // 磚造煙囪（高 1、半徑 1）
  const chb = new THREE.CylinderGeometry(0.78, 1, 1, 10, 8); chb.translate(0, 0.5, 0);
  const chr = new THREE.CylinderGeometry(0.92, 0.92, 0.06, 10); chr.translate(0, 0.98, 0);
  const chimney = mergeGeometries([vcol(chb, (X, Y) => [0.56, 0.27, 0.19].map(v => v * (0.82 + 0.18 * Math.sign(Math.sin(Y * 42))))), vcol(chr, () => [0.2, 0.18, 0.18])]); chimney.computeVertexNormals();
  // 墓碑（高 1.2、寬 1）
  const gsh = new THREE.Shape(); gsh.moveTo(-0.5, 0); gsh.lineTo(0.5, 0); gsh.lineTo(0.5, 0.7); gsh.absarc(0, 0.7, 0.5, 0, Math.PI, false); gsh.lineTo(-0.5, 0);
  const gv = new THREE.ExtrudeGeometry(gsh, { depth: 0.22, bevelEnabled: false }); gv.translate(0, 0, -0.11);
  const grave = vcol(gv, (X, Y, Z) => { const n = 0.82 + 0.18 * nz(X * 5 + Z * 3, Y * 5); return [0.5 * n, 0.5 * n, 0.55 * n]; }); grave.computeVertexNormals();
  // 南瓜燈（高約 1.45）
  const pmk = new THREE.SphereGeometry(1, 18, 10); pmk.scale(1, 0.7, 1); pmk.translate(0, 0.7, 0);
  const pmks = new THREE.CylinderGeometry(0.08, 0.12, 0.3, 6); pmks.translate(0, 1.42, 0);
  const pumpkin = mergeGeometries([vcol(pmk, (X, Y, Z) => { const a = Math.atan2(Z, X), k = 0.72 + 0.28 * Math.abs(Math.cos(a * 4)); return [1 * k, 0.46 * k, 0.06 * k]; }), vcol(pmks, () => [0.28, 0.24, 0.1])]); pumpkin.computeVertexNormals();
  // 疊起來的積木（高 1.8）
  const bl1 = new THREE.BoxGeometry(1, 0.7, 1); bl1.translate(0, 0.35, 0);
  const bl2 = new THREE.BoxGeometry(0.8, 0.6, 0.8); bl2.rotateY(0.4); bl2.translate(0.05, 1.0, 0);
  const bl3 = new THREE.BoxGeometry(0.6, 0.5, 0.6); bl3.rotateY(-0.3); bl3.translate(-0.04, 1.55, 0.03);
  const block = mergeGeometries([vcol(bl1, () => [0.9, 0.2, 0.2]), vcol(bl2, () => [1, 0.8, 0.15]), vcol(bl3, () => [0.2, 0.45, 0.95])]); block.computeVertexNormals();
  // 古堡剪影（寬約 1、高 1）：城牆 + 幾座尖頂塔樓
  const cs2 = [];
  const cwall = new THREE.BoxGeometry(1.4, 0.35, 0.3); cwall.translate(0, 0.175, 0); cs2.push(vcol(cwall, () => [0.2, 0.19, 0.24]));
  [[-0.6, 0.6, 0.12], [-0.2, 0.85, 0.15], [0.25, 1, 0.13], [0.65, 0.7, 0.1]].forEach(([x0, h0, r0]) => {
    const tb = new THREE.CylinderGeometry(r0, r0 * 1.1, h0, 8); tb.translate(x0, h0 / 2, 0); cs2.push(vcol(tb, () => [0.22, 0.21, 0.27]));
    const rf = new THREE.ConeGeometry(r0 * 1.35, h0 * 0.35, 8); rf.translate(x0, h0 + h0 * 0.17, 0); cs2.push(vcol(rf, () => [0.16, 0.12, 0.24]));
  });
  const castle = mergeGeometries(cs2); castle.computeVertexNormals();
  return { palmTrunk: pt, palmCrown, fern, crystal, basalt, deadtree, karst, isle, volcano, shroomStem, shroomCap, iceberg, bamboo, peak, mesa,
    lolliStick, lolliDisc, tower, pyramid, obelisk, windBody, windBlades, dome, lanternPole, lanternBulb, bone,
    flowerStem, flowerHead, hive, cog, chimney, grave, pumpkin, block, castle };
}

function avgLum(tex) {
  try {
    const img = tex.image;
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0, 64, 64);
    const d = x.getImageData(0, 0, 64, 64).data;
    let s = 0;
    for (let i = 0; i < d.length; i += 4) s += (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
    // 貼圖是 sRGB，著色器取樣時已轉線性，平均值也轉線性
    return Math.pow(s / (d.length / 4), 2.2);
  } catch (e) { return 0; }
}

function heightToNormal(size, hf) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  const img = x.createImageData(size, size);
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const hx = hf((i + 1) % size, j) - hf((i - 1 + size) % size, j);
    const hy = hf(i, (j + 1) % size) - hf(i, (j - 1 + size) % size);
    const l = Math.hypot(hx, hy, 1);
    const o = (j * size + i) * 4;
    img.data[o] = (-hx / l * 0.5 + 0.5) * 255; img.data[o + 1] = (-hy / l * 0.5 + 0.5) * 255; img.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function makeWaterNormal() {
  const n = makeNoise(5);
  const S = 256;
  // 可無縫重複：在圓環上取樣雜訊
  const hf = (i, j) => {
    const a = i / S * Math.PI * 2, b = j / S * Math.PI * 2;
    return n.fbm(Math.cos(a) * 2 + 10, Math.sin(a) * 2 + Math.cos(b) * 2, 4) * 6 + n(Math.sin(b) * 3, Math.cos(a) * 3) * 2;
  };
  const t = heightToNormal(S, hf);
  t.repeat.set(60, 60);
  return t;
}

function makeDimpleNormal() {
  const S = 256;
  const hf = (i, j) => {
    const u = i / S * 18, v = j / S * 10;
    const fu = u - Math.floor(u) - 0.5, fv = v - Math.floor(v + (Math.floor(u) % 2) * 0.5) - 0.5;
    const r = Math.hypot(fu, fv);
    return r < 0.42 ? -Math.cos(r / 0.42 * Math.PI / 2) * 3 : 0;
  };
  return heightToNormal(S, hf);
}
