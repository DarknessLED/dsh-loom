// The record's abstract is what the vector and the cluster classifier read.
//
// It arrived empty for every foundation in the nine libraries: a foundation is
// the citing works' view of a paper -- an id, a title, a year -- with no prose.
// The candidate list has the prose but is a different list, so the only place
// that always has it is the body. Two halves, one record: the survey's abstract
// rides along when it exists, and the body supplies it when it does not.
import assert from 'node:assert/strict'

import { buildWorkRecord, workVector } from '../../src/research/workrecord.js'
import { selectIds } from '../../scripts/research-work.mjs'

const checks = []
function check(name, fn) {
  try {
    fn()
    checks.push({ name, ok: true })
  } catch (err) {
    checks.push({ name, ok: false, err })
  }
}

const BODY = `<!DOCTYPE html><html><body>
<div id="abstract1" class="ltx_abstract">
  <h6 class="ltx_title ltx_title_abstract">Abstract</h6>
  <p id="abstract1.1" class="ltx_p">A verifier that is trained on the same failures it grades will
  drift towards whatever the failures reward. We measure that drift on nine suites and find it is
  largest exactly where the baseline is weakest.</p>
</div>
<section id="S1" class="ltx_section"><h2 class="ltx_title ltx_title_section">1 Introduction</h2>
<p id="S1.p1.1" class="ltx_p">Judging a candidate edit is the bottleneck. A noisy verifier is the
default state of the field, and every method in this space has to start from that fact rather than
from the hope that the verifier is right.</p></section>
<section id="S2" class="ltx_section"><h2 class="ltx_title ltx_title_section">2 Method</h2>
<p id="S2.p1.1" class="ltx_p">We hold a slice of the task pool back and score every candidate on it
before it is allowed to replace the incumbent. The pool is small, so this is a reading and not a
gate, and the paper reports it as such.</p></section>
</body></html>`

check('the body supplies an abstract when the survey has none', () => {
  const record = buildWorkRecord({ id: '2601.00001', html: BODY, origin: 'https://arxiv.org/html/2601.00001' })
  assert.ok(record.abstract.length > 100, `abstract was ${record.abstract.length} chars`)
  assert.match(record.abstract, /drift towards whatever the failures reward/)
  assert.doesNotMatch(record.abstract, /Abstract/, 'the heading is not part of the abstract')
})

check('the survey abstract wins when it exists, so the record matches the survey', () => {
  const surveyAbstract = 'S. '.repeat(60)
  const record = buildWorkRecord({
    id: '2601.00001',
    html: BODY,
    origin: 'https://arxiv.org/html/2601.00001',
    abstract: surveyAbstract,
  })
  assert.equal(record.abstract, surveyAbstract.trim())
})

check('an abstract the body does not carry is empty, not invented', () => {
  const record = buildWorkRecord({ id: '2601.00002', html: '<html><body><p>no abstract here</p></body></html>' })
  assert.equal(record.abstract, '')
})

check('the abstract reaches the vector, so a record built without one is a different record', () => {
  const withAbstract = buildWorkRecord({ id: '2601.00001', html: BODY, origin: 'https://arxiv.org/html/2601.00001' })
  const without = buildWorkRecord({ id: '2601.00001', html: BODY, origin: 'https://arxiv.org/html/2601.00001', abstract: '' })
  // Same input either way; the second call is here to prove the assertion below
  // is about the abstract and not about call order.
  assert.deepEqual(withAbstract.vector, without.vector)
  const bare = workVector({ title: 'a title', abstract: '' })
  const prose = workVector({ title: 'a title', abstract: withAbstract.abstract })
  assert.notDeepEqual(bare, prose, 'an abstract that is dropped leaves the vector with only a title')
})

check('a foundation joins the abstract from the candidate list by id', () => {
  const survey = {
    cls: {
      foundations: [
        { arxivId: '2601.00001', title: 'A foundation, no prose' },
        { arxivId: '2601.00009', title: 'A foundation with no candidate either' },
      ],
      sota: [],
    },
    b: {
      papers: [{ id: '2601.00001', title: 'A foundation, no prose', abstract: 'P. '.repeat(80) }],
    },
  }
  const picked = selectIds(survey, { top: 2 })
  assert.equal(picked.length, 2)
  const first = picked.find((p) => p.id === '2601.00001')
  assert.ok(first.abstract.length > 100, `foundation abstract was ${first.abstract.length} chars`)
  const second = picked.find((p) => p.id === '2601.00009')
  assert.equal(second.abstract, '', 'no candidate means no prose, and that is stated rather than guessed')
})

check('the candidate list itself still supplies its own abstract', () => {
  const survey = {
    cls: { foundations: [], sota: [] },
    b: { papers: [{ id: '2601.00010', title: 'A paper', abstract: 'Q. '.repeat(70) }] },
  }
  const picked = selectIds(survey, { top: 1 })
  assert.equal(picked[0].abstract, 'Q. '.repeat(70))
})

let failed = 0
for (const c of checks) {
  if (c.ok) {
    console.log(`ok - ${c.name}`)
  } else {
    failed += 1
    console.log(`not ok - ${c.name}`)
    console.log(String(c.err && c.err.stack ? c.err.stack : c.err).split('\n').slice(0, 6).join('\n'))
  }
}
console.log(`\n${checks.length - failed}/${checks.length} checks passed`)
if (failed) process.exit(1)
