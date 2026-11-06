// The night committer must never be the thing that lands a change a human was
// asked to approve. It commits whatever is dirty and green every twenty
// seconds, so a review that needs a person and a review that does not look
// identical to it — until an unreviewed patch ends up in history.
//
// The decision lives in `scripts/commit-policy.mjs` so it can be tested without
// spawning git, and `scripts/night-committer.mjs` must consult it.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { shouldCommit } from '../../scripts/commit-policy.mjs'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const root = fileURLToPath(new URL('../..', import.meta.url))

assert.equal(
  shouldCommit({ dirty: true, openGates: 0, suiteGreen: true }),
  true,
  'a dirty tree with a green suite and nobody waiting commits',
)
ok('dirty + green + no open gate commits')

assert.equal(shouldCommit({ dirty: false, openGates: 0, suiteGreen: true }), false, 'a clean tree commits nothing')
ok('a clean tree commits nothing')

assert.equal(
  shouldCommit({ dirty: true, openGates: 1, suiteGreen: true }),
  false,
  'an open gate checkpoint means a human has to look first',
)
ok('an open gate blocks the commit even when the suite is green')

assert.equal(shouldCommit({ dirty: true, openGates: 0, suiteGreen: false }), false, 'a red suite never commits')
ok('a red suite blocks the commit')

// The rule has to be enforced where it matters, not merely available.
const committer = readFileSync(join(root, 'scripts', 'night-committer.mjs'), 'utf8')
assert.match(committer, /commit-policy\.mjs/, 'the committer consults the policy module')
assert.match(committer, /shouldCommit\(/, 'the committer calls shouldCommit')
ok('the night committer consults the policy')

console.log(`\n${pass}/${pass} passed`)
