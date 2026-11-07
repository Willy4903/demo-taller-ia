// Módulo 2: Shadowing frase por frase. Escuchas, grabas con el micrófono y la app compara con SpeechRecognition.
import { h, clear, append, compareSpeech } from '../util.js';
import { icon, btn, pageHeader, difficultyDots, ratingBar, diffView, progressBar, notice, badge } from '../ui.js';
import { situationChips, recommend, sttNotice, speechNotices } from './common.js';
import { sttSupported, ttsSupported, listen, describeSttError, cancelSpeech } from '../speech.js';
import { levelWord } from '../adapt.js';

const SESSION_SIZE = 6;

export function render(root, ctx) {
  const { data, store } = ctx;
  let filter = '';
  let recognizer = null;

  const holder = h('div');
  root.append(holder);

  function teardown() {
    recognizer?.stop();
    recognizer = null;
    cancelSpeech();
  }

  // -------------------------------------------------------------------------
  // Pantalla inicial
  // -------------------------------------------------------------------------
  function showStart() {
    teardown();
    clear(holder);
    const st = store.get();
    const attempts = Object.values(st.shadow);
    const avg = attempts.length ? Math.round(attempts.reduce((a, x) => a + (x.last || 0), 0) / attempts.length) : null;

    holder.append(pageHeader('Shadowing', 'Escucha una frase, repítela en voz alta y mira qué palabras salieron bien.'));
    speechNotices().forEach((n) => holder.append(n));
    const stt = sttNotice();
    if (stt) holder.append(stt);

    const chips = h('div');
    const draw = () => clear(chips).append(situationChips(data, filter, (id) => { filter = id; draw(); }));
    draw();

    holder.append(
      h('section', { class: 'card' },
        h('h2', { text: 'Sesión de práctica' }),
        h('p', { text: `${SESSION_SIZE} frases elegidas para tu nivel actual (${levelWord(st.level.shadowing)}). Si una te resulta fácil o difícil, la próxima sesión se ajusta.` }),
        attempts.length ? h('p', { class: 'muted', text: `Frases practicadas: ${attempts.length} · Coincidencia reciente: ${avg}%` }) : null,
        chips,
        btn('Empezar sesión', { icon: 'mic', variant: 'primary', cls: 'btn-big', onClick: startSession })),
      h('section', { class: 'card' },
        h('h2', { text: 'Cómo funciona' }),
        h('ol', {},
          h('li', { text: 'Escucha la frase las veces que necesites (también hay una opción lenta).' }),
          h('li', { text: 'Pulsa "Grabar", repítela imitando el ritmo y la entonación, y espera el resultado.' }),
          h('li', { text: 'Revisa el porcentaje y las palabras falladas; intenta de nuevo o sigue.' })),
        h('p', { class: 'muted small', text: 'La comparación se hace con el reconocimiento de voz del navegador, así que es una guía: puede equivocarse con acentos o ruido ambiente.' })));
  }

  // -------------------------------------------------------------------------
  // Sesión
  // -------------------------------------------------------------------------
  function startSession() {
    const pool = data.phrases.filter((p) => !filter || p.situation === filter);
    const queue = recommend(ctx, 'shadowing', pool, 'shadow').slice(0, SESSION_SIZE).map((x) => x.item);
    const results = [];
    showPhrase(queue, 0, results);
  }

  function showPhrase(queue, index, results) {
    teardown();
    clear(holder);
    if (index >= queue.length) { showSummary(queue, results); return; }
    const phrase = queue[index];
    const sit = data.situationById[phrase.situation];
    let lastResult = null;
    let attemptsHere = 0;
    let esShown = false;

    const resultBox = h('div', { 'aria-live': 'polite' });
    const rateBox = h('div');
    const transcript = h('div', { class: 'transcript', 'aria-live': 'polite', lang: 'en' });
    const status = h('p', { class: 'muted center', 'aria-live': 'polite' });
    const esLine = h('p', { class: 'phrase-es', lang: 'es', hidden: true, text: phrase.es });
    const esBtn = h('button', { type: 'button', class: 'btn btn-ghost', 'aria-expanded': 'false', onClick: () => {
      esShown = !esShown;
      esLine.hidden = !esShown;
      esBtn.setAttribute('aria-expanded', String(esShown));
      clear(esBtn).append(icon('eye', 18), h('span', { text: esShown ? 'Ocultar significado' : 'Ver significado' }));
    } }, icon('eye', 18), h('span', { text: 'Ver significado' }));

    const recBtn = btn('Grabar mi voz', { icon: 'mic', variant: 'primary', cls: 'btn-big', onClick: toggleRecord });
    let recording = false;

    function setRecording(on) {
      recording = on;
      clear(recBtn).append(icon(on ? 'stop' : 'mic', 22), h('span', { text: on ? 'Detener' : (attemptsHere ? 'Grabar otra vez' : 'Grabar mi voz') }));
      recBtn.classList.toggle('is-recording', on);
      recBtn.setAttribute('aria-pressed', String(on));
    }

    function toggleRecord() {
      if (recording) { recognizer?.stop(); return; }
      clear(transcript);
      status.textContent = 'Preparando el micrófono…';
      setRecording(true);
      recognizer = listen({
        lang: 'en-US',
        onStart: () => { status.textContent = 'Te escucho. Di la frase completa.'; },
        onInterim: (t) => { transcript.textContent = t; },
        onDone: ({ text, error }) => {
          recognizer = null;
          setRecording(false);
          status.textContent = '';
          if (!text) {
            const msg = error && error !== 'no-speech' ? describeSttError(error) : 'No se entendió nada. Habla un poco más fuerte y cerca del micrófono.';
            clear(resultBox).append(notice(msg, 'warn'));
            return;
          }
          transcript.textContent = text;
          evaluate(text);
        },
      });
    }

    function evaluate(spoken) {
      attemptsHere++;
      lastResult = compareSpeech(phrase.en, spoken);
      const pct = lastResult.percent;
      const cls = pct >= 85 ? 'good' : pct >= 60 ? 'mid' : 'low';
      const label = pct >= 85 ? 'Muy bien' : pct >= 60 ? 'Casi, vuelve a intentarlo' : 'Escucha otra vez e inténtalo de nuevo';
      clear(resultBox).append(
        h('div', { class: `card score ${cls}` },
          h('div', { class: 'pct', text: `${pct}%` }),
          h('p', { class: 'model', text: label }),
          diffView(lastResult),
          lastResult.missed.length
            ? h('div', {},
              h('p', { text: `Palabras falladas (${lastResult.missed.length}): toca una para escucharla.` }),
              h('div', { class: 'row', style: 'justify-content:center' }, lastResult.missed.map((w) => h('button', { type: 'button', class: 'chip', lang: 'en', onClick: () => ctx.speak(w, { rate: 0.7 }) }, w))))
            : h('p', { class: 'muted', text: 'No faltó ninguna palabra.' }),
          lastResult.extra.length ? h('p', { class: 'muted small', text: `Palabras de más que se escucharon: ${lastResult.extra.join(', ')}` }) : null));
      store.update((s) => {
        const prev = s.shadow[phrase.id] || { best: 0, attempts: 0 };
        s.shadow[phrase.id] = { best: Math.max(prev.best, pct), attempts: prev.attempts + 1, last: pct, at: Date.now() };
      });
      ctx.announce(`Coincidencia ${pct} por ciento.`);
      if (pct < 70) ctx.grammar(phrase.grammar, false, resultBox);
      else if (pct >= 85) ctx.grammar(phrase.grammar, true, resultBox);
      drawRating();
      setRecording(recording);
    }

    function drawRating() {
      clear(rateBox).append(ratingBar({
        title: '¿Qué tan difícil te resultó esta frase?',
        onRate: (rating) => {
          ctx.rate('shadowing', `shadow:${phrase.id}`, phrase.difficulty, rating);
          results.push({ phrase, percent: lastResult?.percent ?? 0, missed: lastResult?.missed ?? [], rating });
          showPhrase(queue, index + 1, results);
        },
      }));
    }

    const typed = !sttSupported
      ? h('form', { class: 'stack', onSubmit: (e) => {
        e.preventDefault();
        const v = new FormData(e.target).get('said');
        if (String(v).trim()) { transcript.textContent = String(v); evaluate(String(v)); }
      } },
      h('div', { class: 'field' },
        h('label', { for: 'said', text: 'Sin micrófono: di la frase en voz alta y luego escríbela de memoria' }),
        h('input', { id: 'said', name: 'said', type: 'text', lang: 'en', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' })),
      btn('Comparar', { variant: 'primary', type: 'submit' }))
      : null;

    append(holder,
      h('div', { class: 'row between' }, h('h1', { id: 'page-title', tabindex: '-1', text: 'Shadowing' }), h('button', { type: 'button', class: 'btn btn-ghost', onClick: showStart }, icon('x', 18), h('span', { text: 'Terminar' }))),
      h('p', { class: 'muted', text: `Frase ${index + 1} de ${queue.length} · ${sit?.name || ''}` }),
      progressBar(index, queue.length, `Avance: ${index} de ${queue.length} frases`),
      h('section', { class: 'card phrase-box', 'aria-label': 'Frase para practicar' },
        h('p', { class: 'phrase-en', lang: 'en', text: phrase.en }),
        esLine,
        h('div', { class: 'row', style: 'justify-content:center' }, difficultyDots(phrase.difficulty), badge(sit?.name || ''), esBtn)),
      ttsSupported ? h('div', { class: 'row', style: 'justify-content:center;margin-bottom:1rem' },
        btn('Escuchar', { icon: 'volume', onClick: () => ctx.speak(phrase.en) }),
        btn('Escuchar lento', { icon: 'volume', onClick: () => ctx.speak(phrase.en, { rate: 0.7 }) })) : null,
      sttSupported ? h('div', { class: 'center' }, recBtn) : null,
      typed,
      status, transcript, resultBox, rateBox,
      h('div', { class: 'center' }, h('button', { type: 'button', class: 'btn btn-ghost', onClick: () => showPhrase(queue, index + 1, results) }, h('span', { text: 'Saltar esta frase' }))));
    holder.querySelector('h1').focus({ preventScroll: true });
    setRecording(false);
  }

  function showSummary(queue, results) {
    clear(holder);
    const done = results.filter((r) => r.percent > 0 || r.rating);
    const avg = done.length ? Math.round(done.reduce((a, r) => a + r.percent, 0) / done.length) : 0;
    const missedAll = [...new Set(results.flatMap((r) => r.missed.map((w) => w.toLowerCase())))];
    holder.append(
      pageHeader('Sesión terminada', done.length ? `Practicaste ${done.length} ${done.length === 1 ? 'frase' : 'frases'}.` : 'No practicaste ninguna frase esta vez.'),
      h('section', { class: 'card' },
        h('div', { class: 'stat' }, h('span', { class: 'num', text: `${avg}%` }), h('span', { class: 'lbl', text: 'coincidencia promedio' })),
        missedAll.length ? h('div', {}, h('h2', { text: 'Palabras para repasar' }), h('div', { class: 'row' }, missedAll.map((w) => h('button', { type: 'button', class: 'chip', lang: 'en', onClick: () => ctx.speak(w, { rate: 0.7 }) }, w)))) : h('p', { class: 'muted', text: 'No quedaron palabras falladas. Buen trabajo.' })),
      h('div', { class: 'row' },
        btn('Otra sesión', { icon: 'refresh', variant: 'primary', onClick: startSession }),
        h('a', { class: 'btn btn-secondary', href: '#/progreso', text: 'Ver progreso' }),
        btn('Volver', { onClick: showStart })));
  }

  showStart();
  return teardown;
}
