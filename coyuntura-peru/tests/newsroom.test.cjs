const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = { window: {}, URL };
vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../data/geografia.js"),"utf8"),context);
vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../assets/geografia.js"),"utf8"),context);
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

const geoCases = JSON.parse(fs.readFileSync(path.join(__dirname, 'geografia-casos.json'), 'utf8'));
test('la geografía identifica el contenido y no la nacionalidad del medio', () => {
  for (const caso of geoCases) assert.equal(context.window.PERU_GEOGRAFIA.clasificar(caso.item).zona, caso.zona, caso.item.titulo);
});
test('Python y navegador clasifican igual todo el lote y las regresiones', () => {
  const items = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/noticias.json'),'utf8')).items.concat(geoCases.map(c => c.item));
  const {execFileSync} = require('node:child_process');
  const python = "import sys,json;sys.path.insert(0,'coyuntura-peru/scripts');from geografia import clasificar_geografia;print(json.dumps([clasificar_geografia(i) for i in json.load(sys.stdin)]))";
  const backend = JSON.parse(execFileSync('python3',['-c',python],{cwd:path.resolve(__dirname,'../..'),input:JSON.stringify(items),encoding:'utf8'}));
  const web = items.map(i => JSON.parse(JSON.stringify(context.window.PERU_GEOGRAFIA.clasificar(i))));
  assert.deepEqual(web,backend);
});
