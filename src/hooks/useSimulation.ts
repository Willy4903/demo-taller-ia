import { useCallback, useEffect, useMemo, useState } from 'react'
import { DATASET } from '../data'
import { UNIVERSITARIO_ID } from '../data/teams'
import type { ScoreInput, ScoreInputs } from '../domain/types'
import { allDraw, clearMatch, resetAll, setOutcome, teamWinsAll } from '../engine/scenarios'
import type { Outcome } from '../engine/scores'
import { baseTables, computeTables } from '../engine/standings'
import { loadInputs, saveInputs } from '../engine/storage'
import { projectTitle } from '../engine/title'

export function useSimulation() {
  const [inputs, setInputs] = useState<ScoreInputs>(() => loadInputs(DATASET))

  useEffect(() => {
    saveInputs(DATASET, inputs)
  }, [inputs])

  const base = useMemo(() => baseTables(DATASET), [])
  const tables = useMemo(() => computeTables(DATASET, inputs), [inputs])
  const title = useMemo(() => projectTitle(DATASET, tables), [tables])

  const setScore = useCallback((matchId: string, side: keyof ScoreInput, value: string) => {
    setInputs((prev) => ({
      ...prev,
      [matchId]: { home: prev[matchId]?.home ?? '', away: prev[matchId]?.away ?? '', [side]: value },
    }))
  }, [])

  const pick = useCallback((matchId: string, outcome: Outcome) => setInputs((p) => setOutcome(p, matchId, outcome)), [])
  const clear = useCallback((matchId: string) => setInputs((p) => clearMatch(p, matchId)), [])
  const universitarioWinsAll = useCallback(() => setInputs((p) => teamWinsAll(DATASET, p, UNIVERSITARIO_ID)), [])
  const everyoneDraws = useCallback(() => setInputs(allDraw(DATASET)), [])
  const reset = useCallback(() => setInputs(resetAll()), [])
  const setAll = useCallback((next: ScoreInputs) => setInputs(next), [])

  return { inputs, base, tables, title, setScore, pick, clear, universitarioWinsAll, everyoneDraws, reset, setAll }
}
