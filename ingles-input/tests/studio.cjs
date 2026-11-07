// Interacciones del explorador y la práctica breve, sin servicios externos.
// PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node ingles-input/tests/studio.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const HARNESS = `<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/css/styles.css"></head><body><main></main><script type="module">
import {loadData} from '/js/data.js';
import {createExplorer, createQuickPractice} from '/js/views/studio.js';
window.__spoken=[]; window.__stopped=0;
const ctx={data:await loadData(),speak(text,opts){window.__spoken.push(text); const t=setTimeout(()=>opts.onEnd?.({ok:true}),80);return()=>{clearTimeout(t);window.__stopped++;};}};
const main=document.querySelector('main');
main.append(createExplorer(ctx));
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
      await page.waitForSelector('.discover-card');
      assert.equal(await page.locator('.discover-card').count(), 3);
      await page.getByLabel('Buscar historias').fill('MY NAME IS ANA');
      assert.equal(await page.locator('.discover-card').count(), 1, 'search is case insensitive');
      assert.equal(await page.locator('.discover-card').getAttribute('href'), '#/leer/s01');
      await page.getByLabel('Filtrar historias por tema').selectOption('trabajo');
      assert.equal(await page.locator('.discover-card').count(), 0, 'search and topic combine');
      assert.ok(await page.locator('.discover-empty').isVisible());
      await page.getByRole('button', { name: 'Limpiar filtros' }).click();
      assert.equal(await page.locator('.discover-card').count(), 3);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'discover-search');
      await page.getByLabel('Filtrar historias por tema').selectOption('viajes');
      assert.equal(await page.locator('.discover-card').count(), 1);
      assert.equal(await page.locator('.discover-category').textContent(), 'Viajes y aeropuerto');
      assert.equal(await page.locator('.discover-more').isVisible(), false);
      await page.getByLabel('Filtrar historias por tema').selectOption('');
      await page.locator('.discover-more').focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('.discover-card').count(), 10, 'all stories exposed by keyboard');
      assert.equal(await page.locator('.discover-more').getAttribute('aria-expanded'), 'true');
      await page.locator('.discover-more').click();
      assert.equal(await page.locator('.discover-card').count(), 3);
      await page.locator('.discover-card').first().click();
      assert.equal(new URL(page.url()).hash, '#/leer/s01');

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
    // Full-page integration: hero and practice share audio safely and keep navigation accessible.
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
    await full.getByRole('button', { name: 'Ver traducción', exact: true }).click();
    assert.equal(await full.locator('#hero-translation').isVisible(), true);
    await full.getByRole('button', { name: 'Ocultar traducción', exact: true }).click();
    assert.equal(await full.locator('#hero-translation').isVisible(), false);
    await full.locator('.hero-play').click();
    assert.equal(await full.locator('.hero-play').getAttribute('aria-pressed'), 'true');
    await full.locator('.quick-listen').click();
    assert.equal(await full.locator('.hero-play').getAttribute('aria-pressed'), 'false');
    assert.equal(await full.locator('.quick-listen').getAttribute('aria-busy'), 'true');
    await full.locator('.hero-play').click();
    assert.equal(await full.locator('.quick-listen').getAttribute('aria-busy'), null);
    assert.equal(await full.locator('.quick-listen').innerText(), 'Escuchar de nuevo');
    await full.getByRole('button', { name: 'Prueba un reto', exact: true }).click();
    assert.equal(await full.evaluate(() => document.activeElement.id), 'quick-title');
    await full.locator('nav a[href="#/leer"]').click();
    await full.waitForSelector('.list-card');
    assert.ok(await full.evaluate(() => window.__canceled > 0));
    assert.deepEqual(integrationErrors, []);
    await integrated.close();
    console.log('PASS homepage integration: translation, shared audio, practice CTA, navigation cleanup');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
