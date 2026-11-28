// The five stages are the ones somebody measured, and each carries its number.
//
// A routing table is easy to invent. This file exists so the table in
// `src/dispatch/stage-plan.js` cannot drift into a preference dressed as a
// finding: every stage must name the arm the benchmark favoured *and* the
// measurement that carried the decision, in the same entry. A stage whose reason
// lost its numbers is a stage somebody guessed.
//
// The basis is `research/harness-bench/HANDOFF.md` §4 -- 8 tasks x 5 harnesses,
// `telemetry_iso.json`. Directional, not an upper bound: two tasks per cell, one
// run each. That is why these are pinned as "the numbers the handoff recorded",
// not as "the best harness for this work".
//   node tests/self58/the-five-stages-are-the-measured-ones.test.mjs
import assert from 'node:assert/strict'

import { DEFAULT_CONFIG } from '../../src/core/config.js'
import { ARMS, STAGES, armFor, dispatchPlan } from '../../src/dispatch/stage-plan.js'
import { ok, done } from '../chaos/fixture.mjs'

// 1. The workflow is the measured five, in the order the pipeline runs them.
{
  assert.deepEqual(STAGES, ['triage', 'spec', 'implement', 'verify', 'review'], 'the plan is the pipeline, not a subset')
  ok('the five stages are triage, spec, implement, verify and review')
}

// 2. Every stage names an arm and the number behind it.
{
  for (const stage of STAGES) {
    const entry = ARMS[stage]
    assert.ok(entry, `${stage} has no arm entry`)
    assert.match(entry.arm, /^(dsh|cc|codex|gcli|agy)$/, `${stage} must name one of the five harnesses that were run`)
    assert.ok(typeof entry.why === 'string' && entry.why.length > 30, `${stage} must say why, in a sentence`)
    assert.match(entry.why, /\d/, `${stage}'s reason must contain the measurement, not an adjective`)
  }
  ok('every stage carries an arm and the number that carried the decision')
}

// 3. The arms are the ones the handoff recorded. If one changes, this test is the
//    place that has to be argued with -- not a config file nobody reads.
{
  assert.equal(ARMS.triage.arm, 'dsh', 'triage: fewest tool calls')
  assert.equal(ARMS.spec.arm, 'cc', 'spec: most reads before writing')
  assert.equal(ARMS.implement.arm, 'codex', 'implement: fewest edit attempts')
  assert.equal(ARMS.verify.arm, 'gcli', 'verify: cheapest single-command run')
  assert.equal(ARMS.review.arm, 'agy', 'review: shortest wall clock, no sight of the implementer')
  assert.match(ARMS.verify.why, /16\.9s|6 tool/, 'verify keeps its measured cost')
  assert.match(ARMS.implement.why, /12|13-24/, 'implement keeps its edit-attempt counts')
  ok('the five arms are the measured ones, with their numbers intact')
}

// 4. armFor answers for every stage, aliases included, and never invents one.
{
  assert.equal(armFor('verify').arm, 'gcli')
  assert.equal(armFor('plan').arm, 'cc', 'the old planning stage resolves to the stage that replaced it')
  assert.equal(armFor('nope').arm, 'codex', 'an unknown stage falls back to implementation, as stageOf does')
  ok('armFor answers for every name a task can carry')
}

// 5. On a real plan, the current stage's arm is the one on the surface.
{
  const on = { session: { dispatch: { enabled: true, stages: DEFAULT_CONFIG.session.dispatch.stages } } }
  const review = dispatchPlan({ task: { id: 'r1', stage: 'review' }, config: on })
  assert.equal(review.stage, 'review')
  assert.equal(review.armTarget, 'agy', 'a review task targets the reviewing arm')
  assert.match(review.armWhy, /170s|208|reasoning/i, 'and says on what evidence')
  const plain = dispatchPlan({ task: { id: 'p1' }, config: on })
  assert.equal(plain.armTarget, 'codex', 'a task that declares nothing targets implementation')
  ok('the plan surfaces the arm of the stage the task is actually in')
}

done()
