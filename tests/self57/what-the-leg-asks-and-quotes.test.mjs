// The leg itself: which question, what comes back, and what the brief says.
//
// Three things have to be true before a round can be said to have read
// anything:
//
//   1. the question came from somewhere the ledger can name (`from`), because a
//      question invented at dispatch time cannot be audited or closed;
//   2. the finding is a verbatim span of what was read, because a summary is
//      the one thing the loop cannot check later;
//   3. the brief says, in the same breath, that the span is data and not an
//      instruction, because a fetched page is untrusted text and a worker that
//      obeys it is a worker someone else is steering.
//
// This file pins those three and the shapes they travel in. The I/O call site
// is pinned by `the-round-reads-before-it-writes.test.mjs`, which runs a real
// round with an injected search/fetch pair.
//
//   node tests/self57/what-the-leg-asks-and-quotes.test.mjs
import assert from 'node:assert/strict'

import { findingsFrom, questionFor, researchSketch } from '../../src/runtime/research-leg.js'

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

// The prompt has to share vocabulary with the ledger question below, because
// 2026-11-26 made relevance a precondition: an off-topic ledger entry loses to
// the task. "pairs" and "power" are what this repo's own questions use.
const task = { id: 't1', prompt: 'Make the verifier pass by fixing impl.txt until the paired test has power at eight pairs.' }

ok('a stuck round asks about the failure, not about the task', () => {
  const q = questionFor({
    task,
    lastRound: { status: 'no-gain', stuckSignature: 'FAIL|expected 0.9 got 0.3' },
    openQuestions: [],
  })
  assert.equal(q.from, 'stuck')
  assert.match(q.question, /FAIL\|expected 0\.9 got 0\.3/, 'the signature is the most specific thing the loop knows')
})

ok('an open question in the ledger wins over the task text', () => {
  const q = questionFor({
    task,
    lastRound: null,
    openQuestions: [{ id: 'q-1', question: 'Does a paired test lose power at n=8?', status: 'open' }],
  })
  assert.equal(q.from, 'ledger')
  assert.equal(q.question, 'Does a paired test lose power at n=8?')
})

ok('with nothing else, the question is the task plus what failed', () => {
  const q = questionFor({ task, lastRound: null, openQuestions: [] })
  assert.equal(q.from, 'task')
  assert.ok(q.question.includes('impl.txt'), 'the task text is the only thing left; it must still be in the question')
})

ok('no task and no ledger means no question, not a blank one', () => {
  assert.equal(questionFor({ task: null, lastRound: null, openQuestions: [] }), null)
})

ok('a finding is the passage verbatim, with where it came from', () => {
  const result = {
    ok: true,
    evidence: [
      { url: 'https://arxiv.org/abs/2606.08106', title: 'PACE', passages: [{ text: 'the ubiquitous keep-it-if-the-score-went-up rule is uncontrolled' }] },
      { url: 'https://example.org/x', title: null, passages: [{ text: 'a second span' }] },
    ],
    gaps: ['one source was unreadable'],
  }
  const found = findingsFrom(result, { max: 4 })
  assert.equal(found.length, 2)
  assert.equal(found[0].text, 'the ubiquitous keep-it-if-the-score-went-up rule is uncontrolled')
  assert.equal(found[0].url, 'https://arxiv.org/abs/2606.08106')
  assert.equal(found[0].title, 'PACE')
  assert.equal(found[1].title, null, 'a missing title stays missing rather than being invented from the url')
})

ok('findings are clipped and capped so the brief stays a brief', () => {
  const long = 'x'.repeat(500)
  const result = {
    ok: true,
    evidence: [
      { url: 'u1', title: 't', passages: [{ text: long }] },
      { url: 'u2', title: 't', passages: [{ text: 'b' }] },
      { url: 'u3', title: 't', passages: [{ text: 'c' }] },
    ],
  }
  const found = findingsFrom(result, { max: 2 })
  assert.equal(found.length, 2)
  assert.ok(found[0].text.length <= 240, `clip to 240 chars, got ${found[0].text.length}`)
})

ok('a failed run yields no findings instead of throwing', () => {
  assert.deepEqual(findingsFrom({ ok: false, code: 'web-unavailable' }), [])
  assert.deepEqual(findingsFrom(null), [])
})

ok('the sketch is what the round records, and it counts rather than asserts', () => {
  const result = {
    ok: true,
    plan: { queries: [{ query: 'a' }, { query: 'b' }], limits: { depth: 'quick' } },
    sources: [{ url: 'u1', fetchStatus: 'ok' }, { url: 'u2', fetchStatus: 'failed' }],
    evidence: [{ url: 'u1', title: 't', passages: [{ text: 'span one' }, { text: 'span two' }] }],
    gaps: ['fetch failed for u2: HTTP 404', 'x'],
  }
  const sketch = researchSketch(result, { question: 'q', from: 'stuck', mode: 'auto', ms: 1234, costUsd: 0.002 })
  assert.equal(sketch.mode, 'auto')
  assert.equal(sketch.question, 'q')
  assert.equal(sketch.from, 'stuck')
  assert.equal(sketch.queries, 2)
  assert.equal(sketch.sources, 2)
  assert.equal(sketch.passages, 2)
  assert.equal(sketch.gaps.length, 2)
  assert.equal(sketch.ms, 1234)
  assert.equal(sketch.costUsd, 0.002)
})

ok('a skipped leg says why, and does not pretend it read', () => {
  const sketch = researchSketch({ ok: false, code: 'web-unavailable' }, { question: 'q', from: 'task', mode: 'auto', ms: 3 })
  assert.equal(sketch.skipped, 'web-unavailable')
  assert.equal(sketch.passages, 0)
  assert.equal(sketch.sources, 0)
})

console.log(`# pass ${pass} fail ${fail}`)
process.exit(fail === 0 ? 0 : 1)
