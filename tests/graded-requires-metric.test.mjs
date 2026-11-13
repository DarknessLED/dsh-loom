// A graded task is graded by its number, so the number has to move.
//
// On 2026-11-13 a graded round promoted through `red-to-green` with
// `baseMetrics: {}`: the base had failed because the mutant instrument refused to
// measure a module someone was editing, and the gate read that failure as "the
// patch fixed something". The metric was never shown to move. That is the one
// thing a graded task exists to show, and it is also the shape of every other
// failure in this repo's history -- an unmeasurable state read as a measured one.
//
// Rule: when the task declares a metric, `earned` comes from the metric reading
// alone. A red base that produced no number is `graded-metric-unmeasured`, which
// is a refusal, not a promotion.
//   node tests/graded-requires-metric.test.mjs
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runRound } from '../src/runtime/round.js'

let pass = 0
const ok = (name) => { pass += 1; console.log(`ok ${pass} - ${name}`) }
const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

// The instrument imports a module that may not exist yet: when it is missing the
// run fails before printing anything, which is the "red base with no number" case.
const CHECK = `import { broken } from './lib.mjs'
process.stdout.write('QUALITY=' + (broken ? '0.500' : '1.000') + '\\n')
process.exit(0)
`
const LIB_BROKEN = 'export const broken = true\n'
const LIB_FIXED = 'export const broken = false\n'

function repo({ withLib }) {
  const dir = mkdtempSync(join(tmpdir(), 'loom-graded-'))
  git(dir, 'init', '-q')
  git(dir, 'config', 'user.email', 'loom@local')
  git(dir, 'config', 'user.name', 'loom')
  git(dir, 'config', 'core.autocrlf', 'false')
  writeFileSync(join(dir, 'check.mjs'), CHECK)
  if (withLib) writeFileSync(join(dir, 'lib.mjs'), LIB_BROKEN)
  git(dir, 'add', '-A')
  git(dir, 'commit', '-qm', 'base')
  return dir
}

function fakeRuntime(dir) {
  const events = []
  return {
    home: join(dir, 'home'),
    events,
    dir,
    watchAttempt() {},
    unwatchAttempt() {},
    stallReason() { return null },
    append(_view, type, data) { events.push({ type, data }) },
    status() { return {} },
  }
}

function viewFor(dir) {
  return {
    dir: join(dir, 'campaign'),
    state: {
      id: 'graded',
      status: 'running',
      workspace: dir,
      rounds: [],
      constraints: [],
      autopilot: { enabled: false, guard: null },
      lessons: [],
      budget: { rounds: 10, roundsUsed: 0, usd: 5, spentUsd: 0 },
      evalset: {
        tasks: [{
          id: 'graded',
          family: 'f',
          prompt: 'raise QUALITY',
          verify: {
            cmd: `"${process.execPath}" check.mjs`,
            timeoutMs: 30_000,
            metrics: { quality: { pattern: 'QUALITY=(\\d+(?:\\.\\d+)?)', group: 1 } },
          },
        }],
        holdout: [],
      },
      chain: {
        activeVersion: 1,
        versions: [{ version: 1, spec: { name: 't', version: 1, nodes: [] }, params: { candidates: 1 } }],
      },
    },
  }
}

const config = {
  session: { attemptTimeoutMs: 60_000, maxConcurrent: 1 },
  verify: { timeoutMs: 30_000 },
  loopPolicy: {},
  knowledge: { enabled: false, maxShown: 0 },
  halving: { enabled: false },
  gate: { minGain: 0.05 },
  models: {},
}

const report = (changed, why) => JSON.stringify({ changed, why, evidence: ['ran it'], openQuestions: [], confidence: 0.9, nextHint: '' })

// 1. The base could not be measured: the instrument failed before printing a
//    number. A candidate that then makes the command green has not shown that the
//    graded quantity moved, so the round must not promote on it.
{
  const dir = repo({ withLib: false })
  const rt = fakeRuntime(dir)
  const view = viewFor(dir)
  mkdirSync(view.dir, { recursive: true })
  const dispatcher = {
    run: async (_prompt, opts) => {
      writeFileSync(join(opts.cwd, 'lib.mjs'), LIB_FIXED)
      return { sessionId: 's-created', text: report(['lib.mjs'], 'create the module the instrument imports'), stopReason: 'completed' }
    },
  }
  await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })
  const gate = rt.events.find((e) => e.type === 'gate.evaluated')
  const checks = gate?.data?.checks ?? {}
  assert.equal(checks.baseFailed, true, 'the base run failed')
  assert.deepEqual(checks.baseMetrics ?? {}, {}, 'and it produced no number')
  assert.equal(checks.earnedReason, 'graded-metric-unmeasured', 'a graded task with no base number is unmeasured, not earned')
  assert.equal(gate?.data?.promoted, false, 'so the round does not promote')
  ok('a graded task whose base produced no number does not promote on red-to-green')
  rmSync(dir, { recursive: true, force: true })
}

// 2. The base was measured and the candidate moved the number: that is the whole
//    point of a graded task, and it still promotes -- through the metric reading,
//    not through the exit code.
{
  const dir = repo({ withLib: true })
  const rt = fakeRuntime(dir)
  const view = viewFor(dir)
  mkdirSync(view.dir, { recursive: true })
  const dispatcher = {
    run: async (_prompt, opts) => {
      writeFileSync(join(opts.cwd, 'lib.mjs'), LIB_FIXED)
      return { sessionId: 's-fixed', text: report(['lib.mjs'], 'fix the flag the instrument reads'), stopReason: 'completed' }
    },
  }
  await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })
  const gate = rt.events.find((e) => e.type === 'gate.evaluated')
  const checks = gate?.data?.checks ?? {}
  assert.equal(checks.earnedReason, 'metric-improved', 'the evidence is the number that moved')
  assert.deepEqual(checks.earnedMetric, { name: 'quality', from: 0.5, to: 1 }, 'and the gate says which number and by how much')
  assert.equal(gate?.data?.promoted, true, 'a moved number is a promotion')
  ok('a graded task whose number moved promotes through the metric reading')
  rmSync(dir, { recursive: true, force: true })
}

// 3. And a candidate that changes nothing on a graded task is still refused: the
//    exit code was already 0, so there is no reading under which it earned.
{
  const dir = repo({ withLib: true })
  const rt = fakeRuntime(dir)
  const view = viewFor(dir)
  mkdirSync(view.dir, { recursive: true })
  const dispatcher = {
    run: async (_prompt, opts) => {
      writeFileSync(join(opts.cwd, 'notes.md'), 'looked at it\n')
      return { sessionId: 's-nothing', text: report(['notes.md'], 'wrote a note'), stopReason: 'completed' }
    },
  }
  await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })
  const gate = rt.events.find((e) => e.type === 'gate.evaluated')
  const checks = gate?.data?.checks ?? {}
  assert.equal(checks.earnedReason, 'metric-did-not-improve', 'an unchanged number is not evidence')
  assert.equal(gate?.data?.promoted, false, 'and it does not promote')
  ok('a graded task whose number did not move does not promote')
  rmSync(dir, { recursive: true, force: true })
}

console.log(`ok - graded-requires-metric ${pass}/${pass}`)
