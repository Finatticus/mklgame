// ===================== 全域設定 =====================
// 部署新的 GAS 後，把網址貼在這裡
const GAS_URL = "https://script.google.com/macros/s/AKfycbyKlqB0wUOJkBv6mNiv9qEuPENlNa434XTIZuwvXgl-ZEzN6K4MtV8UwFrgosnR7WA/exec";
// 測試用：localStorage.setItem("vocab_api_override", "其他後端網址") 可改連其他後端
const API_URL = (() => { try { return localStorage.getItem("vocab_api_override") || GAS_URL; } catch (e) { return GAS_URL; } })();
const APP_VERSION = "1.3.0";
const MIN_API_VERSION = 1;

const DEFAULT_BOOK = "我的單字";
const TRASH_BOOK = "垃圾桶";
const UNSORTED = "未分類";
const DEFAULT_NEW_PER_DAY = 20;
const DAY_MS = 86400000;
const MAX_INTERVAL = 365;   // 複習間隔上限（天）

// ===================== 語言 =====================
const LANGS = {
    en: {
        code: "en", name: "English", label: "英文", short: "EN",
        tts: "en-US", gtx: "en", ocr: "eng",
        accent: "#2E4A6B", accentSoft: "rgba(46, 74, 107, 0.08)", accentDark: "#9DB8D8", accentSoftDark: "rgba(157, 184, 216, 0.12)",
        pos: [["n.", "名詞"], ["v.", "動詞"], ["adj.", "形容詞"], ["adv.", "副詞"], ["prep.", "介系詞"], ["conj.", "連接詞"], ["pron.", "代名詞"], ["interj.", "感嘆詞"], ["phr.", "片語"], ["sent.", "句子"]],
        accents: [],
        news: [["world", "國際"], ["business", "商業"], ["politics", "政治"], ["technology", "科技"], ["environment", "環境"], ["health", "健康"], ["education", "教育"], ["culture", "文化"]],
        newsSource: "The Conversation",
        placeholder: "例如 serendipity"
    },
    fr: {
        code: "fr", name: "Français", label: "法文", short: "FR",
        tts: "fr-FR", gtx: "fr", ocr: "fra",
        accent: "#7E3438", accentSoft: "rgba(126, 52, 56, 0.08)", accentDark: "#E0A0A3", accentSoftDark: "rgba(224, 160, 163, 0.12)",
        pos: [["n.m.", "陽性名詞"], ["n.f.", "陰性名詞"], ["n.", "名詞（陰陽同形）"], ["v.", "動詞"], ["adj.", "形容詞"], ["adv.", "副詞"], ["prép.", "介系詞"], ["conj.", "連接詞"], ["pron.", "代名詞"], ["dét.", "限定詞／冠詞"], ["interj.", "感嘆詞"], ["loc.", "片語"], ["sent.", "句子"]],
        accents: ["é", "è", "ê", "ë", "à", "â", "ç", "î", "ï", "ô", "û", "ù", "ü", "œ"],
        news: [["monde", "國際"], ["economie", "經濟"], ["politique", "政治"], ["internet", "科技"], ["sciences", "科學"], ["societe", "社會"], ["sante", "健康"], ["culture", "文化"]],
        newsSource: "franceinfo",
        placeholder: "例如 bibliothèque"
    }
};

// ===================== 主題（淺色為主） =====================
const THEMES = {
    auto: { name: "自動（跟隨手機）" },
    paper: { name: "紙白", vars: { "--bg": "#FAF8F4", "--surface": "#FFFFFF", "--ink": "#1C1B19", "--ink-2": "#4A4741", "--muted": "#8A857C", "--line": "#E8E3DA", "--line-strong": "#D5CFC4", "--nav-bg": "rgba(250, 248, 244, 0.92)" } },
    linen: { name: "亞麻", vars: { "--bg": "#F3EEE4", "--surface": "#FBF8F2", "--ink": "#22201C", "--ink-2": "#4E4A42", "--muted": "#8C8578", "--line": "#E2DACB", "--line-strong": "#CFC5B3", "--nav-bg": "rgba(243, 238, 228, 0.92)" } },
    mist: { name: "霧灰", vars: { "--bg": "#F5F6F4", "--surface": "#FFFFFF", "--ink": "#1B1D1C", "--ink-2": "#454947", "--muted": "#848A87", "--line": "#E3E6E3", "--line-strong": "#CFD4D0", "--nav-bg": "rgba(245, 246, 244, 0.92)" } },
    night: { name: "夜讀", vars: { "--bg": "#1B1A18", "--surface": "#232220", "--ink": "#ECE8E1", "--ink-2": "#C4BFB6", "--muted": "#8F8A81", "--line": "#33312D", "--line-strong": "#46433E", "--nav-bg": "rgba(27, 26, 24, 0.92)" } }
};

// 英文字根表（只用於英文）
const ROOTS_DICT = { "bio": "生命", "logy": "學問", "un": "不/否定", "pre": "在...之前", "post": "在...之後", "anti": "反對", "inter": "在...之間", "trans": "跨越", "sub": "在...之下", "re": "再次", "ex": "向外", "in": "向內", "con": "共同", "com": "共同", "pro": "向前", "tele": "遠處", "dict": "說話", "spect": "看", "ject": "投擲", "port": "攜帶", "tract": "拉", "struct": "建立", "micro": "微小", "macro": "巨大", "poly": "多個", "mono": "單一", "auto": "自動", "graph": "寫/畫", "meter": "測量", "phon": "聲音", "photo": "光", "therm": "熱", "hydr": "水", "chron": "時間", "phob": "恐懼", "phil": "喜愛", "anthrop": "人類", "path": "情感/疾病", "morph": "形態", "tion": "名詞字尾", "ment": "名詞字尾", "ness": "名詞字尾", "ity": "名詞字尾", "able": "能...的", "ible": "能...的", "ive": "傾向...的", "ous": "充滿...的", "ful": "充滿...的", "less": "無...的", "ly": "副詞結尾(地)", "ate": "使...", "ize": "使成為", "en": "動詞結尾(使)", "ify": "使...化", "dis": "相反/分離", "mis": "錯誤", "over": "過度", "under": "不足" };
