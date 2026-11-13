# Inglés con input

App web estática para que un hispanohablante de nivel básico aprenda inglés con la metodología de input comprensible. HTML, CSS y JavaScript puro: sin backend, sin frameworks, sin paso de compilación. Todo el progreso se guarda en el navegador (localStorage).

## Qué incluye

| Módulo | Qué hace |
| --- | --- |
| Escuchar y leer | Historias originales de 80 a 150 palabras en un lector inmersivo oscuro. Reproductor flotante con onda de progreso, velocidad 0.75x, 1.0x o 1.25x y resaltado palabra por palabra. Interruptor "Ver pronunciación" que muestra sobre cada palabra cómo suena escrita en español. Al tocar una palabra se abre una tarjeta con IPA, pronunciación aproximada, traducción, audio normal y lento (0.65x) y botón para guardarla. Traducción oculta por oración. |
| Shadowing | Práctica frase por frase: escuchas, grabas con el micrófono y `SpeechRecognition` compara. Muestra el porcentaje de coincidencia y las palabras falladas. |
| Vocabulario | Tarjetas con frases completas y repetición espaciada SM-2. Las palabras guardadas en las historias se convierten en tarjetas con su frase de origen. |
| Conversación guiada | Diálogos ramificados. La app dice una línea, respondes hablando o escribiendo, se valida con palabras clave y ves una respuesta modelo. Incluye un gancho opcional para una IA mediante tu propio backend. |
| Progreso | Racha diaria, minutos estudiados, palabras aprendidas y plan de 40 minutos (15 input, 10 shadowing, 10 conversación, 5 repaso) con checklist. |
| Gramática de apoyo | Explicaciones de 3 líneas que aparecen solo cuando fallas varias veces la misma estructura. |

Principios de diseño:

- Sin niveles tradicionales. El contenido se organiza por 10 situaciones reales (presentarse, trabajo, comida, viajes, compras, salud, ciudad, casa, tiempo libre, hotel).
- Cada contenido termina con tres botones: "Muy fácil", "Justo" y "Difícil". La app mueve internamente un valor de comodidad (de 1 a 3) por tipo de actividad y recomienda lo que queda más cerca. Lo que marcas como difícil vuelve más adelante para repasarlo.
- Interfaz en español, contenido de aprendizaje en inglés.
- Sistema de diseño oscuro "Cyber-EdTech" (paneles de cristal, Plus Jakarta Sans e Inter), foco visible, navegación por teclado, etiquetas para lectores de pantalla y respeto de `prefers-reduced-motion`.
- Biblioteca (`#/`) con "Continúa tu lectura", buscador, filtros por nivel (A1, A2, B1 según la dificultad del contenido) y temática, anillo de avance por historia, actividad semanal y palabras nuevas. Barra superior con racha, nivel y meta diaria de lectura (se configura en Ajustes).

## Estructura de carpetas

```
ingles-input/
  index.html            Página única (la app usa rutas con #/)
  css/app.css           Sistema de diseño: tokens, estructura y componentes
  css/reader.css        Vista de lectura, tarjeta de pronunciación y reproductor
  js/
    app.js              Arranque, navegación, contexto compartido
    util.js             Utilidades puras: comparación de voz, palabras clave, glosario
    store.js            Estado en localStorage, exportar e importar, racha
    srs.js              Repetición espaciada SM-2
    adapt.js            Ajuste de dificultad según tus valoraciones
    grammar.js          Detección de fallos repetidos
    speech.js           Síntesis y reconocimiento de voz
    timer.js            Minutos de estudio reales
    ai.js               Conexión opcional con tu backend de IA
    data.js, ui.js      Carga de JSON y componentes de interfaz
    views/              Una vista por módulo (library.js: portadas, tarjetas y filtros de la biblioteca)
  data/                 Contenido en JSON (aquí se amplía)
    situations.json  stories.json  dialogues.json  phrases.json  grammar.json  glossary.json
    pronunciation.json   IPA y pronunciación aproximada en español de cada palabra de las historias
  tests/
    logica.mjs          Pruebas de lógica y de validez del contenido (node:test)
    e2e.cjs             Prueba de extremo a extremo con Playwright y voz simulada
  docs/backend-ejemplo.js   Ejemplo de backend para la IA opcional
```

Contenido inicial: 10 historias, 10 diálogos (con ramas) y 100 frases, todo original.

## Ejecutar en local

Necesitas servir la carpeta con un servidor HTTP, porque el navegador bloquea la lectura de los JSON si abres `index.html` directamente (`file://`).

```bash
cd ingles-input
python3 -m http.server 8000
# o: npx serve .
```

Abre `http://localhost:8000`. El micrófono y el reconocimiento de voz requieren un contexto seguro: `localhost` y HTTPS (GitHub Pages) funcionan; una IP de red local con HTTP no.

## Pruebas

```bash
# Lógica pura y validación del contenido (no necesita dependencias)
node --test tests/logica.mjs

# Extremo a extremo (necesita Playwright y Chromium)
node tests/e2e.cjs            # SHOTS=carpeta para guardar capturas
node tests/responsive.cjs     # Navegación, tema oscuro y desbordamientos en 6 tamaños
node tests/studio.cjs         # Explorador, reto breve y audio compartido de la portada
```

Las pruebas de contenido comprueban, entre otras cosas, que las historias tengan entre 80 y 150 palabras, que cada palabra de una historia tenga definición en el glosario, que cada diálogo sea un grafo sin nodos inalcanzables y que la respuesta modelo de cada rama pase su propia validación.

## Publicar en GitHub Pages

### Opción A: repositorio propio solo para la app

1. Copia el contenido de `ingles-input/` a la raíz de un repositorio nuevo (o a una carpeta `docs/`).
2. En GitHub: Settings, Pages, Source "Deploy from a branch", rama `main` y carpeta `/ (root)` (o `/docs`).
3. La app queda en `https://TU-USUARIO.github.io/TU-REPO/`. Todas las rutas son relativas, así que funciona bajo cualquier subruta.

### Opción B: dentro de este repositorio

Este repositorio sirve su sitio desde la rama `gh-pages`. El workflow `.github/workflows/publicar-ingles-input.yml` valida el contenido y, al hacer push a `main` con cambios en `ingles-input/`, copia la app a `gh-pages/ingles-input/` sin tocar el resto de la rama. La URL queda `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/ingles-input/`.

## Ampliar el contenido

Todo el contenido está en `data/`. Después de editar, ejecuta `node --test tests/logica.mjs` para validar.

`stories.json`: lista de objetos.

```json
{
  "id": "s11", "situation": "comida", "difficulty": 1,
  "title": "Breakfast time", "titleEs": "La hora del desayuno",
  "sentences": [ { "en": "I eat eggs for breakfast.", "es": "Desayuno huevos." } ]
}
```

Las oraciones en inglés y español van alineadas (la traducción se muestra por oración). El conjunto debe sumar entre 80 y 150 palabras.

`pronunciation.json`: cada palabra nueva de una historia, tal como aparece en el texto (en minúsculas), necesita su entrada con la transcripción IPA (inglés de Estados Unidos) y la pronunciación aproximada escrita en español, con tilde en la sílaba tónica. Las pruebas avisan si falta alguna.

```json
"restaurant": {"ipa": "/ˈrɛstərɑnt/", "es": "réstorant"}
```

`phrases.json`: frases para shadowing y tarjetas.

```json
{ "id": "p101", "situation": "comida", "difficulty": 2, "grammar": "do-does", "en": "Do you have a table for two?", "es": "¿Tienen una mesa para dos?" }
```

`grammar` debe ser el `id` de una entrada de `grammar.json`. Ahí se define la mini explicación de 3 líneas de cada estructura.

`dialogues.json`: guion ramificado.

```json
{
  "id": "d11", "situation": "comida", "difficulty": 1,
  "title": "Ordering coffee", "titleEs": "Pedir un café", "goal": "Pide una bebida.",
  "start": "a",
  "nodes": {
    "a": {
      "say": "What would you like?", "es": "¿Qué desea?", "grammar": "would-like", "starter": "I'd like ...",
      "branches": [
        { "keys": [["coffee", "tea"]], "model": "I'd like a coffee, please.", "modelEs": "Quisiera un café, por favor.", "next": "end" }
      ]
    },
    "end": { "end": true, "say": "Coming right up!", "es": "¡Enseguida!" }
  }
}
```

Cada rama define `keys`: una lista de grupos de sinónimos. Una respuesta pasa si contiene al menos una palabra de cada grupo (o la fracción indicada en `min`, por ejemplo `0.6`). La comparación ignora mayúsculas, puntuación y apostrofes, y tolera un error de una letra en palabras largas. Varias ramas en un nodo crean la bifurcación.

`glossary.json`: diccionario inglés a español que usa el toque sobre palabras. Acepta formas derivadas (plurales, `-ed`, `-ing`), pero los verbos irregulares (`went`, `ate`) necesitan su propia entrada. La prueba de contenido avisa de las palabras de historias que no tengan definición.

## Cómo funciona

- Dificultad: cada contenido tiene `difficulty` de 1 a 3. Tu valoración mueve el valor de comodidad de esa actividad: "muy fácil" sube, "difícil" baja, "justo" se acerca a la dificultad del contenido. En la lista, lo no visto y lo cercano a tu valor aparece primero; lo hecho hoy o marcado "muy fácil" se aparta. En historias, "difícil" baja la velocidad del audio y "muy fácil" la sube.
- Tarjetas (SM-2): "Difícil" cuenta como olvido (calidad 2: vuelve en la misma sesión y reinicia el intervalo), "Justo" es calidad 4 y "Muy fácil" calidad 5. Una tarjeta se considera aprendida con 3 aciertos seguidos. Se introducen 8 frases nuevas por día (configurable en Ajustes).
- Shadowing: porcentaje de coincidencia = 2 x palabras coincidentes / (palabras de la frase + palabras dichas). Se normalizan contracciones ("I'm" y "I am") y números ("six" y "6").
- Racha: un día cuenta si estudiaste al menos 5 minutos. El tiempo se suma solo con la pestaña visible y actividad reciente (o audio sonando).
- Gramática de apoyo: cada frase y nodo de diálogo tiene una estructura asociada. Un fallo (menos de 70% en shadowing, tarjeta "difícil", respuesta sin ideas clave) suma uno; un acierto resta uno. Al llegar a 3 aparece la explicación y queda guardada en la pantalla de Gramática. No se repite antes de 6 horas.

## Datos y privacidad

- Solo localStorage, clave `ingles-input:v1`. Sin cuentas, sin analítica, sin cookies.
- Exportar: Ajustes, "Exportar progreso" descarga un JSON. Importar: Ajustes, "Importar progreso" reemplaza el progreso actual (valida el archivo y descarta lo que no tenga el formato esperado).
- Si borras los datos del sitio en el navegador, el progreso se pierde: exporta copias de vez en cuando.
- El reconocimiento de voz de Chrome y Edge envía el audio al servicio de voz del navegador. La app no recibe ni guarda audio.

## Conectar una IA (opcional)

La app es estática y no debe contener claves. Para recibir comentarios generados por IA en la conversación guiada:

1. Despliega un backend propio que guarde la clave como secreto del servidor. En `docs/backend-ejemplo.js` hay un ejemplo para Cloudflare Workers (no probado contra un servicio real).
2. En Ajustes activa "Activar comentarios de IA" y escribe la URL del endpoint (`https://...`; `http://localhost` se acepta para pruebas).
3. Tras cada respuesta, la app envía `POST` con JSON:

```json
{ "dialogueId": "d01", "nodeId": "a", "npcLine": "Hi! I'm Sam. What's your name?", "userText": "my name Luis",
  "history": [ { "role": "npc", "text": "..." }, { "role": "user", "text": "..." } ], "locale": "es" }
```

y espera:

```json
{ "feedback": "Comentario breve en español.", "corrected": "My name is Luis." }
```

El texto de la respuesta se muestra siempre como texto plano. Si el servidor falla o tarda más de 12 segundos, la validación por palabras clave sigue funcionando. Configura CORS en tu backend para aceptar solo el origen donde publicas la app. El código está en `js/ai.js`.

## Compatibilidad y límites

- Audio: navegadores con `speechSynthesis` (Chrome, Edge, Safari, Firefox). La calidad depende de las voces del dispositivo; puedes elegir otra en Ajustes. Si el navegador no emite eventos de palabra, el resaltado se estima por tiempo.
- Reconocimiento de voz: Chrome y Edge (computadora y Android) y Safari reciente. Firefox no lo incluye; en ese caso la app muestra un aviso y ofrece escribir lo dicho. La comparación es una guía: el reconocedor corrige y puede fallar con acentos o ruido.
- Traducciones y glosario: escritos para este proyecto; revísalos si los amplías. Los significados son orientativos y dependen del contexto.

## Experiencia interactiva y diseño adaptable

La portada incorpora una ilustración local, una frase con audio y traducción, un explorador de historias con búsqueda y filtro por tema, y una práctica breve de tres preguntas. Las respuestas muestran correcciones, permiten avanzar y repetir el reto, y el resultado no modifica el progreso guardado. El audio de la portada y del reto se coordina para que solo se reproduzca uno a la vez.

La interfaz adapta tarjetas y controles a pantallas pequeñas y conserva el tema oscuro y el tamaño de letra. Las animaciones respetan `prefers-reduced-motion`. Los recursos visuales se sirven desde el propio sitio, sin servicios de imágenes ni fuentes externos.

La prueba `tests/responsive.cjs` recorre diez rutas a 320, 375, 390, 430, 768 y 1440 px; comprueba navegación, ausencia de desbordamientos, enlace para saltar al contenido y cambio de tema. Incluye letra al 140 % y una fuente de métricas más anchas. `tests/studio.cjs` comprueba búsqueda, filtros, teclado, aciertos y errores, puntuación, reinicio y coordinación del audio. Las pruebas usan Chromium, no un iPhone físico. Para usar un Chromium existente, define `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` con su ruta.
