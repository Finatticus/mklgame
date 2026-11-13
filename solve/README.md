# 問題分析與解決 工作板

題目 → 關聯圖 → 魚骨圖 → 決策分析 → 流程圖。前端是單一 `index.html`，後端是 Google Apps Script ＋ Google Sheets。

## 檔案

- `index.html`：整個網站。不接後端也能用（離線模式，資料存在瀏覽器）。
- `Code.gs`：Google Apps Script 後端，負責把資料存進試算表並讓大家同步。

## 一、先試用（離線）

直接用瀏覽器開 `index.html` 即可。資料只存在這台裝置的瀏覽器裡。

## 二、接上 Google Sheets（讓組員同步）

1. 新增一份 Google 試算表。
2. 選單「擴充功能 → Apps Script」，把預設內容換成 `Code.gs` 的全部內容，存檔。
3. 右上「部署 → 新增部署作業」，類型選「網頁應用程式」。
   - 執行身分：我
   - 誰可以存取：**所有人**
4. 按部署，第一次會要求授權，同意後複製「網頁應用程式網址」（結尾是 `/exec`）。
5. 打開 `index.html`，把最上面的 `const CONFIG_GAS_URL = '';` 改成你的網址：

   ```js
   const CONFIG_GAS_URL = 'https://script.google.com/macros/s/xxxx/exec';
   ```


之後若修改 `Code.gs`，要到「部署 → 管理部署作業 → 編輯 → 版本選新版本」才會生效。

## 三、放上 GitHub Pages

1. 建一個 repository，上傳 `index.html`（`Code.gs`、`README.md` 可一起放）。
2. Settings → Pages → Source 選 `main` 分支、`/ (root)`，存檔。
3. 幾分鐘後就能用 `https://你的帳號.github.io/repo名稱/` 開啟，手機可「加入主畫面」當 App 用。

## 注意

- 沒有密碼：拿到網址的人都能選編輯者。GAS 網址寫在公開的 `index.html` 裡，等於任何人都能寫入這份試算表的 `ents` 工作表，請不要放機密資料。
- 同步方式是每 2.5 秒輪詢一次，不是真正的即時推送。
- 兩位編輯者同時改「同一張便條」時，以後送出的為準；改不同便條不會互相覆蓋。
- 「⚙ 設定」裡可以匯出／匯入 JSON 備份。
