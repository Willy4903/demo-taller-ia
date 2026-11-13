// Run: PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node ingles-input/tests/responsive.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
(async () => {
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = path.resolve(ROOT, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404); res.end(); return;
    }
    res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
    const base = `http://127.0.0.1:${server.address().port}/`;
    for (const [width, fontScale, fontFamily] of [[320, 1], [375, 1], [390, 1], [430, 1], [768, 1], [1440, 1], [320, 1.4], [390, 1.4], [320, 1.4, 'DejaVu Sans']]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 600, hasTouch: width < 600 });
      await context.addInitScript(scale => localStorage.setItem('ingles-input:v1', JSON.stringify({ v: 1, settings: { fontScale: scale } })), fontScale);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      for (const route of ['', '#/leer', '#/leer/s01', '#/shadowing', '#/vocabulario', '#/tarjetas', '#/hablar', '#/progreso', '#/gramatica', '#/ajustes', '#/metodo', '#/inexistente']) {
        await page.goto(base + route);
        await page.waitForSelector('h1');
        if (fontFamily) await page.addStyleTag({ content: `:root { --font: '${fontFamily}', sans-serif; }` });
        assert.ok(await page.evaluate(expected => document.documentElement.scrollWidth <= expected, width), `${width}px ${route}: horizontal overflow`);
        assert.equal(await page.locator('h1').count(), 1);
        if (width < 600 && route === '#/leer/s01') {
          const targets = await page.locator('main .rd-mini, main .icon-btn.small').evaluateAll(elements =>
            elements.map(element => {
              const { width, height } = element.getBoundingClientRect();
              return { width, height };
            }));
          assert.ok(targets.length > 0, 'reader has sentence controls');
          assert.ok(targets.every(target => target.width >= 44 && target.height >= 44), 'reader controls have 44px touch targets: ' + JSON.stringify(targets.filter(t => t.width < 44 || t.height < 44)));
        }
      }
      await page.goto(base + '#/leer');
      await page.waitForSelector('h1');
      await page.locator('.skip-link').focus();
      await page.keyboard.press('Enter');
      assert.equal(new URL(page.url()).hash, '#/leer', 'skip link preserves current lesson');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'main');
      await page.goto(base);
      await page.locator('.story-card').first().click();
      await page.waitForSelector('.rd-card');
      assert.match(new URL(page.url()).hash, /^#\/leer\/s\d+$/, 'story card opens the reader');
      await page.goto(base);
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark', 'dark design system');
      assert.ok(await page.evaluate(expected => document.documentElement.scrollWidth <= expected, width));
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`PASS ${width}px, font ${fontScale * 100}%${fontFamily ? ` ${fontFamily}` : ''}: 12 routes, touch targets, skip link, story cards, dark theme, no overflow or JS errors`);
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
