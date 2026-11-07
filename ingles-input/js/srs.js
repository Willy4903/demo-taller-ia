// Repetición espaciada tipo SM-2 (SuperMemo 2).
import { addDays } from './util.js';

/** Calificaciones de los botones y su equivalente en la escala 0-5 de SM-2. */
export const QUALITY = { hard: 2, fair: 4, easy: 5 };

export function newCard(today) {
  return { ef: 2.5, reps: 0, interval: 0, due: today, lapses: 0, added: today };
}

/**
 * Calcula el nuevo estado de una tarjeta tras una respuesta de calidad q (0-5).
 * q < 3 cuenta como olvido: se reinicia y vuelve a aparecer hoy.
 */
export function sm2(card, q, today) {
  let { ef, reps, interval, lapses } = card;
  if (q < 3) {
    reps = 0;
    interval = 0;
    lapses += 1;
  } else {
    reps += 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 6;
    else interval = Math.max(interval + 1, Math.round(interval * ef));
  }
  ef = Math.max(1.3, ef + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  return { ...card, ef: Math.round(ef * 100) / 100, reps, interval, lapses, due: addDays(today, interval) };
}

export function isDue(card, today) {
  return card.due <= today;
}

/** Una tarjeta se considera aprendida cuando se acertó 3 veces seguidas. */
export function isLearned(card) {
  return !!card && card.reps >= 3;
}
