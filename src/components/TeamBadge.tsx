import { team } from '../data/lookup'
import { UNIVERSITARIO_ID } from '../data/teams'

export function TeamBadge({ id }: { id: string }) {
  const isU = id === UNIVERSITARIO_ID
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-7 w-9 shrink-0 items-center justify-center rounded text-[11px] font-bold tracking-wide ${
        isU ? 'bg-granate-700 text-dorado-400' : 'bg-crema-200 text-granate-800'
      }`}
    >
      {team(id).short}
    </span>
  )
}
