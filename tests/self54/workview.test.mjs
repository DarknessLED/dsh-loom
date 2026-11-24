// One record, two readers.
//
// The agent-side library is a JSON structure with fields, vectors and edges; the
// human-side library is Markdown a person reads. If those two are built by two
// pieces of code, they drift, and the drift is invisible: the page keeps saying
// what the record stopped saying.
//
// So `workview.js` renders both from the same record, and it has one rule that
// matters more than the layout: the two things a machine cannot produce -- why a
// work works and what it is worth -- are never filled in by a generator. A work
// with no hand-written reading prints "no one has written this yet" in those
// words, in the place the summary belongs.
import assert from 'node:assert/strict'

import { renderWorkMarkdown, agentDigest, renderLibraryMarkdown, WORK_SECTIONS, cleanText } from '../../src/research/workview.js'
import { buildWorkRecord, indexOfWorks } from '../../src/research/workrecord.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const LONG_A =
  'We keep a held-out set that the proposer never sees and rerank every candidate edit against it, so the score a round reports is measured on data the edit could not have been tuned on. The set is rebuilt from a different seed each campaign, which stops a fixed held-out window from being memorised across rounds.'
const LONG_B =
  'The gate consumes the two readings as a pair: when the candidate and the baseline disagree the pair is evidence, and when they agree it is not. A campaign therefore buys its way to a decision through discordant pairs rather than through a run of lucky rounds, and a tie costs a pair without producing one.'
const record = buildWorkRecord({
  id: '2601.00001',
  html: `<html><body><h1 class="ltx_title_document">A Pipeline For Honest Gates</h1>
<section id="S1" class="ltx_section"><h2><span class="ltx_tag ltx_tag_section">1</span>Introduction</h2>
<p id="S1.p1.1" class="ltx_p">Agent loops reward the number they measure, and a verifier that reports one number per round gets optimised against instead of with.</p></section>
<section id="S3" class="ltx_section"><h2><span class="ltx_tag ltx_tag_section">3</span>Method</h2>
<figure id="S3.F1" class="ltx_figure"><img src="2601.00001v1/gate.png"><figcaption class="ltx_caption"><span class="ltx_tag ltx_tag_figure">Figure 1: </span>The gate in one picture.</figcaption></figure>
<section id="S3.SS1" class="ltx_section"><h3><span class="ltx_tag ltx_tag_section">3.1</span>Held-out reranking</h3>
<p id="S3.SS1.p1.1" class="ltx_p">${LONG_A}</p></section>
<section id="S3.SS2" class="ltx_section"><h3><span class="ltx_tag ltx_tag_section">3.2</span>Paired evidence</h3>
<p id="S3.SS2.p1.1" class="ltx_p">${LONG_B}</p></section></section>
<section id="S5" class="ltx_section"><h2><span class="ltx_tag ltx_tag_section">5</span>Limitations</h2>
<p id="S5.p1.1" class="ltx_p">Two benchmarks only, and the held-out pool is smaller than the task set.</p></section>
</body></html>`,
  origin: 'https://arxiv.org/html/2601.00001',
  abstract: 'A gate that treats agreement as no evidence.',
  year: 2026,
})

const page = renderWorkMarkdown(record)
for (const heading of WORK_SECTIONS) {
  assert.ok(page.includes(`## ${heading}`), `the page has a ${heading} section`)
}
const order = WORK_SECTIONS.map((heading) => page.indexOf(`## ${heading}`))
assert.deepEqual([...order].sort((a, b) => a - b), order, 'the sections are in the order a reader needs them')
ok('a page has the five sections in reading order')

assert.match(page, /No one has written the summary yet/)
assert.match(page, /还没有人写这一段/)
assert.doesNotMatch(page, /It connects to/, 'no connections are invented when no one wrote any')
ok('a missing summary is named, not generated')

assert.match(page, /```mermaid\nflowchart LR/)
// The figure lives under the versioned html directory, not under the bare id:
// the old shape was a 404 for every one of the 101 figures in the libraries.
assert.match(page, /!\[The gate in one picture\.\]\(https:\/\/arxiv\.org\/html\/2601\.00001v1\/gate\.png\)/)
ok('the diagram and the drawn figure both survive into the page')

// Every mechanism point is on the page with its locator, at full length: a page
// that truncated them would read as a summary of a summary.
for (const point of record.mechanisms) {
  assert.ok(page.includes(point.text), `${point.locator} is quoted in full`)
}
assert.match(page, /§3\.1 Held-out reranking/)
assert.match(page, /§3\.2 Paired evidence/)
ok('each mechanism is quoted in full with the section it came from')

assert.match(page, /\*\*The authors say:\*\* Two benchmarks only/)
assert.doesNotMatch(page, /does not claim to know the failure modes/, 'the authors did state limits, so the page does not claim it knows none')
assert.doesNotMatch(page, /What a reader should still not conclude/, 'no reader wrote caveats, so none are printed')
ok('the authors’ limits are separated from what a reader adds')

const reading = {
  by: 'a reader who signed it',
  summary: 'This is the first paper in the corpus that treats a score as evidence rather than as a reading, and that is why its gate survives replays.',
  connects: [{ id: '2602.00002', why: 'same paired-e-process arithmetic, different name' }],
  caveats: ['The held-out pool is smaller than the task set, so the pair count per campaign is small.'],
}
const read = renderWorkMarkdown(record, { reading, similar: [{ id: '2602.00002', title: 'PACE', similarity: 0.81, basis: 'vector' }] })
// Who wrote it is part of what it is: a page that credits "a person" for an
// agent's reading is the same failure as a page that has no reading at all.
assert.match(read, /Written by a reader who signed it after reading the paper/)
const unsigned = renderWorkMarkdown(record, { reading: { summary: 'A summary with no author on it.' } })
assert.match(unsigned, /Written by an unnamed reader/, 'an unsigned reading is named as unsigned, not credited to nobody')
assert.match(read, /treats a score as evidence/)
assert.match(read, /\*\*It connects to\*\*/)
assert.match(read, /`2602\.00002` — same paired-e-process arithmetic/)
assert.match(read, /Nearly the same vocabulary/)
assert.match(read, /\(0\.81\)/)
assert.match(read, /What a reader should still not conclude/)
assert.doesNotMatch(read, /No one has written the summary yet/)
ok('a hand-written reading fills the summary, the connections and the caveats')

// A work with no method and no limitations: both absences are stated, neither
// is papered over.
const bare = buildWorkRecord({
  id: '2601.99999',
  html: `<html><body><h1 class="ltx_title_document">Short Note</h1><section id="S1" class="ltx_section"><h2><span class="ltx_tag ltx_tag_section">1</span>Introduction</h2><p id="S1.p1.1" class="ltx_p">A problem statement and nothing else, because the rest of the paper is a chart.</p></section></body></html>`,
  origin: 'https://arxiv.org/html/2601.99999',
})
const barePage = renderWorkMarkdown(bare)
assert.match(barePage, /no method section was found, so there is no pipeline to draw/)
assert.match(barePage, /No method section was found/)
assert.match(barePage, /No limitations section and no reader notes/)
ok('a work with nothing to quote says so in all three places')

const index = indexOfWorks([record, { id: '2602.00002', title: 'PACE', references: [{ arxivId: '2601.00001' }] }])
const digest = agentDigest([record, { id: '2602.00002', title: 'PACE' }], { index })
assert.equal(digest.length, 2)
const first = digest[0]
for (const field of ['id', 'title', 'year', 'origin', 'motivation', 'pipeline', 'mechanisms', 'limitations', 'cites', 'citedBy', 'vector']) {
  assert.ok(Object.prototype.hasOwnProperty.call(first, field), `the digest has ${field}`)
}
assert.equal(first.limitations.text.length > 0, true)
assert.deepEqual(first.citedBy, ['2602.00002'], 'the digest reads the citation graph')
assert.equal(first.vector.length, 256)
assert.equal(first.mechanisms.every((point) => point.chars >= 200), true)
// The second record was never read: its fields are present and null, so an
// agent can tell "nothing found" from "field missing".
const second = digest[1]
assert.equal(second.motivation, null)
assert.equal(second.pipeline, null)
assert.deepEqual(second.mechanisms, [])
assert.equal(second.limitations, null)
ok('the agent digest has every field present, null rather than missing')

const library = renderLibraryMarkdown([record], { slug: 'r1-verifier', index, date: '2026-11-24' })
assert.match(library, /# Library: r1-verifier/)
assert.match(library, /Built from arXiv HTML bodies on 2026-11-24/)
assert.match(library, /\| work \| year \| mechanism points \| figure \| cited by \| summary \|/)
assert.match(library, /Summaries written: 0 of 1/)
assert.match(library, /no one has written why they work yet/)
const withReading = renderLibraryMarkdown([record], { slug: 'r1-verifier', index, readings: { '2601.00001': { summary: 'why it works' } } })
assert.match(withReading, /Summaries written: 1 of 1/)
assert.doesNotMatch(withReading, /no one has written why they work yet/)
ok('the library page counts the summaries and names the ones still missing')

// cleanText collapses the whitespace a quote carries from the HTML; without it a
// table cell breaks on the first newline inside a mechanism.
assert.equal(cleanText('a\n\n  b\t c '), 'a b c')
assert.equal(cleanText(undefined), '')
ok('quoted text is collapsed before it reaches a table cell')

console.log(`\n${pass} checks passed`)
