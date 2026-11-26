// A comparison nobody can see is a comparison nobody corrects.
//
// `compareResearchArms` was wired into `rsi_status`'s per-campaign payload and
// into the panel, but the campaign's own `rsi_status` call went through a
// different code path that built its object without the trial. The result was a
// campaign whose four rounds had arms on every event, and a status read that
// said nothing at all about them.
//
// These checks pin the two halves that make the number reachable: the compact
// view keeps a `researchTrial` that was handed to it, and the campaign status
// object is built with the comparison rather than without it.

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { compactStatus } from '../../src/tools/index.js'
import { assignArm, compareResearchArms } from '../../src/loop/research-trial.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ok = (name) => console.log(`ok ${name}`)

function trialRounds(n, { campaign = 'c1' } = {}) {
  const rounds = []
  for (let i = 1; i <= n; i += 1) {
    const arm = assignArm({ campaign, round: i })
    rounds.push({ n: i, status: 'promoted', promoted: true, score: 1, researchTrial: { arm, seed: 'research-trial' }, costUsd: 0.01 })
  }
  return rounds
}

test('the compact view keeps the trial it was handed', () => {
  const rounds = trialRounds(6)
  const status = {
    id: 'c1',
    status: 'running',
    rounds: rounds.length,
    lastRound: rounds.at(-1),
    researchTrial: compareResearchArms({ rounds }),
  }
  const compact = compactStatus(status, {})
  assert.ok(compact.researchTrial, 'the compact view dropped the comparison')
  assert.equal(compact.researchTrial.n, 6)
  assert.ok(compact.researchTrial.arms.full && compact.researchTrial.arms.off)
  assert.equal(typeof compact.researchTrial.sentence, 'string')
  ok('the compact view keeps the trial it was handed')
})

test('a campaign with no assigned rounds does not grow a trial field', () => {
  const status = { id: 'c1', status: 'running', rounds: 2, lastRound: { n: 2 } }
  const compact = compactStatus(status, {})
  assert.equal(compact.researchTrial, undefined, 'a trial that has not started must not be reported as one that has')
  ok('a campaign with no assigned rounds does not grow a trial field')
})

test('the campaign status is built with the comparison, not around it', () => {
  const src = readFileSync(join(HERE, '..', '..', 'src', 'tools', 'index.js'), 'utf8')
  // The single-campaign path is the one a person reads with `rsi_status(id)`.
  const single = src.slice(src.indexOf('const view = runtime.status(id)'))
  assert.match(
    single,
    /const researchTrial = compareResearchArms\(\{ rounds: state\?\.rounds/,
    'the single-campaign status does not compute the trial over the campaign rounds',
  )
  assert.match(single, /researchTrial\.n \? \{ researchTrial \}/, 'the comparison is computed but never put on the status')
  ok('the campaign status is built with the comparison, not around it')
})
