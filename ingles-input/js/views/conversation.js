// Módulo 4: Conversación guiada con guion ramificado, validación por palabras clave y respuesta modelo.
import { h, clear, append, matchBranch } from '../util.js';
import { icon, btn, pageHeader, backLink, difficultyDots, badge, ratingBar, notice, situationIcon } from '../ui.js';
import { situationChips, recommend, ratingLabel, sttNotice, speechNotices } from './common.js';
import { sttSupported, ttsSupported, listen, describeSttError, cancelSpeech } from '../speech.js';
import { askAI, isValidEndpoint } from '../ai.js';

export function render(root, ctx, params) {
  return params.id ? renderDialogue(root, ctx, params.id) : renderList(root, ctx);
}

function renderList(root, ctx) {
  const { data, store } = ctx;
  let filter = '';
  const chipsHolder = h('div');
  const listEl = h('div', { class: 'grid' });

  function draw() {
    clear(chipsHolder).append(situationChips(data, filter, (id) => { filter = id; draw(); }));
    clear(listEl);
    const ranked = recommend(ctx, 'convo', data.dialogues.filter((d) => !filter || d.situation === filter), 'dialogue');
    ranked.forEach(({ item, reason }, i) => {
      const sit = data.situationById[item.situation];
      const r = store.get().ratings[`dialogue:${item.id}`];
      const runs = store.get().convo[item.id]?.runs || 0;
      listEl.append(h('a', { class: 'card list-card', href: `#/hablar/${item.id}` },
        h('div', { class: 'row' },
          h('span', { class: 'sit-icon' }, situationIcon(sit, 22)),
          h('div', { style: 'flex:1' },
            h('p', { class: 'small muted', text: sit?.name }),
            h('h2', { lang: 'en', text: item.title }),
            h('p', { class: 'muted', text: item.goal }),
            h('div', { class: 'meta' },
              difficultyDots(item.difficulty),
              i < 2 && !filter ? badge('Recomendado', 'primary') : null,
              runs ? badge(`Hecho ${runs} ${runs === 1 ? 'vez' : 'veces'}`) : badge(reason === 'nuevo para ti' ? 'Nuevo' : reason),
              r ? badge(`Tu valoración: ${ratingLabel(r.last)}`, r.last === 'hard' ? 'warn' : 'good') : null)))));
    });
  }

  root.append(pageHeader('Conversación guiada', 'La app dice una línea, tú respondes hablando o escribiendo, y ves una respuesta modelo.'));
  speechNotices().forEach((n) => root.append(n));
  const stt = sttNotice();
  if (stt) root.append(stt);
  const ai = store.get().settings;
  root.append(h('p', { class: 'muted small', text: ai.aiEnabled && isValidEndpoint(ai.aiEndpoint) ? 'Comentarios de IA activados (tu propio backend).' : 'Comentarios de IA desactivados: la app valida con palabras clave. Puedes conectar tu propio backend en Ajustes.' }));
  root.append(chipsHolder, listEl);
  draw();
}

function renderDialogue(root, ctx, id) {
  const { data, store } = ctx;
  const dialogue = data.dialogueById[id];
  if (!dialogue) {
    root.append(backLink('#/hablar', 'Todas las conversaciones'), pageHeader('Conversación no encontrada'));
    return;
  }
  let recognizer = null;
  let recording = false;
  let okCount = 0;
  let turns = 0;
  const history = [];
  let aiToken = 0;

  const chat = h('div', { class: 'chat', role: 'log', 'aria-live': 'polite', 'aria-label': 'Conversación' });
  const feedbackBox = h('div', { 'aria-live': 'polite' });
  const inputArea = h('div');
  const endBox = h('div');

  root.append(
    backLink('#/hablar', 'Todas las conversaciones'),
    pageHeader(dialogue.title, dialogue.goal),
    h('div', { class: 'row', style: 'margin-bottom:1rem' }, difficultyDots(dialogue.difficulty), badge(data.situationById[dialogue.situation]?.name || '')),
    ...speechNotices(), chat, feedbackBox, inputArea, endBox);
  root.querySelector('h1').setAttribute('lang', 'en');

  function bubble(who, text, es) {
    const b = h('div', { class: `bubble ${who === 'npc' ? 'npc' : 'me'}` },
      h('span', { class: 'who', text: who === 'npc' ? 'Tu interlocutor' : 'Tú' }),
      h('span', { lang: 'en', text }));
    if (who === 'npc') {
      const esEl = h('div', { class: 'es', lang: 'es', hidden: true, text: es });
      const row = h('div', { class: 'row', style: 'margin-top:.4rem' },
        ttsSupported ? h('button', { type: 'button', class: 'icon-btn small', 'aria-label': 'Escuchar esta línea', onClick: () => ctx.speak(text) }, icon('volume', 18)) : null,
        h('button', { type: 'button', class: 'btn btn-ghost', 'aria-expanded': 'false', onClick: (e) => {
          esEl.hidden = !esEl.hidden;
          e.currentTarget.setAttribute('aria-expanded', String(!esEl.hidden));
        } }, icon('language', 18), h('span', { text: 'Traducción' })));
      b.append(row, esEl);
    }
    chat.append(b);
    b.scrollIntoView({ block: 'nearest' });
    return b;
  }

  function enter(nodeId) {
    const node = dialogue.nodes[nodeId];
    clear(feedbackBox);
    bubble('npc', node.say, node.es);
    history.push({ role: 'npc', text: node.say });
    if (ttsSupported) ctx.speak(node.say);
    if (node.end) { finish(); return; }
    showInput(nodeId, node);
  }

  function showInput(nodeId, node) {
    clear(inputArea);
    const input = h('input', { id: 'reply', type: 'text', lang: 'en', autocomplete: 'off', autocapitalize: 'sentences', spellcheck: 'false', placeholder: 'Escribe tu respuesta en inglés', 'aria-describedby': 'reply-hint' });
    const hint = h('p', { id: 'reply-hint', class: 'muted small', text: '' });
    const micBtn = sttSupported ? h('button', { type: 'button', class: 'btn btn-secondary', 'aria-label': 'Responder hablando', onClick: toggleMic }, icon('mic', 22)) : null;
    const sendBtn = btn('Enviar', { icon: 'send', variant: 'primary', type: 'submit' });
    const form = h('form', { class: 'stack', onSubmit: (e) => { e.preventDefault(); submit(nodeId, node, input); } },
      h('label', { for: 'reply', text: 'Tu respuesta' }),
      h('div', { class: 'reply-box' }, input, micBtn, sendBtn),
      hint,
      h('button', { type: 'button', class: 'btn btn-ghost', onClick: () => { hint.textContent = node.starter ? `Pista: empieza con "${node.starter}"` : 'Responde con una frase corta.'; } }, icon('bulb', 18), h('span', { text: 'Ver una pista' })));
    inputArea.append(form);
    input.focus({ preventScroll: true });

    function toggleMic() {
      if (recording) { recognizer?.stop(); return; }
      recording = true;
      micBtn.classList.add('is-recording');
      micBtn.setAttribute('aria-label', 'Detener grabación');
      hint.textContent = 'Te escucho…';
      recognizer = listen({
        lang: 'en-US',
        onInterim: (t) => { input.value = t; },
        onDone: ({ text, error }) => {
          recording = false;
          recognizer = null;
          micBtn.classList.remove('is-recording');
          micBtn.setAttribute('aria-label', 'Responder hablando');
          if (text) { input.value = text; hint.textContent = 'Revisa lo que escuchamos, corrígelo si hace falta y pulsa Enviar.'; input.focus(); }
          else hint.textContent = error && error !== 'no-speech' ? describeSttError(error) : 'No se entendió nada. Intenta de nuevo o escribe tu respuesta.';
        },
      });
    }
  }

  function submit(nodeId, node, input) {
    const text = input.value.trim();
    if (!text) { input.focus(); return; }
    recognizer?.stop();
    turns++;
    bubble('me', text);
    history.push({ role: 'user', text });
    clear(inputArea);
    const m = matchBranch(node, text);
    clear(feedbackBox);

    if (m) {
      okCount++;
      ctx.grammar(node.grammar, true, feedbackBox);
      const found = m.hit.filter(Boolean).length;
      feedbackBox.append(h('div', { class: 'feedback good' },
        h('p', { class: 'model', text: 'Buena respuesta.' }),
        h('p', { text: `Ideas clave encontradas: ${found} de ${m.total}.` }),
        modelLine('Respuesta modelo', m.branch.model, m.branch.modelEs),
        btn('Continuar', { icon: 'arrow', variant: 'primary', onClick: () => enter(m.branch.next) })));
      feedbackBox.querySelector('button.btn-primary')?.focus();
    } else {
      const fb = h('div', { class: 'feedback bad' },
        h('p', { class: 'model', text: 'Todavía no veo las ideas clave de esta respuesta.' }),
        h('p', { text: node.branches.length > 1 ? 'Estas son algunas respuestas posibles:' : 'Una respuesta posible:' }),
        node.branches.map((b) => modelLine(null, b.model, b.modelEs)),
        node.starter ? h('p', { class: 'muted small', text: `Pista: empieza con "${node.starter}"` }) : null,
        h('div', { class: 'row' },
          btn('Intentar de nuevo', { icon: 'refresh', variant: 'primary', onClick: () => { clear(feedbackBox); showInput(nodeId, node); } }),
          btn('Continuar con la respuesta modelo', { icon: 'arrow', onClick: () => {
            const b = node.branches[0];
            bubble('me', b.model);
            history.push({ role: 'user', text: b.model });
            enter(b.next);
          } })));
      feedbackBox.append(fb);
      ctx.grammar(node.grammar, false, feedbackBox);
      fb.querySelector('button')?.focus();
    }
    maybeAskAI(nodeId, node, text);
  }

  function modelLine(label, en, es) {
    return h('div', { style: 'margin:.5rem 0' },
      label ? h('p', { class: 'small muted', text: label }) : null,
      h('div', { class: 'row' },
        h('span', { class: 'model', lang: 'en', text: en }),
        ttsSupported ? h('button', { type: 'button', class: 'icon-btn small', 'aria-label': `Escuchar: ${en}`, onClick: () => ctx.speak(en) }, icon('volume', 18)) : null),
      h('span', { class: 'muted', lang: 'es', text: es }));
  }

  /** Función opcional: pide un comentario a tu propio backend (ver js/ai.js y README). */
  function maybeAskAI(nodeId, node, userText) {
    const st = store.get().settings;
    if (!st.aiEnabled) return;
    const slot = h('div', { class: 'notice', 'aria-live': 'polite' }, h('p', { text: 'Consultando a la IA…' }));
    feedbackBox.append(slot);
    const token = ++aiToken;
    askAI(st.aiEndpoint, { dialogueId: id, nodeId, npcLine: node.say, userText, history: history.slice(-8) })
      .then((r) => {
        if (token !== aiToken) return;
        append(clear(slot), h('strong', { text: 'Comentario de la IA' }), h('p', { text: r.feedback }), r.corrected ? h('p', { lang: 'en' }, 'Versión corregida: ', h('span', { class: 'model', text: r.corrected })) : null);
      })
      .catch((e) => {
        if (token !== aiToken) return;
        clear(slot).append(h('p', { class: 'muted', text: `No se pudo obtener el comentario de la IA (${e.message}). La validación por palabras clave sigue funcionando.` }));
      });
  }

  function finish() {
    clear(inputArea);
    store.update((s) => {
      const p = s.convo[id] || { runs: 0 };
      s.convo[id] = { runs: p.runs + 1, last: Date.now() };
    });
    const resultHolder = h('div', { 'aria-live': 'polite' });
    endBox.append(h('section', { class: 'card' },
      h('h2', { text: 'Conversación completada' }),
      h('p', { text: `Respuestas que cumplieron las ideas clave: ${okCount} de ${turns}.` }),
      ratingBar({ title: '¿Qué tan difícil fue esta conversación?', onRate: (rating) => {
        const msg = ctx.rate('convo', `dialogue:${id}`, dialogue.difficulty, rating);
        const next = recommend(ctx, 'convo', data.dialogues.filter((d) => d.id !== id), 'dialogue')[0];
        clear(resultHolder).append(notice(msg, 'good'),
          h('div', { class: 'row' },
            next ? h('a', { class: 'btn btn-primary', href: `#/hablar/${next.item.id}` }, h('span', { text: `Siguiente: ${next.item.title}` }), icon('arrow', 20)) : null,
            btn('Repetir', { icon: 'refresh', onClick: () => ctx.reload() })));
      } }),
      resultHolder));
    endBox.scrollIntoView({ block: 'nearest' });
  }

  enter(dialogue.start);
  return () => { recognizer?.stop(); aiToken++; cancelSpeech(); };
}
