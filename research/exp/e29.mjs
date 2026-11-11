// Mutation audit across the core modules, not just one. The question the literature
// says is the ceiling: how much behaviour does our own suite actually pin down?
// No model calls: text mutations + the real verifier.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const NODE = process.env.LOOM_NODE || process.execPath

const TARGETS = [
  { file: 'src/knowledge/select.js', cmd: 'node tests/knowledge/no-work-is-not-knowledge.test.mjs' },
  { file: 'src/knowledge/impact.js', cmd: 'node tests/knowledge/a-lesson-is-about-a-file.test.mjs' },
  { file: 'src/gate/gate.js', cmd: 'node tests/gate.test.mjs' },
  { file: 'src/runtime/selector.js', cmd: 'node tests/selector.test.mjs' },
]

const MUTATIONS = [
  { name: 'true->false', find: 'true', replace: 'false', nth: 1 },
  { name: '=== -> !==', find: ' === ', replace: ' !== ', nth: 1 },
  { name: '>= -> >', find: ' >= ', replace: ' > ', nth: 1 },
  { name: '<= -> <', find: ' <= ', replace: ' < ', nth: 1 },
  { name: '&& -> ||', find: ' && ', replace: ' || ', nth: 1 },
  { name: '|| -> &&', find: ' || ', replace: ' && ', nth: 1 },
  { name: '+ 1 -> + 2', find: '+ 1', replace: '+ 2', nth: 1 },
  { name: 'null -> 0', find: 'null', replace: '0', nth: 1 },
  { name: 'Math.min->max', find: 'Math.min', replace: 'Math.max', nth: 1 },
  { name: 'return x -> return', find: 'return ', replace: 'return undefined; //', nth: 2 },
]

async function testPasses() {
  try {
    await run(NODE, ['scripts/_one.mjs'], { cwd: process.cwd(), timeout: 120000, env: { ...process.env } })
    return null
  } catch (e) {
    return String(e.code ?? e.message).slice(0, 60)
  }
}

// a tiny runner so we can point at one spec at a time
fs.writeFileSync(
  'scripts/_one.mjs',
  `import { pathToFileURL } from 'node:url'\nawait import(pathToFileURL(process.env.LOOM_SPEC).href)\n`,
)

const results = []
for (const t of TARGETS) {
  if (!fs.existsSync(t.file)) { results.push({ file: t.file, skipped: 'missing' }); continue }
  const original = fs.readFileSync(t.file, 'utf8')
  const specPath = t.cmd.replace(/^node /, '')
  if (!fs.existsSync(specPath)) { results.push({ file: t.file, skipped: 'no spec ' + specPath }); continue }
  process.env.LOOM_SPEC = path.resolve(specPath)
  let killed = 0, tried = 0
  const survivors = []
  for (const m of MUTATIONS) {
    let idx = -1
    for (let i = 0; i < m.nth; i += 1) { idx = original.indexOf(m.find, idx + 1); if (idx < 0) break }
    if (idx < 0) continue
    tried += 1
    const mutated = original.slice(0, idx) + m.replace + original.slice(idx + m.find.length)
    fs.writeFileSync(t.file, mutated)
    const fail = await testPasses()
    fs.writeFileSync(t.file, original)
    if (fail) killed += 1
    else survivors.push(m.name)
  }
  results.push({ file: t.file, spec: specPath, tried, killed, score: tried ? +(killed / tried).toFixed(3) : null, survivors })
  fs.writeFileSync(t.file, original)
}
fs.unlinkSync('scripts/_one.mjs')
console.log(JSON.stringify(results, null, 2))
