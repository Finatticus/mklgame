// ===================== 字典 =====================
let currentDict = null; // {term, meaning, pos, phonetic, notes}

// 把字典內容畫進 container；字典頁與單字本的「字典」展開共用
async function renderDictEntry(word, container, { compact = false } = {}) {
    const lang = S.lang;
    container.innerHTML = '<p class="muted small">查詢中…</p>';
    // 意思與詞性用和「新增單字」相同的判斷，兩邊不會不一致
    const [info, rich] = await Promise.all([Svc.lookup(word, lang), lang === "en" ? Svc.translateRich(word, lang) : Promise.resolve(null)]);
    const entry = info.entry;
    if (!entry && !info.meaning) {
        container.innerHTML = `<p class="muted">找不到「${esc(word)}」，請確認拼字。</p>`;
        return null;
    }
    const display = entry ? entry.word : word;
    const pos = info.pos;
    const tasks = [];
    // sl：釋義是英文；例句是學習中的語言
    const slot = (text, sl = "en") => {
        const id = "tr-" + uid();
        tasks.push({ id, text, sl });
        return `<div class="tr" id="${id}"></div>`;
    };

    let html = "";
    if (!compact) {
        html += `<div class="dict-head">
            <span class="dict-word">${esc(display)}</span>
            <button class="icon-btn" data-dict-audio="${esc(entry ? entry.audio : "")}" data-dict-word="${esc(display)}" title="發音"><i class="icon-volume-2"></i></button>
            <span class="small">${posLabel(pos)}</span>
            ${entry && entry.phonetic ? `<span class="phon">${esc(entry.phonetic)}</span>` : ""}
        </div>`;
    }
    if (info.meaning) html += `<div class="dict-basic">${esc(info.meaning)}${compact && pos ? ` <span class="small">${posLabel(pos)}</span>` : ""}</div>`;
    if (info.lemma) html += `<div class="note-line mt-8">這是 <span class="cw serif" data-word="${esc(info.lemma)}">${esc(info.lemma)}</span> 的變化形</div>`;

    if (info.senses && info.senses.length > 1) {
        html += `<div class="dict-section"><span class="eyebrow">常見意思</span>` +
            info.senses.map(s => `<div class="sense"><span>${posLabel(s.pos)}</span><span>${esc(s.meaning)}</span></div>`).join("") + `</div>`;
    }

    if (entry && entry.meanings.length) {
        // Wiktionary 與 Free Dictionary 的釋義都是英文，翻成中文對照
        html += `<div class="dict-section"><span class="eyebrow">釋義</span>`;
        // 和判斷出的詞性相同的釋義排前面（Free Dictionary 有時把罕見用法排第一）
        const rank = (m) => Svc.posCode(m.pos, lang, m.gender) === pos ? 0 : 1;
        [...entry.meanings].sort((a, b) => rank(a) - rank(b)).slice(0, compact ? 2 : 5).forEach(m => {
            const code = Svc.posCode(m.pos, lang, m.gender);
            html += `<div class="small mt-8">${code ? posLabel(code) : `<span class="pos">${esc(m.pos)}</span>`}</div>`;
            m.defs.slice(0, compact ? 2 : 3).forEach(d => {
                html += `<div class="def"><div>${esc(d.def)}</div>${slot(d.def)}${d.example ? `<div class="eg">${esc(d.example)}</div>${slot(d.example, LANGS[lang].gtx)}` : ""}</div>`;
            });
            const syn = (m.synonyms || []).slice(0, 5);
            if (syn.length && !compact) html += `<div class="small muted">同義：${esc(syn.join(", "))}</div>`;
        });
        html += `</div>`;
    }

    if (rich && rich.examples.length) {
        html += `<div class="dict-section"><span class="eyebrow">例句</span>` +
            rich.examples.slice(0, compact ? 2 : 3).map(ex => `<div class="def"><div class="eg" style="margin:0;">${esc(ex)}</div>${slot(ex, LANGS[lang].gtx)}</div>`).join("") + `</div>`;
    }

    if (lang === "en" && !compact) {
        const roots = analyzeWordRoots(display);
        if (roots.length) html += `<div class="dict-section"><span class="eyebrow">字根字首</span><div class="chips">${roots.map(r => `<span class="chip">${esc(r.root)}<small>${esc(r.meaning)}</small></span>`).join("")}</div></div>`;
    }

    const familyId = "fam-" + uid();
    html += `<div id="${familyId}"></div>`;
    container.innerHTML = html;

    const run = limiter(3);
    tasks.forEach(t => run(async () => {
        const el = document.getElementById(t.id);
        if (!el) return;
        try { el.textContent = await Svc.translate(t.text, { sl: t.sl }); } catch (e) { el.remove(); }
    }));

    const familyNotes = [];
    if (lang === "en" && !compact) {
        const variations = await getWordVariations(display);
        const box = document.getElementById(familyId);
        if (box && variations.length) {
            box.className = "dict-section";
            box.innerHTML = `<span class="eyebrow">同字族</span>` + variations.map(v =>
                `<div class="family-row"><span class="cw serif" data-word="${esc(v)}">${esc(v)}</span><span class="muted" data-fam="${esc(v)}"></span></div>`).join("");
            await Promise.all(variations.map(v => run(async () => {
                const el = box.querySelector(`[data-fam="${CSS.escape(v)}"]`);
                try { const zh = await Svc.translate(v, { sl: "en" }); if (el) el.textContent = zh; familyNotes.push(`${v}: ${zh}`); }
                catch (e) { if (el) el.textContent = "—"; }
            })));
        }
    }

    return { term: display, meaning: info.meaning, pos, phonetic: entry ? entry.phonetic : "", notes: familyNotes.join("\n") };
}

document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-dict-audio]");
    if (!btn) return;
    const url = btn.dataset.dictAudio;
    if (url) new Audio(url).play().catch(() => TTS.say(btn.dataset.dictWord));
    else TTS.say(btn.dataset.dictWord);
});

function analyzeWordRoots(word) {
    const lower = word.toLowerCase();
    const found = Object.keys(ROOTS_DICT).filter(r => lower.includes(r)).map(r => ({ root: r, meaning: ROOTS_DICT[r] }));
    return found.filter(fr => !found.some(o => o.root !== fr.root && o.root.includes(fr.root)));
}

// 英文：用 Datamuse 找同字根的變化形式
async function getWordVariations(word) {
    if (word.length <= 3 || word.includes(" ")) return [];
    const strip = ["ability", "ibility", "ation", "ition", "ment", "ness", "ably", "ibly", "able", "ible", "ive", "ous", "ful", "ing", "ed", "ly", "es", "s", "er", "est", "ic", "al", "y", "e"];
    let root = word;
    for (const suf of strip) { if (word.endsWith(suf) && word.length - suf.length >= 3) { root = word.slice(0, -suf.length); break; } }
    if (root === word && word.length > 4) root = word.slice(0, -2);
    try {
        const res = await fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(root)}*&max=50`);
        if (!res.ok) return [];
        const add = ["s", "es", "d", "ed", "ing", "er", "est", "ly", "ally", "ment", "ness", "ity", "bility", "ibility", "ability", "tion", "sion", "ation", "ition", "able", "ible", "ably", "ibly", "ive", "itive", "ative", "ous", "eous", "ious", "ful", "less", "ic", "ical", "al", "ize", "ise", "ify", "en", "e", "y", "ance", "ence", "ancy", "ency", "ant", "ent", "ary", "ery", "ory"];
        const out = [];
        for (const { word: w } of await res.json()) {
            if (w === word || w.includes(" ") || w.includes("-") || !w.startsWith(root)) continue;
            const rest = w.slice(root.length);
            const ok = rest === "" || add.includes(rest) || (add.some(s => rest.endsWith(s)) && Math.abs(w.length - word.length) <= 6) || (w.startsWith(word) && add.includes(w.slice(word.length)));
            if (!ok || (w.endsWith("s") && out.includes(w.slice(0, -1))) || (w.endsWith("ed") && out.includes(w.slice(0, -2)))) continue;
            out.push(w);
        }
        return out.slice(0, 6);
    } catch (e) { return []; }
}

Actions.dictTab = (tab) => {
    document.querySelectorAll("#dict-tabs button").forEach(b => b.classList.toggle("on", b.dataset.arg === tab));
    show("dict-lookup", tab === "lookup");
    show("dict-translate", tab === "translate");
};

Actions.searchDictionary = async () => {
    const word = $("dict-search-input").value.trim();
    if (!word) return;
    const btn = $("btn-dict-search");
    setBusy(btn, true);
    show("dict-result-container");
    hide("btn-dict-add");
    try {
        currentDict = await renderDictEntry(S.lang === "en" ? word.toLowerCase() : word, $("dict-content"));
        if (currentDict) { show("btn-dict-add"); saveDictHistory(word); }
    } finally {
        setBusy(btn, false);
    }
};

Actions.addWordFromDict = () => {
    if (!currentDict) return;
    QuickAdd.open(currentDict.term, { meaning: currentDict.meaning, pos: currentDict.pos, notes: currentDict.notes, phonetic: currentDict.phonetic, lookup: !currentDict.meaning });
};

function historyKey() { return "vocab_dict_history_" + S.lang; }

function renderDictHistory() {
    const list = lsGet(historyKey(), []);
    show("dict-history-bar", list.length > 0);
    $("dict-history-tags").innerHTML = list.map(w => `<button class="chip" data-action="dictHistory" data-arg="${esc(w)}">${esc(w)}</button>`).join("");
}

function saveDictHistory(word) {
    lsSet(historyKey(), [word, ...lsGet(historyKey(), []).filter(w => w !== word)].slice(0, 10));
    renderDictHistory();
}

Actions.dictHistory = (word) => { $("dict-search-input").value = word; Actions.searchDictionary(); };

// ===================== 翻譯句子 =====================
let lastTransForeign = "";

function refreshTransDirections() {
    const l = L();
    $("trans-dir").innerHTML = `<option value="to-zh">${l.label} → 中文</option><option value="from-zh">中文 → ${l.label}</option>`;
}

Actions.doTranslation = async (arg, btn) => {
    const input = $("trans-input").value.trim();
    if (!input) return;
    const toZh = $("trans-dir").value === "to-zh";
    setBusy(btn, true, "翻譯中…");
    try {
        const out = await Svc.translate(input, toZh ? { sl: L().gtx, tl: "zh-TW" } : { sl: "zh-TW", tl: L().gtx });
        lastTransForeign = toZh ? input : out;
        $("trans-output").innerHTML = toZh
            ? `<div class="trans-out">${esc(out)}</div><div class="trans-src">${makeClickable(input)}</div><p class="tiny muted mt-8">點原文中的字即可加入單字本</p>`
            : `<div class="trans-src" style="border:none; margin:0; padding:0;">${makeClickable(out)}</div><p class="tiny muted mt-8">點譯文中的字即可加入單字本</p>`;
        const zh = toZh ? out : input;
        $("trans-output").innerHTML += `<div class="links mt-8"><button class="link small" data-save-sent="${esc(lastTransForeign)}" data-zh="${esc(zh)}"><i class="icon-bookmark-plus"></i> 存成句子卡</button><button class="link small" data-shadow="${esc(lastTransForeign)}" data-zh="${esc(zh)}"><i class="icon-mic"></i> 跟讀</button></div>`;
        show("trans-result-card");
    } catch (e) {
        showToast("翻譯失敗，請檢查網路", "error");
    } finally {
        setBusy(btn, false);
    }
};

Actions.playTransTTS = () => TTS.say(lastTransForeign);
