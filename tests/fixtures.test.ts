import { describe, expect, it } from 'vitest'
import { baseRows } from '../src/engine/standings'
import { ds } from './helpers'

describe('los 35 partidos inicialmente pendientes', () => {
  it('hay 35 partidos: 8 de la fecha 14 y 9 de cada una de las fechas 15, 16 y 17', () => {
    expect(ds.fixtures).toHaveLength(35)
    const byFecha = (n: number) => ds.fixtures.filter((f) => f.fecha === n).length
    expect([byFecha(14), byFecha(15), byFecha(16), byFecha(17)]).toEqual([8, 9, 9, 9])
    expect(new Set(ds.fixtures.map((f) => f.id)).size).toBe(35)
  })

  it('el partido ya jugado de la fecha 14 no está en el fixture pendiente', () => {
    expect(ds.fixtures.some((f) => f.homeId === 'juan-pablo-ii' && f.awayId === 'sport-huancayo')).toBe(false)
    const played = ds.played.find((p) => p.homeId === 'juan-pablo-ii' && p.awayId === 'sport-huancayo')
    expect(played).toMatchObject({ fecha: 14, date: '2026-10-27', homeGoals: 2, awayGoals: 0 })
  })

  it('ningún partido jugado figura también como pendiente', () => {
    for (const p of ds.played) {
      if (p.fecha < 14) continue
      expect(ds.fixtures.some((f) => f.fecha === p.fecha && f.homeId === p.homeId && f.awayId === p.awayId)).toBe(false)
    }
  })

  it('cada equipo juega una vez por fecha y no se repiten cruces', () => {
    for (const fecha of [15, 16, 17]) {
      const ids = ds.fixtures.filter((f) => f.fecha === fecha).flatMap((f) => [f.homeId, f.awayId])
      expect(new Set(ids).size, `fecha ${fecha}`).toBe(18)
    }
    const f14 = ds.fixtures.filter((f) => f.fecha === 14).flatMap((f) => [f.homeId, f.awayId])
    expect(new Set(f14).size).toBe(16)
    const pairs = ds.fixtures.map((f) => [f.homeId, f.awayId].sort().join('|'))
    expect(new Set(pairs).size).toBe(35)
  })

  it('PJ al corte más partidos pendientes suman 17 para cada equipo', () => {
    const { clausura } = baseRows(ds)
    for (const row of clausura) {
      const pending = ds.fixtures.filter((f) => f.homeId === row.teamId || f.awayId === row.teamId).length
      expect(row.pj + pending, row.teamId).toBe(17)
    }
  })

  it('Universitario tiene cuatro partidos pendientes', () => {
    const own = ds.fixtures.filter((f) => f.homeId === 'universitario' || f.awayId === 'universitario')
    expect(own.map((f) => `${f.fecha}:${f.homeId}-${f.awayId}`)).toEqual([
      '14:universitario-sport-boys',
      '15:atletico-grau-universitario',
      '16:universitario-cd-moquegua',
      '17:sport-huancayo-universitario',
    ])
  })

  it('los equipos de cada partido existen', () => {
    const ids = new Set(ds.teams.map((t) => t.id))
    for (const f of ds.fixtures) {
      expect(ids.has(f.homeId)).toBe(true)
      expect(ids.has(f.awayId)).toBe(true)
      expect(f.homeId).not.toBe(f.awayId)
    }
  })
})
