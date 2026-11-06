// Checkpoints are the campaign's only door to a human, and their ids are the
// handle `rsi_decide` takes. Two checkpoints raised in the same millisecond
// (a round that fails verification and also breaks the budget, say) must still
// get distinct ids, or the second becomes undecidable and the ledger lies.
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { raiseCheckpoint } from '../../src/runtime/round.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

function fakeRuntime(dir) {
  const events = []
  return {
    home: join(dir, 'home'),
    events,
    dir,
    append(_view, type, data) {
      events.push({ type, data })
    },
  }
}

// 1. three checkpoints raised back to back get three distinct ids
{
  const dir = mkdtempSync(join(tmpdir(), 'loom-cpid-'))
  const rt = fakeRuntime(dir)
  const view = { dir: join(dir, 'campaign'), state: { id: 'cpid', rounds: [] } }
  mkdirSync(view.dir, { recursive: true })
  const a = raiseCheckpoint(rt, view, 'anomaly', { round: 1 })
  const b = raiseCheckpoint(rt, view, 'budget', { round: 1 })
  const c = raiseCheckpoint(rt, view, 'anomaly', { round: 2 })
  assert.notEqual(a, b, 'two checkpoints in the same tick must not share an id')
  assert.notEqual(b, c, 'ids stay distinct across kinds')
  assert.notEqual(a, c, 'ids stay distinct across rounds')
  const ids = rt.events.filter((e) => e.type === 'checkpoint.raised').map((e) => e.data.id)
  assert.equal(ids.length, 3, 'every raise is on the ledger')
  assert.equal(new Set(ids).size, 3, 'the ledger has no duplicate handles')
  ok('checkpoint ids are unique within the same millisecond')
  rmSync(dir, { recursive: true, force: true })
}

// 2. every id keeps the documented shape, so the dashboard and docs stay valid
{
  const dir = mkdtempSync(join(tmpdir(), 'loom-cpid-'))
  const rt = fakeRuntime(dir)
  const view = { dir: join(dir, 'campaign'), state: { id: 'cpid2', rounds: [] } }
  mkdirSync(view.dir, { recursive: true })
  const id = raiseCheckpoint(rt, view, 'gate', { round: 3 })
  assert.match(id, /^cp-[a-z0-9]+$/, 'ids stay short and greppable')
  const event = rt.events.find((e) => e.type === 'checkpoint.raised')
  assert.equal(event.data.id, id, 'the event carries the returned id')
  assert.equal(event.data.kind, 'gate', 'the event carries the kind')
  assert.deepEqual(event.data.payload, { round: 3 }, 'the event carries the payload')
  ok('checkpoint events keep the documented shape')
  rmSync(dir, { recursive: true, force: true })
}

console.log(`\n${pass}/${pass} passed`)
