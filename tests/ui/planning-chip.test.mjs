// The triangle's chips name speed, parallelism, the verifier, tokens and the
// price of a promotion — everything except the leg that is most often the
// largest: planning. `campaignTriangle` now reports `planning` (see
// tests/balance/planning-accounting.test.mjs), but a number nobody renders is a
// number nobody acts on, which is how this panel has already shipped three
// "spec exists, screen does not" gaps.
//
// Required: `triangleChips(c)` grows a planning chip.
//   - present only when `c.triangle.planning.rounds > 0` (a chain with no
//     planner, or a campaign that never measured one, gets no chip rather than
//     a fake 0%);
//   - key is 'planning';
//   - when `planShare` is a finite number the label names planning as a share of
//     wall time, e.g. "规划 31%";
//   - when `timedOut > 0` the label also says how many rounds hit the bound,
//     e.g. "规划 31% · 超时 3";
//   - the title explains what the percentage is a share of and what a timeout
//     means, in Chinese, without inventing a verdict about the planner.
import assert from 'node:assert/strict'

import { loadPanel } from '../ui/harness.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const panel = await loadPanel()
const chips = (c) => panel.triangleChips(c)
const find = (list, key) => list.find((chip) => chip.key === key)

const base = (planning) => ({
  id: 'p',
  triangle: {
    measured: true,
    secondsPerRound: 620,
    parallelFactor: 1.5,
    verifierShare: 0.01,
    tokens: 2600,
    usdPerPromotion: 0.0009,
    usd: 0.004,
    promotionRate: 0.6,
    tokensPerRound: 2400,
    timedRounds: 5,
    rounds: 5,
    ...(planning === undefined ? {} : { planning }),
  },
})

{
  const list = chips(base())
  assert.equal(find(list, 'planning'), undefined, 'no planning measurement: no planning chip')
}
ok('an unmeasured planner does not get a chip')

{
  const list = chips(base({ rounds: 4, timedOut: 0, timedOutRate: 0, ms: 400000, meanMs: 100000 }))
  const chip = find(list, 'planning')
  assert.ok(chip, 'a measured planner gets a chip')
  assert.match(chip.label, /规划/, 'the label names planning')
}
ok('a measured planner is rendered')

{
  const list = chips(base({ rounds: 4, timedOut: 3, timedOutRate: 0.75, ms: 960000, meanMs: 240000 }))
  const chip = find(list, 'planning')
  assert.match(chip.label, /超时\s*3/, 'the label says how many rounds hit the bound')
  assert.match(String(chip.title), /规划/, 'the title explains the number in Chinese')
  assert.equal(typeof chip.key, 'string', 'the chip keys stay strings for the renderer')
}
ok('timeouts are stated instead of hidden')

{
  const list = chips(base({ rounds: 2, timedOut: 0, timedOutRate: 0, ms: 0, meanMs: 0 }))
  const chip = find(list, 'planning')
  assert.ok(chip, 'a planner that measured zero ms still rendered')
  assert.ok(!/NaN|undefined|Infinity/.test(chip.label), `the label never leaks a broken number (${chip.label})`)
}
ok('a zero-cost planner does not print a broken number')

console.log(`\n${pass}/${pass} passed`)
