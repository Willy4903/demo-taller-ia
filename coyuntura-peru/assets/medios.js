/* PERÚ INFORMADO · Prensa del día (sección de #/datos).
   Lee window.MEDIOS (data/medios.js, generado por scripts/actualizar_medios.py). Solo muestra titulares breves con su página
   y estadísticas: no publica notas ni PDF. Sin dependencias; las funciones puras se prueban con node (vm). */
(function (root) {
  "use strict";
  var COLOR = { politica: "#38BDF8", economia: "#FBBF24", seguridad: "#F87171", salud: "#34D399", educacion: "#A78BFA", clima: "#22D3EE", deportes: "#FB923C", espectaculos: "#F472B6", internacional: "#94A3B8", gestion: "#2DD4BF", tecnologia: "#818CF8", otros: "#64748B" };
  var TZ = "America/Lima";
  var SIGLAS = { BCRP: 1, BCR: 1, MEF: 1, JNE: 1, ONPE: 1, PNP: 1, INEI: 1, SUNAT: 1, SUNEDU: 1, MINSA: 1, ESSALUD: 1, PBI: 1, AFP: 1, OEA: 1, ONU: 1, EEUU: 1, CIDH: 1, DINI: 1, INPE: 1, MTC: 1, JNJ: 1, ENFEN: 1, SENAMHI: 1, INDECI: 1, SBS: 1, SMV: 1, IGV: 1, UIT: 1, CTS: 1, DNI: 1, RENIEC: 1, FIFA: 1, CONMEBOL: 1, UEFA: 1, NBA: 1, TV: 1, IA: 1, OTAN: 1, MIDIS: 1, MINEDU: 1, MIMP: 1, DIRINCRI: 1, FFAA: 1, TC: 1, UNI: 1, UNMSM: 1, PCM: 1, SIS: 1, INDECOPI: 1, OSINERGMIN: 1, OSITRAN: 1 };
  var NF1 = { format: function (v) { return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(v).replace(".", ","); } }; /* coma decimal, como el resto del sitio */
  var NF0 = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 });

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function n0(v) { return NF0.format(v || 0); }
  function fechaLarga(iso) { try { return new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(iso + "T12:00:00Z")); } catch (e) { return iso; } }
  function fechaCorta(iso) { try { return new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(iso + "T12:00:00Z")); } catch (e) { return iso; } }
  function fechaHora(iso) { try { return new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(iso)); } catch (e) { return iso; } }
  function norm(s) { return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }

  /* Titulares impresos en mayúsculas se muestran en minúscula con inicial; se conservan las siglas conocidas. */
  function oracion(t) {
    t = String(t || "").trim();
    var letras = t.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, "");
    if (letras.length < 8 || letras.replace(/[^A-ZÁÉÍÓÚÑ]/g, "").length / letras.length < 0.7) return t;
    var s = t.split(/(\s+)/).map(function (w) {
      var pelada = w.replace(/[^A-Za-zÁÉÍÓÚÑ.]/g, "").replace(/\./g, "");
      return SIGLAS[pelada] ? w : w.toLowerCase();
    }).join("");
    return s.charAt(0).toUpperCase() + s.slice(1).replace(/([.:!?]\s+)([a-záéíóúñ])/g, function (m, a, b) { return a + b.toUpperCase(); });
  }

  function nombreTema(d, id) {
    var c = (d && d.catalogo_temas || []).filter(function (t) { return t.id === id; })[0];
    return c ? c.nombre : (id === "otros" ? "Otros" : id);
  }
  function colorTema(id) { return COLOR[id] || COLOR.otros; }
  function diaDe(d, fecha) { var ds = (d && d.dias) || []; for (var i = 0; i < ds.length; i++) if (ds[i].fecha === fecha) return ds[i]; return ds[0] || null; }

  /* Palabras en alza: conteo de hoy frente al promedio de los días anteriores (hasta 7). Requiere al menos 2 días previos. */
  function tendencias(d, fecha) {
    var serie = ((d && d.serie) || []).filter(function (s) { return s.fecha < fecha; }).slice(0, 7);
    var hoy = diaDe(d, fecha);
    if (!hoy || serie.length < 2) return {};
    var out = {};
    hoy.palabras.forEach(function (p) {
      var prev = serie.reduce(function (a, s) { var f = (s.palabras || []).filter(function (x) { return x[0] === p[0]; })[0]; return a + (f ? f[1] : 0); }, 0) / serie.length;
      if (p[1] >= 5 && prev === 0) out[p[0]] = "nueva";
      else if (p[1] >= 5 && p[1] / prev >= 2) out[p[0]] = "alza";
    });
    return out;
  }

  /* Participación (0-100) de un tema entre los titulares de cada día, de más antiguo a más reciente, hasta 7 días hasta «fecha». */
  function serieTema(d, id, fecha) {
    var s = ((d && d.serie) || []).filter(function (x) { return x.fecha <= fecha; }).slice(0, 7).reverse();
    return s.map(function (x) { return { fecha: x.fecha, v: x.titulares ? Math.round(((x.temas || {})[id] || 0) / x.titulares * 1000) / 10 : 0 }; });
  }

  function spark(puntos, color) {
    if (puntos.length < 2) return "";
    var max = Math.max.apply(null, puntos.map(function (p) { return p.v; }).concat([1])), w = 100, h = 26;
    var pts = puntos.map(function (p, i) { return (i / (puntos.length - 1) * w).toFixed(1) + "," + (h - 2 - p.v / max * (h - 6)).toFixed(1); }).join(" ");
    return '<svg class="pm-sp" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none" aria-hidden="true"><polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>';
  }

  function barras(items, max, color, sufijo) {
    return items.map(function (it) {
      return '<div class="hbar pm-hb" style="--c:' + (it.c || color) + '"><span>' + esc(it.k) + '</span><span><i style="width:' + Math.max(2, Math.round(it.n / max * 100)) + '%"></i></span><span>' + esc(it.v != null ? it.v : n0(it.n)) + (sufijo || "") + "</span></div>";
    }).join("");
  }

  function titularesDe(dia, medio, q) {
    var qq = norm(q || ""), out = [];
    dia.medios.forEach(function (m) {
      if (medio !== "todos" && m.id !== medio) return;
      m.titulares.forEach(function (t) { if (!qq || norm(t.t).indexOf(qq) >= 0 || norm(m.nombre).indexOf(qq) >= 0) out.push({ t: t.t, p: t.p, tema: t.tema, medio: m.nombre }); });
    });
    out.sort(function (a, b) { return (a.p === 1 ? 0 : 1) - (b.p === 1 ? 0 : 1) || a.medio.localeCompare(b.medio) || a.p - b.p; });
    return out;
  }

  function listaTitulares(d, dia, ui) {
    var l = titularesDe(dia, ui.medio, ui.q), mostrar = l.slice(0, ui.max);
    var h = mostrar.length ? '<ul class="pm-lista">' + mostrar.map(function (t) {
      return '<li><span class="pm-pg" title="Página">P. ' + t.p + '</span><div><b>' + esc(oracion(t.t)) + '</b><small>' + esc(t.medio) + ' · <span class="pm-tag" style="--c:' + colorTema(t.tema) + '">' + esc(nombreTema(d, t.tema)) + "</span></small></div></li>";
    }).join("") + "</ul>" : '<div class="vacio">Ningún titular coincide con la búsqueda.</div>';
    if (l.length > ui.max) h += '<p class="pm-mas"><button class="btn o" type="button" data-pm-mas>Ver más (' + (l.length - ui.max) + ")</button></p>";
    return h;
  }

  function html(d, ui) {
    var cab = '<section class="pm" aria-labelledby="pm-t"><div class="sh" style="--c:#38BDF8"><h2 id="pm-t">Prensa del día</h2></div>';
    if (!d || !d.dias || !d.dias.length) {
      return cab + '<div class="vacio">Todavía no hay lectura de prensa. Aparecerá aquí después de la primera carga automática.</div></section>';
    }
    var dia = diaDe(d, ui.fecha), r = dia.resumen, tot = dia.temas.reduce(function (a, t) { return a + t.n; }, 0) || 1;
    var cifras = dia.cifras || {}, nCif = (cifras.soles || 0) + (cifras.dolares || 0) + (cifras.porcentajes || 0) + (cifras.millones || 0);
    var h = cab + '<p class="pm-sub">Lectura automática de ediciones impresas: titulares, temas y cifras. Los titulares pertenecen a cada diario; aquí solo se muestran breves y con su página.</p>';
    h += '<div class="pm-ctl"><label for="pm-dia">Día</label><select id="pm-dia" data-pm-dia>' + d.dias.map(function (x) { return '<option value="' + esc(x.fecha) + '"' + (x.fecha === dia.fecha ? " selected" : "") + ">" + esc(fechaLarga(x.fecha)) + "</option>"; }).join("") + "</select>" +
      (dia.actualizado ? '<span class="pm-act">Actualizado: ' + esc(fechaHora(dia.actualizado)) + " (hora de Lima)</span>" : "") + "</div>";
    h += '<div class="kpis"><div class="kpi"><div class="k">Diarios leídos</div><div class="v">' + n0(r.medios) + '</div></div><div class="kpi"><div class="k">Páginas</div><div class="v">' + n0(r.paginas) + '</div></div><div class="kpi"><div class="k">Titulares</div><div class="v">' + n0(r.titulares) + '</div></div><div class="kpi"><div class="k">Cifras citadas</div><div class="v">' + n0(nCif) + "</div></div></div>";
    if (r.escaneados) h += '<p class="pm-nota">' + r.escaneados + (r.escaneados === 1 ? " edición es una imagen escaneada y no se pudo leer." : " ediciones son imágenes escaneadas y no se pudieron leer.") + "</p>";

    if (dia.sintesis) {
      h += '<div class="panel pm-sin"><h3 class="pt">Síntesis del día</h3><p>' + esc(dia.sintesis) + "</p>" + ((dia.puntos || []).length ? "<ul>" + dia.puntos.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>" : "") + '<p class="pm-nota">Redactada con inteligencia artificial solo a partir de los titulares. Puede omitir matices.</p></div>';
    }

    var temas = dia.temas.slice(0, 8).map(function (t) { return { k: nombreTema(d, t.id), n: t.n, c: colorTema(t.id), v: NF1.format(t.n / tot * 100) + " %" }; });
    var maxT = temas.length ? temas[0].n : 1;
    var tops = dia.temas.slice(0, 4).map(function (t) {
      var s = serieTema(d, t.id, dia.fecha), ult = s.length ? s[s.length - 1].v : 0, prev = s.length > 1 ? s.slice(0, -1).reduce(function (a, x) { return a + x.v; }, 0) / (s.length - 1) : null;
      return '<div class="pm-tr"><span>' + esc(nombreTema(d, t.id)) + "</span>" + spark(s, colorTema(t.id)) + "<span>" + NF1.format(ult) + " %" + (prev === null ? "" : '<small> (antes ' + NF1.format(prev) + " %)</small>") + "</span></div>";
    }).join("");
    var tend = tendencias(d, dia.fecha);
    var palabras = dia.palabras.slice(0, 24), maxP = palabras.length ? palabras[0][1] : 1;
    var lugares = (dia.lugares || []).slice(0, 8).map(function (x) { return { k: x[0], n: x[1] }; });
    var ent = (dia.entidades || []).slice(0, 14);

    h += '<div class="bento pm-b"><div class="panel"><h3 class="pt">Temas de los titulares</h3>' + (temas.length ? barras(temas, maxT) : '<div class="vacio">Sin titulares.</div>') + '<p class="pm-nota">Cada titular se asigna a un tema por palabras clave; puede equivocarse.</p></div>' +
      '<div class="panel"><h3 class="pt">Tendencia · participación por tema</h3>' + (tops && (d.serie || []).length > 1 ? tops : '<div class="vacio">Se necesitan al menos dos días de lectura.</div>') + "</div>" +
      '<div class="panel"><h3 class="pt">Palabras más repetidas</h3><div class="pm-nube">' + palabras.map(function (p) {
        var t = tend[p[0]], k = 0.85 + p[1] / maxP * 0.6;
        return '<span class="pm-w" style="font-size:' + k.toFixed(2) + 'rem" title="' + p[1] + ' menciones">' + esc(p[0]) + (t ? ' <em class="pm-up" title="' + (t === "nueva" ? "No aparecía en los días anteriores" : "Al menos el doble que su promedio reciente") + '">' + (t === "nueva" ? "nueva" : "▲") + "</em>" : "") + "</span>";
      }).join("") + "</div>" + (Object.keys(tend).length ? '<p class="pm-nota">▲ marca palabras que se repiten al menos el doble que su promedio de los días anteriores.</p>' : "") + "</div>" +
      '<div class="panel"><h3 class="pt">Dónde ocurre</h3>' + (lugares.length ? barras(lugares, lugares[0].n, "#2DD4BF") + '<p class="pm-nota">Menciones de cada región o sus ciudades principales en el texto de los diarios leídos.</p>' : '<div class="vacio">Sin datos.</div>') + "</div>" +
      '<div class="panel"><h3 class="pt">Personas, instituciones y siglas</h3>' + (ent.length ? '<div class="pm-nube">' + ent.map(function (e) { return '<span class="pm-w pm-e" title="' + e[1] + " menciones en " + e[2] + (e[2] === 1 ? " diario" : " diarios") + '">' + esc(e[0]) + " <small>" + e[1] + "</small></span>"; }).join("") + "</div>" : '<div class="vacio">Sin datos.</div>') + "</div>" +
      '<div class="panel"><h3 class="pt">Cifras citadas</h3>' + barras([{ k: "Soles (S/)", n: cifras.soles || 0 }, { k: "Dólares (US$)", n: cifras.dolares || 0 }, { k: "Porcentajes", n: cifras.porcentajes || 0 }, { k: "Millones", n: cifras.millones || 0 }], Math.max(cifras.soles || 0, cifras.dolares || 0, cifras.porcentajes || 0, cifras.millones || 0, 1), "#FBBF24") + '<p class="pm-nota">Cuántas veces aparece cada tipo de cifra; no se reproducen los valores.</p></div></div>';

    h += '<div class="sh" style="--c:#94A3B8"><h2>Agenda por diario</h2></div><div class="tabla-w"><table class="tabla pm-tabla"><thead><tr><th scope="col">Diario</th><th scope="col">Pág.</th><th scope="col">Titulares</th><th scope="col">Temas principales</th></tr></thead><tbody>' +
      dia.medios.map(function (m) {
        var ts = Object.keys(m.temas || {}).slice(0, 3).map(function (id) { return '<span class="pm-tag" style="--c:' + colorTema(id) + '">' + esc(nombreTema(d, id)) + " " + m.temas[id] + "</span>"; }).join(" ");
        return "<tr><th scope=\"row\">" + esc(m.nombre) + "<small>" + (m.ambito === "regional" ? "Regional" : m.ambito === "suplemento" ? "Suplemento" : "Nacional") + "</small></th><td>" + n0(m.paginas) + "</td><td>" + (m.calidad === "imagen" ? '<span class="pm-img">Escaneada, sin texto</span>' : n0(m.titulares.length)) + "</td><td>" + (ts || "—") + "</td></tr>";
      }).join("") + "</tbody></table></div>";

    h += '<div class="sh" style="--c:#38BDF8"><h2>Titulares</h2></div><div class="pm-filtro"><div class="chips" role="group" aria-label="Filtrar por diario"><button class="chip' + (ui.medio === "todos" ? " on" : "") + '" type="button" data-pm-medio="todos" aria-pressed="' + (ui.medio === "todos") + '">Todos</button>' +
      dia.medios.filter(function (m) { return m.titulares.length; }).map(function (m) { return '<button class="chip' + (ui.medio === m.id ? " on" : "") + '" type="button" data-pm-medio="' + esc(m.id) + '" aria-pressed="' + (ui.medio === m.id) + '">' + esc(m.nombre) + "</button>"; }).join("") +
      '</div><label class="pm-bus"><span class="sr-only">Buscar en los titulares</span><input type="search" placeholder="Buscar en los titulares" value="' + esc(ui.q) + '" data-pm-q autocomplete="off"></label></div><div id="pm-lista">' + listaTitulares(d, dia, ui) + "</div>";
    h += '<p class="dp-aviso">* Los titulares y las ediciones pertenecen a cada diario. Se leen automáticamente y pueden contener errores de lectura; abre el diario original para confirmar. Las ediciones solo imagen no se pueden leer.</p></section>';
    return h;
  }

  function pintar(raiz, datos) {
    var d = datos && datos.dias ? datos : { dias: [] }, ui = { fecha: d.dias[0] ? d.dias[0].fecha : null, medio: "todos", q: "", max: 20 };
    function todo() { raiz.innerHTML = html(d, ui); enlazar(); }
    function lista() { var l = raiz.querySelector("#pm-lista"); if (l) l.innerHTML = listaTitulares(d, diaDe(d, ui.fecha), ui); enlazarMas(); }
    function enlazarMas() { var b = raiz.querySelector("[data-pm-mas]"); if (b) b.onclick = function () { ui.max += 20; lista(); }; }
    function enlazar() {
      var s = raiz.querySelector("[data-pm-dia]"); if (s) s.onchange = function () { ui.fecha = s.value; ui.medio = "todos"; ui.q = ""; ui.max = 20; todo(); };
      Array.prototype.forEach.call(raiz.querySelectorAll("[data-pm-medio]"), function (b) { b.onclick = function () { ui.medio = b.getAttribute("data-pm-medio"); ui.max = 20; todo(); }; });
      var q = raiz.querySelector("[data-pm-q]"); if (q) q.oninput = function () { ui.q = q.value; ui.max = 20; lista(); };
      enlazarMas();
    }
    todo();
  }

  var api = { pintar: pintar, html: html, oracion: oracion, tendencias: tendencias, serieTema: serieTema, titularesDe: titularesDe };
  root.PeruMedios = api;
})(window);
