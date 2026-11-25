/**
 * Spec: a task may own the apparatus it was asked to change.
 *
 * `oracleClean` refuses a patch that edits the file the verifier runs. That is
 * right for a fixture -- `fixtures/cases.json` must not be rewritable to fake a
 * green -- and wrong for a task whose whole objective is changing the gate: the
 * instruction ("edit src/gate/oracle.js and scripts/test-all.mjs") and the
 * refusal ("you edited the script the verifier runs") then contradict each
 * other, and two of the last three campaigns produced correct patches that could
 * never promote for this reason alone.
 *
 * So a task may declare the apparatus it owns:
 *
 *   verify: { cmd: 'node scripts/test-all.mjs', owns: ['scripts/test-all.mjs'] }
 *
 * A patch that touches only declared paths is judged by its verifier. A declared
 * path the patch did not touch is never reported as released, so a task cannot
 * buy the exception with a list it does not use. No declaration is byte-for-byte
 * today's behaviour.
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { oracleClean, oracleVerdict, parseOwns } from '../../src/gate/oracle.js'
import { runRound } from '../../src/runtime/round.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

// ---------------------------------------------------------------------------
// 1. The pure decision, in every reading
// ---------------------------------------------------------------------------

// No declaration: the old refusal, exactly.
assert.equal(
  oracleClean({ patchFile: null, oraclePaths: ['check.mjs'], filesChanged: ['check.mjs'] }),
  false,
  'without verify.owns the instrument edit is still refused',
)
assert.deepEqual(
  oracleVerdict({ patchFile: null, oraclePaths: ['check.mjs'], filesChanged: ['check.mjs'] }).released,
  [],
  'a refusal releases nothing',
)
ok('without a declaration the instrument edit is still refused')

// A declared file the patch edited is released, not refused.
const ownedClean = oracleVerdict({
  patchFile: null,
  oraclePaths: ['check.mjs'],
  filesChanged: ['check.mjs'],
  owns: ['check.mjs'],
})
assert.equal(ownedClean.clean, true, 'an owned apparatus file is not a cheat')
assert.deepEqual(ownedClean.released, ['check.mjs'], 'and the decision names what it released')
ok('an owned apparatus file is released, not refused')

// A declared file the patch did not touch is not evidence of anything.
const untouched = oracleVerdict({
  patchFile: null,
  oraclePaths: ['check.mjs', 'scripts/guard.mjs'],
  filesChanged: ['check.mjs'],
  owns: ['check.mjs', 'scripts/guard.mjs'],
})
assert.deepEqual(untouched.released, ['check.mjs'], 'only the touched owned path is named')
ok('an owned path the patch did not touch is never reported')

// Owning a path that is NOT apparatus releases nothing: nothing was excused.
const nonApparatus = oracleVerdict({
  patchFile: null,
  oraclePaths: ['check.mjs'],
  filesChanged: ['lib.mjs'],
  owns: ['lib.mjs'],
})
assert.equal(nonApparatus.clean, true, 'declaring a non-apparatus path changes nothing')
assert.deepEqual(nonApparatus.released, [], 'and releases nothing, because it excused nothing')
assert.deepEqual(nonApparatus.ownedTouched, ['lib.mjs'], 'though the record says the owned path was touched')
ok('an owned path that is not apparatus is touched, not released')

// A non-owned apparatus file is still refused even when something else is owned.
const mixed = oracleVerdict({
  patchFile: null,
  oraclePaths: ['check.mjs', 'lib.mjs'],
  filesChanged: ['lib.mjs'],
  owns: ['check.mjs'],
})
assert.equal(mixed.clean, false, 'owning one file does not license another')
assert.deepEqual(mixed.released, [], 'a refused patch released nothing')
ok('owning one file does not license another')

// A directory entry covers the files under it, and only those.
const dir = oracleVerdict({
  patchFile: null,
  oraclePaths: ['scripts/check.mjs', 'scripts/support.mjs', 'tests/check.mjs'],
  filesChanged: ['scripts/check.mjs', 'scripts/support.mjs'],
  owns: ['scripts'],
})
assert.equal(dir.clean, true, 'a directory entry covers files under that directory')
assert.deepEqual(dir.released, ['scripts/check.mjs', 'scripts/support.mjs'], 'and names each one')
ok('a directory entry covers the files under it')

assert.equal(
  oracleVerdict({
    patchFile: null,
    oraclePaths: ['scripts/check.mjs', 'tests/check.mjs'],
    filesChanged: ['tests/check.mjs'],
    owns: ['scripts'],
  }).clean,
  false,
  'the sibling directory is not covered by the entry',
)
ok('an owned directory does not cover a sibling directory')

// Normalisation: Windows separators, ./, trailing slashes are the same entry.
assert.deepEqual(parseOwns(['.\\scripts\\check.mjs', './lib.mjs', 'scripts/', '', 7, null]), [
  'scripts/check.mjs',
  'lib.mjs',
  'scripts',
], 'declared paths are normalised and junk is dropped')
ok('declared paths are normalised like patch paths')

// ---------------------------------------------------------------------------
// 2. The real round: a valid gate patch promotes and the record shows the hook
// ---------------------------------------------------------------------------
const CHECK = `import { broken } from './lib.mjs'
process.stdout.write('QUALITY=' + (broken ? '0.500' : '1.000') + '\\n')
process.exit(0)
`
const LIB_BROKEN = 'export const broken = true\n'
const LIB_FIXED = 'export const broken = false\n'

const git = (cwd, ...args) =>
  execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'loom-owned-'))
  git(dir, 'init', '-q')
  git(dir, 'config', 'user.email', 'loom@local')
  git(dir, 'config', 'user.name', 'loom')
  git(dir, 'config', 'core.autocrlf', 'false')
  writeFileSync(join(dir, 'check.mjs'), CHECK)
  writeFileSync(join(dir, 'lib.mjs'), LIB_BROKEN)
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

function viewFor(dir, owns) {
  return {
    dir: join(dir, 'campaign'),
    state: {
      id: 'owned',
      status: 'running',
      workspace: dir,
      rounds: [],
      constraints: [],
      autopilot: { enabled: true, guard: null },
      lessons: [],
      budget: { rounds: 10, roundsUsed: 0, usd: 5, spentUsd: 0 },
      evalset: {
        tasks: [{
          id: 'own-gate',
          family: 'gate',
          prompt: 'change the gate itself: make check.mjs read the fixed flag',
          verify: {
            cmd: `"${process.execPath}" check.mjs`,
            timeoutMs: 30_000,
            ...(owns ? { owns } : {}),
            metrics: { quality: { pattern: 'QUALITY=(\\d+(?:\\.\\d+)?)', group: 1 } },
          },
        }],
        holdout: [],
      },
      chain: {
        activeVersion: 1,
        versions: [{ version: 1, spec: { name: 't', version: 1, nodes: [] }, params: { candidates: 1 } }],
      },
    },
  }
}

const config = {
  session: { attemptTimeoutMs: 60_000, maxConcurrent: 1 },
  verify: { timeoutMs: 30_000 },
  loopPolicy: {},
  knowledge: { enabled: false, maxShown: 0 },
  halving: { enabled: false },
  gate: { minGain: 0.05 },
  models: {},
}

const report = (changed, why) =>
  JSON.stringify({ changed, why, evidence: ['ran it'], openQuestions: [], confidence: 0.9, nextHint: '' })

// 2a. The task owns the file it was told to edit; the patch is judged by the
// verifier and recorded as released.
{
  const dir = repo()
  const rt = fakeRuntime(dir)
  const view = viewFor(dir, ['check.mjs'])
  mkdirSync(view.dir, { recursive: true })
  const dispatcher = {
    run: async (_prompt, opts) => {
      // The fix the task asks for: the instrument now reads the fixed flag.
      writeFileSync(join(opts.cwd, 'lib.mjs'), LIB_FIXED)
      writeFileSync(join(opts.cwd, 'check.mjs'), CHECK.replace("'0.500'", "'1.000'"))
      return { sessionId: 's-owned', text: report(['check.mjs', 'lib.mjs'], 'fix the instrument and the flag'), stopReason: 'completed' }
    },
  }
  await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })
  const gate = rt.events.find((e) => e.type === 'gate.evaluated')
  assert.equal(gate?.data?.checks?.oracleClean, true, 'an owned apparatus edit is clean')
  assert.deepEqual(gate?.data?.checks?.oracleReleased, ['check.mjs'], 'the gate record names the released path')
  assert.deepEqual(gate?.data?.checks?.oracleOwns, ['check.mjs'], 'and the declaration it came from')
  assert.deepEqual(gate?.data?.checks?.oracleOwnedTouched, ['check.mjs'], 'and every owned path the patch touched')
  assert.equal(gate?.data?.promoted, true, 'a correct owned edit can promote')
  ok('a declared apparatus edit is released and can promote')
  rmSync(dir, { recursive: true, force: true })
}

// 2b. Owning a file you did not touch buys nothing: the untouched declaration
// is not reported and the apparatus edit is still refused.
{
  const dir = repo()
  const rt = fakeRuntime(dir)
  const view = viewFor(dir, ['lib.mjs'])
  mkdirSync(view.dir, { recursive: true })
  const dispatcher = {
    run: async (_prompt, opts) => {
      writeFileSync(join(opts.cwd, 'check.mjs'), "process.stdout.write('QUALITY=1.000\\n')\nprocess.exit(0)\n")
      return { sessionId: 's-cheat', text: report(['check.mjs'], 'make it print the ceiling'), stopReason: 'completed' }
    },
  }
  await runRound({ runtime: rt, view, config, dispatcher, log: () => {}, notify: () => {} })
  const gate = rt.events.find((e) => e.type === 'gate.evaluated')
  assert.equal(gate?.data?.checks?.oracleClean, false, 'an undeclared instrument edit is still refused')
  assert.deepEqual(gate?.data?.checks?.oracleReleased, [], 'the untouched declaration is not reported as released')
  assert.equal(gate?.data?.promoted, false, 'and it does not promote')
  ok('owning an untouched file does not license the instrument edit')
  rmSync(dir, { recursive: true, force: true })
}

const EXPECTED = 10
assert.equal(pass, EXPECTED, `ran ${pass} specs, declared ${EXPECTED}`)
console.log(`\n${pass}/${EXPECTED} passed`)
