/* Regresiones de noticias con datos controlados; no consulta medios ni modifica datos.
   node coyuntura-peru/tests/newsroom.e2e.cjs
   PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH permite usar Chromium de la imagen local. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
let pw;
try { pw = require("playwright"); } catch { pw = require("@playwright/test"); }

const ROOT = path.resolve(__dirname, "..");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".webmanifest": "application/manifest+json" };
const fixture = {
  generado: "2026-11-04T12:00:00Z",
  items: Array.from({ length: 22 }, (_, index) => {
    const peru = index < 14;
    return {
      titulo: (peru ? "Economía del Perú" : "Inflación en España") + ", reporte " + String(index + 1).padStart(2, "0"),
      resumen: index === 0 ? "Contexto singular para comprobar la búsqueda de información." : "Información económica publicada por el medio, con una fecha explícita.",
      fuente: index % 2 === 0 ? "Diario Andino" : "Agencia Horizonte",
      tipo: peru ? "comercial" : "internacional",
      ambito: peru ? "peru" : "mundo",
      sector: "economia",
      genero: index === 0 ? "opinion" : index === 1 ? "analisis" : "noticia",
      fecha: new Date(Date.UTC(2026, 10, 4, 12) - index * 3600000).toISOString(),
      url: "https://noticias.invalid/reportaje/" + index,
      imagen: index === 0 ? "https://noticias.invalid/foto-no-disponible.jpg" : null
    };
  })
};

const server = http.createServer((req, res) => {
  const relative = decodeURIComponent(req.url.split("?")[0]);
  const file = path.resolve(ROOT, "." + (relative === "/" ? "/index.html" : relative));
  if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404); res.end("No encontrado"); return;
  }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
  fs.createReadStream(file).pipe(res);
});

let assertions = 0;
function equal(actual, expected, message) { assertions++; assert.deepEqual(actual, expected, message); }
function check(value, message) { assertions++; assert.ok(value, message); }
function match(value, pattern, message) { assertions++; assert.match(value, pattern, message); }

async function noOverflow(page, width) {
  const geometry = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
    cards: Array.from(document.querySelectorAll(".pe-news-card")).map(el => {
      const box = el.getBoundingClientRect(); return { left: box.left, right: box.right };
    })
  }));
  check(geometry.document <= geometry.viewport + 1, `[${width}] documento sin desplazamiento horizontal`);
  check(geometry.cards.every(box => box.left >= -1 && box.right <= width + 1), `[${width}] tarjetas completas en pantalla`);
}

async function runViewport(browser, base, width, height) {
  const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 600, hasTouch: width < 600, serviceWorkers: "block", reducedMotion: "reduce" });
  await context.route(url => !url.toString().startsWith(base), route => route.abort());
  await context.route("**/data/noticias.js*", route => route.fulfill({ contentType: "text/javascript", body: "window.NOTICIAS = " + JSON.stringify(fixture) + ";" }));
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error" && !/Failed to load resource|ERR_FAILED|net::/.test(message.text())) errors.push(message.text());
  });
  try {
    await page.goto(base + "#/noticias");
    await page.locator(".pe-news-card").first().waitFor();
    const peru = page.locator('[data-news-section="peru"]');
    const world = page.locator('[data-news-section="mundo"]');
    equal(await page.locator(".pe-news-nav-primary button").count(), 3, `[${width}] tres ámbitos disponibles`);
    equal(await page.locator("#pe-news-topics button").count(), 13, `[${width}] temas completos`);
    equal(await peru.locator(".pe-news-card").count(), 6, `[${width}] primera página de Perú`);
    equal(await world.locator(".pe-news-card").count(), 6, `[${width}] primera página internacional`);
    const firstCount = await page.locator("#n-count").innerText();
    check(firstCount.includes("12") && firstCount.includes("22"), `[${width}] contador distingue noticias visibles del total: ${firstCount}`);
    equal(await page.locator("#n-count").getAttribute("role"), "status", `[${width}] cambios anunciados por contador`);
    equal(await page.locator("#n-lista").getAttribute("aria-live"), null, `[${width}] no se anuncia toda la lista por cada tecla`);
    equal(await peru.locator(".pe-news-card").first().locator(".gn.opinion").textContent(), "Opinión", `[${width}] la opinión se identifica en su tarjeta`);
    equal(await peru.locator(".pe-news-card").nth(1).locator(".gn.analisis").textContent(), "Análisis", `[${width}] el análisis se identifica en su tarjeta`);

    // La foto falla realmente por una solicitud abortada; no se deja una columna vacía.
    await page.waitForFunction(() => document.querySelector('[data-news-section="peru"] .pe-news-card').classList.contains("no-photo"));
    equal(await peru.locator(".pe-news-card").first().locator(".pe-news-image").count(), 0, `[${width}] se elimina la foto no disponible`);
    equal(await peru.locator(".pe-news-card").first().evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length), 1, `[${width}] la tarjeta recupera todo su ancho`);

    // Ver más amplía únicamente su sección y lleva el teclado al contenido nuevo.
    await page.locator('[data-news-more="peru"]').click();
    equal(await peru.locator(".pe-news-card").count(), 12, `[${width}] segunda página de Perú`);
    equal(await world.locator(".pe-news-card").count(), 6, `[${width}] internacional conserva su límite`);
    check(await peru.locator(".pe-news-card").nth(6).locator("h3 a").evaluate(el => el === document.activeElement), `[${width}] foco en primera noticia añadida`);
    const secondCount = await page.locator("#n-count").innerText();
    check(secondCount.includes("18") && secondCount.includes("22"), `[${width}] contador después de ampliar: ${secondCount}`);

    // Los botones permanecen utilizables por teclado después de cambiar un filtro.
    const territory = page.locator('[data-news-amb="peru"]');
    await territory.focus();
    await page.keyboard.press("Space");
    equal(await territory.getAttribute("aria-pressed"), "true", `[${width}] ámbito activado con teclado`);
    check(await territory.evaluate(el => el === document.activeElement), `[${width}] el filtro conserva foco`);
    await page.keyboard.press("Tab");
    check(await page.locator('[data-news-amb="mundo"]').evaluate(el => el === document.activeElement), `[${width}] Tab continúa al siguiente ámbito`);
    equal(await page.locator(".pe-news-section-header h2").allInnerTexts(), ["Perú"], `[${width}] se filtra el ámbito`);
    await page.locator("#n-clear").click();

    const topic = page.locator('[data-nf="sector:internacional"]');
    await topic.focus();
    const topicScroll = await page.locator("#pe-news-topics").evaluate(el => el.scrollLeft);
    await page.keyboard.press("Space");
    check(await topic.evaluate(el => el === document.activeElement), `[${width}] el tema conserva foco`);
    check(Math.abs(await page.locator("#pe-news-topics").evaluate(el => el.scrollLeft) - topicScroll) <= 2, `[${width}] el carrusel de temas conserva su posición`);
    await page.locator("#n-clear").click();

    // Búsqueda por contenido y fuente, sin exigir tildes.
    await page.locator("#n-query").fill("contexto singular");
    equal(await page.locator(".pe-news-card").count(), 1, `[${width}] búsqueda dentro del resumen`);
    check(await page.locator("#n-query").evaluate(el => el === document.activeElement), `[${width}] escribir conserva foco de búsqueda`);
    await page.locator("#n-query").fill("economia");
    equal(await page.locator(".pe-news-card").count(), 12, `[${width}] búsqueda sin tildes encuentra Economía`);
    await page.locator("#n-clear").click();
    await page.locator("#n-source").selectOption({ label: "Diario Andino" });
    check((await page.locator(".pe-news-meta b").allInnerTexts()).every(text => text === "Diario Andino"), `[${width}] filtro por fuente`);
    await page.locator("#n-sort").selectOption("antiguas");
    const dates = await peru.locator("time").evaluateAll(els => els.map(el => Date.parse(el.dateTime)));
    check(dates.length > 1 && dates.every((date, index) => index === 0 || date >= dates[index - 1]), `[${width}] orden cronológico de antiguas a recientes`);
    await page.locator("#n-sort").selectOption("recientes");
    const recentDates = await peru.locator("time").evaluateAll(els => els.map(el => Date.parse(el.dateTime)));
    check(recentDates.every((date, index) => index === 0 || date <= recentDates[index - 1]), `[${width}] orden cronológico de recientes a antiguas`);

    await page.locator("#n-query").fill("___sin_resultados___");
    equal(await page.locator("#n-lista .pe-news-empty").count(), 1, `[${width}] estado vacío único`);
    equal(await page.locator(".pe-news-card").count(), 0, `[${width}] no quedan tarjetas de filtros anteriores`);
    await page.locator("[data-news-clear]").click();
    equal(await page.locator("#n-query").inputValue(), "", `[${width}] el estado vacío permite recuperar la búsqueda`);
    equal(await page.locator("#n-source").inputValue(), "todas", `[${width}] restablece la fuente`);
    equal(await page.locator("#n-sort").inputValue(), "recientes", `[${width}] restablece el orden`);
    equal(await page.locator(".pe-news-card").count(), 12, `[${width}] restaura las dos secciones`);
    check(await page.locator("#n-query").evaluate(el => el === document.activeElement), `[${width}] recuperar resultados devuelve foco al buscador`);

    await page.locator(".filtros-noticias summary").click();
    await page.locator('[data-nf="genero:opinion"]').click();
    equal(await page.locator(".pe-news-card").count(), 1, `[${width}] filtro de Opinión`);
    equal(await page.locator(".pe-news-card .gn.opinion").count(), 1, `[${width}] la tarjeta de opinión conserva su etiqueta`);
    await page.locator('[data-nf="genero:analisis"]').click();
    equal(await page.locator(".pe-news-card").count(), 1, `[${width}] filtro de Análisis`);
    equal(await page.locator(".pe-news-card .gn.analisis").count(), 1, `[${width}] la tarjeta de análisis conserva su etiqueta`);
    await page.locator("#n-clear").click();

    // La selección se conserva cuando se visita otra sección y se vuelve.
    await page.locator("#n-source").selectOption({ label: "Agencia Horizonte" });
    await page.locator("#n-sort").selectOption("antiguas");
    await page.evaluate(() => { location.hash = "#/datos"; });
    await page.locator(".dc").first().waitFor();
    await page.evaluate(() => { location.hash = "#/noticias"; });
    await page.locator("#n-source option").nth(1).waitFor({ state: "attached" });
    equal(await page.locator("#n-source").inputValue(), "Agencia Horizonte", `[${width}] conserva fuente al volver`);
    equal(await page.locator("#n-sort").inputValue(), "antiguas", `[${width}] conserva orden al volver`);
    await noOverflow(page, width);
    await page.locator("#b-tema").click();
    equal(await page.locator("html").getAttribute("data-theme"), "light", `[${width}] modo claro disponible`);
    await noOverflow(page, width);
    equal(errors, [], `[${width}] sin errores de JavaScript`);
    console.log(`Noticias ${width}px: OK`);
  } finally {
    await context.close();
  }
}

(async () => {
  let browser;
  try {
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const base = "http://127.0.0.1:" + server.address().port + "/";
    browser = await pw.chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
    for (const [width, height] of [[390, 844], [1440, 1000]]) await runViewport(browser, base, width, height);
    const narrow = await browser.newPage({ viewport: { width: 320, height: 740 }, serviceWorkers: "block", reducedMotion: "reduce" });
    await narrow.route(url => !url.toString().startsWith(base), route => route.abort());
    await narrow.goto(base + "#/noticias");
    await narrow.locator(".pe-news-card").first().waitFor();
    await noOverflow(narrow, 320);
    await narrow.close();
    console.log(`${assertions} comprobaciones de noticias aprobadas.`);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
