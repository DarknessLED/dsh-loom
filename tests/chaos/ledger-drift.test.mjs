// Adversary: the ledger drifts. Two hot-reloaded instances append, a process is
// killed mid-write, a line is torn, an old release wrote a duplicate seq. The
// event log is the only source of truth, so it has to normalise itself on read
// instead of handing a corrupt history to the reducer.
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Ledger } from '../../src/core/ledger.js'
import { emptyState, reduce } from '../../src/core/reduce.js'
import { ok, done } from './fixture.mjs'

function ledgerFile(lines) {
  const dir = mkdtempSync(join(tmpdir(), 'loom-chaos-ledger-'))
  const file = join(dir, 'events.jsonl')
  writeFileSync(file, lines)
  return { dir, file }
}

// 1. duplicate seq, out-of-order lines and a torn tail are normalised on read.
{
  const { dir, file } = ledgerFile(
    [
      '{"seq":2,"t":20,"type":"round.started","data":{"n":1}}',
      '{"seq":1,"t":10,"type":"campaign.created","data":{"id":"c1"}}',
      '{"seq":2,"t":21,"type":"round.started","data":{"n":1}}',
      '{"seq":3,"t":30,"type":"round.finished","data":{"n":1,"status":"no-gain","promoted":false}}',
      '{"seq":4,"t":40,"type":"round.sta', // torn write, no newline
    ].join('\n'),
  )
  const ledger = new Ledger(file)
  const all = ledger.all()
  assert.deepEqual(all.map((e) => e.seq), [1, 2, 3], 'seqs are sorted, unique and the torn line is dropped')
  assert.equal(all[0].type, 'campaign.created', 'the earliest event comes first')

  const state = reduce(all)
  assert.equal(state.rounds.length, 1, 'a duplicated round.started does not duplicate the round')

  const appended = ledger.append('round.started', { n: 2 })
  assert.equal(appended.seq, 4, 'new events continue after the highest seq on disk')
  ok('the log normalises duplicates, order and torn lines on read')
  rmSync(dir, { recursive: true, force: true })
}

// 2. a second writer appending behind our back is picked up, not overwritten.
{
  const { dir, file } = ledgerFile('{"seq":1,"t":1,"type":"campaign.created","data":{"id":"c1"}}\n')
  const a = new Ledger(file)
  const b = new Ledger(file)
  a.append('round.started', { n: 1 })
  const fromB = b.append('round.started', { n: 2 })
  assert.equal(fromB.seq, 3, 'the second writer sees the first writer\'s seq')
  const seqs = new Ledger(file).all().map((e) => e.seq)
  assert.deepEqual(seqs, [1, 2, 3], 'no duplicate seq survives on disk')
  ok('a second writer continues the sequence instead of colliding')
  rmSync(dir, { recursive: true, force: true })
}

// 3. a truncated file (no trailing newline, last event incomplete) still loads.
{
  const { dir, file } = ledgerFile('{"seq":1,"t":1,"type":"campaign.created","data":{"id":"c1"}}\n{"seq":2,"t":2,"type":"rou')
  const ledger = new Ledger(file)
  assert.equal(ledger.all().length, 1)
  assert.equal(ledger.append('round.started', { n: 1 }).seq, 2)
  assert.equal(new Ledger(file).all().length, 2, 'the new record is readable next to the torn fragment')
  ok('appending after a torn line keeps both records readable')
  rmSync(dir, { recursive: true, force: true })
}

done()
