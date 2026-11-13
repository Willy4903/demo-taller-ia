// Interacciones de la biblioteca (buscador y filtros) y del reto rápido, sin servicios externos.
// PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node ingles-input/tests/studio.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const HARNESS = `<!doctype html><html lang="es" data-theme="dark"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/css/app.css"></head><body><main></main><script type="module">
import {loadData} from '/js/data.js';
import {createQuickPractice} from '/js/views/studio.js';
import {libraryBrowser} from '/js/views/library.js';
window.__spoken=[]; window.__stopped=0;
const state={level:{input:1},ratings:{},stories:{}};
const ctx={data:await loadData(),store:{get:()=>state},speak(text,opts){window.__spoken.push(text); const t=setTimeout(()=>opts.onEnd?.({ok:true}),80);return()=>{clearTimeout(t);window.__stopped++;};}};
const main=document.querySelector('main');
main.append(libraryBrowser(ctx));
window.__studio=createQuickPractice(ctx);
main.append(window.__studio.element);
</script></body></html>`;

(async () => {
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/') { res.setHeader('Content-Type', 'text/html'); res.end(HARNESS); return; }
    const file = path.resolve(ROOT, '.' + pathname);
    if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
    const base = `http://127.0.0.1:${server.address().port}/`;
    for (const width of [390, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 600, hasTouch: width < 600 });
      await context.addInitScript(() => {
        Object.defineProperty(window, 'speechSynthesis', { value: { getVoices: () => [], addEventListener() {} } });
        window.SpeechSynthesisUtterance = class {};
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base);
      await page.waitForSelector('.story-card');
      assert.equal(await page.locator('.story-card').count(), 10);
      await page.getByLabel('Buscar historias').fill('MY NAME IS ANA');
      assert.equal(await page.locator('.story-card').count(), 1, 'search is case insensitive');
      assert.equal(await page.locator('.story-card').getAttribute('href'), '#/leer/s01');
      await page.getByRole('button', { name: 'Trabajo', exact: true }).click();
      assert.equal(await page.locator('.story-card').count(), 0, 'search and theme combine');
      assert.ok(await page.locator('.lib-empty').isVisible());
      await page.getByRole('button', { name: 'Limpiar filtros' }).click();
      assert.equal(await page.locator('.story-card').count(), 10);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'lib-q');
      await page.getByRole('button', { name: 'Viajes y aventura', exact: true }).click();
      assert.equal(await page.locator('.story-card').count(), 3);
      assert.ok((await page.locator('.sc-sit').allTextContents()).includes('Viajes y aeropuerto'));
      await page.getByRole('button', { name: 'Todas', exact: true }).click();
      await page.getByRole('button', { name: 'B1 Intermedio', exact: true }).focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('.story-card').count(), 2, 'level filter by keyboard');
      assert.deepEqual(await page.locator('.story-card .lvl b').allTextContents(), ['B1', 'B1']);
      await page.getByRole('button', { name: 'Todos', exact: true }).click();
      assert.equal(await page.locator('.story-card').count(), 10);
      const firstHref = await page.locator('.story-card').first().getAttribute('href');
      await page.locator('.story-card').first().click();
      assert.equal(new URL(page.url()).hash, firstHref);

      // Wrong answers provide a real correction; each question can count only once.
      await page.locator('.quick-option').first().click();
      assert.match(await page.locator('.quick-feedback').innerText(), /Soy de Perú/);
      assert.equal(await page.locator('.quick-option:disabled').count(), 3);
      assert.equal(await page.locator('.quick-option.is-correct').count(), 1);
      assert.equal(await page.locator('.quick-option.is-wrong').count(), 1);
      await page.locator('.quick-next').click();
      assert.equal(await page.locator('.quick-counter').textContent(), 'Pregunta 2 de 3');
      await page.getByRole('button', { name: 'Quisiera un vaso de agua, por favor.', exact: true }).focus();
      await page.keyboard.press('Space');
      assert.match(await page.locator('.quick-feedback').innerText(), /¡Eso es!/);
      await page.locator('.quick-next').click();
      await page.getByRole('button', { name: '¿Podrías hablar un poco más despacio, por favor?', exact: true }).click();
      await page.getByRole('button', { name: 'Ver mi resultado' }).click();
      assert.equal(await page.locator('.quick-score').textContent(), '2 de 3 aciertos');
      assert.equal(await page.getByRole('link', { name: 'Seguir con una historia' }).getAttribute('href'), '#/leer');
      await page.getByRole('button', { name: 'Volver a practicar' }).click();
      assert.equal(await page.locator('.quick-counter').textContent(), 'Pregunta 1 de 3');
      assert.equal(await page.locator('.quick-option:disabled').count(), 0);
      assert.equal(await page.locator('.quick-next').isVisible(), false);
      await page.locator('.quick-listen').click();
      assert.deepEqual(await page.evaluate(() => window.__spoken), ["I'm from Peru, and you?"]);
      await page.evaluate(() => window.__studio.cleanup());
      assert.equal(await page.evaluate(() => window.__stopped), 1, 'leaving home stops practice audio');
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`PASS ${width}px: filters, empty state, keyboard, correct/wrong answers, scoring, restart, audio cleanup`);
    }
    // Integración en la página real: el audio del reto se detiene al navegar y la navegación sigue accesible.
    const integrated = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await integrated.addInitScript(() => {
      window.__canceled = 0;
      let timer;
      window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
      Object.defineProperty(window, 'speechSynthesis', { value: {
        getVoices: () => [], addEventListener() {}, speaking: false,
        cancel() { clearTimeout(timer); window.__canceled++; this.speaking = false; },
        speak(utterance) { this.speaking = true; utterance.onstart?.(); timer = setTimeout(() => { this.speaking = false; utterance.onend?.(); }, 10000); },
      } });
    });
    const full = await integrated.newPage();
    const integrationErrors = [];
    full.on('pageerror', error => integrationErrors.push(error.message));
    await full.goto(base + 'index.html');
    await full.waitForSelector('.quick-options');
    assert.ok(await full.locator('.continue a.btn-primary').isVisible(), 'continue-reading banner');
    await full.locator('.quick-listen').click();
    assert.equal(await full.locator('.quick-listen').getAttribute('aria-busy'), 'true');
    const canceledBefore = await full.evaluate(() => window.__canceled);
    await full.locator('nav a[data-path="/leer"]').click();
    await full.waitForSelector('#page-grid .story-card');
    assert.ok(await full.evaluate((n) => window.__canceled > n, canceledBefore), 'leaving home stops practice audio');
    assert.deepEqual(integrationErrors, []);
    await integrated.close();
    console.log('PASS homepage integration: continue banner, practice audio, navigation cleanup');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
