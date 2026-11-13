// What does a second candidate actually cost?
//
// `admitSecondCandidate` takes the tail as a price and is correct arithmetic: with
// EV = p(1-p)*roundMs - tailMs, a tail of 0 makes every p in (0,1) profitable, so
// the gate can only ever say yes. The bug was never in the formula. It was in the
// number the record handed it.
//
// `secondCandidateGate` estimated the tail as `slowest - sorted[floor(n/2)]`. With
// two candidates that reference *is* the slowest attempt, so every two-candidate
// round priced its hedge at exactly 0 -- and a round that samples two candidates is
// the only kind the gate looks at. Measured on the real ledger (e73): 53 of 53
// priceable campaigns read tailMs = 0, so all 53 were admitted; with the reference
// on the lower median, 11 of them refuse.
//
//   node tests/balance/second-candidate-tail.test.mjs
import assert from 'node:assert/strict'
import { secondCandidateGate } from '../../src/runtime/candidates.js'

let pass = 0
const ok = (name) => { pass += 1; console.log(`ok ${pass} - ${name}`) }

const round = (n, durations, extra = {}) => ({
  n,
  status: 'no-gain',
  durationMs: extra.durationMs ?? Math.max(...durations) + 1000,
  planMs: 0,
  attempts: durations.map((d, i) => ({ id: `r${n}a${i + 1}`, durationMs: d, score: 0 })),
  ...extra,
})

// 1. With two candidates the tail is the second one's own cost, not zero.
{
  const gate = secondCandidateGate([round(1, [60_000, 78_000]), round(2, [70_000, 88_000]), round(3, [69_000, 85_000])])
  assert.notEqual(gate, null, 'three two-candidate rounds are priceable')
  assert.equal(gate.rounds, 3, 'all three rounds priced')
  // per round: 78000-60000, 88000-70000, 85000-69000 = 18000, 18000, 16000
  assert.equal(Math.round(gate.tailMs), 17_333, 'the tail is the gap between the two attempts, averaged')
  assert.ok(gate.tailMs > 0, 'a two-candidate round has a visible tail')
  ok('two candidates price a non-zero tail')
}

// 2. The zero tail is what made the gate unconditional: correct arithmetic, bad price.
{
  const rounds = [round(1, [60_000, 78_000]), round(2, [70_000, 88_000]), round(3, [69_000, 85_000])]
  const gate = secondCandidateGate(rounds)
  // p = (0 + 1) / (3 + 2) = 0.2, roundMs ~ 86615, ev = 0.2*0.8*86615 - 17333 < 0
  assert.ok(gate.ev < 0, 'with a real tail the hedge does not pay at p = 0.2')
  assert.equal(gate.admit, false, 'and the gate refuses instead of admitting everything')
  ok('a real tail turns the decision over')
}

// 3. Three candidates reference the middle attempt, not the slowest.
{
  const gate = secondCandidateGate([round(1, [10_000, 20_000, 30_000])])
  // lower median of 3 = the middle (20 000), so tail = 30 000 - 20 000 = 10 000.
  // Taking sorted[floor(3/2)] = sorted[1] happens to agree here; the assertion that
  // matters is that the reference is not the slowest, which would give 0.
  assert.equal(gate.tailMs, 10_000, 'three candidates measure the gap to the middle')
  assert.notEqual(gate.tailMs, 0, 'and never to themselves')
  ok('three candidates reference the middle attempt')
}

// 4. A single-candidate round is not priceable at all.
{
  assert.equal(secondCandidateGate([round(1, [60_000])]), null, 'one candidate says nothing about a second')
  assert.equal(secondCandidateGate([]), null, 'no history says nothing')
  assert.equal(secondCandidateGate([{ n: 1, attempts: [{ durationMs: 1 }, { durationMs: 2 }], durationMs: 0 }]), null, 'no wall clock is not a price')
  ok('the unpriceable cases stay unpriceable')
}

// 5. The fallback path (attempts carry no timing) still prices something.
{
  const gate = secondCandidateGate([
    { n: 1, status: 'promoted', durationMs: 120_000, planMs: 20_000, attempts: [{ id: 'r1a1' }, { id: 'r1a2' }] },
  ])
  assert.equal(gate.tailMs, 50_000, '(120000 - 20000) / 2')
  ok('a round without per-attempt timing still prices the window')
}

// 6. A window that is not a positive number falls back to the default ten
//    rounds; it must not silently shrink the history to the newest round.
{
  const rounds = [round(1, [60_000, 78_000]), round(2, [70_000, 88_000]), round(3, [69_000, 85_000])]
  const gate = secondCandidateGate(rounds, { window: 0 })
  assert.equal(gate.rounds, 3, 'window 0 keeps the default ten rounds, not one')
  ok('a non-positive window keeps the default history')
}

// 7. A promoted round is counted in p: the flag is evidence, not decoration.
{
  const gate = secondCandidateGate([
    round(1, [60_000, 78_000], { promoted: true }),
    round(2, [70_000, 88_000]),
  ])
  // p = (1 promoted + 1) / (2 priced + 2) = 0.5
  assert.equal(gate.p, 0.5, 'the promoted round lifts the promotion rate')
  ok('a promoted round is counted')
}

const EXPECTED = 7
assert.equal(pass, EXPECTED, `ran ${pass} claims, declared ${EXPECTED}`)
console.log(`\n${pass}/${EXPECTED} passed`)
