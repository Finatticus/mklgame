/* Service worker：快取 App 外殼，API 一律走網路 */
const CACHE = 'workout-v2.10.0';
const SHELL = [
  './', './index.html', './css/app.css', './css/v2.css', './css/compact.css', './css/tone.css',
  './js/config.js', './js/schema.js', './js/seed.js', './js/data/exercises.js', './js/data/foods.js', './js/api.js', './js/charts.js',
  './js/core.js', './js/inbody.js', './js/weight.js', './js/training.js', './js/food.js', './js/review.js', './js/home.js', './js/main.js',
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

/* 用餐提醒推播：後端只在「這餐還沒記錄」時送出（無內容），這裡依台灣時間決定是哪一餐 */
self.addEventListener('push', (e) => {
  const now = new Date();
  const h = +new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Taipei' }).format(now);
  const wd = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Asia/Taipei' }).format(now);
  // 週日 20 點後的推播 = 每週回顧
  if (wd === 'Sun' && h >= 20) {
    e.waitUntil(self.registration.showNotification('本週回顧出爐了', {
      body: '體重變化、訓練次數、蛋白質達標天數，一頁看完，還能存成圖片。',
      icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'weekly-review',
      data: { url: './#/review' },
    }));
    return;
  }
  const meal = h < 11 ? '早餐' : h < 16 ? '午餐' : '晚餐';
  e.waitUntil(self.registration.showNotification(`記得記錄${meal}`, {
    body: `今天的${meal}還沒記錄，點這裡快速新增。`,
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: 'meal-' + meal,
    data: { url: './#/food/new?meal=' + encodeURIComponent(meal) },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './#/food', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) {
      if ('focus' in c) { c.navigate(url).catch(() => {}); return c.focus(); }
    }
    return self.clients.openWindow(url);
  }));
});
