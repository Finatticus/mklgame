/**
 * 萬象遊藝館 — Google Apps Script 後端
 *
 * 試算表結構
 *   「帳號總覽」：每個帳號一列，管理員一眼看完所有玩家。
 *   「玩家-<帳號>」：每個帳號一張工作表，上方是帳號資訊，下方逐筆記錄所有輸贏與領取。
 *
 * 部署：擴充功能 → Apps Script → 貼上本檔 → 部署 → 新增部署作業 → 網頁應用程式
 *       執行身分「我」、存取權「所有人」→ 把網址貼到前端 js/config.js 的 GAS_URL。
 */

var START_COINS = 100000;
var OVERVIEW = '帳號總覽';
var PREFIX = '玩家-';

var COLS = ['帳號', '遊戲幣餘額', '總局數', '勝', '負', '和', '勝率', '累計下注', '淨輸贏',
  '建立時間', '最後登入', '最後同步', '登入次數', '最後使用裝置', '個人工作表',
  '密碼雜湊（系統用）', '狀態資料（系統用）'];
var C = {}; for (var i = 0; i < COLS.length; i++) C[COLS[i]] = i + 1;

var LOG_HEADER = ['時間', '項目', '模式／難度', '結果', '下注', '輸贏', '結算後餘額', '說明', '裝置', '事件編號'];
var LOG_START = 9; // 紀錄表頭所在列

function doGet() {
  return json({ ok: true, service: 'lots-game', time: new Date().toISOString() });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var req = JSON.parse(e.postData.contents);
    lock.waitLock(25000);
    var out;
    if (req.action === 'login') out = login(req);
    else if (req.action === 'sync') out = sync(req);
    else if (req.action === 'leaderboard') out = leaderboard();
    else if (req.action === 'raceboard') out = raceboard(req);
    else out = { ok: false, message: '未知的動作' };
    return json(out);
  } catch (err) {
    return json({ ok: false, message: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function now() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}

function fmtTime(iso) {
  var d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) d = new Date();
  return Utilities.formatDate(d, Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}

function validName(name) {
  return typeof name === 'string' && /^[A-Za-z0-9_一-鿿]{2,12}$/.test(name);
}

function overview() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(OVERVIEW);
  if (!sh) {
    sh = ss.insertSheet(OVERVIEW, 0);
    sh.getRange(1, 1, 1, COLS.length).setValues([COLS])
      .setFontWeight('bold').setBackground('#2b2520').setFontColor('#f1e6cf').setHorizontalAlignment('center');
    sh.setFrozenRows(1);
    sh.setFrozenColumns(1);
    sh.setColumnWidth(C['帳號'], 130);
    sh.setColumnWidths(C['遊戲幣餘額'], 8, 105);
    sh.setColumnWidths(C['建立時間'], 3, 160);
    sh.setColumnWidth(C['最後使用裝置'], 150);
    sh.setColumnWidth(C['個人工作表'], 130);
    sh.getRange(2, C['遊戲幣餘額'], 999, 1).setNumberFormat('#,##0');
    sh.getRange(2, C['累計下注'], 999, 2).setNumberFormat('#,##0');
    sh.getRange(2, C['勝率'], 999, 1).setNumberFormat('0.0%');
    sh.hideColumns(C['密碼雜湊（系統用）'], 2);
  }
  return sh;
}

function findRow(sh, user) {
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var names = sh.getRange(2, 1, last - 1, 1).getValues();
  var key = String(user).toLowerCase();
  for (var i = 0; i < names.length; i++) if (String(names[i][0]).toLowerCase() === key) return i + 2;
  return 0;
}

function playerSheet(user, create) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(PREFIX + user);
  if (sh || !create) return sh;
  sh = ss.insertSheet(PREFIX + user, ss.getNumSheets());
  sh.getRange('A1').setValue('玩家資料：' + user).setFontSize(14).setFontWeight('bold');
  sh.getRange('A2:A7').setValues([['帳號'], ['建立時間'], ['目前遊戲幣'], ['總局數（勝／負／和）'], ['淨輸贏'], ['最後同步']])
    .setFontWeight('bold').setBackground('#efe7d8');
  sh.getRange('B2').setValue(user);
  sh.getRange('B4').setNumberFormat('#,##0');
  sh.getRange('B6').setNumberFormat('#,##0');
  sh.getRange(LOG_START - 1, 1).setValue('以下為這個帳號的所有紀錄（最新的在最下方）').setFontColor('#777777');
  sh.getRange(LOG_START, 1, 1, LOG_HEADER.length).setValues([LOG_HEADER])
    .setFontWeight('bold').setBackground('#2b2520').setFontColor('#f1e6cf').setHorizontalAlignment('center');
  sh.setFrozenRows(LOG_START);
  sh.setColumnWidth(1, 160); sh.setColumnWidth(2, 110); sh.setColumnWidth(3, 150);
  sh.setColumnWidth(8, 260); sh.setColumnWidth(9, 150); sh.setColumnWidth(10, 140);
  sh.getRange(LOG_START + 1, 5, 2000, 3).setNumberFormat('#,##0');
  return sh;
}

function createAccount(sh, user, hash, createdAt, device) {
  var row = sh.getLastRow() + 1;
  if (row < 2) row = 2;
  var t = now();
  var vals = [];
  for (var i = 0; i < COLS.length; i++) vals.push('');
  vals[C['帳號'] - 1] = user;
  vals[C['遊戲幣餘額'] - 1] = START_COINS;
  vals[C['總局數'] - 1] = 0; vals[C['勝'] - 1] = 0; vals[C['負'] - 1] = 0; vals[C['和'] - 1] = 0;
  vals[C['勝率'] - 1] = 0; vals[C['累計下注'] - 1] = 0; vals[C['淨輸贏'] - 1] = 0;
  vals[C['建立時間'] - 1] = createdAt ? fmtTime(createdAt) : t;
  vals[C['最後登入'] - 1] = t;
  vals[C['登入次數'] - 1] = 0;
  vals[C['最後使用裝置'] - 1] = device || '';
  vals[C['密碼雜湊（系統用）'] - 1] = hash;
  vals[C['狀態資料（系統用）'] - 1] = '{}';
  sh.getRange(row, 1, 1, COLS.length).setValues([vals]);
  var ps = playerSheet(user, true);
  ps.getRange('B3').setValue(vals[C['建立時間'] - 1]);
  ps.getRange('B4').setValue(START_COINS);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  sh.getRange(row, C['個人工作表']).setFormula('=HYPERLINK("#gid=' + ps.getSheetId() + '","開啟紀錄")');
  ps.appendRow([t, '建立帳號', '', '', 0, START_COINS, START_COINS, '新帳號贈送 ' + START_COINS + ' 遊戲幣', device || '', '']);
  return row;
}

function readRow(sh, row) {
  return sh.getRange(row, 1, 1, COLS.length).getValues()[0];
}

function login(req) {
  if (!validName(req.user) || !req.hash) return { ok: false, message: '帳號格式不正確' };
  var sh = overview();
  var row = findRow(sh, req.user);
  var created = false;
  if (!row) {
    if (!req.create) return { ok: false, code: 'NO_ACCOUNT' };
    row = createAccount(sh, req.user, req.hash, null, req.device);
    created = true;
  }
  var v = readRow(sh, row);
  if (String(v[C['密碼雜湊（系統用）'] - 1]) !== req.hash) return { ok: false, code: 'BAD_PASSWORD' };
  sh.getRange(row, C['最後登入']).setValue(now());
  sh.getRange(row, C['登入次數']).setValue(Number(v[C['登入次數'] - 1] || 0) + 1);
  sh.getRange(row, C['最後使用裝置']).setValue(req.device || '');
  var state = {};
  try { state = JSON.parse(v[C['狀態資料（系統用）'] - 1] || '{}'); } catch (x) {}
  return {
    ok: true, created: created,
    profile: {
      user: String(v[C['帳號'] - 1]), balance: Number(v[C['遊戲幣餘額'] - 1]),
      createdAt: String(v[C['建立時間'] - 1]), state: state, recent: recentEvents(String(v[C['帳號'] - 1]))
    }
  };
}

function recentEvents(user) {
  var ps = playerSheet(user, false);
  if (!ps) return [];
  var last = ps.getLastRow();
  if (last <= LOG_START) return [];
  var n = Math.min(60, last - LOG_START);
  var rows = ps.getRange(last - n + 1, 1, n, LOG_HEADER.length).getValues();
  var out = [];
  for (var i = rows.length - 1; i >= 0; i--) {
    var r = rows[i];
    if (!r[9]) continue;
    out.push({ id: String(r[9]), t: new Date(r[0]).toISOString(), game: r[1], mode: r[2], result: r[3], bet: Number(r[4]), delta: Number(r[5]), balance: Number(r[6]), note: r[7], device: r[8], type: r[3] === '領取' ? 'bonus' : r[3] === '圈速' ? 'lap' : 'game' });
  }
  return out;
}

function sync(req) {
  if (!validName(req.user) || !req.hash) return { ok: false, message: '帳號格式不正確' };
  var sh = overview();
  var row = findRow(sh, req.user);
  if (!row) {
    if (!req.create) return { ok: false, code: 'NO_ACCOUNT', message: '帳號不存在' };
    row = createAccount(sh, req.user, req.hash, req.createdAt, req.device);
  }
  var v = readRow(sh, row);
  if (String(v[C['密碼雜湊（系統用）'] - 1]) !== req.hash) return { ok: false, code: 'BAD_PASSWORD' };
  var user = String(v[C['帳號'] - 1]);
  var ps = playerSheet(user, true);

  var balance = Number(v[C['遊戲幣餘額'] - 1]);
  var plays = Number(v[C['總局數'] - 1] || 0), wins = Number(v[C['勝'] - 1] || 0);
  var losses = Number(v[C['負'] - 1] || 0), draws = Number(v[C['和'] - 1] || 0);
  var wagered = Number(v[C['累計下注'] - 1] || 0), net = Number(v[C['淨輸贏'] - 1] || 0);

  var events = req.events || [];
  if (events.length) {
    // 以事件編號去除重複（同一筆因斷線重送時不會重複入帳）
    var seen = {};
    var last = ps.getLastRow();
    if (last > LOG_START) {
      var n = Math.min(600, last - LOG_START);
      var ids = ps.getRange(last - n + 1, 10, n, 1).getValues();
      for (var i = 0; i < ids.length; i++) seen[String(ids[i][0])] = true;
    }
    var rows = [];
    var gameCounts = {};
    for (var j = 0; j < events.length; j++) {
      var ev = events[j];
      if (!ev || !ev.id || seen[ev.id]) continue;
      seen[ev.id] = true;
      var delta = Math.round(Number(ev.delta) || 0);
      var bet = Math.round(Number(ev.bet) || 0);
      balance += delta;
      if (ev.type === 'game') {
        plays++; wagered += bet; net += delta;
        if (ev.result === '勝') wins++; else if (ev.result === '負') losses++; else draws++;
        gameCounts[ev.game] = (gameCounts[ev.game] || 0) + 1;
      }
      if (ev.type === 'lap') { recordLap(user, ev); }
      rows.push([fmtTime(ev.t), ev.game || '', ev.mode || '', ev.result || '', bet, delta, balance, ev.note || '', ev.device || '', ev.id]);
    }
    if (rows.length) ps.getRange(ps.getLastRow() + 1, 1, rows.length, LOG_HEADER.length).setValues(rows);
    for (var g in gameCounts) addGameCount(sh, row, g, gameCounts[g]);
  }

  var t = now();
  sh.getRange(row, C['遊戲幣餘額'], 1, 8).setValues([[balance, plays, wins, losses, draws, plays ? wins / plays : 0, wagered, net]]);
  sh.getRange(row, C['最後同步']).setValue(t);
  sh.getRange(row, C['最後使用裝置']).setValue(req.device || '');
  // 遊戲進度（各遊戲的設定與存檔）：以時間較新的為準；伺服器較新時回傳給裝置
  var newer = null;
  if (req.state) {
    var stored = {};
    try { stored = JSON.parse(v[C['狀態資料（系統用）'] - 1] || '{}'); } catch (x) {}
    var st = req.state;
    if (stored.settings && Number(stored.settingsAt || 0) > Number(st.settingsAt || 0)) {
      st.settings = stored.settings; st.settingsAt = stored.settingsAt;
      newer = { settings: stored.settings, settingsAt: stored.settingsAt };
    }
    var text = JSON.stringify(st);
    // 試算表一格上限 50,000 字：太大時保留原本雲端的進度
    if (text.length > 49000) { st.settings = stored.settings; st.settingsAt = stored.settingsAt; text = JSON.stringify(st); }
    if (text.length <= 49000) sh.getRange(row, C['狀態資料（系統用）']).setValue(text);
  }
  ps.getRange('B4:B7').setValues([[balance], [plays + '（' + wins + '／' + losses + '／' + draws + '）'], [net], [t]]);
  return { ok: true, balance: balance, state: newer, serverTime: new Date().toISOString() };
}

// 每款遊戲各有一欄「<遊戲名>局數」，新遊戲出現時自動加欄，不需要改程式
function addGameCount(sh, row, game, n) {
  var title = game + '局數';
  var lastCol = sh.getLastColumn();
  var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  var col = headers.indexOf(title) + 1;
  if (!col) {
    col = lastCol + 1;
    sh.getRange(1, col).setValue(title).setFontWeight('bold').setBackground('#2b2520').setFontColor('#f1e6cf').setHorizontalAlignment('center');
  }
  var cell = sh.getRange(row, col);
  cell.setValue(Number(cell.getValue() || 0) + n);
}

function leaderboard() {
  var sh = overview();
  var last = sh.getLastRow();
  if (last < 2) return { ok: true, rows: [] };
  var vals = sh.getRange(2, 1, last - 1, C['淨輸贏']).getValues();
  var rows = [];
  for (var i = 0; i < vals.length; i++) {
    if (!vals[i][0]) continue;
    rows.push({ user: String(vals[i][0]), balance: Number(vals[i][C['遊戲幣餘額'] - 1]), plays: Number(vals[i][C['總局數'] - 1] || 0), wins: Number(vals[i][C['勝'] - 1] || 0) });
  }
  rows.sort(function (a, b) { return b.balance - a.balance; });
  return { ok: true, rows: rows.slice(0, 30) };
}

// ---------------------------------------------------------------------------
// 極速山道：計時賽圈速排行（「賽車排行」工作表，每個帳號在每條賽道只保留最佳一圈）
var RACE_SHEET = '賽車排行';
var RACE_HEADER = ['賽道代號', '賽道', '帳號', '最佳圈速（秒）', '車款', '紀錄時間', '毫秒（系統用）'];
function raceSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(RACE_SHEET);
  if (!sh) {
    sh = ss.insertSheet(RACE_SHEET);
    sh.getRange(1, 1, 1, RACE_HEADER.length).setValues([RACE_HEADER]).setFontWeight('bold').setBackground('#2b2520').setFontColor('#f1e6cf');
    sh.setFrozenRows(1);
  }
  return sh;
}
function recordLap(user, ev) {
  var ms = Math.round(Number(ev.ms) || 0);
  if (!ev.track || ms < 20000 || ms > 1800000) return; // 過濾不合理的圈速
  var sh = raceSheet();
  var last = sh.getLastRow();
  var vals = last > 1 ? sh.getRange(2, 1, last - 1, 7).getValues() : [];
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]) === String(ev.track) && String(vals[i][2]) === user) {
      if (ms < Number(vals[i][6])) sh.getRange(i + 2, 1, 1, 7).setValues([[ev.track, ev.mode || '', user, (ms / 1000).toFixed(3), ev.car || '', fmtTime(ev.t), ms]]);
      return;
    }
  }
  sh.appendRow([ev.track, ev.mode || '', user, (ms / 1000).toFixed(3), ev.car || '', fmtTime(ev.t), ms]);
}
function raceboard(req) {
  var sh = raceSheet();
  var last = sh.getLastRow();
  if (last < 2) return { ok: true, rows: [] };
  var vals = sh.getRange(2, 1, last - 1, 7).getValues();
  var rows = [];
  for (var i = 0; i < vals.length; i++) if (String(vals[i][0]) === String(req.track)) rows.push({ user: String(vals[i][2]), ms: Number(vals[i][6]), car: String(vals[i][4]), at: String(vals[i][5]) });
  rows.sort(function (a, b) { return a.ms - b.ms; });
  return { ok: true, rows: rows.slice(0, 30) };
}
