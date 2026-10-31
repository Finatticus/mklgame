// ===================== 法文教室 =====================
const LEVEL_NAMES = { A1: "入門", A2: "基礎", B1: "進階" };
const CJK = /[㐀-鿿]/;

const Class = {
    tab: "course",
    lesson: null,
    verb: null,

    progress() { return Store.get("class", { done: {}, scores: {}, last: "" }) || { done: {}, scores: {}, last: "" }; },
    saveProgress(p) { Store.set({ class: p }); },
    index(id) { return FR_COURSE.findIndex(l => l.id === id); },

    // **粗體**、換行
    rich(text) { return esc(text).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>"); },

    // 唸法文：清掉中文與括號註解
    speakable(fr) { return String(fr).replace(/（[^）]*）|\([^)]*\)/g, "").replace(/[㐀-鿿]+/g, " ").replace(/\s+/g, " ").trim(); },

    // 去掉冠詞存進單字本：「le nom」→ nom、「l'ami」→ ami
    bare(term) { return String(term).replace(/^(le|la|les|un|une|des)\s+/i, "").replace(/^l['’]/i, "").trim(); },

    bookName(lesson) { return `教室 ${lesson.level}`; }
};

// ---------- 首頁 ----------
Actions.classTab = (tab) => {
    Class.tab = tab;
    document.querySelectorAll("#class-tabs button").forEach(b => b.classList.toggle("on", b.dataset.arg === tab));
    ["course", "verbs", "sounds"].forEach(t => show("class-" + t, t === tab));
    if (tab === "verbs") renderVerbList();
    if (tab === "sounds") renderSounds();
};

function renderClassHome() {
    const p = Class.progress();
    const done = FR_COURSE.filter(l => p.done[l.id]).length;
    const next = FR_COURSE.find(l => l.id === p.last && !p.done[l.id]) || FR_COURSE.find(l => !p.done[l.id]) || FR_COURSE[0];
    $("class-progress").textContent = `已完成 ${done} / ${FR_COURSE.length} 課`;
    $("class-progress-bar").style.width = `${Math.round(done / Math.max(1, FR_COURSE.length) * 100)}%`;
    $("class-continue").innerHTML = next ? `<span class="muted small">${next.level} · 第 ${Class.index(next.id) + 1} 課</span> <b>${esc(next.title)}</b>` : "";
    $("class-continue").dataset.arg = next ? next.id : "";

    let html = "";
    ["A1", "A2", "B1"].forEach(level => {
        const list = FR_COURSE.filter(l => l.level === level);
        if (!list.length) return;
        const n = list.filter(l => p.done[l.id]).length;
        html += `<div class="level-head"><span class="serif">${level}</span><span class="muted small">${LEVEL_NAMES[level]} · ${n}/${list.length}</span></div><div class="list">`;
        html += list.map(l => {
            const i = Class.index(l.id) + 1;
            const score = p.scores[l.id];
            return `<div class="list-row" data-action="openLesson" data-arg="${l.id}">
                <span class="lesson-no">${i}</span>
                <div class="grow"><div class="title">${esc(l.title)}</div><div class="meta serif">${esc(l.fr)}</div></div>
                <span class="meta">${p.done[l.id] ? '<i class="icon-check" style="color:var(--good)"></i>' : (score !== undefined ? score + "%" : "")}</span>
            </div>`;
        }).join("");
        html += `</div>`;
    });
    $("class-course").querySelector(".course-list").innerHTML = html;
}

// ---------- 課程頁 ----------
Actions.openLesson = (id) => {
    const lesson = FR_COURSE.find(l => l.id === id);
    if (!lesson) return;
    Class.lesson = lesson;
    const p = Class.progress();
    if (p.last !== id) { p.last = id; Class.saveProgress(p); }
    renderLesson(lesson);
    App.go("sec-lesson");
};

Actions.continueLesson = () => { const id = $("class-continue").dataset.arg; if (id) Actions.openLesson(id); };
Actions.backToVerbs = () => { App.go("sec-class"); Actions.classTab("verbs"); };

Actions.lessonNav = (dir) => {
    const i = Class.index(Class.lesson.id) + Number(dir);
    if (FR_COURSE[i]) Actions.openLesson(FR_COURSE[i].id);
};

function speakBtn(fr) { return `<button class="icon-btn sm" data-say="${esc(Class.speakable(fr))}" title="朗讀"><i class="icon-volume-2"></i></button>`; }

function renderLesson(L) {
    const i = Class.index(L.id);
    const p = Class.progress();
    $("lesson-eyebrow").textContent = `${L.level} ${LEVEL_NAMES[L.level]} · 第 ${i + 1} 課`;
    $("lesson-title").textContent = L.title;
    $("lesson-fr").textContent = L.fr;
    $("lesson-goal").textContent = L.goal || "";
    $("lesson-prev").disabled = i === 0;
    $("lesson-next").disabled = i === FR_COURSE.length - 1;

    // 文法
    $("lesson-grammar").innerHTML = (L.grammar || []).map(g => `
        <div class="gp">
            <h3 class="gp-title">${esc(g.t)}</h3>
            ${g.d ? `<p class="gp-body">${Class.rich(g.d)}</p>` : ""}
            ${g.tb ? `<div class="table-wrap"><table class="gtable">${g.tb.map((row, r) => `<tr>${row.map(c => r === 0 ? `<th>${Class.rich(c)}</th>` : `<td>${CJK.test(c) ? Class.rich(c) : `<span class="cw-line" data-say="${esc(Class.speakable(c))}">${Class.rich(c)}</span>`}</td>`).join("")}</tr>`).join("")}</table></div>` : ""}
            ${(g.ex || []).map(([fr, zh]) => `<div class="ex">${speakBtn(fr)}<div class="grow"><div class="ex-fr">${makeClickable(fr)}</div><div class="ex-zh">${esc(zh)}</div></div></div>`).join("")}
        </div>`).join("");

    // 單字
    $("lesson-vocab").innerHTML = (L.vocab || []).map((v, k) => `
        <div class="vocab-row">
            ${speakBtn(v[0])}
            <div class="grow"><span class="serif vocab-term">${esc(v[0])}</span> <span class="small">${posLabel(v[2] || "")}</span><div class="small muted">${esc(v[1])}</div></div>
            <button class="icon-btn" data-vocab-add="${k}" title="加入單字本"><i class="${Words.findAnywhere(Class.bare(v[0])).length ? "icon-check" : "icon-plus"}"></i></button>
        </div>`).join("");

    // 對話
    $("lesson-dialog").innerHTML = (L.dialog || []).map(([who, fr, zh]) => `
        <div class="dl-line">
            <span class="dl-who">${esc(who)}</span>
            <div class="grow"><div class="ex-fr">${makeClickable(fr)}</div><div class="ex-zh dl-zh">${esc(zh)}</div></div>
            ${speakBtn(fr)}
        </div>`).join("");
    show("lesson-dialog-block", (L.dialog || []).length > 0);
    $("lesson-culture").innerHTML = L.culture ? `<p class="eyebrow mb-8">小知識</p><p class="small">${Class.rich(L.culture)}</p>` : "";
    show("lesson-culture", !!L.culture);

    renderExercises(L);
    $("lesson-done").innerHTML = p.done[L.id] ? '<i class="icon-check"></i> 已完成，再次標記' : "完成本課";
    $("sec-lesson").scrollTop = 0;
}

// 朗讀
document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-say]");
    if (!b || e.target.closest(".cw")) return;
    TTS.say(b.dataset.say, "fr-FR");
});

Actions.playDialog = () => {
    const lines = (Class.lesson.dialog || []).map(d => d[1]);
    let i = 0;
    TTS.stop();
    const next = () => { if (i < lines.length && App.current === "sec-lesson") TTS.speak(lines[i++], { lang: "fr-FR", rate: 0.9, onend: () => setTimeout(next, 350) }); };
    next();
};

Actions.toggleDialogZh = (arg, btn) => {
    const box = $("lesson-dialog");
    box.classList.toggle("hide-zh");
    btn.textContent = box.classList.contains("hide-zh") ? "顯示翻譯" : "隱藏翻譯";
};

// 單字加入單字本
function addLessonVocab(list) {
    const book = Class.bookName(Class.lesson);
    if (!Store.books().includes(book)) Store.saveBookOrder([...Store.books(), book]);
    const fresh = list.filter(v => !Words.findDuplicate(Class.bare(v[0]), book))
        .map(v => ({ book, term: Class.bare(v[0]), meaning: v[1], pos: v[2] || "", notes: `${Class.lesson.level} 第 ${Class.index(Class.lesson.id) + 1} 課：${Class.lesson.title}` }));
    const added = Words.add(fresh);
    refreshBookSelects();
    return added.length;
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
    showToast("完成本課");
    const i = Class.index(Class.lesson.id);
    if (FR_COURSE[i + 1]) Actions.openLesson(FR_COURSE[i + 1].id);
    else App.go("sec-class");
};

// ---------- 練習 ----------
// c：選擇 [c, 題目, 選項, 答案索引, 中文]；f：填空 [f, 題目, 答案(或陣列), 中文]
// o：重組 [o, "正確 / 順序 / 的 / 詞", 中文]；t：中翻法 [t, 中文, 答案(或陣列)]；l：聽寫 [l, 法文, 中文]
const Ex = { items: [], answers: [] };

function normAnswer(s) {
    return foldAccents(String(s || "")).replace(/[’]/g, "'").replace(/[.,!?;:«»"]/g, " ").replace(/\s+/g, " ").trim();
}

function renderExercises(L) {
    Ex.items = L.ex || [];
    Ex.answers = Ex.items.map(() => null);
    const blank = (q) => esc(q).replace(/_{2,}/g, '<span class="blank">＿＿</span>');
    $("lesson-ex").innerHTML = Ex.items.map((x, i) => {
        const n = `<span class="ex-no">${i + 1}</span>`;
        let body = "";
        if (x[0] === "c") body = `<div class="ex-q serif">${blank(x[1])}</div><div class="chips mt-8">${x[2].map((o, k) => `<button class="chip" data-ex="${i}" data-opt="${k}">${esc(o)}</button>`).join("")}</div>`;
        else if (x[0] === "f") body = `<div class="ex-q serif">${blank(x[1])}</div><input type="text" class="ex-input" data-ex-input="${i}" autocapitalize="off" spellcheck="false">`;
        else if (x[0] === "o") {
            const words = x[1].split(" / ");
            body = `<div class="order-answer" data-order-answer="${i}"></div><div class="chips mt-8" data-order-pool="${i}">${shuffle(words.map((w, k) => ({ w, k }))).map(o => `<button class="chip" data-order="${i}" data-w="${esc(o.w)}">${esc(o.w)}</button>`).join("")}</div>`;
        }
        else if (x[0] === "t") body = `<div class="ex-q">${esc(x[1])}</div><input type="text" class="ex-input" data-ex-input="${i}" autocapitalize="off" spellcheck="false" placeholder="用法文寫">`;
        else if (x[0] === "l") body = `<div class="ex-q"><button class="btn sm" data-say="${esc(x[1])}"><i class="icon-volume-2"></i> 播放</button> <span class="small muted">聽寫下聽到的句子</span></div><input type="text" class="ex-input" data-ex-input="${i}" autocapitalize="off" spellcheck="false">`;
        const zh = x[0] === "t" ? "" : `<div class="ex-zh">${esc(x[0] === "c" ? x[4] : (x[0] === "o" || x[0] === "l") ? x[2] : x[3])}</div>`;
        return `<div class="exercise" data-ex-box="${i}">${n}<div class="grow">${body}${x[0] === "l" ? "" : zh}<div class="ex-feedback" data-ex-fb="${i}"></div></div></div>`;
    }).join("");
    const hasFr = L.accentKeys !== false;
    $("lesson-ex-keys").innerHTML = hasFr ? LANGS.fr.accents.map(c => `<button type="button">${c}</button>`).join("") : "";
    $("lesson-ex-score").textContent = "";
    show("lesson-ex-block", Ex.items.length > 0);
}

// 重音鍵盤輸入到目前聚焦的練習框
let lastExInput = null;
document.addEventListener("focusin", (e) => { if (e.target.matches && e.target.matches(".ex-input")) { lastExInput = e.target; $("lesson-ex-keys").dataset.target = e.target.id || (e.target.id = "exi-" + uid()); } });

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
    let correct = 0;
    Ex.items.forEach((x, i) => {
        const fb = document.querySelector(`[data-ex-fb="${i}"]`);
        const box = document.querySelector(`[data-ex-box="${i}"]`);
        let ok = false, accentSlip = false, right = "", typed = "";
        if (x[0] === "c") { ok = Ex.answers[i] === x[3]; right = /_{2,}/.test(x[1]) ? x[1].replace(/_{2,}/, x[2][x[3]]) : x[2][x[3]]; }
        else if (x[0] === "o") {
            typed = [...document.querySelectorAll(`[data-order-answer="${i}"] .chip`)].map(c => c.dataset.w).join(" ");
            right = x[1].split(" / ").join(" ");
            ok = normAnswer(typed) === normAnswer(right);
        } else {
            typed = document.querySelector(`[data-ex-input="${i}"]`).value;
            const accepted = x[0] === "l" ? [x[1]] : [].concat(x[2]);
            ok = accepted.some(a => normAnswer(a) === normAnswer(typed));
            // 只差重音也算對，但提醒
            const plain = (s) => String(s).toLowerCase().replace(/[’]/g, "'").replace(/[.,!?;:«»"]/g, " ").replace(/\s+/g, " ").trim();
            accentSlip = ok && !accepted.some(a => plain(a) === plain(typed));
            right = x[0] === "f" ? x[1].replace(/_{2,}/, accepted[0]) : accepted[0];
        }
        if (ok) correct++;
        box.classList.toggle("ok", ok);
        box.classList.toggle("bad", !ok);
        fb.innerHTML = ok
            ? `<span class="verdict ${accentSlip ? "warn" : "good"}">${accentSlip ? "正確，注意重音" : "正確"}</span> <span class="serif">${accentSlip ? esc(right) : ""}</span> ${speakBtn(right)}`
            : `<span class="verdict bad">答案</span> <span class="serif">${esc(right)}</span> ${speakBtn(right)}`;
    });
    const pct = Math.round(correct / Math.max(1, Ex.items.length) * 100);
    $("lesson-ex-score").textContent = `${correct} / ${Ex.items.length} 題正確`;
    const p = Class.progress();
    if (p.scores[Class.lesson.id] === undefined || pct > p.scores[Class.lesson.id]) { p.scores[Class.lesson.id] = pct; Class.saveProgress(p); }
};

Actions.resetExercises = () => renderExercises(Class.lesson);

// 單字快問：從本課單字出 5 題選擇題
Actions.vocabQuiz = () => {
    const vocab = Class.lesson.vocab || [];
    if (vocab.length < 4) return;
    const qs = shuffle(vocab).slice(0, Math.min(5, vocab.length));
    let i = 0, score = 0;
    const ask = () => {
        if (i >= qs.length) { UI.alert("單字快問", `答對 ${score} / ${qs.length} 題`); return; }
        const q = qs[i];
        const options = shuffle([q, ...shuffle(vocab.filter(v => v !== q)).slice(0, 3)]);
        TTS.say(Class.speakable(q[0]), "fr-FR");
        UI.choose(`${i + 1}. ${q[0]}`, options.map(o => ({ label: o[1], value: o === q })), { message: "選出正確的意思" }).then(v => {
            if (v === null) return;
            if (v) score++;
            showToast(v ? "正確" : `答案：${q[1]}`, v ? "success" : "error", 1500);
            i++;
            setTimeout(ask, v ? 300 : 900);
        });
    };
    ask();
};

// ---------- 動詞 ----------
function renderVerbList() {
    const q = foldAccents($("verb-search").value.trim());
    const list = FR_VERBS.filter(v => !q || foldAccents(v.inf).includes(q) || v.zh.includes($("verb-search").value.trim()));
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
            ${rows.map((r, k) => r ? `<div class="conj-row" data-say="${esc(r)}">${labels ? `<span class="muted small">${labels[k]}</span> ` : ""}<span class="serif">${esc(r)}</span></div>` : "").join("")}
        </div>`;
    }).join("");
    App.go("sec-verb");
};

Actions.addVerbToBook = () => {
    const v = Class.verb;
    const book = "教室 動詞";
    if (Words.findDuplicate(v.inf, book)) { showToast("已經在單字本裡了"); return; }
    if (!Store.books().includes(book)) Store.saveBookOrder([...Store.books(), book]);
    Words.add([{ book, term: FrVerb.label(v), meaning: v.zh, pos: "v.", notes: `過去分詞 ${FrVerb.pp(v)}；助動詞 ${FrVerb.usesEtre(v) ? "être" : "avoir"}` }]);
    refreshBookSelects();
    showToast(`已加入「${book}」`);
};

// 動詞變化練習：隨機人稱與時態
Actions.verbDrill = async () => {
    const v = Class.verb;
    const tenses = ["pres", "pc", "imp", "fut", "cond", "subj"];
    let score = 0;
    for (let n = 0; n < 8; n++) {
        const t = tenses[Math.floor(Math.random() * tenses.length)];
        const persons = v.impersonal ? [2] : [0, 1, 2, 3, 4, 5];
        const i = persons[Math.floor(Math.random() * persons.length)];
        const full = FrVerb.conjugate(v)[t][i];
        if (!full) { n--; continue; }
        const tense = FR_TENSES.find(x => x.id === t);
        const ans = await UI.prompt(`${n + 1} / 8　${FrVerb.label(v)}`, { message: `${tense.name}（${tense.fr}）\n主詞：${t === "subj" ? "que " : ""}${FR_PERSONS[i]}\n請寫出完整的句子（含主詞）`, placeholder: "例如 je suis" });
        if (ans === null) return;
        const ok = normAnswer(ans) === normAnswer(full) || normAnswer(ans) === normAnswer(full.replace(/\(e\)|\(s\)/g, ""));
        if (ok) score++;
        TTS.say(full, "fr-FR");
        await UI.alert(ok ? "正確" : "正確答案", full);
    }
    UI.alert("練習結束", `答對 ${score} / 8 題`);
};

$("verb-search").addEventListener("input", debounce(renderVerbList, 150));

// ---------- 發音 ----------
function renderSounds() {
    $("class-sounds").innerHTML = FR_SOUNDS.map(s => `
        <div class="gp">
            <h3 class="gp-title">${esc(s.t)}</h3>
            <p class="gp-body">${esc(s.d)}</p>
            ${s.items.map(([a, b]) => {
                const say = CJK.test(a) ? Class.speakable(b) : a.replace(/\s\/\s/g, ", ");
                return `<div class="ex">${speakBtn(say)}<div class="grow"><span class="serif">${esc(a)}</span> <span class="small muted">${esc(b)}</span></div></div>`;
            }).join("")}
        </div>`).join("");
}
