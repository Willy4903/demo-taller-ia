// Pruebas de la lógica pura y del contenido. Ejecutar con:  node --test tests/logica.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compareSpeech, matchBranch, words, plain, lookupWord, splitWords } from '../js/util.js';
import { sm2, newCard, QUALITY } from '../js/srs.js';
import { nextLevel, rank } from '../js/adapt.js';
import { recordFail, recordSuccess } from '../js/grammar.js';
import { createStore, sanitize, computeStreak, DEFAULTS } from '../js/store.js';

const read = (f) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8'));
const stories = read('stories.json');
const dialogues = read('dialogues.json');
const phrases = read('phrases.json');
const situations = read('situations.json');
const grammar = read('grammar.json');
const glossary = read('glossary.json');

test('contenido: cantidades mínimas', () => {
  assert.ok(stories.length >= 10);
  assert.ok(dialogues.length >= 10);
  assert.ok(phrases.length >= 100);
});

test('contenido: historias de 80 a 150 palabras y traducción alineada', () => {
  for (const s of stories) {
    const n = s.sentences.map((x) => x.en).join(' ').split(/\s+/).length;
    assert.ok(n >= 80 && n <= 150, `${s.id} tiene ${n} palabras`);
    for (const x of s.sentences) assert.ok(x.en && x.es, `${s.id} con oración vacía`);
    assert.ok(situations.some((x) => x.id === s.situation), `${s.id} situación desconocida`);
  }
});

test('contenido: todas las palabras de las historias tienen definición local', () => {
  const missing = [];
  for (const s of stories) for (const x of s.sentences) for (const p of splitWords(x.en)) if (p.word && !lookupWord(glossary, p.text)) missing.push(p.text);
  assert.deepEqual(missing, []);
});

test('contenido: frases con situación, dificultad y gramática válidas', () => {
  const tags = new Set(grammar.map((g) => g.id));
  const ids = new Set();
  for (const p of phrases) {
    assert.ok(!ids.has(p.id), `id repetido ${p.id}`);
    ids.add(p.id);
    assert.ok(situations.some((s) => s.id === p.situation), p.id);
    assert.ok([1, 2, 3].includes(p.difficulty), p.id);
    assert.ok(tags.has(p.grammar), `${p.id}: gramática ${p.grammar}`);
    assert.ok(p.en && p.es);
  }
});

test('contenido: cada situación tiene al menos una historia, un diálogo y frases', () => {
  for (const s of situations) {
    assert.ok(stories.some((x) => x.situation === s.id), `historia ${s.id}`);
    assert.ok(dialogues.some((x) => x.situation === s.id), `diálogo ${s.id}`);
    assert.ok(phrases.filter((x) => x.situation === s.id).length >= 10, `frases ${s.id}`);
  }
});

test('contenido: los diálogos son grafos válidos y cada rama acepta su propia respuesta modelo', () => {
  const tags = new Set(grammar.map((g) => g.id));
  for (const d of dialogues) {
    assert.ok(d.nodes[d.start], `${d.id}: nodo inicial`);
    const reachable = new Set();
    const walk = (id) => {
      if (reachable.has(id)) return;
      reachable.add(id);
      for (const b of d.nodes[id].branches || []) walk(b.next);
    };
    walk(d.start);
    for (const [id, node] of Object.entries(d.nodes)) {
      assert.ok(node.say && node.es, `${d.id}/${id}: texto`);
      if (node.grammar) assert.ok(tags.has(node.grammar), `${d.id}/${id}: gramática ${node.grammar}`);
      if (node.end) {
        assert.ok(!node.branches, `${d.id}/${id}: un final no tiene ramas`);
        continue;
      }
      assert.ok(node.branches?.length, `${d.id}/${id}: sin ramas`);
      for (const b of node.branches) {
        assert.ok(d.nodes[b.next], `${d.id}/${id}: destino ${b.next} no existe`);
        assert.ok(b.model && b.modelEs, `${d.id}/${id}: modelo`);
        const m = matchBranch(node, b.model);
        assert.ok(m, `${d.id}/${id}: la respuesta modelo "${b.model}" no pasa su propia validación`);
      }
    }
    assert.equal(reachable.size, Object.keys(d.nodes).length, `${d.id}: hay nodos inalcanzables`);
    assert.ok([...reachable].some((id) => d.nodes[id].end), `${d.id}: sin final`);
  }
});

test('comparación: coincidencia exacta y contracciones', () => {
  assert.equal(compareSpeech("I'm from Peru", 'I am from Peru').percent, 100);
  assert.equal(compareSpeech('Hello, my name is Ana.', 'hello my name is ana').percent, 100);
});

test('comparación: números en palabras y cifras coinciden', () => {
  assert.equal(compareSpeech('My flight leaves at six thirty.', 'my flight leaves at 6 30').percent, 100);
  assert.deepEqual(words('twenty-eight years'), ['28', 'years']);
});

test('comparación: señala palabras falladas', () => {
  const r = compareSpeech('Turn left at the corner', 'turn right at the corner');
  assert.deepEqual(r.missed, ['left']);
  assert.ok(r.percent > 60 && r.percent < 100);
  assert.deepEqual(r.extra, ['right']);
});

test('comparación: silencio da 0 y todo falla', () => {
  const r = compareSpeech('Good morning', '');
  assert.equal(r.percent, 0);
  assert.equal(r.missed.length, 2);
});

test('palabras clave: tolera contracciones, mayúsculas y errores de una letra', () => {
  const node = { branches: [{ keys: [['name', 'im', 'i am']], min: 1 }] };
  assert.ok(matchBranch(node, "I'm Luis"));
  assert.ok(matchBranch(node, 'My NAME is Luis'));
  assert.ok(matchBranch(node, 'I am Luis'));
  assert.equal(matchBranch(node, 'Luis'), null);
  assert.ok(matchBranch({ branches: [{ keys: [['elevator']] }] }, 'where is the elevater'));
});

test('palabras clave: grupos múltiples con mínimo parcial', () => {
  const node = { branches: [{ keys: [['straight', 'two'], ['left', 'bank'], ['park', 'next']], min: 0.6 }] };
  assert.ok(matchBranch(node, 'go straight then left'));
  assert.equal(matchBranch(node, 'go straight'), null);
});

test('plain quita apostrofes y puntuación', () => {
  assert.equal(plain("It's O'Clock!"), 'its oclock');
});

test('glosario: formas verbales y plurales', () => {
  assert.equal(lookupWord(glossary, 'planes').word, 'plane');
  assert.equal(lookupWord(glossary, 'stopped').word, 'stop');
  assert.equal(lookupWord(glossary, 'tries').word, 'try');
  assert.equal(lookupWord(glossary, 'zzzz'), null);
});

test('SM-2: intervalos 1, 6 y luego multiplicados por el factor', () => {
  let c = newCard('2026-01-01');
  c = sm2(c, QUALITY.fair, '2026-01-01');
  assert.equal(c.interval, 1);
  assert.equal(c.due, '2026-01-02');
  c = sm2(c, QUALITY.fair, '2026-01-02');
  assert.equal(c.interval, 6);
  c = sm2(c, QUALITY.easy, '2026-01-08');
  assert.ok(c.interval >= 14);
  assert.ok(c.ef > 2.4);
});

test('SM-2: un olvido reinicia la tarjeta y vence hoy', () => {
  let c = { ...newCard('2026-01-01'), reps: 4, interval: 30 };
  c = sm2(c, QUALITY.hard, '2026-02-01');
  assert.equal(c.reps, 0);
  assert.equal(c.due, '2026-02-01');
  assert.equal(c.lapses, 1);
  assert.ok(c.ef >= 1.3);
});

test('adaptación: muy fácil sube, difícil baja, siempre entre 1 y 3', () => {
  assert.ok(nextLevel(1.5, 2, 'easy') > 1.5);
  assert.ok(nextLevel(2, 2, 'hard') < 2);
  assert.equal(nextLevel(3, 3, 'easy'), 3);
  assert.equal(nextLevel(1, 1, 'hard'), 1);
  const fair = nextLevel(1, 3, 'fair');
  assert.ok(fair > 1 && fair < 3);
});

test('adaptación: recomienda lo cercano al nivel y evita repetir lo de hoy', () => {
  const items = [{ id: 'a', difficulty: 1 }, { id: 'b', difficulty: 2 }, { id: 'c', difficulty: 3 }];
  const keyOf = (i) => `x:${i.id}`;
  let r = rank(items, { kind: 'input', level: 2.9, ratings: {}, keyOf });
  assert.equal(r[0].item.id, 'c');
  r = rank(items, { kind: 'input', level: 1, ratings: { 'x:a': { last: 'fair', n: 1, at: Date.now() } }, keyOf });
  assert.notEqual(r[0].item.id, 'a');
});

test('gramática: la explicación aparece al tercer fallo y respeta el enfriamiento', () => {
  const st = DEFAULTS();
  const t = 1.7e12;
  assert.equal(recordFail(st, 'be', t), null);
  assert.equal(recordFail(st, 'be', t + 1), null);
  assert.equal(recordFail(st, 'be', t + 2), 'be');
  assert.deepEqual(st.grammar.unlocked, ['be']);
  recordFail(st, 'be', t + 3);
  recordFail(st, 'be', t + 4);
  assert.equal(recordFail(st, 'be', t + 5), null, 'sin repetir dentro del enfriamiento');
  assert.equal(recordFail(st, 'be', t + 7 * 3600 * 1000), 'be', 'vuelve a aparecer pasado el enfriamiento');
});

test('gramática: los aciertos restan para que solo aparezca con errores recurrentes', () => {
  const st = DEFAULTS();
  recordFail(st, 'modals', 1);
  recordFail(st, 'modals', 2);
  recordSuccess(st, 'modals');
  assert.equal(recordFail(st, 'modals', 3), null);
});

test('almacenamiento: exportar e importar conserva los datos', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
  const a = createStore(storage);
  a.update((s) => { s.saved.hello = { word: 'hello', es: 'hola', sentence: 'Hello!', sentenceEs: '¡Hola!', storyId: 's01', at: 1 }; s.settings.speed = 0.7; });
  const json = a.exportJson();
  const b = createStore({ getItem: () => null, setItem() {}, removeItem() {} });
  b.importJson(json);
  assert.equal(b.get().saved.hello.es, 'hola');
  assert.equal(b.get().settings.speed, 0.7);
});

test('almacenamiento: rechaza archivos ajenos o corruptos', () => {
  const s = createStore({ getItem: () => null, setItem() {}, removeItem() {} });
  assert.throws(() => s.importJson('no es json'), /JSON/);
  assert.throws(() => s.importJson('{"app":"otra","data":{}}'), /copia de seguridad/);
  assert.throws(() => s.importJson('[]'), /copia de seguridad/);
});

test('almacenamiento: sanitize descarta valores fuera de rango o con tipo incorrecto', () => {
  const d = sanitize({ settings: { speed: 9, theme: 'x', fontScale: 'a' }, level: { input: 99 }, cards: { a: { due: 'mañana' }, b: { due: '2026-01-01', ef: 0 } }, days: { hoy: {} } });
  assert.equal(d.settings.speed, 1);
  assert.equal(d.settings.theme, 'auto');
  assert.equal(d.level.input, 3);
  assert.equal(d.cards.a, undefined);
  assert.equal(d.cards.b.ef, 1.3);
  assert.deepEqual(d.days, {});
});

test('racha: cuenta días consecutivos con al menos 5 minutos', () => {
  const day = (min) => ({ input: min * 60, shadowing: 0, convo: 0, review: 0, done: {} });
  const days = { '2026-03-10': day(6), '2026-03-09': day(10), '2026-03-08': day(2), '2026-03-07': day(20) };
  assert.equal(computeStreak(days, '2026-03-10'), 2);
  assert.equal(computeStreak(days, '2026-03-11'), 2, 'si hoy no estudiaste aún, no se rompe la racha');
  assert.equal(computeStreak({}, '2026-03-10'), 0);
});
