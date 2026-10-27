/**
 * Dixen Golf — Google Apps Script 後端
 *
 * 部署：擴充功能 → Apps Script → 貼上本檔 → 執行一次 setup() → 部署 → 新增部署作業
 *       類型「網頁應用程式」、執行身分「我」、存取權「所有人」→ 複製網址貼到 js/config.js
 *
 * 工作頁
 *   Account      A 帳號 / B 密碼 / C 啟用(Y/N)，第 1 列為標題
 *   <帳號名稱>    每位玩家一頁，這個人的所有資料都在這一頁（排法見下面「玩家頁」）
 *   排行          每打完一場（9 或 18 洞）一列，所有玩家的完整紀錄（備份用，排行頁不直接讀這一頁）
 *   排行精華      從「排行」整理出來、只留可能上榜的場次（每個分類前 100 名、每人最佳、特殊紀錄），排行頁讀這一頁；程式自動維護
 *   挑戰排行      每位玩家一列：挑戰模式的總星數（有更新就改寫那一列）
 *   自製球場      管理員的自製球場資料：每一列 = 一個草稿洞 / 一座發布的球場 / 一個修改過的現有球洞
 *                 A 種類（draft / course / override）B 代號 C 名稱 D 更新時間 E 摘要（JSON）F 起 資料（JSON，每格最多 45000 字，太長就接到後面的格子）
 *   實際下場      （舊版用的，已改存到每個人的玩家頁）每個人第一次打開實際下場時會自動把自己的資料搬走；
 *                 搬完的列會刪掉，整頁只剩標題時就可以把這一頁刪除
 *
 * 玩家頁（工作頁名稱 = 帳號）
 *
 *        A        B      C   D          E           F          G ~
 *    1   帳號     值         生涯統計    已統計場數   更新時間    統計資料（JSON）     ← 第 1 列：標題
 *    2   能力點   值         （自動）    123         2026/..     {...}（太長接到右邊） ← 第 2 列：數字
 *   ...  個人資料（第 1~13 列，A 名稱 / B 值）
 *   13   挑戰     值
 *
 *        A ~ Q（遊戲回合）                          R（空白）   S ~ W（實際下場）
 *   14   日期 / 球場 / 洞數 / … / 每洞細節          　          編號 / 日期 / 球場 / 更新時間 / 資料
 *   15~  一場一列，新的接在最下面                    　          一場一列（現實世界打的回合）
 *
 *   ‧個人資料：能力點、素質、外觀、總回合數、成就、挑戰星數…（A 欄名稱、B 欄值）
 *   ‧生涯統計：個人紀錄頁的累計數字（平均桿數、分數分布…），由遊戲畫面算好存回來，E 欄 = 已經算進幾場遊戲回合；
 *     刪掉也沒關係，下次打開個人紀錄會從第一場重算
 *   ‧遊戲回合：A~Q 欄，第 14 列標題、第 15 列起一場一列
 *   ‧實際下場：S~W 欄，第 14 列標題、第 15 列起一場一列；刪除時只刪 S~W 這五格（下面往上補），不會動到左邊的遊戲回合
 *   ‧遊戲回合和實際下場是左右兩張獨立的表，各自往下長，列數不用一樣
 * 遊戲間（驗證碼、連線資料、訊息）放在 CacheService，6 小時自動清除，不佔工作頁。
 */

const ADMIN = 'Michael';
const ADMIN_PASS = '1220';
const START_POINTS = 30;
const START_RESPECS = 10;
const RESERVED = ['Account', '排行', '挑戰排行', '自製球場', '排行精華', '實際下場'];
// 排行精華：只留「可能出現在排行上」的場次（每個分類前 100 名、每個人在每個分類的最佳、所有特殊紀錄），排行頁只讀這一頁
const RANK_TOP_SHEET = '排行精華';
const RANK_TOP_N = 100;
// 玩家頁的生涯統計：第 1 列標題、第 2 列數字，從 D 欄開始（個人資料在 A、B 欄的右邊）
const CAREER_COL = 4;                 // D
const CAREER_HEADER = ['生涯統計', '已統計場數', '更新時間', '統計資料（JSON，程式自動維護，太長會接到右邊的格子）'];
// 玩家頁的實際下場：S~W 欄，第 14 列標題（跟遊戲回合同一列）、第 15 列起一場一列
const REAL_COL = 19;                  // S
const REAL_HEADER = ['實際下場：編號', '日期', '球場', '更新時間', '資料（JSON）'];
const OLD_REAL_SHEET = '實際下場';    // 舊版的共用頁（自動搬到玩家頁）
const CUSTOM_SHEET = '自製球場';
const CUSTOM_HEADER = ['種類', '代號', '名稱', '更新時間', '摘要', '資料'];
const CHUNK = 45000;
const STAR_SHEET = '挑戰排行';
const STAR_HEADER = ['帳號', '總星數', '最遠關卡', '更新時間'];
const RANK_SHEET = '排行';
const RANK_HEADER = ['日期', '帳號', '球場', '球場代號', '洞數', '範圍', '梯台', '總桿', '標準桿', '對標準桿', '模式', '一桿進洞', '信天翁', '老鷹', '特殊紀錄', '重打'];

// 玩家頁上半部的欄位（第 1~13 列，A=名稱 B=值）；成就 = 徽章 / 計數 / 球場護照（JSON），挑戰 = 每關星數（JSON）
const PROFILE_KEYS = ['帳號', '能力點', '剩餘重新分配次數', '素質', '外觀', '總回合數', '最佳18洞', '建立時間', '最後登入', '已用能力點', '累計獲得點數', '成就', '挑戰'];
const ROUND_HEADER_ROW = 14;
const ROUND_HEADER = ['日期', '球場', '洞數', '梯台', '桿數', '對標準桿', '推桿數', '上球道', '標準桿上果嶺', '模式', '同組', '每洞桿數', '重打', '球場代號', '範圍', '標準桿', '每洞細節'];

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
  customSheet_();
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
      // 舊的玩家頁 / 排行頁：欄位名稱補上新加的欄（重打、球場代號、範圍、標準桿、每洞細節）
      if (sh.getRange(ROUND_HEADER_ROW, ROUND_HEADER.length).getValue() !== ROUND_HEADER[ROUND_HEADER.length - 1]) sh.getRange(ROUND_HEADER_ROW, 1, 1, ROUND_HEADER.length).setValues([ROUND_HEADER]).setFontWeight('bold').setBackground('#1d3a2a').setFontColor('#f2ead8');
      // 接在遊戲回合（A 欄）的最下面；右邊的實際下場列數不一樣，不能用 appendRow
      const at = lastRowIn_(sh, 1) + 1;
      ensureSize_(sh, at, ROUND_HEADER.length);
      sh.getRange(at, 1, 1, ROUND_HEADER.length).setValues([[now, r.course, r.holes, r.tee, r.strokes, r.toPar, r.putts, r.fairways, r.gir, r.mode, r.partners || '', JSON.stringify(r.scores),
        Number(r.mulligans) || 0, r.courseId || '', r.range || '', Number(r.par) || '', JSON.stringify(r.detail || {})]]);
      // 排行：每一場都單獨記一列；特殊紀錄 = 這一場的一桿進洞 / 信天翁 / 老鷹（第幾洞、標準桿）
      const ev = Array.isArray(r.events) ? r.events : [];
      const cnt = t => ev.filter(e => e.t === t).length;
      const range = r.range === 'front' ? '前 9 洞' : r.range === 'back' ? '後 9 洞' : '18 洞';
      const rk = rankSheet_();
      if (rk.getRange(1, RANK_HEADER.length).getValue() !== RANK_HEADER[RANK_HEADER.length - 1]) rk.getRange(1, 1, 1, RANK_HEADER.length).setValues([RANK_HEADER]).setFontWeight('bold').setBackground('#1d3a2a').setFontColor('#f2ead8');
      const rkRow = [now, acc.user, r.course, r.courseId || '', r.holes, range, r.tee, r.strokes, r.par || (r.strokes - r.toPar), r.toPar, r.mode, cnt('hio'), cnt('albatross'), cnt('eagle'), JSON.stringify(ev), Number(r.mulligans) || 0];
      rk.appendRow(rkRow);
      addRankTop_(rkRow);
      const cur = readProfile_(acc.user);
      const earned = Math.floor(r.holes / 9);
      const upd = { '總回合數': cur.rounds + 1, '能力點': cur.points + earned, '累計獲得點數': cur.earned + earned };
      // 最佳 18 洞只算一般長度的球場（三桿洞球場 Par 54 不算）
      if (r.holes === 18 && r.blackTee === true && !(Number(r.mulligans) > 0) && r.rankable !== false && !(Number(r.par) < 66) && (!cur.best || r.strokes < cur.best)) upd['最佳18洞'] = r.strokes;      // 只算黑梯（最遠的梯台）
      writeProfile_(acc.user, upd);
      return { earned: earned, profile: readProfile_(acc.user) };
    });
  },

  getRounds(req) {
    const acc = auth_(req);
    const sh = ensurePlayerSheet_(acc.user);
    const total = roundCount_(sh), last = ROUND_HEADER_ROW + total;
    if (!total) return [];
    const n = Math.min(3000, total);      // 舊版畫面用（新版改用 getRoundsPage / getRoundsFrom）
    return sh.getRange(last - n + 1, 1, n, ROUND_HEADER.length).getValues().reverse().map(roundObj_);
  },

  // 回合紀錄分頁（回合紀錄頁用）：offset = 從最新一場往前跳過幾場、limit = 要幾場（最多 500），新的在前
  getRoundsPage(req) {
    const acc = auth_(req);
    const sh = ensurePlayerSheet_(acc.user);
    const total = roundCount_(sh);
    const offset = Math.max(0, Number(req.offset) || 0), limit = Math.max(1, Math.min(500, Number(req.limit) || 50));
    const end = total - offset, n = Math.min(limit, end);
    if (n <= 0) return { rows: [], total: total };
    const rows = sh.getRange(ROUND_HEADER_ROW + end - n + 1, 1, n, ROUND_HEADER.length).getValues();
    return { rows: rows.reverse().map(roundObj_), total: total };
  },

  // 從第 from 場（0 = 最早的一場）開始往後拿 limit 場，舊的在前（個人紀錄把新回合加進生涯統計用）
  getRoundsFrom(req) {
    const acc = auth_(req);
    const sh = ensurePlayerSheet_(acc.user);
    const total = roundCount_(sh);
    const from = Math.max(0, Number(req.from) || 0), limit = Math.max(1, Math.min(500, Number(req.limit) || 300));
    const n = Math.min(limit, total - from);
    if (n <= 0) return { rows: [], total: total };
    return { rows: sh.getRange(ROUND_HEADER_ROW + 1 + from, 1, n, ROUND_HEADER.length).getValues().map(roundObj_), total: total };
  },

  // 生涯統計（玩家頁 D1 起）：存好的統計（count = 已經算進去幾場）＋ 目前遊戲回合總場數；畫面端只要再補 count 之後的新回合
  getCareer(req) {
    const acc = auth_(req);
    const sh = ensurePlayerSheet_(acc.user);
    const c = readCareer_(sh);
    return { count: c ? c.count : 0, data: c ? c.data : null, total: roundCount_(sh) };
  },

  saveCareer(req) {
    const acc = auth_(req);
    const json = JSON.stringify(req.data || null);
    return withLock_(() => { writeCareer_(ensurePlayerSheet_(acc.user), Number(req.count) || 0, json); return true; });
  },

  // 排行榜：回傳「排行精華」工作頁（每個分類前 100 名、每個人的最佳、所有特殊紀錄），排序與分類在畫面端做
  //   結果在伺服器快取 10 分鐘，有人存新回合就清掉
  getRankings(req) {
    auth_(req);
    const hit = cacheGetBig_('rankTop');
    if (hit) return hit;
    const out = rankTopRows_().map(rankObj_);
    cachePutBig_('rankTop', out, 600);
    return out;
  },

  // 管理員：從完整的「排行」工作頁重新整理排行精華（平常不用，存回合時會自動維護）
  rebuildRankTop(req) {
    admin_(req);
    return withLock_(() => rebuildRankTop_());
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

  // ---------- 實際下場紀錄（現實世界打的回合）----------
  // 「實際下場」工作頁：一場一列（帳號、編號、日期、球場、更新時間、資料 JSON），用編號新增 / 更新 / 刪除
  realList(req) {
    const acc = auth_(req);
    const sh = ensurePlayerSheet_(acc.user);
    const old = SpreadsheetApp.getActive().getSheetByName(OLD_REAL_SHEET);
    if (old && old.getLastRow() > 1) withLock_(() => migrateReal_(acc.user, sh));      // 舊版的共用頁還有資料：先搬過來
    return realRows_(sh).map(x => realObj_(x.vals))
      .sort((x, y) => String(y.date).localeCompare(String(x.date)) || String(y.updated).localeCompare(String(x.updated)));
  },

  realSave(req) {
    const acc = auth_(req);
    const rec = Object.assign({}, req.rec || {});
    rec.id = String(rec.id || Utilities.getUuid().slice(0, 12));
    const json = JSON.stringify(rec);
    if (json.length > 40000) throw new Error('紀錄太大');
    return withLock_(() => {
      const sh = ensurePlayerSheet_(acc.user), now = new Date();
      migrateReal_(acc.user, sh);
      realHeader_(sh);
      const vals = [rec.id, String(rec.date || ''), String(rec.course || ''), now, json];
      const hit = realRows_(sh).find(x => String(x.vals[0]) === rec.id);
      const row = hit ? hit.row : lastRowIn_(sh, REAL_COL) + 1;
      ensureSize_(sh, row, REAL_COL + REAL_HEADER.length - 1);
      sh.getRange(row, REAL_COL, 1, REAL_HEADER.length).setValues([vals]);
      return Object.assign(rec, { updated: now.toISOString() });
    });
  },

  // 刪除：只刪 S~W 這五格、下面的往上補（不會動到左邊的遊戲回合）
  realDelete(req) {
    const acc = auth_(req);
    return withLock_(() => {
      const sh = ensurePlayerSheet_(acc.user);
      migrateReal_(acc.user, sh);
      const hits = realRows_(sh).filter(x => String(x.vals[0]) === String(req.id));
      for (let i = hits.length - 1; i >= 0; i--) sh.getRange(hits[i].row, REAL_COL, 1, REAL_HEADER.length).deleteCells(SpreadsheetApp.Dimension.ROWS);
      return true;
    });
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
      // guests：加入的玩家（最多 3 位，連主機共 4 人）；sig：每位客人的直連資料（客人的 offer、主機回的 answer）
      const room = { code: code, host: acc.user, guest: null, guests: [], sig: {}, started: false, created: Date.now(), config: req.config || null };
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
      room.guests = room.guests || [];
      room.sig = room.sig || {};
      if (acc.user === room.host) throw new Error('這是你自己開的遊戲間');
      if (room.guests.indexOf(acc.user) < 0) {
        if (room.started) throw new Error('比賽已經開始，無法加入');
        if (room.guests.length >= 3) throw new Error('遊戲間已滿（最多 4 人）');
        room.guests.push(acc.user);
      }
      room.guest = room.guests[0];
      room.sig[acc.user] = { offer: req.offer || null, answer: null };
      putRoom_(room);
      return room;
    });
  },

  // 主機：回覆某位客人的直連資料（answerFor + answer）、開打（started）、離開大廳的客人（drop）
  updateRoom(req) {
    const acc = auth_(req);
    return withLock_(() => {
      const room = getRoom_(req.code);
      if (!room) throw new Error('遊戲間已關閉');
      room.guests = room.guests || [];
      room.sig = room.sig || {};
      if (room.host !== acc.user && room.guests.indexOf(acc.user) < 0) throw new Error('不在此遊戲間');
      if (req.config !== undefined) room.config = req.config;
      if (acc.user === room.host) {
        if (req.answerFor && room.sig[req.answerFor]) room.sig[req.answerFor].answer = req.answer || null;
        if (req.started) room.started = true;
      }
      // 開打前離開大廳：從名單拿掉（自己離開，或主機看到他離開）
      const drop = acc.user === room.host ? req.drop : (req.leave ? acc.user : null);
      if (drop && !room.started) { room.guests = room.guests.filter(g => g !== drop); delete room.sig[drop]; room.guest = room.guests[0] || null; }
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

  // ---------- 自製球場 ----------
  // 清單：發布的球場（含每洞摘要）、修改過的現有球洞（代號 + 更新時間）；管理員另外拿到所有草稿
  customList(req) {
    const acc = auth_(req);
    const rows = customRows_();
    const pick = k => rows.filter(r => r.kind === k).map(r => ({ id: r.id, name: r.name, updated: r.updated, meta: r.meta }));
    const out = { courses: pick('course'), overrides: pick('override').map(r => ({ id: r.id, updated: r.updated })) };
    if (acc.user === ADMIN) out.drafts = pick('draft');
    return out;
  },

  // 一筆的完整資料（玩家打自製球場、或載入修改過的球洞時才下載）
  customGet(req) {
    auth_(req);
    const r = customRows_().find(x => x.kind === req.kind && x.id === req.id);
    if (!r) throw new Error('找不到這筆自製資料');
    return { id: r.id, name: r.name, updated: r.updated, meta: r.meta, data: customData_(r.row) };
  },

  customSave(req) {
    admin_(req);
    if (['draft', 'course', 'override'].indexOf(req.kind) < 0) throw new Error('種類錯誤');
    const id = String(req.id || '');
    if (!id) throw new Error('缺少代號');
    const data = typeof req.data === 'string' ? req.data : JSON.stringify(req.data || null);
    return withLock_(() => {
      const sh = customSheet_();
      const r = customRows_().find(x => x.kind === req.kind && x.id === id);
      const row = r ? r.row : sh.getLastRow() + 1;
      const parts = [];
      for (let i = 0; i < data.length; i += CHUNK) parts.push(data.slice(i, i + CHUNK));
      if (!parts.length) parts.push('');
      const now = new Date().toISOString();
      const need = 5 + parts.length - sh.getMaxColumns();
      if (need > 0) sh.insertColumnsAfter(sh.getMaxColumns(), need);           // 資料太長：多開幾欄
      if (r) sh.getRange(row, 6, 1, Math.max(1, sh.getLastColumn() - 5)).clearContent();
      sh.getRange(row, 1, 1, 5 + parts.length).setValues([[req.kind, id, String(req.name || ''), now, JSON.stringify(req.meta || {})].concat(parts)]);
      return { id: id, updated: now };
    });
  },

  customDelete(req) {
    admin_(req);
    return withLock_(() => {
      const r = customRows_().find(x => x.kind === req.kind && x.id === String(req.id));
      if (r) customSheet_().deleteRow(r.row);
      return true;
    });
  },

  closeRoom(req) {
    auth_(req);
    const cache = CacheService.getScriptCache();
    cache.remove('room_' + req.code);
    cache.remove('msgs_' + req.code);
    return true;
  },
};

// ---------- 回合 / 排行的資料轉換 ----------
const isoOf_ = v => (v instanceof Date ? v.toISOString() : v);
function roundObj_(r) {
  return {
    date: isoOf_(r[0]), course: r[1], holes: r[2], tee: r[3], strokes: r[4],
    toPar: r[5], putts: r[6], fairways: r[7], gir: r[8], mode: r[9], partners: r[10], scores: safeParse_(r[11], []),
    mulligans: Number(r[12]) || 0, courseId: r[13] || '', range: r[14] || '', par: Number(r[15]) || 0, detail: safeParse_(r[16], null),
  };
}
function rankObj_(r) {
  return {
    date: isoOf_(r[0]), user: String(r[1]), course: r[2], courseId: r[3], holes: Number(r[4]),
    range: r[5], tee: r[6], strokes: Number(r[7]), par: Number(r[8]), toPar: Number(r[9]), mode: r[10], events: safeParse_(r[14], []), mulligans: Number(r[15]) || 0,
  };
}

// ---------- 排行精華 ----------
// 畫面端的排行：每個「洞數 + 球場 + 梯台」各排前 100 名（不含重打）；總桿排行是所有球場合起來的前 100 名，
// 一定也是某個分類的前 100 名，所以只要留下每個分類的前 100 名就不會漏。另外留每個人在每個分類的最佳（大廳的最佳 18 洞）
// 和所有一桿進洞 / 信天翁 / 老鷹（特殊紀錄排行）。梯台照原本的代號分（畫面端可能把藍梯當黑梯，分得比較細只會多留不會漏）
function rankKeep_(rows) {
  const t = v => new Date(v).getTime() || 0;
  const cmp = (a, b) => (Number(a[7]) - Number(b[7])) || (Number(a[9]) - Number(b[9])) || (t(a[0]) - t(b[0]));
  const key = r => [Number(r[4]), String(r[3] || '').split(':')[0] || String(r[2] || '').split('（')[0], r[6]].join('|');
  const keep = new Set(), groups = {}, best = {};
  rows.forEach((r, i) => {
    if (Number(r[11]) > 0 || Number(r[12]) > 0 || Number(r[13]) > 0) keep.add(i);
    if (Number(r[15]) > 0) return;              // 用過重打：不列入排行
    const k = key(r), uk = r[1] + '|' + k;
    (groups[k] = groups[k] || []).push(i);
    if (best[uk] == null || cmp(r, rows[best[uk]]) < 0) best[uk] = i;
  });
  Object.keys(groups).forEach(k => groups[k].sort((a, b) => cmp(rows[a], rows[b])).slice(0, RANK_TOP_N).forEach(i => keep.add(i)));
  Object.keys(best).forEach(k => keep.add(best[k]));
  return rows.filter((r, i) => keep.has(i));
}

function writeRankTop_(sh, rows) {
  const last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, RANK_HEADER.length).clearContent();
  if (rows.length) sh.getRange(2, 1, rows.length, RANK_HEADER.length).setValues(rows);
  cacheDropBig_('rankTop');
}

// 從完整的「排行」工作頁整理一次（第一次使用時自動執行；之後存回合時只加新的一場）
function rebuildRankTop_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(RANK_TOP_SHEET);
  if (!sh) {
    sh = ss.insertSheet(RANK_TOP_SHEET, 2);
    sh.getRange(1, 1, 1, RANK_HEADER.length).setValues([RANK_HEADER]).setFontWeight('bold').setBackground('#1d3a2a').setFontColor('#f2ead8');
    sh.setFrozenRows(1);
  }
  const src = rankSheet_(), last = src.getLastRow();
  const all = last > 1 ? src.getRange(2, 1, last - 1, RANK_HEADER.length).getValues() : [];
  const kept = rankKeep_(all);
  writeRankTop_(sh, kept);
  return { total: all.length, kept: kept.length };
}

// 排行精華的所有列（還沒有這一頁就先整理一次）
function rankTopRows_() {
  let sh = SpreadsheetApp.getActive().getSheetByName(RANK_TOP_SHEET);
  if (!sh) { withLock_(() => { if (!SpreadsheetApp.getActive().getSheetByName(RANK_TOP_SHEET)) rebuildRankTop_(); }); sh = SpreadsheetApp.getActive().getSheetByName(RANK_TOP_SHEET); }
  const last = sh.getLastRow();
  return last > 1 ? sh.getRange(2, 1, last - 1, RANK_HEADER.length).getValues() : [];
}

// 存回合時：把新的一場加進排行精華（在 saveRound 的鎖裡面呼叫）
function addRankTop_(row) {
  const sh = SpreadsheetApp.getActive().getSheetByName(RANK_TOP_SHEET);
  if (!sh) { rebuildRankTop_(); return; }        // 第一次：整份重整（新的一場已經在「排行」裡）
  const last = sh.getLastRow();
  const rows = last > 1 ? sh.getRange(2, 1, last - 1, RANK_HEADER.length).getValues() : [];
  rows.push(row);
  writeRankTop_(sh, rankKeep_(rows));
}

// ---------- 伺服器快取（大的資料切成多段存，每段 3 萬字以內，中文一個字 3 bytes 也不會超過 100KB）----------
function cachePutBig_(key, obj, ttl) {
  const s = JSON.stringify(obj), size = 30000, n = Math.ceil(s.length / size);
  if (!n || n > 150) return;
  const m = {};
  for (let i = 0; i < n; i++) m[key + '_' + i] = s.slice(i * size, (i + 1) * size);
  m[key + '_n'] = String(n);
  try { CacheService.getScriptCache().putAll(m, ttl); } catch (e) { /* 放不進快取就算了 */ }
}
function cacheGetBig_(key) {
  const c = CacheService.getScriptCache(), n = Number(c.get(key + '_n'));
  if (!n) return null;
  const keys = [];
  for (let i = 0; i < n; i++) keys.push(key + '_' + i);
  const got = c.getAll(keys);
  let s = '';
  for (let i = 0; i < keys.length; i++) { if (got[keys[i]] == null) return null; s += got[keys[i]]; }
  return safeParse_(s, null);
}
function cacheDropBig_(key) { CacheService.getScriptCache().remove(key + '_n'); }

// ---------- 玩家頁的位置 ----------
// 某一欄最後一筆資料在第幾列。玩家頁左邊（遊戲回合）和右邊（實際下場）各自往下長，不能用整頁的 getLastRow
function lastRowIn_(sh, col) {
  const max = sh.getMaxRows(), bottom = sh.getRange(max, col);
  if (bottom.getValue() !== '') return max;
  return bottom.getNextDataCell(SpreadsheetApp.Direction.UP).getRow();
}
// 遊戲回合有幾場（A 欄第 15 列起）
function roundCount_(sh) { return Math.max(0, lastRowIn_(sh, 1) - ROUND_HEADER_ROW); }
// 要寫到第 row 列 / 第 col 欄，工作頁不夠大就先加列 / 加欄
function ensureSize_(sh, row, col) {
  if (row > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), row - sh.getMaxRows());
  if (col > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), col - sh.getMaxColumns());
}

// ---------- 生涯統計（玩家頁 D1 起：第 1 列標題、第 2 列數字）----------
const CAREER_PARTS = 8;               // 統計資料最多切 8 格（G~N 欄）
function readCareer_(sh) {
  if (sh.getMaxColumns() < CAREER_COL + 3 || sh.getRange(1, CAREER_COL).getValue() !== CAREER_HEADER[0]) return null;
  ensureSize_(sh, 2, CAREER_COL + 2 + CAREER_PARTS);
  const v = sh.getRange(2, CAREER_COL, 1, 3 + CAREER_PARTS).getValues()[0];
  return { count: Number(v[1]) || 0, data: safeParse_(v.slice(3).join(''), null) };
}
function writeCareer_(sh, count, json) {
  const parts = [];
  for (let i = 0; i < json.length; i += CHUNK) parts.push(json.slice(i, i + CHUNK));
  if (parts.length > CAREER_PARTS) throw new Error('生涯統計資料太大');
  while (parts.length < CAREER_PARTS) parts.push('');
  ensureSize_(sh, 2, CAREER_COL + 2 + CAREER_PARTS);
  if (sh.getRange(1, CAREER_COL).getValue() !== CAREER_HEADER[0]) {
    sh.getRange(1, CAREER_COL, 1, CAREER_HEADER.length).setValues([CAREER_HEADER]).setFontWeight('bold').setBackground('#f1ebdc');
  }
  sh.getRange(2, CAREER_COL, 1, 3 + CAREER_PARTS).setValues([['（自動）', count, new Date()].concat(parts)]);
}

// ---------- 實際下場（玩家頁 S~W 欄：第 14 列標題、第 15 列起一場一列）----------
function realHeader_(sh) {
  ensureSize_(sh, ROUND_HEADER_ROW, REAL_COL + REAL_HEADER.length - 1);
  if (sh.getRange(ROUND_HEADER_ROW, REAL_COL).getValue() !== REAL_HEADER[0]) {
    sh.getRange(ROUND_HEADER_ROW, REAL_COL, 1, REAL_HEADER.length).setValues([REAL_HEADER]).setFontWeight('bold').setBackground('#3a2f1d').setFontColor('#f2ead8');
    sh.getRange(1, REAL_COL, sh.getMaxRows(), 2).setNumberFormat('@');      // 編號、日期當文字存（不要被試算表改成數字 / 日期）
  }
}
// 這個人的實際下場：[{ row, vals: [編號, 日期, 球場, 更新時間, 資料] }]
function realRows_(sh) {
  if (sh.getMaxColumns() < REAL_COL + REAL_HEADER.length - 1) return [];
  const last = lastRowIn_(sh, REAL_COL);
  if (last <= ROUND_HEADER_ROW) return [];
  return sh.getRange(ROUND_HEADER_ROW + 1, REAL_COL, last - ROUND_HEADER_ROW, REAL_HEADER.length).getValues()
    .map((v, i) => ({ row: ROUND_HEADER_ROW + 1 + i, vals: v }));
}
// 舊版存在共用「實際下場」頁的資料：搬到這個人的玩家頁，搬完把共用頁那幾列刪掉（在鎖裡面呼叫）
function migrateReal_(user, sh) {
  const old = SpreadsheetApp.getActive().getSheetByName(OLD_REAL_SHEET);
  if (!old || old.getLastRow() < 2) return;
  const rows = old.getRange(2, 1, old.getLastRow() - 1, 6).getValues();
  const mine = [];
  rows.forEach((r, i) => { if (String(r[0]) === String(user)) mine.push(i + 2); });
  if (!mine.length) return;
  realHeader_(sh);
  const have = new Set(realRows_(sh).map(x => String(x.vals[0])));
  const add = mine.map(n => rows[n - 2]).filter(r => !have.has(String(r[1]))).map(r => [String(r[1]), String(r[2]), r[3], r[4], r[5]]);
  if (add.length) {
    const start = lastRowIn_(sh, REAL_COL) + 1;
    ensureSize_(sh, start + add.length - 1, REAL_COL + REAL_HEADER.length - 1);
    sh.getRange(start, REAL_COL, add.length, REAL_HEADER.length).setValues(add);
  }
  for (let i = mine.length - 1; i >= 0; i--) old.deleteRow(mine[i]);
}
const realObj_ = v => Object.assign(safeParse_(v[4], {}), { id: String(v[0]), updated: v[3] instanceof Date ? v[3].toISOString() : String(v[3]) });

// ---------- 成就 / 挑戰 ----------

function customSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(CUSTOM_SHEET);
  if (!sh) {
    sh = ss.insertSheet(CUSTOM_SHEET);
    sh.getRange(1, 1, 1, CUSTOM_HEADER.length).setValues([CUSTOM_HEADER]).setFontWeight('bold').setBackground('#1d3a2a').setFontColor('#f2ead8');
    sh.setFrozenRows(1);
  }
  return sh;
}
// 只讀前五欄（種類、代號、名稱、時間、摘要），資料欄要的時候才讀
function customRows_() {
  const sh = customSheet_(), n = sh.getLastRow() - 1;
  if (n <= 0) return [];
  return sh.getRange(2, 1, n, 5).getValues().map((v, i) => ({ row: i + 2, kind: String(v[0]), id: String(v[1]), name: String(v[2]), updated: String(v[3]), meta: safeParse_(v[4], {}) }));
}
function customData_(row) {
  const sh = customSheet_(), w = sh.getLastColumn();
  if (w < 6) return null;
  const s = sh.getRange(row, 6, 1, w - 5).getValues()[0].map(String).join('');
  return s ? JSON.parse(s) : null;
}

function mergeProg_(a, b) {
  const o = { ach: Object.assign({}, a.ach || {}), cnt: Object.assign({}, a.cnt || {}), stamps: Object.assign({}, a.stamps || {}) };
  Object.keys(b.ach || {}).forEach(k => { if (!o.ach[k]) o.ach[k] = b.ach[k]; });
  Object.keys(b.cnt || {}).forEach(k => { o.cnt[k] = Math.max(Number(o.cnt[k]) || 0, Number(b.cnt[k]) || 0); });
  Object.keys(b.stamps || {}).forEach(k => {
    const x = o.stamps[k], y = b.stamps[k];
    if (!x) { o.stamps[k] = y; return; }
    // 最佳桿數：兩邊都沒有就不寫（以前會寫成 999）；分區球場各區完成次數取大的
    const best = Math.min(Number(x.best) || 999, Number(y.best) || 999), nineN = Object.assign({}, x.nineN || {});
    Object.keys(y.nineN || {}).forEach(q => { nineN[q] = Math.max(Number(nineN[q]) || 0, Number(y.nineN[q]) || 0); });
    o.stamps[k] = { date: x.date || y.date, n: Math.max(Number(x.n) || 0, Number(y.n) || 0), nines: Object.assign({}, y.nines || {}, x.nines || {}), nineN: nineN };
    if (best < 999) o.stamps[k].best = best;
  });
  return o;
}
function mergeChal_(a, b) {
  const o = { stars: Object.assign({}, a.stars || {}), best: Object.assign({}, a.best || {}) };
  Object.keys(b.stars || {}).forEach(k => { o.stars[k] = Math.max(Number(o.stars[k]) || 0, Math.min(3, Number(b.stars[k]) || 0)); });
  Object.keys(b.best || {}).forEach(k => { o.best[k] = o.best[k] ? Math.min(o.best[k], b.best[k]) : b.best[k]; });
  o.total = Object.keys(o.stars).reduce((s, k) => s + o.stars[k], 0);
  // 星星商店：買過的外觀只會增加；花掉的星星不能超過總星數
  o.owned = (a.owned || []).slice();
  (b.owned || []).forEach(k => { if (o.owned.indexOf(k) < 0) o.owned.push(k); });
  o.spent = Math.min(o.total, Math.max(Number(a.spent) || 0, Number(b.spent) || 0));
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
