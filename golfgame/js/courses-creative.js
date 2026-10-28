// 非真實球場（@C）：名稱照真實球場，但球洞是自創的。
//   每洞的標準桿與冠軍梯碼數照公開的計分卡（查不到的標「約略」），
//   知名的洞照公開文字描述做出特徵（over），其他洞依該球場的地區特色（p：地形、沙坑、水、樹種、果嶺）由程式設計。
//   同一座球場每次產生的結果都一樣（以球場代號為亂數種子）。
// 球場欄位：
//   tier 生涯用的層級：major 四大賽 / pga PGA TOUR / europe 歐巡 / team 團體賽與奧運 / asia 亞巡日巡 / amateur 業餘大賽 / kft Korn Ferry / college 大學 / junior 青少年
//   event 生涯中在這裡舉辦的賽事與月份；basis 設計依據；diff 難度 1~5；card 計分卡 [[碼數, 標準桿] × 18]（approx = 約略）
//   p 球場特色：
//     dog [最小, 最大] 狗腿角度、straight 直洞比例、elev 起伏（公尺）、fw [最少, 最多] 球道沙坑、gs 果嶺邊沙坑、cross 橫越球道的沙坑機率
//     w { side 球道旁水池, green 果嶺旁水池, front 三桿洞果嶺前水, creek 球道中段溪流 } 機率、ob 界外機率、waste 長草外是荒地 / 沙地
//     green { size [最小, 最大] 碼, slope [最小, 最大], tier 雙層機率, crown 龜背(+) / 碗形(-) }、rows 狗腿內側樹叢機率、sea { holes, side } 沿海的洞
//   over 指定洞的特徵：{ 洞號: { bend, tok, shape, spec, note } }
import { makeRng, hashStr } from './util.js';

const GSIDE = ['F', 'L', 'R', 'FL', 'FR', 'BL', 'BR', 'B'];
const SIDE_NAME = { L: '左', R: '右' };
const G_NAME = { F: '前', B: '後', L: '左', R: '右', FL: '左前', FR: '右前', BL: '左後', BR: '右後' };

function shuffle(a, rng) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// 一洞：依球場特色產生 [標準桿, 黑梯碼數, 狗腿角度, 特徵代號, 差點(之後再排), spec]
function designHole(c, i, rng) {
  const [yd, par] = c.card[i];
  const P = c.p, o = (c.over && c.over[i + 1]) || {};
  const rr = (a, b) => a + (b - a) * rng();
  const pick = a => a[Math.floor(rng() * a.length)];
  const white = Math.round(yd * (par === 3 ? 0.9 : 0.88));
  const tees = { black: yd, blue: Math.round(yd * (par === 3 ? 0.95 : 0.94)), white, red: Math.round(yd * (par === 3 ? 0.76 : 0.78)) };
  // 洞型：大部分的洞都有狗腿或 S 彎，直洞只佔 straight 的比例
  let bend = 0, shape = '';
  if (par === 3) bend = Math.round(rr(-8, 8));
  else if (rng() > (P.straight ?? 0.2)) {
    // 轉角會被平滑掉一些，所以設定值放大 1.5 倍（約 15~65 度），看起來才是明顯的狗腿
    bend = Math.min(70, Math.round(rr(P.dog[0], P.dog[1]) * 1.5)) * (rng() < 0.5 ? -1 : 1);
    shape = par === 4 ? pick(['', '', 'E', 'J', 'S']) : pick(['', 'S', 'D', '']);
  } else bend = Math.round(rr(-5, 5));
  if (o.bend != null) bend = o.bend;
  if (o.shape != null) shape = o.shape;
  const tok = [];
  const spec = { tees };
  // 落點：四桿洞開球約 60% 處、五桿洞兩個落點
  const land = par === 4 ? Math.max(185, Math.min(265, Math.round(white * 0.6))) : par === 5 ? Math.max(210, Math.min(265, Math.round(white * 0.46))) : 0;
  const land2 = par === 5 ? Math.round(white * 0.76) : 0;
  // 三桿洞：果嶺前一段球道（從洞長的 30~70% 開始），不是整片長草只有一個果嶺
  if (par === 3) spec.fwStart = Math.round(white * rr(0.3, 0.7));
  if (par >= 4) {
    spec.lands = par === 5 ? [land, land2] : [land];
    // 球道從哪裡開始（距白梯碼數）：大多 120~170 碼，偶爾很前面或要先飛越一大段長草
    spec.fwStart = Math.round(Math.min(land - 55, rr(95, 175)));
    // 五桿洞：三成的機會在兩個落點中間有一段長草把球道切斷（第二桿要決定打過去還是停在前面）
    if (par === 5 && land2 - land > 150 && rng() < 0.35) spec.fwGap = Math.round(rr(land + 55, land2 - 55));
  }
  // 轉角的位置：一般的狗腿在開球落點之後轉（打到轉角、第二桿換方向）；五桿洞可以有兩個彎（第二個彎在第二桿落點附近）
  if (par === 4 && !shape && Math.abs(bend) >= 8 && o.bend == null) spec.bendAt = land + Math.round(rr(8, 32));
  if (par === 5 && Math.abs(bend) >= 8 && o.bend == null && shape !== 'D') {
    spec.bendAt = land + Math.round(rr(0, 25));
    spec.bend2At = Math.min(white - 90, land2 + Math.round(rr(-15, 20)));
    let b2 = shape === 'S' ? -bend * rr(1.2, 1.8) : bend * rr(-0.9, 0.6);
    b2 = Math.max(-60 - bend, Math.min(60 - bend, b2));
    spec.bend2 = Math.round(b2);
    if (spec.bend2At - spec.bendAt < 60) { delete spec.bend2At; delete spec.bend2; }
  }
  // 沙坑
  const bunkers = [];
  const gsN = Math.round(rr(P.gs[0], P.gs[1]));
  for (const g of shuffle(GSIDE.slice(), rng).slice(0, gsN)) bunkers.push({ g, big: rng() < 0.25 });
  if (par >= 4) {
    const fwN = Math.round(rr(P.fw[0], P.fw[1]));
    for (let k = 0; k < fwN; k++) {
      const inside = bend !== 0 && k === 0 && Math.abs(bend) >= 12;
      const side = inside ? (bend > 0 ? 'R' : 'L') : pick(['L', 'R']);
      bunkers.push({ at: (k % 2 && land2 ? land2 : land) + Math.round(rr(-15, 20)), side, n: rng() < 0.3 ? 2 : 1, long: rng() < 0.25, inside: inside && rng() < 0.5 });
    }
    if (rng() < (P.cross || 0)) bunkers.push({ at: (land2 || land) + Math.round(rr(40, 80)), side: 'C', n: 2 + Math.floor(rng() * 2) });
  }
  if (bunkers.length) spec.bunkers = bunkers;
  // 水
  const W = P.w || {}, water = [];
  // 球道旁的水池：留 3~8 碼的長草緩衝，不吃進落點的球道
  if (par >= 4 && rng() < (W.side || 0)) water.push({ from: land - 40, to: land + 45, side: pick(['L', 'R']), w: Math.round(rr(22, 40)), gap: Math.round(rr(3, 8)) });
  if (rng() < (W.green || 0)) water.push({ g: pick(['F', 'FR', 'FL', 'R', 'L', 'B']), size: [Math.round(rr(14, 24)), Math.round(rr(10, 20))] });
  if (par === 3 && rng() < (W.front || 0)) tok.push('wc');
  if (par >= 4 && rng() < (W.creek || 0)) tok.push('xc');
  if (water.length) spec.water = water;
  // 起伏：每洞一種地形劇本（平坦、高台開球、爬坡到高果嶺、谷地、山脊、五桿洞的兩段平台），開球落點一定是平台
  if (P.elev) spec.elev = elevPlan(par, white, land, land2, P.elev, rng);
  // 果嶺（坡度依果嶺速度封頂：越快的果嶺越平，旗位附近的球才停得住）
  const G = P.green;
  const gw = Math.round(rr(G.size[0], G.size[1]) * (par === 3 ? 0.9 : 1)), gl = Math.round(rr(G.size[0], G.size[1]) * (par === 5 ? 1.1 : 1));
  spec.green = { size: [Math.min(gw, gl), Math.max(gw, gl)], slope: Math.round(rr(G.slope[0], G.slope[1]) * 1000) / 1000, side: Math.round(rr(-0.008, 0.008) * 1000) / 1000, rot: Math.round(rr(-25, 25)) };
  if (rng() < (G.tier || 0) && spec.green.size[1] >= 26) spec.green.tier = true;      // 小果嶺不做雙層（整個果嶺都是斜面）
  if (G.crown) spec.green.crown = Math.round(G.crown * rr(0.7, 1.1) * 100) / 100;
  // 狗腿內側的樹叢：種在落點之後的轉角（擋住第二桿抄近路），不會擋到開球的球路
  if (par >= 4 && Math.abs(bend) >= 15 && rng() < (P.rows ?? 0.4)) spec.trees = [{ at: (spec.bendAt || land) + 25, side: bend > 0 ? 'R' : 'L', n: 8, len: 45, gap: 5 }];
  if (rng() < (P.ob || 0)) spec.ob = pick(['L', 'R']);
  if (P.sea && P.sea.holes.includes(i + 1)) tok.push(P.sea.side === 'L' ? 'sl' : 'sr');
  if (P.waste) tok.push('ww');
  // 荒地 / 沙地型的球場：果嶺旁有一塊荒地（很難切）；林克斯與石南荒原：草坑
  if (P.waste && rng() < 0.4) spec.waste = [{ g: pick(['L', 'R', 'BL', 'BR']) }];
  if ((c.style === 'links' || c.treeKind === 'heath' || c.treeKind === 'gorse') && rng() < 0.45) (spec.bunkers = spec.bunkers || []).push({ g: pick(['L', 'R', 'B', 'FL', 'FR']), grass: true });
  if (P.nw && rng() < P.nw) tok.push('nw');
  if (P.wd && rng() < P.wd) tok.push('wd');
  if (P.up && par >= 4 && rng() < P.up) tok.push(rng() < 0.5 ? 'up' : 'dn');
  // 指定的特徵（知名的洞）：tok 加在後面、tokSet 整個換掉、spec 的欄位直接蓋過
  if (o.tokSet) tok.length = 0;
  for (const t of o.tok || []) tok.push(t);
  if (o.spec) Object.assign(spec, o.spec);
  if (o.green) spec.green = { ...spec.green, ...o.green };
  // 指定的起伏也要有落點平台（知名洞的描述常常只給兩個點）、果嶺坡度封頂
  if (o.spec && o.spec.elev) spec.elev = flattenLanding(spec.elev, par, land, land2);
  //   雙層果嶺、龜背果嶺本身就有陡的地方，整體坡度再打折
  const sMax = (0.03 - Math.max(0, (c.stimp || 11) - 10) * 0.0025) * (spec.green.tier ? 0.6 : 1) * ((spec.green.crown || 0) > 0.15 ? 0.55 : 1);
  spec.green.slope = Math.max(-sMax, Math.min(sMax, spec.green.slope || 0));
  spec.green.side = Math.max(-0.012, Math.min(0.012, spec.green.side || 0));
  if (spec.green.crown) spec.green.crown = Math.max(-0.25, Math.min(0.32, spec.green.crown));
  spec.note = o.note || autoNote(par, bend, shape, tok, spec);
  if (o.tip) spec.tip = o.tip;
  const nb = (spec.bunkers || []).length;
  const feat = ['b' + Math.min(4, Math.ceil(nb / 2)), ...tok, shape].filter(Boolean).join(' ');
  return [par, yd, bend, feat, 0, spec];
}

// ---------- 起伏的劇本 ----------
//   spec.elev = [[距白梯碼數, 相對發球台高度(公尺)], …]（terrain.js 用 smoothstep 內插，兩點之間中段的坡度約是平均坡度的 1.5 倍）
const r1 = x => Math.round(x * 10) / 10;
function pickW(list, rng) { let w = list.reduce((s, x) => s + x[1], 0) * rng(); for (const x of list) { w -= x[1]; if (w <= 0) return x[0]; } return list[0][0]; }
function elevPlan(par, white, land, land2, A, rng) {
  const a = (lo, hi) => (lo + (hi - lo) * rng()) * A;
  if (par === 3) {
    const k = pickW([['flat', 2], ['down', 3], ['up', 2]], rng);
    return capSlope([[white, r1(k === 'flat' ? a(-0.15, 0.15) : k === 'down' ? -a(0.35, 0.9) : a(0.25, 0.6))]]);
  }
  const k = pickW(par === 4 ? [['flat', 2], ['downTee', 3], ['climb', 3], ['valley', 2], ['ridge', 2]] : [['downTee', 2], ['climb', 2], ['valley', 2], ['ridge', 1], ['steps', 3]], rng);
  let h1, h2, pts;
  switch (k) {
    case 'flat': h1 = a(-0.15, 0.15); pts = [[land - 35, h1], [land + 30, h1], [white, h1 + a(-0.2, 0.2)]]; break;
    case 'downTee': h1 = -a(0.5, 0.9); pts = [[land - 35, h1], [land + 30, h1], [white, h1 + a(-0.25, 0.3)]]; break;                 // 高台開球、一路往下
    case 'climb': h1 = a(-0.1, 0.15); pts = [[land - 35, h1], [land + 30, h1], [white - 45, h1 + a(0.15, 0.3)], [white, h1 + a(0.45, 0.8)]]; break;   // 果嶺在高台上
    case 'valley': h1 = -a(0.4, 0.7); pts = [[land - 35, h1], [land + 30, h1], [white, h1 + a(0.3, 0.6)]]; break;                     // 開球打進谷底、再往上攻
    case 'ridge': h1 = a(0.35, 0.6); pts = [[land - 40, h1], [land + 28, h1], [white, h1 - a(0.3, 0.6)]]; break;                     // 開球上坡到山脊、往下攻果嶺
    default: h1 = a(-0.6, 0.6); h2 = h1 + a(-0.5, 0.5); pts = [[land - 35, h1], [land + 30, h1], [land2 - 30, h2], [land2 + 30, h2], [white, h2 + a(-0.4, 0.4)]];    // 兩段平台
  }
  return capSlope(pts.filter((p, i, arr) => i === 0 || p[0] > arr[i - 1][0] + 5).map(([y, m]) => [Math.round(y), r1(m)]));
}
// 相鄰兩點之間的平均坡度最多 4.5%（中段約 7%）：太陡就把後面的點壓回來
function capSlope(pts) {
  let py = 0, pm = 0;
  return pts.map(([y, m]) => { const max = Math.max(0.5, (y - py) * 0.9144 * 0.045); const mm = Math.max(pm - max, Math.min(pm + max, m)); py = y; pm = mm; return [y, r1(mm)]; });
}
// 知名洞指定的起伏：在落點前後補一個平台（同一個高度）
function flattenLanding(elev, par, land, land2) {
  if (!elev || par < 4) return elev;
  const at = y => { const pts = [[0, 0], ...elev]; for (let i = 1; i < pts.length; i++) if (y <= pts[i][0]) { const [y0, m0] = pts[i - 1], [y1, m1] = pts[i]; return m0 + (m1 - m0) * (y - y0) / ((y1 - y0) || 1); } return pts[pts.length - 1][1]; };
  const out = elev.filter(([y]) => y > 0);
  for (const l of par === 5 ? [land, land2] : [land]) {
    const h = r1(at(l));
    for (let i = out.length - 1; i >= 0; i--) if (Math.abs(out[i][0] - l) < 34) out.splice(i, 1);
    out.push([l - 30, h], [l + 28, h]);
  }
  return capSlope(out.sort((p, q) => p[0] - q[0]));
}

// 自動產生的特徵摘要（洞的介紹）
function autoNote(par, bend, shape, tok, s) {
  const out = [];
  if (par >= 4) {
    const dir = bend < 0 ? '左' : '右', a = Math.abs(bend);
    if (shape === 'S') out.push(par === 5 ? '連續兩個方向相反的彎（S 型）' : 'S 型雙彎');
    else if (shape === 'D') out.push(`繞成大弧形往${dir}彎`);
    else if (a >= 40) out.push(`大狗腿${dir}`);
    else if (a >= 15) out.push(`${shape === 'E' ? '早轉的' : shape === 'J' ? '果嶺前才轉的' : ''}狗腿${dir}`);
    else if (a >= 6) out.push(`微彎向${dir}`);
    else out.push('直洞');
  } else out.push(par === 3 ? '三桿洞' : '');
  if (tok.includes('UP') || tok.includes('up')) out.push('果嶺比發球台高');
  if (tok.includes('DN') || tok.includes('dn')) out.push('一路下坡');
  if (tok.includes('sl')) out.push('左側是海'); if (tok.includes('sr')) out.push('右側是海');
  if (tok.includes('wc')) out.push('要越過果嶺前的水');
  if (tok.includes('IG')) out.push('孤島果嶺');
  if (tok.includes('xc')) out.push('球道中段有溪流橫越');
  for (const w of s.water || []) out.push(w.g ? `果嶺${G_NAME[w.g]}方有水` : `${SIDE_NAME[w.side] || ''}側水池（約 ${w.from}~${w.to} 碼）`);
  for (const w of s.wash || []) out.push(w.at != null ? `約 ${w.at} 碼有乾河床橫越` : `${SIDE_NAME[w.side]}側乾河床`);
  const fb = (s.bunkers || []).filter(b => !b.g), gb = (s.bunkers || []).filter(b => b.g);
  if (fb.some(b => b.side === 'C')) out.push('球道上有橫越的沙坑');
  if (fb.filter(b => b.side !== 'C').length) out.push(`球道沙坑 ${fb.filter(b => b.side !== 'C').reduce((n, b) => n + (b.n || 1), 0)} 個`);
  if (gb.length) out.push(`果嶺邊沙坑 ${gb.length} 個`);
  if (s.ob) out.push(`${SIDE_NAME[s.ob]}側界外`);
  if (s.green && s.green.tier) out.push('雙層果嶺');
  if (s.green && s.green.crown > 0.3) out.push('龜背果嶺（四周往外掉）');
  if (s.green && s.green.crown < -0.2) out.push('碗形果嶺');
  if (s.green && s.green.slope >= 0.03) out.push('果嶺前低後高很陡');
  return out.filter(Boolean).join(' · ');
}

// 差點順序：越長、障礙越多越難
function rankHcp(holes) {
  const score = holes.map(([par, yd, bend, feat, , s], i) => {
    const per = yd / (par === 3 ? 190 : par === 4 ? 420 : 545);
    const haz = (s.water || []).length * 0.12 + (s.bunkers || []).length * 0.03 + (/\b(wc|xc|IG|sl|sr)\b/.test(feat) ? 0.12 : 0) + Math.abs(bend) / 400;
    return [per + haz - (par === 3 ? 0.25 : 0), i];
  }).sort((a, b) => b[0] - a[0]);
  score.forEach(([, i], k) => { holes[i][4] = k + 1; });
  return holes;
}

function build(c) {
  const rng = makeRng(hashStr('creative:' + c.id));
  const holes = c.card.map((_, i) => designHole(c, i, rng));
  const { card, p, over, ...rest } = c;
  return { ...rest, id: 'c_' + c.id, group: 'creative', real: false, creative: true, holes: rankHcp(holes), cardApprox: !!c.approx, card };
}

// ======================================================================
// 球場資料
// ======================================================================
const card = (s) => s.trim().split(/\s+/).map(x => { const [y, p] = x.split('/'); return [Number(y), Number(p)]; });

const DEFS = [];
const add = d => DEFS.push(d);

// ---------------------------------------------------------------- 四大賽與輪替場地 ----------------------------------------------------------------
add({ id: 'augusta', name: '奧古斯塔國家@C', en: 'Augusta National Golf Club @C', area: '美國喬治亞州奧古斯塔', tier: 'major', event: '名人賽（Masters，每年 4 月第 2 週）', diff: 5,
  basis: '喬治亞州丘陵上的舊苗圃：高聳的火炬松、杜鵑與山茱萸，地形大上大下；幾乎沒有長草（只有一小段第二刀草），靠又大又快又斜的果嶺與 Rae\'s Creek 防守。第 11~13 洞是 Amen Corner。',
  desc: '名人賽的家。高聳的火炬松夾著寬闊的球道，春天開滿杜鵑；地形起伏很大，果嶺又快又斜。第 11~13 洞的 Amen Corner 沿著 Rae\'s Creek，第 15、16 洞要越過水池。（自創球場，計分卡照真實，洞形為依公開描述的自創設計）',
  style: 'parkland', treeKind: 'azalea', stimp: 13, firm: 1.15, altitude: 45, temp: 23, wind: [3, 10], fairwayW: 42, roughW: 8, corridor: 72, trees: 1.25,
  card: card('445/4 585/5 350/4 240/3 495/4 180/3 450/4 570/5 460/4 495/4 520/4 155/3 545/5 440/4 550/5 170/3 450/4 465/4'),
  p: { dog: [10, 28], straight: 0.25, elev: 9, fw: [0, 1], gs: [1, 3], cross: 0, w: {}, green: { size: [24, 36], slope: [0.02, 0.034], tier: 0.35 }, rows: 0.5 },
  over: {
    1: { bend: 12, spec: { bunkers: [{ at: 270, side: 'R' }, { g: 'L' }], elev: [[230, 4], [390, 7]] }, note: '茶橄欖（Tea Olive）· 上坡微狗腿右 · 右側深沙坑 · 果嶺後方與右側急降' },
    2: { bend: -25, shape: 'J', spec: { bunkers: [{ at: 255, side: 'R' }, { g: 'FL' }, { g: 'R' }], elev: [[300, -9], [515, -6]] }, note: '粉紅山茱萸（Pink Dogwood）· 一路下坡的狗腿左五桿洞 · 果嶺左前、右側沙坑' },
    10: { bend: -30, shape: 'E', tok: ['DN'], spec: { bunkers: [{ g: 'R', big: true }], elev: [[250, -12], [435, -18]] }, note: '山茶（Camellia）· 落差極大的下坡狗腿左 · 果嶺右側大沙坑' },
    11: { bend: 8, spec: { water: [{ g: 'FL', size: [24, 16] }], bunkers: [{ g: 'BR' }], elev: [[260, -5], [460, -9]] }, note: '白山茱萸（White Dogwood）· Amen Corner 的開始 · 果嶺左前方是水池' },
    12: { bend: -6, tok: ['wc'], green: { size: [32, 13], rot: -22, slope: 0.012 }, spec: { bunkers: [{ g: 'F' }, { g: 'BL' }, { g: 'BR' }] }, note: '金鐘（Golden Bell）· 越過 Rae\'s Creek 的短三桿洞 · 果嶺又寬又淺斜放 · 前一後二沙坑 · 風很難讀' },
    13: { bend: -48, shape: 'E', spec: { water: [{ from: 190, to: 440, side: 'L', ditch: true }, { g: 'F', size: [34, 8] }], bunkers: [{ g: 'BL' }, { g: 'BR' }, { g: 'B' }], trees: [{ at: 190, side: 'L', n: 10, len: 60 }] }, note: '杜鵑（Azalea）· 大狗腿左的五桿洞 · 左側一路是小溪、果嶺前也是 · 兩桿上果嶺的經典賭注' },
    15: { bend: 6, tok: ['wc'], spec: { water: [{ g: 'B', size: [20, 12] }], elev: [[260, -3], [485, -6]] }, note: '火棘（Firethorn）· 五桿洞 · 果嶺前後都是水池 · 敢不敢兩桿攻' },
    16: { bend: -10, spec: { water: [{ from: 5, to: 140, side: 'L', w: 45 }], bunkers: [{ g: 'R' }, { g: 'BR' }], green: { size: [26, 30], slope: 0.012, side: -0.032 } }, note: '紫荊（Redbud）· 整洞左邊是水池的三桿洞 · 果嶺由右往左往水的方向斜' },
    18: { bend: 22, tok: ['up'], spec: { bunkers: [{ at: 285, side: 'L', n: 2 }, { g: 'F', big: true }, { g: 'R' }], elev: [[300, 6], [410, 11]] }, note: '冬青（Holly）· 上坡狗腿右 · 左側兩個球道沙坑 · 果嶺前大沙坑 · 綠夾克的最後一洞' },
  } });

add({ id: 'pinehurst2', name: '派恩赫斯特 2 號@C', en: 'Pinehurst No. 2 @C', area: '美國北卡羅來納州派恩赫斯特', tier: 'major', event: '美國公開賽輪替（6 月）· 也是 U.S. Kids Golf 世界錦標賽的所在地', diff: 5,
  basis: '北卡沙丘地（Sandhills）：沙質土壤、長葉松、沒有長草，球道外是沙地與一叢叢鐵線草；Donald Ross 的龜背果嶺四周往外掉，短桿最考驗。',
  desc: 'Donald Ross 的代表作。球道兩旁沒有長草，只有沙地與鐵線草；果嶺像倒扣的碗，球落點稍偏就往外滾。（自創球場，計分卡照真實）',
  style: 'parkland', treeKind: 'longleaf', stimp: 12, firm: 1.25, altitude: 160, temp: 28, wind: [3, 11], fairwayW: 34, roughW: 4, corridor: 70, trees: 0.8,
  card: card('395/4 504/4 387/4 528/4 588/5 228/3 426/4 488/4 184/3 617/5 482/4 486/4 381/4 472/4 197/3 530/4 207/3 448/4'),
  p: { dog: [8, 22], straight: 0.3, elev: 4, fw: [1, 2], gs: [2, 3], cross: 0.15, waste: true, w: { side: 0.04 }, green: { size: [22, 30], slope: [0.008, 0.016], crown: 0.65 }, rows: 0.2 },
  over: {
    5: { bend: -15, spec: { bunkers: [{ at: 300, side: 'L' }, { g: 'L' }], elev: [[320, 2], [520, 5]] }, green: { crown: 0.9 }, note: '五桿洞 · 果嶺左側沙坑 · 龜背果嶺很難停 · 果嶺比落點高' },
    9: { note: '三桿洞 · 小而突起的龜背果嶺 · 打短會滾回果嶺前、打長滾下後坡' },
    16: { bend: 14, spec: { water: [{ from: 40, to: 180, side: 'R', w: 34 }] }, note: '超長四桿洞 · 開球右側水池 · 龜背果嶺' },
    18: { bend: 18, spec: { bunkers: [{ at: 270, side: 'R' }, { g: 'F' }, { g: 'L' }] }, note: '最後一洞 · 狗腿右 · 1999 年 Payne Stewart 推進冠軍推的果嶺' },
  } });

add({ id: 'oakmont', name: '奧克蒙@C', en: 'Oakmont Country Club @C', area: '美國賓州匹茲堡', tier: 'major', event: '美國公開賽輪替（6 月）', diff: 5,
  basis: '賓州阿勒格尼河谷旁的農地，幾乎砍光了樹，一眼望穿；約 170 個沙坑、深長草、超快且往外傾的果嶺；第 3、4 洞之間有一整片條狀的「教堂座椅」沙坑。',
  desc: '公認最難的美國公開賽場地之一。幾乎沒有樹，沙坑多到數不完，果嶺又快又往外傾；第 3、4 洞之間是有名的教堂座椅沙坑。（自創球場，計分卡照真實）',
  style: 'parkland', treeKind: 'oak', stimp: 14, firm: 1.25, altitude: 300, temp: 26, wind: [3, 12], fairwayW: 30, roughW: 22, corridor: 78, trees: 0.25,
  card: card('488/4 346/4 462/4 611/5 408/4 200/3 485/4 289/3 472/4 461/4 400/4 632/5 182/3 379/4 507/4 236/3 312/4 502/4'),
  p: { dog: [6, 18], straight: 0.35, elev: 5, fw: [2, 4], gs: [2, 4], cross: 0.35, w: { creek: 0.08 }, green: { size: [24, 34], slope: [-0.02, 0.02] }, rows: 0.05, nw: 0.4 },
  over: {
    1: { bend: 6, green: { slope: -0.028 }, spec: { bunkers: [{ at: 270, side: 'L', n: 2 }, { g: 'L' }] }, note: '長四桿洞開局 · 果嶺往外（往後）傾 · 很難停球' },
    3: { bend: 4, spec: { bunkers: [{ at: 230, side: 'L', n: 6, long: true }, { at: 260, side: 'R', n: 2 }, { g: 'L' }, { g: 'R' }] }, note: '左側是一整排「教堂座椅」條狀沙坑 · 右側也有沙坑 · 開球最窄的一洞' },
    4: { bend: -12, spec: { bunkers: [{ at: 240, side: 'L', n: 6, long: true }, { at: 300, side: 'C', n: 3 }, { g: 'F' }, { g: 'R' }] }, note: '五桿洞 · 左邊同一片教堂座椅沙坑 · 果嶺前橫越沙坑' },
    8: { note: '超長三桿洞（約 290 碼）· 果嶺左側是巨大的沙丘' },
    12: { bend: 10, spec: { bunkers: [{ at: 260, side: 'L', n: 2 }, { at: 420, side: 'C', n: 3 }, { g: 'F' }] }, green: { slope: -0.022 }, note: '超過 600 碼的五桿洞 · 果嶺往後傾' },
    17: { bend: 0, spec: { bunkers: [{ at: 230, side: 'C', n: 4 }, { g: 'F', big: true }, { g: 'L' }] }, note: '短四桿洞（可能一桿上果嶺）· 果嶺前一大片沙坑' },
  } });

add({ id: 'shinnecock', name: '辛納科克山@C', en: 'Shinnecock Hills Golf Club @C', area: '美國紐約州長島南岸', tier: 'major', event: '美國公開賽輪替（6 月）', diff: 5,
  basis: '長島南岸，夾在大西洋與皮科尼克灣之間的沙質丘陵：羊茅草長草、風從各個方向吹，球洞朝不同方向排列；第 7 洞是 Redan 式三桿洞，第 9 洞上坡到會館。',
  desc: '美國最古老的俱樂部之一。沙地丘陵上的林克斯感覺，風向一直變；第 7 洞是斜放的 Redan 果嶺。（自創球場，計分卡照真實）',
  style: 'links', treeKind: 'gorse', stimp: 13, firm: 1.25, altitude: 15, temp: 22, wind: [8, 18], fairwayW: 34, roughW: 18, corridor: 80, trees: 0.2,
  card: card('394/4 252/3 501/4 476/4 592/5 495/4 187/3 440/4 482/4 415/4 157/3 469/4 371/4 520/4 409/4 614/5 176/3 490/4'),
  p: { dog: [8, 24], straight: 0.25, elev: 6, fw: [1, 3], gs: [2, 4], cross: 0.2, w: { side: 0.05 }, green: { size: [22, 30], slope: [0.006, 0.02] }, rows: 0 },
  over: {
    7: { bend: 0, green: { size: [16, 32], rot: -38, slope: -0.024, side: -0.02 }, spec: { bunkers: [{ g: 'FL', big: true }, { g: 'BL' }, { g: 'R' }] }, note: 'Redan · 斜放的果嶺由右前往左後掉 · 左前深沙坑 · 要用滾的上果嶺' },
    9: { bend: 6, tok: ['UP'], spec: { bunkers: [{ g: 'F', n: 2 }], elev: [[260, 5], [425, 14]] }, note: 'Ben Nevis · 一路上坡到會館前的果嶺 · 果嶺前兩個沙坑' },
    14: { bend: -22, note: 'Thom\'s Elbow · 狗腿左 · 起伏的林克斯球道' },
  } });

add({ id: 'wingedfoot', name: '翼足西場@C', en: 'Winged Foot Golf Club (West) @C', area: '美國紐約州馬馬羅內克', tier: 'major', event: '美國公開賽輪替（6 月）', diff: 5,
  basis: 'Tillinghast 1923 年的設計：成熟的樹林、又深又陡的沙坑緊緊包住梨形果嶺，長草很深；美國公開賽時第 9、16 洞改成超長四桿洞。',
  desc: 'Tillinghast 的經典：深沙坑緊貼著小而起伏的梨形果嶺，長四桿洞一個接一個。（自創球場，計分卡照真實 · 美國公開賽設定）',
  style: 'parkland', treeKind: 'oak', stimp: 13.5, firm: 1.15, altitude: 40, temp: 24, wind: [3, 10], fairwayW: 30, roughW: 20, corridor: 66, trees: 1.1,
  card: card('451/4 475/4 243/3 461/4 516/5 321/4 167/3 493/4 514/4 194/3 384/4 633/5 219/3 452/4 426/4 490/4 469/4 460/4'),
  p: { dog: [8, 22], straight: 0.3, elev: 4, fw: [0, 1], gs: [3, 4], cross: 0, w: { creek: 0.06 }, green: { size: [18, 30], slope: [0.018, 0.03], tier: 0.2 }, rows: 0.6, nw: 0.3 },
  over: {
    10: { spec: { bunkers: [{ g: 'L', big: true }, { g: 'R', big: true }, { g: 'F' }] }, green: { size: [16, 30] }, note: '三桿洞 · 梨形果嶺被兩側大沙坑夾住' },
    12: { bend: -18, shape: 'J', note: '超過 630 碼的五桿洞 · 果嶺前才往左轉' },
  } });

add({ id: 'torreysouth', name: '托里松南場@C', en: 'Torrey Pines (South) @C', area: '美國加州聖地牙哥', tier: 'major', event: 'Farmers Insurance Open（1 月）· 美國公開賽輪替', diff: 4,
  basis: '聖地牙哥拉荷亞的太平洋海崖上：托里松、峽谷切進球場邊緣，長草是又粗又黏的奇庫猶草；全長超過 7,800 碼。',
  desc: '太平洋海崖上的長距離公眾球場。好幾洞貼著峽谷邊，海風把球往內陸推。（自創球場，計分卡照真實）',
  style: 'parkland', theme: 'cliffs', treeKind: 'eucalyptus', stimp: 11, firm: 1.05, altitude: 100, temp: 20, wind: [6, 15], fairwayW: 32, roughW: 18, corridor: 76, trees: 0.6,
  card: card('451/4 389/4 201/3 490/4 454/4 564/5 462/4 177/3 615/5 454/4 225/3 505/4 621/5 437/4 517/4 227/3 443/4 570/5'),
  p: { dog: [8, 25], straight: 0.25, elev: 6, fw: [1, 2], gs: [2, 3], cross: 0.1, w: { green: 0.05 }, green: { size: [24, 34], slope: [0.01, 0.022] }, rows: 0.3, sea: { holes: [3, 4, 14], side: 'R' } },
  over: {
    3: { tok: ['DN'], note: '下坡三桿洞 · 背景是太平洋 · 果嶺右邊就是海崖' },
    18: { bend: -10, spec: { water: [{ g: 'F', size: [30, 10] }, { g: 'L', size: [18, 22] }] }, note: '五桿洞 · 果嶺前與左邊是池塘 · 兩桿攻的冒險' },
  } });

add({ id: 'lacc', name: '洛杉磯鄉村北場@C', en: 'Los Angeles Country Club (North) @C', area: '美國加州洛杉磯', tier: 'major', event: '美國公開賽輪替（6 月）', diff: 4,
  basis: '洛杉磯比佛利山旁：一條乾河床（barranca）在好幾洞橫越或沿著球道，背景是市區天際線；球道寬、地面硬，有超長三桿洞（290 碼）與只有百來碼的短三桿洞。',
  desc: '市中心旁的一大片綠地。乾河床在球場裡蜿蜒，三桿洞從 120 碼到 290 碼都有。（自創球場，計分卡照真實）',
  style: 'parkland', treeKind: 'eucalyptus', stimp: 12.5, firm: 1.25, altitude: 90, temp: 24, wind: [3, 10], fairwayW: 40, roughW: 14, corridor: 76, trees: 0.6,
  card: card('590/5 497/4 419/4 228/3 480/4 330/4 284/3 537/5 171/3 409/4 290/3 380/4 507/4 623/5 124/3 542/4 520/4 492/4'),
  p: { dog: [8, 26], straight: 0.2, elev: 7, fw: [1, 2], gs: [2, 3], cross: 0.1, waste: false, w: {}, green: { size: [22, 32], slope: [0.012, 0.026] }, rows: 0.2 },
  over: {
    1: { bend: -14, spec: { wash: [{ at: 300, w: 14 }] }, note: '五桿洞開局 · 約 300 碼有乾河床橫越' },
    6: { bend: 18, spec: { wash: [{ from: 60, to: 200, side: 'R', w: 16 }], bunkers: [{ g: 'F' }, { g: 'L' }] }, note: '短四桿洞 · 右側乾河床 · 可以挑戰一桿上果嶺' },
    7: { spec: { bunkers: [{ g: 'F', big: true }, { g: 'R' }] }, note: '約 280 碼的超長三桿洞 · 果嶺前大沙坑' },
    11: { note: '約 290 碼的三桿洞 · 只有長打者能一桿上果嶺' },
    15: { green: { size: [16, 26], slope: 0.018 }, spec: { bunkers: [{ g: 'F' }, { g: 'L' }, { g: 'R' }] }, note: '只有百來碼的迷你三桿洞 · 果嶺被沙坑包圍' },
    17: { bend: 12, spec: { wash: [{ at: 210, w: 18 }] }, note: '長四桿洞 · 開球要飛過乾河床' },
  } });

add({ id: 'oaklandhills', name: '奧克蘭山南場@C', en: 'Oakland Hills (South) @C', area: '美國密西根州布盧姆菲爾德', tier: 'major', event: '美國公開賽輪替（6 月）', diff: 5,
  basis: '密西根起伏的舊農地，外號「怪獸（The Monster）」：大而起伏劇烈的果嶺、整修後砍掉不少樹；第 16 洞狗腿右繞著池塘、果嶺緊貼水邊。',
  desc: '外號怪獸的高難度球場。果嶺大、起伏劇烈；第 16 洞繞著池塘。（自創球場，計分卡照真實）',
  style: 'parkland', treeKind: 'oak', stimp: 13, firm: 1.15, altitude: 250, temp: 24, wind: [4, 12], fairwayW: 32, roughW: 18, corridor: 70, trees: 0.7,
  card: card('443/4 592/5 216/3 482/4 491/4 361/4 421/4 476/4 253/3 496/4 451/4 580/5 181/3 504/4 396/4 425/4 237/3 504/4'),
  p: { dog: [10, 26], straight: 0.2, elev: 6, fw: [1, 3], gs: [2, 4], cross: 0.1, w: { green: 0.05 }, green: { size: [26, 38], slope: [0.018, 0.032], tier: 0.35 }, rows: 0.4 },
  over: {
    16: { bend: 38, shape: 'J', spec: { water: [{ from: 270, to: 380, side: 'R', w: 40, gap: 4 }, { g: 'FR', size: [26, 18] }], bunkers: [{ g: 'BL' }, { g: 'L' }] }, note: '狗腿右繞著池塘 · 第二桿要越過水打向貼著水邊的果嶺' },
  } });

add({ id: 'birkdale', name: '皇家伯克戴爾@C', en: 'Royal Birkdale Golf Club @C', area: '英國英格蘭紹斯波特', tier: 'major', event: '英國公開賽輪替（7 月）', diff: 4,
  basis: '英格蘭西北海岸的大沙丘之間：球道走在沙丘之間的平谷裡（少有盲打），兩旁是柳樹叢與海濱草；第 15 洞是以會館為背景的三桿洞。',
  desc: '在巨大沙丘之間的平谷中前進的林克斯，觀眾可以坐在沙丘上看球。（自創球場，計分卡照真實）',
  style: 'links', theme: 'dunes', treeKind: 'gorse', stimp: 10.5, firm: 1.3, altitude: 8, temp: 17, wind: [9, 20], fairwayW: 32, roughW: 16, corridor: 78, trees: 0.3,
  card: card('443/4 416/4 444/4 215/3 322/4 512/4 149/3 456/4 411/4 399/4 431/4 183/3 499/4 600/5 237/3 390/4 563/5 506/4'),
  p: { dog: [10, 28], straight: 0.2, elev: 4, fw: [2, 3], gs: [2, 4], cross: 0.25, w: {}, green: { size: [22, 30], slope: [0.008, 0.02] }, rows: 0, up: 0.2 },
  over: {
    12: { tok: ['UP'], note: '藏在沙丘之間的三桿洞 · 果嶺被高大的沙丘包圍' },
    15: { note: '新的三桿洞 · 以會館為背景' },
  } });

add({ id: 'hoylake', name: '皇家利物浦@C', en: 'Royal Liverpool Golf Club (Hoylake) @C', area: '英國英格蘭霍伊萊克', tier: 'major', event: '英國公開賽輪替（7 月）', diff: 4,
  basis: '迪河河口旁幾乎全平的林克斯：球場內有界外（練習場周圍），靠近海的幾洞穿過沙丘；第 17 洞是迷你三桿洞「Little Eye」，背景是河口與小島。',
  desc: '平坦但多風的老林克斯。好幾洞有球場內的界外，靠河口的洞穿過沙丘。（自創球場，計分卡照真實）',
  style: 'links', treeKind: 'gorse', stimp: 10.5, firm: 1.3, altitude: 6, temp: 17, wind: [10, 22], fairwayW: 34, roughW: 16, corridor: 80, trees: 0.15,
  card: card('459/4 453/4 426/4 367/4 520/5 201/3 481/4 436/4 218/3 507/4 392/4 449/4 194/3 454/4 620/5 461/4 136/3 609/5'),
  p: { dog: [8, 25], straight: 0.25, elev: 2, fw: [2, 3], gs: [2, 4], cross: 0.25, ob: 0.25, w: {}, green: { size: [22, 30], slope: [0.006, 0.016] }, rows: 0, sea: { holes: [10, 11, 12], side: 'L' } },
  over: {
    1: { bend: 70, shape: 'E', spec: { ob: 'R' }, note: '直角狗腿右 · 右側是球場內的界外' },
    17: { tok: ['sl'], green: { size: [18, 20], slope: 0.018 }, spec: { bunkers: [{ g: 'F' }, { g: 'L' }, { g: 'R' }] }, note: 'Little Eye · 不到 140 碼的迷你三桿洞 · 果嶺突起、四周往外掉 · 背景是迪河河口' },
    18: { bend: 20, spec: { ob: 'R' }, note: '五桿洞收尾 · 右側界外' },
  } });

add({ id: 'portrush', name: '皇家波特拉什@C', en: 'Royal Portrush (Dunluce) @C', area: '英國北愛爾蘭波特拉什', tier: 'major', event: '英國公開賽輪替（7 月）', diff: 5,
  basis: '北愛爾蘭巨人堤道海岸：巨大的沙丘與海崖，鄧路斯古堡遺跡在遠處；第 5 洞果嶺就在崖邊，第 16 洞「Calamity Corner」要越過深谷。',
  desc: '海崖與巨大沙丘上的林克斯。第 16 洞 Calamity Corner 右邊是深谷。（自創球場，計分卡照真實）',
  style: 'links', theme: 'cliffs', treeKind: 'gorse', stimp: 10.5, firm: 1.3, altitude: 25, temp: 15, wind: [10, 22], fairwayW: 32, roughW: 16, corridor: 78, trees: 0.2,
  card: card('421/4 574/5 177/3 482/4 374/4 194/3 592/5 434/4 432/4 447/4 474/4 532/5 194/3 473/4 426/4 236/3 408/4 474/4'),
  p: { dog: [10, 30], straight: 0.2, elev: 7, fw: [1, 2], gs: [1, 3], cross: 0.1, ob: 0.15, w: {}, green: { size: [22, 30], slope: [0.01, 0.024] }, rows: 0, sea: { holes: [5, 6, 7, 14, 15], side: 'L' } },
  over: {
    1: { spec: { ob: 'L' }, note: 'Hughie · 兩側都有界外的開球' },
    5: { bend: 35, tok: ['sl'], spec: { ob: 'L' }, note: 'White Rocks · 狗腿右往海邊 · 果嶺就在崖邊，打過頭就掉下海' },
    16: { tok: ['xc'], green: { slope: 0.014 }, note: 'Calamity Corner · 約 230 碼的三桿洞 · 中間是一道深谷 · 打短就是災難' },
  } });

add({ id: 'muirfield', name: '繆菲爾德@C', en: 'Muirfield @C', area: '英國蘇格蘭格蘭（福斯灣）', tier: 'major', event: '英國公開賽輪替（7 月）', diff: 4,
  basis: '福斯灣南岸：前九洞順時針、後九洞逆時針兩個圈，風從每個角度吹；沙坑是陡峭的草皮砌壁（revetted）壺穴，幾乎沒有盲打，被認為最公平的林克斯。',
  desc: '兩個方向相反的圈讓風一直換方向；陡壁壺穴沙坑多而深。（自創球場，計分卡照真實）',
  style: 'links', treeKind: 'gorse', stimp: 10.5, firm: 1.3, altitude: 10, temp: 16, wind: [9, 20], fairwayW: 30, roughW: 18, corridor: 76, trees: 0.15,
  card: card('450/4 367/4 379/4 229/3 561/5 469/4 187/3 445/4 558/5 472/4 389/4 382/4 193/3 478/4 447/4 188/3 578/5 473/4'),
  p: { dog: [8, 20], straight: 0.35, elev: 3, fw: [2, 4], gs: [3, 4], cross: 0.35, w: {}, green: { size: [20, 28], slope: [0.006, 0.016] }, rows: 0 },
  over: {
    9: { bend: -10, spec: { ob: 'L' }, note: '五桿洞 · 左側是石牆界外 · 球道中間有一個孤立的沙坑' },
    18: { spec: { bunkers: [{ at: 260, side: 'L' }, { at: 275, side: 'R' }, { g: 'L' }, { g: 'R' }, { g: 'F' }] }, note: '最後一洞 · 果嶺被一圈壺穴沙坑包圍' },
  } });

add({ id: 'lytham', name: '皇家萊瑟姆@C', en: 'Royal Lytham & St Annes @C', area: '英國英格蘭聖安妮斯', tier: 'major', event: '英國公開賽輪替（7 月）', diff: 4,
  basis: '被住宅與鐵路圍繞、看不到海的「內陸林克斯」：前幾洞右側是鐵路（界外），將近 170 個沙坑；以三桿洞開局是英國公開賽唯一。',
  desc: '看不到海的林克斯，右邊有鐵路，沙坑多到數不完；用三桿洞開局。（自創球場，計分卡照真實）',
  style: 'links', treeKind: 'gorse', stimp: 10.5, firm: 1.25, altitude: 10, temp: 16, wind: [8, 18], fairwayW: 30, roughW: 16, corridor: 74, trees: 0.25,
  card: card('205/3 481/4 478/4 392/4 219/3 492/4 592/5 416/4 165/3 387/4 598/5 198/3 355/4 444/4 462/4 336/4 453/4 413/4'),
  p: { dog: [8, 24], straight: 0.3, elev: 2, fw: [3, 4], gs: [3, 4], cross: 0.4, w: {}, green: { size: [20, 28], slope: [0.006, 0.016] }, rows: 0.1 },
  over: {
    2: { spec: { ob: 'R' }, note: '右側是鐵路（界外）' }, 3: { spec: { ob: 'R' }, note: '鐵路沿著右側 · 長四桿洞' },
    8: { spec: { ob: 'R' }, note: '鐵路界外仍在右邊' },
  } });

add({ id: 'whistling', name: '呢喃海峽@C', en: 'Whistling Straits (Straits) @C', area: '美國威斯康辛州科勒', tier: 'major', event: 'PGA 錦標賽輪替（5 月）', diff: 5,
  basis: '密西根湖岸兩英里長、人工堆出的愛爾蘭風林克斯：上千個沙坑（很多是荒地沙地）、羊茅草、沙丘；四個三桿洞都沿著湖邊。',
  desc: '沿著密西根湖的人工林克斯，沙坑多到上千個；三桿洞全部貼著湖岸。（自創球場，計分卡照真實）',
  style: 'links', theme: 'cliffs', treeKind: 'gorse', stimp: 12, firm: 1.2, altitude: 180, temp: 20, wind: [9, 22], fairwayW: 34, roughW: 16, corridor: 78, trees: 0.1,
  card: card('408/4 593/5 181/3 489/4 603/5 355/4 221/3 507/4 446/4 361/4 563/5 143/3 404/4 397/4 518/4 569/5 223/3 520/4'),
  p: { dog: [10, 30], straight: 0.2, elev: 8, fw: [3, 5], gs: [3, 4], cross: 0.35, waste: true, w: {}, green: { size: [24, 34], slope: [0.01, 0.024] }, rows: 0, sea: { holes: [3, 7, 12, 17, 6, 8, 13, 16], side: 'L' } },
  over: {
    17: { tok: ['sl', 'DN'], spec: { bunkers: [{ g: 'R', big: true }, { g: 'F' }] }, note: 'Pinched Nerve · 沿著湖邊往下打的三桿洞 · 左邊是湖岸峭壁' },
    18: { bend: -12, spec: { water: [{ from: 300, to: 330, side: 'R', ditch: true }, { g: 'F', size: [34, 8] }] }, note: '最後一洞 · 第二桿要越過溪流 · 果嶺前也是溪' },
  } });

add({ id: 'valhalla', name: '瓦爾哈拉@C', en: 'Valhalla Golf Club @C', area: '美國肯塔基州路易斯維爾', tier: 'major', event: 'PGA 錦標賽輪替（5 月）', diff: 4,
  basis: 'Nicklaus 設計的肯塔基草原：弗洛伊茲溪（Floyds Fork）貫穿，第 13 洞「石灰岩洞」果嶺在溪中的石灰岩島上；第 7 洞是分岔球道的五桿洞。',
  desc: 'Nicklaus 設計、溪流貫穿的大場地。第 13 洞果嶺被溪水和石灰岩包圍。（自創球場，計分卡照真實）',
  style: 'parkland', treeKind: 'oak', stimp: 12.5, firm: 1.1, altitude: 180, temp: 27, wind: [4, 12], fairwayW: 36, roughW: 18, corridor: 74, trees: 0.6,
  card: card('484/4 500/4 208/3 372/4 463/4 495/4 597/5 190/3 415/4 590/5 211/3 494/4 351/4 254/3 435/4 508/4 472/4 570/5'),
  p: { dog: [10, 28], straight: 0.2, elev: 6, fw: [1, 3], gs: [2, 3], cross: 0.1, w: { side: 0.15, creek: 0.2, green: 0.08 }, green: { size: [26, 36], slope: [0.012, 0.026], tier: 0.3 }, rows: 0.4 },
  over: {
    5: { green: { tier: false } },
    7: { bend: -8, spec: { bunkers: [{ at: 280, side: 'C', n: 2 }], water: [{ from: 240, to: 360, side: 'R', ditch: true }] }, note: '分岔球道的五桿洞 · 走左邊比較近但要越過溪' },
    13: { bend: 0, tok: ['IG'], green: { size: [22, 24] }, note: '石灰岩洞 · 果嶺立在溪中的石灰岩島上 · 短四桿洞的大挑戰' },
    18: { bend: -15, spec: { water: [{ from: 240, to: 400, side: 'R', w: 34 }] }, note: '五桿洞收尾 · 右側水 · 1996、2000 年都在這裡延長賽' },
  } });

add({ id: 'quailhollow', name: '鵪鶉谷@C', en: 'Quail Hollow Club @C', area: '美國北卡羅來納州夏洛特', tier: 'major', event: 'PGA 錦標賽輪替（5 月）· Truist Championship', diff: 5,
  basis: '夏洛特起伏的林地：最後三洞被稱為「綠色一英里（Green Mile）」——第 16 洞果嶺左邊是湖、第 17 洞三桿洞果嶺突出在湖中、第 18 洞左邊一路是小溪。',
  desc: '最後三洞的 Green Mile 是巡迴賽最難的收尾之一。（自創球場，計分卡照真實）',
  style: 'parkland', treeKind: 'oak', stimp: 12.5, firm: 1.1, altitude: 185, temp: 26, wind: [3, 10], fairwayW: 32, roughW: 16, corridor: 70, trees: 0.9,
  card: card('505/4 452/4 483/4 184/3 449/4 249/3 546/5 346/4 530/4 592/5 462/4 456/4 205/3 344/4 577/5 529/4 223/3 494/4'),
  p: { dog: [10, 26], straight: 0.2, elev: 7, fw: [1, 2], gs: [2, 3], cross: 0.05, w: { green: 0.06 }, green: { size: [24, 34], slope: [0.014, 0.026] }, rows: 0.5 },
  over: {
    14: { tok: ['wc'], note: '可以一桿上果嶺的短四桿洞 · 果嶺左前是水' },
    16: { bend: -12, spec: { water: [{ g: 'L', size: [24, 30] }] }, note: 'Green Mile ① · 長四桿洞 · 果嶺左側緊貼著湖' },
    17: { tok: ['wc'], spec: { water: [{ g: 'L', size: [24, 26] }] }, green: { size: [22, 30], rot: 20 }, note: 'Green Mile ② · 往下打的三桿洞 · 果嶺突出在湖裡' },
    18: { bend: 20, spec: { water: [{ from: 20, to: 470, side: 'L', ditch: true }], bunkers: [{ at: 280, side: 'R', long: true }] }, note: 'Green Mile ③ · 左側一路是小溪 · 右側長沙坑' },
  } });

add({ id: 'southernhills', name: '南山@C', en: 'Southern Hills Country Club @C', area: '美國奧克拉荷馬州土爾沙', tier: 'major', event: 'PGA 錦標賽輪替（5 月）', diff: 4,
  basis: '奧克拉荷馬夏天的炎熱丘陵：小溪在球場裡穿梭（第 12 洞果嶺前是溪）、Perry Maxwell 的起伏球道，果嶺周圍的短草區把球帶走。',
  desc: '炎熱的大平原丘陵球場，小溪穿梭其中；第 12 洞果嶺前的溪是經典。（自創球場，計分卡照真實）',
  style: 'parkland', treeKind: 'oak', stimp: 12, firm: 1.2, altitude: 230, temp: 33, wind: [6, 16], fairwayW: 32, roughW: 14, corridor: 70, trees: 0.8,
  card: card('468/4 500/4 472/4 377/4 656/5 214/3 489/4 251/3 391/4 441/4 173/3 456/4 632/5 230/3 417/4 527/4 371/4 491/4'),
  p: { dog: [10, 26], straight: 0.2, elev: 6, fw: [1, 2], gs: [2, 3], cross: 0.05, w: { creek: 0.25, green: 0.06 }, green: { size: [22, 32], slope: [0.016, 0.028] }, rows: 0.4 },
  over: {
    12: { bend: -15, tok: ['wc'], note: '果嶺前有小溪橫過的四桿洞' },
    18: { tok: ['UP'], spec: { water: [{ from: 210, to: 250, side: 'R', ditch: true }] }, note: '上坡收尾 · 開球落點附近有溪' },
  } });

add({ id: 'oakhill', name: '橡樹山東場@C', en: 'Oak Hill Country Club (East) @C', area: '美國紐約州羅徹斯特', tier: 'major', event: 'PGA 錦標賽輪替（5 月）', diff: 4,
  basis: '羅徹斯特郊外的舊農地，種滿了上萬棵橡樹：艾倫溪（Allen Creek）在 8 個洞成為側邊水障礙；第 14 洞是可以一桿上果嶺的短四桿洞，第 15 洞三桿洞越過池塘。',
  desc: '橡樹林與艾倫溪構成的經典美式林木球場。（自創球場，計分卡照真實）',
  style: 'parkland', treeKind: 'oak', stimp: 12.5, firm: 1.1, altitude: 150, temp: 24, wind: [4, 12], fairwayW: 30, roughW: 18, corridor: 66, trees: 1.2,
  card: card('460/4 405/4 230/3 615/5 180/3 500/4 460/4 430/4 480/4 430/4 245/3 400/4 625/5 320/4 160/3 460/4 500/4 490/4'),
  p: { dog: [8, 24], straight: 0.25, elev: 5, fw: [1, 2], gs: [2, 3], cross: 0.05, w: { side: 0.35, creek: 0.15 }, green: { size: [22, 30], slope: [0.016, 0.026] }, rows: 0.6, nw: 0.3 },
  over: {
    14: { bend: 0, tok: ['up'], spec: { bunkers: [{ g: 'F', n: 2 }, { g: 'R' }] }, note: '約 320 碼的短四桿洞 · 可以一桿上果嶺 · 果嶺前沙坑' },
    15: { tok: ['wc'], note: '三桿洞 · 果嶺右前方是池塘' },
  } });

add({ id: 'bethpage', name: '貝斯佩奇黑場@C', en: 'Bethpage Black @C', area: '美國紐約州長島法明代爾', tier: 'major', event: 'PGA 錦標賽輪替（5 月）· 萊德盃', diff: 5,
  basis: '長島的公眾球場，第 1 洞旁的牌子警告「只建議非常有技術的球員」：Tillinghast 的巨大沙坑橫在山坡上，果嶺多在高處；第 4 洞五桿洞的沙坑一層一層疊上坡。',
  desc: '最難的公眾球場之一。巨大沙坑一層一層疊在山坡上，果嶺多半比落點高。（自創球場，計分卡照真實）',
  style: 'parkland', treeKind: 'oak', stimp: 12.5, firm: 1.1, altitude: 40, temp: 24, wind: [5, 14], fairwayW: 30, roughW: 22, corridor: 70, trees: 0.9,
  card: card('430/4 389/4 230/3 517/5 478/4 408/4 524/4 210/3 460/4 502/4 435/4 515/4 608/5 161/3 484/4 490/4 207/3 411/4'),
  p: { dog: [10, 26], straight: 0.2, elev: 7, fw: [2, 3], gs: [2, 4], cross: 0.25, w: {}, green: { size: [22, 30], slope: [0.016, 0.028] }, rows: 0.4, up: 0.35 },
  over: {
    4: { bend: -20, tok: ['UP'], spec: { bunkers: [{ at: 240, side: 'L', long: true }, { at: 330, side: 'C', n: 3 }, { at: 360, side: 'L', long: true }, { g: 'F' }] }, note: '五桿洞 · 巨大的沙坑一層一層疊上山坡 · 果嶺在最高處' },
    15: { tok: ['UP'], spec: { bunkers: [{ g: 'F', n: 2 }, { g: 'L' }] }, note: '第二桿往上打向高高在上的果嶺' },
  } });

add({ id: 'aronimink', name: '阿羅尼明克@C', en: 'Aronimink Golf Club @C', area: '美國賓州費城郊區', tier: 'major', event: 'PGA 錦標賽輪替（5 月）', diff: 4,
  basis: 'Donald Ross 在費城郊外的起伏地形上設計：傾斜的球道、很多狗腿、約 75 個沙坑，果嶺多架高；Ross 說這是他最好的作品之一。',
  desc: 'Donald Ross 的起伏丘陵球場，狗腿多、果嶺架高。（自創球場，計分卡照真實）',
  style: 'parkland', treeKind: 'oak', stimp: 12, firm: 1.1, altitude: 100, temp: 25, wind: [4, 11], fairwayW: 32, roughW: 16, corridor: 70, trees: 0.9,
  card: card('434/4 413/4 455/4 457/4 159/3 402/4 396/4 242/3 605/5 444/4 425/4 466/4 385/4 221/3 515/4 556/5 229/3 463/4'),
  p: { dog: [12, 30], straight: 0.1, elev: 7, fw: [1, 2], gs: [2, 4], cross: 0.1, w: { green: 0.04 }, green: { size: [22, 32], slope: [0.016, 0.028], crown: 0.25 }, rows: 0.5, up: 0.3 },
  over: {} });

// ---------------------------------------------------------------- PGA TOUR 賽事場地 ----------------------------------------------------------------
add({ id: 'kapalua', name: '卡帕魯亞種植園@C', en: 'Kapalua Plantation Course @C', area: '美國夏威夷茂宜島', tier: 'pga', event: 'The Sentry 開幕戰（1 月）', diff: 3,
  basis: '茂宜島西北的山坡舊鳳梨田：大落差、超寬球道與超大果嶺、強勁的信風；第 18 洞是一路下坡往海的 670 碼五桿洞，標準桿 73。',
  desc: '夏威夷山坡上的開幕戰場地：球道寬、果嶺大、信風強，遠處是莫洛凱島。（自創球場，計分卡照真實）',
  style: 'parkland', theme: 'tropical', treeKind: 'tropic', stimp: 11, firm: 1.1, altitude: 120, temp: 26, wind: [10, 22], fairwayW: 50, roughW: 14, corridor: 82, trees: 0.4,
  card: card('520/4 219/3 424/4 422/4 526/5 424/4 522/4 199/3 550/5 384/4 161/3 424/4 383/4 301/4 541/5 369/4 550/4 677/5'),
  p: { dog: [10, 30], straight: 0.2, elev: 14, fw: [0, 1], gs: [1, 2], cross: 0, waste: true, w: {}, green: { size: [30, 44], slope: [0.016, 0.03] }, rows: 0.1, sea: { holes: [5], side: 'R' } },
  over: { 5: { tok: ['sr'], note: '五桿洞 · 第二桿要越過海灣邊的峽谷' }, 18: { bend: -10, tok: ['DN'], spec: { elev: [[300, -14], [600, -26]] }, note: '一路往海下坡的 670 碼五桿洞 · 順風時兩桿就上得去' } } });

add({ id: 'waialae', name: '懷阿萊@C', en: 'Waialae Country Club @C', area: '美國夏威夷歐胡島檀香山', tier: 'pga', event: 'Sony Open（1 月）', diff: 2,
  basis: '檀香山海邊的平坦球場：一排排椰子樹、鑽石頭山在背景、信風從海上吹來；狗腿多、球道窄。',
  desc: '海邊平坦的椰子樹球場，風是最大的敵人。（自創球場，計分卡依公開資料整理，約略）', approx: true,
  style: 'parkland', theme: 'tropical', treeKind: 'tropic', stimp: 11, firm: 1.05, altitude: 3, temp: 26, wind: [8, 18], fairwayW: 30, roughW: 14, corridor: 70, trees: 0.8,
  card: card('480/4 427/4 425/4 203/3 465/4 460/4 176/3 454/4 506/5 351/4 194/3 451/4 476/4 436/4 398/4 417/4 192/3 551/5'),
  p: { dog: [12, 32], straight: 0.15, elev: 1, fw: [1, 2], gs: [2, 3], cross: 0, w: { side: 0.05 }, green: { size: [22, 30], slope: [0.008, 0.016] }, rows: 0.5, sea: { holes: [1, 13, 16], side: 'L' } },
  over: { 18: { bend: -25, note: '五桿洞收尾 · 狗腿左 · 常常兩桿上果嶺決勝負' } } });

add({ id: 'pgawest', name: 'PGA 西部體育場球場@C', en: 'PGA West (Stadium Course) @C', area: '美國加州拉昆塔', tier: 'pga', event: 'The American Express（1 月）', diff: 4,
  basis: '加州沙漠的 Pete Dye 作品：枕木護岸的水池、深沙坑、荒地；第 16 洞果嶺左邊是將近 6 公尺深的沙坑，第 17 洞「惡魔島」是孤島果嶺，背景是聖哈辛托山。',
  desc: 'Pete Dye 的沙漠惡夢：深沙坑、枕木護岸、第 17 洞孤島果嶺。（自創球場，計分卡約略）', approx: true,
  style: 'parkland', theme: 'dunes', treeKind: 'desert', stimp: 12, firm: 1.2, altitude: 20, temp: 24, wind: [3, 10], fairwayW: 32, roughW: 10, corridor: 72, trees: 0.4,
  card: card('451/4 394/4 435/4 200/3 533/5 193/3 440/4 553/5 453/4 447/4 590/5 353/4 226/3 427/4 460/4 571/5 168/3 440/4'),
  p: { dog: [10, 30], straight: 0.2, elev: 3, fw: [1, 3], gs: [2, 4], cross: 0.15, waste: true, w: { side: 0.3, green: 0.2 }, green: { size: [22, 30], slope: [0.016, 0.028] }, rows: 0 },
  over: { 16: { bend: -20, spec: { bunkers: [{ g: 'L', big: true }, { at: 300, side: 'L', long: true }] }, note: '五桿洞 · 果嶺左邊是將近 6 公尺深的巨大沙坑' },
    17: { tok: ['IG'], note: '惡魔島（Alcatraz）· 孤島果嶺三桿洞' }, 18: { bend: -12, spec: { water: [{ from: 60, to: 420, side: 'L', w: 34 }] }, note: '左側一路是水的收尾洞' } } });

add({ id: 'tpcscottsdale', name: 'TPC 斯科茨代爾體育場@C', en: 'TPC Scottsdale (Stadium) @C', area: '美國亞利桑那州斯科茨代爾', tier: 'pga', event: 'WM 鳳凰城公開賽（2 月）', diff: 3,
  basis: '索諾拉沙漠：球道外是沙漠荒地與仙人掌；第 15 洞五桿洞孤島果嶺、第 16 洞是被看台完全包圍的三桿洞、第 17 洞可一桿上果嶺的短四桿洞左邊是水。',
  desc: '最熱鬧的比賽場地：第 16 洞三桿洞被看台整個包圍。沙漠荒地、仙人掌，最後四洞充滿刺激。（自創球場，計分卡照真實）',
  style: 'parkland', theme: 'dunes', treeKind: 'desert', stimp: 12, firm: 1.2, altitude: 470, temp: 22, wind: [3, 10], fairwayW: 36, roughW: 8, corridor: 74, trees: 0.4,
  card: card('403/4 442/4 558/5 183/3 470/4 432/4 215/3 475/4 453/4 428/4 472/4 192/3 558/5 490/4 553/5 163/3 332/4 442/4'),
  p: { dog: [8, 24], straight: 0.2, elev: 3, fw: [1, 3], gs: [2, 3], cross: 0.05, waste: true, w: { side: 0.12 }, green: { size: [24, 34], slope: [0.012, 0.024] }, rows: 0 },
  over: { 15: { bend: -10, spec: { water: [{ g: 'F', size: [36, 12] }, { g: 'L', size: [16, 26] }] }, tok: ['IG'], note: '五桿洞 · 孤島果嶺 · 兩桿攻要越過水' },
    16: { spec: { bunkers: [{ g: 'L' }, { g: 'R' }] }, note: '體育場三桿洞 · 被看台完全包圍 · 觀眾比球員還吵' },
    17: { bend: 0, spec: { water: [{ g: 'L', size: [22, 30] }] }, note: '約 330 碼的短四桿洞 · 可以一桿上果嶺 · 左邊是水' },
    18: { bend: 15, spec: { water: [{ from: 200, to: 300, side: 'L', w: 34 }] }, note: '開球左側水池 · 右側沙坑' } } });

add({ id: 'riviera', name: '里維埃拉@C', en: 'Riviera Country Club @C', area: '美國加州太平洋帕利塞德', tier: 'pga', event: 'Genesis Invitational（2 月）· 2028 奧運', diff: 4,
  basis: '洛杉磯西邊的峽谷裡：乾河床（barranca）穿過球場、奇庫猶草與尤加利樹；第 6 洞果嶺中間有一個沙坑，第 10 洞是可以一桿上的短四桿洞，第 18 洞上坡打向圓形劇場般的會館。',
  desc: '「霍根的小路」。乾河床穿梭其中，第 6 洞果嶺中間有沙坑、第 10 洞是經典短四桿洞。（自創球場，計分卡照真實）',
  style: 'parkland', treeKind: 'eucalyptus', stimp: 12, firm: 1.15, altitude: 90, temp: 20, wind: [3, 10], fairwayW: 30, roughW: 16, corridor: 66, trees: 0.9,
  card: card('503/5 471/4 434/4 236/3 434/4 199/3 408/4 433/4 458/4 315/4 583/5 479/4 459/4 192/3 487/4 166/3 590/5 475/4'),
  p: { dog: [8, 26], straight: 0.2, elev: 6, fw: [1, 2], gs: [2, 3], cross: 0.1, w: {}, green: { size: [22, 30], slope: [0.014, 0.026] }, rows: 0.5 },
  over: { 1: { tok: ['DN'], note: '從會館旁的高台往下打的五桿洞' },
    6: { green: { size: [26, 30], crown: -0.2 }, spec: { bunkers: [{ g: 'F' }, { g: 'L' }, { g: 'R' }] }, note: '果嶺中間有一個沙坑（遊戲裡放在果嶺正前方）· 推桿可能得繞過去' },
    10: { bend: 18, spec: { bunkers: [{ g: 'L', big: true }, { g: 'FR' }, { at: 230, side: 'C', n: 2 }] }, green: { size: [16, 32], rot: 30 }, note: '約 315 碼短四桿洞 · 斜窄的果嶺 · 一桿攻或安全過渡' },
    12: { spec: { wash: [{ from: 300, to: 400, side: 'R', w: 14 }] }, note: '右側是乾河床' },
    18: { bend: 20, tok: ['UP'], note: '上坡打向圓形劇場般的會館 · 盲打的開球' } } });

add({ id: 'bayhill', name: '貝山@C', en: 'Bay Hill Club & Lodge @C', area: '美國佛州奧蘭多', tier: 'pga', event: 'Arnold Palmer Invitational（3 月）', diff: 4,
  basis: '奧蘭多巴特勒湖群旁：第 6 洞五桿洞繞著湖、第 16 洞果嶺前是水、第 17 洞三桿洞越過水、第 18 洞果嶺右邊是水池與石牆。',
  desc: '阿諾·帕瑪的球場。湖泊圍繞，最後三洞都要過水。（自創球場，計分卡照真實）',
  style: 'parkland', treeKind: 'florida', stimp: 13, firm: 1.15, altitude: 30, temp: 26, wind: [5, 14], fairwayW: 32, roughW: 18, corridor: 72, trees: 0.6,
  card: card('461/4 231/3 434/4 561/5 390/4 555/5 199/3 460/4 474/4 400/4 438/4 574/5 370/4 215/3 429/4 511/5 221/3 458/4'),
  p: { dog: [10, 28], straight: 0.2, elev: 1, fw: [1, 2], gs: [2, 3], cross: 0, w: { side: 0.25, green: 0.1 }, green: { size: [24, 32], slope: [0.012, 0.022] }, rows: 0.3 },
  over: { 6: { bend: -45, shape: 'D', spec: { water: [{ from: 50, to: 500, side: 'L', w: 60, gap: 6 }] }, note: '繞著湖的大狗腿左五桿洞 · 越過湖切越多越近' },
    16: { tok: ['wc'], note: '五桿洞 · 果嶺前是水' }, 17: { tok: ['wc'], note: '三桿洞 · 越過水打向斜放的果嶺' },
    18: { bend: 12, spec: { water: [{ g: 'R', size: [20, 34] }, { g: 'FR', size: [16, 14] }], bunkers: [{ g: 'BL' }, { g: 'L' }] }, note: '果嶺右邊與右前方是水池與石牆 · 冠軍推桿的舞台' } } });

add({ id: 'pganational', name: 'PGA 國家冠軍球場@C', en: 'PGA National (Champion) @C', area: '美國佛州棕櫚灘花園', tier: 'pga', event: 'Cognizant Classic（2 月）', diff: 4,
  basis: '佛州東南的平坦水鄉：Nicklaus 重新設計，第 15~17 洞「熊陷阱」——第 15 洞三桿洞越過水、第 16 洞狗腿右越過水、第 17 洞三桿洞右邊是水，加上南佛州的強風。',
  desc: '「熊陷阱」三洞是巡迴賽最可怕的一段。（自創球場，計分卡照真實）',
  style: 'parkland', treeKind: 'florida', stimp: 12, firm: 1.1, altitude: 5, temp: 25, wind: [8, 18], fairwayW: 30, roughW: 16, corridor: 70, trees: 0.5,
  card: card('365/4 437/4 538/5 376/4 171/3 488/5 226/3 427/4 404/4 545/5 450/4 427/4 388/4 465/4 179/3 434/4 172/3 556/5'),
  p: { dog: [10, 28], straight: 0.2, elev: 1, fw: [1, 2], gs: [2, 3], cross: 0, w: { side: 0.3, green: 0.12, front: 0.3 }, green: { size: [22, 30], slope: [0.012, 0.022] }, rows: 0.3 },
  over: { 15: { tok: ['wc'], spec: { water: [{ g: 'R', size: [18, 24] }] }, note: '熊陷阱 ① · 越過水的三桿洞 · 常常逆風' },
    16: { bend: 35, spec: { water: [{ from: 200, to: 380, side: 'R', w: 50 }] }, note: '熊陷阱 ② · 狗腿右 · 第二桿越過水' },
    17: { spec: { water: [{ g: 'R', size: [20, 30] }, { g: 'F', size: [24, 10] }] }, note: '熊陷阱 ③ · 三桿洞 · 果嶺右邊與前方是水' } } });

add({ id: 'copperhead', name: '茵尼斯布魯克銅頭蛇@C', en: 'Innisbrook (Copperhead) @C', area: '美國佛州帕姆港', tier: 'pga', event: 'Valspar Championship（3 月）', diff: 4,
  basis: '佛州少見的起伏丘陵：高大的松樹夾道、狗腿多；最後三洞叫「蛇窟（Snake Pit）」，第 16 洞狗腿右越過水。',
  desc: '佛州最不像佛州的球場：有起伏、松林夾道。最後三洞是「蛇窟」。（自創球場，計分卡照真實）',
  style: 'parkland', treeKind: 'florida', stimp: 12, firm: 1.1, altitude: 20, temp: 25, wind: [4, 12], fairwayW: 28, roughW: 16, corridor: 64, trees: 1.2,
  card: card('560/5 413/4 442/4 188/3 607/5 452/4 410/4 232/3 420/4 441/4 567/5 373/4 199/3 590/5 208/3 458/4 206/3 443/4'),
  p: { dog: [14, 34], straight: 0.1, elev: 6, fw: [1, 2], gs: [2, 3], cross: 0, w: { side: 0.1, green: 0.05 }, green: { size: [22, 30], slope: [0.014, 0.024] }, rows: 0.7, nw: 0.3 },
  over: { 16: { bend: 38, spec: { water: [{ from: 180, to: 330, side: 'R', w: 44 }] }, note: '蛇窟 ① · 狗腿右繞過水池' }, 17: { tok: ['up'], note: '蛇窟 ② · 長三桿洞' }, 18: { tok: ['UP'], note: '蛇窟 ③ · 上坡收尾' } } });

add({ id: 'harbourtown', name: '海港城@C', en: 'Harbour Town Golf Links @C', area: '美國南卡羅來納州希爾頓黑德島', tier: 'pga', event: 'RBC Heritage（4 月，名人賽隔週）', diff: 3,
  basis: '南卡羅來納低地：活橡樹的枝葉垂到球道上、窄球道、全巡迴賽最小的果嶺；第 17、18 洞沿著卡利博格灣，背景是紅白條紋燈塔。',
  desc: '窄、短、精準。活橡樹、潟湖、迷你果嶺，最後兩洞沿著海灣、望向燈塔。（自創球場，計分卡照真實）',
  style: 'parkland', treeKind: 'lowcountry', stimp: 11.5, firm: 1.05, altitude: 3, temp: 22, wind: [5, 15], fairwayW: 26, roughW: 12, corridor: 62, trees: 1.3,
  card: card('410/4 502/5 469/4 200/3 549/5 419/4 195/3 473/4 332/4 451/4 436/4 430/4 373/4 192/3 588/5 434/4 174/3 472/4'),
  p: { dog: [12, 30], straight: 0.15, elev: 1, fw: [0, 1], gs: [1, 3], cross: 0, w: { side: 0.15, green: 0.12, front: 0.2 }, green: { size: [16, 22], slope: [0.01, 0.02] }, rows: 0.8, nw: 0.5 },
  over: { 13: { spec: { bunkers: [{ g: 'F', big: true }] }, green: { size: [18, 18] }, note: '果嶺前是被枕木圍起來的大沙坑' },
    17: { tok: ['sl'], spec: { bunkers: [{ g: 'L', big: true }] }, note: '沿著卡利博格灣的三桿洞 · 左邊長沙坑與海' },
    18: { bend: -15, tok: ['sl'], note: '左邊一路是海灣與沼澤 · 正前方就是燈塔' } } });

add({ id: 'tpcsanantonio', name: 'TPC 聖安東尼奧橡樹@C', en: 'TPC San Antonio (Oaks) @C', area: '美國德州聖安東尼奧', tier: 'pga', event: 'Valero Texas Open（4 月）', diff: 4,
  basis: '德州丘陵地（Hill Country）：石灰岩、矮橡樹與杜松、強風；Greg Norman 設計，球道邊是灌木與石塊，全長超過 7,400 碼。',
  desc: '德州丘陵地的長距離球場，石灰岩、橡樹與大風。（自創球場，計分卡照真實）',
  style: 'parkland', treeKind: 'oak', stimp: 12, firm: 1.2, altitude: 340, temp: 25, wind: [8, 18], fairwayW: 30, roughW: 10, corridor: 66, trees: 0.8,
  card: card('454/4 602/5 213/3 481/4 342/4 403/4 207/3 604/5 474/4 447/4 405/4 410/4 241/3 567/5 464/4 183/3 347/4 591/5'),
  p: { dog: [10, 30], straight: 0.2, elev: 8, fw: [1, 3], gs: [2, 3], cross: 0.1, waste: true, w: {}, green: { size: [22, 32], slope: [0.014, 0.026] }, rows: 0.4, up: 0.3 },
  over: {} });

add({ id: 'colonial', name: '殖民地@C', en: 'Colonial Country Club @C', area: '美國德州沃斯堡', tier: 'pga', event: 'Charles Schwab Challenge（5 月）', diff: 3,
  basis: '沃斯堡三一河畔：Ben Hogan 的主場，第 3~5 洞叫「可怕的馬蹄鐵（Horrible Horseshoe）」，第 5 洞右邊就是三一河；樹林夾道、果嶺小。',
  desc: '「霍根的阿拉莫」。樹林夾道的老球場，第 3~5 洞的馬蹄鐵是重頭戲。（自創球場，計分卡約略）', approx: true,
  style: 'parkland', treeKind: 'oak', stimp: 12, firm: 1.1, altitude: 180, temp: 28, wind: [6, 16], fairwayW: 28, roughW: 16, corridor: 64, trees: 1.2,
  card: card('565/5 400/4 476/4 247/3 481/4 400/4 440/4 192/3 407/4 404/4 635/5 445/4 178/3 468/4 430/4 188/3 387/4 433/4'),
  p: { dog: [12, 30], straight: 0.15, elev: 3, fw: [1, 2], gs: [2, 3], cross: 0, w: { green: 0.08 }, green: { size: [18, 26], slope: [0.012, 0.024] }, rows: 0.7, nw: 0.3 },
  over: { 3: { bend: -70, shape: 'E', note: '馬蹄鐵 ① · 直角狗腿左' }, 4: { note: '馬蹄鐵 ② · 長三桿洞' },
    5: { bend: -30, spec: { water: [{ from: 100, to: 440, side: 'R', ditch: true }] }, note: '馬蹄鐵 ③ · 右邊一路是三一河' } } });

add({ id: 'muirfieldvillage', name: '繆菲爾德村@C', en: 'Muirfield Village Golf Club @C', area: '美國俄亥俄州都柏林', tier: 'pga', event: 'Memorial Tournament（6 月）', diff: 4,
  basis: 'Jack Nicklaus 在家鄉蓋的球場：小溪在山谷間穿梭，第 12 洞三桿洞越過池塘、第 16 洞三桿洞也是過水；果嶺又快又硬。',
  desc: 'Nicklaus 的家鄉球場。溪流穿過山谷，三桿洞多半要過水。（自創球場，計分卡照真實）',
  style: 'parkland', treeKind: 'oak', stimp: 13, firm: 1.15, altitude: 270, temp: 25, wind: [3, 10], fairwayW: 30, roughW: 18, corridor: 68, trees: 1.0,
  card: card('490/4 459/4 382/4 210/3 547/5 455/4 582/5 200/3 417/4 472/4 588/5 180/3 455/4 360/4 561/5 218/3 503/4 480/4'),
  p: { dog: [10, 28], straight: 0.2, elev: 7, fw: [1, 2], gs: [2, 3], cross: 0.05, w: { creek: 0.3, green: 0.08 }, green: { size: [22, 30], slope: [0.014, 0.026] }, rows: 0.5 },
  over: { 11: { tok: ['xc'], note: '五桿洞 · 小溪兩次橫越球道' }, 12: { tok: ['wc'], green: { size: [30, 16], rot: -20 }, note: '三桿洞 · 越過池塘打向又寬又淺的果嶺' },
    14: { tok: ['xc'], note: '短四桿洞 · 小溪橫過落點 · 果嶺窄長' }, 16: { tok: ['wc'], note: '三桿洞 · 果嶺左邊是池塘' } } });

add({ id: 'riverhighlands', name: 'TPC 河流高地@C', en: 'TPC River Highlands @C', area: '美國康乃狄克州克倫威爾', tier: 'pga', event: 'Travelers Championship（6 月）', diff: 2,
  basis: '康乃狄克河谷：短、起伏、抓鳥大賽；第 15 洞可一桿上果嶺的短四桿洞左邊是池塘，第 16 洞三桿洞越過水，第 17 洞開球要越過水。',
  desc: '標準桿 70 的短球場，最後四洞水不斷。（自創球場，計分卡照真實）',
  style: 'parkland', treeKind: 'oak', stimp: 12, firm: 1.05, altitude: 30, temp: 25, wind: [3, 10], fairwayW: 32, roughW: 14, corridor: 68, trees: 0.9,
  card: card('434/4 341/4 431/4 481/4 223/3 574/5 443/4 202/3 406/4 462/4 158/3 411/4 523/5 421/4 296/4 171/3 420/4 444/4'),
  p: { dog: [10, 28], straight: 0.2, elev: 7, fw: [1, 2], gs: [2, 3], cross: 0, w: { side: 0.08 }, green: { size: [22, 30], slope: [0.012, 0.022] }, rows: 0.4 },
  over: { 15: { bend: 0, spec: { water: [{ from: 120, to: 280, side: 'L', w: 40 }] }, note: '約 300 碼的短四桿洞 · 左邊整片池塘 · 一桿上果嶺的誘惑' },
    16: { tok: ['wc'], note: '越過水的三桿洞' }, 17: { bend: 15, tok: ['xc'], note: '開球要越過水的四桿洞' } } });

add({ id: 'detroit', name: '底特律北場@C', en: 'Detroit Golf Club (North) @C', area: '美國密西根州底特律', tier: 'pga', event: 'Rocket Classic（6 月）', diff: 2,
  basis: 'Donald Ross 在底特律市區設計的平坦林木球場：大樹成林、果嶺不大，第 14~16 洞「313 區」（底特律的電話區號）是決勝段，第 16 洞旁邊是水。',
  desc: '市區裡的 Ross 老球場，常常打出很低的桿數。（自創球場，計分卡約略）', approx: true,
  style: 'parkland', treeKind: 'oak', stimp: 12, firm: 1.05, altitude: 190, temp: 25, wind: [3, 10], fairwayW: 32, roughW: 14, corridor: 66, trees: 1.1,
  card: card('404/4 433/4 223/3 579/5 469/4 400/4 568/5 476/4 228/3 397/4 190/3 417/4 545/5 527/5 182/3 405/4 401/4 470/4'),
  p: { dog: [8, 24], straight: 0.3, elev: 2, fw: [1, 2], gs: [2, 3], cross: 0, w: { green: 0.05 }, green: { size: [20, 28], slope: [0.012, 0.022], crown: 0.2 }, rows: 0.5 },
  over: { 14: { note: '313 區 ① · 可以兩桿上果嶺的五桿洞' }, 15: { note: '313 區 ② · 三桿洞' }, 16: { spec: { water: [{ g: 'L', size: [20, 28] }] }, note: '313 區 ③ · 果嶺左邊是水' } } });

add({ id: 'deererun', name: 'TPC 迪爾溪@C', en: 'TPC Deere Run @C', area: '美國伊利諾州錫爾維斯', tier: 'pga', event: 'John Deere Classic（7 月）', diff: 2,
  basis: '密西西比河支流岩石河（Rock River）旁的峭壁與山谷：橡樹林、溝壑穿插；第 16 洞是越過水的短三桿洞，第 18 洞左邊是水。',
  desc: '岩石河畔的峭壁與山谷，抓鳥大賽常客。（自創球場，計分卡照真實）',
  style: 'parkland', treeKind: 'oak', stimp: 11.5, firm: 1.05, altitude: 180, temp: 26, wind: [4, 12], fairwayW: 32, roughW: 14, corridor: 70, trees: 0.9,
  card: card('395/4 561/5 186/3 454/4 433/4 367/4 226/3 428/4 503/4 596/5 432/4 215/3 414/4 361/4 484/4 158/3 569/5 476/4'),
  p: { dog: [10, 28], straight: 0.2, elev: 9, fw: [1, 2], gs: [1, 3], cross: 0, w: { creek: 0.15 }, green: { size: [22, 30], slope: [0.012, 0.022] }, rows: 0.4, up: 0.3 },
  over: { 16: { tok: ['wc'], note: '越過水的短三桿洞' }, 18: { bend: -15, spec: { water: [{ from: 230, to: 450, side: 'L', w: 34 }] }, note: '左邊一路是水的收尾洞' } } });

add({ id: 'southwind', name: 'TPC 南風@C', en: 'TPC Southwind @C', area: '美國田納西州曼非斯', tier: 'pga', event: 'FedEx St. Jude Championship（8 月，季後賽第一戰）', diff: 4,
  basis: '曼非斯的平坦低地：10 個水障礙、94 個沙坑，百慕達草與結縷草；第 11 洞是幾乎被水包圍的三桿洞，第 14 洞是又長又難的三桿洞，第 18 洞左邊是水。',
  desc: '水多、沙坑多的季後賽第一站。第 11 洞果嶺幾乎被水包圍。（自創球場，計分卡照真實）',
  style: 'parkland', treeKind: 'oak', stimp: 12.5, firm: 1.1, altitude: 90, temp: 31, wind: [3, 10], fairwayW: 30, roughW: 16, corridor: 66, trees: 0.8,
  card: card('434/4 401/4 554/5 196/3 485/4 445/4 482/4 178/3 457/4 465/4 162/3 406/4 472/4 239/3 395/4 530/5 490/4 453/4'),
  p: { dog: [10, 28], straight: 0.2, elev: 2, fw: [2, 3], gs: [2, 4], cross: 0.05, w: { side: 0.25, green: 0.12, front: 0.3 }, green: { size: [20, 28], slope: [0.012, 0.022] }, rows: 0.4 },
  over: { 11: { tok: ['IG'], note: '果嶺幾乎被水包圍的短三桿洞' }, 14: { spec: { bunkers: [{ g: 'L', big: true }, { g: 'R' }] }, note: '又長又難的三桿洞' },
    18: { bend: -18, spec: { water: [{ from: 180, to: 430, side: 'L', w: 44 }] }, note: '左邊一路是水的收尾洞' } } });

add({ id: 'eastlake', name: '東湖@C', en: 'East Lake Golf Club @C', area: '美國喬治亞州亞特蘭大', tier: 'pga', event: 'TOUR Championship（8 月，聯邦快遞盃總決賽）', diff: 4,
  basis: 'Bobby Jones 的家鄉球場：球場中央一座湖，第 15 洞三桿洞越過湖，第 18 洞是沿著湖的五桿洞收尾。',
  desc: '季末總決賽的舞台。湖在中央，最後一洞沿湖的五桿洞決定聯邦快遞盃。（自創球場，計分卡照真實）',
  style: 'parkland', treeKind: 'azalea', stimp: 12.5, firm: 1.15, altitude: 300, temp: 30, wind: [3, 10], fairwayW: 30, roughW: 16, corridor: 68, trees: 0.9,
  card: card('469/4 197/3 391/4 479/4 442/4 525/5 481/4 455/4 235/3 424/4 214/3 389/4 440/4 520/4 211/3 454/4 430/4 590/5'),
  p: { dog: [10, 26], straight: 0.2, elev: 5, fw: [1, 2], gs: [2, 3], cross: 0, w: { green: 0.08 }, green: { size: [22, 30], slope: [0.014, 0.024] }, rows: 0.4 },
  over: { 6: { tok: ['wc'], note: '五桿洞 · 果嶺前是湖的一角' }, 15: { tok: ['wc'], note: '越過湖的三桿洞' },
    18: { bend: -12, spec: { water: [{ from: 150, to: 560, side: 'L', w: 50 }] }, note: '沿著湖的五桿洞 · 總冠軍的最後一洞' } } });

add({ id: 'sedgefield', name: '塞奇菲爾德@C', en: 'Sedgefield Country Club @C', area: '美國北卡羅來納州格林斯伯勒', tier: 'pga', event: 'Wyndham Championship（8 月，例行賽最後一站）', diff: 2,
  basis: 'Donald Ross 的起伏球場：松樹林、小而突起的果嶺（Ross 招牌的龜背），第 16 洞三桿洞越過水。',
  desc: '例行賽最後一站，搶季後賽門票的球場。Ross 的龜背果嶺。（自創球場，計分卡照真實）',
  style: 'parkland', treeKind: 'longleaf', stimp: 12, firm: 1.1, altitude: 255, temp: 29, wind: [3, 10], fairwayW: 30, roughW: 14, corridor: 66, trees: 1.0,
  card: card('418/4 442/4 174/3 428/4 529/5 423/4 223/3 374/4 416/4 440/4 486/4 235/3 405/4 505/4 545/5 175/3 406/4 507/4'),
  p: { dog: [10, 28], straight: 0.2, elev: 6, fw: [1, 2], gs: [2, 3], cross: 0, w: {}, green: { size: [18, 26], slope: [0.01, 0.02], crown: 0.4 }, rows: 0.5 },
  over: { 8: { green: { slope: 0.012, side: 0 } }, 16: { tok: ['wc'], note: '越過水的三桿洞' } } });

add({ id: 'spyglass', name: '望遠鏡山@C', en: 'Spyglass Hill Golf Course @C', area: '美國加州圓石灘', tier: 'pga', event: 'AT&T Pebble Beach Pro-Am（2 月，和圓石灘一起使用）', diff: 5,
  basis: '前五洞在太平洋邊的白色沙丘（洞名取自《金銀島》），第 6 洞起進入高聳的蒙特利松林；公認圓石灘一帶最難的球場。',
  desc: '先在海邊沙丘、再進松林的雙重性格球場，前五洞叫「金銀島」系列。（自創球場，計分卡約略）', approx: true,
  style: 'parkland', treeKind: 'fir', stimp: 11.5, firm: 1.1, altitude: 40, temp: 16, wind: [6, 16], fairwayW: 28, roughW: 16, corridor: 64, trees: 1.1,
  card: card('595/5 349/4 172/3 370/4 197/3 446/4 529/5 399/4 431/4 407/4 528/5 178/3 460/4 560/5 130/3 476/4 325/4 408/4'),
  p: { dog: [12, 30], straight: 0.15, elev: 9, fw: [1, 2], gs: [2, 3], cross: 0, w: { green: 0.06 }, green: { size: [20, 28], slope: [0.016, 0.028] }, rows: 0.7, nw: 0.3 },
  over: { 1: { tok: ['ww', 'DN'], bend: -40, note: '金銀島 · 從松林往海邊沙丘一路下坡的五桿洞' }, 2: { tok: ['ww'], note: '沙丘中的短四桿洞' },
    3: { tok: ['ww', 'sl'], note: '面向太平洋的三桿洞' }, 4: { tok: ['ww'], green: { size: [12, 36], rot: 25 }, note: '沙丘裡又窄又長的果嶺' }, 5: { tok: ['ww'], note: '沙丘最後一洞' },
    12: { tok: ['wc'], note: '三桿洞 · 果嶺前是池塘' }, 15: { tok: ['wc'], note: '越過池塘的短三桿洞' } } });

add({ id: 'tpctwincities', name: 'TPC 雙子城@C', en: 'TPC Twin Cities @C', area: '美國明尼蘇達州布萊恩', tier: 'pga', event: '3M Open（7 月）', diff: 3,
  basis: '明尼蘇達的湖泊與濕地：27 個水障礙、15 個洞有水；沙質地，第 18 洞五桿洞左邊一路是湖。',
  desc: '「萬湖之州」的球場，水多到數不完。（自創球場，計分卡照真實）',
  style: 'parkland', treeKind: 'oak', stimp: 12, firm: 1.05, altitude: 270, temp: 25, wind: [5, 14], fairwayW: 32, roughW: 14, corridor: 70, trees: 0.6,
  card: card('426/4 468/4 546/5 177/3 424/4 594/5 381/4 204/3 502/4 379/4 467/4 593/5 228/3 437/4 451/4 411/4 229/3 596/5'),
  p: { dog: [10, 28], straight: 0.2, elev: 2, fw: [1, 2], gs: [2, 3], cross: 0, w: { side: 0.5, green: 0.15, front: 0.4 }, green: { size: [22, 30], slope: [0.012, 0.022] }, rows: 0.2 },
  over: { 18: { bend: -15, spec: { water: [{ from: 150, to: 560, side: 'L', w: 50 }] }, note: '左邊一路是湖的五桿洞 · 兩桿攻要越過水' } } });

// ---------------------------------------------------------------- 歐洲巡迴賽場地 ----------------------------------------------------------------
add({ id: 'wentworth', name: '溫特沃斯西場@C', en: 'Wentworth Club (West) @C', area: '英國英格蘭薩里郡', tier: 'europe', event: 'BMW PGA 錦標賽（9 月，歐巡旗艦賽）', diff: 4,
  basis: '薩里郡的石南荒原（heathland）：歐洲赤松、白樺、杜鵑與紫色石南；以兩個五桿洞收尾，第 18 洞果嶺前有水。',
  desc: '英國石南荒原的代表，松樹、白樺與石南花；最後兩洞都是五桿洞。（自創球場，計分卡照真實）',
  style: 'parkland', treeKind: 'heath', stimp: 11.5, firm: 1.1, altitude: 50, temp: 18, wind: [4, 12], fairwayW: 30, roughW: 14, corridor: 66, trees: 1.0,
  card: card('473/4 154/3 465/4 552/5 203/3 418/4 396/4 391/4 449/4 184/3 416/4 531/5 470/4 179/3 489/4 383/4 610/5 521/5'),
  p: { dog: [10, 28], straight: 0.2, elev: 5, fw: [1, 2], gs: [2, 3], cross: 0.05, w: {}, green: { size: [20, 28], slope: [0.012, 0.022] }, rows: 0.6 },
  over: { 17: { bend: -30, spec: { ob: 'L' }, note: '狗腿左的五桿洞 · 左邊是界外（住宅花園）' }, 18: { bend: 12, tok: ['wc'], note: '五桿洞收尾 · 果嶺前是小溪與水池' } } });

add({ id: 'valderrama', name: '瓦爾德拉馬@C', en: 'Real Club Valderrama @C', area: '西班牙安達魯西亞索托格蘭德', tier: 'europe', event: 'Andalucía Masters（10 月）', diff: 5,
  basis: '安達魯西亞的軟木橡樹林：樹枝垂到球道上、球道窄、果嶺小又快；第 4 洞「瀑布（La Cascada）」五桿洞果嶺右邊是瀑布水池，第 17 洞五桿洞果嶺前是池塘。',
  desc: '歐洲最難的球場之一，軟木橡樹擋路、果嶺又小又快。（自創球場，計分卡約略）', approx: true,
  style: 'parkland', treeKind: 'cypress', stimp: 12.5, firm: 1.15, altitude: 40, temp: 24, wind: [6, 16], fairwayW: 26, roughW: 14, corridor: 62, trees: 1.3,
  card: card('389/4 399/4 172/3 562/5 381/4 163/3 468/4 343/4 457/4 389/4 571/5 224/3 402/4 392/4 239/3 422/4 537/5 462/4'),
  p: { dog: [12, 30], straight: 0.15, elev: 6, fw: [1, 2], gs: [2, 3], cross: 0, w: { green: 0.05 }, green: { size: [18, 24], slope: [0.016, 0.028], tier: 0.3 }, rows: 0.8, nw: 0.5 },
  over: { 4: { bend: -18, spec: { water: [{ g: 'R', size: [18, 22] }] }, green: { tier: true }, note: '瀑布（La Cascada）· 五桿洞 · 雙層果嶺右邊是瀑布水池' },
    17: { bend: 8, tok: ['wc'], green: { slope: -0.02 }, note: '五桿洞 · 果嶺前是池塘、果嶺往水的方向傾斜' } } });

add({ id: 'belfry', name: '鐘樓布拉巴宗@C', en: 'The Belfry (Brabazon) @C', area: '英國英格蘭沃里克郡', tier: 'europe', event: '英國公開賽資格賽 · 萊德盃歷史場地', diff: 3,
  basis: '英格蘭中部平原上的公園球場，四次舉辦萊德盃：第 10 洞是越過水、可以一桿上果嶺的短四桿洞（Seve 的經典一擊），第 18 洞開球與第二桿都要越過湖、三層果嶺。',
  desc: '萊德盃的經典場地。第 10 洞短四桿洞越水、第 18 洞兩次越湖。（自創球場，計分卡約略）', approx: true,
  style: 'parkland', treeKind: 'oak', stimp: 11, firm: 1.05, altitude: 90, temp: 17, wind: [6, 15], fairwayW: 32, roughW: 16, corridor: 70, trees: 0.6,
  card: card('411/4 379/4 560/5 466/4 408/4 413/4 177/3 428/4 455/4 311/4 419/4 222/3 384/4 194/3 565/5 413/4 575/5 473/4'),
  p: { dog: [10, 28], straight: 0.2, elev: 2, fw: [1, 2], gs: [2, 3], cross: 0, w: { side: 0.2, green: 0.1 }, green: { size: [22, 32], slope: [0.012, 0.022] }, rows: 0.3 },
  over: { 10: { bend: 25, tok: ['wc'], spec: { water: [{ from: 60, to: 300, side: 'L', w: 40 }] }, note: '約 310 碼的短四桿洞 · 果嶺前與左邊是水 · 一桿攻的經典' },
    18: { bend: -25, tok: ['xc', 'wc'], green: { tier: true, size: [22, 40] }, note: '開球越過湖、第二桿再越過水 · 長長的三層果嶺' } } });

add({ id: 'adare', name: '阿岱爾莊園@C', en: 'Adare Manor @C', area: '愛爾蘭利默里克郡', tier: 'europe', event: '萊德盃（2027 年場地）· 愛爾蘭公開賽', diff: 4,
  basis: '利默里克郡的莊園庭園：梅格河（River Maigue）穿過，古樹參天，背景是哥德式莊園大宅；球道寬闊、地面整理得像地毯。',
  desc: '莊園大宅前的公園球場，河流穿過、古樹成林。（自創球場，計分卡約略）', approx: true,
  style: 'parkland', treeKind: 'oak', stimp: 12, firm: 1.05, altitude: 20, temp: 16, wind: [6, 16], fairwayW: 36, roughW: 16, corridor: 74, trees: 0.8,
  card: card('435/4 424/4 455/4 202/3 425/4 175/3 589/5 404/4 470/4 456/4 418/4 597/5 400/4 486/4 418/4 184/3 474/4 593/5'),
  p: { dog: [10, 28], straight: 0.2, elev: 3, fw: [1, 2], gs: [2, 3], cross: 0, w: { side: 0.2, creek: 0.15, green: 0.08 }, green: { size: [24, 34], slope: [0.012, 0.022] }, rows: 0.4 },
  over: { 18: { bend: -15, spec: { water: [{ from: 200, to: 560, side: 'L', w: 30 }] }, note: '沿著梅格河的五桿洞收尾 · 背景是莊園大宅' } } });

add({ id: 'gleneagles', name: '格倫伊格爾斯 PGA 百年@C', en: 'Gleneagles (PGA Centenary) @C', area: '英國蘇格蘭珀斯郡', tier: 'europe', event: '蘇格蘭公開賽（7 月）· 2014 萊德盃場地', diff: 3,
  basis: '蘇格蘭高地邊緣的荒原（moorland）：遠處是奧克爾丘陵，溪流（burn）穿過，Nicklaus 設計、地形起伏大，標準桿 73。',
  desc: '蘇格蘭高地邊的荒原球場，溪流與丘陵。（自創球場，計分卡約略）', approx: true,
  style: 'parkland', treeKind: 'heath', stimp: 11, firm: 1.05, altitude: 120, temp: 15, wind: [7, 17], fairwayW: 34, roughW: 18, corridor: 72, trees: 0.5,
  card: card('446/4 516/5 405/4 213/3 477/4 197/3 444/4 380/4 619/5 222/3 351/4 449/4 485/4 341/4 530/5 516/5 194/3 535/5'),
  p: { dog: [10, 28], straight: 0.2, elev: 9, fw: [1, 2], gs: [2, 3], cross: 0, w: { creek: 0.2, green: 0.05 }, green: { size: [24, 32], slope: [0.012, 0.024] }, rows: 0.2, up: 0.3 },
  over: { 18: { bend: 10, tok: ['UP'], note: '上坡的五桿洞收尾 · 背後是看台' } } });

add({ id: 'countydown', name: '皇家郡唐@C', en: 'Royal County Down @C', area: '英國北愛爾蘭紐卡索', tier: 'europe', event: '愛爾蘭公開賽輪替 · 沃克盃場地', diff: 5,
  basis: '莫恩山脈下、鄧德拉姆灣旁的林克斯：黃色金雀花、紫色石南、很多盲打的開球要越過沙丘；沙坑邊緣垂著濱草，像眉毛一樣。',
  desc: '常被評為世界第一的林克斯。開球常要越過沙丘盲打，沙坑邊緣長著濱草。（自創球場，計分卡照真實）',
  style: 'links', theme: 'dunes', treeKind: 'gorse', stimp: 10.5, firm: 1.3, altitude: 10, temp: 15, wind: [10, 22], fairwayW: 28, roughW: 16, corridor: 74, trees: 0.4,
  card: card('539/5 444/4 475/4 229/3 440/4 396/4 144/3 429/4 483/4 196/3 442/4 525/5 446/4 212/3 468/4 337/4 433/4 548/5'),
  p: { dog: [10, 30], straight: 0.2, elev: 7, fw: [2, 3], gs: [2, 4], cross: 0.3, w: {}, green: { size: [20, 28], slope: [0.01, 0.024] }, rows: 0, up: 0.4, sea: { holes: [1, 2, 3], side: 'R' } },
  over: { 9: { tok: ['DN'], note: '高台開球、越過沙丘往下打 · 背景是莫恩山脈' }, 4: { tok: ['DN'], note: '越過金雀花往下打的三桿洞' } } });

// ---------------------------------------------------------------- 團體賽與奧運場地 ----------------------------------------------------------------
add({ id: 'legolfnational', name: '國家高爾夫信天翁@C', en: 'Le Golf National (L\'Albatros) @C', area: '法國巴黎近郊', tier: 'team', event: '萊德盃（2018）· 2024 奧運 · 法國公開賽', diff: 4,
  basis: '巴黎近郊用土堆出的體育場球場：觀眾坐在土丘上，水在最後四洞包圍；第 15 洞果嶺幾乎被水包圍、第 16 洞三桿洞越過水、第 18 洞左邊是水、果嶺在半島上。',
  desc: '最後四洞水域環繞，是萊德盃和奧運的舞台。（自創球場，計分卡約略）', approx: true,
  style: 'links', treeKind: 'gorse', stimp: 11.5, firm: 1.15, altitude: 90, temp: 22, wind: [6, 16], fairwayW: 30, roughW: 18, corridor: 76, trees: 0.2,
  card: card('431/4 211/3 556/5 490/4 409/4 435/4 459/4 188/3 589/5 384/4 192/3 435/4 444/4 568/5 393/4 180/3 498/4 471/4'),
  p: { dog: [10, 28], straight: 0.2, elev: 4, fw: [2, 3], gs: [2, 3], cross: 0.15, w: { side: 0.15 }, green: { size: [22, 30], slope: [0.012, 0.024] }, rows: 0, up: 0.2 },
  over: { 1: { spec: { water: [{ from: 230, to: 380, side: 'L', w: 40 }] }, note: '開局就是水 · 左邊整片池塘' },
    15: { bend: -12, tok: ['IG'], note: '果嶺幾乎被水包圍的短四桿洞' }, 16: { tok: ['wc'], note: '越過水的三桿洞' },
    18: { bend: -20, spec: { water: [{ from: 180, to: 460, side: 'L', w: 50 }, { g: 'F', size: [30, 12] }] }, note: '左邊一路是水 · 果嶺在半島上 · 萊德盃的決勝洞' } } });

add({ id: 'kasumigaseki', name: '霞關東場@C', en: 'Kasumigaseki Country Club (East) @C', area: '日本埼玉縣川越', tier: 'team', event: '2020 東京奧運 · 亞太業餘錦標賽', diff: 4,
  basis: '東京近郊的日本松林球場：赤松夾道、修剪整齊的日式庭園感；為了奧運由 Fazio 改造，果嶺改成一洞一個大果嶺。',
  desc: '日本最有名的老球場之一，松林夾道，奧運的舞台。（自創球場，計分卡照真實）',
  style: 'parkland', treeKind: 'jpine', stimp: 11.5, firm: 1.05, altitude: 30, temp: 30, wind: [3, 10], fairwayW: 30, roughW: 14, corridor: 66, trees: 1.1,
  card: card('411/4 381/4 459/4 237/3 640/5 386/4 217/3 586/5 521/4 189/3 461/4 499/4 398/4 632/5 403/4 203/3 343/4 500/4'),
  p: { dog: [10, 28], straight: 0.2, elev: 4, fw: [1, 2], gs: [2, 3], cross: 0, w: { green: 0.06 }, green: { size: [24, 32], slope: [0.012, 0.022] }, rows: 0.6 },
  over: { 10: { tok: ['wc'], note: '越過池塘的三桿洞' } } });

// ---------------------------------------------------------------- 亞洲巡迴賽場地 ----------------------------------------------------------------
add({ id: 'sentosa', name: '聖淘沙塞拉彭@C', en: 'Sentosa Golf Club (Serapong) @C', area: '新加坡聖淘沙島', tier: 'asia', event: '新加坡公開賽（亞巡）', diff: 4,
  basis: '新加坡南端的熱帶島嶼：海邊、潟湖、熱帶雨林與起伏的沙坑；遠處是港口的貨輪與市區天際線。',
  desc: '熱帶島嶼上的亞洲頂級球場，海與潟湖環繞。（自創球場，計分卡約略）', approx: true,
  style: 'parkland', theme: 'tropical', treeKind: 'tropic', stimp: 11.5, firm: 1.05, altitude: 5, temp: 31, wind: [5, 14], fairwayW: 30, roughW: 14, corridor: 70, trees: 0.8,
  card: card('396/4 449/4 556/5 197/3 449/4 409/4 594/5 202/3 457/4 447/4 393/4 220/3 517/5 427/4 422/4 207/3 448/4 590/5'),
  p: { dog: [10, 28], straight: 0.2, elev: 5, fw: [1, 2], gs: [2, 3], cross: 0, w: { side: 0.2, green: 0.12, front: 0.3 }, green: { size: [22, 30], slope: [0.012, 0.024] }, rows: 0.4, sea: { holes: [3, 4, 5], side: 'L' } },
  over: { 18: { bend: 15, spec: { water: [{ g: 'R', size: [20, 30] }] }, note: '五桿洞收尾 · 果嶺右邊是潟湖' } } });

add({ id: 'taiheiyo', name: '太平洋俱樂部御殿場@C', en: 'Taiheiyo Club (Gotemba) @C', area: '日本靜岡縣御殿場', tier: 'asia', event: '三井住友 VISA 太平洋名人賽（日巡，11 月）', diff: 3,
  basis: '富士山腳下的高原球場：富士山在每一洞的背景，日本松與楓樹，秋天楓紅；第 18 洞果嶺前是池塘。',
  desc: '每一洞都看得到富士山的高原球場。（自創球場，計分卡約略）', approx: true,
  style: 'parkland', treeKind: 'jpine', stimp: 11.5, firm: 1.05, altitude: 600, temp: 14, wind: [3, 10], fairwayW: 32, roughW: 14, corridor: 68, trees: 0.9,
  card: card('398/4 416/4 182/3 545/5 450/4 213/3 445/4 393/4 528/5 436/4 381/4 188/3 449/4 531/5 508/5 470/4 226/3 503/4'),
  p: { dog: [10, 28], straight: 0.2, elev: 8, fw: [1, 2], gs: [2, 3], cross: 0, w: { green: 0.08 }, green: { size: [24, 32], slope: [0.014, 0.024], tier: 0.3 }, rows: 0.5, up: 0.3 },
  over: { 18: { tok: ['wc'], green: { tier: false }, note: '果嶺前是池塘的收尾洞 · 背景是富士山' } } });

// ---------------------------------------------------------------- 業餘大賽場地 ----------------------------------------------------------------
add({ id: 'chambersbay', name: '錢伯斯灣@C', en: 'Chambers Bay @C', area: '美國華盛頓州大學城（普吉特灣）', tier: 'amateur', event: '美國業餘錦標賽輪替（8 月）· 2015 美國公開賽', diff: 5,
  basis: '普吉特灣旁的舊砂石採石場：全是羊茅草、落差極大的人工沙丘，整座球場只有一棵樹（第 15 洞果嶺後的孤松）；湖邊有火車經過。',
  desc: '採石場改建的林克斯，大起大落、只有一棵樹。（自創球場，計分卡照真實）',
  style: 'links', theme: 'dunes', treeKind: 'fir', stimp: 11, firm: 1.35, altitude: 20, temp: 18, wind: [6, 16], fairwayW: 38, roughW: 12, corridor: 80, trees: 0.05,
  card: card('598/5 399/4 198/3 495/4 488/4 495/4 508/4 614/5 224/3 436/4 537/4 311/4 534/4 546/4 246/3 423/4 218/3 604/5'),
  p: { dog: [10, 30], straight: 0.2, elev: 12, fw: [1, 3], gs: [2, 3], cross: 0.2, waste: true, w: {}, green: { size: [26, 40], slope: [0.014, 0.03], tier: 0.3 }, rows: 0, up: 0.5, sea: { holes: [15, 16, 17], side: 'L' } },
  over: { 9: { tok: ['DN'], note: '從高台往下打的三桿洞 · 落差將近 30 公尺' }, 15: { tok: ['sl'], note: '孤松（Lone Fir）三桿洞 · 果嶺後面是整座球場唯一的一棵樹' } } });

add({ id: 'erinhills', name: '艾林山@C', en: 'Erin Hills @C', area: '美國威斯康辛州艾林', tier: 'amateur', event: '美國業餘錦標賽輪替（8 月）· 2017 美國公開賽', diff: 4,
  basis: '威斯康辛冰河留下的壺穴地形（kettle moraine）：起伏的草原、羊茅草、沒有樹、天然風蝕沙坑，球道很寬但長草很深。',
  desc: '冰河地形上的草原球場，沒有樹、天然沙坑。（自創球場，計分卡照真實）',
  style: 'links', treeKind: 'gorse', stimp: 12, firm: 1.2, altitude: 300, temp: 22, wind: [7, 18], fairwayW: 44, roughW: 22, corridor: 80, trees: 0.05,
  card: card('552/5 361/4 476/4 445/4 462/4 237/3 607/5 492/4 163/3 504/4 423/4 464/4 212/3 613/5 370/4 247/3 481/4 663/5'),
  p: { dog: [10, 30], straight: 0.2, elev: 9, fw: [2, 3], gs: [2, 3], cross: 0.2, w: {}, green: { size: [24, 34], slope: [0.012, 0.024] }, rows: 0, up: 0.3 },
  over: { 9: { tok: ['DN'], note: '約 160 碼的下坡三桿洞 · 果嶺被天然沙坑包圍' }, 18: { bend: -20, note: '663 碼的超長五桿洞收尾' } } });

add({ id: 'olympicclub', name: '奧林匹克俱樂部湖場@C', en: 'The Olympic Club (Lake) @C', area: '美國加州舊金山', tier: 'amateur', event: '美國業餘錦標賽輪替（8 月）· 美國公開賽歷史場地', diff: 5,
  basis: '舊金山西南的山坡：柏樹與松樹夾道、球道向莫塞德湖方向斜（球會往一邊滾）、常有海霧；幾乎沒有球道沙坑，果嶺小；第 18 洞短而上坡。',
  desc: '海霧中的柏樹林球場，球道斜、果嶺小。（自創球場，計分卡照真實）',
  style: 'parkland', treeKind: 'cypress', stimp: 12, firm: 1.15, altitude: 60, temp: 16, wind: [5, 14], fairwayW: 28, roughW: 18, corridor: 62, trees: 1.3,
  card: card('520/4 428/4 247/3 438/4 498/4 489/4 288/4 200/3 449/4 424/4 430/4 451/4 199/3 419/4 154/3 670/5 522/5 344/4'),
  p: { dog: [12, 30], straight: 0.15, elev: 8, fw: [0, 1], gs: [2, 3], cross: 0, w: {}, green: { size: [18, 24], slope: [0.016, 0.028] }, rows: 0.8, nw: 0.4 },
  over: { 16: { bend: -35, shape: 'D', note: '670 碼的超長五桿洞 · 繞成大弧形往左彎' }, 18: { tok: ['UP'], green: { size: [16, 22] }, note: '短而上坡的收尾洞 · 小果嶺被看台圍住' } } });

add({ id: 'merion', name: '梅里恩東場@C', en: 'Merion Golf Club (East) @C', area: '美國賓州阿德莫爾', tier: 'amateur', event: '美國業餘錦標賽輪替（8 月）· 2013 美國公開賽', diff: 4,
  basis: '費城郊外的經典老球場：旗桿上是柳條編的籃子而不是旗子、白色沙面的沙坑叫「梅里恩的白臉」；第 11 洞果嶺前是小溪，第 16~18 洞要越過舊採石場。',
  desc: '球場短卻很難：柳條籃旗桿、白臉沙坑，最後三洞越過採石場。（自創球場，計分卡照真實）',
  style: 'parkland', treeKind: 'oak', stimp: 12.5, firm: 1.15, altitude: 90, temp: 25, wind: [3, 10], fairwayW: 26, roughW: 20, corridor: 62, trees: 1.0,
  card: card('350/4 556/5 256/3 628/5 504/4 487/4 360/4 359/4 236/3 303/4 367/4 403/4 115/3 464/4 411/4 430/4 246/3 521/4'),
  p: { dog: [10, 28], straight: 0.2, elev: 5, fw: [1, 2], gs: [2, 4], cross: 0.1, w: { creek: 0.08 }, green: { size: [18, 26], slope: [0.016, 0.028] }, rows: 0.6, nw: 0.5 },
  over: { 11: { tok: ['wc'], note: '果嶺前與右邊是小溪（Baffling Brook）' }, 13: { spec: { bunkers: [{ g: 'F', big: true }, { g: 'L' }, { g: 'R' }] }, note: '只有 115 碼的短三桿洞 · 果嶺被白臉沙坑包圍' },
    16: { spec: { valley: { from: 300, to: 340 } }, note: '第二桿要越過舊採石場' }, 18: { spec: { valley: { from: 150, to: 210 } }, note: '開球越過採石場 · 霍根 1950 年一號鐵的經典一擊' } } });

// ---------------------------------------------------------------- Korn Ferry Tour 場地 ----------------------------------------------------------------
add({ id: 'victoria', name: '維多利亞國家@C', en: 'Victoria National Golf Club @C', area: '美國印第安納州紐堡', tier: 'kft', event: 'Korn Ferry Tour 錦標賽（9 月，決定 PGA TOUR 卡的最後一站）', diff: 5,
  basis: '舊露天煤礦挖出的坑變成一個個深水湖：球道夾在湖與挖土堆起的高岡之間，幾乎每洞都有水，被稱為美國最難的球場之一。',
  desc: '煤礦坑變成的湖泊球場，幾乎洞洞有水。（自創球場，計分卡約略）', approx: true,
  style: 'parkland', treeKind: 'oak', stimp: 12.5, firm: 1.1, altitude: 120, temp: 26, wind: [4, 12], fairwayW: 28, roughW: 14, corridor: 66, trees: 0.8,
  card: card('431/4 556/5 175/3 452/4 419/4 466/4 222/3 395/4 541/5 444/4 578/5 186/3 412/4 475/4 323/4 205/3 600/5 470/4'),
  p: { dog: [12, 32], straight: 0.15, elev: 6, fw: [1, 2], gs: [2, 3], cross: 0, w: { side: 0.6, green: 0.25, front: 0.6 }, green: { size: [20, 28], slope: [0.014, 0.026] }, rows: 0.3 },
  over: { 15: { bend: 0, tok: ['IG'], note: '約 320 碼的短四桿洞 · 果嶺被湖包圍' } } });

add({ id: 'frenchlick', name: '法式舔石皮特戴@C', en: 'French Lick (Pete Dye Course) @C', area: '美國印第安納州法式舔石', tier: 'kft', event: 'Korn Ferry Tour（7 月）', diff: 4,
  basis: '印第安納南部的山頂：Pete Dye 把球場蓋在全州第二高的山頭，每一洞都看得到 40 英里外的丘陵；落差大、深沙坑、硬果嶺。',
  desc: '山頂上的 Pete Dye 球場，視野遼闊、起伏劇烈。（自創球場，計分卡約略）', approx: true,
  style: 'parkland', theme: 'autumn', treeKind: 'oak', stimp: 12, firm: 1.2, altitude: 300, temp: 22, wind: [7, 18], fairwayW: 32, roughW: 14, corridor: 70, trees: 0.5,
  card: card('445/4 552/5 404/4 223/3 488/4 439/4 581/5 212/3 450/4 466/4 412/4 179/3 562/5 456/4 427/4 249/3 422/4 611/5'),
  p: { dog: [10, 30], straight: 0.2, elev: 14, fw: [1, 3], gs: [2, 4], cross: 0.15, w: {}, green: { size: [22, 32], slope: [0.016, 0.028] }, rows: 0.2, up: 0.5 },
  over: { 18: { tok: ['UP'], note: '上坡的五桿洞收尾 · 打回山頂的會館' } } });

add({ id: 'ohiostate', name: '俄亥俄州立大學猩紅@C', en: 'Ohio State University (Scarlet) @C', area: '美國俄亥俄州哥倫布', tier: 'kft', event: 'Nationwide Children\'s Hospital Championship（8 月）', diff: 4,
  basis: 'Alister MacKenzie 原設計、Nicklaus（俄亥俄州立大學校友）改造：起伏的草原地形、長而難的四桿洞、果嶺大而有層次。',
  desc: 'Nicklaus 母校的球場，長四桿洞多。（自創球場，計分卡照真實）',
  style: 'parkland', treeKind: 'oak', stimp: 12, firm: 1.1, altitude: 240, temp: 25, wind: [5, 14], fairwayW: 32, roughW: 18, corridor: 70, trees: 0.6,
  card: card('435/4 472/4 429/4 575/5 233/3 618/5 401/4 202/3 427/4 442/4 473/4 562/5 221/3 473/4 443/4 378/4 221/3 439/4'),
  p: { dog: [10, 28], straight: 0.2, elev: 5, fw: [1, 3], gs: [2, 3], cross: 0.1, w: { creek: 0.1 }, green: { size: [24, 34], slope: [0.014, 0.026], tier: 0.3 }, rows: 0.4 },
  over: {} });

add({ id: 'panama', name: '巴拿馬高爾夫俱樂部@C', en: 'Panama Golf Club @C', area: '巴拿馬巴拿馬市', tier: 'kft', event: 'Panama Championship（2 月）', diff: 3,
  basis: '熱帶都市旁的球場：熱帶雨林、棕櫚與巨大的榕樹，濕熱多雨、草很軟；水道在球場裡蜿蜒。',
  desc: '熱帶雨林邊的濕熱球場。（自創球場，計分卡約略）', approx: true,
  style: 'parkland', theme: 'tropical', treeKind: 'tropic', stimp: 10.5, firm: 0.9, altitude: 30, temp: 31, wind: [3, 10], fairwayW: 30, roughW: 16, corridor: 68, trees: 1.1,
  card: card('412/4 549/5 188/3 446/4 426/4 397/4 566/5 205/3 451/4 433/4 392/4 210/3 538/5 467/4 425/4 174/3 455/4 470/4'),
  p: { dog: [10, 28], straight: 0.2, elev: 3, fw: [1, 2], gs: [2, 3], cross: 0, w: { creek: 0.25, side: 0.15 }, green: { size: [22, 30], slope: [0.012, 0.022] }, rows: 0.5 },
  over: {} });

add({ id: 'bogota', name: '波哥大鄉村俱樂部@C', en: 'Country Club de Bogotá @C', area: '哥倫比亞波哥大', tier: 'kft', event: 'Astara Championship（4 月）', diff: 3,
  basis: '安地斯山上海拔 2,600 公尺的高原：空氣稀薄、球飛得遠很多，四周是尤加利樹與高山，涼爽多雲。',
  desc: '海拔 2,600 公尺的高原球場，球會比平常飛遠一成以上。（自創球場，計分卡約略）', approx: true,
  style: 'parkland', theme: 'alpine', treeKind: 'eucalyptus', stimp: 11, firm: 1.05, altitude: 2600, temp: 15, wind: [3, 10], fairwayW: 30, roughW: 16, corridor: 66, trees: 1.0,
  card: card('430/4 192/3 512/5 451/4 405/4 418/4 214/3 474/4 557/5 449/4 398/4 196/3 541/5 437/4 461/4 223/3 409/4 583/5'),
  p: { dog: [10, 28], straight: 0.2, elev: 4, fw: [1, 2], gs: [2, 3], cross: 0, w: { side: 0.15, green: 0.08 }, green: { size: [22, 30], slope: [0.014, 0.024] }, rows: 0.5 },
  over: {} });

add({ id: 'emeraldbay', name: '翡翠灣@C', en: 'Sandals Emerald Bay @C', area: '巴哈馬大埃克蘇馬島', tier: 'kft', event: 'The Bahamas Great Exuma Classic（1 月）', diff: 4,
  basis: '巴哈馬的半島球場：綠松石色的海、珊瑚岩海岸，好幾洞直接沿著海邊；海風強，第 15 洞果嶺在突出的岬角上。',
  desc: '綠松石色海邊的海風球場。（自創球場，計分卡約略）', approx: true,
  style: 'links', theme: 'tropical', treeKind: 'tropic', stimp: 10.5, firm: 1.1, altitude: 5, temp: 26, wind: [12, 24], fairwayW: 32, roughW: 12, corridor: 74, trees: 0.4,
  card: card('418/4 552/5 197/3 445/4 403/4 211/3 574/5 437/4 428/4 461/4 392/4 536/5 215/3 451/4 412/4 186/3 468/4 549/5'),
  p: { dog: [10, 28], straight: 0.2, elev: 3, fw: [1, 2], gs: [2, 3], cross: 0, waste: true, w: { green: 0.08 }, green: { size: [22, 30], slope: [0.01, 0.02] }, rows: 0, sea: { holes: [5, 6, 7, 13, 14, 15, 16], side: 'L' } },
  over: { 15: { tok: ['sl', 'sr'], note: '果嶺在伸進海裡的岬角上 · 兩邊都是海' } } });

add({ id: 'hillcrest', name: '希爾克雷斯特@C', en: 'Hillcrest Country Club @C', area: '美國愛達荷州波夕', tier: 'kft', event: 'Albertsons Boise Open（9 月）', diff: 2,
  basis: '愛達荷州高原（海拔約 830 公尺）的老牌林木球場：大樹、緩坡，球在稀薄空氣裡飛得遠，常打出很低的桿數。',
  desc: '高原上的林木球場，球飛得遠、抓鳥多。（自創球場，計分卡約略）', approx: true,
  style: 'parkland', treeKind: 'oak', stimp: 11.5, firm: 1.1, altitude: 830, temp: 24, wind: [4, 12], fairwayW: 32, roughW: 14, corridor: 66, trees: 1.0,
  card: card('407/4 539/5 178/3 434/4 401/4 385/4 553/5 209/3 446/4 421/4 377/4 194/3 528/5 459/4 342/4 216/3 418/4 515/5'),
  p: { dog: [10, 26], straight: 0.25, elev: 4, fw: [1, 2], gs: [2, 3], cross: 0, w: { green: 0.05 }, green: { size: [20, 28], slope: [0.012, 0.022] }, rows: 0.5 },
  over: {} });

add({ id: 'indiancreek', name: '印第安溪@C', en: 'The Club at Indian Creek @C', area: '美國內布拉斯加州奧馬哈', tier: 'kft', event: 'Pinnacle Bank Championship（8 月）', diff: 3,
  basis: '內布拉斯加的大平原：起伏的草原、強風、幾乎沒有樹，小溪在低處蜿蜒。',
  desc: '大平原上的草原球場，風是主角。（自創球場，計分卡約略）', approx: true,
  style: 'links', treeKind: 'oak', stimp: 11.5, firm: 1.1, altitude: 330, temp: 25, wind: [10, 22], fairwayW: 34, roughW: 18, corridor: 76, trees: 0.15,
  card: card('442/4 571/5 211/3 465/4 412/4 396/4 589/5 189/3 458/4 437/4 402/4 223/3 548/5 471/4 381/4 196/3 462/4 562/5'),
  p: { dog: [10, 28], straight: 0.2, elev: 5, fw: [2, 3], gs: [2, 3], cross: 0.2, w: { creek: 0.2 }, green: { size: [22, 30], slope: [0.012, 0.022] }, rows: 0 },
  over: {} });

add({ id: 'crestview', name: '克雷斯特維尤@C', en: 'Crestview Country Club @C', area: '美國堪薩斯州威奇托', tier: 'kft', event: 'Wichita Open（6 月）', diff: 2,
  basis: '堪薩斯州的平原：南風又熱又強，球道兩旁是成排的大樹與小水塘。',
  desc: '堪薩斯平原的林木球場，熱風是最大的變數。（自創球場，計分卡約略）', approx: true,
  style: 'parkland', treeKind: 'oak', stimp: 11.5, firm: 1.1, altitude: 400, temp: 30, wind: [10, 20], fairwayW: 32, roughW: 14, corridor: 66, trees: 0.9,
  card: card('398/4 541/5 186/3 425/4 410/4 371/4 524/5 198/3 432/4 415/4 389/4 172/3 512/5 447/4 368/4 214/3 422/4 549/5'),
  p: { dog: [8, 24], straight: 0.3, elev: 2, fw: [1, 2], gs: [2, 3], cross: 0, w: { side: 0.15, green: 0.08 }, green: { size: [20, 28], slope: [0.012, 0.02] }, rows: 0.5 },
  over: {} });

add({ id: 'sugarloaf', name: 'TPC 糖塊@C', en: 'TPC Sugarloaf @C', area: '美國喬治亞州杜盧斯', tier: 'kft', event: 'Korn Ferry Tour（5 月）', diff: 3,
  basis: '亞特蘭大北邊的丘陵林地：Greg Norman 設計，起伏大、溪流與湖泊、喬治亞的松樹與杜鵑。',
  desc: '喬治亞丘陵的林地球場，水與起伏並重。（自創球場，計分卡約略）', approx: true,
  style: 'parkland', treeKind: 'azalea', stimp: 12, firm: 1.1, altitude: 300, temp: 25, wind: [3, 10], fairwayW: 30, roughW: 16, corridor: 66, trees: 1.0,
  card: card('411/4 563/5 207/3 449/4 427/4 389/4 552/5 191/3 462/4 438/4 405/4 218/3 575/5 456/4 362/4 183/3 474/4 541/5'),
  p: { dog: [12, 30], straight: 0.15, elev: 8, fw: [1, 2], gs: [2, 3], cross: 0, w: { side: 0.2, creek: 0.15, green: 0.1 }, green: { size: [22, 30], slope: [0.014, 0.024] }, rows: 0.5 },
  over: { 18: { bend: -15, spec: { water: [{ g: 'F', size: [30, 12] }] }, note: '五桿洞收尾 · 果嶺前是湖' } } });

// ---------------------------------------------------------------- 大學聯賽場地 ----------------------------------------------------------------
add({ id: 'grayhawk', name: '灰鷹猛禽@C', en: 'Grayhawk Golf Club (Raptor) @C', area: '美國亞利桑那州斯科茨代爾', tier: 'college', event: 'NCAA 錦標賽（5 月）', diff: 3,
  basis: '索諾拉沙漠的大學決賽場地：仙人掌、沙漠荒地、大起伏的果嶺，夏天極熱。',
  desc: 'NCAA 決賽的沙漠球場。（自創球場，計分卡約略）', approx: true,
  style: 'parkland', theme: 'dunes', treeKind: 'desert', stimp: 11.5, firm: 1.2, altitude: 500, temp: 34, wind: [4, 12], fairwayW: 34, roughW: 8, corridor: 72, trees: 0.4,
  card: card('412/4 531/5 194/3 445/4 403/4 389/4 560/5 207/3 436/4 418/4 365/4 186/3 554/5 451/4 316/4 228/3 469/4 573/5'),
  p: { dog: [10, 28], straight: 0.2, elev: 4, fw: [1, 2], gs: [2, 3], cross: 0, waste: true, w: { side: 0.1, green: 0.06 }, green: { size: [22, 32], slope: [0.014, 0.026] }, rows: 0 },
  over: { 15: { note: '可以一桿上果嶺的短四桿洞 · 比洞賽的決勝點' } } });

add({ id: 'lacosta', name: '拉科斯塔北場@C', en: 'Omni La Costa (North) @C', area: '美國加州卡爾斯巴德', tier: 'college', event: 'NCAA 錦標賽（5 月）', diff: 3,
  basis: '南加州海岸的度假球場：溫和的海風、小溪、棕櫚與尤加利，地面硬、果嶺快。',
  desc: '南加州的度假球場，舉辦過 NCAA 決賽。（自創球場，計分卡約略）', approx: true,
  style: 'parkland', treeKind: 'eucalyptus', stimp: 11.5, firm: 1.15, altitude: 40, temp: 22, wind: [5, 13], fairwayW: 32, roughW: 14, corridor: 68, trees: 0.8,
  card: card('418/4 541/5 197/3 436/4 405/4 381/4 552/5 179/3 452/4 427/4 394/4 212/3 528/5 447/4 368/4 204/3 459/4 562/5'),
  p: { dog: [10, 28], straight: 0.2, elev: 4, fw: [1, 2], gs: [2, 3], cross: 0, w: { creek: 0.2, green: 0.06 }, green: { size: [22, 30], slope: [0.012, 0.022] }, rows: 0.4 },
  over: {} });

add({ id: 'karstencreek', name: '卡斯滕溪@C', en: 'Karsten Creek Golf Club @C', area: '美國奧克拉荷馬州斯蒂爾沃特', tier: 'college', event: '大學秋季賽 · NCAA 區域賽', diff: 5,
  basis: '奧克拉荷馬州立大學的主場：Tom Fazio 在湖邊與橡樹林中設計，球道窄、水多，被稱為大學球隊最難的主場。',
  desc: '大學球隊最難的主場之一，湖與橡樹林。（自創球場，計分卡約略）', approx: true,
  style: 'parkland', treeKind: 'oak', stimp: 12, firm: 1.1, altitude: 300, temp: 26, wind: [8, 18], fairwayW: 26, roughW: 14, corridor: 62, trees: 1.2,
  card: card('426/4 554/5 211/3 448/4 412/4 395/4 573/5 196/3 461/4 437/4 402/4 223/3 547/5 465/4 387/4 189/3 472/4 568/5'),
  p: { dog: [12, 30], straight: 0.15, elev: 6, fw: [1, 2], gs: [2, 3], cross: 0, w: { side: 0.35, green: 0.15, front: 0.4 }, green: { size: [20, 28], slope: [0.014, 0.026] }, rows: 0.7, nw: 0.4 },
  over: {} });

add({ id: 'blessings', name: '祝福@C', en: 'Blessings Golf Club @C', area: '美國阿肯色州約翰遜', tier: 'college', event: '大學春季賽 · NCAA 錦標賽歷史場地', diff: 5,
  basis: '阿肯色州的溪谷：一條小溪貫穿整座球場、落差大，Robert Trent Jones Jr. 的超長設計（超過 7,600 碼）。',
  desc: '溪谷中的超長大學球場。（自創球場，計分卡約略）', approx: true,
  style: 'parkland', treeKind: 'oak', stimp: 12, firm: 1.1, altitude: 380, temp: 24, wind: [4, 12], fairwayW: 30, roughW: 16, corridor: 66, trees: 1.0,
  card: card('445/4 590/5 219/3 467/4 428/4 401/4 612/5 207/3 478/4 459/4 418/4 236/3 581/5 486/4 391/4 201/3 488/4 603/5'),
  p: { dog: [12, 30], straight: 0.15, elev: 10, fw: [1, 2], gs: [2, 3], cross: 0, w: { creek: 0.4, green: 0.08 }, green: { size: [22, 30], slope: [0.014, 0.026] }, rows: 0.5, up: 0.3 },
  over: {} });

add({ id: 'richharvest', name: '豐收農場@C', en: 'Rich Harvest Farms @C', area: '美國伊利諾州蘇格爾格羅夫', tier: 'college', event: 'NCAA 錦標賽歷史場地', diff: 4,
  basis: '芝加哥西邊的私人農場球場：濃密的橡樹林、窄球道、湖泊，前任索爾海姆盃場地。',
  desc: '農場裡的私人林木球場，窄而有水。（自創球場，計分卡約略）', approx: true,
  style: 'parkland', treeKind: 'oak', stimp: 12, firm: 1.05, altitude: 220, temp: 24, wind: [5, 14], fairwayW: 28, roughW: 16, corridor: 64, trees: 1.2,
  card: card('418/4 562/5 203/3 441/4 409/4 386/4 571/5 188/3 452/4 433/4 397/4 214/3 548/5 461/4 372/4 197/3 465/4 558/5'),
  p: { dog: [12, 30], straight: 0.15, elev: 3, fw: [1, 2], gs: [2, 3], cross: 0, w: { side: 0.25, green: 0.1 }, green: { size: [20, 28], slope: [0.012, 0.024] }, rows: 0.7, nw: 0.3 },
  over: {} });

add({ id: 'southernhighlands', name: '南方高地@C', en: 'Southern Highlands Golf Club @C', area: '美國內華達州拉斯維加斯', tier: 'college', event: '大學冬季邀請賽（2 月）', diff: 3,
  basis: '拉斯維加斯南邊的沙漠山坡：俯瞰賭城大道，沙漠荒地、大落差、水景瀑布。',
  desc: '俯瞰拉斯維加斯的沙漠山坡球場。（自創球場，計分卡約略）', approx: true,
  style: 'parkland', theme: 'dunes', treeKind: 'desert', stimp: 11.5, firm: 1.2, altitude: 800, temp: 20, wind: [6, 16], fairwayW: 34, roughW: 8, corridor: 72, trees: 0.4,
  card: card('425/4 568/5 204/3 452/4 411/4 393/4 581/5 196/3 447/4 438/4 382/4 219/3 562/5 471/4 359/4 211/3 463/4 579/5'),
  p: { dog: [10, 28], straight: 0.2, elev: 12, fw: [1, 2], gs: [2, 3], cross: 0, waste: true, w: { green: 0.1 }, green: { size: [22, 32], slope: [0.014, 0.026] }, rows: 0, up: 0.4 },
  over: {} });

add({ id: 'prairiedunes', name: '草原沙丘@C', en: 'Prairie Dunes Country Club @C', area: '美國堪薩斯州哈欽森', tier: 'college', event: '大學秋季邀請賽 · 美國業餘賽歷史場地', diff: 5,
  basis: '堪薩斯大平原中間的沙丘地：Perry Maxwell 的「內陸林克斯」，沙丘上長滿野李子叢與絲蘭、果嶺起伏劇烈、強風。',
  desc: '大平原中的沙丘林克斯，野李子叢會吃球。（自創球場，計分卡約略）', approx: true,
  style: 'links', theme: 'dunes', treeKind: 'gorse', stimp: 12, firm: 1.25, altitude: 470, temp: 26, wind: [12, 24], fairwayW: 28, roughW: 16, corridor: 74, trees: 0.4,
  card: card('431/4 167/3 384/4 166/3 452/4 395/4 512/5 450/4 445/4 185/3 452/4 395/4 195/3 529/5 221/3 431/4 500/5 432/4'),
  p: { dog: [10, 28], straight: 0.2, elev: 7, fw: [1, 2], gs: [2, 3], cross: 0.1, w: {}, green: { size: [20, 26], slope: [0.016, 0.03], tier: 0.3 }, rows: 0, up: 0.4 },
  over: { 2: { tok: ['UP'], note: '沙丘上的三桿洞 · 果嶺分成兩層' } } });

add({ id: 'cherryhills', name: '櫻桃山@C', en: 'Cherry Hills Country Club @C', area: '美國科羅拉多州丹佛', tier: 'college', event: '美國業餘賽歷史場地 · 大學邀請賽', diff: 3,
  basis: '丹佛高原（海拔 1,600 公尺）：落基山脈在背景、球飛得遠；第 1 洞是 Arnold Palmer 1960 年一桿上果嶺的短四桿洞，第 17、18 洞旁邊是湖。',
  desc: '洛磯山脈前的高原球場，Arnold Palmer 傳奇的開局。（自創球場，計分卡約略）', approx: true,
  style: 'parkland', treeKind: 'oak', stimp: 12, firm: 1.15, altitude: 1600, temp: 24, wind: [4, 12], fairwayW: 30, roughW: 16, corridor: 66, trees: 0.9,
  card: card('346/4 421/4 357/4 435/4 543/5 182/3 404/4 234/3 437/4 448/4 591/5 213/3 462/4 499/4 196/3 433/4 555/5 491/4'),
  p: { dog: [10, 26], straight: 0.2, elev: 4, fw: [1, 2], gs: [2, 3], cross: 0, w: { green: 0.05 }, green: { size: [20, 28], slope: [0.014, 0.024] }, rows: 0.5 },
  over: { 1: { tok: ['DN'], note: '下坡的短四桿洞 · 1960 年 Palmer 一桿上果嶺的傳奇' }, 17: { tok: ['IG'], note: '五桿洞 · 果嶺在湖中' }, 18: { bend: -15, spec: { water: [{ from: 40, to: 220, side: 'L', w: 40 }] }, note: '開球左邊是湖' } } });

add({ id: 'stanford', name: '史丹佛@C', en: 'Stanford Golf Course @C', area: '美國加州帕羅奧圖', tier: 'college', event: '大學春季邀請賽', diff: 3,
  basis: '史丹佛大學後山的橡樹丘陵：加州橡樹散布、起伏的金黃色山坡，第 12 洞果嶺前有一棵大橡樹擋路。',
  desc: '史丹佛大學的橡樹丘陵球場。（自創球場，計分卡約略）', approx: true,
  style: 'parkland', treeKind: 'oak', stimp: 11.5, firm: 1.15, altitude: 70, temp: 21, wind: [4, 12], fairwayW: 30, roughW: 14, corridor: 66, trees: 0.8,
  card: card('400/4 402/4 185/3 412/4 448/4 527/5 418/4 158/3 409/4 447/4 389/4 470/4 401/4 513/5 219/3 425/4 375/4 457/4'),
  p: { dog: [10, 28], straight: 0.2, elev: 8, fw: [1, 2], gs: [2, 3], cross: 0, w: {}, green: { size: [20, 28], slope: [0.014, 0.026] }, rows: 0.5, up: 0.3 },
  over: {} });

add({ id: 'yale', name: '耶魯@C', en: 'The Course at Yale @C', area: '美國康乃狄克州紐哈芬', tier: 'college', event: '大學秋季邀請賽', diff: 4,
  basis: 'Macdonald 與 Raynor 的經典「模板洞」：第 9 洞是 Biarritz 式三桿洞（果嶺中間有一道深溝）、還有 Redan、Cape、Road 等模板；起伏劇烈的林地。',
  desc: '黃金年代的模板洞博物館，第 9 洞的 Biarritz 果嶺中間有深溝。（自創球場，計分卡約略）', approx: true,
  style: 'parkland', treeKind: 'oak', stimp: 11.5, firm: 1.1, altitude: 40, temp: 22, wind: [4, 12], fairwayW: 32, roughW: 16, corridor: 68, trees: 0.9,
  card: card('437/4 391/4 409/4 448/4 175/3 413/4 516/5 427/4 213/3 395/4 401/4 400/4 210/3 362/4 482/4 512/5 375/4 642/5'),
  p: { dog: [10, 30], straight: 0.15, elev: 10, fw: [1, 2], gs: [2, 3], cross: 0.15, w: {}, green: { size: [24, 34], slope: [0.012, 0.026], tier: 0.3 }, rows: 0.4, up: 0.3 },
  over: { 4: { bend: 20, tok: ['xc'], note: 'Cape · 開球越過池塘，越切越近' },
    5: { green: { size: [16, 32], rot: -38, slope: -0.024, side: -0.02 }, note: 'Redan · 斜放、由右前往左後掉的果嶺' },
    9: { tok: ['wc'], green: { size: [24, 46], tier: true, tierAt: 0 }, note: 'Biarritz · 越過水的長三桿洞 · 果嶺中間有一道深溝' } } });

// ---------------------------------------------------------------- 青少年賽事場地 ----------------------------------------------------------------
add({ id: 'torreynorth', name: '托里松北場@C', en: 'Torrey Pines (North) @C', area: '美國加州聖地牙哥', tier: 'junior', event: 'IMG Academy 世界青少年錦標賽（7 月）· Farmers Insurance Open', diff: 3,
  basis: '和南場相鄰的海崖球場，比較短、海景更多；Tom Weiskopf 改造後果嶺更有起伏。',
  desc: '世界青少年錦標賽的舞台，太平洋海崖上的公眾球場。（自創球場，計分卡照真實）',
  style: 'parkland', theme: 'cliffs', treeKind: 'eucalyptus', stimp: 10.5, firm: 1.05, altitude: 100, temp: 20, wind: [6, 15], fairwayW: 32, roughW: 14, corridor: 74, trees: 0.6,
  card: card('421/4 495/4 241/3 479/4 525/5 416/4 322/4 214/3 556/5 536/5 339/4 203/3 459/4 451/4 202/3 393/4 520/5 486/4'),
  p: { dog: [10, 26], straight: 0.2, elev: 6, fw: [1, 2], gs: [2, 3], cross: 0, w: {}, green: { size: [22, 30], slope: [0.012, 0.022] }, rows: 0.3, sea: { holes: [3, 6, 7], side: 'R' } },
  over: { 3: { tok: ['DN'], note: '往太平洋下坡打的三桿洞 · 背景是無邊的海' } } });

add({ id: 'pinehurst4', name: '派恩赫斯特 4 號@C', en: 'Pinehurst No. 4 @C', area: '美國北卡羅來納州派恩赫斯特', tier: 'junior', event: 'U.S. Kids Golf 世界錦標賽 · 美國業餘賽資格賽', diff: 3,
  basis: '和 2 號同一片沙丘地：Gil Hanse 改造，沙地荒地與鐵線草、長葉松；起伏比 2 號大、果嶺比較寬容。',
  desc: '派恩赫斯特度假村的沙丘地球場。（自創球場，計分卡約略）', approx: true,
  style: 'parkland', treeKind: 'longleaf', stimp: 11, firm: 1.2, altitude: 160, temp: 27, wind: [3, 11], fairwayW: 36, roughW: 4, corridor: 70, trees: 0.7,
  card: card('415/4 512/5 385/4 192/3 452/4 541/5 571/5 196/3 447/4 481/4 424/4 196/3 558/5 512/5 234/3 443/4 179/3 472/4'),
  p: { dog: [8, 24], straight: 0.25, elev: 6, fw: [1, 2], gs: [2, 3], cross: 0.1, waste: true, w: { side: 0.06 }, green: { size: [24, 32], slope: [0.01, 0.018], crown: 0.35 }, rows: 0.2 },
  over: {} });

add({ id: 'pinehurst8', name: '派恩赫斯特 8 號@C', en: 'Pinehurst No. 8 @C', area: '美國北卡羅來納州派恩赫斯特', tier: 'junior', event: 'U.S. Kids Golf 世界錦標賽（8 月）', diff: 3,
  basis: '派恩赫斯特百年紀念時開的球場：濕地與沼澤、長葉松林，比 2 號多了水。',
  desc: '派恩赫斯特的濕地林間球場。（自創球場，計分卡約略）', approx: true,
  style: 'parkland', treeKind: 'longleaf', stimp: 11, firm: 1.1, altitude: 150, temp: 27, wind: [3, 10], fairwayW: 32, roughW: 10, corridor: 68, trees: 1.0,
  card: card('406/4 189/3 538/5 421/4 395/4 208/3 448/4 524/5 412/4 437/4 386/4 172/3 547/5 403/4 532/5 196/3 412/4 465/4'),
  p: { dog: [10, 28], straight: 0.2, elev: 4, fw: [1, 2], gs: [2, 3], cross: 0, waste: true, w: { side: 0.25, green: 0.1, front: 0.3 }, green: { size: [22, 30], slope: [0.01, 0.02] }, rows: 0.4 },
  over: {} });

add({ id: 'seaisland', name: '海島海濱@C', en: 'Sea Island (Seaside) @C', area: '美國喬治亞州聖西蒙斯島', tier: 'junior', event: 'AJGA 青少年賽 · RSM Classic', diff: 3,
  basis: '喬治亞外海的沼澤島：鹽沼與潮汐溪、活橡樹、海風；平坦但風很強，像美國版的林克斯。',
  desc: '鹽沼與潮汐溪環繞的海島球場。（自創球場，計分卡約略）', approx: true,
  style: 'links', treeKind: 'lowcountry', stimp: 11, firm: 1.15, altitude: 3, temp: 22, wind: [8, 18], fairwayW: 32, roughW: 14, corridor: 72, trees: 0.4,
  card: card('398/4 412/4 404/4 199/3 420/4 470/4 394/4 425/4 441/4 382/4 468/4 410/4 337/4 420/4 431/4 405/4 185/3 441/4'),
  p: { dog: [10, 28], straight: 0.2, elev: 1, fw: [1, 3], gs: [2, 3], cross: 0.15, w: { side: 0.3, green: 0.1 }, green: { size: [22, 30], slope: [0.008, 0.018] }, rows: 0.1, sea: { holes: [7, 8, 13, 14], side: 'R' } },
  over: {} });

add({ id: 'missioninn', name: '使命客棧冠軍@C', en: 'Mission Inn (El Campeón) @C', area: '美國佛州霍伊島', tier: 'junior', event: '佛州青少年巡迴賽 · 大學冬季賽', diff: 3,
  basis: '佛州少見的起伏丘陵（約 25 公尺落差）：湖泊、柑橘園、苔蘚垂掛的橡樹，西班牙風格的度假村。',
  desc: '佛州丘陵上的老牌度假村球場。（自創球場，計分卡約略）', approx: true,
  style: 'parkland', treeKind: 'lowcountry', stimp: 11, firm: 1.05, altitude: 30, temp: 26, wind: [4, 12], fairwayW: 30, roughW: 14, corridor: 66, trees: 0.9,
  card: card('387/4 542/5 176/3 402/4 431/4 366/4 518/5 194/3 411/4 427/4 381/4 199/3 523/5 442/4 349/4 178/3 456/4 520/5'),
  p: { dog: [10, 28], straight: 0.2, elev: 7, fw: [1, 2], gs: [2, 3], cross: 0, w: { side: 0.25, green: 0.1, front: 0.3 }, green: { size: [20, 28], slope: [0.012, 0.022] }, rows: 0.5, up: 0.3 },
  over: {} });

add({ id: 'carmelvalley', name: '卡梅爾谷牧場@C', en: 'Carmel Valley Ranch @C', area: '美國加州卡梅爾谷', tier: 'junior', event: 'AJGA 青少年賽', diff: 2,
  basis: '蒙特雷半島內陸的山谷：葡萄園、橡樹散布的山坡，後九洞爬上山腰、俯瞰整個山谷。',
  desc: '葡萄園山谷裡的度假球場，後九洞爬上山腰。（自創球場，計分卡約略）', approx: true,
  style: 'parkland', theme: 'autumn', treeKind: 'oak', stimp: 10.5, firm: 1.1, altitude: 150, temp: 22, wind: [3, 10], fairwayW: 30, roughW: 12, corridor: 66, trees: 0.7,
  card: card('395/4 512/5 165/3 411/4 377/4 421/4 182/3 498/5 388/4 426/4 162/3 401/4 410/4 372/4 432/4 178/3 385/4 401/4'),
  p: { dog: [10, 28], straight: 0.2, elev: 12, fw: [0, 1], gs: [1, 3], cross: 0, w: { creek: 0.1 }, green: { size: [20, 28], slope: [0.014, 0.026] }, rows: 0.3, up: 0.5 },
  over: {} });

// @@END

export const CREATIVE_TIERS = [
  { id: 'major', name: '四大賽輪替場地' }, { id: 'pga', name: 'PGA TOUR 賽事場地' }, { id: 'europe', name: '歐洲巡迴賽場地' }, { id: 'team', name: '團體賽與奧運場地' },
  { id: 'asia', name: '亞洲巡迴賽場地' }, { id: 'amateur', name: '業餘大賽場地' }, { id: 'kft', name: 'Korn Ferry Tour 場地' }, { id: 'college', name: '大學聯賽場地' }, { id: 'junior', name: '青少年賽事場地' },
];
export const CREATIVE_COURSES = DEFS.map(build);
