// A thin reading must say it is thin, and a claim cannot be stronger than the
// page it came from.
//
// `gradeNote` (src/research/note.js) already refuses a mechanism claim read off
// an abstract: a claim cannot exceed the depth the note declares. What it cannot
// see is that a "full" reading of a paper whose body yielded two passages is not
// a full reading in the way a paper that yielded forty is. The note declares
// `full` because HTML was fetched, and every claim in it then passes the depth
// check on that declaration alone — the paper's own thinness never enters.
//
// The literature this repository already read says the distinction matters:
// arXiv 2501.04227 §1 measures a 6.1 vs 3.8 gap between what a thorough and a
// quick reading of the same material yields. So a reading with almost nothing
// to quote is marked `shallow`, and a mechanism or evaluation claim from a
// shallow reading is a gap in the note regardless of the declared depth.
//
// The threshold is deliberately low (fewer than three quotable passages). A
// paper that yields two usable paragraphs has not been read structurally, and
// calling that "full" is the thing this spec exists to stop.
import assert from 'node:assert/strict'
import { gradeNote } from '../../src/research/note.js'
import { buildDeepNote, passagesWithLocators } from '../../src/research/deepread.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const identity = { title: 'A paper', authors: ['A. Author'], identifier: 'arxiv:2601.00001' }

// 1. A shallow reading is marked shallow by the builder itself.
// arXiv HTML the way arXiv writes it: paragraphs carry an id, and the section
// they belong to is the longest id prefix among the declared sections. A flat
// <h2> is not a section, and a paragraph outside every section is not quotable —
// which is why the fixture has the shape the real pages have.
const section = (id, tag, title, body) =>
  `<section id="${id}" class="ltx_section">` +
  `<h2 class="ltx_title ltx_title_section"><span class="ltx_tag ltx_tag_section">${tag} </span>` +
  `<span id="${id}.2" class="ltx_text">${title}</span></h2>${body}</section>`

const thinHtml = section(
  'S3',
  'III',
  'Method',
  '<p id="S3.p1.1" class="ltx_p">The verifier is trained on verifier data drawn from the same pool as the candidate.</p>',
)
const thin = buildDeepNote({
  paper: { id: '2601.00001', title: 'A paper', authors: ['A. Author'] },
  html: thinHtml,
  terms: ['verifier'],
})
assert.equal(thin.shallow, true, 'one quotable passage is a shallow reading')
assert.equal(thin.depth, 'full', 'the depth is still what was actually fetched')

const richHtml = section(
  'S3',
  'III',
  'Method',
  [
    '<p id="S3.p1.1" class="ltx_p">The verifier is trained on verifier data drawn from the same pool as the candidate.</p>',
    '<p id="S3.p2.1" class="ltx_p">The verifier is scored against verifier labels that never enter the candidate pool itself.</p>',
    '<p id="S3.p3.1" class="ltx_p">The verifier is used to filter verifier candidates before the next round begins.</p>',
  ].join(''),
)
const rich = buildDeepNote({
  paper: { id: '2601.00001', title: 'A paper', authors: ['A. Author'] },
  html: richHtml,
  terms: ['verifier'],
})
assert.equal(rich.shallow, false, 'three quotable passages is a structural reading')
assert.equal(passagesWithLocators(richHtml, ['verifier']).length, 3, 'and the passage count is what decides it')
ok('the builder marks a thin reading, and the mark follows the passage count')

// 2. A shallow note with a mechanism claim fails even though depth is `full`.
const shallowNote = {
  depth: 'full',
  shallow: true,
  identity,
  claims: [
    { id: 'c1', section: 'mechanism', type: 'author-claim', text: 'the verifier is trained on verifier data', locator: 'II Method' },
  ],
  gaps: [],
}
const graded = gradeNote(shallowNote)
assert.equal(graded.ok, false, 'a shallow reading cannot carry a mechanism claim')
assert.ok(
  graded.findings.some((f) => f.code === 'depth-exceeds-reading' && /shallow/.test(f.detail)),
  `expected a depth-exceeds-reading naming shallow, got ${JSON.stringify(graded.findings)}`,
)

// 3. The same note without `shallow` passes: the rule is the mark, not the prose.
const unflagged = gradeNote({ ...shallowNote, shallow: undefined })
assert.equal(unflagged.ok, true, 'without the mark the depth declaration is all the checker has')
ok('a shallow mark weakens the depth check, and only the mark does')

// 4. A shallow note may still state problems and headline results — those are
//    what an abstract-level reading legitimately gives you.
const shallowOk = gradeNote({
  depth: 'abstract',
  shallow: true,
  identity,
  claims: [
    { id: 'c1', section: 'problem', type: 'author-claim', text: 'verifiers are unreliable', locator: 'I Introduction' },
    { id: 'c2', section: 'contributions', type: 'author-claim', text: 'a new verifier', locator: 'I Introduction' },
  ],
  gaps: [],
})
assert.equal(shallowOk.ok, true, 'shallow still permits what a shallow reading can honestly say')
ok('shallow narrows the ceiling instead of banning the note')

// 5. The finding names the reading, not the claim, so a reader knows which paper
//    to go back to.
const detail = graded.findings.find((f) => f.code === 'depth-exceeds-reading').detail
assert.ok(/only read|shallow/i.test(detail), `detail should name the shallow reading, got "${detail}"`)
ok('the finding says which reading was too thin')
