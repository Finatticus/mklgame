// 大滿貫：四大賽的冠軍次數、生涯大滿貫（幾次）、年度大滿貫、連續四大賽（老虎大滿貫）、這一場拿下會不會完成大滿貫
import { MAJORS, MAJOR_ZH } from './data/calendar.js';

// 四大賽在一年裡的順序（名人賽 → PGA 錦標賽 → 美國公開賽 → 英國公開賽）
const ORDER = { masters: 0, pgachamp: 1, usopen: 2, open: 3 };
// 歷史紀錄（男子職業）：Jack Nicklaus 18 座大賽冠軍、三次生涯大滿貫
export const SLAM_RECORD = { majors: 18, holder: 'Jack Nicklaus', slams: 3 };

export function slamStatus(st) {
  const wins = (st.titles || []).filter(t => MAJORS.includes(t.id));
  const per = Object.fromEntries(MAJORS.map(m => [m, wins.filter(t => t.id === m).map(t => t.y).sort((a, b) => a - b)]));
  const count = Object.fromEntries(MAJORS.map(m => [m, per[m].length]));
  const slams = Math.min(...MAJORS.map(m => count[m]));       // 生涯大滿貫的次數（每座都拿過 n 次 = n 次大滿貫）
  // 年度大滿貫：同一年四座
  const years = [...new Set(wins.map(t => t.y))].filter(y => MAJORS.every(m => per[m].includes(y)));
  // 連續四大賽：依時間把每一場大賽編號，四個連號都是自己的冠軍
  const idx = new Set(wins.map(t => t.y * 4 + ORDER[t.id]));
  let tiger = 0;
  for (const i of idx) if (idx.has(i + 1) && idx.has(i + 2) && idx.has(i + 3) && !idx.has(i - 1)) tiger++;
  const firstSlamYear = slams >= 1 ? Math.max(...MAJORS.map(m => per[m][0])) : null;
  return { per, count, total: wins.length, slams, years, tiger, firstSlamYear, missing: MAJORS.filter(m => !count[m]) };
}
// 拿下這一場會完成幾次大滿貫（0 = 不會）
export function slamOnLine(st, majorId) {
  if (!MAJORS.includes(majorId)) return 0;
  const s = slamStatus(st), n = s.count[majorId];
  const others = Math.min(...MAJORS.filter(m => m !== majorId).map(m => s.count[m]));
  return n < others ? n + 1 : 0;
}
export const slamText = n => (n === 1 ? '生涯大滿貫' : n === 2 ? '雙料生涯大滿貫' : `第 ${n} 次生涯大滿貫`);
export const missingText = s => s.missing.map(m => MAJOR_ZH[m]).join('、');
