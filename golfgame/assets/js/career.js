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

// 整理所有回合
function collect(rounds, rankRows, user) {
  const rkBy = new Map();
  for (const x of rankRows || []) if (String(x.user) === String(user)) rkBy.set(dayKey(x.date), x);
  const used = new Set();
  const list = [];
  for (const r of rounds || []) {
    const rk = rkBy.get(dayKey(r.date));
    if (rk) used.add(dayKey(r.date));
    const info = resolveRound(r, rk);
    list.push({ ...r, rk, ...info, tee: teeKey(info.base, r.tee || (rk && rk.tee)), mulligans: n0(r.mulligans) || n0(rk && rk.mulligans), events: (rk && rk.events) || [] });
  }
  // 排行有、回合紀錄沒有的（回合紀錄只讀到最近的；通常不會發生）也算進來，只是沒有每洞細節
  for (const x of rankRows || []) if (String(x.user) === String(user) && !used.has(dayKey(x.date))) {
    const info = resolveRound({ course: x.course, courseId: x.courseId, holes: x.holes, range: x.range }, x);
    list.push({ date: x.date, course: x.course, holes: x.holes, strokes: x.strokes, toPar: x.toPar, mode: x.mode, scores: [], ...info, tee: teeKey(info.base, x.tee), mulligans: n0(x.mulligans), events: x.events || [], rk: x, noDetail: true });
  }
  return list.sort((a, b) => new Date(a.date) - new Date(b.date));
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
function monthsHtml(list) {
  const now = new Date(), ms = [];
  for (let i = 11; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); ms.push({ k: `${d.getFullYear()}-${d.getMonth()}`, label: `${d.getMonth() + 1}月`, v: 0 }); }
  for (const r of list) { const d = new Date(r.date), m = ms.find(x => x.k === `${d.getFullYear()}-${d.getMonth()}`); if (m) m.v++; }
  const max = Math.max(1, ...ms.map(m => m.v));
  return `<div class="cs-cols">${ms.map(m => `<div class="cs-col"><b class="num">${m.v || ''}</b><i style="height:${m.v / max * 100}%"></i><span>${m.label}</span></div>`).join('')}</div>`;
}

// ---------------- 儀表板 ----------------
export function careerHtml({ rounds, rankRows, user, profile, bestBlack, levels, chapters: chList = [], realCount }) {
  const g = prog(), c = g.cnt, ch = chal();
  const list = collect(rounds, rankRows, user);
  const r18 = list.filter(r => n0(r.holes) === 18), r9 = list.filter(r => n0(r.holes) === 9);
  // 一般球場：不是奇幻 / 自製，也不是三桿洞球場（18 洞標準桿低於 66、9 洞低於 33）
  const normal = r => { const par = n0(r.par) || n0(r.rk && r.rk.par); return r.base && r.base.group !== 'fantasy' && r.base.group !== 'custom' && !(par && par < (n0(r.holes) === 18 ? 66 : 33)); };
  const n18 = r18.filter(normal);
  // 每洞：分數分布、各標準桿的平均、推桿
  const dist = { hio: 0, alb: 0, eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0, triple: 0 };
  const byPar = { 3: [0, 0], 4: [0, 0], 5: [0, 0] };
  let holesCounted = 0, putts1 = 0, putts3 = 0, puttHoles = 0, puttSum = 0, fwA = 0, fwB = 0, girA = 0, girB = 0, strokesAll = 0, mullRounds = 0, mullUsed = 0, haz = 0, sandR = 0;
  const clubs = {};
  for (const r of list) {
    strokesAll += n0(r.strokes);
    if (r.mulligans > 0) { mullRounds++; mullUsed += r.mulligans; }
    const [fa, fb] = frac(r.fairways), [ga, gb] = frac(r.gir);
    fwA += fa; fwB += fb; girA += ga; girB += gb;
    const det = r.detail || {};
    haz += n0(det.haz); sandR += n0(det.sand);
    for (const k in det.clubs || {}) clubs[k] = (clubs[k] || 0) + n0(det.clubs[k]);
    if (!r.pars || !Array.isArray(r.scores)) continue;
    r.scores.forEach((s, i) => {
      const par = r.pars[i];
      if (!s || !par) return;
      holesCounted++;
      const d = s - par;
      if (s === 1) dist.hio++; else if (d <= -3) dist.alb++; else if (d === -2) dist.eagle++; else if (d === -1) dist.birdie++; else if (d === 0) dist.par++; else if (d === 1) dist.bogey++; else if (d === 2) dist.double++; else dist.triple++;
      if (byPar[par]) { byPar[par][0] += s; byPar[par][1]++; }
      const pt = det.putts && det.putts[i];
      if (pt != null && pt !== '') { puttHoles++; puttSum += n0(pt); if (n0(pt) === 1) putts1++; if (n0(pt) >= 3) putts3++; }
    });
  }
  const strokes18 = n18.map(r => n0(r.strokes)), toPar18 = n18.map(r => n0(r.toPar));
  const avg18 = strokes18.length ? strokes18.reduce((a, b) => a + b, 0) / strokes18.length : 0;
  const bestAny18 = strokes18.length ? Math.min(...strokes18) : null;
  const best9 = r9.filter(normal).length ? Math.min(...r9.filter(normal).map(r => n0(r.strokes))) : null;
  const bestToPar = toPar18.length ? Math.min(...toPar18) : null;
  const under = n18.filter(r => n0(r.toPar) < 0).length, even = n18.filter(r => n0(r.toPar) <= 0).length;
  const putts18 = n18.map(r => n0(r.putts)).filter(Boolean);
  const avgPutts = putts18.length ? putts18.reduce((a, b) => a + b, 0) / putts18.length : 0;
  const days = new Set(list.map(r => String(r.date).slice(0, 10))).size;
  const first = list[0], last = list[list.length - 1];
  // 球場
  const byCourse = new Map();
  for (const r of list) {
    const id = r.base ? r.base.id : r.course;
    const o = byCourse.get(id) || { name: r.base ? r.base.name : r.course, group: r.base ? r.base.group : '', n: 0, best: null, sum: 0, n18: 0 };
    o.n++;
    if (n0(r.holes) === 18) { o.n18++; o.sum += n0(r.strokes); o.best = o.best == null ? n0(r.strokes) : Math.min(o.best, n0(r.strokes)); }
    byCourse.set(id, o);
  }
  const courses = [...byCourse.values()].sort((a, b) => b.n - a.n);
  const byGroup = COURSE_GROUPS.map(gr => ({ label: gr.name, v: list.filter(r => r.base && r.base.group === gr.id).length })).filter(x => x.v);
  const tees = TEE_SETS.map(t => ({ label: t.name, v: list.filter(r => r.tee === t.id).length, color: { black: '#1c1c1c', blue: '#2c4f8f', white: '#b9b4a6', red: '#a3302a' }[t.id] })).filter(x => x.v);
  const modes = ['單人', '比桿賽', '比洞賽'].map(m => ({ label: m, v: list.filter(r => r.mode === m).length })).filter(x => x.v);
  // 特殊紀錄（排行裡的一桿進洞 / 信天翁 / 老鷹，第幾洞）
  const evs = list.flatMap(r => (r.events || []).map(e => ({ ...e, date: r.date, course: r.course })));
  // 挑戰、收藏
  const lv = levels || [];
  const passed = lv.filter(l => (ch.stars[l.id] || 0) >= 1).length, three = lv.filter(l => (ch.stars[l.id] || 0) >= 3).length;
  const far = lv.reduce((m, l) => ((ch.stars[l.id] || 0) >= 1 ? Math.max(m, l.n) : m), 0);
  const chapters = chList.length, chapFull = chList.filter(cp => { const ls = lv.filter(l => l.n >= cp.from && l.n <= cp.to); return ls.length && ls.every(l => (ch.stars[l.id] || 0) >= 3); }).length;
  const achN = ACH.filter(a => g.ach[a.id]).length;
  const stamps = PASSPORT.filter(p => stampDone(p.id));
  const tiers = [0, 0, 0, 0];
  for (const p of stamps) { const n = Math.max(1, stampCount(p.id)); tiers[n >= 10 ? 3 : n >= 5 ? 2 : n >= 3 ? 1 : 0]++; }
  const skinsGot = SKINS.filter(s => !s.std && skinUnlocked(s)).length, skinsAll = SKINS.filter(s => !s.std).length;
  const fx = Object.keys(FX_ZH).map(k => ({ label: FX_ZH[k], v: n0(c[k]) })).filter(x => x.v).sort((a, b) => b.v - a.v);
  const clubUse = CLUBS.map(cl => ({ label: cl.short, v: n0(c['club_' + cl.id]) || n0(clubs[cl.id]) })).filter(x => x.v);
  const st = profile.stats || {}, statAvg = STATS.reduce((s, x) => s + (n0(st[x.key]) || 50), 0) / STATS.length;
  const trend = n18.slice(-30);
  const maxDrive = n0(c.maxDrive) || Math.max(0, ...list.map(r => n0(r.detail && r.detail.maxDrive)));

  if (!list.length && !n0(c.holes)) return '<div class="cs-empty"><b>還沒有任何紀錄</b><p class="small">打完第一場回合，這裡就會開始記錄你的高爾夫生涯。</p></div>';

  const sec = (title, body, cls = '') => `<section class="cs-card ${cls}"><h4>${title}</h4>${body}</section>`;
  const note = '<p class="small cs-note">以前的回合會自動回溯：每洞桿數與球場資料可以補回分數分布、各標準桿平均；推桿分布、球桿使用、最遠開球、罰桿等細節從這一版開始記錄。用過重打的回合不列入排行與個人最佳 18 洞。</p>';
  return `<div class="career">
  <section class="cs-hero">
    <div class="cs-who"><small>CAREER</small><b>${escapeHtml(user)}<span class="lv-tag">Lv.${levelOf(st)}</span></b><span>${first ? `${fmtD(first.date)} 開始 · 打球 ${days} 天` : '生涯剛開始'}</span></div>
    <div class="cs-hero-k">
      ${kpi('回合', n0(profile.rounds) || list.length)}${kpi('洞數', Math.max(n0(c.holes), list.reduce((a, r) => a + n0(r.holes), 0)))}${kpi('總桿數', strokesAll.toLocaleString())}${kpi('球場', courses.length)}
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
    ${sec('每月回合數', monthsHtml(list), 'wide')}
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
