// The planner's model is written to the log and then dropped on the way to every
// surface that could show it.
//
// loom-plan-chain-live's round-1 planner event carries
// `model: "open-design/claude-haiku-5.5"` -- that field is the whole proof that a
// campaign policy reaches the planner rather than the configured worker. After
// folding, the node row has id, role, round, status, durationMs and nothing else,
// so the panel and `nodesFor` cannot say which model planned. The evidence was
// recorded; the projection threw it away.
import assert from 'node:assert/strict'
import { reduce } from '../../src/core/reduce.js'
import { nodesFor } from '../../src/panel/api.js'

let pass = 0
function ok(name, cond = true, detail) {
  if (!cond) {
    console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`)
    return
  }
  pass += 1
  console.log(`  ok   ${name}`)
}

const ev = (seq, type, data) => ({ seq, t: 1794349730000 + seq, type, data })

const events = [
  ev(1, 'campaign.created', { id: 'c1', workspace: '/tmp/x' }),
  ev(2, 'round.started', { n: 1, taskId: 't' }),
  ev(3, 'node.finished', {
    id: 'recon', type: 'agent', role: 'planner', round: 1, attempt: 1,
    ok: true, durationMs: 13459, model: 'open-design/claude-haiku-5.5',
  }),
  ev(4, 'node.finished', {
    id: 'recon', type: 'agent', role: 'planner', round: 2, attempt: 1,
    ok: true, reused: true, durationMs: 0, model: null,
  }),
]

const state = reduce(events, 'c1')

// The fold must keep what the event said.
{
  const rows = state.nodes
  const r1 = rows.find((n) => n.round === 1)
  const r2 = rows.find((n) => n.round === 2)
  ok('the planner row names its model', r1?.model === 'open-design/claude-haiku-5.5', String(r1?.model))
  ok('a reused plan keeps its null model honestly', r2?.model === null, String(r2?.model))
}

// An event without the field must not invent one: older ledgers predate it.
{
  const old = reduce(
    [ev(1, 'campaign.created', { id: 'c2' }), ev(2, 'node.finished', { id: 'recon', round: 1, ok: true, durationMs: 5 })],
    'c2',
  )
  const row = old.nodes.find((n) => n.round === 1)
  ok('an old event leaves the model absent, not guessed', row?.model === undefined || row?.model === null, String(row?.model))
}

// And the panel projection, which is what the sidebar actually receives, has to
// carry it through. A field that stops one layer short is the same as dropped.
{
  const rows = nodesFor(state)
  const r1 = rows.find((n) => n.round === 1)
  ok('nodesFor carries the model', r1?.model === 'open-design/claude-haiku-5.5', String(r1?.model))
  ok('nodesFor still carries the duration', r1?.durationMs === 13459, String(r1?.durationMs))
}

// The projection stays stable when the field is absent.
{
  const rows = nodesFor({ nodes: [{ id: 'recon', round: 1, status: 'done' }] })
  ok('a row without a model still projects', rows.length === 1 && rows[0].model === null, JSON.stringify(rows))
}

console.log(`\n${pass}/6 passed`)
assert.ok(pass === 6, `expected 6 passing checks, got ${pass}`)
