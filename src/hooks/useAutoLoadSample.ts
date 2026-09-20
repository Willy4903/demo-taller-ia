import { useEffect, useRef } from 'react';
import { useDataStore } from '../store/useDataStore';
import { useFileIngestion } from './useFileIngestion';

/** On first mount, if no files are loaded yet, fetches and ingests the bundled sample dataset. */
export function useAutoLoadSample() {
  const files = useDataStore((s) => s.files);
  const { ingestFiles } = useFileIngestion();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current || files.length > 0) return;
    attempted.current = true;
    (async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}sample/ventas.csv`);
        if (!res.ok) return;
        const blob = await res.blob();
        const file = new File([blob], 'ventas.csv', { type: 'text/csv' });
        await ingestFiles([file]);
      } catch {
        // Sample dataset is optional; ignore failures (e.g. offline preview).
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
