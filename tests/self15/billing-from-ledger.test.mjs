/**
 * Spec: bill the child from its own ledger when no meter answers.
 *
 * Measured on this host: one attempt was booked at $0.000736 (1,187 input /
 * 961 output) while its child session had actually spent 77,394 input / 1,125
 * output / 1,123,328 cache reads — 84x the price, and the cache reads were not
 * priced at all. The estimate came from `fallbackSpend` (characters/4) because
 * by the time the round asks, `sessions.get(childId)` is already gone.
 *
 * The child's transcript survives that: it is on disk under
 * `<dsh home>/sessions/<workspace>/<...>/session.v4.jsonl(.zstd)`.
 *
 * The shape below is copied from a real ledger line, not guessed:
 *   {"type":"assistant/message","seq":21,
 *    "data":{"turn":1,"step":1,"message":{...},
 *            "usage":{"inputTokens":21011,"outputTokens":380,
 *                     "cacheReadTokens":8448,"cacheWriteTokens":0,
 *                     "totalTokens":29839}}}
 * so the reader must accept the `assistant/message` event type, a usage block
 * at `data.usage` (not only inside the message), and the snake_case spellings
 * an older host may still write. The session directory is not always named
 * `<id>`: match any directory whose name ends with the session id.
 */
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { zstdCompressSync } from 'node:zlib'
import { join } from 'node:path'

const { usageFromSessionLedger } = await import('../../src/runtime/cost.js')

let passed = 0
const test = (name, fn) => {
  fn()
  passed += 1
  console.log(`ok ${passed} - ${name}`)
}

const home = mkdtempSync(join(tmpdir(), 'loom-ledger-'))

/** One assistant turn exactly as the host writes it (camelCase, data.usage). */
const turn = (usage, type = 'assistant/message') =>
  JSON.stringify({
    type,
    seq: 1,
    data: { turn: 1, step: 1, message: { role: 'assistant', content: [] }, usage },
  }) + '\n'

test('sums the usage blocks of every assistant turn', () => {
  const dir = join(home, 'sessions', '--C-Projects-RSI--', 'abc-123')
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, 'session.v4.jsonl'),
    turn({ inputTokens: 1000, outputTokens: 200, cacheReadTokens: 5000 }) +
      turn({ inputTokens: 400, outputTokens: 90, cacheReadTokens: 7000 }) +
      JSON.stringify({ type: 'user/message', data: { text: 'hi' } }) + '\n',
  )
  const usage = usageFromSessionLedger(home, 'abc-123')
  assert.deepEqual(usage, {
    inputTokens: 1400,
    outputTokens: 290,
    cacheReadTokens: 12000,
    cacheWriteTokens: 0,
  })
})

test('the snake_case spelling of an older host is read the same way', () => {
  const dir = join(home, 'sessions', '--C-Projects-RSI--', 'snake-1')
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, 'session.v4.jsonl'),
    JSON.stringify({
      type: 'assistant/message',
      data: { message: { role: 'assistant', usage: { input_tokens: 11, output_tokens: 5 } } },
    }) + '\n',
  )
  const usage = usageFromSessionLedger(home, 'snake-1')
  assert.equal(usage.inputTokens, 11)
  assert.equal(usage.outputTokens, 5)
})

test('a session directory that only ends with the id is found', () => {
  const dir = join(home, 'sessions', '--C-Projects-RSI--', 'session-prefixed-9')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'session.v4.jsonl'), turn({ inputTokens: 3, outputTokens: 2 }))
  const usage = usageFromSessionLedger(home, 'prefixed-9')
  assert.equal(usage.inputTokens, 3)
})

test('the compressed ledger the host actually writes is decompressed', () => {
  const dir = join(home, 'sessions', '--C-Projects-RSI--', 'zstd-1')
  mkdirSync(dir, { recursive: true })
  const body = turn({ inputTokens: 21011, outputTokens: 380, cacheReadTokens: 8448 })
  writeFileSync(join(dir, 'session.v4.jsonl.zstd'), zstdCompressSync(Buffer.from(body, 'utf8')))
  const usage = usageFromSessionLedger(home, 'zstd-1')
  assert.equal(usage.inputTokens, 21011, 'a .zstd ledger is the normal case, not an edge case')
  assert.equal(usage.cacheReadTokens, 8448)
})

test('the ledger is a sequence of frames, not one frame', () => {
  // The host flushes as it goes: a 161 KB ledger on this machine decompresses
  // to 270 bytes if only the first zstd frame is read, which is why the round
  // kept booking an estimate while the real numbers sat on disk.
  const dir = join(home, 'sessions', '--C-Projects-RSI--', 'zstd-multi')
  mkdirSync(dir, { recursive: true })
  const one = turn({ inputTokens: 100, outputTokens: 10 })
  const two = turn({ inputTokens: 200, outputTokens: 20, cacheReadTokens: 3000 })
  writeFileSync(
    join(dir, 'session.v4.jsonl.zstd'),
    Buffer.concat([zstdCompressSync(Buffer.from(one, 'utf8')), zstdCompressSync(Buffer.from(two, 'utf8'))]),
  )
  const usage = usageFromSessionLedger(home, 'zstd-multi')
  assert.equal(usage.inputTokens, 300, 'both frames are read')
  assert.equal(usage.outputTokens, 30)
  assert.equal(usage.cacheReadTokens, 3000, 'and the cache reads in the later frame are priced')
})

test('a session with no ledger returns null instead of zero tokens', () => {
  assert.equal(usageFromSessionLedger(home, 'does-not-exist'), null)
  assert.equal(usageFromSessionLedger(home, ''), null)
})

test('a ledger with no usage blocks is not a measurement either', () => {
  const dir = join(home, 'sessions', '--C-Projects-RSI--', 'no-usage')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'session.v4.jsonl'), JSON.stringify({ type: 'user/message', data: {} }) + '\n')
  assert.equal(usageFromSessionLedger(home, 'no-usage'), null)
})

rmSync(home, { recursive: true, force: true })
console.log(`${passed} passed`)
