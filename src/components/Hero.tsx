import { DATASET } from '../data'
import { UNIVERSITARIO_ID } from '../data/teams'
import type { Tables } from '../domain/types'
import { rowOf } from '../engine/standings'
import { useCountUp } from '../hooks/useCountUp'
import { longDate } from './format'
import { HeroCanvas } from './HeroCanvas'

function Stat({ label, value, suffix = '', hint }: { label: string; value: number; suffix?: string; hint: string }) {
  const shown = useCountUp(value)
  return (
    <div className="border-l-2 border-dorado-400 pl-4">
      <p className="num font-display text-5xl font-black leading-none text-crema-50 sm:text-6xl" data-testid={`hero-${label}`}>
        {shown}
        <span className="text-3xl text-dorado-400">{suffix}</span>
      </p>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-dorado-300">{label}</p>
      <p className="text-xs text-crema-200/80">{hint}</p>
    </div>
  )
}

export function Hero({ tables }: { tables: Tables }) {
  const u = rowOf(tables.clausura, UNIVERSITARIO_ID)
  const leader = tables.clausura.rows[0]
  const gap = leader ? leader.pts - u.pts : 0
  return (
    <header className="grain relative isolate overflow-hidden bg-granate-900 text-crema-50">
      <HeroCanvas />
      <div className="relative mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-between px-4 pb-10 pt-8 sm:px-6">
        <div className="rise flex flex-wrap items-center justify-between gap-3 text-xs font-bold uppercase tracking-[0.25em] text-dorado-300">
          <span>Liga 1 Te Apuesto 2026 · Torneo Clausura</span>
          <span className="rounded border border-dorado-400/60 px-3 py-1 tracking-widest text-crema-100">
            Corte {longDate(DATASET.cutoff)}
          </span>
        </div>

        <div className="py-10">
          <div
            aria-hidden="true"
            className="rise mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-dorado-400 bg-granate-700/80 font-display text-4xl font-black text-dorado-400 pulse"
            style={{ animationDelay: '0.1s' }}
          >
            U
          </div>
          <h1 className="font-display font-black uppercase leading-[0.82]">
            <span className="rise block text-[clamp(3.5rem,15vw,11rem)] text-crema-50" style={{ animationDelay: '0.2s' }}>
              Clausura
            </span>
            <span className="rise stroke-text block text-[clamp(3.5rem,15vw,11rem)]" style={{ animationDelay: '0.35s' }}>
              2026
            </span>
            <span
              className="rise mt-4 block max-w-3xl font-body text-lg font-semibold normal-case leading-snug tracking-normal text-crema-100 sm:text-2xl"
              style={{ animationDelay: '0.55s' }}
            >
              Simulador de resultados · Universitario de Deportes. Treinta y cinco partidos, cuatro fechas y una tabla que se reescribe con cada
              marcador.
            </span>
          </h1>
          <div className="rise mt-7 flex flex-wrap gap-3" style={{ animationDelay: '0.75s' }}>
            <a
              href="#simulador"
              className="rounded bg-dorado-400 px-6 py-3 text-sm font-extrabold uppercase tracking-widest text-granate-900 hover:bg-dorado-300"
            >
              Entrar al simulador
            </a>
            <a
              href="#probabilidades"
              className="rounded border border-dorado-400 px-6 py-3 text-sm font-extrabold uppercase tracking-widest text-dorado-300 hover:bg-granate-800"
            >
              Ver probabilidades
            </a>
          </div>
        </div>

        <div className="rise grid grid-cols-2 gap-6 sm:grid-cols-4" style={{ animationDelay: '0.95s' }} aria-label="Situación de Universitario en el Clausura">
          <Stat label="Posición" value={u.position} suffix="º" hint="Universitario en el Clausura" />
          <Stat label="Puntos" value={u.pts} hint={`${u.pts - u.basePts >= 0 ? '+' : ''}${u.pts - u.basePts} simulados`} />
          <Stat label="Del líder" value={gap} hint={gap === 0 ? 'Universitario lidera' : `Líder: ${leader?.pts ?? 0} puntos`} />
          <Stat label="Por jugar" value={tables.pendingCount} hint={`${tables.simulatedCount} simulados de ${DATASET.fixtures.length}`} />
        </div>
      </div>
      <div className="h-1.5 bg-gradient-to-r from-granate-700 via-dorado-400 to-granate-700" />
    </header>
  )
}
