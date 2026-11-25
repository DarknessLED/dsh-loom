import test from 'node:test'
import assert from 'node:assert/strict'
import { selectFetchTargets } from '../../src/research/fetch.js'

// Measured 2026-11-26 over every campaign that bought a read: nine rounds ended
// with a fetch gap, and the recurring shape was a PDF link. The host fetches
// through a text pipeline that answers `/pdf/` with 404, so a PDF is a slot
// spent on a page that cannot be read — and on `fetchTop: 2` that is half the
// round's reading. Four of those nine rounds read nothing at all, which leaves
// the worker with no span to cite and `used` with nothing to measure.

function source(url, score) {
  return { url, domain: new URL(url).host, score }
}

test('a readable page outranks a PDF when the budget cannot take both', () => {
  const sources = [
    source('https://export.arxiv.org/pdf/2607.19442', 40),
    source('https://arxiv.org/abs/2607.19442', 39),
  ]
  const picked = selectFetchTargets(sources, { fetchTop: 1, maxPerHost: 2 })
  assert.deepEqual(
    picked.map((s) => s.url),
    ['https://arxiv.org/abs/2607.19442'],
    'the abstract page is the readable copy of the same paper; spending the only slot on the PDF reads nothing',
  )
})

test('a PDF is still fetched when it is all there is', () => {
  const sources = [source('https://example.test/paper.pdf', 10)]
  const picked = selectFetchTargets(sources, { fetchTop: 1, maxPerHost: 2 })
  assert.deepEqual(picked.map((s) => s.url), ['https://example.test/paper.pdf'], 'a PDF is worse than a page, not worthless')
})

test('ranking by readability does not reorder pages of equal standing', () => {
  const sources = [
    source('https://a.test/one', 30),
    source('https://b.test/two', 29),
    source('https://c.test/three', 28),
  ]
  const picked = selectFetchTargets(sources, { fetchTop: 2, maxPerHost: 2 })
  assert.deepEqual(
    picked.map((s) => s.url),
    ['https://a.test/one', 'https://b.test/two'],
    'search order is the only ranking signal available; a tie-break must not invent one',
  )
})

test('the per-host cap still holds after the PDF is set aside', () => {
  const sources = [
    source('https://export.arxiv.org/pdf/2607.19442', 40),
    source('https://export.arxiv.org/pdf/2607.19443', 39),
    source('https://export.arxiv.org/pdf/2607.19444', 38),
    source('https://other.test/page', 10),
  ]
  const picked = selectFetchTargets(sources, { fetchTop: 3, maxPerHost: 2 })
  assert.equal(picked.length, 3)
  assert.ok(
    picked.filter((s) => s.domain === 'export.arxiv.org').length <= 2,
    'setting PDFs aside must not turn into reading three of them from one host',
  )
})
