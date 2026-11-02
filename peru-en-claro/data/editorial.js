/* Contenido editorial de "Contexto Perú".
   Los datos con cifras llevan fuente enlazada y fecha de corte. Contrástalos siempre en la fuente primaria. */
window.EDITORIAL = {
  corte: "2026-11-02",

  hilo: {
    titulo: "Primer año de gobierno: poder fragmentado, economía más lenta y emergencias que no esperan",
    puntos: [
      { k: "Poder", t: "gobierno nuevo y Congreso bicameral nuevo, sin una mayoría clara: casi todo se negocia." },
      { k: "Bolsillo", t: "crecimiento recortado y precios por encima de la meta del BCRP, según proyecciones recientes." },
      { k: "Vida diaria", t: "El Niño y el dengue presionan los servicios de salud (sobre todo en el norte) y los ciberataques suben." },
      { k: "Mundo", t: "nuevos aranceles de EE. UU. a la región pueden afectar comercio, metales y tipo de cambio." }
    ]
  },

  /* Indicadores con fuente (cifras citadas por la prensa o por el organismo; verificar en la fuente primaria) */
  indicadores: [
    { k: "PBI 2026 · proyección BCRP", v: "3,2 %", n: "Recortada citando El Niño", f: "BCRP", u: "https://www.bcrp.gob.pe" },
    { k: "Inflación 2026 · proyección BCRP", v: "~4,2 %", n: "Meta 1 %-3 %; BCP proyecta 4,7 %", f: "Forbes Perú", u: "https://forbes.pe/economia-y-finanzas/2026-09-10/bcp-elevo-su-proyeccion-de-inflacion-de-42-a-47-para-cierre-de-ano/" },
    { k: "Tasa de referencia BCRP", v: "4,25 %", n: "Más de un año sin cambios", f: "Perú Retail", u: "https://www.peru-retail.com/bcrp-mantiene-la-tasa-de-referencia-en-425-por-mas-de-un-ano-que-factores-influyen-en-su-decision/" },
    { k: "Dengue · fallecidos 2026", v: "75", n: "Corte semana epidemiológica 40", f: "CDC-Minsa", u: "https://www.dge.gob.pe/portalnuevo/?p=4861" },
    { k: "Congreso bicameral", v: "60 + 130", n: "Senadores y diputados", f: "Diario Libre", u: "https://www.diariolibre.com/mundo/america-latina/2026/07/24/peru-establece-un-sistema-parlamentario-bicameral/3610006" }
  ],

  /* ───────────── SECTORES (cada uno es una estación de la Ruta) ───────────── */
  sectores: [
    {
      id: "politica", nombre: "Política", icono: "🏛️", color: "#E11D2E",
      lema: "Quién decide, con qué votos y qué te cambia.",
      esencial: [
        "El {{poder-ejecutivo|Poder Ejecutivo}} lo encabeza el presidente o presidenta, elegido por 5 años (periodo actual: 2026-2031). La reelección inmediata está prohibida.",
        "Desde julio de 2026 el Perú volvió a tener un {{bicameralidad|Congreso bicameral}}: Senado (60) y Cámara de Diputados (130). Un Congreso fragmentado obliga a negociar alianzas para aprobar leyes.",
        "El sistema electoral es un trío: {{onpe|ONPE}} organiza y cuenta, {{jne|JNE}} resuelve y proclama, {{reniec|RENIEC}} identifica a los votantes.",
        "La {{junta-nacional-de-justicia|JNJ}} nombra y sanciona a jueces y fiscales; el {{tribunal-constitucional|Tribunal Constitucional}} revisa si las leyes respetan la Constitución."
      ],
      terminos: ["vacancia","cuestion-de-confianza","interpelacion","censura","bicameralidad","jne","onpe","reniec","junta-nacional-de-justicia","tribunal-constitucional","defensoria","poder-ejecutivo"],
      mision: {
        titulo: "Estación Política: la Plaza de Armas del poder",
        preguntas: [
          { q: "¿Cuántos senadores tiene el Senado del Perú desde 2026?", o: ["30", "60", "130", "100"], c: 1, p: "El Senado tiene 60 miembros; la Cámara de Diputados, 130." },
          { q: "¿Qué organismo proclama oficialmente a los ganadores de una elección?", o: ["ONPE", "RENIEC", "JNE", "Contraloría"], c: 2, p: "La ONPE cuenta los votos, pero el JNE resuelve las controversias y proclama los resultados." },
          { q: "La censura es una sanción política que el Congreso puede aplicar a…", o: ["Un ministro", "Un juez", "Un alcalde", "Un fiscal"], c: 0, p: "El Congreso puede censurar a ministros; el ministro censurado debe renunciar." }
        ]
      }
    },
    {
      id: "economia", nombre: "Economía", icono: "📈", color: "#F5B83D",
      lema: "Precios, sueldos, crédito y crecimiento, sin jerga.",
      esencial: [
        "El {{pbi|PBI}} mide cuánto produce el país. Si crece menos, suele haber menos empleo y menos ingresos fiscales.",
        "La {{inflacion|inflación}} es la subida general de precios. El {{bcrp|BCRP}} tiene una meta de 1 % a 3 % anual y usa la {{tasa-de-referencia|tasa de referencia}} para influir en ella.",
        "El {{igv|IGV}} es 18 % (16 % de IGV + 2 % de IPM). La {{sunat|SUNAT}} recauda los impuestos; el {{mef|MEF}} arma y ejecuta el presupuesto.",
        "El {{el-nino-costero|Fenómeno El Niño}} golpea pesca, agro y transporte: por eso aparece en las proyecciones económicas."
      ],
      terminos: ["pbi","inflacion","tasa-de-referencia","bcrp","mef","sunat","igv","tipo-de-cambio","riesgo-pais","informalidad","canon-minero","deficit-fiscal","el-nino-costero","rmv"],
      mision: {
        titulo: "Estación Economía: el Mercado Central",
        preguntas: [
          { q: "¿Quién fija la tasa de interés de referencia en el Perú?", o: ["MEF", "SUNAT", "BCRP", "Congreso"], c: 2, p: "El Banco Central de Reserva (BCRP) es autónomo y decide la tasa de referencia." },
          { q: "¿Cuál es el rango meta de inflación del BCRP?", o: ["0 % a 1 %", "1 % a 3 %", "3 % a 6 %", "5 % a 8 %"], c: 1, p: "La meta es 2 % con una tolerancia de ±1 punto: es decir, de 1 % a 3 %." },
          { q: "El IGV total que pagas en una compra es de…", o: ["10 %", "16 %", "18 %", "21 %"], c: 2, p: "16 % de IGV más 2 % de Impuesto de Promoción Municipal = 18 %." }
        ]
      }
    },
    {
      id: "salud", nombre: "Salud", icono: "🩺", color: "#35E0D2",
      lema: "Qué está pasando con tu salud pública y cómo cuidarte.",
      esencial: [
        "Hay tres grandes sistemas: {{minsa|Minsa}} y {{diresa|DIRESA}} (servicios públicos), {{essalud|EsSalud}} (trabajadores formales) y el {{sis|SIS}} (seguro público para quienes no tienen otro).",
        "El {{dengue|dengue}} se transmite por el mosquito {{aedes|Aedes aegypti}}, que se cría en agua estancada dentro y alrededor de las casas.",
        "El CDC-Minsa publica la situación semanal por {{semana-epidemiologica|semana epidemiológica}} y emite {{alerta-epidemiologica|alertas epidemiológicas}} cuando hay riesgo.",
        "Ante fiebre alta, dolor intenso o malestar persistente, acude a un establecimiento de salud: no te automediques."
      ],
      terminos: ["minsa","diresa","essalud","sis","dengue","aedes","alerta-epidemiologica","semana-epidemiologica","anemia"],
      mision: {
        titulo: "Estación Salud: el Hospital de Campaña",
        preguntas: [
          { q: "¿Qué mosquito transmite el dengue?", o: ["Anopheles", "Aedes aegypti", "Culex", "Simulium"], c: 1, p: "El Aedes aegypti transmite dengue, zika y chikungunya." },
          { q: "¿Cuál es la mejor medida de prevención doméstica contra el dengue?", o: ["Tapar y eliminar recipientes con agua estancada", "Usar más perfume", "Cerrar ventanas todo el día", "Tomar vitaminas"], c: 0, p: "Sin agua estancada no hay criaderos: tapa, voltea o elimina recipientes." },
          { q: "Una semana epidemiológica agrupa…", o: ["3 días", "7 días", "15 días", "30 días"], c: 1, p: "Es un periodo estándar de 7 días para comparar la vigilancia de enfermedades." }
        ]
      }
    },
    {
      id: "tecnologia", nombre: "Tecnología", icono: "🛰️", color: "#7C5CFF",
      lema: "IA, ciberseguridad y datos: lo que ya te afecta.",
      esencial: [
        "El Perú tiene una ley que promueve el uso de la {{ia|inteligencia artificial}} (Ley 31814, de 2023), con principios de uso ético y seguro.",
        "Los ataques con {{ransomware|ransomware}} y {{phishing|phishing}} crecen; los más expuestos son banca, telecomunicaciones, salud, comercio y Estado, según estudios citados en prensa.",
        "Tus {{datos-personales|datos personales}} están protegidos por la Ley 29733 y la Autoridad Nacional de Protección de Datos Personales.",
        "Protégete: contraseñas únicas, verificación en dos pasos y desconfía de enlaces urgentes. Los {{deepfake|deepfakes}} también engañan: contrasta antes de compartir."
      ],
      terminos: ["ia","ciberseguridad","phishing","ransomware","datos-personales","deepfake","gobierno-digital"],
      mision: {
        titulo: "Estación Tecnología: la Torre de Señales",
        preguntas: [
          { q: "El phishing es…", o: ["Un virus que borra el disco", "Un engaño para robar tus datos o claves", "Un tipo de batería", "Un permiso del banco"], c: 1, p: "El phishing suplanta a empresas o personas para que entregues información." },
          { q: "La Ley peruana que promueve el uso de la IA es la…", o: ["Ley 29733", "Ley 31814", "Ley 30096", "Ley 27444"], c: 1, p: "La Ley 31814 (2023). La 29733 es la de protección de datos personales." },
          { q: "¿Qué ayuda más a evitar que te roben una cuenta?", o: ["Usar la misma clave en todo", "Verificación en dos pasos", "Compartir el código con soporte", "Ignorar las alertas"], c: 1, p: "La verificación en dos pasos añade una barrera aunque filtren tu contraseña." }
        ]
      }
    },
    {
      id: "ia", nombre: "Inteligencia artificial", icono: "🤖", color: "#E879F9", ambitos: true,
      lema: "Qué hace la IA, cómo se regula en el Perú y qué pasa en el mundo.",
      esencial: [
        "La {{ia-generativa|IA generativa}} crea texto, imágenes, audio y código. Funciona con {{llm|modelos de lenguaje}} entrenados con enormes volúmenes de datos y alimenta asistentes como ChatGPT, Claude o Gemini.",
        "En el Perú rigen la Ley 31814 (2023), su reglamento (Decreto Supremo 115-2025-PCM, setiembre de 2025) y la {{enia|Estrategia Nacional de IA 2026-2030}}. La {{sgtd|SGTD}} de la PCM es la autoridad técnico-normativa. El enfoque es de fomento, con principios de uso ético.",
        "En el mundo, la Unión Europea regula con el {{ai-act|AI Act}} según el nivel de riesgo y en 2026 acordó aplazar parte de sus plazos. Estados Unidos y China compiten por {{gpu|chips}}, modelos y {{centro-de-datos|centros de datos}}.",
        "Un modelo puede equivocarse con seguridad ({{alucinacion|alucinaciones}}) y repetir {{sesgo-algoritmico|sesgos}}. Verifica los datos importantes y desconfía de imágenes o audios sospechosos ({{deepfake|deepfakes}})."
      ],
      terminos: ["ia","ia-generativa","llm","agente-ia","alucinacion","sesgo-algoritmico","enia","sgtd","oficial-ia","ai-act","gpu","centro-de-datos","deepfake"],
      mision: {
        titulo: "Estación IA: el Laboratorio",
        preguntas: [
          { q: "Una alucinación de un modelo de IA es…", o: ["Una respuesta falsa presentada con apariencia convincente", "Un fallo del cargador del equipo", "Un permiso de la PCM", "Un tipo de chip"], c: 0, p: "Los modelos pueden inventar datos con tono seguro: verifica lo importante en fuentes confiables." },
          { q: "En el Perú, ¿qué entidad es la autoridad técnico-normativa de la IA?", o: ["La PCM, a través de la SGTD", "El BCRP", "El JNE", "El INEI"], c: 0, p: "La Ley 31814 designa a la PCM; la SGTD ejerce esa función." },
          { q: "El AI Act de la Unión Europea regula la IA principalmente según…", o: ["El nivel de riesgo del sistema", "El color de la interfaz", "El país del programador", "El precio del servicio"], c: 0, p: "Clasifica los sistemas por riesgo y exige más obligaciones a los de mayor riesgo." }
        ]
      }
    },
    {
      id: "deporte", nombre: "Deporte", icono: "⚽", color: "#22C55E",
      lema: "Resultados, tablas y por qué importan.",
      esencial: [
        "La {{liga-1|Liga 1}} se divide en {{apertura-clausura|Apertura y Clausura}}; además existe una {{tabla-acumulada|tabla acumulada}} que suma los puntos de ambos torneos.",
        "La {{fpf|FPF}} (Federación Peruana de Fútbol) gobierna el fútbol nacional y la Selección.",
        "Las {{eliminatorias|Eliminatorias}} sudamericanas definen quién va al Mundial; el rendimiento de la Selección suele marcar el humor deportivo del país.",
        "Revisa siempre la fecha de la tabla: cambia cada jornada."
      ],
      terminos: ["liga-1","apertura-clausura","tabla-acumulada","fpf","eliminatorias"],
      mision: {
        titulo: "Estación Deporte: el Estadio Nacional",
        preguntas: [
          { q: "La Liga 1 se organiza en…", o: ["Un solo torneo", "Apertura, Clausura y tabla acumulada", "Cuatro torneos cortos", "Solo playoffs"], c: 1, p: "Hay dos torneos (Apertura y Clausura) y una tabla acumulada." },
          { q: "¿Qué significan las siglas FPF?", o: ["Federación Peruana de Fútbol", "Fondo Público de Fútbol", "Federación de Plazas y Fútbol", "Frente Popular de Fútbol"], c: 0, p: "Es la entidad que organiza el fútbol peruano." },
          { q: "La tabla acumulada es…", o: ["La suma de puntos de Apertura y Clausura", "Solo los puntos del Clausura", "La tabla de goleadores", "La tabla de descenso del año pasado"], c: 0, p: "Suma los puntos de los dos torneos del año." }
        ]
      }
    },
    {
      id: "investigacion", nombre: "Investigación", icono: "🔎", color: "#F97316",
      lema: "Cómo se investiga el poder y cómo leer un caso sin caer en trampas.",
      esencial: [
        "La {{fiscalia|Fiscalía}} dirige la investigación del delito; el Poder Judicial decide. Una denuncia no es una condena: rige la {{presuncion-de-inocencia|presunción de inocencia}}.",
        "La {{prision-preventiva|prisión preventiva}}, el {{impedimento-de-salida|impedimento de salida}} o un {{allanamiento|allanamiento}} son medidas del proceso, no sentencias.",
        "La {{colaboracion-eficaz|colaboración eficaz}} es un acuerdo para aportar información a cambio de beneficios; debe ser corroborada.",
        "El periodismo de investigación en el Perú se sostiene en gran parte en medios sin fines de lucro; organizaciones como RSF y CPJ han documentado presiones contra periodistas."
      ],
      terminos: ["fiscalia","presuncion-de-inocencia","prision-preventiva","impedimento-de-salida","allanamiento","colaboracion-eficaz","reglaje","contraloria"],
      mision: {
        titulo: "Estación Investigación: la Sala de Redacción",
        preguntas: [
          { q: "La prisión preventiva es…", o: ["Una condena firme", "Una medida cautelar durante el proceso", "Un indulto", "Una multa"], c: 1, p: "No es una condena: asegura la presencia del investigado mientras dura el proceso." },
          { q: "¿Quién dirige la investigación de un delito?", o: ["El Ministerio Público (Fiscalía)", "La ONPE", "El BCRP", "La SUNAT"], c: 0, p: "El Ministerio Público conduce la investigación y, si corresponde, acusa." },
          { q: "La presunción de inocencia significa que…", o: ["Todos son culpables hasta probar lo contrario", "Nadie es culpable hasta que haya sentencia firme", "Solo aplica a políticos", "Solo aplica en juicios orales"], c: 1, p: "Es un derecho de todas las personas hasta sentencia firme." }
        ]
      }
    },
    {
      id: "coyuntura", nombre: "Coyuntura", icono: "🧭", color: "#38BDF8",
      lema: "Lo que se mueve hoy en el país y por qué importa.",
      esencial: [
        "El nuevo gobierno juró el 28 de julio de 2026 y priorizó seguridad ciudadana y medidas ante El Niño; además pidió {{facultades-legislativas|facultades legislativas}} al Congreso.",
        "Un {{congreso-fragmentado|Congreso fragmentado}} significa que ningún partido tiene mayoría propia: las leyes dependen de acuerdos.",
        "La {{cuestion-de-confianza|cuestión de confianza}} la plantea el Ejecutivo; si el Congreso la niega, el gabinete debe renunciar.",
        "Para entender un titular pregúntate: ¿quién gana?, ¿quién pierde?, ¿cuándo se aplica? y ¿qué dice la fuente primaria?"
      ],
      terminos: ["facultades-legislativas","congreso-fragmentado","decreto-de-urgencia","cuestion-de-confianza","vacancia","el-nino-costero"],
      mision: {
        titulo: "Estación Coyuntura: el Mirador",
        preguntas: [
          { q: "Las facultades legislativas son…", o: ["Poder del Congreso para delegar al Ejecutivo la emisión de decretos legislativos", "Una ley de la ONPE", "Un permiso del Tribunal Constitucional", "Un beneficio para congresistas"], c: 0, p: "El Congreso delega, por un plazo y materias concretas, la facultad de legislar." },
          { q: "Un Congreso fragmentado implica que…", o: ["Hay un partido con mayoría absoluta", "Ningún partido tiene mayoría y hay que negociar", "No hay Congreso", "Solo hay un senador"], c: 1, p: "Sin mayoría propia, las leyes requieren alianzas." },
          { q: "¿Quién plantea la cuestión de confianza?", o: ["El Ejecutivo (gabinete)", "El JNE", "La Contraloría", "La Defensoría"], c: 0, p: "La plantea el Ejecutivo para respaldar una política ante el Congreso." }
        ]
      }
    },
    {
      id: "mundo", nombre: "Mundo", icono: "🌎", color: "#06B6D4",
      lema: "Lo que pasa afuera y cómo llega al Perú.",
      esencial: [
        "El Perú es una economía abierta: exporta sobre todo minerales (cobre, oro), productos agrícolas y pesqueros, y su principal socio comercial es China.",
        "Un {{arancel|arancel}} es un impuesto a las importaciones. Si un país grande lo sube, cambian precios, rutas y empleo en otros países.",
        "Las decisiones de EE. UU., China y la región se sienten en el tipo de cambio, el precio de los metales y el comercio.",
        "Cruza información: compara cómo cuentan un mismo hecho medios de distintos países."
      ],
      terminos: ["arancel","tipo-de-cambio","riesgo-pais"],
      mision: {
        titulo: "Estación Mundo: el Puerto del Callao",
        preguntas: [
          { q: "Un arancel es…", o: ["Un impuesto a las importaciones", "Un premio a exportar", "Un tipo de sol", "Un seguro de salud"], c: 0, p: "Encarece los productos importados y puede cambiar los flujos de comercio." },
          { q: "¿Cuál es el principal socio comercial del Perú?", o: ["China", "Brasil", "Alemania", "India"], c: 0, p: "China es el principal destino de las exportaciones peruanas." },
          { q: "¿Por qué importa en el Perú un cambio de aranceles de EE. UU.?", o: ["Puede afectar exportaciones, precios y empleo", "No afecta a nadie", "Solo cambia el clima", "Solo afecta al fútbol"], c: 0, p: "El comercio conecta economías: lo que cambia afuera impacta adentro." }
        ]
      }
    }
  ],

  /* ───────────── ESTACIÓN 0: BRÚJULA (alfabetización informativa) ───────────── */
  brujula: {
    id: "brujula", nombre: "Brújula", icono: "🧭", color: "#F5B83D",
    lema: "Aprende a leer noticias antes de leer noticias.",
    esencial: [
      "Una fuente {{independiente|independiente}} no es lo mismo que neutral: significa autonomía editorial frente a grupos políticos o empresariales. Todo medio tiene enfoque; por eso se contrasta.",
      "Antes de compartir: ¿quién lo dice?, ¿hay documentos o datos?, ¿qué fecha tiene?, ¿lo confirma otra fuente distinta?",
      "Opinión no es noticia. Una columna, un podcast o un programa de análisis interpretan; el dato duro está en la fuente primaria (JNE, BCRP, INEI, CDC-Minsa).",
      "Este sitio enlaza siempre a la fuente original. Si un dato te sorprende, ábrela y verifica."
    ],
    mision: {
      titulo: "Estación Brújula: el Inicio del Camino",
      preguntas: [
        { q: "Antes de compartir una noticia lo más sensato es…", o: ["Compartir si el titular indigna", "Contrastar con otra fuente y revisar la fecha", "Esperar a que sea viral", "Borrar el enlace"], c: 1, p: "Contrastar y verificar fecha reduce la desinformación." },
        { q: "‘Medio independiente’ significa…", o: ["Que nunca se equivoca", "Que tiene autonomía editorial, pero igual puede tener enfoque", "Que no cobra publicidad jamás", "Que es del Estado"], c: 1, p: "Independiente ≠ neutral ni infalible: por eso se compara." },
        { q: "El dato oficial más confiable de una cifra económica suele estar en…", o: ["Un meme", "La fuente primaria (BCRP, INEI, MEF)", "Un audio reenviado", "Un comentario"], c: 1, p: "Las instituciones publican la cifra original: ve a la fuente primaria." }
      ]
    },
    terminos: ["independiente"]
  },

  /* ───────────── INSIGHTS: lo más importante hoy (verificado al corte) ───────────── */
  insights: [
    {
      sector: "politica", nivel: "alta",
      titulo: "Perú estrena Congreso bicameral y un gobierno que depende de alianzas",
      resumen: "Keiko Fujimori juró como presidenta el 28 de julio de 2026 (periodo 2026-2031), tras una segunda vuelta decidida por un margen mínimo, según las cifras difundidas por la prensa tras la proclamación del JNE (3 de julio). El Congreso volvió a tener dos cámaras: 60 senadores y 130 diputados. Fuerza Popular presidió el Senado gracias a una alianza, sin mayoría propia.",
      paraTi: "Las reformas importantes (seguridad, economía, salud) necesitan acuerdos entre bancadas: mira quién se alía con quién, más que quién grita más.",
      fuentes: [
        { n: "El Comercio · proclamación", u: "https://elcomercio.pe/politica/elecciones/jurado-nacional-de-elecciones-proclama-hoy-a-keiko-fujimori-como-presidenta-electa-tras-segunda-vuelta-lbposting-noticia/" },
        { n: "Model Diplomat · Senado", u: "https://modeldiplomat.com/story/keiko-fujimori-asume-con-senado-propio" },
        { n: "Diario Libre · bicameralidad", u: "https://www.diariolibre.com/mundo/america-latina/2026/07/24/peru-establece-un-sistema-parlamentario-bicameral/3610006" }
      ]
    },
    {
      sector: "economia", nivel: "media",
      titulo: "Crece menos y los precios suben más de lo previsto",
      resumen: "Según reportes de prensa económica, el BCRP recortó su proyección de crecimiento 2026 a 3,2 % (citando El Niño) y las proyecciones de inflación para 2026 se ubican por encima del rango meta de 1 %-3 % (BCRP ~4,2 %; BCP ~4,7 %). La tasa de referencia llevaría más de un año en 4,25 %.",
      paraTi: "Alimentos y servicios pueden seguir encareciéndose; los créditos no se abaratan pronto. Confirma cifras en la nota oficial del BCRP antes de decidir.",
      fuentes: [
        { n: "Forbes Perú · inflación (10-sep-2026)", u: "https://forbes.pe/economia-y-finanzas/2026-09-10/bcp-elevo-su-proyeccion-de-inflacion-de-42-a-47-para-cierre-de-ano/" },
        { n: "Perú Retail · tasa 4,25 %", u: "https://www.peru-retail.com/bcrp-mantiene-la-tasa-de-referencia-en-425-por-mas-de-un-ano-que-factores-influyen-en-su-decision/" },
        { n: "BCRP · fuente oficial", u: "https://www.bcrp.gob.pe" }
      ]
    },
    {
      sector: "salud", nivel: "media",
      titulo: "Dengue: casos y muertes se duplicaron entre las semanas 26 y 40",
      resumen: "Una sala situacional del CDC-Minsa con corte a la semana epidemiológica 40 reporta 75 fallecidos en 12 departamentos; Piura concentra más casos (13 025). La alerta epidemiológica nacional sigue vigente y medios reportan que las muertes de 2026 ya superan las de todo 2025.",
      paraTi: "Elimina agua estancada, usa repelente y acude al establecimiento de salud ante fiebre. Cifras en dge.gob.pe (se actualizan cada semana).",
      fuentes: [
        { n: "CDC-Minsa · alerta epidemiológica", u: "https://www.dge.gob.pe/portalnuevo/?p=4861" },
        { n: "Exitosa · récord de fallecidos", u: "https://www.exitosanoticias.pe/actualidad/peru-supera-ocho-meses-2026-record-fallecidos-dengue-todo-2025-n182564" },
        { n: "Expreso · Piura en emergencia", u: "https://www.expreso.com.pe/actualidad/piura-en-emergencia-casi-200-casos-semanales-de-dengue-alarman-a-todos-minsa-noticia/1269834/" }
      ]
    },
    {
      sector: "tecnologia", nivel: "media",
      titulo: "El Estado fija estrategias de IA y ciberseguridad mientras suben los ataques",
      resumen: "El marco peruano de IA (Ley 31814, 2023) convive con la Estrategia Nacional de Ciberseguridad 2026-2028, y reportes citados por El Peruano indican que los ciberataques con IA y ransomware aumentan, con banca, telecomunicaciones, salud, comercio y gobierno entre los más expuestos.",
      paraTi: "Activa la verificación en dos pasos, no reutilices contraseñas y verifica cualquier mensaje ‘urgente’ de tu banco por el canal oficial.",
      fuentes: [
        { n: "El Peruano · ciberataques con IA", u: "https://elperuano.pe/noticia/296634-ciberataques-con-ia-y-ransomware-aumentan-en-peru-advierte-estudio" },
        { n: "El Peruano · Ley 31814", u: "https://www.elperuano.pe/noticia/217129-ley-no-31814-promueven-uso-de-inteligencia-artificial-en-favor-del-desarrollo-economico-y-social-del-pais" },
        { n: "Expreso · defensa digital", u: "https://www.expreso.com.pe/tecnologia/peru-refuerza-su-defensa-digital-ante-el-auge-de-los-ciberdelitos-inteligencia-artificial-ia-noticia/1274840/" }
      ]
    },
    {
      id: "ia-peru", sector: "ia", nivel: "media",
      titulo: "Perú ya tiene reglas y estrategia de IA; ahora cada entidad pública debe tener un Oficial de IA",
      resumen: "La Ley 31814 (2023) fue reglamentada con el Decreto Supremo 115-2025-PCM (9 de setiembre de 2025). Según un análisis jurídico, en mayo de 2026 se aprobó la Estrategia Nacional de Inteligencia Artificial 2026-2030 (Resolución Ministerial 152-2026-PCM), y el 19 de octubre de 2026 la SGTD aprobó la directiva que define el perfil y las responsabilidades del Oficial de IA. Esa estrategia ubica al Perú por debajo del promedio de la región en inversión privada y adopción de IA, según el Índice Latinoamericano de IA 2025.",
      paraTi: "Si trabajas con el Estado o le vendes servicios de IA, revisa el reglamento y la directiva. Como ciudadano, pregunta cuándo una entidad usa IA en un trámite que te afecta. Confirma la estrategia en El Peruano: las fuentes no coinciden en todo.",
      fuentes: [
        { n: "Garrigues · aprobación de la ENIA", u: "https://www.garrigues.com/es_ES/noticia/peru-aprueba-estrategia-nacional-inteligencia-artificial-enia-establece-obligaciones" },
        { n: "El Peruano · rol del Oficial de IA", u: "https://elperuano.pe/noticia/307294-peru-define-el-rol-del-oficial-de-ia-para-una-transformacion-digital-responsable-del-estado" },
        { n: "Andina · reglamento de la Ley 31814", u: "https://andina.pe/agencia/noticia-gobierno-aprobo-reglamento-ley-promueve-uso-inteligencia-artificial-1044279.aspx" },
        { n: "Perú Retail · cómo se aplicará el reglamento", u: "https://www.peru-retail.com/gobierno-aprueba-reglamento-que-promueve-uso-de-inteligencia-artificial-asi-se-aplicara/" }
      ]
    },
    {
      id: "ia-ue", sector: "ia", nivel: "media",
      titulo: "La Unión Europea aplaza parte de su ley de IA: el etiquetado de contenido pasa a diciembre de 2026",
      resumen: "Según reportes, el Parlamento Europeo y el Consejo alcanzaron en mayo de 2026 un acuerdo (el AI Omnibus) que simplifica el AI Act. Las obligaciones de transparencia sobre contenido generado por IA pasan del 2 de agosto al 2 de diciembre de 2026, algunas obligaciones de alto riesgo al 2 de diciembre de 2027 y los sistemas integrados en productos al 2 de agosto de 2028. El Parlamento aprobó los cambios el 16 de junio de 2026; la publicación final en el Diario Oficial de la UE no se pudo confirmar.",
      paraTi: "Es una ley europea, pero afecta a las empresas que ofrecen IA en Europa y suele tomarse como referencia en el debate regulatorio. Confirma los plazos en la Comisión Europea.",
      fuentes: [
        { n: "IEB School · AI Act 2026", u: "https://www.iebschool.com/hub/ai-act-2026-la-ue-retrasa-el-cumplimiento-de-la-ia-de-alto-riesgo-a-diciembre-de-2027/" },
        { n: "BHRRC · acuerdo del AI Omnibus", u: "https://www.bhrrc.org/de/neuste-meldungen/eu-council-parliament-agree-to-water-down-ai-act-as-part-of-digital-omnibus/" },
        { n: "Comisión Europea · marco normativo de IA", u: "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai" }
      ]
    },
    {
      id: "ia-infra", sector: "ia", nivel: "media",
      titulo: "Chips y centros de datos: la IA presiona la red eléctrica",
      resumen: "Boletines de octubre de 2026 reportan que Microsoft, AMD, NVIDIA y Marvell presentaron nuevos diseños de chips y racks para centros de datos el 12 de octubre, y que el regulador eléctrico FERC de EE. UU. rechazó el 9 de octubre el núcleo del plan de PJM para limitar nuevas cargas grandes, como los centros de datos, que no aporten capacidad propia. Son fuentes secundarias: contrástalas con las primarias.",
      paraTi: "La demanda de energía de la IA es un tema abierto en varios países. Revisa la orden de FERC y los comunicados de las empresas antes de sacar conclusiones.",
      fuentes: [
        { n: "FourWeekMBA · resumen del 12 de octubre", u: "https://fourweekmba.com/ai-daily-roundup-12-oct-2026-ai-chips-racks-large-loads/" },
        { n: "Bloomberg Government · disputas tecnológicas 2026", u: "https://news.bgov.com/bloomberg-government-news/ai-regulation-chip-exports-data-centers-form-2026-tech-fights" }
      ]
    },
    {
      sector: "mundo", nivel: "media",
      titulo: "EE. UU. aplica nuevos aranceles a decenas de países, incluida la región",
      resumen: "En julio de 2026 se informó que Washington impuso nuevos aranceles de entre 10 % y 12,5 % a 18 países de América Latina y el Caribe (Brasil, entre los más afectados). Varios gobiernos dijeron que negociarán; otros buscan diversificar su comercio.",
      paraTi: "Para el Perú pesan los efectos indirectos: demanda de metales, tipo de cambio y rutas comerciales. Revisa la evolución en fuentes económicas.",
      fuentes: [
        { n: "WTOP/CNN · 18 países afectados", u: "https://wtop.com/news/2026/07/hay-18-paises-de-america-latina-y-el-caribe-entre-los-afectados-por-los-nuevos-aranceles-de-ee-uu/" },
        { n: "BNamericas · análisis", u: "https://www.bnamericas.com/es/analisis/eua-confirman-aranceles-contra-paises-de-america-latina-con-brasil-siendo-el-mas-afectado" }
      ]
    },
    {
      sector: "deporte", nivel: "media",
      titulo: "Liga 1: Clausura con tabla apretada (corte 8 de octubre)",
      resumen: "Tras la fecha 11 del Clausura, Deportivo Garcilaso lideraba con 22 puntos, seguido de Universitario (20) y Sporting Cristal (19). En la tabla acumulada, varias notas ubican a Alianza Lima arriba, con Los Chankas como perseguidor.",
      paraTi: "La tabla cambia cada jornada: confirma la posición actual en la web oficial de la Liga o en medios deportivos.",
      fuentes: [
        { n: "La República · tabla fecha 11", u: "https://larepublica.pe/deportes/2026/10/08/tabla-de-posiciones-torneo-clausura-y-acumulado-de-la-liga-1-2026-683392" },
        { n: "Infobae · acumulada", u: "https://www.infobae.com/peru/deportes/2026/08/15/tabla-de-posiciones-liga-1-peru-2026-en-vivo-hoy-partidos-fecha-5-torneo-clausura-acumulada-alianza-lima-universitario-sporting-cristal-melgar-cienciano-sport-boys/" }
      ]
    },
    {
      sector: "investigacion", nivel: "alta",
      titulo: "Investigar al poder tiene costos: el periodismo bajo presión",
      resumen: "El periodismo de investigación peruano se sostiene sobre todo en medios sin fines de lucro (IDL-Reporteros, OjoPúblico, Convoca). RSF y CPJ han documentado investigaciones fiscales y pedidos judiciales contra periodistas por su trabajo (2018-2021), un contexto clave para leer cada nueva controversia.",
      paraTi: "Cuando un caso enfrenta a periodistas con instituciones, lee las dos versiones, busca documentos y recuerda la presunción de inocencia.",
      fuentes: [
        { n: "RSF · Perú", u: "https://rsf.org/es/peru" },
        { n: "GIJN · periodistas de investigación", u: "https://gijn.org/stories/perus-investigative-journalists-carry-on-amidst-disinformation-attacks-and-political-crisis/" },
        { n: "CPJ · caso OjoPúblico", u: "https://cpj.org/es/2021/11/las-autoridades-peruanas-abren-investigacion-penal-contra-el-periodista-ernesto-cabral-de-ojo-publico-por-sus-investigaciones-sobre-la-corrupcion/" }
      ]
    }
  ],

  /* ───────────── GLOSARIO ───────────── */
  glosario: [
    { id: "poder-ejecutivo", t: "Poder Ejecutivo", s: "politica", d: "Presidente(a) de la República y Consejo de Ministros. Ejecuta las leyes y dirige la administración del Estado." },
    { id: "bicameralidad", t: "Bicameralidad", s: "politica", d: "Sistema de Congreso con dos cámaras. Desde julio de 2026: Senado (60) y Cámara de Diputados (130). Antes, desde la Constitución de 1993, el Congreso era unicameral." },
    { id: "congreso-fragmentado", t: "Congreso fragmentado", s: "coyuntura", d: "Congreso donde ningún partido tiene mayoría propia, por lo que se necesitan alianzas para aprobar leyes." },
    { id: "vacancia", t: "Vacancia presidencial", s: "politica", d: "Mecanismo por el que el Congreso puede declarar vacante la Presidencia por causales previstas en la Constitución, como la ‘permanente incapacidad moral o física’." },
    { id: "cuestion-de-confianza", t: "Cuestión de confianza", s: "politica", d: "Pedido del Ejecutivo al Congreso para respaldar una política. Si el Congreso se la niega, el gabinete debe renunciar." },
    { id: "interpelacion", t: "Interpelación", s: "politica", d: "Citación a un ministro para que explique decisiones o hechos de su sector. Puede derivar en una censura." },
    { id: "censura", t: "Censura", s: "politica", d: "Sanción política: el Congreso retira el respaldo a un ministro, que debe dejar el cargo." },
    { id: "facultades-legislativas", t: "Facultades legislativas", s: "coyuntura", d: "Delegación temporal del Congreso al Ejecutivo para dictar decretos legislativos en materias y plazos específicos." },
    { id: "decreto-de-urgencia", t: "Decreto de urgencia", s: "coyuntura", d: "Norma con fuerza de ley que dicta el Ejecutivo en materia económica y financiera ante situaciones extraordinarias." },
    { id: "jne", t: "JNE", s: "politica", d: "Jurado Nacional de Elecciones. Administra justicia electoral, resuelve controversias y proclama los resultados." },
    { id: "onpe", t: "ONPE", s: "politica", d: "Oficina Nacional de Procesos Electorales. Organiza las elecciones y cuenta los votos (actas)." },
    { id: "reniec", t: "RENIEC", s: "politica", d: "Registro Nacional de Identificación y Estado Civil. Emite el DNI y mantiene el padrón de identidad." },
    { id: "junta-nacional-de-justicia", t: "JNJ", s: "politica", d: "Junta Nacional de Justicia. Nombra, evalúa, ratifica y sanciona a jueces y fiscales." },
    { id: "tribunal-constitucional", t: "Tribunal Constitucional", s: "politica", d: "Máximo intérprete de la Constitución: revisa leyes y protege derechos fundamentales." },
    { id: "defensoria", t: "Defensoría del Pueblo", s: "politica", d: "Organismo autónomo que defiende derechos de las personas y supervisa a la administración estatal." },
    { id: "contraloria", t: "Contraloría", s: "investigacion", d: "Entidad que controla el uso de recursos públicos y emite informes de control sobre posibles irregularidades." },
    { id: "fiscalia", t: "Fiscalía (Ministerio Público)", s: "investigacion", d: "Conduce la investigación del delito, reúne pruebas y, si corresponde, formula la acusación ante el juez." },
    { id: "presuncion-de-inocencia", t: "Presunción de inocencia", s: "investigacion", d: "Derecho de toda persona a ser tratada como inocente hasta que exista una sentencia firme que diga lo contrario." },
    { id: "prision-preventiva", t: "Prisión preventiva", s: "investigacion", d: "Medida cautelar que priva de libertad a un investigado mientras dura el proceso. No es una condena." },
    { id: "impedimento-de-salida", t: "Impedimento de salida", s: "investigacion", d: "Medida que prohíbe a una persona salir del país mientras se desarrolla una investigación." },
    { id: "allanamiento", t: "Allanamiento", s: "investigacion", d: "Ingreso de la autoridad a un inmueble, con orden judicial, para buscar pruebas o detener a alguien." },
    { id: "colaboracion-eficaz", t: "Colaboración eficaz", s: "investigacion", d: "Acuerdo por el cual un investigado aporta información relevante a cambio de beneficios. La información debe ser corroborada." },
    { id: "reglaje", t: "Reglaje", s: "investigacion", d: "En el uso peruano, seguimiento o vigilancia ilegal a una persona para conocer sus movimientos." },
    { id: "pbi", t: "PBI", s: "economia", d: "Producto Bruto Interno: valor de los bienes y servicios producidos en el país en un periodo. Su variación indica si la economía crece o se contrae." },
    { id: "inflacion", t: "Inflación", s: "economia", d: "Aumento generalizado y sostenido de los precios. El BCRP busca mantenerla entre 1 % y 3 % anual." },
    { id: "tasa-de-referencia", t: "Tasa de referencia", s: "economia", d: "Tasa de interés que fija el BCRP para operaciones interbancarias. Sirve de guía al costo del crédito en la economía." },
    { id: "bcrp", t: "BCRP", s: "economia", d: "Banco Central de Reserva del Perú. Entidad autónoma que cuida la estabilidad de precios y el valor de la moneda." },
    { id: "mef", t: "MEF", s: "economia", d: "Ministerio de Economía y Finanzas. Formula la política económica y fiscal y gestiona el presupuesto público." },
    { id: "sunat", t: "SUNAT", s: "economia", d: "Superintendencia Nacional de Aduanas y de Administración Tributaria: recauda impuestos y controla el comercio exterior." },
    { id: "igv", t: "IGV", s: "economia", d: "Impuesto General a las Ventas. La tasa total es 18 %: 16 % de IGV más 2 % de Impuesto de Promoción Municipal." },
    { id: "tipo-de-cambio", t: "Tipo de cambio", s: "economia", d: "Precio de una moneda extranjera (por ejemplo, el dólar) expresado en soles." },
    { id: "riesgo-pais", t: "Riesgo país", s: "economia", d: "Indicador (como el EMBI) que mide el sobreprecio que paga un país por endeudarse frente a EE. UU. Más alto, mayor percepción de riesgo." },
    { id: "informalidad", t: "Informalidad", s: "economia", d: "Trabajo o negocios sin registro ni derechos laborales plenos. En el Perú afecta a una gran mayoría de trabajadores." },
    { id: "canon-minero", t: "Canon minero", s: "economia", d: "Parte de la renta que pagan las empresas mineras que el Estado transfiere a las regiones y municipios de donde se extrae el recurso." },
    { id: "deficit-fiscal", t: "Déficit fiscal", s: "economia", d: "Situación en la que el Estado gasta más de lo que recauda en un periodo." },
    { id: "rmv", t: "Remuneración Mínima Vital", s: "economia", d: "Sueldo mínimo legal que debe pagar un empleador a un trabajador a tiempo completo." },
    { id: "el-nino-costero", t: "Fenómeno El Niño", s: "economia", d: "Calentamiento anómalo del mar frente a la costa peruana. Puede causar lluvias intensas, huaicos, plagas, caída de pesca y más casos de dengue." },
    { id: "minsa", t: "Minsa", s: "salud", d: "Ministerio de Salud: rector del sector, define políticas y administra servicios públicos." },
    { id: "diresa", t: "DIRESA", s: "salud", d: "Dirección Regional de Salud: gestiona la salud pública a nivel de cada región." },
    { id: "essalud", t: "EsSalud", s: "salud", d: "Seguro Social de Salud: cubre a trabajadores formales y sus derechohabientes con aportes del empleador." },
    { id: "sis", t: "SIS", s: "salud", d: "Seguro Integral de Salud: seguro público para quienes no cuentan con otro seguro, con financiamiento del Estado." },
    { id: "dengue", t: "Dengue", s: "salud", d: "Enfermedad viral transmitida por mosquitos. Provoca fiebre alta, dolor de cabeza, de articulaciones y detrás de los ojos; puede agravarse y requerir atención urgente." },
    { id: "aedes", t: "Aedes aegypti", s: "salud", d: "Mosquito que transmite dengue, zika y chikungunya. Se cría en agua limpia estancada en recipientes, llantas o floreros." },
    { id: "alerta-epidemiologica", t: "Alerta epidemiológica", s: "salud", d: "Aviso oficial del CDC-Minsa sobre un riesgo de salud pública, con recomendaciones para equipos de salud y población." },
    { id: "semana-epidemiologica", t: "Semana epidemiológica (SE)", s: "salud", d: "Periodo estándar de 7 días que se usa para reportar y comparar la vigilancia de enfermedades." },
    { id: "anemia", t: "Anemia infantil", s: "salud", d: "Nivel bajo de hemoglobina en la sangre, frecuente en menores de 3 años. Afecta el desarrollo físico y cognitivo." },
    { id: "ia", t: "Inteligencia artificial (IA)", s: "tecnologia", d: "Sistemas capaces de realizar tareas que normalmente requieren inteligencia humana, como reconocer imágenes o generar texto. En el Perú la regula la Ley 31814." },
    { id: "ciberseguridad", t: "Ciberseguridad", s: "tecnologia", d: "Conjunto de medidas para proteger sistemas, redes y datos frente a ataques o accesos no autorizados." },
    { id: "phishing", t: "Phishing", s: "tecnologia", d: "Engaño que suplanta a un banco o empresa para que entregues claves o datos personales." },
    { id: "ransomware", t: "Ransomware", s: "tecnologia", d: "Software malicioso que cifra los archivos de una organización y exige un pago para devolverlos." },
    { id: "datos-personales", t: "Datos personales", s: "tecnologia", d: "Información que identifica a una persona. En el Perú están protegidos por la Ley 29733 y una autoridad nacional de protección de datos." },
    { id: "deepfake", t: "Deepfake", s: "tecnologia", d: "Video, audio o imagen falsificados con IA que imitan a una persona real. Verifica la fuente antes de compartir." },
    { id: "gobierno-digital", t: "Gobierno digital (gob.pe)", s: "tecnologia", d: "Estrategia para ofrecer trámites y servicios del Estado en línea, centralizados en la plataforma gob.pe." },
    { id: "ia-generativa", t: "IA generativa", s: "ia", d: "IA que crea contenido nuevo (texto, imágenes, audio, código) a partir de instrucciones, tras entrenarse con grandes volúmenes de datos." },
    { id: "llm", t: "Modelo de lenguaje (LLM)", s: "ia", d: "Sistema entrenado con enormes cantidades de texto que genera lenguaje. Es la base de asistentes como ChatGPT, Claude o Gemini." },
    { id: "agente-ia", t: "Agente de IA", s: "ia", d: "Sistema que no solo responde: ejecuta tareas de varios pasos usando herramientas (buscar, escribir, operar programas). Conviene supervisarlo." },
    { id: "alucinacion", t: "Alucinación (IA)", s: "ia", d: "Respuesta falsa que un modelo presenta con apariencia convincente. Verifica datos importantes en fuentes confiables." },
    { id: "sesgo-algoritmico", t: "Sesgo algorítmico", s: "ia", d: "Resultados sistemáticamente injustos de un sistema porque sus datos o su diseño reflejan prejuicios." },
    { id: "enia", t: "ENIA", s: "ia", d: "Estrategia Nacional de Inteligencia Artificial del Perú 2026-2030, aprobada por la PCM (Resolución Ministerial 152-2026-PCM, según un análisis jurídico)." },
    { id: "sgtd", t: "SGTD", s: "ia", d: "Secretaría de Gobierno y Transformación Digital de la PCM: autoridad técnico-normativa para el uso y la promoción de la IA en el Perú." },
    { id: "oficial-ia", t: "Oficial de IA", s: "ia", d: "Funcionario de cada entidad pública que formula su plan de acción de IA. Su perfil y responsabilidades fueron fijados por una directiva de la SGTD en octubre de 2026." },
    { id: "ai-act", t: "AI Act (UE)", s: "ia", d: "Reglamento de la Unión Europea que regula la IA según el nivel de riesgo. Se aplica por etapas y en 2026 se acordó aplazar parte de sus plazos." },
    { id: "gpu", t: "Chip de IA (GPU)", s: "ia", d: "Procesador especializado que acelera el entrenamiento y uso de modelos de IA. Su comercio es un tema geopolítico entre grandes potencias." },
    { id: "centro-de-datos", t: "Centro de datos", s: "ia", d: "Instalación con miles de servidores donde se entrena y ejecuta la IA. Consume mucha electricidad y agua." },
    { id: "liga-1", t: "Liga 1", s: "deporte", d: "Primera división del fútbol profesional peruano." },
    { id: "apertura-clausura", t: "Apertura y Clausura", s: "deporte", d: "Los dos torneos cortos en que se divide la temporada de la Liga 1." },
    { id: "tabla-acumulada", t: "Tabla acumulada", s: "deporte", d: "Tabla que suma los puntos de Apertura y Clausura durante el año." },
    { id: "fpf", t: "FPF", s: "deporte", d: "Federación Peruana de Fútbol: entidad que organiza el fútbol nacional y la Selección." },
    { id: "eliminatorias", t: "Eliminatorias", s: "deporte", d: "Torneo clasificatorio de CONMEBOL que define las selecciones sudamericanas que van al Mundial." },
    { id: "arancel", t: "Arancel", s: "mundo", d: "Impuesto que un país cobra a los productos importados." },
    { id: "independiente", t: "Medio independiente", s: "coyuntura", d: "Medio con autonomía editorial frente a grupos políticos o empresariales. No significa neutral: puede tener enfoque, por eso se contrasta con otras fuentes." }
  ],

  /* ───────────── FUENTES ───────────── */
  fuentes: [
    { n: "IDL-Reporteros", u: "https://www.idl-reporteros.pe", tipo: "Independiente · investigación", foco: "Corrupción política y corporativa, crimen organizado. Dirigido por Gustavo Gorriti.", feed: true },
    { n: "OjoPúblico", u: "https://ojo-publico.com", tipo: "Independiente · investigación", foco: "Política, ambiente, derechos humanos, crimen organizado. Periodismo de datos.", feed: true },
    { n: "Convoca", u: "https://convoca.pe", tipo: "Independiente · investigación", foco: "Asociación de periodismo de investigación con reporteros y analistas de datos.", feed: true },
    { n: "Hildebrandt en sus trece", u: "https://www.hildebrandtensustrece.com", tipo: "Semanario · opinión e investigación", foco: "Semanario dirigido por César Hildebrandt: política, poder y denuncias.", feed: true },
    { n: "La Encerrona", u: "https://www.youtube.com/channel/UCP0AJJeNkFBYzegTTVbKhPg", tipo: "Programa de análisis político · YouTube/podcast", foco: "Noticias y análisis político diarios, dirigido por el periodista Marco Sifuentes. Es un programa de análisis con enfoque propio: contrástalo con fuentes primarias.", feed: false },
    { n: "Curwen (Víctor Caballero)", u: "https://www.google.com/search?q=Curwen+Victor+Caballero+El+Diario+de+Curwen+canal+oficial", tipo: "Análisis político y opinión · video/podcast", foco: "Creador de “El Diario de Curwen” y del programa “Brutalidad Política”. Contenido de opinión y entretenimiento: no es un medio de noticias; contrástalo. Canal oficial por confirmar.", feed: false },
    { n: "El Foco", u: "https://www.patreon.com/cw/elfoco", tipo: "Independiente · investigación (sin fines de lucro)", foco: "Asociación sin fines de lucro fundada en 2020 que se declara independiente de intereses políticos y económicos; publica también en audio. Sitio web oficial por confirmar.", feed: false },
    { n: "Wayka", u: "https://wayka.pe", tipo: "Digital independiente", foco: "Política y derechos desde una mirada ciudadana.", feed: true },
    { n: "La Mula", u: "https://www.lamula.pe", tipo: "Digital independiente", foco: "Actualidad política y social, columnas de opinión.", feed: true },
    { n: "Salud con Lupa", u: "https://saludconlupa.com", tipo: "Independiente · salud", foco: "Periodismo de salud pública y datos.", feed: true },
    { n: "Mongabay Latam", u: "https://es.mongabay.com", tipo: "Sin fines de lucro · ambiente", foco: "Ambiente, Amazonía, minería y clima.", feed: true },
    { n: "Caretas", u: "https://caretas.pe", tipo: "Semanario", foco: "Política y actualidad desde 1950.", feed: true },
    { n: "El Comercio", u: "https://elcomercio.pe", tipo: "Comercial · diario", foco: "Cobertura nacional. Útil para contrastar.", feed: true },
    { n: "La República", u: "https://larepublica.pe", tipo: "Comercial · diario", foco: "Cobertura nacional, política y deportes.", feed: true },
    { n: "Infobae Perú", u: "https://www.infobae.com/peru/", tipo: "Comercial · digital", foco: "Cobertura continua nacional.", feed: true },
    { n: "RPP", u: "https://rpp.pe", tipo: "Comercial · radio/web", foco: "Noticias nacionales y deportes.", feed: true },
    { n: "Gestión", u: "https://gestion.pe", tipo: "Comercial · economía", foco: "Economía, empresas y finanzas.", feed: true },
    { n: "El Peruano", u: "https://elperuano.pe", tipo: "Estatal · diario oficial", foco: "Normas legales y comunicación oficial.", feed: false },
    { n: "JNE", u: "https://www.jne.gob.pe", tipo: "Dato oficial", foco: "Resoluciones y proclamación de resultados.", feed: false },
    { n: "ONPE", u: "https://www.onpe.gob.pe", tipo: "Dato oficial", foco: "Resultados electorales.", feed: false },
    { n: "BCRP", u: "https://www.bcrp.gob.pe", tipo: "Dato oficial", foco: "Notas de política monetaria e indicadores.", feed: false },
    { n: "INEI", u: "https://www.inei.gob.pe", tipo: "Dato oficial", foco: "Estadísticas oficiales: pobreza, empleo, población.", feed: false },
    { n: "CDC-Minsa", u: "https://www.dge.gob.pe", tipo: "Dato oficial", foco: "Salas situacionales y alertas epidemiológicas.", feed: false },
    { n: "SGTD · PCM (gob.pe)", u: "https://www.gob.pe/pcm", tipo: "Dato oficial", foco: "Autoridad nacional de IA y gobierno digital: directivas, estrategia y reglamento.", feed: false },
    { n: "Comisión Europea · IA", u: "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai", tipo: "Dato oficial", foco: "Marco normativo europeo de IA (AI Act) y calendario de aplicación.", feed: false },
    { n: "BBC Mundo", u: "https://www.bbc.com/mundo", tipo: "Internacional", foco: "Noticias del mundo en español.", feed: true },
    { n: "DW Español", u: "https://www.dw.com/es", tipo: "Internacional", foco: "Actualidad internacional.", feed: true },
    { n: "El País América", u: "https://elpais.com/america/", tipo: "Internacional", foco: "América Latina y el mundo.", feed: true },
    { n: "France 24 Español", u: "https://www.france24.com/es/", tipo: "Internacional", foco: "Noticias internacionales.", feed: true },
    { n: "ONU Noticias", u: "https://news.un.org/es/", tipo: "Internacional · organismos", foco: "Temas globales: clima, salud, derechos.", feed: true }
  ]
};

/* ───── Contexto y términos para las páginas de lectura (una por insight) ───── */
window.EDITORIAL.articulos = {
  politica: {
    contexto: "Hasta 2026 el Perú tuvo un Congreso de una sola cámara, vigente desde la Constitución de 1993. Con el regreso del Senado y la Cámara de Diputados, las leyes pasan por ambas cámaras. Cuando los escaños están repartidos entre varios partidos, ningún grupo decide solo: el Gobierno necesita pactos para aprobar medidas y evitar enfrentamientos como una censura o una cuestión de confianza fallida.",
    terminos: ["bicameralidad", "congreso-fragmentado", "cuestion-de-confianza", "censura", "jne", "onpe"]
  },
  economia: {
    contexto: "La inflación mide cuánto suben los precios y el BCRP busca mantenerla entre 1 % y 3 %. Cuando se ubica por encima, el banco central suele sostener tasas altas para enfriar la demanda, lo que encarece los créditos. El crecimiento depende de la inversión, el consumo y las exportaciones; fenómenos climáticos como El Niño pueden golpear la pesca, la agricultura y el transporte.",
    terminos: ["pbi", "inflacion", "tasa-de-referencia", "bcrp", "el-nino-costero", "mef"]
  },
  salud: {
    contexto: "El dengue se concentra en el norte y la selva, donde hay calor y lluvias, y los brotes se agravan cuando el Fenómeno El Niño aumenta el agua estancada donde se cría el mosquito. Las alertas epidemiológicas activan acciones de control del vector, vigilancia y refuerzo de la atención en hospitales y postas.",
    terminos: ["dengue", "aedes", "alerta-epidemiologica", "semana-epidemiologica", "minsa", "el-nino-costero"]
  },
  tecnologia: {
    contexto: "La Ley 31814 (2023) fija principios para el uso ético y seguro de la inteligencia artificial. Mientras tanto, los ataques de phishing y ransomware aprovechan la IA para parecer más creíbles. Las organizaciones deben invertir en ciberseguridad y las personas en hábitos básicos, como la verificación en dos pasos.",
    terminos: ["ia", "ciberseguridad", "phishing", "ransomware", "datos-personales", "deepfake"]
  },
  "ia-peru": {
    contexto: "El Perú optó por un marco que promueve el uso de la IA con principios de ética, seguridad y transparencia, en lugar de prohibiciones. La Ley 31814 fija el rumbo, el reglamento detalla plazos y obligaciones, y la estrategia 2026-2030 ordena las prioridades. La PCM, mediante la SGTD, supervisa y cada entidad pública debe contar con un Oficial de IA que prepare su plan de acción.",
    terminos: ["enia", "sgtd", "oficial-ia", "ia", "ia-generativa", "sesgo-algoritmico"]
  },
  "ia-ue": {
    contexto: "El AI Act clasifica los sistemas de IA por riesgo: más obligaciones para los de alto riesgo y reglas de transparencia, por ejemplo, para el contenido generado por IA. El acuerdo de 2026 ajusta los plazos para dar más tiempo a las empresas. Un plazo aplazado no elimina la obligación, solo cambia cuándo empieza a exigirse.",
    terminos: ["ai-act", "ia-generativa", "deepfake", "llm"]
  },
  "ia-infra": {
    contexto: "Entrenar y ejecutar modelos de IA exige chips especializados y centros de datos con gran consumo eléctrico. Por eso la disponibilidad de energía, la regulación de las redes eléctricas y el comercio de chips se volvieron parte del debate sobre IA.",
    terminos: ["gpu", "centro-de-datos", "llm", "agente-ia"]
  },
  mundo: {
    contexto: "Un arancel encarece los productos importados en el país que lo aplica. Para economías exportadoras como la peruana, los aranceles de grandes mercados pueden reducir la demanda, mover los precios de las materias primas y alterar el tipo de cambio, incluso cuando el producto peruano no es el directamente gravado.",
    terminos: ["arancel", "tipo-de-cambio", "riesgo-pais"]
  },
  deporte: {
    contexto: "La Liga 1 divide la temporada en Apertura y Clausura y suma ambos torneos en la tabla acumulada. Una tabla apretada significa pocos puntos de diferencia entre los líderes, de modo que cada jornada puede cambiar el panorama. Las posiciones de este informe corresponden a la fecha 11 del Clausura.",
    terminos: ["liga-1", "apertura-clausura", "tabla-acumulada", "fpf"]
  },
  investigacion: {
    contexto: "En el Perú buena parte del periodismo de investigación nace en medios sin fines de lucro que se financian en gran parte con donaciones y fondos de cooperación. Su trabajo suele partir de documentos, audios y datos públicos, y sus reportajes pueden activar investigaciones fiscales. Por eso importa distinguir entre una denuncia periodística, una investigación fiscal y una sentencia.",
    terminos: ["fiscalia", "presuncion-de-inocencia", "colaboracion-eficaz", "prision-preventiva", "reglaje", "independiente"]
  }
};
