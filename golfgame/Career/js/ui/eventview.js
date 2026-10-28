// 比賽週：週一（資格賽、媒體日）→ 週二練習輪 → 週三 Pro-Am → 四輪（每輪選打法）→ 晉級線 → 延長賽 → 頒獎、記者會
//   比洞賽（美國業餘、團體賽）、Skins Game、名人賽週的傳統另外處理
import { register, go, story, storyResult, dialog, toast, header, ui, tpHtml, closeOv } from './shell.js';
import { cur, localSave, sync } from '../state.js';
import { esc, money, toPar, sum, clamp, rng, hash, delay, seeded } from '../util.js';
import { playFanfare } from '../../../js/audio.js';
import { cinfo, prepareRound, leaderboard, finishMyRound, applyCut, finalStandings, playoffNeeded, playoffHole, prizeOf, myTotal, totalOf, WIND_CFG, WIND_ZH, teeOf, setupOf, projectedCut, isHome, roundsOf, createEvent } from '../event.js';
import { ME, nameOf, findP, ABS, styleOf, STYLE_ZH, histName } from '../world.js';
import { CHAMP_GIFT, itemById } from '../data/items.js';
import { endWeek, settleEvent, addNews, addTimeline, addPhoto, spend, earn, travelCost, fill, START_YEAR, findEvent, queueMain, giveItem, turnProCore } from '../life.js';
import { playRound, pendingResume, clearResume, tip } from './ingame.js';
import { holeScore, roundMean, courseAdj, holeAdjs, driveCarry, simEventScores } from '../sim.js';
import { effectiveStats, playerRating, addXp } from '../growth.js';
import { pressFor, answerPress, text, rivalRecord, rivalKeepUp, checkMain, applyFx } from '../story.js';
import { MAJOR_WEEK, MAJOR_AFTER } from '../data/story3.js';
import { slamStatus, slamOnLine, slamText } from '../slam.js';
import { offerChallenge, settleChallenge, updateRecords, saveClassic } from '../extras.js';
import { checkAch } from '../achievements.js';
import { NEWS } from '../data/story.js';
import { MAJOR_ZH, TOUR_ZH } from '../data/calendar.js';
import { qschoolResult, hasCard } from '../tours.js';
import { trophySvg } from './trophy.js';
import { giveKnow } from '../childhood.js';
import { teamSide } from '../data/players.js';
import { matchEvent } from './match.js';

const MODES = [['full', '完整 18 洞', '全部自己打（35~50 分鐘）· 經驗 100% + 完賽獎勵 15%'], ['nine', '精華 9 洞', '自己打其中 9 洞，其他依素質與手感模擬（18~25 分鐘）'], ['key', '關鍵時刻', '系統挑出這一輪最關鍵的 4 顆球，直接把球放在那個位置（6~10 分鐘）'], ['sim', '模擬', '直接看結果（10 秒）· 經驗 30%，成績略保守']];

register('event', async body => {
  const st = cur(), E = st.ev;
  if (!E) return go('home');
  if (['usam', 'ryder', 'presidents', 'walker', 'palmer', 'jryder', 'jpres', 'skins'].includes(E.kind)) return matchEvent(body, st, E);
  const ci = cinfo(E.course);
  header(`<span>${esc(E.name)}</span>`);
  const head = `<div class="cm-hero"><small>${esc(TOUR_ZH[E.tour] || '')} · ${E.year} 年第 ${E.w} 週</small><h2>${esc(E.name)}</h2><div class="meta">${esc(ci.name)} · Par ${ci.par} · ${ci.blackYards.toLocaleString()} 碼${E.purse && !st.status.amateur ? ' · 總獎金 ' + money(E.purse, { short: true }) : ''}</div>${E.note ? `<div class="meta" style="margin-top:6px">${esc(E.note)}</div>` : ''}${E.major && !st.status.amateur && slamOnLine(st, E.id) && !E.settled ? `<div class="meta" style="margin-top:6px;color:var(--champ2,#e7d29a);font-weight:700">拿下這一座就完成${slamText(slamOnLine(st, E.id))}</div>` : ''}<div style="margin-top:10px"><button class="cm-btn small ghost" data-evpl>素質・技能卡・裝備</button></div></div>`;
  // 比賽週也能去球員頁加點、換卡、換裝備（首頁會帶回比賽）
  //   （綁定記號不能和按鈕用同一個 data-evpl：closest 會比對到內容區本身，任何點擊都會跳去球員頁）
  if (!body.dataset.evplBound) { body.dataset.evplBound = 1; body.addEventListener('click', e => { if (e.target.closest('button[data-evpl]')) go('player'); }); }
  if (E.day === 'mon') return monday(body, st, E, head);
  if (E.day === 'tue') return tuesday(body, st, E, head);
  if (E.day === 'wed') return wednesday(body, st, E, head);
  if (E.day === 'post') return results(body, st, E, head);
  return roundScreen(body, st, E, head);
});

// ---------- 週一：週一資格賽 / 媒體日 / 旅費 ----------
async function monday(body, st, E, head) {
  // 旅費（比賽週一開始就付）
  if (!E.paid) {
    const t = travelCost(st, E.region, E.id);
    spend(st, t.cost, `${E.name} 旅費與住宿`, 'cost');
    st.player.energy = clamp(st.player.energy - t.energy, 0, 100);
    st.player.mood = clamp(st.player.mood + t.mood, 0, 100);
    const ev = findEvent(st, E.key);
    const fee = E.tour === 'qs' ? (ev && ev.fee) || 0 : E.tour === 'junior' ? (ev && ev.inv ? 450 : 80) : E.tour === 'am' ? 250 : 0;
    if (fee) spend(st, fee, `${E.name} 報名費`, 'cost');
    E.paid = true; localSave(st);
  }
  if (E.how === 'mq' || E.how === 'qual') return qualifier(body, st, E, head);
  await majorWeekStory(st, E, 'mon');
  await offerChallenge(st, E);
  E.day = (E.tour === 'junior' || E.tour === 'ncaa' || E.tour === 'qs' || E.tour === 'kids') ? 'r0' : 'tue';
  if (!st.status.amateur && st.player.fame > 5000 && E.day === 'tue') { st.player.fame += 200; }
  localSave(st);
  go('event');
}
// 週一資格賽（PGA / KFT 前 4 名）、美國公開賽 / 英國公開賽資格賽（36 洞前段）、美國業餘資格賽
async function qualifier(body, st, E, head) {
  const two = E.how === 'qual', adv = two ? 12 : 4, field = two ? 120 : 100;
  body.innerHTML = head + `<div class="cm-card"><h3>${two ? '資格賽（36 洞）' : '週一資格賽'}</h3><p>${field} 個人搶 ${adv} 個正賽名額。${two ? '一天打 36 洞。' : '早上六點半開球。'}</p>
    <div class="cm-seg" style="margin:10px 0" id="q-mode">${MODES.filter(m => m[0] !== 'nine').map(m => `<button data-m="${m[0]}">${m[1]}</button>`).join('')}</div><p class="cm-note">打法說明同正賽；資格賽不算世界排名。</p></div>`;
  body.querySelectorAll('#q-mode button').forEach(b => b.onclick = async () => {
    const ci = cinfo(E.course), mode = b.dataset.m, r = rng(hash(E.key + ':mq'));
    const lvl = (E.tour === 'kft' ? 64 : E.tour === 'pga' ? 68 : E.tour === 'tpga' ? 56 : 66) + (({ casual: -0.3, real: 2.2 })[st.opt.difficulty] || 0);      // 難度加減同 event.js
    const others = Array.from({ length: field - 1 }, () => { let t = 0; for (let k = 0; k < (two ? 2 : 1); k++) t += Math.round(ci.par + roundMean(lvl + r.normal() * 3.5) + courseAdj(ci, {}) + r.normal() * 3); return t; }).sort((a, b) => a - b);
    let mine = 0;
    for (let k = 0; k < (two ? 2 : 1); k++) mine += await playQuick(st, E, mode, k);
    const pos = others.filter(t => t < mine).length + 1, line = others[adv - 1];
    const ok = mine <= line && pos <= adv + 1;
    const par = ci.par * (two ? 2 : 1);
    if (ok) {
      st.cnt.mqPass = (st.cnt.mqPass || 0) + (E.how === 'mq' ? 1 : 0);
      E.how = 'card'; E.day = E.tour === 'kft' || E.tour === 'tpga' ? 'r0' : 'tue';
      addNews(st, `${st.player.name} 從${two ? '資格賽' : '週一資格賽'}打進 ${E.name}`);
      await storyResult('拿到正賽名額！', `${mine} 桿（${toPar(mine - par)}），第 ${pos} 名。`, ['你的名字被加進正賽的開球表。']);
    } else {
      await storyResult('差一點', `${mine} 桿（${toPar(mine - par)}），第 ${pos} 名。資格線是 ${toPar(line - par)}。`, ['這一週沒有正賽可以打。']);
      return finishWeek(st, E, false);
    }
    localSave(st); go('event');
  });
}
// 資格賽、練習用：打一輪拿總桿
export async function playQuick(st, E, mode, k) {
  const ci = cinfo(E.course);
  const R = playerRating(st), sim = simEventScores(hash(E.key + ':q:' + k + st.seed), ci.holes, R, ci, [{ wind: 1 }])[0];
  if (mode === 'sim') return sum(sim) + 1;
  const holeIdx = mode === 'key' ? keyHoles(ci, 0, 1, false) : [...Array(18).keys()];
  const starts = mode === 'key' ? keyStarts(st, ci, holeIdx) : null;
  let res;
  do res = await playRound({ restartable: true, label: E.name + ' 資格賽', key: E.key, cfg: { courseId: E.course, holeIdx, tee: 'black', wind: 'normal', career: { starts } }, noHoleCard: mode === 'key', bcast: () => null });
  while (res.restart);      // 重新開始這一輪
  return sum(ci.holes.map((h, i) => res.scores[i] ?? sim[i]));
}

// ---------- 週二：練習輪 ----------
async function tuesday(body, st, E, head) {
  await majorWeekStory(st, E, 'tue');
  // 時差事件選了「多休息一天」：這一場沒有練習輪
  if (st.story.flags.skipPractice) { delete st.story.flags.skipPractice; toast('時差還沒調好：這週跳過練習輪'); E.day = 'wed'; localSave(st); return go('event'); }
  // 名人賽週的週二晚上：衛冕冠軍主辦冠軍晚宴（決定菜單）
  if (E.id === 'masters' && st.titles.some(t => t.id === 'masters' && t.y === E.year - 1) && !E.dinner) {
    E.dinner = true;
    const { MAIN, MENUS } = await import('../data/story.js');
    const { menuFor } = await import('../story.js');
    const m = MAIN.defend, menu = menuFor(st.player.country);
    await story({ small: 'TUESDAY · CHAMPIONS DINNER', title: m.title, img: m.img, paras: [...m.text, `你端出的菜單：${menu.join('、')}。`, '歷屆冠軍們吃得很開心，有人問你能不能再來一碗。'] });
    addTimeline(st, `主辦名人賽冠軍晚宴（${menu.join('、')}）`);
    localSave(st);
  }
  body.innerHTML = head + `<div class="cm-card"><h3>週二 · 練習輪</h3><p>打 3 洞熟悉果嶺：這一週讀果嶺 +3。</p>
    <div class="cm-row wrap" style="margin-top:10px"><button class="cm-btn green" id="t-play">打 3 洞練習輪</button><button class="cm-btn ghost" id="t-quick">快速完成（讀果嶺 +3）</button><button class="cm-btn ghost" id="t-skip">休息（體能 +5）</button></div></div>`;
  const next = () => { E.day = 'wed'; localSave(st); go('event'); };
  document.getElementById('t-play').onclick = async () => {
    const r = rng(hash(E.key + ':pr')), idx = r.shuffle([...Array(18).keys()]).slice(0, 3).sort((a, b) => a - b);
    await playRound({ label: E.name + ' 練習輪', key: E.key, practiceRound: true, quitText: '結束練習輪？', cfg: { courseId: E.course, holeIdx: idx, tee: teeOf(st, E), gimme: 1, mulligans: 9, wind: 'normal', career: { practice: true } }, bcast: () => ({ pos: '練習', score: 0, line: `${esc(E.name)} · 練習輪` }) });
    E.practice = true; addXp(st.player, 30); next();
  };
  document.getElementById('t-quick').onclick = () => { E.practice = true; next(); };
  document.getElementById('t-skip').onclick = () => { st.player.energy = clamp(st.player.energy + 5, 0, 100); next(); };
}

// ---------- 週三：Pro-Am / 贊助拍攝 / 名人賽的三桿洞大賽 ----------
async function wednesday(body, st, E, head) {
  await majorWeekStory(st, E, 'wed');
  const pro = !st.status.amateur;
  const isMasters = E.id === 'masters';
  body.innerHTML = head + `<div class="cm-card"><h3>週三 · ${isMasters ? '三桿洞大賽' : 'Pro-Am'}</h3>
    ${isMasters ? `<p>會內的三桿洞球場。${esc(text(st, '{family_who}'))}穿上白色連身服當你的桿弟。傳說拿到冠軍的人，那一週不會贏名人賽。</p>` : pro ? '<p>和贊助商、名人搭檔打 9 洞：人氣與贊助商好感。</p>' : '<p>業餘選手的週三：和其他業餘選手交流，或是多練一下。</p>'}
    <div class="cm-row wrap" style="margin-top:10px">${isMasters ? '<button class="cm-btn green" id="w-par3">參加三桿洞大賽</button>' : pro ? '<button class="cm-btn green" id="w-proam">參加 Pro-Am</button>' : ''}${pro && st.sponsors.length ? '<button class="cm-btn ghost" id="w-shoot">贊助拍攝</button>' : ''}<button class="cm-btn ghost" id="w-rest">休息、練推桿</button></div></div>`;
  const next = () => { E.day = 'r0'; localSave(st); go('event'); };
  const pa = document.getElementById('w-proam');
  if (pa) pa.onclick = () => { st.player.fame += 600; st.rel.sponsor = clamp(st.rel.sponsor + 5, 0, 100); st.player.energy = clamp(st.player.energy - 5, 0, 100); E.proam = true; toast('Pro-Am：人氣 +600、贊助商好感 +5'); next(); };
  const sh = document.getElementById('w-shoot');
  if (sh) sh.onclick = () => { const pay = 20000 + Math.round(st.player.fame * 0.05); earn(st, pay, '贊助拍攝', 'spon'); st.player.energy = clamp(st.player.energy - 8, 0, 100); toast(`贊助拍攝 ${money(pay)}，體能 −8`); next(); };
  document.getElementById('w-rest').onclick = () => { st.player.energy = clamp(st.player.energy + 4, 0, 100); next(); };
  const p3 = document.getElementById('w-par3');
  if (p3) p3.onclick = async () => {
    const ci = cinfo(E.course), idx = ci.holes.map((h, i) => (h[0] === 3 ? i : -1)).filter(i => i >= 0);
    const res = await playRound({ label: '三桿洞大賽', key: E.key, quitText: '結束三桿洞大賽？', cfg: { courseId: E.course, holeIdx: idx, tee: 'white', gimme: 0, wind: 'light', career: { par3: true } }, bcast: () => ({ pos: 'Par 3', score: 0, line: '三桿洞大賽' }) });
    const mine = sum(Object.values(res.scores)), par = idx.length * 3, best = par - 3 - (hash(E.key) % 2);
    if (Object.keys(res.scores).length === idx.length && mine <= best) { st.story.flags.par3win = E.year; await storyResult('三桿洞大賽冠軍！', `${mine} 桿（${toPar(mine - par)}）。`, ['大家都笑著提醒你那個傳說。']); }
    else await storyResult('三桿洞大賽', `${mine} 桿（${toPar(mine - par)}）。`, ['觀眾的歡呼聲從其他洞傳過來，名人賽的週末要開始了。']);
    st.player.mood = clamp(st.player.mood + 8, 0, 100);
    next();
  };
}

// ---------- 每一輪 ----------
function roundScreen(body, st, E, head) {
  const ri = Number(E.day.slice(1)), ci = cinfo(E.course);
  if (!E.me.sc[ri]) { prepareRound(st, E, ri); localSave(st); }
  // 上次這一輪打到一半關掉遊戲／跳出去：接著打（從離開的那一洞第一桿開始）
  const pr = pendingResume(st), resumable = pr && pr.m.key === E.key && pr.m.label === `${E.name} 第 ${ri + 1} 輪` && pr.r.state ? pr : null;
  if (pr && !resumable) clearResume();
  const lb = leaderboard(E, ri, resumable ? thruNow(E, ri) : 0);
  const wx = E.wx[ri], final = ri === E.rounds - 1;
  const meRow = lb.find(x => x.me), contending = meRow && meRow.posN <= 8;
  const rec = final && (E.major || contending) ? 'full' : E.tour === 'junior' || E.tour === 'ncaa' ? 'nine' : 'key';
  body.innerHTML = head + (resumable ? `<div class="cm-card" style="border-color:var(--champ)"><h3>上次沒打完的第 ${ri + 1} 輪</h3>
      <p>已打完 ${thruNow(E, ri)} 洞，從第 ${resumable.r.holeNo || resumable.r.state.k + 1} 洞的第一桿接著打（離開時那一洞打到一半的桿數不算）。排行榜和你離開時一樣。</p>
      <button class="cm-btn green" id="r-resume">接著打</button></div>` : '') + `<div class="cm-card"><h3>第 ${ri + 1} 輪<small>${['週四', '週五', '週六', '週日', '第五天', '第六天'][ri] || ''}</small></h3>
      <div class="cm-row wrap" style="font-size:13px;margin-bottom:8px"><span class="cm-pill">天氣：${WIND_ZH[wx]}</span>${ri >= 2 && E.cutLine != null ? `<span class="cm-pill">晉級線 ${toPar(E.cutLine)}</span>` : ''}${E.practice ? '<span class="cm-pill green">練習輪：讀果嶺 +3</span>' : ''}${(E.delay || {})[ri - 1] === 'storm' ? '<span class="cm-pill">上一輪雷雨延賽</span>' : ''}${final && contending ? '<span class="cm-pill gold">最後一輪 · 爭冠</span>' : ''}</div>
      <div class="cm-list" id="r-modes">${MODES.map(m => `<div class="cm-li click" data-m="${m[0]}"><div class="main"><b>${m[1]}${m[0] === rec ? ' <span class="cm-pill gold">建議</span>' : ''}</b><span>${m[2]}</span></div><div class="side">›</div></div>`).join('')}</div>
      <div id="r-nine" class="cm-seg" style="margin-top:8px;display:none"><button data-n="front">前九洞</button><button data-n="back" class="on">後九洞</button></div></div>
    <div class="cm-card"><h3>排行榜<small>${resumable ? '目前' : ri ? `第 ${ri} 輪後` : '開賽前'}</small></h3>${lbTable(lb, 12, resumable ? { today: true } : {})}</div>`;
  if (resumable) document.getElementById('r-resume').onclick = () => resumeRound(st, resumable);
  let nine = 'back';
  body.querySelectorAll('#r-nine button').forEach(b => b.onclick = () => { nine = b.dataset.n; body.querySelectorAll('#r-nine button').forEach(x => x.classList.toggle('on', x === b)); });
  body.querySelectorAll('#r-modes [data-m]').forEach(el => el.onclick = async () => {
    const m = el.dataset.m;
    if (m === 'nine' && document.getElementById('r-nine').style.display === 'none') { document.getElementById('r-nine').style.display = ''; el.querySelector('.side').textContent = '開始 ›'; return; }
    if (resumable) { if (!confirm('放棄上次沒打完的進度，這一輪從第一洞重新打？')) return; clearResume(); }
    await playEventRound(st, E, ri, m, nine);
  });
}
export function lbTable(rows, n = 10, opts = {}) {
  const me = rows.find(x => x.me);
  let list = rows.slice(0, n);
  if (me && !list.includes(me)) list = list.concat([{ gap: true }, me]);
  return `<div class="cm-scroll-x"><table class="lb"><tr><th>名次</th><th>球員</th><th style="text-align:center">總計</th><th style="text-align:center">洞</th>${opts.today ? '<th style="text-align:center">今天</th>' : ''}</tr>${list.map(x => x.gap ? '<tr><td colspan="5" style="text-align:center;color:var(--mut)">⋯</td></tr>' : `<tr class="${x.me ? 'me' : ''} ${x.cut ? 'cut' : ''}"><td class="pos">${x.pos}</td><td>${esc(x.name)}${!x.me && x.id ? `<span class="sty sty-${styleOf(x.id)}">${STYLE_ZH[styleOf(x.id)].replace('型', '')}</span>` : ''}${x.c ? `<span class="ctry">${x.c}</span>` : ''}${x.am ? '<span class="am">(a)</span>' : ''}</td><td class="tp ${x.toPar < 0 ? 'u' : ''}">${x.cut && x.thru === 'CUT' ? toPar(x.toPar) : toPar(x.toPar)}</td><td class="th">${x.thru === 18 ? 'F' : x.thru === 0 ? '—' : x.thru}</td>${opts.today ? `<td class="th">${x.today != null ? toPar(x.today) : ''}</td>` : ''}</tr>`).join('')}</table></div>`;
}

// 關鍵時刻：挑 4 洞（最後一輪爭冠時是最後 4 洞）
export function keyHoles(ci, ri, nR, contend) {
  if (ri === nR - 1 && contend) return [14, 15, 16, 17];
  const H = ci.holes.map((h, i) => ({ i, par: h[0], hcp: h[4] || 9 }));
  const pick = [];
  const add = x => { if (x && !pick.includes(x.i)) pick.push(x.i); };
  add(H.filter(h => h.par === 3).sort((a, b) => a.hcp - b.hcp)[0]);
  add(H.filter(h => h.par === 5).sort((a, b) => a.hcp - b.hcp)[0]);
  add(H.filter(h => h.par === 4).sort((a, b) => a.hcp - b.hcp)[0]);
  add(H[17]);
  for (const h of H.sort((a, b) => a.hcp - b.hcp)) { if (pick.length >= 4) break; add(h); }
  return pick.sort((a, b) => a - b);
}
// 關鍵時刻的球位：三桿洞從發球台；四桿洞第二桿；五桿洞依距離決定要不要兩桿上果嶺
export function keyStarts(st, ci, idx) {
  const eff = effectiveStats(st), drive = driveCarry(eff.power, eff._spd) + 18, out = {};
  const r = seeded(st, 'key', st.year, st.week, idx.join(','));
  for (const i of idx) {
    const h = ci.holes[i], par = h[0], yd = (h[5] && h[5].tees && h[5].tees.black) || h[1];
    if (par === 3) continue;
    const lie = r() < 0.72 ? 'fairway' : 'rough';
    if (par === 4) out[i] = { strokes: 1, yds: Math.max(60, Math.round(yd - drive * (0.94 + r() * 0.1))), lie };
    else { const left = yd - drive; out[i] = left <= 255 ? { strokes: 1, yds: Math.round(left), lie } : { strokes: 2, yds: Math.round(70 + r() * 50), lie: 'fairway' }; }
  }
  return out;
}

// 壓力等級（0~3）
function pressureFor(st, E, ri) {
  return (game, p) => {
    const holeNo = game.holeNo, final = ri === E.rounds - 1;
    const lb = leaderboard(E, ri, thruNow(E, ri));
    const me = lb.find(x => x.me), lead = lb.find(x => !x.me) || me;
    const gap = me.toPar - Math.min(lead.toPar, me.toPar);
    let lvl = 0;
    if (game.club && game.club.putter && p.strokes + 1 <= game.hole.par) lvl = Math.max(lvl, 1);
    if (ri === 1 && holeNo >= 10 && E.cutTop) { const cl = projectedCut(E, ri, thruNow(E, ri)); if (cl != null && Math.abs(me.toPar - cl) <= 1) lvl = Math.max(lvl, 1); }
    if (final && holeNo >= 10 && me.posN <= 5 && gap <= 2) lvl = Math.max(lvl, 2);
    if (final && holeNo === 18 && gap <= 1 && (E.major || E.playoff || E.tour === 'qs')) lvl = 3;
    if (E.tour === 'qs' && E.stage === 3 && final && holeNo >= 12 && Math.abs(me.posN - 5) <= 3) lvl = Math.max(lvl, 3);
    if (E.inPlayoff) lvl = 3;
    if (final && holeNo >= 10 && me.posN <= 3 && E.major && slamOnLine(st, E.id)) lvl = Math.max(lvl, 2);
    return lvl;
  };
}
// 比賽的場景：觀眾多寡（地方賽 1、巡迴賽 2、大賽 3）、時段光線（最後一輪是黃昏）、最後一洞的看台
function sceneOf(E, ri) {
  const big = E.major || E.id === 'players' || E.playoff || E.tour === 'team' || E.tour === 'olympic';
  const tourLv = ['pga', 'dp', 'kft', 'asia', 'jp', 'champions'].includes(E.tour) ? 2 : 1;
  const final = ri === E.rounds - 1;
  return { gallery: big ? 3 : tourLv, stand: big || (tourLv === 2 && final), light: final && E.rounds > 1 ? 'golden' : hash(E.key + ':light:' + ri) % 2 ? 'afternoon' : 'morning', crowd: big ? 3 : tourLv };
}
const thruNow = (E, ri) => { const sc = E.me.sc[ri] || []; let n = 0; while (n < 18 && sc[n] != null) n++; return n; };

async function playEventRound(st, E, ri, mode, nine) {
  const ci = cinfo(E.course);
  E.me.mode[ri] = { full: '自己打', nine: '精華 9 洞', key: '關鍵時刻', sim: '模擬' }[mode];
  const contend = (() => { const lb = leaderboard(E, ri, 0), me = lb.find(x => x.me); return me && me.posN <= 8; })();
  let holeIdx = mode === 'full' ? [...Array(18).keys()] : mode === 'nine' ? (nine === 'front' ? [0, 1, 2, 3, 4, 5, 6, 7, 8] : [9, 10, 11, 12, 13, 14, 15, 16, 17]) : mode === 'key' ? keyHoles(ci, ri, E.rounds, contend) : [];
  E.me.played[ri] = Array(18).fill(false);
  await weatherDelay(st, E, ri);
  if (mode === 'sim') {
    // 模擬：成績略保守（每洞 3% 機率多 1 桿 = 每輪平均 +0.54 桿）。以前程式寫成 6%（每輪 +1.08 桿、一場 +4.3 桿），
    //   和註解不一致，PGA TOUR 用模擬打一年半，世界排名從第 4 掉到 135
    const sc = E.me.sim[ri].slice(), r = rng(hash(E.key + ':cons:' + ri));
    for (let h = 0; h < 18; h++) if (r() < 0.03) sc[h]++;
    E.me.sc[ri] = sc;
  } else {
    const starts = mode === 'key' ? keyStarts(st, ci, holeIdx) : null;
    // 關鍵時刻：中間沒打的洞用模擬補上（排行榜依順序推進）
    const fillTo = h => { for (let k = 0; k < h; k++) if (E.me.sc[ri][k] == null && !holeIdx.includes(k)) E.me.sc[ri][k] = E.me.sim[ri][k]; };
    let res;
    // 「重新開始這一輪」（遊戲選單）：清掉這一輪的成績，從第一洞重新打（同樣的風、旗位；重打次數重新給）。不限次數，和重打是分開的
    for (;;) {
      E.me.sc[ri] = Array(18).fill(null); E.me.played[ri] = Array(18).fill(false);
      // 精華 9 洞從後九開始時，前九先模擬完成
      if (mode === 'nine' && nine === 'back') for (let h = 0; h < 9; h++) E.me.sc[ri][h] = E.me.sim[ri][h];
      if (holeIdx.length) fillTo(holeIdx[0]);
      localSave(st);
      res = await playRound({ restartable: true,
        label: `${E.name} 第 ${ri + 1} 輪`, key: E.key, home: isHome(st, E), farewell: st.farewell === E.key && ri === E.rounds - 1, practiceRound: E.practice, major: !!E.major, round: ri, evId: E.id, final: ri === E.rounds - 1, qual: E.tour === 'qs',
        cfg: { courseId: E.course, holeIdx, tee: teeOf(st, E), wind: WIND_CFG[E.wx[ri]], stimp: (ci.stimp || 10) + (E.major ? 1.5 : 0) + (E.id === 'usopen' || E.id === 'masters' ? 0.5 : 0), mulligans: st.opt.difficulty === 'casual' ? 1 : 0, seed: hash(E.key + ':seed:' + ri), career: { starts, ev: E.key, round: ri, ...sceneOf(E, ri) } },
        onHole: (k, idx, s) => { E.me.sc[ri][idx] = s; E.me.played[ri][idx] = !(starts && starts[idx]); const nxt = holeIdx[k + 1]; fillTo(nxt == null ? 18 : nxt); localSave(st); },
        bcast: g => bcastLine(E, ri),
        holeCard: () => { const lb = leaderboard(E, ri, thruNow(E, ri)); return lbTable(lb, 5, { today: true }); },
        pressure: pressureFor(st, E, ri),
        leaderboard: () => showLb(E, ri),
        noHoleCard: false,
      });
      if (!res.restart) break;
      st.cnt.restarts = (st.cnt.restarts || 0) + 1; E.restarts = (E.restarts || 0) + 1;
      toast(`第 ${ri + 1} 輪從第一洞重新開始`);
    }
    if (res.quit) addNews(st, `${st.player.name} 第 ${ri + 1} 輪提早離場（剩下的洞用模擬完成）`);
    // 個人修正：自己打的洞和預期的差
    const playedHoles = holeIdx.filter(i => res.scores[i] != null && !(starts && starts[i]));
    if (playedHoles.length >= 6) { const d = sum(playedHoles.map(i => res.scores[i] - E.me.sim[ri][i])) / playedHoles.length * 18; st.corr.push(Math.round(d * 10) / 10); st.corr = st.corr.slice(-20); }
  }
  const total = finishMyRound(E, ri);
  afterRound(st, E, ri, total);
}
function bcastLine(E, ri) {
  const t = thruNow(E, ri), lb = leaderboard(E, ri, t), me = lb.find(x => x.me), lead = lb.find(x => !x.me && !x.cut);
  return { pos: me.pos, score: me.toPar, line: `第 ${ri + 1} 輪 · ${t ? `剩 ${18 - t} 洞` : '第 1 洞'}<br>領先 <b>${esc(shortN(lead.name))} ${toPar(lead.toPar)}</b>${lead.thru === 18 ? ' F' : ''}` };
}
const shortN = n => (/[a-zA-Z]/.test(n) ? n.split(' ').slice(-1)[0] : n);
function showLb(E, ri) {
  const lb = leaderboard(E, ri, thruNow(E, ri));
  const box = document.createElement('div');
  box.className = 'cm-ov open'; box.style.zIndex = 85;
  box.innerHTML = `<div class="cm-dlg wide"><h3>即時排行榜 · 第 ${ri + 1} 輪</h3>${lbTable(lb, 20, { today: true })}<div class="btns"><button class="cm-btn ghost">關閉</button></div></div>`;
  document.body.appendChild(box);
  box.querySelector('button').onclick = () => box.remove();
}

async function afterRound(st, E, ri, total) {
  const ci = cinfo(E.course), par = ci.par;
  // 其他人這一輪全部打完
  const lb = leaderboard(E, ri, 18), me = lb.find(x => x.me);
  if (me.posN === 1) { addNews(st, fill(NEWS.round_lead[ri % 2], { name: st.player.name, event: E.name, round: ri + 1, score: total })); }
  else if (total - par <= -6) addNews(st, fill(NEWS.low_round[0], { name: st.player.name, score: total, toPar: toPar(total - par) }));
  if (total <= 59 && !st.status.amateur && E.tour !== 'junior') st.cnt.fiftynine = 1;
  if (total < (st.cnt.best18 || 999)) st.cnt.best18 = total;
  // 疲勞
  st.player.energy = clamp(st.player.energy - (E.me.mode[ri] === '模擬' ? 2 : 4) * (st.team.staff.includes('nutrition') ? ((st.team.elite || []).includes('nutrition') ? 0.7 : 0.85) : 1), 0, 100);
  // 疼痛：每打一輪累積（年紀越大越多）
  st.player.pain = clamp((st.player.pain || 0) + 0.9 + Math.max(0, st.player.age - 32) * 0.06, 0, 100);
  let msg = [`第 ${ri + 1} 輪 ${total} 桿（${toPar(total - par)}），目前 ${me.pos}（${toPar(me.toPar)}）`];
  // 晉級線
  if (ri === 1 && E.rounds > 2 && E.cutTop) {
    const c = applyCut(E);
    if (c) msg.push(c.made ? `晉級！晉級線 ${toPar(c.line)}` : `沒有晉級（晉級線 ${toPar(c.line)}）`);
    if (c && !c.made) {
      // 其他人打完剩下的輪
      for (let k = 2; k < E.rounds; k++) prepareAIOnly(st, E, k);
      E.day = 'post'; localSave(st);
      await storyResult(`${E.name} · 第 2 輪`, msg[0], msg.slice(1));
      return go('event');
    }
  }
  if (ri >= E.rounds - 1) { E.day = 'post'; }
  else E.day = 'r' + (ri + 1);
  if (me.posN <= 3 && ri < E.rounds - 1 && !st.status.amateur) { const q = pressFor(st, 'lead'); if (q && me.posN === 1) E.pressLead = true; }
  localSave(st); sync();
  await storyResult(`${E.name} · 第 ${ri + 1} 輪`, msg[0], msg.slice(1));
  go('event');
}
function prepareAIOnly(st, E, ri) {
  const ci = cinfo(E.course), o = { setup: setupOf(E), wind: E.wx[ri] ?? 1 };
  for (const e of E.field) if (!e.cut) e.sc[ri] = simEventScores(hash(E.key + ':' + e.id + ':' + ri), ci.holes, e.R, ci, [o])[0];
}

// ---------- 延長賽與結果 ----------
async function results(body, st, E, head) {
  // 延長賽（同分爭冠：第 18 洞重複打）
  const tied = playoffNeeded(E);
  if (tied && E.madeCut !== false) {
    const ids = tied.map(x => x.id);
    if (ids.includes(ME)) { await playoff(st, E, ids); }
    else { const r = rng(hash(E.key + ':po')), w = tied.sort((a, b) => (findR(E, b.id) + r.normal() * 3) - (findR(E, a.id) + r.normal() * 3))[0]; E.playoffWinner = w.id; }
  }
  if (!E.settled) {
    const rows = finalStandings(E);
    const rec = settleEvent(st, E, rows);
    E.settled = true; E.rec = rec;
    afterSettle(st, E, rows, rec);
    localSave(st); sync();
    if (rec.posN === 1) playFanfare();      // 頒獎配樂（只在第一次看到結果時）
    // 大賽結束後的小劇情：奪冠 / 差一點
    if (E.major && !st.status.amateur) {
      const a = rec.posN === 1 ? MAJOR_AFTER.win[E.id] : rec.posN <= 5 ? MAJOR_AFTER.close : null;
      if (a) await storyResult(a[0], text(st, a[1]), rec.posN === 1 ? [slamLine(st)] : []);
    }
  }
  const rows = finalStandings(E), rec = E.rec, me = rows.find(x => x.id === ME);
  const win = rec.posN === 1;
  body.innerHTML = head + `<div class="cm-card" style="${win ? 'border-color:var(--champ);background:linear-gradient(180deg,#fffaf0,#fff)' : ''}"><h3>${win ? '冠軍！' : '最終成績'}</h3>
      ${win ? `<div style="text-align:center">${trophySvg(st.trophies[st.trophies.length - 1] || { kind: 'silver' })}</div>` : ''}
      <div class="cm-stat3"><div><span>名次</span><b class="num" style="font-size:28px">${esc(rec.pos)}</b></div><div><span>總桿</span><b class="num" style="font-size:28px">${rec.total}</b> ${tpHtml(rec.toPar)}</div><div><span>${st.status.amateur ? '世界業餘積分' : '獎金'}</span><b class="num" style="font-size:22px">${st.status.amateur ? '—' : money(rec.prize)}</b></div></div>
      <p class="cm-note" style="margin-top:8px">各輪：${(rec.rounds || []).filter(Boolean).join(' · ')}${rec.pts ? `　·　積分 +${rec.pts}` : ''}${E.playoffWinner ? '　·　延長賽決定冠軍' : ''}</p>
      ${E.qsMsg ? `<p style="margin-top:8px;font-weight:700;color:var(--aug)">${E.qsMsg.map(esc).join('<br>')}</p>` : ''}
      ${E.chal ? `<p style="margin-top:8px">${esc(E.chal.sp)} 的挑戰「${esc(E.chal.text)}」：${E.chal.ok ? `<b style="color:var(--aug)">成功，獎金 ${money(E.chal.reward)}</b>` : '沒有達成（贊助商好感 −1）'}</p>` : ''}
      ${(E.recMsg || []).length ? `<p style="margin-top:6px;font-weight:700;color:var(--champ)">${E.recMsg.map(esc).join('<br>')}</p>` : ''}
      ${win ? '<button class="cm-btn ghost" id="rs-cert" style="margin-top:10px">冠軍證書</button>' : ''}
    </div>
    <div class="cm-card"><h3>最終排行榜</h3>${lbTable(rows.map(x => ({ ...x, pos: x.cut ? 'CUT' : (x.tie ? 'T' : '') + x.pos, posN: x.pos || 999, toPar: x.total - E.par * (x.cut ? 2 : E.rounds), thru: 18, me: x.id === ME })), 15)}</div>
    <button class="cm-btn green block" id="rs-done">完成這一週</button>`;
  if (win) document.getElementById('rs-cert').onclick = () => certificate(st, E, rec);
  document.getElementById('rs-done').onclick = async () => {
    // 記者會（冠軍、前十、領先、沒晉級）
    const kind = win ? (E.major ? 'major' : 'win') : rec.posN <= 10 ? 'top10' : rec.pos === 'CUT' && !st.status.amateur ? 'miss' : null;
    if (kind && !st.status.amateur || (win && kind)) {
      const q = pressFor(st, kind);
      if (q) {
        const i = await story({ small: 'PRESS CONFERENCE', title: '記者會', img: win ? 'augusta-leaderboard.jpg' : null, paras: [`記者：「${text(st, q.q)}」`], choices: q.a.map(a => [{ gent: '紳士', conf: '自信', humor: '幽默', edgy: '話題' }[a[0]] + '　' + text(st, a[1])]), skip: true });
        answerPress(st, q, Math.max(0, i));
      }
    }
    if (win && E.id === 'masters') { const { greenJacket } = await import('./trophy.js'); await greenJacket(st, E, rec); }
    if (st.farewell === E.key) { const { afterFarewell } = await import('../legacy.js'); await afterFarewell(st, E); }
    finishWeek(st, E, true);
  };
}
const findR = (E, id) => (E.field.find(e => e.id === id) || {}).R || 70;
async function playoff(st, E, ids) {
  const ci = cinfo(E.course), names = ids.filter(i => i !== ME).map(i => E.field.find(e => e.id === i)?.name).join('、');
  await story({ small: 'PLAYOFF', title: '延長賽', img: 'augusta-leaderboard.jpg', paras: [`你和 ${names} 同分。`, '驟死賽：第 18 洞重複打，先贏一洞的人就是冠軍。'], ok: '走向第 18 洞發球台', skip: false });
  E.inPlayoff = true;
  let alive = ids.slice();
  for (let n = 0; n < 6 && alive.length > 1 && alive.includes(ME); n++) {
    const ai = playoffHole(E, alive, n);
    const res = await playRound({ label: '延長賽', key: E.key, cfg: { courseId: E.course, holeIdx: [17], tee: 'black', wind: WIND_CFG[E.wx[E.rounds - 1] || 1], stimp: (ci.stimp || 10) + (E.major ? 1.5 : 0), career: { playoff: n } }, pressure: () => 3, bcast: () => ({ pos: 'P' + (n + 1), score: 0, line: `延長賽第 ${n + 1} 洞 · ${alive.length} 人` }), noHoleCard: true, quitText: '離開延長賽？這一洞會用模擬完成。' });
    const mine = res.scores[17] ?? holeScore(rng(hash(E.key + ':pome' + n)), ci.holes[17][0], 0.2, playerRating(st));
    const all = { ...ai, [ME]: mine }, best = Math.min(...alive.map(i => all[i]));
    const txt = alive.map(i => `${i === ME ? '你' : E.field.find(e => e.id === i).name} ${all[i]}`).join('、');
    alive = alive.filter(i => all[i] === best);
    await storyResult(`延長賽第 ${n + 1} 洞`, txt, [alive.length === 1 ? (alive[0] === ME ? '你贏了！' : `${E.field.find(e => e.id === alive[0]).name} 拿下冠軍。`) : '還是同分，再打一次第 18 洞。']);
  }
  if (alive.length > 1) alive = alive.includes(ME) ? [ME] : alive.slice(0, 1);
  E.playoffWinner = alive[0];
  E.inPlayoff = false;
  if (E.playoffWinner === ME) { st.tally.playoffs = (st.tally.playoffs || 0) + 1; }
  giveKnow(st, 'playoff');
}

// 結算之後：新聞、宿敵、Q-School、大賽紀錄、成就
export function afterSettle(st, E, rows, rec) {
  const p = st.player, win = rec.posN === 1, par = E.par * E.rounds;
  const T = st.tally;
  if (win) {
    const first = T.wins === 1 && (E.tour !== 'junior' && E.tour !== 'kids');
    addNews(st, fill((E.major ? NEWS.win_major : first ? NEWS.win_first : NEWS.win)[0], { name: p.name, event: E.name, total: rec.total, toPar: toPar(rec.toPar), major: MAJOR_ZH[E.id] || '', wins: T.wins, finish: '' }), E.major ? 'major' : 'me');
    addTimeline(st, `${E.name} 冠軍`);
    addPhoto(st, `${E.name} 冠軍`, E.id === 'masters' ? 'augusta-10.jpg' : E.id === 'open' ? 'swilcan.jpg' : E.id === 'players' ? 'sawgrass-17.jpg' : E.major ? 'kiawah-18.jpg' : E.tour === 'pga' ? 'pebble-18.jpg' : E.tour === 'junior' || E.tour === 'kids' ? 'boy-flag.jpg' : E.tour === 'am' || E.tour === 'ncaa' ? 'augusta-clubhouse.jpg' : 'green-sun.jpg');
    if (E.tour === 'pga' || E.tour === 'major') { if (T.pgaWins === 1) queueMain(st, 'first_win'); }
    // 戰場晉升（真實規則）：同一季 Korn Ferry 贏 3 場 → 馬上拿到 PGA TOUR 卡；PGA TOUR Americas 贏 2 場 → 馬上升 Korn Ferry
    if (!st.status.amateur && (E.tour === 'kft' || E.tour === 'pta')) {
      const n = st.titles.filter(t => t.y === E.year && t.tour === E.tour).length, s = st.status;
      if (E.tour === 'kft' && n >= 3 && !hasCard(st, 'pga', E.year)) {
        s.cards.pga = E.year + 1; s.mainTour = 'pga'; if (s.stage === 'road') { s.stage = 'tour'; s.rookieYear = s.rookieYear || E.year; }
        addTimeline(st, '戰場晉升：一季 Korn Ferry 三勝，直接升上 PGA TOUR'); addNews(st, `${p.name} 拿下本季 Korn Ferry 第三勝，戰場晉升 PGA TOUR！`, 'me'); queueMain(st, 'pga_card');
      }
      if (E.tour === 'pta' && n >= 2 && !hasCard(st, 'kft', E.year) && !hasCard(st, 'pga', E.year)) {
        s.cards.kft = E.year + 1; s.mainTour = 'kft';
        addTimeline(st, '戰場晉升：一季 PGA TOUR Americas 兩勝，直接升上 Korn Ferry'); addNews(st, `${p.name} 拿下本季 Americas 第二勝，戰場晉升 Korn Ferry Tour！`, 'me');
      }
    }
    if ((E.region === 'tw' && p.country === 'TPE') || (E.region === 'jp' && p.country === 'JPN')) if (!st.status.amateur) st.cnt.homeWin = 1;
    // 大逆轉：最後一輪開始時落後 5 桿以上
    const before = finalBefore(E);
    if (before >= 5) st.cnt.comeback = 1;
    if (E.id === 'nc_ncaa') st.cnt.ncaa = 1;
    if (E.id === 'jr_school') st.cnt.schoolGold = 1;
    if (E.tour === 'olympic') st.cnt.olyGold = 1;
    // 冠軍專屬裝備
    if (E.id === 'masters') st.story.prevChamp = prevMastersChamp(st, E.year);
    if (CHAMP_GIFT[E.id] && !st.gear.items.some(x => x.id === CHAMP_GIFT[E.id])) { giveItem(st, CHAMP_GIFT[E.id]); addNews(st, `冠軍紀念品：${itemById(CHAMP_GIFT[E.id]).name}（球員 → 裝備）`); }
    if (E.tour === 'olympic' && !st.gear.items.some(x => x.id === 'olympic_medal')) giveItem(st, 'olympic_medal');
    // 收藏室：大賽、THE PLAYERS、TOUR Championship 的第 18 洞旗（大家簽名）
    if (E.major || ['players', 'tourchamp', 'host'].includes(E.id)) { st.collection = st.collection || []; st.collection.push({ name: `${E.year} ${E.name} 第 18 洞旗（簽名）`, kind: 'flag', from: '冠軍', y: E.year }); }
    if (E.major) {
      const sl = slamStatus(st), before = st.cnt.slams || 0, tg = st.cnt.tiger || 0;
      if (sl.slams > before) {
        st.cnt.slams = sl.slams;
        queueMain(st, sl.slams === 1 ? 'slam_done' : 'slam_double');
        addTimeline(st, slamText(sl.slams)); addNews(st, `${p.name} 完成${slamText(sl.slams)}！`, 'major');
        if (!st.gear.items.some(x => x.id === 'slam_jacket')) giveItem(st, 'slam_jacket');
        st.trophies.push({ y: E.year, id: 'slam' + sl.slams, name: slamText(sl.slams), tier: 'major', tour: 'major', kind: 'plate' });
      }
      if (sl.tiger > tg) { st.cnt.tiger = sl.tiger; queueMain(st, 'tiger_slam'); addTimeline(st, '連續四大賽冠軍'); addNews(st, `${p.name} 同時握有四大賽冠軍！`, 'major'); }
    }
  } else if (rec.posN <= 10) addNews(st, fill(NEWS.top10[0], { name: p.name, event: E.name, pos: rec.pos, top10: T.top10 }));
  else if (rec.pos === 'CUT' && !st.status.amateur) addNews(st, fill(NEWS.cut_missed[0], { name: p.name, event: E.name }));
  if (E.tour === 'olympic' && rec.posN <= 3) { st.trophies.push({ y: E.year, id: 'olympics', name: `奧運${['金', '銀', '銅'][rec.posN - 1]}牌`, tier: 'olympic', tour: 'olympic', kind: 'medal' }); addTimeline(st, `奧運${['金', '銀', '銅'][rec.posN - 1]}牌`); }
  if (E.id.startsWith('jr_asiangames') && rec.posN <= 3) st.cnt.asianMedal = 1;
  // 常碰到的對手：同一場比賽名次比較前面的算贏（虛構的補位球員不算）
  { const H = st.h2h = st.h2h || {}, my = rec.pos === 'CUT' ? 999 : rec.posN;
    for (const x of rows) {
      if (x.id === ME || String(x.id).startsWith('X')) continue;
      const th = x.cut ? 999 : x.pos;
      if (my === 999 && th === 999) continue;
      const h = H[x.id] = H[x.id] || { n: 0, w: 0, l: 0 };
      h.n++; h.name = x.name; h.y = E.year; if (my < th) h.w++; else if (th < my) h.l++;
    }
    const keys = Object.keys(H); if (keys.length > 160) keys.sort((a, b) => H[a].n - H[b].n).slice(0, keys.length - 160).forEach(k => delete H[k]); }
  // 贊助商挑戰、個人最佳與球場紀錄、經典重現
  settleChallenge(st, E, rec);
  E.recMsg = updateRecords(st, E, rec);
  saveClassic(st, E, rec);
  // 自己主辦的邀請賽
  if (E.id === 'host') { p.fame += 25000; st.rel.sponsor = clamp(st.rel.sponsor + 10, 0, 100); st.cnt.hosted = (st.cnt.hosted || 0) + 1; addNews(st, `${p.name} 主辦的邀請賽圓滿落幕${win ? '，而且自己拿下冠軍' : ''}`); }
  // 大賽的紀錄（隔年的資格）
  if (E.id === 'masters') { st.prevMasters = rec.posN; if (st.status.amateur && rec.pos !== 'CUT') { const ams = rows.filter(x => x.am && !x.cut); if (!ams.length || ams.every(a => a.total >= rec.total)) { st.cnt.lowam = 1; addTimeline(st, '名人賽最佳業餘（銀盃）'); st.trophies.push({ y: E.year, id: 'lowam', name: '名人賽最佳業餘銀盃', tier: 'major', tour: 'am', kind: 'silver' }); } } }
  if (E.id === 'usopen') st.prevUSOpen = rec.posN;
  if (E.id === 'open') st.prevOpen = rec.posN;
  if (E.major && rec.posN <= 4 && E.id !== 'masters') st.prevMajorTop4 = E.year;
  if (E.id === 'tourchamp') st.prevTourChamp = E.year;
  if (E.major && rec.posN <= 10) st.cnt.majorTop10 = (st.cnt.majorTop10 || 0) + 1;
  // Q-School
  if (E.tour === 'qs') {
    const m = qschoolResult(st, { ...E, stage: E.stage, adv: E.adv, year: E.year }, rec.posN || 999);
    E.qsMsg = m;
    // 業餘拿到巡迴卡：轉職業
    if (st.status.amateur && Object.values(st.status.cards).some(y => y > E.year)) { turnProCore(st, 'Q-School 拿到巡迴卡，轉職業'); m.push('拿到巡迴卡：轉為職業選手'); }
    if (E.stage === 3 && rec.posN >= 4 && rec.posN <= 6) st.cnt.qline = 1;
    for (const t of m) addNews(st, t);
    const card = Object.entries(st.status.cards).find(([t, y]) => y > E.year);
    if (card && !st.status.firstCardTour) { st.status.firstCardTour = card[0]; queueMain(st, 'first_card'); }
    if (st.status.cards.pga > E.year) queueMain(st, 'pga_card');
  }
  // 宿敵
  const h2h = rivalRecord(st, rows);
  // 收藏室：對宿敵每贏 5 次，他送你一顆簽名球（不服輸的那種）
  { const rid = st.story.rival || st.story.friend, rh = rid && (st.story.h2h || {})[rid];
    if (rh && rh.w && rh.w % 5 === 0 && st.cnt.rivalBall !== rh.w) { st.cnt.rivalBall = rh.w; const rv = findP(st.world, rid); st.collection = st.collection || []; st.collection.push({ name: `${rv ? nameOf(rv) : '宿敵'} 的簽名球（第 ${rh.w} 勝）`, kind: 'ball', from: '宿敵', y: E.year }); } }
  rivalKeepUp(st, playerRating(st));
  // 知識卡
  if (E.major) giveKnow(st, 'major');
  if (cinfo(E.course).style === 'links') giveKnow(st, 'links');
  checkMain(st);
  checkAch(st);
}
const finalBefore = E => { const s = finalStandingsBefore(E); return s; };
function finalStandingsBefore(E) {
  const r = E.rounds - 1;
  const mine = myTotal(E, r), best = Math.min(...E.field.filter(e => !e.cut).map(e => totalOf(e, r)), mine);
  return mine - best;
}
const prevMastersChamp = (st, y) => { const id = (st.world.hist.masters || {})[y - 1]; const n = id && histName(st.world, id, st.player.name); return n && n !== '—' ? n : '上屆冠軍'; };

// 天氣與延賽：雷雨暫停（隔天早上續打）、濃霧延後開球；有專屬的選擇與體能消耗（每一輪最多一次，種子固定）
async function weatherDelay(st, E, ri) {
  E.delay = E.delay || {};
  if (E.delay[ri] !== undefined) return;
  const r = rng(hash(E.key + ':delay:' + ri)), wx = E.wx[ri] || 0, links = cinfo(E.course).style === 'links', x = r();
  const kind = x < (wx >= 1 ? 0.06 : 0.03) && !links ? 'storm' : x > (ri <= 1 ? 0.95 : 0.98) ? 'fog' : null;
  E.delay[ri] = kind; localSave(st);
  if (!kind) return;
  const p = st.player;
  if (kind === 'storm') {
    const i = Math.max(0, await story({ small: `${E.name} · 第 ${ri + 1} 輪`, title: '雷雨暫停', img: null, paras: ['空氣突然變得很重，遠方傳來雷聲。喇叭響了三聲長音：所有人立刻離開球場。', '雷雨下了三個小時，天黑前沒辦法打完，這一輪改到隔天早上 7 點續打。每個人都要早起，體能 −6。'], choices: [['在會館休息、早點睡', '體能 +4'], ['去室內推桿練習區', '手感 +0.3、體能 −2'], ['和其他球員聊天打牌', '心情 +5']], skip: false }));
    p.energy = clamp(p.energy - 6 + [4, -2, 0][i], 0, 100);
    if (i === 1) p.form = clamp(p.form + 0.3, -3, 3);
    if (i === 2) p.mood = clamp(p.mood + 5, 0, 100);
  } else {
    const i = Math.max(0, await story({ small: `${E.name} · 第 ${ri + 1} 輪`, title: '濃霧延後開球', img: null, paras: ['清晨的球場被濃霧蓋住，從發球台看不到 50 碼外的旗桿。', '委員會宣布開球延後兩個小時，所有開球時間往後排。'], choices: [['多熱身一點', '手感 +0.2、體能 −2'], ['回車上補眠', '體能 +3']], skip: false }));
    if (i === 0) { p.form = clamp(p.form + 0.2, -3, 3); p.energy = clamp(p.energy - 2, 0, 100); } else p.energy = clamp(p.energy + 3, 0, 100);
  }
  st.cnt.delays = (st.cnt.delays || 0) + 1;
  localSave(st);
}

// 大賽週的小劇情：週一 / 週二 / 週三各一段（每一天只出一次）
async function majorWeekStory(st, E, day) {
  const W = E.major && MAJOR_WEEK[E.id], list = W && W[day];
  if (!list || !list.length || st.status.amateur && day === 'mon') return;
  E.mw = E.mw || {};
  if (E.mw[day]) return;
  E.mw[day] = 1;
  const [title, para, choices] = list[E.year % list.length];
  const i = Math.max(0, await story({ small: `${MAJOR_ZH[E.id]} · ${{ mon: '週一', tue: '週二', wed: '週三' }[day]}`, title, paras: [text(st, para)], choices: choices.map(c => [c[0]]), skip: false }));
  const log = applyFx(st, choices[i][1]);
  await storyResult(choices[i][0], text(st, choices[i][2]), log);
  localSave(st);
}
// 大滿貫進度的一句話（拿到大賽冠軍時）
export function slamLine(st) {
  const won = ['masters', 'pgachamp', 'usopen', 'open'].filter(m => st.titles.some(t => t.id === m));
  const left = ['masters', 'pgachamp', 'usopen', 'open'].filter(m => !won.includes(m)).map(m => MAJOR_ZH[m]);
  return left.length ? `大滿貫進度：${won.length} / 4（還差${left.join('、')}）` : '你完成了生涯大滿貫！';
}

// 冠軍證書
function certificate(st, E, rec) {
  const zh = n => String(n).split('').map(d => '〇一二三四五六七八九'[d] || d).join('');
  dialog(`<div class="cm-cert"><small>CERTIFICATE OF CHAMPIONSHIP</small><h2>冠軍證書</h2><p>${esc(E.name)}</p><p>茲證明</p><div class="nm">${esc(st.player.name)}</div>
    <p>於 ${esc(E.name)} 以 ${E.rounds} 回合 ${rec.total} 桿（${rec.toPar < 0 ? '低於標準桿 ' + -rec.toPar + ' 桿' : rec.toPar > 0 ? '高於標準桿 ' + rec.toPar + ' 桿' : '平標準桿'}）<br>榮獲冠軍，特頒此證，以資表揚</p>
    <div class="seal">冠軍<br>之證</div><p style="margin-top:10px;font-size:12px">${esc(E.courseName)} · ${E.year} 年</p></div>`, { wide: true });
}

// 這一週結束（比賽週）
export function finishWeek(st, E, played) {
  st.ev = null;
  const log = endWeek(st, [], { eventWeek: true, eventKey: E.key });
  if (log.length) toast(log.slice(-3).map(esc).join('<br>'), 3600);
  localSave(st); sync(true);
  go('home');
}
// APP 關掉後回來：接續那一輪（只接續比賽中的回合）
export async function resumeRound(st, res) {
  const E = st.ev;
  if (!E) { clearResume(); return go('home'); }
  const ri = Number(String(E.day).slice(1));
  if (!(ri >= 0)) { clearResume(); return go('event'); }
  const cfg = res.r.cfg;
  // 比洞賽、表演賽、資格賽沒有接續（不是這一週的正式比賽輪）
  if (cfg.career.match || cfg.career.skins || cfg.career.par3 || /資格賽/.test(res.m.label || '')) { clearResume(); return go('event'); }
  const ci = cinfo(E.course);
  const result = await playRound({
    restartable: true, label: res.m.label, key: E.key, cfg, resume: { local: true, state: res.r.state, pendingShot: res.r.pendingShot }, home: isHome(st, E), major: !!E.major, round: ri, evId: E.id,
    onHole: (k, idx, s) => { E.me.sc[ri][idx] = s; E.me.played[ri] = E.me.played[ri] || Array(18).fill(false); E.me.played[ri][idx] = true; localSave(st); },
    bcast: () => bcastLine(E, ri), holeCard: () => lbTable(leaderboard(E, ri, thruNow(E, ri)), 5, { today: true }), pressure: pressureFor(st, E, ri), leaderboard: () => showLb(E, ri),
  });
  // 接續後又選「重新開始這一輪」：用原本的打法從第一洞重打
  if (result.restart) {
    st.cnt.restarts = (st.cnt.restarts || 0) + 1; E.restarts = (E.restarts || 0) + 1;
    const mode = { '自己打': 'full', '精華 9 洞': 'nine', '關鍵時刻': 'key' }[E.me.mode[ri]] || 'full';
    return playEventRound(st, E, ri, mode, (cfg.holeIdx || [0])[0] >= 9 ? 'back' : 'front');
  }
  const total = finishMyRound(E, ri);
  afterRound(st, E, ri, total);
}
