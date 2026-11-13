// Funciones compartidas por varias vistas.
import { h } from '../util.js';
import { rank } from '../adapt.js';
import { notice } from '../ui.js';
import { sttSupported, ttsSupported } from '../speech.js';

/** Fila de botones para filtrar por situación. */
export function situationChips(data, selected, onSelect) {
  const wrap = h('div', { class: 'chips', role: 'group', 'aria-label': 'Filtrar por situación' });
  const make = (id, label) => h('button', {
    type: 'button', class: 'chip', 'aria-pressed': selected === id ? 'true' : 'false',
    onClick: () => onSelect(id),
  }, label);
  wrap.append(make('', 'Todas'));
  for (const s of data.situations) wrap.append(make(s.id, s.name));
  return wrap;
}

/** Ordena contenidos según el nivel actual del usuario para ese tipo de actividad. */
export function recommend(ctx, kind, items, prefix) {
  const st = ctx.store.get();
  return rank(items, { kind, level: st.level[kind], ratings: st.ratings, keyOf: (i) => `${prefix}:${i.id}` });
}

export function ratingLabel(rating) {
  return { easy: 'Muy fácil', fair: 'Justo', hard: 'Difícil' }[rating] || '';
}

export function speechNotices() {
  const out = [];
  if (!ttsSupported) {
    out.push(notice('Tu navegador no puede reproducir voz en inglés. Puedes leer y ver las traducciones, pero no escucharás el audio. Prueba con Chrome, Edge o Safari actualizados.', 'warn', 'Audio no disponible'));
  }
  return out;
}

/** Aviso claro cuando el navegador no soporta reconocimiento de voz. */
export function sttNotice() {
  if (sttSupported) return null;
  return notice(
    'Tu navegador no soporta reconocimiento de voz (SpeechRecognition), así que la app no puede escucharte. Usa Chrome o Edge (computadora o Android) o un Safari reciente; Firefox no lo incluye. Mientras tanto puedes practicar escribiendo lo que dirías.',
    'warn', 'Reconocimiento de voz no disponible');
}

// ---------------------------------------------------------------------------
// Biblioteca: niveles, temáticas y avance de lectura
// ---------------------------------------------------------------------------

/** Dificultad del contenido (1 a 3) o nivel interno (1.0 a 3.0) expresado como nivel del MCER. */
export function cefr(n) {
  if (n < 1.67) return 'A1';
  if (n < 2.34) return 'A2';
  return 'B1';
}
export const LEVEL_NAMES = { A1: 'Básico', A2: 'Elemental', B1: 'Intermedio' };

/** Temáticas de la biblioteca a partir de la situación de cada historia. */
export const THEMES = [
  { id: 'cotidiano', name: 'Cotidiano', situations: ['presentarse', 'comida', 'compras', 'casa', 'salud', 'ciudad'] },
  { id: 'viajes', name: 'Viajes y aventura', situations: ['viajes', 'hotel', 'tiempo-libre'] },
  { id: 'trabajo', name: 'Trabajo', situations: ['trabajo'] },
];
export const themeOf = (story) => THEMES.find((t) => t.situations.includes(story.situation)) || THEMES[0];

/** Avance de lectura de una historia: { pct, state: 'new' | 'reading' | 'done', pos, total }. */
export function storyProgress(st, story) {
  const r = st.stories[story.id] || {};
  const total = story.sentences.length;
  if (r.plays > 0 && !(r.pos > 0 && r.pos < total)) return { pct: 100, state: 'done', pos: total, total };
  const pos = Math.max(0, Math.min(total, Number(r.pos) || 0));
  if (r.opened) return { pct: Math.round((pos / total) * 100), state: 'reading', pos, total };
  return { pct: 0, state: 'new', pos: 0, total };
}

/** Última historia abierta (o null). */
export function lastStoryId(st, data) {
  let best = null;
  for (const [id, r] of Object.entries(st.stories)) {
    if (!data.storyById[id] || !r?.opened) continue;
    if (!best || r.opened > best.opened) best = { id, opened: r.opened };
  }
  return best?.id || null;
}

export const wordsIn = (story) => story.sentences.map((x) => x.en).join(' ').split(/\s+/).length;
