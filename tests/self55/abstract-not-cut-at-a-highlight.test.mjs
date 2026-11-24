// An abstract was cut at its first highlighted word.
//
// arXiv wraps every query hit inside the abstract in its own
// `<span class="search-hit">`, so a non-greedy `<span class="abstract-full">…
// </span>` match ends at the first hit, not at the end of the paragraph. In the
// ten survey files that produced 12–15 character abstracts for 2,070 of 2,090
// papers — `"Large language"`, `"Mathematical"`, `"Aligning large language
// models"` — and nothing failed, because the abstract was only ever printed,
// never asserted.
//
// It stopped being cosmetic when the library started classifying works: the
// cluster keywords are matched against `title + abstract`, so with a 14-character
// abstract every work fell through to `unclustered` and the shelf looked like a
// direction with no sub-questions at all.
//
// The two rules this pins: the body is read by balancing spans, and the collapse
// control at the end ("▽ Less") is chrome that must not be quoted.
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { parseSearchPage } from '../../scripts/research-survey.mjs'

const PAGE = `<html><body>
<li class="arxiv-result">
  <p class="list-title is-inline-block"><a href="https://arxiv.org/abs/2402.03300">arXiv:2402.03300</a></p>
  <p class="title is-5 mathjax">DeepSeekMath : Pushing the Limits of Mathematical Reasoning</p>
  <p class="authors"><a>Zhihong Shao</a>, <a>Peiyi Wang</a></p>
  <p class="is-size-7"><span class="has-text-black-bis has-text-weight-semibold">Submitted</span> 23 February, 2024; <span class="has-text-black-bis has-text-weight-semibold">originally announced</span> February 2024. </p>
  <span class="abstract-full has-text-grey-dark mathjax" id="2402.03300v3-abstract-full" style="display: inline;">
    Large language models have shown <span class="search-hit mathjax">test</span>-time reasoning
    <span class="search-hit mathjax">verifier</span> gains, and this sentence continues well past
    the first highlight so that a truncated read is visible.
    <a class="is-size-7" style="white-space: nowrap;">&#9661; Less</a>
  </span>
</li>
<li class="arxiv-result">
  <p class="list-title is-inline-block"><a href="https://arxiv.org/abs/2501.00001">arXiv:2501.00001</a></p>
  <p class="title is-5 mathjax">A paper with no highlight at all</p>
  <p class="authors"><a>Someone</a></p>
  <span class="abstract-full has-text-grey-dark mathjax" id="2501.00001v1-abstract-full" style="display: inline;">
    A plain abstract without any highlighted word inside it.
  </span>
</li>
</body></html>`

const [hit, plainRow] = parseSearchPage(PAGE)

test('a highlighted word does not end the abstract', () => {
  assert.ok(hit, 'the page parses')
  assert.ok(hit.abstract.length > 120, `the abstract keeps its body, got ${hit.abstract.length} chars: ${JSON.stringify(hit.abstract)}`)
  assert.match(hit.abstract, /continues well past/)
  assert.match(hit.abstract, /verifier/)
})

test('the collapse control is not quoted as text', () => {
  assert.doesNotMatch(hit.abstract, /Less|More$/)
  assert.doesNotMatch(hit.abstract, /▽/)
})

test('an abstract with no highlight is still read whole', () => {
  assert.equal(plainRow.abstract, 'A plain abstract without any highlighted word inside it.')
})

test('the id, title and date are unaffected by the body walk', () => {
  assert.equal(hit.id, '2402.03300')
  assert.match(hit.title, /DeepSeekMath/)
  assert.equal(hit.date, '2024-02-23')
})
