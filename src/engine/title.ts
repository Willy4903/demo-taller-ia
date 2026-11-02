import type { Dataset, Tables, TeamId } from '../domain/types'
import { CHAMPION_MAX_ACUM_POSITION_UNCERTAIN, CHAMPION_MIN_ACUM_POSITION } from './rules'

export type Eligibility = 'si' | 'condicional' | 'no'

export interface TitleProjection {
  clausuraLeaderId: TeamId
  clausuraLeaderProvisional: boolean
  aperturaChampionId: TeamId
  /** Un solo club ganó ambos torneos: campeón nacional sin definición adicional. */
  directChampion: boolean
  clausuraChampionAcumPosition: number
  clausuraChampionEligibility: Eligibility
  /** Clubes que disputarían la definición del título si no hay campeón directo. */
  contenders: { teamId: TeamId; reason: string }[]
  notes: string[]
}

export function projectTitle(dataset: Dataset, tables: Tables): TitleProjection {
  const leader = tables.clausura.rows[0]
  const second = tables.clausura.rows[1]
  if (!leader || !second) throw new Error('Tabla del Clausura incompleta')
  const leaderProvisional =
    leader.provisional || tables.clausura.ties.some((t) => t.positions[0] === 1)
  const acumPos = tables.acumulado.rows.find((r) => r.teamId === leader.teamId)?.position ?? 99
  const eligibility: Eligibility =
    acumPos <= CHAMPION_MIN_ACUM_POSITION ? 'si' : acumPos <= CHAMPION_MAX_ACUM_POSITION_UNCERTAIN ? 'condicional' : 'no'
  const direct = leader.teamId === dataset.aperturaChampionId
  const notes: string[] = []
  const contenders: TitleProjection['contenders'] = []
  const add = (teamId: TeamId, reason: string) => {
    const existing = contenders.find((c) => c.teamId === teamId)
    if (existing) existing.reason += ` y ${reason}`
    else contenders.push({ teamId, reason })
  }

  if (direct) {
    notes.push('El mismo club lidera el Clausura y ganó el Apertura: sería campeón nacional sin semifinales.')
  } else {
    add(dataset.aperturaChampionId, 'campeón del Apertura')
    if (eligibility !== 'no') add(leader.teamId, 'campeón proyectado del Clausura')
    else notes.push('El líder del Clausura quedaría fuera de las primeras 8 posiciones del acumulado y no jugaría la definición.')
    for (const row of tables.acumulado.rows.slice(0, 2)) add(row.teamId, `puesto ${row.position} del acumulado`)
    if (eligibility === 'condicional') {
      notes.push('El líder del Clausura está 8.º del acumulado: las fuentes discrepan entre 7 y 8 como límite.')
    }
    notes.push('Los emparejamientos de semifinales y finales no se proyectan porque el texto del art. 7 y 8 no pudo verificarse.')
  }
  if (leaderProvisional) {
    notes.push('El primer lugar del Clausura es provisional: hay empate sin datos de Fair Play.')
  }
  return {
    clausuraLeaderId: leader.teamId,
    clausuraLeaderProvisional: leaderProvisional,
    aperturaChampionId: dataset.aperturaChampionId,
    directChampion: direct,
    clausuraChampionAcumPosition: acumPos,
    clausuraChampionEligibility: eligibility,
    contenders,
    notes,
  }
}
