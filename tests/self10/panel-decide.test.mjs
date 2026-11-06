/**
 * Spec: the panel's buttons must go through exactly the same door as the tools.
 *
 * The browser half posts `{campaign, action:'decide', checkpoint, decision}` to
 * /dsh-loom/state. Nothing pins that path: a regression could quietly append a
 * decision without the ownership check, or accept a typo'd decision and leave a
 * checkpoint open forever while the UI said "done".
 */
import assert from 'node:assert/strict'

let passed = 0
let failed = 0
function test(name, fn) {
  try {
    fn()
    passed++
    console.log(`ok ${passed + failed} - ${name}`)
  } catch (err) {
    failed++
    console.log(`not ok ${passed + failed} - ${name}`)
    console.log(`  ${String(err?.message ?? err).split('\n').join('\n  ')}`)
  }
}

const { panelAction } = await import('../../src/panel/api.js')

function fakeRuntime({ open = true, owner = true } = {}) {
  const events = []
  const checkpoints = open
    ? [{ id: 'cp-1', kind: 'gate', status: 'open', at: 1, payload: { score: 0.5 } }]
    : [{ id: 'cp-1', kind: 'gate', status: 'answered', at: 1 }]
  const state = {
    id: 'c',
    status: 'running',
    objective: 'demo',
    workspace: '/tmp/demo',
    rounds: [],
    checkpoints,
    lessons: [],
    budget: { usd: 1, spentUsd: 0 },
    evalset: { tasks: [{ id: 't1' }], holdout: [] },
  }
  const view = { id: 'c', state }
  const runtime = {
    listCampaigns: () => ['c'],
    get: () => view,
    ensureOwner: () => owner,
    ownership: () => ({ owner: { pid: 1 }, mine: true }),
    liveAttempts: () => [],
    control: () => {},
    append: (v, type, data) => {
      events.push({ type, data })
      if (type === 'checkpoint.answered') {
        const cp = v.state.checkpoints.find((c) => c.id === data.checkpoint)
        if (cp) cp.status = 'answered'
      }
      if (type === 'campaign.status') v.state.status = data.status
      return v.state
    },
  }
  return { runtime, events, view }
}

test('approve answers the named checkpoint and reports success', () => {
  const { runtime, events } = fakeRuntime()
  const out = panelAction(
    { runtime },
    { campaign: 'c', action: 'decide', checkpoint: 'cp-1', decision: 'approve' },
  )
  assert.equal(out.ok, true)
  const answered = events.find((e) => e.type === 'checkpoint.answered')
  assert.ok(answered, 'a checkpoint.answered event must be appended')
  assert.equal(answered.data.checkpoint, 'cp-1')
  assert.equal(answered.data.answer.decision, 'approve')
  assert.equal(answered.data.answer.source, 'panel')
})

test('reject is accepted and stop also stops the campaign', () => {
  const a = fakeRuntime()
  panelAction({ runtime: a.runtime }, { campaign: 'c', action: 'decide', decision: 'reject' })
  assert.equal(a.events.at(-1).data.answer.decision, 'reject')

  const b = fakeRuntime()
  panelAction(
    { runtime: b.runtime },
    { campaign: 'c', action: 'decide', decision: 'stop', checkpoint: 'cp-1' },
  )
  const stopped = b.events.find((e) => e.type === 'campaign.status')
  assert.ok(stopped, 'stop must append campaign.status')
  assert.equal(stopped.data.status, 'stopped')
})

test('an unknown decision is refused instead of silently ignored', () => {
  const { runtime, events } = fakeRuntime()
  assert.throws(
    () => panelAction({ runtime }, { campaign: 'c', action: 'decide', decision: 'approve!!' }),
    /unknown decision/,
  )
  assert.equal(events.length, 0, 'nothing may be appended for a refused decision')
})

test('deciding with no open checkpoint is an error, not a no-op', () => {
  const { runtime } = fakeRuntime({ open: false })
  assert.throws(
    () => panelAction({ runtime }, { campaign: 'c', action: 'decide', decision: 'approve' }),
    /no open checkpoint/,
  )
})

test('a window that does not own the loop cannot decide', () => {
  const { runtime, events } = fakeRuntime({ owner: false })
  assert.throws(
    () => panelAction({ runtime }, { campaign: 'c', action: 'decide', decision: 'approve' }),
    /driving the loop/,
  )
  assert.equal(events.length, 0)
})

console.log(`\n${passed}/${passed + failed} passed`)
if (failed > 0) process.exitCode = 1
