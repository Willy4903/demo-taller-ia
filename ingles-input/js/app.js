// Punto de entrada: carga datos, aplica ajustes, arma la navegación y el enrutador por hash.
import { h, clear, todayStr } from './util.js';
import { createStore, computeStreak } from './store.js';
import { loadData } from './data.js';
import { createTimer } from './timer.js';
import { icon, toast, announce, notice, grammarTip } from './ui.js';
import { cefr, lastStoryId } from './views/common.js';
import { speak as ttsSpeak, cancelSpeech, onBusyChange } from './speech.js';
import { applyRating, levelWord } from './adapt.js';
import { recordFail, recordSuccess } from './grammar.js';

import * as home from './views/home.js';
import * as stories from './views/stories.js';
import * as shadowing from './views/shadowing.js';
import * as vocab from './views/vocab.js';
import * as conversation from './views/conversation.js';
import * as progress from './views/progress.js';
import * as grammarView from './views/grammar.js';
import * as settings from './views/settings.js';
import * as method from './views/method.js';

const ROUTES = [
  { re: /^\/?$/, view: home, title: 'Biblioteca', nav: '/' },
  { re: /^\/leer(?:\/([\w-]+))?$/, view: stories, title: 'Lectura', nav: '/leer', cat: 'input' },
  { re: /^\/shadowing$/, view: shadowing, title: 'Shadowing', nav: '/shadowing', cat: 'shadowing' },
  { re: /^\/(?:vocabulario|tarjetas)$/, view: vocab, title: 'Vocabulario', nav: '/vocabulario', cat: 'review' },
  { re: /^\/hablar(?:\/([\w-]+))?$/, view: conversation, title: 'Conversación', nav: '/hablar', cat: 'convo' },
  { re: /^\/progreso$/, view: progress, title: 'Progreso', nav: '/progreso' },
  { re: /^\/gramatica$/, view: grammarView, title: 'Gramática de apoyo', nav: '/gramatica' },
  { re: /^\/ajustes$/, view: settings, title: 'Ajustes y datos', nav: '/ajustes' },
  { re: /^\/metodo$/, view: method, title: 'Cómo aprender', nav: '/metodo' },
];

const NAV = [
  { path: '/', label: 'Biblioteca', icon: 'home' },
  { path: '/leer', label: 'Lectura', icon: 'book' },
  { path: '/vocabulario', label: 'Vocabulario', icon: 'cards' },
  { path: '/gramatica', label: 'Gramática', icon: 'bulb' },
  { path: '/ajustes', label: 'Ajustes', icon: 'settings' },
];
const MORE = [
  { path: '/metodo', label: 'Cómo aprender', icon: 'sparkle' },
  { path: '/shadowing', label: 'Shadowing', icon: 'mic' },
  { path: '/hablar', label: 'Conversación', icon: 'chat' },
  { path: '/progreso', label: 'Progreso', icon: 'chart' },
];

const store = createStore();
const timer = createTimer(store);
let data = null;
let cleanup = null;

const main = document.getElementById('main');

// ---------------------------------------------------------------------------
// Ajustes visuales
// ---------------------------------------------------------------------------

function applySettings() {
  const s = store.get().settings;
  const root = document.documentElement;
  root.dataset.theme = 'dark'; // el sistema de diseño es oscuro
  root.style.setProperty('--fs', String(s.fontScale));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#090D16');
}

// ---------------------------------------------------------------------------
// Contexto compartido con las vistas
// ---------------------------------------------------------------------------

const ctx = {
  store,
  timer,
  get data() { return data; },
  toast,
  announce,
  /** Lee un texto en inglés con la velocidad y la voz elegidas. */
  speak(text, opts = {}) {
    const st = store.get().settings;
    return ttsSpeak(text, { rate: st.speed, voiceURI: st.voice, ...opts });
  },
  stopSpeech: cancelSpeech,
  /** Guarda la valoración "muy fácil / justo / difícil" y devuelve un mensaje sobre lo que cambiará. */
  rate(kind, key, difficulty, rating, { silent = false } = {}) {
    const before = store.get().level[kind];
    store.update((s) => applyRating(s, kind, key, difficulty, rating));
    const after = store.get().level[kind];
    let msg;
    if (after > before + 0.03) msg = 'Anotado. La próxima vez te propondré algo un poco más exigente.';
    else if (after < before - 0.03) msg = 'Anotado. La próxima vez te propondré algo más sencillo.';
    else if (rating === 'hard' && after <= 1) msg = 'Anotado. Ya te muestro lo más sencillo disponible; este contenido volverá más adelante para repasarlo.';
    else if (rating === 'easy' && after >= 3) msg = 'Anotado. Ya te muestro lo más exigente disponible.';
    else msg = `Anotado. Mantengo la dificultad ${levelWord(after)}.`;
    if (!silent) toast(msg);
    return msg;
  },
  /**
   * Registra un acierto o fallo en una estructura gramatical.
   * Si el fallo es recurrente, agrega la mini explicación dentro de `container`.
   */
  grammar(tag, ok, container) {
    if (!tag) return;
    let shown = null;
    store.update((s) => {
      if (ok) recordSuccess(s, tag);
      else shown = recordFail(s, tag);
    });
    const tip = shown && data.grammarById[shown];
    if (tip && container) {
      container.append(grammarTip(tip, { onPlay: (t) => ctx.speak(t) }));
      announce(`Mini explicación de gramática: ${tip.title}`);
    }
  },
  navigate(path) { location.hash = `#${path}`; },
  /** Vuelve a dibujar la pantalla actual. */
  reload() { route(); },
  /** Reaplica tema y tamaño de letra tras cambiar ajustes o importar datos. */
  refreshChrome() { applySettings(); updateStatus(); },
};

// ---------------------------------------------------------------------------
// Navegación y enrutador
// ---------------------------------------------------------------------------

let currentNav = '';
let moreBtn = null;
let moreMenu = null;

function buildChrome() {
  const nav = document.getElementById('nav');
  clear(nav);
  const list = h('div', { class: 'nav-pills' }, h('span', { class: 'nav-ind', 'aria-hidden': 'true' }));
  for (const item of NAV) {
    list.append(h('a', { href: `#${item.path}`, dataset: { path: item.path } }, icon(item.icon, 18), h('span', { text: item.label })));
  }
  moreMenu = h('div', { class: 'more-menu', id: 'more-menu', hidden: true },
    MORE.map((item) => h('a', { href: `#${item.path}`, dataset: { path: item.path }, onClick: closeMore }, icon(item.icon, 18), h('span', { text: item.label }))));
  moreBtn = h('button', { type: 'button', class: 'nav-more', 'aria-expanded': 'false', 'aria-controls': 'more-menu', onClick: () => (moreMenu.hidden ? openMore() : closeMore()) },
    h('span', { text: 'Más' }), h('span', { class: 'chev', 'aria-hidden': 'true', text: '▾' }));
  list.append(h('div', { class: 'nav-more-wrap' }, moreBtn, moreMenu));
  nav.append(list);
  document.addEventListener('pointerdown', (e) => { if (!moreMenu.hidden && !e.target.closest('.nav-more-wrap')) closeMore(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !moreMenu.hidden) { closeMore(); moreBtn.focus(); } });
  window.addEventListener('resize', () => placeIndicator());
  updateStatus();
  let raf = 0;
  store.subscribe(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(updateStatus); });
}

function openMore() { moreMenu.hidden = false; moreBtn.setAttribute('aria-expanded', 'true'); }
function closeMore() { if (!moreMenu) return; moreMenu.hidden = true; moreBtn.setAttribute('aria-expanded', 'false'); }

/** Panel de estado: racha, nivel y meta diaria de lectura. */
function updateStatus() {
  const box = document.getElementById('status');
  if (!box) return;
  const st = store.get();
  const streak = computeStreak(st.days);
  const read = (st.days[todayStr()]?.input || 0) / 60;
  const goal = st.settings.dailyGoal;
  const pct = Math.min(100, Math.round((read / goal) * 100));
  const level = cefr(st.level.input);
  clear(box).append(
    h('span', { class: 'st-streak', title: 'Días seguidos estudiando' }, icon('flame', 16), h('strong', { text: String(streak) }), h('span', { class: 'st-unit', text: streak === 1 ? 'día' : 'días' })),
    h('span', { class: `st-level lv-${level.toLowerCase()}`, title: 'Tu nivel de lectura actual' }, h('span', { class: 'sr-only', text: 'Nivel ' }), level),
    h('a', { class: `st-goal${pct >= 100 ? ' met' : ''}`, href: '#/progreso', title: 'Meta diaria de lectura' },
      h('span', { class: 'st-goal-top' }, h('span', { text: 'Meta diaria' }), h('strong', { text: `${pct}%` })),
      h('span', { class: 'st-goal-bar', role: 'progressbar', 'aria-label': `Meta diaria de lectura: ${Math.floor(read)} de ${goal} minutos`, 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct) },
        h('span', { style: `width:${pct}%` }))));
  const lect = document.querySelector('.nav-pills a[data-path="/leer"]');
  const last = data ? lastStoryId(st, data) : null;
  if (lect) lect.setAttribute('href', last ? `#/leer/${last}` : '#/leer');
}

function placeIndicator() {
  const ind = document.querySelector('.nav-ind');
  if (!ind) return;
  const active = document.querySelector(`.nav-pills > a[data-path="${currentNav}"]`) || (MORE.some((m) => m.path === currentNav) ? moreBtn : null);
  if (!active) { ind.style.opacity = '0'; return; }
  const left = active.getBoundingClientRect().left - ind.parentElement.getBoundingClientRect().left - ind.parentElement.clientLeft;
  ind.style.opacity = '1';
  ind.style.width = `${active.offsetWidth}px`;
  ind.style.transform = `translateX(${left + ind.parentElement.scrollLeft}px)`;
}

function markNav(path) {
  currentNav = path;
  document.querySelectorAll('[data-path]').forEach((a) => {
    if (a.dataset.path === path) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  moreBtn?.classList.toggle('is-active', MORE.some((m) => m.path === path));
  closeMore();
  placeIndicator();
  document.querySelector('.nav-pills > a[aria-current], .nav-more.is-active')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
}

function currentPath() {
  const raw = location.hash.replace(/^#/, '') || '/';
  return raw.split('?')[0];
}

async function route() {
  if (typeof cleanup === 'function') { try { cleanup(); } catch { /* vista ya cerrada */ } }
  cleanup = null;
  cancelSpeech();
  const path = currentPath();
  const match = ROUTES.map((r) => ({ r, m: r.re.exec(path) })).find((x) => x.m);
  clear(main);
  main.className = '';
  if (!match) {
    main.append(h('h1', { id: 'page-title', tabindex: '-1', text: 'Página no encontrada' }), h('p', {}, h('a', { href: '#/', text: 'Volver al inicio' })));
    timer.setCategory(null);
    document.title = 'Página no encontrada · Inglés con input';
    markNav('');
    document.getElementById('page-title')?.focus({ preventScroll: true });
    announce('Página no encontrada');
    return;
  }
  const { r, m } = match;
  timer.setCategory(r.cat || null);
  markNav(r.nav);
  document.title = `${r.title} · Inglés con input`;
  try {
    cleanup = r.view.render(main, ctx, { id: m[1] }) || null;
  } catch (e) {
    console.error(e);
    main.append(notice('Algo salió mal al mostrar esta pantalla. Recarga la página; tu progreso está a salvo.', 'warn', 'Error'));
  }
  window.scrollTo(0, 0);
  const title = document.getElementById('page-title');
  if (title) title.focus({ preventScroll: true });
  announce(r.title);
}

async function start() {
  applySettings();
  buildChrome();
  document.querySelector('.skip-link')?.addEventListener('click', (event) => {
    event.preventDefault();
    main.focus({ preventScroll: true });
    main.scrollIntoView({ block: 'start' });
  });
  try {
    data = await loadData();
  } catch (e) {
    console.error(e);
    clear(main);
    main.append(
      h('h1', { text: 'No se pudo cargar el contenido' }),
      notice(location.protocol === 'file:'
        ? 'Abriste el archivo directamente desde el disco, y el navegador bloquea la carga de los archivos JSON. Sirve la carpeta con un servidor local (por ejemplo: python3 -m http.server) y abre http://localhost:8000.'
        : 'Revisa tu conexión y recarga la página. Si el problema continúa, verifica que la carpeta data/ esté publicada junto con la app.', 'warn'),
    );
    return;
  }
  onBusyChange((b) => timer.setBusy(b));
  timer.start();
  window.addEventListener('hashchange', route);
  window.addEventListener('beforeunload', () => { timer.flush(); store.flush(); });
  updateStatus();
  document.fonts?.ready.then(placeIndicator);
  route();
}

start();
