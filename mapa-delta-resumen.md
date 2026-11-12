# Mapa del Delta — Resumen del proyecto

App web tipo "Google Maps / Wavve" para navegar los ríos y arroyos del Delta del Paraná (Buenos Aires). Se publica como página estática en GitHub Pages y se usa desde el iPhone (se puede agregar a la pantalla de inicio desde Safari).

## Cómo llegamos hasta acá

1. **Idea inicial:** app para iPhone. Evaluamos Swift nativo (requiere Mac, Xcode y cuenta de desarrollador de USD 99/año) y se decidió empezar con una **app web**, más simple y sin esas barreras.
2. **Prototipo v1:** HTML + JavaScript puro, mapa dibujado a mano sobre `<canvas>`.
3. **Publicación:** repositorio `Maps-nautico` en GitHub, con GitHub Pages. Aprendimos que el archivo tiene que llamarse exactamente `index.html` (Windows había creado `index.html.html`).
4. **Pulido para celular:** pantalla completa, zoom con pellizco, botones grandes, panel inferior.
5. **Migración a React** en un solo archivo, sin compilar (React por CDN + htm), en lugar de React + Vite.
6. **Funciones tipo Wavve:** satélite, clima, destino, ruta por agua.
7. **Ronda grande de funciones:** menú, buscador, rotación, capas, estilo de vidrio.
8. **Rendimiento:** caché, servidores de respaldo y archivo local de cauces.
9. **Ajustes finales:** zona muerta de rotación, prioridad de ríos, colores y animación de la ruta.
10. **Modo sin conexión (v1, 12/11/2026):** service worker, manifiesto e íconos. La app, los cauces y los mosaicos ya vistos funcionan sin señal.
11. **Arreglos y módulos (v2, 12/11/2026):** batería (destello que se detiene, canvas a 2x), recorrido con filtro de 10 m y guardado espaciado, se recuerdan crucero y satélite, límite de mosaicos en memoria, CSS ordenado y código separado en `js/`.
12. **Git y GitHub CLI:** desde la v2 los cambios se suben con `git push` en lugar de subirlos a mano por la web.

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
- **Marcar** puntos con nombre en el centro del mapa.
- **Grabar recorrido** con distancia en millas náuticas; mantiene la pantalla encendida mientras graba.
- Todo se guarda en el navegador del celular.

### Navegación y ruta
- **Destino** con el botón "Ir ahí", con ➤ desde un punto guardado, o desde el buscador.
- **Origen elegible:** tu ubicación u otro punto marcado en el mapa.
- **Ruta por agua** calculada sobre los cauces de OpenStreetMap (algoritmo de camino más corto con pesos).
- **Prioridad de cauces** (Ajustes): *Directa*, *Equilibrada* o *Ríos primero* (por defecto). Penaliza arroyos y cauces marcados como intermitentes o no navegables.
- Muestra distancia (mn y km), tiempo estimado según la velocidad de crucero (ajustable) y el aviso de que no reemplaza las cartas oficiales.
- Ruta dibujada en **verde fluo** con **destello animado** que recorre la curva del origen al destino.

### Buscador
- **Lugares:** restaurantes, combustible, marinas y muelles, bares y cafés, proveedurías, alojamiento y salud. Se muestran pines en el mapa y una lista desplegable con orden por **más cercano** o A–Z.
- **Ríos, arroyos y canales:** se buscan por nombre (con o sin tildes), se resaltan en **rojo** y el mapa vuela hasta mostrar el tramo completo.
- Historial de búsquedas y sugerencias.

### Menú hamburguesa (☰)
- **Puntos:** lista de marcadores guardados, con renombrar, usar de destino o borrar.
- **Capas:** interruptores para puntos, recorrido, destino y ruta, clima y satélite.
- **Historial:** búsquedas recientes, con opción de borrar.
- **Ajustes:** tema (auto, claro, oscuro), velocidad de crucero, prioridad de cauces, estado de los cauces guardados y borrar recorrido.

### Diseño
- Estilo de **vidrio esmerilado** (tipo liquid glass) con transiciones suaves.
- Panel inferior **plegable** (con resumen de la ruta cuando está plegado).

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
| `descargar-cauces.ps1` | Script de PowerShell que baja el Delta en 6 partes y arma `cauces.json` |
| `sw.js` | Service worker: guarda la app, los cauces y los mosaicos vistos para usarla sin señal |
| `manifest.webmanifest` | Nombre, colores e íconos para instalarla en la pantalla de inicio |
| `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | Íconos de la app |
| `mapa-delta.html` | Primer prototipo (ya no se usa) |

Link: https://iangiribaldi.github.io/Maps-nautico/

Este resumen (`mapa-delta-resumen.md`) también está en el repositorio, para retomar el trabajo desde cualquier computadora.

## Cómo actualizar la app

1. **Siempre** subir el número de `VERSION` en `sw.js` (`v2` → `v3`…) cuando cambia `index.html`, algo de `js/` o `cauces.json`. Si no, los celulares siguen usando la copia guardada.
2. Subir los cambios con Git (`git add`, `git commit`, `git push`) o, si no hay Git a mano, con Add file > Upload files en la web (la carpeta `js` se arrastra entera).
3. GitHub Pages tarda uno o dos minutos en publicar. En el iPhone: abrir la app con señal, cerrarla y volver a abrirla.
4. Para refrescar los cauces: correr de nuevo `descargar-cauces.ps1`, subir el nuevo `cauces.json` y la `VERSION`.

## Cómo seguir en otra computadora

1. Instalar Git y GitHub CLI. En Windows: `winget install --id Git.Git -e` y `winget install --id GitHub.cli -e` (en Mac: `brew install git gh`).
2. Iniciar sesión: `gh auth login --web` (aceptar "Authenticate Git", pegar el código en el navegador y autorizar).
3. Bajar el proyecto: `gh repo clone iangiribaldi/Maps-nautico` y trabajar dentro de esa carpeta.
4. Configurar el autor de los cambios (una vez por computadora, dentro de la carpeta): `git config user.name "iangiribaldi"` y como correo la dirección privada `<id>+iangiribaldi@users.noreply.github.com` (el número sale de `gh api user --jq .id`).
5. Para probar en la computadora hace falta un servidor local, porque los módulos y el service worker no funcionan abriendo el archivo con doble clic. Por ejemplo `npx serve` (Node) o `python -m http.server 8765`, y abrir `http://localhost:8765`.
6. Antes de empezar, `git pull` para traer lo último; al terminar, subir `VERSION`, `git commit` y `git push`.
7. Con Claude Code: abrir esa carpeta y pedirle que lea `mapa-delta-resumen.md` para tener todo el contexto.

## Limitaciones conocidas

- La ruta depende de lo que esté mapeado en OpenStreetMap. No sabe si un arroyo está seco, ni conoce profundidades, bajíos ni alturas de puentes. **No reemplaza las cartas oficiales.**
- En iPhone, el GPS deja de grabar si se apaga la pantalla o se cambia de app.
- El almacenamiento del navegador puede borrarse si la app no está agregada a la pantalla de inicio (Safari borra datos de sitios sin visitar en 7 días). Todavía no hay exportar/importar.
- Sin conexión solo están los mosaicos que ya se vieron con señal; no hay descarga de zonas enteras (el servidor de OpenStreetMap no lo permite).
- Los mosaicos del servidor público de OpenStreetMap son para uso liviano.
- Los resultados de lugares dependen de la calidad de los datos de OSM en la zona.
- `cauces.json` es una foto del día en que se descargó; conviene actualizarlo de vez en cuando.

## Próximos pasos posibles

- **Altura del río y mareas** (datos del INA o SIHN, a verificar qué publican).
- **Exportar e importar** los puntos y recorridos (prioridad: protege los datos guardados).
- Ordenar `js/app.js` en partes más chicas (mapa, gestos, panel, menú) con nombres de variables legibles.
- Probar **Preact** en lugar de React (mismo código con htm, unos 40 KB menos).
- **Base colaborativa** de muelles, bajíos y canales a partir de recorridos grabados.
- Usar los **recorridos propios** para mejorar el ruteo donde OSM no tiene datos.
- Pasar a **MapLibre** con estilos propios y **mapas sin conexión**.
- Evaluar más adelante una **app nativa** o empaquetarla con Capacitor.
- Cambiar a un proveedor de mapas con plan gratuito (por ejemplo MapTiler) para uso más intensivo.
