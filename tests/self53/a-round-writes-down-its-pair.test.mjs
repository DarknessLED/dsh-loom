// The pair has to reach the ledger, not just the module.
//
// `pairedAgainstBase` is unit-tested above, but a unit test passes even when the
// round hands it the wrong two numbers. This spec runs a real round against a
// verifier whose reading depends on the file the candidate edits, so the base
// and the candidate genuinely disagree: base 0.3, candidate 0.7, one discordant
// pair going the candidate's way.
//
// It also pins the shape of the thing that made the old gate self-confirming:
// the pair is taken against the base, not against the round's losers. A loser
// pair is a win by construction (the winner is the highest score), so it can
// never produce a disagreement and never tells the gate anything.
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { runRound } from '../../src/runtime/round.js'
import { makeRuntime, baseConfig, chainSpec } from '../self22/fixture.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const NODE = process.execPath
const dir = mkdtempSync(join(tmpdir(), 'rsi-pair-'))
const git = (...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
git('init', '-q')
git('config', 'user.email', 'rsi@local')
git('config', 'user.name', 'rsi')
git('config', 'core.autocrlf', 'false')
writeFileSync(join(dir, 'impl.txt'), '0.3000\n')
writeFileSync(
  join(dir, 'rate.mjs'),
  "import { readFileSync } from 'node:fs'\n" +
    "const v = Number(readFileSync(new URL('./impl.txt', import.meta.url), 'utf8').trim())\n" +
    'console.log(`KILLRATE=${v.toFixed(4)}`)\n',
)
git('add', '-A')
git('commit', '-qm', 'base')
const base = git('rev-parse', 'HEAD').trim()

const task = {
  id: 't1',
  title: 'raise the rate',
  verify: { cmd: `"${NODE}" rate.mjs`, cwd: '.' },
  brief: 'raise the kill rate',
}

// The candidate writes the file the verifier reads, inside its own worktree.
const record = []
const dispatcher = {
  run: async (brief, opts = {}) => {
    record.push({ brief, opts })
    writeFileSync(join(opts.cwd, 'impl.txt'), '0.7000\n')
    return {
      sessionId: 'w',
      text: '{"changed":["impl.txt"],"why":"raised the rate","evidence":["ran it"],"openQuestions":[],"confidence":0.6,"nextHint":""}',
      stopReason: 'completed',
    }
  },
}

const { runtime, view } = makeRuntime({
  repo: dir,
  spec: chainSpec({
    candidates: 1,
    nodes: [
      { id: 'attempts', type: 'map', over: 'candidates', of: { id: 'work', type: 'agent', role: 'worker', prompt: 'WORKER: raise the rate' } },
      { id: 'verify', type: 'verifier', cmd: `"${NODE}" rate.mjs`, cwd: '.' },
    ],
  }),
  tasks: [task],
  budget: { rounds: 5 },
})
// The worktree is cut from HEAD, which is the commit the base was measured on.
view.state.evalset.tasks[0].base = base

await runRound({ runtime, view, config: baseConfig({ gate: { minGain: 0.05, alpha: 0.05, efoldLambda: 0.5 } }), dispatcher, log: () => {}, notify: () => {} })

const gate = runtime.events.filter((e) => e.type === 'gate.evaluated').at(-1)
assert.ok(gate, 'the gate evaluated')
assert.equal(gate.data.checks.baseMetrics?.killRate, 0.3, 'the base was read with the same instrument as the candidate')
assert.equal(gate.data.score, 0.7, 'the candidate score is its kill rate')
assert.equal(gate.data.sequential.pairs, 1, 'candidate 0.7 against base 0.3 is one discordant pair')
assert.equal(gate.data.sequential.decision, 'defer', 'one pair is not a decision, and the gate says so')
assert.ok(gate.data.sequential.reason.length > 0)
ok('the round hands the gate the pair that can go either way')

// A candidate that scores *below* the base is one losing pair. This is the case
// the loser-pairing could never produce, and the reason it is worth the setup.
const { runtime: rt2, view: v2 } = makeRuntime({
  repo: dir,
  spec: chainSpec({
    candidates: 1,
    nodes: [
      { id: 'attempts', type: 'map', over: 'candidates', of: { id: 'work', type: 'agent', role: 'worker', prompt: 'WORKER: lower the rate' } },
      { id: 'verify', type: 'verifier', cmd: `"${NODE}" rate.mjs`, cwd: '.' },
    ],
  }),
  tasks: [{ ...task }],
  budget: { rounds: 5 },
})
v2.state.evalset.tasks[0].base = base
await runRound({
  runtime: rt2,
  view: v2,
  config: baseConfig({ gate: { minGain: 0.05, alpha: 0.05, efoldLambda: 0.5 } }),
  log: () => {},
  notify: () => {},
  dispatcher: {
    run: async (brief, opts = {}) => {
      writeFileSync(join(opts.cwd, 'impl.txt'), '0.1000\n')
      return {
        sessionId: 'w',
        text: '{"changed":["impl.txt"],"why":"lowered the rate","evidence":["ran it"],"openQuestions":[],"confidence":0.2,"nextHint":""}',
        stopReason: 'completed',
      }
    },
  },
})
const gate2 = rt2.events.filter((e) => e.type === 'gate.evaluated').at(-1)
assert.equal(gate2.data.sequential.pairs, 1, 'a candidate below its base is still one pair')
assert.ok(gate2.data.sequential.eValue < 1, 'a losing pair drives the e-value below one')
ok('a candidate worse than its base contributes a loss, not a win')
