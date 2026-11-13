// The graded verifier for a "harden this file's tests" task.
//
// Protocol: always exit 0 and print a 0..1 reading, because the task is graded
// and a graded task signals progress with the number, not with the exit code
// (src/gate/earned.js explains why the gate needs both readings).
//
//   KILLRATE=0.3750
//   MUTANTS tried=16 killed=6 skipped=0 specs=2 ms=6104
//
// Two properties make the number usable:
//
//   1. The mutant sample is deterministic per file and independent of position,
//      so round 7 measures the same 16 mutants round 3 did. Ordering is by
//      sha256("<slug>:<index>"), not by file offset, so adding a pattern later
//      does not reshuffle the sample.
//   2. A guard spec that reads the module's own source is refused. A test that
//      asserts `readFileSync('src/x.js') === <snapshot>` kills 100% of mutants
//      while pinning nothing, and that is the one cheat this instrument invites.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import { mutantsFor, slug } from './gen.mjs'
import { guardSet } from './plan-all.mjs'

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? 'true']
  }),
)
const moduleFile = args.module
if (!moduleFile) { console.error('need --module='); process.exit(2) }
const sample = Number(args.sample ?? 16)
const maxSpecs = Number(args.maxSpecs ?? 3)
const budgetMs = Number(args.budgetMs ?? 600000)

// One measurement at a time per repository.
//
// A guard spec imports half the tree, so while this process has src/x.js mutated
// every *other* spec that touches x.js reads a corrupted module. Parallel
// readings are therefore not independent -- they contaminate each other, and the
// first baseline showed exactly that (one mutant "killed" only when six other
// modules were being mutated at the same time). A candidate's worktree is its own
// repository, so rounds in parallel still get their own lock and their own copy.
{
  const { createHash } = await import('node:crypto')
  const { mkdirSync, rmSync, statSync } = await import('node:fs')
  const { execFileSync } = await import('node:child_process')
  const os = await import('node:os')
  const p = await import('node:path')
  let root = p.dirname(p.resolve(moduleFile))
  try {
    root = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: root, encoding: 'utf8', windowsHide: true }).trim() || root
  } catch {}
  const key = createHash('sha256').update(root.toLowerCase()).digest('hex').slice(0, 12)
  const lockPath = p.join(os.tmpdir(), `dsh-mut-${key}.lock`)
  const alive = (pid) => {
    try { process.kill(pid, 0); return true } catch { return false }
  }
  const acquire = () => {
    for (let i = 0; i < 2400; i += 1) {
      try {
        mkdirSync(lockPath)
        fs.writeFileSync(p.join(lockPath, 'owner'), String(process.pid))
        return true
      } catch {
        let holder = null
        try { holder = Number(fs.readFileSync(p.join(lockPath, 'owner'), 'utf8')) } catch {}
        let stale = false
        try { stale = Date.now() - statSync(lockPath).mtimeMs > 20 * 60_000 } catch {}
        if (holder && !alive(holder)) stale = true
        if (stale) { try { rmSync(lockPath, { recursive: true, force: true }) } catch {}; continue }
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500)
      }
    }
    return false
  }
  if (!acquire()) { console.error('another measurement holds the lock, refusing to interleave'); process.exit(7) }
  const release = () => { try { rmSync(lockPath, { recursive: true, force: true }) } catch {} }
  process.on('exit', release)
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { release(); process.exit(130) })
}

// A dirty module is reported, not refused.
//
// This check used to exit 6, on the reasoning that the snapshot below is what
// every mutant is restored to, so a dirty file would bless someone else's edit
// as "the original". The reasoning was wrong about the risk: the snapshot is
// byte-exact and the restore is sha-verified, so the dirty content is what comes
// back -- nothing is shipped either way. The real cost of refusing was worse
// than the risk it avoided: while a person edits the repo, every base
// measurement of a touched module read as `exit 6` -> `ok: false` -> "the base
// failed", and the gate then accepted the patch on `red-to-green` with no
// metrics at all (loom-mut r3a1 promoted that way while notify.js was being
// edited). "Cannot measure" must not be spelled the same way as "measured red".
//
// Applying a patch to a dirty workspace is a different rule, enforced elsewhere:
// the round refuses with `workspace-dirty` before it writes anything.
let dirtyNote = ''
{
  const { execFileSync } = await import('node:child_process')
  try {
    dirtyNote = execFileSync('git', ['status', '--porcelain', '--', moduleFile], { encoding: 'utf8', windowsHide: true }).trim()
  } catch {
    dirtyNote = ''
  }
}

const original = fs.readFileSync(moduleFile)
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').slice(0, 16)
const originalSha = sha(original)
const restore = () => fs.writeFileSync(moduleFile, original)
process.on('exit', restore)
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { restore(); process.exit(130) })

const fileSlug = slug(moduleFile)
const all = mutantsFor(moduleFile)
  .map((m, i) => ({ ...m, index: i, id: `${fileSlug}#${String(i).padStart(3, '0')}` }))
  .map((m) => ({ ...m, rank: crypto.createHash('sha256').update(`${fileSlug}:${m.index}`).digest('hex') }))
  .sort((a, b) => a.rank.localeCompare(b.rank))
const picked = all.slice(0, sample)

// Guard specs: either pinned by the task (`--specs=a,b`) or derived. Pinning
// matters because the task's scope names exactly the files the candidate may
// edit -- a spec the candidate cannot edit must not influence its reading.
let guard = args.specs
  ? String(args.specs).split(',').map((x) => x.trim()).filter(Boolean)
  : guardSet(moduleFile)
if (!guard.length) { console.error(`no guard spec imports ${moduleFile}`); process.exit(2) }
// Line-level on purpose: `readFileSync` appears in most specs (they read tmp
// files), and matching the module name anywhere in the file flags every spec
// that merely imports it. The cheat needs the path inside the read call.
const base = path.basename(moduleFile)
const asPosix = moduleFile.replace(/\\/g, '/')
const tampered = guard.filter((s) =>
  fs.readFileSync(s, 'utf8').split('\n').some((line) => {
    if (!/readFileSync\s*\(|readFile\s*\(/.test(line)) return false
    return line.includes(asPosix) || line.includes(moduleFile) || line.includes(base)
  }),
)
// Excluded, not fatal: several legitimate specs read source text (a tool
// description that must appear, a registry table). A reading taken through a
// source-grepping spec is not evidence about behaviour, so the spec leaves the
// guard set and the reading is taken from the rest -- and a spec added later is
// caught by the same check on the next run.
if (tampered.length) {
  console.error(`EXCLUDED=${tampered.length} spec(s) read the module under test: ${tampered.map((s) => path.basename(s)).join(', ')}`)
  guard = guard.filter((s) => !tampered.includes(s))
  if (!guard.length) { console.error('no guard spec left after excluding source readers'); process.exit(3) }
}

// Prefer the spec named after the module: tests/gate.test.mjs for src/gate/gate.js.
// Without this the cap keeps whichever spec sorts first, and round.js then gets
// measured by a single unrelated spec (0 of 6 mutants killed, which says nothing
// about round.js).
const stem = path.basename(moduleFile, '.js')
if (!args.specs) guard = guard
  .sort((a, b) => {
    const sa = path.basename(a).startsWith(stem) ? 0 : 1
    const sb = path.basename(b).startsWith(stem) ? 0 : 1
    return sa - sb || a.split('/').length - b.split('/').length || a.localeCompare(b)
  })
  .slice(0, maxSpecs)
if (guard.some((s) => !fs.existsSync(s))) { console.error('missing guard spec'); process.exit(2) }

function runSpec(spec, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [spec], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env } })
    let err = ''
    child.stderr.on('data', (d) => { err += d })
    child.stdout.on('data', () => {})
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs)
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, err: err.slice(-500) }) })
  })
}

const started = Date.now()
let killed = 0
let tried = 0
let skipped = 0
const results = []
for (const m of picked) {
  const mutated = Buffer.concat([
    original.subarray(0, m.offset),
    Buffer.from(m.replace, 'latin1'),
    original.subarray(m.offset + m.find.length),
  ])
  if (mutated.equals(original)) { skipped += 1; continue }
  if (Date.now() - started > budgetMs) { console.error(`budget exceeded after ${tried} mutants`); restore(); process.exit(4) }
  try {
    fs.writeFileSync(moduleFile, mutated)
    let died = false
    for (const spec of guard) {
      const r = await runSpec(spec, 120000)
      if (r.code !== 0) { died = true; break }
    }
    tried += 1
    if (died) killed += 1
    results.push({ id: m.id, pattern: m.pattern, killed: died })
  } finally {
    restore()
    if (sha(fs.readFileSync(moduleFile)) !== originalSha) {
      console.error('tree not restored: refusing to report a reading')
      process.exit(5)
    }
  }
}

if (args.report === 'patterns') {
  const byPattern = {}
  for (const r of results) byPattern[r.pattern] = (byPattern[r.pattern] ?? 0) + (r.killed ? 0 : 1)
  console.log(`SURVIVORS=${JSON.stringify(byPattern)}`)
}
const rate = tried ? killed / tried : 0
console.log(`KILLRATE=${rate.toFixed(4)}`)
console.log(`MUTANTS tried=${tried} killed=${killed} skipped=${skipped} sample=${sample} specs=${guard.length} ms=${Date.now() - started}`)
// The reading stands either way; this line only says the tree was not pristine,
// so a reader comparing two runs knows which ones differ for a reason outside
// the instrument.
if (dirtyNote) console.log(`DIRTY=${dirtyNote.split('\n').length}`)
