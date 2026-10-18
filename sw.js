// Service worker : l'application fonctionne hors ligne.
// Changer VERSION à chaque mise en ligne pour proposer la mise à jour.
const VERSION = 'msdev-1.9.1';
const AI_CACHE = 'mv-ai-transformers-3.8.1';
const FILES = [
  './', 'index.html', 'manifest.webmanifest',
  'assets/css/app.css',
  'assets/fonts/fraunces-normal-300-700-latin.woff2', 'assets/fonts/instrument-sans-400-700-latin.woff2', 'assets/fonts/caveat-400-700-latin.woff2', 'assets/fonts/playwrite-fr-moderne-100-400.woff2', 'assets/fonts/playpen-sans-100-800-latin.woff2',
  'assets/js/theme.js', 'assets/js/app.js', 'assets/js/notify.js', 'assets/js/lock.js', 'assets/js/store.js', 'assets/js/ui.js', 'assets/js/icons.js', 'assets/js/charts.js', 'assets/js/payments.js',
  'assets/js/data/sectors.js', 'assets/js/data/scripts.js', 'assets/js/data/guides.js', 'assets/js/data/demo.js', 'assets/js/data/sector-plus.js', 'assets/js/data/script-plus.js', 'assets/js/data/situations.js', 'assets/js/data/presets.js', 'assets/js/data/templates.js', 'assets/js/data/quizzes.js', 'assets/js/data/sample.js',
  'assets/js/views/common.js', 'assets/js/views/home.js', 'assets/js/views/scripts.js', 'assets/js/views/call.js',
  'assets/js/views/crm.js', 'assets/js/views/agenda.js', 'assets/js/views/tools.js', 'assets/js/views/tools2.js', 'assets/js/views/pages.js', 'assets/js/views/onboarding.js', 'assets/js/views/flowers.js', 'assets/js/views/tasks.js', 'assets/js/views/notes.js', 'assets/js/views/quiz.js', 'assets/js/views/billing.js', 'assets/js/views/search.js', 'assets/js/views/overview.js', 'assets/js/views/projects.js', 'assets/js/views/quotes.js', 'assets/js/views/notifications.js', 'assets/js/views/connect.js', 'assets/js/views/privacy.js', 'assets/js/views/account.js', 'assets/js/auth.js', 'assets/js/cloud.js', 'assets/js/config.js', 'assets/js/billing-check.js', 'assets/js/draw.js', 'assets/js/rich.js', 'assets/js/views/studies.js', 'assets/js/views/boards.js', 'assets/js/hwr.js', 'assets/js/hwr-worker.js', 'assets/js/hwr-fix.js',
  'assets/img/fleur-1.webp', 'assets/img/fleur-2.webp', 'assets/img/fleur-3.webp', 'assets/img/fleur-4.webp', 'assets/img/hero-mac.webp', 'assets/img/hero-phone.webp',
  'icons/favicon-32.png', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
];

// La nouvelle version prend la main tout de suite : l'application ouverte se recharge seule.
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)));
});
self.addEventListener('activate', (e) => {
  // Seules les anciennes versions de l'app sont effacées : le moteur et le modèle de lecture restent installés
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('msdev-') && k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
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
  const path = new URL(req.url).pathname;
  // Modèle de lecture de l'écriture : gardé par sa propre bibliothèque (cache permanent), pas en double ici
  if (path.includes('/assets/models/')) return;
  // Moteur d'exécution du modèle (22 Mo) : cache permanent, indépendant des versions de l'app
  if (path.includes('/assets/js/vendor/')) {
    e.respondWith(caches.open(AI_CACHE).then((c) => c.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; }))));
    return;
  }
  // Fichiers : cache d'abord (versionné), réseau sinon.
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((r) => {
    if (r.ok) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return r;
  })));
});

// Un clic sur une notification ouvre l'application au bon endroit.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL('./' + (e.notification.data?.url || '#/agenda'), self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const c = list.find((w) => w.url.startsWith(self.registration.scope));
    if (c) { c.navigate(url).catch(() => {}); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
