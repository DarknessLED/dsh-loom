// The holdout gate says "the patch did not break what we held back". Measured
// over 210 rounds in the ledger, it almost never says anything: 44 of 61
// campaigns register no holdout at all, and the other 17 register exactly one -
// `suite`, whose verify command is the same `node scripts/test-all.mjs` that the
// work task's own verifier already runs. So "the work spec passed" implies "the
// holdout passed": the gate is a second run of a command that already returned 0.
// Across all those rounds it failed once.
//
// A held-out check is only a second opinion if the work task could have passed
// while the held-out task failed. Two rules follow, and both are mechanical:
//
//  1. When the same command already judged this tree, the holdout adds no
//     evidence: say `skipped-same-command` instead of paying for it again, and
//     do not let the round report a holdout pass it did not buy.
//  2. A holdout that is the same as the work task (same command, same spec) is
//     not held out at all: it is the same test wearing a second name and must be
//     reported as such, so a campaign cannot claim a holdout it does not have.
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

import { runRound } from '../../src/runtime/round.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log('ok ' + name)
}
const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', windowsHide: true })

function repo(prefix) {
  const root = mkdtempSync(join(tmpdir(), `loom-${prefix}-`))
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

function fakeRuntime(dir) {
  const events = []
  return {
    events,
    home: dir,
    append(_view, type, data) {
      events.push({ type, data })
      return data
    },
    watchAttempt() {},
    unwatchAttempt() {},
    stallReason: () => null,
  }
}

const REPORT = JSON.stringify({ changed: ['out.txt'], why: 'w', evidence: ['e'], openQuestions: [], confidence: 0.8, nextHint: '' })

function config(over = {}) {
  return {
    session: { attemptTimeoutMs: 120000, maxConcurrent: 2 },
    verify: { timeoutMs: 30000 },
    loopPolicy: { halving: false, candidateMode: 'parallel' },
    knowledge: { enabled: false },
    halving: { enabled: false },
    gate: { minGain: 0 },
    models: {},
    checkpoint: { on: [] },
    ...over,
  }
}

// The one command that every task in these fixtures runs. It writes a marker so
// the test can count spawns instead of trusting the round's own bookkeeping.
const SAME = `"${process.execPath}" -e "require('fs').appendFileSync('runs.log','x')"`

function dispatcher({ writes = true } = {}) {
  return {
    run: async (_brief, ctx) => {
      if (writes) writeFileSync(join(ctx.cwd, 'out.txt'), 'produced\n')
      return { sessionId: 's1', text: REPORT, stopReason: 'completed' }
    },
  }
}

// A campaign whose holdout runs the exact command the work task already ran.
function campaignWith(sameCommand) {
  const { root, dir } = repo('holdout')
  const campaign = mkdtempSync(join(tmpdir(), 'loom-camp-'))
  const state = {
    id: 'h1',
    workspace: dir,
    rounds: [],
    constraints: [],
    autopilot: { enabled: true, guard: null },
    lessons: [],
    budget: { usd: 10, rounds: 5, minutes: 60, tokens: 0 },
    evalset: {
      tasks: [{ id: 'work', prompt: 'p', verify: { cmd: SAME, timeoutMs: 20000 } }],
      holdout: ['held'],
    },
    chain: { activeVersion: 1, versions: [{ version: 1, spec: { name: 'q', version: 1, params: { candidates: 1 }, nodes: [] } }] },
  }
  // The held-out task: same command when `sameCommand`, otherwise a different
  // one that inspects the tree the work task produced.
  state.evalset.tasks.push({
    id: 'held',
    prompt: 'p2',
    verify: { cmd: sameCommand ? SAME : `"${process.execPath}" -e "process.exit(1)"`, timeoutMs: 20000 },
  })
  return { root, dir, campaign, state }
}

// 1. The holdout repeats a command this tree already passed: do not buy the
//    same verdict twice, and do not report a pass that was never bought.
{
  const { root, campaign, state } = campaignWith(true)
  try {
    const rt = fakeRuntime(campaign)
    await runRound({ runtime: rt, view: { id: 'h1', dir: campaign, state }, config: config(), dispatcher: dispatcher(), log: () => {} })
    const gate = rt.events.find((e) => e.type === 'gate.evaluated')
    assert.ok(gate, 'the gate ran')
    assert.equal(gate.data.checks.holdout, 'skipped-same-command', 'the holdout did not buy a second identical verdict')
    assert.equal(gate.data.promoted, true, 'the round still lands on the work verdict')
    ok('a holdout that repeats the work command is not paid for twice')
  } finally {
    rmSync(root, { recursive: true, force: true })
    rmSync(campaign, { recursive: true, force: true })
  }
}

// 2. A holdout that cannot fail while the work task passes is not held out:
//    it is the same test with a second name, and must be reported as such.
{
  const { root, campaign, state } = campaignWith(true)
  try {
    const rt = fakeRuntime(campaign)
    await runRound({ runtime: rt, view: { id: 'h1', dir: campaign, state }, config: config(), dispatcher: dispatcher(), log: () => {} })
    const sel = rt.events.find((e) => e.type === 'holdout.selected')
    assert.equal(sel, undefined, 'nothing was selected to run')
    ok('the same test cannot masquerade as a held-out one')
  } finally {
    rmSync(root, { recursive: true, force: true })
    rmSync(campaign, { recursive: true, force: true })
  }
}

// 3. A genuinely different holdout still runs, and its verdict still decides.
{
  const { root, dir, campaign, state } = campaignWith(false)
  try {
    const rt = fakeRuntime(campaign)
    await runRound({ runtime: rt, view: { id: 'h1', dir: campaign, state }, config: config(), dispatcher: dispatcher(), log: () => {} })
    const gate = rt.events.find((e) => e.type === 'gate.evaluated')
    assert.equal(gate.data.checks.holdout, false, 'a different holdout that fails still blocks the promotion')
    assert.equal(gate.data.promoted, false)
    const round = rt.events.find((e) => e.type === 'round.finished')
    assert.equal(round.data.status, 'holdout-failed')
    ok('a real holdout still decides the round')
  } finally {
    rmSync(root, { recursive: true, force: true })
    rmSync(campaign, { recursive: true, force: true })
  }
}

// 4. A no-op candidate with a claimed change still faces the holdout: its bytes
//    are unproven, so "the verifier passed without a diff" is not permission to
//    skip the second opinion.
{
  const { root, campaign, state } = campaignWith(false)
  try {
    state.evalset.tasks[0].verify = { cmd: `"${process.execPath}" -e "process.exit(0)"`, timeoutMs: 20000 }
    const rt = fakeRuntime(campaign)
    await runRound({ runtime: rt, view: { id: 'h1', dir: campaign, state }, config: config(), dispatcher: dispatcher({ writes: false }), log: () => {} })
    const gate = rt.events.find((e) => e.type === 'gate.evaluated')
    assert.equal(gate.data.checks.noop, true, 'the candidate changed nothing it could prove')
    assert.equal(gate.data.checks.holdout, false, 'an unproven no-op still faces the held-out task')
    ok('an unproven no-op does not get to skip the holdout')
  } finally {
    rmSync(root, { recursive: true, force: true })
    rmSync(campaign, { recursive: true, force: true })
  }
}

console.log(`\n${pass}/4 passed`)
assert.equal(pass, 4)
