import type { Fixture, Score, ScoreInput, ScoreInputs } from '../domain/types'

export const MAX_GOALS = 20

export type FieldParse =
  | { kind: 'empty' }
  | { kind: 'valid'; value: number }
  | { kind: 'invalid'; error: string }

export function parseGoals(raw: string | undefined): FieldParse {
  const text = (raw ?? '').trim()
  if (text === '') return { kind: 'empty' }
  if (!/^\d+$/.test(text)) return { kind: 'invalid', error: 'Ingresa un número entero de 0 en adelante.' }
  const value = Number(text)
  if (value > MAX_GOALS) return { kind: 'invalid', error: `El máximo permitido es ${MAX_GOALS} goles.` }
  return { kind: 'valid', value }
}

export type InputStatus = 'empty' | 'partial' | 'invalid' | 'complete'

export interface InputEvaluation {
  status: InputStatus
  score: Score | null
  homeError: string | null
  awayError: string | null
}

export function evaluateInput(input: ScoreInput | undefined): InputEvaluation {
  const home = parseGoals(input?.home)
  const away = parseGoals(input?.away)
  const homeError = home.kind === 'invalid' ? home.error : null
  const awayError = away.kind === 'invalid' ? away.error : null
  if (home.kind === 'valid' && away.kind === 'valid') {
    return { status: 'complete', score: { homeGoals: home.value, awayGoals: away.value }, homeError, awayError }
  }
  if (homeError || awayError) return { status: 'invalid', score: null, homeError, awayError }
  if (home.kind === 'empty' && away.kind === 'empty') {
    return { status: 'empty', score: null, homeError, awayError }
  }
  return { status: 'partial', score: null, homeError, awayError }
}

/** Solo los partidos pendientes del fixture con marcador completo y válido cuentan. */
export function completedScores(fixtures: Fixture[], inputs: ScoreInputs): Map<string, Score> {
  const out = new Map<string, Score>()
  for (const fx of fixtures) {
    const ev = evaluateInput(inputs[fx.id])
    if (ev.score) out.set(fx.id, ev.score)
  }
  return out
}

export type Outcome = 'home' | 'draw' | 'away'

/** Marcadores que usan los accesos rápidos de resultado. */
export const OUTCOME_SCORES: Record<Outcome, ScoreInput> = {
  home: { home: '1', away: '0' },
  draw: { home: '0', away: '0' },
  away: { home: '0', away: '1' },
}

export function outcomeOf(input: ScoreInput | undefined): Outcome | null {
  const { score } = evaluateInput(input)
  if (!score) return null
  if (score.homeGoals > score.awayGoals) return 'home'
  if (score.homeGoals < score.awayGoals) return 'away'
  return 'draw'
}
