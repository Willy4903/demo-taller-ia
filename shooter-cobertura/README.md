# Salar Rojo

Shooter original en tercera persona con coberturas, hecho con Three.js y sin recursos externos: la geometría, las texturas y el sonido se generan por código. Es un nivel completo con tres zonas y un jefe final.

No es una recreación de ningún juego comercial. La ambientación (una planta de litio en un salar de altura), la protagonista, las máquinas enemigas y las armas son propias.

## Cómo jugar

- Opción rápida: abrir `salar-rojo.html` con doble clic. Es el juego entero en un solo archivo.
- Desde el código fuente: servir la carpeta por HTTP, porque los módulos no cargan con `file://`.

```bash
cd shooter-cobertura
python3 -m http.server 8000   # http://localhost:8000
```

Requiere un navegador de escritorio con WebGL, teclado y ratón.

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
js/hud.js, textures.js, util.js
vendor/                 Three.js r187 minificado (licencia MIT)
```

Tras cambiar el código, regenerar el archivo único con `node shooter-cobertura/build-standalone.mjs`.

## Limitaciones

- Gráficos con primitivas y texturas procedurales; no hay modelos, animaciones capturadas ni audio grabado.
- Sin soporte para pantallas táctiles ni mando.
- Probado de forma automática en Chromium (flujo completo del nivel y mecánicas); no se ha probado en Firefox ni Safari.
