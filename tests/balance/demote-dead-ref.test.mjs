// A fallback chain that keeps handing work to a ref that keeps dying is not a
// chain, it is a queue with an optimist at the front.
//
// `modelHealth` already says which refs died and how often, but the chain is
// assembled from configuration alone: the loop will spend the first slice on a
// provider that has failed its last three attempts, every round, because nothing
// reads the score it just computed. `modelsTried.length > 1` appearing 0 times in
// 420 attempts is what that looks like from the outside -- the fallback never got
// a slice worth using.
//
// Rule: `demoteChain(chain, rounds, {after})` moves a ref to the back of the
// chain once its last `after` attempts in a row ended without finishing
// (`died`/`timeout`/`exhausted`), leaving every other ref's relative order alone.
// `after <= 0` disables it: a campaign that has not asked for this keeps the
// historical order. A ref with fewer than `after` measured attempts is not
// demoted -- one bad attempt is a bad day, and the chain is the wrong place to
// punish it.
import assert from 'node:assert/strict'
import { modelHealth, demoteChain } from '../../src/runtime/model-health.js'

let pass = 0
const ok = (n) => {
  pass += 1
  console.log('ok ' + n)
}

const attempt = (model, failureKind, n) => ({ id: `r${n}a1`, model, failureKind, verifierOk: false, durationMs: 1000 })
const round = (n, attempts) => ({ n, attempts })

// 1. A ref whose last three attempts all died moves to the back; the healthy ref
//    keeps its place, and the order of everything else is untouched.
{
  const rounds = [
    round(1, [attempt('a/one', 'died', 1)]),
    round(2, [attempt('a/one', 'died', 2)]),
    round(3, [attempt('a/one', 'died', 3)]),
    round(4, [attempt('a/one', 'died', 4)]),
  ]
  const out = demoteChain(['a/one', 'b/two', 'c/three'], rounds, { after: 3 })
  assert.deepEqual(out.chain, ['b/two', 'c/three', 'a/one'], 'the dead ref goes to the back')
  assert.deepEqual(out.demoted, ['a/one'], 'and is named in the result')
  ok('three deaths in a row move a ref to the back')
}

// 2. Two deaths are not three. The threshold exists so one bad patch of provider
//    weather does not reorder a working chain.
{
  const rounds = [
    round(1, [attempt('a/one', 'died', 1)]),
    round(2, [attempt('a/one', 'died', 2)]),
  ]
  const out = demoteChain(['a/one', 'b/two'], rounds, { after: 3 })
  assert.deepEqual(out.chain, ['a/one', 'b/two'], 'below the threshold nothing moves')
  assert.deepEqual(out.demoted, [])
  ok('two deaths are a bad day, not a pattern')
}

// 3. The streak counts from the tail. A ref that died three times and then
//    finished is healthy again: the whole point is to respond to the present.
{
  const rounds = [
    round(1, [attempt('a/one', 'died', 1)]),
    round(2, [attempt('a/one', 'died', 2)]),
    round(3, [attempt('a/one', 'died', 3)]),
    round(4, [{ ...attempt('a/one', 'ok', 4), verifierOk: true }]),
  ]
  const out = demoteChain(['a/one', 'b/two'], rounds, { after: 3 })
  assert.deepEqual(out.chain, ['a/one', 'b/two'], 'a ref that recovered keeps its place')
  ok('only the current streak counts')
}

// 4. `after <= 0` disables the whole rule. A campaign that never set it keeps the
//    order it configured, byte for byte.
{
  const rounds = [round(1, [attempt('a/one', 'died', 1)]), round(2, [attempt('a/one', 'died', 2)])]
  assert.deepEqual(demoteChain(['a/one', 'b/two'], rounds, { after: 0 }).chain, ['a/one', 'b/two'])
  assert.deepEqual(demoteChain(['a/one', 'b/two'], rounds, {}).chain, ['a/one', 'b/two'])
  ok('a threshold of zero leaves the configured order alone')
}

// 5. A chain with one entry cannot be reordered, and that is not an error: the
//    attempt still has to run, it just has nowhere else to go.
{
  const rounds = [round(1, [attempt('a/one', 'died', 1)])]
  const out = demoteChain(['a/one'], rounds, { after: 1 })
  assert.deepEqual(out.chain, ['a/one'])
  assert.deepEqual(out.demoted, ['a/one'])
  ok('a single-entry chain is reported but unchanged')
}

// 6. The health table and the demotion agree about what "died" means, because
//    they read the same records: a ref the table calls healthy is never demoted.
{
  const rounds = [
    round(1, [{ ...attempt('good/ref', 'ok', 1), verifierOk: true }]),
    round(2, [{ ...attempt('good/ref', 'ok', 2), verifierOk: true }]),
    round(3, [attempt('bad/ref', 'died', 3)]),
  ]
  const health = modelHealth(rounds)
  assert.equal(health['good/ref'].died, 0)
  assert.equal(health['bad/ref'].died, 1)
  const out = demoteChain(['good/ref', 'bad/ref'], rounds, { after: 1 })
  assert.deepEqual(out.chain, ['good/ref', 'bad/ref'], 'the healthy ref stays in front')
  ok('the table and the demotion read the same records')
}

console.log(`\n${pass}/6 passed`)
assert.equal(pass, 6)
