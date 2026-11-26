# 萬象遊藝館

多款遊戲的綜合平台：一個帳號、十萬遊戲幣，離線也能玩，有網路時自動同步到 Google 試算表。

- **圍棋**：9／13／19 路，對手是官方 KataGo 神經網路（在瀏覽器內以 WebGPU／WASM 執行），三種難度。
- **五子棋**：15 路，alpha-beta 搜尋加連續沖四必勝計算，三種難度。
- **21 點**：六副牌，加倍、分牌、保險、投降。

## 使用

- 線上版：GitHub Pages 的 `lotsgame/` 路徑。
- 安裝成 App：手機瀏覽器「加入主畫面」，或電腦瀏覽器「安裝應用程式」。第一次開啟後即可離線遊玩。
- 圍棋「高段」引擎約 53 MB，第一次選用時才下載，之後離線可用；想在飛機上玩請先連網開一局。

## 後端

見 [gas/README.md](gas/README.md)。未設定時為單機模式。

## 開發

```
python tools/serve.py 8765
```

開啟 http://localhost:8765/ 。專案準則見 [CLAUDE.md](CLAUDE.md)，素材來源見 [CREDITS.md](CREDITS.md)。
