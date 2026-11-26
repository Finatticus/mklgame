/**
 * 風險管理基本能力測驗－刷題 App 後端（Google Apps Script）
 *
 * 部署：擴充功能 > Apps Script > 貼上本檔 > 部署 > 新增部署作業 > 類型「網頁應用程式」
 *       執行身分：我　／　誰可以存取：所有人
 * 取得的 /exec 網址貼到 index.html 的 GAS_URL（或 App 內「設定」）。
 *
 * 資料結構：每個帳號（一律轉小寫）一個工作表。
 *   A~K 欄：狀態資料  A=key  B=更新時間(ms)  C..K=JSON 內容（過長自動分段）
 *   M~U 欄：作答紀錄  每完成一次練習/模擬考新增一列
 */

var CHUNK = 45000;          // 單一儲存格上限 50,000 字元，保留緩衝
var MAX_CHUNKS = 9;         // C..K 共 9 欄
var LOG_COL = 13;           // M 欄
var LOG_HEAD = ['時間', '模式', '範圍', '題數', '答對', '正確率', '分數', '用時(秒)', '明細'];
var INDEX_SHEET = '_帳號清單';

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action) return out_(handle_(p));
  return out_({ ok: true, msg: 'Risk-quiz backend is running.' });
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents || '{}'); } catch (err) { return out_({ ok: false, error: 'bad json' }); }
  return out_(handle_(body));
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function handle_(req) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var action = String(req.action || '');
    if (action === 'ping') return { ok: true, time: Date.now() };

    var acc = normAccount_(req.account);
    if (!acc) return { ok: false, error: '帳號格式不正確' };

    if (action === 'login') {
      var created = !getSS_().getSheetByName(acc);
      var sh = sheet_(acc);
      var state = readState_(sh);
      var prof = state.profile ? JSON.parse(state.profile.v) : { created: Date.now(), logins: 0 };
      prof.lastLogin = Date.now();
      prof.logins = (prof.logins || 0) + 1;
      writeKey_(sh, 'profile', JSON.stringify(prof), Date.now());
      state = readState_(sh);
      return { ok: true, account: acc, created: created, state: state };
    }
    if (action === 'pull') {
      return { ok: true, account: acc, state: readState_(sheet_(acc)) };
    }
    if (action === 'push') {
      var sh2 = sheet_(acc);
      var cur = readState_(sh2);
      var data = req.data || {};
      Object.keys(data).forEach(function (k) {
        if (k === 'profile' || !/^[a-zA-Z0-9_]+$/.test(k)) return;
        var item = data[k];
        if (!item || typeof item.v !== 'string') return;
        var t = Number(item.t) || Date.now();
        if (!cur[k] || t >= cur[k].t) writeKey_(sh2, k, item.v, t);
      });
      return { ok: true, account: acc, state: readState_(sh2) };
    }
    if (action === 'log') {
      var sh3 = sheet_(acc);
      var s = req.session || {};
      var row = [
        new Date(Number(s.time) || Date.now()), s.mode || '', s.scope || '', Number(s.total) || 0,
        Number(s.correct) || 0, s.total ? Math.round((s.correct / s.total) * 1000) / 10 + '%' : '',
        s.score == null ? '' : s.score, Number(s.seconds) || 0, String(s.detail || '').slice(0, CHUNK)
      ];
      var last = Math.max(1, lastLogRow_(sh3));
      sh3.getRange(last + 1, LOG_COL, 1, row.length).setValues([row]);
      return { ok: true };
    }
    return { ok: false, error: 'unknown action' };
  } finally {
    lock.releaseLock();
  }
}

/* 帳號不分大小寫：去頭尾空白、轉小寫；禁止工作表名稱不允許的字元 */
function normAccount_(a) {
  a = String(a || '').trim().toLowerCase();
  if (!a || a.length > 40) return '';
  if (/[\\\/\?\*\[\]:']/.test(a)) return '';
  if (a.charAt(0) === '_') return '';
  return a;
}

function getSS_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function sheet_(acc) {
  var ss = getSS_();
  var sh = ss.getSheetByName(acc);
  if (sh) return sh;
  sh = ss.insertSheet(acc);
  sh.getRange(1, 1, 1, 3).setValues([['key', '更新時間', '內容(JSON)']]).setFontWeight('bold');
  sh.getRange(1, LOG_COL, 1, LOG_HEAD.length).setValues([LOG_HEAD]).setFontWeight('bold');
  sh.setFrozenRows(1);
  sh.setColumnWidth(3, 260);
  var idx = ss.getSheetByName(INDEX_SHEET) || ss.insertSheet(INDEX_SHEET, 0);
  if (idx.getLastRow() === 0) idx.appendRow(['帳號', '建立時間']);
  idx.appendRow([acc, new Date()]);
  return sh;
}

function readState_(sh) {
  var last = sh.getLastRow();
  var state = {};
  if (last < 2) return state;
  var vals = sh.getRange(2, 1, last - 1, 2 + MAX_CHUNKS).getValues();
  vals.forEach(function (r) {
    var k = String(r[0] || '');
    if (!k) return;
    var v = '';
    for (var i = 2; i < 2 + MAX_CHUNKS; i++) v += String(r[i] === null ? '' : r[i]);
    state[k] = { v: v, t: Number(r[1]) || 0 };
  });
  return state;
}

function keyRow_(sh, key) {
  var last = sh.getLastRow();
  if (last >= 2) {
    var keys = sh.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < keys.length; i++) if (keys[i][0] === key) return i + 2;
  }
  // 找 A 欄第一個空白列
  var colA = sh.getRange(1, 1, Math.max(last, 1) + 1, 1).getValues();
  for (var j = 1; j < colA.length; j++) if (!colA[j][0]) return j + 1;
  return colA.length + 1;
}

function writeKey_(sh, key, value, t) {
  var chunks = [];
  for (var i = 0; i < MAX_CHUNKS; i++) chunks.push(value.substr(i * CHUNK, CHUNK));
  if (value.length > CHUNK * MAX_CHUNKS) throw new Error('資料過大：' + key);
  var row = keyRow_(sh, key);
  var range = sh.getRange(row, 1, 1, 2 + MAX_CHUNKS);
  range.setNumberFormat('@');
  range.setValues([[key, String(t)].concat(chunks)]);
}

function lastLogRow_(sh) {
  var last = sh.getLastRow();
  if (last < 1) return 1;
  var col = sh.getRange(1, LOG_COL, last, 1).getValues();
  for (var i = col.length - 1; i >= 0; i--) if (col[i][0] !== '' && col[i][0] !== null) return i + 1;
  return 1;
}
