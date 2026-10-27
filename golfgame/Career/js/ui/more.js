// 更多：新聞、年表、成績紀錄、世界排名、生涯名片、知識卡、好友週賽、系統選項、轉職業 / 退休、管理員的測試員摘要
//   紀錄頁的「生涯」分頁（renderRecordsTab）
import { register, go, toast, dialog, confirm2, story, refresh, ui } from './shell.js';
import { cur, localSave, sync, listSlots, summary, setCur } from '../state.js';
import { esc, money, toPar, pct, clamp } from '../util.js';
import { CHAPTER_ZH, DIFF, LENGTH, addTimeline, turnProCore } from '../life.js';
import { rankList, owgrAvg, ABS, ME, nameOf } from '../world.js';
import { COUNTRY_ZH } from '../data/players.js';
import { KNOW } from '../data/knowledge.js';
import { CAREER_ACH } from '../achievements.js';
import { personality } from '../story.js';
import { playerRating, train, TRAIN } from '../growth.js';
import { playRound } from './ingame.js';
import { cinfo } from '../event.js';
import { avatarSvg } from './create.js';

const TABS = [['news', '新聞'], ['time', '年表'], ['res', '成績'], ['rank', '世界排名'], ['card', '生涯名片'], ['album', '相簿'], ['know', '知識卡'], ['weekly', '好友週賽'], ['opt', '系統選項']];
register('more', (body, arg) => {
  const st = cur(); if (!st) return go('slots');
  const t = arg || 'news';
  body.innerHTML = `<div class="cm-seg" style="margin-bottom:12px">${TABS.map(([k, n]) => `<button data-t="${k}" class="${t === k ? 'on' : ''}">${n}</button>`).join('')}${ui.ctx.session.isAdmin ? `<button data-t="admin" class="${t === 'admin' ? 'on' : ''}">測試員</button>` : ''}</div><div id="mo-body"></div>`;
  body.querySelectorAll('[data-t]').forEach(b => b.onclick = () => go('more', b.dataset.t));
  const el = document.getElementById('mo-body');
  ({ news, time, res, rank, card, album, know, weekly, opt, admin })[t](el, st);
});

function news(el, st) { el.innerHTML = `<div class="cm-card"><h3>新聞</h3>${st.news.map(n => `<div class="cm-news ${n.kind === 'major' ? 'major' : ''}"><small>${n.y}·W${n.w}</small>${esc(n.text)}</div>`).join('') || '<div class="cm-empty">還沒有新聞</div>'}</div>`; }
function time(el, st) {
  el.innerHTML = `<div class="cm-card"><h3>生涯年表</h3><div class="cm-list">${st.timeline.map(t => `<div class="cm-li"><div class="main"><b class="num" style="font-size:16px;display:inline">${t.age} 歲</b>　${esc(t.text)}</div><div class="side">${t.y}</div></div>`).join('')}</div></div>`;
}
function res(el, st) {
  const list = st.results.slice().reverse();
  const T = st.tally;
  el.innerHTML = `<div class="cm-card"><h3>生涯數據</h3><div class="cm-grid3">
      ${[['比賽', T.events], ['冠軍', T.wins], ['大賽', T.majors], ['前十', T.top10], ['晉級率', pct(T.cuts, T.events) + '%'], ['生涯獎金', money(st.money.careerPrize, { short: true })]].map(([k, v]) => `<div><span class="cm-k">${k}</span><div class="num" style="font-size:24px">${v}</div></div>`).join('')}</div></div>
    <div class="cm-card"><h3>每一場</h3><div class="cm-scroll-x"><table class="lb"><tr><th>年</th><th>賽事</th><th>名次</th><th>總桿</th><th>獎金</th><th>打法</th></tr>${list.map(r => `<tr><td class="th">${r.y}</td><td>${esc(r.name)}<span class="ctry">${esc(r.courseName || '')}</span></td><td class="pos">${esc(r.pos)}</td><td class="th">${r.total || '—'}${r.toPar != null && r.total ? ` (${toPar(r.toPar)})` : ''}</td><td class="th">${r.prize ? money(r.prize, { short: true }) : '—'}</td><td class="th" style="font-size:11px">${esc(r.mode || '')}</td></tr>`).join('')}</table></div></div>`;
}
function rank(el, st) {
  const now = ABS(st.year, st.week);
  const list = rankList(st.world, st.player.pro ? { ...st.player, id: ME, ow: st.ow, pro: true, name: st.player.name } : null, now).slice(0, 60);
  el.innerHTML = `<div class="cm-card"><h3>世界排名<small>近兩年的平均積分</small></h3>${st.status.amateur ? `<p class="cm-note">業餘時期看的是世界業餘排名（${st.wagr && st.wagr < 600 ? '第 ' + st.wagr + ' 名' : '還沒有排名'}）與青少年排名（國內第 ${st.jrRank || '—'} 名）。下面是職業的世界排名。</p>` : ''}
    <div class="cm-scroll-x"><table class="lb"><tr><th>名次</th><th>球員</th><th style="text-align:center">平均</th></tr>${list.map((x, i) => `<tr class="${x.p.id === ME ? 'me' : ''}"><td class="pos">${i + 1}</td><td>${esc(x.p.id === ME ? st.player.name : nameOf(x.p))}<span class="ctry">${x.p.id === ME ? st.player.country : x.p.c}</span></td><td class="th">${x.avg.toFixed(2)}</td></tr>`).join('')}</table></div>
    ${st.player.pro && (st.rankNow || 9999) > 60 ? `<p class="cm-note" style="margin-top:6px">你：第 ${st.rankNow < 9999 ? st.rankNow : '—'} 名（平均 ${owgrAvg({ ow: st.ow }, now).toFixed(2)}）</p>` : ''}</div>`;
}
export function careerCardHtml(st) {
  const p = st.player, T = st.tally;
  return `<div class="cm-card" style="background:linear-gradient(135deg,#0f5a33,#0a3f24);color:#f6f0e1;border-color:var(--champ)">
    <div class="cm-row"><div style="width:110px">${avatarSvg({ ...p.look, hairColor: p.look.hairColor || p.look.hair }, p.age)}</div><div style="flex:1">
      <small style="color:var(--champ2);letter-spacing:.18em;font-size:10px">MY CAREER · ${esc(COUNTRY_ZH[p.country] || p.country)}</small><h2 style="font:700 22px Noto Serif TC;margin:2px 0">${esc(p.name)}</h2>
      <div style="font-size:12px;opacity:.8">${p.age} 歲 · ${esc(CHAPTER_ZH[st.chapter] || '')} · ${esc(st.title || personality(p))}</div>
      <div class="cm-row wrap" style="margin-top:10px;gap:14px">${[['冠軍', T.wins], ['大賽', T.majors], ['世界排名', st.rankNow && st.rankNow < 9999 ? st.rankNow : '—'], ['最佳', st.bestRank && st.bestRank < 9999 ? st.bestRank : '—'], ['生涯獎金', money(st.money.careerPrize, { short: true })]].map(([k, v]) => `<div><div style="font-size:10px;color:var(--champ2)">${k}</div><div class="num" style="font-size:22px">${v}</div></div>`).join('')}</div>
    </div></div></div>`;
}
// 生涯相簿：重要時刻（第一座獎盃、國家隊、巡迴卡、冠軍…）
function album(el, st) {
  const list = (st.photos || []).slice().reverse();
  el.innerHTML = `<div class="cm-card"><h3>生涯相簿<small>${list.length} 張</small></h3><p class="cm-note">重要的時刻會自動留一張；名人堂典禮與退休時做成回顧。</p></div>
    <div class="cm-grid2">${list.map(p => `<div class="cm-card" style="padding:0;overflow:hidden"><div style="height:120px;background:url('Career/img/s/${esc(p.img)}') center/cover;filter:sepia(.18) saturate(.9)"></div><div style="padding:8px 10px"><b style="font-size:13px">${esc(p.title)}</b><div class="cm-note">${p.y} · ${p.age} 歲</div></div></div>`).join('') || '<div class="cm-empty">還沒有照片</div>'}</div>`;
}
// 歷史比較：你這個年紀的冠軍數，世界上有幾個人比你多（真實與虛構球員在同年紀的 PGA TOUR / 四大賽冠軍）
export function historyLine(st) {
  const age = st.player.age, mine = st.titles.filter(t => t.tour === 'pga' || t.tour === 'major').length;
  if (!mine || st.status.amateur) return '';
  const PGA_IDS = new Set(['masters', 'pgachamp', 'usopen', 'open', 'players', 'sentry', 'sony', 'amex', 'farmers', 'phoenix', 'pebble', 'genesis', 'cognizant', 'api', 'valspar', 'valero', 'heritage', 'truist', 'colonial', 'memorial', 'travelers', 'rocket', 'deere', 'scottish', '3m', 'wyndham', 'stjude', 'bmw', 'tourchamp', 'procore', 'sanderson', 'zozo', 'worldwide', 'rsm']);
  const more = st.world.players.filter(p => p.titles.filter(([y, id]) => PGA_IDS.has(id) && y - p.by <= age).length > mine).length;
  return `你 ${age} 歲時有 ${mine} 座 PGA TOUR 冠軍，這個世界上同年紀時比你多的只有 ${more} 個人。`;
}
function card(el, st) {
  const hl = historyLine(st);
  el.innerHTML = careerCardHtml(st) + (hl ? `<div class="cm-card"><p>${esc(hl)}</p></div>` : '') + `<div class="cm-card"><h3>生涯成就<small>${Object.keys(st.ach).length} / ${CAREER_ACH.length}</small></h3><div class="cm-list">${CAREER_ACH.map(a => `<div class="cm-li ${st.ach[a.id] ? '' : 'dim'}"><div class="main"><b>${a.glyph}　${esc(a.name)}</b><span>${esc(a.desc)}${a.pts ? ` · 主帳號能力點 +${a.pts}` : ''}</span></div><div class="side">${st.ach[a.id] ? String(st.ach[a.id]).slice(0, 10) : ''}</div></div>`).join('')}</div></div>`;
}
function know(el, st) {
  const got = st.know || [];
  el.innerHTML = `<div class="cm-card"><h3>知識卡<small>${got.length} / ${KNOW.length}</small></h3><p class="cm-note">第一次遇到某件事、比賽結束時收集；收集 40 張有成就。</p></div><div class="cm-card"><div class="cm-list">${KNOW.map(k => got.includes(k.id) ? `<div class="cm-li"><div class="main"><b>${esc(k.t)}</b><span>${esc(k.d)}</span></div></div>` : `<div class="cm-li dim"><div class="main"><b>？？？</b><span>還沒收集</span></div></div>`).join('')}</div></div>`;
}

// ---------- 好友週賽：每週一座球場、每人留最好的一場 ----------
export function weekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-W${String(Math.ceil(((t - y0) / 864e5 + 1) / 7)).padStart(2, '0')}`;
}
const WEEKLY = ['c_harbourtown', 'c_riviera', 'pebble', 'c_kapalua', 'standrews', 'c_tpcscottsdale', 'sawgrass', 'c_colonial', 'c_muirfieldvillage', 'kawana', 'c_portrush', 'c_pinehurst2'];
async function weekly(el, st) {
  const wk = weekKey(), course = WEEKLY[Number(wk.slice(-2)) % WEEKLY.length], ci = cinfo(course);
  el.innerHTML = `<div class="cm-card"><h3>好友週賽 · ${wk}</h3><p>本週球場：<b>${esc(ci.name)}</b>（黑梯，18 洞）。用你的生涯球員打一場，每人留最好的成績。週賽不影響生涯的比賽與排名，打完有經驗值。</p><button class="cm-btn green" id="wk-play" style="margin-top:10px">打本週的週賽</button></div><div class="cm-card"><h3>排行榜</h3><div id="wk-board" class="cm-empty">讀取中…</div></div>`;
  const draw = async () => {
    try { const list = await ui.ctx.call('cmWeekBoard', { week: wk }); document.getElementById('wk-board').outerHTML = `<table class="lb">${list.map((x, i) => `<tr class="${x.user === st.user ? 'me' : ''}"><td class="pos">${i + 1}</td><td>${esc(x.name)}<span class="ctry">${esc(x.user)}</span></td><td class="tp ${x.toPar < 0 ? 'u' : ''}">${toPar(x.toPar)}</td><td class="th">${x.strokes}</td></tr>`).join('') || '<tr><td>還沒有人打</td></tr>'}</table>`; }
    catch (e) { const b = document.getElementById('wk-board'); if (b) b.textContent = e.message; }
  };
  draw();
  document.getElementById('wk-play').onclick = async () => {
    const r = await playRound({ label: '好友週賽', cfg: { courseId: course, holeIdx: [...Array(18).keys()], tee: 'black', wind: 'normal', career: { weekly: wk } }, bcast: () => ({ pos: '週賽', score: 0, line: esc(ci.name) }) });
    const holes = Object.keys(r.scores).length;
    if (holes < 18) { toast('要打完 18 洞才算成績'); return go('more', 'weekly'); }
    const strokes = Object.values(r.scores).reduce((a, b) => a + b, 0);
    try { await ui.ctx.call('cmWeekSubmit', { week: wk, name: st.player.name, strokes, toPar: strokes - ci.par, course: ci.name }); } catch (e) { toast('成績上傳失敗：' + e.message); }
    const { addXp } = await import('../growth.js'); addXp(st.player, 120); localSave(st);
    toast(`週賽 ${strokes} 桿（${toPar(strokes - ci.par)}）`);
    go('more', 'weekly');
  };
}

// ---------- 系統選項 ----------
function opt(el, st) {
  const o = st.opt, s = st.status;
  const canPro = s.amateur && s.stage === 'college' && st.player.age >= 19;
  const canRetire = !s.amateur && st.player.age >= 38 && !st.retired;
  el.innerHTML = `<div class="cm-card"><h3>系統選項</h3>
    <div class="cm-field"><label>難度</label><div class="cm-seg">${Object.entries(DIFF).map(([k, v]) => `<button data-o="difficulty" data-v="${k}" class="${o.difficulty === k ? 'on' : ''}">${v.name}</button>`).join('')}</div></div>
    <div class="cm-field"><label>生涯長度</label><div class="cm-seg">${Object.entries(LENGTH).map(([k, v]) => `<button data-o="length" data-v="${k}" class="${o.length === k ? 'on' : ''}">${v.name}</button>`).join('')}</div></div>
    <div class="cm-field"><label>傷病</label><div class="cm-seg"><button data-o="injuries" data-v="1" class="${o.injuries ? 'on' : ''}">開啟</button><button data-o="injuries" data-v="0" class="${!o.injuries ? 'on' : ''}">關閉</button></div></div>
    <div class="cm-field"><label>現實練球也算數（在「實際下場」記一場現實成績，生涯多一次免費訓練，每現實週一次）</label><div class="cm-seg"><button data-o="realBonus" data-v="1" class="${o.realBonus ? 'on' : ''}">開啟</button><button data-o="realBonus" data-v="0" class="${!o.realBonus ? 'on' : ''}">關閉</button></div></div>
    <p class="cm-note">存檔：${st.syncErr ? '伺服器同步失敗（' + esc(st.syncErr) + '），會再試' : st.syncedRev === st.rev ? '已同步到伺服器' : '同步中…'}　版本 ${st.rev}</p></div>
    <div class="cm-card"><h3>人生的決定</h3><div class="cm-row wrap">
      ${canPro ? '<button class="cm-btn" id="op-pro">提早轉職業</button>' : ''}
      ${canRetire ? '<button class="cm-btn ghost" id="op-retire">安排退休</button>' : ''}
      <button class="cm-btn ghost" id="op-slots">換生涯欄位</button></div>
      <p class="cm-note" style="margin-top:8px">${canPro ? '大二以後拿到大賽邀請或贊助外卡時可以提早轉職業；轉職業後業餘的邀請失效。' : ''}${canRetire ? '38 歲以後隨時可以退休，退休前可以安排告別賽。' : ''}</p></div>`;
  el.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { const k = b.dataset.o, v = b.dataset.v; o[k] = k === 'injuries' || k === 'realBonus' ? v === '1' : v; localSave(st); go('more', 'opt'); });
  const pr = document.getElementById('op-pro');
  if (pr) pr.onclick = async () => { if (await confirm2('確定要提早轉職業？之後不能再打業餘賽，業餘大賽冠軍的名人賽邀請也會失效。', '轉職業')) { turnProCore(st, '提早轉職業'); localSave(st); sync(); go('home'); } };
  const rt = document.getElementById('op-retire');
  if (rt) rt.onclick = async () => { const { planRetire } = await import('../legacy.js'); planRetire(st); };
  document.getElementById('op-slots').onclick = () => { localSave(st); sync(true); setCur(null); go('slots'); };
}

// ---------- 管理員：所有測試員的生涯摘要 ----------
async function admin(el) {
  el.innerHTML = '<div class="cm-card"><h3>測試員的生涯</h3><div id="ad-list" class="cm-empty">讀取中…</div></div>';
  try {
    const list = await ui.ctx.call('cmAdminList');
    document.getElementById('ad-list').outerHTML = `<div class="cm-scroll-x"><table class="lb"><tr><th>帳號</th><th>球員</th><th>年齡</th><th>章節</th><th>等級</th><th>排名</th><th>冠軍</th></tr>${list.map(x => `<tr><td>${esc(x.user)}<span class="ctry">欄位 ${x.slot}</span></td><td>${esc(x.name)}</td><td class="th">${x.age}</td><td style="font-size:11px">${esc(CHAPTER_ZH[x.chapter] || x.chapter)}</td><td class="th">${x.level}</td><td class="th">${x.rank || '—'}</td><td class="th">${x.wins} / ${x.majors}</td></tr>`).join('')}</table></div>`;
  } catch (e) { document.getElementById('ad-list').textContent = e.message; }
}

// ---------- 紀錄頁的「生涯」分頁 ----------
export async function renderRecordsTab(ctx, el) {
  el.innerHTML = '<p class="small">讀取中…</p>';
  const { bind } = await import('../state.js');
  bind(ctx);
  const slots = await listSlots(ctx.session.user);
  const keys = Object.keys(slots);
  if (!keys.length) { el.innerHTML = '<div class="cm-card"><p>還沒有生涯。到大廳按「生涯模式」開始。</p></div>'; return; }
  const { localLoad } = await import('../state.js');
  let html = '';
  for (const k of keys) {
    const st = localLoad(ctx.session.user, Number(k));
    if (st) {
      html += careerCardHtml(st) + `<div class="cm-card"><h3>年表</h3><div class="cm-list">${st.timeline.slice(-12).reverse().map(t => `<div class="cm-li"><div class="main"><b class="num" style="display:inline;font-size:15px">${t.age} 歲</b>　${esc(t.text)}</div></div>`).join('')}</div></div>`;
      // 大廳的稱號與副標題
      ctx.setSetting('careerTitle.' + ctx.session.user, st.title || (st.tally.masters ? '綠夾克得主' : null));
      ctx.setSetting('careerSub.' + ctx.session.user, `${st.player.name} · ${st.player.age} 歲 · ${CHAPTER_ZH[st.chapter] || ''}`);
    } else {
      const x = slots[k];
      html += `<div class="cm-card"><h3>${esc(x.name)}<small>欄位 ${k}</small></h3><p>${x.age} 歲 · ${esc(CHAPTER_ZH[x.chapter] || '')} · ${x.wins || 0} 冠</p></div>`;
    }
  }
  el.innerHTML = `<div id="scr-career-mini" style="--aug:#0f5a33;--champ:#c9a85c;--champ2:#e7d29a;--pine:#1d3a2a;--mut:#6b6f66;--line:rgba(22,32,26,.12)">${html}</div>`;
}
