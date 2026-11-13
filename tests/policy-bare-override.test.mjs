// `rsi_control policy` appends bare keys (`{candidates:1}`), while
// `policy.proposed`/`policy.promoted` write a nested record
// (`{version, status, policy:{...}}`). `effectivePolicy` used to read only the
// nested shape, so a campaign that set `candidates: 1` still launched two
// attempts -- a knob that reads as configured and behaves as absent.
//
// Measured 2026-11-14 on campaign `ab-cand3`: `state.policy` printed
// `{candidates: 1, planMode: 'off'}` and round 1 finished with
// `candidatesPlanned: 2`. The fix folds the bare override in, and the last two
// blocks here are the ones that would have failed: a unit test alone would not
// have caught it, because the unit test is free to pick the shape the reader
// happens to accept.
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

import { effectivePolicy, POLICY_DEFAULTS } from '../src/loop/policy.js'
import { runRound } from '../src/runtime/round.js'

const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', windowsHide: true })
const config = {
  gate: { minGain: 0.05, holdoutSlack: 0.1 },
  knowledge: { enabled: true },
  halving: { enabled: true },
  loopPolicy: { planMode: 'full' },
}

let pass = 0
const ok = (name) => { pass += 1; console.log(`ok ${pass} - ${name}`) }

// 1. Bare override reaches the fields it names.
{
  const p = effectivePolicy({ state: { policy: { candidates: 1, minGain: 0.02 } }, config })
  assert.equal(p.candidates, 1, 'a bare candidates override is the policy in force')
  assert.equal(p.minGain, 0.02)
  assert.equal(p.knowledge, true, 'fields the override does not name still come from config')
  ok('a bare campaign override sets the fields it names')
}

// 2. No policy at all: config wins, then defaults.
{
  const p = effectivePolicy({ state: {}, config })
  assert.equal(p.candidates, POLICY_DEFAULTS.candidates)
  assert.equal(p.minGain, 0.05)
  ok('without an override the config and the defaults apply')
}

// 3. The promoted nested record still works (it is not the bug being fixed).
{
  const state = { policy: { version: 2, status: 'promoted', policy: { candidates: 3, planMode: 'off' } } }
  const p = effectivePolicy({ state, config })
  assert.equal(p.candidates, 3, 'a promoted L2 record is still read')
  assert.equal(p.planMode, 'off')
  ok('a promoted L2 record is still read from its nested shape')
}

// 4. Metadata alone must not zero anything out.
{
  const state = { policy: { version: 1, status: 'proposed', promotedAt: 1, by: 'lead' } }
  const p = effectivePolicy({ state, config })
  assert.equal(p.candidates, POLICY_DEFAULTS.candidates)
  assert.equal(p.minGain, 0.05)
  ok('a record carrying only bookkeeping changes nothing')
}

// 5. An explicit bare key wins over an older promoted record, and the report of
//    which one won is what makes that safe to do.
{
  const state = { policy: { candidates: 1, policy: { candidates: 3, planMode: 'off' } } }
  const p = effectivePolicy({ state, config })
  assert.equal(p.candidates, 1, "the operator's latest word outranks the earlier promoted record")
  assert.equal(p.planMode, 'off', 'fields it does not name still come from the promoted record')
  ok('a later bare override outranks the promoted record field by field')
}

// -- Round level: the shape that actually failed in the campaign -------------
function repo() {
  const root = mkdtempSync(join(tmpdir(), 'loom-bare-'))
  const dir = join(root, 'repo')
  mkdirSync(dir, { recursive: true })
  git(dir, 'init', '-q')
  git(dir, 'config', 'user.email', 'loom@local')
  git(dir, 'config', 'user.name', 'dsh-loom')
  git(dir, 'config', 'core.autocrlf', 'false')
  writeFileSync(join(dir, 'keep.txt'), 'keep\n')
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', 'base')
  return { root, dir }
}

const REPORT = JSON.stringify({ changed: [], why: 'wrote a file', evidence: 'measured', openQuestions: [], confidence: 0.9, nextHint: '' })

async function attemptsFor(campaignPolicy) {
  const { root, dir } = repo()
  const events = []
  const runtime = {
    home: join(root, 'campaign'),
    events,
    append(_v, type, data) { events.push({ type, data }); return data },
    watchAttempt() {},
    unwatchAttempt() {},
    stallReason: () => null,
  }
  const view = {
    dir: join(root, 'campaign'),
    state: {
      id: 'bare',
      status: 'running',
      workspace: dir,
      rounds: [],
      constraints: [],
      lessons: [],
      policy: campaignPolicy,
      autopilot: { enabled: false, guard: null },
      budget: { usd: 5, rounds: 10, spentUsd: 0 },
      evalset: { tasks: [{ id: 'a', prompt: 'write a file', verify: { cmd: `"${process.execPath}" -e "process.exit(1)"` } }], holdout: [] },
      chain: {
        activeVersion: 1,
        versions: [{ version: 1, spec: { name: 'two', version: 1, params: { candidates: 2, maxSteps: 10 }, nodes: [
          { id: 'work', type: 'agent', name: 'worker', prompt: 'do it' },
          { id: 'check', type: 'verifier', name: 'check', cmd: `"${process.execPath}" -e "process.exit(0)"` },
        ] } }],
      },
    },
  }
  let runs = 0
  const dispatcher = {
    async run(_prompt, opts) {
      runs += 1
      writeFileSync(join(opts.cwd, `file-${runs}.txt`), 'x\n')
      return { stopReason: 'completed', failureKind: 'ok', text: REPORT, structured: null, timedOut: false, error: null, sessionId: 's', durationMs: 1 }
    },
  }
  const cfg = {
    session: { attemptTimeoutMs: 60_000, maxConcurrent: 4, stallMs: 300_000 },
    verify: { timeoutMs: 60_000 },
    loopPolicy: { halving: false, candidateMode: 'parallel' },
    knowledge: { enabled: false },
    halving: { enabled: false },
    gate: { minGain: 0.05 },
    models: {},
    checkpoint: { on: [] },
  }
  await runRound({ runtime, view, config: cfg, dispatcher, log: () => {} })
  const finished = events.filter((e) => e.type === 'round.finished').map((e) => e.data)[0]
  // Count attempts, not dispatcher calls: the chain's own agent node also calls
  // the dispatcher, so `runs` is one more than the number of candidates paid for.
  const attempts = events.filter((e) => e.type === 'attempt.finished').length
  rmSync(root, { recursive: true, force: true })
  return { planned: finished?.candidatesPlanned, attempts, runs }
}

// 6. The chain asks for two candidates; the campaign's bare override says one.
{
  const r = await attemptsFor({ candidates: 1 })
  assert.equal(r.planned, 1, 'one candidate planned when the campaign says one')
  assert.equal(r.attempts, 1, 'and only one candidate was paid for')
  ok('a bare candidates override removes the second attempt, not just the label')
}

// 7. Without the override the chain's two candidates still run.
{
  const r = await attemptsFor(undefined)
  assert.equal(r.planned, 2)
  assert.equal(r.attempts, 2)
  ok('without an override the chain keeps its two candidates')
}

console.log(`\n${pass}/${pass} passed`)
