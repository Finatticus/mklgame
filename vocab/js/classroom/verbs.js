// ===================== 法文動詞變化 =====================
// 規則動詞（-er / -ir / -re）自動變化；不規則或拼字變化的動詞在下面列出例外。
const FR_PERSONS = ["je", "tu", "il/elle", "nous", "vous", "ils/elles"];
const FR_REFLEXIVE = ["me", "te", "se", "nous", "vous", "se"];

const FR_TENSES = [
    { id: "pres", name: "現在式", fr: "Présent", level: "A1" },
    { id: "pc", name: "複合過去式", fr: "Passé composé", level: "A2" },
    { id: "imp", name: "未完成過去式", fr: "Imparfait", level: "A2" },
    { id: "fut", name: "簡單未來式", fr: "Futur simple", level: "A2" },
    { id: "imper", name: "命令式", fr: "Impératif", level: "A2" },
    { id: "cond", name: "條件式", fr: "Conditionnel présent", level: "B1" },
    { id: "subj", name: "虛擬式", fr: "Subjonctif présent", level: "B1" },
    { id: "pqp", name: "愈過去式", fr: "Plus-que-parfait", level: "B1" }
];

// g：er / ir（finir 型）/ re（vendre 型）/ x（不規則）
// aux：e = être；pres：現在式六個人稱；fut：未來式字根；subj：虛擬式六個人稱；imper：命令式 tu / nous / vous
const FR_VERBS = [
    { inf: "être", zh: "是；在", g: "x", pp: "été", pres: ["suis", "es", "est", "sommes", "êtes", "sont"], impStem: "ét", fut: "ser", subj: ["sois", "sois", "soit", "soyons", "soyez", "soient"], imper: ["sois", "soyons", "soyez"] },
    { inf: "avoir", zh: "有", g: "x", pp: "eu", pres: ["ai", "as", "a", "avons", "avez", "ont"], fut: "aur", subj: ["aie", "aies", "ait", "ayons", "ayez", "aient"], imper: ["aie", "ayons", "ayez"] },
    { inf: "aller", zh: "去", g: "x", aux: "e", pp: "allé", pres: ["vais", "vas", "va", "allons", "allez", "vont"], fut: "ir", subj: ["aille", "ailles", "aille", "allions", "alliez", "aillent"], imper: ["va", "allons", "allez"] },
    { inf: "faire", zh: "做；製作", g: "x", pp: "fait", pres: ["fais", "fais", "fait", "faisons", "faites", "font"], fut: "fer", subj: ["fasse", "fasses", "fasse", "fassions", "fassiez", "fassent"], imper: ["fais", "faisons", "faites"] },
    { inf: "venir", zh: "來", g: "x", aux: "e", pp: "venu", pres: ["viens", "viens", "vient", "venons", "venez", "viennent"], fut: "viendr" },
    { inf: "revenir", zh: "回來", g: "x", aux: "e", pp: "revenu", pres: ["reviens", "reviens", "revient", "revenons", "revenez", "reviennent"], fut: "reviendr" },
    { inf: "devenir", zh: "變成", g: "x", aux: "e", pp: "devenu", pres: ["deviens", "deviens", "devient", "devenons", "devenez", "deviennent"], fut: "deviendr" },
    { inf: "tenir", zh: "握著；保持", g: "x", pp: "tenu", pres: ["tiens", "tiens", "tient", "tenons", "tenez", "tiennent"], fut: "tiendr" },
    { inf: "pouvoir", zh: "能夠；可以", g: "x", pp: "pu", pres: ["peux", "peux", "peut", "pouvons", "pouvez", "peuvent"], fut: "pourr", subj: ["puisse", "puisses", "puisse", "puissions", "puissiez", "puissent"], imper: null },
    { inf: "vouloir", zh: "想要", g: "x", pp: "voulu", pres: ["veux", "veux", "veut", "voulons", "voulez", "veulent"], fut: "voudr", subj: ["veuille", "veuilles", "veuille", "voulions", "vouliez", "veuillent"], imper: ["veuille", "veuillons", "veuillez"] },
    { inf: "devoir", zh: "必須；欠", g: "x", pp: "dû", pres: ["dois", "dois", "doit", "devons", "devez", "doivent"], fut: "devr", imper: null },
    { inf: "savoir", zh: "知道；會", g: "x", pp: "su", pres: ["sais", "sais", "sait", "savons", "savez", "savent"], fut: "saur", subj: ["sache", "saches", "sache", "sachions", "sachiez", "sachent"], imper: ["sache", "sachons", "sachez"] },
    { inf: "prendre", zh: "拿；搭乘；吃喝", g: "x", pp: "pris", pres: ["prends", "prends", "prend", "prenons", "prenez", "prennent"] },
    { inf: "apprendre", zh: "學習", g: "x", pp: "appris", pres: ["apprends", "apprends", "apprend", "apprenons", "apprenez", "apprennent"] },
    { inf: "comprendre", zh: "理解", g: "x", pp: "compris", pres: ["comprends", "comprends", "comprend", "comprenons", "comprenez", "comprennent"] },
    { inf: "mettre", zh: "放；穿", g: "x", pp: "mis", pres: ["mets", "mets", "met", "mettons", "mettez", "mettent"] },
    { inf: "dire", zh: "說", g: "x", pp: "dit", pres: ["dis", "dis", "dit", "disons", "dites", "disent"] },
    { inf: "voir", zh: "看見", g: "x", pp: "vu", pres: ["vois", "vois", "voit", "voyons", "voyez", "voient"], fut: "verr" },
    { inf: "partir", zh: "出發；離開", g: "x", aux: "e", pp: "parti", pres: ["pars", "pars", "part", "partons", "partez", "partent"] },
    { inf: "sortir", zh: "出去", g: "x", aux: "e", pp: "sorti", pres: ["sors", "sors", "sort", "sortons", "sortez", "sortent"] },
    { inf: "dormir", zh: "睡覺", g: "x", pp: "dormi", pres: ["dors", "dors", "dort", "dormons", "dormez", "dorment"] },
    { inf: "sentir", zh: "感覺；聞", g: "x", pp: "senti", pres: ["sens", "sens", "sent", "sentons", "sentez", "sentent"] },
    { inf: "lire", zh: "閱讀", g: "x", pp: "lu", pres: ["lis", "lis", "lit", "lisons", "lisez", "lisent"] },
    { inf: "écrire", zh: "寫", g: "x", pp: "écrit", pres: ["écris", "écris", "écrit", "écrivons", "écrivez", "écrivent"] },
    { inf: "boire", zh: "喝", g: "x", pp: "bu", pres: ["bois", "bois", "boit", "buvons", "buvez", "boivent"] },
    { inf: "connaître", zh: "認識；了解", g: "x", pp: "connu", pres: ["connais", "connais", "connaît", "connaissons", "connaissez", "connaissent"] },
    { inf: "croire", zh: "相信；認為", g: "x", pp: "cru", pres: ["crois", "crois", "croit", "croyons", "croyez", "croient"] },
    { inf: "recevoir", zh: "收到；接待", g: "x", pp: "reçu", pres: ["reçois", "reçois", "reçoit", "recevons", "recevez", "reçoivent"], fut: "recevr" },
    { inf: "vivre", zh: "生活；居住", g: "x", pp: "vécu", pres: ["vis", "vis", "vit", "vivons", "vivez", "vivent"] },
    { inf: "ouvrir", zh: "打開", g: "x", pp: "ouvert", pres: ["ouvre", "ouvres", "ouvre", "ouvrons", "ouvrez", "ouvrent"] },
    { inf: "offrir", zh: "送；提供", g: "x", pp: "offert", pres: ["offre", "offres", "offre", "offrons", "offrez", "offrent"] },
    { inf: "courir", zh: "跑", g: "x", pp: "couru", pres: ["cours", "cours", "court", "courons", "courez", "courent"], fut: "courr" },
    { inf: "mourir", zh: "死", g: "x", aux: "e", pp: "mort", pres: ["meurs", "meurs", "meurt", "mourons", "mourez", "meurent"], fut: "mourr" },
    { inf: "naître", zh: "出生", g: "x", aux: "e", pp: "né", pres: ["nais", "nais", "naît", "naissons", "naissez", "naissent"] },
    { inf: "conduire", zh: "開車；引導", g: "x", pp: "conduit", pres: ["conduis", "conduis", "conduit", "conduisons", "conduisez", "conduisent"] },
    { inf: "suivre", zh: "跟隨；修（課）", g: "x", pp: "suivi", pres: ["suis", "suis", "suit", "suivons", "suivez", "suivent"] },
    { inf: "plaire", zh: "討人喜歡", g: "x", pp: "plu", pres: ["plais", "plais", "plaît", "plaisons", "plaisez", "plaisent"] },
    { inf: "falloir", zh: "必須（只用 il）", g: "x", pp: "fallu", impersonal: true, pres: [null, null, "faut", null, null, null], impStem: "fall", fut: "faudr", subj: [null, null, "faille", null, null, null], imper: null },
    { inf: "pleuvoir", zh: "下雨（只用 il）", g: "x", pp: "plu", impersonal: true, pres: [null, null, "pleut", null, null, null], impStem: "pleuv", fut: "pleuvr", subj: [null, null, "pleuve", null, null, null], imper: null },

    // -er 規則動詞
    { inf: "parler", zh: "說話", g: "er" },
    { inf: "aimer", zh: "喜歡；愛", g: "er" },
    { inf: "habiter", zh: "居住", g: "er" },
    { inf: "travailler", zh: "工作", g: "er" },
    { inf: "étudier", zh: "讀書；研究", g: "er" },
    { inf: "écouter", zh: "聽", g: "er" },
    { inf: "regarder", zh: "看", g: "er" },
    { inf: "chercher", zh: "尋找", g: "er" },
    { inf: "trouver", zh: "找到；覺得", g: "er" },
    { inf: "donner", zh: "給", g: "er" },
    { inf: "penser", zh: "想；認為", g: "er" },
    { inf: "jouer", zh: "玩；演奏", g: "er" },
    { inf: "demander", zh: "問；要求", g: "er" },
    { inf: "visiter", zh: "參觀", g: "er" },
    { inf: "téléphoner", zh: "打電話", g: "er" },
    { inf: "arriver", zh: "抵達；發生", g: "er", aux: "e" },
    { inf: "entrer", zh: "進入", g: "er", aux: "e" },
    { inf: "rester", zh: "停留", g: "er", aux: "e" },
    { inf: "tomber", zh: "跌倒；掉落", g: "er", aux: "e" },
    { inf: "rentrer", zh: "回家", g: "er", aux: "e" },
    { inf: "monter", zh: "上去", g: "er", aux: "e" },
    { inf: "passer", zh: "經過；度過", g: "er" },
    { inf: "laver", zh: "洗", g: "er", refl: true },
    { inf: "coucher", zh: "睡覺；躺下", g: "er", refl: true },
    { inf: "réveiller", zh: "醒來", g: "er", refl: true },
    { inf: "habiller", zh: "穿衣服", g: "er", refl: true },
    { inf: "reposer", zh: "休息", g: "er", refl: true },
    // 拼字變化的 -er 動詞
    { inf: "manger", zh: "吃", g: "er" },
    { inf: "voyager", zh: "旅行", g: "er" },
    { inf: "nager", zh: "游泳", g: "er" },
    { inf: "commencer", zh: "開始", g: "er" },
    { inf: "acheter", zh: "買", g: "er", pres: ["achète", "achètes", "achète", "achetons", "achetez", "achètent"], fut: "achèter" },
    { inf: "lever", zh: "起床", g: "er", refl: true, pres: ["lève", "lèves", "lève", "levons", "levez", "lèvent"], fut: "lèver" },
    { inf: "promener", zh: "散步", g: "er", refl: true, pres: ["promène", "promènes", "promène", "promenons", "promenez", "promènent"], fut: "promèner" },
    { inf: "appeler", zh: "叫（名字）；打電話", g: "er", refl: true, pres: ["appelle", "appelles", "appelle", "appelons", "appelez", "appellent"], fut: "appeller" },
    { inf: "préférer", zh: "比較喜歡", g: "er", pres: ["préfère", "préfères", "préfère", "préférons", "préférez", "préfèrent"] },
    { inf: "espérer", zh: "希望", g: "er", pres: ["espère", "espères", "espère", "espérons", "espérez", "espèrent"] },
    { inf: "payer", zh: "付錢", g: "er", pres: ["paie", "paies", "paie", "payons", "payez", "paient"], fut: "paier" },
    { inf: "essayer", zh: "嘗試；試穿", g: "er", pres: ["essaie", "essaies", "essaie", "essayons", "essayez", "essaient"], fut: "essaier" },
    { inf: "envoyer", zh: "寄送", g: "er", pres: ["envoie", "envoies", "envoie", "envoyons", "envoyez", "envoient"], fut: "enverr" },

    // -ir（finir 型）
    { inf: "finir", zh: "結束；完成", g: "ir" },
    { inf: "choisir", zh: "選擇", g: "ir" },
    { inf: "réussir", zh: "成功；通過", g: "ir" },
    { inf: "grandir", zh: "長大", g: "ir" },
    { inf: "réfléchir", zh: "思考", g: "ir" },

    // -re（vendre 型）
    { inf: "vendre", zh: "賣", g: "re" },
    { inf: "attendre", zh: "等待", g: "re" },
    { inf: "répondre", zh: "回答", g: "re" },
    { inf: "entendre", zh: "聽到", g: "re" },
    { inf: "perdre", zh: "失去；遺失", g: "re" },
    { inf: "descendre", zh: "下去", g: "re", aux: "e" }
];

const FrVerb = {
    find(inf) {
        const key = String(inf || "").trim().toLowerCase().replace(/^s['’]\s*|^se\s+/, "");
        return FR_VERBS.find(v => v.inf === key);
    },

    startsWithVowel(s) { return /^[aeiouyhâàäéèêëîïôöûùüœ]/i.test(s); },

    stem(v) { return v.inf.slice(0, -2); },

    present(v) {
        if (v.pres) return v.pres;
        const s = FrVerb.stem(v);
        if (v.g === "ir") return [s + "is", s + "is", s + "it", s + "issons", s + "issez", s + "issent"];
        if (v.g === "re") return [s + "s", s + "s", s, s + "ons", s + "ez", s + "ent"];
        // -er；manger → mangeons、commencer → commençons
        let nous = s + "ons";
        if (s.endsWith("g")) nous = s + "eons";
        if (s.endsWith("c")) nous = s.slice(0, -1) + "çons";
        return [s + "e", s + "es", s + "e", nous, s + "ez", s + "ent"];
    },

    // 未完成過去式字根：nous 的現在式去掉 -ons（être 例外）
    impStem(v) {
        if (v.impStem) return v.impStem;
        return FrVerb.present(v)[3].replace(/ons$/, "");
    },

    imparfait(v) {
        const st = FrVerb.impStem(v);
        const ends = ["ais", "ais", "ait", "ions", "iez", "aient"];
        return ends.map((e, i) => {
            if (v.impersonal && i !== 2) return null;
            // ç、ge 只在 a / o 前：commençais 但 commencions、mangeais 但 mangions
            let s = st;
            if (e.startsWith("i")) s = s.replace(/ç$/, "c").replace(/ge$/, "g");
            return s + e;
        });
    },

    futStem(v) {
        if (v.fut) return v.fut;
        if (v.g === "re" || /re$/.test(v.inf)) return v.inf.slice(0, -1);
        return v.inf;
    },

    futur(v) {
        const st = FrVerb.futStem(v);
        return ["ai", "as", "a", "ons", "ez", "ont"].map((e, i) => (v.impersonal && i !== 2) ? null : st + e);
    },

    conditionnel(v) {
        const st = FrVerb.futStem(v);
        return ["ais", "ais", "ait", "ions", "iez", "aient"].map((e, i) => (v.impersonal && i !== 2) ? null : st + e);
    },

    // 虛擬式：ils 現在式字根 + e / es / e / ent；nous、vous 同未完成過去式
    subjonctif(v) {
        if (v.subj) return v.subj;
        const p = FrVerb.present(v);
        const st = p[5].replace(/ent$/, "");
        const imp = FrVerb.imparfait(v);
        return [st + "e", st + "es", st + "e", imp[3], imp[4], st + "ent"];
    },

    imperatif(v) {
        if (v.imper === null || v.impersonal) return null;
        if (v.imper) return v.imper;
        const p = FrVerb.present(v);
        // -er 動詞與 ouvrir 型的 tu 去掉 s
        const tu = /es$/.test(p[1]) && /e$/.test(p[0]) ? p[1].slice(0, -1) : p[1];
        return [tu, p[3], p[4]];
    },

    usesEtre(v) { return v.aux === "e" || v.refl; },

    // 與 être 連用的過去分詞配合
    ppFor(v, i) {
        if (!FrVerb.usesEtre(v)) return v.pp || FrVerb.pp(v);
        const pp = v.pp || FrVerb.pp(v);
        return pp + ["(e)", "(e)", "(e)", "(e)s", "(e)(s)", "(e)s"][i];
    },

    pp(v) {
        if (v.pp) return v.pp;
        const s = FrVerb.stem(v);
        if (v.g === "er") return s + "é";
        if (v.g === "ir") return s + "i";
        return s + "u";
    },

    // 主詞（含 je → j' 的省略）
    subject(i, form) {
        const p = FR_PERSONS[i];
        if (i === 0 && FrVerb.startsWithVowel(form)) return "j'";
        return p + " ";
    },

    reflexive(i, form) {
        const r = FR_REFLEXIVE[i];
        return (i !== 3 && i !== 4 && FrVerb.startsWithVowel(form)) ? r.slice(0, 1) + "'" : r + " ";
    },

    // 單一變化 + 主詞，例如 "je me lève"、"j'ai mangé"
    withSubject(v, i, form, { tense } = {}) {
        if (form === null || form === undefined) return null;
        let verbPart = form;
        if (v.refl) verbPart = FrVerb.reflexive(i, form) + form;
        let subj = FrVerb.subject(i, verbPart);
        if (tense === "subj") {
            subj = (i === 2 || i === 5) ? "qu'" + FR_PERSONS[i] + " " : "que " + (i === 0 && FrVerb.startsWithVowel(verbPart) ? "j'" : FR_PERSONS[i] + " ");
        }
        if (v.impersonal) subj = tense === "subj" ? "qu'il " : "il ";
        return (subj + verbPart).replace("' ", "'");
    },

    compound(v, auxTense) {
        const aux = FrVerb.find(FrVerb.usesEtre(v) ? "être" : "avoir");
        const auxForms = auxTense === "imp" ? FrVerb.imparfait(aux) : FrVerb.present(aux);
        return FR_PERSONS.map((p, i) => {
            if (v.impersonal && i !== 2) return null;
            const head = v.refl ? FrVerb.reflexive(i, auxForms[i]) + auxForms[i] : auxForms[i];
            const subj = v.impersonal ? "il " : FrVerb.subject(i, head);
            return (subj + head + " " + FrVerb.ppFor(v, i)).replace("' ", "'");
        });
    },

    // 回傳 {tenseId: [六個人稱的完整句子]}
    conjugate(v) {
        const simple = (forms, tense) => forms.map((f, i) => FrVerb.withSubject(v, i, f, { tense }));
        const out = {
            pres: simple(FrVerb.present(v)),
            pc: FrVerb.compound(v, "pres"),
            imp: simple(FrVerb.imparfait(v)),
            fut: simple(FrVerb.futur(v)),
            cond: simple(FrVerb.conditionnel(v)),
            subj: simple(FrVerb.subjonctif(v), "subj"),
            pqp: FrVerb.compound(v, "imp")
        };
        const imper = FrVerb.imperatif(v);
        if (imper) {
            out.imper = imper.map((f, k) => v.refl ? `${f}-${["toi", "nous", "vous"][k]}` : f);
        }
        return out;
    },

    // 只要動詞本身的形式（練習用）
    form(v, tense, i) {
        const map = { pres: FrVerb.present, imp: FrVerb.imparfait, fut: FrVerb.futur, cond: FrVerb.conditionnel, subj: FrVerb.subjonctif };
        if (map[tense]) return map[tense](v)[i];
        if (tense === "pc" || tense === "pqp") return FrVerb.compound(v, tense === "pc" ? "pres" : "imp")[i];
        return null;
    },

    label(v) { return (v.refl ? (FrVerb.startsWithVowel(v.inf) ? "s'" : "se ") : "") + v.inf; }
};
