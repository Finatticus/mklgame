// ===================== 資料狀態 =====================
// 兩種語言的單字都存在 S.words，畫面一律透過 Words.all() 取「目前語言」的單字
const S = {
    user: null,
    lang: "en",
    words: [],
    settings: {},     // 雲端設定，key 以語言開頭，例如 "en.books"、"fr.newPerDay"
    log: [],          // [{date, lang, reviews, correct, newCount}]
    lastSync: 0,
    articles: [],     // 目前語言的文章
    scores: { meteor: 0, runner: 0 }
};

function L() { return LANGS[S.lang]; }

const Store = {
    k(name) { return `vocab_${name}_${S.user}`; },

    load(user) {
        S.user = user;
        S.lang = LANGS[lsGet("vocab_lang", "en")] ? lsGet("vocab_lang", "en") : "en";
        S.words = lsGet(Store.k("words"), []);
        S.settings = lsGet(Store.k("settings"), {});
        S.log = lsGet(Store.k("log"), []);
        S.lastSync = lsGet(Store.k("lastSync"), 0);
        S.articles = [];
    },

    clear() {
        S.user = null; S.words = []; S.articles = []; S.log = []; S.settings = {};
    },

    saveWords: debounce(() => { if (S.user) lsSet(Store.k("words"), S.words); }, 300),
    saveLocalSettings() { lsSet(Store.k("settings"), S.settings); },
    saveLog() { lsSet(Store.k("log"), S.log); },

    // 讀寫「目前語言」的設定
    get(name, fallback) {
        const v = S.settings[`${S.lang}.${name}`];
        return v === undefined ? fallback : v;
    },

    set(patch) {
        const out = {};
        Object.entries(patch).forEach(([k, v]) => { out[`${S.lang}.${k}`] = v; });
        Object.assign(S.settings, out);
        Store.saveLocalSettings();
        Queue.push("saveSettings", { settings: out });
    },

    // 單字本：依設定的順序，加上單字中出現但清單沒有的，垃圾桶放最後
    books() {
        const order = (Store.get("books", []) || []).filter(b => b && b !== TRASH_BOOK);
        const set = new Set(order);
        const words = Words.all();
        words.forEach(w => { if (w.book && w.book !== TRASH_BOOK && !set.has(w.book)) { set.add(w.book); order.push(w.book); } });
        if (!set.has(DEFAULT_BOOK)) order.unshift(DEFAULT_BOOK);
        if (words.some(w => w.book === TRASH_BOOK)) order.push(TRASH_BOOK);
        return order;
    },

    defaultBook() {
        const b = Store.get("defaultBook", DEFAULT_BOOK);
        return Store.books().includes(b) ? b : DEFAULT_BOOK;
    },

    saveBookOrder(list) { Store.set({ books: list.filter(b => b !== TRASH_BOOK) }); },

    logToday() {
        return S.log.find(r => r.date === dateKey() && r.lang === S.lang);
    },

    addLog(entry) {
        let row = Store.logToday();
        if (!row) { row = { date: dateKey(), lang: S.lang, reviews: 0, correct: 0, newCount: 0 }; S.log.push(row); }
        row.reviews += entry.reviews || 0;
        row.correct += entry.correct || 0;
        row.newCount += entry.newCount || 0;
        Store.saveLog();
        Queue.push("logReview", { lang: S.lang, date: row.date, reviews: entry.reviews || 0, correct: entry.correct || 0, newCount: entry.newCount || 0 });
    }
};

// ===================== 單字操作 =====================
const Words = {
    all() { return S.words.filter(w => w.lang === S.lang); },
    active() { return S.words.filter(w => w.lang === S.lang && w.book !== TRASH_BOOK); },
    byId(id) { return S.words.find(w => w.id === id); },
    inBook(book) { return Words.all().filter(w => w.book === book); },

    normalize(term) {
        term = String(term || "").trim().replace(/\s+/g, " ");
        // 只有開頭大寫的單一單字（如 "Apple"、"Maison"）轉小寫；全大寫縮寫或片語保留
        if (term.length > 1 && !term.includes(" ") && term === term.charAt(0).toUpperCase() + term.slice(1).toLowerCase()) term = term.toLowerCase();
        return term;
    },

    findDuplicate(term, book, exceptId) {
        const key = String(term || "").trim().toLowerCase();
        if (!key) return null;
        return Words.all().find(w => w.id !== exceptId && w.book === book && w.term.toLowerCase() === key) || null;
    },

    findAnywhere(term) {
        const key = String(term || "").trim().toLowerCase();
        return key ? Words.active().filter(w => w.term.toLowerCase() === key) : [];
    },

    // list: [{term, meaning, book, ...}]，回傳實際新增的單字（固定加到目前語言）
    add(list) {
        const now = new Date().toISOString();
        const added = list.map(w => ({
            id: uid(), lang: S.lang, book: w.book || Store.defaultBook(), term: Words.normalize(w.term),
            meaning: (w.meaning || "").trim(), notes: (w.notes || "").trim(), timestamp: now,
            nextReviewTime: 0, interval: 0, easeFactor: 2.5, pos: w.pos || "", example: (w.example || "").trim(),
            phonetic: w.phonetic || "", updated: 0, reviews: 0, lapses: 0
        })).filter(w => w.term && w.meaning);
        if (!added.length) return [];
        S.words.push(...added);
        Store.saveWords();
        Queue.push("addWords", { words: added });
        added.forEach(w => { if (!w.phonetic) Phon.ensure(w); });
        App.refreshCounts();
        return added;
    },

    update(updates) {
        if (!updates.length) return;
        updates.forEach(u => { const w = Words.byId(u.id); if (w) Object.assign(w, u.fields); });
        Store.saveWords();
        Queue.push("updateWords", { updates });
        App.refreshCounts();
    },

    remove(ids) {
        if (!ids.length) return;
        const set = new Set(ids);
        S.words = S.words.filter(w => !set.has(w.id));
        Store.saveWords();
        Queue.push("deleteWords", { ids });
        App.refreshCounts();
    }
};

// ===================== 同步 =====================
const Sync = {
    running: null,

    run(opts = {}) {
        if (Sync.running) return Sync.running;
        Sync.running = Sync._run(opts).finally(() => { Sync.running = null; });
        return Sync.running;
    },

    async _run({ full = false, quiet = false } = {}) {
        if (!S.user) return false;
        const btn = $("btn-sync");
        if (!quiet) setBusy(btn, true, "同步中…");
        try {
            // 先送完本機尚未送出的修改，避免被雲端舊資料蓋掉
            await Queue.flush();
            if (Queue.size() > 0) {
                if (!quiet) showToast("目前離線，修改已存在這台裝置，連線後會自動同步");
                return false;
            }
            const since = full ? 0 : S.lastSync;
            const res = await Api.call("getData", { since });
            if (!res.apiVersion || res.apiVersion < MIN_API_VERSION || !Array.isArray(res.words)) {
                throw new ServerError("後端版本不符，請部署最新的 GAS.gs（見 README）");
            }
            if (res.full || !since) {
                S.words = res.words;
            } else {
                const map = new Map(S.words.map(w => [w.id, w]));
                res.words.forEach(w => map.set(w.id, w));
                const alive = new Set(res.ids);
                S.words = [...map.values()].filter(w => alive.has(w.id));
            }
            S.lastSync = res.serverTime;
            S.settings = res.settings || {};
            S.log = res.log || [];
            Store.saveWords();
            Store.saveLocalSettings();
            Store.saveLog();
            lsSet(Store.k("lastSync"), S.lastSync);
            App.refreshAll();
            Phon.backfill();
            if (!quiet) showToast("已同步");
            return true;
        } catch (e) {
            console.error(e);
            if (!quiet || e instanceof ServerError) showToast(e instanceof ServerError ? e.message : "無法連線，目前顯示這台裝置上的資料", "error", 4000);
            return false;
        } finally {
            if (!quiet) setBusy(btn, false);
        }
    }
};
