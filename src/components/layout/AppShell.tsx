import { useEffect, useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useDataStore, useCombinedSchema } from '../../store/useDataStore';
import { useFilterStore } from '../../store/useFilterStore';
import { useAutoLoadSample } from '../../hooks/useAutoLoadSample';
import { KpiRow } from '../kpi/KpiRow';
import { TimeSeriesChart } from '../charts/TimeSeriesChart';
import { BarChart } from '../charts/BarChart';
import { ScatterChart } from '../charts/ScatterChart';
import { TreemapChart } from '../charts/TreemapChart';
import { HeatmapChart } from '../charts/HeatmapChart';
import { PivotTable } from '../charts/PivotTable';
import { NpsBreakdownChart } from '../charts/NpsBreakdownChart';
import { SchemaPreview } from '../upload/SchemaPreview';
import { EmptyState } from '../common/EmptyState';
import { LoadingState } from '../common/LoadingState';
import { ErrorState } from '../common/ErrorState';
import type { DashboardConfig } from '../../appConfigs/types';

interface AppShellProps {
  config: DashboardConfig;
}

export function AppShell({ config }: AppShellProps) {
  useAutoLoadSample(config);

  const files = useDataStore((s) => s.files);
  const isParsing = useDataStore((s) => s.isParsing);
  const parsingLabel = useDataStore((s) => s.parsingLabel);
  const schema = useCombinedSchema();
  const hydrateFromUrl = useFilterStore((s) => s.hydrateFromUrl);
  const [showSchema, setShowSchema] = useState(false);

  useEffect(() => {
    hydrateFromUrl();
  }, [hydrateFromUrl]);

  useEffect(() => {
    document.title = config.title;
  }, [config.title]);

  const hasData = files.length > 0;
  const fileErrors = files.flatMap((f) => (f.errors.length > 0 ? [`${f.name}: ${f.errors.length} aviso(s) de validación`] : []));
  const ExtraKpis = config.extraKpis ?? [];

  return (
    <div className="flex h-screen flex-col bg-grey-100 text-grey-900 dark:bg-grey-950 dark:text-grey-100">
      <Header config={config} />
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {isParsing && <LoadingState label={`Procesando ${parsingLabel ?? 'archivo'}…`} />}

          {!isParsing && !hasData && (
            <EmptyState
              title="Aún no has cargado datos"
              description={`Arrastra un CSV, XLSX o JSON en el encabezado, o usa el dataset sintético de ejemplo (data/sample/${config.sampleDataPath}) para explorar el tablero.`}
            />
          )}

          {!isParsing && hasData && (
            <div className="flex flex-col gap-6">
              {fileErrors.length > 0 && <ErrorState title="Avisos de calidad de datos" errors={fileErrors} />}

              <section aria-label="Indicadores clave" className="flex flex-col gap-3">
                <KpiRow />
                {ExtraKpis.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {ExtraKpis.map((Extra, i) => (
                      <Extra key={i} />
                    ))}
                  </div>
                )}
              </section>

              <section aria-label="Visualizaciones" className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <TimeSeriesChart />
                <BarChart />
                <ScatterChart />
                <TreemapChart />
                <HeatmapChart />
                <PivotTable />
                {config.id === 'survey' && <NpsBreakdownChart />}
              </section>

              <section>
                <button
                  type="button"
                  onClick={() => setShowSchema((v) => !v)}
                  className="mb-2 text-xs font-medium text-navy underline-offset-2 hover:underline dark:text-gold"
                >
                  {showSchema ? 'Ocultar' : 'Ver'} esquema detectado de los datos
                </button>
                {showSchema && <SchemaPreview schema={schema} />}
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
