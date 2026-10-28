// 序章與第一章（童年，新手引導）：五個關鍵時刻，每一個 = 一小段劇情 + 一個教學活動 + 一個會影響起點的選擇
//   8 歲 名人賽之夜 · 第一次走進練習場 → 9 歲 夜市旁的小型高爾夫 → 10 歲 第一次和家人下場 → 11 歲 家鄉兒童盃 → 12 歲 暑假的十字路口
import { story, storyResult, go, toast, ui } from './ui/shell.js';
import { playRound, gamePlayer, endDrill } from './ui/ingame.js';
import { localSave, sync } from './state.js';
import { MAIN } from './data/story.js';
import { text, applyFx, FAMILY_WHO, MENTOR_NAME } from './story.js';
import { TALENTS, addXp, train, startStats } from './growth.js';
import { yearWorld, addTimeline, addNews, START_YEAR, spend, giveItem } from './life.js';
import { simBackground, cinfo } from './event.js';
import { tourCalendar, homeCourses, domesticName } from './data/calendar.js';
import { peerRating, nameOf, findP } from './world.js';
import { rng, hash, sum, toPar, esc, seeded } from './util.js';
import { holeAdjs, holeScore, roundMean, courseAdj } from './sim.js';
import { cmUnlock, checkAch } from './achievements.js';
import { KNOW } from './data/knowledge.js';

const ORIGINS = {
  grandpa: { name: '爺爺的球袋', sub: '爺爺是老球友，週末帶你去練習場。導師：爺爺（抗壓、讀果嶺起點較高）', talents: ['heart', 'reader'], mentor: '爺爺' },
  tv: { name: '電視上的名人賽', sub: '自己對著電視模仿揮桿，媽媽帶你報名兒童課程。導師：兒童班教練（基本動作扎實）', talents: ['basics', 'long'], mentor: '兒童班的李教練' },
  minigolf: { name: '夜市旁的小型高爾夫', sub: '家附近的小型高爾夫場一玩就停不下來。導師：場主阿伯（推桿與距離感起點較高）', talents: ['putter', 'touch'], mentor: '場主阿伯' },
};
// 兒童梯的長度：8 歲約黑梯的 45%、12 歲約 70%
export const kidTeeFrac = age => ({ 8: 0.45, 9: 0.5, 10: 0.55, 11: 0.62, 12: 0.7 })[age] || 0.7;
export function kidTees(courseId, age) {
  const ci = cinfo(courseId), f = kidTeeFrac(age), out = {};
  ci.holes.forEach((h, i) => { const y = (h[5] && h[5].tees && h[5].tees.black) || h[1]; out[i] = Math.max(55, Math.round(y * f)); });
  return out;
}
export function giveKnow(st, trig) {
  st.know = st.know || [];
  const k = KNOW.find(x => x.trig === trig && !st.know.includes(x.id));
  if (k) { st.know.push(k.id); return k; }
  return null;
}

// ---------- 序章 ----------
export async function runPrologue(st) {
  // 2026 年的名人賽（世界的第一場比賽）：電視上的那一位冠軍
  const ev = tourCalendar('pga', START_YEAR).find(e => e.id === 'masters');
  const res = simBackground(st, { ...ev, key: START_YEAR + ':masters', year: START_YEAR }, st.world);
  const champ = res.rows[0];
  st.story.prologueChamp = champ.name;
  st.world.hist.masters = { [START_YEAR]: champ.id };
  const wp = findP(st.world, champ.id); if (wp) wp.titles.push([START_YEAR, 'masters']);
  const m = MAIN.prologue;
  await story({ small: 'PROLOGUE · 8 歲', title: m.title, img: m.img, paras: m.text.map(t => text(st, t, { champ: champ.name })), goal: m.goal, skip: false, ok: '開始我的人生' });
  st.story.done.prologue = true;
  // 啟蒙契機
  const keys = Object.keys(ORIGINS);
  const i = await story({ small: 'PROLOGUE', title: '你是怎麼開始打球的？', img: 'range-puttenham.jpg', paras: ['每一個傳奇都有一個起點。'], choices: keys.map(k => [ORIGINS[k].name, ORIGINS[k].sub]), skip: false });
  const o = keys[Math.max(0, i)];
  st.player.origin = o;
  st.player.talents = ORIGINS[o].talents.slice();
  // 天賦的起點素質
  const base = startStats(st);
  st.player.stats = base;
  st.team.mentor = ORIGINS[o].mentor;
  addTimeline(st, `啟蒙：${ORIGINS[o].name}`);
  localSave(st);
  await moment1(st);
}

// APP 關掉之後回來：從記下的關鍵時刻接著走（序章沒看完就從序章開始）
export async function resumeChildhood(st) {
  const m = st.story.moment || 0;
  if (!st.story.done.prologue || !st.player.talents.length) return runPrologue(st);
  return [moment1, moment1, moment2, moment3, moment4, moment5][m](st);
}
const mark = (st, n) => { st.story.moment = n; localSave(st); };

// ---------- 關鍵時刻 1：第一次走進練習場（揮桿教學）----------
async function moment1(st) {
  mark(st, 1);
  await story({ small: 'CHAPTER 1 · 關鍵時刻 1 / 5 · 8 歲', title: '第一次走進練習場', img: 'range-holma.jpg', paras: [text(st, '{mentor}把一支小小的 7 號鐵放進你手裡。'), '「往下拉，決定力道；快速往上滑，把球打出去。左右滑可以調方向。」', '打一籃球（10 球）。不用急，先感覺球桿打到球的那一下。打滿 3 球之後，上方可以按「結束練習」。'], ok: '去練習場' });
  const r = await drill(st, { mode: 'range', balls: 10, title: '第一籃球', endAfter: 3, goal: '打 10 球；飛超過 50 碼算一個好球', score: res => (res.result === 'rest' && res.carry / 0.9144 >= 50 ? 1 : 0) });
  st.cnt.swing = 1;
  const good = r ? r.score : 0;
  addXp(st.player, 60 + good * 8);
  giveKnow(st, 'swing');
  await storyResult('第一籃球', `你打了 ${r ? r.n : 0} 球，其中 ${good} 球飛超過 50 碼。`, [text(st, '{mentor}笑著說：「明天再來。」')]);
  checkAch(st);
  advanceTo(st, 9);
  await moment2(st);
}

// ---------- 關鍵時刻 2：夜市旁的小型高爾夫（推桿教學）----------
async function moment2(st) {
  mark(st, 2);
  await story({ small: 'CHAPTER 1 · 關鍵時刻 2 / 5 · 9 歲', title: '夜市旁的小型高爾夫', img: 'minigolf.jpg', paras: ['夜市旁邊的小型高爾夫場，燈泡一串一串地亮著。', '果嶺上有顏色的地方是坡度：箭頭往哪裡流，球就往哪裡彎。拉多長，球就在平地滾多遠。', '推幾顆，學會推桿與讀線。打滿 3 球之後，上方可以按「結束練習」。'], ok: '開始推桿' });
  const r = await drill(st, { mode: 'putt', balls: 12, title: '推桿練習', endAfter: 3, goal: '推 12 球，看能推進幾顆', score: res => (res.result === 'holed' ? 1 : 0) });
  const made = r ? r.score : 0;
  st.cnt.putt = 1; giveKnow(st, 'putt');
  addXp(st.player, 60 + made * 6);
  const i = await story({ small: '9 歲', title: `推進了 ${made} 顆`, paras: ['朋友在旁邊喊你去玩別的攤位。'], choices: [['留下來認真練推桿', '推桿距離感 +3'], ['和朋友去玩', '心情 + 、童年玩伴關係 +']], skip: false });
  if (i === 0) applyFx(st, { stat: { touch: 3 } }); else applyFx(st, { mood: 10, rel: { friend: 10 } });
  st.story.flags.m2 = i;
  advanceTo(st, 10);
  await moment3(st);
}

// ---------- 關鍵時刻 3：第一次和家人下場（9 洞兒童梯：選桿、切球、沙坑、OK 推）----------
async function moment3(st) {
  mark(st, 3);
  const course = homeCourses(st.player.country)[0];
  const ci = cinfo(course);
  await story({ small: 'CHAPTER 1 · 關鍵時刻 3 / 5 · 10 歲', title: '第一次和家人下場', img: 'boy-flag.jpg', paras: [text(st, '{family_who}和{mentor}帶你去{home}的' + ci.name + '，從兒童梯打 9 洞。'), '左下角的球桿可以換：遠的用木桿，近的用挖起桿；離果嶺很近時可以用推桿或寶刀切。', '和家人下場可以給 OK 推（1 碼內直接算進）。'], ok: '開球' });
  const tees = kidTees(course, 10);
  const res = await playRound({ label: '和家人下場', cfg: { courseId: course, holeIdx: [0, 1, 2, 3, 4, 5, 6, 7, 8], tee: 'red', gimme: 1, mulligans: 3, wind: 'light', career: { teeYds: tees, kind: 'family' } }, bcast: g => ({ pos: '家人', score: sum(Object.entries(sessScores(g)).map(([k, v]) => v - ci.holes[k][0])), line: `${ci.name} · 兒童梯` }) });
  const strokes = sum(Object.values(res.scores));
  const par9 = sum(ci.holes.slice(0, 9).map(h => h[0]));
  if (res.scores && Object.keys(res.scores).length === 9) st.cnt.best9 = Math.min(st.cnt.best9 || 999, strokes);
  addXp(st.player, 180);
  giveKnow(st, 'cup');
  const i = await story({ small: '10 歲', title: res.quit ? '第一次下場' : `9 洞 ${strokes} 桿（${toPar(strokes - par9)}）`, paras: [text(st, '最後一洞，{mentor}說：「這一桿往果嶺左邊打，右邊有沙坑。」')], choices: [[text(st, '聽{mentor}的建議'), '抗壓 +3（學會相信別人的判斷）'], ['自己決定', '讀果嶺 +3（學會自己看）']], skip: false });
  if (i === 0) applyFx(st, { stat: { mental: 3 }, rel: { mentor: 6 } }); else applyFx(st, { stat: { reading: 3 } });
  advanceTo(st, 11);
  await moment4(st);
}
const sessScores = g => { const p = g.players[0], o = {}; g.holeList.forEach((h, k) => { if (p.scores[k]) o[h] = p.scores[k]; }); return o; };

// ---------- 關鍵時刻 4：家鄉兒童盃（第一場比賽：排行榜、名次）----------
async function moment4(st) {
  mark(st, 4);
  const course = homeCourses(st.player.country)[2] || homeCourses(st.player.country)[0], ci = cinfo(course), dn = domesticName(st.player.country);
  await story({ small: 'CHAPTER 1 · 關鍵時刻 4 / 5 · 11 歲', title: `第一場比賽：${st.player.home}${dn.kids}`, img: 'kids-camp.jpg', paras: ['報到處發了一張計分卡和一個號碼布。', '這是你的第一場比賽：上方是轉播風格的名次條，左邊是名次、中間是對標準桿。', '比賽沒有 OK 推，每一顆都要推進。'], ok: '開球' });
  // 兒童組的對手（同年紀、同國籍的同儕，童年玩伴也在裡面）
  const y = st.year, W = st.world, tees = kidTees(course, 11);
  const kids = W.peers.filter(p => p.c === st.player.country && Math.abs((y - p.by) - 11) <= 1).slice(0, 29);
  const r0 = rng(hash(st.seed + ':kidcup'));
  const field = kids.map(p => {
    const R = peerRating(p, y) + r0.normal() * 2;
    const adj = holeAdjs(ci.holes.slice(0, 9), R, 40), base = (roundMean(R) + courseAdj({ ...ci, diff: 2 }, {})) / 2;
    return { id: p.id, name: nameOf(p), R, sc: ci.holes.slice(0, 9).map((h, i) => holeScore(r0, h[0], base / 9 + adj[i], R)) };
  });
  const parOf = i => ci.holes[i][0];
  const lb = (thru) => {
    const mine = sessScoresNow;
    const rows = field.map(f => ({ name: f.name, tp: sum(f.sc.slice(0, thru).map((v, i) => v - parOf(i))) }));
    rows.push({ name: '你', me: true, tp: sum(Object.entries(mine).map(([k, v]) => v - parOf(k))) });
    rows.sort((a, b) => a.tp - b.tp);
    return rows;
  };
  let sessScoresNow = {};
  const res = await playRound({
    label: dn.kids, cfg: { courseId: course, holeIdx: [0, 1, 2, 3, 4, 5, 6, 7, 8], tee: 'red', gimme: 0, mulligans: st.opt.difficulty === 'casual' ? 1 : 0, wind: 'light', career: { teeYds: tees, kind: 'kidcup' } },
    onHole: (k, idx, s) => { sessScoresNow[idx] = s; },
    bcast: g => { const rows = lb(Object.keys(sessScoresNow).length), i = rows.findIndex(x => x.me); const pos = rows.filter(x => x.tp < rows[i].tp).length + 1; return { pos: (rows.filter(x => x.tp === rows[i].tp).length > 1 ? 'T' : '') + pos, score: rows[i].tp, line: `${dn.kids} · 領先 <b>${toPar(rows[0].tp)}</b> · 剩 ${9 - Object.keys(sessScoresNow).length} 洞` }; },
    holeCard: () => { const rows = lb(Object.keys(sessScoresNow).length).slice(0, 5); return `<table class="lb">${rows.map((x, i) => `<tr class="${x.me ? 'me' : ''}"><td class="pos">${i + 1}</td><td>${esc(x.name)}</td><td class="tp ${x.tp < 0 ? 'u' : ''}">${toPar(x.tp)}</td></tr>`).join('')}</table>`; },
    leaderboard: null,
  });
  // 沒打完的洞用模擬補
  const R = 20;
  for (let i = 0; i < 9; i++) if (!res.scores[i]) res.scores[i] = holeScore(r0, parOf(i), 0.9, R);
  sessScoresNow = res.scores;
  const rows = lb(9), myI = rows.findIndex(x => x.me), pos = rows.filter(x => x.tp < rows[myI].tp).length + 1;
  st.results.push({ y, w: 30, age: 11, key: y + ':kidcup', id: 'kidcup', name: `${st.player.home}${dn.kids}`, tour: 'kids', tourZh: '兒童賽', course, courseName: ci.name, pos: String(pos), posN: pos, rounds: [sum(Object.values(res.scores))], total: sum(Object.values(res.scores)), prize: 0, mode: '自己打' });
  st.tally.events++;
  addXp(st.player, 220 + Math.max(0, 30 - pos * 3) * 5);
  st.cnt.kidPos = pos;
  if (pos === 1) {
    st.tally.wins++; st.titles.push({ y, w: 30, id: 'kidcup', name: `${st.player.home}${dn.kids}`, tier: 'kids', tour: 'kids' });
    st.trophies.push({ y, id: 'kidcup', name: `${st.player.home}${dn.kids}`, tier: 'kids', tour: 'kids', kind: 'kidcup' });
    addTimeline(st, `${dn.kids}冠軍！第一座獎盃`);
    await story({ small: 'MILESTONE', title: '第一座兒童盃', img: 'boy-flag.jpg', paras: [text(st, '{family_who}把獎盃放在電視旁邊，就在當年看名人賽的位置。')], ok: '放進獎盃室' });
  } else {
    addTimeline(st, `${dn.kids}第 ${pos} 名`);
    if (pos <= 3) { st.trophies.push({ y, id: 'kidcup', name: `${st.player.home}${dn.kids}（第 ${pos} 名）`, tier: 'kids', tour: 'kids', kind: 'medal' }); }
    await storyResult(`${dn.kids}第 ${pos} 名`, pos <= 5 ? '頒獎台上的獎牌閃閃發亮。下一次，你想站在最中間。' : '你第一次知道，自己和最好的孩子還差多少。', [`名次決定全國兒童排名：這一年你排第 ${Math.max(1, Math.round(pos * 1.6))} 名。`]);
  }
  st.cnt.kidRank = Math.max(1, Math.round(pos * 1.6));
  if (st.cnt.kidRank === 1) st.cnt.kidNat = 1;
  giveKnow(st, 'cup');
  checkAch(st);
  advanceTo(st, 12);
  await moment5(st);
}

// ---------- 關鍵時刻 5：暑假的十字路口（訓練關卡的教學 + 第二章的起點）----------
async function moment5(st) {
  mark(st, 5);
  await story({ small: 'CHAPTER 1 · 關鍵時刻 5 / 5 · 12 歲', title: '練習場的訓練關卡', img: 'young-putting.jpg', paras: ['從現在起，練球可以打「訓練關卡」：在練習場達成目標，訓練經驗會比一般練球多。', '先試一個：鐵桿打進目標區。打滿 3 球之後，上方可以按「結束練習」。'], ok: '開始訓練' });
  const r = await ironDrill(st, 10, 3);
  const i = await story({ small: '12 歲', title: '暑假的十字路口', img: 'kids-camp2.jpg', paras: [text(st, '{family_who}說：「今年暑假，你想怎麼過？」')], choices: [['參加兒童夏令營', '天賦：基本功扎實 · 第二章可以選技術派教練'], ['挑戰 U.S. Kids Golf 世界錦標賽', '天賦：大心臟 · 存款 −$800'], [text(st, '留在家鄉陪{mentor}打球'), '天賦：家鄉通 · 家人關係 +']], skip: false });
  const t = ['basics', 'heart', 'home'][Math.max(0, i)];
  if (!st.player.talents.includes(t)) st.player.talents.push(t);
  for (const [k, v] of Object.entries(TALENTS[t].stats || {})) st.player.stats[k] += v;
  if (i === 1) { spend(st, 800, 'U.S. Kids Golf 世界錦標賽'); st.cnt.uskids = 1; addTimeline(st, '參加 U.S. Kids Golf 世界錦標賽（Pinehurst）'); }
  if (i === 2) applyFx(st, { rel: { family: 10, mentor: 10 } });
  if (i === 0) st.story.flags.camp = 1;
  addTimeline(st, ['兒童夏令營', 'U.S. Kids Golf 世界錦標賽', '留在家鄉打球'][Math.max(0, i)]);
  // 童年結束 → 13 歲的 1 月
  advanceTo(st, 13);
  st.week = 1; st.player.age = 13;
  st.status.stage = 'junior'; st.chapter = 2;
  st.school = { grade: 65, sports: false };
  st.story.done.childhood = true;
  checkAch(st);
  localSave(st); sync(true);
  go('home');
}

// 時間往前跳到某個年紀（童年一次跳過整年；世界繼續轉）
function advanceTo(st, age) {
  const target = st.player.birthYear + age;
  while (st.year < target) {
    yearWorld(st, st.year);
    st.year++;
    grow(st, st.year - st.player.birthYear - 1);      // 長大（去年的年紀 → 今年）
  }
  st.player.age = st.year - st.player.birthYear;
  st.week = age === 13 ? 1 : 26 + (age - 9) * 2;
  localSave(st);
}
import { yearlyGrowth } from './growth.js';
function grow(st, age) {
  const g = yearlyGrowth(age);
  for (const k in g) st.player.stats[k] = Math.max(1, st.player.stats[k] + g[k] * (k === 'power' && st.player.talents.includes('long') ? 1.15 : 1));
  // 童年的練習
  for (const k in st.player.stats) st.player.stats[k] += 0.8;
  addXp(st.player, 150);
}

// ---------- 練習場的訓練關卡（共用）----------
//   o = { mode: 'range' | 'putt' | 'bunker', balls, title, goal, score(res) → 分數, target（碼） }
export function drill(st, o) {
  let n = 0, score = 0;
  // endAfter：教學用，打滿幾球之後可以按「結束練習」
  const hud = () => `${esc(o.title)}　第 <b>${Math.min(n + 1, o.balls)}</b> / ${o.balls} 球　${o.stat ? o.stat() : `得分 <b>${score}</b>`}<br><small>${esc(o.goal)}</small>${o.endAfter && n >= o.endAfter && n < o.balls ? '<br><button class="cm-btn small" data-drillend style="margin-top:6px">結束練習</button>' : ''}`;
  const p = playRound({
    label: o.title, noHoleCard: true,
    cfg: { courseId: 'maple', practice: true, startHole: 7, tee: 'black', holes: 'all', wind: 'calm', ...(o.cfg || {}), career: { drill: o.mode } },      // o.cfg：換球場、洞（例如技巧賽的近旗用奧古斯塔 12 號）
    drill: true, autoClub: !!o.autoClub,
    drillHud: hud,
    drillShot: (game, res) => {
      n++; score += o.score(res, game) || 0;
      const e = document.getElementById('cm-drill'); if (e) e.innerHTML = hud();
      if (n >= o.balls) setTimeout(() => endDrill(game), 1600);
    },
  });
  return p.then(() => ({ score, n }));
}
// 鐵桿打進目標區（目標 70~130 碼，依年紀）
export function ironDrill(st, balls = 10, endAfter = 0) {
  const target = Math.round(60 + Math.max(0, st.player.age - 8) * 10);
  return drill(st, { mode: 'range', balls, endAfter, title: `目標 ${target} 碼`, goal: `落在目標 ±10% 距離、左右 ${Math.round(target * 0.08)} 碼內算 1 分`, score: res => (res.result === 'rest' && Math.abs(res.total / 0.9144 - target) <= target * 0.1 && Math.abs(res.offline / 0.9144) <= target * 0.08 ? 1 : 0) });
}
