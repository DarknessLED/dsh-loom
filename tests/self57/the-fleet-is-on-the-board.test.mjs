// `compareResearchFleet` is only worth having if the two surfaces a person
// actually looks at can show it: `rsi_dashboard`'s text and the panel's state.
// Without this the rollup exists and is called by nothing -- which is exactly
// what happened to `researchTrial` for four commits (`2b88f83`).
//
//   node tests/self57/the-fleet-is-on-the-board.test.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

let pass = 0
let fail = 0
function ok(name, fn) {
  try {
    fn()
    pass++
    console.log(`ok ${pass} - ${name}`)
  } catch (err) {
    fail++
    console.log(`not ok ${pass + fail} - ${name}`)
    console.log(`  ${String(err?.message ?? err).split('\n')[0]}`)
  }
}

const read = (rel) => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8')

ok('the dashboard computes the fleet and returns it', () => {
  const src = read('src/tools/index.js')
  assert.match(src, /compareResearchFleet\(/, 'the board must add the campaigns up')
  assert.match(src, /fleet,/, 'and return it, not only print it')
})

ok('the board prints the caveat with the number', () => {
  const src = read('src/tools/index.js')
  const at = src.indexOf('trial across campaigns')
  assert.ok(at > 0, 'the board needs a fleet line')
  const tail = src.slice(at, at + 600)
  assert.match(tail, /fleet\.caveat/, 'a pooled rate without its caveat is a result it does not have')
})

ok('the panel ships the fleet too', () => {
  const src = read('src/panel/api.js')
  assert.match(src, /fleet: compareResearchFleet\(/, 'the panel is where a person reads it')
})

ok('the panel does not pool the campaigns it could not read', () => {
  const src = read('src/panel/api.js')
  // `campaignRow` is called inside a try/catch: an unreadable campaign pushes an
  // `error` row. Its rounds must not be added to the pool, or a broken file
  // becomes a round of evidence.
  const block = src.slice(src.indexOf('fleetRounds.push'), src.indexOf('fleetRounds.push') + 400)
  const rowAt = src.indexOf('rows.push(campaignRow(')
  const pushAt = src.indexOf('fleetRounds.push')
  assert.ok(pushAt > rowAt, 'the rounds are collected only after the row parsed')
  assert.ok(block.length > 0)
})

console.log(`# pass ${pass} fail ${fail}`)
process.exit(fail === 0 ? 0 : 1)
