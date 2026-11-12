// Datos de OpenStreetMap: consultas a Overpass con respaldo, cauces locales y resultados de búsqueda.
import { dist } from './geo.js';
import { PRE } from './entorno.js';

// Categorías del buscador: palabras que las activan (re) y filtros de Overpass (f)
export var CATS = [
  { n: 'Restaurantes', e: '🍴', re: /restaur|comer|parrilla|pizzer/, f: ['["amenity"="restaurant"]'] },
  { n: 'Combustible', e: '⛽', re: /combustible|nafta|estacion de servicio|ypf|shell|axion|surtidor/, f: ['["amenity"="fuel"]'] },
  { n: 'Marinas y muelles', e: '⚓', re: /marina|muelle|guarderia|nautic|astillero/, f: ['["leisure"="marina"]', '["man_made"="pier"]', '["waterway"="boatyard"]'] },
  { n: 'Bares y cafés', e: '☕', re: /\bbar\b|bares|cafe|cerveza|\bpub\b/, f: ['["amenity"~"^(bar|pub|cafe)$"]'] },
  { n: 'Proveedurías', e: '🛒', re: /proveedur|supermercado|almacen|kiosco|mercado/, f: ['["shop"~"^(supermarket|convenience|general)$"]'] },
  { n: 'Alojamiento', e: '🏨', re: /hotel|aloja|cabana|hostel|camping|posada/, f: ['["tourism"~"^(hotel|guest_house|chalet|hostel|camp_site)$"]'] },
  { n: 'Salud', e: '➕', re: /farmacia|hospital|clinica|salud/, f: ['["amenity"~"^(pharmacy|hospital|clinic)$"]'] }
];

var KIND = {
  restaurant: 'Restaurante', fuel: 'Estación de servicio', cafe: 'Café', bar: 'Bar', pub: 'Bar',
  marina: 'Marina', pier: 'Muelle', boatyard: 'Guardería / astillero', supermarket: 'Supermercado',
  convenience: 'Proveeduría', general: 'Almacén', hotel: 'Hotel', guest_house: 'Alojamiento',
  chalet: 'Cabaña', hostel: 'Hostel', camp_site: 'Camping', pharmacy: 'Farmacia', hospital: 'Hospital', clinic: 'Clínica'
};
var WTR = { river: 'río', stream: 'arroyo', canal: 'canal', tidal_channel: 'canal de marea' };

function kindOf(t) {
  var k = t.amenity || t.leisure || t.tourism || t.shop || t.man_made || t.waterway || '';
  return KIND[k] || k || 'Lugar';
}

// ---------- Overpass con caché y servidores de respaldo ----------

var CACHE = {};
var EPS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
];

function hash(s) {
  var h = 5381;
  for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

// Guarda en el celular las últimas 10 respuestas (de hasta 300 KB)
function store(q, j) {
  try {
    var s = JSON.stringify(j);
    if (s.length > 300000) return;
    var k = PRE + 'delta_c_' + hash(q);
    var L = JSON.parse(localStorage.getItem(PRE + 'delta_cl') || '[]').filter(function (x) { return x !== k; });
    L.push(k);
    while (L.length > 10) localStorage.removeItem(L.shift());
    localStorage.setItem(k, s);
    localStorage.setItem(PRE + 'delta_cl', JSON.stringify(L));
  } catch (e) {}
}

// Consulta Overpass. Si un servidor falla o tarda más de 7 s, prueba el siguiente.
// onTry(i) avisa cuando arranca el servidor número i.
export function ovp(q, onTry) {
  if (CACHE[q]) return Promise.resolve(CACHE[q]);
  try {
    var c0 = localStorage.getItem(PRE + 'delta_c_' + hash(q));
    if (c0) { CACHE[q] = JSON.parse(c0); return Promise.resolve(CACHE[q]); }
  } catch (e) {}

  return new Promise(function (res, rej) {
    var done = false, fails = 0, started = {}, ctl = [], tm = [];
    function stop() {
      done = true;
      tm.forEach(clearTimeout);
      ctl.forEach(function (c) { try { c.abort(); } catch (e) {} });
    }
    function go(i) {
      if (done || i >= EPS.length || started[i]) return;
      started[i] = 1;
      var c = new AbortController();
      ctl.push(c);
      if (onTry) onTry(i);
      fetch(EPS[i], {
        method: 'POST', signal: c.signal,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(q)
      })
        .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(function (j) {
          if (!j || !j.elements || j.remark) throw new Error('incompleto');
          if (done) return;
          stop(); CACHE[q] = j; store(q, j); res(j);
        })
        .catch(function () {
          if (done) return;
          fails++;
          if (fails >= EPS.length) { stop(); rej(new Error('fail')); } else go(i + 1);
        });
    }
    go(0);
    tm.push(
      setTimeout(function () { go(1); }, 7000),
      setTimeout(function () { go(2); }, 14000),
      setTimeout(function () { if (!done) { stop(); rej(new Error('timeout')); } }, 45000)
    );
  });
}

// ---------- Cauces locales (cauces.json) ----------

var LOCAL = null;
export function local() { return LOCAL; }

// Carga cauces.json, saca tramos repetidos y avisa con el evento 'delta-local'
function loadLocal() {
  fetch('cauces.json')
    .then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .then(function (j) {
      var seen = {};
      LOCAL = (j && j.elements) ? j.elements.filter(function (x) {
        if (x.id == null) return true;
        if (seen[x.id]) return false;
        seen[x.id] = 1;
        return true;
      }) : null;
      window.dispatchEvent(new Event('delta-local'));
    })
    .catch(function () {});
}
loadLocal();

// Tramos de agua dentro de un rectángulo: del archivo local si está, si no de Overpass
export function waterEls(s, w, n, e, onTry) {
  if (LOCAL) return Promise.resolve(LOCAL.filter(function (x) {
    var g = x.geometry;
    if (!g) return false;
    for (var i = 0; i < g.length; i++) {
      var p = g[i];
      if (p && p.lat >= s && p.lat <= n && p.lon >= w && p.lon <= e) return true;
    }
    return false;
  }));
  var q = '[out:json][timeout:25];way["waterway"~"^(river|canal|stream|tidal_channel)$"](' +
    [s, w, n, e].map(function (x) { return x.toFixed(2); }).join(',') + ');out geom;';
  return ovp(q, onTry).then(function (j) { return j.elements || []; });
}

// ---------- Resultados de búsqueda ----------

// Convierte elementos de OSM en resultados. Los cauces con el mismo nombre se agrupan.
export function parseRes(els) {
  var out = [], by = {};
  els.forEach(function (e) {
    var tg = e.tags || {};
    if (e.type === 'way' && tg.waterway && e.geometry) {
      var nm = tg.name || 'Curso sin nombre', r = by[nm];
      if (!r) { r = by[nm] = { name: nm, kind: 'Curso de agua (' + (WTR[tg.waterway] || tg.waterway) + ')', lines: [], km: 0 }; out.push(r); }
      var g = e.geometry.map(function (p) { return { lat: p.lat, lng: p.lon }; });
      r.lines.push(g);
      for (var i = 1; i < g.length; i++) r.km += dist(g[i - 1], g[i]);
      return;
    }
    var p = e.type === 'node' ? { lat: e.lat, lng: e.lon }
      : e.center ? { lat: e.center.lat, lng: e.center.lon }
      : (e.geometry && e.geometry[0] ? { lat: e.geometry[0].lat, lng: e.geometry[0].lon } : null);
    if (p) out.push({ name: tg.name || kindOf(tg), kind: kindOf(tg), lat: p.lat, lng: p.lng, lines: null });
  });
  out.forEach(function (r, i) {
    r.i = i;
    if (r.lines) {
      var a = 0, b = 0, n = 0;
      r.lines.forEach(function (l) { l.forEach(function (p) { a += p.lat; b += p.lng; n++; }); });
      r.lat = a / n; r.lng = b / n;
    }
  });
  return out;
}

// Distancia en km desde ref hasta un resultado (para cauces, al punto más cercano del trazo)
export function dTo(r, ref) {
  if (!r.lines) return dist(ref, r);
  var b = 1e9;
  r.lines.forEach(function (l) {
    var st = Math.max(1, Math.floor(l.length / 20));
    for (var i = 0; i < l.length; i += st) { var x = dist(ref, l[i]); if (x < b) b = x; }
  });
  return b;
}
