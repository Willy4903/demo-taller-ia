import { useMemo, useState } from 'react'
import { DATASET } from '../data'
import { team } from '../data/lookup'
import { UNIVERSITARIO_ID } from '../data/teams'
import type { ScoreInputs, TableKind, Tables } from '../domain/types'
import { ceilings, TABLE_LABEL } from '../engine/maths'

const ROW = 36

export function RaceChart({ tables, inputs }: { tables: Tables; inputs: ScoreInputs }) {
  const [kind, setKind] = useState<TableKind>('clausura')
  const result = tables[kind]
  const ceil = useMemo(() => new Map(ceilings(DATASET, result, inputs).map((c) => [c.teamId, c])), [result, inputs])
  const scale = Math.max(...[...ceil.values()].map((c) => c.max), 1)
  const pct = (n: number) => `${(Math.max(0, n) / scale) * 100}%`

  return (
    <div className="rounded-md bg-granate-900 p-4 text-crema-50 shadow-lg ring-1 ring-granate-700 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-crema-200" aria-label="Leyenda">
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm bg-crema-200" aria-hidden="true" /> Puntos al corte
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm bg-dorado-400" aria-hidden="true" /> Puntos simulados
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm border border-dashed border-crema-200/70" aria-hidden="true" /> Techo si gana todo
          </li>
        </ul>
        <div role="group" aria-label="Tabla de la carrera" className="inline-flex rounded bg-granate-800 p-1">
          {(['clausura', 'acumulado'] as TableKind[]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={`rounded px-3 py-1 text-xs font-bold uppercase tracking-widest ${kind === k ? 'bg-dorado-400 text-granate-900' : 'text-crema-200 hover:bg-granate-700'}`}
            >
              {TABLE_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      <div className="relative" style={{ height: ROW * DATASET.teams.length }} role="list" aria-label={`Carrera de puntos, ${TABLE_LABEL[kind]}`}>
        {DATASET.teams.map((t) => {
          const row = result.rows.find((r) => r.teamId === t.id)
          const c = ceil.get(t.id)
          if (!row || !c) return null
          const isU = t.id === UNIVERSITARIO_ID
          const gain = row.pts - row.basePts
          return (
            <div
              key={t.id}
              role="listitem"
              data-testid={`race-${t.id}`}
              data-position={row.position}
              className="absolute left-0 right-0 flex items-center gap-2 transition-transform duration-700 ease-out"
              style={{ height: ROW, transform: `translateY(${(row.position - 1) * ROW}px)` }}
            >
              <span className="num w-6 shrink-0 text-right font-display text-lg font-extrabold text-dorado-300">{row.position}</span>
              <span className={`w-28 shrink-0 truncate text-sm sm:w-44 ${isU ? 'font-extrabold text-dorado-300' : 'text-crema-100'}`}>{team(t.id).name}</span>
              <div className="relative h-5 flex-1">
                <div className="bar-anim absolute inset-y-0 left-0 rounded-r border border-dashed border-crema-200/40" style={{ width: pct(c.max) }} />
                <div
                  className={`bar-anim absolute inset-y-0.5 left-0 rounded-r ${isU ? 'bg-crema-50' : 'bg-crema-200/85'}`}
                  style={{ width: pct(row.basePts) }}
                />
                <div className="bar-anim absolute inset-y-0.5 rounded-r bg-dorado-400" style={{ left: pct(row.basePts), width: pct(Math.max(0, row.pts) - Math.max(0, row.basePts)) }} />
              </div>
              <span className="num w-14 shrink-0 text-right text-sm font-bold text-crema-50">
                {row.pts}
                {gain !== 0 ? <span className="ml-1 text-xs text-dorado-300">{gain > 0 ? `+${gain}` : gain}</span> : null}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
