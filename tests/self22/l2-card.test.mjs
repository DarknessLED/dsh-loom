// L2 autonomy, part 2: the card itself.
//
// `buildProposalCard` must carry the four things a person needs to approve a
// chain change without opening the ledger: what was measured on the current
// chain (rounds, spend), what the change is expected to buy (prediction with
// interval), what happens if it regresses, and the exact spec diff.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildProposalCard, renderCard } from '../../src/chain/evidence-card.js'
import { diffSpec, renderDiff } from '../../src/chain/spec-diff.js'
import { mutateChain } from '../../src/chain/mutate.js'

const activeSpec = {
  name: 'l2-spec',
  version: 1,
  params: { candidates: 1 },
  nodes: [
    { id: 'attempts', type: 'map', over: 'candidates', of: { id: 'work', type: 'agent', role: 'worker', prompt: 'WORKER: fix it' } },
    { id: 'verify', type: 'verifier', cmd: 'exit 1' },
  ],
}

test('the diff names the changed knob exactly', () => {
  const next = mutateChain(activeSpec, { kind: 'candidates+1', version: 2 })
  const changes = diffSpec(activeSpec, next.spec)
  assert.ok(changes.some((c) => c.path === 'spec.params.candidates' && c.from === 1 && c.to === 2), JSON.stringify(changes))
  const lines = renderDiff(changes)
  assert.ok(lines.some((l) => l.includes('candidates') && l.includes('1') && l.includes('2')), lines.join('\n'))
})

test('a prompt-only change is shown as appended text, not a whole rewritten prompt', () => {
  const next = mutateChain(activeSpec, { kind: 'minimal-change', version: 2 })
  const changes = diffSpec(activeSpec, next.spec)
  const appended = changes.find((c) => c.op === 'append')
  assert.ok(appended, JSON.stringify(changes))
  assert.match(appended.path, /prompt/)
  assert.match(appended.text, /root cause/i)
  assert.ok(!changes.some((c) => c.op === 'set' && typeof c.to === 'string' && c.to.length > 400), 'no wall of prompt text')
})

test('the card carries rounds, spend, prediction, risk and diff', () => {
  const rounds = [
    { n: 1, taskId: 't', chainVersion: 1, status: 'no-gain', promoted: false, score: 0, costUsd: 0.02 },
    { n: 2, taskId: 't', chainVersion: 1, status: 'no-gain', promoted: false, score: 0, costUsd: 0.03 },
    { n: 3, taskId: 't', chainVersion: 1, status: 'no-gain', promoted: false, score: 0, costUsd: 0.01 },
  ]
  const proposal = mutateChain(activeSpec, { kind: 'candidates+1', version: 2 })
  const card = buildProposalCard({ active: { version: 1, spec: activeSpec }, proposals: [{ ...proposal, status: 'fresh' }], rounds, config: { checkpoint: { window: 3 } } })
  assert.equal(card.activeVersion, 1)
  assert.equal(card.rounds.onChain, 3)
  assert.equal(card.rounds.measured, 3)
  assert.equal(card.rounds.promotions, 0)
  assert.equal(Math.round(card.spendUsd * 100) / 100, 0.06)
  const item = card.proposals[0]
  assert.equal(item.version, 2)
  assert.ok(Number.isFinite(item.prediction.point))
  assert.ok(item.prediction.low <= item.prediction.point && item.prediction.point <= item.prediction.high)
  assert.ok(['low', 'medium', 'high'].includes(item.risk.level))
  assert.ok(item.risk.reasons.length >= 1)
  assert.ok(item.diff.length >= 1)
  assert.ok(item.diffLines.length >= 1)
  assert.equal(card.recommendedVersion, 2)
  assert.ok(Array.isArray(card.missing))
  const lines = renderCard(card)
  assert.ok(lines.some((l) => /predicted/i.test(l)), lines.join('\n'))
  assert.ok(lines.some((l) => /risk/i.test(l)), lines.join('\n'))
})
