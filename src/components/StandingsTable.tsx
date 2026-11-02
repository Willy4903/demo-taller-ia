import { useId, useRef, type KeyboardEvent } from 'react'
import { team } from '../data/lookup'
import { UNIVERSITARIO_ID } from '../data/teams'
import type { StandingRow, StandingsResult, TableKind, Tables, ZoneId } from '../domain/types'
import { rowOf } from '../engine/standings'
import { ZONE_LABELS } from '../engine/rules'
import { signed } from './format'
import { TeamBadge } from './TeamBadge'

const ZONE_STYLE: Record<ZoneId, { row: string; chip: string; dot: string }> = {
  campeon: { row: 'bg-dorado-200/70', chip: 'bg-dorado-400 text-tinta', dot: 'bg-dorado-500' },
  alta: { row: 'bg-dorado-200/50', chip: 'bg-dorado-300 text-tinta', dot: 'bg-dorado-500' },
  sudamericana: { row: 'bg-crema-200/80', chip: 'bg-crema-300 text-tinta', dot: 'bg-crema-400' },
  media: { row: '', chip: 'bg-crema-100 text-tinta/70', dot: 'bg-transparent ring-1 ring-crema-400' },
  descenso: { row: 'bg-granate-100/80', chip: 'bg-granate-700 text-crema-50', dot: 'bg-granate-700' },
}

const SHORT_ZONE: Record<ZoneId, string> = {
  campeon: 'Campeón',
  alta: 'Zona alta',
  sudamericana: 'Sudamericana',
  media: 'Intermedia',
  descenso: 'Descenso',
}

const TAB_LABEL: Record<TableKind, string> = { clausura: 'Clausura', acumulado: 'Acumulado anual' }

function Movement({ row }: { row: StandingRow }) {
  const diff = row.basePosition - row.position
  if (diff === 0) return <span className="text-tinta/40" aria-label="Sin cambio">–</span>
  const up = diff > 0
  return (
    <span className={up ? 'text-green-800' : 'text-granate-700'} aria-label={up ? `Sube ${diff}` : `Baja ${-diff}`}>
      {up ? '▲' : '▼'}
      {Math.abs(diff)}
    </span>
  )
}

interface Props {
  kind: TableKind
  onKindChange: (k: TableKind) => void
  tables: Tables
}

export function StandingsTable({ kind, onKindChange, tables }: Props) {
  const baseId = useId()
  const result: StandingsResult = tables[kind]
  const withRecord = kind === 'clausura'
  const tabs: TableKind[] = ['clausura', 'acumulado']
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    const next =
      e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
    const k = tabs[next]
    if (k) {
      onKindChange(k)
      refs.current[k]?.focus()
    }
  }

  const acumPos = (id: string) => rowOf(tables.acumulado, id).position
  const legendZones: ZoneId[] = kind === 'clausura' ? ['campeon', 'media'] : ['alta', 'sudamericana', 'media', 'descenso']

  return (
    <section aria-labelledby={`${baseId}-title`} className="rounded-md bg-crema-50 shadow-sm ring-1 ring-crema-300">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-crema-300 px-4 py-3">
        <h2 id={`${baseId}-title`} className="font-serif text-xl font-bold text-granate-800">
          Clasificación proyectada
        </h2>
        <div role="tablist" aria-label="Tipo de tabla" className="inline-flex rounded-md bg-crema-200 p-1">
          {tabs.map((k, i) => (
            <button
              key={k}
              ref={(el) => {
                refs.current[k] = el
              }}
              role="tab"
              type="button"
              id={`${baseId}-tab-${k}`}
              aria-selected={kind === k}
              aria-controls={`${baseId}-panel`}
              tabIndex={kind === k ? 0 : -1}
              onClick={() => onKindChange(k)}
              onKeyDown={(e) => onKey(e, i)}
              className={`rounded px-4 py-1.5 text-sm font-semibold transition-colors ${
                kind === k ? 'bg-granate-700 text-crema-50 shadow' : 'text-granate-800 hover:bg-crema-300'
              }`}
            >
              {TAB_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${kind}`}>
        <div className="overflow-x-auto" tabIndex={0} aria-label={`Tabla ${TAB_LABEL[kind]}, desplazable en pantallas pequeñas`}>
          <table className="num w-full min-w-[420px] border-collapse text-sm">
            <caption className="sr-only">
              Tabla {TAB_LABEL[kind]} proyectada con {tables.simulatedCount} partidos simulados
            </caption>
            <thead className="bg-granate-800 text-xs uppercase tracking-wide text-crema-50">
              <tr>
                <th scope="col" className="px-2 py-2 text-center">Pos</th>
                <th scope="col" className="px-1 py-2 text-center">
                  <span className="sr-only">Cambio</span>
                </th>
                <th scope="col" className="px-2 py-2 text-left">Equipo</th>
                <th scope="col" className="px-2 py-2 text-right">PJ</th>
                {withRecord && (
                  <>
                    <th scope="col" className="hidden px-2 py-2 text-right sm:table-cell">PG</th>
                    <th scope="col" className="hidden px-2 py-2 text-right sm:table-cell">PE</th>
                    <th scope="col" className="hidden px-2 py-2 text-right sm:table-cell">PP</th>
                  </>
                )}
                <th scope="col" className="hidden px-2 py-2 text-right md:table-cell">GF</th>
                <th scope="col" className="hidden px-2 py-2 text-right md:table-cell">GC</th>
                <th scope="col" className="px-2 py-2 text-right">DG</th>
                <th scope="col" className="px-2 py-2 text-right">Pts</th>
                <th scope="col" className="hidden px-2 py-2 text-right lg:table-cell">Δ Pts</th>
                <th scope="col" className="hidden px-2 py-2 text-left lg:table-cell">
                  {kind === 'clausura' ? 'Acum.' : 'Zona'}
                </th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r) => {
                const isU = r.teamId === UNIVERSITARIO_ID
                const z = ZONE_STYLE[r.zone]
                const acumZone = kind === 'clausura' ? rowOf(tables.acumulado, r.teamId).zone : null
                return (
                  <tr
                    key={r.teamId}
                    data-testid={`row-${kind}-${r.teamId}`}
                    data-zone={r.zone}
                    aria-current={isU ? 'true' : undefined}
                    className={`border-b border-crema-300 ${z.row} ${isU ? 'font-bold outline outline-2 -outline-offset-2 outline-granate-700' : ''}`}
                  >
                    <td className="px-2 py-1.5 text-center">
                      <span className="inline-flex items-center justify-center gap-1.5">
                        <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${z.dot}`} />
                        <span data-testid="pos">{r.position}</span>
                      </span>
                    </td>
                    <td className="px-1 py-1.5 text-center text-xs">
                      <Movement row={r} />
                    </td>
                    <th scope="row" className="px-2 py-1.5 text-left font-[inherit]">
                      <span className="flex items-center gap-2">
                        <TeamBadge id={r.teamId} />
                        <span className={isU ? 'text-granate-800' : ''}>{team(r.teamId).name}</span>
                        {r.provisional && (
                          <span
                            className="rounded bg-dorado-300 px-1 text-[10px] font-bold text-tinta"
                            title="Clasificación provisional: empate sin datos de Fair Play ni enfrentamientos directos"
                          >
                            <span aria-hidden="true">≈</span>
                            <span className="sr-only">Provisional</span>
                          </span>
                        )}
                        {kind === 'clausura' && acumZone === 'descenso' && (
                          <span
                            className="rounded bg-granate-700 px-1 text-[10px] font-bold text-crema-50"
                            title={`Zona de descenso del acumulado (${acumPos(r.teamId)}.º)`}
                          >
                            Desc.
                          </span>
                        )}
                      </span>
                    </th>
                    <td className="px-2 py-1.5 text-right">{r.pj}</td>
                    {withRecord && (
                      <>
                        <td className="hidden px-2 py-1.5 text-right sm:table-cell">{r.pg}</td>
                        <td className="hidden px-2 py-1.5 text-right sm:table-cell">{r.pe}</td>
                        <td className="hidden px-2 py-1.5 text-right sm:table-cell">{r.pp}</td>
                      </>
                    )}
                    <td className="hidden px-2 py-1.5 text-right md:table-cell">{r.gf}</td>
                    <td className="hidden px-2 py-1.5 text-right md:table-cell">{r.gc}</td>
                    <td className="px-2 py-1.5 text-right">{signed(r.gd)}</td>
                    <td className="px-2 py-1.5 text-right font-bold" data-testid="pts">
                      {r.pts}
                    </td>
                    <td className="hidden px-2 py-1.5 text-right text-xs lg:table-cell">
                      {r.pts - r.basePts === 0 ? <span className="text-tinta/40">–</span> : signed(r.pts - r.basePts)}
                    </td>
                    <td className="hidden px-2 py-1.5 text-left text-xs lg:table-cell">
                      {kind === 'clausura' ? `${acumPos(r.teamId)}.º` : SHORT_ZONE[r.zone]}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <ul className="grid gap-x-6 gap-y-1 border-t border-crema-300 px-4 py-3 text-xs sm:grid-cols-2" aria-label="Leyenda de zonas">
          {legendZones.map((z) => (
            <li key={z} className="flex items-start gap-2">
              <span aria-hidden="true" className={`mt-0.5 h-3 w-3 shrink-0 rounded-full ${ZONE_STYLE[z].dot}`} />
              <span>
                <span className="font-semibold">{ZONE_LABELS[z].label}.</span> {ZONE_LABELS[z].detail}
              </span>
            </li>
          ))}
          <li className="flex items-start gap-2 sm:col-span-2">
            <span aria-hidden="true" className="mt-0.5 rounded bg-dorado-300 px-1 text-[10px] font-bold">≈</span>
            <span>Orden provisional: empate en puntos, diferencia y goles a favor sin datos de Fair Play ni enfrentamientos directos.</span>
          </li>
        </ul>
        {result.ties.length > 0 && (
          <div role="alert" className="border-t border-dorado-500 bg-dorado-200 px-4 py-3 text-sm text-tinta">
            <p className="font-semibold">Clasificación provisional</p>
            <ul className="mt-1 list-disc pl-5">
              {result.ties.map((t) => (
                <li key={t.teamIds.join('|')}>
                  {t.teamIds.map((id) => team(id).name).join(', ')} empatan en las posiciones {t.positions[0]} a {t.positions[1]}
                  {t.critical ? ' y el empate cruza un límite de zona. ' : '. '}
                  No hay datos para resolverlo; el orden mostrado es alfabético.
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
