import { DATASET } from '../data'
import { team } from '../data/lookup'
import { UNIVERSITARIO_ID } from '../data/teams'
import type { StandingRow, Tables } from '../domain/types'
import { rowOf } from '../engine/standings'
import { ordinal, signed } from './format'

interface KpiProps {
  label: string
  value: string
  detail: string
  delta?: string | null
  deltaLabel?: string
  tone?: 'granate' | 'dorado' | 'neutro'
}

function Kpi({ label, value, detail, delta, deltaLabel, tone = 'neutro' }: KpiProps) {
  const accent =
    tone === 'granate' ? 'border-granate-700' : tone === 'dorado' ? 'border-dorado-500' : 'border-crema-400'
  return (
    <div className={`rounded-md border-t-4 bg-crema-50 p-3 shadow-sm sm:p-4 ring-1 ring-crema-300 ${accent}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-granate-700">{label}</p>
      <p className="num mt-1 break-words font-serif text-2xl font-bold leading-tight text-tinta sm:text-3xl">
        {value}
        {delta ? (
          <span className="ml-2 align-middle text-sm font-semibold text-granate-700" aria-label={deltaLabel}>
            {delta}
          </span>
        ) : null}
      </p>
      <p className="mt-1 text-xs text-tinta/75 sm:text-sm">{detail}</p>
    </div>
  )
}

function movement(row: StandingRow): { text: string | null; label: string } {
  const diff = row.basePosition - row.position
  if (diff === 0) return { text: null, label: 'Sin cambio de posición respecto al corte' }
  return {
    text: diff > 0 ? `▲${diff}` : `▼${-diff}`,
    label: diff > 0 ? `Sube ${diff} posiciones respecto al corte` : `Baja ${-diff} posiciones respecto al corte`,
  }
}

export function KpiGrid({ tables }: { tables: Tables }) {
  const uc = rowOf(tables.clausura, UNIVERSITARIO_ID)
  const ua = rowOf(tables.acumulado, UNIVERSITARIO_ID)
  const lc = tables.clausura.rows[0]
  const la = tables.acumulado.rows[0]
  if (!lc || !la) return null
  const mc = movement(uc)
  const ma = movement(ua)
  const total = DATASET.fixtures.length
  return (
    <section aria-label="Indicadores principales" className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      <Kpi
        label="Universitario · Clausura"
        value={ordinal(uc.position)}
        delta={mc.text}
        deltaLabel={mc.label}
        detail={`${uc.pts} puntos (${signed(uc.pts - uc.basePts)} simulados)`}
        tone="granate"
      />
      <Kpi
        label="Universitario · Acumulado"
        value={ordinal(ua.position)}
        delta={ma.text}
        deltaLabel={ma.label}
        detail={`${ua.pts} puntos (${signed(ua.pts - ua.basePts)} simulados)`}
        tone="granate"
      />
      <Kpi
        label="Líder del Clausura"
        value={team(lc.teamId).name}
        detail={`${lc.pts} puntos${lc.provisional ? ' · provisional' : ''}`}
        tone="dorado"
      />
      <Kpi
        label="Líder del acumulado"
        value={team(la.teamId).name}
        detail={`${la.pts} puntos${la.provisional ? ' · provisional' : ''}`}
        tone="dorado"
      />
      <Kpi label="Partidos simulados" value={`${tables.simulatedCount} de ${total}`} detail="Con marcador completo y válido" />
      <Kpi
        label="Partidos pendientes"
        value={String(tables.pendingCount)}
        detail={tables.ignoredCount > 0 ? `${tables.ignoredCount} con marcador incompleto o inválido (no cuentan)` : 'Sin marcadores a medias'}
      />
    </section>
  )
}
