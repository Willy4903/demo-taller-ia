import { useState } from 'react';
import { useDataStore } from '../../store/useDataStore';
import { useFilterStore } from '../../store/useFilterStore';
import { applyFilters } from '../../lib/data/filtering';
import { detectSchema } from '../../lib/parsing/schemaDetection';
import { buildAndDownloadReport } from '../../lib/pdf/reportBuilder';
import type { DashboardConfig } from '../../appConfigs/types';

interface ReportButtonProps {
  config: DashboardConfig;
}

/** Header button that generates and downloads the executive PDF report from current data + filters. */
export function ReportButton({ config }: ReportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const activeRows = useDataStore((s) => s.activeRows);
  const files = useDataStore((s) => s.files);
  const filters = useFilterStore((s) => s.filters);

  const handleClick = async () => {
    if (activeRows.length === 0 || isGenerating) return;
    setIsGenerating(true);
    try {
      const filteredRows = applyFilters(activeRows, filters);
      const schema = detectSchema(filteredRows.length > 0 ? filteredRows : activeRows);
      await buildAndDownloadReport({
        rows: filteredRows.length > 0 ? filteredRows : activeRows,
        schema,
        filters,
        fileNames: files.map((f) => f.name),
        datasetLabel: files.map((f) => f.name).join(', ') || 'conjunto de datos cargado',
        reportTitle: config.title,
        reportSubtitle: config.pdfCoverSubtitle,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={activeRows.length === 0 || isGenerating}
      className="inline-flex items-center gap-2 rounded-sm bg-navy px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-navy-light disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gold dark:text-navy"
    >
      {isGenerating ? (
        <>
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white dark:border-navy/40 dark:border-t-navy" />
          Generando informe…
        </>
      ) : (
        <>Descargar informe</>
      )}
    </button>
  );
}
