/* Datos de la promoción de talleres de IA. Edita este archivo para cambiar textos, enlaces o agregar talleres.
   No incluye precios ni fechas a propósito: agrégalos en "detalle" cuando estén confirmados. */
window.TALLERES = {
  autor: {
    nombre: "Luis Wilfredo Gomez Herrera",
    titulo: "Ing. Estadístico (UNI) · Candidato a Magíster en Inteligencia Artificial (UNMSM)",
    resumen: "Más de 12 años en analítica de datos y business intelligence. Dicta talleres prácticos de inteligencia artificial para instituciones y público general."
  },
  talleres: [
    {
      id: "desde-cero",
      icono: "🌱",
      nombre: "IA generativa desde cero",
      para: "Público general · Virtual",
      desc: "Aprende a usar ChatGPT, Claude y Gemini para estudiar, trabajar y redactar mejor, sin saber programar.",
      aprenderas: ["Escribir instrucciones claras para ChatGPT, Claude y Gemini", "Resumir, redactar y estudiar más rápido con IA", "Verificar lo que responde y evitar errores"],
      detalle: ""
    },
    {
      id: "decisiones",
      icono: "🎯",
      nombre: "IA para la toma de decisiones",
      para: "Ejecutivos y equipos · Presencial o virtual",
      desc: "Usa la IA para analizar información, comparar opciones y preparar informes con criterio.",
      aprenderas: ["Analizar información y comparar opciones con apoyo de la IA", "Preparar informes y presentaciones con criterio", "Usar la IA cuidando la reserva de la información"],
      detalle: ""
    },
    {
      id: "claude-code",
      icono: "⚙️",
      nombre: "Claude Code y automatización",
      para: "Nivel práctico · Con ejemplos reales",
      desc: "Crea páginas, reportes y automatizaciones con IA, paso a paso y con ejemplos que puedes replicar.",
      aprenderas: ["Crear páginas y reportes con IA, paso a paso", "Automatizar tareas repetitivas con ejemplos reales", "Probar y publicar lo que construyes"],
      detalle: ""
    }
  ],
  contacto: {
    whatsapp: "51991878834",
    mensaje: "Hola Willy, vi PERÚ INFORMADO y quiero información de tus talleres de IA.",
    tiktok: "https://www.tiktok.com/@luwiuni",
    web: "https://wgia-formacion.luisito4903.chatgpt.site/"
  },
  /* "sector" indica en qué sección de PERÚ INFORMADO se muestra además de la página de talleres y el pie. */
  paginas: [
    {
      id: "ia-radar",
      icono: "🤖",
      n: "IA Radar",
      d: "Observatorio de IA en español: noticias con contexto, comparaciones de modelos y microlecciones.",
      u: "https://willy4903.github.io/taller-estadistica-garrita/",
      sector: "ia"
    },
    {
      id: "liga1-calculadora",
      icono: "⚽",
      n: "Calculadora Liga 1 2026",
      d: "Tabla acumulada, Apertura y Clausura, calculadora de resultados y pronósticos con foco en Universitario.",
      u: "https://willy4903.github.io/taller-estadistica-garrita/liga1/#hist",
      sector: "deporte"
    },
    {
      id: "observatorio-nino",
      icono: "🌊",
      n: "El Niño Perú: observatorio",
      d: "Datos del mar, pronóstico del tiempo por distrito, estado de El Niño según ENFEN y zonas de riesgo.",
      u: "https://willy4903.github.io/observatorio-elnino-peru/#meteo",
      sector: "nino"
    }
  ]
};
