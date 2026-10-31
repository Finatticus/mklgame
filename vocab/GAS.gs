/**
 * Vocab Pro 後端（Google Apps Script）
 *
 * 部署：擴充功能 → Apps Script，貼上本檔 → 部署 → 管理部署作業 → 編輯 → 新版本。
 * 指令碼屬性（專案設定 → 指令碼屬性）：
 *   GEMINI_API_KEY   必填（主題單字包）
 *   GUARDIAN_API_KEY 選填（未填時使用 Guardian 測試金鑰）
 *   GEMINI_MODELS    選填，逗號分隔的模型清單，例如 "gemini-2.5-flash,gemini-2.5-flash-lite"
 *   SPREADSHEET_ID   選填，未綁定試算表時使用
 */

var API_VERSION = 2;

var WORD_HEADERS = ["ID", "Book", "English", "Chinese", "Notes", "Timestamp", "NextReviewTime", "Interval",
  "EaseFactor", "POS", "Example", "Phonetic", "Updated", "Reviews", "Lapses"];
var WORD_FIELDS = ["id", "book", "english", "chinese", "notes", "timestamp", "nextReviewTime", "interval",
  "easeFactor", "pos", "example", "phonetic", "updated", "reviews", "lapses"];
var WORD_NUMERIC = { nextReviewTime: 1, interval: 1, easeFactor: 1, updated: 1, reviews: 1, lapses: 1 };

var ARTICLE_HEADERS = ["ID", "Title", "Content", "ParasPerBlock", "Created", "BookmarkIndex", "Translations", "Folder", "Order"];
var ARTICLE_FIELDS = ["id", "title", "content", "parasPerBlock", "created", "bookmarkIndex", "translations", "folder", "order"];

var LOG_HEADERS = ["Date", "Reviews", "Correct", "New"];
var SETTINGS_HEADERS = ["Key", "Value"];

var DEFAULT_BOOK = "預設單字本";
var UNSORTED = "未分類";

// 每分鐘每位使用者的呼叫上限
var RATE_LIMITS = { gemini: 10, translate: 120, news: 30 };

// ===================== 進入點 =====================

function doGet() {
  return json({ status: "success", app: "Vocab Pro", apiVersion: API_VERSION });
}

function doPost(e) {
  var lock = null;
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var username = validateUsername(data.username);
    var handler = HANDLERS[action];
    if (!handler) throw new Error("未知的操作：" + action);

    if (RATE_LIMITS[action]) checkRateLimit(username, action, RATE_LIMITS[action]);

    if (WRITE_ACTIONS[action] || action === "login" || action === "getData") {
      lock = LockService.getScriptLock();
      lock.waitLock(25000);
    }
    var ss = getSpreadsheet();
    var ctx = { ss: ss, username: username, data: data };
    if (action !== "login") ensureUserSheets(ctx, false);
    var result = handler(ctx) || {};
    result.status = "success";
    result.apiVersion = API_VERSION;
    return json(result);
  } catch (err) {
    return json({ status: "error", message: err && err.message ? err.message : String(err), apiVersion: API_VERSION });
  } finally {
    if (lock) lock.releaseLock();
  }
}

var WRITE_ACTIONS = {
  addWords: 1, updateWords: 1, deleteWords: 1, deleteBook: 1,
  saveArticle: 1, updateArticles: 1, deleteArticles: 1, reorderArticles: 1,
  saveSettings: 1, logReview: 1, saveScore: 1
};

var HANDLERS = {
  login: function (ctx) {
    ensureUserSheets(ctx, true);
    return { settings: readSettings(ctx) };
  },

  // 增量同步：since = 上次同步的伺服器時間（毫秒），0 代表全部
  getData: function (ctx) {
    var since = Number(ctx.data.since) || 0;
    var sheet = wordSheet(ctx);
    var rows = dataRows(sheet, WORD_HEADERS.length);
    var words = [];
    var ids = [];
    for (var i = 0; i < rows.length; i++) {
      var w = rowToWord(rows[i]);
      if (!w.id) continue;
      ids.push(w.id);
      if (!since || !w.updated || w.updated > since) words.push(w);
    }
    return {
      words: words,
      ids: ids,
      full: !since,
      serverTime: Date.now(),
      settings: readSettings(ctx),
      log: readLog(ctx, 120)
    };
  },

  // words: [{id, book, english, ...}]；id 已存在則略過（離線重送不會重複）
  addWords: function (ctx) {
    var list = ctx.data.words || [];
    if (!list.length) return { added: 0 };
    var sheet = wordSheet(ctx);
    var existing = idIndex(sheet);
    var now = Date.now();
    var newRows = [];
    for (var i = 0; i < list.length; i++) {
      var w = list[i];
      if (!w.id || existing[w.id]) continue;
      existing[w.id] = true;
      newRows.push(wordToRow({
        id: w.id, book: w.book || DEFAULT_BOOK, english: w.english || "", chinese: w.chinese || "",
        notes: w.notes || "", timestamp: w.timestamp || new Date(now).toISOString(),
        nextReviewTime: 0, interval: 0, easeFactor: 2.5, pos: w.pos || "", example: w.example || "",
        phonetic: w.phonetic || "", updated: now, reviews: 0, lapses: 0
      }));
    }
    if (newRows.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, WORD_HEADERS.length).setValues(newRows);
    }
    return { added: newRows.length };
  },

  // updates: [{id, fields: {book, chinese, ...}}]
  updateWords: function (ctx) {
    var updated = patchRows(wordSheet(ctx), WORD_HEADERS, WORD_FIELDS, ctx.data.updates || [], true);
    return { updated: updated };
  },

  deleteWords: function (ctx) {
    var ids = ctx.data.ids || [];
    var set = {};
    ids.forEach(function (id) { set[id] = true; });
    var removed = removeRows(wordSheet(ctx), WORD_HEADERS.length, function (row) { return set[String(row[0])]; });
    return { deleted: removed };
  },

  deleteBook: function (ctx) {
    var book = ctx.data.book;
    var removed = removeRows(wordSheet(ctx), WORD_HEADERS.length, function (row) { return String(row[1]) === book; });
    return { deleted: removed };
  },

  getArticles: function (ctx) {
    var rows = dataRows(articleSheet(ctx), ARTICLE_HEADERS.length);
    var list = [];
    for (var i = 0; i < rows.length; i++) {
      var a = rowToArticle(rows[i]);
      if (a.id) list.push(a);
    }
    list.sort(function (a, b) { return a.order - b.order; });
    return { articles: list };
  },

  saveArticle: function (ctx) {
    var a = ctx.data.article;
    if (!a || !a.id) throw new Error("文章缺少 ID");
    var sheet = articleSheet(ctx);
    var row = articleToRow(a);
    var found = findRowById(sheet, a.id);
    if (found) sheet.getRange(found, 1, 1, ARTICLE_HEADERS.length).setValues([row]);
    else sheet.getRange(sheet.getLastRow() + 1, 1, 1, ARTICLE_HEADERS.length).setValues([row]);
    return {};
  },

  // updates: [{id, fields: {folder, bookmarkIndex, translations, ...}}]
  updateArticles: function (ctx) {
    var updates = (ctx.data.updates || []).map(function (u) {
      var f = {};
      for (var k in u.fields) f[k] = k === "translations" ? JSON.stringify(u.fields[k] || []) : u.fields[k];
      return { id: u.id, fields: f };
    });
    return { updated: patchRows(articleSheet(ctx), ARTICLE_HEADERS, ARTICLE_FIELDS, updates, false) };
  },

  deleteArticles: function (ctx) {
    var set = {};
    (ctx.data.ids || []).forEach(function (id) { set[id] = true; });
    return { deleted: removeRows(articleSheet(ctx), ARTICLE_HEADERS.length, function (row) { return set[String(row[0])]; }) };
  },

  // 只改 Order 欄，不重寫文章內容
  reorderArticles: function (ctx) {
    var ids = ctx.data.ids || [];
    var updates = ids.map(function (id, i) { return { id: id, fields: { order: i } }; });
    return { updated: patchRows(articleSheet(ctx), ARTICLE_HEADERS, ARTICLE_FIELDS, updates, false) };
  },

  // settings: {books: [...], defaultBook, folders: [...], newPerDay}
  saveSettings: function (ctx) {
    var sheet = settingsSheet(ctx);
    var incoming = ctx.data.settings || {};
    var rows = dataRows(sheet, 2);
    var index = {};
    rows.forEach(function (r, i) { index[String(r[0])] = i; });
    for (var key in incoming) {
      var val = JSON.stringify(incoming[key]);
      if (index[key] !== undefined) rows[index[key]][1] = val;
      else { index[key] = rows.length; rows.push([key, val]); }
    }
    if (rows.length) sheet.getRange(2, 1, rows.length, 2).setValues(rows);
    return { settings: readSettings(ctx) };
  },

  // 依日期累加：{date: "2026-10-31", reviews, correct, newCount}
  logReview: function (ctx) {
    var d = ctx.data;
    var sheet = logSheet(ctx);
    var rows = dataRows(sheet, LOG_HEADERS.length);
    var idx = -1;
    for (var i = rows.length - 1; i >= 0; i--) {
      if (dateKey(rows[i][0]) === d.date) { idx = i; break; }
    }
    if (idx === -1) {
      sheet.appendRow(["'" + d.date, d.reviews || 0, d.correct || 0, d.newCount || 0]);
    } else {
      var r = rows[idx];
      sheet.getRange(idx + 2, 2, 1, 3).setValues([[
        (Number(r[1]) || 0) + (d.reviews || 0),
        (Number(r[2]) || 0) + (d.correct || 0),
        (Number(r[3]) || 0) + (d.newCount || 0)
      ]]);
    }
    return {};
  },

  saveScore: function (ctx) {
    var props = PropertiesService.getScriptProperties();
    var key = ctx.username + "_" + ctx.data.game;
    var current = parseInt(props.getProperty(key), 10) || 0;
    var score = parseInt(ctx.data.score, 10) || 0;
    if (score > current) {
      props.setProperty(key, String(score));
      return { newHighScore: true, score: score };
    }
    return { newHighScore: false, score: current };
  },

  getScores: function (ctx) {
    var props = PropertiesService.getScriptProperties();
    return {
      meteor: parseInt(props.getProperty(ctx.username + "_meteor"), 10) || 0,
      runner: parseInt(props.getProperty(ctx.username + "_runner"), 10) || 0
    };
  },

  // 前端 Google 翻譯失敗時的備援：texts: [...]
  translate: function (ctx) {
    var texts = ctx.data.texts || [];
    var sl = ctx.data.sl === "auto" ? "" : (ctx.data.sl || "en");
    var tl = ctx.data.tl || "zh-TW";
    return {
      results: texts.slice(0, 20).map(function (t) {
        try { return LanguageApp.translate(String(t), sl, tl); } catch (e) { return ""; }
      })
    };
  },

  news: function (ctx) {
    var key = PropertiesService.getScriptProperties().getProperty("GUARDIAN_API_KEY") || "test";
    var section = String(ctx.data.section || "world").replace(/[^a-z-]/g, "");
    var url = "https://content.guardianapis.com/search?show-fields=body&page-size=15&section=" + section +
      "&api-key=" + encodeURIComponent(key);
    var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) throw new Error("新聞服務回應錯誤 (" + res.getResponseCode() + ")");
    var body = JSON.parse(res.getContentText());
    var results = (body.response && body.response.results) || [];
    return {
      items: results.map(function (r) {
        return { title: r.webTitle, url: r.webUrl, body: r.fields ? r.fields.body : "" };
      })
    };
  },

  gemini: function (ctx) {
    var props = PropertiesService.getScriptProperties();
    var apiKey = props.getProperty("GEMINI_API_KEY");
    if (!apiKey) throw new Error("尚未設定 GEMINI_API_KEY（GAS 專案設定 → 指令碼屬性）");
    var models = (props.getProperty("GEMINI_MODELS") || "gemini-2.5-flash,gemini-2.5-flash-lite")
      .split(",").map(function (m) { return m.trim(); }).filter(String);

    // 上次成功的模型排第一個，避免每次先失敗幾輪
    var cache = CacheService.getScriptCache();
    var lastGood = cache.get("gemini_last_model");
    if (lastGood && models.indexOf(lastGood) > 0) {
      models.splice(models.indexOf(lastGood), 1);
      models.unshift(lastGood);
    }

    var errors = [];
    for (var i = 0; i < models.length; i++) {
      var url = "https://generativelanguage.googleapis.com/v1beta/models/" + models[i] + ":generateContent";
      try {
        var res = UrlFetchApp.fetch(url, {
          method: "post",
          contentType: "application/json",
          headers: { "x-goog-api-key": apiKey },
          payload: JSON.stringify({ contents: ctx.data.history, generationConfig: { temperature: 0.7 } }),
          muteHttpExceptions: true
        });
        var body = JSON.parse(res.getContentText());
        if (res.getResponseCode() === 200 && body.candidates && body.candidates.length) {
          cache.put("gemini_last_model", models[i], 21600);
          return { text: body.candidates[0].content.parts[0].text, model: models[i] };
        }
        errors.push(models[i] + ": " + (body.error ? body.error.message : res.getResponseCode()));
      } catch (e) {
        errors.push(models[i] + ": " + e);
      }
    }
    throw new Error("Gemini 呼叫失敗：" + errors.join(" | "));
  }
};

// ===================== 工作表與結構 =====================

function getSpreadsheet() {
  var id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  var ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("找不到試算表！");
  return ss;
}

function validateUsername(name) {
  var u = (name === undefined || name === null) ? "" : String(name).trim();
  if (!u) throw new Error("請提供帳號名稱！");
  if (u.length > 30) throw new Error("帳號名稱最多 30 個字");
  if (/[\[\]\*\?\/\\:'"]/.test(u)) throw new Error("帳號名稱不能包含 [ ] * ? / \\ : ' \" 等符號");
  if (/_(Articles|Settings|Log|backup.*)$/i.test(u)) throw new Error("帳號名稱不能以 _Articles、_Settings、_Log、_backup 結尾");
  return u;
}

function wordSheet(ctx) { return ctx.ss.getSheetByName(ctx.username); }
function articleSheet(ctx) { return ctx.ss.getSheetByName(ctx.username + "_Articles"); }
function settingsSheet(ctx) { return ctx.ss.getSheetByName(ctx.username + "_Settings"); }
function logSheet(ctx) { return ctx.ss.getSheetByName(ctx.username + "_Log"); }

// 建立缺少的工作表，並把舊版資料表升級成新欄位（升級前先備份）
function ensureUserSheets(ctx, createIfMissing) {
  var ss = ctx.ss;
  var name = ctx.username;
  var words = ss.getSheetByName(name);
  if (!words) {
    if (!createIfMissing) throw new Error("找不到該使用者的資料，請重新登入");
    words = ss.insertSheet(name);
    words.getRange(1, 1, 1, WORD_HEADERS.length).setValues([WORD_HEADERS]);
  } else {
    migrateWordSheet(ss, words, name);
  }

  var articles = ss.getSheetByName(name + "_Articles");
  if (!articles) {
    articles = ss.insertSheet(name + "_Articles");
    articles.getRange(1, 1, 1, ARTICLE_HEADERS.length).setValues([ARTICLE_HEADERS]);
  } else {
    migrateArticleSheet(articles);
  }

  if (!ss.getSheetByName(name + "_Settings")) {
    ss.insertSheet(name + "_Settings").getRange(1, 1, 1, 2).setValues([SETTINGS_HEADERS]);
  }
  if (!ss.getSheetByName(name + "_Log")) {
    ss.insertSheet(name + "_Log").getRange(1, 1, 1, LOG_HEADERS.length).setValues([LOG_HEADERS]);
  }
}

function migrateWordSheet(ss, sheet, name) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var header = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  if (String(header[0]) === "ID") {
    if (header.length < WORD_HEADERS.length || String(header[WORD_HEADERS.length - 1]) !== WORD_HEADERS[WORD_HEADERS.length - 1]) {
      sheet.getRange(1, 1, 1, WORD_HEADERS.length).setValues([WORD_HEADERS]);
    }
    return;
  }

  // 舊版欄位：Book, English, Chinese, Notes, Timestamp, NextReviewTime, Interval, EaseFactor, POS, Example
  sheet.copyTo(ss).setName(name + "_backup_" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmm"));
  var lastRow = sheet.getLastRow();
  var now = Date.now();
  var out = [WORD_HEADERS];
  if (lastRow > 1) {
    var old = sheet.getRange(2, 1, lastRow - 1, Math.max(lastCol, 10)).getValues();
    for (var i = 0; i < old.length; i++) {
      var r = old[i];
      if (!r[0] && !r[1]) continue;
      out.push([
        Utilities.getUuid(), r[0] || DEFAULT_BOOK, r[1] || "", r[2] || "", r[3] || "",
        r[4] ? new Date(r[4]).toISOString() : "", Number(r[5]) || 0, Number(r[6]) || 0, Number(r[7]) || 2.5,
        r[8] || "", r[9] || "", "", now, 0, 0
      ]);
    }
  }
  sheet.clearContents();
  sheet.getRange(1, 1, out.length, WORD_HEADERS.length).setValues(out);
}

function migrateArticleSheet(sheet) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var header = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  if (String(header[ARTICLE_HEADERS.length - 1]) === "Order") return;
  sheet.getRange(1, 1, 1, ARTICLE_HEADERS.length).setValues([ARTICLE_HEADERS]);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var folders = sheet.getRange(2, 8, lastRow - 1, 1).getValues();
  var fill = [];
  for (var i = 0; i < lastRow - 1; i++) fill.push([folders[i][0] || UNSORTED, i]);
  sheet.getRange(2, 8, lastRow - 1, 2).setValues(fill);
}

// ===================== 資料列操作 =====================

function dataRows(sheet, width) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, width).getValues();
}

function idIndex(sheet) {
  var map = {};
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return map;
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (ids[i][0]) map[String(ids[i][0])] = i + 2;
  return map;
}

function findRowById(sheet, id) {
  return idIndex(sheet)[String(id)] || 0;
}

// 少量更新逐列寫入；大量更新一次讀寫整張表（不會先清空）
function patchRows(sheet, headers, fields, updates, touchUpdated) {
  if (!updates.length) return 0;
  var width = headers.length;
  var colOf = {};
  fields.forEach(function (f, i) { colOf[f] = i; });
  var now = Date.now();
  var index = idIndex(sheet);
  var count = 0;

  var apply = function (row, u) {
    for (var key in u.fields) {
      if (key === "id" || colOf[key] === undefined) continue;
      row[colOf[key]] = u.fields[key];
    }
    if (touchUpdated) row[colOf.updated] = now;
  };

  if (updates.length <= 20) {
    updates.forEach(function (u) {
      var r = index[String(u.id)];
      if (!r) return;
      var range = sheet.getRange(r, 1, 1, width);
      var row = range.getValues()[0];
      apply(row, u);
      range.setValues([row]);
      count++;
    });
    return count;
  }

  var rows = dataRows(sheet, width);
  updates.forEach(function (u) {
    var r = index[String(u.id)];
    if (!r) return;
    apply(rows[r - 2], u);
    count++;
  });
  if (rows.length) sheet.getRange(2, 1, rows.length, width).setValues(rows);
  return count;
}

// 保留其餘資料列並覆寫，再刪掉尾端多出的列；不使用 clearContents，中途失敗也不會整張表消失
function removeRows(sheet, width, shouldRemove) {
  var rows = dataRows(sheet, width);
  if (!rows.length) return 0;
  var kept = rows.filter(function (r) { return !shouldRemove(r); });
  var removed = rows.length - kept.length;
  if (!removed) return 0;
  if (removed <= 10) {
    for (var i = rows.length - 1; i >= 0; i--) if (shouldRemove(rows[i])) sheet.deleteRow(i + 2);
    return removed;
  }
  if (kept.length) sheet.getRange(2, 1, kept.length, width).setValues(kept);
  sheet.deleteRows(kept.length + 2, removed);
  return removed;
}

function rowToWord(r) {
  var w = {};
  for (var i = 0; i < WORD_FIELDS.length; i++) {
    var f = WORD_FIELDS[i];
    var v = r[i];
    if (WORD_NUMERIC[f]) w[f] = Number(v) || 0;
    else if (v instanceof Date) w[f] = v.toISOString();
    else w[f] = v === null || v === undefined ? "" : String(v).trim();
  }
  if (!w.easeFactor) w.easeFactor = 2.5;
  if (!w.book) w.book = DEFAULT_BOOK;
  return w;
}

function wordToRow(w) {
  return WORD_FIELDS.map(function (f) { return w[f] === undefined ? "" : w[f]; });
}

function rowToArticle(r) {
  var translations = [];
  try { translations = r[6] ? JSON.parse(String(r[6])) : []; } catch (e) { translations = []; }
  return {
    id: String(r[0]), title: String(r[1]), content: String(r[2]),
    parasPerBlock: parseInt(r[3], 10) || 1, created: Number(r[4]) || 0,
    bookmarkIndex: parseInt(r[5], 10) || 0, translations: translations,
    folder: r[7] ? String(r[7]) : UNSORTED, order: Number(r[8]) || 0
  };
}

function articleToRow(a) {
  return [String(a.id), a.title || "", a.content || "", a.parasPerBlock || 1, a.created || Date.now(),
    a.bookmarkIndex || 0, JSON.stringify(a.translations || []), a.folder || UNSORTED, Number(a.order) || 0];
}

function readSettings(ctx) {
  var out = {};
  dataRows(settingsSheet(ctx), 2).forEach(function (r) {
    try { out[String(r[0])] = JSON.parse(String(r[1])); } catch (e) { /* 略過壞掉的設定 */ }
  });
  return out;
}

function readLog(ctx, days) {
  var rows = dataRows(logSheet(ctx), LOG_HEADERS.length);
  return rows.slice(-days).map(function (r) {
    return { date: dateKey(r[0]), reviews: Number(r[1]) || 0, correct: Number(r[2]) || 0, newCount: Number(r[3]) || 0 };
  });
}

function dateKey(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
  return String(v).replace(/^'/, "");
}

// ===================== 其他 =====================

function checkRateLimit(username, action, limit) {
  var cache = CacheService.getScriptCache();
  var key = "rl_" + action + "_" + Utilities.base64EncodeWebSafe(username) + "_" + Math.floor(Date.now() / 60000);
  var n = (parseInt(cache.get(key), 10) || 0) + 1;
  if (n > limit) throw new Error("操作太頻繁，請稍後再試");
  cache.put(key, String(n), 120);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// 第一次部署時手動執行一次，授權 UrlFetchApp 與 LanguageApp
function forceAuth() {
  UrlFetchApp.fetch("https://www.google.com");
  LanguageApp.translate("hello", "en", "zh-TW");
}
