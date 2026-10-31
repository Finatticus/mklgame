# 燼火營地 Emberhold

手機網頁遊戲：**魔塔式爬塔 × 營地經營 × 放置養成**。
純前端（HTML/CSS/JS，不用打包），放在 GitHub Pages；Google Apps Script（GAS）+ Google 試算表當雲端存檔。

- 離線可玩：進度存在手機本機（localStorage），裝成 PWA 後沒網路也能開
- 有網路時自動同步到 GAS（每 30 秒、切到背景時、恢復連線時），以「最後更新時間較新者」為準
- 換手機：在「更多 → 雲端同步」複製同步碼，到新手機貼上還原

## 遊戲內容

完整玩法（所有系統、數值、公式）請看 [guide.html](guide.html)，遊戲內「更多 → 設定」與爬塔大廳都有連結。

| 系統 | 內容 |
|---|---|
| 主塔 | 50 層、5 個區域，每區帶入新機關（暗牆、鐵門守衛、毒沼、藤蔓、巡邏怪、冰面、壓力板、岩漿、傳送陣、黑暗）與新怪物特性；7 種地圖格局；首領有階段與封印水晶；第 50 層最終首領與結局 |
| 星級 | 每層 3 顆星（抵達、全寶石、全怪物），累積領獎；區域任務 |
| 新周目 | 通關後開啟詛咒等級 1～20，塔重新生成、規則越來越嚴苛、獎勵越來越好 |
| 每日挑戰塔 | 每天新塔＋今日規則，可自選詞綴提高獎勵 |
| 每週謎題塔 | 手工設計的固定數值謎題；可在試算表自訂關卡 |
| 季節活動 | 萬聖夜、冬日祭、新春、盛夏祭（依日期自動開啟） |
| 戰鬥 | 魔塔式自動結算＋對戰動畫，攻擊前就知道損失；14 種怪物特性、4 大家族剋制 |
| 英雄 | 8 位英雄，各有被動與技能；覺醒 3 階＋技能分支 |
| 營地 | 11 種設施；研究樹 15 項；派遣探索；農田與料理；訪客事件；篝火越高營地越熱鬧 |
| 祭壇 | 4 分支天賦樹、每日祈福、英雄覺醒、寶物記憶 |
| 收集 | 寶物 24 件（含季節限定）、道具 3 種、工具 5 種、怪物圖鑑、22 個成就與稱號 |

每一層地圖產生後都會自動模擬一次「參考玩家」的走法，確認走得到上樓梯才採用；手工謎題用回溯搜尋驗證可解。
平衡參數在 `js/tower.js` 的 `K`，以及 `js/data.js` 的 `MON_TIERS`、`ELITE_TIER`、`BOSS_TIER`。

## 部署步驟

### 1. 建立 GAS 後端（約 3 分鐘）

1. 開一個新的 [Google 試算表](https://sheets.new)
2. 選單「擴充功能 → Apps Script」
3. 把 [gas/Code.gs](gas/Code.gs) 的內容整個貼上，存檔
4. 右上角「部署 → 新增部署作業」→ 類型選「網頁應用程式」
   - 執行身分：**我**
   - 誰可以存取：**所有人**
5. 授權後複製「網頁應用程式網址」（`https://script.google.com/macros/s/.../exec`）

> 之後修改 Code.gs 時，要用「管理部署作業 → 編輯 → 版本：新版本」，網址才會維持不變。
>
> 試算表會自動建立 `levels` 工作表，可以在裡面設計每週謎題塔的關卡（格式見 guide.html 第 24 節）。

### 2. 填入網址

兩種方式擇一：
- 改 [js/config.js](js/config.js) 的 `GAS_URL`（所有玩家共用）
- 或在遊戲內「更多 → 雲端同步 → GAS 網址」貼上（只存在該裝置）

### 3. 放上 GitHub Pages

```bash
git init
git add .
git commit -m "燼火營地"
git branch -M main
git remote add origin https://github.com/<你的帳號>/emberhold.git
git push -u origin main
```

到 GitHub repo 的「Settings → Pages」，Source 選 `main` 分支的 `/ (root)`，存檔後約一分鐘就能用 `https://<你的帳號>.github.io/emberhold/` 開啟。

手機用 Safari／Chrome 打開後選「加入主畫面」，就會像 App 一樣全螢幕執行，並支援離線。

## 本機測試

```bash
python -m http.server 8080
```

然後開 http://localhost:8080 。（Service Worker 需要 http(s)，直接雙擊 index.html 也能玩，但沒有離線快取。）

## 檔案結構

```
index.html            進入點
css/style.css         全部美術樣式
js/config.js          GAS 網址與參數
js/data.js            遊戲資料（建築、英雄、怪物、寶物、天賦、成就）
js/store.js           狀態、本機存檔、放置收益、數值公式
js/sync.js            GAS 同步
js/levels.js          從試算表下載自訂關卡
js/camp.js            營地（設施、研究、派遣、農田、訪客）／英雄／祭壇（天賦樹、祈福、覺醒、記憶）／更多
js/tower.js           魔塔核心：地圖格局、機關、戰鬥推演、可解性模擬、謎題搜尋
js/battle.js          對戰視窗動畫
js/play.js            爬塔操作與畫面（地形、機關、技能、星級、結局、三種塔）
js/art.js             圖片路徑（assets/）
assets/               手繪素材（已縮小成 webp）
js/fx.js              背景粒子、音效、動畫、對話框
sw.js                 離線快取
gas/Code.gs           後端
```

## 美術與授權

全部使用免費授權素材，出處與授權條款見 [CREDITS.md](CREDITS.md)。遊戲內「更多」頁也有標示。
