// Exploración y práctica breve sin cuenta ni cambios en el progreso guardado.
import { h, clear } from '../util.js';
import { icon, difficultyDots } from '../ui.js';
import { ttsSupported } from '../speech.js';

const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function createExplorer(ctx) {
  const { data } = ctx;
  const section = h('section', { class: 'discover-section', id: 'explorar', 'aria-labelledby': 'discover-title' });
  const count = h('p', { class: 'discover-count', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
  const grid = h('div', { class: 'discover-grid', id: 'discover-results' });
  let expanded = false;
  const search = h('input', {
    id: 'discover-search', type: 'search', placeholder: '¿Qué te gustaría aprender?', autocomplete: 'off',
    'aria-controls': 'discover-results', onInput: reset,
  });
  const topic = h('select', { id: 'discover-topic', 'aria-controls': 'discover-results', onChange: reset },
    h('option', { value: '', text: 'Todos los temas' }),
    data.situations.map(item => h('option', { value: item.id, text: item.name })));
  const more = h('button', {
    type: 'button', class: 'btn btn-secondary discover-more', 'aria-controls': 'discover-results',
    'aria-expanded': 'false', onClick: () => { expanded = !expanded; draw(); },
  });
  section.append(
    h('div', { class: 'discover-heading' },
      h('div', {}, h('p', { class: 'eyebrow', text: 'EL MUNDO ES TU AULA' }), h('h2', { id: 'discover-title', text: 'Una historia para cada momento.' })),
      h('p', { text: 'Viajar, conocer a alguien, pedir un café. Empieza por lo que te mueve.' })),
    h('div', { class: 'discover-controls' },
      h('label', { class: 'discover-search', for: 'discover-search' }, h('span', { class: 'sr-only', text: 'Buscar historias' }), icon('book', 20), search),
      h('label', { class: 'discover-topic', for: 'discover-topic' }, h('span', { class: 'sr-only', text: 'Filtrar historias por tema' }), topic)),
    count, grid, more);

  function reset() { expanded = false; draw(); }
  function draw() {
    const query = normalize(search.value);
    const matches = data.stories.filter(story => {
      const situation = data.situationById[story.situation];
      const text = normalize([story.title, story.titleEs, situation?.name, situation?.desc].join(' '));
      return (!topic.value || story.situation === topic.value) && (!query || text.includes(query));
    });
    clear(grid);
    count.textContent = matches.length === 1 ? '1 historia para explorar' : `${matches.length} historias para explorar`;
    const visible = expanded ? matches : matches.slice(0, 3);
    for (const [index, story] of visible.entries()) {
      const situation = data.situationById[story.situation];
      grid.append(h('a', { class: 'discover-card', href: `#/leer/${story.id}` },
        h('div', { class: `discover-art discover-tone-${index % 4}`, 'aria-hidden': 'true' },
          icon(situation?.icon || 'book', 54), h('span', { class: 'discover-art-word', lang: 'en', text: ['Hello.', 'Let’s go.', 'Good day.', 'Explore.'][index % 4] })),
        h('div', { class: 'discover-copy' },
          h('p', { class: 'discover-category', text: situation?.name || 'Historias en inglés' }),
          h('h3', { lang: 'en', text: story.title }),
          h('p', { class: 'discover-description', text: story.titleEs }),
          h('div', { class: 'discover-meta' }, difficultyDots(story.difficulty), h('span', {}, icon('volume', 16), 'Lectura con audio'), icon('arrow', 20)))));
    }
    if (!matches.length) {
      grid.append(h('div', { class: 'discover-empty' }, icon('book', 32),
        h('h3', { text: 'Hay más historias por descubrir.' }),
        h('p', { text: 'Prueba otra palabra o vuelve a todos los temas.' }),
        h('button', { type: 'button', class: 'btn btn-secondary', text: 'Limpiar filtros', onClick: () => {
          search.value = ''; topic.value = ''; reset(); search.focus();
        } })));
    }
    more.hidden = matches.length <= 3;
    more.textContent = expanded ? 'Mostrar menos historias' : `Ver las ${matches.length} historias`;
    more.setAttribute('aria-expanded', String(expanded));
  }
  draw();
  return section;
}

const PRACTICE = [
  { phrase: 'p002', choices: ['p004', 'p002', 'p008'], explanation: '«I’m from» te ayuda a decir de dónde eres. «And you?» devuelve la pregunta.' },
  { phrase: 'p021', choices: ['p021', 'p023', 'p028'], explanation: '«I’d like» es una forma amable de pedir algo. Añade «please» para decir «por favor».' },
  { phrase: 'p009', choices: ['p007', 'p003', 'p009'], explanation: '«Could you…?» sirve para pedir ayuda con amabilidad. «Slower» significa «más despacio».' },
];

export function createQuickPractice(ctx) {
  const phrases = ctx.data.phraseById || Object.fromEntries(ctx.data.phrases.map(item => [item.id, item]));
  const questions = PRACTICE.filter(item => phrases[item.phrase] && item.choices.every(id => phrases[id]));
  const element = h('section', { class: 'quick-practice', id: 'practica-rapida', 'aria-labelledby': 'quick-title' });
  const body = h('div', { class: 'quick-body' });
  let index = 0;
  let correct = 0;
  let answered = false;
  let disposed = false;
  let stopAudio = null;
  let activeListen = null;

  element.append(h('div', { class: 'quick-heading' },
    h('p', { class: 'quick-kicker', text: 'PRUÉBALO AHORA' }),
    h('h2', { id: 'quick-title', text: 'Un minuto. Tres descubrimientos.' }),
    h('p', { text: 'No necesitas saberlo todo. Solo dar el primer paso.' })), body);

  function cancelAudio() {
    if (typeof stopAudio === 'function') stopAudio();
    stopAudio = null;
    if (activeListen?.isConnected) {
      activeListen.removeAttribute('aria-busy');
      clear(activeListen).append(icon('volume', 18), 'Escuchar de nuevo');
    }
    activeListen = null;
  }

  function draw(focus = false) {
    cancelAudio();
    answered = false;
    clear(body);
    if (index >= questions.length) { summary(focus); return; }
    const question = questions[index];
    const phrase = phrases[question.phrase];
    const top = h('div', { class: 'quick-top' },
      h('span', { class: 'quick-counter', text: `Pregunta ${index + 1} de ${questions.length}` }),
      h('span', { class: 'quick-time' }, icon('clock', 16), 'A tu ritmo'));
    const track = h('div', { class: 'quick-track', role: 'progressbar', 'aria-label': 'Avance de la práctica', 'aria-valuemin': '0', 'aria-valuemax': String(questions.length), 'aria-valuenow': String(index) });
    questions.forEach((_, n) => track.append(h('span', { class: `quick-step${n < index ? ' is-complete' : n === index ? ' is-current' : ''}`, 'aria-hidden': 'true' })));
    const title = h('h3', { class: 'quick-question', tabindex: '-1', text: '¿Qué significa esta frase?' });
    const phraseText = h('p', { class: 'quick-phrase', lang: 'en', text: phrase.en });
    const listen = h('button', { type: 'button', class: 'quick-listen btn btn-ghost', disabled: !ttsSupported || undefined,
      'aria-label': `Escuchar: ${phrase.en}`, onClick: () => {
        cancelAudio();
        activeListen = listen;
        listen.setAttribute('aria-busy', 'true');
        listen.textContent = 'Reproduciendo…';
        stopAudio = ctx.speak(phrase.en, { onEnd: ({ ok } = {}) => {
          if (disposed || !listen.isConnected) return;
          listen.removeAttribute('aria-busy');
          clear(listen).append(icon('volume', 18), 'Escuchar de nuevo');
          if (activeListen === listen) activeListen = null;
          if (ok === false && !answered) feedback.textContent = 'No se pudo reproducir el audio. Puedes continuar leyendo la frase.';
        } });
      } }, icon('volume', 18), ttsSupported ? 'Escuchar la frase' : 'Audio no disponible');
    const options = h('div', { class: 'quick-options', role: 'group', 'aria-label': 'Elige el significado en español' });
    const feedback = h('div', { class: 'quick-feedback', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
    const next = h('button', { type: 'button', class: 'btn btn-primary quick-next', hidden: true,
      onClick: () => { index++; draw(true); } }, index === questions.length - 1 ? 'Ver mi resultado' : 'Siguiente frase', icon('arrow', 18));
    for (const [optionIndex, id] of question.choices.entries()) {
      const option = h('button', { type: 'button', class: 'quick-option', onClick: () => {
        if (answered) return;
        answered = true;
        const isCorrect = id === question.phrase;
        if (isCorrect) correct++;
        option.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
        for (const button of options.querySelectorAll('button')) button.disabled = true;
        if (!isCorrect) options.children[question.choices.indexOf(question.phrase)].classList.add('is-correct');
        clear(feedback);
        feedback.className = `quick-feedback ${isCorrect ? 'is-correct' : 'is-wrong'}`;
        clear(feedback);
        feedback.append(h('strong', { text: isCorrect ? '¡Eso es!' : 'Una frase nueva para ti.' }),
          h('p', { text: isCorrect ? question.explanation : `Significa: «${phrase.es}». ${question.explanation}` }));
        next.hidden = false;
        next.focus({ preventScroll: true });
      } }, h('span', { class: 'quick-letter', 'aria-hidden': 'true', text: String.fromCharCode(65 + optionIndex) }), h('span', { text: phrases[id].es }));
      options.append(option);
    }
    body.append(top, track, title, phraseText, listen, options, feedback, next);
    if (focus) title.focus({ preventScroll: true });
  }

  function summary(focus) {
    const title = h('h3', { class: 'quick-question', tabindex: '-1', text: 'Ya diste el primer paso.' });
    body.append(h('div', { class: 'quick-summary' },
      h('span', { class: 'quick-finish-icon', 'aria-hidden': 'true' }, icon('check', 38)),
      title,
      h('p', { class: 'quick-score', text: `${correct} de ${questions.length} aciertos` }),
      h('p', { text: correct === questions.length ? 'Tres frases que ya puedes llevar a una conversación real.' : 'Cada intento cuenta. Vuelve a escuchar las frases y prueba una vez más.' }),
      h('div', { class: 'quick-actions' },
        h('a', { class: 'btn btn-primary', href: '#/leer', text: 'Seguir con una historia' }),
        h('button', { type: 'button', class: 'btn btn-secondary', text: 'Volver a practicar', onClick: () => { index = 0; correct = 0; draw(true); } }))));
    if (focus) title.focus({ preventScroll: true });
  }

  draw();
  return { element, stopAudio: cancelAudio, cleanup() { disposed = true; cancelAudio(); } };
}
