/**
 * Vocab 後端（Google Apps Script）— 英文 / 法文雙語版
 *
 * 部署：新建 Google 試算表 → 擴充功能 → Apps Script，貼上本檔 → 執行一次 forceAuth
 *       → 部署 → 新增部署作業 → 網頁應用程式（執行身分：我；存取權：所有人）。
 * 之後更新：部署 → 管理部署作業 → 編輯 → 新版本（網址不變）。
 *
 * 指令碼屬性（專案設定 → 指令碼屬性）：
 *   GEMINI_API_KEY   必填（AI 主題單字包）
 *   GUARDIAN_API_KEY 選填（英文新聞，未填時使用 Guardian 測試金鑰）
 *   GEMINI_MODELS    選填，逗號分隔，例如 "gemini-2.5-flash,gemini-2.5-flash-lite"
 */

var API_VERSION = 1;
var LANGS = { en: true, fr: true };

var WORD_HEADERS = ["ID", "Lang", "Book", "Term", "Meaning", "Notes", "Timestamp", "NextReviewTime", "Interval",
  "EaseFactor", "POS", "Example", "Phonetic", "Updated", "Reviews", "Lapses"];
var WORD_FIELDS = ["id", "lang", "book", "term", "meaning", "notes", "timestamp", "nextReviewTime", "interval",
  "easeFactor", "pos", "example", "phonetic", "updated", "reviews", "lapses"];
var WORD_NUMERIC = { nextReviewTime: 1, interval: 1, easeFactor: 1, updated: 1, reviews: 1, lapses: 1 };

var ARTICLE_HEADERS = ["ID", "Lang", "Title", "Content", "ParasPerBlock", "Created", "BookmarkIndex", "Translations", "Folder", "Order"];
var ARTICLE_FIELDS = ["id", "lang", "title", "content", "parasPerBlock", "created", "bookmarkIndex", "translations", "folder", "order"];

var LOG_HEADERS = ["Date", "Lang", "Reviews", "Correct", "New"];
var SETTINGS_HEADERS = ["Key", "Value"];

var DEFAULT_BOOK = "我的單字";
var UNSORTED = "未分類";

// 每分鐘每位使用者的呼叫上限
var RATE_LIMITS = { gemini: 10, translate: 120, news: 30 };

var WRITE_ACTIONS = {
  addWords: 1, updateWords: 1, deleteWords: 1, deleteBook: 1,
  saveArticle: 1, updateArticles: 1, deleteArticles: 1, reorderArticles: 1,
  saveSettings: 1, logReview: 1, saveScore: 1
};

// ===================== 進入點 =====================

function doGet() {
  return json({ status: "success", app: "Vocab", apiVersion: API_VERSION });
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

    if (WRITE_ACTIONS[action] || action === "login") {
      lock = LockService.getScriptLock();
      lock.waitLock(25000);
    }
    var ctx = { ss: getSpreadsheet(), username: username, data: data };
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

var HANDLERS = {
  login: function (ctx) {
    ensureUserSheets(ctx, true);
    return { settings: readSettings(ctx) };
  },

  // 增量同步：since = 上次同步的伺服器時間（毫秒），0 代表全部；回傳兩種語言的資料
  getData: function (ctx) {
    var since = Number(ctx.data.since) || 0;
    var rows = dataRows(wordSheet(ctx), WORD_HEADERS.length);
    var words = [];
    var ids = [];
    for (var i = 0; i < rows.length; i++) {
      var w = rowToWord(rows[i]);
      if (!w.id) continue;
      ids.push(w.id);
      if (!since || !w.updated || w.updated > since) words.push(w);
    }
    return { words: words, ids: ids, full: !since, serverTime: Date.now(), settings: readSettings(ctx), log: readLog(ctx, 240) };
  },

  // words: [{id, lang, book, term, ...}]；id 已存在則略過（離線重送不會重複）
  addWords: function (ctx) {
    var list = ctx.data.words || [];
    var sheet = wordSheet(ctx);
    var existing = idIndex(sheet);
    var now = Date.now();
    var newRows = [];
    for (var i = 0; i < list.length; i++) {
      var w = list[i];
      if (!w.id || existing[w.id]) continue;
      existing[w.id] = true;
      newRows.push(wordToRow({
        id: w.id, lang: checkLang(w.lang), book: w.book || DEFAULT_BOOK, term: w.term || "", meaning: w.meaning || "",
        notes: w.notes || "", timestamp: w.timestamp || new Date(now).toISOString(),
        nextReviewTime: 0, interval: 0, easeFactor: 2.5, pos: w.pos || "", example: w.example || "",
        phonetic: w.phonetic || "", updated: now, reviews: 0, lapses: 0
      }));
    }
    if (newRows.length) sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, WORD_HEADERS.length).setValues(newRows);
    return { added: newRows.length };
  },

  // updates: [{id, fields: {...}}]
  updateWords: function (ctx) {
    return { updated: patchRows(wordSheet(ctx), WORD_HEADERS, WORD_FIELDS, ctx.data.updates || [], true) };
  },

  deleteWords: function (ctx) {
    var set = toSet(ctx.data.ids);
    return { deleted: removeRows(wordSheet(ctx), WORD_HEADERS.length, function (r) { return set[String(r[0])]; }) };
  },

  deleteBook: function (ctx) {
    var lang = checkLang(ctx.data.lang);
    var book = ctx.data.book;
    return { deleted: removeRows(wordSheet(ctx), WORD_HEADERS.length, function (r) { return String(r[1]) === lang && String(r[2]) === book; }) };
  },

  getArticles: function (ctx) {
    var lang = checkLang(ctx.data.lang);
    var list = dataRows(articleSheet(ctx), ARTICLE_HEADERS.length).map(rowToArticle)
      .filter(function (a) { return a.id && a.lang === lang; });
    list.sort(function (a, b) { return a.order - b.order; });
    return { articles: list };
  },

  saveArticle: function (ctx) {
    var a = ctx.data.article;
    if (!a || !a.id) throw new Error("文章缺少 ID");
    var sheet = articleSheet(ctx);
    var row = articleToRow(a);
    var found = idIndex(sheet)[String(a.id)];
    if (found) sheet.getRange(found, 1, 1, ARTICLE_HEADERS.length).setValues([row]);
    else sheet.getRange(sheet.getLastRow() + 1, 1, 1, ARTICLE_HEADERS.length).setValues([row]);
    return {};
  },

  updateArticles: function (ctx) {
    var updates = (ctx.data.updates || []).map(function (u) {
      var f = {};
      for (var k in u.fields) f[k] = k === "translations" ? JSON.stringify(u.fields[k] || []) : u.fields[k];
      return { id: u.id, fields: f };
    });
    return { updated: patchRows(articleSheet(ctx), ARTICLE_HEADERS, ARTICLE_FIELDS, updates, false) };
  },

  deleteArticles: function (ctx) {
    var set = toSet(ctx.data.ids);
    return { deleted: removeRows(articleSheet(ctx), ARTICLE_HEADERS.length, function (r) { return set[String(r[0])]; }) };
  },

  // 只改 Order 欄
  reorderArticles: function (ctx) {
    var updates = (ctx.data.ids || []).map(function (id, i) { return { id: id, fields: { order: i } }; });
    return { updated: patchRows(articleSheet(ctx), ARTICLE_HEADERS, ARTICLE_FIELDS, updates, false) };
  },

  // settings: { "en.books": [...], "fr.newPerDay": 20, ... }
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
    return {};
  },

  // 依「日期 + 語言」累加
  logReview: function (ctx) {
    var d = ctx.data;
    var lang = checkLang(d.lang);
    var sheet = logSheet(ctx);
    var rows = dataRows(sheet, LOG_HEADERS.length);
    for (var i = rows.length - 1; i >= 0; i--) {
      if (dateKey(rows[i][0]) === d.date && String(rows[i][1]) === lang) {
        sheet.getRange(i + 2, 3, 1, 3).setValues([[
          (Number(rows[i][2]) || 0) + (d.reviews || 0),
          (Number(rows[i][3]) || 0) + (d.correct || 0),
          (Number(rows[i][4]) || 0) + (d.newCount || 0)
        ]]);
        return {};
      }
    }
    sheet.appendRow(["'" + d.date, lang, d.reviews || 0, d.correct || 0, d.newCount || 0]);
    return {};
  },

  saveScore: function (ctx) {
    var props = PropertiesService.getScriptProperties();
    var key = ctx.username + "_" + checkLang(ctx.data.lang) + "_" + ctx.data.game;
    var current = parseInt(props.getProperty(key), 10) || 0;
    var score = parseInt(ctx.data.score, 10) || 0;
    if (score > current) props.setProperty(key, String(score));
    return { score: Math.max(score, current) };
  },

  getScores: function (ctx) {
    var props = PropertiesService.getScriptProperties();
    var p = ctx.username + "_" + checkLang(ctx.data.lang) + "_";
    return {
      meteor: parseInt(props.getProperty(p + "meteor"), 10) || 0,
      runner: parseInt(props.getProperty(p + "runner"), 10) || 0
    };
  },

  // 前端 Google 翻譯失敗時的備援：texts: [...]
  translate: function (ctx) {
    var sl = ctx.data.sl === "auto" ? "" : (ctx.data.sl || "en");
    var tl = ctx.data.tl || "zh-TW";
    return {
      results: (ctx.data.texts || []).slice(0, 20).map(function (t) {
        try { return LanguageApp.translate(String(t), sl, tl); } catch (e) { return ""; }
      })
    };
  },

  // 英文：The Guardian 全文；法文：franceinfo 頭條與摘要
  news: function (ctx) {
    var lang = checkLang(ctx.data.lang);
    var section = String(ctx.data.section || "").replace(/[^a-z-]/g, "");
    return lang === "fr" ? frenchNews(section || "monde") : englishNews(section || "world");
  },

  gemini: function (ctx) {
    var props = PropertiesService.getScriptProperties();
    var apiKey = props.getProperty("GEMINI_API_KEY");
    if (!apiKey) throw new Error("尚未設定 GEMINI_API_KEY（GAS 專案設定 → 指令碼屬性）");
    var models = (props.getProperty("GEMINI_MODELS") || "gemini-2.5-flash,gemini-2.5-flash-lite")
      .split(",").map(function (m) { return m.trim(); }).filter(String);

    // 上次成功的模型排第一個
    var cache = CacheService.getScriptCache();
    var lastGood = cache.get("gemini_last_model");
    if (lastGood && models.indexOf(lastGood) > 0) {
      models.splice(models.indexOf(lastGood), 1);
      models.unshift(lastGood);
    }

    var errors = [];
    for (var i = 0; i < models.length; i++) {
      try {
        var res = UrlFetchApp.fetch("https://generativelanguage.googleapis.com/v1beta/models/" + models[i] + ":generateContent", {
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

// ===================== 新聞 =====================

function englishNews(section) {
  var key = PropertiesService.getScriptProperties().getProperty("GUARDIAN_API_KEY") || "test";
  var url = "https://content.guardianapis.com/search?show-fields=body&page-size=15&section=" + section + "&api-key=" + encodeURIComponent(key);
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error("新聞服務回應錯誤 (" + res.getResponseCode() + ")");
  var results = (JSON.parse(res.getContentText()).response || {}).results || [];
  return {
    kind: "article",
    items: results.map(function (r) { return { title: r.webTitle, url: r.webUrl, body: r.fields ? r.fields.body : "" }; })
  };
}

function frenchNews(section) {
  var res = UrlFetchApp.fetch("https://www.franceinfo.fr/" + section + ".rss", { muteHttpExceptions: true, followRedirects: true });
  if (res.getResponseCode() !== 200) throw new Error("新聞服務回應錯誤 (" + res.getResponseCode() + ")");
  var xml = res.getContentText();
  var items;
  try {
    var channel = XmlService.parse(xml).getRootElement().getChild("channel");
    items = channel.getChildren("item").slice(0, 12).map(function (it) {
      return { title: it.getChildText("title") || "", url: it.getChildText("link") || "", summary: it.getChildText("description") || "" };
    });
  } catch (e) {
    // RSS 不是嚴格的 XML（例如含有 HTML 實體）時改用文字比對
    items = (xml.match(/<item[\s>][\s\S]*?<\/item>/g) || []).slice(0, 12).map(function (block) {
      var pick = function (tag) {
        var m = block.match(new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)</" + tag + ">"));
        return m ? m[1].replace(/^<!\[CDATA\[|\]\]>$/g, "") : "";
      };
      return { title: decodeEntities(stripTags(pick("title"))), url: pick("link"), summary: pick("description") };
    });
  }
  items = items.map(function (x) {
    return { title: decodeEntities(x.title.trim()), url: x.url.trim().split("#")[0], summary: decodeEntities(stripTags(x.summary)) };
  }).filter(function (x) { return x.title && x.summary; });
  return { kind: "digest", items: items };
}

function decodeEntities(s) {
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi, function (m, h) { return String.fromCharCode(parseInt(h, 16)); })
    .replace(/&#(\d+);/g, function (m, d) { return String.fromCharCode(parseInt(d, 10)); })
    .replace(/&quot;/g, '"').replace(/&apos;|&rsquo;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

function stripTags(s) {
  return String(s).replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

// ===================== 工作表 =====================

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
  if (/_(Articles|Settings|Log)$/i.test(u)) throw new Error("帳號名稱不能以 _Articles、_Settings、_Log 結尾");
  return u;
}

function checkLang(lang) {
  if (!LANGS[lang]) throw new Error("不支援的語言：" + lang);
  return lang;
}

function wordSheet(ctx) { return ctx.ss.getSheetByName(ctx.username); }
function articleSheet(ctx) { return ctx.ss.getSheetByName(ctx.username + "_Articles"); }
function settingsSheet(ctx) { return ctx.ss.getSheetByName(ctx.username + "_Settings"); }
function logSheet(ctx) { return ctx.ss.getSheetByName(ctx.username + "_Log"); }

// 第三欄：要設成「純文字」的欄位（避免試算表把「3-4」「1/2」等內容自動轉成日期或數字）
function ensureUserSheets(ctx, createIfMissing) {
  var specs = [
    [ctx.username, WORD_HEADERS, [1, 2, 3, 4, 5, 6, 7, 11, 12, 13]],
    [ctx.username + "_Articles", ARTICLE_HEADERS, [1, 2, 3, 4, 8, 9]],
    [ctx.username + "_Settings", SETTINGS_HEADERS, [1, 2]],
    [ctx.username + "_Log", LOG_HEADERS, [1, 2]]
  ];
  if (!ctx.ss.getSheetByName(ctx.username) && !createIfMissing) throw new Error("找不到該使用者的資料，請重新登入");
  specs.forEach(function (s) {
    var sheet = ctx.ss.getSheetByName(s[0]);
    var created = !sheet;
    if (created) {
      sheet = ctx.ss.insertSheet(s[0]);
      sheet.getRange(1, 1, 1, s[1].length).setValues([s[1]]).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
    // 登入時也套用一次，修正舊版建立的工作表
    if (created || createIfMissing) {
      s[2].forEach(function (col) { sheet.getRange(1, col, sheet.getMaxRows(), 1).setNumberFormat("@"); });
    }
  });
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

function toSet(list) {
  var set = {};
  (list || []).forEach(function (x) { set[String(x)] = true; });
  return set;
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
      if (key === "id" || key === "lang" || colOf[key] === undefined) continue;
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

// 覆寫保留的資料列，再刪掉尾端多出的列；不使用 clearContents
function removeRows(sheet, width, shouldRemove) {
  var rows = dataRows(sheet, width);
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
  try { translations = r[7] ? JSON.parse(String(r[7])) : []; } catch (e) { translations = []; }
  return {
    id: String(r[0]), lang: String(r[1]), title: String(r[2]), content: String(r[3]),
    parasPerBlock: parseInt(r[4], 10) || 1, created: Number(r[5]) || 0,
    bookmarkIndex: parseInt(r[6], 10) || 0, translations: translations,
    folder: r[8] ? String(r[8]) : UNSORTED, order: Number(r[9]) || 0
  };
}

function articleToRow(a) {
  return [String(a.id), checkLang(a.lang), a.title || "", a.content || "", a.parasPerBlock || 1, a.created || Date.now(),
    a.bookmarkIndex || 0, JSON.stringify(a.translations || []), a.folder || UNSORTED, Number(a.order) || 0];
}

function readSettings(ctx) {
  var out = {};
  dataRows(settingsSheet(ctx), 2).forEach(function (r) {
    try { out[String(r[0])] = JSON.parse(String(r[1])); } catch (e) { /* 略過壞掉的設定 */ }
  });
  return out;
}

function readLog(ctx, limit) {
  return dataRows(logSheet(ctx), LOG_HEADERS.length).slice(-limit).map(function (r) {
    return { date: dateKey(r[0]), lang: String(r[1]), reviews: Number(r[2]) || 0, correct: Number(r[3]) || 0, newCount: Number(r[4]) || 0 };
  });
}

function dateKey(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
  return String(v).replace(/^'/, "");
}

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

// 第一次部署時手動執行一次，授權外部連線與翻譯
function forceAuth() {
  UrlFetchApp.fetch("https://www.google.com");
  LanguageApp.translate("bonjour", "fr", "zh-TW");
}
