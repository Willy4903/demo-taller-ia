/* Misma precedencia que scripts/geografia.py; ambas implementaciones se verifican con los mismos casos. */
(function(global) {
  'use strict';
  var r = global.PERU_GEO_REGLAS;
  function normal(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim(); }
  function hay(k,s) { return new RegExp('\\b(?:'+r[k]+')\\b').test(s); }
  function clasificar(item) {
    var titulo=normal(item.titulo).replace(new RegExp(r.ignorar,'g'),' ');
    var resumen=normal(item.resumen).slice(0,600).replace(new RegExp(r.boilerplate,'g'),' ').replace(new RegExp(r.ignorar,'g'),' ');
    var ruta='',host='';try {var u=new URL(item.url);ruta=decodeURIComponent(u.pathname).toLowerCase();host=u.hostname.replace(/^www\./,'');}catch(e){}
    function resultado(zona,motivo) { return {version:r.version,ambito:zona==='latam'?'mundo':zona,zona:zona,motivo:motivo}; }
    if(hay('peru',titulo))return resultado('peru','referencia_peru_titulo');
    if(hay('peru',resumen))return resultado('peru','contexto_peru_resumen');
    if(hay('latam',titulo))return resultado('latam','referencia_latinoamerica_titulo');
    if(hay('mundo',titulo))return resultado('mundo','referencia_internacional_titulo');
    if(r.medios_nacionales.indexOf(host)>=0&&new RegExp(r.secciones_nacionales).test(ruta))return resultado('peru','seccion_nacional_fuente');
    if(hay('latam',resumen))return resultado('latam','contexto_latinoamerica_resumen');
    if(hay('mundo',resumen))return resultado('mundo','contexto_internacional_resumen');
    if(new RegExp(r.secciones_extranjeras).test(ruta))return resultado('mundo','seccion_internacional_fuente');
    return resultado('pendiente','sin_evidencia_geografica');
  }
  global.PERU_GEOGRAFIA={clasificar:clasificar};
})(window);
