/* Pruebas de navegador de Contexto Perú (Playwright). Uso: node coyuntura-peru/tests/e2e_rutas.cjs
   Sirve la carpeta del sitio, bloquea la red externa y revisa rutas, errores de consola, desbordes y elementos clave. */
const http = require("http"), fs = require("fs"), path = require("path");
let pw; try { pw = require("playwright"); } catch (e) { pw = require("@playwright/test"); }
const RAIZ = path.resolve(__dirname, "..");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webmanifest": "application/manifest+json" };
const srv = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]); let f = path.join(RAIZ, u === "/" ? "index.html" : u);
  if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("no"); }
  res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" }); fs.createReadStream(f).pipe(res);
});
const RUTAS = ["", "noticias", "datos", "nino", "s/nino", "s/politica", "s/economia", "s/salud", "s/tecnologia", "s/ia", "s/deporte", "s/investigacion", "s/coyuntura", "s/mundo", "a/hilo", "a/politica", "a/nino-peru", "a/ia-peru", "ruta", "glosario", "estadisticas", "historial", "talleres", "fuentes"];
const ANCHOS = [[390, 844, true], [430, 932, true], [768, 1024, false], [1024, 768, false], [1440, 900, false]];
const fallos = []; let comprobaciones = 0;
function ok(cond, msg) { comprobaciones++; if (!cond) { fallos.push(msg); console.log("  ✗ " + msg); } }
(async () => {
  await new Promise(r => srv.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + srv.address().port + "/index.html";
  const b = await pw.chromium.launch();
  for (const [w, h, touch] of ANCHOS) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, serviceWorkers: "block" });
    await ctx.route(url => !/^http:\/\/127\.0\.0\.1/.test(url.toString()), r => r.abort());
    const p = await ctx.newPage(); const errs = [];
    p.on("pageerror", e => errs.push("pageerror: " + e.message));
    p.on("console", m => { if (m.type() === "error" && !/Failed to load resource|ERR_FAILED|net::/.test(m.text())) errs.push("console: " + m.text()); });
    console.log(`Ancho ${w}`);
    for (const r of RUTAS) {
      errs.length = 0;
      await p.goto(base + "#/" + r); await p.waitForTimeout(250);
      const info = await p.evaluate(() => { window.scrollTo(200, 0); const sx = window.scrollX; window.scrollTo(0, 0); const a = document.querySelector("#app"); return { sx, len: a.innerText.trim().length, h: !!a.querySelector("h1,h2"), foco: document.title }; });
      ok(info.sx === 0, `[${w}] #/${r}: desplazamiento horizontal (${info.sx}px)`);
      ok(info.len > 80 && info.h, `[${w}] #/${r}: contenido vacío o sin título`);
      ok(errs.length === 0, `[${w}] #/${r}: errores de consola: ${errs.join(" | ")}`);
    }
    // portada
    await p.goto(base + "#/"); await p.waitForTimeout(250);
    ok(await p.locator(".qs .q").count() === 3, `[${w}] portada: deben verse 3 tarjetas de preguntas`);
    ok(await p.locator(".hero-stats .hero-stat").count() >= 3, `[${w}] portada: faltan indicadores dinámicos`);
    ok(await p.locator(".hero-content h1").innerText() === "El Perú, explicado con claridad", `[${w}] portada: título editorial no renderizado`);
    ok(await p.locator(".home-topics a").count() === 4, `[${w}] portada: accesos temáticos incompletos`);
    ok(await p.locator(".hero-updated").count() === 1, `[${w}] portada: no aparece fecha de comprobación`);
    const imgApproved = path.join(RAIZ, "assets", "hero-peru-en-claro-aprobado.jpg");
    const sourceBytes = fs.readFileSync(imgApproved);
    ok(sourceBytes.length === 243558 &&
      require("crypto").createHash("sha256").update(sourceBytes).digest("hex") ===
      "d30d7e29ceae393c4bf6ce3270524285e3f3b0dfc8eac9c05370a71b0db991eb",
      `[${w}] el fondo no coincide con la imagen exacta aprobada`);
    for (const name of ["noticias-congreso.jpg","datos-bcrp.jpg","nino-piura.jpg"]) {
      const file = path.join(RAIZ,"assets","photos",name);
      ok(fs.existsSync(file) && fs.statSync(file).size > 20000 &&
        fs.readFileSync(file).subarray(0,3).equals(Buffer.from([0xff,0xd8,0xff])),
        `[${w}] fotografía documental verificada: ${name}`);
    }
    const photos = await p.evaluate(() => {
      const hero = getComputedStyle(document.querySelector(".hero")).backgroundImage;
      const cards = [...document.querySelectorAll(".qs .q")].map(el => getComputedStyle(el).backgroundImage);
      return {hero, cards,
        noVisibleCredits: !document.querySelector(".hero-photo-credit") && !document.querySelector(".photo-sources")};
    });
    ok(photos.hero.includes("hero-peru-en-claro-aprobado.jpg"),
       `[${w}] la portada no utiliza el fondo aprobado`);
    ok(["noticias-congreso.jpg","datos-bcrp.jpg","nino-piura.jpg"].every((name,i) =>
      photos.cards[i].includes("photos/"+name)), `[${w}] no se muestran fotografías de las tarjetas`);
    ok(photos.noVisibleCredits, `[${w}] siguen apareciendo créditos fotográficos en la portada`);
    const decoded = await p.evaluate(async () => {
      const files = [
        "assets/hero-peru-en-claro-aprobado.jpg",
        "assets/photos/noticias-congreso.jpg",
        "assets/photos/datos-bcrp.jpg",
        "assets/photos/nino-piura.jpg"
      ];
      return await Promise.all(files.map(file => new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(img.naturalWidth > 400 && img.naturalHeight > 150);
        img.onerror = () => resolve(false);
        img.src = file;
      })));
    });
    ok(decoded.every(Boolean), `[${w}] una o más imágenes JPEG no se pudieron abrir en el navegador`);


    const tit = await p.locator(".qs .q h2").allInnerTexts();
    ok(/pasando/.test(tit[0]) && /datos/.test(tit[1]) && /Niño/.test(tit[2]), `[${w}] portada: títulos de las tres preguntas (${tit.join(" / ")})`);
    ok(await p.locator(".q1 .gn").count() > 0, `[${w}] portada: las noticias llevan etiqueta de género`);
    ok(await p.locator(".fresh dt").count() === 4, `[${w}] portada: cuatro fechas diferenciadas`);
    // datos
    await p.goto(base + "#/datos"); await p.waitForTimeout(300);
    const nd = await p.locator(".dc").count(); ok(nd >= 15, `[${w}] datos: pocas tarjetas (${nd})`);
    const sinCorte = await p.locator(".dc:not(:has(.dc-m b))").count(); ok(sinCorte === 0, `[${w}] datos: ${sinCorte} tarjetas sin fecha de corte`);
    const sinUn = await p.locator(".dc .un:empty").count(); ok(sinUn === 0, `[${w}] datos: ${sinUn} cifras sin unidad`);
    // El Niño
    await p.goto(base + "#/nino"); await p.waitForTimeout(300);
    ok(await p.locator(".n3-i").count() === 3, `[${w}] El Niño: estado, pronóstico y riesgo`);
    ok(/Último comunicado oficial del ENFEN/.test(await p.locator("#app").innerText()), `[${w}] El Niño: falta el último comunicado oficial`);
    const datosNoticias = JSON.parse(fs.readFileSync(path.join(RAIZ, "data", "noticias.json"), "utf-8"));
    const nEnf = datosNoticias.enfen && datosNoticias.enfen.numero ? datosNoticias.enfen.numero.split("-").reduce((a, b) => +b * 1000 + +a) : 0;
    if (nEnf > 2026016) ok(await p.locator(".n-aviso").count() === 1, `[${w}] El Niño: falta el aviso de comunicado más reciente que el del resumen`);
    ok(await p.locator('#app a[href*="observatorio-elnino-peru"]').count() > 0, `[${w}] El Niño: falta el enlace al observatorio`);
    // navegación y tamaños táctiles
    if (w >= 1000) {
      const etiquetas = await p.locator(".mnav a, .mnav .mn-b").allInnerTexts();
      ok(["Inicio", "Noticias", "Datos del Perú", "El Niño", "Buscar"].every((e, i) => (etiquetas[i] || "").trim() === e), `[${w}] navegación principal: ${etiquetas.join(", ")}`);
    } else {
      const items = await p.locator("#tabbar a, #tabbar button").evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return [e.innerText.trim(), r.height, r.width]; }));
      ok(items.length === 5 && items.every(i => i[1] >= 44 && i[2] >= 44), `[${w}] barra inferior: 5 botones de al menos 44 px (${JSON.stringify(items)})`);
    }
    // buscar y menú «Más»
    await p.click(w >= 1000 ? "#b-buscar" : "#t-bus"); await p.waitForTimeout(350);
    ok(await p.locator("#buscar.on").count() === 1, `[${w}] el buscador no abre`);
    await p.keyboard.type("dengue"); await p.waitForTimeout(250);
    ok(await p.locator("#res .row, #res .gt").count() > 0, `[${w}] la búsqueda «dengue» no devuelve resultados`);
    await p.keyboard.press("Escape"); await p.waitForTimeout(250);
    await p.click("#b-mas"); await p.waitForTimeout(350);
    const mt = await p.locator("#menu.on").innerText(); ok(/Glosario/.test(mt) && /Talleres/.test(mt) && /Historial/.test(mt) && /Estad/.test(mt), `[${w}] el menú «Más» no lista los recursos secundarios`);
    await p.keyboard.press("Escape");
    await p.click("#b-tema"); const tema = await p.evaluate(() => document.documentElement.getAttribute("data-theme")); ok(tema === "light" || tema === "dark", `[${w}] el cambio de tema no funciona`);
    await ctx.close();
  }
  await b.close(); srv.close();
  console.log(`\n${comprobaciones} comprobaciones, ${fallos.length} fallos`);
  process.exit(fallos.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
