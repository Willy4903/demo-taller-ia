import type {
  Dataset,
  Score,
  ScoreInputs,
  StandingRow,
  StandingsResult,
  Tables,
  TableKind,
  TeamId,
  TieGroup,
} from '../domain/types'
import { evaluateInput, completedScores } from './scores'
import { HEAD_TO_HEAD_MEETINGS_PER_PAIR, TIE_BOUNDARIES, zoneFor } from './rules'

interface RawRow {
  teamId: TeamId
  pj: number
  pg: number | null
  pe: number | null
  pp: number | null
  gf: number
  gc: number
  pts: number
}

const clone = (rows: RawRow[]): RawRow[] => rows.map((r) => ({ ...r }))

/** Tablas reales al corte, sin ninguna simulación. */
export function baseRows(dataset: Dataset): Record<TableKind, RawRow[]> {
  const clausura: RawRow[] = dataset.clausuraBase.map((r) => ({
    teamId: r.teamId,
    pj: r.pj,
    pg: r.pg,
    pe: r.pe,
    pp: r.pp,
    gf: r.gf,
    gc: r.gc,
    pts: 3 * r.pg + r.pe - r.deduction,
  }))
  const acumulado: RawRow[] = clausura.map((c) => {
    const ap = dataset.apertura.find((a) => a.teamId === c.teamId)
    if (!ap) throw new Error(`Falta el Apertura de ${c.teamId}`)
    const adj = dataset.acumuladoAdjustments.find((a) => a.teamId === c.teamId)?.points ?? 0
    return {
      teamId: c.teamId,
      pj: ap.pj + c.pj,
      pg: null,
      pe: null,
      pp: null,
      gf: ap.gf + c.gf,
      gc: ap.gc + c.gc,
      pts: ap.pts + c.pts + adj,
    }
  })
  return { clausura, acumulado }
}

function addResult(row: RawRow, scored: number, conceded: number, withRecord: boolean): void {
  row.pj += 1
  row.gf += scored
  row.gc += conceded
  if (scored > conceded) {
    row.pts += 3
    if (withRecord && row.pg !== null) row.pg += 1
  } else if (scored === conceded) {
    row.pts += 1
    if (withRecord && row.pe !== null) row.pe += 1
  } else if (withRecord && row.pp !== null) {
    row.pp += 1
  }
}

/** Suma al corte únicamente los partidos pendientes del fixture con marcador completo. */
export function applyResults(
  base: Record<TableKind, RawRow[]>,
  dataset: Dataset,
  scores: Map<string, Score>,
): Record<TableKind, RawRow[]> {
  const out = { clausura: clone(base.clausura), acumulado: clone(base.acumulado) }
  for (const fx of dataset.fixtures) {
    const score = scores.get(fx.id)
    if (!score) continue
    for (const kind of ['clausura', 'acumulado'] as const) {
      const home = out[kind].find((r) => r.teamId === fx.homeId)
      const away = out[kind].find((r) => r.teamId === fx.awayId)
      if (!home || !away) throw new Error(`Equipo desconocido en ${fx.id}`)
      addResult(home, score.homeGoals, score.awayGoals, kind === 'clausura')
      addResult(away, score.awayGoals, score.homeGoals, kind === 'clausura')
    }
  }
  return out
}

type Key = number[]

function compareKeys(a: Key, b: Key): number {
  for (let i = 0; i < a.length; i++) {
    const diff = (b[i] ?? 0) - (a[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

const keyOf = (r: RawRow): Key => [r.pts, r.gf - r.gc, r.gf]

/** Mini tabla entre los equipos empatados; null si faltan enfrentamientos. */
function headToHeadKeys(group: TeamId[], dataset: Dataset): Map<TeamId, Key> | null {
  const stats = new Map<TeamId, { pts: number; gf: number; gc: number }>()
  for (const id of group) stats.set(id, { pts: 0, gf: 0, gc: 0 })
  const meetings = new Map<string, number>()
  const pairKey = (a: TeamId, b: TeamId) => [a, b].sort().join('|')
  for (const m of dataset.headToHead) {
    const h = stats.get(m.homeId)
    const a = stats.get(m.awayId)
    if (!h || !a) continue
    h.gf += m.homeGoals
    h.gc += m.awayGoals
    a.gf += m.awayGoals
    a.gc += m.homeGoals
    if (m.homeGoals > m.awayGoals) h.pts += 3
    else if (m.homeGoals < m.awayGoals) a.pts += 3
    else {
      h.pts += 1
      a.pts += 1
    }
    meetings.set(pairKey(m.homeId, m.awayId), (meetings.get(pairKey(m.homeId, m.awayId)) ?? 0) + 1)
  }
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      const a = group[i]
      const b = group[j]
      if (a === undefined || b === undefined) continue
      if ((meetings.get(pairKey(a, b)) ?? 0) < HEAD_TO_HEAD_MEETINGS_PER_PAIR) return null
    }
  }
  const out = new Map<TeamId, Key>()
  for (const [id, s] of stats) out.set(id, [s.pts, s.gf - s.gc, s.gf])
  return out
}

function fairPlayKeys(group: TeamId[], dataset: Dataset): Map<TeamId, Key> | null {
  const out = new Map<TeamId, Key>()
  for (const id of group) {
    const value = dataset.fairPlay[id]
    if (value === undefined) return null
    out.set(id, [-value])
  }
  return out
}

type Criterion = (group: TeamId[]) => Map<TeamId, Key> | null

/** Divide el grupo según el criterio; si no hay datos completos, lo devuelve sin cambios. */
function refine(groups: TeamId[][], criterion: Criterion): TeamId[][] {
  const out: TeamId[][] = []
  for (const group of groups) {
    if (group.length < 2) {
      out.push(group)
      continue
    }
    const keys = criterion(group)
    if (!keys) {
      out.push(group)
      continue
    }
    const ordered = [...group].sort((a, b) => compareKeys(keys.get(a) ?? [], keys.get(b) ?? []))
    let current: TeamId[] = []
    for (const id of ordered) {
      const last = current[current.length - 1]
      if (last !== undefined && compareKeys(keys.get(last) ?? [], keys.get(id) ?? []) !== 0) {
        out.push(current)
        current = []
      }
      current.push(id)
    }
    if (current.length > 0) out.push(current)
  }
  return out
}

function criticalTie(kind: TableKind, first: number, last: number): boolean {
  return TIE_BOUNDARIES[kind].some((boundary) => first <= boundary && boundary < last)
}

export function rank(
  kind: TableKind,
  rows: RawRow[],
  baseRowsForKind: RawRow[],
  dataset: Dataset,
  names: Map<TeamId, string>,
): StandingsResult {
  const byId = new Map(rows.map((r) => [r.teamId, r]))
  const sorted = [...rows].sort((a, b) => compareKeys(keyOf(a), keyOf(b)))

  // Grupos con puntos, diferencia de goles y goles a favor idénticos.
  let groups: TeamId[][] = []
  for (const row of sorted) {
    const last = groups[groups.length - 1]
    const lastRow = last ? byId.get(last[0] as TeamId) : undefined
    if (last && lastRow && compareKeys(keyOf(lastRow), keyOf(row)) === 0) last.push(row.teamId)
    else groups.push([row.teamId])
  }
  if (kind === 'acumulado') groups = refine(groups, (g) => headToHeadKeys(g, dataset))
  groups = refine(groups, (g) => fairPlayKeys(g, dataset))

  const ordered: TeamId[] = []
  const unresolved = new Set<TeamId>()
  const ties: TieGroup[] = []
  for (const group of groups) {
    if (group.length > 1) {
      // Orden alfabético solo para mostrar; es provisional y se advierte en la interfaz.
      group.sort((a, b) => (names.get(a) ?? a).localeCompare(names.get(b) ?? b, 'es'))
      const first = ordered.length + 1
      const last = ordered.length + group.length
      ties.push({ teamIds: [...group], positions: [first, last], critical: criticalTie(kind, first, last) })
      for (const id of group) unresolved.add(id)
    }
    ordered.push(...group)
  }

  const basePosition = new Map<TeamId, number>(
    [...baseRowsForKind].sort((a, b) => compareKeys(keyOf(a), keyOf(b)) || (names.get(a.teamId) ?? '').localeCompare(names.get(b.teamId) ?? '', 'es')).map((r, i) => [r.teamId, i + 1]),
  )
  const basePts = new Map(baseRowsForKind.map((r) => [r.teamId, r.pts]))

  const result: StandingRow[] = ordered.map((id, i) => {
    const r = byId.get(id) as RawRow
    const position = i + 1
    return {
      teamId: id,
      position,
      basePosition: basePosition.get(id) ?? position,
      pj: r.pj,
      pg: r.pg,
      pe: r.pe,
      pp: r.pp,
      gf: r.gf,
      gc: r.gc,
      gd: r.gf - r.gc,
      pts: r.pts,
      basePts: basePts.get(id) ?? r.pts,
      zone: zoneFor(kind, position),
      provisional: unresolved.has(id),
    }
  })
  return { kind, rows: result, ties }
}

export function computeTables(dataset: Dataset, inputs: ScoreInputs = {}): Tables {
  const names = new Map(dataset.teams.map((t) => [t.id, t.name]))
  const base = baseRows(dataset)
  const scores = completedScores(dataset.fixtures, inputs)
  const next = applyResults(base, dataset, scores)
  let ignored = 0
  for (const fx of dataset.fixtures) {
    const ev = evaluateInput(inputs[fx.id])
    if (ev.status !== 'empty' && ev.status !== 'complete') ignored += 1
  }
  return {
    clausura: rank('clausura', next.clausura, base.clausura, dataset, names),
    acumulado: rank('acumulado', next.acumulado, base.acumulado, dataset, names),
    simulatedCount: scores.size,
    pendingCount: dataset.fixtures.length - scores.size,
    ignoredCount: ignored,
  }
}

export function baseTables(dataset: Dataset): Tables {
  return computeTables(dataset, {})
}

export function rowOf(result: StandingsResult, teamId: TeamId): StandingRow {
  const row = result.rows.find((r) => r.teamId === teamId)
  if (!row) throw new Error(`Equipo ${teamId} no está en la tabla`)
  return row
}
