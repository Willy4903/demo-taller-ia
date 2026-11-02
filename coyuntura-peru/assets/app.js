/* Contexto Perú · panel de inteligencia cívica (mobile-first, sin dependencias de código) */
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
  /* formato peruano oficial del INEI: coma decimal y espacio como separador de miles */
  function num(v, dec) { return new Intl.NumberFormat("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v).replace(/,/g, " ").replace(".", ","); }
  function primera(t) { var m = String(t).match(/^.*?[.!?](\s|$)/); return m ? m[0].trim() : t; }
  function nomFrase(s) { return s.id === "nino" ? "El Niño" : s.nombre.toLowerCase(); }
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
  function xpChip() { var nv = NIVELES[nivelDe(S.xp)]; $("#xpchip").title = "Nivel: " + nv.n; $("#xpnum").textContent = S.xp + " XP"; }

  /* ───── fotos reales: si una imagen falla, se quita (nunca se sustituye por ilustraciones) ───── */
  window.cpImg = function (im) { var d = im.parentNode; if (!d) return; var r = d.closest && d.closest(".row"); if (r) r.classList.add("nofoto"); d.remove(); };

  /* ───── modelo de historias ───── */
  var ITEMS = (NOT.items || []).slice().sort(function (a, b) { return (Date.parse(b.fecha) || 0) - (Date.parse(a.fecha) || 0); });
  var HILO = ED.hilo ? { kind: "hilo", sector: "coyuntura", id: "hilo", titulo: ED.hilo.titulo, resumen: ED.hilo.puntos.map(function (p) { return p.k + ": " + p.t; }).join(" · "), url: "#/a/hilo", badge: "Análisis" } : null;
  var INS = ED.insights.map(function (c) { return { kind: "insight", sector: c.sector, id: c.id || c.sector, titulo: c.titulo, resumen: c.resumen, url: "#/a/" + (c.id || c.sector), badge: "Análisis", nivel: c.nivel, raw: c }; });
  function porSector(id) { return ITEMS.filter(function (i) { return i.sector === id; }); }
  function insDe(id) { return INS.filter(function (i) { return i.sector === id; })[0]; }
  function externo(s) { return s.kind === "feed"; }
  function ambitoDe(it) { return it.ambito || (it.tipo === "internacional" ? "mundo" : "peru"); }
  function asFeed(it) { return { kind: "feed", ambito: it.ambito, sector: it.sector, titulo: it.titulo, resumen: it.resumen || "", url: it.url, fuente: it.fuente, tipo: it.tipo || "comercial", fecha: it.fecha, nota: it.nota, imagen: it.imagen }; }
  var FEED = ITEMS.map(asFeed);

  var EI = NOT.imagenes_editorial || {};
  function fotoInfo(s) {
    if (s.imagen) return { u: s.imagen, c: s.fuente || "" };
    var k = s.kind === "hilo" ? "hilo" : s.id, e = EI[k];
    if (e && e.url) return { u: e.url, c: e.fuente || "" };
    if (s.kind === "hilo") { for (var j = 0; j < INS.length; j++) { var f = EI[INS[j].id]; if (f && f.url) return { u: f.url, c: f.fuente || "" }; } }
    if (s.kind === "feed") return null;
    var it = ITEMS.filter(function (x) { return x.sector === s.sector && x.imagen; })[0];
    return it ? { u: it.imagen, c: it.fuente || "" } : null;
  }
  function thumb(s, cred) {
    var f = fotoInfo(s); if (!f) return "";
    return '<div class="ph"><img loading="lazy" decoding="async" referrerpolicy="no-referrer" alt="" src="' + safeUrl(f.u) + '" onerror="cpImg(this)">' + (cred && f.c ? '<span class="cred">Foto: ' + esc(f.c) + "</span>" : "") + "</div>";
  }
  function attrs(s) { return 'href="' + (externo(s) ? safeUrl(s.url) : esc(s.url)) + '"' + (externo(s) ? ' target="_blank" rel="noopener noreferrer"' : ""); }
  function kicker(s) { var x = SECT[s.sector] || SECT.coyuntura; return '<span class="kick" style="--c:' + x.color + '">' + esc(x.nombre) + "</span>"; }
  function meta(s) {
    if (externo(s)) { var r = s.fecha ? relativo(s.fecha) : null; return '<div class="meta"><span class="tp ' + esc(s.tipo) + '">' + esc(s.tipo) + "</span><span>" + esc(s.fuente) + "</span><span>· " + esc(r || s.nota || "fecha no confirmada") + " ↗</span></div>"; }
    return '<div class="meta"><span>Contexto Perú · ' + esc(corta(ED.corte + "T12:00:00Z")) + "</span>" + (s.nivel ? '<span class="conf ' + (s.nivel === "alta" ? "alta" : "media") + '" title="Alta: confirmado en fuente oficial. Media: se apoya en prensa; conviene verificar.">Confianza ' + (s.nivel === "alta" ? "alta" : "media") + "</span>" : "") + "</div>";
  }
  function leadCard(s) {
    var raw = s.raw || {}, fu = (raw.fuentes || [])[0];
    return '<article class="lead-card"><a href="' + esc(s.url) + '" aria-hidden="true" tabindex="-1">' + thumb(s, true) + "</a>" + kicker(s) + '<span class="kick" style="margin-left:8px;color:var(--red-t)">· ANÁLISIS</span><h2><a href="' + esc(s.url) + '">' + esc(s.titulo) + '</a></h2><p class="res">' + esc(sin(primera(s.resumen), 260)) + "</p>" + meta(s) +
      '<div class="acc"><a class="btn" href="' + esc(s.url) + '">Leer el análisis →</a>' + (fu ? '<a class="lk" href="' + safeUrl(fu.u) + '" target="_blank" rel="noopener noreferrer">Leer fuente original ↗</a>' : "") + "</div>" + "</article>";
  }
  function row(s) { var f = thumb(s); return '<a class="s row' + (f ? "" : " nofoto") + '" ' + attrs(s) + "><div>" + kicker(s) + "<h3>" + esc(s.titulo) + "</h3>" + (s.resumen ? "<p>" + esc(sin(primera(s.resumen), 160)) + "</p>" : "") + meta(s) + "</div>" + f + "</a>"; }
  function card(s) { return '<a class="s card" ' + attrs(s) + ">" + thumb(s) + "<div>" + kicker(s) + "<h3>" + esc(s.titulo) + "</h3><p>" + esc(sin(primera(s.resumen), 150)) + "</p>" + meta(s) + "</div></a>"; }
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
  function rutaMini() {
    var niv = NIVELES[nivelDe(S.xp)], sig = NIVELES[nivelDe(S.xp) + 1], hechas = ORDEN.filter(function (i) { return S.hechas[i]; }).length;
    var pend = ORDEN.findIndex(function (i) { return !S.hechas[i]; }); if (pend < 0) pend = ORDEN.length - 1;
    var ini = Math.max(0, Math.min(pend - 1, ORDEN.length - 5)), vis = ORDEN.slice(ini, ini + 5);
    var h = '<div class="rmini"><div class="nv"><div class="medalla">' + niv.ic + "</div><div><b>" + niv.n + '</b><small class="mono">' + hechas + " de " + ORDEN.length + " estaciones</small></div></div>" +
      '<div class="bar" aria-hidden="true"><i style="width:' + Math.min(100, pctNivel()) + '%"></i></div><ol class="tl" style="list-style:none;margin:0;padding:0">';
    h += vis.map(function (id) {
      var k = ORDEN.indexOf(id), s = SECT[id], hecho = !!S.hechas[id], disp = !hecho && (k === 0 || !!S.hechas[ORDEN[k - 1]]), est = hecho ? "hecho" : disp ? "disp" : "bloq";
      return '<li class="' + est + '"><span class="nodo">' + (hecho ? "✓" : disp ? String(k + 1) : "🔒") + '</span><div class="tx"><b>' + String(k + 1).padStart(2, "0") + ". " + esc(id === "brujula" ? "Brújula: leer noticias" : s.nombre) + "</b><span>" + (hecho ? "Superada · " + S.hechas[id].ac + "/3" : "+50 XP") + "</span>" + (hecho || disp ? '<br><button class="go" data-m="' + id + '">' + (hecho ? "Repetir misión" : "Empezar misión →") + "</button>" : "") + "</div></li>";
    }).join("") + "</ol>";
    h += '<div class="alerta"><b>Check actualización automática</b>' + (NOT.generado ? "Última carga: " + esc(fmtFecha(NOT.generado, true)).replace(/\.$/, "") + ". " : "Aún sin carga automática. ") + "Próxima: 08:00 o 23:00 (Lima)." + "</div>";
    return h + '<p style="margin:14px 0 0"><a class="btn w" href="#/ruta">' + (hechas ? "Continuar la Ruta" : "Empezar la Ruta") + " →</a></p>" + (sig ? '<p class="mono" style="margin:10px 0 0;font-size:.72rem;color:var(--tx3)">' + S.xp + " / " + sig.min + " XP para " + sig.n + "</p>" : "") + "</div>";
  }
  function spark(pts, grande) {
    if (!pts || pts.length < 3) return "";
    var w = 240, h = grande ? 120 : 54, p = 6, mn = Math.min.apply(null, pts), mx = Math.max.apply(null, pts), d = mx - mn || 1;
    var xy = pts.map(function (v, i) { return [p + i * (w - 2 * p) / (pts.length - 1), h - p - (v - mn) / d * (h - 2 * p)]; });
    var ln = xy.map(function (q) { return q[0].toFixed(1) + "," + q[1].toFixed(1); }).join(" "), ult = xy[xy.length - 1];
    return '<svg class="spark' + (grande ? " g" : "") + '" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none" role="img" aria-label="Evolución reciente: de ' + num(mn, 3) + " a " + num(mx, 3) + '"><polygon points="' + p + "," + (h - p) + " " + ln + " " + (w - p) + "," + (h - p) + '" fill="#10B981" fill-opacity=".14"/><polyline points="' + ln + '" fill="none" stroke="#10B981" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/><circle cx="' + ult[0].toFixed(1) + '" cy="' + ult[1].toFixed(1) + '" r="3.5" fill="#34D399"/></svg>';
  }
  function indicadores(grande) {
    var h = '<div class="ind">', tc = (NOT.indicadores || {}).tipo_cambio;
    if (tc && tc.serie && tc.serie.length >= 1) {
      var v = tc.serie.map(function (x) { return x.v; }), ult = v[v.length - 1], dif = v.length > 1 ? ult - v[v.length - 2] : null, fec = tc.serie[tc.serie.length - 1].f;
      h += '<div class="i"><span class="k">Tipo de cambio USD / PEN</span><span class="v">S/ ' + num(ult, 3) + '</span><span class="n">' + (dif !== null ? 'Variación <span class="mono">' + (dif >= 0 ? "+" : "") + num(dif, 3) + "</span> · " : "") + esc(tc.fuente || "BCRP") + " · " + esc(corta(fec + "T12:00:00Z")) + "</span>" + spark(v, grande) + "</div>";
    }
        (ED.indicadores || []).forEach(function (x) { h += '<div class="i"><span class="k">' + esc(x.k) + '</span><span class="v">' + esc(x.v) + '</span><span class="n">' + esc(x.n) + ' · <a href="' + safeUrl(x.u) + '" target="_blank" rel="noopener noreferrer">' + esc(x.f) + "</a></span></div>"; });
    return h + "</div>" + '<p class="mono" style="margin:12px 0 0;font-size:.68rem;color:var(--tx3)">Corte editorial: ' + esc(corta(ED.corte + "T12:00:00Z")) + ". Verifica en la fuente primaria.</p>";
  }
  function glosarioDia() { var t = termDelDia(); return '<div class="dia"><b>' + esc(t.t) + "</b><p>" + esc(t.d) + '</p><a class="mas" href="#/glosario">Ver el glosario completo →</a></div>'; }
  function radarHTML() { var r = radar(); return r.length ? r.map(function (x, i) { return '<div class="num"><i>' + (i + 1) + "</i><div><b>" + esc(x.t) + "</b><small>" + x.n + (x.n === 1 ? " nota" : " notas") + "</small></div></div>"; }).join("") : '<div class="vacio">Aún no hay suficientes notas.</div>'; }
  function rail() { return '<section><h3 class="rt">Radar de temas</h3>' + radarHTML() + '</section><section><h3 class="rt">Término del día</h3>' + glosarioDia() + "</section>"; }

  /* ───── sección exclusiva: El Niño ───── */
  function ninoBanner() {
    var n = ED.nino; if (!n) return "";
    return '<a class="nino-b fade" href="#/s/nino"><span class="nb-i" aria-hidden="true">🌊</span><span class="nb-t"><b>El Niño costero</b><small>' + esc(n.estado[0].k) + ": " + esc(n.estado[0].v) + " · " + esc(n.estado[2].v) + '</small></span><span class="nb-g">Ver la sección →</span></a>';
  }
  function ninoPanel() {
    var n = ED.nino; if (!n) return "";
    var h = '<div class="panel nino-p"><h3 class="pt">Estado actual · ENFEN</h3><div class="nk">' + n.estado.map(function (x) { return '<div class="nk-i"><span class="k">' + esc(x.k) + '</span><span class="v">' + esc(x.v) + "</span><small>" + esc(x.n) + "</small></div>"; }).join("") + "</div>";
    h += '<p class="mono" style="margin:12px 0 0;font-size:.7rem;color:var(--tx3)">' + esc(n.corte) + "</p></div>";
    h += '<div class="panel nino-p"><h3 class="pt">Cómo ha cambiado el pronóstico</h3><ol class="tl nl">' + n.linea.map(function (x) { return '<li class="hecho"><span class="nodo">●</span><div class="tx"><b>' + esc(x.c) + (x.f ? " · " + esc(x.f) : "") + "</b><p>" + esc(x.x) + '</p><a class="lk" href="' + safeUrl(x.u) + '" target="_blank" rel="noopener noreferrer">Ver comunicado o fuente ↗</a></div></li>'; }).join("") + "</ol></div>";
    return h;
  }

  /* ───── VISTAS ───── */
  function proxima() {
    var now = Date.now(), off = -5 * 3600e3, l = new Date(now + off), y = l.getUTCFullYear(), m = l.getUTCMonth(), d = l.getUTCDate();
    var c = [Date.UTC(y, m, d, 8) - off, Date.UTC(y, m, d, 23) - off, Date.UTC(y, m, d + 1, 8) - off].filter(function (t) { return t > now; })[0];
    var cl = new Date(c + off); return (cl.getUTCDate() === d ? "hoy " : "mañana ") + String(cl.getUTCHours()).padStart(2, "0") + ":00";
  }
  function portal() {
    var g = NOT.estado_fuentes || {}, tot = Object.keys(g).length, ok = Object.keys(g).filter(function (k) { return g[k].ok; }).length, tc = (NOT.indicadores || {}).tipo_cambio;
    var fecha = ""; try { fecha = new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: TZ }).format(new Date()); } catch (e) {}
    var hoy = "";
    if (tc && tc.serie && tc.serie.length) hoy += '<div class="i"><span class="k">USD / PEN</span><span class="v">S/ ' + num(tc.serie[tc.serie.length - 1].v, 3) + "</span></div>";
    if (ED.nino) hoy += '<div class="i"><span class="k">El Niño costero · ENFEN</span><span class="v">' + esc(ED.nino.estado[0].v) + "</span></div>";
    hoy += '<div class="i"><span class="k">Notas indexadas</span><span class="v">' + ITEMS.length + "</span></div>" + (tot ? '<div class="i"><span class="k">Fuentes activas</span><span class="v">' + ok + "/" + tot + "</span></div>" : "") + '<div class="i"><span class="k">Próxima actualización</span><span class="v" style="font-size:1.05rem">' + proxima() + "</span></div>";
    var tiles = ED.sectores.filter(function (s) { return s.id !== "deporte" && s.id !== "mundo"; }).map(function (s) { var n = porSector(s.id).length; return '<a class="po-t' + (s.id === "nino" ? " nino" : "") + '" href="#/s/' + s.id + '" style="--c:' + s.color + '"><span class="ic" aria-hidden="true">' + s.icono + "</span><b>" + esc(s.nombre) + "</b><small>" + (n ? n + (n === 1 ? " nota" : " notas") : "Análisis y misión") + "</small></a>"; })
      .concat(['<a class="po-t" href="#/talleres" style="--c:#F59E0B"><span class="ic" aria-hidden="true">🎓</span><b>Talleres de IA</b><small>Aprende con práctica</small></a>', '<a class="po-t" href="#/ruta" style="--c:#D97706"><span class="ic" aria-hidden="true">🧭</span><b>La Ruta</b><small>' + ORDEN.length + " misiones</small></a>", '<a class="po-t" href="#/datos" style="--c:#38BDF8"><span class="ic" aria-hidden="true">🇵🇪</span><b>DataPerú</b><small>Datos oficiales</small></a>']).join("");
    return '<section class="portal fade" aria-label="Portal"><div class="po-hero"><div class="po-main"><p class="po-eye">Portal de coyuntura · ' + esc(fecha) + '</p><h1>La coyuntura del Perú, explicada con sus fuentes</h1><p class="po-sub">Entiende la coyuntura con datos y aprende a usar IA para analizarla. Análisis propios, noticias, indicadores y una ruta para aprender. Se actualiza a las 08:00 y 23:00, hora de Lima.</p>' +
      '<button class="po-search" type="button" data-buscar="1"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><span>Busca noticias, análisis o términos</span><kbd aria-hidden="true">/</kbd></button>' +
      '<div class="po-cta"><a class="btn" href="#/a/hilo">Panorama del momento →</a><a class="btn o" href="#/ruta">Empezar la Ruta</a></div></div>' +
      '<aside class="po-hoy" aria-label="Hoy en cifras"><h3 class="pt">Hoy en cifras</h3><div class="ind">' + hoy + "</div></aside></div>" +
      '<nav class="po-grid" aria-label="Explora por sección">' + tiles + "</nav></section>";
  }
  /* ───── promoción de talleres de IA (datos en data/talleres.js) ───── */
  var T = window.TALLERES || null;
  function waUrl(txt) { var c = T && T.contacto; return c && c.whatsapp ? "https://wa.me/" + String(c.whatsapp).replace(/\D/g, "") + "?text=" + encodeURIComponent(txt || c.mensaje || "") : "#/talleres"; }
  function ext(u) { return 'href="' + safeUrl(u) + '" target="_blank" rel="noopener noreferrer"'; }
  function tCards() {
    return '<div class="t-g">' + T.talleres.map(function (x) {
      return '<article class="t-card"><span class="t-ic" aria-hidden="true">' + x.icono + "</span><h3>" + esc(x.nombre) + "</h3><small>" + esc(x.para) + "</small><p>" + esc(x.desc) + "</p>" + (x.detalle ? '<p class="t-det">' + esc(x.detalle) + "</p>" : "") + '<a class="btn o" ' + ext(waUrl("Hola Willy, quiero información del taller: " + x.nombre + ".")) + ">Consultar por WhatsApp</a></article>";
    }).join("") + "</div>";
  }
  function promoBanda() {
    if (!T) return "";
    return '<section class="promo fade" aria-label="Talleres de IA"><div><p class="po-eye">Talleres de IA</p><h2>Aprende IA aplicada con datos reales</h2><p>Talleres prácticos para usar la inteligencia artificial en tu estudio y en tu trabajo.</p></div><div class="po-cta"><a class="btn" href="#/talleres">Ver talleres →</a><a class="btn o" ' + ext(waUrl()) + ">Escribir por WhatsApp</a></div></section>";
  }
  function bloqueIA() {
    if (!T) return "";
    return '<section class="promo-ia"><h2>De la noticia a la práctica</h2><p>Entender la IA es el primer paso. En estos talleres aprendes a usarla.</p>' + tCards() + '<p class="t-mas"><a href="#/talleres">Conocer más sobre los talleres →</a></p></section>';
  }
  function bloqueLiga() {
    var p = T && T.paginas && T.paginas[0]; if (!p) return "";
    return '<div class="cta-m" style="--c:#10B981"><div><b>' + esc(p.icono + " " + p.n) + "</b><small>" + esc(p.d) + '</small></div><a class="btn" ' + ext(p.u) + ">Abrir</a></div>";
  }
  function promoRuta(todos) {
    if (!T) return "";
    return '<div class="cta-m" style="--c:var(--gold)"><div><b>' + (todos ? "Completaste la Ruta" : "¿Quieres ir más allá de la lectura?") + '</b><small>Practica con IA en un taller guiado.</small></div><a class="btn" href="#/talleres">Ver talleres</a></div>';
  }
  function listaCorta(arr, n, vacio) {
    if (!arr.length) return '<div class="lista2">' + vacio + "</div>";
    var h = '<div class="lista2">' + arr.slice(0, n).map(row).join("") + "</div>";
    if (arr.length > n) h += '<details class="mas"><summary class="btn o">Ver más notas (' + (arr.length - n) + ')</summary><div class="lista2">' + arr.slice(n).map(row).join("") + "</div></details>";
    return h;
  }
  function vistaTalleres() {
    if (!T) return vistaHome();
    var a = T.autor, c = T.contacto || {};
    var h = '<div class="fade"><div class="shead" style="--c:var(--gold)"><h1>🎓 Talleres de IA</h1><p>Aprende a usar la inteligencia artificial con ejemplos prácticos, en talleres presenciales y virtuales.</p></div>' + tCards();
    h += '<div class="autor panel"><h3 class="pt">Quién está detrás</h3><b class="a-n">' + esc(a.nombre) + "</b><small>" + esc(a.titulo) + "</small><p>" + esc(a.resumen) + "</p></div>";
    h += '<div class="t-links"><a class="btn" ' + ext(waUrl()) + ">Escribir por WhatsApp</a>" + (c.tiktok ? '<a class="btn o" ' + ext(c.tiktok) + ">TikTok @luwiuni</a>" : "") + (c.web ? '<a class="btn o" ' + ext(c.web) + ">Web de los talleres</a>" : "") + "</div>";
    if (T.paginas && T.paginas.length) h += sh("Otras páginas", "var(--gold)") + T.paginas.map(function (p) { return '<a class="fr" ' + ext(p.u) + "><div><b>" + esc(p.icono + " " + p.n) + "</b><p>" + esc(p.d) + "</p></div><span>↗</span></a>"; }).join("");
    return h + "</div>";
  }

  function vistaHome() {
    var principal = INS.filter(function (i) { return i.id === "politica"; })[0] || INS[0], otros = INS.filter(function (i) { return i !== principal; });
    var h = portal() + promoBanda() + ninoBanner() + '<div class="bento fade"><div class="b1 panel">' + (HILO ? '<a class="panorama" href="#/a/hilo"><b>Panorama</b><span>' + esc(HILO.titulo) + "</span></a>" : "") + (principal ? leadCard(principal) : "") + '<div class="minis">' + otros.slice(0, 6).map(card).join("") + "</div></div>";
    h += '<div class="panel"><h3 class="pt">La Ruta de Aprendizaje <a href="#/ruta">Ver todo</a></h3>' + rutaMini() + "</div>";
    h += '<div class="stack"><div class="panel"><h3 class="pt">Indicadores <a href="#/datos">DataPerú</a></h3>' + indicadores(false) + '</div><div class="panel"><h3 class="pt">Glosario cívico</h3>' + glosarioDia() + '</div><div class="panel"><h3 class="pt">Radar de temas</h3>' + radarHTML() + "</div></div></div>";
    h += sh("Últimas notas de los medios", "var(--gold)", "#/historial", "Historial") + '<div class="chips" id="f-chips"></div><div class="lista2" id="f-lista"></div><p style="text-align:center;margin-top:14px" id="f-mas"></p>';
    ED.sectores.forEach(function (s) {
      if (s.id === "deporte" || s.id === "mundo") return; var its = porSector(s.id).slice(0, 4); if (!its.length) return;
      h += sh(s.nombre, s.color, "#/s/" + s.id, "Ver sección") + '<div class="lista2">' + its.map(function (i) { return row(asFeed(i)); }).join("") + "</div>";
    });
    return h;
  }
  var filtro = "todas", cuantas = 8;
  function pintarFeed() {
    var l = FEED.filter(function (s) { if (s.sector === "deporte") return false; return filtro === "todas" || (filtro === "indep" ? s.tipo === "independiente" : filtro === "com" ? s.tipo === "comercial" : filtro === "int" ? s.tipo === "internacional" : (s.tipo === "oficial" || s.tipo === "estatal")); });
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
    var inss = INS.filter(function (i) { return i.sector === id; });
    if (id === "nino") h += ninoPanel();
    h += '<div class="panel">' + (ins ? leadCard(ins) : "") + "</div>";
    if (inss.length > 1) h += '<div class="minis">' + inss.slice(1).map(card).join("") + "</div>";
    h += '<div class="entender"><h2>Para entender ' + esc(nomFrase(s)) + '</h2><ul>' + s.esencial.map(function (e) { return "<li>" + gl(e) + "</li>"; }).join("") + "</ul></div>";
    h += (id === "ia" ? bloqueIA() : "") + (id === "deporte" ? bloqueLiga() : "");
    h += '<div class="cta-m" style="--c:' + s.color + '"><div><b>' + (hecho ? "✅ Misión superada" : "🎯 Misión: " + esc(s.nombre)) + "</b><small>" + (hecho ? "Puedes repetirla cuando quieras." : "3 preguntas · gana hasta 80 XP") + '</small></div><button class="btn" data-m="' + id + '">' + (hecho ? "Repetir" : "Empezar") + "</button></div>";
    var vacio = '<div class="vacio">Aún no hay notas en esta sección. La próxima actualización automática (08:00 / 23:00) las incorporará.</div>';
    if (s.ambitos) {
      var enPeru = its.filter(function (i) { return ambitoDe(i) === "peru"; }), enMundo = its.filter(function (i) { return ambitoDe(i) === "mundo"; });
      h += sh("IA en el Perú", s.color) + listaCorta(enPeru, 6, vacio) + sh("IA en el mundo", s.color) + listaCorta(enMundo, 6, vacio);
    } else h += sh("Últimas notas · " + s.nombre, s.color) + '<div class="lista2">' + (its.length ? its.map(row).join("") : vacio) + "</div>";
    h += '</div><aside class="rail"><section><h3 class="rt">Términos clave</h3>' + terms.map(function (t) { return '<button class="term" data-gl="' + t + '">' + esc(GLOS[t].t) + "</button>"; }).join("") + "</section>" + rail().split("</section>").slice(1).join("</section>") + "</aside></div></div>";
    return h;
  }

  function vistaArticulo(id) {
    var esHilo = id === "hilo", c = esHilo ? null : ED.insights.filter(function (x) { return (x.id || x.sector) === id; })[0];
    if (!esHilo && !c) return vistaHome();
    var sid = esHilo ? "coyuntura" : c.sector, s = SECT[sid], a = ARTS[id] || ARTS[sid] || {};
    var titulo = esHilo ? ED.hilo.titulo : c.titulo, resumen = esHilo ? "Cuatro frentes explican el momento que vive el país tras el cambio de gobierno." : c.resumen;
    var h = '<article class="art fade"><div class="crumb"><a href="#/">Inicio</a> › <a href="#/s/' + sid + '">' + esc(s.nombre) + "</a></div>" + kicker({ sector: sid }) + "<h1>" + esc(titulo) + '</h1><p class="stand">' + esc(esHilo ? resumen : primera(resumen)) + "</p>";
    h += '<div class="by"><span><b>Redacción Contexto Perú</b></span><span>Corte ' + esc(fmtFecha(ED.corte + "T12:00:00Z")) + "</span>" + (esHilo ? "" : '<span class="conf ' + (c.nivel === "alta" ? "alta" : "media") + '" title="Alta: confirmado en fuente oficial. Media: se apoya en prensa; conviene verificar.">Confianza ' + (c.nivel === "alta" ? "alta" : "media · verifica") + "</span>") + '<button class="share" id="b-share">↗ Compartir</button></div>';
    var pf = esHilo ? HILO : INS.filter(function (i) { return i.id === id; })[0], fo = pf ? fotoInfo(pf) : null;
    if (fo) h += thumb(pf, false) + '<p class="cap">Foto: ' + esc(fo.c || "fuente enlazada") + ". Imagen tomada de la fuente citada; derechos de su autor. Las cifras provienen de las fuentes enlazadas al final.</p>";
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
      if (its.length) h += sh("Más sobre " + nomFrase(s), s.color, "#/s/" + sid) + its.map(row).join("");
      var sig = INS[(INS.map(function (i) { return i.id; }).indexOf(id) + 1) % INS.length];
      h += sh("Siguiente análisis", "#000") + row(sig);
    }
    return h + "</article>";
  }

  function vistaRuta() {
    var i = nivelDe(S.xp), nv = NIVELES[i], sig = NIVELES[i + 1], todos = ORDEN.every(function (id) { return S.hechas[id]; });
    var h = '<div class="fade"><div class="shead" style="--c:var(--brand)"><h1>🧭 La Ruta</h1><p>' + ORDEN.length + ' estaciones, ' + ORDEN.length + ' misiones. Lee, responde, gana XP y sube de nivel: de Viajero a Apu.</p></div>';
    h += '<div class="nivel-card"><div class="nv"><div class="medalla">' + nv.ic + "</div><div><b>" + nv.n + "</b><small>" + nv.d + '</small></div><div style="margin-left:auto;text-align:right"><b style="font-size:1.1rem">' + racha() + '</b><small style="display:block">día(s) de racha</small></div></div><div class="bar"><i id="xp-b"></i></div><small class="xt">' + (sig ? S.xp + " / " + sig.min + " XP para " + sig.n : S.xp + " XP · nivel máximo") + "</small></div>";
    h += '<div class="camino">' + ORDEN.map(function (id, k) {
      var s = SECT[id], hecho = !!S.hechas[id], disp = !hecho && (k === 0 || !!S.hechas[ORDEN[k - 1]]), est = hecho ? "hecho" : disp ? "disp" : "bloq";
      return '<div class="st ' + est + '"><div class="dot">' + (hecho ? "✓" : disp ? s.icono : "🔒") + '</div><div class="stc"><span class="paso">Estación ' + (k + 1) + "</span><h3>" + esc(s.nombre) + "</h3><p>" + esc(s.lema) + '</p><div class="stt"><span>' + (hecho ? "Superada · " + S.hechas[id].ac + "/3 aciertos" : disp ? "Disponible" : "Completa la anterior") + "</span>" + (hecho || disp ? '<button class="btn' + (hecho ? " o" : "") + '" data-m="' + id + '" style="min-height:40px">' + (hecho ? "Repetir" : "Empezar") + "</button>" : "") + "</div></div></div>";
    }).join("") + "</div>";
    var ins = [["brujula", "Primer paso", "🧭"], ["politica", "Cívico", "🏛️"], ["economia", "Economista", "📈"], ["salud", "Guardián de la salud", "🩺"], ["tecnologia", "Ciberescudo", "🛰️"], ["deporte", "Hincha informado", "⚽"], ["investigacion", "Sabueso", "🔎"], ["coyuntura", "Analista", "🧭"], ["mundo", "Ciudadano del mundo", "🌎"], ["ia", "Domador de algoritmos", "🤖"], ["nino", "Vigía del mar", "🌊"]], nt = Object.keys(S.terminos).length;
    h += sh("Insignias", "#000") + '<div class="ins-g">' + ins.map(function (x) { return '<div class="ins ' + (S.hechas[x[0]] ? "on" : "") + '"><i>' + x[2] + "</i>" + x[1] + "</div>"; }).join("") + '<div class="ins ' + (nt >= 20 ? "on" : "") + '"><i>📖</i>Lexicógrafo<br>' + Math.min(nt, 20) + '/20 términos</div><div class="ins ' + (todos ? "on" : "") + '"><i>🏔️</i>Cumbre</div></div>';
    h += promoRuta(todos);
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

  function vistaEstadisticas() {
    var g = NOT.estado_fuentes || {}, nom = Object.keys(g), ok = nom.filter(function (k) { return g[k].ok; }).length, cnt = {};
    ITEMS.forEach(function (i) { cnt[i.sector] = (cnt[i.sector] || 0) + 1; });
    var max = Math.max.apply(null, ED.sectores.map(function (x) { return cnt[x.id] || 0; }).concat([1]));
    var indep = ITEMS.filter(function (i) { return i.tipo === "independiente"; }).length;
    var h = '<div class="fade"><div class="shead" style="--c:var(--gold)"><h1>Estadísticas</h1><p>Indicadores con fuente y cobertura de las notas que procesa este sitio. Las cifras externas se contrastan siempre en la fuente primaria.</p></div>';
    h += '<div class="kpis"><div class="kpi"><div class="k">Notas indexadas</div><div class="v">' + ITEMS.length + '</div><small>Últimos 30 días</small></div><div class="kpi"><div class="k">Fuentes activas</div><div class="v">' + (nom.length ? ok + "/" + nom.length : "—") + '</div><small>Última carga</small></div><div class="kpi"><div class="k">Medios independientes</div><div class="v">' + indep + '</div><small>Notas en el índice</small></div><div class="kpi"><div class="k">Análisis propios</div><div class="v">' + INS.length + '</div><small>Con fuentes enlazadas</small></div></div>';
    h += '<div class="bento"><div class="panel b1"><h3 class="pt">Indicadores</h3>' + indicadores(true) + '</div><div class="panel"><h3 class="pt">Notas por sección</h3>' + ED.sectores.map(function (x) { var n = cnt[x.id] || 0; return '<div class="hbar" style="--c:' + x.color + '"><span>' + esc(x.nombre) + '</span><span><i style="width:' + Math.round(n / max * 100) + '%"></i></span><span>' + n + "</span></div>"; }).join("") + '</div><div class="panel"><h3 class="pt">Estado de las fuentes</h3>' + (nom.length ? nom.map(function (k) { return '<div class="fuente-i"><span>' + esc(k) + '</span><span class="' + (g[k].ok ? "ok" : "no") + '">' + (g[k].ok ? "OK · " + g[k].n : "sin respuesta") + "</span></div>"; }).join("") : '<div class="vacio">Aún no hay una carga automática registrada.</div>') + "</div></div></div>";
    return h;
  }
  function fmtNum(v, dec) { return num(v, dec); }
  /* tarjeta que se voltea: frente con la cifra; reverso con concepto, ejemplo y fuente */
  function flipCard(o) {
    return '<article class="flip' + (o.w2 ? " w2" : "") + '" data-cat="' + esc(o.cat || "") + '" tabindex="0" aria-label="' + esc(o.k + ": " + o.v + ". Pasa el cursor o toca para ver el concepto, un ejemplo y la fuente.") + '"><div class="flip-in">' +
      '<div class="face front">' + (o.tag ? '<span class="tag">' + esc(o.tag) + "</span>" : "") + '<span class="k">' + esc(o.k) + '</span><span class="v cifra">' + esc(o.v) + "</span><p>" + esc(o.n) + "</p>" + (o.spark || "") + '<span class="hint" aria-hidden="true">↻ Voltea para ver el concepto</span></div>' +
      '<div class="face back"><span class="bk">Qué significa</span><p>' + esc(o.c) + '</p><span class="bk">Ejemplo</span><p class="ej">' + esc(o.e) + '</p><a class="lk" href="' + safeUrl(o.u) + '" target="_blank" rel="noopener noreferrer">Fuente: ' + esc(o.f) + " ↗</a></div></div></article>";
  }
  function ejSerie(x, b) {
    var a = b.serie[0], u = b.serie[b.serie.length - 1], d = u.v - a.v;
    if (x.unidad === "personas") return "En " + a.a + " había " + fmtNum(a.v, 0) + " habitantes y en " + u.a + ", " + fmtNum(u.v, 0) + ": " + fmtNum(Math.abs(d / a.v * 100), 1) + " % " + (d >= 0 ? "más" : "menos") + ".";
    if (x.unidad === "años") return "Un recién nacido en " + u.a + " viviría en promedio " + fmtNum(u.v, x.dec) + " años, " + fmtNum(Math.abs(d), x.dec) + " " + (d >= 0 ? "más" : "menos") + " que en " + a.a + ".";
    return "En " + a.a + " fue " + fmtNum(a.v, x.dec) + " % y en " + u.a + ", " + fmtNum(u.v, x.dec) + " %: " + (d >= 0 ? "subió " : "bajó ") + fmtNum(Math.abs(d), x.dec) + " puntos porcentuales.";
  }
  function animarCifras() {
    if (reduce || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (en) { en.forEach(function (e) { if (!e.isIntersecting) return; io.unobserve(e.target); contar(e.target); }); }, { threshold: .4 });
    $$(".cifra").forEach(function (el) { io.observe(el); });
  }
  function contar(el) {
    var fin = el.textContent, re = /\d[\d ]*(?:,\d+)?/g, toks = fin.match(re); if (!toks) return;
    var vals = toks.map(function (t) { return { dec: (t.split(",")[1] || "").length, sep: /\s/.test(t), n: parseFloat(t.replace(/\s/g, "").replace(",", ".")) }; }), t0 = performance.now(), dur = 1000;
    (function paso(t) {
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3), i = 0;
      el.textContent = fin.replace(re, function () { var v = vals[i++], x = v.n * e; var r = num(x, v.dec); return v.sep ? r : r.replace(/ /g, ""); });
      if (k < 1) requestAnimationFrame(paso); else el.textContent = fin;
    })(t0);
  }
  var DCATS = [["todos", "Todo"], ["eco", "Economía"], ["clima", "Clima / ENFEN"], ["soc", "Sociedad / INEI"], ["salud", "Salud / Minsa"]], dFil = "todos";
  function bloquesDatos() {
    var D = ED.datos, bm = NOT.datos_bm || {}, B = [], tc = (NOT.indicadores || {}).tipo_cambio;
    if (tc && tc.serie && tc.serie.length) {
      var v = tc.serie.map(function (x) { return x.v; }), u = v[v.length - 1], d = v.length > 1 ? u - v[v.length - 2] : null, ref = /Referencial/.test(tc.fuente || "");
      B.push({ cat: "eco", tag: ref ? "Referencial" : "BCRP", w2: 1, k: "Tipo de cambio USD / PEN", v: "S/ " + num(u, 3), n: (d !== null ? "Variación " + (d >= 0 ? "+" : "") + num(d, 3) + " · " : "") + esc(corta(tc.serie[tc.serie.length - 1].f + "T12:00:00Z")) + (ref ? " · valor de mercado referencial; el oficial está en el BCRP" : ""), spark: spark(v, false),
        c: "Cuántos soles cuesta comprar un dólar estadounidense. Si el número sube, el dólar se encarece; si baja, se abarata.", e: "Con S/ " + num(u, 3) + " por dólar, US$ 100 equivalen a S/ " + num(u * 100, 2) + ".", f: ref ? "BCRP (dato oficial)" : "BCRP", u: "https://estadisticas.bcrp.gob.pe/estadisticas/series/" });
    }
    D.grupos.forEach(function (g) { g.items.forEach(function (i) { B.push(i); }); });
    (D.series || []).forEach(function (x) {
      var b = bm[x.cod]; if (!b || !b.serie || b.serie.length < 3) return;
      var u = b.serie[b.serie.length - 1];
      B.push({ cat: x.cat, tag: "Banco Mundial", k: x.k, v: fmtNum(u.v, x.dec) + (x.unidad === "%" ? " %" : ""), n: (x.unidad === "personas" || x.unidad === "años" ? x.unidad + " · " : "") + "Dato de " + u.a, spark: spark(b.serie.map(function (p) { return p.v; }), false), c: x.c, e: ejSerie(x, b), f: "Banco Mundial", u: "https://data.worldbank.org/indicator/" + x.cod + "?locations=PE" });
    });
    var orden = { eco: 0, clima: 1, soc: 2, salud: 3 };
    return B.map(function (x, i) { return { x: x, i: i }; }).sort(function (a, b) { return (orden[a.x.cat] - orden[b.x.cat]) || (a.i - b.i); }).map(function (o) { return o.x; });
  }
  function pintarDatos() {
    var c = $("#d-chips"), g = $("#d-grid"); if (!c || !g) return;
    c.innerHTML = DCATS.map(function (x) { return '<button class="chip' + (x[0] === dFil ? " on" : "") + '" data-df="' + x[0] + '">' + esc(x[1]) + "</button>"; }).join("");
    var B = bloquesDatos().filter(function (b) { return dFil === "todos" || b.cat === dFil; });
    g.innerHTML = B.length ? B.map(flipCard).join("") : '<div class="vacio">No hay datos en esta categoría todavía.</div>';
    animarCifras();
  }
  function vistaDatos() {
    var D = ED.datos; if (!D) return vistaHome();
    var h = '<div class="fade"><div class="dp-head"><div><p class="po-eye">DataPerú · corte ' + esc(corta(D.corte + "T12:00:00Z")) + '</p><h1>Datos y cifras clave</h1><p class="dp-sub">' + esc(D.intro) + '</p></div><span class="pill-act" style="display:inline-flex"><i aria-hidden="true"></i>Actualización: 08:00 / 23:00</span></div>';
    h += '<div class="chips" id="d-chips" role="tablist" aria-label="Categorías"></div><div class="dp-b" id="d-grid" aria-live="polite"></div>';
    h += sh("Dónde buscar más datos", "#94A3B8") + D.enlaces.map(function (e) { return '<a class="fr" href="' + safeUrl(e.u) + '" target="_blank" rel="noopener noreferrer"><div><b>' + esc(e.n) + "</b><p>" + esc(e.d) + "</p></div><span>↗</span></a>"; }).join("");
    h += '<div class="box" style="margin-top:20px"><h3>Cómo leer estas cifras</h3><p>Cada dato indica su periodo y quién lo publicó. Compara solo cifras del mismo periodo y de la misma población: el desempleo de Lima Metropolitana no es el desempleo nacional, y un trimestre móvil no equivale a un año.</p></div>';
    h += '<p class="dp-aviso">* Cifras con fines informativos y educativos. Cada tarjeta enlaza a su fuente y no sustituye a la información oficial en tiempo real. Contrasta en: <a href="https://estadisticas.bcrp.gob.pe/estadisticas/series/" target="_blank" rel="noopener noreferrer">BCRP</a>, <a href="https://www.gob.pe/inei" target="_blank" rel="noopener noreferrer">INEI</a>, <a href="https://www.dge.gob.pe" target="_blank" rel="noopener noreferrer">CDC-Minsa</a> y <a href="https://www.gob.pe/institucion/senamhi/colecciones/1308-comunicados-enfen" target="_blank" rel="noopener noreferrer">ENFEN</a>.</p></div>';
    setTimeout(pintarDatos, 0);
    return h;
  }
  var hSec = "todos", hMax = 30;
  function vistaHistorial() {
    var h = '<div class="fade"><div class="shead" style="--c:var(--gold)"><h1>Historial</h1><p>Todas las notas indexadas, de la más reciente a la más antigua. Cada una enlaza al medio original.</p></div><div class="chips" id="h-chips"></div><div id="h-lista"></div><p style="text-align:center;margin-top:14px" id="h-mas"></p></div>';
    setTimeout(pintarHistorial, 0);
    return h;
  }
  function pintarHistorial() {
    var c = $("#h-chips"); if (!c) return;
    c.innerHTML = [{ id: "todos", nombre: "Todos" }].concat(ED.sectores).map(function (x) { return '<button class="chip' + (x.id === hSec ? " on" : "") + '" data-s="' + x.id + '">' + esc(x.nombre) + "</button>"; }).join("");
    $$("button", c).forEach(function (b) { b.onclick = function () { hSec = b.getAttribute("data-s"); hMax = 30; pintarHistorial(); }; });
    var l = ITEMS.filter(function (i) { return hSec === "todos" || i.sector === hSec; }), out = "", dia = "";
    l.slice(0, hMax).forEach(function (i) {
      var d = i.fecha ? new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: TZ }).format(new Date(i.fecha)) : "Fecha no confirmada";
      if (d !== dia) { dia = d; out += '<div class="dia-h">' + esc(d) + "</div>"; }
      out += row(asFeed(i));
    });
    $("#h-lista").innerHTML = out || '<div class="vacio">No hay notas en esta sección todavía.</div>';
    $("#h-mas").innerHTML = l.length > hMax ? '<button class="btn o" id="h-b">Ver más (' + (l.length - hMax) + ")</button>" : "";
    var b = $("#h-b"); if (b) b.onclick = function () { hMax += 30; pintarHistorial(); };
  }

  /* ───── enrutador ───── */
  var TITULO = "Contexto Perú";
  function ruta() { var h = location.hash.replace(/^#\/?/, ""), p = h.split("/"); return { v: p[0] || "inicio", id: p[1] }; }
  function navegar() {
    var r = ruta(), html, tab = "inicio", nav = "inicio", t = TITULO;
    if (r.v === "s" && SECT[r.id] && r.id !== "brujula") { html = vistaSector(r.id); nav = r.id; tab = "secciones"; t = SECT[r.id].nombre + " · " + TITULO; }
    else if (r.v === "a") { html = vistaArticulo(r.id); var ar = ED.insights.filter(function (x) { return (x.id || x.sector) === r.id; })[0]; nav = r.id === "hilo" ? "inicio" : (ar ? ar.sector : "inicio"); t = (r.id === "hilo" ? ED.hilo.titulo : ar ? ar.titulo : TITULO) + " · " + TITULO; }
    else if (r.v === "ruta") { html = vistaRuta(); nav = "ruta"; tab = "ruta"; t = "La Ruta · " + TITULO; }
    else if (r.v === "glosario") { html = vistaGlosario(); nav = "glosario"; tab = "glosario"; t = "Glosario · " + TITULO; }
    else if (r.v === "datos") { html = vistaDatos(); nav = "datos"; tab = ""; t = "DataPerú · " + TITULO; }
    else if (r.v === "estadisticas") { html = vistaEstadisticas(); nav = "estadisticas"; tab = ""; t = "Estadísticas · " + TITULO; }
    else if (r.v === "historial") { html = vistaHistorial(); nav = "historial"; tab = ""; t = "Historial · " + TITULO; }
    else if (r.v === "talleres") { html = vistaTalleres(); nav = "talleres"; tab = ""; t = "Talleres de IA · " + TITULO; }
    else if (r.v === "fuentes") { html = vistaFuentes(); nav = "fuentes"; tab = ""; t = "Fuentes · " + TITULO; }
    else { html = vistaHome(); }
    $("#app").innerHTML = html; document.title = t;
    $$("#snav a, .mnav a").forEach(function (a) { var on = a.getAttribute("data-n") === nav; a.classList.toggle("on", on); if (on) a.scrollIntoView({ inline: "center", block: "nearest" }); });
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
    var items = [["inicio", "Inicio", "#/"]].concat(ED.sectores.map(function (s) { return [s.id, s.nombre, "#/s/" + s.id]; }), [["talleres", "Talleres de IA", "#/talleres"], ["fuentes", "Fuentes", "#/fuentes"]]);
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
    if (reduce) return; var c = $("#confeti"), col = ["#DC2626", "#F59E0B", "#10B981", "#F8FAFC", "#38BDF8"];
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
    $("#menu-in").innerHTML = '<button class="sx" aria-label="Cerrar" data-x="1">✕</button><div class="paso">Secciones</div><h3>Explora por tema</h3><div class="menu-g">' + ED.sectores.map(function (s) { return '<a href="#/s/' + s.id + '" data-cerrar="1" style="--c:' + s.color + '"><span>' + s.icono + "</span>" + esc(s.nombre) + "</a>"; }).join("") + '</div><div class="menu-g"><a href="#/ruta" data-cerrar="1" style="--c:#D97706"><span>🧭</span>La Ruta</a><a href="#/glosario" data-cerrar="1" style="--c:#D97706"><span>📖</span>Glosario</a><a href="#/datos" data-cerrar="1" style="--c:#38BDF8"><span>🇵🇪</span>DataPerú</a><a href="#/estadisticas" data-cerrar="1" style="--c:#10B981"><span>📊</span>Estadísticas</a><a href="#/historial" data-cerrar="1" style="--c:#10B981"><span>🗂️</span>Historial</a><a href="#/talleres" data-cerrar="1" style="--c:#F59E0B"><span>🎓</span>Talleres de IA</a><a href="#/fuentes" data-cerrar="1" style="--c:#94A3B8"><span>🔗</span>Fuentes</a></div>';
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
    if (c("[data-buscar]")) { abrirBuscar(); return; }
    var df = c("[data-df]"); if (df) { dFil = df.getAttribute("data-df"); pintarDatos(); return; }
    var fl = c(".flip"); if (fl && !c("a") && window.matchMedia && matchMedia("(hover: none)").matches) { var ya = fl.classList.contains("on"); $$(".flip.on").forEach(function (x) { x.classList.remove("on"); }); if (!ya) fl.classList.add("on"); return; }
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
  addEventListener("keydown", function (e) { var f = e.target && e.target.classList && e.target.classList.contains("flip") ? e.target : null; if (f && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); f.classList.toggle("on"); return; } if (e.key === "/" && !/^(INPUT|TEXTAREA)$/.test((document.activeElement || {}).tagName || "") && !hojaAbierta) { e.preventDefault(); abrirBuscar(); return; } if (e.key === "Escape") { cerrarHojas(); $("#pop").classList.remove("on"); } });
  addEventListener("hashchange", function () { cerrarHojas(); navegar(); });
  addEventListener("scroll", function () { if (Math.abs(window.scrollY - popY) > 60) $("#pop").classList.remove("on"); }, { passive: true });
  $("#b-buscar").onclick = abrirBuscar; $("#t-bus").onclick = abrirBuscar; $("#t-sec").onclick = abrirMenu;
  (function tema() {
    var r = document.documentElement, g = null; try { g = localStorage.getItem("cp_tema"); } catch (e) {} if (g) r.setAttribute("data-theme", g);
    $("#b-tema").onclick = function () { var oscuro = r.getAttribute("data-theme") ? r.getAttribute("data-theme") === "dark" : true; var n = oscuro ? "light" : "dark"; r.setAttribute("data-theme", n); try { localStorage.setItem("cp_tema", n); } catch (e) {} };
  })();

  /* ───── línea dinámica de lo último y más relevante (derecha a izquierda) ───── */
  function ticker() {
    var w = $("#tk-t"); if (!w) return;
    var it = [], tc = (NOT.indicadores || {}).tipo_cambio;
    if (tc && tc.serie && tc.serie.length) { var v = tc.serie[tc.serie.length - 1].v, a = tc.serie.length > 1 ? v - tc.serie[tc.serie.length - 2].v : null; it.push({ h: "#/estadisticas", t: "USD/PEN", x: "S/ " + num(v, 3) + (a === null ? "" : (a >= 0 ? " ▲" : " ▼") + num(Math.abs(a), 3)), cls: "fx" }); }
    var dd = ED.datos ? [].concat.apply([], ED.datos.grupos.map(function (g) { return g.items; })) : [];
    [["pob", "Población (Censo 2025)"], ["hogint", "Hogares con internet"], ["desemp", "Desempleo Lima Metropolitana"]].forEach(function (p) { var x = dd.filter(function (i) { return i.id === p[0]; })[0]; if (x) it.push({ h: "#/datos", t: p[1], x: x.v, cls: "fx" }); });
    var nino = (ED.indicadores || []).filter(function (x) { return /Niño/.test(x.k); })[0];
    if (nino) it.push({ h: "#/s/nino", t: "El Niño costero", x: "ENFEN: " + nino.v, cls: "nino" });
    ["politica", "economia", "nino-peru", "salud", "ia-peru", "mundo"].forEach(function (id) { var c = INS.filter(function (i) { return i.id === id; })[0]; if (c) it.push({ h: c.url, t: (SECT[c.sector] || {}).nombre || "", x: c.titulo, cls: "an" }); });
    var vistos = {}, n = 0;
    ITEMS.forEach(function (i) { if (n >= 10 || !i.fecha || vistos[i.fuente]) return; vistos[i.fuente] = 1; n++; it.push({ h: i.url, ext: 1, t: i.fuente, x: i.titulo, cls: "nt" }); });
    var uno = it.map(function (x) { return '<a class="tk-i ' + x.cls + '" href="' + (x.ext ? safeUrl(x.h) : esc(x.h)) + '"' + (x.ext ? ' target="_blank" rel="noopener noreferrer"' : "") + "><b>" + esc(x.t) + "</b> " + esc(sin(x.x, 110)) + "</a>"; }).join("");
    w.innerHTML = '<div class="tk-g">' + uno + '</div><div class="tk-g" aria-hidden="true">' + uno.replace(/<a /g, '<a tabindex="-1" ') + "</div>";
    requestAnimationFrame(function () { var g = w.firstChild; if (g) w.style.animationDuration = Math.max(40, Math.round(g.scrollWidth / 70)) + "s"; });
    $("#tk-p").onclick = function () { var p = $("#ticker").classList.toggle("pausa"); this.setAttribute("aria-pressed", p ? "true" : "false"); this.setAttribute("aria-label", p ? "Reanudar ticker" : "Pausar ticker"); this.textContent = p ? "▶" : "❚❚"; };
  }

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
  function pintarPie() {
    var el = $("#f-talleres"); if (!el || !T) return;
    var c = T.contacto || {}, a = T.autor || {}, p = (T.paginas || [])[0];
    el.innerHTML = "<h4>Talleres de IA</h4><p>Aprende a usar la inteligencia artificial con ejemplos prácticos.</p>" +
      (a.nombre ? '<p class="f-aut"><b>' + esc(a.nombre) + "</b><br>" + esc(a.titulo || "") + "</p>" : "") +
      '<p class="f-lk"><a href="#/talleres">Ver talleres</a>' + (c.tiktok ? ' · <a ' + ext(c.tiktok) + ">TikTok</a>" : "") + (c.web ? ' · <a ' + ext(c.web) + ">Web de talleres</a>" : "") + (p ? ' · <a ' + ext(p.u) + ">" + esc(p.n) + "</a>" : "") + "</p>";
  }
  menuNav(); estado(); xpChip(); ticker(); pintarPie(); navegar();
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    var tenia = !!navigator.serviceWorker.controller, recargado = false;
    navigator.serviceWorker.addEventListener("controllerchange", function () { if (tenia && !recargado) { recargado = true; location.reload(); } });
    navigator.serviceWorker.register("sw.js").then(function (r) { r.update(); }).catch(function () {});
  }
})();
