// `panelState` has shipped `researchTrial` since `b6258b9`, and nothing renders
// it.
//
// Detail: the numbers reach the panel's JSON and stop there. `client/index.js`
// draws rounds, cost, best score, reads and pages; `grep researchTrial
// client/index.js` returns nothing. So the one comparison the whole research/do
// work exists to produce is invisible to the person the panel is for, which is
// the same failure as a read that nobody records (`46b3920`) one level up: a
// number that is computed, shipped, and never looked at.
//
// The formatting lives in `trialSummary(researchTrial)` so it can be exercised
// without a browser, and `panelState` ships its result as `trial` on the
// campaign. The panel then prints one line, and says "cannot tell" in Chinese
// 而不是「没有差别」, because the whole point of the trial's own sentence is that
// overlap is not equality.
//
//   node tests/self57/the-panel-shows-the-trial.test.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { trialSummary } from '../../src/panel/api.js'

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

const trial = (over = {}) => ({
  n: 10,
  arms: {
    full: { n: 6, promoted: 6, rate: 1, usdTotal: 0.063584, usdPerRound: 0.0106 },
    off: { n: 4, promoted: 4, rate: 1, usdTotal: 0.040148, usdPerRound: 0.0100 },
  },
  delta: 0,
  mde: 0.904,
  verdict: 'cannot-distinguish',
  ready: true,
  cost: { verdict: 'cannot-distinguish', delta: 0.00056, arms: { full: { mean: 0.0106 }, off: { mean: 0.01 } } },
  time: { verdict: 'cannot-distinguish', delta: 27248, arms: { full: { mean: 27248 }, off: { mean: 0 } } },
  ...over,
})

ok('a trial that has not started is not a line', () => {
  assert.equal(trialSummary(null), null)
  assert.equal(trialSummary({ n: 0, arms: { full: { n: 0 }, off: { n: 0 } } }), null)
})

ok('the line carries both arms and the verdict word', () => {
  const out = trialSummary(trial())
  assert.match(out.line, /6/)
  assert.match(out.line, /4/)
  assert.match(out.line, /不能区分|cannot-distinguish/i, 'the verdict must be named, not implied')
})

ok('a decided trial says which side won', () => {
  const out = trialSummary(trial({ verdict: 'full-better', delta: 0.3 }))
  assert.match(out.line, /读更强|reading better|full/i)
})

ok('the money and the clock are on the line when they were measured', () => {
  const out = trialSummary(trial())
  assert.match(out.line, /1\.06c/, 'the reading arm paid 1.06c a round and the line must say so')
  assert.match(out.line, /27\.2s/, 'the leg spent 27.2s a round and the line must say so')
})

ok('a missing cost is left out rather than printed as zero', () => {
  const out = trialSummary(trial({ cost: null, time: null }))
  assert.doesNotMatch(out.line, /0\.00c/)
})

ok('the panel row renders the line it is given', () => {
  const src = readFileSync(new URL('../../client/index.js', import.meta.url), 'utf8')
  assert.match(src, /function trialLine\(/, 'the panel needs a function that draws the trial')
  assert.match(src, /c\.trial/, 'the panel must read the field the API ships')
})

ok('the preview carries a trial row, so the audit can see one', () => {
  // The preview fixture had no `reads` and no `trial` for four commits: the
  // panel could draw neither and the committed page still passed every check,
  // because nothing in it exercised the line. A fixture that cannot show the
  // feature is not evidence about the feature.
  const fixture = readFileSync(new URL('../../scripts/panel-preview.mjs', import.meta.url), 'utf8')
  assert.match(fixture, /trial: \{ line:/, 'the preview fixture needs a trial row')
  const page = readFileSync(new URL('../../docs/panel-preview.html', import.meta.url), 'utf8')
  assert.match(page, /不能区分/, 'the committed preview must contain the trial line')
})

console.log(`# pass ${pass} fail ${fail}`)
process.exit(fail === 0 ? 0 : 1)
