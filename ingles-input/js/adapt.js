// Adaptación de dificultad según la valoración "muy fácil / justo / difícil".
import { clamp } from './util.js';

export const RATINGS = [
  { id: 'easy', label: 'Muy fácil', hint: 'Lo entendí sin esfuerzo' },
  { id: 'fair', label: 'Justo', hint: 'Entendí con algo de esfuerzo' },
  { id: 'hard', label: 'Difícil', hint: 'Me costó entenderlo' },
];

/**
 * Mueve el nivel de comodidad del usuario (1 a 3) según cómo le fue con un contenido.
 * - Muy fácil: sube, más si el contenido ya era exigente para su nivel.
 * - Justo: se acerca a la dificultad del contenido.
 * - Difícil: baja, menos si el contenido estaba muy por encima de su nivel.
 */
export function nextLevel(level, itemDifficulty, rating) {
  let l = level;
  if (rating === 'easy') l += itemDifficulty >= level - 0.25 ? 0.4 : 0.15;
  else if (rating === 'hard') l -= itemDifficulty <= level + 0.75 ? 0.4 : 0.2;
  else l += (itemDifficulty - level) * 0.25;
  return Math.round(clamp(l, 1, 3) * 100) / 100;
}

export function levelWord(level) {
  if (level < 1.5) return 'suave';
  if (level < 2.4) return 'medio';
  return 'exigente';
}

/** Registra la valoración de un contenido y actualiza el nivel del tipo de actividad. */
export function applyRating(state, kind, key, itemDifficulty, rating) {
  const prev = state.ratings[key];
  state.ratings[key] = { last: rating, n: (prev?.n || 0) + 1, at: Date.now() };
  state.level[kind] = nextLevel(state.level[kind] ?? 1, itemDifficulty, rating);
}

/**
 * Ordena contenidos de más a menos recomendado.
 * Prefiere lo no visto y lo cercano al nivel; deja descansar lo que el usuario ya marcó como muy fácil
 * y no repite enseguida lo hecho hoy.
 */
export function rank(items, { kind, level, ratings, keyOf, now = Date.now() }) {
  return items
    .map((item) => {
      const r = ratings[keyOf(item)];
      let score = Math.abs(item.difficulty - level);
      let reason = 'cerca de tu nivel';
      if (!r) {
        score -= 0.3;
        reason = item.difficulty > level + 0.5 ? 'nuevo y un reto' : 'nuevo para ti';
      } else {
        const hoursAgo = (now - r.at) / 3600000;
        if (hoursAgo < 20) score += 2;
        if (r.last === 'easy') score += 1;
        if (r.last === 'hard') {
          score += hoursAgo < 24 * 2 ? 0.8 : -0.2;
          if (hoursAgo >= 24 * 2) reason = 'para repasar';
        }
      }
      return { item, score, reason };
    })
    .sort((a, b) => a.score - b.score);
}
