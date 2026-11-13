// Estilos de mapa base (mosaicos de 256 px, o de 512 px "@2x" para pantallas de iPhone) y la capa náutica.
// max: último zoom que tiene el servidor; más cerca se agrandan los mosaicos de ese zoom.
// Ninguno pide clave. Stadia y MapTiler (más lindos todavía) piden registrarse: se pueden sumar con una clave.

function carto(id) {
  return function (z, x, y) { return 'https://' + 'abcd'.charAt((x + y) % 4) + '.basemaps.cartocdn.com/' + id + '/' + z + '/' + x + '/' + y + '@2x.png'; };
}

export var ESTILOS = {
  osm: { n: 'OpenStreetMap', max: 19, at: 'OpenStreetMap',
    url: function (z, x, y) { return 'https://tile.openstreetmap.org/' + z + '/' + x + '/' + y + '.png'; } },
  voyager: { n: 'Voyager', max: 20, at: 'OpenStreetMap · CARTO', url: carto('rastertiles/voyager') },
  claro: { n: 'Claro', max: 20, at: 'OpenStreetMap · CARTO', url: carto('light_all') },
  oscuro: { n: 'Oscuro', max: 20, at: 'OpenStreetMap · CARTO', url: carto('dark_all') },
  oceano: { n: 'Océano', max: 16, at: 'Esri, GEBCO, NOAA',
    url: function (z, x, y) { return 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/' + z + '/' + y + '/' + x; } },
  sat: { n: 'Satélite', max: 19, at: 'Esri',
    url: function (z, x, y) { return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/' + z + '/' + y + '/' + x; } }
};

// Orden en el selector de Capas
export var ORDEN = ['osm', 'voyager', 'claro', 'oscuro', 'oceano', 'sat'];

// Señales náuticas (boyas, balizas, faros, marinas) de OpenSeaMap: capa transparente encima del mapa
export var SEAMARK = { min: 9, max: 18, at: 'OpenSeaMap',
  url: function (z, x, y) { return 'https://tiles.openseamap.org/seamark/' + z + '/' + x + '/' + y + '.png'; } };
