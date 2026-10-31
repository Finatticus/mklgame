// ===================== 自動帶入（今日新增與快速新增共用） =====================
// 單字改了就重新查；只覆蓋「上一次自動帶入、使用者沒改過」的欄位
function makeAutoFill(ids) {
    const st = { term: "", auto: {}, token: 0, phonetic: "", senses: [] };
    const el = (k) => (ids[k] ? $(ids[k]) : null);

    const setAuto = (k, v, force) => {
        const f = el(k);
        if (!f) return;
        if (force || !f.value.trim() || f.value === (st.auto[k] || "")) f.value = v || "";
        st.auto[k] = v || "";
    };

    function renderSenses() {
        const box = el("senses");
        if (!box) return;
        const cur = el("meaning").value, curPos = el("pos").value;
        box.innerHTML = st.senses.map((s, i) =>
            `<button type="button" class="chip${s.meaning === cur && s.pos === curPos ? " on" : ""}" data-sense="${i}">${esc(s.pos)} <small>${esc(s.meaning)}</small></button>`).join("");
        box.hidden = st.senses.length < 2;
    }

    function setHint(html) {
        const h = el("hint");
        if (!h) return;
        h.innerHTML = html;
        h.hidden = !html;
    }

    async function run(force) {
        const term = Words.normalize(el("term").value);
        if (ids.dup) checkDuplicate(ids.term, ids.book, ids.dup);
        if (!term) {
            ["meaning", "pos", "example"].forEach(k => setAuto(k, ""));
            st.term = ""; st.senses = []; st.phonetic = "";
            renderSenses(); setHint("");
            return;
        }
        if (term === st.term && !force) return;
        st.term = term;
        const token = ++st.token;
        const m = el("meaning");
        m.placeholder = "查詢中…";
        const info = await Svc.lookup(term);
        if (token !== st.token) return;
        m.placeholder = "中文意思";
        setAuto("meaning", info.meaning);
        setAuto("pos", info.pos);
        setAuto("example", "");
        st.phonetic = info.phonetic || "";
        st.senses = info.senses || [];
        renderSenses();
        setHint(info.lemma ? `這是 <b>${esc(info.lemma)}</b> 的變化形。<button class="link" type="button" data-use-lemma="${esc(info.lemma)}">改用原形</button>` : "");
    }

    // 外部帶入初始值（字典、AI 單字包），之後改單字時這些值也會被換掉
    function prime(term, values) {
        st.term = Words.normalize(term);
        st.token++;
        st.senses = [];
        st.phonetic = values.phonetic || "";
        ["meaning", "pos", "example"].forEach(k => { const f = el(k); if (f) f.value = values[k] || ""; st.auto[k] = values[k] || ""; });
        renderSenses(); setHint("");
    }

    function applyAi(r) {
        if (r.term && Words.normalize(r.term) !== st.term) {
            el("term").value = r.term;
            st.term = Words.normalize(r.term);
            showToast(`已修正拼字為「${r.term}」`);
        }
        setAuto("meaning", r.meaning, true);
        setAuto("pos", r.pos, true);
        if (r.example) setAuto("example", r.example);
        renderSenses();
        if (ids.dup) checkDuplicate(ids.term, ids.book, ids.dup);
    }

    el("term").addEventListener("input", debounce(() => run(), 700));
    el("term").addEventListener("blur", () => run());
    if (ids.book && ids.dup) el("book").addEventListener("change", () => checkDuplicate(ids.term, ids.book, ids.dup));
    if (el("senses")) el("senses").addEventListener("click", (e) => {
        const b = e.target.closest("[data-sense]");
        if (!b) return;
        const s = st.senses[Number(b.dataset.sense)];
        el("meaning").value = s.meaning; st.auto.meaning = s.meaning;
        el("pos").value = s.pos; st.auto.pos = el("pos").value;
        renderSenses();
    });
    if (el("hint")) el("hint").addEventListener("click", (e) => {
        const b = e.target.closest("[data-use-lemma]");
        if (!b) return;
        el("term").value = b.dataset.useLemma;
        run(true);
    });
    el("meaning").addEventListener("input", renderSenses);
    el("pos").addEventListener("change", renderSenses);

    return { run, prime, applyAi, reset: () => prime("", {}), get phonetic() { return st.phonetic; } };
}

// AI 校對：用 AI（Claude 或 Gemini）取得最常用的意思、詞性與例句
Actions.aiProofread = async (which, btn) => {
    const form = which === "qa" ? QuickAdd.fill : AddForm;
    const termId = which === "qa" ? "qa-term" : "word-term";
    const term = Words.normalize($(termId).value);
    if (!term) { showToast("請先輸入單字", "error"); return; }
    setBusy(btn, true, "校對中…");
    try {
        form.applyAi(await Svc.aiLookup(term));
        if (which !== "qa") $("add-more").classList.add("open");
        showToast("已用 AI 校對");
    } catch (e) {
        showToast("AI 校對失敗：" + e.message, "error", 4000);
    } finally {
        setBusy(btn, false);
    }
};

// ===================== 今日：新增單字 =====================
const AddForm = makeAutoFill({
    term: "word-term", meaning: "word-meaning", pos: "word-pos", example: "word-example",
    book: "word-book", dup: "word-dup-warn", senses: "word-senses", hint: "word-hint"
});

Actions.toggleAddMore = (arg, btn) => {
    const box = $("add-more");
    box.classList.toggle("open");
    btn.querySelector("i").className = box.classList.contains("open") ? "icon-chevron-up" : "icon-chevron-down";
};

function checkDuplicate(termId, bookId, warnId) {
    const term = Words.normalize($(termId).value);
    const book = $(bookId).value;
    const warn = $(warnId);
    const dup = Words.findDuplicate(term, book);
    const elsewhere = dup ? [] : Words.findAnywhere(term).filter(w => w.book !== book);
    if (dup) warn.textContent = `「${dup.term}」已經在「${book}」裡（${dup.meaning}）`;
    else if (elsewhere.length) warn.textContent = `這個字已在「${elsewhere.map(w => w.book).join("、")}」中`;
    warn.hidden = !dup && !elsewhere.length;
    return dup;
}

async function confirmDuplicate(term, book) {
    if (!Words.findDuplicate(term, book)) return true;
    return UI.confirm("已經有這個字了", `「${term}」已在「${book}」裡，還要再新增一筆嗎？`, { okLabel: "仍要新增" });
}

Actions.saveWord = async () => {
    const book = $("word-book").value || Store.defaultBook();
    const term = Words.normalize($("word-term").value);
    const meaning = $("word-meaning").value.trim();
    if (!term || !meaning) { showToast("請填寫單字與中文意思", "error"); return; }
    if (!(await confirmDuplicate(term, book))) return;
    Words.add([{ book, term, meaning, notes: $("word-notes").value, pos: $("word-pos").value, example: $("word-example").value, phonetic: AddForm.phonetic }]);
    showToast(`已加入「${book}」`);
    ["word-term", "word-notes"].forEach(id => { $(id).value = ""; });
    AddForm.reset();
    hide("word-dup-warn");
    renderRecent();
    $("word-term").focus();
};

function renderRecent() {
    const list = [...Words.active()].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 6);
    $("recent-list").innerHTML = list.length
        ? `<div class="list">${list.map(w => `
            <div class="list-row" data-open-word="${esc(w.id)}">
                <div class="grow"><span class="serif" style="font-size:1.1rem;">${esc(w.term)}</span> <span class="small">${posLabel(w.pos)}</span></div>
                <div class="meta" style="max-width:50%; overflow:hidden; text-overflow:ellipsis;">${esc(w.meaning)}</div>
            </div>`).join("")}</div>`
        : `<div class="empty"><div class="serif">還沒有單字</div>從上面加入第一個字吧。</div>`;
}

$("recent-list").addEventListener("click", (e) => {
    const row = e.target.closest("[data-open-word]");
    const w = row && Words.byId(row.dataset.openWord);
    if (w) openBook(w.book, w.term);
});

// ===================== 快速新增面板（字典、翻譯、新聞、文章、AI 單字包共用） =====================
const QuickAdd = {
    fill: makeAutoFill({
        term: "qa-term", meaning: "qa-meaning", pos: "qa-pos", example: "qa-example",
        book: "qa-book", dup: "qa-dup-warn", senses: "qa-senses", hint: "qa-hint"
    }),

    // lookup=false：呼叫端已提供意思（字典、AI 單字包），不再重查
    open(term, { meaning = "", notes = "", pos = "", phonetic = "", example = "", lookup = true } = {}) {
        term = Words.normalize(term);
        if (!term) return;
        refreshBookSelects();
        $("qa-book").value = $("word-book").value || Store.defaultBook();
        $("qa-term").value = term;
        $("qa-notes").value = notes;
        QuickAdd.fill.prime(term, { meaning, pos, example, phonetic });
        show("quick-add");
        checkDuplicate("qa-term", "qa-book", "qa-dup-warn");
        if (lookup) QuickAdd.fill.run(true);
    }
};

Actions.closeQuickAdd = () => { hide("quick-add"); document.querySelectorAll(".cw.hl").forEach(x => x.classList.remove("hl")); };
Actions.speakQuickAdd = () => TTS.say($("qa-term").value);

Actions.saveQuickAdd = async () => {
    const term = Words.normalize($("qa-term").value);
    const meaning = $("qa-meaning").value.trim();
    const book = $("qa-book").value || Store.defaultBook();
    if (!term || !meaning) { showToast("請填寫單字與中文意思", "error"); return; }
    if (!(await confirmDuplicate(term, book))) return;
    Words.add([{ book, term, meaning, notes: $("qa-notes").value, pos: $("qa-pos").value, example: $("qa-example").value, phonetic: QuickAdd.fill.phonetic }]);
    showToast(`已加入「${book}」`);
    Actions.closeQuickAdd();
};

// 文章裡的單字點了就開快速新增
document.addEventListener("click", (e) => {
    const el = e.target.closest(".cw");
    if (!el) return;
    document.querySelectorAll(".cw.hl").forEach(x => x.classList.remove("hl"));
    el.classList.add("hl");
    TTS.say(el.dataset.word);
    QuickAdd.open(el.dataset.word);
});

// ===================== 拍照辨識 =====================
const OCR = {
    selected: new Set(),
    workers: {},

    async worker(lang) {
        if (OCR.workers[lang]) return OCR.workers[lang];
        if (!window.Tesseract) {
            await new Promise((resolve, reject) => {
                const s = document.createElement("script");
                s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
                s.onload = resolve; s.onerror = () => reject(new Error("無法載入辨識元件"));
                document.head.appendChild(s);
            });
        }
        OCR.workers[lang] = await Tesseract.createWorker(LANGS[lang].ocr);
        return OCR.workers[lang];
    }
};

async function handleOCR(event) {
    const file = event.target.files[0];
    if (!file) return;
    show("ocr-modal"); show("ocr-loading"); hide("ocr-results"); hide("ocr-actions");
    $("ocr-modal-title").textContent = "辨識中";
    $("ocr-modal-desc").textContent = "第一次使用需要下載辨識元件，請稍候。";
    try {
        const worker = await OCR.worker(S.lang);
        const ret = await worker.recognize(file);
        const words = [...new Set((ret.data.text.match(WORD_RE) || []).filter(w => w.length > 1)
            .map(w => w.replace(ELISION_RE, "").toLowerCase()).filter(w => w.length > 1))];
        renderOCRSelection(words);
    } catch (err) {
        console.error(err);
        showToast("圖片辨識失敗", "error");
        Actions.closeOCRModal();
    }
}

function renderOCRSelection(words) {
    hide("ocr-loading");
    OCR.selected.clear();
    $("ocr-selected-count").textContent = "0";
    show("ocr-actions");
    if (!words.length) { $("ocr-modal-desc").textContent = "沒有找到單字。"; return; }
    $("ocr-modal-title").textContent = "選擇要加入的單字";
    $("ocr-modal-desc").textContent = `找到 ${words.length} 個字，淡色的是已經收錄的。`;
    const box = $("ocr-results");
    box.innerHTML = words.map(w => `<button class="chip${Words.findAnywhere(w).length ? " dim" : ""}" data-ocr="${esc(w)}">${esc(w)}</button>`).join("");
    box.onclick = (e) => {
        const chip = e.target.closest("[data-ocr]");
        if (!chip) return;
        const w = chip.dataset.ocr;
        if (OCR.selected.has(w)) OCR.selected.delete(w); else OCR.selected.add(w);
        chip.classList.toggle("on");
        $("ocr-selected-count").textContent = OCR.selected.size;
    };
    show(box);
}

Actions.closeOCRModal = () => { hide("ocr-modal"); $("ocr-upload").value = ""; };

Actions.processBatchAddOCR = async (arg, btn) => {
    if (!OCR.selected.size) { showToast("請至少選擇一個字", "error"); return; }
    const book = $("word-book").value || Store.defaultBook();
    setBusy(btn, true, "翻譯中…");
    const run = limiter(4);
    const results = await Promise.all([...OCR.selected].map(term => run(async () => {
        const info = await Svc.lookup(term);
        return info.meaning ? { book, term, meaning: info.meaning, pos: info.pos, phonetic: info.phonetic, notes: "拍照加入" } : null;
    })));
    setBusy(btn, false);
    const added = Words.add(results.filter(Boolean).filter(w => !Words.findDuplicate(w.term, book)));
    showToast(`已加入 ${added.length} 個字`);
    renderRecent();
    Actions.closeOCRModal();
};

// ===================== 單字本 =====================
let isCompactView = lsGet("vocab_compact", false);
let isBookReorderMode = false;
let currentViewBook = "";

function refreshBookSelects() {
    const books = Store.books().filter(b => b !== TRASH_BOOK);
    const def = Store.defaultBook();
    document.querySelectorAll("select.book-select").forEach(sel => {
        const prev = sel.value;
        sel.innerHTML = books.map(b => `<option value="${esc(b)}">${esc(b)}</option>`).join("");
        sel.value = books.includes(prev) ? prev : def;
    });
    $("book-select").value = def;
}

function refreshPosSelects() {
    document.querySelectorAll("select.pos-select").forEach(sel => {
        const prev = sel.value;
        sel.innerHTML = `<option value="">${esc(sel.dataset.empty || "無")}</option>` +
            L().pos.map(([v, label]) => `<option value="${esc(v)}">${esc(v)} ${esc(label)}</option>`).join("");
        sel.value = L().pos.some(p => p[0] === prev) ? prev : "";
    });
}

function renderBooksList() {
    const books = Store.books();
    const counts = {};
    Words.all().forEach(w => { counts[w.book] = (counts[w.book] || 0) + 1; });
    $("books-list").innerHTML = books.map(book => {
        const movable = isBookReorderMode && book !== TRASH_BOOK;
        return `<div class="list-row${isBookReorderMode ? " static" : ""}" data-book="${esc(book)}" ${movable ? 'draggable="true"' : ""}>
            ${movable ? '<i class="icon-grip-vertical drag-handle"></i>' : ""}
            <div class="grow title"${book === TRASH_BOOK ? ' style="color:var(--muted)"' : ""}>${esc(book)}</div>
            <span class="meta">${counts[book] || 0}</span>
            ${isBookReorderMode ? "" : '<i class="icon-chevron-right chev"></i>'}
        </div>`;
    }).join("");
    if (isBookReorderMode) bindBookDrag($("books-list"));
}

$("books-list").addEventListener("click", (e) => {
    if (isBookReorderMode) return;
    const row = e.target.closest("[data-book]");
    if (row) openBook(row.dataset.book);
});

Actions.toggleBookReorderMode = () => {
    isBookReorderMode = !isBookReorderMode;
    $("book-reorder-btn").innerHTML = isBookReorderMode ? '<i class="icon-check"></i> 完成' : '<i class="icon-grip-vertical"></i> 調整順序';
    renderBooksList();
};

function moveBookTo(src, dest) {
    const books = Store.books().filter(b => b !== TRASH_BOOK);
    const from = books.indexOf(src), to = books.indexOf(dest);
    if (from < 0 || to < 0 || from === to) return;
    books.splice(from, 1);
    books.splice(to, 0, src);
    Store.saveBookOrder(books);
    refreshBookSelects();
    renderBooksList();
}

function bindBookDrag(list) {
    let dragSrc = null;
    const clear = () => list.querySelectorAll(".drop-target").forEach(x => x.classList.remove("drop-target"));
    list.querySelectorAll('[draggable="true"]').forEach(el => {
        el.addEventListener("dragstart", (e) => { dragSrc = el.dataset.book; e.dataTransfer.effectAllowed = "move"; el.style.opacity = "0.4"; });
        el.addEventListener("dragend", () => { el.style.opacity = ""; clear(); });
        el.addEventListener("dragover", (e) => { e.preventDefault(); clear(); el.classList.add("drop-target"); });
        el.addEventListener("drop", (e) => { e.preventDefault(); clear(); if (dragSrc) moveBookTo(dragSrc, el.dataset.book); });
        const handle = el.querySelector(".drag-handle");
        handle.addEventListener("touchstart", () => { dragSrc = el.dataset.book; el.style.opacity = "0.4"; }, { passive: true });
        handle.addEventListener("touchmove", (e) => {
            e.preventDefault();
            const t = e.targetTouches[0];
            const target = document.elementFromPoint(t.clientX, t.clientY);
            clear();
            const row = target && target.closest('[draggable="true"]');
            if (row && row !== el) row.classList.add("drop-target");
        }, { passive: false });
        handle.addEventListener("touchend", (e) => {
            el.style.opacity = "";
            const t = e.changedTouches[0];
            const target = document.elementFromPoint(t.clientX, t.clientY);
            clear();
            const row = target && target.closest('[draggable="true"]');
            if (row && dragSrc) moveBookTo(dragSrc, row.dataset.book);
            dragSrc = null;
        });
    });
}

Actions.addNewBook = async () => {
    const name = await UI.prompt("新單字本", { placeholder: "名稱" });
    if (!name) return;
    if (name === TRASH_BOOK || Store.books().includes(name)) { showToast("這個名稱已經用過了", "error"); return; }
    Store.saveBookOrder([...Store.books(), name]);
    refreshBookSelects();
    renderBooksList();
};

$("book-select").addEventListener("change", (e) => {
    Store.set({ defaultBook: e.target.value });
    refreshBookSelects();
    showToast("已更新預設單字本");
});

$("global-search").addEventListener("input", debounce(() => {
    const q = $("global-search").value.trim().toLowerCase();
    const box = $("global-search-results");
    if (!q) { hide(box); show("books-list"); return; }
    const fq = foldAccents(q);
    const hits = Words.all().filter(w => foldAccents(w.term).includes(fq) || w.meaning.toLowerCase().includes(q)).slice(0, 50);
    box.innerHTML = hits.length
        ? `<div class="list">${hits.map(w => `<div class="list-row" data-open-word="${esc(w.id)}">
            <div class="grow"><span class="serif">${esc(w.term)}</span> <span class="small muted">${esc(w.meaning)}</span></div>
            <span class="meta">${esc(w.book)}</span></div>`).join("")}</div>`
        : '<p class="muted small">沒有找到。</p>';
    show(box);
    hide("books-list");
}, 200));

$("global-search-results").addEventListener("click", (e) => {
    const row = e.target.closest("[data-open-word]");
    const w = row && Words.byId(row.dataset.openWord);
    if (!w) return;
    $("global-search").value = "";
    hide("global-search-results"); show("books-list");
    openBook(w.book, w.term);
});

// ===================== 單字本內容 =====================
let wordSortOrder = "desc";
let isManageMode = false;
const selectedWords = new Set();

function openBook(bookName, search = "") {
    currentViewBook = bookName;
    wordSortOrder = "desc";
    $("book-search").value = search;
    if (isManageMode) Actions.toggleManageMode();
    App.go("sec-words");
    updateSortButton();
    renderWordList();
}

Actions.backToBook = () => openBook(currentViewBook);

function updateSortButton() {
    $("sort-order-btn").innerHTML = wordSortOrder === "desc" ? '<i class="icon-arrow-down"></i>' : '<i class="icon-arrow-up"></i>';
    $("sort-order-btn").title = wordSortOrder === "desc" ? "新的在前" : "舊的在前";
    $("btn-compact").style.color = isCompactView ? "var(--ink)" : "";
}

Actions.toggleWordSortOrder = () => {
    wordSortOrder = wordSortOrder === "desc" ? "asc" : "desc";
    updateSortButton();
    renderWordList();
};

Actions.toggleCompactView = () => {
    isCompactView = !isCompactView;
    lsSet("vocab_compact", isCompactView);
    updateSortButton();
    renderWordList();
};

$("book-search").addEventListener("input", debounce(() => renderWordList(), 200));

function sortedBookWords() {
    const q = $("book-search").value.trim().toLowerCase();
    let list = Words.inBook(currentViewBook);
    if (q) {
        const fq = foldAccents(q);
        list = list.filter(w => foldAccents(w.term).includes(fq) || w.meaning.toLowerCase().includes(q) || (w.notes || "").toLowerCase().includes(q));
    }
    const ts = (w) => { const t = new Date(w.timestamp).getTime(); return isNaN(t) ? 0 : t; };
    const indexed = list.map((w, i) => ({ w, i }));
    indexed.sort((a, b) => {
        const d = ts(a.w) - ts(b.w) || a.i - b.i;
        return wordSortOrder === "desc" ? -d : d;
    });
    return indexed.map(x => x.w);
}

function renderWordList() {
    const list = $("words-list");
    const words = sortedBookWords();
    $("words-title").textContent = currentViewBook;
    $("words-count").textContent = `${Words.inBook(currentViewBook).length} 個字`;
    list.className = (isManageMode ? "managing " : "") + (isCompactView ? "compact" : "");
    if (!words.length) {
        list.innerHTML = `<div class="empty"><div class="serif">${$("book-search").value ? "沒有找到" : "這本還是空的"}</div></div>`;
        return;
    }
    list.innerHTML = `<div class="list">${words.map(w => `
        <div class="word" data-wid="${esc(w.id)}">
            <div class="word-top">
                <input type="checkbox" class="select-box" data-select="${esc(w.id)}" ${selectedWords.has(w.id) ? "checked" : ""}>
                <div class="grow">
                    <div class="word-term">${esc(w.term)}</div>
                    <div class="word-sub">${posLabel(w.pos)}${w.phonetic || w.lang === "en" ? `<span class="phon" data-phon="${esc(w.id)}">${esc(w.phonetic)}</span>` : ""}</div>
                    <div class="word-meaning">${esc(w.meaning)}</div>
                </div>
                <div class="word-actions">
                    <button class="icon-btn" data-word-act="speak" title="發音"><i class="icon-volume-2"></i></button>
                    <button class="icon-btn" data-word-act="edit" title="編輯"><i class="icon-pencil"></i></button>
                    <button class="icon-btn danger" data-word-act="delete" title="刪除"><i class="icon-trash-2"></i></button>
                </div>
            </div>
            ${w.notes ? `<div class="word-note">${esc(w.notes)}</div>` : ""}
            ${w.example ? `<div class="word-note example">${esc(w.example)}</div>` : ""}
            <div class="word-more"><button class="link muted small" data-word-act="expand">字典 <i class="icon-chevron-down"></i></button></div>
            <div class="word-detail" hidden></div>
        </div>`).join("")}</div>`;
    Phon.fillVisible(list);
}

$("words-list").addEventListener("click", (e) => {
    const cb = e.target.closest("[data-select]");
    if (cb) {
        if (cb.checked) selectedWords.add(cb.dataset.select); else selectedWords.delete(cb.dataset.select);
        $("manage-count").textContent = selectedWords.size;
        return;
    }
    const btn = e.target.closest("[data-word-act]");
    if (!btn) return;
    const row = btn.closest("[data-wid]");
    const w = Words.byId(row.dataset.wid);
    if (!w) return;
    const act = btn.dataset.wordAct;
    if (act === "speak") TTS.say(w.term);
    else if (act === "edit") openEditModal(w.id);
    else if (act === "delete") deleteWord(w.id);
    else if (act === "expand") {
        const box = row.querySelector(".word-detail");
        box.hidden = !box.hidden;
        btn.querySelector("i").className = box.hidden ? "icon-chevron-down" : "icon-chevron-up";
        if (!box.hidden && !box.dataset.loaded) { box.dataset.loaded = "1"; renderDictEntry(w.term, box, { compact: true }); }
    }
});

// ===================== 編輯 / 刪除 =====================
function openEditModal(id) {
    const w = Words.byId(id);
    if (!w) return;
    refreshBookSelects();
    $("edit-id").value = id;
    $("edit-word-term").value = w.term;
    $("edit-word-meaning").value = w.meaning;
    $("edit-word-notes").value = w.notes || "";
    $("edit-word-example").value = w.example || "";
    $("edit-word-pos").value = L().pos.some(p => p[0] === w.pos) ? w.pos : "";
    const bookSel = $("edit-word-book");
    if (w.book === TRASH_BOOK) bookSel.add(new Option(TRASH_BOOK, TRASH_BOOK));
    bookSel.value = w.book;
    hide("edit-ai-result");
    show("edit-word-modal");
}

// AI 檢查自己寫的例句（文法、拼字、重音、自然度）
Actions.aiCheckExample = async (arg, btn) => {
    const term = $("edit-word-term").value.trim();
    const sentence = $("edit-word-example").value.trim();
    if (!sentence) { showToast("請先寫一個例句", "error"); return; }
    setBusy(btn, true, "檢查中…");
    const box = $("edit-ai-result");
    try {
        const r = await Svc.aiCheckSentence(term, sentence);
        box.innerHTML = r.ok
            ? `<div class="verdict good">正確</div><div class="small muted">${esc(r.translation || "")}</div>`
            : `<div class="verdict warn">建議修改</div>
               <div class="serif">${esc(r.corrected || "")}</div>
               <div class="small muted mt-8">${esc(r.translation || "")}</div>
               <div class="small mt-8">${esc(r.explanation || "")}</div>
               <button class="link small mt-8" type="button" data-apply-example="${esc(r.corrected || "")}">套用修改</button>`;
        show(box);
    } catch (e) {
        showToast("AI 檢查失敗：" + e.message, "error", 4000);
    } finally {
        setBusy(btn, false);
    }
};

Actions.aiSuggestExample = async (arg, btn) => {
    const term = Words.normalize($("edit-word-term").value);
    if (!term) return;
    setBusy(btn, true, "產生中…");
    try {
        const r = await Svc.aiLookup(term);
        if (r.example) {
            $("edit-word-example").value = r.example;
            $("edit-ai-result").innerHTML = `<div class="small muted">${esc(r.exampleZh || "")}</div>`;
            show("edit-ai-result");
        }
    } catch (e) {
        showToast("AI 產生失敗：" + e.message, "error", 4000);
    } finally {
        setBusy(btn, false);
    }
};

$("edit-ai-result").addEventListener("click", (e) => {
    const b = e.target.closest("[data-apply-example]");
    if (!b) return;
    $("edit-word-example").value = b.dataset.applyExample;
    hide("edit-ai-result");
});

Actions.saveEditWord = () => {
    const id = $("edit-id").value;
    const w = Words.byId(id);
    if (!w) return;
    const fields = {
        term: Words.normalize($("edit-word-term").value),
        meaning: $("edit-word-meaning").value.trim(),
        pos: $("edit-word-pos").value,
        notes: $("edit-word-notes").value.trim(),
        example: $("edit-word-example").value.trim(),
        book: $("edit-word-book").value
    };
    if (!fields.term || !fields.meaning) { showToast("單字與中文意思不可空白", "error"); return; }
    const termChanged = fields.term !== w.term;
    if (termChanged) fields.phonetic = "";
    Words.update([{ id, fields }]);
    hide("edit-word-modal");
    showToast("已儲存");
    if (termChanged) Phon.ensure(w);
    App.refreshView();
};

async function deleteWord(id) {
    const w = Words.byId(id);
    if (!w) return;
    if (w.book === TRASH_BOOK) {
        if (!(await UI.confirm("永久刪除", `「${w.term}」刪除後無法復原。`, { okLabel: "刪除", danger: true }))) return;
        Words.remove([id]);
    } else {
        const oldBook = w.book;
        Words.update([{ id, fields: { book: TRASH_BOOK } }]);
        showToast("已移到垃圾桶", "success", 5000, { label: "復原", run: () => { Words.update([{ id, fields: { book: oldBook } }]); App.refreshView(); } });
    }
    App.refreshView();
}

Actions.deleteCurrentBook = async () => {
    const book = currentViewBook;
    if (book === DEFAULT_BOOK) { showToast("預設單字本不能刪除", "error"); return; }
    const count = Words.inBook(book).length;
    const isTrash = book === TRASH_BOOK;
    const ok = await UI.confirm(isTrash ? "清空垃圾桶" : `刪除「${book}」`,
        isTrash ? `${count} 個字會永久刪除。` : `裡面的 ${count} 個字會一起永久刪除，無法復原。`, { okLabel: "刪除", danger: true });
    if (!ok) return;
    S.words = S.words.filter(w => !(w.lang === S.lang && w.book === book));
    Store.saveWords();
    Queue.push("deleteBook", { lang: S.lang, book });
    if (!isTrash) {
        Store.saveBookOrder(Store.books().filter(b => b !== book));
        if (Store.get("defaultBook") === book) Store.set({ defaultBook: DEFAULT_BOOK });
    }
    refreshBookSelects();
    App.go("sec-books");
};

Actions.renameCurrentBook = async () => {
    const oldBook = currentViewBook;
    if (oldBook === DEFAULT_BOOK || oldBook === TRASH_BOOK) { showToast("這本不能改名", "error"); return; }
    const name = await UI.prompt("重新命名", { value: oldBook });
    if (!name || name === oldBook) return;
    if (name === TRASH_BOOK || Store.books().includes(name)) { showToast("這個名稱已經用過了", "error"); return; }
    Words.update(Words.inBook(oldBook).map(w => ({ id: w.id, fields: { book: name } })));
    Store.saveBookOrder(Store.books().map(b => b === oldBook ? name : b));
    if (Store.get("defaultBook") === oldBook) Store.set({ defaultBook: name });
    refreshBookSelects();
    openBook(name);
};

// ===================== 批次管理 =====================
Actions.toggleManageMode = () => {
    isManageMode = !isManageMode;
    selectedWords.clear();
    show("manage-action-bar", isManageMode);
    $("manage-count").textContent = "0";
    renderWordList();
};

Actions.selectAllWords = () => {
    const ids = sortedBookWords().map(w => w.id);
    const all = ids.every(id => selectedWords.has(id));
    ids.forEach(id => { if (all) selectedWords.delete(id); else selectedWords.add(id); });
    $("manage-count").textContent = selectedWords.size;
    renderWordList();
};

Actions.moveSelectedWords = async () => {
    if (!selectedWords.size) return;
    const options = Store.books().filter(b => b !== currentViewBook && b !== TRASH_BOOK).map(b => ({ label: b, value: b }));
    options.push({ label: "＋ 新單字本…", value: "__new__" });
    let target = await UI.choose(`搬移 ${selectedWords.size} 個字到`, options);
    if (!target) return;
    if (target === "__new__") {
        target = await UI.prompt("新單字本名稱");
        if (!target || target === TRASH_BOOK) return;
        if (!Store.books().includes(target)) Store.saveBookOrder([...Store.books(), target]);
    }
    const count = selectedWords.size;
    Words.update([...selectedWords].map(id => ({ id, fields: { book: target } })));
    refreshBookSelects();
    Actions.toggleManageMode();
    showToast(`已搬移 ${count} 個字到「${target}」`);
};

Actions.deleteSelectedWords = async () => {
    if (!selectedWords.size) return;
    const ids = [...selectedWords];
    if (currentViewBook === TRASH_BOOK) {
        if (!(await UI.confirm("永久刪除", `${ids.length} 個字刪除後無法復原。`, { okLabel: "刪除", danger: true }))) return;
        Words.remove(ids);
    } else {
        const oldBook = currentViewBook;
        Words.update(ids.map(id => ({ id, fields: { book: TRASH_BOOK } })));
        showToast(`已將 ${ids.length} 個字移到垃圾桶`, "success", 5000, {
            label: "復原", run: () => { Words.update(ids.map(id => ({ id, fields: { book: oldBook } }))); App.refreshView(); }
        });
    }
    Actions.toggleManageMode();
};

// ===================== 造句 / 複習時間表 =====================
Actions.openSentenceMaker = () => {
    const words = Words.inBook(currentViewBook).filter(w => !(w.example || "").trim() && w.pos !== "sent.");
    $("sentence-list").innerHTML = words.length
        ? words.map(w => `<div class="list-row" data-action="editWord" data-arg="${esc(w.id)}">
            <div class="grow"><span class="serif" style="font-size:1.1rem;">${esc(w.term)}</span> <span class="small muted">${esc(w.meaning)}</span></div>
            <span class="link">寫句子</span></div>`).join("")
        : '<div class="empty"><div class="serif">都寫好了</div>這本的每個字都有例句。</div>';
    App.go("sec-sentence-maker");
};

Actions.editWord = (id) => openEditModal(id);

Actions.openSrsList = () => {
    const now = Date.now();
    const sorted = Words.active().sort((a, b) => (a.nextReviewTime || Infinity) - (b.nextReviewTime || Infinity));
    $("srs-table").innerHTML = sorted.length ? sorted.map(w => {
        const overdue = w.nextReviewTime && w.nextReviewTime <= now;
        const when = w.nextReviewTime ? (overdue ? "已到期" : fmtDate(w.nextReviewTime)) : "新字";
        return `<div class="list-row static">
            <div class="grow"><span class="serif">${esc(w.term)}</span> <span class="small muted">${esc(w.meaning)}</span></div>
            <span class="meta" style="${overdue ? "color:var(--bad)" : ""}">${when}</span></div>`;
    }).join("") : '<div class="empty">還沒有單字</div>';
    App.go("sec-srs-list");
};

// ===================== 初始化 =====================
$("ocr-upload").addEventListener("change", handleOCR);
