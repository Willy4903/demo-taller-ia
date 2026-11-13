// Biblioteca: portadas ilustradas, tarjetas de historia, anillo de progreso, buscador y filtros.
import { h, clear } from '../util.js';
import { icon } from '../ui.js';
import { cefr, LEVEL_NAMES, THEMES, themeOf, storyProgress, wordsIn, recommend } from './common.js';

const normalize = (v) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Paleta y escena de cada situación (portadas generadas con SVG, sin imágenes externas).
const COVERS = {
  presentarse: ['#8B5CF6', '#312E81', 'hills'],
  trabajo: ['#3B82F6', '#0E7490', 'city'],
  comida: ['#FB7185', '#9A3412', 'hills'],
  viajes: ['#22D3EE', '#1E3A8A', 'sky'],
  compras: ['#EC4899', '#5B21B6', 'city'],
  salud: ['#34D399', '#115E59', 'hills'],
  ciudad: ['#6366F1', '#0E7490', 'city'],
  casa: ['#F59E0B', '#9F1239', 'hills'],
  'tiempo-libre': ['#10B981', '#1E3A8A', 'mountains'],
  hotel: ['#A855F7', '#BE185D', 'sky'],
};

function seeded(id) {
  let x = [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return () => ((x = (x * 1103515245 + 12345) >>> 0) / 4294967296);
}

function scene(kind, rnd) {
  const stars = Array.from({ length: 14 }, () => `<circle cx="${(rnd() * 320).toFixed(0)}" cy="${(rnd() * 80).toFixed(0)}" r="${(0.6 + rnd() * 1.4).toFixed(1)}" fill="#fff" opacity="${(0.3 + rnd() * 0.6).toFixed(2)}"/>`).join('');
  const moon = `<circle cx="${(220 + rnd() * 70).toFixed(0)}" cy="${(30 + rnd() * 20).toFixed(0)}" r="16" fill="#fff" opacity=".85"/><circle cx="${(220 + rnd() * 70).toFixed(0)}" cy="40" r="34" fill="#fff" opacity=".08"/>`;
  if (kind === 'city') {
    let x = 0, b = '', w = '';
    while (x < 320) {
      const bw = 18 + rnd() * 26, bh = 50 + rnd() * 80;
      b += `<rect x="${x.toFixed(0)}" y="${(180 - bh).toFixed(0)}" width="${bw.toFixed(0)}" height="${bh.toFixed(0)}" rx="2"/>`;
      for (let k = 0; k < 4; k++) if (rnd() > 0.45) w += `<rect x="${(x + 4 + rnd() * (bw - 10)).toFixed(0)}" y="${(185 - bh + rnd() * (bh - 20)).toFixed(0)}" width="3" height="4" fill="#FDE68A" opacity=".85"/>`;
      x += bw + 2;
    }
    return `${stars}${moon}<g fill="#0B1020" opacity=".9">${b}</g>${w}`;
  }
  if (kind === 'mountains') {
    return `${stars}${moon}<path d="M0 150 L60 80 L100 120 L160 50 L220 115 L260 85 L320 140 V180 H0Z" fill="#0B1020" opacity=".55"/><path d="M160 50 L175 68 L160 64 L148 72Z" fill="#fff" opacity=".6"/><path d="M0 165 L80 120 L140 150 L210 110 L320 160 V180 H0Z" fill="#0B1020" opacity=".9"/>`;
  }
  if (kind === 'sky') {
    const clouds = Array.from({ length: 3 }, () => { const cx = rnd() * 300, cy = 50 + rnd() * 60; return `<ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="38" ry="10" fill="#fff" opacity=".18"/>`; }).join('');
    return `${stars}${moon}${clouds}<path d="M0 160 Q80 140 160 158 T320 150 V180 H0Z" fill="#0B1020" opacity=".9"/><path d="M40 120 l40 -8 l6 -6 l4 5 l18 -3 l-16 6 l2 8 l-6 -6 l-40 9z" fill="#fff" opacity=".7"/>`;
  }
  return `${stars}${moon}<path d="M0 140 Q60 105 120 135 T240 125 T320 130 V180 H0Z" fill="#0B1020" opacity=".55"/><path d="M0 160 Q90 130 170 158 T320 150 V180 H0Z" fill="#0B1020" opacity=".92"/>`;
}

/** Portada ilustrada de una historia. */
export function storyCover(story, situation, { large = false } = {}) {
  const [c1, c2, kind] = COVERS[story.situation] || ['#8B5CF6', '#1E293B', 'hills'];
  const art = h('div', { class: `cover${large ? ' cover-lg' : ''}`, style: `--c1:${c1};--c2:${c2}`, 'aria-hidden': 'true' });
  art.innerHTML = `<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" focusable="false">${scene(kind, seeded(story.id))}</svg>`;
  art.append(h('span', { class: 'cover-ico' }, icon(situation?.icon || 'book', large ? 30 : 24)));
  return art;
}

/** Anillo circular de progreso. */
export function progressRing(pct, size = 46) {
  const r = 18, c = 2 * Math.PI * r;
  const ring = h('span', { class: `ring${pct >= 100 ? ' full' : ''}`, role: 'img', 'aria-label': `${pct}% leído`, style: `width:${size}px;height:${size}px` });
  ring.innerHTML = `<svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="${r}" class="ring-bg"/><circle cx="22" cy="22" r="${r}" class="ring-fg" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct / 100)).toFixed(1)}"/></svg>`;
  ring.append(h('span', { class: 'ring-txt', 'aria-hidden': 'true', text: pct >= 100 ? '✓' : `${pct}%` }));
  return ring;
}

export function levelBadge(difficulty) {
  const lv = cefr(difficulty);
  return h('span', { class: `lvl lv-${lv.toLowerCase()}` }, h('b', { text: lv }), h('span', { text: LEVEL_NAMES[lv] }));
}

const STATE_LABEL = { new: 'Nueva', reading: 'En curso', done: 'Leída' };

export function storyCard(ctx, story, { recommended = false } = {}) {
  const { data, store } = ctx;
  const sit = data.situationById[story.situation];
  const prog = storyProgress(store.get(), story);
  const minutes = Math.max(1, Math.round(wordsIn(story) / 120));
  return h('a', { class: `story-card st-${prog.state}`, href: `#/leer/${story.id}` },
    h('div', { class: 'sc-art' }, storyCover(story, sit),
      h('span', { class: 'sc-theme', text: themeOf(story).name }),
      recommended && prog.state === 'new' ? h('span', { class: 'sc-new', text: 'Para ti' }) : null),
    h('div', { class: 'sc-body' },
      h('p', { class: 'sc-sit', text: sit?.name || '' }),
      h('h3', { lang: 'en', text: story.title }),
      h('p', { class: 'sc-es', text: story.titleEs }),
      h('div', { class: 'sc-foot' },
        h('div', { class: 'sc-meta' }, levelBadge(story.difficulty), h('span', { class: `sc-state ${prog.state}`, text: `${STATE_LABEL[prog.state]} · ${minutes} min` })),
        progressRing(prog.pct))));
}

const LEVEL_FILTERS = [['', 'Todos'], ['A1', 'A1 Básico'], ['A2', 'A2 Elemental'], ['B1', 'B1 Intermedio']];

/** Buscador instantáneo, filtros por nivel y temática, y cuadrícula de historias. */
export function libraryBrowser(ctx, { title = 'Biblioteca de historias', headingLevel = 'h2', id = 'lib' } = {}) {
  const { data } = ctx;
  let level = '';
  let theme = '';
  const grid = h('div', { class: 'story-grid', id: `${id}-grid` });
  const count = h('p', { class: 'lib-count', role: 'status', 'aria-live': 'polite' });
  const search = h('input', { type: 'search', id: `${id}-q`, placeholder: 'Buscar historia, tema o palabra', autocomplete: 'off', 'aria-controls': `${id}-grid`, onInput: draw });
  const pills = (items, get, set, label) => {
    const row = h('div', { class: 'pill-row', role: 'group', 'aria-label': label });
    const btns = items.map(([v, text]) => h('button', { type: 'button', class: 'pill', 'aria-pressed': String(get() === v), dataset: { v }, onClick: () => { set(v); btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === v))); draw(); }, text }));
    row.append(...btns);
    return row;
  };
  const section = h('section', { class: 'lib', 'aria-labelledby': `${id}-h` },
    h('div', { class: 'lib-head' }, h(headingLevel, { id: `${id}-h`, tabindex: headingLevel === 'h1' ? '-1' : null, text: title }), count),
    h('div', { class: 'lib-tools' },
      h('label', { class: 'search', for: `${id}-q` }, h('span', { class: 'sr-only', text: 'Buscar historias' }), icon('search', 18), search),
      h('div', { class: 'lib-filters' },
        pills(LEVEL_FILTERS, () => level, (v) => { level = v; }, 'Filtrar por nivel'),
        pills([['', 'Todas'], ...THEMES.map((t) => [t.id, t.name])], () => theme, (v) => { theme = v; }, 'Filtrar por temática'))),
    grid);

  function draw() {
    const q = normalize(search.value);
    const ranked = recommend(ctx, 'input', data.stories, 'story');
    const shown = ranked.filter(({ item: s }) => {
      if (level && cefr(s.difficulty) !== level) return false;
      if (theme && themeOf(s).id !== theme) return false;
      if (!q) return true;
      const sit = data.situationById[s.situation];
      return normalize([s.title, s.titleEs, sit?.name, themeOf(s).name, ...s.sentences.map((x) => x.en)].join(' ')).includes(q);
    });
    clear(grid);
    shown.forEach(({ item }, i) => grid.append(storyCard(ctx, item, { recommended: i < 2 && !q && !level && !theme })));
    count.textContent = shown.length === 1 ? '1 historia' : `${shown.length} historias`;
    if (!shown.length) {
      grid.append(h('div', { class: 'lib-empty' }, icon('book', 28), h('p', { text: 'No hay historias con esos filtros.' }),
        h('button', { type: 'button', class: 'btn btn-secondary', text: 'Limpiar filtros', onClick: () => {
          search.value = ''; level = ''; theme = '';
          section.querySelectorAll('.pill').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === '')));
          draw(); search.focus();
        } })));
    }
  }
  draw();
  return section;
}
