// A gate card that a person refuses is a decision, and today it is a silence.
//
// The ledger has two facts: promoted, and not promoted. It has no place for
// "this patch passed the verifier and a person said no" — which is precisely
// the card a promotion gate with a defer state produces most of. Without that
// record the loop can only report "fewer promotions", never whether the refusals
// were right, and PACE's three-state policy (`2607.12338` §Policy outputs:
// accept / reject / defer) has nowhere to land on our side.
//
// The data is already on the card: `round.js` raises `gate` with `attempt`,
// `score` and `cardEvidence({task, attempt, score, checks, policyMinGain})`, and
// `cardEvidence` (src/runtime/review-card.js) carries `task.id`. So this is a
// reading change in `decision-effects.js`, not a round.js change — the spec
// below refuses a payload shaped exactly like the one the round actually writes.
//
// The second half is the part that decides whether the record is worth having:
// a refusal whose counterfactual never ran (the task set rotates) must say so.
// A missing cost and a cost of zero look identical in a list, and only one of
// them means "the decline kept money".
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { reduce } from '../../src/core/reduce.js'
import { measureDeclinedGate } from '../../src/chain/measure.js'
import { applyRejectionEffects } from '../../src/runtime/decision-effects.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const payload = {
  attempt: 'r3a1',
  score: 0.4,
  evidence: { task: { id: 't1' }, diff: { files: 2 } },
}

{
  const appended = []
  const runtime = { append: (_view, type, data) => appended.push({ type, data }) }
  const view = { state: { id: 'c', rounds: [{ n: 3, taskId: 't1', score: 0.4, chainVersion: 1 }], gate: { declined: [] } } }

  const r = applyRejectionEffects({ runtime, view, target: { id: 'cp-g1', kind: 'gate', payload }, actor: 'human' })
  assert.ok(r, 'refusing a gate card returns a record instead of null')
  assert.equal(r.kind, 'gate.declined')
  assert.equal(r.taskId, 't1', 'the task id comes off the card evidence, not a guess')
  assert.equal(r.cardScore, 0.4, 'the card score is what the refused patch reached')
  assert.equal(r.measured, false, 'nothing has measured this refusal yet')
  assert.equal(appended.length, 1)
  assert.equal(appended[0].type, 'gate.declined')
  assert.equal(appended[0].data.taskId, 't1')
  assert.equal(appended[0].data.cardScore, 0.4)
  ok('refusing a gate card writes gate.declined with the task and the baseline')
}

{
  // A card with no task id is still a refusal, and still worth a line: "a
  // person refused something we cannot name" is a fact about the card, not a
  // reason to write nothing.
  const appended = []
  const runtime = { append: (_view, type, data) => appended.push({ type, data }) }
  const view = { state: { id: 'c', rounds: [], gate: { declined: [] } } }
  const r = applyRejectionEffects({ runtime, view, target: { id: 'cp-g2', kind: 'gate', payload: { score: 0.4 } } })
  assert.equal(r.kind, 'gate.declined')
  assert.equal(r.taskId, null)
  assert.equal(r.measured, false)
  assert.equal(appended[0].type, 'gate.declined')
  ok('a refusal with no task id is recorded as unmeasurable, not dropped')

  // Approving the same card must not decline it.
  const quiet = []
  const approved = applyRejectionEffects({ runtime: { append: (_v, t, d) => quiet.push({ t, d }) }, view, target: { id: 'cp-g3', kind: 'policy', payload: {} } })
  assert.equal(approved, null)
  assert.equal(quiet.length, 0)
  ok('other card kinds are untouched')
}

{
  // The counterfactual: the next round on that task, on the chain that stayed
  // in force. A refusal that cost nothing is a `missed` forecast; a refusal
  // that left the predicted gain on the table is `met`.
  const record = { kind: 'gate', taskId: 't1', cardScore: 0.4, at: 1000 }
  const later = measureDeclinedGate({ declined: record, round: { n: 4, taskId: 't1', chainVersion: 1, score: 0.42 } })
  assert.ok(later, 'a later round on the same task measures the refusal')
  assert.equal(later.applied, false, 'the patch was never applied, and the record says so')
  assert.equal(later.realized, 0.02)
  assert.equal(later.verdict, 'cost-nothing', 'the task got back to the card score without the patch')

  const differentTask = measureDeclinedGate({ declined: record, round: { n: 4, taskId: 't9', chainVersion: 1, score: 0.9 } })
  assert.equal(differentTask, null, 'a round on another task is not a counterfactual for this one')

  const noBaseline = measureDeclinedGate({ declined: { kind: 'gate', taskId: 't1', cardScore: null }, round: { n: 4, taskId: 't1', score: 0.5 } })
  assert.equal(noBaseline, null, 'without a card score the delta is not defined, and guessing 0 would invent one')
  ok('a refused patch is graded against what the same task then did')
}

{
  // The reducer keeps the refusals, capped, and keeps the ones it could not
  // measure apart from the ones it could.
  const events = []
  for (let i = 0; i < 12; i += 1) {
    events.push({ seq: i + 1, t: 1000 + i, type: 'gate.declined', data: { taskId: `t${i}`, cardScore: 0.3, at: 1000 + i } })
  }
  const s = reduce(events, 'c')
  assert.equal(Array.isArray(s.gate?.declined), true, 'the state has a gate.declined list')
  assert.equal(s.gate.declined.length, 10, 'the list is capped so a long campaign does not grow without bound')
  assert.equal(s.gate.declined[s.gate.declined.length - 1].taskId, 't11', 'the cap keeps the newest, not the oldest')

  const measured = reduce(
    [
      { seq: 1, t: 1000, type: 'gate.declined', data: { taskId: 't1', cardScore: 0.4, at: 1000 } },
      { seq: 2, t: 2000, type: 'gate.declined.measured', data: { taskId: 't1', round: 4, realized: 0.02, verdict: 'cost-nothing' } },
    ],
    'c',
  )
  assert.equal(measured.gate.declined[0].measured, true)
  assert.equal(measured.gate.declined[0].verdict, 'cost-nothing')
  ok('the reducer stores refusals and their measurements')
}

{
  // Both doors refuse through one table, or the panel's reject button is a
  // notification that leaves the ledger prettier than the decision was.
  for (const file of ['src/tools/index.js', 'src/panel/api.js']) {
    const source = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')
    assert.match(source, /applyRejectionEffects/, `${file} must apply rejection effects`)
  }
  ok('the tool door and the panel door both record a gate refusal')
}
