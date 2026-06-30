const CACHE = 'capula-2026-v8';
const PRECACHE = ['/', '/consulta', '/offline.html'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // No cachear: mutaciones, API propia, Supabase
  if (
    e.request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.hostname.endsWith('.supabase.co')
  ) return;

  // Páginas HTML: network-first; fallback a caché o a /offline.html
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(e.request).then((cached) => cached || caches.match('/offline.html'))
        )
    );
    return;
  }

  // Assets estáticos: cache-first con actualización en background
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      });
      return cached || network;
    })
  );
});

// Background Sync: el navegador llama a este evento cuando recupera conexión,
// incluso si la pestaña estaba cerrada. Notificamos a todos los clientes abiertos
// para que drenen la cola de solicitudes pendientes.
self.addEventListener('sync', (e) => {
  if (e.tag === 'drain-queue') {
    e.waitUntil(
      self.clients
        .matchAll({ includeUncontrolled: true, type: 'window' })
        .then((clients) => clients.forEach((c) => c.postMessage({ type: 'drain-queue' })))
    );
  }
});
