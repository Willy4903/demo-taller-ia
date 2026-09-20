import { FileDropzone } from '../upload/FileDropzone';
import { ReportButton } from '../report/ReportButton';
import { ThemeToggle } from '../common/ThemeToggle';

export function Header() {
  return (
    <header className="flex flex-col gap-3 border-b border-grey-200 bg-white px-4 py-3 dark:border-grey-700 dark:bg-grey-900 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-navy text-xs font-serif font-bold text-white dark:bg-gold dark:text-navy">
          E
        </div>
        <div>
          <h1 className="text-sm font-semibold text-grey-900 dark:text-grey-100">Dashboard Analítico Ejecutivo</h1>
          <p className="text-[11px] text-grey-400">Todo el procesamiento ocurre en tu navegador</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 sm:max-w-md sm:flex-row sm:items-center">
        <FileDropzone />
      </div>
      <div className="flex items-center gap-2">
        <ReportButton />
        <ThemeToggle />
      </div>
    </header>
  );
}
