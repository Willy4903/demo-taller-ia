import type { Dataset, ScoreInputs, TeamId } from '../domain/types'
import { OUTCOME_SCORES, type Outcome } from './scores'

export function setOutcome(inputs: ScoreInputs, matchId: string, outcome: Outcome): ScoreInputs {
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
