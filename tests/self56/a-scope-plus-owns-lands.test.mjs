// The round that declared both permissions is judged by both, not by one.
//
// Campaign `owns-scope-live` declared exactly the two permissions a "spec plus
// its pin" deliverable needs:
//
//   verify: {
//     owns:  ['scripts/test-all.mjs'],   // the apparatus it must edit
//     scope: { editable: ['tests/'] }     // the tests it may write
//   }
//
// The patch touched `tests/...` (inside the scope) and `scripts/test-all.mjs`
// (declared in `owns`), and came back `testsClean: false` with
// `violations: ['scripts/test-all.mjs']`: the same path was excused by the
// oracle check and convicted by the scope check, because the scope only ever
// looked at its own `editable` list. A declaration the task already made is not
// something it should have to write a second time.
//
// This spec is the discriminating case on its own. Nothing else has to be true:
// two paths, one inside the scope, one declared owned, and the verdict is legal.
// Take `owns` away and the very same patch must still be refused, which is what
// keeps the exception from becoming a hole.
//
//   node tests/self56/a-scope-plus-owns-lands.test.mjs
import assert from 'node:assert/strict'
import { scopeVerdict, parseScope } from '../../src/gate/scope.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

// A real `diff --git` header per path: the gate reads the header, not the hunk,
// so a helper that emitted only `---`/`+++` would pass while testing nothing.
const patch = (paths) =>
  paths.map((p) => `diff --git a/${p} b/${p}\n--- a/${p}\n+++ b/${p}\n@@ -1 +1 @@\n-old\n+new\n`).join('')

const PATHS = ['tests/x.test.mjs', 'scripts/test-all.mjs']
const scope = parseScope({ editable: ['tests/'] })

// 1. The declaration is honoured: the owned path is checked, not convicted.
const legal = scopeVerdict({
  patchText: patch(PATHS),
  filesChanged: PATHS,
  scope,
  owns: ['scripts/test-all.mjs'],
})
assert.deepEqual(
  legal.violations,
  [],
  'a path the task declared it owns is part of its deliverable, not a violation',
)
assert.equal(legal.ok, true, 'so the change set as a whole is legal')
assert.equal(legal.checked, 2, 'and both paths were still checked -- owning one skips nothing')
ok('a patch inside the scope plus an owned script is legal')

// 2. The same patch without the declaration: the refusal has to survive byte
//    for byte, or `owns` would be a way to launder any script edit.
const refused = scopeVerdict({
  patchText: patch(PATHS),
  filesChanged: PATHS,
  scope,
  owns: [],
})
assert.deepEqual(
  refused.violations,
  ['scripts/test-all.mjs'],
  'undeclared apparatus stays a violation',
)
assert.equal(refused.ok, false, 'and the change set is refused')
ok('the same patch with no owns is refused')

console.log(`\n${pass} checks passed`)
