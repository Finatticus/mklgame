// 球場護照的印章：每座球場一個圖案（圓形印章，外圈英文名、中間圖案、下方中文名），用 SVG 畫，蓋上去有墨水的斑駁感
// 圖案在 100 x 100 的格子裡畫，中心約 (50, 46)；只用單色（印章的墨水色），用 fill / stroke 的濃淡表現

// 常用的小零件
const tree = (x, y, s = 1) => `<path d="M${x} ${y - 13 * s}l${7 * s} ${11 * s}h${-4 * s}l${5 * s} ${7 * s}h${-16 * s}l${5 * s} ${-7 * s}h${-4 * s}z" /><rect x="${x - 1.2 * s}" y="${y + 5 * s}" width="${2.4 * s}" height="${4 * s}"/>`;
const wave = (y, x0 = 26, x1 = 74, amp = 2.2) => { let d = `M${x0} ${y}`; for (let x = x0; x < x1; x += 8) d += ` q2 ${-amp} 4 0 t4 0`; return `<path d="${d}" fill="none" stroke-width="2" />`; };
const flag = (x, y, h = 18) => `<path d="M${x} ${y}v${-h}" fill="none" stroke-width="1.6"/><path d="M${x} ${y - h}l9 3.5-9 3.5z"/>`;
const sun = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}"/>` + [...Array(10)].map((_, i) => { const a = i / 10 * Math.PI * 2; return `<path d="M${x + Math.cos(a) * (r + 2.5)} ${y + Math.sin(a) * (r + 2.5)}L${x + Math.cos(a) * (r + 6)} ${y + Math.sin(a) * (r + 6)}" stroke-width="1.6"/>`; }).join('');
const bird = (x, y, s = 1) => `<path d="M${x - 6 * s} ${y}q${3 * s} ${-3.5 * s} ${6 * s} 0q${3 * s} ${-3.5 * s} ${6 * s} 0" fill="none" stroke-width="1.5"/>`;
const turbine = (x, y, h = 26) => `<path d="M${x} ${y}v${-h}" fill="none" stroke-width="1.8"/>` + [0, 120, 240].map(a => { const r = a * Math.PI / 180; return `<path d="M${x} ${y - h}l${Math.sin(r) * 11} ${-Math.cos(r) * 11}" fill="none" stroke-width="1.8"/>`; }).join('') + `<circle cx="${x}" cy="${y - h}" r="1.8"/>`;
const ground = (y = 64) => `<path d="M24 ${y}h52" fill="none" stroke-width="2"/>`;
const hill = (pts) => `<path d="M24 64 ${pts} L76 64z"/>`;

const M = {
  // ---- 台灣 ----
  orient: () => hill('C34 48 42 44 50 50 C58 44 68 48 72 56') + `<ellipse cx="50" cy="66" rx="20" ry="3.5" fill="none" stroke-width="1.6"/>` + flag(52, 50) + bird(36, 32) + bird(62, 28, 0.8),
  donghua: () => wave(62) + wave(68, 30, 70) + `<path d="M24 56 L44 56 L48 46 L76 46 L76 56" fill="none" stroke-width="2"/>` + turbine(60, 46, 22) + turbine(70, 46, 16) + flag(36, 56, 14),
  cggc: () => tree(36, 50, 1.2) + tree(64, 52, 1) + `<rect x="44" y="30" width="12" height="26" fill="none" stroke-width="1.8"/><path d="M47 35h2M51 35h2M47 40h2M51 40h2M47 45h2M51 45h2" stroke-width="1.6"/>` + ground(),
  miramar: () => [26, 34, 41, 60, 67].map((x, i) => `<rect x="${x}" y="${[34, 26, 38, 30, 40][i]}" width="6" height="${64 - [34, 26, 38, 30, 40][i]}"/>`).join('') + flag(51, 62, 20) + ground(),
  hsingfu: () => `<path d="M30 64 L34 52 L42 49 L47 56 L44 64z"/><path d="M50 64 L53 57 L60 56 L62 64z"/>` + turbine(66, 50, 18) + wave(68, 28, 72, 1.8) + `<path d="M40 30 q4 -6 8 0 q4 -6 8 0 q0 6 -8 12 q-8 -6 -8 -12z"/>`,
  taipei: () => tree(32, 52, 1.1) + tree(44, 48, 1.3) + tree(57, 52, 1) + `<path d="M58 26 l14 -4 l2 2 l-12 6 l2 5 l-2 0 l-3 -4 l-5 2z"/>` + ground(),
  nanyi: () => `<ellipse cx="38" cy="54" rx="9" ry="5"/><ellipse cx="62" cy="54" rx="9" ry="5"/>` + flag(38, 54, 16) + flag(62, 54, 16) + `<path d="M50 66 v-8" stroke-width="1.8"/>` + sun(50, 26, 5),
  tashee: () => `<path d="M34 44 q8 -10 18 -4 l8 -3 -4 6 q2 8 -8 12 l-14 -2z"/><circle cx="52" cy="40" r="1.4" fill="#fff"/><path d="M60 37 l10 -2" stroke-width="2"/>` + `<path d="M26 64 q12 -10 24 -4 q12 -10 24 -2" fill="none" stroke-width="2"/>` + tree(70, 56, 0.7),
  taoyuan: () => `<path d="M50 68 L42 30 Q50 26 58 30z" fill="none" stroke-width="2"/>` + flag(50, 32, 12) + `<text x="68" y="60" font-size="16" font-weight="700" font-family="Barlow Condensed, sans-serif" text-anchor="middle">6</text><text x="68" y="68" font-size="5.5" text-anchor="middle">PAR</text>` + tree(32, 56, 0.8),
  yunghan: () => tree(30, 54, 0.9) + tree(70, 54, 0.9) + `<path d="M38 36 q10 -6 20 0 q-10 2 -20 0z M36 44 q12 -6 26 0 q-12 2 -26 0z" />` + `<path d="M50 64 L46 50 h8z" fill="none" stroke-width="1.8"/>` + ground(),
  sunrise: () => `<path d="M26 58 a24 24 0 0 1 48 0z" fill="none" stroke-width="2"/>` + `<path d="M34 58 a16 16 0 0 1 32 0z"/>` + [0, 1, 2, 3, 4, 5, 6].map(i => { const a = Math.PI + i / 6 * Math.PI; return `<path d="M${50 + Math.cos(a) * 28} ${58 + Math.sin(a) * 28}L${50 + Math.cos(a) * 34} ${58 + Math.sin(a) * 34}" stroke-width="1.8"/>`; }).join('') + wave(64, 28, 72, 1.6),
  // 老爺關西：山谷裡的會館與層層山稜
  royalkh: () => `<path d="M22 60 L36 40 L46 50 L58 34 L78 60z" fill="none" stroke-width="2"/>` + `<rect x="40" y="52" width="20" height="10"/><path d="M38 52 L50 45 L62 52z"/>` + ground(64) + flag(68, 62, 12),
  // 立益：跨過山谷的紅色吊橋
  lilygolf: () => `<path d="M22 58 Q50 72 78 58" fill="none" stroke-width="2.4"/><path d="M28 46 V60 M72 46 V60" stroke-width="2.4"/><path d="M28 46 Q50 66 72 46" fill="none" stroke-width="1.4"/>` + [34, 40, 46, 52, 58, 64].map(x => `<path d="M${x} ${58 + (x - 50) * (x - 50) / 140 * -0.5 + 4} V${52 + Math.abs(x - 50) * 0.3}" stroke-width="1"/>`).join('') + wave(70, 30, 70, 1.6),
  // 再興：潘冀設計的平頂玻璃會館、前面一叢芒草
  zaixing: () => `<path d="M24 46 H76 L72 50 H28z"/><rect x="32" y="50" width="36" height="12" fill="none" stroke-width="1.6"/><path d="M41 50 V62 M50 50 V62 M59 50 V62" stroke-width="1"/>` + [24, 28, 32].map((x, i) => `<path d="M${x} 66 Q${x - 4 + i * 2} 56 ${x - 6 + i * 4} 48" fill="none" stroke-width="1.2"/>`).join('') + ground(66) + flag(72, 66, 12),
  // 寶山：山丘間的水池與果嶺
  paoshan: () => `<path d="M20 60 L34 42 L44 50 L58 36 L80 60z" fill="none" stroke-width="2"/>` + `<ellipse cx="40" cy="64" rx="12" ry="3.5"/>` + wave(66, 52, 74, 1.4) + flag(62, 62, 14),
  // 旭陽：山谷升起的太陽與西班牙風格的會館鐘樓
  sunvalley: () => sun(50, 34, 9) + `<path d="M20 62 L34 46 L44 54 L56 42 L80 62z" fill="none" stroke-width="2"/>` + `<rect x="58" y="48" width="8" height="14"/><path d="M56 48 L62 42 L68 48z"/>` + ground(64),
  // 台中國際：大坑的群山與三區的旗
  ticc: () => `<path d="M18 62 L32 40 L42 50 L54 32 L66 48 L82 62z" fill="none" stroke-width="2"/>` + flag(36, 62, 12) + flag(50, 62, 15) + flag(64, 62, 12) + ground(64),
  // 鴻禧太平：山上的果嶺台地與高低差 45 公尺的第 9 洞
  hunghsi: () => `<path d="M24 66 L24 54 L40 54 L40 66z M56 44 L56 30 L76 30 L76 44z" fill="none" stroke-width="2"/>` + `<path d="M40 56 Q50 30 62 31" fill="none" stroke-width="1.4" stroke-dasharray="2 2"/>` + flag(68, 31, 12) + ground(66),
  // 台豐：斜向平行的球道與生態水池
  taifong: () => `<path d="M22 60 L70 34 M30 66 L78 40" fill="none" stroke-width="5" stroke-linecap="round"/>` + `<ellipse cx="34" cy="40" rx="9" ry="4"/>` + flag(70, 34, 13) + ground(68),
  // 南峰：南投的山峰與果嶺旗
  nanfeng: () => `<path d="M18 62 L38 34 L50 48 L62 30 L82 62z" fill="none" stroke-width="2"/>` + flag(50, 62, 14) + ground(64),
  // 棕梠湖：湖邊的椰子樹
  palmlakes: () => `<path d="M40 64 Q42 46 46 32" fill="none" stroke-width="2"/><path d="M46 32 q-12 -2 -16 6 M46 32 q12 -4 16 4 M46 32 q-6 -10 -14 -10 M46 32 q6 -10 14 -8" fill="none" stroke-width="1.8"/>` + wave(64, 50, 76, 1.6) + flag(68, 58, 10),
  // 嘉南：平地的水道與果嶺
  chianan: () => wave(48, 22, 78, 1.8) + wave(56, 22, 78, 1.8) + `<ellipse cx="50" cy="38" rx="12" ry="4"/>` + flag(50, 38, 14) + ground(66),
  // 新豐：平行的林間球道與海邊的風車
  hsinchu: () => tree(30, 52, 0.9) + tree(42, 50, 1.1) + `<path d="M50 64 L58 36 M60 64 L66 40" fill="none" stroke-width="2"/>` + turbine(72, 56, 20) + ground(),
  // 聖安德魯斯：18 洞的 Swilcan 石拱橋與溪水、遠方的旗
  standrews: () => `<path fill-rule="evenodd" d="M20 64 Q50 40 80 64 L80 69 L20 69z M38 69 Q50 53 62 69z"/>` + `<path d="M24 74 q6 -3 12 0 t12 0 t12 0 t12 0" fill="none" stroke-width="1.8"/>` + flag(66, 46, 16) + bird(34, 30, 0.8),
  // 圓石灘：海崖上一棵平頂的蒙特利柏樹、下方的浪
  pebble: () => `<path d="M22 66 L22 52 L40 48 L54 54 L60 66z"/>` + `<path d="M40 48 L41 34" fill="none" stroke-width="2"/><ellipse cx="36" cy="33" rx="11" ry="4"/><ellipse cx="46" cy="29" rx="9" ry="3.5"/>` + wave(70, 26, 76, 2) + flag(70, 60, 14),
  // 川奈：遠方積雪的富士山、相模灣、海崖上的松樹
  // 孤島果嶺與旗
  sawgrass: () => `<ellipse cx="50" cy="56" rx="26" ry="9" fill="none" stroke-width="2"/><ellipse cx="50" cy="54" rx="13" ry="5"/>` + flag(52, 53, 22) + wave(66, 28, 72, 1.6),
  // 郵票（鋸齒邊）裡的小果嶺
  troon: () => `<rect x="30" y="26" width="40" height="40" fill="none" stroke-width="2" stroke-dasharray="3 2"/><ellipse cx="50" cy="48" rx="7" ry="12"/><circle cx="38" cy="40" r="3" fill="none" stroke-width="1.4"/><circle cx="62" cy="54" r="3" fill="none" stroke-width="1.4"/>`,
  // Barry Burn 上的石橋
  carnoustie: () => `<path d="M24 58 h52" stroke-width="2"/><path d="M32 58 Q50 40 68 58" fill="none" stroke-width="3"/>` + wave(64, 24, 76, 1.8) + flag(50, 48, 16),
  // Kiawah：大西洋海浪＋沙丘上的果嶺旗
  kiawah: () => wave(66, 22, 78, 1.8) + wave(72, 26, 74, 1.4) + `<path d="M24 58 Q38 44 50 52 Q62 42 76 56" fill="none" stroke-width="2.4"/>` + flag(52, 48, 20),
  // Royal St George's：第 4 洞「喜馬拉雅」巨型沙坑（枕木牆）
  rsg: () => `<path d="M26 60 Q40 34 58 40 Q72 44 74 60 Z" fill="none" stroke-width="2.4"/><path d="M34 52 h30 M36 47 h24 M40 42 h14" stroke-width="1.4"/>` + flag(66, 36, 14),
  // Royal Melbourne：沙帶地果嶺旁的大沙坑與茶樹
  rmw: () => `<ellipse cx="54" cy="50" rx="13" ry="9"/><path d="M28 58 Q34 46 44 54 Q40 62 30 62 Z" fill="none" stroke-width="2"/><circle cx="72" cy="36" r="6" fill="none" stroke-width="1.8"/><circle cx="66" cy="30" r="5" fill="none" stroke-width="1.8"/>` + flag(56, 48, 18),
  kawana: () => `<path d="M26 58 L44 30 Q50 26 56 30 L74 58z"/><path d="M44 30 Q50 26 56 30 L59 35 L54 33 L50 37 L46 33 L41 35z" fill="#fff"/>` + wave(64, 26, 74, 1.8) + `<path d="M24 70 L24 62 L34 62" fill="none" stroke-width="2"/><ellipse cx="30" cy="56" rx="7" ry="2.6"/><path d="M30 62 V57" stroke-width="1.6"/>`,
  // 曼吉勞：兩邊的海崖、中間的海灣，對岸岩石上的果嶺與旗
  mangilao: () => `<path d="M20 66 L20 46 L34 48 L38 66z"/><path d="M80 66 L80 50 L64 52 L60 66z"/>` + wave(62, 38, 60, 1.8) + wave(68, 36, 62, 1.8) + `<ellipse cx="71" cy="51" rx="7" ry="2" fill="none" stroke-width="1.4"/>` + flag(72, 50, 14) + bird(48, 32, 0.8),
  // 洞穴口垂下的瀑布、下方水池與旗桿
  cliffhangers: () => `<path d="M24 68 L24 44 Q24 22 50 22 Q76 22 76 44 L76 68 L66 68 L66 46 Q66 32 50 32 Q34 32 34 46 L34 68z"/>` + `<path d="M40 34 v26 M46 33 v29 M52 33 v28 M58 34 v27" fill="none" stroke-width="1.6"/>` + `<ellipse cx="50" cy="70" rx="24" ry="4" fill="none" stroke-width="1.8"/>`,
  lungtan: () => `<path d="M28 50 q6 -10 12 -2 q6 8 12 0 q6 -8 12 0 q4 6 10 -2 l-2 6 q-6 6 -10 0 q-6 -8 -12 0 q-6 8 -12 0 q-6 -8 -10 0z"/><circle cx="72" cy="46" r="1.2" fill="#fff"/><path d="M74 44 l4 -4 M73 43 l2 -5" stroke-width="1.4"/>` + `<ellipse cx="50" cy="64" rx="22" ry="4" fill="none" stroke-width="1.8"/>` + flag(40, 62, 10),
  // ---- 海邊 / 山地 / 沙漠 ----
  heron: () => `<path d="M46 62 v-10 M50 62 v-10" stroke-width="1.5"/><path d="M42 52 q2 -10 12 -10 q2 -8 -2 -12 q6 0 6 6 l10 -1 -9 3 q0 10 -6 14z"/>` + wave(66),
  maple: () => `<path d="M50 24 l4 10 8 -4 -2 9 9 2 -8 6 3 6 -9 -2 -1 9 -4 -6 -4 6 -1 -9 -9 2 3 -6 -8 -6 9 -2 -2 -9 8 4z"/><path d="M50 56 v10" stroke-width="2"/>`,
  canyon: () => `<path d="M24 64 V44 h10 V36 h10 v28z"/><path d="M56 64 V40 h8 V48 h12 v16z"/>` + sun(50, 26, 4) + flag(50, 64, 12),
  palmcove: () => `<path d="M50 64 q-2 -16 4 -30" fill="none" stroke-width="2.4"/><path d="M54 34 q-10 -4 -16 4 q8 -2 16 -4 q-2 -10 -12 -10 q8 4 12 10 q4 -10 14 -8 q-8 2 -14 8 q12 -2 14 8 q-8 -6 -14 -8z"/>` + wave(66),
  cliffs: () => `<path d="M24 64 V42 l6 -4 8 2 6 -6 V64z"/>` + flag(36, 38, 12) + wave(56, 48, 76) + wave(63, 48, 76) + bird(62, 32),
  alpine: () => `<path d="M24 62 L42 32 L52 46 L60 36 L76 62z"/><path d="M38 38 L42 32 L46 38 L42 36z M57 41 L60 36 L63 41z" fill="#fff"/>` + tree(30, 60, 0.6) + tree(70, 60, 0.6),
  sakura: () => [0, 72, 144, 216, 288].map(a => `<ellipse cx="50" cy="38" rx="5" ry="9" transform="rotate(${a} 50 46)"/>`).join('') + `<circle cx="50" cy="46" r="3" fill="#fff"/>` + `<path d="M30 66 q20 -6 40 0" fill="none" stroke-width="1.8"/>`,
  oasis: () => `<path d="M24 64 q14 -16 28 -6 q12 -10 24 2 V64z"/><path d="M46 52 q-1 -12 3 -20" fill="none" stroke-width="2"/><path d="M49 32 q-8 -2 -12 4 q6 -2 12 -4 q4 -8 12 -6 q-6 2 -12 6z"/>` + sun(68, 28, 4),
  saltflat: () => `<path d="M26 54 h48" stroke-width="2"/><path d="M30 60 l8 -3 6 4 8 -4 7 3 8 -2" fill="none" stroke-width="1.4"/><path d="M32 54 L42 40 L50 48 L58 38 L70 54z"/>` + sun(50, 26, 5),
  // ---- 奇幻 ----
  jungle: () => `<circle cx="50" cy="42" r="14" fill="none" stroke-width="2.4" stroke-dasharray="2 3"/>` + [[44, 34], [58, 38], [50, 52], [40, 46]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8"/>`).join('') + `<path d="M26 66 q8 -14 16 -2 q8 -14 16 -2 q8 -14 16 -2" fill="none" stroke-width="2"/>`,
  shroom: () => `<path d="M30 46 q20 -26 40 0z"/><rect x="45" y="46" width="10" height="18" rx="3"/><circle cx="42" cy="38" r="2.5" fill="#fff"/><circle cx="56" cy="36" r="3" fill="#fff"/><circle cx="62" cy="43" r="2" fill="#fff"/>`,
  ember: () => `<path d="M26 64 L42 34 h16 L74 64z"/><path d="M44 34 q2 -10 6 -14 q4 4 6 14" fill="none" stroke-width="2"/><path d="M47 34 l3 10 3 -10" fill="#fff"/>`,
  aurora: () => `<path d="M26 40 q12 -14 24 -4 q12 10 24 -6" fill="none" stroke-width="2.4"/><path d="M28 48 q12 -12 22 -4 q12 8 22 -4" fill="none" stroke-width="1.4" stroke-dasharray="3 2"/><path d="M26 64 L38 52 L46 58 L56 48 L74 64z"/>`,
  starfall: () => `<circle cx="50" cy="44" r="10"/><ellipse cx="50" cy="44" rx="22" ry="6" fill="none" stroke-width="2" transform="rotate(-18 50 44)"/><path d="M28 26 l1.4 3 3 .4 -2.2 2 .6 3 -2.8 -1.6 -2.8 1.6 .6 -3 -2.2 -2 3 -.4z M70 62 l1 2 2 .3 -1.5 1.4 .4 2 -1.9 -1 -1.9 1 .4 -2 -1.5 -1.4 2 -.3z"/>`,
  honey: () => [[50, 34], [41, 39], [59, 39], [41, 49], [59, 49], [50, 54]].map(([x, y]) => `<path d="M${x} ${y - 5}l4.3 2.5v5l-4.3 2.5-4.3-2.5v-5z"/>`).join('') + `<path d="M50 44 l2 -2" stroke-width="1"/>` + `<ellipse cx="66" cy="28" rx="4" ry="2.6"/><path d="M64 26 q-2 -4 1 -4 M68 26 q2 -4 -1 -4" fill="none" stroke-width="1.2"/>`,
  clock: () => `<circle cx="50" cy="44" r="12" fill="none" stroke-width="3" stroke-dasharray="4 2.3"/><circle cx="50" cy="44" r="7"/><circle cx="50" cy="44" r="2" fill="#fff"/><circle cx="68" cy="58" r="6" fill="none" stroke-width="2.4" stroke-dasharray="2.4 1.6"/><path d="M28 64 V48 h5 v16" />`,
  haunt: () => `<path d="M30 64 V40 l4 -6 4 6 V64z M44 64 V30 l6 -8 6 8 V64z M62 64 V42 l4 -5 4 5 V64z"/><path d="M48 40 h4 v6 h-4z M34 46 h2 v4 h-2z" fill="#fff"/><path d="M68 24 a7 7 0 1 0 0 0.1" fill="none"/><circle cx="70" cy="24" r="5" fill="none" stroke-width="1.6"/>`,
  toy: () => `<rect x="30" y="50" width="16" height="14"/><rect x="48" y="50" width="16" height="14" fill="none" stroke-width="2"/><rect x="38" y="36" width="18" height="14"/><circle cx="35" cy="48.5" r="1.8"/><circle cx="41" cy="48.5" r="1.8"/><circle cx="44" cy="34.5" r="1.8"/><circle cx="50" cy="34.5" r="1.8"/><path d="M68 64 V44" stroke-width="3"/><path d="M66 46 h4 M66 52 h4 M66 58 h4" stroke-width="1.4"/>`,
  storm: () => `<path d="M30 40 q0 -10 10 -9 q4 -8 12 -4 q10 -3 12 6 q8 1 6 8 z"/><path d="M50 42 l-6 12 h6 l-4 12 12 -16 h-6 l4 -8z"/>`,
  // ---- 奇幻第三批 ----
  sugar: () => `<circle cx="50" cy="38" r="13"/><path d="M50 38 m0 -9 a9 9 0 1 1 -9 9 a6 6 0 1 1 6 -6 a3 3 0 1 1 -3 3" fill="none" stroke="#fff" stroke-width="1.6"/><rect x="48.5" y="51" width="3" height="16" rx="1.5"/>`,
  neonlane: () => `<path d="M24 56 V44 h6 V36 h6 V48 h5 V30 h7 V52 h5 V40 h6 V50 h5 V38 h6 V56z"/><path d="M24 60 h52 M28 64 h44" fill="none" stroke-width="1.4"/><circle cx="50" cy="24" r="5" fill="none" stroke-width="1.6"/>`,
  lunar: () => `<path d="M58 22 a16 16 0 1 0 12 26 a12 12 0 1 1 -12 -26z"/><circle cx="32" cy="30" r="4" fill="none" stroke-width="1.6"/><path d="M26 64 q24 -8 48 0" fill="none" stroke-width="2"/><path d="M46 60 v-12 l8 3 -8 3" stroke-width="1.4"/>`,
  pharaoh: () => `<path d="M24 64 L46 30 L68 64z"/><path d="M58 64 L68 48 L78 64z"/><path d="M46 30 L52 64" fill="none" stroke="#fff" stroke-width="1"/>` + sun(30, 28, 4),
  coral: () => `<path d="M50 66 V48 M50 52 q-8 -4 -8 -14 M50 50 q8 -4 8 -12 M42 40 q-6 -2 -6 -8 M58 40 q5 -3 4 -9" fill="none" stroke-width="3" stroke-linecap="round"/><circle cx="66" cy="30" r="2.5" fill="none" stroke-width="1.4"/><circle cx="70" cy="22" r="1.8" fill="none" stroke-width="1.2"/><circle cx="32" cy="26" r="2" fill="none" stroke-width="1.2"/>`,
  jurassic: () => `<path d="M24 64 L40 38 h10 L66 64z"/><path d="M42 38 q-2 -8 2 -14 M48 38 q2 -8 6 -12" fill="none" stroke-width="2"/><path d="M66 64 q0 -14 6 -22 q4 -4 6 0 q-4 0 -5 4 q-3 8 -2 18z"/>`,
  crystalcave: () => `<path d="M34 64 L30 42 L36 30 L42 42 L40 64z"/><path d="M44 64 L42 36 L50 20 L58 36 L56 64z"/><path d="M60 64 L60 46 L66 36 L72 46 L68 64z"/><path d="M50 22 L50 60" fill="none" stroke="#fff" stroke-width="1"/>`,
  mirefen: () => `<path d="M48 66 V44 q0 -8 -10 -14 M48 48 q4 -10 14 -12 M44 38 l-6 -2 M58 37 l4 -6" fill="none" stroke-width="3" stroke-linecap="round"/><path d="M24 56 q8 -3 16 0 q8 3 16 0 q8 -3 20 0 M28 62 q10 -3 20 0 q10 3 24 0" fill="none" stroke-width="1.4"/>`,
  redplanet: () => `<circle cx="48" cy="44" r="16"/><circle cx="42" cy="38" r="3" fill="#fff" opacity=".6"/><circle cx="54" cy="50" r="4" fill="#fff" opacity=".5"/><circle cx="72" cy="26" r="2.5"/><circle cx="26" cy="30" r="1.8"/>`,
  skyreach: () => `<path d="M36 50 V36 l3 -6 3 6 V50 M46 50 V28 l4 -8 4 8 V50 M58 50 V38 l3 -5 3 5 V50z"/><path d="M24 58 q4 -8 12 -4 q6 -8 14 -2 q8 -6 14 2 q8 -4 12 4z"/>`,
};

// 墨水色：依球場群組
export const STAMP_INK = { taiwan: '#a3302a', abroad: '#2a4a7a', fantasy: '#5a3aa8', coast: '#1f6a8a', mountain: '#2f6a3a', desert: '#a8682a' };

let uid = 0;
const PFX = Math.random().toString(36).slice(2, 6);      // 每個印章的 defs 編號不重複

// 印章等級：打完 1 次蓋墨印，3 次升級銅印、5 次銀章、10 次金章（越來越華麗、越來越寫實）
export const STAMP_TIERS = [
  { n: 1, name: '墨印' }, { n: 3, name: '銅印' }, { n: 5, name: '銀章' }, { n: 10, name: '金章' },
];
export function stampTier(n) { let t = 0; STAMP_TIERS.forEach((x, k) => { if (n >= x.n) t = k; }); return t; }

// 銀章 / 金章裡的實景：依球場群組的天空、地面、遠景
const SCENE = {
  taiwan: { sky: ['#fbe3b4', '#f0a56c'], sun: '#fff4cf', land: ['#7cb062', '#3f7a3c'], far: '#6f8f6a' },
  abroad: { sky: ['#dcefff', '#82b8e2'], sun: '#ffffff', land: ['#86b86e', '#4a8648'], far: '#7a9ab0' },
  fantasy: { sky: ['#2c1f5e', '#8a5ac8'], sun: '#ffe9a8', land: ['#4f9a86', '#244f58'], far: '#5a4a9a', stars: 1 },
  coast: { sky: ['#e2f4fb', '#8ccbea'], sun: '#ffffff', land: ['#5aaed4', '#286a9a'], far: '#9ac8d8', sea: 1 },
  mountain: { sky: ['#e6f2f2', '#a6cdd6'], sun: '#ffffff', land: ['#76a862', '#386a3a'], far: '#7d9a92' },
  desert: { sky: ['#feeac0', '#f2ab68'], sun: '#fff1c8', land: ['#dcaa6a', '#a86c3c'], far: '#c48a5a' },
};

// 回傳一個印章的 SVG；got = 已蓋章；n = 打完的次數（決定等級）
export function stampSvg(c, got, rot = 0, n = 1) {
  const tier = got ? stampTier(n) : 0;
  const ink = got ? STAMP_INK[c.group] || '#8a3a2a' : '#bdb49e';
  const id = 'st' + PFX + (++uid);
  const motif = (M[c.id] || (() => flag(50, 58, 24)))();
  const en = String(c.en || '').toUpperCase().replace(/GOLF|COUNTRY|CLUB|&|\./g, '').replace(/\s+/g, ' ').trim().slice(0, 26);
  const name = c.name.length > 4 ? c.name.slice(0, 4) : c.name;
  const ringText = (fill, r = 41) => `<path id="${id}a" d="M60 60 m-${r} 0 a${r} ${r} 0 1 1 ${r * 2} 0" fill="none" stroke="none"/>
      <text font-size="${Math.min(9.6, Math.PI * r * 0.92 / (en.length * 0.62 + 0.1)).toFixed(2)}" font-weight="700" letter-spacing="${en.length > 20 ? 0.8 : 1.4}" font-family="Barlow Condensed, sans-serif" fill="${fill}" stroke="none"><textPath href="#${id}a" startOffset="50%" text-anchor="middle">${en}</textPath></text>`;
  const motifG = (fill, stroke, extra = '') => `<g transform="translate(12.5 9) scale(0.95)" fill="${fill}" stroke="${stroke}" stroke-linecap="round" stroke-linejoin="round" ${extra}>${motif}</g>`;

  // ---- 墨印 / 銅印：蓋上去的墨水章（斑駁），銅印多了淡色底、銅色外圈與小珠 ----
  if (tier <= 1) {
    const bronze = tier === 1;
    return `<svg class="stamp-svg t${tier}" viewBox="0 0 120 120" style="transform:rotate(${rot}deg)">
    <defs>
      ${got ? `<filter id="${id}f"><feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed="${(c.id.length * 7) % 50}"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${bronze ? -0.35 : -0.55} 1.3"/><feComposite in="SourceGraphic" operator="in"/></filter>` : ''}
      ${bronze ? `<linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e2b07a"/><stop offset=".5" stop-color="#a8662e"/><stop offset="1" stop-color="#d89a5e"/></linearGradient>` : ''}
    </defs>
    ${bronze ? `<circle cx="60" cy="60" r="57" fill="url(#${id}b)" opacity="0.35"/><circle cx="60" cy="60" r="49" fill="${ink}" opacity="0.2"/>` : ''}
    <g fill="${ink}" stroke="${ink}" ${got ? `filter="url(#${id}f)"` : 'opacity="0.75"'}>
      <circle cx="60" cy="60" r="55" fill="none" stroke-width="${got ? 3.2 : 1.6}" ${got ? '' : 'stroke-dasharray="4 4"'}/>
      <circle cx="60" cy="60" r="50" fill="none" stroke-width="1"/>
      ${ringText(ink)}
      <path d="M14 66 l2 -2 2 2 -2 2z M102 66 l2 -2 2 2 -2 2z" stroke="none"/>
      ${motifG(ink, ink)}
      <rect x="${60 - name.length * 7 - 6}" y="92" width="${name.length * 14 + 12}" height="17" rx="2" fill="${got ? ink : 'none'}" stroke-width="1.2"/>
      <text x="60" y="105" font-size="12.5" font-weight="700" text-anchor="middle" font-family="Noto Serif TC, serif" stroke="none" fill="${got ? '#fffdf7' : ink}" letter-spacing="1">${name}</text>
    </g>
    ${bronze ? `<circle cx="60" cy="60" r="57.5" fill="none" stroke="url(#${id}b)" stroke-width="3.6"/>
      ${[...Array(24)].map((_, k) => { const a = k / 24 * Math.PI * 2; return `<circle cx="${(60 + Math.cos(a) * 52.5).toFixed(1)}" cy="${(60 + Math.sin(a) * 52.5).toFixed(1)}" r="1.3" fill="#b8763a"/>`; }).join('')}` : ''}
  </svg>`;
  }

  // ---- 銀章 / 金章：金屬外框、裡面是彩色的實景小畫，圖案是有陰影的剪影 ----
  const gold = tier === 3, sc = SCENE[c.group] || SCENE.taiwan;
  const metal = gold ? ['#fff3b8', '#e0a832', '#8a5a12', '#f6d26a'] : ['#ffffff', '#c9ced4', '#7e868e', '#eef1f4'];
  const textCol = gold ? '#5a3a08' : '#3a4048';
  const rays = gold ? [...Array(16)].map((_, k) => { const a = k / 16 * Math.PI * 2; return `<path d="M${60 + Math.cos(a - 0.09) * 6} ${44 + Math.sin(a - 0.09) * 6} L${60 + Math.cos(a) * 60} ${44 + Math.sin(a) * 60} L${60 + Math.cos(a + 0.09) * 6} ${44 + Math.sin(a + 0.09) * 6}z"/>`; }).join('') : '';
  const teeth = gold ? (() => { let d = ''; for (let k = 0; k < 48; k++) { const a = k / 48 * Math.PI * 2, r = k % 2 ? 54.5 : 59; d += `${k ? 'L' : 'M'}${(60 + Math.cos(a) * r).toFixed(2)} ${(60 + Math.sin(a) * r).toFixed(2)}`; } return d + 'z'; })() : '';
  // 月桂葉：沿著下半圈兩側各一串
  const laurel = gold ? [-1, 1].map(sd => [...Array(7)].map((_, k) => { const a = (sd > 0 ? 25 : 155) + sd * k * 9.5, r = a * Math.PI / 180, x = 60 + Math.cos(r) * 48, y = 60 + Math.sin(r) * 48;
    return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="4.2" ry="1.7" transform="rotate(${(a + sd * 55).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`; }).join('')).join('') : '';
  const stars = sc.stars || gold ? [[30, 30], [84, 26], [74, 40], [40, 22], [92, 46]].map(([x, y], k) => gold && !sc.stars
    ? `<path d="M${x} ${y - 3}L${x + 0.8} ${y - 0.8}L${x + 3} ${y}L${x + 0.8} ${y + 0.8}L${x} ${y + 3}L${x - 0.8} ${y + 0.8}L${x - 3} ${y}L${x - 0.8} ${y - 0.8}z" fill="#fff" opacity="${0.75 - k * 0.1}"/>`
    : `<circle cx="${x}" cy="${y}" r="${0.9 - k * 0.1}" fill="#fff"/>`).join('') : '';
  const plateW = name.length * 14 + 14;
  const plate = gold
    ? `<path d="M${60 - plateW / 2 - 9} 95 l7 0 0 13 -7 0 4 -6.5z M${60 + plateW / 2 + 9} 95 l-7 0 0 13 7 0 -4 -6.5z" fill="#8a1c22"/>
       <rect x="${60 - plateW / 2 - 2}" y="91" width="${plateW + 4}" height="18" rx="1.5" fill="#b3262b" stroke="url(#${id}m)" stroke-width="1.4"/>`
    : `<rect x="${60 - plateW / 2}" y="92" width="${plateW}" height="17" rx="3" fill="${ink}" stroke="url(#${id}m)" stroke-width="1.2"/>`;
  return `<svg class="stamp-svg t${tier}" viewBox="0 0 120 120" style="transform:rotate(${rot}deg)">
    <defs>
      <linearGradient id="${id}m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${metal[0]}"/><stop offset=".35" stop-color="${metal[1]}"/><stop offset=".7" stop-color="${metal[2]}"/><stop offset="1" stop-color="${metal[3]}"/></linearGradient>
      <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sc.sky[1]}"/><stop offset="1" stop-color="${sc.sky[0]}"/></linearGradient>
      <linearGradient id="${id}l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sc.land[0]}"/><stop offset="1" stop-color="${sc.land[1]}"/></linearGradient>
      <radialGradient id="${id}g" cx="60" cy="44" r="30" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${sc.sun}" stop-opacity=".95"/><stop offset="1" stop-color="${sc.sun}" stop-opacity="0"/></radialGradient>
      <linearGradient id="${id}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <clipPath id="${id}c"><circle cx="60" cy="60" r="45.5"/></clipPath>
      <filter id="${id}d" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0.8" dy="1.4" stdDeviation="1" flood-color="#000" flood-opacity=".45"/></filter>
    </defs>
    <circle cx="60" cy="61.5" r="58" fill="#000" opacity=".18"/>
    ${gold ? `<path d="${teeth}" fill="url(#${id}m)"/>` : `<circle cx="60" cy="60" r="57" fill="url(#${id}m)"/>`}
    <circle cx="60" cy="60" r="${gold ? 53 : 54}" fill="none" stroke="${metal[2]}" stroke-width="0.8" opacity=".7"/>
    <circle cx="60" cy="60" r="47" fill="${metal[2]}"/>
    <g clip-path="url(#${id}c)">
      <rect x="10" y="10" width="100" height="100" fill="url(#${id}s)"/>
      <circle cx="60" cy="44" r="30" fill="url(#${id}g)"/>
      ${gold ? `<g fill="${sc.sun}" opacity=".22">${rays}</g>` : ''}
      ${stars}
      <path d="M10 72 Q30 60 46 66 T80 62 T110 68 V110 H10z" fill="${sc.far}" opacity=".55"/>
      <path d="M10 76 Q40 68 60 72 T110 72 V110 H10z" fill="url(#${id}l)"/>
      ${sc.sea ? `<path d="M10 82 q8 -2 16 0 t16 0 t16 0 t16 0 t16 0 t16 0" fill="none" stroke="#fff" stroke-width="1" opacity=".6"/>` : ''}
      ${motifG(gold ? '#2a1d10' : '#1f2a2c', gold ? '#2a1d10' : '#1f2a2c', `filter="url(#${id}d)"`)}
      <ellipse cx="60" cy="34" rx="44" ry="22" fill="url(#${id}h)"/>
    </g>
    <circle cx="60" cy="60" r="45.5" fill="none" stroke="${metal[0]}" stroke-width="1.2" opacity=".8"/>
    ${ringText(textCol, 50.5)}
    ${gold ? `<g fill="#3f7a2e" stroke="#1f4a18" stroke-width="0.3">${laurel}</g>` : ''}
    ${plate}
    <text x="60" y="${gold ? 104.5 : 105}" font-size="12.5" font-weight="700" text-anchor="middle" font-family="Noto Serif TC, serif" fill="${gold ? '#fff3c8' : '#fffdf7'}" letter-spacing="1">${name}</text>
    <path d="M24 28 A46 46 0 0 1 72 13" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".55"/>
  </svg>`;
}
