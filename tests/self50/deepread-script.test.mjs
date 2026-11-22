// The deep-read script, pinned at the seams that matter when it runs unattended.
//
// The module spec (`tests/self50/deepread.test.mjs`) proves the parser; this one
// proves the script's judgements around it, each of which was a real failure
// while building it against the 486 cached bodies:
//
//   * a paper arXiv has no HTML5 for must be reported as unread, not as a paper
//     with zero findings — "0 passages" and "could not fetch" are different
//     facts and only one of them is about the paper;
//   * a paper whose body yields nothing must reach the ledger with no claim,
//     because a claim with no quote fails verification later and looks like a
//     bad source rather than a bad reading;
//   * a stored claim must carry the locator, or the quote can be found but a
//     reader still cannot tell which section to open;
//   * the document must print the unread and the empty, in place, so a gap in a
//     table cannot be mistaken for a considered omission.

import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { readPaper, renderDoc, parseArgs, writePaperToLedger, localStamp } from '../../scripts/research-deepread.mjs'

const BODY = `<!DOCTYPE html><html><head><meta name="citation_title" content="AHE: Agentic Harness Engineering">
<meta name="citation_author" content="Jiahang Lin"></head><body>
<section id="S3" class="ltx_section">
<h2 class="ltx_title"><span class="ltx_tag ltx_tag_section">III </span><span class="ltx_text">Method</span></h2>
<section id="S3.SS1" class="ltx_subsection">
<h3 class="ltx_title"><span class="ltx_tag ltx_tag_subsection">III-A </span><span class="ltx_text">Decision observability</span></h3>
<p id="abstract1.1" class="ltx_p">We present a harness that edits itself and reports a number.</p>
<p id="S3.SS1.p1.1" class="ltx_p">Every edit is paired with a self-declared prediction and verified against the next round's task-level outcomes.</p>
</section>
</section></body></html>`

test('args: ids and terms split on commas, empty entries dropped, --ledger is a flag', () => {
  const args = parseArgs(['--ids', '2604.25850, 2606.09498,,', '--terms', 'harness, edit', '--ledger', '--out', 'x.json'])
  assert.deepEqual(args.ids, ['2604.25850', '2606.09498'])
  assert.deepEqual(args.terms, ['harness', 'edit'])
  assert.equal(args.ledger, true)
  assert.equal(args.out, 'x.json')
  assert.equal(parseArgs(['--ids']).ids.length, 0)
})

test('a paper with a body gets a note graded at depth full, with locators', () => {
  const read = readPaper('2604.25850', BODY, ['prediction', 'outcomes'])
  assert.equal(read.title, 'AHE: Agentic Harness Engineering')
  assert.deepEqual(read.note.identity.authors, ['Jiahang Lin'])
  assert.equal(read.note.depth, 'full')
  assert.ok(read.passages.length >= 1)
  assert.match(read.passages[0].locator, /III-A/)
  assert.equal(read.ok, true, JSON.stringify(read.graded.findings))
})

test('a real arXiv HTML5 page has no citation_* meta, so title and authors come from the body', () => {
  // The first run against the live page titled 2604.25850 with its own id:
  // `arxiv.org/html/<id>` carries no `citation_title` meta at all, only a
  // `<title>` and `ltx_personname` spans. Reading meta alone fails silently.
  const page = `<!DOCTYPE html><html><head><title>Agentic Harness Engineering: Observability-Driven Evolution</title></head>
  <body><span class="ltx_personname">Jiahang Lin</span><span class="ltx_personname">Shichun Liu</span>
  <section id="S1"><h2><span class="ltx_tag">I </span>Introduction</h2>
  <p id="S1.p1.1">The harness is the adaptation surface, and every edit carries a prediction.</p></section></body></html>`
  const read = readPaper('2604.25850', page, ['harness', 'prediction'])
  assert.equal(read.title, 'Agentic Harness Engineering: Observability-Driven Evolution')
  assert.deepEqual(read.note.identity.authors, ['Jiahang Lin', 'Shichun Liu'])
  assert.equal(read.ok, true, JSON.stringify(read.graded.findings))
})

test('a paper with no rendered body is reported as unread, never as zero findings', () => {
  const read = readPaper('2501.00001', '<html><body><p>no ltx markup</p></body></html>', ['harness'])
  assert.equal(read.sections, 0)
  assert.equal(read.passages.length, 0)
  // No body means no note depth claim beyond what was actually seen.
  assert.equal(read.ok, false)
  assert.ok(read.graded.findings.length >= 1)
})

test('writing to the ledger stores the body, and stores a claim only when there is a passage', () => {
  const home = mkdtempSync(join(tmpdir(), 'deepread-ledger-'))
  try {
    const read = readPaper('2604.25850', BODY, ['prediction'])
    const written = writePaperToLedger(home, read, BODY)
    assert.ok(written.evidenceId.startsWith('ev-'))
    assert.equal(written.claims, 1)
    const claims = readFileSync(join(home, 'research', 'ledger', 'claims.jsonl'), 'utf8').trim().split('\n').map(JSON.parse)
    assert.equal(claims.length, 1)
    assert.match(claims[0].locator, /§/)
    assert.equal(claims[0].anchor, 'S3.SS1.p1.1')
    assert.equal(claims[0].quotes.length, 1)

    // A body with nothing to quote must not register a claim with an empty
    // quote: verifyClaim would mark it unverified, which reads as "bad source".
    const empty = readPaper('2501.00002', BODY.replace(/<p id="S3.SS1\.p1\.1"[\s\S]*?<\/p>/, ''), ['prediction'])
    const none = writePaperToLedger(home, empty, BODY)
    assert.equal(none.claims, 0)
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

test('the document prints unread and empty papers in place instead of omitting them', () => {
  const md = renderDoc(
    {
      papers: [
        { id: '2604.25850', title: 'AHE', sections: 2, passages: [{ locator: '§III-A Decision observability', anchor: 'S3.SS1.p1.1', text: 'Every edit is paired with a prediction.' }], ok: true, graded: { findings: [] } },
        { id: '2501.00001', title: '', sections: 0, passages: [], error: 'no rendered body (arXiv has no HTML for this paper yet)' },
        { id: '2501.00002', title: 'Silent', sections: 1, passages: [], ok: false, graded: { findings: [{ code: 'claims-empty' }] } },
      ],
    },
    { terms: ['prediction'], generated: '2026-11-23T00:00:00.000Z' },
  )
  assert.match(md, /no rendered body/)
  assert.match(md, /claims-empty/)
  assert.match(md, /No body passage matched the terms/)
  assert.match(md, /§III-A Decision observability/)
})

test('a quote cut short says so, and the document is dated where it was written', () => {
  const long = 'x'.repeat(900)
  const md = renderDoc(
    {
      papers: [
        { id: '2604.25850', title: 'AHE', sections: 1, passages: [{ locator: '§1', anchor: 'S1.p1.1', text: long }], ok: true, graded: { findings: [] } },
        { id: '2604.25851', title: 'Short', sections: 1, passages: [{ locator: '§2', anchor: 'S2.p1.1', text: 'short enough' }], ok: true, graded: { findings: [] } },
      ],
    },
    { terms: ['x'], generated: localStamp(new Date(2026, 10, 23, 9, 5)) },
  )
  // A quotation that stops mid-sentence must not read as the whole sentence.
  assert.match(md, /x{600}…/)
  assert.match(md, /short enough\n/)
  assert.ok(!/short enough…/.test(md))
  // The filename says 11-23; a UTC stamp would say 11-22 for hours of the day.
  assert.match(md, /Generated 2026-11-23 09:05 local/)
})

test('the script exposes its own entry points without running on import', () => {
  // Importing must not read the network or the ledger; only the CLI does.
  const source = readFileSync(new URL('../../scripts/research-deepread.mjs', import.meta.url), 'utf8')
  assert.match(source, /invokedDirectly/)
  assert.ok(!existsSync(join(process.cwd(), 'research', 'out', 'deep-undefined.json')))
})
