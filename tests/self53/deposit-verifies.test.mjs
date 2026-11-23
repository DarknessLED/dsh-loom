// A deposit that leaves its claims unverified cannot ever reach the loop.
//
// Found live: the tenth direction's six papers were deposited (36 claims) and
// then `sink` refused every one of them with "no verdict". The reading had been
// correct and the quotes did match the stored body — nobody had asked. A claim
// with no verdict is indistinguishable from a claim that failed to verify, so
// the deposit has to be the thing that checks it: the bytes are in hand at that
// moment, and a later reader cannot tell whether silence meant "checked, fine"
// or "never checked".
//
// The second half matters as much: a deposit that verifies has to *report* the
// verdicts. A tool that silently drops a claim whose quote does not appear in
// the body it just stored would turn a bad extraction into a quiet gap.

import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readPaper, writePaperToLedger } from '../../scripts/research-deepread.mjs'

const BODY = `<!DOCTYPE html><html><head><title>Decision observability</title></head><body>
<h1 class="ltx_title ltx_title_document">Decision observability</h1>
<section class="ltx_section" id="S3"><h2 class="ltx_title ltx_title_section">3 Method</h2>
<p class="ltx_p" id="S3.SS1.p1.1">Every edit is paired with a self-declared prediction, later verified against the next round's outcomes.</p>
</section></body></html>`

const readVerdicts = (home) => {
  const file = join(home, 'research', 'ledger', 'verdicts.jsonl')
  if (!existsSync(file)) return []
  return readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)
}

test('a deposit leaves every claim it registered with a verdict', () => {
  const home = mkdtempSync(join(tmpdir(), 'deposit-verifies-'))
  try {
    const read = readPaper('2604.25850', BODY, ['prediction'])
    const written = writePaperToLedger(home, read, BODY)
    assert.equal(written.claims, 1)

    const verdicts = readVerdicts(home)
    assert.equal(verdicts.length, 1, 'the deposit must check what it just wrote')
    assert.equal(verdicts[0].status, 'verified')
    // The count is reported back, not left for the caller to re-read the file.
    assert.equal(written.verified, 1)
    assert.deepEqual(written.unverified, [])
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

test('a claim whose quote is not in the body comes back named, not dropped', () => {
  const home = mkdtempSync(join(tmpdir(), 'deposit-verifies-bad-'))
  try {
    const read = readPaper('2604.25850', BODY, ['prediction'])
    // The extractor hands back a passage, but the snapshot written first is a
    // different body: this is what a parser bug looks like, and it must be
    // visible as an unverified claim rather than as one fewer claim.
    const written = writePaperToLedger(home, read, BODY.replace('Every edit is paired', 'Something else entirely'))
    assert.equal(written.claims, 1)
    assert.equal(written.verified, 0)
    assert.equal(written.unverified.length, 1)
    // `contradicted`, not `unverified`: a quote that was written down and then
    // is not in the stored bytes is a claim the evidence disagrees with, which
    // is a stronger and more useful statement than "nobody checked".
    assert.equal(written.unverified[0].status, 'contradicted')
    assert.match(written.unverified[0].note, /quote/i)
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

test('a body with nothing to quote registers no claim and reports no verdicts', () => {
  const home = mkdtempSync(join(tmpdir(), 'deposit-verifies-empty-'))
  try {
    const empty = readPaper('2501.00002', BODY.replace(/<p class="ltx_p"[\s\S]*?<\/p>/, ''), ['prediction'])
    const written = writePaperToLedger(home, empty, BODY)
    assert.equal(written.claims, 0)
    assert.equal(written.verified, 0)
    assert.deepEqual(written.unverified, [])
    assert.deepEqual(readVerdicts(home), [])
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})
