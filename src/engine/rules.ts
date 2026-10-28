import type { TableKind, ZoneId } from '../domain/types'

/**
 * Reglas de la Liga 1 2026 según el reglamento oficial (artículos 7, 8, 9, 10, 14 y 15).
 * El PDF oficial no pudo leerse desde el entorno de desarrollo; cada regla indica en
 * `verified` si coinciden al menos dos fuentes secundarias. Las reglas no verificadas no se aplican
 * como hecho: la interfaz las muestra como referencia o como advertencia.
 */

export interface ZoneBand {
  zone: ZoneId
  from: number
  to: number
}

export const ZONE_BANDS: Record<TableKind, ZoneBand[]> = {
  clausura: [
    { zone: 'campeon', from: 1, to: 1 },
    { zone: 'media', from: 2, to: 18 },
  ],
  acumulado: [
    { zone: 'alta', from: 1, to: 4 },
    { zone: 'sudamericana', from: 5, to: 8 },
    { zone: 'media', from: 9, to: 16 },
    { zone: 'descenso', from: 17, to: 18 },
  ],
}

export function zoneFor(kind: TableKind, position: number): ZoneId {
  const band = ZONE_BANDS[kind].find((b) => position >= b.from && position <= b.to)
  return band?.zone ?? 'media'
}

/** Posiciones a partir de las cuales cambia la zona; un empate que las cruza es crítico. */
export const TIE_BOUNDARIES: Record<TableKind, number[]> = {
  clausura: [1],
  acumulado: [2, 4, 8, 16],
}

export const ZONE_LABELS: Record<ZoneId, { label: string; detail: string }> = {
  campeon: { label: 'Campeón del Clausura', detail: 'Primer lugar del Torneo Clausura.' },
  alta: {
    label: 'Zona alta del acumulado',
    detail:
      'Posiciones 1 a 4. Candidatas a Copa Libertadores 2027; los cupos dependen de la definición del campeonato y de los play-offs (arts. 7 y 9), no son automáticos.',
  },
  sudamericana: {
    label: 'Zona Sudamericana (referencia)',
    detail:
      'Posiciones 5 a 8. Candidatas a Copa Sudamericana 2027 según un resumen secundario del art. 9; no verificado contra el PDF oficial.',
  },
  media: { label: 'Zona intermedia', detail: 'Sin cupo ni descenso proyectado.' },
  descenso: {
    label: 'Descenso',
    detail: 'Los dos últimos del acumulado anual descienden a la Liga 2 2027 (art. 10).',
  },
}

export interface RuleNote {
  article: string
  title: string
  text: string
  verified: boolean
}

export const RULE_NOTES: RuleNote[] = [
  {
    article: 'Art. 7',
    title: 'Definición del campeón nacional',
    text: 'Si un mismo club gana Apertura y Clausura es campeón nacional. En otro caso se juegan semifinales y final entre los campeones de cada torneo y los dos mejores del acumulado. Los medios discrepan en si el campeón de un torneo debe estar entre los 7 u 8 primeros del acumulado. El PDF no pudo leerse.',
    verified: false,
  },
  {
    article: 'Art. 8',
    title: 'Play-offs',
    text: 'Los emparejamientos exactos de semifinales y de los play-offs por cupos no se pudieron verificar; el simulador no los proyecta.',
    verified: false,
  },
  {
    article: 'Art. 9',
    title: 'Cupos a Copa Libertadores y Sudamericana 2027',
    text: 'Los cupos dependen de la definición del campeonato y de los play-offs. Las cuatro primeras posiciones del acumulado no equivalen a cuatro cupos automáticos.',
    verified: false,
  },
  {
    article: 'Art. 10',
    title: 'Descenso',
    text: 'Descienden a la Liga 2 los dos últimos de la tabla acumulada al final del Clausura.',
    verified: true,
  },
  {
    article: 'Art. 14',
    title: 'Desempates del Apertura y del Clausura',
    text: 'Puntos, diferencia de goles, goles a favor, Fair Play y sorteo. No se miran los enfrentamientos directos ni hay partido de desempate.',
    verified: true,
  },
  {
    article: 'Art. 15',
    title: 'Desempates del acumulado',
    text: 'Puntos, diferencia de goles, goles a favor, enfrentamientos directos entre los clubes involucrados y Fair Play. Una fuente secundaria indica este orden; no se pudo leer el texto oficial.',
    verified: false,
  },
]

/** Posición mínima del acumulado para que el campeón de un torneo juegue la definición del título. */
export const CHAMPION_MIN_ACUM_POSITION = 7
/** Algunas fuentes indican 8; en esa posición el estado se muestra como condicional. */
export const CHAMPION_MAX_ACUM_POSITION_UNCERTAIN = 8

/** Encuentros entre dos clubes en la temporada (2 en Apertura y 2 en Clausura). */
export const HEAD_TO_HEAD_MEETINGS_PER_PAIR = 4
