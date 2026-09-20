import { useMemo } from 'react';
import { useDataStore } from '../store/useDataStore';
import { useFilterStore } from '../store/useFilterStore';
import { applyFilters } from '../lib/data/filtering';
import type { Row } from '../lib/data/types';

/** Returns dataset rows after applying global filters + active cross-filter (chart click-to-filter). */
export function useFilteredRows(): Row[] {
  const activeRows = useDataStore((s) => s.activeRows);
  const filters = useFilterStore((s) => s.filters);
  const crossFilterField = useFilterStore((s) => s.crossFilterField);
  const crossFilterValue = useFilterStore((s) => s.crossFilterValue);

  return useMemo(() => {
    let rows = applyFilters(activeRows, filters);
    if (crossFilterField && crossFilterValue !== null) {
      rows = rows.filter((r) => String(r[crossFilterField]) === crossFilterValue);
    }
    return rows;
  }, [activeRows, filters, crossFilterField, crossFilterValue]);
}
