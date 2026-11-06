import { bestPriorScore } from '../src/runtime/round.js'

let pass = 0
let fail = 0

function ok(cond, name) {
  if (cond) pass += 1
  else fail += 1
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${pass + fail} - ${name}`)
}

// `landed` mirrors the reducer: only a round whose patch reached the workspace
// and passed the guard counts as progress.
const round = (n, taskId, attempts) => ({ n, taskId, attempts, landed: true, promotedAttemptId: attempts?.[0]?.id })
const attempt = (id, score, extra = {}) => ({ id, score, ...extra })

// --- the reason this exists ------------------------------------------------
// A campaign scores a different task each round. r1 finished task A at 1.0;
// an attempt on task B must not be measured against that number.
const crossTask = [
  round(1, 'A', [attempt('r1a1', 1)]),
  round(2, 'B', [attempt('r2a1', 0.4)]),
]
ok(bestPriorScore(crossTask, 'B', 3) === 0.4, 'uses the same task, not the campaign-wide best')
ok(bestPriorScore(crossTask, 'A', 3) === 1, 'finds the earlier task A score')
ok(bestPriorScore(crossTask, 'C', 3) === null, 'unseen task has no incumbent')

// --- only earlier rounds count ---------------------------------------------
ok(bestPriorScore(crossTask, 'B', 2) === null, 'ignores the current round')
ok(bestPriorScore(crossTask, 'B', 1) === null, 'ignores later rounds')

// --- best, not latest -------------------------------------------------------
const improving = [
  round(1, 'A', [attempt('r1a1', 0.3)]),
  round(2, 'A', [attempt('r2a1', 0.1)]),
  round(3, 'A', [attempt('r3a1', 0.7)]),
]
ok(bestPriorScore(improving, 'A', 4) === 0.7, 'keeps the best score, not the last one')

// --- noise the scorer must ignore ------------------------------------------
const noisy = [
  round(1, 'A', [
    attempt('a', 0.5),
    attempt('b', 0.9, { screenedOut: true }),
    attempt('c', 0.9, { abandoned: true }),
    attempt('d', null),
    attempt('e', Number.NaN),
  ]),
]
ok(bestPriorScore(noisy, 'A', 2) === 0.5, 'skips screened-out, abandoned and non-finite attempts')

// --- degenerate input -------------------------------------------------------
ok(bestPriorScore(undefined, 'A', 2) === null, 'no rounds yet')
ok(bestPriorScore([null, {}, { n: 'x', taskId: 'A' }], 'A', 5) === null, 'malformed rounds do not throw')

// --- a discarded attempt is not progress ------------------------------------
// r1 scored 1.0 in its worktree but the patch never landed in the workspace,
// so task A is still unsolved and the next round must be free to try again.
const discarded = [{ n: 1, taskId: 'A', attempts: [attempt('r1a1', 1)], landed: false }]
ok(bestPriorScore(discarded, 'A', 2) === null, 'an unlanded round does not count as solved')

const pendingOnly = [{ n: 1, taskId: 'A', attempts: [attempt('r1a1', 1)] }]
ok(bestPriorScore(pendingOnly, 'A', 2) === null, 'a round with no landed flag does not count')

// Only the attempt the gate actually chose may set the bar.
const twoAttempts = [
  { n: 1, taskId: 'A', landed: true, promotedAttemptId: 'r1a2', attempts: [attempt('r1a1', 0.3), attempt('r1a2', 0.8)] },
]
ok(bestPriorScore(twoAttempts, 'A', 2) === 0.8, 'the promoted attempt sets the bar')

console.log(`\n${pass}/${pass + fail} passed`)
if (fail > 0) process.exitCode = 1
