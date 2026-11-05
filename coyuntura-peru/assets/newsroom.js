/* PERÚ INFORMADO · clasificación editorial y fichas de noticias.
 * Solo utiliza campos publicados por las fuentes RSS; nunca inventa datos.
 */
(function (global) {
  "use strict";
  function normal(value) {
    return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  var ruido = /\b(?:horoscopos?|zodiaco|zodiacales?|astrologia|tarot|numerologia|carta astral|signos? zodiacales?|predicciones? astrales?)\b/i;
  function excluir(item) { return ruido.test(normal(item.titulo)); }

  var temas = [
    ["deporte", /\b(?:champions league|espn|masters? 1000|atp|wta|medvedev|tenis|tenista|futbol|futbolista|jugador de futbol|arquero|club deportivo|tenerife|balompie|buse|liga 1|liga1|mundial de clubes|torneo clausura|partido(?:s)? de (?:futbol|tenis)|real madrid|barcelona|universitario vs|sport boys|sporting cristal|alianza lima|voley|voleibol|goleador|marcador|cienciano|seleccion peruana.*(?:futbol|partido)|deporte|deportivo|entrenador)\b/i],
    ["salud", /\b(?:hospital|vacuna|dengue|essalud|inen|enfermedad|pacientes?|salud publica|minsa|epidemi|contagios|tratamiento medico|clinica|vph|medicamentos)\b/i],
    ["nino", /\b(?:senamhi|enfen|el nino|nino costero|lluvias intensas|inundaciones?|huaicos?|llovizna|pronostico meteorologico|alerta meteorologica|temperatura del mar)\b/i],
    ["ia", /\b(?:inteligencia artificial|\bia\b|chatgpt|openai|anthropic|gemini|deepseek|copilot|llm|modelos? de lenguaje|ia generativa|algoritmos? de ia)\b/i],
    ["tecnologia", /\b(?:ciberataque|ciberseguridad|malware|ransomware|hackeo|filtracion de datos|internet|telecomunicaciones|software|recarga.*qr|tecnologia|digital|satelite|celular|smartphone|startup)\b/i],
    ["economia", /\b(?:economia|inflacion|bcrp|pbi|finanzas|cts|gratificacion|pension 65|mef|sunat|empleo|salarios?|remuneracion|inversion|exportacion|importacion|combustibles?|glp|gasolina|petroleo|precio(?:s)?|dolar|tipo de cambio|credito|bancos?|mineria|agroexportacion|aranceles?)\b/i],
    ["investigacion", /\b(?:contraloria|corrupcion|cohecho|colusion|presunta irregularidad|investigacion fiscal|denuncia|sobornos?|licitacion amañada|fiscalia|caso odebrecht|lavado de activos)\b/i],
    ["politica", /\b(?:president[ae]|congreso|senado|senador|diputad[oa]s?|ministro|premier|gobierno|elecciones|partido politico|parlament|gabinete|alcalde|gobernador|junta nacional de justicia|poder judicial|fujimori|campana electoral|ley|reforma|protesta|democrata|republicano|midterms|votacion|electoral)\b/i],
    ["cultura", /\b(?:gastronomia|restaurantes?|50 best|chef|cociner[oa]|pelicula|cine|series? de television|estreno|oscar|concierto|festival|musica|cantante|actor|actriz|museo|literatura|arte|cultura|johnny depp|jack sparrow|godzilla|piratas del caribe|spider.man|laika|netflix|amazon prime|disney)\b/i],
    ["ambiente", /\b(?:biodiversidad|deforestacion|bosques?|amazonia|antartida|kril|contaminacion|conservacion|medio ambiente|cambio climatico|pesca industrial|especies amenazadas)\b/i]
  ];
  function categoria(item) {
    var title = normal(item.titulo);
    for (var i = 0; i < temas.length; i++) {
      if (temas[i][1].test(title)) return temas[i][0];
    }
    if ((item.sector === "mundo" || item.tipo === "internacional") && !item.sectorOriginal) return "internacional";
    if (normal(item.fuente).includes("salud con lupa")) return "salud";
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
    tecnologia:"Tecnología",ia:"Inteligencia artificial",nino:"Clima y El Niño",
    investigacion:"Investigación",cultura:"Cultura",ambiente:"Ambiente",
    sociedad:"Sociedad",internacional:"Internacional"
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
