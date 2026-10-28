import { DATASET } from '../data'
import { longDate } from './format'

export function Header() {
  return (
    <header className="bg-granate-800 text-crema-50">
      <div className="h-1.5 bg-dorado-400" />
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-5 sm:px-6">
        <div
          aria-hidden="true"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-dorado-400 bg-granate-700 font-serif text-3xl font-bold text-dorado-400"
        >
          U
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-dorado-300">
            Liga 1 Te Apuesto 2026 · Torneo Clausura
          </p>
          <h1 className="font-serif text-2xl font-bold leading-tight sm:text-3xl">
            Simulador de resultados · Universitario de Deportes
          </h1>
        </div>
        <p className="rounded border border-dorado-400/60 px-3 py-1.5 text-sm text-crema-100">
          Datos al corte del <span className="font-semibold text-dorado-300">{longDate(DATASET.cutoff)}</span>
        </p>
      </div>
      <div className="border-t border-granate-600 bg-granate-900/60">
        <p className="mx-auto max-w-7xl px-4 py-2 text-xs text-crema-200 sm:px-6">
          Los datos provienen de resúmenes de medios deportivos y no de la web oficial de la Liga 1. Revisa la sección{' '}
          <a className="font-semibold text-dorado-300 underline" href="#fuentes">
            Fuentes y trazabilidad
          </a>{' '}
          antes de usarlos como referencia oficial.
        </p>
      </div>
    </header>
  )
}
