// 挑戰模式第 101~300 關：10 章、每章 20 關（第 20 關是頭目關）。用固定種子產生，每次載入都一樣。
// 每一關挑一種「玩法」（孤島、裂縫、水道、尋寶、光環、星門、彈跳、鏡牆、精準、限定球桿、遠擊、刻度、高吊、強風、
//   奇幻機關、神射、大砲、機關大亂鬥），依玩法決定球洞的樣子和兩個條件；越後面數字越嚴格、桿數上限越緊。
//   「標準桿以內」這種籠統的條件，前面的章節很少用，越後面越常出現（後面光是標準桿以內就很難）。
const R = (at, h = 12, lat = 0) => ({ kind: 'ring', at, h, lat });
const O = (at, h = 6, lat = 0) => ({ kind: 'orb', at, h, lat });

export const CHAPTERS_2 = [
  { name: '天空群島', en: 'Sky Archipelago', themes: ['sky', 'void', 'sky'] },
  { name: '糖果工廠', en: 'Candy Factory', themes: ['candy', 'toy', 'honey'] },
  { name: '遠古遺跡', en: 'Ancient Ruins', themes: ['egypt', 'dino', 'egypt'] },
  { name: '深海秘境', en: 'Abyssal Sea', themes: ['reef', 'tropical', 'reef'] },
  { name: '寒冰王國', en: 'Frozen Kingdom', themes: ['frost', 'crystal', 'frost'] },
  { name: '夜幕都市', en: 'Night City', themes: ['neon', 'city', 'neon'] },
  { name: '魔法森林', en: 'Enchanted Forest', themes: ['mushroom', 'haunt', 'jungle'] },
  { name: '機械之心', en: 'Clockwork Core', themes: ['clock', 'storm', 'clock'] },
  { name: '火焰國度', en: 'Realm of Fire', themes: ['lava', 'mars', 'lava'] },
  { name: '終焉星海', en: 'Starsea Finale', themes: ['void', 'moon', 'crystal', 'lava', 'sky'] },
];
// 主題的地名、水 / 掉落的稱呼、氣氛描述
const PLACE = {
  sky: ['雲端', '天空', '雲海', '晴空', '彩霞'], void: ['虛空', '星環', '暗域', '星塵', '深空'], candy: ['糖霜', '棉花糖', '巧克力', '馬卡龍', '布丁'],
  toy: ['積木', '玩具', '發條', '彩球', '樂高'], honey: ['蜂巢', '花蜜', '蜜糖', '花粉', '蜂后'], egypt: ['法老', '金字塔', '尼羅', '人面獅身', '太陽神'],
  dino: ['暴龍', '翼龍', '化石', '火山', '史前'], reef: ['珊瑚', '海葵', '深海', '海龜', '珍珠'], tropical: ['椰林', '海灣', '潟湖', '貝殼', '浪花'],
  frost: ['冰原', '雪峰', '極光', '冰河', '霜雪'], crystal: ['水晶', '稜鏡', '晶洞', '紫晶', '光脈'], neon: ['霓虹', '電光', '夜城', '雷射', '電子'],
  city: ['天台', '大樓', '霓虹街', '摩天', '高架'], mushroom: ['菇林', '孢子', '螢光', '幻菇', '月光'], haunt: ['古堡', '墓園', '幽光', '鬼火', '夜霧'],
  jungle: ['雨林', '藤蔓', '翡翠', '瀑布', '叢林'], clock: ['齒輪', '鐘樓', '蒸氣', '發條', '銅管'], storm: ['雷鳴', '風暴', '烏雲', '閃電', '高原'],
  lava: ['熔岩', '火山', '地心', '烈焰', '岩漿'], mars: ['火星', '紅沙', '峽谷', '沙塵', '赤土'], moon: ['月面', '隕石', '環形山', '月海', '寧靜'],
};
const WATER = { lava: '熔岩', candy: '巧克力河', honey: '蜂蜜湖', reef: '深海溝', tropical: '海水', frost: '冰湖', crystal: '地下湖', neon: '電光池', city: '運河',
  mushroom: '螢光池', haunt: '護城河', jungle: '溪流', clock: '機油池', storm: '雨水溝', egypt: '尼羅河', dino: '沼澤', toy: '彩色泳池', sky: '雲海', void: '虛空', mars: '裂谷', moon: '隕石坑' };
const MOOD = {
  sky: '漂在雲海上的島嶼', void: '星空中漂浮的浮島', candy: '甜甜的糖果王國', toy: '積木堆成的玩具城', honey: '花香撲鼻的蜂蜜花谷', egypt: '黃沙中的法老神殿',
  dino: '翼龍盤旋的史前山谷', reef: '海底的珊瑚礁', tropical: '陽光燦爛的椰林海灣', frost: '寒風刺骨的極地冰原', crystal: '發光的水晶洞窟', neon: '霓虹閃爍的夜城',
  city: '摩天大樓的屋頂', mushroom: '螢光巨菇的森林', haunt: '月光下的幽靈古堡', jungle: '藤蔓垂掛的雨林', clock: '齒輪轟隆作響的工坊', storm: '烏雲密布的雷鳴高原',
  lava: '岩漿翻滾的火山地心', mars: '紅色的火星峽谷', moon: '空氣稀薄的月面基地',
};
const VOIDISH = t => t === 'sky' || t === 'void' || t === 'city';
// 玩法：名稱用字、英文、球洞與條件
const KINDS = {
  island: { w: ['孤島', '浮島', '小島', '島嶼'], en: 'Isle' },
  gaps: { w: ['裂縫', '斷橋', '天險', '跳島'], en: 'Gaps' },
  water: { w: ['長河', '水道', '緞帶', '河岸'], en: 'Channel' },
  orbs: { w: ['寶藏', '尋寶', '金球', '藏寶圖'], en: 'Treasure' },
  ring: { w: ['光環', '星環', '光圈', '雙環'], en: 'Rings' },
  portal: { w: ['星門', '傳送門', '異界門', '捷徑'], en: 'Gate' },
  bounce: { w: ['彈跳', '跳台', '蹦床', '彈彈'], en: 'Bounce' },
  walls: { w: ['鏡廊', '折返', '迴廊', '鏡牆'], en: 'Mirrors' },
  precise: { w: ['精準', '針眼', '一點', '靶心'], en: 'Bullseye' },
  club: { w: ['一桿入魂', '單桿', '鐵桿試煉', '限定'], en: 'One Club' },
  drive: { w: ['巨砲', '長征', '遠擊', '大道'], en: 'Long Drive' },
  range: { w: ['刻度', '雷射線', '準星', '落點'], en: 'Laser Line' },
  apex: { w: ['高空', '雲梯', '吊球', '飛越'], en: 'Sky Lob' },
  wind: { w: ['狂風', '風暴', '逆風', '側風'], en: 'Gale' },
  mech: { w: ['機關', '陷阱', '奇境', '迷宮'], en: 'Contraption' },
  holeout: { w: ['神射', '一擊', '切桿秀', '神來一筆'], en: 'Sharpshooter' },
  cannon: { w: ['大砲', '噴泉', '彈射', '火山口'], en: 'Cannon' },
  combo: { w: ['大亂鬥', '機關城', '嘉年華', '遊樂場'], en: 'Carnival' },
  boss: { w: ['王座', '試煉', '守護者', '終章'], en: 'Throne' },
};
const MECH = [
  { feat: 'hy', kind: 'honey', name: '蜂蜜池', avoid: '一次都沒被蜂蜜黏住' },
  { feat: 'gr', kind: 'gear', name: '轉向齒輪', fx: '被齒輪甩出去' },
  { feat: 'ws', kind: 'wisp', name: '引魂燈', fx: '被引魂燈拉過' },
  { feat: 'bp', kind: 'bumper', name: '彈珠柱', fx: '撞到彈珠柱' },
  { feat: 'cl', kind: 'cloud', name: '雷雲', avoid: '一次都沒被雷打中' },
];
const CLUB_SETS = [['7I', '7 號鐵'], ['8I', '8 號鐵'], ['6I', '6 號鐵'], ['5I', '5 號鐵'], ['PW', 'P 挖起桿'], ['SW', '沙坑桿'], ['9I', '9 號鐵'], ['4H', '4 號混血']];

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

export function genLevels() {
  const out = [], used = new Set();
  CHAPTERS_2.forEach((ch, ci) => {
    for (let i = 0; i < 20; i++) {
      const n = 101 + ci * 20 + i, d = (n - 101) / 199, r = rng(n * 7919 + 13);
      const pick = a => a[Math.floor(r() * a.length)];
      const boss = i === 19;
      const theme = boss ? pick(ch.themes) : ch.themes[i % ch.themes.length];
      // 玩法：每章有幾種固定出現，其餘隨機；頭目關固定
      let kind;
      if (boss) kind = 'boss';
      else {
        const pool = ['island', 'water', 'orbs', 'ring', 'portal', 'bounce', 'walls', 'precise', 'club', 'drive', 'range', 'apex', 'wind', 'mech', 'mech', 'holeout', 'cannon', 'combo'];
        if (VOIDISH(theme)) pool.push('gaps', 'gaps', 'gaps');
        const prev = out.length ? out[out.length - 1].kindKey : '';
        do kind = pick(pool); while (kind === prev);
      }
      const lv = build(kind, theme, n, d, r, pick, ci);
      // 名稱：地名＋玩法字，重複的換一個
      let title;
      for (let k = 0; k < 20; k++) { title = pick(PLACE[theme]) + pick(KINDS[kind].w); if (!used.has(title)) break; }
      if (used.has(title)) title += '・' + n;
      used.add(title);
      out.push({ ...lv, t: theme, title, en: `${cap(theme)} ${KINDS[kind].en} ${n}`, kindKey: kind });
    }
  });
  return out;
}
const cap = s => s[0].toUpperCase() + s.slice(1);

function build(kind, t, n, d, r, pick, ci) {
  const lerp = (a, b) => a + (b - a) * d, rnd = (a, b) => Math.round(a + (b - a) * r());
  const W = WATER[t] || '水', M = MOOD[t] || '';
  // 桿數上限：前面標準桿 +3，越後面越緊，最後只給 +1
  const slack = d < 0.25 ? 3 : d < 0.6 ? 2 : 1;
  const parG = (par, txt) => ({ t: 'strokes', v: par, text: txt || '標準桿以內' });
  const underG = (par, k) => ({ t: 'strokes', v: par - k, text: `${par - k} 桿以內進洞` });
  // 籠統的「標準桿以內」：前面很少，後面常見
  const usePar = () => r() < 0.08 + 0.55 * d;
  let par, yards, bend = 0, feat = '', spec = {}, goals = [], intro = '', extra = {};
  switch (kind) {
    case 'island': {
      par = 3; yards = rnd(lerp(140, 190), lerp(170, 240)); feat = 'IG';
      spec = { bunkers: [{ g: pick(['B', 'BL', 'BR']) }], green: { size: [Math.round(lerp(30, 20)), Math.round(lerp(34, 24))] } };
      if (r() < 0.4 + d * 0.4) extra.wind = { mph: Math.round(lerp(6, 16)), from: pick(['L', 'R', 'H']) };
      goals = [{ t: 'teeGreen', text: '開球直接上果嶺' }, d > 0.5 && r() < 0.5 ? { t: 'noPutt', text: '不用推桿進洞（切進或一桿進洞）' } : { t: 'teeNear', v: Math.round(lerp(10, 3)), text: `開球停在旗桿 ${Math.round(lerp(10, 3))} 碼內` }];
      intro = `${M}。果嶺浮在${W}中央，只有發球台和果嶺是陸地${extra.wind ? `，還吹著 ${extra.wind.mph} mph 的${{ L: '左側風', R: '右側風', H: '逆風' }[extra.wind.from]}` : ''}。`;
      break;
    }
    case 'gaps': {
      par = r() < 0.5 ? 4 : 5; const k = Math.min(4, Math.round(lerp(1.5, 4))); yards = par === 4 ? rnd(380, 440) : rnd(540, 640);
      feat = d > 0.4 ? 'nw' : '';
      spec = { gaps: Array.from({ length: k }, (_, j) => ({ at: Math.round(yards * (j + 1) / (k + 1)), half: rnd(10, 12) })) };
      goals = [{ t: 'noHazard', text: `一次都沒掉進${W}` }, usePar() ? parG(par) : { t: 'greenIn', v: par - 2, text: `${par - 2} 桿內上果嶺` }];
      intro = `${M}，${k + 1} 座島之間隔著 ${k} 道裂縫，掉下去就是${W}。`;
      break;
    }
    case 'water': {
      par = r() < 0.55 ? 4 : 5; yards = par === 4 ? rnd(360, 430) : rnd(520, 620); const gap = Math.round(lerp(12, 8));
      spec = { water: [{ from: 30, to: yards - 10, side: 'L', w: 30, gap }, { from: 30, to: yards - 10, side: 'R', w: 30, gap }], bunkers: [{ g: 'BL' }] };
      extra.c = { fairwayW: Math.round(lerp(32, 22)), roughW: 6 };
      goals = [{ t: 'fairwayAll', text: '每一桿都停在球道或果嶺' }, usePar() ? parG(par) : { t: 'noHazard', text: `一次都沒掉進${W}` }];
      intro = `${M}。球道兩側都是${W}，像一條緞帶一路延伸到果嶺，寬度只有 ${extra.c.fairwayW} 碼。`;
      break;
    }
    case 'orbs': {
      par = pick([4, 5]); yards = par === 4 ? rnd(360, 420) : rnd(520, 600); const k = Math.round(lerp(2, 4)), need = d < 0.3 ? k - 1 : k;
      spec = { bendAt: Math.round(yards * 0.5), specials: Array.from({ length: k }, (_, j) => O(Math.round(yards * (j + 0.6) / (k + 0.5)), rnd(5, 12), rnd(-6, 6))), bunkers: [{ g: 'FL' }] };
      bend = rnd(-25, 25);
      goals = [{ t: 'orbs', v: need, text: need === k ? `${k} 顆金球全部收集` : `收集 ${need} 顆金球` }, usePar() ? parG(par) : { t: 'noHazard', text: '一次都沒失誤' }];
      intro = `${M}，空中漂著 ${k} 顆金球。要撿齊就得冒點險。`;
      break;
    }
    case 'ring': {
      par = pick([3, 4, 4]); yards = par === 3 ? rnd(160, 210) : rnd(360, 420);
      const two = d > 0.3 && par !== 3 && r() < 0.7;
      spec = { specials: two ? [R(rnd(85, 95), 15), R(rnd(135, 150), 22)] : [R(Math.round(yards * 0.5), 14)], bunkers: [{ g: 'FR' }] };
      if (r() < 0.4) feat = 'xc';
      goals = [two ? { t: 'fxOne', kind: 'ring', v: 2, text: '同一桿穿過 2 個光環' } : { t: 'fx', kind: 'ring', v: 1, text: '穿過螢火之環' },
        par === 3 ? { t: 'teeNear', v: Math.round(lerp(12, 4)), text: `開球停在旗桿 ${Math.round(lerp(12, 4))} 碼內` } : usePar() ? parG(par) : { t: 'greenIn', v: 2, text: '兩桿內上果嶺' }];
      intro = `${M}。${two ? '兩個螢火之環排成一線，一桿穿過兩個才算本事' : '空中有一個螢火之環，穿過去球會加速'}。`;
      break;
    }
    case 'portal': {
      par = 5; yards = rnd(560, 660); const two = d > 0.45 && r() < 0.6;
      spec = { specials: two ? [{ kind: 'portal', at: 120, h: 5.5, exitAt: Math.round(yards * 0.5) }, { kind: 'portal', at: Math.round(yards * 0.6), h: 5.5, exitAt: yards - 50 }] : [{ kind: 'portal', at: rnd(120, 160), h: 5.5, exitAt: yards - 50 }] };
      if (VOIDISH(t)) spec.gaps = [{ at: Math.round(yards * 0.4), half: 12 }]; else spec.water = [{ from: Math.round(yards * 0.45), to: Math.round(yards * 0.62), side: 'C', w: 80 }];
      goals = [{ t: 'fx', kind: 'portal', v: two ? 2 : 1, text: two ? '穿過兩座星門' : '穿過星門' }, underG(par, d > 0.6 ? 2 : 1)];
      intro = `${M}，中段被${W}切斷。${two ? '兩座星門串在一起，' : ''}星門可以直接把球送到果嶺附近。`;
      break;
    }
    case 'bounce': {
      par = 4; yards = rnd(340, 410); const sh = t === 'mushroom' || t === 'haunt' || t === 'jungle' || r() < 0.4, k = Math.round(lerp(1.5, 3));
      const kd = sh ? 'shroom' : 'tramp';
      // 落點區幾個，再加一個在果嶺前（打短的第二桿落上去就能彈上果嶺，「彈起的那一桿上果嶺」才做得到）
      spec = { specials: [...Array.from({ length: k }, (_, j) => ({ kind: kd, at: 190 + j * 45, lat: rnd(-4, 4), h: 5 + j })), { kind: kd, at: yards - 26, lat: 0, h: 3, r: 5 }], bunkers: [{ g: 'FL' }] };
      goals = [k >= 2 && d > 0.4 ? { t: 'fxOne', kind: kd, v: 2, text: `同一桿${sh ? '被巨菇' : '在彈跳床上'}彈 2 次以上` } : { t: 'fx', kind: kd, v: 1, text: sh ? '被巨菇彈起來' : '落上彈跳床' },
        { t: 'fxGreen', kind: kd, text: `${sh ? '被巨菇' : '彈跳床'}彈起的那一桿直接上果嶺` }];
      intro = `${M}，落點區排著 ${k} ${sh ? '朵彈跳巨菇' : '張彈跳床'}，果嶺前還有一${sh ? '朵' : '張'}，落上去會被彈得老高。`;
      break;
    }
    case 'walls': {
      par = 4; yards = rnd(360, 410); bend = pick([-1, 1]) * rnd(50, 70); const k = Math.round(lerp(1.5, 3)), s = Math.sign(bend);
      const walls = [{ kind: 'wall', at: 215, lat: -s * 27, len: 48, ang: s * 30 }, { kind: 'wall', at: 300, lat: s * 22, len: 34 }, { kind: 'wall', at: 120, lat: -s * 20, len: 28 }];
      spec = { bendAt: 200, specials: walls.slice(0, k), bunkers: [{ g: 'FR' }] };
      goals = [{ t: 'fx', kind: 'wall', v: Math.min(k, d > 0.5 ? 2 : 1), text: `撞${t === 'neon' ? '霓虹' : t === 'crystal' ? '水晶' : '鏡'}牆反彈 ${Math.min(k, d > 0.5 ? 2 : 1)} 次以上` }, usePar() ? parG(par) : { t: 'greenIn', v: 2, text: '兩桿內上果嶺' }];
      intro = `${M}。${Math.abs(bend)} 度的急轉彎，轉角立著反彈牆，靠牆過彎是捷徑。`;
      break;
    }
    case 'precise': {
      par = 3; yards = rnd(130, 200); const sz = Math.round(lerp(26, 18));
      spec = { green: { size: [sz, sz + 4], slope: lerp(0.015, 0.035), side: 0.01 }, bunkers: [{ g: 'FL' }, { g: 'FR' }, { g: 'B' }] };
      extra.c = { stimp: Math.round(lerp(10, 13) * 2) / 2 };
      const near = Math.round(lerp(8, 2.5));
      goals = [{ t: 'teeNear', v: near, text: `開球停在旗桿 ${near} 碼內` }, { t: 'putts', v: 1, text: '只推 1 次' }];
      intro = `${M}。果嶺只有 ${sz} 碼深、快又斜（果嶺速度 ${extra.c.stimp}），四周都是沙坑。`;
      break;
    }
    case 'club': {
      const [cid, cname] = pick(CLUB_SETS); par = 4; yards = cid === 'SW' || cid === 'PW' ? rnd(260, 300) : cid === '4H' || cid === '5I' ? rnd(380, 420) : rnd(320, 360);
      extra.clubs = [cid, 'PT']; bend = rnd(-25, 25);
      spec = { bendAt: Math.round(yards / 2), bunkers: [{ at: Math.round(yards / 2), side: bend > 0 ? 'R' : 'L' }, { g: 'FL' }] };
      goals = [usePar() || d > 0.4 ? parG(par) : { t: 'noRough', text: '一次都沒進長草' }, { t: 'putts', v: 1, text: '只推 1 次' }];
      intro = `整洞只能用${cname}和推桿。${M}裡的 ${yards} 碼四桿洞。`;
      break;
    }
    case 'drive': {
      par = r() < 0.5 ? 4 : 5; yards = par === 4 ? rnd(440, 480) : rnd(590, 660);
      // 開球門檻跟著關卡進度：一般素質的一號木平均約 200 碼、能力點加滿約 300 碼（月面空氣稀薄約多 20%）
      const v = Math.round((lerp(225, 275) + (t === 'moon' ? 25 : t === 'mars' ? 12 : 0)) / 5) * 5;
      spec = { bunkers: [{ at: v - 20, side: 'L' }, { at: v + 10, side: 'R' }, { g: 'F' }] }; if (r() < 0.4) feat = 'tr';
      goals = [{ t: 'drive', v, text: `開球 ${v} 碼以上` }, { t: 'greenIn', v: par - 2, text: `${par - 2} 桿內上果嶺` }];
      intro = `${M}。${yards} 碼的${par === 4 ? '長四桿' : '五桿'}洞，開球不夠遠就上不了果嶺。`;
      break;
    }
    case 'range': {
      par = 4; yards = rnd(350, 400); const a = Math.round(lerp(200, 225) / 5) * 5 + rnd(0, 2) * 5, w = Math.round(lerp(35, 18));
      spec = { bunkers: [{ at: a - 15, side: 'L' }, { at: a + w + 10, side: 'R' }, { g: 'FL' }] };
      goals = [{ t: 'driveRange', v: [a, a + w], text: `開球停在 ${a}~${a + w} 碼之間` }, d > 0.5 ? { t: 'teeFairway', text: '開球停在球道上' } : { t: 'greenIn', v: 2, text: '兩桿內上果嶺' }];
      intro = `${M}。開球要剛好停在指定的距離區間，太短太長都不行。`;
      break;
    }
    case 'apex': {
      par = 3; yards = rnd(140, 175); feat = 'tr nw'; extra.c = { trees: 1.3 };
      const v = Math.round(lerp(28, 40));
      spec = { green: { size: [24, 28] }, bunkers: [{ g: 'F' }] };
      goals = [{ t: 'apex', v, text: `打出最高點 ${v} 公尺以上的球` }, { t: 'teeGreen', text: '開球直接上果嶺' }];
      intro = `${M}。果嶺被高高的樹圍住，要打出很高的球才進得去。`;
      break;
    }
    case 'wind': {
      par = pick([3, 4, 4]); yards = par === 3 ? rnd(170, 210) : rnd(380, 430);
      extra.wind = { mph: Math.round(lerp(10, 20)), from: pick(['L', 'R', 'H', 'H']) };
      feat = extra.wind.from === 'L' ? 'wr' : extra.wind.from === 'R' ? 'wl' : '';
      spec = { bunkers: [{ g: 'FL' }, { g: 'FR' }] };
      goals = [{ t: 'noHazard', text: '一次都沒失誤' }, par === 3 ? { t: 'teeGreen', text: '開球直接上果嶺' } : usePar() ? parG(par) : { t: 'greenIn', v: 2, text: '兩桿內上果嶺' }];
      intro = `${M}，吹著 ${extra.wind.mph} mph 的${{ L: '左側風', R: '右側風', H: '逆風' }[extra.wind.from]}${feat ? `，下風處是${W}` : ''}。`;
      break;
    }
    case 'mech': {
      const m = pick(MECH); par = pick([4, 5]); yards = par === 4 ? rnd(370, 420) : rnd(530, 600); feat = m.feat; bend = rnd(-30, 30);
      spec = { bendAt: Math.round(yards * 0.5), bunkers: [{ g: 'FR' }] };
      goals = [m.avoid ? { t: 'avoid', kind: m.kind, text: m.avoid } : { t: 'fx', kind: m.kind, v: d > 0.5 ? 2 : 1, text: `${m.fx} ${d > 0.5 ? 2 : 1} 次以上` },
        usePar() ? parG(par) : { t: 'greenIn', v: par - 2, text: `${par - 2} 桿內上果嶺` }];
      intro = `${M}，球道上布滿了${m.name}。${m.avoid ? '想辦法閃開它們' : '好好利用它們'}。`;
      break;
    }
    case 'holeout': {
      par = 4; yards = rnd(300, 340); const v = Math.round(lerp(25, 70) / 5) * 5;
      spec = { water: [{ g: 'F' }], bunkers: [{ g: 'BL' }, { g: 'BR' }] };
      goals = [{ t: 'holeOut', v, text: `從 ${v} 碼外直接打進洞（不用推桿）` }, d > 0.5 ? underG(par, 1) : { t: 'greenIn', v: 2, text: '兩桿內上果嶺' }];
      intro = `${M}。果嶺前是${W}，從遠處直接打進洞才是真本事。`;
      break;
    }
    case 'cannon': {
      par = 5; yards = rnd(560, 620); const vent = r() < 0.5;
      spec = { specials: vent ? [{ kind: 'vent', at: 230, lat: -5 }, { kind: 'vent', at: 260, lat: 6 }, { kind: 'vent', at: 300, lat: 0 }] : [{ kind: 'cannon', at: rnd(240, 280), r: 4.2 }], bunkers: [{ g: 'FL' }, { g: 'FR' }] };
      if (r() < 0.5) feat = 'xc';
      goals = [{ t: 'fx', kind: vent ? 'vent' : 'cannon', v: 1, text: vent ? '被噴發口噴上天' : '被大砲轟出去' }, underG(par, d > 0.6 ? 2 : 1)];
      intro = `${M}。${vent ? '落點區有三個噴發口，噴上天就能飛越大半個球道' : '球道中段架著一座大砲，掉進去會直接被轟向果嶺'}。`;
      break;
    }
    case 'combo': {
      par = 5; yards = rnd(580, 640); const m = pick(MECH.filter(x => x.fx)); feat = m.feat;
      spec = { specials: [{ kind: 'tramp', at: 190, lat: -4 }, { kind: 'boost', at: 280 }, { kind: 'wall', at: 380, lat: 24, len: 40, ang: -20 }, R(95, 15)] };
      const v = Math.round(lerp(3, 6)), kinds = Math.round(lerp(2, 4));
      goals = [r() < 0.5 ? { t: 'fxTotal', v, text: `觸發機關合計 ${v} 次以上` } : { t: 'fxKinds', v: kinds, text: `觸發 ${kinds} 種以上不同的機關` }, usePar() ? parG(par) : { t: 'greenIn', v: 3, text: '三桿內上果嶺' }];
      intro = `${M}的遊樂場：彈跳床、加速帶、反彈牆、光環，還有${m.name}，能玩的全部玩一遍。`;
      break;
    }
    case 'boss': {
      par = 5; yards = Math.round(lerp(600, 700)); bend = pick([-1, 1]) * 25;
      const specials = [R(95, 16), O(160, 12), O(Math.round(yards * 0.5), 8, -5), O(yards - 120, 6, 4)];
      if (ci % 2) specials.push({ kind: 'portal', at: Math.round(yards * 0.45), h: 5.5, exitAt: yards - 60 });
      else specials.push({ kind: 'wall', at: Math.round(yards * 0.5), lat: 26, len: 44, ang: -25 }, { kind: 'vent', at: Math.round(yards * 0.62), lat: 0 });
      spec = { bendAt: Math.round(yards * 0.5), specials };
      if (VOIDISH(t)) spec.gaps = [{ at: Math.round(yards * 0.3), half: 11 }, { at: Math.round(yards * 0.7), half: 12 }];
      else spec.water = [{ g: 'FR' }];
      feat = 'nw ' + MECH[ci % MECH.length].feat;
      goals = [{ t: 'all', text: '3 顆金球全部收集，也穿過光環', sub: [{ t: 'orbs', v: 3 }, { t: 'fx', kind: 'ring', v: 1 }] }, d > 0.5 ? underG(par, 1) : parG(par)];
      intro = `第 ${ci + 11} 章的頭目關：${M}最後的試煉，光環、金球、${ci % 2 ? '星門' : '反彈牆和噴發口'}和${MECH[ci % MECH.length].name}全部都在這一洞。`;
      break;
    }
  }
  const max = par + (kind === 'boss' ? 1 : slack);
  return { hole: [par, yards, bend, feat, spec], max, goals, intro, ...(extra.c ? { c: extra.c } : {}), ...(extra.wind ? { wind: extra.wind } : {}), ...(extra.clubs ? { clubs: extra.clubs } : {}) };
}
