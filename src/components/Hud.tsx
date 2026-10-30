import { DATASET } from '../data'
import { UNIVERSITARIO_ID } from '../data/teams'
import type { Tables } from '../domain/types'
import { rowOf } from '../engine/standings'

export function Hud({ tables, onReset }: { tables: Tables; onReset: () => void }) {
  const c = rowOf(tables.clausura, UNIVERSITARIO_ID)
  const a = rowOf(tables.acumulado, UNIVERSITARIO_ID)
  return (
    <div
      className="sticky top-0 z-40 border-b-2 border-dorado-400 bg-granate-900/95 text-crema-50 backdrop-blur"
      role="region"
      aria-label="Resumen en vivo de Universitario"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 text-sm sm:px-6">
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-dorado-400 font-display text-lg font-black text-dorado-400" aria-hidden="true">
          U
        </span>
        <span className="num" data-testid="hud-clausura">
          Clausura <b className="text-dorado-300">{c.position}.º</b> · {c.pts} pts
        </span>
        <span className="num" data-testid="hud-acumulado">
          Acumulado <b className="text-dorado-300">{a.position}.º</b> · {a.pts} pts
        </span>
        <span className="num text-crema-200" data-testid="hud-sim">
          {tables.simulatedCount}/{DATASET.fixtures.length} simulados
        </span>
        <button
          type="button"
          onClick={onReset}
          disabled={tables.simulatedCount === 0 && tables.ignoredCount === 0}
          className="ml-auto rounded border border-dorado-400 px-3 py-1 text-xs font-bold uppercase tracking-widest text-dorado-300 hover:bg-granate-800 disabled:opacity-40"
        >
          Restablecer
        </button>
      </div>
    </div>
  )
}
