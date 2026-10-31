// ===================== 匯出 / 匯入 / 備份 =====================
const CSV_FIELDS = ["english", "chinese", "notes", "pos", "example", "book"];

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

function exportWords() { return S.words.filter(w => w.book !== TRASH_BOOK); }
function stamp() { return dateKey().replace(/-/g, ""); }

Actions.exportCSV = () => {
    const lines = [CSV_FIELDS.join(",")].concat(exportWords().map(w => CSV_FIELDS.map(f => csvCell(w[f])).join(",")));
    downloadFile(`vocab-${S.user}-${stamp()}.csv`, "﻿" + lines.join("\r\n"), "text/csv;charset=utf-8");
};

// Anki 匯入格式：正面<TAB>背面<TAB>標籤
Actions.exportAnki = () => {
    const clean = (s) => String(s || "").replace(/[\t\r\n]+/g, " ");
    const lines = exportWords().map(w => {
        const back = [clean(w.chinese), w.pos ? `(${clean(w.pos)})` : "", w.example ? `<br><i>${clean(w.example)}</i>` : ""].filter(Boolean).join(" ");
        return [clean(w.english), back, clean(w.book).replace(/\s+/g, "_")].join("\t");
    });
    downloadFile(`vocab-anki-${S.user}-${stamp()}.txt`, "#separator:tab\n#html:true\n#tags column:3\n" + lines.join("\n"));
};

Actions.exportBackup = async () => {
    if (!S.articles.length) {
        try { S.articles = (await Api.call("getArticles")).articles; } catch (e) { /* 離線時只備份本機已有的資料 */ }
    }
    const data = { app: "Vocab Pro", version: APP_VERSION, exportedAt: new Date().toISOString(), user: S.user,
        words: S.words, articles: S.articles, settings: S.settings, log: S.log };
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
    const col = (name) => header.indexOf(name);
    if (col("english") < 0 || col("chinese") < 0) { showToast("找不到 english / chinese 欄位", "error"); return; }

    const fallbackBook = Store.defaultBook();
    const seen = new Set();
    const list = [];
    let skipped = 0;
    rows.slice(1).forEach(r => {
        const get = (name) => col(name) >= 0 ? (r[col(name)] || "").trim() : "";
        const w = { english: Words.normalizeEnglish(get("english")), chinese: get("chinese"), notes: get("notes"),
            pos: get("pos"), example: get("example"), book: get("book") || fallbackBook };
        const key = w.book + "|" + w.english.toLowerCase();
        if (!w.english || !w.chinese || w.book === TRASH_BOOK || seen.has(key) || Words.findDuplicate(w.english, w.book)) { skipped++; return; }
        seen.add(key);
        if (!POS_OPTIONS.some(p => p[0] === w.pos)) w.pos = "";
        list.push(w);
    });
    if (!list.length) { showToast(`沒有可匯入的新單字（略過 ${skipped} 筆）`, "warning"); return; }
    if (!(await UI.confirm("匯入單字", `將匯入 ${list.length} 個單字${skipped ? `，略過 ${skipped} 筆重複或空白資料` : ""}。`))) return;
    const newBooks = [...new Set(list.map(w => w.book))].filter(b => !Store.books().includes(b));
    if (newBooks.length) Store.saveBookOrder([...Store.books(), ...newBooks]);
    Words.add(list);
    refreshBookSelects();
    showToast(`已匯入 ${list.length} 個單字`);
});

// ===================== 每日複習提醒（App 開啟時） =====================
const Notify = {
    timer: null,

    enabled() { return "Notification" in window && Notification.permission === "granted" && lsGet("vp_notify", true); },

    updateButton() {
        const btn = $("btn-notify");
        if (!("Notification" in window)) { btn.textContent = "此瀏覽器不支援通知"; btn.disabled = true; return; }
        if (Notification.permission === "denied") { btn.textContent = "通知已被瀏覽器封鎖（請到瀏覽器設定開啟）"; btn.disabled = true; return; }
        btn.innerHTML = Notify.enabled() ? '<i class="fas fa-bell"></i> 已開啟（點擊關閉）' : '<i class="fas fa-bell-slash"></i> 已關閉（點擊開啟）';
    },

    schedule() {
        clearTimeout(Notify.timer);
        if (!Notify.enabled()) return;
        const target = new Date();
        target.setHours(18, 0, 0, 0);
        if (target <= new Date()) target.setDate(target.getDate() + 1);
        Notify.timer = setTimeout(async () => {
            const due = S.user ? SRS.dueList().all.length : 0;
            if (due > 0 && Notify.enabled()) {
                const body = `今天有 ${due} 個單字需要複習，趕快打開 App 吧！`;
                const opts = { body, icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: "vocab-srs-reminder" };
                try {
                    const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
                    if (reg) reg.showNotification("📚 Vocab Pro 複習提醒", opts);
                    else new Notification("📚 Vocab Pro 複習提醒", opts).onclick = () => { window.focus(); App.go("sec-books"); };
                } catch (e) { console.warn(e); }
            }
            Notify.schedule();
        }, target - new Date());
    }
};

Actions.toggleNotification = async () => {
    if (Notification.permission === "default") {
        const perm = await Notification.requestPermission();
        lsSet("vp_notify", perm === "granted");
    } else {
        lsSet("vp_notify", !lsGet("vp_notify", true));
    }
    Notify.updateButton();
    Notify.schedule();
};
