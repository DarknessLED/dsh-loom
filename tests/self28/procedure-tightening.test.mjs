// Tightening the induction rule after the T2 replay.
//
// The replay on 114 old campaigns found 57 procedures, 74% with support exactly
// 2 and 32% with a single step. Two structural holes caused that:
//
//   - support could be two rounds of the SAME task, which is a cached answer,
//     not a situation that transfers;
//   - a "procedure" could be one line ("1. change src/parser.js"), which tells
//     the next worker nothing it could not see by opening the file.
//
// These tests pin the tightened rule: independent tasks, at least two steps,
// and a claim that says what was observed instead of implying a cause.

import assert from 'node:assert/strict'
import test from 'node:test'

import { induceProcedures } from '../../src/knowledge/procedure.js'

const attempt = (id, { task = 't1', family = 'code', files = [], ok = true } = {}) => ({
  id,
  taskId: task,
  family,
  verifierOk: ok,
  promotable: ok,
  score: ok ? 1 : 0,
  progress: ok ? 1 : 0,
  report: { lesson: 'fix the parser', changed: files },
})

test('two promotions of the same task are a cached answer, not a procedure', () => {
  const out = induceProcedures([
    attempt('r1a1', { task: 't1', files: ['src/parser.js', 'src/lexer.js'] }),
    attempt('r2a1', { task: 't1', files: ['src/parser.js', 'src/lexer.js'] }),
  ])
  assert.deepEqual(out, [])
})

test('a single-file fix does not become a one-line procedure', () => {
  const out = induceProcedures([
    attempt('r1a1', { task: 't1', files: ['src/parser.js'] }),
    attempt('r2a1', { task: 't2', files: ['src/parser.js'] }),
  ])
  assert.deepEqual(out, [])
})

test('distinct tasks with a shared entry file and a second file earn one procedure', () => {
  const out = induceProcedures([
    attempt('r1a1', { task: 't1', files: ['src/parser.js', 'src/lexer.js'] }),
    attempt('r2a1', { task: 't2', files: ['src/parser.js', 'src/ast.js'] }),
  ])
  assert.equal(out.length, 1)
  const proc = out[0]
  assert.equal(proc.support.length, 2)
  assert.deepEqual(proc.taskIds, ['t1', 't2'])
  assert.ok(proc.steps.length >= 2)
  assert.ok(proc.steps.some((s) => s.includes('src/parser.js')))
  assert.match(proc.claim, /began at src\/parser\.js/)
  assert.doesNotMatch(proc.claim, /through the same files/)
})

test('the same situation in two different files is not one procedure', () => {
  // Same task ids would be rejected by independence; the point here is that the
  // entry file must be the same one. Two different entry files never merge.
  const out = induceProcedures([
    attempt('r1a1', { task: 't1', files: ['src/parser.js', 'src/lexer.js'] }),
    attempt('r2a1', { task: 't2', files: ['src/render.js', 'src/lexer.js'] }),
  ])
  assert.deepEqual(out, [])
})

test('a rejected group says why, so the replay can count the rules', () => {
  const reasons = []
  induceProcedures(
    [
      attempt('r1a1', { task: 't1', files: ['src/parser.js', 'src/lexer.js'] }),
      attempt('r2a1', { task: 't1', files: ['src/parser.js', 'src/lexer.js'] }),
      attempt('r3a1', { task: 't3', files: ['src/only.js'] }),
      attempt('r4a1', { task: 't4', files: ['src/only.js'] }),
    ],
    { onReject: (reason) => reasons.push(reason) },
  )
  assert.ok(reasons.includes('same-task'))
  assert.ok(reasons.includes('too-few-steps'))
})
