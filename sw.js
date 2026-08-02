const CACHE = "crime-five-roads-v14";
const FILES = ["./", "./index.html", "./styles.css", "./manifest.webmanifest", "./src/app.mjs", "./src/engine.mjs", "./src/content.mjs", "./src/life-content.mjs", "./src/night-content.mjs", "./src/chapter-content.mjs"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(()=>caches.match(event.request).then(hit=>hit||caches.match(new URL(event.request.url).pathname.replace("/City_Life_Game/","./")))));
});
