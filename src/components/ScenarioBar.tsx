import { DATASET } from '../data'
import type { ScoreInputs, Tables } from '../domain/types'
import { resultsCsv, standingsCsv } from '../engine/csv'
import { download } from './format'

interface Props {
  inputs: ScoreInputs
  tables: Tables
  onUniversitarioWins: () => void
  onAllDraw: () => void
  onReset: () => void
}

const primary = 'rounded bg-granate-700 px-4 py-2 text-sm font-semibold text-crema-50 hover:bg-granate-800'
const secondary = 'rounded bg-crema-50 px-4 py-2 text-sm font-semibold text-granate-800 ring-1 ring-granate-700 hover:bg-crema-200'

export function ScenarioBar({ inputs, tables, onUniversitarioWins, onAllDraw, onReset }: Props) {
  return (
    <section aria-label="Escenarios y exportación" className="rounded-md bg-crema-50 p-4 shadow-sm ring-1 ring-crema-300">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={primary} onClick={onUniversitarioWins}>
          Universitario gana todos
        </button>
        <button type="button" className={primary} onClick={onAllDraw}>
          Todos empatan
        </button>
        <button type="button" className={secondary} onClick={onReset} data-testid="reset">
          Restablecer
        </button>
        <span className="mx-1 hidden h-6 w-px bg-crema-400 sm:block" aria-hidden="true" />
        <button type="button" className={secondary} onClick={() => download('tabla_clausura_2026.csv', standingsCsv(DATASET, tables.clausura))}>
          CSV Clausura
        </button>
        <button type="button" className={secondary} onClick={() => download('tabla_acumulado_2026.csv', standingsCsv(DATASET, tables.acumulado))}>
          CSV acumulado
        </button>
        <button type="button" className={secondary} onClick={() => download('resultados_simulados_2026.csv', resultsCsv(DATASET, inputs))}>
          CSV resultados
        </button>
      </div>
      <p className="mt-2 text-xs text-tinta/70">
        Universitario gana todos fija 1-0 en sus cuatro partidos y conserva el resto. Todos empatan fija 0-0 en los {DATASET.fixtures.length} partidos pendientes. Las
        simulaciones se guardan en este navegador.
      </p>
    </section>
  )
}
