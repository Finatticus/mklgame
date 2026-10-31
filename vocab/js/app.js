// ===================== App 外殼：分頁、登入、主題、更新 =====================
const TITLES = {
    "sec-login": "Vocab Pro", "sec-add": "新增單字", "sec-books": "單字本總覽", "sec-dict": "字典查詢",
    "sec-games": "單字遊戲中心", "sec-custom": "自定義閱讀", "sec-settings": "設定與統計"
};

const App = {
    current: "sec-login",

    go(id, title) {
        if (id !== "sec-radio-player" && Radio.playing) Actions.pauseRadio();
        document.querySelectorAll("main > section").forEach(s => s.classList.toggle("active", s.id === id));
        document.querySelectorAll(".nav-item").forEach(n => n.classList.toggle("active", n.dataset.arg === id));
        $("header-title").textContent = title || TITLES[id] || "Vocab Pro";
        App.current = id;
        if (id !== "sec-words" && isManageMode) Actions.toggleManageMode();
        if (id === "sec-books") { renderBooksList(); App.refreshCounts(); }
        if (id === "sec-words") $("header-title").textContent = currentViewBook;
        if (id === "sec-custom") fetchCustomArticles();
        if (id === "sec-settings") { updateStatistics(); $("new-per-day").value = SRS.newPerDay(); Notify.updateButton(); }
        if (id === "sec-games") loadHighScores();
        window.scrollTo({ top: 0, behavior: "smooth" });
    },

    refreshCounts() {
        const due = SRS.dueList();
        $("btn-due-count").textContent = due.all.length;
        $("due-detail").textContent = due.all.length
            ? `到期 ${due.reviews.length} 個 · 新字 ${due.fresh.length} 個`
            : "今天的複習都完成了 🎉";
        if (App.current === "sec-settings") updateStatistics();
    },

    // 資料變動後重畫目前畫面
    refreshView() {
        if (App.current === "sec-books") renderBooksList();
        if (App.current === "sec-words") renderWordList();
        App.refreshCounts();
    },

    refreshAll() {
        refreshBookSelects();
        App.refreshView();
    }
};

Actions.go = (id) => App.go(id);
Actions.syncNow = () => Sync.run({ full: true });

// ---------- 主題與字體 ----------
function applyTheme(name) {
    const theme = THEMES[name] || THEMES.default;
    Object.entries(theme).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta && theme["--primary"]) meta.content = theme["--primary"];
    try { localStorage.setItem("vocabTheme", name); } catch (e) { /* 略過 */ }
}

function applyFontSize(scale) {
    document.documentElement.style.setProperty("--font-scale", scale);
    try { localStorage.setItem("vocabFontScale", scale); } catch (e) { /* 略過 */ }
}

// ---------- 登入 / 登出 ----------
Actions.login = async () => {
    const name = $("login-username").value.trim();
    if (!name) { showToast("請輸入帳號！", "error"); return; }
    const btn = $("btn-login");
    setBusy(btn, true, '<i class="fas fa-spinner fa-spin"></i> 驗證中...');
    try {
        S.user = name;
        const res = await Api.call("login");
        if (!res.apiVersion || res.apiVersion < API_VERSION) throw new ServerError("後端版本太舊，請先更新並重新部署 GAS（見 README）");
        try { localStorage.setItem("vocabUser", name); } catch (e) { /* 略過 */ }
        enterApp(name, true);
        showToast("登入成功！");
    } catch (e) {
        S.user = null;
        await UI.alert("登入失敗", e instanceof ServerError ? e.message : "無法連線到伺服器，請檢查網路。");
    } finally {
        setBusy(btn, false);
    }
};

function enterApp(name, fresh) {
    Store.load(name);
    $("current-username-display").textContent = name;
    show("user-info");
    show("bottom-nav");
    refreshBookSelects();
    App.go("sec-add");
    renderDictHistory();
    Queue.updateBadge();
    Sync.run({ full: fresh || !S.lastSync, quiet: !fresh });
    loadHighScores();
    Notify.schedule();
}

Actions.logout = async () => {
    const pending = Queue.size();
    const msg = pending ? `還有 ${pending} 筆修改尚未同步，登出後會保留在這台裝置，下次登入時補送。` : "";
    if (!(await UI.confirm("確定要登出嗎？", msg, { okLabel: "登出" }))) return;
    try { localStorage.removeItem("vocabUser"); } catch (e) { /* 略過 */ }
    Actions.pauseRadio();
    Store.clear();
    hide("user-info");
    hide("bottom-nav");
    $("login-username").value = "";
    App.go("sec-login");
};

// ---------- Service Worker 與版本更新 ----------
function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
    navigator.serviceWorker.register("sw.js").then(reg => {
        const offerUpdate = (worker) => {
            showToast("有新版本可以使用", "success", 15000, {
                label: "立即更新",
                run: () => worker.postMessage("skipWaiting")
            });
        };
        if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
        reg.addEventListener("updatefound", () => {
            const nw = reg.installing;
            nw.addEventListener("statechange", () => {
                if (nw.state === "installed" && navigator.serviceWorker.controller) offerUpdate(nw);
            });
        });
        setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    }).catch(err => console.warn("SW 註冊失敗", err));

    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloaded) return;
        reloaded = true;
        location.reload();
    });
}

// ---------- 初始化 ----------
(function init() {
    $("theme-select").innerHTML = Object.keys(THEMES).map(k => `<option value="${k}">${esc(THEME_NAMES[k] || k)}</option>`).join("");
    let savedTheme = "default", savedFont = "1";
    try {
        savedTheme = localStorage.getItem("vocabTheme") || "default";
        savedFont = localStorage.getItem("vocabFontScale") || "1";
    } catch (e) { /* 略過 */ }
    $("theme-select").value = THEMES[savedTheme] ? savedTheme : "default";
    applyTheme($("theme-select").value);
    $("font-size-select").value = savedFont;
    applyFontSize(savedFont);
    $("theme-select").addEventListener("change", e => applyTheme(e.target.value));
    $("font-size-select").addEventListener("change", e => applyFontSize(e.target.value));
    fillParasSelect($("news-sentences"), "/區塊");
    fillParasSelect($("custom-edit-paras"));
    $("app-version").textContent = "v" + APP_VERSION;

    $("new-per-day").addEventListener("change", (e) => {
        const n = Math.max(0, Math.min(500, parseInt(e.target.value, 10) || 0));
        e.target.value = n;
        Store.setSettings({ newPerDay: n });
        App.refreshCounts();
        showToast(`每日新字上限：${n}`);
    });

    registerServiceWorker();

    let user = null;
    try { user = localStorage.getItem("vocabUser"); } catch (e) { /* 略過 */ }
    if (user) enterApp(user, false);
    else App.go("sec-login");

    // 回到前景時補同步
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && S.user) Sync.run({ quiet: true });
    });
})();
