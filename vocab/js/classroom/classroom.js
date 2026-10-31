// ===================== 教室（法文、英文共用） =====================
const LEVEL_NAMES = { A0: "零基礎", A1: "入門", A2: "基礎", B1: "進階", B2: "中高級" };
const LEVELS = ["A0", "A1", "A2", "B1", "B2"];
const CJK = /[㐀-鿿]/;
const PASS_PCT = 70;

const CLASS_DATA = {
    fr: { course: FR_COURSE, grammar: FR_GRAMMAR, sounds: FR_SOUNDS, bank: FR_WORDBANK, verbs: true, eyebrow: "Français · 法文教室", title: "從零開始的法文課" },
    en: { course: EN_COURSE, grammar: EN_GRAMMAR, sounds: EN_SOUNDS, bank: EN_WORDBANK, verbs: false, eyebrow: "English · 英文教室", title: "把英文打穩" }
};

const Class = {
    tab: "course",
    lesson: null,       // 目前開啟的課（也可能是測驗、文法練習、錯題重練）
    verb: null,
    chapter: null,
    bankOpen: null,

    data() { return CLASS_DATA[S.lang]; },
    course() { return Class.data().course; },
    progress() { return Store.get("class", { done: {}, scores: {}, last: "" }) || { done: {}, scores: {}, last: "" }; },
    saveProgress(p) { Store.set({ class: p }); },
    index(id) { return Class.course().findIndex(l => l.id === id); },
    lessonsOf(level) { return Class.course().filter(l => l.level === level); },
    levels() { return LEVELS.filter(lv => Class.lessonsOf(lv).length); },

    // **粗體**、換行
    rich(text) { return esc(text).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>"); },

    // 朗讀用：清掉中文與括號註解
    speakable(s) { return String(s).replace(/（[^）]*）|\([^)]*\)/g, "").replace(/[㐀-鿿]+/g, " ").replace(/\s+/g, " ").trim(); },

    // 去掉冠詞存進單字本：「le nom」→ nom、「l'ami」→ ami；英文不處理
    bare(term) {
        if (S.lang !== "fr") return String(term).trim();
        return String(term).replace(/^(le|la|les|un|une|des)\s+/i, "").replace(/^l['’]/i, "").trim();
    },

    bookName(lesson) { return `教室 ${lesson.level}`; },

    // 一課的標籤，例如「A1 第 3 課」
    lessonLabel(l) { return `${l.level} 第 ${Class.index(l.id) + 1} 課`; }
};

// ---------- 首頁 ----------
Actions.classTab = (tab) => {
    if (tab === "verbs" && !Class.data().verbs) tab = "course";
    Class.tab = tab;
    document.querySelectorAll("#class-tabs button").forEach(b => b.classList.toggle("on", b.dataset.arg === tab));
    ["course", "grammar", "verbs", "bank", "sounds"].forEach(t => show("class-" + t, t === tab));
    if (tab === "grammar") renderGrammarList();
    if (tab === "verbs") renderVerbList();
    if (tab === "bank") renderBank();
    if (tab === "sounds") renderSounds();
};

// 單元：每 4 課一次單元測驗，每個級別結束有級別考試（A0 不考）
function courseUnits(level) {
    const list = Class.lessonsOf(level);
    const out = [];
    for (let u = 0; u * 4 < list.length; u++) {
        const lessons = list.slice(u * 4, u * 4 + 4);
        out.push({ lessons, test: level !== "A0" && lessons.length >= 2 ? { id: `test-${level}-${u + 1}`, title: `單元測驗 ${u + 1}`, sub: `第 ${Class.index(lessons[0].id) + 1}–${Class.index(lessons[lessons.length - 1].id) + 1} 課` } : null });
    }
    return out;
}

function renderClassHome() {
    const d = Class.data();
    const course = d.course;
    $("class-eyebrow").textContent = d.eyebrow;
    $("class-title").textContent = d.title;
    show($("class-tabs").querySelector('[data-arg="verbs"]'), d.verbs);
    if (Class.tab === "verbs" && !d.verbs) Class.tab = "course";
    const p = Class.progress();
    const done = course.filter(l => p.done[l.id]).length;
    const next = course.find(l => l.id === p.last && !p.done[l.id]) || course.find(l => !p.done[l.id]) || course[0];
    $("class-progress").textContent = `已完成 ${done} / ${course.length} 課`;
    $("class-progress-bar").style.width = `${Math.round(done / Math.max(1, course.length) * 100)}%`;
    $("class-continue").innerHTML = next ? `<span class="muted small">${Class.lessonLabel(next)}</span> <b>${esc(next.title)}</b>` : "";
    $("class-continue").dataset.arg = next ? next.id : "";

    const testRow = (t) => {
        const score = p.scores[t.id];
        return `<div class="list-row test-row" data-action="openTest" data-arg="${t.id}">
            <span class="lesson-no"><i class="icon-clipboard-check"></i></span>
            <div class="grow"><div class="title">${esc(t.title)}</div><div class="meta">${esc(t.sub)} · ${PASS_PCT}% 通過</div></div>
            <span class="meta">${p.done[t.id] ? '<i class="icon-check" style="color:var(--good)"></i>' : (score !== undefined ? score + "%" : "")}</span>
        </div>`;
    };
    let html = "";
    Class.levels().forEach(level => {
        const list = Class.lessonsOf(level);
        const n = list.filter(l => p.done[l.id]).length;
        html += `<div class="level-head"><span class="serif">${level}</span><span class="muted small">${LEVEL_NAMES[level]} · ${n}/${list.length}</span></div><div class="list">`;
        courseUnits(level).forEach(unit => {
            html += unit.lessons.map(l => {
                const score = p.scores[l.id];
                return `<div class="list-row" data-action="openLesson" data-arg="${l.id}">
                    <span class="lesson-no">${Class.index(l.id) + 1}</span>
                    <div class="grow"><div class="title">${esc(l.title)}</div><div class="meta serif">${esc(l.fr)}</div></div>
                    <span class="meta">${p.done[l.id] ? '<i class="icon-check" style="color:var(--good)"></i>' : (score !== undefined ? score + "%" : "")}</span>
                </div>`;
            }).join("");
            if (unit.test) html += testRow(unit.test);
        });
        if (level !== "A0") html += testRow({ id: `exam-${level}`, title: `${level} 級別考試`, sub: `${list.length} 課綜合` });
        html += `</div>`;
    });
    $("class-course").querySelector(".course-list").innerHTML = html;
    Actions.classTab(Class.tab);
}

// ---------- 課程頁 ----------
Actions.openLesson = (id) => {
    const lesson = Class.course().find(l => l.id === id);
    if (!lesson) return;
    const p = Class.progress();
    if (p.last !== id) { p.last = id; Class.saveProgress(p); }
    openLessonPage(lesson);
};

function openLessonPage(lesson) {
    Class.lesson = lesson;
    renderLesson(lesson);
    App.go("sec-lesson");
}

Actions.continueLesson = () => { const id = $("class-continue").dataset.arg; if (id) Actions.openLesson(id); };
Actions.backToVerbs = () => { App.go("sec-class"); Actions.classTab("verbs"); };

Actions.lessonBack = () => {
    const kind = Class.lesson && Class.lesson.kind;
    if (kind === "mistakes") { App.go("sec-practice"); Actions.practiceTab("mistakes"); }
    else if (kind === "grammar") Actions.openGrammar(Class.lesson.chapter);
    else if (kind === "bank") { App.go("sec-class"); Actions.classTab("bank"); }
    else App.go("sec-class");
};

Actions.lessonNav = (dir) => {
    const course = Class.course();
    const i = Class.index(Class.lesson.id) + Number(dir);
    if (course[i]) Actions.openLesson(course[i].id);
};

function speakBtn(text) { return `<button class="icon-btn sm" data-say="${esc(Class.speakable(text))}" title="朗讀"><i class="icon-volume-2"></i></button>`; }

// 例句右側的小工具：跟讀、存成句子卡
function lineTools(text, zh) {
    const t = esc(Class.speakable(text));
    return `<span class="line-tools"><button class="icon-btn sm" data-shadow="${t}" data-zh="${esc(zh || "")}" title="跟讀"><i class="icon-mic"></i></button><button class="icon-btn sm" data-save-sent="${t}" data-zh="${esc(zh || "")}" title="存成句子卡"><i class="icon-bookmark-plus"></i></button></span>`;
}

function exampleRow([text, zh]) {
    return `<div class="ex">${speakBtn(text)}<div class="grow"><div class="ex-fr">${makeClickable(text)}</div><div class="ex-zh">${esc(zh)}</div></div>${lineTools(text, zh)}</div>`;
}

function grammarTable(tb) {
    return `<div class="table-wrap"><table class="gtable">${tb.map((row, r) => `<tr>${row.map(c => r === 0 ? `<th>${Class.rich(c)}</th>` : `<td>${CJK.test(c) ? Class.rich(c) : `<span class="cw-line" data-say="${esc(Class.speakable(c))}">${Class.rich(c)}</span>`}</td>`).join("")}</tr>`).join("")}</table></div>`;
}

function renderLesson(L) {
    const special = !!L.kind;
    const course = Class.course();
    const i = Class.index(L.id);
    const p = Class.progress();
    $("lesson-eyebrow").textContent = special ? (L.eyebrow || "") : `${L.level} ${LEVEL_NAMES[L.level]} · 第 ${i + 1} 課`;
    $("lesson-title").textContent = L.title;
    $("lesson-fr").textContent = L.fr || "";
    $("lesson-goal").textContent = L.goal || "";
    show("lesson-prev", !special);
    show("lesson-next", !special);
    $("lesson-prev").disabled = i <= 0;
    $("lesson-next").disabled = i === course.length - 1;

    // 相關文法章節
    const refs = special ? [] : Class.data().grammar.filter(c => (c.lessons || []).includes(L.id));
    $("lesson-gref").innerHTML = refs.length ? `<span class="small muted">先讀懂文法：</span>${refs.map(c => `<button class="link small" data-action="openGrammar" data-arg="${c.id}">${esc(c.title)}</button>`).join("")}` : "";
    show("lesson-gref", refs.length > 0);

    // 文法
    $("lesson-grammar").innerHTML = (L.grammar || []).map(g => `
        <div class="gp">
            <h3 class="gp-title">${esc(g.t)}</h3>
            ${g.d ? `<p class="gp-body">${Class.rich(g.d)}</p>` : ""}
            ${g.tb ? grammarTable(g.tb) : ""}
            ${(g.ex || []).map(exampleRow).join("")}
        </div>`).join("");
    show("lesson-grammar-block", (L.grammar || []).length > 0);

    // 單字
    $("lesson-vocab").innerHTML = (L.vocab || []).map((v, k) => `
        <div class="vocab-row">
            ${speakBtn(v[0])}
            <div class="grow"><span class="serif vocab-term">${esc(v[0])}</span> <span class="small">${posLabel(v[2] || "")}</span><div class="small muted">${esc(v[1])}</div></div>
            <button class="icon-btn" data-vocab-add="${k}" title="加入單字本"><i class="${Words.findAnywhere(Class.bare(v[0])).length ? "icon-check" : "icon-plus"}"></i></button>
        </div>`).join("");
    show("lesson-vocab-block", (L.vocab || []).length > 0);

    // 對話
    $("lesson-dialog").innerHTML = (L.dialog || []).map(([who, text, zh]) => `
        <div class="dl-line">
            <span class="dl-who">${esc(who)}</span>
            <div class="grow"><div class="ex-fr">${makeClickable(text)}</div><div class="ex-zh dl-zh">${esc(zh)}</div></div>
            ${speakBtn(text)}${lineTools(text, zh)}
        </div>`).join("");
    show("lesson-dialog-block", (L.dialog || []).length > 0);
    $("lesson-culture").innerHTML = L.culture ? `<p class="eyebrow mb-8">小知識</p><p class="small">${Class.rich(L.culture)}</p>` : "";
    show("lesson-culture", !!L.culture);
    // 本課重點（練習前複習一次）
    const recap = special ? null : LESSON_RECAPS[L.id];
    $("lesson-recap").innerHTML = recap ? `<div class="block-head"><h2>本課重點</h2></div><ol>${recap.map(t => `<li>${Class.rich(t)}</li>`).join("")}</ol>` : "";
    show("lesson-recap", !!recap);

    renderExercises(L);
    $("lesson-done").innerHTML = p.done[L.id] ? '<i class="icon-check"></i> 已完成，再次標記' : "完成本課";
    show("lesson-done-block", !special);
    window.scrollTo({ top: 0 });
}

// 朗讀（教室、練習、閃卡共用）
document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-say]");
    if (!b || e.target.closest(".cw")) return;
    TTS.say(b.dataset.say, L().tts);
});

Actions.playDialog = () => {
    const lines = (Class.lesson.dialog || []).map(d => Class.speakable(d[1]));
    let i = 0;
    TTS.stop();
    const next = () => { if (i < lines.length && App.current === "sec-lesson") TTS.speak(lines[i++], { lang: L().tts, rate: 0.9, onend: () => setTimeout(next, 350) }); };
    next();
};

Actions.toggleDialogZh = (arg, btn) => {
    const box = $("lesson-dialog");
    box.classList.toggle("hide-zh");
    btn.textContent = box.classList.contains("hide-zh") ? "顯示翻譯" : "隱藏翻譯";
};

// 單字加入單字本
function addVocabTo(book, list, notes) {
    if (!Store.books().includes(book)) Store.saveBookOrder([...Store.books(), book]);
    const fresh = list.filter(v => !Words.findDuplicate(Class.bare(v[0]), book))
        .map(v => ({ book, term: Class.bare(v[0]), meaning: v[1], pos: v[2] || "", notes }));
    const added = Words.add(fresh);
    refreshBookSelects();
    return added.length;
}

function addLessonVocab(list) {
    return addVocabTo(Class.bookName(Class.lesson), list, `${Class.lessonLabel(Class.lesson)}：${Class.lesson.title}`);
}

$("lesson-vocab").addEventListener("click", (e) => {
    const b = e.target.closest("[data-vocab-add]");
    if (!b) return;
    const v = Class.lesson.vocab[Number(b.dataset.vocabAdd)];
    const n = addLessonVocab([v]);
    b.innerHTML = '<i class="icon-check"></i>';
    showToast(n ? `已加入「${Class.bookName(Class.lesson)}」` : "已經在單字本裡了");
});

Actions.addAllLessonVocab = () => {
    const n = addLessonVocab(Class.lesson.vocab || []);
    showToast(n ? `已加入 ${n} 個字到「${Class.bookName(Class.lesson)}」，會出現在每日複習` : "這課的單字都已經加入了");
    renderLesson(Class.lesson);
};

Actions.lessonDone = () => {
    const p = Class.progress();
    p.done[Class.lesson.id] = true;
    Class.saveProgress(p);
    Goals.mark();
    showToast("完成本課");
    const course = Class.course();
    const i = Class.index(Class.lesson.id);
    if (course[i + 1]) Actions.openLesson(course[i + 1].id);
    else App.go("sec-class");
};

// ---------- 測驗 ----------
// 從課程的練習與單字隨機出題；每次重做都會換題
function vocabQuestions(vocab, n) {
    const uniq = [...new Map(vocab.map(v => [v[1], v])).values()];
    if (uniq.length < 4) return [];
    return shuffle(uniq).slice(0, n).map((q, k) => {
        const opts = shuffle([q, ...shuffle(uniq.filter(v => v !== q)).slice(0, 3)]);
        return k % 2
            ? ["c", `「${q[1]}」是哪一個？`, opts.map(o => o[0]), opts.indexOf(q), "選出正確的單字"]
            : ["c", q[0], opts.map(o => o[1]), opts.indexOf(q), "選出正確的意思"];
    });
}

function buildTest(id) {
    const m = id.match(/^(test|exam)-(A\d|B\d)(?:-(\d+))?$/);
    if (!m) return null;
    const [, kind, level, unit] = m;
    const all = Class.lessonsOf(level);
    const lessons = kind === "exam" ? all : all.slice((unit - 1) * 4, unit * 4);
    if (!lessons.length) return null;
    const nEx = kind === "exam" ? 20 : 10;
    const nVocab = kind === "exam" ? 10 : 5;
    const ex = shuffle(lessons.flatMap(l => l.ex || [])).slice(0, nEx);
    const items = shuffle([...ex, ...vocabQuestions(lessons.flatMap(l => l.vocab || []), nVocab)]);
    const first = Class.index(lessons[0].id) + 1, last = Class.index(lessons[lessons.length - 1].id) + 1;
    return {
        id, kind: "test", level,
        eyebrow: `${level} ${LEVEL_NAMES[level]} · ${kind === "exam" ? "級別考試" : "單元測驗"}`,
        title: kind === "exam" ? `${level} 級別考試` : `單元測驗 ${unit}`,
        goal: `範圍：第 ${first}–${last} 課，共 ${items.length} 題，答對 ${PASS_PCT}% 以上就通過。每次重做都會換題。`,
        src: kind === "exam" ? `${level} 級別考試` : `${level} 單元測驗 ${unit}`,
        ex: items
    };
}

Actions.openTest = (id) => {
    const t = buildTest(id);
    if (t) openLessonPage(t);
};

// ---------- 練習 ----------
// c：選擇 [c, 題目, 選項, 答案索引, 中文]；f：填空 [f, 題目, 答案(或陣列), 中文]
// o：重組 [o, "正確 / 順序 / 的 / 詞", 中文]；t：中翻外 [t, 中文, 答案(或陣列)]；l：聽寫 [l, 外文, 中文]
const Ex = { items: [], answers: [] };

function normAnswer(s) {
    return foldAccents(String(s || "")).replace(/[’]/g, "'").replace(/[.,!?;:«»"]/g, " ").replace(/\s+/g, " ").trim();
}

// 「allé(e)(s)」展開成 allé、allée、allés、allées（錯題本裡的動詞題用）
function optionalForms(s) {
    return String(s).split(/(\([es]\))/).reduce((acc, part) =>
        /^\([es]\)$/.test(part) ? acc.flatMap(a => [a, a + part[1]]) : acc.map(a => a + part), [""]);
}

// 題目的正確答案（顯示用）
function exAnswer(x) {
    if (x[0] === "c") {
        // 兩個空格的題目，選項寫成「had / left」，依序填入
        const opt = x[2][x[3]];
        const blanks = (x[1].match(/_{2,}/g) || []).length;
        if (!blanks) return opt;
        const parts = blanks > 1 ? opt.split(" / ") : [opt];
        let k = 0;
        return x[1].replace(/_{2,}/g, () => parts[Math.min(k++, parts.length - 1)]);
    }
    if (x[0] === "o") return x[1].split(" / ").join(" ").replace(/\s+([,.!?])/g, "$1");
    if (x[0] === "l") return x[1];
    const first = [].concat(x[2])[0];
    // 填空題去掉括號裡的提示，例如「He ___ (not / like) coffee.」
    return x[0] === "f" ? x[1].replace(/_{2,}/, first).replace(/\s*[（(][^）)]*[）)]/g, "") : first;
}

// 題目文字（錯題本列表用）
function exPrompt(x) {
    if (x[0] === "l") return `聽寫：${x[2]}`;
    if (x[0] === "o") return `重組：${x[2]}`;
    if (x[0] === "t") return x[1];
    return x[1];
}

function renderExercises(L) {
    Ex.items = L.ex || [];
    Ex.answers = Ex.items.map(() => null);
    const blank = (q) => esc(q).replace(/_{2,}/g, '<span class="blank">＿＿</span>');
    const placeholder = `用${LANGS[S.lang].label}寫`;
    $("lesson-ex").innerHTML = Ex.items.map((x, i) => {
        const n = `<span class="ex-no">${i + 1}</span>`;
        let body = "";
        // 選項每次打亂順序顯示，data-opt 仍是原本的索引
        if (x[0] === "c") body = `<div class="ex-q ${CJK.test(x[1]) ? "" : "serif"}">${blank(x[1])}</div><div class="chips mt-8">${shuffle(x[2].map((o, k) => ({ o, k }))).map(({ o, k }) => `<button class="chip" data-ex="${i}" data-opt="${k}">${esc(o)}</button>`).join("")}</div>`;
        else if (x[0] === "f") body = `<div class="ex-q serif">${blank(x[1])}</div><input type="text" class="ex-input" data-ex-input="${i}" autocapitalize="off" spellcheck="false">`;
        else if (x[0] === "o") {
            const words = x[1].split(" / ");
            body = `<div class="order-answer" data-order-answer="${i}"></div><div class="chips mt-8" data-order-pool="${i}">${shuffle(words.map((w, k) => ({ w, k }))).map(o => `<button class="chip" data-order="${i}" data-w="${esc(o.w)}">${esc(o.w)}</button>`).join("")}</div>`;
        }
        else if (x[0] === "t") body = `<div class="ex-q">${esc(x[1])}</div><input type="text" class="ex-input" data-ex-input="${i}" autocapitalize="off" spellcheck="false" placeholder="${placeholder}">`;
        else if (x[0] === "l") body = `<div class="ex-q"><button class="btn sm" data-say="${esc(x[1])}"><i class="icon-volume-2"></i> 播放</button> <span class="small muted">聽寫下聽到的句子</span></div><input type="text" class="ex-input" data-ex-input="${i}" autocapitalize="off" spellcheck="false">`;
        const zhText = x[0] === "c" ? x[4] : (x[0] === "o" || x[0] === "l") ? x[2] : x[3];
        const zh = x[0] === "t" || x[0] === "l" || !zhText ? "" : `<div class="ex-zh">${esc(zhText)}</div>`;
        return `<div class="exercise" data-ex-box="${i}">${n}<div class="grow">${body}${zh}<div class="ex-feedback" data-ex-fb="${i}"></div></div></div>`;
    }).join("");
    const accents = LANGS[S.lang].accents;
    $("lesson-ex-keys").innerHTML = accents.map(c => `<button type="button">${c}</button>`).join("");
    show("lesson-ex-keys", accents.length > 0);
    $("lesson-ex-score").textContent = "";
    $("lesson-ex-title").textContent = L.kind === "test" ? "題目" : L.kind === "mistakes" ? "錯題" : "練習";
    show("lesson-quiz-btn", (L.vocab || []).length >= 4);
    show("lesson-ex-block", Ex.items.length > 0);
}

// 重音鍵盤輸入到目前聚焦的練習框
document.addEventListener("focusin", (e) => {
    if (e.target.matches && e.target.matches(".ex-input")) $("lesson-ex-keys").dataset.target = e.target.id || (e.target.id = "exi-" + uid());
});

$("lesson-ex").addEventListener("click", (e) => {
    const opt = e.target.closest("[data-opt]");
    if (opt) {
        const i = Number(opt.dataset.ex);
        opt.parentElement.querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c === opt));
        Ex.answers[i] = Number(opt.dataset.opt);
        return;
    }
    const w = e.target.closest("[data-order]");
    if (w) {
        const i = w.dataset.order;
        const ans = document.querySelector(`[data-order-answer="${i}"]`);
        if (w.parentElement === ans) document.querySelector(`[data-order-pool="${i}"]`).appendChild(w);
        else ans.appendChild(w);
    }
});

Actions.checkExercises = () => {
    const L = Class.lesson;
    let correct = 0;
    const plain = (s) => String(s).toLowerCase().replace(/[’]/g, "'").replace(/[.,!?;:«»"]/g, " ").replace(/\s+/g, " ").trim();
    Ex.items.forEach((x, i) => {
        const fb = document.querySelector(`[data-ex-fb="${i}"]`);
        const box = document.querySelector(`[data-ex-box="${i}"]`);
        let ok = false, accentSlip = false, typed = "";
        const right = exAnswer(x);
        if (x[0] === "c") ok = Ex.answers[i] === x[3];
        else if (x[0] === "o") {
            typed = [...document.querySelectorAll(`[data-order-answer="${i}"] .chip`)].map(c => c.dataset.w).join(" ");
            ok = normAnswer(typed) === normAnswer(x[1].split(" / ").join(" "));
        } else {
            typed = document.querySelector(`[data-ex-input="${i}"]`).value;
            const accepted = x[0] === "l" ? [x[1]] : [].concat(x[2]).flatMap(optionalForms);
            ok = accepted.some(a => normAnswer(a) === normAnswer(typed));
            // 只差重音也算對，但提醒
            accentSlip = ok && !accepted.some(a => plain(a) === plain(typed));
        }
        if (ok) correct++;
        box.classList.toggle("ok", ok);
        box.classList.toggle("bad", !ok);
        fb.innerHTML = ok
            ? `<span class="verdict ${accentSlip ? "warn" : "good"}">${accentSlip ? "正確，注意重音" : "正確"}</span> <span class="serif">${accentSlip ? esc(right) : ""}</span> ${speakBtn(right)}`
            : `<span class="verdict bad">答案</span> <span class="serif">${esc(right)}</span> ${speakBtn(right)}`;
        // 錯題本：答錯就記下來；在錯題重練裡答對就移除
        if (L.kind === "mistakes") { if (ok) Mistakes.remove(x); }
        else if (!ok) Mistakes.add(x, L.src || (L.kind ? L.title : `${Class.lessonLabel(L)}：${L.title}`));
    });
    const pct = Math.round(correct / Math.max(1, Ex.items.length) * 100);
    $("lesson-ex-score").textContent = `${correct} / ${Ex.items.length} 題正確（${pct}%）`;
    if (L.kind === "mistakes") { Goals.mark(); return; }
    if (L.kind === "grammar" || L.kind === "bank") return;
    const p = Class.progress();
    if (p.scores[L.id] === undefined || pct > p.scores[L.id]) p.scores[L.id] = pct;
    if (L.kind === "test") {
        Goals.mark();
        if (pct >= PASS_PCT) { p.done[L.id] = true; UI.alert("通過", `${L.title}：${pct}%。${pct < 100 ? "答錯的題目已放進錯題本。" : ""}`); }
        else UI.alert("再加油", `${L.title}：${pct}%，需要 ${PASS_PCT}% 才通過。答錯的題目已放進錯題本，可以先複習再重做。`);
    }
    Class.saveProgress(p);
};

Actions.resetExercises = () => {
    const L = Class.lesson;
    if (L.kind === "test") { Class.lesson = buildTest(L.id); renderLesson(Class.lesson); }
    else if (L.kind === "mistakes") Actions.redoMistakes();
    else renderExercises(L);
};

// 單字快問：從一組單字出 5 題選擇題
function vocabQuiz(vocab) {
    if (vocab.length < 4) return;
    const qs = shuffle(vocab).slice(0, Math.min(5, vocab.length));
    let i = 0, score = 0;
    const ask = () => {
        if (i >= qs.length) { UI.alert("單字快問", `答對 ${score} / ${qs.length} 題`); return; }
        const q = qs[i];
        const options = shuffle([q, ...shuffle(vocab.filter(v => v !== q && v[1] !== q[1])).slice(0, 3)]);
        TTS.say(Class.speakable(q[0]), L().tts);
        UI.choose(`${i + 1}. ${q[0]}`, options.map(o => ({ label: o[1], value: o === q })), { message: "選出正確的意思" }).then(v => {
            if (v === null) return;
            if (v) score++;
            else Mistakes.add(["c", q[0], options.map(o => o[1]), options.indexOf(q), "選出正確的意思"], "單字快問");
            showToast(v ? "正確" : `答案：${q[1]}`, v ? "success" : "error", 1500);
            i++;
            setTimeout(ask, v ? 300 : 900);
        });
    };
    ask();
}

Actions.vocabQuiz = () => vocabQuiz(Class.lesson.vocab || []);

// ---------- 文法 ----------
const GRAMMAR_GROUPS = { intro: "基礎觀念（建議先讀）", A1: "A1 入門", A2: "A2 基礎", B1: "B1 進階", B2: "B2 中高級" };

function renderGrammarList() {
    const chapters = Class.data().grammar;
    const read = Store.get("grammarRead", {}) || {};
    $("class-grammar").innerHTML = `<p class="small muted mb-8">每一章從觀念講起，配合表格和可以聽的例句。上課看不懂時，先讀對應的章節。</p>` +
        Object.entries(GRAMMAR_GROUPS).map(([g, name]) => {
            const list = chapters.filter(c => c.level === g);
            if (!list.length) return "";
            return `<div class="level-head"><span class="small muted">${name}</span></div><div class="list">${list.map(c => `
                <div class="list-row" data-action="openGrammar" data-arg="${c.id}">
                    <span class="lesson-no">${chapters.indexOf(c) + 1}</span>
                    <div class="grow"><div class="title">${esc(c.title)}</div><div class="meta">${esc(c.sub || "")}</div></div>
                    <span class="meta">${read[c.id] ? '<i class="icon-check" style="color:var(--good)"></i>' : ""}</span>
                </div>`).join("")}</div>`;
        }).join("");
}

Actions.openGrammar = (id) => {
    const chapters = Class.data().grammar;
    const c = chapters.find(x => x.id === id);
    if (!c) return;
    Class.chapter = c;
    const i = chapters.indexOf(c);
    $("grammar-eyebrow").textContent = `${GRAMMAR_GROUPS[c.level] || c.level} · 第 ${i + 1} 章`;
    $("grammar-title").textContent = c.title;
    $("grammar-sub").textContent = c.sub || "";
    $("grammar-prev").disabled = i === 0;
    $("grammar-next").disabled = i === chapters.length - 1;
    const lessons = (c.lessons || []).map(lid => Class.course().find(l => l.id === lid)).filter(Boolean);
    $("grammar-body").innerHTML = (c.body || []).map(s => `
        <div class="gsec">
            ${s.h ? `<h2 class="gsec-title">${esc(s.h)}</h2>` : ""}
            ${s.p ? `<p class="gp-body">${Class.rich(s.p)}</p>` : ""}
            ${s.tb ? grammarTable(s.tb) : ""}
            ${(s.ex || []).map(exampleRow).join("")}
            ${s.tip ? `<div class="gtip"><b>${s.warn ? "常見錯誤" : "小提醒"}</b>${Class.rich(s.tip)}</div>` : ""}
        </div>`).join("") +
        ((c.ex || []).length ? `<div class="block"><button class="btn primary" data-action="grammarPractice"><i class="icon-pencil"></i> 練習這一章（${c.ex.length} 題）</button></div>` : "") +
        (lessons.length ? `<div class="block"><p class="eyebrow mb-8">相關課程</p><div class="list">${lessons.map(l => `<div class="list-row" data-action="openLesson" data-arg="${l.id}"><div class="grow"><div class="title">${esc(l.title)}</div><div class="meta">${Class.lessonLabel(l)}</div></div><i class="icon-chevron-right chev"></i></div>`).join("")}</div></div>` : "");
    const read = Store.get("grammarRead", {}) || {};
    if (!read[c.id]) { read[c.id] = true; Store.set({ grammarRead: read }); }
    App.go("sec-grammar");
};

Actions.grammarNav = (dir) => {
    const chapters = Class.data().grammar;
    const c = chapters[chapters.indexOf(Class.chapter) + Number(dir)];
    if (c) Actions.openGrammar(c.id);
};

Actions.backToGrammar = () => { App.go("sec-class"); Actions.classTab("grammar"); };

Actions.grammarPractice = () => {
    const c = Class.chapter;
    openLessonPage({ id: "g-" + c.id, kind: "grammar", chapter: c.id, eyebrow: "文法練習", title: c.title, goal: c.sub || "", src: `文法：${c.title}`, ex: shuffle(c.ex) });
};

// ---------- 主題單字庫 ----------
function renderBank() {
    const bank = Class.data().bank;
    const box = $("class-bank");
    if (Class.bankOpen !== null && bank[Class.bankOpen]) {
        const t = bank[Class.bankOpen];
        box.innerHTML = `<div class="row mb-8"><button class="link small" data-action="bankBack"><i class="icon-arrow-left"></i> 所有主題</button><span class="grow"></span>
                <button class="link small" data-action="bankQuiz">快問</button><button class="link small" data-action="bankAddAll"><i class="icon-plus"></i> 全部加入</button></div>
            <div class="level-head"><span class="serif">${esc(t.theme)}</span><span class="muted small">${t.level} · ${t.words.length} 個</span></div>
            <div>${t.words.map((v, k) => `<div class="vocab-row">${speakBtn(v[0])}
                <div class="grow"><span class="serif vocab-term">${esc(v[0])}</span> <span class="small">${posLabel(v[2] || "")}</span><div class="small muted">${esc(v[1])}</div></div>
                <button class="icon-btn" data-bank-add="${k}" title="加入單字本"><i class="${Words.findAnywhere(Class.bare(v[0])).length ? "icon-check" : "icon-plus"}"></i></button></div>`).join("")}</div>`;
        return;
    }
    const total = bank.reduce((s, t) => s + t.words.length, 0);
    box.innerHTML = `<p class="small muted mb-8">依主題與程度整理的常用字，共 ${bank.length} 個主題、${total} 個字。加入後會進入每日複習。</p>` +
        LEVELS.map(level => {
            const list = bank.map((t, i) => ({ t, i })).filter(x => x.t.level === level);
            if (!list.length) return "";
            return `<div class="level-head"><span class="serif">${level}</span><span class="muted small">${LEVEL_NAMES[level]}</span></div><div class="list">${list.map(({ t, i }) => {
                const have = t.words.filter(v => Words.findAnywhere(Class.bare(v[0])).length).length;
                return `<div class="list-row" data-action="openBank" data-arg="${i}"><div class="grow"><div class="title">${esc(t.theme)}</div></div><span class="meta">${have ? `${have}/` : ""}${t.words.length}</span><i class="icon-chevron-right chev"></i></div>`;
            }).join("")}</div>`;
        }).join("");
}

function bankBook(t) { return `單字庫 ${t.level}`; }

Actions.openBank = (i) => { Class.bankOpen = Number(i); renderBank(); window.scrollTo({ top: 0 }); };
Actions.bankBack = () => { Class.bankOpen = null; renderBank(); };
Actions.bankQuiz = () => vocabQuiz(Class.data().bank[Class.bankOpen].words);
Actions.bankAddAll = () => {
    const t = Class.data().bank[Class.bankOpen];
    const n = addVocabTo(bankBook(t), t.words, `主題：${t.theme}`);
    showToast(n ? `已加入 ${n} 個字到「${bankBook(t)}」` : "這個主題的字都已經加入了");
    renderBank();
};

$("class-bank").addEventListener("click", (e) => {
    const b = e.target.closest("[data-bank-add]");
    if (!b) return;
    const t = Class.data().bank[Class.bankOpen];
    const n = addVocabTo(bankBook(t), [t.words[Number(b.dataset.bankAdd)]], `主題：${t.theme}`);
    b.innerHTML = '<i class="icon-check"></i>';
    showToast(n ? `已加入「${bankBook(t)}」` : "已經在單字本裡了");
});

// ---------- 動詞（法文） ----------
function renderVerbList() {
    const raw = $("verb-search").value.trim();
    const q = foldAccents(raw);
    const list = FR_VERBS.filter(v => !q || foldAccents(v.inf).includes(q) || v.zh.includes(raw));
    const groups = [["x", "不規則動詞"], ["er", "-er 動詞"], ["ir", "-ir 動詞（finir 型）"], ["re", "-re 動詞（vendre 型）"]];
    $("verb-list").innerHTML = groups.map(([g, name]) => {
        const items = list.filter(v => v.g === g);
        if (!items.length) return "";
        return `<div class="level-head"><span class="small muted">${name}</span></div><div class="list">${items.map(v => `
            <div class="list-row" data-action="openVerb" data-arg="${esc(v.inf)}">
                <div class="grow"><span class="serif">${esc(FrVerb.label(v))}</span> <span class="small muted">${esc(v.zh)}</span></div>
                <span class="meta">${FrVerb.usesEtre(v) ? "être" : ""}</span>
            </div>`).join("")}</div>`;
    }).join("") || '<p class="muted small">找不到這個動詞</p>';
    renderVerbDrillSetup();
}

Actions.openVerb = (inf) => {
    const v = FrVerb.find(inf);
    if (!v) return;
    Class.verb = v;
    const c = FrVerb.conjugate(v);
    $("verb-title").textContent = FrVerb.label(v);
    $("verb-meta").innerHTML = `${esc(v.zh)} · 過去分詞 <span class="serif">${esc(FrVerb.pp(v))}</span> · 助動詞 ${FrVerb.usesEtre(v) ? "être" : "avoir"}`;
    $("verb-tables").innerHTML = FR_TENSES.map(t => {
        const rows = c[t.id];
        if (!rows) return "";
        const labels = t.id === "imper" ? ["(tu)", "(nous)", "(vous)"] : null;
        return `<div class="tense">
            <div class="tense-head"><span>${t.name}</span><span class="small muted serif">${t.fr}</span><span class="tag-level">${t.level}</span></div>
            ${rows.map((r, k) => r ? `<div class="conj-row" data-say="${esc(r.replace(/il\/elle/, "il").replace(/ils\/elles/, "ils"))}">${labels ? `<span class="muted small">${labels[k]}</span> ` : ""}<span class="serif">${esc(r)}</span></div>` : "").join("")}
        </div>`;
    }).join("");
    App.go("sec-verb");
};

Actions.addVerbToBook = () => {
    const v = Class.verb;
    const book = "教室 動詞";
    if (Words.findDuplicate(FrVerb.label(v), book)) { showToast("已經在單字本裡了"); return; }
    if (!Store.books().includes(book)) Store.saveBookOrder([...Store.books(), book]);
    Words.add([{ book, term: FrVerb.label(v), meaning: v.zh, pos: "v.", notes: `過去分詞 ${FrVerb.pp(v)}；助動詞 ${FrVerb.usesEtre(v) ? "être" : "avoir"}` }]);
    refreshBookSelects();
    showToast(`已加入「${book}」`);
};

// 變化練習的一題：{v, t, i} → 題目與可接受的答案
const DRILL_TENSES = ["pres", "pc", "imp", "fut", "cond", "subj"];

function verbQuestion(v, t, i) {
    const full = FrVerb.conjugate(v)[t][i];
    if (!full) return null;
    // il/elle、ils/elles 隨機選一個代名詞出題
    const pick = i === 2 ? (Math.random() < 0.5 ? "il" : "elle") : i === 5 ? (Math.random() < 0.5 ? "ils" : "elles") : null;
    let answer = pick ? full.replace(/ils\/elles|il\/elle/, pick) : full;
    // être 動詞的過去分詞：主詞是 elle(s) 一定要加 e，il(s) 不加；je、tu、nous、vous 看說話者，(e)(s) 寫不寫都算對
    if (pick === "elle" || pick === "elles") answer = answer.replace(/\(e\)/g, "e");
    if (pick === "il" || pick === "ils") answer = answer.replace(/\(e\)/g, "");
    // 只寫動詞（不含主詞）也算對
    const norm = normAnswer(answer);
    const verbOnly = norm.replace(/^(qu'|que )?(j'|je |tu |il |elle |nous |vous |ils |elles )/, "");
    const toRe = (s) => new RegExp("^" + s.split(/(\([es]\))/).map(part =>
        /^\([es]\)$/.test(part) ? part[1] + "?" : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("") + "$");
    const patterns = [toRe(norm), toRe(verbOnly)];
    // 錯題本用：把 (e)(s) 展開成所有寫法，連同只寫動詞的版本一起存（第一個是顯示用的答案）
    const accepted = [answer, ...new Set([...optionalForms(answer), ...optionalForms(answer.replace(/^(qu'|que )?(j'|je |tu |il |elle |nous |vous |ils |elles )/, ""))])];
    const tense = FR_TENSES.find(x => x.id === t);
    const subject = pick || FR_PERSONS[i];
    return {
        key: `${v.inf}|${t}`,
        title: FrVerb.label(v),
        prompt: `${tense.name}　${t === "subj" ? (/^(il|elle)/.test(v.impersonal ? "il" : subject) ? "qu'" : "que ") : ""}${v.impersonal ? "il" : subject} ＿＿`,
        sub: `${v.zh} · ${tense.fr}`,
        answer,
        accepted,
        say: answer.replace(/\((e|s)\)/g, ""),
        check: (typed) => patterns.some(re => re.test(normAnswer(typed)))
    };
}

function randomPerson(v) { return v.impersonal ? 2 : Math.floor(Math.random() * 6); }

// 單一動詞練習
Actions.verbDrill = () => {
    const v = Class.verb;
    const qs = [];
    for (let n = 0; n < 30 && qs.length < 8; n++) {
        const q = verbQuestion(v, DRILL_TENSES[Math.floor(Math.random() * DRILL_TENSES.length)], randomPerson(v));
        if (q) qs.push(q);
    }
    Drill.start(qs, { title: `${FrVerb.label(v)} 變化練習`, back: "sec-verb", stats: true });
};

// 混合練習設定：時態與動詞範圍（存在這台裝置）
function drillConf() { return Object.assign({ tenses: ["pres", "pc"], set: "x" }, lsGet("vocab_verbdrill", {})); }

function renderVerbDrillSetup() {
    const c = drillConf();
    const stats = Store.get("verbStats", {}) || {};
    const weak = Object.entries(stats).filter(([, s]) => s[1] > 0).length;
    $("verb-drill-setup").innerHTML = `
        <div class="chips" id="drill-tenses">${DRILL_TENSES.map(t => { const x = FR_TENSES.find(y => y.id === t); return `<button class="chip${c.tenses.includes(t) ? " on" : ""}" data-drill-tense="${t}">${x.name}</button>`; }).join("")}</div>
        <div class="row mt-8">
            <select id="drill-set" style="width:auto;"><option value="x"${c.set === "x" ? " selected" : ""}>不規則動詞</option><option value="all"${c.set === "all" ? " selected" : ""}>全部動詞</option></select>
            <button class="btn primary sm" data-action="mixedDrill"><i class="icon-shuffle"></i> 混合練習</button>
            <button class="btn sm" data-action="weakDrill"${weak ? "" : " disabled"}>最常錯${weak ? `（${weak}）` : ""}</button>
        </div>`;
}

$("verb-drill-setup").addEventListener("click", (e) => {
    const b = e.target.closest("[data-drill-tense]");
    if (!b) return;
    const c = drillConf();
    const t = b.dataset.drillTense;
    c.tenses = c.tenses.includes(t) ? c.tenses.filter(x => x !== t) : [...c.tenses, t];
    if (!c.tenses.length) c.tenses = [t];
    lsSet("vocab_verbdrill", c);
    renderVerbDrillSetup();
});
$("verb-drill-setup").addEventListener("change", (e) => {
    if (e.target.id !== "drill-set") return;
    lsSet("vocab_verbdrill", Object.assign(drillConf(), { set: e.target.value }));
});

// 混合練習：從選定範圍隨機出 10 題，約三成從最常錯的組合裡出
Actions.mixedDrill = () => {
    const c = drillConf();
    const verbs = FR_VERBS.filter(v => c.set === "all" || v.g === "x");
    const stats = Store.get("verbStats", {}) || {};
    const weak = Object.entries(stats).filter(([k, s]) => s[1] > 0 && c.tenses.includes(k.split("|")[1])).map(([k]) => k);
    const qs = [];
    for (let n = 0; n < 60 && qs.length < 10; n++) {
        let v, t;
        if (weak.length && Math.random() < 0.3) { const [inf, tt] = weak[Math.floor(Math.random() * weak.length)].split("|"); v = FrVerb.find(inf); t = tt; }
        else { v = verbs[Math.floor(Math.random() * verbs.length)]; t = c.tenses[Math.floor(Math.random() * c.tenses.length)]; }
        const q = v && verbQuestion(v, t, randomPerson(v));
        if (q && !qs.some(x => x.answer === q.answer)) qs.push(q);
    }
    Drill.start(qs, { title: "動詞混合練習", back: "verbs", stats: true });
};

// 最常錯：依錯誤率排序，取前 10 個組合
Actions.weakDrill = () => {
    const stats = Store.get("verbStats", {}) || {};
    const top = Object.entries(stats).filter(([, s]) => s[1] > 0).sort((a, b) => (b[1][1] / b[1][0]) - (a[1][1] / a[1][0]) || b[1][1] - a[1][1]).slice(0, 10);
    const qs = top.map(([k]) => { const [inf, t] = k.split("|"); const v = FrVerb.find(inf); return v && verbQuestion(v, t, randomPerson(v)); }).filter(Boolean);
    Drill.start(qs, { title: "最常錯的變化", back: "verbs", stats: true });
};

function recordVerbStat(key, ok) {
    const stats = Store.get("verbStats", {}) || {};
    const s = stats[key] || [0, 0];
    s[0]++;
    if (!ok) s[1]++;
    else if (s[1] > 0 && s[0] - s[1] >= 3) s[1]--;   // 連續答對幾次後慢慢移出「最常錯」
    stats[key] = s;
    Store.set({ verbStats: stats });
}

$("verb-search").addEventListener("input", debounce(renderVerbList, 150));

// ---------- 逐題輸入練習（動詞變化用） ----------
const Drill = { qs: [], i: 0, score: 0, opts: {}, answered: false, missed: [] };

Drill.start = (qs, opts) => {
    if (!qs.length) { showToast("沒有可以練習的題目", "error"); return; }
    Object.assign(Drill, { qs, i: 0, score: 0, opts, answered: false, missed: [] });
    $("drill-title").textContent = opts.title;
    $("drill-keys").innerHTML = L().accents.map(c => `<button type="button">${c}</button>`).join("");
    App.go("sec-drill");
    renderDrill();
};

function renderDrill() {
    const q = Drill.qs[Drill.i];
    Drill.answered = false;
    $("drill-count").textContent = `${Drill.i + 1} / ${Drill.qs.length}`;
    $("drill-progress").style.width = `${Math.round(Drill.i / Drill.qs.length * 100)}%`;
    $("drill-verb").textContent = q.title;
    $("drill-prompt").textContent = q.prompt;
    $("drill-sub").textContent = q.sub;
    $("drill-input").value = "";
    $("drill-input").disabled = false;
    $("drill-feedback").innerHTML = "";
    $("drill-btn").textContent = "對答案";
    setTimeout(() => $("drill-input").focus(), 50);
}

Actions.drillNext = () => {
    const q = Drill.qs[Drill.i];
    if (!Drill.answered) {
        const ok = q.check($("drill-input").value);
        Drill.answered = true;
        if (ok) Drill.score++;
        else Drill.missed.push(q);
        if (Drill.opts.stats) recordVerbStat(q.key, ok);
        if (!ok) Mistakes.add(["t", `${q.title}：${q.prompt}`, q.accepted], "動詞變化");
        $("drill-input").disabled = true;
        $("drill-feedback").innerHTML = `<span class="verdict ${ok ? "good" : "bad"}">${ok ? "正確" : "答案"}</span> <span class="serif">${esc(q.answer)}</span>`;
        TTS.say(q.say, L().tts);
        $("drill-btn").textContent = Drill.i === Drill.qs.length - 1 ? "看結果" : "下一題";
        return;
    }
    if (Drill.i < Drill.qs.length - 1) { Drill.i++; renderDrill(); return; }
    Goals.mark();
    const missed = Drill.missed.map(q => `${q.title}：${q.answer}`).join("\n");
    UI.alert("練習結束", `答對 ${Drill.score} / ${Drill.qs.length} 題${missed ? "\n\n答錯的：\n" + missed : ""}`).then(() => Actions.drillExit());
};

Actions.drillExit = () => {
    if (Drill.opts.back === "sec-verb") App.go("sec-verb");
    else Actions.backToVerbs();
};

// ---------- 發音 ----------
function renderSounds() {
    $("class-sounds").innerHTML = Class.data().sounds.map(s => `
        <div class="gp">
            <h3 class="gp-title">${esc(s.t)}</h3>
            <p class="gp-body">${esc(s.d)}</p>
            ${s.items.map(([a, b]) => {
                const say = CJK.test(a) ? Class.speakable(b) : Class.speakable(a).replace(/\s\/\s/g, ", ");
                return `<div class="ex">${speakBtn(say)}<div class="grow"><span class="serif">${esc(a)}</span> <span class="small muted">${esc(b)}</span></div></div>`;
            }).join("")}
        </div>`).join("");
}
