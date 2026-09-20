import type { FilterState } from './data/types';
import { emptyFilterState } from './data/types';

/** Serializes FilterState into URLSearchParams. */
export function filterStateToParams(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.dateRange?.field) {
    params.set('dateField', filters.dateRange.field);
    if (filters.dateRange.from) params.set('dateFrom', filters.dateRange.from);
    if (filters.dateRange.to) params.set('dateTo', filters.dateRange.to);
  }
  for (const [field, values] of Object.entries(filters.multiSelect)) {
    if (values.length > 0) params.set(`ms_${field}`, values.join(','));
  }
  for (const [field, [min, max]] of Object.entries(filters.numericRange)) {
    params.set(`nr_${field}`, `${min},${max}`);
  }
  if (filters.textSearch) params.set('q', filters.textSearch);
  return params;
}

/** Parses URLSearchParams back into a FilterState. */
export function paramsToFilterState(params: URLSearchParams): FilterState {
  const state = emptyFilterState();
  const dateField = params.get('dateField');
  if (dateField) {
    state.dateRange = {
      field: dateField,
      from: params.get('dateFrom'),
      to: params.get('dateTo'),
    };
  }
  for (const [key, value] of params.entries()) {
    if (key.startsWith('ms_')) {
      state.multiSelect[key.slice(3)] = value.split(',').filter(Boolean);
    } else if (key.startsWith('nr_')) {
      const [minStr, maxStr] = value.split(',');
      const min = Number(minStr);
      const max = Number(maxStr);
      if (!Number.isNaN(min) && !Number.isNaN(max)) {
        state.numericRange[key.slice(3)] = [min, max];
      }
    }
  }
  const q = params.get('q');
  if (q) state.textSearch = q;
  return state;
}

/** Pushes the given filter state to the browser URL without reloading. */
export function syncFilterStateToUrl(filters: FilterState): void {
  if (typeof window === 'undefined') return;
  const params = filterStateToParams(filters);
  const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
  window.history.replaceState(null, '', newUrl);
}

/** Reads the current filter state from the browser URL. */
export function readFilterStateFromUrl(): FilterState {
  if (typeof window === 'undefined') return emptyFilterState();
  return paramsToFilterState(new URLSearchParams(window.location.search));
}
