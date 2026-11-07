// Conexión OPCIONAL con una IA a través de TU PROPIO backend.
//
// La app es estática y no contiene claves. Si quieres comentarios generados por IA en la conversación guiada:
//   1. Despliega un backend propio (ver README, sección "Conectar una IA") que guarde la clave en el servidor.
//   2. En Ajustes activa "Comentarios de IA" y escribe la URL de tu endpoint (https://...).
//
// Contrato (JSON):
//   Petición  POST  { dialogueId, nodeId, npcLine, userText, history: [{ role: 'npc'|'user', text }], locale: 'es' }
//   Respuesta 200   { feedback: "comentario breve en español", corrected: "versión corregida en inglés (opcional)" }
//
// Los textos de la respuesta se muestran siempre como texto plano (nunca como HTML).

const MAX_TEXT = 600;

export function isValidEndpoint(url) {
  try {
    const u = new URL(url);
    if (u.protocol === 'https:') return true;
    return u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

function clean(v) {
  return typeof v === 'string' ? v.slice(0, MAX_TEXT) : '';
}

/**
 * Pide un comentario a tu backend. Devuelve { feedback, corrected } o lanza Error si no está disponible.
 * No se envían claves ni datos personales: solo la línea del diálogo y lo que escribió el usuario.
 */
export async function askAI(endpoint, payload, { timeoutMs = 12000, fetchImpl = fetch } = {}) {
  if (!isValidEndpoint(endpoint)) throw new Error('La URL del endpoint no es válida. Debe empezar con https://');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, locale: 'es' }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`El servidor respondió ${res.status}.`);
    const data = await res.json();
    const feedback = clean(data?.feedback);
    if (!feedback) throw new Error('La respuesta del servidor no incluye "feedback".');
    return { feedback, corrected: clean(data?.corrected) };
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('El servidor tardó demasiado en responder.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
