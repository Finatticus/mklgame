// 每次發佈新版前端時把版本號 +1，舊快取會在啟用時自動清除
const VERSION = "vocab-v1.2.0";
const APP_FILES = [
    "./", "./index.html", "./manifest.json", "./css/style.css",
    "./js/config.js", "./js/utils.js", "./js/api.js", "./js/store.js", "./js/services.js",
    "./js/words.js", "./js/srs.js", "./js/dict.js", "./js/reader.js", "./js/games.js",
    "./js/io.js", "./js/app.js", "./js/practice.js",
    "./js/classroom/verbs.js", "./js/classroom/sounds.js", "./js/classroom/lessons-a0.js", "./js/classroom/lessons-a1.js",
    "./js/classroom/lessons-a2.js", "./js/classroom/lessons-b1.js", "./js/classroom/lessons-en.js",
    "./js/classroom/grammar-fr.js", "./js/classroom/grammar-en.js", "./js/classroom/wordbank-fr.js", "./js/classroom/wordbank-en.js",
    "./js/classroom/classroom.js",
    "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-180.png", "./icons/icon-32.png"
];
const CDN_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com", "cdnjs.cloudflare.com", "cdn.jsdelivr.net"];

self.addEventListener("install", (event) => {
    event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(APP_FILES)));
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            // 同網域還有其他 App，只刪這個 App 自己（含舊版 vp-）的快取
            .then(keys => Promise.all(keys.filter(k => k !== VERSION && (k.startsWith("vocab-") || k.startsWith("vp-"))).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("message", (event) => {
    if (event.data === "skipWaiting") self.skipWaiting();
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    event.waitUntil(self.clients.matchAll({ type: "window" }).then(list => {
        if (list.length) return list[0].focus();
        return self.clients.openWindow("./index.html");
    }));
});

self.addEventListener("fetch", (event) => {
    const req = event.request;
    if (req.method !== "GET") return;
    const url = new URL(req.url);

    // 自己的檔案：網路優先，拿到就更新快取；離線時用快取
    if (url.origin === self.location.origin) {
        event.respondWith(
            fetch(req).then(res => {
                if (res.ok) {
                    const copy = res.clone();
                    caches.open(VERSION).then(c => c.put(req, copy));
                }
                return res;
            }).catch(() => caches.match(req).then(hit => hit || caches.match("./index.html")))
        );
        return;
    }

    // 字型、圖示等 CDN：快取優先
    if (CDN_HOSTS.includes(url.hostname)) {
        event.respondWith(
            caches.match(req).then(hit => hit || fetch(req).then(res => {
                if (res.ok || res.type === "opaque") {
                    const copy = res.clone();
                    caches.open(VERSION).then(c => c.put(req, copy));
                }
                return res;
            }))
        );
    }
    // 其他（GAS、翻譯、字典 API）不經過快取
});
