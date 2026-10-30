# Simulador Liga 1 Perú 2026 · Universitario de Deportes

Aplicación web para simular los 28 partidos pendientes del Torneo Clausura 2026 (fechas 14 a 17) y recalcular al instante la tabla del Clausura y la tabla acumulada anual, con foco en Universitario de Deportes. Funciona sin backend: React, Vite y TypeScript estricto, con un motor de cálculo independiente de la interfaz.

Estado de los datos: corte del 30 de octubre de 2026, con ocho partidos de la fecha 14 jugados del 27 al 29 de octubre (Juan Pablo II 2-0 Sport Huancayo, ADT 2-0 CD Moquegua, FC Cajamarca 1-3 UTC, Alianza Atlético 3-2 Garcilaso, Cienciano 3-0 Atlético Grau, Los Chankas 0-1 Cusco FC, Sporting Cristal 3-2 Alianza Lima y Melgar 1-1 Comerciantes Unidos). El corte original del 28 de octubre tenía 35 pendientes: 28 siguen pendientes y 7 se jugaron desde entonces. Solo falta Universitario vs Sport Boys de la fecha 14, reprogramado al 4 de noviembre. Lee la sección Limitaciones antes de usar los números como referencia.

## Experiencia y herramientas interactivas

- Portada cinematográfica con fondo animado en canvas (respeta `prefers-reduced-motion`) y contadores en vivo de Universitario.
- Resumen fijo en vivo con posición y puntos de Universitario en Clausura y acumulado.
- Carrera de puntos: barras animadas que se reordenan con cada marcador, con el techo de puntos de cada club.
- Simulador: marcadores editables, accesos rápidos, escenarios, filtros, tablas del Clausura y del acumulado, exportación CSV.
- Matriz de Universitario: las 15 combinaciones de victorias y empates en sus cuatro partidos y dónde termina en cada tabla; cada celda carga el escenario.
- Laboratorio de probabilidades: simulación de Monte Carlo en el navegador con semilla reproducible.
- Techos y descenso: situación matemática (campeón, sin opciones, descendido, a salvo) calculada sin modelos.

## Requisitos e instalación

- Node.js 22 o superior y npm.

```bash
npm install
npm run dev        # servidor de desarrollo en http://localhost:5173
```

## Scripts

| Script | Función |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Comprobación de tipos y build de producción en `dist/` |
| `npm run preview` | Sirve el build local |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript en modo estricto |
| `npm test` | Pruebas unitarias con Vitest |
| `npm run test:e2e` | Pruebas funcionales con Playwright (escritorio y móvil) |
| `npm run check` | Lint, tipos y pruebas unitarias |

Para Playwright hace falta un Chromium instalado (`npx playwright install chromium`). El build de las pruebas usa `BASE_PATH=/`; el despliegue usa `/<repositorio>/`.

## Estructura

```
src/
  domain/types.ts        Tipos del dominio
  data/                  Datos deportivos versionados (se editan a mano)
    teams.ts             Los 18 equipos
    standings.ts         Clausura al corte, Apertura final y ajustes del acumulado
    fixtures.ts          28 partidos pendientes, ventanas por fecha y partidos jugados
    records.ts           Sanciones y discrepancias entre fuentes
    sources.ts           Fuentes con URL y fecha de consulta
    index.ts             Conjunto de datos y versión
  engine/                Motor puro, sin React
    scores.ts            Validación de marcadores
    standings.ts         Cálculo de tablas, orden y desempates
    rules.ts             Zonas y notas del reglamento
    title.ts             Proyección de la definición del título
    scenarios.ts         Escenarios y accesos rápidos
    csv.ts               Exportación
    storage.ts           Persistencia en localStorage
  components/, hooks/    Interfaz
tests/                   Vitest (datos, fixture, simulación, soporte)
e2e/                     Playwright
.github/workflows/       CI y despliegue
```

## Metodología de cálculo

- Tabla del Clausura al corte: PJ, PG, PE, PP, GF y GC publicados. Puntos = 3 × PG + PE − sanciones (UTC tiene 5 puntos deducidos en el Clausura).
- Acumulado al corte = Apertura final + Clausura al corte + ajuste documentado. Goles y partidos del acumulado se suman de ambas tablas.
- Puntos acumulados proyectados = puntos acumulados reales al corte + puntos de los partidos simulados. El motor siempre parte del corte y suma únicamente los partidos pendientes con marcador completo, por lo que ningún partido se cuenta dos veces. Los resultados ya jugados están en las tablas base y no se vuelven a sumar.
- Victoria 3 puntos, empate 1. Un marcador solo cuenta si ambos goles son enteros de 0 a 20; un marcador incompleto o inválido no modifica ninguna tabla.
- Los accesos rápidos fijan 1-0, 0-0 o 0-1; el marcador queda editable.
- Desempates del Clausura: puntos, diferencia de goles, goles a favor, Fair Play. Acumulado: puntos, diferencia de goles, goles a favor, enfrentamientos directos y Fair Play. No hay datos de Fair Play ni de enfrentamientos directos cargados (`headToHead` y `fairPlay` están vacíos), por lo que un empate completo se marca como provisional con orden alfabético y una advertencia. El motor ya resuelve el empate si esos datos se cargan en `src/data/index.ts`.
- Zonas del acumulado: 1 a 4 zona alta (candidatas a Libertadores), 5 a 8 candidatas a Sudamericana, 17 y 18 descenso. Las cuatro primeras posiciones no son clasificación automática: los cupos dependen del campeonato y de los play-offs.

## Modelo de probabilidades

`src/engine/montecarlo.ts` sortea los partidos que no tienen marcador cargado. Los goles de cada equipo siguen una distribución de Poisson con media igual al promedio de goles por equipo y partido de la liga, multiplicado por el ataque del club y la defensa del rival. Ataque y defensa salen de los goles a favor y en contra del acumulado de la temporada, suavizados hacia 1 con el peso de 10 partidos. No hay ventaja de local, bajas, forma reciente ni motivación. Los empates absolutos se resuelven por sorteo, como en el art. 14 para el Clausura, y se aplica también al acumulado como aproximación. Es una estimación del modelo, no un pronóstico ni un dato oficial. Los marcadores que cargues se tratan como resultados fijos.

## Fuentes y trazabilidad

Cada dato tiene su fuente en `src/data/sources.ts` y la aplicación las lista con enlace en la sección Fuentes y trazabilidad, junto con las sanciones y las discrepancias entre fuentes y la decisión tomada. Fuentes principales: liga1.pe (fixture y reglamento), Depor, Líbero, Infobae, La República, RPP, Fútbol Peruano (tabla del Apertura), la web oficial de Universitario y Wikipedia.

Controles de coherencia que ejecutan las pruebas: PJ = PG + PE + PP, puntos = 3 PG + PE − sanción, goles a favor = goles en contra, victorias = derrotas, 125 partidos jugados al corte, PJ + pendientes = 17 en cada equipo y el orden del acumulado igual al publicado.

## Actualizar los datos durante el torneo

1. Cuando se juegue un partido pendiente, mover su resultado a las tablas base: actualizar la fila de cada equipo en `CLAUSURA_BASE` (PJ, PG, PE, PP, GF, GC, `publishedPts`).
2. Quitar el partido de `FIXTURES` en `src/data/fixtures.ts` y agregarlo a `PLAYED`.
3. Actualizar `cutoff`, `updatedAt` y `version` en `src/data/index.ts`. Cambiar `version` descarta las simulaciones guardadas en los navegadores.
4. Registrar sanciones nuevas en `records.ts` y los ajustes en `ACUMULADO_ADJUSTMENTS`.
5. Ejecutar `npm run check`. Las pruebas de datos fallan si las tablas dejan de cuadrar. Las pruebas de la simulación asumen el corte del 30 de octubre (28 partidos pendientes) y deben actualizarse al cambiar el corte. Los identificadores de los partidos (`c14-08`) se conservan aunque otros se jueguen.

## Despliegue en GitHub Pages

`.github/workflows/ci-deploy.yml` ejecuta lint, tipos, pruebas unitarias y funcionales en cada push y pull request. En un push a `main` construye con `BASE_PATH=/<repositorio>/` y despliega con `actions/deploy-pages`. Para que funcione, en Settings → Pages la fuente debe ser GitHub Actions. La URL esperada es `https://<usuario>.github.io/<repositorio>/`; no se ha verificado ningún despliegue.

## Limitaciones

- La web oficial de la Liga 1 y la mayoría de los medios no se pudieron abrir al reunir los datos; la información proviene de resúmenes de búsqueda que citan esas páginas. Hay que contrastar las tablas con liga1.pe antes de tomarlas como oficiales.
- El PDF del reglamento no pudo leerse. Los artículos 7, 8, 9 y 15 se reconstruyen desde medios y se marcan como no verificados; los emparejamientos de semifinales y los cupos exactos a Libertadores y Sudamericana 2027 no se proyectan. El descenso (art. 10) y los desempates del Clausura (art. 14) coinciden en dos fuentes.
- Los ajustes de puntos del acumulado se derivan por diferencia entre la suma de los torneos y el acumulado publicado: ADT (−1), Sport Boys (−4), UTC (−5 además de los 5 del Clausura) y FC Cajamarca (−2, Artículo 89 del Reglamento de Licencias según Bolavip; Líbero menciona 1). Solo la de Cajamarca y la de UTC en el Clausura tienen motivo documentado. Cusco FC usa 48 puntos (Líbero publica 49).
- El 29 de octubre se corrigió un dato anterior: FC Cajamarca figuraba con 28 puntos en el acumulado y las tablas del 28 de octubre lo muestran con 26.
- El acumulado no desglosa PG, PE y PP porque la tabla del Apertura consultada no los incluía.
- Los resultados de las fechas 1 a 12 no se detallan individualmente; solo se registran la fecha 13 y el partido del 27 de octubre.
- Las fechas de varios partidos de las fechas 15 a 17 no están publicadas y se muestran como "Sin fecha".
