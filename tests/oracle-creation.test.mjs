// The instrument can be *created*, not just edited.
//
// `oracleClean` compares the patch's paths against the files the verify command
// currently runs. That derivation filters by existence, so when the candidate adds
// the very script the command names, the pre-patch oracle set is empty and the
// check says "not applicable" -- while the base run fails for the trivial reason
// that the script was missing. A red base then looks exactly like a bug fixed.
//
// This drives the real round on a fixture whose verify command names `oracle.mjs`
// and whose base tree does not contain it. The candidate writes it, prints the
// ceiling, and must not promote.
//   node tests/oracle-creation.test.mjs
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runRound } from '../src/runtime/round.js'
import { fileAtCommit } from '../src/exec/worktree.js'

let pass = 0
const ok = (name) => { pass += 1; console.log(`ok ${pass} - ${name}`) }
const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

const LIB = 'export const broken = true\n'

function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'loom-create-'))
  git(dir, 'init', '-q')
  git(dir, 'config', 'user.email', 'loom@local')
  git(dir, 'config', 'user.name', 'loom')
  git(dir, 'config', 'core.autocrlf', 'false')
  // No oracle.mjs: the command names a file that does not exist yet.
  writeFileSync(join(dir, 'lib.mjs'), LIB)
  git(dir, 'add', '-A')
  git(dir, 'commit', '-qm', 'base')
  return dir
}

function fakeRuntime(dir) {
  const events = []
  return { home: join(dir, 'home'), events, dir, watchAttempt() {}, unwatchAttempt() {}, stallReason() { return null }, append(_v, type, data) { events.push({ type, data }) }, status() { return {} } }
}

function viewFor(dir) {
  return {
    dir: join(dir, 'campaign'),
    state: {
      id: 'creation', status: 'running', workspace: dir, rounds: [], constraints: [],
      autopilot: { enabled: true, guard: null }, lessons: [], budget: { rounds: 10, roundsUsed: 0, usd: 5, spentUsd: 0 },
      evalset: {
        tasks: [{
          id: 'graded', family: 'f', prompt: 'make the quality check report 1.000',
          verify: { cmd: `"${process.execPath}" oracle.mjs`, timeoutMs: 30_000, metrics: { quality: { pattern: 'QUALITY=(\\d+(?:\\.\\d+)?)', group: 1 } } },
        }],
        holdout: [],
      },
      chain: { activeVersion: 1, versions: [{ version: 1, spec: { name: 't', version: 1, nodes: [] }, params: { candidates: 1 } }] },
    },
  }
}

const config = {
  session: { attemptTimeoutMs: 60_000, maxConcurrent: 1 },
  verify: { timeoutMs: 30_000 },
  loopPolicy: {}, knowledge: { enabled: false, maxShown: 0 }, halving: { enabled: false },
  gate: { minGain: 0.05 }, models: {},
}

const report = (changed, why) => JSON.stringify({ changed, why, evidence: ['ran it'], openQuestions: [], confidence: 0.9, nextHint: '' })

// 1. writing the instrument is not a promotion, and the gate names the file it created
{
  const dir = repo()
  const rt = fakeRuntime(dir)
  const view = viewFor(dir)
  mkdirSync(view.dir, { recursive: true })
  const dispatcher = {
    run: async (_prompt, opts) => {
      writeFileSync(join(opts.cwd, 'oracle.mjs'), "process.stdout.write('QUALITY=1.000\\n')\nprocess.exit(0)\n")
      return { sessionId: 's-create', text: report(['oracle.mjs'], 'write the check so it reports 1.000'), stopReason: 'completed' }
    },
  }
  await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })
  const gate = rt.events.find((e) => e.type === 'gate.evaluated')
  assert.equal(gate?.data?.checks?.hasPatch, true, 'the candidate produced a patch')
  assert.equal(gate?.data?.checks?.testsClean, true, 'the tests/ rule cannot see a root-level script')
  assert.equal(gate?.data?.checks?.oracleInBase, false, 'the gate says the instrument was absent at base')
  assert.deepEqual(gate?.data?.checks?.oracleCreated, ['oracle.mjs'], 'and names what the patch added')
  assert.equal(gate?.data?.checks?.earnedReason, 'oracle-absent-at-base', 'a red base about a missing script is not evidence')
  assert.equal(gate?.data?.promoted, false, 'writing your own instrument is not a promotion')
  assert.equal(rt.events.find((e) => e.type === 'artifact.promoted'), undefined, 'nothing is promoted')
  assert.equal(rt.events.find((e) => e.type === 'autopilot.applied'), undefined, 'nothing lands')
  assert.equal(readFileSync(join(dir, 'lib.mjs'), 'utf8'), LIB, 'the workspace is untouched')
  ok('a candidate that creates its own instrument is refused')
  rmSync(dir, { recursive: true, force: true })
}

// 2. a real fix against an instrument that already existed still promotes
{
  const dir = repo()
  writeFileSync(join(dir, 'oracle.mjs'), "import { broken } from './lib.mjs'\nprocess.stdout.write('QUALITY=' + (broken ? '0.500' : '1.000') + '\\n')\nprocess.exit(0)\n")
  git(dir, 'add', '-A')
  git(dir, 'commit', '-qm', 'add the instrument')
  const rt = fakeRuntime(dir)
  const view = viewFor(dir)
  mkdirSync(view.dir, { recursive: true })
  const dispatcher = {
    run: async (_prompt, opts) => {
      writeFileSync(join(opts.cwd, 'lib.mjs'), 'export const broken = false\n')
      return { sessionId: 's-honest', text: report(['lib.mjs'], 'fix the measured code'), stopReason: 'completed' }
    },
  }
  await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })
  const gate = rt.events.find((e) => e.type === 'gate.evaluated')
  assert.equal(gate?.data?.checks?.oracleInBase, true, 'the instrument was already in the base commit')
  assert.equal(gate?.data?.checks?.oracleCreated, undefined, 'the patch created nothing')
  assert.equal(gate?.data?.checks?.earnedReason, 'metric-improved', 'the climb is measured on the metric')
  assert.equal(gate?.data?.promoted, true, 'real work still promotes')
  ok('a candidate that fixes measured code still promotes')
  rmSync(dir, { recursive: true, force: true })
}

// 3. an unreadable base is unmeasured, not a refusal
{
  const dir = repo()
  const rt = fakeRuntime(dir)
  const view = viewFor(dir)
  mkdirSync(view.dir, { recursive: true })
  const dispatcher = {
    run: async (_prompt, opts) => {
      writeFileSync(join(opts.cwd, 'oracle.mjs'), "process.stdout.write('QUALITY=1.000\\n')\nprocess.exit(0)\n")
      return { sessionId: 's-nobase', text: report(['oracle.mjs'], 'x'), stopReason: 'completed' }
    },
  }
  // Sabotage the base: point the attempt's recorded base at a sha that is not in
  // this repository, so `git cat-file` cannot answer. The check must stay null
  // and nothing else may change -- an unanswerable question is not a refusal.
  const realAppend = rt.append.bind(rt)
  rt.append = (_v, type, data) => {
    if (type === 'attempt.finished') data.base = '0000000000000000000000000000000000000000'
    realAppend(_v, type, data)
  }
  await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })
  const gate = rt.events.find((e) => e.type === 'gate.evaluated')
  assert.equal(gate?.data?.checks?.oracleInBase, null, 'an unreadable base answers nothing')
  // The oracle check itself stays silent, which is the point of this case: an
  // unanswerable question must not be turned into a refusal by the check that
  // could not answer. The round is still refused, but by a rule that can see what
  // happened -- the task is graded and the base produced no number, so a candidate
  // that made the command green has not shown that the graded quantity moved. Two
  // different facts, and the record names the second one.
  assert.notEqual(gate?.data?.checks?.earnedReason, 'oracle-absent-at-base', 'the unreadable base did not become a refusal')
  assert.equal(gate?.data?.checks?.earnedReason, 'graded-metric-unmeasured', 'a graded task with no base number is unmeasured')
  assert.equal(gate?.data?.promoted, false, 'and writing the instrument does not promote')
  ok('an unreadable base is unmeasured, not a refusal')
  rmSync(dir, { recursive: true, force: true })
}

// 4. the helper itself: three answers, and the two failures are not one failure
{
  const dir = repo()
  const head = git(dir, 'rev-parse', 'HEAD').trim()
  assert.equal(await fileAtCommit(dir, head, 'lib.mjs'), true, 'a file in the tree is present')
  assert.equal(await fileAtCommit(dir, head, 'oracle.mjs'), false, 'a missing file in a real tree is absent')
  assert.equal(await fileAtCommit(dir, head, './lib.mjs'), true, 'a leading ./ is normalised')
  assert.equal(await fileAtCommit(dir, head, 'sub/lib.mjs'), false, 'a path at depth is matched at depth')
  assert.equal(await fileAtCommit(dir, 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef', 'lib.mjs'), null, 'an unknown sha cannot answer')
  assert.equal(await fileAtCommit(dir, '', 'lib.mjs'), null, 'no sha cannot answer')
  assert.equal(await fileAtCommit(join(dir, 'nope'), head, 'lib.mjs'), null, 'no repo cannot answer')
  assert.equal(await fileAtCommit(dir, head, ''), null, 'no path cannot answer')
  ok('the base lookup separates absent from unanswerable')
  rmSync(dir, { recursive: true, force: true })
}

// The denominator counts what `ok()` counts -- refusing, promoting, and staying
// unmeasured are three claims, each backed by several assertions above. Declaring
// 13 here (the assertion count) would print "3/13 passed" on a green run.
const EXPECTED = 4
assert.equal(pass, EXPECTED, `ran ${pass} claims, declared ${EXPECTED}`)
console.log(`\n${pass}/${EXPECTED} passed`)
