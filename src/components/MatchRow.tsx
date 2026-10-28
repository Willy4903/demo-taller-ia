import { team } from '../data/lookup'
import { UNIVERSITARIO_ID } from '../data/teams'
import type { Fixture, ScoreInput } from '../domain/types'
import { evaluateInput, MAX_GOALS, outcomeOf, type Outcome } from '../engine/scores'
import { shortDate } from './format'

interface Props {
  fixture: Fixture
  input: ScoreInput | undefined
  onScore: (id: string, side: keyof ScoreInput, value: string) => void
  onPick: (id: string, outcome: Outcome) => void
  onClear: (id: string) => void
}

const OUTCOMES: { key: Outcome; label: string }[] = [
  { key: 'home', label: 'Local' },
  { key: 'draw', label: 'Empate' },
  { key: 'away', label: 'Visita' },
]

export function MatchRow({ fixture, input, onScore, onPick, onClear }: Props) {
  const home = team(fixture.homeId)
  const away = team(fixture.awayId)
  const ev = evaluateInput(input)
  const current = outcomeOf(input)
  const involvesU = fixture.homeId === UNIVERSITARIO_ID || fixture.awayId === UNIVERSITARIO_ID
  const errId = `err-${fixture.id}`
  const error = ev.homeError ?? ev.awayError
  const status =
    ev.status === 'complete'
      ? 'Simulado'
      : ev.status === 'partial'
        ? 'Incompleto: no cuenta'
        : ev.status === 'invalid'
          ? 'Inválido: no cuenta'
          : 'Pendiente'

  const field = (side: keyof ScoreInput, label: string, invalid: boolean) => (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      maxLength={2}
      aria-label={label}
      aria-invalid={invalid}
      aria-describedby={error ? errId : undefined}
      data-testid={`${side}-${fixture.id}`}
      value={input?.[side] ?? ''}
      onChange={(e) => onScore(fixture.id, side, e.target.value)}
      className={`num h-10 w-12 rounded border bg-white text-center text-lg font-bold text-tinta ${
        invalid ? 'border-granate-700 bg-granate-50' : 'border-crema-400'
      }`}
    />
  )

  return (
    <li
      data-testid={`match-${fixture.id}`}
      data-status={ev.status}
      className={`rounded-md border p-3 ${involvesU ? 'border-granate-700 bg-dorado-200/40' : 'border-crema-300 bg-white'}`}
    >
      <div className="mb-2 flex items-center justify-between text-xs text-tinta/70">
        <span>
          Fecha {fixture.fecha} · {shortDate(fixture.date)}
        </span>
        <span
          className={ev.status === 'complete' ? 'font-semibold text-green-800' : ev.status === 'empty' ? '' : 'font-semibold text-granate-700'}
        >
          {status}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <span className={`truncate text-right text-sm ${fixture.homeId === UNIVERSITARIO_ID ? 'font-bold text-granate-800' : 'font-medium'}`}>
          {home.name}
        </span>
        <span className="flex items-center gap-1">
          {field('home', `Goles de ${home.name} (local) contra ${away.name}`, ev.homeError !== null)}
          <span aria-hidden="true" className="font-bold">
            -
          </span>
          {field('away', `Goles de ${away.name} (visitante) contra ${home.name}`, ev.awayError !== null)}
        </span>
        <span className={`truncate text-left text-sm ${fixture.awayId === UNIVERSITARIO_ID ? 'font-bold text-granate-800' : 'font-medium'}`}>
          {away.name}
        </span>
      </div>
      {error && (
        <p id={errId} role="alert" className="mt-1 text-center text-xs font-semibold text-granate-700">
          {error}
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5" role="group" aria-label={`Resultado rápido ${home.name} contra ${away.name}`}>
        {OUTCOMES.map((o) => (
          <button
            key={o.key}
            type="button"
            data-testid={`${o.key}-btn-${fixture.id}`}
            aria-pressed={current === o.key}
            title={`${o.key === 'home' ? 'Gana ' + home.name + ' (1-0)' : o.key === 'away' ? 'Gana ' + away.name + ' (0-1)' : 'Empate (0-0)'}`}
            onClick={() => onPick(fixture.id, o.key)}
            className={`rounded px-3 py-1 text-xs font-semibold ring-1 ${
              current === o.key ? 'bg-granate-700 text-crema-50 ring-granate-700' : 'bg-crema-50 text-granate-800 ring-crema-400 hover:bg-crema-200'
            }`}
          >
            {o.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onClear(fixture.id)}
          disabled={ev.status === 'empty'}
          className="rounded px-3 py-1 text-xs font-semibold text-tinta/70 underline disabled:no-underline disabled:opacity-40"
        >
          Borrar
        </button>
      </div>
      <p className="sr-only">Los goles aceptan enteros de 0 a {MAX_GOALS}.</p>
    </li>
  )
}
