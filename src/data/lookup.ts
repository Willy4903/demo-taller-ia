import { DATASET } from '.'
import type { Team, TeamId } from '../domain/types'

const BY_ID = new Map<TeamId, Team>(DATASET.teams.map((t) => [t.id, t]))

export function team(id: TeamId): Team {
  const t = BY_ID.get(id)
  if (!t) throw new Error(`Equipo desconocido: ${id}`)
  return t
}
