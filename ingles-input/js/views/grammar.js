// Módulo 6: Gramática de apoyo. Guías breves en acordeones; se destacan las que la app desbloqueó
// porque fallaste varias veces la misma estructura.
import { h } from '../util.js';
import { icon, pageHeader, notice } from '../ui.js';
import { FAIL_THRESHOLD } from '../grammar.js';
import { ttsSupported } from '../speech.js';

export function render(root, ctx) {
  const { data, store } = ctx;
  const g = store.get().grammar;
  const unlocked = new Set(g.unlocked.filter((id) => data.grammarById[id]));
  root.append(pageHeader('Gramática de apoyo', 'Guías de tres líneas con ejemplos que puedes escuchar. Las que la app detectó que necesitas aparecen primero y abiertas.'));

  if (!unlocked.size) {
    root.append(notice(`Cuando falles ${FAIL_THRESHOLD} veces la misma estructura (en shadowing, tarjetas o conversación), su guía se marcará como "Te ayudará" y aparecerá en el momento.`, 'info', 'Tus guías personalizadas'));
  }

  const ordered = [...data.grammar].sort((a, b) => Number(unlocked.has(b.id)) - Number(unlocked.has(a.id)));
  const list = h('div', { class: 'accordion' });
  for (const tip of ordered) {
    const mine = unlocked.has(tip.id);
    const fails = g.counts[tip.id] || 0;
    const details = h('details', { class: `acc-item${mine ? ' tip' : ''}`, open: mine || undefined },
      h('summary', {},
        h('span', { class: 'acc-ico', 'aria-hidden': 'true' }, icon('bulb', 18)),
        h('span', { class: 'acc-title', text: tip.title }),
        mine ? h('span', { class: 'acc-badge', text: 'Te ayudará' }) : fails > 0 ? h('span', { class: 'acc-badge watch', text: `En observación ${fails}/${FAIL_THRESHOLD}` }) : null,
        h('span', { class: 'acc-chev', 'aria-hidden': 'true' }, icon('chevR', 18))),
      h('div', { class: 'acc-body' },
        h('ol', { class: 'acc-lines' }, tip.lines.map((l) => h('li', { text: l }))),
        tip.examples?.length ? h('div', { class: 'acc-examples' },
          h('p', { class: 'acc-ex-h', text: 'Ejemplos' }),
          tip.examples.map((ex, i) => h('button', {
            type: 'button', class: 'ex', disabled: !ttsSupported || undefined, 'aria-label': `Escuchar: ${ex}`,
            onClick: () => ctx.speak(ex),
          }, h('span', { class: 'ex-play', 'aria-hidden': 'true' }, icon('volume', 16)),
            h('span', { class: 'ex-txt' }, h('span', { class: 'ex-en', lang: 'en', text: ex }), tip.examplesEs?.[i] ? h('span', { class: 'ex-es', lang: 'es', text: tip.examplesEs[i] }) : null)))) : null));
    list.append(details);
  }
  root.append(list);
}
