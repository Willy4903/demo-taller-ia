import { describe, expect, it } from 'vitest'
import { baseRows, baseTables, rowOf } from '../src/engine/standings'
import { ds } from './helpers'

describe('datos iniciales de los 18 equipos', () => {
  it('registra 18 equipos únicos', () => {
    expect(ds.teams).toHaveLength(18)
    expect(new Set(ds.teams.map((t) => t.id)).size).toBe(18)
    expect(new Set(ds.teams.map((t) => t.short)).size).toBe(18)
  })

  it('tiene tabla de Clausura, Apertura y ajustes para cada equipo', () => {
    for (const t of ds.teams) {
      expect(ds.clausuraBase.filter((r) => r.teamId === t.id)).toHaveLength(1)
      expect(ds.apertura.filter((r) => r.teamId === t.id)).toHaveLength(1)
    }
    for (const a of ds.acumuladoAdjustments) expect(ds.teams.some((t) => t.id === a.teamId)).toBe(true)
  })

  it('la aritmética del Clausura cuadra: PJ = PG+PE+PP y puntos publicados = 3*PG+PE-sanción', () => {
    for (const r of ds.clausuraBase) {
      expect(r.pg + r.pe + r.pp, r.teamId).toBe(r.pj)
      expect(3 * r.pg + r.pe - r.deduction, r.teamId).toBe(r.publishedPts)
    }
  })

  it('la tabla del Clausura está balanceada: goles, victorias y derrotas y partidos', () => {
    const sum = (f: (r: (typeof ds.clausuraBase)[number]) => number) => ds.clausuraBase.reduce((a, r) => a + f(r), 0)
    expect(sum((r) => r.gf)).toBe(sum((r) => r.gc))
    expect(sum((r) => r.pg)).toBe(sum((r) => r.pp))
    // 13 fechas de 9 partidos más Juan Pablo II 2-0 Sport Huancayo: 118 partidos, 236 PJ.
    expect(sum((r) => r.pj)).toBe(2 * (13 * 9 + 1))
  })

  it('la tabla del Apertura está balanceada y todos jugaron 17', () => {
    expect(ds.apertura.every((r) => r.pj === 17)).toBe(true)
    expect(ds.apertura.reduce((a, r) => a + r.gf, 0)).toBe(ds.apertura.reduce((a, r) => a + r.gc, 0))
  })

  it('el acumulado al corte es Apertura + Clausura + ajuste documentado', () => {
    const { acumulado, clausura } = baseRows(ds)
    for (const a of acumulado) {
      const ap = ds.apertura.find((r) => r.teamId === a.teamId)!
      const c = clausura.find((r) => r.teamId === a.teamId)!
      const adj = ds.acumuladoAdjustments.find((x) => x.teamId === a.teamId)?.points ?? 0
      expect(a.pts).toBe(ap.pts + c.pts + adj)
      expect(a.gf).toBe(ap.gf + c.gf)
      expect(a.pj).toBe(17 + c.pj)
    }
  })

  it('los ajustes derivados reproducen los puntos del acumulado publicado', () => {
    const { acumulado } = baseRows(ds)
    for (const adj of ds.acumuladoAdjustments) {
      expect(acumulado.find((r) => r.teamId === adj.teamId)!.pts).toBe(adj.publishedAcumPts)
    }
  })

  it('cada ajuste y sanción tiene un registro documentado', () => {
    for (const adj of ds.acumuladoAdjustments) {
      expect(ds.deductions.some((d) => d.teamId === adj.teamId && d.scope === 'acumulado' && d.points === adj.points)).toBe(true)
    }
    const utc = ds.clausuraBase.find((r) => r.teamId === 'utc')!
    expect(ds.deductions.some((d) => d.teamId === 'utc' && d.scope === 'clausura' && d.points === -utc.deduction)).toBe(true)
  })

  it('el corte coincide con los datos publicados de los equipos clave', () => {
    const t = baseTables(ds)
    expect(rowOf(t.clausura, 'sport-huancayo')).toMatchObject({ position: 1, pts: 28, pj: 14 })
    expect(rowOf(t.clausura, 'universitario')).toMatchObject({ position: 2, pts: 27, gf: 28, gc: 19, gd: 9 })
    expect(rowOf(t.acumulado, 'alianza-lima')).toMatchObject({ position: 1, pts: 65 })
    expect(rowOf(t.acumulado, 'universitario')).toMatchObject({ position: 2, pts: 56 })
    expect(rowOf(t.acumulado, 'utc')).toMatchObject({ position: 18, pts: 10 })
    expect(rowOf(t.acumulado, 'adt')).toMatchObject({ position: 17, pts: 26 })
  })

  it('el orden del Clausura al corte sigue puntos, diferencia de goles y goles a favor', () => {
    const t = baseTables(ds)
    expect(t.clausura.rows.map((r) => r.teamId).slice(0, 7)).toEqual([
      'sport-huancayo',
      'universitario',
      'garcilaso',
      'sporting-cristal',
      'melgar',
      'juan-pablo-ii',
      'alianza-lima',
    ])
    expect(t.clausura.ties).toHaveLength(0)
    expect(t.acumulado.ties).toHaveLength(0)
  })

  it('las 17 posiciones publicadas del acumulado coinciden con el orden calculado', () => {
    const order = baseTables(ds).acumulado.rows.map((r) => r.teamId)
    expect(order).toEqual([
      'alianza-lima',
      'universitario',
      'melgar',
      'garcilaso',
      'cusco-fc',
      'cienciano',
      'los-chankas',
      'sporting-cristal',
      'sport-huancayo',
      'alianza-atletico',
      'juan-pablo-ii',
      'sport-boys',
      'comerciantes-unidos',
      'atletico-grau',
      'fc-cajamarca',
      'cd-moquegua',
      'adt',
      'utc',
    ])
  })

  it('toda fuente citada existe y cada fuente tiene url y fecha de consulta', () => {
    const ids = new Set(ds.sources.map((s) => s.id))
    expect(ids.size).toBe(ds.sources.length)
    const refs = [
      ...ds.played.flatMap((p) => p.sourceIds),
      ...ds.deductions.flatMap((d) => d.sourceIds),
      ...ds.discrepancies.flatMap((d) => d.sourceIds),
    ]
    for (const id of refs) expect(ids.has(id), id).toBe(true)
    for (const s of ds.sources) {
      expect(s.url).toMatch(/^https:\/\//)
      expect(s.accessed).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})
