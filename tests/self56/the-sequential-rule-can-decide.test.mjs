// The sequential rule has to be allowed to decide — behind a flag that is off.
//
// `src/gate/sequential.js` computes an e-value and answers commit / reject /
// defer, and `src/runtime/round.js` writes that answer onto every
// `gate.evaluated` event. It then ignores it: the promotion is still
// `basePass && checks.holdout !== false`, so 483 recorded rounds carry a
// decision nobody acts on. A recorded decision that cannot change an outcome is
// decoration, and a rule nobody has ever let decide is a rule nobody has
// measured.
//
// This spec pins both directions of the flag:
//   - off (the default): the verdict is today's noise-bar comparison, even when
//     the e-value says commit;
//   - on: a commit promotes where the noise bar refused, a reject refuses where
//     the noise bar allowed, and a failed holdout still vetoes;
//   - every event names which rule decided.
import assert from 'node:assert/strict'
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runRound } from '../../src/runtime/round.js'
import { DEFAULT_CONFIG } from '../../src/core/config.js'
import { makeRuntime, baseConfig, chainSpec } from '../self22/fixture.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

// Off by default, and the default is the whole safety story: turning this on
// changes what the loop is allowed to promote.
assert.equal(DEFAULT_CONFIG.gate.sequentialDecides, false, 'the sequential rule does not decide until asked')
ok('gate.sequentialDecides defaults to false')

const NODE = process.execPath
const git = (dir, ...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

// A repo whose verifier both prints an instrument and gates on it: the base
// tree fails (so a passing candidate earned its verdict) while still yielding a
// kill rate to pair against.
function makeRateRepo(baseLine) {
  const dir = mkdtempSync(join(tmpdir(), 'rsi-sequential-decides-'))
  git(dir, 'init', '-q')
  git(dir, 'config', 'user.email', 'rsi@local')
  git(dir, 'config', 'user.name', 'rsi')
  git(dir, 'config', 'core.autocrlf', 'false')
  writeFileSync(join(dir, 'impl.txt'), `${baseLine}\n`)
  writeFileSync(
    join(dir, 'rate.mjs'),
    "import { readFileSync } from 'node:fs'\n" +
      "const raw = readFileSync(new URL('./impl.txt', import.meta.url), 'utf8').trim()\n" +
      'const value = Number(raw.slice(6))\n' +
      'if (Number.isFinite(value)) console.log(`KILLRATE=${value.toFixed(4)}`)\n' +
      'process.exit(Number.isFinite(value) && value >= 0.4 ? 0 : 1)\n',
  )
  git(dir, 'add', '-A')
  git(dir, 'commit', '-qm', 'base')
  return { dir, base: git(dir, 'rev-parse', 'HEAD').trim() }
}

const rateSpec = (cmd) =>
  chainSpec({
    candidates: 1,
    nodes: [
      { id: 'attempts', type: 'map', over: 'candidates', of: { id: 'work', type: 'agent', role: 'worker', prompt: 'WORKER: raise the rate' } },
      { id: 'verify', type: 'verifier', cmd, cwd: '.' },
    ],
  })

// One real round: rewrite impl.txt to `writeLine`, run the shared verifier.
// `history` seeds the campaign with rounds that only the e-process reads
// (`pairedHistory`) plus the incumbent the noise bar reads (`bestPriorScore`).
async function runRateRound({ baseLine, writeLine, history, holdoutCmd, decides }) {
  const task = { id: 't1', title: 'raise the rate', verify: { cmd: `"${NODE}" rate.mjs`, cwd: '.' }, brief: 'raise the kill rate' }
  const holdoutTask = { id: 'h1', family: 'f', prompt: 'holdout', verify: { cmd: holdoutCmd } }
  const repo = makeRateRepo(baseLine)
  const { runtime, view } = makeRuntime({ repo: repo.dir, spec: rateSpec(`"${NODE}" rate.mjs`), tasks: [task, holdoutTask], budget: { rounds: 5 } })
  view.state.evalset.tasks[0].base = repo.base
  view.state.evalset.holdout = ['h1']
  view.state.rounds = history
  await runRound({
    runtime,
    view,
    config: decides === undefined ? baseConfig() : baseConfig({ gate: { minGain: 0.05, sequentialDecides: decides } }),
    dispatcher: {
      run: async (brief, opts = {}) => {
        writeFileSync(join(opts.cwd, 'impl.txt'), `${writeLine}\n`)
        return {
          sessionId: 'w',
          text: '{"changed":["impl.txt"],"why":"raised the rate","evidence":["ran it"],"openQuestions":[],"confidence":0.6,"nextHint":""}',
          stopReason: 'completed',
        }
      },
    },
    log: () => {},
    notify: () => {},
  })
  const gate = runtime.events.filter((e) => e.type === 'gate.evaluated').at(-1)?.data ?? null
  const promoted = runtime.events.some((e) => e.type === 'artifact.promoted')
  rmSync(repo.dir, { recursive: true, force: true })
  rmSync(view.dir, { recursive: true, force: true })
  return { gate, promoted }
}

// Eight wins on one task: the running maximum crosses 1/alpha = 20 (1.5^8 =
// 25.6), so the e-process says commit. The best prior score is 0.9, which the
// noise bar makes this round beat by minGain.
const WIN_HISTORY = Array.from({ length: 9 }, (_, i) => ({
  n: i + 1,
  taskId: 't1',
  status: 'promoted',
  score: 0.1 * (i + 1),
  promoted: true,
  landed: true,
  attempts: [{ id: `a${i}`, score: 0.1 * (i + 1) }],
}))

// Five losses against the standing best, then this round's win: E = 1.5^1 * 0.5^5
// = 0.0469 <= alpha, so the e-process says reject. The best prior score is 0.9
// and the candidate reaches 1.0, which the noise bar allows.
const LOSS_HISTORY = Array.from({ length: 6 }, (_, i) => ({
  n: i + 1,
  taskId: 't1',
  status: 'promoted',
  score: i === 0 ? 0.9 : 0.9 - 0.1 * i,
  promoted: true,
  landed: true,
  attempts: [{ id: `b${i}`, score: i === 0 ? 0.9 : 0.9 - 0.1 * i }],
}))

// --- flag off: today's verdict stands even when the e-value says commit -----
{
  const { gate, promoted } = await runRateRound({ baseLine: 'VALUE=0.1000', writeLine: 'VALUE=0.5000', history: WIN_HISTORY, holdoutCmd: 'exit 0' })
  assert.ok(gate, 'the gate evaluated')
  assert.equal(gate.decision, 'commit', 'the e-process says commit')
  assert.equal(gate.checks.beatsIncumbent, false, 'the noise bar refuses: 0.5 does not beat 0.9 by minGain')
  assert.equal(gate.promoted, false, 'with the flag off the commit changes nothing')
  assert.equal(promoted, false, 'and nothing lands')
  assert.equal(gate.decidedBy, undefined, 'with the flag off the event keeps exactly the shape it has today')
  ok('flag off: a sequential commit does not promote past a refusing noise bar')
}

// --- flag on: the commit promotes where the noise bar refused --------------
{
  const { gate, promoted } = await runRateRound({ baseLine: 'VALUE=0.1000', writeLine: 'VALUE=0.5000', history: WIN_HISTORY, holdoutCmd: 'exit 0', decides: true })
  assert.ok(gate)
  assert.equal(gate.decision, 'commit')
  assert.equal(gate.checks.beatsIncumbent, false, 'the old comparison still refuses')
  assert.equal(gate.promoted, true, 'the sequential commit promotes anyway')
  assert.equal(promoted, true, 'and the artifact lands')
  assert.equal(gate.decidedBy, 'sequential', 'the event names the rule that decided')
  ok('flag on: a sequential commit promotes where the noise bar refused')
}

// --- flag on: the reject refuses where the noise bar allowed ---------------
{
  const { gate, promoted } = await runRateRound({ baseLine: 'VALUE=0.1000', writeLine: 'VALUE=1.0000', history: LOSS_HISTORY, holdoutCmd: 'exit 0', decides: true })
  assert.ok(gate)
  assert.equal(gate.decision, 'reject', 'the e-process says reject')
  assert.equal(gate.checks.beatsIncumbent, true, 'the noise bar would have allowed it')
  assert.equal(gate.promoted, false, 'the sequential reject refuses')
  assert.equal(promoted, false)
  assert.equal(gate.decidedBy, 'sequential')
  ok('flag on: a sequential reject refuses where the noise bar allowed')
}

// --- flag on: a failed holdout still vetoes -------------------------------
{
  const { gate, promoted } = await runRateRound({ baseLine: 'VALUE=0.1000', writeLine: 'VALUE=0.5000', history: WIN_HISTORY, holdoutCmd: 'exit 1', decides: true })
  assert.ok(gate)
  assert.equal(gate.decision, 'commit', 'the sequential rule still says commit')
  assert.equal(gate.checks.holdout, false, 'the held-back verifier failed')
  assert.equal(gate.promoted, false, 'and the holdout vetoes the promotion')
  assert.equal(promoted, false)
  ok('flag on: a failed holdout vetoes a sequential commit')
}
