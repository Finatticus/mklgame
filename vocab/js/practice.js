// ===================== 每日目標與連續天數 =====================
const Goals = {
    conf() { return Object.assign({ reviews: 20, words: 5, study: 1 }, Store.get("goals", {}) || {}); },

    studyToday() {
        const d = Store.get("daily", null);
        return d && d.date === dateKey() ? d.study || 0 : 0;
    },

    // 完成一次學習（一課、一次測驗、一段 AI 練習…）
    mark() {
        Store.set({ daily: { date: dateKey(), study: Goals.studyToday() + 1 } });
        Goals.touch();
        Goals.render();
    },

    // 記下今天有學習（連續天數用，跨裝置同步）
    touch() {
        const days = Store.get("days", []) || [];
        const today = dateKey();
        if (!days.includes(today)) Store.set({ days: [...days, today].slice(-400) });
    },

    // 有複習或有其他學習的日子都算
    streak() {
        const active = new Set((Store.get("days", []) || []).concat(S.log.filter(r => r.lang === S.lang && r.reviews > 0).map(r => r.date)));
        const d = new Date();
        if (!active.has(dateKey(d))) d.setDate(d.getDate() - 1);
        let n = 0;
        while (active.has(dateKey(d))) { n++; d.setDate(d.getDate() - 1); }
        return n;
    },

    progress() {
        const today = dateKey();
        const log = Store.logToday();
        return {
            reviews: log ? log.reviews : 0,
            words: Words.active().filter(w => w.timestamp && dateKey(w.timestamp) === today).length,
            study: Goals.studyToday()
        };
    },

    render() {
        const box = $("today-goals");
        if (!box || !S.user) return;
        const c = Goals.conf(), p = Goals.progress();
        const item = (k, label, unit) => {
            const goal = c[k];
            if (!goal) return "";
            const pct = Math.min(100, Math.round(p[k] / goal * 100));
            return `<div class="goal${pct >= 100 ? " met" : ""}"><div class="goal-top"><span>${label}</span><b>${p[k]}<small>/${goal}${unit}</small></b></div><div class="goal-bar"><div style="width:${pct}%"></div></div></div>`;
        };
        const streak = Goals.streak();
        box.innerHTML = item("reviews", "複習", "") + item("words", "新字", "") + item("study", "學習", "次") +
            `<div class="goal streak"><div class="goal-top"><span>連續</span><b>${streak}<small> 天</small></b></div></div>`;
        const n = Mistakes.list().length;
        $("mistake-badge").textContent = n ? n : "";
    }
};

// ===================== 錯題本 =====================
// 存在雲端設定（依語言分開），最多 150 題；同一題再錯會移到最前面
const Mistakes = {
    MAX: 150,
    list() { return Store.get("mistakes", []) || []; },
    key(x) { return JSON.stringify(x); },

    add(x, src) {
        const k = Mistakes.key(x);
        const list = Mistakes.list();
        const old = list.find(m => Mistakes.key(m.x) === k);
        const rest = list.filter(m => m !== old);
        Store.set({ mistakes: [{ x, src: src || "", at: Date.now(), n: old ? (old.n || 1) + 1 : 1 }, ...rest].slice(0, Mistakes.MAX) });
    },

    remove(x) {
        const k = Mistakes.key(x);
        const list = Mistakes.list();
        if (list.some(m => Mistakes.key(m.x) === k)) Store.set({ mistakes: list.filter(m => Mistakes.key(m.x) !== k) });
    }
};

// 錯題分類（依來源）
const MISTAKE_CATS = [["all", "全部"], ["lesson", "課程練習"], ["test", "測驗"], ["grammar", "文法"], ["verb", "動詞變化"], ["quiz", "單字快問"]];
let mistakeFilter = "all";

function mistakeCat(m) {
    const src = m.src || "";
    if (/測驗|考試/.test(src)) return "test";
    if (src.startsWith("文法")) return "grammar";
    if (src === "動詞變化") return "verb";
    if (src === "單字快問") return "quiz";
    return "lesson";
}

function filteredMistakes() {
    return Mistakes.list().map((m, i) => ({ m, i })).filter(({ m }) => mistakeFilter === "all" || mistakeCat(m) === mistakeFilter);
}

function renderMistakes() {
    const all = Mistakes.list();
    const counts = {};
    all.forEach(m => { const c = mistakeCat(m); counts[c] = (counts[c] || 0) + 1; });
    if (mistakeFilter !== "all" && !counts[mistakeFilter]) mistakeFilter = "all";
    $("mistakes-filter").innerHTML = MISTAKE_CATS.filter(([k]) => k === "all" || counts[k])
        .map(([k, name]) => `<option value="${k}"${k === mistakeFilter ? " selected" : ""}>${name}（${k === "all" ? all.length : counts[k]}）</option>`).join("");
    show("mistakes-filter", all.length > 0);
    const rows = filteredMistakes();
    $("mistakes-count").textContent = all.length ? "重練時答對就會移出錯題本" : "";
    show("btn-redo-mistakes", rows.length > 0);
    $("mistakes-list").innerHTML = rows.length ? `<div class="list">${rows.map(({ m, i }) => `
        <div class="list-row static mistake">
            <div class="grow">
                <div class="small">${esc(exPrompt(m.x))}</div>
                <div class="serif">${esc(exAnswer(m.x))}</div>
                <div class="tiny muted">${esc(m.src)}${m.n > 1 ? ` · 錯 ${m.n} 次` : ""}</div>
            </div>
            ${speakBtn(exAnswer(m.x))}
            <button class="icon-btn danger" data-action="removeMistake" data-arg="${i}" title="移除"><i class="icon-x"></i></button>
        </div>`).join("")}</div>`
        : '<div class="empty"><div class="serif">錯題本是空的</div>課程練習、測驗、動詞練習答錯的題目會自動收進來。</div>';
}

Actions.removeMistake = (i) => { Mistakes.remove(Mistakes.list()[Number(i)].x); renderMistakes(); Goals.render(); };

Actions.clearMistakes = async () => {
    if (!(await UI.confirm("清空錯題本", "確定移除所有錯題？", { okLabel: "清空", danger: true }))) return;
    Store.set({ mistakes: [] });
    renderMistakes();
    Goals.render();
};

$("mistakes-filter").addEventListener("change", (e) => { mistakeFilter = e.target.value; renderMistakes(); });

// 重練目前分類裡最近的 20 題
Actions.redoMistakes = () => {
    const list = filteredMistakes().slice(0, 20).map(x => x.m);
    if (!list.length) { showToast("錯題本是空的"); App.go("sec-practice"); Actions.practiceTab("mistakes"); return; }
    openLessonPage({ id: "mistakes", kind: "mistakes", eyebrow: "錯題本", title: "錯題重練", goal: `最近答錯的 ${list.length} 題。答對的會移出錯題本。`, ex: shuffle(list.map(m => m.x)) });
};

// ===================== 句子卡 =====================
const SENT_BOOK = "句子";

const Sent = {
    async save(text, zh) {
        text = String(text || "").trim();
        if (!text) return;
        if (Words.findDuplicate(text, SENT_BOOK)) { showToast("已經存過這個句子"); return; }
        if (!zh) zh = await Svc.translate(text).catch(() => "");
        if (!zh) { showToast("翻譯失敗，請稍後再試", "error"); return; }
        if (!Store.books().includes(SENT_BOOK)) Store.saveBookOrder([...Store.books(), SENT_BOOK]);
        Words.add([{ book: SENT_BOOK, term: text, meaning: zh, pos: "sent." }]);
        refreshBookSelects();
        showToast(`已存到「${SENT_BOOK}」，會出現在每日複習`);
    },
    list() { return Words.active().filter(w => w.pos === "sent."); }
};

document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-save-sent]");
    if (!b) return;
    e.stopPropagation();
    Sent.save(b.dataset.saveSent, b.dataset.zh).then(() => { b.innerHTML = '<i class="icon-check"></i>'; });
});

// ===================== 語音辨識 =====================
const Speech = {
    active: null,
    supported() { return !!(window.SpeechRecognition || window.webkitSpeechRecognition); },

    // 回傳辨識出的幾種可能（最多 3 個）
    listen(lang) {
        return new Promise((resolve, reject) => {
            const R = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!R) { reject(new Error("unsupported")); return; }
            TTS.stop();
            const r = new R();
            r.lang = lang;
            r.interimResults = false;
            r.maxAlternatives = 3;
            let done = false;
            r.onresult = (e) => { done = true; resolve([...e.results[0]].map(a => a.transcript)); };
            r.onerror = (e) => { if (!done) { done = true; reject(new Error(e.error || "error")); } };
            r.onend = () => { Speech.active = null; if (!done) { done = true; resolve([]); } };
            Speech.active = r;
            r.start();
        });
    },

    stop() { if (Speech.active) Speech.active.stop(); },

    errorText(e) {
        const m = e && e.message;
        if (m === "unsupported") return "這個瀏覽器不支援語音辨識。iPhone 請用 Safari（iOS 14.5 以上），電腦請用 Chrome 或 Edge。";
        if (m === "not-allowed" || m === "service-not-allowed") return "沒有麥克風權限，請在瀏覽器或系統設定中允許。";
        if (m === "no-speech") return "沒有聽到聲音，請再試一次。";
        if (m === "network") return "語音辨識需要網路連線。";
        return "語音辨識失敗，請再試一次。";
    }
};

// ===================== 跟讀 =====================
const Shadow = { text: "", zh: "" };

function shadowTokens(s) {
    return foldAccents(s).replace(/['’]/g, " ").replace(/[^a-z0-9\s-]/g, " ").split(/[\s-]+/).filter(Boolean);
}

// 最長共同子序列：標記目標句裡哪些字有唸到
function lcsFlags(a, b) {
    const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--)
        dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const flags = new Array(a.length).fill(false);
    let i = 0, j = 0;
    while (i < a.length && j < b.length) {
        if (a[i] === b[j]) { flags[i] = true; i++; j++; }
        else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
        else j++;
    }
    return { flags, n: dp[0][0] };
}

function shadowScore(target, said) {
    const a = shadowTokens(target), b = shadowTokens(said);
    if (!a.length || !b.length) return { score: 0, flags: a.map(() => false) };
    const { flags, n } = lcsFlags(a, b);
    return { score: Math.round(200 * n / (a.length + b.length)), flags };
}

function openShadow(text, zh) {
    Shadow.text = String(text).trim();
    Shadow.zh = zh || "";
    $("shadow-target").textContent = Shadow.text;
    $("shadow-zh").textContent = Shadow.zh;
    $("shadow-result").innerHTML = Speech.supported() ? "" : `<p class="small hint">${esc(Speech.errorText({ message: "unsupported" }))}</p>`;
    $("shadow-rec").disabled = !Speech.supported();
    show("shadow-modal");
    TTS.say(Shadow.text, L().tts);
}

document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-shadow]");
    if (!b) return;
    e.stopPropagation();
    openShadow(b.dataset.shadow, b.dataset.zh);
});

Actions.shadowPlay = (rate) => { TTS.stop(); TTS.speak(Shadow.text, { lang: L().tts, rate: Number(rate) || 1 }); };
Actions.closeShadow = () => { Speech.stop(); TTS.stop(); hide("shadow-modal"); };

Actions.shadowRecord = async () => {
    const btn = $("shadow-rec");
    setBusy(btn, true, '<i class="icon-mic"></i> 請開始唸…');
    $("shadow-result").innerHTML = "";
    try {
        const alts = await Speech.listen(L().tts);
        if (!alts.length) { $("shadow-result").innerHTML = `<p class="small hint">${esc(Speech.errorText({ message: "no-speech" }))}</p>`; return; }
        const best = alts.map(said => ({ said, ...shadowScore(Shadow.text, said) })).sort((a, b) => b.score - a.score)[0];
        // 依原句的字逐一標色（沒唸到的標紅）
        let k = 0;
        const marked = makeClickable(Shadow.text).replace(/<span class="cw" data-word="([^"]*)">([^<]*)<\/span>/g, (m, w, inner) => {
            const toks = shadowTokens(w);
            const ok = toks.every(() => best.flags[k++]);
            return `<span class="${ok ? "sh-ok" : "sh-miss"}">${inner}</span>`;
        });
        const verdict = best.score >= 90 ? "很標準" : best.score >= 70 ? "不錯" : best.score >= 50 ? "再練練" : "多聽幾次再試";
        $("shadow-result").innerHTML = `
            <div class="shadow-score"><b>${best.score}</b><span>${verdict}</span></div>
            <div class="serif shadow-marked">${marked}</div>
            <p class="small muted mt-8">系統聽到：${esc(best.said)}</p>
            <p class="tiny muted mt-8">分數是語音辨識比對的結果，紅色是沒有被辨識出來的字，可以多聽那幾個字的發音。</p>`;
    } catch (e) {
        $("shadow-result").innerHTML = `<p class="small hint">${esc(Speech.errorText(e))}</p>`;
    } finally {
        setBusy(btn, false);
    }
};

// 跟讀分頁：句子卡、上次的課、課程隨機句
function shadowSentences(source) {
    if (source === "sent") return Sent.list().slice().reverse().slice(0, 50).map(w => [w.term, w.meaning]);
    const course = Class.course();
    if (source === "lesson") {
        const p = Class.progress();
        const l = course.find(x => x.id === p.last) || course[0];
        return l ? (l.dialog || []).map(d => [Class.speakable(d[1]), d[2]]).concat((l.grammar || []).flatMap(g => g.ex || [])) : [];
    }
    const all = course.flatMap(l => (l.dialog || []).map(d => [Class.speakable(d[1]), d[2]]));
    return shuffle(all).slice(0, 12);
}

function renderShadowList() {
    const source = $("shadow-source").value;
    const items = shadowSentences(source);
    $("shadow-list").innerHTML = items.length
        ? items.map(([t, zh]) => `<div class="ex">${speakBtn(t)}<div class="grow"><div class="ex-fr">${esc(t)}</div><div class="ex-zh">${esc(zh)}</div></div>
            <button class="icon-btn sm" data-shadow="${esc(t)}" data-zh="${esc(zh)}" title="跟讀"><i class="icon-mic"></i></button></div>`).join("")
        : `<div class="empty">${source === "sent" ? "還沒有句子卡。在課程例句、對話、文章旁按 <i class=\"icon-bookmark-plus\"></i> 就能存下來。" : "沒有句子"}</div>`;
}

$("shadow-source").addEventListener("change", renderShadowList);

// ===================== 練習頁 =====================
Actions.openPractice = (tab) => { App.go("sec-practice"); Actions.practiceTab(tab || "chat"); };

Actions.practiceTab = (tab) => {
    document.querySelectorAll("#practice-tabs button").forEach(b => b.classList.toggle("on", b.dataset.arg === tab));
    ["chat", "write", "story", "shadow", "mistakes"].forEach(t => show("practice-" + t, t === tab));
    if (tab === "shadow") {
        const lesson = Class.course().find(x => x.id === Class.progress().last);
        $("shadow-source").innerHTML = `<option value="sent">我的句子卡（${Sent.list().length}）</option><option value="lesson">上次的課${lesson ? "：" + esc(lesson.title) : ""}</option><option value="random">課程對話隨機 12 句</option>`;
        renderShadowList();
    }
    if (tab === "mistakes") renderMistakes();
};

function renderPracticePage() {
    $("practice-lang").textContent = `${L().name} · ${L().label}`;
    const lvKey = "vocab_ai_level_" + S.lang;
    const lv = lsGet(lvKey, S.lang === "fr" ? "A2" : "B1");
    ["chat-level", "write-level", "story-level"].forEach(id => {
        $(id).innerHTML = ["A1", "A2", "B1", "B2"].map(x => `<option value="${x}"${x === lv ? " selected" : ""}>${x} ${LEVEL_NAMES[x]}</option>`).join("");
        $(id).onchange = (e) => { lsSet(lvKey, e.target.value); ["chat-level", "write-level", "story-level"].forEach(o => { $(o).value = e.target.value; }); };
    });
    $("chat-scenarios").innerHTML = CHAT_SCENES.map((s, i) => `<button class="chip" data-scene="${i}">${esc(s[0])}</button>`).join("");
    document.querySelectorAll("#sec-practice .accent-keys").forEach(box => {
        box.innerHTML = L().accents.map(c => `<button type="button">${c}</button>`).join("");
        box.hidden = !L().accents.length;
    });
    $("chat-text").placeholder = `用${L().label}回答…`;
    $("write-text").placeholder = `用${L().label}寫一段文字（幾句到幾段都可以）`;
    if (Chat.lang !== S.lang) resetChat();
}

// ===================== 目前使用的 AI（更多頁） =====================
const AI_NAMES = { claude: "Claude", gemini: "Gemini" };
let aiInfoCache = null;

async function loadAiInfo(force) {
    const box = $("ai-info");
    if (aiInfoCache && !force) { box.innerHTML = aiInfoCache; return; }
    box.innerHTML = '<span class="muted">檢查中…</span>';
    try {
        const r = await Api.call("aiInfo");
        const name = AI_NAMES[r.provider] || r.provider;
        aiInfoCache = r.ready
            ? `<span class="verdict good">可以使用</span> ${esc(name)} · <span class="serif">${esc(r.model || "")}</span>`
            : `<span class="verdict warn">尚未設定</span> 目前選用 ${esc(name)}，但 GAS 指令碼屬性裡沒有 ${r.provider === "claude" ? "ANTHROPIC_API_KEY" : "GEMINI_API_KEY"}。`;
        box.innerHTML = aiInfoCache;
    } catch (e) {
        box.innerHTML = `<span class="muted">${e instanceof ServerError ? "後端還沒有這個功能，請部署最新的 GAS.gs" : "目前離線，無法檢查"}</span>`;
    }
}

Actions.refreshAiInfo = () => loadAiInfo(true);

// ===================== AI 情境對話 =====================
const CHAT_SCENES = [
    ["咖啡廳點餐", "ordering drinks and pastries at a café; you are the barista"],
    ["餐廳用餐", "dinner at a restaurant: ordering, asking about dishes, paying; you are the waiter"],
    ["問路", "a tourist asking for directions in the city; you are a helpful local"],
    ["飯店入住", "checking in at a hotel and asking about services; you are the receptionist"],
    ["買衣服", "shopping for clothes: size, colour, price, trying things on; you are the shop assistant"],
    ["看醫生", "a doctor's appointment describing symptoms; you are the doctor"],
    ["認識新朋友", "meeting someone at a party and chatting about life and hobbies; you are a friendly guest"],
    ["租房子", "visiting an apartment to rent and asking questions; you are the landlord"],
    ["工作面試", "a job interview for an office job; you are the interviewer"],
    ["和同事聊週末", "Monday-morning small talk with a colleague about the weekend; you are the colleague"],
    ["打電話預約", "phoning a hair salon to book an appointment; you are the receptionist"],
    ["機場報到", "checking in for a flight at the airport; you are the airline agent"]
];

const Chat = { lang: "", scene: "", level: "A2", messages: [], busy: false };

function resetChat() {
    Object.assign(Chat, { lang: S.lang, scene: "", messages: [], busy: false });
    show("chat-setup");
    hide("chat-room");
    hide("chat-summary");
    $("chat-custom").value = "";
    $("chat-log").innerHTML = "";
}

$("chat-scenarios").addEventListener("click", (e) => {
    const b = e.target.closest("[data-scene]");
    if (!b) return;
    document.querySelectorAll("#chat-scenarios .chip").forEach(c => c.classList.toggle("on", c === b));
    $("chat-custom").value = "";
});
$("chat-custom").addEventListener("input", () => document.querySelectorAll("#chat-scenarios .chip").forEach(c => c.classList.remove("on")));

function chatSystem() {
    const l = L();
    return `You are a friendly ${l.name} conversation partner for a Traditional Chinese (Taiwan) speaker who is learning ${l.name} at CEFR level ${Chat.level}.
Role-play this scenario: ${Chat.scene}.
Rules:
- Stay in the scenario and in character. Reply ONLY in ${l.name}, in 1–3 short, natural sentences suited to level ${Chat.level}, and usually end with a question so the learner can answer.
- If the learner's last message contains a real mistake (grammar, spelling, accents, wrong word, or something a native speaker would not say), give a gentle correction. Ignore missing capital letters and final punctuation.
- If the learner writes in Chinese, help them say it in ${l.name} in the correction, then continue.
Return ONLY a JSON object, no markdown:
{"reply": "your reply in ${l.name}", "zh": "Traditional Chinese translation of your reply", "fix": null or {"corrected": "the learner's last message, corrected", "note": "short, kind explanation in Traditional Chinese"}}`;
}

Actions.chatStart = () => {
    const chosen = document.querySelector("#chat-scenarios .chip.on");
    const custom = $("chat-custom").value.trim();
    if (!chosen && !custom) { showToast("請選一個情境，或自己描述", "error"); return; }
    const scene = custom ? [custom, custom] : CHAT_SCENES[Number(chosen.dataset.scene)];
    Object.assign(Chat, { lang: S.lang, scene: scene[1], sceneLabel: scene[0], level: $("chat-level").value, messages: [] });
    hide("chat-setup");
    hide("chat-summary");
    show("chat-room");
    $("chat-scene").textContent = `${scene[0]} · ${Chat.level}`;
    $("chat-log").innerHTML = "";
    chatTurn("(Start the conversation: greet me and open the scene.)", { hidden: true });
};

function parseChatReply(text) {
    try {
        const o = Svc.parseJSON(text);
        if (o && o.reply) return o;
    } catch (e) { /* 不是 JSON 就當成純文字回覆 */ }
    return { reply: text.trim(), zh: "", fix: null };
}

function renderChat() {
    const log = $("chat-log");
    log.innerHTML = Chat.messages.map((m, i) => {
        if (m.hidden) return "";
        if (m.role === "user") {
            const next = Chat.messages[i + 1];
            const fix = next && next.view && next.view.fix && next.view.fix.corrected ? next.view.fix : null;
            return `<div class="msg me"><div class="bubble">${esc(m.content)}</div>${fix ? `<div class="fix"><span class="verdict warn">更好的說法</span> <span class="serif">${esc(fix.corrected)}</span> ${speakBtn(fix.corrected)}<div class="small muted">${esc(fix.note || "")}</div></div>` : ""}</div>`;
        }
        const v = m.view;
        return `<div class="msg ai"><div class="bubble"><div class="serif">${makeClickable(v.reply)}</div>${v.zh ? `<div class="msg-zh">${esc(v.zh)}</div>` : ""}</div>
            <div class="msg-tools">${speakBtn(v.reply)}${lineTools(v.reply, v.zh)}</div></div>`;
    }).join("") + (Chat.busy ? '<div class="msg ai"><div class="bubble muted">…</div></div>' : "");
    log.lastElementChild && log.lastElementChild.scrollIntoView({ block: "end", behavior: "smooth" });
}

async function chatTurn(text, { hidden = false } = {}) {
    if (Chat.busy) return;
    Chat.messages.push({ role: "user", content: text, hidden });
    Chat.busy = true;
    renderChat();
    try {
        // 只送最近 24 則，且第一則必須是使用者的（API 規定）
        const recent = Chat.messages.slice(-24);
        while (recent.length && recent[0].role !== "user") recent.shift();
        const raw = await Svc.ai(recent.map(m => ({ role: m.role, content: m.content })), { system: chatSystem(), maxTokens: 4000 });
        const view = parseChatReply(raw);
        Chat.messages.push({ role: "assistant", content: raw, view });
        Chat.busy = false;
        renderChat();
        TTS.say(view.reply, L().tts);
    } catch (e) {
        Chat.messages.pop();
        Chat.busy = false;
        renderChat();
        if (!hidden) $("chat-text").value = text;
        showToast("AI 回應失敗：" + e.message, "error", 5000);
    }
}

Actions.chatSend = () => {
    const text = $("chat-text").value.trim();
    if (!text || Chat.busy) return;
    $("chat-text").value = "";
    chatTurn(text);
};

$("chat-text").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); Actions.chatSend(); }
});

Actions.chatMic = async () => {
    const btn = $("chat-mic");
    btn.classList.add("rec");
    try {
        const alts = await Speech.listen(L().tts);
        if (alts.length) $("chat-text").value = ($("chat-text").value + " " + alts[0]).trim();
    } catch (e) {
        showToast(Speech.errorText(e), "error", 4000);
    } finally {
        btn.classList.remove("rec");
    }
};

Actions.chatToggleZh = (arg, btn) => {
    const log = $("chat-log");
    log.classList.toggle("hide-zh");
    btn.textContent = log.classList.contains("hide-zh") ? "顯示翻譯" : "隱藏翻譯";
};

function chatTranscript() {
    return Chat.messages.filter(m => !m.hidden).map(m => (m.role === "user" ? "Learner: " + m.content : "Partner: " + m.view.reply)).join("\n");
}

// 不知道怎麼回：給兩個可以說的句子
Actions.chatHint = async (arg, btn) => {
    if (!Chat.messages.length || Chat.busy) return;
    setBusy(btn, true, "想想看…");
    try {
        const o = await Svc.aiJSON(`Scenario: ${Chat.scene}. Conversation so far:\n${chatTranscript()}\n\nSuggest 2 different short replies the learner could say next in ${L().name}, at CEFR ${Chat.level}. Return ONLY JSON: {"options": [{"text": "...", "zh": "Traditional Chinese translation"}]}`, { maxTokens: 2000 });
        const opts = (o.options || []).filter(x => x && x.text);
        if (!opts.length) throw new Error("沒有建議");
        const pick = await UI.choose("可以這樣說", opts.map(x => ({ label: `${x.text}　${x.zh || ""}`, value: x.text })));
        if (pick) { $("chat-text").value = pick; $("chat-text").focus(); }
    } catch (e) {
        showToast("無法取得提示：" + e.message, "error");
    } finally {
        setBusy(btn, false);
    }
};

Actions.chatEnd = async (arg, btn) => {
    if (Chat.messages.filter(m => m.role === "user" && !m.hidden).length < 1) { resetChat(); return; }
    setBusy(btn, true, "整理中…");
    try {
        const o = await Svc.aiJSON(`You are a ${L().name} teacher. Here is a role-play (${Chat.scene}) between a Traditional Chinese (Taiwan) learner at CEFR ${Chat.level} and a partner:
${chatTranscript()}

Give feedback on the LEARNER's messages only. Return ONLY JSON:
{"summary": "2-3 sentences in Traditional Chinese: how it went and what to focus on next",
 "good": ["things the learner did well, in Traditional Chinese"],
 "mistakes": [{"wrong": "what the learner wrote", "right": "corrected ${L().name}", "why": "short explanation in Traditional Chinese"}],
 "phrases": [{"text": "a useful ${L().name} phrase for this scenario", "zh": "Traditional Chinese"}]}
Include at most 8 mistakes (most important first) and 5 phrases.`, { maxTokens: 6000 });
        Goals.mark();
        hide("chat-room");
        show("chat-summary");
        $("chat-summary").innerHTML = `
            <div class="block-head"><h2>對話整理</h2><span class="small muted">${esc(Chat.sceneLabel)} · ${Chat.level}</span></div>
            <p class="small">${esc(o.summary || "")}</p>
            ${(o.good || []).length ? `<p class="eyebrow mt-16 mb-8">做得好的地方</p><ul class="plain">${o.good.map(g => `<li>${esc(g)}</li>`).join("")}</ul>` : ""}
            ${(o.mistakes || []).length ? `<p class="eyebrow mt-16 mb-8">需要修正</p>${o.mistakes.map(m => `<div class="issue"><div><span class="strike">${esc(m.wrong)}</span> → <span class="serif">${esc(m.right)}</span> ${speakBtn(m.right)}</div><div class="small muted">${esc(m.why)}</div></div>`).join("")}` : ""}
            ${(o.phrases || []).length ? `<p class="eyebrow mt-16 mb-8">實用句子</p>${o.phrases.map(p => exampleRow([p.text, p.zh])).join("")}` : ""}
            <div class="row mt-16"><button class="btn" data-action="chatBack">換個情境</button><button class="btn primary" data-action="chatAgain">同一情境再練一次</button></div>`;
    } catch (e) {
        showToast("整理失敗：" + e.message, "error", 5000);
    } finally {
        setBusy(btn, false);
    }
};

Actions.chatBack = () => resetChat();
Actions.chatAgain = () => {
    Chat.messages = [];
    hide("chat-summary");
    show("chat-room");
    $("chat-log").innerHTML = "";
    chatTurn("(Start the conversation again with a slightly different opening.)", { hidden: true });
};

// ===================== AI 寫作批改 =====================
const WRITE_TOPICS = {
    A1: ["介紹你自己：名字、國籍、工作、興趣", "描述你的家人", "你平常的一天", "你喜歡吃什麼、不喜歡吃什麼", "描述你的房間"],
    A2: ["上個週末你做了什麼", "你最難忘的一次旅行", "寫一封短信邀請朋友來家裡吃飯", "介紹你住的城市", "小時候的你是什麼樣子"],
    B1: ["你對遠距工作的看法", "社群媒體的優點與缺點", "一個影響你很深的人", "如果中了樂透你會怎麼做", "你認為學外語最好的方法"],
    B2: ["城市應該禁止汽車進入市中心嗎？", "人工智慧會怎麼改變工作？", "觀光對當地居民的影響", "年輕人應該先買房還是先旅行？", "評論一部你最近看的電影或書"]
};
let writeTopic = "";

Actions.writeTopic = () => {
    const list = WRITE_TOPICS[$("write-level").value] || WRITE_TOPICS.A2;
    const pool = list.filter(t => t !== writeTopic);
    writeTopic = pool[Math.floor(Math.random() * pool.length)];
    $("write-topic").innerHTML = `題目：<b>${esc(writeTopic)}</b> <button class="link small muted" data-action="writeClearTopic">不用題目</button>`;
    show("write-topic");
};
Actions.writeClearTopic = () => { writeTopic = ""; hide("write-topic"); };

Actions.writeCheck = async () => {
    const text = $("write-text").value.trim();
    if (text.length < 5) { showToast(`請先用${L().label}寫一點內容`, "error"); return; }
    const level = $("write-level").value;
    const btn = $("write-btn");
    setBusy(btn, true, "批改中…");
    try {
        const o = await Svc.aiJSON(`You are an experienced ${L().name} writing teacher for Traditional Chinese (Taiwan) learners at about CEFR ${level}.
${writeTopic ? `The task was (in Chinese): ${writeTopic}\n` : ""}Learner's text:
"""
${text}
"""
Correct it carefully (grammar, spelling, ${S.lang === "fr" ? "accents, agreement, " : ""}word choice, naturalness). Return ONLY JSON:
{"corrected": "the full text with every error fixed, keeping the learner's ideas and wording as much as possible",
 "issues": [{"wrong": "exact wrong fragment from the original", "right": "the correction", "why": "short explanation in Traditional Chinese"}],
 "natural": "a more natural, idiomatic version at the same level",
 "zh": "Traditional Chinese translation of the corrected text",
 "level": "estimated CEFR level of the original, e.g. A2",
 "comment": "2-3 encouraging sentences in Traditional Chinese: what is good and what to work on"}
List at most 12 issues, most important first; use [] if there are none.`, { maxTokens: 8000 });
        Goals.mark();
        const issues = o.issues || [];
        $("write-result").innerHTML = `
            <div class="block-head"><h2>批改結果</h2><span class="small muted">程度約 ${esc(o.level || "–")}</span></div>
            <p class="small">${esc(o.comment || "")}</p>
            <p class="eyebrow mt-16 mb-8">修正後</p>
            <div class="ex">${speakBtn(o.corrected || "")}<div class="grow"><div class="ex-fr">${makeClickable(o.corrected || "")}</div><div class="ex-zh">${esc(o.zh || "")}</div></div></div>
            ${issues.length ? `<p class="eyebrow mt-16 mb-8">${issues.length} 個地方要注意</p>${issues.map(m => `<div class="issue"><div><span class="strike">${esc(m.wrong)}</span> → <span class="serif">${esc(m.right)}</span></div><div class="small muted">${esc(m.why)}</div></div>`).join("")}` : '<p class="small mt-16"><span class="verdict good">沒有錯誤</span></p>'}
            ${o.natural ? `<p class="eyebrow mt-16 mb-8">更自然的寫法</p><div class="ex">${speakBtn(o.natural)}<div class="grow"><div class="ex-fr">${makeClickable(o.natural)}</div></div></div>` : ""}
            <div class="row mt-16"><button class="btn sm" data-action="writeSave"><i class="icon-file-plus"></i> 存到我的文章</button></div>`;
        const title = writeTopic || "寫作練習 " + dateKey();
        Actions.writeSave = (arg, b) => saveAsArticle(title, [o.corrected], [o.zh || ""], "寫作", b);
        $("write-result").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
        showToast("批改失敗：" + e.message, "error", 5000);
    } finally {
        setBusy(btn, false);
    }
};

// 存成「我的文章」（閱讀頁）；存過後按鈕改成「已存」，避免重複存
function saveAsArticle(title, paragraphs, translations, folder, btn) {
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="icon-check"></i> 已存'; }
    const minOrder = S.articles.reduce((m, a) => Math.min(m, a.order || 0), 0);
    const art = { id: uid(), lang: S.lang, title, content: paragraphs.join("\n\n"), parasPerBlock: 1, created: Date.now(), bookmarkIndex: 0, translations, folder, order: minOrder - 1 };
    S.articles = lsGet(articlesKey(), S.articles);
    S.articles.unshift(art);
    Queue.push("saveArticle", { article: art });
    saveArticlesLocal();
    showToast(`已存到閱讀 → 我的文章 →「${folder}」`);
}

// ===================== AI 小故事 =====================
function storyWords(source) {
    const pool = Words.active().filter(w => w.pos !== "sent." && w.term.split(" ").length <= 3);
    if (source === "due") return SRS.dueList().all.filter(w => w.pos !== "sent.").slice(0, 10);
    if (source === "hard") return pool.filter(w => w.lapses > 0).sort((a, b) => b.lapses - a.lapses).slice(0, 10);
    return pool.slice().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);
}

Actions.storyMake = async () => {
    const words = storyWords($("story-source").value);
    if (words.length < 3) { showToast("這個範圍的單字不到 3 個，換一個來源試試", "error"); return; }
    const level = $("story-level").value;
    const len = { A1: 80, A2: 130, B1: 200, B2: 260 }[level];
    const btn = $("story-btn");
    setBusy(btn, true, "寫作中…");
    try {
        const o = await Svc.aiJSON(`Write a short, engaging story in ${L().name} for a CEFR ${level} learner, about ${len} words, that naturally uses ALL of these words or expressions (inflect them as needed): ${words.map(w => w.term).join(", ")}.
Keep the language natural and right for the level. 3–5 paragraphs.
Return ONLY JSON: {"title": "...", "titleZh": "Traditional Chinese", "paragraphs": [{"text": "...", "zh": "Traditional Chinese translation"}], "used": ["each target word exactly as it appears in the story"]}`, { maxTokens: 8000 });
        const paras = (o.paragraphs || []).filter(p => p && p.text);
        if (!paras.length) throw new Error("AI 沒有回傳故事");
        Goals.mark();
        const targets = new Set([...(o.used || []), ...words.map(w => w.term)].flatMap(t => String(t).split(/\s+/)).map(t => foldAccents(t)).filter(t => t.length > 2));
        $("story-result").innerHTML = `
            <h1 class="reader-title">${makeClickable(o.title || "")}</h1>
            <p class="reader-title-zh">${esc(o.titleZh || "")}</p>
            <p class="small muted mb-8">用到的字：${words.map(w => `<span class="serif">${esc(w.term)}</span>`).join("、")}</p>
            ${paras.map(p => `<div class="para"><p class="para-src">${makeClickable(p.text)}</p><p class="para-zh">${esc(p.zh || "")}</p>
                <div class="para-tools"><button data-say="${esc(p.text)}"><i class="icon-volume-2"></i> 朗讀</button><button data-shadow="${esc(p.text)}" data-zh="${esc(p.zh || "")}"><i class="icon-mic"></i> 跟讀</button></div></div>`).join("")}
            <div class="row mt-16"><button class="btn sm" data-action="storySave"><i class="icon-file-plus"></i> 存到我的文章</button><button class="btn sm" data-action="storyMake">再寫一篇</button></div>`;
        $("story-result").querySelectorAll(".cw").forEach(el => { if (targets.has(foldAccents(el.dataset.word))) el.classList.add("target"); });
        Actions.storySave = (arg, b) => saveAsArticle(o.title || "AI 小故事", paras.map(p => p.text), paras.map(p => p.zh || ""), "AI 故事", b);
    } catch (e) {
        showToast("產生失敗：" + e.message, "error", 5000);
    } finally {
        setBusy(btn, false);
    }
};
