// Prueba de extremo a extremo con Playwright (Chromium) y voz simulada.
// Uso:  node tests/e2e.cjs            (requiere el paquete "playwright"; ver README)
// Variables: SHOTS=carpeta  para guardar capturas de pantalla.
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const SHOTS = process.env.SHOTS;

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent(req.url.split('?')[0]);
      const file = path.join(ROOT, url === '/' ? 'index.html' : url);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('no'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

const SPEECH_MOCK = `
  window.__spoken = [];
  window.__sttText = 'hello';
  class Utt { constructor(t) { this.text = t; this.rate = 1; } }
  window.SpeechSynthesisUtterance = Utt;
  const synth = {
    speaking: false, _t: [],
    getVoices() { return [{ name: 'Mock', lang: 'en-US', voiceURI: 'mock', localService: true }]; },
    addEventListener() {},
    cancel() { this._t.forEach(clearTimeout); this._t = []; this.speaking = false; },
    speak(u) {
      window.__spoken.push(u.text); this.speaking = true;
      this._t.push(setTimeout(() => {
        u.onstart && u.onstart({});
        const re = /[\\w'’-]+/g; let m, i = 0;
        while ((m = re.exec(u.text))) {
          i++;
          if (window.__noBoundary) continue;
          const idx = m.index, len = m[0].length;
          this._t.push(setTimeout(() => u.onboundary && u.onboundary({ name: 'word', charIndex: idx, charLength: len }), 25 * i));
        }
        this._t.push(setTimeout(() => { this.speaking = false; u.onend && u.onend({}); }, (window.__noBoundary ? 200 : 25) * (i + 2)));
      }, 5));
    },
  };
  Object.defineProperty(window, 'speechSynthesis', { value: synth });
  class Rec {
    start() { setTimeout(() => { this.onstart && this.onstart(); const r = [{ transcript: window.__sttText }]; r.isFinal = true; this.onresult && this.onresult({ results: [r] }); setTimeout(() => this.onend && this.onend(), 30); }, 30); }
    stop() { this.onend && this.onend(); }
  }
  window.SpeechRecognition = Rec;
  window.webkitSpeechRecognition = Rec;
`;

async function shot(page, name) {
  if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, `${name}.png`) }); }
}

(async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  const errors = [];
  const watch = (page) => {
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  };

  // ---------------------------------------------------------------- Escritorio con voz
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 }, permissions: ['microphone'] });
  await ctx.addInitScript(SPEECH_MOCK);
  const page = await ctx.newPage();
  watch(page);
  await page.goto(base);
  await page.waitForSelector('text=Tu plan de hoy');
  await shot(page, '01-inicio');
  console.log('ok inicio');

  // Historia: audio con resaltado, traducción, palabra guardada y valoración
  await page.click('nav >> text=Leer');
  await page.waitForSelector('text=Hi, my name is Ana');
  await shot(page, '02-lista-historias');
  await page.click('text=Hi, my name is Ana');
  await page.waitForSelector('.story');
  await page.click('text=Escuchar historia');
  await page.waitForSelector('.w.is-current', { timeout: 3000 });
  await page.waitForSelector('text=Escuchar historia', { timeout: 20000 });
  assert.ok((await page.evaluate(() => window.__spoken.length)) >= 12, 'se leyeron todas las oraciones');
  await page.click('button[aria-label="Mostrar traducción de la oración 1"]');
  assert.equal(await page.locator('.sent-es').first().isVisible(), true);
  await page.click('.w >> text=live');
  await page.waitForSelector('.word-sheet:not([hidden])');
  assert.match(await page.locator('.word-sheet').innerText(), /vivir/);
  await page.click('text=Guardar palabra');
  await shot(page, '03-historia');
  await page.click('.rate-hard');
  await page.waitForSelector('text=lo más sencillo disponible');
  await page.waitForSelector('text=Bajé la velocidad');
  console.log('ok historia');

  // Tarjetas
  await page.click('nav >> text=Tarjetas');
  await page.waitForSelector('text=Empezar repaso');
  await page.click('text=Empezar repaso');
  await page.waitForSelector('text=Mostrar respuesta');
  await shot(page, '04-tarjeta');
  await page.click('text=Mostrar respuesta');
  await page.waitForSelector('.rate-fair');
  await page.click('.rate-fair');
  await page.waitForSelector('text=Mostrar respuesta');
  await page.click('text=Terminar');
  await page.waitForSelector('text=Repaso interrumpido');
  await page.waitForTimeout(400); // el guardado se agrupa unos milisegundos
  const cards = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('ingles-input:v1')).cards).length);
  assert.ok(cards >= 8, `se crearon tarjetas nuevas (${cards})`);
  console.log('ok tarjetas');

  // Shadowing: dice la frase correcta, luego algo incorrecto tres veces para desbloquear gramática
  await page.click('nav >> text=Shadowing');
  await page.click('text=Empezar sesión');
  await page.waitForSelector('.phrase-en');
  const phrase = await page.locator('.phrase-en').innerText();
  await page.evaluate((t) => { window.__sttText = t.toLowerCase().replace(/[.,?!]/g, ''); }, phrase);
  await page.click('text=Grabar mi voz');
  await page.waitForSelector('.score.good');
  assert.match(await page.locator('.score .pct').innerText(), /100%/);
  await shot(page, '05-shadowing-ok');
  await page.evaluate(() => { window.__sttText = 'banana'; });
  for (let i = 0; i < 3; i++) {
    await page.click('text=Grabar otra vez');
    await page.waitForSelector('.score.low');
    await page.waitForTimeout(80);
  }
  await page.waitForSelector('.tip', { timeout: 3000 });
  await shot(page, '06-shadowing-gramatica');
  await page.click('.rate-hard');
  await page.waitForSelector('text=Frase 2 de 6');
  console.log('ok shadowing y gramática');

  // Conversación: respuesta correcta, incorrecta y final
  await page.click('nav >> text=Hablar');
  await page.click('text=Meeting someone new');
  await page.waitForSelector('.bubble.npc');
  await page.fill('#reply', 'banana');
  await page.click('text=Enviar');
  await page.waitForSelector('.feedback.bad');
  await page.click('text=Intentar de nuevo');
  await page.fill('#reply', 'My name is Luis');
  await page.click('text=Enviar');
  await page.waitForSelector('.feedback.good');
  await shot(page, '07-conversacion');
  await page.click('text=Continuar');
  await page.fill('#reply', "I'm from Peru");
  await page.click('text=Enviar');
  await page.click('text=Continuar');
  await page.fill('#reply', 'I study law');
  await page.click('text=Enviar');
  await page.click('text=Continuar');
  await page.fill('#reply', 'I study business');
  await page.click('text=Enviar');
  await page.click('text=Continuar');
  await page.fill('#reply', 'I like to play soccer');
  await page.click('text=Enviar');
  await page.waitForSelector('.feedback.good');
  await page.click('text=Continuar');
  await page.waitForSelector('text=Conversación completada');
  await page.click('.rate-easy');
  await page.waitForSelector('text=Siguiente:');
  console.log('ok conversación');

  // Progreso y exportación / importación
  await page.click('nav >> text=Progreso');
  await page.waitForSelector('text=Plan diario de 40 minutos');
  await shot(page, '08-progreso');
  await page.click('#chk-input');
  assert.equal(await page.locator('#chk-input').isChecked(), true);
  await page.goto(base + '#/ajustes');
  await page.waitForTimeout(400);
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('text=Exportar progreso')]);
  const exported = fs.readFileSync(await download.path(), 'utf8');
  const parsed = JSON.parse(exported);
  assert.equal(parsed.app, 'ingles-input');
  assert.ok(parsed.data.saved.live, 'palabra guardada exportada');
  assert.ok(Object.keys(parsed.data.ratings).length >= 3, 'valoraciones exportadas');
  await shot(page, '09-ajustes');

  // Importar en un contexto limpio
  const ctx2 = await browser.newContext({ viewport: { width: 400, height: 800 } });
  await ctx2.addInitScript(SPEECH_MOCK);
  const page2 = await ctx2.newPage();
  watch(page2);
  page2.on('dialog', (d) => d.accept());
  await page2.goto(base + '#/ajustes');
  await page2.waitForSelector('text=Tus datos');
  const tmp = path.join(require('os').tmpdir(), 'import-test.json');
  fs.writeFileSync(tmp, exported);
  await page2.setInputFiles('#import-file', tmp);
  await page2.waitForSelector('text=Progreso importado correctamente');
  const saved = await page2.evaluate(() => JSON.parse(localStorage.getItem('ingles-input:v1')).saved.live?.es);
  assert.equal(saved, 'vivir');
  fs.writeFileSync(tmp, '{"hola":1}');
  await page2.setInputFiles('#import-file', tmp);
  await page2.waitForSelector('text=No se pudo importar');
  console.log('ok exportar / importar');

  // Gramática desbloqueada visible
  await page.goto(base + '#/gramatica');
  await page.waitForSelector('.tip');
  await ctx.close();
  await ctx2.close();

  // ---------------------------------------------------------------- Móvil, modo oscuro, sin reconocimiento de voz
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark', hasTouch: true, isMobile: true });
  await mobile.addInitScript(SPEECH_MOCK + '\nwindow.SpeechRecognition = undefined; window.webkitSpeechRecognition = undefined;');
  const m = await mobile.newPage();
  watch(m);
  await m.goto(base);
  await m.waitForSelector('text=Reconocimiento de voz no disponible');
  await shot(m, '10-movil-oscuro-inicio');
  assert.equal(await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'sin scroll horizontal en móvil');
  await m.goto(base + '#/shadowing');
  await m.waitForSelector('text=Empezar sesión');
  await m.click('text=Empezar sesión');
  await m.waitForSelector('#said');
  const ph = await m.locator('.phrase-en').innerText();
  await m.fill('#said', ph);
  await m.click('text=Comparar');
  await m.waitForSelector('.score.good');
  await shot(m, '11-movil-shadowing-sin-mic');
  await m.goto(base + '#/leer/s01');
  await m.waitForSelector('.story');
  await shot(m, '12-movil-historia');
  assert.equal(await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'historia sin scroll horizontal');
  console.log('ok móvil y sin reconocimiento de voz');


  // ---------------------------------------------------------------- Resaltado estimado cuando el navegador no emite eventos de palabra
  const nb = await browser.newContext({ viewport: { width: 1000, height: 800 } });
  await nb.addInitScript('window.__noBoundary = true;');
  await nb.addInitScript(SPEECH_MOCK);
  const pn = await nb.newPage();
  watch(pn);
  await pn.goto(base + '#/leer/s08');
  await pn.waitForSelector('.story');
  await pn.click('text=Escuchar historia');
  await pn.waitForSelector('.w.is-current', { timeout: 4000 });
  await pn.click('text=Detener');
  await nb.close();
  console.log('ok resaltado estimado');

  // ---------------------------------------------------------------- IA opcional mediante endpoint propio (simulado)
  const aiCtx = await browser.newContext({ viewport: { width: 1000, height: 800 } });
  await aiCtx.addInitScript(SPEECH_MOCK);
  await aiCtx.addInitScript(() => localStorage.setItem('ingles-input:v1', JSON.stringify({ v: 1, settings: { aiEnabled: true, aiEndpoint: 'https://ai.example.test/feedback' } })));
  const pa = await aiCtx.newPage();
  watch(pa);
  let aiBody = null;
  await pa.route('https://ai.example.test/feedback', async (route) => {
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'POST, OPTIONS' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    aiBody = JSON.parse(route.request().postData());
    return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ feedback: 'Muy bien, usaste el verbo correcto.', corrected: 'My name is Luis.' }) });
  });
  await pa.goto(base + '#/hablar/d01');
  await pa.waitForSelector('#reply');
  await pa.fill('#reply', 'my name Luis');
  await pa.click('text=Enviar');
  await pa.waitForSelector('text=Comentario de la IA');
  await pa.waitForSelector('text=Muy bien, usaste el verbo correcto.');
  assert.equal(aiBody.dialogueId, 'd01');
  assert.equal(aiBody.userText, 'my name Luis');
  assert.equal(JSON.stringify(aiBody).includes('apiKey'), false);
  await aiCtx.close();
  console.log('ok IA opcional');

  await browser.close();
  server.close();
  const real = errors.filter((e) => !/favicon/i.test(e));
  if (real.length) { console.error('Errores en consola:\n' + real.join('\n')); process.exit(1); }
  console.log('Todo en orden.');
})().catch((e) => { console.error(e); process.exit(1); });
