const CACHE = "crime-five-roads-v49";
const FILES = [
  "./", "./index.html", "./play.html", "./styles.css", "./manifest.webmanifest", "./dist/game.bundle.js",
  "./assets/icons/icon-192.png", "./assets/icons/icon-512.png", "./assets/icons/icon-maskable-512.png", "./assets/icons/apple-touch-icon.png", "./assets/icons/favicon-32.png",
  "./assets/images/hero-harbor-desktop.webp", "./assets/images/hero-harbor-mobile.webp", "./assets/images/characters/difei-full.webp", "./assets/images/characters/difei-portrait-v2.webp", "./assets/images/characters/difei-assistant-cutout.png", "./assets/images/difei-spar-mobile-v2.webp",
  "./assets/images/animations/difei/shoot-ready.webp", "./assets/images/animations/difei/shoot-fire.webp", "./assets/images/animations/difei/shoot-recoil.webp",
  "./assets/images/animations/difei/brawl-guard.webp", "./assets/images/animations/difei/brawl-jab.webp", "./assets/images/animations/difei/brawl-chamber.webp", "./assets/images/animations/difei/brawl-kick.webp",
  ...["chenglan", "steel_jaw", "grey_fox", "ghost", "spark", "dove", "eagle_eye", "counsel", "ledger"].map(id => `./assets/images/animations/team/${id}-support.webp`),
  ...["bruiser", "gunner", "heavy", "tech"].flatMap(id => ["ready", "action", "hit", "exit"].map(frame => `./assets/images/animations/enemy/${id}-${frame}.webp`)),
  ...["azhe", "mira", "kael", "zero", "difei", "chenglan"].map(id => `./assets/images/characters/${id}.webp`),
  ...["signal", "runner", "ch1-burner", "checkpoint", "ambush", "vault", "ch3-escape", "ch3-container", "ch3-broadcast", "ch4-election", "ch4-betrayal", "ch4-truth", "ch5-siege", "ch5-tower", "ch5-finale"].flatMap(id => ["desktop", "mobile"].map(mode => `./assets/images/event-${id}-${mode}.webp`)),
  ...["spar", "media", "interview"].flatMap(id => ["desktop", "mobile"].map(mode => `./assets/images/difei-${id}-${mode}.webp`)),
  ...["character", "crime", "city"].flatMap(id => ["desktop", "mobile"].map(mode => `./assets/images/sidequest-${id}-${mode}.webp`)),
  ...["steel_jaw", "grey_fox", "ghost", "spark", "dove", "eagle_eye", "counsel", "ledger"].map(id => `./assets/images/team/${id}.webp`),
  ...["south_docks", "fish_market", "east_chop_shop", "overpass_toll", "neon_strip", "north_tenements", "river_casino", "chip_logistics", "finance_tower", "west_rail_yard", "construction_depot", "pirate_station", "relay_tower", "marina_club", "cruise_terminal"].map(id => `./assets/images/territories/${id}.webp`)
];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  if (event.request.destination === "image") {
    event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request).then(async response => {
      if (!response.ok) return response;
      try {
        const copy = response.clone();
        const cache = await caches.open(CACHE);
        await cache.put(event.request, copy);
      } catch {
        // Runtime image caching is best-effort; keep the successful network response.
      }
      return response;
    })));
    return;
  }
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then(hit => hit
    || caches.match(new URL(event.request.url).pathname.replace("/City_Life_Game/", "./")))));
});
