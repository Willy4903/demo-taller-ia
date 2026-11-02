# Perú en Claro

Portal de noticias sobre la coyuntura peruana: política, economía, salud, tecnología, inteligencia artificial (Perú y mundo), deporte, investigación, coyuntura y mundo. Diseño editorial *mobile-first* (portada con nota principal, listas con miniaturas, páginas de lectura, barra inferior para iPhone/Android, modo oscuro y búsqueda), con **Ruta gamificada** (misiones, XP, niveles, insignias), **glosario A–Z**, **fuentes** y análisis con fuentes enlazadas.

- Sin dependencias externas: HTML + CSS + JavaScript puro. Se abre con doble clic en `index.html`.
- Instalable como app: en iPhone, Safari → Compartir → *Añadir a pantalla de inicio*; en Android, menú → *Instalar app*. Funciona sin conexión con lo último que cargó (service worker, solo en https).
- Las fotos de portada se toman de la etiqueta `og:image` de cada nota; si falta, se muestra una ilustración generada.
- Se actualiza solo a las **08:00** y **23:00 (hora de Lima)** mediante GitHub Actions.

## Publicación en GitHub Pages

Perú en Claro comparte el sitio de GitHub Pages con el simulador de la Liga 1 que ya existe en este repositorio:

- Simulador: `https://<usuario>.github.io/demo-taller-ia/`
- Perú en Claro: `https://<usuario>.github.io/demo-taller-ia/peru-en-claro/`

El flujo `CI y despliegue` (`.github/workflows/ci-deploy.yml`) copia esta carpeta a `dist/peru-en-claro/` antes de publicar.

**Requisito (una sola vez):** en el repositorio, *Settings → Pages → Build and deployment → Source: **GitHub Actions***. Si el job `deploy` falla de inmediato y sin pasos, es porque falta este ajuste.

## Cómo se actualiza

`scripts/actualizar_noticias.py` (solo biblioteca estándar de Python):

1. Descarga los feeds RSS/Atom de la lista `FEEDS` (medios independientes, comerciales e internacionales).
2. Clasifica cada nota por sector con palabras clave; deduplica por URL y título.
3. Conserva como máximo 24 notas por sector y descarta lo anterior a 30 días.
4. Reescribe `data/noticias.js` y `data/noticias.json`. Si ningún feed responde, **no** toca los datos.

El flujo `Actualizar Perú en Claro` corre a las 08:00 y 23:00 (hora de Lima), hace commit de los datos en `main` e invoca `CI y despliegue` para republicar. Para agregar o quitar medios, edita `FEEDS`. También puede lanzarse a mano desde la pestaña *Actions*.

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
