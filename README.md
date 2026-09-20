# Dashboard Analítico Ejecutivo

SPA con **dos dashboards** que comparten la misma infraestructura genérica (parseo, detección de
esquema, filtros dinámicos, agregación, motor de hallazgos estadísticos e informe PDF estilo
McKinsey): carga archivos CSV, XLSX o JSON, explora los datos con filtros dinámicos y gráficas
interactivas (ECharts), y genera un informe PDF ejecutivo redactado con el Principio de la
Pirámide. **Todo el procesamiento ocurre en el navegador**: no hay backend ni se envían datos a
ningún servidor.

- **`/` — Dashboard Analítico Ejecutivo**: análisis de ventas (dataset sintético `ventas.csv`).
- **`/encuestas/` — Dashboard de Encuestas — Satisfacción y NPS**: análisis de encuestas de
  satisfacción con KPIs de NPS/CSAT (dataset sintético `encuestas.csv`).

Cada cabecera incluye un enlace cruzado discreto al otro dashboard.

## Stack

- **React 19 + TypeScript (strict) + Vite**
- **Tailwind CSS v4** para estilos
- **Apache ECharts** (`echarts-for-react`) para todas las visualizaciones
- **PapaParse** (CSV) y **SheetJS/xlsx** (XLSX/XLS) para parseo de archivos
- **Zustand** para estado global (datos, filtros, UI)
- Filtros sincronizados con la **URL** (query params)
- **jsPDF + html2canvas** para el informe ejecutivo en PDF
- **Vitest + @testing-library/react** para pruebas unitarias
- **Web Worker** dedicado para parsear archivos grandes (100k+ filas) sin bloquear la UI
- **ESLint + Prettier** para calidad de código

## Instalación y uso

```bash
npm install
npm run dev       # http://localhost:5173 — arranca con el dataset sintético precargado
npm run build      # build de producción (tsc -b && vite build)
npm run preview    # sirve el build de producción
npm run lint       # ESLint
npm run test       # Vitest (modo run, no watch)
npm run test:watch # Vitest en modo watch
npm run format     # Prettier --write
```

`npm run dev` sirve **ambos entrypoints** simultáneamente (Vite build multi-página):

- http://localhost:5173/ — Dashboard de ventas, autocarga `public/sample/ventas.csv` (~2400 filas:
  fecha, categoría, región, canal, unidades, ingresos, costo, margen).
- http://localhost:5173/encuestas/ — Dashboard de encuestas, autocarga `public/sample/encuestas.csv`
  (~1800 filas: respuesta_id, fecha, canal, region, segmento_cliente, nps_score, satisfaccion,
  tiempo_resolucion_dias, comentario), con una columna derivada `nps_categoria`
  (Promotor/Pasivo/Detractor) añadida al vuelo.

Cargar cualquier archivo propio (drag & drop o selector) sustituye/añade al dataset de ese
dashboard y **recalcula todo automáticamente**, sin recargar la página.

En producción (`npm run build`), Vite genera dos páginas HTML independientes:
`dist/index.html` (ventas) y `dist/encuestas/index.html` (encuestas), cada una con su propio
bundle de JS. Con `base: '/demo-taller-ia/'` (variable `GITHUB_PAGES=true`, usada en CI para
GitHub Pages), el dashboard de encuestas queda servido en `/demo-taller-ia/encuestas/`.

## Arquitectura

```
src/
  appConfigs/   DashboardConfig (types.ts) + sales.ts / survey.ts: título, subtítulo, dataset de
                muestra, enriquecimiento de filas (enrichRow), KPIs extra (extraKpis) y subtítulo
                del PDF por dashboard — ver "Arquitectura multi-dashboard" abajo.
  components/
    layout/     Header, Sidebar, AppShell (composición general de la página, recibe `config`)
    upload/     FileDropzone, FileHistory, SchemaPreview
    filters/    FilterPanel + controles por tipo de columna + chips activos
    kpi/        KpiCard, KpiRow
    charts/     ChartCard (envoltorio), ChartControls (dimensión/métrica/agregación),
                y un componente por visualización: TimeSeriesChart, BarChart, ScatterChart,
                TreemapChart, HeatmapChart, PivotTable
    report/     ReportButton + plantillas del PDF: Cover, ExecSummary, FindingPage,
                Recommendations, Appendix, ReportPage (envoltorio A4 con pie de página)
    common/     EmptyState, ErrorState, LoadingState, ThemeToggle
  lib/
    parsing/    csv.ts, xlsx.ts, json.ts (parseo puro), schemaDetection.ts (inferencia de
                tipos/nulos/duplicados), worker.ts (wrapper que despacha al Web Worker),
                inline.ts (fallback sin Worker, usado en tests/SSR)
    data/       types.ts, aggregation.ts (sum/avg/count/median, agrupaciones 1D/2D, series de
                tiempo), filtering.ts (aplica FilterState), kpi.ts (KPI + variación vs periodo
                anterior)
    insights/   rules.ts (reglas estadísticas: tendencia, variación, outliers, Pareto,
                correlación), narrative.ts (arma resumen ejecutivo y recomendaciones)
    pdf/        reportBuilder.ts (orquesta la generación del PDF), styles.ts (tokens de diseño)
    urlState.ts serialización de filtros <-> query params
  store/        useDataStore (archivos + filas activas), useFilterStore (filtros + cross-filter,
                persistidos en la URL), useUiStore (tema claro/oscuro, sidebar)
  workers/      parseWorker.ts — Web Worker que parsea CSV/XLSX/JSON + detecta el esquema fuera
                del hilo principal
  hooks/        useFileIngestion, useFilteredData, useSchemaFields, useChartPngExport,
                useAutoLoadSample
  data/sample/  ventas.csv, encuestas.csv — datasets sintéticos (también servidos desde
                public/sample/)
  __tests__/    pruebas unitarias (Vitest)
main.tsx            entrypoint del dashboard de ventas (monta <App config={salesConfig} />)
main-encuestas.tsx  entrypoint del dashboard de encuestas (monta <App config={surveyConfig} />)
index.html           página HTML del dashboard de ventas
encuestas/index.html página HTML del dashboard de encuestas
```

## Arquitectura multi-dashboard (`appConfigs/`)

Toda la lógica de datos, filtros, gráficas y el generador de PDF es **agnóstica al dominio**: no
sabe nada de "ventas" ni de "encuestas", solo trabaja sobre el `DatasetSchema` detectado. Lo único
que distingue un dashboard de otro es una `DashboardConfig` (`src/appConfigs/types.ts`):

```ts
interface DashboardConfig {
  id: string;                          // 'sales' | 'survey'
  title: string;                       // título en el header y en el PDF
  subtitle: string;                    // subtítulo del header
  sampleDataPath: string;              // archivo bajo public/sample/ a autocargar
  enrichRow?: (row: Row) => Row;       // enriquecimiento por fila al ingerir (columnas derivadas)
  extraKpis?: ComponentType[];         // tarjetas KPI específicas del dominio
  pdfCoverSubtitle: string;            // subtítulo de la portada del informe PDF
}
```

- `sales.ts` envuelve el comportamiento original del dashboard de ventas (sin `enrichRow` ni
  `extraKpis`), así que su título, dataset y salida quedan **exactamente igual** que antes.
- `survey.ts` define `enrichRow` para calcular `nps_categoria` (Promotor/Pasivo/Detractor) a partir
  de `nps_score` en cada fila al cargar los datos — el resto del pipeline (esquema, filtros,
  agregación, motor de hallazgos) la trata como una columna categórica normal, sin cambios de
  código. También declara `extraKpis: [NpsScoreCard]` para las tarjetas de NPS/CSAT.
- `AppShell` recibe la `config` como prop y la usa para: el título/subtítulo del header, el
  dataset a autocargar (`useAutoLoadSample`), el `enrichRow` pasado a `useFileIngestion` (tanto
  para la carga automática como para archivos que el usuario suba), las tarjetas KPI extra, y
  (condicionado a `config.id === 'survey'`) el `NpsBreakdownChart`.
- `main.tsx` / `main-encuestas.tsx` son los dos entrypoints de Vite; cada uno monta `<App>` con su
  propia config. `vite.config.ts` declara ambos HTML como `build.rollupOptions.input` para que
  `npm run build` genere las dos páginas.

**Añadir un tercer dashboard** implica: crear `appConfigs/nuevo.ts`, un `nuevo/index.html` +
`main-nuevo.tsx` análogos, sumar la entrada a `vite.config.ts`, y (opcionalmente) componentes KPI/
chart específicos referenciados desde `extraKpis` — sin tocar `lib/` ni los dashboards existentes.

**Separación de responsabilidades:** toda la lógica de datos (parseo, detección de esquema,
agregación, filtrado, KPIs, generación de hallazgos) vive en `lib/`, es TypeScript puro sin
dependencias de React, y está cubierta por pruebas unitarias. Los componentes de `components/`
solo consumen esa lógica a través de los stores de Zustand y hooks.

### Flujo de datos

1. `FileDropzone` / `FileHistory` reciben archivos → `useFileIngestion` los envía a
   `parseFileInWorker`, que delega en un `Worker` (`workers/parseWorker.ts`).
2. El worker parsea (PapaParse/SheetJS/JSON.parse), detecta el esquema
   (`schemaDetection.detectSchema`) y coacciona los tipos (`coerceRows`), todo fuera del hilo
   principal.
3. El resultado se guarda en `useDataStore` (uno o más archivos; las filas de todos los archivos
   activos se combinan automáticamente — ver "Combinación de múltiples archivos" abajo).
4. `useFilterStore` mantiene los filtros (rango de fechas, multiselección, rangos numéricos,
   búsqueda de texto, cross-filter por clic en gráfica) y los sincroniza con la URL
   (`lib/urlState.ts`) en cada cambio.
5. `FilterPanel` genera sus controles **dinámicamente** a partir del esquema combinado detectado
   (`useCombinedSchema`): columnas de fecha → `DateRangeFilter`, columnas categóricas con ≤30
   valores distintos → `MultiSelectFilter`, columnas numéricas → `NumericSliderFilter`.
6. `useFilteredRows` aplica filtros + cross-filter sobre las filas activas; todos los KPIs,
   gráficas y la tabla dinámica consumen ese resultado memoizado.
7. `ReportButton` toma las filas filtradas vigentes, corre el motor de hallazgos
   (`lib/insights/rules.ts`) y construye el PDF (`lib/pdf/reportBuilder.ts`).

### Motor de hallazgos (`lib/insights/rules.ts`)

Cinco reglas estadísticas, cada una devuelve 0 o 1 `Insight` con un título en lenguaje ejecutivo,
2–3 viñetas "¿y entonces?" y una severidad para ordenarlos:

- **Tendencia**: variación de la métrica principal entre el primer y el último mes.
- **Variación**: brecha entre el segmento líder y el más rezagado de una dimensión categórica.
- **Outliers**: valores con |z-score| > 3 en la métrica principal.
- **Pareto**: detecta si ~20% de los segmentos concentra ~80% de una métrica.
- **Correlación**: coeficiente de Pearson entre las dos primeras columnas numéricas (si |r| ≥ 0.4).

`lib/insights/narrative.ts` toma los 5 hallazgos de mayor severidad para el resumen ejecutivo y
deriva las recomendaciones finales del informe.

### Informe PDF (`lib/pdf/reportBuilder.ts` + `components/report/`)

El informe se arma renderizando cada página como un componente React de tamaño A4 fijo
(`ReportPage` + `Cover`, `ExecSummary`, `FindingPage`, `Recommendations`, `Appendix`) en un
contenedor oculto, capturándola con **html2canvas** y ensamblando las imágenes resultantes en un
PDF con **jsPDF**. Las gráficas de cada hallazgo se generan aparte con una instancia de ECharts
en un `<div>` oculto (`echarts.getDataURL()`) y se insertan como `<img>` antes de capturar la
página. Estilo: fondo blanco, navy/dorado, grises neutros, serif para títulos, sans para cuerpo,
una idea por página, pie de página con paginación — ver `lib/pdf/styles.ts` para los tokens.

### Combinación de múltiples archivos

`useDataStore` guarda cada archivo cargado por separado (con su propio esquema y errores) y
expone `activeRows` como la **concatenación** de las filas de todos los archivos activos; el
esquema combinado (`useCombinedSchema`) se recalcula sobre ese conjunto combinado. "Reemplazar"
sustituye un archivo por otro con el mismo id (útil para actualizar una fuente sin duplicar
filas); "eliminar" lo quita de la combinación. Esta es una estrategia de combinación simplificada
(concatenación por columnas con incidencia por nombre) — ver **Limitaciones** más abajo.

## Cómo extender

- **Nueva visualización**: crea un componente en `components/charts/` siguiendo el patrón de
  `BarChart.tsx` (usa `useCombinedSchema` + `useFilteredRows` + `useSchemaFields`, agrega su
  propio estado local de dimensión/métrica/agregación con `ChartControls`, envuélvelo en
  `ChartCard`, usa `useChartPngExport` para el botón de exportar PNG) y añádelo a la grilla en
  `components/layout/AppShell.tsx`.
- **Nueva regla de hallazgo**: agrega una función en `lib/insights/rules.ts` que reciba
  `(rows, schema)` y devuelva `Insight[]`, y súmala al arreglo en `generateInsights`. Cada
  `Insight` necesita un `chartHint` (`timeseries` | `bar` | `scatter`) para que
  `reportBuilder.ts` sepa qué gráfica renderizar en el PDF.
- **Nuevo formato de archivo**: agrega un parser en `lib/parsing/` que devuelva
  `{ rows, errors }`, regístralo en `workers/parseWorker.ts` y en `lib/parsing/worker.ts`
  (detección por extensión).
- **Nueva sección del PDF**: agrega una plantilla en `components/report/` (siguiendo el patrón de
  `ReportPage`) y súmala a la orquestación en `lib/pdf/reportBuilder.ts`.
- **Nuevo tipo de filtro**: agrega el componente en `components/filters/`, un campo en
  `FilterState` (`lib/data/types.ts`), la lógica de coincidencia en `lib/data/filtering.ts`, la
  serialización en `lib/urlState.ts` y la generación dinámica en `FilterPanel.tsx`.

## Pruebas

```bash
npm run test
```

Cubren: `lib/data/aggregation.ts` (sum/avg/count/median, agrupación 1D/2D, series de tiempo),
`lib/data/filtering.ts` (cada tipo de filtro y su combinación AND), `lib/parsing/schemaDetection.ts`
(inferencia de tipos, nulos, duplicados, coerción), `lib/insights/rules.ts` +
`lib/insights/narrative.ts` (que el motor detecte cada tipo de hallazgo en un dataset sintético
diseñado para dispararlos todos, orden por severidad, y los constructores de resumen/recomendaciones)
y `lib/data/nps.ts` (`__tests__/nps.test.ts`: clasificación Promotor/Pasivo/Detractor en los
límites 6/7 y 8/9, cálculo de NPS y CSAT contra conjuntos con resultado calculado a mano).

## Informes y capturas de muestra (`docs/`)

- `docs/informe-muestra.pdf` — informe del dashboard de ventas.
- `docs/informe-muestra-encuestas.pdf` — informe del dashboard de encuestas.
- `docs/screenshot-encuestas-claro.png` / `docs/screenshot-encuestas-oscuro.png` — capturas del
  dashboard de encuestas en modo claro y oscuro.

Ambos PDFs se generaron automatizadamente contra el dataset sintético precargado, así:

```bash
npm run build && npm run preview -- --port 4173 &
# con un navegador headless (se usó Playwright/Chromium en este entorno):
#  1. abrir http://localhost:4173/
#  2. esperar a que los KPIs se rendericen (dataset de muestra autocargado)
#  3. hacer clic en "Descargar informe"
#  4. guardar el archivo descargado en docs/informe-muestra.pdf
```

Para regenerarlo manualmente: ejecuta `npm run dev` (o `npm run build && npm run preview`), abre
la app en el navegador, espera a que cargue el dataset de muestra (o carga el tuyo) y haz clic en
**"Descargar informe"** en el encabezado. El PDF se descarga directamente desde el navegador
(no requiere backend).

## Accesibilidad

- Controles con `aria-label`/`<label>` asociados, `role="status"`/`role="alert"` en estados de
  carga/error, `fieldset`/`legend` en grupos de filtros.
- Contraste AA en la paleta navy/gold/gris sobre fondo blanco y en modo oscuro.
- Navegación por teclado en el dropzone (`role="button"` + `onKeyDown`) y foco visible
  (`:focus-visible`) en toda la app.

## Modo claro/oscuro

`useUiStore` persiste la preferencia en `localStorage` (con `try/catch`, degrada con gracia si el
storage no está disponible) y respeta `prefers-color-scheme` en la primera carga. El tema se aplica
con la clase `.dark` en `<html>` vía un `@custom-variant` de Tailwind v4.

## Limitaciones conocidas y simplificaciones

Este es un proyecto grande construido end-to-end en una sola sesión; se priorizó tener las 6 fases
funcionando de forma coherente sobre pulir cada detalle. Simplificaciones deliberadas:

- **Combinación de múltiples archivos**: se concatenan filas por nombre de columna (unión de
  esquemas); no hay un asistente de mapeo de columnas para reconciliar archivos con esquemas muy
  distintos entre sí.
- **Gráfica de barras**: implementa comparación por una dimensión con cross-filtering (clic en una
  barra filtra el resto del tablero) y selector de dimensión/métrica/agregación, pero no incluye
  el modo apiladas-por-segundo-dimensión (solo un nivel de agrupación); el heatmap ya cubre el caso
  de cruce de dos dimensiones.
- **Detección de esquema y duplicados** usa muestreo (hasta 500 filas para tipos, hasta 50.000
  filas para duplicados) para mantener el análisis rápido con datasets de 100k+ filas; en datasets
  extremadamente grandes el conteo de duplicados es aproximado.
- **Motor de hallazgos**: reglas estadísticas simples (z-score, Pearson, Pareto 80/20,
  variación punta a punta) pensadas para ser explicables y rápidas, no un motor de detección de
  anomalías robusto a outliers extremos (un valor muy extremo puede, por ejemplo, dominar el
  cálculo de correlación).
- **Sidebar en móvil**: se apila sobre el contenido principal (no es un drawer/overlay); es
  funcional y responsive pero no la interacción más compacta posible en pantallas pequeñas.
- **Sin persistencia entre sesiones**: los datos cargados viven solo en memoria de la pestaña
  (por diseño: "todo el procesamiento en el navegador", sin backend); recargar la página vuelve a
  autocargar el dataset de muestra.
- El **bundle de producción** no está code-split (single chunk ~2MB antes de gzip, ~640KB gzip)
  porque ECharts + xlsx + jsPDF + html2canvas son librerías pesadas; para producción real
  convendría lazy-loading de `xlsx`/`jspdf`/`html2canvas` (solo se necesitan al cargar XLSX o
  generar el informe).
