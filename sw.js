const CACHE = "crime-five-roads-v11";
const FILES = ["./", "./index.html", "./styles.css", "./manifest.webmanifest", "./src/app.mjs", "./src/engine.mjs", "./src/content.mjs", "./src/life-content.mjs", "./src/night-content.mjs", "./src/chapter-content.mjs"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  })));
});
