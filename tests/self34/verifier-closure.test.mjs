// A verifier is the code it runs, not just the file its command names.
// `node scripts/check.mjs` imports the rule it enforces; a candidate that edits
// that module changes the verdict while `oracleClean` — which only saw the
// script path — reports a clean patch and the round promotes.
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { runRound } from '../../src/runtime/round.js'
import { oraclePathsFor } from '../../src/gate/oracle.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'loom-closure-'))
  git(dir, 'init', '-q')
  git(dir, 'config', 'user.email', 'loom@local')
  git(dir, 'config', 'user.name', 'loom')
  git(dir, 'config', 'core.autocrlf', 'false')
  mkdirSync(join(dir, 'scripts'))
  writeFileSync(join(dir, 'scripts', 'assertions.mjs'), 'export const ok = false\n')
  writeFileSync(
    join(dir, 'scripts', 'check.mjs'),
    "import { ok } from './assertions.mjs'\nprocess.exit(ok ? 0 : 1)\n",
  )
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
    stallReason() { return null },
    append(_view, type, data) { events.push({ type, data }) },
    status() { return {} },
  }
}

const dir = repo()
const spec = { cmd: `"${process.execPath}" scripts/check.mjs` }

// The closure reaches through the relative import; a bare path list would not.
const paths = oraclePathsFor(spec, { cwd: dir })
assert.ok(paths.includes('scripts/check.mjs'), 'the named script is an oracle')
assert.ok(paths.includes('scripts/assertions.mjs'), 'the module the script imports is an oracle')
ok('the oracle set is the verifier code, not just its entry file')

const rt = fakeRuntime(dir)
const view = {
  dir: join(dir, 'campaign'),
  state: {
    id: 'closure',
    status: 'running',
    workspace: dir,
    rounds: [],
    constraints: [],
    autopilot: { enabled: false, guard: null },
    lessons: [],
    budget: { rounds: 5, roundsUsed: 0, usd: 5, spentUsd: 0 },
    evalset: { tasks: [{ id: 't1', family: 'f', prompt: 'make it pass', verify: spec }], holdout: [] },
    chain: { activeVersion: 1, versions: [{ version: 1, spec: { name: 't', version: 1, nodes: [] }, params: { candidates: 1 } }] },
  },
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
// The candidate "fixes" the suite by editing the module that decides pass/fail.
const dispatcher = {
  run: async (brief, opts = {}) => {
    writeFileSync(join(opts.cwd, 'scripts', 'assertions.mjs'), 'export const ok = true\n')
    return {
      sessionId: 's1',
      text: '{"changed":["scripts/assertions.mjs"],"why":"made it pass","evidence":["node scripts/check.mjs"],"openQuestions":[],"confidence":0.9,"nextHint":""}',
      stopReason: 'completed',
    }
  },
}
await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })
const gate = rt.events.find((e) => e.type === 'gate.evaluated')
const promoted = rt.events.find((e) => e.type === 'artifact.promoted')
assert.equal(gate?.data?.checks?.verifierOk, true, 'the verifier did pass — through its dependency')
assert.equal(gate?.data?.checks?.oracleClean, false, 'editing the verifier dependency is not a clean patch')
assert.equal(gate?.data?.promoted, false, 'the win does not land')
assert.equal(promoted, undefined, 'no artifact was recorded')
ok('a patch that edits the verifier dependency cannot promote')

rmSync(dir, { recursive: true, force: true })
console.log(`\n${pass}/${pass} passed`)
