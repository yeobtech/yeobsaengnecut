// 오프라인에서도 열리도록 앱 파일을 기기에 보관하는 서비스 워커
// 앱을 고친 뒤에는 VERSION을 올려야 기기에 새 파일이 반영돼요.
const VERSION = "m4c-v13";
const CORE = [
  "./", "./index.html", "./ai.js", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png",
  "./fonts/PretendardVariable.woff2", "./fonts/Jua-Regular.woff2", "./fonts/Gaegu-Regular.woff2", "./fonts/Gaegu-Bold.woff2",
  "./fonts/NanumPenScript-Regular.woff2", "./fonts/BlackHanSans-Regular.woff2", "./fonts/DoHyeon-Regular.woff2",
  "./fonts/Pacifico-Regular.woff2", "./fonts/Caveat-Variable.woff2", "./fonts/Anton-Regular.woff2", "./fonts/GowunBatang-Regular.woff2", "./fonts/GowunBatang-Bold.woff2",
];
// AI 파일(수십 MB)은 처음 쓸 때 받아서 보관
const LAZY = /\/(vendor|models)\//;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("message", (e) => { if (e.data === "skipWaiting") self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  // 앱 화면은 새 버전을 먼저 시도하고, 안 되면 보관본
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(VERSION).then((c) => c.put("./index.html", copy)); return r; })
      .catch(() => caches.match("./index.html")));
    return;
  }
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => {
    if (r.ok && (LAZY.test(url.pathname) || CORE.some((p) => url.pathname.endsWith(p.slice(1))))) {
      const copy = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy));
    }
    return r;
  })));
});
