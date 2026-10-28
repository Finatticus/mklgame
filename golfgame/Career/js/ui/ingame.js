// 比賽中：把生涯接到主遊戲的回合（cfg.career + game.careerHooks）
//   轉播風格的名次條、壓力等級（誤差倍率與畫面暗角）、桿弟建議、每洞結束的成績卡、訓練關卡的計分
import { cur, localSave } from '../state.js';
import { clamp, esc, toPar } from '../util.js';
import { effectiveStats, CARDS, TALENTS, cardLv, cardMul, cardMulligans } from '../growth.js';
import { ratingOf } from '../sim.js';
import { caddieById } from '../data/items.js';
import { YD, MPH, toYd } from '../../../js/util.js';
import { SURF } from '../../../js/physics.js';
import { startAmbience, stopAmbience, setWindSound, setPressureSound, playApplause, playRoar, playGroan, playDistantRoar } from '../../../js/audio.js';

let ctx = null, sess = null;
const $ = id => document.getElementById(id);

// 3D 場景等到第一次打球才載入（打開生涯不用先下載球場材質）
export async function installHooks(c) {
  ctx = c;
  if (ctx.game()) ctx.game().careerHooks = HOOKS;
}

// 給遊戲用的玩家（素質：基礎 + 加成；外觀：基礎選項 + 裝備）
export function gamePlayer(st, opt = {}) {
  const p = st.player, look = { ...p.look };
  for (const uid of Object.values(st.gear.eq || {})) {
    const it = st.gear.items.find(x => x.uid === uid);
    if (it && it.look) Object.assign(look, it.look);
  }
  if (st.lookOverride) Object.assign(look, st.lookOverride);
  // 基礎角色外觀（主遊戲的經典角色：膚色、髮色、上衣、褲子、帽子的顏色）；look.model = 寫實角色（David、Louise…）時外觀由模型決定
  look.hair = look.hairColor || look.hair;
  return { user: p.name, stats: effectiveStats(st, opt), look, local: true };
}

// ---------- 開始一輪 ----------
//   o = { cfg（遊戲設定）, label, onHole(k, idx, strokes, game) → Promise<'end'|undefined>, holeCard(k, idx, strokes, game) → html,
//         bcast(game) → { pos, score, line }, pressure(game, p) → 0~3, practiceRound, drill }
//   回傳 Promise：{ scores:{洞: 桿數}, quit }
export function playRound(o) {
  return new Promise(async res => {
    const st = cur();
    sess = { ...o, res, scores: {}, calmUsed: false, tips: 0, last: null };
    const cfg = { mode: 'stroke', gimme: 0, mulligans: 0, stimp: null, wind: 'normal', holes: 'all', seed: Math.floor(Math.random() * 2 ** 31), ...o.cfg };
    cfg.career = { ...(o.cfg.career || {}), slot: st.slot, user: st.user };
    // 技能卡「重來的機會」：自己打的洞 18 洞以上多 2 次、9 洞以上多 1 次（依卡片等級）
    if (!o.drill && !o.practiceRound && !(o.cfg.career && o.cfg.career.practice) && (st.player.cardEq || []).includes('mulligan')) {
      const starts = (o.cfg.career && o.cfg.career.starts) || {};
      const own = (o.cfg.holeIdx || Array.from({ length: 18 }, (_, i) => i)).filter(h => !starts[h]).length;
      const add = cardMulligans(cardLv(st.player, 'mulligan'), own);
      cfg.mulligans = (cfg.mulligans || 0) + add;
      sess.cardMull = add; sess.mullStart = cfg.mulligans;
    }
    if (cfg.stimp == null) delete cfg.stimp;
    try { localStorage.setItem('dixen.cresume.meta', JSON.stringify({ user: st.user, slot: st.slot, label: o.label || '', key: o.key || '' })); } catch (e) { /* 略過 */ }
    await ctx.ensureWorld();
    ctx.game().careerHooks = HOOKS;
    overlay(true);
    // 比賽氣氛：訓練與練習輪只有風聲、鳥叫；比賽依規模有觀眾
    startAmbience({ crowd: o.drill || o.practiceRound ? 0 : (cfg.career.crowd ?? (cfg.career.gallery || 1)) });
    await ctx.startGame(cfg, [gamePlayer(st, { home: o.home, practiceRound: o.practiceRound })], o.resume || null);
  });
}
// APP 被關掉之後接續：存下來的回合（只接續同一個生涯欄位）
export function pendingResume(st) {
  try {
    const r = JSON.parse(localStorage.getItem('dixen.cresume') || 'null'), m = JSON.parse(localStorage.getItem('dixen.cresume.meta') || 'null');
    if (!r || !m || m.user !== st.user || m.slot !== st.slot || !r.cfg || !r.cfg.career) return null;
    return { r, m };
  } catch (e) { return null; }
}
export function clearResume() { try { localStorage.removeItem('dixen.cresume'); localStorage.removeItem('dixen.cresume.meta'); } catch (e) { /* 略過 */ } }

// ---------- 遊戲回呼 ----------
const HOOKS = {
  // 誤差倍率：壓力等級 × 抗壓、技能卡、天賦、桿弟、心理師
  errMul({ game, p, lie, dist, club, pressure }) {
    const st = cur(); if (!st || !sess) return undefined;
    const s = p.stats, mental = s.mental || 50;
    let lvl = sess.pressure ? sess.pressure(game, p) : (pressure ? 1 : 0);
    if (sess.calm && lvl > 0) lvl--;
    const tal = st.player.talents.includes('heart') ? TALENTS.heart.pressure : 1;
    let m = 1 + lvl * 0.13 * clamp(1.45 - mental / 100, 0.45, 1.3) * tal;
    // 實力還低時，正式比賽的誤差稍微放大（最多 ×1.2，綜合實力 50 以上不影響）；童年、練習、家人下場不放大
    //   v93 曾放大到 ×1.8，方向與距離亂到沒辦法打，已經改回溫和的版本
    if (sess.evId) m *= 1 + clamp((50 - ratingOf(s)) * 0.012, 0, 0.2);
    // 技能卡（同一種誤差最多減到原本的 60%）
    const holeNo = game.holeNo, putt = club.putter, par = game.hole.par, k = game.k;
    const prevD = k > 0 && p.scores[k - 1] && p.pars ? p.scores[k - 1] - p.pars[k - 1] : 0;
    const windMph = Math.hypot(game.wind[0], game.wind[1]) / MPH;
    const on = {
      last3: holeNo >= 16, putt2: putt && dist <= 2 * YD, sand: lie === SURF.SAND, rough: lie === SURF.ROUGH || lie === SURF.DEEP, press2: lvl >= 2, tee: lie === SURF.TEE && club.id === 'D',
      approach: !putt && dist <= 150 * YD && dist > 30 * YD, chip: !putt && dist <= 30 * YD, majorWeekend: sess.major && sess.round >= 2, home: sess.home, first: holeNo === game.holeList[0] + 1 && k === 0, masters: sess.evId === 'masters',
      fairway: lie === SURF.FAIRWAY && !putt, par3: par === 3 && lie === SURF.TEE, par5: par === 5, wind: windMph >= 12, longPutt: putt && dist >= 8 * YD, bounce: prevD >= 1, hot: prevD <= -1,
      parPutt: putt && p.strokes + 1 === par, wedge: !!club.wedge && !putt && dist >= 30 * YD && dist <= 110 * YD, opening: k <= 2 && !game.cfg.practice, final: !!sess.final, qual: !!sess.qual, links: (game.course && game.course.style) === 'links',
    };
    let cm = 1;
    const use = st.player.cardUse = st.player.cardUse || {};
    for (const id of st.player.cardEq || []) {
      const c = CARDS[id];
      if (!c || !c.when || !on[c.when]) continue;
      cm *= cardMul(c, cardLv(st.player, id));
      if (!game.cfg.practice && !sess.drill && !sess.practiceRound) use[id] = (use[id] || 0) + 1;      // 升級進度：自己打的回合裡生效的次數
    }
    m *= Math.max(0.6, cm);
    // 桿弟（Mac 強風日、Big Joe 大賽）
    const cad = st.team.caddie && caddieById(st.team.caddie.id), chem = (st.team.caddie && st.team.caddie.chem) || 1;
    if (cad && cad.id === 'mac' && chem >= 3 && Math.hypot(game.wind[0], game.wind[1]) / MPH >= 11) m *= 0.9;
    if (cad && cad.id === 'joe' && sess.major) m *= 0.95;
    showPress(lvl);
    setPressureSound(lvl);
    return m;
  },
  // 每一桿的結果：觀眾的反應
  shotDone(game, p, r, o) {
    if (!sess || sess.drill || o.party) return;
    const par = game.hole.par;
    if (r.result === 'water' || r.result === 'chasm') return setTimeout(playGroan, 400);
    if (r.result === 'holed') {
      const d = p.strokes - par, long = (game.shotCtx && game.shotCtx.dist || 0) > 4 * YD;
      if (d <= -1) playRoar(d <= -2 ? 1 : 0.65);
      else if (d === 0 && long) playRoar(0.45);
      else playApplause(d === 0 ? 0.35 : 0.2);
      return;
    }
    if (r.result !== 'rest') return;
    const end = r.end, dp = game.hole.distToPin(end[0], end[2]) / YD, onG = game.hole.surface(end[0], end[2]) === SURF.GREEN;
    if (o.club.putter && o.lieBefore === SURF.GREEN) { if (dp < 0.6) setTimeout(playGroan, 150); return; }       // 差一點進
    if (onG && o.lieBefore !== SURF.GREEN) { if (dp < 3) playRoar(0.4); else if (dp < 10) playApplause(0.45); else playApplause(0.2); }
  },
  turn(game, p) {
    const st = cur(); if (!st || !sess) return;
    setWindSound(Math.hypot(game.wind[0], game.wind[1]) / MPH);
    if (sess.drill) return drillTurn(game, p);
    updateBcast(game);
    caddieTip(game, p, st);
    // 大賽：偶爾聽到遠方其他洞的歡呼
    if ((game.cfg.career.gallery || 0) >= 3 && Math.random() < 0.18) setTimeout(playDistantRoar, 1500 + Math.random() * 4000);
  },
  holeDone(game, last) {
    const st = cur(), k = game.k, idx = game.holeList[k], p = game.players[0], strokes = p.scores[k];
    sess.scores[idx] = strokes;
    if (strokes && strokes - game.hole.par <= -1) { st.cnt.birdie = (st.cnt.birdie || 0) + 1; }
    // 技能卡的條件：自己打的洞、老鷹、連續小鳥
    const starts = (game.cfg.career && game.cfg.career.starts) || {};
    if (strokes && !game.cfg.practice && !sess.drill && !sess.practiceRound && !starts[idx]) {
      st.cnt.holesOwn = (st.cnt.holesOwn || 0) + 1;
      if (strokes - game.hole.par <= -2) st.cnt.eagle = 1;
      sess.bStreak = strokes - game.hole.par <= -1 ? (sess.bStreak || 0) + 1 : 0;
      if (sess.bStreak >= 3) st.cnt.birdie3 = 1;
    }
    return (async () => {
      const r = sess.onHole ? await sess.onHole(k, idx, strokes, game) : undefined;
      localSave();
      updateBcast(game);
      if (sess.noHoleCard) return r;
      await holeCard(game, k, idx, strokes, last || r === 'end');
      return r;
    })();
  },
  roundDone(game) {
    const s = sess; sess = null;
    stopAmbience();
    cardMullUsed(game, s);
    roundStats(game);
    overlay(false);
    clearResume();
    setTimeout(() => { game.quit(); ctx.show('scr-career'); s.res({ scores: s.scores, quit: false }); }, 50);
  },
  quit(game) {
    const s = sess;
    const txt = s.quitText || '離開這一輪？沒打完的洞會用模擬完成（成績略保守）。';
    if (!confirm(txt)) return;
    sess = null; overlay(false); clearResume();
    stopAmbience();
    cardMullUsed(game, s);
    game.quit();
    ctx.show('scr-career');
    s.res({ scores: s.scores, quit: true });
  },
  drillShot(game, r, p, mode) { if (sess && sess.drillShot) sess.drillShot(game, r, p, mode); },
};
// 重來卡用掉的次數（升級進度）
function cardMullUsed(game, s) {
  const st = cur(), p = game.players[0];
  if (!st || !s || !s.cardMull || !p) return;
  const used = Math.min(s.cardMull, Math.max(0, s.mullStart - (p.mulligans || 0)));
  if (used) { const u = st.player.cardUse = st.player.cardUse || {}; u.mulligan = (u.mulligan || 0) + used; }
}
// 一輪的統計（技能卡的解鎖條件）：推桿數、標準桿上果嶺、救 Par
function roundStats(game) {
  const st = cur(), p = game.players[0]; if (!st || !p || game.cfg.practice) return;
  const starts = (game.cfg.career && game.cfg.career.starts) || {};
  const own = game.holeList.filter((h, k) => !starts[h] && p.scores[k]);
  if (own.length < 18) return;
  const putts = p.putts.reduce((a, v) => a + (v || 0), 0), gir = p.gir || 0;
  let saves = 0;
  game.holeList.forEach((h, k) => { if (p.scores[k] && !(p.girH || [])[k] && p.scores[k] <= p.pars[k]) saves++; });
  if (putts <= 26) st.cnt.putts26 = 1;
  if (gir >= 16) st.cnt.gir16 = 1;
  if (saves >= 6) st.cnt.saves6 = 1;
  // 新技能卡的條件
  const d = game.holeList.map((h, k) => (p.scores[k] ? p.scores[k] - p.pars[k] : 0));
  const tot = d.reduce((a, v) => a + v, 0);
  if ((p.fwHit || 0) >= 13) st.cnt.fw13 = 1;
  if (game.holeList.every((h, k) => p.pars[k] !== 3 || d[k] <= 0)) st.cnt.par3clean = 1;
  if (d.every(v => v <= 0)) st.cnt.bogeyFree = 1;
  if (d.filter(v => v <= -1).length >= 5) st.cnt.birdies5 = 1;
  let bb = 0;
  for (let k = 1; k < d.length; k++) if (d[k - 1] >= 1 && d[k] <= -1) bb++;
  if (bb >= 2) st.cnt.bounce2 = 1;
  if (tot < 0 && game.cfg.wind === 'strong') st.cnt.windUnder = 1;
  if (tot < 0 && game.course && game.course.style === 'links') st.cnt.linksUnder = 1;
  st.cnt.rounds18 = (st.cnt.rounds18 || 0) + 1;
}
export const endDrill = game => { const s = sess; sess = null; stopAmbience(); overlay(false); game.quit(); ctx.show('scr-career'); if (s) s.res({ scores: {}, quit: false, drill: s.drillResult }); };

// ---------- 疊在 3D 畫面上的元件 ----------
function overlay(on) {
  const host = $('scr-game');
  for (const id of ['cm-bcast', 'cm-press', 'cm-tip', 'cm-lbbtn', 'cm-drill']) { const e = $(id); if (e) e.remove(); }
  // 比賽中用轉播名次條（含模擬的洞）取代遊戲本身的球員成績列，避免兩個數字不一樣
  document.body.classList.toggle('cm-round', !!on && !!sess && !sess.drill && !!sess.bcast);
  if (!on || !host) return;
  host.insertAdjacentHTML('beforeend', `<div class="cm-press" id="cm-press" data-l="0"></div><div class="cm-bcast" id="cm-bcast"></div><div class="cm-tip hide" id="cm-tip"></div>${sess && sess.leaderboard ? '<button class="cm-lbbtn" id="cm-lbbtn">排行榜</button>' : ''}${sess && sess.drill ? '<div class="cm-drill" id="cm-drill"></div>' : ''}`);
  const b = $('cm-lbbtn');
  if (b) b.onclick = e => { e.stopPropagation(); sess.leaderboard(); };
  if (sess && sess.drill) {
    $('cm-bcast').style.display = 'none';
    const d = $('cm-drill');
    d.addEventListener('pointerdown', e => { if (e.target.closest('[data-drillend]')) e.stopPropagation(); });
    d.addEventListener('click', e => { if (e.target.closest('[data-drillend]')) { e.stopPropagation(); endDrill(ctx.game()); } });
  }
}
function showPress(l) { const e = $('cm-press'); if (e) e.dataset.l = l; }
// 名次條放在左邊的面板（球洞資訊、工具按鈕、球員）下面；排行榜按鈕放在右邊的風向 / 小地圖面板下面（跟著螢幕方向與字體大小）
function place() {
  const bc = $('cm-bcast'), lb = $('cm-lbbtn');
  let left = 0;
  for (const q of document.querySelectorAll('#scr-game .hud-hole, #scr-game .hud-tools, #h-players')) {
    const r = q.getBoundingClientRect();
    if (r.height && r.left < innerWidth / 2 && !q.classList.contains('hidden')) left = Math.max(left, r.bottom);
  }
  if (bc && left) { bc.style.top = Math.round(left + 8) + 'px'; bc.style.left = '12px'; bc.style.transform = 'none'; }
  const env = document.querySelector('#scr-game .hud-env');
  if (lb && env) { const r = env.getBoundingClientRect(); if (r.height) lb.style.top = Math.round(r.bottom + 8) + 'px'; }
}
addEventListener('resize', () => setTimeout(place, 80));
function updateBcast(game) {
  const e = $('cm-bcast'); if (!e || !sess || !sess.bcast) return;
  const b = sess.bcast(game);
  if (!b) { e.style.display = 'none'; return; }
  e.style.display = '';
  e.innerHTML = `<div class="bp">${esc(b.pos)}</div><div class="bs ${b.score > 0 ? 'over' : ''}">${toPar(b.score)}</div><div class="bl">${b.line}</div>`;
  place(); setTimeout(place, 60);
}
let tipTimer = null;
export function tip(html, ms = 5200) {
  const e = $('cm-tip'); if (!e) return;
  e.innerHTML = html; e.classList.remove('hide');
  clearTimeout(tipTimer); tipTimer = setTimeout(() => e.classList.add('hide'), ms);
}

// 桿弟的建議（情報為主）
function caddieTip(game, p, st) {
  const t = st.team.caddie; if (!t || !p.local) return;
  const cad = caddieById(t.id); if (!cad) return;
  const chem = t.chem || 1, h = game.hole, dist = toYd(game.distPin(p));
  const windMph = Math.hypot(game.wind[0], game.wind[1]) / MPH;
  const aimDir = game.aim, wx = game.wind[0], wz = game.wind[1];
  const head = -(Math.sin(aimDir) * wx - Math.cos(aimDir) * wz) / MPH;       // 正 = 逆風
  const cross = (Math.cos(aimDir) * wx + Math.sin(aimDir) * wz) / MPH;        // 正 = 往右吹
  const name = `<b>${esc(t.name)}</b>：`;
  let msg = '';
  if (game.club.putter) {
    if (cad.ability === 'green' || cad.ability === 'all') { const elev = (h.height(...h.pin) - p.ball[1]) * 100; msg = `${Math.abs(elev) < 5 ? '幾乎是平的' : elev > 0 ? `上坡 ${Math.round(elev)} 公分` : `下坡 ${Math.round(-elev)} 公分`}，${dist < 3 ? '果斷一點推過洞口' : '先求距離'}。`; }
    if (cad.chem3 === 'pace' && chem >= 3 && dist >= 3 && dist <= 6) msg += ` 建議力道 ${(dist * 1.08).toFixed(1)} 碼。`;
  } else if (p.lie === SURF.TEE && h.par >= 4) {
    if (cad.ability === 'warn' || cad.ability === 'all') { const sp = h.spec || {}; msg = sp.note ? `這洞${sp.note.replace(/。$/, '')}，${sp.ob ? '另一邊比較安全' : '寧可留在球道'}。` : h.par === 5 ? '五桿洞，第二桿再決定要不要攻果嶺。' : '球道中間就是好球。'; }
    if (cad.ability === 'wind' && windMph >= 6) msg = `風 ${Math.round(windMph)} mph，${head > 3 ? '逆風，壓低打' : head < -3 ? '順風，球會多滾' : cross > 0 ? '從左往右吹，瞄左邊一點' : '從右往左吹，瞄右邊一點'}。`;
  } else if (dist <= 220 && dist > 25) {
    if (cad.ability === 'club' || cad.ability === 'wind' || cad.ability === 'all') {
      const elev = h.height(...h.pin) - p.ball[1], plays = Math.round(dist + head * 1.1 + elev * 1.1);
      msg = `實際距離 ${Math.round(dist)} 碼，${Math.abs(plays - dist) >= 3 ? `打起來像 ${plays} 碼` : '照距離打'}${cad.ability === 'wind' && Math.abs(head) > 4 ? '，多拿一支、壓低打' : ''}。`;
    }
    if (cad.ability === 'spread' && !(st.opt.difficulty === 'real')) {
      const s = p.stats, side = Math.round(dist * (2.6 - (s.accuracy || 50) * 0.019) * 0.045 * 10) / 10, len = Math.round(dist * (0.06 - (s.consistency || 50) * 0.00045) * 1.1 * 10) / 10;
      msg = `落點範圍（70%）：左右 ±${side} 碼、前後 ±${len} 碼。`;
    }
  }
  if (cad.ability === 'calm' && !sess.calmUsed && sess.pressure && sess.pressure(game, p) >= 2) {
    sess.calmUsed = true; sess.calm = true;
    msg = '深呼吸。你練過這一桿一千次了。（冷靜：這一桿壓力等級 −1）';
    setTimeout(() => { if (sess) sess.calm = false; }, 30000);
  }
  if (msg) tip(name + esc(msg).replace(/&lt;b&gt;|&lt;\/b&gt;/g, ''));
}

// 每洞結束：成績卡（桿數、今天、總成績、名次、前五名）
function holeCard(game, k, idx, strokes, last) {
  return new Promise(res => {
    const par = game.hole.par, d = strokes - par;
    const name = strokes === 1 ? '一桿進洞' : ({ '-3': '信天翁', '-2': '老鷹', '-1': '小鳥', 0: '平標準桿', 1: '柏忌', 2: '雙柏忌' }[d] ?? (d > 0 ? '+' + d : d));
    const extra = sess.holeCard ? sess.holeCard(k, idx, strokes, game) : '';
    const box = document.createElement('div');
    box.className = 'cm-ov open'; box.style.zIndex = 80;
    box.innerHTML = `<div class="cm-dlg"><div class="cm-k">第 ${idx + 1} 洞 · PAR ${par}</div><h3 style="margin:2px 0 8px"><span class="num" style="font-size:30px">${strokes}</span>　${name}</h3>${extra}
      <div class="btns"><button class="cm-btn green" id="hc-go">${last ? '查看這一輪' : '下一洞'}</button></div></div>`;
    document.body.appendChild(box);
    box.querySelector('#hc-go').onclick = () => { box.remove(); res(); };
  });
}

// ---------- 訓練關卡 ----------
function drillTurn(game) {
  const e = $('cm-drill'); if (!e || !sess.drillHud) return;
  e.innerHTML = sess.drillHud();
}
