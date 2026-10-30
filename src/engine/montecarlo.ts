import type { Dataset, ScoreInputs, TeamId } from '../domain/types'
import { applyResults, baseRows } from './standings'
import { completedScores } from './scores'

/**
 * Estimación por simulación de Monte Carlo de los partidos que quedan.
 *
 * Modelo (supuestos, no datos): los goles de cada equipo siguen una distribución de Poisson
 * con media = promedio de goles por equipo y partido de la liga, multiplicado por el ataque del
 * equipo y la defensa del rival. Ataque y defensa salen de los goles a favor y en contra del
 * acumulado de la temporada, suavizados hacia 1 con el equivalente a `shrink` partidos. No hay
 * ventaja de local, bajas, forma reciente ni motivación. Los marcadores ya cargados en la
 * simulación se respetan; los empates sin criterio de desempate se resuelven al azar (sorteo).
 */

export interface MonteCarloOptions {
  iterations: number
  seed: number
  shrink?: number
}

export interface TeamEstimate {
  teamId: TeamId
  clausuraChampion: number
  /** Probabilidad de terminar en cada posición del Clausura (índice 0 = 1.º). */
  clausuraPosition: number[]
  acumuladoPosition: number[]
  acumuladoTop4: number
  acumuladoTop8: number
  acumuladoRelegation: number
  meanClausuraPts: number
  meanAcumuladoPts: number
}

export interface MonteCarloResult {
  iterations: number
  seed: number
  simulatedMatches: number
  fixedMatches: number
  leagueGoalsPerTeamMatch: number
  teams: TeamEstimate[]
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function poisson(lambda: number, rng: () => number): number {
  const limit = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k += 1
    p *= rng()
  } while (p > limit)
  return k - 1
}

export function runMonteCarlo(dataset: Dataset, inputs: ScoreInputs, options: MonteCarloOptions): MonteCarloResult {
  const { iterations, seed } = options
  const shrink = options.shrink ?? 10
  const rng = mulberry32(seed)
  const n = dataset.teams.length
  const index = new Map(dataset.teams.map((t, i) => [t.id, i]))
  const idx = (id: TeamId): number => {
    const i = index.get(id)
    if (i === undefined) throw new Error(`Equipo desconocido: ${id}`)
    return i
  }

  const base = baseRows(dataset)
  const fixed = completedScores(dataset.fixtures, inputs)
  const start = applyResults(base, dataset, fixed)

  // Fuerzas de ataque y defensa a partir del acumulado real al corte.
  const season = base.acumulado
  const totalGf = season.reduce((a, r) => a + r.gf, 0)
  const totalPj = season.reduce((a, r) => a + r.pj, 0)
  const league = totalGf / totalPj
  const attack = new Float64Array(n)
  const defense = new Float64Array(n)
  for (const r of season) {
    const i = idx(r.teamId)
    attack[i] = (r.pj * (r.gf / r.pj / league) + shrink) / (r.pj + shrink)
    defense[i] = (r.pj * (r.gc / r.pj / league) + shrink) / (r.pj + shrink)
  }

  const open = dataset.fixtures.filter((f) => !fixed.has(f.id))
  const openHome = open.map((f) => idx(f.homeId))
  const openAway = open.map((f) => idx(f.awayId))
  const lambdaHome = openHome.map((h, k) => league * attack[h]! * defense[openAway[k]!]!)
  const lambdaAway = openAway.map((a, k) => league * attack[a]! * defense[openHome[k]!]!)

  const c0 = { pts: new Int32Array(n), gf: new Int32Array(n), gc: new Int32Array(n) }
  const a0 = { pts: new Int32Array(n), gf: new Int32Array(n), gc: new Int32Array(n) }
  for (const r of start.clausura) {
    const i = idx(r.teamId)
    c0.pts[i] = r.pts
    c0.gf[i] = r.gf
    c0.gc[i] = r.gc
  }
  for (const r of start.acumulado) {
    const i = idx(r.teamId)
    a0.pts[i] = r.pts
    a0.gf[i] = r.gf
    a0.gc[i] = r.gc
  }

  const cPos = Array.from({ length: n }, () => new Float64Array(n))
  const aPos = Array.from({ length: n }, () => new Float64Array(n))
  const sumC = new Float64Array(n)
  const sumA = new Float64Array(n)

  const cp = new Int32Array(n)
  const cf = new Int32Array(n)
  const cc = new Int32Array(n)
  const ap = new Int32Array(n)
  const af = new Int32Array(n)
  const ac = new Int32Array(n)
  const tie = new Float64Array(n)
  const order = Array.from({ length: n }, (_, i) => i)

  const rank = (pts: Int32Array, gf: Int32Array, gc: Int32Array, hist: Float64Array[]): void => {
    order.sort((x, y) => pts[y]! - pts[x]! || gf[y]! - gc[y]! - (gf[x]! - gc[x]!) || gf[y]! - gf[x]! || tie[x]! - tie[y]!)
    for (let pos = 0; pos < n; pos++) hist[order[pos]!]![pos]! += 1
  }

  for (let it = 0; it < iterations; it++) {
    cp.set(c0.pts)
    cf.set(c0.gf)
    cc.set(c0.gc)
    ap.set(a0.pts)
    af.set(a0.gf)
    ac.set(a0.gc)
    for (let k = 0; k < open.length; k++) {
      const h = openHome[k]!
      const a = openAway[k]!
      const gh = poisson(lambdaHome[k]!, rng)
      const ga = poisson(lambdaAway[k]!, rng)
      cf[h]! += gh
      cc[h]! += ga
      cf[a]! += ga
      cc[a]! += gh
      af[h]! += gh
      ac[h]! += ga
      af[a]! += ga
      ac[a]! += gh
      const ph = gh > ga ? 3 : gh === ga ? 1 : 0
      const pa = ga > gh ? 3 : gh === ga ? 1 : 0
      cp[h]! += ph
      ap[h]! += ph
      cp[a]! += pa
      ap[a]! += pa
    }
    for (let i = 0; i < n; i++) {
      tie[i] = rng()
      sumC[i]! += cp[i]!
      sumA[i]! += ap[i]!
    }
    rank(cp, cf, cc, cPos)
    rank(ap, af, ac, aPos)
  }

  const teams: TeamEstimate[] = dataset.teams.map((t, i) => {
    const c = Array.from(cPos[i]!, (v) => v / iterations)
    const a = Array.from(aPos[i]!, (v) => v / iterations)
    const sum = (arr: number[], from: number, to: number) => arr.slice(from, to).reduce((x, y) => x + y, 0)
    return {
      teamId: t.id,
      clausuraChampion: c[0] ?? 0,
      clausuraPosition: c,
      acumuladoPosition: a,
      acumuladoTop4: sum(a, 0, 4),
      acumuladoTop8: sum(a, 0, 8),
      acumuladoRelegation: sum(a, n - 2, n),
      meanClausuraPts: sumC[i]! / iterations,
      meanAcumuladoPts: sumA[i]! / iterations,
    }
  })

  return {
    iterations,
    seed,
    simulatedMatches: open.length,
    fixedMatches: fixed.size,
    leagueGoalsPerTeamMatch: league,
    teams,
  }
}
