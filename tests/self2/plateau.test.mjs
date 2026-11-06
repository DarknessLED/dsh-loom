// Spec: the loop notices when it has stopped making progress.
//
// Today a campaign that stalls keeps spending rounds and never tells the
// human. config.checkpoint.on already lists "plateau" but nothing raises it.
//
// Implement src/runtime/plateau.js with:
//   plateauReached(rounds, { window = 3 }) -> boolean
//     true only when at least `window` rounds exist and none of the last
//     `window` rounds promoted anything. A round counts as promoted when
//     round.promoted === true; a missing flag counts as not promoted.
//   oncePlateau(state, { window = 3 }) -> boolean
//     true only when plateauReached(state.rounds) and no checkpoint with
//     kind === 'plateau' is already recorded in state.checkpoints (any
//     status — we ask once and drop it).
// round.finished must start carrying `promoted` so the rounds array is usable.

import { plateauReached, oncePlateau } from '../../src/runtime/plateau.js'

let pass = 0
let fail = 0

function ok(cond, name) {
  if (cond) pass += 1
  else fail += 1
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${pass + fail} - ${name}`)
}

const r = (n, promoted) => ({ n, status: 'promoted', promoted })

// --- window of no promotions ----------------------------------------------
ok(plateauReached([], { window: 3 }) === false, 'no rounds is not a plateau')
ok(plateauReached([r(1, false), r(2, false)], { window: 3 }) === false, 'fewer rounds than the window is not a plateau')
ok(plateauReached([r(1, true), r(2, false), r(3, false), r(4, false)], { window: 3 }) === true, 'three flat rounds after a promotion is a plateau')
ok(plateauReached([r(1, false), r(2, false), r(3, true)], { window: 3 }) === false, 'a promotion inside the window is not a plateau')
ok(plateauReached([r(1, true), r(2, true)], { window: 2 }) === false, 'window of two with promotions is not a plateau')
ok(plateauReached([r(1, true), r(2, false), r(3, false)], { window: 2 }) === true, 'window of two flat rounds is a plateau')
ok(plateauReached([r(1, false), { n: 2, status: 'error' }, r(3, false)], { window: 3 }) === true, 'rounds without the flag count as flat')

// --- ask once --------------------------------------------------------------
const flat = [r(1, false), r(2, false), r(3, false)]
ok(oncePlateau({ rounds: flat, checkpoints: [] }) === true, 'asks once when the loop is flat')
ok(oncePlateau({ rounds: flat, checkpoints: [{ id: 'cp-1', kind: 'plateau', status: 'open' }] }) === false, 'does not ask twice while one is open')
ok(oncePlateau({ rounds: flat, checkpoints: [{ id: 'cp-1', kind: 'plateau', status: 'answered' }] }) === false, 'does not ask again after it was answered')
ok(oncePlateau({ rounds: flat, checkpoints: [{ id: 'cp-2', kind: 'gate', status: 'open' }] }) === true, 'another kind of checkpoint does not suppress it')
ok(oncePlateau({ rounds: [r(1, true)], checkpoints: [] }) === false, 'no plateau, nothing to ask')

// --- degenerate input ------------------------------------------------------
ok(oncePlateau({}) === false, 'empty state is not a plateau')
ok(plateauReached(undefined, { window: 3 }) === false, 'undefined rounds do not throw')
ok(plateauReached([null, {}, r(9, false)], { window: 3 }) === true, 'malformed rounds do not throw')

console.log(`\n${pass}/${pass + fail} passed`)
if (fail > 0) process.exitCode = 1
