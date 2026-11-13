// Componentes de interfaz compartidos.
import { h, append } from './util.js';
import { RATINGS } from './adapt.js';

const ICONS = {
  home: 'M3 11l9-8 9 8M5 10v10h14V10',
  book: 'M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2zM22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z',
  mic: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3',
  cards: 'M12 2l10 5-10 5L2 7zM2 12l10 5 10-5M2 17l10 5 10-5',
  chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  settings: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  play: 'M7 4l13 8-13 8z',
  stop: 'M6 6h12v12H6z',
  pause: 'M7 4h3.5v16H7zM13.5 4H17v16h-3.5z',
  bookmark: 'M6 3h12v18l-6-4.5L6 21z',
  slow: 'M12 3a9 9 0 1 0 9 9M12 7v5l-3 2M16 3.5l1.5 3.5M20.5 7.5L17 9',
  volume: 'M11 5L6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14',
  eye: 'M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  check: 'M5 12l5 5L20 7',
  x: 'M6 6l12 12M18 6L6 18',
  flame: 'M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-4 3-7 1 1 2 2 3-5z',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  bulb: 'M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  briefcase: 'M3 7h18v13H3zM8 7V4h8v3M3 13h18',
  utensils: 'M5 3v8a2 2 0 0 0 2 2v8M9 3v8M7 3v8M17 3c-2 2-3 5-3 8h3v10',
  plane: 'M2 16l20-5-3-3-7 2-5-6-2 1 3 7-5 2z',
  bag: 'M6 7h12l1 14H5zM9 7a3 3 0 0 1 6 0',
  heart: 'M12 21s-8-5.5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 10c0 5.5-8 11-8 11z',
  map: 'M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11zM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  bed: 'M3 18V6M3 14h18v4M21 14v-3a3 3 0 0 0-3-3h-7v6',
  download: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  upload: 'M12 15V3M7 8l5-5 5 5M4 21h16',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14',
  plus: 'M12 5v14M5 12h14',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  refresh: 'M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5',
  language: 'M4 5h9M8.5 3v2M6 5c0 4 3 7 6 8M11 5c-1 4-3 7-7 9M13 21l4-10 4 10M14.5 18h5',
  star: 'M12 2l3 7 7 .6-5.3 4.7 1.7 7.2L12 17.8 6.6 21.5l1.7-7.2L3 9.6 10 9z',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4z',
};

const SVG_NS = 'http://www.w3.org/2000/svg';

export function icon(name, size = 22) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('fill', name === 'play' || name === 'stop' || name === 'pause' ? 'currentColor' : 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('icon');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', ICONS[name] || ICONS.star);
  svg.appendChild(path);
  return svg;
}

/** Botón con icono y texto. */
export function btn(label, { icon: ic, variant = 'secondary', onClick, ariaLabel, disabled, type = 'button', cls = '' } = {}) {
  return h('button', { type, class: `btn btn-${variant} ${cls}`.trim(), onClick, 'aria-label': ariaLabel, disabled: disabled || undefined },
    ic ? icon(ic, 20) : null, label ? h('span', { text: label }) : null);
}

export function difficultyDots(n) {
  const wrap = h('span', { class: 'dots', role: 'img', 'aria-label': `Dificultad del contenido: ${n} de 3` });
  for (let i = 1; i <= 3; i++) wrap.append(h('span', { class: i <= n ? 'dot on' : 'dot', 'aria-hidden': 'true' }));
  return wrap;
}

export function badge(text, kind = '') {
  return h('span', { class: `badge ${kind}`.trim(), text });
}

export function notice(text, kind = 'info', title) {
  return h('div', { class: `notice notice-${kind}`, role: kind === 'warn' ? 'alert' : 'note' },
    title ? h('strong', { class: 'notice-title', text: title }) : null,
    h('p', { text }));
}

export function pageHeader(title, subtitle, ...actions) {
  return h('header', { class: 'page-head' },
    h('div', {}, h('h1', { id: 'page-title', tabindex: '-1', text: title }), subtitle ? h('p', { class: 'muted', text: subtitle }) : null),
    actions.length ? h('div', { class: 'page-actions' }, actions) : null);
}

export function backLink(href, label) {
  return h('a', { class: 'back-link', href }, icon('back', 18), h('span', { text: label }));
}

/** Botones "muy fácil / justo / difícil". */
export function ratingBar({ onRate, title = '¿Qué tan difícil te resultó?', current, hints } = {}) {
  const wrap = h('div', { class: 'rating', role: 'group', 'aria-label': title });
  wrap.append(h('p', { class: 'rating-title', text: title }));
  const row = h('div', { class: 'rating-row' });
  for (const r of RATINGS) {
    row.append(h('button', {
      type: 'button',
      class: `btn btn-rate rate-${r.id}${current === r.id ? ' is-current' : ''}`,
      'aria-pressed': current === r.id ? 'true' : 'false',
      onClick: () => onRate(r.id),
    }, h('span', { class: 'rate-label', text: r.label }), h('span', { class: 'rate-hint', text: hints?.[r.id] ?? r.hint })));
  }
  wrap.append(row);
  return wrap;
}

export function progressBar(value, max, label) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return h('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(max), 'aria-valuenow': String(Math.min(value, max)), 'aria-label': label },
    h('div', { class: 'bar-fill', style: `width:${pct}%` }));
}

/** Tarjeta de gramática de apoyo (3 líneas). */
export function grammarTip(tip, { onPlay } = {}) {
  const card = h('section', { class: 'tip', 'aria-label': `Gramática de apoyo: ${tip.title}` },
    h('div', { class: 'tip-head' }, icon('bulb', 20), h('strong', { text: tip.title })),
    h('ul', { class: 'tip-lines' }, tip.lines.map((l) => h('li', { text: l }))));
  if (tip.examples?.length) {
    const ex = h('div', { class: 'tip-examples' });
    for (const e of tip.examples) {
      append(ex, h('span', { class: 'tip-example', lang: 'en' }, onPlay ? h('button', { type: 'button', class: 'icon-btn small', 'aria-label': `Escuchar: ${e}`, onClick: () => onPlay(e) }, icon('volume', 16)) : null, h('span', { text: e })));
    }
    card.append(ex);
  }
  return card;
}

/** Muestra el resultado de comparar la voz con la frase (con marcas que no dependen solo del color). */
export function diffView(result) {
  const line = h('p', { class: 'diff', lang: 'en' });
  result.items.forEach((it, i) => {
    if (i) line.append(' ');
    line.append(h('span', { class: it.ok ? 'dw ok' : 'dw miss' },
      h('span', { class: 'sr-only', text: it.ok ? 'Bien: ' : 'Falló: ' }), it.word,
      h('span', { class: 'dw-mark', 'aria-hidden': 'true', text: it.ok ? '' : ' ✗' })));
  });
  return line;
}

// ---------------------------------------------------------------------------
// Avisos efímeros accesibles
// ---------------------------------------------------------------------------

let toastTimer = null;
export function toast(message) {
  const region = document.getElementById('toast');
  if (!region) return;
  region.textContent = message;
  region.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => region.classList.remove('show'), 4200);
}

export function announce(message) {
  const region = document.getElementById('live');
  if (region) region.textContent = message;
}

export function situationIcon(situation, size = 24) {
  return icon(situation?.icon || 'star', size);
}
