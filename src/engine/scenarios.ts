import type { Dataset, ScoreInputs, TeamId } from '../domain/types'
import { OUTCOME_SCORES, type Outcome as ScoreOutcome } from './scores'

export function setOutcome(inputs: ScoreInputs, matchId: string, outcome: ScoreOutcome): ScoreInputs {
  return { ...inputs, [matchId]: { ...OUTCOME_SCORES[outcome] } }
}

export function clearMatch(inputs: ScoreInputs, matchId: string): ScoreInputs {
  const next = { ...inputs }
  delete next[matchId]
  return next
}

/** Universitario gana todos sus partidos pendientes (1-0) sin tocar los demás marcadores. */
export function teamWinsAll(dataset: Dataset, inputs: ScoreInputs, teamId: TeamId): ScoreInputs {
  const next = { ...inputs }
  for (const fx of dataset.fixtures) {
    if (fx.homeId === teamId) next[fx.id] = { ...OUTCOME_SCORES.home }
    else if (fx.awayId === teamId) next[fx.id] = { ...OUTCOME_SCORES.away }
  }
  return next
}

/** Todos los partidos pendientes terminan 0-0. */
export function allDraw(dataset: Dataset): ScoreInputs {
  const next: ScoreInputs = {}
  for (const fx of dataset.fixtures) next[fx.id] = { ...OUTCOME_SCORES.draw }
  return next
}

export function resetAll(): ScoreInputs {
  return {}
}

/** Fija las victorias y empates de un equipo en sus partidos pendientes; el resto son derrotas (0-1). */
export function teamRecordScenario(
  dataset: Dataset,
  inputs: ScoreInputs,
  teamId: TeamId,
  wins: number,
  draws: number,
): ScoreInputs {
  const next = { ...inputs }
  const own = dataset.fixtures.filter((f) => f.homeId === teamId || f.awayId === teamId)
  own.forEach((fx, i) => {
    const result = i < wins ? 'win' : i < wins + draws ? 'draw' : 'loss'
    const home = fx.homeId === teamId
    const outcome: ScoreOutcome = result === 'draw' ? 'draw' : (result === 'win') === home ? 'home' : 'away'
    next[fx.id] = { ...OUTCOME_SCORES[outcome] }
  })
  return next
}
