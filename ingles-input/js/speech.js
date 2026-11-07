// Voz: síntesis (speechSynthesis) y reconocimiento (SpeechRecognition).

const win = typeof window !== 'undefined' ? window : {};
const synth = win.speechSynthesis;

export const ttsSupported = !!(synth && win.SpeechSynthesisUtterance);
export const sttSupported = !!(win.SpeechRecognition || win.webkitSpeechRecognition);

let voices = [];
function loadVoices() {
  if (!ttsSupported) return;
  voices = synth.getVoices() || [];
}
if (ttsSupported) {
  loadVoices();
  synth.addEventListener?.('voiceschanged', loadVoices);
}

export function englishVoices() {
  loadVoices();
  return voices.filter((v) => /^en([-_]|$)/i.test(v.lang));
}

/** Elige la voz preferida del usuario o la mejor voz en inglés disponible. */
export function pickVoice(voiceURI = '') {
  const list = englishVoices();
  if (!list.length) return null;
  if (voiceURI) {
    const chosen = list.find((v) => v.voiceURI === voiceURI);
    if (chosen) return chosen;
  }
  return (
    list.find((v) => /^en[-_]US$/i.test(v.lang) && v.localService) ||
    list.find((v) => /^en[-_]US$/i.test(v.lang)) ||
    list.find((v) => /^en[-_]GB$/i.test(v.lang)) ||
    list[0]
  );
}

let currentId = 0;
let keepAlive = null; // evita que el navegador recoja el objeto antes de terminar de hablar
let fallbackTimers = [];
let busyListener = null;

/** Permite al temporizador de estudio saber si hay audio sonando. */
export function onBusyChange(fn) { busyListener = fn; }

function clearFallback() {
  fallbackTimers.forEach(clearTimeout);
  fallbackTimers = [];
}

export function cancelSpeech() {
  currentId++;
  clearFallback();
  if (ttsSupported) synth.cancel();
  busyListener?.(false);
}

export function isSpeaking() {
  return ttsSupported && synth.speaking;
}

/**
 * Lee un texto en inglés.
 * onWord(charIndex, charLength) se llama para cada palabra; si el navegador no emite eventos de palabra,
 * se estima el avance según la velocidad.
 * Devuelve una función para cancelar.
 */
export function speak(text, { rate = 0.9, voiceURI = '', onStart, onWord, onEnd } = {}) {
  if (!ttsSupported) {
    onEnd?.({ ok: false });
    return () => {};
  }
  cancelSpeech();
  const id = ++currentId;
  const u = new win.SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = Math.min(1, Math.max(0.5, rate));
  const voice = pickVoice(voiceURI);
  if (voice) { u.voice = voice; u.lang = voice.lang; }
  let gotBoundary = false;

  const finish = (ok) => {
    if (id !== currentId) return;
    clearFallback();
    keepAlive = null;
    busyListener?.(false);
    onEnd?.({ ok });
  };

  u.onstart = () => {
    if (id !== currentId) return;
    busyListener?.(true);
    onStart?.();
    if (onWord) {
      fallbackTimers.push(setTimeout(() => {
        if (id !== currentId || gotBoundary) return;
        estimateWords(text, u.rate, (i, len) => { if (id === currentId && !gotBoundary) onWord(i, len); });
      }, 700));
    }
  };
  u.onboundary = (e) => {
    if (id !== currentId) return;
    if (e.name && e.name !== 'word') return;
    gotBoundary = true;
    clearFallback();
    let len = e.charLength;
    if (!len) {
      const m = /^[\w'’-]+/.exec(text.slice(e.charIndex));
      len = m ? m[0].length : 1;
    }
    onWord?.(e.charIndex, len);
  };
  u.onend = () => finish(true);
  u.onerror = (e) => {
    if (e.error === 'interrupted' || e.error === 'canceled') return;
    finish(false);
  };
  keepAlive = u;
  synth.speak(u);
  return () => { if (id === currentId) cancelSpeech(); };
}

/** Estima el momento de cada palabra cuando el navegador no da eventos de límite de palabra. */
function estimateWords(text, rate, cb) {
  const re = /[\w'’-]+/g;
  const items = [];
  let m;
  while ((m = re.exec(text))) items.push({ i: m.index, len: m[0].length });
  const perWord = 0.42 / Math.max(0.5, rate); // segundos por palabra aproximados
  let t = 0;
  const total = items.reduce((a, it) => a + it.len + 2, 0);
  const totalSec = Math.max(1, items.length * perWord);
  for (const it of items) {
    const when = t;
    fallbackTimers.push(setTimeout(() => cb(it.i, it.len), when * 1000));
    t += ((it.len + 2) / total) * totalSec;
  }
}

// ---------------------------------------------------------------------------
// Reconocimiento de voz
// ---------------------------------------------------------------------------

const ERRORS = {
  'not-allowed': 'No hay permiso para usar el micrófono. Actívalo en el candado de la barra de direcciones y vuelve a intentar.',
  'service-not-allowed': 'El navegador no permite el reconocimiento de voz en este momento.',
  'no-speech': 'No se escuchó nada. Acércate al micrófono y vuelve a intentar.',
  'audio-capture': 'No se encontró un micrófono disponible.',
  network: 'El reconocimiento de voz necesita conexión a internet en este navegador.',
  aborted: '',
};

export function describeSttError(code) {
  return ERRORS[code] ?? 'No se pudo reconocer la voz. Intenta de nuevo.';
}

/**
 * Escucha una frase. Devuelve { stop() }.
 * onInterim(texto) con resultados parciales; onDone({ text, error }) al terminar.
 */
export function listen({ lang = 'en-US', onInterim, onStart, onDone } = {}) {
  const Rec = win.SpeechRecognition || win.webkitSpeechRecognition;
  if (!Rec) {
    onDone?.({ text: '', error: 'unsupported' });
    return { stop() {} };
  }
  cancelSpeech(); // el micrófono no debe captar la voz de la app
  const rec = new Rec();
  rec.lang = lang;
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  let finalText = '';
  let lastText = '';
  let error = null;
  let done = false;

  rec.onstart = () => onStart?.();
  rec.onresult = (e) => {
    let interim = '';
    finalText = '';
    for (let i = 0; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript + ' ';
      else interim += r[0].transcript + ' ';
    }
    lastText = (finalText + interim).trim();
    onInterim?.(lastText);
  };
  rec.onerror = (e) => { error = e.error || 'error'; };
  rec.onend = () => {
    if (done) return;
    done = true;
    onDone?.({ text: (finalText.trim() || lastText).trim(), error: error === 'aborted' ? null : error });
  };
  try {
    rec.start();
  } catch {
    done = true;
    onDone?.({ text: '', error: 'error' });
  }
  return { stop() { try { rec.stop(); } catch { /* ya detenido */ } } };
}
