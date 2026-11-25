import test from 'node:test'
import assert from 'node:assert/strict'
import { buildWorkerBrief } from '../../src/dispatch/brief.js'

// `used` is measured by whether the worker's report quotes a span or names the
// source it read. Measured 2026-11-26: eighteen rounds carried a research
// record and `used: true` never appeared once. The notes were in the brief and
// the measure was in the round, but nothing ever asked the worker to say. A
// measure nobody was told about reads as "reading never helps", which is the
// one conclusion that would shut the leg down for the wrong reason.

const NOTE = {
  text: 'the cheap stage ranks like the verifier on this corpus, so the screen is a discount rather than a proxy',
  url: 'https://arxiv.org/abs/2606.08106',
  title: 'PACE',
}

function brief(props = {}) {
  return buildWorkerBrief({
    task: { id: 't1', prompt: 'raise the rate' },
    chain: { name: 'code-fix', version: 1 },
    state: { id: 'c1', budget: { usd: 1, rounds: 3 } },
    attemptId: 'r1a1',
    index: 1,
    total: 1,
    research: [NOTE],
    ...props,
  })
}

test('when notes are given, the worker is told that saying which one mattered is part of the report', () => {
  const text = brief()
  assert.match(text, /Research notes/)
  // The instruction has to live with the notes, not in general advice: a reader
  // scrolling past the section should see it attached to the thing it is about.
  const from = text.indexOf('Research notes')
  const after = text.indexOf('\n## ', from + 1)
  const section = after === -1 ? text.slice(from) : text.slice(from, after)
  assert.match(
    section,
    /(quote|cite|name)/i,
    'the notes are handed over without asking the worker to say whether any of it mattered, so `used` can only ever be false',
  )
  assert.match(
    section,
    /evidence/i,
    'the report key that carries citations is `evidence`; the instruction has to name it or the worker has nowhere to put the answer',
  )
  assert.match(section, /not instructions/i, 'the notes are still data, and the ask must not turn them into orders')
})

test('a round with no notes is not given homework about notes', () => {
  const text = brief({ research: [] })
  assert.doesNotMatch(text, /Research notes/)
  assert.doesNotMatch(text, /quote the note/i)
})
