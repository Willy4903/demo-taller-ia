import { describe, expect, it } from 'vitest'
import { baseRows } from '../src/engine/standings'
import { ds } from './helpers'

describe('los 35 partidos pendientes del corte original y los 31 que quedan', () => {
  it('hay 31 partidos pendientes: 4 de la fecha 14 y 9 de cada una de las fechas 15, 16 y 17', () => {
    expect(ds.fixtures).toHaveLength(31)
    const byFecha = (n: number) => ds.fixtures.filter((f) => f.fecha === n).length
    expect([byFecha(14), byFecha(15), byFecha(16), byFecha(17)]).toEqual([4, 9, 9, 9])
    expect(new Set(ds.fixtures.map((f) => f.id)).size).toBe(31)
  })

  it('los 35 pendientes del corte del 28 de octubre son 31 pendientes más 4 jugados ese día', () => {
    const playedOn28 = ds.played.filter((p) => p.fecha === 14 && p.date === '2026-10-28')
    expect(playedOn28).toHaveLength(4)
    expect(ds.fixtures.length + playedOn28.length).toBe(35)
    expect(playedOn28.map((p) => `${p.homeId}-${p.awayId}-${p.homeGoals}-${p.awayGoals}`).sort()).toEqual([
      'adt-cd-moquegua-2-0',
      'alianza-atletico-garcilaso-3-2',
      'cienciano-atletico-grau-3-0',
      'fc-cajamarca-utc-1-3',
    ])
  })

  it('los partidos ya jugados de la fecha 14 no están en el fixture pendiente', () => {
    expect(ds.fixtures.some((f) => f.homeId === 'juan-pablo-ii' && f.awayId === 'sport-huancayo')).toBe(false)
    const played = ds.played.find((p) => p.homeId === 'juan-pablo-ii' && p.awayId === 'sport-huancayo')
    expect(played).toMatchObject({ fecha: 14, date: '2026-10-27', homeGoals: 2, awayGoals: 0 })
    expect(ds.fixtures.filter((f) => f.fecha === 14).map((f) => f.id)).toEqual(['c14-05', 'c14-06', 'c14-07', 'c14-08'])
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
    expect(new Set(f14).size).toBe(8)
    const pairs = ds.fixtures.map((f) => [f.homeId, f.awayId].sort().join('|'))
    expect(new Set(pairs).size).toBe(31)
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
