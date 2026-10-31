// ===================== 雙語段落閱讀（新聞與自定義文章共用） =====================
function splitBlocks(paragraphs, perBlock) {
    const out = [];
    for (let i = 0; i < paragraphs.length; i += perBlock) out.push(paragraphs.slice(i, i + perBlock).join("\n\n"));
    return out;
}

// blocks: 英文區塊陣列；cached: 已有的翻譯；回傳 Promise<翻譯陣列>
function renderBilingual(container, blocks, { cached = [], bookmarkIndex = -1, onBookmark = null } = {}) {
    container.innerHTML = blocks.map((text, i) => `
        <div class="para" id="para-${i}">
            <p class="para-en">${makeClickable(text)}</p>
            <p class="para-zh" data-zh="${i}">${cached[i] ? esc(cached[i]) : '<i class="fas fa-circle-notch fa-spin"></i> 翻譯中...'}</p>
            <div class="para-tools">
                <button class="pill-btn" data-para-act="speak" data-i="${i}"><i class="fas fa-volume-up"></i> 朗讀此段</button>
                <button class="pill-btn danger" data-para-act="stop"><i class="fas fa-stop"></i> 停止</button>
                ${onBookmark ? `<button class="pill-btn bmk${i === bookmarkIndex ? " on" : ""}" data-para-act="bookmark" data-i="${i}"><i class="fas fa-bookmark"></i> 書籤</button>` : ""}
            </div>
        </div>`).join("");

    container.onclick = (e) => {
        const btn = e.target.closest("[data-para-act]");
        if (!btn) return;
        const act = btn.dataset.paraAct;
        const i = Number(btn.dataset.i);
        if (act === "speak") TTS.say(blocks[i]);
        else if (act === "stop") TTS.stop();
        else if (act === "bookmark" && onBookmark) {
            container.querySelectorAll(".bmk").forEach(b => b.classList.toggle("on", b === btn));
            onBookmark(i);
        }
    };

    const results = [...cached];
    const run = limiter(3);
    return Promise.all(blocks.map((text, i) => {
        if (cached[i]) return null;
        return run(async () => {
            const el = container.querySelector(`[data-zh="${i}"]`);
            try {
                results[i] = await Svc.translate(text);
                if (el) el.textContent = results[i];
            } catch (e) {
                if (el) el.textContent = "（翻譯服務暫時忙碌）";
            }
        });
    })).then(() => results);
}

// ===================== The Guardian 新聞 =====================
const News = { list: [], index: 0 };

Actions.loadNews = async (arg, btn) => {
    const next = arg === "next";
    if (!next) setBusy($("btn-load-news"), true);
    try {
        if (!next || !News.list.length) {
            const res = await Api.call("news", { section: $("news-category").value });
            News.list = shuffle(res.items.filter(i => i.body && i.body.length > 200));
            News.index = 0;
        } else {
            News.index = (News.index + 1) % News.list.length;
        }
        if (!News.list.length) { showToast("這個類別目前沒有足夠內容", "error"); return; }
        const item = News.list[News.index];
        const doc = new DOMParser().parseFromString(item.body, "text/html");
        const paras = [...doc.querySelectorAll("p")].map(p => p.textContent.trim()).filter(p => p.length > 20);
        const blocks = splitBlocks(paras, Number($("news-sentences").value) || 1).slice(0, 15);

        const box = $("news-modal-content");
        box.innerHTML = `
            <h1 class="reader-title">${makeClickable(item.title)}</h1>
            <div class="reader-title-zh" id="news-title-zh"><i class="fas fa-circle-notch fa-spin"></i></div>
            <div id="news-body"></div>
            <div class="row mt-16" style="border-top:1px dashed var(--border); padding-top:20px;">
                <button class="btn-primary" data-action="loadNews" data-arg="next"><i class="fas fa-step-forward"></i> 下一篇</button>
                <a href="${esc(item.url)}" target="_blank" rel="noopener" class="btn-outline" style="text-decoration:none; display:flex; justify-content:center; align-items:center; gap:8px; border-radius:14px; font-weight:600;"><i class="fas fa-external-link-alt"></i> 原文</a>
            </div>`;
        show("news-modal");
        $("news-modal").scrollTop = 0;
        Svc.translate(item.title).then(t => { $("news-title-zh").textContent = t; }).catch(() => { $("news-title-zh").textContent = ""; });
        renderBilingual($("news-body"), blocks);
    } catch (e) {
        showToast(e instanceof ServerError ? e.message : "新聞抓取失敗，請檢查網路", "error");
    } finally {
        if (!next) setBusy($("btn-load-news"), false);
    }
};

Actions.closeNewsModal = () => { TTS.stop(); hide("news-modal"); hide("quick-add"); };

// ===================== 自定義文章 =====================
let currentArticleIndex = -1;

async function fetchCustomArticles() {
    const list = $("custom-articles-list");
    if (!S.articles.length) {
        const cached = lsGet(Store.k("articles"), null);
        if (cached) { S.articles = cached; renderCustomArticles(); }
        else list.innerHTML = '<div class="spinner-line"><i class="fas fa-spinner fa-spin"></i> 載入中...</div>';
    }
    try {
        await Queue.flush();
        if (Queue.size()) return; // 還有沒送出的修改時先用本機資料
        const res = await Api.call("getArticles");
        S.articles = res.articles;
        saveArticlesLocal();
        renderCustomArticles();
    } catch (e) {
        if (!S.articles.length) list.innerHTML = `<div class="error-box">載入失敗：${esc(e.message)}</div>`;
    }
}

function saveArticlesLocal() { lsSet(Store.k("articles"), S.articles); }

function getCustomFolders() {
    const set = new Set([UNSORTED]);
    S.articles.forEach(a => set.add(a.folder || UNSORTED));
    (S.settings.folders || []).forEach(f => set.add(f));
    return [...set];
}

function collapsedFolders() { return lsGet(`collapsedFolders_${S.user}`, {}); }

Actions.toggleFolder = (folder) => {
    const c = collapsedFolders();
    c[folder] = !(c[folder] !== false);
    lsSet(`collapsedFolders_${S.user}`, c);
    renderCustomArticles();
};

function renderCustomArticles() {
    const list = $("custom-articles-list");
    if (!S.articles.length && !(S.settings.folders || []).length) {
        list.innerHTML = '<div class="empty-state"><i class="fas fa-file-alt"></i><p>尚無自定義文章</p></div>';
        return;
    }
    const folders = getCustomFolders();
    const collapsed = collapsedFolders();
    const onlyUnsorted = folders.length === 1;
    let html = "";
    folders.forEach(folder => {
        const items = S.articles.map((a, idx) => ({ a, idx })).filter(x => (x.a.folder || UNSORTED) === folder);
        if (!items.length && folder === UNSORTED && !onlyUnsorted) return;
        const isCollapsed = !onlyUnsorted && collapsed[folder] !== false;
        if (!onlyUnsorted) {
            html += `<div class="folder-head" data-action="toggleFolder" data-arg="${esc(folder)}">
                <h3><i class="fas ${isCollapsed ? "fa-chevron-right" : "fa-chevron-down"} muted small"></i><i class="fas fa-folder"></i>${esc(folder)}</h3>
                <span class="small muted">${items.length} 篇</span></div>`;
        }
        if (isCollapsed) return;
        if (!items.length) { html += '<div class="folder-empty">這個群組目前沒有文章</div>'; return; }
        html += items.map(({ a, idx }) => `
            <div class="card article-card">
                <div class="info" data-action="openArticle" data-arg="${idx}">
                    <h3>${esc(a.title)}</h3>
                    <div class="small muted">${a.created ? new Date(a.created).toLocaleString() : ""}</div>
                </div>
                <div class="actions">
                    <button class="btn-icon-small primary" data-action="openCustomEditModal" data-arg="${idx}"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon-small danger" data-action="deleteCustomArticle" data-arg="${idx}"><i class="fas fa-trash-alt"></i></button>
                    <div class="updown">
                        <button class="btn-icon-small" data-action="moveCustomArticle" data-arg="${idx}:-1" ${idx === 0 ? "disabled" : ""}><i class="fas fa-caret-up"></i></button>
                        <button class="btn-icon-small" data-action="moveCustomArticle" data-arg="${idx}:1" ${idx === S.articles.length - 1 ? "disabled" : ""}><i class="fas fa-caret-down"></i></button>
                    </div>
                </div>
            </div>`).join("");
    });
    list.innerHTML = html;
}

Actions.openCustomEditModal = (arg) => {
    const index = arg === undefined ? -1 : Number(arg);
    const sel = $("custom-edit-folder-select");
    sel.innerHTML = getCustomFolders().map(f => `<option value="${esc(f)}">${esc(f)}</option>`).join("") + '<option value="__NEW__">➕ 新增群組...</option>';
    hide("custom-edit-folder-new");
    $("custom-edit-folder-new").value = "";
    const a = index >= 0 ? S.articles[index] : null;
    $("custom-edit-id").value = a ? index : "";
    $("custom-edit-title-h3").textContent = a ? "編輯文章" : "新增文章";
    $("custom-edit-title").value = a ? a.title : "";
    $("custom-edit-content").value = a ? a.content : "";
    $("custom-edit-paras").value = a ? (a.parasPerBlock || 1) : 1;
    sel.value = a ? (a.folder || UNSORTED) : UNSORTED;
    show("custom-edit-modal");
};

$("custom-edit-folder-select").addEventListener("change", (e) => show("custom-edit-folder-new", e.target.value === "__NEW__"));

Actions.saveCustomArticle = () => {
    const title = $("custom-edit-title").value.trim();
    const content = $("custom-edit-content").value.trim();
    const paras = Number($("custom-edit-paras").value) || 1;
    let folder = $("custom-edit-folder-select").value;
    if (folder === "__NEW__") {
        folder = $("custom-edit-folder-new").value.trim();
        if (!folder) { showToast("請輸入新群組名稱", "error"); return; }
    }
    if (!title || !content) { showToast("請輸入標題和內容", "error"); return; }

    const idxStr = $("custom-edit-id").value;
    let art;
    if (idxStr !== "") {
        art = S.articles[Number(idxStr)];
        if (art.content !== content || art.parasPerBlock !== paras) { art.translations = []; art.bookmarkIndex = 0; }
        Object.assign(art, { title, content, parasPerBlock: paras, folder });
    } else {
        const minOrder = S.articles.reduce((m, a) => Math.min(m, a.order || 0), 0);
        art = { id: uid(), title, content, parasPerBlock: paras, created: Date.now(), bookmarkIndex: 0, translations: [], folder, order: minOrder - 1 };
        S.articles.unshift(art);
        const c = collapsedFolders(); c[folder] = false; lsSet(`collapsedFolders_${S.user}`, c);
    }
    Queue.push("saveArticle", { article: art });
    saveArticlesLocal();
    hide("custom-edit-modal");
    renderCustomArticles();
    showToast("文章已儲存");
};

Actions.deleteCustomArticle = async (arg) => {
    const art = S.articles[Number(arg)];
    if (!art || !(await UI.confirm("刪除文章", `確定要刪除「${art.title}」嗎？`, { okLabel: "刪除", danger: true }))) return;
    S.articles = S.articles.filter(a => a !== art);
    Queue.push("deleteArticles", { ids: [art.id] });
    saveArticlesLocal();
    renderCustomArticles();
    showToast("文章已刪除");
};

Actions.moveCustomArticle = (arg) => {
    const [i, dir] = arg.split(":").map(Number);
    const j = i + dir;
    if (j < 0 || j >= S.articles.length) return;
    [S.articles[i], S.articles[j]] = [S.articles[j], S.articles[i]];
    S.articles.forEach((a, k) => { a.order = k; });
    Queue.push("reorderArticles", { ids: S.articles.map(a => a.id) });
    saveArticlesLocal();
    renderCustomArticles();
};

// ---------- 群組管理 ----------
Actions.manageCustomFolders = () => { renderFolderManageList(); show("folder-manage-modal"); };

function renderFolderManageList() {
    const folders = getCustomFolders().filter(f => f !== UNSORTED);
    $("folder-manage-list").innerHTML = folders.length
        ? folders.map(f => `<div class="folder-row">
            <div class="name"><i class="fas fa-folder text-primary"></i> ${esc(f)}</div>
            <div class="flex-row" style="gap:8px;">
                <button class="btn-icon-small" data-action="actionRenameFolder" data-arg="${esc(f)}" title="重新命名"><i class="fas fa-pen"></i></button>
                <button class="btn-icon-small warn" data-action="actionDisbandFolder" data-arg="${esc(f)}" title="解散（文章移到未分類）"><i class="fas fa-box-open"></i></button>
                <button class="btn-icon-small danger" data-action="actionDeleteFolder" data-arg="${esc(f)}" title="刪除群組與文章"><i class="fas fa-trash-alt"></i></button>
            </div></div>`).join("")
        : '<div class="empty-state" style="padding:20px;"><p>目前沒有自訂群組</p></div>';
}

function setFolderList(list) { Store.setSettings({ folders: [...new Set(list)].filter(f => f && f !== UNSORTED) }); }

function moveArticlesToFolder(from, to) {
    const updates = [];
    S.articles.forEach(a => { if ((a.folder || UNSORTED) === from) { a.folder = to; updates.push({ id: a.id, fields: { folder: to } }); } });
    if (updates.length) Queue.push("updateArticles", { updates });
    saveArticlesLocal();
}

Actions.actionAddFolder = async () => {
    const name = await UI.prompt("新增群組", { placeholder: "群組名稱" });
    if (!name) return;
    if (getCustomFolders().includes(name)) { showToast("群組已存在", "error"); return; }
    setFolderList([...(S.settings.folders || []), name]);
    renderCustomArticles(); renderFolderManageList();
    showToast("已建立群組");
};

Actions.actionRenameFolder = async (folder) => {
    const name = await UI.prompt(`重新命名「${folder}」`, { value: folder });
    if (!name || name === folder) return;
    moveArticlesToFolder(folder, name);
    setFolderList((S.settings.folders || []).map(f => f === folder ? name : f).concat(name));
    renderCustomArticles(); renderFolderManageList();
    showToast("已重新命名");
};

Actions.actionDisbandFolder = async (folder) => {
    if (!(await UI.confirm("解散群組", `「${folder}」裡的文章會移到「${UNSORTED}」。`))) return;
    moveArticlesToFolder(folder, UNSORTED);
    setFolderList((S.settings.folders || []).filter(f => f !== folder));
    renderCustomArticles(); renderFolderManageList();
    showToast("群組已解散");
};

Actions.actionDeleteFolder = async (folder) => {
    const arts = S.articles.filter(a => (a.folder || UNSORTED) === folder);
    if (!(await UI.confirm("刪除群組", `確定要刪除「${folder}」以及裡面的 ${arts.length} 篇文章嗎？此操作無法復原！`, { okLabel: "刪除", danger: true }))) return;
    S.articles = S.articles.filter(a => !arts.includes(a));
    if (arts.length) Queue.push("deleteArticles", { ids: arts.map(a => a.id) });
    saveArticlesLocal();
    setFolderList((S.settings.folders || []).filter(f => f !== folder));
    renderCustomArticles(); renderFolderManageList();
    showToast("已刪除群組與文章");
};

// ---------- 閱讀器 ----------
Actions.openArticle = (arg) => openCustomReaderModal(Number(arg));
Actions.openPrevCustomArticle = () => openCustomReaderModal(currentArticleIndex - 1);
Actions.openNextCustomArticle = () => openCustomReaderModal(currentArticleIndex + 1);

async function openCustomReaderModal(index) {
    const art = S.articles[index];
    if (!art) return;
    TTS.stop();
    currentArticleIndex = index;
    $("custom-reader-title-display").textContent = art.title;
    $("custom-prev-btn").disabled = index === 0;
    $("custom-next-btn").disabled = index === S.articles.length - 1;
    show("custom-reader-modal");
    $("custom-reader-modal").scrollTop = 0;

    const paras = art.content.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    const blocks = splitBlocks(paras, art.parasPerBlock || 1);
    const cached = Array.isArray(art.translations) ? art.translations : [];
    const done = renderBilingual($("custom-reader-full"), blocks, {
        cached,
        bookmarkIndex: art.bookmarkIndex || 0,
        onBookmark: (i) => {
            art.bookmarkIndex = i;
            Queue.push("updateArticles", { updates: [{ id: art.id, fields: { bookmarkIndex: i } }] });
            saveArticlesLocal();
            showToast("已更新書籤位置");
        }
    });
    if (art.bookmarkIndex > 0) {
        setTimeout(() => { const el = $(`para-${art.bookmarkIndex}`); if (el) el.scrollIntoView({ behavior: "smooth" }); }, 300);
    }
    const results = await done;
    const fresh = results.some((t, i) => t && !cached[i]);
    if (fresh && S.articles.includes(art)) {
        art.translations = results.map(t => t || "");
        Queue.push("updateArticles", { updates: [{ id: art.id, fields: { translations: art.translations } }] });
        saveArticlesLocal();
    }
}

Actions.closeCustomReaderModal = () => { TTS.stop(); hide("custom-reader-modal"); hide("quick-add"); };

// ===================== AI 主題單字包 =====================
const TopicPack = { words: [], selected: new Set() };

Actions.openTopicPackerModal = () => {
    hide("topic-packer-result");
    $("topic-packer-keyword").value = "";
    refreshBookSelects();
    show("topic-packer-modal");
    $("topic-packer-keyword").focus();
};

Actions.generateTopicWordPack = async () => {
    const kw = $("topic-packer-keyword").value.trim();
    if (!kw) { showToast("請輸入領域關鍵字", "error"); return; }
    const count = Math.min(50, Math.max(1, parseInt($("topic-packer-count").value, 10) || 20));
    const btn = $("topic-packer-btn");
    setBusy(btn, true, `<i class="fas fa-spinner fa-spin"></i> AI 正在整理 ${count} 個「${esc(kw)}」單字...`);
    const prompt = `Generate exactly ${count} essential English vocabulary words for the topic: "${kw}". ` +
        `Return ONLY a JSON array of objects with keys "en" (English word or short phrase), "zh" (Traditional Chinese meaning) and ` +
        `"pos" (one of n., v., adj., adv., prep., conj., phr.). No markdown, no explanation.`;
    try {
        const res = await Api.call("gemini", { history: [{ role: "user", parts: [{ text: prompt }] }] });
        const text = res.text.replace(/```json/gi, "").replace(/```/g, "").trim();
        const start = text.indexOf("["), end = text.lastIndexOf("]");
        let words = [];
        try { words = JSON.parse(text.slice(start, end + 1)); } catch (e) { words = []; }
        words = words.filter(w => w && w.en && w.zh).map(w => ({ en: Words.normalizeEnglish(w.en), zh: String(w.zh).trim(), pos: POS_OPTIONS.some(p => p[0] === w.pos) ? w.pos : "" }));
        if (!words.length) { showToast("AI 回傳的格式無法解析，請再試一次", "error"); return; }
        TopicPack.words = words;
        TopicPack.selected = new Set(words.map((w, i) => i).filter(i => !Words.findAnywhere(words[i].en).length));
        renderTopicChips();
        show("topic-packer-result");
    } catch (e) {
        showToast("生成失敗：" + e.message, "error", 5000);
    } finally {
        setBusy(btn, false);
    }
};

function renderTopicChips() {
    const box = $("topic-packer-chips");
    box.innerHTML = TopicPack.words.map((w, i) => {
        const exists = Words.findAnywhere(w.en).length > 0;
        return `<div class="chip${TopicPack.selected.has(i) ? " selected" : ""}${exists ? " exists" : ""}" data-topic="${i}">${esc(w.en)}<small>${esc(w.zh)}</small></div>`;
    }).join("");
    const existing = TopicPack.words.filter(w => Words.findAnywhere(w.en).length).length;
    $("topic-packer-summary").textContent = `生成 ${TopicPack.words.length} 個單字${existing ? `（${existing} 個已在單字本中，預設不勾選）` : ""}，點選可切換。`;
    $("topic-packer-add").innerHTML = `<i class="fas fa-plus"></i> 加入 ${TopicPack.selected.size} 個單字`;
}

$("topic-packer-chips").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-topic]");
    if (!chip) return;
    const i = Number(chip.dataset.topic);
    if (TopicPack.selected.has(i)) TopicPack.selected.delete(i); else TopicPack.selected.add(i);
    renderTopicChips();
});

Actions.topicToggleAll = () => {
    const all = TopicPack.selected.size === TopicPack.words.length;
    TopicPack.selected = new Set(all ? [] : TopicPack.words.map((w, i) => i));
    renderTopicChips();
};

Actions.topicAddSelected = () => {
    const book = $("topic-packer-book").value || Store.defaultBook();
    const kw = $("topic-packer-keyword").value.trim();
    const list = [...TopicPack.selected].map(i => TopicPack.words[i])
        .filter(w => !Words.findDuplicate(w.en, book))
        .map(w => ({ book, english: w.en, chinese: w.zh, pos: w.pos, notes: kw ? `主題：${kw}` : "" }));
    if (!list.length) { showToast("沒有可加入的單字", "error"); return; }
    const added = Words.add(list);
    showToast(`已加入 ${added.length} 個單字到「${book}」`);
    TopicPack.selected.clear();
    renderTopicChips();
};
