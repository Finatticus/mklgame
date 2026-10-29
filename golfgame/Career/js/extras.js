// 生涯的額外玩法（v96）：贊助商挑戰、個人最佳與球場紀錄、明星技巧賽（3D）、經典重現、學院學員
import { story, storyResult, dialog, toast, go, ui } from './ui/shell.js';
import { localSave } from './state.js';
import { esc, money, toPar, clamp, rng, hash, seeded } from './util.js';
import { spend, earn, addNews, addTimeline, addPhoto } from './life.js';
import { cinfo, teeOf, WIND_CFG } from './event.js';
import { effectiveStats, playerRating } from './growth.js';
import { driveCarry } from './sim.js';
import { nameOf, ME } from './world.js';
import { makeName } from './data/names.js';
import { MAJOR_ZH } from './data/calendar.js';
import { AUCTION, COLLECT_KIND } from './data/story3.js';

const YD = 0.9144;
const roundSum = a => (a && a.length === 18 && a.every(x => x != null) ? a.reduce((s, x) => s + x, 0) : null);

// ---------- 贊助商挑戰：比賽週一，贊助商開條件（接受才算；成功拿獎金與好感，失敗好感 −1）----------
const CHAL = [
  { id: 'cut', text: '晉級週末', mul: 0.3, test: (E, rec) => rec.pos !== 'CUT' },
  { id: 'top25', text: '打進前 25 名', mul: 0.6, test: (E, rec) => rec.posN && rec.posN <= 25 },
  { id: 'top10', text: '打進前 10 名', mul: 1.2, test: (E, rec) => rec.posN && rec.posN <= 10 },
  { id: 'win', text: '拿下冠軍', mul: 4, test: (E, rec) => rec.posN === 1 },
  { id: 'under', text: '每一輪都低於標準桿', mul: 1.6, test: E => E.me.sc.slice(0, E.rounds).every(r => roundSum(r) != null && roundSum(r) < E.par) },
  { id: 'final', text: '最後一輪打出 68 桿以下', mul: 1, test: E => { const s = roundSum(E.me.sc[E.rounds - 1]); return s != null && s <= 68; } },
];
export async function offerChallenge(st, E) {
  if (st.status.amateur || !st.sponsors.length || E.chal || E.chalAsked || ['qs', 'team', 'olympic', 'exh'].includes(E.tour)) return;
  E.chalAsked = true;
  const r = seeded(st, 'chal', E.key);
  if (r() > 0.5) return;
  const sp = st.sponsors[Math.floor(r() * st.sponsors.length)];
  const R = playerRating(st), strong = R >= 82 || E.tour !== 'pga' && E.tour !== 'major';
  const pool = CHAL.filter(c => strong ? c.id !== 'cut' : c.id !== 'win');
  const picks = r.shuffle(pool.slice()).slice(0, 2);
  const base = Math.max(20000, Math.round(sp.year * 0.04 / 1000) * 1000);
  const opts = picks.map(c => ({ ...c, reward: Math.round(base * c.mul / 1000) * 1000 }));
  const i = await story({ small: `${E.name} · 贊助商挑戰`, title: `${sp.name} 的挑戰`, paras: [`${sp.name} 的行銷經理打電話來：「這週如果你做到其中一件事，我們額外給一筆獎金。」`, '接受挑戰卻沒做到，贊助商好感 −1。'], choices: opts.map(o => [`${o.text}`, `獎金 ${money(o.reward)}`]).concat([['這週不接', '專心比賽']]), skip: false });
  if (i >= 0 && i < opts.length) { E.chal = { id: opts[i].id, text: opts[i].text, reward: opts[i].reward, sp: sp.name }; toast(`接受挑戰：${opts[i].text}`); }
  localSave(st);
}
export function settleChallenge(st, E, rec) {
  const c = E.chal; if (!c || c.done) return;
  c.done = true;
  const def = CHAL.find(x => x.id === c.id);
  c.ok = !!(def && def.test(E, rec));
  if (c.ok) { earn(st, c.reward, `${c.sp} 挑戰獎金（${c.text}）`, 'spon'); st.rel.sponsor = clamp(st.rel.sponsor + 5, 0, 100); st.cnt.chalOk = (st.cnt.chalOk || 0) + 1; addNews(st, `${st.player.name} 完成 ${c.sp} 的挑戰：${c.text}`); }
  else st.rel.sponsor = clamp(st.rel.sponsor - 1, 0, 100);
}

// ---------- 個人最佳、球場紀錄 ----------
//   st.pb = { low: 最低一輪, total: 最低四輪總桿（對標準桿）, bestFinish }；st.crec[球場] = { s, tp, who, me, y, ev }
export function updateRecords(st, E, rec) {
  // 青少年、大學、業餘賽用前面的梯台，成績不能和職業的黑梯比：只算職業巡迴、大賽、資格賽
  if (['kids', 'junior', 'ncaa', 'am'].includes(E.tour)) return [];
  const pb = st.pb = st.pb || {}, cr = st.crec = st.crec || {}, ci = cinfo(E.course);
  const msgs = [];
  E.me.sc.slice(0, E.rounds).forEach((r, ri) => {
    const s = roundSum(r); if (s == null) return;
    const tp = s - E.par;
    if (!pb.low || tp < pb.low.tp) pb.low = { s, tp, y: E.year, ev: E.name, course: ci.name, r: ri + 1 };
  });
  if (rec.pos !== 'CUT' && E.rounds >= 4 && rec.total && (!pb.total || rec.toPar < pb.total.tp)) pb.total = { s: rec.total, tp: rec.toPar, y: E.year, ev: E.name };
  // 這一場所有人最低的一輪 vs 球場紀錄
  let best = null;
  const consider = (sc, who, me) => sc.slice(0, E.rounds).forEach(r => { const s = roundSum(r); if (s != null && (!best || s < best.s)) best = { s, who, me }; });
  consider(E.me.sc, st.player.name, true);
  for (const e of E.field || []) if (e.sc) consider(e.sc, e.name, false);
  if (best) {
    const old = cr[E.course];
    if (!old || best.s < old.s) {
      cr[E.course] = { s: best.s, tp: best.s - E.par, who: best.who, me: best.me, y: E.year, ev: E.name, name: ci.name };
      if (best.me) { st.cnt.courseRec = (st.cnt.courseRec || 0) + 1; addNews(st, `${st.player.name} 在 ${ci.name} 打出 ${best.s} 桿，改寫球場紀錄！`, 'me'); msgs.push(`球場紀錄：${best.s} 桿（${toPar(best.s - E.par)}）`); }
    }
  }
  return msgs;
}

// ---------- 經典重現：贏下大賽、THE PLAYERS、TOUR Championship、PGA TOUR 首勝時，把最後一洞存成挑戰 ----------
export function saveClassic(st, E, rec) {
  if (rec.posN !== 1) return;
  const big = E.major || ['players', 'tourchamp', 'host'].includes(E.id) || (E.tour === 'pga' && st.tally.pgaWins === 1);
  if (!big) return;
  const last = E.rounds - 1, sc = E.me.sc[last], ci = cinfo(E.course);
  if (!sc || sc[17] == null || !ci.holes[17]) return;
  st.classics = st.classics || [];
  if (st.classics.some(c => c.key === E.key)) return;
  st.classics.push({ key: E.key, label: `${E.year} ${E.name}`, course: E.course, courseName: ci.name, tee: teeOf(st, E), wind: WIND_CFG[E.wx[last]] || 'normal', stimp: (ci.stimp || 10) + (E.major ? 1.5 : 0), seed: hash(E.key + ':seed:' + last), need: sc[17], par: ci.holes[17][0], best: null, tries: 0 });
}
export async function playClassic(st, c, useMain) {
  const { playRound } = await import('./ui/ingame.js');
  const ses = ui.ctx.session;
  const player = useMain ? { user: ses.user, stats: { ...(ses.profile.stats || {}) }, look: { ...(ses.profile.look || {}) }, local: true } : undefined;
  const res = await playRound({ label: `經典重現 · ${c.label}`, noHoleCard: true, practiceRound: true, player, pressure: () => 2,
    cfg: { courseId: c.course, holeIdx: [17], tee: c.tee, wind: c.wind, stimp: c.stimp, seed: c.seed, mulligans: 0, career: { classic: true } } });
  const s = res.scores[17];
  c.tries++;
  if (s != null && (c.best == null || s < c.best)) c.best = s;
  const ok = s != null && s <= c.need;
  if (ok) st.cnt.classicWin = (st.cnt.classicWin || 0) + 1;
  localSave(st);
  await storyResult(ok ? '經典重現成功！' : '再試一次', s == null ? '沒有打完這一洞。' : `${s} 桿（當年 ${c.need} 桿，標準桿 ${c.par}）`, [useMain ? '用主帳號的素質' : '用生涯球員現在的素質']);
  const { checkAch } = await import('./achievements.js'); checkAch(st);
}

// ---------- 明星技巧賽（每年第 45~47 週，PGA TOUR 會員或世界前 100）：長打 6 球、近旗 150 碼 5 球 ----------
export const skillsOpen = st => !st.status.amateur && st.week >= 45 && st.week <= 47 && ((st.status.cards.pga || 0) >= st.year || (st.rankNow || 9999) <= 100) && !(st.skills || {})[st.year];
function aiField(st, kind) {
  const r = rng(hash(st.seed + ':skills:' + st.year + kind));
  const top = st.world.players.filter(p => !p.ret && p.tour === 'pga').sort((a, b) => b.r - a.r).slice(0, 30);
  return r.shuffle(top).slice(0, 7).map(p => ({ name: nameOf(p), v: kind === 'drive' ? Math.round(300 + (p.r - 74) * 3 + r.normal() * 9) : Math.round((1.2 + Math.max(0, 84 - p.r) * 0.12 + Math.abs(r.normal()) * 2.2) * 10) / 10 }));
}
export async function skillsChallenge(st, kind, sim) {
  const { drill } = await import('./childhood.js');
  st.skills = st.skills || {};
  const S = st.skills[st.year] = st.skills[st.year] || {};
  if (S[kind] != null) return;
  let mine;
  if (sim) {
    const e = effectiveStats(st), r = seeded(st, 'skills', st.year, kind);
    mine = kind === 'drive' ? Math.round(driveCarry(e.power, e._spd) + 22 + r.normal() * 8) : Math.round((1.5 + Math.max(0, 85 - playerRating(st)) * 0.13 + Math.abs(r.normal()) * 2) * 10) / 10;
  } else if (kind === 'drive') {
    let best = 0;
    await drill(st, { mode: 'range', balls: 6, title: '長打大賽', goal: '6 球取最遠（左右 25 碼內才算）', stat: () => `最遠 <b>${best ? Math.round(best) + ' 碼' : '—'}</b>`, score: res => { const yd = res.total / YD; if (res.result === 'rest' && Math.abs(res.offline / YD) <= 25 && yd > best) best = yd; return 0; } });
    mine = Math.round(best);
  } else {
    let best = 99;
    // 近旗：奧古斯塔國家@C 第 12 洞（155 碼的三桿洞），量球停下來的位置到旗桿的距離
    await drill(st, { mode: 'range', balls: 5, autoClub: true, cfg: { courseId: 'c_augusta', startHole: 11, wind: 'light' }, title: '近旗賽 · 奧古斯塔 12 號（155 碼）', goal: '5 球取離旗桿最近（公尺）；落水不算', stat: () => `最近 <b>${best < 99 ? best.toFixed(1) + ' 公尺' : '—'}</b>`, score: (res, game) => { const e = res.end || []; const d = game && game.hole ? game.hole.distToPin(e[0], e[2]) : Math.hypot(res.total - 150 * YD, res.offline); if (res.result === 'rest' && d < best) best = d; return 0; } });
    mine = Math.round(best * 10) / 10;
  }
  const field = aiField(st, kind).concat([{ name: st.player.name, v: mine, me: true }]);
  field.sort((a, b) => kind === 'drive' ? b.v - a.v : a.v - b.v);
  const pos = field.findIndex(x => x.me) + 1;
  S[kind] = { v: mine, pos };
  const prize = pos === 1 ? 150000 : pos === 2 ? 50000 : 0;
  if (prize) earn(st, prize, `明星技巧賽 ${kind === 'drive' ? '長打' : '近旗'}（第 ${pos} 名）`, 'other');
  if (pos === 1) { st.player.fame += 5000; st.cnt.skillsWin = (st.cnt.skillsWin || 0) + 1; addNews(st, `${st.player.name} 拿下明星技巧賽${kind === 'drive' ? '長打' : '近旗'}冠軍（${kind === 'drive' ? mine + ' 碼' : mine + ' 公尺'}）`); addTimeline(st, `明星技巧賽${kind === 'drive' ? '長打' : '近旗'}冠軍`); st.trophies.push({ y: st.year, id: 'skills_' + kind, name: `明星技巧賽${kind === 'drive' ? '長打' : '近旗'}冠軍`, tier: 'exh', tour: 'exh', kind: 'plate' }); }
  localSave(st);
  await dialog(`<div class="cm-list">${field.map((x, i) => `<div class="cm-li"><div class="main"><b>${i + 1}. ${esc(x.name)}${x.me ? ' <span class="cm-pill gold">你</span>' : ''}</b></div><div class="side num">${kind === 'drive' ? x.v + ' 碼' : x.v + ' 公尺'}</div></div>`).join('')}</div>${prize ? `<p style="margin-top:8px">獎金 ${money(prize)}</p>` : ''}`, { title: `明星技巧賽 · ${kind === 'drive' ? '長打' : '近旗'}`, wide: true, buttons: [['好', 'green']] });
  const { checkAch } = await import('./achievements.js'); checkAch(st);
}

// ---------- 學院學員（青少年學院）：每年長大、轉職業、拿冠軍；退休後可以親自指導 ----------
export function academyYear(st, logs) {
  if (!st.assets.academy) return;
  const r = rng(hash(st.seed + 'acad' + st.year));
  const list = st.academy = st.academy || [];
  const n = ((st.courseUp && st.courseUp.range) || 0) >= 2 ? 2 : 1;
  for (let k = 0; k < n; k++) { const nm = makeName(r, st.player.country); list.push({ name: nm, y: st.year, age: 13 + Math.floor(r() * 3), r: 38 + r() * 8, pot: 66 + r() * 22, wins: 0 }); logs.push(`學院收了一位新學員：${nm}`); }
  for (const s of list) {
    if (s.gone) continue;
    s.age = (s.age || 14) + 1;
    s.r = Math.min(s.pot, (s.r || 40) + (s.age < 22 ? 3.2 : 1.2) + r.normal() * 0.8 + (s.coached === st.year ? 2 : 0));
    if (!s.pro && s.age >= 18 && s.r >= 64) { s.pro = st.year; logs.push(`學員 ${s.name} 轉職業了`); addNews(st, `${st.player.name} 學院的 ${s.name} 轉為職業選手`); }
    if (s.pro && s.r >= 74 && r() < (s.r - 72) * 0.08) { s.wins++; st.cnt.academyWin = 1; const share = 60000; earn(st, share, `學員 ${s.name} 奪冠的學院分紅`, 'other'); st.player.fame += 3000; logs.push(`學員 ${s.name} 拿下職業冠軍！`); addNews(st, `${st.player.name} 學院出身的 ${s.name} 拿下職業冠軍`); }
    if (s.age >= 40) s.gone = true;
  }
}
export function academyDlg(st, after) {
  const list = (st.academy || []).filter(s => !s.gone);
  dialog(`<p class="cm-note">每年 12 月收新學員（練習場與學院升到 2 級以上每年 2 位）。親自指導一位學員：那一年多成長 +2（每位每年一次，$50,000）。學員轉職業、奪冠時學院有分紅。</p>
    <div class="cm-list" style="margin-top:8px">${list.map((s, i) => `<div class="cm-li"><div class="main"><b>${esc(s.name)}${s.pro ? ' <span class="cm-pill green">職業</span>' : ''}${s.wins ? ` <span class="cm-pill gold">${s.wins} 冠</span>` : ''}</b><span>${s.age} 歲 · 實力 ${s.r.toFixed(1)} · 潛力 ${s.pot >= 82 ? '頂尖' : s.pot >= 74 ? '很高' : '普通'} · ${s.y} 年入學</span></div>
      <div class="side">${s.coached === st.year ? '<span class="cm-pill">今年指導過</span>' : `<button class="cm-btn small green" data-co="${i}">親自指導</button>`}</div></div>`).join('') || '<div class="cm-empty">今年年底會收第一批學員。</div>'}</div>`, {
    title: '青少年學院', wide: true, bind: (ov, close) => {
      ov.querySelectorAll('[data-co]').forEach(b => b.onclick = () => {
        if (st.money.cash < 50000) return toast('資金不夠');
        spend(st, 50000, `指導學員 ${list[Number(b.dataset.co)].name}`); list[Number(b.dataset.co)].coached = st.year; localSave(st); close(); academyDlg(st, after);
      });
    },
  });
}

// ---------- 年度頒獎典禮 ----------
export async function awardsCeremony(st) {
  const y = st.pendingAwards; st.pendingAwards = null;
  const A = (st.awards || {})[y]; if (!A) return localSave(st);
  const line = (n, a) => a ? `${n}：${a.me ? `<b>${esc(st.player.name)}</b>（你）` : esc(a.name)}` : '';
  const mine = ['poy', 'roy', 'comeback'].filter(k => A[k] && A[k].me);
  const i = await story({ small: `${y} SEASON AWARDS`, title: `${y} 年度頒獎典禮`, img: 'augusta-clubhouse.jpg', paras: ['巡迴賽的年度頒獎典禮在會館的宴會廳舉行，大螢幕播著這一季的精彩畫面。', [line('年度最佳球員', A.poy), line('年度新人', A.roy), line('最佳回春', A.comeback)].filter(Boolean).join('<br>'), mine.length ? '主持人念到你的名字。全場起立鼓掌，你走上台。' : `你今年拿了 ${A.wins} 座冠軍、獎金 ${money(A.money)}。坐在台下，你在心裡記下明年的目標。`],
    choices: mine.length ? [['感謝家人與團隊', '紳士'], ['「明年我會拿更多」', '自信'], ['講一個這一季的糗事', '幽默']] : [['為得獎的人鼓掌', ''], ['提早離開去練習場', '訓練經驗 +']], skip: false });
  if (mine.length) { const k = ['gent', 'conf', 'humor'][Math.max(0, i)]; st.media = st.media || {}; st.media[k] = (st.media[k] || 0) + 1; st.player.fame += 8000 * mine.length; addPhoto(st, `${y} 年度頒獎典禮`, 'augusta-clubhouse.jpg'); }
  else if (i === 1) { const { train } = await import('./growth.js'); train(st.player, 'iron', 30); }
  localSave(st);
  const go2 = await story({ small: `${y} 年度回顧`, title: '這一季', paras: [`冠軍 ${A.wins} 座 · 獎金 ${money(A.money)}${st.rankNow ? ` · 年底世界排名第 ${st.rankNow} 名` : ''}`], choices: [['看年度回顧', '冠軍、最佳一輪、獎金、排名曲線'], ['繼續', '']], skip: false });
  return go2 === 0 ? 'year' : null;
}

// ---------- 收藏室：簽名球桿、交換的球衣、冠軍旗、歷史紀念品（每季的拍賣會）----------
const ICON = {
  club: '<path d="M30 6 l4 0 l2 40 l8 6 l-2 4 l-12 -2z" fill="#b8bec6"/>', ball: '<circle cx="32" cy="32" r="16" fill="#f4f4f0" stroke="#bbb"/><circle cx="27" cy="27" r="1.5" fill="#ccc"/><circle cx="35" cy="29" r="1.5" fill="#ccc"/><circle cx="30" cy="36" r="1.5" fill="#ccc"/>',
  flag: '<path d="M22 8 v48" stroke="#ccc" stroke-width="3"/><path d="M24 10 h22 l-6 8 l6 8 h-22z" fill="#c0392b"/>', jersey: '<path d="M20 14 l8 -4 h8 l8 4 l6 10 l-6 4 v26 h-24 v-26 l-6 -4z" fill="#20324f"/><text x="32" y="40" font-size="12" fill="#fff" text-anchor="middle">7</text>',
  memo: '<rect x="16" y="12" width="32" height="40" rx="3" fill="#f2ead8" stroke="#c9a85c"/><path d="M22 22 h20 M22 30 h20 M22 38 h14" stroke="#9a8a6a"/>', bag: '<rect x="22" y="14" width="20" height="40" rx="6" fill="#6a3a1a"/><rect x="22" y="22" width="20" height="4" fill="#c9a85c"/>',
  glove: '<path d="M22 54 v-22 l2 -16 h4 v14 l2 -18 h4 v18 l2 -16 h4 v18 l2 -10 h4 v18 q0 14 -12 14z" fill="#f4f4f0" stroke="#bbb"/>',
};
export const collectSvg = k => `<svg viewBox="0 0 64 64" aria-hidden="true">${ICON[k] || ICON.memo}</svg>`;
export function auctionLots(st) {
  const q = st.year * 4 + Math.floor((st.week - 1) / 13), r = rng(hash(st.seed + ':auction:' + q));
  const owned = new Set((st.collection || []).map(c => c.name));
  return r.shuffle(AUCTION.map((a, i) => i)).map(i => AUCTION[i]).filter(a => !owned.has(a[0])).slice(0, 2).map(a => ({ name: a[0], kind: a[1], price: Math.round(a[2] * (0.85 + r() * 0.4) / 1000) * 1000, desc: a[3] }));
}
// 收藏區（和獎盃放在同一個獎盃室：3D 房間的前半部、2D 卡片的下半部）
export function collectionHtml(st) {
  const C = st.collection || [];
  return `<h4 style="margin:14px 0 4px;font-size:14px">收藏區<small style="font-weight:400;color:var(--ink3,#888);margin-left:6px">${C.length} 件 · 3D 房間的前半部</small></h4>
    <p class="cm-note">贏大賽拿到第 18 洞旗、團體賽和對手交換球衣、對宿敵每贏 5 次拿到簽名球、事件裡傳奇與新星送的簽名物，還有每一季的歷史紀念品拍賣會。</p>
    ${C.length ? `<div class="cm-trophy" style="margin-top:8px">${C.slice().reverse().map(c => `<div title="${esc(c.desc || '')}">${collectSvg(c.kind)}<b>${esc(c.name)}</b>${c.y} · ${esc(COLLECT_KIND[c.kind] || '')}</div>`).join('')}</div>` : '<div class="cm-empty">還沒有收藏</div>'}`;
}
export function auctionHtml(st) {
  const lots = st.status.amateur ? [] : auctionLots(st);
  return lots.length ? `<div class="cm-card"><h3>這一季的拍賣會<small>買到的放進獎盃室的收藏區</small></h3><div class="cm-list">${lots.map((l, i) => `<div class="cm-li"><div class="main"><b>${esc(l.name)}</b><span>${esc(l.desc)}</span></div><div class="side"><button class="cm-btn small green" data-lot="${i}">${money(l.price, { short: true })}</button></div></div>`).join('')}</div></div>` : '';
}
export function bindCollection(st, el, after) {
  const lots = auctionLots(st);
  el.querySelectorAll('[data-lot]').forEach(b => b.onclick = () => {
    const l = lots[Number(b.dataset.lot)]; if (!l) return;
    if (st.money.cash < l.price) return toast('資金不夠');
    spend(st, l.price, `拍賣會：${l.name}`, 'cost');
    st.collection = st.collection || []; st.collection.push({ name: l.name, kind: l.kind, from: '拍賣會', y: st.year, desc: l.desc });
    addTimeline(st, `在拍賣會買下${l.name}`); localSave(st); toast(`買下：${l.name}`); after();
  });
}
