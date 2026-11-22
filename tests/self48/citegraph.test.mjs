// A survey is judged by what it read, not by what it searched.
//
// The hand pass in `docs/research-2026-11-22.md` had a hole a reviewer would
// name immediately: ten sources per direction, no citation backtrace, and no
// distinction between a paper the direction is built on and a paper one author
// mentioned once. Real literature work goes the other way — you start at a SOTA
// paper, read its related work, and follow the works it keeps citing. That is a
// decidable property of the HTML: which bibliography entries have the most
// in-text citation anchors.
//
// Everything here is a pure function over a page's HTML, so the rules can be
// pinned without a network.
import assert from 'node:assert/strict'

import {
  arxivIdOf,
  citationCounts,
  comparedWorks,
  followupQueriesFrom,
  parseBibEntries,
  rankReferences,
  sectionHeadings,
} from '../../src/research/citegraph.js'

let passed = 0
let failed = 0
function ok(name) {
  passed++
  console.log(`ok ${passed + failed} - ${name}`)
}

const PAGE = `<!DOCTYPE html><html><body>
<h2 class="ltx_title ltx_title_section" id="S2">2 Related Work</h2>
<p>Compare <a href="#bib.bib1">[1]</a>, <a href="#bib.bib2">[2]</a> and again <a href="#bib.bib1">[1]</a>.</p>
<p>Later <a href="#bib.bib1">[1]</a>, <a href="#bib.bib3">[3]</a>.</p>
<h2 class="ltx_title ltx_title_section" id="S3">3 Method</h2>
<p>Built on <a href="#bib.bib3">[3]</a>.</p>
<h2 class="ltx_title ltx_title_bibliography">References</h2>
<ul class="ltx_biblist">
<li id="bib.bib1" class="ltx_bibitem"><span class="ltx_tag ltx_role_refnum ltx_tag_bibitem">[1]</span> <span class="ltx_bibblock"> Alice A, Bob B, and Carol C. </span> <span class="ltx_bibblock">Alpha method for durable things. </span> <span class="ltx_bibblock">In <em id="bib.bib1.1" class="ltx_emph">Proceedings of X</em>, pages 1&ndash;9, 2021. </span></li>
<li id="bib.bib2" class="ltx_bibitem"><span class="ltx_tag ltx_role_refnum ltx_tag_bibitem">[2]</span> <span class="ltx_bibblock"> Dan D. </span> <span class="ltx_bibblock">Beta: a smaller baseline. </span> <span class="ltx_bibblock"> arXiv:2408.08435, 2024. </span></li>
<li id="bib.bib3" class="ltx_bibitem"><span class="ltx_tag ltx_role_refnum ltx_tag_bibitem">[3]</span> <span class="ltx_bibblock"> Erin E. </span> <span class="ltx_bibblock">Gamma benchmark suite. </span> <span class="ltx_bibblock"> In <em>NeurIPS</em>, 2023. <a href="https://example.test/gamma">code</a> </span></li>
</ul>
</body></html>`

// --- what the bibliography says ------------------------------------------

{
  const entries = parseBibEntries(PAGE)
  assert.equal(entries.length, 3, `three entries, got ${entries.length}`)
  const first = entries[0]
  assert.equal(first.key, 'bib.bib1')
  assert.equal(first.ref, '[1]')
  assert.equal(first.title, 'Alpha method for durable things.')
  assert.equal(first.year, 2021)
  assert.equal(first.authors, 'Alice A, Bob B, and Carol C.')
  assert.match(first.venue ?? '', /Proceedings of X/)
  assert.equal(entries[1].arxivId, '2408.08435', 'an arXiv id in the text is recognised')
  assert.equal(entries[2].url, 'https://example.test/gamma', 'a link in the entry is kept')
}
ok('a bibliography entry yields ref, authors, title, year, venue and any arXiv id')

{
  assert.deepEqual(parseBibEntries(''), [], 'nothing in, nothing out')
  assert.deepEqual(parseBibEntries(null), [])
  assert.deepEqual(parseBibEntries('<div>no bibliography here</div>'), [])
  assert.deepEqual(parseBibEntries('<ul class="ltx_biblist"><li class="ltx_bibitem">junk</li></ul>'), [], 'an entry without an id is not a reference')
}
ok('junk pages produce no references instead of throwing')

// --- how often the paper leans on each one --------------------------------

{
  const counts = citationCounts(PAGE)
  assert.equal(counts.get('bib.bib1'), 3, 'three in-text citations of [1]')
  assert.equal(counts.get('bib.bib3'), 2)
  assert.equal(counts.get('bib.bib2'), 1)
  const ranked = rankReferences(parseBibEntries(PAGE), counts)
  assert.deepEqual(
    ranked.map((r) => r.key),
    ['bib.bib1', 'bib.bib3', 'bib.bib2'],
    'most-cited first',
  )
  assert.equal(ranked[0].cited, 3)
  assert.equal(ranked[2].cited, 1)
}
ok('in-text citation anchors decide which references the paper leans on')

{
  const counts = citationCounts(PAGE)
  const entries = parseBibEntries(PAGE)
  const compared = comparedWorks(entries, counts, { minCited: 2 })
  assert.deepEqual(compared.map((c) => c.key), ['bib.bib1', 'bib.bib3'], 'only works cited at least twice')
  assert.deepEqual(comparedWorks(entries, counts, { minCited: 5 }), [], 'a high bar excludes everything')
  const ranked = rankReferences(entries, new Map())
  assert.equal(ranked[0].cited, 0, 'an uncited reference is still listed, with zero')
}
ok('compared works are the ones cited more than once, and the bar is a parameter')

// --- the backtrace: which queries to send next ----------------------------

{
  const entries = parseBibEntries(PAGE)
  const counts = citationCounts(PAGE)
  const queries = followupQueriesFrom(entries, counts, { limit: 2 })
  assert.equal(queries.length, 2, `two queries, got ${JSON.stringify(queries)}`)
  assert.ok(queries[0].includes('Alpha method'), `most-cited first, got ${queries[0]}`)
  assert.ok(queries[0].includes('2021'), `the year is part of the query, got ${queries[0]}`)
  assert.ok(queries.some((q) => q.includes('Gamma benchmark')), 'the second most-cited follows')
  const excluding = followupQueriesFrom(entries, counts, { limit: 5, exclude: ['alpha method for durable things'] })
  assert.ok(!excluding.some((q) => /alpha/i.test(q)), 'a work already seen is not asked for again')
  assert.ok(excluding.length >= 1)
  assert.deepEqual(followupQueriesFrom([], new Map()), [])
}
ok('the backtrace asks for the works the paper kept citing, newest evidence first')

// --- identity helpers -----------------------------------------------------

{
  assert.equal(arxivIdOf({ text: 'see arXiv:2408.08435v2 for details' }), '2408.08435')
  assert.equal(arxivIdOf({ url: 'https://arxiv.org/abs/2505.22954' }), '2505.22954')
  assert.equal(arxivIdOf({ url: 'https://arxiv.org/pdf/2505.22954v3.pdf' }), '2505.22954')
  assert.equal(arxivIdOf({ url: 'https://example.test/paper' }), null)
  assert.equal(arxivIdOf(null), null)
  assert.equal(arxivIdOf({ title: 'no id anywhere' }), null)
}
ok('a paper id is read out of a URL or a citation string, and absence is null')

{
  const headings = sectionHeadings(PAGE)
  assert.ok(headings.some((h) => /Related Work/.test(h)), `related work is visible in the structure, got ${JSON.stringify(headings)}`)
  assert.ok(headings.some((h) => /References/.test(h)))
  assert.deepEqual(sectionHeadings(''), [])
}
ok('section headings let a reader find the related-work and results sections')

console.log(`# passed ${passed}, failed ${failed}`)
process.exit(failed === 0 ? 0 : 1)
