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
  orient: () => hill('C34 48 42 44 50 50 C58 44 68 48') + `<ellipse cx="50" cy="66" rx="20" ry="3.5" fill="none" stroke-width="1.6"/>` + flag(52, 50) + bird(36, 32) + bird(62, 28, 0.8),
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
};

// 墨水色：依球場群組
export const STAMP_INK = { taiwan: '#a3302a', abroad: '#2a4a7a', fantasy: '#5a3aa8', coast: '#1f6a8a', mountain: '#2f6a3a', desert: '#a8682a' };

let uid = 0;
const PFX = Math.random().toString(36).slice(2, 6);      // 每個印章的 defs 編號不重複
// 回傳一個印章的 SVG；got = 已蓋章（墨水色、略為傾斜、斑駁），否則是淡灰色的虛線輪廓
export function stampSvg(c, got, rot = 0) {
  const ink = got ? STAMP_INK[c.group] || '#8a3a2a' : '#bdb49e';
  const id = 'st' + PFX + (++uid);
  const motif = (M[c.id] || (() => flag(50, 58, 24)))();
  const en = String(c.en || '').toUpperCase().replace(/GOLF|COUNTRY|CLUB|&|\./g, '').replace(/\s+/g, ' ').trim();
  const name = c.name.length > 4 ? c.name.slice(0, 4) : c.name;
  return `<svg class="stamp-svg" viewBox="0 0 120 120" style="transform:rotate(${rot}deg)">
    <defs>
      <path id="${id}a" d="M60 60 m-41 0 a41 41 0 1 1 82 0"/>
      ${got ? `<filter id="${id}f"><feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed="${(c.id.length * 7) % 50}"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.55 1.3"/><feComposite in="SourceGraphic" operator="in"/></filter>` : ''}
    </defs>
    <g fill="${ink}" stroke="${ink}" ${got ? `filter="url(#${id}f)"` : 'opacity="0.75"'}>
      <circle cx="60" cy="60" r="55" fill="none" stroke-width="${got ? 3.2 : 1.6}" ${got ? '' : 'stroke-dasharray="4 4"'}/>
      <circle cx="60" cy="60" r="50" fill="none" stroke-width="1"/>
      
      <text font-size="9.6" font-weight="700" letter-spacing="1.4" font-family="Barlow Condensed, sans-serif" stroke="none"><textPath href="#${id}a" startOffset="50%" text-anchor="middle">${en.slice(0, 26)}</textPath></text>
      <path d="M14 66 l2 -2 2 2 -2 2z M102 66 l2 -2 2 2 -2 2z" stroke="none"/>
      <g transform="translate(12.5 9) scale(0.95)" stroke-linecap="round" stroke-linejoin="round">${motif}</g>
      <rect x="${60 - name.length * 7 - 6}" y="92" width="${name.length * 14 + 12}" height="17" rx="2" fill="${got ? ink : 'none'}" stroke-width="1.2"/>
      <text x="60" y="105" font-size="12.5" font-weight="700" text-anchor="middle" font-family="Noto Serif TC, serif" stroke="none" fill="${got ? '#fffdf7' : ink}" letter-spacing="1">${name}</text>
    </g>
  </svg>`;
}
