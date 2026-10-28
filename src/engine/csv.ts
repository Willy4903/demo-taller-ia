import type { Dataset, ScoreInputs, StandingsResult } from '../domain/types'
import { evaluateInput } from './scores'

type Cell = string | number | null

function escape(cell: Cell): string {
  if (cell === null) return ''
  const text = String(cell)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(rows: Cell[][]): string {
  return rows.map((r) => r.map(escape).join(',')).join('\r\n') + '\r\n'
}

export function standingsCsv(dataset: Dataset, result: StandingsResult): string {
  const names = new Map(dataset.teams.map((t) => [t.id, t.name]))
  const withRecord = result.kind === 'clausura'
  const header: Cell[] = [
    'posicion',
    'equipo',
    'pj',
    ...(withRecord ? ['pg', 'pe', 'pp'] : []),
    'gf',
    'gc',
    'dg',
    'puntos',
    'puntos_al_corte',
    'posicion_al_corte',
    'zona',
    'provisional',
  ]
  const body = result.rows.map((r): Cell[] => [
    r.position,
    names.get(r.teamId) ?? r.teamId,
    r.pj,
    ...(withRecord ? [r.pg, r.pe, r.pp] : []),
    r.gf,
    r.gc,
    r.gd,
    r.pts,
    r.basePts,
    r.basePosition,
    r.zone,
    r.provisional ? 'si' : 'no',
  ])
  return toCsv([header, ...body])
}

export function resultsCsv(dataset: Dataset, inputs: ScoreInputs): string {
  const names = new Map(dataset.teams.map((t) => [t.id, t.name]))
  const header: Cell[] = [
    'fecha',
    'fecha_partido',
    'local',
    'visitante',
    'goles_local',
    'goles_visitante',
    'estado',
  ]
  const body = dataset.fixtures.map((fx): Cell[] => {
    const ev = evaluateInput(inputs[fx.id])
    const estado =
      ev.status === 'complete' ? 'simulado' : ev.status === 'empty' ? 'pendiente' : ev.status === 'partial' ? 'incompleto' : 'invalido'
    return [
      fx.fecha,
      fx.date,
      names.get(fx.homeId) ?? fx.homeId,
      names.get(fx.awayId) ?? fx.awayId,
      ev.score ? ev.score.homeGoals : null,
      ev.score ? ev.score.awayGoals : null,
      estado,
    ]
  })
  return toCsv([header, ...body])
}
