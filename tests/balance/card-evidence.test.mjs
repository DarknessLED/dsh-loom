// The human review card, end to end.
//
// A chain that asks a person every round is the only path that still raises a
// `gate` checkpoint, and this is the case the goal cares about: when a decision
// reaches a person it must arrive with the four facts they need -- which task,
// what the diff does, what the verifier said, and what could break. The old card
// carried a templated sentence and a score, which is a rubber stamp with a
// button.
//
// Same fixture as tests/balance/scope-round.test.mjs: a real git repo, a real
// runRound, a dispatcher that writes one file. The verifier fails on the base and
// passes once that file exists, so the round earns a promotion and then stops at
// the human node instead of applying.
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

import { runRound } from '../../src/runtime/round.js'
import { renderEvidence } from '../../src/runtime/review-card.js'

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

function fakeRuntime(home) {
  const events = []
  return {
    events,
    home,
    append(_view, type, data) { events.push({ type, data }); return data },
    watchAttempt() {},
    unwatchAttempt() {},
    stallReason: () => null,
  }
}

const REPORT = JSON.stringify({ changed: ['flag.txt'], why: 'wrote the marker the verifier looks for', evidence: 'verifier passed', openQuestions: [], confidence: 0.9, nextHint: '' })
const VERIFY = `"${process.execPath}" -e "process.exit(require('fs').existsSync('flag.txt')?0:1)"`

function stateFor(workspace) {
  return {
    id: 'card-evidence',
    status: 'running',
    workspace,
    rounds: [],
    constraints: [],
    lessons: [],
    autopilot: { enabled: false, guard: null },
    budget: { usd: 5, rounds: 10, spentUsd: 0 },
    evalset: { tasks: [{ id: 'harden-a', prompt: 'write the marker file so the verifier passes', verify: { cmd: VERIFY } }], holdout: [] },
    chain: {
      activeVersion: 1,
      versions: [
        { version: 1, spec: { name: 'gated', version: 1, params: { candidates: 1, maxSteps: 10 }, nodes: [
          { id: 'work', type: 'agent', name: 'worker', prompt: 'do it' },
          { id: 'check', type: 'verifier', name: 'check', cmd: VERIFY },
          { id: 'review', type: 'human', name: 'review', when: 'always', prompt: 'read the card and decide' },
        ] } },
      ],
    },
  }
}

function config() {
  return {
    session: { attemptTimeoutMs: 60_000, maxConcurrent: 1, stallMs: 300_000 },
    verify: { timeoutMs: 60_000 },
    loopPolicy: { halving: false, candidateMode: 'parallel', autoApply: true },
    knowledge: { enabled: false },
    halving: { enabled: false },
    gate: { minGain: 0.05 },
    models: {},
    checkpoint: { on: [] },
  }
}

const { root, dir } = repo('card')
const runtime = fakeRuntime(join(root, 'campaign'))
const view = { state: stateFor(dir), dir: join(root, 'campaign') }
const dispatcher = {
  async run(_prompt, opts) {
    writeFileSync(join(opts.cwd, 'flag.txt'), 'marker\n')
    return { stopReason: 'completed', failureKind: 'ok', text: REPORT, structured: null, timedOut: false, error: null, sessionId: 'x', durationMs: 1 }
  },
}
await runRound({ runtime, view, config: config(), dispatcher, log: () => {} })

let pass = 0
let fail = 0
const ok = (name, cond, detail) => {
  if (cond) pass += 1
  else {
    fail += 1
    console.log(`not ok - ${name}${detail ? ` :: ${detail}` : ''}`)
  }
}

const raised = runtime.events.filter((e) => e.type === 'checkpoint.raised').map((e) => e.data)
const gate = raised.find((c) => c.kind === 'gate')
ok('a human node on every round raises a gate checkpoint', Boolean(gate), JSON.stringify(raised.map((c) => c.kind)))
const evidence = gate?.payload?.evidence
ok('the card carries an evidence block', Boolean(evidence), JSON.stringify(gate?.payload))
ok('block 1: the task', evidence?.task?.id === 'harden-a', JSON.stringify(evidence?.task))
ok('block 2: the diff, with its paths', evidence?.diff?.paths?.includes('flag.txt'), JSON.stringify(evidence?.diff))
ok('block 3: the verifier verdict', evidence?.verifier?.ok === true && Number.isFinite(evidence?.verifier?.score), JSON.stringify(evidence?.verifier))
ok('block 4: the risk, with a level', ['low', 'medium', 'high'].includes(evidence?.risk?.level), JSON.stringify(evidence?.risk))
ok('the base really failed, so the verdict has a reason', evidence?.verifier?.baseFailed === true, JSON.stringify(evidence?.verifier))
ok('nothing is reported missing', (evidence?.missing ?? ['x']).length === 0, String(evidence?.missing))

const lines = renderEvidence(evidence)
ok('the message renders the four blocks in order', /^task: /m.test(lines[0]) && /^diff: /m.test(lines[1]) && /^verifier: /m.test(lines[2]) && /^risk: /m.test(lines[3]), lines.join(' | '))
ok('the message names the patch file the reviewer should read', /patch file/i.test(String(gate?.payload?.patch)) || lines.some((l) => /patch/.test(l)) || Boolean(gate?.payload?.patch))
ok('the prompt the chain declared reaches the card', /read the card and decide/.test(String(gate?.payload?.message)), String(gate?.payload?.message))

rmSync(root, { recursive: true, force: true })
console.log(`${fail === 0 ? 'ok' : 'FAIL'} - card-evidence ${pass}/${pass + fail}`)
if (fail > 0) process.exit(1)
