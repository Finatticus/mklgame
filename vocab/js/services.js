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

    // Google 翻譯原始資料（hl=en 讓詞性標籤固定是英文）
    async gtxRaw(text, sl, tl, dts) {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&hl=en&sl=${sl}&tl=${tl}${dts.map(d => "&dt=" + d).join("")}&q=${encodeURIComponent(text)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
    },

    // 一次翻譯多行（用換行合併成一次請求），回傳同樣長度的陣列
    async translateLines(lines, sl, tl = "zh-TW") {
        if (!lines.length) return [];
        try {
            const out = (await Svc.translate(lines.join("\n"), { sl, tl })).split("\n").map(s => s.trim());
            if (out.length === lines.length) return out;
        } catch (e) { /* 改成逐行翻譯 */ }
        const run = limiter(3);
        return Promise.all(lines.slice(0, 12).map(l => run(() => Svc.translate(l, { sl, tl }).catch(() => ""))));
    },

    // Google 的詞性分組：[{pos, terms}]，與原字反查相符的詞排前面
    senseGroups(raw, word, lang) {
        const w = String(word).toLowerCase();
        return ((raw && raw[1]) || []).map(p => {
            const entries = [...(p[2] || [])];
            const rank = (e) => { const i = (e[1] || []).map(x => String(x).toLowerCase()).indexOf(w); return i < 0 ? 99 : i; };
            entries.sort((a, b) => rank(a) - rank(b));
            return { pos: Svc.posCode(p[0], lang), terms: entries.map(e => e[0]) };
        }).filter(g => g.pos && g.terms.length);
    },

    // 單字的例句（Google 翻譯 dt=ex，只有英文有）
    async translateRich(word, lang = S.lang) {
        try {
            const g = await Svc.gtxRaw(word, LANGS[lang].gtx, "zh-TW", ["t", "bd", "ex"]);
            const basic = g[0] ? g[0].map(x => x[0]).join("") : "";
            let examples = [];
            for (const item of g) {
                if (Array.isArray(item) && item.length === 1 && Array.isArray(item[0]) && item[0].length &&
                    Array.isArray(item[0][0]) && typeof item[0][0][0] === "string" && item[0][0][0].includes("<b>")) {
                    examples = item[0].map(ex => ex[0].replace(/<\/?b>/g, ""));
                    break;
                }
            }
            return { basic, senses: Svc.senseGroups(g, word, lang), examples };
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

        // 每個名詞段落各自的陰陽性（例如 tour：le tour 轉圈、la tour 塔）
        const genders = [];
        try {
            const src = (await srcRes.json()).parse.wikitext["*"];
            const start = src.indexOf("==French==");
            if (start >= 0) {
                const rest = src.slice(start + 10);
                const end = rest.search(/\n==[^=]/);
                const section = end >= 0 ? rest.slice(0, end) : rest;
                const re = /=+\s*Noun\s*=+\s*\n+\{\{fr-noun\|?([^|}]*)/g;
                let m;
                while ((m = re.exec(section))) genders.push(/^(mf|m|f)$/.test(m[1]) ? m[1] : "");
            }
        } catch (e) { /* 沒有陰陽性資訊時略過 */ }

        let nounIndex = 0;
        const meanings = fr.map(m => {
            const isNoun = /^noun$/i.test(m.partOfSpeech);
            return {
                pos: m.partOfSpeech,
                gender: isNoun ? (genders[nounIndex++] || "") : "",
                defs: (m.definitions || []).map(d => ({ def: text(d.definition), example: text((d.parsedExamples || [])[0] ? d.parsedExamples[0].example : (d.examples || [])[0]) }))
                    .filter(d => d.def),
                synonyms: [], antonyms: []
            };
        }).filter(m => m.defs.length);
        const firstNoun = meanings.find(m => m.gender);
        return { word, phonetic: "", audio: "", gender: firstNoun ? firstNoun.gender : "", meanings };
    },

    // 英文詞性名稱 → App 詞性代碼（法文名詞會帶陰陽性）
    posCode(p, lang = S.lang, gender = "") {
        p = String(p || "").toLowerCase();
        if (lang === "fr") {
            if (p.includes("pronoun")) return "pron.";
            if (p.includes("noun")) return gender === "m" ? "n.m." : gender === "f" ? "n.f." : "n.";
            if (p.includes("adverb")) return "adv.";
            if (p.includes("verb")) return "v.";
            if (p.includes("adjective")) return "adj.";
            if (p.includes("preposition")) return "prép.";
            if (p.includes("conjunction")) return "conj.";
            if (p.includes("article") || p.includes("determiner")) return "dét.";
            if (p.includes("interjection")) return "interj.";
            if (p.includes("phrase") || p.includes("idiom")) return "loc.";
            return "";
        }
        if (p.includes("pronoun")) return "pron.";
        if (p.includes("adverb")) return "adv.";
        if (p.includes("adjective")) return "adj.";
        if (p.includes("noun")) return "n.";
        if (p.includes("verb")) return "v.";
        if (p.includes("preposition")) return "prep.";
        if (p.includes("conjunction")) return "conj.";
        if (p.includes("interjection")) return "interj.";
        if (p.includes("phrase") || p.includes("idiom")) return "phr.";
        return "";
    },

    // 字典裡「釋義最多」的詞性（只在其他資料都沒有時才用）
    mainMeaning(entry) {
        if (!entry || !entry.meanings || !entry.meanings.length) return null;
        const total = {};
        entry.meanings.forEach(m => { total[m.pos] = (total[m.pos] || 0) + m.defs.length; });
        const best = Object.keys(total).sort((a, b) => total[b] - total[a])[0];
        return entry.meanings.find(m => m.pos === best);
    },

    posOf(entry, lang = S.lang) {
        const m = Svc.mainMeaning(entry);
        return m ? Svc.posCode(m.pos, lang, m.gender || entry.gender) : "";
    },

    // Wiktionary 的英文釋義取第一段："(transitive) to take, to eat; to drink" → "to take, to eat"
    // 整段一起翻才有上下文（單獨翻 pupil 會變成「瞳孔」）
    glossLine(def) {
        const s = String(def || "");
        if (Svc.lemmaOf(s)) return "";
        const first = s.replace(/\([^)]*\)/g, "").replace(/\betc\.?/gi, "").split(/[;:]/)[0];
        const items = first.split(",").map(t => t.replace(/\s+/g, " ").trim()).filter(t => t && t.length <= 40).slice(0, 4);
        // 只有一個動詞時去掉 to（"to take" 會被翻成「採取」，"take" 才是「拿」）
        if (items.length === 1) items[0] = items[0].replace(/^to\s+/i, "");
        return items.join(", ");
    },

    // 釋義本身是變化形（"inflection of manger"、"plural of cheval"、"feminine singular of heureux"）時回傳原形
    lemmaOf(def) {
        const m = String(def || "").match(/^(?:inflection|plural|singular|feminine|masculine|(?:first|second|third)[- ]person|past participle|present participle)\b[^.;:]{0,80}?\bof\s+([A-Za-zÀ-ÿœæ'’-]+)/i);
        return m ? m[1] : "";
    },

    // 釋義的第一個英文詞（比對用）
    firstGloss(def) {
        return Svc.glossLine(def).split(",")[0].replace(/^to\s+/i, "").trim().toLowerCase();
    },

    // 查一個字：意思、詞性、音標、其他常見意思（詞性與意思來自同一組，不會互相矛盾）
    async lookup(word, lang = S.lang) {
        const key = lang + ":" + word.toLowerCase();
        if (!Svc._lookupCache) Svc._lookupCache = new Map();
        if (Svc._lookupCache.has(key)) return Svc._lookupCache.get(key);
        const p = (lang === "fr" ? Svc._lookupFr(word) : Svc._lookupEn(word))
            .catch(() => ({ meaning: "", pos: "", phonetic: "", senses: [], entry: null }));
        Svc._lookupCache.set(key, p);
        const out = await p;
        if (!out.meaning) Svc._lookupCache.delete(key);
        return out;
    },

    // 英文：詞性依 Datamuse 的使用頻率與 Google 的權重；和翻譯出的中文屬於同一詞性時優先
    async _lookupEn(word) {
        const w = word.toLowerCase();
        const [zh, es, dm, entry] = await Promise.all([
            Svc.gtxRaw(word, "en", "zh-TW", ["t", "bd"]).catch(() => null),
            Svc.gtxRaw(word, "en", "es", ["bd"]).catch(() => null),
            fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(w)}&md=p&max=1`).then(r => r.json()).catch(() => []),
            Svc.dict(word, "en")
        ]);
        let basic = zh && zh[0] ? zh[0].map(x => x[0]).join("").trim() : "";
        if (!basic) basic = await Svc.translate(word, { sl: "en" }).catch(() => "");
        const groups = Svc.senseGroups(zh, w, "en");
        const score = {};
        const add = (p, v) => { if (p) score[p] = (score[p] || 0) + v; };
        const tags = dm[0] && dm[0].word === w ? (dm[0].tags || []) : [];
        tags.map(t => ({ n: "n.", v: "v.", adj: "adj.", adv: "adv." })[t]).filter(Boolean).forEach((p, i) => add(p, Math.max(0, 3 - i)));
        ((es && es[1]) || []).forEach(p => add(Svc.posCode(p[0], "en"), 6 * (p[2] || []).reduce((s, e) => s + (e[3] || 0), 0)));
        groups.forEach(g => add(g.pos, 0));
        const best = (list) => [...list].sort((a, b) => (score[b] || 0) - (score[a] || 0))[0] || "";
        const has = (p) => groups.some(g => g.pos === p);

        let pos;
        if (/地$/.test(basic) && has("adv.")) pos = "adv.";
        else if (/的$/.test(basic) && has("adj.")) pos = "adj.";
        else {
            const bare = basic.replace(/[的地]$/, "");
            const containing = groups.filter(g => g.terms.some(t => t === basic || t.replace(/[的地]$/, "") === bare)).map(g => g.pos);
            pos = best(containing.length ? containing : Object.keys(score));
        }
        // 中文翻譯沒有「的」卻判成形容詞（例如 still → 仍然），通常其實是副詞或其他詞性
        if (pos === "adj." && basic && !/的$/.test(basic)) {
            const alt = best(Object.keys(score).filter(p => p !== "adj." && score[p] > 0));
            if (alt) pos = alt;
        }
        if (!pos) pos = Svc.posOf(entry, "en");
        const senses = groups.map(g => ({ pos: g.pos, meaning: g.terms.slice(0, 3).join("、") }));
        return { meaning: basic, pos, phonetic: entry ? entry.phonetic : "", senses, entry };
    },

    // 法文：直接機翻常因英文轉譯出錯（élève → 瞳孔）；和 Wiktionary 釋義對不上時改用字典的意思
    async _lookupFr(word) {
        const [plain, entry] = await Promise.all([Svc.translate(word, { sl: "fr" }).catch(() => ""), Svc.dict(word, "fr")]);
        if (!entry || !entry.meanings.length) return { meaning: plain, pos: "", phonetic: "", senses: [], entry };
        // 主要詞條整組都是變化形時（mange、chevaux、heureuse）才提示原形
        const mainDefs = entry.meanings[0].defs;
        const lemma = mainDefs.length && mainDefs.every(d => Svc.lemmaOf(d.def)) ? Svc.lemmaOf(mainDefs[0].def) : "";
        const groups = entry.meanings.slice(0, 4).map(m => ({
            pos: Svc.posCode(m.pos, "fr", m.gender),
            lines: m.defs.slice(0, 3).map(d => Svc.glossLine(d.def)).filter(Boolean)
        })).filter(g => g.lines.length);
        if (!groups.length) return { meaning: plain, pos: Svc.posOf(entry, "fr"), phonetic: "", senses: [], entry, lemma };

        const zhList = await Svc.translateLines(groups.flatMap(g => g.lines), "en");
        // 「房子裡的房間」這類描述只留最後的名詞「房間」
        const tidy = (t) => { t = String(t || "").replace(/[。.！!]+$/, "").trim(); return t.length > 4 && t.includes("的") ? t.split("的").pop() : t; };
        let k = 0;
        groups.forEach(g => { g.zh = g.lines.map(() => String(zhList[k++] || "").split(/[，,、;；]/).map(tidy).filter(Boolean)); });

        const agrees = (t) => t && plain && (t.includes(plain) || plain.includes(t));
        let meaning = plain;
        let plainOk = groups.some(g => g.zh.flat().some(agrees));
        if (!plainOk && plain) {
            // 再確認一次：把機翻的中文翻回英文，若等於字典某組的第一個釋義就保留（prendre → 拿 → take）
            const back = (await Svc.translate(plain, { sl: "zh-TW", tl: "en" }).catch(() => "")).toLowerCase().replace(/^(to|the|a|an)\s+/, "").replace(/[.!]$/, "").trim();
            const firsts = entry.meanings.slice(0, 4).map(m => m.defs[0] ? Svc.firstGloss(m.defs[0].def) : "").filter(Boolean);
            plainOk = !!back && firsts.includes(back);
        }
        if (!plainOk) {
            // 機翻和字典對不上：改用第一組釋義裡出現最多次的短詞（同樣多時取最前面的）
            const counts = new Map();
            groups[0].zh.flat().forEach(t => { if (t.length <= 5) counts.set(t, (counts.get(t) || 0) + 1); });
            const cand = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
            if (cand) meaning = cand[0];
        }
        const match = groups.find(g => g.zh.flat().some(t => agrees(t) || t === meaning)) || groups[0];
        const senses = groups.map(g => ({ pos: g.pos, meaning: [...new Set(g.zh.flat().filter(t => t.length <= 8))].slice(0, 3).join("、") }))
            .filter(s => s.meaning);
        // 只有選到的意思就是那個變化形詞條時才提示原形（pendant 選介系詞時不提示 pendre）
        const mainPos = Svc.posCode(entry.meanings[0].pos, "fr", entry.meanings[0].gender);
        return { meaning, pos: match.pos, phonetic: "", senses, entry, lemma: match.pos === mainPos ? lemma : "" };
    },

    // AI 校對：回傳常用意思、詞性、例句（需要後端的 GEMINI_API_KEY）
    async aiLookup(word, lang = S.lang) {
        const key = `${lang}|${word.toLowerCase()}`;
        const cache = lsGet("vocab_ai_cache", {});
        if (cache[key]) return cache[key];
        const l = LANGS[lang];
        const codes = l.pos.map(p => p[0]).join(", ");
        const prompt = `You are a careful ${l.name} lexicographer for Traditional Chinese (Taiwan) learners.
For the ${l.name} entry "${word}", return ONLY a JSON object with:
"term": the dictionary form (correct spelling and accents; lowercase unless it is a proper noun; no article),
"meaning": the 1-3 most common Traditional Chinese meanings, separated by "；", concise like a dictionary,
"pos": the part of speech of the MOST COMMON usage, one of: ${codes}${lang === "fr" ? ' (nouns MUST be "n.m." or "n.f."; use "n." only if the noun has both genders)' : ""},
"example": one natural, grammatically correct ${l.name} sentence (CEFR A2-B1) using the word in that meaning,
"exampleZh": its Traditional Chinese translation.
No markdown.`;
        const res = await Api.call("gemini", { history: [{ role: "user", parts: [{ text: prompt }] }] });
        const text = res.text.replace(/```json/gi, "").replace(/```/g, "");
        const obj = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
        const out = {
            term: String(obj.term || word).trim(),
            meaning: String(obj.meaning || "").trim(),
            pos: l.pos.some(p => p[0] === obj.pos) ? obj.pos : "",
            example: String(obj.example || "").trim(),
            exampleZh: String(obj.exampleZh || "").trim()
        };
        if (!out.meaning) throw new Error("AI 沒有回傳意思");
        cache[key] = out;
        const keys = Object.keys(cache);
        if (keys.length > 500) delete cache[keys[0]];
        lsSet("vocab_ai_cache", cache);
        return out;
    },

    // AI 檢查例句文法
    async aiCheckSentence(word, sentence, lang = S.lang) {
        const l = LANGS[lang];
        const prompt = `You are a ${l.name} teacher for Traditional Chinese (Taiwan) learners. The learner wrote this ${l.name} sentence using the word "${word}":
"${sentence}"
Check grammar, spelling (including accents), word choice and naturalness. Return ONLY a JSON object:
"ok": true if the sentence is correct and natural, otherwise false,
"corrected": the corrected sentence (same as the original if ok),
"explanation": a short explanation in Traditional Chinese of each problem (empty string if ok),
"translation": Traditional Chinese translation of the corrected sentence.
No markdown.`;
        const res = await Api.call("gemini", { history: [{ role: "user", parts: [{ text: prompt }] }] });
        const text = res.text.replace(/```json/gi, "").replace(/```/g, "");
        return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
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
