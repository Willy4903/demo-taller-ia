# Simulador Liga 1 Perú 2026 · Universitario de Deportes

Aplicación web para simular los 35 partidos pendientes del Torneo Clausura 2026 (fechas 14 a 17) y recalcular al instante la tabla del Clausura y la tabla acumulada anual, con foco en Universitario de Deportes. Funciona sin backend: React, Vite y TypeScript estricto, con un motor de cálculo independiente de la interfaz.

Estado de los datos: corte del 28 de octubre de 2026, incluyendo Juan Pablo II 2-0 Sport Huancayo del 27 de octubre. Lee la sección Limitaciones antes de usar los números como referencia.

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
    fixtures.ts          35 partidos pendientes, ventanas por fecha y partidos jugados
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

## Fuentes y trazabilidad

Cada dato tiene su fuente en `src/data/sources.ts` y la aplicación las lista con enlace en la sección Fuentes y trazabilidad, junto con las sanciones y las discrepancias entre fuentes y la decisión tomada. Fuentes principales: liga1.pe (fixture y reglamento), Depor, Líbero, Infobae, La República, RPP, Fútbol Peruano (tabla del Apertura), la web oficial de Universitario y Wikipedia.

Controles de coherencia que ejecutan las pruebas: PJ = PG + PE + PP, puntos = 3 PG + PE − sanción, goles a favor = goles en contra, victorias = derrotas, 118 partidos jugados al corte, PJ + pendientes = 17 en cada equipo y el orden del acumulado igual al publicado.

## Actualizar los datos durante el torneo

1. Cuando se juegue un partido pendiente, mover su resultado a las tablas base: actualizar la fila de cada equipo en `CLAUSURA_BASE` (PJ, PG, PE, PP, GF, GC, `publishedPts`).
2. Quitar el partido de `FIXTURES` en `src/data/fixtures.ts` y agregarlo a `PLAYED`.
3. Actualizar `cutoff`, `updatedAt` y `version` en `src/data/index.ts`. Cambiar `version` descarta las simulaciones guardadas en los navegadores.
4. Registrar sanciones nuevas en `records.ts` y los ajustes en `ACUMULADO_ADJUSTMENTS`.
5. Ejecutar `npm run check`. Las pruebas de datos fallan si las tablas dejan de cuadrar. Las pruebas de la simulación asumen el corte del 28 de octubre (35 partidos) y deben actualizarse al cambiar el corte.

## Despliegue en GitHub Pages

`.github/workflows/ci-deploy.yml` ejecuta lint, tipos, pruebas unitarias y funcionales en cada push y pull request. En un push a `main` construye con `BASE_PATH=/<repositorio>/` y despliega con `actions/deploy-pages`. Para que funcione, en Settings → Pages la fuente debe ser GitHub Actions. La URL esperada es `https://<usuario>.github.io/<repositorio>/`; no se ha verificado ningún despliegue.

## Limitaciones

- La web oficial de la Liga 1 y la mayoría de los medios no se pudieron abrir al reunir los datos; la información proviene de resúmenes de búsqueda que citan esas páginas. Hay que contrastar las tablas con liga1.pe antes de tomarlas como oficiales.
- El PDF del reglamento no pudo leerse. Los artículos 7, 8, 9 y 15 se reconstruyen desde medios y se marcan como no verificados; los emparejamientos de semifinales y los cupos exactos a Libertadores y Sudamericana 2027 no se proyectan. El descenso (art. 10) y los desempates del Clausura (art. 14) coinciden en dos fuentes.
- Los ajustes de puntos del acumulado de ADT (−1), Sport Boys (−4) y UTC (−5) se derivan por diferencia entre la suma de los torneos y el acumulado publicado por Líbero; solo parte tiene motivo documentado. Cusco FC usa 48 puntos (Líbero publica 49).
- El acumulado no desglosa PG, PE y PP porque la tabla del Apertura consultada no los incluía.
- Los resultados de las fechas 1 a 12 no se detallan individualmente; solo se registran la fecha 13 y el partido del 27 de octubre.
- Las fechas de varios partidos de las fechas 15 a 17 no están publicadas y se muestran como "Sin fecha".
