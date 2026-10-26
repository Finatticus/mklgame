// 成就徽章、球場護照、特殊皮膚：定義、進度計數、達成判定、達成時的動畫提示、存回伺服器
// 進度存在 session.profile.prog = { ach: {成就代號: 達成時間}, cnt: {計數: 數值}, stamps: {球場代號: {date, best, n, nines: {區代號: 第一次打完的時間}}} }
//   分區球場（例如長庚北 / 中 / 南）要每一區都打完過，章才算蓋成（date 是蓋成的時間）
// 挑戰星數存在 session.profile.chal = { stars: {關卡代號: 0~3}, best: {關卡代號: 最少桿數}, total }
import { call, session } from './api.js';
import { COURSES } from './courses.js';

// ---------------- 皮膚 ----------------
// slot：driver（一號木與木桿、混血）、iron（鐵桿與挖起桿）、putter、chipper（寶刀 / 切推桿）、ball
// 球桿：head 桿頭顏色、glow 自發光顏色（沒有就不發光）、shaft 桿身顏色；球：color、glow、trail 彈道顏色
export const SKINS = [
  { id: 'std', slot: 'driver', name: '標準 Driver', std: true },
  { id: 'goldD', slot: 'driver', name: '黃金 Driver', head: 0xd8a830, metal: 1, shaft: 0xe8c860, ach: 'drive330', fx: 'gold' },
  { id: 'frostD', slot: 'driver', name: '冰霜 Driver', head: 0x9fdcff, glow: 0x3aa8ff, shaft: 0xd8f2ff, ach: 'aurora_par', fx: 'frost' },
  { id: 'galaxyD', slot: 'driver', name: '星河 Driver', head: 0x3a1a6a, glow: 0x9a5aff, shaft: 0xb89aff, ach: 'ch_p5', fx: 'galaxy' },
  { id: 'std', slot: 'iron', name: '標準鐵桿', std: true },
  { id: 'lavaI', slot: 'iron', name: '熔岩鐵桿', head: 0x2a1410, glow: 0xff5a10, shaft: 0x4a2a20, ach: 'ember_par', fx: 'ember' },
  { id: 'obsidianI', slot: 'iron', name: '黑曜石鐵桿', head: 0x161420, glow: 0x6a4aff, metal: 1, shaft: 0x2a2838, ach: 'ch_p2', fx: 'void' },
  { id: 'std', slot: 'putter', name: '標準推桿', std: true },
  { id: 'moonP', slot: 'putter', name: '月光推桿', head: 0xe8eeff, glow: 0x8ab8ff, shaft: 0xf0f4ff, ach: 'putt20x3', fx: 'moon' },
  { id: 'lavaP', slot: 'putter', name: '熔岩推桿', head: 0x301410, glow: 0xff7a20, shaft: 0x502a1a, ach: 'vent_green3', fx: 'ember' },
  { id: 'sakuraP', slot: 'putter', name: '櫻花推桿', head: 0xffc8dc, glow: 0xff7aa8, shaft: 0xfff0f4, ach: 'sakura_no3', fx: 'petal' },
  { id: 'std', slot: 'chipper', name: '標準寶刀', std: true },
  { id: 'std', slot: 'ball', name: '標準白球', std: true },
  { id: 'gold', slot: 'ball', name: '黃金球', color: 0xffd860, glow: 0x8a6010, trail: 0xffd860, ach: 'hio', fx: 'gold' },
  { id: 'firefly', slot: 'ball', name: '螢火球', color: 0xeaffa0, glow: 0xa8ff4a, trail: 0xc8ff6a, ach: 'ring30', fx: 'firefly' },
  { id: 'lava', slot: 'ball', name: '熔岩球', color: 0x3a1a10, glow: 0xff5a10, trail: 0xff7a2a, ach: 'vent25', fx: 'ember' },
  { id: 'frost', slot: 'ball', name: '冰晶球', color: 0xd8f4ff, glow: 0x4ab8ff, trail: 0x8ad8ff, ach: 'wall30', fx: 'frost' },
  { id: 'spore', slot: 'ball', name: '孢子球', color: 0xffb8e8, glow: 0xff4ac8, trail: 0xff8ae0, ach: 'double_bounce', fx: 'spore' },
  { id: 'portal', slot: 'ball', name: '星門球', color: 0xd8b8ff, glow: 0x8a3aff, trail: 0xb87aff, ach: 'portal_birdie', fx: 'portal' },
  { id: 'star', slot: 'ball', name: '星辰球', color: 0xfff4c8, glow: 0xffc84a, trail: 0xfff0a0, ach: 'ch_stars45', fx: 'star' },
  { id: 'rainbow', slot: 'ball', name: '七彩球', color: 0xffffff, glow: 0xff6ae0, trail: 'rainbow', ach: 'stamps_world', fx: 'rainbow' },
  // ---- 奇幻球場第三批的成就獎勵 ----
  { id: 'coralB', slot: 'ball', name: '珊瑚球', color: 0xff8a7a, glow: 0x4ad8ff, trail: 0x9ae8ff, ach: 'coral_par', fx: 'aurora' },
  { id: 'pharaohP', slot: 'putter', name: '法老推桿', head: 0xe8b840, glow: 0x3a8aff, metal: 1, shaft: 0x1a2a6a, ach: 'pharaoh_par', fx: 'gold' },
  { id: 'fossilI', slot: 'iron', name: '化石鐵桿', head: 0xc8b898, metal: 0, shaft: 0x5a4a32, ach: 'jurassic_par', fx: 'ember' },
  { id: 'crystalC', slot: 'chipper', name: '水晶寶刀', head: 0xc8a8ff, glow: 0x8a4aff, metal: 1, shaft: 0xe8d8ff, ach: 'crystal_par', fx: 'frost' },
  { id: 'skyD', slot: 'driver', name: '蒼穹 Driver', head: 0xf4f8ff, glow: 0x8ac8ff, metal: 1, shaft: 0xc8e0ff, ach: 'sky_clean', fx: 'star' },
  { id: 'cosmoB', slot: 'ball', name: '萬象球', color: 0xffffff, glow: 0xff8ad8, trail: 'galaxy', ach: 'fantasy_master', fx: 'rainbow' },
  // ---- 寶刀（切推桿）：成就解鎖 ----
  { id: 'jadeC', slot: 'chipper', name: '青龍寶刀', head: 0x1f6a52, glow: 0x4affc0, metal: 1, shaft: 0xd8f0e4, ach: 'chip_in10', fx: 'aurora' },
  { id: 'dragonC', slot: 'chipper', name: '赤龍寶刀', head: 0x8a1410, glow: 0xffb030, metal: 1, shaft: 0x2a1410, ach: 'chip_round3', fx: 'ember' },
  { id: 'moonC', slot: 'chipper', name: '月影寶刀', head: 0x1a1e30, glow: 0xc8dcff, metal: 1, shaft: 0xe8eeff, ach: 'chip_in30y', fx: 'moon' },
  // ---- 超難成就的獎勵 ----
  { id: 'phoenixD', slot: 'driver', name: '鳳凰 Driver', head: 0xc8281a, glow: 0xffa020, metal: 1, shaft: 0xffd27a, ach: 'albatross', fx: 'ember' },
  { id: 'emeraldD', slot: 'driver', name: '翡翠 Driver', head: 0x0f6a48, glow: 0x3affb0, metal: 1, shaft: 0xd8f0e0, ach: 'gir18', fx: 'aurora' },
  { id: 'nebulaD', slot: 'driver', name: '星雲 Driver', head: 0x1a1040, glow: 0xff5ae0, shaft: 0x7a6aff, ach: 'ch300', fx: 'galaxy' },
  { id: 'platinumI', slot: 'iron', name: '白金鐵桿', head: 0xe6e8ee, metal: 1, shaft: 0xf6f6fa, ach: 'rounds200', fx: 'moon' },
  { id: 'meteorI', slot: 'iron', name: '隕星鐵桿', head: 0x2a2028, glow: 0xff8a3a, metal: 1, shaft: 0x5a4a50, ach: 'holeout150', fx: 'ember' },
  { id: 'masterI', slot: 'iron', name: '名人鐵桿', head: 0x1a4a2a, glow: 0xe8c860, metal: 1, shaft: 0xe8c860, ach: 'under5', fx: 'gold' },
  { id: 'royalP', slot: 'putter', name: '皇家推桿', head: 0xe8c050, glow: 0xfff0a0, metal: 1, shaft: 0x6a1a2a, ach: 'putts25', fx: 'gold' },
  { id: 'cosmosP', slot: 'putter', name: '宇宙推桿', head: 0x10082a, glow: 0x7a9aff, shaft: 0xc8b8ff, ach: 'ch_stars300', fx: 'galaxy' },
  { id: 'diamond', slot: 'ball', name: '鑽石球', color: 0xf2fbff, glow: 0x9ad8ff, trail: 0xe0f6ff, ach: 'hio3', fx: 'frost' },
  { id: 'comet', slot: 'ball', name: '彗星球', color: 0xdff0ff, glow: 0x5aa8ff, trail: 0x9ad0ff, ach: 'streak5', fx: 'star' },
  { id: 'jade', slot: 'ball', name: '翠玉球', color: 0x5ad09a, glow: 0x1a8a5a, trail: 0x8af0c0, ach: 'birdie100', fx: 'aurora' },
  { id: 'prism', slot: 'ball', name: '稜鏡球', color: 0xffffff, glow: 0x8ae8ff, trail: 'rainbow', ach: 'fx500', fx: 'rainbow' },
  { id: 'blackhole', slot: 'ball', name: '黑洞球', color: 0x08060e, glow: 0x7a3aff, trail: 'galaxy', ach: 'ch_p10', fx: 'void' },
  { id: 'abyssD', slot: 'driver', name: '終焉 Driver', head: 0x0a0618, glow: 0x5af0ff, metal: 1, shaft: 0x3a2a6a, ach: 'ch_p20', fx: 'galaxy' },
  { id: 'crownP', slot: 'putter', name: '王冠推桿', head: 0xf2c84a, glow: 0xffe08a, metal: 1, shaft: 0x2a1a50, ach: 'ch300_3', fx: 'star' },
  { id: 'auroraB', slot: 'ball', name: '極光球', color: 0xc8fff0, glow: 0x3affb8, trail: 0x9a8aff, ach: 'ch_stars700', fx: 'aurora' },
  // ---- 星星商店：用挑戰模式拿到的星星購買（price = 星星數；300 關全部滿星是 900 顆）----
  { id: 'carbonD', slot: 'driver', name: '碳纖 Driver', head: 0x1a1c20, metal: 1, shaft: 0x2a2c30, price: 40, desc: '霧黑的碳纖維桿頭，低調又專業。' },
  { id: 'crimsonD', slot: 'driver', name: '赤焰 Driver', head: 0xb01a1a, metal: 1, shaft: 0xd8d8d8, price: 60, desc: '烤漆赤紅色桿頭，站上發球台最顯眼。' },
  { id: 'jadeD', slot: 'driver', name: '青玉 Driver', head: 0x3a8a6a, metal: 1, shaft: 0xd8efe4, price: 80, desc: '溫潤的青玉色桿頭，帶著淡淡光澤。' },
  { id: 'neonD', slot: 'driver', name: '霓虹 Driver', head: 0x2a0a3a, glow: 0xff3ac8, shaft: 0xff8ae0, price: 110, desc: '霓虹夜城風格，桿頭會發出粉紅色的光。', fx: 'neon' },
  { id: 'sapphireD', slot: 'driver', name: '藍寶石 Driver', head: 0x1a3aa8, metal: 1, glow: 0x4a8aff, shaft: 0xc8d8ff, price: 140, desc: '藍寶石切面的桿頭，揮桿時閃著藍光。', fx: 'frost' },
  { id: 'dragonD', slot: 'driver', name: '金龍 Driver', head: 0xe0b040, metal: 1, glow: 0xff4a1a, shaft: 0xb01a1a, price: 170, desc: '金色桿頭配上赤紅桿身，揮桿時隱隱透出火光。', fx: 'ember' },
  { id: 'obsidianD', slot: 'driver', name: '黑曜 Driver', head: 0x120e1a, metal: 1, glow: 0x8a4aff, shaft: 0x2a2236, price: 200, desc: '黑曜石鍛造，桿頭裡藏著紫色暗光。', fx: 'void' },
  { id: 'thunderD', slot: 'driver', name: '雷霆 Driver', head: 0x2a2a3a, glow: 0xfff04a, shaft: 0xe8e8ff, price: 260, desc: '雷鳴高原的閃電封在桿頭裡，揮桿像打雷一樣。', fx: 'neon' },
  { id: 'inkI', slot: 'iron', name: '墨黑鐵桿', head: 0x14161a, metal: 1, shaft: 0x2a2c30, price: 30, desc: '黑色霧面的鍛造鐵桿。' },
  { id: 'titanI', slot: 'iron', name: '鈦灰鐵桿', head: 0x8a9098, metal: 1, shaft: 0xc8ccd2, price: 45, desc: '輕巧的鈦合金鐵桿。' },
  { id: 'rosegoldI', slot: 'iron', name: '玫瑰金鐵桿', head: 0xe0a090, metal: 1, shaft: 0xf0d0c8, price: 60, desc: '溫柔的玫瑰金色澤。' },
  { id: 'cobaltI', slot: 'iron', name: '鈷藍鐵桿', head: 0x2a5ad8, metal: 1, shaft: 0xa8c0ff, price: 85, desc: '深海般的鈷藍色，陽光下閃閃發亮。' },
  { id: 'emberI', slot: 'iron', name: '餘燼鐵桿', head: 0x3a1a12, glow: 0xff6a2a, shaft: 0x5a3a2a, price: 120, desc: '桿頭像剛從爐火裡拿出來，飄著火星。', fx: 'ember' },
  { id: 'auroraI', slot: 'iron', name: '極光鐵桿', head: 0x103a2a, glow: 0x3aff9a, shaft: 0xb88aff, price: 140, desc: '桿頭流動著綠色的極光。', fx: 'aurora' },
  { id: 'frostI', slot: 'iron', name: '寒霜鐵桿', head: 0xd8f0ff, glow: 0x6ac8ff, metal: 1, shaft: 0xeef8ff, price: 170, desc: '結了一層薄霜的鐵桿，揮桿時灑下冰晶。', fx: 'frost' },
  { id: 'goldI', slot: 'iron', name: '鎏金鐵桿', head: 0xe8b840, metal: 1, glow: 0xffd870, shaft: 0xf4e0a0, price: 240, desc: '整套鎏金打造，球場上最閃亮的鐵桿。', fx: 'gold' },
  { id: 'woodP', slot: 'putter', name: '木紋推桿', head: 0x8a5a30, shaft: 0xd8c8a0, price: 25, desc: '經典的木頭桿頭，手感溫潤。' },
  { id: 'bronzeP', slot: 'putter', name: '古銅推桿', head: 0xa8743a, metal: 1, shaft: 0xc8a070, price: 40, desc: '有年代感的古銅色推桿。' },
  { id: 'marbleP', slot: 'putter', name: '大理石推桿', head: 0xe8e4dc, shaft: 0x9a948a, price: 50, desc: '白色大理石紋的桿頭，沉穩典雅。' },
  { id: 'candyP', slot: 'putter', name: '糖果推桿', head: 0xff8ac8, shaft: 0xfff0f8, price: 70, desc: '糖果王國的紀念品，粉紅色的甜甜推桿。' },
  { id: 'crystalP', slot: 'putter', name: '水晶推桿', head: 0xb8f0ff, glow: 0x4ad8ff, shaft: 0xe8f8ff, price: 95, desc: '水晶洞窟裡採來的發光水晶。' },
  { id: 'neonP', slot: 'putter', name: '霓虹推桿', head: 0x1a0a2a, glow: 0x3affe8, shaft: 0xff6ae0, price: 110, desc: '夜城霓虹色的推桿。', fx: 'neon' },
  { id: 'auroraP', slot: 'putter', name: '極光推桿', head: 0x0f3a32, glow: 0x5affb0, shaft: 0xb88aff, price: 160, desc: '桿頭裡流動著極光。', fx: 'aurora' },
  { id: 'starP', slot: 'putter', name: '星光推桿', head: 0xfff4c8, glow: 0xffd84a, shaft: 0xfff8e0, price: 230, desc: '推出去的每一球都拖著星光。', fx: 'star' },
  { id: 'blackC', slot: 'chipper', name: '墨鋼寶刀', head: 0x1a1c20, metal: 1, shaft: 0x2a2c30, price: 40, desc: '霧黑鍛鋼的刀身，配一條金色飾帶，低調耐看。' },
  { id: 'copperC', slot: 'chipper', name: '紅銅寶刀', head: 0xb06a3a, metal: 1, shaft: 0xd8b090, price: 70, desc: '紅銅色刀身，打久了會有自己的光澤。' },
  { id: 'sakuraC', slot: 'chipper', name: '櫻吹雪寶刀', head: 0xf4c8d8, glow: 0xff8ab8, shaft: 0xfff0f4, price: 120, desc: '粉白刀身，切出去會飄下櫻花花瓣。', fx: 'petal' },
  { id: 'neonC', slot: 'chipper', name: '霓虹寶刀', head: 0x1a0a2a, glow: 0x3affe8, shaft: 0xff6ae0, price: 170, desc: '夜城風格，飾帶發出青色霓虹光。', fx: 'neon' },
  { id: 'goldC', slot: 'chipper', name: '黃金寶刀', head: 0xe8b840, glow: 0xffe08a, metal: 1, shaft: 0x3a2a14, price: 240, desc: '整把鎏金打造，傳說中的寶刀。', fx: 'gold' },
  { id: 'orange', slot: 'ball', name: '橘色球', color: 0xff9a2a, trail: 0xffb04a, price: 15, desc: '在草地上一眼就找得到。' },
  { id: 'pink', slot: 'ball', name: '粉紅球', color: 0xff9ad0, trail: 0xffb8e0, price: 15, desc: '可愛的粉紅色。' },
  { id: 'lime', slot: 'ball', name: '萊姆球', color: 0xc8ff4a, trail: 0xd8ff8a, price: 20, desc: '螢光萊姆綠，霧裡也看得到。' },
  { id: 'sky', slot: 'ball', name: '天空球', color: 0x8ad0ff, trail: 0xb8e4ff, price: 20, desc: '晴天的天空藍。' },
  { id: 'mint', slot: 'ball', name: '薄荷球', color: 0x9af0d0, trail: 0xa8ffe0, price: 30, desc: '清涼的薄荷綠。' },
  { id: 'obsidian', slot: 'ball', name: '黑曜球', color: 0x1a1a22, trail: 0x6a6a8a, price: 30, desc: '烏黑發亮的黑曜石。' },
  { id: 'pearl', slot: 'ball', name: '珍珠球', color: 0xfff8f0, glow: 0xd8c8b8, trail: 0xfff0e0, price: 50, desc: '珍珠光澤，在陽光下帶點虹彩。' },
  { id: 'moon', slot: 'ball', name: '月球', color: 0xd8d8e0, glow: 0x6a6a8a, trail: 0xe0e8ff, price: 60, desc: '月面基地帶回來的灰色月岩球。' },
  { id: 'emberB', slot: 'ball', name: '餘燼球', color: 0x4a1a0a, glow: 0xff6a1a, trail: 0xff8a3a, price: 100, desc: '燒紅的炭球，飛行時灑下火星。', fx: 'ember' },
  { id: 'sun', slot: 'ball', name: '太陽球', color: 0xffd060, glow: 0xff7a10, trail: 0xffc040, price: 110, desc: '像小太陽一樣發光，彈道是金色的。', fx: 'sun' },
  { id: 'sakuraB', slot: 'ball', name: '櫻花球', color: 0xffc8dc, glow: 0xff8ab8, trail: 0xffd8e8, price: 120, desc: '飛起來會飄下櫻花花瓣。', fx: 'petal' },
  { id: 'neonB', slot: 'ball', name: '霓虹球', color: 0x6af0ff, glow: 0x00c8ff, trail: 0xff4ac8, price: 130, desc: '青色發光的球，拖著粉紅色的彈道。', fx: 'neon' },
  { id: 'galaxy', slot: 'ball', name: '銀河球', color: 0x3a1a6a, glow: 0x9a4aff, trail: 'galaxy', price: 180, desc: '球裡封著一整片星河，彈道在紫、藍、粉之間流動，飛行時灑下星塵。', fx: 'galaxy' },
  { id: 'voidB', slot: 'ball', name: '虛空球', color: 0x1a0a30, glow: 0x9a4aff, trail: 0x6a3aff, price: 200, desc: '星環虛空的碎片，球周圍泛著紫光。', fx: 'void' },
  { id: 'sunset', slot: 'ball', name: '晚霞球', color: 0xffb070, glow: 0xff5a8a, trail: 'rainbow', price: 280, desc: '晚霞色的球，彈道是一道彩虹。', fx: 'rainbow' },
];
// 成就外觀的介紹
const ACH_SKIN_DESC = { coralB: '珊瑚海底 18 洞標準桿以內的紀念，珊瑚色的球拖著海水藍的尾巴。', pharaohP: '法老神殿 18 洞標準桿以內才拿得到，黃金配青金石。', fossilI: '恐龍谷 18 洞標準桿以內的證明，像從岩層裡挖出來的化石。', crystalC: '水晶洞窟 18 洞標準桿以內，刀身是一整塊紫水晶。', skyD: '天空之城 18 洞一次都沒墜入雲海，桿頭白得像雲。', cosmoB: '20 座奇幻球場全部打出標準桿以內，球裡裝著整個奇幻世界。', jadeC: '用寶刀切進 10 次的證明，青玉色刀身流動著光。', dragonC: '同一場用寶刀切進 3 次才拿得到，赤紅刀身燒著火光。', moonC: '從 30 碼外用寶刀切進，月光一樣冷冽的刀身。', goldD: '純金打造的一號木，只有打出天外飛球的人才拿得到。', frostD: '極光冰境的冰晶鍛造，桿頭透著冷冽的藍光。', galaxyD: '挑戰模式的最高榮譽，桿頭是一整片星河。',
  lavaI: '熔岩之心的火山岩打造，裂縫裡流著岩漿。', obsidianI: '黑曜石磨成的鐵桿，透出紫色的光。', moonP: '在月光下打磨的推桿。', lavaP: '被噴發口洗禮過的推桿，桿頭還在發燙。',
  sakuraP: '櫻川庭苑的櫻花木製成。', gold: '一桿進洞的紀念。', firefly: '螢火蟲聚成的光球。', lava: '還在冒著熱氣的熔岩球。', frost: '冰鏡牆的碎片凝成的冰晶球。', spore: '蘑菇幻境的孢子球。',
  portal: '吸進星門的漩渦。', star: '星光凝成的球。', rainbow: '環遊世界的證明，彈道會變換七彩顏色，飛行時灑出彩色火花。',
  phoenixD: '打出信天翁的人才拿得到，桿頭像浴火的鳳凰。', emeraldD: '整場每一洞都標準桿上果嶺的獎賞，翡翠色的桿頭泛著綠光。', nebulaD: '通過挑戰第 300 關的紀念，桿頭裡是一團粉紫色的星雲。',
  platinumI: '打滿 200 場的老將專屬，白金色的鍛造鐵桿。', meteorI: '150 碼外直接打進洞的證明，桿頭像燒紅的隕石。', masterI: '18 洞低於標準桿 5 桿的名人才配得上，墨綠配金色。',
  royalP: '一場只推 25 桿以內的推桿之王，金色桿頭配酒紅桿身。', cosmosP: '挑戰 100 關全部滿星，推桿裡封著整個宇宙。', diamond: '一桿進洞 3 次，鑽石一樣閃亮。',
  abyssD: '終焉星海全部滿星的證明。', crownP: '挑戰第 300 關拿到 3 星的王者之證。', auroraB: '挑戰累計 700 顆星，球裡流動著極光。', comet: '連續 5 洞小鳥，球飛起來拖著彗星尾巴。', jade: '累計 100 隻小鳥換來的翠玉。', prism: '觸發機關 500 次，球把光折成七彩。', blackhole: '挑戰最後一章全部滿星，球裡像是一個小黑洞。' };
export const skinDesc = s => s.desc || ACH_SKIN_DESC[s.id] || '';
export const skinKey = s => s.slot + ':' + s.id;
export const FX_NAME = { gold: '金色亮粉', frost: '冰晶閃光', galaxy: '星塵', ember: '火星', void: '紫色暗光', moon: '月光微塵', petal: '櫻花花瓣', firefly: '螢火', spore: '彩色孢子',
  portal: '星門漩光', star: '星光', rainbow: '七彩火花', neon: '霓虹光點', aurora: '極光粒子', sun: '日焰' };
export const SLOT_NAME = { driver: 'Driver / 木桿', iron: '鐵桿 / 挖起桿', putter: '推桿', chipper: '寶刀（切推桿）', ball: '高爾夫球' };
export const LOOK_KEY = { driver: 'drvSkin', iron: 'ironSkin', putter: 'putSkin', chipper: 'chipSkin', ball: 'ballSkin' };
export const skinById = (slot, id) => SKINS.find(s => s.slot === slot && s.id === (id || 'std')) || SKINS.find(s => s.slot === slot && s.std);
// 挑戰模式改成 50 關之前的成就：當時已經拿到的人，對應的外觀照樣保留
const LEGACY_ACH = { ch_p2: 'ch10_3', ch_p5: 'ch20_3' };
export const skinUnlocked = s => s.std || (s.ach ? !!(prog().ach[s.ach] || (LEGACY_ACH[s.ach] && prog().ach[LEGACY_ACH[s.ach]])) : (chal().owned || []).includes(skinKey(s)));
// 可以花的星星 = 挑戰總星數 - 已經買外觀花掉的（排行看的是總星數，不會因為消費而減少）
export const starBalance = () => Math.max(0, chal().total - (chal().spent || 0));
export function buySkin(s) {
  if (!s.price || skinUnlocked(s) || starBalance() < s.price) return false;
  const c = chal();
  c.spent = (c.spent || 0) + s.price;
  c.owned = [...(c.owned || []), skinKey(s)];
  dirtyChal = true;
  save(true);
  return true;
}
// 某個玩家外觀裡裝備的皮膚（球桿依類型分組）
export function equippedSkins(look = {}) {
  return { driver: skinById('driver', look.drvSkin), iron: skinById('iron', look.ironSkin), putter: skinById('putter', look.putSkin), chipper: skinById('chipper', look.chipSkin), ball: skinById('ball', look.ballSkin) };
}

// ---------------- 成就 ----------------
// tier（徽章外觀，畫面上不寫出難度）：bronze 簡單、silver 中級（這兩級只解開成就）、gold 困難（送 1~2 點能力點）、legend 超難（解鎖球桿或球的外觀）
// glyph：徽章上的字；pts：能力點；cnt + n：計數型（顯示進度）。已經達成的成就不受之後調整門檻影響
export const ACH_CATS = [['mile', '里程碑'], ['round', '整場表現'], ['shot', '精彩一桿'], ['fx', '奇幻機關'], ['pass', '球場護照'], ['chal', '挑戰模式']];
export const FX_KINDS = ['ring', 'shroom', 'vent', 'wall', 'portal', 'honey', 'gear', 'wisp', 'bumper', 'cloud', 'tramp', 'boost', 'cannon'];
export const ACH = [
  { id: 'first_round', cat: 'mile', tier: 'bronze', glyph: '初', name: '初登場', desc: '打完第一場回合（9 或 18 洞）', cnt: 'rounds', n: 1 },
  { id: 'rounds10', cat: 'mile', tier: 'silver', glyph: '常', name: '球場常客', desc: '累計打完 10 場回合', cnt: 'rounds', n: 10 },
  { id: 'rounds50', cat: 'mile', tier: 'gold', glyph: '將', name: '球場老將', desc: '累計打完 50 場回合', cnt: 'rounds', n: 50, pts: 1 },
  { id: 'rounds100', cat: 'mile', tier: 'gold', glyph: '帥', name: '百場達人', desc: '累計打完 100 場回合', cnt: 'rounds', n: 100, pts: 2 },
  { id: 'rounds200', cat: 'mile', tier: 'legend', glyph: '鉑', name: '球場傳奇', desc: '累計打完 200 場回合', cnt: 'rounds', n: 200 },
  { id: 'holes100', cat: 'mile', tier: 'silver', glyph: '百', name: '百洞之旅', desc: '累計打完 100 洞', cnt: 'holes', n: 100 },
  { id: 'holes500', cat: 'mile', tier: 'gold', glyph: '千', name: '千錘百鍊', desc: '累計打完 500 洞', cnt: 'holes', n: 500, pts: 1 },
  { id: 'holes1000', cat: 'mile', tier: 'gold', glyph: '萬', name: '千洞旅人', desc: '累計打完 1000 洞', cnt: 'holes', n: 1000, pts: 2 },
  { id: 'multi1', cat: 'mile', tier: 'bronze', glyph: '友', name: '球友相會', desc: '在連線模式打完一場', cnt: 'multi', n: 1 },
  { id: 'multi10', cat: 'mile', tier: 'silver', glyph: '伴', name: '固定球伴', desc: '在連線模式累計打完 10 場', cnt: 'multi', n: 10 },
  { id: 'match_win', cat: 'mile', tier: 'silver', glyph: '勝', name: '比洞得勝', desc: '在比洞賽贏過對手', cnt: 'matchWin', n: 1 },
  { id: 'match_win5', cat: 'mile', tier: 'gold', glyph: '霸', name: '比洞霸主', desc: '比洞賽累計贏 5 場', cnt: 'matchWin', n: 5, pts: 2 },

  { id: 'clean18', cat: 'round', tier: 'silver', glyph: '淨', name: '零失誤', desc: '打完 18 洞，沒有 OB、沒有落水、沒有掉進峽谷' },
  { id: 'nothree', cat: 'round', tier: 'silver', glyph: '穩', name: '推桿穩健', desc: '打完 18 洞沒有三推' },
  { id: 'bogeyfree', cat: 'round', tier: 'gold', glyph: '無', name: '無柏忌', desc: '打完 18 洞沒有任何一洞超過標準桿', pts: 2 },
  { id: 'under18', cat: 'round', tier: 'gold', glyph: '破', name: '破標準桿', desc: '18 洞總桿低於標準桿', pts: 2 },
  { id: 'under5', cat: 'round', tier: 'legend', glyph: '名', name: '名人賽', desc: '在一般球場（不含奇幻、三桿洞球場）18 洞低於標準桿 5 桿以上' },
  { id: 'birdies5r', cat: 'round', tier: 'gold', glyph: '鳳', name: '小鳥盛宴', desc: '同一場打出 5 個以上小鳥', pts: 1 },
  { id: 'putts27', cat: 'round', tier: 'gold', glyph: '巧', name: '推桿巧手', desc: '18 洞推桿總數 27 次以內', pts: 1 },
  { id: 'putts25', cat: 'round', tier: 'legend', glyph: '王', name: '推桿之王', desc: '18 洞推桿總數 25 次以內' },
  { id: 'gir12', cat: 'round', tier: 'gold', glyph: '準', name: '鐵桿精準', desc: '18 洞中 12 洞以上標準桿上果嶺', pts: 1 },
  { id: 'gir18', cat: 'round', tier: 'legend', glyph: '翠', name: '完美攻果嶺', desc: '18 洞每一洞都標準桿上果嶺' },
  { id: 'fwall', cat: 'round', tier: 'gold', glyph: '直', name: '百發百中', desc: '18 洞每一次開球（四桿、五桿洞）都停在球道上', pts: 2 },
  { id: 'tw_par', cat: 'round', tier: 'gold', glyph: '島', name: '寶島好手', desc: '在任一台灣球場 18 洞打出標準桿以內', pts: 1 },
  { id: 'world_par', cat: 'round', tier: 'gold', glyph: '洋', name: '名場征服', desc: '在任一國外球場 18 洞打出標準桿以內', pts: 2 },

  { id: 'birdie1', cat: 'shot', tier: 'bronze', glyph: '鳥', name: '第一隻小鳥', desc: '打出第一個小鳥（低於標準桿 1 桿）', cnt: 'birdie', n: 1 },
  { id: 'birdie10', cat: 'shot', tier: 'silver', glyph: '雀', name: '鳥語花香', desc: '累計打出 10 個小鳥', cnt: 'birdie', n: 10 },
  { id: 'birdie50', cat: 'shot', tier: 'gold', glyph: '群', name: '百鳥朝鳳', desc: '累計打出 50 個小鳥', cnt: 'birdie', n: 50, pts: 2 },
  { id: 'birdie100', cat: 'shot', tier: 'legend', glyph: '玉', name: '萬鳥之王', desc: '累計打出 100 個小鳥', cnt: 'birdie', n: 100 },
  { id: 'eagle1', cat: 'shot', tier: 'silver', glyph: '鷹', name: '展翅老鷹', desc: '打出老鷹（低於標準桿 2 桿）', cnt: 'eagle', n: 1 },
  { id: 'eagle5', cat: 'shot', tier: 'gold', glyph: '雕', name: '鷹揚天際', desc: '累計打出 5 個老鷹', cnt: 'eagle', n: 5, pts: 2 },
  { id: 'eagle_par4', cat: 'shot', tier: 'gold', glyph: '隼', name: '四桿老鷹', desc: '在四桿洞打出老鷹（兩桿進洞）', pts: 2 },
  { id: 'albatross', cat: 'shot', tier: 'legend', glyph: '翔', name: '信天翁', desc: '打出信天翁（低於標準桿 3 桿）', cnt: 'albatross', n: 1 },
  { id: 'hio', cat: 'shot', tier: 'legend', glyph: '一', name: '一桿進洞', desc: '打出一桿進洞', cnt: 'hio', n: 1 },
  { id: 'hio3', cat: 'shot', tier: 'legend', glyph: '鑽', name: '一桿進洞收藏家', desc: '累計 3 次一桿進洞', cnt: 'hio', n: 3 },
  { id: 'drive250', cat: 'shot', tier: 'bronze', glyph: '飛', name: '好球！', desc: '一號木開球（飛行加滾動）達 250 碼' },
  { id: 'drive300', cat: 'shot', tier: 'silver', glyph: '砲', name: '巨砲', desc: '一號木開球達 300 碼' },
  { id: 'drive330', cat: 'shot', tier: 'legend', glyph: '天', name: '天外飛球', desc: '一號木開球達 330 碼（要借下坡和順風）' },
  { id: 'chipin', cat: 'shot', tier: 'silver', glyph: '切', name: '切進！', desc: '不用推桿、從果嶺外直接打進洞（開球不算）' },
  { id: 'chip5', cat: 'shot', tier: 'gold', glyph: '妙', name: '切桿魔法', desc: '累計切進 5 次', cnt: 'chipins', n: 5, pts: 1 },
  { id: 'chip_green', cat: 'shot', tier: 'bronze', glyph: '刀', name: '寶刀初試', desc: '用寶刀從果嶺外送上果嶺，累計 10 次', cnt: 'chipGreen', n: 10 },
  { id: 'chip_near', cat: 'shot', tier: 'silver', glyph: '貼', name: '寶刀貼旗', desc: '用寶刀從果嶺外切到離洞 1 碼以內' },
  { id: 'chip_in1', cat: 'shot', tier: 'silver', glyph: '鞘', name: '寶刀出鞘', desc: '用寶刀從果嶺外直接切進洞' },
  { id: 'chip_green100', cat: 'shot', tier: 'gold', glyph: '煉', name: '百煉寶刀', desc: '用寶刀從果嶺外送上果嶺，累計 100 次', cnt: 'chipGreen', n: 100, pts: 1 },
  { id: 'chip_in20y', cat: 'shot', tier: 'gold', glyph: '封', name: '一刀封喉', desc: '用寶刀從 20 碼外直接切進洞', pts: 2 },
  { id: 'chip_in10', cat: 'shot', tier: 'legend', glyph: '龍', name: '寶刀屠龍', desc: '用寶刀切進洞，累計 10 次', cnt: 'chipperIns', n: 10 },
  { id: 'chip_round3', cat: 'shot', tier: 'legend', glyph: '斬', name: '一場三斬', desc: '同一場用寶刀切進 3 次' },
  { id: 'chip_in30y', cat: 'shot', tier: 'legend', glyph: '影', name: '月下一刀', desc: '用寶刀從 30 碼外直接切進洞' },
  { id: 'sandout', cat: 'shot', tier: 'gold', glyph: '沙', name: '沙坑神救', desc: '從沙坑裡直接打進洞', pts: 2 },
  { id: 'holeout100', cat: 'shot', tier: 'gold', glyph: '遠', name: '百碼一擊', desc: '從 100 碼外直接打進洞（開球不算）', pts: 2 },
  { id: 'holeout150', cat: 'shot', tier: 'legend', glyph: '隕', name: '天降神蹟', desc: '從 150 碼外直接打進洞（開球不算）' },
  { id: 'putt15', cat: 'shot', tier: 'silver', glyph: '推', name: '長推高手', desc: '15 碼以上一推進洞' },
  { id: 'putt30', cat: 'shot', tier: 'gold', glyph: '線', name: '超長推', desc: '30 碼以上一推進洞', pts: 2 },
  { id: 'putt20x3', cat: 'shot', tier: 'legend', glyph: '月', name: '推桿魔術師', desc: '20 碼以上一推進洞，累計 5 次', cnt: 'putt20', n: 5 },
  { id: 'streak3', cat: 'shot', tier: 'gold', glyph: '連', name: '三連鳥', desc: '同一場連續 3 洞小鳥以下', pts: 2 },
  { id: 'streak5', cat: 'shot', tier: 'legend', glyph: '彗', name: '五連鳥', desc: '同一場連續 5 洞小鳥以下' },
  { id: 'windbirdie', cat: 'shot', tier: 'gold', glyph: '風', name: '迎風展翅', desc: '在 12 mph 以上的風中打出小鳥以下', pts: 1 },

  { id: 'ring1', cat: 'fx', tier: 'bronze', glyph: '螢', name: '螢火初見', desc: '第一次穿過螢火之環', cnt: 'ring', n: 1 },
  { id: 'ring_two', cat: 'fx', tier: 'gold', glyph: '雙', name: '雙環連穿', desc: '同一桿穿過兩個螢火之環', pts: 2 },
  { id: 'ring30', cat: 'fx', tier: 'legend', glyph: '光', name: '螢火使者', desc: '累計穿過螢火之環 60 次', cnt: 'ring', n: 60 },
  { id: 'shroom1', cat: 'fx', tier: 'bronze', glyph: '菇', name: '彈彈菇', desc: '第一次被彈跳巨菇彈起來', cnt: 'shroom', n: 1 },
  { id: 'double_bounce', cat: 'fx', tier: 'legend', glyph: '彈', name: '菇菇連彈', desc: '同一桿被巨菇彈兩次以上，累計 8 次', cnt: 'doubleBounce', n: 8 },
  { id: 'vent1', cat: 'fx', tier: 'bronze', glyph: '火', name: '火山騎士', desc: '第一次被噴發口噴上天', cnt: 'vent', n: 1 },
  { id: 'vent_green3', cat: 'fx', tier: 'legend', glyph: '岩', name: '熔岩衝浪', desc: '被噴發口噴飛、球停在果嶺上，累計 8 次', cnt: 'ventGreen', n: 8 },
  { id: 'vent25', cat: 'fx', tier: 'legend', glyph: '爆', name: '噴發狂熱', desc: '累計被噴發口噴飛 60 次', cnt: 'vent', n: 60 },
  { id: 'wall1', cat: 'fx', tier: 'bronze', glyph: '冰', name: '冰鏡初體驗', desc: '第一次撞冰鏡牆反彈', cnt: 'wall', n: 1 },
  { id: 'wall_green', cat: 'fx', tier: 'silver', glyph: '反', name: '彈牆上果嶺', desc: '撞冰牆反彈的那一桿停在果嶺上' },
  { id: 'wall30', cat: 'fx', tier: 'legend', glyph: '鏡', name: '冰鏡大師', desc: '累計撞冰鏡牆 60 次', cnt: 'wall', n: 60 },
  { id: 'portal1', cat: 'fx', tier: 'bronze', glyph: '門', name: '星門旅人', desc: '第一次穿過星門', cnt: 'portal', n: 1 },
  { id: 'portal_birdie', cat: 'fx', tier: 'legend', glyph: '躍', name: '星門捷徑', desc: '穿過星門的那一洞打出小鳥以下，累計 8 次', cnt: 'portalBirdie', n: 8 },
  { id: 'void_clean', cat: 'fx', tier: 'gold', glyph: '浮', name: '不墜虛空', desc: '星環浮島打完 18 洞，一次都沒掉進虛空', pts: 2 },
  { id: 'ember_par', cat: 'fx', tier: 'legend', glyph: '炎', name: '熔岩征服者', desc: '熔岩之心 18 洞打出標準桿以內' },
  { id: 'aurora_par', cat: 'fx', tier: 'legend', glyph: '極', name: '極光之王', desc: '極光冰境 18 洞打出標準桿以內' },
  { id: 'sakura_no3', cat: 'fx', tier: 'legend', glyph: '櫻', name: '櫻下靜心', desc: '櫻川庭苑打完 18 洞沒有三推' },
  { id: 'honey1', cat: 'fx', tier: 'bronze', glyph: '蜜', name: '甜蜜陷阱', desc: '第一次被蜂蜜池黏住', cnt: 'honey', n: 1 },
  { id: 'gear1', cat: 'fx', tier: 'bronze', glyph: '輪', name: '齒輪轉轉', desc: '第一次被轉向齒輪甩出去', cnt: 'gear', n: 1 },
  { id: 'wisp1', cat: 'fx', tier: 'bronze', glyph: '魂', name: '引魂之路', desc: '第一次被引魂燈拉向旗桿', cnt: 'wisp', n: 1 },
  { id: 'bumper1', cat: 'fx', tier: 'bronze', glyph: '珠', name: '彈珠台', desc: '第一次撞到彈珠柱', cnt: 'bumper', n: 1 },
  { id: 'cloud1', cat: 'fx', tier: 'bronze', glyph: '雷', name: '遭雷擊', desc: '第一次被雷雲的閃電打中', cnt: 'cloud', n: 1 },
  { id: 'tramp1', cat: 'fx', tier: 'bronze', glyph: '凍', name: '彈彈果凍', desc: '第一次被彈跳床（果凍彈床）彈起來', cnt: 'tramp', n: 1 },
  { id: 'boost1', cat: 'fx', tier: 'bronze', glyph: '衝', name: '全速衝刺', desc: '第一次被加速帶推出去', cnt: 'boost', n: 1 },
  { id: 'cannon1', cat: 'fx', tier: 'bronze', glyph: '炮', name: '人間大砲', desc: '第一次被大砲（發射井）轟出去', cnt: 'cannon', n: 1 },
  { id: 'tramp_green', cat: 'fx', tier: 'silver', glyph: '跳', name: '一彈上果嶺', desc: '被彈跳床彈起來的那一桿停在果嶺上' },
  { id: 'boost_double', cat: 'fx', tier: 'gold', glyph: '疾', name: '連環加速', desc: '同一桿連續經過 2 個加速帶', pts: 1 },
  { id: 'cannon_near', cat: 'fx', tier: 'gold', glyph: '靶', name: '精準轟炸', desc: '被大砲轟出去的那一桿停在離洞 3 碼以內', pts: 1 },
  { id: 'sugar_par', cat: 'fx', tier: 'gold', glyph: '甜', name: '甜蜜征服', desc: '糖果王國 18 洞打出標準桿以內', pts: 1 },
  { id: 'neon_par', cat: 'fx', tier: 'gold', glyph: '霓', name: '夜城之王', desc: '霓虹夜城 18 洞打出標準桿以內', pts: 1 },
  { id: 'lunar_par', cat: 'fx', tier: 'gold', glyph: '宇', name: '月面漫步', desc: '靜海基地 18 洞打出標準桿以內', pts: 1 },
  { id: 'mirefen_par', cat: 'fx', tier: 'gold', glyph: '霧', name: '霧中明燈', desc: '迷霧沼澤 18 洞打出標準桿以內', pts: 2 },
  { id: 'mars_par', cat: 'fx', tier: 'gold', glyph: '赤', name: '火星殖民', desc: '赤色火星 18 洞打出標準桿以內', pts: 2 },
  { id: 'coral_par', cat: 'fx', tier: 'legend', glyph: '珊', name: '深海之主', desc: '珊瑚海底 18 洞打出標準桿以內' },
  { id: 'pharaoh_par', cat: 'fx', tier: 'legend', glyph: '法', name: '法老的祝福', desc: '法老神殿 18 洞打出標準桿以內' },
  { id: 'jurassic_par', cat: 'fx', tier: 'legend', glyph: '骨', name: '侏羅紀霸主', desc: '恐龍谷 18 洞打出標準桿以內' },
  { id: 'crystal_par', cat: 'fx', tier: 'legend', glyph: '紫', name: '水晶之心', desc: '水晶洞窟 18 洞打出標準桿以內' },
  { id: 'sky_clean', cat: 'fx', tier: 'legend', glyph: '翼', name: '不墜雲海', desc: '天空之城打完 18 洞，一次都沒墜入雲海' },
  { id: 'fantasy_master', cat: 'fx', tier: 'legend', glyph: '域', name: '奇幻全制霸', desc: '20 座奇幻球場都打出過 18 洞標準桿以內', cnt: 'fxParN', n: 20 },
  { id: 'fx100', cat: 'fx', tier: 'silver', glyph: '玩', name: '機關玩家', desc: '累計觸發機關 100 次', cnt: 'fxAll', n: 100 },
  { id: 'fx_all', cat: 'fx', tier: 'gold', glyph: '萬', name: '機關萬花筒', desc: '每一種機關都觸發過（環、巨菇、噴發口、牆、星門、蜂蜜 / 泥沼、齒輪、引魂燈 / 信標、彈珠柱、雲、彈跳床、加速帶、大砲）', pts: 2 },
  { id: 'fx500', cat: 'fx', tier: 'legend', glyph: '稜', name: '機關狂人', desc: '累計觸發機關 500 次', cnt: 'fxAll', n: 500 },

  { id: 'stamp1', cat: 'pass', tier: 'bronze', glyph: '章', name: '第一個章', desc: '蓋下第一個球場的章（分區球場要每一區都打過）', cnt: 'stamps', n: 1 },
  { id: 'stamps_tw', cat: 'pass', tier: 'silver', glyph: '台', name: '台灣巡禮', desc: '集滿所有台灣球場的章' },
  { id: 'stamps10', cat: 'pass', tier: 'gold', glyph: '旅', name: '旅行家', desc: '集滿 10 個球場的章', cnt: 'stamps', n: 10, pts: 1 },
  { id: 'stamps20', cat: 'pass', tier: 'gold', glyph: '程', name: '萬里行', desc: '集滿 20 個球場的章', cnt: 'stamps', n: 20, pts: 2 },
  { id: 'stamps_fx', cat: 'pass', tier: 'gold', glyph: '幻', name: '奇幻旅人', desc: '集滿所有奇幻球場的章', pts: 2 },
  { id: 'stamp_max', cat: 'pass', tier: 'gold', glyph: '印', name: '老主顧', desc: '同一座球場的章升到最高等級（打滿 10 場）', pts: 1 },
  { id: 'stamps_world', cat: 'pass', tier: 'legend', glyph: '界', name: '環遊世界', desc: '集滿所有球場的章' },

  // 挑戰模式（300 關：前 100 關每章 10 關、之後每章 20 關，共 20 章）
  { id: 'ch_star1', cat: 'chal', tier: 'bronze', glyph: '星', name: '第一顆星', desc: '在挑戰模式拿到第一顆星', cnt: 'chalStars', n: 1 },
  { id: 'ch5', cat: 'chal', tier: 'bronze', glyph: '五', name: '挑戰入門', desc: '通過挑戰第 5 關' },
  { id: 'ch10', cat: 'chal', tier: 'bronze', glyph: '十', name: '第一章完成', desc: '通過挑戰第 10 關' },
  { id: 'ch20', cat: 'chal', tier: 'silver', glyph: '貳', name: '第二章完成', desc: '通過挑戰第 20 關' },
  { id: 'ch30', cat: 'chal', tier: 'silver', glyph: '參', name: '第三章完成', desc: '通過挑戰第 30 關' },
  { id: 'ch40', cat: 'chal', tier: 'silver', glyph: '肆', name: '第四章完成', desc: '通過挑戰第 40 關' },
  { id: 'ch50', cat: 'chal', tier: 'silver', glyph: '伍', name: '半程', desc: '通過挑戰第 50 關「水晶終章」' },
  { id: 'ch60', cat: 'chal', tier: 'gold', glyph: '陸', name: '第六章完成', desc: '通過挑戰第 60 關', pts: 1 },
  { id: 'ch70', cat: 'chal', tier: 'gold', glyph: '柒', name: '第七章完成', desc: '通過挑戰第 70 關', pts: 1 },
  { id: 'ch80', cat: 'chal', tier: 'gold', glyph: '捌', name: '第八章完成', desc: '通過挑戰第 80 關', pts: 2 },
  { id: 'ch90', cat: 'chal', tier: 'gold', glyph: '玖', name: '第九章完成', desc: '通過挑戰第 90 關', pts: 2 },
  { id: 'ch100', cat: 'chal', tier: 'gold', glyph: '佰', name: '百關制霸', desc: '通過挑戰第 100 關', pts: 2 },
  { id: 'ch150', cat: 'chal', tier: 'gold', glyph: '深', name: '深海之後', desc: '通過挑戰第 180 關（深海秘境）', pts: 2 },
  { id: 'ch200', cat: 'chal', tier: 'gold', glyph: '雙', name: '兩百關', desc: '通過挑戰第 200 關', pts: 2 },
  { id: 'ch250', cat: 'chal', tier: 'gold', glyph: '炎', name: '烈焰行者', desc: '通過挑戰第 260 關', pts: 2 },
  { id: 'ch300', cat: 'chal', tier: 'legend', glyph: '終', name: '三百關制霸', desc: '通過挑戰第 300 關「終焉星海」' },
  { id: 'ch_stars30', cat: 'chal', tier: 'silver', glyph: '摘', name: '摘星者', desc: '挑戰模式累計 30 顆星', cnt: 'chalStars', n: 30 },
  { id: 'ch_stars75', cat: 'chal', tier: 'silver', glyph: '銀', name: '銀河半程', desc: '挑戰模式累計 75 顆星', cnt: 'chalStars', n: 75 },
  { id: 'ch_stars100', cat: 'chal', tier: 'gold', glyph: '百', name: '百星', desc: '挑戰模式累計 100 顆星', cnt: 'chalStars', n: 100, pts: 1 },
  { id: 'ch_stars150', cat: 'chal', tier: 'gold', glyph: '滿', name: '星光閃耀', desc: '挑戰模式累計 150 顆星', cnt: 'chalStars', n: 150, pts: 2 },
  { id: 'ch_stars200', cat: 'chal', tier: 'gold', glyph: '燦', name: '星海', desc: '挑戰模式累計 200 顆星', cnt: 'chalStars', n: 200, pts: 2 },
  { id: 'ch_stars350', cat: 'chal', tier: 'gold', glyph: '曜', name: '繁星', desc: '挑戰模式累計 350 顆星', cnt: 'chalStars', n: 350, pts: 2 },
  { id: 'ch_stars45', cat: 'chal', tier: 'legend', glyph: '辰', name: '星光滿載', desc: '挑戰模式累計 500 顆星', cnt: 'chalStars', n: 500 },
  { id: 'ch_stars700', cat: 'chal', tier: 'legend', glyph: '極', name: '極光之星', desc: '挑戰模式累計 700 顆星', cnt: 'chalStars', n: 700 },
  { id: 'ch_stars300', cat: 'chal', tier: 'legend', glyph: '宙', name: '全宇宙滿星', desc: '挑戰模式 300 關全部 3 星（900 顆）', cnt: 'chalStars', n: 900 },
  { id: 'ch_p1', cat: 'chal', tier: 'silver', glyph: '壹', name: '第一章滿星', desc: '挑戰第 1~10 關全部 3 星' },
  { id: 'ch_p2', cat: 'chal', tier: 'legend', glyph: '曜', name: '第二章滿星', desc: '挑戰第 11~20 關全部 3 星' },
  { id: 'ch_p3', cat: 'chal', tier: 'gold', glyph: '輝', name: '第三章滿星', desc: '挑戰第 21~30 關全部 3 星', pts: 1 },
  { id: 'ch_p4', cat: 'chal', tier: 'gold', glyph: '耀', name: '第四章滿星', desc: '挑戰第 31~40 關全部 3 星', pts: 2 },
  { id: 'ch_p5', cat: 'chal', tier: 'legend', glyph: '河', name: '星河傳說', desc: '挑戰第 41~50 關全部 3 星' },
  { id: 'ch_p6', cat: 'chal', tier: 'gold', glyph: '炫', name: '第六章滿星', desc: '挑戰第 51~60 關全部 3 星', pts: 2 },
  { id: 'ch_p7', cat: 'chal', tier: 'gold', glyph: '璨', name: '第七章滿星', desc: '挑戰第 61~70 關全部 3 星', pts: 2 },
  { id: 'ch_p8', cat: 'chal', tier: 'gold', glyph: '晶', name: '第八章滿星', desc: '挑戰第 71~80 關全部 3 星', pts: 2 },
  { id: 'ch_p9', cat: 'chal', tier: 'gold', glyph: '曦', name: '第九章滿星', desc: '挑戰第 81~90 關全部 3 星', pts: 2 },
  { id: 'ch_p10', cat: 'chal', tier: 'legend', glyph: '淵', name: '深淵傳說', desc: '挑戰第 91~100 關全部 3 星' },
  { id: 'ch_p11', cat: 'chal', tier: 'gold', glyph: '雲', name: '天空群島滿星', desc: '挑戰第 11 章（第 101~120 關）全部 3 星', pts: 2 },
  { id: 'ch_p12', cat: 'chal', tier: 'gold', glyph: '糖', name: '糖果工廠滿星', desc: '挑戰第 12 章（第 121~140 關）全部 3 星', pts: 2 },
  { id: 'ch_p13', cat: 'chal', tier: 'gold', glyph: '古', name: '遠古遺跡滿星', desc: '挑戰第 13 章（第 141~160 關）全部 3 星', pts: 2 },
  { id: 'ch_p14', cat: 'chal', tier: 'gold', glyph: '潮', name: '深海秘境滿星', desc: '挑戰第 14 章（第 161~180 關）全部 3 星', pts: 2 },
  { id: 'ch_p15', cat: 'chal', tier: 'gold', glyph: '冰', name: '寒冰王國滿星', desc: '挑戰第 15 章（第 181~200 關）全部 3 星', pts: 2 },
  { id: 'ch_p16', cat: 'chal', tier: 'gold', glyph: '夜', name: '夜幕都市滿星', desc: '挑戰第 16 章（第 201~220 關）全部 3 星', pts: 2 },
  { id: 'ch_p17', cat: 'chal', tier: 'gold', glyph: '林', name: '魔法森林滿星', desc: '挑戰第 17 章（第 221~240 關）全部 3 星', pts: 2 },
  { id: 'ch_p18', cat: 'chal', tier: 'gold', glyph: '械', name: '機械之心滿星', desc: '挑戰第 18 章（第 241~260 關）全部 3 星', pts: 2 },
  { id: 'ch_p19', cat: 'chal', tier: 'gold', glyph: '焰', name: '火焰國度滿星', desc: '挑戰第 19 章（第 261~280 關）全部 3 星', pts: 2 },
  { id: 'ch_p20', cat: 'chal', tier: 'legend', glyph: '冠', name: '終焉星海滿星', desc: '挑戰第 20 章（第 281~300 關）全部 3 星' },
  { id: 'ch_themes', cat: 'chal', tier: 'gold', glyph: '遊', name: '萬國旅人', desc: '每一種挑戰主題都至少拿過 1 顆星', pts: 1 },
  { id: 'ch_hio', cat: 'chal', tier: 'gold', glyph: '擊', name: '挑戰一桿進洞', desc: '在挑戰模式打出一桿進洞', pts: 2 },
  { id: 'ch_combo', cat: 'chal', tier: 'gold', glyph: '鎖', name: '機關連鎖', desc: '挑戰模式中一桿連續觸發 3 次以上機關', pts: 2 },
  { id: 'ch50_3', cat: 'chal', tier: 'gold', glyph: '巔', name: '水晶之巔', desc: '挑戰第 50 關「水晶終章」拿到 3 星', pts: 2 },
  { id: 'ch100_3', cat: 'chal', tier: 'gold', glyph: '巔', name: '無盡之巔', desc: '挑戰第 100 關拿到 3 星', pts: 2 },
  { id: 'ch300_3', cat: 'chal', tier: 'legend', glyph: '王', name: '星海之王', desc: '挑戰第 300 關拿到 3 星' },
];
export const TIER_NAME = { bronze: '銅', silver: '銀', gold: '金', legend: '傳說' };      // 只在程式裡用，畫面上不顯示難度
export const achById = id => ACH.find(a => a.id === id);

// 球場護照：每座一般球場（分區球場算同一座）
export const PASSPORT = COURSES.map(c => ({ id: c.id, name: c.name, en: c.en, group: c.group, nines: c.nines ? c.nines.map(n => ({ id: n.id, name: n.name })) : null }));
// 這個球場的章蓋成了沒（分區球場：每一區都打過）
export function stampDone(id) {
  const x = prog().stamps[id], c = PASSPORT.find(q => q.id === id);
  if (!x || !c) return false;
  if (c.nines) return c.nines.every(n => x.nines && x.nines[n.id]);
  return !!x.date;
}

// ---------------- 進度 ----------------
export function prog() {
  const p = session.profile || (session.profile = {});
  const g = p.prog = p.prog || {};
  g.ach = g.ach || {}; g.cnt = g.cnt || {}; g.stamps = g.stamps || {};
  return g;
}
export function chal() {
  const p = session.profile || (session.profile = {});
  const c = p.chal = p.chal || {};
  c.stars = c.stars || {}; c.best = c.best || {}; c.owned = c.owned || []; c.spent = c.spent || 0;
  c.total = Object.values(c.stars).reduce((s, v) => s + v, 0);
  return c;
}
export const progressOf = a => a.cnt ? Math.min(a.n, Number(prog().cnt[a.cnt]) || 0) : (prog().ach[a.id] ? 1 : 0);

let dirty = false, dirtyChal = false, newly = [], saveTimer = null;
export function bump(key, n = 1) { const c = prog().cnt; c[key] = (Number(c[key]) || 0) + n; dirty = true; }
export function setMax(key, v) { const c = prog().cnt; if (v > (Number(c[key]) || 0)) { c[key] = v; dirty = true; } }
// 奇幻球場 18 洞標準桿以內：每座記一個計數（伺服器合併計數只增不減），再數有幾座
export function fantasyPar(id) {
  setMax('fxpar_' + id, 1);
  setMax('fxParN', COURSES.filter(c => c.group === 'fantasy' && Number(prog().cnt['fxpar_' + c.id])).length);
}

// 解鎖一個成就（已達成的不重複）；跳出動畫並排程存檔
export function unlock(id) {
  const g = prog();
  if (g.ach[id]) return false;
  const a = achById(id);
  if (!a) return false;
  g.ach[id] = new Date().toISOString();
  newly.push(id);
  dirty = true;
  popup(a);
  return true;
}

// 計數型成就：數字到了就解鎖
// 挑戰模式的關卡進度型成就（每次登入、每關打完都重新檢查；levels = challenge.js 的 LEVELS）
export function checkChallenge(levels) {
  const st = chal().stars, s = n => st[levels[n - 1].id] || 0;
  for (const n of [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]) if (levels.length >= n && s(n) >= 1) unlock('ch' + n);
  for (const [n, id] of [[180, 'ch150'], [200, 'ch200'], [260, 'ch250'], [300, 'ch300']]) if (levels.length >= n && s(n) >= 1) unlock(id);
  for (let k = 0; k < 10; k++) { const lv = levels.slice(100 + k * 20, 120 + k * 20); if (lv.length === 20 && lv.every(l => (st[l.id] || 0) >= 3)) unlock('ch_p' + (11 + k)); }
  if (levels.length >= 300 && s(300) >= 3) unlock('ch300_3');
  for (let k = 0; k < 10; k++) { const lv = levels.slice(k * 10, k * 10 + 10); if (lv.length === 10 && lv.every(l => (st[l.id] || 0) >= 3)) unlock('ch_p' + (k + 1)); }
  if (levels.length >= 50 && s(50) >= 3) unlock('ch50_3');
  if (levels.length >= 100 && s(100) >= 3) unlock('ch100_3');
  const themes = new Set(levels.map(l => l.theme));
  if ([...themes].every(t => levels.some(l => l.theme === t && (st[l.id] || 0) >= 1))) unlock('ch_themes');
}

export function checkCounters() {
  const c = prog().cnt;
  c.stamps = PASSPORT.filter(x => stampDone(x.id)).length;
  c.chalStars = chal().total;
  for (const a of ACH) if (a.cnt && (Number(c[a.cnt]) || 0) >= a.n) unlock(a.id);
  const has = stampDone;
  if (PASSPORT.filter(x => x.group === 'taiwan').every(x => has(x.id))) unlock('stamps_tw');
  if (PASSPORT.filter(x => x.group === 'fantasy').every(x => has(x.id))) unlock('stamps_fx');
  if (PASSPORT.every(x => has(x.id))) unlock('stamps_world');
  if (Object.values(prog().stamps).some(x => (x.n || 0) >= 10)) unlock('stamp_max');
  if (FX_KINDS.every(k => (Number(c[k]) || 0) >= 1)) unlock('fx_all');
  save();
}

// 蓋球場護照的章：一般球場打完 18 洞；分區球場記下這一場打完的區（nineIds），每一區都打過才算蓋成
//   strokes = 18 洞的桿數（只打 9 洞時傳 null，不算最佳成績）；回傳 true = 這一場剛好把章蓋成
export function stamp(courseId, strokes, nineIds = null) {
  const st = prog().stamps, now = new Date().toISOString(), before = stampDone(courseId);
  const cur = st[courseId] || { n: 0 };
  if (strokes) { cur.best = Math.min(cur.best || 999, strokes); cur.n = (cur.n || 0) + 1; }
  // 分區球場：每一區第一次打完的時間（蓋章用）＋打完幾次（選球場時顯示各區完成次數）
  if (nineIds) { cur.nines = cur.nines || {}; cur.nineN = cur.nineN || {}; for (const k of nineIds) { if (!cur.nines[k]) cur.nines[k] = now; cur.nineN[k] = (cur.nineN[k] || (cur.nines[k] !== now ? 1 : 0)) + 1; } }
  st[courseId] = cur;
  if (!before && stampDone(courseId)) cur.date = now;
  else if (!nineIds && strokes && !cur.date) cur.date = now;
  dirty = true;
  return !before && stampDone(courseId);
}

// 挑戰星數（只會更新成比較好的成績）
export function setStars(levelId, stars, strokes) {
  const c = chal();
  if (stars > (c.stars[levelId] || 0)) { c.stars[levelId] = stars; dirtyChal = true; }
  if (strokes && (!c.best[levelId] || strokes < c.best[levelId])) { c.best[levelId] = strokes; dirtyChal = true; }
  c.total = Object.values(c.stars).reduce((s, v) => s + v, 0);
}

// 存回伺服器：合併後回傳新的個人資料（新成就的能力點在伺服器加）
export function save(now = false) {
  if (!dirty && !dirtyChal) return Promise.resolve();
  clearTimeout(saveTimer);
  return new Promise(res => {
    saveTimer = setTimeout(async () => {
      const points = {};
      for (const id of newly) points[id] = achById(id)?.pts || 0;
      const payload = { prog: prog(), points };
      if (dirtyChal) payload.chal = chal();
      const sent = newly; newly = []; dirty = false; dirtyChal = false;
      try {
        const r = await call('saveProgress', payload);
        const keepLook = session.profile.look;
        session.profile = { ...r.profile, look: r.profile.look || keepLook };
      } catch (e) {
        console.warn('進度儲存失敗，下次再試', e);
        newly = sent.concat(newly); dirty = true; if (payload.chal) dirtyChal = true;
      }
      res();
    }, now ? 0 : 1200);
  });
}

// ---------------- 達成時的動畫提示 ----------------
const queue = [];
let showing = false;
function popup(a) { queue.push(a); if (!showing) next(); }
function next() {
  const a = queue.shift();
  if (!a) { showing = false; return; }
  showing = true;
  let el = document.getElementById('ach-pop');
  if (!el) { el = document.createElement('div'); el.id = 'ach-pop'; document.body.appendChild(el); }
  const skin = SKINS.find(s => s.ach === a.id);
  el.className = 'ach-pop tier-' + a.tier;
  el.innerHTML = `${medalHtml(a, true, 'ap-medal')}
    <div class="ap-text"><small>成就達成</small><b>${a.name}</b><span>${a.desc}</span>
    ${a.pts || skin ? `<em>${[a.pts ? `能力點 +${a.pts}` : '', skin ? `解鎖「${skin.name}」` : ''].filter(Boolean).join('　')}</em>` : ''}</div>`;
  void el.offsetWidth;
  el.classList.add('show');
  try { navigator.vibrate && navigator.vibrate(a.tier === 'legend' ? [60, 40, 120] : 40); } catch (e) {}
  setTimeout(() => { el.classList.remove('show'); setTimeout(next, 450); }, a.tier === 'legend' || skin ? 4200 : 3200);
}

// 徽章圖示（紀錄頁、提示共用）
// 徽章（SVG）：簡單 = 素面銅幣、中級 = 齒邊銀幣、困難 = 金色花環章加緞帶、超難 = 寶石星芒章（會發光）；畫面上不寫難度，看外觀分辨
const MEDAL_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <radialGradient id="mdB" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#f6d2ae"/><stop offset=".55" stop-color="#b8763f"/><stop offset="1" stop-color="#6a3e1c"/></radialGradient>
  <radialGradient id="mdS" cx="35%" cy="28%" r="80%"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#c3ccd6"/><stop offset="1" stop-color="#5f6b78"/></radialGradient>
  <linearGradient id="mdS2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eef2f6"/><stop offset="1" stop-color="#8a96a4"/></linearGradient>
  <radialGradient id="mdG" cx="35%" cy="28%" r="80%"><stop offset="0" stop-color="#fff6c8"/><stop offset=".5" stop-color="#e3ad3c"/><stop offset="1" stop-color="#7e4f0e"/></radialGradient>
  <linearGradient id="mdG2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe9a0"/><stop offset=".5" stop-color="#d49a2a"/><stop offset="1" stop-color="#8a5a12"/></linearGradient>
  <linearGradient id="mdR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8263a"/><stop offset="1" stop-color="#6a0f1e"/></linearGradient>
  <linearGradient id="mdL" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2b0"/><stop offset=".45" stop-color="#e8b84a"/><stop offset="1" stop-color="#9a6416"/></linearGradient>
  <radialGradient id="mdP" cx="38%" cy="30%" r="78%"><stop offset="0" stop-color="#f4e6ff"/><stop offset=".45" stop-color="#9a5cf0"/><stop offset="1" stop-color="#2a0f62"/></radialGradient>
</defs></svg>`;
const ring = (n, r1, r2, cx = 32, cy = 32) => Array.from({ length: n * 2 }, (_, i) => { const a = i * Math.PI / n - Math.PI / 2, r = i % 2 ? r2 : r1; return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`; }).join(' ');
const MEDAL_SHAPE = {
  bronze: `<circle cx="32" cy="32" r="24" fill="url(#mdB)" stroke="#5a3214" stroke-width="1.5"/><circle cx="32" cy="32" r="19.5" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="1"/>`,
  silver: `<polygon points="${ring(18, 27, 24.5)}" fill="url(#mdS)" stroke="#4f5a66" stroke-width="1"/><circle cx="32" cy="32" r="20" fill="url(#mdS2)" stroke="rgba(255,255,255,.7)" stroke-width="1.2"/>`,
  gold: `<polygon points="20,40 13,61 20,57 25,62 29,44" fill="url(#mdR)"/><polygon points="44,40 51,61 44,57 39,62 35,44" fill="url(#mdR)"/>
    <polygon points="${ring(16, 29, 25)}" fill="url(#mdG2)" stroke="#6e440c" stroke-width="1"/><circle cx="32" cy="32" r="21" fill="url(#mdG)" stroke="#fff3c0" stroke-width="1.3"/><circle cx="32" cy="32" r="17.5" fill="none" stroke="rgba(110,68,12,.45)" stroke-width=".8" stroke-dasharray="1.6 1.6"/>`,
  legend: `<polygon points="${ring(12, 31, 22)}" fill="url(#mdL)" stroke="#7a4a0c" stroke-width=".8"/><polygon points="32,11 50,21.5 50,42.5 32,53 14,42.5 14,21.5" fill="url(#mdP)" stroke="#fff0b8" stroke-width="1.6"/>
    <polygon points="32,15 46,23.5 32,30 18,23.5" fill="rgba(255,255,255,.22)"/><circle cx="23" cy="20" r="1.6" fill="#fff"/><circle cx="45" cy="44" r="1" fill="#fff"/>`,
};
let medalDefsReady = false;
export const medalHtml = (a, got, cls = '') => {
  if (!medalDefsReady && typeof document !== 'undefined' && document.body) { document.body.insertAdjacentHTML('beforeend', MEDAL_DEFS); medalDefsReady = true; }
  return `<span class="medal2 t-${a.tier} ${got ? '' : 'locked'} ${cls}"><svg viewBox="0 0 64 64" aria-hidden="true">${MEDAL_SHAPE[a.tier] || MEDAL_SHAPE.bronze}
    <text x="32" y="${a.tier === 'legend' ? 39.5 : 39}" text-anchor="middle">${a.glyph}</text></svg></span>`;
};
