import { describe, expect, it } from 'vitest'
import { resultsCsv, standingsCsv, toCsv } from '../src/engine/csv'
import { allDraw, teamWinsAll } from '../src/engine/scenarios'
import { evaluateInput, outcomeOf, parseGoals } from '../src/engine/scores'
import { baseTables, computeTables } from '../src/engine/standings'
import { loadInputs, saveInputs } from '../src/engine/storage'
import { projectTitle } from '../src/engine/title'
import { ds, fixtureOf } from './helpers'

describe('validación de marcadores', () => {
  it('acepta enteros de 0 a 20 y rechaza el resto', () => {
    expect(parseGoals('0')).toEqual({ kind: 'valid', value: 0 })
    expect(parseGoals(' 3 ')).toEqual({ kind: 'valid', value: 3 })
    expect(parseGoals('20')).toEqual({ kind: 'valid', value: 20 })
    expect(parseGoals('')).toEqual({ kind: 'empty' })
    for (const bad of ['-1', '1.5', '1,5', 'a', '21', '1e1', '+2']) {
      expect(parseGoals(bad).kind, bad).toBe('invalid')
    }
  })

  it('evalúa estados de entrada y resultado', () => {
    expect(evaluateInput(undefined).status).toBe('empty')
    expect(evaluateInput({ home: '1', away: '' }).status).toBe('partial')
    expect(evaluateInput({ home: 'x', away: '' }).status).toBe('invalid')
    expect(evaluateInput({ home: '2', away: '1' })).toMatchObject({ status: 'complete', score: { homeGoals: 2, awayGoals: 1 } })
    expect(outcomeOf({ home: '2', away: '1' })).toBe('home')
    expect(outcomeOf({ home: '1', away: '1' })).toBe('draw')
    expect(outcomeOf({ home: '0', away: '4' })).toBe('away')
    expect(outcomeOf({ home: '0', away: '' })).toBeNull()
  })
})

describe('exportación CSV', () => {
  it('escapa comas, comillas y saltos de línea', () => {
    expect(toCsv([['a,b', 'c"d', 'e\nf', null, 3]])).toBe('"a,b","c""d","e\nf",,3\r\n')
  })

  it('exporta la tabla del Clausura con 18 filas y encabezado', () => {
    const t = computeTables(ds, teamWinsAll(ds, {}, 'universitario'))
    const lines = standingsCsv(ds, t.clausura).trim().split('\r\n')
    expect(lines).toHaveLength(19)
    expect(lines[0]).toBe('posicion,equipo,pj,pg,pe,pp,gf,gc,dg,puntos,puntos_al_corte,posicion_al_corte,zona,provisional')
    expect(lines[1]).toContain('1,Universitario,17,12,3,2')
    expect(lines[1]).toContain(',39,27,2,campeon,no')
  })

  it('exporta el acumulado sin columnas de PG/PE/PP', () => {
    const lines = standingsCsv(ds, baseTables(ds).acumulado).trim().split('\r\n')
    expect(lines[0]).toBe('posicion,equipo,pj,gf,gc,dg,puntos,puntos_al_corte,posicion_al_corte,zona,provisional')
    expect(lines[1]).toContain('1,Alianza Lima,30')
    expect(lines[18]).toContain('UTC')
  })

  it('exporta los 31 partidos pendientes con su estado', () => {
    const fx = fixtureOf('universitario', 'sport-boys')
    const csv = resultsCsv(ds, { [fx.id]: { home: '2', away: '1' }, [fixtureOf('melgar', 'comerciantes-unidos').id]: { home: '1', away: '' } })
    const lines = csv.trim().split('\r\n')
    expect(lines).toHaveLength(32)
    expect(lines.find((l) => l.includes('Universitario,Sport Boys'))).toBe('14,2026-11-04,Universitario,Sport Boys,2,1,simulado')
    expect(lines.find((l) => l.includes('FBC Melgar,Comerciantes Unidos'))).toBe('14,2026-10-29,FBC Melgar,Comerciantes Unidos,,,incompleto')
    expect(lines.filter((l) => l.endsWith(',pendiente'))).toHaveLength(29)
  })
})

describe('persistencia local', () => {
  const memory = () => {
    const data = new Map<string, string>()
    return {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    }
  }

  it('guarda y recupera las simulaciones', () => {
    const store = memory()
    const inputs = allDraw(ds)
    saveInputs(ds, inputs, store)
    expect(loadInputs(ds, store)).toEqual(inputs)
  })

  it('descarta simulaciones de otra versión de datos', () => {
    const store = memory()
    saveInputs({ ...ds, version: 'vieja' }, allDraw(ds), store)
    expect(loadInputs(ds, store)).toEqual({})
  })

  it('ignora datos corruptos y partidos inexistentes', () => {
    const store = memory()
    store.setItem('liga1-2026-simulador', '{no es json')
    expect(loadInputs(ds, store)).toEqual({})
    store.setItem('liga1-2026-simulador', JSON.stringify({ datasetVersion: ds.version, inputs: { x: { home: 1 } } }))
    expect(loadInputs(ds, store)).toEqual({})
    store.setItem(
      'liga1-2026-simulador',
      JSON.stringify({ datasetVersion: ds.version, inputs: { 'c14-99': { home: '1', away: '0' }, 'c15-01': { home: '2', away: '2' } } }),
    )
    expect(loadInputs(ds, store)).toEqual({ 'c15-01': { home: '2', away: '2' } })
  })

  it('vaciar las simulaciones borra el registro y tolera un almacenamiento ausente', () => {
    const store = memory()
    saveInputs(ds, allDraw(ds), store)
    saveInputs(ds, {}, store)
    expect(store.getItem('liga1-2026-simulador')).toBeNull()
    expect(() => saveInputs(ds, allDraw(ds), null)).not.toThrow()
    expect(loadInputs(ds, null)).toEqual({})
  })
})

describe('proyección del título', () => {
  it('al corte el líder del Clausura es Sport Huancayo y no hay campeón directo', () => {
    const p = projectTitle(ds, baseTables(ds))
    expect(p.clausuraLeaderId).toBe('sport-huancayo')
    expect(p.directChampion).toBe(false)
    expect(p.clausuraChampionAcumPosition).toBe(10)
    expect(p.clausuraChampionEligibility).toBe('no')
    expect(p.contenders.map((c) => c.teamId)).toEqual(['alianza-lima', 'universitario'])
  })

  it('si Alianza Lima lidera el Clausura es campeón nacional directo', () => {
    const inputs = { ...teamWinsAll(ds, {}, 'sport-huancayo') }
    for (const fx of ds.fixtures) {
      if (fx.homeId === 'alianza-lima') inputs[fx.id] = { home: '5', away: '0' }
      else if (fx.awayId === 'alianza-lima') inputs[fx.id] = { home: '0', away: '5' }
    }
    for (const fx of ds.fixtures) {
      if (fx.homeId === 'sport-huancayo') inputs[fx.id] = { home: '0', away: '1' }
      else if (fx.awayId === 'sport-huancayo') inputs[fx.id] = { home: '1', away: '0' }
    }
    const t = computeTables(ds, inputs)
    const p = projectTitle(ds, t)
    expect(p.clausuraLeaderId).toBe('alianza-lima')
    expect(p.directChampion).toBe(true)
  })

  it('Universitario campeón del Clausura entra a la definición con Alianza Lima', () => {
    const t = computeTables(ds, teamWinsAll(ds, {}, 'universitario'))
    const p = projectTitle(ds, t)
    expect(p.clausuraLeaderId).toBe('universitario')
    expect(p.clausuraChampionEligibility).toBe('si')
    expect(p.contenders.map((c) => c.teamId)).toEqual(['alianza-lima', 'universitario'])
    expect(p.contenders[1]?.reason).toContain('campeón proyectado del Clausura')
  })
})
