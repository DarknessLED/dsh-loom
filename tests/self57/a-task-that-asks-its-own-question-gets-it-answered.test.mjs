// A task that is itself a question was being answered with someone else's.
//
// `trial-lib` round 1 asked "Which paper reports that evaluating a model on only
// 100 curated examples is enough to estimate its MMLU performance?" and the leg
// went looking for "Does a harness change that gains on one model family keep
// its gain on another?" — an open ledger question that shares the word "model".
// One shared word made an unrelated question count as related, and the ledger
// outranks the task, so the two notes the worker got were about transfer across
// model families while the task was about a benchmark paper.
//
//   node tests/self57/a-task-that-asks-its-own-question-gets-it-answered.test.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { asksItsOwnQuestion, questionFor, sharesTopic } from '../../src/runtime/research-leg.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const LEG = readFileSync(join(HERE, '..', '..', 'src', 'runtime', 'research-leg.js'), 'utf8')

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

const TASK_ASKS =
  'Which paper reports that evaluating a model on only 100 curated examples is enough to estimate its MMLU performance? Answer it in answer.md (format: README.md). Task q-0 needs 1 of 6 answers correct.'

const LEDGER = [
  {
    id: 'q-model-family',
    question: 'Does a harness change that gains on one model family keep its gain on another?',
    status: 'open',
  },
  {
    id: 'q-budget',
    question: 'How many pairs make a paired comparison decisive?',
    status: 'open',
  },
]

ok('a task that asks its own question is answered from the task', () => {
  const got = questionFor({ task: { id: 't-0', prompt: TASK_ASKS }, lastRound: null, openQuestions: LEDGER, rounds: [] })
  assert.equal(got.from, 'task')
  assert.match(got.question, /which paper/i, `asked "${got.question}"`)
  assert.ok(!/harness|model family/i.test(got.question), 'not the ledger question that shares a common word')
})

ok('sharing a word is still enough for a ledger question about an imperative task', () => {
  // The separation cannot be made in `sharesTopic`: a task about summing
  // integers and a question about summarising integers share one word and are
  // about the same thing. Raising the bar to two words would break that, so the
  // rule is "who asked the question", not "how many words match".
  assert.equal(
    sharesTopic('How do paired tests decide a promotion?', 'Fix the promotion gate so a paired comparison can promote'),
    true,
  )
  assert.equal(asksItsOwnQuestion('Fix the promotion gate so a paired comparison can promote'), false)
})

ok('an imperative task still takes the ledger question when it is on topic', () => {
  const task = {
    id: 't-9',
    prompt: 'Fix the promotion gate so a paired comparison with eight decisive pairs can promote. Read README.md first.',
  }
  const got = questionFor({ task, lastRound: null, openQuestions: LEDGER, rounds: [] })
  assert.equal(got.from, 'ledger')
  assert.equal(got.id, 'q-budget')
})

ok('the rule is a fact in the code, not a coincidence of fixtures', () => {
  assert.match(LEG, /taskAsks|asksItsOwnQuestion/, 'questionFor decides by whether the task asks a question')
})

ok('a task with no question mark but a question word still counts as asking', () => {
  const got = questionFor({
    task: { id: 't-1', prompt: 'How do paired tests decide a promotion' },
    lastRound: null,
    openQuestions: LEDGER,
    rounds: [],
  })
  assert.equal(got.from, 'task')
})

console.log(`# pass ${pass} fail ${fail}`)
process.exit(fail === 0 ? 0 : 1)
