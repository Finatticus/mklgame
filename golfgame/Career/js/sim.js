// 模擬引擎：AI 球員與「模擬」的洞都用同一套公式，名次才公平
//   實力（rating）→ 一輪對標準桿的期望值（在難度普通的球場、合適的梯台）→ 加上球場難度、天氣、當天手感 → 每洞抽樣
//   錨點由校正機器人（Career/tools/calibrate.html，實際用遊戲的擊球物理打球）與真實巡迴賽的成績分布對照決定
import { clamp, lerp, rng } from './util.js';

// 實力 → 一輪的期望（對標準桿）。中間線性內插
//   尺度照企劃書的成長表：20 = 8 歲（兒童梯 9 洞約 55 桿）、32 = 12 歲（兒童梯 18 洞約 85）、48 = 17 歲（藍梯約 75）、
//   60 = 黑梯平標準桿、70 = Korn Ferry 爭冠、73 = PGA TOUR 平均、80 = PGA TOUR 冠軍、86 = 綠夾克候選、88 = 世界第一
//   v99 校正：用 .claude/calibrate.js 的機器人在真的球洞、物理與擊球誤差下打完整 18 洞，實力每 10 點約差 2 桿（50 → −6、70 → −9、90 → −14），
//   舊的尺度在 60~73 只差 1.65 桿（每 10 點 1.3 桿），實力差距在成績上太不明顯、小巡迴升級很看運氣。
//   新的尺度：PGA TOUR 平均（73）仍是 −1.35；48~84 之間每 1 點 0.2 桿（和 3D 實測一樣）；84 以上稍微放緩，頂尖球員不會一面倒
const ANCHOR = [[0, 62], [10, 50], [20, 37], [32, 13], [40, 7], [48, 3.7], [55, 2.25], [60, 1.25], [66, 0.05], [70, -0.75], [73, -1.35], [76, -1.95], [80, -2.75], [84, -3.45], [88, -4.05], [93, -4.85], [105, -6.5]];
export function roundMean(R) {
  for (let i = 1; i < ANCHOR.length; i++) {
    if (R <= ANCHOR[i][0]) { const [a, av] = ANCHOR[i - 1], [b, bv] = ANCHOR[i]; return lerp(av, bv, (R - a) / (b - a)); }
  }
  return ANCHOR[ANCHOR.length - 1][1];
}
// 每洞的隨機程度：初學者大、職業小
export const holeSigma = R => 0.6 + Math.max(0, 60 - R) * 0.009;
// 當天手感（一輪的整體起伏）
export const daySigma = R => 1.25 + Math.max(0, 60 - R) * 0.03;

// 素質 → 綜合實力（14 項加權；力量決定距離所以比重最大）
const W = { power: 0.15, contact: 0.08, launch: 0.04, accuracy: 0.10, consistency: 0.08, shaping: 0.04, spin: 0.05, chipping: 0.08, bunker: 0.04, recovery: 0.05, touch: 0.09, line: 0.08, reading: 0.06, mental: 0.06 };
export function ratingOf(stats) {
  let s = 0, w = 0;
  for (const k in W) { s += (Number(stats[k]) || 0) * W[k]; w += W[k]; }
  return s / w;
}

// 球場的難度修正（一輪，對標準桿）：@C 的 diff（1~5）、長度、果嶺速度、賽事設定、天氣
export function courseAdj(course, opt = {}) {
  const diff = course.diff || course.difficulty || 3;
  const yards = course.blackYards || 7200;
  // 難度 5 的大賽球場、大賽設定：場均約比標準桿多 1~2 桿（名人賽的冠軍約 −10、美國公開賽約 −5）
  let a = (diff - 3) * 0.7 + (yards - 7300) / 250 * 0.3 + ((course.stimp || 11) - 11) * 0.2;
  if (opt.setup === 'major') a += 0.5;
  if (opt.setup === 'usopen') a += 1.2;
  if (opt.setup === 'easy') a -= 0.6;            // 職業巡迴的一般設定（旗位溫和）
  if (opt.tee === 'junior') a -= 0.6;            // 青少年、大學用比較前面的梯台
  a += (opt.wind || 0) * (course.style === 'links' ? 1.0 : 0.65);
  return a;
}

// 每洞的難度分配（加起來 = 0）：差點排名越前面越難、五桿洞對長打者比較簡單
export function holeAdjs(holes, R, power = 70) {
  const raw = holes.map(h => {
    const par = h[0], hcp = h[4] || 9;
    let a = (9.5 - hcp) / 8.5 * 0.13;
    if (par === 5) a -= 0.1 + (power - 70) * 0.004;
    if (par === 3) a += 0.04;
    return a;
  });
  const m = raw.reduce((s, v) => s + v, 0) / raw.length;
  return raw.map(v => v - m);
}

// 抽一洞的桿數
export function holeScore(r, par, mean, R) {
  const x = mean + r.normal() * holeSigma(R);
  let s = par + Math.round(x);
  // 長打者在五桿洞的老鷹、職業選手的一桿進洞
  if (par === 5 && s === par - 1 && r() < 0.06 + Math.max(0, R - 70) * 0.004) s = par - 2;
  if (par === 3 && r() < (R > 60 ? 1 / 2800 : 1 / 9000)) s = 1;
  return clamp(s, par === 3 ? 1 : par - 3, par + (R < 40 ? 6 : 4));
}

// 一位球員一輪 18 洞（holes = 球場資料的洞；R = 當天實力；base = 這一輪的期望對標準桿）
export function simRound(r, holes, R, base, adj) {
  const form = r.normal() * daySigma(R);
  const perHole = (base + form) / holes.length;
  return holes.map((h, i) => holeScore(r, h[0], perHole + adj[i], R));
}

// 一輪的期望值（整合）：rating → 期望 + 球場修正
export function expectRound(R, course, opt) { return roundMean(R) + courseAdj(course, opt); }

// 給 AI 球員一場比賽的四輪（每輪 18 洞）：回傳 [[18 洞], ...]
export function simEventScores(seed, holes, R, course, roundsOpt) {
  const r = rng(seed);
  return roundsOpt.map(o => {
    const base = expectRound(R, course, o);
    return simRound(r, holes, R, base, holeAdjs(holes, R, o.power || 75));
  });
}

// 比洞賽一洞（兩人的桿數）
export const matchHole = (r, par, m1, R1, m2, R2) => [holeScore(r, par, m1, R1), holeScore(r, par, m2, R2)];

// 世界的背景賽事：只要每輪總桿（不用每洞），快很多
export function quickRound(r, R, course, o) {
  return Math.round((course.par || 72) + expectRound(R, course, o) + r.normal() * Math.sqrt(daySigma(R) ** 2 + 18 * holeSigma(R) ** 2));
}

// 推估的一號木 Carry（碼）：給畫面上的成長曲線與兒童梯的長度用
export function driveCarry(power, spd = 1) { return Math.round((195 + (power - 50) * 2) * Math.pow(spd, 1.25)); }
