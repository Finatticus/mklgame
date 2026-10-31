// ===================== 資料狀態 =====================
const S = {
    user: null,
    words: [],
    settings: { books: [], defaultBook: DEFAULT_BOOK, folders: [], newPerDay: DEFAULT_NEW_PER_DAY },
    log: [],          // [{date, reviews, correct, newCount}]
    lastSync: 0,
    articles: [],
    scores: { meteor: 0, runner: 0 }
};

const Store = {
    k(name) { return `vp_${name}_${S.user}`; },

    // 讀取本機快取，離線也能使用
    load(user) {
        S.user = user;
        S.words = lsGet(Store.k("words"), []);
        S.settings = Object.assign(Store.defaultSettings(), lsGet(Store.k("settings"), {}));
        S.log = lsGet(Store.k("log"), []);
        S.lastSync = lsGet(Store.k("lastSync"), 0);
        S.articles = [];
    },

    defaultSettings() {
        return { books: [], defaultBook: DEFAULT_BOOK, folders: [], newPerDay: DEFAULT_NEW_PER_DAY };
    },

    saveWords: debounce(() => { if (S.user) lsSet(Store.k("words"), S.words); }, 300),
    saveLocalSettings() { lsSet(Store.k("settings"), S.settings); },
    saveLog() { lsSet(Store.k("log"), S.log); },

    clear() {
        S.user = null; S.words = []; S.articles = []; S.log = [];
        S.settings = Store.defaultSettings();
    },

    // 改設定：本機立即生效，並排入同步
    setSettings(patch) {
        Object.assign(S.settings, patch);
        Store.saveLocalSettings();
        Queue.push("saveSettings", { settings: patch });
    },

    // 單字本清單：依設定中的順序，加上單字中出現但清單沒有的本子，垃圾桶永遠放最後
    books() {
        const order = (S.settings.books || []).filter(b => b && b !== TRASH_BOOK);
        const set = new Set(order);
        S.words.forEach(w => { if (w.book && w.book !== TRASH_BOOK && !set.has(w.book)) { set.add(w.book); order.push(w.book); } });
        if (!set.has(DEFAULT_BOOK)) order.unshift(DEFAULT_BOOK);
        if (S.words.some(w => w.book === TRASH_BOOK)) order.push(TRASH_BOOK);
        return order;
    },

    defaultBook() {
        const b = S.settings.defaultBook;
        return b && Store.books().includes(b) ? b : DEFAULT_BOOK;
    },

    saveBookOrder(list) {
        Store.setSettings({ books: list.filter(b => b !== TRASH_BOOK) });
    },

    // 由舊版 localStorage 帶入單字本順序與文章群組（只做一次）
    migrateLegacySettings() {
        if (S.settings.books && S.settings.books.length) return;
        const legacyBooks = lsGet(`vocabBooks_${S.user}`, null);
        let legacyDefault = null;
        try { legacyDefault = localStorage.getItem(`defaultBook_${S.user}`); } catch (e) { /* 略過 */ }
        const legacyFolders = lsGet(`userFolders_${S.user}`, null);
        const patch = {};
        if (Array.isArray(legacyBooks) && legacyBooks.length) patch.books = legacyBooks.filter(b => b !== TRASH_BOOK);
        if (legacyDefault) patch.defaultBook = legacyDefault;
        if (Array.isArray(legacyFolders) && legacyFolders.length && !(S.settings.folders || []).length) patch.folders = legacyFolders;
        if (Object.keys(patch).length) Store.setSettings(patch);
    },

    addLog(entry) {
        const today = dateKey();
        let row = S.log.find(r => r.date === today);
        if (!row) { row = { date: today, reviews: 0, correct: 0, newCount: 0 }; S.log.push(row); }
        row.reviews += entry.reviews || 0;
        row.correct += entry.correct || 0;
        row.newCount += entry.newCount || 0;
        Store.saveLog();
        Queue.push("logReview", { date: today, reviews: entry.reviews || 0, correct: entry.correct || 0, newCount: entry.newCount || 0 });
    }
};

// ===================== 單字操作 =====================
const Words = {
    byId(id) { return S.words.find(w => w.id === id); },
    inBook(book) { return S.words.filter(w => w.book === book); },

    normalizeEnglish(en) {
        en = String(en || "").trim().replace(/\s+/g, " ");
        // 只有開頭大寫的單一單字（如 "Apple"）轉小寫；全大寫縮寫或片語保留
        if (en && !en.includes(" ") && en === en.charAt(0).toUpperCase() + en.slice(1).toLowerCase()) en = en.toLowerCase();
        return en;
    },

    findDuplicate(english, book, exceptId) {
        const key = String(english || "").trim().toLowerCase();
        if (!key) return null;
        return S.words.find(w => w.id !== exceptId && w.book === book && w.english.toLowerCase() === key) || null;
    },

    findAnywhere(english) {
        const key = String(english || "").trim().toLowerCase();
        return key ? S.words.filter(w => w.english.toLowerCase() === key && w.book !== TRASH_BOOK) : [];
    },

    // list: [{english, chinese, book, ...}]，回傳實際新增的單字
    add(list) {
        const now = new Date().toISOString();
        const added = list.map(w => ({
            id: uid(), book: w.book || Store.defaultBook(), english: Words.normalizeEnglish(w.english),
            chinese: (w.chinese || "").trim(), notes: (w.notes || "").trim(), timestamp: now,
            nextReviewTime: 0, interval: 0, easeFactor: 2.5, pos: w.pos || "", example: (w.example || "").trim(),
            phonetic: w.phonetic || "", updated: 0, reviews: 0, lapses: 0
        })).filter(w => w.english && w.chinese);
        if (!added.length) return [];
        S.words.push(...added);
        Store.saveWords();
        Queue.push("addWords", { words: added });
        added.forEach(w => { if (!w.phonetic) Phon.ensure(w); });
        App.refreshCounts();
        return added;
    },

    // updates: [{id, fields}]
    update(updates) {
        if (!updates.length) return;
        updates.forEach(u => {
            const w = Words.byId(u.id);
            if (w) Object.assign(w, u.fields);
        });
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
        if (!quiet) setBusy(btn, true, '<i class="fas fa-spinner fa-spin"></i> 同步中...');
        try {
            // 先把本機尚未送出的修改送完，避免被雲端舊資料蓋掉
            await Queue.flush();
            if (Queue.size() > 0) {
                if (!quiet) showToast("目前離線，修改已保存在本機，恢復連線後會自動同步", "warning");
                return false;
            }
            const since = full ? 0 : S.lastSync;
            const res = await Api.call("getData", { since });
            if (!res.apiVersion || !Array.isArray(res.words)) throw new ServerError("後端版本太舊，請先更新並重新部署 GAS（見 README）");
            if (res.full || !since) {
                S.words = res.words;
            } else {
                const map = new Map(S.words.map(w => [w.id, w]));
                res.words.forEach(w => map.set(w.id, w));
                const alive = new Set(res.ids);
                S.words = [...map.values()].filter(w => alive.has(w.id));
            }
            S.lastSync = res.serverTime;
            S.settings = Object.assign(Store.defaultSettings(), res.settings || {});
            S.log = res.log || [];
            Store.saveWords();
            Store.saveLocalSettings();
            Store.saveLog();
            lsSet(Store.k("lastSync"), S.lastSync);
            Store.migrateLegacySettings();
            App.refreshAll();
            Phon.backfill();
            if (!quiet) showToast("同步完成");
            return true;
        } catch (e) {
            console.error(e);
            if (!quiet) showToast(e instanceof ServerError ? `同步失敗：${e.message}` : "連線錯誤，目前顯示本機資料", "error");
            return false;
        } finally {
            if (!quiet) setBusy(btn, false);
        }
    }
};
