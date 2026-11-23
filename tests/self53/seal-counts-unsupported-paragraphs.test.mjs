// A sealed report should be able to say how much of it is actually supported.
//
// Once a paragraph can name its claims, the next question is the one a reader
// asks anyway: of the prose in this report, how much of it points at something
// checked? Today the answer cannot be computed from the sealed bytes — the
// manifest carries the claim table and nothing about the body — so a report with
// zero supported paragraphs and one with all of them look identical from
// outside.
//
// The number this produces is a *floor*, not a quality score, and the spec says
// so in the assertion names: a cited paragraph may cite the wrong claim, and a
// short transition sentence will always be uncited. What it does catch is the
// failure we actually have, where a report's argument and its evidence table
// are two unrelated documents.
//
// The count must only consider markers the renderer wrote. Nineteen paragraphs
// in the existing corpus contain hand-typed `c-xxxx` strings; if the count
// scanned the body for the pattern it would credit those too, and the coverage
// figure would describe font choices rather than evidence.
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { sealReport, verifySeal } from '../../src/research/ledger.js'

let passed = 0
let failed = 0
function ok(name) {
  passed++
  console.log(`ok ${passed + failed} - ${name}`)
}

const home = mkdtempSync(join(tmpdir(), 'loom-report-coverage-'))

{
  const sealed = sealReport(home, {
    topic: 'coverage-a',
    sections: [
      {
        heading: 'A',
        paragraphs: [
          { text: 'One supported sentence.', claimIds: ['c-1'] },
          { text: 'One unsupported sentence.' },
        ],
      },
      { heading: 'B', paragraphs: [{ text: 'Another supported one.', claimIds: ['c-2', 'c-3'] }] },
    ],
    claims: [
      { id: 'c-1', status: 'verified', text: 'a', note: '' },
      { id: 'c-2', status: 'verified', text: 'b', note: '' },
      { id: 'c-3', status: 'verified', text: 'c', note: '' },
    ],
  })
  const cov = sealed.manifest.coverage
  assert.ok(cov, 'the manifest carries a coverage block')
  assert.equal(cov.paragraphs, 3, 'every prose paragraph is counted')
  assert.equal(cov.cited, 2, 'two of them declare at least one claim')
  assert.equal(cov.uncited, 1)
  assert.equal(cov.claimsListed, 3, 'the table lists three claims')
  assert.deepEqual(cov.claimsNotInBody, [], 'all three are used by some paragraph')

  const text = readFileSync(join(sealed.dir, 'report.md'), 'utf8')
  assert.match(text, /coverage: 2\/3 paragraphs cite a claim/, 'the report states the figure in its own text')
  assert.equal(verifySeal(sealed.dir).ok, true, 'coverage is content: the seal still verifies')
  ok('coverage counts the paragraphs, not the claims')
}

{
  // A claim listed in the table but used by no paragraph is the interesting
  // half: it is the shape of "we verified fourteen things and argued something
  // else".
  const sealed = sealReport(home, {
    topic: 'coverage-b',
    sections: [{ heading: 'A', paragraphs: [{ text: 'The argument.', claimIds: ['c-1'] }] }],
    claims: [
      { id: 'c-1', status: 'verified', text: 'a', note: '' },
      { id: 'c-2', status: 'verified', text: 'b', note: '' },
    ],
  })
  assert.deepEqual(sealed.manifest.coverage.claimsNotInBody, ['c-2'], 'a verified claim nobody cites is named')
  ok('a claim in the table that no paragraph uses is listed by id')
}

{
  // The report that argues with no support at all is the one worth flagging.
  const sealed = sealReport(home, {
    topic: 'coverage-c',
    sections: [{ heading: 'A', paragraphs: [{ text: 'Everything is fine.' }] }],
    claims: [],
  })
  assert.equal(sealed.manifest.coverage.cited, 0)
  assert.equal(sealed.manifest.coverage.uncited, 1)
  assert.deepEqual(sealed.manifest.coverage.claimsNotInBody, [])
  ok('a report that cites nothing reports zero, not null')
}

{
  // Hand-typed ids must not be credited: the marker has to come from
  // `paragraph.claimIds`, which is what the renderer wrote.
  const sealed = sealReport(home, {
    topic: 'coverage-d',
    sections: [{ heading: 'A', paragraphs: [{ text: 'See also c-1 and c-2 for the detail.' }] }],
    claims: [{ id: 'c-1', status: 'verified', text: 'a', note: '' }],
  })
  assert.equal(sealed.manifest.coverage.cited, 0, 'a c-1 typed into the prose is not a citation')
  assert.deepEqual(sealed.manifest.coverage.claimsNotInBody, ['c-1'])
  ok('only the renderer counts; a hand-typed id in the prose is not a citation')
}
