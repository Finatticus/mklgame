// ===================== SRS 間隔複習 =====================
const SRS = {
    isNew(w) { return !w.nextReviewTime; },

    newPerDay() {
        const n = Number(S.settings.newPerDay);
        return Number.isFinite(n) && n >= 0 ? n : DEFAULT_NEW_PER_DAY;
    },

    newIntroducedToday() {
        const row = S.log.find(r => r.date === dateKey());
        return row ? row.newCount : 0;
    },

    // 今日需複習 = 已到期的舊字 + 每日上限內的新字（依加入順序）
    dueList() {
        const now = Date.now();
        const pool = S.words.filter(w => w.book !== TRASH_BOOK);
        const reviews = pool.filter(w => w.nextReviewTime && w.nextReviewTime <= now)
            .sort((a, b) => a.nextReviewTime - b.nextReviewTime);
        const quota = Math.max(0, SRS.newPerDay() - SRS.newIntroducedToday());
        const fresh = pool.filter(SRS.isNew)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
            .slice(0, quota);
        return { reviews, fresh, all: [...reviews, ...fresh] };
    },

    // 回傳評分後的新排程（不修改原物件）
    schedule(w, rating, now = Date.now()) {
        let interval = w.interval || 0;
        let ease = w.easeFactor || 2.5;
        let next;
        if (rating === "forget") {
            interval = 0; ease = Math.max(1.3, ease - 0.2); next = now + 10 * 60000;
        } else if (rating === "hard") {
            interval = interval === 0 ? 1 : interval * 1.2; ease = Math.max(1.3, ease - 0.15);
        } else if (rating === "easy") {
            interval = interval === 0 ? 4 : interval * ease; ease += 0.15;
        } else if (rating === "familiar") {
            interval = Math.max(10 + Math.random() * 5, interval * ease); ease = Math.min(3.0, ease + 0.1);
        }
        if (next === undefined) next = now + interval * DAY_MS;
        return { interval: Math.round(interval * 100) / 100, easeFactor: Math.round(ease * 100) / 100, nextReviewTime: next };
    },

    hint(w, rating) {
        if (rating === "forget") return "10 分鐘後";
        if (rating === "familiar") {
            const base = (w.interval || 0) * (w.easeFactor || 2.5);
            return base > 15 ? fmtInterval(base) : "10~15 天後";
        }
        return fmtInterval(SRS.schedule(w, rating).interval);
    },

    // 套用評分並記錄
    rate(w, rating) {
        const wasNew = SRS.isNew(w);
        const s = SRS.schedule(w, rating);
        Words.update([{
            id: w.id,
            fields: { ...s, reviews: (w.reviews || 0) + 1, lapses: (w.lapses || 0) + (rating === "forget" ? 1 : 0) }
        }]);
        Store.addLog({ reviews: 1, correct: rating === "forget" ? 0 : 1, newCount: wasNew ? 1 : 0 });
        return s;
    },

    // 遊戲答錯：立刻排進複習，不改變難易係數
    markMissed(words) {
        const now = Date.now();
        const updates = words.filter(w => w.book !== TRASH_BOOK).map(w => ({
            id: w.id, fields: { nextReviewTime: now, interval: 0, lapses: (w.lapses || 0) + 1 }
        }));
        Words.update(updates);
    }
};

// ===================== 閃卡 =====================
const FC = { cards: [], index: 0, source: "", answered: false };

function startFlashcards(source, words, title) {
    if (!words.length) return false;
    FC.source = source;
    FC.base = words;
    App.go("sec-flashcard", title);
    initFlashcard();
    return true;
}

Actions.startAllFlashcards = () => {
    const words = S.words.filter(w => w.book !== TRASH_BOOK);
    if (!startFlashcards("all", words, "複習全部單字")) showToast("目前沒有單字！", "error");
};

Actions.startFlashcard = () => {
    const words = sortedBookWords();
    if (!startFlashcards("book", words, currentViewBook)) showToast("沒有單字喔！", "error");
};

Actions.startDueFlashcards = () => {
    const due = SRS.dueList();
    if (!due.all.length) { showToast("太棒了！今日需複習的單字已經全部清空了 🎉"); return; }
    startFlashcards("due", due.all, `SRS 需複習 (${due.all.length})`);
};

Actions.exitFlashcard = () => {
    TTS.stop();
    App.refreshCounts();
    if (FC.source === "book") openBook(currentViewBook);
    else App.go("sec-books");
};

function initFlashcard() {
    const order = $("fc-order").value;
    FC.cards = order === "shuffle" ? shuffle(FC.base) : [...FC.base];
    FC.index = 0;
    const isDue = FC.source === "due";
    show("standard-controls", !isDue);
    renderFlashcard();
}

$("fc-mode").addEventListener("change", initFlashcard);
$("fc-order").addEventListener("change", initFlashcard);

function currentCard() { return FC.cards[FC.index]; }

function renderFlashcard() {
    const w = currentCard();
    if (!w) return;
    $("flashcard-box").classList.remove("is-flipped");
    hide("srs-controls");
    FC.answered = false;
    const mode = $("fc-mode").value;
    $("fc-counter").textContent = `${FC.index + 1} / ${FC.cards.length}`;
    // 等翻回正面後再換內容，避免偷看到答案
    setTimeout(() => {
        const q = $("fc-question");
        const a = $("fc-answer");
        const example = w.example ? `<div class="fc-example"><i class="fas fa-quote-left text-primary"></i> ${esc(w.example)}</div>` : "";
        const phon = w.phonetic ? `<div class="phonetic" style="font-size:15px;">${esc(w.phonetic)}</div>` : "";
        if (mode === "en-zh") {
            q.innerHTML = `<div class="fc-q">${esc(w.english)}</div>${phon}`;
            a.innerHTML = `<div class="fc-a">${esc(w.chinese)}</div>${example}`;
            show("fc-play-btn");
        } else if (mode === "zh-en") {
            q.innerHTML = `<div class="fc-q">${esc(w.chinese)}</div>`;
            a.innerHTML = `<div class="fc-a">${esc(w.english)}</div>${phon}${example}`;
            hide("fc-play-btn");
        } else {
            q.innerHTML = `<div class="muted mb-16">請聽發音並輸入拼寫</div>
                <button class="btn-icon" style="margin:0 auto 24px;" data-action="playCurrentCard"><i class="fas fa-volume-up"></i></button>
                <input type="text" id="dictation-input" class="dictation-input" placeholder="在此拼寫..." autocomplete="off" autocapitalize="off" spellcheck="false" data-enter="flipCard">`;
            a.innerHTML = "";
            hide("fc-play-btn");
            setTimeout(() => TTS.say(w.english), 300);
            setTimeout(() => { const i = $("dictation-input"); if (i) i.focus(); }, 400);
        }
        $("fc-notes").textContent = w.notes || "";
        if (FC.source === "due") {
            ["forget", "hard", "easy", "familiar"].forEach(r => { $(`srs-hint-${r}`).textContent = SRS.hint(w, r); });
        }
    }, 150);
}

Actions.playCurrentCard = () => { const w = currentCard(); if (w) TTS.say(w.english); };

Actions.flipCard = (arg, el, e) => {
    if (e && e.target.closest("#dictation-input")) {
        if (e.type !== "keydown") return; // 點輸入框不翻面，按 Enter 才翻
    }
    if (FC.answered) return;
    const w = currentCard();
    if (!w) return;
    FC.answered = true;
    $("flashcard-box").classList.add("is-flipped");
    if (FC.source === "due") show("srs-controls");
    if ($("fc-mode").value === "dictation") {
        const input = $("dictation-input");
        const typed = input ? input.value.trim() : "";
        if (input) input.blur();
        const ok = typed.toLowerCase() === w.english.trim().toLowerCase();
        const example = w.example ? `<div class="fc-example"><i class="fas fa-quote-left text-primary"></i> ${esc(w.example)}</div>` : "";
        $("fc-answer").innerHTML = ok
            ? `<i class="fas fa-check-circle fc-result-icon" style="color:var(--success);"></i><div class="fc-a">${esc(w.english)}</div><div class="muted">${esc(w.chinese)}</div>${example}`
            : `<i class="fas fa-times-circle fc-result-icon" style="color:var(--danger);"></i>
               <div class="small muted">你的拼寫：</div><span class="fc-wrong">${esc(typed || "(未輸入)")}</span>
               <div class="small muted">正確解答：</div><div class="fc-a">${esc(w.english)}</div><div class="muted">${esc(w.chinese)}</div>${example}`;
    }
    setTimeout(() => TTS.say(w.english), 400);
};

Actions.nextCard = (step) => {
    if (!FC.cards.length) return;
    FC.index = (FC.index + Number(step) + FC.cards.length) % FC.cards.length;
    renderFlashcard();
};

Actions.answerSRS = (rating) => {
    const w = currentCard();
    if (!w) return;
    const s = SRS.rate(w, rating);
    if (rating === "familiar") showToast(`✅ ${fmtInterval((s.nextReviewTime - Date.now()) / DAY_MS)}複習`);
    FC.cards.splice(FC.index, 1);
    if (!FC.cards.length) {
        showToast("🎉 恭喜！今日複習任務完成！");
        Actions.exitFlashcard();
        return;
    }
    if (FC.index >= FC.cards.length) FC.index = 0;
    renderFlashcard();
};

// ===================== 統計 =====================
function updateStatistics() {
    const pool = S.words.filter(w => w.book !== TRASH_BOOK);
    const today = dateKey();
    $("stat-total").textContent = pool.length;
    $("stat-mastered").textContent = pool.filter(w => w.interval > 7).length;
    $("stat-today").textContent = pool.filter(w => w.timestamp && dateKey(w.timestamp) === today).length;
    $("stat-due").textContent = SRS.dueList().all.length;

    const byDate = new Map(S.log.map(r => [r.date, r]));
    // 連續天數：今天還沒複習時從昨天開始算
    let streak = 0;
    const d = new Date();
    if (!(byDate.get(dateKey(d)) || {}).reviews) d.setDate(d.getDate() - 1);
    while ((byDate.get(dateKey(d)) || {}).reviews > 0) { streak++; d.setDate(d.getDate() - 1); }
    $("stat-streak").textContent = streak;

    const days = [];
    for (let i = 29; i >= 0; i--) {
        const x = new Date(); x.setDate(x.getDate() - i);
        days.push(byDate.get(dateKey(x)) || { date: dateKey(x), reviews: 0, correct: 0 });
    }
    const total = days.reduce((s, r) => s + r.reviews, 0);
    const correct = days.reduce((s, r) => s + r.correct, 0);
    $("stat-accuracy").textContent = total ? Math.round(correct / total * 100) + "%" : "-";
    $("stat-30-total").textContent = `共 ${total} 次`;
    const max = Math.max(1, ...days.map(r => r.reviews));
    $("stat-bars").innerHTML = days.map(r =>
        `<div class="bar${r.reviews ? "" : " zero"}" style="height:${r.reviews ? Math.max(4, r.reviews / max * 100) : 3}%" title="${r.date}：${r.reviews} 次"></div>`).join("");
    $("stat-axis-start").textContent = days[0].date.slice(5).replace("-", "/");
}
