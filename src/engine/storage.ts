import type { Dataset, ScoreInputs } from '../domain/types'

const KEY = 'liga1-2026-simulador'

interface Saved {
  datasetVersion: string
  inputs: ScoreInputs
}

function isInputs(value: unknown): value is ScoreInputs {
  if (typeof value !== 'object' || value === null) return false
  return Object.values(value).every(
    (v) =>
      typeof v === 'object' &&
      v !== null &&
      typeof (v as { home?: unknown }).home === 'string' &&
      typeof (v as { away?: unknown }).away === 'string',
  )
}

/** Carga solo las simulaciones de la misma versión de datos y de partidos que aún existen. */
export function loadInputs(dataset: Dataset, storage: Pick<Storage, 'getItem'> | null = safeStorage()): ScoreInputs {
  try {
    const raw = storage?.getItem(KEY)
    if (!raw) return {}
    const saved = JSON.parse(raw) as Partial<Saved>
    if (saved.datasetVersion !== dataset.version || !isInputs(saved.inputs)) return {}
    const ids = new Set(dataset.fixtures.map((f) => f.id))
    return Object.fromEntries(Object.entries(saved.inputs).filter(([id]) => ids.has(id)))
  } catch {
    return {}
  }
}

export function saveInputs(
  dataset: Dataset,
  inputs: ScoreInputs,
  storage: Pick<Storage, 'setItem' | 'removeItem'> | null = safeStorage(),
): void {
  try {
    if (Object.keys(inputs).length === 0) storage?.removeItem(KEY)
    else storage?.setItem(KEY, JSON.stringify({ datasetVersion: dataset.version, inputs } satisfies Saved))
  } catch {
    // Almacenamiento no disponible o lleno: la simulación sigue funcionando en memoria.
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}
