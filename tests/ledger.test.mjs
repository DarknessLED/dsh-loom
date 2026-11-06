// The ledger is the source of truth, and two plugin instances can share the
// same file across a hot reload. Sequence numbers must come from the file so a
// reload never produces duplicate seq values (which made one round appear
// twice in the evidence).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Ledger } from '../src/core/ledger.js'

const tmpFile = () => join(mkdtempSync(join(tmpdir(), 'loom-ledger-')), 'events.jsonl')

test('ledger: seq starts at 1 and increments', () => {
  const l = new Ledger(tmpFile())
  assert.equal(l.append('a').seq, 1)
  assert.equal(l.append('b').seq, 2)
})

test('ledger: a second writer continues the sequence instead of restarting it', () => {
  const file = tmpFile()
  const first = new Ledger(file)
  first.append('a')
  const second = new Ledger(file)
  assert.equal(second.append('b').seq, 2)
  assert.equal(first.append('c').seq, 3, 'the first writer must notice the second one')
})

test('ledger: alternating writers never duplicate a seq', () => {
  const file = tmpFile()
  const a = new Ledger(file)
  const b = new Ledger(file)
  const seqs = []
  for (let i = 0; i < 5; i += 1) {
    seqs.push(a.append('a', { i }).seq)
    seqs.push(b.append('b', { i }).seq)
  }
  assert.deepEqual(seqs, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  assert.equal(new Set(seqs).size, seqs.length)
})

test('ledger: all() sees events written by another instance', () => {
  const file = tmpFile()
  const a = new Ledger(file)
  const b = new Ledger(file)
  a.append('a')
  b.append('b')
  assert.deepEqual(a.all().map((e) => e.type), ['a', 'b'])
})

test('ledger: since() filters on the on-disk sequence', () => {
  const file = tmpFile()
  const a = new Ledger(file)
  a.append('a')
  const b = new Ledger(file)
  b.append('b')
  b.append('c')
  assert.deepEqual(a.since(1).map((e) => e.type), ['b', 'c'])
})

test('ledger: a torn trailing line does not reset the sequence', () => {
  const file = tmpFile()
  const l = new Ledger(file)
  l.append('a')
  writeFileSync(file, '{"seq":2,"ty', { flag: 'a' })
  const next = new Ledger(file)
  assert.deepEqual(next.all().map((e) => e.type), ['a'], 'the torn line is not an event')
  assert.equal(next.append('b').seq, 2, 'sequence continues from the last intact event')
})

test('ledger: a missing file starts an empty log', () => {
  const l = new Ledger(join(mkdtempSync(join(tmpdir(), 'loom-ledger-')), 'none.jsonl'))
  assert.deepEqual(l.all(), [])
  assert.equal(l.append('a').seq, 1)
})
