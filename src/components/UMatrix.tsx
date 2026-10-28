import { useMemo } from 'react'
import { DATASET } from '../data'
import { UNIVERSITARIO_ID } from '../data/teams'
import type { ScoreInputs } from '../domain/types'
import { teamRecordScenario } from '../engine/scenarios'
import { evaluateInput } from '../engine/scores'
import { computeTables, rowOf } from '../engine/standings'

interface Props {
  inputs: ScoreInputs
  onApply: (next: ScoreInputs) => void
}

const own = DATASET.fixtures.filter((f) => f.homeId === UNIVERSITARIO_ID || f.awayId === UNIVERSITARIO_ID)

function cellStyle(position: number): string {
  if (position === 1) return 'bg-dorado-400 text-granate-900'
  if (position === 2) return 'bg-dorado-200 text-tinta'
  if (position <= 4) return 'bg-crema-200 text-tinta'
  return 'bg-white text-tinta/80'
}

export function UMatrix({ inputs, onApply }: Props) {
  const n = own.length
  const grid = useMemo(() => {
    const rows: { wins: number; cells: { draws: number; pos: number; pts: number; acum: number; next: ScoreInputs }[] }[] = []
    for (let w = n; w >= 0; w--) {
      const cells = []
      for (let d = 0; d <= n - w; d++) {
        const next = teamRecordScenario(DATASET, inputs, UNIVERSITARIO_ID, w, d)
        const t = computeTables(DATASET, next)
        const c = rowOf(t.clausura, UNIVERSITARIO_ID)
        cells.push({ draws: d, pos: c.position, pts: c.pts, acum: rowOf(t.acumulado, UNIVERSITARIO_ID).position, next })
      }
      rows.push({ wins: w, cells })
    }
    return rows
  }, [inputs, n])

  const evals = own.map((f) => evaluateInput(inputs[f.id]))
  const allSet = evals.every((e) => e.status === 'complete')
  let activeW = -1
  let activeD = -1
  if (allSet) {
    activeW = own.filter((f, i) => {
      const s = evals[i]?.score
      if (!s) return false
      return f.homeId === UNIVERSITARIO_ID ? s.homeGoals > s.awayGoals : s.awayGoals > s.homeGoals
    }).length
    activeD = evals.filter((e) => e.score && e.score.homeGoals === e.score.awayGoals).length
  }

  return (
    <div className="rounded-md bg-crema-50 p-4 shadow-sm ring-1 ring-crema-300 sm:p-6">
      <div className="overflow-x-auto">
        <table className="num w-full min-w-[420px] border-separate border-spacing-1.5 text-center">
          <caption className="sr-only">
            Posición de Universitario en el Clausura según victorias y empates en sus {n} partidos pendientes. Cada celda aplica el escenario.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="p-1 text-left text-xs font-bold uppercase tracking-widest text-granate-700">
                Victorias ↓ / Empates →
              </th>
              {Array.from({ length: n + 1 }, (_, d) => (
                <th key={d} scope="col" className="p-1 text-sm font-bold text-granate-800">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row) => (
              <tr key={row.wins}>
                <th scope="row" className="p-1 text-left font-display text-2xl font-extrabold text-granate-800">
                  {row.wins} <span className="text-xs font-bold uppercase tracking-widest text-tinta/60">{row.wins === 1 ? 'victoria' : 'victorias'}</span>
                </th>
                {Array.from({ length: n + 1 }, (_, d) => {
                  const cell = row.cells.find((c) => c.draws === d)
                  if (!cell) return <td key={d} aria-hidden="true" />
                  const active = row.wins === activeW && d === activeD
                  return (
                    <td key={d}>
                      <button
                        type="button"
                        data-testid={`matrix-${row.wins}-${d}`}
                        aria-pressed={active}
                        aria-label={`${row.wins} victorias, ${d} empates, ${n - row.wins - d} derrotas: ${cell.pos}.º en el Clausura con ${cell.pts} puntos, ${cell.acum}.º en el acumulado`}
                        onClick={() => onApply(cell.next)}
                        className={`w-full rounded px-1 py-2 transition-transform hover:-translate-y-0.5 ${cellStyle(cell.pos)} ${active ? 'outline outline-[3px] outline-granate-700' : ''}`}
                      >
                        <span className="block font-display text-3xl font-black leading-none">{cell.pos}.º</span>
                        <span className="block text-xs font-semibold">{cell.pts} pts</span>
                        <span className="block text-[10px] opacity-75">Acum. {cell.acum}.º</span>
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-tinta/75">
        Cada celda muestra la posición en el Clausura, los puntos y la posición en el acumulado con 1-0 en cada victoria, 0-0 en cada empate y 0-1 en cada derrota. Es la
        posición inmediata: los demás clubes conservan los marcadores que tienen cargados y sus partidos pendientes aún sin jugar, así que no es la posición final. Las
        derrotas son los partidos restantes hasta completar {n}. Pulsa una celda para cargarla en el simulador.
      </p>
    </div>
  )
}
