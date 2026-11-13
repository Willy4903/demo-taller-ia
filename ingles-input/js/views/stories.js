// Módulo 1: Escuchar y leer. Historias con audio, resaltado palabra por palabra, traducción oculta y glosario.
import { h, clear, splitWords, lookupWord, lookupPronunciation, todayStr } from '../util.js';
import { icon, pageHeader, backLink, difficultyDots, badge, ratingBar, notice, situationIcon } from '../ui.js';
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
// Lector inmersivo: palabras interactivas, guía fonética, tarjeta de pronunciación y reproductor flotante
// ---------------------------------------------------------------------------

const SPEEDS = [0.75, 1, 1.25];
const SLOW_RATE = 0.65;
const nearestSpeed = (v) => SPEEDS.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a), 1);
const fmtSpeed = (v) => `${Number.isInteger(v) ? v.toFixed(1) : String(v)}x`;

function renderReader(root, ctx, id) {
  const { data, store } = ctx;
  const story = data.storyById[id];
  if (!story) {
    root.append(backLink('#/leer', 'Todas las historias'), pageHeader('Historia no encontrada'));
    return;
  }
  const sit = data.situationById[story.situation];
  const sentences = story.sentences;
  const pron = data.pronunciation || {};
  const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  document.body.classList.add('reader-immersive');
  root.classList.add('rd');

  // --- Estado
  let playing = false;
  let runToken = 0;
  let resumeAt = 0; // oración desde la que se reanuda tras pausar
  let paused = false;
  let currentSentence = -1;
  let rate = nearestSpeed(store.get().settings.speed);
  let showAll = false;
  let phonetics = !!store.get().settings.phonetics;
  const revealed = new Set();
  const sentEls = [];
  const wordEls = []; // por oración: [{ el, start, g }] (g = índice global de palabra)
  const allWords = [];
  let waitTimer = null;

  // --- Cabecera
  const wordCount = sentences.map((x) => x.en).join(' ').split(/\s+/).length;
  const minutes = Math.max(1, Math.round(wordCount / 120));
  const titleEs = h('p', { class: 'rd-title-es', lang: 'es', hidden: true, text: story.titleEs });
  const hero = h('header', { class: 'rd-hero' },
    backLink('#/leer', 'Todas las historias'),
    h('div', { class: 'rd-kicker' },
      h('span', { class: 'rd-sit' }, situationIcon(sit, 16), h('span', { text: sit?.name || 'Historia' })),
      h('span', { class: 'rd-meta', text: `${wordCount} palabras · ${minutes} min` }),
      difficultyDots(story.difficulty)),
    h('h1', { id: 'page-title', tabindex: '-1', lang: 'en', text: story.title }),
    titleEs);

  // --- Barra superior: guía fonética y traducción
  const phonSwitch = h('button', {
    type: 'button', class: 'rd-switch', role: 'switch', 'aria-checked': String(phonetics), onClick: togglePhonetics,
  }, h('span', { class: 'rd-switch-track', 'aria-hidden': 'true' }, h('span', { class: 'rd-switch-thumb' })), h('span', { text: 'Ver pronunciación' }));
  const transBtn = h('button', { type: 'button', class: 'rd-pill', 'aria-pressed': 'false', onClick: toggleAll }, icon('language', 18), h('span', { text: 'Traducción' }));
  const toolbar = h('div', { class: 'rd-toolbar', role: 'group', 'aria-label': 'Opciones de lectura' },
    phonSwitch, transBtn, h('span', { class: 'rd-hint', text: 'Toca una palabra para escucharla' }));

  // --- Texto
  const textEl = h('div', { class: 'story rd-text', lang: 'en' });
  sentences.forEach((s, i) => {
    const line = h('span', { class: 'sent-text' });
    const list = [];
    // Cada palabra va en un grupo sin salto de línea junto con su puntuación pegada ("lunch." o "“Would").
    let lastWrap = null;
    let prefix = '';
    for (const part of splitWords(s.en)) {
      if (!part.word) {
        const m = /^(\S*)([\s\S]*?)(\S*)$/.exec(part.text);
        const [, lead, gap, tail] = m;
        if (lead) { if (lastWrap) lastWrap.append(lead); else if (!gap) prefix += lead; else line.append(lead); }
        if (gap) line.append(gap);
        if (tail) prefix += tail;
        continue;
      }
      const found = lookupWord(data.glossary, part.text);
      const lemma = found ? found.word : part.text.toLowerCase();
      const p = lookupPronunciation(pron, part.text);
      const el = h('span', {
        class: 'word-token', role: 'button', tabindex: '0', dataset: { lemma }, 'aria-haspopup': 'dialog',
        'aria-label': `${part.text}: ver pronunciación y significado`,
        onClick: () => openPop(el, part.text, i),
        onKeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPop(el, part.text, i); } },
      }, h('ruby', {}, part.text, h('rt', { 'aria-hidden': 'true', text: p ? p.es : '' })));
      if (store.get().saved[lemma]) el.classList.add('saved');
      lastWrap = h('span', { class: 'wt-wrap' }, prefix || null, el);
      prefix = '';
      line.append(lastWrap);
      const w = { el, start: part.start, g: allWords.length, len: part.text.length };
      list.push(w);
      allWords.push(w);
    }
    wordEls.push(list);
    const es = h('p', { class: 'sent-es', lang: 'es', hidden: true, text: s.es });
    const playOne = ttsSupported ? h('button', { type: 'button', class: 'rd-mini', 'aria-label': `Escuchar la oración ${i + 1}`, onClick: () => playSingle(i) }, icon('volume', 16)) : null;
    const reveal = h('button', { type: 'button', class: 'rd-mini', 'aria-label': `Mostrar traducción de la oración ${i + 1}`, 'aria-expanded': 'false', onClick: () => toggleOne(i) }, icon('language', 16));
    const el = h('div', { class: 'sent', dataset: { i: String(i) } },
      h('div', { class: 'sent-line' }, line, h('div', { class: 'sent-actions' }, playOne, reveal)), es);
    sentEls.push({ el, es, reveal });
    textEl.append(el);
  });
  const card = h('article', { class: 'rd-card', 'aria-labelledby': 'page-title' }, textEl);

  // --- Valoración final
  const doneBox = h('section', { class: 'rd-done', 'aria-labelledby': 'rate-h' }, h('h2', { id: 'rate-h', text: 'Cuando termines' }));
  const rateHolder = h('div');
  const resultHolder = h('div', { 'aria-live': 'polite' });
  rateHolder.append(ratingBar({ title: '¿Qué tan difícil fue esta historia?', current: store.get().ratings[`story:${id}`]?.last, onRate }));
  doneBox.append(rateHolder, resultHolder);

  // --- Reproductor flotante
  const playBtn = h('button', { type: 'button', class: 'rd-play', onClick: () => (playing ? pause() : playFrom(resumeAt)) });
  const nowEl = h('p', { class: 'rd-now', 'aria-live': 'off' });
  const bars = h('div', { class: 'rd-bars', 'aria-hidden': 'true' });
  allWords.forEach((w, k) => {
    const v = 0.28 + Math.min(1, w.len / 9) * 0.5 + (((k * 37) % 11) / 11) * 0.22; // altura estable y variada
    w.bar = h('span', { class: 'rd-bar', style: `--h:${Math.min(1, v).toFixed(2)}` });
    bars.append(w.bar);
  });
  const wave = h('div', {
    class: 'rd-wave', role: 'slider', tabindex: '0', 'aria-label': 'Progreso de la historia',
    'aria-valuemin': '1', 'aria-valuemax': String(sentences.length), 'aria-valuenow': '1',
    onClick: (e) => {
      const r = wave.getBoundingClientRect();
      const g = Math.min(allWords.length - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * allWords.length)));
      seek(wordEls.findIndex((list) => list.some((w) => w.g === g)));
    },
    onKeydown: (e) => {
      const at = Math.max(0, currentSentence >= 0 ? currentSentence : resumeAt);
      const to = { ArrowRight: at + 1, ArrowUp: at + 1, ArrowLeft: at - 1, ArrowDown: at - 1, Home: 0, End: sentences.length - 1 }[e.key];
      if (to === undefined) return;
      e.preventDefault();
      seek(Math.min(sentences.length - 1, Math.max(0, to)));
    },
  }, bars);
  const speedGroup = h('div', { class: 'rd-speed', role: 'radiogroup', 'aria-label': 'Velocidad de lectura' });
  const speedBtns = SPEEDS.map((v) => {
    const b = h('button', { type: 'button', role: 'radio', 'aria-checked': String(v === rate), dataset: { v: String(v) }, onClick: () => setRate(v), text: fmtSpeed(v) });
    speedGroup.append(b);
    return b;
  });
  const player = h('div', { class: 'rd-player', role: 'region', 'aria-label': 'Reproductor de la historia' },
    playBtn,
    h('div', { class: 'rd-info' }, h('p', { class: 'rd-ptitle', lang: 'en', text: story.title }), nowEl),
    wave, speedGroup);

  // --- Tarjeta flotante de pronunciación
  const pop = h('div', { class: ttsSupported ? 'word-pop' : 'word-pop no-player', role: 'dialog', 'aria-modal': 'false', hidden: true });
  let sel = null; // { el, text, lemma, es, sentenceIdx }

  root.append(hero, ...speechNotices(), toolbar, card, doneBox, ttsSupported ? player : null);
  document.body.append(pop);
  if (!ttsSupported) root.classList.add('rd-no-audio');
  applyPhonetics();
  setPlayingUi();
  updateProgress(-1);

  // ------------------------------------------------------------ Guía fonética y traducciones
  function applyPhonetics() {
    root.classList.toggle('show-phon', phonetics);
    phonSwitch.setAttribute('aria-checked', String(phonetics));
  }
  function togglePhonetics() {
    phonetics = !phonetics;
    store.update((s) => { s.settings.phonetics = phonetics; });
    applyPhonetics();
    if (sel) placePop();
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

  // ------------------------------------------------------------ Reproducción
  function setPlayingUi() {
    clear(playBtn).append(icon(playing ? 'pause' : 'play', 26));
    playBtn.setAttribute('aria-label', playing ? 'Pausar' : (paused ? 'Continuar historia' : 'Escuchar historia'));
    player.classList.toggle('is-playing', playing);
  }
  function updateProgress(g) {
    allWords.forEach((w) => {
      w.bar.classList.toggle('done', w.g < g);
      w.bar.classList.toggle('now', w.g === g);
    });
    const at = currentSentence >= 0 ? currentSentence : resumeAt;
    nowEl.textContent = `Oración ${at + 1} de ${sentences.length}`;
    wave.setAttribute('aria-valuenow', String(at + 1));
    wave.setAttribute('aria-valuetext', `Oración ${at + 1} de ${sentences.length}`);
  }
  function clearWordMark() {
    root.querySelectorAll('.word-token.is-current').forEach((e) => e.classList.remove('is-current'));
  }
  function markSentence(i) {
    currentSentence = i ?? -1;
    sentEls.forEach((s, k) => s.el.classList.toggle('is-playing', k === i));
    clearWordMark();
    if (i !== null && sentEls[i]) {
      updateProgress(wordEls[i][0]?.g ?? -1);
      sentEls[i].el.scrollIntoView({ block: 'center', behavior: reduceMotion() ? 'auto' : 'smooth' });
    }
  }
  function markWord(i, charIndex) {
    clearWordMark();
    let best = null;
    for (const w of wordEls[i]) if (w.start <= charIndex) best = w;
    if (best) { best.el.classList.add('is-current'); updateProgress(best.g); }
  }
  function halt() {
    playing = false;
    runToken++;
    clearTimeout(waitTimer);
    cancelSpeech();
  }
  function pause() {
    if (currentSentence >= 0) resumeAt = currentSentence;
    paused = playing || paused;
    halt();
    markSentence(null);
    setPlayingUi();
    updateProgress(wordEls[resumeAt][0]?.g ?? -1);
  }
  function playFrom(start) {
    halt();
    closePop();
    playing = true;
    const token = ++runToken;
    setPlayingUi();
    const run = (k) => {
      if (token !== runToken) return;
      if (k >= sentences.length) { finished(); return; }
      markSentence(k);
      ctx.speak(sentences[k].en, {
        rate,
        onWord: (ci) => token === runToken && markWord(k, ci),
        onEnd: ({ ok }) => {
          if (token !== runToken) return;
          if (!ok) { pause(); ctx.toast('No se pudo reproducir el audio en este navegador.'); return; }
          waitTimer = setTimeout(() => run(k + 1), 300);
        },
      });
    };
    run(start);
  }
  function playSingle(i) {
    halt();
    setPlayingUi();
    const token = ++runToken;
    markSentence(i);
    ctx.speak(sentences[i].en, {
      rate,
      onWord: (ci) => token === runToken && markWord(i, ci),
      onEnd: () => { if (token === runToken) { markSentence(null); updateProgress(-1); } },
    });
  }
  function seek(i) {
    if (i < 0) return;
    resumeAt = i;
    if (playing) playFrom(i);
    else { paused = i > 0; updateProgress(wordEls[i][0]?.g ?? -1); setPlayingUi(); }
  }
  function setRate(v) {
    rate = v;
    store.update((s) => { s.settings.speed = v; });
    speedBtns.forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.v) === v)));
    if (playing) playFrom(currentSentence >= 0 ? currentSentence : resumeAt);
    else updateProgress(-1);
  }
  function finished() {
    playing = false;
    paused = false;
    resumeAt = 0;
    markSentence(null);
    setPlayingUi();
    updateProgress(allWords.length);
    store.update((s) => {
      const p = s.stories[id] || { plays: 0 };
      s.stories[id] = { plays: p.plays + 1, last: Date.now() };
    });
    ctx.announce('Terminaste de escuchar la historia. Cuéntanos qué tan difícil fue.');
    doneBox.scrollIntoView({ block: 'nearest', behavior: reduceMotion() ? 'auto' : 'smooth' });
  }

  // ------------------------------------------------------------ Tarjeta de pronunciación
  function openPop(el, text, sentenceIdx) {
    if (sel?.el === el && !pop.hidden) { closePop(); return; }
    if (sel) sel.el.classList.remove('is-selected');
    const found = lookupWord(data.glossary, text);
    const lemma = found ? found.word : text.toLowerCase().replace(/[^a-z'-]/g, '');
    sel = { el, text, lemma, es: found ? found.es : '', sentenceIdx, p: lookupPronunciation(pron, text) };
    el.classList.add('is-selected');
    el.setAttribute('aria-expanded', 'true');
    drawPop();
    pop.hidden = false;
    placePop();
    pop.classList.remove('is-in');
    void pop.offsetWidth; // reinicia la animación de entrada
    pop.classList.add('is-in');
    pop.querySelector('.wp-act')?.focus({ preventScroll: true });
  }
  function drawPop() {
    clear(pop);
    const { text, lemma, es, p } = sel;
    const isSaved = !!store.get().saved[lemma];
    pop.setAttribute('aria-label', `Pronunciación de ${text}`);
    const saveBtn = h('button', { type: 'button', class: `wp-save${isSaved ? ' is-saved' : ''}`, 'aria-pressed': String(isSaved), onClick: () => toggleSave(saveBtn) },
      icon(isSaved ? 'check' : 'bookmark', 18), h('span', { text: isSaved ? 'Guardada' : 'Guardar' }));
    pop.append(h('div', { class: 'wp-inner' },
      h('div', { class: 'wp-head' },
        h('div', {},
          h('p', { class: 'wp-word', lang: 'en', text }),
          lemma !== text.toLowerCase() ? h('p', { class: 'wp-lemma', text: `Forma base: ${lemma}` }) : null),
        h('button', { type: 'button', class: 'wp-close', 'aria-label': 'Cerrar', onClick: () => closePop(true) }, icon('x', 18))),
      p ? h('div', { class: 'wp-pron' },
        h('span', { class: 'wp-ipa', lang: 'en', title: 'Transcripción fonética (IPA)', text: p.ipa }),
        h('span', { class: 'wp-es', title: 'Cómo suena, escrito en español', text: p.es })) : null,
      h('p', { class: es ? 'wp-tr' : 'wp-tr muted', lang: 'es', text: es || 'Sin traducción local para esta palabra.' }),
      ttsSupported ? h('div', { class: 'wp-audio' },
        h('button', { type: 'button', class: 'wp-act', onClick: () => sayWord(1) }, icon('volume', 18), h('span', { text: 'Normal' }), h('small', { text: '1.0x' })),
        h('button', { type: 'button', class: 'wp-act', onClick: () => sayWord(SLOW_RATE) }, icon('slow', 18), h('span', { text: 'Lento' }), h('small', { text: '0.65x' }))) : null,
      h('div', { class: 'wp-foot' },
        saveBtn,
        h('a', { class: 'wp-dict', href: `https://www.wordreference.com/enes/${encodeURIComponent(lemma)}`, target: '_blank', rel: 'noopener noreferrer' }, h('span', { text: 'Diccionario' }), icon('arrow', 16)))),
    h('span', { class: 'wp-arrow', 'aria-hidden': 'true' }));
  }
  function placePop() {
    if (!sel || pop.hidden) return;
    const sheet = window.innerWidth < 600;
    pop.classList.toggle('is-sheet', sheet);
    if (sheet) { pop.style.left = ''; pop.style.top = ''; return; }
    const r = sel.el.getBoundingClientRect();
    const pw = pop.offsetWidth, ph = pop.offsetHeight, gap = 14;
    let left = r.left + r.width / 2 - pw / 2;
    left = Math.max(12, Math.min(window.innerWidth - pw - 12, left));
    const above = r.top - ph - gap > 80;
    const top = above ? r.top - ph - gap : r.bottom + gap;
    pop.classList.toggle('below', !above);
    pop.style.left = `${left + window.scrollX}px`;
    pop.style.top = `${top + window.scrollY}px`;
    pop.style.setProperty('--ax', `${Math.max(18, Math.min(pw - 18, r.left + r.width / 2 - left))}px`);
  }
  function closePop(returnFocus) {
    if (!sel) return;
    const el = sel.el;
    el.classList.remove('is-selected');
    el.removeAttribute('aria-expanded');
    sel = null;
    pop.hidden = true;
    if (returnFocus) el.focus({ preventScroll: true });
  }
  function sayWord(r) {
    if (playing) pause();
    ctx.speak(sel.text, { rate: r });
  }
  function toggleSave(button) {
    const { lemma, es, sentenceIdx } = sel;
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
    root.querySelectorAll('.word-token').forEach((e) => e.classList.toggle('saved', !!store.get().saved[e.dataset.lemma]));
    clear(button).append(icon(isSaved ? 'bookmark' : 'check', 18), h('span', { text: isSaved ? 'Guardar' : 'Guardada' }));
    button.classList.toggle('is-saved', !isSaved);
    button.setAttribute('aria-pressed', String(!isSaved));
    if (!isSaved) { button.classList.remove('burst'); void button.offsetWidth; button.classList.add('burst'); }
    ctx.toast(isSaved ? `"${lemma}" quitada de tus palabras.` : `"${lemma}" guardada. La verás en tus tarjetas.`);
  }

  // Cierra al tocar fuera, con Escape y reubica al cambiar el tamaño.
  const onDocDown = (e) => { if (sel && !pop.contains(e.target) && !sel.el.contains(e.target)) closePop(); };
  const onKey = (e) => { if (e.key === 'Escape' && sel) { e.preventDefault(); closePop(true); } };
  const onResize = () => placePop();
  document.addEventListener('pointerdown', onDocDown);
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', onResize);

  // ------------------------------------------------------------ Valoración
  function onRate(rating) {
    pause();
    let msg = ctx.rate('input', `story:${id}`, story.difficulty, rating);
    if (rating === 'hard' && rate > 0.75) {
      setRate(0.75);
      msg += ' Bajé la velocidad del audio a 0.75x.';
    } else if (rating === 'easy' && rate < SPEEDS[SPEEDS.length - 1]) {
      const v = SPEEDS[SPEEDS.indexOf(rate) + 1];
      setRate(v);
      msg += ` Subí la velocidad del audio a ${fmtSpeed(v)}.`;
    }
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

  return () => {
    halt();
    pop.remove();
    document.removeEventListener('pointerdown', onDocDown);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    document.body.classList.remove('reader-immersive');
    root.classList.remove('rd', 'show-phon', 'rd-no-audio');
  };
}
