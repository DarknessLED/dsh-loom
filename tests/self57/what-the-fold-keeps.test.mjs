// The fold drops the read leg, so no reader of `state.rounds` can see it.
//
// `runtime.append` folds the whole event log through `reduce`, and
// `reduce`'s `round.finished` branch copies a **whitelist** of keys onto the
// projected round. Measured 2026-11-26 on campaign `balance3-live`:
//
//   round.finished        {"n":1,"research":{"mode":"full","used":false,"read":2}, …}
//   views/state.json      {"n":1,"status":"promoted","promoted":true}      ← no research
//
// so `researchModeFor` still read round one as "won without reading" and
// `legBudget` counted zero reads. Fixing `projectRound` was necessary and not
// sufficient: `projectRound` serves a bare embedder that never folds, and the
// real runtime takes the other path.
//
// The same whitelist is missing `noop`, `screened`, `kept`, `halving`,
// `fidelity`, `holdoutScore`, `holdoutReason` and `promotedId` — every field a
// later round is supposed to read back. Each was added to `round.finished` and to
// `projectRound` and never here, which is why they keep disappearing.
//
//   node tests/self57/what-the-fold-keeps.test.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { reduce } from '../../src/core/reduce.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(HERE, '..', '..', 'src', 'core', 'reduce.js'), 'utf8')

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

const at = (t) => t
function log(finished) {
  return [
    { t: at(1), type: 'round.started', data: { n: 1, taskId: 't-a', score: 0 } },
    { t: at(2), type: 'round.finished', data: { n: 1, taskId: 't-a', ...finished } },
  ]
}

ok('the fold keeps the read leg on the round', () => {
  const state = reduce(
    log({
      status: 'promoted',
      score: 0.9,
      promoted: true,
      research: { mode: 'full', question: 'q', read: 2, passages: 4, used: false },
    }),
  )
  const round = state.rounds.find((r) => r.n === 1)
  assert.ok(round.research, 'reduce dropped `research`: every reader of state.rounds is blind again')
  assert.equal(round.research.used, false)
  assert.equal(round.research.read, 2)
})

ok('the fold keeps the other fields a later round reads back', () => {
  const state = reduce(
    log({
      status: 'promoted',
      score: 0.9,
      promoted: true,
      noop: false,
      screened: ['r1a1', 'r1a2'],
      kept: ['r1a1'],
      halving: { kind: 'prefilter', rungs: [] },
      fidelity: { halving: true, reason: 'ok' },
      holdoutScore: 0.55,
      holdoutReason: 'the held-back verifier printed the same instrument',
      promotedId: 'r1a1',
    }),
  )
  const round = state.rounds.find((r) => r.n === 1)
  for (const key of ['noop', 'screened', 'kept', 'halving', 'fidelity', 'holdoutScore', 'holdoutReason', 'promotedId']) {
    assert.ok(Object.hasOwn(round, key), `reduce dropped \`${key}\` from the projected round`)
  }
  assert.deepEqual(round.screened, ['r1a1', 'r1a2'])
  assert.equal(round.holdoutScore, 0.55)
})

ok('a missing field is absent, not zero', () => {
  // The distinction the whitelist has to preserve: a round that never measured a
  // holdout reading must not read as one whose reading was 0.
  const state = reduce(log({ status: 'promoted', score: 0.9, promoted: true }))
  const round = state.rounds.find((r) => r.n === 1)
  assert.equal(Object.hasOwn(round, 'holdoutScore'), false)
  assert.equal(Object.hasOwn(round, 'research'), false)
})

ok('the whitelist stays a whitelist', () => {
  // This is the assertion that keeps the fix honest: keys are copied explicitly,
  // so a `round.finished` carrying something nobody vetted does not silently
  // become state. A blanket `Object.assign(r, d)` would pass the two tests above
  // and let any event writer write any field.
  assert.ok(!/Object\.assign\(r,\s*d\b/.test(source), 'the fold must not merge the whole event')
  assert.match(source, /for \(const key of \[/, 'the copy loop is the whitelist')
})

console.log(`# pass ${pass} fail ${fail}`)
process.exit(fail === 0 ? 0 : 1)
