import { useCallback, useState } from 'react';
import { parseFileInWorker } from '../lib/parsing/worker';
import { useDataStore } from '../store/useDataStore';
import type { DataFile } from '../lib/data/types';

let nextId = 1;

export interface IngestError {
  fileName: string;
  message: string;
}

/** Handles parsing + ingesting new files into the data store, with recompute-on-upload semantics. */
export function useFileIngestion() {
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
            const dataFile: DataFile & { rows: (typeof result)['rows'] } = {
              id: replaceId ?? `file-${nextId++}-${Date.now()}`,
              name: result.fileName,
              addedAt: Date.now(),
              rowCount: result.rows.length,
              schema: result.schema,
              errors: result.errors,
              rows: result.rows,
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
    [addFile, replaceFile, setParsing],
  );

  return { ingestFiles, ingestErrors };
}
