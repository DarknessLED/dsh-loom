// The gate refuses a patch that edits `tests/`, because a candidate that can edit
// the tests can make any verifier pass. But that regex is the only place the rule
// is written down, and it names a DIRECTORY, not the file the verifier runs. A
// task whose acceptance command points anywhere else hands the candidate the
// oracle itself.
//
// This counts how often that happens in our own registry: for every registered
// task, take the command's first token, resolve it against the workspace, and ask
// whether `patchTouchesTests` would have refused an edit to it.
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const LOOM = process.env.LOOM_HOME || 'C:/Users/Darkness/.dsh/loom'
const VIEWS = join(LOOM, 'campaigns')
const TEST_PATH_RE = /^tests(?:[/\\]|$)/

const tasks = new Map()
for (const name of readdirSync(VIEWS)) {
  const p = join(VIEWS, name, 'views', 'state.json')
  if (!existsSync(p)) continue
  let doc
  try { doc = JSON.parse(readFileSync(p, 'utf8')) } catch { continue }
  const list = doc?.evalset?.tasks ?? doc?.tasks ?? []
  if (!Array.isArray(list)) continue
  const ws = doc.workspace ?? ''
  for (const t of list) {
    if (!t?.verify?.cmd) continue
    if (!tasks.has(t.id)) tasks.set(t.id, { cmd: t.verify.cmd, ws, campaign: doc.id ?? name })
  }
}

const split = (cmd) => cmd.split(/\s*&&\s*/)[0].trim()
const INTERP = /^(?:node|npx|pnpm|npm|yarn|python|bash|sh|cmd)(?:\.exe)?$/i
// The script a command runs is the first non-flag token that is NOT an
// interpreter: `node.exe script.mjs && node.exe suite.mjs` runs script.mjs, and
// skipping the interpreter is what makes the comparison against tests/ mean
// anything.
const firstPath = (cmd) => {
  const toks = split(cmd).match(/"[^"]+"|'[^']+'|\S+/g) ?? []
  let sawInterp = false
  for (const tok of toks) {
    const t = tok.replace(/^["']|["']$/g, '')
    if (/^-/.test(t)) continue
    if (INTERP.test(t.split(/[\\/]/).pop())) { sawInterp = true; continue }
    if (sawInterp || /\.[cm]?js$/i.test(t)) return t
    return t
  }
  return null
}

let total = 0
const guarded = []
const exposed = []
for (const [id, t] of tasks) {
  const p = firstPath(t.cmd)
  total += 1
  if (!p) { guarded.push({ id, cmd: t.cmd, why: 'no path token (inline command)' }); continue }
  const norm = p.replace(/\\/g, '/').replace(/^\.\//, '')
  const abs = /^[a-z]:\//i.test(norm) ? norm : null
  const rel = abs ? abs.slice(abs.toLowerCase().indexOf('/projects/') + 1) : norm
  const insideTests = TEST_PATH_RE.test(rel) || /(^|\/)tests\//.test(rel)
  const row = { id, cmd: t.cmd, path: p, campaign: t.campaign }
  if (insideTests) guarded.push(row); else exposed.push(row)
}

console.log(`tasks with a verify command: ${total}`)
console.log(`  oracle file under tests/ (edit refused by testsClean): ${guarded.length}`)
console.log(`  oracle file elsewhere (candidate may rewrite the oracle): ${exposed.length}`)
const byFile = {}
for (const r of exposed) { const k = r.path.replace(/\\/g, '/'); byFile[k] = (byFile[k] || 0) + 1 }
console.log('  exposed oracle files:', JSON.stringify(byFile, null, 1).slice(0, 1200))
for (const r of exposed.slice(0, 10)) console.log(`   - ${r.id} :: ${r.cmd}`)
