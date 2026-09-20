import { FilterPanel } from '../filters/FilterPanel';
import { FileHistory } from '../upload/FileHistory';

export function Sidebar() {
  return (
    <aside className="flex w-full flex-col gap-6 overflow-y-auto border-r border-grey-200 bg-grey-100/60 p-4 dark:border-grey-700 dark:bg-grey-950/40 lg:w-72 lg:flex-shrink-0">
      <FileHistory />
      <FilterPanel />
    </aside>
  );
}
