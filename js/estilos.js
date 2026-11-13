// Estilos de mapa base y la capa náutica. Todos funcionan SIN clave (probados el 13/11/2026).
// max: último zoom que tiene el servidor en el Delta; más cerca se agrandan los mosaicos de ese zoom.
// CARTO dejó de andar sin clave (devuelve una imagen "API KEY REQUIRED"); Esri Océano y National Geographic
// no tienen datos del Delta de cerca. Stadia y MapTiler piden registrarse: se pueden sumar con una clave.
var E = 'https://server.arcgisonline.com/ArcGIS/rest/services/';
function esri(srv) { return function (z, x, y) { return E + srv + '/MapServer/tile/' + z + '/' + y + '/' + x; }; }

export var ESTILOS = {
  osm: { n: 'OSM', max: 19, at: 'OpenStreetMap',
    url: function (z, x, y) { return 'https://tile.openstreetmap.org/' + z + '/' + x + '/' + y + '.png'; } },
  suave: { n: 'OSM suave', max: 18, at: 'OpenStreetMap · HOT',
    url: function (z, x, y) { return 'https://a.tile.openstreetmap.fr/hot/' + z + '/' + x + '/' + y + '.png'; } },
  relieve: { n: 'Relieve', max: 17, at: 'OpenStreetMap · OpenTopoMap',
    url: function (z, x, y) { return 'https://tile.opentopomap.org/' + z + '/' + x + '/' + y + '.png'; } },
  calles: { n: 'Calles', max: 18, at: 'Esri', url: esri('World_Street_Map') },
  topo: { n: 'Topo Esri', max: 18, at: 'Esri', url: esri('World_Topo_Map') },
  claro: { n: 'Gris claro', max: 16, at: 'Esri', url: esri('Canvas/World_Light_Gray_Base') },
  oscuro: { n: 'Gris oscuro', max: 16, at: 'Esri', url: esri('Canvas/World_Dark_Gray_Base') },
  sat: { n: 'Satélite', max: 19, at: 'Esri', url: esri('World_Imagery') }
};

// Orden en el selector de Capas
export var ORDEN = ['osm', 'suave', 'relieve', 'calles', 'topo', 'claro', 'oscuro', 'sat'];

// Señales náuticas (boyas, balizas, faros, marinas) de OpenSeaMap: capa transparente encima del mapa
export var SEAMARK = { min: 9, max: 18, at: 'OpenSeaMap',
  url: function (z, x, y) { return 'https://tiles.openseamap.org/seamark/' + z + '/' + x + '/' + y + '.png'; } };
