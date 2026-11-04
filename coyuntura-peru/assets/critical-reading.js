/* Perú en Claro · lectura crítica editorial original y filtro de relevancia.
   Reglas transparentes sobre títulos y extractos, sin simular haber leído artículos completos. */
(function (global) {
  "use strict";
  function normal(t) { return String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  var descartar = /\b(horoscopos?|horoscopo|zodiaco|zodiacal(?:es)?|signos? zodiacales?|carta astral|astrologia|tarot|numerologia|predicciones? astrales?|compatibilidad amorosa segun tu signo|lectura de cartas)\b/i;
  function excluir(s) {
    var t = normal((s && s.titulo) || "");
    return descartar.test(t);
  }
  /* La clasificación editorial NO sustituye una investigación ni presume hechos no publicados. */
  var reglas = [
    [/cien dias.*keiko fujimori|que dejaron los cien dias de gobierno/i,
      "Una gira regional no es una política de descentralización. El balance del poder no está en la cantidad de visitas, sino en lo que cambia después de que se apagan las cámaras.",
      "Para las regiones importan los proyectos destrabados, la prevención ejecutada, el dinero efectivamente gastado y los servicios que mejoraron; una promesa reiterada no es un resultado.",
      "¿Qué compromisos tienen presupuesto, responsables, cronograma y evidencia de avance por región? Sin esa trazabilidad, los cien días son relato, no balance."],
    [/megacarcel|megapenal|nuevos penales|carceles.*bukele|construccion.*penal/i,
      "Anunciar cárceles de gran escala puede generar titulares antes de resolver el problema: la seguridad no se mide en capacidad proyectada.",
      "Hay que examinar costos de construcción y operación, plazos, personal penitenciario, situación jurídica de internos y efectos sobre la reincidencia.",
      "¿Existe un expediente financiado y una estimación de impacto comprobable, o solo una propuesta de infraestructura?"],
    [/corrupcion|colusion|cohecho|fiscalia|judicial|juicio oral|investigan.*(alcalde|policia|fiscal)|contraloria|destituye/i,
      "Una denuncia o la apertura de un proceso no equivale a una condena. Pero tampoco basta un desmentido para dar por esclarecido un caso de interés público.",
      "El foco está en los documentos, la competencia de cada autoridad, los actos imputados y la evidencia que efectivamente se sostenga en el expediente.",
      "¿Qué resolución o informe primario respalda la noticia, en qué etapa está el procedimiento y qué hechos siguen sin acreditarse?"],
    [/extorsion|sicariato|crimen organizado|delincuencia|inseguridad|homicidios|comando unificado|estado de emergencia/i,
      "La política de seguridad se presta a grandes gestos y resultados difíciles de auditar. Una operación anunciada no demuestra por sí sola que disminuya el delito.",
      "Lo relevante son tasas comparables de denuncias y victimización, esclarecimiento, condenas, cobertura territorial y continuidad de la intervención.",
      "¿Qué indicador mejoró, respecto de qué periodo y con qué fuente? ¿El cambio se sostiene fuera del día del operativo?"],
    [/congreso|senado|diputados|delegacion de facultades|ley|reforma|censura|bancada/i,
      "Una ley aprobada y una política efectiva son cosas distintas. El trámite parlamentario puede cerrar un debate político sin resolver el problema social que lo originó.",
      "La lectura exige conocer el texto final, a quién alcanza, su financiamiento, los plazos y los mecanismos para exigir cumplimiento.",
      "¿Qué cambia concretamente para el ciudadano y quién responde si la norma no se implementa?"],
    [/elecciones|electoral|votacion|encuesta|candidato|campana presidencial|gobernador|presidenta|presidente|primer ministro/i,
      "La disputa política necesita algo más que declaraciones, popularidad o escenificación de autoridad: necesita resultados contrastables.",
      "Conviene separar propuesta, decisión formal y efecto observado. Las encuestas miden opiniones en una muestra; no certifican desempeño gubernamental.",
      "¿Qué hechos documentados sostienen la afirmación central y qué información falta para evaluar al protagonista con el mismo criterio que a sus adversarios?"],
    [/fenomeno el nino|el nino|senamhi|enfen|lluvias|huaicos|inundac|llovizna|temperatura.*(?:c|°)|calor extremo/i,
      "Un pronóstico no es una certeza y una alerta no sustituye la prevención. Lo serio es distinguir el riesgo anunciado del daño observado.",
      "Importan el ámbito geográfico, la ventana temporal, la intensidad prevista, las actualizaciones oficiales y las medidas verificables antes de la emergencia.",
      "¿Qué dice el último aviso de SENAMHI o ENFEN y qué obras de mitigación están realmente operativas en la zona afectada?"],
    [/contrato|licitacion|obra paralizada|infraestructura|inversion publica|proyecto trecca|torre trecca|inician obras|construccion/i,
      "Una primera piedra no equivale a una obra terminada. El verdadero compromiso público empieza cuando el proyecto puede seguirse en el presupuesto y el calendario.",
      "Hay que distinguir anuncio, contrato, inicio físico, porcentaje de avance, ampliaciones de plazo y entrega efectiva.",
      "¿Dónde están el expediente, el contrato, las valorizaciones y la fecha de puesta en servicio?"],
    [/inflacion|alza.*precio|precio.*combustible|gasolina|glp|canasta|costo de vida|tipo de cambio|dolar/i,
      "El dato económico aislado produce alarma o triunfalismo según convenga al narrador. Lo que pesa es su variación real y su efecto sobre el poder de compra.",
      "Se debe comparar la misma unidad, ciudad, periodo y fuente; un precio puntual no representa por sí solo al mercado ni a todos los hogares.",
      "¿Cuál es la serie comparable, qué explica la variación y quiénes absorben el costo?"],
    [/cts|gratificacion|pension 65|remuneracion|sueldo|salario|trabajadores|laboral|empleo/i,
      "El anuncio de un beneficio no garantiza que cada trabajador o beneficiario pueda cobrarlo. La letra pequeña determina quién entra y quién queda fuera.",
      "Importan la base legal vigente, cobertura, calendario efectivo, fuente de financiamiento y diferencia entre propuesta y pago materializado.",
      "¿A quién aplica, desde qué fecha, con qué respaldo normativo y dónde puede verificarse el desembolso?"],
    [/pbi|exportacion|mineria|produccion|inversion|recaudacion|economia peruana|financiamiento/i,
      "Una cifra de inversión o crecimiento no explica por sí sola quién gana, quién asume riesgos y cuánto de lo prometido llegará a ejecutarse.",
      "La escala, la base de comparación, el periodo y los impactos en empleo e ingresos son decisivos para juzgar la relevancia económica.",
      "¿Se trata de una proyección, un compromiso o una operación ya materializada, y dónde figura su fuente primaria?"],
    [/dengue|vacuna|vph|epidemi|contagios|cancer|anemia|brote/i,
      "En salud pública, un número alto sin denominador puede impresionar y desinformar. La gravedad debe evaluarse con población expuesta, periodo y evolución.",
      "La utilidad ciudadana está en distinguir datos confirmados, estimaciones, disponibilidad de prevención y acceso real a servicios.",
      "¿Cuál es la fuente epidemiológica oficial, qué grupo está afectado y qué recomendación respaldan las autoridades sanitarias?"],
    [/hospital|essalud|inen|pacientes|atencion medica|emergencia sanitaria/i,
      "La promesa de mejor atención choca con una prueba elemental: lo que encuentra el paciente cuando llega al establecimiento.",
      "Más anuncios de inversión no bastan si persisten tiempos de espera, falta de personal, abastecimiento y problemas de gestión.",
      "¿Hay indicadores de atención y supervisión pública para comprobar si el servicio mejoró?"],
    [/inteligencia artificial|\bia\b|openai|google.*ia|chatgpt|modelo de lenguaje|algoritmo|automatizacion/i,
      "La tecnología suele venderse como transformación antes de probar su utilidad. Lo decisivo no es el nombre del sistema sino el resultado medible y sus límites.",
      "Hay que exigir una tarea concreta, pruebas reproducibles, costos, calidad de datos y medidas de privacidad y supervisión humana.",
      "¿Qué problema resuelve, frente a qué línea de base y con qué evaluación independiente del proveedor?"],
    [/hackeo|ciberataque|malware|filtracion|robo.*datos|phishing|fraude digital|binance/i,
      "El relato de un incidente digital puede mezclar vulnerabilidades comprobadas, hipótesis y cifras preliminares. No es un detalle menor: de eso depende la respuesta.",
      "Distingue vector de ataque confirmado, sistemas afectados, personas expuestas, medidas de contención y alcance de la investigación.",
      "¿Qué parte está respaldada por un informe técnico y qué sigue bajo investigación?"],
    [/universitario|alianza lima|sporting cristal|liga 1|champions league|partido|futbol|tenis|voleibol|marcador|campeonato|copa/i,
      "El resultado deportivo importa más que la especulación previa, pero tampoco debe confundirse cobertura en directo con información ya confirmada.",
      "Alineaciones, sanciones, horarios y estadísticas pueden variar. Para evaluar rendimiento hay que comparar partidos, condiciones y fuentes equivalentes.",
      "¿Es una previa, un marcador final o una actualización en curso? ¿Qué documento oficial respalda la cifra?"],
    [/premios|restaurantes|gastronomia|cocina|50 best|festival|concierto|estreno|cine|actor|cantante|pelicula/i,
      "Una celebración cultural o un ranking no debe leerse como indicador automático de bienestar del sector. La promoción y el impacto medible son planos distintos.",
      "Interesa conocer criterios de selección, participantes, costos, alcance y beneficios que trasciendan la visibilidad mediática.",
      "¿Quién organiza o evalúa, con qué metodología y qué evidencia muestra un efecto más allá de la noticia?"],
    [/trump|estados unidos|senado.*ee|israel|gaza|iran|elecciones.*eeuu|congreso.*eeuu/i,
      "La política internacional se narra a menudo como una victoria total o una derrota terminal. Los efectos reales dependen de instituciones, plazos y decisiones posteriores.",
      "Para Perú conviene separar la disputa externa de sus eventuales efectos comerciales, migratorios y diplomáticos verificables.",
      "¿Qué ha cambiado formalmente y qué consecuencias para el país están demostradas, no solo pronosticadas?"]
  ];
  var respaldo = {
    politica: ["Las declaraciones de poder no son resultados. La noticia merece una evaluación por decisiones y efectos, no por protagonismo.", "El lector necesita saber quién tomó la decisión, con qué atribución y qué sector de la población será afectado.", "¿Qué documento primario confirma la medida y qué parte sigue siendo una promesa?"],
    economia: ["Una cifra económica sin contexto puede servir para cualquier discurso. Su sentido depende de la base de comparación y de su efecto real.", "Hay que identificar periodo, unidad, población afectada y diferencia entre estimación y resultado.", "¿Qué entidad produjo el dato y cuál es la serie comparable?"],
    salud: ["La salud exige algo más que una declaración institucional: cobertura, oportunidad de atención y resultados comprobables.", "El impacto cambia según región, grupo afectado y acceso al servicio.", "¿Qué evidencia sanitaria respalda el dato y qué acción concreta permite tomar?"],
    investigacion: ["Una revelación periodística puede abrir preguntas incómodas, pero la conclusión depende de documentos verificables.", "Hay que separar hallazgos del medio, respuestas de los implicados y determinaciones de autoridades competentes.", "¿Qué documento original está disponible y qué extremo falta por contrastar?"],
    tecnologia: ["La novedad tecnológica no es por sí misma una mejora. La prueba está en la utilidad, los riesgos y el costo de adopción.", "Vale examinar quién controla el sistema y cómo se miden sus efectos.", "¿Existe una demostración reproducible o solo afirmaciones de los interesados?"],
    ia: ["Una promesa de inteligencia artificial necesita pruebas antes que entusiasmo. Un piloto anunciado no equivale a una solución escalable.", "El valor real exige comparar desempeño, costo, riesgos y supervisión.", "¿Dónde está la medición de impacto y quién validó el resultado?"],
    deporte: ["La cobertura puede anticipar un desenlace que aún no existe. Importa distinguir pronóstico, partido en curso y acta final.", "Las estadísticas valen cuando tienen periodo, rival y criterio de cálculo explícitos.", "¿Qué información está confirmada por la organización deportiva?"],
    nino: ["El Niño no se juzga por una sola imagen ni una lluvia aislada. Importan el riesgo territorial y la preparación documentada.", "Es indispensable separar observaciones, pronósticos y alertas.", "¿Qué actualización oficial respalda la evaluación y qué medidas se ejecutaron?"],
    mundo: ["El titular internacional simplifica conflictos complejos. La primera tarea es distinguir decisión, reacción y consecuencia comprobable.", "Los efectos sobre Perú no deben suponerse sin datos.", "¿Qué cambió objetivamente y con qué fuente verificable?"],
    coyuntura: ["Un titular llamativo no basta para declarar una tendencia. Conviene separar el hecho narrado de la interpretación.", "Importan los antecedentes, los actores y las consecuencias comprobables.", "¿Qué información adicional permitiría juzgar esta historia sin depender del encuadre del medio?"]
  };
  function analizar(s) {
    var titulo = normal(s.titulo || "");
    var texto = normal((s.titulo || "") + " " + (s.resumen || ""));
    var match = null;
    for (var i = 0; i < reglas.length; i++) {
      if (reglas[i][0].test(titulo)) { match = reglas[i]; break; }
    }
    if (!match) {
      for (var j = 0; j < reglas.length; j++) {
        if (reglas[j][0].test(texto)) { match = reglas[j]; break; }
      }
    }
    var m = match ? match.slice(1) : (respaldo[s.sector] || respaldo.coyuntura);
    return {
      postura: m[0],
      alcance: m[1],
      pregunta: m[2],
      limitada: !String(s.resumen || "").trim(),
      genero: s.genero === "opinion" ? "Columna de opinión" : "Noticia del medio",
      metodo: "Lectura crítica original basada en el titular y el extracto disponible; no reproduce ni atribuye al medio una postura nueva."
    };
  }
  global.PE_LECTURA = { analizar: analizar, excluir: excluir };
})(window);
