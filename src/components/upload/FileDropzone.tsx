import { useRef, useState } from 'react';
import { useFileIngestion } from '../../hooks/useFileIngestion';
import { ErrorState } from '../common/ErrorState';

const ACCEPTED = '.csv,.xlsx,.xls,.json';

export function FileDropzone() {
  const { ingestFiles, ingestErrors } = useFileIngestion();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) void ingestFiles(e.dataTransfer.files);
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        aria-label="Cargar archivos CSV, XLSX o JSON"
        className={`flex cursor-pointer items-center gap-3 rounded-sm border px-4 py-2 text-sm transition ${
          isDragging
            ? 'border-navy bg-navy/5 dark:border-gold dark:bg-gold/10'
            : 'border-grey-200 bg-white hover:border-navy/40 dark:border-grey-700 dark:bg-grey-900 dark:hover:border-gold/40'
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-grey-400 flex-shrink-0">
          <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
          <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </svg>
        <span className="text-grey-700 dark:text-grey-200">
          Arrastra archivos aquí o <span className="font-medium text-navy dark:text-gold">selecciona</span>{' '}
          <span className="text-grey-400">(.csv, .xlsx, .xls, .json)</span>
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) void ingestFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      {ingestErrors.length > 0 && (
        <ErrorState title="Problemas al procesar algunos archivos" errors={ingestErrors.map((e) => `${e.fileName}: ${e.message}`)} />
      )}
    </div>
  );
}
