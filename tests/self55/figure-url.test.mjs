// Every figure URL in the library was a 404.
//
// arXiv writes `src="2402.03300v3/figures/Math.png"` — relative to the paper's
// versioned HTML directory, not to `/html/<id>`. Joining the base and the path
// gave `https://arxiv.org/html/2402.03300/2402.03300v3/figures/Math.png`, which
// every one of the 101 figures in the nine libraries resolved to, and which
// arXiv answers with 404. A panel that shows a broken image is indistinguishable
// from a paper that drew no figure, which is the one thing this field exists to
// tell apart — so the URL is pinned here rather than trusted.
//
// The three verified shapes:
//   https://arxiv.org/html/2402.03300v3/figures/Math.png          -> 200 png
//   https://arxiv.org/html/2210.10760v1/figs/goodharting_4.png    -> 200 png
//   https://arxiv.org/html/2306.05685v4/intro_fed.svg             -> 200 svg
//   https://arxiv.org/html/2402.03300/2402.03300v3/...            -> 404
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { figureUrl } from '../../src/research/workrecord.js'

test('a versioned relative src replaces the id in the base', () => {
  assert.equal(
    figureUrl('https://arxiv.org/html/2402.03300', '2402.03300v3/figures/Math.png'),
    'https://arxiv.org/html/2402.03300v3/figures/Math.png',
  )
  assert.equal(
    figureUrl('https://arxiv.org/html/2210.10760', '2210.10760v1/figs/goodharting.drawio_4.png'),
    'https://arxiv.org/html/2210.10760v1/figs/goodharting.drawio_4.png',
  )
  assert.equal(
    figureUrl('https://arxiv.org/html/2306.05685/', '2306.05685v4/intro_fed.svg'),
    'https://arxiv.org/html/2306.05685v4/intro_fed.svg',
  )
})

test('a base that already names a version does not get a second one', () => {
  assert.equal(
    figureUrl('https://arxiv.org/html/2402.03300v3', '2402.03300v3/figures/Math.png'),
    'https://arxiv.org/html/2402.03300v3/figures/Math.png',
  )
  assert.equal(
    figureUrl('https://arxiv.org/html/2402.03300v1/', '2402.03300v3/figures/Math.png'),
    'https://arxiv.org/html/2402.03300v3/figures/Math.png',
  )
})

test('an unversioned src still resolves, and an absolute one is kept', () => {
  assert.equal(
    figureUrl('https://arxiv.org/html/2601.00001', 'figures/pipeline.png'),
    'https://arxiv.org/html/2601.00001/figures/pipeline.png',
  )
  assert.equal(figureUrl('https://arxiv.org/html/2601.00001', 'https://cdn.example/y.png'), 'https://cdn.example/y.png')
})

test('a base that is not an arXiv html directory concatenates rather than guessing', () => {
  assert.equal(figureUrl('https://example.org/papers/1', '2601.00001v1/a.png'), 'https://example.org/papers/1/2601.00001v1/a.png')
})

test('no base and no src are null, not a broken path', () => {
  assert.equal(figureUrl('', 'a.png'), null)
  assert.equal(figureUrl('https://arxiv.org/html/2601.00001', ''), null)
  assert.equal(figureUrl(null, null), null)
})
