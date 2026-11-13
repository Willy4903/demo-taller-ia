// Biblioteca (#/): continúa tu lectura, historias con filtros, actividad semanal, palabras nuevas y plan del día.
import { h, todayStr, addDays } from '../util.js';
import { icon, progressBar, notice } from '../ui.js';
import { PLAN_MINUTES, dayMinutes } from '../store.js';
import { recommend, speechNotices, sttNotice, storyProgress, lastStoryId, wordsIn } from './common.js';
import { isDue, isLearned } from '../srs.js';
import { createQuickPractice } from './studio.js';
import { libraryBrowser, storyCover, levelBadge } from './library.js';

export const PLAN = [
  { id: 'input', label: 'Escuchar y leer', href: '#/leer' },
  { id: 'shadowing', label: 'Shadowing', href: '#/shadowing' },
  { id: 'convo', label: 'Conversación', href: '#/hablar' },
  { id: 'review', label: 'Repaso de tarjetas', href: '#/vocabulario' },
];

const DAY_LETTERS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

export function render(root, ctx) {
  const { data, store } = ctx;
  const st = store.get();
  const today = todayStr();
  root.classList.add('page-dash');

  // --- Continúa tu lectura
  const lastId = lastStoryId(st, data);
  const story = data.storyById[lastId] || recommend(ctx, 'input', data.stories, 'story')[0]?.item;
  const prog = storyProgress(st, story);
  const remainingWords = Math.round(wordsIn(story) * (1 - prog.pct / 100));
  const remainingMin = Math.max(1, Math.round(remainingWords / 120));
  const started = prog.state === 'reading';
  const sit = data.situationById[story.situation];
  const banner = h('section', { class: 'continue', 'aria-labelledby': 'cont-h' },
    h('div', { class: 'continue-copy' },
      h('p', { class: 'eyebrow', text: started ? 'Sigue leyendo' : prog.state === 'done' ? 'Vuelve a escuchar' : 'Tu próxima historia' }),
      h('h2', { id: 'cont-h', lang: 'en', text: story.title }),
      h('p', { class: 'continue-es', text: `${story.titleEs} · ${sit?.name || ''}` }),
      h('div', { class: 'continue-meta' },
        levelBadge(story.difficulty),
        h('span', {}, icon('clock', 16), started ? `Te quedan ${remainingMin} min` : `${Math.max(1, Math.round(wordsIn(story) / 120))} min de lectura`),
        h('span', {}, icon('book', 16), `Oración ${Math.min(prog.pos + 1, prog.total)} de ${prog.total}`)),
      h('div', { class: 'continue-progress' },
        progressBar(prog.pct, 100, `Avance de ${story.title}: ${prog.pct}%`), h('strong', { text: `${prog.pct}%` })),
      h('a', { class: 'btn btn-primary btn-big', href: `#/leer/${story.id}` }, icon('play', 18), h('span', { text: started ? 'Continuar lectura' : 'Leer ahora' }))),
    h('a', { class: 'continue-art', href: `#/leer/${story.id}`, tabindex: '-1', 'aria-hidden': 'true' }, storyCover(story, sit, { large: true })));

  // --- Columna lateral
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i);
    const date = new Date(`${d}T12:00:00`);
    week.push({ d, label: DAY_LETTERS[date.getDay()], min: Math.round(dayMinutes(st.days[d])) });
  }
  const maxMin = Math.max(10, ...week.map((x) => x.min));
  const weekTotal = week.reduce((a, x) => a + x.min, 0);
  const activity = h('section', { class: 'panel', 'aria-labelledby': 'act-h' },
    h('div', { class: 'panel-head' }, h('h2', { id: 'act-h', text: 'Actividad semanal' }), h('a', { href: '#/progreso', class: 'panel-link', 'aria-label': 'Ver tu progreso' }, icon('chevR', 18))),
    h('p', { class: 'panel-sub', text: `${weekTotal} minutos esta semana` }),
    h('div', { class: 'bars7', role: 'img', 'aria-label': `Minutos estudiados por día: ${week.map((x) => `${x.label} ${x.min}`).join(', ')}` },
      week.map((x) => h('div', { class: `b7${x.d === today ? ' today' : ''}`, 'aria-hidden': 'true' },
        h('span', { class: 'b7-val', text: x.min ? String(x.min) : '' }),
        h('span', { class: 'b7-bar', style: `--v:${(x.min / maxMin).toFixed(3)}` }),
        h('span', { class: 'b7-lbl', text: x.label })))));

  const saved = Object.values(st.saved);
  const weekAgo = Date.now() - 7 * 86400000;
  const newThisWeek = saved.filter((w) => w.at >= weekAgo).length;
  const learned = Object.entries(st.cards).filter(([id, c]) => id.startsWith('w:') && isLearned(c)).length;
  const due = Object.values(st.cards).filter((c) => isDue(c, today)).length;
  const words = h('section', { class: 'panel', 'aria-labelledby': 'words-h' },
    h('div', { class: 'panel-head' }, h('h2', { id: 'words-h', text: 'Palabras nuevas' }), h('span', { class: 'delta', text: `+${newThisWeek} esta semana` })),
    h('div', { class: 'kpis' },
      h('div', {}, h('strong', { class: 'kpi-cyan', text: String(saved.length) }), h('span', { text: 'guardadas' })),
      h('div', {}, h('strong', { class: 'kpi-green', text: String(learned) }), h('span', { text: 'dominadas' })),
      h('div', {}, h('strong', { class: 'kpi-violet', text: String(due) }), h('span', { text: 'por repasar' }))),
    saved.length ? h('div', { class: 'word-chips', lang: 'en' }, saved.sort((a, b) => b.at - a.at).slice(0, 6).map((w) => h('span', { class: 'wchip', text: w.word }))) : h('p', { class: 'panel-sub', text: 'Toca una palabra mientras lees y guárdala: aparecerá aquí.' }),
    h('a', { class: 'btn btn-primary btn-block', href: '#/vocabulario' }, icon('cards', 18), h('span', { text: due ? `Repasar vocabulario (${due})` : 'Ir a vocabulario' })));

  const day = st.days[today];
  const plan = h('section', { class: 'panel daily-plan', 'aria-labelledby': 'plan-h' },
    h('div', { class: 'panel-head' }, h('h2', { id: 'plan-h', text: 'Tu plan de hoy' })),
    h('p', { class: 'panel-sub', text: '40 minutos para acercarte a tu próxima conversación.' }));
  for (const p of PLAN) {
    const done = (day?.[p.id] || 0) / 60;
    const target = PLAN_MINUTES[p.id];
    const complete = done >= target || day?.done?.[p.id];
    plan.append(h('a', { class: `plan-step${complete ? ' is-complete' : ''}`, href: p.href },
      h('span', { class: 'step-dot', 'aria-hidden': 'true' }, complete ? icon('check', 14) : null),
      h('div', {}, h('strong', { text: p.label }), progressBar(Math.min(done, target), target, `${p.label}: ${Math.floor(done)} de ${target} minutos`)),
      h('span', { class: 'step-time', text: complete ? 'Listo' : `${target} min` })));
  }

  const practice = h('section', { class: 'panel', 'aria-labelledby': 'prac-h' },
    h('div', { class: 'panel-head' }, h('h2', { id: 'prac-h', text: 'Practica' })),
    h('div', { class: 'quick-links' },
      [['mic', 'Shadowing', 'Escucha y repite', '#/shadowing', `${data.phrases.length} frases`],
        ['chat', 'Conversación', 'Diálogos guiados', '#/hablar', `${data.dialogues.length} diálogos`],
        ['chart', 'Progreso', 'Tu racha y niveles', '#/progreso', '']].map(([ic, t, d, href, meta]) =>
        h('a', { class: 'qlink', href }, h('span', { class: 'qlink-ico' }, icon(ic, 18)), h('span', {}, h('strong', { text: t }), h('small', { text: meta ? `${d} · ${meta}` : d })), icon('chevR', 16)))));

  const method = h('a', { class: 'method-card', href: '#/metodo' },
    h('span', { class: 'method-ico', 'aria-hidden': 'true' }, icon('sparkle', 20)),
    h('span', {}, h('strong', { text: '¿Cómo se aprende aquí?' }), h('small', { text: 'El método explicado en 3 minutos' })),
    icon('chevR', 18));

  // --- Reto rápido
  const quick = createQuickPractice(ctx);

  const support = h('div', { class: 'dash-notices' });
  if (!store.persistent) support.append(notice('El progreso no se puede guardar en este navegador. Exporta una copia desde Ajustes para conservarlo.', 'warn', 'Progreso sin guardar'));
  speechNotices().forEach((n) => support.append(n));
  const stt = sttNotice();
  if (stt) support.append(stt);

  root.append(
    h('header', { class: 'dash-hello' },
      h('h1', { id: 'page-title', tabindex: '-1' }, '¡Hola! ', h('span', { text: started ? 'Continúa tu lectura de hoy' : 'Elige tu lectura de hoy' }))),
    support,
    h('div', { class: 'dash' },
      h('div', { class: 'dash-main' }, banner, libraryBrowser(ctx), quick.element),
      h('aside', { class: 'dash-side', 'aria-label': 'Resumen de tu aprendizaje' }, method, activity, words, plan, practice)));

  return () => quick.cleanup();
}
