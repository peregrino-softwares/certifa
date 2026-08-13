/* Service worker — network-first com fallback para cache.
   Assim o usuario sempre recebe a versao mais nova do banco de questoes
   quando esta online, e continua funcionando offline quando nao esta.
   Ao publicar uma alteracao, suba o numero de CACHE. */
var CACHE = 'certifa-41065944db';
var ASSETS = [
  './',
  'index.html',
  'assets/css/app.css?v=41065944db',
  'assets/js/i18n.js?v=41065944db',
  'assets/js/store.js?v=41065944db',
  'assets/js/access.js?v=41065944db',
  'assets/js/calc.js?v=41065944db',
  'assets/js/engine.js?v=41065944db',
  'assets/js/app.js?v=41065944db',
  'data/questions.enc.js?v=41065944db',
  'data/demo.js?v=41065944db',
  'data/licencas.js?v=41065944db',
  'data/pix.js?v=41065944db',
  'assets/img/favicon.svg',
  'assets/img/icon-192.png',
  'assets/img/icon-512.png',
  'manifest.webmanifest'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ASSETS); })
      .catch(function () { /* offline na primeira visita: segue sem pre-cache */ })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return; // nunca intercepta os PDFs da FIFA

  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.status === 200 && res.type === 'basic') {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        return hit || caches.match('index.html');
      });
    })
  );
});
