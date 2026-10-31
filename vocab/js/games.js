// ===================== 遊戲共用 =====================
const Game = { type: null, words: [], missed: new Map() };

Actions.openGameBookModal = (type) => {
    Game.type = type;
    renderBookChecklist($("game-books-container"), "game-book-check");
    show("game-book-modal");
};

// 勾選單字本（遊戲與循環播放共用）
function renderBookChecklist(container, cls) {
    const books = Store.books().filter(b => b !== TRASH_BOOK);
    const counts = {};
    Words.active().forEach(w => { counts[w.book] = (counts[w.book] || 0) + 1; });
    container.innerHTML = `<label class="all"><input type="checkbox" checked data-check-all="${cls}"> 全部</label>` +
        books.map(b => `<label><input type="checkbox" class="${cls}" value="${esc(b)}" checked> <span class="grow">${esc(b)}</span><span class="small muted">${counts[b] || 0}</span></label>`).join("");
    container.onchange = (e) => {
        if (e.target.dataset.checkAll) container.querySelectorAll("." + cls).forEach(cb => { cb.checked = e.target.checked; });
        else container.querySelector("[data-check-all]").checked = [...container.querySelectorAll("." + cls)].every(cb => cb.checked);
    };
}

function checkedBooks(cls) { return [...document.querySelectorAll(`.${cls}:checked`)].map(cb => cb.value); }

Actions.confirmStartGame = () => {
    const books = checkedBooks("game-book-check");
    Game.words = Words.active().filter(w => books.includes(w.book));
    if (!Game.words.length) { showToast("選擇的單字本沒有單字", "error"); return; }
    if (Game.type === "runner" && Game.words.length < 3) { showToast("至少需要 3 個字", "error"); return; }
    hide("game-book-modal");
    Game.missed = new Map();
    if (Game.type === "runner") Runner.start(); else Meteor.start();
};

async function loadHighScores() {
    const key = Store.k("scores_" + S.lang);
    S.scores = lsGet(key, { meteor: 0, runner: 0 });
    const paint = () => { $("score-meteor-best").textContent = S.scores.meteor; $("score-runner-best").textContent = S.scores.runner; };
    paint();
    try {
        const res = await Api.call("getScores", { lang: S.lang });
        S.scores = { meteor: Math.max(res.meteor || 0, S.scores.meteor), runner: Math.max(res.runner || 0, S.scores.runner) };
        lsSet(key, S.scores);
        paint();
    } catch (e) { /* 離線時用本機紀錄 */ }
}

function renderLives(id, n) { $(id).innerHTML = [0, 1, 2].map(i => `<span class="${i < n ? "" : "lost"}"></span>`).join(""); }

function finishGame(game, score, title) {
    const best = score > (S.scores[game] || 0);
    if (best) {
        S.scores[game] = score;
        lsSet(Store.k("scores_" + S.lang), S.scores);
        $(`score-${game}-best`).textContent = score;
        Queue.push("saveScore", { lang: S.lang, game, score });
    }
    const missed = [...Game.missed.values()];
    if (missed.length) SRS.markMissed(missed);
    const list = missed.length
        ? `<p class="eyebrow mt-16 mb-8">答錯的字（已排進今日複習）</p><div class="result-list">${missed.map(w => `<div><span class="serif">${esc(w.term)}</span><span class="muted">${esc(w.meaning)}</span></div>`).join("")}</div>`
        : "";
    UI.alert(title, `得分 ${score}${best && score ? "，新紀錄" : ""}`, list);
}

// ===================== 選擇題衝刺 =====================
const Runner = {
    active: false, score: 0, hp: 3, x: 0, speed: 5, lane: 1, current: null, options: [], remaining: [], anim: null,
    lanes: [15, 50, 85],

    start() {
        show("sec-game-runner");
        Object.assign(Runner, { active: true, score: 0, hp: 3, remaining: shuffle(Game.words) });
        $("runner-score").textContent = 0;
        renderLives("runner-lives", 3);
        window.addEventListener("keydown", Runner.onKey);
        Runner.spawn();
        Runner.anim = requestAnimationFrame(Runner.loop);
    },

    stop(title) {
        if (!Runner.active) return;
        Runner.active = false;
        cancelAnimationFrame(Runner.anim);
        window.removeEventListener("keydown", Runner.onKey);
        TTS.stop();
        hide("sec-game-runner");
        finishGame("runner", Runner.score, title);
    },

    onKey(e) {
        if (e.key === "ArrowUp") { e.preventDefault(); Runner.move("up"); }
        else if (e.key === "ArrowDown") { e.preventDefault(); Runner.move("down"); }
    },

    move(dir) {
        if (!Runner.active) return;
        Runner.lane = dir === "up" ? Math.max(0, Runner.lane - 1) : Math.min(2, Runner.lane + 1);
        $("runner-player").style.top = Runner.lanes[Runner.lane] + "%";
    },

    spawn() {
        if (!Runner.active) return;
        if (!Runner.remaining.length) { Runner.stop("全部完成"); return; }
        Runner.current = Runner.remaining.pop();
        const others = shuffle(Game.words.filter(w => w.term.toLowerCase() !== Runner.current.term.toLowerCase()));
        Runner.options = shuffle([Runner.current, others[0] || Runner.current, others[1] || others[0] || Runner.current]);
        $("runner-question").textContent = Runner.current.meaning;
        $("runner-feedback").innerHTML = "";
        Runner.options.forEach((w, i) => {
            const door = $(`runner-door-${i}`);
            door.textContent = w.term;
            door.style.top = Runner.lanes[i] + "%";
        });
        // 每答對一題快 0.1 秒，最快 2 秒
        const duration = Math.max(2, 4 - Runner.score * 0.1);
        Runner.x = window.innerWidth;
        Runner.speed = (window.innerWidth - 60) / (duration * 60);
        Runner.lane = 1;
        const p = $("runner-player");
        p.className = "runner-dot";
        p.style.top = "50%";
        Runner.place();
        TTS.say(Runner.current.meaning, "zh-TW");
    },

    place() { [0, 1, 2].forEach(i => { $(`runner-door-${i}`).style.left = Runner.x + "px"; }); },

    loop() {
        if (!Runner.active) return;
        Runner.x -= Runner.speed;
        Runner.place();
        if (Runner.x <= 64 && Runner.x > -100) {
            Runner.x = -400;
            Runner.place();
            const w = Runner.current;
            const p = $("runner-player");
            TTS.say(w.term);
            if (Runner.options[Runner.lane].term === w.term) {
                Runner.score++;
                $("runner-score").textContent = Runner.score;
                p.classList.add("good");
                $("runner-feedback").innerHTML = `<b>${esc(w.term)}</b>答對了`;
                setTimeout(Runner.spawn, 900);
            } else {
                Runner.hp--;
                Game.missed.set(w.id, w);
                renderLives("runner-lives", Runner.hp);
                p.classList.add("bad");
                $("runner-feedback").innerHTML = `<b>${esc(w.term)}</b>正確答案`;
                if (Runner.hp <= 0) setTimeout(() => Runner.stop("遊戲結束"), 1400);
                else setTimeout(Runner.spawn, 1400);
            }
        }
        Runner.anim = requestAnimationFrame(Runner.loop);
    }
};

Actions.runnerMove = (dir) => Runner.move(dir);
Actions.exitGameRunner = () => Runner.stop("已結束");

// ===================== 拼字防線 =====================
const Meteor = {
    active: false, score: 0, hp: 3, current: null, anim: null,

    start() {
        show("sec-game-meteor");
        Object.assign(Meteor, { active: true, score: 0, hp: 3, current: null });
        $("meteor-score").textContent = 0;
        renderLives("meteor-lives", 3);
        $("meteor-container").innerHTML = "";
        const keys = document.querySelector('#sec-game-meteor .accent-keys');
        keys.innerHTML = L().accents.map(c => `<button type="button">${c}</button>`).join("");
        keys.hidden = !L().accents.length;
        $("meteor-input").value = "";
        setTimeout(() => $("meteor-input").focus(), 100);
        Meteor.spawn();
        Meteor.anim = requestAnimationFrame(Meteor.loop);
    },

    stop(title) {
        if (!Meteor.active) return;
        Meteor.active = false;
        cancelAnimationFrame(Meteor.anim);
        TTS.stop();
        $("meteor-input").blur();
        hide("sec-game-meteor");
        finishGame("meteor", Meteor.score, title);
    },

    // 顯示：已打的字母 + 底線，保留首尾字母當提示
    mask(term, typedLen = 0) {
        const chars = [...term];
        return chars.map((c, i) => {
            if (i < typedLen) return `<span class="typed">${esc(c)}</span>`;
            if (c === " " || c === "-" || c === "'") return esc(c);
            if (typedLen === 0 && (i === 0 || i === chars.length - 1)) return esc(c);
            if (i === chars.length - 1) return esc(c);
            return "_";
        }).join("");
    },

    spawn() {
        if (!Meteor.active) return;
        const w = Game.words[Math.floor(Math.random() * Game.words.length)];
        const dom = document.createElement("div");
        dom.className = "meteor";
        dom.innerHTML = Meteor.mask(w.term);
        $("meteor-container").appendChild(dom);
        const height = $("meteor-container").clientHeight || window.innerHeight * 0.35;
        const duration = 6 + [...w.term].length * 0.5;
        Meteor.current = { w, dom, y: 0, target: height, speed: height / (duration * 60) };
        $("meteor-target-zh").textContent = w.meaning;
        $("meteor-input").value = "";
        TTS.say(w.meaning, "zh-TW");
    },

    onInput() {
        const m = Meteor.current;
        if (!Meteor.active || !m) return;
        const input = $("meteor-input");
        // 不分大小寫與重音
        const typed = foldAccents(input.value.trim());
        const target = foldAccents(m.w.term);
        if (!typed) return;
        if (!target.startsWith(typed)) {
            $("sec-game-meteor").classList.add("shake");
            setTimeout(() => $("sec-game-meteor").classList.remove("shake"), 250);
            input.value = "";
            m.dom.innerHTML = Meteor.mask(m.w.term);
            return;
        }
        m.dom.innerHTML = Meteor.mask(m.w.term, typed.length);
        if (typed !== target) return;
        Meteor.score++;
        $("meteor-score").textContent = Meteor.score;
        m.dom.classList.add("hit");
        m.dom.textContent = m.w.term;
        TTS.say(m.w.term);
        Meteor.current = null;
        input.value = "";
        setTimeout(() => { m.dom.style.opacity = "0"; setTimeout(() => m.dom.remove(), 300); Meteor.spawn(); }, 900);
    },

    loop() {
        if (!Meteor.active) return;
        const m = Meteor.current;
        if (m) {
            m.y += m.speed;
            m.dom.style.top = m.y + "px";
            if (m.y >= m.target) {
                Meteor.hp--;
                Game.missed.set(m.w.id, m.w);
                renderLives("meteor-lives", Meteor.hp);
                m.dom.classList.add("miss");
                m.dom.textContent = m.w.term;
                TTS.say(m.w.term);
                Meteor.current = null;
                $("meteor-input").value = "";
                if (Meteor.hp <= 0) setTimeout(() => Meteor.stop("遊戲結束"), 1400);
                else setTimeout(() => { m.dom.style.opacity = "0"; setTimeout(() => m.dom.remove(), 300); Meteor.spawn(); }, 1400);
            }
        }
        Meteor.anim = requestAnimationFrame(Meteor.loop);
    }
};

$("meteor-input").addEventListener("input", Meteor.onInput);
$("sec-game-meteor").addEventListener("click", (e) => { if (Meteor.active && !e.target.closest("button")) $("meteor-input").focus(); });
Actions.exitGameMeteor = () => Meteor.stop("已結束");

// ===================== 循環播放 =====================
const Radio = { words: [], index: 0, playing: false, timer: null, token: 0 };

Actions.openRadioSetup = () => {
    renderBookChecklist($("radio-books-container"), "radio-book-check");
    App.go("sec-radio-setup");
};

Actions.startRadioMode = () => {
    let words = Words.active().filter(w => checkedBooks("radio-book-check").includes(w.book));
    if (!words.length) { showToast("選擇的單字本沒有單字", "error"); return; }
    if (document.querySelector('input[name="radio-order"]:checked').value === "shuffle") words = shuffle(words);
    Object.assign(Radio, { words, index: 0 });
    App.go("sec-radio-player");
    Actions.resumeRadio();
};

Actions.stopRadioMode = () => { Actions.pauseRadio(); App.go("sec-books"); };

Actions.pauseRadio = () => {
    Radio.playing = false;
    Radio.token++;
    clearTimeout(Radio.timer);
    TTS.stop();
    show("radio-play-btn"); hide("radio-pause-btn");
};

Actions.resumeRadio = () => {
    Radio.playing = true;
    hide("radio-play-btn"); show("radio-pause-btn");
    playRadioNext();
};

// 單字 ×2 → 中文 → 例句（若有）→ 下一個，無限循環
function playRadioNext() {
    if (!Radio.playing) return;
    if (Radio.index >= Radio.words.length) Radio.index = 0;
    const w = Radio.words[Radio.index];
    const token = ++Radio.token;
    $("radio-progress").textContent = `${Radio.index + 1} / ${Radio.words.length}`;
    $("radio-current-en").textContent = w.term;
    $("radio-current-zh").textContent = w.meaning;
    $("radio-current-ex").textContent = w.example || "";
    $("radio-current-zh").classList.remove("show");
    $("radio-current-ex").classList.remove("show");
    const wait = (fn, ms) => { if (Radio.playing && token === Radio.token) Radio.timer = setTimeout(fn, ms); };
    const steps = [
        (next) => TTS.speak(w.term, { rate: 0.9, onend: () => wait(next, 500) }),
        (next) => TTS.speak(w.term, { rate: 0.9, onend: () => wait(next, 500) }),
        (next) => { $("radio-current-zh").classList.add("show"); TTS.speak(w.meaning, { lang: "zh-TW", rate: 0.95, onend: () => wait(next, 900) }); },
        (next) => {
            if (!w.example) { next(); return; }
            $("radio-current-ex").classList.add("show");
            TTS.speak(w.example, { rate: 0.9, onend: () => wait(next, 900) });
        },
        () => { Radio.index++; wait(playRadioNext, 700); }
    ];
    let i = 0;
    const next = () => { if (Radio.playing && token === Radio.token && i < steps.length) steps[i++](next); };
    next();
}
