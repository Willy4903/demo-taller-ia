# Perú en Claro

Sitio web sobre la coyuntura peruana: política, economía, salud, tecnología, deporte, investigación, coyuntura y mundo. Incluye una **Ruta gamificada** (misiones, XP, niveles, insignias), **glosario**, **fuentes** y un **insight** con fuentes enlazadas.

- Sin dependencias externas: HTML + CSS + JavaScript puro. Se abre con doble clic en `index.html`.
- Se actualiza solo a las **08:00** y **23:00 (hora de Lima)** mediante GitHub Actions.

## Cómo activarlo en GitHub (una sola vez)

1. Fusiona esta rama en `main` (el cron de GitHub solo corre desde la rama por defecto).
2. En el repositorio: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. En **Actions → “Actualizar Perú en Claro” → Run workflow** para la primera publicación.
4. La URL aparecerá en el job *publicar* (normalmente `https://<usuario>.github.io/demo-taller-ia/`).

## Cómo se actualiza

`scripts/actualizar_noticias.py` (solo biblioteca estándar de Python):

1. Descarga los feeds RSS/Atom de la lista `FEEDS` (medios independientes, comerciales e internacionales).
2. Clasifica cada nota por sector con palabras clave; deduplica por URL y título.
3. Conserva como máximo 24 notas por sector y descarta lo anterior a 30 días.
4. Reescribe `data/noticias.js` y `data/noticias.json`. Si ningún feed responde, **no** toca los datos.

El flujo hace commit de los datos y publica el sitio. Para agregar o quitar medios, edita `FEEDS`.

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
