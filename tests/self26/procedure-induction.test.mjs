// A procedure is not a fact with more words: it is a claim that has survived
// the same situation more than once. These tests pin the induction rule before
// the generator exists: two independent promotions on the same subject earn one
// procedure; one promotion earns nothing; a failure on the same subject becomes
// a `notWhen` condition instead of being forgotten.

import assert from 'node:assert/strict'
import test from 'node:test'

import { induceProcedures } from '../../src/knowledge/procedure.js'

const attempt = (id, { family = 'code', files = [], claim = 'fix the parser', ok = true, error = null } = {}) => ({
  id,
  family,
  verifierOk: ok,
  promotable: ok,
  score: ok ? 1 : 0,
  progress: ok ? 1 : 0,
  error,
  report: { lesson: claim, changed: files },
})

test('two promotions on the same subject earn exactly one procedure', () => {
  const out = induceProcedures([
    attempt('r1a1', { files: ['src/parser.js'] }),
    attempt('r2a1', { files: ['src/parser.js', 'src/lexer.js'] }),
  ])
  assert.equal(out.length, 1)
  const proc = out[0]
  assert.equal(proc.kind, 'procedure')
  assert.match(proc.id, /^proc-/)
  assert.equal(proc.support.length, 2)
  assert.deepEqual(proc.support, ['r1a1', 'r2a1'])
  assert.match(proc.when, /code/)
  assert.ok(proc.steps.some((s) => s.includes('src/parser.js')))
  assert.ok(proc.steps.some((s) => s.includes('src/lexer.js')))
  assert.deepEqual(proc.trials, { shown: 0, wins: 0, losses: 0 })
  assert.deepEqual(proc.shape, ['solved'])
})

test('one promotion is an anecdote, not a procedure', () => {
  assert.deepEqual(induceProcedures([attempt('r1a1', { files: ['src/parser.js'] })]), [])
})

test('a failure on the same subject becomes a notWhen, not silence', () => {
  const out = induceProcedures([
    attempt('r1a1', { files: ['src/parser.js'] }),
    attempt('r2a1', { files: ['src/parser.js'] }),
    attempt('r3a1', { files: ['src/parser.js'], ok: false, error: 'ETIMEDOUT' }),
  ])
  assert.equal(out.length, 1)
  assert.deepEqual(out[0].notWhen, ['error'])
  assert.ok(out[0].pitfalls.some((p) => p.includes('error')))
})

test('the same evidence induces the same procedure regardless of order', () => {
  const a = attempt('r1a1', { files: ['src/parser.js', 'src/lexer.js'] })
  const b = attempt('r2a1', { files: ['src/parser.js'] })
  assert.deepEqual(
    induceProcedures([a, b]).map((p) => [p.id, p.steps, p.support]),
    induceProcedures([b, a]).map((p) => [p.id, p.steps, p.support]),
  )
})

test('an existing procedure is not re-induced', () => {
  const first = induceProcedures([
    attempt('r1a1', { files: ['src/parser.js'] }),
    attempt('r2a1', { files: ['src/parser.js'] }),
  ])
  const again = induceProcedures(
    [
      attempt('r1a1', { files: ['src/parser.js'] }),
      attempt('r2a1', { files: ['src/parser.js'] }),
      attempt('r3a1', { files: ['src/parser.js'] }),
    ],
    { existing: first },
  )
  assert.deepEqual(again, [])
})
