// ===================== 新增單字 =====================
let lastAutoTranslated = "";

Actions.switchAddMode = (mode) => {
    document.querySelectorAll("#add-mode-switch button").forEach(b => b.classList.toggle("active", b.dataset.arg === mode));
    show("add-mode-manual", mode === "manual");
    show("add-mode-trans", mode === "trans");
};

async function autoTranslate() {
    const en = $("word-en").value.trim();
    checkDuplicate("word-en", "active-book-select", "word-dup-warn");
    if (!en || en === lastAutoTranslated) return;
    lastAutoTranslated = en;
    const zhInput = $("word-zh");
    const placeholder = zhInput.placeholder;
    zhInput.placeholder = "🔄 自動翻譯中...";
    try {
        const info = await Svc.lookup(en);
        if ($("word-en").value.trim() !== en) return;
        if (info.zh && !zhInput.value.trim()) zhInput.value = info.zh;
        if (info.pos && !$("word-pos").value) $("word-pos").value = info.pos;
    } finally {
        zhInput.placeholder = placeholder;
    }
}

function checkDuplicate(enId, bookId, warnId) {
    const en = Words.normalizeEnglish($(enId).value);
    const book = $(bookId).value;
    const warn = $(warnId);
    const dup = Words.findDuplicate(en, book);
    const elsewhere = dup ? [] : Words.findAnywhere(en).filter(w => w.book !== book);
    if (dup) warn.textContent = `⚠️「${dup.english}」已經在「${book}」裡了（${dup.chinese}）`;
    else if (elsewhere.length) warn.textContent = `ℹ️ 這個字已在「${elsewhere.map(w => w.book).join("、")}」中`;
    warn.hidden = !dup && !elsewhere.length;
    return dup;
}

Actions.saveWord = async () => {
    const book = $("active-book-select").value || Store.defaultBook();
    const en = Words.normalizeEnglish($("word-en").value);
    const zh = $("word-zh").value.trim();
    if (!en || !zh) { showToast("英文與中文為必填！", "error"); return; }
    if (Words.findDuplicate(en, book) &&
        !(await UI.confirm("重複的單字", `「${en}」已經在「${book}」裡了，仍要再新增一筆嗎？`, { okLabel: "仍要新增" }))) return;
    const phonetic = Phon.missCache().has(en.toLowerCase()) ? "" : Svc.phoneticOf(await Svc.dict(en).catch(() => null));
    Words.add([{ book, english: en, chinese: zh, notes: $("word-notes").value, pos: $("word-pos").value, example: $("word-example").value, phonetic }]);
    showToast("單字新增成功！");
    ["word-en", "word-zh", "word-notes", "word-example"].forEach(id => { $(id).value = ""; });
    $("word-pos").value = "";
    hide("word-dup-warn");
    lastAutoTranslated = "";
    $("word-en").focus();
};

// ===================== 智慧翻譯 =====================
let lastTransEnglish = "";

Actions.doTranslation = async (arg, btn) => {
    const input = $("trans-input").value.trim();
    if (!input) return;
    const dir = $("trans-dir").value;
    const sl = dir === "auto" ? "auto" : (dir === "en2zh" ? "en" : "zh-TW");
    const tl = dir === "zh2en" ? "en" : "zh-TW";
    setBusy(btn, true, '<i class="fas fa-spinner fa-spin"></i> 翻譯中...');
    try {
        const out = await Svc.translate(input, { sl, tl });
        const box = $("trans-output");
        if (tl === "zh-TW") {
            lastTransEnglish = input;
            box.innerHTML = `<div class="mb-12" style="font-size:16px; font-weight:500; white-space:pre-wrap;">${esc(out)}</div>
                <div style="padding-top:12px; border-top:1px dashed var(--border);">
                    <strong class="small muted">英文原文（點擊單字可加入）：</strong>
                    <div class="mt-8" style="line-height:1.8; white-space:pre-wrap;">${makeClickable(input)}</div>
                </div>`;
        } else {
            lastTransEnglish = out;
            box.innerHTML = `<div class="small muted mb-12">英文翻譯（點擊單字可加入）：</div>
                <div style="line-height:1.8; font-size:16px; white-space:pre-wrap;">${makeClickable(out)}</div>`;
        }
        show("trans-result-card");
    } catch (e) {
        showToast("翻譯失敗，請檢查網路", "error");
    } finally {
        setBusy(btn, false);
    }
};

Actions.playTransTTS = () => TTS.say(lastTransEnglish);

// ===================== 快速新增面板（翻譯、字典、新聞、文章、AI 單字包共用） =====================
const QuickAdd = {
    async open(word, { zh = "", notes = "", pos = "", phonetic = "", lookup = true } = {}) {
        word = Words.normalizeEnglish(word);
        if (!word) return;
        QuickAdd.phonetic = phonetic;
        refreshBookSelects();
        $("qa-book").value = $("active-book-select").value || Store.defaultBook();
        $("qa-en").value = word;
        $("qa-zh").value = zh || (lookup ? "翻譯中..." : "");
        $("qa-notes").value = notes;
        $("qa-pos").value = pos;
        show("quick-add");
        checkDuplicate("qa-en", "qa-book", "qa-dup-warn");
        if (!lookup) return;
        const info = await Svc.lookup(word);
        if ($("qa-en").value !== word) return;
        if (!zh) $("qa-zh").value = info.zh;
        if (!pos && info.pos) $("qa-pos").value = info.pos;
        QuickAdd.phonetic = info.phonetic;
    },
    phonetic: ""
};

Actions.closeQuickAdd = () => hide("quick-add");

Actions.saveQuickAdd = async () => {
    const en = Words.normalizeEnglish($("qa-en").value);
    const zh = $("qa-zh").value.trim();
    const book = $("qa-book").value || Store.defaultBook();
    if (!en || !zh || zh === "翻譯中...") { showToast("單字與中文不可為空", "error"); return; }
    if (Words.findDuplicate(en, book) &&
        !(await UI.confirm("重複的單字", `「${en}」已經在「${book}」裡了，仍要再新增一筆嗎？`, { okLabel: "仍要新增" }))) return;
    Words.add([{ book, english: en, chinese: zh, notes: $("qa-notes").value, pos: $("qa-pos").value, phonetic: QuickAdd.phonetic }]);
    QuickAdd.phonetic = "";
    showToast(`已加入「${book}」`);
    hide("quick-add");
};

// 所有 .clickable-word 點了都開快速新增
document.addEventListener("click", (e) => {
    const el = e.target.closest(".clickable-word");
    if (!el) return;
    document.querySelectorAll(".clickable-word.hl").forEach(x => x.classList.remove("hl"));
    el.classList.add("hl");
    const word = el.dataset.word;
    TTS.say(word);
    QuickAdd.open(word, { notes: el.dataset.notes || "" });
});

// ===================== OCR（拍照辨識） =====================
const OCR = {
    selected: new Set(),
    worker: null,

    async loadWorker() {
        if (OCR.worker) return OCR.worker;
        if (!window.Tesseract) {
            await new Promise((resolve, reject) => {
                const s = document.createElement("script");
                s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
                s.onload = resolve; s.onerror = () => reject(new Error("無法載入辨識元件"));
                document.head.appendChild(s);
            });
        }
        OCR.worker = await Tesseract.createWorker("eng");
        return OCR.worker;
    }
};

async function handleOCR(event) {
    const file = event.target.files[0];
    if (!file) return;
    show("ocr-modal"); show("ocr-loading"); hide("ocr-results"); hide("ocr-actions");
    $("ocr-modal-title").textContent = "智慧鏡頭辨識中...";
    $("ocr-modal-desc").textContent = "第一次使用需要下載辨識元件，請稍候";
    try {
        const worker = await OCR.loadWorker();
        const ret = await worker.recognize(file);
        const words = [...new Set((ret.data.text.match(/[A-Za-z]{2,}/g) || []).map(w => w.toLowerCase()))];
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
    if (!words.length) {
        $("ocr-modal-desc").textContent = "找不到任何英文單字";
        show("ocr-actions");
        return;
    }
    $("ocr-modal-title").textContent = "請選擇要匯入的單字";
    $("ocr-modal-desc").textContent = `共辨識出 ${words.length} 個單字，點選即可選取（淡色＝已在單字本中）。`;
    const box = $("ocr-results");
    box.innerHTML = words.map(w => `<div class="chip${Words.findAnywhere(w).length ? " exists" : ""}" data-ocr="${esc(w)}">${esc(w)}</div>`).join("");
    box.querySelectorAll("[data-ocr]").forEach(chip => {
        chip.onclick = () => {
            const w = chip.dataset.ocr;
            if (OCR.selected.has(w)) OCR.selected.delete(w); else OCR.selected.add(w);
            chip.classList.toggle("selected");
            $("ocr-selected-count").textContent = OCR.selected.size;
        };
    });
    show("ocr-results"); show("ocr-actions");
}

Actions.closeOCRModal = () => { hide("ocr-modal"); $("ocr-upload").value = ""; };

Actions.processBatchAddOCR = async () => {
    if (!OCR.selected.size) { showToast("請至少選擇一個單字", "error"); return; }
    const book = $("active-book-select").value || Store.defaultBook();
    const list = [...OCR.selected];
    $("ocr-modal-title").textContent = "正在批次翻譯與匯入...";
    $("ocr-modal-desc").textContent = "請勿關閉視窗";
    hide("ocr-results"); hide("ocr-actions"); show("ocr-loading");
    const run = limiter(4);
    const results = await Promise.all(list.map(en => run(async () => {
        const info = await Svc.lookup(en);
        return info.zh ? { book, english: en, chinese: info.zh, pos: info.pos, phonetic: info.phonetic, notes: "來自相機辨識" } : null;
    })));
    const toAdd = results.filter(Boolean).filter(w => !Words.findDuplicate(w.english, book));
    const added = Words.add(toAdd);
    showToast(`成功匯入 ${added.length} 個單字${list.length - added.length ? `（略過 ${list.length - added.length} 個）` : ""}`);
    Actions.closeOCRModal();
};

// ===================== 單字本總覽 =====================
let isCompactView = lsGet("vp_compact", false);
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

function renderBooksList() {
    const list = $("books-list");
    $("books-card").classList.toggle("compact", isCompactView);
    const books = Store.books();
    const counts = {};
    S.words.forEach(w => { counts[w.book] = (counts[w.book] || 0) + 1; });
    list.innerHTML = books.map(book => {
        const drag = isBookReorderMode && book !== TRASH_BOOK ? '<div class="drag-handle"><i class="fas fa-grip-lines"></i></div>' : "";
        const icon = book === TRASH_BOOK ? "fa-trash-alt" : "fa-book";
        return `<div class="book-item${isBookReorderMode ? " reorder" : ""}" data-book="${esc(book)}" ${isBookReorderMode && book !== TRASH_BOOK ? 'draggable="true"' : ""}>
            <div class="flex-row" style="min-width:0; flex:1; gap:0;">${drag}
                <div class="book-icon-wrapper"><i class="fas ${icon}"></i></div>
                <span class="name">${esc(book)}</span>
            </div>
            <div class="flex-row muted" style="gap:8px; flex-shrink:0;">
                <span class="badge">${counts[book] || 0} 字</span>
                ${isBookReorderMode ? "" : '<i class="fas fa-chevron-right" style="color:var(--border);"></i>'}
            </div>
        </div>`;
    }).join("");
    if (isBookReorderMode) bindBookDrag(list);
}

$("books-list").addEventListener("click", (e) => {
    if (isBookReorderMode) return;
    const item = e.target.closest(".book-item");
    if (item) openBook(item.dataset.book);
});

Actions.toggleCompactView = () => {
    isCompactView = !isCompactView;
    lsSet("vp_compact", isCompactView);
    updateCompactButton();
    renderBooksList();
    if ($("sec-words").classList.contains("active")) renderWordList();
};

function updateCompactButton() {
    $("btn-compact-toggle").innerHTML = isCompactView ? '<i class="fas fa-th-large"></i> 卡片模式' : '<i class="fas fa-list"></i> 緊湊模式';
}

Actions.toggleBookReorderMode = () => {
    isBookReorderMode = !isBookReorderMode;
    $("book-reorder-btn").innerHTML = isBookReorderMode ? '<i class="fas fa-check"></i> 完成' : '<i class="fas fa-sort"></i> 調整順序';
    renderBooksList();
};

function moveBookTo(src, dest) {
    const books = Store.books().filter(b => b !== TRASH_BOOK);
    const from = books.indexOf(src);
    const to = books.indexOf(dest);
    if (from < 0 || to < 0 || from === to) return;
    books.splice(from, 1);
    books.splice(to, 0, src);
    Store.saveBookOrder(books);
    refreshBookSelects();
    renderBooksList();
}

function bindBookDrag(list) {
    let dragSrc = null;
    list.querySelectorAll('.book-item[draggable="true"]').forEach(el => {
        el.addEventListener("dragstart", (e) => { dragSrc = el.dataset.book; e.dataTransfer.effectAllowed = "move"; el.style.opacity = "0.5"; });
        el.addEventListener("dragend", () => { el.style.opacity = ""; });
        el.addEventListener("dragover", (e) => { e.preventDefault(); el.classList.add("drop-target"); });
        el.addEventListener("dragleave", () => el.classList.remove("drop-target"));
        el.addEventListener("drop", (e) => { e.preventDefault(); el.classList.remove("drop-target"); if (dragSrc) moveBookTo(dragSrc, el.dataset.book); });

        const handle = el.querySelector(".drag-handle");
        handle.addEventListener("touchstart", () => { dragSrc = el.dataset.book; el.style.opacity = "0.5"; }, { passive: true });
        handle.addEventListener("touchmove", (e) => {
            e.preventDefault();
            const t = e.targetTouches[0];
            const target = document.elementFromPoint(t.clientX, t.clientY);
            list.querySelectorAll(".drop-target").forEach(x => x.classList.remove("drop-target"));
            const item = target && target.closest('.book-item[draggable="true"]');
            if (item && item !== el) item.classList.add("drop-target");
        }, { passive: false });
        handle.addEventListener("touchend", (e) => {
            el.style.opacity = "";
            const t = e.changedTouches[0];
            const target = document.elementFromPoint(t.clientX, t.clientY);
            list.querySelectorAll(".drop-target").forEach(x => x.classList.remove("drop-target"));
            const item = target && target.closest('.book-item[draggable="true"]');
            if (item && dragSrc) moveBookTo(dragSrc, item.dataset.book);
            dragSrc = null;
        });
    });
}

Actions.addNewBook = async () => {
    const name = await UI.prompt("建立新單字本", { placeholder: "單字本名稱" });
    if (!name) return;
    if (name === TRASH_BOOK || Store.books().includes(name)) { showToast("此名稱已被使用", "error"); return; }
    Store.saveBookOrder([...Store.books(), name]);
    refreshBookSelects();
    renderBooksList();
    showToast("單字本新增成功");
};

Actions.setDefaultBook = () => {
    Store.setSettings({ defaultBook: $("book-select").value });
    refreshBookSelects();
    showToast("已更新預設單字本");
};

// 全域搜尋
$("global-search").addEventListener("input", debounce(() => {
    const q = $("global-search").value.trim().toLowerCase();
    const box = $("global-search-results");
    if (!q) { hide(box); return; }
    const hits = S.words.filter(w => w.english.toLowerCase().includes(q) || w.chinese.toLowerCase().includes(q)).slice(0, 50);
    box.innerHTML = hits.length
        ? hits.map(w => `<div class="search-result" data-open-word="${esc(w.id)}">
            <div><b class="text-primary">${esc(w.english)}</b> <span class="muted small">${esc(w.chinese)}</span></div>
            <span class="book-tag">${esc(w.book)}</span></div>`).join("")
        : '<div class="muted center small">找不到符合的單字</div>';
    show(box);
}, 200));

$("global-search-results").addEventListener("click", (e) => {
    const row = e.target.closest("[data-open-word]");
    if (!row) return;
    const w = Words.byId(row.dataset.openWord);
    if (!w) return;
    $("global-search").value = "";
    hide("global-search-results");
    openBook(w.book, w.english);
});

// ===================== 單字清單 =====================
let wordSortOrder = "desc";
let isManageMode = false;
const selectedWords = new Set();

function openBook(bookName, search = "") {
    currentViewBook = bookName;
    wordSortOrder = "desc";
    $("book-search").value = search;
    if (isManageMode) Actions.toggleManageMode();
    App.go("sec-words", bookName);
    updateSortButton();
    renderWordList();
}

function updateSortButton() {
    $("sort-order-btn").innerHTML = wordSortOrder === "desc" ? '<i class="fas fa-clock"></i> 最新' : '<i class="fas fa-history"></i> 最舊';
}

Actions.toggleWordSortOrder = () => {
    wordSortOrder = wordSortOrder === "desc" ? "asc" : "desc";
    updateSortButton();
    renderWordList();
};

Actions.toggleTTSRate = () => {
    TTS.rate = TTS.rate === 1.0 ? 0.75 : 1.0;
    document.querySelectorAll(".tts-rate-btn").forEach(b => { b.innerHTML = `<i class="fas fa-tachometer-alt"></i> ${TTS.rate}x`; });
    showToast(`語音速度：${TTS.rate}x`, "success", 1500);
};

$("book-search").addEventListener("input", debounce(() => renderWordList(), 200));

function sortedBookWords() {
    const q = $("book-search").value.trim().toLowerCase();
    let list = S.words.filter(w => w.book === currentViewBook);
    if (q) list = list.filter(w => w.english.toLowerCase().includes(q) || w.chinese.toLowerCase().includes(q) || (w.notes || "").toLowerCase().includes(q));
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
    list.classList.toggle("manage-mode", isManageMode);
    if (!words.length) {
        list.innerHTML = `<div class="empty-state"><i class="fas fa-box-open"></i><p>${$("book-search").value ? "找不到符合的單字" : "尚無單字"}</p></div>`;
        return;
    }
    const check = (w) => `<input type="checkbox" class="manage-checkbox" data-select="${esc(w.id)}" ${selectedWords.has(w.id) ? "checked" : ""}>`;
    const pos = (w) => w.pos ? `<span class="pos-tag ${posClass(w.pos)}">${esc(w.pos)}</span>` : "";
    const actions = (w) => `
        <button class="btn-icon-small" data-word-act="speak" title="發音"><i class="fas fa-volume-up"></i></button>
        <button class="btn-icon-small primary" data-word-act="edit" title="編輯"><i class="fas fa-edit"></i></button>
        <button class="btn-icon-small danger" data-word-act="delete" title="刪除"><i class="fas fa-trash-alt"></i></button>`;
    const fmtDate = (w, opts) => w.timestamp ? new Date(w.timestamp).toLocaleDateString("zh-TW", opts) : "";

    if (isCompactView) {
        list.innerHTML = `<div class="compact-list">${words.map(w => `
            <div class="compact-row" data-wid="${esc(w.id)}">
                <div class="top">
                    <div class="left">${check(w)}<span class="en">${esc(w.english)}</span>
                        <span class="phonetic" data-phon="${esc(w.id)}">${esc(w.phonetic)}</span>${pos(w)}</div>
                    <div class="word-actions"><span class="word-date">${fmtDate(w, { month: "2-digit", day: "2-digit" })}</span>${actions(w)}</div>
                </div>
                <div class="zh">${esc(w.chinese)}</div>
            </div>`).join("")}</div>`;
    } else {
        list.innerHTML = words.map(w => `
            <div class="word-card" data-wid="${esc(w.id)}">
                <div class="word-card-header">
                    <div class="word-title">${check(w)}<div class="word-en">${esc(w.english)}</div>${pos(w)}
                        <span class="phonetic" data-phon="${esc(w.id)}">${esc(w.phonetic)}</span>
                        <span class="word-date">${fmtDate(w, { year: "numeric", month: "2-digit", day: "2-digit" })}</span></div>
                    <div class="word-actions">${actions(w)}</div>
                </div>
                <div class="word-zh">${esc(w.chinese)}</div>
                ${w.notes ? `<div class="word-notes"><i class="fas fa-lightbulb"></i>${esc(w.notes)}</div>` : ""}
                ${w.example ? `<div class="word-notes example"><i class="fas fa-quote-left"></i>${esc(w.example)}</div>` : ""}
                <button class="btn-expand" data-word-act="expand"><i class="fas fa-book"></i> 字典內容與延伸學習</button>
                <div class="expand-card" hidden></div>
            </div>`).join("");
    }
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
    if (act === "speak") TTS.say(w.english);
    else if (act === "edit") openEditModal(w.id);
    else if (act === "delete") deleteWord(w.id);
    else if (act === "expand") {
        const box = row.querySelector(".expand-card");
        if (!box.hidden) { box.hidden = true; return; }
        box.hidden = false;
        renderDictEntry(w.english, box, { compact: true, withExtras: true });
    }
});

// ===================== 編輯 / 刪除 =====================
function openEditModal(id) {
    const w = Words.byId(id);
    if (!w) return;
    refreshBookSelects();
    $("edit-id").value = id;
    $("edit-word-en").value = w.english;
    $("edit-word-zh").value = w.chinese;
    $("edit-word-notes").value = w.notes || "";
    $("edit-word-example").value = w.example || "";
    $("edit-word-pos").value = POS_OPTIONS.some(p => p[0] === w.pos) ? w.pos : "";
    const bookSel = $("edit-word-book");
    if (w.book === TRASH_BOOK) bookSel.add(new Option(TRASH_BOOK, TRASH_BOOK));
    bookSel.value = w.book;
    show("edit-word-modal");
}

Actions.saveEditWord = () => {
    const id = $("edit-id").value;
    const w = Words.byId(id);
    if (!w) return;
    const fields = {
        english: Words.normalizeEnglish($("edit-word-en").value),
        chinese: $("edit-word-zh").value.trim(),
        pos: $("edit-word-pos").value,
        notes: $("edit-word-notes").value.trim(),
        example: $("edit-word-example").value.trim(),
        book: $("edit-word-book").value
    };
    if (!fields.english || !fields.chinese) { showToast("英文與中文不可為空", "error"); return; }
    if (fields.english !== w.english) fields.phonetic = "";
    Words.update([{ id, fields }]);
    hide("edit-word-modal");
    showToast("單字已更新");
    if (fields.english !== w.english || !w.phonetic) Phon.ensure(w);
    App.refreshView();
};

async function deleteWord(id) {
    const w = Words.byId(id);
    if (!w) return;
    if (w.book === TRASH_BOOK) {
        if (!(await UI.confirm("永久刪除", `確定要永久刪除「${w.english}」嗎？此操作無法復原。`, { okLabel: "永久刪除", danger: true }))) return;
        Words.remove([id]);
        showToast("已永久刪除");
    } else {
        const oldBook = w.book;
        Words.update([{ id, fields: { book: TRASH_BOOK } }]);
        showToast("已移至垃圾桶", "success", 5000, {
            label: "復原",
            run: () => { Words.update([{ id, fields: { book: oldBook } }]); App.refreshView(); showToast("已復原單字"); }
        });
    }
    App.refreshView();
}

Actions.deleteCurrentBook = async () => {
    const book = currentViewBook;
    if (book === DEFAULT_BOOK) { showToast("預設單字本無法刪除", "error"); return; }
    const count = Words.inBook(book).length;
    const isTrash = book === TRASH_BOOK;
    const msg = isTrash ? `確定要清空垃圾桶（${count} 個單字）嗎？此操作無法復原。`
        : `確定刪除「${book}」？裡面的 ${count} 個單字會一起永久刪除，無法復原。`;
    if (!(await UI.confirm(isTrash ? "清空垃圾桶" : "刪除單字本", msg, { okLabel: "刪除", danger: true }))) return;
    S.words = S.words.filter(w => w.book !== book);
    Store.saveWords();
    Queue.push("deleteBook", { book });
    if (!isTrash) {
        Store.saveBookOrder(Store.books().filter(b => b !== book));
        if (S.settings.defaultBook === book) Store.setSettings({ defaultBook: DEFAULT_BOOK });
    }
    refreshBookSelects();
    App.refreshCounts();
    App.go("sec-books");
    showToast(isTrash ? "垃圾桶已清空" : "已刪除單字本");
};

Actions.renameCurrentBook = async () => {
    const oldBook = currentViewBook;
    if (oldBook === DEFAULT_BOOK || oldBook === TRASH_BOOK) { showToast("這本單字本無法重新命名", "error"); return; }
    const name = await UI.prompt("重新命名單字本", { value: oldBook });
    if (!name || name === oldBook) return;
    if (name === TRASH_BOOK || Store.books().includes(name)) { showToast("此名稱已被使用", "error"); return; }
    Words.update(Words.inBook(oldBook).map(w => ({ id: w.id, fields: { book: name } })));
    Store.saveBookOrder(Store.books().map(b => b === oldBook ? name : b));
    if (S.settings.defaultBook === oldBook) Store.setSettings({ defaultBook: name });
    refreshBookSelects();
    openBook(name);
    showToast("單字本名稱已更新");
};

// ===================== 批次管理 =====================
Actions.toggleManageMode = () => {
    isManageMode = !isManageMode;
    selectedWords.clear();
    $("manage-mode-btn").innerHTML = isManageMode ? '<i class="fas fa-times"></i> 取消' : '<i class="fas fa-tasks"></i> 批次管理';
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
    options.push({ label: "➕ 新增單字本...", value: "__new__" });
    let target = await UI.choose(`把 ${selectedWords.size} 個單字搬到…`, options);
    if (!target) return;
    if (target === "__new__") {
        target = await UI.prompt("新單字本名稱");
        if (!target) return;
        if (target === TRASH_BOOK) { showToast("此名稱不可使用", "error"); return; }
        if (!Store.books().includes(target)) Store.saveBookOrder([...Store.books(), target]);
    }
    const count = selectedWords.size;
    Words.update([...selectedWords].map(id => ({ id, fields: { book: target } })));
    refreshBookSelects();
    Actions.toggleManageMode();
    showToast(`已搬移 ${count} 個單字到「${target}」`);
};

Actions.deleteSelectedWords = async () => {
    if (!selectedWords.size) return;
    const ids = [...selectedWords];
    if (currentViewBook === TRASH_BOOK) {
        if (!(await UI.confirm("永久刪除", `確定要永久刪除這 ${ids.length} 個單字嗎？`, { okLabel: "永久刪除", danger: true }))) return;
        Words.remove(ids);
        showToast(`已永久刪除 ${ids.length} 個單字`);
    } else {
        const oldBook = currentViewBook;
        Words.update(ids.map(id => ({ id, fields: { book: TRASH_BOOK } })));
        showToast(`已將 ${ids.length} 個單字移至垃圾桶`, "success", 5000, {
            label: "復原",
            run: () => { Words.update(ids.map(id => ({ id, fields: { book: oldBook } }))); App.refreshView(); }
        });
    }
    Actions.toggleManageMode();
};

// ===================== 造句 / SRS 時間表 =====================
Actions.openSentenceMaker = () => {
    const words = S.words.filter(w => w.book === currentViewBook && !(w.example || "").trim());
    const tbody = $("sentence-table-body");
    tbody.innerHTML = words.length
        ? words.map(w => `<tr><td class="en">${esc(w.english)}</td><td class="muted">${esc(w.chinese)}</td>
            <td style="text-align:right;"><button class="btn-primary btn-sm" data-action="editWord" data-arg="${esc(w.id)}"><i class="fas fa-pen"></i> 寫造句</button></td></tr>`).join("")
        : '<tr><td colspan="3" class="center muted">太棒了！這本單字本的單字都已經有例句了。</td></tr>';
    App.go("sec-sentence-maker", "造句練習");
};

Actions.editWord = (id) => openEditModal(id);

Actions.openSrsList = () => {
    const now = Date.now();
    const sorted = [...S.words].filter(w => w.book !== TRASH_BOOK).sort((a, b) => (a.nextReviewTime || 0) - (b.nextReviewTime || 0));
    $("srs-table-body").innerHTML = sorted.map(w => {
        const t = w.nextReviewTime ? fmtDateTime(w.nextReviewTime) : "尚未學習";
        const overdue = w.nextReviewTime && w.nextReviewTime <= now;
        return `<tr><td class="en">${esc(w.english)}</td><td>${esc(w.chinese)}</td>
            <td class="${overdue ? "overdue" : ""}">${t}</td><td>${(w.interval || 0).toFixed(1)}</td></tr>`;
    }).join("");
    App.go("sec-srs-list", "SRS 時間表");
};

// ===================== 初始化 =====================
$("word-en").addEventListener("blur", autoTranslate);
$("active-book-select").addEventListener("change", () => checkDuplicate("word-en", "active-book-select", "word-dup-warn"));
$("qa-en").addEventListener("blur", async () => {
    checkDuplicate("qa-en", "qa-book", "qa-dup-warn");
    const en = $("qa-en").value.trim();
    if (en && !$("qa-zh").value.trim()) {
        const info = await Svc.lookup(en);
        $("qa-zh").value = info.zh;
        if (info.pos) $("qa-pos").value = info.pos;
        QuickAdd.phonetic = info.phonetic;
    }
});
$("qa-book").addEventListener("change", () => checkDuplicate("qa-en", "qa-book", "qa-dup-warn"));
$("ocr-upload").addEventListener("change", handleOCR);
document.querySelectorAll("select.pos-select").forEach(fillPosSelect);
updateCompactButton();
