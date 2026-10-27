// 挑戰模式第 301~500 關：10 章、每章 20 關（第 20 關是頭目關），用固定種子產生，每次載入都一樣。
// 跟前面不重複：每一章有自己的招牌玩法，也用了新的條件——寶刀切到旗邊、限定幾支球桿、不准用一號木、開球不能太遠（要放短）、
//   滯空時間、整洞不碰任何機關、指定最後一桿的球桿……。越後面數字越嚴格、桿數上限越緊。
// 可行性（素質中等～加滿）：一號木平均約 250~300 碼、110% 最多約 330 碼；一號木滯空約 6.5~9 秒；寶刀切滾 5~50 碼。
const R = (at, h = 12, lat = 0) => ({ kind: 'ring', at, h, lat });
const O = (at, h = 6, lat = 0) => ({ kind: 'orb', at, h, lat });

export const CHAPTERS_3 = [
  { name: '寶刀道場', en: 'Chipper Dojo', themes: ['sakura', 'autumn', 'sakura'], kinds: ['chipNear', 'chipOnly', 'chipNear', 'chipIn', 'chipOnly', 'layup'] },
  { name: '單桿修行', en: 'Path of One Club', themes: ['tulip', 'lavender', 'tulip'], kinds: ['fewClubs', 'noDriver', 'lastWedge', 'fewClubs', 'layup', 'noDriver'] },
  { name: '滯空藝術', en: 'Art of Hang Time', themes: ['sky', 'storm', 'sky'], kinds: ['hang', 'hang', 'lob', 'hangGap', 'lob', 'fewClubs'] },
  { name: '迷宮花園', en: 'Mirror Maze', themes: ['crystal', 'haunt', 'crystal'], kinds: ['maze', 'maze', 'gearRun', 'noTouch', 'maze', 'lastWedge'] },
  { name: '星際彈珠台', en: 'Cosmic Pinball', themes: ['neon', 'toy', 'neon'], kinds: ['pinball', 'pinball', 'bounceChain', 'pinball', 'boostRun', 'noTouch'] },
  { name: '時空裂縫', en: 'Rift of Time', themes: ['void', 'city', 'void'], kinds: ['riftChain', 'riftFew', 'hangGap', 'riftChain', 'noTouch', 'riftFew'] },
  { name: '風暴之眼', en: 'Eye of the Storm', themes: ['storm', 'tulip', 'storm'], kinds: ['gale', 'galeCloud', 'gale', 'layup', 'galeCloud', 'fewClubs'] },
  { name: '黃金獵人', en: 'Gold Hunter', themes: ['egypt', 'reef', 'egypt'], kinds: ['hunt', 'huntFew', 'hunt', 'huntNoDriver', 'hunt', 'chipNear'] },
  { name: '極限混合', en: 'Extreme Mix', themes: ['lava', 'mars', 'jungle', 'moon'], kinds: ['chipNear', 'fewClubs', 'hang', 'maze', 'pinball', 'riftChain', 'gale', 'hunt', 'noTouch', 'layup', 'lastWedge', 'bounceChain'] },
  { name: '傳說之巔', en: 'Summit of Legends', themes: ['void', 'crystal', 'lava', 'sky', 'storm'], kinds: ['chipIn', 'galeCloud', 'huntFew', 'riftFew', 'hangGap', 'noTouch', 'pinball', 'maze', 'noDriver', 'lob'] },
];
const PLACE = {
  sakura: ['櫻吹雪', '花見', '枯山水', '竹林', '禪院'], autumn: ['楓紅', '落葉', '秋山', '紅葉', '金黃'], tulip: ['風車', '花田', '運河', '鬱金香', '堤防'],
  lavender: ['薰衣草', '紫色', '普羅旺斯', '花海', '香草'], sky: ['雲端', '天空', '雲海', '晴空', '彩霞'], storm: ['雷鳴', '風暴', '烏雲', '閃電', '高原'],
  crystal: ['水晶', '稜鏡', '晶洞', '紫晶', '光脈'], haunt: ['古堡', '墓園', '幽光', '鬼火', '夜霧'], neon: ['霓虹', '電光', '夜城', '雷射', '電子'],
  toy: ['積木', '玩具', '發條', '彩球', '樂高'], void: ['虛空', '星環', '暗域', '星塵', '深空'], city: ['天台', '大樓', '霓虹街', '摩天', '高架'],
  egypt: ['法老', '金字塔', '尼羅', '人面獅身', '太陽神'], reef: ['珊瑚', '海葵', '深海', '海龜', '珍珠'], lava: ['熔岩', '火山', '地心', '烈焰', '岩漿'],
  mars: ['火星', '紅沙', '峽谷', '沙塵', '赤土'], jungle: ['雨林', '藤蔓', '翡翠', '瀑布', '叢林'], moon: ['月面', '隕石', '環形山', '月海', '寧靜'],
};
const WATER = { sakura: '錦鯉池', autumn: '山溪', tulip: '運河', lavender: '水渠', sky: '雲海', storm: '雨水溝', crystal: '地下湖', haunt: '護城河', neon: '電光池',
  toy: '彩色泳池', void: '虛空', city: '運河', egypt: '尼羅河', reef: '深海溝', lava: '熔岩', mars: '裂谷', jungle: '溪流', moon: '隕石坑' };
const MOOD = {
  sakura: '櫻花飄落的禪寺庭園', autumn: '楓葉染紅的山谷', tulip: '風車轉動的花田', lavender: '紫色花海的山丘', sky: '漂在雲海上的島嶼', storm: '雷聲不斷的高原',
  crystal: '發光的水晶洞窟', haunt: '月光下的幽靈古堡', neon: '霓虹閃爍的夜城', toy: '積木堆成的玩具城', void: '星空中漂浮的浮島', city: '摩天大樓的屋頂',
  egypt: '黃沙中的法老神殿', reef: '海底的珊瑚礁', lava: '岩漿翻滾的火山地心', mars: '紅色的火星峽谷', jungle: '藤蔓垂掛的雨林', moon: '空氣稀薄的月面基地',
};
const VOIDISH = t => t === 'sky' || t === 'void' || t === 'city';
// 玩法：標題用字、英文
const KINDS = {
  chipNear: { w: ['寸止', '貼旗', '一寸', '居合'], en: 'Chip Close' }, chipOnly: { w: ['刀與鐵', '雙刀流', '短兵', '二刀'], en: 'Blade Duo' },
  chipIn: { w: ['一刀斬', '拔刀', '入魂', '收刀'], en: 'Blade In' }, layup: { w: ['放短', '止步', '收力', '忍耐'], en: 'Lay Up' },
  fewClubs: { w: ['三桿行', '輕裝', '極簡', '少即是多'], en: 'Few Clubs' }, noDriver: { w: ['封印', '無木', '鐵之道', '克己'], en: 'No Driver' },
  lastWedge: { w: ['收尾', '挖起', '一挖', '終式'], en: 'Wedge Finish' }, hang: { w: ['滯空', '懸浮', '長空', '浮雲'], en: 'Hang Time' },
  hangGap: { w: ['飛渡', '雲橋', '長虹', '天塹'], en: 'Sky Bridge' }, lob: { w: ['天井', '高塔', '深井', '仰望'], en: 'Sky Well' },
  maze: { w: ['迷宮', '鏡廊', '回音', '折光'], en: 'Maze' }, gearRun: { w: ['齒輪道', '轉角', '機關廊', '迴轉'], en: 'Gear Run' },
  noTouch: { w: ['無觸', '靜默', '禁區', '閃避'], en: 'No Touch' }, pinball: { w: ['彈珠台', '撞球', '彈彈樂', '彈珠'], en: 'Pinball' },
  bounceChain: { w: ['連彈', '跳跳', '彈簧', '蹦蹦'], en: 'Bounce Chain' }, boostRun: { w: ['疾走', '光速', '跑道', '加速'], en: 'Boost Run' },
  riftChain: { w: ['連環門', '時空鏈', '穿梭', '跳躍'], en: 'Rift Chain' }, riftFew: { w: ['時空刃', '裂隙', '異界', '斷層'], en: 'Rift Blade' },
  gale: { w: ['颶風', '狂風', '風眼', '強風'], en: 'Gale' }, galeCloud: { w: ['雷暴', '電閃', '烏雲', '雷雲'], en: 'Thunder Gale' },
  hunt: { w: ['尋寶', '金球', '寶藏', '獵金'], en: 'Gold Hunt' }, huntFew: { w: ['輕裝尋寶', '寶匣', '秘寶', '藏寶'], en: 'Light Hunt' },
  huntNoDriver: { w: ['盜墓', '探險', '密室', '寶窟'], en: 'Tomb Raid' }, boss: { w: ['王座', '試煉', '守護者', '傳說'], en: 'Throne' },
};
const MECH = [
  { feat: 'hy', kind: 'honey', name: '蜂蜜池' }, { feat: 'gr', kind: 'gear', name: '轉向齒輪' }, { feat: 'ws', kind: 'wisp', name: '引魂燈' },
  { feat: 'bp', kind: 'bumper', name: '彈珠柱' }, { feat: 'cl', kind: 'cloud', name: '雷雲' },
];
const WEDGES = ['PW', 'GW', 'SW', 'LW'];

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const cap = s => s[0].toUpperCase() + s.slice(1);

export function genLevels3() {
  const out = [], used = new Set();
  CHAPTERS_3.forEach((ch, ci) => {
    for (let i = 0; i < 20; i++) {
      const n = 301 + ci * 20 + i, d = (n - 301) / 199, r = rng(n * 104729 + 77);
      const pick = a => a[Math.floor(r() * a.length)];
      const boss = i === 19;
      const theme = boss ? pick(ch.themes) : ch.themes[i % ch.themes.length];
      let kind;
      if (boss) kind = 'boss';
      else { const prev = out.length ? out[out.length - 1].kindKey : ''; do kind = pick(ch.kinds); while (kind === prev); }
      const lv = build(kind, theme, n, d, r, pick, ci);
      let title;
      for (let k = 0; k < 20; k++) { title = pick(PLACE[theme]) + pick(KINDS[kind].w); if (!used.has(title)) break; }
      if (used.has(title)) title += '・' + n;
      used.add(title);
      out.push({ ...lv, t: theme, title, en: `${cap(theme)} ${KINDS[kind].en} ${n}`, kindKey: kind });
    }
  });
  return out;
}

function build(kind, t, n, d, r, pick, ci) {
  const lerp = (a, b) => a + (b - a) * d, rnd = (a, b) => Math.round(a + (b - a) * r());
  const W = WATER[t] || '水', M = MOOD[t] || '';
  const slack = d < 0.3 ? 2 : 1;
  const underG = (par, k) => ({ t: 'strokes', v: par - k, text: k ? `${par - k} 桿以內進洞` : '標準桿以內' });
  let par, yards, bend = 0, feat = '', spec = {}, goals = [], intro = '', extra = {};
  switch (kind) {
    // ---------- 寶刀 ----------
    case 'chipNear': {
      // 三桿洞果嶺小、四周都是長草和緩坡：開球多半上不了，要用寶刀從果嶺外切到旗邊
      par = 3; yards = rnd(150, 190); const v = Math.round(lerp(4, 2) * 2) / 2;
      spec = { green: { size: [Math.round(lerp(22, 17)), Math.round(lerp(26, 20))], slope: lerp(0.015, 0.025) }, bunkers: [{ g: 'BL' }, { g: 'BR' }] };
      extra.c = { stimp: 9 };
      goals = [{ t: 'clubNear', club: 'CH', v, min: 8, text: `用寶刀從 8 碼外切到旗桿 ${v} 碼內` }, underG(par, 0)];
      intro = `${M}。小小的果嶺浮在長草中間，開球就算沒上，寶刀切滾也能救回來。`;
      break;
    }
    case 'chipOnly': {
      par = 3; yards = rnd(120, 150); extra.clubs = pick([['7I', 'CH', 'PT'], ['8I', 'CH', 'PT'], ['9I', 'CH', 'PT']]);
      spec = { green: { size: [24, 28], slope: 0.02 }, bunkers: [{ g: 'F' }] };
      goals = [{ t: 'useClub', club: 'CH', text: '這一洞至少用一次寶刀' }, d > 0.5 ? { t: 'noPutt', text: '不用推桿進洞' } : underG(par, 0)];
      intro = `只能用${extra.clubs[0].replace('I', ' 號鐵')}、寶刀和推桿。${M}裡的 ${yards} 碼三桿洞。`;
      break;
    }
    case 'chipIn': {
      par = 4; yards = rnd(300, 340); const v = Math.round(lerp(4, 8));
      spec = { green: { size: [30, 34], slope: 0.012 }, bunkers: [{ g: 'BL' }] };
      goals = [{ t: 'lastClub', clubs: ['CH'], text: '最後一桿用寶刀打進洞' }, { t: 'clubNear', club: 'CH', v, min: 5, text: `寶刀從 5 碼外切到旗桿 ${v} 碼內` }];
      intro = `${M}。短四桿洞，第二桿故意停在果嶺邊，用寶刀一刀收尾。`;
      break;
    }
    case 'layup': {
      // 水橫在開球落點：開球要放短，第二桿再越過去
      par = 4; yards = rnd(360, 400); const at = Math.round(lerp(215, 235)), lim = at - 15;
      spec = { water: [{ from: at, to: at + 45, side: 'C', w: 90 }], bunkers: [{ g: 'FR' }] };
      goals = [{ t: 'teeMax', v: lim, text: `開球不超過 ${lim} 碼（不要飛進${W}）` }, { t: 'greenIn', v: 2, text: '兩桿內上果嶺' }];
      intro = `${M}。${at} 碼處橫著一條${W}，開球太遠就會落進去，忍住別用全力。`;
      break;
    }
    // ---------- 限定球桿 ----------
    case 'fewClubs': {
      par = 4; yards = rnd(340, 390); const v = d > 0.5 ? 2 : 3; bend = rnd(-25, 25);
      spec = { bendAt: Math.round(yards * 0.55), bunkers: [{ at: Math.round(yards * 0.55), side: bend > 0 ? 'R' : 'L' }, { g: 'FL' }] };
      goals = [{ t: 'clubCount', v, text: `整洞只用 ${v} 支以內的球桿（推桿也算）` }, underG(par, 0)];
      intro = `${M}。行李箱只帶 ${v} 支球桿，要怎麼搭配自己決定。`;
      break;
    }
    case 'noDriver': {
      par = 4; yards = Math.round(lerp(390, 430)); feat = 'nw';
      spec = { bunkers: [{ at: 240, side: 'L' }, { at: 260, side: 'R' }, { g: 'F' }] };
      goals = [{ t: 'notClub', club: 'D', text: '整洞不准用一號木' }, d > 0.4 ? underG(par, 0) : { t: 'greenIn', v: 3, text: '三桿內上果嶺' }];
      intro = `${M}。窄窄的長四桿洞，一號木被封印了，用球道木和鐵桿一步一步推進。`;
      break;
    }
    case 'lastWedge': {
      par = 4; yards = rnd(330, 380);
      spec = { water: [{ g: 'F' }], green: { size: [26, 30] }, bunkers: [{ g: 'BL' }, { g: 'BR' }] };
      goals = [{ t: 'greenIn', v: 2, text: '兩桿內上果嶺' }, { t: 'lastNonPutt', clubs: WEDGES, text: '上果嶺的那一桿用挖起桿（PW / GW / SW / LW）' }];
      intro = `${M}。果嶺前是${W}，第二桿要用挖起桿高高拋上果嶺。`;
      break;
    }
    // ---------- 滯空 ----------
    case 'hang': {
      par = pick([4, 5]); yards = par === 4 ? rnd(400, 440) : rnd(540, 600); const v = Math.round(lerp(6, 7.5) * 10) / 10;
      spec = { bunkers: [{ g: 'FL' }, { g: 'FR' }] };
      goals = [{ t: 'airTime', v, text: `有一桿在空中飛 ${v} 秒以上` }, { t: 'greenIn', v: par - 2, text: `${par - 2} 桿內上果嶺` }];
      intro = `${M}。比的不是距離，是球在天上停多久——打高、打遠，讓它慢慢飛。`;
      break;
    }
    case 'hangGap': {
      par = 4; yards = rnd(380, 420); const v = Math.round(lerp(6, 7.2) * 10) / 10;
      if (VOIDISH(t)) spec = { gaps: [{ at: Math.round(yards * 0.33), half: 12 }, { at: Math.round(yards * 0.7), half: 11 }] };
      else spec = { water: [{ from: 60, to: Math.round(yards * 0.5), side: 'C', w: 70 }] };
      goals = [{ t: 'airTime', v, text: `開球在空中飛 ${v} 秒以上` }, { t: 'noHazard', text: `一次都沒掉進${W}` }];
      intro = `${M}。開球要飛越${W}，飛得越久越安全。`;
      break;
    }
    case 'lob': {
      par = 3; yards = rnd(110, 150); feat = 'tr nw'; extra.c = { trees: 1.5 };
      const v = Math.round(lerp(16, 22));      // 素質 50 的劈起桿～9 鐵全揮最高點約 16~17 公尺、超揮約 20
      spec = { green: { size: [22, 26] }, bunkers: [{ g: 'F' }, { g: 'B' }] };
      goals = [{ t: 'apex', v, text: `開球最高點 ${v} 公尺以上` }, { t: 'teeNear', v: Math.round(lerp(8, 4)), text: `開球停在旗桿 ${Math.round(lerp(8, 4))} 碼內` }];
      intro = `${M}。果嶺在一口「天井」的底部，四周高樹圍繞，只能從正上方掉進去。`;
      break;
    }
    // ---------- 迷宮 ----------
    case 'maze': {
      par = 4; yards = rnd(380, 420); bend = pick([-1, 1]) * rnd(45, 65); const s = Math.sign(bend);
      spec = { bendAt: 210, specials: [{ kind: 'wall', at: 150, lat: -s * 18, len: 30, ang: s * 20 }, { kind: 'wall', at: 225, lat: -s * 26, len: 46, ang: s * 35 }, { kind: 'wall', at: 300, lat: s * 20, len: 36 }, { kind: 'wall', at: 340, lat: -s * 16, len: 26, ang: -s * 15 }], bunkers: [{ g: 'FR' }] };
      const v = d > 0.5 ? 2 : 1;
      goals = [{ t: 'fx', kind: 'wall', v, text: `撞${t === 'crystal' ? '水晶' : '鏡'}牆反彈 ${v} 次以上` }, { t: 'fairwayAll', text: '每一桿都停在球道或果嶺' }];
      intro = `${M}。${Math.abs(bend)} 度的急彎裡立著四道反彈牆，像一座迷宮。`;
      break;
    }
    case 'gearRun': {
      par = 5; yards = rnd(520, 580); feat = 'gr'; bend = pick([-1, 1]) * rnd(30, 45);
      spec = { bendAt: Math.round(yards * 0.5), bunkers: [{ g: 'FL' }] };
      goals = [{ t: 'fx', kind: 'gear', v: 2, text: '被齒輪甩出去 2 次以上' }, { t: 'greenIn', v: 3, text: '三桿內上果嶺' }];
      intro = `${M}。轉角和球道上鋪滿轉向齒輪，借齒輪轉彎才是捷徑。`;
      break;
    }
    case 'noTouch': {
      const m = pick(MECH.filter(x => x.kind !== 'honey')); par = 4; yards = rnd(370, 410); feat = m.feat + (VOIDISH(t) ? '' : ' wl');
      spec = { specials: [{ kind: 'tramp', at: 200, lat: rnd(-6, 6) }, { kind: 'boost', at: 250, lat: 0 }, R(Math.round(yards * 0.5), 14)], bunkers: [{ g: 'FL' }] };
      goals = [{ t: 'avoidAll', text: '整洞一次都沒碰到任何機關' }, underG(par, 0)];
      intro = `${M}。彈跳床、加速帶、光環和${m.name}擋在每條路線上——這一洞一個都不准碰。`;
      break;
    }
    // ---------- 彈珠台 ----------
    case 'pinball': {
      par = 4; yards = rnd(360, 400); feat = 'bp';
      spec = { specials: [{ kind: 'tramp', at: 180, lat: -6 }, { kind: 'tramp', at: 230, lat: 7 }, { kind: 'boost', at: 280, lat: 0 }, { kind: 'tramp', at: yards - 24, lat: 0, r: 5 }], bunkers: [{ g: 'BR' }] };
      const v = Math.round(lerp(3, 5));
      goals = [{ t: 'fxTotal', v, text: `觸發機關合計 ${v} 次以上` }, { t: 'greenIn', v: 2, text: '兩桿內上果嶺' }];
      intro = `${M}變成一台巨大的彈珠台：彈珠柱、彈跳床、加速帶，彈得越多越好。`;
      break;
    }
    case 'bounceChain': {
      par = 4; yards = rnd(340, 380); const sh = t === 'jungle' || r() < 0.4, kd = sh ? 'shroom' : 'tramp';
      spec = { specials: [{ kind: kd, at: 170, lat: 0, h: 4 }, { kind: kd, at: 200, lat: 0, h: 5 }, { kind: kd, at: 230, lat: 0, h: 4 }, { kind: kd, at: yards - 26, lat: 0, h: 3, r: 5 }] };
      goals = [{ t: 'fxOne', kind: kd, v: 2, text: `同一桿${sh ? '被巨菇' : '在彈跳床上'}彈 2 次以上` }, { t: 'fxGreen', kind: kd, text: `${sh ? '被巨菇' : '彈跳床'}彈起的那一桿停上果嶺` }];
      intro = `${M}。落點區三${sh ? '朵巨菇' : '張彈跳床'}排成一列，果嶺前還有一${sh ? '朵' : '張'}，一路彈過去。`;
      break;
    }
    case 'boostRun': {
      par = 5; yards = rnd(520, 560);
      spec = { specials: [{ kind: 'boost', at: 230, lat: 0 }, { kind: 'boost', at: 300, lat: 0 }, { kind: 'boost', at: 380, lat: 0 }], bunkers: [{ g: 'FL' }, { g: 'FR' }] };
      if (r() < 0.5) feat = 'xc';
      goals = [{ t: 'fx', kind: 'boost', v: 2, text: '經過加速帶 2 次以上' }, { t: 'greenIn', v: 2, text: '兩桿內上果嶺（五桿洞！）' }];
      intro = `${M}。球道中間鋪了三段加速帶，貼地滾過去能多跑好幾十碼，五桿洞兩桿上果嶺不是夢。`;
      break;
    }
    // ---------- 時空裂縫 ----------
    case 'riftChain': {
      par = 5; yards = rnd(600, 660);
      spec = { specials: [{ kind: 'portal', at: 110, h: 5.5, exitAt: Math.round(yards * 0.45) }, { kind: 'portal', at: Math.round(yards * 0.55), h: 5.5, exitAt: yards - 45 }] };
      if (VOIDISH(t)) spec.gaps = [{ at: Math.round(yards * 0.3), half: 12 }, { at: Math.round(yards * 0.75), half: 12 }]; else spec.water = [{ from: Math.round(yards * 0.25), to: Math.round(yards * 0.4), side: 'C', w: 80 }];
      goals = [{ t: 'fx', kind: 'portal', v: 2, text: '穿過兩座星門' }, { t: 'clubCount', v: 3, text: '整洞只用 3 支以內的球桿' }];
      intro = `${M}。兩座星門串成時空鏈：穿過第一座、落地再打進第二座，就到果嶺前。`;
      break;
    }
    case 'riftFew': {
      par = 4; yards = rnd(400, 440);
      spec = { specials: [{ kind: 'portal', at: rnd(100, 130), h: 5.5, exitAt: yards - 60 }] };
      if (VOIDISH(t)) spec.gaps = [{ at: Math.round(yards * 0.5), half: 14 }]; else spec.water = [{ from: Math.round(yards * 0.4), to: Math.round(yards * 0.65), side: 'C', w: 80 }];
      goals = [{ t: 'notClub', club: 'D', text: '整洞不准用一號木' }, underG(par, 1)];
      intro = `${M}。不能用一號木，但星門就在不遠處——用低平的鐵桿球穿過去。`;
      break;
    }
    // ---------- 風暴 ----------
    case 'gale': {
      par = pick([3, 4]); yards = par === 3 ? rnd(160, 200) : rnd(370, 410);
      extra.wind = { mph: Math.round(lerp(15, 20)), from: pick(['L', 'R', 'H']) };
      feat = extra.wind.from === 'L' ? 'wr' : extra.wind.from === 'R' ? 'wl' : '';
      spec = { bunkers: [{ g: 'FL' }, { g: 'FR' }] };
      goals = [{ t: 'noHazard', text: '一次都沒失誤' }, par === 3 ? { t: 'teeNear', v: Math.round(lerp(12, 7)), text: `開球停在旗桿 ${Math.round(lerp(12, 7))} 碼內` } : { t: 'fairwayAll', text: '每一桿都停在球道或果嶺' }];
      intro = `${M}，${extra.wind.mph} mph 的${{ L: '左側風', R: '右側風', H: '逆風' }[extra.wind.from]}幾乎要把人吹倒${feat ? `，下風處是${W}` : ''}。`;
      break;
    }
    case 'galeCloud': {
      par = 4; yards = rnd(380, 420); feat = 'cl';
      extra.wind = { mph: Math.round(lerp(12, 18)), from: pick(['L', 'R', 'H', 'T']) };
      spec = { bunkers: [{ g: 'FR' }] };
      goals = [{ t: 'avoid', kind: 'cloud', text: '一次都沒被雷打中' }, { t: 'greenIn', v: 2, text: '兩桿內上果嶺' }];
      intro = `${M}。${extra.wind.mph} mph 的${{ L: '左側風', R: '右側風', H: '逆風', T: '順風' }[extra.wind.from]}吹著低空的雷雲——打低平球從雲下面鑽過去。`;
      break;
    }
    // ---------- 黃金獵人 ----------
    case 'hunt': {
      par = 5; yards = rnd(540, 600); bend = rnd(-30, 30); const k = 4;
      spec = { bendAt: Math.round(yards * 0.5), specials: [O(rnd(120, 150), rnd(16, 22), -6), O(rnd(230, 270), rnd(4, 7), 8), O(rnd(340, 380), rnd(10, 14), -5), O(yards - rnd(60, 80), rnd(3, 5), 0)], bunkers: [{ g: 'FL' }] };
      goals = [{ t: 'orbs', v: d > 0.5 ? 4 : 3, text: d > 0.5 ? '4 顆金球全部收集' : '收集 3 顆金球' }, underG(par, 0)];
      intro = `${M}。${k} 顆金球藏在不同高度：一顆在高空、一顆貼著地面、一顆在轉角、最後一顆在果嶺前。`;
      break;
    }
    case 'huntFew': {
      par = 4; yards = rnd(370, 410);
      spec = { specials: [O(rnd(90, 110), rnd(10, 14), 0), O(rnd(200, 230), rnd(5, 8), rnd(-5, 5)), O(yards - 40, 4, 0)] };
      goals = [{ t: 'orbs', v: 3, text: '3 顆金球全部收集' }, { t: 'clubCount', v: 3, text: '整洞只用 3 支以內的球桿' }];
      intro = `${M}。三顆金球排成一線，但行李只能帶 3 支球桿。`;
      break;
    }
    case 'huntNoDriver': {
      par = 4; yards = rnd(380, 410); feat = 'nw';
      spec = { specials: [O(rnd(120, 140), rnd(8, 12), 0), O(rnd(230, 250), rnd(4, 6), 0)], bunkers: [{ g: 'F' }] };
      goals = [{ t: 'orbs', v: 2, text: '2 顆金球全部收集' }, { t: 'notClub', club: 'D', text: '整洞不准用一號木' }];
      intro = `${M}深處的密室，兩顆金球放在窄窄的通道上，一號木帶不進去。`;
      break;
    }
    case 'boss': {
      par = 5; yards = Math.round(lerp(580, 660)); bend = pick([-1, 1]) * 25;
      const specials = [O(150, 14, 0), O(Math.round(yards * 0.5), 6, -5), O(yards - 90, 4, 4)];
      const twist = ci % 5;
      if (twist === 0) specials.push({ kind: 'tramp', at: yards - 24, lat: 0, r: 5 });
      if (twist === 1) specials.push({ kind: 'boost', at: 280, lat: 0 });
      if (twist === 2) specials.push({ kind: 'portal', at: Math.round(yards * 0.4), h: 5.5, exitAt: yards - 70 });
      if (twist === 3) specials.push({ kind: 'wall', at: Math.round(yards * 0.5), lat: 26, len: 44, ang: -25 });
      if (twist === 4) specials.push(R(110, 15));
      spec = { bendAt: Math.round(yards * 0.5), specials };
      if (VOIDISH(t)) spec.gaps = [{ at: Math.round(yards * 0.3), half: 11 }]; else spec.water = [{ g: 'FR' }];
      const sub = [[{ t: 'orbs', v: 3 }, { t: 'clubCount', v: 4 }, '3 顆金球全部收集，而且只用 4 支以內的球桿'],
        [{ t: 'orbs', v: 3 }, { t: 'notClub', club: 'D' }, '3 顆金球全部收集，而且不用一號木'],
        [{ t: 'orbs', v: 3 }, { t: 'airTime', v: 6 }, '3 顆金球全部收集，而且有一桿飛 6 秒以上'],
        [{ t: 'orbs', v: 3 }, { t: 'fairwayAll' }, '3 顆金球全部收集，而且每一桿都停在球道或果嶺'],
        [{ t: 'orbs', v: 3 }, { t: 'useClub', club: 'CH' }, '3 顆金球全部收集，而且用過寶刀']][ci % 5];
      goals = [{ t: 'all', text: sub[2], sub: [sub[0], sub[1]] }, underG(par, d > 0.5 ? 1 : 0)];
      intro = `第 ${ci + 21} 章的頭目關：${M}的最後試煉，把這一章學到的全部用上。`;
      break;
    }
  }
  const max = par + (kind === 'boss' ? 1 : slack);
  return { hole: [par, yards, bend, feat, spec], max, goals, intro, ...(extra.c ? { c: extra.c } : {}), ...(extra.wind ? { wind: extra.wind } : {}), ...(extra.clubs ? { clubs: extra.clubs } : {}) };
}
