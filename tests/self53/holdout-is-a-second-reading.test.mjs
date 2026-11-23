// The holdout is a measurement, not a checkbox.
//
// Today the held-back task contributes one bit: exit code, turned into
// `checks.holdout: true | false | 'skipped'`. That bit is what makes an
// impossible task look survivable — a candidate that games the visible verifier
// passes it, and one that fails is rejected without anyone knowing by how much.
// The literature on cheating under impossible tasks (2510.20270 §7) and on
// monitors that read only the visible channel (2503.11926 §3.1) argue the same
// thing: a second reading is only a second reading if it carries a number.
//
// So the round records `holdoutScore` when the held-back verifier prints a
// metric, `0` when it fails outright, and `null` with a reason when there is no
// pool to read from — because most campaigns here have no pool (95 of 138), and
// inventing a zero would be the lie the field is already full of.
//
// The `holdoutGain` case matters most: it only exists when both sides were read
// on the same instrument. A held-back number from a different instrument is not
// a gain, it is a coincidence.
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { runRound } from '../../src/runtime/round.js'
import { makeRuntime, baseConfig, chainSpec } from '../self22/fixture.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const NODE = process.execPath
const RATE = `"${NODE}" rate.mjs`


function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'rsi-holdout-'))
  const git = (...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  git('init', '-q')
  git('config', 'user.email', 'rsi@local')
  git('config', 'user.name', 'rsi')
  git('config', 'core.autocrlf', 'false')
  writeFileSync(join(dir, 'impl.txt'), '0.3000\n')
  writeFileSync(join(dir, 'held.txt'), '0.3000\n')
  writeFileSync(
    join(dir, 'rate.mjs'),
    "import { readFileSync } from 'node:fs'\n" +
      "const v = Number(readFileSync(new URL('./impl.txt', import.meta.url), 'utf8').trim())\n" +
      'console.log(`KILLRATE=${v.toFixed(4)}`)\n',
  )
  writeFileSync(
    join(dir, 'held.mjs'),
    "import { readFileSync } from 'node:fs'\n" +
      "const v = Number(readFileSync(new URL('./held.txt', import.meta.url), 'utf8').trim())\n" +
      'console.log(`KILLRATE=${v.toFixed(4)}`)\n',
  )
  writeFileSync(join(dir, 'pass.mjs'), 'console.log("KILLRATE=1.0000")\n')
  git('add', '-A')
  git('commit', '-qm', 'base')
  const head = git('rev-parse', 'HEAD').trim()
  return { dir, head }
}

async function roundWith({ holdoutCmd, candidateVisible, candidateHeld, holdoutIds = ['h1'] }) {
  const { dir, head } = repo()
  const tasks = [{ id: 't1', title: 'raise the rate', brief: 'raise the kill rate', verify: { cmd: RATE, cwd: '.' } }]
  const holdoutTasks = holdoutIds.map((id) => ({ id, family: 'ho', brief: 'held back', verify: { cmd: holdoutCmd, cwd: '.' } }))
  const { runtime, view } = makeRuntime({
    repo: dir,
    spec: chainSpec({
      candidates: 1,
      nodes: [
        { id: 'attempts', type: 'map', over: 'candidates', of: { id: 'work', type: 'agent', role: 'worker', prompt: 'WORKER: raise the kill rate' } },
        { id: 'verify', type: 'verifier', cmd: RATE, cwd: '.' },
      ],
    }),
    tasks,
    budget: { rounds: 5 },
  })
  view.state.evalset.holdout = [...holdoutIds]
  view.state.evalset.tasks = [...tasks, ...holdoutTasks]
  view.state.evalset.tasks[0].base = head
  const dispatcher = {
    run: async (brief, opts = {}) => {
      writeFileSync(join(opts.cwd, 'impl.txt'), `${candidateVisible}\n`)
      if (candidateHeld !== null) writeFileSync(join(opts.cwd, 'held.txt'), `${candidateHeld}\n`)
      return {
        sessionId: 'w',
        text: `{"changed":["impl.txt"],"why":"raised it","evidence":["ran it"],"openQuestions":[],"confidence":0.6,"nextHint":""}`,
        stopReason: 'completed',
      }
    },
  }
  await runRound({ runtime, view, config: baseConfig({ halving: { enabled: false }, gate: { minGain: 0.05 } }), dispatcher, log: () => {}, notify: () => {} })
  const gate = runtime.events.filter((e) => e.type === 'gate.evaluated').at(-1)?.data
  const finish = runtime.events.filter((e) => e.type === 'round.finished').at(-1)?.data
  rmSync(dir, { recursive: true, force: true })
  return { gate, finish }
}

// 1. Both sides read the same instrument and the held-back reading is higher:
// the round says by how much, and it calls it a gain rather than a pass.
const better = await roundWith({ holdoutCmd: `"${NODE}" held.mjs`, candidateVisible: 0.4, candidateHeld: 0.8 })
assert.ok(better.gate, 'the round reached the gate')
assert.equal(better.gate.holdoutScore, 0.8, 'the holdout carries a number, not a boolean')
assert.equal(better.gate.candidateScore, 0.4, 'and the visible reading sits next to it')
assert.equal(better.gate.checks.holdoutGain, true, 'a higher held-back reading is a gain')
ok('a holdout that reads a metric says what it read and whether it beat the visible one')

// 2. The held-back reading is worse: still a number, and still recorded — but
// it does *not* veto here, and that is deliberate.
//
// One held-back reading from a pool of one or two tasks carries more noise than
// the difference it would be judging (R2's 2.2-6.0 points between runs), so
// letting it decide would swap a check for a coin flip. The existing veto stays
// where it is: a holdout that *fails* refuses the promotion. A holdout that
// passes lower is evidence to be accumulated, and the paired machinery from
// P0-1 is what will eventually accumulate it. Until then this is a reading, not
// a verdict.
const worse = await roundWith({ holdoutCmd: `"${NODE}" held.mjs`, candidateVisible: 0.9, candidateHeld: 0.2 })
assert.equal(worse.gate.holdoutScore, 0.2, 'a worse reading is still recorded')
assert.equal(worse.gate.checks.holdoutGain, false, 'and it is recorded as a loss')
assert.equal(worse.gate.promoted, true, 'a passing but lower reading is evidence, not yet a veto')
ok('a holdout that reads worse is a number and a loss, not a silent pass')

// 3. A holdout that fails outright reads 0: it was measured, and the answer was
// zero. Silence must not be confused with a failed measurement.
const failed = await roundWith({ holdoutCmd: 'exit 1', candidateVisible: 0.7, candidateHeld: 0.7 })
assert.equal(failed.gate.holdoutScore, 0, 'a failing holdout is a measured zero')
assert.equal(failed.gate.promoted, false)
ok('a failing holdout is a zero, not a silence')

// 4. No pool at all: null and a reason. This is the common case here, not the
// corner one — 95 of 138 campaigns have no pool.
const none = await roundWith({ holdoutCmd: `"${NODE}" held.mjs`, candidateVisible: 0.7, candidateHeld: 0.7, holdoutIds: [] })
assert.equal(none.gate.holdoutScore, null, 'no pool means no second reading, not a zero')
assert.match(String(none.gate.holdoutReason || ''), /pool|no holdout/i, 'and the round says why it has none')
ok('a campaign without a holdout pool records null and a reason')

// 5. A holdout that passes without printing a metric cannot produce a gain out
// of the candidate's number: a pass and a reading are different units.
const silent = await roundWith({ holdoutCmd: 'exit 0', candidateVisible: 0.7, candidateHeld: 0.7 })
assert.equal(silent.gate.holdoutScore, 1, 'a passing holdout with no metric is a pass')
assert.equal(silent.gate.checks.holdoutGain, null, 'a pass and a number are not a gain')
ok('a holdout that prints no metric cannot claim a gain')

// 6. The round record carries the reading too, so a later reader does not have
// to replay the gate to find out what the held-back task said.
assert.equal(better.finish.holdoutScore, 0.8)
assert.ok(String(better.finish.holdoutReason || '').length > 0, 'the round says what the reading means')
ok('the round record carries the held-back reading as well')

console.log(`\n${pass}/${pass} passed`)
