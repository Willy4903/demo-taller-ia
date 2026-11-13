// Utilidades puras (sin acceso al DOM salvo h()). Se pueden probar con Node.

/** Crea elementos del DOM sin usar innerHTML. */
export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
  }
  appendChildren(el, children);
  return el;
}

function appendChildren(el, children) {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) appendChildren(el, c);
    else el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
}

/** Agrega hijos ignorando null/undefined/false (a diferencia de Element.append, que escribiría "null"). */
export function append(parent, ...children) {
  appendChildren(parent, children);
  return parent;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

export function todayStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return todayStr(new Date(y, m - 1, d + n));
}

export function daysBetween(a, b) {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

export function shuffle(arr, rnd = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Normalización de texto en inglés
// ---------------------------------------------------------------------------

const UNITS = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

function unifyQuotes(s) {
  return String(s ?? '').toLowerCase().replace(/[‘’ʼ`´]/g, "'");
}

/** Texto plano: minúsculas, sin apostrofes ("I'm" -> "im"), sin puntuación. Se usa para palabras clave. */
export function plain(s) {
  return unifyQuotes(s)
    .replace(/'/g, '')
    .replace(/[^a-z0-9à-ÿ\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Expande contracciones para comparar "I'm" con "I am". */
function expandContractions(s) {
  return s
    .replace(/\bwon't\b/g, 'will not')
    .replace(/\bcan't\b/g, 'can not')
    .replace(/\bcannot\b/g, 'can not')
    .replace(/\blet's\b/g, 'let us')
    .replace(/n't\b/g, ' not')
    .replace(/'m\b/g, ' am')
    .replace(/'re\b/g, ' are')
    .replace(/'ve\b/g, ' have')
    .replace(/'ll\b/g, ' will')
    .replace(/'d\b/g, ' would')
    .replace(/'s\b/g, ' is');
}

/** Convierte palabras numéricas a cifras para que "twenty" y "20" coincidan. */
function numbersToDigits(tokens) {
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t in TENS) {
      const next = tokens[i + 1];
      if (next in UNITS && UNITS[next] >= 1 && UNITS[next] <= 9) {
        out.push(String(TENS[t] + UNITS[next]));
        i++;
      } else out.push(String(TENS[t]));
    } else if (t in UNITS) out.push(String(UNITS[t]));
    else out.push(t);
  }
  return out;
}

/** Lista de palabras comparables (contracciones expandidas, números en cifras). */
export function words(s) {
  const text = expandContractions(unifyQuotes(s))
    .replace(/'/g, '')
    .replace(/[^a-z0-9à-ÿ\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return [];
  return numbersToDigits(text.split(' '));
}

export function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

/** Dos palabras se consideran iguales si coinciden o difieren en una letra (palabras largas). */
export function sameWord(a, b) {
  if (a === b) return true;
  if (a.length >= 5 && b.length >= 5) return levenshtein(a, b) <= 1;
  return false;
}

/**
 * Compara la frase objetivo con lo que dijo (o escribió) el usuario.
 * Devuelve porcentaje (0-100), cada palabra objetivo con su estado y las palabras sobrantes.
 */
export function compareSpeech(target, spoken) {
  const targetDisplay = String(target).split(/\s+/).filter(Boolean);
  // Palabras del objetivo, conservando el texto original para mostrarlo.
  const tItems = targetDisplay.map((raw) => ({ raw, norm: words(raw) }));
  const flatT = [];
  tItems.forEach((it, idx) => it.norm.forEach((w) => flatT.push({ w, idx })));
  const flatS = words(spoken);

  // LCS entre palabras objetivo y palabras dichas.
  const n = flatT.length, m = flatS.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = sameWord(flatT[i].w, flatS[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const matchedT = new Set();
  const matchedS = new Set();
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (sameWord(flatT[i].w, flatS[j])) { matchedT.add(i); matchedS.add(j); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  const status = tItems.map(() => ({ ok: 0, total: 0 }));
  flatT.forEach((f, k) => {
    status[f.idx].total++;
    if (matchedT.has(k)) status[f.idx].ok++;
  });
  const items = tItems.map((it, idx) => ({
    word: it.raw,
    ok: status[idx].total === 0 ? true : status[idx].ok === status[idx].total,
  }));
  const extra = flatS.filter((_, k) => !matchedS.has(k));
  const matched = matchedT.size;
  const percent = n + m === 0 ? 0 : Math.round((2 * matched) / (n + m) * 100);
  return { percent, items, extra, missed: items.filter((x) => !x.ok).map((x) => x.word.replace(/^[^\w']+|[^\w']+$/g, '')) };
}

// ---------------------------------------------------------------------------
// Palabras clave para la conversación guiada
// ---------------------------------------------------------------------------

function groupHit(group, text, tokenList) {
  for (const raw of group) {
    const key = plain(raw);
    if (!key) continue;
    if (key.includes(' ')) {
      if ((' ' + text + ' ').includes(' ' + key + ' ')) return true;
    } else if (tokenList.some((t) => t === key || (key.length >= 5 && levenshtein(t, key) <= 1))) {
      return true;
    }
  }
  return false;
}

/** Puntúa una rama: fracción de grupos de palabras clave presentes en el texto. */
export function scoreBranch(branch, userText) {
  const text = plain(userText);
  const tokenList = text ? text.split(' ') : [];
  const groups = branch.keys || [];
  if (!groups.length) return { score: 0, hit: [], total: 0 };
  const hit = groups.map((g) => groupHit(g, text, tokenList));
  const n = hit.filter(Boolean).length;
  return { score: n / groups.length, hit, total: groups.length };
}

/** Elige la mejor rama de un nodo. Devuelve null si ninguna alcanza su mínimo. */
export function matchBranch(node, userText) {
  let best = null;
  for (const branch of node.branches || []) {
    const r = scoreBranch(branch, userText);
    const min = branch.min ?? 1;
    if (r.score + 1e-9 >= min && r.score > 0) {
      if (!best || r.score > best.score) best = { branch, ...r };
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Diccionario local (glosario) con búsqueda tolerante a formas verbales
// ---------------------------------------------------------------------------

export function wordCandidates(raw) {
  const w = unifyQuotes(raw).replace(/^[^a-z]+|[^a-z]+$/g, '');
  const out = new Set([w]);
  const base = w.replace(/'s$/, '');
  out.add(base);
  const add = (s) => { if (s.length > 1) out.add(s); };
  if (base.endsWith('ies')) add(base.slice(0, -3) + 'y');
  if (base.endsWith('es')) add(base.slice(0, -2));
  if (base.endsWith('s')) add(base.slice(0, -1));
  if (base.endsWith('ied')) add(base.slice(0, -3) + 'y');
  if (base.endsWith('ed')) { add(base.slice(0, -2)); add(base.slice(0, -1)); const b = base.slice(0, -2); if (b.length > 2 && b[b.length - 1] === b[b.length - 2]) add(b.slice(0, -1)); }
  if (base.endsWith('ing')) { const b = base.slice(0, -3); add(b); add(b + 'e'); if (b.length > 2 && b[b.length - 1] === b[b.length - 2]) add(b.slice(0, -1)); }
  if (base.endsWith('er') || base.endsWith('ly')) add(base.slice(0, -2));
  if (base.endsWith('ier')) add(base.slice(0, -3) + 'y');
  return [...out];
}

/** Pronunciación de una palabra tal como aparece en el texto: { ipa, es } o null. */
export function lookupPronunciation(dict, raw) {
  if (!dict) return null;
  const w = unifyQuotes(raw).replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');
  return Object.prototype.hasOwnProperty.call(dict, w) ? dict[w] : null;
}

export function lookupWord(glossary, raw) {
  for (const c of wordCandidates(raw)) {
    if (Object.prototype.hasOwnProperty.call(glossary, c)) return { word: c, es: glossary[c] };
  }
  return null;
}

/** Divide una oración en partes (palabras y separadores) para poder resaltar palabra por palabra. */
export function splitWords(sentence) {
  const parts = [];
  const re = /[A-Za-z0-9À-ÿ]+(?:['’-][A-Za-z0-9À-ÿ]+)*/g;
  let last = 0, m;
  while ((m = re.exec(sentence))) {
    if (m.index > last) parts.push({ text: sentence.slice(last, m.index), word: false });
    parts.push({ text: m[0], word: true, start: m.index });
    last = m.index + m[0].length;
  }
  if (last < sentence.length) parts.push({ text: sentence.slice(last), word: false });
  return parts;
}
