// ===================== 全域設定 =====================
const GAS_URL = "https://script.google.com/macros/s/AKfycbwResFElXIAqxOieyCa-E68jg0eQ9zoSbqiYr_nhXCul_kT7FmlH4xHucse8ZWWQZY/exec";
// 測試用：localStorage.setItem("vp_api_override", "http://localhost:8765") 可改連本機模擬後端
const API_URL = (() => { try { return localStorage.getItem("vp_api_override") || GAS_URL; } catch (e) { return GAS_URL; } })();
const APP_VERSION = "2.0.0";
const API_VERSION = 2;

const DEFAULT_BOOK = "預設單字本";
const TRASH_BOOK = "🗑️ 垃圾桶";
const UNSORTED = "未分類";
const DEFAULT_NEW_PER_DAY = 20;
const DAY_MS = 86400000;

const POS_OPTIONS = [
    ["n.", "名詞 (n.)"], ["v.", "動詞 (v.)"], ["adj.", "形容詞 (adj.)"], ["adv.", "副詞 (adv.)"],
    ["prep.", "介系詞 (prep.)"], ["conj.", "連接詞 (conj.)"], ["phr.", "片語 (phr.)"]
];

const THEME_NAMES = {
    default: "明亮主題", diablo: "暗黑破壞神", sakura: "極簡櫻花", matrix: "駭客任務", ocean: "海洋微風",
    coffee: "溫暖拿鐵", matcha: "靜謐抹茶", sunset: "夕陽餘暉", lavender: "紫色迷情", cyberpunk: "賽博龐克",
    autumn: "秋日楓葉", dracula: "夜訪吸血鬼", rainbow: "奇幻彩虹"
};

const THEMES = {
    "default": { "--bg-color": "#F8FAFC", "--card-bg": "#FFFFFF", "--text-main": "#0F172A", "--text-muted": "#64748B", "--primary": "#4F46E5", "--primary-hover": "#4338CA", "--primary-light": "#E0E7FF", "--border": "#E2E8F0", "--nav-bg": "rgba(255, 255, 255, 0.85)" },
    "diablo": { "--bg-color": "#110E0E", "--card-bg": "#1A1515", "--text-main": "#E5E5E5", "--text-muted": "#9CA3AF", "--primary": "#DC2626", "--primary-hover": "#B91C1C", "--primary-light": "#451A1A", "--border": "#372929", "--nav-bg": "rgba(17, 14, 14, 0.85)" },
    "sakura": { "--bg-color": "#FFF0F5", "--card-bg": "#FFFFFF", "--text-main": "#4A4A4A", "--text-muted": "#9B8B93", "--primary": "#FF8DA1", "--primary-hover": "#FF6B8B", "--primary-light": "#FFE6EB", "--border": "#FADADD", "--nav-bg": "rgba(255, 255, 255, 0.85)" },
    "matrix": { "--bg-color": "#0D110D", "--card-bg": "#000000", "--text-main": "#00FF41", "--text-muted": "#008F11", "--primary": "#00FF41", "--primary-hover": "#008F11", "--primary-light": "rgba(0, 255, 65, 0.1)", "--border": "#003300", "--nav-bg": "rgba(0, 0, 0, 0.85)" },
    "ocean": { "--bg-color": "#E0F2FE", "--card-bg": "#F0F9FF", "--text-main": "#0C4A6E", "--text-muted": "#0284C7", "--primary": "#0284C7", "--primary-hover": "#0369A1", "--primary-light": "#BAE6FD", "--border": "#7DD3FC", "--nav-bg": "rgba(240, 249, 255, 0.85)" },
    "coffee": { "--bg-color": "#FDF8F5", "--card-bg": "#FFFFFF", "--text-main": "#4A3B32", "--text-muted": "#8A7968", "--primary": "#8C6A5D", "--primary-hover": "#705348", "--primary-light": "#F2E8E3", "--border": "#E6D7CE", "--nav-bg": "rgba(253, 248, 245, 0.85)" },
    "matcha": { "--bg-color": "#F4F7F4", "--card-bg": "#FFFFFF", "--text-main": "#2C3E2D", "--text-muted": "#687D69", "--primary": "#557A58", "--primary-hover": "#3E5B41", "--primary-light": "#E6EDE6", "--border": "#D5E0D6", "--nav-bg": "rgba(244, 247, 244, 0.85)" },
    "sunset": { "--bg-color": "#FFFBEB", "--card-bg": "#FFFFFF", "--text-main": "#78350F", "--text-muted": "#B45309", "--primary": "#EA580C", "--primary-hover": "#C2410C", "--primary-light": "#FFEDD5", "--border": "#FDE68A", "--nav-bg": "rgba(255, 251, 235, 0.85)" },
    "lavender": { "--bg-color": "#FAF5FF", "--card-bg": "#FFFFFF", "--text-main": "#4C1D95", "--text-muted": "#7C3AED", "--primary": "#9333EA", "--primary-hover": "#7E22CE", "--primary-light": "#F3E8FF", "--border": "#E9D5FF", "--nav-bg": "rgba(250, 245, 255, 0.85)" },
    "cyberpunk": { "--bg-color": "#09090B", "--card-bg": "#18181B", "--text-main": "#E879F9", "--text-muted": "#A1A1AA", "--primary": "#D946EF", "--primary-hover": "#C026D3", "--primary-light": "rgba(217, 70, 239, 0.15)", "--border": "#27272A", "--nav-bg": "rgba(9, 9, 11, 0.85)" },
    "autumn": { "--bg-color": "#FEFCE8", "--card-bg": "#FFFFFF", "--text-main": "#713F12", "--text-muted": "#A16207", "--primary": "#D97706", "--primary-hover": "#B45309", "--primary-light": "#FEF3C7", "--border": "#FDE047", "--nav-bg": "rgba(254, 252, 232, 0.85)" },
    "dracula": { "--bg-color": "#282A36", "--card-bg": "#44475A", "--text-main": "#F8F8F2", "--text-muted": "#6272A4", "--primary": "#FF79C6", "--primary-hover": "#FF92D0", "--primary-light": "rgba(255, 121, 198, 0.15)", "--border": "#6272A4", "--nav-bg": "rgba(40, 42, 54, 0.85)" },
    "rainbow": { "--bg-color": "#F0F8FF", "--card-bg": "#FFFFFF", "--text-main": "#2C3E50", "--text-muted": "#7F8C8D", "--primary": "#FF3B30", "--primary-hover": "#FF9500", "--primary-light": "#FDEBD0", "--border": "#ABEBC6", "--nav-bg": "rgba(255, 255, 255, 0.85)" }
};

const ROOTS_DICT = { "bio": "生命", "logy": "學問", "un": "不/否定", "pre": "在...之前", "post": "在...之後", "anti": "反對", "inter": "在...之間", "trans": "跨越", "sub": "在...之下", "re": "再次", "ex": "向外", "in": "向內", "con": "共同", "com": "共同", "pro": "向前", "tele": "遠處", "dict": "說話", "spect": "看", "ject": "投擲", "port": "攜帶", "tract": "拉", "struct": "建立", "micro": "微小", "macro": "巨大", "poly": "多個", "mono": "單一", "auto": "自動", "graph": "寫/畫", "meter": "測量", "phon": "聲音", "photo": "光", "therm": "熱", "hydr": "水", "chron": "時間", "phob": "恐懼", "phil": "喜愛", "anthrop": "人類", "path": "情感/疾病", "morph": "形態", "tion": "名詞字尾", "ment": "名詞字尾", "ness": "名詞字尾", "ity": "名詞字尾", "able": "能...的", "ible": "能...的", "ive": "傾向...的", "ous": "充滿...的", "ful": "充滿...的", "less": "無...的", "ly": "副詞結尾(地)", "ate": "使...", "ize": "使成為", "en": "動詞結尾(使)", "ify": "使...化", "dis": "相反/分離", "mis": "錯誤", "over": "過度", "under": "不足" };
