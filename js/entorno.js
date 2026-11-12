// Entorno: la misma app se publica en dos lugares del mismo sitio.
//   /Maps-nautico/       → rama main (la que se usa de verdad)
//   /Maps-nautico/test/  → rama test (versión de prueba)
// Como comparten sitio, comparten también el almacenamiento del navegador.
// PRE separa los datos: la versión de prueba guarda todo con "test_" adelante,
// así un error en la prueba nunca toca los puntos ni recorridos de la versión real.

export var ES_TEST = /\/test\/(index\.html)?$/.test(location.pathname);
export var PRE = ES_TEST ? 'test_' : '';

if (ES_TEST) {
  document.title = 'Delta TEST';
  var t = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (t) t.setAttribute('content', 'Delta TEST');
  var c = document.querySelector('meta[name="theme-color"]');
  if (c) c.setAttribute('content', '#d9480f');
}
