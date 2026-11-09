import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = process.argv[2] ?? '.'
const files = []
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p)
    else if (name.endsWith('.js') || name.endsWith('.mjs')) files.push(p)
  }
}
walk(join(root, 'src'))
walk(join(root, 'client'))
walk(join(root, 'scripts'))
walk(join(root, 'tests'))

const sources = new Map(files.map((f) => [f, readFileSync(f, 'utf8')]))
const exported = []
for (const f of files) {
  if (!f.includes(`${join(root, 'src')}`) && !f.includes(`${join(root, 'client')}`)) continue
  const text = sources.get(f)
  for (const m of text.matchAll(/export (?:async )?function (\w+)/g)) exported.push({ name: m[1], file: f })
  for (const m of text.matchAll(/export const (\w+) =/g)) exported.push({ name: m[1], file: f })
  for (const m of text.matchAll(/exports\.__panel\s*=|__panel\s*=\s*\{/g)) {
    /* ignore */
  }
}

const rows = []
for (const { name, file } of exported) {
  let outside = 0
  let inTests = 0
  const word = new RegExp(`\\b${name}\\b`)
  for (const [f, text] of sources) {
    if (f === file) continue
    if (!word.test(text)) continue
    if (f.includes('tests')) inTests += 1
    else outside += 1
  }
  if (outside === 0) rows.push({ name, file: file.replace(root, ''), inTests })
}
console.log(`exports never referenced outside their own file: ${rows.length}`)
const dead = rows.filter((r) => r.inTests === 0)
const specOnly = rows.filter((r) => r.inTests > 0)
console.log(`\nDEAD (no test either): ${dead.length}`)
for (const r of dead) console.log(`  ${r.name.padEnd(28)} ${r.file}`)
console.log(`\nSPEC-ONLY (a test names it, no production caller): ${specOnly.length}`)
for (const r of specOnly) console.log(`  ${r.name.padEnd(28)} ${r.file}  (${r.inTests} test file(s))`)
