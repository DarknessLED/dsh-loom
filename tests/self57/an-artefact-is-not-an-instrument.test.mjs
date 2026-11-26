// A verifier that takes its subject on the command line made that subject look
// like apparatus.
//
// `oracleCandidates(cmd)` tokenises the command and treats every token that
// looks like a path as a candidate oracle file. That is right for "which file
// does this command run", and wrong for "did that file exist when the base was
// measured": a probe whose verifier is `node check.mjs design-note-0.md` names
// both the instrument and the artefact, so the round that *creates*
// `design-note-0.md` was judged `oracle-absent-at-base` and refused -- every
// round of `trial-prose`, all six of them, with `verifierOk: true` and
// `score: 1`.
//
// The base-existence rule exists for one reason, stated in `round.js`: a
// candidate that creates the instrument must not slip past the path rules. An
// instrument is code. A created `.md`, `.txt`, `.json` is the thing the
// instrument was pointed at, and refusing it refuses the task.
//
//   node tests/self57/an-artefact-is-not-an-instrument.test.mjs
import assert from 'node:assert/strict'

import { createdInstruments } from '../../src/gate/oracle.js'

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

ok('a created script is still an instrument, so the round is refused', () => {
  const out = createdInstruments(['check.mjs', 'runner.js'], ['check.mjs'])
  assert.deepEqual(out, ['check.mjs'])
})

ok('a created artefact is not an instrument', () => {
  assert.deepEqual(createdInstruments(['check.mjs', 'design-note-0.md'], ['design-note-0.md']), [])
  assert.deepEqual(createdInstruments(['check.mjs', 'summary.txt'], ['summary.txt']), [])
  assert.deepEqual(createdInstruments(['check.mjs', 'data.json'], ['data.json']), [])
})

ok('a created script named under a directory is an instrument too', () => {
  assert.deepEqual(createdInstruments(['scripts/check.mjs'], ['scripts/check.mjs']), ['scripts/check.mjs'])
  assert.deepEqual(createdInstruments(['verify.py'], ['verify.py']), ['verify.py'])
})

ok('a created file with no extension is treated as an artefact', () => {
  // No extension is not code: a rule that guessed "maybe it is a script" would
  // refuse every task whose verifier reads a file called `input`.
  assert.deepEqual(createdInstruments(['check.mjs', 'input'], ['input']), [])
})

ok('nothing created is nothing to refuse', () => {
  assert.deepEqual(createdInstruments(['check.mjs'], []), [])
  assert.deepEqual(createdInstruments([], ['anything.md']), [])
})

console.log(`# pass ${pass} fail ${fail}`)
process.exit(fail === 0 ? 0 : 1)
