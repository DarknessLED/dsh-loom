// The panel prints money it does not know. `money(0)` renders "$0", and the
// spend metric sums that across every campaign, so a loop that has never priced
// a single token reports that it has cost nothing - the same lie the loop's own
// metrics script already refuses to tell ("$0.00 means unpriced, not free").
//
// Required: a campaign whose cost was never measured says so, in Chinese, and the
// strip only adds up campaigns that were actually priced.
//   - `costLabel(c)` -> '未定价' when `c.triangle` says unmeasured (usd == null);
//     `money(c.triangle.usd)` when measured; `money(c.budget.spentUsd)` when the
//     payload predates the triangle (so old campaigns keep their number).
//   - `metrics(data)`'s spend value is '未定价' when nothing was priced, and the
//     sum of the priced campaigns otherwise.
//   - `campaignMeta(c)` carries the same label, so a folded row cannot imply $0.
import assert from 'node:assert/strict'
import { loadPanel } from './harness.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const panel = await loadPanel()

const unpriced = { id: 'a', status: 'running', budget: { spentUsd: 0 }, triangle: { usd: null, measured: false, rounds: 2 } }
const priced = { id: 'b', status: 'done', budget: { spentUsd: 0.41 }, triangle: { usd: 0.41, measured: true, rounds: 3 } }
const legacy = { id: 'c', status: 'stopped', budget: { spentUsd: 0.02 } }

assert.equal(typeof panel.costLabel, 'function', 'costLabel is exported')
assert.equal(panel.costLabel(unpriced), '未定价', 'an unpriced campaign does not claim to be free')
assert.equal(panel.costLabel(priced), '$0.41', 'a priced campaign prints its number')
assert.equal(panel.costLabel(legacy), '$0.02', 'a payload without a triangle falls back to budget.spentUsd')
ok('a campaign says it is unpriced instead of claiming $0')

{
  const strip = panel.metrics({ campaigns: [unpriced] })
  const spend = strip.find((m) => m.key === 'spend')
  assert.ok(spend, 'the strip still has a spend cell')
  assert.equal(spend.value, '未定价', 'nothing was priced, so the strip says so')
}
ok('the spend strip is honest when nothing is priced')

{
  const strip = panel.metrics({ campaigns: [priced, unpriced] })
  const spend = Array.isArray(strip) ? strip.find((m) => m.key === 'spend') : strip.find((m) => m.key === 'spend')
  assert.equal(spend.value, '$0.41', 'only the priced campaign is added up')
}
ok('the spend strip sums only what was measured')

{
  const meta = panel.campaignMeta(unpriced)
  assert.ok(meta.includes('未定价'), 'a folded row carries the label too')
  assert.ok(!meta.includes('$0'), 'and never implies it was free')
}
ok('a campaign meta line cannot imply $0')

console.log(`\n${pass}/${pass} passed`)
