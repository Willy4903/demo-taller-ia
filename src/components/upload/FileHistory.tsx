import { useRef } from 'react';
import { useDataStore } from '../../store/useDataStore';
import { useFileIngestion } from '../../hooks/useFileIngestion';

export function FileHistory() {
  const files = useDataStore((s) => s.files);
  const removeFile = useDataStore((s) => s.removeFile);
  const { ingestFiles } = useFileIngestion();
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetId = useRef<string | null>(null);

  if (files.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-grey-400">Historial de archivos</h3>
      <ul className="flex flex-col gap-1.5">
        {files.map((file) => (
          <li
            key={file.id}
            className="flex items-center justify-between gap-3 rounded-sm border border-grey-200 bg-white px-3 py-2 text-xs dark:border-grey-700 dark:bg-grey-900"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-grey-900 dark:text-grey-100">{file.name}</p>
              <p className="text-grey-400">
                {file.rowCount.toLocaleString('es-ES')} filas · {file.schema.columns.length} columnas
                {file.errors.length > 0 && <span className="text-red-600 dark:text-red-400"> · {file.errors.length} avisos</span>}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                title="Reemplazar archivo"
                aria-label={`Reemplazar ${file.name}`}
                className="rounded-sm p-1.5 text-grey-400 hover:bg-grey-100 hover:text-navy dark:hover:bg-grey-800 dark:hover:text-gold"
                onClick={() => {
                  replaceTargetId.current = file.id;
                  replaceInputRef.current?.click();
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
              </button>
              <button
                type="button"
                title="Eliminar archivo"
                aria-label={`Eliminar ${file.name}`}
                className="rounded-sm p-1.5 text-grey-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                onClick={() => removeFile(file.id)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6h12Z" />
                </svg>
              </button>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-grey-400">
        Los archivos se combinan automáticamente en el análisis. Usa reemplazar para actualizar una fuente sin duplicar filas.
      </p>
      <input
        ref={replaceInputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.json"
        className="sr-only"
        onChange={(e) => {
          if (e.target.files && replaceTargetId.current) {
            void ingestFiles(e.target.files, replaceTargetId.current);
          }
          e.target.value = '';
          replaceTargetId.current = null;
        }}
      />
    </div>
  );
}
