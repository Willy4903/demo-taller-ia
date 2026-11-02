/* Service worker: la red manda (para ver siempre las noticias nuevas) y la caché respalda sin conexión. */
const CACHE = "cp-v6";
const BASE = ["./", "index.html", "assets/styles.css", "assets/app.js", "data/editorial.js", "data/noticias.js", "data/talleres.js", "manifest.webmanifest", "assets/icono-192.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r, { cache: "no-cache" }).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); return res; }).catch(() => caches.match(r).then(m => m || caches.match("index.html"))));
});
