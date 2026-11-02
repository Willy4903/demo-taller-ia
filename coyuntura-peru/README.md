# Contexto Perú

Portal de noticias sobre la coyuntura peruana: política, economía, salud, El Niño, tecnología, inteligencia artificial (Perú y mundo), deporte, investigación, coyuntura y mundo. Panel *Bento Grid* oscuro por defecto y *mobile-first* (análisis, Ruta, indicadores y glosario en la portada, páginas de lectura, Estadísticas, Historial, barra inferior para iPhone/Android y búsqueda), con **Ruta gamificada** (misiones, XP, niveles, insignias), **glosario A–Z**, **fuentes** y análisis con fuentes enlazadas.

- Sin dependencias de código: HTML + CSS + JavaScript puro (solo las tipografías vienen de Google Fonts). Se abre con doble clic en `index.html`.
- Instalable como app: en iPhone, Safari → Compartir → *Añadir a pantalla de inicio*; en Android, menú → *Instalar app*. Funciona sin conexión con lo último que cargó (service worker, solo en https).
- Las fotos son reales: la `og:image` de cada nota y, para los análisis, la de la primera fuente citada que la tenga (con crédito). Si no hay foto, la nota se muestra sin imagen; no se usan ilustraciones generadas.
- Una línea dinámica (de derecha a izquierda) muestra lo último: tipo de cambio, estado de El Niño, análisis y notas recientes. Se pausa al pasar el cursor o con el botón; con "reducir movimiento" queda estática.
- El tipo de cambio (USD/PEN) se lee de la API pública del BCRP; si falla, se usa un valor referencial de una API pública sin clave y se acumula entre ejecuciones. Si ambas fallan, se conserva el último dato.
- Se actualiza solo a las **7 veces al día** (00:00, 06:00, 10:00, 12:00, 15:00, 18:00 y 21:00, hora de Lima) mediante GitHub Actions.

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

El flujo `Actualizar Contexto Perú` corre 7 veces al día (00:00, 06:00, 10:00, 12:00, 15:00, 18:00 y 21:00, hora de Lima), hace commit de los datos en `main` e invoca `CI y despliegue` para republicar. Para agregar o quitar medios, edita `FEEDS`. También puede lanzarse a mano desde la pestaña *Actions*.

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
