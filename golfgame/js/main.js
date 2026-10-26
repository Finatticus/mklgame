// 介面流程：登入/註冊 → 大廳 → 單人 / 建立遊戲間 / 加入遊戲間 / 練習場；角色素質、紀錄、管理員
import * as THREE from 'three';
import { session, call, isLocalMode, peek, refresh, prefetch } from './api.js';
import { getSetting, setSetting, ADMIN_USER, CHARACTERS, characterDef, ANIM_BASE } from './config.js';
import { STATS, STAT_DETAIL, BASE, MAX, costFor, spentFor, normalizeStats, DEFAULT_LOOK, LOOK_OPTIONS, START_RESPECS } from './stats.js';
import { COURSES, COURSE_GROUPS, TEE_SETS, courseYards, teeYards, courseById, loadCourseMaps, nineCombo, holeLabel } from './courses.js';
import { World } from './render.js';
import { Hud } from './hud.js';
import { Game } from './game.js';
import { initEditor, resumeCanvas } from './editor.js';
import { refreshCustom, customCourses, store as customStore, previewCourse, PREVIEW_ID } from './custom.js';
import { Net } from './net.js';
import { ProceduralGolfer } from './character.js';
import { MixamoGolfer } from './mixamo.js';
import { escapeHtml, fmtToPar } from './util.js';
import { setSound, unlockAudio } from './audio.js';
import { stampSvg, stampTier, STAMP_TIERS } from './stamps.js';
import { ACH, ACH_CATS, TIER_NAME, SKINS, SLOT_NAME, LOOK_KEY, PASSPORT, stampDone, prog, chal, progressOf, medalHtml, checkChallenge, skinUnlocked, skinById, equippedSkins, achById, checkCounters, skinDesc, starBalance, buySkin, FX_NAME } from './progress.js';
import { LEVELS, levelById, THEME_NAME, CHAPTERS, chapterOf } from './challenge.js';
import { clubById } from './clubs.js';
import { initReal, renderRealTab } from './real.js';

const $ = id => document.getElementById(id);
const screens = ['scr-login', 'scr-register', 'scr-lobby', 'scr-chal', 'scr-shop', 'scr-setup', 'scr-room', 'scr-join', 'scr-char', 'scr-rank', 'scr-records', 'scr-real', 'scr-admin', 'scr-editor', 'scr-edcanvas', 'scr-game'];
function show(id) {
  screens.forEach(s => $(s).classList.toggle('active', s === id));
  document.body.dataset.screen = id;
  if (id !== 'scr-char') stopPreview();
}

function msg(el, text, ok) { const e = $(el); e.textContent = text || ''; e.classList.toggle('ok', !!ok); }
async function busy(btn, fn) {
  const b = typeof btn === 'string' ? $(btn) : btn;
  if (b) { b.disabled = true; b.dataset.label = b.dataset.label || b.textContent; b.textContent = '處理中…'; }
  try { return await fn(); } finally { if (b) { b.disabled = false; b.textContent = b.dataset.label; } }
}

// ---------------- 登入 / 註冊 ----------------
function initAuth() {
  const saved = getSetting('login', null);
  if (saved) { $('li-user').value = saved.user; $('li-pass').value = saved.pass; }
  $('btn-login').onclick = () => busy('btn-login', async () => {
    msg('li-msg', '');
    const user = $('li-user').value.trim(), pass = $('li-pass').value;
    if (!user || !pass) return msg('li-msg', '請輸入帳號與密碼');
    session.user = user; session.pass = pass;
    try {
      const r = await call('login');
      session.isAdmin = r.isAdmin;
      session.profile = r.profile;
      setSetting('login', { user, pass });
      unlockAudio();
      enterLobby();
    } catch (e) { session.user = null; msg('li-msg', e.message); }
  });
  $('li-pass').addEventListener('keydown', e => { if (e.key === 'Enter') $('btn-login').click(); });
  $('btn-to-register').onclick = () => { msg('rg-msg', ''); show('scr-register'); };
  $('btn-back-login').onclick = () => show('scr-login');
  $('btn-register').onclick = () => busy('btn-register', async () => {
    const user = $('rg-user').value.trim(), pass = $('rg-pass').value, pass2 = $('rg-pass2').value;
    if (pass !== pass2) return msg('rg-msg', '兩次密碼不一樣');
    try {
      await call('register', { user, pass });
      msg('rg-msg', user === ADMIN_USER ? '註冊完成，可以登入了' : '註冊完成！等管理員核准後就能登入', true);
      $('li-user').value = user; $('li-pass').value = '';
    } catch (e) { msg('rg-msg', e.message); }
  });
  $('btn-settings').onclick = openSettings;
  updateModeBadge();
}

function updateModeBadge() {
  $('mode-badge').textContent = isLocalMode() ? '本機模式（尚未設定 GAS）' : '';
}

// ---------------- 設定 ----------------
// 遊戲畫面字體大小：最大 120%（再大會在手機直向時面板重疊）
const FONT_SIZES = [[1, '標準'], [1.1, '大'], [1.2, '特大']];
// 手機橫向時瀏海只在一邊，但系統給的安全邊距左右都有；記下瀏海在哪一邊，另一邊的面板就能貼齊螢幕邊緣
function updateNotchSide() {
  const ang = screen.orientation ? screen.orientation.angle : (window.orientation || 0);
  const land = window.innerWidth > window.innerHeight;
  document.documentElement.dataset.notch = !land ? '' : (ang === 90 ? 'left' : ang === 270 || ang === -90 ? 'right' : '');
}
updateNotchSide();
window.addEventListener('resize', updateNotchSide);
if (screen.orientation) screen.orientation.addEventListener('change', updateNotchSide);

function applyFontSize(v) {
  v = FONT_SIZES.some(f => f[0] === v) ? v : 1;
  document.documentElement.style.setProperty('--fs', v);
  setSetting('fs', v);
  ['set-fs', 'gm-fs'].forEach(id => {
    $(id).innerHTML = FONT_SIZES.map(([f, l]) => `<button type="button" class="${f === v ? 'on' : ''}" data-fs="${f}">${l}</button>`).join('');
    $(id).querySelectorAll('button').forEach(b => b.onclick = () => applyFontSize(Number(b.dataset.fs)));
  });
  if (world) world.resize();
}

// 長推桿特寫（慢動作近拍）開 / 關
function applyPuttCam(v) {
  setSetting('puttCam', v);
  $('gm-pcam').innerHTML = [[true, '開啟'], [false, '關閉']].map(([f, l]) => `<button type="button" class="${f === v ? 'on' : ''}" data-v="${f ? 1 : 0}">${l}</button>`).join('');
  $('gm-pcam').querySelectorAll('button').forEach(b => b.onclick = () => applyPuttCam(b.dataset.v === '1'));
}

// 快取大小：程式本體（每次改版換新）與下載的資料（角色、材質、球場地圖，用到才下載）
const fmtMB = b => (b / 1048576).toFixed(b < 10485760 ? 1 : 0) + ' MB';
async function cacheSizes() {
  const out = { assets: 0, app: 0, files: 0 };
  if (!('caches' in window)) return null;
  for (const name of await caches.keys()) {
    if (!name.startsWith('dixen-')) continue;
    const c = await caches.open(name), isAsset = name.startsWith('dixen-assets');
    for (const req of await c.keys()) {
      const r = await c.match(req); if (!r) continue;
      const len = Number(r.headers.get('content-length')) || (await r.clone().blob()).size;
      if (isAsset) { out.assets += len; out.files++; } else out.app += len;
    }
  }
  return out;
}
async function showCacheInfo() {
  $('set-cache').textContent = '計算中…';
  try {
    const s = await cacheSizes();
    if (!s) { $('set-cache').textContent = '這個瀏覽器不支援離線快取'; $('set-cache-clear').disabled = true; return; }
    $('set-cache').innerHTML = `共 <b class="num">${fmtMB(s.assets + s.app)}</b><span>下載的資料 ${fmtMB(s.assets)}（${s.files} 個檔案）· 程式 ${fmtMB(s.app)}</span>`;
    $('set-cache-clear').disabled = s.assets === 0;
  } catch (e) { $('set-cache').textContent = '無法讀取快取大小'; }
}
async function clearAssetCache() {
  if (!confirm('要清除下載的角色、材質與球場地圖嗎？帳號與成績不受影響，下次用到時會重新下載。')) return;
  for (const name of await caches.keys()) if (name.startsWith('dixen-assets')) await caches.delete(name);
  await showCacheInfo();
}

function openSettings() {
  showCacheInfo();
  $('set-cache-clear').onclick = clearAssetCache;
  $('set-quality').value = getSetting('quality', 'high');
  $('set-sound').checked = getSetting('sound', true);
  $('dlg-settings').classList.add('open');
}
function initSettings() {
  $('set-save').onclick = () => {
    const q = $('set-quality').value;
    const needReload = world && q !== getSetting('quality', 'high');
    setSetting('quality', q);
    setSetting('sound', $('set-sound').checked);
    setSound($('set-sound').checked);
    $('dlg-settings').classList.remove('open');
    updateModeBadge();
    if (needReload) alert('畫質會在重新開啟遊戲後套用');
  };
  $('set-cancel').onclick = () => $('dlg-settings').classList.remove('open');
  setSound(getSetting('sound', true));
  applyFontSize(getSetting('fs', 1));
  applyPuttCam(getSetting('puttCam', true) !== false);
  $('btn-lobby-set').onclick = openSettings;
}

// ---------------- 大廳 ----------------
// 最佳 18 洞：從排行紀錄重新算（排除三桿洞球場與奇幻球場）；伺服器存的數字以前可能已經算進 Par 54 的回合
const myBest = { user: null, v: null, at: 0 };
function bestFrom(rows) {
  const mine = rows.filter(r => r.user === session.user && r.holes === 18);
  const ok = mine.filter(countsForTotal).map(r => r.strokes);
  // 伺服器存的數字：排行功能加入前打的成績不在排行裡，所以照樣採用；只有剛好等於某一場三桿洞 / 奇幻球場的桿數時才當作算錯的捨棄
  const sv = session.profile.best;
  if (sv && !mine.some(r => !countsForTotal(r) && r.strokes === sv)) ok.push(sv);
  return ok.length ? Math.min(...ok) : null;
}
async function refreshMyBest() {
  if (myBest.user === session.user && Date.now() - myBest.at < 60000) return myBest.v;
  const rows = await refresh('getRankings');      // 跟排行頁共用同一份快取與請求
  Object.assign(myBest, { user: session.user, v: bestFrom(rows), at: Date.now() });
  return myBest.v;
}
// 登入後在背景先把排行、回合紀錄、實際下場讀好，點進去就有資料（每個帳號每次開啟 APP 讀一次，之後點進去時再背景更新）
const prefetched = new Set();
function enterLobby() {
  const h = new Date().getHours();
  $('lb-greet').textContent = h < 11 ? 'GOOD MORNING' : h < 18 ? 'GOOD AFTERNOON' : 'GOOD EVENING';
  $('lb-name').innerHTML = escapeHtml(session.user) + (session.isAdmin ? '<span class="badge">管理員</span>' : '');
  document.querySelectorAll('.admin-only').forEach(e => e.classList.toggle('hidden', !session.isAdmin));
  const p = session.profile;
  const lbStats = best => ($('lb-stats').innerHTML = `能力點 <b>${p.points}</b>　回合數 <b>${p.rounds}</b>　最佳 18 洞 <b>${best ?? '—'}</b>　挑戰星數 <b>${chal().total}</b>`);
  const cachedRows = peek('getRankings');
  lbStats(myBest.user === session.user ? myBest.v : cachedRows ? bestFrom(cachedRows) : null);
  refreshMyBest().then(lbStats).catch(() => lbStats(p.best));
  if (!prefetched.has(session.user)) { prefetched.add(session.user); prefetch(['getStarRanking', 'getRounds', 'realList']); }
  $('mode-chal-sub').textContent = `${LEVELS.length} 個特別設計的關卡 · 已拿 ${chal().total} / ${LEVELS.length * 3} 顆星`;
  show('scr-lobby');
  refreshCustom().catch(() => {});        // 自製球場清單（發布的球場、修改過的球洞）
  checkChallenge(LEVELS);
  checkResume();
}

// 上次沒打完的單人回合（APP 被關掉或中途離開）：回到大廳時問要不要接著打（7 天內、同一個帳號）
let resumeAsked = false;
function checkResume() {
  if (resumeAsked) return;
  resumeAsked = true;
  let r = null;
  try { r = JSON.parse(localStorage.getItem('dixen.resume') || 'null'); } catch (e) { r = null; }
  if (!r || r.user !== session.user || Date.now() - r.at > 7 * 864e5 || !r.cfg || !r.state) return;
  const where = r.cfg.holePractice ? `單一球道練習 · ${r.label || '第 ' + r.holeNo + ' 洞'}` : `第 ${r.holeNo} 洞${r.label ? '（' + r.label + '）' : ''} · 已打 ${r.state.k} / ${r.holes} 洞`;
  $('rs-body').innerHTML = `<b>${escapeHtml(r.course)}</b><br><span class="small">${where}</span>`;
  $('rs-no').onclick = () => { $('dlg-resume').classList.remove('open'); try { localStorage.removeItem('dixen.resume'); } catch (e) { /* 略過 */ } };
  $('rs-yes').onclick = () => {
    $('dlg-resume').classList.remove('open');
    if (r.cfg.holePractice) { setup.kind = 'practice'; setup.pkind = 'hole'; }
    startGame(r.cfg, [{ ...me(), local: true }], null, true, { local: true, state: r.state });
  };
  $('dlg-resume').classList.add('open');
}

function initLobby() {
  $('mode-single').onclick = () => openSetup('single');
  $('mode-host').onclick = () => openSetup('host');
  $('mode-join').onclick = () => { $('jn-code').value = ''; msg('jn-msg', ''); $('jn-wait').classList.add('hidden'); $('jn-form').classList.remove('hidden'); show('scr-join'); };
  $('mode-practice').onclick = () => openSetup('practice');
  $('mode-chal').onclick = openChallenge;
  $('cg-back').onclick = enterLobby;
  initReal({ show, back: () => { rcTab = 'real'; openRecords(); } });
  $('cg-shop').onclick = openShop;
  $('sh-back').onclick = openChallenge;
  $('sh-tabs').querySelectorAll('button').forEach(b => b.onclick = () => { shopSlot = b.dataset.slot; renderShop(); });
  $('lv-cancel').onclick = () => $('dlg-level').classList.remove('open');
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => {
    const t = b.dataset.tab;
    if (t === 'lobby') enterLobby();
    if (t === 'char') openChar();
    if (t === 'records') openRecords();
    if (t === 'rank') openRanking();
    if (t === 'admin') openAdmin();
  });
  $('btn-logout').onclick = () => { session.user = null; setSetting('login', null); $('li-pass').value = ''; show('scr-login'); };
}

// ---------------- 回合設定 ----------------
const setup = { kind: 'single', courseId: 'orient', holes: 'all', tee: 'white', mode: 'stroke', wind: 'course', stimp: null, gimme: 1, mulligans: 2, startHole: 0, pkind: 'range', hpHole: 0 };
function openSetup(kind) {
  setup.kind = kind;
  $('st-title').textContent = { single: '單人回合', host: '建立遊戲間', practice: '練習場' }[kind];
  $('st-go').textContent = kind === 'host' ? '建立遊戲間' : kind === 'practice' ? '開始練習' : '開始回合';
  document.querySelectorAll('.only-host').forEach(e => e.classList.toggle('hidden', kind !== 'host'));
  document.querySelectorAll('.only-round').forEach(e => e.classList.toggle('hidden', kind === 'practice'));
  document.querySelectorAll('.only-practice').forEach(e => e.classList.toggle('hidden', kind !== 'practice'));
  document.querySelectorAll('.only-round-or-host').forEach(e => e.classList.toggle('hidden', kind === 'practice'));
  // 練習場固定用楓林谷；單一球道練習用自己選的球場；回到回合設定時換回原本選的球場
  if (kind === 'practice') { if (!setup.inPractice) setup.roundCourse = setup.courseId; setup.inPractice = true; setPracticeKind(setup.pkind); }
  else if (setup.inPractice) { setup.inPractice = false; setup.courseId = setup.roundCourse || 'orient'; setup.stimp = null; }
  renderSetup();
  show('scr-setup');
}

// 練習方式：練習場（楓林谷，三種練習）/ 單一球道（任選球場的某一洞，打到進洞為止）
function setPracticeKind(k) {
  if (setup.pkind === 'hole' && setup.inPractice) setup.hpCourse = setup.courseId;
  setup.pkind = k;
  setup.courseId = k === 'range' ? 'maple' : (setup.hpCourse || setup.roundCourse || 'orient');
  setup.stimp = null;
}
function setupVisibility() {
  const pr = setup.kind === 'practice', hp = pr && setup.pkind === 'hole';
  $('st-title').textContent = pr ? (hp ? '單一球道練習' : '練習場') : { single: '單人回合', host: '建立遊戲間' }[setup.kind];
  document.querySelectorAll('.only-practice-all').forEach(e => e.classList.toggle('hidden', !pr));
  document.querySelectorAll('.only-practice').forEach(e => e.classList.toggle('hidden', !pr || hp));
  document.querySelectorAll('.only-hp').forEach(e => e.classList.toggle('hidden', !hp));
  document.querySelectorAll('.only-round-or-host').forEach(e => e.classList.toggle('hidden', pr && !hp));
  document.querySelectorAll('.only-round').forEach(e => e.classList.toggle('hidden', pr && !(hp && (e.id === 'st-nines-wrap' || e.querySelector('#st-gimme')))));
}

// 奇幻球場的特色玩法：跟一般球場差很多，獨立一段、字比介紹明顯一點（不混在介紹文字裡）
function featureCard(c) {
  const f = c.feature;
  if (!f) return '';
  const n = c.holes.filter(h => f.tags.some(t => h[3].split(/\s+/).includes(t))).length;
  return `<div class="ci-feature"><h6>特色玩法　${f.name}（${n} 洞）</h6><p>${f.text}${f.tip}</p></div>`;
}

function renderSetup() {
  setupVisibility();
  // 目前選的球場：只顯示資訊卡（不畫縮圖，省流量也不會卡），按「更換球場」打開分群組的選單
  const cur = courseById(setup.courseId);
  const g = COURSE_GROUPS.find(x => x.id === cur.group);
  $('st-courses').innerHTML = `
    <div class="course-info">
      <div class="ci-top"><div><small>${g ? g.name : ''}</small><b>${cur.name}${cur.area ? `<span class="ci-area">（${cur.area}）</span>` : ''}</b><em>${cur.en}</em></div>
        <button class="btn-chip" id="st-change">更換球場 ▾</button></div>
      <div class="ci-stats">
        <span>Par <b>${cur.holes.reduce((a, h) => a + h[0], 0)}</b></span><span>黑梯 <b>${courseYards(cur, 'black').toLocaleString()} Y</b></span>
        <span>Stimp(果嶺速度) <b>${cur.stimp}</b></span><span>風 <b>${cur.wind[0]}~${Math.min(15, cur.wind[1])} mph</b></span><span>海拔 <b>${cur.altitude} m</b></span>
      </div>
      ${featureCard(cur)}
      <p>${cur.desc}</p>
      <button class="btn-chip" id="st-preview-btn">18 洞預覽</button>
    </div>`;
  $('st-change').onclick = () => openCoursePicker();
  $('st-preview-btn').onclick = () => openPreview(cur.id);
  const seg = (id, key, opts) => {
    $(id).innerHTML = opts.map(([v, l]) => `<button class="${setup[key] === v ? 'on' : ''}" data-v="${v}">${l}</button>`).join('');
    $(id).querySelectorAll('button').forEach(b => b.onclick = () => { setup[key] = isNaN(b.dataset.v) ? b.dataset.v : Number(b.dataset.v); renderSetup(); });
  };
  const c = courseById(setup.courseId);
  // 分區球場（長庚北 / 中 / 南）：洞數只有 18 / 9，前九、後九各選一區
  const base = c.baseId ? COURSES.find(x => x.id === c.baseId) : null;
  if (base && setup.holes === 'back') setup.holes = 'front';
  $('st-nines-wrap').classList.toggle('hidden', !base || (setup.kind === 'practice' && setup.pkind !== 'hole'));
  // 練習方式與單一球道的洞
  if (setup.kind === 'practice') {
    $('st-pkind').innerHTML = [['range', '練習場'], ['hole', '單一球道']].map(([v, l]) => `<button class="${setup.pkind === v ? 'on' : ''}" data-v="${v}">${l}</button>`).join('');
    $('st-pkind').querySelectorAll('button').forEach(b => b.onclick = () => { setPracticeKind(b.dataset.v); renderSetup(); });
    if (setup.pkind === 'hole') {
      if (setup.hpHole >= c.holes.length) setup.hpHole = 0;
      $('st-hp').innerHTML = c.holes.map((h, i) => `<button class="${i === setup.hpHole ? 'on' : ''}" data-i="${i}"><b>${holeLabel(c, i) || i + 1}</b><small>Par ${h[0]} · ${teeYards(c, i, setup.tee)} Y</small></button>`).join('');
      $('st-hp').querySelectorAll('button').forEach(b => b.onclick = () => { setup.hpHole = Number(b.dataset.i); renderSetup(); });
    }
  }
  if (base) {
    const [f, b] = c.nineIds;
    const row = (label, cur, other, which) => `<div class="nine-row"><span>${label}</span>` + base.nines.map(n =>
      `<button class="${n.id === cur ? 'on' : ''}" data-w="${which}" data-n="${n.id}" ${which === 'b' && n.id === other ? 'disabled' : ''}>${n.name}</button>`).join('') + '</div>';
    $('st-nines').innerHTML = row(setup.holes === 'all' ? '前九' : '打哪一區', f, b, 'f') + (setup.holes === 'all' ? row('後九', b, f, 'b') : '');
    $('st-nines').querySelectorAll('button').forEach(btn => btn.onclick = () => {
      let nf = f, nb = b;
      if (btn.dataset.w === 'f') { nf = btn.dataset.n; if (nf === nb) nb = f; }
      else nb = btn.dataset.n;
      setup.courseId = nineCombo(base, nf, nb);
      renderSetup();
    });
  }
  seg('st-holes', 'holes', base ? [['all', '18 洞'], ['front', '9 洞']] : [['all', '18 洞'], ['front', '前 9'], ['back', '後 9']]);
  seg('st-tee', 'tee', TEE_SETS.map(t => [t.id, `${t.name} ${courseYards(c, t.id).toLocaleString()}`]));
  seg('st-mode', 'mode', [['stroke', '比桿賽'], ['match', '比洞賽']]);
  seg('st-wind', 'wind', [['course', '球場預設'], ['calm', '無風'], ['light', '微風'], ['normal', '一般'], ['strong', '強風']]);
  // 果嶺速度：數字可調（Stimp 6.0~13.0，每次 0.5），預設為球場標準
  const stimp = setup.stimp ?? c.stimp;
  $('st-greens').innerHTML = `<button data-d="-0.5">−</button><b class="stimp num">${stimp.toFixed(1)}</b><button data-d="0.5">＋</button>` +
    `<button class="${setup.stimp === null ? 'on' : ''}" data-std="1">標準 ${c.stimp.toFixed(1)}</button>` +
    `<span class="small">台灣一般球場約 8，數字越大越快</span>`;
  $('st-greens').querySelectorAll('button').forEach(b => b.onclick = () => {
    if (b.dataset.std) setup.stimp = null;
    else setup.stimp = Math.min(13, Math.max(6, Math.round((stimp + Number(b.dataset.d)) * 2) / 2));
    if (setup.stimp === c.stimp) setup.stimp = null;
    renderSetup();
  });
  seg('st-gimme', 'gimme', [[0, '無'], [1, '1 碼'], [2, '2 碼'], [3, '3 碼']]);
  seg('st-mull', 'mulligans', [[0, '0'], [1, '1'], [2, '2'], [4, '4']]);
}


// ---------- 18 洞預覽 ----------
const holeThumbs = {};
let previewToken = 0;
function holeFeatures(course, spec) {
  const [par, , bend, feat] = spec;
  if (spec[5] && spec[5].note) return escapeHtml(spec[5].note);      // 真實球場：用官網介紹整理的特徵
  const F = new Set(feat.split(/\s+/));
  const canyon = course.style === 'canyon';
  const out = [];
  if (Math.abs(bend) >= 8) out.push(bend < 0 ? '狗腿左' : '狗腿右');
  // 奇幻主題：障礙的名稱不同
  const th = course.group === 'fantasy' ? course.theme : null;
  if (th) {
    const hz = course.waterName || (course.fallName && course.fallName.replace(/^(掉進|墜入)/, '')) || (th === 'lava' ? '熔岩湖' : th === 'void' ? '虛空' : th === 'frost' ? '冰湖' : th === 'mushroom' ? '螢光池' : '潟湖');
    const isle = th === 'void' || th === 'sky';
    if (F.has('S')) out.push('S 型彎'); else if (F.has('D')) out.push('雙狗腿大弧形');
    else if (F.has('E')) out.push('早轉狗腿'); else if (F.has('J')) out.push('果嶺前才轉彎');
    if (F.has('IG')) out.push(isle ? `果嶺浮島（四周都是${th === 'sky' ? '雲海' : '虛空'}）` : `孤島果嶺（四周是${hz}）`);
    // 第三批：機關用這座球場自己的名字
    const fe = course.feature;
    if (fe && fe.kind && fe.tags.some(t => F.has(t))) out.push(F.has('fr2') ? '2 個' + fe.name : fe.name);
    if (F.has('wd')) out.push('寬球道');
    if (!(fe && fe.kind)) { if (F.has('fr2')) out.push('2 個螢火之環'); else if (F.has('fr1')) out.push('螢火之環'); }
    if (F.has('pt') && !(fe && fe.kind)) out.push('星門');
    if (F.has('gv') && !(fe && fe.kind)) out.push('噴發口');
    if (F.has('mu')) out.push('彈跳巨菇');
    if (F.has('iw') && !(fe && fe.kind)) out.push('冰鏡牆');
    const gap = th === 'sky' ? '雲海裂縫' : '虛空裂縫';
    if (F.has('g2')) out.push('要飛越 2 道' + gap); else if (F.has('g1')) out.push('要飛越' + gap);
    if (F.has('nw')) out.push(isle ? '窄島' : '窄球道');
    if (F.has('wl')) out.push('左側' + hz);
    if (F.has('wr')) out.push('右側' + hz);
    if (F.has('wc')) out.push('果嶺前' + hz);
    if (F.has('xc')) out.push(course.waterName || course.fallName ? '橫越' + hz : th === 'lava' ? '橫越熔岩河' : th === 'frost' ? '橫越冰河' : '橫越溪流');
    if (F.has('UP')) out.push('大上坡'); else if (F.has('up')) out.push('上坡');
    if (F.has('DN')) out.push('大下坡'); else if (F.has('dn')) out.push('下坡');
    if (F.has('ww')) out.push(th === 'lava' ? '兩側火山渣荒地' : '兩側荒地');
    if (F.has('b4')) out.push(th === 'moon' ? '隕石坑很多' : '沙坑很多'); else if (F.has('b3')) out.push(th === 'lava' ? '黑沙坑多' : th === 'moon' ? '隕石坑多' : '沙坑多');
    return out.length ? out.join('、') : (par === 3 ? '直接攻果嶺' : '直線洞');
  }
  if (F.has('sl')) out.push('左側是海');
  if (F.has('sr')) out.push('右側是海');
  if (F.has('wl')) out.push(canyon ? '左側深谷' : '左側水池');
  if (F.has('wr')) out.push(canyon ? '右側深谷' : '右側水池');
  if (F.has('wc')) out.push(canyon ? '果嶺前深谷' : '果嶺前水池');
  if (F.has('S')) out.push('S 型彎'); else if (F.has('D')) out.push('雙狗腿大弧形');
  else if (F.has('E')) out.push('早轉狗腿'); else if (F.has('J')) out.push('果嶺前才轉彎');
  if (F.has('IG')) out.push('孤島果嶺（四周是水）');
  if (F.has('nw')) out.push('窄球道'); else if (F.has('wd')) out.push('寬球道');
  if (F.has('xc')) out.push(canyon ? '要飛越峽谷' : course.theme === 'cliffs' ? '要從崖頂飛越海灣' : course.style === 'links' ? '橫越小溪' : '橫越溪流');
  if (F.has('UP')) out.push('大上坡'); else if (F.has('up')) out.push('上坡');
  if (F.has('DN')) out.push('大下坡'); else if (F.has('dn')) out.push('下坡');
  if (F.has('tr')) out.push('樹林窄球道');
  if (F.has('ww')) out.push('兩側荒地');
  if (F.has('b4')) out.push('沙坑很多'); else if (F.has('b3')) out.push('沙坑多');
  return out.length ? out.join('、') : (par === 3 ? '直接攻果嶺' : '直線洞');
}

// 球場選單：上方切換一般球場（台灣、海邊、山地、沙漠）/ 奇幻球場，再依群組列出；之後新增球場會自動出現在對應群組
function openCoursePicker(kind) {
  if (!kind) { const g0 = courseById(setup.courseId).group; kind = g0 === 'fantasy' ? 'fantasy' : g0 === 'custom' ? 'custom' : 'real'; }       // 打開時停在目前球場那一類
  $('cp-kind').querySelectorAll('button').forEach(b => {
    b.classList.toggle('on', b.dataset.k === kind);
    b.onclick = () => { openCoursePicker(b.dataset.k); $('cp-list').scrollTop = 0; };
  });
  $('cp-list').innerHTML = COURSE_GROUPS.filter(g => kind === 'custom' ? g.id === 'custom' : g.id !== 'custom' && (g.id === 'fantasy') === (kind === 'fantasy')).map(g => {
    const list = g.id === 'custom' ? customCourses() : COURSES.filter(c => c.group === g.id);
    const gnote = g.id === 'fantasy' ? '<p class="small cp-note">奇幻球場不列入總桿排行與大廳的最佳 18 洞，每座球場仍有自己的球場排行。</p>'
      : g.id === 'custom' ? `<p class="small cp-note">管理員自製的球場：不列入排行，也沒有紀念章。第一次打會從伺服器下載，之後存在手機裡。${customStore.loaded ? '' : '（讀取中…）'}</p>` : '';
    return `<h4>${g.name}</h4>${gnote}` + (list.length ? `<div class="cp-group">${list.map(c => {
      const on = c.id === setup.courseId || String(setup.courseId).startsWith(c.id + ':');
      return `<div class="cp-item ${on ? 'on' : ''}">
        <button class="cp-row" data-open="${c.id}"><span class="cp-name"><b>${c.name}</b>${c.area || c.country ? `<small>${c.area || c.country}</small>` : ''}${playedTag(c.id)}</span>
          <span class="cp-sum">${courseSummary(c)}</span><i class="cp-arrow"></i></button>
        <div class="cp-more"><em class="cp-en">${c.en}</em>${c.country && c.tagline ? `<i class="cp-country">${c.country}・${c.tagline}</i>` : ''}
          <div class="cp-stats"><span>Stimp(果嶺速度) <b>${c.stimp}</b></span><span>風 <b>${c.wind[0]}~${Math.min(15, c.wind[1])} mph</b></span><span>海拔 <b>${c.altitude} m</b></span>${c.nines ? `<span>分區 <b>${c.nines.map(n => n.name).join(' / ')}</b></span>` : ''}</div>
          ${c.feature ? `<p class="cp-feat">特色玩法：${c.feature.name}</p>` : ''}${c.desc ? `<p class="cp-desc">${c.desc}</p>` : ''}
          <button class="btn brass cp-pick" data-c="${c.id}">${on ? '使用這座球場（目前選擇）' : '選擇這座球場'}</button></div></div>`;
    }).join('')}</div>` : `<p class="small cp-empty">${g.id === 'custom' ? '還沒有自製球場' : '即將加入'}</p>`);
  }).join('');
  // 一列只顯示重點，點一下往下展開介紹與「選擇」按鈕（同時只展開一座）
  $('cp-list').querySelectorAll('[data-open]').forEach(b => b.onclick = () => {
    const it = b.parentElement, was = it.classList.contains('open');
    $('cp-list').querySelectorAll('.cp-item.open').forEach(x => x.classList.remove('open'));
    if (!was) { it.classList.add('open'); it.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  });
  $('cp-list').querySelectorAll('[data-c]').forEach(b => b.onclick = () => {
    setup.courseId = courseById(b.dataset.c).id; setup.stimp = null;      // 分區球場 → 預設前兩區
    $('dlg-courses').classList.remove('open');
    renderSetup();
  });
  $('dlg-courses').classList.add('open');
}
// 打完過幾次 18 洞（球場護照的紀錄），還有最佳成績
function playedTag(id) {
  const st = prog().stamps[id];
  return st && st.n ? `<i class="cp-done">已完成 ${st.n} 次${st.best ? ` · 最佳 ${st.best}` : ''}</i>` : '';
}
// 球場清單一列的重點：幾洞（分區球場寫幾區）、Par、黑梯總碼數
function courseSummary(c) {
  const yd = h => (h[5] && h[5].tees && h[5].tees.black) || h[1];
  if (c.nines) {
    const two = c.nines.slice(0, 2).flatMap(n => n.holes);
    return `${c.nines.length} 區 ${c.nines.length * 9} 洞 · Par ${two.reduce((a, h) => a + h[0], 0)} · ${two.reduce((a, h) => a + yd(h), 0).toLocaleString()} Y`;
  }
  return `${c.holes.length} 洞 · Par ${c.holes.reduce((a, h) => a + h[0], 0)} · ${courseYards(c, 'black').toLocaleString()} Y`;
}

function openPreview(id) {
  $('pv-title').textContent = courseById(id).name + ' · 18 洞預覽';
  $('dlg-preview').classList.add('open');
  renderPreview(id);
}

function renderPreview(id) {
  const c = courseById(id);
  const tee = TEE_SETS.find(t => t.id === setup.tee);
  const token = ++previewToken;
  const front = c.holes.slice(0, 9).reduce((a, h) => a + h[0], 0);
  $('st-prev-sum').textContent = `${tee.name} ${courseYards(c, setup.tee).toLocaleString()} Y · 前九 Par ${front} · 後九 Par ${c.holes.slice(9).reduce((a, h) => a + h[0], 0)}`;
  $('st-preview').innerHTML = c.holes.map((h, i) => `
    <div class="hole-card"><canvas data-h="${i}" width="124" height="200"></canvas>
      <div class="hc"><b>${i + 1}<em>PAR ${h[0]}</em></b>${teeYards(c, i, setup.tee)} Y · HCP ${h[4]}<br><i>${holeFeatures(c, h)}</i></div></div>`).join('');
  // 縮圖一洞一洞慢慢畫，不卡畫面
  Promise.all([import('./terrain.js'), loadCourseMaps(c)]).then(([{ buildHole }]) => {
    let i = 0;
    const next = () => {
      if (token !== previewToken || i >= 18) return;
      // 快取跟著這一洞的地圖走：球洞被修改後地圖會換一份，縮圖就重畫
      const key = c.id + i, map = c.maps && c.maps[i];
      if (!holeThumbs[key] || holeThumbs[key].map !== map) holeThumbs[key] = { hole: buildHole(c, i, { pinSeed: 1 }), map };
      const cv = document.querySelector(`#st-preview canvas[data-h="${i}"]`);
      if (cv) drawHoleThumb(cv, holeThumbs[key]);
      i++;
      setTimeout(next, 0);
    };
    next();
  });
}

// 縮圖專用的配色（球場導覽圖的風格：樹林深、長草中間、球道亮帶割草條紋、果嶺更亮、沙坑米白、水藍），各區之間描一條細邊
//   索引 = physics.js 的 SURF：TEE, FAIRWAY, FRINGE, GREEN, ROUGH, DEEP, SAND, WATER, OB, CHASM, WASTE
//   樹林（DEEP）與地圖範圍外（OB）同色：轉過角度的縮圖邊角不會出現一塊顏色不同的三角形
const THUMB_COL = [[156, 204, 106], [134, 182, 90], [150, 198, 104], [170, 220, 122], [80, 124, 58], [40, 70, 35], [236, 226, 194], [62, 144, 204], [40, 70, 35], [24, 26, 40], [200, 180, 136]];
function drawHoleThumb(cv, { hole }) {
  // 轉成「梯台在下、果嶺在上」，框住整洞（梯台後 15 公尺到果嶺後 45 公尺、左右含球道邊的障礙），不會把果嶺或沙坑裁掉
  const x = cv.getContext('2d'), W = cv.width, H = cv.height;
  const t = hole.tees.find(q => q.id === setup.tee) || hole.tees[1];
  const P0 = hole.tees.reduce((a, q) => (q.s < a.s ? q : a), hole.tees[0]);      // 最後面的梯台
  const gu = hole.green.u, gv = hole.green.v;
  const ang = Math.atan2(gu - P0.u, gv - P0.v);           // 從梯台看果嶺的方位（北 = 0）
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const along = (u, v) => (u - P0.u) * sa + (v - P0.v) * ca, side = (u, v) => (u - P0.u) * ca - (v - P0.v) * sa;
  let a0 = -15, a1 = along(gu, gv) + 45, s0 = -40, s1 = 40;
  for (const [u, v] of hole.path) { const q = side(u, v); s0 = Math.min(s0, q - 40); s1 = Math.max(s1, q + 40); a1 = Math.max(a1, along(u, v) + 30); }
  const sc = Math.min(W / (s1 - s0), H / (a1 - a0));
  const ox = W / 2 - (s0 + s1) / 2 * sc, oy = H / 2 + (a0 + a1) / 2 * sc;
  const toPx = (u, v) => [ox + side(u, v) * sc, oy - along(u, v) * sc];
  // 畫面像素 → 世界座標（每格取 2×2 個點平均，邊緣比較平滑）
  const SS = 2, GW = W * SS, GH = H * SS, sf = new Uint8Array(GW * GH);
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    const sd = ((i + 0.5) / SS - ox) / sc, al = (oy - (j + 0.5) / SS) / sc;
    sf[j * GW + i] = hole.surfaceUV(P0.u + sd * ca + al * sa, P0.v - sd * sa + al * ca);
  }
  const img = x.createImageData(W, H), d = img.data;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    let r = 0, g = 0, b = 0;
    for (let dj = 0; dj < SS; dj++) for (let di = 0; di < SS; di++) {
      const gi = (j * SS + dj) * GW + i * SS + di, k = sf[gi]; let c = THUMB_COL[k] || THUMB_COL[8], f = 1;
      if (k === 1) {
        // 球道割草條紋：沿打球方向每 9 公尺換一次深淺
        const al = (oy - (j + (dj + 0.5) / SS)) / sc; f = Math.floor(al / 9) % 2 ? 1.06 : 0.95;
      }
      if (k === 5 || k === 8) { const h = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453; f = 0.88 + (h - Math.floor(h)) * 0.2; }      // 樹林點點
      // 跟右邊 / 下面不同類：描一條暗邊（沙坑、水、果嶺的輪廓比較清楚）
      const kr = i * SS + di + 1 < GW ? sf[gi + 1] : k, kd = j * SS + dj + 1 < GH ? sf[gi + GW] : k;
      if ((kr !== k || kd !== k) && k !== 5 && k !== 8) f *= 0.78;
      r += c[0] * f; g += c[1] * f; b += c[2] * f;
    }
    const o = (j * W + i) * 4, n = SS * SS;
    d[o] = r / n; d[o + 1] = g / n; d[o + 2] = b / n; d[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  // 四邊淡淡的暗角
  const vg = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.3)'); x.fillStyle = vg; x.fillRect(0, 0, W, H);
  const [px, py] = toPx(hole.pin[0], -hole.pin[1]);
  x.strokeStyle = '#f7f1dc'; x.lineWidth = 1.6;
  x.beginPath(); x.moveTo(px, py); x.lineTo(px, py - 14); x.stroke();
  x.fillStyle = '#d0392b'; x.beginPath(); x.moveTo(px, py - 14); x.lineTo(px + 8, py - 11.5); x.lineTo(px, py - 9); x.fill();
  const [tx, ty] = toPx(t.u, t.v);
  x.fillStyle = '#fff'; x.strokeStyle = 'rgba(0,0,0,0.7)'; x.lineWidth = 1.2;
  x.beginPath(); x.arc(tx, ty, 3.5, 0, Math.PI * 2); x.fill(); x.stroke();
}

function roundCfg() {
  return {
    courseId: setup.courseId, holes: setup.holes, tee: setup.tee, mode: setup.kind === 'host' ? setup.mode : 'stroke',
    wind: setup.wind, stimp: setup.stimp ?? courseById(setup.courseId).stimp, gimme: setup.gimme, mulligans: setup.kind === 'practice' ? 0 : setup.mulligans,
    practice: setup.kind === 'practice' && setup.pkind !== 'hole', holePractice: setup.kind === 'practice' && setup.pkind === 'hole',
    startHole: setup.kind === 'practice' && setup.pkind === 'hole' ? setup.hpHole : 7, seed: Math.floor(Math.random() * 2 ** 31),
  };
}

const me = () => ({ user: session.user, stats: normalizeStats(session.profile.stats), look: { ...DEFAULT_LOOK, ...session.profile.look } });

function initSetup() {
  $('st-back').onclick = enterLobby;
  $('st-go').onclick = () => {
    if (setup.kind === 'host') return hostRoom();
    startGame(roundCfg(), [{ ...me(), local: true }]);
  };
}

// ---------------- 遊戲間 ----------------
let net = null, guestInfo = null;
async function hostRoom() {
  const cfg = roundCfg();
  show('scr-room');
  $('rm-code').innerHTML = '<span class="small">建立中…</span>';
  $('rm-guest').innerHTML = '<div class="avatar wait">?</div><div><b class="small">等待玩家加入…</b></div><span class="st wt">等待中</span>';
  $('rm-host').innerHTML = `<div class="avatar">${escapeHtml(session.user[0])}</div><div><b>${escapeHtml(session.user)}</b><div class="small">主機</div></div><span class="st ok">已就緒</span>`;
  const c = courseById(cfg.courseId);
  $('rm-set').innerHTML = `<dt>球場</dt><dd>${c.name}</dd><dt>洞數</dt><dd>${{ all: '18 洞', front: '前 9', back: '後 9' }[cfg.holes]}</dd><dt>梯台</dt><dd>${TEE_SETS.find(t => t.id === cfg.tee).name}</dd><dt>賽制</dt><dd>${cfg.mode === 'match' ? '比洞賽' : '比桿賽'}</dd><dt>OK 推</dt><dd>${cfg.gimme ? cfg.gimme + ' 碼內' : '無'}</dd>`;
  $('rm-start').disabled = true;
  guestInfo = null;
  if (net) net.close();
  net = new Net();
  let hostStarted = false;
  net.on(m => {
    if (hostStarted) return;          // 開打後的訊息交給遊戲處理
    if (m.t === '_guest') $('rm-guest').querySelector('.st').textContent = '連線中';
    if (m.t === 'hello' && !m.host) {
      guestInfo = m.player;
      $('rm-guest').innerHTML = `<div class="avatar">${escapeHtml(m.player.user[0])}</div><div><b>${escapeHtml(m.player.user)}</b><div class="small">已加入</div></div><span class="st ok">已就緒</span>`;
      $('rm-start').disabled = false;
      net.send({ t: 'hello', host: true, player: me(), cfg });
    }
    if (m.t === '_status') $('rm-link').textContent = m.mode === 'p2p' ? '直連（WebRTC）' : 'GAS 轉送';
    if (m.t === '_error') $('rm-link').textContent = m.error;
  });
  try {
    const code = await net.host(cfg);
    $('rm-code').innerHTML = code.split('').map((d, i) => (i === 3 ? '<span class="gap"></span>' : '') + `<span>${d}</span>`).join('');
  } catch (e) {
    $('rm-code').innerHTML = `<span class="small err">${escapeHtml(e.message)}</span>`;
  }
  $('rm-start').onclick = () => {
    const players = [{ ...me(), local: true }, { ...guestInfo, local: false }];
    hostStarted = true;
    net.send({ t: 'start', cfg, players: players.map(p => ({ user: p.user, stats: p.stats, look: p.look })) });
    startGame(cfg, players, net, true);
  };
}

function initRooms() {
  $('rm-back').onclick = () => { if (net) { net.close(); net = null; } enterLobby(); };
  $('jn-back').onclick = () => { if (net) { net.close(); net = null; } enterLobby(); };
  $('jn-go').onclick = () => busy('jn-go', async () => {
    const code = $('jn-code').value.replace(/\D/g, '');
    if (code.length !== 6) return msg('jn-msg', '請輸入 6 位數驗證碼');
    if (net) net.close();
    net = new Net();
    try {
      const room = await net.join(code, session.user);
      $('jn-form').classList.add('hidden');
      $('jn-wait').classList.remove('hidden');
      $('jn-host').textContent = room.host === session.user ? room.guest : room.host;
      if (net.rejoin) { $('jn-info').textContent = '正在接續比賽，等對方打完這一桿…'; $('jn-link').textContent = 'GAS 轉送'; }
      // rj：這一次加入的編號；比賽進行中時，對方收到後會把目前進度傳回來（重新連回接續）
      const rj = Math.random().toString(36).slice(2, 10);
      net.send({ t: 'hello', player: me(), rj });
      const resend = setInterval(() => { if (!net || net.closed || started) return clearInterval(resend); net.send({ t: 'hello', player: me(), rj }); }, 8000);
      let started = false;
      net.on(m => {
        if (m.t === 'resume' && m.to === session.user && !started) {
          started = true;
          clearInterval(resend);
          const players = m.players.map(p => ({ ...p, local: p.user === session.user }));
          startGame(m.cfg, players, net, false, m);
          return;
        }
        if (m.t === '_status') $('jn-link').textContent = m.mode === 'p2p' ? '直連（WebRTC）' : 'GAS 轉送';
        if (m.t === 'hello' && m.host) $('jn-info').textContent = `${courseById(m.cfg.courseId).name} · ${m.cfg.mode === 'match' ? '比洞賽' : '比桿賽'}`;
        if (m.t === 'start' && !started) {
          started = true;
          clearInterval(resend);
          const players = m.players.map(p => ({ ...p, local: p.user === session.user }));
          startGame(m.cfg, players, net, false);
        }
        if (m.t === '_closed' && !started) { msg('jn-msg', '遊戲間已關閉'); $('jn-form').classList.remove('hidden'); $('jn-wait').classList.add('hidden'); }
      });
    } catch (e) { msg('jn-msg', e.message); }
  });
}

// ---------------- 開始遊戲 ----------------
let world = null, hud = null, game = null;
const ui = {
  loading(on, text, progress) {
    $('loading').classList.toggle('show', on);
    if (text) $('ld-text').textContent = text;
    if (progress !== undefined) $('ld-bar').style.width = Math.round(progress * 100) + '%';
  },
  // 單一球道練習打完：再打一次 / 下一洞 / 結束
  exitPreview() {
    ['dlg-hp', 'dlg-menu'].forEach(id => $(id).classList.remove('open'));
    game.quit(); resumeCanvas();
  },
  showHolePracticeEnd(g) {
    const box = $('dlg-hp'), p = g.players.find(q => q.local) || g.players[0];
    const s = p.scores[g.k], d = s - g.hole.par, idx = g.holeList[0];
    $('hp-title').textContent = `${holeLabel(g.course, idx) || '第 ' + (idx + 1) + ' 洞'} · PAR ${g.hole.par}`;
    $('hp-body').innerHTML = `<p class="center" style="font-size:18px;margin:6px 0 10px"><b class="num">${s}</b> 桿　${s === 1 ? '一桿進洞' : ({ '-3': '信天翁', '-2': '老鷹', '-1': '小鳥', 0: '平標準桿', 1: '柏忌', 2: '雙柏忌' }[d] ?? (d > 0 ? '+' + d : d))}　·　推桿 ${p.putts[g.k] || 0}</p>`;
    $('hp-next').classList.toggle('hidden', idx >= g.course.holes.length - 1);
    $('hp-again').onclick = () => { box.classList.remove('open'); g.loadHole(0); };
    $('hp-next').onclick = () => { box.classList.remove('open'); g.holeList = [idx + 1]; setup.hpHole = idx + 1; g.loadHole(0); };
    $('hp-quit').textContent = g.cfg.preview ? '回編輯器' : '結束練習';
    $('hp-quit').onclick = () => { box.classList.remove('open'); if (g.cfg.preview) return ui.exitPreview(); g.quit(); openSetup('practice'); };
    box.classList.add('open');
  },
  showHoleResult(g, last) {
    return new Promise(res => {
      const box = $('dlg-hole');
      const k = g.k;
      $('hr-title').textContent = `第 ${g.holeNo} 洞 · PAR ${g.hole.par}`;
      $('hr-body').innerHTML = g.players.map(p => {
        const s = p.scores[k], d = s - g.hole.par;
        const tot = p.scores.reduce((a, v, i) => a + (v ? v - p.pars[i] : 0), 0);
        const name = p.picked ? `Double Par（+${g.hole.par}）` : s === 1 ? '一桿進洞' : ({ '-3': '信天翁', '-2': '老鷹', '-1': '小鳥', 0: '平標準桿', 1: '柏忌', 2: '雙柏忌' }[d] ?? `+${d}`);
        return `<div class="hr-row"><b>${escapeHtml(p.user)}</b><span class="hr-score ${d < 0 ? 'under' : d > 0 ? 'over' : ''}">${s}</span><span>${name}</span><span class="num">總計 ${fmtToPar(tot)}</span></div>`;
      }).join('') + (g.cfg.mode === 'match' && g.players.length === 2 ? `<div class="hr-match">${g.matchStatus === 0 ? 'ALL SQUARE' : escapeHtml(g.players[g.matchStatus > 0 ? 0 : 1].user) + ' ' + Math.abs(g.matchStatus) + ' UP'}</div>` : '');
      $('hr-card').innerHTML = scorecardHtml(g);
      const btn = $('hr-next');
      const canGo = last || g.authority;
      btn.disabled = !canGo;
      btn.textContent = last ? '查看成績' : canGo ? '下一洞' : '等待主機…';
      btn.onclick = () => { box.classList.remove('open'); res(); };
      box.classList.add('open');
    });
  },
  closeHoleResult() { $('dlg-hole').classList.remove('open'); },
  // 挑戰結果：星星一顆一顆亮起、每個條件有沒有達成
  showChallengeResult(g, r) {
    const lv = g.level, box = $('dlg-chal');
    const nextLv = LEVELS[lv.n];
    const ok = r.stars > 0;
    $('cr-body').innerHTML = `<div class="cr-head"><small>第 ${lv.n} 關 · ${escapeHtml(lv.title)}</small><h3>${ok ? (r.stars === 3 ? '完美通關' : '挑戰成功') : '挑戰失敗'}</h3></div>
      <div class="cr-stars">${[0, 1, 2].map(i => `<span class="big-star ${i < r.stars ? 'on' : ''}" style="animation-delay:${0.25 + i * 0.35}s">${STAR}</span>`).join('')}</div>
      <div class="cr-goals">${lv.goals.map((x, i) => `<div class="crg ${r.met[i] ? 'ok' : ''}"><span class="crg-star">${STAR}</span><span>${escapeHtml(x.text)}</span><b>${r.met[i] ? '達成' : '未達成'}</b></div>`).join('')}</div>
      <p class="small center">${r.att.holed ? `${r.att.strokes} 桿進洞` : '沒有進洞'}${r.stars > r.before ? `　·　最佳紀錄更新為 ${r.stars} 星` : r.before ? `　·　最佳紀錄 ${r.before} 星` : ''}　·　挑戰總星數 ${chal().total}</p>`;
    const unlockedNext = nextLv && (chal().stars[lv.id] || 0) >= 1;
    $('cr-next').classList.toggle('hidden', !unlockedNext);
    const leave = () => { box.classList.remove('open'); game.quit(); };
    $('cr-retry').onclick = () => { leave(); startChallenge(lv); };
    $('cr-next').onclick = () => { leave(); openLevel(nextLv); show('scr-chal'); renderChallenge(); };
    $('cr-list').onclick = () => { leave(); openChallenge(); };
    box.classList.add('open');
  },
  // 主機離開後由自己判定：「等待主機…」的按鈕改成可以按
  enableHoleNext() {
    const btn = $('hr-next');
    if (btn.disabled) { btn.disabled = false; btn.textContent = '下一洞'; }
  },
  async showRoundResult(g) {
    show('scr-game');
    const box = $('dlg-round');
    $('rr-card').innerHTML = scorecardHtml(g);
    const mine = g.players.find(p => p.local);
    const sum = g.roundSummary(mine);
    $('rr-sum').innerHTML = `<div><span>總桿數</span><b class="num">${sum.strokes}</b></div><div><span>對標準桿</span><b class="num">${fmtToPar(sum.toPar)}</b></div><div><span>推桿</span><b class="num">${sum.putts}</b></div><div><span>上球道</span><b class="num">${sum.fairways}</b></div><div><span>標準桿上果嶺</span><b class="num">${sum.gir}</b></div>`;
    $('rr-save').textContent = '儲存成績中…';
    box.classList.add('open');
    try {
      const r = await call('saveRound', { round: sum });
      session.profile = r.profile;
      myBest.at = 0;          // 回大廳時重新算最佳 18 洞
      prefetch(['getRounds', 'getRankings']);      // 新的回合：背景更新回合紀錄與排行
      $('rr-save').textContent = r.earned ? `成績已儲存，獲得 ${r.earned} 能力點！` : '成績已儲存';
    } catch (e) { $('rr-save').textContent = '儲存失敗：' + e.message; }
  },
};

async function ensureWorld() {
  if (world) return;
  ui.loading(true, '載入球場材質…', 0);
  let n = 0;
  world = new World($('gl'), getSetting('quality', 'high'));
  await world.init(() => ui.loading(true, '載入球場材質…', ++n / 7));
  hud = new Hud();
  game = new Game(world, hud, ui);
}

async function startGame(cfg, players, netObj = null, isHost = true, resume = null) {
  show('scr-game');
  document.body.toggleAttribute('data-practice', !!cfg.practice);
  await ensureWorld();
  await game.start(cfg, players, netObj, isHost, resume);
}

function initGameMenu() {
  $('btn-menu').onclick = () => {
    $('gm-card').innerHTML = game ? scorecardHtml(game) : '';
    // 挑戰模式：可以直接重新挑戰這一關；離開按鈕改成「放棄挑戰」
    const lv = game && game.level;
    $('gm-retry').classList.toggle('hidden', !lv);
    $('gm-quit').textContent = game.cfg.preview ? '回編輯器' : lv ? '放棄挑戰' : '離開回合';
    // 真實球場：這一洞的打法建議（依球場官網介紹整理）
    const sp = game && game.hole && game.hole.spec;
    $('gm-tip').classList.toggle('hidden', !(sp && sp.tip));
    if (sp && sp.tip) $('gm-tip').innerHTML = `<b>第 ${game.holeNo} 洞${game.hole.greenSide ? `（今日${game.hole.greenSide}果嶺）` : ''} · PAR ${game.hole.par}</b><span>${escapeHtml(sp.note || '')}</span><p>${escapeHtml(sp.tip)}</p>`;
    // 連線模式：顯示遊戲間驗證碼，不小心離開時用「加入遊戲」輸入這組號碼就能回來接續
    const code = game && game.net && game.net.code;
    $('gm-room').classList.toggle('hidden', !code);
    if (code) $('gm-room').innerHTML = `遊戲間驗證碼 <b class="num">${code.slice(0, 3)} ${code.slice(3)}</b><span>不小心離開時，到大廳「加入遊戲」輸入這組號碼，就能回來接續比賽</span>`;
    $('dlg-menu').classList.add('open');
  };
  $('gm-close').onclick = () => $('dlg-menu').classList.remove('open');
  $('gm-retry').onclick = () => {
    const lv = game.level;
    if (!lv || !confirm('從第 1 桿重新挑戰這一關？')) return;
    $('dlg-menu').classList.remove('open');
    game.quit();
    startChallenge(lv);
  };
  $('gm-quit').onclick = () => {
    if (game.cfg.preview) return ui.exitPreview();
    const other = game.net && game.players.find(p => !p.local && !p.away);
    const text = other
      ? `確定離開這一場比賽？

離開後 ${other.user} 會改成一個人打完剩下的洞，你的成績不會儲存。
要回來接續的話，到大廳「加入遊戲」輸入驗證碼 ${game.net.code}；你沒打到的洞會比照 ${other.user} 的桿數。`
      : game.level ? '確定放棄這一次挑戰？' : '確定離開這一回合？目前成績不會儲存。';
    if (!confirm(text)) return;
    $('dlg-menu').classList.remove('open');
    if (game.net) game.net.send({ t: 'leave' });
    const wasChal = !!game.level;
    game.quit();
    net = null;
    if (wasChal) openChallenge(); else enterLobby();
  };
  $('rr-done').onclick = () => { $('dlg-round').classList.remove('open'); game.quit(); net = null; enterLobby(); };
}

function scorecardHtml(g) {
  const idx = g.holeList;
  const c = g.course;
  const nines = [];
  for (let i = 0; i < idx.length; i += 9) nines.push(idx.slice(i, i + 9).map((h, j) => ({ h, k: i + j })));
  const mark = (s, par) => {
    if (!s) return '';
    const d = s - par;
    return `<span class="s ${d <= -2 ? 'ea' : d === -1 ? 'bi' : d === 1 ? 'bo' : d >= 2 ? 'db' : ''}">${s}</span>`;
  };
  let html = '';
  for (const nine of nines) {
    const label = nine[0].h < 9 ? 'OUT' : 'IN';
    html += '<table class="sc"><thead><tr><th class="l">HOLE</th>' + nine.map(x => `<th>${x.h + 1}</th>`).join('') + `<th>${label}</th></tr></thead><tbody>`;
    html += '<tr class="yd"><td class="l">碼數</td>' + nine.map(x => `<td>${teeYards(c, x.h, g.cfg.tee)}</td>`).join('') + `<td class="tot">${nine.reduce((s, x) => s + teeYards(c, x.h, g.cfg.tee), 0)}</td></tr>`;
    html += '<tr class="par"><td class="l">PAR</td>' + nine.map(x => `<td>${c.holes[x.h][0]}</td>`).join('') + `<td class="tot">${nine.reduce((s, x) => s + c.holes[x.h][0], 0)}</td></tr>`;
    html += '<tr class="hcp"><td class="l">HCP</td>' + nine.map(x => `<td>${c.holes[x.h][4]}</td>`).join('') + '<td class="tot"></td></tr>';
    for (const p of g.players) {
      const tot = nine.reduce((s, x) => s + (p.scores[x.k] || 0), 0);
      html += `<tr><td class="l"><b>${escapeHtml(p.user)}</b></td>` + nine.map(x => `<td>${mark(p.scores[x.k], c.holes[x.h][0])}</td>`).join('') + `<td class="tot num">${tot || ''}</td></tr>`;
    }
    html += '</tbody></table>';
  }
  return html;
}

// ---------------- 角色與素質 ----------------
let draft = null, preview = null;
function openChar() {
  const p = session.profile;
  setCharTab('stats');
  draft = { stats: normalizeStats(p.stats), base: normalizeStats(p.stats), look: { ...DEFAULT_LOOK, ...p.look }, points: p.points, respecs: p.respecs ?? START_RESPECS, respecUsed: false };
  previewPick = null;
  renderChar();
  show('scr-char');
}

// 角色頁分頁：能力值 / 外觀（外觀才開 3D 預覽，省電）
function setCharTab(t) {
  $('ch-body').dataset.ct = t;
  $('ch-tabs').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.ct === t));
  if (t === 'look') { if (!preview) startPreview(); } else stopPreview();
}

// 外觀色塊（角色頁與星星商店共用）
function gearSwatch(sk) {
  if (sk.slot === 'ball') {
    const c = sk.std ? '#ffffff' : '#' + sk.color.toString(16).padStart(6, '0'), gl = sk.glow ? '#' + sk.glow.toString(16).padStart(6, '0') : 'transparent';
    const bg = sk.trail === 'rainbow' ? 'conic-gradient(#ff6a6a,#ffd66a,#6aff9a,#6ad8ff,#b06aff,#ff6a6a)'
      : sk.trail === 'galaxy' ? 'radial-gradient(circle at 28% 32%, #fff 0 1.5px, transparent 2.5px), radial-gradient(circle at 66% 58%, #fff 0 1px, transparent 2px), radial-gradient(circle at 46% 74%, #d8f0ff 0 1px, transparent 2px), radial-gradient(circle at 72% 28%, #ffd8f8 0 1px, transparent 2px), radial-gradient(circle at 40% 40%, #9a5aff 0, #3a1478 55%, #12062a 100%)'
        : `radial-gradient(circle at 35% 30%, #fff 0, ${c} 45%, ${gl} 100%)`;
    return `<i class="gs ball" style="background:${bg};${sk.glow ? `box-shadow:0 0 10px ${gl}` : ''}"></i>`;
  }
  const h = sk.std ? '#2a2c30' : '#' + sk.head.toString(16).padStart(6, '0'), gl = sk.glow ? '#' + sk.glow.toString(16).padStart(6, '0') : null;
  const band = sk.slot === 'chipper' ? `--b:${gl || (sk.shaft ? '#' + sk.shaft.toString(16).padStart(6, '0') : '#d6a838')};` : '';      // 寶刀的飾帶色
  return `<i class="gs club ${sk.slot}" style="--h:${sk.slot === 'chipper' && sk.std ? '#b8bcc0' : h};--g:${gl || 'transparent'};${band}${gl ? `box-shadow:0 0 10px ${gl}` : ''}"></i>`;
}

// 球具與高爾夫球：清單模式，分五類（平常收起，點類別才展開）；點一項就在上面的 3D 預覽看外觀與特效，已擁有的可以直接裝備
const GEAR_CAT = { driver: '木桿', iron: '鐵桿', putter: '推桿', chipper: '寶刀', ball: '高爾夫球' };
const gearOpen = new Set();
let previewPick = null;          // 預覽中的外觀 { slot, id }（還沒裝備也可以看）
function gearHtml() {
  return `<h4 class="gear-h">球具與高爾夫球</h4><div class="gear-bal">可用星星 <b class="num">${starBalance()}</b> 顆</div>
    <p class="small gear-tip">點一項可以在上面的預覽看外觀與特效；已擁有的按「裝備」換上。</p>` + Object.keys(GEAR_CAT).map(slot => {
    const list = SKINS.filter(x => x.slot === slot), cur = skinById(slot, draft.look[LOOK_KEY[slot]]);
    const open = gearOpen.has(slot), owned = list.filter(skinUnlocked).length;
    return `<div class="gx ${open ? 'open' : ''}">
      <button class="gx-head" data-gx="${slot}">${gearSwatch(cur)}<span class="gx-t"><b>${GEAR_CAT[slot]}</b><small>裝備中：${escapeHtml(cur.name)}</small></span><span class="gx-cnt num">${owned} / ${list.length}</span><i class="cp-arrow"></i></button>
      <div class="gx-list">${open ? list.map(sk => {
        const got = skinUnlocked(sk), on = cur.id === sk.id, sel = previewPick && previewPick.slot === slot && previewPick.id === sk.id;
        const how = sk.std ? '' : sk.price ? `<em class="gtag star">星星 ${sk.price}</em>` : '<em class="gtag ach">成就</em>';
        return `<div class="gx-row ${on ? 'on' : ''} ${got ? '' : 'locked'} ${sel ? 'sel' : ''}">
          <button class="gx-main" data-slot="${slot}" data-skin="${sk.id}">${gearSwatch(sk)}<span class="gx-t"><b>${escapeHtml(sk.name)}${sk.fx ? `<i class="sh-fx">${FX_NAME[sk.fx]}</i>` : ''}</b><small>${on ? '裝備中' : got ? '已擁有' : '尚未取得'}</small></span>${how}</button>
          ${sel ? `<div class="gx-act">${got && !on ? `<button class="btn brass" data-eq="1">裝備</button>` : on ? '<span class="gx-on">目前裝備中</span>' : ''}<button class="btn ghost-dark" data-info="1">${got ? '詳細' : sk.price ? '詳細 / 購買' : '取得方式'}</button></div>` : ''}
        </div>`;
      }).join('') : ''}</div></div>`;
  }).join('');
}
function bindGear() {
  $('ch-gear').querySelectorAll('[data-gx]').forEach(b => b.onclick = () => { const k = b.dataset.gx; gearOpen.has(k) ? gearOpen.delete(k) : gearOpen.add(k); renderGear(); });
  $('ch-gear').querySelectorAll('[data-skin]').forEach(b => b.onclick = () => { previewPick = { slot: b.dataset.slot, id: b.dataset.skin }; renderGear(); applyPreviewPick(); });
  const sel = previewPick && SKINS.find(x => x.slot === previewPick.slot && x.id === previewPick.id);
  $('ch-gear').querySelector('[data-eq]')?.addEventListener('click', () => skinAct('equip', sel));
  $('ch-gear').querySelector('[data-info]')?.addEventListener('click', () => openSkin(sel.slot, sel.id));
}
function renderGear() { $('ch-gear').innerHTML = gearHtml(); bindGear(); }

// ---------------- 星星商店 ----------------
// 挑戰模式拿到的星星可以買球桿與球的外觀；買了在這裡就能直接裝備
let shopSlot = 'driver';
function openShop() {
  const p = session.profile;
  draft = { stats: normalizeStats(p.stats), base: normalizeStats(p.stats), look: { ...DEFAULT_LOOK, ...p.look }, points: p.points, respecs: p.respecs ?? START_RESPECS, respecUsed: false };
  show('scr-shop');
  renderShop();
}
function renderShop() {
  const bal = starBalance();
  $('sh-bal').innerHTML = `可用星星 <b class="num">${bal}</b> 顆`;
  $('sh-tabs').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.slot === shopSlot));
  const cur = skinById(shopSlot, draft.look[LOOK_KEY[shopSlot]]).id;
  const items = SKINS.filter(x => x.slot === shopSlot && x.price).sort((a, b) => a.price - b.price);
  $('sh-list').innerHTML = items.map(sk => {
    const got = skinUnlocked(sk), on = cur === sk.id;
    const right = on ? '<em class="sh-st on">裝備中</em>' : got ? '<em class="sh-st">已擁有</em>'
      : `<em class="sh-price ${bal < sk.price ? 'short' : ''}"><span class="num">${sk.price}</span>${STAR}</em>`;
    return `<button class="sh-row ${got ? 'got' : ''} ${on ? 'on' : ''}" data-skin="${sk.id}">${gearSwatch(sk)}
      <span class="sh-t"><b>${sk.name}${sk.fx ? `<i class="sh-fx">${FX_NAME[sk.fx]}</i>` : ''}</b><small>${escapeHtml(skinDesc(sk) || '')}</small></span>${right}</button>`;
  }).join('');
  $('sh-list').querySelectorAll('[data-skin]').forEach(b => b.onclick = () => openSkin(shopSlot, b.dataset.skin));
}
const refreshSkins = () => $('scr-shop').classList.contains('active') ? renderShop() : renderChar();

// 外觀詳細視窗：大圖、介紹、取得方式（成就進度 / 星星價格），按鈕：裝備、卸下、購買、關閉
function openSkin(slot, id) {
  const sk = SKINS.find(x => x.slot === slot && x.id === id);
  const got = skinUnlocked(sk), cur = skinById(slot, draft.look[LOOK_KEY[slot]]).id === sk.id;
  const a = sk.ach && achById(sk.ach);
  let how = '';
  if (sk.std) how = '一開始就擁有。';
  else if (a) {
    const pr = a.cnt && a.n > 1 ? `<div class="ach-bar big"><i style="width:${progressOf(a) / a.n * 100}%"></i><span class="num">${progressOf(a)} / ${a.n}</span></div>` : '';
    how = `<b>達成成就「${a.name}」</b><span>${a.desc}</span>${pr}`;
  } else how = `<b>用 ${sk.price} 顆星星購買</b><span>你現在有 ${starBalance()} 顆可以用的星星。星星在挑戰模式取得，買外觀不會減少排行上的總星數。</span>`;
  $('sk-body').innerHTML = `<div class="sk-show">${gearSwatch(sk).replace('class="gs', 'class="gs big')}</div>
    <small class="sk-slot">${SLOT_NAME[slot]}</small><h3>${sk.name}</h3>
    <div class="sk-tags">${sk.std ? '<em class="gtag">預設</em>' : sk.price ? `<em class="gtag star big">星星商店 · ${sk.price} 顆</em>` : '<em class="gtag ach big">成就解鎖</em>'}${sk.fx ? `<em class="gtag fx big">特效：${FX_NAME[sk.fx]}</em>` : ''}</div>
    <p class="sk-desc">${skinDesc(sk) || '標準外觀。'}</p>${sk.fx ? `<p class="sk-fx">裝備後，${sk.slot === 'ball' ? '球在飛行時會拖著' : '桿頭會飄出'}「${FX_NAME[sk.fx]}」的小特效，${sk.slot === 'ball' ? '靜止時也會偶爾閃一下' : '揮桿時特別明顯'}。只是外觀，不影響打球。</p>` : ''}
    <div class="sk-state ${got ? 'ok' : ''}">${cur ? '目前裝備中' : got ? '已擁有' : '尚未取得'}</div>
    <div class="sk-how"><small>取得方式</small>${how}</div>`;
  const btns = [];
  if (got && !cur) btns.push(`<button class="btn brass" data-act="equip">裝備</button>`);
  if (got && cur && !sk.std) btns.push(`<button class="btn ghost-dark" data-act="unequip">卸下（換回標準）</button>`);
  if (!got && sk.price) btns.push(`<button class="btn brass" data-act="buy" ${starBalance() < sk.price ? 'disabled' : ''}>${starBalance() < sk.price ? `星星不足（還差 ${sk.price - starBalance()} 顆）` : `用 ${sk.price} 顆星星購買`}</button>`);
  btns.push('<button class="btn ghost-dark" data-act="close">關閉</button>');
  $('sk-btns').innerHTML = btns.join('');
  $('sk-btns').querySelectorAll('[data-act]').forEach(b => b.onclick = () => skinAct(b.dataset.act, sk));
  $('dlg-skin').classList.add('open');
}
async function skinAct(act, sk) {
  if (act === 'close') { $('dlg-skin').classList.remove('open'); return; }
  if (act === 'buy') {
    if (!confirm(`用 ${sk.price} 顆星星購買「${sk.name}」？`)) return;
    if (!buySkin(sk)) { alert('星星不足'); return; }
    openSkin(sk.slot, sk.id);
    refreshSkins();
    return;
  }
  draft.look[LOOK_KEY[sk.slot]] = act === 'equip' ? sk.id : 'std';
  if (preview && preview.golfer.setClubSkins) preview.golfer.setClubSkins(equippedSkins(draft.look));
  // 外觀直接存（素質的變更還是要按「儲存」）
  try {
    const p = session.profile;
    const r = await call('saveProfile', { profile: { stats: p.stats, look: draft.look, points: p.points, respecs: p.respecs, spent: p.spent } });
    session.profile = { ...session.profile, ...r };
  } catch (e) { msg('ch-msg', e.message); }
  $('dlg-skin').classList.remove('open');
  refreshSkins();
}

function renderChar() {
  $('ch-points').textContent = draft.points;
  $('ch-respecs').textContent = draft.respecs;
  let html = '', group = '';
  for (const s of STATS) {
    if (s.group !== group) { group = s.group; html += `<h4>${group}</h4>`; }
    const v = draft.stats[s.key];
    const cost = v < MAX ? costFor(v) : 0;
    html += `<div class="stat">
      <button class="sn" data-open="${s.key}"><b>${s.name} <i class="sn-i">${draft.open === s.key ? "▾" : "ⓘ"}</i></b><span>${s.en}</span></button>
      <div class="sbar"><i style="width:${(v - 0) / MAX * 100}%"></i><em style="left:${BASE / MAX * 100}%"></em></div>
      <b class="sv num">${v}</b>
      <button class="sb" data-k="${s.key}" data-d="-1" ${v <= draft.base[s.key] ? 'disabled' : ''}>−</button>
      <button class="sb" data-k="${s.key}" data-d="1" ${v >= MAX || cost > draft.points ? 'disabled' : ''}>＋<small>${cost || ''}</small></button>
      <p>${s.desc}</p>${draft.open === s.key ? statDetailHtml(s, v) : ''}</div>`;
  }
  $('ch-stats').innerHTML = html;
  // 點素質名稱：展開 / 收起詳細說明與公式
  $('ch-stats').querySelectorAll('[data-open]').forEach(b => b.onclick = () => { draft.open = draft.open === b.dataset.open ? null : b.dataset.open; renderChar(); });
  $('ch-stats').querySelectorAll('.sb').forEach(b => b.onclick = () => {
    const k = b.dataset.k, d = Number(b.dataset.d);
    const v = draft.stats[k];
    if (d > 0) { const c = costFor(v); if (c <= draft.points && v < MAX) { draft.stats[k]++; draft.points -= c; } }
    else if (v > draft.base[k]) { draft.stats[k]--; draft.points += costFor(v - 1); }
    renderChar();
  });
  const look = draft.look;
  const sw = (key, list) => `<div class="look-row"><span>${{ skin: '膚色', hair: '髮色', shirt: '上衣', pants: '褲子', cap: '帽子' }[key]}</span>${list.map(c => `<button class="swatch ${look[key] === c ? 'on' : ''}" style="background:${c}" data-lk="${key}" data-lv="${c}"></button>`).join('')}</div>`;
  // 角色選擇（寫實角色外觀由模型決定；只有經典角色可以換顏色）
  const model = characterDef(look.model).id;
  const pick = `<div class="look-row char-pick"><span>角色</span>${CHARACTERS.map(c => `<button class="chip ${model === c.id ? 'on' : ''}" data-model="${c.id}">${c.name}</button>`).join('')}</div>`;
  const colors = model === 'classic'
    ? `<div class="look-row"><span>體型</span>${LOOK_OPTIONS.body.map(([v, l]) => `<button class="chip ${look.body === v ? 'on' : ''}" data-lk="body" data-lv="${v}">${l}</button>`).join('')}</div>` + ['skin', 'hair', 'shirt', 'pants', 'cap'].map(k => sw(k, LOOK_OPTIONS[k])).join('')
    : '<p class="small">寫實角色的外觀由模型決定。第一次選用要下載約 1.5～6MB，之後會存在手機裡。</p>';
  $('ch-look').innerHTML = pick + colors;
  $('ch-look').querySelectorAll('[data-model]').forEach(b => b.onclick = () => {
    if (draft.look.model === b.dataset.model) return;
    draft.look.model = b.dataset.model;
    renderChar();
    stopPreview(); startPreview();
  });
  $('ch-look').querySelectorAll('[data-lk]').forEach(b => b.onclick = () => { draft.look[b.dataset.lk] = b.dataset.lv; renderChar(); if (preview) preview.golfer.setLook(draft.look); });
  renderGear();
}

// 素質詳細說明：影響什麼、公式、你目前的數值實際等於多少
function statDetailHtml(s, v) {
  const d = STAT_DETAIL[s.key];
  if (!d) return '';
  const row = (label, val) => `<div class="sd-row"><span>${label}</span><b>${d.effect(val)}</b></div>`;
  return `<div class="sd">
    <p class="sd-text">${d.detail}</p>
    <div class="sd-f"><small>公式</small><pre>${escapeHtml(d.formula)}</pre></div>
    ${row(`目前 ${v}`, v)}
    ${v < MAX ? row(`升 1 點 → ${v + 1}`, v + 1) : ''}
    ${v !== BASE ? row(`基準 ${BASE}`, BASE) : ''}
    ${v !== MAX ? row(`上限 ${MAX}`, MAX) : ''}
  </div>`;
}

function initChar() {
  $('ch-tabs').querySelectorAll('button').forEach(b => b.onclick = () => setCharTab(b.dataset.ct));
  $('ch-respec').onclick = () => {
    if (draft.respecs <= 0) return alert('重新分配次數已用完，請找管理員');
    if (!confirm(`重新分配會把所有素質重設為 ${BASE}、退回全部已用能力點，並消耗 1 次機會（剩 ${draft.respecs} 次）。確定？`)) return;
    const spent = spentFor(draft.base);
    const pendingSpent = spentFor(draft.stats) - spent;
    draft.points += spent + pendingSpent;
    draft.stats = normalizeStats({});
    draft.base = normalizeStats({});
    draft.respecs--;
    draft.respecUsed = true;
    renderChar();
  };
  $('ch-save').onclick = () => busy('ch-save', async () => {
    try {
      const p = await call('saveProfile', { profile: { stats: draft.stats, look: draft.look, points: draft.points, respecs: draft.respecs, spent: spentFor(draft.stats) } });
      session.profile = p;
      draft.base = normalizeStats(p.stats);
      draft.points = p.points;
      msg('ch-msg', '已儲存', true);
      renderChar();
    } catch (e) { msg('ch-msg', e.message); }
  });
}

// 角色預覽：整個角色頁共用一個 WebGL 繪圖器（同一個畫布不能重建，否則舊的設定會殘留，手機上會畫成放大的局部）
let previewRenderer = null;
function startPreview() {
  if (preview) return;
  const cv = $('ch-canvas');
  if (!previewRenderer) {
    previewRenderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    previewRenderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    previewRenderer.outputColorSpace = THREE.SRGBColorSpace;
    previewRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    previewRenderer.shadowMap.enabled = true;
  }
  const r = previewRenderer;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445533, 1.2));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(2, 4, 3);
  sun.castShadow = true;
  scene.add(sun);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(1.4, 48), new THREE.MeshStandardMaterial({ color: 0x5f8f45, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const def = characterDef(draft.look.model);
  const ballPos = new THREE.Vector3(0, 0.021, 0);
  const me = { golfer: new ProceduralGolfer(draft.look), alive: true, scene, icon: previewIcon() };
  preview = me;
  me.golfer.setClubSkins(previewSkins());
  me.golfer.setup(ballPos, 0, me.icon === 'ball' ? 'iron' : me.icon);
  scene.add(me.golfer.object);
  if (def.file) {
    // 寫實角色：先顯示「載入中」，下載完換上去
    me.golfer.setVisible(false);
    $('ch-loading').textContent = '角色載入中…';
    $('ch-loading').classList.remove('hidden');
    const mg = new MixamoGolfer(def, { animBase: ANIM_BASE });
    mg.load().then(() => {
      if (preview !== me || !me.alive) return;       // 已經換成別的角色了
      scene.remove(me.golfer.object);
      me.golfer = mg;
      scene.add(mg.object);
      mg.setClubSkins(previewSkins());
      mg.setup(ballPos, 0, me.icon === 'ball' ? 'iron' : me.icon); mg.skipPre();
      $('ch-loading').classList.add('hidden');
    }).catch(() => { if (preview === me) $('ch-loading').textContent = '角色載入失敗'; });
  } else $('ch-loading').classList.add('hidden');
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.0213, 24, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 }));
  ball.position.set(0, 0.021, 0);
  scene.add(ball);
  // 特效粒子：在桿頭（選球時在球）旁邊往上飄
  const FN = 60, fpos = new Float32Array(FN * 3), fdat = Array.from({ length: FN }, () => ({ life: Math.random(), dx: 0, dy: 0, dz: 0, ox: 0, oy: 0, oz: 0 }));
  const fgeo = new THREE.BufferGeometry(); fgeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
  const fmat = new THREE.PointsMaterial({ size: 0.035, color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
  const fx = new THREE.Points(fgeo, fmat); fx.frustumCulled = false; scene.add(fx);
  me.ball = ball; me.fx = fx; me.ballPos = ballPos;
  applyPreviewLook(me);
  let t = 0, last = performance.now(), swingT = 0, lastW = 0, lastH = 0;
  const height = def.height || 1.78;
  const loop = now => {
    if (preview !== me || !me.alive) return;           // 舊的預覽一定要停掉，不能和新的搶著畫
    requestAnimationFrame(loop);
    const golfer = me.golfer;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;                               // 畫面還沒排好（切頁中）
    if (w !== lastW || h !== lastH) { lastW = w; lastH = h; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    // 鏡頭距離依預覽框大小算：整個人（身高 + 頭上留白）和揮桿範圍都要放得進框裡
    const vt = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)), ht = vt * cam.aspect;
    const dist = Math.max((height + 0.5) / 2 / vt, 2.4 / 2 / ht) * 1.08;
    const c = golfer.object.position.clone().lerp(ballPos, 0.25);
    c.y = height * 0.5;
    const a = t * 0.35;
    golfer.object.visible = me.icon !== 'ball';      // 選球時角色和球桿先藏起來，只看球
    if (me.icon === 'ball') {
      // 選球：鏡頭貼近球、慢慢繞一圈
      cam.position.set(ballPos.x + Math.sin(a) * 0.42, 0.16, ballPos.z + Math.cos(a) * 0.42); cam.lookAt(ballPos.x, 0.03, ballPos.z);
      ball.rotation.y = t * 1.5;
    } else {
      cam.position.set(c.x + Math.sin(a) * dist, c.y + dist * 0.12, c.z + Math.cos(a) * dist);
      cam.lookAt(c);
    }
    // 特效粒子
    if (fx.visible) {
      const head = me.icon === 'ball' ? ball.position : (golfer.clubHead && golfer.clubHead() ? golfer.clubHead().getWorldPosition(new THREE.Vector3()) : ballPos);
      for (let i = 0; i < FN; i++) {
        const d = fdat[i]; d.life += dt * (0.6 + (i % 5) * 0.12);
        if (d.life >= 1) { d.life = 0; d.ox = head.x; d.oy = head.y; d.oz = head.z; d.dx = (Math.random() - 0.5) * 0.12; d.dy = 0.05 + Math.random() * 0.12; d.dz = (Math.random() - 0.5) * 0.12; }
        fpos[i * 3] = d.ox + d.dx * d.life * 3; fpos[i * 3 + 1] = d.oy + d.dy * d.life * 3; fpos[i * 3 + 2] = d.oz + d.dz * d.life * 3;
      }
      fgeo.attributes.position.needsUpdate = true;
      if (me.fxKind === 'rainbow') fmat.color.setHSL((t * 0.3) % 1, 0.9, 0.65);
      fmat.size = me.icon === 'ball' ? 0.012 : 0.035;
    }
    // 每 7 秒示範一次揮桿（寫實角色也一樣：停在準備姿勢 → 上桿 → 揮桿）
    swingT += dt;
    if (swingT > 7) { swingT = 0; golfer.finished = false; golfer.setup(ballPos, 0, me.icon === 'ball' ? 'iron' : me.icon); if (golfer.skipPre) golfer.skipPre(); }
    else if (swingT > 2 && swingT < 3) golfer.setBackswing((swingT - 2) / 1);
    else if (swingT >= 3 && !golfer.anim && !golfer.swinging && !golfer.finished) golfer.swing(() => {});
    golfer.update(dt);
    r.render(scene, cam);
  };
  requestAnimationFrame(loop);
}

// 預覽用的外觀：裝備中的，加上清單裡點選的那一項
function previewSkins() {
  const sk = equippedSkins(draft.look);
  if (previewPick) { const s = SKINS.find(x => x.slot === previewPick.slot && x.id === previewPick.id); if (s) sk[previewPick.slot] = s; }
  return sk;
}
// 預覽角色手上拿哪一種桿（推桿、寶刀用推桿站姿）；選球時鏡頭改拍球
const previewIcon = () => !previewPick ? 'iron' : { driver: 'driver', iron: 'iron', putter: 'putter', chipper: 'chipper', ball: 'ball' }[previewPick.slot];
const FX_COLOR = { gold: 0xffd060, frost: 0x9ad8ff, galaxy: 0xb07aff, ember: 0xff7a2a, void: 0x9a4aff, moon: 0xe0e8ff, petal: 0xffb8d0, firefly: 0xc8ff6a, spore: 0xff8ae0,
  portal: 0xb87aff, star: 0xfff0a0, rainbow: 0xff6ae0, neon: 0x4ae8ff, aurora: 0x6affb0, sun: 0xffc040 };
function applyPreviewLook(me) {
  const sk = previewSkins(), b = sk.ball;
  me.ball.material.color.set(b.std ? 0xffffff : b.color);
  me.ball.material.emissive.set(b.glow || 0x000000); me.ball.material.emissiveIntensity = b.glow ? 0.6 : 0;
  // 特效：選了哪一項就看那一項的特效；沒選就看手上這支桿
  const slot = previewPick ? previewPick.slot : 'iron', fxk = sk[slot] && sk[slot].fx;
  me.fxKind = fxk; me.fx.visible = !!fxk;
  if (fxk) me.fx.material.color.set(FX_COLOR[fxk] || 0xffffff);
}
function applyPreviewPick() {
  const me = preview;
  if (!me) return;
  me.icon = previewIcon();
  me.golfer.setClubSkins(previewSkins());
  me.golfer.finished = false;
  me.golfer.setup(me.ballPos, 0, me.icon === 'ball' ? 'iron' : me.icon);
  if (me.golfer.skipPre) me.golfer.skipPre();
  applyPreviewLook(me);
}

function stopPreview() {
  if (!preview) return;
  preview.alive = false;
  preview = null;
}

// ---------------- 紀錄 ----------------
let rcTab = 'rounds';
async function openRecords() {
  show('scr-records');
  $('rc-tabs').querySelectorAll('button').forEach(b => b.onclick = () => { rcTab = b.dataset.rc; renderRecords(); });
  renderRecords();
}

async function renderRecords() {
  $('rc-tabs').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.rc === rcTab));
  if (rcTab === 'ach') { $('rc-list').innerHTML = achHtml(); return; }
  if (rcTab === 'real') { renderRealTab($('rc-list'), () => rcTab === 'real' && document.body.dataset.screen === 'scr-records'); return; }
  if (rcTab === 'pass') { $('rc-list').innerHTML = passportHtml(); $('rc-list').querySelectorAll('[data-sp]').forEach(b => b.onclick = () => openStamp(b)); return; }
  const draw = list => { $('rc-list').innerHTML = list.length ? list.map(r => `
      <div class="rec"><div><b>${escapeHtml(r.course)}</b><span>${new Date(r.date).toLocaleDateString()} · ${r.holes} 洞 · ${escapeHtml(r.mode)}${r.partners ? ' · 與 ' + escapeHtml(r.partners) : ''}</span></div>
      <div class="rs"><b class="num">${r.strokes}</b><span class="num">${fmtToPar(Number(r.toPar))}</span></div>
      <div class="rx">推桿 ${r.putts} · 上球道 ${r.fairways} · GIR ${r.gir}</div></div>`).join('') : '<p class="small">還沒有紀錄，去打一場吧！</p>'; };
  // 先畫上次讀到的，背景更新回來再換上（還停在回合紀錄分頁才重畫）
  const old = peek('getRounds');
  if (old) draw(old); else $('rc-list').innerHTML = '<p class="small">讀取中…</p>';
  try {
    const list = await refresh('getRounds');
    if (rcTab === 'rounds' && document.body.dataset.screen === 'scr-records') draw(list);
  } catch (e) { if (!old) $('rc-list').innerHTML = `<p class="err">${escapeHtml(e.message)}</p>`; }
}

// 成就：依分類列成清單（一列一個：小徽章、名稱與說明、右邊是進度 / 獎勵 / 達成日期），不顯示難度，看徽章外觀分辨
function achHtml() {
  checkChallenge(LEVELS);
  checkCounters();
  const g = prog(), got = ACH.filter(a => g.ach[a.id]).length;
  const fmtD = d => { const t = new Date(d); return `${t.getFullYear()}.${String(t.getMonth() + 1).padStart(2, '0')}.${String(t.getDate()).padStart(2, '0')}`; };
  return `<div class="ach-sum"><b class="num">${got}</b> / ${ACH.length} 個成就已達成</div>` + ACH_CATS.map(([cat, name]) => {
    const list = ACH.filter(a => a.cat === cat);
    return `<h4 class="ach-cat">${name}<span>${list.filter(a => g.ach[a.id]).length} / ${list.length}</span></h4><div class="ach-list">${list.map(a => {
      const has = !!g.ach[a.id], skin = SKINS.find(x => x.ach === a.id);
      const reward = skin ? `解鎖「${skin.name}」` : a.pts ? `能力點 +${a.pts}` : '';
      const pr = a.cnt && a.n > 1 && !has ? `<span class="ar-pr"><i style="width:${progressOf(a) / a.n * 100}%"></i></span><span class="ar-n num">${progressOf(a)} / ${a.n}</span>` : '';
      return `<div class="ach-row ${has ? 'got' : ''}">${medalHtml(a, has)}<div class="ar-main"><b>${a.name}</b><span>${a.desc}</span></div>
        <div class="ar-side">${pr}${reward ? `<em class="${skin ? 'skin' : ''}">${reward}</em>` : ''}${has ? `<time>${fmtD(g.ach[a.id])}</time>` : ''}</div></div>`;
    }).join('')}</div>`;
  }).join('');
}

// 球場護照：每座球場打完 18 洞蓋一個章
function passportHtml() {
  const st = prog().stamps, n = PASSPORT.filter(c => stampDone(c.id)).length;
  const fmtD = d => { const t = new Date(d); return `${t.getFullYear()}.${String(t.getMonth() + 1).padStart(2, '0')}.${String(t.getDate()).padStart(2, '0')}`; };
  return `<div class="ach-sum"><b class="num">${n}</b> / ${PASSPORT.length} 個章　<span class="small">一般球場打完 18 洞就蓋章；分區球場要每一區都打完過（打 9 洞也算那一區）</span></div>` + COURSE_GROUPS.map(gr => {
    const list = PASSPORT.filter(c => c.group === gr.id);
    if (!list.length) return '';
    return `<h4 class="ach-cat">${gr.name}<span>${list.filter(c => stampDone(c.id)).length} / ${list.length}</span></h4><div class="stamp-grid">${list.map((c, i) => {
      const x = st[c.id] || {}, done = stampDone(c.id), rot = done ? ((c.id.charCodeAt(0) + c.id.length * 7) % 15) - 7 : 0;
      // 分區球場：每一區打過沒
      const nines = c.nines ? `<div class="sp-nines">${c.nines.map(nn => `<span class="${x.nines && x.nines[nn.id] ? 'on' : ''}">${escapeHtml(nn.name)}</span>`).join('')}</div>` : '';
      const left = c.nines && !done ? c.nines.filter(nn => !(x.nines && x.nines[nn.id])).map(nn => nn.name) : [];
      // 印章等級：3 / 5 / 10 次升級；下一級還差幾次
      const tn = x.n || 1, tier = stampTier(tn), nextT = STAMP_TIERS[tier + 1];
      const tierInfo = done ? `<span class="sp-tier t${tier}">${STAMP_TIERS[tier].name}${nextT ? `・再打 ${nextT.n - tn} 次升級${nextT.name}` : '・最高等級'}</span>` : '';
      const info = done ? `<span>${fmtD(x.date)} 蓋章</span>${x.best && x.best < 999 ? `<span>最佳 ${x.best} 桿 · ${tn} 場</span>` : ''}${tierInfo}`
        : left.length && left.length < c.nines.length ? `<span class="sp-left">還沒打：${left.map(escapeHtml).join('、')}</span>`
          : `<span>${c.nines ? '每一區都打完過就蓋章' : '打完 18 洞就蓋章'}</span>`;
      return `<button class="sp ${done ? 'got' : ''} ${done ? 'tier' + tier : ''}" data-sp="${c.id}">${stampSvg(c, done, tier >= 2 ? 0 : rot, tn)}<div class="sp-info"><b>${escapeHtml(c.name)}</b>${c.nines && !done ? nines : ''}</div>
        <template class="sp-detail">${stampSvg(c, done, 0, tn)}<div class="spd-t"><small>${escapeHtml(c.en || '')}</small><h3>${escapeHtml(c.name)}</h3>${nines}${info}</div></template></button>`;
    }).join('')}</div>`;
  }).join('');
}
// 點護照上的章：放大顯示章與詳細資訊（蓋章日期、最佳成績、打過幾場、印章等級、分區、球場介紹）
function openStamp(btn) {
  const c = COURSES.find(x => x.id === btn.dataset.sp), tpl = btn.querySelector('.sp-detail');
  $('sp-body').innerHTML = `<div class="spd ${btn.className.replace('sp ', '')}">${tpl.innerHTML}</div>${c && c.desc ? `<p class="spd-desc">${escapeHtml(c.desc)}</p>` : ''}`;
  $('dlg-stamp').classList.add('open');
}

// ---------------- 挑戰模式 ----------------
const STAR = '<svg viewBox="0 0 24 24"><path d="M12 2.6l2.85 6.05 6.6.78-4.88 4.55 1.3 6.55L12 17.25l-5.87 3.28 1.3-6.55L2.55 9.43l6.6-.78z"/></svg>';
const starsHtml = n => `<span class="stars">${[0, 1, 2].map(i => `<span class="st ${i < n ? 'on' : ''}">${STAR}</span>`).join('')}</span>`;
const levelOpen = lv => lv.n === 1 || (chal().stars[LEVELS[lv.n - 2].id] || 0) >= 1;
function openChallenge() {
  show('scr-chal');
  renderChallenge();
}
// 章節收合：預設只打開「最新關卡」那一章；使用者點開 / 收起的記在這裡（這次開啟 APP 有效）
let cgOpen = null;
const latestLevel = () => LEVELS.find(l => levelOpen(l) && !(chal().stars[l.id] || 0)) || [...LEVELS].reverse().find(levelOpen) || LEVELS[0];
function renderChallenge() {
  const c = chal(), latest = latestLevel(), lk = chapterOf(latest.n);
  if (!cgOpen) cgOpen = new Set([lk]);
  $('cg-stars').innerHTML = `已拿 <b>${c.total}</b> / ${LEVELS.length * 3} 顆星`;
  // 最上面：馬上玩最新的關卡
  $('cg-next').innerHTML = `<span class="cg-n num">${latest.n}</span><span class="cg-t"><small>${c.stars[latest.id] ? '全部通過了！再挑戰一次' : '繼續挑戰'}</small><b>第 ${latest.n} 關・${escapeHtml(latest.title)}</b></span><em>開始</em>`;
  $('cg-next').onclick = () => openLevel(latest);
  // 一關一列，照關卡往下排；章標題寫這一章拿了幾顆星（前 100 關每章 10 關，之後每章 20 關），點標題收合 / 展開
  $('cg-grid').innerHTML = CHAPTERS.map((C, k) => {
    const chap = LEVELS.slice(C.from - 1, C.to), got = chap.reduce((a, l) => a + (c.stars[l.id] || 0), 0), open = cgOpen.has(k);
    const unlocked = levelOpen(chap[0]);
    return `<div class="cg-chap ${open ? 'open' : ''} ${unlocked ? '' : 'locked'}">
      <button class="cg-ch" data-ch="${k}"><span>第 ${k + 1} 章・${C.name}${k === lk ? '<i class="cg-now">進行中</i>' : ''}</span><span>${got} / ${chap.length * 3}<i class="cg-arrow"></i></span></button>
      <div class="cg-list">${open ? chap.map(lv => {
        const lo = levelOpen(lv), n = c.stars[lv.id] || 0;
        return `<button class="cg-card ${lo ? '' : 'locked'} ${n === 3 ? 'full' : ''} ${lv === latest ? 'now' : ''}" data-lv="${lv.id}" ${lo ? '' : 'disabled'}>
          <span class="cg-n num">${lv.n}</span><span class="cg-t"><b>${escapeHtml(lv.title)}</b><small>${THEME_NAME[lv.theme] || ''} · PAR ${lv.par} · ${lv.yards} Y</small></span>
          ${lo ? starsHtml(n) : `<em>通過第 ${lv.n - 1} 關後開放</em>`}</button>`;
      }).join('') : ''}</div></div>`;
  }).join('');
  $('cg-grid').querySelectorAll('[data-ch]').forEach(b => b.onclick = () => { const k = +b.dataset.ch; cgOpen.has(k) ? cgOpen.delete(k) : cgOpen.add(k); renderChallenge(); });
  $('cg-grid').querySelectorAll('[data-lv]').forEach(b => b.onclick = () => openLevel(levelById(b.dataset.lv)));
}
function openLevel(lv) {
  const c = chal(), n = c.stars[lv.id] || 0;
  const tag = THEME_NAME[lv.theme] || '';
  const rules = [`限 ${lv.max} 桿`, lv.clubs ? `只能用 ${lv.clubs.map(id => clubById(id).zh).join('、')}` : '', lv.wind ? `固定 ${lv.wind.mph} mph ${{ L: '左側風', R: '右側風', H: '逆風', T: '順風' }[lv.wind.from]}` : ''].filter(Boolean);
  $('lv-body').innerHTML = `<div class="lv-head"><span class="cg-n num">${lv.n}</span><div><small>${escapeHtml(lv.en)} · ${tag}</small><h3>${escapeHtml(lv.title)}</h3><span class="lv-meta">PAR ${lv.par} · ${lv.yards} Y · ${rules.join(' · ')}</span></div></div>
    <p class="lv-intro">${escapeHtml(lv.intro)}</p>
    <div class="cr-goals">${lv.goals.map((g, i) => `<div class="crg ${i < n ? 'ok' : ''}"><span class="crg-star">${STAR}</span><span>${escapeHtml(g.text)}</span></div>`).join('')}</div>
    <p class="small">${n ? `目前最佳 ${n} 星${c.best[lv.id] ? `、最少 ${c.best[lv.id]} 桿` : ''}。` : '還沒有通過這一關。'}星星要先進洞才算；同一次挑戰達成越多條件，星星越多。</p>`;
  $('lv-go').onclick = () => { $('dlg-level').classList.remove('open'); startChallenge(lv); };
  $('dlg-level').classList.add('open');
}
function startChallenge(lv) {
  const cfg = { courseId: lv.id, challenge: lv.id, holes: 'all', tee: 'white', mode: 'stroke', wind: 'course', stimp: lv.course.stimp, gimme: 0, mulligans: 0, practice: false, seed: Math.floor(Math.random() * 2 ** 31) };
  startGame(cfg, [{ ...me(), local: true }]);
}

// ---------------- 排行 ----------------
// 「排行」工作頁的每一場都單獨排名；分類與排序都在這裡做
const rank = { tab: 'total', holes: 18, course: null, rows: [], open: null };
const RK_TYPE = { hio: '一桿進洞', albatross: '信天翁', eagle: '老鷹' };
const fmtWhen = iso => { const d = new Date(iso); const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };

async function openRanking() {
  show('scr-rank');
  if (!rank.course) rank.course = 'orient';
  // 球場按分類排（台灣球場在最前面）
  // 球場排行：先選類別、再選球場（兩個下拉選單；球場太多，按鈕會排滿整個畫面）
  const groups = COURSE_GROUPS.filter(g => COURSES.some(c => c.group === g.id));
  const curGroup = (COURSES.find(c => c.id === rank.course) || {}).group || groups[0].id;
  $('rk-courses').innerHTML = `<label class="rk-pick"><span>類別</span><select id="rk-group" class="select">${groups.map(g => `<option value="${g.id}" ${g.id === curGroup ? 'selected' : ''}>${escapeHtml(g.name)}</option>`).join('')}</select></label>
    <label class="rk-pick"><span>球場</span><select id="rk-course" class="select"></select></label>`;
  const fillCourses = gid => { $('rk-course').innerHTML = COURSES.filter(c => c.group === gid).map(c => `<option value="${c.id}" ${c.id === rank.course ? 'selected' : ''}>${escapeHtml(c.name)}${c.area ? `（${escapeHtml(c.area)}）` : ''}</option>`).join(''); };
  fillCourses(curGroup);
  $('rk-tabs').querySelectorAll('button').forEach(b => b.onclick = () => { rank.tab = b.dataset.rk; rank.open = null; renderRanking(); });
  $('rk-holes').querySelectorAll('button').forEach(b => b.onclick = () => { rank.holes = Number(b.dataset.h); renderRanking(); });
  $('rk-group').onchange = e => { fillCourses(e.target.value); rank.course = $('rk-course').value; renderRanking(); };
  $('rk-course').onchange = e => { rank.course = e.target.value; renderRanking(); };
  // 先顯示上次讀到的排行，背景再向伺服器要新的；回來了就直接換上（還停在排行頁才重畫）
  const rows0 = peek('getRankings'), stars0 = peek('getStarRanking');
  if (rows0) { rank.rows = rows0; rank.stars = stars0 || []; renderRanking(); rkUpdating(true); }
  else $('rk-list').innerHTML = '<p class="small">讀取中…</p>';
  try {
    const [rows, stars] = await Promise.all([refresh('getRankings'), refresh('getStarRanking').catch(() => rank.stars || [])]);
    rank.rows = rows; rank.stars = stars;
    if (document.body.dataset.screen === 'scr-rank') renderRanking();
  } catch (e) { if (!rows0) $('rk-list').innerHTML = `<p class="err">${escapeHtml(e.message)}</p>`; }
  rkUpdating(false);
}

// 挑戰星數排行：星數多的在前，同星數比較早達到的在前
function starRankHtml() {
  const list = (rank.stars || []).filter(r => r.stars > 0).sort((a, b) => b.stars - a.stars || String(a.date).localeCompare(String(b.date)));
  if (!list.length) return '<p class="small">還沒有人拿到挑戰星星。</p>';
  return list.map((r, i) => `<div class="rk-row ${r.user === session.user ? 'me' : ''}"><span class="rk-no ${i < 3 ? 'top' + (i + 1) : ''}">${i + 1}</span><div class="rk-who"><b>${escapeHtml(r.user)}</b><span>最遠通過第 ${r.level} 關 · ${fmtWhen(r.date)}</span></div><div class="rk-score"><b class="num">${r.stars}</b><span>顆星</span></div></div>`).join('');
}

// 背景更新中：清單上方一行小字
function rkUpdating(on) { const el = $('rk-sync'); if (el) el.classList.toggle('hidden', !on); }
function renderRanking() {
  const sel = (id, attr, v) => $(id).querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset[attr] === String(v)));
  sel('rk-tabs', 'rk', rank.tab); sel('rk-holes', 'h', rank.holes);
  $('rk-holes').classList.toggle('hidden', rank.tab === 'special' || rank.tab === 'stars');
  $('rk-courses').classList.toggle('hidden', rank.tab !== 'course');
  $('rk-list').innerHTML = rank.tab === 'stars' ? starRankHtml() : rank.tab === 'special' ? specialHtml() : strokeHtml();
  $('rk-list').querySelectorAll('[data-open]').forEach(el => el.onclick = () => { rank.open = rank.open === el.dataset.open ? null : el.dataset.open; renderRanking(); });
}

// 總桿 / 球場排行：桿數少的在前；同桿數比對標準桿，再比誰先打出來
// 三桿洞球場（例如 Cliffhangers，18 洞 Par 54）桿數本來就少很多、奇幻球場有機關幫忙，都不列入總桿排行與最佳 18 洞，只在自己的球場排行裡比
const fullPar = r => !r.par || r.par >= (r.holes === 18 ? 66 : 33);
const rowCourse = r => { const id = String(r.courseId || '').split(':')[0]; return COURSES.find(c => c.id === id) || COURSES.find(c => c.name === r.course); };
const countsForTotal = r => r.rankable !== false && fullPar(r) && !['fantasy', 'custom'].includes((rowCourse(r) || {}).group) && !String(r.courseId || '').startsWith('custom_');
function strokeHtml() {
  const course = COURSES.find(c => c.id === rank.course);
  const list = rank.rows
    .filter(r => r.holes === rank.holes && (rank.tab === 'total' ? countsForTotal(r) : r.courseId === rank.course || String(r.courseId || '').startsWith(rank.course + ':') || (!r.courseId && course && r.course === course.name)))
    .sort((a, b) => a.strokes - b.strokes || a.toPar - b.toPar || new Date(a.date) - new Date(b.date))
    .slice(0, 100);
  const note = rank.tab === 'total' ? '<p class="small rk-note">三桿洞球場（例如 Cliffhangers，Par 54）與奇幻球場不列入總桿排行，請到「球場」分頁看各球場的排行。</p>' : '';
  if (!list.length) return '<p class="small rk-empty">還沒有紀錄，打完一場就會出現在這裡。</p>' + note;
  return note + list.map((r, i) => `
    <div class="rk-row ${r.user === session.user ? 'me' : ''}">
      <span class="rk-no ${i < 3 ? 'top' + (i + 1) : ''}">${i + 1}</span>
      <div class="rk-who"><b>${escapeHtml(r.user)}</b><span>${rank.tab === 'total' ? escapeHtml(r.course) + ' · ' : ''}${escapeHtml(r.range || r.holes + ' 洞')} · ${fmtWhen(r.date)}</span></div>
      <div class="rk-score"><b class="num">${r.strokes}</b><span class="num ${r.toPar < 0 ? 'under' : ''}">${fmtToPar(r.toPar)}</span></div>
    </div>`).join('');
}

// 一桿進洞 / 信天翁 / 老鷹：依帳號統計次數排行，點一下展開每一次的日期、球場、洞
function specialHtml() {
  const by = new Map();
  for (const r of rank.rows) for (const e of r.events || []) {
    if (!RK_TYPE[e.t]) continue;
    if (!by.has(r.user)) by.set(r.user, { user: r.user, hio: 0, albatross: 0, eagle: 0, list: [] });
    const u = by.get(r.user);
    u[e.t]++;
    u.list.push({ ...e, date: r.date, course: r.course });
  }
  const list = [...by.values()].sort((a, b) => (b.hio + b.albatross + b.eagle) - (a.hio + a.albatross + a.eagle) || b.hio - a.hio || b.albatross - a.albatross || a.user.localeCompare(b.user));
  if (!list.length) return '<p class="small rk-empty">還沒有人打出一桿進洞、信天翁或老鷹。</p>';
  return list.map((u, i) => {
    const open = rank.open === u.user;
    const detail = open ? `<div class="rk-detail">${u.list.sort((a, b) => new Date(b.date) - new Date(a.date)).map(e => {
      const d = new Date(e.date);
      return `<div><span class="rk-tag ${e.t}">${RK_TYPE[e.t]}</span>${d.getMonth() + 1} 月 ${d.getDate()} 日 · ${escapeHtml(e.course)} · 第 ${e.hole} 洞（Par ${e.par}）</div>`;
    }).join('')}</div>` : '';
    return `
    <div class="rk-row sp ${u.user === session.user ? 'me' : ''} ${open ? 'open' : ''}" data-open="${escapeHtml(u.user)}">
      <span class="rk-no ${i < 3 ? 'top' + (i + 1) : ''}">${i + 1}</span>
      <div class="rk-who"><b>${escapeHtml(u.user)}</b><span>點一下看紀錄 ${open ? '▴' : '▾'}</span></div>
      <div class="rk-cnt"><div><b class="num">${u.hio}</b><span>一桿進洞</span></div><div><b class="num">${u.albatross}</b><span>信天翁</span></div><div><b class="num">${u.eagle}</b><span>老鷹</span></div></div>
      ${detail}
    </div>`;
  }).join('');
}

// ---------------- 管理員 ----------------
async function openAdmin() {
  if (!session.isAdmin) return;
  show('scr-admin');
  $('ad-list').innerHTML = '<p class="small">讀取中…</p>';
  try {
    const list = await call('listAccounts');
    const pending = list.filter(a => !a.active).length;
    $('ad-pending').textContent = pending ? `● 有 ${pending} 個帳號等待核准` : '所有帳號都已處理';
    $('ad-pending').classList.toggle('none', !pending);
    $('ad-list').innerHTML = `<div class="row h"><span>帳號 A</span><span>密碼 B</span><span>啟用 C</span></div>` + list.map(a => `
      <div class="row"><b>${escapeHtml(a.user)}</b><code>${escapeHtml(a.pass)}</code>
        <button class="toggle ${a.active ? 'on' : ''} ${a.user === ADMIN_USER ? 'lock' : ''}" data-u="${escapeHtml(a.user)}" data-v="${a.active ? 1 : 0}"></button>
        <div class="ad-extra">能力點 <b>${a.points}</b> <button class="mini" data-pt="${escapeHtml(a.user)}" data-a="5">+5</button><button class="mini" data-pt="${escapeHtml(a.user)}" data-a="-5">−5</button>
        　重新分配 <b>${a.respecs}</b> <button class="mini" data-rs="${escapeHtml(a.user)}">+1</button>　回合 ${a.rounds}</div></div>`).join('');
    $('ad-list').querySelectorAll('.toggle').forEach(b => b.onclick = async () => {
      if (b.dataset.u === ADMIN_USER) return;
      try { await call('setActive', { target: b.dataset.u, value: b.dataset.v !== '1' }); openAdmin(); } catch (e) { alert(e.message); }
    });
    $('ad-list').querySelectorAll('[data-pt]').forEach(b => b.onclick = async () => { try { await call('grantPoints', { target: b.dataset.pt, amount: Number(b.dataset.a) }); openAdmin(); } catch (e) { alert(e.message); } });
    $('ad-list').querySelectorAll('[data-rs]').forEach(b => b.onclick = async () => { try { await call('grantRespecs', { target: b.dataset.rs, amount: 1 }); openAdmin(); } catch (e) { alert(e.message); } });
  } catch (e) { $('ad-list').innerHTML = `<p class="err">${escapeHtml(e.message)}</p>`; }
}

// ---------------- 啟動 ----------------
initEditor({
  show, back: openAdmin,
  // 實景：目前畫的球洞蓋成 3D，單洞練習的方式打（不記成績）
  preview: async D => {
    try {
      await previewCourse(D);
      const cfg = { courseId: PREVIEW_ID, holes: 'all', tee: 'black', mode: 'stroke', wind: 'calm', stimp: 8, gimme: 0, mulligans: 0,
        practice: false, holePractice: true, preview: true, startHole: 0, seed: Math.floor(Math.random() * 2 ** 31) };
      await startGame(cfg, [{ ...me(), local: true }]);
    } catch (e) { alert('實景載入失敗：' + e.message); resumeCanvas(); }
  },
  toast: m => { const t = document.createElement('div'); t.className = 'ed-toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2200); },
});
initAuth();
initSettings();
initLobby();
initSetup();
initRooms();
initGameMenu();
initChar();
$('pv-close').onclick = () => { previewToken++; $('dlg-preview').classList.remove('open'); };
$('cp-close').onclick = () => $('dlg-courses').classList.remove('open');
$('dlg-courses').addEventListener('click', e => { if (e.target === $('dlg-courses')) $('dlg-courses').classList.remove('open'); });      // 點視窗外面也關掉
autoLogin();

// 記住上次登入的帳號：打開就直接進大廳（帳號被停用或密碼被改才回到登入畫面）
async function autoLogin() {
  const saved = getSetting('login', null);
  if (!saved || !saved.user) { show('scr-login'); return; }
  ui.loading(true, '登入中…', 0);
  session.user = saved.user; session.pass = saved.pass;
  try {
    const r = await call('login');
    session.isAdmin = r.isAdmin;
    session.profile = r.profile;
    enterLobby();
  } catch (e) {
    session.user = null;
    show('scr-login');
    msg('li-msg', e.message);
  } finally {
    ui.loading(false);
  }
}
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
window.__dixen = { get game() { return game; }, get world() { return world; }, get preview() { return preview; }, session };
