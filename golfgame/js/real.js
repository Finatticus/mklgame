// 實際下場紀錄：現實世界打的回合（球場、日期、區域、梯台、逐洞的標準桿 / 桿數 / 推桿 / 開球球桿 / 開球落點 / 沙坑 / 罰桿），
// 存在伺服器「實際下場」工作頁（本機模式存在手機裡）。看紀錄時是一張計分卡 + 這一場的統計；清單上方是所有紀錄的總覽與估算差點指數
import { call, peek, refresh, setCache } from './api.js';
import { COURSES } from './courses.js';
import { escapeHtml, fmtToPar } from './util.js';

const $ = id => document.getElementById(id);
export const REAL_CLUBS = ['Driver', '3W', '5W', '1Hy', '2Hy', '3i', '4i', '5i', '6i', '7i', '8i', '9i', '10i', 'Pw', 'Gw', 'Sw', 'Lw'];
const TEES = ['黑梯', '藍梯', '白梯', '紅梯', '金梯'];
const FW = { L: '←', C: '●', R: '→' };
const FW_NAME = { L: '偏左', C: '球道中間', R: '偏右' };
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const blankHole = () => ({ par: 4, s: 0, p: 0, club: '', fw: '', sand: 0, pen: 0 });

let deps = null, list = [], draft = null, cur = 0, viewing = null;
export function initReal(d) {
  deps = d;
  $('rl-back').onclick = () => { if (draft && !confirm('還沒儲存，確定要離開嗎？')) return; draft = null; deps.back(); };
  $('rl-save').onclick = saveDraft;
}

// ---------------- 統計 ----------------
const filled = rec => rec.h.slice(0, rec.holes).filter(h => h.s > 0);
export function realStats(rec) {
  const H = filled(rec), n = H.length, sum = f => H.reduce((a, h) => a + f(h), 0);
  const strokes = sum(h => h.s), par = sum(h => h.par), putts = sum(h => h.p);
  const fwHoles = H.filter(h => h.par >= 4 && h.fw), fwHit = fwHoles.filter(h => h.fw === 'C').length;
  const gir = H.filter(h => h.s - h.p <= h.par - 2).length;
  const missGir = H.filter(h => h.s - h.p > h.par - 2), scr = missGir.filter(h => h.s <= h.par).length;
  const sandH = H.filter(h => h.sand > 0), sandSave = sandH.filter(h => h.s <= h.par).length;
  const dist = { eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0 };
  for (const h of H) { const d = h.s - h.par; dist[d <= -2 ? 'eagle' : d === -1 ? 'birdie' : d === 0 ? 'par' : d === 1 ? 'bogey' : 'double']++; }
  const byPar = k => { const l = H.filter(h => h.par === k); return l.length ? l.reduce((a, h) => a + h.s, 0) / l.length : null; };
  const clubs = {}; for (const h of H) if (h.club) clubs[h.club] = (clubs[h.club] || 0) + 1;
  const side = { L: 0, C: 0, R: 0 }; for (const h of fwHoles) side[h.fw]++;
  // 差點（本場的差點分數 Score Differential）：(總桿 − 球場難度) × 113 ÷ 斜度；沒填難度就用標準桿、斜度 113。9 洞的乘 2 換成 18 洞
  const full = n === rec.holes;
  const rating = Number(rec.rating) || par, slope = Number(rec.slope) || 113;
  const diff = full && n ? (strokes - rating) * 113 / slope * (rec.holes === 9 && !Number(rec.rating) ? 2 : 1) : null;
  return {
    n, strokes, par, toPar: strokes - par, putts, avgPutts: n ? putts / n : 0, fwHit, fwN: fwHoles.length, gir, scr, scrN: missGir.length,
    sandN: sandH.length, sandSave, sandShots: sum(h => h.sand), pen: sum(h => h.pen), one: H.filter(h => h.p === 1).length, three: H.filter(h => h.p >= 3).length,
    dist, p3: byPar(3), p4: byPar(4), p5: byPar(5), clubs, side, diff, full,
  };
}
// 差點指數（估）：最近 20 場完整回合的差點分數，依 WHS 的場數對照取最好的幾場平均
export function handicapIndex(recs) {
  const d = recs.map(r => realStats(r)).filter(s => s.full && s.diff != null).slice(0, 20).map(s => s.diff).sort((a, b) => a - b);
  const n = d.length;
  if (n < 3) return null;
  const [k, adj] = n <= 3 ? [1, -2] : n === 4 ? [1, -1] : n === 5 ? [1, 0] : n === 6 ? [2, -1] : n <= 8 ? [2, 0] : n <= 11 ? [3, 0] : n <= 14 ? [4, 0] : n <= 16 ? [5, 0] : n <= 18 ? [6, 0] : n === 19 ? [7, 0] : [8, 0];
  return Math.max(-10, Math.min(54, d.slice(0, k).reduce((a, b) => a + b, 0) / k + adj));
}
const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '—';
const f1 = v => v == null ? '—' : v.toFixed(1);

// ---------------- 紀錄分頁（清單）----------------
// 先畫上次讀到的清單，背景向伺服器要新的；回來了而且還停在這個分頁才重畫
export async function renderRealTab(el, stillHere = () => true) {
  const old = peek('realList');
  if (old) drawTab(el, old); else el.innerHTML = '<p class="small">讀取中…</p>';
  try {
    const fresh = await refresh('realList');
    if (stillHere()) drawTab(el, fresh);
  } catch (e) { if (!old) el.innerHTML = `<p class="err">${escapeHtml(e.message)}</p>`; }
}
// 存檔 / 刪除後直接改快取裡的清單（不用再等伺服器）
const sortList = l => l.sort((x, y) => String(y.date).localeCompare(String(x.date)) || String(y.updated).localeCompare(String(x.updated)));
function patchCache(rec, del) {
  const l = (peek('realList') || []).filter(r => r.id !== rec.id);
  if (!del) l.push(rec);
  setCache('realList', sortList(l));
}
function drawTab(el, data) {
  list = data;
  const full18 = list.map(r => [r, realStats(r)]).filter(([r, s]) => s.full && r.holes === 18);
  const avg = full18.length ? full18.reduce((a, [, s]) => a + s.strokes, 0) / full18.length : null;
  const best = full18.length ? Math.min(...full18.map(([, s]) => s.strokes)) : null;
  const hi = handicapIndex(list);
  el.innerHTML = `<div class="rl-sum">
      <div><small>下場次數</small><b class="num">${list.length}</b></div>
      <div><small>18 洞平均</small><b class="num">${avg ? avg.toFixed(1) : '—'}</b></div>
      <div><small>最佳 18 洞</small><b class="num">${best ?? '—'}</b></div>
      <div><small>差點指數（估）</small><b class="num">${hi == null ? '—' : hi.toFixed(1)}</b></div>
    </div>
    <p class="small rl-note">差點指數依 WHS 規則，用最近 20 場完整回合裡最好的幾場估算（至少 3 場）；填上球場難度與斜度會更準。</p>
    <button id="rl-new" class="btn brass rl-newbtn">新增下場紀錄</button>
    <div class="rl-list">${list.length ? list.map(r => { const s = realStats(r); return `
      <button class="rl-row" data-id="${escapeHtml(r.id)}">
        <span class="rl-date"><b class="num">${escapeHtml(String(r.date || '').slice(5).replace('-', '/'))}</b><small class="num">${escapeHtml(String(r.date || '').slice(0, 4))}</small></span>
        <span class="rl-t"><b>${escapeHtml(r.course || '未命名球場')}</b><small>${[r.area, r.tee, `${s.n}/${r.holes} 洞`].filter(Boolean).map(escapeHtml).join(' · ')}</small>
          <small class="rl-mini">球道 ${pct(s.fwHit, s.fwN)} · GIR ${pct(s.gir, s.n)} · 推桿 ${s.putts}</small></span>
        <span class="rl-score"><b class="num">${s.strokes || '—'}</b><small class="num ${s.toPar < 0 ? 'under' : ''}">${s.n ? fmtToPar(s.toPar) : ''}</small></span>
      </button>`; }).join('') : '<p class="small rl-empty">還沒有實際下場紀錄。打完球回來，把這一場記下來吧。</p>'}</div>`;
  $('rl-new').onclick = () => openEditor(null);
  el.querySelectorAll('[data-id]').forEach(b => b.onclick = () => openView(list.find(r => r.id === b.dataset.id)));
}

// ---------------- 編輯 ----------------
function openEditor(rec) {
  viewing = null;
  draft = rec ? JSON.parse(JSON.stringify(rec)) : { course: '', date: today(), area: '', holes: 18, tee: '白梯', rating: '', slope: '', partners: '', note: '', h: Array.from({ length: 18 }, blankHole) };
  while (draft.h.length < 18) draft.h.push(blankHole());
  cur = 0;
  $('rl-title').textContent = rec ? '編輯下場紀錄' : '新增下場紀錄';
  $('rl-savebar').classList.remove('hidden');
  deps.show('scr-real');
  renderEditor();
}

function renderEditor() {
  const D = draft;
  const names = [...new Set(COURSES.filter(c => c.real).map(c => c.name))];
  $('rl-body').innerHTML = `
    <section class="rl-card"><h5>基本資料</h5>
      <div class="rl-form">
        <label class="rl-wide">球場名稱<input id="rf-course" list="rf-courses" value="${escapeHtml(D.course)}" placeholder="例：東方高爾夫" maxlength="40"></label>
        <datalist id="rf-courses">${names.map(n => `<option value="${escapeHtml(n)}">`).join('')}</datalist>
        <label>擊打日期<input id="rf-date" type="date" value="${escapeHtml(D.date)}"></label>
        <label>擊打區域<input id="rf-area" value="${escapeHtml(D.area)}" placeholder="例：東區＋西區" maxlength="30"></label>
        <div class="rl-field"><span>擊打洞數</span><div class="seg rl-seg" id="rf-holes">${[9, 18].map(n => `<button data-v="${n}" class="${D.holes === n ? 'on' : ''}">${n} 洞</button>`).join('')}</div></div>
        <div class="rl-field rl-wide"><span>梯台</span><div class="seg rl-seg" id="rf-tee">${TEES.map(t => `<button data-v="${t}" class="${D.tee === t ? 'on' : ''}">${t}</button>`).join('')}</div></div>
        <label>球場難度 <i>Course Rating（選填）</i><input id="rf-rating" type="number" step="0.1" inputmode="decimal" value="${escapeHtml(String(D.rating ?? ''))}" placeholder="例：72.4"></label>
        <label>斜度 <i>Slope（選填）</i><input id="rf-slope" type="number" inputmode="numeric" value="${escapeHtml(String(D.slope ?? ''))}" placeholder="例：128"></label>
        <label class="rl-wide">同組球友<input id="rf-partners" value="${escapeHtml(D.partners || '')}" placeholder="選填" maxlength="60"></label>
        <label class="rl-wide">備註<textarea id="rf-note" rows="2" maxlength="300" placeholder="天氣、果嶺狀況、心得…">${escapeHtml(D.note || '')}</textarea></label>
      </div>
    </section>
    <section class="rl-card"><h5>逐洞紀錄</h5>
      <div class="rl-strip" id="rl-strip"></div>
      <div id="rl-hole"></div>
    </section>`;
  const bind = (id, k, num) => { $(id).oninput = e => { D[k] = num ? e.target.value : e.target.value; }; };
  bind('rf-course', 'course'); bind('rf-date', 'date'); bind('rf-area', 'area'); bind('rf-rating', 'rating', 1); bind('rf-slope', 'slope', 1); bind('rf-partners', 'partners'); bind('rf-note', 'note');
  $('rf-holes').querySelectorAll('button').forEach(b => b.onclick = () => { D.holes = Number(b.dataset.v); if (cur >= D.holes) cur = 0; renderEditor(); });
  $('rf-tee').querySelectorAll('button').forEach(b => b.onclick = () => { D.tee = b.dataset.v; $('rf-tee').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); });
  renderStrip(); renderHole();
}

function renderStrip() {
  $('rl-strip').innerHTML = draft.h.slice(0, draft.holes).map((h, i) => {
    const d = h.s ? h.s - h.par : null;
    const cls = d == null ? '' : d <= -1 ? 'under' : d === 0 ? 'par' : d === 1 ? 'bogey' : 'double';
    return `<button class="${i === cur ? 'on' : ''} ${cls}" data-i="${i}"><small>${i + 1}</small><b class="num">${h.s || '·'}</b></button>`;
  }).join('');
  $('rl-strip').querySelectorAll('[data-i]').forEach(b => b.onclick = () => { cur = Number(b.dataset.i); renderStrip(); renderHole(); });
  // 目前這一洞捲到洞號列中間（只左右捲，不動整頁）
  const st = $('rl-strip'), on = st.querySelector('.on'); if (on) st.scrollLeft = on.offsetLeft - st.offsetLeft - st.clientWidth / 2 + on.offsetWidth / 2;
}

// 一洞一張卡：第一次看到這一洞就先填「標準桿、兩推」，再照實際改
function renderHole() {
  const h = draft.h[cur];
  if (!h.s) { h.s = h.par; h.p = 2; if (!h.club) h.club = h.par === 3 ? '' : 'Driver'; }
  const d = h.s - h.par, word = d <= -3 ? '信天翁' : d === -2 ? '老鷹' : d === -1 ? '小鳥' : d === 0 ? '標準桿' : d === 1 ? '柏忌' : d === 2 ? '雙柏忌' : `+${d}`;
  const step = (k, lab, min, max, sub = '') => `<div class="rl-step"><span>${lab}${sub ? `<i>${sub}</i>` : ''}</span><div><button data-k="${k}" data-d="-1" ${h[k] <= min ? 'disabled' : ''}>−</button><b class="num">${h[k]}</b><button data-k="${k}" data-d="1" ${h[k] >= max ? 'disabled' : ''}>＋</button></div></div>`;
  $('rl-hole').innerHTML = `
    <div class="rl-hhead"><div><small>HOLE</small><b class="num">${cur + 1}</b></div>
      <div class="seg rl-par">${[3, 4, 5].map(p => `<button data-par="${p}" class="${h.par === p ? 'on' : ''}">PAR ${p}</button>`).join('')}</div></div>
    ${step('s', '桿數', 1, 15, word)}
    ${step('p', '推桿', 0, 8)}
    <div class="rl-sub"><span>開球球桿</span><div class="rl-clubs">${REAL_CLUBS.map(c => `<button data-club="${c}" class="${h.club === c ? 'on' : ''}">${c}</button>`).join('')}</div></div>
    ${h.par >= 4 ? `<div class="rl-sub"><span>開球落點</span><div class="rl-fw">${['L', 'C', 'R'].map(k => `<button data-fw="${k}" class="${h.fw === k ? 'on' : ''} fw-${k}"><b>${FW[k]}</b><small>${FW_NAME[k]}</small></button>`).join('')}</div></div>` : '<p class="small rl-p3">三桿洞不計球道命中</p>'}
    ${step('sand', '沙坑', 0, 8, '在沙坑裡打了幾桿')}
    ${step('pen', '罰桿', 0, 8, '桿數裡有幾桿是罰桿')}
    <div class="rl-nav"><button class="btn ghost-dark" id="rl-prev" ${cur === 0 ? 'disabled' : ''}>‹ 上一洞</button><button class="btn brass" id="rl-next">${cur === draft.holes - 1 ? '完成，儲存紀錄' : '下一洞 ›'}</button></div>`;
  const hl = $('rl-hole');
  hl.querySelectorAll('[data-par]').forEach(b => b.onclick = () => { const np = Number(b.dataset.par); if (h.s === h.par) h.s = np; h.par = np; if (np === 3) { h.fw = ''; if (h.club === 'Driver') h.club = ''; } renderStrip(); renderHole(); });
  hl.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { const k = b.dataset.k; h[k] = Math.max(0, h[k] + Number(b.dataset.d)); if (k === 's') h.p = Math.min(h.p, h.s); if (k === 'p' && h.p > h.s) h.s = h.p; renderStrip(); renderHole(); });
  hl.querySelectorAll('[data-club]').forEach(b => b.onclick = () => { h.club = h.club === b.dataset.club ? '' : b.dataset.club; renderHole(); });
  hl.querySelectorAll('[data-fw]').forEach(b => b.onclick = () => { h.fw = h.fw === b.dataset.fw ? '' : b.dataset.fw; renderHole(); });
  $('rl-prev').onclick = () => { cur--; renderStrip(); renderHole(); };
  $('rl-next').onclick = () => { if (cur === draft.holes - 1) return saveDraft(); cur++; renderStrip(); renderHole(); $('rl-hole').scrollIntoView({ block: 'nearest' }); };
}

async function saveDraft() {
  const D = draft;
  if (!D) return;
  if (!D.course.trim()) { alert('請填寫球場名稱'); $('rf-course')?.focus(); return; }
  if (!D.date) { alert('請填寫擊打日期'); return; }
  const H = D.h.slice(0, D.holes);
  for (let i = 0; i < H.length; i++) { const h = H[i]; if (h.s && h.sand + h.pen + h.p > h.s) { alert(`第 ${i + 1} 洞：推桿、沙坑、罰桿加起來比桿數還多`); cur = i; renderStrip(); renderHole(); return; } }
  if (!H.some(h => h.s)) { alert('至少要記一洞'); return; }
  const missing = H.filter(h => !h.s).length;
  if (missing && !confirm(`還有 ${missing} 洞沒有記錄，要先儲存嗎？（沒記的洞不算進統計，差點要整場都記才會算）`)) return;
  const rec = { ...D, course: D.course.trim(), h: D.h.slice(0, D.holes), rating: D.rating === '' ? '' : Number(D.rating), slope: D.slope === '' ? '' : Number(D.slope) };
  $('rl-save').disabled = true;
  try {
    const saved = await call('realSave', { rec });
    patchCache(saved);
    draft = null;
    openView(saved);
  } catch (e) { alert(e.message); } finally { $('rl-save').disabled = false; }
}

// ---------------- 計分卡 + 統計 ----------------
function scoreMark(s, par) {
  if (!s) return '<span class="sc-n">·</span>';
  const d = s - par, cls = d <= -2 ? 'eagle' : d === -1 ? 'birdie' : d === 1 ? 'bogey' : d >= 2 ? 'double' : 'par';
  return `<span class="sc-n ${cls}">${s}</span>`;
}
function cardHtml(rec) {
  const H = rec.h.slice(0, rec.holes);
  const blocks = rec.holes === 18 ? [[0, 9, 'OUT'], [9, 18, 'IN']] : [[0, 9, 'OUT']];
  const tot = (a, b, f) => H.slice(a, b).reduce((x, h) => x + (h.s ? f(h) : 0), 0);
  const rows = (a, b, label) => {
    const hs = H.slice(a, b), cell = f => hs.map((h, i) => `<td>${f(h, a + i)}</td>`).join('');
    return `<table class="sc-tbl"><tbody>
      <tr class="sc-hole"><th>HOLE</th>${cell((h, i) => i + 1)}<th>${label}</th></tr>
      <tr class="sc-par"><th>PAR</th>${cell(h => h.par)}<th>${hs.reduce((x, h) => x + h.par, 0)}</th></tr>
      <tr class="sc-score"><th>SCORE</th>${cell(h => scoreMark(h.s, h.par))}<th class="num">${tot(a, b, h => h.s) || ''}</th></tr>
      <tr><th>PUTT</th>${cell(h => h.s ? h.p : '')}<th>${tot(a, b, h => h.p) || ''}</th></tr>
      <tr class="sc-fw"><th>FW</th>${cell(h => h.par >= 4 && h.fw ? `<span class="fw-${h.fw}">${FW[h.fw]}</span>` : h.par === 3 ? '<span class="sc-dim">—</span>' : '')}<th>${hs.filter(h => h.par >= 4 && h.fw === 'C').length}/${hs.filter(h => h.par >= 4 && h.fw).length}</th></tr>
      <tr><th>SAND</th>${cell(h => h.sand || '')}<th>${tot(a, b, h => h.sand) || ''}</th></tr>
      <tr><th>PEN</th>${cell(h => h.pen ? `<span class="sc-pen">${h.pen}</span>` : '')}<th>${tot(a, b, h => h.pen) || ''}</th></tr>
      <tr class="sc-club"><th>TEE</th>${cell(h => escapeHtml(h.club === 'Driver' ? 'DR' : h.club || ''))}<th></th></tr>
    </tbody></table>`;
  };
  return blocks.map(([a, b, l]) => rows(a, b, l)).join('');
}

function openView(rec) {
  viewing = rec; draft = null;
  const s = realStats(rec);
  $('rl-title').textContent = '下場紀錄';
  $('rl-savebar').classList.add('hidden');
  deps.show('scr-real');
  const dLabel = s.diff == null ? '—' : s.diff.toFixed(1);
  const bar = (o, keys, names, cls) => { const t = keys.reduce((a, k) => a + o[k], 0) || 1; return `<div class="rl-bar">${keys.map(k => o[k] ? `<i class="${cls}-${k}" style="flex:${o[k]}"><b class="num">${o[k]}</b></i>` : '').join('')}</div><div class="rl-legend">${keys.map((k, i) => `<span><em class="${cls}-${k}"></em>${names[i]} ${Math.round(o[k] / t * 100)}%</span>`).join('')}</div>`; };
  const clubs = Object.entries(s.clubs).sort((a, b) => b[1] - a[1]);
  $('rl-body').innerHTML = `
    <article class="sc-card">
      <header class="sc-head">
        <div class="sc-title"><small>SCORECARD · ${escapeHtml(rec.date || '')}</small><h3>${escapeHtml(rec.course)}</h3>
          <p>${[rec.area, rec.tee, `${rec.holes} 洞`, rec.partners ? '同組：' + rec.partners : ''].filter(Boolean).map(escapeHtml).join(' · ')}</p></div>
        <div class="sc-total"><b class="num">${s.strokes}</b><span class="num ${s.toPar < 0 ? 'under' : ''}">${s.n ? fmtToPar(s.toPar) : ''}</span><small>${s.full ? 'TOTAL' : `已記 ${s.n} 洞`}</small></div>
      </header>
      <div class="sc-scroll">${cardHtml(rec)}</div>
      <footer class="sc-legend"><span><i class="sc-n eagle">3</i>老鷹</span><span><i class="sc-n birdie">3</i>小鳥</span><span><i class="sc-n bogey">5</i>柏忌</span><span><i class="sc-n double">6</i>雙柏忌以上</span><span><b class="fw-L">←</b><b class="fw-C">●</b><b class="fw-R">→</b>開球落點</span></footer>
    </article>
    <section class="rl-stats">
      <div class="st-tile big"><small>總桿數</small><b class="num">${s.strokes}</b><span>標準桿 ${s.par} · ${s.n ? fmtToPar(s.toPar) : '—'}</span></div>
      <div class="st-tile big"><small>差點（本場）</small><b class="num">${dLabel}</b><span>${rec.rating ? `難度 ${rec.rating} / 斜度 ${rec.slope || 113}` : '未填難度，以標準桿計算'}</span></div>
      <div class="st-tile"><small>球道命中率</small><b class="num">${pct(s.fwHit, s.fwN)}</b><span>${s.fwHit} / ${s.fwN} 洞</span></div>
      <div class="st-tile"><small>GIR 標準桿上果嶺</small><b class="num">${pct(s.gir, s.n)}</b><span>${s.gir} / ${s.n} 洞</span></div>
      <div class="st-tile"><small>平均推桿</small><b class="num">${s.n ? s.avgPutts.toFixed(2) : '—'}</b><span>總推桿 ${s.putts}</span></div>
      <div class="st-tile"><small>一推 / 三推</small><b class="num">${s.one} / ${s.three}</b><span>洞數</span></div>
      <div class="st-tile"><small>救球率</small><b class="num">${pct(s.scr, s.scrN)}</b><span>沒上果嶺仍保住標準桿</span></div>
      <div class="st-tile"><small>沙坑救球</small><b class="num">${pct(s.sandSave, s.sandN)}</b><span>沙坑 ${s.sandShots} 桿</span></div>
      <div class="st-tile"><small>罰桿</small><b class="num">${s.pen}</b><span>整場</span></div>
      <div class="st-tile"><small>PAR 3 / 4 / 5 平均</small><b class="num rl-pars">${f1(s.p3)} / ${f1(s.p4)} / ${f1(s.p5)}</b><span>每洞平均桿數</span></div>
    </section>
    <section class="rl-card"><h5>成績分布</h5>${bar(s.dist, ['eagle', 'birdie', 'par', 'bogey', 'double'], ['老鷹以下', '小鳥', '標準桿', '柏忌', '雙柏忌以上'], 'ds')}</section>
    <section class="rl-card"><h5>開球落點</h5>${s.fwN ? bar(s.side, ['L', 'C', 'R'], ['偏左', '球道中間', '偏右'], 'sd') : '<p class="small">沒有記錄開球落點</p>'}</section>
    <section class="rl-card"><h5>開球用桿</h5>${clubs.length ? `<div class="rl-clubstat">${clubs.map(([c, n]) => `<span><b>${escapeHtml(c)}</b><i class="num">× ${n}</i></span>`).join('')}</div>` : '<p class="small">沒有記錄開球球桿</p>'}</section>
    ${rec.note ? `<section class="rl-card"><h5>備註</h5><p class="rl-notep">${escapeHtml(rec.note)}</p></section>` : ''}
    <div class="rl-actions"><button class="btn brass" id="rl-edit">編輯</button><button class="btn ghost-dark" id="rl-del">刪除</button></div>`;
  $('rl-edit').onclick = () => openEditor(rec);
  $('rl-del').onclick = async () => {
    if (!confirm(`刪除「${rec.course}」${rec.date} 的紀錄？刪除後無法復原。`)) return;
    try { await call('realDelete', { id: rec.id }); patchCache(rec, true); viewing = null; deps.back(); } catch (e) { alert(e.message); }
  };
}
