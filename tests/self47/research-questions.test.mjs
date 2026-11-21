// A question that only exists in a chat window is a question that will be
// asked again next month, from scratch, with the same money.
//
// The ledger here is deliberately small: every open question must name what
// would close it, because "is X true?" is not actionable and "X is true if the
// three published flake rates are under 5%" is. Closing must say what closed
// it. Parking is allowed and is not a lie — it is the honest state of a
// question nobody has budget for.
//
// The file is append-only JSONL: an append that lands twice is a duplicate, an
// append that lands torn loses one record, and neither can corrupt the state
// that came before.
import assert from 'node:assert/strict'
import { appendFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  addQuestion,
  closeQuestion,
  openQuestions,
  parkQuestion,
  readQuestionEvents,
  renderQuestionLine,
  researchQuestions,
} from '../../src/research/questions.js'

let passed = 0
let failed = 0
// Each block ends with a call to this line: reaching it means every assertion
// in the block held, so the block itself is the check.
function ok(name) {
  passed++
  console.log(`ok ${passed + failed} - ${name}`)
}

const home = mkdtempSync(join(tmpdir(), 'loom-questions-'))

// --- a question must say what would close it ------------------------------

{
  assert.throws(
    () => addQuestion(home, { question: 'is the gate honest?' }),
    /clos/i,
    'a question with no closing condition is refused',
  )
  assert.throws(() => addQuestion(home, { closedBy: 'some evidence' }), /question/i, 'and one with no question is refused')

  const q = addQuestion(home, {
    question: 'Do published verifier flake rates exceed 5%?',
    closedBy: 'three independent measurements of flake rate, each over 100 runs',
    scope: 'R1',
    tags: ['gate', 'noise'],
  })
  assert.ok(/^q-/.test(q.id), `an id is generated, got ${q.id}`)
  assert.equal(q.status, 'open')
  assert.equal(q.scope, 'R1')
  assert.ok(Number.isFinite(q.openedAt))
}
ok('an open question has to name what would close it')

// --- reopening the same question keeps one record -------------------------

{
  const before = readQuestionEvents(home).length
  const again = addQuestion(home, {
    question: 'do published verifier flake rates exceed 5%?',
    closedBy: 'anything',
    scope: 'R1',
  })
  assert.equal(again.duplicate, true, 'the same question text is one question')
  assert.equal(readQuestionEvents(home).length, before, 'and does not append a second opening')
}
ok('the same question asked twice is still one question')

// --- closing records what closed it --------------------------------------

{
  const q = addQuestion(home, { question: 'Are killRate scores calibrated?', closedBy: 'a calibration curve over 50 rounds', scope: 'R2' })
  assert.throws(() => closeQuestion(home, { id: q.id }), /answer/i, 'a close without an answer is refused')
  assert.throws(() => closeQuestion(home, { id: 'q-nope', answer: 'x' }), /unknown/i, 'closing an unknown question is a named failure')

  const closed = closeQuestion(home, {
    id: q.id,
    answer: 'Yes, within 0.05 on 50 rounds; see the sealed report.',
    evidenceIds: ['ev-abc123'],
    by: 'research',
  })
  assert.equal(closed.status, 'closed')
  assert.ok(closed.answer.includes('within 0.05'))
  assert.deepEqual(closed.evidenceIds, ['ev-abc123'])
  assert.ok(!openQuestions(home).some((x) => x.id === q.id), 'a closed question leaves the open list')
}
ok('closing a question records the answer and what it rests on')

// --- parking is not closing, and not losing ------------------------------

{
  const q = addQuestion(home, { question: 'Is N>2 candidates ever worth it?', closedBy: 'a controlled comparison', scope: 'R5' })
  const parked = parkQuestion(home, { id: q.id, reason: 'no budget this month' })
  assert.equal(parked.status, 'parked')
  const open = openQuestions(home)
  assert.ok(!open.some((x) => x.id === q.id), 'a parked question is not in the open list')
  const live = researchQuestions(home)
  assert.ok(live.some((x) => x.id === q.id && x.status === 'parked'), 'but it is still on the books')
  assert.ok(open.every((x) => x.status === 'open'))
}
ok('parking keeps a question on the books without pretending it is answered')

// --- age, ordering and the status line -----------------------------------

{
  const aged = openQuestions(home, { now: Date.now() + 11 * 86_400_000 })
  assert.ok(aged.length >= 1)
  assert.ok(aged.every((q) => Number.isFinite(q.ageDays)), 'every open question reports an age in days')
  assert.ok(aged.some((q) => q.ageDays >= 10), 'an eleven-day-old question says so')

  const line = renderQuestionLine(openQuestions(home))
  assert.match(line, /\d+ open question/)
  assert.match(line, /R1|verifier flake/i, 'the line names the oldest or sharpest question')

  const empty5 = renderQuestionLine([])
  assert.match(empty5, /no open question/i)
}
ok('the status line says how many questions are open and how old the oldest is')

// --- a torn append is skipped, not fatal ---------------------------------

{
  const file = join(home, 'research', 'questions.jsonl')
  appendFileSync(file, '{"kind":"opened","id":"q-broken","quest\n')
  const events = readQuestionEvents(home)
  assert.ok(Array.isArray(events) && events.length > 0, 'a torn last line is skipped')
  assert.ok(openQuestions(home).length >= 1, 'and the state still reads')
}
ok('one torn line cannot take the ledger down')

console.log(`# passed ${passed}, failed ${failed}`)
process.exit(failed === 0 ? 0 : 1)
