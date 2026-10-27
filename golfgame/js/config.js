// ===== Dixen Golf 設定 =====
export const CONFIG = {
  // GAS 網頁應用程式的網址（內建，玩家不用自己填；重新部署時用「管理部署作業 → 編輯 → 新版本」，網址不變）
  // 留空 = 本機模式：帳號存在這台裝置的瀏覽器，方便測試，但不能跨裝置連線。
  GAS_URL: 'https://script.google.com/macros/s/AKfycbw_GitZHlz8xnonhdWc3Y5AL_exIJRIcj7OgQK7br4n-PWWe5mBXXwBkfZTBhpyhTMD/exec',

  // WebRTC 連線用的公開 STUN 伺服器
  ICE: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }],
};

export const ADMIN_USER = 'Michael';
// 生涯模式（開發測試中）只開放給這些帳號（分大小寫）；正式開放時改成 null = 所有人。伺服器 gas/Career.gs 的 CAREER_ACCESS 要一起改
export const CAREER_USERS = ['test', 'Michael'];
export const careerAllowed = user => !!user && (CAREER_USERS === null || CAREER_USERS.includes(user));

// ===== 角色 =====
// classic = 程式內建角色（可換顏色）；其他 = Mixamo 寫實角色（assets/character/<資料夾>/model.glb，由轉檔工具從 model.fbx 壓縮而來）
// 新增角色：放好資料夾、用 .claude/convert-characters.html 轉檔後，在這裡加一行。height = 遊戲裡的身高（公尺）
export const CHARACTERS = [
  { id: 'classic', name: '經典（內建，可換顏色）' },
  { id: 'David', name: 'David', file: 'assets/character/David/model.glb', height: 1.80 },
  { id: 'James', name: 'James', file: 'assets/character/James/model.glb', height: 1.83 },
  { id: 'Joe', name: 'Joe', file: 'assets/character/Joe/model.glb', height: 1.78 },
  { id: 'Louise', name: 'Louise', file: 'assets/character/Louise/model.glb', height: 1.68 },
  { id: 'Ninja', name: 'Ninja', file: 'assets/character/Ninja/model.glb', height: 1.76 },
  { id: 'Ross', name: 'Ross', file: 'assets/character/Ross/model.glb', height: 1.78 },
  { id: 'Sophie', name: 'Sophie', file: 'assets/character/Sophie/model.glb', height: 1.68 },
  { id: 'Alien', name: 'Alien', file: 'assets/character/Alien/model.glb', height: 1.80 },
  { id: 'Kachujin', name: 'Kachujin', file: 'assets/character/Kachujin/model.glb', height: 1.70 },
];
export const ANIM_BASE = 'assets/character/anims';   // 所有寫實角色共用的動作檔
export const characterDef = id => CHARACTERS.find(c => c.id === id) || CHARACTERS[0];

export function gasUrl() {
  try {
    // 測試用：強制本機模式，不動到正式試算表（沒有設定畫面，只有開發時手動設）；以前在設定裡填過的網址一律不再採用
    if (localStorage.getItem('dixen.gas') === 'local') return '';
    return CONFIG.GAS_URL;
  } catch (e) { return CONFIG.GAS_URL; }
}

export function getSetting(k, d) {
  try { const v = localStorage.getItem('dixen.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; }
}

export function setSetting(k, v) {
  try { localStorage.setItem('dixen.' + k, JSON.stringify(v)); } catch (e) { /* 私密模式 */ }
}
