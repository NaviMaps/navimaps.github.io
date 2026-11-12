// Ruta por agua: camino más corto (Dijkstra) sobre los cauces de OpenStreetMap.
import { dist, norm } from './geo.js';

// Prioridad de cauces. Multiplicadores de "costo" para canales de marea (t), canales (c) y arroyos (s).
export var PREFS = [
  { n: 'Directa', t: 1, c: 1, s: 1 },
  { n: 'Equilibrada', t: 1.2, c: 1.5, s: 2.5 },
  { n: 'Ríos primero', t: 1.4, c: 2, s: 5 }
];

// Costo por km de un cauce según su tipo, nombre y etiquetas
function peso(tg, K) {
  var t = tg.waterway, nm = norm(tg.name || '');
  var b = t === 'river' ? 1 : t === 'tidal_channel' ? K.t : t === 'canal' ? K.c : K.s;
  if (/^rio\b/.test(nm)) b = 1;
  else if (/^arroyo\b/.test(nm)) b = Math.max(b, K.s);
  else if (/^canal\b/.test(nm)) b = Math.max(b, K.c);
  if (tg.intermittent === 'yes' || tg.seasonal === 'yes') b *= 3;
  if (tg.boat === 'no' || tg.motorboat === 'no') b *= 6;
  else if (tg.boat === 'yes' || tg.motorboat === 'yes') b *= 0.8;
  return b;
}

// els: tramos de OSM con geometría; A y B: {lat, lng}; K: una de PREFS
export function solve(els, A, B, K) {
  K = K || PREFS[2];

  // Grafo: nodos de OSM (P) y vecinos con [id, costo, km] (adj)
  var P = {}, adj = {};
  els.forEach(function (w) {
    var g = w.geometry, ns = w.nodes;
    if (!g || !ns) return;
    for (var i = 0; i < ns.length; i++) {
      var id = ns[i];
      if (!g[i]) continue;
      if (!P[id]) { P[id] = { lat: g[i].lat, lng: g[i].lon }; adj[id] = []; }
      if (i > 0 && P[ns[i - 1]]) {
        var u = ns[i - 1], d = dist(P[u], P[id]), c = d * peso(w.tags || {}, K);
        adj[u].push([id, c, d]);
        adj[id].push([u, c, d]);
      }
    }
  });

  var ids = Object.keys(P);
  if (!ids.length) return { ok: false, msg: 'No hay cauces mapeados en esta zona' };

  function cercano(p) {
    var best = null, bd = 1e9;
    ids.forEach(function (k) { var x = dist(p, P[k]); if (x < bd) { bd = x; best = k; } });
    return { id: best, d: bd };
  }
  var a = cercano(A), b = cercano(B);
  if (a.d > 2 || b.d > 2) return { ok: false, msg: 'Tu posición o el destino están a más de 2 km de un cauce mapeado' };

  // Cola de prioridad (montículo binario) de [costo, id]
  var H = [];
  function push(x) {
    H.push(x);
    var i = H.length - 1;
    while (i > 0) { var p = (i - 1) >> 1; if (H[p][0] <= H[i][0]) break; var t = H[p]; H[p] = H[i]; H[i] = t; i = p; }
  }
  function pop() {
    var top = H[0], last = H.pop();
    if (H.length) {
      H[0] = last;
      var i = 0;
      for (;;) {
        var l = 2 * i + 1, r = l + 1, s = i;
        if (l < H.length && H[l][0] < H[s][0]) s = l;
        if (r < H.length && H[r][0] < H[s][0]) s = r;
        if (s === i) break;
        var t = H[s]; H[s] = H[i]; H[i] = t; i = s;
      }
    }
    return top;
  }

  // Dijkstra: costo (dd), km reales (rd) y nodo anterior (prev)
  var dd = {}, rd = {}, prev = {}, done = {};
  dd[a.id] = 0; rd[a.id] = 0; push([0, a.id]);
  while (H.length) {
    var cur = pop(), u = cur[1];
    if (done[u]) continue;
    done[u] = 1;
    if (u === b.id) break;
    adj[u].forEach(function (e) {
      var v = e[0], nd = cur[0] + e[1];
      if (dd[v] === undefined || nd < dd[v]) { dd[v] = nd; rd[v] = rd[u] + e[2]; prev[v] = u; push([nd, v]); }
    });
  }
  if (dd[b.id] === undefined) return { ok: false, msg: 'No encontré un camino continuo por los cauces mapeados' };

  var path = [], k = b.id;
  while (k !== undefined) { path.push(P[k]); k = prev[k]; }
  path.reverse();
  return { ok: true, pts: [A].concat(path, [B]), km: rd[b.id] + a.d + b.d };
}
