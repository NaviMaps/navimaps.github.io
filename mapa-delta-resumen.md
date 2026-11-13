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

22. **Lugares reales y menos amontonados (v12, 13/11/2026):** se subió `lugares.json` (2.387 lugares del Delta, 165 KB, bajado el 12/11 con el script). Para que no se amontonen en Tigre: en zoom 13 y 14 solo se ven ⛽ combustible y ⚓ marinas y muelles; desde zoom 15, todos. Si dos íconos o dos nombres se pisan, se dibuja uno solo (combustible y marinas tienen prioridad). Se agregó el tipo "Mercado".
23. **Todo pasa a `main` (13/11/2026):** las versiones v5 a v12 quedan publicadas en https://navimaps.github.io/.

24. **Alturas del río y mareas (v13, 13/11/2026, en `test`):** datos del INA (alturas medidas y pronóstico) y del SHN (pleamares, bajamares y avisos), actualizados solos cada 30 minutos por GitHub Actions. Ver "Alturas del río y mareas (cómo funciona)".

25. **Zonas deportivas de Prefectura (v14, 13/11/2026, en `test`):** capa con las zonas de práctica deportiva (esquí y wakeboard, jet ski, motonáutica, vela, windsurf y kite, remo y SUP, fondeo, flyboard) pasadas de los croquis de la Prefectura. Ver "Zonas deportivas (cómo se armaron)".

26. **Zonas deportivas corregidas (v15, 13/11/2026, en `test`):** en el croquis de la primera sección el esquí y wake está en un rojo más oscuro y se había tomado como motonáutica; ahora son esquí y wake (desembocadura del Palmas, Canal del Este, Río San Antonio y un tramo cerca del Palmas). Además se corrigió la ubicación del lado este de esa sección (estaba corrida unos 4 km): había trazos cruzando el río abierto.

27. **Revisión de zonas descartada (v16 → v17, 13/11/2026):** se probó revisar las zonas una por una (Guazú y Talavera ubicadas por kilómetros, más tramos en la primera sección), pero quedaban mejor como en la v15, así que `zonas.json` volvió a esa versión (34 zonas).

28. **Todo pasa a `main` (13/11/2026):** alturas del río automáticas y zonas deportivas publicadas en https://navimaps.github.io/.

29. **Gestos de zoom (v18, 13/11/2026, en `test`):** se sacaron los botones + y −. El doble toque con un dedo acerca con una animación suave (0,3 s) dejando fijo el punto tocado; el toque con dos dedos a la vez (sin moverlos) aleja un nivel, también animado, centrado entre los dedos. Si se toca el mapa durante la animación, se corta. El pellizco sigue igual.

30. **Vidrio estilo iPhone (v19, 13/11/2026, en `test`):** rediseño del "liquid glass", más transparente y parecido al de iOS: poco desenfoque (7 px) con colores reforzados de lo que hay detrás, brillo fino en el borde de arriba, sombra suave y bordes más redondeados. Dos niveles: botones, buscador y recuadro de datos muy transparentes; menú, tarjetas y paneles con texto algo más cubiertos para leerse bien sobre el mapa o el satélite. Los botones de adentro de los paneles también son de vidrio. El menú flota separado del borde, con rebote al abrir, y los botones tienen un rebote corto al tocarlos. Versión para modo oscuro con más contraste.

31. **Estilos de mapa y señales náuticas (v20, 13/11/2026, en `test`):** selector en ☰ › Capas › Estilo de mapa con OpenStreetMap, CARTO Voyager, CARTO Claro, CARTO Oscuro, Esri Océano y Satélite (se recuerda el elegido; el botón 🛰 sigue alternando satélite). Los de CARTO usan mosaicos de doble resolución para que se vean nítidos en el iPhone; Esri Océano llega hasta zoom 16 y más cerca agranda esos mosaicos. Interruptor "Señales náuticas" con la capa de OpenSeaMap (boyas, balizas, faros, marinas) encima de cualquier estilo, desde zoom 9. La atribución de abajo del recuadro cambia según el estilo. Código en `js/estilos.js`; `sw.js` guarda también estos mosaicos para usar sin señal. Stadia y MapTiler no se agregaron porque piden registrarse y una clave.

32. **Estilos sin clave (v21, 13/11/2026, en `test`):** CARTO dejó de funcionar sin clave (devuelve una imagen "API KEY REQUIRED") y Esri Océano y National Geographic no tienen datos del Delta de cerca, así que se reemplazaron. Estilos actuales, todos probados sin clave con el mapa real: OSM, OSM suave (Humanitario), Relieve (OpenTopoMap), Calles (Esri), Topo Esri, Gris claro y Gris oscuro (Esri) y Satélite. Zoom máximo de cada uno: OSM 19, OSM suave 18, Relieve 17, Calles y Topo 18, Gris claro y oscuro 16; más cerca se agrandan los mosaicos.

33. **Solo 3 estilos (v22, 13/11/2026, en `test`):** quedan OSM, Relieve (OpenTopoMap) y Satélite; se sacaron los demás. Si alguien tenía elegido otro estilo, vuelve a OSM.

34. **Estilo "Suave" de Stadia (v23, 13/11/2026, en `test`):** se agregó Stadia Alidade Smooth (gris claro, muy limpio). No lleva clave en la URL, pero **el dominio `navimaps.github.io` tiene que estar registrado en una cuenta de Stadia** (gratis para uso no comercial): en https://client.stadiamaps.com/ crear la cuenta, crear una "property" y agregar el dominio `navimaps.github.io`. Hasta que esté registrado, los mosaicos muestran "401 Error".

35. **Más estilos (v24, 13/11/2026, en `test`):** se sumaron de Stadia **Outdoors**, **Terreno** (Stamen) y **Terreno sin nombres** (usan el dominio ya registrado en Stadia). Thunderforest y Jawg se descartaron porque piden una clave de cada servicio.

36. **Atribución fuera del recuadro (v26, 13/11/2026, en `test`):** con los estilos de Stadia la atribución era larga y estiraba el recuadro de datos hasta tapar el mapa. Ahora va chiquita, en una línea, abajo a la izquierda del mapa.

37. **Todo pasa a `main` (13/11/2026):** gestos de zoom, vidrio estilo iPhone, estilos de mapa (OSM, Relieve, Suave, Outdoors, Terreno, Terreno sin nombres, Satélite), señales náuticas y atribución abajo, publicados en https://navimaps.github.io/.

38. **Tutorial de bienvenida (v27, 13/11/2026, en `test`):** la primera vez que se abre la app aparece un tutorial de 10 tarjetas de vidrio (bienvenida y cómo agregarla a inicio, gestos, marcar puntos, Cómo llegar, buscar, grabar, posición y satélite, altura del río, menú y aviso de seguridad). Cuando habla de un botón, lo marca con un aro que late. Tiene Siguiente, Atrás y Saltar; se guarda que ya se vio y se puede volver a ver en ☰ › Ajustes › Ver tutorial. Código en `js/tutorial.js`.

39. **Tutorial con imágenes y animaciones (v28, 13/11/2026, en `test`):** cada paso del tutorial muestra una captura real de la app (inicio, Cómo llegar con la ruta, buscador, panel del río, menú de Capas) o una animación sobre un pedazo de mapa real (gestos: arrastrar, pellizcar y doble toque; marcar un punto; grabar el recorrido; cambio mapa ↔ satélite). Las imágenes están en `img/tuto/` (WebP, 220 KB en total); las animaciones son CSS en `index.html` (sección "Tutorial") y respetan la opción de reducir movimiento del iPhone.

40. **Tutorial a `main` (13/11/2026):** el tutorial con capturas y animaciones queda publicado en https://navimaps.github.io/.

41. **Animación de "Cómo llegar" (v29, 13/11/2026, en `test`):** el paso del tutorial muestra el recorrido completo con capturas reales y un dedo animado: mantener apretado el mapa → tocar «Ir ahí» → la ruta por los ríos (de un punto en el Río Sarmiento al Arroyo Abra Vieja, 3,7 mn) → el panel con la distancia, la llegada y «Ruta por agua». Imágenes `img/tuto/llegar1` a `llegar4.webp`.

42. **Botón de Capas y su paso en el tutorial (v30, 13/11/2026, en `test`):** botón redondo con el ícono de hojas apiladas debajo de grabar, que abre un panel de Capas abajo (estilo de mapa, zonas deportivas con el código de colores y la aclaración de que se toca una zona para ver qué deporte es, señales náuticas, alturas, lugares, puntos, recorrido, ruta y clima). La pestaña Capas del menú muestra lo mismo. Paso nuevo en el tutorial, "Capas y zonas deportivas", con una animación de capturas reales: tocar el botón, elegir estilo, ver los colores, tocar una zona del Barca Grande y la tarjeta "Esquí y wakeboard". Imágenes `img/tuto/capas1` a `capas5.webp`.

**Estado actual:** versión `v30` en `test` (botón de Capas y tutorial), `v28` en `main`. La carpeta local trabaja en la rama `test`.

## Funciones actuales

### Mapa
- **Estilos de mapa:** OSM, Relieve (OpenTopoMap), Suave, Outdoors, Terreno y Terreno sin nombres (Stadia, dominio registrado) y Satélite (Esri), más la capa de **señales náuticas** de OpenSeaMap.
- Arrastre, zoom con pellizco, doble toque para acercar y toque con dos dedos para alejar (los dos con animación suave).
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
- Estilo de **vidrio transparente tipo iPhone** (liquid glass): controles muy transparentes y paneles algo más cubiertos para leer bien, con transiciones y rebotes suaves.
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
| `js/alturas.js` | Lee `alturas.json`; tendencia, estado, estación más cercana y gráfico |
| `scripts/alturas.py` | Baja las alturas del INA y las mareas del SHN y arma `alturas.json` (lo corre GitHub cada 30 min) |
| `zonas.json` | Zonas de práctica deportiva de la Prefectura (34 zonas, pasadas de los croquis) |
| `js/tutorial.js` | Tutorial de bienvenida (los pasos están en `PASOS`; imágenes en `img/tuto/`) |
| `js/estilos.js` | Estilos de mapa (de dónde sale cada uno, zoom máximo, atribución) y capa de OpenSeaMap |
| `js/zonas.js` | Lee `zonas.json`, colores por deporte y qué zona se tocó |
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

Los cambios 15 a 21 (v5 a v11) se hicieron desde Claude Code en la nube (claude.ai/code), con el repositorio conectado desde GitHub, sin la computadora del laburo. Al final se pasó todo a `main`.

| Versión | Commit | Cambio |
|---|---|---|
| v5 | `2401338` | Copia de seguridad: exportar e importar |
| v6 | `37d5c65` | Pines con el dedo; se sacó la barra de abajo |
| v7 | `b5ac5f5` | Tus puntos en el buscador y "Cómo llegar" |
| v8 | `0d3c8c4` | Buscador unificado; historial primero |
| v9 | `d76d209` | El buscador ya no queda trabado en "Buscando…" |
| v10 | `9acf111` | "Quitar destino" borra también la salida |
| v11 | `a278bd1` | Lugares en el mapa (`lugares.json`) y su script |
| v12 | — | `lugares.json` real (2.387 lugares) y menos amontonados; todo pasa a `main` |

**Cómo se probó:** cada cambio se probó en un navegador automático (Chromium) simulando un iPhone, con los servidores externos simulados o bloqueados. Se probaron exportar e importar, el pin con toque largo (y que no aparezca con un toque corto ni al arrastrar), la tarjeta de un punto guardado, Cómo llegar con la ruta calculada, el buscador con un servidor lento (20 s), Quitar destino y los lugares.

**Falta probar en el iPhone real:**
- El menú Compartir al exportar.
- Que mantener apretado el mapa no abra el menú de "copiar o guardar imagen" de Safari.
- Tocar puntos o lugares muy cercanos entre sí (el radio de toque es de unos 24 px).
- Cómo se ven los íconos de lugares.

**Autor de los commits:** quedaron a nombre de `iangiribaldi` con el correo privado de GitHub, como dice "Cómo seguir en otra computadora". GitHub puede marcarlos "Unverified" (no están firmados); es solo una etiqueta.

**Pasar `test` a `main`** cuando todo esté aprobado: `git checkout main`, `git merge test`, `git push` y `git checkout test`.

## Limitaciones conocidas

- **Estilos de Stadia** (Suave, Outdoors, Terreno, Terreno sin nombres): funcionan porque el dominio `navimaps.github.io` está registrado en la cuenta de Stadia (https://client.stadiamaps.com/, plan gratis no comercial). Si se cambia el dominio, se borra la cuenta o se pasa el límite gratis, esos estilos muestran "401 Error"; OSM, Relieve y Satélite siguen andando.

- La ruta depende de lo que esté mapeado en OpenStreetMap. No sabe si un arroyo está seco, ni conoce profundidades, bajíos ni alturas de puentes. **No reemplaza las cartas oficiales.**
- En iPhone, el GPS deja de grabar si se apaga la pantalla o se cambia de app.
- El almacenamiento del navegador puede borrarse si la app no está agregada a la pantalla de inicio (Safari borra datos de sitios sin visitar en 7 días). Por eso conviene exportar una copia de seguridad cada tanto (Ajustes > Copia de seguridad).
- **Mudanza a navimaps.github.io:** Safari guarda los datos por dirección, así que la app nueva arrancó vacía. Los puntos y recorridos de la dirección vieja siguen en el iPhone, pero solo se pueden recuperar haciendo exportar/importar y volviendo a publicar la dirección vieja un rato.
- Sin conexión solo están los mosaicos que ya se vieron con señal; no hay descarga de zonas enteras (el servidor de OpenStreetMap no lo permite).
- Los mosaicos del servidor público de OpenStreetMap son para uso liviano.
- Los resultados de lugares dependen de la calidad de los datos de OSM en la zona.
- `cauces.json` y `lugares.json` son una foto del día en que se descargaron; conviene actualizarlos de vez en cuando. Si un recreo o proveeduría no está cargado en OpenStreetMap, no aparece: guardalo como punto propio.

## Próximos pasos posibles

- Actualizar `cauces.json` y `lugares.json` solos una vez por mes con GitHub Actions (como las alturas).
- Exportar el recorrido también en **GPX** para abrirlo en otras apps náuticas.
- Recuperar los datos de la dirección vieja: volver a publicar un rato `iangiribaldi.github.io/Maps-nautico/` con la v5, exportar desde ahí e importar en NaviMaps.
- Ordenar `js/app.js` en partes más chicas (mapa, gestos, panel, menú) con nombres de variables legibles.
- Probar **Preact** en lugar de React (mismo código con htm, unos 40 KB menos).
- **Base colaborativa** de muelles, bajíos y canales a partir de recorridos grabados.
- Usar los **recorridos propios** para mejorar el ruteo donde OSM no tiene datos.
- Pasar a **MapLibre** con estilos propios y **mapas sin conexión**.
- Evaluar más adelante una **app nativa** o empaquetarla con Capacitor.
- Cambiar a un proveedor de mapas con plan gratuito (por ejemplo MapTiler) para uso más intensivo.

## Alturas del río y mareas (cómo funciona)

Hecho el 13/11/2026 (v13). Todo es automático: no hay que correr nada a mano.

### De dónde salen los datos
- **INA (Instituto Nacional del Agua)**, API pública sin usuario: `https://alerta.ina.gob.ar/a5`.
  - Alturas medidas: `/obs/puntual/series/{id}/observaciones?timestart=...&timeend=...&format=json`.
  - Datos de la estación y qué pronóstico tiene: `/obs/puntual/series?id={id}&format=json` (campo `pronosticos`: `cal_id` y `series_id`).
  - Pronóstico hora por hora: `/sim/calibrados/{cal_id}/corridas/last?series_id={id}&includeProno=true&qualifier=main&format=json`.
  - Niveles de cada estación: alerta, evacuación y aguas bajas.
- **SHN (Servicio de Hidrografía Naval)**, páginas web (no tiene API):
  - Pleamares y bajamares corregidas por viento para San Fernando: https://www.hidro.gov.ar/oceanografia/pronostico.asp
  - Avisos y alertas de crecida o bajante: https://www.hidro.gov.ar/oceanografia/AACRIOPLA.asp
  - El gráfico de mareógrafos del SHN es solo una imagen, por eso las alturas medidas salen del INA.

### Estaciones
San Fernando, Tigre, Arroyo Carapachay, Canal Seoane, Paraná Miní, Chaná Miní, Carabelas, INTA Delta (Paraná de las Palmas), Escobar, Dique Luján, Campana, Zárate, Brazo Largo (Paraná Guazú), Guazucito, Canal Nuevo, Nueva Palmira, San Isidro y Buenos Aires. Se cambian en la lista `ESTACIONES` de `scripts/alturas.py` (el número es el id de la serie de alturas en el INA).
- Con medición cada hora: San Fernando, Carapachay, Canal Seoane, Paraná Miní, Carabelas, INTA Delta, Zárate, Brazo Largo, Nueva Palmira y Buenos Aires.
- Las escalas de Prefectura (Tigre, Escobar, Chaná Miní, etc.) se leen una vez por día.
- Con pronóstico del INA (hasta 3 o 4 días): San Fernando, Carabelas, INTA Delta, Campana, Zárate, Brazo Largo y Nueva Palmira.

### Cómo funciona
1. **`scripts/alturas.py`** (Python sin librerías extra) baja todo y arma **`alturas.json`** (unos 35 KB). Si una fuente falla, conserva lo que había en la versión publicada.
2. **`.github/workflows/publicar.yml`** corre solo **cada 30 minutos** (minutos 7 y 37 de cada hora), además de cada vez que se sube algo. Arma `alturas.json` y lo publica junto con la app (en la raíz y en `/test/`). **No se guarda en el repositorio**, así no se llena de commits. La tarea programada corre con la versión de `main`.
3. **`js/alturas.js`** lee `alturas.json` al abrir la app, cada 10 minutos y al volver a la app. Sin señal usa la última copia guardada (`sw.js` la pide primero a la red).

### Qué se ve en la app
- En el recuadro de arriba a la izquierda: la estación más cercana (a vos o al centro del mapa), con su altura y si sube (↑), baja (↓) o está quieta (→). Si hay un aviso del SHN, aparece "⚠ Aviso del SHN" en rojo.
- En el mapa, desde zoom 10: un cartelito 🌊 con la altura de cada estación, con el borde de color según el estado (verde normal, naranja alerta, rojo evacuación, amarillo aguas bajas). Las de lectura diaria se ven más claras.
- Al tocar el recuadro o un cartelito se abre un panel con:
  - Altura actual, estado y hace cuánto se midió.
  - Botones para cambiar de estación.
  - Gráfico con las últimas 24 h medidas y el pronóstico, con las líneas de alerta y aguas bajas.
  - Máximo y mínimo pronosticados.
  - En San Fernando, las próximas pleamares y bajamares del SHN y la corrección por viento.
  - El aviso del SHN, si hay.
- Capa "Alturas del río" en ☰ › Capas.

### A tener en cuenta
- Es la **altura sobre el cero de la escala, no la profundidad** del lugar.
- En el Río de la Plata manda más el **viento** (sudestada, viento norte) que la marea astronómica: por eso se usan el pronóstico del INA y la corrección del SHN.
- Si el SHN o el INA cambian sus páginas o su API, `alturas.py` deja de traer esa parte. La app muestra hace cuánto es el dato, y GitHub manda un mail cuando una tarea falla.
- GitHub puede correr las tareas programadas con atraso, y **las desactiva si el repositorio pasa 60 días sin cambios**. Si pasa, se reactivan en GitHub › Actions › Publicar › Enable workflow.
- Para probar el script en la compu: `python3 scripts/alturas.py alturas.json` (Windows: `py scripts\alturas.py alturas.json`).

## Zonas deportivas (cómo se armaron)

Hecho el 13/11/2026 (v14).

**Fuente:** la Prefectura Naval publica las zonas habilitadas como **imágenes** (croquis sobre la carta náutica), no como datos de mapa: https://www.argentina.gob.ar/prefecturanaval/deportesnauticos/referencia-mapa-practica-deportiva. Colores: amarillo remo y SUP, rojo esquí y wakeboard, verde vela, azul windsurf y kite, marrón motonáutica, negro moto de agua o jet ski, gris fondeo, naranja flyboard.

**Áreas pasadas (34 zonas en `zonas.json`, 15 aproximadas):**
- **Primera sección de islas** (frente a Tigre y San Fernando): remo en muchos arroyos, fondeo, vela en el Paraná de las Palmas y esquí y wake en la desembocadura del Palmas, el Canal del Este, el Río San Antonio y un tramo cerca del Palmas (en ese croquis el rojo del esquí es más oscuro).
- **Segunda sección:** esquí y wake en todo el Río Barca Grande y en el tramo medio del Paraná Miní; jet ski en el Arroyo La Barquita y el Canal Nº 4; motonáutica en el Paraná Miní hasta la desembocadura.
- **Canal Costanero:** jet ski frente a San Isidro, windsurf y kite frente a San Isidro y Olivos, vela en el río abierto y remo pegado a la costa.
- **Escobar:** esquí y wake en el Paraná de las Palmas, km 77,5 a 81 (margen derecha).
- **Paraná Guazú y Pasaje Talavera:** esquí y wake en el Talavera, vela en el Guazú y jet ski cerca de Cinco Bocas.
- Faltan los croquis de Campana, Zárate, Ibicuy, Baradero, San Pedro y Paso Los Ratones (se pueden sumar igual).

**Cómo se pasaron:** cada croquis se ubicó sobre el mapa con puntos conocidos (cruces de ríos de `cauces.json`, clubes náuticos y pueblos buscados en OpenStreetMap). Después se separó cada color, y las líneas se pegaron al trazado real del río cuando se pudo reconocer cuál era. Las que no siguen un río mapeado o están en agua abierta quedaron **aproximadas** (se dibujan punteadas en la app; error de unos cientos de metros). Por qué quedan aproximadas: el croquis es un escaneo de una carta dibujada (no es un mapa exacto y está deformado distinto en cada parte), muchas líneas de remo y fondeo siguen arroyitos que la carta dibuja con línea punteada y que no están cargados en OpenStreetMap, y las áreas del Canal Costanero están en agua abierta (no hay río al que pegarlas). Para mejorarlas: decirle a Claude qué arroyo es cada una (o cargar el arroyo en OpenStreetMap). En `zonas.json`: `d` deporte, `t` tipo (`l` línea, `a` área), `s` sección, `ap` aproximada, `p` puntos `[lat, lng]`.

**En la app:** desde zoom 11 se ven las líneas y áreas con el color de cada deporte. Al tocar una, la tarjeta dice el deporte, la sección, el largo y si es aproximada, con un botón al croquis original. Capa "Zonas deportivas" en ☰ › Capas, con las referencias de colores. **Es una referencia: vale lo que dice la disposición vigente de la Prefectura.**
