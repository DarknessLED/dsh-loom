// A verified attempt that changed nothing is a real outcome (the tree already
// satisfies the verifier) but it is not a patch. It must land as a no-op so the
// selector stops spending rounds on a solved task, and `git apply` must never be
// asked to apply an empty patch.
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { applyPatch } from '../src/exec/patch.js'
import { runRound } from '../../src/runtime/round.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'loom-noop-'))
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
    dir,
    watchAttempt() {},
    unwatchAttempt() {},
    stallReason() {
      return null
    },
    append(_view, type, data) {
      events.push({ type, data })
    },
    status() {
      return {}
    },
  }
}

const baseState = {
  id: 'noop',
  status: 'running',
  workspace: null,
  rounds: [],
  constraints: [],
  autopilot: { enabled: true, guard: null },
  lessons: [],
  budget: { rounds: 10, roundsUsed: 0, usd: 5, spentUsd: 0 },
  evalset: { tasks: [], holdout: [] },
  chain: { activeVersion: 1, versions: [{ version: 1, spec: { name: 't', version: 1, nodes: [] }, params: { candidates: 1 } }] },
}

// 1. an empty patch applies cleanly instead of failing
{
  const dir = repo()
  const empty = join(dir, 'empty.patch')
  writeFileSync(empty, '')
  const res = await applyPatch({ repo: dir, patchFile: empty })
  assert.equal(res.ok, true, 'an empty patch is not a failure')
  assert.equal(res.reason, 'empty-patch')
  ok('applyPatch treats an empty patch as a no-op success')
  rmSync(dir, { recursive: true, force: true })
}

// 2. round: verifier passes, agent changed nothing -> no-op landing, no patch apply
{
  const dir = repo()
  const rt = fakeRuntime(dir)
  const view = {
    dir: join(dir, 'campaign'),
    state: { ...baseState, workspace: dir, evalset: { tasks: [{ id: 't1', family: 'f', prompt: 'do it', verify: { cmd: 'exit 0' } }], holdout: [] } },
  }
  mkdirSync(view.dir, { recursive: true })
  const config = {
    session: { attemptTimeoutMs: 60_000, maxConcurrent: 1 },
    verify: { timeoutMs: 30_000 },
    loopPolicy: {},
    knowledge: { enabled: false, maxShown: 0 },
    halving: { enabled: false },
    gate: { minGain: 0.05 },
    models: {},
  }
  const dispatcher = { run: async () => ({ sessionId: 's1', text: '{"changed":[],"why":"nothing to do","evidence":["verified"],"openQuestions":[],"confidence":0.9,"nextHint":""}', stopReason: 'completed' }) }
  const res = await runRound({
    runtime: rt,
    view,
    config,
    dispatcher,
    log: () => {},
    notify: () => {},
  })
  const gate = rt.events.find((e) => e.type === 'gate.evaluated')
  const landed = rt.events.find((e) => e.type === 'autopilot.applied')
  const promoted = rt.events.find((e) => e.type === 'artifact.promoted')
  assert.equal(gate?.data?.checks?.hasPatch, false, 'an empty diff is not a patch')
  assert.equal(gate?.data?.checks?.noop, true, 'the gate names the no-op case')
  assert.equal(gate?.data?.promoted, true, 'a verified no-op still lands')
  assert.equal(promoted?.data?.noop, true, 'the promotion records itself as a no-op')
  assert.equal(landed?.data?.noop, true, 'the round is marked landed without touching the tree')
  assert.equal(existsSync(join(dir, 'keep.txt')), true)
  assert.equal(res?.status ?? 'promoted', 'promoted')
  ok('a verified attempt that changed nothing lands as a no-op')
  rmSync(dir, { recursive: true, force: true })
}

console.log(`\n${pass}/${pass} passed`)
