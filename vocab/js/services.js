// ===================== 外部服務：翻譯、字典、音標、語音 =====================
const Svc = {
    _tCache: null,
    _dictCache: new Map(),

    transCache() {
        if (!Svc._tCache) Svc._tCache = lsGet("vocab_trans_cache", {});
        return Svc._tCache;
    },

    _saveTransCache: debounce(() => {
        const c = Svc.transCache();
        const keys = Object.keys(c);
        if (keys.length > 1000) keys.slice(0, keys.length - 800).forEach(k => delete c[k]);
        lsSet("vocab_trans_cache", c);
    }, 1000),

    // 預設把「目前語言」翻成繁體中文；免費端點失敗時改由 GAS（LanguageApp）翻譯
    async translate(text, { sl = L().gtx, tl = "zh-TW" } = {}) {
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
    async translateRich(word, lang = S.lang) {
        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${LANGS[lang].gtx}&tl=zh-TW&dt=t&dt=bd&dt=ex&q=${encodeURIComponent(word)}`;
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

    // 統一格式：{word, phonetic, audio, gender, meanings:[{pos, defs:[{def, example}], synonyms, antonyms}]}
    async dict(word, lang = S.lang) {
        const key = lang + ":" + String(word || "").toLowerCase().trim();
        if (key.endsWith(":")) return null;
        if (Svc._dictCache.has(key)) return Svc._dictCache.get(key);
        const p = (lang === "fr" ? Svc._dictFr(word.trim()) : Svc._dictEn(word.trim().toLowerCase())).catch(() => null);
        Svc._dictCache.set(key, p);
        let entry = await p;
        if (!entry) {
            Svc._dictCache.delete(key);
            const lower = word.trim().toLowerCase();
            if (lower !== word.trim()) entry = await Svc.dict(lower, lang);
        }
        return entry;
    },

    async _dictEn(word) {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
        if (!res.ok) return null;
        const data = await res.json();
        const e = Array.isArray(data) && data[0];
        if (!e) return null;
        const ph = e.phonetic || ((e.phonetics || []).find(x => x.text && x.text.trim()) || {}).text || "";
        const audio = ((e.phonetics || []).find(x => x.audio) || {}).audio || "";
        return {
            word: e.word, phonetic: ph, audio, gender: "",
            meanings: (e.meanings || []).map(m => ({
                pos: m.partOfSpeech,
                defs: (m.definitions || []).map(d => ({ def: d.definition, example: d.example || "" })),
                synonyms: m.synonyms || [], antonyms: m.antonyms || []
            }))
        };
    },

    // 法文：英文版 Wiktionary 的釋義（REST）+ 詞條原始碼裡的陰陽性
    async _dictFr(word) {
        const title = encodeURIComponent(word.replace(/ /g, "_"));
        const [defRes, srcRes] = await Promise.all([
            fetch(`https://en.wiktionary.org/api/rest_v1/page/definition/${title}`).catch(() => null),
            fetch(`https://en.wiktionary.org/w/api.php?action=parse&page=${title}&prop=wikitext&format=json&origin=*`).catch(() => null)
        ]);
        if (!defRes || !defRes.ok) return null;
        const data = await defRes.json();
        const fr = data.fr || data.French;
        if (!fr || !fr.length) return null;
        const text = (html) => { const d = document.createElement("div"); d.innerHTML = html || ""; return d.textContent.replace(/\s+/g, " ").trim(); };

        let gender = "";
        try {
            const src = (await srcRes.json()).parse.wikitext["*"];
            const start = src.indexOf("==French==");
            if (start >= 0) {
                const rest = src.slice(start + 10);
                const end = rest.search(/\n==[^=]/);
                const section = end >= 0 ? rest.slice(0, end) : rest;
                const m = section.match(/\{\{fr-noun\|(mf|m|f)(?:[|}])/);
                if (m) gender = m[1];
            }
        } catch (e) { /* 沒有陰陽性資訊時略過 */ }

        return {
            word, phonetic: "", audio: "", gender,
            meanings: fr.map(m => ({
                pos: m.partOfSpeech,
                defs: (m.definitions || []).map(d => ({ def: text(d.definition), example: text((d.parsedExamples || [])[0] ? d.parsedExamples[0].example : (d.examples || [])[0]) }))
                    .filter(d => d.def),
                synonyms: [], antonyms: []
            })).filter(m => m.defs.length)
        };
    },

    // 把字典的詞性轉成 App 的詞性代碼（法文名詞會帶陰陽性）
    posOf(entry, lang = S.lang) {
        if (!entry || !entry.meanings || !entry.meanings[0]) return "";
        const p = String(entry.meanings[0].pos || "").toLowerCase();
        if (lang === "fr") {
            if (p.includes("noun")) return entry.gender === "m" ? "n.m." : entry.gender === "f" ? "n.f." : "n.";
            if (p.includes("verb") && !p.includes("adverb")) return "v.";
            if (p.includes("adjective")) return "adj.";
            if (p.includes("adverb")) return "adv.";
            if (p.includes("preposition")) return "prép.";
            if (p.includes("conjunction")) return "conj.";
            if (p.includes("pronoun")) return "pron.";
            if (p.includes("phrase") || p.includes("idiom")) return "loc.";
            return "";
        }
        if (p.includes("adverb")) return "adv.";
        if (p.includes("adjective")) return "adj.";
        if (p.includes("noun")) return "n.";
        if (p.includes("verb")) return "v.";
        if (p.includes("preposition")) return "prep.";
        if (p.includes("conjunction")) return "conj.";
        return "";
    },

    // 翻譯 + 詞性 + 音標，給各種「新增」使用
    async lookup(word) {
        const [meaning, entry] = await Promise.all([Svc.translate(word).catch(() => ""), Svc.dict(word)]);
        return { meaning, pos: Svc.posOf(entry), phonetic: entry ? entry.phonetic : "" };
    }
};

// 詞性標籤：法文陰陽性用 m / f 小標
function posLabel(pos) {
    if (!pos) return "";
    if (pos === "n.m.") return '<span class="pos">n.</span> <span class="gender-m">m</span>';
    if (pos === "n.f.") return '<span class="pos">n.</span> <span class="gender-f">f</span>';
    return `<span class="pos">${esc(pos)}</span>`;
}

// ===================== 音標：只有英文有，查到後存回試算表 =====================
const Phon = {
    run: limiter(3),
    pending: [],
    misses: null,

    missCache() {
        if (!Phon.misses) Phon.misses = new Set(lsGet("vocab_phon_miss", []));
        return Phon.misses;
    },

    ensure(word) {
        if (!word || word.lang !== "en" || word.phonetic || Phon.missCache().has(word.term.toLowerCase())) return Promise.resolve(word && word.phonetic);
        return Phon.run(async () => {
            const entry = await Svc.dict(word.term, "en");
            const ph = entry ? entry.phonetic : "";
            if (!ph) {
                Phon.missCache().add(word.term.toLowerCase());
                lsSet("vocab_phon_miss", [...Phon.missCache()].slice(-2000));
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

    fillVisible(container) {
        container.querySelectorAll("[data-phon]").forEach(el => {
            if (el.textContent) return;
            const w = Words.byId(el.dataset.phon);
            if (w) Phon.ensure(w);
        });
    },

    backfill() {
        S.words.filter(w => w.lang === "en" && !w.phonetic && w.book !== TRASH_BOOK).slice(0, 30).forEach(w => Phon.ensure(w));
    }
};

// ===================== 語音 =====================
const TTS = {
    rate: 1.0,

    speak(text, { lang = L().tts, rate, onend } = {}) {
        if (!text || !("speechSynthesis" in window)) { if (onend) setTimeout(onend, 800); return; }
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang;
        u.rate = rate || TTS.rate;
        const voices = speechSynthesis.getVoices();
        const norm = (v) => (v.lang || "").replace("_", "-");
        const voice = voices.find(v => norm(v) === lang) || voices.find(v => norm(v).startsWith(lang.slice(0, 2)));
        if (voice) u.voice = voice;
        if (onend) { u.onend = onend; u.onerror = onend; }
        speechSynthesis.speak(u);
    },

    say(text, lang) { TTS.stop(); TTS.speak(text, lang ? { lang } : {}); },
    stop() { if ("speechSynthesis" in window) speechSynthesis.cancel(); }
};
