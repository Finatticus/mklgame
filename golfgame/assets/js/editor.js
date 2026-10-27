// 球場編輯器（只有管理員）：畫球洞草稿、設定地形高低、放梯台 / 旗桿 / 樹，存成草稿；勾選 9 或 18 洞發布成自製球場；也可以修改現有球場的某一洞
//   畫面：scr-editor（草稿清單 / 已發布 / 修改現有球洞）、scr-edcanvas（畫圖）。手機：單指 = 目前的工具、雙指 = 移動 / 縮放
import { COURSES, loadCourseMaps } from './courses.js';
import { escapeHtml, clamp } from './util.js';
import {
  CLASS, TEE_IDS, TEE_NAME, PAR_GUIDE, TREE_KINDS, newDraft, rleEncode, rleDecode, hgEncode, hgDecode, routeOf, yardsFrom, teeYardsOf, suggestPar,
  checkDraft, checkPublish, store, refreshCustom, getRecord, saveDraft, deleteRecord, publish, mapToDraft, rowFor,
} from './custom.js';

const $ = id => document.getElementById(id);
let deps = null;

// 畫筆可以畫的地面（樹林 = 深草 + 種樹）
const BRUSHES = [
  { k: 'fair', cls: 2, name: '球道' }, { k: 'rough', cls: 1, name: '長草' }, { k: 'deep', cls: 8, name: '深草' }, { k: 'forest', cls: 8, forest: 1, name: '樹林' },
  { k: 'green', cls: 3, name: '果嶺' }, { k: 'fringe', cls: 9, name: '果嶺邊' }, { k: 'sand', cls: 5, name: '沙坑' }, { k: 'water', cls: 6, name: '水' },
  { k: 'path', cls: 7, name: '車道' }, { k: 'tee', cls: 4, name: '梯台區' }, { k: 'out', cls: 0, name: '界外' },
  { k: 'erase', name: '橡皮擦' },          // 擦掉 = 回到原本的樣子（新球洞是樹林；修改現有球洞是打開時的樣子）
];
const PLACES = [
  { k: 'black', name: '黑梯' }, { k: 'blue', name: '藍梯' }, { k: 'white', name: '白梯' }, { k: 'red', name: '紅梯' },
  { k: 'pin', name: '旗桿' }, { k: 'via', name: '轉折點' }, { k: 'tree', name: '單棵樹' }, { k: 'erase', name: '移除' },
];
const TERRAIN = [{ k: 'raise', name: '升高' }, { k: 'lower', name: '降低' }, { k: 'flat', name: '整平' }, { k: 'smooth', name: '平滑' }, { k: 'erase', name: '橡皮擦' }];
const TEE_COLOR = { black: '#1c1c1c', blue: '#2c4f8f', white: '#f4f1ea', red: '#a3302a' };

// ---------------- 編輯中的狀態 ----------------
const E = {
  D: null, g: null, f: null, hg: null, hgW: 0, hgH: 0, w: 0, h: 0, mpp: 0.6,
  tool: 'brush', brush: 'fair', brushMode: 'paint', treeKind: 'auto', size: 12, terrain: 'raise', strength: 0.4, place: 'black',
  view: { x: 0, y: 0, s: 1 }, undo: [], redo: [], bg: null, showHg: true, dirty: false,
  base: null, baseCtx: null, baseImg: null, hgCv: null,
};

// ---------------- 草稿清單 ----------------
const sel = [];         // 勾選要發布的草稿（順序 = 球洞順序）
export function initEditor(d) {
  deps = d;
  $('ad-editor').onclick = () => openEditorHome('drafts');
  $('ed-back').onclick = () => deps.back();
  $('ed-tabs').querySelectorAll('button').forEach(b => b.onclick = () => openEditorHome(b.dataset.t));
  $('ed-new').onclick = () => openCanvas(newDraft());
  $('ed-pub-go').onclick = doPublish;
  initCanvas();
}

// 從實景回來：畫面還在，重新量大小再畫
export function resumeCanvas() {
  deps.show('scr-edcanvas');
  requestAnimationFrame(() => {
    // 畫面大小可能變了（全螢幕、轉向）：球洞跑出畫面就重新放進來
    const r = $('ec-wrap').getBoundingClientRect(), v = E.view;
    if (!(v.x < r.width && v.y < r.height && v.x + E.w * v.s > 0 && v.y + E.h * v.s > 0)) fitView();
    render();
  });
}

export async function openEditorHome(tab = 'drafts') {
  deps.show('scr-editor');
  $('ed-tabs').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
  for (const t of ['drafts', 'courses', 'exist']) $('ed-p-' + t).classList.toggle('hidden', t !== tab);
  $('ed-pub').classList.toggle('hidden', tab !== 'drafts');
  const box = { drafts: 'ed-drafts', courses: 'ed-courses', exist: 'ed-ex-holes' }[tab];
  const draw = () => { if (tab === 'drafts') renderDrafts(); if (tab === 'courses') renderCourses(); if (tab === 'exist') renderExisting(); };
  // 先畫手上的資料，再跟伺服器同步一次（別的裝置可能存過草稿）
  if (store.loaded) draw(); else $(box).innerHTML = '<p class="small">讀取中…</p>';
  try { await refreshCustom(); } catch (e) { if (!store.loaded) { $(box).innerHTML = `<p class="err">${escapeHtml(e.message)}</p>`; return; } }
  if (!$('ed-p-' + tab).classList.contains('hidden')) draw();
}

function renderDrafts() {
  const list = store.drafts;
  $('ed-drafts').innerHTML = list.length ? list.map(d => {
    const m = d.meta || {}, y = m.yards || {}, i = sel.indexOf(d.id);
    return `<div class="ed-card ${i >= 0 ? 'on' : ''}" data-id="${d.id}">
      <button class="ed-pick" data-pick="${d.id}">${i >= 0 ? i + 1 : ''}</button>
      ${m.thumb ? `<img src="${m.thumb}" alt="">` : '<div class="ed-noimg"></div>'}
      <div class="ed-card-t"><b>${escapeHtml(d.name || '未命名')}</b><span>Par ${m.par || '-'} · ${y.black ? y.black + ' Y' : '尚未放梯台 / 旗桿'}</span>
        <em class="${m.ok ? 'ok' : 'bad'}">${m.ok ? '可以發布' : '還沒完成'}</em></div>
      <div class="ed-card-b"><button data-edit="${d.id}">編輯</button><button data-copy="${d.id}">複製</button><button data-del="${d.id}">刪除</button></div>
    </div>`;
  }).join('') : '<p class="small">還沒有草稿。按「畫一個新球洞」開始。</p>';
  $('ed-drafts').querySelectorAll('[data-pick]').forEach(b => b.onclick = () => {
    const id = b.dataset.pick, i = sel.indexOf(id);
    if (i >= 0) sel.splice(i, 1); else if (sel.length < 18) sel.push(id);
    renderDrafts();
  });
  $('ed-drafts').querySelectorAll('[data-edit]').forEach(b => b.onclick = () => loadAndEdit(b.dataset.edit));
  $('ed-drafts').querySelectorAll('[data-copy]').forEach(b => b.onclick = async () => {
    const r = await getRecord('draft', b.dataset.copy), D = { ...r.data, id: newDraft().id, name: (r.data.name || '未命名') + ' 複製' };
    try { await saveDraft(D); renderDrafts(); } catch (e) { alert(e.message); }
  });
  $('ed-drafts').querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if (!confirm('刪除這個草稿？')) return;
    try { await deleteRecord('draft', b.dataset.del); const i = sel.indexOf(b.dataset.del); if (i >= 0) sel.splice(i, 1); renderDrafts(); } catch (e) { alert(e.message); }
  });
  // 發布列
  const picked = sel.map(id => list.find(d => d.id === id)).filter(Boolean);
  const pc = checkPublish(picked.map(d => ({ par: (d.meta || {}).par })));
  const notOk = picked.filter(d => !(d.meta || {}).ok).length;
  $('ed-pub-info').innerHTML = `已選 <b>${picked.length}</b> 洞 · Par 3：${pc.counts[3] || 0} · Par 4：${pc.counts[4] || 0} · Par 5：${pc.counts[5] || 0} · 標準桿 ${pc.par}` +
    (picked.length ? `<br><span class="${pc.errs.length || notOk ? 'bad' : 'ok'}">${pc.errs.length ? pc.errs.join('、') : notOk ? `有 ${notOk} 洞還沒完成` : '可以發布'}</span>` : '');
  $('ed-pub-go').disabled = !!(pc.errs.length || notOk || !picked.length);
}

async function doPublish() {
  const name = $('ed-pub-name').value.trim();
  if (!name) { alert('請輸入球場名稱'); return; }
  $('ed-pub-go').disabled = true;
  try { const c = await publish(name, sel.slice()); sel.length = 0; $('ed-pub-name').value = ''; alert(`已發布「${c.name}」，球場選單的「自製球場」分頁就看得到。`); openEditorHome('courses'); }
  catch (e) { alert(e.message); renderDrafts(); }
}

function renderCourses() {
  $('ed-courses').innerHTML = store.courses.length ? store.courses.map(c => `
    <div class="ed-row"><div><b>${escapeHtml(c.name)}</b><span>${c.meta.n} 洞 · 標準桿 ${c.meta.par} · ${new Date(c.updated).toLocaleDateString()}</span></div>
      <button data-unpub="${c.id}">取消發布</button></div>`).join('') : '<p class="small">還沒有發布的自製球場。</p>';
  $('ed-courses').querySelectorAll('[data-unpub]').forEach(b => b.onclick = async () => {
    if (!confirm('取消發布？玩家就打不到這座球場了（草稿還在）。')) return;
    try { await deleteRecord('course', b.dataset.unpub); renderCourses(); } catch (e) { alert(e.message); }
  });
}

function renderExisting() {
  const list = COURSES.filter(c => c.mapsUrl);
  const cur = $('ed-ex-course').value || list[0].id;
  $('ed-ex-course').innerHTML = list.map(c => `<option value="${c.id}" ${c.id === cur ? 'selected' : ''}>${escapeHtml(c.name)}${c.area ? '（' + escapeHtml(c.area) + '）' : ''}</option>`).join('');
  $('ed-ex-course').onchange = renderExisting;
  const c = list.find(x => x.id === cur);
  const n = c.nines ? c.nines.length * 9 : 18, order = c.nines ? (c.mapsOrder || c.nines.map(x => x.id)) : null;
  const label = i => c.nines ? `${c.nines.find(x => x.id === order[Math.floor(i / 9)]).name} ${i % 9 + 1}` : `第 ${i + 1} 洞`;
  $('ed-ex-holes').innerHTML = [...Array(n).keys()].map(i => {
    const row = rowFor(c, i), mod = store.overrides.some(o => o.id === `${c.id}#${i}`);
    return `<div class="ed-row"><div><b>${label(i)}</b><span>Par ${row ? row[0] : '-'}${mod ? ' · <em class="ok">已修改</em>' : ''}</span></div>
      <div><button data-exedit="${i}">編輯</button>${mod ? `<button data-exrev="${i}">還原</button>` : ''}</div></div>`;
  }).join('');
  $('ed-ex-holes').querySelectorAll('[data-exedit]').forEach(b => b.onclick = async () => {
    const i = Number(b.dataset.exedit);
    b.textContent = '讀取中…';
    try {
      const ov = store.overrides.find(o => o.id === `${c.id}#${i}`);
      if (ov) { const r = await getRecord('override', ov.id); openCanvas({ ...r.data.draft, src: { course: c.id, idx: i, label: label(i) } }); return; }
      await loadCourseMaps(c);
      openCanvas(mapToDraft(c.maps[i], rowFor(c, i), { course: c.id, idx: i, label: label(i) }));
    } catch (e) { alert(e.message); b.textContent = '編輯'; }
  });
  $('ed-ex-holes').querySelectorAll('[data-exrev]').forEach(b => b.onclick = async () => {
    if (!confirm('還原成原本的版本？')) return;
    try { await deleteRecord('override', `${c.id}#${b.dataset.exrev}`); renderExisting(); } catch (e) { alert(e.message); }
  });
}

async function loadAndEdit(id) {
  try { const r = await getRecord('draft', id); openCanvas(r.data); } catch (e) { alert(e.message); }
}

// ---------------- 畫圖畫面 ----------------
function openCanvas(D) {
  E.D = JSON.parse(JSON.stringify(D));
  E.w = D.w; E.h = D.h; E.mpp = D.mpp;
  E.g = rleDecode(D.rle, D.w * D.h);
  E.f = D.forest ? rleDecode(D.forest, D.w * D.h) : new Uint8Array(D.w * D.h);
  E.hgW = D.hg.w; E.hgH = D.hg.h; E.hg = Float32Array.from(hgDecode(D.hg.z, E.hgW * E.hgH));      // 編輯時用小數，存檔才取整數（每次塗抹不到 1 公寸也會累積）
  // 橡皮擦擦回去的樣子：修改現有球洞 = 打開時的樣子；自己畫的球洞 = 空白（樹林、平地）
  if (D.src) { E.g0 = E.g.slice(); E.f0 = E.f.slice(); E.hg0 = E.hg.slice(); }
  else { E.g0 = new Uint8Array(D.w * D.h).fill(8); E.f0 = new Uint8Array(D.w * D.h).fill(1); E.hg0 = new Float32Array(E.hgW * E.hgH); }
  E.undo = []; E.redo = []; E.dirty = false;
  E.base = document.createElement('canvas'); E.base.width = E.w; E.base.height = E.h;
  E.baseCtx = E.base.getContext('2d'); E.baseImg = E.baseCtx.createImageData(E.w, E.h);
  E.hgCv = document.createElement('canvas'); E.hgCv.width = E.hgW; E.hgCv.height = E.hgH;
  repaintBase(0, 0, E.w - 1, E.h - 1); repaintHg();
  $('ec-name').value = D.name || ''; $('ec-par').value = String(D.par || 4);
  E.dirty = !D.updated && !D.src && !store.drafts.some(x => x.id === D.id);      // 新的球洞還沒存過
  $('ec-save').dataset.st = ''; saveBtnState();
  deps.show('scr-edcanvas');
  requestAnimationFrame(() => { fitView(); setTool(E.tool); updateInfo(); render(); });
}

function initCanvas() {
  const cv = $('ec-cv');
  $('ec-main').querySelectorAll('[data-tool]').forEach(b => b.onclick = () => setTool(b.dataset.tool));
  // 復原 / 重做：畫面右下角的圓形按鈕（每一種工具都能用），電腦另有 Ctrl+Z / Ctrl+Y
  $('ec-undo').onclick = () => undoStep(E.undo, E.redo);
  $('ec-redo').onclick = () => undoStep(E.redo, E.undo);
  document.addEventListener('keydown', e => {
    if (!$('scr-edcanvas').classList.contains('active') || !(e.ctrlKey || e.metaKey) || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); undoStep(E.undo, E.redo); }
    else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); undoStep(E.redo, E.undo); }
  });
  // 實景：用目前畫的樣子（不用先存檔）蓋成 3D 球洞，可以自由看，也可以直接打
  $('ec-3d').onclick = () => { syncDraft(); E.D.name = $('ec-name').value.trim() || E.D.name || '未命名'; E.D.par = Number($('ec-par').value); deps.preview(E.D); };

  $('ec-back').onclick = () => { if (E.dirty && !confirm('還沒存檔，確定離開？')) return; openEditorHome(E.D.src ? 'exist' : 'drafts'); };
  $('ec-save').onclick = doSave;
  $('ec-name').oninput = () => { E.D.name = $('ec-name').value; E.dirty = true; saveBtnState(); };
  $('ec-par').onchange = () => { E.D.par = Number($('ec-par').value); E.dirty = true; updateInfo(); saveBtnState(); };
  $('ec-file').onchange = () => {
    const f = $('ec-file').files[0]; if (!f) return;
    const img = new Image();
    img.onload = () => { const s = Math.min(E.w / img.width, E.h / img.height); E.bg = { img, x: (E.w - img.width * s) / 2, y: (E.h - img.height * s) / 2, s, rot: 0, op: 0.5 }; if (E.tool !== 'bg') E.prevTool = E.tool; setTool('bg'); render(); };
    img.src = URL.createObjectURL(f);
  };
  window.addEventListener('resize', () => { if ($('scr-edcanvas').classList.contains('active')) render(); });
  // 指標：單指 = 工具、雙指 = 移動縮放；滑鼠右鍵 / 中鍵 = 移動、滾輪 = 縮放
  const pts = new Map(); let stroke = null, pinch = null;
  const toGrid = (cx, cy) => { const r = cv.getBoundingClientRect(); return [(cx - r.left - E.view.x) / E.view.s, (cy - r.top - E.view.y) / E.view.s]; };
  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2) {
      if (stroke && stroke.snap) { restore(stroke.snap); E.undo.pop(); }
      stroke = null;
      const [a, b] = [...pts.values()];
      pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), cx: (a[0] + b[0]) / 2, cy: (a[1] + b[1]) / 2, view: { ...E.view } };
      return;
    }
    const pan = E.tool === 'pan' || e.button === 1 || e.button === 2;
    stroke = { pan, last: [e.clientX, e.clientY], gl: toGrid(e.clientX, e.clientY) };
    if (!pan) beginTool(stroke, stroke.gl);
  });
  cv.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch && pts.size >= 2) {
      const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2;
      const r = cv.getBoundingClientRect(), k = d / pinch.d, s = clamp(pinch.view.s * k, 0.15, 12);
      const ox = pinch.cx - r.left, oy = pinch.cy - r.top;
      E.view.s = s; E.view.x = cx - r.left - (ox - pinch.view.x) * s / pinch.view.s; E.view.y = cy - r.top - (oy - pinch.view.y) * s / pinch.view.s;
      render(); return;
    }
    if (!stroke) return;
    if (stroke.pan) { E.view.x += e.clientX - stroke.last[0]; E.view.y += e.clientY - stroke.last[1]; stroke.last = [e.clientX, e.clientY]; render(); return; }
    moveTool(stroke, toGrid(e.clientX, e.clientY));
  });
  const end = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (stroke && pts.size === 0) { endTool(stroke); stroke = null; } };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('wheel', e => {
    e.preventDefault();
    const r = cv.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top, k = Math.exp(-e.deltaY * 0.0015), s = clamp(E.view.s * k, 0.15, 12);
    E.view.x = ox - (ox - E.view.x) * s / E.view.s; E.view.y = oy - (oy - E.view.y) * s / E.view.s; E.view.s = s; render();
  }, { passive: false });
}

function fitView() {
  const cv = $('ec-cv'), r = $('ec-wrap').getBoundingClientRect();
  cv.width = r.width * devicePixelRatio; cv.height = r.height * devicePixelRatio; cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px';
  const s = Math.min(r.width / E.w, r.height / E.h) * 0.96;
  E.view = { s, x: (r.width - E.w * s) / 2, y: (r.height - E.h * s) / 2 };
}

// ---------------- 工具 ----------------
// ---------------- 樹種（長按「樹林」/「單棵樹」）----------------
const treeKind = () => TREE_KINDS.find(q => q.k === E.treeKind) || TREE_KINDS[0];
const treeName = () => treeKind().name, treeCol = () => treeKind().col;
function longPress(el, fn) {
  if (!el) return;
  let tm = null;
  const cancel = () => { clearTimeout(tm); tm = null; };
  el.addEventListener('pointerdown', () => { cancel(); tm = setTimeout(() => { tm = null; el._lp = true; fn(); }, 450); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => el.addEventListener(ev, cancel));
  el.addEventListener('contextmenu', e => { e.preventDefault(); cancel(); el._lp = true; fn(); });      // 電腦：右鍵也可以
}
function openTreePicker(done) {
  const old = document.getElementById('ec-trees'); if (old) old.remove();
  const box = document.createElement('div'); box.id = 'ec-trees'; box.className = 'ec-trees';
  box.innerHTML = `<div class="ec-trees-card"><b>選擇樹種</b><div class="ec-trees-grid">${TREE_KINDS.map(q =>
    `<button data-tk="${q.k}" class="${E.treeKind === q.k ? 'on' : ''}"><i style="background:${q.col}"></i>${q.name}</button>`).join('')}</div>
    <p class="ec-tip">之後畫的樹林、放的單棵樹都用這個樹種；「球場預設」= 照球場的風格隨機種</p><button class="ec-trees-close">取消</button></div>`;
  box.addEventListener('click', e => {
    const b = e.target.closest('[data-tk]');
    if (b) { E.treeKind = b.dataset.tk; box.remove(); done(); }
    else if (e.target === box || e.target.classList.contains('ec-trees-close')) box.remove();
  });
  $('scr-edcanvas').appendChild(box);
}

function setTool(t) {
  if (t !== 'more') E.tool = t;
  const onBtn = t === 'more' || t === 'bg' ? 'more' : E.tool;
  $('ec-main').querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === onBtn));
  const o = $('ec-opts'), sizeRow = (lab = '筆刷大小') => `<label class="ec-range">${lab} <b id="ec-szv">${E.size} 公尺</b><input id="ec-sz" type="range" min="2" max="60" step="1" value="${E.size}"></label>`;
  if (t === 'brush') {
    // 畫筆：塗抹（拖曳畫）或填滿（點一下把連在一起的同一種地面整片換掉）
    const fillM = E.brushMode === 'fill';
    o.innerHTML = `<div class="ec-chips ec-mode"><button data-bm="paint" class="${fillM ? '' : 'on'}">塗抹</button><button data-bm="fill" class="${fillM ? 'on' : ''}">填滿</button></div>` +
      `<div class="ec-chips">${BRUSHES.map(b => `<button data-b="${b.k}" class="${E.brush === b.k ? 'on' : ''}">${b.k === 'erase' ? '<i class="ec-eraser"></i>' : `<i style="background:rgb(${CLASS[b.cls].color})${b.forest ? ';box-shadow:inset 0 0 0 3px ' + treeCol() : ''}"></i>`}${b.forest ? `樹林・${treeName()}` : b.name}</button>`).join('')}</div>` +
      (fillM ? '<p class="ec-tip">點一下：把同一種地面連在一起的區域整片換成選的地面</p>' : sizeRow()) +
      '<p class="ec-tip">長按「樹林」可以換樹種；橡皮擦把畫過的地方擦回原本的樣子</p>';
    o.querySelectorAll('[data-bm]').forEach(b => b.onclick = () => { E.brushMode = b.dataset.bm; setTool(t); });
    o.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { if (b._lp) { b._lp = false; return; } E.brush = b.dataset.b; setTool(t); });
    longPress(o.querySelector('[data-b="forest"]'), () => openTreePicker(() => { E.brush = 'forest'; setTool(t); }));
  } else if (t === 'terrain') {
    o.innerHTML = `<div class="ec-chips">${TERRAIN.map(x => `<button data-tr="${x.k}" class="${E.terrain === x.k ? 'on' : ''}">${x.name}</button>`).join('')}</div>` + sizeRow('範圍') +
      `<label class="ec-range">強度 <b id="ec-stv">${E.strength.toFixed(1)} 公尺</b><input id="ec-st" type="range" min="0.1" max="2" step="0.1" value="${E.strength}"></label><p class="ec-tip">紅 = 高、藍 = 低，每 1 公尺一條等高線；整平 = 拉成按下去那一點的高度</p>`;
    o.querySelectorAll('[data-tr]').forEach(b => b.onclick = () => { E.terrain = b.dataset.tr; setTool(t); });
    $('ec-st').oninput = () => { E.strength = Number($('ec-st').value); $('ec-stv').textContent = E.strength.toFixed(1) + ' 公尺'; };
  } else if (t === 'place') {
    o.innerHTML = `<div class="ec-chips">${PLACES.map(x => `<button data-pl="${x.k}" class="${E.place === x.k ? 'on' : ''}">${x.k === 'tree' ? `<i style="background:${treeCol()}"></i>單棵樹・${treeName()}` : x.name}</button>`).join('')}</div>
      <div class="ec-acts"><button id="ec-autotee">自動放藍 / 白 / 紅梯</button><button id="ec-clearvia">清除轉折點</button></div>
      <p class="ec-tip">放梯台會自動畫一塊梯台區；攻略線 = 黑梯 → 轉折點（依序）→ 旗桿，碼數沿攻略線量；長按「單棵樹」可以換樹種</p>`;
    o.querySelectorAll('[data-pl]').forEach(b => b.onclick = () => { if (b._lp) { b._lp = false; return; } E.place = b.dataset.pl; setTool(t); });
    longPress(o.querySelector('[data-pl="tree"]'), () => openTreePicker(() => { E.place = 'tree'; setTool(t); }));
    $('ec-autotee').onclick = autoTees;
    $('ec-clearvia').onclick = () => { snapshot(); E.D.via = []; E.dirty = true; render(); };
  } else if (t === 'more' || t === 'bg') {
    // 更多：地形顏色、置中、歸零、底圖（照官方球道圖描）、球洞說明
    const b = E.bg, moving = E.tool === 'bg';
    o.innerHTML = `<div class="ec-acts"><button id="ec-hgshow">${E.showHg ? '隱藏地形顏色' : '顯示地形顏色'}</button><button id="ec-fit">整洞置中</button><button id="ec-flatall">地形全部歸零</button></div>
      <div class="ec-sub">底圖</div>
      <div class="ec-acts"><button id="ec-bgload">${b ? '換一張底圖' : '載入底圖（官方球道圖照片）'}</button>${b ? `<button id="ec-bgmove" class="${moving ? 'on' : ''}">${moving ? '移動底圖中（再按一下結束）' : '移動底圖'}</button><button id="ec-bgdel">移除底圖</button>` : ''}</div>` + (b ? `
      <label class="ec-range">透明度<input id="ec-bgop" type="range" min="0.1" max="1" step="0.05" value="${b.op}"></label>
      <label class="ec-range">大小<input id="ec-bgs" type="range" min="-3" max="3" step="0.01" value="${Math.log(b.s)}"></label>
      <label class="ec-range">旋轉<input id="ec-bgr" type="range" min="-180" max="180" step="0.5" value="${b.rot}"></label>
      <p class="ec-tip">按「移動底圖」後單指拖曳對位置。底圖只用來對照描圖，不會存檔</p>` : '<p class="ec-tip">把官方的球道圖墊在下面，半透明照著描</p>') + `
      <label class="ec-note">說明（打這洞時看到的提示）<textarea id="ec-note" maxlength="120">${escapeHtml(E.D.note || '')}</textarea></label>`;
    $('ec-hgshow').onclick = () => { E.showHg = !E.showHg; setTool('more'); render(); };
    $('ec-fit').onclick = () => { fitView(); render(); };
    $('ec-flatall').onclick = () => { if (!confirm('把地形全部歸零（變平）？')) return; snapshot(); E.hg.fill(0); repaintHg(); E.dirty = true; render(); };
    $('ec-note').oninput = e => { E.D.note = e.target.value; E.dirty = true; };
    $('ec-bgload').onclick = () => $('ec-file').click();
    if (b) {
      $('ec-bgmove').onclick = () => { if (E.tool === 'bg') { E.tool = E.prevTool || 'brush'; setTool('more'); } else { E.prevTool = E.tool; setTool('bg'); } };
      $('ec-bgdel').onclick = () => { E.bg = null; if (E.tool === 'bg') E.tool = E.prevTool || 'brush'; setTool('more'); render(); };
      $('ec-bgop').oninput = e => { b.op = Number(e.target.value); render(); };
      $('ec-bgs').oninput = e => { const cx = b.x + b.img.width * b.s / 2, cy = b.y + b.img.height * b.s / 2; b.s = Math.exp(Number(e.target.value)); b.x = cx - b.img.width * b.s / 2; b.y = cy - b.img.height * b.s / 2; render(); };
      $('ec-bgr').oninput = e => { b.rot = Number(e.target.value); render(); };
    }
  } else o.innerHTML = '<p class="ec-tip">單指拖曳移動畫面，雙指縮放（電腦：滾輪縮放、右鍵拖曳移動）</p>';
  const sz = $('ec-sz'); if (sz) sz.oninput = () => { E.size = Number(sz.value); $('ec-szv').textContent = E.size + ' 公尺'; };
  render();
}

function beginTool(st, p) {
  if (E.tool === 'brush' && E.brushMode === 'fill') { st.snap = snapshot(); fill(p); st.filled = true; }
  else if (E.tool === 'brush') { st.snap = snapshot(); dab(p); }
  else if (E.tool === 'terrain') { st.snap = snapshot(); st.flatTo = hgAtGrid(p); terrainDab(p, st); }
  else if (E.tool === 'place') { st.snap = snapshot(); placeAt(p); }
  else if (E.tool === 'bg' && E.bg) { st.bgLast = p; }
  st.lastP = p;
}
function moveTool(st, p) {
  if (E.tool === 'brush' && !st.filled) {
    // 兩點之間補點，快速畫也不會斷
    const d = Math.hypot(p[0] - st.lastP[0], p[1] - st.lastP[1]), step = Math.max(1, E.size / E.mpp / 4), n = Math.ceil(d / step);
    for (let i = 1; i <= n; i++) dab([st.lastP[0] + (p[0] - st.lastP[0]) * i / n, st.lastP[1] + (p[1] - st.lastP[1]) * i / n]);
  } else if (E.tool === 'terrain') {
    // 同樣沿路補點（間隔半個範圍），拉得快慢不影響隆起的量
    const d = Math.hypot(p[0] - st.lastP[0], p[1] - st.lastP[1]), step = Math.max(1, E.size / E.mpp / 4), n = Math.ceil(d / step);
    for (let i = 1; i <= n; i++) terrainDab([st.lastP[0] + (p[0] - st.lastP[0]) * i / n, st.lastP[1] + (p[1] - st.lastP[1]) * i / n], st, i < n);
  }
  else if (E.tool === 'bg' && E.bg && st.bgLast) { E.bg.x += p[0] - st.bgLast[0]; E.bg.y += p[1] - st.bgLast[1]; st.bgLast = p; render(); }
  else if (E.tool === 'place' && ['black', 'blue', 'white', 'red', 'pin'].includes(E.place)) { placeAt(p, true); }
  st.lastP = p;
}
function endTool() { updateInfo(); }

function dab(p) {
  const b = BRUSHES.find(x => x.k === E.brush), r = E.size / 2 / E.mpp, r2 = r * r;
  const x0 = Math.max(0, Math.floor(p[0] - r)), x1 = Math.min(E.w - 1, Math.ceil(p[0] + r)), y0 = Math.max(0, Math.floor(p[1] - r)), y1 = Math.min(E.h - 1, Math.ceil(p[1] + r));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if ((x - p[0]) ** 2 + (y - p[1]) ** 2 > r2) continue;
    const k = y * E.w + x; paintCell(k, b);
  }
  E.dirty = true; repaintBase(x0, y0, x1, y1); render();
}
// 一格塗成選的地面：樹林記下樹種（1 + 編號），橡皮擦回到原本的樣子
const forestVal = () => 1 + Math.max(0, TREE_KINDS.findIndex(q => q.k === E.treeKind));
function paintCell(k, b) {
  if (b.k === 'erase') { E.g[k] = E.g0[k]; E.f[k] = E.f0[k]; return; }
  E.g[k] = b.cls; E.f[k] = b.forest ? forestVal() : 0;
}
function fill(p) {
  const x = Math.round(p[0]), y = Math.round(p[1]); if (x < 0 || y < 0 || x >= E.w || y >= E.h) return;
  const b = BRUSHES.find(q => q.k === E.brush), k0 = y * E.w + x, c0 = E.g[k0], f0 = E.f[k0];
  if (b.k !== 'erase' && c0 === b.cls && f0 === (b.forest ? forestVal() : 0)) return;
  const st = [k0], seen = new Uint8Array(E.w * E.h); seen[k0] = 1;
  while (st.length) {
    const k = st.pop(); paintCell(k, b);
    const xx = k % E.w, yy = k / E.w | 0;
    for (const n of [xx > 0 ? k - 1 : -1, xx < E.w - 1 ? k + 1 : -1, yy > 0 ? k - E.w : -1, yy < E.h - 1 ? k + E.w : -1])
      if (n >= 0 && !seen[n] && E.g[n] === c0 && E.f[n] === f0) { seen[n] = 1; st.push(n); }
  }
  E.dirty = true; repaintBase(0, 0, E.w - 1, E.h - 1); render();
}
// 地形：格子座標 → 高度網格
const hgCell = () => E.D.hg.cell / E.mpp;           // 一格地形 = 幾個地面格
function hgAtGrid(p) {
  const x = clamp(p[0] / hgCell(), 0, E.hgW - 1.001), y = clamp(p[1] / hgCell(), 0, E.hgH - 1.001), i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
  const d = E.hg, w = E.hgW, k = j * w + i;
  return (d[k] * (1 - fx) + d[k + 1] * fx) * (1 - fy) + (d[k + w] * (1 - fx) + d[k + w + 1] * fx) * fy;
}
function terrainDab(p, st, defer = false) {
  const c = hgCell(), r = E.size / 2 / E.mpp / c, cx = p[0] / c, cy = p[1] / c, amt = E.strength * 10 * 0.5;     // 每點的量（公寸）：沿路每 1/4 筆刷寬一點，拉過一次中間大約升降「強度」那麼多
  const src = E.terrain === 'smooth' ? Float32Array.from(E.hg) : null;
  for (let j = Math.max(0, Math.floor(cy - r)); j <= Math.min(E.hgH - 1, Math.ceil(cy + r)); j++) for (let i = Math.max(0, Math.floor(cx - r)); i <= Math.min(E.hgW - 1, Math.ceil(cx + r)); i++) {
    const d = Math.hypot(i - cx, j - cy) / Math.max(r, 0.5); if (d > 1) continue;
    const wgt = 0.5 + 0.5 * Math.cos(d * Math.PI), k = j * E.hgW + i;
    if (E.terrain === 'raise') E.hg[k] = clamp(E.hg[k] + amt * wgt, -600, 600);
    else if (E.terrain === 'lower') E.hg[k] = clamp(E.hg[k] - amt * wgt, -600, 600);
    else if (E.terrain === 'flat') E.hg[k] = E.hg[k] + (st.flatTo - E.hg[k]) * wgt * 0.5;
    else if (E.terrain === 'erase') E.hg[k] = E.hg[k] + (E.hg0[k] - E.hg[k]) * Math.min(1, wgt * 0.7);
    else { let s = 0, n = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < E.hgW && jj < E.hgH) { s += src[jj * E.hgW + ii]; n++; } } E.hg[k] = E.hg[k] + (s / n - E.hg[k]) * wgt * 0.6; }
  }
  E.dirty = true; if (!defer) { repaintHg(); render(); }
}
function placeAt(p, dragging = false) {
  const q = [+clamp(p[0], 0, E.w - 1).toFixed(1), +clamp(p[1], 0, E.h - 1).toFixed(1)], D = E.D;
  if (TEE_IDS.includes(E.place)) {
    D.tees[E.place] = q;
    if (!dragging) {
      // 梯台區：寬 10、深 7 公尺
      const rx = 5 / E.mpp, ry = 3.5 / E.mpp;
      for (let y = Math.round(q[1] - ry); y <= q[1] + ry; y++) for (let x = Math.round(q[0] - rx); x <= q[0] + rx; x++) if (x >= 0 && y >= 0 && x < E.w && y < E.h) { E.g[y * E.w + x] = 4; E.f[y * E.w + x] = 0; }
      repaintBase(Math.round(q[0] - rx) - 1, Math.round(q[1] - ry) - 1, Math.round(q[0] + rx) + 1, Math.round(q[1] + ry) + 1);
    }
  } else if (E.place === 'pin') D.pin = q;
  else if (!dragging && E.place === 'via') D.via.push(q);
  else if (!dragging && E.place === 'tree') D.trees.push(E.treeKind === 'auto' ? q : [...q, E.treeKind]);
  else if (!dragging && E.place === 'erase') {
    // 移除最近的標記（10 公尺內）
    const R = 10 / E.mpp, cand = [];
    TEE_IDS.forEach(t => D.tees[t] && cand.push(['tee', t, D.tees[t]]));
    if (D.pin) cand.push(['pin', 0, D.pin]);
    D.via.forEach((v, i) => cand.push(['via', i, v])); D.trees.forEach((v, i) => cand.push(['tree', i, v]));
    const best = cand.map(c => [c, Math.hypot(c[2][0] - q[0], c[2][1] - q[1])]).sort((a, b) => a[1] - b[1])[0];
    if (best && best[1] < R) { const [k, i] = best[0]; if (k === 'tee') delete D.tees[i]; else if (k === 'pin') D.pin = null; else if (k === 'via') D.via.splice(i, 1); else D.trees.splice(i, 1); }
  }
  E.dirty = true; render(); updateInfo();
}
function autoTees() {
  const D = E.D, r = routeOf(D); if (!r) { alert('先放黑梯和旗桿'); return; }
  snapshot();
  const yb = yardsFrom(D, D.tees.black), L = r.slice(1).reduce((s, q, k) => s + Math.hypot(q[0] - r[k][0], q[1] - r[k][1]), 0);
  for (const [t, f] of [['blue', 0.95], ['white', 0.9], ['red', 0.8]]) {
    const want = (1 - f) * L; let acc = 0, p = r[0];
    for (let i = 1; i < r.length; i++) { const l = Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]); if (acc + l >= want) { const k = (want - acc) / l; p = [r[i - 1][0] + (r[i][0] - r[i - 1][0]) * k, r[i - 1][1] + (r[i][1] - r[i - 1][1]) * k]; break; } acc += l; }
    const keep = E.place; E.place = t; placeAt(p); E.place = keep;
  }
  if (!yb) return;
  updateInfo();
}

// ---------------- 復原 / 重做 ----------------
function snapshot() {
  const s = { g: E.g.slice(), f: E.f.slice(), hg: E.hg.slice(), D: JSON.stringify({ tees: E.D.tees, pin: E.D.pin, via: E.D.via, trees: E.D.trees }) };
  E.undo.push(s); if (E.undo.length > 25) E.undo.shift(); E.redo.length = 0;
  return s;
}
function restore(s) {
  E.g.set(s.g); E.f.set(s.f); E.hg.set(s.hg); Object.assign(E.D, JSON.parse(s.D));
  repaintBase(0, 0, E.w - 1, E.h - 1); repaintHg(); render(); updateInfo();
}
function undoStep(from, to) {
  if (!from.length || !E.D) return;
  to.push({ g: E.g.slice(), f: E.f.slice(), hg: E.hg.slice(), D: JSON.stringify({ tees: E.D.tees, pin: E.D.pin, via: E.D.via, trees: E.D.trees }) });
  restore(from.pop()); E.dirty = true;
}

// ---------------- 繪製 ----------------
const treeRGB = i => { const h = (TREE_KINDS[i] || TREE_KINDS[0]).col; return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; };
function repaintBase(x0, y0, x1, y1) {
  x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(E.w - 1, x1); y1 = Math.min(E.h - 1, y1);
  const d = E.baseImg.data;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const k = y * E.w + x, c = CLASS[E.g[k]].color, o = k * 4;
    let f = 1;
    if (E.g[k] === 2) f = (Math.floor(y * E.mpp / 8) % 2) ? 1.05 : 0.96;        // 球道割草條紋
    if (E.f[k]) f = ((x * 7 + y * 13) % 11 < 4) ? 0.62 : 0.78;                   // 樹林：深色點點
    if (E.f[k] > 1 && (x * 7 + y * 13) % 11 < 4) {                                // 指定樹種的樹林：點點用那個樹種的顏色
      const tc = treeRGB(E.f[k] - 1); d[o] = tc[0]; d[o + 1] = tc[1]; d[o + 2] = tc[2]; d[o + 3] = 255; continue;
    }
    d[o] = c[0] * f; d[o + 1] = c[1] * f; d[o + 2] = c[2] * f; d[o + 3] = 255;
  }
  E.baseCtx.putImageData(E.baseImg, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
}
function repaintHg() {
  const x = E.hgCv.getContext('2d'), img = x.createImageData(E.hgW, E.hgH);
  for (let k = 0; k < E.hg.length; k++) {
    const v = E.hg[k] / 10, t = clamp(Math.abs(v) / 8, 0, 1), o = k * 4;
    if (v > 0) { img.data[o] = 230; img.data[o + 1] = 80; img.data[o + 2] = 50; } else { img.data[o] = 50; img.data[o + 1] = 110; img.data[o + 2] = 230; }
    img.data[o + 3] = Math.abs(v) < 0.05 ? 0 : 40 + t * 150;
  }
  x.putImageData(img, 0, 0);
}
let rafId = 0;
function render() { if (!rafId) rafId = requestAnimationFrame(draw); }
// 存檔按鈕顯示狀態：有改動 = 亮的「存檔」；存好 = 綠色「已存檔」；存檔中 = 閃爍
function saveBtnState() {
  const b = $('ec-save'); if (!b || E.saving) return;
  const src = E.D && E.D.src, applied = src && store.overrides.some(o => o.id === `${src.course}#${src.idx}`);
  const st = E.dirty || (src && !applied) ? 'dirty' : 'saved';      // 還沒改過的原版球洞：照常顯示「存檔（套用到遊戲）」
  if (b.dataset.st === st) return;
  b.dataset.st = st;
  b.textContent = st === 'dirty' ? (src ? '存檔（套用到遊戲）' : '存檔') : src ? '已套用' : '已存檔';
}
function draw() {
  rafId = 0; saveBtnState();
  $('ec-undo').disabled = !E.undo.length; $('ec-redo').disabled = !E.redo.length;
  const cv = $('ec-cv'); if (!cv || !E.D) return;
  const r = $('ec-wrap').getBoundingClientRect();
  if (cv.width !== Math.round(r.width * devicePixelRatio)) { cv.width = r.width * devicePixelRatio; cv.height = r.height * devicePixelRatio; cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px'; }
  const x = cv.getContext('2d'), v = E.view, dpr = devicePixelRatio;
  x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = '#26401f'; x.fillRect(0, 0, cv.width, cv.height);
  x.setTransform(dpr * v.s, 0, 0, dpr * v.s, dpr * v.x, dpr * v.y);
  x.imageSmoothingEnabled = v.s < 2;
  x.drawImage(E.base, 0, 0);
  if (E.bg) {
    const b = E.bg; x.save(); x.globalAlpha = b.op;
    const cx = b.x + b.img.width * b.s / 2, cy = b.y + b.img.height * b.s / 2;
    x.translate(cx, cy); x.rotate(b.rot * Math.PI / 180); x.drawImage(b.img, -b.img.width * b.s / 2, -b.img.height * b.s / 2, b.img.width * b.s, b.img.height * b.s); x.restore();
  }
  if (E.showHg || E.tool === 'terrain') {
    x.imageSmoothingEnabled = true; const c = hgCell();
    x.drawImage(E.hgCv, -c / 2, -c / 2, E.hgW * c, E.hgH * c);
    drawContours(x, c);
  }
  // 地圖外框
  x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 1 / v.s; x.strokeRect(0, 0, E.w, E.h);
  // 攻略線與每段碼數
  const D = E.D, route = routeOf(D), u = 1 / v.s;
  if (route) {
    x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 2 * u; x.setLineDash([8 * u, 6 * u]);
    x.beginPath(); route.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); x.stroke(); x.setLineDash([]);
    x.font = `700 ${12 * u}px "Barlow Condensed", sans-serif`; x.textAlign = 'center';
    for (let i = 1; i < route.length; i++) {
      const a = route[i - 1], b = route[i], yd = Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) * E.mpp / 0.9144);
      tagText(x, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, yd + ' Y', u);
    }
  }
  for (const p of D.via) { x.fillStyle = '#fff'; x.beginPath(); x.arc(p[0], p[1], 4 * u, 0, 7); x.fill(); x.strokeStyle = '#111'; x.lineWidth = 1.5 * u; x.stroke(); }
  for (const p of D.trees) { x.fillStyle = p[2] ? (TREE_KINDS.find(q => q.k === p[2]) || TREE_KINDS[0]).col : '#1f3a17'; x.beginPath(); x.arc(p[0], p[1], 3 / E.mpp, 0, 7); x.fill(); x.strokeStyle = 'rgba(0,0,0,.4)'; x.lineWidth = u; x.stroke(); }
  for (const t of TEE_IDS) if (D.tees[t]) {
    const p = D.tees[t]; x.fillStyle = TEE_COLOR[t]; x.strokeStyle = t === 'black' ? '#fff' : '#111'; x.lineWidth = 1.6 * u;
    x.beginPath(); x.arc(p[0], p[1], 5.5 * u, 0, 7); x.fill(); x.stroke();
    const yd = yardsFrom(D, p); if (yd) tagText(x, p[0] + 16 * u, p[1] + 4 * u, `${TEE_NAME[t]} ${yd}`, u, 'left');
  }
  if (D.pin) {
    const p = D.pin; x.strokeStyle = '#f7f1dc'; x.lineWidth = 2 * u; x.beginPath(); x.moveTo(p[0], p[1]); x.lineTo(p[0], p[1] - 22 * u); x.stroke();
    x.fillStyle = '#d0392b'; x.beginPath(); x.moveTo(p[0], p[1] - 22 * u); x.lineTo(p[0] + 13 * u, p[1] - 18 * u); x.lineTo(p[0], p[1] - 14 * u); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(p[0], p[1], 2.5 * u, 0, 7); x.fill();
  }
  // 比例尺
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  const m50 = 50 / E.mpp * v.s; x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.moveTo(12, r.height - 14); x.lineTo(12 + m50, r.height - 14); x.stroke();
  x.fillStyle = '#fff'; x.font = '600 11px sans-serif'; x.textAlign = 'left'; x.fillText('50 公尺', 14, r.height - 20);
}
function tagText(x, px, py, s, u, align = 'center') {
  x.font = `700 ${12 * u}px "Barlow Condensed", sans-serif`; const w = x.measureText(s).width + 8 * u;
  const lx = align === 'center' ? px - w / 2 : px;
  x.fillStyle = 'rgba(10,20,15,.75)'; x.fillRect(lx, py - 9 * u, w, 15 * u);
  x.fillStyle = '#f6e3ae'; x.textAlign = 'left'; x.fillText(s, lx + 4 * u, py + 2 * u);
}
// 等高線：每 1 公尺一條（marching squares 簡化版：格子兩端跨過整數公尺就畫一小段）
function drawContours(x, c) {
  x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 1 / E.view.s; x.beginPath();
  const H = (i, j) => E.hg[j * E.hgW + i] / 10;
  for (let j = 0; j < E.hgH - 1; j++) for (let i = 0; i < E.hgW - 1; i++) {
    const a = H(i, j), b = H(i + 1, j), d = H(i, j + 1);
    const lv = Math.floor(Math.max(a, b, d)); if (lv < Math.min(a, b, d) || (a === b && a === d)) continue;
    const pts = [];
    if ((a - lv) * (b - lv) < 0) pts.push([(i + (lv - a) / (b - a)) * c, j * c]);
    if ((a - lv) * (d - lv) < 0) pts.push([i * c, (j + (lv - a) / (d - a)) * c]);
    if (pts.length === 2) { x.moveTo(pts[0][0], pts[0][1]); x.lineTo(pts[1][0], pts[1][1]); }
  }
  x.stroke();
}

// ---------------- 資訊：碼數、建議、問題 ----------------
function syncDraft() {
  const D = E.D;
  D.rle = rleEncode(E.g, E.w); D.forest = rleEncode(E.f, E.w); D.hg = { ...D.hg, z: hgEncode(E.hg) };
}
// 資訊框點一下收合（手機上才不會擋住果嶺）
document.addEventListener('click', e => { const box = e.target.closest && e.target.closest('#ec-info'); if (box) box.classList.toggle('min'); });
function updateInfo() {
  const D = E.D; syncDraft();
  const ys = teeYardsOf(D), chk = checkDraft(D), G = PAR_GUIDE[D.par], sp = suggestPar(ys.black);
  const teeTxt = TEE_IDS.filter(t => ys[t]).map(t => `<span class="ec-y" style="--c:${TEE_COLOR[t]}">${TEE_NAME[t]} <b>${ys[t]}</b></span>`).join('') || '<span class="ec-y">先放黑梯和旗桿，就會算碼數</span>';
  $('ec-info').innerHTML = `<div class="ec-yards">${teeTxt}</div>
    <div class="ec-guide">Par ${D.par} 建議：男子 ${G.men[0]}~${G.men[1]} 碼、女子 ${G.women[0]}~${G.women[1]} 碼（${G.typical}）${sp && sp !== D.par ? `<br><b class="bad">黑梯 ${ys.black} 碼比較像 Par ${sp}</b>` : ''}</div>
    ${chk.errs.length ? `<div class="ec-err">${chk.errs.map(escapeHtml).join('<br>')}</div>` : ''}${chk.warns.length ? `<div class="ec-warn">${chk.warns.map(escapeHtml).join('<br>')}</div>` : ''}
    ${!chk.errs.length && !chk.warns.length && ys.black ? '<div class="ec-ok">可以存檔、發布</div>' : ''}
    <div class="ec-sum">${chk.errs.length ? `<b class="bad">${chk.errs.length} 個問題</b>` : chk.warns.length ? `<b class="bad">${chk.warns.length} 個提醒</b>` : 'OK'} · 點一下展開</div>`;
}

async function doSave() {
  const D = E.D; syncDraft();
  D.name = $('ec-name').value.trim() || D.name || '未命名'; D.par = Number($('ec-par').value);
  // 存到試算表要幾秒鐘：按鈕顯示「存檔中…」，存好跳提示，失敗跳出原因
  const btn = $('ec-save');
  E.saving = true; btn.disabled = true; btn.dataset.st = 'saving'; btn.textContent = '存檔中…';
  try { await saveDraft(D); E.dirty = false; deps.toast(D.src ? '已套用到遊戲裡的這一洞' : '草稿已存檔'); }
  catch (e) { alert('存檔失敗：' + e.message); }
  finally { E.saving = false; btn.disabled = false; btn.dataset.st = ''; saveBtnState(); }
}
