// Inicio: plan del día, racha y recomendaciones según tu nivel.
import { h, todayStr } from '../util.js';
import { icon, progressBar, difficultyDots, notice, badge, situationIcon } from '../ui.js';
import { PLAN_MINUTES, computeStreak, dayMinutes } from '../store.js';
import { recommend, speechNotices, sttNotice } from './common.js';
import { isDue } from '../srs.js';

export const PLAN = [
  { id: 'input', label: 'Escuchar y leer', href: '#/leer' },
  { id: 'shadowing', label: 'Shadowing', href: '#/shadowing' },
  { id: 'convo', label: 'Conversación', href: '#/hablar' },
  { id: 'review', label: 'Repaso de tarjetas', href: '#/tarjetas' },
];

export function render(root, ctx) {
  const { data, store } = ctx;
  const st = store.get();
  const day = st.days[todayStr()];
  const streak = computeStreak(st.days);
  const mins = dayMinutes(day);

  root.classList.add('home-page');
  const featured = recommend(ctx, 'input', data.stories, 'story')[0]?.item;
  root.append(h('section', { class: 'learning-hero', 'aria-labelledby': 'page-title' },
    h('div', { class: 'hero-copy' },
      h('p', { class: 'eyebrow', text: 'TU INGLÉS EMPIEZA AQUÍ' }),
      h('h1', { id: 'page-title', tabindex: '-1' }, 'Pequeñas lecciones.', h('br'), 'Grandes conversaciones.'),
      h('p', { text: 'Descubre historias, escucha nuevas voces y encuentra las palabras para conectar con el mundo. A tu ritmo, cada día.' }),
      h('a', { class: 'btn btn-primary', href: featured ? `#/leer/${featured.id}` : '#/leer' }, icon('play', 20), 'Empieza a aprender'),
      h('span', { class: 'hero-note', text: 'Gratis · Sin cuenta · Para principiantes' })),
    h('a', { class: 'hero-art', href: featured ? `#/leer/${featured.id}` : '#/leer', 'aria-label': featured ? `Escuchar: ${featured.title}` : 'Explorar historias' },
      h('span', { class: 'art-label', text: 'ESCUCHA Y DESCUBRE' }),
      h('span', { class: 'speech-bubble bubble-one', lang: 'en', text: 'Hello!' }),
      h('span', { class: 'speech-bubble bubble-two', lang: 'en', text: 'Let’s talk.' }),
      h('span', { class: 'art-orbit', 'aria-hidden': 'true' }, icon('volume', 80)),
      h('span', { class: 'art-caption' }, icon('play', 18), featured?.title || 'Historias para conectar'))));
  root.append(h('section', { class: 'explore-section', 'aria-labelledby': 'explore-title' },
    h('div', { class: 'section-heading' }, h('h2', { id: 'explore-title', text: '¿Qué quieres practicar hoy?' }), h('span', { text: 'Un paso más, a tu manera' })),
    h('div', { class: 'learning-paths' },
      ...[
        ['book', 'Escuchar y leer', 'Historias que hablan de ti', '#/leer', 'coral'],
        ['mic', 'Shadowing', 'Encuentra tu voz en inglés', '#/shadowing', 'purple'],
        ['cards', 'Vocabulario', 'Palabras que se quedan contigo', '#/tarjetas', 'teal'],
        ['chat', 'Conversación', 'Del “hello” a una conversación', '#/hablar', 'gold'],
      ].map(([ic, title, description, href, color]) => h('a', { class: `learning-path ${color}`, href },
        h('span', { class: 'path-art', 'aria-hidden': 'true' }, icon(ic, 44), h('span', { class: 'path-arrow' }, icon('arrow', 22))),
        h('div', { class: 'path-copy' }, h('h3', { text: title }), h('p', { text: description })))))));

  if (!store.persistent) {
    root.append(notice('Tu navegador no permite guardar datos (modo privado o almacenamiento bloqueado). Puedes practicar, pero el progreso se perderá al cerrar la pestaña. Exporta una copia desde Ajustes si quieres conservarlo.', 'warn', 'Progreso sin guardar'));
  }
  speechNotices().forEach((n) => root.append(n));
  const stt = sttNotice();
  if (stt) root.append(stt);

  root.append(h('div', { class: 'grid grid-3' },
    h('div', { class: 'card stat' }, h('span', { class: 'num' }, icon('flame', 26), ` ${streak}`), h('span', { class: 'lbl', text: streak === 1 ? 'día de racha' : 'días de racha' })),
    h('div', { class: 'card stat' }, h('span', { class: 'num', text: String(Math.round(mins)) }), h('span', { class: 'lbl', text: 'minutos hoy' })),
    h('div', { class: 'card stat' }, h('span', { class: 'num', text: `${Math.round(Math.min(40, mins))}/40` }), h('span', { class: 'lbl', text: 'plan diario' })),
  ));

  // Plan diario
  const plan = h('section', { class: 'card', 'aria-labelledby': 'plan-h' }, h('h2', { id: 'plan-h', text: 'Tu plan de hoy (40 min)' }));
  for (const p of PLAN) {
    const done = (day?.[p.id] || 0) / 60;
    const target = PLAN_MINUTES[p.id];
    const complete = done >= target || day?.done?.[p.id];
    plan.append(h('div', { class: 'check-row' },
      h('span', { 'aria-hidden': 'true' }, icon(complete ? 'check' : 'clock', 22)),
      h('div', {},
        h('a', { href: p.href, text: `${p.label} · ${target} min` }),
        progressBar(Math.min(done, target), target, `${p.label}: ${Math.floor(done)} de ${target} minutos`)),
      h('span', { class: 'small muted', text: complete ? 'Listo' : `${Math.floor(done)}/${target}` })));
  }
  root.append(plan);

  // Recomendaciones
  const recs = h('section', { 'aria-labelledby': 'rec-h' }, h('h2', { id: 'rec-h', text: 'Recomendado para ti ahora' }));
  const grid = h('div', { class: 'grid grid-2' });

  const story = recommend(ctx, 'input', data.stories, 'story')[0];
  if (story) grid.append(recCard(`#/leer/${story.item.id}`, 'Historia', story.item.title, data.situationById[story.item.situation], story.item.difficulty, story.reason));

  const dialogue = recommend(ctx, 'convo', data.dialogues, 'dialogue')[0];
  if (dialogue) grid.append(recCard(`#/hablar/${dialogue.item.id}`, 'Conversación', dialogue.item.title, data.situationById[dialogue.item.situation], dialogue.item.difficulty, dialogue.reason));

  const today = todayStr();
  const due = Object.values(st.cards).filter((c) => isDue(c, today)).length;
  grid.append(h('a', { class: 'card list-card', href: '#/tarjetas' },
    h('div', { class: 'row' }, h('span', { class: 'sit-icon' }, icon('cards', 22)), h('div', {}, h('h3', { text: 'Tarjetas de frases' }), h('p', { class: 'muted', text: due ? `${due} para repasar hoy` : 'Empieza con frases nuevas' })))));
  grid.append(h('a', { class: 'card list-card', href: '#/shadowing' },
    h('div', { class: 'row' }, h('span', { class: 'sit-icon' }, icon('mic', 22)), h('div', {}, h('h3', { text: 'Shadowing' }), h('p', { class: 'muted', text: 'Escucha, repite y compara tu voz' })))));
  recs.append(grid);
  root.append(recs);

  root.append(h('p', { class: 'muted small', text: 'Para mantener la racha estudia al menos 5 minutos al día. El tiempo cuenta solo mientras la app está abierta y la usas.' }));
}

function recCard(href, kind, title, situation, difficulty, reason) {
  return h('a', { class: 'card list-card', href },
    h('div', { class: 'row' },
      h('span', { class: 'sit-icon' }, situationIcon(situation, 22)),
      h('div', {},
        h('p', { class: 'small muted', text: `${kind} · ${situation?.name || ''}` }),
        h('h3', { lang: 'en', text: title }),
        h('div', { class: 'meta' }, difficultyDots(difficulty), badge(reason, 'primary')))));
}
