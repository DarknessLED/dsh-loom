// The panel can tell you a round took 936 seconds. It cannot yet tell you that
// 160 of them were the planner - even though the ledger now knows, because
// loom-dag1 gave the plan node an identity (state.nodes). Attribution that only
// the ledger can see is attribution nobody uses.
import assert from 'node:assert/strict'

import { nodesFor } from '../../src/panel/api.js'
import { loadPanel } from './harness.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const node = (id, round, status, durationMs, role = 'planner') => ({ id, round, status, role, durationMs, type: 'agent' })

// 1. The panel ships node rows, newest rounds first, and never a fabricated one.
{
  const state = {
    nodes: [
      node('recon', 1, 'done', 159_269),
      node('recon', 2, 'done', 241_061),
      node('recon', 3, 'lost', 0),
    ],
  }
  const rows = nodesFor(state)
  assert.equal(rows.length, 3, 'every recorded node is addressable')
  assert.deepEqual(
    rows.map((r) => r.round),
    [3, 2, 1],
    'newest round first: the panel is read top-down, and the last round is the question',
  )
  // `model` joined the row when the planner started naming the ref it ran on.
  // The node fixture above predates the field, so it reads back as null rather
  // than as an invented ref; tests/balance/a-node-remembers-its-model.test.mjs
  // pins the populated case.
  assert.deepEqual(rows[1], { id: 'recon', role: 'planner', round: 2, status: 'done', durationMs: 241061, model: null })
  ok('node rows reach the panel, newest round first')
}

// 2. A campaign with no node rows (any ledger written before this existed) is
//    empty, not broken - and a cap keeps the panel from becoming a log viewer.
{
  assert.deepEqual(nodesFor({}), [])
  assert.deepEqual(nodesFor(undefined), [])
  const many = { nodes: Array.from({ length: 30 }, (_, i) => node('n' + i, 1 + i, 'done', 1000)) }
  assert.equal(nodesFor(many, { limit: 6 }).length, 6, 'a cap keeps the panel a panel')
  ok('no rows and too many rows are both handled')
}

const panel = await loadPanel()

// 3. The bundle labels a node in the same Chinese the rest of the panel speaks,
//    and does not invent a duration it was not given.
{
  const chips = panel.nodeChips({
    nodes: [
      { id: 'recon', role: 'planner', round: 2, status: 'done', durationMs: 241_061 },
      { id: 'recon', role: 'planner', round: 3, status: 'lost', durationMs: 0 },
    ],
  })
  assert.equal(chips.length, 2)
  assert.match(chips[0].label, /规划/, 'the planner is called what it is')
  assert.match(chips[0].label, /4分1秒|241秒/, 'the duration is on the label')
  assert.equal(chips[1].label.includes('0秒') || chips[1].label.includes('丢失'), true, 'a lost node says so')
  assert.deepEqual(panel.nodeChips({}), [], 'a campaign without nodes has no chips')
  ok('the bundle turns node rows into labelled chips, honestly')
}

console.log(`\n${pass}/${pass} passed`)
