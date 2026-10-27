// 第八章 · 傳奇：名人堂（照真實門檻 + 委員會投票）、告別賽、退休、第二人生（長青巡迴、團體賽隊長、球場設計師、青少年學院、傳承生涯）、榮譽開球
import { story, storyResult, go, toast, dialog, ui, confirm2 } from './ui/shell.js';
import { cur, setCur, localSave, sync, listSlots } from './state.js';
import { esc, money, clamp, rng, hash } from './util.js';
import { addTimeline, addNews, addPhoto, queueMain, endWeek, newCareer, spend, earn, eventsOfYear, CHAPTER_ZH } from './life.js';
import { MAIN } from './data/story.js';
import { text, MENTOR_NAME, FAMILY_WHO } from './story.js';
import { MAJORS } from './data/calendar.js';
import { findP, nameOf, rankList, ABS, ME, peerRating } from './world.js';
import { teamSide } from './data/players.js';
import { makeName } from './data/names.js';
import { checkAch } from './achievements.js';
import { installHooks } from './ui/ingame.js';

// ---------- 名人堂 ----------
export function hofEligible(st) {
  const T = st.tally, bigs = st.titles.filter(t => MAJORS.includes(t.id) || t.id === 'players').length;
  const wins = st.titles.filter(t => ['pga', 'major'].includes(t.tour)).length;
  const timeOk = st.player.age >= 45 || (st.retired && st.year - st.retired >= 3);
  return { ok: (wins >= 15 || bigs >= 2) && timeOk, wins, bigs };
}
export function hofVote(st) {
  const e = hofEligible(st), T = st.tally;
  return clamp(Math.round(38 + e.wins * 1.6 + e.bigs * 9 + (st.cnt.no1Weeks || 0) * 0.08 + (st.cnt.cupWin || 0) * 2 + (T.poy || 0) * 4 + (st.cnt.olyGold ? 4 : 0)), 0, 99);
}
// 每年 12 月檢查（life.yearEnd 之後由首頁呼叫）
export function hofCheck(st) {
  if (st.legacy && st.legacy.hof) return;
  const e = hofEligible(st);
  if (!e.ok) return;
  st.legacy = st.legacy || {};
  if (st.legacy.voteYear === st.year) return;
  st.legacy.voteYear = st.year;
  const v = hofVote(st);
  st.legacy.lastVote = v;
  if (v >= 75) queueMain(st, 'hof');
  else addNews(st, `名人堂委員會投票：${st.player.name} 得票率 ${v}%（門檻 75%）`);
}
export async function hofCeremony(st, m, paras) {
  const v = st.legacy.lastVote || hofVote(st);
  const opts = [[`${MENTOR_NAME[st.player.origin] || '啟蒙導師'}（啟蒙導師）`, '從第一次揮桿就在你身邊'], [`${nameOf(findP(st.world, st.story.friend) || { en: '童年玩伴' })}（童年玩伴，也是宿敵）`, '一起長大的對手'], [`${FAMILY_WHO[st.player.origin] || '家人'}`, '家人'], [`${st.team.caddie ? st.team.caddie.name : '桿弟'}（桿弟）`, '球袋的另一頭']];
  const i = await story({ small: 'WORLD GOLF HALL OF FAME', title: '名人堂', img: 'hof-main.jpg', paras: [...paras, `得票率 ${v}%（門檻 75%）。你入選了世界高爾夫名人堂。`, '典禮上要請一位介紹人。'], choices: opts, skip: false });
  const speech = await story({ small: 'INDUCTION', title: '上台致詞', img: 'hof-main.jpg', paras: [`${opts[Math.max(0, i)][0].split('（')[0]}在台上講了你 8 歲的故事，台下的人笑了又哭。`, '輪到你了。'], choices: [['「我只是一個在客廳看名人賽的孩子，夢想成真了。」'], ['「這座銅匾屬於每一個陪我走過練習場的人。」'], ['「我要謝謝我的桿弟：他說今天如果我沒入選，就要換老闆。」']], skip: false });
  st.player.pers[['gent', 'gent', 'humor'][Math.max(0, speech)]] += 2;
  st.legacy.hof = st.year; st.title = '名人堂';
  addTimeline(st, `入選世界高爾夫名人堂（得票率 ${v}%）`);
  addPhoto(st, '入選世界高爾夫名人堂', 'hof-main.jpg');
  addNews(st, `${st.player.name} 入選世界高爾夫名人堂`, 'major');
  st.world.hof.push({ id: ME, name: st.player.name, y: st.year });
  checkAch(st);
}

// ---------- 告別賽與退休 ----------
export async function planRetire(st) {
  const y = st.year, list = eventsOfYear(st, y).filter(e => e.w > st.week && (e.major || e.tour === st.status.mainTour || e.tour === 'tpga' || e.tour === 'jp' || e.tour === 'asia'));
  const pick = list.filter(e => e.id === 'open' || e.major || ['tpga', 'jp', 'asia'].includes(e.tour)).slice(0, 6);
  const i = await story({ small: 'FAREWELL', title: '安排告別賽', img: 'swilcan.jpg', paras: ['選一場比賽當作告別賽。打完那一場，你就退休。', '（英國公開賽在聖安德魯斯舉行的那一年，走過 Swilcan Bridge 是傳統的告別畫面。）'], choices: pick.map(e => [e.name, `第 ${e.w} 週`]).concat([['不打告別賽，現在退休']]), skip: false });
  if (i < pick.length && i >= 0) { st.farewell = pick[i].key; st.entered[pick[i].key] = true; toast('告別賽：' + pick[i].name); localSave(st); return go('home'); }
  await retire(st);
}
// 比賽結束後（如果是告別賽）
export async function afterFarewell(st, E) {
  if (st.farewell !== E.key) return false;
  st.cnt.farewell = 1;
  addPhoto(st, '告別賽', E.course === 'standrews' ? 'swilcan.jpg' : 'green-sun.jpg');
  const m = MAIN.farewell;
  if (E.course === 'standrews') await story({ small: 'FAREWELL', title: m.title, img: m.img, paras: m.text });
  else await story({ small: 'FAREWELL', title: '最後一洞', img: 'green-sun.jpg', paras: ['最後一推進洞，全場觀眾起立鼓掌。你脫下帽子，向四周揮手。'] });
  await retire(st, true);
  return true;
}
export async function retire(st, stay = false) {
  st.retired = st.year; st.status.stage = 'retired';
  addTimeline(st, `${st.player.age} 歲退休`);
  addNews(st, `${st.player.name} 宣布退休`, 'major');
  queueMain(st, 'retire');
  localSave(st); sync(true);
  if (!stay) go('home');
}
export async function secondLife(st, m, paras) {
  const i = await story({ small: 'SECOND LIFE', title: m.title, img: m.img, paras: [...paras, '你想先做哪一件事？（之後隨時可以在首頁換）'], choices: [['PGA TOUR Champions（50 歲以上的長青巡迴）', st.player.age >= 50 ? '回到巡迴賽，對手都是同年紀的選手' : `${50 - st.player.age} 年後才能參加`], ['球場設計師', '設計夢想球場，投稿給管理員'], ['青少年學院', `用獎金成立學院（${money(3000000, { short: true })}），每年有學員`], ['傳承生涯', '開一個新的生涯：孩子或學員從 8 歲開始，你是他的啟蒙導師']], skip: false });
  st.second = ['champions', 'designer', 'academy', 'legacy'][Math.max(0, i)];
}

// ---------- 退休後的首頁 ----------
export async function legacyHome(body, st) {
  const p = st.player, canSenior = p.age >= 50;
  hofCheck(st);
  body.innerHTML = `<div class="cm-hero"><small>${st.year} 年 · 第 ${st.week} 週 · ${esc(CHAPTER_ZH[8])}</small><h2>第二人生</h2><div class="meta">${p.age} 歲 · 退休 ${st.year - st.retired} 年 · 冠軍 ${st.tally.wins} · 大賽 ${st.tally.majors}${st.legacy && st.legacy.hof ? ' · 名人堂' : st.legacy && st.legacy.lastVote ? ` · 名人堂得票率 ${st.legacy.lastVote}%` : ''}</div></div>
    <div class="cm-card"><div class="cm-list">
      <div class="cm-li click" data-a="senior"><div class="main"><b>PGA TOUR Champions</b><span>${canSenior ? '回到巡迴賽：長青巡迴有自己的大賽' : `50 歲以後（還有 ${50 - p.age} 年）`}</span></div><div class="side">›</div></div>
      <div class="cm-li click" data-a="captain"><div class="main"><b>團體賽隊長</b><span>${st.captainOffer ? '收到邀請：' + esc(st.captainOffer.name) : '大賽冠軍退休後，有機會被邀請擔任總統盃或萊德盃隊長'}</span></div><div class="side">›</div></div>
      <div class="cm-li click" data-a="design"><div class="main"><b>球場設計師</b><span>設計夢想球場（已設計 ${(st.designs || []).length} 座）</span></div><div class="side">›</div></div>
      <div class="cm-li click" data-a="academy"><div class="main"><b>青少年學院</b><span>${st.assets.academy ? `學員 ${(st.academy || []).length} 位` : '成立學院（財務 → 資產）'}</span></div><div class="side">›</div></div>
      <div class="cm-li click" data-a="legacy"><div class="main"><b>傳承生涯</b><span>新的生涯從 8 歲開始，你是他的啟蒙導師：經驗 +20%、多一格技能卡</span></div><div class="side">›</div></div>
    </div></div>
    <div class="cm-card"><button class="cm-btn green block" id="lg-year">過一年（世界繼續轉）</button><p class="cm-note" style="margin-top:6px">名人賽冠軍退休後，每年名人賽第一天受邀榮譽開球。</p></div>
    <div class="cm-card"><h3>新聞</h3>${st.news.slice(0, 6).map(n => `<div class="cm-news"><small>${n.y}·W${n.w}</small>${esc(n.text)}</div>`).join('')}</div>`;
  body.querySelectorAll('[data-a]').forEach(el => el.onclick = () => action(st, el.dataset.a));
  document.getElementById('lg-year').onclick = async () => {
    ui.ctx.ui.loading(true, '一年過去了…');
    await new Promise(r => setTimeout(r, 30));
    const logs = [];
    const y0 = st.year;
    while (st.year === y0) { endWeek(st, [{ k: 'rest' }]); legacyWeek(st, logs); }
    ui.ctx.ui.loading(false);
    localSave(st); sync();
    if (logs.length) await storyResult(`${y0} 年`, logs.join('　'));
    go('home');
  };
}
async function action(st, a) {
  if (a === 'senior') {
    if (st.player.age < 50) return toast('50 歲以後才能參加長青巡迴');
    st.status.stage = 'tour'; st.retired = null; st.status.mainTour = 'champions'; st.status.cards.champions = 9999;
    addTimeline(st, '加入 PGA TOUR Champions'); localSave(st); return go('home');
  }
  if (a === 'captain') return captain(st);
  if (a === 'design') return design(st);
  if (a === 'academy') return academy(st);
  if (a === 'legacy') return startLegacy(st);
}
// 每週（退休後）：榮譽開球、隊長邀請、學院
export function legacyWeek(st, logs) {
  if (st.week === 15 && st.tally.masters && !st.status.amateur) { st.cnt.honorary = (st.cnt.honorary || 0) + 1; logs.push('名人賽第一天：你在第 1 洞榮譽開球'); addNews(st, `${st.player.name} 在名人賽榮譽開球`); }
  if (st.week === 20 && !st.captainOffer && st.tally.majors >= 1 && rng(hash(st.seed + 'cap' + st.year))() < 0.35) {
    const ev = eventsOfYear(st, st.year).find(e => e.tour === 'team');
    const side = teamSide(st.player.country);
    if (ev && ((ev.kind === 'ryder' && side !== 'intl') || (ev.kind === 'presidents' && side !== 'eur'))) { st.captainOffer = { key: ev.key, name: ev.name, side }; logs.push(`受邀擔任 ${ev.name} 隊長`); }
  }
  if (st.week === 52 && st.assets.academy) {
    const r = rng(hash(st.seed + 'acad' + st.year));
    st.academy = st.academy || [];
    const n = makeName(r, st.player.country);
    st.academy.push({ name: n, y: st.year, pot: 70 + r() * 20 });
    logs.push(`學院收了一位新學員：${n}`);
    // 學員長大成為職業選手（加入世界）
    for (const s of st.academy) if (!s.pro && st.year - s.y >= 8 && s.pot >= 80) { s.pro = true; const won = r() < (s.pot - 78) / 15; if (won) { st.cnt.academyWin = 1; logs.push(`學院的學員 ${s.name} 拿到職業冠軍！`); } }
  }
  if (st.week === 52) hofCheck(st);
}
async function captain(st) {
  const o = st.captainOffer;
  if (!o) return toast('還沒有收到隊長的邀請');
  const now = ABS(st.year, st.week), list = rankList(st.world, null, now).filter(x => (o.side === 'usa' ? x.p.c === 'USA' : o.side === 'eur' ? teamSide(x.p.c) === 'eur' : teamSide(x.p.c) === 'intl'));
  const auto = list.slice(0, 6), cand = list.slice(6, 18);
  const picks = [];
  const i = await story({ small: 'CAPTAIN', title: `${o.name} 隊長`, img: 'ra-clubhouse.jpg', paras: [`積分前 6 名自動入選：${auto.map(x => nameOf(x.p)).join('、')}。`, '你要挑 6 位外卡。'], choices: [['挑最近狀態最好的 6 位', '看近期的世界排名積分'], ['挑經驗最豐富的 6 位', '大賽冠軍與團體賽老將優先']], skip: false });
  const pool = i === 1 ? cand.slice().sort((a, b) => b.p.titles.length - a.p.titles.length) : cand;
  picks.push(...pool.slice(0, 6));
  const team = auto.concat(picks), str = team.reduce((s, x) => s + x.p.r, 0) / team.length;
  const r = rng(hash(st.seed + o.key));
  const win = r() < clamp(0.5 + (str - 76) * 0.06 + (i === 1 ? 0.03 : 0.02), 0.2, 0.85);
  await storyResult(win ? `${o.name}：你的球隊贏了！` : `${o.name}：差一點`, `你的外卡：${picks.map(x => nameOf(x.p)).join('、')}。`, [win ? '球員們把你拋上天。' : '你在記者會上說：「我為這支球隊驕傲。」']);
  if (win) { st.cnt.captainWin = 1; addTimeline(st, `${o.name} 冠軍隊長`); st.trophies.push({ y: st.year, id: o.key, name: `${o.name}（隊長）`, tier: 'team', tour: 'team', kind: 'teamcup' }); }
  st.captainOffer = null;
  checkAch(st); localSave(st); go('home');
}
async function design(st) {
  const styles = [['links', '林克斯（海邊、強風、壺穴沙坑）'], ['parkland', '公園式（樹林、水塘）'], ['desert', '沙漠（荒地、仙人掌）'], ['mountain', '山地（高低落差、松樹）']];
  const i = await story({ small: 'COURSE DESIGNER', title: '設計夢想球場', img: 'green-sun.jpg', paras: ['在空白的地圖上畫下第一個果嶺。你想要哪一種風格？'], choices: styles.map(s => [s[1]]), skip: false });
  const name = prompt('球場的名字', `${st.player.name}夢想球場`) || `${st.player.name}夢想球場`;
  const r = rng(hash(st.seed + name));
  const pars = r.shuffle([3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5]);
  const d = { name, style: styles[Math.max(0, i)][0], y: st.year, holes: pars.map(p => [p, p === 3 ? 150 + Math.round(r() * 70) : p === 4 ? 380 + Math.round(r() * 90) : 520 + Math.round(r() * 80)]) };
  st.designs = (st.designs || []).concat(d);
  st.cnt.designer = 1;
  addTimeline(st, `設計球場「${name}」並投稿`);
  await storyResult('投稿完成', `「${name}」：Par ${pars.reduce((a, b) => a + b, 0)}、${d.holes.reduce((a, h) => a + h[1], 0).toLocaleString()} 碼。`, ['管理員會在測試員頁看到你的投稿；被採用就會成為主遊戲的自製球場。']);
  checkAch(st); localSave(st); sync(); go('home');
}
async function academy(st) {
  if (!st.assets.academy) return toast('先到「財務 → 資產」成立學院');
  const list = (st.academy || []).map(s => `${s.name}（${s.y} 年入學${s.pro ? '，已轉職業' : ''}）`);
  await storyResult('青少年學院', list.length ? list.join('、') : '今年年底會收第一批學員。');
}
async function startLegacy(st) {
  const slots = await listSlots(st.user);
  const free = [1, 2, 3].find(s => !slots[s]);
  if (!free) return toast('3 個生涯欄位都滿了：先刪掉一個');
  if (!(await confirm2(`在欄位 ${free} 開始傳承生涯？新球員從 8 歲開始，${st.player.name} 是他的啟蒙導師：經驗 +20%、多一格技能卡。`, '開始'))) return;
  const name = prompt('新球員的名字', '') || `${st.player.name.slice(0, 1)}小${st.player.name.slice(-1)}`;
  const ns = newCareer({ user: st.user, slot: free, name, country: st.player.country, home: st.player.home, family: 'wealthy', gender: st.player.gender, height: st.player.height, look: { ...st.player.look }, difficulty: st.opt.difficulty, length: st.opt.length });
  ns.legacyOf = { name: st.player.name, slot: st.slot };
  ns.player.legacyBonus = true;
  ns.player.origin = 'grandpa';
  addTimeline(st, `傳承：${name} 的啟蒙導師`);
  localSave(st); sync(true);
  setCur(ns);
  await installHooks(ui.ctx);
  const { runPrologue } = await import('./childhood.js');
  localSave(ns); sync(true);
  await runPrologue(ns);
}
