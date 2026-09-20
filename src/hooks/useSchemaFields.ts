import { useMemo } from 'react';
import type { DatasetSchema } from '../lib/data/types';

export function useSchemaFields(schema: DatasetSchema) {
  return useMemo(() => {
    const numeric = schema.columns.filter((c) => c.type === 'number');
    const categorical = schema.columns.filter((c) => c.type === 'string' && c.distinctCount > 1 && c.distinctCount <= 60);
    const date = schema.columns.filter((c) => c.type === 'date');
    return { numeric, categorical, date };
  }, [schema]);
}
