// Módulo 3: Vocabulario con tarjetas de frases completas y repetición espaciada SM-2.
import { h, clear, todayStr, splitWords, wordCandidates, shuffle } from '../util.js';
import { icon, btn, pageHeader, ratingBar, progressBar, notice, difficultyDots, badge } from '../ui.js';
import { sm2, newCard, isDue, isLearned, QUALITY } from '../srs.js';
import { recommend, speechNotices } from './common.js';
import { ttsSupported } from '../speech.js';

/** Devuelve el contenido de una tarjeta (frase del banco o palabra guardada) o null si ya no existe. */
export function cardContent(data, st, id) {
  if (id.startsWith('w:')) {
    const w = st.saved[id.slice(2)];
    if (!w) return null;
    return { kind: 'word', id, en: w.sentence, es: w.sentenceEs, word: w.word, wordEs: w.es, difficulty: 2, grammar: null };
  }
  const p = data.phraseById[id];
  return p ? { kind: 'phrase', id, en: p.en, es: p.es, difficulty: p.difficulty, grammar: p.grammar, situation: p.situation } : null;
}

function intervalLabel(days) {
  if (days <= 0) return 'hoy';
  if (days === 1) return 'mañana';
  return `en ${days} días`;
}

/** Texto en inglés con la palabra guardada resaltada. */
function highlighted(text, word) {
  const out = [];
  for (const part of splitWords(text)) {
    if (part.word && word && wordCandidates(part.text).includes(word)) out.push(h('mark', { text: part.text }));
    else out.push(part.text);
  }
  return out;
}

export function render(root, ctx) {
  const { data, store } = ctx;
  const holder = h('div');
  root.append(holder);

  function stats() {
    const st = store.get();
    const today = todayStr();
    const cards = Object.entries(st.cards).filter(([id]) => cardContent(data, st, id));
    const due = cards.filter(([, c]) => isDue(c, today));
    const introducedToday = cards.filter(([id, c]) => id.startsWith('p') && c.added === today).length;
    const newLeft = Math.max(0, st.settings.newPerDay - introducedToday);
    const available = data.phrases.filter((p) => !st.cards[p.id]).length;
    return { cards, due, newLeft: Math.min(newLeft, available), learned: cards.filter(([, c]) => isLearned(c)).length };
  }

  function showHome() {
    clear(holder);
    const st = store.get();
    const s = stats();
    holder.append(pageHeader('Vocabulario', 'Tarjetas con frases completas. Las que te cuestan vuelven pronto; las fáciles, cada vez más tarde.'));
    speechNotices().forEach((n) => holder.append(n));
    holder.append(
      h('div', { class: 'grid grid-3' },
        h('div', { class: 'card stat' }, h('span', { class: 'num', text: String(s.due.length) }), h('span', { class: 'lbl', text: 'para repasar hoy' })),
        h('div', { class: 'card stat' }, h('span', { class: 'num', text: String(s.newLeft) }), h('span', { class: 'lbl', text: 'frases nuevas hoy' })),
        h('div', { class: 'card stat' }, h('span', { class: 'num', text: `${s.learned}/${s.cards.length}` }), h('span', { class: 'lbl', text: 'tarjetas aprendidas' }))),
      h('section', { class: 'card' },
        s.due.length + s.newLeft > 0
          ? btn(`Empezar repaso (${s.due.length + s.newLeft} tarjetas)`, { icon: 'play', variant: 'primary', cls: 'btn-big', onClick: startSession })
          : notice('No hay tarjetas pendientes por hoy. Vuelve mañana, o aumenta las frases nuevas diarias en Ajustes.', 'good'),
        h('div', { class: 'field', style: 'margin-top:1rem' },
          h('label', { for: 'dir', text: 'Dirección de las tarjetas' }),
          (() => {
            const sel = h('select', { id: 'dir', onChange: (e) => store.update((x) => { x.settings.cardDirection = e.target.value; }) },
              h('option', { value: 'en-es', text: 'Inglés a español (ves la frase en inglés)' }),
              h('option', { value: 'es-en', text: 'Español a inglés (ves el significado y recuerdas la frase)' }));
            sel.value = st.settings.cardDirection;
            return sel;
          })())),
      savedWordsSection());
  }

  function savedWordsSection() {
    const st = store.get();
    const list = Object.values(st.saved).sort((a, b) => b.at - a.at);
    const sec = h('section', { class: 'card', 'aria-labelledby': 'saved-h' }, h('h2', { id: 'saved-h', text: `Palabras guardadas (${list.length})` }));
    if (!list.length) {
      sec.append(h('p', { class: 'muted', text: 'Cuando leas una historia, toca una palabra y pulsa "Guardar palabra". Aparecerá aquí como tarjeta con su frase de origen.' }));
      return sec;
    }
    const ul = h('ul', { class: 'saved-list' });
    for (const w of list) {
      const card = st.cards[`w:${w.word}`];
      ul.append(h('li', {},
        h('div', {}, h('strong', { lang: 'en', text: w.word }), h('span', { text: ` · ${w.es || 'sin definición'}` }),
          h('div', { class: 'small muted', lang: 'en', text: w.sentence }),
          card && isLearned(card) ? badge('Aprendida', 'good') : null),
        h('button', { type: 'button', class: 'icon-btn small', 'aria-label': `Quitar la palabra ${w.word}`, onClick: () => {
          store.update((x) => { delete x.saved[w.word]; delete x.cards[`w:${w.word}`]; });
          showHome();
        } }, icon('trash', 18))));
    }
    sec.append(ul);
    return sec;
  }

  // -------------------------------------------------------------------------
  // Sesión de repaso
  // -------------------------------------------------------------------------
  function startSession() {
    const today = todayStr();
    const s = stats();
    // Introduce las frases nuevas de hoy, elegidas según el nivel de vocabulario del usuario.
    if (s.newLeft > 0) {
      const pool = data.phrases.filter((p) => !store.get().cards[p.id]);
      const picked = recommend(ctx, 'vocab', pool, 'card').slice(0, s.newLeft).map((x) => x.item);
      store.update((st) => { for (const p of picked) st.cards[p.id] = newCard(today); });
    }
    const st = store.get();
    const due = Object.entries(st.cards)
      .filter(([id, c]) => isDue(c, today) && cardContent(data, st, id))
      .sort((a, b) => (a[1].due < b[1].due ? -1 : a[1].due > b[1].due ? 1 : 0))
      .map(([id]) => id);
    const queue = shuffle(due.slice(0, 40));
    const session = { queue, total: queue.length, done: 0, easy: 0, fair: 0, hard: 0, seen: new Set() };
    showCard(session);
  }

  function showCard(session) {
    clear(holder);
    if (!session.queue.length) { showSummary(session); return; }
    const st = store.get();
    const id = session.queue[0];
    const c = cardContent(data, st, id);
    if (!c) { session.queue.shift(); showCard(session); return; }
    const dir = st.settings.cardDirection;
    const enToEs = dir === 'en-es';

    const tipBox = h('div');
    const rateBox = h('div');
    const answerBox = h('div', { class: 'answer', hidden: true });
    const revealBtn = btn('Mostrar respuesta', { icon: 'eye', variant: 'primary', cls: 'btn-big', onClick: reveal });

    const enBlock = () => h('p', { class: 'phrase-en', lang: 'en' }, c.kind === 'word' ? highlighted(c.en, c.word) : c.en);
    const esBlock = () => h('p', { class: 'phrase-en', lang: 'es', text: c.es });

    const front = h('div', {},
      h('p', { class: 'small muted', text: enToEs ? '¿Qué significa?' : '¿Cómo se dice en inglés?' }),
      enToEs ? enBlock() : esBlock(),
      enToEs && ttsSupported ? btn('Escuchar', { icon: 'volume', onClick: () => ctx.speak(c.en) }) : null);

    answerBox.append(
      enToEs ? esBlock() : enBlock(),
      c.kind === 'word' ? h('p', {}, h('strong', { lang: 'en', text: c.word }), ` = ${c.wordEs || 'sin definición local'}`) : null,
      !enToEs && ttsSupported ? btn('Escuchar', { icon: 'volume', onClick: () => ctx.speak(c.en) }) : null);

    function reveal() {
      answerBox.hidden = false;
      revealBtn.hidden = true;
      if (!enToEs && ttsSupported) ctx.speak(c.en);
      const card = store.get().cards[id];
      const hints = {};
      for (const [k, q] of Object.entries(QUALITY)) hints[k] = intervalLabel(sm2(card, q, todayStr()).interval);
      clear(rateBox).append(ratingBar({ title: '¿Qué tan fácil fue recordarla?', hints, onRate: rateCard }));
      rateBox.querySelector('button')?.focus();
      ctx.announce('Respuesta visible. Elige qué tan fácil fue.');
    }

    function rateCard(rating) {
      const today = todayStr();
      const q = QUALITY[rating];
      store.update((s) => { s.cards[id] = sm2(s.cards[id], q, today); });
      ctx.rate('vocab', `card:${id}`, c.difficulty, rating, { silent: true });
      if (c.grammar) {
        if (rating === 'hard') ctx.grammar(c.grammar, false, tipBox);
        else if (rating === 'easy') ctx.grammar(c.grammar, true, tipBox);
      }
      session[rating]++;
      session.queue.shift();
      if (rating === 'hard') {
        // Vuelve a aparecer en unas pocas tarjetas, hasta que la recuerdes.
        session.queue.splice(Math.min(3, session.queue.length), 0, id);
      } else if (!session.seen.has(id)) session.done++;
      session.seen.add(id);
      // Si apareció un aviso de gramática, damos tiempo a leerlo antes de avanzar.
      if (tipBox.childElementCount) {
        clear(rateBox).append(btn('Continuar', { icon: 'arrow', variant: 'primary', onClick: () => showCard(session) }));
        rateBox.querySelector('button').focus();
      } else showCard(session);
    }

    holder.append(
      h('div', { class: 'row between' }, h('h1', { id: 'page-title', tabindex: '-1', text: 'Repaso' }), h('button', { type: 'button', class: 'btn btn-ghost', onClick: () => showSummary(session, true) }, icon('x', 18), h('span', { text: 'Terminar' }))),
      progressBar(session.done, session.total, `Avance: ${session.done} de ${session.total} tarjetas`),
      h('p', { class: 'muted small', text: `${session.queue.length} por ver en esta sesión` }),
      h('div', { class: 'card flashcard' },
        h('div', { class: 'row', style: 'justify-content:center' }, difficultyDots(c.difficulty), c.kind === 'word' ? badge('Palabra guardada', 'primary') : badge(data.situationById[c.situation]?.name || '')),
        front, answerBox, revealBtn),
      tipBox, rateBox);
    holder.querySelector('h1').focus({ preventScroll: true });
  }

  function showSummary(session, early = false) {
    clear(holder);
    const total = session.easy + session.fair + session.hard;
    const st = store.get();
    const tomorrow = Object.values(st.cards).filter((c) => c.due <= todayStr(new Date(Date.now() + 86400000))).length;
    holder.append(
      pageHeader(early ? 'Repaso interrumpido' : 'Repaso terminado', total ? `Respondiste ${total} ${total === 1 ? 'tarjeta' : 'tarjetas'}.` : 'No respondiste ninguna tarjeta.'),
      h('div', { class: 'grid grid-3' },
        h('div', { class: 'card stat' }, h('span', { class: 'num', text: String(session.easy) }), h('span', { class: 'lbl', text: 'muy fáciles' })),
        h('div', { class: 'card stat' }, h('span', { class: 'num', text: String(session.fair) }), h('span', { class: 'lbl', text: 'justas' })),
        h('div', { class: 'card stat' }, h('span', { class: 'num', text: String(session.hard) }), h('span', { class: 'lbl', text: 'difíciles' }))),
      h('p', { text: session.hard > session.easy + session.fair
        ? 'Hoy fue un día exigente: las difíciles volverán pronto y la app te propondrá frases más sencillas.'
        : session.easy > session.hard + session.fair ? 'Te resultó fácil: la app te propondrá frases un poco más exigentes.' : 'Buen equilibrio entre reto y comodidad.' }),
      h('p', { class: 'muted', text: `Tarjetas que vencen mañana o antes: ${tomorrow}.` }),
      h('div', { class: 'row' }, btn('Volver a Vocabulario', { variant: 'primary', onClick: showHome }), h('a', { class: 'btn btn-secondary', href: '#/progreso', text: 'Ver progreso' })));
  }

  showHome();
}
