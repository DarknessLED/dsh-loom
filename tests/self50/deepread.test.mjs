// Reading a paper's body, not its abstract.
//
// `research/out/.cache/html/` holds 486 arXiv HTML5 renderings (219 MB) across
// the eight directions, and until now the only thing extracted from them was
// the bibliography. Every claim in the ledger that concerns a mechanism or an
// evaluation therefore rests on a truncated abstract, and `src/research/note.js`
// — the checker this repo already ships — rejects such a note with
// `depth-exceeds-reading`. These specs pin the part that was missing: a body is
// split into named sections, every passage carries a locator that points at the
// section and paragraph it came from, and the note built from those passages is
// one `gradeNote` accepts at depth `full`.
//
// The four rules below were each forced by a real file in that cache:
//
//   * a section id is a prefix of its paragraphs' ids (`S3.SS1.p2.1` belongs to
//     `S3.SS1`, not to `S3`), so the mapping must take the longest match;
//   * the heading's own tag ("III-A") is part of what a reader cites, and it
//     lives in a `<span class="ltx_tag">` that a naive strip-tags deletes;
//   * the abstract is `<p id="abstract1.1">`, whose id is not under any section,
//     so it cannot inherit a section locator — reading it as a section would be
//     the same mistake as citing the abstract as the body;
//   * a passage must be returned verbatim after whitespace collapsing, or the
//     quote cannot be checked against the stored bytes later.

import assert from 'node:assert/strict'
import test from 'node:test'

import {
  bodyText,
  splitSections,
  sectionForParagraph,
  passagesWithLocators,
  buildDeepNote,
} from '../../src/research/deepread.js'
import { gradeNote } from '../../src/research/note.js'

const HTML = `<!DOCTYPE html><html><body>
<section id="S1" class="ltx_section">
<h2 class="ltx_title ltx_title_section"><span class="ltx_tag ltx_tag_section">I </span><span id="S1.2" class="ltx_text ltx_font_smallcaps">Introduction</span></h2>
<p id="abstract1.1" class="ltx_p">This is the abstract, which is not a section.</p>
<p id="S1.p1.1" class="ltx_p">Harness edits are applied one at a time and scored in the next round.</p>
<p id="S1.p2.1" class="ltx_p">A rejected edit is still recorded, so its prediction can be measured later.</p>
</section>
<section id="S3" class="ltx_section">
<h2 class="ltx_title ltx_title_section"><span class="ltx_tag ltx_tag_section">III </span><span id="S3.2" class="ltx_text ltx_font_smallcaps">Method</span></h2>
<section id="S3.SS1" class="ltx_subsection">
<h3 class="ltx_title ltx_title_subsection"><span class="ltx_tag ltx_tag_subsection">III-A </span><span id="S3.SS1.1" class="ltx_text">Candidate acceptance</span></h3>
<p id="S3.SS1.p1.1" class="ltx_p">Acceptance requires a regression test: the edit is reverted unless held-in and held-out scores both rise.</p>
</section>
</section>
</body></html>`

test('a section id maps to its paragraphs by longest prefix, not by first match', () => {
  const sections = splitSections(HTML)
  assert.equal(sections.length, 3)
  assert.deepEqual(sections.map((s) => s.id), ['S1', 'S3', 'S3.SS1'])
  assert.equal(sectionForParagraph(sections, 'S3.SS1.p1.1').id, 'S3.SS1')
  assert.equal(sectionForParagraph(sections, 'S1.p2.1').id, 'S1')
  // An abstract lives outside every section and must not be assigned one.
  assert.equal(sectionForParagraph(sections, 'abstract1.1'), null)
  assert.equal(sectionForParagraph(sections, 'nonsense'), null)
})

test('the locator keeps the tag the reader would cite, and the section name', () => {
  const sub = splitSections(HTML).find((s) => s.id === 'S3.SS1')
  assert.equal(sub.tag, 'III-A')
  assert.equal(sub.title, 'Candidate acceptance')
  assert.match(sub.locator, /III-A/)
  assert.match(sub.locator, /Candidate acceptance/)
})

test('passages are verbatim, carry a locator, and never come from the abstract', () => {
  const hits = passagesWithLocators(HTML, ['regression', 'reverted', 'abstract'])
  const acceptance = hits.find((h) => /regression/.test(h.text))
  assert.ok(acceptance, 'expected the acceptance paragraph')
  assert.equal(acceptance.anchor, 'S3.SS1.p1.1')
  assert.match(acceptance.locator, /III-A/)
  // Collapsed whitespace, no tags, no entities left behind.
  assert.equal(
    acceptance.text,
    'Acceptance requires a regression test: the edit is reverted unless held-in and held-out scores both rise.',
  )
  assert.ok(!hits.some((h) => /^This is the abstract/.test(h.text)), 'the abstract is not a body passage')
  // Deterministic for the same input.
  assert.deepEqual(passagesWithLocators(HTML, ['regression', 'reverted', 'abstract']), hits)
})

test('a note built from body passages is one gradeNote accepts at depth full', () => {
  const note = buildDeepNote({
    paper: { id: '2604.25850', title: 'AHE', authors: ['Jiahang Lin'] },
    html: HTML,
    terms: ['regression', 'reverted', 'prediction'],
    gaps: [{ scope: 'table cell', text: 'the per-task table is not in this section' }],
  })
  assert.equal(note.depth, 'full')
  assert.equal(note.identity.identifier, 'arxiv:2604.25850')
  assert.ok(note.claims.length >= 2)
  for (const claim of note.claims) {
    assert.match(claim.locator, /§/)
    assert.ok(['author-claim', 'measurement', 'reader-inference'].includes(claim.type))
  }
  const graded = gradeNote(note)
  assert.deepEqual(graded.findings, [], `unexpected findings: ${JSON.stringify(graded.findings)}`)
  assert.equal(graded.ok, true)
})

test('a body with no matching passage yields a note that says so instead of inventing a claim', () => {
  const note = buildDeepNote({
    paper: { id: '2501.00001', title: 'no body', authors: ['A. Author'] },
    html: '<html><body><section id="S1"><h2><span class="ltx_tag">I </span>Intro</h2><p id="abstract1.1">only an abstract</p></section></body></html>',
    terms: ['only'],
  })
  assert.equal(note.claims.length, 0)
  assert.ok(note.gaps.length >= 1)
  assert.match(note.gaps[0].text, /body|full text/i)
  const graded = gradeNote(note)
  // A note with no claims is a bookmark, and the checker says exactly that.
  assert.equal(graded.ok, false)
  assert.ok(graded.findings.some((f) => f.code === 'claims-empty'))
})

test('bodyText strips the chrome a reader never cites', () => {
  const text = bodyText(`<html><head><style>.x{}</style></head><body>
    <nav>menu</nav><p id="S1.p1.1" class="ltx_p">Real <em>text</em> here.</p>
    <script>var x = 1</script></body></html>`)
  assert.match(text, /Real\s+text\s+here\./)
  assert.ok(!/menu|var x|\.x\{/.test(text))
})
