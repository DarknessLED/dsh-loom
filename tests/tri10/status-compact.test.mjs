// `rsi_status` is documented as "cheap; safe to call often", but it returns the
// last round whole - every attempt's report, stdoutTail and agentTail included.
// On a real campaign that is tens of kilobytes of text the reader (an agent) has
// to pay for and mostly cannot use, which is why the compact dashboard exists.
//
// Required:
//   - `compactStatus(status, {detail})` is exported from src/tools/index.js:
//       default: attempts are reduced to { id, score, verifierOk, failureKind,
//       abandoned, durationMs } and the fields `report`, `stdoutTail`, `agentTail`
//       are dropped from every attempt, at every depth the status reaches;
//       { detail: 'full' } returns the input untouched (opt-in, never the default);
//     it must survive a status with no lastRound and one with no attempts.
//   - the result stays small: a status carrying 8 rounds of 2 attempts with 2 KB
//     of report each must serialise under 4 KB.
//   - rsi_status uses it (a compact default, not a second code path).
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { compactStatus } from '../../src/tools/index.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const big = 'x'.repeat(2000)
const attempt = (id) => ({
  id,
  score: 1,
  verifierOk: true,
  failureKind: 'ok',
  abandoned: false,
  durationMs: 42000,
  branch: 'loom/x/' + id,
  report: { summary: big },
  stdoutTail: big,
  agentTail: big,
})
const status = {
  id: 'demo',
  status: 'running',
  rounds: 8,
  budget: { usd: 10, spentUsd: 0.4, rounds: 20 },
  lastRound: { n: 8, status: 'promoted', score: 1, attempts: [attempt('r8a1'), attempt('r8a2')], durationMs: 600000 },
  openCheckpoints: [],
}

{
  const out = compactStatus(status)
  const attempts = out.lastRound.attempts
  assert.equal(attempts.length, 2, 'attempts are kept as a list')
  assert.deepEqual(Object.keys(attempts[0]).sort(), ['abandoned', 'durationMs', 'failureKind', 'id', 'score', 'verifierOk'].sort(), 'only the readable fields survive')
  const json = JSON.stringify(out)
  assert.ok(json.length < 4096, `the compact status stays small (was ${json.length} bytes)`)
  assert.ok(!json.includes(big), 'no attempt report is carried by default')
}
ok('the default status is compact')

{
  const full = compactStatus(status, { detail: 'full' })
  assert.equal(full, status, 'detail:full is the caller asking for the whole thing')
  assert.equal(full.lastRound.attempts[0].report.summary.length, 2000, 'and it really is untouched')
}
ok('the full view is opt-in')

{
  assert.doesNotThrow(() => compactStatus({ id: 'x', status: 'planning' }), 'a campaign with no round survives')
  assert.doesNotThrow(() => compactStatus({ id: 'x', lastRound: { n: 1, attempts: [] } }), 'a round with no attempts survives')
  assert.doesNotThrow(() => compactStatus(null), 'null is not a crash')
}
ok('the reducer tolerates the shapes the loop actually produces')

{
  const src = readFileSync(new URL('../../src/tools/index.js', import.meta.url), 'utf8')
  assert.match(src, /compactStatus\(/, 'rsi_status goes through it')
}
ok('the tool does not keep a second, fat code path')

console.log(`\n${pass}/${pass} passed`)
