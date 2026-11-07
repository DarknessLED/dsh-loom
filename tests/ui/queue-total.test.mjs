/**
 * The queue must be able to say how much of itself it is showing.
 *
 * The host trims each campaign's `reviews` to three rows, so the fourth open
 * checkpoint reaches the sidebar with no risk assessment and no summary — it
 * looks like a low-priority question when in truth nobody has looked at it. The
 * queue also has no way to tell the reader "5 waiting, 3 assessed".
 *
 * The rule: every open checkpoint appears, each row says where its risk came
 * from, and the caller can render a total that does not depend on the cap.
 */
import assert from 'node:assert/strict'
import { loadPanel } from './harness.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log('ok ' + name)
}

const panel = await loadPanel()
const { queueOf } = panel

const now = 1_800_000_000_000
const campaign = (id, checkpoints, reviews) => ({
  id,
  status: 'running',
  openCheckpoints: checkpoints,
  reviews,
})

const data = {
  campaigns: [
    campaign(
      'alpha',
      [
        { id: 'cp-1', kind: 'gate', at: now - 60_000 },
        { id: 'cp-2', kind: 'anomaly', at: now - 120_000 },
        { id: 'cp-3', kind: 'plateau', at: now - 180_000 },
        { id: 'cp-4', kind: 'stuck', at: now - 240_000 },
      ],
      [
        { id: 'cp-1', risk: 'high', summary: '补丁改了两个测试文件' },
        { id: 'cp-2', risk: 'normal', summary: '两次晋升失败' },
        { id: 'cp-3', risk: 'low', summary: '三轮没有推进' },
      ],
    ),
    campaign('beta', [{ id: 'cp-9', kind: 'budget', at: now - 30_000 }], []),
  ],
}

{
  const q = queueOf(data, { now })
  assert.equal(q.total, 5, 'five questions are waiting')
  assert.equal(q.rows.length, 5, 'and all five reach the reader')
  const assessed = q.rows.filter((r) => r.riskSource === 'review')
  assert.equal(assessed.length, 3, 'three of them were assessed')
  const unassessed = q.rows.filter((r) => r.riskSource === 'default')
  assert.equal(unassessed.length, 2, 'two say so instead of pretending to be normal')
  for (const r of q.rows) assert.ok(['review', 'default'].includes(r.riskSource), 'every row names its source')
  ok('every checkpoint is listed, with where its risk came from')
}

{
  const q = queueOf(data, { now, limit: 2 })
  assert.equal(q.rows.length, 2, 'a limit trims what is drawn')
  assert.equal(q.shown, 2)
  assert.equal(q.total, 5, 'but never the count')
  ok('the header can say 2 of 5')
}

{
  const q = queueOf(data, { now })
  assert.equal(q.rows[0].risk, 'high', 'risk still leads the order')
  assert.equal(q.rows[0].id, 'cp-1')
  ok('risk still sorts before age')
}

console.log(`${pass}/3 passed`)
assert.ok(pass > 0)
