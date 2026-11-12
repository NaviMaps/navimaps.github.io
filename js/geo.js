// Geometría y formatos: proyección del mapa, distancias, rumbos y textos.

export var DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];

// Escalas "lindas" para la barra de escala, en metros
export var NICE = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];

// Ancho del mundo en píxeles para un nivel de zoom (proyección Web Mercator)
export function W(z) { return 256 * Math.pow(2, z); }

// Latitud/longitud → píxel del mundo
export function px(lat, lng, z) {
  var w = W(z), s = Math.sin(lat * Math.PI / 180);
  return { x: (lng + 180) / 360 * w, y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * w };
}

// Píxel del mundo → latitud/longitud
export function ll(x, y, z) {
  var w = W(z), n = Math.PI - 2 * Math.PI * y / w;
  return { lat: 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))), lng: x / w * 360 - 180 };
}

// Distancia en km entre dos puntos {lat, lng} (fórmula de haversine)
export function dist(a, b) {
  var R = 6371, t = Math.PI / 180, dl = (b.lat - a.lat) * t, dn = (b.lng - a.lng) * t;
  var x = Math.sin(dl / 2) * Math.sin(dl / 2) + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dn / 2) * Math.sin(dn / 2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

// Rumbo en grados (0 = norte) de a hacia b
export function bearing(a, b) {
  var t = Math.PI / 180;
  var y = Math.sin((b.lng - a.lng) * t) * Math.cos(b.lat * t);
  var x = Math.cos(a.lat * t) * Math.sin(b.lat * t) - Math.sin(a.lat * t) * Math.cos(b.lat * t) * Math.cos((b.lng - a.lng) * t);
  return (Math.atan2(y, x) / t + 360) % 360;
}

// Minúsculas y sin tildes, para comparar nombres
export function norm(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

// Expresión regular que acepta el texto con o sin tildes (para Overpass)
export function flex(s) {
  return norm(s).replace(/[^a-z0-9 ]/g, '')
    .replace(/a/g, '[aáàä]').replace(/e/g, '[eéèë]').replace(/i/g, '[iíìï]')
    .replace(/o/g, '[oóòö]').replace(/u/g, '[uúùü]').replace(/n/g, '[nñ]');
}

// Horas → "1 h 20 min" o "35 min"
export function fmtT(h) {
  var m = Math.round(h * 60);
  return m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' min';
}
