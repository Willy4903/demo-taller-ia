# Contexto Perú

Portal de noticias sobre la coyuntura peruana: política, economía, salud, tecnología, inteligencia artificial (Perú y mundo), deporte, investigación, coyuntura y mundo. Panel *Bento Grid* oscuro por defecto y *mobile-first* (análisis, Ruta, indicadores y glosario en la portada, páginas de lectura, Estadísticas, Historial, barra inferior para iPhone/Android y búsqueda), con **Ruta gamificada** (misiones, XP, niveles, insignias), **glosario A–Z**, **fuentes** y análisis con fuentes enlazadas.

- Sin dependencias de código: HTML + CSS + JavaScript puro (solo las tipografías vienen de Google Fonts). Se abre con doble clic en `index.html`.
- Instalable como app: en iPhone, Safari → Compartir → *Añadir a pantalla de inicio*; en Android, menú → *Instalar app*. Funciona sin conexión con lo último que cargó (service worker, solo en https).
- Las fotos son reales: la `og:image` de cada nota y, para los análisis, la de la primera fuente citada que la tenga (con crédito). Si no hay foto, la nota se muestra sin imagen; no se usan ilustraciones generadas.
- El tipo de cambio (USD/PEN) se lee de la API pública del BCRP en cada actualización; si falla, se conserva el último dato.
- Se actualiza solo a las **08:00** y **23:00 (hora de Lima)** mediante GitHub Actions.

## Publicación en GitHub Pages

Contexto Perú comparte el sitio de GitHub Pages con el simulador de la Liga 1 que ya existe en este repositorio:

- Simulador: `https://<usuario>.github.io/demo-taller-ia/`
- Contexto Perú: `https://<usuario>.github.io/demo-taller-ia/peru-en-claro/`

El flujo `CI y despliegue` (`.github/workflows/ci-deploy.yml`) copia esta carpeta a `dist/peru-en-claro/` antes de publicar.

El sitio se sirve desde la rama `gh-pages` (Settings → Pages → Deploy from a branch). El job `publicar-peru` copia esta carpeta a `gh-pages/peru-en-claro/` sin tocar el resto de la rama. El job `deploy` (GitHub Actions) solo aplica si se cambia el origen de Pages a "GitHub Actions"; mientras tanto puede fallar sin afectar la publicación.

## Cómo se actualiza

`scripts/actualizar_noticias.py` (solo biblioteca estándar de Python):

1. Descarga los feeds RSS/Atom de la lista `FEEDS` (medios independientes, comerciales e internacionales).
2. Clasifica cada nota por sector con palabras clave; deduplica por URL y título.
3. Conserva como máximo 24 notas por sector y descarta lo anterior a 30 días.
4. Reescribe `data/noticias.js` y `data/noticias.json`. Si ningún feed responde, **no** toca los datos.

El flujo `Actualizar Contexto Perú` corre a las 08:00 y 23:00 (hora de Lima), hace commit de los datos en `main` e invoca `CI y despliegue` para republicar. Para agregar o quitar medios, edita `FEEDS`. También puede lanzarse a mano desde la pestaña *Actions*.

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
