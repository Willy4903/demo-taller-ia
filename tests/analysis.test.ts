import { describe, expect, it } from 'vitest'
import { ceilings } from '../src/engine/maths'
import { mulberry32, poisson, runMonteCarlo } from '../src/engine/montecarlo'
import { allDraw, teamRecordScenario, teamWinsAll } from '../src/engine/scenarios'
import { baseTables, computeTables, rowOf } from '../src/engine/standings'
import { ds, fixtureOf } from './helpers'

describe('techos de puntos y situación matemática', () => {
  const at = (inputs = {}) => {
    const t = computeTables(ds, inputs)
    return { t, clausura: ceilings(ds, t.clausura, inputs), acumulado: ceilings(ds, t.acumulado, inputs) }
  }
  const find = (list: ReturnType<typeof ceilings>, id: string) => list.find((c) => c.teamId === id)!

  it('el techo es los puntos actuales más tres por cada partido que falta', () => {
    const { clausura } = at()
    expect(find(clausura, 'universitario')).toMatchObject({ pts: 27, pending: 4, max: 39 })
    expect(find(clausura, 'sport-huancayo')).toMatchObject({ pts: 28, pending: 3, max: 37 })
    expect(find(clausura, 'utc')).toMatchObject({ pts: -3, pending: 4, max: 9 })
  })

  it('al corte nadie es campeón del Clausura y quienes no alcanzan al líder están eliminados', () => {
    const { clausura } = at()
    expect(clausura.some((c) => c.title === 'campeon')).toBe(false)
    expect(find(clausura, 'universitario').title).toBe('en-carrera')
    // Moquegua: 10 + 12 = 22 < 28 del líder; ADT: 7 + 12 = 19.
    expect(find(clausura, 'cd-moquegua').title).toBe('eliminado')
    expect(find(clausura, 'adt').title).toBe('eliminado')
    // Cienciano: 14 + 12 = 26 < 28.
    expect(find(clausura, 'cienciano').title).toBe('eliminado')
    // Alianza Atlético: 22 + 12 = 34 puede alcanzar al líder.
    expect(find(clausura, 'alianza-atletico').title).toBe('en-carrera')
  })

  it('UTC está descendido matemáticamente al corte y Alianza Lima está a salvo', () => {
    const { acumulado } = at()
    expect(find(acumulado, 'utc').relegation).toBe('descendido')
    expect(find(acumulado, 'alianza-lima').relegation).toBe('salvado')
    expect(find(acumulado, 'adt').relegation).toBe('en-juego')
    expect(find(acumulado, 'cd-moquegua').relegation).toBe('en-juego')
  })

  it('un campeón matemático aparece cuando nadie más puede alcanzarlo', () => {
    // Universitario gana todo y los demás pierden todos sus partidos restantes.
    const inputs = teamWinsAll(ds, {}, 'universitario')
    for (const fx of ds.fixtures) {
      if (inputs[fx.id]) continue
      inputs[fx.id] = { home: '0', away: '0' }
    }
    const { clausura } = at(inputs)
    expect(find(clausura, 'universitario').title).toBe('campeon')
    expect(find(clausura, 'sport-huancayo').title).toBe('eliminado')
  })

  it('el estado salvado exige al menos dos equipos que ya no pueden alcanzarlo', () => {
    const inputs = allDraw(ds)
    const { acumulado } = at(inputs)
    expect(acumulado.every((c) => c.pending === 0)).toBe(true)
    expect(acumulado.filter((c) => c.relegation === 'descendido').map((c) => c.teamId)).toEqual(expect.arrayContaining(['utc']))
  })
})

describe('matriz de resultados de Universitario', () => {
  it('cada combinación de victorias y empates da los puntos esperados', () => {
    for (let w = 0; w <= 4; w++) {
      for (let d = 0; d <= 4 - w; d++) {
        const inputs = teamRecordScenario(ds, {}, 'universitario', w, d)
        const t = computeTables(ds, inputs)
        expect(rowOf(t.clausura, 'universitario').pts).toBe(27 + 3 * w + d)
        expect(rowOf(t.acumulado, 'universitario').pts).toBe(56 + 3 * w + d)
        expect(t.simulatedCount).toBe(4)
      }
    }
  })

  it('respeta la localía al asignar victorias y derrotas', () => {
    const inputs = teamRecordScenario(ds, {}, 'universitario', 1, 0)
    expect(inputs[fixtureOf('universitario', 'sport-boys').id]).toEqual({ home: '1', away: '0' })
    expect(inputs[fixtureOf('atletico-grau', 'universitario').id]).toEqual({ home: '1', away: '0' })
  })

  it('cuatro victorias equivale al escenario de ganar todo', () => {
    expect(teamRecordScenario(ds, {}, 'universitario', 4, 0)).toEqual(teamWinsAll(ds, {}, 'universitario'))
  })
})

describe('simulación de Monte Carlo', () => {
  it('es reproducible con la misma semilla y cambia con otra', () => {
    const a = runMonteCarlo(ds, {}, { iterations: 2000, seed: 7 })
    const b = runMonteCarlo(ds, {}, { iterations: 2000, seed: 7 })
    const c = runMonteCarlo(ds, {}, { iterations: 2000, seed: 8 })
    expect(a).toEqual(b)
    expect(a.teams[1]?.clausuraChampion).not.toBe(c.teams[1]?.clausuraChampion)
  })

  it('las probabilidades de campeón y de cada posición suman 1', () => {
    const r = runMonteCarlo(ds, {}, { iterations: 3000, seed: 1 })
    expect(r.teams.reduce((s, t) => s + t.clausuraChampion, 0)).toBeCloseTo(1, 10)
    for (const t of r.teams) {
      expect(t.clausuraPosition.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 10)
      expect(t.acumuladoPosition.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 10)
    }
    for (let pos = 0; pos < 18; pos++) {
      expect(r.teams.reduce((s, t) => s + (t.acumuladoPosition[pos] ?? 0), 0)).toBeCloseTo(1, 10)
    }
    expect(r.teams.reduce((s, t) => s + t.acumuladoRelegation, 0)).toBeCloseTo(2, 10)
  })

  it('con todos los partidos fijados devuelve exactamente las tablas calculadas', () => {
    const inputs = teamWinsAll(ds, allDraw(ds), 'universitario')
    const t = computeTables(ds, inputs)
    const r = runMonteCarlo(ds, inputs, { iterations: 50, seed: 3 })
    expect(r.simulatedMatches).toBe(0)
    expect(r.fixedMatches).toBe(35)
    for (const row of t.clausura.rows) {
      const est = r.teams.find((x) => x.teamId === row.teamId)!
      expect(est.clausuraPosition[row.position - 1]).toBe(1)
      expect(est.meanClausuraPts).toBe(row.pts)
    }
    for (const row of t.acumulado.rows) {
      const est = r.teams.find((x) => x.teamId === row.teamId)!
      expect(est.acumuladoPosition[row.position - 1]).toBe(1)
    }
  })

  it('el equipo ya descendido matemáticamente tiene casi 100 % de riesgo y Alianza Lima casi 0 %', () => {
    const r = runMonteCarlo(ds, {}, { iterations: 4000, seed: 11 })
    const get = (id: string) => r.teams.find((t) => t.teamId === id)!
    expect(get('utc').acumuladoRelegation).toBe(1)
    expect(get('alianza-lima').acumuladoRelegation).toBe(0)
    expect(get('alianza-lima').acumuladoTop4).toBeGreaterThan(0.99)
  })

  it('Universitario nunca baja de los puntos al corte y los puntos medios son coherentes', () => {
    const r = runMonteCarlo(ds, {}, { iterations: 3000, seed: 5 })
    const u = r.teams.find((t) => t.teamId === 'universitario')!
    const base = baseTables(ds)
    expect(u.meanClausuraPts).toBeGreaterThan(rowOf(base.clausura, 'universitario').pts)
    expect(u.meanClausuraPts).toBeLessThanOrEqual(39)
    expect(u.clausuraPosition.slice(0, 2).reduce((s, v) => s + v, 0)).toBeGreaterThan(0.2)
  })

  it('el campeón del Clausura no puede ser un equipo eliminado matemáticamente', () => {
    const r = runMonteCarlo(ds, {}, { iterations: 4000, seed: 2 })
    for (const id of ['adt', 'cd-moquegua', 'utc', 'cienciano']) {
      expect(r.teams.find((t) => t.teamId === id)?.clausuraChampion).toBe(0)
    }
  })

  it('el generador Poisson reproduce la media y no produce negativos', () => {
    const rng = mulberry32(42)
    let sum = 0
    const n = 20000
    for (let i = 0; i < n; i++) {
      const v = poisson(1.4, rng)
      expect(v).toBeGreaterThanOrEqual(0)
      sum += v
    }
    expect(sum / n).toBeGreaterThan(1.35)
    expect(sum / n).toBeLessThan(1.45)
  })

  it('no modifica los datos ni las entradas', () => {
    const snapshot = JSON.stringify(ds)
    const inputs = { 'c14-08': { home: '1', away: '0' } }
    runMonteCarlo(ds, inputs, { iterations: 200, seed: 9 })
    expect(JSON.stringify(ds)).toBe(snapshot)
    expect(inputs).toEqual({ 'c14-08': { home: '1', away: '0' } })
  })
})
