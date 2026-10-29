// 獎盃：2D 的獎盃櫃（快速看）＋可以走進去的 3D 獎盃室；名人賽的綠夾克頒獎（Butler Cabin）
import { register, go, story, dialog } from './shell.js';
import { cur, localSave } from '../state.js';
import { esc, money, toPar } from '../util.js';
import { ROOM_LEVELS } from '../data/items.js';
import { addTimeline, queueMain } from '../life.js';
import { text } from '../story.js';
import { findP, nameOf, histName } from '../world.js';
import { slamStatus, slamText, SLAM_RECORD } from '../slam.js';
import { collectionHtml, auctionHtml, bindCollection } from '../extras.js';
import { MAJORS, MAJOR_ZH } from '../data/calendar.js';

// 獎盃的小圖（SVG，依種類）
export function trophySvg(t) {
  const k = t.kind || 'silver', G = '#d7b45a', S = '#c9ced6', D = '#6b6f75';
  const cup = (c, h = 1) => `<path d="M18 ${14 * h} h28 v6 q0 18 -14 22 q-14 -4 -14 -22z" fill="${c}"/><path d="M18 ${16 * h} q-8 2 -6 10 q2 6 8 6" fill="none" stroke="${c}" stroke-width="2.5"/><path d="M46 ${16 * h} q8 2 6 10 q-2 6 -8 6" fill="none" stroke="${c}" stroke-width="2.5"/><rect x="29" y="42" width="6" height="8" fill="${c}"/><rect x="22" y="50" width="20" height="6" rx="1" fill="#3a2a1a"/>`;
  const body = {
    jacket: `<path d="M20 10 l12 6 l12 -6 l10 8 l-4 36 h-36 l-4 -36z" fill="#1d6b3a"/><path d="M32 16 l-6 22 M32 16 l6 22" stroke="#0f4024" stroke-width="2"/><circle cx="38" cy="26" r="3" fill="${G}"/><circle cx="33" cy="34" r="1.4" fill="${G}"/><circle cx="33" cy="40" r="1.4" fill="${G}"/>`,
    jug: `<path d="M26 8 h12 l-1 6 q12 6 10 24 q-2 12 -15 14 q-13 -2 -15 -14 q-2 -18 10 -24z" fill="${S}"/><path d="M45 20 q10 2 8 14 q-2 6 -8 6" fill="none" stroke="${S}" stroke-width="3"/><rect x="22" y="52" width="20" height="5" rx="1" fill="#3a2a1a"/>`,
    wanamaker: `${cup(S)}<rect x="24" y="8" width="16" height="6" rx="2" fill="${S}"/>`,
    usopen: `${cup(S)}<rect x="27" y="6" width="10" height="8" rx="2" fill="${S}"/>`,
    players: `<path d="M32 8 l12 30 h-24z" fill="#b8d8e8" opacity=".9"/><rect x="22" y="40" width="20" height="14" fill="#3a2a1a"/>`,
    fedex: `<rect x="22" y="10" width="20" height="32" rx="3" fill="${S}"/><rect x="18" y="44" width="28" height="10" rx="2" fill="#3a2a1a"/>`,
    teamcup: cup(G),
    medal: `<circle cx="32" cy="34" r="14" fill="${G}" stroke="#8a6a1a" stroke-width="2"/><path d="M24 8 l8 14 l8 -14" fill="none" stroke="#a3302a" stroke-width="5"/>`,
    kidcup: cup(G, 1.1),
    amcup: cup(S),
    silver: cup(S),
    plate: `<ellipse cx="32" cy="30" rx="20" ry="20" fill="${S}" stroke="${D}" stroke-width="2"/><ellipse cx="32" cy="30" rx="13" ry="13" fill="none" stroke="${D}"/><rect x="24" y="50" width="16" height="6" fill="#3a2a1a"/>`,
  }[k] || cup(S);
  return `<svg viewBox="0 0 64 64" aria-hidden="true">${body}</svg>`;
}

register('trophy', body => {
  const st = cur(); if (!st) return go('slots');
  const room = ROOM_LEVELS[st.room || 0], list = st.trophies.slice().reverse();
  const shown = list.slice(0, room.slots);
  const jackets = st.trophies.filter(t => t.kind === 'jacket');
  body.innerHTML = slamHtml(st) + `<div class="cm-card"><h3>${esc(room.name)}<small>${st.trophies.length} 座獎盃 · 可以展示 ${room.slots} 座 · 收藏 ${(st.collection || []).length} 件</small></h3>
      <div class="cm-row wrap"><button class="cm-btn green" id="tr-3d">走進獎盃室（3D）</button>${(st.room || 0) < ROOM_LEVELS.length - 1 ? `<span class="cm-note">升級（財務 → 資產）：${esc(ROOM_LEVELS[(st.room || 0) + 1].name)} ${money(ROOM_LEVELS[(st.room || 0) + 1].price, { short: true })}</span>` : ''}</div>
      ${jackets.length ? `<p style="margin-top:10px;color:var(--aug);font-weight:700">冠軍更衣櫃：綠夾克 ${jackets.map(j => j.y).join('、')}</p>` : ''}</div>
    <div class="cm-card"><h4 style="margin:0 0 4px;font-size:14px">獎盃櫃<small style="font-weight:400;color:var(--ink3,#888);margin-left:6px">3D 房間的後半部</small></h4>${shown.length ? `<div class="cm-trophy">${shown.map((t, i) => `<div data-i="${i}">${trophySvg(t)}<b>${esc(t.name)}</b>${t.y}</div>`).join('')}</div>` : '<div class="cm-empty">還沒有獎盃。第一座兒童盃會放在童年書桌上。</div>'}
      ${list.length > room.slots ? `<p class="cm-note" style="margin-top:8px">還有 ${list.length - room.slots} 座收在倉庫（升級獎盃室就能展示）</p>` : ''}
      ${collectionHtml(st)}</div>${auctionHtml(st)}`;
  bindCollection(st, body, () => go('trophy'));
  body.querySelectorAll('[data-i]').forEach(el => el.onclick = () => {
    const t = shown[Number(el.dataset.i)], r = st.results.find(x => x.y === t.y && x.id === t.id);
    dialog(`<div style="text-align:center">${trophySvg(t).replace('<svg', '<svg style="width:120px;height:120px"')}</div><p style="text-align:center"><b>${esc(t.name)}</b><br>${t.y} 年${t.course ? ' · ' + esc(t.course) : ''}${r && r.total ? `<br>${r.total} 桿（${toPar(r.toPar)}）` : ''}</p>`, { title: '獎盃' });
  });
  document.getElementById('tr-3d').onclick = async () => {
    const { openRoom } = await import('../trophy/room.js');
    openRoom(st);
  };
});

// ---------- 綠夾克（名人賽冠軍）----------
export async function greenJacket(st, E, rec) {
  const id = (st.world.hist.masters || {})[E.year - 1], prev = id === 'ME' ? '（你自己——衛冕成功，由主席為你穿上）' : (id && histName(st.world, id, st.player.name) !== '—' ? histName(st.world, id, st.player.name) : '上屆冠軍');
  st.story.prevChamp = prev;
  const years = E.year - st.player.birthYear - 8;
  await story({ small: 'BUTLER CABIN · MASTERS TOURNAMENT CHAMPION', title: '綠夾克', img: 'augusta-10.jpg', skip: false, paras: [
    `Butler Cabin 的燈光很暖。上屆冠軍 ${prev} 拿著那件綠色的夾克，等你把手臂伸進去。`,
    `72 洞 ${rec.total} 桿（${toPar(rec.toPar)}）· ${st.player.age} 歲。`,
    `從 8 歲的那個晚上，已經過了 ${years} 年。`, text(st, '你想起客廳的電視、{mentor}說的那句話：「那件衣服，全世界只有幾十個人穿過。」')] });
  await story({ small: 'PRACTICE GREEN', title: '練習果嶺上的頒獎', img: 'augusta-clubhouse.jpg', paras: ['夕陽下，觀眾圍在練習果嶺旁。主席宣布你的名字，全場起立鼓掌。', '冠軍可以把綠夾克帶回家一年，之後掛回會館的冠軍更衣室；你的獎盃室裡也有一個冠軍更衣櫃。', '從今以後，你終身擁有名人賽的參賽資格。'] });
  addTimeline(st, `名人賽冠軍：綠夾克（${E.year}）`);
  st.chapter = Math.max(st.chapter, 7);
  if (!st.story.done.green_jacket) { st.story.done.green_jacket = E.year; st.greenYear = E.year; st.playHours = st.playHours || 0; }
  st.story.defendYear = E.year + 1;      // 隔年名人賽週的週二：冠軍晚宴
  await careerReview(st);
  localSave(st);
}
// 生涯片尾：年表回顧
async function careerReview(st) {
  const lines = st.timeline.slice(-14).map(t => `${t.age} 歲　${t.text}`);
  await story({ small: 'CAREER REVIEW', title: '生涯回顧', img: 'masters-gallery.jpg', paras: lines, ok: '生涯繼續' });
}

// 大滿貫面板：四大賽各拿過幾次、哪幾年；生涯大滿貫、年度大滿貫、連續四大賽；和歷史紀錄比較
function slamHtml(st) {
  if (st.status.amateur && !(st.titles || []).some(t => MAJORS.includes(t.id))) return '';
  const s = slamStatus(st);
  const col = m => `<div class="cm-slam ${s.count[m] ? 'on' : ''}">${trophySvg({ kind: { masters: 'jacket', pgachamp: 'wanamaker', usopen: 'usopen', open: 'jug' }[m] })}<b>${MAJOR_ZH[m]}</b><span class="num">${s.count[m]}</span><small>${s.per[m].join('、') || '還沒拿過'}</small></div>`;
  const badges = [s.slams ? slamText(s.slams) + (s.firstSlamYear ? `（${s.firstSlamYear} 年完成）` : '') : `生涯大滿貫：${4 - s.missing.length} / 4`, s.years.length ? `年度大滿貫 ${s.years.join('、')}` : '', s.tiger ? `連續四大賽 ×${s.tiger}` : ''].filter(Boolean);
  return `<div class="cm-card"><h3>大滿貫<small>大賽冠軍 ${s.total} 座 · 歷史紀錄 ${SLAM_RECORD.majors} 座（${SLAM_RECORD.holder}）</small></h3>
    <div class="cm-slams">${MAJORS.map(col).join('')}</div>
    <div class="cm-chips" style="margin-top:8px">${badges.map(b => `<span>${esc(b)}</span>`).join('')}</div>
    <p class="cm-note" style="margin-top:6px">四大賽都拿過一次 = 生涯大滿貫；每座都拿過兩次 = 雙料大滿貫。同一年拿下四座 = 年度大滿貫；連續四場大賽都贏（可以跨年）= 連續四大賽。完成時會拿到「大滿貫紀念外套」。</p></div>`;
}
