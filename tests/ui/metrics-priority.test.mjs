// At 320-360px the metrics strip is 38px of six cells, five of which answer a
// question nobody asked at that width. research/ui-refs-2026-11.md (P2) found the
// same rule in Vercel and GitHub: at narrow widths the headline number survives
// and the rest collapses - not "smaller text", but fewer cells, decided in code.
//
// The decision must be a property of the payload (which keys matter), not a CSS
// trick, so a test can hold it.
import assert from 'node:assert/strict'

import { loadPanel } from '../ui/harness.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const panel = await loadPanel()
const metrics = panel.metrics

const data = {
  rsi: { enabled: true },
  campaigns: [
    { id: 'a', status: 'running', budget: { spentUsd: 0.2 }, open: 2, lessons: 3 },
    { id: 'b', status: 'done', budget: { spentUsd: 0.1 }, open: 0, lessons: 1 },
  ],
  live: [{ campaign: 'a' }],
  lessons: [{ id: 'l1' }],
}

// 1. The strip still reports all six numbers; it now says which three carry the
//    answer when there is no room.
{
  const cells = metrics(data)
  assert.equal(cells.length, 6)
  assert.deepEqual(
    cells.map((c) => c.key),
    ['campaigns', 'running', 'rounds', 'pending', 'spend', 'lessons'],
    'the order is stable: a strip that reshuffles is a strip nobody learns',
  )
  const primary = cells.filter((c) => c.primary).map((c) => c.key)
  assert.deepEqual(primary, ['running', 'pending', 'spend'], 'the three that survive a narrow sidebar are named in data')
  ok('the strip names the three cells that survive a narrow sidebar')
}

// 2. Zero demand does not promote a cell: a campaign set with nothing pending must
//    not devote width to "0 waiting".
{
  const quiet = metrics({ campaigns: [{ id: 'a', status: 'done', budget: { spentUsd: 0 }, open: 0 }], live: [], lessons: [] })
  const pending = quiet.find((c) => c.key === 'pending')
  assert.equal(pending.primary, false, 'nothing waiting means the badge is not a headline')
  ok('an empty queue is not a headline number')
}

// 3. The payload is honest about what it does not know: no campaigns, no crash.
{
  const empty = metrics({})
  assert.equal(empty.length, 6)
  assert.equal(empty.every((c) => typeof c.label === 'string' && c.label.length > 0), true, 'every cell still has a Chinese label')
  ok('no campaigns is still six labelled cells, not a crash')
}

console.log(`\n${pass}/${pass} passed`)
