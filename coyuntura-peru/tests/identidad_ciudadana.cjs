const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=rel=>fs.readFileSync(path.join(root,rel),"utf8");
const html=read("index.html");
const app=read("assets/app.js");
const exp=read("assets/civic-experience.js");
const css=read("assets/civic-theme.css");
const sw=read("sw.js");

test("el tema cívico peruano es el predeterminado y mantiene el cambio de modo",()=>{
  assert.match(html,/<html lang="es" data-theme="dark">/);
  assert.match(html,/content="#071321"/);
  assert.match(html,/assets\/civic-theme.css\?v=__V__/);
  assert.match(html,/assets\/civic-experience.js\?v=__V__/);
  assert.match(css,/--bg:#071321/);
  assert.match(css,/--red-t:#ff8490/);
  assert.match(css,/--green-t:#72ebcb/);
  assert.match(css,/:root\[data-theme="light"\]/);
  assert.match(app,/localStorage\.setItem\("cp_tema"/);
});
test("portada conserva las fotos aprobadas y ofrece tarjetas giratorias",()=>{
  const source=read("assets/visual.css");
  assert.match(source,/hero-peru-en-claro-aprobado\.jpg/);
  for(const name of ["card-actualidad.jpg","card-datos.jpg","card-elnino.jpg"]){
    assert.ok(fs.existsSync(path.join(root,"assets",name)));
  }
  assert.match(exp,/pe-card-3d/);
  assert.match(exp,/pe-card-inner/);
  assert.match(exp,/pointerenter/);
  assert.match(exp,/pointerleave/);
  assert.match(exp,/front\.inert=on/);
  assert.match(exp,/back\.inert=!on/);
  assert.match(css,/backface-visibility:hidden/);
  assert.match(css,/rotateY\(180deg\)/);
});
test("las síntesis usan datos actuales del portal y no generan cifras",()=>{
  assert.match(exp,/window\.EDITORIAL/);
  assert.match(exp,/window\.NOTICIAS/);
  assert.match(exp,/dataSnapshot\(id\)/);
  assert.match(exp,/data-pe-tab/);
  assert.match(exp,/ArrowRight/);
  assert.match(exp,/role="tabpanel"/);
  assert.match(exp,/Comunicado ENFEN indexado/);
  assert.doesNotMatch(exp,/fetch\(/);
});
test("noticias, indicadores y El Niño tienen explicaciones internas",()=>{
  assert.match(app,/<details class="pe-story">/);
  assert.match(app,/EXTRACTO DEL MEDIO/);
  assert.match(app,/Leer fuente original/);
  assert.match(app,/pe-data-explain/);
  assert.match(app,/Qué significa este número/);
  assert.match(app,/pe-nino-hint/);
  assert.match(app,/pe-reading-guide/);
});
test("accesibilidad, caché y CSS consistente",()=>{
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/:focus-visible/);
  assert.match(exp,/aria-selected/);
  assert.match(exp,/aria-expanded/);
  assert.match(sw,/cp-v15-ciudadania-identidad-20261103/);
  assert.match(sw,/assets\/civic-theme.css/);
  assert.match(sw,/assets\/civic-experience.js/);
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});
