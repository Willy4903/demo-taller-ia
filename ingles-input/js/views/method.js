// Cómo aprender (#/metodo): la metodología de la app explicada en lenguaje sencillo.
import { h } from '../util.js';
import { icon } from '../ui.js';
import { PLAN_MINUTES, STREAK_MIN_MINUTES } from '../store.js';
import { FAIL_THRESHOLD } from '../grammar.js';
import { lastStoryId, recommend } from './common.js';

const STEPS = [
  { id: 'input', icon: 'book', title: 'Escucha y lee una historia', href: '#/leer', cta: 'Ir a las historias',
    what: 'Una historia corta de una situación real: presentarte, pedir comida, viajar, ir al médico.',
    why: 'Es la parte más importante. Entender mensajes reales es lo que hace que el idioma se quede contigo.' },
  { id: 'shadowing', icon: 'mic', title: 'Repite en voz alta (shadowing)', href: '#/shadowing', cta: 'Practicar shadowing',
    what: 'Escuchas una frase, la repites imitando el ritmo y la app te dice qué palabras salieron bien.',
    why: 'Entrena tu boca y tu oído a la vez. Así pierdes el miedo a hablar.' },
  { id: 'convo', icon: 'chat', title: 'Conversa', href: '#/hablar', cta: 'Empezar una conversación',
    what: 'Diálogos guiados: la app te dice algo y tú respondes hablando o escribiendo.',
    why: 'Pasas de entender a producir frases propias en situaciones concretas.' },
  { id: 'review', icon: 'cards', title: 'Repasa tus tarjetas', href: '#/vocabulario', cta: 'Repasar vocabulario',
    what: 'Frases y palabras que guardaste, en tarjetas que vuelven justo antes de que las olvides.',
    why: 'Cinco minutos al día bastan para que el vocabulario no se te escape.' },
];

const READING = [
  ['Escucha la historia completa', 'Dale play sin abrir la traducción. Aunque no entiendas todo, quédate con la idea general.'],
  ['Vuelve a escucharla leyendo', 'Sigue el resaltado palabra por palabra. Si una frase se te escapa, usa los botones de oración anterior y siguiente.'],
  ['Toca las palabras que no conoces', 'Verás cómo suena, su significado y podrás escucharla lenta. Guarda solo las que te parezcan útiles: tres a cinco por historia es suficiente.'],
  ['Usa la traducción como rescate', 'Ábrela por oración cuando te pierdas, no al principio. Entender por contexto es parte del aprendizaje.'],
  ['Activa la guía de pronunciación si dudas', 'Muestra sobre cada palabra cómo suena escrita en español. Úsala de apoyo y apágala cuando ya no la necesites.'],
  ['Valora la historia', 'Marca qué tan difícil fue. Con eso la app elige tu siguiente lectura.'],
];

const GRAMMAR_GROUPS = [
  ['Presente', ['Verbo to be (am, is, are)', 'Presente simple', 'Do y does en preguntas y negativas', 'Presente continuo']],
  ['Pasado', ['Pasado simple']],
  ['Futuro', ['Going to y will']],
  ['Para comunicarte', ['Can, could y should', 'I’d like y would you like', 'There is y there are', 'Preposiciones at, on, in', 'Imperativo']],
];

export function render(root, ctx) {
  const { data, store } = ctx;
  const st = store.get();
  const next = data.storyById[lastStoryId(st, data)] || recommend(ctx, 'input', data.stories, 'story')[0]?.item;
  const total = Object.values(PLAN_MINUTES).reduce((a, b) => a + b, 0);
  const section = (id, kicker, title, ...body) => h('section', { class: 'mt-sec', 'aria-labelledby': id },
    h('p', { class: 'eyebrow', text: kicker }), h('h2', { id, text: title }), ...body);

  root.append(
    h('header', { class: 'mt-hero' },
      h('p', { class: 'page-kicker', text: 'Cómo aprender' }),
      h('h1', { id: 'page-title', tabindex: '-1', text: 'Aprendes inglés entendiéndolo, no memorizando reglas.' }),
      h('p', { class: 'mt-lead', text: 'Esta app sigue el método del input comprensible: escuchas y lees mucho inglés que entiendes casi por completo. Tu cerebro descubre las palabras y la gramática a partir de mensajes reales, igual que aprendiste español. Hablar llega después y mejora con práctica.' }),
      h('div', { class: 'mt-pillars' },
        [['volume', 'Mucho input', 'Escuchar y leer es lo que más tiempo ocupa.'],
          ['sparkle', 'Casi todo se entiende', 'El texto debe ser un poco más difícil que tu nivel, nunca imposible.'],
          ['bulb', 'Gramática cuando hace falta', 'Las reglas aparecen solo si fallas varias veces lo mismo.']].map(([ic, t, d]) =>
          h('div', { class: 'mt-pillar' }, h('span', { class: 'mt-pillar-ico' }, icon(ic, 20)), h('strong', { text: t }), h('span', { text: d }))))),

    section('mt-plan-h', `Tu rutina diaria · ${total} minutos`, 'Cuatro pasos, siempre en este orden',
      h('p', { class: 'mt-p', text: 'Primero entiendes, luego imitas, después produces y al final fijas lo aprendido. Si un día tienes poco tiempo, haz al menos la lectura: es la base de todo.' }),
      h('ol', { class: 'mt-steps' }, STEPS.map((s, i) => h('li', { class: 'mt-step' },
        h('span', { class: 'mt-num', 'aria-hidden': 'true', text: String(i + 1) }),
        h('div', { class: 'mt-step-body' },
          h('div', { class: 'mt-step-top' }, h('span', { class: 'mt-step-ico' }, icon(s.icon, 18)), h('h3', { text: s.title }), h('span', { class: 'mt-min', text: `${PLAN_MINUTES[s.id]} min` })),
          h('p', { text: s.what }),
          h('p', { class: 'mt-why' }, h('span', { text: 'Por qué: ' }), s.why),
          h('a', { class: 'mt-link', href: s.href }, s.cta, icon('arrow', 16))))))),

    section('mt-read-h', 'Paso a paso', 'Cómo leer una historia',
      h('ol', { class: 'mt-read' }, READING.map(([t, d]) => h('li', {}, h('strong', { text: t }), h('span', { text: d })))),
      h('p', { class: 'mt-tip' }, icon('clock', 16), 'Empieza a 0.75x. Cuando una historia te resulte fácil, la app sube la velocidad; si te cuesta, la baja.')),

    section('mt-gram-h', 'Gramática y tiempos verbales', '¿Y la gramática?',
      h('p', { class: 'mt-p', text: 'No hay lecciones de gramática que estudiar antes de empezar. Ves cada estructura usada en las historias y las frases, y la entiendes por contexto.' }),
      h('div', { class: 'mt-flow' },
        [['Practicas', 'Cada frase de shadowing, de las tarjetas y de las conversaciones usa una estructura concreta, por ejemplo el pasado simple.'],
          ['Fallas varias veces', `Si fallas ${FAIL_THRESHOLD} veces la misma estructura, la app lo detecta. Cada acierto resta un fallo.`],
          ['Aparece la guía', 'Una explicación de tres líneas con ejemplos que puedes escuchar, justo cuando la necesitas.'],
          ['Queda guardada', 'La encuentras después en Gramática, junto con las demás guías, que puedes abrir cuando quieras.']].map(([t, d], i) =>
          h('div', { class: 'mt-flow-step' }, h('span', { class: 'mt-flow-n', text: String(i + 1) }), h('strong', { text: t }), h('span', { text: d })))),
      h('p', { class: 'mt-p', text: 'Las estructuras que trabaja la app, agrupadas por tiempo:' }),
      h('div', { class: 'mt-tenses' }, GRAMMAR_GROUPS.map(([g, items]) =>
        h('div', { class: 'mt-tense' }, h('strong', { text: g }), h('ul', {}, items.map((x) => h('li', { text: x })))))),
      h('a', { class: 'mt-link', href: '#/gramatica' }, 'Ver las guías de gramática', icon('arrow', 16))),

    section('mt-rate-h', 'Tu opinión ajusta la app', 'Valora con honestidad',
      h('div', { class: 'mt-rates' },
        [['easy', 'Muy fácil', 'La app te propone algo un poco más exigente y, en las historias, sube la velocidad del audio.'],
          ['fair', 'Justo', 'Es el punto ideal: entiendes casi todo con algo de esfuerzo. Se mantiene la dificultad.'],
          ['hard', 'Difícil', 'Te propone algo más sencillo, baja la velocidad y ese contenido vuelve más adelante para repasarlo.']].map(([k, t, d]) =>
          h('div', { class: `mt-rate ${k}` }, h('strong', { text: t }), h('span', { text: d }))))),

    section('mt-const-h', 'Constancia', 'Poco cada día vale más que mucho de vez en cuando',
      h('ul', { class: 'mt-list' },
        h('li', { text: `Tu racha suma un día cuando estudias al menos ${STREAK_MIN_MINUTES} minutos.` }),
        h('li', { text: `La meta diaria de lectura (ahora ${st.settings.dailyGoal} minutos) aparece en la barra superior. Puedes cambiarla en Ajustes.` }),
        h('li', { text: 'Repite historias. Escuchar varias veces el mismo texto es parte del método, no una pérdida de tiempo.' }),
        h('li', { text: 'Fuera de la app, busca más input a tu nivel: videos, series o podcasts en inglés sencillo sobre temas que te interesen.' }))),

    section('mt-lim-h', 'Para que sepas', 'Qué cubre esta app',
      h('p', { class: 'mt-p', text: `El contenido va desde lo básico hasta un nivel elemental (A1 a A2, con algo de B1): ${data.stories.length} historias, ${data.phrases.length} frases y ${data.dialogues.length} conversaciones. Todavía no incluye tiempos como el presente perfecto, el pasado continuo o los condicionales.` })),

    h('div', { class: 'mt-cta' },
      next ? h('a', { class: 'btn btn-primary btn-big', href: `#/leer/${next.id}` }, icon('play', 18), h('span', { text: `Empezar con «${next.title}»` })) : null,
      h('a', { class: 'btn btn-secondary btn-big', href: '#/' }, h('span', { text: 'Volver a la biblioteca' }))));
}
