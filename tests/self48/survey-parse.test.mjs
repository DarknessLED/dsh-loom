// The survey driver parses two HTML pages: arXiv search results and arXiv's
// HTML rendering of a paper. Both are scraped, so both need a spec that fails
// when the site's markup shifts.
//
// These fixtures are trimmed captures of real pages, not hand-written markup:
// the paragraph classes below are the ones arXiv actually emits, and the
// bibliography block is the shape `arxiv.org/html/<id>` returns.

import assert from 'node:assert/strict'
import test from 'node:test'

import { parseSearchPage, parseBibliography } from '../../scripts/research-survey.mjs'

const SEARCH_PAGE = `
<ol class="breathe-horizontal">
  <li class="arxiv-result">
    <p class="list-title is-inline-block">
      <a href="https://arxiv.org/abs/2505.22954">arXiv:2505.22954</a>
      <span>&nbsp;[<a href="https://arxiv.org/pdf/2505.22954">pdf</a>]</span>
    </p>
    <p class="title is-5 mathjax">
      Darwin G&ouml;del Machine: Open-Ended Evolution of Self-Improving Agents
    </p>
    <p class="authors">
      <span class="has-text-black-bis has-text-weight-semibold">Authors:</span>
      <a href="/search/?searchtype=author&amp;query=Zhang%2C+J">Jenny Zhang</a>,
      <a href="/search/?searchtype=author&amp;query=Hu%2C+S">Shengran Hu</a>
    </p>
    <p class="abstract mathjax">
      <span class="abstract-full has-text-grey-dark mathjax">
        Self-improving agents modify their own code. We evaluate them with a
        coding benchmark and find that success rates rise while the verifier
        stays fixed. &#9661; Less
      </span>
    </p>
    <p class="is-size-7">
      <span class="has-text-black-bis has-text-weight-semibold">Submitted</span>
      19 November, 2026;
      <span class="has-text-black-bis has-text-weight-semibold">originally announced</span>
      November 2026.
    </p>
    <div class="tags has-addons">
      <span class="tag" data-tooltip="cs.AI">cs.AI</span>
    </div>
  </li>
  <li class="arxiv-result">
    <p class="list-title is-inline-block">
      <a href="https://arxiv.org/abs/2506.13131">arXiv:2506.13131</a>
    </p>
    <p class="title is-5 mathjax">AlphaEvolve: A coding agent for scientific discovery</p>
    <p class="authors">
      <a href="/search/?searchtype=author&amp;query=Novikov%2C+A">Alexander Novikov</a>
    </p>
    <p class="abstract mathjax">
      <span class="abstract-full has-text-grey-dark mathjax">Evolutionary search over programs.</span>
    </p>
    <p class="is-size-7">
      <span class="has-text-black-bis has-text-weight-semibold">Submitted</span>
      1 June, 2025;
      <span class="has-text-black-bis has-text-weight-semibold">originally announced</span>
      June 2025.
    </p>
  </li>
</ol>`

test('a search result page becomes paper records with identity, authors and a date', () => {
  const papers = parseSearchPage(SEARCH_PAGE)
  assert.equal(papers.length, 2)

  const [first, second] = papers
  assert.equal(first.id, '2505.22954')
  assert.match(first.title, /Darwin/)
  // The markup wraps the title across lines; the text must not keep a newline.
  assert.equal(first.title.includes('\n'), false)
  assert.deepEqual(first.authors, ['Jenny Zhang', 'Shengran Hu'])
  assert.match(first.abstract, /verifier stays fixed/)
  // "&#9661; Less" is chrome, not abstract text.
  assert.equal(first.abstract.includes('Less'), false, 'the collapse control leaked into the abstract')
  assert.equal(first.date, '2026-11-19')
  assert.equal(first.year, 2026)
  assert.deepEqual(first.categories, ['cs.AI'])

  assert.equal(second.id, '2506.13131')
  assert.equal(second.date, '2025-06-01')
  assert.equal(second.year, 2025)
})

test('an empty or malformed page yields no papers instead of throwing', () => {
  assert.deepEqual(parseSearchPage(''), [])
  assert.deepEqual(parseSearchPage(null), [])
  assert.deepEqual(parseSearchPage('<html><body>no results</body></html>'), [])
})

// A bibliography the way `arxiv.org/html/2505.22954` writes it: each entry is an
// `<li class="ltx_bibitem" id="bib.bib12">` whose spans hold authors, title and
// venue, and every in-text citation is `<a href="#bib.bib12">`.
const PAPER_HTML = `
<section id="S1"><p>Prior work
  <a class="ltx_ref" href="#bib.bib1"><span class="ltx_text">1</span></a>
  <a class="ltx_ref" href="#bib.bib1"><span class="ltx_text">1</span></a>
  <a class="ltx_ref" href="#bib.bib2"><span class="ltx_text">2</span></a>
</p></section>
<section id="S2"><p>Again
  <a class="ltx_ref" href="#bib.bib2"><span class="ltx_text">2</span></a>
</p></section>
<ul class="ltx_bibliography">
  <li class="ltx_bibitem" id="bib.bib1">
    <span class="ltx_bibblock">Jane Q. Author.</span>
    <span class="ltx_bibblock">A foundational paper on verifiers.</span>
    <span class="ltx_bibblock"><em>Journal of Tests</em>, 2019. arXiv:1905.10985.</span>
  </li>
  <li class="ltx_bibitem" id="bib.bib2">
    <span class="ltx_bibblock">Other Author and Third Writer.</span>
    <span class="ltx_bibblock">Another paper that compares methods.</span>
    <span class="ltx_bibblock">In <em>NeurIPS</em>, 2024.</span>
  </li>
</ul>`

test('a paper bibliography becomes entries with the right in-text citation counts', () => {
  const { entries, counts } = parseBibliography(PAPER_HTML)
  assert.equal(entries.length, 2)

  const [first, second] = entries
  assert.equal(first.key, 'bib.bib1')
  assert.equal(counts.get('bib.bib1'), 2)
  assert.equal(counts.get('bib.bib2'), 2)
  assert.match(first.authors, /Jane Q\. Author/)
  assert.match(first.title, /foundational paper/)
  assert.equal(first.venue, 'Journal of Tests')
  // The arXiv id looks exactly like a year. It must be read as an id, and the
  // year must come from the venue line, not from "1905".
  assert.equal(first.arxivId, '1905.10985')
  assert.equal(first.year, 2019, 'the arXiv id was read as a publication year')

  assert.equal(second.arxivId, null)
  assert.equal(second.year, 2024)
  assert.equal(second.venue, 'NeurIPS')
})

test('the citation count stops at the bibliography, so a listed work is not counted as cited', () => {
  // Some renderings repeat the anchor inside the bibliography entry itself.
  const html = `
    <p>see <a href="#bib.bib1">1</a></p>
    <ul class="ltx_bibliography">
      <li class="ltx_bibitem" id="bib.bib1"><span class="ltx_bibblock">A.</span></li>
    </ul>
    <p>afterward <a href="#bib.bib1">1</a></p>`
  const { counts } = parseBibliography(html)
  assert.equal(counts.get('bib.bib1'), 1, 'an anchor after the bibliography leaked into the count')
})

test('a bibliography with no parseable entries does not throw', () => {
  assert.deepEqual(parseBibliography(''), { entries: [], counts: new Map() })
  assert.deepEqual(parseBibliography(null), { entries: [], counts: new Map() })
  const { entries } = parseBibliography('<ul class="ltx_bibliography"></ul>')
  assert.deepEqual(entries, [])
})

// --- merging many bibliographies into one map of the field -----------------
//
// This is where the first real run went wrong: keying a work by its arXiv id
// split "DeepSeekMath" into two foundations (18 papers cited it with the id, 9
// without), and a stripped year left a dangling " ." in every title.

const { aggregateCitations } = await import('../../scripts/research-survey.mjs')

function traceOf(id, entries) {
  return { paper: { id, title: `paper ${id}` }, entries }
}

test('one work cited with and without its arXiv id is one row, not two', () => {
  const traces = [
    traceOf('p1', [{ key: 'bib.bib1', title: 'DeepSeekMath: Pushing the Limits', year: 2024, arxivId: '2402.03300', cited: 5 }]),
    traceOf('p2', [{ key: 'bib.bib7', title: 'DeepSeekMath: Pushing the Limits', year: 2024, arxivId: null, cited: 2 }]),
  ]
  const { works } = aggregateCitations(traces)
  assert.equal(works.length, 1, 'the same title was counted as two different works')
  assert.equal(works[0].citedByPapers, 2)
  assert.equal(works[0].citationsWithinPapers, 7)
  // Whichever entry carried the id supplies it for the merged row.
  assert.equal(works[0].arxivId, '2402.03300')
})

test('a title that ends in its publication year keeps its punctuation tidy', () => {
  // "..., 2025." is what arXiv's bibliography blocks look like; the year has its
  // own column, and dropping it once left "Title ." with a stray space.
  const traces = [traceOf('p1', [{ key: 'bib.bib1', title: 'DAPO: an open-source system , 2025', year: 2025, arxivId: null, cited: 3 }])]
  const { works } = aggregateCitations(traces)
  assert.equal(works[0].title.endsWith(' '), false)
  assert.equal(/ \.$/.test(works[0].title), false, `stray space before punctuation: ${JSON.stringify(works[0].title)}`)
})
