// Spec: when a campaign stops, it owes a verdict. Today 26 campaigns are
// `stopped` and 9 of them never promoted anything — nothing records why the
// loop stopped or what a later session should resume from.
//
// `describeEnd(state)` is the closing sentence: cause, what was reached, and
// the exact thing to do next. It is pure (state in, text out) so the panel,
// the digest and `rsi_status` can all render the same answer.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { describeEnd } from '../../src/report/end.js'

const promoted = {
  status: 'stopped',
  ended: { status: 'stopped', cause: 'human-stop' },
  rounds: [{ n: 3, status: 'promoted', score: 0.85 }],
  incumbent: { round: 3, score: 0.85 },
  checkpoints: [],
}

test('a stopped campaign says why it stopped', () => {
  const d = describeEnd(promoted)
  assert.equal(d.status, 'stopped')
  assert.equal(d.cause, 'human-stop')
  assert.match(d.headline, /human-stop/)
})

test('the verdict names the incumbent a resume would build on', () => {
  const d = describeEnd(promoted)
  assert.match(d.resumeHint, /0\.85/)
  assert.match(d.resumeHint, /3/)
})

test('a campaign that never promoted says so instead of staying silent', () => {
  const d = describeEnd({
    status: 'stopped',
    ended: { status: 'stopped', cause: 'human-stop' },
    rounds: [{ n: 1, status: 'error', score: null }],
    incumbent: null,
    checkpoints: [],
  })
  assert.match(d.headline, /no incumbent/i)
  assert.match(d.resumeHint, /baseline/i)
})

test('a converged campaign reads as finished, not as interrupted', () => {
  const d = describeEnd({
    ...promoted,
    status: 'converged',
    ended: { status: 'converged', cause: 'converged' },
  })
  assert.match(d.headline, /converged/i)
  assert.doesNotMatch(d.headline, /human-stop/)
})

test('describeEnd tolerates a campaign that has not ended', () => {
  const d = describeEnd({ status: 'running', rounds: [], incumbent: null })
  assert.equal(typeof d.headline, 'string')
  assert.equal(typeof d.resumeHint, 'string')
  assert.equal(d.cause, null)
})

test('describeEnd never throws on junk input', () => {
  for (const junk of [null, undefined, {}, 'x', 42, []]) {
    const d = describeEnd(junk)
    assert.equal(typeof d.headline, 'string')
    assert.equal(typeof d.resumeHint, 'string')
  }
})
