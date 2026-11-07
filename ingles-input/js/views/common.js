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
