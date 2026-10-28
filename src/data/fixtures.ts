import type { FechaWindow, Fixture, PlayedMatch } from '../domain/types'

type Row = [home: string, away: string, date: string | null]

const build = (fecha: number, rows: Row[]): Fixture[] =>
  rows.map(([homeId, awayId, date], i) => ({
    id: `c${fecha}-${String(i + 1).padStart(2, '0')}`,
    fecha,
    homeId,
    awayId,
    date,
  }))

/**
 * Fecha 14: ocho partidos pendientes (Juan Pablo II 2-0 Sport Huancayo ya se jugó el 27 de octubre).
 * Universitario vs Sport Boys se reprogramó al 4 de noviembre.
 */
const FECHA_14 = build(14, [
  ['adt', 'cd-moquegua', '2026-10-28'],
  ['fc-cajamarca', 'utc', '2026-10-28'],
  ['alianza-atletico', 'garcilaso', '2026-10-28'],
  ['cienciano', 'atletico-grau', '2026-10-28'],
  ['los-chankas', 'cusco-fc', '2026-10-29'],
  ['sporting-cristal', 'alianza-lima', '2026-10-29'],
  ['melgar', 'comerciantes-unidos', '2026-10-29'],
  ['universitario', 'sport-boys', '2026-11-04'],
])

const FECHA_15 = build(15, [
  ['alianza-atletico', 'juan-pablo-ii', '2026-10-31'],
  ['comerciantes-unidos', 'adt', '2026-11-03'],
  ['sport-huancayo', 'melgar', '2026-11-02'],
  ['alianza-lima', 'cienciano', null],
  ['utc', 'garcilaso', '2026-11-02'],
  ['atletico-grau', 'universitario', '2026-11-01'],
  ['sporting-cristal', 'fc-cajamarca', null],
  ['cd-moquegua', 'los-chankas', '2026-11-01'],
  ['cusco-fc', 'sport-boys', '2026-11-01'],
])

const FECHA_16 = build(16, [
  ['atletico-grau', 'cusco-fc', '2026-11-06'],
  ['adt', 'sporting-cristal', '2026-11-07'],
  ['fc-cajamarca', 'alianza-atletico', '2026-11-07'],
  ['melgar', 'juan-pablo-ii', '2026-11-07'],
  ['cienciano', 'sport-huancayo', '2026-11-07'],
  ['sport-boys', 'utc', null],
  ['garcilaso', 'comerciantes-unidos', null],
  ['los-chankas', 'alianza-lima', null],
  ['universitario', 'cd-moquegua', '2026-11-08'],
])

const FECHA_17 = build(17, [
  ['cusco-fc', 'adt', null],
  ['alianza-atletico', 'melgar', null],
  ['sporting-cristal', 'cienciano', null],
  ['cd-moquegua', 'atletico-grau', null],
  ['sport-huancayo', 'universitario', null],
  ['alianza-lima', 'fc-cajamarca', null],
  ['utc', 'los-chankas', null],
  ['comerciantes-unidos', 'sport-boys', null],
  ['juan-pablo-ii', 'garcilaso', null],
])

/** 35 partidos pendientes al corte: 8 + 9 + 9 + 9. */
export const FIXTURES: Fixture[] = [...FECHA_14, ...FECHA_15, ...FECHA_16, ...FECHA_17]

export const FECHA_WINDOWS: FechaWindow[] = [
  { fecha: 14, window: '27 oct al 4 nov', note: 'Universitario vs Sport Boys reprogramado al 4 de noviembre.' },
  { fecha: 15, window: '30 oct al 3 nov', note: 'Sin fecha publicada para Alianza Lima vs Cienciano ni Sporting Cristal vs FC Cajamarca.' },
  { fecha: 16, window: '6 al 8 nov' },
  { fecha: 17, window: '14 al 22 nov', note: 'Aún no programada oficialmente; las fuentes la ubican entre el 14 y el 22 de noviembre.' },
]

/**
 * Partidos jugados con resultado confirmado que se registran por trazabilidad. No alimentan el
 * cálculo: sus puntos ya están en las tablas base. Las fechas 1 a 12 no se detallan porque las
 * tablas publicadas son la referencia; ver README.
 */
export const PLAYED: PlayedMatch[] = [
  { fecha: 13, date: '2026-10-23', homeId: 'utc', awayId: 'melgar', homeGoals: 1, awayGoals: 2, sourceIds: ['infobae-f13'] },
  { fecha: 13, date: '2026-10-23', homeId: 'atletico-grau', awayId: 'adt', homeGoals: 1, awayGoals: 1, sourceIds: ['infobae-f13'] },
  { fecha: 13, date: '2026-10-24', homeId: 'sport-huancayo', awayId: 'alianza-atletico', homeGoals: 4, awayGoals: 1, sourceIds: ['infobae-f13'] },
  { fecha: 13, date: '2026-10-24', homeId: 'cusco-fc', awayId: 'sporting-cristal', homeGoals: 3, awayGoals: 1, sourceIds: ['infobae-f13'] },
  { fecha: 13, date: '2026-10-25', homeId: 'universitario', awayId: 'juan-pablo-ii', homeGoals: 3, awayGoals: 0, sourceIds: ['infobae-f13'] },
  {
    fecha: 13,
    date: '2026-10-25',
    homeId: 'comerciantes-unidos',
    awayId: 'cienciano',
    homeGoals: 3,
    awayGoals: 1,
    sourceIds: ['infobae-f13'],
    note: 'Depor publica el cruce invertido (Cienciano 1-3 Comerciantes Unidos); se usa Infobae.',
  },
  { fecha: 13, date: '2026-10-25', homeId: 'cd-moquegua', awayId: 'alianza-lima', homeGoals: 0, awayGoals: 1, sourceIds: ['infobae-f13'] },
  { fecha: 13, date: '2026-10-25', homeId: 'sport-boys', awayId: 'fc-cajamarca', homeGoals: 4, awayGoals: 2, sourceIds: ['infobae-f13'] },
  {
    fecha: 13,
    date: '2026-10-25',
    homeId: 'garcilaso',
    awayId: 'los-chankas',
    homeGoals: 4,
    awayGoals: 1,
    sourceIds: ['infobae-f13'],
    note: 'Depor menciona Garcilaso vs FC Cajamarca en su tabla; Infobae y la programación indican Los Chankas.',
  },
  {
    fecha: 14,
    date: '2026-10-27',
    homeId: 'juan-pablo-ii',
    awayId: 'sport-huancayo',
    homeGoals: 2,
    awayGoals: 0,
    sourceIds: ['depor-clausura-f14', 'libero-acum-f14'],
    note: 'Resultado incorporado en las tablas base del corte.',
  },
]
