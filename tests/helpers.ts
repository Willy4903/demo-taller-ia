import { DATASET } from '../src/data'
import type { Dataset, ScoreInputs } from '../src/domain/types'
import { OUTCOME_SCORES, type Outcome } from '../src/engine/scores'

export const ds: Dataset = DATASET

export function inputsFor(entries: Record<string, Outcome | [string, string]>): ScoreInputs {
  const out: ScoreInputs = {}
  for (const [id, v] of Object.entries(entries)) {
    out[id] = Array.isArray(v) ? { home: v[0], away: v[1] } : { ...OUTCOME_SCORES[v] }
  }
  return out
}

export function fixtureOf(home: string, away: string) {
  const fx = ds.fixtures.find((f) => f.homeId === home && f.awayId === away)
  if (!fx) throw new Error(`No existe ${home} vs ${away}`)
  return fx
}

export function univFixtures() {
  return ds.fixtures.filter((f) => f.homeId === 'universitario' || f.awayId === 'universitario')
}
