# 萬象遊藝館（lotsgame）— 專案準則

多款遊戲的綜合平台：大廳 + 各遊戲。純靜態網頁（無建置步驟），可安裝成 PWA／包成 App，後端是 Google Apps Script。
部署在 GitHub `Finatticus/mklgame` 這個 monorepo 的 `lotsgame/` 子資料夾（同 repo 還有其他不相干的專案，不要動它們）。

## 中心思想（做任何新遊戲、改任何畫面都要遵守）

1. **質感第一，不要「AI 感」**
   - 不用 emoji、不用成排的小圖示、不用裝飾性的幾何圖形與漸層色塊。
   - 質感來自真實素材（木紋、牌面、音效）、襯線標題字、細金線、留白與深色底。
   - 封面與插圖一律用遊戲本身的素材即時繪製（`js/games/shared/draw.js`），看起來就是那款遊戲。
   - 新遊戲需要美術時，去找**免費授權**（CC0／公有領域／MIT／OFL）的素材下載進 `assets/`，並在 `CREDITS.md` 記錄來源與授權。
2. **每款遊戲都要精緻、標準**
   - 先研究正式的規則與同類產品怎麼做，再實作；規則不能自創或簡化到失真。
   - 電腦對手要有真實棋力／正確策略，最簡單的難度也不能亂下。棋類優先採用公認的引擎或神經網路。
   - 每款遊戲都要有「規則」說明（`export const RULES`）：玩法、操作、勝負判定、遊戲幣輸贏表。
3. **手機版面是硬性要求**
   - 以 375×812 為基準設計，再往上放大。文字不可溢出、不可難看地斷行：單行資訊一律 `white-space: nowrap` + ellipsis，文案寫短。
   - 棋盤／牌桌要在「不捲動」的情況下完整顯示，操作按鈕在拇指可及的下方。
   - 觸控目標至少 44px；棋類在手機上預設「先點選、再確認」。
   - 每次改版都要用瀏覽器在手機與桌機尺寸實際截圖檢查。
4. **離線優先**
   - 所有狀態先寫 localStorage，再由 `js/store.js` 把事件佇列同步到 GAS。遊戲內不可直接呼叫後端。
   - 新增的檔案要加進 `sw.js` 的 `CORE` 清單並調高 `VERSION`，否則離線時載不到。
   - 對局中的狀態用 `store.saveGame()` 保存，重新開啟可接續。
5. **帳號與遊戲幣**
   - 帳號＝玩家名稱，輸入帳密即可，不存在就詢問後建立；登入後永久保持，除非自行登出。
   - 新帳號 100,000 遊戲幣，所有遊戲共用。下注用 `store.hold()` 先扣住，結束用 `store.settle()` 結算（會自動寫統計、紀錄、同步）。
   - GAS 試算表要讓管理員看得懂：`帳號總覽` 一人一列、`玩家-<帳號>` 一人一張逐筆紀錄，欄位用中文。
6. **大廳要留擴充空間**：遊戲卡片用 grid，新增遊戲只需在 `js/games/registry.js` 登記；`COMING` 是預留位。

## 架構

```
index.html, sw.js, manifest.webmanifest
css/app.css        平台共用（設計變數都在 :root）
css/games.css      各遊戲版面
js/app.js          路由、登入、大廳、戰績、紀錄、我的
js/store.js        帳號、錢包、統計、離線同步
js/ui.js audio.js  共用工具
js/games/registry.js          遊戲清單
js/games/shared/              棋盤元件、封面繪製、開局設定元件
js/games/<id>/index.js        export RULES、export async function mount(root, ctx) → 回傳 unmount
gas/Code.gs        後端（貼到 Apps Script）
tools/             本機伺服器、KataGo 轉檔、字型子集
models/            圍棋神經網路（ONNX）
```

## 新增一款遊戲的步驟

1. `js/games/<id>/index.js`：實作 `RULES` 與 `mount()`；開局用 `shared/setup.js` 的元件；金流走 `store.hold/settle`。
2. `shared/draw.js` 的 `COVERS` 加封面；`registry.js` 登記；`sw.js` 加檔案並調版本。
3. 介面新增的中文字若用到襯線字（標題、按鈕），重跑 `python tools/build_fonts.py <NotoSerifTC.ttf> <CormorantGaramond.ttf>`。
4. 在 GAS 不用改任何東西（遊戲名稱會自動成為新欄位）。
5. 手機、桌機截圖檢查；實際玩完一局確認結算。

## 開發

- 本機伺服器：`python tools/serve.py 8765`（本機預設不啟用 Service Worker；加 `?sw=1` 測離線）。
- 這台電腦沒有 Node／gh，`python` 請用 Python 3.12。
- 圍棋引擎：`tools/katago2onnx.py` 把官方 KataGo 網路轉成 ONNX；特徵編碼在 `js/games/go/features.js`，必須與官方 `NNInputs::fillRowV7` 一致。
