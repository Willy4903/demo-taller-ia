import { describe, expect, it } from 'vitest'
import { allDraw, resetAll, setOutcome, teamWinsAll } from '../src/engine/scenarios'
import { baseTables, computeTables, rowOf } from '../src/engine/standings'
import { ds, fixtureOf, inputsFor, univFixtures } from './helpers'

const base = baseTables(ds)

describe('motor de simulación', () => {
  it('sin marcadores devuelve exactamente las tablas iniciales', () => {
    const t = computeTables(ds, {})
    expect(t.clausura).toEqual(base.clausura)
    expect(t.acumulado).toEqual(base.acumulado)
    expect(t.simulatedCount).toBe(0)
    expect(t.pendingCount).toBe(29)
  })

  it('una victoria agrega tres puntos al ganador en Clausura y acumulado y nada al perdedor', () => {
    const fx = fixtureOf('universitario', 'sport-boys')
    const t = computeTables(ds, inputsFor({ [fx.id]: ['2', '0'] }))
    for (const kind of ['clausura', 'acumulado'] as const) {
      expect(rowOf(t[kind], 'universitario').pts).toBe(rowOf(base[kind], 'universitario').pts + 3)
      expect(rowOf(t[kind], 'sport-boys').pts).toBe(rowOf(base[kind], 'sport-boys').pts)
      expect(rowOf(t[kind], 'universitario').pj).toBe(rowOf(base[kind], 'universitario').pj + 1)
      expect(rowOf(t[kind], 'universitario').gf).toBe(rowOf(base[kind], 'universitario').gf + 2)
      expect(rowOf(t[kind], 'sport-boys').gc).toBe(rowOf(base[kind], 'sport-boys').gc + 2)
    }
    expect(rowOf(t.clausura, 'universitario')).toMatchObject({ pg: 9, pe: 3, pp: 2, pj: 14, pts: 30, gd: 11 })
    expect(rowOf(t.clausura, 'sport-boys')).toMatchObject({ pg: 6, pp: 5, pj: 14, pts: 21 })
  })

  it('cuatro victorias de Universitario agregan doce puntos al Clausura y al acumulado', () => {
    const t = computeTables(ds, teamWinsAll(ds, {}, 'universitario'))
    expect(rowOf(t.clausura, 'universitario').pts).toBe(27 + 12)
    expect(rowOf(t.acumulado, 'universitario').pts).toBe(56 + 12)
    expect(rowOf(t.clausura, 'universitario').pj).toBe(17)
    expect(rowOf(t.acumulado, 'universitario').pj).toBe(34)
    expect(t.simulatedCount).toBe(4)
  })

  it('los empates otorgan un punto a cada equipo', () => {
    const fx = fixtureOf('melgar', 'comerciantes-unidos')
    const t = computeTables(ds, inputsFor({ [fx.id]: ['1', '1'] }))
    for (const kind of ['clausura', 'acumulado'] as const) {
      expect(rowOf(t[kind], 'melgar').pts).toBe(rowOf(base[kind], 'melgar').pts + 1)
      expect(rowOf(t[kind], 'comerciantes-unidos').pts).toBe(rowOf(base[kind], 'comerciantes-unidos').pts + 1)
    }
    expect(rowOf(t.clausura, 'melgar').pe).toBe(5)
  })

  it('todos empatan: cada equipo suma un punto por partido pendiente', () => {
    const t = computeTables(ds, allDraw(ds))
    for (const row of t.clausura.rows) {
      const pending = ds.fixtures.filter((f) => f.homeId === row.teamId || f.awayId === row.teamId).length
      expect(row.pts - row.basePts).toBe(pending)
      expect(row.pj).toBe(17)
    }
    expect(t.simulatedCount).toBe(29)
    expect(t.pendingCount).toBe(0)
  })

  it('las sanciones no desaparecen al simular', () => {
    const t = computeTables(ds, allDraw(ds))
    const utcClausura = rowOf(t.clausura, 'utc')
    // 0 al corte (1 victoria y 2 empates, con la sanción de 5 incluida) más 3 empates.
    expect(rowOf(base.clausura, 'utc').pts).toBe(0)
    expect(utcClausura.pts).toBe(0 + 3)
    const utcAcum = rowOf(t.acumulado, 'utc')
    expect(utcAcum.pts).toBe(13 + 3)
    for (const adj of ds.acumuladoAdjustments) {
      const ap = ds.apertura.find((a) => a.teamId === adj.teamId)!
      const c = rowOf(t.clausura, adj.teamId)
      expect(rowOf(t.acumulado, adj.teamId).pts).toBe(ap.pts + c.pts + adj.points)
    }
  })

  it('acumulado proyectado = acumulado al corte + puntos de los partidos simulados', () => {
    const inputs = inputsFor({
      [fixtureOf('alianza-lima', 'cienciano').id]: 'home',
      [fixtureOf('universitario', 'sport-boys').id]: 'home',
      [fixtureOf('cienciano', 'sport-huancayo').id]: 'draw',
    })
    const t = computeTables(ds, inputs)
    expect(rowOf(t.acumulado, 'alianza-lima').pts).toBe(65 + 3)
    expect(rowOf(t.acumulado, 'sporting-cristal').pts).toBe(47)
    expect(rowOf(t.acumulado, 'universitario').pts).toBe(56 + 3)
    expect(rowOf(t.acumulado, 'cienciano').pts).toBe(50 + 1)
    expect(rowOf(t.acumulado, 'sport-huancayo').pts).toBe(44 + 1)
  })

  it('ningún partido se contabiliza dos veces', () => {
    const fx = fixtureOf('universitario', 'sport-boys')
    const once = computeTables(ds, inputsFor({ [fx.id]: ['1', '0'] }))
    const again = computeTables(ds, inputsFor({ [fx.id]: ['1', '0'] }))
    expect(again).toEqual(once)
    expect(rowOf(once.clausura, 'universitario').pj).toBe(14)
    // Recalcular sobre las mismas entradas no acumula: el motor parte siempre del corte.
    const third = computeTables(ds, inputsFor({ [fx.id]: ['1', '0'] }))
    expect(rowOf(third.acumulado, 'universitario').pts).toBe(59)
  })

  it('un marcador de un partido ya jugado o inexistente no modifica las tablas', () => {
    const t = computeTables(ds, {
      'c14-99': { home: '3', away: '0' },
      'c14-01': { home: '2', away: '2' },
      'jp2-huancayo': { home: '5', away: '0' },
    })
    expect(t.clausura).toEqual(base.clausura)
    expect(t.simulatedCount).toBe(0)
  })

  it('el resultado de Juan Pablo II 2-0 Sport Huancayo no se suma otra vez', () => {
    const t = computeTables(ds, allDraw(ds))
    expect(rowOf(t.clausura, 'juan-pablo-ii').pj).toBe(14 + 3)
    expect(rowOf(t.clausura, 'sport-huancayo').pj).toBe(14 + 3)
    // Los cuatro partidos del 28 de octubre ya están en la base: ADT y UTC suman tres partidos, no cuatro.
    expect(rowOf(t.clausura, 'adt').pj).toBe(14 + 3)
  })

  it('los partidos sin marcador completo no modifican ninguna clasificación', () => {
    const fx = fixtureOf('universitario', 'sport-boys')
    for (const input of [
      { home: '3', away: '' },
      { home: '', away: '2' },
      { home: 'x', away: '1' },
      { home: '-1', away: '0' },
      { home: '1.5', away: '0' },
      { home: '99', away: '0' },
    ]) {
      const t = computeTables(ds, { [fx.id]: input })
      expect(t.clausura, JSON.stringify(input)).toEqual(base.clausura)
      expect(t.acumulado).toEqual(base.acumulado)
      expect(t.simulatedCount).toBe(0)
      expect(t.ignoredCount).toBe(1)
    }
  })

  it('restablecer devuelve exactamente las tablas iniciales', () => {
    const dirty = teamWinsAll(ds, allDraw(ds), 'universitario')
    expect(computeTables(ds, dirty)).not.toEqual(base)
    const t = computeTables(ds, resetAll())
    expect(t.clausura).toEqual(base.clausura)
    expect(t.acumulado).toEqual(base.acumulado)
  })

  it('no modifica los datos base', () => {
    const snapshot = JSON.stringify(ds)
    computeTables(ds, allDraw(ds))
    computeTables(ds, teamWinsAll(ds, {}, 'universitario'))
    expect(JSON.stringify(ds)).toBe(snapshot)
  })
})

describe('ordenamiento y zonas proyectadas', () => {
  it('las victorias de Universitario lo llevan al primer lugar del Clausura y del acumulado', () => {
    const t = computeTables(ds, teamWinsAll(ds, {}, 'universitario'))
    expect(rowOf(base.clausura, 'universitario').position).toBe(3)
    expect(rowOf(t.clausura, 'universitario')).toMatchObject({ position: 1, zone: 'campeon', basePosition: 3 })
    expect(rowOf(t.clausura, 'sporting-cristal').position).toBe(2)
    expect(rowOf(t.clausura, 'sport-huancayo').position).toBe(3)
    expect(rowOf(t.acumulado, 'universitario')).toMatchObject({ pts: 68, position: 1, basePosition: 2 })
    expect(rowOf(t.acumulado, 'alianza-lima')).toMatchObject({ pts: 65, position: 2, basePosition: 1 })
  })

  it('Alianza Lima pierde el liderato del acumulado si Universitario gana todo y Alianza pierde todo', () => {
    const inputs = teamWinsAll(ds, {}, 'universitario')
    for (const fx of ds.fixtures) {
      if (fx.homeId === 'alianza-lima') inputs[fx.id] = { home: '0', away: '1' }
      else if (fx.awayId === 'alianza-lima') inputs[fx.id] = { home: '1', away: '0' }
    }
    const t = computeTables(ds, inputs)
    expect(rowOf(t.acumulado, 'alianza-lima').pts).toBe(65)
    expect(rowOf(t.acumulado, 'universitario').pts).toBe(68)
    expect(t.acumulado.rows[0]?.teamId).toBe('universitario')
    expect(rowOf(t.acumulado, 'alianza-lima').position).toBe(2)
  })

  it('las zonas del acumulado son 1-4, 5-8, 9-16 y 17-18', () => {
    const zones = baseTables(ds).acumulado.rows.map((r) => r.zone)
    expect(zones.slice(0, 4).every((z) => z === 'alta')).toBe(true)
    expect(zones.slice(4, 8).every((z) => z === 'sudamericana')).toBe(true)
    expect(zones.slice(8, 16).every((z) => z === 'media')).toBe(true)
    expect(zones.slice(16)).toEqual(['descenso', 'descenso'])
  })

  it('un equipo sale de la zona de descenso al ganar sus partidos y otro entra', () => {
    // Al corte descienden FC Cajamarca (26) y UTC (13); CD Moquegua (28) está justo encima.
    expect(rowOf(base.acumulado, 'fc-cajamarca').zone).toBe('descenso')
    expect(rowOf(base.acumulado, 'cd-moquegua').zone).toBe('media')
    const inputs: Record<string, { home: string; away: string }> = {}
    const lose = (team: string) => {
      for (const fx of ds.fixtures) {
        if (fx.homeId === team) inputs[fx.id] = { home: '0', away: '1' }
        else if (fx.awayId === team) inputs[fx.id] = { home: '1', away: '0' }
      }
    }
    const winAll = (team: string) => {
      for (const fx of ds.fixtures) {
        if (fx.homeId === team) inputs[fx.id] = { home: '1', away: '0' }
        else if (fx.awayId === team) inputs[fx.id] = { home: '0', away: '1' }
      }
    }
    winAll('fc-cajamarca')
    lose('cd-moquegua')
    lose('utc')
    const t = computeTables(ds, inputs)
    expect(rowOf(t.acumulado, 'fc-cajamarca')).toMatchObject({ pts: 35, zone: 'media' })
    expect(rowOf(t.acumulado, 'utc').zone).toBe('descenso')
    const down = t.acumulado.rows.filter((r) => r.zone === 'descenso').map((r) => r.teamId)
    expect(down).toContain('utc')
    expect(down).toContain('cd-moquegua')
    expect(down).not.toContain('fc-cajamarca')
  })

  it('el desempate del Clausura usa diferencia de goles y luego goles a favor', () => {
    // Garcilaso, Melgar, Juan Pablo II, Alianza Lima y Alianza Atlético tienen 25 puntos al corte.
    const order = base.clausura.rows.map((r) => r.teamId)
    expect(order.indexOf('garcilaso')).toBeLessThan(order.indexOf('melgar'))
    expect(order.indexOf('melgar')).toBeLessThan(order.indexOf('juan-pablo-ii'))
    expect(order.indexOf('juan-pablo-ii')).toBeLessThan(order.indexOf('alianza-lima'))
    expect(order.indexOf('alianza-lima')).toBeLessThan(order.indexOf('alianza-atletico'))
    // Sporting Cristal y Sport Huancayo empatan en 28: gana por diferencia de goles.
    expect(order.indexOf('sporting-cristal')).toBeLessThan(order.indexOf('sport-huancayo'))
  })

  it('registra la posición al corte para mostrar cambios', () => {
    const t = computeTables(ds, inputsFor({ [fixtureOf('universitario', 'sport-boys').id]: 'home' }))
    const row = rowOf(t.clausura, 'universitario')
    expect(row.basePosition).toBe(3)
    expect(row.basePts).toBe(27)
  })

  it('un empate sin datos de Fair Play ni enfrentamientos se marca como provisional', () => {
    const copy = structuredClone(ds)
    // Iguala a Cajamarca y Moquegua en puntos, goles a favor y goles en contra del acumulado.
    const caj = copy.apertura.find((r) => r.teamId === 'fc-cajamarca')!
    const moq = copy.apertura.find((r) => r.teamId === 'cd-moquegua')!
    const cajC = copy.clausuraBase.find((r) => r.teamId === 'fc-cajamarca')!
    const moqC = copy.clausuraBase.find((r) => r.teamId === 'cd-moquegua')!
    cajC.gf = moqC.gf = 10
    cajC.gc = moqC.gc = 20
    caj.gf = moq.gf = 20
    caj.gc = moq.gc = 25
    // Cajamarca suma 17 + 11 - 2 = 26; Moquegua queda también en 26.
    moq.pts = 16
    const t = computeTables(copy, {})
    const a = rowOf(t.acumulado, 'fc-cajamarca')
    const b = rowOf(t.acumulado, 'cd-moquegua')
    expect(a.pts).toBe(26)
    expect(b.pts).toBe(26)
    expect(a.provisional).toBe(true)
    expect(b.provisional).toBe(true)
    expect(t.acumulado.ties).toHaveLength(1)
    expect(t.acumulado.ties[0]).toMatchObject({ positions: [16, 17] })
  })

  it('un empate que cruza el límite de descenso se marca como crítico', () => {
    const copy = structuredClone(ds)
    // FC Cajamarca queda idéntico a CD Moquegua (16.º) en puntos, goles a favor y en contra.
    const src = { ap: copy.apertura.find((r) => r.teamId === 'cd-moquegua')!, c: copy.clausuraBase.find((r) => r.teamId === 'cd-moquegua')! }
    const dst = { ap: copy.apertura.find((r) => r.teamId === 'fc-cajamarca')!, c: copy.clausuraBase.find((r) => r.teamId === 'fc-cajamarca')! }
    Object.assign(dst.ap, { pts: src.ap.pts, gf: src.ap.gf, gc: src.ap.gc })
    Object.assign(dst.c, { pg: src.c.pg, pe: src.c.pe, pp: src.c.pp, gf: src.c.gf, gc: src.c.gc })
    copy.acumuladoAdjustments = []
    const t = computeTables(copy, {})
    const tie = t.acumulado.ties.find((g) => g.teamIds.includes('fc-cajamarca'))
    expect(tie).toMatchObject({ positions: [16, 17], critical: true })
    expect(tie?.teamIds).toContain('cd-moquegua')
    expect(rowOf(t.acumulado, 'fc-cajamarca').provisional).toBe(true)
  })

  it('los enfrentamientos directos y el Fair Play resuelven el empate cuando hay datos completos', () => {
    const copy = structuredClone(ds)
    const caj = copy.apertura.find((r) => r.teamId === 'fc-cajamarca')!
    const moq = copy.apertura.find((r) => r.teamId === 'cd-moquegua')!
    const cajC = copy.clausuraBase.find((r) => r.teamId === 'fc-cajamarca')!
    const moqC = copy.clausuraBase.find((r) => r.teamId === 'cd-moquegua')!
    cajC.gf = moqC.gf = 10
    cajC.gc = moqC.gc = 20
    caj.gf = moq.gf = 20
    caj.gc = moq.gc = 25
    moq.pts = 16
    // Cuatro enfrentamientos en la temporada; Moquegua suma más puntos.
    const meet = (homeId: string, awayId: string, homeGoals: number, awayGoals: number) => ({ homeId, awayId, homeGoals, awayGoals })
    copy.headToHead = [
      meet('cd-moquegua', 'fc-cajamarca', 1, 0),
      meet('fc-cajamarca', 'cd-moquegua', 1, 1),
      meet('cd-moquegua', 'fc-cajamarca', 2, 2),
      meet('fc-cajamarca', 'cd-moquegua', 0, 1),
    ]
    const t = computeTables(copy, {})
    expect(rowOf(t.acumulado, 'cd-moquegua').position).toBe(16)
    expect(rowOf(t.acumulado, 'fc-cajamarca').position).toBe(17)
    expect(t.acumulado.ties).toHaveLength(0)

    // Con enfrentamientos incompletos el empate sigue provisional; el Fair Play lo resuelve.
    copy.headToHead = copy.headToHead.slice(0, 2)
    expect(computeTables(copy, {}).acumulado.ties).toHaveLength(1)
    copy.fairPlay = { 'fc-cajamarca': 10, 'cd-moquegua': 20 }
    const fp = computeTables(copy, {})
    expect(fp.acumulado.ties).toHaveLength(0)
    expect(rowOf(fp.acumulado, 'fc-cajamarca').position).toBe(16)
  })

  it('el Clausura no usa enfrentamientos directos', () => {
    const copy = structuredClone(ds)
    const a = copy.clausuraBase.find((r) => r.teamId === 'adt')!
    const b = copy.clausuraBase.find((r) => r.teamId === 'cd-moquegua')!
    a.pg = 2
    a.pe = 1
    a.pp = 10
    b.pg = 2
    b.pe = 1
    b.pp = 10
    a.gf = b.gf = 9
    a.gc = b.gc = 24
    copy.headToHead = [
      { homeId: 'adt', awayId: 'cd-moquegua', homeGoals: 3, awayGoals: 0 },
      { homeId: 'cd-moquegua', awayId: 'adt', homeGoals: 0, awayGoals: 3 },
      { homeId: 'adt', awayId: 'cd-moquegua', homeGoals: 3, awayGoals: 0 },
      { homeId: 'cd-moquegua', awayId: 'adt', homeGoals: 0, awayGoals: 3 },
    ]
    const t = computeTables(copy, {})
    expect(t.clausura.ties.some((g) => g.teamIds.includes('adt') && g.teamIds.includes('cd-moquegua'))).toBe(true)
  })

  it('setOutcome fija un marcador representativo editable', () => {
    const fx = fixtureOf('universitario', 'sport-boys')
    expect(setOutcome({}, fx.id, 'home')[fx.id]).toEqual({ home: '1', away: '0' })
    expect(setOutcome({}, fx.id, 'draw')[fx.id]).toEqual({ home: '0', away: '0' })
    expect(setOutcome({}, fx.id, 'away')[fx.id]).toEqual({ home: '0', away: '1' })
  })

  it('teamWinsAll solo toca los partidos del equipo y respeta la localía', () => {
    const other = fixtureOf('melgar', 'comerciantes-unidos')
    const inputs = teamWinsAll(ds, { [other.id]: { home: '2', away: '2' } }, 'universitario')
    expect(inputs[other.id]).toEqual({ home: '2', away: '2' })
    expect(inputs[fixtureOf('universitario', 'sport-boys').id]).toEqual({ home: '1', away: '0' })
    expect(inputs[fixtureOf('atletico-grau', 'universitario').id]).toEqual({ home: '0', away: '1' })
    expect(univFixtures()).toHaveLength(4)
    expect(Object.keys(inputs)).toHaveLength(5)
  })
})
