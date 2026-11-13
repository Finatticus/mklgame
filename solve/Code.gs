/**
 * 問題分析與解決 工作板 — Google Apps Script 後端
 * 綁定在一份 Google 試算表上；資料存在名為 ents 的工作表（自動建立）。
 * 欄位：pid（專案）｜id（項目）｜rev（版本序號）｜json（內容）
 */
var SHEET = 'ents';

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET);
  if (!sh) {
    sh = ss.insertSheet(SHEET);
    sh.getRange(1, 1, 1, 4).setValues([['pid', 'id', 'rev', 'json']]);
    sh.getRange('A:B').setNumberFormat('@');
    sh.getRange('D:D').setNumberFormat('@');
    sh.setFrozenRows(1);
  }
  return sh;
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return out_({ ok: true, msg: '問題分析與解決 工作板 API 運作中' });
}

function doPost(e) {
  try {
    var req = JSON.parse(e.postData.contents || '{}');
    var changes = req.changes || [];
    var props = PropertiesService.getScriptProperties();
    var rev = Number(props.getProperty('rev') || 0);
    var since = Number(req.since || 0);
    if (since > rev) since = 0; // 伺服器資料被重置時，讓用戶端重新抓全部

    // 沒有變更、也沒有新資料：直接回覆，不讀試算表
    if (!changes.length && since === rev) return out_({ ok: true, rev: rev, ents: [] });

    var rows;
    if (changes.length) {
      var lock = LockService.getScriptLock();
      lock.waitLock(20000);
      try {
        var sh = getSheet_();
        rev = Number(props.getProperty('rev') || 0);
        rows = readRows_(sh);
        var idx = {};
        for (var i = 0; i < rows.length; i++) idx[rows[i][0] + '|' + rows[i][1]] = i;
        for (var c = 0; c < changes.length; c++) {
          var ch = changes[c];
          if (!ch || !ch.pid || !ch.id) continue;
          rev++;
          var row = [String(ch.pid), String(ch.id), rev, String(ch.json)];
          var key = row[0] + '|' + row[1];
          if (key in idx) rows[idx[key]] = row;
          else { idx[key] = rows.length; rows.push(row); }
        }
        if (rows.length) sh.getRange(2, 1, rows.length, 4).setValues(rows);
        props.setProperty('rev', String(rev));
      } finally {
        lock.releaseLock();
      }
    } else {
      rows = readRows_(getSheet_());
    }

    var ents = [];
    for (var r = 0; r < rows.length; r++) {
      if (Number(rows[r][2]) > since) ents.push({ pid: String(rows[r][0]), id: String(rows[r][1]), json: String(rows[r][3]) });
    }
    return out_({ ok: true, rev: rev, ents: ents });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  }
}

function readRows_(sh) {
  var last = sh.getLastRow();
  return last > 1 ? sh.getRange(2, 1, last - 1, 4).getValues() : [];
}
