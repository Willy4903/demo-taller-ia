// Reto rápido: práctica breve sin cuenta ni cambios en el progreso guardado.
import { h, clear } from '../util.js';
import { icon } from '../ui.js';
import { ttsSupported } from '../speech.js';

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
