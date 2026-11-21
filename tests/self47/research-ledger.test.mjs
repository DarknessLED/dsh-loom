// A finding that cannot be re-checked is a memory of a finding.
//
// The ledger exists for one reason: six months from now, someone reads a report
// and asks "where did this number come from". The answer has to be bytes, not a
// URL — pages move, get edited, and 404. So:
//
//   * a snapshot is stored by the hash of its own content, so the same page
//     stored twice costs one copy and any later edit is detectable;
//   * a claim names the snapshots it rests on, and must quote something the
//     snapshot actually says — a claim with no locatable literal is exactly the
//     claim nobody can check, so it is recorded as `unverified`, never dropped;
//   * tampering is decided by re-hashing at read time, not by trusting a flag;
//   * a report is sealed by hashing a manifest that pins every snapshot hash,
//     so the seal covers the evidence and not only the prose.
//
// Nothing here talks to the network. It is the part that must work offline.
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  addClaim,
  addEvidence,
  readClaims,
  readEvidence,
  readVerdicts,
  sealReport,
  verifyClaim,
  verifySeal,
} from '../../src/research/ledger.js'

let passed = 0
let failed = 0
// Each block ends with a call to this line: reaching it means every assertion
// in the block held, so the block itself is the check.
function ok(name) {
  passed++
  console.log(`ok ${passed + failed} - ${name}`)
}

const home = mkdtempSync(join(tmpdir(), 'loom-ledger-'))
const PAGE = 'The audit found 323 of 1968 tasks were hackable without solving them (16.4%).'

// --- content addressing ---------------------------------------------------

{
  const a = addEvidence(home, { origin: 'https://example.test/a', title: 'A page', content: PAGE })
  assert.ok(a.id && a.hash && a.bytes === PAGE.length, 'evidence carries an id, a hash and a byte count')
  assert.equal(a.duplicate, false)

  const again = addEvidence(home, { origin: 'https://example.test/a-copy', title: 'Same bytes', content: PAGE })
  assert.equal(again.hash, a.hash, 'the same bytes have the same hash')
  assert.equal(again.id, a.id, 'and are stored once')
  assert.equal(again.duplicate, true, 'a second add says so instead of appending a copy')

  const listing = readEvidence(home)
  assert.equal(listing.filter((e) => e.hash === a.hash).length, 1, 'one record, not two')
  const rec = listing.find((e) => e.id === a.id)
  assert.equal(rec.origin, 'https://example.test/a', 'the first origin is kept')
  assert.equal(rec.tampered, undefined, 'a clean read does not claim tampering')

  assert.throws(() => addEvidence(home, { origin: 'x', content: '' }), /content/i, 'empty content is refused')
}
ok('a snapshot is addressed by its own bytes, so the same page is stored once')

// --- integrity is decided by re-hashing ----------------------------------

{
  const a = addEvidence(home, { origin: 'https://example.test/b', content: 'B origin text' })
  const rec = readEvidence(home, a.id)
  assert.equal(rec.content, 'B origin text')

  // Edit the stored bytes behind the ledger's back.
  const file = join(home, 'research', 'ledger', 'blobs', `${a.hash}.txt`)
  writeFileSync(file, 'B origin text, edited')
  const tampered = readEvidence(home, a.id)
  assert.equal(tampered.tampered, true, 'a changed blob is reported as tampered')
  assert.equal(tampered.missing, undefined)

  const gone = readEvidence(home, 'ev-doesnotexist')
  assert.equal(gone, null, 'an unknown id reads as null, not a crash')
}
ok('editing a stored snapshot is detected by hashing it again, not by a flag')

// --- a claim must quote its evidence -------------------------------------

{
  const ev = addEvidence(home, { origin: 'https://example.test/c', content: PAGE })
  const good = addClaim(home, { text: 'A 2026 audit found 323 of 1,968 tasks hackable without solving them.', evidenceIds: [ev.id], quotes: ['323 of 1968 tasks were hackable without solving them'] })
  assert.ok(good.id)
  const verdict = verifyClaim(home, good)
  assert.equal(verdict.status, 'verified', JSON.stringify(verdict))
  assert.ok(verdict.note.includes(ev.id), 'the verdict names the snapshot it checked')

  // The same claim with no quotable literal cannot be checked, so it is not verified.
  const vague = addClaim(home, { text: 'Roughly a sixth of tasks were hackable.', evidenceIds: [ev.id] })
  assert.equal(verifyClaim(home, vague).status, 'unverified', 'no literal means no verification')

  // A quote that is not in the snapshot is a contradiction, not a gap.
  const wrong = addClaim(home, { text: 'Half the tasks were hackable.', evidenceIds: [ev.id], quotes: ['half the tasks were hackable'] })
  const verdictWrong = verifyClaim(home, wrong)
  assert.equal(verdictWrong.status, 'contradicted', 'a quote absent from the snapshot is a contradiction')
  assert.match(verdictWrong.note, /not found/i)

  // No evidence at all is an unbound claim.
  const orphan = addClaim(home, { text: 'Verifiers are often weak.' })
  assert.equal(verifyClaim(home, orphan).status, 'unbound', 'no evidence is unbound, not "fine"')

  assert.equal(readClaims(home).length, 4)
  assert.ok(readVerdicts(home).length >= 4, 'every verification is appended, none overwritten')
}
ok('a claim is verified only when it quotes bytes the snapshot actually contains')

// --- sealing covers the evidence, not only the prose ---------------------

{
  const ev = addEvidence(home, { origin: 'https://example.test/d', content: 'sealed evidence body' })
  const seal = sealReport(home, {
    topic: 'a test report',
    title: 'Test report',
    sections: [
      { heading: 'One', paragraphs: [{ text: 'The body says this.' }] },
    ],
    evidenceIds: [ev.id],
  })
  assert.ok(seal.dir && seal.seal, 'a seal is a directory plus a hash')
  const body = readFileSync(join(seal.dir, 'report.md'), 'utf8')
  assert.match(body, /The body says this/)
  assert.match(body, /Test report/)

  const manifest = JSON.parse(readFileSync(join(seal.dir, 'manifest.json'), 'utf8'))
  assert.equal(manifest.seal, seal.seal)
  assert.equal(manifest.evidence[0].hash, ev.hash, 'the manifest pins the snapshot hash')
  assert.equal(manifest.evidence[0].id, ev.id)

  const check = verifySeal(seal.dir)
  assert.equal(check.ok, true, JSON.stringify(check))
  assert.equal(check.seal, seal.seal, 'the seal is deterministic and re-checkable')

  // Changing the prose breaks the seal; so does changing a pinned snapshot.
  writeFileSync(join(seal.dir, 'report.md'), `${body}\nAn added sentence.\n`)
  assert.equal(verifySeal(seal.dir).ok, false, 'editing the report breaks the seal')
}
ok('a seal pins the report and every snapshot it cites')

// --- the sealed text says which claims survived verification ---------------
// A seal that covers only the prose leaves a reader unable to tell a verified
// sentence from an assertion. The verdicts are already in the ledger, so the
// report carries them; the manifest pins the verdict list too.
{
  const ev = addEvidence(home, { origin: 'https://example.test/e', content: 'the audit found 323 of 1968 tasks were hackable' })
  const good = addClaim(home, { text: '323 of 1968 tasks were hackable', evidenceIds: [ev.id], quotes: ['323 of 1968 tasks were hackable'] })
  const bad = addClaim(home, { text: 'a sentence nobody can check', evidenceIds: [ev.id], quotes: ['this phrase is not in the page'] })
  const records = [good, bad].map((c) => ({ id: c.id, text: c.text, ...verifyClaim(home, c) }))
  const seal = sealReport(home, {
    topic: 'claim table',
    title: 'Claim table',
    sections: [{ heading: 'Body', paragraphs: [{ text: 'Two claims were registered.' }] }],
    evidenceIds: [ev.id],
    claims: records,
  })
  const body = readFileSync(join(seal.dir, 'report.md'), 'utf8')
  assert.match(body, /## Claims/, 'the sealed text lists the claims')
  assert.match(body, /verified/, 'and their verdicts')
  assert.match(body, /unverifiable|contradicted/, 'an unverifiable claim is visible in the text')
  const manifest = JSON.parse(readFileSync(join(seal.dir, 'manifest.json'), 'utf8'))
  assert.equal(manifest.claims.length, 2, 'the manifest pins the verdict list')
  assert.equal(verifySeal(seal.dir).ok, true)
}
ok('a sealed report carries the verdict table for its claims')

// --- junk in, no crash out ----------------------------------------------

{
  assert.deepEqual(readEvidence(mkdtempSync(join(tmpdir(), 'loom-ledger-empty-'))), [])
  assert.deepEqual(readClaims(mkdtempSync(join(tmpdir(), 'loom-ledger-empty-'))), [])
  assert.throws(() => addClaim(home, { text: '' }), /text/i)
}
ok('an empty ledger reads as empty, and a claim without text is refused')

console.log(`# passed ${passed}, failed ${failed}`)
process.exit(failed === 0 ? 0 : 1)
