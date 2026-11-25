// The open-question ledger had a reader nobody called, and a shape nobody read.
//
// Measured 2026-11-26: `~/.dsh/loom/research/questions.jsonl` holds 17 records,
// every one of them `{kind:'opened', ...}`. Counting them by `row.status` — which
// is what any script written against the file rather than the module does —
// yields `{undefined: 17}`, i.e. a ledger that reads as empty. The reducer in
// `src/research/questions.js` folds `opened`/`closed`/`parked` events into
// records with a real `status`, and nothing in `src/runtime/` ever called it.
//
// So the research leg's ability to ask a *deliberate* question ("someone wrote
// this down") depended on a file shape that does not exist on disk. This pins
// the reader the leg uses, and pins the trap so the next script does not fall
// into it again.
//
//   node tests/self57/a-question-from-a-round-reaches-the-ledger.test.mjs
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { addQuestion, closeQuestion, openQuestions, researchQuestions } from '../../src/research/questions.js'

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

const home = mkdtempSync(join(tmpdir(), 'loom-q-'))

ok('a question opened by a round is readable as open', () => {
  const added = addQuestion(home, {
    question: 'does a paired test lose power at eight discordant pairs?',
    closedBy: 'a campaign with eight pairs and a known effect',
    scope: 'gate',
  })
  assert.ok(added?.id, 'addQuestion returned no id')
  const open = openQuestions(home)
  assert.equal(open.length, 1)
  assert.equal(open[0].id, added.id)
  assert.match(open[0].question, /paired test/)
})

ok('the same sentence twice is a no-op, not a second question', () => {
  const first = openQuestions(home)[0]
  const again = addQuestion(home, {
    question: first.question,
    closedBy: 'a campaign with eight pairs and a known effect',
    scope: 'gate',
  })
  assert.equal(again?.duplicate, true, 'the duplicate flag is the whole reason this is safe to call from a round')
  assert.equal(openQuestions(home).length, 1)
})

ok('the module folds events; the raw file does not carry a status', () => {
  // This is the trap, pinned. A script that reads the jsonl and counts
  // `status === 'open'` gets zero on a ledger that has one open question.
  const raw = readFileSync(join(home, 'research', 'questions.jsonl'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
  assert.ok(raw.length >= 1)
  assert.equal(raw.filter((r) => r.status === 'open').length, 0, 'if this ever changes, the trap is gone and so is this assertion')
  assert.ok(raw.every((r) => typeof r.kind === 'string'))
  assert.equal(researchQuestions(home).filter((q) => q.status === 'open').length, 1)
})

ok('closing a question takes it out of what a round may ask', () => {
  const first = openQuestions(home)[0]
  closeQuestion(home, { id: first.id, answer: 'no: 19 of 504 rounds could form a pair', by: 'human' })
  assert.equal(openQuestions(home).length, 0)
  assert.equal(researchQuestions(home).find((q) => q.id === first.id)?.status, 'closed')
})

ok('parking one also takes it out, without claiming an answer', () => {
  const added = addQuestion(home, { question: 'is a hidden verifier cheaper to fake?', closedBy: 'two campaigns with hidden verifiers' })
  const { parkQuestion } = modules()
  parkQuestion(home, { id: added.id, reason: 'no hidden-verifier campaign in the ledger yet' })
  assert.equal(openQuestions(home).length, 0)
  assert.equal(researchQuestions(home).find((q) => q.id === added.id)?.status, 'parked')
})

ok('an empty or missing ledger reads as no questions, not as an error', () => {
  const empty = mkdtempSync(join(tmpdir(), 'loom-q-empty-'))
  assert.deepEqual(openQuestions(empty), [])
  rmSync(empty, { recursive: true, force: true })
})

import * as questionsModule from '../../src/research/questions.js'
function modules() {
  return questionsModule
}

rmSync(home, { recursive: true, force: true })
console.log(`# pass ${pass} fail ${fail}`)
process.exit(fail === 0 ? 0 : 1)
