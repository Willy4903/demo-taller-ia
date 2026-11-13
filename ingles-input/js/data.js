// Carga el contenido desde los archivos JSON de la carpeta data/.
// Las rutas son relativas a este módulo, por eso funcionan igual en localhost y en GitHub Pages.

const FILES = ['situations', 'stories', 'dialogues', 'phrases', 'grammar', 'glossary', 'pronunciation'];

export async function loadData() {
  const entries = await Promise.all(
    FILES.map(async (name) => {
      const url = new URL(`../data/${name}.json`, import.meta.url);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`No se pudo cargar ${name}.json (${res.status})`);
      return [name, await res.json()];
    }),
  );
  const data = Object.fromEntries(entries);
  data.situationById = Object.fromEntries(data.situations.map((s) => [s.id, s]));
  data.grammarById = Object.fromEntries(data.grammar.map((g) => [g.id, g]));
  data.phraseById = Object.fromEntries(data.phrases.map((p) => [p.id, p]));
  data.storyById = Object.fromEntries(data.stories.map((s) => [s.id, s]));
  data.dialogueById = Object.fromEntries(data.dialogues.map((d) => [d.id, d]));
  return data;
}
