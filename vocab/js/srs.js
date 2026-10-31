// ===================== SRS 間隔複習 =====================
const SRS = {
    isNew(w) { return !w.nextReviewTime; },

    newPerDay() {
        const n = Number(Store.get("newPerDay", DEFAULT_NEW_PER_DAY));
        return Number.isFinite(n) && n >= 0 ? n : DEFAULT_NEW_PER_DAY;
    },

    // 今日需複習 = 已到期的舊字 + 每日上限內的新字（依加入順序）
    dueList() {
        const now = Date.now();
        const pool = Words.active();
        const reviews = pool.filter(w => w.nextReviewTime && w.nextReviewTime <= now).sort((a, b) => a.nextReviewTime - b.nextReviewTime);
        const today = Store.logToday();
        const quota = Math.max(0, SRS.newPerDay() - (today ? today.newCount : 0));
        const fresh = pool.filter(SRS.isNew).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).slice(0, quota);
        return { reviews, fresh, all: [...reviews, ...fresh] };
    },

    schedule(w, rating, now = Date.now()) {
        let interval = w.interval || 0;
        let ease = w.easeFactor || 2.5;
        let next;
        if (rating === "forget") { interval = 0; ease = Math.max(1.3, ease - 0.2); next = now + 10 * 60000; }
        else if (rating === "hard") { interval = interval === 0 ? 1 : interval * 1.2; ease = Math.max(1.3, ease - 0.15); }
        else if (rating === "easy") { interval = interval === 0 ? 4 : interval * ease; ease += 0.15; }
        else if (rating === "familiar") { interval = Math.max(10 + Math.random() * 5, interval * ease); ease = Math.min(3.0, ease + 0.1); }
        if (next === undefined) next = now + interval * DAY_MS;
        return { interval: Math.round(interval * 100) / 100, easeFactor: Math.round(ease * 100) / 100, nextReviewTime: next };
    },

    hint(w, rating) {
        if (rating === "forget") return "10 分鐘";
        if (rating === "familiar") {
            const base = (w.interval || 0) * (w.easeFactor || 2.5);
            return base > 15 ? fmtInterval(base) : "10–15 天";
        }
        return fmtInterval(SRS.schedule(w, rating).interval);
    },

    rate(w, rating) {
        const wasNew = SRS.isNew(w);
        const s = SRS.schedule(w, rating);
        Words.update([{ id: w.id, fields: { ...s, reviews: (w.reviews || 0) + 1, lapses: (w.lapses || 0) + (rating === "forget" ? 1 : 0) } }]);
        Store.addLog({ reviews: 1, correct: rating === "forget" ? 0 : 1, newCount: wasNew ? 1 : 0 });
        return s;
    },

    // 遊戲答錯：立刻排進複習，不改變難易係數
    markMissed(words) {
        const now = Date.now();
        Words.update(words.filter(w => w.book !== TRASH_BOOK).map(w => ({ id: w.id, fields: { nextReviewTime: now, interval: 0, lapses: (w.lapses || 0) + 1 } })));
    }
};

// ===================== 閃卡 =====================
const FC = { cards: [], base: [], index: 0, total: 0, source: "", answered: false };

function startFlashcards(source, words) {
    if (!words.length) return false;
    FC.source = source;
    FC.base = words;
    App.go("sec-flashcard");
    initFlashcard();
    return true;
}

Actions.startAllFlashcards = () => { if (!startFlashcards("all", Words.active())) showToast("還沒有單字"); };
Actions.startFlashcard = () => { if (!startFlashcards("book", sortedBookWords())) showToast("這本還是空的"); };
Actions.startDueFlashcards = () => {
    const due = SRS.dueList();
    if (!due.all.length) { showToast("今天的複習都完成了"); return; }
    startFlashcards("due", due.all);
};

Actions.exitFlashcard = () => {
    TTS.stop();
    App.refreshCounts();
    if (FC.source === "book") openBook(currentViewBook);
    else App.go(FC.source === "due" ? "sec-today" : "sec-books");
};

function initFlashcard() {
    FC.cards = $("fc-order").value === "shuffle" ? shuffle(FC.base) : [...FC.base];
    FC.index = 0;
    FC.total = FC.cards.length;
    show("standard-controls", FC.source !== "due");
    renderFlashcard();
}

$("fc-mode").addEventListener("change", initFlashcard);
$("fc-order").addEventListener("change", initFlashcard);

function currentCard() { return FC.cards[FC.index]; }

function renderFlashcard() {
    const w = currentCard();
    if (!w) return;
    FC.answered = false;
    hide("srs-controls");
    hide("fc-answer");
    show("fc-tap");
    const mode = $("fc-mode").value;
    const done = FC.source === "due" ? FC.total - FC.cards.length : FC.index;
    $("fc-counter").textContent = FC.source === "due" ? `剩 ${FC.cards.length}` : `${FC.index + 1} / ${FC.cards.length}`;
    $("fc-progress").style.width = `${Math.round(done / Math.max(1, FC.total) * 100)}%`;
    const sub = `<div class="fc-sub small">${posLabel(w.pos)} ${w.phonetic ? `<span class="phon">${esc(w.phonetic)}</span>` : ""}</div>`;
    const q = $("fc-question");
    if (mode === "term") {
        q.innerHTML = `<div class="fc-q${w.term.length > 24 ? " long" : ""}">${esc(w.term)}</div>${sub}`;
        show("fc-play-btn");
        setTimeout(() => TTS.say(w.term), 200);
    } else if (mode === "meaning") {
        q.innerHTML = `<div class="fc-q zh">${esc(w.meaning)}</div>`;
        hide("fc-play-btn");
    } else {
        q.innerHTML = `<div class="muted small">聽發音，拼出單字</div>
            <button class="btn sm mt-8" data-action="playCurrentCard"><i class="icon-volume-2"></i> 再聽一次</button>
            <div class="dictation"><input type="text" id="dictation-input" class="input-big center" autocomplete="off" autocapitalize="off" spellcheck="false" data-enter="flipCard">
            ${L().accents.length ? `<div class="accent-keys" data-target="dictation-input">${L().accents.map(c => `<button type="button">${c}</button>`).join("")}</div>` : ""}</div>`;
        hide("fc-play-btn");
        hide("fc-tap");
        setTimeout(() => TTS.say(w.term), 300);
        setTimeout(() => { const i = $("dictation-input"); if (i) i.focus(); }, 350);
    }
    if (FC.source === "due") ["forget", "hard", "easy", "familiar"].forEach(r => { $(`srs-hint-${r}`).textContent = SRS.hint(w, r); });
}

Actions.playCurrentCard = () => { const w = currentCard(); if (w) TTS.say(w.term); };

Actions.flipCard = (arg, el, e) => {
    if (e && e.type === "click" && e.target.closest(".dictation")) return;
    if (FC.answered) return;
    const w = currentCard();
    if (!w) return;
    FC.answered = true;
    hide("fc-tap");
    const mode = $("fc-mode").value;
    const example = w.example ? `<div class="fc-example"><span>${esc(w.example)}</span> <button class="icon-btn sm" data-say="${esc(w.example)}" title="朗讀例句"><i class="icon-volume-2"></i></button><div class="fc-example-zh" id="fc-ex-zh"></div></div>` : "";
    const notes = w.notes ? `<div class="fc-notes">${esc(w.notes)}</div>` : "";
    let html;
    if (mode === "term") {
        html = `<div class="fc-a">${esc(w.meaning)}</div>${example}${notes}`;
    } else if (mode === "meaning") {
        html = `<div class="fc-a serif${w.term.length > 24 ? " long" : ""}">${esc(w.term)}</div><div class="fc-sub small">${posLabel(w.pos)}</div>${example}${notes}`;
        TTS.say(w.term);
    } else {
        const input = $("dictation-input");
        const typed = input ? input.value.trim() : "";
        if (input) { input.disabled = true; input.blur(); }
        const exact = typed.toLowerCase() === w.term.toLowerCase();
        const close = !exact && foldAccents(typed) === foldAccents(w.term);
        const verdict = exact ? '<div class="verdict good">正確</div>'
            : close ? '<div class="verdict warn">差在重音符號</div>'
            : `<div class="verdict bad">再想想</div><div class="small muted">你寫的是 <span class="strike">${esc(typed || "（空白）")}</span></div>`;
        html = `${verdict}<div class="fc-a serif">${esc(w.term)}</div><div class="muted">${esc(w.meaning)}</div>${example}`;
        TTS.say(w.term);
    }
    $("fc-answer").innerHTML = html;
    show("fc-answer");
    if (w.example) fillExampleZh(w);
    if (FC.source === "due") show("srs-controls");
};

// 例句翻譯：第一次翻面時才翻譯，存在記憶體裡
const exampleZh = new Map();
function fillExampleZh(w) {
    const show = (t) => { const el = $("fc-ex-zh"); if (el && currentCard() === w) el.textContent = t; };
    if (exampleZh.has(w.example)) { show(exampleZh.get(w.example)); return; }
    Svc.translate(w.example).then(t => { exampleZh.set(w.example, t); show(t); }).catch(() => {});
}

Actions.nextCard = (step) => {
    if (!FC.cards.length) return;
    FC.index = (FC.index + Number(step) + FC.cards.length) % FC.cards.length;
    renderFlashcard();
};

Actions.answerSRS = (rating) => {
    const w = currentCard();
    if (!w || !FC.answered) return;
    SRS.rate(w, rating);
    FC.cards.splice(FC.index, 1);
    if (!FC.cards.length) {
        showToast("今天的複習完成了");
        Actions.exitFlashcard();
        return;
    }
    if (FC.index >= FC.cards.length) FC.index = 0;
    renderFlashcard();
};

// 鍵盤操作：空白鍵翻面、1–4 評分、左右鍵切換
document.addEventListener("keydown", (e) => {
    if (App.current !== "sec-flashcard" || e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || !$("dialog").hidden) return;
    if (e.key === " ") { e.preventDefault(); Actions.flipCard(); }
    else if (FC.source === "due" && FC.answered && "1234".includes(e.key)) Actions.answerSRS(["forget", "hard", "easy", "familiar"][Number(e.key) - 1]);
    else if (FC.source !== "due" && e.key === "ArrowRight") Actions.nextCard(1);
    else if (FC.source !== "due" && e.key === "ArrowLeft") Actions.nextCard(-1);
});

// ===================== 統計 =====================
function updateStatistics() {
    const pool = Words.active();
    const today = dateKey();
    $("stat-total").textContent = pool.length;
    $("stat-mastered").textContent = pool.filter(w => w.interval > 7).length;
    $("stat-today").textContent = pool.filter(w => w.timestamp && dateKey(w.timestamp) === today).length;
    $("stat-due").textContent = SRS.dueList().all.length;

    const byDate = new Map(S.log.filter(r => r.lang === S.lang).map(r => [r.date, r]));
    $("stat-streak").textContent = Goals.streak();

    const days = [];
    for (let i = 29; i >= 0; i--) {
        const x = new Date(); x.setDate(x.getDate() - i);
        days.push(byDate.get(dateKey(x)) || { date: dateKey(x), reviews: 0, correct: 0 });
    }
    const total = days.reduce((s, r) => s + r.reviews, 0);
    const correct = days.reduce((s, r) => s + r.correct, 0);
    $("stat-accuracy").textContent = total ? Math.round(correct / total * 100) + "%" : "–";
    $("stat-30-total").textContent = `近 30 天複習 ${total} 次`;
    const max = Math.max(1, ...days.map(r => r.reviews));
    $("stat-bars").innerHTML = days.map(r => `<div class="${r.reviews ? "" : "zero"}" style="height:${r.reviews ? Math.max(4, r.reviews / max * 100) : 2}%" title="${r.date}：${r.reviews} 次"></div>`).join("");
    $("stat-axis-start").textContent = days[0].date.slice(5).replace("-", "/");
}
