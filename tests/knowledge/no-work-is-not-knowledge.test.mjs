// A claim that says "I changed nothing" is not knowledge, and it does not belong
// in the next worker's brief.
//
// On 2026-11-11 the tree held 99 active lessons, of which 10 opened with
// "No edit was needed…", "No change was required…", "nothing to do". They were
// written before `checks.noop` refused to derive a lesson from a landing that
// changed nothing, so the producer is fixed -- but the ten are still active, still
// selected, and still injected. One of them is literally the entire claim
// "nothing to do".
//
// Two rules, because there are two holes:
//   1. The producer refuses a no-work claim even when the attempt did produce a
//      patch (an agent can touch an unrelated file and still report "no edit was
//      needed for the actual task").
//   2. The reader refuses one that is already in the tree, and the pruner retires
//      it, so an install that upgraded keeps working instead of carrying them
//      forever.
import assert from 'node:assert/strict'
import { deriveLesson, isNoWorkClaim } from '../../src/knowledge/impact.js'
import { pruneLessons, selectLessons } from '../../src/knowledge/select.js'

let pass = 0
const ok = (n) => {
  pass += 1
  console.log('ok ' + n)
}

const lesson = (over) => ({
  id: 'lsn-x',
  family: 'f',
  taskIds: ['t1'],
  tags: [],
  kind: 'fact',
  claim: 'a real mechanism',
  evidence: 'round 1 attempt r1a1 verified (score 1)',
  confidence: 0.5,
  status: 'active',
  createdRound: 1,
  ttlRounds: 12,
  useCount: 0,
  gainSum: 0,
  harmCount: 0,
  lastUsedRound: null,
  ...over,
})

// 1. The predicate, on the real strings from the ledger.
{
  const real = [
    'nothing to do',
    'nothing to do: this attempt exists only so a round completes and the holdout gate runs; no source ch',
    'No change was needed. The worktree HEAD is 94cdc47 ("loom loom-bal1 round 1: promote r1a1"), which a',
    "No change was required: the current HEAD b46cf8c already contains round 1's promoted implementation.",
    "No edit was needed: the base commit 622bf67 (an ancestor of this worktree's HEAD ac168f9, which equa",
  ]
  for (const claim of real) assert.equal(isNoWorkClaim(claim), true, `refuses: ${claim.slice(0, 40)}`)
  ok('the claims actually in the tree are refused')
}

// 2. A mechanism that merely mentions "no" is not a no-work claim. The predicate
//    must not become a blunt filter that eats real findings.
{
  const real = [
    'The verifier reuses a cached verdict when the patch bytes and command match.',
    'No longer re-planning when the base commit is unchanged; the plan is reused instead.',
    'A no-op landing is recorded without touching the workspace.',
    'The gate reads landed, not merely promoted, so a stolen sibling cannot count.',
  ]
  for (const claim of real) assert.equal(isNoWorkClaim(claim), false, `keeps: ${claim.slice(0, 40)}`)
  assert.equal(isNoWorkClaim(''), false, 'empty is not a claim at all')
  assert.equal(isNoWorkClaim(undefined), false)
  ok('a real mechanism survives, even one that starts with "No"')
}

// 3. The producer refuses one even when a patch exists.
{
  const attempt = {
    id: 'r1a1',
    score: 1,
    report: { why: 'No edit was needed: the base commit already contains the mechanism.' },
  }
  assert.equal(deriveLesson({ attempt, task: { id: 't1' }, round: 1 }), null, 'no lesson from a no-work claim')
  const real = { id: 'r1a2', score: 1, report: { why: 'The gate reads landed, not promoted.' } }
  assert.ok(deriveLesson({ attempt: real, task: { id: 't1' }, round: 1 }), 'a real mechanism still derives')
  ok('the producer refuses a no-work claim')
}

// 4. The reader refuses one already in the tree, and the pruner retires it.
{
  const stale = lesson({ id: 'lsn-stale', claim: 'No change was required: already implemented.' })
  const good = lesson({ id: 'lsn-good' })
  const selected = selectLessons([stale, good], { round: 5, task: { id: 't1' }, limit: 8 })
  assert.deepEqual(selected.map((l) => l.id), ['lsn-good'], 'the stale one is not injected')

  const pruned = pruneLessons([stale, good], { round: 5, max: 8 })
  assert.deepEqual(pruned.retired, ['lsn-stale'], 'the pruner reports it as retired')
  assert.deepEqual(pruned.kept.map((l) => l.id), ['lsn-good'], 'and keeps the real one')
  ok('a stale no-work lesson stops being injected and gets retired')
}


// 5. An install that already carries them is repaired on boot, once. Retiring at
//    boot is what makes the fix retroactive without the operator editing a file.
{
  const { noWorkLessons } = await import('../../src/runtime/recovery.js')
  const state = {
    lessons: [
      lesson({ id: 'lsn-stale', claim: 'No change was required: already implemented.' }),
      lesson({ id: 'lsn-nothing', claim: 'nothing to do' }),
      lesson({ id: 'lsn-good' }),
      lesson({ id: 'lsn-done', claim: 'No edit was needed, but this one is already retired.', status: 'quarantined' }),
    ],
  }
  assert.deepEqual(
    noWorkLessons(state).sort(),
    ['lsn-nothing', 'lsn-stale'],
    'only active no-work claims are retired, and an already-retired one is left alone',
  )
  assert.deepEqual(noWorkLessons({}), [], 'a campaign with no lessons retires nothing')
  assert.deepEqual(noWorkLessons(undefined), [], 'and an unopened campaign is not a crash')
  ok('boot-time retirement finds exactly the stale claims')
}

console.log(`\n${pass}/5 passed`)
assert.equal(pass, 5)
