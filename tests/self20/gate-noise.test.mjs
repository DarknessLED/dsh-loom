// Wave 20 / p3: the gate stops guessing.
//
// Two numbers never met. The loop measured its own repeatability at spreadMax
// 0.100 / pooled sd 0.029, and it promotes at minGain 0.05 -- half of its own
// noise. `noiseSpread` exists in the policy and defaults to null, so the bar in
// production is still the coin flip the measurement was meant to replace.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_CONFIG } from '../../src/core/config.js'
import { decidePromotion } from '../../src/gate/gate.js'

const base = {
  config: { minGain: 0.05, minTasks: 6, holdoutSlack: 0.02 },
}

test('the measured noise is the install default, not an opt-in', () => {
  assert.equal(DEFAULT_CONFIG.loopPolicy.noiseSpread, 0.1)
})

test('a gain inside the measured noise does not promote', () => {
  const out = decidePromotion({
    ...base,
    candidate: 0.86,
    incumbent: 0.8,
    evidence: { complete: true, tasks: 22, holdout: 'ok', noiseSpread: 0.1 },
    policy: { minGain: 0.05, noiseSpread: 0.1 },
    delta: 0.06,
  })
  assert.equal(out.promote, false)
  assert.match(out.reason, /within measured noise/)
})

test('a gain above the noise promotes on the ordinary bar', () => {
  const out = decidePromotion({
    ...base,
    candidate: 0.92,
    incumbent: 0.8,
    evidence: { complete: true, tasks: 22, holdout: 'ok', noiseSpread: 0.1 },
    policy: { minGain: 0.05, noiseSpread: 0.1 },
    delta: 0.12,
  })
  assert.equal(out.promote, true)
})

test('an unmeasured campaign keeps the legacy comparison', () => {
  const out = decidePromotion({
    ...base,
    candidate: 0.86,
    incumbent: 0.8,
    evidence: { complete: true, tasks: 22, holdout: 'ok' },
    policy: { minGain: 0.05 },
    delta: 0.06,
  })
  assert.equal(out.promote, true, 'no measurement means no error bar, and the old rule stands')
})
