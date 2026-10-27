// 目錄：裝備（服裝、球具）、桿弟、教練、經紀人、專業團隊、贊助商類型、資產
//   品牌都是虛構的；稀有度：一般、精良、稀有、傳奇、冠軍
export const RARITY = { common: { name: '一般', color: '#8a8a80', mul: 1 }, fine: { name: '精良', color: '#3f8a4a', mul: 1.5 }, rare: { name: '稀有', color: '#2f6fb0', mul: 2.2 }, legend: { name: '傳奇', color: '#8a4ac0', mul: 3.2 }, champ: { name: '冠軍', color: '#c09a30', mul: 0 } };
export const BRANDS = { north: 'Northfield', kes: 'Kestrel', aur: 'Aurum', pine: 'Pinecrest', van: 'Vanta', haru: 'Haru', link: 'Linkline' };
export const SLOTS = { hat: '帽子', top: '上衣', bottom: '下身', shoes: '鞋子', glove: '手套', acc: '配件', driver: '一號木', wood: '球道木 / 混血', irons: '鐵桿', wedge: '挖起桿', putter: '推桿', ball: '球' };
export const CLOTHES = ['hat', 'top', 'bottom', 'shoes', 'glove', 'acc'];

// 裝備：id、欄位、名稱、品牌、稀有度、能力（每 +1 等級加成 ×1.25）、價格、外觀（顏色等，角色換裝用）、條件（when：特定情況才有效，畫面上顯示說明）
const I = (id, slot, name, brand, rarity, stats, price, o = {}) => ({ id, slot, name, brand, rarity, stats, price, ...o });
export const ITEMS = [
  // 帽子
  I('cap_basic', 'hat', '棉質球帽', 'north', 'common', {}, 25, { look: { cap: '#1d3a2a', hat: 'cap' } }),
  I('cap_sun', 'hat', '遮陽帽', 'pine', 'fine', { reading: 1 }, 120, { look: { hat: 'visor', cap: '#ffffff' }, note: '晴天讀果嶺 +1' }),
  I('cap_bucket', 'hat', '漁夫帽', 'link', 'fine', { mental: 1 }, 140, { look: { hat: 'bucket', cap: '#d8c08a' }, note: '強風日抗壓 +1' }),
  I('cap_tour', 'hat', '巡迴賽球帽', 'kes', 'rare', { reading: 1, mental: 1 }, 650, { look: { hat: 'cap', cap: '#20324f' } }),
  // 上衣
  I('top_polo', 'top', '棉質 Polo', 'north', 'common', {}, 40, { look: { shirt: '#f2ead8', top: 'polo' } }),
  I('top_dry', 'top', '機能 Polo', 'kes', 'fine', { consistency: 1 }, 160, { look: { shirt: '#20324f', top: 'polo' }, note: '體能消耗 −5%' }),
  I('top_long', 'top', '長袖機能衣', 'aur', 'fine', { accuracy: 1 }, 190, { look: { shirt: '#ffffff', top: 'long' } }),
  I('top_vest', 'top', '毛衣背心', 'link', 'rare', { mental: 1, touch: 1 }, 520, { look: { shirt: '#f2ead8', top: 'vest', vest: '#2a3442' } }),
  I('top_wind', 'top', '防風外套', 'link', 'rare', { consistency: 2 }, 780, { look: { shirt: '#1c1c1c', top: 'jacket' }, note: '強風日穩定度 +1' }),
  I('top_tour', 'top', '巡迴賽 Polo', 'van', 'legend', { consistency: 1, accuracy: 1, mental: 1 }, 2400, { look: { shirt: '#a3302a', top: 'polo' } }),
  // 下身
  I('bot_pants', 'bottom', '休閒長褲', 'north', 'common', {}, 45, { look: { pants: '#2a3442', bottom: 'pants' } }),
  I('bot_flex', 'bottom', '彈性長褲', 'kes', 'fine', { launch: 1 }, 170, { look: { pants: '#e8e1d0', bottom: 'pants' } }),
  I('bot_shorts', 'bottom', '短褲', 'pine', 'fine', { recovery: 1 }, 110, { look: { pants: '#6b6255', bottom: 'shorts' } }),
  I('bot_skirt', 'bottom', '球裙', 'aur', 'fine', { launch: 1 }, 170, { look: { pants: '#ffffff', bottom: 'skirt' } }),
  I('bot_tour', 'bottom', '巡迴賽長褲', 'van', 'rare', { launch: 1, consistency: 1 }, 640, { look: { pants: '#1c1c1c', bottom: 'pants' } }),
  // 鞋子
  I('shoe_basic', 'shoes', '入門球鞋', 'north', 'common', {}, 60, { look: { shoes: '#f4f1ea' } }),
  I('shoe_spike', 'shoes', '有釘球鞋', 'kes', 'fine', { recovery: 2 }, 220, { look: { shoes: '#ffffff' }, note: '斜坡站位的脫困 +2' }),
  I('shoe_less', 'shoes', '無釘球鞋', 'aur', 'fine', { consistency: 1 }, 200, { look: { shoes: '#e8e1d0' }, note: '體能消耗 −5%' }),
  I('shoe_retro', 'shoes', '復古皮鞋', 'link', 'rare', { touch: 1, mental: 1 }, 680, { look: { shoes: '#5a3a22' } }),
  // 手套
  I('glove_syn', 'glove', '合成皮手套', 'north', 'common', {}, 15, { look: { glove: '#ffffff' } }),
  I('glove_cab', 'glove', '真皮手套', 'kes', 'fine', { contact: 1 }, 35, { look: { glove: '#f6f1e6' } }),
  I('glove_rain', 'glove', '雨天手套', 'pine', 'fine', { recovery: 1 }, 40, { look: { glove: '#1c1c1c' }, note: '濕地誤差 −10%' }),
  // 配件
  I('acc_sun', 'acc', '太陽眼鏡', 'van', 'fine', { reading: 1 }, 180, { look: { glasses: true } }),
  I('acc_watch', 'acc', '運動手錶', 'aur', 'rare', { consistency: 1, mental: 1 }, 900),
  I('acc_marker', 'acc', '幸運球標', 'link', 'fine', { line: 1 }, 30),
  // 一號木
  I('drv_start', 'driver', '入門一號木', 'north', 'common', { power: 1 }, 150),
  I('drv_lowspin', 'driver', '低旋轉一號木', 'kes', 'rare', { power: 4, accuracy: -2 }, 600, { note: '重砲型：力量 +4、準度 −2' }),
  I('drv_bighead', 'driver', '大頭一號木', 'aur', 'rare', { accuracy: 3, power: 1 }, 600, { note: '容錯型' }),
  I('drv_adjust', 'driver', '可調重心一號木', 'van', 'legend', { accuracy: 3, shaping: 3 }, 1100, { note: '準度 +3、曲球 +3' }),
  I('drv_tour', 'driver', '巡迴版一號木', 'kes', 'legend', { power: 5, contact: 2, accuracy: -1 }, 1300),
  // 球道木 / 混血
  I('fw_start', 'wood', '入門球道木', 'north', 'common', { launch: 1 }, 120),
  I('fw_hybrid', 'wood', '混血桿組', 'pine', 'rare', { launch: 3, recovery: 2 }, 480),
  I('fw_tour', 'wood', '巡迴版球道木', 'aur', 'legend', { launch: 3, contact: 2, power: 1 }, 900),
  // 鐵桿
  I('iron_start', 'irons', '入門鐵桿組', 'north', 'common', { contact: 1 }, 300),
  I('iron_blade', 'irons', '刀背鐵桿', 'link', 'rare', { accuracy: 3, shaping: 4, contact: -2 }, 1300, { note: '準度 +3、曲球 +4、擊球效率 −2' }),
  I('iron_cavity', 'irons', '凹背寬底鐵桿', 'aur', 'rare', { contact: 3, launch: 3, shaping: -2 }, 1100, { note: '擊球效率 +3、彈道 +3、曲球 −2' }),
  I('iron_tour', 'irons', '巡迴版鍛造鐵桿', 'kes', 'legend', { accuracy: 3, contact: 2, shaping: 2 }, 2200),
  // 挖起桿
  I('wedge_start', 'wedge', '入門挖起桿', 'north', 'common', { chipping: 1 }, 90),
  I('wedge_spin', 'wedge', '高磨紋挖起桿', 'van', 'rare', { spin: 5 }, 380, { note: '旋轉 +5（長草沒有加成）' }),
  I('wedge_bounce', 'wedge', '寬底彈跳角挖起桿', 'pine', 'rare', { bunker: 5, spin: -1 }, 360, { note: '沙坑 +5、旋轉 −1' }),
  I('wedge_tour', 'wedge', '巡迴版挖起桿組', 'link', 'legend', { spin: 3, chipping: 3, bunker: 2 }, 900),
  // 推桿
  I('putt_start', 'putter', '入門推桿', 'north', 'common', { touch: 1 }, 90),
  I('putt_mallet', 'putter', '槌型推桿', 'aur', 'rare', { line: 5, touch: -1 }, 420, { note: '推桿方向 +5、距離感 −1' }),
  I('putt_blade', 'putter', '刀型推桿', 'link', 'rare', { touch: 5, line: -1 }, 420, { note: '距離感 +5、推桿方向 −1' }),
  I('putt_tour', 'putter', '巡迴版手工推桿', 'haru', 'legend', { touch: 3, line: 3, reading: 1 }, 1200),
  // 球
  I('ball_two', 'ball', '雙層遠距離球', 'north', 'common', { power: 2, spin: -3 }, 30, { note: '力量 +2、旋轉 −3' }),
  I('ball_tour', 'ball', '三層巡迴球', 'kes', 'fine', { spin: 3, chipping: 2 }, 60, { note: '旋轉 +3、切球 +2' }),
  I('ball_pro', 'ball', '巡迴賽專用球', 'van', 'rare', { spin: 3, chipping: 2, power: 1 }, 90),
  // 冠軍專屬（純外觀與象徵，不加能力）
  I('jacket_green', 'top', '綠夾克', 'augusta', 'champ', {}, 0, { look: { shirt: '#1d6b3a', top: 'jacket', jacket: true }, note: '名人賽冠軍專屬：純外觀，象徵最高榮譽', champ: 'masters' }),
  I('claret_cap', 'hat', '銀壺紀念球帽', 'link', 'champ', {}, 0, { look: { cap: '#f2ead8', hat: 'cap' }, champ: 'open' }),
];
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
  psych: { name: '心理師', fee: 3500, desc: '手感下降減半、每輪一次「冷靜」' },
};

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
  putting: { name: '後院推桿果嶺', price: 60000, desc: '每週一次免費的推桿訓練（不用花行動）' },
  sim: { name: '室內模擬器', price: 350000, desc: '每週多一個長桿訓練關卡' },
  shortarea: { name: '短桿練習區', price: 220000, desc: '短桿訓練 +20%' },
  gym: { name: '家用健身房', price: 180000, desc: '體能恢復 +10、力量訓練 +20%' },
  member: { name: '私人球場會籍', price: 250000, desc: '可以在那裡練習與舉辦活動（人氣 +）' },
  share: { name: '家鄉球場股份（1/5）', price: 800000, desc: '分五次買下；主場加成提高，退休後成為球場主人', max: 5 },
  foundation: { name: '慈善基金會', price: 500000, desc: '每季捐款：人氣、形象、年度人道獎' },
  academy: { name: '青少年學院', price: 3000000, desc: '傳奇章節的第二人生與傳承：每年有學員' },
};
// 獎盃室等級
export const ROOM_LEVELS = [
  { name: '童年書桌', price: 0, slots: 6 }, { name: '家裡的玻璃櫃', price: 3000, slots: 14 }, { name: '獎盃室', price: 120000, slots: 30 },
  { name: '私人展覽館（兩層樓）', price: 1500000, slots: 60 }, { name: '名人堂館', price: 6000000, slots: 120 },
];
// 機票艙等（影響體能消耗）
export const FLIGHT = { eco: { name: '經濟艙', mul: 1, energy: 14 }, biz: { name: '商務艙', mul: 3.2, energy: 6 }, jet: { name: '私人飛機', mul: 12, energy: 2 } };
// 住宿
export const LODGE = { motel: { name: '汽車旅館', cost: 90, mood: -2 }, hotel: { name: '飯店', cost: 260, mood: 0 }, rent: { name: '大賽週租房', cost: 1200, mood: 4 } };
