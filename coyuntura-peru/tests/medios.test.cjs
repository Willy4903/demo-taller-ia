const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../assets/medios.js"), "utf8"), context);
const M = context.window.PeruMedios;
const plano = v => JSON.parse(JSON.stringify(v)); // los objetos del contexto vm tienen otro prototipo

const CAT = [{ id: "politica", nombre: "Política" }, { id: "economia", nombre: "Economía" }, { id: "otros", nombre: "Otros" }];
const ed = (id, nombre, tits, extra) => Object.assign({ id, nombre, ambito: "nacional", paginas: 24, calidad: "texto", titulares: tits, temas: { politica: 1 }, palabras: [], entidades: [], lugares: {}, cifras: {} }, extra);
const dia = (fecha, palabras) => ({
  fecha, actualizado: fecha + "T17:00:00Z", resumen: { medios: 2, paginas: 40, titulares: 3, escaneados: 1 },
  temas: [{ id: "politica", n: 2 }, { id: "economia", n: 1 }], palabras, entidades: [["Dina Ejemplo", 5, 2]], lugares: [["Lima", 9], ["Piura", 3]],
  cifras: { soles: 4, dolares: 1, porcentajes: 6, millones: 2 },
  medios: [
    ed("el-comercio", "El Comercio", [{ t: "EL CONGRESO APRUEBA LA REFORMA: BCRP DICE QUE BAJÓ", p: 1, tema: "politica" }, { t: "Dólar cierra estable <script>alert(1)</script>", p: 4, tema: "economia" }]),
    ed("trome", "Trome", [{ t: "Universitario gana en la Liga 1", p: 1, tema: "otros" }]),
  ],
});
const serieDe = d => d.dias.map(x => ({ fecha: x.fecha, medios: 2, titulares: 3, temas: { politica: 2, economia: 1 }, palabras: x.palabras.slice(0, 20) }));
const datos = (() => {
  const d = { version: 1, generado: "2026-11-12T20:00:00Z", catalogo_temas: CAT, avisos: [], dias: [dia("2026-11-12", [["congreso", 9], ["reforma", 6]]), dia("2026-11-11", [["congreso", 3]]), dia("2026-11-10", [["congreso", 3]])] };
  d.serie = serieDe(d);
  return d;
})();

test("sin datos muestra un estado vacío honesto", () => {
  assert.match(M.html({ dias: [] }, {}), /Todavía no hay lectura de prensa/);
  assert.match(M.html(undefined, {}), /Todavía no hay lectura de prensa/);
});

test("los titulares y nombres se escapan: no se inyecta HTML", () => {
  const h = M.html(datos, { fecha: "2026-11-12", medio: "todos", q: "", max: 20 });
  assert.ok(!/<script>alert/.test(h));
  assert.match(h, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test("muestra día, cifras del resumen y la fecha de actualización en hora de Lima", () => {
  const h = M.html(datos, { fecha: "2026-11-12", medio: "todos", q: "", max: 20 });
  assert.match(h, /Prensa del día/);
  assert.match(h, /Diarios leídos/);
  assert.match(h, /Actualizado:/);
  assert.match(h, /1 edición es una imagen escaneada/);
  assert.match(h, /Agenda por diario/);
});

test("los titulares en mayúsculas se leen en minúscula y conservan siglas", () => {
  assert.equal(M.oracion("EL CONGRESO APRUEBA LA REFORMA: BCRP DICE QUE BAJÓ"), "El congreso aprueba la reforma: BCRP dice que bajó");
  assert.equal(M.oracion("Dólar cierra a la baja"), "Dólar cierra a la baja");
});

test("filtra por diario y por texto sin distinguir tildes ni mayúsculas", () => {
  const d = datos.dias[0];
  assert.equal(M.titularesDe(d, "todos", "").length, 3);
  assert.equal(M.titularesDe(d, "trome", "").length, 1);
  assert.equal(M.titularesDe(d, "todos", "DOLAR").length, 1);
  assert.equal(M.titularesDe(d, "todos", "inexistente").length, 0);
});

test("tendencias: marca palabras en alza solo con dos o más días previos", () => {
  assert.deepEqual(plano(M.tendencias(datos, "2026-11-12")), { congreso: "alza", reforma: "nueva" });
  assert.deepEqual(plano(M.tendencias({ dias: datos.dias.slice(0, 2), serie: datos.serie.slice(0, 2) }, "2026-11-12")), {});
});

test("serieTema devuelve hasta siete días en orden cronológico", () => {
  const s = M.serieTema(datos, "politica", "2026-11-12");
  assert.deepEqual(s.map(x => x.fecha), ["2026-11-10", "2026-11-11", "2026-11-12"]);
  assert.equal(s[0].v, 66.7);
});

test("la semilla vacía publicada es válida", () => {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../data/medios.js"), "utf8"), ctx);
  assert.ok(Array.isArray(ctx.window.MEDIOS.dias) && Array.isArray(ctx.window.MEDIOS.serie));
  assert.ok(M.html(ctx.window.MEDIOS, {}).length > 0);
});
