/**
 * Dixen Golf — 生涯模式的 Apps Script 後端（和 Code.gs 放在同一個 Apps Script 專案，當成第二個檔案）
 *
 * 部署：在 Apps Script 專案按「＋ → 指令碼」新增檔案，命名 Career，貼上本檔；
 *       Code.gs 也要換成新版（doPost 會先找 ACTIONS，再找這裡的 CAREER_ACTIONS）；
 *       然後「部署 → 管理部署作業 → 編輯（鉛筆）→ 版本選『新版本』→ 部署」，網址不變。
 *
 * 工作頁（每個帳號一張，第 2、3 個生涯欄位有用到才建立）
 *   生涯_<帳號>、生涯_<帳號>_2、生涯_<帳號>_3
 *     A~B 欄（第 1~26 列）  基本資料：帳號、欄位、球員名、國籍、年齡、章節、季、週、等級、世界排名、資金…
 *     D~H 欄（第 1~15 列）  素質：名稱、目前值、上限、訓練經驗、裝備加成
 *     J~N 欄（第 1~13 列）  裝備：欄位、名稱、稀有度、等級、能力
 *     P~S 欄（第 1~20 列）  團隊與人際：角色、名字、關係值 / 默契、備註
 *     A~O 欄（第 30 列起）   賽事紀錄：每場一列（季、週、年齡、賽事、巡迴、球場、名次、四輪成績、總桿、獎金、積分、打法）
 *     Q~S 欄（第 30 列起）   獎盃清單
 *     U~V 欄（第 30 列起）   生涯年表
 *     X~Y 欄（第 30 列起）   生涯成就與達成時間
 *     AD~AF 欄               完整存檔（程式讀寫用）：AD = 最新、AE / AF = 前兩個版本；第 1 列是版本號，第 2 列起每格 45000 字
 *   生涯週賽                 好友週賽：每人每週一列（週、帳號、球員名、總桿、對標準桿、球場、時間）
 *
 * 主遊戲的個人工作頁（例如 test）完全不新增列：生涯成就的能力點、共用的計數、球場護照都走原本的 saveProgress。
 */

// 生涯模式開放名單（分大小寫）；null = 所有人（v107 正式開放）。網頁端 js/config.js 的 CAREER_USERS 要一起改
const CAREER_ACCESS = null;
const CM_DATA_COL = 30;          // AD
const CM_VERSIONS = 3;           // AD、AE、AF
const CM_EVENT_ROW = 30;
const CM_WEEK_SHEET = '生涯週賽';
const CM_WEEK_HEADER = ['週', '帳號', '球員名', '總桿', '對標準桿', '球場', '時間'];
const CM_BASIC = ['帳號', '欄位', '球員名', '國籍', '年齡', '章節', '季', '週', '等級', '經驗值', '技能點', '世界排名', '可用資金', '生涯總獎金', '冠軍數', '大賽數', '難度', '稱號', '存檔版本', '最後更新'];
const CM_EVENT_HEADER = ['季', '週', '年齡', '賽事', '巡迴', '球場', '名次', 'R1', 'R2', 'R3', 'R4', '總桿', '獎金', '積分', '打法'];

function careerAuth_(req) {
  const acc = auth_(req);
  if (CAREER_ACCESS !== null && CAREER_ACCESS.indexOf(acc.user) < 0) throw new Error('生涯模式尚未開放');
  return acc;
}
function cmSheetName_(user, slot) { const s = Number(slot) || 1; return '生涯_' + user + (s > 1 ? '_' + s : ''); }
function cmSheet_(user, slot, create) {
  const ss = SpreadsheetApp.getActive(), name = cmSheetName_(user, slot);
  let sh = ss.getSheetByName(name);
  if (!sh && create) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, CM_BASIC.length, 1).setValues(CM_BASIC.map(k => [k])).setFontWeight('bold').setBackground('#e7efe3');
    sh.getRange(CM_EVENT_ROW, 1, 1, CM_EVENT_HEADER.length).setValues([CM_EVENT_HEADER]).setFontWeight('bold').setBackground('#0f3a24').setFontColor('#f2ead8');
    sh.setColumnWidth(1, 110); sh.setColumnWidth(2, 160);
  }
  return sh;
}

const CAREER_ACTIONS = {
  // 存檔：rev（版本號）比伺服器舊的不收；完整資料存在 AD 欄，舊的兩版往右移；上面的表格從資料整理出來
  cmSave(req) {
    const acc = careerAuth_(req);
    const slot = Number(req.slot) || 1, rev = Number(req.rev) || 0, data = String(req.data || '');
    if (data.length > 2000000) throw new Error('生涯存檔太大');
    return withLock_(() => {
      const sh = cmSheet_(acc.user, slot, true);
      ensureSize_(sh, 2, CM_DATA_COL + CM_VERSIONS - 1);
      const head = sh.getRange(1, CM_DATA_COL, 1, CM_VERSIONS).getValues()[0];
      const oldRev = Number(String(head[0]).replace(/\D/g, '')) || 0;
      if (oldRev > rev) return { ok: false, rev: oldRev };
      // 舊版本往右移（AD → AE → AF）
      const last = Math.max(2, sh.getLastRow());
      const cols = sh.getRange(1, CM_DATA_COL, last, CM_VERSIONS).getValues();
      const parts = [];
      for (let i = 0; i < data.length; i += CHUNK) parts.push(data.slice(i, i + CHUNK));
      const rows = Math.max(last, parts.length + 1);
      ensureSize_(sh, rows, CM_DATA_COL + CM_VERSIONS - 1);
      const out = [];
      for (let r = 0; r < rows; r++) {
        const row = [];
        row.push(r === 0 ? 'rev:' + rev : (parts[r - 1] || ''));
        for (let v = 1; v < CM_VERSIONS; v++) row.push(cols[r] ? cols[r][v - 1] : '');
        out.push(row);
      }
      sh.getRange(1, CM_DATA_COL, rows, CM_VERSIONS).setValues(out);
      try { cmWriteTables_(sh, acc.user, slot, JSON.parse(data), req.summary || {}); } catch (e) { /* 表格整理失敗不影響存檔 */ }
      return { ok: true, rev: rev };
    });
  },

  cmLoad(req) {
    const acc = careerAuth_(req);
    const sh = cmSheet_(acc.user, req.slot, false);
    if (!sh || sh.getMaxColumns() < CM_DATA_COL) return null;
    const last = sh.getLastRow();
    if (last < 2) return null;
    const v = sh.getRange(1, CM_DATA_COL, last, 1).getValues().map(r => String(r[0]));
    const rev = Number(v[0].replace(/\D/g, '')) || 0;
    const data = v.slice(1).join('');
    return data ? { rev: rev, data: data } : null;
  },

  cmList(req) {
    const acc = careerAuth_(req);
    const out = [];
    for (let s = 1; s <= 3; s++) {
      const sh = cmSheet_(acc.user, s, false);
      if (sh) out.push(cmSummary_(sh, acc.user, s));
    }
    return out;
  },

  cmDelete(req) {
    const acc = careerAuth_(req);
    return withLock_(() => {
      const sh = cmSheet_(acc.user, req.slot, false);
      if (sh) SpreadsheetApp.getActive().deleteSheet(sh);
      return true;
    });
  },

  // 好友週賽：每人每週留最好的一場
  cmWeekSubmit(req) {
    const acc = careerAuth_(req);
    return withLock_(() => {
      const sh = cmWeekSheet_();
      const wk = String(req.week || ''), last = sh.getLastRow();
      const rows = last > 1 ? sh.getRange(2, 1, last - 1, CM_WEEK_HEADER.length).getValues() : [];
      const row = [wk, acc.user, String(req.name || ''), Number(req.strokes) || 0, Number(req.toPar) || 0, String(req.course || ''), new Date()];
      for (let i = 0; i < rows.length; i++) {
        if (String(rows[i][0]) === wk && String(rows[i][1]) === acc.user) {
          if (row[3] < Number(rows[i][3])) sh.getRange(i + 2, 1, 1, row.length).setValues([row]);
          return true;
        }
      }
      sh.appendRow(row);
      return true;
    });
  },
  cmWeekBoard(req) {
    careerAuth_(req);
    const sh = cmWeekSheet_(), last = sh.getLastRow();
    if (last < 2) return [];
    const wk = String(req.week || '');
    return sh.getRange(2, 1, last - 1, CM_WEEK_HEADER.length).getValues().filter(r => String(r[0]) === wk)
      .map(r => ({ user: String(r[1]), name: String(r[2]), strokes: Number(r[3]), toPar: Number(r[4]), course: String(r[5]) }))
      .sort((a, b) => a.strokes - b.strokes);
  },

  // 管理員：所有測試員的生涯摘要
  cmAdminList(req) {
    admin_(req);
    const out = [];
    SpreadsheetApp.getActive().getSheets().forEach(sh => {
      const m = sh.getName().match(/^生涯_(.+?)(?:_(\d))?$/);
      if (m && sh.getName() !== CM_WEEK_SHEET) out.push(cmSummary_(sh, m[1], Number(m[2]) || 1));
    });
    return out;
  },
};

function cmWeekSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(CM_WEEK_SHEET);
  if (!sh) {
    sh = ss.insertSheet(CM_WEEK_SHEET);
    sh.getRange(1, 1, 1, CM_WEEK_HEADER.length).setValues([CM_WEEK_HEADER]).setFontWeight('bold').setBackground('#0f3a24').setFontColor('#f2ead8');
    sh.setFrozenRows(1);
  }
  return sh;
}

function cmSummary_(sh, user, slot) {
  const v = sh.getRange(1, 2, CM_BASIC.length, 1).getValues().map(r => r[0]);
  const g = k => v[CM_BASIC.indexOf(k)];
  const head = sh.getMaxColumns() >= CM_DATA_COL ? String(sh.getRange(1, CM_DATA_COL).getValue()) : '';
  return {
    user: user, slot: slot, name: String(g('球員名') || ''), country: String(g('國籍') || ''), age: Number(g('年齡')) || 0, chapter: String(g('章節') || ''),
    year: Number(g('季')) || 0, week: Number(g('週')) || 0, level: Number(g('等級')) || 0, rank: g('世界排名') === '' ? null : Number(g('世界排名')),
    money: Number(g('可用資金')) || 0, prize: Number(g('生涯總獎金')) || 0, wins: Number(g('冠軍數')) || 0, majors: Number(g('大賽數')) || 0,
    difficulty: String(g('難度') || ''), title: String(g('稱號') || ''), rev: Number(head.replace(/\D/g, '')) || 0, updated: g('最後更新'),
  };
}

// 把存檔整理成看得懂的表格（打開試算表就能看）
function cmWriteTables_(sh, user, slot, s, sum) {
  const p = s.player || {};
  const basic = {
    '帳號': user, '欄位': slot, '球員名': p.name || '', '國籍': p.country || '', '年齡': p.age || '', '章節': sum.chapter || s.chapter || '', '季': s.year || '', '週': s.week || '',
    '等級': p.level || '', '經驗值': p.xp || 0, '技能點': p.skillPts || 0, '世界排名': s.rankNow || '', '可用資金': Math.round((s.money || {}).cash || 0), '生涯總獎金': Math.round((s.money || {}).careerPrize || 0),
    '冠軍數': (s.tally || {}).wins || 0, '大賽數': (s.tally || {}).majors || 0, '難度': (s.opt || {}).difficulty || '', '稱號': s.title || '', '存檔版本': s.rev || 0, '最後更新': new Date(),
  };
  sh.getRange(1, 1, CM_BASIC.length, 2).setValues(CM_BASIC.map(k => [k, basic[k]]));
  // 素質
  const ZH = { power: '力量', contact: '擊球效率', launch: '彈道控制', accuracy: '準度', consistency: '穩定度', shaping: '曲球控制', spin: '旋轉控制', chipping: '切球', bunker: '沙坑', recovery: '脫困', touch: '推桿距離感', line: '推桿方向', reading: '讀果嶺', mental: '抗壓' };
  const st = [['素質', '目前值', '上限', '訓練經驗', '裝備加成']].concat(Object.keys(ZH).map(k => [ZH[k], Math.round(((p.stats || {})[k] || 0) * 10) / 10, (s.capsView || {})[k] || '', Math.round(((p.trainXp || {})[k] || 0)), (s.gearView || {})[k] || 0]));
  sh.getRange(1, 4, st.length, 5).setValues(st);
  sh.getRange(1, 4, 1, 5).setFontWeight('bold').setBackground('#e7efe3');
  // 裝備
  const eq = (s.gear || {}).eq || {}, items = (s.gear || {}).items || [];
  const gr = [['欄位', '名稱', '稀有度', '等級', '能力']].concat(Object.keys(eq).slice(0, 12).map(slotK => { const it = items.find(x => x.uid === eq[slotK]) || {}; return [slotK, it.name || '', it.rarity || '', it.lv || '', JSON.stringify(it.stats || {})]; }));
  sh.getRange(1, 10, 13, 5).clearContent();
  sh.getRange(1, 10, gr.length, 5).setValues(gr);
  sh.getRange(1, 10, 1, 5).setFontWeight('bold').setBackground('#e7efe3');
  // 團隊與人際
  const team = [['角色', '名字', '關係 / 默契', '備註']];
  const t = s.team || {};
  ['coach', 'caddie', 'agent'].forEach(k => { if (t[k]) team.push([{ coach: '教練', caddie: '桿弟', agent: '經紀人' }[k], t[k].name || '', t[k].chem || '', t[k].note || '']); });
  Object.keys(s.rel || {}).slice(0, 15).forEach(k => team.push(['關係', k, Math.round(s.rel[k]), '']));
  sh.getRange(1, 16, 20, 4).clearContent();
  sh.getRange(1, 16, Math.min(20, team.length), 4).setValues(team.slice(0, 20));
  sh.getRange(1, 16, 1, 4).setFontWeight('bold').setBackground('#e7efe3');
  // 賽事紀錄（每場一列）
  const res = (s.results || []).map(r => [r.y, r.w, r.age, r.name, r.tourZh || r.tour, r.courseName || r.course, r.pos, (r.rounds || [])[0] || '', (r.rounds || [])[1] || '', (r.rounds || [])[2] || '', (r.rounds || [])[3] || '', r.total || '', Math.round(r.prize || 0), r.pts || 0, r.mode || '']);
  const lastRow = sh.getLastRow();
  if (lastRow > CM_EVENT_ROW) sh.getRange(CM_EVENT_ROW + 1, 1, lastRow - CM_EVENT_ROW, 25).clearContent();
  if (res.length) { ensureSize_(sh, CM_EVENT_ROW + res.length, 25); sh.getRange(CM_EVENT_ROW + 1, 1, res.length, CM_EVENT_HEADER.length).setValues(res); }
  const side = (col, header, rows) => {
    sh.getRange(CM_EVENT_ROW, col, 1, header.length).setValues([header]).setFontWeight('bold').setBackground('#0f3a24').setFontColor('#f2ead8');
    if (rows.length) { ensureSize_(sh, CM_EVENT_ROW + rows.length, col + header.length); sh.getRange(CM_EVENT_ROW + 1, col, rows.length, header.length).setValues(rows); }
  };
  side(17, ['獎盃', '年份', '等級'], (s.trophies || []).map(t2 => [t2.name, t2.y, t2.tier || '']));
  side(21, ['年齡', '事件'], (s.timeline || []).map(x => [x.age, x.text]));
  side(24, ['生涯成就', '達成時間'], Object.keys(s.ach || {}).map(k => [k, s.ach[k]]));
}
