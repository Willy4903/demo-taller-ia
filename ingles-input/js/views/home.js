// Inicio: descubrimiento, práctica y progreso personal.
import { h, todayStr } from '../util.js';
import { icon, progressBar, notice } from '../ui.js';
import { PLAN_MINUTES, computeStreak, dayMinutes } from '../store.js';
import { recommend, speechNotices, sttNotice } from './common.js';
import { isDue } from '../srs.js';
import { ttsSupported } from '../speech.js';
import { createExplorer, createQuickPractice } from './studio.js';

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
  const due = Object.values(st.cards).filter(c => isDue(c, todayStr())).length;
  const featured = recommend(ctx, 'input', data.stories, 'story')[0]?.item;
  const sentence = featured?.sentences[0];
  root.classList.add('home-page');
  let playing = false;
  let cancelAudio = null;
  let quick = null;
  const audioButton = h('button', { class: 'hero-play', type: 'button', disabled: !ttsSupported || !sentence || undefined, 'aria-label': 'Escuchar la frase destacada', 'aria-pressed': 'false', onClick: () => {
    if (playing) { cancelAudio?.(); setPlaying(false); return; }
    if (!sentence) return;
    quick?.stopAudio();
    setPlaying(true);
    cancelAudio = ctx.speak(sentence.en, { onEnd: ({ ok }) => {
      setPlaying(false);
      if (!ok) ctx.toast('El audio no está disponible. Puedes leer la frase y su traducción.');
    } });
  } }, icon('play', 22));
  const wave = h('span', { class: 'audio-wave', 'aria-hidden': 'true' }, Array.from({ length: 15 }, (_, i) => h('i', { style: `--wave-height:${[14,24,32,18,38,25,44,28,18,36,24,40,20,30,14][i]}px;--delay:${i * .07}s` })));
  function setPlaying(value) {
    playing = value;
    audioButton.replaceChildren(icon(value ? 'stop' : 'play', 22));
    audioButton.setAttribute('aria-label', value ? 'Detener la frase destacada' : 'Escuchar la frase destacada');
    audioButton.setAttribute('aria-pressed', String(value));
    wave.classList.toggle('is-playing', value);
  }
  const translation = h('p', { class: 'hero-translation', id: 'hero-translation', hidden: true, text: sentence?.es || '' });
  const translationButton = h('button', { class: 'text-button', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'hero-translation', onClick: () => {
    translation.hidden = !translation.hidden;
    translationButton.textContent = translation.hidden ? 'Ver traducción' : 'Ocultar traducción';
    translationButton.setAttribute('aria-expanded', String(!translation.hidden));
  }, text: 'Ver traducción' });

  root.append(h('section', { class: 'learning-hero', 'aria-labelledby': 'page-title' },
    h('div', { class: 'hero-copy' },
      h('p', { class: 'eyebrow' }, h('span', { class: 'status-dot', 'aria-hidden': 'true' }), 'PEQUEÑOS PASOS. CONEXIONES REALES.'),
      h('h1', { id: 'page-title', tabindex: '-1' }, 'Tu inglés.', h('br'), 'Tu ', h('em', { text: 'mundo.' }), h('br'), 'Sin límites.'),
      h('p', { class: 'hero-description', text: 'De entender una frase a empezar una conversación. Escucha, descubre y practica un inglés que se parece a tu vida.' }),
      h('div', { class: 'hero-actions' },
        h('a', { class: 'btn btn-primary', href: featured ? `#/leer/${featured.id}` : '#/leer' }, 'Empezar mi historia', icon('arrow', 20)),
        h('button', { class: 'btn btn-secondary', type: 'button', onClick: () => {
          const target = document.getElementById('quick-title');
          target?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
          target?.focus({ preventScroll: true });
        } }, icon('play', 18), 'Prueba un reto')),
      h('p', { class: 'hero-note' }, icon('check', 16), 'Gratis. Sin cuenta. A tu ritmo.')),
    h('div', { class: 'hero-visual' },
      h('div', { class: 'visual-label' }, icon('chat', 16), 'ENGLISH FOR REAL LIFE'),
      h('img', { class: 'conversation-art', src: 'assets/conversation.svg', alt: 'Dos personas conversan en una cafetería, entre plantas y una ventana abierta al paisaje.', width: 640, height: 500, fetchpriority: 'high' }),
      h('span', { class: 'visual-stamp', lang: 'en' }, 'Little by little.', h('strong', { text: 'Every day.' })),
      h('div', { class: 'hero-audio' },
        h('div', { class: 'audio-topline' }, h('span', { class: 'eyebrow', text: 'DALE PLAY A TU INGLÉS' }), h('span', { class: 'audio-tag', text: 'Escucha una frase' })),
        h('div', { class: 'audio-controls' }, audioButton, h('div', { class: 'audio-caption' }, h('p', { lang: 'en', text: sentence?.en || 'Hello, world!' }), wave)),
        translationButton, translation))));

  root.append(h('section', { class: 'daily-pulse', 'aria-label': 'Tu actividad de hoy' },
    h('div', { class: 'pulse-intro' }, h('span', { class: 'pulse-symbol', 'aria-hidden': 'true' }, icon('sun', 24)), h('div', {}, h('strong', { text: 'Hoy es un buen día para aprender.' }), h('p', { text: 'Cada pequeño paso cuenta.' }))),
    ...[[icon('flame', 20), String(streak), 'días de racha'], [icon('clock', 20), String(Math.round(mins)), 'minutos hoy'], [icon('cards', 20), String(due), 'tarjetas por repasar']].map(([ic, value, label]) => h('div', { class: 'pulse-stat' }, ic, h('strong', { text: value }), h('span', { text: label })))));

  root.append(h('section', { class: 'explore-section', 'aria-labelledby': 'explore-title' },
    h('div', { class: 'section-heading' }, h('div', {}, h('p', { class: 'eyebrow', text: 'ENCUENTRA TU CAMINO' }), h('h2', { id: 'explore-title', text: 'Un inglés. Muchas formas de aprender.' })), h('span', { text: 'Elige lo que te mueve hoy.' })),
    h('div', { class: 'learning-paths' }, ...[
      ['book', 'Escuchar y leer', 'Sumérgete en historias cotidianas.', '#/leer', 'coral', `${data.stories.length} historias`],
      ['mic', 'Shadowing', 'Escucha. Repite. Encuentra tu voz.', '#/shadowing', 'purple', `${data.phrases.length} frases`],
      ['cards', 'Vocabulario', 'Palabras que se quedan contigo.', '#/tarjetas', 'teal', 'Repaso a tu ritmo'],
      ['chat', 'Conversación', 'Prepárate para el próximo “hello”.', '#/hablar', 'gold', `${data.dialogues.length} conversaciones`],
    ].map(([ic, title, description, href, color, meta], i) => h('a', { class: `learning-path ${color}`, href },
      h('div', { class: 'path-art' }, h('span', { class: 'path-number', text: `0${i + 1}` }), icon(ic, 38), icon('arrow', 20)),
      h('div', { class: 'path-copy' }, h('h3', { text: title }), h('p', { text: description }), h('span', { class: 'path-meta', text: meta })))))));

  root.append(createExplorer(ctx));
  quick = createQuickPractice({ ...ctx, speak(...args) {
    cancelAudio?.();
    setPlaying(false);
    return ctx.speak(...args);
  } });
  const quickTitle = quick.element.querySelector('h2');
  if (quickTitle) quickTitle.tabIndex = -1;
  const plan = h('section', { class: 'daily-plan', 'aria-labelledby': 'plan-h' },
    h('p', { class: 'eyebrow', text: 'LA CONSTANCIA SE CONSTRUYE' }), h('h2', { id: 'plan-h', text: 'Tu plan de hoy' }),
    h('p', { class: 'muted', text: '40 minutos para acercarte a tu próxima conversación.' }));
  for (const [i, p] of PLAN.entries()) {
    const done = (day?.[p.id] || 0) / 60;
    const target = PLAN_MINUTES[p.id];
    const complete = done >= target || day?.done?.[p.id];
    plan.append(h('a', { class: `plan-step${complete ? ' is-complete' : ''}`, href: p.href },
      h('span', { class: 'step-number' }, complete ? icon('check', 18) : `0${i + 1}`),
      h('div', {}, h('strong', { text: p.label }), progressBar(Math.min(done, target), target, `${p.label}: ${Math.floor(done)} de ${target} minutos`)),
      h('span', { class: 'step-time', text: complete ? 'Listo' : `${target} min` }), icon('arrow', 18)));
  }
  root.append(h('div', { class: 'practice-layout' }, quick.element, plan));
  const support = h('div', { class: 'home-support' });
  if (!store.persistent) support.append(notice('El progreso no se puede guardar en este navegador. Exporta una copia desde Ajustes para conservarlo.', 'warn', 'Progreso sin guardar'));
  speechNotices().forEach(n => support.append(n));
  const stt = sttNotice();
  if (stt) support.append(stt);
  root.append(support);
  return () => { cancelAudio?.(); quick.cleanup(); };
}
