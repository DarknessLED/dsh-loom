// Spec: a checkpoint held for quiet hours is not lost.
//
// notifyCheckpoint currently returns { delivered: false, reason: 'quiet-hours' }
// and drops the checkpoint. The config documents batching: the human should get
// the held checkpoints when the window closes.
//
// Implement src/runtime/deferred.js with:
//   deferUntil(quietHours, now) -> number | null
//     quietHours is { start, end } in "HH:MM" local time; windows may wrap
//     midnight. Returns the epoch ms of the next window end when `now` is
//     inside the window, otherwise null. `start` is inclusive, `end`
//     exclusive. Malformed times, a missing window and a zero-length window
//     (start === end) all return null.

import { deferUntil } from '../../src/runtime/deferred.js'

let pass = 0
let fail = 0

function ok(cond, name) {
  if (cond) pass += 1
  else fail += 1
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${pass + fail} - ${name}`)
}

const at = (day, hours, minutes) => new Date(2026, 10, day, hours, minutes, 0, 0).getTime()
const sameAs = (got, day, hours, minutes) =>
  got === new Date(2026, 10, day, hours, minutes, 0, 0).getTime()

const night = { start: '22:00', end: '07:00' }
const day = { start: '09:00', end: '17:00' }

// --- overnight windows -----------------------------------------------------
ok(sameAs(deferUntil(night, at(6, 23, 30)), 7, 7, 0), '23:30 waits for 07:00 tomorrow')
ok(sameAs(deferUntil(night, at(6, 5, 0)), 6, 7, 0), '05:00 waits for 07:00 the same morning')
ok(deferUntil(night, at(6, 12, 0)) === null, 'noon is outside the night window')

// --- daytime windows -------------------------------------------------------
ok(sameAs(deferUntil(day, at(6, 10, 0)), 6, 17, 0), '10:00 waits for 17:00')
ok(deferUntil(day, at(6, 18, 0)) === null, '18:00 is outside the daytime window')

// --- boundaries are start-inclusive, end-exclusive -------------------------
ok(sameAs(deferUntil(night, at(6, 22, 0)), 7, 7, 0), '22:00 exactly is inside')
ok(deferUntil(night, at(6, 7, 0)) === null, '07:00 exactly is outside')
ok(deferUntil(day, at(6, 9, 0)) !== null, '09:00 exactly is inside')

// --- degenerate input ------------------------------------------------------
ok(deferUntil(null, at(6, 23, 0)) === null, 'no window, no deferral')
ok(deferUntil({ start: 'nope', end: '07:00' }, at(6, 23, 0)) === null, 'malformed start is ignored')
ok(deferUntil({ start: '22:00', end: '25:00' }, at(6, 23, 0)) === null, 'out-of-range hour is ignored')
ok(deferUntil({ start: '09:00', end: '09:00' }, at(6, 9, 30)) === null, 'zero-length window never holds')
ok(deferUntil('22:00-07:00', at(6, 23, 0)) !== null, 'the documented "start-end" string also works')

console.log(`\n${pass}/${pass + fail} passed`)
if (fail > 0) process.exitCode = 1
