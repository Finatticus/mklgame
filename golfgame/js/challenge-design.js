// 挑戰模式全部 500 關（v109 重新設計）：用固定種子產生，每次載入都一樣
//   以前的光環、金球、滯空、彈跳、星門這類任務太抽象（玩家沒辦法控制球在空中經過哪裡），全部拿掉，球洞上也不再放空中的機關。
//   現在的條件都是真正打球會在意的事：桿數、不落水 / 不掉落 / 不 OB、不進沙坑、不進長草、開球上球道 / 上果嶺 / 靠近旗桿、
//   標準桿上果嶺、推桿次數、開球距離。難度靠球洞本身：越後面球道越窄、果嶺越小越快、水和沙坑越多、狗腿越急、風越大、桿數上限越緊。
//   章節：前 100 關每 10 關一章，101 關以後每 20 關一章；每一章最後一關是頭目關（更長、障礙更多、條件更嚴）。

export const CHAPTERS_ALL = [
  { name: '新手花園', themes: ['tulip', 'lavender', 'candy'] },
  { name: '楓紅山谷', themes: ['autumn', 'sakura', 'jungle'] },
  { name: '珊瑚海岸', themes: ['reef', 'tropical'] },
  { name: '沙漠神殿', themes: ['egypt', 'mars'] },
  { name: '迷霧沼澤', themes: ['swamp', 'dino', 'haunt'] },
  { name: '雲海天空', themes: ['sky', 'city'] },
  { name: '冰雪國度', themes: ['frost', 'crystal'] },
  { name: '霓虹夜城', themes: ['neon', 'toy', 'clock'] },
  { name: '火山地心', themes: ['lava', 'dino'] },
  { name: '月面星空', themes: ['moon', 'void'] },
  { name: '天空群島', themes: ['sky', 'void'] },
  { name: '糖果工廠', themes: ['candy', 'toy', 'honey'] },
  { name: '遠古遺跡', themes: ['egypt', 'dino'] },
  { name: '深海秘境', themes: ['reef', 'tropical'] },
  { name: '寒冰王國', themes: ['frost', 'crystal'] },
  { name: '夜幕都市', themes: ['neon', 'city'] },
  { name: '魔法森林', themes: ['mushroom', 'haunt', 'jungle'] },
  { name: '機械之心', themes: ['clock', 'storm'] },
  { name: '火焰國度', themes: ['lava', 'mars'] },
  { name: '終焉星海', themes: ['void', 'moon', 'crystal'] },
  { name: '櫻花庭園', themes: ['sakura', 'autumn'] },
  { name: '風車花田', themes: ['tulip', 'lavender'] },
  { name: '雷鳴高原', themes: ['storm', 'sky'] },
  { name: '水晶迷宮', themes: ['crystal', 'haunt'] },
  { name: '霓虹玩具城', themes: ['neon', 'toy'] },
  { name: '時空裂縫', themes: ['void', 'city'] },
  { name: '風暴之眼', themes: ['storm', 'tulip'] },
  { name: '黃金沙漠', themes: ['egypt', 'reef'] },
  { name: '極限混合', themes: ['lava', 'mars', 'jungle', 'moon'] },
  { name: '傳說之巔', themes: ['void', 'crystal', 'lava', 'sky', 'storm'] },
].map((c, k) => ({ ...c, from: k < 10 ? k * 10 + 1 : 101 + (k - 10) * 20, to: k < 10 ? k * 10 + 10 : 120 + (k - 10) * 20 }));

const PLACE = {
  tulip: ['風車', '鬱金香', '運河', '花田', '木鞋'], lavender: ['薰衣草', '紫色', '普羅旺斯', '花海', '香草'], candy: ['糖霜', '棉花糖', '巧克力', '馬卡龍', '布丁'],
  autumn: ['楓葉', '紅葉', '山溪', '秋色', '落葉'], sakura: ['櫻花', '錦鯉', '庭園', '花見', '石燈'], jungle: ['雨林', '藤蔓', '翡翠', '瀑布', '叢林'],
  reef: ['珊瑚', '海葵', '深海', '海龜', '珍珠'], tropical: ['椰林', '海灣', '潟湖', '貝殼', '浪花'], egypt: ['法老', '金字塔', '尼羅', '人面獅身', '太陽神'],
  mars: ['火星', '紅沙', '峽谷', '沙塵', '赤土'], swamp: ['沼澤', '迷霧', '蘆葦', '泥沼', '螢火'], dino: ['暴龍', '翼龍', '化石', '火山', '史前'],
  haunt: ['古堡', '墓園', '幽光', '鬼火', '夜霧'], sky: ['雲端', '天空', '雲海', '晴空', '彩霞'], city: ['天台', '大樓', '霓虹街', '摩天', '高架'],
  frost: ['冰原', '雪峰', '極光', '冰河', '霜雪'], crystal: ['水晶', '稜鏡', '晶洞', '紫晶', '光脈'], neon: ['霓虹', '電光', '夜城', '雷射', '電子'],
  toy: ['積木', '玩具', '發條', '彩球', '樂高'], clock: ['齒輪', '鐘樓', '蒸氣', '發條', '銅管'], lava: ['熔岩', '火山', '地心', '烈焰', '岩漿'],
  moon: ['月面', '隕石', '環形山', '月海', '寧靜'], void: ['虛空', '星環', '暗域', '星塵', '深空'], honey: ['蜂巢', '花蜜', '蜜糖', '花粉', '蜂后'],
  mushroom: ['菇林', '孢子', '螢光', '幻菇', '月光'], storm: ['雷鳴', '風暴', '烏雲', '閃電', '高原'],
};
const WATER = { lava: '熔岩', candy: '巧克力河', honey: '蜂蜜湖', reef: '深海溝', tropical: '海水', frost: '冰湖', crystal: '地下湖', neon: '電光池', city: '運河',
  mushroom: '螢光池', haunt: '護城河', jungle: '溪流', clock: '機油池', storm: '雨水溝', egypt: '尼羅河', dino: '沼澤', toy: '彩色泳池', sky: '雲海', void: '虛空',
  mars: '裂谷', moon: '隕石坑', tulip: '運河', lavender: '水渠', autumn: '山溪', sakura: '錦鯉池', swamp: '泥沼' };
const MOOD = {
  tulip: '風車慢慢轉的鬱金香花田', lavender: '夕陽下的薰衣草花田', candy: '甜甜的糖果王國', autumn: '紅葉飄落的山谷', sakura: '櫻花盛開的日式庭園', jungle: '藤蔓垂掛的雨林',
  reef: '海底的珊瑚礁', tropical: '陽光燦爛的椰林海灣', egypt: '黃沙中的法老神殿', mars: '紅色的火星峽谷', swamp: '起霧的沼澤', dino: '翼龍盤旋的史前山谷',
  haunt: '月光下的幽靈古堡', sky: '漂在雲海上的島嶼', city: '摩天大樓的屋頂', frost: '寒風刺骨的極地冰原', crystal: '發光的水晶洞窟', neon: '霓虹閃爍的夜城',
  toy: '積木堆成的玩具城', clock: '齒輪轟隆作響的工坊', lava: '岩漿翻滾的火山地心', moon: '空氣稀薄的月面基地', void: '星空中漂浮的浮島',
  honey: '花香撲鼻的蜂蜜花谷', mushroom: '螢光巨菇的森林', storm: '烏雲密布的雷鳴高原',
};
// 地形風格是 void（天空、屋頂、虛空）的主題：沒有地面可以接球，水改成裂縫、果嶺孤島是浮島
const VOIDISH = t => t === 'sky' || t === 'void' || t === 'city';
// 橫越球道的是斷崖（峽谷風格）還是一條水
const CHASM = t => t === 'mars' || t === 'crystal';
// 球洞的主要特色 → 名稱用字
const WORD = {
  front: ['湖畔', '水岸', '臨水', '渡口'], island: ['孤島', '浮島', '小島', '島嶼'], lateral: ['長河', '水道', '河岸', '緞帶'], cross: ['溪谷', '斷崖', '天險', '飛越'],
  gaps: ['裂縫', '斷橋', '跳島', '天梯'], sand: ['沙丘', '砂陣', '沙海', '沙堡'], bend: ['彎道', '轉角', '迴廊', '曲徑'], narrow: ['窄道', '針眼', '一線天', '細徑'],
  ob: ['懸崖', '邊界', '界線', '險路'], long: ['長征', '大道', '遠路', '長廊'], wind: ['狂風', '逆風', '風口', '側風'], boss: ['王座', '試煉', '守護者', '終章'],
};
const EN = { front: 'Shore', island: 'Isle', lateral: 'Channel', cross: 'Crossing', gaps: 'Gaps', sand: 'Dunes', bend: 'Bend', narrow: 'Needle', ob: 'Edge', long: 'Long Road', wind: 'Gale', boss: 'Throne' };
const SIDE = { L: '左', R: '右' };
const WIND_ZH = { L: '左側風', R: '右側風', H: '逆風', T: '順風' };

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const cap = s => s[0].toUpperCase() + s.slice(1);

export function designLevels() {
  const out = [], used = new Set();
  for (const ch of CHAPTERS_ALL) {
    for (let n = ch.from; n <= ch.to; n++) {
      const r = rng(n * 7919 + 101), pick = a => a[Math.floor(r() * a.length)];
      const boss = n === ch.to, theme = boss ? pick(ch.themes) : ch.themes[(n - ch.from) % ch.themes.length];
      out.push(design(n, theme, boss, r, pick, used));
    }
  }
  return out;
}

function design(n, t, boss, r, pick, used) {
  const d = (n - 1) / 499, lerp = (a, b) => a + (b - a) * d, rnd = (a, b) => Math.round(a + (b - a) * r());
  const vo = VOIDISH(t), W = WATER[t] || '水';
  // ---- 標準桿與距離 ----
  const par = boss ? (r() < 0.55 ? 5 : 4) : (x => (x < 0.3 ? 3 : x < 0.75 ? 4 : 5))(r());
  let yards = par === 3 ? rnd(lerp(120, 160), lerp(150, 225)) : par === 4 ? rnd(lerp(310, 360), lerp(350, 455)) : rnd(lerp(470, 520), lerp(520, 610));
  if (boss) yards = Math.round(yards * 1.05);
  // ---- 球場環境：球道越來越窄、果嶺越來越快 ----
  const c = { fairwayW: Math.max(18, Math.round(lerp(40, 22) + (r() - 0.5) * 4)), roughW: Math.round(lerp(16, 8)), stimp: Math.round(lerp(8, 12) * 10) / 10, trees: Math.round(lerp(0.6, 1.1) * 100) / 100 };
  const gW = Math.round(lerp(30, 18) + (r() - 0.5) * 3), gL = gW + rnd(2, 5);
  const spec = { green: { size: [gW, gL] }, bunkers: [] }, F = new Set(), say = [], tags = [];
  let bend = 0, wet = false, narrow = false, bothSides = false;
  // ---- 障礙：數量隨關卡增加（頭目關多一個）----
  let pts = 1 + Math.floor(d * 4.5 + r() * 1.5) + (boss ? 1 : 0);
  const green = () => spec.bunkers.filter(b => b.g).reduce((a, b) => a + (b.n || 1), 0);
  const OPS = par === 3 ? {
    front: () => { if (vo || F.has('IG')) return false; spec.water = (spec.water || []).concat({ g: 'F', size: [rnd(lerp(30, 40), lerp(36, 48)), rnd(lerp(10, 14), lerp(14, 22))] }); wet = true; say.push(`果嶺前面是一片${W}`); return true; },
    // 孤島果嶺：四周已經是水，不再另外加前水 / 側水
    island: () => { if (d < 0.25 || F.has('IG') || spec.water) return false; F.add('IG'); spec.green.size = [Math.max(22, gW), Math.max(25, gL)]; wet = true; say.push(vo ? `果嶺是一座浮島，四周都是${W}，打短打偏都會掉下去` : `果嶺被${W}整圈包圍，只能直接飛上去`); return true; },
    sand: () => { const k = Math.min(4, 2 + Math.floor(d * 2.5)); for (const g of ['FL', 'FR', 'BL', 'BR'].slice(0, k)) spec.bunkers.push({ g, big: d > 0.5 }); say.push(`果嶺周圍有 ${k} 個沙坑`); return true; },
    side: () => { if (vo || F.has('IG')) return false; const s = pick(['L', 'R']); spec.water = (spec.water || []).concat({ g: s, size: [rnd(18, 26), rnd(28, 40)] }); wet = true; say.push(`果嶺${SIDE[s]}邊緊貼著${W}`); return true; },
    waste: () => { const s = pick(['L', 'R']); spec.waste = [{ g: s }]; say.push(`果嶺${SIDE[s]}邊是很難切的荒地`); return true; },
  } : {
    bend: () => {
      if (bend || bothSides || (spec.gaps && spec.gaps.length >= 3)) return false;      // 狗腿彎不和兩側水 / 三道裂縫一起出現
      bend = (r() < 0.5 ? -1 : 1) * rnd(lerp(15, 25), lerp(25, 45)); spec.bendAt = Math.round(yards * (par === 5 ? 0.45 : 0.55));
      const inside = bend > 0 ? 'R' : 'L';
      spec.bunkers.push({ at: spec.bendAt - 10, side: inside });
      for (const w of spec.water || []) if (w.from) w.from = Math.max(w.from, spec.bendAt + 25);      // 先放的側水也移到轉角之後
      const trees = d > 0.35 && !(spec.water || []).some(w => w.from);
      if (trees) spec.trees = [{ at: spec.bendAt, side: inside, n: 10 }];
      if (par === 5 && d > 0.5 && r() < 0.6 && !F.has('xc') && !(spec.water || []).some(w => w.from)) { spec.bend2At = Math.round(yards * 0.75); spec.bend2 = -bend; }      // 第二個彎轉回原本的方向
      say.push(`球道在 ${spec.bendAt} 碼${bend > 0 ? '往右' : '往左'}轉${trees ? `，轉角種了一排高樹` : ''}${spec.bend2At ? '，之後又轉回來' : ''}`);
      return true;
    },
    lateral: () => {
      if (vo) {
        if (spec.gaps) return false;
        const k = Math.min(bend ? 2 : 3, 1 + Math.floor(d * 3)); spec.gaps = Array.from({ length: k }, (_, j) => ({ at: Math.round(yards * (j + 1) / (k + 1)), half: rnd(9, 12) }));
        wet = true; say.push(`球道被 ${k} 道裂縫切開，掉下去就是${W}`); tags.push('gaps'); return true;
      }
      if ((spec.water || []).some(w => w.from) || spec.bend2At) return false;      // 彎兩次的五桿洞不再加側水
      // 兩側都是水時不再把球道變窄；水離球道邊至少 6 碼（太窄機器人都打不過）
      const s = pick(['L', 'R']), both = !narrow && !bend && c.fairwayW >= 26 && d > 0.55 && r() < 0.45;
      if (both) bothSides = true;
      // 有狗腿彎時水只放在轉角之後（開球落點安全，第二桿才要面對水）
      const w = { from: bend ? spec.bendAt + 25 : Math.round(yards * 0.3), to: Math.round(yards * 0.85), w: 30, gap: Math.round(lerp(10, 6)) };
      spec.water = (spec.water || []).concat(both ? [{ ...w, side: 'L' }, { ...w, side: 'R' }] : [{ ...w, side: s }]);
      wet = true; say.push(both ? `球道兩側都是${W}，一路延伸到果嶺` : `球道${SIDE[s]}側是一整條${W}`); return true;
    },
    cross: () => { if (F.has('xc') || vo || spec.bend2At) return false; F.add('xc'); wet = true; say.push(CHASM(t) ? `球道中間橫著一道斷崖，要飛過去` : `球道中間橫著一條${W}`); return true; },
    fwSand: () => { const k = d > 0.5 ? 2 : 1, at = Math.round(Math.min(yards * 0.62, 235 + d * 30)); for (const s of k > 1 ? ['L', 'R'] : [pick(['L', 'R'])]) spec.bunkers.push({ at, side: s }); say.push(k > 1 ? `開球落點左右各有一個球道沙坑` : `開球落點旁有球道沙坑`); return true; },
    gSand: () => { const k = Math.min(4, 2 + Math.floor(d * 2.5)); for (const g of ['FL', 'FR', 'B', 'L'].slice(0, k)) spec.bunkers.push({ g, big: d > 0.5 }); say.push(`果嶺被 ${k} 個沙坑圍住`); return true; },
    front: () => { if (vo || (spec.water || []).some(w => w.g)) return false; spec.water = (spec.water || []).concat({ g: 'F', size: [rnd(34, 46), rnd(lerp(10, 14), lerp(14, 20))] }); wet = true; say.push(`果嶺前面是一片${W}`); return true; },
    ob: () => { if (spec.ob) return false; spec.ob = pick(['L', 'R']); say.push(`球道${SIDE[spec.ob]}邊不遠就是界外`); return true; },
    // 球道本來就窄、或兩側都是水時不再變窄
    narrow: () => { if (narrow || d < 0.3 || bothSides || c.fairwayW < 27) return false; narrow = true; F.add('nw'); say.push('球道比平常窄很多'); return true; },
  };
  const keys = Object.keys(OPS), order = [];
  for (let guard = 0; pts > 0 && guard < 40; guard++) { const k = pick(keys); if (!order.includes(k) && OPS[k]()) { order.push(k); pts--; } }      // 同一種障礙只放一次
  if (!green()) spec.bunkers.push({ g: pick(['FL', 'FR', 'BL', 'BR']) });      // 果嶺邊至少一個沙坑
  const sandN = spec.bunkers.reduce((a, b) => a + (b.n || 1), 0);
  if (narrow || c.fairwayW <= 26) narrow = true;
  // ---- 風：越後面越常有固定的強風 ----
  // 孤島果嶺最長 190 碼、風最大 10 mph（太長太強連機器人都上不了果嶺）
  if (F.has('IG')) yards = Math.min(yards, 190);
  const wind = r() < lerp(0.15, 0.7) || boss ? { mph: Math.min(F.has('IG') ? 10 : 99, rnd(lerp(4, 8), lerp(8, 16))), from: pick(['L', 'R', 'H', 'T']) } : null;
  // ---- 桿數上限：前面標準桿 +3，中段 +2，221 關以後 +1（五桿洞與頭目關 +2）----
  const slack = n <= 60 ? 3 : n <= 220 || par === 5 || boss ? 2 : 1, max = par + slack;      // 221 關以後五桿洞與頭目關保留 +2
  // ---- 條件：第 2、3 顆星 ----
  const sg = v => ({ t: 'strokes', v, text: v === par ? '標準桿以內進洞' : v === par - 1 ? `博蒂：${v} 桿以內進洞` : `${v} 桿以內進洞` });
  const nearV = Math.max(3, Math.round(lerp(12, 4)));
  const G = {
    noHazard: () => ({ t: 'noHazard', text: vo ? '一次都沒掉下去（也沒出界）' : spec.ob && !wet ? '一次都沒出界' : `一次都沒掉進${W}（也沒出界）` }),
    noSand: () => ({ t: 'noSand', text: '一次都沒進沙坑' }),
    noRough: () => ({ t: 'noRough', text: '一次都沒進長草' }),
    fairwayAll: () => ({ t: 'fairwayAll', text: '每一桿都停在球道或果嶺' }),
    teeGreen: () => ({ t: 'teeGreen', text: '開球直接上果嶺' }),
    teeNear: () => ({ t: 'teeNear', v: nearV, text: `開球停在旗桿 ${nearV} 碼內` }),
    teeFairway: () => ({ t: 'teeFairway', text: '開球停在球道上' }),
    greenIn: () => ({ t: 'greenIn', v: par - 2, text: `${par - 2} 桿內上果嶺（標準桿上果嶺）` }),
    putts: () => { const v = d > 0.55 && r() < 0.45 ? 1 : 2; return { t: 'putts', v, text: v === 1 ? '只推一桿就進洞' : '推桿 2 次以內' }; },
    drive: () => { const v = Math.round(lerp(210, 260) / 5) * 5; return { t: 'drive', v, text: `開球 ${v} 碼以上` }; },
  };
  const pool = [];
  const add = (k, w) => pool.push([k, w]);
  if (wet || spec.ob) add('noHazard', 5);
  if (sandN >= 2) add('noSand', 3);
  if (par === 3) { add('teeGreen', d < 0.5 ? 3 : 1); add('teeNear', 1.5 + 2 * d); }
  else { add('teeFairway', narrow ? 3 : 1.5); add('greenIn', 3); if (par === 5 && !narrow) add('drive', 1); }
  add('putts', 1 + d); add('noRough', 1.2);
  if (d > 0.35) add('fairwayAll', 2 * d);
  const and = x => (/^\d/.test(x) ? ' ' : '') + x.replace(/^一次都沒/, '沒有');
  const draw = (skip = []) => { const p = pool.filter(([k]) => !skip.includes(k)), tot = p.reduce((a, [, w]) => a + w, 0); let x = r() * tot; for (const [k, w] of p) { x -= w; if (x <= 0) return k; } return p[p.length - 1][0]; };
  const k1 = draw();
  let g1 = G[k1](), g2;
  // 第 3 顆星：越後面越常是桿數（標準桿 → 博蒂）
  const birdie = d > 0.35 && r() < (d - 0.3) * 0.9;
  if (boss) {
    const k2 = draw([k1]);
    g2 = { t: 'all', text: `${birdie ? `${par - 1} 桿` : '標準桿'}以內進洞，而且${and(G[k2]().text)}`, sub: [sg(birdie ? par - 1 : par), G[k2]()] };
  } else if (r() < 0.35 + 0.5 * d) g2 = sg(birdie ? par - 1 : par);
  else g2 = G[draw([k1])]();
  // 後段偶爾把第 2 顆星也變成組合條件（例如「不落水而且不進沙坑」）
  if (!boss && d > 0.6 && r() < 0.3 && pool.length > 2) {
    const k3 = draw([k1, g2.t]);
    const a = G[k3]();
    if (a.t !== g2.t) g1 = { t: 'all', text: `${g1.text}，而且${and(a.text)}`, sub: [g1, a] };
  }
  // ---- 名稱、介紹 ----
  const main = boss ? 'boss' : tags[0] || (order[0] === 'island' ? 'island' : order[0] === 'front' || order[0] === 'side' ? 'front' : order[0] === 'lateral' ? 'lateral' : order[0] === 'cross' ? 'cross'
    : order[0] === 'sand' || order[0] === 'gSand' || order[0] === 'fwSand' ? 'sand' : order[0] === 'bend' ? 'bend' : order[0] === 'narrow' ? 'narrow' : order[0] === 'ob' ? 'ob'
    : wind && wind.mph >= 10 ? 'wind' : par === 5 ? 'long' : 'sand');
  let title;
  for (let k = 0; k < 20; k++) { title = pick(PLACE[t]) + pick(WORD[main]); if (!used.has(title)) break; }
  if (used.has(title)) title += '・' + n;
  used.add(title);
  const intro = `${MOOD[t]}。${par} 桿洞，${yards} 碼。${say.join('；')}${say.length ? '。' : ''}${spec.green.size[0] <= 21 ? '果嶺很小、很快。' : ''}${wind ? `固定吹著 ${wind.mph} mph 的${WIND_ZH[wind.from]}。` : ''}${boss ? '這一章的頭目關。' : ''}`;
  return { t, title, en: `${cap(t)} ${EN[main]} ${n}`, intro, c, hole: [par, yards, bend, [...F].join(' '), spec], max, wind, goals: [g1, g2] };
}
