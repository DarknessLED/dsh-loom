// Two live rounds asked the same question, and nothing would have stopped a
// third.
//
// Measured 2026-11-26 in campaigns `react-live` and `react-panel`: both rounds
// recorded
//
//   "question": "有没有可以直接接入的 patch 级 reward-hacking 检测器（而不是又一篇描述检测框架的论文）？"
//   "from": "ledger"
//
// because `questionFor` takes the *oldest* open question and the ledger keeps it
// open. A loop that asks one question, does not answer it, and asks it again is
// not reading — it is reading the first page of one book every round. The
// balance the round is supposed to strike (research vs do) is therefore stuck on
// the research side for as long as the oldest question stays open.
//
// The fix is rotation, not closure: the round may not close a question it did
// not answer, but it can stop asking the one it already asked. Recent rounds'
// questions are on `round.finished.research.question`, so this needs no new
// state — only a reader that skips what was already asked.
//
//   node tests/self57/the-question-rotates.test.mjs
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

const ledger = [
  { id: 'q1', question: 'is a hidden verifier cheaper to fake?', status: 'open' },
  { id: 'q2', question: 'does a paired test lose power at eight pairs?', status: 'open' },
  { id: 'q3', question: 'what does a stuck signature look like on a 1-task evalset?', status: 'open' },
]

const asked = (question) => ({ n: 1, research: { mode: 'full', question, used: null } })

ok('with nothing asked yet the oldest question wins', () => {
  const got = questionFor({ task: { prompt: 'do the thing' }, openQuestions: ledger, rounds: [] })
  assert.equal(got.from, 'ledger')
  assert.equal(got.question, 'is a hidden verifier cheaper to fake?')
})

ok('a question the last round already asked is skipped', () => {
  const got = questionFor({
    task: { prompt: 'do the thing' },
    openQuestions: ledger,
    rounds: [asked('is a hidden verifier cheaper to fake?')],
  })
  assert.equal(got.question, 'does a paired test lose power at eight pairs?')
})

ok('the skip is match on the question, not on the index in the ledger', () => {
  // A ledger can be re-serialised in another order by any tool that rewrites it.
  // Rotation keyed to "skip the first entry" would then ask q3 below, because q1
  // is last in the reversed list; rotation keyed to the text asks q3 for the
  // right reason and would still skip q1 if it were first.
  const reversed = [...ledger].reverse() // q3, q2, q1
  const got = questionFor({
    task: { prompt: 'do the thing' },
    openQuestions: reversed,
    rounds: [asked('is a hidden verifier cheaper to fake?')], // q1, now last
  })
  assert.equal(got.question, 'what does a stuck signature look like on a 1-task evalset?')
  assert.equal(got.from, 'ledger')
})

ok('asking two of three leaves the third', () => {
  const got = questionFor({
    task: { prompt: 'do the thing' },
    openQuestions: ledger,
    rounds: [asked('is a hidden verifier cheaper to fake?'), asked('does a paired test lose power at eight pairs?')],
  })
  assert.equal(got.question, 'what does a stuck signature look like on a 1-task evalset?')
})

ok('every question asked means the ledger is exhausted, not repeated', () => {
  const rounds = ledger.map((q) => asked(q.question))
  const got = questionFor({ task: { prompt: 'fix the failing check' }, openQuestions: ledger, rounds })
  // Falling back to the task is the honest answer: "we have read everything we
  // wrote down" is a different state from "here is the same question again".
  assert.equal(got.from, 'task')
  assert.match(got.question, /fix the failing check/)
})

ok('a stuck signature still outranks rotation', () => {
  // The most specific thing the loop knows stays first: if the last round failed
  // in a named way, that is a better question than any ledger entry.
  const got = questionFor({
    task: { prompt: 'do the thing' },
    lastRound: { stuckSignature: 'jsSyntaxError: unexpected token (impl.txt:1)' },
    openQuestions: ledger,
    rounds: [asked('is a hidden verifier cheaper to fake?')],
  })
  assert.equal(got.from, 'stuck')
  assert.match(got.question, /jsSyntaxError/)
})

ok('a round that did not read does not consume a question', () => {
  // `research.mode === 'off'` means the leg was not bought; its `question` is
  // whatever was never asked, so it must not rotate the ledger.
  const got = questionFor({
    task: { prompt: 'do the thing' },
    openQuestions: ledger,
    rounds: [{ n: 1, research: { mode: 'off', question: 'is a hidden verifier cheaper to fake?', used: null } }],
  })
  assert.equal(got.question, 'is a hidden verifier cheaper to fake?')
})

ok('garbage in the rounds list is skipped, not thrown on', () => {
  const got = questionFor({
    task: { prompt: 'do the thing' },
    openQuestions: ledger,
    rounds: [null, {}, { research: null }, { research: { mode: 'full' } }, asked('is a hidden verifier cheaper to fake?')],
  })
  assert.equal(got.question, 'does a paired test lose power at eight pairs?')
})

console.log(`# pass ${pass} fail ${fail}`)
process.exit(fail === 0 ? 0 : 1)
