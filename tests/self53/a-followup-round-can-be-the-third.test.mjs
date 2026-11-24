// A follow-up round must be able to ask a third time, and must be able to stop.
//
// Today the second round is the only round: `buildFollowupQueries` returns
// nothing unless `rounds === 2`, so a plan that argues for a third round is
// silently truncated, and a plan whose second round found nothing new asks
// anyway. Neither is a stopping rule — one is a constant and the other is a
// coin. R8's coverage-and-saturation reading (arXiv 2304.09848 §1) treats
// "am I still learning anything new?" as the measurable quantity, so this spec
// pins a marginal-coverage test: a round is bought while the shared vocabulary
// it has not asked about yet is a large enough share of the shared vocabulary
// it can see.
import assert from 'node:assert/strict'
import { buildFollowupQueries } from '../../src/research/fetch.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const sources = [
  { url: 'a', content: 'verifier hacking grows when the reward is a proxy. verifier drift is measurable.' },
  { url: 'b', content: 'verifier hacking and reward tampering co-occur; verifier drift compounds.' },
]

// 1. Round 2 behaves exactly as before: it asks, and it asks about shared terms.
const second = buildFollowupQueries('verifier hacking', sources, { round: 2, maxRounds: 2, maxQueries: 5 })
assert.ok(second.length >= 1, 'a second round still asks')
assert.ok(
  second.every((q) => q.startsWith('verifier hacking')),
  'and it stays anchored to the question',
)
ok('a second round still asks, anchored to the question')

// 2. The old `rounds` option still means what it meant.
assert.deepEqual(buildFollowupQueries('q', sources, { rounds: 1 }), [], 'a one-round plan still asks once')
assert.ok(
  buildFollowupQueries('verifier hacking', sources, { rounds: 2, maxQueries: 5 }).length >= 1,
  'and two rounds still asks twice',
)
ok('the old rounds option keeps its meaning')

// 3. A third round is possible. With nothing asked yet it is a clear yes.
const thirdFresh = buildFollowupQueries('verifier hacking', sources, {
  round: 3,
  maxRounds: 3,
  maxQueries: 8,
  usedTerms: [],
})
assert.ok(thirdFresh.length >= 1, 'a third round may ask when the vocabulary is still fresh')
ok('a third round is possible')

// 4. And it stops when there is nothing left that has not been asked.
const thirdStale = buildFollowupQueries('verifier hacking', sources, {
  round: 3,
  maxRounds: 3,
  maxQueries: 8,
  usedTerms: ['verifier', 'drift', 'tampering', 'proxy', 'compounds', 'measurable', 'grows', 'reward'],
})
assert.deepEqual(thirdStale, [], 'a round whose shared vocabulary is already asked adds nothing')
ok('an exhausted vocabulary stops the round')

// 5. Round 4 of a three-round plan is not bought at all.
assert.deepEqual(
  buildFollowupQueries('verifier hacking', sources, { round: 4, maxRounds: 3, maxQueries: 8, usedTerms: [] }),
  [],
  'the loop cannot exceed the plan it was given',
)
ok('the plan is a ceiling, not a suggestion')

// 6. The marginal test is a share, not a count: one fresh term among many asked
//    ones is not worth a round, the same one on a thin record is.
const thin = buildFollowupQueries('verifier hacking', sources, {
  round: 3,
  maxRounds: 3,
  maxQueries: 8,
  usedTerms: ['drift'],
  minMarginal: 0.5,
})
assert.ok(thin.length >= 1, 'one fresh term against one asked term is half the vocabulary')
const fat = buildFollowupQueries('verifier hacking', sources, {
  round: 3,
  maxRounds: 3,
  maxQueries: 8,
  usedTerms: ['verifier', 'drift', 'tampering', 'proxy', 'compounds', 'measurable', 'grows', 'reward', 'hacking'],
  minMarginal: 0.5,
})
assert.deepEqual(fat, [], 'one fresh term against nine asked ones is not')
ok('the stopping rule is a share of what the sources share')
