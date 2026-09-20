import { useMemo } from 'react';
import { useCombinedSchema } from '../../store/useDataStore';
import { useFilteredRows } from '../../hooks/useFilteredData';
import { computeCsat, computeNpsScore } from '../../lib/data/nps';
import { EmptyState } from '../common/EmptyState';

/** Finds a likely NPS/satisfaction field by name, falling back to schema hints. */
function findField(schema: ReturnType<typeof useCombinedSchema>, candidates: string[]): string | undefined {
  return schema.columns.find((c) => candidates.includes(c.name))?.name;
}

/** Large KPI tiles for NPS score and CSAT, colored by whether they read positive or negative. */
export function NpsScoreCard() {
  const schema = useCombinedSchema();
  const rows = useFilteredRows();

  const npsField = findField(schema, ['nps_score']);
  const satisfactionField = findField(schema, ['satisfaccion']);

  const npsScore = useMemo(() => (npsField ? computeNpsScore(rows, npsField) : null), [rows, npsField]);
  const csat = useMemo(
    () => (satisfactionField ? computeCsat(rows, satisfactionField) : null),
    [rows, satisfactionField],
  );

  if (npsScore === null && csat === null) {
    return <EmptyState title="Sin datos de NPS/CSAT" description="Carga un dataset con columnas nps_score o satisfaccion." />;
  }

  const npsPositive = (npsScore ?? 0) >= 0;

  return (
    <>
      {npsScore !== null && (
        <div className="flex flex-col gap-1.5 rounded-sm border border-grey-200 bg-white p-4 dark:border-grey-700 dark:bg-grey-900">
          <p className="text-xs font-medium uppercase tracking-wide text-grey-400">NPS (Net Promoter Score)</p>
          <p className={`text-2xl font-semibold ${npsPositive ? 'text-navy dark:text-white' : 'text-red-700 dark:text-red-400'}`}>
            {npsScore > 0 ? '+' : ''}
            {npsScore}
          </p>
          <p
            className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              npsPositive
                ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
            }`}
          >
            {npsPositive ? 'Positivo' : 'Negativo'}
          </p>
        </div>
      )}
      {csat !== null && (
        <div className="flex flex-col gap-1.5 rounded-sm border border-grey-200 bg-white p-4 dark:border-grey-700 dark:bg-grey-900">
          <p className="text-xs font-medium uppercase tracking-wide text-grey-400">CSAT (top-box)</p>
          <p className="text-2xl font-semibold text-navy dark:text-white">{csat}%</p>
          <p className="text-xs text-grey-400">% con satisfacción ≥ 4 de 5</p>
        </div>
      )}
    </>
  );
}
