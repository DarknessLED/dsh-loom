// The lessons already on disk predate the origin field, and a field that only
// new lessons carry is a field the brief cannot rely on.
//
// The backfill is deliberately asymmetric. A lesson folded in from the research
// ledger has `source: 'research'` and was only accepted after its quote was
// found in a stored snapshot, so its provenance is recoverable and its trust is
// `verified`. Everything else is a lesson the loop derived from its own attempt,
// which the loop did watch — but "there was no source field" is not evidence of
// anything, so those get `self-observed` / `observed` and never `verified`.
// Promoting an unknown record to the highest trust level would be exactly the
// silent upgrade this file exists to prevent.
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { backfillLessonOrigin, readGlobalLessons } from '../../src/knowledge/store.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const home = mkdtempSync(join(tmpdir(), 'rsi-origin-'))
const file = join(home, 'knowledge.json')
const before = [
  { id: 'lsn-a', kind: 'fact', claim: 'a claim earned in a round', source: undefined, notWhen: ['x'] },
  { id: 'lsn-b', kind: 'fact', claim: 'a claim read in a paper', source: 'research', notWhen: ['y'], evidence: ['ev-1'] },
  { id: 'lsn-c', kind: 'fact', claim: 'already labelled', source: 'research', origin: 'research-claim', trust: 'verified' },
]
writeFileSync(file, JSON.stringify(before))

const result = backfillLessonOrigin(home)
assert.equal(result.updated, 2, 'only the records that lacked an origin are rewritten')
assert.equal(result.selfObserved, 1)
assert.equal(result.research, 1)

const after = readGlobalLessons(home)
const byId = Object.fromEntries(after.map((l) => [l.id, l]))
assert.equal(byId['lsn-a'].origin, 'self-observed')
assert.equal(byId['lsn-a'].trust, 'observed', 'an unlabelled record is not promoted to verified')
assert.equal(byId['lsn-b'].origin, 'research-claim')
assert.equal(byId['lsn-b'].trust, 'verified', 'the research field is enough to recover a verified origin')
assert.equal(byId['lsn-c'].trust, 'verified', 'an already-labelled record keeps what it says')
ok('the backfill labels records by what it can prove, not by what is convenient')

// Idempotent: running it again changes nothing, so a migration can be retried
// after a crash without rewriting trust levels.
const second = backfillLessonOrigin(home)
assert.equal(second.updated, 0, 'a second run rewrites nothing')
const again = readGlobalLessons(home)
assert.deepEqual(
  again.map((l) => [l.id, l.origin, l.trust]),
  after.map((l) => [l.id, l.origin, l.trust]),
)
ok('running the backfill twice lands in the same place')

// Content is preserved: a migration that quietly rewrites claims would be a
// worse failure than the missing field.
assert.deepEqual(
  again.map((l) => l.claim),
  before.map((l) => l.claim),
)
assert.deepEqual(byId['lsn-b'].evidence, ['ev-1'])
ok('claims and evidence survive the migration')

// A missing store is an empty store, not an error to crash a startup on.
const empty = mkdtempSync(join(tmpdir(), 'rsi-origin-empty-'))
assert.deepEqual(backfillLessonOrigin(empty), { updated: 0, selfObserved: 0, research: 0 })
ok('a home with no store is a no-op')

rmSync(home, { recursive: true, force: true })
rmSync(empty, { recursive: true, force: true })
