// 沉沒王國：離線用的 Service Worker
// 遊戲檔案存在手機裡（先用快取，沒有才上網抓）；version.json、cloud_config.json 一律上網抓（由網頁自己處理沒網路的情況）
// 有新版本時，網頁會把 sk- 開頭的快取全部清掉再重新載入，這裡就會重新下載新檔案
const CACHE = 'sk-game';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
	const req = e.request;
	if (req.method !== 'GET') return;
	const url = new URL(req.url);
	if (url.origin !== self.location.origin) return;
	if (url.pathname.endsWith('version.json') || url.pathname.endsWith('cloud_config.json')) return;
	e.respondWith(caches.open(CACHE).then(async (cache) => {
		const hit = await cache.match(req, { ignoreSearch: true });
		if (hit) return hit;
		try {
			const res = await fetch(req, { cache: 'reload' });
			if (res.ok) cache.put(req, res.clone());
			return res;
		} catch (err) {
			const any = await cache.match('index.html');
			return req.mode === 'navigate' && any ? any : Response.error();
		}
	}));
});
