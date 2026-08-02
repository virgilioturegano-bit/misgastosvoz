/* Service worker de Gastos.
   Estrategia mixta a proposito:
   - La pagina (index.html) se pide primero a la red, con la copia local
     como respaldo. Asi una version nueva llega al abrir la app, y sin
     conexion sigue funcionando.
   - Los iconos y el manifiesto salen de la copia local, que no cambian.

   Al subir una version nueva, cambia el numero de CACHE. */
const CACHE = 'gastos-v2';
const FILES = ['./', './index.html', './manifest.webmanifest',
               './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const esPagina = e.request.mode === 'navigate' ||
                   e.request.destination === 'document' ||
                   e.request.url.endsWith('index.html');

  if (esPagina){
    // red primero: la version nueva entra en cuanto hay conexion
    e.respondWith(
      fetch(e.request).then(res => {
        const copia = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copia)).catch(() => {});
        return res;
      }).catch(() => caches.match(e.request).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // el resto: copia local primero
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copia = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copia)).catch(() => {});
      return res;
    }))
  );
});
