import { team } from '../data/lookup'
import type { TitleProjection } from '../engine/title'

const ELIG: Record<TitleProjection['clausuraChampionEligibility'], string> = {
  si: 'Cumple el criterio de posición en el acumulado',
  condicional: 'Condicional: está 8.º del acumulado y las fuentes discrepan entre 7 y 8',
  no: 'No cumple el criterio de posición en el acumulado',
}

export function TitlePanel({ title }: { title: TitleProjection }) {
  return (
    <section aria-labelledby="title-panel" className="rounded-md bg-crema-50 p-4 shadow-sm ring-1 ring-crema-300">
      <h2 id="title-panel" className="font-serif text-xl font-bold text-granate-800">
        Camino al título
      </h2>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-granate-700">Campeón del Apertura</dt>
          <dd className="font-semibold">{team(title.aperturaChampionId).name}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-granate-700">Líder proyectado del Clausura</dt>
          <dd className="font-semibold">
            {team(title.clausuraLeaderId).name}
            {title.clausuraLeaderProvisional ? ' (provisional)' : ''}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-granate-700">Posición del líder en el acumulado</dt>
          <dd>
            {title.clausuraChampionAcumPosition}.º. {ELIG[title.clausuraChampionEligibility]}
          </dd>
        </div>
      </dl>
      {title.directChampion ? (
        <p className="mt-3 rounded bg-dorado-200 p-3 text-sm font-semibold" data-testid="direct-champion">
          {team(title.clausuraLeaderId).name} sería campeón nacional directo por ganar Apertura y Clausura.
        </p>
      ) : (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-granate-700">Candidatos a la definición del título</p>
          <ul className="mt-1 space-y-1 text-sm" data-testid="contenders">
            {title.contenders.map((c) => (
              <li key={c.teamId}>
                <span className="font-semibold">{team(c.teamId).name}</span>: {c.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
      {title.notes.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-tinta/80">
          {title.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </section>
  )
}
