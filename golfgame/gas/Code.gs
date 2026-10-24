/**
 * Dixen Golf — Google Apps Script 後端
 *
 * 部署：擴充功能 → Apps Script → 貼上本檔 → 執行一次 setup() → 部署 → 新增部署作業
 *       類型「網頁應用程式」、執行身分「我」、存取權「所有人」→ 複製網址貼到 js/config.js
 *
 * 工作頁
 *   Account      A 帳號 / B 密碼 / C 啟用(Y/N)，第 1 列為標題
 *   <帳號名稱>    每位玩家一頁：上半部是個人資料（鍵/值），第 14 列起是回合紀錄
 *   排行          每打完一場（9 或 18 洞）一列，排行榜就是讀這一頁（每一場都單獨列入，不只取最好）
 *   挑戰排行      每位玩家一列：挑戰模式的總星數（有更新就改寫那一列）
 * 遊戲間（驗證碼、連線資料、訊息）放在 CacheService，6 小時自動清除，不佔工作頁。
 */

const ADMIN = 'Michael';
const ADMIN_PASS = '1220';
const START_POINTS = 30;
const START_RESPECS = 10;
const RESERVED = ['Account', '排行', '挑戰排行'];
const STAR_SHEET = '挑戰排行';
const STAR_HEADER = ['帳號', '總星數', '最遠關卡', '更新時間'];
const RANK_SHEET = '排行';
const RANK_HEADER = ['日期', '帳號', '球場', '球場代號', '洞數', '範圍', '梯台', '總桿', '標準桿', '對標準桿', '模式', '一桿進洞', '信天翁', '老鷹', '特殊紀錄'];

// 玩家頁上半部的欄位（第 1~13 列，A=名稱 B=值）；成就 = 徽章 / 計數 / 球場護照（JSON），挑戰 = 每關星數（JSON）
const PROFILE_KEYS = ['帳號', '能力點', '剩餘重新分配次數', '素質', '外觀', '總回合數', '最佳18洞', '建立時間', '最後登入', '已用能力點', '累計獲得點數', '成就', '挑戰'];
const ROUND_HEADER_ROW = 14;
const ROUND_HEADER = ['日期', '球場', '洞數', '梯台', '桿數', '對標準桿', '推桿數', '上球道', '標準桿上果嶺', '模式', '同組', '每洞桿數'];

function setup() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName('Account');
  if (!sh) sh = ss.insertSheet('Account', 0);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, 3).setValues([['帳號', '密碼', '啟用']]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  if (!findAccountRow_(ADMIN)) sh.appendRow([ADMIN, ADMIN_PASS, 'Y']);
  sh.getRange('B:B').setNumberFormat('@');
  ensurePlayerSheet_(ADMIN);
  rankSheet_();
  starSheet_();
}

// 「排行」工作頁：沒有就建立（第 1 列標題）
function rankSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(RANK_SHEET);
  if (!sh) {
    sh = ss.insertSheet(RANK_SHEET, 1);
    sh.getRange(1, 1, 1, RANK_HEADER.length).setValues([RANK_HEADER]).setFontWeight('bold').setBackground('#1d3a2a').setFontColor('#f2ead8');
    sh.setFrozenRows(1);
  }
  return sh;
}

function doGet() {
  return json_({ ok: true, data: 'Dixen Golf API' });
}

function doPost(e) {
  let req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: '格式錯誤' });
  }
  try {
    const fn = ACTIONS[req.action];
    if (!fn) return json_({ ok: false, error: '未知動作 ' + req.action });
    return json_({ ok: true, data: fn(req) });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

const ACTIONS = {
  ping: () => 'pong',

  register(req) {
    const user = String(req.user || '').trim();
    const pass = String(req.pass || '');
    if (!/^[A-Za-z0-9_\-一-鿿]{2,20}$/.test(user)) throw new Error('帳號限 2~20 字（中英數字、_ -）');
    if (RESERVED.indexOf(user) >= 0) throw new Error('這個名稱不能使用');
    if (pass.length < 1) throw new Error('請輸入密碼');
    return withLock_(() => {
      if (findAccountRow_(user, true)) throw new Error('帳號已存在');
      const sh = accountSheet_();
      sh.appendRow([user, pass, user === ADMIN ? 'Y' : 'N']);
      sh.getRange(sh.getLastRow(), 2).setNumberFormat('@').setValue(pass);
      ensurePlayerSheet_(user);
      return { user: user, active: user === ADMIN };
    });
  },

  login(req) {
    const acc = auth_(req);
    const p = readProfile_(acc.user);
    writeProfileField_(acc.user, '最後登入', new Date());
    return { user: acc.user, isAdmin: acc.user === ADMIN, profile: p };
  },

  getProfile(req) {
    const acc = auth_(req);
    return readProfile_(acc.user);
  },

  saveProfile(req) {
    const acc = auth_(req);
    const p = req.profile || {};
    const cur = readProfile_(acc.user);
    // 能力點與重新分配次數只能往下用；用掉一次重新分配時，點數最多退回到累計獲得的總數
    const respecs = Math.max(0, Math.min(cur.respecs, Number(p.respecs)));
    const cap = respecs < cur.respecs ? cur.earned : cur.points;
    const points = Math.max(0, Math.min(cap, Number(p.points)));
    writeProfile_(acc.user, {
      '能力點': points,
      '剩餘重新分配次數': respecs,
      '素質': JSON.stringify(p.stats || cur.stats),
      '外觀': JSON.stringify(p.look || cur.look),
      '已用能力點': Number(p.spent || 0),
    });
    return readProfile_(acc.user);
  },

  saveRound(req) {
    const acc = auth_(req);
    const r = req.round;
    return withLock_(() => {
      const sh = ensurePlayerSheet_(acc.user);
      const now = new Date();
      sh.appendRow([now, r.course, r.holes, r.tee, r.strokes, r.toPar, r.putts, r.fairways, r.gir, r.mode, r.partners || '', JSON.stringify(r.scores)]);
      // 排行：每一場都單獨記一列；特殊紀錄 = 這一場的一桿進洞 / 信天翁 / 老鷹（第幾洞、標準桿）
      const ev = Array.isArray(r.events) ? r.events : [];
      const cnt = t => ev.filter(e => e.t === t).length;
      const range = r.range === 'front' ? '前 9 洞' : r.range === 'back' ? '後 9 洞' : '18 洞';
      rankSheet_().appendRow([now, acc.user, r.course, r.courseId || '', r.holes, range, r.tee, r.strokes, r.par || (r.strokes - r.toPar), r.toPar, r.mode, cnt('hio'), cnt('albatross'), cnt('eagle'), JSON.stringify(ev)]);
      const cur = readProfile_(acc.user);
      const earned = Math.floor(r.holes / 9);
      const upd = { '總回合數': cur.rounds + 1, '能力點': cur.points + earned, '累計獲得點數': cur.earned + earned };
      if (r.holes === 18 && (!cur.best || r.strokes < cur.best)) upd['最佳18洞'] = r.strokes;
      writeProfile_(acc.user, upd);
      return { earned: earned, profile: readProfile_(acc.user) };
    });
  },

  getRounds(req) {
    const acc = auth_(req);
    const sh = ensurePlayerSheet_(acc.user);
    const last = sh.getLastRow();
    if (last <= ROUND_HEADER_ROW) return [];
    const n = Math.min(40, last - ROUND_HEADER_ROW);
    const rows = sh.getRange(last - n + 1, 1, n, ROUND_HEADER.length).getValues();
    return rows.reverse().map(r => ({
      date: r[0] instanceof Date ? r[0].toISOString() : r[0], course: r[1], holes: r[2], tee: r[3], strokes: r[4],
      toPar: r[5], putts: r[6], fairways: r[7], gir: r[8], mode: r[9], partners: r[10], scores: safeParse_(r[11], []),
    }));
  },

  // 排行榜：回傳「排行」工作頁的每一場（最多最近 5000 場），排序與分類在畫面端做
  getRankings(req) {
    auth_(req);
    const sh = rankSheet_();
    const last = sh.getLastRow();
    if (last < 2) return [];
    const n = Math.min(5000, last - 1);
    return sh.getRange(last - n + 1, 1, n, RANK_HEADER.length).getValues().map(r => ({
      date: r[0] instanceof Date ? r[0].toISOString() : r[0], user: String(r[1]), course: r[2], courseId: r[3], holes: Number(r[4]),
      range: r[5], tee: r[6], strokes: Number(r[7]), par: Number(r[8]), toPar: Number(r[9]), mode: r[10], events: safeParse_(r[14], []),
    }));
  },

  // 成就 / 球場護照 / 挑戰星數：跟伺服器上的合併（只會增加不會減少）；新達成的成就依 points 加能力點（每個最多 3 點）
  saveProgress(req) {
    const acc = auth_(req);
    return withLock_(() => {
      const cur = readProfile_(acc.user);
      const prog = mergeProg_(cur.prog, req.prog || {});
      const chal = mergeChal_(cur.chal, req.chal || {});
      let add = 0;
      const pts = req.points || {};
      Object.keys(prog.ach || {}).forEach(id => { if (!(cur.prog.ach || {})[id]) add += Math.max(0, Math.min(3, Number(pts[id]) || 0)); });
      const upd = { '成就': JSON.stringify(prog), '挑戰': JSON.stringify(chal) };
      if (add) { upd['能力點'] = cur.points + add; upd['累計獲得點數'] = cur.earned + add; }
      writeProfile_(acc.user, upd);
      if (req.chal) starRow_(acc.user, chal);
      return { added: add, profile: readProfile_(acc.user) };
    });
  },

  getStarRanking(req) {
    auth_(req);
    const sh = starSheet_();
    const last = sh.getLastRow();
    if (last < 2) return [];
    return sh.getRange(2, 1, last - 1, STAR_HEADER.length).getValues().filter(r => r[0] !== '').map(r => ({
      user: String(r[0]), stars: Number(r[1]) || 0, level: Number(r[2]) || 0, date: r[3] instanceof Date ? r[3].toISOString() : r[3],
    }));
  },

  // ---------- 管理員 ----------
  listAccounts(req) {
    admin_(req);
    const sh = accountSheet_();
    const last = sh.getLastRow();
    if (last < 2) return [];
    return sh.getRange(2, 1, last - 1, 3).getValues().filter(r => r[0] !== '').map(r => {
      const prof = readProfile_(String(r[0]));
      return { user: String(r[0]), pass: String(r[1]), active: String(r[2]).toUpperCase() === 'Y', points: prof.points, respecs: prof.respecs, rounds: prof.rounds };
    });
  },

  setActive(req) {
    admin_(req);
    if (req.target === ADMIN) throw new Error('管理員帳號不能停用');
    const row = findAccountRow_(req.target);
    if (!row) throw new Error('找不到帳號');
    accountSheet_().getRange(row, 3).setValue(req.value ? 'Y' : 'N');
    return true;
  },

  grantPoints(req) {
    admin_(req);
    const amt = Math.round(Number(req.amount) || 0);
    const cur = readProfile_(req.target);
    writeProfile_(req.target, { '能力點': Math.max(0, cur.points + amt), '累計獲得點數': cur.earned + Math.max(0, amt) });
    return readProfile_(req.target);
  },

  grantRespecs(req) {
    admin_(req);
    const cur = readProfile_(req.target);
    writeProfile_(req.target, { '剩餘重新分配次數': Math.max(0, cur.respecs + Math.round(Number(req.amount) || 0)) });
    return readProfile_(req.target);
  },

  // ---------- 遊戲間（CacheService） ----------
  createRoom(req) {
    const acc = auth_(req);
    const cache = CacheService.getScriptCache();
    return withLock_(() => {
      let code;
      for (let i = 0; i < 30; i++) {
        code = String(Math.floor(100000 + Math.random() * 900000));
        if (!cache.get('room_' + code)) break;
      }
      const room = { code: code, host: acc.user, offer: req.offer || null, answer: null, guest: null, created: Date.now(), config: req.config || null };
      cache.put('room_' + code, JSON.stringify(room), 21600);
      cache.put('msgs_' + code, '[]', 21600);
      return room;
    });
  },

  getRoom(req) {
    auth_(req);
    const room = getRoom_(req.code);
    if (!room) throw new Error('驗證碼錯誤或遊戲間已關閉');
    return room;
  },

  joinRoom(req) {
    const acc = auth_(req);
    return withLock_(() => {
      const room = getRoom_(req.code);
      if (!room) throw new Error('驗證碼錯誤或遊戲間已關閉');
      if (room.guest && room.guest !== acc.user) throw new Error('遊戲間已滿');
      room.guest = acc.user;
      if (req.answer) room.answer = req.answer;
      putRoom_(room);
      return room;
    });
  },

  updateRoom(req) {
    const acc = auth_(req);
    return withLock_(() => {
      const room = getRoom_(req.code);
      if (!room) throw new Error('遊戲間已關閉');
      if (room.host !== acc.user && room.guest !== acc.user) throw new Error('不在此遊戲間');
      ['offer', 'answer', 'config'].forEach(k => { if (req[k] !== undefined) room[k] = req[k]; });
      putRoom_(room);
      return room;
    });
  },

  sendMsg(req) {
    const acc = auth_(req);
    return withLock_(() => {
      const cache = CacheService.getScriptCache();
      const key = 'msgs_' + req.code;
      const list = safeParse_(cache.get(key), null);
      if (!list) throw new Error('遊戲間已關閉');
      const seq = list.length ? list[list.length - 1].seq + 1 : 1;
      list.push({ seq: seq, from: acc.user, msg: req.msg });
      while (list.length > 40 || JSON.stringify(list).length > 90000) list.shift();
      cache.put(key, JSON.stringify(list), 21600);
      return seq;
    });
  },

  getMsgs(req) {
    const acc = auth_(req);
    const list = safeParse_(CacheService.getScriptCache().get('msgs_' + req.code), null);
    if (!list) throw new Error('遊戲間已關閉');
    const since = Number(req.since || 0);
    return list.filter(m => m.seq > since && m.from !== acc.user);
  },

  closeRoom(req) {
    auth_(req);
    const cache = CacheService.getScriptCache();
    cache.remove('room_' + req.code);
    cache.remove('msgs_' + req.code);
    return true;
  },
};

// ---------- 成就 / 挑戰 ----------
function mergeProg_(a, b) {
  const o = { ach: Object.assign({}, a.ach || {}), cnt: Object.assign({}, a.cnt || {}), stamps: Object.assign({}, a.stamps || {}) };
  Object.keys(b.ach || {}).forEach(k => { if (!o.ach[k]) o.ach[k] = b.ach[k]; });
  Object.keys(b.cnt || {}).forEach(k => { o.cnt[k] = Math.max(Number(o.cnt[k]) || 0, Number(b.cnt[k]) || 0); });
  Object.keys(b.stamps || {}).forEach(k => {
    const x = o.stamps[k], y = b.stamps[k];
    o.stamps[k] = !x ? y : { date: x.date || y.date, best: Math.min(Number(x.best) || 999, Number(y.best) || 999), n: Math.max(Number(x.n) || 1, Number(y.n) || 1) };
  });
  return o;
}
function mergeChal_(a, b) {
  const o = { stars: Object.assign({}, a.stars || {}), best: Object.assign({}, a.best || {}) };
  Object.keys(b.stars || {}).forEach(k => { o.stars[k] = Math.max(Number(o.stars[k]) || 0, Math.min(3, Number(b.stars[k]) || 0)); });
  Object.keys(b.best || {}).forEach(k => { o.best[k] = o.best[k] ? Math.min(o.best[k], b.best[k]) : b.best[k]; });
  o.total = Object.keys(o.stars).reduce((s, k) => s + o.stars[k], 0);
  return o;
}
function starSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(STAR_SHEET);
  if (!sh) {
    sh = ss.insertSheet(STAR_SHEET, 2);
    sh.getRange(1, 1, 1, STAR_HEADER.length).setValues([STAR_HEADER]).setFontWeight('bold').setBackground('#1d3a2a').setFontColor('#f2ead8');
    sh.setFrozenRows(1);
  }
  return sh;
}
function starRow_(user, chal) {
  const sh = starSheet_();
  const last = sh.getLastRow();
  const far = Object.keys(chal.stars).reduce((m, k) => chal.stars[k] > 0 ? Math.max(m, Number(String(k).replace(/\D/g, '')) || 0) : m, 0);
  const row = [user, chal.total, far, new Date()];
  if (last >= 2) {
    const users = sh.getRange(2, 1, last - 1, 1).getValues();
    for (let i = 0; i < users.length; i++) if (String(users[i][0]) === user) { sh.getRange(i + 2, 1, 1, row.length).setValues([row]); return; }
  }
  sh.appendRow(row);
}

// ---------- helpers ----------
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function safeParse_(s, dflt) {
  try { return s ? JSON.parse(s) : dflt; } catch (e) { return dflt; }
}

function accountSheet_() {
  const sh = SpreadsheetApp.getActive().getSheetByName('Account');
  if (!sh) throw new Error('請先在 Apps Script 執行 setup()');
  return sh;
}

// 帳號比對分大小寫；caseInsensitive 只用在註冊時防止 michael / Michael 重複
function findAccountRow_(user, caseInsensitive) {
  const sh = SpreadsheetApp.getActive().getSheetByName('Account');
  if (!sh || sh.getLastRow() < 2) return 0;
  const names = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < names.length; i++) {
    const n = String(names[i][0]);
    if (n === user || (caseInsensitive && n.toLowerCase() === String(user).toLowerCase())) return i + 2;
  }
  return 0;
}

function auth_(req) {
  const row = findAccountRow_(String(req.user || ''));
  if (!row) throw new Error('帳號或密碼錯誤');
  const r = accountSheet_().getRange(row, 1, 1, 3).getValues()[0];
  if (String(r[1]) !== String(req.pass)) throw new Error('帳號或密碼錯誤');
  if (String(r[2]).toUpperCase() !== 'Y') throw new Error('帳號尚未啟用，請等待管理員核准');
  return { user: String(r[0]) };
}

function admin_(req) {
  const acc = auth_(req);
  if (acc.user !== ADMIN) throw new Error('需要管理員權限');
  return acc;
}

function ensurePlayerSheet_(user) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(user);
  if (sh) return sh;
  sh = ss.insertSheet(user);
  const init = {
    '帳號': user, '能力點': START_POINTS, '剩餘重新分配次數': START_RESPECS, '素質': '{}', '外觀': '{}',
    '總回合數': 0, '最佳18洞': '', '建立時間': new Date(), '最後登入': '', '已用能力點': 0, '累計獲得點數': START_POINTS, '成就': '{}', '挑戰': '{}',
  };
  sh.getRange(1, 1, PROFILE_KEYS.length, 2).setValues(PROFILE_KEYS.map(k => [k, init[k]]));
  sh.getRange(1, 1, PROFILE_KEYS.length, 1).setFontWeight('bold').setBackground('#f1ebdc');
  sh.getRange(ROUND_HEADER_ROW, 1, 1, ROUND_HEADER.length).setValues([ROUND_HEADER]).setFontWeight('bold').setBackground('#1d3a2a').setFontColor('#f2ead8');
  sh.setColumnWidth(1, 130);
  sh.setColumnWidth(2, 220);
  return sh;
}

function readProfile_(user) {
  const sh = ensurePlayerSheet_(user);
  const vals = sh.getRange(1, 1, PROFILE_KEYS.length, 2).getValues();
  const m = {};
  vals.forEach(r => { m[String(r[0])] = r[1]; });
  return {
    user: user,
    points: Number(m['能力點']) || 0,
    respecs: m['剩餘重新分配次數'] === '' ? START_RESPECS : Number(m['剩餘重新分配次數']) || 0,
    stats: safeParse_(m['素質'], {}),
    look: safeParse_(m['外觀'], {}),
    rounds: Number(m['總回合數']) || 0,
    best: m['最佳18洞'] === '' ? null : Number(m['最佳18洞']),
    spent: Number(m['已用能力點']) || 0,
    earned: Number(m['累計獲得點數']) || 0,
    prog: safeParse_(m['成就'], {}),
    chal: safeParse_(m['挑戰'], {}),
  };
}

function writeProfileField_(user, key, value) {
  const o = {};
  o[key] = value;
  writeProfile_(user, o);
}

function writeProfile_(user, obj) {
  const sh = ensurePlayerSheet_(user);
  Object.keys(obj).forEach(k => {
    const idx = PROFILE_KEYS.indexOf(k);
    if (idx >= 0) sh.getRange(idx + 1, 1, 1, 2).setValues([[k, obj[k]]]);     // 舊的玩家頁沒有新欄位的名稱，順便補上
  });
}

function getRoom_(code) {
  return safeParse_(CacheService.getScriptCache().get('room_' + code), null);
}

function putRoom_(room) {
  CacheService.getScriptCache().put('room_' + room.code, JSON.stringify(room), 21600);
}
