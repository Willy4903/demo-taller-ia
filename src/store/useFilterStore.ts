import { create } from 'zustand';
import type { FilterState } from '../lib/data/types';
import { emptyFilterState } from '../lib/data/types';
import { readFilterStateFromUrl, syncFilterStateToUrl } from '../lib/urlState';

interface FilterStoreState {
  filters: FilterState;
  crossFilterField: string | null;
  crossFilterValue: string | null;
  setDateRange: (field: string, from: string | null, to: string | null) => void;
  clearDateRange: () => void;
  setMultiSelect: (field: string, values: string[]) => void;
  setNumericRange: (field: string, range: [number, number]) => void;
  clearNumericRange: (field: string) => void;
  setTextSearch: (text: string) => void;
  setCrossFilter: (field: string | null, value: string | null) => void;
  clearAll: () => void;
  hydrateFromUrl: () => void;
}

function persist(filters: FilterState) {
  syncFilterStateToUrl(filters);
}

export const useFilterStore = create<FilterStoreState>((set) => ({
  filters: emptyFilterState(),
  crossFilterField: null,
  crossFilterValue: null,
  setDateRange: (field, from, to) =>
    set((state) => {
      const filters = { ...state.filters, dateRange: { field, from, to } };
      persist(filters);
      return { filters };
    }),
  clearDateRange: () =>
    set((state) => {
      const filters = { ...state.filters, dateRange: undefined };
      persist(filters);
      return { filters };
    }),
  setMultiSelect: (field, values) =>
    set((state) => {
      const multiSelect = { ...state.filters.multiSelect, [field]: values };
      if (values.length === 0) delete multiSelect[field];
      const filters = { ...state.filters, multiSelect };
      persist(filters);
      return { filters };
    }),
  setNumericRange: (field, range) =>
    set((state) => {
      const filters = {
        ...state.filters,
        numericRange: { ...state.filters.numericRange, [field]: range },
      };
      persist(filters);
      return { filters };
    }),
  clearNumericRange: (field) =>
    set((state) => {
      const numericRange = { ...state.filters.numericRange };
      delete numericRange[field];
      const filters = { ...state.filters, numericRange };
      persist(filters);
      return { filters };
    }),
  setTextSearch: (text) =>
    set((state) => {
      const filters = { ...state.filters, textSearch: text };
      persist(filters);
      return { filters };
    }),
  setCrossFilter: (field, value) => set({ crossFilterField: field, crossFilterValue: value }),
  clearAll: () => {
    const filters = emptyFilterState();
    persist(filters);
    set({ filters, crossFilterField: null, crossFilterValue: null });
  },
  hydrateFromUrl: () => set({ filters: readFilterStateFromUrl() }),
}));
