export type TeamId = string

export interface Team {
  id: TeamId
  name: string
  short: string
}

export interface SourceRef {
  id: string
  label: string
  url: string
  /** Fecha en que se consultó la fuente (ISO). */
  accessed: string
  /** 'directa': página leída; 'resumen': dato obtenido de un resumen de búsqueda web, sin leer la página. */
  access: 'directa' | 'resumen'
  note?: string
}

/** Fila de la tabla del Clausura al corte, tal como se publica. */
export interface ClausuraBaseRow {
  teamId: TeamId
  pj: number
  pg: number
  pe: number
  pp: number
  gf: number
  gc: number
  /** Puntos descontados por sanciones, ya incorporados en `publishedPts`. */
  deduction: number
  /** Puntos publicados por la fuente; se usan solo para verificar la aritmética. */
  publishedPts: number
}

/** Tabla final del Apertura (17 fechas). */
export interface AperturaFinalRow {
  teamId: TeamId
  pj: number
  pts: number
  gf: number
  gc: number
}

/** Ajuste de la tabla acumulada que no aparece en las tablas de cada torneo. */
export interface AcumuladoAdjustment {
  teamId: TeamId
  points: number
  /** Valor publicado por la fuente del acumulado (Libero) para contrastar. */
  publishedAcumPts: number
}

export interface Fixture {
  id: string
  fecha: number
  homeId: TeamId
  awayId: TeamId
  /** ISO yyyy-mm-dd solo cuando una fuente lo publica. */
  date: string | null
}

export interface PlayedMatch {
  fecha: number
  date: string
  homeId: TeamId
  awayId: TeamId
  homeGoals: number
  awayGoals: number
  sourceIds: string[]
  note?: string
}

export interface DeductionRecord {
  teamId: TeamId
  points: number
  scope: 'clausura' | 'acumulado'
  /** 'itemizada': la fuente indica motivo y cuantía; 'derivada': se infiere por diferencia entre tablas. */
  status: 'itemizada' | 'derivada'
  description: string
  sourceIds: string[]
}

export interface Discrepancy {
  id: string
  subject: string
  detail: string
  resolution: string
  sourceIds: string[]
}

export interface HeadToHeadMatch {
  homeId: TeamId
  awayId: TeamId
  homeGoals: number
  awayGoals: number
}

export interface FechaWindow {
  fecha: number
  window: string
  note?: string
}

export interface Dataset {
  season: number
  cutoff: string
  updatedAt: string
  /** Cambia cuando cambian los datos base; invalida simulaciones guardadas. */
  version: string
  teams: Team[]
  aperturaChampionId: TeamId
  apertura: AperturaFinalRow[]
  clausuraBase: ClausuraBaseRow[]
  acumuladoAdjustments: AcumuladoAdjustment[]
  fixtures: Fixture[]
  played: PlayedMatch[]
  deductions: DeductionRecord[]
  discrepancies: Discrepancy[]
  fechaWindows: FechaWindow[]
  sources: SourceRef[]
  /** Resultados entre equipos durante la temporada; vacío si no se cargaron. */
  headToHead: HeadToHeadMatch[]
  /** Puntos de Fair Play por equipo (menos es mejor); vacío si no se cargaron. */
  fairPlay: Record<TeamId, number>
}

export interface Score {
  homeGoals: number
  awayGoals: number
}

/** Entrada cruda de la interfaz para un partido; se valida en el motor. */
export interface ScoreInput {
  home: string
  away: string
}

export type ScoreInputs = Record<string, ScoreInput>

export type TableKind = 'clausura' | 'acumulado'

export type ZoneId = 'campeon' | 'alta' | 'sudamericana' | 'media' | 'descenso'

export interface StandingRow {
  teamId: TeamId
  position: number
  basePosition: number
  pj: number
  /** Solo disponible en el Clausura; el acumulado no desglosa el Apertura. */
  pg: number | null
  pe: number | null
  pp: number | null
  gf: number
  gc: number
  gd: number
  pts: number
  basePts: number
  zone: ZoneId
  /** true si el orden de este equipo depende de un desempate sin datos. */
  provisional: boolean
}

export interface TieGroup {
  teamIds: TeamId[]
  positions: [number, number]
  /** El empate cruza un límite de zona o la primera posición. */
  critical: boolean
}

export interface StandingsResult {
  kind: TableKind
  rows: StandingRow[]
  ties: TieGroup[]
}

export interface Tables {
  clausura: StandingsResult
  acumulado: StandingsResult
  simulatedCount: number
  pendingCount: number
  /** Partidos con algún campo escrito que aún no cuentan (incompletos o inválidos). */
  ignoredCount: number
}
