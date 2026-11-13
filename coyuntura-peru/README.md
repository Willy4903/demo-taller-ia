# Contexto Perú

Portal de noticias sobre la coyuntura peruana: política, economía, salud, El Niño, tecnología, inteligencia artificial (Perú y mundo), deporte, investigación, coyuntura y mundo. Panel *Bento Grid* oscuro por defecto y *mobile-first* (análisis, Ruta, indicadores y glosario en la portada, páginas de lectura, Estadísticas, Historial, barra inferior para iPhone/Android y búsqueda), con **Ruta gamificada** (misiones, XP, niveles, insignias), **glosario A–Z**, **fuentes** y análisis con fuentes enlazadas.

- Diseño editorial con modo claro por defecto y modo oscuro opcional (`assets/editorial.css`). La vista Noticias usa dos columnas: herramientas (buscador, categorías, fuente y orden), noticia principal con sugerencia de dónde contrastar sus cifras, cuadrícula de notas con botones para compartir y contrastar, y el "Radar de coyuntura oficial" con cifras de referencia (BCRP, INEI, ENFEN y CDC-Minsa, cada una con su fecha de corte), la guía "Antes de compartir" y el estado de los siete cortes diarios.
- Sin dependencias de código: HTML + CSS + JavaScript puro (solo las tipografías vienen de Google Fonts). Se abre con doble clic en `index.html`.
- Instalable como app: en iPhone, Safari → Compartir → *Añadir a pantalla de inicio*; en Android, menú → *Instalar app*. Funciona sin conexión con lo último que cargó (service worker, solo en https).
- Las fotos son reales: la `og:image` de cada nota (descartando logotipos e íconos del sitio) y, para los análisis, la de la primera fuente citada que la tenga (con crédito). Los enlaces de Google Noticias se resuelven a la nota original del medio (`url_medio`) para tomar su foto y enlazarla directamente. Una nota sin foto original no se publica: el actualizador la reintenta en las ejecuciones siguientes (hasta 6 veces) y, si la foto no carga en el navegador, la tarjeta se retira. Nunca se usan ilustraciones ni íconos de reemplazo.
- Una línea dinámica (de derecha a izquierda) muestra lo último: tipo de cambio, estado de El Niño, análisis y notas recientes. Se pausa al pasar el cursor o con el botón; con "reducir movimiento" queda estática.
- El tipo de cambio (USD/PEN) se lee de la API pública del BCRP; si falla, se usa un valor referencial de una API pública sin clave y se acumula entre ejecuciones. Si ambas fallan, se conserva el último dato.
- Se actualiza automáticamente **7 veces al día** (00:17, 06:17, 10:17, 12:17, 15:17, 18:17 y 21:17, hora de Lima) mediante GitHub Actions.

## Publicación en GitHub Pages

Contexto Perú vive en una carpeta del sitio de GitHub Pages del repositorio (la raíz del sitio es otro proyecto y no forma parte de Contexto Perú):

- Contexto Perú: `https://<usuario>.github.io/demo-taller-ia/peru-en-claro/`

El flujo `CI y despliegue` (`.github/workflows/ci-deploy.yml`) copia esta carpeta a `dist/peru-en-claro/` antes de publicar.

El sitio se sirve desde la rama `gh-pages` (Settings → Pages → Deploy from a branch). El job `publicar-peru` copia esta carpeta a `gh-pages/peru-en-claro/` sin tocar el resto de la rama. El job `deploy` (GitHub Actions) solo aplica si se cambia el origen de Pages a "GitHub Actions"; mientras tanto puede fallar sin afectar la publicación.

## Cómo se actualiza

`scripts/actualizar_noticias.py` (solo biblioteca estándar de Python):

1. Descarga los feeds RSS/Atom de la lista `FEEDS` (medios independientes, comerciales e internacionales).
2. Clasifica cada nota por sector con palabras clave; deduplica por URL y título.
3. Conserva como máximo 24 notas por sector y descarta lo anterior a 30 días.
4. Reescribe `data/noticias.js` y `data/noticias.json`. Si ningún feed responde, **no** toca los datos.

El flujo `Actualizar PERÚ INFORMADO` corre 7 veces al día (00:17, 06:17, 10:17, 12:17, 15:17, 18:17 y 21:17, hora de Lima), hace commit de los datos en `main` e invoca `CI y despliegue` para republicar. Para agregar o quitar medios, edita `FEEDS`. También puede lanzarse a mano desde la pestaña *Actions*.

## Prensa del día (sección de #/datos)

Cada día lee los PDF de diarios que se comparten en un grupo de Telegram y muestra en `#/datos`: síntesis (opcional), temas, tendencia de 7 días, palabras más repetidas (con ▲ en alza), regiones mencionadas, personas e instituciones, cifras citadas, agenda por diario y titulares con su página.

Flujo `Actualizar prensa del día` (`.github/workflows/actualizar-medios.yml`, 12:47 y 15:47 hora de Lima):

1. `scripts/medios_telegram.py descargar` baja los PDF nuevos del grupo (Telethon, sesión de usuario; un bot no puede leer grupos ajenos ni bajar archivos de más de 20 MB).
2. `scripts/actualizar_medios.py` los lee con PyMuPDF: titulares por tamaño de letra, tema por palabras clave, palabras, lugares, entidades y cifras.
3. Escribe `data/medios.json` (60 días) y `data/medios.js` (detalle de 7 días y serie liviana). Los PDF no se guardan.
4. Valida, hace commit en `main` e invoca `CI y despliegue`.

Qué se guarda y qué no: solo titulares breves (máximo 30 por diario, con página) y conteos. Nunca el texto de las notas ni los PDF, y `validar_contenido.py` lo exige. Las ediciones escaneadas (solo imagen) se registran como «sin texto»; leerlas requeriría OCR.

### Configuración (una sola vez)

1. En https://my.telegram.org entra a «API development tools» y crea una app: obtienes `api_id` y `api_hash`.
2. En tu computadora: `pip install -r coyuntura-peru/scripts/requirements-medios.txt` y `python coyuntura-peru/scripts/medios_telegram.py login`. Pide tu teléfono y el código que llega a Telegram, e imprime la cadena de sesión.
3. Con `TG_API_ID`, `TG_API_HASH` y `TG_SESSION` definidos en tu terminal, `python coyuntura-peru/scripts/medios_telegram.py listar` muestra los grupos y su id.
4. En GitHub, Settings > Secrets and variables > Actions, crea: `TG_API_ID`, `TG_API_HASH`, `TG_SESSION`, `TG_GRUPO` (id o nombre exacto del grupo) y, si quieres la síntesis redactada con IA, `ANTHROPIC_API_KEY` (opcional; el modelo se cambia con la variable `MEDIOS_MODELO`).
5. Lanza el flujo a mano desde Actions con «Run workflow» (parámetro `dias` para traer más historia).

Seguridad: `TG_SESSION` da acceso completo a esa cuenta de Telegram. Solo va como secreto del repositorio, nunca en archivos. Considera usar una cuenta secundaria que sea miembro del grupo. Mientras falten los secretos, el flujo termina sin error y lo explica en su resumen; la web muestra «Todavía no hay lectura de prensa».

### Derechos

Las ediciones y los titulares pertenecen a cada diario. La web muestra solo titulares breves con su página y estadísticas propias; no publica notas ni PDF. Publicar o redistribuir las ediciones completas no es parte de este proyecto.

### Ajustes frecuentes

- Nombres de diarios: `parse_nombre` en `scripts/medios_analisis.py` toma el nombre y la fecha del archivo (`PERU 🇵🇪 EL COMERCIO 121126.pdf`). Para fijar un nombre, agrégalo a `CANONICOS`.
- Temas y regiones: listas `TEMAS` y `REGIONES` en el mismo archivo; las pruebas están en `scripts/test_medios.py` y `tests/medios.test.cjs`.
- Los titulares se detectan por tamaño de letra (≥1,8 veces el texto corrido). En diarios con diseño atípico conviene revisar el primer día publicado.

## Talleres de IA

`data/talleres.js` controla la promoción de los talleres: autor, lista de talleres, enlaces de contacto (WhatsApp, TikTok, web) y "otras páginas". Se muestra en la franja del inicio, en la sección Inteligencia artificial, en la Ruta, en el pie y en la página `#/talleres`. Para agregar precios o fechas, completa el campo `detalle` de cada taller.

## Contenido editorial

`data/editorial.js` contiene los insights, el glosario, las misiones y el directorio de fuentes. Cada cifra lleva fuente enlazada y fecha de corte (`corte`). **Revisa y actualiza ese archivo** cuando cambie la coyuntura: es la parte editorial, no se genera sola.

## Vista previa local

```bash
cd coyuntura-peru
python3 -m http.server 8000   # luego abre http://localhost:8000
python3 scripts/actualizar_noticias.py   # prueba el actualizador (requiere internet)
```

## Notas de honestidad

- Los feeds RSS pueden cambiar de URL o dejar de existir; el reporte de cada ejecución muestra qué fuentes respondieron (`estado_fuentes` en `data/noticias.json`).
- La clasificación por sector es automática y puede equivocarse.
- Titulares y resúmenes pertenecen a cada medio; el sitio enlaza siempre a la fuente original.
- El proyecto no está afiliado a los medios citados. “Independiente” significa autonomía editorial, no neutralidad.

## Calidad y pruebas

- `scripts/test_actualizador.py`: pruebas del actualizador sin red (parseo, clasificación, duplicados, antigüedad, respaldo de feeds, validación, ENFEN, indicadores). `python3 -m unittest discover -s coyuntura-peru/scripts -p "test_*.py"`.
- `scripts/validar_contenido.py`: revisa noticias (fechas, duplicados, sector, dirección), estado de fuentes, indicadores del contenido editorial (unidad, fecha de corte y fuente primaria), enlaces con https y estructura de `index.html`. Sale con error si algo grave falla.
- `scripts/verificar_enlaces.py`: comprueba que respondan los enlaces de las fuentes (informativo).
- `tests/e2e_rutas.cjs`: Playwright. Recorre todas las rutas `#/` en 390, 430, 768, 1024 y 1440 px y revisa errores de consola, desplazamiento horizontal, tarjetas de la portada, datos con fecha de corte y unidad, navegación, búsqueda y menú.
- `tests/newsroom.test.cjs`: pruebas de cifras publicadas (unidades monetarias, porcentajes y temperaturas), sin truncar escalas ni combinar números de campos distintos. `node --test coyuntura-peru/tests/newsroom.test.cjs`.
- `tests/newsroom.e2e.cjs`: comprueba filtros por fuente y género, orden por fecha, paginación independiente, búsqueda, foco de teclado, fotografías fallidas y temas claro/oscuro con datos controlados. `node coyuntura-peru/tests/newsroom.e2e.cjs`. Ambos runners de navegador admiten `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` para usar un Chromium ya instalado.
- Flujos: `Validar Contenido Perú` corre todo lo anterior en cada pull request; `Actualizar PERÚ INFORMADO` prueba, actualiza, valida y solo entonces guarda y publica.

## Fuentes de noticias que fallan

El actualizador prueba varias direcciones por medio. Si ninguna funciona usa Google Noticias restringido al dominio del medio. Esas notas se marcan «vía Google Noticias» y nunca como directas. Si tampoco hay datos, se conservan las últimas notas válidas y la fuente figura «Sin datos» con la fecha de comprobación y el error (página Fuentes).

Los horarios son previstos: GitHub Actions puede retrasarlos. Se usa el minuto 17 para evitar la congestión del inicio de hora. Una pestaña abierta comprueba cada cinco minutos si hay una publicación nueva, y al volver a ella o recuperar conexión, conservando los filtros de Noticias. Si no hay conexión, mantiene la última carga válida.

## Ubicación de las noticias y control de extractos

El ámbito se determina por referencias geográficas en el titular, el extracto y las secciones verificables de la URL. El país del medio y el campo heredado `ambito` no deciden la ubicación. Un medio peruano puede publicar una noticia internacional y un medio internacional puede informar sobre Perú. Los casos sin evidencia suficiente quedan en **Ámbito por confirmar**; no se asignan por defecto a Perú.

`data/geografia.json` contiene las reglas compartidas. `scripts/geografia.py` y `assets/geografia.js` aplican la misma precedencia; las pruebas contrastan sus resultados sobre todos los registros y casos reales de regresión. El actualizador genera `data/geografia.js` desde el JSON para la web. Para regenerarlo tras editar reglas: `python3 -c "import sys; sys.path.insert(0, 'coyuntura-peru/scripts'); from geografia import generar_js; generar_js()"` desde la raíz del repositorio.

Cada registro conserva `geografia.version`, `zona` y `motivo`. El validador impide publicar discrepancias entre esos campos y las reglas vigentes. La limpieza de extractos quita controles de lectura, promociones y solicitudes de donación; conserva cifras únicamente con evidencia textual. Las noticias sobre un mismo hecho en distintos medios se conservan como fuentes distintas, sin confundirlas con URLs duplicadas.
