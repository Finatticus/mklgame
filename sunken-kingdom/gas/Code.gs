/**
 * 沉沒王國 雲端存檔伺服器（Google Apps Script）
 *
 * 試算表的工作頁：
 *   「帳號」：A 帳號｜B 密碼｜C 開通（管理員填 v 才能登入；把 v 拿掉＝停權）｜D 註冊時間｜E 最後登入
 *   「存檔_<帳號>」：每個帳號一頁，第一次登入成功時自動建立
 *       第 2～4 列＝存檔欄位 1～3、第 5 列＝共用儲藏箱、第 6 列＝備份（兩台裝置進度不同時，被蓋掉的那一份）
 *       欄位：A 欄位｜B 更新時間（毫秒）｜C 更新時間｜D 裝置｜E 職業｜F 章節｜G 遠征次數｜H 金幣｜I 經驗｜J 最深環數｜K 分段數｜L 之後＝完整存檔（太長自動拆成好幾格）
 *
 * 部署：擴充功能 → Apps Script → 貼上這份程式 → 部署 → 新增部署作業 → 類型「網頁應用程式」
 *       執行身分「我」、誰可以存取「所有人」→ 部署 → 複製網頁應用程式網址
 */

var ACCOUNT_SHEET = '帳號';
var CHUNK = 40000; // 一格最多 5 萬字，留一點餘裕
var ROW_OF = { '0': 2, '1': 3, '2': 4, 'stash': 5, 'backup': 6 };
var LABELS = ['欄位 1', '欄位 2', '欄位 3', '共用儲藏箱', '備份'];
var HEAD = ['欄位', '更新時間（毫秒）', '更新時間', '裝置', '職業', '章節', '遠征次數', '金幣', '經驗', '最深環數', '分段數', '存檔資料（太長會接到右邊的格子）'];

function doGet() {
  return out({ ok: true, msg: '沉沒王國伺服器運作中' });
}

function doPost(e) {
  var req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return out({ ok: false, code: 'error', msg: '資料格式錯誤' });
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    switch (req.action) {
      case 'register': return out(register(req));
      case 'login': return out(login(req));
      case 'pull': return out(withAuth(req, pull));
      case 'push': return out(withAuth(req, push));
      case 'backup': return out(withAuth(req, backup));
    }
    return out({ ok: false, code: 'error', msg: '不認得的動作' });
  } catch (err) {
    return out({ ok: false, code: 'error', msg: '伺服器錯誤：' + err });
  } finally {
    lock.releaseLock();
  }
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------- 帳號
function accountSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(ACCOUNT_SHEET);
  if (!sh) {
    sh = ss.insertSheet(ACCOUNT_SHEET, 0);
    sh.getRange(1, 1, 1, 5).setValues([['帳號', '密碼', '開通（填 v）', '註冊時間', '最後登入']]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange('A:B').setNumberFormat('@'); // 帳號、密碼一律當文字，不會被轉成數字或日期
  }
  return sh;
}

function findAccount(user) {
  var sh = accountSheet();
  var n = sh.getLastRow();
  if (n < 2) return null;
  var vals = sh.getRange(2, 1, n - 1, 3).getDisplayValues();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]) === user) return { row: i + 2, pass: String(vals[i][1]), approved: String(vals[i][2]).trim().toLowerCase() === 'v' };
  }
  return null;
}

function register(req) {
  var user = String(req.user || '').trim();
  var pass = String(req.pass || '');
  if (user.length < 3 || user.length > 20) return { ok: false, code: 'error', msg: '帳號要 3～20 個字' };
  if (pass.length < 4) return { ok: false, code: 'error', msg: '密碼至少 4 個字' };
  if (/[\[\]:*?\/\\]/.test(user)) return { ok: false, code: 'error', msg: '帳號不能有 [ ] : * ? / \\ 這些符號' };
  if (findAccount(user)) return { ok: false, code: 'exists', msg: '這個帳號已經有人註冊了' };
  var sh = accountSheet();
  var row = sh.getLastRow() + 1;
  sh.getRange(row, 1, 1, 2).setNumberFormat('@');
  sh.getRange(row, 1, 1, 5).setValues([[user, pass, '', now(), '']]);
  return { ok: true, msg: '註冊成功，請等管理員開通' };
}

function auth(req) {
  var acc = findAccount(String(req.user || '').trim());
  if (!acc || acc.pass !== String(req.pass || '')) return { ok: false, code: 'bad_login', msg: '帳號或密碼錯誤' };
  if (!acc.approved) return { ok: false, code: 'not_approved', msg: '帳號還沒開通（或已停權），請等管理員在試算表 C 欄填 v' };
  return { ok: true, acc: acc };
}

function login(req) {
  var a = auth(req);
  if (!a.ok) return a;
  accountSheet().getRange(a.acc.row, 5).setValue(now());
  saveSheet(String(req.user).trim());
  return { ok: true };
}

function withAuth(req, fn) {
  var a = auth(req);
  if (!a.ok) return a;
  return fn(req, saveSheet(String(req.user).trim()));
}

// ---------------------------------------------------------------- 每個帳號的存檔工作頁
function saveSheet(user) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var name = '存檔_' + user;
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]).setFontWeight('bold');
    for (var i = 0; i < LABELS.length; i++) sh.getRange(i + 2, 1).setValue(LABELS[i]);
    sh.setFrozenRows(1);
    sh.setFrozenColumns(1);
  }
  return sh;
}

function readRow(sh, row) {
  var lastCol = Math.max(sh.getLastColumn(), 12);
  var v = sh.getRange(row, 1, 1, lastCol).getValues()[0];
  var parts = Number(v[10]) || 0;
  var data = '';
  for (var i = 0; i < parts; i++) data += String(v[11 + i] || '');
  return { ts: Number(v[1]) || 0, data: data };
}

function writeRow(sh, row, label, ts, device, sum, data) {
  var parts = [];
  for (var i = 0; i < data.length; i += CHUNK) parts.push(data.substring(i, i + CHUNK));
  var lastCol = Math.max(sh.getLastColumn(), 12);
  sh.getRange(row, 1, 1, lastCol).clearContent();
  sum = sum || {};
  sh.getRange(row, 1, 1, 11).setValues([[label, ts, new Date(Number(ts)), device || '', sum.cls || '', sum.chapter || '', sum.runs || '', sum.gold || '', sum.xp || '', sum.best || '', parts.length]]);
  if (parts.length > 0) {
    var r = sh.getRange(row, 12, 1, parts.length);
    r.setNumberFormat('@');
    r.setValues([parts]);
  }
}

function pull(req, sh) {
  var slots = {};
  ['0', '1', '2'].forEach(function (k) {
    var r = readRow(sh, ROW_OF[k]);
    slots[k] = { ts: r.ts, data: r.data, deleted: r.ts > 0 && r.data === '' };
  });
  var st = readRow(sh, ROW_OF.stash);
  return { ok: true, slots: slots, stash: { ts: st.ts, data: st.data } };
}

function push(req, sh) {
  (req.items || []).forEach(function (it) {
    var k = String(it.slot);
    if (!(k in ROW_OF) || k === 'stash' || k === 'backup') return;
    var cur = readRow(sh, ROW_OF[k]);
    if (Number(it.ts) < cur.ts) { // 雲端已經有更新的（別台裝置存的）：不蓋掉，這份放到備份
      writeRow(sh, ROW_OF.backup, '備份（欄位 ' + (Number(k) + 1) + '）', it.ts, req.device, it.sum, String(it.data || ''));
      return;
    }
    writeRow(sh, ROW_OF[k], LABELS[Number(k)] + (it.data === '' ? '（已刪除）' : ''), it.ts, req.device, it.sum, String(it.data || ''));
  });
  if (req.stash) {
    var cs = readRow(sh, ROW_OF.stash);
    if (Number(req.stash.ts) >= cs.ts) writeRow(sh, ROW_OF.stash, LABELS[3], req.stash.ts, req.device, {}, String(req.stash.data || ''));
  }
  return { ok: true };
}

function backup(req, sh) {
  (req.items || []).forEach(function (it) {
    writeRow(sh, ROW_OF.backup, '備份（欄位 ' + (Number(it.slot) + 1) + '）', it.ts, req.device, {}, String(it.data || ''));
  });
  return { ok: true };
}

function now() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
}
