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

function dateKey(d = new Date()) {
    const x = new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

function fmtDateTime(ms) {
    const d = new Date(ms);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fmtInterval(days) {
    if (days < 1 / 24) return `${Math.max(1, Math.round(days * 1440))} 分鐘後`;
    if (days < 1) return `${Math.round(days * 24)} 小時後`;
    if (days < 30) return `${Math.round(days)} 天後`;
    if (days < 365) return `${Math.round(days / 30)} 個月後`;
    return `${(days / 365).toFixed(1)} 年後`;
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

function lsRemove(key) {
    try { localStorage.removeItem(key); } catch (e) { /* 無法存取時略過 */ }
}

// 把英文段落切成可點擊的單字
function makeClickable(text) {
    return String(text).split(/(\s+)/).map(part => {
        if (!part.trim()) return part;
        const m = part.match(/^([^A-Za-z]*)([A-Za-z][A-Za-z'\-]*[A-Za-z]|[A-Za-z])([^A-Za-z]*)$/);
        if (!m) return esc(part);
        return `${esc(m[1])}<span class="clickable-word" data-word="${esc(m[2])}">${esc(m[2])}</span>${esc(m[3])}`;
    }).join("");
}

function posClass(pos) {
    return "pos-" + String(pos || "").replace(".", "");
}

function fillPosSelect(select) {
    const empty = select.dataset.empty || "(無)";
    select.innerHTML = `<option value="">${esc(empty)}</option>` +
        POS_OPTIONS.map(([v, label]) => `<option value="${v}">${esc(label)}</option>`).join("");
}

function fillParasSelect(select, suffix) {
    select.innerHTML = [1, 2, 3, 4, 5].map(n => `<option value="${n}">${n} 段${suffix || ""}</option>`).join("");
}

function setBusy(btn, busy, html) {
    if (!btn) return;
    if (busy) {
        btn.dataset.orig = btn.innerHTML;
        btn.innerHTML = html || '<i class="fas fa-spinner fa-spin"></i>';
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

// ===================== Toast =====================
function showToast(message, type = "success", duration = 3000, action) {
    const toast = $("toast");
    const icon = type === "success" ? "fa-check-circle" : "fa-exclamation-triangle";
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${icon}"></i><span>${esc(message)}</span>`;
    if (action) {
        const btn = document.createElement("button");
        btn.className = "toast-action";
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
            if (input) {
                inp.value = input.value || "";
                inp.placeholder = input.placeholder || "";
            }
            const actions = $("dialog-actions");
            actions.innerHTML = "";
            buttons.forEach(b => {
                const btn = document.createElement("button");
                btn.className = b.cls || "btn-outline";
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
        return UI._open({ title, message, html, buttons: [{ label: "確定", value: true, cls: "btn-primary" }] });
    },

    confirm(title, message, { okLabel = "確定", danger = false } = {}) {
        return UI._open({
            title, message,
            buttons: [
                { label: "取消", value: false },
                { label: okLabel, value: true, cls: danger ? "btn-danger" : "btn-primary" }
            ]
        }).then(v => v === true);
    },

    prompt(title, { message = "", value = "", placeholder = "", okLabel = "確定" } = {}) {
        return UI._open({
            title, message, input: { value, placeholder },
            buttons: [
                { label: "取消", value: null },
                { label: okLabel, value: "__input__", cls: "btn-primary" }
            ]
        });
    },

    // options: [{label, value}]；extra: 額外加一個「新增…」之類的選項
    choose(title, options, { message = "" } = {}) {
        const html = `<div class="choice-list">${options.map((o, i) =>
            `<button data-choice="${i}">${esc(o.label)}</button>`).join("")}</div>`;
        const p = UI._open({ title, message, html, buttons: [{ label: "取消", value: null }] });
        $("dialog-body").querySelectorAll("[data-choice]").forEach(btn => {
            btn.onclick = () => UI._close(options[Number(btn.dataset.choice)].value);
        });
        return p;
    }
};

// ===================== 事件委派 =====================
// HTML 用 data-action="名稱" data-arg="參數"，各模組把處理函式註冊到 Actions
const Actions = {};

document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el || el.disabled) return;
    const fn = Actions[el.dataset.action];
    if (!fn) { console.warn("未註冊的動作", el.dataset.action); return; }
    if (el.tagName === "A") e.preventDefault();
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

Actions.closeModal = (id) => hide(id);
