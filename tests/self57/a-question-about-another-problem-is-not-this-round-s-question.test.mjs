// Every live round so far asked a ledger question, and every one of them was
// off-topic for the task in front of the worker.
//
// Measured 2026-11-26 over 37 rounds that recorded a question: `from` was
// `'ledger'` in all 37, `'task'` in none and `'stuck'` in none. The ledger's
// entries are gaps in *our own* loop ("does a harness change keep its gain on
// another model family?", "what alpha fits our killRate distribution"), and the
// probe campaigns were asking them while the task was "sum 120 integers". The
// notes could not be used by construction: 27 of 37 rounds recorded
// `used: false`, one recorded `true`, and nine never got measured.
//
// That makes `used` a measurement of "did the worker cite a quotation about an
// unrelated subject", which is not the question the read/do balance needs
// answered. Before the leg can measure whether reading helps *this round*, the
// question it asks has to be about this round.
//
// The rule below is deliberately narrow: the ledger still wins whenever it has
// something to say about the task's own vocabulary (that is the case for this
// repo, where the ledger questions are about the code the round is editing).
// It only steps aside when it has nothing in common with the task at all.
//
//   node tests/self57/a-question-about-another-problem-is-not-this-round-s-question.test.mjs
import assert from 'node:assert/strict'

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

const harness = { id: 'q1', question: 'Does a harness change that gains on one model family keep its gain on another?', status: 'open' }
// Deliberately avoids "alpha": the probe files are named alpha/beta/gamma, so a
// statistics question about alpha would match on the Greek letter alone. That
// is the ambiguity this rule cannot resolve, and it is not what it is for.
const power = { id: 'q2', question: 'How many pairs make a paired comparison decisive?', status: 'open' }
const probe = { prompt: 'Read specs/alpha.json and data-alpha.txt (120 integers) and write summary-alpha.txt with the twelve derived integers.' }

ok('a ledger question sharing nothing with the task loses to the task', () => {
  const got = questionFor({ task: probe, openQuestions: [harness, power], rounds: [] })
  assert.equal(got.from, 'task')
  assert.match(got.question, /this problem/)
})

ok('a ledger question about the task still wins', () => {
  // This is the repository's own shape: the task edits the loop, and the ledger
  // holds gaps about the loop. Overlap is real, so the ledger keeps priority.
  const task = { prompt: 'Make the killRate reading survive a paired comparison in src/gate/gate.js' }
  const got = questionFor({ task, openQuestions: [power, harness], rounds: [] })
  assert.equal(got.from, 'ledger')
  assert.equal(got.question, power.question)
})

ok('an off-topic question does not hide an on-topic one', () => {
  const about = { id: 'q3', question: 'How should integers be summarised when the median is asked for?', status: 'open' }
  const got = questionFor({ task: probe, openQuestions: [harness, about], rounds: [] })
  assert.equal(got.from, 'ledger')
  assert.equal(got.id, 'q3')
})

ok('a task with no prompt of its own still gets the ledger', () => {
  const got = questionFor({ task: { id: 't1' }, openQuestions: [harness], rounds: [] })
  assert.equal(got.from, 'ledger')
})

ok('a stuck signature still outranks both', () => {
  const got = questionFor({
    task: probe,
    lastRound: { stuckSignature: 'verifier exit 1 in check.mjs' },
    openQuestions: [harness],
    rounds: [],
  })
  assert.equal(got.from, 'stuck')
})

ok('the choice is stable: the same inputs give the same question', () => {
  const a = questionFor({ task: probe, openQuestions: [harness, power], rounds: [] })
  const b = questionFor({ task: probe, openQuestions: [harness, power], rounds: [] })
  assert.deepEqual(a, b)
})

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exitCode = 1
