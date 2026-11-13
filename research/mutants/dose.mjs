// Dose response for a graded task.
//
// `tasks-base.json` says what each task reads on an unrepaired tree. That is one
// point, and one point cannot show that the quantity is graded rather than a
// disguised boolean. This measures the same task on the same sample at several
// levels of repair -- the trees produced by real recorded attempts -- and prints
// them side by side.
//
// Usage:
//   node research/mutants/dose.mjs --module=src/runtime/triangle.js \
//     --specs=tests/a.test.mjs,tests/b.test.mjs \
//     --patches=<abs path>,<abs path> [--sample=20] [--every=1] [--out=file.json]
//
// Levels are: bare tree, then each patch in the order given, each applied on top
// of the bare tree (not cumulatively) so every row is an independent reading of
// one repair. `--every=1` means all 65 candidates rather than a 20-mutant sample,
// which is slower but has no sampling noise at all.
import { execFileSync, execSync } from 'node:child_process'
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = /^--([^=]+)=(.*)$/.exec(a)
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true]
  }),
)
if (!args.module || !args.specs) {
  console.error('usage: node research/mutants/dose.mjs --module=<file> --specs=<a,b> --patches=<p1,p2> [--sample=20]')
  process.exit(2)
}
const moduleFile = String(args.module)
const specs = String(args.specs)
const patches = args.patches ? String(args.patches).split(',').filter(Boolean) : []
const every = Boolean(args.every)
const sample = every ? 0 : Number(args.sample ?? 20)
const TASK = resolve('research/mutants/task.mjs')
const REPO = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim()

const dir = mkdtempSync(join(tmpdir(), 'loom-dose-'))
execSync(`git worktree add --detach "${dir}" HEAD`, { cwd: REPO, stdio: 'ignore' })

const clean = () => {
  execSync('git checkout -- .', { cwd: dir })
  execSync('git clean -fdq', { cwd: dir })
}

const read = (label) => {
  let out = ''
  let ok = true
  try {
    out = execFileSync(process.execPath, [TASK, `--module=${moduleFile}`, `--specs=${specs}`, `--sample=${sample || 1}`],
      { cwd: dir, encoding: 'utf8', maxBuffer: 8 << 20 })
  } catch (err) {
    ok = false
    out = String(err.stdout ?? '') + String(err.stderr ?? '')
  }
  const m = /KILLRATE=([0-9.]+)/.exec(out)
  const killed = /killed=(\d+)/.exec(out)
  const tried = /tried=(\d+)/.exec(out)
  const rate = m ? Number(m[1]) : null
  if (rate === null) throw new Error(`${label}: verifier printed no KILLRATE\n${out.slice(0, 800)}`)
  return {
    level: label,
    killRate: rate,
    killed: killed ? Number(killed[1]) : null,
    tried: tried ? Number(tried[1]) : null,
    ok,
  }
}

const rows = []
try {
  rows.push(read('bare'))
  for (const p of patches) {
    clean()
    try {
      execSync(`git apply "${p}"`, { cwd: dir, stdio: 'pipe' })
    } catch {
      // A recorded patch can stop applying once HEAD has moved past it. That is
      // a fact about the patch, not about the task, so it gets a row instead of
      // failing the whole run: the row says the level could not be built.
      rows.push({ level: p.split(/[\\/]/).pop(), applied: false, killRate: null })
      continue
    }
    rows.push({ ...read(p.split(/[\\/]/).pop()), applied: true })
  }
} finally {
  try { clean() } catch {}
  try {
    execSync(`git worktree remove --force "${dir}"`, { cwd: REPO, stdio: 'ignore' })
  } catch {
    rmSync(dir, { recursive: true, force: true })
    execSync('git worktree prune', { cwd: REPO, stdio: 'ignore' })
  }
}

const measured = rows.filter((r) => typeof r.killRate === 'number')
const distinct = new Set(measured.map((r) => r.killRate)).size
console.log(`dose: ${moduleFile} sample=${sample || 'all'} rows=${rows.length} distinct=${distinct}`)
for (const r of rows) {
  const rate = typeof r.killRate === 'number' ? r.killRate.toFixed(4) : '  n/a '
  const counts = r.tried === null || r.tried === undefined ? '     ' : `${r.killed}/${r.tried}`
  console.log(`  ${rate}  ${counts}  ${r.level}${r.applied === false ? ' (does not apply)' : ''}`)
}
const out = {
  measuredAt: new Date().toISOString(),
  module: moduleFile,
  specs: specs.split(','),
  sample: sample || 'all',
  distinct,
  graded: distinct === measured.length && measured.length > 1,
  rows,
}
if (args.out) {
  writeFileSync(args.out, JSON.stringify(out, null, 1) + '\n')
  console.log(`wrote ${args.out}`)
}
