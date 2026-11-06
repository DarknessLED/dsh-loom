/**
 * Spec: the contract doc must keep up with the code the loop writes.
 *
 * Tonight the loop added a dozen modules (quality, plateau, deferred, exposure,
 * sampling, selector, ids, lease, watchdog, board, brief, ...) and `docs/
 * contracts.md` still describes the plugin as it was at M1. A human landing
 * cold cannot tell what exists. Documentation that only a human updates rots
 * exactly when the loop runs fastest, so the loop has to be able to fix it.
 *
 * A bare path list is not documentation: every line that mentions a module must
 * also say what the module is for.
 */
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

let passed = 0
let failed = 0
function test(name, fn) {
  try {
    fn()
    passed++
    console.log(`ok ${passed + failed} - ${name}`)
  } catch (err) {
    failed++
    console.log(`not ok ${passed + failed} - ${name}`)
    console.log(`  ${String(err?.message ?? err).split('\n').join('\n  ')}`)
  }
}

const root = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const doc = readFileSync(join(root, 'docs', 'contracts.md'), 'utf8')
const docLines = doc.split(/\r?\n/)

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (name.endsWith('.js')) out.push(full)
  }
  return out
}

const modules = walk(join(root, 'src'))
  .map((f) => relative(root, f).split(sep).join('/'))
  .sort()

const lineFor = (mod) => docLines.find((l) => l.includes(mod))

test('every module under src/ is named in docs/contracts.md', () => {
  const missing = modules.filter((m) => !lineFor(m))
  assert.deepEqual(missing, [], `undocumented modules: ${missing.join(', ')}`)
})

test('each module line says what the module is for, not just its path', () => {
  const thin = []
  for (const mod of modules) {
    const line = lineFor(mod)
    if (!line) continue
    const rest = line.slice(line.indexOf(mod) + mod.length).replace(/[`*_\-–—|]/g, '').trim()
    if (rest.length < 15) thin.push(`${mod} ("${rest}")`)
  }
  assert.deepEqual(thin, [], `module lines without an explanation: ${thin.join(', ')}`)
})

test('the module map is grouped under headings, not one flat dump', () => {
  const headings = docLines.filter((l) => /^##\s+\S/.test(l)).length
  assert.ok(headings >= 8, `expected the doc to stay sectioned, found ${headings} headings`)
})

console.log(`\n${passed}/${passed + failed} passed (${modules.length} modules)`)
if (failed > 0) process.exitCode = 1
