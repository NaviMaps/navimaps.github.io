// Estilos de mapa base y la capa náutica.
// max: último zoom que tiene el servidor; más cerca se agrandan los mosaicos de ese zoom.
// - OSM, Relieve (OpenTopoMap) y Satélite (Esri): sin clave.
// - Stadia (Suave, Outdoors, Terreno, Terreno sin nombres): sin clave en la URL, pero el dominio
//   navimaps.github.io está registrado en la cuenta de Stadia (gratis, uso no comercial). Sin eso muestran "401 Error".
// - Thunderforest y Jawg: necesitan una clave de cada servicio. Mientras CLAVES esté vacío, no aparecen en el selector.
//   Las claves de mapas web quedan visibles en la página: en el panel de cada servicio conviene limitarlas
//   al dominio navimaps.github.io.
// CARTO dejó de andar sin clave; Esri Océano y National Geographic no tienen datos del Delta de cerca.

export var CLAVES = {
  thunderforest: '',  // https://manage.thunderforest.com/ → API Keys
  jawg: ''            // https://www.jawg.io/lab/access-tokens
};

var E = 'https://server.arcgisonline.com/ArcGIS/rest/services/';
function esri(srv) { return function (z, x, y) { return E + srv + '/MapServer/tile/' + z + '/' + y + '/' + x; }; }
function stadia(id) { return function (z, x, y) { return 'https://tiles.stadiamaps.com/tiles/' + id + '/' + z + '/' + x + '/' + y + '@2x.png'; }; }
var AT_STADIA = 'Stadia Maps · OpenMapTiles · OpenStreetMap';
var AT_STAMEN = 'Stadia Maps · Stamen Design · OpenMapTiles · OpenStreetMap';

export var ESTILOS = {
  osm: { n: 'OSM', max: 19, at: 'OpenStreetMap',
    url: function (z, x, y) { return 'https://tile.openstreetmap.org/' + z + '/' + x + '/' + y + '.png'; } },
  relieve: { n: 'Relieve', max: 17, at: 'OpenStreetMap · OpenTopoMap',
    url: function (z, x, y) { return 'https://tile.opentopomap.org/' + z + '/' + x + '/' + y + '.png'; } },
  suave: { n: 'Suave', max: 20, at: AT_STADIA, url: stadia('alidade_smooth') },
  outdoors: { n: 'Outdoors', max: 20, at: AT_STADIA, url: stadia('outdoors') },
  terreno: { n: 'Terreno', max: 18, at: AT_STAMEN, url: stadia('stamen_terrain') },
  terrenolimpio: { n: 'Terreno sin nombres', max: 18, at: AT_STAMEN, url: stadia('stamen_terrain_background') },
  transporte: { n: 'Transporte', max: 22, at: 'Thunderforest · OpenStreetMap', clave: 'thunderforest',
    url: function (z, x, y) { return 'https://tile.thunderforest.com/transport/' + z + '/' + x + '/' + y + '@2x.png?apikey=' + CLAVES.thunderforest; } },
  sunny: { n: 'Sunny', max: 22, at: 'Jawg Maps · OpenStreetMap', clave: 'jawg',
    url: function (z, x, y) { return 'https://tile.jawg.io/jawg-sunny/' + z + '/' + x + '/' + y + '@2x.png?access-token=' + CLAVES.jawg; } },
  sat: { n: 'Satélite', max: 19, at: 'Esri', url: esri('World_Imagery') }
};

// Orden en el selector de Capas (los que piden clave aparecen solo si la clave está cargada)
export var ORDEN = ['osm', 'relieve', 'suave', 'outdoors', 'terreno', 'terrenolimpio', 'transporte', 'sunny', 'sat']
  .filter(function (k) { return !ESTILOS[k].clave || CLAVES[ESTILOS[k].clave]; });

// Señales náuticas (boyas, balizas, faros, marinas) de OpenSeaMap: capa transparente encima del mapa
export var SEAMARK = { min: 9, max: 18, at: 'OpenSeaMap',
  url: function (z, x, y) { return 'https://tiles.openseamap.org/seamark/' + z + '/' + x + '/' + y + '.png'; } };
