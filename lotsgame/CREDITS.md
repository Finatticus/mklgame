# 素材與第三方元件來源

| 項目 | 來源 | 授權 |
| --- | --- | --- |
| 圍棋神經網路（`models/go-b6/b10/b18.onnx`） | [KataGo](https://github.com/lightvector/KataGo) 官方訓練網路 kata1-b6c96、kata1-b10c128、kata1-b18c384nbt（katagotraining.org），以 `tools/katago2onnx.py` 轉檔 | MIT |
| 神經網路執行環境（`vendor/ort/`） | [onnxruntime-web](https://github.com/microsoft/onnxruntime) 1.23.2 | MIT |
| 木紋材質（`assets/wood/`） | [Poly Haven](https://polyhaven.com/textures/wood)：bamboo_veneer、cherry_veneer、walnut_veneer | CC0 |
| 撲克牌牌面（`assets/cards/`） | [Vector Playing Cards](https://code.google.com/archive/p/vector-playing-cards/)（Byron Knoll），取自 hayeah/playing-cards-assets | 公有領域 |
| 發牌與籌碼音效（`assets/sfx/card*、flip*、chip*、shuffle`） | [Kenney Casino Audio](https://kenney.nl/assets/casino-audio) | CC0 |
| 落子與提子音效（`assets/sfx/stone*、capture`） | [KaTrain](https://github.com/sanderland/katrain) | MIT |
| 標題字型（`assets/fonts/`） | Noto Serif TC、Cormorant Garamond（Google Fonts），裁成子集 | SIL OFL 1.1 |

棋子、籌碼、牌背、牌桌與所有封面圖皆為程式即時繪製。
