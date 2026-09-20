import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  controls?: ReactNode;
  onExportPng?: () => void;
  children: ReactNode;
}

export function ChartCard({ title, controls, onExportPng, children }: ChartCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-sm border border-grey-200 bg-white p-4 dark:border-grey-700 dark:bg-grey-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-grey-900 dark:text-grey-100">{title}</h3>
        <div className="flex items-center gap-2">
          {controls}
          {onExportPng && (
            <button
              type="button"
              onClick={onExportPng}
              title="Exportar como PNG"
              aria-label={`Exportar ${title} como PNG`}
              className="rounded-sm border border-grey-200 p-1.5 text-grey-400 hover:bg-grey-100 hover:text-navy dark:border-grey-700 dark:hover:bg-grey-800 dark:hover:text-gold"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v12M12 15l-4-4M12 15l4-4" />
                <path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
