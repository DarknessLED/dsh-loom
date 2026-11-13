// Turn the measured headroom into graded tasks.
//
// Each task is one module whose kill rate is low, with its guard specs pinned so
// the reading means the same thing every round: same mutant sample (sha-sorted),
// same specs, same verdict. The task's scope is exactly those specs, because the
// deliverable is assertions -- and the module itself must stay out of reach or
// the candidate could earn the number by editing what is being measured.
import fs from 'node:fs'
import path from 'node:path'

const plan = JSON.parse(fs.readFileSync('research/mutants/plan-all.json', 'utf8'))
// The serial reading wins when it exists: the parallel baseline measured a tree
// six other measurements were mutating, and cross-talk flatters whoever ran alone.
const serialPath = 'research/mutants/tasks-base.json'
const baseline = fs.existsSync(serialPath)
  ? JSON.parse(fs.readFileSync(serialPath, 'utf8'))
  : JSON.parse(fs.readFileSync('research/mutants/baseline.json', 'utf8'))
const byId = new Map((baseline.rows ?? []).map((r) => [r.id, r]))
const byFile = new Map((baseline.rows ?? []).filter((r) => r.file).map((r) => [r.file, r]))

const NODE = process.execPath
const SAMPLE = Number(process.env.SAMPLE ?? 20)
const LIMIT = Number(process.env.LIMIT ?? 22)
const MAX_RATE = Number(process.env.MAX_RATE ?? 0.65)
const MAX_MS = Number(process.env.MAX_MS ?? 70_000)

const rows = []
for (const entry of plan) {
  const slate = (serialPath && baseline.rows ? baseline.rows : []).find((r) => r.file === entry.file)
  const reading = slate ?? byFile.get(entry.file)
  if (!reading || reading.killRate === null) continue
  if (reading.killRate > MAX_RATE) continue
  if (reading.ms > MAX_MS) continue
  const stem = path.basename(entry.file, '.js')
  const specs = entry.guard
    .slice()
    .sort((a, b) => {
      const sa = path.basename(a).startsWith(stem) ? 0 : 1
      const sb = path.basename(b).startsWith(stem) ? 0 : 1
      return sa - sb || a.split('/').length - b.split('/').length || a.localeCompare(b)
    })
    .slice(0, 2)
  if (!specs.length) continue
  rows.push({ file: entry.file, specs, killRate: reading.killRate, mutants: entry.mutants, ms: reading.ms })
}
rows.sort((a, b) => a.killRate - b.killRate || a.ms - b.ms)
const picked = rows.slice(0, LIMIT)

const tasks = picked.map((r) => {
  const slug = r.file.replace(/\\/g, '/').replace(/^src\//, '').replace(/\.js$/, '').replace(/\//g, '-')
  const specList = r.specs.map((p) => p.replace(/\\/g, '/')).join(',')
  const cmd = [
    `"${NODE}"`,
    'research/mutants/task.mjs',
    `--module=${r.file}`,
    `--specs=${specList}`,
    `--sample=${SAMPLE}`,
  ].join(' ')
  return {
    id: `mut-${slug}`,
    family: 'loom-mut',
    prompt: [
      `Make ${r.file} harder to break silently.`,
      '',
      `Its current kill rate is ${r.killRate.toFixed(3)}: of the plausible one-token bugs the instrument tries in it, only that share makes one of these specs fail.`,
      `The specs that must notice: ${specList}.`,
      '',
      `Add assertions to those specs so that more of those bugs are caught. You may edit only the specs listed above -- the module under test and research/mutants/task.mjs are out of reach, and a patch that touches them is refused by name.`,
      `Start by running the measurement to see which bugs survive; it prints SURVIVORS=[...] with the pattern of each. Target the survivors you can pin down without reading the implementation and copying it into the test.`,
      'A test that asserts on the module source text is excluded from the guard set and will not count.',
      '',
      'Report the measured kill rate you ended at (the verifier prints KILLRATE=<n>), and which survivor classes you closed.',
    ].join('\n'),
    verify: {
      cmd,
      cwd: 'C:/Projects/RSI',
      timeoutMs: 240_000,
      metrics: { quality: { pattern: 'KILLRATE=([0-9.]+)' } },
      scope: { editable: r.specs.map((p) => p.replace(/\\/g, '/')) },
    },
    baseline: r.killRate,
  }
})

fs.writeFileSync('research/mutants/tasks.json', JSON.stringify({ sample: SAMPLE, tasks }, null, 1))
console.log(`${tasks.length} graded tasks`)
for (const t of tasks) console.log(`  ${t.id.padEnd(34)} base ${t.baseline.toFixed(3)}  specs ${t.verify.scope.editable.join(' ')}`)
