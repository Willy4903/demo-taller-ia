// Módulo 5: Progreso. Racha, minutos, palabras aprendidas y plan diario de 40 minutos.
import { h, clear, todayStr, addDays } from '../util.js';
import { pageHeader, progressBar, icon } from '../ui.js';
import { PLAN_MINUTES, computeStreak, dayMinutes, totalMinutes } from '../store.js';
import { isLearned } from '../srs.js';
import { levelWord } from '../adapt.js';
import { PLAN } from './home.js';

const DAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

export function render(root, ctx) {
  const { store } = ctx;
  const holder = h('div');
  root.append(holder);

  function draw() {
    clear(holder);
    const st = store.get();
    const today = todayStr();
    const day = st.days[today];
    const streak = computeStreak(st.days);
    const savedList = Object.values(st.saved);
    const learnedWords = savedList.filter((w) => isLearned(st.cards[`w:${w.word}`])).length;
    const learnedPhrases = Object.entries(st.cards).filter(([id, c]) => id.startsWith('p') && isLearned(c)).length;
    const shadowEntries = Object.values(st.shadow);
    const shadowAvg = shadowEntries.length ? Math.round(shadowEntries.reduce((a, x) => a + (x.last || 0), 0) / shadowEntries.length) : null;
    const convoRuns = Object.values(st.convo).reduce((a, x) => a + (x.runs || 0), 0);
    const storyPlays = Object.values(st.stories).reduce((a, x) => a + (x.plays || 0), 0);

    holder.append(pageHeader('Tu progreso', 'Todo se guarda solo en este navegador. Exporta una copia desde Ajustes si cambias de dispositivo.'));

    holder.append(h('div', { class: 'grid grid-3' },
      stat(streak, streak === 1 ? 'día de racha' : 'días de racha', 'flame'),
      stat(Math.round(dayMinutes(day)), 'minutos hoy'),
      stat(Math.round(totalMinutes(st.days)), 'minutos en total'),
      stat(savedList.length, 'palabras guardadas'),
      stat(learnedWords + learnedPhrases, 'aprendidas (3 aciertos seguidos)'),
      stat(shadowAvg === null ? '-' : `${shadowAvg}%`, 'coincidencia en shadowing')));

    // Plan diario con checklist
    const plan = h('section', { class: 'card', 'aria-labelledby': 'plan-h' },
      h('h2', { id: 'plan-h', text: 'Plan diario de 40 minutos' }),
      h('p', { class: 'muted small', text: 'Se marca solo al llegar a los minutos de cada bloque. También puedes marcarlo tú.' }));
    let doneCount = 0;
    for (const p of PLAN) {
      const mins = (day?.[p.id] || 0) / 60;
      const target = PLAN_MINUTES[p.id];
      const manual = !!day?.done?.[p.id];
      const complete = manual || mins >= target;
      if (complete) doneCount++;
      const cb = h('input', { type: 'checkbox', id: `chk-${p.id}`, checked: complete || undefined, 'aria-describedby': `chk-${p.id}-d`, onChange: (e) => {
        store.update(() => { const d = store.today(); d.done[p.id] = e.target.checked; if (!e.target.checked) delete d.done[p.id]; });
        draw();
      } });
      if (mins >= target) { cb.disabled = true; cb.title = 'Completado por tiempo de estudio'; }
      plan.append(h('div', { class: 'check-row' }, cb,
        h('div', {}, h('label', { for: `chk-${p.id}`, text: `${p.label} (${target} min)` }),
          progressBar(Math.min(mins, target), target, `${p.label}: ${Math.floor(mins)} de ${target} minutos`)),
        h('span', { id: `chk-${p.id}-d`, class: 'small muted', text: `${Math.floor(mins)}/${target} min` })));
    }
    plan.append(h('p', { class: 'model', text: doneCount === 4 ? 'Plan de hoy completo. Buen trabajo.' : `${doneCount} de 4 bloques completos.` }));
    holder.append(plan);

    // Últimos 7 días
    const week = h('div', { class: 'week', role: 'img' });
    const items = [];
    for (let i = 6; i >= 0; i--) {
      const key = addDays(today, -i);
      const m = dayMinutes(st.days[key]);
      const [y, mo, d] = key.split('-').map(Number);
      items.push({ key, m, label: DAY_LABELS[new Date(y, mo - 1, d).getDay()] });
    }
    const maxM = Math.max(40, ...items.map((x) => x.m));
    for (const it of items) {
      week.append(h('div', { class: 'week-col' },
        h('span', { text: String(Math.round(it.m)) }),
        h('div', { class: `week-bar${it.m >= 40 ? ' met' : it.m === 0 ? ' empty' : ''}`, style: `height:${Math.max(2, (it.m / maxM) * 100)}%` }),
        h('span', { class: 'muted', text: it.label })));
    }
    week.setAttribute('aria-label', `Minutos estudiados en los últimos 7 días: ${items.map((x) => `${x.key} ${Math.round(x.m)}`).join(', ')}`);
    holder.append(h('section', { class: 'card', 'aria-labelledby': 'week-h' }, h('h2', { id: 'week-h', text: 'Últimos 7 días (minutos)' }), week));

    // Actividad
    holder.append(h('section', { class: 'card' },
      h('h2', { text: 'Actividad' }),
      h('ul', {},
        h('li', { text: `Historias escuchadas hasta el final: ${storyPlays}` }),
        h('li', { text: `Frases practicadas en shadowing: ${shadowEntries.length}` }),
        h('li', { text: `Conversaciones completadas: ${convoRuns}` }),
        h('li', { text: `Tarjetas en estudio: ${Object.keys(st.cards).length} (${learnedPhrases} frases y ${learnedWords} palabras aprendidas)` }),
        h('li', { text: `Estructuras de gramática desbloqueadas: ${st.grammar.unlocked.length}` }))));

    // Dificultad adaptativa
    const lv = h('section', { class: 'card', 'aria-labelledby': 'lv-h' },
      h('h2', { id: 'lv-h', text: 'Cómo se ajusta la app a ti' }),
      h('p', { class: 'muted small', text: 'Según tus valoraciones "muy fácil / justo / difícil", la app elige contenido más sencillo o más exigente.' }));
    for (const [kind, label] of [['input', 'Escuchar y leer'], ['shadowing', 'Shadowing'], ['vocab', 'Tarjetas'], ['convo', 'Conversación']]) {
      const v = st.level[kind];
      lv.append(h('div', { class: 'level-meter' }, h('span', { text: label }), progressBar(v - 1, 2, `${label}: dificultad ${levelWord(v)}`), h('span', { class: 'small muted', text: levelWord(v) })));
    }
    holder.append(lv);

    holder.append(h('div', { class: 'row' },
      h('a', { class: 'btn btn-secondary', href: '#/ajustes' }, icon('download', 20), h('span', { text: 'Exportar o importar progreso' }))));
  }

  function stat(num, label, ic) {
    return h('div', { class: 'card stat' }, h('span', { class: 'num' }, ic ? icon(ic, 26) : null, ic ? ' ' : '', String(num)), h('span', { class: 'lbl', text: label }));
  }

  draw();
}
