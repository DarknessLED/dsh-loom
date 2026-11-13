// Apply one mutant at a time, ask the module's guard specs whether it survives,
// restore the bytes, record. The tree must be byte-identical at the end or the
// run refuses to write its result.
//
// Usage: node research/mutants/run.mjs --module=src/gate/gate.js [--split=all]
//        [--limit=5] [--suite=focal|guard]
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import { plan, slug } from './gen.mjs'

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? 'true']
  }),
)
const moduleFile = args.module
if (!moduleFile) { console.error('need --module='); process.exit(2) }
const split = args.split || 'all'
const limit = args.limit ? Number(args.limit) : Infinity
const suite = args.suite || 'guard'

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').slice(0, 16)
const original = fs.readFileSync(moduleFile)
const originalSha = sha(original)

// guard set: every spec under tests/ that imports this module by filename
function guardSet(file) {
  const base = path.basename(file)
  const re = new RegExp(`from\\s+['"][^'"]*${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`)
  const out = []
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) walk(p)
      else if (e.name.endsWith('.test.mjs') && re.test(fs.readFileSync(p, 'utf8'))) out.push(p)
    }
  }
  walk('tests')
  return out.sort()
}

const entry = plan().find((m) => m.module === moduleFile)
if (!entry) { console.error('module not in plan:', moduleFile); process.exit(2) }
const specs = suite === 'focal' ? [entry.focal] : guardSet(moduleFile)
if (!specs.length) { console.error('no guard specs found for', moduleFile); process.exit(2) }
if (specs.some((s) => !fs.existsSync(s))) { console.error('missing guard spec', specs.find((s) => !fs.existsSync(s))); process.exit(2) }

const restore = () => fs.writeFileSync(moduleFile, original)
process.on('exit', restore)
process.on('SIGINT', () => { restore(); process.exit(130) })

function runSpec(spec) {
  return new Promise((resolve) => {
    const t0 = Date.now()
    const child = spawn(process.execPath, [spec], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env } })
    let err = ''
    child.stderr.on('data', (d) => { err += d })
    child.stdout.on('data', () => {})
    const timer = setTimeout(() => child.kill('SIGKILL'), 120000)
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ code, ms: Date.now() - t0, err: err.slice(-400) })
    })
  })
}

const outFile = `research/mutants/${entry.slug}.json`
const result = {
  module: moduleFile,
  slug: entry.slug,
  heldSha: originalSha,
  suite,
  specs,
  startedAt: new Date().toISOString(),
  rows: [],
}

const todo = entry.mutants.filter((m) => (split === 'all' ? true : m.split === split)).slice(0, limit)
for (const m of todo) {
  const mutated = Buffer.concat([
    original.subarray(0, m.offset),
    Buffer.from(m.replace, 'latin1'),
    original.subarray(m.offset + m.find.length),
  ])
  if (mutated.equals(original)) { result.rows.push({ ...m, killed: null, via: 'no-change' }); continue }
  let row
  try {
    fs.writeFileSync(moduleFile, mutated)
    let killed = false
    let via = ''
    let ms = 0
    for (const spec of specs) {
      const r = await runSpec(spec)
      ms += r.ms
      if (r.code !== 0) {
        killed = true
        via = /SyntaxError|Cannot find module|ReferenceError: .* is not defined/.test(r.err) ? 'load-error' : `fail:${path.basename(spec)}`
        break
      }
    }
    row = { ...m, killed, via: via || 'survived', ms }
  } finally {
    restore()
    const now = sha(fs.readFileSync(moduleFile))
    if (now !== originalSha) throw new Error(`tree not restored: ${moduleFile} ${originalSha} -> ${now}`)
  }
  result.rows.push(row)
  fs.writeFileSync(outFile, JSON.stringify({ ...result, updatedAt: new Date().toISOString() }, null, 1))
}

const tried = result.rows.filter((r) => r.killed !== null).length
const killed = result.rows.filter((r) => r.killed === true).length
const lead = result.rows.filter((r) => r.killed === false && r.ms > 60000).length
result.score = tried ? +(killed / tried).toFixed(4) : null
result.tried = tried
result.killed = killed
result.slowSurvivors = lead
fs.writeFileSync(outFile, JSON.stringify(result, null, 1))
console.log(JSON.stringify({ module: moduleFile, suite, specs: specs.length, tried, killed, score: result.score, slowSurvivors: lead }))
