// A question the loop keeps asking and never acts on should leave the ledger.
//
// The ledger has 17 open questions and 0 closed ones (measured 2026-11-26 from
// `~/.dsh/loom/research/questions.jsonl`: every record is `kind: 'opened'`). The
// leg asks one per round, quotes four passages, and the question stays open
// forever — so the same gap is re-read at the same price for as many rounds as
// the campaign lasts. That is the "endless" half of the loop's behaviour, and it
// is a ledger problem, not a reading problem.
//
// Rotation (`questionFor`) stops one campaign asking the same thing twice, but
// the next campaign starts at the oldest open entry again. Nothing ever asks
// "did reading this question ever help?".
//
// The reflection that belongs at the end of a ReAct step is exactly that: the
// round knows what it asked (`round.finished.research.question`) and it knows
// whether it won. A question asked in several rounds, none of which promoted, is
// a question this loop cannot act on — parking it is not a verdict on the
// question, it is a statement about the reader.
//
//   node tests/self57/a-question-that-never-helps-is-parked.test.mjs
import assert from 'node:assert/strict'

import { reflectOnQuestions } from '../../src/runtime/research-leg.js'

let pass = 0
let fail = 0
function ok(name, fn) {
  try {
    fn()
    pass++
    console.log(`ok ${pass} - ${name}`)
  } catch (err) {
    fail++
    console.log(`not ok ${pass + fail} - ${name}`)
    console.log(`  ${String(err?.message ?? err).split('\n')[0]}`)
  }
}

const Q = { id: 'q-1', question: 'does the cheap stage rank like the verifier?', status: 'open' }
// `used: false` is what makes a read a *measured* read: the round printed the
// notes and did not cite them. A read with no outcome recorded is silence, and
// the newer spec (a-question-is-parked-on-evidence-not-on-luck) pins that silence
// cannot accumulate into a park.
const asked = (n, question, promoted, status = 'no-gain', used = false) => ({
  n,
  status,
  promoted,
  research: { mode: 'full', question, used },
})

ok('three reads with no promotion park the question', () => {
  const got = reflectOnQuestions({
    rounds: [asked(1, Q.question, false), asked(2, Q.question, false), asked(3, Q.question, false)],
    openQuestions: [Q],
    maxAsks: 3,
  })
  assert.equal(got.park.length, 1)
  assert.equal(got.park[0].id, 'q-1')
  assert.match(got.park[0].reason, /3/)
  assert.match(got.park[0].reason, /used in none/)
})

ok('one read whose notes were used keeps it', () => {
  // This used to be "one promotion in between keeps it". A promotion is a fact
  // about the patch, not about the reading: every probe this week promoted while
  // ignoring all four quotes, so that rule protected all seventeen questions and
  // parked none. What keeps a question alive is that a worker cited one of the
  // notes -- `used: true` -- which is the only measurement of the reading itself.
  const got = reflectOnQuestions({
    rounds: [asked(1, Q.question, false), asked(2, Q.question, true, 'promoted', true), asked(3, Q.question, false)],
    openQuestions: [Q],
    maxAsks: 3,
  })
  assert.deepEqual(got.park, [])
})

ok('promotions without a used reading do not keep it', () => {
  // The regression this rule exists for: three promotions, zero citations.
  const got = reflectOnQuestions({
    rounds: [asked(1, Q.question, true, 'promoted'), asked(2, Q.question, true, 'promoted'), asked(3, Q.question, true, 'promoted')],
    openQuestions: [Q],
    maxAsks: 3,
  })
  assert.equal(got.park.length, 1)
})

ok('fewer reads than maxAsks keeps it', () => {
  const got = reflectOnQuestions({
    rounds: [asked(1, Q.question, false), asked(2, Q.question, false)],
    openQuestions: [Q],
    maxAsks: 3,
  })
  assert.deepEqual(got.park, [])
})

ok('a round an operator stopped is not evidence against the question', () => {
  // Same reason `plateauReached` skips interrupted rounds: nobody judged it. Two
  // real failed reads plus one interrupted read is two reads, not three, so a bar
  // of three is not met.
  const got = reflectOnQuestions({
    rounds: [asked(1, Q.question, false), asked(2, Q.question, false), asked(3, Q.question, false, 'interrupted')],
    openQuestions: [Q],
    maxAsks: 3,
  })
  assert.deepEqual(got.park, [], 'an interrupted round counted as a read that failed')
  assert.equal(got.reads[Q.question.trim()].asked, 2)
})

ok('reads of other questions do not count against this one', () => {
  const other = { id: 'q-2', question: 'what does a stuck signature look like?', status: 'open' }
  const got = reflectOnQuestions({
    rounds: [
      asked(1, Q.question, false),
      asked(2, other.question, false),
      asked(3, other.question, false),
      asked(4, other.question, false),
    ],
    openQuestions: [Q, other],
    maxAsks: 3,
  })
  assert.equal(got.park.length, 1)
  assert.equal(got.park[0].id, 'q-2')
})

ok('a closed or parked question is not parked twice', () => {
  const closed = { ...Q, status: 'closed' }
  const got = reflectOnQuestions({
    rounds: [asked(1, Q.question, false), asked(2, Q.question, false), asked(3, Q.question, false)],
    openQuestions: [closed],
    maxAsks: 3,
  })
  assert.deepEqual(got.park, [])
})

ok('rounds with no research record are not reads of anything', () => {
  const got = reflectOnQuestions({
    rounds: [{ n: 1, status: 'no-gain', promoted: false }, { n: 2, status: 'no-gain', promoted: false }],
    openQuestions: [Q],
    maxAsks: 1,
  })
  assert.deepEqual(got.park, [])
})

ok('a malformed maxAsks does not park everything', () => {
  for (const maxAsks of [undefined, null, 0, -1, 'three', Number.NaN]) {
    const got = reflectOnQuestions({
      rounds: [asked(1, Q.question, false)],
      openQuestions: [Q],
      maxAsks,
    })
    assert.deepEqual(got.park, [], `maxAsks=${String(maxAsks)} parked on a single read`)
  }
})

console.log(`# pass ${pass} fail ${fail}`)
process.exit(fail === 0 ? 0 : 1)
