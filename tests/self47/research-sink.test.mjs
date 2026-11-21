// Research that ends in a document nobody reads has not changed the loop.
//
// The loop already has three places a finding could go: the lesson store (read
// by every later round's brief), a chain proposal (the L2 card), and the status
// line a person actually looks at. What was missing is a path from a sealed
// claim to those three, with the honesty rules the rest of the plugin already
// enforces:
//
//   * a lesson laundered out of an unverified claim is exactly the "agent read
//     something on the internet once" failure — so only a claim whose verdict
//     is `verified` may become a lesson, and the lesson carries the evidence id
//     and the note's locator so a later reader can re-open it;
//   * a `fact` lesson without `notWhen` is a rule with no boundary, which the
//     knowledge module treats as an over-general claim — the sink requires one;
//   * a finding that contradicts an active lesson is not silently applied: it is
//     a proposal with both sides attached, for a human to decide.
//
// The sink never touches the network and never writes a campaign ledger; it
// returns what it would write so a tool can decide (and a spec can check).
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { lessonFromClaim, proposalFromFinding, renderSinkLine, sinkFindings, tensionsWith } from '../../src/research/sink.js'

let passed = 0
let failed = 0
// Each block ends with a call to this line: reaching it means every assertion
// in the block held, so the block itself is the check.
function ok(name) {
  passed++
  console.log(`ok ${passed + failed} - ${name}`)
}

const claim = {
  id: 'c-abc',
  text: 'A 2026 audit found 323 of 1,968 tasks were hackable without solving them.',
  evidenceIds: ['ev-38d1036c71b4'],
  section: 'evaluation',
  locator: 'p. 7, Table 3',
  verdict: { status: 'verified', note: 'quoted "323 of 1968 tasks were hackable"' },
}

// --- only a verified claim becomes a lesson ------------------------------

{
  const lesson = lessonFromClaim(claim, { family: 'gate', notWhen: 'tasks whose verifier runs the reference solution' })
  assert.equal(lesson.kind, 'fact', 'a finding from the literature is a fact, not a procedure')
  assert.equal(lesson.severity, undefined, 'and it does not claim a severity it cannot measure')
  assert.match(lesson.claim, /323 of 1,968/, 'the claim text is carried, not paraphrased')
  assert.ok(lesson.evidence.includes('ev-38d1036c71b4'), 'the evidence id travels with the lesson')
  assert.ok(lesson.evidence.includes('p. 7'), 'so does the locator, so it can be reopened')
  assert.deepEqual(lesson.notWhen, ['tasks whose verifier runs the reference solution'], 'the boundary is required')
  assert.equal(lesson.source, 'research', 'the origin is marked so the loop can tell it apart')
  assert.equal(lesson.confidence <= 0.9, true, 'a single-source fact does not claim certainty')

  assert.throws(
    () => lessonFromClaim({ ...claim, verdict: { status: 'unverified' } }, { family: 'gate', notWhen: 'x' }),
    /verified/i,
    'an unverified claim cannot become a lesson',
  )
  assert.throws(() => lessonFromClaim({ ...claim, verdict: undefined }, { family: 'gate', notWhen: 'x' }), /verified/i)
  assert.throws(
    () => lessonFromClaim(claim, { family: 'gate' }),
    /notWhen/i,
    'a fact with no boundary is refused',
  )
  assert.throws(() => lessonFromClaim(claim, { family: 'gate', notWhen: '   ' }), /notWhen/i)
  assert.throws(() => lessonFromClaim({ ...claim, text: '' }, { family: 'gate', notWhen: 'x' }), /text/i)
}
ok('only a verified claim becomes a lesson, and it carries its locator and its boundary')

// --- ids are stable, so a re-run does not duplicate ----------------------

{
  const a = lessonFromClaim(claim, { family: 'gate', notWhen: 'x' })
  const b = lessonFromClaim(claim, { family: 'gate', notWhen: 'x' })
  assert.equal(a.id, b.id, 'the same claim yields the same lesson id')
  const c = lessonFromClaim(claim, { family: 'other', notWhen: 'x' })
  assert.notEqual(a.id, c.id, 'a different family is a different lesson')
}
ok('a re-run of the same research updates one lesson instead of adding a second')

// --- tension with an active lesson becomes a proposal --------------------

{
  const active = [
    { id: 'lsn-old', kind: 'fact', status: 'active', family: 'gate', claim: 'More candidates always help because they cover more of the search space.' },
    { id: 'lsn-other', kind: 'fact', status: 'active', family: 'gate', claim: 'The verifier is the only signal that matters.' },
  ]
  const finding = {
    text: 'Additional candidates did not help when the first candidate solved the task; the sibling was abandoned unsolved.',
    evidenceIds: ['ev-2fab2f3cf954'],
  }
  const tensions = tensionsWith(finding, active)
  assert.equal(tensions.length, 1, `one contradictory lesson, got ${JSON.stringify(tensions.map((t) => t.id))}`)
  assert.equal(tensions[0].id, 'lsn-old')

  const proposal = proposalFromFinding(finding, { against: tensions[0], chainVersion: 3, rounds: 4 })
  assert.ok(/v4|version 4/.test(proposal.title) || proposal.title.length > 0, 'the proposal has a title')
  assert.equal(proposal.kind, 'knowledge')
  assert.match(proposal.detail, /abandoned/, 'the new finding is quoted')
  assert.match(proposal.detail, /More candidates always help/, 'the lesson it contradicts is quoted too')
  assert.ok(proposal.evidenceIds.includes('ev-2fab2f3cf954'))
  assert.equal(proposal.needsHuman, true, 'a contradiction is never auto-applied')
}
ok('a finding that contradicts an active lesson becomes a proposal with both sides')

// --- a quiet finding changes nothing and says so -------------------------

{
  const active = [{ id: 'lsn-x', kind: 'fact', status: 'active', family: 'gate', claim: 'Latency dominates cost in long campaigns.' }]
  const quiet = { text: 'Flake rates measured between 1% and 4% across three suites.', evidenceIds: ['ev-a'] }
  assert.deepEqual(tensionsWith(quiet, active), [], 'unrelated text creates no tension')

  const result = sinkFindings(home(), {
    claims: [claim],
    activeLessons: [],
    family: 'gate',
    notWhen: 'x',
  })
  assert.equal(result.lessons.length, 1)
  assert.equal(result.proposals.length, 0)
  assert.equal(result.skipped.length, 0)
}
ok('a finding with nothing to contradict writes one lesson and no proposal')

// --- the sink refuses to launder, and reports it ------------------------

{
  const bad = { ...claim, id: 'c-bad', verdict: { status: 'contradicted' } }
  const result = sinkFindings(home(), {
    claims: [bad, claim],
    activeLessons: [],
    family: 'gate',
    notWhen: 'x',
  })
  assert.equal(result.lessons.length, 1, 'only the verified claim becomes a lesson')
  assert.equal(result.skipped.length, 1, 'the contradicted one is reported, not dropped silently')
  assert.match(result.skipped[0].reason, /contradicted/i)
}
ok('a claim that failed verification is reported as skipped, never quietly applied')

// --- the status line is one line ----------------------------------------

{
  const line = renderSinkLine({ lessons: 3, proposals: 1, questions: 2 })
  assert.match(line, /3 lesson/)
  assert.match(line, /1 proposal/)
  assert.match(line, /2 open question/)
  assert.match(renderSinkLine({}), /nothing/i, 'an empty sink says nothing changed')
}
ok('the sink reports itself in one line for rsi_status')

function home() {
  return mkdtempSync(join(tmpdir(), 'loom-sink-'))
}

console.log(`# passed ${passed}, failed ${failed}`)
process.exit(failed === 0 ? 0 : 1)
