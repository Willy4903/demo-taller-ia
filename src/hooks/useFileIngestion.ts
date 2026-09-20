import { useCallback, useState } from 'react';
import { parseFileInWorker } from '../lib/parsing/worker';
import { useDataStore } from '../store/useDataStore';
import { detectSchema } from '../lib/parsing/schemaDetection';
import type { DataFile, Row } from '../lib/data/types';

let nextId = 1;

export interface IngestError {
  fileName: string;
  message: string;
}

/**
 * Handles parsing + ingesting new files into the data store, with recompute-on-upload semantics.
 * `enrichRow`, when provided (e.g. by a DashboardConfig), is applied to every parsed row before
 * the schema is (re)detected, so derived columns are treated like any other field downstream.
 */
export function useFileIngestion(enrichRow?: (row: Row) => Row) {
  const addFile = useDataStore((s) => s.addFile);
  const replaceFile = useDataStore((s) => s.replaceFile);
  const setParsing = useDataStore((s) => s.setParsing);
  const [ingestErrors, setIngestErrors] = useState<IngestError[]>([]);

  const ingestFiles = useCallback(
    async (fileList: FileList | File[], replaceId?: string) => {
      const files = Array.from(fileList);
      if (files.length === 0) return;
      setIngestErrors([]);
      setParsing(true, files.length === 1 ? files[0].name : `${files.length} archivos`);
      try {
        for (const file of files) {
          try {
            const result = await parseFileInWorker(file);
            const rows = enrichRow ? result.rows.map(enrichRow) : result.rows;
            const schema = enrichRow ? detectSchema(rows) : result.schema;
            const dataFile: DataFile & { rows: Row[] } = {
              id: replaceId ?? `file-${nextId++}-${Date.now()}`,
              name: result.fileName,
              addedAt: Date.now(),
              rowCount: rows.length,
              schema,
              errors: result.errors,
              rows,
            };
            if (replaceId) {
              replaceFile(replaceId, dataFile);
            } else {
              addFile(dataFile);
            }
            if (result.errors.length > 0) {
              setIngestErrors((prev) => [
                ...prev,
                ...result.errors.map((message) => ({ fileName: file.name, message })),
              ]);
            }
          } catch (err) {
            setIngestErrors((prev) => [
              ...prev,
              { fileName: file.name, message: (err as Error).message ?? 'Error desconocido al procesar el archivo.' },
            ]);
          }
        }
      } finally {
        setParsing(false, null);
      }
    },
    [addFile, replaceFile, setParsing, enrichRow],
  );

  return { ingestFiles, ingestErrors };
}
