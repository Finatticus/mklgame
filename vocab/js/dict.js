// ===================== 字典 =====================
let currentDict = null; // {word, zh, pos, notes, phonetic}

// 把字典內容畫進 container；字典頁與單字清單的「字典內容」共用
async function renderDictEntry(word, container, { compact = false, withExtras = false } = {}) {
    container.innerHTML = '<div class="spinner-line"><i class="fas fa-spinner fa-spin"></i> 查詢字典中...</div>';
    const [entry, rich] = await Promise.all([Svc.dict(word), Svc.translateRich(word)]);
    if (!entry && !rich) {
        container.innerHTML = `<div class="error-box"><i class="fas fa-exclamation-triangle"></i> 找不到「${esc(word)}」，請確認拼字或稍後再試。</div>`;
        return null;
    }

    const display = entry ? entry.word : word;
    const phon = Svc.phoneticOf(entry);
    const audio = Svc.audioOf(entry);
    const tasks = [];
    const transSlot = (text) => {
        const id = "tr-" + uid();
        tasks.push({ id, text });
        return `<div class="dict-trans" id="${id}"><i class="fas fa-circle-notch fa-spin"></i></div>`;
    };

    let html = `<div class="${compact ? "compact-dict" : ""}">
        <div class="dict-head">
            <h3 class="dict-word">${esc(display)}</h3>
            <button class="btn-icon-small primary" data-dict-audio="${esc(audio)}" data-dict-word="${esc(display)}"><i class="fas fa-volume-up"></i></button>
            ${phon ? `<span class="dict-phon">${esc(phon)}</span>` : ""}
        </div>`;

    if (rich && (rich.senses.length || rich.examples.length)) {
        html += `<div class="dict-box">`;
        if (rich.senses.length) {
            html += `<div class="dict-box-title"><i class="fas fa-layer-group"></i> 多重語意</div>`;
            html += rich.senses.map(s => `<div class="dict-sense"><span class="dict-pos">${esc(s.pos.slice(0, 4))}</span><span class="dict-terms">${esc(s.terms.join("、"))}</span></div>`).join("");
        }
        if (rich.examples.length) {
            html += `<div class="dict-box-title mt-16"><i class="fas fa-quote-left"></i> 實用例句</div>`;
            html += rich.examples.slice(0, compact ? 2 : 3).map(ex => `<div class="dict-example"><div class="en">${esc(ex)}</div>${transSlot(ex)}</div>`).join("");
        }
        html += `</div>`;
    } else if (rich && rich.basic) {
        html += `<div class="dict-terms mt-8 mb-16">${esc(rich.basic)}</div>`;
    }

    if (entry && entry.meanings && entry.meanings.length) {
        html += `<div class="dict-meanings">`;
        entry.meanings.slice(0, compact ? 3 : 6).forEach(m => {
            html += `<div class="dict-meaning"><span class="dict-pos">${esc(m.partOfSpeech)}</span>`;
            m.definitions.slice(0, compact ? 2 : 3).forEach((d, j) => {
                html += `<div class="dict-def"><div class="def">${j + 1}. ${esc(d.definition)}</div>${transSlot(d.definition)}
                    ${d.example ? `<div class="dict-eg">“${esc(d.example)}”</div>` : ""}</div>`;
            });
            if (m.synonyms && m.synonyms.length) html += `<div class="dict-syn">同義詞：${esc(m.synonyms.slice(0, 5).join(", "))}</div>`;
            if (m.antonyms && m.antonyms.length) html += `<div class="dict-syn">反義詞：${esc(m.antonyms.slice(0, 5).join(", "))}</div>`;
            html += `</div>`;
        });
        html += `</div>`;
    }

    if (withExtras) {
        const roots = analyzeWordRoots(display);
        if (roots.length) {
            html += `<div class="expand-section mt-16"><h4><i class="fas fa-puzzle-piece text-primary"></i> 字根字首參考</h4><div class="expand-tags">
                ${roots.map(r => `<span class="tag">${esc(r.root)} <small>${esc(r.meaning)}</small></span>`).join("")}</div></div>`;
        }
    }

    const familyId = "fam-" + uid();
    html += `<div id="${familyId}"></div></div>`;
    container.innerHTML = html;

    // 翻譯同時最多 3 個，避免被限流
    const run = limiter(3);
    tasks.forEach(t => run(async () => {
        const el = document.getElementById(t.id);
        if (!el) return;
        try { el.textContent = await Svc.translate(t.text); } catch (e) { el.remove(); }
    }));

    const variations = await getWordVariations(display);
    const famBox = document.getElementById(familyId);
    const familyNotes = [];
    if (famBox && variations.length) {
        famBox.className = "dict-family";
        famBox.innerHTML = `<div class="label-sm"><i class="fas fa-sitemap text-primary"></i> 延伸詞性與變化形式 (Word Family)</div>` +
            variations.map(v => `<div class="dict-family-row"><span class="clickable-word" data-word="${esc(v)}" style="font-weight:600;">${esc(v)}</span><span class="small muted" data-fam="${esc(v)}"><i class="fas fa-circle-notch fa-spin"></i></span></div>`).join("");
        await Promise.all(variations.map(v => run(async () => {
            const el = famBox.querySelector(`[data-fam="${CSS.escape(v)}"]`);
            try {
                const zh = await Svc.translate(v);
                if (el) el.textContent = zh;
                familyNotes.push(`${v}: ${zh}`);
            } catch (e) { if (el) el.textContent = "—"; }
        })));
    }

    return {
        word: display,
        zh: rich && rich.basic ? rich.basic : "",
        pos: entry && entry.meanings && entry.meanings[0] ? Svc.posFromDict(entry.meanings[0].partOfSpeech) : "",
        phonetic: phon,
        notes: familyNotes.join("\n")
    };
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

// 用 Datamuse 找同字根的變化形式
async function getWordVariations(word) {
    if (word.length <= 3 || word.includes(" ")) return [];
    const strip = ["ability", "ibility", "ation", "ition", "ment", "ness", "ably", "ibly", "able", "ible", "ive", "ous", "ful", "ing", "ed", "ly", "es", "s", "er", "est", "ic", "al", "y", "e"];
    let root = word;
    for (const suf of strip) {
        if (word.endsWith(suf) && word.length - suf.length >= 3) { root = word.slice(0, -suf.length); break; }
    }
    if (root === word && word.length > 4) root = word.slice(0, -2);
    try {
        const res = await fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(root)}*&max=50`);
        if (!res.ok) return [];
        const data = await res.json();
        const add = ["s", "es", "d", "ed", "ing", "er", "est", "ly", "ally", "ment", "ness", "ity", "bility", "ibility", "ability", "tion", "sion", "ation", "ition", "able", "ible", "ably", "ibly", "ive", "itive", "ative", "ous", "eous", "ious", "ful", "less", "ic", "ical", "al", "ize", "ise", "ify", "en", "e", "y", "ance", "ence", "ancy", "ency", "ant", "ent", "ary", "ery", "ory"];
        const out = [];
        for (const { word: w } of data) {
            if (w === word || w.includes(" ") || w.includes("-") || !w.startsWith(root)) continue;
            const rest = w.slice(root.length);
            const ok = rest === "" || add.includes(rest) || (add.some(s => rest.endsWith(s)) && Math.abs(w.length - word.length) <= 6) ||
                (w.startsWith(word) && add.includes(w.slice(word.length)));
            if (!ok) continue;
            if (w.endsWith("s") && out.includes(w.slice(0, -1))) continue;
            if (w.endsWith("ed") && out.includes(w.slice(0, -2))) continue;
            out.push(w);
        }
        return out.slice(0, 6);
    } catch (e) { return []; }
}

Actions.searchDictionary = async () => {
    const word = $("dict-search-input").value.trim().toLowerCase();
    if (!word) return;
    const btn = $("btn-dict-search");
    setBusy(btn, true);
    show("dict-result-container");
    hide("btn-dict-add");
    try {
        currentDict = await renderDictEntry(word, $("dict-content"));
        if (currentDict) {
            show("btn-dict-add");
            saveDictHistory(word);
        }
    } finally {
        setBusy(btn, false);
    }
};

Actions.addWordFromDict = () => {
    if (!currentDict) return;
    QuickAdd.open(currentDict.word, { zh: currentDict.zh, pos: currentDict.pos, notes: currentDict.notes, phonetic: currentDict.phonetic, lookup: !currentDict.zh });
};

function renderDictHistory() {
    const list = lsGet("dictSearchHistory", []);
    show("dict-history-bar", list.length > 0);
    $("dict-history-tags").innerHTML = list.map(w => `<button class="history-tag" data-action="dictHistory" data-arg="${esc(w)}">${esc(w)}</button>`).join("");
}

function saveDictHistory(word) {
    const list = [word, ...lsGet("dictSearchHistory", []).filter(w => w !== word)].slice(0, 10);
    lsSet("dictSearchHistory", list);
    renderDictHistory();
}

Actions.dictHistory = (word) => {
    $("dict-search-input").value = word;
    Actions.searchDictionary();
};
