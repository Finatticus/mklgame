// ===================== App 外殼：分頁、語言、登入、外觀 =====================
const NAV_OF = {
    "sec-today": "sec-today", "sec-books": "sec-books", "sec-words": "sec-books", "sec-srs-list": "sec-books",
    "sec-sentence-maker": "sec-books", "sec-radio-setup": "sec-books", "sec-radio-player": "sec-books",
    "sec-flashcard": "sec-today", "sec-dict": "sec-dict", "sec-read": "sec-read", "sec-more": "sec-more",
    "sec-class": "sec-class", "sec-lesson": "sec-class", "sec-verb": "sec-class", "sec-grammar": "sec-class", "sec-drill": "sec-class",
    "sec-practice": "sec-today"
};
// 這些頁面切換時不中斷朗讀
const KEEP_TTS = ["sec-lesson", "sec-verb", "sec-grammar", "sec-drill", "sec-practice"];

const App = {
    current: "sec-login",

    go(id) {
        if (id !== "sec-radio-player" && Radio.playing) Actions.pauseRadio();
        if (id !== "sec-words" && isManageMode) Actions.toggleManageMode();
        document.querySelectorAll("main > section").forEach(s => s.classList.toggle("active", s.id === id));
        document.querySelectorAll(".nav button").forEach(b => b.classList.toggle("on", b.dataset.arg === NAV_OF[id]));
        App.current = id;
        if (id === "sec-today") { App.refreshCounts(); renderRecent(); }
        if (id === "sec-practice") renderPracticePage();
        if (id === "sec-books") renderBooksList();
        if (id === "sec-read") fetchCustomArticles();
        if (id === "sec-more") { updateStatistics(); $("new-per-day").value = SRS.newPerDay(); const g = Goals.conf(); $("goal-reviews").value = g.reviews; $("goal-words").value = g.words; $("goal-study").value = g.study; Notify.updateButton(); loadHighScores(); }
        if (id === "sec-class") renderClassHome();
        if (!KEEP_TTS.includes(id)) { TTS.stop(); Speech.stop(); }
        window.scrollTo({ top: 0 });
    },

    refreshCounts() {
        const due = SRS.dueList();
        $("due-count").textContent = due.all.length;
        $("due-detail").textContent = due.all.length
            ? [due.reviews.length ? `${due.reviews.length} 個到期` : "", due.fresh.length ? `${due.fresh.length} 個新字` : ""].filter(Boolean).join("・")
            : "今天的複習都完成了";
        $("btn-start-review").disabled = !due.all.length;
        Goals.render();
        if (App.current === "sec-more") updateStatistics();
    },

    refreshView() {
        if (App.current === "sec-books") renderBooksList();
        if (App.current === "sec-words") renderWordList();
        if (App.current === "sec-today") renderRecent();
        App.refreshCounts();
    },

    refreshAll() {
        refreshBookSelects();
        App.refreshView();
    }
};

Actions.go = (id) => App.go(id);
Actions.syncNow = () => Sync.run({ full: true });

// ---------- 語言 ----------
function applyLang() {
    const l = L();
    const root = document.documentElement;
    applyAccent();
    root.lang = S.lang === "fr" ? "fr" : "zh-TW";
    document.querySelectorAll("#lang-switch button").forEach(b => b.classList.toggle("on", b.dataset.arg === S.lang));
    $("wordmark-lang").textContent = l.name;
    $("today-title").innerHTML = S.lang === "fr" ? "Bonjour, <em>on révise ?</em>" : "Hello, <em>ready to review?</em>";
    $("today-date").textContent = new Date().toLocaleDateString("zh-TW", { month: "long", day: "numeric", weekday: "long" }) + " · " + l.label;
    ["books-lang", "dict-lang", "read-lang", "more-lang", "practice-lang"].forEach(id => { $(id).textContent = `${l.name} · ${l.label}`; });
    $("word-term").placeholder = l.placeholder;
    $("dict-search-input").placeholder = `輸入${l.label}單字`;
    document.querySelectorAll(".accent-keys").forEach(box => {
        if (box.closest("#sec-game-meteor")) return;
        box.innerHTML = l.accents.map(c => `<button type="button">${c}</button>`).join("");
        box.hidden = !l.accents.length;
    });
    refreshPosSelects();
    refreshBookSelects();
    refreshNewsOptions();
    refreshTransDirections();
    renderDictHistory();
    hide("dict-result-container");
    hide("trans-result-card");
}

Actions.switchLang = (lang) => {
    if (lang === S.lang || !LANGS[lang]) return;
    TTS.stop();
    Actions.closeQuickAdd();
    S.lang = lang;
    lsSet("vocab_lang", lang);
    S.articles = [];
    applyLang();
    const stay = ["sec-today", "sec-books", "sec-dict", "sec-read", "sec-more", "sec-class", "sec-practice"];
    App.go(stay.includes(App.current) ? App.current : "sec-today");
};

// ---------- 外觀 ----------
// 強調色：深色底改用較亮的版本
function applyAccent() {
    const l = L(), root = document.documentElement, dark = root.dataset.theme === "dark";
    root.style.setProperty("--accent", dark ? l.accentDark : l.accent);
    root.style.setProperty("--accent-soft", dark ? l.accentSoftDark : l.accentSoft);
}

// auto：跟著手機的深色模式切換「紙白」與「夜讀」
const darkQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

function applyTheme(name) {
    if (!THEMES[name]) name = "auto";
    const theme = name === "auto" ? (darkQuery && darkQuery.matches ? THEMES.night : THEMES.paper) : THEMES[name];
    document.documentElement.dataset.theme = theme === THEMES.night ? "dark" : "light";
    applyAccent();
    Object.entries(theme.vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
    document.querySelector('meta[name="theme-color"]').content = theme.vars["--bg"];
    lsSet("vocab_theme", name);
}

function applyFontSize(scale) {
    document.documentElement.style.setProperty("--font-scale", scale);
    lsSet("vocab_font", scale);
}

// ---------- 登入 / 登出 ----------
Actions.login = async () => {
    const name = $("login-username").value.trim();
    if (!name) { showToast("請輸入帳號", "error"); return; }
    if (API_URL.startsWith("PASTE_")) { UI.alert("尚未設定後端", "請先部署 GAS，並把網址填進 js/config.js 的 GAS_URL。"); return; }
    const btn = $("btn-login");
    setBusy(btn, true, "登入中…");
    try {
        S.user = name;
        const res = await Api.call("login");
        if (!res.apiVersion || res.apiVersion < MIN_API_VERSION) throw new ServerError("後端版本不符，請部署最新的 GAS.gs（見 README）");
        lsSet("vocab_user", name);
        enterApp(name, true);
    } catch (e) {
        S.user = null;
        UI.alert("無法登入", e instanceof ServerError ? e.message : "無法連線到伺服器，請檢查網路。");
    } finally {
        setBusy(btn, false);
    }
};

function enterApp(name, fresh) {
    Store.load(name);
    $("current-username-display").textContent = name;
    show("lang-switch");
    show("bottom-nav");
    applyLang();
    App.go("sec-today");
    Queue.updateBadge();
    Sync.run({ full: fresh || !S.lastSync, quiet: !fresh });
    Notify.schedule();
}

Actions.logout = async () => {
    const pending = Queue.size();
    const ok = await UI.confirm("登出", pending ? `還有 ${pending} 筆修改尚未同步，會保留在這台裝置，下次登入時補送。` : "", { okLabel: "登出" });
    if (!ok) return;
    lsSet("vocab_user", null);
    Actions.pauseRadio();
    Store.clear();
    hide("lang-switch");
    hide("bottom-nav");
    hide("sync-chip");
    $("wordmark-lang").textContent = "";
    $("login-username").value = "";
    App.go("sec-login");
};

// ---------- Service Worker 與版本更新 ----------
function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
    navigator.serviceWorker.register("sw.js").then(reg => {
        const offer = (worker) => showToast("有新版本", "success", 15000, { label: "更新", run: () => worker.postMessage("skipWaiting") });
        if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
        reg.addEventListener("updatefound", () => {
            const nw = reg.installing;
            nw.addEventListener("statechange", () => { if (nw.state === "installed" && navigator.serviceWorker.controller) offer(nw); });
        });
        setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    }).catch(err => console.warn("SW 註冊失敗", err));
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (!reloaded) { reloaded = true; location.reload(); } });
}

// ---------- 禁止縮放 ----------
// iPhone 會忽略 viewport 的 user-scalable=no，所以另外擋住雙指縮放（雙擊放大由 CSS touch-action 處理）
// 需要大字時改在「更多 → 外觀 → 字體大小」調整
function preventZoom() {
    document.addEventListener("gesturestart", (e) => e.preventDefault(), { passive: false });
    document.addEventListener("gesturechange", (e) => e.preventDefault(), { passive: false });
    document.addEventListener("touchmove", (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
}

// ---------- 初始化 ----------
// 清掉這台裝置上舊版單字 App 留下的資料。
// 同一個 GitHub Pages 網域上還有其他 App，所以只刪舊版用過的 key，不能全部清空。
const LEGACY_KEYS = ["vocabUser", "vocabTheme", "vocabFontScale", "dictSearchHistory", "notificationAsked"];
const LEGACY_PREFIXES = ["vp_", "vp3_", "vocabBooks_", "defaultBook_", "userFolders_", "collapsedFolders_"];

function removeLegacyData() {
    try {
        Object.keys(localStorage)
            .filter(k => LEGACY_KEYS.includes(k) || LEGACY_PREFIXES.some(p => k.startsWith(p)))
            .forEach(k => localStorage.removeItem(k));
        if (window.indexedDB) indexedDB.deleteDatabase("VocabProDB");
    } catch (e) { /* 無法存取時略過 */ }
}

(function init() {
    removeLegacyData();
    $("theme-select").innerHTML = Object.entries(THEMES).map(([k, t]) => `<option value="${k}">${esc(t.name)}</option>`).join("");
    const theme = lsGet("vocab_theme", "auto");
    $("theme-select").value = THEMES[theme] ? theme : "auto";
    applyTheme($("theme-select").value);
    const font = String(lsGet("vocab_font", "1"));
    $("font-size-select").value = font;
    applyFontSize(font);
    $("theme-select").addEventListener("change", e => applyTheme(e.target.value));
    if (darkQuery) {
        const follow = () => { if ($("theme-select").value === "auto") applyTheme("auto"); };
        if (darkQuery.addEventListener) darkQuery.addEventListener("change", follow); else darkQuery.addListener(follow);
    }
    $("font-size-select").addEventListener("change", e => applyFontSize(e.target.value));
    document.querySelectorAll("select.paras-select").forEach(sel => { sel.innerHTML = [1, 2, 3, 4, 5].map(n => `<option value="${n}">${n} 段</option>`).join(""); });
    $("app-version").textContent = APP_VERSION;

    $("new-per-day").addEventListener("change", (e) => {
        const n = Math.max(0, Math.min(500, parseInt(e.target.value, 10) || 0));
        e.target.value = n;
        Store.set({ newPerDay: n });
        App.refreshCounts();
        showToast(`每天最多 ${n} 個新字`);
    });

    // 每日目標
    [["goal-reviews", "reviews"], ["goal-words", "words"], ["goal-study", "study"]].forEach(([id, key]) => {
        $(id).addEventListener("change", (e) => {
            const n = Math.max(0, Math.min(500, parseInt(e.target.value, 10) || 0));
            e.target.value = n;
            Store.set({ goals: Object.assign(Goals.conf(), { [key]: n }) });
            Goals.render();
        });
    });

    registerServiceWorker();
    preventZoom();
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && S.user) Sync.run({ quiet: true }); });

    const user = lsGet("vocab_user", null);
    if (user) enterApp(user, false);
    else App.go("sec-login");
})();
