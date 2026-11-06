// Spec: holdout tasks are reserved, not abandoned.
//
// rsi_evalset accepts holdout tasks, but round selection never touches them,
// so a campaign can look successful on tasks it tuned against. The loop should
// spend a holdout task every N rounds and report it as such.
//
// Implement src/runtime/sampling.js with:
//   pickTask(evalset, { round, holdoutEvery = 0 }) -> { id, holdout } | null
//     evalset is { tasks: [{ id, ... }], holdout: [{ id, ... }] }.
//     - round is 1-based.
//     - With holdoutEvery > 0, every holdoutEvery-th round (round > 0 and
//       round % holdoutEvery === 0) takes the next holdout task, cycling
//       through the holdout list in order, and returns holdout: true.
//     - Otherwise the non-holdout tasks are used round-robin:
//       tasks[(round - 1) % tasks.length], holdout: false.
//     - Returns null when the chosen pool is empty.

import { pickTask } from '../../src/runtime/sampling.js'

let pass = 0
let fail = 0

function ok(cond, name) {
  if (cond) pass += 1
  else fail += 1
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${pass + fail} - ${name}`)
}

const evalset = {
  tasks: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
  holdout: [{ id: 'h1' }, { id: 'h2' }],
}

// --- round robin over the working tasks ------------------------------------
ok(pickTask(evalset, { round: 1 }).id === 'a', 'round 1 takes the first task')
ok(pickTask(evalset, { round: 2 }).id === 'b', 'round 2 takes the second task')
ok(pickTask(evalset, { round: 4 }).id === 'a', 'round 4 wraps back to the first task')
ok(pickTask(evalset, { round: 2 }).holdout === false, 'working tasks are not holdout')

// --- holdout rounds --------------------------------------------------------
const every3 = { holdoutEvery: 3 }
ok(pickTask(evalset, { round: 3, ...every3 }).id === 'h1', 'round 3 spends the first holdout task')
ok(pickTask(evalset, { round: 3, ...every3 }).holdout === true, 'a holdout round is marked as such')
ok(pickTask(evalset, { round: 6, ...every3 }).id === 'h2', 'round 6 spends the second holdout task')
ok(pickTask(evalset, { round: 9, ...every3 }).id === 'h1', 'the holdout list cycles')
ok(pickTask(evalset, { round: 4, ...every3 }).id === 'a', 'non-holdout rounds still rotate')

// --- holdoutEvery = 0 keeps the old behaviour ------------------------------
ok(pickTask(evalset, { round: 3 }).id === 'c', 'without a holdout cadence round 3 stays on task c')

// --- empty pools -----------------------------------------------------------
ok(pickTask({ tasks: [], holdout: [] }, { round: 1 }) === null, 'no tasks at all is null')
ok(pickTask({ tasks: [{ id: 'a' }], holdout: [] }, { round: 3, holdoutEvery: 3 }) === null, 'a holdout round with no holdout tasks falls back to null')
ok(pickTask({ tasks: [], holdout: [{ id: 'h1' }] }, { round: 1 }) === null, 'no working tasks and no holdout round is null')
ok(pickTask({ tasks: [], holdout: [{ id: 'h1' }] }, { round: 2, holdoutEvery: 2 }).id === 'h1', 'a holdout round works without working tasks')

// --- degenerate input ------------------------------------------------------
ok(pickTask(undefined, { round: 1 }) === null, 'missing evalset does not throw')
ok(pickTask(evalset, { round: 0 }) === null, 'round 0 is not a round')
ok(pickTask(evalset, { round: 'x' }) === null, 'non-numeric round is null')

console.log(`\n${pass}/${pass + fail} passed`)
if (fail > 0) process.exitCode = 1
