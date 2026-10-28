import { DATASET } from '../data'
import { team } from '../data/lookup'
import { RULE_NOTES } from '../engine/rules'
import { longDate } from './format'

function SourceLinks({ ids }: { ids: string[] }) {
  return (
    <span className="text-xs text-tinta/70">
      {' '}
      Fuentes:{' '}
      {ids.map((id, i) => {
        const s = DATASET.sources.find((x) => x.id === id)
        return s ? (
          <span key={id}>
            {i > 0 ? ', ' : ''}
            <a className="underline" href={s.url} target="_blank" rel="noreferrer">
              {s.label}
            </a>
          </span>
        ) : null
      })}
    </span>
  )
}

const block = 'rounded-md bg-crema-50 p-4 shadow-sm ring-1 ring-crema-300'
const h3 = 'font-display text-lg font-bold text-granate-800'

export function DataPanel() {
  return (
    <section id="fuentes" aria-labelledby="fuentes-title" className="space-y-4">
      <h2 id="fuentes-title" className="font-display text-2xl font-bold text-granate-800">
        Fuentes y trazabilidad
      </h2>
      <p className="text-sm">
        Datos al corte del {longDate(DATASET.cutoff)}, versión <code>{DATASET.version}</code>. Se registran por separado la tabla del
        Clausura, el Apertura final, los ajustes del acumulado y el fixture pendiente.
      </p>

      <div className={block}>
        <h3 className={h3}>Deducciones de puntos y ajustes</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {DATASET.deductions.map((d) => (
            <li key={`${d.teamId}-${d.scope}`}>
              <span className="font-semibold">
                {team(d.teamId).name}, {d.points} pts en {d.scope === 'clausura' ? 'el Clausura' : 'el acumulado'} ({d.status}).
              </span>{' '}
              {d.description}
              <SourceLinks ids={d.sourceIds} />
            </li>
          ))}
        </ul>
      </div>

      <div className={block}>
        <h3 className={h3}>Discrepancias entre fuentes</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {DATASET.discrepancies.map((d) => (
            <li key={d.id}>
              <span className="font-semibold">{d.subject}.</span> {d.detail} <span className="italic">Decisión:</span> {d.resolution}
              <SourceLinks ids={d.sourceIds} />
            </li>
          ))}
        </ul>
      </div>

      <div className={block}>
        <h3 className={h3}>Reglamento aplicado</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {RULE_NOTES.map((r) => (
            <li key={r.article}>
              <span className="font-semibold">
                {r.article}. {r.title}
              </span>{' '}
              <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${r.verified ? 'bg-dorado-300' : 'bg-granate-100 text-granate-800'}`}>
                {r.verified ? 'Coinciden dos fuentes secundarias' : 'No verificado en el PDF oficial'}
              </span>
              <br />
              {r.text}
            </li>
          ))}
        </ul>
      </div>

      <div className={block}>
        <h3 className={h3}>Lista de fuentes</h3>
        <ul className="mt-2 space-y-1 text-sm">
          {DATASET.sources.map((s) => (
            <li key={s.id}>
              <a className="font-semibold underline" href={s.url} target="_blank" rel="noreferrer">
                {s.label}
              </a>{' '}
              <span className="text-xs text-tinta/70">
                Consultada el {longDate(s.accessed)}
                {s.access === 'resumen' ? ' vía resumen de búsqueda (página no leída directamente)' : ''}.{s.note ? ` ${s.note}` : ''}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
