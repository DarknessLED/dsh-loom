// The paired comparison has to be honest about what its sample can see. These
// assertions pin the arithmetic (so a typo cannot silently halve the interval)
// and pin the two sentences that decide how a result will be read: an
// undetectable difference must never be reported as "no effect".
import {
  wilsonInterval,
  mcnemarExact,
  mdePaired,
  mdeIndependent,
  comparePolicies,
  compareMeans,
} from '../src/loop/ab.js'

let pass = 0
let fail = 0
const ok = (name, cond, detail) => {
  if (cond) pass += 1
  else {
    fail += 1
    console.log(`not ok - ${name}${detail ? ` :: ${detail}` : ''}`)
  }
}
const near = (a, b, tol = 1e-3) => typeof a === 'number' && Math.abs(a - b) <= tol

// Wilson, not the normal approximation: the normal interval runs below zero for
// small n and low rates, which reads as certainty the data does not have.
const w0 = wilsonInterval(0, 10)
ok('wilson lower bound is exactly zero at zero successes', w0.low === 0, JSON.stringify(w0))
ok('wilson upper bound stays below 1 at zero successes', w0.high > 0.2 && w0.high < 0.32, String(w0.high))
const w10 = wilsonInterval(10, 10)
ok('wilson upper bound is exactly one at all successes', w10.high === 1, JSON.stringify(w10))
ok('wilson point estimate is the plain ratio', near(w10.p, 1))
ok('wilson on an empty sample does not claim certainty', wilsonInterval(0, 0).high === 1)

// McNemar exact, two-sided.
ok('no discordant pairs is p=1', mcnemarExact({ onlyA: 0, onlyB: 0 }) === 1)
ok('ten-to-zero discordant is 2 * 0.5^10', near(mcnemarExact({ onlyA: 10, onlyB: 0 }), 0.001953, 1e-6))
ok('discordance is symmetric', near(mcnemarExact({ onlyA: 0, onlyB: 10 }), mcnemarExact({ onlyA: 10, onlyB: 0 })))
ok('an even split is not significant', mcnemarExact({ onlyA: 6, onlyB: 6 }) > 0.9)

// The detectable difference is what makes a null readable.
ok(
  '114 paired rounds at 22.7% discordance can only see 12.5 points',
  near(mdePaired({ n: 114, discordance: 0.227 }), 0.125, 5e-4),
  String(mdePaired({ n: 114, discordance: 0.227 })),
)
ok('more pairs see more', mdePaired({ n: 456, discordance: 0.227 }) < mdePaired({ n: 114, discordance: 0.227 }))
// Paired design wins by differencing out the round, and it wins exactly while
// the arms disagree less often than chance would: the crossover is at
// discordance = 2p(1-p), i.e. 0.375 for a 25% promotion rate. Beyond that the
// paired interval is the wider one, which is worth knowing before choosing it.
ok(
  'paired beats independent at our observed discordance',
  mdePaired({ n: 114, discordance: 0.227 }) < mdeIndependent({ n: 114, p: 0.25 }),
)
ok(
  'independent beats paired when the arms disagree almost always',
  mdeIndependent({ n: 114, p: 0.25 }) < mdePaired({ n: 114, discordance: 0.9 }),
)
ok('zero pairs cannot see anything', mdePaired({ n: 0 }) === 1)

// Two policies that agree on every round: the honest answer is "this sample
// cannot tell them apart", not "the policies are equivalent".
const same = comparePolicies({
  rounds: Array.from({ length: 40 }, (_, i) => ({ i })),
  decideA: () => true,
  decideB: () => true,
})
ok('identical policies promote at the same rate', same.delta === 0 && same.both === 40)
ok('identical policies are not significant', same.p === 1)
ok('identical policies are "cannot distinguish"', same.verdict === 'cannot-distinguish', same.verdict)
ok('the sentence says the arms never disagreed', /agreed on all 40 rounds/.test(same.sentence), same.sentence)
// A comparison that never disagrees must not print an MDE of zero: zero reads as
// "infinitely sensitive" and is the opposite of what happened.
ok('zero discordance does not report a zero MDE', same.mde > 0.2, String(same.mde))
ok('zero discordance is flagged as agreed', same.agreed === true)

// A difference the sample can see.
const clear = comparePolicies({
  rounds: Array.from({ length: 100 }, (_, i) => ({ i })),
  decideA: (r) => r.i < 42,
  decideB: (r) => r.i >= 98,
})
ok('42 vs 2 discordant is a win', clear.verdict === 'a-better', `${clear.verdict} ${clear.sentence}`)
ok('the two arms never both promote here', clear.both === 0 && clear.rateA === 0.42 && clear.rateB === 0.02)
ok('the interval brackets the point estimate', clear.interval.low <= clear.delta && clear.delta <= clear.interval.high, JSON.stringify(clear.interval))
ok('the sentence names the discordant counts', /42 vs 2/.test(clear.sentence), clear.sentence)

// A difference smaller than the floor is reported as undetectable even when the
// point estimate is not zero -- this is the case the old comparisons got wrong.
const tiny = comparePolicies({
  rounds: Array.from({ length: 20 }, (_, i) => ({ i })),
  decideA: (r) => r.i < 6,
  decideB: (r) => r.i < 5,
})
ok('one discordant pair in twenty is undetectable', tiny.verdict === 'cannot-distinguish', tiny.sentence)
ok('an undetectable delta still reports its size', tiny.delta > 0)


// --- the continuous endpoint -------------------------------------------------
{
  const pairs = [
    { base: 0.1, candidate: 0.55 }, { base: 0.2, candidate: 0.6 },
    { base: 0.55, candidate: 0.7 }, { base: 0.05, candidate: 0.45 },
    { base: 0.5, candidate: 0.5 }, { base: 0.6, candidate: 0.75 },
  ]
  const r = compareMeans({ pairs })
  ok('a graded corpus of six tasks can resolve a quarter-point difference', r.n === 6 && Math.abs(r.delta - 0.258333) < 1e-6 && r.verdict === 'candidate-better' && r.interval.low > 0 && r.mde > 0.2 && r.mde < 0.22 && /detectable floor/.test(r.sentence), JSON.stringify(r))
}

{
  const r = compareMeans({ pairs: [{ base: 0.4, candidate: 0.42 }, { base: 0.55, candidate: 0.5 }, { base: 0.5, candidate: 0.53 }] })
  ok('a small difference on a small corpus is reported as unresolved', r.verdict === 'cannot-distinguish' && /cannot distinguish a difference below/.test(r.sentence) && /Not "no effect"/.test(r.sentence), r.sentence)
}

{
  const r = compareMeans({ pairs: [{ base: 1, candidate: 2 }] })
  ok('one pair is not evidence, and says so', r.verdict === 'cannot-distinguish' && r.interval === null && r.mde === null && /cannot estimate variance/.test(r.sentence), r.sentence)
}

{
  const r = compareMeans({ pairs: [] })
  ok('no pairs is not a tie', r.n === 0 && r.verdict === 'cannot-distinguish' && /nothing to compare/.test(r.sentence), r.sentence)
}

{
  const r = compareMeans({ pairs: [{ base: 0.5, candidate: 0.5 }, { base: 0.9, candidate: 0.9 }] })
  ok('identical numbers on every task are reported as an unmoved endpoint', r.verdict === 'cannot-distinguish' && r.mde === 0 && /did not move at all/.test(r.sentence), r.sentence)
}

{
  const r = compareMeans({ pairs: [{ base: 0.1, candidate: 0.4 }, { base: 0.2, candidate: 0.5 }, { base: 0.3, candidate: 0.6 }] })
  ok('a consistent shift with no spread says so instead of claiming a zero floor', r.verdict === 'candidate-better' && r.sd === 0 && /no spread/.test(r.sentence), r.sentence)
}

console.log(`${fail === 0 ? 'ok' : 'FAIL'} - ab ${pass}/${pass + fail}`)
if (fail > 0) process.exit(1)
