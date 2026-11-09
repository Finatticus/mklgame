/* Service worker：快取 App 外殼，API 一律走網路 */
const CACHE = 'workout-v2.0.0';
const SHELL = [
  './', './index.html', './css/app.css', './css/v2.css',
  './js/config.js', './js/schema.js', './js/seed.js', './js/data/exercises.js', './js/data/foods.js', './js/api.js', './js/charts.js',
  './js/core.js', './js/inbody.js', './js/weight.js', './js/training.js', './js/food.js', './js/home.js', './js/main.js',
  './manifest.webmanifest', './icons/icon.svg', './icons/apple-touch-icon.png', './icons/icon-192.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin !== location.origin) {
    // Google Fonts：快取優先
    if (/fonts\.(googleapis|gstatic)\.com/.test(url.host)) {
      e.respondWith(caches.open(CACHE).then(async (c) => {
        const hit = await c.match(e.request);
        if (hit) return hit;
        const res = await fetch(e.request);
        c.put(e.request, res.clone());
        return res;
      }));
    }
    return;
  }
  // 同源：網路優先（拿到最新版），離線時用快取
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
  );
});
