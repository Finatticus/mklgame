// 個人紀錄：把整個遊戲生涯的資料整理成儀表板（紀錄頁第一個分頁）
// 資料來源：
//   1. 回合紀錄（伺服器的玩家頁，每一場一列，有每洞桿數；新的回合另外存了重打、球場代號、範圍、標準桿、每洞細節）
//   2. 排行紀錄（每一場一列，有球場代號、範圍、梯台、標準桿、特殊紀錄；舊的回合靠同一個時間對到這裡補資料）
//   3. 進度的計數（成就用的累計數字：小鳥、老鷹、機關、切進…；新加的計數只從這一版開始累計）
//   4. 挑戰星數、成就、護照、外觀
// 舊回合沒有每洞標準桿：用球場代號 / 球場名稱找回球場，從球場資料補每洞標準桿，所以以前打的也能算 PAR / 柏忌分布
import { COURSES, COURSE_GROUPS, TEE_SETS, courseById, teeKey } from './courses.js';
import { ACH, PASSPORT, SKINS, prog, chal, stampDone, stampCount, skinUnlocked } from './progress.js';
import { CLUBS } from './clubs.js';
import { levelOf, STATS } from './stats.js';
import { escapeHtml, fmtToPar } from './util.js';

const FX_ZH = { ring: '螢火之環', shroom: '彈跳巨菇', vent: '噴發口', wall: '反彈牆', portal: '星門', honey: '蜂蜜 / 泥沼', gear: '轉向齒輪', wisp: '引魂燈', bumper: '彈珠柱', cloud: '雷雲', tramp: '彈跳床', boost: '加速帶', cannon: '大砲' };
const n0 = v => Number(v) || 0;
const pct = (a, b) => (b ? Math.round(a / b * 100) : 0);
const f1 = v => (Math.round(v * 10) / 10).toFixed(1);
const dayKey = d => String(d || '').slice(0, 19);
const fmtD = d => { const t = new Date(d); return isNaN(t) ? '—' : `${t.getFullYear()}.${String(t.getMonth() + 1).padStart(2, '0')}.${String(t.getDate()).padStart(2, '0')}`; };
const frac = s => { const m = String(s || '').match(/(\d+)\s*\/\s*(\d+)/); return m ? [Number(m[1]), Number(m[2])] : [0, 0]; };

// 這一場打的是哪座球場、哪幾洞（回傳球場與這幾洞的標準桿）
function resolveRound(r, rk) {
  const cid = r.courseId || (rk && rk.courseId) || '';
  const rangeRaw = r.range || (rk && rk.range) || '';
  const back = rangeRaw === 'back' || rangeRaw === '後 9 洞';
  const holes = n0(r.holes) || (r.scores || []).length;
  let base = null, cobj = null;
  if (cid) {
    base = COURSES.find(c => c.id === String(cid).split(':')[0]) || null;
    if (base) cobj = base.nines ? courseById(String(cid).includes(':') ? cid : base.id) : base;
  }
  if (!cobj) {
    const m = String(r.course || '').match(/^([^（]+)(?:（(.+)）)?$/);
    if (m) base = COURSES.find(c => c.name === m[1].trim() || c.oldName === m[1].trim()) || null;
    if (base && base.nines) {
      const ids = m[2] ? m[2].split('＋').map(nm => (base.nines.find(n => n.name === nm.trim()) || {}).id).filter(Boolean) : [];
      cobj = courseById(`${base.id}:${ids.join('') || base.nines[0].id}`);
    } else cobj = base;
  }
  let pars = r.detail && Array.isArray(r.detail.pars) && r.detail.pars.some(Boolean) ? r.detail.pars.slice(0, holes) : null;
  if (!pars && cobj) pars = cobj.holes.slice(back ? 9 : 0, (back ? 9 : 0) + holes).map(h => h[0]);
  return { base, cobj, pars, back };
}

// ---------------- 生涯統計（累計）----------------
// 每一場只算一次：把新的回合依序加進統計（agg），統計存在伺服器的「生涯統計」頁，下次只要再加之後的新回合，
// 玩家打了幾千場也不用每次重讀全部。統計的算法改了就把 CAREER_V 加 1，下次會自動從第一場重新算
export const CAREER_V = 1;
export function careerNew() {
  return {
    v: CAREER_V, n: 0, holesSum: 0, strokesAll: 0, mullRounds: 0, mullUsed: 0, fwA: 0, fwB: 0, girA: 0, girB: 0, haz: 0, sandR: 0, maxDrive: 0,
    clubs: {}, dist: { hio: 0, alb: 0, eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0, triple: 0 }, byPar: { 3: [0, 0], 4: [0, 0], 5: [0, 0] },
    holesCounted: 0, putts1: 0, putts3: 0, puttHoles: 0, puttSum: 0,
    r18: { n: 0, sum: 0, best: null, bestToPar: null, under: 0, even: 0, puttSum: 0, puttN: 0 }, best9: null,
    days: 0, lastDay: '', first: null, last: null,
    byCourse: {}, groups: {}, tees: {}, modes: {}, months: {}, trend: [], evs: [],
  };
}
const minN = (a, b) => (a == null ? b : Math.min(a, b));

// rounds：照時間順序（舊的在前）；rankRows：排行紀錄（舊回合靠同一個時間對到排行，補球場代號、梯台、特殊紀錄）
export function careerFold(agg, rounds, rankRows, user) {
  const a = agg && agg.v === CAREER_V ? agg : careerNew();
  const rkBy = new Map();
  for (const x of rankRows || []) if (String(x.user) === String(user)) rkBy.set(dayKey(x.date), x);
  for (const r0 of rounds || []) {
    const rk = rkBy.get(dayKey(r0.date));
    const info = resolveRound(r0, rk);
    const r = { ...r0, rk, ...info, tee: teeKey(info.base, r0.tee || (rk && rk.tee)), mulligans: n0(r0.mulligans) || n0(rk && rk.mulligans), events: (rk && rk.events) || [] };
    const holes = n0(r.holes), strokes = n0(r.strokes);
    a.n++;
    a.holesSum += holes;
    a.strokesAll += strokes;
    if (r.mulligans > 0) { a.mullRounds++; a.mullUsed += r.mulligans; }
    const [fa, fb] = frac(r.fairways), [ga, gb] = frac(r.gir);
    a.fwA += fa; a.fwB += fb; a.girA += ga; a.girB += gb;
    const det = r.detail || {};
    a.haz += n0(det.haz); a.sandR += n0(det.sand);
    a.maxDrive = Math.max(a.maxDrive, n0(det.maxDrive));
    for (const k in det.clubs || {}) a.clubs[k] = (a.clubs[k] || 0) + n0(det.clubs[k]);
    if (r.pars && Array.isArray(r.scores)) r.scores.forEach((s, i) => {
      const par = r.pars[i];
      if (!s || !par) return;
      a.holesCounted++;
      const d = s - par, D = a.dist;
      if (s === 1) D.hio++; else if (d <= -3) D.alb++; else if (d === -2) D.eagle++; else if (d === -1) D.birdie++; else if (d === 0) D.par++; else if (d === 1) D.bogey++; else if (d === 2) D.double++; else D.triple++;
      if (a.byPar[par]) { a.byPar[par][0] += s; a.byPar[par][1]++; }
      const pt = det.putts && det.putts[i];
      if (pt != null && pt !== '') { a.puttHoles++; a.puttSum += n0(pt); if (n0(pt) === 1) a.putts1++; if (n0(pt) >= 3) a.putts3++; }
    });
    // 一般球場：不是奇幻 / 自製，也不是三桿洞球場（18 洞標準桿低於 66、9 洞低於 33）
    const par = n0(r.par) || n0(rk && rk.par);
    const normal = r.base && r.base.group !== 'fantasy' && r.base.group !== 'custom' && !(par && par < (holes === 18 ? 66 : 33));
    if (holes === 18 && normal) {
      const q = a.r18, tp = n0(r.toPar);
      q.n++; q.sum += strokes; q.best = minN(q.best, strokes); q.bestToPar = minN(q.bestToPar, tp);
      if (tp < 0) q.under++;
      if (tp <= 0) q.even++;
      if (n0(r.putts)) { q.puttSum += n0(r.putts); q.puttN++; }
      a.trend.push({ date: r.date, course: r.course, strokes, toPar: tp });
      if (a.trend.length > 30) a.trend.shift();
    }
    if (holes === 9 && normal) a.best9 = minN(a.best9, strokes);
    const day = String(r.date).slice(0, 10);
    if (day !== a.lastDay) { a.days++; a.lastDay = day; }
    if (!a.first) a.first = { date: r.date };
    a.last = { date: r.date, course: r.course, strokes };
    const id = r.base ? r.base.id : String(r.course);
    const o = a.byCourse[id] || (a.byCourse[id] = { name: r.base ? r.base.name : String(r.course), group: r.base ? r.base.group : '', n: 0, best: null, sum: 0, n18: 0 });
    o.n++;
    if (holes === 18) { o.n18++; o.sum += strokes; o.best = minN(o.best, strokes); }
    if (r.base) a.groups[r.base.group] = (a.groups[r.base.group] || 0) + 1;
    if (r.tee) a.tees[r.tee] = (a.tees[r.tee] || 0) + 1;
    if (r.mode) a.modes[r.mode] = (a.modes[r.mode] || 0) + 1;
    const dt = new Date(r.date);
    if (!isNaN(dt)) { const mk = `${dt.getFullYear()}-${dt.getMonth()}`; a.months[mk] = (a.months[mk] || 0) + 1; }
    for (const e of r.events) a.evs.push({ t: e.t, hole: e.hole, date: r.date, course: r.course });
    if (a.evs.length > 6) a.evs.splice(0, a.evs.length - 6);
  }
  return a;
}

// ---------------- 小圖表 ----------------
const kpi = (label, value, sub = '', cls = '') => `<div class="cs-kpi ${cls}"><span>${label}</span><b class="num">${value}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
function bars(items, opt = {}) {
  const max = Math.max(1, ...items.map(i => i.v));
  return `<div class="cs-bars">${items.map(i => `<div class="cs-bar"><span class="cs-bl">${i.label}</span><span class="cs-bt"><i style="width:${Math.max(i.v ? 2 : 0, i.v / max * 100)}%;${i.color ? `background:${i.color}` : ''}"></i></span><b class="num">${i.text ?? i.v}</b></div>`).join('')}</div>`;
}
function ring(p, label, sub) {
  const r = 34, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, p));
  return `<div class="cs-ring"><svg viewBox="0 0 84 84"><circle cx="42" cy="42" r="${r}" class="bg"/><circle cx="42" cy="42" r="${r}" class="fg" stroke-dasharray="${(v / 100 * c).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 42 42)"/><text x="42" y="47" text-anchor="middle">${Math.round(v)}%</text></svg><b>${label}</b><small>${sub}</small></div>`;
}
// 分數分布：一條橫向堆疊條 + 圖例
const DIST = [['hio', '一桿進洞', '#7b3fa0'], ['alb', '信天翁', '#4a3fa0'], ['eagle', '老鷹', '#2f5fa8'], ['birdie', '小鳥', '#c0463a'], ['par', 'PAR', '#3f7a4a'], ['bogey', '柏忌', '#b08a3e'], ['double', '雙柏忌', '#8a6a4a'], ['triple', '三柏忌以上', '#5a4a3c']];
function distHtml(d) {
  const tot = DIST.reduce((s, [k]) => s + d[k], 0);
  if (!tot) return '<p class="small">還沒有可以統計的洞。</p>';
  return `<div class="cs-stack">${DIST.filter(([k]) => d[k]).map(([k, , c]) => `<i style="flex:${d[k]};background:${c}" title="${d[k]}"></i>`).join('')}</div>
    <div class="cs-legend">${DIST.map(([k, n, c]) => `<span><i style="background:${c}"></i>${n}<b class="num">${d[k]}</b><small>${pct(d[k], tot)}%</small></span>`).join('')}</div>`;
}
// 折線：最近幾場 18 洞的對標準桿（越低越好，畫在上面）
function trendHtml(rows) {
  if (rows.length < 2) return '<p class="small">打完兩場 18 洞之後，這裡會畫出成績走勢。</p>';
  const W = 600, H = 220, P = 26, vals = rows.map(r => n0(r.toPar));
  const lo = Math.min(...vals, 0), hi = Math.max(...vals, 0), span = Math.max(4, hi - lo);
  const x = i => P + i * (W - P * 2) / (rows.length - 1), y = v => P / 2 + (v - lo) / span * (H - P * 1.5);
  const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const best = Math.min(...vals);
  return `<svg class="cs-line" viewBox="0 0 ${W} ${H}">
    <line x1="${P}" x2="${W - P}" y1="${y(0)}" y2="${y(0)}" class="zero"/><text x="4" y="${y(0) + 4}" class="lbl">E</text>
    <line x1="${P}" x2="${W - P}" y1="${y(avg)}" y2="${y(avg)}" class="avg"/><text x="${P + 4}" y="${y(avg) + 20}" class="lbl avg-t">平均 ${fmtToPar(Math.round(avg))}</text>
    <polyline points="${pts}" class="ln"/>
    ${vals.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="${v === best ? 5 : 3}" class="${v === best ? 'best' : 'pt'}"><title>${fmtD(rows[i].date)} ${escapeHtml(rows[i].course)} ${rows[i].strokes}（${fmtToPar(v)}）</title></circle>`).join('')}
  </svg><div class="cs-cap"><span>${fmtD(rows[0].date)}</span><span>最近 ${rows.length} 場 18 洞（對標準桿，越上面越好）</span><span>${fmtD(rows[rows.length - 1].date)}</span></div>`;
}
// 每月回合數（最近 12 個月）
function monthsHtml(months) {
  const now = new Date(), ms = [];
  for (let i = 11; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1), k = `${d.getFullYear()}-${d.getMonth()}`; ms.push({ k, label: `${d.getMonth() + 1}月`, v: n0(months[k]) }); }
  const max = Math.max(1, ...ms.map(m => m.v));
  return `<div class="cs-cols">${ms.map(m => `<div class="cs-col"><b class="num">${m.v || ''}</b><i style="height:${m.v / max * 100}%"></i><span>${m.label}</span></div>`).join('')}</div>`;
}

// ---------------- 儀表板 ----------------
// agg：生涯統計（careerFold 算好的，已經包含所有回合）
export function careerHtml({ agg, user, profile, bestBlack, levels, chapters: chList = [], realCount }) {
  const g = prog(), c = g.cnt, ch = chal();
  const A = agg && agg.v === CAREER_V ? agg : careerNew();
  const { dist, byPar, holesCounted, putts1, putts3, puttHoles, puttSum, fwA, fwB, girA, girB, strokesAll, mullRounds, mullUsed, haz, sandR, clubs, days, first, last } = A;
  const q = A.r18;
  const avg18 = q.n ? q.sum / q.n : 0, bestAny18 = q.best, best9 = A.best9, bestToPar = q.bestToPar, under = q.under, even = q.even;
  const avgPutts = q.puttN ? q.puttSum / q.puttN : 0;
  const n18 = { length: q.n };
  const list = { length: A.n };
  const courses = Object.values(A.byCourse).sort((a, b) => b.n - a.n);
  const byGroup = COURSE_GROUPS.map(gr => ({ label: gr.name, v: n0(A.groups[gr.id]) })).filter(x => x.v);
  const tees = TEE_SETS.map(t => ({ label: t.name, v: n0(A.tees[t.id]), color: { black: '#1c1c1c', blue: '#2c4f8f', white: '#b9b4a6', red: '#a3302a' }[t.id] })).filter(x => x.v);
  const modes = ['單人', '比桿賽', '比洞賽'].map(m => ({ label: m, v: n0(A.modes[m]) })).filter(x => x.v);
  // 特殊紀錄（排行裡的一桿進洞 / 信天翁 / 老鷹，第幾洞；只留最近 6 筆）
  const evs = A.evs;
  // 挑戰、收藏
  const lv = levels || [];
  const passed = lv.filter(l => (ch.stars[l.id] || 0) >= 1).length, three = lv.filter(l => (ch.stars[l.id] || 0) >= 3).length;
  const far = lv.reduce((m, l) => ((ch.stars[l.id] || 0) >= 1 ? Math.max(m, l.n) : m), 0);
  const chapters = chList.length, chapFull = chList.filter(cp => { const ls = lv.filter(l => l.n >= cp.from && l.n <= cp.to); return ls.length && ls.every(l => (ch.stars[l.id] || 0) >= 3); }).length;
  const achN = ACH.filter(a => g.ach[a.id]).length;
  const stamps = PASSPORT.filter(p => stampDone(p.id));
  const tiers = [0, 0, 0, 0];
  for (const p of stamps) { const n = Math.max(1, stampCount(p.id)); tiers[n >= 10 ? 3 : n >= 5 ? 2 : n >= 3 ? 1 : 0]++; }
  const skinsGot = SKINS.filter(s => !s.std && skinUnlocked(s)).length, skinsAll = SKINS.filter(s => !s.std && (!s.career || skinUnlocked(s))).length;      // 生涯模式的專屬外觀只在解鎖後才算進總數
  const fx = Object.keys(FX_ZH).map(k => ({ label: FX_ZH[k], v: n0(c[k]) })).filter(x => x.v).sort((a, b) => b.v - a.v);
  const clubUse = CLUBS.map(cl => ({ label: cl.short, v: n0(c['club_' + cl.id]) || n0(clubs[cl.id]) })).filter(x => x.v);
  const st = profile.stats || {}, statAvg = STATS.reduce((s, x) => s + (n0(st[x.key]) || 50), 0) / STATS.length;
  const trend = A.trend;
  const maxDrive = n0(c.maxDrive) || A.maxDrive;

  if (!list.length && !n0(c.holes)) return '<div class="cs-empty"><b>還沒有任何紀錄</b><p class="small">打完第一場回合，這裡就會開始記錄你的高爾夫生涯。</p></div>';

  const sec = (title, body, cls = '') => `<section class="cs-card ${cls}"><h4>${title}</h4>${body}</section>`;
  const note = '<p class="small cs-note">以前的回合會自動回溯：每洞桿數與球場資料可以補回分數分布、各標準桿平均；推桿分布、球桿使用、最遠開球、罰桿等細節從這一版開始記錄。用過重打的回合不列入排行與個人最佳 18 洞。</p>';
  return `<div class="career">
  <section class="cs-hero">
    <div class="cs-who"><small>CAREER</small><b>${escapeHtml(user)}<span class="lv-tag">Lv.${levelOf(st)}</span></b><span>${first ? `${fmtD(first.date)} 開始 · 打球 ${days} 天` : '生涯剛開始'}</span></div>
    <div class="cs-hero-k">
      ${kpi('回合', n0(profile.rounds) || list.length)}${kpi('洞數', Math.max(n0(c.holes), A.holesSum))}${kpi('總桿數', strokesAll.toLocaleString())}${kpi('球場', courses.length)}
    </div>
  </section>
  ${note}
  <div class="cs-grid">
    ${sec('成績', `<div class="cs-kpis">
      ${kpi('最佳 18 洞（黑梯）', bestBlack ?? '—', '排行用，不含重打', 'hl')}
      ${kpi('最佳 18 洞（任何梯台）', bestAny18 ?? '—', '一般球場')}
      ${kpi('最佳 9 洞', best9 ?? '—', '一般球場')}
      ${kpi('平均桿數', avg18 ? f1(avg18) : '—', `一般球場 18 洞 · ${n18.length} 場`)}
      ${kpi('最佳對標準桿', bestToPar == null ? '—' : fmtToPar(bestToPar), '18 洞')}
      ${kpi('低於標準桿', under, `標準桿以內 ${even} 場`)}
    </div>`, 'wide')}
    ${sec('成績走勢', trendHtml(trend), 'wide')}
    ${sec('分數分布', `${distHtml(dist)}<p class="small cs-sub">統計 ${holesCounted.toLocaleString()} 洞（完成的回合）</p>`, 'wide')}
    ${sec('精彩一桿（生涯累計）', `<div class="cs-kpis k4">
      ${kpi('一桿進洞', n0(c.hio), '', 'gold')}${kpi('信天翁', n0(c.albatross))}${kpi('老鷹', n0(c.eagle))}${kpi('小鳥', n0(c.birdie))}
      ${kpi('切進 / 打進', n0(c.chipins), '果嶺外直接進洞')}${kpi('寶刀切進', n0(c.chipperIns))}${kpi('20 碼以上推進', n0(c.putt20))}${kpi('寶刀切上果嶺', n0(c.chipGreen))}
    </div>${evs.length ? `<div class="cs-evs">${evs.slice(-6).reverse().map(e => `<span>${{ hio: '一桿進洞', albatross: '信天翁', eagle: '老鷹' }[e.t] || e.t} · ${escapeHtml(String(e.course))} 第 ${e.hole} 洞 · ${fmtD(e.date)}</span>`).join('')}</div>` : ''}`)}
    ${sec('各標準桿平均', bars([3, 4, 5].map(p => ({ label: `Par ${p}`, v: byPar[p][1] ? byPar[p][0] / byPar[p][1] : 0, text: byPar[p][1] ? `${f1(byPar[p][0] / byPar[p][1])}（${fmtToPar(Math.round((byPar[p][0] / byPar[p][1] - p) * 100) / 100)}）` : '—', color: '#3f7a4a' }))))}
    ${sec('開球與攻果嶺', `<div class="cs-rings">${ring(pct(fwA, fwB), '上球道率', `${fwA} / ${fwB}`)}${ring(pct(girA, girB), '標準桿上果嶺', `${girA} / ${girB}`)}</div>
      <div class="cs-kpis k3">${kpi('最遠開球', maxDrive ? maxDrive + ' Y' : '—')}${kpi('平均開球', n0(c.drives) ? Math.round(n0(c.driveYds) / n0(c.drives)) + ' Y' : '—', n0(c.drives) ? `${n0(c.drives)} 次` : '')}${kpi('最遠打進', n0(c.longHoleOut) ? n0(c.longHoleOut) + ' Y' : '—', '果嶺外')}</div>`)}
    ${sec('推桿', `<div class="cs-kpis k3">${kpi('每場平均', avgPutts ? f1(avgPutts) : '—', '18 洞')}${kpi('每洞平均', puttHoles ? (puttSum / puttHoles).toFixed(2) : '—')}${kpi('最長推進', n0(c.longPutt) ? n0(c.longPutt) + ' Y' : '—')}
      ${kpi('一推', n0(c.onePutt) || putts1)}${kpi('三推以上', n0(c.threePutt) || putts3)}${kpi('一推率', puttHoles ? pct(putts1, puttHoles) + '%' : '—')}</div>`)}
    ${sec('重打與失誤', `<div class="cs-kpis k3">${kpi('用過重打的回合', mullRounds, '不列入排行')}${kpi('重打次數', Math.max(mullUsed, n0(c.mulliganUsed)))}${kpi('總揮桿數', n0(c.shots) ? n0(c.shots).toLocaleString() : '—')}
      ${kpi('下水', n0(c.pen_water))}${kpi('OB', n0(c.pen_ob))}${kpi('掉落深淵', n0(c.pen_chasm))}${kpi('沙坑擊球', n0(c.sandShots) || sandR)}${kpi('長草擊球', n0(c.roughShots))}${kpi('失誤（本版起）', haz)}</div>`)}
    ${sec('每月回合數', monthsHtml(A.months), 'wide')}
    ${sec('最常打的球場', courses.length ? `<div class="cs-table"><div class="cs-tr th"><span>球場</span><span>場數</span><span>最佳</span><span>平均</span></div>${courses.slice(0, 10).map(o => `<div class="cs-tr"><span>${escapeHtml(o.name)}</span><b class="num">${o.n}</b><b class="num">${o.best ?? '—'}</b><b class="num">${o.n18 ? f1(o.sum / o.n18) : '—'}</b></div>`).join('')}</div>` : '<p class="small">—</p>', 'wide')}
    ${sec('球場類型', bars(byGroup.map(x => ({ ...x, color: '#2f5a44' }))))}
    ${sec('梯台', bars(tees))}
    ${sec('模式與連線', `${bars(modes.map(x => ({ ...x, color: '#b08a3e' })))}<div class="cs-kpis k3">${kpi('連線場數', n0(c.multi))}${kpi('比洞賽勝場', n0(c.matchWin))}${kpi('實際下場紀錄', realCount ?? '—')}</div>`)}
    ${sec('球桿使用次數', clubUse.length ? bars(clubUse.map(x => ({ ...x, color: '#6f5a2f' }))) : '<p class="small">從這一版開始記錄每一桿用的球桿。</p>')}
    ${sec('奇幻機關（生涯累計）', fx.length ? `${bars(fx.map(x => ({ ...x, color: '#5a3f8a' })))}<p class="small cs-sub">合計 ${n0(c.fxAll).toLocaleString()} 次 · 星門抓鳥 ${n0(c.portalBirdie)} 次 · 噴上果嶺 ${n0(c.ventGreen)} 次</p>` : '<p class="small">還沒有觸發過機關，去奇幻球場玩玩看！</p>')}
    ${sec('挑戰模式', `<div class="cs-rings">${ring(pct(ch.total, lv.length * 3), '星數', `${ch.total} / ${lv.length * 3}`)}${ring(pct(passed, lv.length), '通過關卡', `${passed} / ${lv.length}`)}</div>
      <div class="cs-kpis k3">${kpi('最遠關卡', far ? `第 ${far} 關` : '—')}${kpi('三星關卡', three)}${kpi('滿星章節', `${chapFull} / ${chapters}`)}</div>`)}
    ${sec('收藏', `<div class="cs-kpis k3">${kpi('成就', `${achN} / ${ACH.length}`)}${kpi('護照印章', `${stamps.length} / ${PASSPORT.length}`)}${kpi('特殊外觀', `${skinsGot} / ${skinsAll}`)}</div>
      ${bars([['墨印', '#3c3a34'], ['銅印', '#a0703a'], ['銀章', '#9aa3ad'], ['金章', '#c9a23e']].map(([l, col], i) => ({ label: l, v: tiers[i], color: col })))}`)}
    ${sec('角色', `<div class="cs-kpis k3">${kpi('等級', 'Lv.' + levelOf(st))}${kpi('能力值平均', f1(statAvg))}${kpi('累計能力點', n0(profile.earned))}</div>
      ${bars(STATS.map(x => ({ label: x.name, v: n0(st[x.key]) || 50, color: '#c7a463' })).sort((a, b) => b.v - a.v).slice(0, 6))}`)}
  </div>
  ${last ? `<p class="small cs-foot">最後一場：${fmtD(last.date)} · ${escapeHtml(last.course)} · ${last.strokes} 桿</p>` : ''}
</div>`;
}
