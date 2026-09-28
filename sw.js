/* ASTRAEUS service worker — offline-first app shell, runtime-cached art. */
const VERSION = 'astraeus-v3';
const CORE = [
  './',
  'index.html',
  'manifest.json',
  'css/styles.css',
  'fonts/fonts.css',
  'fonts/Alegreya-400.woff2',
  'fonts/Alegreya-500.woff2',
  'fonts/Alegreya-700.woff2',
  'fonts/AlegreyaSans-400.woff2',
  'fonts/AlegreyaSans-500.woff2',
  'fonts/AlegreyaSans-700.woff2',
  'js/vendor/astronomy.browser.js',
  'js/bazi.js',
  'js/app.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'art/bg-hero.svg',
  'art/bg-divider.svg',
  'art/element-wood.svg',
  'art/element-fire.svg',
  'art/element-earth.svg',
  'art/element-metal.svg',
  'art/element-water.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Only handle same-origin GET requests; Nominatim + anything else passes through.
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: false }).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        // Runtime-cache art + icons for offline use.
        if (res.ok && /\.(svg|png|woff2|css|js)$/.test(url.pathname)) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match('index.html'));
    })
  );
});
