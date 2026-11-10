// A lesson is a claim about the task that a future round is told to trust. The
// knowledge tree currently accepts one from any promotion -- including a
// promotion where nobody proved any work. Measured over the ledger: 22 of 103
// rounds promoted a candidate whose diff was empty, and 19 of the resulting
// "there was nothing to do" claims are still in the tree, waiting to be
// injected into the next worker's brief as if they were a finding.
//
// The rule this pins: knowledge is derived from work that was proven, not from
// a round that happened to land. A no-op landing is still a landing (the task
// is satisfied, the selector must move on) -- it just teaches nothing.
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

const trueVerifier = `"${process.execPath}" -e "process.exit(0)"`

const CLAIM = JSON.stringify({
  changed: [],
  why: 'the suite already passes on this tree, so there is nothing to change',
  evidence: ['the suite passed without edits'],
  openQuestions: [],
  confidence: 0.75,
  nextHint: '',
})

function campaign(dir, campaignDir, task) {
  return {
    id: 'lw1',
    workspace: dir,
    rounds: [],
    constraints: [],
    autopilot: { enabled: false, guard: null },
    lessons: [],
    budget: { usd: 10, rounds: 5, minutes: 60, tokens: 0 },
    evalset: { tasks: [task], holdout: [] },
    chain: { activeVersion: 1, versions: [{ version: 1, spec: { name: 'q', version: 1, params: { candidates: 1 }, nodes: [] } }] },
  }
}

function fakeRuntime(home) {
  const events = []
  return {
    events,
    home,
    append(_view, type, data) {
      events.push({ type, data })
      return data
    },
    watchAttempt() {},
    unwatchAttempt() {},
    stallReason: () => null,
  }
}

const baseConfig = {
  session: { attemptTimeoutMs: 120000, maxConcurrent: 1 },
  verify: { timeoutMs: 30000 },
  loopPolicy: { halving: false, candidateMode: 'parallel' },
  knowledge: { enabled: false },
  halving: { enabled: false },
  gate: { minGain: 0 },
  models: {},
  checkpoint: { on: [] },
}

// 1. A round that proves no work landed still lands, and teaches nothing.
{
  const { root, dir } = repo('lesson-noop')
  const campaignDir = mkdtempSync(join(tmpdir(), 'loom-camp-'))
  try {
    const state = campaign(dir, campaignDir, { id: 't1', prompt: 'p', verify: { cmd: trueVerifier, timeoutMs: 20000 } })
    const rt = fakeRuntime(campaignDir)
    // The child reports no changed files: nothing was proven, only asserted.
    await runRound({
      runtime: rt,
      view: { id: 'lw1', dir: campaignDir, state },
      config: baseConfig,
      dispatcher: { run: async () => ({ sessionId: 's1', text: CLAIM, stopReason: 'completed' }) },
      log: () => {},
    })
    const gate = rt.events.find((e) => e.type === 'gate.evaluated')
    assert.equal(gate.data.checks.noop, true, 'the candidate changed nothing it could prove')
    assert.equal(gate.data.promoted, true, 'the task is satisfied, so the round lands')
    const lesson = rt.events.find((e) => e.type === 'lesson.added')
    assert.equal(lesson, undefined, 'a landing that proved no work teaches nothing')
    ok('a no-op landing does not become knowledge')
  } finally {
    rmSync(root, { recursive: true, force: true })
    rmSync(campaignDir, { recursive: true, force: true })
  }
}

// 2. The same shape with a patch: proof of work is what knowledge is made of.
{
  const { root, dir } = repo('lesson-work')
  const campaignDir = mkdtempSync(join(tmpdir(), 'loom-camp-'))
  try {
    const state = campaign(dir, campaignDir, { id: 't2', prompt: 'p', verify: { cmd: trueVerifier, timeoutMs: 20000 } })
    ;(state.lessons = []), (state.evalset.tasks[0].id = 't2')
    const rt = fakeRuntime(campaignDir)
    await runRound({
      runtime: rt,
      view: { id: 'lw1', dir: campaignDir, state },
      config: baseConfig,
      dispatcher: {
        run: async (_brief, ctx) => {
          writeFileSync(join(ctx.cwd, 'new.txt'), 'x\n')
          return {
            sessionId: 's1',
            text: JSON.stringify({ changed: ['new.txt'], why: 'wrote the missing file', evidence: ['the file exists'], openQuestions: [], confidence: 0.8, nextHint: '' }),
            stopReason: 'completed',
          }
        },
      },
      log: () => {},
    })
    const gate = rt.events.find((e) => e.type === 'gate.evaluated')
    assert.equal(gate.data.checks.noop, false, 'the patch is real')
    const lesson = rt.events.find((e) => e.type === 'lesson.added')
    assert.ok(lesson, 'proven work becomes a lesson')
    assert.match(lesson.data.lesson.claim, /wrote the missing file/)
    ok('proven work still becomes knowledge')
  } finally {
    rmSync(root, { recursive: true, force: true })
    rmSync(campaignDir, { recursive: true, force: true })
  }
}

console.log(`\n${pass}/2 passed`)
assert.equal(pass, 2)
