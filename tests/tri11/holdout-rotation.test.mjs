// A holdout exists to catch a change that satisfies the spec it was written for
// and breaks everything else. Running the same holdout every round turns that
// into a second spec the loop can quietly learn: the campaign that landed today
// was gated on exactly the tests it was measured against, round after round.
//
// Required: when a campaign declares several holdout tasks, each promotion runs
// the *next* one, round-robin, and the round says which one it used.
//   - three holdouts, three rounds -> h1, h2, h3;
//   - `round.finished.holdoutId` names the task that actually ran, and
//     `holdoutRuns === 1`;
//   - a single holdout keeps the old behaviour (it runs every round);
//   - a failing holdout still ends the round as 'holdout-failed', naming it.
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { runRound } from '../../src/runtime/round.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

function repo(prefix) {
  const dir = mkdtempSync(join(tmpdir(), `loom-${prefix}-`))
  git(dir, 'init', '-q')
  git(dir, 'config', 'user.email', 'loom@local')
  git(dir, 'config', 'user.name', 'loom')
  git(dir, 'config', 'core.autocrlf', 'false')
  writeFileSync(join(dir, 'keep.txt'), 'keep\n')
  git(dir, 'add', '-A')
  git(dir, 'commit', '-qm', 'base')
  return dir
}

function fakeRuntime(dir) {
  const events = []
  return {
    home: join(dir, 'home'),
    events,
    watchAttempt() {},
    unwatchAttempt() {},
    stallReason() {
      return null
    },
    append(_view, type, data) {
      events.push({ type, data })
    },
  }
}

const REPORT = {
  changed: ['keep.txt'],
  why: 'made the line shorter',
  evidence: ['tests pass'],
  openQuestions: [],
  confidence: 0.8,
  nextHint: '',
}

const config = {
  session: { attemptTimeoutMs: 60_000, maxConcurrent: 1 },
  verify: { timeoutMs: 30_000 },
  loopPolicy: { halving: false, candidateMode: 'parallel' },
  knowledge: { enabled: false, maxShown: 0 },
  halving: { enabled: false },
  gate: { minGain: 0 },
  models: {},
  checkpoint: { on: [] },
}

function makeView(dir, holdout) {
  const view = {
    dir: join(dir, 'campaign'),
    state: {
      id: 'holdout',
      status: 'running',
      workspace: dir,
      objective: 'rotate the holdout',
      rounds: [],
      constraints: [],
      autopilot: { enabled: false, guard: null },
      lessons: [],
      budget: { rounds: 10, roundsUsed: 0, usd: 10, spentUsd: 0 },
      evalset: {
        tasks: [{ id: 't1', family: 'f', prompt: 'change something', verify: { cmd: 'exit 0' } }],
        holdout,
      },
      chain: {
        activeVersion: 1,
        versions: [{ version: 1, spec: { name: 't', version: 1, params: { candidates: 1 }, nodes: [] } }],
      },
    },
  }
  mkdirSync(view.dir, { recursive: true })
  return view
}

const dispatcher = {
  run: async () => ({ sessionId: 'work', text: JSON.stringify(REPORT), stopReason: 'completed' }),
}

/** Fold the round's own event into the view, the way the reducer would. */
function fold(view, rt, before) {
  const started = rt.events.slice(before).filter((e) => e.type === 'round.started').pop()
  const finished = rt.events.slice(before).filter((e) => e.type === 'round.finished').pop()
  view.state.rounds.push({
    n: started?.data?.n ?? view.state.rounds.length + 1,
    taskId: started?.data?.taskId ?? 't1',
    status: finished?.data?.status ?? 'no-gain',
    promoted: Boolean(finished?.data?.promoted),
    landed: Boolean(finished?.data?.promoted),
    score: finished?.data?.score ?? 0,
    attempts: finished?.data?.attemptCount ?? 0,
  })
  return finished?.data ?? null
}

// 1. Three holdouts, three rounds: each round gates on the next one.
{
  const dir = repo('holdout-rotate')
  const hits = join(dir, 'hits.txt')
  const holdouts = ['h1', 'h2', 'h3'].map((id) => ({
    id,
    family: 'h',
    prompt: 'held back',
    // Write the id that actually ran, so the assertion sees the verifier, not a
    // variable. A literal "\n" survives no quoting layer: build the newline in
    // the child process instead of hoping it survives this one.
    verify: { cmd: `"${process.execPath}" -e "require('fs').appendFileSync(${JSON.stringify(hits)},${JSON.stringify(id)}+String.fromCharCode(10));process.exit(0)"` },
  }))
  const rt = fakeRuntime(dir)
  const view = makeView(dir, holdouts)
  const seen = []
  for (let i = 0; i < 3; i += 1) {
    const before = rt.events.length
    await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })
    const finished = fold(view, rt, before)
    assert.ok(finished, `round ${i + 1} finished`)
    seen.push(finished.holdoutId)
    assert.equal(finished.holdoutRuns, 1, 'exactly one holdout ran')
  }
  assert.deepEqual(seen, ['h1', 'h2', 'h3'], `each round must gate on the next holdout, got ${JSON.stringify(seen)}`)
  const ran = readFileSync(hits, 'utf8').trim().split(/\r?\n/)
  assert.deepEqual(ran, ['h1', 'h2', 'h3'], 'the verifiers that actually ran agree with the labels')
  ok('rounds rotate through the holdout pool instead of re-testing the same one')
}

// 2. One holdout behaves as before.
{
  const dir = repo('holdout-single')
  const rt = fakeRuntime(dir)
  const view = makeView(dir, [{ id: 'only', family: 'h', prompt: 'held back', verify: { cmd: 'exit 0' } }])
  const seen = []
  for (let i = 0; i < 2; i += 1) {
    const before = rt.events.length
    await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })
    seen.push(fold(view, rt, before).holdoutId)
  }
  assert.deepEqual(seen, ['only', 'only'], 'a single holdout still runs every round')
  ok('a one-holdout campaign is unchanged')
}

// 3. A failing holdout names itself.
{
  const dir = repo('holdout-fail')
  const rt = fakeRuntime(dir)
  const view = makeView(dir, [
    { id: 'g1', family: 'h', prompt: 'held back', verify: { cmd: 'exit 0' } },
    { id: 'g2', family: 'h', prompt: 'held back', verify: { cmd: 'exit 1' } },
  ])
  const before1 = rt.events.length
  await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })
  const first = fold(view, rt, before1)
  assert.equal(first.status, 'promoted', 'the first holdout passes')
  const before2 = rt.events.length
  await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })
  const second = fold(view, rt, before2)
  assert.equal(second.status, 'holdout-failed', 'the failing holdout blocks the promotion')
  assert.equal(second.holdoutId, 'g2', 'and the round says which one broke')
  ok('a failing holdout is named, not just counted')
}

console.log(`\n${pass}/${pass} passed`)
