// 18 洞球場。每洞：[標準桿, 黑梯碼數, 狗腿角度(負=左彎), 特徵, 差點順序, （真實球場才有）逐洞細節 spec]
// spec（真實球場）：tees 各梯台碼數、bendAt 狗腿位置（距白梯碼數）、ob 'L'/'R'、elev [[碼數, 公尺]…] 起伏、
//   green {slope 前低後高坡度, side 左右坡度, tier 雙層, size [寬, 長](碼), rot 斜放角度}、
//   bunkers [{at, side L/R/C, n, long, inside} 球道沙坑 / {g: F/B/L/R/FL/FR/BL/BR, n, big, grass} 果嶺邊]、
//   water [{from, to, side, w, ditch} / {g, size}]、valley {from, to} OB 山谷、waste [{g}] 荒地、trees [{at, side, n}]、
//   wind 'L'/'R' 常吹的風、windMul 風的倍率、note 特徵摘要、tip 打法建議
// 特徵代號：
//   wl/wr 落點區左/右側水池（峽谷球場為深谷）   wc 果嶺前水障礙（峽谷為深谷）
//   xc    球道中段橫越障礙（溪流 / 峽谷）       sl/sr 整洞左/右側是海
//   b0~b4 沙坑多寡                             up/dn 果嶺比發球台高/低（UP/DN 落差更大）
//   tr    兩側樹林特別密、球道窄                 ww 兩側大片荒地
export const TEE_SETS = [
  { id: 'black', name: '黑梯', color: '#1c1c1c', ratio: 1.0 },
  { id: 'blue', name: '藍梯', color: '#2c4f8f', ratio: 0.94 },
  { id: 'white', name: '白梯', color: '#f4f1ea', ratio: 0.88 },
  { id: 'red', name: '紅梯', color: '#a3302a', ratio: 0.78 },
];

// 球場群組（之後新增球場時，在 COURSES 加一筆並指定 group 即可；沒有球場的群組顯示「即將加入」）
export const COURSE_GROUPS = [
  { id: 'coast', name: '海邊球場' },
  { id: 'mountain', name: '山地 / 林間球場' },
  { id: 'desert', name: '沙漠 / 高原球場' },
  { id: 'taiwan', name: '台灣球場' },
];

export const COURSES = [
  {
    id: 'heron', name: '鷺灣海岸', en: 'Heron Bay Links', style: 'links', group: 'coast',
    desc: '臨海林克斯球場。幾乎沒有樹，海風大且常轉向；球道硬、落地後滾很遠；深壺型沙坑掉進去常常只能往旁邊救。',
    stimp: 8, firm: 1.25, altitude: 8, temp: 17, wind: [6, 15], fairwayW: 44, roughW: 22, corridor: 92, trees: 0.04,
    holes: [
      [4, 425, -6, 'sl b3', 9], [4, 398, 10, 'b2 up', 13], [5, 560, -12, 'sl b4', 3], [3, 185, 0, 'b3 sl', 15],
      [4, 445, 8, 'b3 xc', 1], [4, 360, -14, 'b2 dn', 17], [3, 210, 0, 'b4', 11], [5, 575, 14, 'b4 sr', 5], [4, 432, -4, 'b3 up', 7],
      [4, 404, 6, 'b2 sr', 12], [5, 540, -10, 'b4 xc', 4], [3, 165, 0, 'b3 sr', 18], [4, 440, -8, 'b3', 2],
      [4, 378, 12, 'b2 dn', 14], [4, 452, -6, 'b3 sl', 6], [4, 410, 16, 'b3 sr', 10], [3, 212, 0, 'b3 sl', 16], [5, 495, -14, 'b4 xc up', 8],
    ],
  },
  {
    id: 'maple', name: '楓林谷', en: 'Maple Valley', style: 'parkland', group: 'mountain',
    desc: '林間公園型球場。球道兩側高大樹林，多處水池，果嶺起伏較多，考驗開球準度與推桿判讀。',
    stimp: 8.5, firm: 0.92, altitude: 220, temp: 22, wind: [2, 9], fairwayW: 32, roughW: 18, corridor: 70, trees: 1.0,
    holes: [
      [4, 402, 8, 'b2 tr', 7], [5, 538, -14, 'b3 wl', 3], [3, 176, 0, 'b3 wc', 15], [4, 365, 12, 'b2 dn', 11],
      [4, 428, -8, 'b3 wr', 1], [3, 192, 0, 'b2 up', 17], [4, 412, -6, 'b3 wr', 5], [5, 556, 10, 'b3 xc', 9], [4, 389, 0, 'b2 wc up', 13],
      [4, 418, -10, 'b2 tr', 8], [4, 385, 14, 'b3 dn', 12], [3, 168, 0, 'b2 wc', 18], [5, 545, -12, 'b3 wr xc', 2],
      [4, 440, 6, 'b3 tr UP', 4], [4, 372, -16, 'b2 wl', 14], [3, 205, 0, 'b3 dn', 16], [4, 401, 10, 'b2 tr', 10], [5, 520, -8, 'b3 wc', 6],
    ],
  },
  {
    id: 'canyon', name: '赤岩峽谷', en: 'Red Rock Canyon', style: 'canyon', group: 'desert',
    desc: '高海拔沙漠球場，空氣稀薄，球多飛約 6%。多洞必須飛越峽谷，球道外是荒地與岩石，果嶺最硬最快。',
    stimp: 9, firm: 1.15, altitude: 1600, temp: 29, wind: [3, 12], fairwayW: 34, roughW: 10, corridor: 78, trees: 0.25,
    holes: [
      [4, 440, -8, 'b2 ww', 9], [5, 590, 12, 'b3 xc ww', 3], [4, 410, -12, 'b2 wl', 11], [3, 205, 0, 'b2 wc DN', 15],
      [4, 455, 6, 'b3 ww up', 1], [5, 610, -10, 'b3 xc', 5], [3, 230, 0, 'b3 wc', 13], [4, 395, 14, 'b2 wr dn', 17], [4, 470, -6, 'b3 ww UP', 7],
      [4, 420, 10, 'b2 wl', 10], [4, 400, -14, 'b3 ww', 12], [4, 380, 4, 'b2 xc', 2], [3, 190, 0, 'b2 wc', 18],
      [5, 575, -12, 'b3 wr', 4], [4, 385, 12, 'b2 ww dn', 14], [3, 215, 0, 'b3 wc DN', 16], [4, 330, -10, 'b2 xc', 8], [5, 540, 8, 'b3 wl up', 6],
    ],
  },
  {
    // 東方高爾夫俱樂部（桃園）：依官網 orientgolf.tw/holes 每洞介紹建立。距離都從白梯（男士梯）量起；
    // 官網只有 Pro / 男士 / 女士三組梯台 → 黑梯 = Pro、白梯 = 男士、紅梯 = 女士，藍梯取 Pro 與男士的中間值。
    // 官網沒有列出的項目（差點順序、海拔、果嶺速度、果嶺大小）為依描述推估。
    id: 'orient', name: '東方高爾夫', en: 'Orient Golf Country Club', style: 'parkland', group: 'taiwan', real: true,
    // 依官網每洞「球道配置圖」判讀的地圖（球道、長草、果嶺、發球台、沙坑、水、樹的實際形狀與位置）
    mapsUrl: 'assets/courses/orient-maps.json',
    desc: '桃園的丘陵林間球場（依官網 18 洞介紹建立）。上下坡很多，果嶺大多前低後高，打過旗桿就很難推；有濕地、水池、OB 山谷與多處 OB，考驗落點規劃。',
    stimp: 9, firm: 1.0, altitude: 120, temp: 24, wind: [3, 11], fairwayW: 32, roughW: 16, corridor: 72, trees: 0.8,
    holes: [
      [5, 535, -8, 'b1', 15, { tees: { black: 535, blue: 530, white: 525, red: 448 }, bendAt: 230, ob: 'L',
        elev: [[250, 1], [330, -2], [430, -6], [525, -4.5]], green: { slope: 0.024 }, bunkers: [{ g: 'L' }],
        note: '開球微狗腿左 · 左側 OB · 第二桿下坡 · 果嶺左側沙坑 · 前低後高',
        tip: '暖身洞。開球瞄球道中間約 210~250 碼，左邊坡外是 OB。第二桿下坡，建議留 100 碼左右打第三桿，順便避開果嶺左邊的沙坑。果嶺前低後高，別打過頭。' }],
      [3, 185, 0, 'b0', 17, { tees: { black: 185, blue: 175, white: 165, red: 125 }, valley: { from: 15, to: 125 },
        elev: [[165, 5.5]], green: { slope: 0.025 },
        note: '上坡 · 要飛越 OB 山谷 · 果嶺前低後高',
        tip: '上坡三桿洞，多拿一支桿就好（不用兩支）。沒把握飛過山谷就打果嶺右半邊。果嶺前低後高，球停在旗桿後面會很難推。' }],
      [4, 406, 0, 'b0', 9, { tees: { black: 406, blue: 399, white: 391, red: 335 },
        water: [{ from: 195, to: 255, side: 'L', w: 30 }], elev: [[230, -5], [391, -1.5]], green: { slope: 0.022 },
        note: '開球下坡 · 左側濕地（約 210~240 碼）· 第二桿上坡 · 前低後高',
        tip: '距離不長又是下坡，開球打上球道就好，不必硬飛左邊的濕地；太往右會跑到第 1 洞。第二桿上坡，旗桿在後面就打果嶺中間，失誤寧可偏右。' }],
      [4, 385, 0, 'b2', 11, { tees: { black: 385, blue: 375, white: 365, red: 324 },
        bunkers: [{ at: 240, side: 'R', long: true }, { g: 'FL' }], elev: [[240, 0.5], [365, 0]], green: { slope: 0.012 },
        note: '右側球道長沙坑（約 240 碼）· 果嶺左前沙坑 · 寧短勿長',
        tip: '右邊沿著車道有一條長沙坑，白梯約 240 碼，很多人想飛過去。開球瞄沙坑左邊，落在球道上看得到果嶺最好。第二桿從果嶺左前沙坑的右邊進攻，寧可短也不要長。' }],
      [5, 556, 0, 'b1', 7, { tees: { black: 556, blue: 546, white: 536, red: 430 },
        elev: [[240, 4], [400, 1], [536, -2]], green: { size: [26, 37], slope: 0.02 }, bunkers: [{ g: 'FL', big: true }],
        note: '開球微上坡、看不到落點 · 兩側沒有 OB · 第二桿下坡 · 果嶺長 37 碼、左前大沙坑',
        tip: '開球微上坡看不到落點，兩邊都沒有 OB：右邊會往第 4 洞方向滾，左邊的坡可能把球彈回球道。第二桿下坡，兩桿上果嶺不容易，建議留約 100 碼的挖起桿距離，也避開左前大沙坑。旗桿在後方打果嶺中間，在前方就直接打上果嶺。' }],
      [4, 446, 0, 'b1', 1, { tees: { black: 446, blue: 432, white: 417, red: 398 }, wind: 'R',
        trees: [{ at: 230, side: 'L', n: 10, len: 50, gap: 1 }], bunkers: [{ g: 'L' }], water: [{ g: 'FR' }], green: { slope: 0.015 },
        note: '前九最難 · 左側約 230 碼樹叢 · 果嶺左沙坑、右前水池 · 常吹右風',
        tip: '前九最難的中距離四桿洞，常被誤以為是狗腿左，想從左邊樹叢上方切過去最容易出事。開球瞄球道中間，不用擔心水。第二桿可以多拿一支桿；逆風時打果嶺右半邊，無風打中間。' }],
      [3, 190, 0, 'b0', 13, { tees: { black: 190, blue: 183, white: 175, red: 127 }, ob: 'L', wind: 'L',
        elev: [[175, 2.5]], green: { slope: 0.032 }, waste: [{ g: 'R' }],
        note: '高台開球但球往上飛 · 左側 OB · 常吹左風 · 果嶺前低後高很陡 · 右側荒地難切',
        tip: '發球台雖然高，球是往上坡飛，除非旗桿在前方，不用少算距離。果嶺前低後高非常陡，千萬別打過旗桿。常吹左風，左邊車道外是 OB；右邊是空地，從那裡切球很難。' }],
      [4, 368, 80, 'b3', 5, { tees: { black: 368, blue: 358, white: 348, red: 298 }, bendAt: 225,
        trees: [{ at: 190, side: 'R', n: 12, len: 70, gap: 1 }], bunkers: [{ at: 222, side: 'R', n: 3, inside: true }, { g: 'F' }],
        elev: [[225, 3], [348, 7]], green: { tier: true, slope: 0.012 },
        note: '接近 90° 大狗腿右 · 轉角右側密樹與 3 個沙坑 · 上坡 · 果嶺前沙坑 · 前後雙層果嶺',
        tip: '幾乎 90 度的狗腿右，右邊樹林很密，不要想直接切過去。開球瞄轉角 3 個沙坑的左邊，飛約 220~250 碼。整洞上坡，第二桿要飛過果嶺前的沙坑；果嶺前低後高、分兩層。' }],
      [4, 439, 0, 'b2', 3, { tees: { black: 439, blue: 428, white: 417, red: 365 },
        bunkers: [{ at: 220, side: 'R', long: true }, { g: 'FL' }], water: [{ from: 280, to: 330, side: 'L', w: 26 }, { g: 'BL', size: [14, 22] }],
        elev: [[220, 0], [417, 3]], green: { slope: 0.016 },
        note: '右側球道長沙坑（約 220 碼）· 左側水池（約 280 碼）· 果嶺左邊沙坑與濕地 · 多拿一支桿',
        tip: '右邊約 220 碼有一條長沙坑，開球寧可往水池那一側打，至少要 280 碼才會碰到水。第二桿是重點：旗桿在左邊不要直攻，打果嶺中間，除非旗桿在前方否則多拿一支桿；左邊有沙坑和濕地，失誤寧可偏右。' }],
      [5, 536, 16, 'b3', 8, { tees: { black: 536, blue: 526, white: 515, red: 463 }, bendAt: 300, ob: 'L',
        bunkers: [{ at: 225, side: 'R' }, { at: 400, side: 'L', n: 3 }], water: [{ from: 205, to: 430, side: 'R', w: 40, gap: 4 }],
        elev: [[230, 0], [400, 1], [515, 4.5]], green: { slope: 0.02 },
        note: '右側大水池（約 230 碼起）· 左側 OB · 第二桿直攻要飛過水 · 左側 3 個沙坑是安全落點 · 果嶺較高、前低後高',
        tip: '開球瞄右邊球道沙坑和球道中間之間，右邊約 230 碼是水池，左邊外側是 OB。第二桿直攻要飛過水，除非是單差點高手，否則往左邊 3 個沙坑的中間過渡，留舒服的挖起桿距離。第三桿打果嶺左半邊，球要停在旗桿下方。' }],
      [4, 445, -14, 'b3', 6, { tees: { black: 445, blue: 438, white: 430, red: 383 }, bendAt: 245,
        bunkers: [{ at: 232, side: 'L', n: 3, inside: true }, { g: 'L' }, { g: 'FL' }], green: { size: [20, 36], rot: -35, slope: 0.012 },
        elev: [[245, 0], [430, 2.5]],
        note: '左側 3 個沙坑（飛過約 240 碼可抄捷徑）· 果嶺斜長形、沙坑都在左邊 · 第二桿多算 5 碼',
        tip: '開球可以挑戰飛過左邊 3 個沙坑（約 240 碼）縮短第二桿，或打球道中間讓第二桿視野比較好。第二桿比平常多算 5 碼左右。果嶺斜長，沙坑都在左邊，瞄旗桿左邊一點。' }],
      [4, 418, -16, 'b2', 10, { tees: { black: 418, blue: 402, white: 386, red: 322 }, bendAt: 235, ob: 'L',
        bunkers: [{ g: 'F', n: 2 }], elev: [[235, 0], [386, 3]], green: { slope: 0.026 },
        note: '狗腿左 · 左側馬路 OB · 果嶺前 2 個沙坑 · 果嶺較高、前低後高、球不容易停',
        tip: '狗腿左，不要瞄左邊轉角，左邊馬路是 OB。開球打球道中間，偏右比較安全但第二桿會比較遠。第二桿要飛過果嶺前的 2 個沙坑，但不必打太深：果嶺後面高、球很難停。角度不好或距離遠時打果嶺右邊。' }],
      [3, 178, 0, 'b1', 18, { tees: { black: 178, blue: 168, white: 158, red: 128 },
        bunkers: [{ g: 'L' }], waste: [{ g: 'B' }], green: { slope: 0.015, side: 0.01 },
        note: '短而漂亮的三桿洞 · 旗桿在右邊可以直攻 · 不要打過頭',
        tip: '漂亮的短三桿洞。旗桿在果嶺右半邊可以直接攻，在左邊就依自己的能力打。千萬不要打過頭，果嶺後面很難救。' }],
      [4, 468, 0, 'b2', 4, { tees: { black: 468, blue: 456, white: 443, red: 396 }, windMul: 1.35,
        water: [{ from: 30, to: 230, side: 'R', w: 26 }], bunkers: [{ g: 'F', n: 2 }], elev: [[230, 3], [443, 7]], green: { slope: 0.016 },
        note: '筆直上坡 · 右側整排水域到約 230 碼 · 果嶺前 2 個沙坑 · 最受風影響的四桿洞',
        tip: '筆直的上坡四桿洞，也是最受風影響的一洞。右邊從發球台到約 230 碼都是水，開球寧可偏左。能兩桿上果嶺的人不多，可以當五桿洞打：第二桿停在果嶺前 2 個沙坑之前，第三桿上果嶺拿 Par。' }],
      [4, 362, 0, 'b3', 16, { tees: { black: 362, blue: 352, white: 342, red: 293 },
        bunkers: [{ at: 230, side: 'R', long: true }, { at: 232, side: 'L', n: 2 }], elev: [[240, 1], [342, -3]], green: { slope: 0.014 },
        note: '右側長沙坑（飛過約 260 碼）· 左側 2 個沙坑（約 240 碼）· 果嶺比球道低',
        tip: '別想飛過右邊的長沙坑（約 260 碼），風險大、報酬小。開球瞄左邊 2 個沙坑的左側，約 240 碼。果嶺比球道低，第二桿常是下坡球位，少算約 5 碼。' }],
      [3, 215, 0, 'b2', 14, { tees: { black: 215, blue: 209, white: 202, red: 151 },
        bunkers: [{ g: 'F', n: 2, grass: true }], elev: [[202, 3.5]], green: { slope: 0.018 },
        note: '長距離上坡三桿洞 · 果嶺前 2 個草坑 · 寧長勿短',
        tip: '長的上坡三桿洞，多數人都打短。果嶺前有 2 個很難打的草坑，寧可拿長一點的桿子。沒上果嶺的話，切一推也還有機會。' }],
      [4, 478, 0, 'b0', 2, { tees: { black: 478, blue: 469, white: 460, red: 403 }, ob: 'L',
        water: [{ from: 215, to: 260, side: 'R', w: 32 }, { from: 10, to: 215, side: 'R', ditch: true }],
        elev: [[230, 0], [460, 9]], green: { tier: true, slope: 0.01 },
        note: '右側水溝一路到約 230 碼的水池 · 左側 OB · 第二桿上坡約多 20 碼 · 雙層果嶺',
        tip: '比第 14 洞還難。右邊從發球台有一條水溝通到約 230 碼的水池，左邊太遠是 OB。第二桿從水池旁到果嶺約 180 碼而且上坡，要多算約 20 碼。旗桿在下層時打足距離比較有利。' }],
      [5, 558, 0, 'b4', 12, { tees: { black: 558, blue: 546, white: 533, red: 469 },
        bunkers: [{ at: 240, side: 'L', n: 2 }, { at: 443, side: 'C', n: 4 }, { g: 'F', n: 2 }], elev: [[240, -5], [443, -5], [533, -2]], green: { slope: 0.022 },
        note: '開球下坡、球道窄長 · 左側 2 個球道沙坑 · 離果嶺約 90 碼有 4 個橫向沙坑 · 果嶺較高、前低後高',
        tip: '開球下坡、球道窄長。瞄左邊 2 個沙坑的右側：打得遠可以飛過，打不遠也會滾回球道。離果嶺約 90 碼有 4 個沙坑橫在球道上，第二桿不要直攻，留約 100 碼打第三桿，並打足距離飛過果嶺前沙坑，果嶺後面比較高。' }],
    ],
  },
];

export const courseById = id => COURSES.find(c => c.id === id);

// 真實球場的描圖地圖：第一次用到時下載（之後從手機快取讀），建洞之前要先等它
export async function loadCourseMaps(course) {
  if (!course || !course.mapsUrl || course.maps) return;
  if (!course._mapsP) course._mapsP = fetch(course.mapsUrl).then(r => r.json()).then(m => { course.maps = m; }).catch(e => { course._mapsP = null; throw e; });
  await course._mapsP;
}

export function teeYards(course, holeIdx, teeId) {
  const t = TEE_SETS.find(x => x.id === teeId) || TEE_SETS[1];
  const spec = course.holes[holeIdx][5];
  if (spec && spec.tees && spec.tees[t.id]) return spec.tees[t.id];      // 真實球場：用各梯台的實際碼數
  return Math.round(course.holes[holeIdx][1] * t.ratio);
}

export function courseYards(course, teeId) {
  return course.holes.reduce((s, _, i) => s + teeYards(course, i, teeId), 0);
}
