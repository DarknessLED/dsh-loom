// Spec: the claim the knowledge tree keeps is written by the worker, not carved
// out of its explanation.
//
// What it looked like before this spec: a lesson's claim came from `report.why`,
// which the brief defines as "the mechanism behind the change, not a summary",
// up to 1200 characters. Every row in the tree was therefore a clipped paragraph
// -- ninety-nine of them, none readable as a statement -- and the panel could
// only try to cut them shorter after the fact.
//
// A claim has to be stated where it is known. The report contract now asks for
// it; this spec pins that the producer uses it, that an older attempt still
// teaches something, and that the validator's strictness and the parser's
// tolerance are deliberately different.
import assert from 'node:assert/strict'
import { attemptReportSchema, validateReport, buildWorkerBrief } from '../../src/dispatch/brief.js'
import { deriveLesson, CLAIM_MAX } from '../../src/knowledge/impact.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const task = { id: 't1', family: 'fam' }
const round = 4

function attempt(report) {
  return { id: 'r4a1', score: 1, verifierOk: true, report }
}

// --- 1. the contract asks for a claim ---------------------------------------
{
  const schema = attemptReportSchema()
  assert.ok(schema.properties.lesson, 'the report schema has a `lesson` field')
  assert.equal(schema.properties.lesson.maxLength, 200, 'a claim is bounded at 200 characters')
  assert.ok(schema.required.includes('lesson'), 'the worker is held to stating it')

  const brief = buildWorkerBrief({
    task: { id: 't1', prompt: 'do the thing', verify: { cmd: 'node -e "process.exit(0)"' } },
    round: 1,
    workspace: 'C:/w',
  })
  assert.ok(/lesson:/.test(brief), 'the brief explains what a lesson is')
  assert.ok(/one sentence/i.test(brief), 'the brief asks for one sentence')
  ok('the report contract asks the worker for a claim it can stand behind')
}

// --- 2. a stated claim is used as written ----------------------------------
{
  const stated = 'a verifier that always fails is a gate nobody can reach'
  const lesson = deriveLesson({
    attempt: attempt({ changed: ['src/x.js'], why: 'I changed the gate comparison and then ran the suite twice', lesson: stated, evidence: [], openQuestions: [], confidence: 0.9, nextHint: '' }),
    task,
    round,
  })
  assert.equal(lesson.claim, stated, 'the stated claim is the claim')
  assert.ok(lesson.claim.length <= CLAIM_MAX, 'it fits a card without being cut')
  assert.equal(lesson.confidence, 0.9, 'the stated confidence travels with it')
  assert.deepEqual(lesson.files, ['src/x.js'], 'and so does where it applies')
  ok('a claim the worker wrote is kept word for word')
}

// --- 3. an attempt from before the field still teaches ---------------------
{
  const lesson = deriveLesson({
    attempt: attempt({ changed: [], why: 'the plateau branch raised the checkpoint but never touched the loop lever. That is why nothing changed twice.', evidence: [], openQuestions: [], confidence: 0.5, nextHint: '' }),
    task,
    round,
  })
  assert.ok(lesson, 'an older attempt is not knowledge-less')
  assert.equal(lesson.claim, 'the plateau branch raised the checkpoint but never touched the loop lever.', 'the fallback is the first sentence of the explanation')
  assert.ok(!lesson.claim.includes('That is why'), 'the rest of the paragraph is not the claim')
  ok('an attempt recorded before the field existed falls back to its first sentence')
}

// --- 4. no claim and no explanation is not knowledge -----------------------
{
  const lesson = deriveLesson({
    attempt: attempt({ changed: ['src/x.js'], why: '', evidence: [], openQuestions: [], confidence: 0.5, nextHint: '' }),
    task,
    round,
  })
  assert.equal(lesson, null, 'an attempt that says nothing declarative yields no lesson')
  ok('silence is not a claim')
}

// --- 5. the validator is strict, the parser is not brittle -----------------
{
  const full = { changed: ['a.js'], why: 'because', lesson: 'a claim', evidence: [], openQuestions: [], confidence: 0.5, nextHint: '' }
  assert.equal(validateReport(full).ok, true, 'a complete report validates')

  const withoutClaim = { ...full }
  delete withoutClaim.lesson
  const checked = validateReport(withoutClaim)
  // `ok` carries no error list at all; asserting on `errors` here would be
  // asserting about a field the accepted path never sets.
  assert.equal(checked.ok, true, 'a report missing only the claim is still accepted: it carries evidence')
  assert.equal(checked.errors, undefined, 'nothing is reported missing when nothing is missing')
  const broken = validateReport({ ...full, lesson: 'x'.repeat(201) })
  assert.equal(broken.ok, false, 'a claim longer than the cap is still checked')
  assert.ok(broken.errors.some((e) => e.includes('lesson')), 'and the error names the claim')

  const withoutWhy = { ...full }
  delete withoutWhy.why
  assert.equal(validateReport(withoutWhy).ok, false, 'the mechanism is not optional')
  ok('the claim is asked for, and its absence does not throw the report away')
}

console.log(`\n${pass}/${pass} passed`)
