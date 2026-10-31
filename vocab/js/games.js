// ===================== 遊戲共用 =====================
const Game = { type: null, words: [], missed: new Map() };

Actions.openGameBookModal = (type) => {
    Game.type = type;
    renderBookChecklist($("game-books-container"), "game-book-check");
    show("game-book-modal");
};

// 勾選單字本清單（遊戲與循環播放共用）
function renderBookChecklist(container, cls) {
    const books = Store.books().filter(b => b !== TRASH_BOOK);
    const counts = {};
    S.words.forEach(w => { counts[w.book] = (counts[w.book] || 0) + 1; });
    container.innerHTML = `<label class="all"><input type="checkbox" checked data-check-all="${cls}"> 全部單字本</label>` +
        books.map(b => `<label><input type="checkbox" class="${cls}" value="${esc(b)}" checked> ${esc(b)} <span class="muted small">(${counts[b] || 0})</span></label>`).join("");
    container.onchange = (e) => {
        if (e.target.dataset.checkAll) container.querySelectorAll("." + cls).forEach(cb => { cb.checked = e.target.checked; });
        else container.querySelector("[data-check-all]").checked = [...container.querySelectorAll("." + cls)].every(cb => cb.checked);
    };
}

function checkedBooks(cls) {
    return [...document.querySelectorAll(`.${cls}:checked`)].map(cb => cb.value);
}

Actions.confirmStartGame = () => {
    const books = checkedBooks("game-book-check");
    if (!books.length) { showToast("請至少選擇一本單字本", "error"); return; }
    Game.words = S.words.filter(w => books.includes(w.book));
    if (!Game.words.length) { showToast("選擇的單字本內沒有單字喔", "error"); return; }
    if (Game.type === "runner" && Game.words.length < 3) { showToast("至少需要 3 個單字", "error"); return; }
    hide("game-book-modal");
    Game.missed = new Map();
    if (Game.type === "runner") Runner.start(); else Meteor.start();
};

async function loadHighScores() {
    try {
        const res = await Api.call("getScores");
        S.scores = { meteor: res.meteor || 0, runner: res.runner || 0 };
        lsSet(Store.k("scores"), S.scores);
    } catch (e) {
        S.scores = lsGet(Store.k("scores"), S.scores);
    }
    $("score-meteor-best").textContent = S.scores.meteor;
    $("score-runner-best").textContent = S.scores.runner;
}

// 結束遊戲：存最高分、答錯的字排進複習、顯示結果
function finishGame(game, score, title) {
    const isBest = score > (S.scores[game] || 0);
    if (isBest) {
        S.scores[game] = score;
        lsSet(Store.k("scores"), S.scores);
        $(`score-${game}-best`).textContent = score;
        Queue.push("saveScore", { game, score });
    }
    const missed = [...Game.missed.values()];
    if (missed.length) SRS.markMissed(missed);
    const list = missed.length
        ? `<div class="label-sm mt-8">答錯的單字（已排進今日需複習）：</div><div class="result-list">${missed.map(w => `<div><b>${esc(w.english)}</b><span class="muted">${esc(w.chinese)}</span></div>`).join("")}</div>`
        : "";
    UI.alert(title, `得分：${score}${isBest && score ? "　🏆 新紀錄！" : ""}`, list);
}

// ===================== 單字跑酷 =====================
const Runner = {
    active: false, score: 0, hp: 3, speed: 5, x: 0, lane: 1, current: null, options: [], remaining: [], anim: null,
    lanes: [210, 140, 70],

    start() {
        show("sec-game-runner");
        Object.assign(Runner, { active: true, score: 0, hp: 3, remaining: shuffle(Game.words) });
        $("runner-score").textContent = 0;
        $("runner-hp-display").textContent = "❤️❤️❤️";
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
        finishGame("runner", Runner.score, title || "遊戲結束");
    },

    onKey(e) {
        if (e.key === "ArrowUp") { e.preventDefault(); Runner.move("up"); }
        else if (e.key === "ArrowDown") { e.preventDefault(); Runner.move("down"); }
    },

    move(dir) {
        if (!Runner.active) return;
        Runner.lane = dir === "up" ? Math.max(0, Runner.lane - 1) : Math.min(2, Runner.lane + 1);
        $("runner-player").style.bottom = Runner.lanes[Runner.lane] + "px";
    },

    spawn() {
        if (!Runner.active) return;
        if (!Runner.remaining.length) { Runner.stop("恭喜通關！🎉"); return; }
        Runner.current = Runner.remaining.pop();
        const others = shuffle(Game.words.filter(w => w.english.toLowerCase() !== Runner.current.english.toLowerCase()));
        const pick = [Runner.current, others[0] || Runner.current, others[1] || others[0] || Runner.current];
        Runner.options = shuffle(pick);
        $("runner-question").textContent = Runner.current.chinese;
        Runner.options.forEach((w, i) => {
            $(`runner-door-${i}`).textContent = w.english;
            $(`runner-static-${i}`).textContent = w.english;
        });
        // 每答對一題快 0.1 秒，最快 1.5 秒
        const duration = Math.max(1.5, 3.5 - Runner.score * 0.1);
        Runner.x = window.innerWidth;
        Runner.speed = window.innerWidth / (duration * 60);
        Runner.lane = 1;
        const p = $("runner-player");
        p.className = "runner-player";
        p.textContent = "🏃";
        p.style.bottom = Runner.lanes[1] + "px";
        TTS.say(Runner.current.chinese, "zh-TW");
    },

    feedback(html, ms) {
        const fb = $("runner-feedback");
        fb.innerHTML = html;
        fb.classList.add("show");
        setTimeout(() => fb.classList.remove("show"), ms);
    },

    loop() {
        if (!Runner.active) return;
        Runner.x -= Runner.speed;
        $("runner-doors").style.left = Runner.x + "px";
        // 門的左緣碰到人物右緣（50 + 60）時判定
        if (Runner.x <= 110 && Runner.x > -100) {
            Runner.x = -300;
            const w = Runner.current;
            const p = $("runner-player");
            TTS.say(w.english);
            if (Runner.options[Runner.lane].english === w.english) {
                Runner.score++;
                $("runner-score").textContent = Runner.score;
                p.classList.add("good");
                Runner.feedback('<span style="color:#00FF41; text-shadow:0 0 20px #000;">✅ 正確！</span>', 800);
                setTimeout(Runner.spawn, 1000);
            } else {
                Runner.hp--;
                Game.missed.set(w.id, w);
                $("runner-hp-display").textContent = "❤️".repeat(Math.max(0, Runner.hp));
                p.classList.add("bad");
                p.textContent = "😵";
                Runner.feedback(`<span style="color:#EF4444; text-shadow:0 0 20px #000;">❌ 錯誤！</span><br><span class="word">${esc(w.english)}</span>`, 1200);
                if (Runner.hp <= 0) setTimeout(() => Runner.stop("遊戲結束 💥"), 1500);
                else setTimeout(Runner.spawn, 1500);
            }
        }
        Runner.anim = requestAnimationFrame(Runner.loop);
    }
};

Actions.runnerMove = (dir) => Runner.move(dir);
Actions.exitGameRunner = () => Runner.stop("已退出遊戲");

// ===================== 星際雷射防禦戰 =====================
const Meteor = {
    active: false, score: 0, hp: 3, current: null, anim: null,

    start() {
        show("sec-game-meteor");
        Object.assign(Meteor, { active: true, score: 0, hp: 3, current: null });
        $("meteor-score").textContent = 0;
        $("meteor-hp-fill").style.width = "100%";
        $("meteor-container").innerHTML = "";
        const input = $("meteor-input");
        input.value = "";
        setTimeout(() => input.focus(), 100);
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
        finishGame("meteor", Meteor.score, title || "遊戲結束");
    },

    mask(word, typedLen = 0) {
        const typed = word.slice(0, typedLen);
        let rest = "";
        const remain = word.length - typedLen;
        if (remain === 1) rest = word.slice(-1);
        else if (remain > 1) rest = (typedLen === 0 && word.length > 2 ? word[0] + "_".repeat(word.length - 2) : "_".repeat(remain - 1)) + word.slice(-1);
        if (typedLen === 0 && word.length <= 2) rest = word;
        return `<span class="typed">${esc(typed)}</span>${esc(rest)}`;
    },

    spawn() {
        if (!Meteor.active) return;
        const w = Game.words[Math.floor(Math.random() * Game.words.length)];
        const dom = document.createElement("div");
        dom.className = "meteor";
        dom.innerHTML = Meteor.mask(w.english);
        $("meteor-container").appendChild(dom);
        const target = window.innerHeight * 0.45;
        const duration = 5 + w.english.length * 0.5;
        Meteor.current = { w, dom, y: 0, speed: target / (duration * 60) };
        $("meteor-target-zh").textContent = w.chinese;
        $("meteor-input").value = "";
        TTS.say(w.chinese, "zh-TW");
    },

    onInput() {
        const m = Meteor.current;
        if (!Meteor.active || !m) return;
        const input = $("meteor-input");
        const typed = input.value.toLowerCase().trim();
        const target = m.w.english.toLowerCase();
        if (!typed) return;
        if (!target.startsWith(typed)) {
            const sec = $("sec-game-meteor");
            sec.classList.add("hit");
            setTimeout(() => sec.classList.remove("hit"), 100);
            input.value = "";
            m.dom.innerHTML = Meteor.mask(m.w.english);
            return;
        }
        const turret = $("meteor-base-turret");
        turret.classList.add("fire");
        setTimeout(() => turret.classList.remove("fire"), 50);
        m.dom.innerHTML = Meteor.mask(m.w.english, typed.length);
        if (typed !== target) return;

        Meteor.score++;
        $("meteor-score").textContent = Meteor.score;
        const laser = document.createElement("div");
        laser.className = "meteor-laser";
        const baseTop = window.innerHeight * 0.45 - 20;
        laser.style.top = (m.y + 20) + "px";
        laser.style.height = Math.max(0, baseTop - m.y) + "px";
        $("meteor-container").appendChild(laser);
        setTimeout(() => laser.remove(), 100);
        m.dom.classList.add("boom");
        m.dom.textContent = m.w.english;
        TTS.say(m.w.english);
        Meteor.current = null;
        input.value = "";
        setTimeout(() => { m.dom.style.opacity = "0"; setTimeout(() => m.dom.remove(), 200); Meteor.spawn(); }, 1200);
    },

    loop() {
        if (!Meteor.active) return;
        const m = Meteor.current;
        if (m) {
            m.y += m.speed;
            m.dom.style.top = m.y + "px";
            if (m.y > window.innerHeight * 0.45) {
                Meteor.hp--;
                Game.missed.set(m.w.id, m.w);
                $("meteor-hp-fill").style.width = (Meteor.hp / 3 * 100) + "%";
                const sec = $("sec-game-meteor");
                sec.style.transform = "translate(20px, 20px)";
                setTimeout(() => { sec.style.transform = "translate(-20px, -20px)"; }, 50);
                setTimeout(() => { sec.style.transform = ""; }, 100);
                m.dom.textContent = m.w.english;
                TTS.say(m.w.english);
                Meteor.current = null;
                $("meteor-input").value = "";
                if (Meteor.hp <= 0) setTimeout(() => Meteor.stop("基地全毀！💥"), 1500);
                else setTimeout(() => { m.dom.style.opacity = "0"; setTimeout(() => m.dom.remove(), 200); Meteor.spawn(); }, 1200);
            }
        }
        Meteor.anim = requestAnimationFrame(Meteor.loop);
    }
};

$("meteor-input").addEventListener("input", Meteor.onInput);
$("sec-game-meteor").addEventListener("click", () => { if (Meteor.active) $("meteor-input").focus(); });
Actions.exitGameMeteor = () => Meteor.stop("已退出遊戲");

// ===================== 單字循環播放 =====================
const Radio = { words: [], index: 0, playing: false, timer: null, token: 0 };

Actions.openRadioSetup = () => {
    renderBookChecklist($("radio-books-container"), "radio-book-check");
    App.go("sec-radio-setup", "單字循環播放");
};

Actions.startRadioMode = () => {
    const books = checkedBooks("radio-book-check");
    if (!books.length) { showToast("請至少選擇一本單字本", "error"); return; }
    let words = S.words.filter(w => books.includes(w.book));
    if (!words.length) { showToast("選擇的單字本內沒有單字喔", "error"); return; }
    if (document.querySelector('input[name="radio-order"]:checked').value === "shuffle") words = shuffle(words);
    Object.assign(Radio, { words, index: 0 });
    App.go("sec-radio-player", "循環播放");
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

// 英文 ×2 → 中文 → 例句（若有）→ 下一個，無限循環
function playRadioNext() {
    if (!Radio.playing) return;
    if (Radio.index >= Radio.words.length) Radio.index = 0;
    const w = Radio.words[Radio.index];
    const token = ++Radio.token;
    $("radio-progress").textContent = `${Radio.index + 1} / ${Radio.words.length}`;
    $("radio-current-en").textContent = w.english;
    $("radio-current-zh").textContent = w.chinese;
    $("radio-current-ex").textContent = w.example || "尚無例句";
    $("radio-current-zh").classList.remove("show");
    $("radio-current-ex").classList.remove("show");

    const steps = [
        (next) => TTS.speak(w.english, { lang: "en-US", rate: 0.9, onend: () => wait(next, 500) }),
        (next) => TTS.speak(w.english, { lang: "en-US", rate: 0.9, onend: () => wait(next, 500) }),
        (next) => { $("radio-current-zh").classList.add("show"); TTS.speak(w.chinese, { lang: "zh-TW", rate: 0.9, onend: () => wait(next, 1000) }); },
        (next) => {
            if (!w.example) { next(); return; }
            $("radio-current-ex").classList.add("show");
            TTS.speak(w.example, { lang: "en-US", rate: 0.9, onend: () => wait(next, 1000) });
        },
        () => { Radio.index++; wait(playRadioNext, 800); }
    ];
    const wait = (fn, ms) => { if (Radio.playing && token === Radio.token) Radio.timer = setTimeout(fn, ms); };
    let i = 0;
    const next = () => { if (Radio.playing && token === Radio.token && i < steps.length) steps[i++](next); };
    next();
}
