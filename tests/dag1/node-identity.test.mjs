// A round is not the smallest unit of work the loop can lose.
//
// Today a plan node runs for 210-510 seconds (28-47% of a round) and leaves no
// identity behind: `node.finished` is written to the ledger but `reduce` drops it
// in its `default: break`, so nothing can attribute that time to a node, and a
// crash can only ever restart the whole round. Temporal calls this an Activity
// with a Heartbeat; LangGraph calls it a super-step checkpoint. Either way the
// node needs a name, a start, and an end - and a node still running when its
// round ends must be marked lost, not silently forgotten.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { reduce } from '../../src/core/reduce.js'

const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' })

const root = mkdtempSync(join(tmpdir(), 'loom-dag1-'))
const dir = join(root, 'repo')
mkdirSync(dir, { recursive: true })
git(dir, 'init', '-q')
git(dir, 'config', 'user.email', 'loom@local')
git(dir, 'config', 'user.name', 'dsh-loom')
git(dir, 'config', 'core.autocrlf', 'false')
writeFileSync(join(dir, 'keep.txt'), 'keep\n')
git(dir, 'add', '-A')
git(dir, 'commit', '-q', '-m', 'base')

const base = git(dir, 'rev-parse', 'HEAD').trim()
rmSync(root, { recursive: true, force: true })

// A recorded plan node, as the runtime writes it today. The point of the spec is
// that the reducer must keep it, so these events are exactly the real shape.
const started = { id: 'recon', type: 'agent', role: 'planner', round: 1, at: 1000 }
const finished = { id: 'recon', type: 'agent', role: 'planner', round: 1, ok: true, durationMs: 210_978, at: 211_978 }

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

// 1. A plan node leaves a name and a lifetime in the folded state.
{
  const state = reduce(
    [
      { seq: 1, type: 'campaign.created', data: { id: 'c1', workspace: dir, at: 1 } },
      { seq: 2, type: 'round.started', data: { n: 1, taskId: 't1', at: 900 } },
      { seq: 3, type: 'node.started', data: started },
      { seq: 4, type: 'node.finished', data: finished },
    ],
    'c1',
  )
  const nodes = state.nodes ?? []
  const node = nodes.find((n) => n.id === 'recon')
  assert.ok(node, 'the folded state keeps the plan node (state.nodes), not just the round total')
  assert.equal(node.status, 'done')
  assert.equal(node.round, 1)
  assert.equal(node.durationMs, 210_978)
  ok('a plan node is addressable: id, round, status and duration in the folded state')
}

// 2. A node still running when its round ends is lost, not forgotten. This is the
//    crash case: the round closes, the plan node never reported.
{
  const state = reduce(
    [
      { seq: 1, type: 'campaign.created', data: { id: 'c2', workspace: dir, at: 1 } },
      { seq: 2, type: 'round.started', data: { n: 1, taskId: 't1', at: 900 } },
      { seq: 3, type: 'node.started', data: { ...started, round: 1 } },
      { seq: 4, type: 'round.finished', data: { n: 1, status: 'interrupted', promoted: false, at: 5000 } },
    ],
    'c2',
  )
  const node = (state.nodes ?? []).find((n) => n.id === 'recon')
  assert.ok(node, 'the node survives the round ending')
  assert.equal(node.status, 'lost', 'a node whose round ended without a finish is lost, never "running" forever')
  ok('a node still running when its round ends is marked lost')
}

// 3. The existing numbers must not move: this adds identity, it does not re-price
//    a round. A ledger without node events still folds to the same round shape.
{
  const state = reduce(
    [
      { seq: 1, type: 'campaign.created', data: { id: 'c3', workspace: dir, at: 1 } },
      { seq: 2, type: 'round.started', data: { n: 1, taskId: 't1', at: 900 } },
      {
        seq: 3,
        type: 'round.finished',
        data: { n: 1, status: 'promoted', promoted: true, score: 1, durationMs: 100, planMs: 40, at: 2000 },
      },
    ],
    'c3',
  )
  assert.equal(state.rounds[0].planMs, 40, 'planMs still lands on the round')
  assert.equal(state.rounds[0].durationMs, 100, 'durationMs still lands on the round')
  assert.deepEqual(state.nodes ?? [], [], 'no node events means no node rows, not a fabricated one')
  ok('a ledger without node events folds exactly as before')
}

console.log(`\n${pass}/${pass} passed (base ${base.slice(0, 7)})`)
