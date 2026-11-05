/* PERÚ INFORMADO · lectura ciudadana, sin consultas externas adicionales ni datos ficticios.
   Mejora progresiva: si este archivo no carga, las tarjetas y sus enlaces originales permanecen operativos. */
(function(){
  "use strict";
  var app=document.getElementById("app");
  if(!app) return;
  var reduced=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  var desktopHover=window.matchMedia&&matchMedia("(hover: hover) and (pointer: fine)").matches;
  var topics=[
    {id:"actualidad",label:"Noticias",eyebrow:"HECHOS Y CONTEXTO",title:"¿Qué está pasando en el Perú?",
     short:"Un titular es el comienzo de una historia, no toda la explicación.",
     explain:"Las noticias informan sobre hechos publicados por distintos medios. Antes de sacar conclusiones, identifica quién lo dice, de qué fecha es, si se trata de una noticia o una opinión y qué documentación la respalda.",
     example:"Si dos medios presentan un mismo tema de manera diferente, compara las fechas, las declaraciones citadas y los hechos verificables; no confundas opinión con noticia.",
     takeaway:"TITULAR ≠ HECHO COMPLETAMENTE VERIFICADO",route:"#/noticias",routeLabel:"Explorar noticias aquí"},
    {id:"datos",label:"Datos del Perú",eyebrow:"LAS CIFRAS EN CONTEXTO",title:"¿Qué dicen los datos?",
     short:"Una cifra tiene sentido solo cuando conocemos su fecha, unidad y población.",
     explain:"Los indicadores describen situaciones concretas: empleo, precios, población o acceso a servicios. Un número puede corresponder a Lima, a todo el país, a un mes o a un año; nunca compares periodos y ámbitos distintos como si fueran equivalentes.",
     example:"Si ves una tasa de desempleo, revisa si representa a Lima Metropolitana o a todo el Perú y el periodo de medición. Un porcentaje no equivale a la cantidad de personas.",
     takeaway:"CIFRA ≠ CONTEXTO COMPLETO",route:"#/datos",routeLabel:"Explorar indicadores aquí"},
    {id:"nino",label:"El Niño",eyebrow:"RIESGOS Y PREPARACIÓN",title:"¿Qué ocurre con El Niño?",
     short:"La alerta del fenómeno, el pronóstico del tiempo y el riesgo local son distintos.",
     explain:"ENFEN comunica la situación oficial del fenómeno; el pronóstico estima condiciones futuras y los mapas de riesgo muestran zonas que podrían sufrir daños. Una alerta no significa que hoy exista una inundación en tu distrito.",
     example:"Una previsión de lluvia para una localidad no significa que lloverá en cada calle. Para actuar, revisa la fecha del pronóstico y los avisos de las autoridades de tu zona.",
     takeaway:"ALERTA ≠ EMERGENCIA ACTUAL",route:"#/s/nino",routeLabel:"Entender El Niño aquí"}
  ];
  var current="actualidad";
  function el(tag,cls){var n=document.createElement(tag);if(cls)n.className=cls;return n;}
  function dataSnapshot(id){
    var ed=window.EDITORIAL||{},not=window.NOTICIAS||{};
    if(id==="actualidad"){
      var items=Array.isArray(not.items)?not.items:[];
      return {title:items.length?items.length+" publicaciones indexadas":"Índice de noticias aún sin datos",
        note:"Son registros de medios, no una certificación independiente de su contenido. Cada nota muestra fuente, género y fecha cuando están disponibles."};
    }
    if(id==="datos"){
      var groups=ed.datos&&ed.datos.grupos||[],all=[];
      groups.forEach(function(g){(g.items||[]).forEach(function(i){all.push(i);});});
      var chosen=all.filter(function(i){return i.id==="pob"||i.id==="desemp";})[0]||all[0];
      return chosen?{title:chosen.k+": "+chosen.v+" "+(chosen.un||""),
        note:"Corte: "+(chosen.corte||"sin fecha declarada")+". "+(chosen.c||"Revisa la unidad y la población estudiada.")}:
        {title:"Sin cifra editorial cargada",note:"Consulta la sección Datos del Perú, donde cada indicador muestra fecha de corte y fuente."};
    }
    var e=not.enfen;
    return e&&e.numero?{title:"Comunicado ENFEN indexado: N.° "+e.numero,
      note:"Fecha del documento: "+((((window.EDITORIAL||{}).nino||{}).ultimo||{}).numero===e.numero?window.EDITORIAL.nino.ultimo.fecha:e.fecha||"no confirmada")+". El índice puede estar pendiente de una nueva comprobación; verifica la fecha y la vigencia en la sección El Niño."}:
      {title:"Comunicado ENFEN sin confirmación automática",note:"Revisa la situación oficial y la fecha del documento antes de tomar decisiones."};
  }
  function buildLab(){
    var section=el("section","pe-lab");section.id="pe-lab";section.setAttribute("aria-labelledby","pe-lab-title");
    section.innerHTML='<div class="pe-lab-head"><div><span class="pe-kicker">APRENDE SIN ABANDONAR PERÚ INFORMADO</span><h2 id="pe-lab-title">Entiende la noticia, la cifra o el riesgo</h2><p>Elige un tema para leer su síntesis aquí. El contenido se apoya en los datos y explicaciones disponibles; las fuentes originales se consultan después, si deseas profundizar.</p></div><span class="pe-lab-count" aria-hidden="true">01 / 03</span></div>'+
      '<div class="pe-lab-tabs" role="tablist" aria-label="Tema para comprender">'+topics.map(function(t,i){return '<button type="button" role="tab" id="pe-tab-'+t.id+'" aria-controls="pe-panel" aria-selected="'+(i===0)+'" tabindex="'+(i===0?0:-1)+'" data-pe-tab="'+t.id+'">'+t.label+'</button>';}).join("")+'</div>'+
      '<div class="pe-lab-panel" id="pe-panel" role="tabpanel" aria-labelledby="pe-tab-actualidad" tabindex="0">'+
      '<div class="pe-lab-copy"><span class="pe-lab-eyebrow" id="pe-eyebrow"></span><h3 id="pe-title"></h3><p id="pe-explain"></p><p class="pe-lab-example" id="pe-example"></p><div class="pe-lab-data"><small>DATO O REFERENCIA DISPONIBLE</small><strong id="pe-data-title"></strong><p id="pe-data-note"></p></div><div class="pe-lab-actions"><a class="pe-lab-main" id="pe-route" href="#/noticias">Ir al detalle dentro del portal</a><a class="pe-lab-secondary" href="#/fuentes">Consultar las fuentes y sus fechas →</a></div></div>'+
      '<aside class="pe-lab-takeaway"><small>IDEA CLAVE</small><strong id="pe-takeaway"></strong><p>Primero interpreta. Después contrasta. Comparte solo cuando conozcas el contexto y la fecha.</p></aside></div>';
    return section;
  }
  function selectTopic(container,id,focus){
    var t=topics.filter(function(x){return x.id===id;})[0];if(!t)return;
    current=id;
    topics.forEach(function(x,i){
      var btn=container.querySelector('[data-pe-tab="'+x.id+'"]');
      if(btn){btn.setAttribute("aria-selected",String(id===x.id));btn.tabIndex=id===x.id?0:-1;if(focus&&id===x.id)btn.focus({preventScroll:true});}
    });
    function set(s,value){var n=container.querySelector(s);if(n)n.textContent=value;}
    set("#pe-eyebrow",t.eyebrow);set("#pe-title",t.title);set("#pe-explain",t.explain);
    set("#pe-example","Ejemplo cotidiano: "+t.example);set("#pe-takeaway",t.takeaway);
    var snap=dataSnapshot(id);set("#pe-data-title",snap.title);set("#pe-data-note",snap.note);
    var p=container.querySelector("#pe-panel");p.setAttribute("aria-labelledby","pe-tab-"+id);
    var link=container.querySelector("#pe-route");link.setAttribute("href",t.route);link.textContent=t.routeLabel+" →";
    var n=container.querySelector(".pe-lab-count");n.textContent=(topics.indexOf(t)+1+"").padStart(2,"0")+" / 03";
  }
  function flip(card,on,focus){
    var front=card.querySelector(".pe-front"),back=card.querySelector(".pe-back");
    card.classList.toggle("pe-flipped",on);
    front.inert=on;back.inert=!on;
    var trigger=card.querySelector(".pe-flip-trigger");trigger.setAttribute("aria-expanded",String(on));
    if(focus){var target=on?back.querySelector("[data-pe-open]"):trigger;if(target)target.focus({preventScroll:true});}
  }
  function enhanceHome(home){
    if(home.dataset.peEnhanced)return;
    var cards=Array.prototype.slice.call(home.querySelectorAll(".qs .q"));
    if(cards.length!==3)return;
    home.dataset.peEnhanced="true";
    var lab=buildLab();
    var grid=home.querySelector(".qs");
    grid.insertAdjacentElement("afterend",lab);
    topics.forEach(function(t,i){
      var q=cards[i],front=el("div","pe-face pe-front"),back=el("div","pe-face pe-back"),inner=el("div","pe-card-inner");
      var children=Array.prototype.slice.call(q.children);
      children.forEach(function(ch){front.appendChild(ch);});
      var trigger=el("button","pe-flip-trigger");trigger.type="button";trigger.textContent="Descubrir el concepto ↻";
      trigger.setAttribute("aria-label","Voltear tarjeta y explicar: "+t.title);
      trigger.setAttribute("aria-expanded","false");
      front.insertBefore(trigger,front.querySelector("footer"));
      back.innerHTML='<span class="pe-back-label">'+t.eyebrow+'</span><h3>'+t.title+'</h3><p>'+t.short+'</p><p class="pe-back-idea">'+t.takeaway+'</p>'+
        '<div class="pe-back-actions"><button class="pe-read-more" type="button" data-pe-open="'+t.id+'">Leer síntesis aquí →</button><button class="pe-back-return" type="button">Volver ↻</button></div>';
      inner.appendChild(front);inner.appendChild(back);q.appendChild(inner);q.classList.add("pe-card-3d");back.inert=true;
      trigger.addEventListener("click",function(){flip(q,true,true);});
      front.addEventListener("click",function(e){if(!e.target.closest("a,button"))flip(q,true,true);});
      back.querySelector(".pe-back-return").addEventListener("click",function(){flip(q,false,true);});
      back.querySelector("[data-pe-open]").addEventListener("click",function(){
        selectTopic(lab,t.id,true);flip(q,false,false);
        lab.scrollIntoView({behavior:reduced?"instant":"smooth",block:"start"});
      });
      q.addEventListener("pointerenter",function(e){if(e.pointerType==="mouse"&&desktopHover&&!reduced)flip(q,true,false);});
      q.addEventListener("pointerleave",function(e){
        if(e.pointerType!=="mouse"||!desktopHover)return;
        var bounds=q.getBoundingClientRect();
        // El cambio de cara puede producir un leave sintético dentro de los límites de la tarjeta.
        if(e.clientX>=bounds.left&&e.clientX<=bounds.right&&e.clientY>=bounds.top&&e.clientY<=bounds.bottom)return;
        if(!q.contains(document.activeElement))flip(q,false,false);
      });
      q.addEventListener("focusout",function(e){if(!q.contains(e.relatedTarget)&&!q.matches(":hover"))flip(q,false,false);});
    });
    var tabs=Array.prototype.slice.call(lab.querySelectorAll("[data-pe-tab]"));
    tabs.forEach(function(tab,i){
      tab.addEventListener("click",function(){selectTopic(lab,tab.dataset.peTab,false);});
      tab.addEventListener("keydown",function(e){
        if(["ArrowRight","ArrowLeft","Home","End"].indexOf(e.key)<0)return;
        e.preventDefault();
        var next=e.key==="Home"?0:e.key==="End"?tabs.length-1:(i+(e.key==="ArrowRight"?1:tabs.length-1))%tabs.length;
        selectTopic(lab,tabs[next].dataset.peTab,true);
      });
    });
    selectTopic(lab,current,false);
  }
  function enhance(){
    var home=app.querySelector(".home");if(home)enhanceHome(home);
  }
  var pending=false;
  var observer=new MutationObserver(function(){
    if(pending)return;pending=true;
    queueMicrotask(function(){pending=false;enhance();});
  });
  observer.observe(app,{childList:true});
  enhance();
  // Barra de lectura continua, exclusivamente visual.
  var bar=el("div","pe-reading-progress");bar.setAttribute("aria-hidden","true");
  var ink=el("i");bar.appendChild(ink);document.body.appendChild(bar);
  var ticking=false;
  function progress(){var max=Math.max(1,document.documentElement.scrollHeight-innerHeight);ink.style.transform="scaleX("+Math.min(1,Math.max(0,scrollY/max))+")";ticking=false;}
  function queue(){if(!ticking){ticking=true;requestAnimationFrame(progress);}}
  addEventListener("scroll",queue,{passive:true});addEventListener("resize",queue,{passive:true});queue();
})();
