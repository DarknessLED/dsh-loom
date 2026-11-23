// PACE (2606.08106) replaces "keep it if the score went up" with a
// testing-by-betting e-process whose guarantee survives optional stopping.
// Two things have to be true of our version or it is worse than the rule it
// replaces: the arithmetic has to be the martingale it claims to be, and a
// decision once crossed must not be rewritten by later data.
import assert from 'node:assert/strict'
import { eValue, commitDecision, pairedHistory, pairedAgainstBase } from '../../src/gate/sequential.js'

// λ = 0.5 turns a won pair into ×1.5 and a lost pair into ×0.5, so eight wins
// put E at 1.5^8 = 25.63, past 1/α = 20.
assert.equal(eValue([1, 1, 1, 1, 1, 1, 1, 1], { lambda: 0.5 }), 25.62890625)
assert.equal(eValue([], { lambda: 0.5 }), 1, 'no evidence means E = 1, not 0')
assert.equal(eValue([0], { lambda: 0.5 }), 0.5)

const won = commitDecision({ discordant: [1, 1, 1, 1, 1, 1, 1, 1], alpha: 0.05, lambda: 0.5 })
assert.equal(won.commit, true)
assert.equal(won.decision, 'commit')
assert.equal(won.firstCrossing, 8)
assert.ok(Math.abs(won.eValue - 25.62890625) < 1e-6)

// Seven wins is 1.5^7 = 17.09, short of 20: the gate has not decided yet.
const seven = commitDecision({ discordant: [1, 1, 1, 1, 1, 1, 1], alpha: 0.05, lambda: 0.5 })
assert.equal(seven.commit, false)
assert.equal(seven.decision, 'defer')

// After crossing, a lost pair pulls E back under the threshold. The decision
// does not go back with it: that is the whole point of anytime-validity, and
// the first version of this file got it wrong by reading the final E only.
const late = commitDecision({ discordant: [1, 1, 1, 1, 1, 1, 1, 1, 0], alpha: 0.05, lambda: 0.5 })
assert.equal(late.commit, true)
assert.equal(late.firstCrossing, 8)
assert.ok(late.eValue < 1 / 0.05, 'the final E is below the threshold and the commit still stands')

// No discordant pairs means every task tied: there is no evidence either way,
// and the reason has to say that rather than pretend a decision was reached.
const tied = commitDecision({ discordant: [], alpha: 0.05, lambda: 0.5 })
assert.equal(tied.commit, false)
assert.equal(tied.decision, 'defer')
assert.equal(tied.reason, 'no discordant pairs')

// Enough losses drive E to α or below: that is evidence against the candidate,
// which is a different sentence from "we have not decided".
const lost = commitDecision({ discordant: [0, 0, 0, 0, 0, 0], alpha: 0.05, lambda: 0.5 })
assert.equal(lost.decision, 'reject')
assert.equal(lost.commit, false)

// A paired history is read off real rounds: each round is compared against the
// best score that task had reached before it, so a win is "this round beat the
// standing incumbent on the same task and the same verifier".
const rounds = [
  { n: 1, taskId: 't1', score: 0.2 },
  { n: 2, taskId: 't1', score: 0.5 },
  { n: 3, taskId: 't1', score: 0.5 },
  { n: 4, taskId: 't1', score: 0.4 },
  { n: 5, taskId: 'other', score: 0.9 },
  { n: 6, taskId: 't1', score: 0.7 },
]
// t1 only: 0.2 (no incumbent yet, not a pair), then 0.5 beats 0.2 (win),
// 0.5 ties 0.5 (tie, dropped), 0.4 loses to 0.5 (loss), 0.7 beats 0.5 (win).
assert.deepEqual(pairedHistory(rounds, 't1'), [1, 0, 1])
assert.deepEqual(pairedHistory(rounds, 'missing'), [])

console.log('ok: the paired e-process commits once, never un-commits, and names ties')

// Most of our history re-runs a task once, so across-round pairing has almost no
// pairs to offer (226 of 251 task-runs saw that task exactly once). The pair a
// round does produce is the candidate against the base tree, measured on the
// same task with the same verifier before any candidate exists.
//
// The tempting alternative — the round's winner against its losers — is a
// tautology: the winner is the highest score, so every such pair is a win by
// construction and eight rounds of them reach any threshold whether or not
// anything improved. This spec pins the pair that can go either way, and pins
// that the tautology is not what we use.
assert.deepEqual(pairedAgainstBase({ candidate: 0.7, base: 0.5 }), [1])
assert.deepEqual(pairedAgainstBase({ candidate: 0.4, base: 0.5 }), [0])
assert.deepEqual(pairedAgainstBase({ candidate: 0.5, base: 0.5 }), [], 'a tie tells us nothing about which is better')

// An unmeasured base is not a failure: a skipped baseline says nothing about the
// candidate, and turning it into a loss would let a missing measurement convict.
assert.deepEqual(pairedAgainstBase({ candidate: 1, base: null }), [])
assert.deepEqual(pairedAgainstBase({ candidate: null, base: 0.2 }), [])
assert.deepEqual(pairedAgainstBase({ candidate: 1, base: 'skipped' }), [])

// A tolerance can absorb a drift the campaign declares as noise, but a real gap
// beyond it still counts.
assert.deepEqual(pairedAgainstBase({ candidate: 0.55, base: 0.5, epsilon: 0.1 }), [])
assert.deepEqual(pairedAgainstBase({ candidate: 0.75, base: 0.5, epsilon: 0.1 }), [1])

console.log('ok: one round contributes the pair that can go either way')

// A round that has started but not finished carries `score: null`. It is not a
// zero: `Number(null)` is 0, so a bare finite-check would record the current
// round as a loss and shrink the e-value every round — the gate would then take
// longer to commit for a reason that has nothing to do with the candidate.
assert.deepEqual(
  pairedHistory([{ n: 1, taskId: 't1', score: 0.25 }, { n: 2, taskId: 't1', score: null }], 't1'),
  [],
  'an unfinished round is not a zero score',
)
assert.deepEqual(
  pairedHistory([{ n: 1, taskId: 't1', score: 0.25 }, { n: 2, taskId: 't1', score: 0.4 }], 't1'),
  [1],
  'and a finished one still counts',
)
console.log('ok: a round that has not finished is not a loss')

