// Ajustes, datos (exportar, importar, borrar) y compatibilidad del navegador.
import { h, clear, todayStr } from '../util.js';
import { btn, pageHeader, notice } from '../ui.js';
import { ttsSupported, sttSupported, englishVoices } from '../speech.js';
import { isValidEndpoint } from '../ai.js';

export function render(root, ctx) {
  const { store } = ctx;
  const st = () => store.get().settings;
  const set = (fn) => { store.update((s) => fn(s.settings)); ctx.refreshChrome(); };

  root.append(pageHeader('Ajustes y datos'));

  // --- Apariencia
  const theme = h('select', { id: 'theme', onChange: (e) => set((s) => { s.theme = e.target.value; }) },
    h('option', { value: 'auto', text: 'Automático (según tu dispositivo)' }),
    h('option', { value: 'light', text: 'Claro' }),
    h('option', { value: 'dark', text: 'Oscuro' }));
  theme.value = st().theme;
  const fontOut = h('output', { for: 'font', text: `${Math.round(st().fontScale * 100)}%` });
  const font = h('input', { id: 'font', type: 'range', min: '0.9', max: '1.4', step: '0.05', value: String(st().fontScale), onInput: (e) => { fontOut.textContent = `${Math.round(e.target.value * 100)}%`; set((s) => { s.fontScale = Number(e.target.value); }); } });

  root.append(h('section', { class: 'card' },
    h('h2', { text: 'Apariencia' }),
    h('div', { class: 'field' }, h('label', { for: 'theme', text: 'Tema' }), theme),
    h('div', { class: 'field' }, h('label', { for: 'font', text: 'Tamaño de letra' }), h('div', { class: 'row' }, font, fontOut))));

  // --- Estudio
  const speedOut = h('output', { for: 'speed', text: `${st().speed.toFixed(2)}x` });
  const speed = h('input', { id: 'speed', type: 'range', min: '0.7', max: '1', step: '0.05', value: String(st().speed), onInput: (e) => { speedOut.textContent = `${Number(e.target.value).toFixed(2)}x`; set((s) => { s.speed = Number(e.target.value); }); } });
  const voice = h('select', { id: 'voice', onChange: (e) => set((s) => { s.voice = e.target.value; }) }, h('option', { value: '', text: 'Automática' }));
  const fillVoices = () => {
    const keep = st().voice;
    clear(voice).append(h('option', { value: '', text: 'Automática' }));
    for (const v of englishVoices()) voice.append(h('option', { value: v.voiceURI, text: `${v.name} (${v.lang})` }));
    voice.value = keep;
  };
  fillVoices();
  if (ttsSupported) window.speechSynthesis.addEventListener?.('voiceschanged', fillVoices);
  const perDay = h('input', { id: 'perday', type: 'number', min: '0', max: '30', value: String(st().newPerDay), onChange: (e) => { const v = Math.max(0, Math.min(30, Math.round(Number(e.target.value) || 0))); e.target.value = String(v); set((s) => { s.newPerDay = v; }); } });

  root.append(h('section', { class: 'card' },
    h('h2', { text: 'Estudio' }),
    h('div', { class: 'field' }, h('label', { for: 'speed', text: 'Velocidad del audio por defecto' }), h('div', { class: 'row' }, speed, speedOut)),
    ttsSupported ? h('div', { class: 'field' }, h('label', { for: 'voice', text: 'Voz en inglés' }), voice, h('span', { class: 'hint', text: 'Las voces disponibles dependen de tu dispositivo.' }),
      btn('Probar voz', { icon: 'volume', onClick: () => ctx.speak('Hello! This is how I sound.') })) : null,
    h('div', { class: 'field' }, h('label', { for: 'perday', text: 'Frases nuevas por día en las tarjetas' }), perDay)));

  // --- IA opcional
  const aiOn = h('input', { id: 'ai-on', type: 'checkbox', checked: st().aiEnabled || undefined, onChange: (e) => set((s) => { s.aiEnabled = e.target.checked; }) });
  const aiUrl = h('input', { id: 'ai-url', type: 'url', placeholder: 'https://tu-backend.example.com/feedback', value: st().aiEndpoint, autocomplete: 'off', 'aria-describedby': 'ai-help' });
  const aiMsg = h('p', { class: 'small', 'aria-live': 'polite' });
  aiUrl.addEventListener('change', () => {
    const v = aiUrl.value.trim();
    if (v && !isValidEndpoint(v)) { aiMsg.textContent = 'La URL debe empezar con https:// (o http://localhost para pruebas).'; return; }
    aiMsg.textContent = v ? 'Endpoint guardado.' : '';
    set((s) => { s.aiEndpoint = v; });
  });
  root.append(h('section', { class: 'card' },
    h('h2', { text: 'Comentarios de IA (opcional)' }),
    h('p', { id: 'ai-help', class: 'muted', text: 'Si tienes un backend propio, la conversación guiada puede pedirle un comentario sobre tu respuesta. La app nunca guarda claves: la clave de la IA vive solo en tu servidor. Consulta el README para el contrato y un ejemplo.' }),
    h('div', { class: 'row' }, aiOn, h('label', { for: 'ai-on', text: 'Activar comentarios de IA' })),
    h('div', { class: 'field', style: 'margin-top:.75rem' }, h('label', { for: 'ai-url', text: 'URL de tu endpoint' }), aiUrl, aiMsg)));

  // --- Datos
  const dataMsg = h('div', { 'aria-live': 'polite' });
  const file = h('input', { type: 'file', accept: 'application/json,.json', class: 'sr-only', id: 'import-file', tabindex: '-1', 'aria-label': 'Archivo de progreso a importar', onChange: async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const text = await f.text();
      if (!window.confirm('Importar reemplazará todo tu progreso actual en este navegador. ¿Continuar?')) return;
      store.importJson(text);
      ctx.refreshChrome();
      ctx.reload();
      ctx.toast('Progreso importado correctamente.');
    } catch (err) {
      clear(dataMsg).append(notice(err.message, 'warn', 'No se pudo importar'));
    }
  } });
  root.append(h('section', { class: 'card' },
    h('h2', { text: 'Tus datos' }),
    h('p', { class: 'muted', text: 'Todo se guarda solo en este navegador (localStorage). No hay cuentas ni servidores. Para cambiar de dispositivo o hacer una copia, exporta un archivo JSON e impórtalo donde quieras.' }),
    store.persistent ? null : notice('El almacenamiento de este navegador no está disponible, por eso el progreso no se conserva.', 'warn'),
    h('div', { class: 'row' },
      btn('Exportar progreso', { icon: 'download', variant: 'primary', onClick: exportData }),
      btn('Importar progreso', { icon: 'upload', onClick: () => file.click() }),
      btn('Borrar todo', { icon: 'trash', variant: 'danger', onClick: () => {
        if (window.confirm('Se borrará todo tu progreso de este navegador y no se puede deshacer. ¿Seguro? Te recomendamos exportar una copia antes.')) {
          store.reset();
          ctx.refreshChrome();
          ctx.reload();
        }
      } })),
    file, dataMsg));

  // --- Compatibilidad
  const row = (label, ok, extra) => h('li', {}, h('strong', { text: `${label}: ` }), ok ? 'disponible' : 'no disponible', extra ? h('span', { class: 'muted', text: ` (${extra})` }) : null);
  root.append(h('section', { class: 'card' },
    h('h2', { text: 'Compatibilidad de tu navegador' }),
    h('ul', {},
      row('Voz en inglés (audio)', ttsSupported, ttsSupported ? `${englishVoices().length} voces en inglés` : 'prueba Chrome, Edge o Safari'),
      row('Reconocimiento de voz (micrófono)', sttSupported, sttSupported ? '' : 'Firefox no lo incluye'),
      row('Guardado de progreso', store.persistent))));

  function exportData() {
    const blob = new Blob([store.exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: `ingles-input-progreso-${todayStr()}.json` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    ctx.toast('Copia exportada.');
  }
}
