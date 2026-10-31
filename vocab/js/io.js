// ===================== 匯出 / 匯入 / 備份 =====================
const CSV_FIELDS = ["term", "meaning", "notes", "pos", "example", "book"];

function csvCell(v) {
    const s = String(v === undefined || v === null ? "" : v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function parseCSV(text) {
    const rows = [];
    let row = [], cell = "", quoted = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (quoted) {
            if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
            else if (c === '"') quoted = false;
            else cell += c;
        } else if (c === '"') quoted = true;
        else if (c === ",") { row.push(cell); cell = ""; }
        else if (c === "\n" || c === "\r") {
            if (c === "\r" && text[i + 1] === "\n") i++;
            row.push(cell); rows.push(row); row = []; cell = "";
        } else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(x => x.trim()));
}

function stamp() { return dateKey().replace(/-/g, ""); }

Actions.exportCSV = () => {
    const lines = [CSV_FIELDS.join(",")].concat(Words.active().map(w => CSV_FIELDS.map(f => csvCell(w[f])).join(",")));
    downloadFile(`vocab-${S.lang}-${S.user}-${stamp()}.csv`, "﻿" + lines.join("\r\n"), "text/csv;charset=utf-8");
};

// Anki 匯入格式：正面<TAB>背面<TAB>標籤
Actions.exportAnki = () => {
    const clean = (s) => String(s || "").replace(/[\t\r\n]+/g, " ");
    const lines = Words.active().map(w => {
        const back = [clean(w.meaning), w.pos ? `(${clean(w.pos)})` : "", w.example ? `<br><i>${clean(w.example)}</i>` : ""].filter(Boolean).join(" ");
        return [clean(w.term), back, `${S.lang}::${clean(w.book).replace(/\s+/g, "_")}`].join("\t");
    });
    downloadFile(`vocab-anki-${S.lang}-${S.user}-${stamp()}.txt`, "#separator:tab\n#html:true\n#tags column:3\n" + lines.join("\n"));
};

Actions.exportBackup = async () => {
    const articles = {};
    for (const lang of Object.keys(LANGS)) {
        try { articles[lang] = (await Api.call("getArticles", { lang })).articles; }
        catch (e) { articles[lang] = lsGet(`vocab_articles_${lang}_${S.user}`, []); }
    }
    const data = { app: "Vocab", version: APP_VERSION, exportedAt: new Date().toISOString(), user: S.user,
        words: S.words, articles, settings: S.settings, log: S.log };
    downloadFile(`vocab-backup-${S.user}-${stamp()}.json`, JSON.stringify(data, null, 2), "application/json");
};

Actions.importCSV = () => $("import-file").click();

$("import-file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const rows = parseCSV(await file.text());
    if (rows.length < 2) { showToast("檔案沒有資料", "error"); return; }
    const header = rows[0].map(h => h.trim().toLowerCase().replace(/^﻿/, ""));
    const col = (...names) => names.map(n => header.indexOf(n)).find(i => i >= 0);
    const cTerm = col("term"), cMeaning = col("meaning");
    if (cTerm === undefined || cMeaning === undefined) { showToast("找不到 term / meaning 欄位", "error"); return; }
    const get = (r, ...names) => { const i = col(...names); return i === undefined ? "" : (r[i] || "").trim(); };

    const fallbackBook = Store.defaultBook();
    const seen = new Set();
    const list = [];
    let skipped = 0;
    rows.slice(1).forEach(r => {
        const w = { term: Words.normalize(r[cTerm]), meaning: (r[cMeaning] || "").trim(), notes: get(r, "notes"),
            pos: get(r, "pos"), example: get(r, "example"), book: get(r, "book") || fallbackBook };
        const key = w.book + "|" + w.term.toLowerCase();
        if (!w.term || !w.meaning || w.book === TRASH_BOOK || seen.has(key) || Words.findDuplicate(w.term, w.book)) { skipped++; return; }
        seen.add(key);
        if (!L().pos.some(p => p[0] === w.pos)) w.pos = "";
        list.push(w);
    });
    if (!list.length) { showToast(`沒有新的單字可匯入（略過 ${skipped} 筆）`); return; }
    if (!(await UI.confirm(`匯入${L().label}單字`, `將匯入 ${list.length} 個字${skipped ? `，略過 ${skipped} 筆重複或空白資料` : ""}。`))) return;
    const newBooks = [...new Set(list.map(w => w.book))].filter(b => !Store.books().includes(b));
    if (newBooks.length) Store.saveBookOrder([...Store.books(), ...newBooks]);
    Words.add(list);
    refreshBookSelects();
    showToast(`已匯入 ${list.length} 個字`);
});

// ===================== 每日複習提醒（App 開啟時） =====================
const Notify = {
    timer: null,

    enabled() { return "Notification" in window && Notification.permission === "granted" && lsGet("vocab_notify", true); },

    updateButton() {
        const btn = $("btn-notify");
        if (!("Notification" in window)) { btn.textContent = "此瀏覽器不支援通知"; btn.disabled = true; return; }
        if (Notification.permission === "denied") { btn.textContent = "通知已被瀏覽器封鎖"; btn.disabled = true; return; }
        btn.innerHTML = Notify.enabled() ? '<i class="icon-bell"></i> 每天 18:00 提醒複習（開啟中）' : '<i class="icon-bell-off"></i> 每天 18:00 提醒複習（已關閉）';
    },

    dueAll() {
        const prev = S.lang;
        const counts = Object.keys(LANGS).map(lang => { S.lang = lang; return SRS.dueList().all.length; });
        S.lang = prev;
        return counts.reduce((a, b) => a + b, 0);
    },

    schedule() {
        clearTimeout(Notify.timer);
        if (!Notify.enabled()) return;
        const target = new Date();
        target.setHours(18, 0, 0, 0);
        if (target <= new Date()) target.setDate(target.getDate() + 1);
        Notify.timer = setTimeout(async () => {
            const due = S.user ? Notify.dueAll() : 0;
            if (due > 0 && Notify.enabled()) {
                const opts = { body: `今天有 ${due} 個字等你複習。`, icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: "vocab-reminder" };
                try {
                    const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
                    if (reg) reg.showNotification("Vocab", opts);
                    else new Notification("Vocab", opts);
                } catch (e) { console.warn(e); }
            }
            Notify.schedule();
        }, target - new Date());
    }
};

Actions.toggleNotification = async () => {
    if (Notification.permission === "default") lsSet("vocab_notify", (await Notification.requestPermission()) === "granted");
    else lsSet("vocab_notify", !lsGet("vocab_notify", true));
    Notify.updateButton();
    Notify.schedule();
};
