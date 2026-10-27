// 比洞賽：U.S. Amateur / The Amateur（36 洞比桿資格 → 64 人比洞賽）、團體賽（萊德盃、總統盃、沃克盃、Palmer Cup、青少年盃）、Skins Game
//   四球賽（Four-ball）與單人賽自己打；輪流擊球（Foursomes）由模擬完成（兩人打同一顆球需要另外的輪替，畫面上用觀戰的方式呈現）
import { go, story, storyResult, toast, header, dialog } from './shell.js';
import { cur, localSave, sync } from '../state.js';
import { esc, money, toPar, sum, clamp, rng, hash } from '../util.js';
import { cinfo, WIND_CFG, teeOf } from '../event.js';
import { ME, nameOf, findP, peerRating, addPts } from '../world.js';
import { addNews, addTimeline, earn, spend, travelCost, giveItem } from '../life.js';
import { playRound } from './ingame.js';
import { holeScore, roundMean, courseAdj, holeAdjs } from '../sim.js';
import { playerRating, addXp } from '../growth.js';
import { checkAch } from '../achievements.js';
import { finishWeek, playQuick } from './eventview.js';
import { teamSide } from '../data/players.js';
import { makeName, pickCountry } from '../data/names.js';
import { giveKnow } from '../childhood.js';

const SIDE_ZH = { usa: '美國隊', eur: '歐洲隊', intl: '國際隊', gbi: '英國與愛爾蘭隊' };

export async function matchEvent(body, st, E) {
  const ci = cinfo(E.course);
  header(`<span>${esc(E.name)}</span>`);
  if (!E.paid) { const t = travelCost(st, E.region); if (E.kind !== 'skins') spend(st, t.cost, `${E.name} 旅費`, 'cost'); E.paid = true; }
  if (E.kind === 'usam') return usam(body, st, E, ci);
  if (E.kind === 'skins') return skins(body, st, E, ci);
  return teamCup(body, st, E, ci);
}
const head = (E, ci, extra = '') => `<div class="cm-hero"><small>${E.year} 年第 ${E.w} 週 · 比洞賽</small><h2>${esc(E.name)}</h2><div class="meta">${esc(ci.name)} · Par ${ci.par}</div>${E.note ? `<div class="meta" style="margin-top:6px">${esc(E.note)}</div>` : ''}${extra}</div>`;

// ---------- 一場比洞賽（自己打或模擬）----------
//   mine = { R }、opp = [{ name, R }]（四球賽兩人取好的）、mate = 隊友（四球賽）
//   回傳 { result: 1 贏 / 0.5 平 / 0 輸, text: '3&2' }
async function playMatch(st, E, ci, o) {
  const r = rng(hash(E.key + ':m:' + o.tag));
  const per = R => (roundMean(R) + courseAdj(ci, { setup: 'major' })) / 18;
  const adjs = holeAdjs(ci.holes, 75);
  const oppHole = (i) => Math.min(...o.opp.map(x => holeScore(r, ci.holes[i][0], per(x.R) + adjs[i], x.R)));
  const mateHole = (i) => (o.mate ? holeScore(r, ci.holes[i][0], per(o.mate.R) + adjs[i], o.mate.R) : 99);
  let status = 0, played = 0;
  const label = () => (status === 0 ? 'ALL SQUARE' : `${Math.abs(status)} ${status > 0 ? 'UP' : 'DOWN'}`);
  const decided = () => Math.abs(status) > 18 - played;
  const fmt = () => (status === 0 ? '平手' : `${Math.abs(status)}${18 - played > 0 ? '&' + (18 - played) : ' UP'}`);
  if (o.mode === 'sim') {
    const myR = playerRating(st);
    for (let i = 0; i < 18 && !decided(); i++) {
      const a = Math.min(holeScore(r, ci.holes[i][0], per(myR) + adjs[i] + 0.02, myR), mateHole(i)), b = oppHole(i);
      if (a < b) status++; else if (b < a) status--; played++;
    }
  } else {
    await playRound({
      label: o.label, key: E.key, cfg: { courseId: E.course, holeIdx: [...Array(18).keys()], tee: teeOf(st, E), wind: WIND_CFG[1], mode: 'stroke', career: { match: o.tag } },
      quitText: '離開這場比洞賽？剩下的洞用模擬完成。',
      onHole: (k, idx, s) => {
        const mate = mateHole(idx), b = oppHole(idx), a = Math.min(s, mate);
        if (a < b) status++; else if (b < a) status--;
        played++;
        o.lastHole = `你 ${s}${o.mate ? `、${o.mate.name} ${mate}` : ''} vs ${o.opp.map(x => x.name).join('、')} ${b}`;
        return decided() ? 'end' : undefined;
      },
      holeCard: () => `<p class="cm-note">${esc(o.lastHole || '')}</p><p style="font:700 22px Barlow Condensed;color:var(--aug)">${label()}</p>`,
      bcast: () => ({ pos: label().replace('ALL SQUARE', 'AS'), score: 0, line: `${esc(o.label)}<br>剩 ${18 - played} 洞` }),
      pressure: () => (Math.abs(status) <= 1 && played >= 14 ? 2 : 0),
    });
    // 沒打完（離開）就模擬剩下的洞
    const myR = playerRating(st);
    for (let i = played; i < 18 && !decided(); i++) { const a = Math.min(holeScore(r, ci.holes[i][0], per(myR) + adjs[i], myR), mateHole(i)), b = oppHole(i); if (a < b) status++; else if (b < a) status--; played++; }
  }
  return { result: status > 0 ? 1 : status < 0 ? 0 : 0.5, text: fmt(), status };
}
// 兩隊之間一場模擬的比賽（玩家不在裡面）
function simMatch(E, ci, a, b, tag) {
  const r = rng(hash(E.key + ':sm:' + tag));
  const per = R => (roundMean(R) + courseAdj(ci, { setup: 'major' })) / 18;
  let s = 0, n = 0;
  for (let i = 0; i < 18 && Math.abs(s) <= 18 - n; i++, n++) {
    const x = Math.min(...a.map(p => holeScore(r, ci.holes[i][0], per(p.R), p.R))), y = Math.min(...b.map(p => holeScore(r, ci.holes[i][0], per(p.R), p.R)));
    if (x < y) s++; else if (y < x) s--;
  }
  return s > 0 ? 1 : s < 0 ? 0 : 0.5;
}
const modePick = async (title, sub) => story({ small: 'MATCH PLAY', title, paras: [sub], choices: [['自己打（18 洞，勝負已定就提早結束）'], ['模擬（直接看結果）']], skip: false });

// ---------- U.S. Amateur / The Amateur ----------
async function usam(body, st, E, ci) {
  E.m = E.m || { stage: 'q' };
  const M = E.m;
  if (M.stage === 'q') {
    body.innerHTML = head(E, ci) + `<div class="cm-card"><h3>比桿資格賽（36 洞）</h3><p>156 人打兩輪比桿，前 64 名進入比洞賽。</p><div class="cm-seg" style="margin-top:10px"><button data-m="full">自己打兩輪</button><button data-m="key">關鍵時刻</button><button data-m="sim">模擬</button></div></div>`;
    body.querySelectorAll('[data-m]').forEach(b => b.onclick = async () => {
      let mine = 0;
      for (let k = 0; k < 2; k++) mine += await playQuick(st, E, b.dataset.m, k);
      const r = rng(hash(E.key + ':q'));
      const lvl = Math.max(55, (E.field.reduce((s, e) => s + e.R, 0) / E.field.length) - 2);
      const others = Array.from({ length: 155 }, () => Math.round(ci.par * 2 + 2 * roundMean(lvl + r.normal() * 3.5) + 2 * courseAdj(ci, {}) + r.normal() * 4)).sort((a, b) => a - b);
      const pos = others.filter(t => t < mine).length + 1;
      M.seed = pos; M.q = mine;
      if (pos > 64) { await storyResult('沒有進入比洞賽', `36 洞 ${mine} 桿（${toPar(mine - ci.par * 2)}），第 ${pos} 名。前 64 名才能進比洞賽。`); recordAm(st, E, String(pos), pos, mine); return finishWeek(st, E, true); }
      M.stage = 0; localSave(st);
      await storyResult('進入比洞賽！', `36 洞 ${mine} 桿，第 ${pos} 名（第 ${pos} 種子）。`);
      go('event');
    });
    return;
  }
  const ROUNDS = ['64 強', '32 強', '16 強', '8 強', '4 強', '冠軍戰'];
  if (M.stage >= ROUNDS.length || M.out) return;
  const opp = E.field[(hash(E.key + M.stage) % Math.max(1, E.field.length))] || { name: '對手', R: 65 };
  const oppR = { name: opp.name, R: opp.R + M.stage * 0.6 };
  body.innerHTML = head(E, ci) + `<div class="cm-card"><h3>${ROUNDS[M.stage]}</h3><p>對手：<b>${esc(oppR.name)}</b></p>${M.log ? `<p class="cm-note">${M.log.map(esc).join('<br>')}</p>` : ''}<button class="cm-btn green" id="ms-go" style="margin-top:10px">開始比賽</button></div>`;
  document.getElementById('ms-go').onclick = async () => {
    const i = await modePick(ROUNDS[M.stage], `對手 ${oppR.name}`);
    const res = await playMatch(st, E, ci, { mode: i === 1 ? 'sim' : 'play', opp: [oppR], tag: 'u' + M.stage, label: `${E.name} ${ROUNDS[M.stage]}` });
    M.log = (M.log || []).concat(`${ROUNDS[M.stage]}：${res.result === 1 ? '勝' : res.result === 0 ? '敗' : '和（延長後'}${res.result === 0.5 ? (hash(E.key + M.stage) % 2 ? '勝）' : '敗）') : ''} ${res.text}　vs ${oppR.name}`);
    const won = res.result === 1 || (res.result === 0.5 && hash(E.key + M.stage) % 2 === 1);
    addXp(st.player, 120);
    if (!won) {
      const pos = [33, 17, 9, 5, 3, 2][M.stage];
      await storyResult(`${ROUNDS[M.stage]}落敗`, res.text, [`最終名次：${M.stage >= 4 ? (M.stage === 5 ? '亞軍' : '4 強') : ROUNDS[M.stage]}`]);
      if (M.stage === 5) st.status.invites.push({ ev: 'masters', y: E.year + 1, am: true });      // 美國業餘亞軍也拿到名人賽邀請
      recordAm(st, E, M.stage === 5 ? '亞軍' : ROUNDS[M.stage], pos, M.q);
      return finishWeek(st, E, true);
    }
    M.stage++;
    if (M.stage >= ROUNDS.length) {
      await story({ small: 'CHAMPION', title: `${E.name} 冠軍！`, img: 'augusta-clubhouse.jpg', paras: [E.id === 'usam' ? '你舉起 Havemeyer 獎盃。' : '你成為業餘高爾夫最古老賽事的冠軍。', '冠軍拿到名人賽、美國公開賽、英國公開賽的邀請。'] });
      const rec = recordAm(st, E, '冠軍', 1, M.q);
      st.titles.push({ y: E.year, w: E.w, id: E.id, name: E.name, tier: 'am_major', tour: 'am' });
      st.trophies.push({ y: E.year, id: E.id, name: E.name, tier: 'am_major', tour: 'am', kind: 'amcup' });
      st.tally.wins++; st.tally.amWins++;
      st.amMajorWin = E.year;
      for (const ev of ['masters', 'usopen', 'open']) st.status.invites.push({ ev, y: E.year + 1, am: true });
      addTimeline(st, `${E.name} 冠軍`); addNews(st, `${st.player.name} 拿下 ${E.name}！明年四月前往奧古斯塔`, 'major');
      st.player.fame += 12000;
      const { queueMain } = await import('../life.js'); queueMain(st, 'masters_am');
      checkAch(st);
      return finishWeek(st, E, true);
    }
    localSave(st); go('event');
  };
}
function recordAm(st, E, posTxt, posN, q) {
  const rec = { y: E.year, w: E.w, age: st.player.age, key: E.key, id: E.id, name: E.name, tour: 'am', tourZh: '業餘大賽', course: E.course, courseName: cinfo(E.course).name, pos: posTxt, posN, rounds: [], total: q || 0, prize: 0, pts: 0, mode: '比洞賽' };
  st.results.push(rec); st.tally.events++;
  const now = E.year * 52 + E.w;
  addPts(st.wa, now, 60 * (posN === 1 ? 1 : posN === 2 ? 0.6 : posN <= 4 ? 0.4 : posN <= 8 ? 0.25 : posN <= 16 ? 0.15 : posN <= 64 ? 0.08 : 0.02));
  return rec;
}

// ---------- 團體賽 ----------
function rosters(st, E) {
  const W = st.world, y = E.year;
  const sel = (st.teamSel || {})[E.key];
  const pick = (ids) => ids.map(id => id === ME ? { id: ME, name: '你', R: playerRating(st), me: true } : (() => { const p = findP(W, id); return p ? { id, name: nameOf(p), R: p.r ?? peerRating(p, y) } : null; })()).filter(Boolean);
  if (sel && sel.teams) return { a: pick(sel.teams[sel.sides[0]]), b: pick(sel.teams[sel.sides[1]]), sides: sel.sides, mine: sel.mine };
  // 業餘、大學、青少年盃：同儕依陣營排名
  const mySide = E.kind === 'walker' ? (st.player.country === 'USA' ? 'usa' : 'gbi') : teamSide(st.player.country) === 'usa' ? 'usa' : (E.kind === 'jryder' ? 'eur' : 'intl');
  const sides = E.kind === 'walker' ? ['usa', 'gbi'] : E.kind === 'jryder' ? ['usa', 'eur'] : ['usa', 'intl'];
  const inSide = (p, s) => (s === 'usa' ? p.c === 'USA' : s === 'gbi' ? ['ENG', 'SCO', 'IRL', 'NIR', 'WAL'].includes(p.c) : s === 'eur' ? teamSide(p.c) === 'eur' : teamSide(p.c) === 'intl');
  const pool = W.peers.filter(p => Math.abs((y - p.by) - st.player.age) <= 3);
  const r = rng(hash(E.key + ':ros'));
  const team = s => {
    const list = pool.filter(p => inSide(p, s)).sort((a, b) => peerRating(b, y) - peerRating(a, y)).slice(0, 12).map(p => ({ id: p.id, name: nameOf(p), R: peerRating(p, y) }));
    while (list.length < 12) { const c = s === 'usa' ? 'USA' : s === 'gbi' ? 'ENG' : s === 'eur' ? 'ESP' : pickCountry(r); list.push({ id: 'T' + s + list.length, name: makeName(r, c), R: 58 + r() * 12 }); }
    return list;
  };
  const a = team(sides[0]), b = team(sides[1]);
  const me = { id: ME, name: '你', R: playerRating(st), me: true };
  if (mySide === sides[0]) a.splice(11, 1, me); else b.splice(11, 1, me);
  return { a, b, sides, mine: mySide };
}
async function teamCup(body, st, E, ci) {
  E.t = E.t || { day: 0, pts: [0, 0], log: [] };
  const T = E.t, R = rosters(st, E), mineI = R.sides.indexOf(R.mine);
  const myTeam = mineI === 0 ? R.a : R.b, opTeam = mineI === 0 ? R.b : R.a;
  const DAYS = ['第一天 · 四球賽與輪流擊球', '第二天 · 四球賽與輪流擊球', '第三天 · 單人賽'];
  giveKnow(st, 'team');
  if (T.day >= 3) return;
  const score = `<div class="cm-row" style="justify-content:center;gap:20px;margin:6px 0"><div style="text-align:center"><span class="cm-k">${SIDE_ZH[R.sides[0]]}</span><div class="num" style="font-size:34px">${T.pts[0]}</div></div><div style="text-align:center"><span class="cm-k">${SIDE_ZH[R.sides[1]]}</span><div class="num" style="font-size:34px">${T.pts[1]}</div></div></div>`;
  body.innerHTML = head(E, ci, score) + `<div class="cm-card"><h3>${DAYS[T.day]}</h3><p>你是<b>${SIDE_ZH[R.mine]}</b>的一員。${T.day < 2 ? '你和隊友打一場四球賽；輪流擊球的比賽由隊友上場（模擬）。' : '12 場單人賽，每一分都很重要。'}</p>
    ${T.log.length ? `<p class="cm-note" style="margin-top:8px">${T.log.slice(-8).map(esc).join('<br>')}</p>` : ''}<button class="cm-btn green" id="tc-go" style="margin-top:10px">開始${DAYS[T.day].split(' · ')[0]}</button></div>
    <div class="cm-card"><h3>隊員</h3><p class="cm-note">${esc(myTeam.map(x => x.name).join('、'))}</p></div>`;
  document.getElementById('tc-go').onclick = async () => {
    const r = rng(hash(E.key + ':d' + T.day));
    const add = (side, v) => { T.pts[side] += v; };
    const mi = mineI, oi = 1 - mineI;
    if (T.day < 2) {
      // 輪流擊球 4 場（模擬）
      for (let k = 0; k < 4; k++) { const a = r.shuffle(myTeam.filter(x => !x.me)).slice(0, 2), b = r.shuffle(opTeam).slice(0, 2), v = simMatch(E, ci, a, b, `fs${T.day}${k}`); add(mi, v); add(oi, 1 - v); T.log.push(`輪流擊球：${a.map(x => x.name).join('/')} ${v === 1 ? '勝' : v === 0 ? '敗' : '平'}`); }
      // 四球賽 4 場（其中一場自己打）
      const mate = r.pick(myTeam.filter(x => !x.me)), opp = r.shuffle(opTeam).slice(0, 2);
      const i = await modePick('四球賽', `你和 ${mate.name} 對 ${opp.map(x => x.name).join('、')}：每洞取兩人比較好的成績。`);
      const res = await playMatch(st, E, ci, { mode: i === 1 ? 'sim' : 'play', opp, mate, tag: 'fb' + T.day, label: `四球賽：你 / ${mate.name}` });
      add(mi, res.result); add(oi, 1 - res.result); T.log.push(`四球賽（你 / ${mate.name}）：${res.result === 1 ? '勝 ' + res.text : res.result === 0 ? '敗 ' + res.text : '平手'}`);
      T.mine = (T.mine || 0) + res.result;
      for (let k = 0; k < 3; k++) { const a = r.shuffle(myTeam.filter(x => !x.me)).slice(0, 2), b = r.shuffle(opTeam).slice(0, 2), v = simMatch(E, ci, a, b, `fb${T.day}${k}`); add(mi, v); add(oi, 1 - v); }
    } else {
      const opp = opTeam[Math.floor(r() * opTeam.length)];
      const i = await modePick('單人賽', `你對 ${opp.name}`);
      const res = await playMatch(st, E, ci, { mode: i === 1 ? 'sim' : 'play', opp: [opp], tag: 'sg', label: `單人賽：你 vs ${opp.name}` });
      add(mi, res.result); add(oi, 1 - res.result); T.mine = (T.mine || 0) + res.result;
      T.log.push(`單人賽 vs ${opp.name}：${res.result === 1 ? '勝 ' + res.text : res.result === 0 ? '敗 ' + res.text : '平手'}`);
      const rest = myTeam.filter(x => !x.me), ops = opTeam.filter(x => x !== opp);
      for (let k = 0; k < 11; k++) { const v = simMatch(E, ci, [rest[k % rest.length]], [ops[k % ops.length]], 'sg' + k); add(mi, v); add(oi, 1 - v); }
    }
    T.day++;
    localSave(st);
    if (T.day >= 3) {
      const won = T.pts[mineI] > T.pts[1 - mineI];
      await story({ small: 'TEAM', title: won ? `${SIDE_ZH[R.mine]}贏了！` : T.pts[0] === T.pts[1] ? '平手' : `${SIDE_ZH[R.sides[1 - mineI]]}獲勝`, img: 'ra-clubhouse.jpg', paras: [`總分 ${T.pts[mineI]} : ${T.pts[1 - mineI]}。你這週拿下 ${T.mine || 0} 分。`] });
      const rec = { y: E.year, w: E.w, age: st.player.age, key: E.key, id: E.id, name: E.name, tour: E.tour, tourZh: '團體賽', course: E.course, courseName: ci.name, pos: won ? '勝' : '敗', posN: won ? 1 : 2, rounds: [], total: 0, prize: 0, pts: T.mine || 0, mode: '比洞賽' };
      st.results.push(rec); st.tally.events++;
      st.world.hist[E.id] = st.world.hist[E.id] || {}; st.world.hist[E.id][E.year] = won ? R.mine : R.sides[1 - mineI];
      if (won) { st.trophies.push({ y: E.year, id: E.id, name: E.name, tier: 'team', tour: E.tour, kind: 'teamcup' }); addTimeline(st, `${E.name} 冠軍隊伍`); if (E.tour === 'team') st.cnt.cupWin = (st.cnt.cupWin || 0) + 1; }
      addNews(st, `${E.name}：${won ? SIDE_ZH[R.mine] : SIDE_ZH[R.sides[1 - mineI]]}以 ${Math.max(...T.pts)} : ${Math.min(...T.pts)} 獲勝`);
      st.player.fame += won ? 8000 : 3000; addXp(st.player, 400);
      checkAch(st);
      return finishWeek(st, E, true);
    }
    go('event');
  };
}

// ---------- Skins Game（四人表演賽，每洞獎金，同分累積到下一洞）----------
async function skins(body, st, E, ci) {
  const W = st.world;
  const others = W.players.filter(p => !p.ret && p.tour !== 'liv').sort((a, b) => b.r - a.r).slice(0, 3).map(p => ({ name: nameOf(p), R: p.r }));
  body.innerHTML = head(E, ci) + `<div class="cm-card"><h3>Skins Game</h3><p>和 ${esc(others.map(x => x.name).join('、'))} 一起打 18 洞。第 1~6 洞每洞 $50,000、7~12 洞 $100,000、13~18 洞 $200,000；同分就累積到下一洞。</p><div class="cm-seg" style="margin-top:10px"><button data-m="play">自己打</button><button data-m="sim">模擬</button></div></div>`;
  body.querySelectorAll('[data-m]').forEach(b => b.onclick = async () => {
    const r = rng(hash(E.key + ':skins')), per = R => (roundMean(R) + courseAdj(ci, {})) / 18;
    const val = i => (i < 6 ? 50000 : i < 12 ? 100000 : 200000);
    let pot = 0, mine = 0;
    const log = [];
    const settle = (i, s) => {
      pot += val(i);
      const sc = others.map(o => holeScore(r, ci.holes[i][0], per(o.R), o.R)), best = Math.min(s, ...sc);
      const winners = [s === best ? '你' : null, ...others.map((o, k) => (sc[k] === best ? o.name : null))].filter(Boolean);
      if (winners.length === 1) { if (winners[0] === '你') mine += pot; log.push(`第 ${i + 1} 洞：${winners[0]} 拿下 ${money(pot)}`); pot = 0; }
    };
    if (b.dataset.m === 'sim') { const myR = playerRating(st); for (let i = 0; i < 18; i++) settle(i, holeScore(r, ci.holes[i][0], per(myR), myR)); }
    else await playRound({ label: 'Skins Game', key: E.key, cfg: { courseId: E.course, holeIdx: [...Array(18).keys()], tee: 'black', wind: 'normal', career: { skins: 1 } }, onHole: (k, idx, s) => settle(idx, s), holeCard: () => `<p class="cm-note">${esc(log[log.length - 1] || '同分，獎金累積到下一洞')}</p><p>你目前贏得 <b class="num">${money(mine)}</b>　累積中 ${money(pot)}</p>`, bcast: () => ({ pos: 'SK', score: 0, line: `Skins Game · 你 <b>${money(mine, { short: true })}</b>` }) });
    if (mine) earn(st, mine, 'Skins Game', 'other');
    st.player.fame += 5000;
    st.results.push({ y: E.year, w: E.w, age: st.player.age, key: E.key, id: E.id, name: E.name, tour: 'exh', tourZh: '表演賽', course: E.course, courseName: ci.name, pos: money(mine, { short: true }), posN: 50, rounds: [], total: 0, prize: mine, pts: 0, mode: 'Skins' });
    await storyResult('Skins Game', `你贏得 ${money(mine)}。`, log.slice(-5));
    finishWeek(st, E, true);
  });
}
