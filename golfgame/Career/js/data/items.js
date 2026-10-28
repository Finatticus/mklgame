// 目錄：裝備（服裝、球具）、桿弟、教練、經紀人、專業團隊、贊助商類型、資產
//   品牌都是虛構的；稀有度：一般、精良、稀有、傳奇、冠軍
export const RARITY = { common: { name: '一般', color: '#8a8a80', mul: 1 }, fine: { name: '精良', color: '#3f8a4a', mul: 1.5 }, rare: { name: '稀有', color: '#2f6fb0', mul: 2.2 }, legend: { name: '傳奇', color: '#8a4ac0', mul: 3.2 }, champ: { name: '冠軍', color: '#c09a30', mul: 0 } };
export const BRANDS = { north: 'Northfield', kes: 'Kestrel', aur: 'Aurum', pine: 'Pinecrest', van: 'Vanta', haru: 'Haru', link: 'Linkline', collab: 'Vanta × Haru' };
export const SLOTS = { hat: '帽子', top: '上衣', bottom: '下身', shoes: '鞋子', glove: '手套', acc: '配件', driver: '一號木', wood: '球道木 / 混血', irons: '鐵桿', wedge: '挖起桿', putter: '推桿', ball: '球' };
export const CLOTHES = ['hat', 'top', 'bottom', 'shoes', 'glove', 'acc'];
// 部位的分類（裝備頁、商店）
export const SLOT_GROUPS = { '球具': ['driver', 'wood', 'irons', 'wedge', 'putter', 'ball'], '服裝': ['hat', 'top', 'bottom', 'shoes', 'glove', 'acc'] };

// 裝備：id、欄位、名稱、品牌、稀有度、能力（每 +1 等級加成 ×1.25）、價格、外觀（顏色等，角色換裝用）、條件（when：特定情況才有效，畫面上顯示說明）
const I = (id, slot, name, brand, rarity, stats, price, o = {}) => ({ id, slot, name, brand, rarity, stats, price, ...o });
export const ITEMS = [
  // 帽子
  I('cap_basic', 'hat', '棉質球帽', 'north', 'common', {}, 25, { look: { cap: '#1d3a2a', hat: 'cap' } }),
  I('cap_sun', 'hat', '遮陽帽', 'pine', 'fine', { reading: 1 }, 120, { look: { hat: 'visor', cap: '#ffffff' }, note: '晴天讀果嶺 +1' }),
  I('cap_bucket', 'hat', '漁夫帽', 'link', 'fine', { mental: 1 }, 140, { look: { hat: 'bucket', cap: '#d8c08a' }, note: '強風日抗壓 +1' }),
  I('cap_tour', 'hat', '巡迴賽球帽', 'kes', 'rare', { reading: 1, mental: 1 }, 650, { look: { hat: 'cap', cap: '#20324f' } }),
  I('cap_cool', 'hat', '涼感運動帽', 'aur', 'fine', { consistency: 1 }, 95, { look: { hat: 'cap', cap: '#e8e1d0' }, note: '夏天不容易累' }),
  I('cap_legend', 'hat', '冠軍訂製球帽', 'van', 'legend', { reading: 2, mental: 1 }, 1800, { look: { hat: 'cap', cap: '#111111' } }),
  // 上衣
  I('top_polo', 'top', '棉質 Polo', 'north', 'common', {}, 40, { look: { shirt: '#f2ead8', top: 'polo' } }),
  I('top_dry', 'top', '機能 Polo', 'kes', 'fine', { consistency: 1 }, 160, { look: { shirt: '#20324f', top: 'polo' }, note: '體能消耗 −5%' }),
  I('top_long', 'top', '長袖機能衣', 'aur', 'fine', { accuracy: 1 }, 190, { look: { shirt: '#ffffff', top: 'long' } }),
  I('top_vest', 'top', '毛衣背心', 'link', 'rare', { mental: 1, touch: 1 }, 520, { look: { shirt: '#f2ead8', top: 'vest', vest: '#2a3442' } }),
  I('top_wind', 'top', '防風外套', 'link', 'rare', { consistency: 2 }, 780, { look: { shirt: '#1c1c1c', top: 'jacket' }, note: '強風日穩定度 +1' }),
  I('top_tour', 'top', '巡迴賽 Polo', 'van', 'legend', { consistency: 1, accuracy: 1, mental: 1 }, 2400, { look: { shirt: '#a3302a', top: 'polo' } }),
  I('top_rain', 'top', '輕量雨衣', 'pine', 'fine', { recovery: 1 }, 150, { look: { shirt: '#2c4a6b', top: 'jacket' }, note: '雨天、強風日穿' }),
  I('top_compress', 'top', '壓縮機能衣', 'kes', 'rare', { power: 1, consistency: 1 }, 700, { look: { shirt: '#1c1c1c', top: 'long' } }),
  // 下身
  I('bot_pants', 'bottom', '休閒長褲', 'north', 'common', {}, 45, { look: { pants: '#2a3442', bottom: 'pants' } }),
  I('bot_flex', 'bottom', '彈性長褲', 'kes', 'fine', { launch: 1 }, 170, { look: { pants: '#e8e1d0', bottom: 'pants' } }),
  I('bot_shorts', 'bottom', '短褲', 'pine', 'fine', { recovery: 1 }, 110, { look: { pants: '#6b6255', bottom: 'shorts' } }),
  I('bot_skirt', 'bottom', '球裙', 'aur', 'fine', { launch: 1 }, 170, { look: { pants: '#ffffff', bottom: 'skirt' } }),
  I('bot_tour', 'bottom', '巡迴賽長褲', 'van', 'rare', { launch: 1, consistency: 1 }, 640, { look: { pants: '#1c1c1c', bottom: 'pants' } }),
  I('bot_rain', 'bottom', '防水長褲', 'pine', 'fine', { recovery: 1 }, 130, { look: { pants: '#2a3442', bottom: 'pants' } }),
  I('bot_legend', 'bottom', '訂製西裝長褲', 'link', 'legend', { launch: 1, consistency: 1, mental: 1 }, 1900, { look: { pants: '#d8d2c2', bottom: 'pants' } }),
  // 鞋子
  I('shoe_basic', 'shoes', '入門球鞋', 'north', 'common', {}, 60, { look: { shoes: '#f4f1ea' } }),
  I('shoe_spike', 'shoes', '有釘球鞋', 'kes', 'fine', { recovery: 2 }, 220, { look: { shoes: '#ffffff' }, note: '斜坡站位的脫困 +2' }),
  I('shoe_less', 'shoes', '無釘球鞋', 'aur', 'fine', { consistency: 1 }, 200, { look: { shoes: '#e8e1d0' }, note: '體能消耗 −5%' }),
  I('shoe_retro', 'shoes', '復古皮鞋', 'link', 'rare', { touch: 1, mental: 1 }, 680, { look: { shoes: '#5a3a22' } }),
  I('shoe_boa', 'shoes', '旋鈕快綁球鞋', 'aur', 'rare', { consistency: 1, recovery: 1 }, 520, { look: { shoes: '#20324f' } }),
  I('shoe_tour', 'shoes', '巡迴賽球鞋', 'kes', 'legend', { recovery: 2, consistency: 1, power: 1 }, 1600, { look: { shoes: '#ffffff' } }),
  // 手套
  I('glove_syn', 'glove', '合成皮手套', 'north', 'common', {}, 15, { look: { glove: '#ffffff' } }),
  I('glove_cab', 'glove', '真皮手套', 'kes', 'fine', { contact: 1 }, 35, { look: { glove: '#f6f1e6' } }),
  I('glove_rain', 'glove', '雨天手套', 'pine', 'fine', { recovery: 1 }, 40, { look: { glove: '#1c1c1c' }, note: '濕地誤差 −10%' }),
  I('glove_tour', 'glove', '巡迴賽手套', 'kes', 'rare', { contact: 1, consistency: 1 }, 90, { look: { glove: '#ffffff' } }),
  I('glove_legend', 'glove', '手工小羊皮手套', 'haru', 'legend', { contact: 2, accuracy: 1 }, 260, { look: { glove: '#f3ead6' } }),
  // 配件
  I('acc_sun', 'acc', '太陽眼鏡', 'van', 'fine', { reading: 1 }, 180, { look: { glasses: true } }),
  I('acc_watch', 'acc', '運動手錶', 'aur', 'rare', { consistency: 1, mental: 1 }, 900),
  I('acc_marker', 'acc', '幸運球標', 'link', 'fine', { line: 1 }, 30),
  I('acc_towel', 'acc', '吸水毛巾', 'north', 'common', { spin: 1 }, 20, { note: '每一桿前擦乾桿面' }),
  I('acc_book', 'acc', '果嶺碼數本', 'pine', 'rare', { reading: 2 }, 320, { note: '果嶺坡度的手繪筆記' }),
  I('acc_range', 'acc', '雷射測距儀', 'van', 'rare', { consistency: 1, accuracy: 1 }, 450),
  I('acc_legend', 'acc', '冠軍腕錶', 'aur', 'legend', { mental: 2, consistency: 1 }, 2800),
  // 一號木
  I('drv_kid', 'driver', '兒童一號木', 'north', 'common', { power: 1, accuracy: 1 }, 90, { kid: true, note: '兒童尺寸（14 歲以前）' }),
  I('drv_start', 'driver', '入門一號木', 'north', 'common', { power: 1 }, 150),
  I('drv_draw', 'driver', '防右曲一號木', 'pine', 'fine', { accuracy: 2 }, 320, { note: '重心偏跟部，球比較不會往右飛' }),
  I('drv_mini', 'driver', '迷你一號木', 'link', 'rare', { accuracy: 3, shaping: 1, power: -1 }, 550, { note: '窄球道的秘密武器：準度 +3、力量 −1' }),
  I('drv_lowspin', 'driver', '低旋轉一號木', 'kes', 'rare', { power: 4, accuracy: -2 }, 600, { note: '重砲型：力量 +4、準度 −2' }),
  I('drv_bighead', 'driver', '大頭一號木', 'aur', 'rare', { accuracy: 3, power: 1 }, 600, { note: '容錯型' }),
  I('drv_adjust', 'driver', '可調重心一號木', 'van', 'legend', { accuracy: 3, shaping: 3 }, 1100, { note: '準度 +3、曲球 +3' }),
  I('drv_tour', 'driver', '巡迴版一號木', 'kes', 'legend', { power: 5, contact: 2, accuracy: -1 }, 1300),
  // 球道木 / 混血
  I('fw_start', 'wood', '入門球道木', 'north', 'common', { launch: 1 }, 120),
  I('fw_5w', 'wood', '5 號木', 'kes', 'fine', { launch: 2 }, 220),
  I('fw_hybrid', 'wood', '混血桿組', 'pine', 'rare', { launch: 3, recovery: 2 }, 480),
  I('fw_util', 'wood', '鐵木桿', 'van', 'rare', { accuracy: 2, launch: 1 }, 420, { note: '低彈道、好控制' }),
  I('fw_tour', 'wood', '巡迴版球道木', 'aur', 'legend', { launch: 3, contact: 2, power: 1 }, 900),
  // 鐵桿
  I('iron_kid', 'irons', '兒童鐵桿組', 'north', 'common', { contact: 1, launch: 1 }, 180, { kid: true, note: '兒童尺寸（14 歲以前）' }),
  I('iron_start', 'irons', '入門鐵桿組', 'north', 'common', { contact: 1 }, 300),
  I('iron_combo', 'irons', '混搭鐵桿組', 'aur', 'fine', { contact: 2, accuracy: 1 }, 700, { note: '長鐵凹背、短鐵刀背' }),
  I('iron_blade', 'irons', '刀背鐵桿', 'link', 'rare', { accuracy: 3, shaping: 4, contact: -2 }, 1300, { note: '準度 +3、曲球 +4、擊球效率 −2' }),
  I('iron_cavity', 'irons', '凹背寬底鐵桿', 'aur', 'rare', { contact: 3, launch: 3, shaping: -2 }, 1100, { note: '擊球效率 +3、彈道 +3、曲球 −2' }),
  I('iron_tour', 'irons', '巡迴版鍛造鐵桿', 'kes', 'legend', { accuracy: 3, contact: 2, shaping: 2 }, 2200),
  I('iron_legend', 'irons', '職業手工刀背鐵桿', 'haru', 'legend', { accuracy: 4, shaping: 4, contact: -1 }, 3200, { note: '準度 +4、曲球 +4、擊球效率 −1' }),
  // 挖起桿
  I('wedge_start', 'wedge', '入門挖起桿', 'north', 'common', { chipping: 1 }, 90),
  I('wedge_spin', 'wedge', '高磨紋挖起桿', 'van', 'rare', { spin: 5 }, 380, { note: '旋轉 +5（長草沒有加成）' }),
  I('wedge_bounce', 'wedge', '寬底彈跳角挖起桿', 'pine', 'rare', { bunker: 5, spin: -1 }, 360, { note: '沙坑 +5、旋轉 −1' }),
  I('wedge_lob', 'wedge', '64 度高拋挖起桿', 'pine', 'fine', { chipping: 2, spin: 1 }, 160),
  I('wedge_tour', 'wedge', '巡迴版挖起桿組', 'link', 'legend', { spin: 3, chipping: 3, bunker: 2 }, 900),
  I('wedge_raw', 'wedge', '未電鍍手工挖起桿', 'haru', 'legend', { spin: 4, chipping: 3 }, 1100, { note: '會生鏽，但旋轉最多' }),
  // 推桿
  I('putt_start', 'putter', '入門推桿', 'north', 'common', { touch: 1 }, 90),
  I('putt_mallet', 'putter', '槌型推桿', 'aur', 'rare', { line: 5, touch: -1 }, 420, { note: '推桿方向 +5、距離感 −1' }),
  I('putt_blade', 'putter', '刀型推桿', 'link', 'rare', { touch: 5, line: -1 }, 420, { note: '距離感 +5、推桿方向 −1' }),
  I('putt_counter', 'putter', '配重推桿', 'kes', 'fine', { line: 2 }, 200),
  I('putt_long', 'putter', '長推桿', 'van', 'rare', { line: 3, touch: 1, mental: 1 }, 520, { note: '抵住胸口、手腕不容易抖' }),
  I('putt_tour', 'putter', '巡迴版手工推桿', 'haru', 'legend', { touch: 3, line: 3, reading: 1 }, 1200),
  I('putt_legend', 'putter', '冠軍手工推桿', 'haru', 'legend', { touch: 4, line: 3, reading: 1 }, 2600),
  // 球
  I('ball_two', 'ball', '雙層遠距離球', 'north', 'common', { power: 2, spin: -3 }, 30, { note: '力量 +2、旋轉 −3' }),
  I('ball_tour', 'ball', '三層巡迴球', 'kes', 'fine', { spin: 3, chipping: 2 }, 60, { note: '旋轉 +3、切球 +2' }),
  I('ball_soft', 'ball', '軟質球', 'aur', 'fine', { touch: 1, chipping: 1 }, 40),
  I('ball_pro', 'ball', '巡迴賽專用球', 'van', 'rare', { spin: 3, chipping: 2, power: 1 }, 90),
  I('ball_x', 'ball', '低旋轉巡迴球', 'kes', 'rare', { power: 2, spin: 1 }, 95),
  I('ball_legend', 'ball', '職業測試球', 'kes', 'legend', { power: 2, spin: 3, chipping: 2 }, 160),
  // 冠軍專屬（純外觀與象徵，不加能力）
  I('jacket_green', 'top', '綠夾克', 'augusta', 'champ', {}, 0, { look: { shirt: '#1d6b3a', top: 'jacket', jacket: true }, note: '名人賽冠軍專屬：純外觀，象徵最高榮譽', champ: 'masters' }),
  I('claret_cap', 'hat', '銀壺紀念球帽', 'link', 'champ', {}, 0, { look: { cap: '#f2ead8', hat: 'cap' }, champ: 'open' }),
  I('wanamaker_cap', 'hat', '華納梅克紀念球帽', '', 'champ', {}, 0, { look: { cap: '#1b2a4a', hat: 'cap' }, note: 'PGA 錦標賽冠軍紀念', champ: 'pgachamp' }),
  I('usopen_medal', 'acc', 'U.S. Open 冠軍金牌', '', 'champ', {}, 0, { note: '美國公開賽冠軍紀念：掛在球袋上', champ: 'usopen' }),
  I('players_vest', 'top', 'THE PLAYERS 冠軍背心', '', 'champ', {}, 0, { look: { shirt: '#f2ead8', top: 'vest', vest: '#1a3a6a' }, note: '第五大賽冠軍紀念', champ: 'players' }),
  I('fedex_watch', 'acc', '聯邦快遞盃冠軍腕錶', '', 'champ', {}, 0, { note: '年度總冠軍紀念', champ: 'tourchamp' }),
  I('olympic_medal', 'acc', '奧運金牌', '', 'champ', {}, 0, { note: '奧運高爾夫金牌', champ: 'olympic' }),
  I('team_jacket', 'top', '團體賽冠軍隊服', '', 'champ', {}, 0, { look: { shirt: '#20324f', top: 'jacket' }, note: '萊德盃 / 總統盃勝隊的隊服', champ: 'team' }),
  I('dp_cap', 'hat', 'Race to Dubai 年度冠軍帽', '', 'champ', {}, 0, { look: { cap: '#c09a30', hat: 'cap' }, note: 'DP World Tour 年度冠軍', champ: 'race' }),
  I('slam_jacket', 'top', '大滿貫紀念外套', '', 'champ', {}, 0, { look: { shirt: '#c09a30', top: 'jacket' }, note: '四大賽都拿過冠軍的人才有', champ: 'slam' }),
  // 聯名套裝（Vanta × Haru）：4 件穿齊，讀果嶺、抗壓再 +1
  I('cl_cap', 'hat', 'Vanta × Haru 聯名球帽', 'collab', 'rare', { reading: 1 }, 900, { look: { hat: 'cap', cap: '#0e1a2a' }, set: 'vh' }),
  I('cl_top', 'top', 'Vanta × Haru 聯名 Polo', 'collab', 'rare', { mental: 1 }, 1200, { look: { shirt: '#0e1a2a', top: 'polo' }, set: 'vh' }),
  I('cl_bot', 'bottom', 'Vanta × Haru 聯名長褲', 'collab', 'rare', { consistency: 1 }, 1000, { look: { pants: '#e8e1d0', bottom: 'pants' }, set: 'vh' }),
  I('cl_shoe', 'shoes', 'Vanta × Haru 聯名球鞋', 'collab', 'rare', { touch: 1 }, 1100, { set: 'vh' }),
  // 季節限定（只在那幾週買得到）
  I('sea_sakura', 'top', '櫻花季限定 Polo', 'aur', 'fine', { touch: 1 }, 380, { look: { shirt: '#f2c8d0', top: 'polo' }, season: [10, 18], note: '春季限定（第 10~18 週）' }),
  I('sea_summer', 'hat', '盛夏涼感遮陽帽', 'pine', 'fine', { consistency: 1 }, 260, { look: { hat: 'visor', cap: '#bfe6f0' }, season: [24, 34], note: '夏季限定（第 24~34 週）' }),
  I('sea_autumn', 'top', '楓葉季毛衣背心', 'link', 'rare', { mental: 1, reading: 1 }, 820, { look: { shirt: '#f2ead8', top: 'vest', vest: '#8a3a1a' }, season: [38, 46], note: '秋季限定（第 38~46 週）' }),
  I('sea_winter', 'top', '冬季保暖外套', 'north', 'rare', { consistency: 1, power: 1 }, 900, { look: { shirt: '#2a3a2a', top: 'jacket' }, season: [47, 52], note: '冬季限定（第 47~52 週）' }),
  I('sea_xmas', 'ball', '聖誕限定紅白球', 'kes', 'rare', { spin: 2, power: 1 }, 120, { season: [50, 52], note: '聖誕節限定（第 50~52 週）' }),
  I('sea_lunar', 'acc', '新春開運球標', 'haru', 'fine', { reading: 1 }, 168, { season: [1, 6], note: '農曆新年限定（第 1~6 週）' }),
  // 贊助商專屬（和那個品牌簽了服裝或球具合約才能領，穿著時每週贊助商好感 +0.3）
  I('sp_kes_top', 'top', 'Kestrel 簽約球員 Polo', 'kes', 'legend', { consistency: 1, accuracy: 1, power: 1 }, 0, { look: { shirt: '#ffffff', top: 'polo' }, spon: 'Kestrel' }),
  I('sp_kes_cap', 'hat', 'Kestrel 簽約球員球帽', 'kes', 'legend', { reading: 1, mental: 1 }, 0, { look: { hat: 'cap', cap: '#ffffff' }, spon: 'Kestrel' }),
  I('sp_north_shoe', 'shoes', 'Northfield 簽約球鞋', 'north', 'legend', { consistency: 2, power: 1 }, 0, { spon: 'Northfield' }),
  I('sp_aur_top', 'top', 'Aurum 簽約長袖', 'aur', 'legend', { accuracy: 2, touch: 1 }, 0, { look: { shirt: '#e8d9a8', top: 'long' }, spon: 'Aurum' }),
  I('sp_van_drv', 'driver', 'Vanta 簽約一號木', 'van', 'legend', { power: 3, contact: 2, launch: 1 }, 0, { spon: 'Vanta' }),
  I('sp_link_iron', 'irons', 'Linkline 簽約鐵桿', 'link', 'legend', { accuracy: 3, shaping: 2, consistency: 1 }, 0, { spon: 'Linkline' }),
  I('sp_haru_putt', 'putter', 'Haru 簽約推桿', 'haru', 'legend', { touch: 3, line: 3 }, 0, { spon: 'Haru' }),
];
// 品牌套裝：同一品牌穿 3 件 / 5 件的效果（聯名套裝 4 件）
export const BRAND_SET = {
  north: [{ consistency: 1 }, { consistency: 1, mental: 1 }], kes: [{ power: 1 }, { power: 1, contact: 1 }], aur: [{ accuracy: 1 }, { accuracy: 1, touch: 1 }],
  pine: [{ recovery: 1 }, { recovery: 1, bunker: 1 }], van: [{ mental: 1 }, { mental: 1, spin: 1 }], haru: [{ touch: 1 }, { touch: 1, line: 1 }], link: [{ shaping: 1 }, { shaping: 1, reading: 1 }],
};
export const COLLAB_SET = { vh: { name: 'Vanta × Haru 聯名', need: 4, bonus: { reading: 1, mental: 1 } } };
// 冠軍紀念品：贏了哪一場給哪一件
export const CHAMP_GIFT = { masters: 'jacket_green', open: 'claret_cap', pgachamp: 'wanamaker_cap', usopen: 'usopen_medal', players: 'players_vest', tourchamp: 'fedex_watch' };
export const itemById = id => ITEMS.find(x => x.id === id);
// 兒童用的起始裝備（8 歲爺爺 / 媽媽買的第一組）
export const STARTER = ['cap_basic', 'top_polo', 'bot_pants', 'shoe_basic', 'glove_syn', 'drv_start', 'fw_start', 'iron_start', 'wedge_start', 'putt_start', 'ball_two'];
// 升級費用（1→2 … 4→5）
export const upgradeCost = it => Math.round((it.price || 100) * [0, 0.6, 1.0, 1.6, 2.5][Math.min(4, it.lv || 1)]);

// ---------- 桿弟（情報為主，數值加成很小）----------
//   ability：遊戲中的提示種類；chem3：默契 3 解鎖的能力
export const CADDIES = [
  { id: 'atu', name: '阿土伯', bg: '家鄉球場的老桿弟', bonus: { reading: 3 }, homeOnly: true, ability: 'warn', abilityText: '提醒球場「容易犯錯的地方」', chem3: 'console', chem3Text: '打壞後安慰：下一洞手感不下降', fee: 300 },
  { id: 'mate', name: '大學隊友', bg: '大學時的室友', bonus: {}, ability: 'club', abilityText: '球桿建議（考慮風與高低差）', chem3: 'plan', chem3Text: '每輪一次「這洞建議打法」', fee: 500, need: { stage: 'college' } },
  { id: 'prof', name: '陳教授', bg: '數據分析出身', bonus: { consistency: 1 }, ability: 'spread', abilityText: '落點範圍：顯示這一桿 70% 會落在多大的範圍', chem3: 'review', chem3Text: '賽後「少了幾桿」分析', fee: 2500 },
  { id: 'mac', name: 'Mac', bg: '蘇格蘭林克斯土生土長', bonus: {}, windMul: 0.95, ability: 'wind', abilityText: '風的建議：「多拿一支、壓低打」', chem3: 'gale', chem3Text: '強風日誤差 −10%', fee: 4000 },
  { id: 'meiling', name: '美玲', bg: '前職業推桿教練', bonus: { reading: 2 }, ability: 'green', abilityText: '果嶺坡度更清楚、預測線 +1 碼', chem3: 'pace', chem3Text: '3~6 碼推桿顯示建議力道', fee: 5000 },
  { id: 'zhou', name: '老周', bg: '前職業球員', bonus: { mental: 2 }, ability: 'calm', abilityText: '每輪一次「冷靜」：壓力等級 −1', chem3: 'clutch', chem3Text: '關鍵時刻前一句實用建議', fee: 7000 },
  { id: 'joe', name: 'Big Joe', bg: '揹過三座大賽冠軍', bonus: { mental: 1, reading: 1 }, ability: 'all', abilityText: '提醒、球桿與果嶺建議（較弱版本）', chem3: 'major', chem3Text: '大賽期間所有能力加強', fee: 18000, need: { rank: 30 } },
  { id: 'family', name: '家人', bg: '爸爸或兄弟姊妹', bonus: {}, ability: 'cheer', abilityText: '心情 +、大賽週日的加油事件', chem3: 'par3', chem3Text: '名人賽三桿洞大賽的白衣桿弟', fee: 0 },
];
export const caddieById = id => CADDIES.find(c => c.id === id);

// ---------- 教練 ----------
export const COACH_KIND = { swing: { name: '揮桿教練', groups: ['long', 'dir'] }, short: { name: '短桿教練', groups: ['short'] }, putt: { name: '推桿教練', groups: ['putt'] }, mind: { name: '心理教練', groups: ['mind'] } };
export const COACH_TIER = { rookie: { name: '新秀', mul: 0.3, fee: 600, need: 0 }, master: { name: '名師', mul: 0.45, fee: 3500, need: { rank: 150, fame: 20000 } }, legend: { name: '傳奇', mul: 0.6, fee: 12000, need: { rank: 40, fame: 200000 } } };
// 青少年的三位教練（第二章拜師）
export const JUNIOR_COACHES = [
  { id: 'tech', name: '林教練', type: '技術派', desc: '揮桿相關素質訓練 +40%，但前半年要「重建揮桿」（穩定度暫時 −5）', groups: ['long', 'dir'], mul: 0.4, quote: '先把揮桿打掉重練，半年後你會感謝我。' },
  { id: 'data', name: '陳博士', type: '數據派', desc: '解鎖落點範圍與賽後分析；所有訓練 +15%', groups: ['long', 'dir', 'short', 'putt', 'mind'], mul: 0.15, quote: '我們用數字說話。這是你三年的訓練表。' },
  { id: 'mind', name: '吳老師', type: '心理派', desc: '抗壓訓練 +40%、心情不容易掉', groups: ['mind', 'putt'], mul: 0.4, quote: '你為什麼打球？' },
];

// ---------- 經紀人 ----------
export const AGENTS = [
  { id: 'sport', name: 'Eli Brandt', firm: 'Fairway Sports Group', type: '運動品牌', cut: 0.15, boost: { apparel: 1.3, equipment: 1.2 } },
  { id: 'lux', name: '周曼婷', firm: 'Crestline Management', type: '精品', cut: 0.18, boost: { watch: 1.4, car: 1.3, bank: 1.2 } },
  { id: 'tech', name: 'Sam Okafor', firm: 'Northstar Talent', type: '科技', cut: 0.12, boost: { tech: 1.4, airline: 1.2, drink: 1.2 } },
];

// ---------- 專業團隊 ----------
export const STAFF = {
  fitness: { name: '體能教練', fee: 2500, desc: '體能恢復加快、35 歲後的老化變慢' },
  nutrition: { name: '營養師', fee: 1500, desc: '比賽週體能消耗 −15%' },
  physio: { name: '物理治療師', fee: 3000, desc: '傷病機率減半、復原時間縮短' },
  psych: { name: '心理師', fee: 3500, desc: '手感下降減半、每輪一次「冷靜」（壓力等級 −1）' },
  analyst: { name: '數據分析師', fee: 4000, desc: '上場的讀果嶺 +2（計入加成上限）' },
};
// 粉絲團等級（依追蹤數）：merch = 每週周邊商品收入（每 1 萬追蹤，職業才有）
export const FAN_LEVELS = [
  { min: 0, name: '還沒有粉絲團', merch: 0 }, { min: 2000, name: '小小粉絲團', merch: 0 }, { min: 20000, name: '粉絲團', merch: 4 },
  { min: 100000, name: '人氣選手', merch: 6 }, { min: 500000, name: '明星球員', merch: 8 }, { min: 2000000, name: '超級巨星', merch: 10 }, { min: 8000000, name: '國際偶像', merch: 12 },
];
export const fanLevel = f => { let i = 0; FAN_LEVELS.forEach((l, k) => { if (f >= l.min) i = k; }); return { lv: i, ...FAN_LEVELS[i], next: FAN_LEVELS[i + 1] }; };
// 社群發文的主題：追蹤倍率、贊助商好感、其他效果
export const SOCIAL = {
  daily: { name: '日常生活', fol: 1, sponsor: 0, desc: '追蹤 ×1' },
  train: { name: '練球花絮', fol: 0.8, sponsor: 0.5, desc: '追蹤 ×0.8、贊助商好感 +0.5、經驗 +5' },
  gear: { name: '球具開箱（業配）', fol: 0.6, sponsor: 2, desc: '追蹤 ×0.6、贊助商好感 +2、收入（要有贊助）' },
  charity: { name: '公益活動', fol: 0.9, sponsor: 1, desc: '追蹤 ×0.9、贊助商好感 +1、人氣 +200' },
  hot: { name: '回應爭議話題', fol: 2, sponsor: -3, desc: '追蹤 ×2、人氣 +300、贊助商好感 −3、媒體形象往「話題」' },
};
// 頂級團隊：薪水 ×3、效果更強；需要世界前 50 或人氣 100,000
export const STAFF_ELITE = {
  fee: 3, need: { rank: 50, fame: 100000 },
  desc: { fitness: '每週體能恢復 +7（原本 +4）、老化只剩 40%（原本 60%）', nutrition: '比賽週體能消耗 −30%', physio: '傷病機率只剩 1/5', psych: '手感下降只剩 30%、每輪兩次「冷靜」', analyst: '上場的讀果嶺 +3' },
};

// ---------- 住所（後期的花錢地方；換房子時舊房子以半價折抵）----------
//   rest = 每次「休息」多恢復的體能；mood / fam = 每週心情、家人關係；fame = 每週人氣；upkeep = 每週維護費（取代生活費）
export const HOMES = [
  { name: '租的公寓', price: 0, upkeep: 0, rest: 0, mood: 0, fam: 0, fame: 0, desc: '生活費照舊（每週 $500，佛州 $900）' },
  { name: '郊區獨棟住宅', price: 900000, upkeep: 1500, rest: 4, mood: 1, fam: 0.2, fame: 0, desc: '有院子和車庫，家人常來住' },
  { name: '球場旁豪宅', price: 4500000, upkeep: 4000, rest: 7, mood: 2, fam: 0.4, fame: 100, desc: '後門就是球道，雜誌來拍過專題' },
  { name: '海景莊園', price: 18000000, upkeep: 12000, rest: 10, mood: 3, fam: 0.6, fame: 300, desc: '私人碼頭、家族聚會的地方，名人堂級的住所' },
];

// ---------- 球具工坊訂製（職業）：每個部位選一項素質，最多訂製 3 級（每級 +1，計入加成上限）----------
export const FIT_SLOTS = {
  driver: ['power', 'contact', 'launch'], wood: ['launch', 'contact', 'accuracy'], irons: ['accuracy', 'consistency', 'shaping'],
  wedge: ['spin', 'chipping', 'bunker'], putter: ['touch', 'line', 'reading'], ball: ['spin', 'consistency', 'power'],
};
export const FIT_COST = [80000, 350000, 1200000];      // Lv.1 / Lv.2 / Lv.3
export const FIT_RESPEC = 50000;                         // 改訂製方向（等級保留）
// 球桿手感：每個部位三選一，一項 +1、一項 −1（計入加成上限），換手感 $20,000
export const FEEL = {
  driver: [['std', '標準', {}], ['low', '低旋重心', { power: 1, launch: -1 }], ['high', '高拋重心', { launch: 1, power: -1 }]],
  wood: [['std', '標準', {}], ['deep', '深桿頭', { power: 1, accuracy: -1 }], ['shallow', '淺桿頭', { launch: 1, power: -1 }]],
  irons: [['std', '標準', {}], ['blade', '刀背', { shaping: 1, consistency: -1 }], ['cavity', '凹背', { consistency: 1, shaping: -1 }]],
  wedge: [['std', '標準', {}], ['soft', '軟鐵鍛造', { spin: 1, bunker: -1 }], ['wide', '寬底', { bunker: 1, spin: -1 }]],
  putter: [['std', '標準', {}], ['blade', '刀型', { touch: 1, line: -1 }], ['mallet', '槌型', { line: 1, touch: -1 }]],
  ball: [['std', '標準', {}], ['soft', '軟殼', { touch: 1, power: -1 }], ['firm', '硬殼', { power: 1, spin: -1 }]],
};
export const FEEL_COST = 20000;
// 桿身與握把（v97）：每一支都可以單獨選，一樣是一項 +1、一項 −1 的取捨（計入加成上限）；換一次 $30,000 / $8,000
export const SHAFT = {
  driver: [['std', '標準 S 桿身', {}], ['light', '輕量 R 桿身', { power: 1, consistency: -1 }], ['tour', '巡迴 X 桿身', { consistency: 1, power: -1 }], ['lowtq', '低扭力桿身', { accuracy: 1, launch: -1 }]],
  wood: [['std', '標準 S 桿身', {}], ['light', '輕量 R 桿身', { power: 1, consistency: -1 }], ['tour', '巡迴 X 桿身', { consistency: 1, power: -1 }], ['highl', '高彈道桿身', { launch: 1, accuracy: -1 }]],
  irons: [['std', '輕量鋼桿身', {}], ['steel', '重量鋼桿身', { consistency: 1, power: -1 }], ['graph', '碳纖維桿身', { power: 1, accuracy: -1 }], ['tour', '巡迴硬桿身', { accuracy: 1, launch: -1 }]],
  wedge: [['std', '挖起桿專用桿身', {}], ['heavy', '重量桿身', { chipping: 1, spin: -1 }], ['spin', '高旋轉桿身', { spin: 1, chipping: -1 }]],
  putter: [['std', '標準桿身', {}], ['counter', '配重桿身', { line: 1, touch: -1 }], ['soft', '軟調桿身', { touch: 1, line: -1 }]],
};
export const GRIP = {
  club: [['std', '標準握把', {}], ['mid', '加粗握把', { consistency: 1, shaping: -1 }], ['slim', '細握把', { shaping: 1, consistency: -1 }], ['cord', '止滑線紋握把', { recovery: 1, touch: -1 }]],
  putter: [['std', '標準推桿握把', {}], ['jumbo', '超粗握把', { line: 1, touch: -1 }], ['pistol', '手槍型握把', { touch: 1, line: -1 }]],
};
export const SHAFT_COST = 30000, GRIP_COST = 8000, PAINT_COST = 15000, ENGRAVE_COST = 2000;
// 自選顏色的色票（也可以用調色盤選任何顏色）
export const PAINTS = ['#d8dde0', '#15171a', '#2a2c30', '#b01a1a', '#1a3aa8', '#0f6a48', '#e8c050', '#c09a30', '#f2f2f2', '#6a1a8a', '#e86a1a', '#3a8a6a', '#8a8a80', '#1d3a2a', '#f2c8d0', '#5ad0f0'];
// 試桿日：在練習場打 6 球，依數據建議桿頭、桿身、握把（建議的項目一年內 7 折）
export const FITTING = { discount: 0.7, cost: 5000 };
// 工坊的部位對應到 3D 的球桿（推桿、鐵桿、一號木…）
export const PAINT_SLOT = { driver: 'driver', irons: 'iron', wedge: 'chipper', putter: 'putter' };
// 球桿 / 球的外觀：用主遊戲星星商店的造型（生涯裡用錢訂製：星星數 × $5,000）
export const SKIN_SLOT = { driver: 'driver', irons: 'iron', putter: 'putter', ball: 'ball', wedge: 'chipper' };
export const SKIN_PRICE = 5000;

// ---------- 贊助（球袋與帽子上的標誌）----------
export const SPONSOR_KINDS = {
  apparel: { name: '服裝合約', spot: '全身', base: 60000 }, equipment: { name: '球具合約（整袋）', spot: '球袋', base: 120000 },
  ball: { name: '球合約', spot: '球', base: 40000 }, putter: { name: '推桿合約', spot: '推桿', base: 30000 },
  bank: { name: '銀行', spot: '帽子正面', base: 50000 }, airline: { name: '航空', spot: '左胸', base: 35000 }, car: { name: '汽車', spot: '球袋側面', base: 45000 },
  watch: { name: '手錶', spot: '手腕', base: 40000 }, drink: { name: '飲料', spot: '帽子側面', base: 20000 }, tech: { name: '科技', spot: '袖子', base: 30000 },
};
export const SPONSOR_NAMES = { apparel: ['Kestrel', 'Northfield', 'Aurum'], equipment: ['Kestrel', 'Vanta', 'Linkline'], ball: ['Kestrel', 'Vanta'], putter: ['Haru', 'Linkline'], bank: ['First Pacific Bank', '台陽銀行', 'Meridian Capital'], airline: ['Formosa Air', 'Skyline Airways'], car: ['Valor Motors', 'Kairo'], watch: ['Montclair', 'Seiren'], drink: ['Spring Tea', 'Volt'], tech: ['Nexa', 'Orbis'] };

// ---------- 資產（後期重要的花錢地方）----------
export const ASSETS = {
  putting: { grp: 'train', name: '後院推桿果嶺', price: 60000, desc: '每週一次免費的推桿訓練（約一般練球的 60%，不用花行動）' },
  sim: { grp: 'train', name: '室內模擬器', price: 350000, desc: '每週一次免費的長桿訓練（約一般練球的 60%，不用花行動）' },
  shortarea: { grp: 'train', name: '短桿練習區', price: 220000, desc: '短桿訓練 +20%' },
  gym: { grp: 'train', name: '家用健身房', price: 180000, desc: '每週體能恢復 +3、長桿訓練 +20%' },
  member: { grp: 'life', name: '私人球場會籍', price: 250000, desc: '每週人氣 +80、心情 +1' },
  share: { grp: 'biz', name: '家鄉球場股份（1/5）', price: 800000, desc: '分五次買下；主場加成提高，退休後成為球場主人', max: 5 },
  foundation: { grp: 'legacy', name: '慈善基金會', price: 500000, desc: '每季自動捐款 $100,000：人氣 +3,000、贊助商好感 +2' },
  academy: { grp: 'legacy', name: '青少年學院', price: 3000000, desc: '傳奇章節的第二人生與傳承：每年有學員' },
  hawaii: { grp: 'villa', name: '夏威夷海灘別墅', price: 3500000, upkeep: 2000, desc: '休賽期（第 47 週到隔年第 2 週）每週體能 +4、心情 +4' },
  alps: { grp: 'villa', name: '阿爾卑斯山中小屋', price: 2800000, upkeep: 1500, desc: '夏天（第 27~35 週）每週體能 +3、心情 +2' },
  kyoto: { grp: 'villa', name: '京都町家', price: 2200000, upkeep: 1200, desc: '每週心情 +1、家人關係 +0.3' },
  scotland: { grp: 'villa', name: '蘇格蘭林克斯小屋', price: 3000000, upkeep: 1500, desc: '英國公開賽那一週的旅費全免、心情 +6' },
  jet: { grp: 'travel', name: '私人飛機', price: 22000000, upkeep: 15000, desc: '選「私人飛機」艙等時只付油錢（經濟艙的 1.5 倍）、比賽週心情 +2；每週維護 $15,000' },
  bus: { grp: 'travel', name: '巡迴球隊巴士', price: 1200000, upkeep: 1500, desc: '北美比賽的旅費 −40%、體能消耗 −2' },
  studio: { grp: 'biz', name: '個人媒體工作室', price: 2500000, upkeep: 2000, desc: '「社群發文」追蹤數 ×2、每週人氣 +150' },
  winery: { grp: 'biz', name: '家族酒莊', price: 9000000, upkeep: 3000, desc: '每年 52 週收入約 $600,000、家人關係每週 +0.3' },
};
export const ASSET_GRP = { train: '訓練設施', life: '生活', villa: '度假別墅', travel: '交通', biz: '事業與收入', legacy: '公益與傳承' };

// ---------- 投資（年底結算報酬；退休後照樣有）----------
//   ret = 平均年報酬，vol = 波動（年報酬 = ret + vol × 常態亂數，最低 −60%）
export const INVEST = {
  bond: { name: '政府公債', ret: 0.035, vol: 0.02, desc: '最穩：每年約 3.5%' },
  index: { name: '全球指數基金', ret: 0.07, vol: 0.14, desc: '長期約 7%，偶爾一年跌兩成' },
  estate: { name: '商用不動產', ret: 0.055, vol: 0.07, desc: '約 5.5%，波動小' },
  venture: { name: '新創公司', ret: 0.12, vol: 0.5, desc: '可能翻倍，也可能歸零大半' },
};

// ---------- 球場經營（買齊家鄉球場 5 股之後）：每週營收，退休後是主要收入 ----------
export const COURSE_BASE = 9000;      // 每週基本營收
export const COURSE_UP = {
  club: { name: '會館與餐廳', cost: [1500000, 4000000, 10000000], inc: 0.35, desc: '營收 +35% / 級' },
  turf: { name: '球道與果嶺整修', cost: [2000000, 5000000, 12000000], inc: 0.3, desc: '營收 +30% / 級，第 3 級可以辦職業賽' },
  range: { name: '練習場與學院', cost: [1000000, 3000000, 8000000], inc: 0.25, desc: '營收 +25% / 級，學院學員多 1 位 / 級' },
  hotel: { name: '度假酒店', cost: [6000000, 15000000, 30000000], inc: 0.6, desc: '營收 +60% / 級' },
};

// ---------- 自己辦一場邀請賽（每年第 50 週；職業，世界前 30 或大賽冠軍或人氣 300,000）----------
export const HOST = { cost: 6000000, purse: 4000000, field: 30, fame: 25000, need: { rank: 30, fame: 300000 } };

// 獎盃室等級
export const ROOM_LEVELS = [
  { name: '童年書桌', price: 0, slots: 6 }, { name: '家裡的玻璃櫃', price: 3000, slots: 14 }, { name: '獎盃室', price: 120000, slots: 30 },
  { name: '私人展覽館（兩層樓）', price: 1500000, slots: 60 }, { name: '名人堂館', price: 6000000, slots: 120 },
];
// 機票艙等（影響體能消耗）
export const FLIGHT = { eco: { name: '經濟艙', mul: 1, energy: 14 }, biz: { name: '商務艙', mul: 3.2, energy: 6 }, jet: { name: '私人飛機', mul: 12, energy: 2 } };
// 住宿
export const LODGE = { motel: { name: '汽車旅館', cost: 90, mood: -2 }, hotel: { name: '飯店', cost: 260, mood: 0 }, rent: { name: '大賽週租房', cost: 1200, mood: 4 } };
