// ===================== 小工具 =====================
const $ = (id) => document.getElementById(id);

function esc(value) {
    return String(value === undefined || value === null ? "" : value)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Fisher–Yates 洗牌（回傳新陣列）
function shuffle(list) {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

// 去掉重音符號，用於比對（é → e）
function foldAccents(s) {
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/œ/g, "oe").replace(/æ/g, "ae").toLowerCase();
}

function dateKey(d = new Date()) {
    const x = new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

function fmtDate(ms) {
    const d = new Date(ms);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fmtInterval(days) {
    if (days < 1 / 24) return `${Math.max(1, Math.round(days * 1440))} 分鐘`;
    if (days < 1) return `${Math.round(days * 24)} 小時`;
    if (days < 30) return `${Math.round(days)} 天`;
    if (days < 365) return `${Math.round(days / 30)} 個月`;
    return `${(days / 365).toFixed(1)} 年`;
}

function debounce(fn, ms) {
    let t = null;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// 限制同時進行的非同步工作數量
function limiter(max) {
    let active = 0;
    const waiting = [];
    const next = () => {
        if (active >= max || !waiting.length) return;
        active++;
        const { fn, resolve, reject } = waiting.shift();
        Promise.resolve().then(fn).then(resolve, reject).finally(() => { active--; next(); });
    };
    return (fn) => new Promise((resolve, reject) => { waiting.push({ fn, resolve, reject }); next(); });
}

function lsGet(key, fallback) {
    try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
}

function lsSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { console.warn("localStorage 寫入失敗", key, e); return false; }
}

const LETTER = "A-Za-zÀ-ÖØ-öø-ÿŒœÆæ";
const WORD_RE = new RegExp(`[${LETTER}]+(?:[-'’][${LETTER}]+)*`, "g");
const ELISION_RE = /^(l|d|j|qu|n|s|c|m|t|jusqu|lorsqu|puisqu)['’]/i;

// 把外語段落切成可點擊的單字；法文的 l'、d' 等縮寫會拆開
function makeClickable(text) {
    const src = String(text);
    let out = "";
    let last = 0;
    src.replace(WORD_RE, (m, offset) => {
        out += esc(src.slice(last, offset));
        let word = m;
        const el = m.match(ELISION_RE);
        if (el && m.length > el[0].length) {
            out += esc(el[0]);
            word = m.slice(el[0].length);
        }
        out += `<span class="cw" data-word="${esc(word)}">${esc(word)}</span>`;
        last = offset + m.length;
        return m;
    });
    return out + esc(src.slice(last));
}

function setBusy(btn, busy, html) {
    if (!btn) return;
    if (busy) {
        btn.dataset.orig = btn.innerHTML;
        btn.innerHTML = html || "…";
        btn.disabled = true;
    } else {
        if (btn.dataset.orig !== undefined) btn.innerHTML = btn.dataset.orig;
        btn.disabled = false;
    }
}

function show(id, visible = true) { const el = typeof id === "string" ? $(id) : id; if (el) el.hidden = !visible; }
function hide(id) { show(id, false); }

function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ===================== 提示訊息 =====================
function showToast(message, type = "success", duration = 2600, action) {
    const toast = $("toast");
    toast.className = "toast" + (type === "error" ? " error" : "");
    toast.innerHTML = `<span>${esc(message)}</span>`;
    if (action) {
        const btn = document.createElement("button");
        btn.textContent = action.label;
        btn.onclick = () => { toast.classList.remove("show"); action.run(); };
        toast.appendChild(btn);
        duration = Math.max(duration, 5000);
    }
    requestAnimationFrame(() => toast.classList.add("show"));
    clearTimeout(toast.timeoutId);
    toast.timeoutId = setTimeout(() => toast.classList.remove("show"), duration);
}

// ===================== 對話框（取代 alert / confirm / prompt） =====================
const UI = {
    _resolve: null,

    _open({ title, message = "", html = "", input = null, buttons }) {
        return new Promise(resolve => {
            if (UI._resolve) UI._resolve(null);
            UI._resolve = resolve;
            $("dialog-title").textContent = title || "";
            $("dialog-msg").textContent = message;
            $("dialog-msg").hidden = !message;
            $("dialog-body").innerHTML = html;
            const inp = $("dialog-input");
            inp.hidden = !input;
            if (input) { inp.value = input.value || ""; inp.placeholder = input.placeholder || ""; }
            const actions = $("dialog-actions");
            actions.innerHTML = "";
            buttons.forEach(b => {
                const btn = document.createElement("button");
                btn.className = "btn " + (b.cls || "");
                btn.textContent = b.label;
                btn.onclick = () => UI._close(b.value === "__input__" ? inp.value.trim() : b.value);
                actions.appendChild(btn);
            });
            show("dialog");
            if (input) setTimeout(() => { inp.focus(); inp.select(); }, 50);
        });
    },

    _close(value) {
        hide("dialog");
        const r = UI._resolve;
        UI._resolve = null;
        if (r) r(value);
    },

    alert(title, message, html) {
        return UI._open({ title, message, html, buttons: [{ label: "好", value: true, cls: "primary" }] });
    },

    confirm(title, message, { okLabel = "確定", danger = false } = {}) {
        return UI._open({
            title, message,
            buttons: [{ label: "取消", value: false }, { label: okLabel, value: true, cls: danger ? "danger solid" : "primary" }]
        }).then(v => v === true);
    },

    prompt(title, { message = "", value = "", placeholder = "", okLabel = "確定" } = {}) {
        return UI._open({
            title, message, input: { value, placeholder },
            buttons: [{ label: "取消", value: null }, { label: okLabel, value: "__input__", cls: "primary" }]
        });
    },

    choose(title, options, { message = "" } = {}) {
        const html = `<div class="choices">${options.map((o, i) => `<button data-choice="${i}">${esc(o.label)}</button>`).join("")}</div>`;
        const p = UI._open({ title, message, html, buttons: [{ label: "取消", value: null }] });
        $("dialog-body").querySelectorAll("[data-choice]").forEach(btn => {
            btn.onclick = () => UI._close(options[Number(btn.dataset.choice)].value);
        });
        return p;
    }
};

$("dialog").addEventListener("click", (e) => { if (e.target.id === "dialog") UI._close(null); });
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("dialog").hidden) UI._close(null);
    if (e.key === "Enter" && !$("dialog").hidden && e.target.id === "dialog-input") { e.preventDefault(); UI._close($("dialog-input").value.trim()); }
});

// ===================== 事件委派 =====================
// HTML 用 data-action="名稱" data-arg="參數"，各模組把處理函式註冊到 Actions
const Actions = {};

document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el || el.disabled) return;
    const fn = Actions[el.dataset.action];
    if (!fn) { console.warn("未註冊的動作", el.dataset.action); return; }
    e.stopPropagation();
    fn(el.dataset.arg, el, e);
});

document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.isComposing) return;
    const el = e.target.closest("[data-enter]");
    if (!el) return;
    e.preventDefault();
    const fn = Actions[el.dataset.enter];
    if (fn) fn(el.dataset.arg, el, e);
});

// 重音字母小鍵盤：<div class="accent-keys" data-target="輸入框 id">
document.addEventListener("mousedown", (e) => { if (e.target.closest(".accent-keys button")) e.preventDefault(); });
document.addEventListener("click", (e) => {
    const key = e.target.closest(".accent-keys button");
    if (!key) return;
    const input = $(key.parentElement.dataset.target);
    if (!input) return;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    input.value = input.value.slice(0, start) + key.textContent + input.value.slice(end);
    input.focus();
    input.setSelectionRange(start + 1, start + 1);
    input.dispatchEvent(new Event("input", { bubbles: true }));
});

Actions.closeModal = (id) => hide(id);
