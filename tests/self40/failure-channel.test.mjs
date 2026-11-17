// The channel from "this round failed" to "here is what the next one is told".
// It is worth pinning end to end: a digest that keeps the wrong lines, or a
// brief that drops them for budget, fails silently and costs a whole round.
import assert from 'node:assert/strict'
import { lastFailure } from '../../src/runtime/round.js'
import { buildWorkerBrief } from '../../src/dispatch/brief.js'

const ids = Array.from({ length: 12 }, (_, i) => `tests/unit/morphing/name_layout/test_provider.py::test_case_${i}`)
const graderOut = [
  'P2P 2700/2734 pass 34 fail; F2P 44/44 pass 0 fail',
  '',
  'P2P=2700/2734 F2P=44/44',
  'KILLRATE=0.987761',
  'REWARD=0',
  'REGRESSED:',
  ...ids.map((id) => `  ${id}`),
].join('\n')

const state = {
  rounds: [
    { n: 1, status: 'no-gain', attempts: [{ id: 'r1a1', verifierOk: false, stdoutTail: graderOut, score: 0 }] },
  ],
}
const failure = lastFailure(state)
assert.ok(failure, 'a failed attempt produces a failure')
assert.match(failure.reason, /verifier failed/)
for (const id of ids) {
  assert.ok(failure.detail.includes(id), `the detail dropped ${id}`)
}
assert.match(failure.detail, /REWARD=0/, 'and keeps the verdict the ids came with')

// a passing round says nothing, rather than repeating the last failure
assert.equal(lastFailure({ rounds: [{ n: 1, attempts: [{ verifierOk: true }] }] }), null)
assert.equal(lastFailure({ rounds: [] }), null)

// and the brief the worker actually reads has them
const brief = buildWorkerBrief({
  task: {
    id: 't1',
    prompt: 'Fix the regressions in src/.',
    verify: { cmd: 'node check.mjs' },
  },
  attemptId: 'r2a1',
  previousFailure: failure,
  limits: {},
})
const text = typeof brief === 'string' ? brief : JSON.stringify(brief)
for (const id of ids) {
  assert.ok(text.includes(id), `the brief dropped ${id}`)
}

console.log('ok - a failed round hands the next one the ids, not just the number')
