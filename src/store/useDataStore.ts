import { create } from 'zustand';
import { useMemo } from 'react';
import type { DataFile, Row } from '../lib/data/types';
import { detectSchema } from '../lib/parsing/schemaDetection';

interface StoredFile extends DataFile {
  rows: Row[];
}

interface DataStoreState {
  files: StoredFile[];
  activeRows: Row[];
  isParsing: boolean;
  parsingLabel: string | null;
  addFile: (file: DataFile & { rows: Row[] }) => void;
  removeFile: (id: string) => void;
  replaceFile: (id: string, file: DataFile & { rows: Row[] }) => void;
  clearAll: () => void;
  setParsing: (isParsing: boolean, label?: string | null) => void;
}

function recomputeActiveRows(files: StoredFile[]): Row[] {
  return files.flatMap((f) => f.rows);
}

export const useDataStore = create<DataStoreState>((set, get) => ({
  files: [],
  activeRows: [],
  isParsing: false,
  parsingLabel: null,
  addFile: (file) =>
    set((state) => {
      const files = [...state.files, file];
      return { files, activeRows: recomputeActiveRows(files) };
    }),
  removeFile: (id) =>
    set((state) => {
      const files = state.files.filter((f) => f.id !== id);
      return { files, activeRows: recomputeActiveRows(files) };
    }),
  replaceFile: (id, file) =>
    set((state) => {
      const files = state.files.map((f) => (f.id === id ? file : f));
      return { files, activeRows: recomputeActiveRows(files) };
    }),
  clearAll: () => set({ files: [], activeRows: [] }),
  setParsing: (isParsing, label = null) => set({ isParsing, parsingLabel: label }),
}));

/** Derived: a combined schema is recomputed from all active rows when files change. */
export function useCombinedSchema() {
  const activeRows = useDataStore((state) => state.activeRows);
  return useMemo(() => detectSchema(activeRows), [activeRows]);
}

export type { StoredFile };
