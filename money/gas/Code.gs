/**
 * Ledger 帳簿 — Google Apps Script 後端
 *
 * 使用方式：
 *   1. 建立一份 Google 試算表 → 擴充功能 → Apps Script，貼上本檔案。
 *   2. 在編輯器上方選擇函式 setup 並執行一次（會要求授權）。
 *   3. 部署 → 新增部署作業 → 類型「網頁應用程式」
 *      執行身分：我；存取權：所有人。把網址填到前端 config.js。
 *
 * 試算表結構：
 *   Users      — 所有帳號（密碼以加鹽雜湊儲存）
 *   <帳號名稱>  — 每個帳號獨立一個工作頁，存放該帳號的記帳資料
 */

const SHEET_USERS = 'Users';
const USER_HEADERS = ['username', 'salt', 'hash', 'sheet', 'config', 'createdAt'];
const HEADERS = ['id', 'date', 'type', 'amount', 'category', 'account', 'note', 'createdAt', 'updatedAt'];
const USERNAME_RE = /^[A-Za-z0-9_.\-一-鿿]{2,20}$/;
const RESERVED = ['users'];
const SESSION_DAYS = 30;
const HASH_ROUNDS = 200;

function setup() {
  usersSheet_();
  secret_();
  Logger.log('設定完成，可以部署為網頁應用程式。');
}

/** 讓所有已登入的裝置失效（需重新登入） */
function resetSessions() {
  PropertiesService.getScriptProperties().deleteProperty('SECRET');
  secret_();
}

function doGet(e) {
  return handle_((e && e.parameter) || {});
}

function doPost(e) {
  let body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: '格式錯誤' });
  }
  return handle_(body);
}

function handle_(req) {
  try {
    switch (req.action) {
      case 'ping':
        return json_({ ok: true, time: new Date().toISOString() });
      case 'register':
        return withLock_(() => register_(req.username, req.password));
      case 'login':
        return json_(login_(req.username, req.password));
    }

    const user = auth_(req.session);
    if (!user) return json_({ ok: false, code: 'AUTH', error: '登入已過期，請重新登入' });
    const sh = userSheet_(user);

    switch (req.action) {
      case 'list':
        return json_({ ok: true, transactions: listTx_(sh), config: user.config });
      case 'save':
        return withLock_(() => { saveTx_(sh, req.tx); return { ok: true }; });
      case 'saveMany':
        return withLock_(() => {
          saveMany_(sh, req.txs || []);
          return { ok: true, count: (req.txs || []).length };
        });
      case 'delete':
        return withLock_(() => { deleteTx_(sh, req.id); return { ok: true }; });
      case 'deleteMany':
        return withLock_(() => { deleteMany_(sh, req.ids || []); return { ok: true }; });
      case 'saveConfig':
        return withLock_(() => {
          usersSheet_().getRange(user.row, 5).setValue(JSON.stringify(req.config || {}));
          return { ok: true };
        });
      default:
        return json_({ ok: false, error: '未知的操作：' + req.action });
    }
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

/* ---------- Accounts ---------- */

function register_(username, password) {
  username = String(username || '').trim();
  password = String(password || '');
  if (!USERNAME_RE.test(username)) return { ok: false, error: '帳號需為 2–20 字，可用中英文、數字及 _ . -' };
  if (password.length < 6) return { ok: false, error: '密碼至少需要 6 個字元' };
  if (RESERVED.indexOf(username.toLowerCase()) >= 0 || findUser_(username)) return { ok: false, error: '此帳號已被註冊' };

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(username)) return { ok: false, error: '此帳號名稱無法使用' };
  initTxSheet_(ss.insertSheet(username));

  const users = usersSheet_();
  const salt = Utilities.getUuid();
  users.getRange(users.getLastRow() + 1, 1, 1, USER_HEADERS.length).setValues([[
    username, salt, hash_(password, salt), username, '', new Date().toISOString()
  ]]);
  return { ok: true, user: username, token: issue_(username) };
}

function login_(username, password) {
  const u = findUser_(String(username || '').trim());
  if (!u || hash_(String(password || ''), u.salt) !== u.hash) {
    Utilities.sleep(800); // 減緩暴力嘗試
    return { ok: false, error: '帳號或密碼錯誤' };
  }
  return { ok: true, user: u.username, token: issue_(u.username) };
}

function findUser_(username) {
  const sh = usersSheet_();
  const last = sh.getLastRow();
  if (!username || last < 2) return null;
  const key = String(username).toLowerCase();
  const rows = sh.getRange(2, 1, last - 1, USER_HEADERS.length).getValues();
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (String(r[0]).toLowerCase() !== key) continue;
    let config = null;
    try { config = r[4] ? JSON.parse(r[4]) : null; } catch (err) { /* 設定損毀時用預設值 */ }
    return { row: i + 2, username: String(r[0]), salt: String(r[1]), hash: String(r[2]), sheet: String(r[3]), config: config };
  }
  return null;
}

function hash_(password, salt) {
  let h = salt + ':' + password;
  for (let i = 0; i < HASH_ROUNDS; i++) {
    h = hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h, Utilities.Charset.UTF_8));
  }
  return h;
}

/* ---------- Session token: base64(username|expires).signature ---------- */

function issue_(username) {
  const exp = Date.now() + SESSION_DAYS * 864e5;
  const payload = Utilities.base64EncodeWebSafe(username + '|' + exp, Utilities.Charset.UTF_8);
  return payload + '.' + sign_(payload);
}

function auth_(token) {
  if (!token) return null;
  token = String(token);
  const i = token.lastIndexOf('.');
  if (i < 1) return null;
  const payload = token.slice(0, i);
  if (sign_(payload) !== token.slice(i + 1)) return null;
  let text;
  try {
    text = Utilities.newBlob(Utilities.base64DecodeWebSafe(payload)).getDataAsString('UTF-8');
  } catch (err) {
    return null;
  }
  const j = text.lastIndexOf('|');
  if (!(Number(text.slice(j + 1)) > Date.now())) return null;
  return findUser_(text.slice(0, j));
}

function sign_(payload) {
  const sig = Utilities.computeHmacSha256Signature(payload, secret_(), Utilities.Charset.UTF_8);
  return Utilities.base64EncodeWebSafe(sig).replace(/=+$/, '');
}

function secret_() {
  const props = PropertiesService.getScriptProperties();
  let s = props.getProperty('SECRET');
  if (!s) {
    s = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('SECRET', s);
  }
  return s;
}

/* ---------- Transactions ---------- */

function listTx_(sh) {
  const last = sh.getLastRow();
  if (last < 2) return [];
  const tz = Session.getScriptTimeZone();
  return sh.getRange(2, 1, last - 1, HEADERS.length).getValues()
    .filter(r => r[0] !== '')
    .map(r => ({
      id: String(r[0]),
      date: r[1] instanceof Date ? Utilities.formatDate(r[1], tz, 'yyyy-MM-dd') : String(r[1]),
      type: String(r[2]),
      amount: Number(r[3]) || 0,
      category: String(r[4]),
      account: String(r[5]),
      note: String(r[6]),
      createdAt: String(r[7]),
      updatedAt: String(r[8])
    }));
}

function rowValues_(t) {
  if (!t || !t.id) throw new Error('缺少紀錄 id');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t.date)) throw new Error('日期格式錯誤');
  if (t.type !== 'expense' && t.type !== 'income') throw new Error('類型錯誤');
  const amount = Number(t.amount);
  if (!(amount > 0)) throw new Error('金額錯誤');
  const now = new Date().toISOString();
  return [
    String(t.id), t.date, t.type, amount,
    String(t.category || ''), String(t.account || ''), String(t.note || '').slice(0, 200),
    String(t.createdAt || now), now
  ];
}

function saveTx_(sh, t) {
  const values = rowValues_(t);
  const row = findRow_(sh, t.id) || sh.getLastRow() + 1;
  sh.getRange(row, 1, 1, HEADERS.length).setValues([values]);
}

// 批次寫入（匯入發票用）：已存在的 id 覆寫該列，新的一次附加到最後，不會產生重複列
function saveMany_(sh, txs) {
  const last = sh.getLastRow();
  const rowOf = {};
  if (last > 1) sh.getRange(2, 1, last - 1, 1).getValues().forEach((r, i) => { rowOf[String(r[0])] = i + 2; });
  const appends = [];
  const appendIndex = {};
  txs.forEach(t => {
    const values = rowValues_(t);
    const id = values[0];
    if (rowOf[id]) sh.getRange(rowOf[id], 1, 1, HEADERS.length).setValues([values]);
    else if (id in appendIndex) appends[appendIndex[id]] = values;
    else { appendIndex[id] = appends.length; appends.push(values); }
  });
  if (appends.length) sh.getRange(last + 1, 1, appends.length, HEADERS.length).setValues(appends);
}

function deleteTx_(sh, id) {
  const row = findRow_(sh, id);
  if (!row) return;
  keepSpareRow_(sh);
  sh.deleteRow(row);
}

// 批次刪除：由下往上刪，連續的列一次刪掉
function deleteMany_(sh, ids) {
  const last = sh.getLastRow();
  if (last < 2 || !ids.length) return;
  const want = {};
  ids.forEach(id => { want[String(id)] = true; });
  const rows = [];
  sh.getRange(2, 1, last - 1, 1).getValues().forEach((r, i) => { if (want[String(r[0])]) rows.push(i + 2); });
  if (!rows.length) return;
  keepSpareRow_(sh);
  let i = rows.length - 1;
  while (i >= 0) {
    const end = rows[i];
    let start = end;
    i--;
    while (i >= 0 && rows[i] === start - 1) { start--; i--; }
    sh.deleteRows(start, end - start + 1);
  }
}

// 試算表不允許刪光所有未凍結的列，保留一列空白
function keepSpareRow_(sh) {
  if (sh.getMaxRows() <= sh.getLastRow()) sh.insertRowAfter(sh.getLastRow());
}

function findRow_(sh, id) {
  if (!id || sh.getLastRow() < 2) return 0;
  const cell = sh.getRange(2, 1, sh.getLastRow() - 1, 1)
    .createTextFinder(String(id)).matchEntireCell(true).findNext();
  return cell ? cell.getRow() : 0;
}

/* ---------- Sheets ---------- */

function usersSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_USERS);
  if (!sh) {
    sh = ss.insertSheet(SHEET_USERS, 0);
    sh.getRange('A:F').setNumberFormat('@');
    sh.getRange(1, 1, 1, USER_HEADERS.length).setValues([USER_HEADERS]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function userSheet_(user) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(user.sheet);
  if (!sh) {
    sh = ss.insertSheet(user.sheet);
    initTxSheet_(sh);
  }
  return sh;
}

function initTxSheet_(sh) {
  // 文字格式，避免日期被試算表自動轉換
  sh.getRange('A:C').setNumberFormat('@');
  sh.getRange('D:D').setNumberFormat('#,##0.##');
  sh.getRange('E:I').setNumberFormat('@');
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  sh.setFrozenRows(1);
}

/* ---------- Helpers ---------- */

function hex_(bytes) {
  return bytes.map(b => ((b & 0xff) + 0x100).toString(16).slice(1)).join('');
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return json_(fn());
  } finally {
    lock.releaseLock();
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
