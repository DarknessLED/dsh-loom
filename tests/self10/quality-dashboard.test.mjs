/**
 * Spec: the two human-facing surfaces must show the same verdict.
 *
 * `rsi_report` answers "where did this end up", the panel answers "is it stuck
 * right now". Both should read the campaign's health from one place, so a human
 * never sees "healthy" in the report and "stalled" in the sidebar for the same
 * campaign at the same moment.
 */
import assert from 'node:assert/strict'

let passed = 0
let failed = 0
function test(name, fn) {
  try {
    fn()
    passed++
    console.log(`ok ${passed + failed} - ${name}`)
  } catch (err) {
    failed++
    console.log(`not ok ${passed + failed} - ${name}`)
    console.log(`  ${String(err?.message ?? err).split('\n').join('\n  ')}`)
  }
}

const { panelState } = await import('../../src/panel/api.js')

function staleState() {
  return {
    id: 'c',
    status: 'running',
    objective: 'demo',
    workspace: '/tmp/demo',
    rounds: [
      { n: 1, status: 'no-gain', promoted: false, ms: 1000 },
      { n: 2, status: 'no-gain', promoted: false, ms: 1000 },
      { n: 3, status: 'no-gain', promoted: false, ms: 1000 },
    ],
    checkpoints: [],
    lessons: [],
    budget: { usd: 1, spentUsd: 0 },
    evalset: { tasks: [{ id: 't1' }], holdout: [] },
  }
}

function runtimeFor(state) {
  const view = { id: state.id, state }
  return {
    listCampaigns: () => [state.id],
    get: () => view,
    ensureOwner: () => true,
    ownership: () => ({ owner: null, mine: true }),
    liveAttempts: () => [],
  }
}

test('the panel row carries the quality verdict', () => {
  const state = staleState()
  const out = panelState({ runtime: runtimeFor(state) })
  const row = out.campaigns[0]
  assert.ok(row.quality, 'each row must carry a quality block')
  assert.equal(row.quality.verdict, 'stalled')
  assert.equal(row.quality.rounds, 3)
  assert.equal(row.quality.promotionRate, 0)
})

test('a campaign that promoted recently reads healthy', () => {
  const state = staleState()
  state.rounds.push({ n: 4, status: 'promoted', promoted: true, ms: 1000 })
  const row = panelState({ runtime: runtimeFor(state) }).campaigns[0]
  assert.equal(row.quality.verdict, 'healthy')
  assert.equal(row.quality.promotionRate, 0.25)
})

console.log(`\n${passed}/${passed + failed} passed`)
if (failed > 0) process.exitCode = 1
