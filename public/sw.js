// Troque a versão sempre que mudar a estratégia de cache: o activate apaga os caches antigos.
const CACHE_NAME = 'chathub-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/favicon/android-chrome-192x192.png',
  '/favicon/android-chrome-512x512.png',
];

// Install - pré-cacheia o básico para funcionar offline
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate - limpa caches antigos (ex.: chathub-v1, que servia o frontend velho)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch - network-first: sempre busca a versão nova; o cache é só fallback offline.
// (A versão anterior era cache-first e prendia o navegador num frontend desatualizado.)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Só cuida do próprio site, e nunca da API nem dos módulos do Vite em dev
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/@') || url.pathname.startsWith('/src/') || url.pathname.startsWith('/node_modules/')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') return caches.match('/index.html');
        return Response.error();
      })
  );
});
