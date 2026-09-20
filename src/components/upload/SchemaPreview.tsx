import type { DatasetSchema } from '../../lib/data/types';

interface SchemaPreviewProps {
  schema: DatasetSchema;
}

const typeLabel: Record<string, string> = {
  string: 'Texto',
  number: 'Numérico',
  date: 'Fecha',
  boolean: 'Booleano',
};

export function SchemaPreview({ schema }: SchemaPreviewProps) {
  if (schema.columns.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-sm border border-grey-200 dark:border-grey-700">
      <table className="w-full min-w-[560px] text-left text-xs">
        <thead className="bg-grey-100 text-grey-700 dark:bg-grey-800 dark:text-grey-200">
          <tr>
            <th className="px-3 py-2 font-medium">Columna</th>
            <th className="px-3 py-2 font-medium">Tipo</th>
            <th className="px-3 py-2 font-medium">Nulos</th>
            <th className="px-3 py-2 font-medium">Valores únicos</th>
            <th className="px-3 py-2 font-medium">Ejemplo</th>
          </tr>
        </thead>
        <tbody>
          {schema.columns.map((col) => (
            <tr key={col.name} className="border-t border-grey-200 dark:border-grey-700">
              <td className="px-3 py-2 font-medium text-grey-900 dark:text-grey-100">{col.name}</td>
              <td className="px-3 py-2 text-grey-700 dark:text-grey-300">{typeLabel[col.type]}</td>
              <td className="px-3 py-2 text-grey-700 dark:text-grey-300">{col.nullCount.toLocaleString('es-ES')}</td>
              <td className="px-3 py-2 text-grey-700 dark:text-grey-300">{col.distinctCount.toLocaleString('es-ES')}</td>
              <td className="max-w-[160px] truncate px-3 py-2 text-grey-400">{col.sampleValues.join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-grey-200 px-3 py-2 text-[11px] text-grey-400 dark:border-grey-700">
        {schema.rowCount.toLocaleString('es-ES')} filas totales · {schema.duplicateRowCount.toLocaleString('es-ES')} filas duplicadas
        detectadas (muestra)
      </p>
    </div>
  );
}
