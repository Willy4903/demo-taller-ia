/* Perú en Claro · portal de noticias (mobile-first, sin dependencias externas) */
(function () {
  "use strict";
  var ED = window.EDITORIAL, NOT = window.NOTICIAS || { items: [] };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TZ = "America/Lima";

  /* ───── utilidades ───── */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function safeUrl(u) { try { var x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : "#"; } catch (e) { return "#"; } }
  function gl(t) { return esc(t).replace(/\{\{([a-z0-9-]+)\|([^}]+)\}\}/g, function (m, id, txt) { return '<button class="gl" type="button" data-gl="' + id + '">' + txt + "</button>"; }); }
  function norm(s) { return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function fmtFecha(iso, hora) {
    try { return new Intl.DateTimeFormat("es-PE", hora ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TZ } : { day: "numeric", month: "long", year: "numeric", timeZone: TZ }).format(new Date(iso)); } catch (e) { return iso; }
  }
  function corta(iso) { try { return new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric", timeZone: TZ }).format(new Date(iso)); } catch (e) { return iso; } }
  function relativo(iso) {
    var d = Date.parse(iso); if (isNaN(d)) return null;
    var m = Math.round((Date.now() - d) / 60000);
    if (m < 0) return fmtFecha(iso);
    if (m < 60) return "hace " + Math.max(m, 1) + " min";
    if (m < 1440) return "hace " + Math.round(m / 60) + " h";
    if (m < 2880) return "ayer";
    if (m < 43200) return "hace " + Math.round(m / 1440) + " días";
    return fmtFecha(iso);
  }
  function primera(t) { var m = String(t).match(/^.*?[.!?](\s|$)/); return m ? m[0].trim() : t; }
  function sin(t, n) { return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, "") + "…" : t; }

  var SECT = {}; ED.sectores.forEach(function (s) { SECT[s.id] = s; }); SECT.brujula = ED.brujula;
  var ORDEN = ["brujula"].concat(ED.sectores.map(function (s) { return s.id; }));
  var GLOS = {}; ED.glosario.forEach(function (g) { GLOS[g.id] = g; });
  var ARTS = ED.articulos || {};

  /* ───── estado de gamificación (persistente en el navegador) ───── */
  var KEY = "cp_estado_v1";
  var S = (function () { var b = { xp: 0, hechas: {}, terminos: {}, dias: [], bonus: "" }; try { return Object.assign(b, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { return b; } })();
  function guardar() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  var NIVELES = [
    { n: "Viajero", min: 0, ic: "🧭", d: "Empiezas tu camino" }, { n: "Chasqui", min: 80, ic: "🏃", d: "Mensajero del Tahuantinsuyo" },
    { n: "Quipucamayoc", min: 240, ic: "🧶", d: "Guardián de los registros" }, { n: "Amauta", min: 400, ic: "📜", d: "Maestro sabio" },
    { n: "Apu", min: 640, ic: "🏔️", d: "Espíritu protector de la montaña" }
  ];
  function nivelDe(xp) { var i = 0; NIVELES.forEach(function (n, k) { if (xp >= n.min) i = k; }); return i; }
  function ymd(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function racha() { var set = {}; S.dias.forEach(function (d) { set[d] = 1; }); var n = 0, d = new Date(); while (set[ymd(d)]) { n++; d.setDate(d.getDate() - 1); } return n; }
  (function () { var h = ymd(new Date()); if (S.dias.indexOf(h) < 0) S.dias.push(h); if (S.bonus !== h) { S.bonus = h; S.xp += 5; } S.dias = S.dias.slice(-60); guardar(); })();
  function pctNivel() { var i = nivelDe(S.xp), nv = NIVELES[i], sig = NIVELES[i + 1]; return sig ? (S.xp - nv.min) / (sig.min - nv.min) * 100 : 100; }
  function xpChip() { var nv = NIVELES[nivelDe(S.xp)]; $("#xpnivel").textContent = nv.ic; $("#xpnum").textContent = S.xp + " XP"; }

  /* ───── arte editorial (SVG generado) ───── */
  var _g = 0;
  function arte(id, c) {
    var g = "g" + (++_g), grid = ""; for (var i = 25; i < 400; i += 25) grid += '<path d="M' + i + ' 0V225"/>'; for (var j = 25; j < 225; j += 25) grid += '<path d="M0 ' + j + 'H400"/>';
    var M = {
      politica: '<g fill="rgba(255,255,255,.1)" stroke="#fff" stroke-width="3" stroke-linejoin="round"><path d="M100 88h200L200 46z"/><path d="M118 98v56M158 98v56M200 98v56M242 98v56M282 98v56" fill="none"/><path d="M92 160h216v10H92z" fill="#fff"/></g>',
      economia: '<g fill="#fff" fill-opacity=".85"><rect x="88" y="140" width="28" height="42" rx="4"/><rect x="130" y="116" width="28" height="66" rx="4"/><rect x="172" y="96" width="28" height="86" rx="4"/><rect x="214" y="72" width="28" height="110" rx="4"/><rect x="256" y="46" width="28" height="136" rx="4"/></g><polyline points="102,126 144,98 186,80 228,54 270,28" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="270" cy="28" r="8" fill="#fff"/>',
      salud: '<path d="M30 125h95l18-48 30 92 26-62 14 18h157" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><g fill="#fff"><rect x="182" y="34" width="36" height="12" rx="3"/><rect x="194" y="22" width="12" height="36" rx="3"/></g>',
      tecnologia: '<g fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><path d="M60 60h80v50h70v-30h90M60 170h120v-40h60v50h100M140 30v30M280 80v-40"/></g><g fill="#fff"><circle cx="60" cy="60" r="7"/><circle cx="300" cy="80" r="7"/><circle cx="60" cy="170" r="7"/><circle cx="340" cy="180" r="7"/><circle cx="140" cy="30" r="6"/><circle cx="280" cy="40" r="6"/></g><rect x="165" y="92" width="70" height="46" rx="8" fill="rgba(255,255,255,.12)" stroke="#fff" stroke-width="3"/>',
      deporte: '<g fill="none" stroke="#fff" stroke-width="3"><circle cx="200" cy="112" r="62" fill="rgba(255,255,255,.1)"/><path d="M200 82l26 19-10 30h-32l-10-30z" fill="#fff" fill-opacity=".9"/><path d="M200 82V52M226 101l30-10M216 131l18 26M184 131l-18 26M174 101l-30-10"/></g><path d="M20 200q180-60 360 0" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3"/>',
      investigacion: '<g fill="none" stroke="#fff" stroke-width="3"><rect x="250" y="40" width="90" height="120" rx="8" fill="rgba(255,255,255,.1)"/><path d="M265 70h60M265 90h60M265 110h40"/></g><circle cx="170" cy="105" r="52" fill="rgba(255,255,255,.1)" stroke="#fff" stroke-width="7"/><path d="M208 144l52 50" stroke="#fff" stroke-width="13" stroke-linecap="round"/>',
      coyuntura: '<g fill="none" stroke="#fff" stroke-width="3"><circle cx="200" cy="112" r="74"/><circle cx="200" cy="112" r="56" stroke-opacity=".5"/><path d="M200 30v14M200 180v14M118 112h14M268 112h14" stroke-linecap="round"/></g><polygon points="200,52 214,112 200,126 186,112" fill="#fff"/><polygon points="200,172 214,112 200,98 186,112" fill="#fff" fill-opacity=".35"/>',
      mundo: '<g fill="none" stroke="#fff" stroke-width="3"><circle cx="200" cy="112" r="70" fill="rgba(255,255,255,.08)"/><ellipse cx="200" cy="112" rx="30" ry="70"/><path d="M130 112h140M142 80h116M142 144h116"/><ellipse cx="200" cy="112" rx="110" ry="28" stroke-opacity=".5" transform="rotate(-22 200 112)"/></g>'
    };
    M.brujula = M.coyuntura;
    return '<svg viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="' + g + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c + '"/><stop offset="1" stop-color="#0a0a0d"/></linearGradient><radialGradient id="' + g + 'r" cx=".78" cy=".2" r=".65"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="400" height="225" fill="url(#' + g + ')"/><rect width="400" height="225" fill="url(#' + g + 'r)"/><g stroke="#fff" stroke-opacity=".07" fill="none">' + grid + "</g>" + (M[id] || M.coyuntura) + "</svg>";
  }
  window.cpImg = function (im) { var d = im.parentNode, s = d.getAttribute("data-s") || "coyuntura"; d.innerHTML = arte(s, (SECT[s] || SECT.coyuntura).color) + (d.getAttribute("data-b") ? '<span class="badge">' + esc(d.getAttribute("data-b")) + "</span>" : ""); };

  /* ───── modelo de historias ───── */
  var ITEMS = (NOT.items || []).slice().sort(function (a, b) { return (Date.parse(b.fecha) || 0) - (Date.parse(a.fecha) || 0); });
  var HILO = ED.hilo ? { kind: "hilo", sector: "coyuntura", id: "hilo", titulo: ED.hilo.titulo, resumen: ED.hilo.puntos.map(function (p) { return p.k + ": " + p.t; }).join(" · "), url: "#/a/hilo", badge: "Análisis" } : null;
  var INS = ED.insights.map(function (c) { return { kind: "insight", sector: c.sector, id: c.sector, titulo: c.titulo, resumen: c.resumen, url: "#/a/" + c.sector, badge: "Análisis", nivel: c.nivel, raw: c }; });
  function porSector(id) { return ITEMS.filter(function (i) { return i.sector === id; }); }
  function insDe(id) { return INS.filter(function (i) { return i.sector === id; })[0]; }
  function externo(s) { return s.kind === "feed"; }
  function asFeed(it) { return { kind: "feed", sector: it.sector, titulo: it.titulo, resumen: it.resumen || "", url: it.url, fuente: it.fuente, tipo: it.tipo || "comercial", fecha: it.fecha, nota: it.nota, imagen: it.imagen }; }
  var FEED = ITEMS.map(asFeed);

  function thumb(s, badge) {
    var c = (SECT[s.sector] || SECT.coyuntura).color, b = badge ? esc(badge) : "";
    var inner = s.imagen ? '<img loading="lazy" decoding="async" referrerpolicy="no-referrer" alt="" src="' + safeUrl(s.imagen) + '" onerror="cpImg(this)">' : arte(s.sector, c) + (b ? '<span class="badge">' + b + "</span>" : "");
    return '<div class="img" data-s="' + esc(s.sector) + '" data-b="' + b + '">' + inner + "</div>";
  }
  function attrs(s) { return 'href="' + (externo(s) ? safeUrl(s.url) : esc(s.url)) + '"' + (externo(s) ? ' target="_blank" rel="noopener noreferrer"' : ""); }
  function kicker(s) { var x = SECT[s.sector] || SECT.coyuntura; return '<span class="kick" style="--c:' + x.color + '">' + esc(x.nombre) + "</span>"; }
  function meta(s) {
    if (externo(s)) { var r = s.fecha ? relativo(s.fecha) : null; return '<div class="meta"><span class="tp ' + esc(s.tipo) + '">' + esc(s.tipo) + "</span><span>" + esc(s.fuente) + "</span><span>· " + esc(r || s.nota || "fecha no confirmada") + " ↗</span></div>"; }
    return '<div class="meta"><span>Perú en Claro · ' + esc(corta(ED.corte + "T12:00:00Z")) + "</span>" + (s.nivel ? '<span class="conf ' + (s.nivel === "alta" ? "alta" : "media") + '">Confianza ' + (s.nivel === "alta" ? "alta" : "media") + "</span>" : "") + "</div>";
  }
  function lead(s) { return '<a class="s lead" ' + attrs(s) + ">" + thumb(s, s.badge) + '<div>' + '<div style="margin-top:12px">' + kicker(s) + "</div><h2>" + esc(s.titulo) + "</h2><p>" + esc(sin(s.kind === "hilo" ? "Poder, bolsillo, vida diaria y mundo: cuatro frentes que explican el momento del país." : primera(s.resumen), 220)) + "</p>" + meta(s) + "</div></a>"; }
  function row(s) { return '<a class="s row" ' + attrs(s) + "><div>" + kicker(s) + "<h3>" + esc(s.titulo) + "</h3>" + (s.resumen ? "<p>" + esc(sin(primera(s.resumen), 160)) + "</p>" : "") + meta(s) + "</div>" + thumb(s) + "</a>"; }
  function card(s) { return '<a class="s card" ' + attrs(s) + ">" + thumb(s, s.badge) + "<div>" + '<div style="margin-top:10px">' + kicker(s) + "</div><h3>" + esc(s.titulo) + "</h3><p>" + esc(sin(primera(s.resumen), 150)) + "</p>" + meta(s) + "</div></a>"; }
  function sh(titulo, color, enlace, txt) { return '<div class="sh" style="--c:' + color + '"><h2>' + esc(titulo) + "</h2>" + (enlace ? '<a href="' + enlace + '">' + esc(txt || "Ver todo") + " →</a>" : "") + "</div>"; }

  /* ───── radar de temas (derivado de las notas indexadas) ───── */
  var STOP = "para como pero esta este estos estas desde entre sobre tras hasta cuando donde aunque porque ante bajo contra segun sino todo toda todos todas otro otra otros mas menos muy cada tambien mientras durante fueron sera seran puede pueden tiene tienen hace hacen hizo dice dicen luego antes despues ahora nuevo nueva nuevos nuevas primer primera años ano dias dia semana mes meses peru peruano peruana peruanos peruanas lima gobierno pais tras".split(" ");
  function radar() {
    var cuenta = {}, forma = {};
    ITEMS.forEach(function (it) {
      var v = {}; norm(it.titulo + " " + (it.resumen || "")).replace(/[^a-z0-9ñ\s]/g, " ").split(/\s+/).forEach(function (w) { if (w.length < 5 || STOP.indexOf(w) >= 0 || /^\d+$/.test(w) || v[w]) return; v[w] = 1; cuenta[w] = (cuenta[w] || 0) + 1; });
      (it.titulo + " " + (it.resumen || "")).split(/[\s,.;:()"“”¿?¡!]+/).forEach(function (o) { var k = norm(o); if (!forma[k] || o.toLowerCase() === o) forma[k] = o.toLowerCase(); });
    });
    var arr = Object.keys(cuenta).map(function (k) { return [k, cuenta[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
    var min = arr.filter(function (a) { return a[1] >= 2; }).length >= 5 ? 2 : 1;
    return arr.filter(function (a) { return a[1] >= min; }).slice(0, 6).map(function (a) { return { t: forma[a[0]] || a[0], n: a[1] }; });
  }
  function termDelDia() { var d = new Date(); var i = (d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate()) % ED.glosario.length; return ED.glosario[i]; }
  function rail() {
    var r = radar(), t = termDelDia(), niv = NIVELES[nivelDe(S.xp)], hechas = ORDEN.filter(function (i) { return S.hechas[i]; }).length;
    return '<section><h3 class="rt">Radar de temas</h3>' + (r.length ? r.map(function (x, i) { return '<div class="num"><i>' + (i + 1) + "</i><div><b>" + esc(x.t) + "</b><small>" + x.n + (x.n === 1 ? " nota" : " notas") + "</small></div></div>"; }).join("") : '<div class="vacio">Aún no hay suficientes notas.</div>') + "</section>" +
      '<section><div class="promo"><span class="kick" style="color:#ffb3bb">Aprende jugando</span><h3>La Ruta del ciudadano informado</h3><p>' + niv.ic + " " + niv.n + " · " + S.xp + " XP · " + hechas + " de " + ORDEN.length + ' estaciones superadas.</p><a class="btn w" href="#/ruta">' + (hechas ? "Continuar la Ruta" : "Empezar la Ruta") + " →</a></div></section>" +
      '<section><h3 class="rt">Término del día</h3><div class="dia"><b>' + esc(t.t) + "</b><p>" + esc(t.d) + '</p></div><p style="margin:10px 0 0"><a href="#/glosario" style="font-weight:800;color:var(--brand)">Ver el glosario completo →</a></p></section>';
  }

  /* ───── VISTAS ───── */
  function vistaHome() {
    var rest = INS.filter(function (i) { return ["politica", "economia", "salud"].indexOf(i.sector) < 0; });
    var side = INS.filter(function (i) { return ["politica", "economia", "salud"].indexOf(i.sector) >= 0; });
    var h = '<div class="home-top fade">' + (HILO ? lead(HILO) : "") + '<div class="side">' + side.map(row).join("") + "</div></div>";
    h += '<div class="rail-m">' + rail() + "</div>";
    h += '<div class="cols"><div>' + sh("Más análisis", "#000") + '<div class="grid4">' + rest.map(card).join("") + "</div>";
    h += sh("Últimas notas de los medios", "var(--brand)") + '<div class="chips" id="f-chips"></div><div id="f-lista"></div><p style="text-align:center;margin-top:14px" id="f-mas"></p>';
    ED.sectores.forEach(function (s) {
      var its = porSector(s.id).slice(0, 3); if (!its.length) return;
      h += sh(s.nombre, s.color, "#/s/" + s.id, "Ver sección") + its.map(function (i) { return row(asFeed(i)); }).join("");
    });
    h += '</div><aside class="rail-d rail">' + rail() + "</aside></div>";
    return h;
  }
  var filtro = "todas", cuantas = 8;
  function pintarFeed() {
    var l = FEED.filter(function (s) { return filtro === "todas" || (filtro === "indep" ? s.tipo === "independiente" : filtro === "com" ? s.tipo === "comercial" : filtro === "int" ? s.tipo === "internacional" : (s.tipo === "oficial" || s.tipo === "estatal")); });
    var el = $("#f-lista"); if (!el) return;
    el.innerHTML = l.length ? l.slice(0, cuantas).map(row).join("") : '<div class="vacio">No hay notas con este filtro todavía. La próxima actualización (08:00 / 23:00) traerá más.</div>';
    $("#f-mas").innerHTML = l.length > cuantas ? '<button class="btn o" id="b-mas">Ver más notas (' + (l.length - cuantas) + ")</button>" : "";
    var b = $("#b-mas"); if (b) b.onclick = function () { cuantas += 8; pintarFeed(); };
  }
  function iniFeed() {
    var c = $("#f-chips"); if (!c) return;
    var op = [["todas", "Todas"], ["indep", "Independientes"], ["com", "Comerciales"], ["int", "Internacionales"], ["of", "Oficiales"]];
    c.innerHTML = op.map(function (o) { return '<button class="chip' + (o[0] === filtro ? " on" : "") + '" data-f="' + o[0] + '">' + o[1] + "</button>"; }).join("");
    $$("button", c).forEach(function (b) { b.onclick = function () { filtro = b.getAttribute("data-f"); cuantas = 8; iniFeed(); }; });
    pintarFeed();
  }

  function vistaSector(id) {
    var s = SECT[id]; if (!s || id === "brujula") return vistaHome();
    var ins = insDe(id), its = porSector(id).map(asFeed), a = ARTS[id], hecho = !!S.hechas[id];
    var terms = (s.terminos || []).filter(function (t) { return GLOS[t]; });
    var h = '<div class="fade"><div class="shead" style="--c:' + s.color + '"><h1>' + s.icono + " " + esc(s.nombre) + "</h1><p>" + esc(s.lema) + '</p></div><div class="cols sec-cols"><div>';
    h += ins ? lead(ins) : "";
    h += '<div class="entender"><h2>Para entender ' + esc(s.nombre.toLowerCase()) + '</h2><ul>' + s.esencial.map(function (e) { return "<li>" + gl(e) + "</li>"; }).join("") + "</ul></div>";
    h += '<div class="cta-m" style="--c:' + s.color + '"><div><b>' + (hecho ? "✅ Misión superada" : "🎯 Misión: " + esc(s.nombre)) + "</b><small>" + (hecho ? "Puedes repetirla cuando quieras." : "3 preguntas · gana hasta 80 XP") + '</small></div><button class="btn" data-m="' + id + '">' + (hecho ? "Repetir" : "Empezar") + "</button></div>";
    h += sh("Últimas notas · " + s.nombre, s.color) + (its.length ? its.map(row).join("") : '<div class="vacio">Aún no hay notas en esta sección. La próxima actualización automática (08:00 / 23:00) las incorporará.</div>');
    h += '</div><aside class="rail"><section><h3 class="rt">Términos clave</h3>' + terms.map(function (t) { return '<button class="term" data-gl="' + t + '">' + esc(GLOS[t].t) + "</button>"; }).join("") + "</section>" + rail().split("</section>").slice(1).join("</section>") + "</aside></div></div>";
    return h;
  }

  function vistaArticulo(id) {
    var esHilo = id === "hilo", c = esHilo ? null : ED.insights.filter(function (x) { return x.sector === id; })[0];
    if (!esHilo && !c) return vistaHome();
    var sid = esHilo ? "coyuntura" : c.sector, s = SECT[sid], a = ARTS[sid] || {};
    var titulo = esHilo ? ED.hilo.titulo : c.titulo, resumen = esHilo ? "Cuatro frentes explican el momento que vive el país tras el cambio de gobierno." : c.resumen;
    var h = '<article class="art fade"><div class="crumb"><a href="#/">Inicio</a> › <a href="#/s/' + sid + '">' + esc(s.nombre) + "</a></div>" + kicker({ sector: sid }) + "<h1>" + esc(titulo) + '</h1><p class="stand">' + esc(esHilo ? resumen : primera(resumen)) + "</p>";
    h += '<div class="by"><span><b>Redacción Perú en Claro</b></span><span>Corte ' + esc(fmtFecha(ED.corte + "T12:00:00Z")) + "</span>" + (esHilo ? "" : '<span class="conf ' + (c.nivel === "alta" ? "alta" : "media") + '">Confianza ' + (c.nivel === "alta" ? "alta" : "media · verifica") + "</span>") + '<button class="share" id="b-share">↗ Compartir</button></div>';
    h += '<div class="img" data-s="' + sid + '">' + arte(sid, s.color) + '</div><p class="cap">Ilustración generada. Las cifras provienen de las fuentes enlazadas al final.</p>';
    if (esHilo) {
      var mapa = { Poder: "politica", Bolsillo: "economia", "Vida diaria": "salud", Mundo: "mundo" };
      h += ED.hilo.puntos.map(function (p, i) { var t = mapa[p.k]; return '<a class="s hilo-li" href="#/a/' + t + '"><i>' + (i + 1) + "</i><div><b>" + esc(p.k) + "</b><p style=\"margin:2px 0 0;font-size:1rem\">" + esc(p.t) + ' <span style="color:var(--brand);font-weight:800">Leer más →</span></p></div></a>'; }).join("");
      h += '<h2>Qué puedes hacer</h2><p>Sigue estos cuatro frentes en las secciones de arriba y contrasta cada cifra en su fuente primaria. Si quieres aprender los conceptos clave, recorre la <a href="#/ruta" style="color:var(--brand);font-weight:800">Ruta del ciudadano informado</a>.</p>';
    } else {
      h += "<p>" + esc(resumen) + "</p>";
      if (a.contexto) h += "<h2>Para entender el contexto</h2><p>" + esc(a.contexto) + "</p>";
      h += '<div class="box"><h3>Qué significa para ti</h3><p>' + esc(c.paraTi) + "</p></div>";
      if (a.terminos && a.terminos.length) h += "<h2>Términos clave</h2><div>" + a.terminos.filter(function (t) { return GLOS[t]; }).map(function (t) { return '<button class="term" data-gl="' + t + '">' + esc(GLOS[t].t) + "</button>"; }).join("") + "</div>";
      h += '<h2>Fuentes</h2><ul class="src">' + c.fuentes.map(function (f) { return '<li><a href="' + safeUrl(f.u) + '" target="_blank" rel="noopener noreferrer"><span>' + esc(f.n) + "</span><span>↗</span></a></li>"; }).join("") + "</ul>";
      var its = porSector(sid).slice(0, 3).map(asFeed);
      if (its.length) h += sh("Más sobre " + s.nombre.toLowerCase(), s.color, "#/s/" + sid) + its.map(row).join("");
      var sig = INS[(INS.indexOf(insDe(sid)) + 1) % INS.length];
      h += sh("Siguiente análisis", "#000") + row(sig);
    }
    return h + "</article>";
  }

  function vistaRuta() {
    var i = nivelDe(S.xp), nv = NIVELES[i], sig = NIVELES[i + 1], todos = ORDEN.every(function (id) { return S.hechas[id]; });
    var h = '<div class="fade"><div class="shead" style="--c:var(--brand)"><h1>🧭 La Ruta</h1><p>Nueve estaciones, nueve misiones. Lee, responde, gana XP y sube de nivel: de Viajero a Apu.</p></div>';
    h += '<div class="nivel-card"><div class="nv"><div class="medalla">' + nv.ic + "</div><div><b>" + nv.n + "</b><small>" + nv.d + '</small></div><div style="margin-left:auto;text-align:right"><b style="font-size:1.1rem">' + racha() + '</b><small style="display:block">día(s) de racha</small></div></div><div class="bar"><i id="xp-b"></i></div><small class="xt">' + (sig ? S.xp + " / " + sig.min + " XP para " + sig.n : S.xp + " XP · nivel máximo") + "</small></div>";
    h += '<div class="camino">' + ORDEN.map(function (id, k) {
      var s = SECT[id], hecho = !!S.hechas[id], disp = !hecho && (k === 0 || !!S.hechas[ORDEN[k - 1]]), est = hecho ? "hecho" : disp ? "disp" : "bloq";
      return '<div class="st ' + est + '"><div class="dot">' + (hecho ? "✓" : disp ? s.icono : "🔒") + '</div><div class="stc"><span class="paso">Estación ' + (k + 1) + "</span><h3>" + esc(s.nombre) + "</h3><p>" + esc(s.lema) + '</p><div class="stt"><span>' + (hecho ? "Superada · " + S.hechas[id].ac + "/3 aciertos" : disp ? "Disponible" : "Completa la anterior") + "</span>" + (hecho || disp ? '<button class="btn' + (hecho ? " o" : "") + '" data-m="' + id + '" style="min-height:40px">' + (hecho ? "Repetir" : "Empezar") + "</button>" : "") + "</div></div></div>";
    }).join("") + "</div>";
    var ins = [["brujula", "Primer paso", "🧭"], ["politica", "Cívico", "🏛️"], ["economia", "Economista", "📈"], ["salud", "Guardián de la salud", "🩺"], ["tecnologia", "Ciberescudo", "🛰️"], ["deporte", "Hincha informado", "⚽"], ["investigacion", "Sabueso", "🔎"], ["coyuntura", "Analista", "🧭"], ["mundo", "Ciudadano del mundo", "🌎"]], nt = Object.keys(S.terminos).length;
    h += sh("Insignias", "#000") + '<div class="ins-g">' + ins.map(function (x) { return '<div class="ins ' + (S.hechas[x[0]] ? "on" : "") + '"><i>' + x[2] + "</i>" + x[1] + "</div>"; }).join("") + '<div class="ins ' + (nt >= 20 ? "on" : "") + '"><i>📖</i>Lexicógrafo<br>' + Math.min(nt, 20) + '/20 términos</div><div class="ins ' + (todos ? "on" : "") + '"><i>🏔️</i>Cumbre</div></div>';
    h += '<p style="color:var(--tx3);font-size:.85rem;margin-top:16px">Tu progreso se guarda solo en este dispositivo.</p></div>';
    setTimeout(function () { var b = $("#xp-b"); if (b) b.style.width = Math.min(100, pctNivel()) + "%"; }, 150);
    return h;
  }

  var glSec = "todos", glQ = "";
  function vistaGlosario() {
    var h = '<div class="fade"><div class="shead" style="--c:var(--brand)"><h1>📖 Glosario</h1><p>Palabras del debate público explicadas sin jerga. Toca un término para marcarlo como aprendido.</p></div><div class="gsearch"><input id="gl-q" type="search" inputmode="search" placeholder="Buscar: vacancia, PBI, dengue…" aria-label="Buscar en el glosario" autocomplete="off"></div><div class="chips" id="gl-c"></div><div id="gl-l"></div></div>';
    setTimeout(function () { var q = $("#gl-q"); if (q) { q.value = glQ; q.oninput = function () { glQ = q.value; listaGl(); }; } listaGl(); }, 0);
    return h;
  }
  function listaGl() {
    var tb = [{ id: "todos", nombre: "Todos" }].concat(ED.sectores), c = $("#gl-c"); if (!c) return;
    c.innerHTML = tb.map(function (s) { return '<button class="chip' + (s.id === glSec ? " on" : "") + '" data-s="' + s.id + '">' + esc(s.nombre) + "</button>"; }).join("");
    $$("button", c).forEach(function (b) { b.onclick = function () { glSec = b.getAttribute("data-s"); listaGl(); }; });
    var q = norm(glQ), l = ED.glosario.filter(function (g) { return (glSec === "todos" || g.s === glSec) && (!q || norm(g.t + " " + g.d).indexOf(q) >= 0); }).sort(function (a, b) { return a.t.localeCompare(b.t, "es"); });
    var out = "", letra = "";
    l.forEach(function (g) { var L = norm(g.t)[0].toUpperCase(); if (L !== letra) { letra = L; out += '<div class="letra">' + L + "</div>"; } var s = SECT[g.s] || SECT.coyuntura; out += '<button class="gt' + (S.terminos[g.id] ? " visto" : "") + '" data-t="' + g.id + '" style="--c:' + s.color + '"><h3>' + esc(g.t) + "<small>" + esc(s.nombre) + "</small></h3><p>" + esc(g.d) + "</p></button>"; });
    $("#gl-l").innerHTML = out || '<div class="vacio" style="margin-top:16px">Sin resultados. Prueba con otra palabra.</div>';
    $$("#gl-l .gt").forEach(function (b) { b.onclick = function () { marcar(b.getAttribute("data-t")); b.classList.add("visto"); }; });
  }

  function vistaFuentes() {
    var grupos = [["Medios independientes y de investigación", function (f) { return /Independiente|Sin fines|Semanario|Programa|Análisis|Medio referente|Digital/.test(f.tipo) && !/Comercial/.test(f.tipo); }], ["Medios comerciales y semanarios", function (f) { return /Comercial|Semanario ?$/.test(f.tipo) && !/Independiente/.test(f.tipo); }], ["Internacionales", function (f) { return /Internacional/.test(f.tipo); }], ["Datos oficiales y Estado", function (f) { return /Dato oficial|Estatal/.test(f.tipo); }]], usados = {};
    var h = '<div class="fade"><div class="shead" style="--c:var(--brand)"><h1>🔗 Fuentes</h1><p>De dónde sale la información. “Independiente” no es sinónimo de neutral: lee varios medios y contrasta.</p></div>';
    h += '<div class="tips"><div><b>1 · ¿Quién lo dice?</b><br>Identifica al medio y al autor. ¿Es noticia, análisis u opinión?</div><div><b>2 · ¿Con qué evidencia?</b><br>Busca documentos, datos y declaraciones verificables.</div><div><b>3 · ¿De cuándo es?</b><br>Una cifra vieja puede parecer actual. Mira la fecha de corte.</div><div><b>4 · ¿Quién más lo confirma?</b><br>Contrasta con una fuente distinta, idealmente oficial.</div></div>';
    grupos.forEach(function (g) {
      var l = ED.fuentes.filter(function (f) { var ok = !usados[f.n] && g[1](f); if (ok) usados[f.n] = 1; return ok; });
      if (l.length) h += '<section class="fg"><h2>' + g[0] + "</h2>" + l.map(function (f) { return '<a class="fr" href="' + safeUrl(f.u) + '" target="_blank" rel="noopener noreferrer"><div><b>' + esc(f.n) + "</b><small>" + esc(f.tipo) + "</small><p>" + esc(f.foco) + "</p></div><span>↗</span></a>"; }).join("") + "</section>";
    });
    var resto = ED.fuentes.filter(function (f) { return !usados[f.n]; });
    if (resto.length) h += '<section class="fg"><h2>Otras fuentes</h2>' + resto.map(function (f) { return '<a class="fr" href="' + safeUrl(f.u) + '" target="_blank" rel="noopener noreferrer"><div><b>' + esc(f.n) + "</b><small>" + esc(f.tipo) + "</small><p>" + esc(f.foco) + "</p></div><span>↗</span></a>"; }).join("") + "</section>";
    h += '<section class="fg"><h2>¿Cómo funciona y cada cuánto se actualiza?</h2><div class="box" style="margin:10px 0"><p style="font-size:.95rem">Un flujo automático de GitHub Actions lee los feeds RSS de estos medios <b>dos veces al día (08:00 y 23:00, hora de Lima)</b>, clasifica las notas por sector y publica el sitio. Mostramos título, resumen breve y enlace; el contenido pertenece a cada medio. Los análisis llevan fecha de corte y nivel de confianza. La clasificación por sector es automática y puede equivocarse.</p></div></section></div>';
    return h;
  }

  /* ───── enrutador ───── */
  var TITULO = "Perú en Claro";
  function ruta() { var h = location.hash.replace(/^#\/?/, ""), p = h.split("/"); return { v: p[0] || "inicio", id: p[1] }; }
  function navegar() {
    var r = ruta(), html, tab = "inicio", nav = "inicio", t = TITULO;
    if (r.v === "s" && SECT[r.id] && r.id !== "brujula") { html = vistaSector(r.id); nav = r.id; tab = "secciones"; t = SECT[r.id].nombre + " · " + TITULO; }
    else if (r.v === "a") { html = vistaArticulo(r.id); var ar = ED.insights.filter(function (x) { return x.sector === r.id; })[0]; nav = r.id === "hilo" ? "inicio" : (ar ? ar.sector : "inicio"); t = (r.id === "hilo" ? ED.hilo.titulo : ar ? ar.titulo : TITULO) + " · " + TITULO; }
    else if (r.v === "ruta") { html = vistaRuta(); nav = "ruta"; tab = "ruta"; t = "La Ruta · " + TITULO; }
    else if (r.v === "glosario") { html = vistaGlosario(); nav = "glosario"; tab = "glosario"; t = "Glosario · " + TITULO; }
    else if (r.v === "fuentes") { html = vistaFuentes(); nav = "fuentes"; tab = ""; t = "Fuentes · " + TITULO; }
    else { html = vistaHome(); }
    $("#app").innerHTML = html; document.title = t;
    $$("#snav a").forEach(function (a) { var on = a.getAttribute("data-n") === nav; a.classList.toggle("on", on); if (on) a.scrollIntoView({ inline: "center", block: "nearest" }); });
    $$("#tabbar [data-t]").forEach(function (a) { a.classList.toggle("on", a.getAttribute("data-t") === tab); });
    if (r.v === "inicio") iniFeed();
    var sh = $("#b-share"); if (sh) sh.onclick = compartir;
    window.scrollTo(0, 0);
  }
  function compartir() {
    var d = { title: document.title, url: location.href };
    if (navigator.share) navigator.share(d).catch(function () {});
    else if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(function () { toast("Enlace copiado"); });
  }
  function menuNav() {
    var items = [["inicio", "Inicio", "#/"]].concat(ED.sectores.map(function (s) { return [s.id, s.nombre, "#/s/" + s.id]; }), [["ruta", "Ruta", "#/ruta"], ["glosario", "Glosario", "#/glosario"], ["fuentes", "Fuentes", "#/fuentes"]]);
    $("#snav").innerHTML = items.map(function (x) { return '<li><a href="' + x[2] + '" data-n="' + x[0] + '">' + esc(x[1]) + "</a></li>"; }).join("");
  }

  /* ───── hojas, toasts y utilidades de interfaz ───── */
  var hojaAbierta = null;
  function ocultarHojas() { $$(".sheet.on").forEach(function (s) { s.classList.remove("on"); }); }
  function abrirHoja(id) { ocultarHojas(); hojaAbierta = $(id); hojaAbierta.classList.add("on"); $("#veil").classList.add("on"); document.body.style.overflow = "hidden"; }
  function cerrarHojas() { ocultarHojas(); $("#veil").classList.remove("on"); document.body.style.overflow = ""; hojaAbierta = null; M = null; }
  function refrescar() { var r = ruta().v; if (r === "ruta" || r === "s" || r === "inicio") { var y = window.scrollY; navegar(); window.scrollTo(0, y); } }
  function toast(t) { var d = document.createElement("div"); d.className = "toast"; d.textContent = t; document.body.appendChild(d); setTimeout(function () { d.style.transition = "opacity .5s"; d.style.opacity = 0; setTimeout(function () { d.remove(); }, 600); }, 2400); }
  function confeti() {
    if (reduce) return; var c = $("#confeti"), col = ["#D91023", "#F5B83D", "#111", "#fff", "#2f7bff"];
    for (var i = 0; i < 80; i++) { var p = document.createElement("i"); p.style.left = Math.random() * 100 + "vw"; p.style.background = col[i % col.length]; p.style.animationDuration = 2 + Math.random() * 2 + "s"; p.style.animationDelay = Math.random() * .5 + "s"; p.style.borderRadius = Math.random() > .5 ? "50%" : "2px"; c.appendChild(p); }
    setTimeout(function () { c.innerHTML = ""; }, 4800);
  }
  function ganar(x) { var a = nivelDe(S.xp); S.xp += x; guardar(); xpChip(); if (nivelDe(S.xp) > a) { toast("🎉 ¡Subiste a " + NIVELES[nivelDe(S.xp)].n + "!"); confeti(); } }
  function marcar(id) { if (!S.terminos[id]) { S.terminos[id] = 1; var n = Object.keys(S.terminos).length; guardar(); if (n <= 20) ganar(1); if (n === 20) toast("🏅 Insignia: Lexicógrafo"); } }

  /* ───── misiones (hoja inferior en móvil) ───── */
  var M = null;
  function abrirMision(id) { M = { id: id, paso: 0, q: 0, ac: 0, resp: false }; pintarMision(); abrirHoja("#modal"); }
  function pintarMision() {
    var s = SECT[M.id], m = s.mision, c = $("#m-caja"), h = '<button class="sx" aria-label="Cerrar" data-x="1">✕</button>';
    if (M.paso === 0) {
      var nt = porSector(M.id).slice(0, 2);
      h += '<div class="paso">Estación ' + (ORDEN.indexOf(M.id) + 1) + " de " + ORDEN.length + ' · Briefing</div><h3 id="m-t">' + s.icono + " " + esc(m.titulo) + '</h3><p style="color:var(--tx2);margin:0">' + esc(s.lema) + '</p><ul class="esc">' + s.esencial.map(function (e) { return "<li>" + gl(e) + "</li>"; }).join("") + "</ul>" +
        (nt.length ? '<p style="font-size:.85rem;color:var(--tx3);margin-bottom:6px">Para ir más profundo:</p>' + nt.map(function (n) { return '<p style="margin:4px 0"><a href="' + safeUrl(n.url) + '" target="_blank" rel="noopener noreferrer" style="color:var(--brand);font-weight:700">↗ ' + esc(sin(n.titulo, 70)) + "</a></p>"; }).join("") : "") +
        '<p style="margin-top:18px"><button class="btn" data-a="quiz" style="width:100%">Listo, a la misión →</button></p>';
    } else if (M.paso === 1) {
      var q = m.preguntas[M.q];
      h += '<div class="paso">Pregunta ' + (M.q + 1) + " de " + m.preguntas.length + '</div><h3 id="m-t">' + esc(q.q) + "</h3>" + q.o.map(function (o, i) { return '<button class="opt" data-o="' + i + '">' + esc(o) + "</button>"; }).join("") + '<div id="porque"></div>';
    } else {
      var ok = M.ac >= 2, ya = !!S.hechas[M.id], xp = 50 + 10 * M.ac, k = ORDEN.indexOf(M.id), sg = ORDEN[k + 1];
      h += '<div class="resultado"><div class="big">' + (ok ? "🏆" : "🌧️") + '</div><h3 id="m-t">' + (ok ? "¡Estación superada!" : "Casi lo logras") + '</h3><p style="color:var(--tx2)">Acertaste <b style="color:var(--tx)">' + M.ac + " de " + m.preguntas.length + "</b>. " + (ok ? (M.nuevo ? 'Ganaste <b style="color:var(--brand)">+' + xp + " XP</b>." : "Ya la habías superado (sin XP extra).") : "Necesitas al menos 2 aciertos. Repasa el briefing e inténtalo otra vez.") + '</p><div class="mnl" style="justify-content:center">' +
        (ok ? (sg ? '<button class="btn" data-a="sig" data-s="' + sg + '">Siguiente estación →</button>' : '<button class="btn" data-a="fin">🏔️ Ver mi cumbre</button>') : '<button class="btn" data-a="reintentar">Reintentar</button><button class="btn o" data-a="repasar">Repasar</button>') + (M.id !== "brujula" ? '<button class="btn o" data-a="sector" data-s="' + M.id + '">Ver ' + esc(s.nombre) + "</button>" : "") + "</div></div>";
    }
    c.innerHTML = h; c.scrollTop = 0; $("#modal .sheet-in").scrollTop = 0;
  }
  function responder(i) {
    if (M.resp) return; M.resp = true; var m = SECT[M.id].mision, q = m.preguntas[M.q];
    $$(".opt").forEach(function (b, k) { b.disabled = true; if (k === q.c) b.classList.add("ok"); else if (k === i) b.classList.add("mal"); });
    if (i === q.c) M.ac++;
    $("#porque").innerHTML = '<div class="porque">' + (i === q.c ? "✅ ¡Correcto! " : "❌ No exactamente. ") + esc(q.p) + '</div><p style="margin-top:14px"><button class="btn" data-a="next" style="width:100%">' + (M.q + 1 < m.preguntas.length ? "Siguiente pregunta →" : "Ver resultado →") + "</button></p>";
  }

  /* ───── búsqueda ───── */
  function abrirBuscar() {
    $("#buscar-in").innerHTML = '<button class="sx" aria-label="Cerrar" data-x="1">✕</button><div class="bin"><div class="paso">Buscar</div><h3 style="margin-bottom:10px">Noticias, análisis y glosario</h3><input id="q" type="search" inputmode="search" placeholder="Ej.: dengue, inflación, Senado…" aria-label="Buscar" autocomplete="off"><div class="res" id="res"></div></div>';
    abrirHoja("#buscar"); var q = $("#q"); setTimeout(function () { q.focus(); }, 300);
    function ir() {
      var t = norm(q.value.trim()), out = ""; if (t.length < 2) { $("#res").innerHTML = '<p style="color:var(--tx3)">Escribe al menos 2 letras.</p>'; return; }
      var hs = (HILO ? [HILO] : []).concat(INS).concat(FEED).filter(function (s) { return norm(s.titulo + " " + (s.resumen || "")).indexOf(t) >= 0; }).slice(0, 12);
      var gs = ED.glosario.filter(function (g) { return norm(g.t + " " + g.d).indexOf(t) >= 0; }).slice(0, 6);
      if (hs.length) out += '<div class="fg" style="margin-top:14px"><h2>Noticias y análisis</h2>' + hs.map(row).join("") + "</div>";
      if (gs.length) out += '<div class="fg" style="margin-top:14px"><h2>Glosario</h2>' + gs.map(function (g) { return '<button class="gt" data-gl="' + g.id + '" style="--c:' + (SECT[g.s] || SECT.coyuntura).color + '"><h3>' + esc(g.t) + "</h3><p>" + esc(sin(g.d, 120)) + "</p></button>"; }).join("") + "</div>";
      $("#res").innerHTML = out || '<div class="vacio" style="margin-top:16px">Sin resultados para “' + esc(q.value) + "”.</div>";
    }
    q.addEventListener("input", ir); ir();
  }
  function abrirMenu() {
    $("#menu-in").innerHTML = '<button class="sx" aria-label="Cerrar" data-x="1">✕</button><div class="paso">Secciones</div><h3>Explora por tema</h3><div class="menu-g">' + ED.sectores.map(function (s) { return '<a href="#/s/' + s.id + '" data-cerrar="1" style="--c:' + s.color + '"><span>' + s.icono + "</span>" + esc(s.nombre) + "</a>"; }).join("") + '</div><div class="menu-g" style="grid-template-columns:1fr 1fr"><a href="#/fuentes" data-cerrar="1" style="--c:#000"><span>🔗</span>Fuentes</a><a href="#/ruta" data-cerrar="1" style="--c:var(--brand)"><span>🧭</span>La Ruta</a></div>';
    abrirHoja("#menu");
  }

  /* ───── globo de glosario ───── */
  function mostrarPop(el) {
    var g = GLOS[el.getAttribute("data-gl")]; if (!g) return;
    var p = $("#pop"); p.innerHTML = "<b>" + esc(g.t) + "</b>" + esc(g.d); p.classList.add("on");
    if (innerWidth < 700) { p.style.left = "12px"; p.style.right = "12px"; p.style.maxWidth = "none"; p.style.top = "auto"; p.style.bottom = "calc(var(--tab) + var(--safe-b) + 12px)"; }
    else { var r = el.getBoundingClientRect(), w = Math.min(360, innerWidth - 20); p.style.right = "auto"; p.style.bottom = "auto"; p.style.maxWidth = w + "px"; p.style.left = Math.max(10, Math.min(innerWidth - w - 10, r.left)) + "px"; var top = r.bottom + 8; if (top + p.offsetHeight > innerHeight - 10) top = Math.max(10, r.top - p.offsetHeight - 8); p.style.top = top + "px"; }
    popY = window.scrollY; marcar(g.id);
  }
  var popY = 0;

  /* ───── eventos globales ───── */
  document.addEventListener("click", function (e) {
    var t = e.target, c = t.closest ? t.closest.bind(t) : function () { return null; };
    var g = c("[data-gl]"); if (g) { mostrarPop(g); return; }
    if (!c("#pop")) $("#pop").classList.remove("on");
    if (c("[data-cerrar]")) { setTimeout(cerrarHojas, 10); return; }
    if (t.id === "veil" || c("[data-x]")) { cerrarHojas(); return; }
    var mi = c("[data-m]"); if (mi) { abrirMision(mi.getAttribute("data-m")); return; }
    var o = c("[data-o]"); if (o && M) { responder(+o.getAttribute("data-o")); return; }
    var a = c("[data-a]"); if (!a || !M) return; var act = a.getAttribute("data-a"), m = SECT[M.id].mision;
    if (act === "quiz") { M.paso = 1; M.q = 0; M.ac = 0; M.resp = false; pintarMision(); }
    else if (act === "next") { M.resp = false; if (M.q + 1 < m.preguntas.length) M.q++; else { M.paso = 2; M.nuevo = false; if (M.ac >= 2 && !S.hechas[M.id]) { S.hechas[M.id] = { ac: M.ac, f: ymd(new Date()) }; M.nuevo = true; ganar(50 + 10 * M.ac); confeti(); refrescar(); } } pintarMision(); }
    else if (act === "repasar") { M.paso = 0; pintarMision(); }
    else if (act === "reintentar") { M.paso = 1; M.q = 0; M.ac = 0; M.resp = false; pintarMision(); }
    else if (act === "sig") { var s2 = a.getAttribute("data-s"); cerrarHojas(); if (ruta().v === "ruta") navegar(); abrirMision(s2); }
    else if (act === "sector") { var sid = a.getAttribute("data-s"); cerrarHojas(); location.hash = "#/s/" + sid; }
    else if (act === "fin") { cerrarHojas(); location.hash = "#/ruta"; toast("🏔️ ¡Llegaste a la cumbre!"); confeti(); }
  });
  addEventListener("keydown", function (e) { if (e.key === "Escape") { cerrarHojas(); $("#pop").classList.remove("on"); } });
  addEventListener("hashchange", function () { cerrarHojas(); navegar(); });
  addEventListener("scroll", function () { if (Math.abs(window.scrollY - popY) > 60) $("#pop").classList.remove("on"); }, { passive: true });
  $("#b-buscar").onclick = abrirBuscar; $("#t-bus").onclick = abrirBuscar; $("#t-sec").onclick = abrirMenu;
  (function tema() {
    var r = document.documentElement, g = null; try { g = localStorage.getItem("cp_tema"); } catch (e) {} if (g) r.setAttribute("data-theme", g);
    $("#b-tema").onclick = function () { var oscuro = r.getAttribute("data-theme") ? r.getAttribute("data-theme") === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; var n = oscuro ? "light" : "dark"; r.setAttribute("data-theme", n); try { localStorage.setItem("cp_tema", n); } catch (e) {} };
  })();

  /* ───── estado en vivo ───── */
  function estado() {
    function pintar() {
      var now = Date.now(), off = -5 * 3600e3, l = new Date(now + off), y = l.getUTCFullYear(), m = l.getUTCMonth(), d = l.getUTCDate();
      var c = [Date.UTC(y, m, d, 8) - off, Date.UTC(y, m, d, 23) - off, Date.UTC(y, m, d + 1, 8) - off].filter(function (t) { return t > now; })[0];
      var mins = Math.round((c - now) / 60000), hh = Math.floor(mins / 60), mm = mins % 60, cl = new Date(c + off), hoy = cl.getUTCDate() === d;
      $("#status").innerHTML = '<span class="live">Actualizado</span><span>' + (NOT.generado ? esc(corta(NOT.generado)) + ", " + esc(new Intl.DateTimeFormat("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(NOT.generado))) : "—") + '</span><span class="nx">Próxima: ' + (hoy ? "hoy" : "mañana") + " " + String(cl.getUTCHours()).padStart(2, "0") + ":00 · en " + (hh ? hh + " h " : "") + mm + " min</span>";
    }
    pintar(); setInterval(pintar, 30000);
    $("#f-ult").textContent = NOT.generado ? fmtFecha(NOT.generado, true) : "—"; $("#f-corte").textContent = fmtFecha(ED.corte + "T12:00:00Z");
  }

  /* ───── arranque ───── */
  menuNav(); estado(); xpChip(); navegar();
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register("sw.js").catch(function () {});
})();
