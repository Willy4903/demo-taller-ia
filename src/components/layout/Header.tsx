import { FileDropzone } from '../upload/FileDropzone';
import { ReportButton } from '../report/ReportButton';
import { ThemeToggle } from '../common/ThemeToggle';
import type { DashboardConfig } from '../../appConfigs/types';

interface HeaderProps {
  config: DashboardConfig;
}

const CROSS_LINKS: Record<string, { href: string; label: string }> = {
  sales: { href: `${import.meta.env.BASE_URL}encuestas/`, label: 'Ver dashboard de encuestas' },
  survey: { href: `${import.meta.env.BASE_URL}`, label: 'Ver dashboard de ventas' },
};

export function Header({ config }: HeaderProps) {
  const crossLink = CROSS_LINKS[config.id];

  return (
    <header className="flex flex-col gap-3 border-b border-grey-200 bg-white px-4 py-3 dark:border-grey-700 dark:bg-grey-900 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-navy text-xs font-serif font-bold text-white dark:bg-gold dark:text-navy">
          E
        </div>
        <div>
          <h1 className="text-sm font-semibold text-grey-900 dark:text-grey-100">{config.title}</h1>
          <p className="text-[11px] text-grey-400">{config.subtitle}</p>
          {crossLink && (
            <a href={crossLink.href} className="text-[11px] font-medium text-navy underline-offset-2 hover:underline dark:text-gold">
              {crossLink.label}
            </a>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 sm:max-w-md sm:flex-row sm:items-center">
        <FileDropzone enrichRow={config.enrichRow} />
      </div>
      <div className="flex items-center gap-2">
        <ReportButton config={config} />
        <ThemeToggle />
      </div>
    </header>
  );
}
