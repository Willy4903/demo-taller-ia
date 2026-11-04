const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../assets/newsroom.js"), "utf8"), context);
const cifras = item => Array.from(context.window.PERU_NEWS.cifras(item));

test("las cifras monetarias conservan la escala completa publicada", () => {
  assert.deepEqual(cifras({ titulo: "El Gobierno destinará US$ 20 millones a hospitales" }), ["US$ 20 millones"]);
  assert.deepEqual(cifras({ titulo: "Inversión de S/ 2 mil millones de soles y US$ 1 millón" }), ["S/ 2 mil millones de soles", "US$ 1 millón"]);
  assert.deepEqual(cifras({ titulo: "Presupuesto de $ 450 mil; transferencia de S/ 1.500,75." }), ["$ 450 mil", "S/ 1.500,75"]);
});

test("porcentajes con coma o punto decimal conservan símbolo y espaciado", () => {
  assert.deepEqual(cifras({ titulo: "Inflación de 3%, crecimiento de 3,5 % y variación de -1.2%." }), ["3%", "3,5 %", "-1.2%"]);
});

test("temperaturas, velocidades y cantidades mantienen sus unidades", () => {
  assert.deepEqual(cifras({ titulo: "Temperatura de -4 °C, vientos de 30 km/h y recorrido de 12 km" }), ["-4 °C", "30 km/h", "12 km"]);
  assert.deepEqual(cifras({ titulo: "Atención para 24 mil internos y 2 millones de personas" }), ["24 mil internos", "2 millones de personas"]);
});

test("las cifras son fragmentos literales de un único campo de la fuente", () => {
  assert.deepEqual(cifras({ titulo: "El programa alcanza a 20", resumen: "millones de hogares, según la fuente" }), []);
  const item = { titulo: "Se destinarán US$ 20 millones.", resumen: "La fuente estima 24 mil hogares y una tasa de 3,5 %." };
  for (const fragment of cifras(item)) {
    assert.ok(item.titulo.includes(fragment) || item.resumen.includes(fragment), fragment);
  }
});

test("se omiten números sin unidad, duplicados y cifras posteriores al límite", () => {
  assert.deepEqual(cifras({ titulo: "Reporte 2026: 3%, 2 personas y 4 casos", resumen: "3% y 2 personas; 9 hogares más" }), ["3%", "2 personas", "4 casos"]);
  assert.deepEqual(cifras({}), []);
});
