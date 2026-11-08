// Chips say "规划 4分1秒"; five of them still make the reader do arithmetic to
// see where the round went. research/ui-refs-2026-11.md (P1) points at the
// products that answer this with a single band: Grafana strips, GitHub's job bar,
// Airflow's per-task cells. Same information, one glance, 8 pixels.
//
// The band must add up: a bar whose parts sum to 99% or 101% is a lie at the
// width where it is read.
import assert from 'node:assert/strict'

import { loadPanel } from '../ui/harness.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const panel = await loadPanel()
const band = panel.nodeBand

// 1. Three parts, one width: the largest-remainder split keeps the total at 100.
{
  const b = band({ nodes: [{ id: 'recon', role: 'planner', round: 1, durationMs: 300 }, { id: 'r1a1', role: 'worker', round: 1, durationMs: 100 }] })
  assert.equal(b.segments.length, 2)
  assert.deepEqual(b.segments.map((s) => s.pct), [75, 25])
  assert.equal(
    b.segments.reduce((sum, s) => sum + s.pct, 0),
    100,
    'the band is a whole: parts sum to exactly 100',
  )
  assert.equal(b.segments[0].key, 'recon')
  ok('a two-part band splits 75/25 and sums to 100')
}

// 2. Thirds must not drift: 1/3 + 1/3 + 1/3 has to be 34/33/33 in some order, not
//    33/33/33 (99) and not 34/34/34 (102).
{
  const b = band({ nodes: [1, 2, 3].map((i) => ({ id: `n${i}`, role: 'worker', round: 1, durationMs: 100 })) })
  assert.equal(b.segments.reduce((sum, s) => sum + s.pct, 0), 100)
  const pcts = b.segments.map((s) => s.pct).sort((x, y) => y - x)
  assert.deepEqual(pcts, [34, 33, 33])
  ok('thirds are 34/33/33, never 99 or 102')
}

// 3. A node without a duration is not zero seconds: it is unknown, and it must not
//    steal width from the measured ones.
{
  const b = band({ nodes: [{ id: 'a', round: 1, durationMs: 100 }, { id: 'b', round: 1 }] })
  assert.equal(b.segments.length, 1, 'only measured nodes get width')
  assert.equal(b.segments[0].pct, 100)
  assert.equal(b.unknown, 1, 'the unmeasured node is counted, not drawn as zero')
  ok('an unmeasured node is unknown, not zero-width')
}

// 4. Nothing to draw is null, so the caller can omit the element instead of
//    rendering an empty 8px bar.
{
  assert.equal(band({}), null)
  assert.equal(band({ nodes: [] }), null)
  assert.equal(band({ nodes: [{ id: 'a', round: 1, durationMs: 0 }] }), null)
  ok('no measurable node yields null, not an empty bar')
}

console.log(`\n${pass}/${pass} passed`)
