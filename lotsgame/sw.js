// Service Worker：把整個平台快取起來，沒有網路也能開啟與遊玩。
// 更新程式後請調整 VERSION，使用者下次開啟時會自動換成新版。
const VERSION = 'v1.10.0';
const CACHE = 'lots-app-' + VERSION;
const MODEL_CACHE = 'lots-models-v1'; // 圍棋引擎（大檔），跨版本保留
const WOLF_CACHE = 'lots-wolf-v1'; // 月下白狼的 3D 模型與貼圖（大檔），跨版本保留
const RACER_CACHE = 'lots-racer-v1'; // 極速山道的車輛、賽道貼圖與天空（約 47 MB）：第一次遊玩時下載，之後離線可玩

const CORE = [
  './', 'index.html', 'manifest.webmanifest',
  'css/app.css', 'css/games.css',
  'js/app.js', 'js/config.js', 'js/store.js', 'js/ui.js', 'js/audio.js',
  'js/games/registry.js', 'js/games/shared/draw.js', 'js/games/shared/boardview.js', 'js/games/shared/setup.js',
  'js/games/go/index.js', 'js/games/go/rules.js', 'js/games/go/features.js', 'js/games/go/engine-worker.js',
  'js/games/gomoku/index.js', 'js/games/gomoku/ai-worker.js',
  'js/games/blackjack/index.js', 'js/games/baccarat/index.js', 'js/games/minesweeper/index.js', 'js/games/g2048/index.js',
  'js/games/holdem/index.js', 'js/games/holdem/engine.js', 'js/games/holdem/table.js',
  'js/games/bigtwo/index.js', 'js/games/bigtwo/engine.js', 'js/games/bigtwo/table.js',
  'js/games/shooter/index.js', 'js/games/shooter/game.js', 'js/games/shooter/sprites.js', 'js/games/shooter/terrain.js', 'js/games/shooter/stages.js',
  'js/games/wolf/index.js', 'js/games/wolf/game.js', 'js/games/wolf/world.js', 'js/games/wolf/assets.js', 'js/games/wolf/data.js', 'js/games/wolf/pack.js', 'js/games/wolf/packui.js',
  'vendor/three/three.core.js', 'vendor/three/three.module.js', 'vendor/three/GLTFLoader.js', 'vendor/three/SkeletonUtils.js', 'vendor/three/BufferGeometryUtils.js', 'vendor/three/HDRLoader.js', 'vendor/three/meshopt_simplifier.js',
  'assets/wolf/cover.jpg',
  'js/games/racer/index.js', 'js/games/racer/data.js', 'js/games/racer/track.js', 'js/games/racer/car.js', 'js/games/racer/race.js', 'js/games/racer/sound.js',
  'assets/racer/cover.jpg',
  'js/games/mahjong/index.js', 'js/games/mahjong/game.js', 'js/games/mahjong/rules.js',
  'js/games/xiangqi/index.js', 'js/games/xiangqi/engine.js', 'js/games/xiangqi/ai-worker.js',
  'js/games/chess/index.js', 'js/games/chess/rules.js', 'js/games/chess/engine.js',
  'js/games/chess/sf/stockfish-19-lite-single.js', 'js/games/chess/sf/stockfish-19-lite-single.wasm',
  'js/games/minigolf/index.js', 'js/games/minigolf/physics.js', 'js/games/minigolf/holes.js', 'js/games/minigolf/render.js', 'js/games/minigolf/ai.js', 'js/games/minigolf/ai-worker.js',
  'js/games/billiards/index.js', 'js/games/billiards/physics.js', 'js/games/billiards/rules.js', 'js/games/billiards/render.js', 'js/games/billiards/ai-worker.js',
  ...['pebbles', 'sand', 'desert', 'sandstone', 'mossrock', 'canyonrock', 'granite', 'gravel', 'snow', 'bark', 'dock', 'cedar', 'cobble', 'mosswall', 'leaves', 'oak', 'ash', 'basalt'].map((n) => 'assets/golf/' + n + '.jpg'),
  'vendor/ort/ort.webgpu.bundle.min.mjs', 'vendor/ort/ort-wasm-simd-threaded.asyncify.mjs', 'vendor/ort/ort-wasm-simd-threaded.asyncify.wasm',
  'assets/fonts/serif-tc.woff2', 'assets/fonts/latin.woff2',
  'assets/wood/bamboo.jpg', 'assets/wood/cherry.jpg', 'assets/wood/walnut.jpg',
  'assets/img/felt.png', 'assets/img/icon-192.png', 'assets/img/icon-512.png', 'assets/img/icon-180.png',
  ...['stone1', 'stone2', 'stone3', 'stone4', 'stone5', 'capture', 'card1', 'card2', 'card3', 'flip1', 'flip2', 'shuffle', 'chip1', 'chip2', 'chips1', 'chips2', 'chipswin', 'putt1', 'putt2', 'putt3', 'wood1', 'wood2', 'wood3', 'cup1', 'cup2', 'ball1', 'ball2', 'ball3', 'cushion1', 'cushion2', 'pocket1', 'pocket2', 'boom1', 'boom2', 'boom3', 'boom4', 'boom5', 'bigboom1', 'bigboom2', 'hitm1', 'hitm2', 'hitm3', 'power', 'laser', 'missile1', 'missile2'].map((n) => 'assets/sfx/' + n + '.wav'),
  ...['aerial_beach_01', 'aerial_grass_rock', 'aerial_sand', 'aerial_rocks_02', 'aerial_asphalt_01', 'snow_field_aerial', 'dirt_aerial_02', 'aerial_ground_rock', 'coast_sand_rocks_02', 'aerial_mud_1'].map((n) => 'assets/shooter/' + n + '.jpg'),
  ...['k', 'q', 'r', 'b', 'n', 'p'].flatMap((p) => ['assets/chess/w' + p + '.svg', 'assets/chess/b' + p + '.svg']),
  ...Array.from({ length: 42 }, (_, i) => 'assets/mahjong/t' + i + '.webp'),
  ...'A23456789TJQK'.split('').flatMap((r) => 'SHDC'.split('').map((s) => 'assets/cards/' + r + s + '.webp')),
];
// 入門與進階的圍棋引擎隨平台一起快取；高段引擎（53 MB）在第一次選用時下載
const MODELS = ['models/go-b6.onnx', 'models/go-b10.onnx'];
// 月下白狼的模型、地形物件、地面貼圖與夜空環境光（約 14 MB），換版本時不重新下載
const WOLF = [
  'assets/wolf/models/drake.glb',
  'assets/wolf/models/horse.glb',
  'assets/wolf/models/spider.glb',
  'assets/wolf/models/wolf.glb',
  'assets/wolf/props/dead_quiver_trunk.glb',
  'assets/wolf/props/dead_tree_trunk.glb',
  'assets/wolf/props/dry_branches_medium_01.glb',
  'assets/wolf/props/fern_02.glb',
  'assets/wolf/props/gothic_statue.glb',
  'assets/wolf/props/rock_07.glb',
  'assets/wolf/props/rock_09.glb',
  'assets/wolf/props/rock_moss_set_01_0.glb',
  'assets/wolf/props/rock_moss_set_01_1.glb',
  'assets/wolf/props/rock_moss_set_01_2.glb',
  'assets/wolf/props/rock_moss_set_01_3.glb',
  'assets/wolf/props/rock_moss_set_01_4.glb',
  'assets/wolf/props/rock_moss_set_01_5.glb',
  'assets/wolf/props/shrub_03.glb',
  'assets/wolf/props/stone_fire_pit.glb',
  'assets/wolf/props/treasure_chest.glb',
  'assets/wolf/props/tree_stump_01.glb',
  'assets/wolf/ground/burned_ground_01_arm.jpg',
  'assets/wolf/ground/burned_ground_01_diff.jpg',
  'assets/wolf/ground/burned_ground_01_nor_gl.jpg',
  'assets/wolf/ground/forest_leaves_03_arm.jpg',
  'assets/wolf/ground/forest_leaves_03_diff.jpg',
  'assets/wolf/ground/forest_leaves_03_nor_gl.jpg',
  'assets/wolf/ground/forest_leaves_04_arm.jpg',
  'assets/wolf/ground/forest_leaves_04_diff.jpg',
  'assets/wolf/ground/forest_leaves_04_nor_gl.jpg',
  'assets/wolf/ground/snow_02_arm.jpg',
  'assets/wolf/ground/snow_02_diff.jpg',
  'assets/wolf/ground/snow_02_nor_gl.jpg',
  'assets/wolf/env/qwantani_night_256.hdr',
  'assets/wolf/env/rogland_moonlit_night_256.hdr',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(CORE.map((u) => cache.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    const models = await caches.open(MODEL_CACHE);
    await Promise.all(MODELS.map(async (u) => {
      const url = new URL(u, self.location).href;
      if (!(await models.match(url))) await models.add(url).catch(() => {});
    }));
    const wolf = await caches.open(WOLF_CACHE);
    await Promise.all(WOLF.map(async (u) => {
      const url = new URL(u, self.location).href;
      if (!(await wolf.match(url))) await wolf.add(url).catch(() => {});
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('lots-app-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith((async () => {
    if (url.pathname.endsWith('.onnx')) {
      const models = await caches.open(MODEL_CACHE);
      const hit = await models.match(url.href);
      if (hit) return hit;
      return fetch(req);
    }
    const big = url.pathname.endsWith('cover.jpg') ? null : url.pathname.includes('/assets/wolf/') ? WOLF_CACHE : url.pathname.includes('/assets/racer/') ? RACER_CACHE : null;
    if (big) {
      const wolf = await caches.open(big);
      const hit = await wolf.match(url.href);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) wolf.put(url.href, res.clone()).catch(() => {});
      return res;
    }
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') cache.put(req, res.clone()).catch(() => {});
      return res;
    } catch (err) {
      if (req.mode === 'navigate') { const shell = await cache.match('index.html'); if (shell) return shell; }
      throw err;
    }
  })());
});
