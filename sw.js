const CACHE_NAME = 'album-copa-v5';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/animations.css',
  '/js/app.js',
  '/js/album.js',
  '/js/auth.js',
  '/js/collection.js',
  '/js/data.js',
  '/js/db.js',
  '/js/firebase-config.js',
  '/js/pack-opening.js',
  '/js/router.js',
  '/js/shop.js',
  '/js/trades.js',
  '/js/admin.js',
  '/manifest.json'
];

// Instala o SW, faz cache e já assume o controle imediatamente
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting(); // assume controle sem esperar
});

// Ativa, limpa caches antigos e notifica clientes
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estratégia: Network first, fallback para cache
self.addEventListener('fetch', event => {
  // Ignora requisições ao Firebase (sempre online)
  if (event.request.url.includes('firebase') || event.request.url.includes('firestore')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Atualiza o cache com a versão mais recente
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
