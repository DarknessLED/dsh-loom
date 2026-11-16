// A patch that rewrites a file without changing it, and a failure detail wide
// enough to carry the node ids a grader prints. Neither may gate a promotion:
// the first is a review fact, the second is input for the next round.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { lineEndingChurn } from '../../src/gate/churn.js'

const pad = (n) => Array.from({ length: n }, (_, i) => `print(${i})`)

// rewrite: the same lines deleted as LF, added back as CRLF
const rewrite = [
  'diff --git a/src/a.py b/src/a.py',
  '--- a/src/a.py',
  '+++ b/src/a.py',
  ...pad(22).map((l) => `-${l}`),
  ...pad(22).map((l) => `+${l}\r`),
  'diff --git a/src/b.py b/src/b.py',
  '--- a/src/b.py',
  '+++ b/src/b.py',
  '+# a real edit',
].join('\n')

const churn = lineEndingChurn(rewrite)
assert.ok(churn, 'a CRLF rewrite of an LF file is churn')
assert.equal(churn.files.length, 1)
assert.equal(churn.files[0].path, 'src/a.py')
assert.equal(churn.files[0].added, 22)
assert.equal(churn.files[0].crlf, 22)
assert.equal(churn.added, 22)
assert.ok(churn.deleted >= 22)

// the same lines on both sides: the repository itself is CRLF, so this is an
// ordinary edit, not a rewrite
const crlfRepo = [
  'diff --git a/src/c.py b/src/c.py',
  '--- a/src/c.py',
  '+++ b/src/c.py',
  ...pad(22).map((l) => `-${l}\r`),
  ...pad(22).map((l) => `+${l}\r`),
].join('\n')
assert.equal(lineEndingChurn(crlfRepo), null)

// an ordinary LF edit
const ordinary = [
  'diff --git a/src/d.py b/src/d.py',
  '--- a/src/d.py',
  '+++ b/src/d.py',
  '-old line',
  '+new line',
  '+another line',
].join('\n')
assert.equal(lineEndingChurn(ordinary), null)

// not a patch at all
assert.equal(lineEndingChurn(''), null)
assert.equal(lineEndingChurn(null), null)
assert.equal(lineEndingChurn(undefined), null)

// the call site records it and nothing reads it as a gate
const round = readFileSync(new URL('../../src/runtime/round.js', import.meta.url), 'utf8')
assert.match(round, /lineEndingChurn/, 'round.js must ask for churn')
assert.match(round, /checks\.lineEndingChurn = churn/, 'churn is recorded on the checks')
assert.ok(
  !/if \(.*lineEndingChurn.*\)/.test(round),
  'nothing may branch on churn: it is a review fact, not a verdict',
)

// the previous-failure detail keeps the lines that name the breakage
assert.match(round, /detail: failureDigest\(detail\)/, 'lastFailure uses the digest, not a 300-char tail')
assert.ok(
  !/detail: tailOf\(detail, 300\)/.test(round),
  'a 300-char tail cuts off the node ids a grader prints under REWARD=0',
)

console.log('ok - churn is recorded, feedback is wide enough to name the breakage')

// pytest names the breakage its own way; a digest that only speaks node's
// dialect hands the next round a score instead of a task.
const { failureDigest } = await import('../../src/core/limits.js')
const graderOut = [
  'P2P 2700/2734 pass 34 fail; F2P 44/44 pass 0 fail',
  '',
  'P2P=2700/2734 F2P=44/44',
  'KILLRATE=0.987761',
  'REWARD=0',
  'REGRESSED:',
  ...Array.from({ length: 12 }, (_, i) => `  tests/unit/morphing/name_layout/test_provider.py::test_case_${i}`),
].join('\n')
const digest = failureDigest(graderOut)
const kept = (digest.match(/::test_case_/g) || []).length
assert.ok(kept >= 12, `the digest kept ${kept} of 12 node ids`)
assert.match(digest, /REWARD=0/, 'and the verdict it came with')
