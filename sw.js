/* Palaestra Latina: funciona sin conexión después de la primera visita. */
const CACHE = 'palaestra-v2';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const store = (req, res) => { if (res && (res.ok || res.type === 'opaque')) caches.open(CACHE).then(c => c.put(req, res.clone())); return res; };

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* Tipografías: primero la copia guardada. */
  if (FONT_HOSTS.includes(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => store(req, res))));
    return;
  }
  if (url.origin !== self.location.origin) return;

  /* La app: primero la red (para recibir actualizaciones); si no responde en 4 s o no hay conexión, la copia guardada. */
  const cached = () => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('index.html'));
  e.respondWith(new Promise(resolve => {
    const timer = setTimeout(() => cached().then(hit => hit && resolve(hit)), 4000);
    fetch(req).then(res => { clearTimeout(timer); resolve(store(req, res)); })
      .catch(() => { clearTimeout(timer); cached().then(hit => resolve(hit || Response.error())); });
  }));
});
