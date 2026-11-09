import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, out)
    else if (name.endsWith('.js')) out.push(path)
  }
  return out
}

const roots = ['src', 'client', 'scripts']
const files = roots.flatMap((r) => walk(r))
const sources = files.map((f) => [f.replace(/\\/g, '/'), readFileSync(f, 'utf8')])
// Also count usage from the spec suite: a helper only tests use is still dead
// code in production, so report it separately.
const specFiles = walk('tests')
const specs = specFiles.map((f) => readFileSync(f, 'utf8')).join('\n')

const rows = []
for (const [file, src] of sources) {
  const re = /export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/g
  for (const match of src.matchAll(re)) {
    const name = match[1]
    const word = new RegExp('\\b' + name + '\\b')
    let usedBy = 0
    for (const [other, text] of sources) {
      if (other === file) continue
      if (word.test(text)) usedBy += 1
    }
    if (usedBy === 0) {
      const inSpecs = word.test(specs)
      rows.push((inSpecs ? 'SPEC-ONLY ' : 'DEAD      ') + file + ' :: ' + name)
    }
  }
}
console.log(rows.length ? rows.join('\n') : 'every export is used outside its own file')
console.log('---')
console.log('checked ' + sources.length + ' files in ' + roots.join(', '))
