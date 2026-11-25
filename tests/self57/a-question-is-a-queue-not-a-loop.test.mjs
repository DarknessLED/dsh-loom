// Reading the same page thirteen times is not research.
//
// The campaign ledger has thirteen rounds that bought a read, and every one of
// them asked the same question — the oldest open entry on the question ledger.
// They spanned seven campaigns. The rotation added on 06430dd only skipped what
// *this* campaign had already asked, so a new campaign started the queue over:
// seven campaigns, one question, thirteen reads, and `used: true` never once.
//
// The fix is to make the ledger a queue rather than a loop: a read is recorded
// against the question it was about, and the next round prefers the question
// that has been read fewest times. Seventeen open questions then serve
// seventeen asks instead of one question serving all of them.
//
//   node tests/self57/a-question-is-a-queue-not-a-loop.test.mjs
import assert from 'node:assert/strict'

import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { addQuestion, researchQuestions, recordQuestionRead } from '../../src/research/questions.js'
import { questionFor } from '../../src/runtime/research-leg.js'

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

function home() {
  return mkdtempSync(join(tmpdir(), 'loom-q-'))
}

function ledger(dir) {
  addQuestion(dir, { question: 'is there a patch-level reward-hacking detector ready to wire in', closedBy: 'a tool in this tree', scope: 'R1' })
  addQuestion(dir, { question: 'does the cheap screen rank like the verifier', closedBy: 'a measured rank agreement', scope: 'R3' })
  addQuestion(dir, { question: 'how do you tell a measured zero from an unmeasured round', closedBy: 'one definition both readers accept', scope: 'R2' })
  return researchQuestions(dir).filter((q) => q.status === 'open')
}

await ok('a recorded read is kept against the question it was about', () => {
  const dir = home()
  const open = ledger(dir)
  recordQuestionRead(dir, { id: open[0].id, campaign: 'c1', round: 1, used: false, promoted: false })
  recordQuestionRead(dir, { id: open[0].id, campaign: 'c2', round: 1, used: false, promoted: false })
  const [first, second] = researchQuestions(dir).filter((q) => q.status === 'open')
  assert.equal(first.reads, 2, 'two campaigns read it and the ledger says nothing')
  assert.deepEqual(first.readBy, ['c1', 'c2'])
  assert.equal(second.reads ?? 0, 0, 'a question nobody read must not look read')
})

await ok('the next round prefers the question nobody has read', () => {
  const dir = home()
  const open = ledger(dir)
  recordQuestionRead(dir, { id: open[0].id, campaign: 'c1', round: 1 })
  const asked = questionFor({
    task: { id: 't1', prompt: 'write fixed into impl.txt' },
    openQuestions: researchQuestions(dir).filter((q) => q.status === 'open'),
    rounds: [],
  })
  assert.equal(asked.from, 'ledger')
  assert.equal(asked.id, open[1].id, 'the queue served the question that was already read once')
})

await ok('the least-read question wins even when it is not the oldest', () => {
  const dir = home()
  const open = ledger(dir)
  // The oldest has been read twice, the middle once, the newest never.
  for (const c of ['c1', 'c2']) recordQuestionRead(dir, { id: open[0].id, campaign: c, round: 1 })
  recordQuestionRead(dir, { id: open[1].id, campaign: 'c1', round: 1 })
  const asked = questionFor({
    task: { id: 't1', prompt: 'x' },
    openQuestions: researchQuestions(dir).filter((q) => q.status === 'open'),
    rounds: [],
  })
  assert.equal(asked.id, open[2].id)
})

await ok('a campaign does not read the same question twice', () => {
  const dir = home()
  const open = ledger(dir)
  const asked = questionFor({
    task: { id: 't1', prompt: 'x' },
    openQuestions: researchQuestions(dir).filter((q) => q.status === 'open'),
    rounds: [{ n: 1, research: { mode: 'full', question: open[0].question } }],
  })
  assert.notEqual(asked.id, open[0].id, 'rotation inside a campaign is what 06430dd added and it must keep holding')
})

await ok('the ledger itself decides, not a counter passed in', () => {
  // The same directory, two different callers: the answer must be a property of
  // the ledger, so that a campaign that restarted cannot re-read everything.
  const dir = home()
  const open = ledger(dir)
  recordQuestionRead(dir, { id: open[0].id, campaign: 'c1', round: 1 })
  recordQuestionRead(dir, { id: open[1].id, campaign: 'c1', round: 2 })
  recordQuestionRead(dir, { id: open[2].id, campaign: 'c1', round: 3 })
  const asked = questionFor({
    task: { id: 't1', prompt: 'x' },
    openQuestions: researchQuestions(dir).filter((q) => q.status === 'open'),
    rounds: [],
  })
  // All three have one read; the tie must fall back to ledger order, not to
  // whatever the last writer touched.
  assert.equal(asked.id, open[0].id)
})

await ok('a read of a question that is not on the books is refused', () => {
  // Refusing is the point: recording a read against an invented id would create
  // a question nobody wrote and a count nobody can explain. A caller with a
  // stale id is a bug, and a ledger that swallows it hides the bug.
  const dir = home()
  const open = ledger(dir)
  assert.throws(() => recordQuestionRead(dir, { id: 'q-unknown', campaign: 'c1', round: 1 }), /unknown question/)
  assert.equal(researchQuestions(dir).length, 3, 'a refused read must not create a fourth question')
  assert.equal(researchQuestions(dir).filter((q) => q.status === 'open')[0].reads ?? 0, 0)
  assert.equal(open.length, 3)
})

await ok('the whole read is a fact the ledger can be asked about later', () => {
  const dir = home()
  const open = ledger(dir)
  recordQuestionRead(dir, { id: open[1].id, campaign: 'c9', round: 4, used: true, promoted: true })
  const q = researchQuestions(dir).find((x) => x.id === open[1].id)
  assert.equal(q.reads, 1)
  assert.deepEqual(q.readBy, ['c9'])
  assert.equal(q.usedAtLeastOnce, true, 'a read that the worker went on to use should be visible')
  assert.equal(q.promotedAfterRead, true)
  assert.equal(q.status, 'open', 'a read is not a verdict and must not close anything')
})

console.log(`# pass ${pass} fail ${fail}`)
process.exit(fail === 0 ? 0 : 1)
