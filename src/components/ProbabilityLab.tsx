import { useDeferredValue, useMemo, useState } from 'react'
import { DATASET } from '../data'
import { team } from '../data/lookup'
import { UNIVERSITARIO_ID } from '../data/teams'
import type { ScoreInputs } from '../domain/types'
import { runMonteCarlo } from '../engine/montecarlo'

const ITERATIONS = [2000, 10000, 50000]
const pct = (v: number): string => (v >= 0.995 ? '100 %' : v > 0 && v < 0.001 ? '<0,1 %' : `${(v * 100).toFixed(v < 0.1 ? 1 : 0).replace('.', ',')} %`)

function Histogram({ values, highlight, label }: { values: number[]; highlight: number; label: string }) {
  const max = Math.max(...values, 0.0001)
  return (
    <div role="img" aria-label={label}>
      <div className="flex h-32 items-end gap-0.5">
        {values.map((v, i) => (
          <div key={i} className="flex h-full flex-1 flex-col justify-end" title={`${i + 1}.º: ${pct(v)}`}>
            <div
              className={`bar-anim w-full rounded-t ${i === highlight ? 'bg-dorado-400' : 'bg-granate-700/80'}`}
              style={{ height: `${(v / max) * 100}%`, minHeight: v > 0 ? 2 : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-0.5 text-[10px] text-tinta/70" aria-hidden="true">
        {values.map((_, i) => (
          <span key={i} className="num flex-1 text-center">
            {i + 1}
          </span>
        ))}
      </div>
    </div>
  )
}

export function ProbabilityLab({ inputs }: { inputs: ScoreInputs }) {
  const [iterations, setIterations] = useState(10000)
  const [seed, setSeed] = useState(2026)
  const deferred = useDeferredValue(inputs)
  const stale = deferred !== inputs
  const result = useMemo(() => runMonteCarlo(DATASET, deferred, { iterations, seed }), [deferred, iterations, seed])

  const u = result.teams.find((t) => t.teamId === UNIVERSITARIO_ID)
  const champions = [...result.teams].filter((t) => t.clausuraChampion > 0).sort((a, b) => b.clausuraChampion - a.clausuraChampion).slice(0, 8)
  const relegation = [...result.teams].filter((t) => t.acumuladoRelegation >= 0.005).sort((a, b) => b.acumuladoRelegation - a.acumuladoRelegation)
  const alianza = result.teams.find((t) => t.teamId === DATASET.aperturaChampionId)
  if (!u) return null

  const stat = 'rounded bg-granate-900 p-4 text-crema-50 ring-1 ring-granate-700'
  return (
    <div className="space-y-4" aria-busy={stale}>
      <div className="flex flex-wrap items-center gap-3 rounded-md bg-crema-50 p-3 ring-1 ring-crema-300">
        <label htmlFor="mc-iter" className="text-xs font-bold uppercase tracking-widest text-granate-800">
          Simulaciones
        </label>
        <select id="mc-iter" value={iterations} onChange={(e) => setIterations(Number(e.target.value))} className="rounded border border-crema-400 bg-white px-2 py-1.5 text-sm">
          {ITERATIONS.map((n) => (
            <option key={n} value={n}>
              {n.toLocaleString('es-PE')}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setSeed((s) => s + 1)}
          className="rounded bg-granate-700 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-crema-50 hover:bg-granate-800"
        >
          Nueva semilla
        </button>
        <span className="num text-xs text-tinta/70">Semilla {seed}</span>
        <span className="ml-auto text-xs font-semibold text-granate-700" aria-live="polite">
          {stale ? 'Recalculando…' : `${result.simulatedMatches} partidos al azar, ${result.fixedMatches} fijados por ti`}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="mc-stats">
        <div className={stat}>
          <p className="text-xs font-bold uppercase tracking-widest text-dorado-300">Campeón del Clausura</p>
          <p className="num font-display text-4xl font-black text-dorado-400" data-testid="mc-u-champion">
            {pct(u.clausuraChampion)}
          </p>
          <p className="text-xs text-crema-200">Universitario</p>
        </div>
        <div className={stat}>
          <p className="text-xs font-bold uppercase tracking-widest text-dorado-300">Puntos esperados</p>
          <p className="num font-display text-4xl font-black text-crema-50">{u.meanClausuraPts.toFixed(1).replace('.', ',')}</p>
          <p className="text-xs text-crema-200">Clausura, de un máximo de 39</p>
        </div>
        <div className={stat}>
          <p className="text-xs font-bold uppercase tracking-widest text-dorado-300">Top 4 del acumulado</p>
          <p className="num font-display text-4xl font-black text-crema-50">{pct(u.acumuladoTop4)}</p>
          <p className="text-xs text-crema-200">Zona alta, sin cupo automático</p>
        </div>
        <div className={stat}>
          <p className="text-xs font-bold uppercase tracking-widest text-dorado-300">Título directo de Alianza</p>
          <p className="num font-display text-4xl font-black text-crema-50">{alianza ? pct(alianza.clausuraChampion) : '0 %'}</p>
          <p className="text-xs text-crema-200">Gana también el Clausura</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-md bg-crema-50 p-4 ring-1 ring-crema-300" aria-labelledby="mc-champs">
          <h3 id="mc-champs" className="font-display text-2xl font-extrabold uppercase text-granate-800">
            Quién gana el Clausura
          </h3>
          <ul className="mt-3 space-y-2">
            {champions.map((t) => (
              <li key={t.teamId} className="grid grid-cols-[8rem_1fr_3.5rem] items-center gap-2 text-sm sm:grid-cols-[10rem_1fr_3.5rem]">
                <span className={`truncate ${t.teamId === UNIVERSITARIO_ID ? 'font-bold text-granate-800' : ''}`}>{team(t.teamId).name}</span>
                <span className="h-3 rounded bg-crema-200">
                  <span className={`bar-anim block h-3 rounded ${t.teamId === UNIVERSITARIO_ID ? 'bg-dorado-500' : 'bg-granate-700'}`} style={{ width: `${t.clausuraChampion * 100}%` }} />
                </span>
                <span className="num text-right font-bold">{pct(t.clausuraChampion)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-md bg-crema-50 p-4 ring-1 ring-crema-300" aria-labelledby="mc-hist">
          <h3 id="mc-hist" className="font-display text-2xl font-extrabold uppercase text-granate-800">
            Dónde termina Universitario
          </h3>
          <p className="mb-1 mt-2 text-xs font-bold uppercase tracking-widest text-tinta/70">Clausura</p>
          <Histogram values={u.clausuraPosition} highlight={0} label="Probabilidad de cada posición final de Universitario en el Clausura" />
          <p className="mb-1 mt-3 text-xs font-bold uppercase tracking-widest text-tinta/70">Acumulado anual</p>
          <Histogram values={u.acumuladoPosition} highlight={1} label="Probabilidad de cada posición final de Universitario en el acumulado" />
        </section>
      </div>

      <section className="rounded-md bg-crema-50 p-4 ring-1 ring-crema-300" aria-labelledby="mc-rel">
        <h3 id="mc-rel" className="font-display text-2xl font-extrabold uppercase text-granate-800">
          Riesgo de descenso
        </h3>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {relegation.map((t) => (
            <li key={t.teamId} className="flex items-center justify-between rounded bg-white px-3 py-2 text-sm ring-1 ring-crema-300">
              <span>{team(t.teamId).name}</span>
              <span className={`num font-bold ${t.acumuladoRelegation > 0.5 ? 'text-granate-700' : ''}`}>{pct(t.acumuladoRelegation)}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-tinta/75">
        Es una estimación del modelo, no un pronóstico. Cada partido sin marcador se sortea con goles de Poisson según el ataque y la defensa de cada club en la
        temporada, suavizados hacia el promedio de la liga, sin ventaja de local, bajas ni forma reciente. Los empates absolutos se resuelven por sorteo. Con la
        misma semilla el resultado se repite.
      </p>
    </div>
  )
}
