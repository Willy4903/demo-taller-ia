// Gramática de apoyo: detecta estructuras que fallas repetidamente y desbloquea una mini explicación.

/** Fallos acumulados de la misma estructura antes de mostrar la explicación. */
export const FAIL_THRESHOLD = 3;
/** Tiempo mínimo entre dos avisos de la misma estructura. */
export const COOLDOWN_MS = 6 * 3600 * 1000;

/**
 * Registra un fallo en una estructura. Devuelve el id de la estructura si ya toca mostrar su explicación.
 * Un acierto (ver recordSuccess) resta uno, así solo aparece cuando el error es recurrente.
 */
export function recordFail(state, tag, now = Date.now()) {
  if (!tag) return null;
  const g = state.grammar;
  g.counts[tag] = (g.counts[tag] || 0) + 1;
  if (g.counts[tag] >= FAIL_THRESHOLD) {
    const last = g.shown[tag] || 0;
    if (now - last >= COOLDOWN_MS) {
      g.counts[tag] = 0;
      g.shown[tag] = now;
      if (!g.unlocked.includes(tag)) g.unlocked.push(tag);
      return tag;
    }
  }
  return null;
}

export function recordSuccess(state, tag) {
  if (!tag) return;
  const c = state.grammar.counts[tag] || 0;
  if (c > 0) state.grammar.counts[tag] = c - 1;
}
