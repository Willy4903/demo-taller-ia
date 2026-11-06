/* Regresiones de noticias con datos controlados; no consulta medios ni modifica datos.
   node coyuntura-peru/tests/newsroom.e2e.cjs
   PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH permite usar Chromium de la imagen local. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const vm = require("node:vm");
let pw;
try { pw = require("playwright"); } catch { pw = require("@playwright/test"); }

const ROOT = path.resolve(__dirname, "..");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".webmanifest": "application/manifest+json" };
const intro = "Contexto singular para comprobar la búsqueda de información sobre el presupuesto regional.";
const continuation = "La inversión financiará proyectos de agua y transporte, según el documento citado por el medio.";
const usefulFallback = "Extracto útil del medio que amplía el titular con el calendario y la población afectada.";
const fixture = {
  generado: "2026-11-06T12:00:00Z",
  items: Array.from({ length: 30 }, (_, index) => {
    const peru = index < 14;
    const latam = index >= 14 && index < 22;
    const titulo = (peru ? "Economía del Perú" : latam ? "Economía de Colombia" : "Inflación en España") + ", reporte " + String(index + 1).padStart(2, "0");
    return {
      titulo,
      resumen: "Información económica publicada por el medio, con una fecha explícita.",
      fuente: index % 2 === 0 ? "Diario Andino" : "Agencia Horizonte",
      tipo: peru ? "comercial" : "internacional",
      ambito: peru ? "peru" : "mundo",
      sector: "economia",
      genero: index === 1 ? "opinion" : index === 2 ? "analisis" : "noticia",
      fecha: new Date(Date.UTC(2026, 10, 6, 12) - index * 3600000).toISOString(),
      url: "https://noticias.invalid/reportaje/" + index,
      imagen: null
    };
  })
};
Object.assign(fixture.items[0], {
  titulo: "Inversión pública del Perú: presupuesto para proyectos regionales",
  resumen: intro + " " + continuation,
  sintesis: intro + " " + continuation,
  puntos: ["Contexto singular para comprobar la búsqueda de información", intro, intro, continuation, "Inversión pública del Perú: presupuesto para proyectos regionales"],
  datos: [{ v: "S/ 20 millones", t: "monto", c: "El documento citado asigna S/ 20 millones a los proyectos." }],
  imagen: "https://noticias.invalid/foto-no-disponible.jpg",
  // Un agregador no debe convertirse en la gran foto de portada; sí prueba el fallo real de imagen.
  via: "Google Noticias"
});
fixture.items[2].resumen = fixture.items[2].titulo;
Object.assign(fixture.items[3], { puntos: [fixture.items[3].titulo], sintesis: fixture.items[3].titulo, resumen: usefulFallback });
fixture.items[5].titulo = "Inversión pública regional: presupuesto para nuevos proyectos";

const editorialContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, "data/editorial.js"), "utf8"), editorialContext);
const editorial = editorialContext.window.EDITORIAL;
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
function occurrences(text, fragment) { return text.split(fragment).length - 1; }

async function noOverflow(page, width) {
  const geometry = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
    cards: Array.from(document.querySelectorAll(".pe-ficha")).filter(el => el.getClientRects().length).map(el => {
      const box = el.getBoundingClientRect(); return { left: box.left, right: box.right };
    })
  }));
  check(geometry.document <= geometry.viewport + 1, `[${width}] documento sin desplazamiento horizontal`);
  check(geometry.cards.every(box => box.left >= -1 && box.right <= width + 1), `[${width}] tarjetas completas en pantalla`);
}

async function uniqueReading(card, label) {
  const toggle = card.locator(".ps-more");
  equal(await toggle.getAttribute("aria-expanded"), "false", `${label}: detalle inicialmente cerrado`);
  check(!(await card.locator(".ps-panel").isVisible()), `${label}: panel cerrado fuera de la lectura`);
  check(await card.locator(".ps-sum").isVisible(), `${label}: extracto disponible al explorar`);
  check(await card.locator(".ps-src a").isVisible(), `${label}: fuente original visible sin abrir detalle`);
  check(await card.locator(".ps-src").evaluate(el => !el.closest(".ps-panel")), `${label}: fuente independiente del desplegable`);
  await toggle.focus();
  await toggle.press("Enter");
  equal(await toggle.getAttribute("aria-expanded"), "true", `${label}: apertura con teclado anunciada`);
  check(await toggle.evaluate(el => el === document.activeElement), `${label}: abrir conserva foco`);
  check(!(await card.locator(".ps-sum").isVisible()), `${label}: no se repite el extracto sobre la síntesis`);
  check(!(await card.locator(".ps-kpis").isVisible()), `${label}: cifras principales no se duplican al abrir`);
  equal(occurrences(await card.innerText(), intro), 1, `${label}: primer párrafo visible una sola vez`);
  equal(occurrences(await card.innerText(), continuation), 1, `${label}: se conserva el segundo párrafo`);
  equal(await card.locator('[data-pp="sin"] .ps-pts li').count(), 2, `${label}: se omiten puntos duplicados y el titular repetido`);
  equal(await card.getByRole("tab", { name: /Lectura crítica|Análisis de fondo/ }).count(), 0, `${label}: no hay análisis de plantilla repetido`);
  equal(await card.locator(".ps-toggle").getAttribute("aria-expanded"), "true", `${label}: los dos controles comparten el estado`);
  const panelId = await toggle.getAttribute("aria-controls");
  equal(await card.locator(".ps-panel").getAttribute("id"), panelId, `${label}: el botón controla el panel correcto`);
  await toggle.press("Enter");
  equal(await toggle.getAttribute("aria-expanded"), "false", `${label}: cierre anunciado`);
  check(!(await card.locator(".ps-panel").isVisible()), `${label}: el panel deja de ser navegable al cerrar`);
  check(await card.locator(".ps-sum").isVisible(), `${label}: cerrar recupera el extracto`);
  equal(occurrences(await card.innerText(), intro), 1, `${label}: el extracto cerrado tampoco se duplica`);
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
    await page.locator(".pe-ficha").first().waitFor();
    const peru = page.locator('[data-news-section="peru"]');
    const latam = page.locator('[data-news-section="latam"]');
    const world = page.locator('[data-news-section="mundo"]');
    equal(await page.locator(".pe-news-nav-primary button").count(), 4, `[${width}] portada y tres ámbitos disponibles`);
    equal(await page.locator('.pe-news-nav-primary a[href="#/fuentes"]').count(), 1, `[${width}] fuentes con página propia`);
    equal(await page.locator("#pe-news-topics button").count(), 13, `[${width}] temas completos`);
    for (const section of [peru, latam, world]) equal(await section.locator(".pe-ficha").count(), 6, `[${width}] primera página de cada ámbito`);
    const firstCount = await page.locator("#n-count").innerText();
    check(firstCount.includes("18") && firstCount.includes("30"), `[${width}] contador distingue noticias visibles del total: ${firstCount}`);
    equal(await page.locator("#n-count").getAttribute("role"), "status", `[${width}] cambios anunciados por contador`);
    equal(await page.locator("#n-lista").getAttribute("aria-live"), null, `[${width}] no se anuncia toda la lista por cada tecla`);
    equal(await peru.locator(".pe-ficha").nth(1).locator(".gn.opinion").textContent(), "Opinión", `[${width}] la opinión se identifica en su tarjeta`);
    equal(await peru.locator(".pe-ficha").nth(2).locator(".gn.analisis").textContent(), "Análisis", `[${width}] el análisis se identifica en su tarjeta`);

    // La foto falla por una solicitud abortada y deja una ilustración temática legible.
    await peru.locator(".pe-ficha").first().locator(".ps-ph").waitFor();
    equal(await peru.locator(".pe-ficha").first().locator(".ps-foto img").count(), 0, `[${width}] se elimina la foto no disponible`);
    match(await peru.locator(".pe-ficha").first().locator(".ps-ph").innerText(), /Economía.*Diario Andino/is, `[${width}] el reemplazo identifica tema y fuente`);

    const first = peru.locator(".pe-ficha").first();
    await uniqueReading(first, `[${width}] noticias`);
    await first.locator(".ps-more").click();
    const tabs = first.getByRole("tab");
    equal(await tabs.allTextContents(), ["Síntesis", "Cifras (1)", "Notas relacionadas (1)"], `[${width}] solo pestañas con contenido propio`);
    for (let i = 0; i < await tabs.count(); i++) {
      const tab = tabs.nth(i);
      const tabId = await tab.getAttribute("id");
      const paneId = await tab.getAttribute("aria-controls");
      check(Boolean(tabId && paneId), `[${width}] pestaña con identificadores accesibles`);
      equal(await first.locator('[id="' + paneId + '"]').getAttribute("aria-labelledby"), tabId, `[${width}] panel etiquetado por su pestaña`);
    }
    await tabs.first().focus();
    await page.keyboard.press("ArrowRight");
    equal(await tabs.nth(1).getAttribute("aria-selected"), "true", `[${width}] flecha cambia a cifras`);
    check(await tabs.nth(1).evaluate(el => el === document.activeElement), `[${width}] foco acompaña la pestaña activa`);
    equal(await first.locator('[data-pp="cif"]').isVisible(), true, `[${width}] cifras visibles al seleccionar`);
    equal(await first.locator('[data-pp="sin"]').isVisible(), false, `[${width}] síntesis oculta mientras se leen cifras`);
    await page.keyboard.press("End");
    equal(await tabs.last().getAttribute("aria-selected"), "true", `[${width}] End abre la última pestaña`);
    check(await first.locator('[data-pp="cob"] a').count() > 0, `[${width}] cobertura permite abrir el otro medio`);
    await page.keyboard.press("Home");
    equal(await tabs.first().getAttribute("aria-selected"), "true", `[${width}] Home vuelve a la síntesis`);
    equal(await tabs.evaluateAll(els => els.filter(el => el.tabIndex === 0).length), 1, `[${width}] una sola pestaña en la secuencia de tabulación`);
    await first.locator(".ps-more").click();

    const limited = peru.locator(".pe-ficha").nth(2);
    equal(await limited.locator(".ps-sum").count(), 0, `[${width}] no se reutiliza el titular como extracto`);
    await limited.locator(".ps-more").click();
    equal(occurrences(await limited.innerText(), fixture.items[2].titulo), 1, `[${width}] tampoco se repite el titular en detalle sin extracto`);
    check(!/preparaci[oó]n|pr[oó]xima lectura autom[aá]tica/i.test(await limited.innerText()), `[${width}] no se promete contenido futuro inexistente`);
    await limited.locator(".ps-more").click();
    const fallback = peru.locator(".pe-ficha").nth(3);
    equal(await fallback.locator(".ps-sum").textContent(), usefulFallback, `[${width}] descartar puntos vacíos conserva un extracto útil`);
    await fallback.locator(".ps-more").click();
    equal(await fallback.locator('[data-pp="sin"] .ps-pts li').allTextContents(), [usefulFallback], `[${width}] el resumen aporta detalle si puntos y síntesis solo repiten el titular`);
    equal(occurrences(await fallback.innerText(), fixture.items[3].titulo), 1, `[${width}] el fallback no reintroduce el titular`);
    await fallback.locator(".ps-more").click();

    // Ver más amplía únicamente su sección y lleva el teclado al contenido nuevo.
    await page.locator('[data-news-more="peru"]').click();
    equal(await peru.locator(".pe-ficha").count(), 12, `[${width}] segunda página de Perú`);
    equal(await world.locator(".pe-ficha").count(), 6, `[${width}] internacional conserva su límite`);
    equal(await latam.locator(".pe-ficha").count(), 6, `[${width}] América Latina conserva su límite`);
    check(await peru.locator(".pe-ficha").nth(6).locator(".ps-toggle").evaluate(el => el === document.activeElement), `[${width}] foco en primera noticia añadida`);
    check((await page.locator("#n-count").innerText()).includes("24"), `[${width}] contador después de ampliar`);

    const territory = page.locator('[data-news-amb="peru"]');
    await territory.focus();
    await page.keyboard.press("Space");
    equal(await territory.getAttribute("aria-pressed"), "true", `[${width}] ámbito activado con teclado`);
    check(await territory.evaluate(el => el === document.activeElement), `[${width}] el filtro conserva foco`);
    await page.keyboard.press("Tab");
    check(await page.locator('[data-news-amb="latam"]').evaluate(el => el === document.activeElement), `[${width}] Tab continúa al siguiente ámbito`);
    equal(await page.locator(".pe-news-section-header h2").allInnerTexts(), ["Perú"], `[${width}] se filtra el ámbito`);
    await page.locator("#n-clear").click();
    await page.locator('[data-news-amb="latam"]').click();
    equal(await page.locator(".pe-news-section-header h2").allInnerTexts(), ["América Latina"], `[${width}] América Latina tiene resultados propios`);
    await page.locator("#n-clear").click();

    const topic = page.locator('[data-nf="sector:internacional"]');
    await topic.focus();
    const topicScroll = await page.locator("#pe-news-topics").evaluate(el => el.scrollLeft);
    await page.keyboard.press("Space");
    check(await topic.evaluate(el => el === document.activeElement), `[${width}] el tema conserva foco`);
    check(Math.abs(await page.locator("#pe-news-topics").evaluate(el => el.scrollLeft) - topicScroll) <= 2, `[${width}] el carrusel de temas conserva su posición`);
    await page.locator("#n-clear").click();

    await page.locator("#n-query").fill("contexto singular");
    equal(await page.locator(".pe-ficha").count(), 1, `[${width}] búsqueda dentro del resumen`);
    check(await page.locator("#n-query").evaluate(el => el === document.activeElement), `[${width}] escribir conserva foco de búsqueda`);
    await page.locator("#n-query").fill("economia");
    check(await page.locator(".pe-ficha").count() > 1, `[${width}] búsqueda sin tildes encuentra Economía`);
    await page.locator("#n-clear").click();
    await page.locator("#n-source").selectOption({ label: "Diario Andino" });
    check((await page.locator(".ps-meta b").allInnerTexts()).every(text => text === "Diario Andino"), `[${width}] filtro por fuente`);
    await page.locator("#n-sort").selectOption("antiguas");
    const dates = await peru.locator(".ps-meta time").evaluateAll(els => els.map(el => Date.parse(el.dateTime)));
    check(dates.length > 1 && dates.every((date, index) => index === 0 || date >= dates[index - 1]), `[${width}] orden cronológico de antiguas a recientes`);
    await page.locator("#n-sort").selectOption("recientes");
    const recentDates = await peru.locator(".ps-meta time").evaluateAll(els => els.map(el => Date.parse(el.dateTime)));
    check(recentDates.every((date, index) => index === 0 || date <= recentDates[index - 1]), `[${width}] orden cronológico de recientes a antiguas`);

    await page.locator("#n-query").fill("___sin_resultados___");
    equal(await page.locator("#n-lista .pe-news-empty").count(), 1, `[${width}] estado vacío único`);
    equal(await page.locator(".pe-ficha").count(), 0, `[${width}] no quedan tarjetas de filtros anteriores`);
    await page.locator("[data-news-clear]").click();
    equal(await page.locator("#n-query").inputValue(), "", `[${width}] el estado vacío permite recuperar la búsqueda`);
    equal(await page.locator("#n-source").inputValue(), "todas", `[${width}] restablece la fuente`);
    equal(await page.locator("#n-sort").inputValue(), "recientes", `[${width}] restablece el orden`);
    equal(await page.locator(".pe-ficha").count(), 18, `[${width}] restaura los tres ámbitos`);
    check(await page.locator("#n-query").evaluate(el => el === document.activeElement), `[${width}] recuperar resultados devuelve foco al buscador`);

    await page.locator(".filtros-noticias summary").click();
    await page.locator('[data-nf="genero:opinion"]').click();
    equal(await page.locator(".pe-ficha").count(), 1, `[${width}] filtro de Opinión`);
    equal(await page.locator(".pe-ficha .gn.opinion").count(), 1, `[${width}] la opinión conserva su etiqueta`);
    await page.locator('[data-nf="genero:analisis"]').click();
    equal(await page.locator(".pe-ficha").count(), 1, `[${width}] filtro de Análisis`);
    equal(await page.locator(".pe-ficha .gn.analisis").count(), 1, `[${width}] el análisis conserva su etiqueta`);
    await page.locator("#n-clear").click();

    await page.locator("#n-source").selectOption({ label: "Agencia Horizonte" });
    await page.locator("#n-sort").selectOption("antiguas");
    await page.evaluate(() => { location.hash = "#/datos"; });
    await page.locator(".dc").first().waitFor();
    await page.evaluate(() => { location.hash = "#/noticias"; });
    await page.locator("#n-source option").nth(1).waitFor({ state: "attached" });
    equal(await page.locator("#n-source").inputValue(), "Agencia Horizonte", `[${width}] conserva fuente al volver`);
    equal(await page.locator("#n-sort").inputValue(), "antiguas", `[${width}] conserva orden al volver`);
    await page.locator("#n-clear").click();
    await noOverflow(page, width);

    // Las mismas fichas se reutilizan fuera de Noticias: todas mantienen la lectura única.
    for (const route of ["", "s/economia", "historial"]) {
      await page.evaluate(route => { location.hash = "#/" + route; }, route);
      const card = page.locator(".pe-ficha").filter({ has: page.locator('.ps-src a[href="' + fixture.items[0].url + '"]') }).first();
      await card.waitFor();
      await uniqueReading(card, `[${width}] #/${route}`);
      await noOverflow(page, width);
    }
    await page.locator(width >= 1000 ? "#b-buscar" : "#t-bus").click();
    await page.locator("#q").fill("contexto singular");
    const searchCard = page.locator("#res .pe-ficha");
    await searchCard.waitFor();
    await uniqueReading(searchCard, `[${width}] búsqueda global`);
    await page.keyboard.press("Escape");

    // Cada resumen editorial se lee una sola vez entre la entradilla y el cuerpo.
    for (const insight of editorial.insights) {
      const id = insight.id || insight.sector;
      await page.evaluate(id => { location.hash = "#/a/" + id; }, id);
      await page.locator(".art h1").waitFor();
      const opening = insight.resumen.match(/^.*?[.!?](?:\s|$)/)?.[0].trim() || insight.resumen;
      equal(occurrences(await page.locator(".art").innerText(), opening), 1, `[${width}] análisis ${id}: entradilla sin repetición`);
    }
    await page.evaluate(() => { location.hash = "#/fuentes"; });
    await page.locator("#guia-lectura").waitFor();
    equal(await page.locator("#guia-lectura").count(), 1, `[${width}] guía de lectura general en un único lugar`);
    equal(await page.locator('[aria-labelledby="guia-lectura"] .tips > div').count(), 4, `[${width}] guía conserva cuatro criterios de contraste`);
    await page.locator("#b-tema").click();
    equal(await page.locator("html").getAttribute("data-theme"), "light", `[${width}] modo claro disponible`);
    await noOverflow(page, width);
    equal(errors, [], `[${width}] sin errores de JavaScript`);
    console.log(`Noticias y lectura ${width}px: OK`);
  } finally {
    await context.close();
  }
}

async function smallFrontPages(browser, base) {
  let small;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block", reducedMotion: "reduce" });
  await context.route(url => !url.toString().startsWith(base), route => route.abort());
  await context.route("**/data/noticias.js*", route => route.fulfill({ contentType: "text/javascript", body: "window.NOTICIAS = " + JSON.stringify(small) + ";" }));
  const page = await context.newPage();
  try {
    for (let size = 1; size <= 7; size++) {
      small = { generado: fixture.generado, items: fixture.items.slice(0, size).map((item, index) => ({
        ...item, genero: "noticia", via: null, imagen: index === 0 ? base + "assets/card-actualidad.jpg" : null,
        fuente: index === 0 ? "El Comercio" : item.fuente
      })) };
      await page.goto(base + "?portada=" + size + "#/noticias");
      await page.locator(".np-front").waitFor();
      equal(await page.locator(".pe-news-empty").count(), 0, `[portada ${size}] las noticias del frente evitan el falso vacío`);
      const links = await page.locator("#n-lista .ps-src a, #n-lista .np-side li > a").evaluateAll(els => els.map(el => el.href));
      equal(links.length, size, `[portada ${size}] todas las noticias son accesibles`);
      equal(new Set(links).size, size, `[portada ${size}] una noticia no se repite entre frente y secciones`);
      match(await page.locator("#n-count").innerText(), new RegExp("^" + size + " noticia(?:s)? encontrada(?:s)? · " + size + " visibles$"), `[portada ${size}] el conteo incluye las noticias del frente`);
      await noOverflow(page, 390);
    }
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
    await smallFrontPages(browser, base);
    const narrow = await browser.newPage({ viewport: { width: 320, height: 740 }, serviceWorkers: "block", reducedMotion: "reduce" });
    await narrow.route(url => !url.toString().startsWith(base), route => route.abort());
    await narrow.goto(base + "#/noticias");
    await narrow.locator(".pe-ficha").first().waitFor();
    await noOverflow(narrow, 320);
    await narrow.close();
    console.log(`${assertions} comprobaciones de noticias y lectura aprobadas.`);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
