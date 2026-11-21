// Wave 22 / p5: a decision nobody calls is a comment.
//
// p4 shipped `hedgeDecision` and the round still plans two candidates every
// time (`candidatesPlanned: 2` in all three of its own rounds). The function is
// right; the caller does not exist. This spec is about the caller: the planner
// asks the hedge question, and the round obeys the answer.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { planCandidates } from '../../src/loop/candidates.js'

const here = dirname(fileURLToPath(import.meta.url))
const roundSrc = readFileSync(join(here, '..', '..', 'src', 'runtime', 'round.js'), 'utf8')

// Wave 46: the refusal changed from "plan one candidate" to "plan the same
// number, buy them late". Refusing outright was measured on the whole record
// (464 rounds, $10.2552 of attempt spend): it saved $1.6054 and lost 17
// promotions ($0.7954 of verified work). Buying the same opinion on demand from
// the first candidate's result saved $0.7912 and lost none. The hedge question
// was never "is a second candidate ever useful" — it is "is it worth paying for
// before we know".
test('a task that usually solves does not pay for the opinion up front', () => {
  const out = planCandidates({
    pSolve: 0.95,
    gainIfSolved: 1,
    extraCostUsd: 0.05,
    tailMs: 300_000,
    budgetLeftMs: 1_200_000,
    max: 2,
  })
  assert.equal(out.buy, false)
  assert.equal(out.mode, 'cascade', 'the candidate is bought only if the first leaves room')
  assert.equal(out.count, 2, 'and the campaign keeps the count it asked for')
  assert.equal(out.reason, 'negative-ev')
})

test('a coin-flip task plans two', () => {
  const out = planCandidates({
    pSolve: 0.4,
    gainIfSolved: 1,
    extraCostUsd: 0.02,
    tailMs: 200_000,
    budgetLeftMs: 1_200_000,
    max: 2,
  })
  assert.equal(out.count, 2)
})

test('max is a ceiling, not a suggestion', () => {
  const out = planCandidates({
    pSolve: 0.1,
    gainIfSolved: 1,
    extraCostUsd: 0.01,
    tailMs: 1000,
    budgetLeftMs: 1_200_000,
    max: 1,
  })
  assert.equal(out.count, 1)
})

test('the round actually asks', () => {
  assert.match(roundSrc, /planCandidates\(/, 'the planner must call the hedge, not re-derive it')
})
