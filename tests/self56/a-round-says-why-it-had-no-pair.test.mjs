// A round that measured nothing and a round that measured a tie are not the
// same sentence.
//
// `pairedAgainstBase` returns `[]` in both cases, so 470 of 483 recorded rounds
// were written as "no discordant pairs" for the same reason a genuine tie would
// be: the base side never carried a kill rate. The gate looked as if it had
// weighed two equal readings when in fact it had one reading and one silence.
//
// This spec pins the three outcomes apart, at the module and at the ledger:
//   - a pair was formed (the candidate won or lost);
//   - both sides were measured and equal inside epsilon (a deliberate tie);
//   - no pair was possible, and which side was missing.
// Every `gate.evaluated` carries how many pairs that round contributed and why.
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pairAgainstBase, pairedAgainstBase, commitDecision } from '../../src/gate/sequential.js'
import { runRound } from '../../src/runtime/round.js'
import { makeRuntime, baseConfig, chainSpec } from '../self22/fixture.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

// --- the module answers three questions, not one empty array -----------------
// A pair formed. The direction is the outcome, and it is named.
const win = pairAgainstBase({ candidate: 0.7, base: 0.3 })
assert.equal(win.pair, 1)
assert.equal(win.outcome, 'won')
assert.equal(win.reason, 'candidate-won')
assert.equal(win.candidate, 0.7)
assert.equal(win.base, 0.3)

const loss = pairAgainstBase({ candidate: 0.3, base: 0.7 })
assert.equal(loss.pair, 0)
assert.equal(loss.outcome, 'lost')
assert.equal(loss.reason, 'candidate-lost')
ok('a formed pair says which way it went')

// Both sides measured and equal inside epsilon: a deliberate tie, not silence.
const tie = pairAgainstBase({ candidate: 0.5, base: 0.5 })
assert.equal(tie.pair, null)
assert.equal(tie.outcome, 'tie')
assert.equal(tie.reason, 'equal-inside-epsilon')
const absorbed = pairAgainstBase({ candidate: 0.55, base: 0.5, epsilon: 0.1 })
assert.equal(absorbed.reason, 'equal-inside-epsilon', 'a gap inside the declared noise is still a tie')
ok('two equal readings are a named tie, not a missing pair')

// No pair possible, and the answer names the side that was missing.
assert.equal(pairAgainstBase({ candidate: null, base: 0.5 }).reason, 'candidate-not-measured')
assert.equal(pairAgainstBase({ candidate: 1, base: null }).reason, 'base-not-measured')
assert.equal(pairAgainstBase({ candidate: null, base: null }).reason, 'both-not-measured')
assert.equal(pairAgainstBase({ candidate: undefined, base: 'skipped' }).reason, 'both-not-measured')
for (const r of [pairAgainstBase({ candidate: null, base: 0.5 }), pairAgainstBase({ candidate: 1, base: null })]) {
  assert.equal(r.pair, null)
  assert.equal(r.outcome, 'no-pair')
}
ok('an unmeasured side is named instead of being reported as a tie')

// The legacy export keeps its exact shape: callers that only want the pair
// sequence must not have to change, and a tie and a silence still both give [].
assert.deepEqual(pairedAgainstBase({ candidate: 0.7, base: 0.3 }), [1])
assert.deepEqual(pairedAgainstBase({ candidate: 0.3, base: 0.7 }), [0])
assert.deepEqual(pairedAgainstBase({ candidate: 0.5, base: 0.5 }), [])
assert.deepEqual(pairedAgainstBase({ candidate: 1, base: null }), [])
ok('the existing pairing export is unchanged')

// --- the decision keeps its contract ----------------------------------------
// A missing pair is never a loss and never a commit: no pair means E = 1, defer.
const silent = commitDecision({ discordant: [], alpha: 0.05, lambda: 0.5, pairReason: 'base-not-measured' })
assert.equal(silent.commit, false)
assert.equal(silent.decision, 'defer')
assert.equal(silent.eValue, 1)
assert.equal(silent.pairs, 0)
assert.equal(silent.pairReason, 'base-not-measured', 'the reason travels with the decision')
// The legacy no-detail call still says what it always said; the new field is
// what distinguishes a tie from a silence.
const legacy = commitDecision({ discordant: [], alpha: 0.05, lambda: 0.5 })
assert.equal(legacy.reason, 'no discordant pairs')
assert.equal(legacy.pairReason, null, 'no detail supplied is not an invented reason')

// Crossing still commits, deferral still defers, six losses still reject.
assert.equal(commitDecision({ discordant: [1, 1, 1, 1, 1, 1, 1, 1] }).decision, 'commit')
assert.equal(commitDecision({ discordant: [1, 1, 1, 1, 1, 1, 1] }).decision, 'defer')
assert.equal(commitDecision({ discordant: [0, 0, 0, 0, 0, 0] }).decision, 'reject')
ok('crossing commits, the middle defers, losses reject and silence is not a loss')

// --- a real round writes the pair count and the reason on gate.evaluated ----
const NODE = process.execPath
const git = (dir, ...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

function makeRateRepo(baseLine) {
  const dir = mkdtempSync(join(tmpdir(), 'rsi-pairreason-'))
  git(dir, 'init', '-q')
  git(dir, 'config', 'user.email', 'rsi@local')
  git(dir, 'config', 'user.name', 'rsi')
  git(dir, 'config', 'core.autocrlf', 'false')
  writeFileSync(join(dir, 'impl.txt'), `${baseLine}\n`)
  // Only a line the candidate wrote is a reading. The base tree's placeholder
  // prints nothing, which is exactly the historical shape: the candidate had a
  // kill rate and the base did not.
  writeFileSync(
    join(dir, 'rate.mjs'),
    "import { readFileSync } from 'node:fs'\n" +
      "const v = readFileSync(new URL('./impl.txt', import.meta.url), 'utf8').trim()\n" +
      "if (v.startsWith('VALUE=')) console.log(`KILLRATE=${Number(v.slice(6)).toFixed(4)}`)\n" +
      'process.exit(0)\n',
  )
  git(dir, 'add', '-A')
  git(dir, 'commit', '-qm', 'base')
  return { dir, base: git(dir, 'rev-parse', 'HEAD').trim() }
}

function rateSpec() {
  return chainSpec({
    candidates: 1,
    nodes: [
      { id: 'attempts', type: 'map', over: 'candidates', of: { id: 'work', type: 'agent', role: 'worker', prompt: 'WORKER: raise the rate' } },
      { id: 'verify', type: 'verifier', cmd: `"${NODE}" rate.mjs`, cwd: '.' },
    ],
  })
}

async function runRateRound({ dir, base, writeLine, extra = null }) {
  const task = {
    id: 't1',
    title: 'raise the rate',
    verify: { cmd: `"${NODE}" rate.mjs`, cwd: '.' },
    brief: 'raise the kill rate',
  }
  const { runtime, view } = makeRuntime({ repo: dir, spec: rateSpec(), tasks: [task], budget: { rounds: 5 } })
  view.state.evalset.tasks[0].base = base
  await runRound({
    runtime,
    view,
    config: baseConfig({ gate: { minGain: 0.05, alpha: 0.05, efoldLambda: 0.5 } }),
    dispatcher: {
      run: async (brief, opts = {}) => {
        writeFileSync(join(opts.cwd, 'impl.txt'), `${writeLine}\n`)
        // Some cases must keep the reading equal and still carry a patch;
        // otherwise there is nothing for the base verdict to be paid for.
        if (extra) writeFileSync(join(opts.cwd, extra), 'note\n')
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
  return runtime.events.filter((e) => e.type === 'gate.evaluated').at(-1)?.data ?? null
}

// Base measured 0.3, candidate measured 0.7: one pair, contributed by this round.
const formed = makeRateRepo('VALUE=0.3000')
const formedEvent = await runRateRound({ dir: formed.dir, base: formed.base, writeLine: 'VALUE=0.7000' })
assert.ok(formedEvent, 'the gate evaluated')
assert.equal(formedEvent.checks.baseMetrics?.killRate, 0.3)
assert.equal(formedEvent.pairsThisRound, 1, 'a formed pair is counted for this round')
assert.equal(formedEvent.pairReason, 'candidate-won')
assert.deepEqual(formedEvent.pair, { candidate: 0.7, base: 0.3, epsilon: 0, pair: 1, outcome: 'won', reason: 'candidate-won' })
assert.equal(formedEvent.sequential.pairs, 1)
ok('a real round reports the pair it contributed')

// Base unmeasured, candidate measured: zero pairs, and the reason names the
// base side rather than claiming a tie.
const silentBase = makeRateRepo('unreadable')
const silentEvent = await runRateRound({ dir: silentBase.dir, base: silentBase.base, writeLine: 'VALUE=0.7000' })
assert.ok(silentEvent)
assert.equal(silentEvent.checks.baseMetrics?.killRate, undefined, 'the base never printed a rate')
assert.equal(silentEvent.pairsThisRound, 0)
assert.equal(silentEvent.pairReason, 'base-not-measured')
assert.equal(silentEvent.sequential.pairs, 0)
assert.equal(silentEvent.sequential.pairReason, 'base-not-measured', 'and it travels inside the decision')
assert.equal(silentEvent.decision, 'defer')
assert.equal(silentEvent.eValue, 1, 'a missing base is not a loss')
ok('a round with an unmeasured base says which side was missing')

// Both sides read, same number: a measured tie. Zero pairs, but not the same
// sentence as the missing base above, and the candidate is not marked a loss.
const equalRepo = makeRateRepo('VALUE=0.5000')
const equalEvent = await runRateRound({ dir: equalRepo.dir, base: equalRepo.base, writeLine: 'VALUE=0.5000', extra: 'note.txt' })
assert.ok(equalEvent)
assert.equal(equalEvent.checks.baseMetrics?.killRate, 0.5)
assert.equal(equalEvent.pairsThisRound, 0)
assert.equal(equalEvent.pairReason, 'equal-inside-epsilon')
assert.equal(equalEvent.pair.outcome, 'tie')
assert.equal(equalEvent.decision, 'defer')
assert.equal(equalEvent.eValue, 1, 'a tie is no evidence either way, not a loss')

// A candidate that printed no rate at all is the other silent side, and it is
// named as such rather than blamed on the base.
const silentCandidate = makeRateRepo('VALUE=0.3000')
const noCand = await runRateRound({ dir: silentCandidate.dir, base: silentCandidate.base, writeLine: 'unreadable' })
assert.ok(noCand)
assert.equal(noCand.pairsThisRound, 0)
assert.equal(noCand.pairReason, 'candidate-not-measured')
assert.equal(noCand.eValue, 1)
ok('a measured tie and a silent candidate are named apart, and neither is a loss')
