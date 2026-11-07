// Módulo 1: Escuchar y leer. Historias con audio, resaltado palabra por palabra, traducción oculta y glosario.
import { h, clear, splitWords, lookupWord, todayStr } from '../util.js';
import { icon, btn, pageHeader, backLink, difficultyDots, badge, ratingBar, notice, situationIcon } from '../ui.js';
import { situationChips, recommend, ratingLabel, speechNotices } from './common.js';
import { newCard } from '../srs.js';
import { ttsSupported, cancelSpeech } from '../speech.js';

export function render(root, ctx, params) {
  return params.id ? renderReader(root, ctx, params.id) : renderList(root, ctx);
}

// ---------------------------------------------------------------------------
// Lista
// ---------------------------------------------------------------------------

function renderList(root, ctx) {
  const { data } = ctx;
  let filter = '';
  const listEl = h('div', { class: 'grid' });
  const chipsHolder = h('div');

  function draw() {
    clear(chipsHolder).append(situationChips(data, filter, (id) => { filter = id; draw(); }));
    clear(listEl);
    const ranked = recommend(ctx, 'input', data.stories.filter((s) => !filter || s.situation === filter), 'story');
    ranked.forEach(({ item, reason }, i) => {
      const sit = data.situationById[item.situation];
      const r = ctx.store.get().ratings[`story:${item.id}`];
      const wordCount = item.sentences.map((x) => x.en).join(' ').split(/\s+/).length;
      listEl.append(h('a', { class: 'card list-card', href: `#/leer/${item.id}` },
        h('div', { class: 'row' },
          h('span', { class: 'sit-icon' }, situationIcon(sit, 22)),
          h('div', { style: 'flex:1' },
            h('p', { class: 'small muted', text: sit?.name }),
            h('h2', { lang: 'en', text: item.title }),
            h('div', { class: 'meta' },
              difficultyDots(item.difficulty), h('span', { text: `${wordCount} palabras` }),
              i < 2 && !filter ? badge('Recomendada', 'primary') : null,
              !r ? badge(reason === 'nuevo para ti' ? 'Nueva' : reason) : badge(`Tu valoración: ${ratingLabel(r.last)}`, r.last === 'hard' ? 'warn' : 'good'))))));
    });
    if (!ranked.length) listEl.append(h('p', { class: 'muted', text: 'No hay historias para esta situación todavía.' }));
  }

  root.append(pageHeader('Escuchar y leer', 'Historias cortas en inglés simple. Escucha primero, lee después y mira la traducción solo si la necesitas.'));
  speechNotices().forEach((n) => root.append(n));
  root.append(chipsHolder, listEl);
  draw();
}

// ---------------------------------------------------------------------------
// Lector
// ---------------------------------------------------------------------------

function renderReader(root, ctx, id) {
  const { data, store } = ctx;
  const story = data.storyById[id];
  if (!story) {
    root.append(backLink('#/leer', 'Todas las historias'), pageHeader('Historia no encontrada'));
    return;
  }
  const sit = data.situationById[story.situation];
  const sentences = story.sentences;
  const wordCount = sentences.map((x) => x.en).join(' ').split(/\s+/).length;

  let playing = false;
  let runToken = 0;
  let showAll = false;
  const revealed = new Set();
  let selected = null; // { el, text, lemma, es, sentenceIdx }
  const sentEls = [];
  const wordEls = []; // por oración: [{ el, start }]
  let waitTimer = null;

  // --- Controles
  const playBtn = btn('Escuchar historia', { icon: 'play', variant: 'primary', cls: 'btn-big', onClick: () => (playing ? stop() : playFrom(0)) });
  const speedOut = h('output', { for: 'speed', text: `${store.get().settings.speed.toFixed(2)}x` });
  const speed = h('input', {
    id: 'speed', type: 'range', min: '0.7', max: '1', step: '0.05', value: String(store.get().settings.speed),
    'aria-label': 'Velocidad del audio', onInput: (e) => {
      const v = Number(e.target.value);
      store.update((s) => { s.settings.speed = v; });
      speedOut.textContent = `${v.toFixed(2)}x`;
    },
  });
  const transBtn = h('button', { type: 'button', class: 'btn btn-secondary', 'aria-pressed': 'false', onClick: toggleAll }, icon('language', 20), h('span', { text: 'Traducción' }));
  const controls = h('div', { class: 'reader-controls', role: 'group', 'aria-label': 'Controles de audio y traducción' },
    ttsSupported ? playBtn : null,
    ttsSupported ? h('label', { class: 'speed', for: 'speed' }, h('span', { text: 'Velocidad' }), speed, speedOut) : null,
    transBtn);

  // --- Texto
  const textEl = h('div', { class: 'story', lang: 'en' });
  sentences.forEach((s, i) => {
    const line = h('span', { class: 'sent-text' });
    const list = [];
    for (const part of splitWords(s.en)) {
      if (!part.word) { line.append(part.text); continue; }
      const found = lookupWord(data.glossary, part.text);
      const lemma = found ? found.word : part.text.toLowerCase();
      const el = h('button', {
        type: 'button', class: 'w', dataset: { lemma }, 'aria-label': `${part.text}: ver significado`,
        onClick: () => selectWord(el, part.text, i),
      }, part.text);
      if (store.get().saved[lemma]) el.classList.add('saved');
      line.append(el);
      list.push({ el, start: part.start });
    }
    wordEls.push(list);
    const es = h('p', { class: 'sent-es', lang: 'es', hidden: true, text: s.es });
    const playOne = ttsSupported ? h('button', { type: 'button', class: 'icon-btn small', 'aria-label': `Escuchar la oración ${i + 1}`, onClick: () => playSingle(i) }, icon('volume', 18)) : null;
    const reveal = h('button', { type: 'button', class: 'icon-btn small', 'aria-label': `Mostrar traducción de la oración ${i + 1}`, 'aria-expanded': 'false', onClick: () => toggleOne(i) }, icon('language', 18));
    const el = h('div', { class: 'sent', dataset: { i: String(i) } },
      h('div', { class: 'sent-line' }, line, h('div', { class: 'sent-actions' }, playOne, reveal)), es);
    sentEls.push({ el, es, reveal });
    textEl.append(el);
  });

  const titleEs = h('p', { class: 'muted', lang: 'es', hidden: true, text: story.titleEs });
  const sheet = h('div', { class: 'word-sheet', hidden: true, role: 'region', 'aria-label': 'Significado de la palabra' });

  const doneBox = h('section', { class: 'card', 'aria-labelledby': 'rate-h' }, h('h2', { id: 'rate-h', text: 'Cuando termines' }));
  const rateHolder = h('div');
  const resultHolder = h('div', { 'aria-live': 'polite' });
  const cur = store.get().ratings[`story:${id}`];
  rateHolder.append(ratingBar({ title: '¿Qué tan difícil fue esta historia?', current: cur?.last, onRate: onRate }));
  doneBox.append(rateHolder, resultHolder);

  root.append(
    backLink('#/leer', 'Todas las historias'),
    pageHeader(story.title, `${sit?.name || ''} · ${wordCount} palabras`),
    h('div', { class: 'row', style: 'margin-bottom:.75rem' }, difficultyDots(story.difficulty), h('span', { class: 'small muted', text: 'Dificultad del contenido' })),
    titleEs, ...speechNotices(), controls,
    h('p', { class: 'muted small', text: 'Toca cualquier palabra para ver su significado y guardarla. Toca el icono de idioma de una oración para ver su traducción.' }),
    textEl, sheet, doneBox);
  root.querySelector('h1').setAttribute('lang', 'en');

  // --- Funciones
  function setPlayingUi() {
    clear(playBtn).append(icon(playing ? 'stop' : 'play', 20), h('span', { text: playing ? 'Detener' : 'Escuchar historia' }));
    playBtn.classList.toggle('btn-secondary', playing);
    playBtn.classList.toggle('btn-primary', !playing);
  }

  function markSentence(i) {
    sentEls.forEach((s, k) => s.el.classList.toggle('is-playing', k === i));
    clearWordMark();
    if (i !== null && sentEls[i]) {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      sentEls[i].el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    }
  }
  function clearWordMark() {
    root.querySelectorAll('.w.is-current').forEach((e) => e.classList.remove('is-current'));
  }
  function markWord(i, charIndex) {
    clearWordMark();
    let best = null;
    for (const w of wordEls[i]) if (w.start <= charIndex) best = w;
    if (best) best.el.classList.add('is-current');
  }

  function stop() {
    playing = false;
    runToken++;
    clearTimeout(waitTimer);
    cancelSpeech();
    markSentence(null);
    setPlayingUi();
  }

  function playFrom(start) {
    stop();
    playing = true;
    const token = ++runToken;
    setPlayingUi();
    const run = (k) => {
      if (token !== runToken) return;
      if (k >= sentences.length) { finished(); return; }
      markSentence(k);
      ctx.speak(sentences[k].en, {
        onWord: (ci) => token === runToken && markWord(k, ci),
        onEnd: ({ ok }) => {
          if (token !== runToken) return;
          if (!ok) { stop(); ctx.toast('No se pudo reproducir el audio en este navegador.'); return; }
          waitTimer = setTimeout(() => run(k + 1), 300);
        },
      });
    };
    run(start);
  }

  function playSingle(i) {
    stop();
    const token = ++runToken;
    markSentence(i);
    ctx.speak(sentences[i].en, {
      onWord: (ci) => token === runToken && markWord(i, ci),
      onEnd: () => { if (token === runToken) markSentence(null); },
    });
  }

  function finished() {
    playing = false;
    markSentence(null);
    setPlayingUi();
    store.update((s) => {
      const p = s.stories[id] || { plays: 0 };
      s.stories[id] = { plays: p.plays + 1, last: Date.now() };
    });
    ctx.announce('Terminaste de escuchar la historia. Cuéntanos qué tan difícil fue.');
    doneBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function toggleOne(i) {
    const s = sentEls[i];
    const open = s.es.hidden;
    s.es.hidden = !open;
    s.reveal.setAttribute('aria-expanded', String(open));
    if (open) revealed.add(i); else revealed.delete(i);
  }

  function toggleAll() {
    showAll = !showAll;
    transBtn.setAttribute('aria-pressed', String(showAll));
    titleEs.hidden = !showAll;
    sentEls.forEach((s, i) => {
      s.es.hidden = !(showAll || revealed.has(i));
      s.reveal.setAttribute('aria-expanded', String(!s.es.hidden));
    });
  }

  function selectWord(el, text, sentenceIdx) {
    if (selected) selected.el.classList.remove('is-selected');
    const found = lookupWord(data.glossary, text);
    const lemma = found ? found.word : text.toLowerCase().replace(/[^a-z'-]/g, '');
    selected = { el, text, lemma, es: found ? found.es : '', sentenceIdx };
    el.classList.add('is-selected');
    drawSheet();
  }

  function drawSheet() {
    clear(sheet);
    if (!selected) { sheet.hidden = true; return; }
    sheet.hidden = false;
    const isSaved = !!store.get().saved[selected.lemma];
    const shown = selected.lemma !== selected.text.toLowerCase() ? `${selected.text} (${selected.lemma})` : selected.text;
    sheet.append(
      h('div', { class: 'row between' },
        h('span', { class: 'big', lang: 'en', text: shown }),
        h('button', { type: 'button', class: 'icon-btn small', 'aria-label': 'Cerrar significado', onClick: closeSheet }, icon('x', 18))),
      selected.es ? h('p', { lang: 'es', text: selected.es }) : h('p', { class: 'muted', text: 'Sin definición local para esta palabra. Puedes buscarla en el diccionario.' }),
      h('div', { class: 'row' },
        ttsSupported ? btn('Escuchar', { icon: 'volume', onClick: () => ctx.speak(selected.text) }) : null,
        btn(isSaved ? 'Guardada (quitar)' : 'Guardar palabra', { icon: isSaved ? 'check' : 'plus', variant: isSaved ? 'secondary' : 'primary', onClick: toggleSave }),
        h('a', { class: 'btn btn-ghost', href: `https://www.wordreference.com/enes/${encodeURIComponent(selected.lemma)}`, target: '_blank', rel: 'noopener noreferrer' }, h('span', { text: 'Diccionario' }))));
  }

  function closeSheet() {
    if (selected) selected.el.classList.remove('is-selected');
    selected = null;
    drawSheet();
  }

  function toggleSave() {
    const { lemma, es, sentenceIdx } = selected;
    const today = todayStr();
    const isSaved = !!store.get().saved[lemma];
    store.update((s) => {
      if (isSaved) {
        delete s.saved[lemma];
        delete s.cards[`w:${lemma}`];
      } else {
        s.saved[lemma] = { word: lemma, es, sentence: sentences[sentenceIdx].en, sentenceEs: sentences[sentenceIdx].es, storyId: id, at: Date.now() };
        s.cards[`w:${lemma}`] = newCard(today);
      }
    });
    root.querySelectorAll('.w').forEach((e) => e.classList.toggle('saved', !!store.get().saved[e.dataset.lemma]));
    ctx.toast(isSaved ? `"${lemma}" quitada de tus palabras.` : `"${lemma}" guardada. La verás en tus tarjetas.`);
    drawSheet();
  }

  function onRate(rating) {
    stop();
    let msg = ctx.rate('input', `story:${id}`, story.difficulty, rating);
    const sp = store.get().settings.speed;
    if (rating === 'hard' && sp > 0.75) {
      store.update((s) => { s.settings.speed = 0.75; });
      msg += ' Bajé la velocidad del audio a 0.75x.';
    } else if (rating === 'easy' && sp < 1) {
      const v = Math.min(1, Math.round((sp + 0.1) * 20) / 20);
      store.update((s) => { s.settings.speed = v; });
      msg += ` Subí la velocidad del audio a ${v.toFixed(2)}x.`;
    }
    const v = store.get().settings.speed;
    speed.value = String(v);
    speedOut.textContent = `${v.toFixed(2)}x`;
    clear(rateHolder).append(ratingBar({ title: '¿Qué tan difícil fue esta historia?', current: rating, onRate }));
    clear(resultHolder).append(notice(msg, 'good'));
    if (rating === 'hard' && !showAll) {
      resultHolder.append(h('p', { text: 'Consejo: escúchala otra vez con la traducción visible y compara oración por oración.' }));
    }
    const next = recommend(ctx, 'input', data.stories.filter((s) => s.id !== id), 'story')[0];
    if (next) {
      resultHolder.append(h('a', { class: 'btn btn-primary', href: `#/leer/${next.item.id}` }, h('span', { text: `Siguiente: ${next.item.title}` }), icon('arrow', 20)));
    }
  }

  setPlayingUi();
  return () => { stop(); };
}
