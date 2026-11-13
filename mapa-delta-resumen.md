# NaviMaps (Mapa del Delta) — Resumen del proyecto

App web tipo "Google Maps / Wavve" para navegar los ríos y arroyos del Delta del Paraná (Buenos Aires). Se publica como página estática en GitHub Pages y se usa desde el iPhone (se puede agregar a la pantalla de inicio desde Safari).

## Cómo llegamos hasta acá

1. **Idea inicial:** app para iPhone. Evaluamos Swift nativo (requiere Mac, Xcode y cuenta de desarrollador de USD 99/año) y se decidió empezar con una **app web**, más simple y sin esas barreras.
2. **Prototipo v1:** HTML + JavaScript puro, mapa dibujado a mano sobre `<canvas>`.
3. **Publicación:** repositorio `iangiribaldi/Maps-nautico` en GitHub (hoy `NaviMaps/navimaps.github.io`), con GitHub Pages. Aprendimos que el archivo tiene que llamarse exactamente `index.html` (Windows había creado `index.html.html`).
4. **Pulido para celular:** pantalla completa, zoom con pellizco, botones grandes, panel inferior.
5. **Migración a React** en un solo archivo, sin compilar (React por CDN + htm), en lugar de React + Vite.
6. **Funciones tipo Wavve:** satélite, clima, destino, ruta por agua.
7. **Ronda grande de funciones:** menú, buscador, rotación, capas, estilo de vidrio.
8. **Rendimiento:** caché, servidores de respaldo y archivo local de cauces.
9. **Ajustes finales:** zona muerta de rotación, prioridad de ríos, colores y animación de la ruta.
10. **Modo sin conexión (v1, 12/11/2026):** service worker, manifiesto e íconos. La app, los cauces y los mosaicos ya vistos funcionan sin señal.
11. **Arreglos y módulos (v2, 12/11/2026):** batería (destello que se detiene, canvas a 2x), recorrido con filtro de 10 m y guardado espaciado, se recuerdan crucero y satélite, límite de mosaicos en memoria, CSS ordenado y código separado en `js/`.
12. **Git y GitHub CLI:** desde la v2 los cambios se suben con `git push` en lugar de subirlos a mano por la web.
13. **Rama de prueba (v3, 12/11/2026):** rama `test` publicada en `/test/` con una automatización de GitHub Actions, datos y caché separados de la versión real, y cartel "PRUEBA".
14. **Mudanza a NaviMaps (v4, 12/11/2026):** se creó la organización gratuita **NaviMaps** en GitHub, el repositorio pasó a `NaviMaps/navimaps.github.io` y la app se llama **NaviMaps**. Dirección nueva: https://navimaps.github.io/. La vieja (`iangiribaldi.github.io/Maps-nautico/`) ya no existe.
15. **Copia de seguridad (v5, 12/11/2026, en `test`):** Ajustes > Copia de seguridad, con botones *Exportar* (arma un `.json` con los puntos y el recorrido; en el iPhone abre Compartir para guardarlo en Archivos, WhatsApp o Mail) e *Importar* (suma los puntos sin repetir y pregunta antes de reemplazar el recorrido). Código en `js/respaldo.js`.
16. **Pines con el dedo (v6, 12/11/2026, en `test`):** se sacó la barra de abajo (Grabar / Marcar / Ir ahí y el campo de nombre) y la mira del centro. Ahora se **mantiene apretado el mapa** medio segundo: aparece un pin rojo y una tarjeta que pide el nombre, con *Guardar*, *Ir ahí* y (si hay destino) *Salir de acá*. **Grabar** pasó a un botón redondo en la columna derecha (rojo con latido mientras graba). El panel de abajo solo aparece cuando hay un destino, con los datos de la ruta.
17. **Tus puntos y "Cómo llegar" (v7, 12/11/2026, en `test`):** el buscador muestra primero los **puntos guardados** que coinciden con lo escrito (sin tildes, mientras escribís; con el buscador vacío, los 5 más cercanos). **Tocar un punto guardado** (en el mapa o en el buscador) abre una tarjeta como la de Google Maps con el nombre, la distancia y **Cómo llegar**, que marca el destino y **calcula sola la ruta por agua** (si no sabe dónde estás, primero busca tu posición). Al terminar, el mapa encuadra toda la ruta por encima del panel. Los ➤ de resultados y de la lista de puntos hacen lo mismo.
18. **Buscador unificado (v8, 12/11/2026, en `test`):** una sola búsqueda junta **tus puntos guardados**, los **cauces** (de `cauces.json`, al instante) y los **lugares** (Overpass, llegan después: "buscando más…"). Antes, si el nombre coincidía con un cauce, solo mostraba cauces. Si coincide un punto guardado, el mapa va directo a su pin y abre su tarjeta. Con el buscador vacío aparecen primero los **Recientes** (historial) y después las sugerencias.
19. **Arreglo del buscador (v9, 12/11/2026, en `test`):** se quedaba trabado en "Buscando…" esperando al servidor de lugares. Ahora, si ya hay resultados propios o de cauces, al servidor se le dan como mucho 8 s; y al limpiar o escribir de nuevo se corta la búsqueda anterior y aparecen enseguida los recientes y las sugerencias.
20. **Quitar destino borra también la salida (v10, 12/11/2026, en `test`):** al tocar *Quitar destino* se borra el punto elegido con *Salir de acá* (y la ruta), así la próxima ruta vuelve a salir desde tu ubicación.
21. **Lugares en el mapa (v11, 13/11/2026, en `test`):** archivo propio **`lugares.json`** (como `cauces.json`), generado con **`descargar-lugares.ps1`**: estaciones de servicio (incluido combustible náutico), restaurantes, bares y cafés, marinas y muelles, proveedurías, alojamiento y salud del Delta. Se ven como íconos desde zoom 13 (con nombre desde zoom 16); al tocar uno se abre su tarjeta con **Cómo llegar** y ☆ para guardarlo en tus puntos. Con el archivo cargado, el buscador (por nombre o por categoría, como "combustible") sale todo del celular: al instante, sin señal y sin consultar al servidor. Capa "Lugares" en Capas y estado en Ajustes > Lugares guardados. Sin el archivo, la app sigue buscando lugares en el servidor como antes.

**Estado actual:** versión `v11` en `test` (copia de seguridad, pines con el dedo, Cómo llegar y buscador unificado y arreglado), `v4` en `main`. La carpeta local trabaja en la rama `test`.

## Funciones actuales

### Mapa
- Mapa base de OpenStreetMap y **vista satelital** (Esri), con botón para alternar.
- Arrastre, zoom con pellizco, doble toque y botones +/−.
- **Rotación con dos dedos** con zona muerta de unos 15° (así el zoom no gira el mapa sin querer).
- **Brújula** arriba a la derecha; al tocarla vuelve el norte arriba con animación.
- Escala del mapa en metros o km.
- Posición GPS, con botón ◎ para centrar.
- Velocidad en nudos y datos de **viento, ráfagas y temperatura** (Open-Meteo, se actualiza cada 10 minutos).

### Puntos y recorridos
- **Marcar** puntos manteniendo apretado el mapa: aparece un pin y una tarjeta para ponerle nombre, guardarlo, ir ahí o salir desde ahí.
- **Grabar recorrido** (botón ⏺ de la derecha) con distancia en millas náuticas; mantiene la pantalla encendida mientras graba.
- Todo se guarda en el navegador del celular.

### Navegación y ruta
- **Destino** manteniendo apretado el mapa y tocando "Ir ahí", con ➤ desde un punto guardado, o desde el buscador.
- **Origen elegible:** tu ubicación u otro punto (mantener apretado el mapa > "Salir de acá").
- **Ruta por agua** calculada sobre los cauces de OpenStreetMap (algoritmo de camino más corto con pesos).
- **Prioridad de cauces** (Ajustes): *Directa*, *Equilibrada* o *Ríos primero* (por defecto). Penaliza arroyos y cauces marcados como intermitentes o no navegables.
- Muestra distancia (mn y km), tiempo estimado según la velocidad de crucero (ajustable) y el aviso de que no reemplaza las cartas oficiales.
- Ruta dibujada en **verde fluo** con **destello animado** que recorre la curva del origen al destino.

### Buscador
- **Lugares:** restaurantes, combustible, marinas y muelles, bares y cafés, proveedurías, alojamiento y salud. Se muestran pines en el mapa y una lista desplegable con orden por **más cercano** o A–Z.
- **Ríos, arroyos y canales:** se buscan por nombre (con o sin tildes), se resaltan en **rojo** y el mapa vuela hasta mostrar el tramo completo.
- **Busca en todo a la vez:** tus puntos guardados (📍, siempre arriba), ríos y arroyos, y lugares. Si coincide un punto guardado, abre su pin con Cómo llegar.
- Con el buscador vacío: primero el historial (Recientes) y después las sugerencias.

### Menú hamburguesa (☰)
- **Puntos:** lista de marcadores guardados, con renombrar, usar de destino o borrar.
- **Capas:** interruptores para puntos, recorrido, destino y ruta, clima y satélite.
- **Historial:** búsquedas recientes, con opción de borrar.
- **Ajustes:** tema (auto, claro, oscuro), velocidad de crucero, prioridad de cauces, estado de los cauces guardados y borrar recorrido.

### Diseño
- Estilo de **vidrio esmerilado** (tipo liquid glass) con transiciones suaves.
- Mapa limpio: el panel inferior **solo aparece con un destino**, y es plegable (con resumen de la ruta cuando está plegado).

### Rendimiento y datos
- **Caché** de consultas en memoria y en el celular.
- **Servidores de respaldo** de Overpass (si uno falla o tarda más de 7 segundos, prueba otro).
- **`cauces.json`:** archivo propio con los cauces del Delta (3,3 MB), generado con el script `descargar-cauces.ps1`. Con él, las búsquedas de ríos y las rutas salen al instante y sin esperar a ningún servidor.
- **Sin conexión:** `sw.js` guarda la app, las librerías, `cauces.json` y hasta 4.000 mosaicos ya vistos. Con señal, la página se actualiza sola; el resto sale de la caché al instante.
- **Batería:** el destello de la ruta pasa 3 veces y se detiene (nunca mientras se graba); el canvas se dibuja a 2x como máximo.
- **Recorrido:** suma un punto solo si te moviste 10 m o más con precisión menor a 50 m; mientras graba guarda cada 15 s, y al detener o salir de la app guarda al instante.

## Archivos del proyecto

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Página y estilos; carga React por CDN y `js/app.js` |
| `js/app.js` | Interfaz: mapa en canvas, gestos, GPS, buscador, menú y ruta |
| `js/geo.js` | Proyección del mapa, distancias, rumbos y formatos |
| `js/ruta.js` | Ruta por agua (Dijkstra) y prioridad de cauces |
| `js/datos.js` | Overpass con respaldo, `cauces.json` y resultados de búsqueda |
| `cauces.json` | Cauces del Delta bajados de OpenStreetMap |
| `lugares.json` | Lugares del Delta (combustible, restaurantes, marinas…) bajados de OpenStreetMap |
| `descargar-lugares.ps1` | Script de PowerShell que baja los lugares del Delta en 6 partes (como el de los cauces) y arma `lugares.json` |
| `descargar-cauces.ps1` | Script de PowerShell que baja el Delta en 6 partes y arma `cauces.json` |
| `sw.js` | Service worker: guarda la app, los cauces y los mosaicos vistos para usarla sin señal |
| `manifest.webmanifest` | Nombre, colores e íconos para instalarla en la pantalla de inicio |
| `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | Íconos de la app |
| `js/respaldo.js` | Exportar e importar los puntos y el recorrido (copia de seguridad en `.json`) |
| `js/entorno.js` | Detecta si es la versión de prueba (`/test/`): separa sus datos y muestra el cartel PRUEBA |
| `.github/workflows/publicar.yml` | Automatización que publica `main` en la raíz y `test` en `/test/` |
| `mapa-delta-resumen.md` | Este resumen |

(El primer prototipo, `mapa-delta.html`, ya no está en el repositorio.)

Link: https://navimaps.github.io/

Este resumen (`mapa-delta-resumen.md`) también está en el repositorio, para retomar el trabajo desde cualquier computadora.

## Ramas: prueba y versión real

| Rama | Dirección | Para qué |
|---|---|---|
| `main` | https://navimaps.github.io/ | La versión que se usa de verdad |
| `test` | https://navimaps.github.io/test/ | Versión de prueba (cartel naranja "PRUEBA", se instala como "NaviMaps TEST") |

- La automatización `.github/workflows/publicar.yml` publica las dos cada vez que se sube algo a cualquiera de ellas (GitHub Pages está configurado como "GitHub Actions").
- **Datos separados:** la versión de prueba guarda todo con `test_` adelante (`js/entorno.js`) y su caché lleva su carpeta en el nombre (`sw.js`). Un error en la prueba no toca los puntos ni recorridos reales. Solo comparten los mosaicos del mapa.
- **Flujo:** los cambios van primero a `test` → se prueban en el iPhone o en el agua → si están aprobados, se pasa `test` a `main` (`git checkout main`, `git merge test`, `git push`, y `git checkout test` para seguir trabajando en prueba).
- Si se agrega otra rama además de `main` y `test`, hay que habilitarla en el repositorio: Settings > Environments > github-pages.

## Cómo actualizar la app

1. **Siempre** subir el número de `VERSION` en `sw.js` (`v2` → `v3`…) cuando cambia `index.html`, algo de `js/` o `cauces.json`. Si no, los celulares siguen usando la copia guardada.
2. Subir los cambios con Git (`git add`, `git commit`, `git push`) o, si no hay Git a mano, con Add file > Upload files en la web (la carpeta `js` se arrastra entera).
3. GitHub Pages tarda uno o dos minutos en publicar. En el iPhone: abrir la app con señal, cerrarla y volver a abrirla.
4. Para refrescar los cauces: correr de nuevo `descargar-cauces.ps1`, subir el nuevo `cauces.json` y la `VERSION`.
5. Para refrescar los lugares: correr `powershell -ExecutionPolicy Bypass -File .\descargar-lugares.ps1` dentro de la carpeta, subir el nuevo `lugares.json` y la `VERSION`.
   - Para abrir PowerShell en la carpeta: en el Explorador de archivos (Windows + E), entrar a `navimaps.github.io`, hacer clic en un espacio vacío de la barra de dirección, escribir `powershell` y apretar Enter. La línea tiene que terminar en `navimaps.github.io>`.
   - Al terminar, el script dice en verde `Listo: ...\lugares.json (N lugares, X KB)` y cuántos hay de cada tipo.

## Cómo seguir en otra computadora

1. Instalar Git y GitHub CLI. En Windows: `winget install --id Git.Git -e` y `winget install --id GitHub.cli -e` (en Mac: `brew install git gh`).
2. Iniciar sesión: `gh auth login --web` (aceptar "Authenticate Git", pegar el código en el navegador y autorizar).
3. Bajar el proyecto: `gh repo clone NaviMaps/navimaps.github.io` y trabajar dentro de esa carpeta.
4. Configurar el autor de los cambios (una vez por computadora, dentro de la carpeta): `git config user.name "iangiribaldi"` y como correo la dirección privada `<id>+iangiribaldi@users.noreply.github.com` (el número sale de `gh api user --jq .id`).
5. Para probar en la computadora hace falta un servidor local, porque los módulos y el service worker no funcionan abriendo el archivo con doble clic. Por ejemplo `npx serve` (Node) o `python -m http.server 8765`, y abrir `http://localhost:8765`.
6. Antes de empezar, `git pull` para traer lo último; al terminar, subir `VERSION`, `git commit` y `git push`.
7. Con Claude Code: abrir esa carpeta y pedirle que lea `mapa-delta-resumen.md` para tener todo el contexto.

## Sesión con Claude Code en la nube (12 y 13/11/2026)

Los cambios 15 a 21 (v5 a v11) se hicieron desde Claude Code en la nube (claude.ai/code), con el repositorio conectado desde GitHub, sin la computadora del laburo. Todo quedó en la rama `test`.

| Versión | Commit | Cambio |
|---|---|---|
| v5 | `2401338` | Copia de seguridad: exportar e importar |
| v6 | `37d5c65` | Pines con el dedo; se sacó la barra de abajo |
| v7 | `b5ac5f5` | Tus puntos en el buscador y "Cómo llegar" |
| v8 | `0d3c8c4` | Buscador unificado; historial primero |
| v9 | `d76d209` | El buscador ya no queda trabado en "Buscando…" |
| v10 | `9acf111` | "Quitar destino" borra también la salida |
| v11 | `a278bd1` | Lugares en el mapa (`lugares.json`) y su script |

**Cómo se probó:** cada cambio se probó en un navegador automático (Chromium) simulando un iPhone, con los servidores externos simulados o bloqueados. Se probaron exportar e importar, el pin con toque largo (y que no aparezca con un toque corto ni al arrastrar), la tarjeta de un punto guardado, Cómo llegar con la ruta calculada, el buscador con un servidor lento (20 s), Quitar destino y los lugares.

**Falta probar en el iPhone real:**
- El menú Compartir al exportar.
- Que mantener apretado el mapa no abra el menú de "copiar o guardar imagen" de Safari.
- Tocar puntos o lugares muy cercanos entre sí (el radio de toque es de unos 24 px).
- Cómo se ven los íconos de lugares.

**Autor de los commits:** quedaron a nombre de `iangiribaldi` con el correo privado de GitHub, como dice "Cómo seguir en otra computadora". GitHub puede marcarlos "Unverified" (no están firmados); es solo una etiqueta.

**Pasar `test` a `main`** cuando todo esté aprobado: `git checkout main`, `git merge test`, `git push` y `git checkout test`.

## Limitaciones conocidas

- La ruta depende de lo que esté mapeado en OpenStreetMap. No sabe si un arroyo está seco, ni conoce profundidades, bajíos ni alturas de puentes. **No reemplaza las cartas oficiales.**
- En iPhone, el GPS deja de grabar si se apaga la pantalla o se cambia de app.
- El almacenamiento del navegador puede borrarse si la app no está agregada a la pantalla de inicio (Safari borra datos de sitios sin visitar en 7 días). Por eso conviene exportar una copia de seguridad cada tanto (Ajustes > Copia de seguridad).
- **Mudanza a navimaps.github.io:** Safari guarda los datos por dirección, así que la app nueva arrancó vacía. Los puntos y recorridos de la dirección vieja siguen en el iPhone, pero solo se pueden recuperar haciendo exportar/importar y volviendo a publicar la dirección vieja un rato.
- Sin conexión solo están los mosaicos que ya se vieron con señal; no hay descarga de zonas enteras (el servidor de OpenStreetMap no lo permite).
- Los mosaicos del servidor público de OpenStreetMap son para uso liviano.
- Los resultados de lugares dependen de la calidad de los datos de OSM en la zona.
- `cauces.json` y `lugares.json` son una foto del día en que se descargaron; conviene actualizarlos de vez en cuando. Si un recreo o proveeduría no está cargado en OpenStreetMap, no aparece: guardalo como punto propio.

## Próximos pasos posibles

- **Altura del río y mareas** (datos del INA o SIHN, a verificar qué publican).
- Exportar el recorrido también en **GPX** para abrirlo en otras apps náuticas.
- Recuperar los datos de la dirección vieja: volver a publicar un rato `iangiribaldi.github.io/Maps-nautico/` con la v5, exportar desde ahí e importar en NaviMaps.
- Ordenar `js/app.js` en partes más chicas (mapa, gestos, panel, menú) con nombres de variables legibles.
- Probar **Preact** en lugar de React (mismo código con htm, unos 40 KB menos).
- **Base colaborativa** de muelles, bajíos y canales a partir de recorridos grabados.
- Usar los **recorridos propios** para mejorar el ruteo donde OSM no tiene datos.
- Pasar a **MapLibre** con estilos propios y **mapas sin conexión**.
- Evaluar más adelante una **app nativa** o empaquetarla con Capacitor.
- Cambiar a un proveedor de mapas con plan gratuito (por ejemplo MapTiler) para uso más intensivo.
