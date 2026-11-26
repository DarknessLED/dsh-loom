// Five probe campaigns in a row scored 100% in both arms, because every task was
// solvable without help. That is the ceiling problem: the trial cannot answer
// "does reading help" when the endpoint is the maximum either way.
//
// This spec pins the ranking rules that make the *library* usable for a question
// whose answer is not phrased like the record. It is the module half; the probe
// campaign (`trial-lib`) is the live half.
//
//   node tests/self57/a-question-can-be-found-by-its-numbers.test.mjs
import assert from 'node:assert/strict'

import { searchLocal, fetchLocal } from '../../src/research/local-index.js'

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

// The two records that made the ranking fail in the first place: a technical
// report that mentions "model", "performance" and "evaluation" everywhere, and
// the paper the question is actually about.
const REPORT = {
  id: '2507.06261',
  slug: 'r7-selfmod',
  title: 'Gemini 2.5 Technical Report',
  year: 2025,
  abstract:
    'In this report we introduce the Gemini model family, with performance and evaluation results across many benchmarks, model sizes and evaluation suites. The model performance on evaluation is reported for every model.',
  mechanisms: [],
}
const PAPER = {
  id: '2402.14992',
  slug: 'r10-eval-budget',
  title: 'tinyBenchmarks: evaluating LLMs with fewer examples',
  year: 2024,
  abstract:
    'We show that to accurately estimate the performance of an LLM on MMLU, a benchmark of 14K examples, it is sufficient to evaluate it on 100 curated examples.',
  mechanisms: [],
}

const LIB = [REPORT, PAPER]

ok('a number in the question is a term, not punctuation', () => {
  const hits = searchLocal(LIB, 'which paper estimates MMLU with only 100 curated examples', { maxResults: 2 })
  assert.equal(hits[0].url, 'work:r10-eval-budget/2402.14992', `ranked ${JSON.stringify(hits.map((h) => h.url))}`)
})

ok('a report that says "model performance" everywhere does not outrank the paper', () => {
  const hits = searchLocal(LIB, 'which paper reports the model performance estimate on 14K examples', { maxResults: 2 })
  assert.equal(hits[0].url, 'work:r10-eval-budget/2402.14992', 'the record that names 14K wins over the one that says "model"')
})

ok('the function words of a question are not evidence', () => {
  // Without the stopword list every record matches "which paper reports that",
  // and overlap becomes a measure of how long the abstract is.
  const hits = searchLocal(LIB, 'which paper reports that the model has performance', { maxResults: 2 })
  assert.ok(hits.length >= 1)
  for (const hit of hits) assert.ok(!hit.snippet.includes('which paper reports that'))
})

ok('a word in every record cannot outvote a word in one', () => {
  const many = Array.from({ length: 9 }, (_, i) => ({
    id: `0000.0000${i}`,
    slug: 'filler',
    title: `Filler ${i}`,
    year: 2020,
    abstract: 'model performance evaluation benchmark results are reported for the model.',
    mechanisms: [],
  }))
  const lib = [...many, PAPER]
  const hits = searchLocal(lib, 'curated examples estimate MMLU', { maxResults: 2 })
  assert.equal(hits[0].url, 'work:r10-eval-budget/2402.14992', 'the rare words decide, not the common ones')
})

ok('the page carries the identifier a reader needs to check the claim', () => {
  const page = fetchLocal(LIB, 'work:r10-eval-budget/2402.14992')
  assert.ok(page)
  assert.match(page.text, /arXiv:2402\.14992/, 'the id travels with the text so a quotation stays usable')
  assert.match(page.body.content, /arXiv:2402\.14992/, 'and it is in the body the pipeline reads')
})

ok('ranking is stable across runs', () => {
  const a = searchLocal(LIB, 'estimate MMLU curated examples', { maxResults: 3 })
  const b = searchLocal(LIB, 'estimate MMLU curated examples', { maxResults: 3 })
  assert.deepEqual(a.map((h) => h.url), b.map((h) => h.url))
  assert.deepEqual(a.map((h) => h.score), b.map((h) => h.score))
})

console.log(`# pass ${pass} fail ${fail}`)
process.exit(fail === 0 ? 0 : 1)
