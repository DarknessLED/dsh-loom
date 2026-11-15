// reduce replays the whole ledger on every append. At 12k events that is fine;
// nobody measured whether it still is at 100k. This is a ceiling, not a target:
// if it fails, the right response is to measure before optimizing, not to raise
// the number until green.
import assert from 'node:assert/strict'
import { reduce } from '../../src/core/reduce.js'

const events = []
for (let n = 1; n <= 5000; n += 1) {
  events.push({ type: 'round.started', t: 't', data: { n, at: '2026-01-01T00:00:00.000Z', taskId: 't1', chainVersion: 1 } })
  events.push({
    type: 'round.finished',
    t: 'system',
    data: { n, status: 'no-gain', score: 0.3, promoted: false, attempts: [] },
  })
}

const started = process.hrtime.bigint()
const state = reduce(events, 'perf')
const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6

assert.equal(state.rounds.length, 5000, 'the fold did the work')
assert.ok(elapsedMs < 4000, `10000 events should fold well under 4s, took ${elapsedMs.toFixed(0)}ms`)
console.log(`ok - 10000 events folded in ${elapsedMs.toFixed(0)}ms`)
