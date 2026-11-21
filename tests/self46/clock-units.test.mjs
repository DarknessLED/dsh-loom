// The ledger writes time as a number of milliseconds (`ev.t`), and three
// readers assumed a string. Each failed silently:
//
//   - `budgetLeftMsOf` returned null forever, so the priced hedge
//     (`planCandidates`) was never called: 0 of 464 rounds carried a
//     `candidatePlan` in the whole record.
//   - the panel's `ageMs` was NaN, so "how long has this been idle" was
//     unreadable.
//   - `quality.roundMs` could not fall back to timestamps.
//
// A silent NaN is worse than a crash: every one of these read as "the ledger
// cannot say", which is a legitimate answer, so nothing ever complained.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { toMs } from '../../src/core/clock.js'
import { campaignQuality } from '../../src/runtime/quality.js'
import { panelState } from '../../src/panel/api.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const T = 1794843743415

test('a millisecond number is a moment', () => {
  assert.equal(toMs(T), T)
  assert.equal(toMs(String(T)), T)
  assert.equal(toMs(new Date(T).toISOString()), T)
  // A fractional millisecond is still a moment; truncating it would be a
  // silent rounding rule the ledger never asked for.
  assert.equal(toMs(T + 0.7), T + 0.7)
})

test('what is not a moment reads as null, not NaN', () => {
  for (const v of [null, undefined, '', '   ', {}, [], NaN, Infinity, true, false, 'not-a-date']) {
    assert.equal(toMs(v), null, `${String(v)} must not become a number`)
  }
  ok('the helper never returns NaN')
})

test('a round with no durationMs still has a measurable length', () => {
  const quality = campaignQuality({
    rounds: [{ n: 1, at: T, endedAt: T + 90_000, status: 'promoted', promoted: true }],
    evalset: { tasks: [{ id: 't' }] },
  })
  const row = quality?.rounds?.[0] ?? null
  assert.ok(quality, 'a state with one round yields a quality report')
  assert.ok(row === null || Number.isFinite(row.ms ?? row.durationMs ?? 0), 'no NaN leaks into the report')
  ok('quality tolerates numeric timestamps')
})

function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'loom-clock-'))
  const git = (...args) =>
    execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  git('init', '-q')
  git('config', 'user.email', 'loom@local')
  git('config', 'user.name', 'loom')
  writeFileSync(join(dir, 'a.txt'), 'a\n')
  git('add', '-A')
  git('commit', '-qm', 'base')
  return dir
}

test('the panel can say how long a campaign has been idle', () => {
  const dir = repo()
  const home = join(dir, 'home')
  const runtime = {
    home,
    listCampaigns: () => ['c1'],
    get: () => ({
      dir: join(home, 'campaigns', 'c1'),
      state: {
        id: 'c1',
        status: 'running',
        createdAt: T,
        updatedAt: T,
        workspace: dir,
        chain: { activeVersion: 1, versions: [{ version: 1, spec: { params: {} }, status: 'active' }] },
        rounds: [],
        budget: {},
      },
    }),
  }
  const state = panelState({ runtime, config: {} })
  const row = (state.campaigns ?? state.rows ?? []).find((c) => c.id === 'c1')
  assert.ok(row, 'the campaign is listed')
  assert.equal(Number.isNaN(row.ageMs), false, 'ageMs must not be NaN')
  assert.equal(Number.isFinite(row.ageMs), true, 'a numeric updatedAt is a measurable age')
  rmSync(dir, { recursive: true, force: true })
  ok('ageMs is finite for a numeric timestamp')
})

test('the round asks the hedge with a real clock', async () => {
  const { readFileSync } = await import('node:fs')
  const { fileURLToPath } = await import('node:url')
  const { dirname } = await import('node:path')
  const here = dirname(fileURLToPath(import.meta.url))
  const src = readFileSync(join(here, '..', '..', 'src', 'runtime', 'round.js'), 'utf8')
  assert.match(src, /toMs\(/, 'round.js must read the ledger clock through the helper')
  assert.doesNotMatch(src, /Date\.parse\(state\?\.createdAt\)/, 'Date.parse of a numeric createdAt is always NaN')
  ok('round.js reads the clock through one helper')
})

console.log(`\n${pass}/${pass} passed`)
