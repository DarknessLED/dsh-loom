// The chain demotion reads the ledger and moves a ref that keeps dying to the
// back — for the *workers*. The planner is dispatched from the same round, but
// its model comes straight out of `config.models.worker`, so a campaign that
// just demoted a dead provider keeps buying its plan from that provider, every
// round, and the plan is the one call every round waits on.
//
// Rule: the planner runs on the head of the chain this round actually uses.
// An explicit `models.meta` still wins — that is the operator naming a model for
// the planning role — and with `demoteAfter` off nothing changes.
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

import { runRound } from '../../src/runtime/round.js'

const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' })

let pass = 0
let fail = 0
function ok(name, cond = true, detail) {
  if (cond) {
    pass += 1
    console.log('ok   ' + name)
  } else {
    fail += 1
    console.log('FAIL ' + name + (detail === undefined ? '' : ' — ' + detail))
  }
}

const REPORT = JSON.stringify({
  changed: ['keep.txt'],
  why: 'the spec asks for it',
  evidence: 'node tests/x',
  openQuestions: [],
  confidence: 0.9,
  nextHint: 'none',
})

const CHAIN = {
  activeVersion: 1,
  versions: [
    {
      version: 1,
      spec: {
        name: 'code-fix',
        version: 1,
        params: { candidates: 1 },
        nodes: [
          { id: 'recon', type: 'agent', role: 'planner', prompt: 'inspect the repository and report' },
          { id: 'work', type: 'map' },
          { id: 'worker', type: 'agent', prompt: 'do the task' },
        ],
      },
    },
  ],
}

function deadRoute(n) {
  return {
    n,
    attempts: [
      { id: `r${n}a1`, model: 'a/one', failureKind: 'died', verifierOk: false, durationMs: 900, patchBytes: 0 },
    ],
  }
}

function stateFor(workspace, rounds) {
  return {
    id: 'planner-chain',
    workspace,
    rounds,
    constraints: [],
    autopilot: { enabled: false, guard: null },
    lessons: [],
    budget: { usd: 5, rounds: 6, minutes: 60, tokens: 0, roundsUsed: rounds.length },
    evalset: {
      tasks: [{ id: 't1', prompt: 'make it pass', verify: { cmd: `"${process.execPath}" -e "process.exit(0)"` } }],
      holdout: [],
    },
    chain: CHAIN,
  }
}

function fakeRuntime(dir) {
  return {
    home: dir,
    events: [],
    append(view, type, data) {
      this.events.push({ type, data })
    },
    watchAttempt() {},
    unwatchAttempt() {},
    stallReason() {
      return null
    },
    stallEvidence() {
      return null
    },
  }
}

function configFor(models) {
  return {
    session: { attemptTimeoutMs: 780_000, planTimeoutMs: 180_000, maxConcurrent: 2 },
    verify: { timeoutMs: 60_000 },
    loopPolicy: { planMode: 'full', candidateMode: 'parallel', halving: false },
    knowledge: { enabled: false },
    halving: { enabled: false },
    gate: { minGain: 0.05 },
    models,
    checkpoint: { on: [] },
  }
}

/** Run one round and return the model each dispatch asked for. */
async function modelsAsked({ models, rounds }) {
  const scratch = mkdtempSync(join(tmpdir(), 'loom-planner-chain-'))
  const repo = join(scratch, 'repo')
  const campaign = join(scratch, 'campaign')
  try {
    mkdirSync(repo, { recursive: true })
    mkdirSync(campaign, { recursive: true })
    git(repo, 'init', '-q', '-b', 'main')
    git(repo, 'config', 'user.email', 't@example.com')
    git(repo, 'config', 'user.name', 't')
    git(repo, 'config', 'core.autocrlf', 'false')
    writeFileSync(join(repo, 'keep.txt'), 'keep\n')
    git(repo, 'add', '-A')
    git(repo, 'commit', '-qm', 'base')

    const asked = []
    const dispatcher = {
      async run(prompt, opts) {
        // The real dispatcher prefers an explicit chain over a single model name
        // (see modelChain in src/dispatch/session.js); the stub must do the same
        // or it would report a model the round did not choose.
        const chain = Array.isArray(opts?.models) && opts.models.length ? opts.models : null
        const first = chain ? chain[0] : (opts?.model ?? null)
        asked.push({ label: opts?.label ?? null, model: first ?? null })
        if (opts?.onStart) opts.onStart({ sessionId: 's1', abort() {}, deadline: Date.now() + 60_000 })
        return { sessionId: 's1', text: REPORT, stopReason: 'completed', timedOut: false, error: null, model: opts?.model ?? null }
      },
    }

    const view = { id: 'planner-chain', dir: campaign, state: stateFor(repo, rounds) }
    const runtime = fakeRuntime(campaign)
    await runRound({ runtime, view, config: configFor(models), dispatcher, log: () => {}, notify: () => {} })
    return {
      planner: asked.find((a) => String(a.label ?? '').includes(':plan:')) ?? null,
      worker: asked.find((a) => !String(a.label ?? '').includes(':plan:')) ?? null,
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
}

try {
  // 1. Two dead attempts on 'a/one' with demoteAfter=2: the workers move to
  //    'b/two', and the planner must not keep buying plans from the ref that
  //    just failed twice.
  {
    const out = await modelsAsked({
      models: { worker: 'a/one', fallback: ['b/two'], demoteAfter: 2 },
      rounds: [deadRoute(1), deadRoute(2)],
    })
    assert.ok(out.planner, 'the planner was dispatched')
    assert.equal(out.worker?.model, 'b/two', 'the worker ran on the demoted chain head')
    assert.equal(out.planner.model, 'b/two', 'the planner follows the chain this round uses')
    ok('a demoted provider does not keep planning')
  }

  // 2. With demotion off, nothing reorders: the planner keeps the configured
  //    worker model, which is the historical behaviour.
  {
    const out = await modelsAsked({
      models: { worker: 'a/one', fallback: ['b/two'], demoteAfter: 0 },
      rounds: [deadRoute(1), deadRoute(2)],
    })
    assert.equal(out.worker?.model, 'a/one', 'no demotion means no reordering for the worker')
    assert.equal(out.planner.model, 'a/one', 'and none for the planner either')
    ok('demoteAfter off changes nothing')
  }

  // 3. An operator naming a planning model outranks the chain: `models.meta` is
  //    an instruction about the role, not a guess about which ref is healthy.
  {
    const out = await modelsAsked({
      models: { worker: 'a/one', fallback: ['b/two'], demoteAfter: 2, meta: 'm/meta' },
      rounds: [deadRoute(1), deadRoute(2)],
    })
    assert.equal(out.planner.model, 'm/meta', 'models.meta still names the planning model')
    assert.equal(out.worker?.model, 'b/two', 'the worker still uses the demoted chain')
    ok('an explicit planning model outranks the chain')
  }

  // 4. Nothing named at all: the planner asks for nothing and lets the host
  //    decide, exactly as the workers do. `'default'` would be a lie about a name.
  {
    const out = await modelsAsked({ models: {}, rounds: [] })
    assert.equal(out.planner?.model ?? null, null, 'an unnamed chain asks for nothing')
    assert.equal(out.worker?.model ?? null, null, 'and the worker does the same')
    ok('an unnamed chain asks the host to decide')
  }
} finally {
  // nothing global to clean up; each case owns its scratch tree
}

console.log(`\n${pass}/${pass + fail} passed`)
if (fail > 0) process.exit(1)
