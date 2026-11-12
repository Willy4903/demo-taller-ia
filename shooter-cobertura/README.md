# Salar Rojo

Shooter original en tercera persona con coberturas, hecho con Three.js y sin recursos externos: la geometría, las texturas y el sonido se generan por código. Es un nivel completo con tres zonas y un jefe final.

No es una recreación de ningún juego comercial. La ambientación (una planta de litio en un salar de altura), la protagonista, las máquinas enemigas y las armas son propias.

## Cómo jugar

- En línea: `https://willy4903.github.io/demo-taller-ia/salar-rojo/`, una vez que `.github/workflows/publicar-salar-rojo.yml` se ejecute en `main` (copia esta carpeta a `gh-pages/salar-rojo/`).
- Opción rápida: abrir `salar-rojo.html` con doble clic. Es el juego entero en un solo archivo.
- Desde el código fuente: servir la carpeta por HTTP, porque los módulos no cargan con `file://`.

```bash
cd shooter-cobertura
python3 -m http.server 8000   # http://localhost:8000
```

Funciona en navegadores de escritorio con teclado y ratón, y en móviles y tabletas con controles táctiles. Requiere WebGL.

| Control | Acción |
| --- | --- |
| W A S D | Moverse |
| Ratón | Mirar y apuntar |
| Clic izquierdo | Disparar (en cobertura y sin apuntar, a ciegas) |
| Clic derecho | Apuntar y asomarse |
| Espacio | Cubrirse, saltar una cobertura baja, rodar |
| Mayús | Correr |
| R | Recargar |
| Q, 1, 2 | Cambiar de arma |
| G | Granada de pulso |
| F | Golpe |
| E | Interactuar |
| Esc, P | Pausa |

Si el navegador no permite capturar el puntero, el juego pasa a puntero libre y la cámara también gira con las flechas.

En pantalla táctil los controles aparecen solos:

| Control táctil | Acción |
| --- | --- |
| Pulgar izquierdo (joystick) | Moverse; empujado a fondo hacia delante, correr |
| Arrastrar en la mitad derecha | Mirar y apuntar |
| Fuego | Disparar mientras se mantiene; arrastrando el dedo se corrige la puntería |
| Apuntar | Activa o desactiva el apuntado (asomarse en cobertura) |
| Cubrir | Cubrirse, salir, saltar una cobertura baja, rodar |
| Recarga, Granada, Arma, Golpe | Acciones directas |
| Avisos en pantalla | Se tocan para cubrirse o interactuar |

Con controles táctiles hay una ayuda de puntería ligera. Se puede jugar en vertical, aunque en horizontal se ve más campo.

## Contenido

- Zonas: patio de carga, nave de proceso y plataforma de la antena, con puntos de control entre ellas.
- Enemigos: Peón (bípedo que usa coberturas y se asoma para disparar), Rodador (embiste y descarga), Avispa (dron) y el Capataz, una grúa pórtico con cañón y morteros cuyo núcleo queda expuesto al ventilar.
- Armas: carabina automática, dispersor de corto alcance, granadas y golpe cuerpo a cuerpo.
- Regeneración de vida, botín de munición, cajas de suministros, tres niveles de calidad gráfica con bajada automática si el equipo no llega a 30 fps.

## Estructura

```
index.html              Página, HUD y menús
salar-rojo.html         Versión de un solo archivo (generada)
build-standalone.mjs    Genera salar-rojo.html
js/main.js              Bucle, cámara, flujo del nivel y estados
js/player.js            Movimiento, coberturas, armas y daño
js/enemies.js           IA, proyectiles, granadas y jefe
js/level.js             Geometría, colisiones, coberturas y navegación (A*)
js/characters.js        Modelos y animación por código
js/fx.js                Partículas, trazadoras y explosiones
js/audio.js             Sonido sintetizado con Web Audio
js/touch.js             Controles táctiles
js/hud.js, textures.js, util.js
vendor/                 Three.js r187 minificado (licencia MIT)
tests/smoke.cjs         Prueba de humo con Playwright (escritorio y táctil)
```

Tras cambiar el código, regenerar el archivo único con `node shooter-cobertura/build-standalone.mjs`.

## Limitaciones

- Gráficos con primitivas y texturas procedurales; no hay modelos, animaciones capturadas ni audio grabado.
- Sin soporte para mando.
- Probado de forma automática en Chromium (flujo completo del nivel, mecánicas y controles táctiles con emulación de iPhone); no se ha probado en Firefox, en Safari ni en un teléfono real.
