// Alturas del río: lee alturas.json, que arma GitHub cada 30 minutos con datos del INA y del SHN
// (ver scripts/alturas.py). Lo vuelve a pedir cada 10 minutos y al volver a la app.
// Avisa con el evento 'delta-alturas' cuando hay datos nuevos.
import { dist } from './geo.js';

var DATA = null;
export function alturas() { return DATA; }

function cargar() {
  fetch('alturas.json', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .then(function (j) {
      if (!j || !Array.isArray(j.estaciones)) return;
      j.estaciones.forEach(function (e) {
        e.obs = (e.obs || []).map(function (o) { return { t: new Date(o[0]), v: o[1] }; });
        e.fc = (e.fc || []).map(function (o) { return { t: new Date(o[0]), v: o[1] }; });
      });
      DATA = j;
      window.dispatchEvent(new Event('delta-alturas'));
    })
    .catch(function () {});
}
cargar();
setInterval(cargar, 600000);
document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') cargar(); });

var HORA = 3600000;

export function ultimo(e) { return e && e.obs.length ? e.obs[e.obs.length - 1] : null; }

// ¿El último dato es de las últimas 6 horas? (las escalas de Prefectura se leen una vez por día)
export function fresca(e) { var u = ultimo(e); return !!u && Date.now() - u.t < 6 * HORA; }

// Tendencia de la última hora y media: '↑' sube, '↓' baja, '→' quieto, '' sin datos suficientes
export function tendencia(e) {
  var u = ultimo(e); if (!u) return '';
  var antes = null;
  for (var i = e.obs.length - 2; i >= 0; i--) { if (u.t - e.obs[i].t >= 50 * 60000) { antes = e.obs[i]; break; } }
  if (!antes || u.t - antes.t > 3 * HORA) return '';
  var d = u.v - antes.v;
  return d > 0.03 ? '↑' : d < -0.03 ? '↓' : '→';
}

// Estado según los niveles del INA para esa estación
export function estado(e, v) {
  if (v == null) return { n: 'Sin datos', c: 'var(--muted)' };
  if (e.evac != null && v >= e.evac) return { n: 'Evacuación', c: '#c92a2a' };
  if (e.alerta != null && v >= e.alerta) return { n: 'Alerta', c: '#e8590c' };
  if (e.bajas != null && v <= e.bajas) return { n: 'Aguas bajas', c: '#e8a317' };
  return { n: 'Normal', c: '#2e9e5b' };
}

export function hace(t) {
  var m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'recién';
  if (m < 60) return 'hace ' + m + ' min';
  var h = Math.round(m / 60);
  if (h < 36) return 'hace ' + h + ' h';
  return 'hace ' + Math.round(h / 24) + ' días';
}

export function metros(v) { return v == null ? '–' : v.toFixed(2).replace('.', ',') + ' m'; }

export function hora(t) {
  return t.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
}
export function dia(t) {
  var hoy = new Date(), man = new Date(Date.now() + 86400000);
  if (t.toDateString() === hoy.toDateString()) return 'hoy';
  if (t.toDateString() === man.toDateString()) return 'mañana';
  return t.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' });
}

// Estación más cercana a ref; prefiere las que tienen datos de las últimas horas
export function cercana(ref) {
  if (!DATA || !ref) return null;
  var best = null, bd = 1e9, bestF = null, bdF = 1e9;
  DATA.estaciones.forEach(function (e) {
    if (e.lat == null || !e.obs.length) return;
    var d = dist(ref, e);
    if (d < bd) { bd = d; best = e; }
    if (fresca(e) && d < bdF) { bdF = d; bestF = e; }
  });
  return bestF && bdF < bd + 15 ? bestF : best;
}

// Próximas pleamares y bajamares del SHN (horas de Argentina) que todavía no pasaron
export function mareas() {
  var s = DATA && DATA.shn;
  if (!s || !s.san_fernando) return [];
  return s.san_fernando.map(function (m) { return { tipo: m.tipo, t: new Date(m.t + ':00-03:00'), h: m.h }; })
    .filter(function (m) { return m.t > Date.now() - HORA; });
}

// Gráfico: últimas 24 h medidas (línea llena) y el pronóstico (punteada), con las líneas de alerta y aguas bajas.
// Devuelve un SVG armado con la función html de htm.
export function grafico(html, e, W, H) {
  var ahora = Date.now(), t0 = ahora - 24 * HORA;
  var obs = e.obs.filter(function (o) { return o.t >= t0; });
  var fc = e.fc.filter(function (o) { return o.t >= (obs.length ? obs[obs.length - 1].t : ahora - 3 * HORA); });
  var t1 = fc.length ? fc[fc.length - 1].t.getTime() : ahora + 2 * HORA;
  if (obs.length < 2 && !fc.length) return null;
  var vals = obs.concat(fc).map(function (o) { return o.v; });
  var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
  [e.alerta, e.bajas].forEach(function (x) { if (x != null && x < hi + 1.2 && x > lo - 1.2) { lo = Math.min(lo, x); hi = Math.max(hi, x); } });
  lo = Math.floor((lo - 0.1) * 2) / 2; hi = Math.ceil((hi + 0.1) * 2) / 2;
  var L = 30, R = 6, T = 8, B = 20, w = W - L - R, h = H - T - B;
  function X(t) { return L + (t - t0) / (t1 - t0) * w; }
  function Y(v) { return T + (hi - v) / (hi - lo) * h; }
  function path(a) { return a.map(function (o, i) { return (i ? 'L' : 'M') + X(o.t).toFixed(1) + ' ' + Y(o.v).toFixed(1); }).join(''); }
  var ys = []; for (var v = lo; v <= hi + 1e-9; v += (hi - lo > 3 ? 1 : 0.5)) ys.push(v);
  var dias = []; var d = new Date(t0); d.setHours(24, 0, 0, 0);
  for (; d.getTime() < t1; d = new Date(d.getTime() + 86400000)) dias.push(new Date(d));
  function linea(x, col, txt) {
    if (x == null || x < lo || x > hi) return null;
    return html`<g><line x1=${L} x2=${L + w} y1=${Y(x)} y2=${Y(x)} stroke=${col} stroke-width="1" stroke-dasharray="4 3" /><text x=${L + w - 2} y=${Y(x) - 3} text-anchor="end" font-size="9" fill=${col}>${txt}</text></g>`;
  }
  return html`<svg viewBox=${'0 0 ' + W + ' ' + H} width="100%" style=${{ display: 'block' }} role="img" aria-label="Gráfico de altura del río">
    ${ys.map(function (v) { return html`<g key=${'y' + v}><line x1=${L} x2=${L + w} y1=${Y(v)} y2=${Y(v)} stroke="var(--grid)" stroke-width="1" /><text x=${L - 4} y=${Y(v) + 3} text-anchor="end" font-size="9" fill="var(--muted)">${v.toFixed(1).replace('.', ',')}</text></g>`; })}
    ${dias.map(function (x) { return html`<g key=${'d' + x.getTime()}><line x1=${X(x)} x2=${X(x)} y1=${T} y2=${T + h} stroke="var(--grid)" stroke-width="1" /><text x=${X(x) + 3} y=${H - 6} font-size="9" fill="var(--muted)">${x.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' })}</text></g>`; })}
    ${linea(e.alerta, '#e8590c', 'alerta')}
    ${linea(e.bajas, '#e8a317', 'aguas bajas')}
    <line x1=${X(ahora)} x2=${X(ahora)} y1=${T} y2=${T + h} stroke="var(--fg)" stroke-width="1" opacity=".5" />
    <text x=${X(ahora) + 3} y=${T + 9} font-size="9" fill="var(--muted)">ahora</text>
    ${fc.length ? html`<path d=${path(fc)} fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="5 4" opacity=".8" />` : null}
    ${obs.length > 1 ? html`<path d=${path(obs)} fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" />` : null}
  </svg>`;
}
