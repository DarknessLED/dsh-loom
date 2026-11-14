// Spec: a checkpoint must stop being "waiting for you" when the campaign it
// belongs to ends. Today `checkpoint.raised` is folded and nothing ever closes
// it: 82 campaigns carry 97 open checkpoints, and a campaign that converged
// (ab-cand1) still shows six decisions the human can no longer act on.
//
// Two mechanisms are pinned here:
//   1. an explicit `checkpoint.closed` event (used when one decision is answered
//      or superseded) folds the checkpoint to `closed` with a reason;
//   2. when a campaign finishes, every checkpoint still `open` is closed with
//      `closedBy: 'campaign-finished'` — the inbox drains itself.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reduce } from '../../src/core/reduce.js'

let seq = 0
function ev(type, data = {}, t = 1000 + seq) {
  seq += 1
  return { seq, type, t, data, actor: 'system' }
}

test('a raised checkpoint is open (the contract that already works)', () => {
  const s = reduce([ev('campaign.created', { id: 'c1', objective: 'o' }), ev('checkpoint.raised', { id: 'cp1', kind: 'gate', payload: {} })])
  assert.equal(s.checkpoints.length, 1)
  assert.equal(s.checkpoints[0].status, 'open')
})

test('checkpoint.closed folds the checkpoint shut and records why', () => {
  const s = reduce([
    ev('campaign.created', { id: 'c1', objective: 'o' }),
    ev('checkpoint.raised', { id: 'cp1', kind: 'anomaly', payload: {} }),
    ev('checkpoint.closed', { id: 'cp1', reason: 'superseded' }, 2000),
  ])
  assert.equal(s.checkpoints[0].status, 'closed')
  assert.equal(s.checkpoints[0].closedReason, 'superseded')
  assert.equal(s.checkpoints[0].closedAt, 2000)
})

test('finishing the campaign closes every checkpoint still open', () => {
  const s = reduce([
    ev('campaign.created', { id: 'c1', objective: 'o' }),
    ev('checkpoint.raised', { id: 'cp1', kind: 'gate', payload: {} }),
    ev('checkpoint.raised', { id: 'cp2', kind: 'anomaly', payload: {} }),
    ev('checkpoint.raised', { id: 'cp3', kind: 'plateau', payload: {} }),
    ev('checkpoint.answered', { id: 'cp3', answer: 'continue' }, 1500),
    ev('campaign.finished', { status: 'converged', cause: 'converged' }, 2000),
  ])
  assert.equal(s.checkpoints.filter((c) => c.status === 'open').length, 0)
  assert.equal(s.checkpoints.find((c) => c.id === 'cp1').closedBy, 'campaign-finished')
  assert.equal(s.checkpoints.find((c) => c.id === 'cp2').status, 'closed')
  // An answer is evidence; it must not be rewritten into a closure.
  assert.equal(s.checkpoints.find((c) => c.id === 'cp3').status, 'answered')
})

test('finishing sets the ending the report reads', () => {
  const s = reduce([
    ev('campaign.created', { id: 'c1', objective: 'o' }),
    ev('campaign.finished', { status: 'stopped', cause: 'human-stop' }, 3000),
  ])
  assert.equal(s.ended.status, 'stopped')
  assert.equal(s.ended.cause, 'human-stop')
  assert.equal(s.ended.at, 3000)
  assert.equal(s.checkpoints.length, 0)
})

test('a closed checkpoint is not reopened by a later raise of the same id', () => {
  const s = reduce([
    ev('campaign.created', { id: 'c1', objective: 'o' }),
    ev('checkpoint.raised', { id: 'cp1', kind: 'gate', payload: {} }),
    ev('checkpoint.closed', { id: 'cp1', reason: 'superseded' }),
    ev('checkpoint.raised', { id: 'cp1', kind: 'gate', payload: {} }, 4000),
  ])
  const cp = s.checkpoints.find((c) => c.id === 'cp1')
  assert.equal(cp.status, 'closed')
})
