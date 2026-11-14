// Spec: a decision the loop made about itself must carry the evidence that
// justified it, and must be recorded exactly once.
//
// Today `decisions.json` holds a single entry ("candidates+1 → reject") with no
// numbers, so a later campaign cannot tell a measured rejection from a hunch,
// and `rsi_chain auto` can only skip a kind, never weigh one.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { appendDecision, readDecisions } from '../../src/loop/decisions.js'

function fresh() {
  return join(mkdtempSync(join(tmpdir(), 'loom-dec-')), 'decisions.json')
}

const good = {
  kind: 'candidates+1',
  decision: 'reject:budget-mismatch',
  base: 1,
  candidate: 2,
  at: '2026-11-14T00:00:00.000Z',
  report: 'tokens 2.09x, wall 1.45x',
  evidence: { rounds: 4, pairs: 8, scoreDelta: 0, mde: 0.05 },
}

test('a missing file reads as no decisions', () => {
  assert.deepEqual(readDecisions(fresh()), [])
})

test('a corrupt file reads as no decisions instead of throwing', () => {
  const file = fresh()
  writeFileSync(file, '{not json', 'utf8')
  assert.deepEqual(readDecisions(file), [])
})

test('a decision without evidence is refused by name', () => {
  assert.throws(() => appendDecision(fresh(), { kind: 'candidates+1', decision: 'adopt' }), /decision requires evidence/)
  assert.throws(
    () => appendDecision(fresh(), { kind: 'candidates+1', decision: 'adopt', evidence: {} }),
    /decision requires evidence/,
  )
})

test('the same decision is recorded once and the second write says so', () => {
  const file = fresh()
  assert.equal(appendDecision(file, good).added, true)
  assert.equal(appendDecision(file, good).added, false)
  const list = readDecisions(file)
  assert.equal(list.length, 1)
  assert.equal(list[0].evidence.mde, 0.05)
})

test('a different decision for the same kind is appended', () => {
  const file = fresh()
  appendDecision(file, good)
  appendDecision(file, { ...good, decision: 'adopt', evidence: { rounds: 3, scoreDelta: 0.12, mde: 0.05 } })
  assert.equal(readDecisions(file).length, 2)
})

test('the file stays a JSON array a human can read', () => {
  const file = fresh()
  appendDecision(file, good)
  const raw = JSON.parse(readFileSync(file, 'utf8'))
  assert.equal(Array.isArray(raw), true)
  assert.equal(raw[0].kind, 'candidates+1')
})
