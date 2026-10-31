/**
 * 燼火營地 — Google Apps Script 後端
 * 把這份程式碼貼到「綁定 Google 試算表」的 Apps Script 專案，部署成網頁應用程式即可。
 * 試算表中會自動建立 saves 工作表：A 欄 玩家ID、B 欄 更新時間、C 欄 修改時間、D 欄起 存檔 JSON（自動分段）
 * 以及 levels 工作表：自訂謎題關卡（每週謎題塔會優先使用），一列一關：
 *   A 名稱、B 類型（weekly）、C 生命、D 攻擊、E 防禦、F～P 共 11 欄地圖（每欄一列，11 個字元，字元說明見遊戲的玩法說明）
 */
const SHEET_NAME = 'saves';
const CHUNK = 45000; // 單一儲存格上限 50000 字元，保守切段
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function doGet(e) {
  const p = (e && e.parameter) || {};
  try {
    if (p.action === 'levels') return json({ ok: true, levels: readLevels() });
    if (p.action === 'load') {
      if (!ID_RE.test(p.id || '')) return json({ ok: false, error: 'bad id' });
      const row = findRow(p.id);
      return json({ ok: true, save: row ? readSave(row) : null });
    }
    return json({ ok: true, ping: 'emberhold' });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.action !== 'save') return json({ ok: false, error: 'unknown action' });
    if (!ID_RE.test(body.id || '')) return json({ ok: false, error: 'bad id' });
    const save = body.save;
    if (!save || typeof save.updatedAt !== 'number') return json({ ok: false, error: 'bad save' });

    lock.waitLock(10000);
    const row = findRow(body.id);
    if (row) {
      const stored = readSave(row);
      // 雲端比較新：不覆蓋，回傳雲端存檔讓客戶端採用
      if (stored && stored.updatedAt > save.updatedAt) return json({ ok: true, result: 'stale', save: stored });
    }
    writeSave(row, body.id, save);
    return json({ ok: true, result: 'saved' });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function sheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['id', 'updatedAt', 'modified', 'data']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function findRow(id) {
  const sh = sheet();
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const hit = sh.getRange(2, 1, last - 1, 1).createTextFinder(id).matchEntireCell(true).findNext();
  return hit ? hit.getRow() : 0;
}

function readSave(row) {
  const sh = sheet();
  const width = sh.getLastColumn();
  if (width < 4) return null;
  const parts = sh.getRange(row, 4, 1, width - 3).getValues()[0];
  const text = parts.join('');
  return text ? JSON.parse(text) : null;
}

function writeSave(row, id, save) {
  const sh = sheet();
  const text = JSON.stringify(save);
  const parts = [];
  for (let i = 0; i < text.length; i += CHUNK) parts.push(text.slice(i, i + CHUNK));
  if (!row) row = sh.getLastRow() + 1;
  // 清掉舊的多餘分段
  const width = sh.getLastColumn();
  if (width > 3) sh.getRange(row, 4, 1, width - 3).clearContent();
  sh.getRange(row, 1, 1, 3).setValues([[id, save.updatedAt, new Date()]]);
  sh.getRange(row, 4, 1, parts.length).setValues([parts]);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------- 自訂關卡 ----------
function levelSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('levels');
  if (!sh) {
    sh = ss.insertSheet('levels');
    sh.appendRow(['名稱', '類型', '生命', '攻擊', '防禦', '第1列', '第2列', '第3列', '第4列', '第5列', '第6列', '第7列', '第8列', '第9列', '第10列', '第11列']);
    sh.appendRow(['範例：鑰匙的抉擇', 'weekly', 400, 10, 10,
      'S.D#a.#..1.', '...y..#.#..', '.Y.#.0y.#d.', '####..###y#', '..1#.p.#...', '.d.y...y.2U', '..0#.Y.#...', '#y######b##', '.......#...', '.1.a.2.#.B.', '..p....#..c']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function readLevels() {
  const sh = levelSheet(), last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, 16).getDisplayValues()
    .filter(r => r[0] && r[5])
    .map(r => ({ name: r[0], type: r[1] || 'weekly', hero: { hp: +r[2] || 500, atk: +r[3] || 10, def: +r[4] || 10 }, map: r.slice(5, 16).map(x => String(x).slice(0, 11)) }));
}
