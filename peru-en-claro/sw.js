/* Service worker de Contexto Perú.
   - La red manda: HTML, CSS, JS y datos se piden siempre con revalidación, así una publicación nueva se ve de inmediato.
   - Sin conexión se usa la última copia guardada (ignorando el ?v= de cada publicación), por lo que se conservan los últimos datos.
   - Al cambiar este archivo (o CACHE) el navegador instala la versión nueva, borra las copias viejas y recarga la página una vez. */
const CACHE = "cp-v10-hero-aprobado";
const BASE = ["./", "index.html", "assets/styles.css", "assets/visual.css", "assets/hero-peru-en-claro-aprobado.jpg", "assets/photos/noticias-congreso.jpg", "assets/photos/datos-bcrp.jpg", "assets/photos/nino-piura.jpg", "assets/app.js", "data/editorial.js", "data/noticias.js", "data/talleres.js", "manifest.webmanifest", "assets/icono-192.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => Promise.all(BASE.map(u => c.add(new Request(u, { cache: "reload" })).catch(() => {})))).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  e.respondWith(
    fetch(r, { cache: "no-cache" })
      .then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); } return res; })
      .catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || (r.mode === "navigate" ? caches.match("index.html", { ignoreSearch: true }) : Response.error())))
  );
});
