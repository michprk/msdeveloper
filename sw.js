// Service worker : l'application fonctionne hors ligne.
// Changer VERSION à chaque mise en ligne pour proposer la mise à jour.
const VERSION = 'msdev-1.0.0';
const FILES = [
  './', 'index.html', 'manifest.webmanifest',
  'assets/css/app.css',
  'assets/fonts/fraunces-normal-300-700-latin.woff2', 'assets/fonts/instrument-sans-400-700-latin.woff2',
  'assets/js/theme.js', 'assets/js/app.js', 'assets/js/store.js', 'assets/js/ui.js', 'assets/js/icons.js', 'assets/js/charts.js',
  'assets/js/data/sectors.js', 'assets/js/data/scripts.js', 'assets/js/data/guides.js', 'assets/js/data/demo.js',
  'assets/js/views/common.js', 'assets/js/views/home.js', 'assets/js/views/scripts.js', 'assets/js/views/call.js',
  'assets/js/views/crm.js', 'assets/js/views/agenda.js', 'assets/js/views/tools.js', 'assets/js/views/tools2.js', 'assets/js/views/pages.js',
  'icons/favicon.svg', 'icons/favicon-32.png', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => { if (e.data === 'skip') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    // Page : réseau d'abord, copie en cache si hors ligne.
    e.respondWith(fetch(req).then((r) => { const copy = r.clone(); caches.open(VERSION).then((c) => c.put('index.html', copy)); return r; })
      .catch(() => caches.match('index.html')));
    return;
  }
  // Fichiers : cache d'abord (versionné), réseau sinon.
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((r) => {
    if (r.ok) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return r;
  })));
});
