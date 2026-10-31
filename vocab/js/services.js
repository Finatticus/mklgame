// ===================== 外部服務：翻譯、字典、音標、語音 =====================
const Svc = {
    _tCache: null,
    _dictCache: new Map(),

    transCache() {
        if (!Svc._tCache) Svc._tCache = lsGet("vp_trans_cache", {});
        return Svc._tCache;
    },

    _saveTransCache: debounce(() => {
        const c = Svc.transCache();
        const keys = Object.keys(c);
        if (keys.length > 800) keys.slice(0, keys.length - 600).forEach(k => delete c[k]);
        lsSet("vp_trans_cache", c);
    }, 1000),

    // 先用免費的 Google 翻譯端點，失敗時改由 GAS（LanguageApp）翻譯
    async translate(text, { sl = "en", tl = "zh-TW" } = {}) {
        text = String(text || "").trim();
        if (!text) return "";
        const key = `${sl}|${tl}|${text}`;
        const cache = Svc.transCache();
        if (cache[key]) return cache[key];

        let out = "";
        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error("HTTP " + res.status);
            const data = await res.json();
            out = (data[0] || []).map(x => x[0]).join("");
        } catch (e) {
            const res = await Api.call("translate", { texts: [text], sl, tl });
            out = res.results[0] || "";
        }
        if (!out) throw new Error("翻譯失敗");
        if (text.length < 300) { cache[key] = out; Svc._saveTransCache(); }
        return out;
    },

    // 單字的多重語意與例句（Google 翻譯 dt=bd / dt=ex）
    async translateRich(word) {
        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-TW&dt=t&dt=bd&dt=ex&q=${encodeURIComponent(word)}`;
            const res = await fetch(url);
            if (!res.ok) return null;
            const g = await res.json();
            const basic = g[0] && g[0][0] ? g[0][0][0] : "";
            const senses = Array.isArray(g[1]) ? g[1].map(p => ({ pos: p[0], terms: p[1] || [] })) : [];
            let examples = [];
            for (const item of g) {
                if (Array.isArray(item) && item.length === 1 && Array.isArray(item[0]) && item[0].length &&
                    Array.isArray(item[0][0]) && typeof item[0][0][0] === "string" && item[0][0][0].includes("<b>")) {
                    examples = item[0].map(ex => ex[0].replace(/<\/?b>/g, ""));
                    break;
                }
            }
            return { basic, senses, examples };
        } catch (e) { return null; }
    },

    // Free Dictionary：回傳第一個詞條或 null
    async dict(word) {
        const key = String(word || "").toLowerCase().trim();
        if (!key) return null;
        if (Svc._dictCache.has(key)) return Svc._dictCache.get(key);
        const p = (async () => {
            try {
                const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(key)}`);
                if (!res.ok) return null;
                const data = await res.json();
                return Array.isArray(data) && data.length ? data[0] : null;
            } catch (e) { return null; }
        })();
        Svc._dictCache.set(key, p);
        const entry = await p;
        if (!entry) Svc._dictCache.delete(key);
        return entry;
    },

    posFromDict(partOfSpeech) {
        const p = String(partOfSpeech || "").toLowerCase();
        if (p.includes("adverb")) return "adv.";
        if (p.includes("adjective")) return "adj.";
        if (p.includes("noun")) return "n.";
        if (p.includes("verb")) return "v.";
        if (p.includes("preposition")) return "prep.";
        if (p.includes("conjunction")) return "conj.";
        return "";
    },

    phoneticOf(entry) {
        if (!entry) return "";
        if (entry.phonetic) return entry.phonetic;
        const p = (entry.phonetics || []).find(x => x.text && x.text.trim());
        return p ? p.text : "";
    },

    audioOf(entry) {
        const p = entry && (entry.phonetics || []).find(x => x.audio);
        return p ? p.audio : "";
    },

    // 翻譯 + 詞性 + 音標，給各種「快速新增」使用
    async lookup(word) {
        const [zh, entry] = await Promise.all([
            Svc.translate(word).catch(() => ""),
            Svc.dict(word)
        ]);
        return {
            zh,
            pos: entry && entry.meanings && entry.meanings[0] ? Svc.posFromDict(entry.meanings[0].partOfSpeech) : "",
            phonetic: Svc.phoneticOf(entry)
        };
    }
};

// ===================== 音標：存回單字資料，不再每次重抓 =====================
const Phon = {
    run: limiter(3),
    pending: [],
    misses: null,

    missCache() {
        if (!Phon.misses) Phon.misses = new Set(lsGet("vp_phon_miss", []));
        return Phon.misses;
    },

    // 取得一個單字的音標並存回雲端（批次送出）
    ensure(word) {
        if (!word || word.phonetic || Phon.missCache().has(word.english.toLowerCase())) return Promise.resolve(word && word.phonetic);
        return Phon.run(async () => {
            const entry = await Svc.dict(word.english);
            const ph = Svc.phoneticOf(entry);
            if (!ph) {
                Phon.missCache().add(word.english.toLowerCase());
                lsSet("vp_phon_miss", [...Phon.missCache()].slice(-2000));
                return "";
            }
            word.phonetic = ph;
            document.querySelectorAll(`[data-phon="${word.id}"]`).forEach(el => { el.textContent = ph; });
            Phon.pending.push({ id: word.id, fields: { phonetic: ph } });
            Phon.flush();
            return ph;
        });
    },

    flush: debounce(() => {
        if (!Phon.pending.length) return;
        const updates = Phon.pending.splice(0);
        Store.saveWords();
        Queue.push("updateWords", { updates });
    }, 4000),

    // 只補畫面上看得到的單字
    fillVisible(container) {
        container.querySelectorAll("[data-phon]").forEach(el => {
            if (el.textContent) return;
            const w = Words.byId(el.dataset.phon);
            if (w) Phon.ensure(w);
        });
    },

    // 背景慢慢補齊舊資料的音標（每次最多 30 個）
    backfill() {
        S.words.filter(w => !w.phonetic && w.book !== TRASH_BOOK).slice(0, 30).forEach(w => Phon.ensure(w));
    }
};

// ===================== 語音 =====================
const TTS = {
    rate: 1.0,

    speak(text, { lang = "en-US", rate, onend } = {}) {
        if (!text || !("speechSynthesis" in window)) { if (onend) setTimeout(onend, 800); return; }
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang;
        u.rate = rate || TTS.rate;
        if (onend) { u.onend = onend; u.onerror = onend; }
        window.speechSynthesis.speak(u);
    },

    say(text, lang = "en-US") {
        TTS.stop();
        TTS.speak(text, { lang });
    },

    stop() { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); }
};

function playTTS(text) { TTS.speak(text); }
