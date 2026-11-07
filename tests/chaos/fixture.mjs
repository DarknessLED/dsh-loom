// Shared scaffolding for the chaos specs. These tests attack the plugin the way
// reality does: children die, logs drift, models run out of context, the host is
// killed mid-round. Every helper here is deliberately small and local so a spec
// reads as the failure it models.
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'

export function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

export function repo(prefix = 'loom-chaos-') {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  git(dir, 'init', '-q')
  git(dir, 'config', 'user.email', 'loom@local')
  git(dir, 'config', 'user.name', 'loom')
  git(dir, 'config', 'core.autocrlf', 'false')
  writeFileSync(join(dir, 'keep.txt'), 'keep\n')
  git(dir, 'add', '-A')
  git(dir, 'commit', '-qm', 'base')
  return dir
}

/**
 * Campaign storage lives outside the workspace on purpose: `~/.dsh/loom` is never
 * inside the repo, and a recovery that walks the tree must not be able to see it.
 */
export function campaignDir() {
  const dir = join(mkdtempSync(join(tmpdir(), 'loom-chaos-camp-')), 'campaigns', 'chaos')
  mkdirSync(join(dir, 'leases'), { recursive: true })
  mkdirSync(join(dir, 'artifacts'), { recursive: true })
  return dir
}

/** Append events to a campaign's ledger the way the runtime would. */
export function writeEvents(dir, events) {
  const lines = events
    .map((e, i) => JSON.stringify({ seq: e.seq ?? i + 1, t: e.t ?? 1_000 + i, actor: e.actor ?? 'system', ...e }))
    .join('\n')
  writeFileSync(join(dir, 'events.jsonl'), `${lines}\n`)
}

export function writeLease(dir, attemptId, lease) {
  writeFileSync(join(dir, 'leases', `${attemptId}.json`), `${JSON.stringify(lease)}\n`)
}

/** The shape `runRound` and the panel expect from the runtime. */
export function fakeRuntime(dir, workspace) {
  const events = []
  return {
    home: join(dir, 'home'),
    events,
    dir,
    append(_view, type, data) {
      events.push({ type, data })
      return { type, data }
    },
    watchAttempt() {},
    unwatchAttempt() {},
    stallReason() {
      return null
    },
    status() {
      return {}
    },
    workspace,
  }
}

export function baseState(over = {}) {
  return {
    id: 'chaos',
    status: 'running',
    workspace: null,
    rounds: [],
    constraints: [],
    autopilot: { enabled: true, guard: null },
    lessons: [],
    budget: { rounds: 10, roundsUsed: 0, usd: 5, spentUsd: 0 },
    evalset: { tasks: [], holdout: [] },
    chain: {
      activeVersion: 1,
      versions: [{ version: 1, spec: { name: 't', version: 1, nodes: [] }, params: { candidates: 1 } }],
    },
    ...over,
  }
}

export function baseConfig(over = {}) {
  return {
    session: { attemptTimeoutMs: 60_000, maxConcurrent: 1 },
    verify: { timeoutMs: 30_000 },
    loopPolicy: {},
    knowledge: { enabled: false, maxShown: 0 },
    halving: { enabled: false },
    gate: { minGain: 0.05 },
    models: {},
    ...over,
  }
}

export const REPORT = JSON.stringify({
  changed: [],
  why: 'chaos fixture',
  evidence: ['verified'],
  openQuestions: [],
  confidence: 0.9,
  nextHint: '',
})

let pass = 0
export function ok(name) {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}
export function done() {
  console.log(`\n${pass}/${pass} passed`)
  assert.equal(pass > 0, true)
}
