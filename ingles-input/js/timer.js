// Cuenta el tiempo de estudio real: solo suma mientras la pestaña está visible y hay actividad (o audio sonando).

const IDLE_MS = 90 * 1000;
const FLUSH_EVERY = 10; // segundos

export function createTimer(store) {
  let category = null;
  let pending = 0;
  let lastActivity = Date.now();
  let busy = false;
  let handle = null;

  const touch = () => { lastActivity = Date.now(); };

  function flush() {
    if (!pending) return;
    const secs = pending;
    const cat = category;
    pending = 0;
    if (!cat) return;
    store.update(() => {
      const d = store.today();
      d[cat] = Math.min(86400, (d[cat] || 0) + secs);
    });
  }

  function tick() {
    if (!category) return;
    if (document.visibilityState !== 'visible') return;
    if (!busy && Date.now() - lastActivity > IDLE_MS) return;
    pending += 1;
    if (pending >= FLUSH_EVERY) flush();
  }

  return {
    start() {
      ['pointerdown', 'keydown', 'input', 'scroll', 'touchstart'].forEach((ev) => window.addEventListener(ev, touch, { passive: true, capture: true }));
      document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') { flush(); store.flush(); } else touch(); });
      window.addEventListener('pagehide', () => { flush(); store.flush(); });
      handle = setInterval(tick, 1000);
    },
    stop() { clearInterval(handle); flush(); },
    /** Define a qué categoría suma el tiempo ('input', 'shadowing', 'convo', 'review' o null). */
    setCategory(cat) { flush(); category = cat; touch(); },
    setBusy(b) { busy = b; if (b) touch(); },
    touch,
    flush,
  };
}
