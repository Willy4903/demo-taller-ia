import { useFilterStore } from '../../store/useFilterStore';

export function TextSearchFilter() {
  const textSearch = useFilterStore((s) => s.filters.textSearch);
  const setTextSearch = useFilterStore((s) => s.setTextSearch);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="global-search" className="text-xs font-semibold text-grey-700 dark:text-grey-200">
        Búsqueda de texto
      </label>
      <input
        id="global-search"
        type="search"
        value={textSearch}
        onChange={(e) => setTextSearch(e.target.value)}
        placeholder="Buscar en todas las columnas…"
        className="w-full rounded-sm border border-grey-200 bg-white px-2 py-1.5 text-xs text-grey-900 placeholder:text-grey-400 dark:border-grey-700 dark:bg-grey-900 dark:text-grey-100"
      />
    </div>
  );
}
