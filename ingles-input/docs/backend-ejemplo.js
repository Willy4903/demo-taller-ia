// EJEMPLO de backend para los comentarios de IA opcionales (Cloudflare Worker).
// No forma parte de la app estática y no se ha probado contra un servicio real: es un punto de partida.
//
// La clave de la API vive SOLO aquí, como secreto del Worker (wrangler secret put ANTHROPIC_API_KEY).
// El front solo conoce la URL de este endpoint.
//
// Contrato que espera la app (ver js/ai.js):
//   POST { dialogueId, nodeId, npcLine, userText, history, locale }
//   200  { feedback: "comentario breve en español", corrected: "versión corregida en inglés" }

const ALLOWED_ORIGIN = 'https://TU-USUARIO.github.io'; // cambia por el origen donde publiques la app

const cors = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return new Response('Método no permitido', { status: 405, headers: cors });
    if (request.headers.get('Origin') !== ALLOWED_ORIGIN) return new Response('Origen no permitido', { status: 403, headers: cors });

    let body;
    try { body = await request.json(); } catch { return new Response('JSON inválido', { status: 400, headers: cors }); }
    const npcLine = String(body.npcLine || '').slice(0, 300);
    const userText = String(body.userText || '').slice(0, 300);
    if (!userText) return new Response('Falta userText', { status: 400, headers: cors });

    const system = 'Eres un tutor de inglés para hispanohablantes de nivel básico. Responde SOLO con JSON {"feedback": "...", "corrected": "..."}. '
      + 'feedback: máximo 2 frases en español, amable, señalando un acierto y una mejora concreta. corrected: la respuesta del alumno corregida, en inglés simple.';

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-5-5',
        max_tokens: 300,
        system,
        messages: [{ role: 'user', content: `Pregunta del interlocutor: ${npcLine}\nRespuesta del alumno: ${userText}` }],
      }),
    });
    if (!res.ok) return new Response('Error del proveedor de IA', { status: 502, headers: cors });
    const data = await res.json();
    let parsed;
    try { parsed = JSON.parse(data.content?.[0]?.text ?? '{}'); } catch { parsed = {}; }
    return new Response(JSON.stringify({ feedback: String(parsed.feedback || ''), corrected: String(parsed.corrected || '') }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  },
};
