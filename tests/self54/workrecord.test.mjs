// One work, read as a record rather than a page.
//
// The survey documents answer "what does this field cite" and the deep notes
// answer "what does this paper say on page X". Neither is a record an agent can
// query: there is no field for the starting point, no diagram of the pipeline,
// no place where the mechanisms of one paper can be compared with the
// mechanisms of another. This spec pins the record that fills that gap.
//
// Four rules are load-bearing and each has a fixture that fails without it:
//
//   * a mechanism point is never shorter than 200 characters, and when one
//     subsection cannot reach that, adjacent subsections are merged and the
//     merge is recorded rather than hidden;
//   * a figure URL is resolved against the paper's own HTML directory, because
//     arXiv writes src="2601.00001v1/pipeline.png" and a naive join produces
//     ".../htmlpipeline.png";
//   * the vector is deterministic and unit length, so two builds of the same
//     bytes can be compared and cosine similarity is a dot product;
//   * a missing figure or a missing limitation is `null` with a reason, never
//     an invented one.
import assert from 'node:assert/strict'

import {
  buildWorkRecord,
  figureUrl,
  mergeToMinimum,
  pipelineMermaid,
  workVector,
  cosine,
  indexOfWorks,
  similarTo,
  MECHANISM_MIN_CHARS,
  VECTOR_SIZE,
} from '../../src/research/workrecord.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const TAG = (tag) => `<span class="ltx_tag ltx_tag_section">${tag}</span>`
const P = (id, text) => `<p id="${id}" class="ltx_p">${text}</p>`
const H = (level, tag, title) => `<h${level}>${TAG(tag)}${title}</h${level}>`
const S = (id, level, tag, title, body) =>
  `<section id="${id}" class="ltx_section">${H(level, tag, title)}${body}</section>`

const LONG =
  'We encode the observation with a frozen visual backbone and project it into the language model embedding space, which keeps the training signal on the adapter while leaving the perception weights untouched. '
const FIXTURE = `<html><head><title>Pipeline Paper</title></head><body>
${S('S1', 2, '1', 'Introduction', P('S1.p1.1', 'Agents fail because the verifier is noisy, and a noisy verifier rewards the wrong edit repeatedly. ') + P('S1.p2.1', 'We ask what makes a verifier trustworthy in practice rather than in a single reported number. '))}
${S('S3', 2, '3', 'Method', P('S3.p1.1', 'The pipeline has two stages, an adapter and a reranker, described below. ') +
  `<figure id="S3.F1" class="ltx_figure"><img src="2601.00001v1/pipeline.png" class="ltx_graphics" alt="Refer to caption"><figcaption class="ltx_caption"><span class="ltx_tag ltx_tag_figure">Figure 1: </span>Overview of the two-stage pipeline.</figcaption></figure>` +
  S('S3.SS1', 3, '3.1', 'Adapter', P('S3.SS1.p1.1', LONG)) +
  S('S3.SS2', 3, '3.2', 'Reranker', P('S3.SS2.p1.1', 'The reranker scores every candidate edit against a held-out set that the proposer never sees, keeps the top half by the verifier it is trying to improve, and records the score of the ones it dropped so a later round can tell a real regression from a lucky sample. ')) +
  S('S3.SS3', 3, '3.3', 'Budget', P('S3.SS3.p1.1', 'Each stage costs about 0.02 USD per round on the evaluation harness. ')))}
${S('S5', 2, '5', 'Limitations', P('S5.p1.1', 'We only test on three benchmarks and the adapter is not trained end to end. '))}
</body></html>`

const abstract = 'A two-stage pipeline that keeps a verifier honest by reranking candidate edits against a held-out set.'

const record = buildWorkRecord({ id: '2601.00001', html: FIXTURE, origin: 'https://arxiv.org/html/2601.00001', abstract })

assert.equal(record.id, '2601.00001')
assert.equal(record.title, 'Pipeline Paper')
assert.match(record.motivation.text, /verifier is noisy/, 'the motivation is the paragraph that names the problem')
assert.match(record.motivation.locator, /Introduction/)
ok('a record starts from what the paper says is wrong')

assert.equal(record.pipeline.figure.src, '2601.00001v1/pipeline.png')
// arXiv writes src relative to the paper's *versioned* html directory, so the
// version segment replaces the id instead of following it. The old expectation
// here pinned the 404 form; see tests/self55/figure-url.test.mjs for the three
// verified shapes.
assert.equal(record.pipeline.figure.url, 'https://arxiv.org/html/2601.00001v1/pipeline.png')
assert.equal(record.pipeline.figure.inMethod, true, 'the figure inside the method is preferred over a teaser')
assert.match(record.pipeline.figure.caption, /two-stage pipeline/)
ok('the drawn figure is kept with an absolute url and its caption')

assert.match(record.pipeline.mermaid, /^flowchart/)
assert.match(record.pipeline.mermaid, /Adapter/)
assert.match(record.pipeline.mermaid, /-->/)
ok('the pipeline is a diagram of the paper’s own subsections')

for (const point of record.mechanisms) {
  assert.ok(point.chars >= MECHANISM_MIN_CHARS, `${point.locator} has ${point.chars} chars, under the minimum`)
}
assert.ok(record.mechanisms.length >= 2, `expected at least two mechanisms, got ${record.mechanisms.length}`)
const merged = record.mechanisms.find((point) => point.merged > 1)
assert.ok(merged, 'two short subsections were merged into one point')
// The lead-in paragraph of the method section ("two stages, an adapter and a
// reranker") is not a mechanism on its own; it is folded into the first stage it
// announces, and both locators are kept so a reader can check the merge.
assert.match(merged.locator, /Method/)
assert.ok(merged.sections.some((section) => /3\.1/.test(section.locator)), 'the merged point names both sections')
assert.equal(merged.merged, merged.sections.length, 'the count and the list of sections agree')
ok('a mechanism point is at least 200 characters, and a merge says so')

assert.match(record.limitations.text, /only test on three benchmarks/)
assert.match(record.limitations.locator, /Limitations/)
ok('the authors’ own limits are quoted, not inferred')

// mergeToMinimum: long points pass through, short neighbours combine, order is
// never changed, and a lone trailing stub joins the point before it.
const points = [
  { locator: '§1 a', title: 'a', text: 'x'.repeat(250) },
  { locator: '§2 b', title: 'b', text: 'y'.repeat(100) },
  { locator: '§3 c', title: 'c', text: 'z'.repeat(120) },
  { locator: '§4 d', title: 'd', text: 'w'.repeat(300) },
]
const grouped = mergeToMinimum(points, 200)
assert.equal(grouped.length, 3, `expected three groups, got ${grouped.length}`)
assert.equal(grouped[0].locator, '§1 a')
assert.equal(grouped[1].locator, '§2 b')
assert.ok(grouped[1].chars >= 200, 'two short neighbours reach the minimum together')
assert.equal(grouped[2].locator, '§4 d', 'a long point keeps its own place')
ok('mergeToMinimum leaves long points alone and never reorders them')

// A trailing stub with nothing after it folds backwards instead of being
// published as a three-sentence "mechanism".
const trailing = mergeToMinimum([
  { locator: '§1 a', title: 'a', text: 'x'.repeat(150) },
  { locator: '§2 b', title: 'b', text: 'y'.repeat(60) },
], 200)
assert.equal(trailing.length, 1)
assert.ok(trailing[0].chars >= 200)
ok('a trailing stub joins the point before it')

// figureUrl: arXiv writes a path relative to the paper's *versioned* html
// directory, so `2601.00001v1/pipeline.png` replaces the id rather than
// following it. This block used to pin the concatenated form, which was a 404
// for every figure in the nine libraries; the three verified shapes and the
// fallbacks live in tests/self55/figure-url.test.mjs, and this keeps the one
// assertion the record itself depends on.
assert.equal(
  figureUrl('https://arxiv.org/html/2601.00001', '2601.00001v1/pipeline.png'),
  'https://arxiv.org/html/2601.00001v1/pipeline.png',
)
assert.equal(figureUrl('', 'a.png'), null, 'no base URL means no answer, not a broken path')
ok('a figure url is resolved inside the paper directory, not concatenated')

assert.equal(pipelineMermaid([]), '', 'no sections is an empty diagram, not a mermaid error')
const chart = pipelineMermaid([
  { locator: '§3.1 A', title: 'A' },
  { locator: '§3.2 B', title: 'B' },
])
// Nodes are declared first and edges after, which is the shape mermaid parses
// most reliably; what matters is that both the labels and the link are there.
assert.match(chart, /N0\["§3\.1 A"\]/)
assert.match(chart, /N1\["§3\.2 B"\]/)
assert.match(chart, /N0 --> N1/)
assert.match(pipelineMermaid([{ locator: '§1 a "quoted"', title: 'a' }]), /'quoted'/, 'quotes inside a label cannot break the diagram')
ok('a diagram of no sections is empty rather than a mermaid error')

const a = workVector({ title: 'noisy verifier', abstract: 'a noisy verifier rewards the wrong edit' })
const b = workVector({ title: 'noisy verifier', abstract: 'a noisy verifier rewards the wrong edit' })
assert.deepEqual(a, b, 'the same bytes always give the same vector')
assert.equal(a.length, VECTOR_SIZE)
const norm = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0))
assert.ok(Math.abs(norm - 1) < 1e-6, `the vector is unit length, got ${norm}`)
assert.ok(Math.abs(cosine(a, b) - 1) < 1e-6)
const c = workVector({ title: 'memory consolidation', abstract: 'sleep replay consolidates episodic memory' })
assert.ok(cosine(a, c) < 0.6, `unrelated vocabularies must not be near, got ${cosine(a, c)}`)
ok('the vector is deterministic, unit length, and comparable by dot product')

const bare = `<html><body><h1 class="ltx_title_document">Short Note</h1>${S('S1', 2, '1', 'Introduction', P('S1.p1.1', 'We describe a problem and nothing else at all. '))}</body></html>`
const thin = buildWorkRecord({ id: '2601.99999', html: bare, origin: 'https://arxiv.org/html/2601.99999' })
assert.equal(thin.pipeline.mermaid, '')
assert.equal(thin.pipeline.figure, null)
assert.equal(thin.mechanisms.length, 0)
assert.ok(thin.pipeline.note, 'a pipeline with nothing to draw says why')
assert.equal(thin.limitations, null, 'a paper with no limitations section is not given one')
ok('a paper with no method section says so instead of inventing stages')

const rec = (id, refs) => ({
  id,
  title: `Paper ${id}`,
  year: 2026,
  references: refs.map((ref) => ({ arxivId: ref })),
})
const index = indexOfWorks([rec('a', ['b', 'c']), rec('b', []), rec('c', ['b', 'z'])])
assert.deepEqual(index.edges, [
  { from: 'a', to: 'b', kind: 'cites' },
  { from: 'a', to: 'c', kind: 'cites' },
  { from: 'c', to: 'b', kind: 'cites' },
], 'only citations inside the library are edges')
assert.deepEqual(index.works.b.citedBy.sort(), ['a', 'c'])
assert.deepEqual(index.works.a.cites.sort(), ['b', 'c'])
ok('the graph joins works that cite each other inside the library')

const neighbours = similarTo(index, 'a', { k: 2 })
assert.ok(neighbours.length <= 2)
assert.equal(neighbours[0].basis, 'graph', 'with no vectors the answer comes from the citation graph')
const withVectors = indexOfWorks([
  { id: 'a', vector: workVector({ title: 'verifier noise' }), references: [] },
  { id: 'b', vector: workVector({ title: 'verifier noise' }), references: [] },
  { id: 'c', vector: workVector({ title: 'memory replay' }), references: [] },
])
const near = similarTo(withVectors, 'a', { k: 1 })
assert.equal(near[0].id, 'b')
assert.equal(near[0].basis, 'vector')
ok('neighbours come from the vector when there is one and from the graph when not')

// A technical report does not have one method section. Qwen3 puts its design in
// architecture, pre-training and post-training; DeepSeekMath puts the whole
// contribution (GRPO) in a section called "Reinforcement Learning" while its
// "Math Pre-Training" is longer. Reading only the longest one loses the method.
const REPORT = `<html><head><title>Report</title></head><body>
 ${S('S1', 2, '1', 'Introduction', P('S1.p1.1', 'Frontier models are expensive to train and hard to reproduce from the report alone, so this note records what was done. '))}
 ${S('S2', 2, '2', 'Architecture', P('S2.p1.1', LONG))}
 ${S('S3', 2, '3', 'Pre-training', P('S3.p1.1', 'Pre-training runs on 36 trillion tokens and is described here only so the post-training section has a starting point to refer back to. '))}
 ${S('S4', 2, '4', 'Post-training', P('S4.p1.1', 'Post-training is where the reasoning emerges: a cold start on long chains, then reinforcement learning with verifiable rewards, then distillation into the smaller models. ') + S('S4.SS1', 3, '4.1', 'Cold Start', P('S4.SS1.p1.1', 'The cold start stage fine-tunes on a small set of long chain-of-thought examples written by a stronger model, which fixes the format before any reward is used. ')))}
 ${S('S6', 2, '6', 'Results', P('S6.p1.1', 'Results on twelve benchmarks are listed in the tables that follow this paragraph and are not part of the design. '))}
 </body></html>`
const report = buildWorkRecord({ id: '2601.00002', html: REPORT, origin: 'https://arxiv.org/html/2601.00002' })
const named = report.mechanisms.map((point) => point.locator).join(' | ')
assert.match(named, /Architecture/, 'the section the paper calls its architecture is a mechanism')
assert.match(named, /Post-training/, 'the section the paper calls post-training is a mechanism too')
assert.doesNotMatch(named, /Results/, 'a results chapter is not a mechanism even when it is a top-level chapter')
assert.ok(report.pipeline.stages.length >= 3, `expected a multi-stage diagram, got ${report.pipeline.stages.length}`)
ok('a technical report has more than one method chapter, and results is not one of them')

// LaTeXML ids pad with placeholder levels: the first run-in paragraph of §2 is
// "S2.SS0.SSS0.Px1" -- five segments for what a reader sees one level in. Counting
// the placeholders makes every run-in paragraph look deep, and a 9,700-character
// method chapter comes out with a single mechanism.
const RUNIN = `<html><head><title>Run-in</title></head><body>
 ${S('S1', 3, '1', 'Introduction', P('S1.p1.1', 'A problem is stated here at some length so that the motivation has a paragraph to quote when the record is built. '))}
 ${S('S2', 3, '2', 'Methods', P('S2.SS0.SSS0.Px1', 'Synthetic document finetuning is the intervention: the model is trained on documents describing the misaligned behaviour before any reward is applied. ') + P('S2.SS0.SSS0.Px2', 'Training uses the same hyperparameters as the baseline runs, with the only difference being the added documents and their dilution factor. ') + P('S2.SS0.SSS0.Px3', 'Prompt variations and evaluation setups are described next, because the same intervention is repeated under several prompt formats. '))}
 </body></html>`
const runin = buildWorkRecord({ id: '2601.00003', html: RUNIN, origin: 'https://arxiv.org/html/2601.00003' })
assert.equal(runin.mechanisms.length, 1, 'one method chapter is one mechanism before merging')
assert.ok(runin.mechanisms[0].chars > 400, `the whole chapter is the point, not its first stub, got ${runin.mechanisms[0].chars}`)
assert.match(runin.mechanisms[0].text, /Prompt variations/, 'the last run-in paragraph of the chapter is included too')
assert.ok(/Methods/.test(runin.mechanisms[0].locator), 'the method chapter was found even though its chapters are h3')
ok('placeholder id levels do not hide the paragraphs of a method chapter')

// A "Discussion" whose first paragraph is a signpost ("In this section we
// share our findings") is not a limitation. Publishing the signpost as the
// authors' own account of failure modes is worse than saying nothing.
const SIGNPOSTED = `<html><head><title>Signpost</title></head><body>
 ${S('S1', 2, '1', 'Introduction', P('S1.p1.1', 'Something is wrong with how these models are evaluated and this paragraph says what in one sentence or two. '))}
 ${S('S2', 2, '2', 'Method', P('S2.p1.1', LONG))}
 ${S('S5', 2, '5', 'Discussion', P('S5.p1.1', 'In this section, we will share our findings in pre-training and RL experiments. ') + P('S5.p2.1', 'Our evaluation only covers English benchmarks, and the reinforcement learning stage was not ablated against a longer schedule. '))}
 ${S('S7', 2, '7', 'Limitations', P('S7.p1.1', 'We only test three benchmarks and the adapter is not trained end to end. '))}
 </body></html>`
const signposted = buildWorkRecord({ id: '2601.00004', html: SIGNPOSTED, origin: 'https://arxiv.org/html/2601.00004' })
assert.match(signposted.limitations.text, /only test three benchmarks/, 'the real limitations section wins over the discussion')
assert.doesNotMatch(signposted.limitations.text, /^In this section/)

const onlyDiscussion = `<html><head><title>Signpost only</title></head><body>
 ${S('S1', 2, '1', 'Introduction', P('S1.p1.1', 'Something is wrong with how these models are evaluated and this paragraph says what in one sentence or two. '))}
 ${S('S2', 2, '2', 'Method', P('S2.p1.1', LONG))}
 ${S('S5', 2, '5', 'Discussion', P('S5.p1.1', 'In this section, we will share our findings in pre-training and RL experiments. ') + P('S5.p2.1', 'Our evaluation only covers English benchmarks, and the reinforcement learning stage was not ablated against a longer schedule. '))}
 </body></html>`
const dsig = buildWorkRecord({ id: '2601.00005', html: onlyDiscussion, origin: 'https://arxiv.org/html/2601.00005' })
assert.match(dsig.limitations.text, /only covers English benchmarks/, 'the signpost is skipped and the next paragraph is used')
ok('a discussion that opens with a signpost does not publish it as a limitation')

// A composite figure nests the panels inside the outer <figure> and writes the
// real caption after them. Reading up to the first `</figure>` gets the panel
// label "(a)", which is how a page came out showing a figure captioned "(a)".
const COMPOSITE = `<html><head><title>Composite</title></head><body>
 ${S('S1', 2, '1', 'Introduction', P('S1.p1.1', 'An introduction paragraph that is long enough to be kept by the section splitter and says why this work exists at all. '))}
 <section id="S2" class="ltx_section"><h2 class="ltx_title ltx_title_section">2 Method</h2>
 <figure id="S2.F3" class="ltx_figure"><div class="ltx_flex_figure">
 <figure id="S2.F3.sf1" class="ltx_figure ltx_figure_panel"><img src="2601.00006v1/a.png"/><figcaption class="ltx_caption"><span class="ltx_tag ltx_tag_figure">(a) </span></figcaption></figure>
 <figure id="S2.F3.sf2" class="ltx_figure ltx_figure_panel"><img src="2601.00006v1/b.png"/><figcaption class="ltx_caption"><span class="ltx_tag ltx_tag_figure">(b) </span></figcaption></figure>
 </div><figcaption class="ltx_caption"><span class="ltx_tag ltx_tag_figure">Figure 3 : </span>Design space: the cell structure and the DAG, drawn at the same scale as the paper prints them.</figcaption></figure>
 ${P('S2.p1.1', LONG)}
 </section>
 </body></html>`
const composite = buildWorkRecord({ id: '2601.00006', html: COMPOSITE, origin: 'https://arxiv.org/html/2601.00006' })
assert.equal(composite.pipeline.figure.id, 'S2.F3', 'the outer figure is the one a reader wants, not a panel')
assert.match(composite.pipeline.figure.caption, /Design space/, 'the caption is the outer one, not the panel letter')
assert.doesNotMatch(composite.pipeline.figure.caption, /^\(a\)/, 'a panel label is not a caption')
ok('a figure made of panels is captioned by the figure, not by a panel letter')

// `Number(null)` is 0, so a record built from a reading file (which carries no
// year) came out claiming the paper was published in year 0 and sorted to the
// top of every table. An unknown year is null, and a paper whose body has no
// usable heading keeps its id as a name rather than an empty title.
const noYear = buildWorkRecord({ id: '2601.00007', html: FIXTURE, origin: 'https://arxiv.org/html/2601.00007' })
assert.equal(noYear.year, null, 'a missing year stays unknown instead of becoming year 0')
const zeroYear = buildWorkRecord({ id: '2601.00008', html: FIXTURE, year: 0 })
assert.equal(zeroYear.year, null, 'a zero year is not a publication year')
const realYear = buildWorkRecord({ id: '2601.00009', html: FIXTURE, year: 2021 })
assert.equal(realYear.year, 2021)
const untitled = buildWorkRecord({ id: '2601.00010', html: '<html><head><title>1Introduction</title></head><body><p class="ltx_p">A body without any heading at all but with enough words to be a paragraph of text.</p></body></html>' })
assert.equal(untitled.title, '2601.00010', 'a paper with no heading is named by its id, not by an empty string')
ok('an unknown year is null and an unnamed paper is named by its id')

console.log
console.log(`\n${pass} checks passed`)
