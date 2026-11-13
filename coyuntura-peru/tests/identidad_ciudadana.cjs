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

const editorial=read("assets/editorial.css");
test("el modo claro editorial es el predeterminado y mantiene el cambio a modo oscuro",()=>{
  assert.match(html,/<html lang="es" data-theme="light">/);
  assert.match(html,/content="#F8FAFC"/);
  assert.match(html,/assets\/editorial.css\?v=__V__/);
  assert.match(editorial,/:root\[data-theme="light"\]\{\s*--bg:#F8FAFC;--card:#FFFFFF;--card2:#F1F5F9;--border:#E2E8F0/);
  assert.match(editorial,/:root\[data-theme="dark"\]\{\s*--bg:#0B111E;--card:#111827/);
  assert.match(editorial,/font-variant-numeric:tabular-nums/);
  assert.match(sw,/assets\/editorial.css/);
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
test("noticias con ficha de fuente y datos, sin opinión repetitiva",()=>{
  assert.match(app,/class="pe-ficha"/);
  assert.match(app,/pe-news-section/);
  assert.match(app,/Leer nota original/);
  assert.match(app,/ps-cifras/);
  assert.match(app,/Notas relacionadas/);
  assert.doesNotMatch(app,/\["lec", "Lectura crítica"\]/);
  assert.doesNotMatch(app,/\["ctx", "Análisis de fondo"\]/);
  assert.doesNotMatch(app,/LA PREGUNTA INCÓMODA/);
  assert.doesNotMatch(app,/ANÁLISIS CRÍTICO/);
  assert.match(app,/pe-data-explain/);
  assert.match(app,/Qué significa este número/);
  assert.match(app,/pe-nino-hint/);
});
test("accesibilidad, caché y CSS consistente",()=>{
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/:focus-visible/);
  assert.match(exp,/aria-selected/);
  assert.match(exp,/aria-expanded/);
  assert.match(sw,/const CACHE = "cp-v\d+-[^"]+"/);
  assert.match(sw,/assets\/civic-theme.css/);
  assert.match(sw,/assets\/civic-experience.js/);
  assert.match(sw,/assets\/newsroom.js/);
  assert.match(sw,/assets\/newsroom.css/);
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});

test("clasificación, territorios, identidad y filtro editorial",()=>{
  const vm=require("node:vm");
  const context={window:{},URL};
  vm.runInNewContext(read("data/geografia.js"),context);
  vm.runInNewContext(read("assets/geografia.js"),context);
  vm.runInNewContext(read("assets/newsroom.js"),context);
  const q=context.window.PERU_NEWS;
  assert.equal(q.excluir({titulo:"Horóscopo de hoy, miércoles 4 de noviembre"}),true);
  assert.equal(q.excluir({titulo:"Reporte del INEI sobre inflación"}),false);
  assert.equal(q.categoria({titulo:"Transmisión ESPN: Real Madrid vs. AEK Atenas por Champions League",sector:"politica"}),"deporte");
  assert.equal(q.categoria({titulo:"Ignacio Buse vs. Daniil Medvédev en Masters 1000",sector:"politica"}),"deporte");
  assert.equal(q.ambito({titulo:"Real Madrid vs. AEK Atenas",ambito:"peru",tipo:"comercial"}),"mundo");
  assert.equal(q.ambito({titulo:"Lluvias intensas en Piura",ambito:"peru",tipo:"comercial"}),"peru");
  assert.ok(q.cifras({titulo:"Dos penales para 24 mil internos"}).some(x=>x.includes("24 mil")));
  assert.match(app,/PERU_NEWS/);
  assert.match(app,/PERÚ INFORMADO/);
  assert.match(html,/PERÚ <b>INFORMADO<\/b>/);
  assert.match(html,/assets\/newsroom.js\?v=__V__/);
  assert.match(html,/assets\/newsroom.css\?v=__V__/);
});
