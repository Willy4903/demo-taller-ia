// Módulo 6: Gramática de apoyo. Las explicaciones aparecen solo cuando fallas varias veces la misma estructura.
import { h } from '../util.js';
import { pageHeader, grammarTip, notice } from '../ui.js';
import { FAIL_THRESHOLD } from '../grammar.js';

export function render(root, ctx) {
  const { data, store } = ctx;
  const g = store.get().grammar;
  root.append(pageHeader('Gramática de apoyo', 'Mini explicaciones de 3 líneas. No hay lecciones que estudiar: aparecen cuando las necesitas.'));

  const unlocked = g.unlocked.map((id) => data.grammarById[id]).filter(Boolean);
  if (!unlocked.length) {
    root.append(notice(`Todavía no se ha desbloqueado ninguna. Cuando falles ${FAIL_THRESHOLD} veces la misma estructura (en shadowing, tarjetas o conversación), su explicación aparecerá en el momento y quedará guardada aquí.`, 'info', 'Sin explicaciones por ahora'));
  } else {
    root.append(...unlocked.map((tip) => grammarTip(tip, { onPlay: (t) => ctx.speak(t) })));
  }

  const watching = Object.entries(g.counts).filter(([id, n]) => n > 0 && data.grammarById[id]);
  if (watching.length) {
    root.append(h('section', { class: 'card' },
      h('h2', { text: 'En observación' }),
      h('p', { class: 'muted', text: 'Estructuras en las que has fallado hace poco. Si se repite, verás su explicación.' }),
      h('ul', {}, watching.map(([id, n]) => h('li', { text: `${data.grammarById[id].title}: ${n} de ${FAIL_THRESHOLD}` })))));
  }
}
