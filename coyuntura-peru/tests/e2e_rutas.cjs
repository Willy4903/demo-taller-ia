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
    // Noticias: filtros completos, conteo, búsqueda y ausencia de recorte en chips.
    await p.goto(base + "#/noticias"); await p.waitForTimeout(300);
    const filtros = p.locator(".filtros-noticias");
    ok(await p.locator(".pe-news-nav-primary button").count() === 3, `[${w}] noticias: faltan Perú e Internacional`);
    if (w < 720) await filtros.locator("summary").click();
    ok(await p.locator("#n-count").innerText() !== "", `[${w}] noticias: falta el contador de resultados`);
    const chipLayout = await p.locator(".filtros-noticias .chips").evaluateAll(els => els.length === 2 && els.every(el => el.scrollWidth <= el.clientWidth + 2));
    ok(chipLayout, `[${w}] noticias: filtros recortados o desbordados`);
    await p.locator('#pe-news-topics [data-nf="sector:economia"]').click();
    ok(await p.locator('#pe-news-topics [data-nf="sector:economia"]').getAttribute("aria-pressed") === "true", `[${w}] noticias: filtro de Economía no se activa`);
    await p.locator("#n-query").fill("___noticia_inexistente_987654___");
    ok(await p.locator("#n-lista .pe-news-empty").count() >= 1, `[${w}] noticias: búsqueda sin resultados incorrecta`);
    await p.locator("#n-clear").click();
    ok(await p.locator("#n-lista .pe-news-card").count() > 0 && await p.locator("#n-query").inputValue() === "", `[${w}] noticias: limpiar filtros no restaura resultados`);
    // Orden de secciones, fichas de fuente y ausencia de análisis repetidos.
    const newsHeadings=await p.locator(".pe-news-section-header h2").allInnerTexts();
    ok(newsHeadings[0]==="Perú" && newsHeadings[1]==="Internacional", `[${w}] noticias: orden Perú/Internacional incorrecto`);
    ok(await p.locator("#n-lista .pe-news-card a.pe-news-go").count() > 0,
       `[${w}] noticias: faltan enlaces a las fuentes originales`);
    ok(await p.locator("#n-lista .pe-story").count() === 0,
       `[${w}] noticias: reaparecieron paneles de opinión repetitivos`);
    await p.locator('[data-news-amb="mundo"]').click();
    ok(await p.locator(".pe-news-section-header h2").allInnerTexts().then(x=>x.length===1&&x[0]==="Internacional"),
       `[${w}] noticias: filtro de Internacional no funciona`);
    await p.locator('[data-news-amb="todos"]').click();
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
    for (const name of ["card-actualidad.jpg","card-datos.jpg","card-elnino.jpg"]) {
      const file = path.join(RAIZ,"assets",name);
      ok(fs.existsSync(file) && fs.statSync(file).size > 10_000 &&
        fs.readFileSync(file).subarray(0,3).equals(Buffer.from([0xff,0xd8,0xff])),
        `[${w}] imagen local de tarjeta válida: ${name}`);
    }
    // Medir la cara frontal en reposo; el giro es una interacción voluntaria.
    await p.mouse.move(2, 2); await p.waitForTimeout(750);
    const photos = await p.evaluate(() => {
      const hero = getComputedStyle(document.querySelector(".hero")).backgroundImage;
      const cards = [...document.querySelectorAll(".qs .q")].map(el => {
        const img = el.querySelector(".q-visual");
        if (!img) return null;
        const b = img.getBoundingClientRect();
        const c = el.getBoundingClientRect();
        const st = getComputedStyle(img);
        return {src:img.getAttribute("src"),loaded:img.complete && img.naturalWidth > 400,
          rendered:st.display !== "none" && st.visibility !== "hidden" && Number(st.opacity) > .95,
          full:b.width >= c.width - 2 && b.height >= c.height - 2,
          noClickBlock:st.pointerEvents === "none"};
      });
      return {hero,cards,
        noVisibleCredits: !document.querySelector(".hero-photo-credit") && !document.querySelector(".photo-sources")};
    });
    ok(photos.hero.includes("hero-peru-en-claro-aprobado.jpg"),
       `[${w}] la portada no utiliza el fondo aprobado`);
    ok(["card-actualidad.jpg","card-datos.jpg","card-elnino.jpg"].every((name,i) =>
      photos.cards[i] && photos.cards[i].src === "assets/"+name &&
      photos.cards[i].loaded && photos.cards[i].rendered &&
      photos.cards[i].full && photos.cards[i].noClickBlock),
      `[${w}] las tres imágenes de preguntas no se muestran a tamaño completo: ${JSON.stringify(photos.cards)}`);
    ok(photos.noVisibleCredits, `[${w}] siguen apareciendo créditos fotográficos en la portada`);
    ok(await p.locator(".q2 .q-go").getAttribute("href") === "#/datos", `[${w}] enlace Indicadores incorrecto`);
    ok(await p.locator(".q3 .q-go").getAttribute("href") === "#/s/nino", `[${w}] enlace El Niño incorrecto`);
    ok(await p.locator(".qs .pe-card-3d").count() === 3, `[${w}] portada: faltan tarjetas giratorias`);
    ok(await p.locator("#pe-lab [role=tab]").count() === 3, `[${w}] portada: falta la síntesis interactiva`);
    if (touch) await p.locator(".q1 .pe-flip-trigger").click();
    else await p.locator(".q1").hover();
    ok(await p.locator(".q1.pe-flipped").count() === 1, `[${w}] portada: no se voltea tarjeta Noticias`);
    await p.locator('.q1 [data-pe-open="actualidad"]').click();
    ok(await p.locator('[data-pe-tab="actualidad"][aria-selected=true]').count() === 1,
       `[${w}] portada: síntesis de actualidad no activa`);
    await p.locator('[data-pe-tab="datos"]').click();
    ok(await p.locator('[data-pe-tab="datos"][aria-selected=true]').count() === 1 &&
       (await p.locator("#pe-data-note").innerText()).length > 10,
       `[${w}] portada: explicación de indicadores ausente`);
    await p.locator('[data-pe-tab="nino"]').click();
    ok((await p.locator("#pe-data-title").innerText()).includes("ENFEN"),
       `[${w}] portada: síntesis ENFEN sin trazabilidad`);


    const decoded = await p.evaluate(async () => {
      const files = [
        "assets/hero-peru-en-claro-aprobado.jpg",
        "assets/card-actualidad.jpg",
        "assets/card-datos.jpg",
        "assets/card-elnino.jpg"
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
    ok(await p.locator(".q1 .q-go").getAttribute("href") === "#/noticias", `[${w}] la tarjeta Noticias no enlaza correctamente`);
    ok(await p.locator(".fresh dt").count() === 4, `[${w}] portada: cuatro fechas diferenciadas`);
    // datos
    await p.goto(base + "#/datos"); await p.waitForTimeout(300);
    const nd = await p.locator(".dc").count(); ok(nd >= 15, `[${w}] datos: pocas tarjetas (${nd})`);
    const sinCorte = await p.locator(".dc:not(:has(.dc-m b))").count(); ok(sinCorte === 0, `[${w}] datos: ${sinCorte} tarjetas sin fecha de corte`);
    const sinUn = await p.locator(".dc .un:empty").count(); ok(sinUn === 0, `[${w}] datos: ${sinUn} cifras sin unidad`);
    ok(await p.locator(".dc .pe-data-explain").count() === nd, `[${w}] datos: faltan interpretaciones desplegables`);
    await p.locator(".dc .pe-data-explain").first().locator("summary").click();
    ok(await p.locator(".dc .pe-data-explain[open]").count() === 1, `[${w}] datos: no abre explicación local`);

    // El Niño
    await p.goto(base + "#/nino"); await p.waitForTimeout(300);
    ok(await p.locator(".n3-i").count() === 3, `[${w}] El Niño: estado, pronóstico y riesgo`);
    await p.locator(".n3-i").first().locator("summary").click();
    ok(await p.locator(".n3-i[open]").count() === 1, `[${w}] El Niño: el concepto no se despliega`);

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
