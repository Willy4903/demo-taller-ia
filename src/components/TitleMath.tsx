import { useMemo } from 'react'
import { DATASET } from '../data'
import { team } from '../data/lookup'
import { UNIVERSITARIO_ID } from '../data/teams'
import type { ScoreInputs, Tables } from '../domain/types'
import { ceilings, type RelegationStatus, type TitleStatus } from '../engine/maths'

const TITLE: Record<TitleStatus, { label: string; cls: string }> = {
  campeon: { label: 'Campeón matemático', cls: 'bg-dorado-400 text-granate-900' },
  'en-carrera': { label: 'En carrera', cls: 'bg-crema-200 text-tinta' },
  eliminado: { label: 'Sin opciones', cls: 'bg-granate-100 text-granate-800' },
}
const REL: Record<RelegationStatus, { label: string; cls: string }> = {
  descendido: { label: 'Descendido', cls: 'bg-granate-700 text-crema-50' },
  salvado: { label: 'A salvo', cls: 'bg-dorado-200 text-tinta' },
  'en-juego': { label: 'En juego', cls: 'bg-crema-200 text-tinta' },
}

export function TitleMath({ tables, inputs }: { tables: Tables; inputs: ScoreInputs }) {
  const clausura = useMemo(() => ceilings(DATASET, tables.clausura, inputs), [tables, inputs])
  const acumulado = useMemo(() => ceilings(DATASET, tables.acumulado, inputs), [tables, inputs])
  const th = 'px-2 py-1.5 text-xs font-bold uppercase tracking-wide'

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-md bg-crema-50 ring-1 ring-crema-300" aria-labelledby="tm-title">
        <h3 id="tm-title" className="px-4 pt-4 font-display text-2xl font-extrabold uppercase text-granate-800">
          Título del Clausura
        </h3>
        <div className="overflow-x-auto p-2">
          <table className="num w-full text-sm">
            <caption className="sr-only">Puntos actuales, techo y situación en la carrera por el título del Clausura</caption>
            <thead className="text-left text-granate-700">
              <tr>
                <th scope="col" className={th}>Equipo</th>
                <th scope="col" className={`${th} text-right`}>Pts</th>
                <th scope="col" className={`${th} text-right`}>Faltan</th>
                <th scope="col" className={`${th} text-right`}>Techo</th>
                <th scope="col" className={th}>Situación</th>
              </tr>
            </thead>
            <tbody>
              {tables.clausura.rows.map((r) => {
                const c = clausura.find((x) => x.teamId === r.teamId)
                if (!c) return null
                return (
                  <tr key={r.teamId} data-testid={`title-${r.teamId}`} className={`border-t border-crema-300 ${r.teamId === UNIVERSITARIO_ID ? 'bg-dorado-200/60 font-bold' : ''}`}>
                    <th scope="row" className="px-2 py-1 text-left font-[inherit]">{team(r.teamId).name}</th>
                    <td className="px-2 py-1 text-right">{c.pts}</td>
                    <td className="px-2 py-1 text-right">{c.pending}</td>
                    <td className="px-2 py-1 text-right">{c.max}</td>
                    <td className="px-2 py-1">
                      <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${TITLE[c.title].cls}`}>{TITLE[c.title].label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-md bg-crema-50 ring-1 ring-crema-300" aria-labelledby="tm-rel">
        <h3 id="tm-rel" className="px-4 pt-4 font-display text-2xl font-extrabold uppercase text-granate-800">
          Descenso del acumulado
        </h3>
        <div className="overflow-x-auto p-2">
          <table className="num w-full text-sm">
            <caption className="sr-only">Puntos actuales, techo y riesgo de descenso en la tabla acumulada</caption>
            <thead className="text-left text-granate-700">
              <tr>
                <th scope="col" className={th}>Equipo</th>
                <th scope="col" className={`${th} text-right`}>Pts</th>
                <th scope="col" className={`${th} text-right`}>Faltan</th>
                <th scope="col" className={`${th} text-right`}>Techo</th>
                <th scope="col" className={th}>Situación</th>
              </tr>
            </thead>
            <tbody>
              {tables.acumulado.rows.map((r) => {
                const c = acumulado.find((x) => x.teamId === r.teamId)
                if (!c) return null
                return (
                  <tr key={r.teamId} data-testid={`rel-${r.teamId}`} className={`border-t border-crema-300 ${r.teamId === UNIVERSITARIO_ID ? 'bg-dorado-200/60 font-bold' : ''}`}>
                    <th scope="row" className="px-2 py-1 text-left font-[inherit]">{team(r.teamId).name}</th>
                    <td className="px-2 py-1 text-right">{c.pts}</td>
                    <td className="px-2 py-1 text-right">{c.pending}</td>
                    <td className="px-2 py-1 text-right">{c.max}</td>
                    <td className="px-2 py-1">
                      <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${REL[c.relegation].cls}`}>{REL[c.relegation].label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
      <p className="text-xs text-tinta/75 lg:col-span-2">
        Techo = puntos actuales + 3 por cada partido que falta. Sin opciones: ni ganando todo alcanza los puntos actuales del líder. Campeón matemático: tiene más puntos
        que el techo de cualquier otro. Descendido: al menos 17 equipos ya tienen más puntos que su techo. A salvo: al menos dos equipos no pueden alcanzar sus puntos. Las
        desigualdades son estrictas, por lo que un empate en puntos no se da por resuelto.
      </p>
    </div>
  )
}
