// 平台設定。部署 GAS 後，把網頁應用程式網址貼到 GAS_URL（步驟見 gas/README.md）。
// 留空時為「單機模式」：帳號與紀錄只存在這台裝置，不會同步。
// 本機開發（localhost）預設不連後端，避免測試資料寫進正式試算表；網址加上 ?gas=1 可在本機測試同步。
const PROD_GAS_URL = 'https://script.google.com/macros/s/AKfycby__LSshh7hadtiqLNcae_c5aqqjr1sxKtF8GRqRSurglfsGxSvNWqECphwbGBN92kT/exec';
const isLocal = typeof location !== 'undefined' && ['localhost', '127.0.0.1'].includes(location.hostname) && !location.search.includes('gas=1');
export const GAS_URL = isLocal ? '' : PROD_GAS_URL;

export const APP_NAME = '萬象遊藝館';
export const APP_VERSION = '1.6.0';
export const START_COINS = 100000;

// 每日簽到：基本 2,000，連續簽到每天多 500，最高 5,000
export const DAILY_BASE = 2000;
export const DAILY_STEP = 500;
export const DAILY_MAX = 5000;

// 補給金：餘額低於門檻時可領，每天最多三次
export const RELIEF_THRESHOLD = 1000;
export const RELIEF_AMOUNT = 20000;
export const RELIEF_PER_DAY = 3;
