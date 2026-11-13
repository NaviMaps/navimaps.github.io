// Tutorial de bienvenida: tarjetas que explican cómo usar la app. Aparece una sola vez (se guarda en el celular)
// y se puede volver a ver desde ☰ › Ajustes › Ver tutorial.
// Cada paso puede marcar un botón de la pantalla (sel) con un aro que late.
import { PRE } from './entorno.js';

var useState = React.useState, useEffect = React.useEffect;
var CLAVE = PRE + 'delta_tutorial';

export function tutorialVisto() { try { return localStorage.getItem(CLAVE) === '1'; } catch (e) { return true; } }
function marcarVisto() { try { localStorage.setItem(CLAVE, '1'); } catch (e) {} }

var PASOS = [
  { e: '⛵', t: 'Bienvenido a NaviMaps',
    d: 'Un mapa para navegar el Delta: ríos y arroyos, rutas por agua, altura del río, lugares y zonas deportivas.',
    x: 'Tip: en Safari tocá Compartir › Agregar a inicio. Así se abre como una app y funciona sin señal con lo que ya viste.', img: 'inicio', pos: 'top' },
  { e: '🖐️', t: 'Moverte por el mapa',
    d: 'Arrastrá con un dedo y pellizcá para acercar o alejar. Doble toque acerca; un toque con dos dedos a la vez aleja. Con dos dedos también lo girás.',
    x: 'Si giraste el mapa, tocá la brújula para volver con el norte arriba.', sel: '.compass', anim: 'gestos' },
  { e: '📍', t: 'Marcar puntos',
    d: 'Mantené apretado el mapa medio segundo donde quieras: aparece un pin y le ponés nombre (muelle, recreo, lugar de pesca…).',
    x: 'Tus puntos se guardan en el celular y los ves en ☰ › Puntos.', anim: 'marcar' },
  { e: '🧭', t: 'Cómo llegar',
    d: 'Tocá un punto guardado, un lugar o un pin y elegí «Cómo llegar»: calcula la ruta por agua siguiendo los ríos y arroyos, con la distancia en millas y el tiempo según tu velocidad.',
    x: 'Podés cambiar la velocidad de crucero en la ruta o en Ajustes.', img: 'ruta', pos: '50% 8%' },
  { e: '🔍', t: 'Buscar',
    d: 'Buscá tus puntos, ríos y arroyos por nombre, o lugares como combustible, restaurantes, marinas y proveedurías.',
    sel: '.sb', img: 'buscar', pos: 'top' },
  { e: '⏺️', t: 'Grabar el recorrido',
    d: 'Con este botón grabás por dónde vas y las millas navegadas. Tocalo de nuevo para terminar.',
    x: 'En el iPhone dejá la pantalla prendida mientras grabás.', sel: '[aria-label="Grabar recorrido"]', anim: 'grabar' },
  { e: '🛰️', t: 'Tu posición y el satélite',
    d: '◎ te centra el mapa donde estás. 🛰 cambia a la vista satelital y de vuelta.',
    sel: '[aria-label="Mi posición"]', anim: 'satelite' },
  { e: '🌊', t: 'Altura del río y clima',
    d: 'Arriba ves tu velocidad, el viento y la altura del río en la estación más cercana. Tocá la altura para ver el gráfico, el pronóstico y las mareas del SHN.',
    x: 'Se actualiza sola cada 30 minutos con datos del INA y del SHN.', sel: '.hud', img: 'rio', pos: 'top' },
  { e: '☰', t: 'El menú',
    d: 'En Capas elegís el estilo de mapa y prendés señales náuticas, zonas deportivas de Prefectura y lugares. En Puntos están los tuyos, y en Ajustes la copia de seguridad.',
    x: 'Exportá una copia de seguridad cada tanto para no perder tus puntos.', sel: '.burger', img: 'capas', pos: '50% 78%' },
  { e: '⚠️', t: 'Navegá con criterio',
    d: 'La app usa datos de OpenStreetMap y no conoce profundidades, bajíos ni alturas de puentes. Es una ayuda: no reemplaza las cartas oficiales ni las indicaciones de Prefectura.',
    fin: true }
];

var IMG = 'img/tuto/';

// Imagen o animación de cada paso. Las animaciones son CSS sobre un pedazo de mapa real (ver index.html, "Tutorial").
function Medio(props) {
  var html = props.html, p = props.p;
  if (p.img) return html`<div className="tuto-media"><img src=${IMG + p.img + '.webp'} alt="" style=${{ objectPosition: p.pos || 'center' }} /></div>`;
  var fondo = { backgroundImage: 'url(' + IMG + 'mapa.webp)' };
  if (p.anim === 'gestos') return html`<div className="tuto-media an an-gestos">
      <div className="an-map" style=${fondo}></div><i className="f f1"></i><i className="f f2"></i><div className="an-fade"></div>
      <span className="an-cap c1">Arrastrá para moverte</span><span className="an-cap c2">Pellizcá para acercar</span><span className="an-cap c3">Doble toque: acerca</span></div>`;
  if (p.anim === 'marcar') return html`<div className="tuto-media an an-marcar">
      <div className="an-map" style=${fondo}></div><i className="f"></i><i className="an-ring"></i>
      <svg className="an-pin" viewBox="0 0 24 32" width="26" height="34"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="#e5484d" stroke="#fff" stroke-width="2"/><circle cx="12" cy="12" r="4.5" fill="#fff"/></svg>
      <div className="an-card"><b>Nuevo punto</b><span className="an-input">Muelle de Pepe</span><span className="an-btn">Guardar</span></div>
      <span className="an-cap">Mantené apretado medio segundo</span></div>`;
  if (p.anim === 'grabar') return html`<div className="tuto-media an an-grabar">
      <div className="an-map" style=${fondo}></div>
      <svg className="an-traza" viewBox="0 0 360 180" preserveAspectRatio="none"><path d="M40 150 C 90 140, 110 100, 150 95 S 230 70, 250 55 S 300 30, 330 28" fill="none" stroke="#0a7c8c" stroke-width="5" stroke-linecap="round" pathLength="100"/></svg>
      <i className="an-boat"></i><span className="an-rec"><i></i>Grabando…</span><span className="an-cap">Tu recorrido se dibuja mientras navegás</span></div>`;
  if (p.anim === 'satelite') return html`<div className="tuto-media an an-sat">
      <div className="an-map" style=${fondo}></div><div className="an-map an-sat-img" style=${{ backgroundImage: 'url(' + IMG + 'satelite.webp)' }}></div><i className="an-linea"></i>
      <i className="an-yo"></i><span className="an-cap">Mapa ↔ Satélite</span></div>`;
  return null;
}

export function Tutorial(props) {
  var html = props.html;
  var _i = useState(0), i = _i[0], setI = _i[1];
  var _r = useState(null), rect = _r[0], setRect = _r[1];
  var p = PASOS[i];

  // Busca el botón del paso y guarda dónde está (se recalcula si gira la pantalla)
  useEffect(function () {
    function medir() {
      var el = p.sel ? document.querySelector(p.sel) : null;
      if (!el) { setRect(null); return; }
      var r = el.getBoundingClientRect();
      setRect({ x: r.left, y: r.top, w: r.width, h: r.height });
    }
    medir();
    window.addEventListener('resize', medir);
    return function () { window.removeEventListener('resize', medir); };
  }, [i]);

  function cerrar() { marcarVisto(); props.onClose(); }
  function sig() { if (i < PASOS.length - 1) setI(i + 1); else cerrar(); }
  function ant() { if (i > 0) setI(i - 1); }

  var pad = 6;
  return html`<div className=${'tuto' + (rect ? ' con-aro' : '')} role="dialog" aria-modal="true" aria-label="Tutorial">
    ${rect ? html`<div className="tuto-aro" style=${{ left: (rect.x - pad) + 'px', top: (rect.y - pad) + 'px', width: (rect.w + pad * 2) + 'px', height: (rect.h + pad * 2) + 'px', borderRadius: (Math.abs(rect.w / rect.h - 1) < 0.25 ? rect.h / 2 + pad : 24) + 'px' }}></div>` : null}
    <div className="tuto-card" key=${i}>
      <div className="tuto-top"><span className="tuto-e">${p.e}</span>
        ${p.fin ? null : html`<button className="clr tuto-saltar" onClick=${cerrar}>Saltar</button>`}</div>
      <${Medio} html=${html} p=${p} />
      <b className="tuto-t">${p.t}</b>
      <p className="tuto-d">${p.d}</p>
      ${p.x ? html`<p className="tuto-x">${p.x}</p>` : null}
      <div className="tuto-pie">
        <div className="tuto-puntos">${PASOS.map(function (_, k) { return html`<i key=${k} className=${k === i ? 'on' : ''}></i>`; })}</div>
        <div className="seg">
          ${i > 0 ? html`<button className="mini" onClick=${ant}>Atrás</button>` : null}
          <button className="btn p tuto-sig" onClick=${sig}>${p.fin ? 'Empezar' : 'Siguiente'}</button>
        </div>
      </div>
    </div>
  </div>`;
}
