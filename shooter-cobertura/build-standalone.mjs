// Genera salar-rojo.html: el juego completo en un solo archivo que se abre con doble clic.
// Uso: node shooter-cobertura/build-standalone.mjs   (descarga esbuild con npx la primera vez)
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const js = execFileSync('npx', ['--yes', 'esbuild', join(dir, 'js/main.js'), '--bundle', '--format=esm', '--minify', '--legal-comments=none'], {
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
}).replace(/<\/script/g, '<\\/script')

const tag = '<script type="module" src="./js/main.js"></script>'
const html = readFileSync(join(dir, 'index.html'), 'utf8')
if (!html.includes(tag)) throw new Error('No se encontró la etiqueta del script en index.html')
writeFileSync(join(dir, 'salar-rojo.html'), html.replace(tag, () => `<script type="module">\n${js}\n</script>`))
console.log('salar-rojo.html generado')
