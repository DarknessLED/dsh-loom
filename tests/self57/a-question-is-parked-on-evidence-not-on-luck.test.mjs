// The park rule never fired on real data, for two separate reasons.
//
// 1. It counted only the current campaign's rounds. The ledger already knows a
//    question was read by seven campaigns; the campaign in front of it knows
//    about one. Measured 2026-11-26: 16 open questions, most with `reads` >= 1
//    across two campaigns, and the rule saw at most one ask each -- so nothing
//    ever reached the bar.
//
// 2. It treated "the round promoted" as "the question helped". In every probe
//    built this week a round promotes on an easy task while ignoring all four
//    quotes, so `promoted: true` was true for all 17 questions and the rule
//    could not park any of them. A promotion is evidence about the patch, not
//    about whether a note was read and used.
//
// What actually answers "did reading this help" is `research.used`: the worker
// cited a quoted span in its evidence. That is a narrower fact, and it is the
// only one this rule is entitled to act on.
//
//   node tests/self57/a-question-is-parked-on-evidence-not-on-luck.test.mjs
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { reflectOnQuestions } from '../../src/runtime/research-leg.js'
import { recordQuestionRead, researchQuestions, addQuestion } from '../../src/research/questions.js'

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

const Q = (extra = {}) => ({ id: 'q-1', question: 'does the cheap stage rank like the verifier?', status: 'open', ...extra })
const asked = (n, question, { promoted = false, used = null, mode = 'full' } = {}) => ({
  n,
  status: promoted ? 'promoted' : 'no-gain',
  promoted,
  research: { mode, question, used },
})

ok('reads on the ledger count toward the bar, even from other campaigns', () => {
  // Three campaigns each read it once. This campaign has no rounds of its own.
  const out = reflectOnQuestions({
    rounds: [],
    openQuestions: [Q({ reads: 3, measuredReads: 3 })],
    maxAsks: 3,
  })
  assert.equal(out.park.length, 1, 'three ledger reads with no measured use should park')
  assert.equal(out.park[0].asked, 3)
})

ok('a question whose notes were used once is never parked', () => {
  const out = reflectOnQuestions({
    rounds: [],
    openQuestions: [Q({ reads: 9, measuredReads: 9, usedAtLeastOnce: true })],
    maxAsks: 3,
  })
  assert.deepEqual(out.park, [], 'the worker cited one of these notes; that is the signal the rule wants')
})

ok('a read nobody measured counts, and the reason says how many were measured', () => {
  // A read whose outcome nobody wrote down cannot be shown to have helped, and
  // a ledger that reads "nobody recorded it" as "it helped" is the ledger that
  // retired nothing for two weeks. It counts toward the bar, and the reason
  // carries both figures so the reader can see how much of the evidence is
  // silence rather than use.
  const out = reflectOnQuestions({
    rounds: [],
    openQuestions: [Q({ reads: 5, measuredReads: 1 })],
    maxAsks: 3,
  })
  assert.equal(out.park.length, 1, 'five reads, one measured, no use: the bar is met')
  assert.equal(out.park[0].asked, 5)
  assert.equal(out.park[0].measured, 1)
  assert.match(out.park[0].reason, /\(1 with a recorded outcome\)/)
})

ok('a promotion alone does not keep a question alive', () => {
  const rounds = [1, 2, 3].map((n) => asked(n, Q().question, { promoted: true, used: false }))
  const out = reflectOnQuestions({ rounds, openQuestions: [Q()], maxAsks: 3 })
  assert.equal(out.park.length, 1, 'every round promoted while ignoring the quotes; that is the shape this rule exists for')
})

ok('local rounds that measured "used none" count as measured reads', () => {
  const rounds = [1, 2, 3].map((n) => asked(n, Q().question, { used: false }))
  const out = reflectOnQuestions({ rounds, openQuestions: [Q()], maxAsks: 3 })
  assert.equal(out.park.length, 1)
  assert.match(out.park[0].reason, /read in 3/)
})

ok('ledger measures and local measures are summed, not replaced', () => {
  const rounds = [asked(1, Q().question, { used: false })]
  const out = reflectOnQuestions({
    rounds,
    openQuestions: [Q({ reads: 2, measuredReads: 2 })],
    maxAsks: 3,
  })
  assert.equal(out.park.length, 1, '2 on the ledger and 1 in this campaign is three measured reads')
  assert.equal(out.park[0].asked, 3)
})

ok('a parked or closed question is not parked twice', () => {
  const out = reflectOnQuestions({
    rounds: [],
    openQuestions: [Q({ status: 'parked', reads: 9, measuredReads: 9 }), Q({ id: 'q-2', status: 'closed', reads: 9, measuredReads: 9 })],
    maxAsks: 3,
  })
  assert.deepEqual(out.park, [])
})

ok('a malformed bar still parks nothing', () => {
  const q = [Q({ reads: 9, measuredReads: 9 })]
  assert.deepEqual(reflectOnQuestions({ rounds: [], openQuestions: q, maxAsks: 0 }).park, [])
  assert.deepEqual(reflectOnQuestions({ rounds: [], openQuestions: q, maxAsks: Number.NaN }).park, [])
})

ok('the ledger counts only reads it actually measured', () => {
  const home = mkdtempSync(join(tmpdir(), 'q-measured-'))
  try {
    const q = addQuestion(home, { question: 'does an unmeasured read count?', closedBy: 'a measurement' })
    recordQuestionRead(home, { id: q.id, campaign: 'a', round: 1, used: null })
    recordQuestionRead(home, { id: q.id, campaign: 'b', round: 2, used: true })
    recordQuestionRead(home, { id: q.id, campaign: 'c', round: 3, used: false })
    const after = researchQuestions(home).find((x) => x.id === q.id)
    assert.equal(after.reads, 3, 'every read is a read')
    assert.equal(after.measuredReads, 2, 'only the two with a boolean outcome were measured')
    assert.equal(after.usedAtLeastOnce, true)
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exitCode = 1
