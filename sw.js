// Service worker de Mapa del Delta: guarda la app, los cauces y los mosaicos
// que ya viste para que funcione sin señal.
// Al cambiar index.html o cauces.json, subí el número de VERSION.
var VERSION = 'v1';
var APP = 'delta-app-' + VERSION;
var TILES = 'delta-tiles';
var MAX_TILES = 4000; // ~60-100 MB según la zona

var PRECACHE = [
  './',
  './index.html',
  './cauces.json',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js',
  'https://cdn.jsdelivr.net/npm/htm@3.1.1/dist/htm.umd.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(APP).then(function (c) {
    return Promise.all(PRECACHE.map(function (u) {
      return fetch(u, { cache: 'reload' }).then(function (r) { if (r.ok) return c.put(u, r); }).catch(function () {});
    }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('delta-app-') === 0 && k !== APP; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function isTile(u) {
  return u.hostname === 'tile.openstreetmap.org' || u.hostname === 'server.arcgisonline.com';
}

var trimming = false, added = 0;
function trimTiles() {
  if (trimming) return;
  trimming = true;
  caches.open(TILES).then(function (c) {
    return c.keys().then(function (ks) {
      var extra = ks.length - MAX_TILES;
      return Promise.all(ks.slice(0, Math.max(0, extra)).map(function (k) { return c.delete(k); }));
    });
  }).catch(function () {}).then(function () { trimming = false; });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return; // Overpass usa POST: va directo a la red
  var u = new URL(req.url);

  // Mosaicos del mapa: primero la caché, si no está, la red (y se guarda)
  if (isTile(u)) {
    e.respondWith(caches.open(TILES).then(function (c) {
      return c.match(req).then(function (hit) {
        if (hit) return hit;
        return fetch(req).then(function (r) {
          if (r.ok) { c.put(req, r.clone()); if (++added % 100 === 0) trimTiles(); }
          return r;
        });
      });
    }));
    return;
  }

  // La página: primero la red (para recibir actualizaciones), si no hay señal, la copia guardada
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(function (r) {
      if (r.ok) { var cp = r.clone(); caches.open(APP).then(function (c) { c.put('./index.html', cp); }); }
      return r;
    }).catch(function () {
      return caches.match('./index.html', { ignoreSearch: true });
    }));
    return;
  }

  // Archivos de la app, librerías y cauces: la copia guardada al instante y se refresca de fondo
  var mine = u.origin === self.location.origin;
  var cdn = u.hostname === 'cdnjs.cloudflare.com' || u.hostname === 'cdn.jsdelivr.net';
  if (mine || cdn) {
    e.respondWith(caches.open(APP).then(function (c) {
      return c.match(req, { ignoreSearch: true }).then(function (hit) {
        var net = fetch(req).then(function (r) { if (r.ok) c.put(req, r.clone()); return r; });
        if (hit) { e.waitUntil(net.catch(function () {})); return hit; }
        return net;
      });
    }));
  }
  // Clima y demás: van directo a la red
});
