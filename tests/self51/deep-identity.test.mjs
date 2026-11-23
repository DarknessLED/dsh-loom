// Reading the paper the survey named, not the paper the id happened to reach.
//
// Three bodies in the r1–r8 pass showed that "fetch the id and read it" is not
// the same claim as "read this paper":
//
//   * a citing paper wrote `arXiv:1903.11059` next to Hyperband's title, but
//     that id is AlphaX. Fetching it returns a real, readable, *wrong* paper —
//     the worst failure mode, because the note grades ok and the claim quotes a
//     sentence nobody asked about;
//   * `1707.06347` (PPO) has no rendered body at all: arXiv serves a stub
//     saying "See pages 1-last of ppo-min.pdf", which is not a paper to read;
//   * two older HTML5 renderings have no document title element, so `<title>`
//     says "1Introduction" and the note is filed under a section heading.
//
// The rules are therefore: a title has to look like a title before it is
// trusted, an unrendered stub is reported as unread rather than as a paper with
// no passages, and an expected title that does not match the fetched one stops
// the deposit instead of quietly re-labelling the evidence.
import assert from 'node:assert/strict'
import test from 'node:test'

import { documentTitle, titleSimilarity, bodyIsUnrendered } from '../../src/research/deepread.js'

const page = ({ title = '', h1 = '', span = '' } = {}) =>
  `<html><head><title>${title}</title></head><body>${span}${h1}<p id="S1.p1.1">Body text that is long enough to be a paragraph.</p></body></html>`

test('the document title is preferred over the title tag', () => {
  const html = `<html><head><title>1Introduction</title></head><body><h1 class="ltx_title ltx_title_document">Hyperband: A Novel Bandit-Based Approach</h1><p id="S1.p1.1">x</p></body></html>`
  assert.equal(documentTitle(html), 'Hyperband: A Novel Bandit-Based Approach')
})

test('a junk title is not a title', () => {
  // "Untitled Document" is what LaTeXML writes when it has no title; "1
  // Introduction" is the first section heading it found. Both would file the
  // note under a name no reader can search for.
  for (const junk of ['Untitled Document', '1Introduction', '1 Introduction', '', '  ']) {
    const html = page({ title: junk })
    assert.equal(documentTitle(html), '', `"${junk}" must not be returned as a title`)
  }
})

test('a stub body is unrendered rather than empty', () => {
  const stub = page({ title: 'Proximal Policy Optimization Algorithms' })
  stub.replace ? null : null
  const html = `<html><head><title>x</title></head><body>See pages 1-last of ppo-min.pdf</body></html>`
  assert.equal(bodyIsUnrendered(html), true)
  const real = `<html><head><title>x</title></head><body><section id="S1"><p id="S1.p1.1">${'real sentence '.repeat(20)}</p></section></body></html>`
  assert.equal(bodyIsUnrendered(real), false)
  // A bare "See pages" string in an otherwise rendered paper is not a stub.
  const cited = `<html><body><section id="S1"><p id="S1.p1.1">${'real sentence '.repeat(20)} See pages 1-last of appendix.pdf</p></section></body></html>`
  assert.equal(bodyIsUnrendered(cited), false)
})

test('similarity ignores punctuation, case and the arXiv quirks in titles', () => {
  // The same title arrives with a superscript lost, a diaeresis rewritten, or
  // wrapped in the quotes a bibliography added; none of those is a different
  // paper.
  assert.ok(titleSimilarity('Harness²: A Family of Harnesses', 'Harness : A Family of Harnesses') > 0.7)
  assert.ok(titleSimilarity('Gödel Agent', 'G"odel Agent') > 0.6)
  assert.ok(titleSimilarity('“Hyperband: A Novel Bandit-Based Approach.”', 'Hyperband: A Novel Bandit-Based Approach') > 0.9)
  assert.ok(titleSimilarity('Hyperband: A Novel Bandit-Based Approach', 'AlphaX: eXploring Neural Architectures') < 0.3)
})

test('a title that swallowed the author block is still that title', () => {
  // MAP-Elites (`1504.04909`) renders its whole front matter as one <title>:
  // "Illuminating search spaces by mapping elites Jean-Baptiste Mouret 1 and
  // Jeff Clune 2 1 Université Pierre et Marie Curie..." Word overlap scores
  // 0.16, which would call the right paper the wrong one and refuse to read it.
  const swallowed =
    'Illuminating search spaces by mapping elites Jean-Baptiste Mouret 1 and Jeff Clune 2 1 Université Pierre et Marie Curie-Paris 6, CNRS UMR 7222, France 2 University of Wyoming, USA Preprint – August 24, 2026'
  assert.equal(titleSimilarity('Illuminating search spaces by mapping elites', swallowed), 1)
  // Containment must not turn a short generic title into a match for anything:
  // every word of "A survey" appears in that page too.
  assert.ok(titleSimilarity('A survey', swallowed) < 0.5)
})
