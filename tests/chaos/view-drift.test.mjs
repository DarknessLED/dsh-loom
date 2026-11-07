// Adversarial: the materialized view drifts. state.json is a cache: it can be
// deleted, truncated by a crash, or left behind by a process that died mid-write.
// None of that may change what the loop believes — the event log is the only
// authority, and a stale cache must never resurrect a status or a landed round
// the log no longer supports.
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Runtime } from '../../src/runtime/runtime.js'
import { normalizeConfig } from '../../src/core/config.js'
import { ok, done } from './fixture.mjs'

const root = mkdtempSync(join(tmpdir(), 'loom-view-'))
const repo = join(root, 'repo')
const home = join(root, 'home')
mkdirSync(repo, { recursive: true })
mkdirSync(home, { recursive: true })
const config = normalizeConfig({ tickMs: 1000, session: { maxConcurrent: 1 } })

const first = new Runtime({ ctx: {}, home, config, log: () => {} })
const view = first.create({ id: 'drift', objective: 'pin the view', workspace: repo, initiator: null })
first.append(view, 'campaign.status', { status: 'running' })
first.append(view, 'round.started', { n: 1, taskId: 't1', chainVersion: 1 })
first.append(view, 'round.finished', { n: 1, status: 'no-gain', score: 0, promoted: false })

const truth = { status: 'running', rounds: 1, roundStatus: 'no-gain' }
const statePath = join(home, 'campaigns', 'drift', 'views', 'state.json')

function reopen() {
  const rt = new Runtime({ ctx: {}, home, config, log: () => {} })
  return { rt, v: rt.open('drift') }
}

// 1. The file is gone (a cache directory that was cleaned, or a process that
//    died before it ever flushed).
{
  rmSync(statePath, { force: true })
  assert.equal(existsSync(statePath), false, 'the fixture starts without a view')
  const { v } = reopen()
  assert.equal(v.state.status, truth.status, 'status comes from the log')
  assert.equal(v.state.rounds.length, truth.rounds, 'rounds come from the log')
  ok('a missing state.json is rebuilt from the log')
}

// 2. A half-written file (truncated mid-json) must not be fatal.
{
  mkdirSync(join(statePath, '..'), { recursive: true })
  writeFileSync(statePath, '{"id":"drift","status":"promo')
  const { v } = reopen()
  assert.equal(v.state.status, truth.status, 'a truncated cache is ignored, not parsed')
  assert.equal(v.state.rounds.length, truth.rounds)
  ok('a truncated state.json is ignored')
}

// 3. A stale cache that claims things the log never said must lose.
{
  writeFileSync(
    statePath,
    JSON.stringify({
      id: 'drift',
      status: 'done',
      rounds: [{ n: 1, status: 'promoted', landed: true }],
      incumbent: { round: 1, score: 1 },
    }),
  )
  const { v } = reopen()
  assert.equal(v.state.status, 'running', 'a stale cache cannot finish a running campaign')
  assert.equal(v.state.rounds[0].status, 'no-gain', 'a stale cache cannot promote a round')
  assert.equal(v.state.rounds[0].landed ?? false, false, 'a stale cache cannot land a round')
  assert.equal(v.state.incumbent ?? null, null, 'a stale cache cannot invent an incumbent')
  ok('a stale cache loses to the log')
}

// 4. Flushing rebuilds the cache from the state the log produced.
{
  const { rt, v } = reopen()
  rt.flush(v)
  const written = JSON.parse(readFileSync(statePath, 'utf8'))
  assert.equal(written.status, 'running', 'the rebuilt cache matches the log')
  assert.equal(written.rounds.length, 1)
  assert.equal(written.rounds[0].status, 'no-gain')
  ok('flush rebuilds the cache from the log')
}

rmSync(root, { recursive: true, force: true })
done()
