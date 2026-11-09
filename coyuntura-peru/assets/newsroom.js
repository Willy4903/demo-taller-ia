/* PERÚ INFORMADO · clasificación editorial y fichas de noticias.
 * Solo utiliza campos publicados por las fuentes RSS; nunca inventa datos.
 */
(function (global) {
  "use strict";
  function normal(value) {
    return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  var ruido = /\b(?:horoscopos?|zodiaco|zodiacales?|astrologia|tarot|numerologia|carta astral|signos? zodiacales?|predicciones? astrales?)\b/i;
  var basura = /^\s*-\s*ojo.?publico|suscribete al newsletter|alertas de defensores en riesgo|reportar un caso|denuncia segura|los resistentes del peru|^\s*-\s*$/i;
  function excluir(item) { var t = normal(item.titulo); return ruido.test(t) || basura.test(t); }

  /* Cada tema tiene una expresión. La nota se asigna al tema con más coincidencias: el título pesa más que el extracto.
     Las expresiones evitan palabras ambiguas sueltas (por ejemplo «ley» en el título de una serie). */
  var DEPORTE = /\b(?:nba|lakers|sixers|champions league|espn|masters? 1000|atp|wta|medvedev|tenis|tenista|futbol|futbolista|jugador de futbol|arquero|club deportivo|tenerife|balompie|buse|liga 1|liga1|mundial de clubes|torneo clausura|partido(?:s)? de (?:futbol|tenis)|real madrid|barcelona|universitario vs|sport boys|sporting cristal|alianza lima|voley|voleibol|goleador|marcador|cienciano|seleccion peruana.*(?:futbol|partido)|deporte|deportivo|entrenador|bundesliga|mls|playoffs?|maraton|atletismo|lapadula|bicampeonato|campeon(?:ato)?|universitario|cd moquegua|inter miami|melgar|cienciano|goleada|entrenador|selecciones?|copa libertadores|sudamericana)\b/i;
  var temas = [
    ["salud", /\b(?:salud|hospital|vacuna|dengue|essalud|inen|enfermedad|pacientes?|minsa|epidemi\w*|contagios|tratamiento medico|clinica|vph|medicamentos|cancer|anemia|brote|varicela|atencion medica|infarto)\b/i],
    ["nino", /\b(?:senamhi|enfen|el nino|un nino sin norte|nino costero|lluvias?|inundaciones?|inundars?e|huaicos?|llovizna|pronostico meteorologico|alerta meteorologica|temperatura del mar|sismo|temblor|indeci|torrenteras?|quebradas?|clima en|temperatura maxima)\b/i],
    ["ia", /\b(?:inteligencia artificial|ia|chatgpt|openai|anthropic|gemini|deepseek|copilot|llm|modelos? de lenguaje|ia generativa)\b/i],
    ["politica", /\b(?:(?:ex)?president\w*|congreso|congresistas?|fujimorista|senado|senador\w*|diputad[oa]s?|ministr\w+|premier|gobierno|elecciones|electoral(?:es)?|politica|politico|partido|parlament\w*|gabinete|alcald\w+|regidor\w*|gobernador|junta nacional de justicia|jne|jee|onpe|poder judicial|fujimori|campana electoral|proyectos? de ley|ley (?:del?|que|n[o°º]|\d+)|leyes|reformas?|democrata|republicano|midterms?|votacion|votos?|votantes|embajador|canciller|bancada|trump|renovacion popular|juntos por el peru|fuerza popular|peru libre|accion popular)\b/i],
    ["seguridad", /\b(?:extorsion(?:es)?|extorsionad\w+|sicari\w+|crimen organizado|criminales?|delincuen\w+|inseguridad|asalto|robo|robados?|hurto|secuestro|homicidio|asesinat\w+|feminicidio|banda criminal|organizacion criminal|tren de aragua|penal(?:es)?|carcel\w*|policia|pnp|serenazgo|estado de emergencia|legitima defensa|balacera|atentado|narcotrafico|trafico ilicito|detenid[oa]s?|capturan?|prision|violacion(?:es)?|abuso sexual|condenas?|desaparece\w*|sin vida|inpe)\b/i],
    ["educacion", /\b(?:colegios?|escolar(?:es)?|docentes?|universidad(?:es)?|estudiantes?|alumnos?|examen|educacion|minedu|maestros?|profesores?|cumbre academicos)\b/i],
    ["tecnologia", /\b(?:ciberataque|ciberseguridad|malware|ransomware|hackeo|filtracion de datos|internet|telecomunicaciones|software|tecnologia|digital|satelite|celulares?|smartphone|startup|aplicacion|robot|nvidia|chips?|centros? de datos|tecnologicas?|semiconductores|apple|google|microsoft|tesla|baterias?)\b/i],
    ["cultura", /\b(?:gastronomia|restaurantes?|50 best|chef|cociner[oa]|pelicula|cine|series?|telenovela|capitulos?|episodios?|temporada|estreno|streaming|oscar|grammy|concierto|festival|musica|cantante|cancion|actor|actriz|museo|literatura|libro|teatro|cultura|psicoanalista|filosofo|farandula|rompe su silencio|cultural|fans|escenario|artista|app de citas|separacion de|nueva imagen|influencer|k-pop|pop|johnny depp|jack sparrow|godzilla|piratas del caribe|spider.man|laika|netflix|amazon prime|disney)\b/i],
    ["ambiente", /\b(?:mineria ilegal|tambopata|fauna|biodiversidad|deforestacion|bosques?|amazonia|antartida|kril|contaminacion|conservacion|medio ambiente|cambio climatico|pesca industrial|especies amenazadas)\b/i],
    ["economia", /\b(?:economia|inflacion|bcrp|pbi|finanzas|cts|gratificacion|pension 65|mef|sunat|empleo|salarios?|remuneracion(?:es)?|inversion|exportacion|importacion|combustibles?|glp|gasolina|petroleo|precios?|dolar|tipo de cambio|credito|bancos?|bancaria|bancos?|mineria|agroexportacion|agro|productividad|cultivos?|aranceles?|bolsa|mercados?|empresas?|ahorros?|crowdfunding|vivienda|depa|panetones|produccion|ventas|negocios?|multas?|indecopi)\b/i],
    ["investigacion", /\b(?:contraloria|corrupcion|cohecho|colusion|presunta irregularidad|investigacion fiscal|denuncia penal|denuncian|sobornos?|licitacion amanada|fiscalia|caso odebrecht|lavado de activos|reportaje|contratacion indebida)\b/i]
  ];
  var MIN_CUERPO = { nino: 1, ambiente: 1 };
  function coincidencias(re, texto) {
    var m = texto.match(new RegExp(re.source, "gi")) || [], vistos = {};
    m.forEach(function (x) { vistos[x] = 1; });
    return Object.keys(vistos).length;
  }
  function categoria(item) {
    var title = normal(item.titulo), cuerpo = normal(item.resumen).slice(0, 260);
    if (/\blas noticias d(?:el|e)\b/.test(title) && (item.tipo === "internacional" || item.sector === "mundo")) return "internacional";
    if (DEPORTE.test(title)) return "deporte";
    var mejor = null, max = 0;
    for (var i = 0; i < temas.length; i++) {
      var t = coincidencias(temas[i][1], title), c = Math.min(3, coincidencias(temas[i][1], cuerpo)), puntos = t * 5 + c;
      if (t === 0 && c < (MIN_CUERPO[temas[i][0]] || 2)) continue;
      if (puntos > max) { max = puntos; mejor = temas[i][0]; }
    }
    if (mejor) return mejor;
    if (DEPORTE.test(cuerpo) && coincidencias(DEPORTE, cuerpo) >= 2) return "deporte";
    if ((item.sector === "mundo" || item.tipo === "internacional") && !item.sectorOriginal) return "internacional";
    if (normal(item.fuente).includes("mongabay")) return "ambiente";
    return "sociedad";
  }
  var extranjero = /\b(?:real madrid|aek atenas|champions league|medvedev|masters? 1000|donald trump|trump|estados unidos|ee\.?\s?uu\.?|israel|gaza|iran|espana|alemania|francia|ucrania|rusia|china|japon|tennessee|tennesse|texas|netanyahu|tenerife|godzilla|johnny depp|jack sparrow|spider.man|cop17|antartida|paris jackson|hollywood|oscar|toronto|singapur|bolsonaro|brasil|georgia|estonia|suiza|republica dominicana|dominicana|mexico|venezuela|cuba|argentina|colombia)\b/i;
  var peruano = /\b(?:peru|lima|arequipa|piura|cusco|puno|trujillo|tacna|chiclayo|iquitos|junin|cajamarca|callao|ignacio buse|buse)\b/i;
  function ambito(item) {
    if (item.tipo === "internacional" || item.ambito === "mundo") return "mundo";
    var t=normal(item.titulo);
    if (peruano.test(t)) return "peru";
    if (extranjero.test(t)) return "mundo";
    return "peru";
  }
  var nombres = {
    politica:"Política",economia:"Economía",salud:"Salud",deporte:"Deportes",
    tecnologia:"Tecnología",ia:"Inteligencia artificial",nino:"Clima y desastres",
    investigacion:"Investigación",cultura:"Cultura",ambiente:"Ambiente",
    sociedad:"Sociedad",seguridad:"Seguridad",educacion:"Educación",internacional:"Internacional"
  };
  function extracto(item) {
    var t = String(item.resumen || "").replace(/\s+/g," ").trim();
    var title = String(item.titulo || "").trim();
    if (!t || normal(t) === normal(title) || (t.length < 100 && normal(title).indexOf(normal(t)) >= 0)) return "";
    t = t.replace(/\s*(?:The post|Leer más en|Lee también:|También te puede interesar:).*$/i, "").trim();
    return t.length > 220 ? t.slice(0,220).replace(/\s+\S*$/, "")+"…" : t;
  }
  function cifras(item) {
    // Keep the literal number and its complete unit: "millones" must never become "mil".
    var numero = "[+-]?\\b\\d+(?:[.,]\\d+)*";
    var escala = "(?:mil\\s+millones|millones|mill[oó]n|mil)\\b";
    var moneda = "(?:soles|d[oó]lares)\\b";
    var unidad = "(?:personas?|internos?|casos?|hogares?|fallecidos?|heridos?|contagios|vacunas?|soles|d[oó]lares)\\b";
    var re = new RegExp("(?:S/\\s*|US\\$\\s*|\\$\\s*)" + numero + "(?:\\s*" + escala + "(?:\\s+(?:de\\s+)?" + moneda + ")?|\\s+" + moneda + ")?|" + numero + "\\s*(?:%|°\\s*C\\b|km(?:/h)?\\b|" + escala + "(?:\\s+(?:de\\s+)?" + unidad + ")?|" + unidad + ")", "gi");
    var seen={},out=[];
    // Scan each source field separately; do not join a title's number to a summary's unit.
    [item.titulo,item.resumen].forEach(function(text){
      var items=String(text||"").match(re)||[];
      items.forEach(function(v){var key=normal(v).replace(/\s+/g," ").trim();if(!seen[key]&&out.length<3){seen[key]=1;out.push(v.trim());}});
    });
    return out;
  }
  global.PERU_NEWS={excluir:excluir,categoria:categoria,ambito:ambito,extracto:extracto,cifras:cifras,nombres:nombres};
})(window);
