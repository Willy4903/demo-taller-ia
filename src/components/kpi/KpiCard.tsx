import type { KpiResult } from '../../lib/data/kpi';

interface KpiCardProps {
  kpi: KpiResult;
}

const aggLabel: Record<string, string> = { sum: 'Suma', avg: 'Promedio', count: 'Conteo', median: 'Mediana' };

function formatNumber(n: number): string {
  return n.toLocaleString('es-ES', { maximumFractionDigits: n % 1 === 0 ? 0 : 1 });
}

export function KpiCard({ kpi }: KpiCardProps) {
  const isPositive = (kpi.deltaPct ?? 0) >= 0;
  return (
    <div className="flex flex-col gap-1.5 rounded-sm border border-grey-200 bg-white p-4 dark:border-grey-700 dark:bg-grey-900">
      <p className="text-xs font-medium uppercase tracking-wide text-grey-400">
        {kpi.label} <span className="normal-case">({aggLabel[kpi.aggType]})</span>
      </p>
      <p className="text-2xl font-semibold text-navy dark:text-white">{formatNumber(kpi.value)}</p>
      {kpi.deltaPct !== null ? (
        <p
          className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
            isPositive
              ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400'
              : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
          }`}
        >
          {isPositive ? '▲' : '▼'} {Math.abs(kpi.deltaPct).toFixed(1)}% vs. periodo anterior
        </p>
      ) : (
        <p className="text-xs text-grey-400">Sin comparación disponible</p>
      )}
    </div>
  );
}
