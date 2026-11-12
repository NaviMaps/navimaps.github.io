// Copia de seguridad: exportar e importar los puntos y el recorrido en un archivo .json.
// Sirve para no perder datos si Safari borra el almacenamiento, para pasar los datos
// a otro celular y para mudarlos entre direcciones (por ejemplo, de la versión vieja a la nueva).
import { ES_TEST } from './entorno.js';

var FORMATO = 'navimaps-respaldo';

function hoy() {
  var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function esCoord(p) {
  return p && typeof p.lat === 'number' && typeof p.lng === 'number' && isFinite(p.lat) && isFinite(p.lng) &&
    Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;
}

// Arma el archivo y lo ofrece para guardar. En el iPhone abre el menú Compartir
// (Guardar en Archivos, WhatsApp, Mail…); en la computadora lo descarga.
export function exportar(marks, track) {
  var datos = { formato: FORMATO, version: 1, fecha: new Date().toISOString(),
    marks: marks.map(function (m) { return { name: m.name, lat: m.lat, lng: m.lng }; }),
    track: track.map(function (p) { return { lat: p.lat, lng: p.lng }; }) };
  var nombre = 'navimaps' + (ES_TEST ? '-test' : '') + '-' + hoy() + '.json';
  var blob = new Blob([JSON.stringify(datos)], { type: 'application/json' });
  var archivo;
  try { archivo = new File([blob], nombre, { type: 'application/json' }); } catch (e) {}
  if (archivo && navigator.canShare && navigator.canShare({ files: [archivo] })) {
    return navigator.share({ files: [archivo], title: 'Respaldo NaviMaps' })
      .then(function () { return 'ok'; })
      .catch(function (e) { if (e && e.name === 'AbortError') return 'cancelado'; return descargar(blob, nombre); });
  }
  return Promise.resolve(descargar(blob, nombre));
}

function descargar(blob, nombre) {
  var url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
  return 'ok';
}

// Lee un archivo elegido por el usuario y devuelve {marks, track} ya revisados.
// Acepta el respaldo propio y también el formato interno guardado en el navegador ({marks, track, …}).
export function leer(file) {
  return file.text().then(function (txt) {
    var d;
    try { d = JSON.parse(txt); } catch (e) { throw new Error('El archivo no es un respaldo válido'); }
    if (!d || typeof d !== 'object' || (!Array.isArray(d.marks) && !Array.isArray(d.track)))
      throw new Error('El archivo no tiene puntos ni recorrido');
    var marks = (d.marks || []).filter(esCoord).map(function (m, i) {
      return { name: String(m.name || ('Punto ' + (i + 1))).slice(0, 80), lat: m.lat, lng: m.lng };
    });
    var track = (d.track || []).filter(esCoord).map(function (p) { return { lat: p.lat, lng: p.lng }; });
    return { marks: marks, track: track };
  });
}

// Junta los puntos importados con los que ya hay, sin repetir los que están en el mismo lugar con el mismo nombre.
export function unirPuntos(actuales, nuevos) {
  function k(m) { return m.name + '|' + m.lat.toFixed(5) + '|' + m.lng.toFixed(5); }
  var vistos = {}, out = actuales.slice();
  actuales.forEach(function (m) { vistos[k(m)] = 1; });
  nuevos.forEach(function (m) { if (!vistos[k(m)]) { vistos[k(m)] = 1; out.push(m); } });
  return out;
}
