// `nodeBand` has been in the panel since loom-bal1, and a spec has been checking
// its arithmetic ever since - but nothing ever drew it. Same trap as the other
// three: a helper with a test attached that no render path calls.
//
// So this spec renders the campaign card for real (through the same lazy-CJS
// bundle the sidebar loads) and requires the band to be on it:
//   - one segment per node whose duration was measured,
//   - widths that still add up to 100%,
//   - nodes with no measurement counted in the label but given no width,
//   - nothing at all when no node was measured (an empty bar is a lie).
import assert from 'node:assert/strict'

import { fakeReact, loadPanel } from './harness.mjs'

const panel = await loadPanel()
const CampaignCard = panel.Card(fakeReact)

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const collect = (node, out) => {
  if (!node || typeof node !== 'object') return out
  if (Array.isArray(node)) {
    for (const child of node) collect(child, out)
    return out
  }
  out.push(node)
  for (const child of node.children || []) collect(child, out)
  return out
}

const render = (nodes) =>
  collect(
    CampaignCard({
      c: {
        id: 'loom-band',
        status: 'running',
        objective: '让运行构成可见',
        rounds: 3,
        budget: { usd: 1, rounds: 12, spentUsd: 0.1, roundsUsed: 3, minutes: 240 },
        triangle: { measured: true, secondsPerRound: 100, parallelFactor: 1.5, verifierShare: 0.1, tokens: 1000, usd: 0.1, usdPerPromotion: 0.1 },
        trend: [{ n: 3, status: 'promoted', score: 1 }],
        quality: { rounds: 3, promotions: 2, verdict: 'healthy' },
        ageMs: 60_000,
        nodes,
      },
      live: [],
      busy: null,
      act: () => {},
      onToggle: () => {},
      folded: false,
      confirming: null,
      setConfirming: () => {},
    }),
    [],
  )

const bandOf = (nodes) => {
  const all = render(nodes)
  return all.find((el) => String((el.props && el.props.className) || '').includes('loom-band'))
}

const segments = (band) =>
  (band.children || [])
    .flat(9)
    .filter((el) => el && typeof el === 'object' && String((el.props && el.props.className) || '').includes('loom-band-seg'))

const widthOf = (seg) => {
  const style = String((seg.props && seg.props.style) || '')
  const match = style.match(/width\s*:\s*([\d.]+)%/)
  return match ? Number(match[1]) : null
}

// Three measured nodes: the band exists, one segment each, widths add up to 100.
{
  const band = bandOf([
    { id: 'plan', durationMs: 200_000 },
    { id: 'worker', durationMs: 100_000 },
    { id: 'verify', durationMs: 5_000 },
  ])
  assert.ok(band, 'a card with measured nodes draws a band')
  const segs = segments(band)
  assert.equal(segs.length, 3, 'one segment per measured node')
  const widths = segs.map(widthOf)
  assert.ok(widths.every((w) => Number.isFinite(w) && w > 0), `every segment has a width: ${widths}`)
  assert.equal(widths.reduce((a, b) => a + b, 0), 100, 'the segments still fill the track exactly')
  assert.ok(String(band.props['aria-label'] || band.props.title || '').includes('节点'), 'the band says what it is, in Chinese')
  ok('a campaign with measured nodes draws one segment per node')
}

// Unmeasured nodes must not be given width, and must be counted out loud.
{
  const band = bandOf([
    { id: 'plan', durationMs: 90_000 },
    { id: 'lost', durationMs: null },
    { id: 'verify', durationMs: 10_000 },
  ])
  assert.ok(band, 'a partially measured campaign still draws a band')
  assert.equal(segments(band).length, 2, 'unknown nodes get no width')
  const label = String(band.props['aria-label'] || band.props.title || '')
  assert.ok(/[1-9]/.test(label), `the label counts the unknown ones: ${label}`)
  ok('nodes nobody measured are counted, never drawn as zero')
}

// No measurement at all: no element, because an empty bar claims "no time spent".
{
  const band = bandOf([{ id: 'plan', durationMs: null }])
  assert.equal(band, undefined, 'nothing measured means no band at all')
  ok('an unmeasured campaign draws no band')
}

console.log(`\n${pass}/${pass} passed`)
