import { useId, useMemo, useState } from 'react'
import { DATASET } from '../data'
import type { ScoreInput, ScoreInputs } from '../domain/types'
import type { Outcome } from '../engine/scores'
import { MatchRow } from './MatchRow'

interface Props {
  inputs: ScoreInputs
  onScore: (id: string, side: keyof ScoreInput, value: string) => void
  onPick: (id: string, outcome: Outcome) => void
  onClear: (id: string) => void
}

const FECHAS = [...new Set(DATASET.fixtures.map((f) => f.fecha))].sort((a, b) => a - b)
const TEAMS = [...DATASET.teams].sort((a, b) => a.name.localeCompare(b.name, 'es'))

export function FixturePanel({ inputs, onScore, onPick, onClear }: Props) {
  const id = useId()
  const [teamId, setTeamId] = useState('')
  const [fecha, setFecha] = useState('')

  const visible = useMemo(
    () =>
      DATASET.fixtures.filter(
        (f) => (!teamId || f.homeId === teamId || f.awayId === teamId) && (!fecha || f.fecha === Number(fecha)),
      ),
    [teamId, fecha],
  )
  const groups = FECHAS.map((n) => ({ fecha: n, items: visible.filter((f) => f.fecha === n) })).filter((g) => g.items.length > 0)
  const select = 'w-full rounded border border-crema-400 bg-white px-2 py-2 text-sm'

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-md bg-crema-50 shadow-sm ring-1 ring-crema-300">
      <div className="border-b border-crema-300 px-4 py-3">
        <h2 id={`${id}-title`} className="font-serif text-xl font-bold text-granate-800">
          Partidos pendientes
        </h2>
        <p className="mt-1 text-xs text-tinta/70">
          Escribe el marcador o usa el acceso rápido (Local 1-0, Empate 0-0, Visita 0-1). Solo cuentan los marcadores completos.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${id}-team`} className="mb-1 block text-xs font-semibold text-granate-800">
              Equipo
            </label>
            <select id={`${id}-team`} className={select} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">Todos</option>
              {TEAMS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-fecha`} className="mb-1 block text-xs font-semibold text-granate-800">
              Fecha
            </label>
            <select id={`${id}-fecha`} className={select} value={fecha} onChange={(e) => setFecha(e.target.value)}>
              <option value="">Todas</option>
              {FECHAS.map((n) => (
                <option key={n} value={n}>
                  Fecha {n}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="mt-2 text-xs text-tinta/70" aria-live="polite" data-testid="fixture-count">
          Mostrando {visible.length} de {DATASET.fixtures.length} partidos
        </p>
      </div>
      <div className="space-y-4 p-4 lg:max-h-[70vh] lg:overflow-y-auto" tabIndex={0} aria-label="Lista de partidos">
        {groups.length === 0 && <p className="text-sm">No hay partidos con ese filtro.</p>}
        {groups.map((g) => {
          const win = DATASET.fechaWindows.find((w) => w.fecha === g.fecha)
          return (
            <div key={g.fecha}>
              <h3 className="mb-2 text-sm font-bold text-granate-700">
                Fecha {g.fecha}
                {win ? <span className="font-normal text-tinta/70"> · {win.window}</span> : null}
              </h3>
              {win?.note && <p className="mb-2 text-xs text-tinta/70">{win.note}</p>}
              <ul className="space-y-2">
                {g.items.map((f) => (
                  <MatchRow key={f.id} fixture={f} input={inputs[f.id]} onScore={onScore} onPick={onPick} onClear={onClear} />
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}
