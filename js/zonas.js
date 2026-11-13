// Zonas de práctica deportiva de la Prefectura Naval (esquí y wakeboard, jet ski, vela, remo, etc.).
// Salen de zonas.json, que se armó a mano a partir de los croquis publicados por la Prefectura:
// https://www.argentina.gob.ar/prefecturanaval/deportesnauticos/referencia-mapa-practica-deportiva
// Las que siguen un río están pegadas al trazado de cauces.json; las marcadas "ap" son aproximadas.
import { px, dist } from './geo.js';

export var DEPORTES = {
  ski: { n: 'Esquí y wakeboard', e: '🎿', c: '#e03131' },
  jet: { n: 'Moto de agua / jet ski', e: '🛥️', c: '#111111' },
  moto: { n: 'Motonáutica', e: '🚤', c: '#8b5a2b' },
  vela: { n: 'Vela', e: '⛵', c: '#2f9e44' },
  wind: { n: 'Windsurf y kitesurf', e: '🪁', c: '#1c3fd8' },
  remo: { n: 'Remo y stand up paddle', e: '🚣', c: '#e6c300' },
  fondeo: { n: 'Fondeo', e: '⚓', c: '#8a8a8a' },
  fly: { n: 'Flyboard', e: '🌊', c: '#ff7a00' }
};

var Z = null, FUENTE = '';
export function zonas() { return Z; }
export function fuenteZonas() { return FUENTE; }

fetch('zonas.json')
  .then(function (r) { if (!r.ok) throw 0; return r.json(); })
  .then(function (j) {
    FUENTE = j.fuente || '';
    Z = (j.zonas || []).filter(function (z) { return DEPORTES[z.d] && z.p && z.p.length > 1; }).map(function (z, i) {
      var pts = z.p.map(function (p) { return { lat: p[0], lng: p[1] }; });
      var la = pts.map(function (p) { return p.lat; }), lo = pts.map(function (p) { return p.lng; });
      return { id: i, d: z.d, area: z.t === 'a', sec: z.s, ap: !!z.ap, pts: pts,
        bb: [Math.min.apply(null, la), Math.min.apply(null, lo), Math.max.apply(null, la), Math.max.apply(null, lo)] };
    });
    window.dispatchEvent(new Event('delta-zonas'));
  })
  .catch(function () {});

function dentro(p, pts) {
  var c = false;
  for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    var a = pts[i], b = pts[j];
    if ((a.lat > p.lat) !== (b.lat > p.lat) && p.lng < (b.lng - a.lng) * (p.lat - a.lat) / (b.lat - a.lat) + a.lng) c = !c;
  }
  return c;
}
function distSeg(q, a, b) {
  var dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy, t = L ? ((q.x - a.x) * dx + (q.y - a.y) * dy) / L : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(q.x - a.x - t * dx, q.y - a.y - t * dy);
}

// Zona tocada en el punto g (lat/lng) con zoom z: primero las líneas (a menos de 14 px), después las áreas
export function zonaEn(g, z) {
  if (!Z) return null;
  var q = px(g.lat, g.lng, z), best = null, bd = 14;
  Z.forEach(function (zn) {
    if (zn.area) return;
    var m = 0.01;
    if (g.lat < zn.bb[0] - m || g.lat > zn.bb[2] + m || g.lng < zn.bb[1] - m || g.lng > zn.bb[3] + m) return;
    for (var i = 1; i < zn.pts.length; i++) {
      var d = distSeg(q, px(zn.pts[i - 1].lat, zn.pts[i - 1].lng, z), px(zn.pts[i].lat, zn.pts[i].lng, z));
      if (d < bd) { bd = d; best = zn; }
    }
  });
  if (best) return best;
  for (var k = 0; k < Z.length; k++) { var a = Z[k]; if (a.area && dentro(g, a.pts)) return a; }
  return null;
}

// Largo de una zona en km (para las líneas)
export function largo(zn) {
  var s = 0; for (var i = 1; i < zn.pts.length; i++) s += dist(zn.pts[i - 1], zn.pts[i]); return s;
}
