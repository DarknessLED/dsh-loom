// The ledger's money story, read back: a trial counter survives a stale writer,
// the funding verdict uses measured rounds instead of the creation-time guess,
// and a round that crosses the cap says so.
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { appendGlobalLesson, readGlobalLessons } from '../../src/knowledge/store.js'
import { refreshFunding } from '../../src/loop/funding.js'
import { overshootOf } from '../../src/runtime/triangle.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

// A second writer that read before the first wrote must not lower the count.
{
  const home = mkdtempSync(join(tmpdir(), 'loom-store-'))
  appendGlobalLesson(home, { id: 'l1', family: 'f', kind: 'procedure', trials: { shown: 7, wins: 2, losses: 1, ties: 4 } })
  appendGlobalLesson(home, { id: 'l1', family: 'f', kind: 'procedure', trials: { shown: 3, wins: 0, losses: 0, ties: 3 } })
  const [stored] = readGlobalLessons(home)
  assert.equal(stored.trials.shown, 7, 'the larger count survives a stale writer')
  assert.equal(stored.trials.wins, 2, 'wins take the max')
  assert.equal(stored.trials.losses, 1, 'losses take the max')
  assert.equal(stored.trials.ties, 4, 'ties take the max')
  const leftovers = readdirSync(home).filter((f) => f.endsWith('.tmp') || f.endsWith('.lock'))
  assert.deepEqual(leftovers, [], 'the write leaves no temp or lock file behind')
  JSON.parse(readFileSync(join(home, 'knowledge.json'), 'utf8'))
  ok('a store write merges counters and cleans up after itself')
  rmSync(home, { recursive: true, force: true })
}

// Funding is a function of what rounds cost, not of a config guess: the
// pre-flight that reported "2 affordable rounds" for a campaign spending $0.005
// was reading the price written before any round ran.
{
  const budget = refreshFunding({
    budget: { rounds: 25, usd: 0.28, usdPerRound: 0.12 },
    rounds: [{ costUsd: 0.005 }, { costUsd: 0.006 }, { costUsd: 0.0055 }],
  })
  assert.equal(budget.usdPerRound, 0.0055, 'the measured mean replaces the guess')
  assert.equal(budget.funding.affordableRounds, 50, 'the cap buys 50 measured rounds')
  assert.equal(budget.funding.funded, true, 'the plan is fundable at the measured price')
  assert.equal(budget.funding.shortfallUsd, 0, 'no shortfall at the measured price')
  ok('funding is recomputed from measured rounds')
}

// No measurement yet: the config guess is all the evidence there is, and it may
// say the plan is unfunded — that is a real question, answered provisionally.
{
  const budget = refreshFunding({ budget: { rounds: 10, usd: 0.28, usdPerRound: 0.12 }, rounds: [] })
  assert.equal(budget.funding.usdPerRound, 0.12)
  assert.equal(budget.funding.affordableRounds, 2)
  ok('an unmeasured campaign still reports the configured price')
}

// A round whose bill crosses the cap is named, not silently inferred next tick.
{
  const over = overshootOf([{ costUsd: 0.2 }, { costUsd: 0.1 }], 0.25)
  assert.equal(over.spentUsd, 0.3)
  assert.equal(over.overUsd, 0.05)
  assert.equal(over.capUsd, 0.25)
  assert.equal(overshootOf([{ costUsd: 0.1 }], 0.25), null, 'inside the cap is not a crossing')
  assert.equal(overshootOf([{ costUsd: 0.25 }], 0.25), null, 'exactly at the cap is not a crossing')
  assert.equal(overshootOf([{ costUsd: null }], 0.25), null, 'an unmeasured round is not a crossing')
  ok('a crossing is reported with the exact overshoot')
}

console.log(`\n${pass}/${pass} passed`)
