// Prueba de humo con Playwright (Chromium): el juego carga, arranca y la simulación avanza sin errores.
// Uso:  node shooter-cobertura/tests/smoke.cjs   (requiere el paquete "playwright")
const http = require('http')
const fs = require('fs')
const path = require('path')
const assert = require('assert/strict')
const { chromium } = require('playwright')

const ROOT = path.resolve(__dirname, '..')
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent(req.url.split('?')[0])
      const file = path.join(ROOT, url === '/' ? 'index.html' : url)
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('no'); return }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' })
      fs.createReadStream(file).pipe(res)
    })
    server.listen(0, '127.0.0.1', () => resolve(server))
  })
}

async function run(browser, base, page, opts) {
  const ctx = await browser.newContext(opts)
  const p = await ctx.newPage()
  const errors = []
  p.on('pageerror', (e) => errors.push(e.message))
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  await p.goto(`${base}/${page}`)
  await p.waitForFunction(() => window.__salar, null, { timeout: 30000 })
  if (opts.hasTouch) await p.tap('#btn-play')
  else await p.click('#btn-play')
  // Avanza 12 s de simulación: aparece la primera oleada y las máquinas se mueven.
  const r = await p.evaluate(() => {
    const g = window.__salar
    g.player.iframes = 1e9
    g.step(360)
    return { state: g.state, stage: g.director.stage, enemies: g.enemies.list.length, touch: g.input.touch, covers: g.level.coverPoints.length }
  })
  await ctx.close()
  assert.deepEqual(errors, [], `${page}: errores en consola`)
  assert.equal(r.state, 'playing')
  assert.equal(r.stage, 'A')
  assert.ok(r.enemies >= 3, 'debe haber aparecido la primera oleada')
  assert.ok(r.covers > 100, 'el nivel debe generar puntos de cobertura')
  assert.equal(r.touch, !!opts.hasTouch)
  console.log(`ok ${page} ${opts.hasTouch ? '(táctil)' : '(escritorio)'}`)
}

;(async () => {
  const server = await serve()
  const base = `http://127.0.0.1:${server.address().port}`
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
  try {
    await run(browser, base, 'index.html', { viewport: { width: 960, height: 540 } })
    await run(browser, base, 'salar-rojo.html', { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true })
  } finally {
    await browser.close()
    server.close()
  }
})().catch((e) => { console.error(e); process.exit(1) })
