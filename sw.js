/* Cachea la app y sus librerías para que abra sin señal en la ruta. */
const CACHE = "peregrinacion-v1";
const BASE = [
  "./", "./index.html", "./pulseras.html", "./manifest.json",
  "https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js",
  "https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js",
];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // Una URL caída no debe tumbar la instalación entera.
    await Promise.all(BASE.map(u => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const url = e.request.url;
  if (e.request.method !== "GET") return;
  // El tráfico de Firestore nunca se cachea: siempre tiene que ir a la red.
  if (url.includes("firestore.googleapis.com") || url.includes("google.firestore")) return;

  e.respondWith((async () => {
    const hit = await caches.match(e.request);
    if (hit){
      // Refresco en segundo plano, sin bloquear la respuesta.
      e.waitUntil(fetch(e.request).then(r => r.ok && caches.open(CACHE).then(c => c.put(e.request, r))).catch(() => {}));
      return hit;
    }
    try{
      const r = await fetch(e.request);
      if (r.ok) (await caches.open(CACHE)).put(e.request, r.clone());
      return r;
    }catch(err){
      const fallback = await caches.match("./index.html");
      if (fallback) return fallback;
      throw err;
    }
  })());
});
