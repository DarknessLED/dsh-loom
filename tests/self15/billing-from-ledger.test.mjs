/**
 * Spec: bill the child from its own ledger when no meter answers.
 *
 * Measured on this host: one attempt was booked at $0.000736 (1,187 input /
 * 961 output) while its child session had actually spent 77,394 input / 1,125
 * output / 1,123,328 cache reads — 84x the price, and the cache reads were not
 * priced at all. The estimate came from `fallbackSpend` (characters/4) because
 * by the time the round asks, `sessions.get(childId)` is already gone.
 *
 * The child's own transcript survives that: it is on disk under
 * `<dsh home>/sessions/<workspace>/<sessionId>/session.v4.jsonl(.zstd)`. So
 * `usageFromSessionLedger(home, sessionId)` reads it, sums the usage blocks of
 * the assistant turns, and returns null when there is nothing to read — a
 * missing ledger is not an error and must never be billed as zero tokens.
 */
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const { usageFromSessionLedger } = await import('../../src/runtime/cost.js')

let passed = 0
const test = (name, fn) => {
  fn()
  passed += 1
  console.log(`ok ${passed} - ${name}`)
}

const home = mkdtempSync(join(tmpdir(), 'loom-ledger-'))

/** One turn the way the host writes it: an assistant event carrying usage. */
const turn = (usage) =>
  JSON.stringify({
    type: 'assistant',
    seq: 1,
    data: { message: { role: 'assistant', content: [], usage } },
  }) + '\n'

test('sums the usage blocks of every assistant turn', () => {
  const dir = join(home, 'sessions', '--C-Projects-RSI--', 'abc-123')
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, 'session.v4.jsonl'),
    turn({ input_tokens: 1000, output_tokens: 200, cache_read_input_tokens: 5000 }) +
      turn({ input_tokens: 400, output_tokens: 90, cache_read_input_tokens: 7000 }) +
      JSON.stringify({ type: 'user', data: { text: 'hi' } }) + '\n',
  )
  const usage = usageFromSessionLedger(home, 'abc-123')
  assert.deepEqual(usage, {
    inputTokens: 1400,
    outputTokens: 290,
    cacheReadTokens: 12000,
    cacheWriteTokens: 0,
  })
})

test('a session with no ledger returns null instead of zero tokens', () => {
  assert.equal(usageFromSessionLedger(home, 'does-not-exist'), null)
  assert.equal(usageFromSessionLedger(home, ''), null)
})

test('a ledger with no usage blocks is not a measurement either', () => {
  const dir = join(home, 'sessions', '--C-Projects-RSI--', 'no-usage')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'session.v4.jsonl'), JSON.stringify({ type: 'user', data: {} }) + '\n')
  assert.equal(usageFromSessionLedger(home, 'no-usage'), null)
})

test('the ledger path works for a nested workspace id', () => {
  const dir = join(home, 'sessions', '--D-other-repo--', 'nested-1')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'session.v4.jsonl'), turn({ input_tokens: 7, output_tokens: 3 }))
  const usage = usageFromSessionLedger(home, 'nested-1')
  assert.equal(usage.inputTokens, 7)
  assert.equal(usage.outputTokens, 3)
})

rmSync(home, { recursive: true, force: true })
console.log(`${passed} passed`)
