// Estado de la app guardado solo en localStorage, con exportación e importación en JSON.
import { todayStr, addDays } from './util.js';

export const STORAGE_KEY = 'ingles-input:v1';
export const APP_ID = 'ingles-input';
export const SCHEMA_VERSION = 1;

export const DEFAULTS = () => ({
  v: SCHEMA_VERSION,
  settings: {
    theme: 'auto', // auto | light | dark
    fontScale: 1, // 0.9 a 1.4
    speed: 0.85, // 0.65 a 1.25
    phonetics: false, // guía de pronunciación sobre cada palabra en el lector
    dailyGoal: 15, // meta diaria de lectura en minutos (5 a 120)
    voice: '', // voiceURI de la voz en inglés elegida ('' = automática)
    cardDirection: 'en-es', // en-es | es-en
    newPerDay: 8,
    aiEnabled: false,
    aiEndpoint: '',
  },
  level: { input: 1, shadowing: 1, convo: 1, vocab: 1 },
  ratings: {}, // 'story:s01' -> { last, n, at }
  days: {}, // 'YYYY-MM-DD' -> { input, shadowing, convo, review (segundos), done: { clave: true } }
  cards: {}, // id -> { ef, reps, interval, due, lapses, added }
  saved: {}, // palabra -> { word, es, sentence, sentenceEs, storyId, at }
  shadow: {}, // id de frase -> { best, attempts, last }
  convo: {}, // id de diálogo -> { runs, last }
  stories: {}, // id de historia -> { plays, last, pos, total, opened }
  grammar: { counts: {}, shown: {}, unlocked: [] },
});

const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
const num = (x, d, min, max) => (typeof x === 'number' && isFinite(x) ? Math.min(max, Math.max(min, x)) : d);

/** Mezcla datos desconocidos con los valores por defecto, descartando lo que no tenga la forma esperada. */
export function sanitize(raw) {
  const d = DEFAULTS();
  if (!isObj(raw)) return d;
  const s = isObj(raw.settings) ? raw.settings : {};
  d.settings.theme = ['auto', 'light', 'dark'].includes(s.theme) ? s.theme : d.settings.theme;
  d.settings.fontScale = num(s.fontScale, d.settings.fontScale, 0.9, 1.4);
  d.settings.speed = num(s.speed, d.settings.speed, 0.65, 1.25);
  d.settings.phonetics = s.phonetics === true;
  d.settings.dailyGoal = Math.round(num(s.dailyGoal, d.settings.dailyGoal, 5, 120));
  d.settings.voice = typeof s.voice === 'string' ? s.voice.slice(0, 200) : '';
  d.settings.cardDirection = s.cardDirection === 'es-en' ? 'es-en' : 'en-es';
  d.settings.newPerDay = Math.round(num(s.newPerDay, d.settings.newPerDay, 0, 30));
  d.settings.aiEnabled = s.aiEnabled === true;
  d.settings.aiEndpoint = typeof s.aiEndpoint === 'string' ? s.aiEndpoint.slice(0, 300) : '';

  if (isObj(raw.level)) {
    for (const k of Object.keys(d.level)) d.level[k] = num(raw.level[k], 1, 1, 3);
  }
  if (isObj(raw.ratings)) {
    for (const [k, r] of Object.entries(raw.ratings)) {
      if (isObj(r) && ['easy', 'fair', 'hard'].includes(r.last)) d.ratings[k] = { last: r.last, n: num(r.n, 1, 1, 9999), at: num(r.at, 0, 0, 1e15) };
    }
  }
  if (isObj(raw.days)) {
    for (const [k, v] of Object.entries(raw.days)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !isObj(v)) continue;
      const day = { input: 0, shadowing: 0, convo: 0, review: 0, done: {} };
      for (const c of ['input', 'shadowing', 'convo', 'review']) day[c] = num(v[c], 0, 0, 86400);
      if (isObj(v.done)) for (const c of ['input', 'shadowing', 'convo', 'review']) if (v.done[c] === true) day.done[c] = true;
      d.days[k] = day;
    }
  }
  if (isObj(raw.cards)) {
    for (const [k, c] of Object.entries(raw.cards)) {
      if (!isObj(c) || typeof c.due !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(c.due)) continue;
      d.cards[k] = {
        ef: num(c.ef, 2.5, 1.3, 4),
        reps: Math.round(num(c.reps, 0, 0, 999)),
        interval: Math.round(num(c.interval, 0, 0, 36500)),
        due: c.due,
        lapses: Math.round(num(c.lapses, 0, 0, 999)),
        added: typeof c.added === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.added) ? c.added : c.due,
      };
    }
  }
  if (isObj(raw.saved)) {
    for (const [k, w] of Object.entries(raw.saved)) {
      if (!isObj(w) || typeof w.word !== 'string') continue;
      d.saved[k] = {
        word: w.word.slice(0, 60),
        es: String(w.es ?? '').slice(0, 200),
        sentence: String(w.sentence ?? '').slice(0, 400),
        sentenceEs: String(w.sentenceEs ?? '').slice(0, 400),
        storyId: String(w.storyId ?? '').slice(0, 20),
        at: num(w.at, 0, 0, 1e15),
      };
    }
  }
  for (const key of ['shadow', 'convo', 'stories']) {
    if (isObj(raw[key])) {
      for (const [k, v] of Object.entries(raw[key])) if (isObj(v)) d[key][k] = JSON.parse(JSON.stringify(v));
    }
  }
  if (isObj(raw.grammar)) {
    const g = raw.grammar;
    if (isObj(g.counts)) for (const [k, v] of Object.entries(g.counts)) d.grammar.counts[k] = Math.round(num(v, 0, 0, 999));
    if (isObj(g.shown)) for (const [k, v] of Object.entries(g.shown)) d.grammar.shown[k] = num(v, 0, 0, 1e15);
    if (Array.isArray(g.unlocked)) d.grammar.unlocked = g.unlocked.filter((x) => typeof x === 'string').slice(0, 50);
  }
  return d;
}

function makeStorage() {
  try {
    const t = '__t';
    window.localStorage.setItem(t, '1');
    window.localStorage.removeItem(t);
    return window.localStorage;
  } catch {
    return null;
  }
}

export function createStore(storage = typeof window !== 'undefined' ? makeStorage() : null) {
  let state = DEFAULTS();
  let persistent = !!storage;
  const listeners = new Set();
  let saveTimer = null;

  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (raw) state = sanitize(JSON.parse(raw));
  } catch {
    state = DEFAULTS();
  }

  function persist() {
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
      persistent = true;
    } catch {
      persistent = false;
    }
  }

  function schedule() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 150);
  }

  return {
    get: () => state,
    get persistent() { return persistent; },
    /** Aplica un cambio y guarda. */
    update(fn) {
      fn(state);
      schedule();
      listeners.forEach((l) => l(state));
    },
    flush() { clearTimeout(saveTimer); persist(); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    /** Día de hoy en el registro (se crea si no existe). */
    today() {
      const k = todayStr();
      if (!state.days[k]) state.days[k] = { input: 0, shadowing: 0, convo: 0, review: 0, done: {} };
      return state.days[k];
    },
    exportJson() {
      this.flush();
      return JSON.stringify({ app: APP_ID, version: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data: state }, null, 2);
    },
    /** Reemplaza todo el progreso con el contenido de un archivo exportado. Lanza Error si el archivo no es válido. */
    importJson(text) {
      let parsed;
      try { parsed = JSON.parse(text); } catch { throw new Error('El archivo no es un JSON válido.'); }
      if (!isObj(parsed) || parsed.app !== APP_ID || !isObj(parsed.data)) throw new Error('Este archivo no parece una copia de seguridad de esta app.');
      if (typeof parsed.version === 'number' && parsed.version > SCHEMA_VERSION) throw new Error('El archivo viene de una versión más nueva de la app.');
      state = sanitize(parsed.data);
      persist();
      listeners.forEach((l) => l(state));
    },
    reset() {
      state = DEFAULTS();
      persist();
      listeners.forEach((l) => l(state));
    },
  };
}

// ---------------------------------------------------------------------------
// Cálculos derivados del registro diario
// ---------------------------------------------------------------------------

export const CATEGORIES = ['input', 'shadowing', 'convo', 'review'];
export const PLAN_MINUTES = { input: 15, shadowing: 10, convo: 10, review: 5 };
/** Minutos mínimos de estudio para que un día cuente en la racha. */
export const STREAK_MIN_MINUTES = 5;

export function dayMinutes(day) {
  if (!day) return 0;
  return CATEGORIES.reduce((a, c) => a + (day[c] || 0), 0) / 60;
}

export function dayCounts(day) {
  return dayMinutes(day) >= STREAK_MIN_MINUTES;
}

/** Racha diaria: días consecutivos que cuentan, terminando hoy (o ayer, si hoy aún no estudias). */
export function computeStreak(days, today = todayStr()) {
  let cursor = dayCounts(days[today]) ? today : addDays(today, -1);
  let n = 0;
  while (dayCounts(days[cursor])) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

export function totalMinutes(days) {
  return Object.values(days).reduce((a, d) => a + dayMinutes(d), 0);
}
