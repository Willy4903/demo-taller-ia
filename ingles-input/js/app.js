// Punto de entrada: carga datos, aplica ajustes, arma la navegación y el enrutador por hash.
import { h, clear } from './util.js';
import { createStore } from './store.js';
import { loadData } from './data.js';
import { createTimer } from './timer.js';
import { icon, toast, announce, notice, grammarTip } from './ui.js';
import { speak as ttsSpeak, cancelSpeech, onBusyChange } from './speech.js';
import { applyRating, levelWord } from './adapt.js';
import { recordFail, recordSuccess } from './grammar.js';

import * as home from './views/home.js?v=studio-1';
import * as stories from './views/stories.js';
import * as shadowing from './views/shadowing.js';
import * as vocab from './views/vocab.js';
import * as conversation from './views/conversation.js';
import * as progress from './views/progress.js';
import * as grammarView from './views/grammar.js';
import * as settings from './views/settings.js';

const ROUTES = [
  { re: /^\/?$/, view: home, title: 'Inicio', nav: '/' },
  { re: /^\/leer(?:\/([\w-]+))?$/, view: stories, title: 'Escuchar y leer', nav: '/leer', cat: 'input' },
  { re: /^\/shadowing$/, view: shadowing, title: 'Shadowing', nav: '/shadowing', cat: 'shadowing' },
  { re: /^\/tarjetas$/, view: vocab, title: 'Vocabulario', nav: '/tarjetas', cat: 'review' },
  { re: /^\/hablar(?:\/([\w-]+))?$/, view: conversation, title: 'Conversación', nav: '/hablar', cat: 'convo' },
  { re: /^\/progreso$/, view: progress, title: 'Progreso', nav: '/progreso' },
  { re: /^\/gramatica$/, view: grammarView, title: 'Gramática de apoyo', nav: '/gramatica' },
  { re: /^\/ajustes$/, view: settings, title: 'Ajustes y datos', nav: '/ajustes' },
];

const NAV = [
  { path: '/', label: 'Inicio', icon: 'home' },
  { path: '/leer', label: 'Leer', icon: 'book' },
  { path: '/shadowing', label: 'Shadowing', icon: 'mic' },
  { path: '/tarjetas', label: 'Tarjetas', icon: 'cards' },
  { path: '/hablar', label: 'Hablar', icon: 'chat' },
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
  if (s.theme === 'auto') delete root.dataset.theme;
  else root.dataset.theme = s.theme;
  root.style.setProperty('--fs', String(s.fontScale));
  const dark = s.theme === 'dark' || (s.theme === 'auto' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#111c1a' : '#f6f4ed');
}

function effectiveDark() {
  const s = store.get().settings.theme;
  return s === 'dark' || (s === 'auto' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
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
  refreshChrome() { applySettings(); updateThemeButton(); },
};

// ---------------------------------------------------------------------------
// Navegación y enrutador
// ---------------------------------------------------------------------------

function buildChrome() {
  const nav = document.getElementById('nav');
  clear(nav);
  for (const item of NAV) nav.append(h('a', { href: `#${item.path}`, dataset: { path: item.path } }, icon(item.icon, 22), h('span', { text: item.label })));

  const top = document.getElementById('top-actions');
  clear(top);
  top.append(
    h('a', { class: 'icon-btn', href: '#/gramatica', 'aria-label': 'Gramática de apoyo', title: 'Gramática de apoyo', dataset: { path: '/gramatica' } }, icon('bulb', 22)),
    h('button', { type: 'button', class: 'icon-btn', id: 'theme-btn', onClick: toggleTheme }),
    h('a', { class: 'icon-btn', href: '#/ajustes', 'aria-label': 'Ajustes y datos', title: 'Ajustes y datos', dataset: { path: '/ajustes' } }, icon('settings', 22)),
  );
  updateThemeButton();
}

function updateThemeButton() {
  const b = document.getElementById('theme-btn');
  if (!b) return;
  clear(b);
  const dark = effectiveDark();
  b.append(icon(dark ? 'sun' : 'moon', 22));
  b.setAttribute('aria-label', dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  b.title = b.getAttribute('aria-label');
}

function toggleTheme() {
  store.update((s) => { s.settings.theme = effectiveDark() ? 'light' : 'dark'; });
  applySettings();
  updateThemeButton();
}

function markNav(path) {
  document.querySelectorAll('[data-path]').forEach((a) => {
    if (a.dataset.path === path) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
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
  main.classList.remove('home-page');
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
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => { applySettings(); updateThemeButton(); });
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
  route();
}

start();
