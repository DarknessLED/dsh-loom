// The plugin must never be the reason a request cannot be sent.
//
// A session hit "payload core text alone is ~18.6 MB … no upstream can accept it"
// and kept hitting it, because every retry re-sent the same history. Whatever the
// history was, the plugin's own contributions have to be bounded and honest about
// what they dropped: the system-prompt status block, each tool result, and each
// stdout tail.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { clipText, clipDeep, clipSection, PAYLOAD, payloadBytes } from '../../src/core/limits.js'

test('a short string is returned untouched', () => {
  const out = clipText('hello', 10)
  assert.equal(out.text, 'hello')
  assert.equal(out.clipped, false)
  assert.equal(out.omitted, 0)
})

test('a long string is clipped and says how much it dropped', () => {
  const out = clipText('x'.repeat(100), 10)
  assert.equal(out.clipped, true)
  assert.equal(out.omitted, 90)
  assert.ok(out.text.startsWith('x'.repeat(10)))
  assert.match(out.text, /clipped/)
})

test('a nonsensical limit falls back to the field budget instead of exploding', () => {
  const out = clipText('abc', -5)
  assert.equal(out.clipped, false)
  assert.equal(PAYLOAD.field > 0, true)
})

test('deep clipping keeps the shape and names the fields it cut', () => {
  const record = {
    id: 'r1a1',
    stdoutTail: 'y'.repeat(5_000),
    nested: { report: 'z'.repeat(5_000), small: 'ok' },
    list: ['q'.repeat(5_000)],
  }
  const out = clipDeep(record, { budget: PAYLOAD.toolResult, field: 100 })
  assert.equal(out.clipped, true)
  assert.equal(out.value.id, 'r1a1')
  assert.equal(out.value.nested.small, 'ok')
  assert.ok(out.value.stdoutTail.length < 5_000)
  assert.ok(out.fields.some((f) => f.includes('stdoutTail')), `fields must name the offender, got ${out.fields}`)
  assert.ok(payloadBytes(out.value) < payloadBytes(record))
})

test('deep clipping leaves a value that already fits recognisably alone', () => {
  const out = clipDeep({ id: 'r1', score: 1, ok: true }, { field: 100 })
  assert.equal(out.clipped, false)
  assert.deepEqual(out.value, { id: 'r1', score: 1, ok: true })
})

test('the prompt section is capped no matter how many campaigns exist', () => {
  const huge = Array.from({ length: 5000 }, (_, i) => `- campaign-${i} [running] round 1/12`).join('\n')
  const out = clipSection(huge)
  assert.ok(out.length <= PAYLOAD.promptSection + 120, `section was ${out.length} chars`)
  assert.match(out, /withheld to keep the request sendable/)
})

test('a section that fits gains no noise', () => {
  assert.equal(clipSection('- loom-a [running] round 1/12'), '- loom-a [running] round 1/12')
})

test('rsi_status full is bounded too, and says what it dropped', async () => {
  const { compactStatus } = await import('../../src/tools/index.js')
  const big = { id: 'loom-x', lastRound: { attempts: [{ id: 'r1a1', stdoutTail: 'w'.repeat(200_000), report: 'v'.repeat(200_000) }] } }
  const out = compactStatus(big, { detail: 'full' })
  assert.ok(payloadBytes(out) <= PAYLOAD.toolResult + 2_000, `full status was ${payloadBytes(out)} bytes`)
  assert.ok(out.truncated, 'a clipped record must admit it was clipped')
  assert.ok(out.truncated.fields.some((f) => f.includes('stdoutTail')))
})

test('a guard failure keeps the failing suite, not just the summary', async () => {
  const { failureDigest } = await import('../../src/core/limits.js')
  const log = [
    'ok   tests/approve-lands.test.mjs (120ms)',
    'FAIL tests/tools/standing-list.test.mjs (121ms, failed twice)',
    '  AssertionError [ERR_ASSERTION]: the standing list names each pin once',
    ...Array.from({ length: 60 }, (_, i) => `ok   tests/pad-${i}.test.mjs (5ms)`),
    '209/210 suites passed',
  ].join('\n')
  const digest = failureDigest(log)
  assert.match(digest, /FAIL tests\/tools\/standing-list\.test\.mjs/, 'the failing suite must survive')
  assert.match(digest, /AssertionError/, 'and so must the assertion')
  assert.match(digest, /209\/210 suites passed/, 'with the summary for context')
  assert.ok(digest.length < 2_000, `digest was ${digest.length} chars`)
})

test('an empty log produces no digest rather than a stale one', async () => {
  const { failureDigest } = await import('../../src/core/limits.js')
  assert.equal(failureDigest(''), '')
  assert.equal(failureDigest(undefined), '')
})
