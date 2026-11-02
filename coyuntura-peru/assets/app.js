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
  /* ───── íconos propios (SVG animados, sin emojis) ───── */
  var ICO = {
    politica: '<path d="M3.5 9.5 12 4.8l8.5 4.7"/><path d="M5.5 10.8v6.7M9.5 10.8v6.7M14.5 10.8v6.7M18.5 10.8v6.7"/><path d="M3.5 19.5h17"/><path class="a fl" d="M12 4.8V1.9l3.4 1.1L12 4.1"/>',
    economia: '<rect class="bar b1" x="4" y="13" width="3.4" height="7" rx=".8"/><rect class="bar b2" x="10.3" y="9.5" width="3.4" height="10.5" rx=".8"/><rect class="bar b3" x="16.6" y="6" width="3.4" height="14" rx=".8"/><path class="a tr" d="M4 10.5 9 7l4.2 2.4L20 3.5"/><path class="a" d="M16 3.5h4v4"/>',
    salud: '<path class="beat" d="M12 20s-7.5-4.6-7.5-10A4.1 4.1 0 0 1 12 7.6 4.1 4.1 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/><path class="a ecg" d="M3 12.5h4.5l1.8-3.2 2.4 6.2 1.8-3 1.2 0H21"/>',
    nino: '<circle class="a sun" cx="17" cy="6.5" r="2.7"/><path class="a wv" d="M2 13.5c2.2-2.4 4.4-2.4 6.6 0s4.4 2.4 6.6 0 4.4-2.4 6.6 0"/><path class="wv w2" d="M2 18.5c2.2-2.4 4.4-2.4 6.6 0s4.4 2.4 6.6 0 4.4-2.4 6.6 0"/>',
    tecnologia: '<rect x="6.5" y="6.5" width="11" height="11" rx="2.2"/><rect class="a core" x="10" y="10" width="4" height="4" rx=".9"/><path class="pins" d="M9.5 3.5v3M14.5 3.5v3M9.5 17.5v3M14.5 17.5v3M3.5 9.5h3M3.5 14.5h3M17.5 9.5h3M17.5 14.5h3"/>',
    ia: '<path d="M6.6 7.7l4.1 3M6.6 16.3l4.1-3M13.9 10.9l3.8-3.7M13.9 13.1l3.8 3.7"/><circle class="a nd n1" cx="5" cy="7" r="1.9"/><circle class="a nd n2" cx="5" cy="17" r="1.9"/><circle class="a nd n3" cx="12.2" cy="12" r="2.5"/><circle class="a nd n4" cx="19" cy="6.2" r="1.9"/><circle class="a nd n5" cx="19" cy="17.8" r="1.9"/>',
    deporte: '<g class="ball"><circle cx="12" cy="12" r="8.5"/><path class="a" d="M12 7.6l3.7 2.7-1.4 4.3H9.7l-1.4-4.3z"/><path d="M12 3.5v4.1M15.7 10.3l4-1.3M14.3 14.6l2.4 3.4M9.7 14.6l-2.4 3.4M8.3 10.3l-4-1.3"/></g>',
    investigacion: '<g class="scan"><circle cx="10.5" cy="10.5" r="6"/><path class="a" d="M15 15l5.6 5.6"/><path d="M8.2 9.4a3 3 0 0 1 2.3-1.6" opacity=".7"/></g>',
    coyuntura: '<circle cx="12" cy="12" r="8.6"/><path d="M12 2.2v1.8M12 20v1.8M2.2 12h1.8M20 12h1.8" opacity=".6"/><g class="needle"><path class="a f" d="M12 5.2l2.7 6.8H9.3z"/><path d="M12 18.8 9.3 12h5.4z" opacity=".55"/></g><circle cx="12" cy="12" r=".9"/>',
    mundo: '<circle cx="12" cy="12" r="8.6"/><ellipse class="a mer" cx="12" cy="12" rx="3.8" ry="8.6"/><path d="M3.5 12h17M5 7.6h14M5 16.4h14"/>',
    ruta: '<path class="a trail" d="M3.5 20c3.6 0 3-5.8 7-5.8 3.2 0 3.6 3.6 7.2.6"/><path class="pin" d="M17.2 2.6a3.4 3.4 0 0 1 3.4 3.4c0 2.7-3.4 5.8-3.4 5.8S13.8 8.700 13.8 6a3.4 3.4 0 0 1 3.4-3.4z"/><circle class="a" cx="17.2" cy="6" r="1.1"/>',
    datos: '<path d="M4 4v16h16"/><path class="a ln" d="M7.2 15.2l3.9-4 3 2.4 5-6.2"/><circle class="a dot" cx="19.1" cy="7.4" r="1.6"/><path d="M7.5 20v-1.8M11.5 20v-3.4M15.5 20v-2.4" opacity=".55"/>',
    talleres: '<path d="M2.6 9.6 12 5l9.4 4.6L12 14.2z"/><path d="M6.6 11.9v4.2c0 1.3 2.5 2.7 5.4 2.7s5.4-1.4 5.4-2.7v-4.2"/><path class="a" d="M21.4 9.6v5"/><path class="a sp" d="M19.2 2.6l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7z"/>'
  };
  ICO.brujula = ICO.coyuntura;
  function ic(id, cls) {
    var g = ICO[id]; if (!g) return "";
    return '<svg class="ico' + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + g + "</svg>";
  }
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
  function xpChip() { var nv = NIVELES[nivelDe(S.xp)], c = $("#xpchip"), n = $("#xpnum"); if (c) c.title = "Nivel: " + nv.n; if (n) n.textContent = S.xp + " XP"; }

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
  function asFeed(it) { return { kind: "feed", ambito: it.ambito, sector: it.sector, titulo: it.titulo, resumen: it.resumen || "", url: it.url, fuente: it.fuente, tipo: it.tipo || "comercial", fecha: it.fecha, nota: it.nota, imagen: it.imagen, genero: it.genero || "noticia", procedencia: it.procedencia, via: it.via }; }
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
  var GEN = { noticia: "Noticia", opinion: "Opinión", analisis: "Análisis" };
  function badgeGenero(g) { g = GEN[g] ? g : "noticia"; return '<span class="gn ' + g + '">' + GEN[g] + "</span>"; }
  function meta(s) {
    if (externo(s)) {
      var f = s.fecha ? '<time datetime="' + esc(s.fecha) + '" title="' + esc(relativo(s.fecha) || "") + '">' + esc(corta(s.fecha)) + "</time>" : "<span>fecha no confirmada</span>";
      return '<div class="meta">' + badgeGenero(s.genero) + '<span class="fu">' + esc(s.fuente) + "</span>" + (s.via ? '<span class="via" title="Esta nota llegó por un agregador, no por el feed del medio">vía ' + esc(s.via) + "</span>" : "") + f + '<span class="ext" aria-hidden="true">↗</span></div>';
    }
    return '<div class="meta">' + badgeGenero("analisis") + "<span>Corte editorial: " + esc(corta(ED.corte + "T12:00:00Z")) + "</span>" + (s.nivel ? '<span class="conf ' + (s.nivel === "alta" ? "alta" : "media") + '" title="Alta: confirmado en fuente oficial. Media: se apoya en prensa; conviene verificar.">Confianza ' + (s.nivel === "alta" ? "alta" : "media") + "</span>" : "") + "</div>";
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
    h += '<div class="alerta"><b>Check actualización automática</b>' + (NOT.generado ? "Última carga: " + esc(fmtFecha(NOT.generado, true)).replace(/\.$/, "") + ". " : "Aún sin carga automática. ") + "Próxima: en las próximas horas (7 veces al día, hora de Lima)." + "</div>";
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
  function fechaLarga(iso) { try { return new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(iso + "T12:00:00Z")); } catch (e) { return iso; } }
  function ultimoEnfen() {
    var e = NOT.enfen, n = ED.nino || {};
    if (e && e.numero) return { txt: "N.° " + e.numero + (e.fecha ? " · " + fechaLarga(e.fecha) : " · fecha no detectada automáticamente"), auto: true, comprobado: e.comprobado, ok: e.ok !== false, url: e.url || n.enfenUrl };
    return { txt: "N.° 12-2026 · fecha no verificada (el sistema aún no pudo leer la lista oficial)", auto: false, url: n.enfenUrl };
  }
  function ninoTres() {
    var n = ED.nino; if (!n || !n.tres) return "";
    return '<div class="n3">' + n.tres.map(function (x, i) { return '<article class="n3-i n3-' + (i + 1) + '"><h3>' + esc(x.k) + '</h3><p class="n3-v">' + esc(x.v) + "</p><p>" + esc(x.d) + '</p><small>Fuente: ' + esc(x.f) + "</small></article>"; }).join("") + "</div>";
  }
  function numEnfen(x) { var m = /^(\d+)-(\d{4})$/.exec(x || ""); return m ? +m[2] * 1000 + +m[1] : 0; }
  function avisoEnfen() {
    var e = NOT.enfen, ref = (ED.nino || {}).comunicadoRef; if (!e || !e.numero || !ref || numEnfen(e.numero) <= numEnfen(ref)) return "";
    return '<p class="n-aviso" role="note"><b>Aviso:</b> el ENFEN ya publicó el comunicado N.° ' + esc(e.numero) + (e.fecha ? " (" + esc(fechaLarga(e.fecha)) + ")" : "") + ", posterior al N.° " + esc(ref) + " en que se basa el pronóstico resumido aquí. El pronóstico puede haber cambiado: léelo en el ENFEN antes de decidir.</p>";
  }
  function ninoLinks() {
    var n = ED.nino || {}, u = ultimoEnfen(), ob = n.observatorio;
    return '<p class="n-ult"><b>Último comunicado oficial del ENFEN:</b> ' + esc(u.txt) + (u.auto && u.comprobado ? " <small>(leído de gob.pe el " + esc(corta(u.comprobado)) + ")</small>" : "") + '</p><div class="n-lk"><a class="btn" href="' + safeUrl(u.url) + '" target="_blank" rel="noopener noreferrer">Comunicados oficiales del ENFEN ↗</a>' + (ob ? '<a class="btn o" href="' + safeUrl(ob.u) + '" target="_blank" rel="noopener noreferrer">' + esc(ob.n) + " ↗</a>" : "") + "</div>";
  }
  function ninoPanel() {
    var n = ED.nino; if (!n) return "";
    var h = '<section class="panel nino-p" aria-labelledby="n-h"><h2 id="n-h" class="pt">Estado, pronóstico y riesgo</h2>' + avisoEnfen() + ninoTres() + ninoLinks() + '<p class="mono nota-corte">Contenido editorial con corte al ' + esc(corta(ED.corte + "T12:00:00Z")) + ". " + esc(n.corte) + "</p></section>";
    h += '<details class="panel nino-p det"><summary>Cómo ha cambiado el pronóstico</summary><ol class="tl nl">' + n.linea.map(function (x) { return '<li class="hecho"><span class="nodo">●</span><div class="tx"><b>' + esc(x.c) + (x.f ? " · " + esc(x.f) : "") + "</b><p>" + esc(x.x) + '</p><a class="lk" href="' + safeUrl(x.u) + '" target="_blank" rel="noopener noreferrer">Ver comunicado o fuente ↗</a></div></li>'; }).join("") + "</ol></details>";
    return h;
  }

  /* ───── VISTAS ───── */
  /* fechas separadas: sistema, noticias, indicadores y contenido editorial */
  function fechaHora(iso) { try { return new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(iso)); } catch (e) { return iso; } }
  function ultimaNota() { var f = ITEMS.filter(function (i) { return i.fecha; })[0]; return f ? f.fecha : null; }
  function frescura() {
    var g = NOT.estado_fuentes || {}, nombres = Object.keys(g), ok = nombres.filter(function (k) { return g[k].ok; }).length, agr = nombres.filter(function (k) { return g[k].procedencia === "agregador"; }), sd = nombres.filter(function (k) { return !g[k].ok; });
    return '<section class="fresh" aria-labelledby="fr-h"><h2 id="fr-h">¿De cuándo es esta información?</h2><dl>' +
      "<div><dt>Sistema</dt><dd>Última comprobación automática: " + (NOT.generado ? esc(fechaHora(NOT.generado)) + " (hora de Lima)" : "sin registro") + ". Próxima: " + proxima() + ". Que el sistema se haya ejecutado no significa que cada fuente tenga datos nuevos.</dd></div>" +
      "<div><dt>Noticias</dt><dd>" + (ultimaNota() ? "La nota más reciente indexada se publicó el " + esc(fechaHora(ultimaNota())) + "." : "Sin notas con fecha.") + " Cada nota muestra su propia fecha de publicación.</dd></div>" +
      "<div><dt>Indicadores</dt><dd>Cada cifra muestra su fecha de corte. Muchas se publican con semanas o meses de rezago.</dd></div>" +
      "<div><dt>Análisis editorial</dt><dd>Redactado con corte al " + esc(fechaLarga(ED.corte)) + ".</dd></div></dl>" +
      (nombres.length ? '<p class="fresh-f">Medios consultados: ' + ok + " de " + nombres.length + " con datos" + (agr.length ? "; vía Google Noticias (no directo): " + esc(agr.join(", ")) : "") + (sd.length ? "; sin datos: " + esc(sd.join(", ")) : "") + '. <a href="#/fuentes">Ver el estado de cada fuente</a>.</p>' : "") + "</section>";
  }
  function noticiasRecientes(n) {
    var vistos = {}, r = [];
    ITEMS.forEach(function (i) { if (r.length >= n || !i.fecha || i.sector === "deporte" || i.sector === "mundo" || i.tipo === "internacional" || vistos[i.fuente + i.sector]) return; vistos[i.fuente + i.sector] = 1; r.push(asFeed(i)); });
    return r;
  }
  function indicadoresClave() {
    var D = ED.datos, ids = ["desemp", "pobreza", "hogint", "pob"], dd = [];
    D.grupos.forEach(function (g) { g.items.forEach(function (i) { dd.push(i); }); });
    var sel = ids.map(function (id) { return dd.filter(function (i) { return i.id === id; })[0]; }).filter(Boolean), tc = bloqueTc();
    return (tc ? [tc] : []).concat(sel).slice(0, 4);
  }
  function bloqueTc() {
    var tc = (NOT.indicadores || {}).tipo_cambio; if (!tc || !tc.serie || !tc.serie.length) return null;
    var v = tc.serie.map(function (x) { return x.v; }), u = v[v.length - 1], d = v.length > 1 ? u - v[v.length - 2] : null, ref = /Referencial/.test(tc.fuente || ""), f = tc.serie[tc.serie.length - 1].f;
    return { cat: "eco", k: "Tipo de cambio: soles por dólar", v: "S/ " + num(u, 3), un: "soles por US$ 1", corte: fechaLarga(f) + (d !== null ? " · variación diaria " + (d >= 0 ? "+" : "") + num(d, 3) : ""), fp: ref ? "Referencial (" + String(tc.fuente).replace("Referencial · ", "") + ")" : "BCRP",
      n: ref ? "Valor de mercado referencial; el dato oficial está en el BCRP." : "Tipo de cambio interbancario venta.", c: "Cuántos soles cuesta comprar un dólar estadounidense. Si el número sube, el dólar se encarece; si baja, se abarata.", e: "Con S/ " + num(u, 3) + " por dólar, US$ 100 equivalen a S/ " + num(u * 100, 2) + ".", f: ref ? "BCRP (dato oficial)" : "BCRP", u: "https://estadisticas.bcrp.gob.pe/estadisticas/series/", spark: spark(v, false) };
  }
  function dataCard(d, compacta) {
    return '<article class="dc' + (compacta ? " dc-c" : "") + '"><header><span class="tag">' + esc(d.fp) + "</span><h3>" + esc(d.k) + '</h3></header><p class="dc-v"><span class="cifra">' + esc(d.v) + '</span> <span class="un">' + esc(d.un) + "</span></p>" + (d.n && !compacta ? '<p class="dc-n">' + esc(d.n) + "</p>" : "") + (d.spark || "") +
      '<p class="dc-c"><b>Qué significa:</b> ' + esc(d.c) + "</p>" + (compacta ? "" : '<p class="dc-e"><b>Ejemplo:</b> ' + esc(d.e) + "</p>") +
      '<p class="dc-m"><span>Fecha de corte: <b>' + esc(d.corte) + '</b></span><a href="' + safeUrl(d.u) + '" target="_blank" rel="noopener noreferrer">Fuente: ' + esc(d.f || d.fp) + " ↗</a></p></article>";
  }
  function tarjetaPregunta(num_, id, titulo, cuerpo, pie) {
    return '<section class="q q' + num_ + '" aria-labelledby="' + id + '"><header><span class="q-n" aria-hidden="true">' + num_ + '</span><h2 id="' + id + '">' + esc(titulo) + "</h2></header>" + cuerpo + '<footer>' + pie + "</footer></section>";
  }
  function visualStats() {
    // Se muestran únicamente cifras reales y sus periodos: no se copian valores de la maqueta.
    var grupos=ED.datos && ED.datos.grupos || [], todos=[];
    grupos.forEach(function(g){(g.items||[]).forEach(function(i){todos.push(i);});});
    function dato(id){return todos.filter(function(i){return i.id===id;})[0];}
    var pob=dato("pob"), internet=dato("hogint"), tc=bloqueTc(), e=ultimoEnfen(), arr=[];
    if(pob)arr.push({k:"Población del Perú",v:pob.v,fecha:pob.corte,ico:"salud",url:"#/datos"});
    if(tc)arr.push({k:"Tipo de cambio",v:tc.v,fecha:tc.corte,ico:"economia",url:"#/datos"});
    if(internet)arr.push({k:"Hogares con internet",v:internet.v,fecha:internet.corte,ico:"datos",url:"#/datos"});
    if(e && e.auto && NOT.enfen && NOT.enfen.numero)arr.push({k:"Comunicado ENFEN",v:"N.° "+NOT.enfen.numero,fecha:NOT.enfen.fecha?fechaLarga(NOT.enfen.fecha):"Fecha no disponible",ico:"nino",url:"#/s/nino"});
    else arr.push({k:"Situación El Niño",v:"Consultar",fecha:"Estado oficial por verificar",ico:"nino",url:"#/s/nino"});
    return arr.slice(0,4).map(function(x){
      return '<a class="hero-stat" href="'+esc(x.url)+'"><span class="hs-ico">'+ic(x.ico)+'</span><span class="hs-copy"><strong>'+esc(x.v)+'</strong><span class="hs-label">'+esc(x.k)+'</span><small>'+esc(x.fecha)+'</small></span></a>';
    }).join("");
  }
  function visualCard(num_,id,title,summary,body,route,action,icono){
    return '<section class="q q'+num_+'" aria-labelledby="'+id+'"><header><span class="q-n" aria-hidden="true">'+ic(icono)+'</span><h2 id="'+id+'">'+esc(title)+'</h2></header><p class="q-lead">'+esc(summary)+'</p>'+body+'<footer><a class="q-go" href="'+route+'">'+esc(action)+' →</a></footer></section>';
  }
  function vistaHome() {
    var A=noticiasRecientes(3), B=indicadoresClave().slice(0,2), n=ED.nino, u=ultimoEnfen();
    var principal=INS.filter(function(i){return i.id==="politica";})[0]||INS[0];
    var fechaSistema=NOT.generado?fechaHora(NOT.generado)+" (hora de Lima)":"sin fecha confirmada";
    var h='<div class="home fade"><section class="hero" aria-labelledby="h1"><div class="hero-content">'+
      '<p class="hero-kicker">ACTUALIDAD · DATOS · ANÁLISIS</p><h1 id="h1">El Perú, explicado con claridad</h1>'+
      '<p class="hero-sub">Noticias con fuentes enlazadas, cifras con su fecha de corte y análisis para entender lo que sucede en el país.</p>'+
      '<p class="hero-updated"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/></svg>Última comprobación: '+esc(fechaSistema)+'</p></div>'+
      '<div class="hero-stats" aria-label="Indicadores y sus periodos">'+visualStats()+'</div></section>';
    h+='<div class="qs">';
    h+=visualCard(1,"q1","¿Qué está pasando en el Perú?","Noticias importantes, explicadas con contexto y enlaces al medio que las publicó.",
      A.length?'<ul class="q-l">'+A.slice(0,2).map(function(x){return '<li><a href="'+safeUrl(x.url)+'" target="_blank" rel="noopener noreferrer"><span class="q-t">'+esc(sin(x.titulo,90))+'</span>'+meta(x)+'</a></li>';}).join("")+'</ul>':'<p>Actualmente no hay noticias recientes confirmadas.</p>',
      "#/noticias","Ver noticias","politica");
    h+=visualCard(2,"q2","¿Qué dicen los datos?","Indicadores de economía y sociedad, con fecha de corte y fuente identificada.",
      '<ul class="q-l q-d">'+B.map(function(d){return '<li><span class="q-dk">'+esc(d.k)+'</span><span class="q-dv"><b class="cifra">'+esc(d.v)+'</b> <small>'+esc(d.un)+'</small></span><span class="q-dm">'+esc(d.corte)+' · '+esc(d.fp)+'</span></li>';}).join("")+'</ul>',
      "#/datos","Ver indicadores","economia");
    h+=visualCard(3,"q3","¿Qué ocurre con El Niño?","Distingue entre estado observado, pronóstico y riesgo potencial.",
      n && n.tres?'<ul class="q-l q-n3">'+n.tres.map(function(x){return '<li><b>'+esc(x.k)+':</b> '+esc(x.v)+'</li>';}).join("")+'</ul><p class="q-u">Último comunicado ENFEN: '+esc(u.txt)+'</p>':'<p>Información en revisión.</p>',
      "#/s/nino","Ver El Niño","nino");
    h+='</div>';
    h+='<nav class="home-topics" aria-label="Explora los temas del Perú"><div class="home-topics-title"><h2>El Perú, en un vistazo</h2><p>Amplía lo que te interesa, con fuentes y fechas.</p></div>'+
      '<a href="#/s/politica"><strong>Actualidad</strong><span>Hechos y decisiones del país</span></a>'+
      '<a href="#/s/economia"><strong>Economía</strong><span>Actividad, precios y empleo</span></a>'+
      '<a href="#/s/salud"><strong>Sociedad</strong><span>Salud y servicios públicos</span></a>'+
      '<a href="#/s/nino"><strong>Ambiente</strong><span>Clima, pronóstico y riesgos</span></a></nav>';
    if(principal)h+='<section class="dest" aria-labelledby="dest-h"><h2 id="dest-h">Análisis destacado</h2>'+leadCard(principal)+'<p class="why"><b>Por qué importa:</b> '+esc((principal.raw||{}).paraTi||"")+'</p></section>';
    h+=frescura();
    h+='<details class="mas-rec"><summary>Más recursos: formación, glosario, estadísticas y talleres</summary><div class="mas-g"><a href="#/ruta">La Ruta (aprende jugando)</a><a href="#/glosario">Glosario</a><a href="#/estadisticas">Estadísticas del sitio</a><a href="#/historial">Historial de notas</a><a href="#/talleres">Talleres de IA</a><a href="#/fuentes">Fuentes y su estado</a></div></details></div>';
    return h;
  }
  var nF = { sector: "todos", tipo: "todas", genero: "todos" }, nMax = 15;
  function vistaNoticias() {
    var h = '<div class="fade"><div class="shead" style="--c:var(--gold)"><h1>Noticias</h1><p>Lo publicado por medios independientes, comerciales e internacionales. Cada nota enlaza al medio original y muestra su fecha de publicación.</p></div>';
    h += '<details class="filtros"><summary>Filtrar por tema, tipo de medio o género</summary><div class="filtros-in"><div><span class="fl">Tema</span><div class="chips" id="n-sec"></div></div><div><span class="fl">Tipo de medio</span><div class="chips" id="n-tipo"></div></div><div><span class="fl">Género</span><div class="chips" id="n-gen"></div></div></div></details>';
    h += '<div id="n-lista" aria-live="polite"></div><p style="text-align:center;margin-top:14px" id="n-mas"></p><p class="nota-pie">' + (ultimaNota() ? "La nota más reciente indexada es del " + esc(fechaHora(ultimaNota())) + "." : "") + " Los titulares y resúmenes pertenecen a cada medio. Las notas marcadas «vía Google Noticias» no llegaron por el feed del medio.</p></div>";
    setTimeout(pintarNoticias, 0);
    return h;
  }
  function pintarNoticias() {
    var a = $("#n-sec"); if (!a) return;
    function chips(el, arr, clave) { el.innerHTML = arr.map(function (o) { return '<button class="chip' + (o[0] === nF[clave] ? " on" : "") + '" data-nf="' + clave + ":" + o[0] + '" aria-pressed="' + (o[0] === nF[clave]) + '">' + esc(o[1]) + "</button>"; }).join(""); }
    chips(a, [["todos", "Todos"]].concat(ED.sectores.map(function (x) { return [x.id, x.nombre]; })), "sector");
    chips($("#n-tipo"), [["todas", "Todos"], ["independiente", "Independientes"], ["comercial", "Comerciales"], ["internacional", "Internacionales"], ["estatal", "Oficiales"]], "tipo");
    chips($("#n-gen"), [["todos", "Todos"], ["noticia", "Noticias"], ["opinion", "Opinión"]], "genero");
    var l = FEED.filter(function (x) { return (nF.sector === "todos" ? x.sector !== "deporte" : x.sector === nF.sector) && (nF.tipo === "todas" || x.tipo === nF.tipo || (nF.tipo === "estatal" && x.tipo === "oficial")) && (nF.genero === "todos" || x.genero === nF.genero); });
    $("#n-lista").innerHTML = l.length ? '<div class="lista2">' + l.slice(0, nMax).map(row).join("") + "</div>" : '<div class="vacio">No hay notas con estos filtros. Prueba con otros o espera la próxima actualización.</div>';
    $("#n-mas").innerHTML = l.length > nMax ? '<button class="btn o" id="n-b">Ver más notas (' + (l.length - nMax) + ")</button>" : "";
    var b = $("#n-b"); if (b) b.onclick = function () { nMax += 15; pintarNoticias(); };
  }
  function proxima() {
    var now = Date.now(), off = -5 * 3600e3, l = new Date(now + off), y = l.getUTCFullYear(), m = l.getUTCMonth(), d = l.getUTCDate();
    var c = proxHora(now, off, y, m, d);
    var cl = new Date(c + off); return (cl.getUTCDate() === d ? "hoy " : "mañana ") + String(cl.getUTCHours()).padStart(2, "0") + ":00";
  }
  /* actualizaciones automáticas, hora de Lima (UTC-5): 00:00, 06:00, 10:00, 12:00, 15:00, 18:00 y 21:00 */
  var HORAS = [0, 6, 10, 12, 15, 18, 21];
  function proxHora(now, off, y, m, d) {
    return HORAS.map(function (h) { return Date.UTC(y, m, d, h) - off; }).concat([Date.UTC(y, m, d + 1, HORAS[0]) - off]).filter(function (t) { return t > now; })[0];
  }
  /* ───── tarjetas que se voltean: al pasar el cursor (o tocar) la paleta se invierte y aparece el concepto ───── */
  function lum(h) { var m = /^#([0-9a-f]{6})$/i.exec(h || ""); if (!m) return 0; var n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255].map(function (v) { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }).reduce(function (a, v, k) { return a + v * [.2126, .7152, .0722][k]; }, 0); }
  function colorFc(c) {
    var l = lum(c), blanco = 1.05 / (l + .05), negro = (l + .05) / (lum("#0B1220") + .05), oscuro = negro >= blanco;
    return "--c:" + c + ";--on:" + (oscuro ? "#0B1220" : "#FFFFFF") + ";--onr:" + (oscuro ? "#FFFFFF" : "#0B1220") + ";--c2:" + (oscuro ? "color-mix(in srgb," + c + " 72%,#fff)" : "color-mix(in srgb," + c + " 66%,#000)");
  }
  function hint() { return '<span class="fc-hint" aria-hidden="true"><i>↻</i><span class="h-m">Pasa el cursor</span><span class="h-t">Toca para voltear</span></span>'; }
  function fc(o) {
    return '<div class="fc ' + (o.cls || "") + '" tabindex="0" role="group" aria-label="' + esc(o.label) + '" style="' + colorFc(o.color) + '"' + (o.id ? ' data-t="' + o.id + '"' : "") + '><div class="fc-in"><div class="fc-f fc-front">' + o.front + '</div><div class="fc-f fc-back">' + o.back + "</div></div></div>";
  }
  /* ───── promoción de talleres de IA (datos en data/talleres.js) ───── */
  var T = window.TALLERES || null;
  function waUrl(txt) { var c = T && T.contacto; return c && c.whatsapp ? "https://wa.me/" + String(c.whatsapp).replace(/\D/g, "") + "?text=" + encodeURIComponent(txt || c.mensaje || "") : "#/talleres"; }
  function ext(u) { return 'href="' + safeUrl(u) + '" target="_blank" rel="noopener noreferrer"'; }
  function tCards() {
    return '<div class="t-g">' + T.talleres.map(function (x) {
      var wa = waUrl("Hola Willy, quiero información del taller: " + x.nombre + ".");
      return fc({ cls: "tcard", color: "#F59E0B", label: x.nombre + ". " + x.para + ". Pasa el cursor o toca para ver qué aprenderás.",
        front: '<span class="t-ic" aria-hidden="true">' + x.icono + "</span><h3>" + esc(x.nombre) + "</h3><small>" + esc(x.para) + "</small><p>" + esc(x.desc) + "</p>" + hint(),
        back: '<span class="fc-k">Qué aprenderás</span>' + (x.aprenderas && x.aprenderas.length ? '<ul class="fc-l">' + x.aprenderas.map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("") + "</ul>" : '<p class="fc-c">' + esc(x.desc) + "</p>") +
          (x.detalle ? '<p class="fc-e">' + esc(x.detalle) + "</p>" : "") + '<div class="fc-b"><a class="fc-go" ' + ext(wa) + ">Consultar por WhatsApp →</a></div>" });
    }).join("") + "</div>";
  }
  function pCards() {
    return '<div class="pg-g">' + T.paginas.map(function (p) {
      var sc = SECT[p.sector];
      return fc({ cls: "pgcard", color: sc ? sc.color : "#F59E0B", label: p.n + ". " + p.d + ". Pasa el cursor o toca para ver qué encontrarás.",
        front: '<span class="t-ic" aria-hidden="true">' + p.icono + "</span><h3>" + esc(p.n) + "</h3>" + (sc ? "<small>" + esc(sc.nombre) + "</small>" : "") + "<p>" + esc(p.d) + "</p>" + hint(),
        back: '<span class="fc-k">Qué encontrarás</span><p class="fc-c">' + esc(p.d) + '</p><div class="fc-b"><a class="fc-go" ' + ext(p.u) + ">Abrir página ↗</a></div>" });
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
  function bloquesPagina(sector) {
    if (!T || !T.paginas) return "";
    return T.paginas.filter(function (p) { return p.sector === sector; }).map(function (p) {
      return '<div class="cta-m" style="--c:var(--gold)"><div><b>' + esc(p.icono + " " + p.n) + "</b><small>" + esc(p.d) + '</small></div><a class="btn" ' + ext(p.u) + ">Abrir</a></div>";
    }).join("");
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
    if (T.paginas && T.paginas.length) h += sh("Mis páginas", "var(--gold)") + pCards();
    return h + "</div>";
  }

  function vistaSector(id) {
    var s = SECT[id]; if (!s || id === "brujula") return vistaHome();
    var ins = insDe(id), its = porSector(id).map(asFeed), a = ARTS[id], hecho = !!S.hechas[id];
    var terms = (s.terminos || []).filter(function (t) { return GLOS[t]; });
    var h = '<div class="fade"><div class="shead" style="--c:' + s.color + '"><h1><span class="ic big">' + ic(id) + "</span> " + esc(s.nombre) + "</h1><p>" + esc(s.lema) + '</p></div><div class="cols sec-cols"><div>';
    var inss = INS.filter(function (i) { return i.sector === id; });
    if (id === "nino") h += ninoPanel();
    h += '<div class="panel">' + (ins ? leadCard(ins) : "") + "</div>";
    if (inss.length > 1) h += '<div class="minis">' + inss.slice(1).map(card).join("") + "</div>";
    h += '<div class="entender"><h2>Para entender ' + esc(nomFrase(s)) + '</h2><ul>' + s.esencial.map(function (e) { return "<li>" + gl(e) + "</li>"; }).join("") + "</ul></div>";
    h += (id === "ia" ? bloqueIA() : "") + bloquesPagina(id);
    h += '<div class="cta-m" style="--c:' + s.color + '"><div><b>' + (hecho ? "✅ Misión superada" : "🎯 Misión: " + esc(s.nombre)) + "</b><small>" + (hecho ? "Puedes repetirla cuando quieras." : "3 preguntas · gana hasta 80 XP") + '</small></div><button class="btn" data-m="' + id + '">' + (hecho ? "Repetir" : "Empezar") + "</button></div>";
    var vacio = '<div class="vacio">Aún no hay notas en esta sección. La próxima actualización automática (7 veces al día) las incorporará.</div>';
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
      return '<div class="st ' + est + '"><div class="dot">' + (hecho ? "✓" : disp ? (ic(id) || s.icono) : "🔒") + '</div><div class="stc"><span class="paso">Estación ' + (k + 1) + "</span><h3>" + esc(s.nombre) + "</h3><p>" + esc(s.lema) + '</p><div class="stt"><span>' + (hecho ? "Superada · " + S.hechas[id].ac + "/3 aciertos" : disp ? "Disponible" : "Completa la anterior") + "</span>" + (hecho || disp ? '<button class="btn' + (hecho ? " o" : "") + '" data-m="' + id + '" style="min-height:40px">' + (hecho ? "Repetir" : "Empezar") + "</button>" : "") + "</div></div></div>";
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

  function estadoTxt(e) { return e.ok ? (e.procedencia === "agregador" ? "Vía Google Noticias (no directo) · " + e.n + " notas" : "Directa · " + e.n + " notas") : "Sin datos"; }
  function estadoFuentesHTML() {
    var g = NOT.estado_fuentes || {}, nom = Object.keys(g);
    if (!nom.length) return '<section class="fg"><h2>Estado de las fuentes de noticias</h2><div class="vacio">Aún no hay una comprobación automática registrada.</div></section>';
    return '<section class="fg"><h2>Estado de las fuentes de noticias</h2><p class="dp-nota">Resultado de la última comprobación automática. «Vía Google Noticias» significa que el feed del medio no respondió y se usó un agregador identificado; esas notas nunca se presentan como directas. «Sin datos» conserva las últimas notas válidas.</p><div class="tabla-w"><table class="tabla"><thead><tr><th scope="col">Medio</th><th scope="col">Resultado</th><th scope="col">Última nota</th><th scope="col">Comprobado</th><th scope="col">Detalle</th></tr></thead><tbody>' +
      nom.map(function (k) { var e = g[k]; return "<tr><th scope=\"row\">" + esc(k) + '</th><td class="' + (e.ok ? (e.procedencia === "agregador" ? "ag" : "ok") : "no") + '">' + esc(estadoTxt(e)) + "</td><td>" + (e.ultima_nota ? esc(corta(e.ultima_nota)) : "—") + "</td><td>" + (e.comprobado ? esc(fechaHora(e.comprobado)) : "—") + "</td><td>" + esc(e.ok ? (e.procedencia === "agregador" ? "Feed directo: " + (e.error_directo || "sin respuesta") : "") : (e.error || "") + (e.error_respaldo ? " · respaldo: " + e.error_respaldo : "")) + "</td></tr>"; }).join("") + "</tbody></table></div></section>";
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
    h += estadoFuentesHTML();
    h += '<section class="fg"><h2>¿Cómo funciona y cada cuánto se actualiza?</h2><div class="box" style="margin:10px 0"><p style="font-size:.95rem">Un flujo automático de GitHub Actions lee los feeds RSS de estos medios <b>siete veces al día (00:00, 06:00, 10:00, 12:00, 15:00, 18:00 y 21:00, hora de Lima)</b>, clasifica las notas por sector y publica el sitio. Mostramos título, resumen breve y enlace; el contenido pertenece a cada medio. Los análisis llevan fecha de corte y nivel de confianza. La clasificación por sector es automática y puede equivocarse.</p></div></section></div>';
    return h;
  }

  function vistaEstadisticas() {
    var g = NOT.estado_fuentes || {}, nom = Object.keys(g), ok = nom.filter(function (k) { return g[k].ok; }).length, cnt = {};
    ITEMS.forEach(function (i) { cnt[i.sector] = (cnt[i.sector] || 0) + 1; });
    var max = Math.max.apply(null, ED.sectores.map(function (x) { return cnt[x.id] || 0; }).concat([1]));
    var indep = ITEMS.filter(function (i) { return i.tipo === "independiente"; }).length;
    var h = '<div class="fade"><div class="shead" style="--c:var(--gold)"><h1>Estadísticas</h1><p>Indicadores con fuente y cobertura de las notas que procesa este sitio. Las cifras externas se contrastan siempre en la fuente primaria.</p></div>';
    h += '<div class="kpis"><div class="kpi"><div class="k">Notas indexadas</div><div class="v">' + ITEMS.length + '</div><small>Últimos 30 días</small></div><div class="kpi"><div class="k">Fuentes activas</div><div class="v">' + (nom.length ? ok + "/" + nom.length : "—") + '</div><small>Última carga</small></div><div class="kpi"><div class="k">Medios independientes</div><div class="v">' + indep + '</div><small>Notas en el índice</small></div><div class="kpi"><div class="k">Análisis propios</div><div class="v">' + INS.length + '</div><small>Con fuentes enlazadas</small></div></div>';
    h += '<div class="bento"><div class="panel b1"><h3 class="pt">Indicadores</h3>' + indicadores(true) + '</div><div class="panel"><h3 class="pt">Notas por sección</h3>' + ED.sectores.map(function (x) { var n = cnt[x.id] || 0; return '<div class="hbar" style="--c:' + x.color + '"><span>' + esc(x.nombre) + '</span><span><i style="width:' + Math.round(n / max * 100) + '%"></i></span><span>' + n + "</span></div>"; }).join("") + '</div><div class="panel"><h3 class="pt">Estado de las fuentes</h3>' + (nom.length ? nom.map(function (k) { return '<div class="fuente-i"><span>' + esc(k) + '</span><span class="' + (g[k].ok ? (g[k].procedencia === "agregador" ? "ag" : "ok") : "no") + '">' + esc(estadoTxt(g[k])) + "</span></div>"; }).join("") : '<div class="vacio">Aún no hay una carga automática registrada.</div>') + "</div></div></div>";
    return h;
  }
  function fmtNum(v, dec) { return num(v, dec); }
  function ejSerie(x, b) {
    var a = b.serie[0], u = b.serie[b.serie.length - 1], d = u.v - a.v;
    if (x.unidad === "personas") return "En " + a.a + " había " + fmtNum(a.v, 0) + " habitantes y en " + u.a + ", " + fmtNum(u.v, 0) + ": " + fmtNum(Math.abs(d / a.v * 100), 1) + " % " + (d >= 0 ? "más" : "menos") + ".";
    if (x.unidad === "años") return "Un recién nacido en " + u.a + " viviría en promedio " + fmtNum(u.v, x.dec) + " años, " + fmtNum(Math.abs(d), x.dec) + " " + (d >= 0 ? "más" : "menos") + " que en " + a.a + ".";
    return "En " + a.a + " fue " + fmtNum(a.v, x.dec) + " % y en " + u.a + ", " + fmtNum(u.v, x.dec) + " %: " + (d >= 0 ? "subió " : "bajó ") + fmtNum(Math.abs(d), x.dec) + " puntos porcentuales.";
  }
  var UNIDAD_BM = { "SP.POP.TOTL": "habitantes", "SL.UEM.TOTL.ZS": "% de la fuerza laboral", "IT.NET.USER.ZS": "% de la población", "NY.GDP.MKTP.KD.ZG": "% de variación anual", "FP.CPI.TOTL.ZG": "% anual", "SP.DYN.LE00.IN": "años" };
  var DCATS = [["todos", "Todo"], ["eco", "Economía"], ["clima", "Clima / ENFEN"], ["soc", "Sociedad / INEI"], ["salud", "Salud / Minsa"]], dFil = "todos";
  function bloquesDatos() {
    var D = ED.datos, bm = NOT.datos_bm || {}, B = [], tc = bloqueTc();
    if (tc) B.push(tc);
    D.grupos.forEach(function (g) { g.items.forEach(function (i) { B.push(i); }); });
    (D.series || []).forEach(function (x) {
      var b = bm[x.cod]; if (!b || !b.serie || b.serie.length < 3) return;
      var u = b.serie[b.serie.length - 1];
      B.push({ cat: x.cat, fp: "Banco Mundial", k: x.k, v: fmtNum(u.v, x.dec), un: UNIDAD_BM[x.cod] || x.unidad, corte: "Año " + u.a + " (serie anual)", n: "", spark: spark(b.serie.map(function (p) { return p.v; }), false), c: x.c, e: ejSerie(x, b), f: "Banco Mundial", u: "https://data.worldbank.org/indicator/" + x.cod + "?locations=PE" });
    });
    var orden = { eco: 0, clima: 1, soc: 2, salud: 3 };
    return B.map(function (x, i) { return { x: x, i: i }; }).sort(function (a, b) { return (orden[a.x.cat] - orden[b.x.cat]) || (a.i - b.i); }).map(function (o) { return o.x; });
  }
  function pintarDatos() {
    var c = $("#d-chips"), g = $("#d-grid"); if (!c || !g) return;
    c.innerHTML = DCATS.map(function (x) { return '<button class="chip' + (x[0] === dFil ? " on" : "") + '" data-df="' + x[0] + '" aria-pressed="' + (x[0] === dFil) + '">' + esc(x[1]) + "</button>"; }).join("");
    var B = bloquesDatos().filter(function (b) { return dFil === "todos" || b.cat === dFil; });
    g.innerHTML = B.length ? B.map(function (d) { return dataCard(d); }).join("") : '<div class="vacio">No hay datos en esta categoría todavía.</div>';
  }
  function vistaDatos() {
    var D = ED.datos; if (!D) return vistaHome();
    var h = '<div class="fade"><div class="shead" style="--c:#38BDF8"><p class="po-eye">Datos del Perú</p><h1>Datos y cifras clave</h1><p>' + esc(D.intro) + "</p></div>";
    h += '<details class="filtros"><summary>Filtrar por tema</summary><div class="chips" id="d-chips" aria-label="Categorías"></div></details><div class="dp-b" id="d-grid" aria-live="polite"></div>';
    h += sh("Dónde buscar más datos", "#94A3B8") + D.enlaces.map(function (e) { return '<a class="fr" href="' + safeUrl(e.u) + '" target="_blank" rel="noopener noreferrer"><div><b>' + esc(e.n) + "</b><p>" + esc(e.d) + "</p></div><span>↗</span></a>"; }).join("");
    h += '<div class="box" style="margin-top:20px"><h3>Cómo leer estas cifras</h3><p>Cada dato indica su unidad, su fecha de corte y quién lo publicó. Compara solo cifras del mismo periodo y de la misma población: el desempleo de Lima Metropolitana no es el desempleo nacional, y un trimestre móvil no equivale a un año. Los datos del INEI se cargan con corte editorial al ' + esc(fechaLarga(D.corte)) + "; el tipo de cambio y las series del Banco Mundial se actualizan solos.</p></div>" + frescura();
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
  var primeraVez = true;
  function ruta() { var h = location.hash.replace(/^#\/?/, ""), p = h.split("/"); return { v: p[0] || "inicio", id: p[1] }; }
  function navegar() {
    var r = ruta(), html, tab = "inicio", nav = "inicio", t = TITULO;
    if (r.v === "noticias") { html = vistaNoticias(); nav = "noticias"; tab = "noticias"; t = "Noticias · " + TITULO; }
    else if (r.v === "nino") { html = vistaSector("nino"); nav = "nino"; tab = "nino"; t = "El Niño · " + TITULO; }
    else if (r.v === "s" && SECT[r.id] && r.id !== "brujula") { html = vistaSector(r.id); nav = r.id; tab = r.id === "nino" ? "nino" : ""; t = SECT[r.id].nombre + " · " + TITULO; }
    else if (r.v === "a") { html = vistaArticulo(r.id); var ar = ED.insights.filter(function (x) { return (x.id || x.sector) === r.id; })[0]; nav = r.id === "hilo" ? "inicio" : (ar ? ar.sector : "inicio"); t = (r.id === "hilo" ? ED.hilo.titulo : ar ? ar.titulo : TITULO) + " · " + TITULO; }
    else if (r.v === "ruta") { html = vistaRuta(); nav = "ruta"; tab = ""; t = "La Ruta · " + TITULO; }
    else if (r.v === "glosario") { html = vistaGlosario(); nav = "glosario"; tab = ""; t = "Glosario · " + TITULO; }
    else if (r.v === "datos") { html = vistaDatos(); nav = "datos"; tab = "datos"; t = "Datos del Perú · " + TITULO; }
    else if (r.v === "estadisticas") { html = vistaEstadisticas(); nav = "estadisticas"; tab = ""; t = "Estadísticas · " + TITULO; }
    else if (r.v === "historial") { html = vistaHistorial(); nav = "historial"; tab = ""; t = "Historial · " + TITULO; }
    else if (r.v === "talleres") { html = vistaTalleres(); nav = "talleres"; tab = ""; t = "Talleres de IA · " + TITULO; }
    else if (r.v === "fuentes") { html = vistaFuentes(); nav = "fuentes"; tab = ""; t = "Fuentes · " + TITULO; }
    else { html = vistaHome(); }
    $("#app").innerHTML = html; document.title = t;
    document.body.setAttribute("data-v", r.v);
    $$(".mnav a").forEach(function (a) { var on = a.getAttribute("data-n") === nav; a.classList.toggle("on", on); if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    $$("#tabbar [data-t]").forEach(function (a) { var on = a.getAttribute("data-t") === tab; a.classList.toggle("on", on); if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    if (primeraVez) primeraVez = false; else { try { $("#app").focus({ preventScroll: true }); } catch (e) {} }
    var sh = $("#b-share"); if (sh) sh.onclick = compartir;
    window.scrollTo(0, 0);
  }
  function compartir() {
    var d = { title: document.title, url: location.href };
    if (navigator.share) navigator.share(d).catch(function () {});
    else if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(function () { toast("Enlace copiado"); });
  }
  function menuNav() { /* la navegación secundaria vive en el menú «Más» (abrirMenu) */ }

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
      h += '<div class="paso">Estación ' + (ORDEN.indexOf(M.id) + 1) + " de " + ORDEN.length + ' · Briefing</div><h3 id="m-t"><span class="ic sm">' + ic(M.id) + "</span> " + esc(m.titulo) + '</h3><p style="color:var(--tx2);margin:0">' + esc(s.lema) + '</p><ul class="esc">' + s.esencial.map(function (e) { return "<li>" + gl(e) + "</li>"; }).join("") + "</ul>" +
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
    var nv = NIVELES[nivelDe(S.xp)];
    $("#menu-in").innerHTML = '<button class="sx" aria-label="Cerrar" data-x="1">✕</button><h3 id="menu-t">Más opciones</h3>' +
      '<a class="xp xp-m" href="#/ruta" data-cerrar="1" id="xpchip" aria-label="Mi progreso en la Ruta"><span aria-hidden="true">🧭</span><span>Mi Ruta:</span><b id="xpnum">' + S.xp + " XP</b></a>" +
      '<div class="paso">Formación</div><div class="menu-l"><a href="#/ruta" data-cerrar="1">La Ruta: aprende jugando</a><a href="#/glosario" data-cerrar="1">Glosario</a><a href="#/talleres" data-cerrar="1">Talleres de IA</a></div>' +
      '<div class="paso">Datos y archivo</div><div class="menu-l"><a href="#/estadisticas" data-cerrar="1">Estadísticas del sitio</a><a href="#/historial" data-cerrar="1">Historial de notas</a><a href="#/fuentes" data-cerrar="1">Fuentes y su estado</a></div>' +
      '<div class="paso">Temas</div><div class="menu-g">' + ED.sectores.map(function (x) { return '<a href="#/s/' + x.id + '" data-cerrar="1" style="--c:' + x.color + '"><span class="ic sm">' + ic(x.id) + "</span>" + esc(x.nombre) + "</a>"; }).join("") + "</div>";
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
    var nf = c("[data-nf]"); if (nf) { var kv = nf.getAttribute("data-nf").split(":"); nF[kv[0]] = kv[1]; nMax = 15; pintarNoticias(); return; }
    var fl = c(".flip,.fc"); if (fl && !c("a") && window.matchMedia && matchMedia("(hover: none)").matches) { var ya = fl.classList.contains("on"); $$(".flip.on,.fc.on").forEach(function (x) { x.classList.remove("on"); }); if (!ya) fl.classList.add("on"); return; }
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
  /* tarjetas del portal: foco de luz que sigue al cursor, ligera inclinación y apertura del globo hacia el lado con espacio */
  document.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch") return; var t = e.target.closest ? e.target.closest(".fc") : null; if (!t) return;
    var r = t.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    t.style.setProperty("--mx", (x * 100).toFixed(0) + "%"); t.style.setProperty("--my", (y * 100).toFixed(0) + "%"); t.style.setProperty("--rx", ((x - .5) * 2).toFixed(2)); t.style.setProperty("--ry", ((y - .5) * 2).toFixed(2));
  }, { passive: true });
  document.addEventListener("pointerout", function (e) { var t = e.target.closest ? e.target.closest(".fc") : null; if (t && !t.contains(e.relatedTarget)) { t.style.setProperty("--rx", 0); t.style.setProperty("--ry", 0); } });
  addEventListener("keydown", function (e) { var f = e.target && e.target.classList && (e.target.classList.contains("flip") || e.target.classList.contains("fc")) ? e.target : null; if (f && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); f.classList.toggle("on"); return; } if (e.key === "/" && !/^(INPUT|TEXTAREA)$/.test((document.activeElement || {}).tagName || "") && !hojaAbierta) { e.preventDefault(); abrirBuscar(); return; } if (e.key === "Escape") { cerrarHojas(); $("#pop").classList.remove("on"); } });
  addEventListener("hashchange", function () { cerrarHojas(); navegar(); });
  addEventListener("scroll", function () { if (Math.abs(window.scrollY - popY) > 60) $("#pop").classList.remove("on"); }, { passive: true });
  $("#b-buscar").onclick = abrirBuscar; $("#t-bus").onclick = abrirBuscar; $("#b-mas").onclick = abrirMenu;
  (function tema() {
    var r = document.documentElement, g = null; try { g = localStorage.getItem("cp_tema"); } catch (e) {} if (g) r.setAttribute("data-theme", g);
    $("#b-tema").onclick = function () { var oscuro = r.getAttribute("data-theme") ? r.getAttribute("data-theme") === "dark" : true; var n = oscuro ? "light" : "dark"; r.setAttribute("data-theme", n); try { localStorage.setItem("cp_tema", n); } catch (e) {} };
  })();

  /* ───── línea dinámica de lo último y más relevante (derecha a izquierda) ───── */
  function ticker() {
    var w = $("#tk-t"); if (!w) return;
    var it = [], tc = (NOT.indicadores || {}).tipo_cambio;
    if (tc && tc.serie && tc.serie.length) { var v = tc.serie[tc.serie.length - 1].v, a = tc.serie.length > 1 ? v - tc.serie[tc.serie.length - 2].v : null; it.push({ h: "#/datos", t: "USD/PEN", x: "S/ " + num(v, 3) + (a === null ? "" : (a >= 0 ? " ▲" : " ▼") + num(Math.abs(a), 3)), cls: "fx" }); }
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
      var c = proxHora(now, off, y, m, d);
      var mins = Math.round((c - now) / 60000), hh = Math.floor(mins / 60), mm = mins % 60, cl = new Date(c + off), hoy = cl.getUTCDate() === d;
      $("#status").innerHTML = '<span class="live">Sistema</span><span>Última comprobación: ' + (NOT.generado ? esc(fechaHora(NOT.generado)) : "sin registro") + '</span><span class="nx">Próxima: ' + (hoy ? "hoy" : "mañana") + " " + String(cl.getUTCHours()).padStart(2, "0") + ":00 · en " + (hh ? hh + " h " : "") + mm + " min</span>";
    }
    pintar(); setInterval(pintar, 30000);
    $("#f-ult").textContent = NOT.generado ? fmtFecha(NOT.generado, true) : "—"; $("#f-corte").textContent = fmtFecha(ED.corte + "T12:00:00Z");
  }

  /* ───── arranque ───── */
  function pintarPie() {
    var el = $("#f-talleres"); if (!el || !T) return;
    var c = T.contacto || {}, a = T.autor || {}, pg = T.paginas || [];
    el.innerHTML = "<h4>Talleres de IA</h4><p>Aprende a usar la inteligencia artificial con ejemplos prácticos.</p>" +
      (a.nombre ? '<p class="f-aut"><b>' + esc(a.nombre) + "</b><br>" + esc(a.titulo || "") + "</p>" : "") +
      '<p class="f-lk"><a href="#/talleres">Ver talleres</a>' + (c.tiktok ? ' · <a ' + ext(c.tiktok) + ">TikTok</a>" : "") + (c.web ? ' · <a ' + ext(c.web) + ">Web de talleres</a>" : "") + "</p>" +
      (pg.length ? '<p class="f-lk"><b>Mis páginas:</b> ' + pg.map(function (p) { return "<a " + ext(p.u) + ">" + esc(p.n) + "</a>"; }).join(" · ") + "</p>" : "");
  }
  function pintarOffline() {
    var o = $("#offline"); if (!o) return;
    if (navigator.onLine === false) { o.hidden = false; o.textContent = "Sin conexión: se muestran los últimos datos guardados en este dispositivo" + (NOT.generado ? " (sistema comprobado el " + fechaHora(NOT.generado) + ")" : "") + "."; } else o.hidden = true;
  }
  addEventListener("online", pintarOffline); addEventListener("offline", pintarOffline);
  menuNav(); estado(); xpChip(); ticker(); pintarPie(); pintarOffline(); navegar();
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    var tenia = !!navigator.serviceWorker.controller, recargado = false;
    navigator.serviceWorker.addEventListener("controllerchange", function () { if (tenia && !recargado) { recargado = true; location.reload(); } });
    navigator.serviceWorker.register("sw.js").then(function (r) { r.update(); }).catch(function () {});
  }
})();
