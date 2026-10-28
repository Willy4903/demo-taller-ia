import type { DeductionRecord, Discrepancy } from '../domain/types'

export const DEDUCTIONS: DeductionRecord[] = [
  {
    teamId: 'utc',
    points: -5,
    scope: 'clausura',
    status: 'itemizada',
    description:
      'Deducción de 5 puntos en el Clausura (2 por la deuda con Gaspar Gentile y 3 por otro caso, según Depor). Con 0 victorias y 2 empates, la tabla publica -3 puntos, lo que confirma la resta.',
    sourceIds: ['depor-utc-5', 'libero-clausura-f14'],
  },
  {
    teamId: 'utc',
    points: -5,
    scope: 'acumulado',
    status: 'derivada',
    description:
      'Diferencia entre Apertura (18) más Clausura (-3) y los 10 puntos del acumulado publicado. Balón Latino cuenta 10 puntos de descuento en total; el desglose por torneo no está confirmado.',
    sourceIds: ['libero-acum-f14', 'balon-utc', 'futbolperuano-apertura'],
  },
  {
    teamId: 'sport-boys',
    points: -4,
    scope: 'acumulado',
    status: 'derivada',
    description:
      'Diferencia entre Apertura (20) más Clausura (21) y los 37 puntos del acumulado publicado. Líbero confirma 2 puntos restados por el Reglamento de Licencias; los otros 2 no están justificados en las fuentes consultadas.',
    sourceIds: ['libero-acum-f14', 'libero-boys'],
  },
  {
    teamId: 'adt',
    points: -1,
    scope: 'acumulado',
    status: 'derivada',
    description:
      'Diferencia entre Apertura (20) más Clausura (7) y los 26 puntos del acumulado publicado, que marca a ADT con sanción. El motivo no figura en las fuentes consultadas.',
    sourceIds: ['libero-acum-f14', 'futbolperuano-apertura'],
  },
]

export const DISCREPANCIES: Discrepancy[] = [
  {
    id: 'univ-gf',
    subject: 'Universitario, goles a favor en el Clausura',
    detail: 'Depor publica 27 GF (DG +8). La web oficial de Universitario publica 28 GF y 19 GC (DG +9).',
    resolution:
      'Se usa 28. Con 28 GF la suma de goles a favor y en contra del Clausura coincide (356 y 356) y la DG acumulada de Líbero (+18) iguala Apertura (+9) más Clausura (+9).',
    sourceIds: ['depor-clausura-f14', 'universitario-oficial', 'libero-acum-f14'],
  },
  {
    id: 'adt-gd',
    subject: 'ADT, diferencia de goles en el Clausura',
    detail: 'Depor publica 9 GF, 24 GC y DG -16, que no es consistente (9 - 24 = -15).',
    resolution: 'Se usan GF 9 y GC 24 (DG -15). La DG acumulada de Líbero (-14) coincide con Apertura (+1) más -15.',
    sourceIds: ['depor-clausura-f14', 'libero-acum-f14', 'futbolperuano-apertura'],
  },
  {
    id: 'grau-pj',
    subject: 'Atlético Grau, partidos jugados',
    detail: 'Depor publica 12 PJ, pero 5 victorias, 3 empates y 5 derrotas suman 13.',
    resolution: 'Se usa 13, coherente con los demás equipos al cierre de la fecha 13.',
    sourceIds: ['depor-clausura-f14'],
  },
  {
    id: 'utc-missing-depor',
    subject: 'UTC ausente en la tabla de Depor',
    detail: 'Depor lista 17 equipos y omite a UTC.',
    resolution:
      'La línea de UTC (13 PJ, 0 PG, 2 PE, 11 PP, GF 12, GC 28, -3 puntos) sale de Líbero. Con ella la suma de victorias iguala la de derrotas (95) y los goles cuadran.',
    sourceIds: ['libero-clausura-f14'],
  },
  {
    id: 'cusco-acum',
    subject: 'Cusco FC, puntos del acumulado',
    detail: 'Líbero publica 49; Apertura (27) más Clausura (21) suman 48 y otra fuente publica 48.',
    resolution: 'Se usa 48, sin ajuste de sanción.',
    sourceIds: ['libero-acum-f14', 'futbolperuano-apertura', 'larepublica-tabla-f14'],
  },
  {
    id: 'acum-gd-libero',
    subject: 'Diferencia de goles del acumulado de Líbero en Alianza Atlético, Sport Boys y UTC',
    detail:
      'Líbero publica +14 (Alianza Atlético), +13 (Sport Boys) y -19 (UTC). Apertura más Clausura dan +1, +1 y -21.',
    resolution:
      'El acumulado de goles se calcula siempre como Apertura más Clausura; los puntos del acumulado sí se toman de la publicación de Líbero con los ajustes documentados.',
    sourceIds: ['libero-acum-f14', 'futbolperuano-apertura'],
  },
  {
    id: 'cajamarca-wiki',
    subject: 'FC Cajamarca, puntos del acumulado',
    detail: 'Wikipedia (datos de un día antes) lo muestra con 26; Líbero con 28; Apertura (17) más Clausura (11) suman 28.',
    resolution: 'Se usan 28.',
    sourceIds: ['wikipedia-liga1', 'libero-acum-f14'],
  },
  {
    id: 'moquegua-cajamarca-tie',
    subject: 'Empate en 28 puntos entre FC Cajamarca y CD Moquegua en el acumulado',
    detail: 'Ambos suman 28 puntos; la DG acumulada es -14 (Cajamarca) y -19 (Moquegua).',
    resolution: 'Desempata la diferencia de goles; Cajamarca queda 15.º y Moquegua 16.º. Por encima del descenso, no es crítico.',
    sourceIds: ['libero-acum-f14'],
  },
  {
    id: 'f14-results',
    subject: 'Resultados de la fecha 14 entre fuentes',
    detail: 'Las fuentes consultadas solo confirman Juan Pablo II 2-0 Sport Huancayo (27 de octubre).',
    resolution: 'Los otros ocho partidos de la fecha 14 figuran como pendientes, tal como indica el corte del 28 de octubre.',
    sourceIds: ['infobae-prog-f14', 'rpp-f14'],
  },
  {
    id: 'f17-dates',
    subject: 'Fecha 17: horarios',
    detail: 'Liga1 publica el rango 14 al 22 de noviembre; Líbero indica que se jugaría el domingo 22 pero que aún no hay programación.',
    resolution: 'Los partidos de la fecha 17 se registran sin fecha de partido.',
    sourceIds: ['liga1-fixture', 'libero-ultima-fecha'],
  },
]
