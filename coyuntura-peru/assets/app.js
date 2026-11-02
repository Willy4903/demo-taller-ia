/* Perú en Claro · lógica de la página (sin dependencias externas) */
(function () {
  "use strict";
  var ED = window.EDITORIAL, NOT = window.NOTICIAS || { items: [] };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ───── utilidades ───── */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function safeUrl(u) { try { var x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : "#"; } catch (e) { return "#"; } }
  function gl(t) { return esc(t).replace(/\{\{([a-z0-9-]+)\|([^}]+)\}\}/g, function (m, id, txt) { return '<button class="gl" type="button" data-gl="' + id + '">' + txt + "</button>"; }); }
  function norm(s) { return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function mulberry(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  var SECT = {}; ED.sectores.forEach(function (s) { SECT[s.id] = s; }); SECT.brujula = ED.brujula;
  var ORDEN = ["brujula"].concat(ED.sectores.map(function (s) { return s.id; }));
  var GLOS = {}; ED.glosario.forEach(function (g) { GLOS[g.id] = g; });
  var TZ = "America/Lima";
  function fmtFecha(iso, conHora) {
    try { return new Intl.DateTimeFormat("es-PE", conHora ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TZ } : { day: "numeric", month: "short", year: "numeric", timeZone: TZ }).format(new Date(iso)); } catch (e) { return iso; }
  }
  function relativo(iso) {
    var d = Date.parse(iso); if (isNaN(d)) return null;
    var m = Math.round((Date.now() - d) / 60000);
    if (m < 0) return fmtFecha(iso);
    if (m < 60) return "hace " + Math.max(m, 1) + " min";
    if (m < 1440) return "hace " + Math.round(m / 60) + " h";
    if (m < 2880) return "ayer";
    if (m < 43200) return "hace " + Math.round(m / 1440) + " d";
    return fmtFecha(iso);
  }

  /* ───── estado de gamificación ───── */
  var KEY = "cp_estado_v1";
  var S = (function () {
    var base = { xp: 0, hechas: {}, terminos: {}, dias: [], bonus: "" };
    try { return Object.assign(base, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { return base; }
  })();
  function guardar() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  var NIVELES = [
    { n: "Viajero", min: 0, ic: "🧭", d: "Empiezas tu camino" },
    { n: "Chasqui", min: 80, ic: "🏃", d: "Mensajero del Tahuantinsuyo" },
    { n: "Quipucamayoc", min: 240, ic: "🧶", d: "Guardián de los registros" },
    { n: "Amauta", min: 400, ic: "📜", d: "Maestro sabio" },
    { n: "Apu", min: 640, ic: "🏔️", d: "Espíritu protector de la montaña" }
  ];
  function nivelDe(xp) { var i = 0; NIVELES.forEach(function (n, k) { if (xp >= n.min) i = k; }); return i; }
  function hoy() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function racha() {
    var set = {}; S.dias.forEach(function (d) { set[d] = 1; });
    var n = 0, d = new Date();
    while (true) { var k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); if (set[k]) { n++; d.setDate(d.getDate() - 1); } else break; }
    return n;
  }
  (function visita() { var h = hoy(); if (S.dias.indexOf(h) < 0) S.dias.push(h); if (S.bonus !== h) { S.bonus = h; S.xp += 5; } S.dias = S.dias.slice(-60); guardar(); })();

  /* ───── arte procedural ───── */
  var _g = 0;
  function arteSector(id, c) {
    var g = "g" + (++_g);
    var grid = ""; for (var i = 25; i < 400; i += 25) grid += '<path d="M' + i + ' 0V225"/>'; for (var j = 25; j < 225; j += 25) grid += '<path d="M0 ' + j + 'H400"/>';
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
    return '<svg viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="' + g + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c + '" stop-opacity=".95"/><stop offset="1" stop-color="#05070d"/></linearGradient><radialGradient id="' + g + 'r" cx=".78" cy=".2" r=".65"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="400" height="225" fill="url(#' + g + ')"/><rect width="400" height="225" fill="url(#' + g + 'r)"/><g stroke="#fff" stroke-opacity=".07" fill="none">' + grid + "</g>" + (M[id] || M.coyuntura) + "</svg>";
  }

  function ridge(seed, y0, amp, n) {
    var r = mulberry(seed), pts = [], y = y0;
    for (var i = 0; i <= n; i++) { y = y0 - Math.abs(Math.sin(i * 0.55 + seed)) * amp * 0.6 - r() * amp * 0.5; pts.push([i * (1700 / n) - 50, y]); }
    return "M-50 920 L" + pts.map(function (p) { return p[0].toFixed(0) + " " + p[1].toFixed(0); }).join(" L") + " L1650 920Z";
  }
  function heroArte() {
    var r = mulberry(7), est = "";
    for (var i = 0; i < 110; i++) est += '<circle cx="' + (r() * 1600).toFixed(0) + '" cy="' + (r() * 420).toFixed(0) + '" r="' + (r() * 1.6 + .3).toFixed(1) + '" fill="#fff" opacity="' + (r() * .8 + .15).toFixed(2) + '"/>';
    var rayos = ""; for (var k = 0; k < 14; k++) { var a = (k / 14) * Math.PI * 2; rayos += '<path d="M1180 520L' + (1180 + Math.cos(a) * 900).toFixed(0) + " " + (520 + Math.sin(a) * 900).toFixed(0) + " L" + (1180 + Math.cos(a + .08) * 900).toFixed(0) + " " + (520 + Math.sin(a + .08) * 900).toFixed(0) + 'Z"/>'; }
    $("#arte").innerHTML =
      '<defs><radialGradient id="sol" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff3c4"/><stop offset=".35" stop-color="#F5B83D"/><stop offset=".75" stop-color="#E11D2E"/><stop offset="1" stop-color="#E11D2E" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="m1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a1c33"/><stop offset="1" stop-color="#1a0a1c"/></linearGradient>' +
      '<linearGradient id="m2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b1329"/><stop offset="1" stop-color="#12061a"/></linearGradient>' +
      '<linearGradient id="m3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#220c20"/><stop offset="1" stop-color="#0a0410"/></linearGradient></defs>' +
      '<g class="capa" data-d="2">' + est + "</g>" +
      '<g class="capa" data-d="5"><g fill="#F5B83D" opacity=".07">' + rayos + '</g><circle cx="1180" cy="520" r="330" fill="url(#sol)" opacity=".55"/><circle cx="1180" cy="520" r="120" fill="url(#sol)"/></g>' +
      '<g class="capa" data-d="9"><path d="' + ridge(3, 600, 200, 46) + '" fill="url(#m1)" opacity=".95"/></g>' +
      '<g class="capa" data-d="16"><path d="' + ridge(11, 690, 170, 40) + '" fill="url(#m2)"/></g>' +
      '<g class="capa" data-d="26"><path d="' + ridge(19, 780, 130, 34) + '" fill="url(#m3)"/></g>' +
      '<g class="capa" data-d="40"><path d="' + ridge(29, 860, 70, 28) + '" fill="#04020a"/></g>';
  }
  function parallax() {
    if (reduce) return;
    var caps = $$("#arte .capa"), mx = 0, my = 0, sy = 0, raf = 0;
    function apply() { raf = 0; caps.forEach(function (g) { var d = +g.getAttribute("data-d"); g.style.transform = "translate(" + (mx * d * -1).toFixed(1) + "px," + (my * d * -.6 + sy * d * .05).toFixed(1) + "px)"; }); }
    function req() { if (!raf) raf = requestAnimationFrame(apply); }
    addEventListener("mousemove", function (e) { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; req(); }, { passive: true });
    addEventListener("scroll", function () { sy = Math.min(scrollY, innerHeight); req(); }, { passive: true });
  }
  function red() {
    var cv = $("#red"), cx = cv.getContext("2d"), P = [], W, H, dpr = Math.min(devicePixelRatio || 1, 2);
    function size() { var b = cv.getBoundingClientRect(); W = b.width; H = b.height; cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size(); addEventListener("resize", size);
    var n = innerWidth < 600 ? 34 : 72, r = mulberry(5);
    for (var i = 0; i < n; i++) P.push({ x: r() * 1600, y: r() * 900, vx: (r() - .5) * .35, vy: (r() - .5) * .35, c: r() > .6 ? "245,184,61" : "53,224,210" });
    function draw() {
      cx.clearRect(0, 0, W, H);
      var sx = W / 1600, sy = H / 900;
      P.forEach(function (p) { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > 1600) p.vx *= -1; if (p.y < 0 || p.y > 900) p.vy *= -1; });
      for (var i = 0; i < P.length; i++) {
        for (var j = i + 1; j < P.length; j++) {
          var dx = (P[i].x - P[j].x), dy = (P[i].y - P[j].y), d = Math.sqrt(dx * dx + dy * dy);
          if (d < 190) { cx.strokeStyle = "rgba(" + P[i].c + "," + ((1 - d / 190) * .35).toFixed(3) + ")"; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(P[i].x * sx, P[i].y * sy); cx.lineTo(P[j].x * sx, P[j].y * sy); cx.stroke(); }
        }
        cx.fillStyle = "rgba(" + P[i].c + ",.9)"; cx.beginPath(); cx.arc(P[i].x * sx, P[i].y * sy, 2, 0, 6.3); cx.fill();
      }
    }
    if (reduce) { draw(); return; }
    var vis = true; new IntersectionObserver(function (e) { vis = e[0].isIntersecting; }).observe(cv);
    (function loop() { if (vis && !document.hidden) draw(); requestAnimationFrame(loop); })();
  }

  /* ───── datos de noticias ───── */
  var ITEMS = (NOT.items || []).slice().sort(function (a, b) { return (Date.parse(b.fecha) || 0) - (Date.parse(a.fecha) || 0); });
  function porSector(id) { return ITEMS.filter(function (i) { return i.sector === id; }); }

  function cabecera() {
    $("#h-ult").textContent = NOT.generado ? fmtFecha(NOT.generado, true) : "—";
    $("#f-ult").textContent = NOT.generado ? fmtFecha(NOT.generado, true) : "—";
    $("#f-corte").textContent = fmtFecha(ED.corte + "T12:00:00Z");
    $("#h-n").textContent = ITEMS.length + " notas · " + Object.keys(SECT).length + " sectores";
    function prox() {
      var now = Date.now(), off = -5 * 3600e3, l = new Date(now + off), y = l.getUTCFullYear(), m = l.getUTCMonth(), d = l.getUTCDate();
      var c = [Date.UTC(y, m, d, 8) - off, Date.UTC(y, m, d, 23) - off, Date.UTC(y, m, d + 1, 8) - off].filter(function (t) { return t > now; })[0];
      var mins = Math.round((c - now) / 60000), hh = Math.floor(mins / 60), mm = mins % 60;
      var cl = new Date(c + off), esHoy = cl.getUTCDate() === d;
      $("#h-prox").textContent = (esHoy ? "Hoy " : "Mañana ") + String(cl.getUTCHours()).padStart(2, "0") + ":00 · en " + (hh ? hh + " h " : "") + mm + " min";
    }
    prox(); setInterval(prox, 30000);
    var t = ITEMS.slice(0, 14).map(function (i) { return '<a href="' + safeUrl(i.url) + '" target="_blank" rel="noopener noreferrer"><b>' + esc((SECT[i.sector] || {}).nombre || "") + "</b>" + esc(i.titulo) + "</a>"; }).join("");
    $("#pista").innerHTML = t + t;
  }

  /* ───── insight ───── */
  var STOP = "para como pero esta este estos estas desde entre sobre tras hasta cuando donde aunque porque ante bajo contra segun sino todo toda todos todas otro otra otros mas menos muy cada tambien mientras durante fueron sera seran puede pueden tiene tienen hace hacen hizo dice dicen luego antes despues ahora nuevo nueva nuevos nuevas primer primera años ano dias dia semana mes meses peru peruano peruana peruanos peruanas lima gobierno pais".split(" ");
  function radar() {
    var cuenta = {}, forma = {};
    ITEMS.forEach(function (it) {
      var vistos = {};
      norm(it.titulo + " " + (it.resumen || "")).replace(/[^a-z0-9ñ\s]/g, " ").split(/\s+/).forEach(function (w) {
        if (w.length < 5 || STOP.indexOf(w) >= 0 || /^\d+$/.test(w) || vistos[w]) return; vistos[w] = 1; cuenta[w] = (cuenta[w] || 0) + 1;
      });
      (it.titulo + " " + (it.resumen || "")).split(/[\s,.;:()"“”¿?¡!]+/).forEach(function (o) { var k = norm(o); if (!forma[k] || o.toLowerCase() === o) forma[k] = o.toLowerCase(); });
    });
    var arr = Object.keys(cuenta).map(function (k) { return [k, cuenta[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
    var min = arr.filter(function (a) { return a[1] >= 2; }).length >= 5 ? 2 : 1;
    return arr.filter(function (a) { return a[1] >= min; }).slice(0, 8).map(function (a) { return { t: forma[a[0]] || a[0], n: a[1] }; });
  }
  function insight() {
    var h = ED.hilo, b = $("#bento"), html = "";
    if (h) {
      html += '<article class="glass hilo rev"><span class="pill" style="color:var(--oro);border-color:var(--oro)">Hilo conductor · lectura editorial</span><h3>' + esc(h.titulo) + "</h3><ul>" + h.puntos.map(function (p) { return "<li><b>" + esc(p.k) + ":</b> " + esc(p.t) + "</li>"; }).join("") + '</ul><p class="nota">Síntesis editorial con corte al ' + esc(fmtFecha(ED.corte + "T12:00:00Z")) + ". Cada punto se desarrolla abajo con sus fuentes.</p></article>";
    }
    ED.insights.forEach(function (c) {
      var s = SECT[c.sector];
      html += '<article class="glass cardi rev"><div class="cab"><span class="pill" style="color:' + s.color + ";border-color:" + s.color + '">' + s.icono + " " + esc(s.nombre) + '</span><span class="conf">Confianza ' + (c.nivel === "alta" ? "alta" : "media · verifica") + "</span></div><h3>" + esc(c.titulo) + "</h3><p>" + esc(c.resumen) + '</p><div class="parati"><b>Qué significa para ti:</b> ' + esc(c.paraTi) + '</div><div class="fuentes-l">' + c.fuentes.map(function (f) { return '<a href="' + safeUrl(f.u) + '" target="_blank" rel="noopener noreferrer">↗ ' + esc(f.n) + "</a>"; }).join("") + "</div></article>";
    });
    var r = radar();
    html += '<article class="glass radar rev"><h3>📡 Radar de temas</h3><p class="nota" style="margin:0 0 8px">Palabras más repetidas en las notas indexadas (se recalcula en cada actualización).</p>' + (r.length ? r.map(function (x) { return '<div class="rb"><span>' + esc(x.t) + '</span><span class="b"><i data-w="' + Math.round(x.n / r[0].n * 100) + '"></i></span><b>' + x.n + "</b></div>"; }).join("") : '<p class="nota">Aún no hay suficientes notas.</p>') + "</article>";
    var rec = ITEMS.filter(function (i) { return Date.now() - Date.parse(i.fecha) < 48 * 3600e3; }).length, indep = ITEMS.filter(function (i) { return i.tipo === "independiente"; }).length;
    html += '<article class="glass pulso rev"><h3>🫀 Pulso de la información</h3><p class="nota" style="margin:0">Cobertura por sector en las notas indexadas.</p><div class="pp">' + ORDEN.slice(1).map(function (id) { var s = SECT[id]; return "<div>" + s.icono + " " + esc(s.nombre) + "<b>" + porSector(id).length + "</b></div>"; }).join("") + '</div><p class="nota">' + rec + " nota(s) de las últimas 48 h · " + indep + " de medios independientes/ONG." + (NOT.modo === "semilla" ? " <b>Modo semilla:</b> la primera actualización automática ampliará esta lista." : "") + "</p></article>";
    b.innerHTML = html;
    setTimeout(function () { $$(".radar i").forEach(function (i) { i.style.width = i.getAttribute("data-w") + "%"; }); }, 400);
  }

  /* ───── Ruta + misiones ───── */
  var RUTA_D = "M60 500 C250 540 330 390 220 330 S60 270 180 200 S420 110 520 210 S650 340 750 250 S890 110 945 60";
  var pos = [];
  function rutaUI() {
    var svg = $("#ruta-svg"), n = ORDEN.length;
    svg.innerHTML = '<defs><linearGradient id="gruta" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#F5B83D"/><stop offset="1" stop-color="#E11D2E"/></linearGradient></defs>' +
      '<path d="M700 130l95-130 70 90 40-50 75 120z" fill="rgba(255,255,255,.05)"/><path class="camino" id="rc" d="' + RUTA_D + '"/><path class="avance" id="ra" d="' + RUTA_D + '"/><g id="rn"></g>';
    var p = $("#rc"), L = p.getTotalLength(); pos = [];
    for (var i = 0; i < n; i++) { var pt = p.getPointAtLength(L * i / (n - 1)); pos.push(pt); }
    var ra = $("#ra"); ra.style.strokeDasharray = L; ra.style.strokeDashoffset = L;
    var g = $("#rn"), h = "";
    ORDEN.forEach(function (id, i) {
      var s = SECT[id], hecho = !!S.hechas[id], disp = !hecho && (i === 0 || !!S.hechas[ORDEN[i - 1]]);
      h += '<g class="nodo ' + (hecho ? "hecho" : disp ? "disp" : "bloq") + '" data-id="' + id + '" tabindex="0" role="button" aria-label="Estación ' + (i + 1) + ": " + esc(s.nombre) + (hecho ? " (completada)" : disp ? "" : " (bloqueada)") + '"><circle class="base" cx="' + pos[i].x.toFixed(0) + '" cy="' + pos[i].y.toFixed(0) + '" r="38"/><text class="ic" x="' + pos[i].x.toFixed(0) + '" y="' + pos[i].y.toFixed(0) + '">' + (hecho ? "✅" : disp ? s.icono : "🔒") + '</text><text class="lb" x="' + pos[i].x.toFixed(0) + '" y="' + (pos[i].y + 62).toFixed(0) + '">' + (i + 1) + ". " + esc(s.nombre) + "</text></g>";
    });
    g.innerHTML = h;
    var ult = -1; ORDEN.forEach(function (id, i) { if (S.hechas[id]) ult = i; });
    var frac = ult < 0 ? 0 : Math.min(1, (ult + (ult < n - 1 ? 0.5 : 0)) / (n - 1));
    setTimeout(function () { ra.style.strokeDashoffset = L * (1 - frac); }, 300);
    $$(".nodo", svg).forEach(function (nd) {
      function go() { if (!nd.classList.contains("bloq")) abrirMision(nd.getAttribute("data-id")); else toast("Completa la estación anterior para desbloquear esta."); }
      nd.addEventListener("click", go); nd.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    });
    xpUI();
  }
  function xpUI() {
    var i = nivelDe(S.xp), nv = NIVELES[i], sig = NIVELES[i + 1];
    $("#medalla").textContent = nv.ic; $("#nivel-n").textContent = nv.n; $("#nivel-d").textContent = nv.d;
    var pct = sig ? (S.xp - nv.min) / (sig.min - nv.min) * 100 : 100;
    $("#xp-b").style.width = Math.min(100, pct) + "%";
    $("#xp-t").textContent = sig ? (S.xp + " / " + sig.min + " XP para " + sig.n) : (S.xp + " XP · nivel máximo alcanzado");
    $("#racha").textContent = racha() + (racha() === 1 ? " día" : " días");
    $("#xpnivel").textContent = nv.ic + " " + nv.n; $("#xpnum").textContent = S.xp + " XP"; $("#xpmini").style.width = Math.min(100, pct) + "%";
    var ins = [["brujula", "Primer paso"], ["politica", "Cívico"], ["economia", "Economista"], ["salud", "Guardián de la salud"], ["tecnologia", "Ciberescudo"], ["deporte", "Hincha informado"], ["investigacion", "Sabueso"], ["coyuntura", "Analista"], ["mundo", "Ciudadano del mundo"]];
    var todos = ORDEN.every(function (id) { return S.hechas[id]; }), nt = Object.keys(S.terminos).length;
    $("#insignias").innerHTML = ins.map(function (x) { return '<span class="ins ' + (S.hechas[x[0]] ? "on" : "") + '">' + (S.hechas[x[0]] ? "🏅 " : "🔒 ") + x[1] + "</span>"; }).join("") +
      '<span class="ins ' + (nt >= 20 ? "on" : "") + '">' + (nt >= 20 ? "🏅" : "📖") + " Lexicógrafo (" + Math.min(nt, 20) + "/20 términos)</span>" +
      '<span class="ins ' + (todos ? "on" : "") + '">' + (todos ? "🏔️ Cumbre alcanzada" : "🔒 Cumbre") + "</span>";
  }
  function ganar(x) { var antes = nivelDe(S.xp); S.xp += x; guardar(); xpUI(); if (nivelDe(S.xp) > antes) { toast("🎉 ¡Subiste a " + NIVELES[nivelDe(S.xp)].n + "!"); confeti(); } }
  function toast(t) {
    var d = document.createElement("div"); d.textContent = t;
    d.style.cssText = "position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:400;background:#10172a;border:1px solid var(--oro);color:#fff;padding:12px 18px;border-radius:14px;box-shadow:0 14px 50px rgba(0,0,0,.6);font-weight:700;max-width:90vw;text-align:center";
    document.body.appendChild(d); setTimeout(function () { d.style.transition = "opacity .5s"; d.style.opacity = 0; setTimeout(function () { d.remove(); }, 600); }, 2600);
  }
  function confeti() {
    if (reduce) return; var c = $("#confeti"), col = ["#F5B83D", "#E11D2E", "#35E0D2", "#7C5CFF", "#fff"];
    for (var i = 0; i < 90; i++) { var p = document.createElement("i"); p.style.left = Math.random() * 100 + "vw"; p.style.background = col[i % col.length]; p.style.animationDuration = 2 + Math.random() * 2 + "s"; p.style.animationDelay = Math.random() * .5 + "s"; p.style.borderRadius = Math.random() > .5 ? "50%" : "2px"; c.appendChild(p); }
    setTimeout(function () { c.innerHTML = ""; }, 4800);
  }

  var M = null;
  function abrirMision(id) { M = { id: id, paso: 0, q: 0, ac: 0, resp: false }; pintarMision(); $("#modal").classList.add("on"); document.body.style.overflow = "hidden"; }
  function cerrarModal() { $("#modal").classList.remove("on"); document.body.style.overflow = ""; M = null; }
  function pintarMision() {
    var s = SECT[M.id], m = s.mision, c = $("#m-caja"), h = '<button class="x" aria-label="Cerrar" data-x="1">✕</button>';
    if (M.paso === 0) {
      var nt = porSector(M.id).slice(0, 2);
      h += '<div class="paso">Estación ' + (ORDEN.indexOf(M.id) + 1) + " de " + ORDEN.length + " · Briefing</div><h3 id=\"m-t\">" + s.icono + " " + esc(m.titulo) + '</h3><p style="color:var(--tx2)">' + esc(s.lema) + '</p><ul class="esc">' + s.esencial.map(function (e) { return "<li>" + gl(e) + "</li>"; }).join("") + "</ul>" +
        (nt.length ? '<p class="nota">Para ir más profundo:</p><div class="fuentes-l">' + nt.map(function (n) { return '<a href="' + safeUrl(n.url) + '" target="_blank" rel="noopener noreferrer">↗ ' + esc(n.titulo.slice(0, 70)) + "…</a>"; }).join("") + "</div>" : "") +
        '<p style="margin-top:20px"><button class="cta" data-a="quiz">Listo, a la misión →</button></p>';
    } else if (M.paso === 1) {
      var q = m.preguntas[M.q];
      h += '<div class="paso">Misión · pregunta ' + (M.q + 1) + " de " + m.preguntas.length + '</div><h3 id="m-t">' + esc(q.q) + "</h3>" + q.o.map(function (o, i) { return '<button class="opt" data-o="' + i + '">' + esc(o) + "</button>"; }).join("") + '<div id="porque"></div>';
    } else {
      var ok = M.ac >= 2, ya = !!S.hechas[M.id], xp = 50 + 10 * M.ac, i = ORDEN.indexOf(M.id), sig = ORDEN[i + 1];
      h += '<div class="resultado"><div class="big">' + (ok ? "🏆" : "🌧️") + '</div><h3 id="m-t">' + (ok ? "¡Estación superada!" : "Casi lo logras") + "</h3><p style=\"color:var(--tx2)\">Acertaste <b style=\"color:#fff\">" + M.ac + " de " + m.preguntas.length + "</b>. " + (ok ? (ya ? "Ya habías completado esta estación (sin XP extra)." : "Ganaste <b style=\"color:var(--oro)\">+" + xp + " XP</b>.") : "Necesitas al menos 2 aciertos. Repasa el briefing e inténtalo otra vez.") + '</p><p style="margin-top:18px">' +
        (ok ? (sig ? '<button class="cta" data-a="sig" data-s="' + sig + '">Ir a la siguiente estación →</button> ' : '<button class="cta" data-a="fin">🏔️ Ver mi cumbre</button> ') : '<button class="cta" data-a="repasar">Repasar briefing</button> <button class="cta ghost" data-a="reintentar">Reintentar</button> ') +
        (M.id !== "brujula" ? '<button class="cta ghost" data-a="sector" data-s="' + M.id + '">Ver notas de ' + esc(s.nombre) + "</button>" : "") + "</p></div>";
    }
    c.innerHTML = h;
  }
  function responder(i) {
    if (M.resp) return; M.resp = true; var m = SECT[M.id].mision, q = m.preguntas[M.q];
    $$(".opt").forEach(function (b, k) { b.disabled = true; if (k === q.c) b.classList.add("ok"); else if (k === i) b.classList.add("mal"); });
    if (i === q.c) M.ac++;
    $("#porque").innerHTML = '<div class="porque">' + (i === q.c ? "✅ ¡Correcto! " : "❌ No exactamente. ") + esc(q.p) + '</div><p style="margin-top:14px"><button class="cta" data-a="next">' + (M.q + 1 < m.preguntas.length ? "Siguiente pregunta →" : "Ver resultado →") + "</button></p>";
  }
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (t.closest && t.closest("[data-gl]")) { mostrarPop(t.closest("[data-gl]")); return; }
    if (!(t.closest && t.closest("#pop"))) $("#pop").classList.remove("on");
    if (t.id === "modal" || (t.getAttribute && t.getAttribute("data-x"))) { cerrarModal(); return; }
    if (t.getAttribute && t.getAttribute("data-o") != null) { responder(+t.getAttribute("data-o")); return; }
    var a = t.getAttribute && t.getAttribute("data-a"); if (!a || !M) return;
    var m = SECT[M.id].mision;
    if (a === "quiz") { M.paso = 1; M.q = 0; M.ac = 0; M.resp = false; pintarMision(); }
    else if (a === "next") { M.resp = false; if (M.q + 1 < m.preguntas.length) { M.q++; } else { M.paso = 2; var ok = M.ac >= 2; if (ok && !S.hechas[M.id]) { S.hechas[M.id] = { ac: M.ac, f: hoy() }; ganar(50 + 10 * M.ac); confeti(); rutaUI(); } } pintarMision(); }
    else if (a === "repasar") { M.paso = 0; pintarMision(); }
    else if (a === "reintentar") { M.paso = 1; M.q = 0; M.ac = 0; M.resp = false; pintarMision(); }
    else if (a === "sig") { var s = t.getAttribute("data-s"); cerrarModal(); abrirMision(s); }
    else if (a === "sector") { var sid = t.getAttribute("data-s"); cerrarModal(); sectorTab(sid); location.hash = "#sectores"; }
    else if (a === "fin") { cerrarModal(); location.hash = "#ruta"; toast("🏔️ ¡Llegaste a la cumbre! Eres un ciudadano informado."); confeti(); }
  });
  addEventListener("keydown", function (e) { if (e.key === "Escape") { cerrarModal(); $("#pop").classList.remove("on"); } });

  /* ───── sectores ───── */
  var secActual = "politica", visibles = 12;
  function tarjeta(it) {
    var s = SECT[it.sector] || SECT.coyuntura, rel = it.fecha ? relativo(it.fecha) : null;
    var img = it.imagen ? '<img loading="lazy" referrerpolicy="no-referrer" alt="" src="' + safeUrl(it.imagen) + '">' : arteSector(it.sector, s.color);
    return '<a class="glass ncard rev in" href="' + safeUrl(it.url) + '" target="_blank" rel="noopener noreferrer"><div class="img" data-s="' + esc(it.sector) + '">' + img + '</div><div class="body"><h4>' + esc(it.titulo) + "</h4>" + (it.resumen ? "<p>" + esc(it.resumen.slice(0, 190)) + (it.resumen.length > 190 ? "…" : "") + "</p>" : "") + '<div class="meta"><span class="tipo ' + esc(it.tipo || "comercial") + '">' + esc(it.tipo || "comercial") + "</span><span>" + esc(it.fuente) + "</span><span>· " + esc(rel || it.nota || "fecha no confirmada") + "</span></div></div></a>";
  }
  function sectorTab(id) {
    secActual = id; visibles = 12;
    $$("#tabs .tab").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-s") === id); b.setAttribute("aria-selected", b.getAttribute("data-s") === id); });
    var s = SECT[id], its = porSector(id);
    var chips = (s.terminos || []).filter(function (t) { return GLOS[t]; }).map(function (t) { return '<button class="chip" type="button" data-gl="' + t + '">' + esc(GLOS[t].t) + "</button>"; }).join("");
    var ins = ED.insights.filter(function (x) { return x.sector === id; })[0];
    $("#sector-panel").innerHTML = '<div class="sector-head"><div class="sector-art">' + arteSector(id, s.color) + '</div><div class="glass sector-txt"><h3>' + s.icono + " " + esc(s.nombre) + '</h3><p class="lema">' + esc(s.lema) + '</p><ul class="esc-list">' + s.esencial.map(function (e) { return "<li>" + gl(e) + "</li>"; }).join("") + '</ul><div class="termchips">' + chips + "</div></div></div>" +
      (ins ? '<div class="glass cardi" style="margin-bottom:22px"><div class="cab"><span class="pill" style="color:' + s.color + ";border-color:" + s.color + '">Insight</span><span class="conf">Confianza ' + (ins.nivel === "alta" ? "alta" : "media · verifica") + "</span></div><h3>" + esc(ins.titulo) + '</h3><div class="parati"><b>Qué significa para ti:</b> ' + esc(ins.paraTi) + "</div></div>" : "") +
      '<div class="news-grid" id="ng">' + (its.length ? its.slice(0, visibles).map(tarjeta).join("") : '<div class="glass vacio" style="grid-column:1/-1">Aún no hay notas en este sector. La próxima actualización automática (08:00 / 23:00) las incorporará.</div>') + "</div>" +
      (its.length > visibles ? '<p style="text-align:center;margin-top:20px"><button class="cta ghost" id="mas">Ver más notas (' + (its.length - visibles) + ")</button></p>" : "");
    var mas = $("#mas"); if (mas) mas.onclick = function () { visibles += 12; sectorTab(secActual); };
    $$("#sector-panel .ncard .img img").forEach(function (im) { im.onerror = function () { var d = im.parentNode; d.innerHTML = arteSector(d.getAttribute("data-s"), (SECT[d.getAttribute("data-s")] || SECT.coyuntura).color); }; });
  }
  function tabs() {
    $("#tabs").innerHTML = ED.sectores.map(function (s) { return '<button class="tab" role="tab" data-s="' + s.id + '" style="--c:' + s.color + '">' + s.icono + " " + esc(s.nombre) + " <small>" + porSector(s.id).length + "</small></button>"; }).join("");
    $$("#tabs .tab").forEach(function (b) { b.onclick = function () { sectorTab(b.getAttribute("data-s")); }; });
    sectorTab("politica");
  }

  /* ───── glosario ───── */
  var glSec = "todos";
  function glosario() {
    var tb = [{ id: "todos", nombre: "Todos", color: "#F5B83D" }].concat(ED.sectores);
    $("#gl-tabs").innerHTML = tb.map(function (s) { return '<button class="tab' + (s.id === glSec ? " on" : "") + '" data-s="' + s.id + '" style="--c:' + s.color + '">' + esc(s.nombre) + "</button>"; }).join("");
    $$("#gl-tabs .tab").forEach(function (b) { b.onclick = function () { glSec = b.getAttribute("data-s"); glosario(); }; });
    var q = norm($("#gl-q").value || "");
    var l = ED.glosario.filter(function (g) { return (glSec === "todos" || g.s === glSec) && (!q || norm(g.t + " " + g.d).indexOf(q) >= 0); }).sort(function (a, b) { return a.t.localeCompare(b.t, "es"); });
    $("#gl-grid").innerHTML = l.length ? l.map(function (g) { var s = SECT[g.s] || SECT.coyuntura; return '<button class="glass gterm' + (S.terminos[g.id] ? " visto" : "") + '" data-t="' + g.id + '"><h4>' + esc(g.t) + '<span class="sx" style="color:' + s.color + '">' + s.icono + " " + esc(s.nombre) + "</span></h4><p>" + esc(g.d) + "</p></button>"; }).join("") : '<div class="glass vacio" style="grid-column:1/-1">Sin resultados. Prueba con otra palabra.</div>';
    $$("#gl-grid .gterm").forEach(function (b) { b.onclick = function () { marcar(b.getAttribute("data-t")); b.classList.add("visto"); }; });
  }
  function marcar(id) { if (!S.terminos[id]) { S.terminos[id] = 1; var n = Object.keys(S.terminos).length; guardar(); if (n <= 20) ganar(1); else xpUI(); if (n === 20) toast("🏅 Insignia: Lexicógrafo"); } }
  function mostrarPop(el) {
    var g = GLOS[el.getAttribute("data-gl")]; if (!g) return;
    var p = $("#pop"); p.innerHTML = "<b>" + esc(g.t) + "</b>" + esc(g.d); p.classList.add("on");
    var r = el.getBoundingClientRect(), w = Math.min(320, innerWidth - 20);
    p.style.maxWidth = w + "px"; p.style.left = Math.max(10, Math.min(innerWidth - w - 10, r.left)) + "px";
    var top = r.bottom + 8; if (top + p.offsetHeight > innerHeight - 10) top = Math.max(10, r.top - p.offsetHeight - 8); p.style.top = top + "px";
    marcar(g.id); $$('.gterm[data-t="' + g.id + '"]').forEach(function (b) { b.classList.add("visto"); });
  }

  /* ───── fuentes ───── */
  function fuentes() {
    $("#check").innerHTML = [["1 · ¿Quién lo dice?", "Identifica al medio y al autor. ¿Es noticia, análisis u opinión?"], ["2 · ¿Con qué evidencia?", "Busca documentos, datos y declaraciones verificables."], ["3 · ¿De cuándo es?", "Una cifra vieja puede parecer actual. Revisa la fecha de corte."], ["4 · ¿Quién más lo confirma?", "Contrasta con una fuente distinta, idealmente primaria u oficial."]].map(function (c) { return '<div class="glass"><b>' + c[0] + "</b>" + c[1] + "</div>"; }).join("");
    $("#f-grid").innerHTML = ED.fuentes.map(function (f) { return '<a class="glass fcard" href="' + safeUrl(f.u) + '" target="_blank" rel="noopener noreferrer"><h4>' + esc(f.n) + "<span>↗</span></h4><small>" + esc(f.tipo) + "</small><p>" + esc(f.foco) + "</p></a>"; }).join("");
  }

  /* ───── scroll: reveal + nav ───── */
  function observar() {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) e.target.classList.add("in"); }); }, { threshold: .08 });
    $$(".rev").forEach(function (n) { io.observe(n); });
    var links = {}; $$("#menu a").forEach(function (a) { links[a.getAttribute("href").slice(1)] = a; });
    var so = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting && links[e.target.id]) { Object.keys(links).forEach(function (k) { links[k].classList.remove("on"); }); links[e.target.id].classList.add("on"); } }); }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(links).forEach(function (id) { var s = document.getElementById(id); if (s) so.observe(s); });
  }

  /* ───── init ───── */
  heroArte(); parallax(); red(); cabecera(); insight(); rutaUI(); tabs(); glosario(); fuentes();
  $("#gl-q").addEventListener("input", glosario);
  $("#xpchip").addEventListener("click", function () { location.hash = "#ruta"; });
  observar();
})();
