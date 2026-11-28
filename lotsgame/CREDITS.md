# 素材與第三方元件來源

| 項目 | 來源 | 授權 |
| --- | --- | --- |
| 圍棋神經網路（`models/go-b6/b10/b18.onnx`） | [KataGo](https://github.com/lightvector/KataGo) 官方訓練網路 kata1-b6c96、kata1-b10c128、kata1-b18c384nbt（katagotraining.org），以 `tools/katago2onnx.py` 轉檔 | MIT |
| 神經網路執行環境（`vendor/ort/`） | [onnxruntime-web](https://github.com/microsoft/onnxruntime) 1.23.2 | MIT |
| 木紋材質（`assets/wood/`） | [Poly Haven](https://polyhaven.com/textures/wood)：bamboo_veneer、cherry_veneer、walnut_veneer | CC0 |
| 撲克牌牌面（`assets/cards/`） | [Vector Playing Cards](https://code.google.com/archive/p/vector-playing-cards/)（Byron Knoll），取自 hayeah/playing-cards-assets | 公有領域 |
| 發牌與籌碼音效（`assets/sfx/card*、flip*、chip*、shuffle`） | [Kenney Casino Audio](https://kenney.nl/assets/casino-audio) | CC0 |
| 落子與提子音效（`assets/sfx/stone*、capture`） | [KaTrain](https://github.com/sanderland/katrain) | MIT |
| 麻將牌面（`assets/mahjong/t0–t32.webp`） | [FluffyStuff/riichi-mahjong-tiles](https://github.com/FluffyStuff/riichi-mahjong-tiles)（Regular 版 SVG 轉成 WebP） | CC0（公有領域） |
| 西洋棋引擎（`js/games/chess/sf/`） | [Stockfish.js](https://github.com/nmrugg/stockfish.js) 19.0.1 lite single-threaded（Nathan Rugg 移植自 [Stockfish](https://github.com/official-stockfish/Stockfish)）；原始碼見前述連結，授權全文在 `js/games/chess/sf/COPYING.txt` | GPL-3.0 |
| 西洋棋棋子（`assets/chess/`） | Wikimedia Commons「Chess_*t45.svg」（[Cburnett](https://commons.wikimedia.org/wiki/User:Cburnett)） | GFDL／BSD／GPL 三授權，本站依 BSD |
| 迷你高爾夫與撞球音效（`assets/sfx/putt*、wood*、cup*、ball*、cushion*、pocket*`） | [Kenney Impact Sounds](https://kenney.nl/assets/impact-sounds) | CC0 |
| 迷你高爾夫地面與石材（`assets/golf/`） | [Poly Haven](https://polyhaven.com/textures)：dry_river_pebbles、coast_sand_01、dry_ground_rocks、red_sandstone_wall、mossy_rock、dry_riverbed_rock、granite_tile、gravel_floor_02、snow_02、bark_brown_02、brown_planks_05、wood_floor_deck、cobblestone_floor_04、mossy_stone_wall、leaves_forest_ground、oak_wood_planks、burned_ground_01、dark_rock_02 | CC0 |
| 蒼穹戰機航拍地形（`assets/shooter/`） | [Poly Haven](https://polyhaven.com/textures/aerial)：aerial_beach_01、aerial_grass_rock、aerial_sand、aerial_rocks_02、aerial_asphalt_01、snow_field_aerial、dirt_aerial_02、aerial_ground_rock、coast_sand_rocks_02、aerial_mud_1 | CC0 |
| 蒼穹戰機爆炸、擊中、道具、雷射、飛彈音效（`assets/sfx/boom*、bigboom*、hitm*、power、laser、missile*`） | [Kenney Sci-Fi Sounds](https://kenney.nl/assets/sci-fi-sounds)（轉為單聲道 WAV 並裁切） | CC0 |
| 月下白狼的白狼、暗狼、巨蛛、戰馬、飛龍模型（`assets/wolf/models/`） | Literock Studios 免費版模型：[Dire Wolf Lite](https://literock-studios.itch.io/direwolf-lite)、[Giant Spider Lite](https://literock-studios.itch.io/giant-spider-lite)、[Warhorse Lite](https://literock-studios.itch.io/warhorse-lite)、[Ashwing Drake Lite](https://literock-studios.itch.io/ashwing-drake-lite)。貼圖縮為 1024 並轉 JPEG；白狼毛色由原貼圖去色提亮。原作者註明模型以 Meshy 生成基礎網格後手工綁骨、動畫 | Literock 免費授權：可免費用於任何遊戲（含商業），可修改；不得單獨轉售或再散布模型本身，只能隨遊戲一起發佈 |
| 月下白狼的岩石、樹樁、倒木、蕨類、灌木、枯枝、雕像、火盆、寶箱（`assets/wolf/props/`） | [Poly Haven](https://polyhaven.com/models)：rock_moss_set_01、rock_07、rock_09、tree_stump_01、dead_tree_trunk、dead_quiver_trunk、fern_02、shrub_03、dry_branches_medium_01、gothic_statue、stone_fire_pit、treasure_chest（以 meshoptimizer 減面，貼圖縮為 512） | CC0 |
| 月下白狼的地面貼圖（`assets/wolf/ground/`） | [Poly Haven](https://polyhaven.com/textures)：forest_leaves_04、forest_leaves_03、snow_02、burned_ground_01 | CC0 |
| 月下白狼的夜空環境光（`assets/wolf/env/`） | [Poly Haven](https://polyhaven.com/hdris)：qwantani_night、rogland_moonlit_night（縮為 256×128） | CC0 |
| 3D 引擎（`vendor/three/`） | [three.js](https://github.com/mrdoob/three.js) r187（含 GLTFLoader、SkeletonUtils、HDRLoader），授權全文在 `vendor/three/LICENSE` | MIT |
| 模型減面（`vendor/three/meshopt_simplifier.js`） | [meshoptimizer](https://github.com/zeux/meshoptimizer) 1.3（Arseny Kapoulkine） | MIT |
| 標題字型（`assets/fonts/`） | Noto Serif TC、Cormorant Garamond（Google Fonts），裁成子集 | SIL OFL 1.1 |

圍棋與象棋棋子、籌碼、牌背、牌桌與所有封面圖皆為程式即時繪製（月下白狼的封面為遊戲本身 3D 場景的渲染畫面）（象棋子以 Noto Serif TC 刻字）。象棋 AI 為本站自行實作的 alpha-beta 搜尋引擎。迷你高爾夫的草皮、旗子與球洞、撞球檯的檯呢與球（含號碼）皆為程式繪製；落水聲以合成器產生。麻將的白板與八張花牌（`t33`、`t34–t41`）以 Noto Serif TC 字型自行繪製。
