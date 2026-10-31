// ===================== 雙語段落（新聞與自定義文章共用） =====================
function splitBlocks(paragraphs, perBlock) {
    const out = [];
    for (let i = 0; i < paragraphs.length; i += perBlock) out.push(paragraphs.slice(i, i + perBlock).join("\n\n"));
    return out;
}

// blocks: 外語段落；cached: 已有的翻譯；回傳 Promise<翻譯陣列>
function renderBilingual(container, blocks, { cached = [], bookmarkIndex = -1, onBookmark = null } = {}) {
    container.innerHTML = blocks.map((text, i) => `
        <div class="para" id="para-${i}">
            <p class="para-src">${makeClickable(text)}</p>
            <p class="para-zh" data-zh="${i}">${cached[i] ? esc(cached[i]) : '<span class="muted">翻譯中…</span>'}</p>
            <div class="para-tools">
                <button data-para-act="speak" data-i="${i}"><i class="icon-volume-2"></i> 朗讀</button>
                <button data-para-act="stop"><i class="icon-square"></i> 停止</button>
                ${onBookmark ? `<button class="bmk${i === bookmarkIndex ? " on" : ""}" data-para-act="bookmark" data-i="${i}"><i class="icon-bookmark"></i> 書籤</button>` : ""}
            </div>
        </div>`).join("");

    container.onclick = (e) => {
        const btn = e.target.closest("[data-para-act]");
        if (!btn) return;
        const i = Number(btn.dataset.i);
        if (btn.dataset.paraAct === "speak") TTS.say(blocks[i]);
        else if (btn.dataset.paraAct === "stop") TTS.stop();
        else if (onBookmark) { container.querySelectorAll(".bmk").forEach(b => b.classList.toggle("on", b === btn)); onBookmark(i); }
    };

    const results = [...cached];
    const run = limiter(3);
    return Promise.all(blocks.map((text, i) => cached[i] ? null : run(async () => {
        const el = container.querySelector(`[data-zh="${i}"]`);
        try { results[i] = await Svc.translate(text); if (el) el.textContent = results[i]; }
        catch (e) { if (el) el.textContent = "（翻譯暫時無法使用）"; }
    }))).then(() => results);
}

// ===================== 新聞 =====================
const News = { list: [], index: 0, kind: "article", lang: "" };

function refreshNewsOptions() {
    $("news-category").innerHTML = L().news.map(([v, label]) => `<option value="${v}">${label}</option>`).join("");
    $("news-source").textContent = "來源：" + L().newsSource;
    show("news-sentences", S.lang === "en");
}

Actions.loadNews = async (arg) => {
    const next = arg === "next";
    if (!next) setBusy($("btn-load-news"), true, "載入中…");
    try {
        if (!next || !News.list.length || News.lang !== S.lang) {
            const res = await Api.call("news", { lang: S.lang, section: $("news-category").value });
            News.kind = res.kind;
            News.lang = S.lang;
            News.list = res.kind === "article" ? shuffle(res.items.filter(i => i.body && i.body.length > 200)) : res.items;
            News.index = 0;
        } else {
            News.index = (News.index + 1) % News.list.length;
        }
        if (!News.list.length) { showToast("這個類別目前沒有內容", "error"); return; }
        $("news-modal-title").textContent = L().newsSource;
        if (News.kind === "article") renderNewsArticle(News.list[News.index]);
        else renderNewsDigest(News.list);
        show("news-modal");
        $("news-modal").scrollTop = 0;
    } catch (e) {
        showToast(e instanceof ServerError ? e.message : "新聞載入失敗，請檢查網路", "error");
    } finally {
        if (!next) setBusy($("btn-load-news"), false);
    }
};

function renderNewsArticle(item) {
    const doc = new DOMParser().parseFromString(item.body, "text/html");
    const paras = [...doc.querySelectorAll("p")].map(p => p.textContent.trim()).filter(p => p.length > 20);
    const blocks = splitBlocks(paras, Number($("news-sentences").value) || 1).slice(0, 15);
    $("news-modal-content").innerHTML = `
        <h1 class="reader-title">${makeClickable(item.title)}</h1>
        <p class="reader-title-zh" id="news-title-zh"></p>
        <div id="news-body"></div>
        <div class="row mt-24">
            <button class="btn" data-action="loadNews" data-arg="next">下一篇 <i class="icon-arrow-right"></i></button>
            <a class="link" href="${esc(item.url)}" target="_blank" rel="noopener">原文</a>
        </div>`;
    Svc.translate(item.title).then(t => { $("news-title-zh").textContent = t; }).catch(() => {});
    renderBilingual($("news-body"), blocks);
}

// 法文：頭條＋摘要，每則都有翻譯
function renderNewsDigest(items) {
    const box = $("news-modal-content");
    box.innerHTML = `<h1 class="reader-title">${esc(L().newsSource)}</h1><p class="reader-title-zh">今日頭條摘要，點任何字都能加入單字本。</p>` +
        items.map((it, i) => `<div class="digest-item">
            <h3>${makeClickable(it.title)}</h3>
            <p class="zh-title" data-tt="${i}"></p>
            <p class="para-src" style="font-size:1.05rem;">${makeClickable(it.summary)}</p>
            <p class="para-zh" data-ts="${i}"><span class="muted">翻譯中…</span></p>
            <div class="para-tools">
                <button data-digest-speak="${i}"><i class="icon-volume-2"></i> 朗讀</button>
                <a class="link small" href="${esc(it.url)}" target="_blank" rel="noopener">原文</a>
            </div></div>`).join("");
    box.onclick = (e) => {
        const b = e.target.closest("[data-digest-speak]");
        if (b) { const it = items[Number(b.dataset.digestSpeak)]; TTS.say(it.title + ". " + it.summary); }
    };
    const run = limiter(3);
    items.forEach((it, i) => {
        run(() => Svc.translate(it.title).then(t => { const el = box.querySelector(`[data-tt="${i}"]`); if (el) el.textContent = t; }).catch(() => {}));
        run(() => Svc.translate(it.summary).then(t => { const el = box.querySelector(`[data-ts="${i}"]`); if (el) el.textContent = t; }).catch(() => {}));
    });
}

Actions.closeNewsModal = () => { TTS.stop(); hide("news-modal"); Actions.closeQuickAdd(); };

// ===================== 自定義文章 =====================
let currentArticleIndex = -1;

function articlesKey() { return Store.k("articles_" + S.lang); }
function saveArticlesLocal() { lsSet(articlesKey(), S.articles); }

async function fetchCustomArticles() {
    const lang = S.lang;
    S.articles = lsGet(articlesKey(), []);
    renderCustomArticles();
    try {
        await Queue.flush();
        if (Queue.size()) return;
        const res = await Api.call("getArticles", { lang });
        if (lang !== S.lang) return;
        S.articles = res.articles;
        saveArticlesLocal();
        renderCustomArticles();
    } catch (e) { /* 離線時使用本機資料 */ }
}

function getCustomFolders() {
    const set = new Set([UNSORTED]);
    S.articles.forEach(a => set.add(a.folder || UNSORTED));
    (Store.get("folders", []) || []).forEach(f => set.add(f));
    return [...set];
}

function collapsedFolders() { return lsGet(`vocab_collapsed_${S.user}_${S.lang}`, {}); }

Actions.toggleFolder = (folder) => {
    const c = collapsedFolders();
    c[folder] = !c[folder];
    lsSet(`vocab_collapsed_${S.user}_${S.lang}`, c);
    renderCustomArticles();
};

function renderCustomArticles() {
    const list = $("custom-articles-list");
    if (!S.articles.length && !(Store.get("folders", []) || []).length) {
        list.innerHTML = '<div class="empty"><div class="serif">還沒有文章</div>貼上一篇喜歡的文章，逐段對照閱讀。</div>';
        return;
    }
    const folders = getCustomFolders();
    const collapsed = collapsedFolders();
    const single = folders.length === 1;
    let html = "";
    folders.forEach(folder => {
        const items = S.articles.map((a, idx) => ({ a, idx })).filter(x => (x.a.folder || UNSORTED) === folder);
        if (!items.length && folder === UNSORTED && !single) return;
        const closed = !single && collapsed[folder];
        if (!single) html += `<div class="folder-row" data-action="toggleFolder" data-arg="${esc(folder)}">
            <i class="${closed ? "icon-chevron-right" : "icon-chevron-down"} muted"></i><h3>${esc(folder)}</h3><span class="count">${items.length}</span></div>`;
        if (closed) return;
        html += `<div class="list">${items.length ? items.map(({ a, idx }) => `
            <div class="list-row">
                <div class="grow" data-action="openArticle" data-arg="${idx}">
                    <div class="title serif" style="font-size:1.1rem;">${esc(a.title)}</div>
                    <div class="meta">${a.created ? new Date(a.created).toLocaleDateString() : ""}${a.bookmarkIndex ? " · 讀到第 " + (a.bookmarkIndex + 1) + " 段" : ""}</div>
                </div>
                <button class="icon-btn" data-action="moveCustomArticle" data-arg="${idx}:-1" ${idx === 0 ? "disabled" : ""} title="上移"><i class="icon-arrow-up"></i></button>
                <button class="icon-btn" data-action="openCustomEditModal" data-arg="${idx}" title="編輯"><i class="icon-pencil"></i></button>
                <button class="icon-btn danger" data-action="deleteCustomArticle" data-arg="${idx}" title="刪除"><i class="icon-trash-2"></i></button>
            </div>`).join("") : '<p class="small muted" style="padding:12px 0;">這個群組沒有文章</p>'}</div>`;
    });
    list.innerHTML = html;
}

Actions.openCustomEditModal = (arg) => {
    const index = arg === undefined ? -1 : Number(arg);
    const sel = $("custom-edit-folder-select");
    sel.innerHTML = getCustomFolders().map(f => `<option value="${esc(f)}">${esc(f)}</option>`).join("") + '<option value="__NEW__">＋ 新群組…</option>';
    hide("custom-edit-folder-new");
    $("custom-edit-folder-new").value = "";
    const a = index >= 0 ? S.articles[index] : null;
    $("custom-edit-id").value = a ? index : "";
    $("custom-edit-title-h3").textContent = a ? "編輯文章" : `新${L().label}文章`;
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
        if (!folder) { showToast("請輸入群組名稱", "error"); return; }
    }
    if (!title || !content) { showToast("請輸入標題和內文", "error"); return; }
    const idxStr = $("custom-edit-id").value;
    let art;
    if (idxStr !== "") {
        art = S.articles[Number(idxStr)];
        if (art.content !== content || art.parasPerBlock !== paras) { art.translations = []; art.bookmarkIndex = 0; }
        Object.assign(art, { title, content, parasPerBlock: paras, folder });
    } else {
        const minOrder = S.articles.reduce((m, a) => Math.min(m, a.order || 0), 0);
        art = { id: uid(), lang: S.lang, title, content, parasPerBlock: paras, created: Date.now(), bookmarkIndex: 0, translations: [], folder, order: minOrder - 1 };
        S.articles.unshift(art);
    }
    Queue.push("saveArticle", { article: art });
    saveArticlesLocal();
    hide("custom-edit-modal");
    renderCustomArticles();
};

Actions.deleteCustomArticle = async (arg) => {
    const art = S.articles[Number(arg)];
    if (!art || !(await UI.confirm("刪除文章", `確定刪除「${art.title}」？`, { okLabel: "刪除", danger: true }))) return;
    S.articles = S.articles.filter(a => a !== art);
    Queue.push("deleteArticles", { ids: [art.id] });
    saveArticlesLocal();
    renderCustomArticles();
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

// ---------- 群組 ----------
Actions.manageCustomFolders = () => { renderFolderManageList(); show("folder-manage-modal"); };

function renderFolderManageList() {
    const folders = getCustomFolders().filter(f => f !== UNSORTED);
    $("folder-manage-list").innerHTML = folders.length
        ? `<div class="list">${folders.map(f => `<div class="list-row static">
            <div class="grow title">${esc(f)}</div>
            <button class="icon-btn" data-action="actionRenameFolder" data-arg="${esc(f)}" title="重新命名"><i class="icon-pencil"></i></button>
            <button class="icon-btn" data-action="actionDisbandFolder" data-arg="${esc(f)}" title="解散（文章移到未分類）"><i class="icon-undo-2"></i></button>
            <button class="icon-btn danger" data-action="actionDeleteFolder" data-arg="${esc(f)}" title="刪除群組與文章"><i class="icon-trash-2"></i></button>
          </div>`).join("")}</div>`
        : '<p class="muted small">還沒有自訂群組。</p>';
}

function setFolderList(list) { Store.set({ folders: [...new Set(list)].filter(f => f && f !== UNSORTED) }); }

function moveArticlesToFolder(from, to) {
    const updates = [];
    S.articles.forEach(a => { if ((a.folder || UNSORTED) === from) { a.folder = to; updates.push({ id: a.id, fields: { folder: to } }); } });
    if (updates.length) Queue.push("updateArticles", { updates });
    saveArticlesLocal();
}

Actions.actionAddFolder = async () => {
    const name = await UI.prompt("新群組", { placeholder: "名稱" });
    if (!name) return;
    if (getCustomFolders().includes(name)) { showToast("已經有這個群組", "error"); return; }
    setFolderList([...(Store.get("folders", []) || []), name]);
    renderCustomArticles(); renderFolderManageList();
};

Actions.actionRenameFolder = async (folder) => {
    const name = await UI.prompt("重新命名群組", { value: folder });
    if (!name || name === folder) return;
    moveArticlesToFolder(folder, name);
    setFolderList((Store.get("folders", []) || []).map(f => f === folder ? name : f).concat(name));
    renderCustomArticles(); renderFolderManageList();
};

Actions.actionDisbandFolder = async (folder) => {
    if (!(await UI.confirm("解散群組", `「${folder}」裡的文章會移到「${UNSORTED}」。`))) return;
    moveArticlesToFolder(folder, UNSORTED);
    setFolderList((Store.get("folders", []) || []).filter(f => f !== folder));
    renderCustomArticles(); renderFolderManageList();
};

Actions.actionDeleteFolder = async (folder) => {
    const arts = S.articles.filter(a => (a.folder || UNSORTED) === folder);
    if (!(await UI.confirm("刪除群組", `「${folder}」和裡面的 ${arts.length} 篇文章會一起刪除，無法復原。`, { okLabel: "刪除", danger: true }))) return;
    S.articles = S.articles.filter(a => !arts.includes(a));
    if (arts.length) Queue.push("deleteArticles", { ids: arts.map(a => a.id) });
    saveArticlesLocal();
    setFolderList((Store.get("folders", []) || []).filter(f => f !== folder));
    renderCustomArticles(); renderFolderManageList();
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
    const box = $("custom-reader-full");
    box.innerHTML = `<h1 class="reader-title">${esc(art.title)}</h1><div id="reader-body"></div>`;
    const done = renderBilingual($("reader-body"), blocks, {
        cached,
        bookmarkIndex: art.bookmarkIndex || 0,
        onBookmark: (i) => {
            art.bookmarkIndex = i;
            Queue.push("updateArticles", { updates: [{ id: art.id, fields: { bookmarkIndex: i } }] });
            saveArticlesLocal();
            showToast("已加書籤");
        }
    });
    if (art.bookmarkIndex > 0) setTimeout(() => { const el = $(`para-${art.bookmarkIndex}`); if (el) el.scrollIntoView({ behavior: "smooth" }); }, 300);
    const results = await done;
    if (results.some((t, i) => t && !cached[i]) && S.articles.includes(art)) {
        art.translations = results.map(t => t || "");
        Queue.push("updateArticles", { updates: [{ id: art.id, fields: { translations: art.translations } }] });
        saveArticlesLocal();
    }
}

Actions.closeCustomReaderModal = () => { TTS.stop(); hide("custom-reader-modal"); Actions.closeQuickAdd(); renderCustomArticles(); };

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
    if (!kw) { showToast("請輸入主題", "error"); return; }
    const count = Math.min(50, Math.max(1, parseInt($("topic-packer-count").value, 10) || 20));
    const btn = $("topic-packer-btn");
    setBusy(btn, true, "整理中…");
    const posCodes = L().pos.map(p => p[0]).join(", ");
    const prompt = S.lang === "fr"
        ? `Generate exactly ${count} essential French vocabulary words or short expressions for the topic: "${kw}". ` +
          `Return ONLY a JSON array of objects with keys "term" (French, include no article), "meaning" (Traditional Chinese) and "pos" (one of: ${posCodes}; nouns must be "n.m." or "n.f."). No markdown.`
        : `Generate exactly ${count} essential English vocabulary words or short phrases for the topic: "${kw}". ` +
          `Return ONLY a JSON array of objects with keys "term" (English), "meaning" (Traditional Chinese) and "pos" (one of: ${posCodes}). No markdown.`;
    try {
        const res = await Api.call("gemini", { history: [{ role: "user", parts: [{ text: prompt }] }] });
        const text = res.text.replace(/```json/gi, "").replace(/```/g, "").trim();
        let words = [];
        try { words = JSON.parse(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1)); } catch (e) { words = []; }
        words = words.filter(w => w && (w.term || w.en) && (w.meaning || w.zh)).map(w => ({
            term: Words.normalize(w.term || w.en), meaning: String(w.meaning || w.zh).trim(),
            pos: L().pos.some(p => p[0] === w.pos) ? w.pos : ""
        }));
        if (!words.length) { showToast("AI 回傳的內容無法解析，請再試一次", "error"); return; }
        TopicPack.words = words;
        TopicPack.selected = new Set(words.map((w, i) => i).filter(i => !Words.findAnywhere(words[i].term).length));
        renderTopicChips();
        show("topic-packer-result");
    } catch (e) {
        showToast("產生失敗：" + e.message, "error", 5000);
    } finally {
        setBusy(btn, false);
    }
};

function renderTopicChips() {
    $("topic-packer-chips").innerHTML = TopicPack.words.map((w, i) => {
        const exists = Words.findAnywhere(w.term).length > 0;
        return `<button class="chip${TopicPack.selected.has(i) ? " on" : ""}${exists ? " dim" : ""}" data-topic="${i}">${esc(w.term)}<small>${esc(w.meaning)}</small></button>`;
    }).join("");
    const existing = TopicPack.words.filter(w => Words.findAnywhere(w.term).length).length;
    $("topic-packer-summary").textContent = `共 ${TopicPack.words.length} 個${existing ? `，其中 ${existing} 個已收錄（預設不選）` : ""}。`;
    $("topic-packer-add").textContent = `加入 ${TopicPack.selected.size} 個`;
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
    const list = [...TopicPack.selected].map(i => TopicPack.words[i]).filter(w => !Words.findDuplicate(w.term, book))
        .map(w => ({ book, term: w.term, meaning: w.meaning, pos: w.pos, notes: kw ? `主題：${kw}` : "" }));
    if (!list.length) { showToast("沒有可加入的單字", "error"); return; }
    const added = Words.add(list);
    showToast(`已加入 ${added.length} 個字到「${book}」`);
    TopicPack.selected.clear();
    renderTopicChips();
    renderRecent();
};
