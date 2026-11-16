// T3 showed 5 showings where 4 were ties; the status view counted only wins and
// losses, so "5W/0L" could mean "5 real wins" or "5 coin flips". The summary
// must surface ties, keep/drop counts and the trial verdict in one place.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { summarizeTrials, TRIAL_FLOOR } from '../../src/knowledge/trials.js'

const lesson = (id, trials) => ({ id, kind: 'procedure', status: 'active', claim: id, trials })

assert.deepEqual(summarizeTrials([]), {
  procedures: 0,
  shown: 0,
  wins: 0,
  losses: 0,
  ties: 0,
  keep: 0,
  drop: 0,
  insufficient: 0,
  verdict: 'none',
})

const got = summarizeTrials([
  lesson('twenty-wins', { shown: 20, wins: 15, losses: 2, ties: 3 }),
  lesson('short', { shown: 19, wins: 9, losses: 1, ties: 9 }),
  lesson('twenty-losses', { shown: 20, wins: 2, losses: 5, ties: 13 }),
  lesson('all-ties', { shown: 20, wins: 0, losses: 0, ties: 20 }),
])
assert.equal(got.procedures, 4)
assert.equal(got.shown, 79)
assert.equal(got.wins, 26)
assert.equal(got.losses, 8)
assert.equal(got.ties, 45)
// 20 showings with 15 wins keeps; 19 showings is still insufficient;
// 2W/5L drops; 0W/0L under the floor is a drop, not a keep.
assert.equal(got.keep, 1)
assert.equal(got.drop, 2)
assert.equal(got.insufficient, 1)
assert.equal(got.verdict, 'keep')
assert.equal(TRIAL_FLOOR, 20)

const legacy = summarizeTrials([
  { id: 'legacy', kind: 'procedure' },
  lesson('strings', { shown: '4', wins: '1', losses: 0, ties: '3' }),
])
assert.equal(legacy.procedures, 2)
assert.equal(legacy.shown, 4)
assert.equal(legacy.wins, 1)
assert.equal(legacy.ties, 3)
assert.equal(legacy.verdict, 'insufficient')

const tools = readFileSync(join(process.cwd(), 'src', 'tools', 'index.js'), 'utf8')
assert.match(tools, /summarizeTrials/, 'rsi_status must render the shared trial summary')
assert.doesNotMatch(
  tools,
  /trial\.shown\s*\+=/,
  'the ad-hoc counter in rsi_status must be replaced, not kept beside the helper',
)
console.log('ok - trial summary counts ties, verdicts, and is wired into rsi_status')
