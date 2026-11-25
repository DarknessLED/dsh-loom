// Did the worker reach for what the round read?
//
// The leg records that a round read (`research.mode`, `passages`, `from`). It
// could not record the one fact the loop policy turns on: whether the worker
// ever used a quoted span. `researchModeFor` already refuses to pay for a read
// that was not used (`last.research.used === false -> 'off'`), and until this
// measurement existed that branch was unreachable — the field was documented and
// never filled, so the loop could not learn that reading did not help.
//
// The judgement has to be narrow enough to be honest:
//
//   * nothing to judge (no findings, or no report) is `null`, not `false` — a
//     round that could not measure did not measure "no";
//   * a quote counts only at 24 characters or more, because two documents about
//     the same problem share short words by accident ("a rule that keeps"), and
//     counting those would make every round look like it read;
//   * a citation counts too, URL or arXiv id, because naming the source is
//     reaching for it even when the span itself was paraphrased.
//
//   node tests/self57/what-the-worker-reached-for.test.mjs
import assert from 'node:assert/strict'

import { reachedFor } from '../../src/runtime/research-leg.js'

let pass = 0
let fail = 0
function ok(name, fn) {
  try {
    fn()
    pass++
    console.log(`ok ${pass} - ${name}`)
  } catch (err) {
    fail++
    console.log(`not ok ${pass + fail} - ${name}`)
    console.log(`  ${String(err?.message ?? err).split('\n')[0]}`)
  }
}

const SPAN = 'the ubiquitous keep-it-if-the-score-went-up rule is uncontrolled adaptive testing'
const URL = 'https://arxiv.org/abs/2606.08106'

/** A round's research record, in the shape the round hands to `reachedFor`. */
const leg = (findings) => ({ mode: 'full', question: 'q', from: 'task', passages: findings.length, findings })

const report = (why, extra = {}) => ({ changed: [], why, evidence: [], openQuestions: [], confidence: 0.2, nextHint: '', ...extra })

ok('no findings means nothing was read, so the answer is null', () => {
  assert.equal(reachedFor(leg([]), { report: report(SPAN) }), null)
})

ok('a round with no research record is null, not false', () => {
  assert.equal(reachedFor(null, { report: report(SPAN) }), null)
  assert.equal(reachedFor(undefined, { report: report(SPAN) }), null)
})

ok('no report is null: the round could not judge, it did not judge "no"', () => {
  assert.equal(reachedFor(leg([{ text: SPAN, url: URL, title: 'PACE' }]), { report: null }), null)
  assert.equal(reachedFor(leg([{ text: SPAN, url: URL, title: 'PACE' }]), {}), null)
})

ok('a quoted span of 24+ characters is a use', () => {
  const quoted = SPAN.slice(0, 40)
  const value = reachedFor(leg([{ text: SPAN, url: URL, title: 'PACE' }]), {
    report: report(`the page says "${quoted}" which is why I changed impl.txt`),
  })
  assert.equal(value, true)
})

ok('the same quote in different case is still the same quote', () => {
  const quoted = SPAN.slice(0, 40).toUpperCase()
  assert.equal(reachedFor(leg([{ text: SPAN, url: URL, title: 'PACE' }]), { report: report(`a page said ${quoted}`) }), true)
})

ok('a report that mentions none of the findings did not use the read', () => {
  assert.equal(
    reachedFor(leg([{ text: SPAN, url: URL, title: 'PACE' }]), {
      report: report('I rewrote impl.txt and the verifier now passes'),
    }),
    false,
  )
})

ok('sharing only short common words is not a use', () => {
  // Fourteen shared characters: a coincidence, not a quotation.
  assert.equal(
    reachedFor(leg([{ text: SPAN, url: URL, title: 'PACE' }]), { report: report('a rule that keeps') }),
    false,
  )
})

ok('naming the source URL is a use even without a quoted span', () => {
  assert.equal(
    reachedFor(leg([{ text: SPAN, url: URL, title: 'PACE' }]), {
      report: report('per PACE (https://arxiv.org/abs/2606.08106) the rule is uncontrolled'),
    }),
    true,
  )
})

ok('an arXiv id alone names the source, so it counts', () => {
  assert.equal(
    reachedFor(leg([{ text: SPAN, url: URL, title: 'PACE' }]), { report: report('PACE (arXiv:2606.08106) is the relevant one') }),
    true,
  )
})

ok('a finding with no URL is judged on its text alone', () => {
  assert.equal(reachedFor(leg([{ text: SPAN, url: null, title: null }]), { report: report('I ran the verifier') }), false)
  assert.equal(reachedFor(leg([{ text: SPAN, url: null, title: null }]), { report: report(SPAN.slice(10, 50)) }), true)
})

ok('the record is not mutated: the measurement is the caller\'s to write', () => {
  const research = leg([{ text: SPAN, url: URL, title: 'PACE' }])
  reachedFor(research, { report: report(SPAN.slice(0, 40)) })
  assert.equal(research.used, undefined, 'reachedFor must not write `used` itself')
  assert.equal(research.passages, 1)
})

ok('garbage in the record is null rather than a throw', () => {
  assert.equal(reachedFor({ findings: 'nope' }, { report: report(SPAN) }), null)
  assert.equal(reachedFor(leg([{ text: '', url: null }]), { report: report(SPAN) }), false)
  assert.equal(reachedFor(leg([{ text: SPAN, url: URL }]), { report: report(42) }), null)
})

console.log(`# pass ${pass} fail ${fail}`)
process.exit(fail === 0 ? 0 : 1)
