// A task that owns a script and scopes itself to the tests is refused by its
// own scope, and the two declarations never meet.
//
// Campaign `owns-scope-live` declared both permissions a task needs when its
// deliverable is a spec plus its pin:
//
//   verify: {
//     owns:  ['scripts/test-all.mjs'],       // the apparatus it must edit
//     scope: { editable: ['tests/'] }         // the tests it may write
//   }
//
// The round came back `verifierOk: true`, `oracleClean: true`,
// `oracleReleased: ["scripts/test-all.mjs"]` — the owns exception worked — and
// `testsClean: false` with
//
//   scope: { editable: ['tests/'], checked: 2, violations: ['scripts/test-all.mjs'] }
//
// The same path was excused by one check and convicted by the other. That is not
// a task-authoring mistake: `owns` is precisely the statement "this apparatus
// path is part of my deliverable", so a scope that must enumerate it a second
// time is a second place to forget. The scope should read the declaration it is
// already given.
//
// The refusal still has to bite where nothing was declared: a path that is
// neither inside the scope nor owned is a violation, and a task with `owns` but
// no scope keeps the legacy rule exactly (a scope is what turns the blanket
// "no test edits" into a list, and `owns` does not).
//
//   node tests/self56/an-owned-path-is-inside-the-scope.test.mjs
import assert from 'node:assert/strict'
import { scopeVerdict, parseScope } from '../../src/gate/scope.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const patch = (paths) =>
  paths.map((p) => `diff --git a/${p} b/${p}\n--- a/${p}\n+++ b/${p}\n@@ -1 +1 @@\n-old\n+new\n`).join('')

const scope = parseScope({ editable: ['tests/'] })

// 1. The live case. Both files are deliverables; only one is inside the scope.
const both = scopeVerdict({
  patchText: patch(['tests/self56/an-owned-file-is-proven-live.test.mjs', 'scripts/test-all.mjs']),
  filesChanged: ['tests/self56/an-owned-file-is-proven-live.test.mjs', 'scripts/test-all.mjs'],
  scope,
  owns: ['scripts/test-all.mjs'],
})
assert.deepEqual(
  both.violations,
  [],
  'a path the task declared it owns is part of its deliverable, not a scope violation',
)
assert.equal(both.ok, true, 'and the change set as a whole stays legal')
assert.equal(both.checked, 2, 'both paths were still checked -- owning one does not skip the check')
ok('an owned path is inside the scope that was declared beside it')

// 2. The refusal has to survive: a script nobody declared is still a violation.
const undeclared = scopeVerdict({
  patchText: patch(['tests/x.test.mjs', 'scripts/guard-retry.mjs']),
  filesChanged: ['tests/x.test.mjs', 'scripts/guard-retry.mjs'],
  scope,
  owns: ['scripts/test-all.mjs'],
})
assert.deepEqual(
  undeclared.violations,
  ['scripts/guard-retry.mjs'],
  'owning one apparatus path does not license the others',
)
assert.equal(undeclared.ok, false)
ok('owning one script does not license another')

// 3. No scope, no change: `owns` alone must not turn the blanket rule into a list.
const noScope = scopeVerdict({
  patchText: patch(['scripts/test-all.mjs']),
  filesChanged: ['scripts/test-all.mjs'],
  scope: null,
  owns: ['scripts/test-all.mjs'],
})
assert.equal(noScope.ok, true, 'without a scope there is nothing to violate')
assert.deepEqual(noScope.violations, [])
assert.equal(noScope.checked, 0, 'and nothing was checked, which is the legacy answer')
ok('a task with owns and no scope keeps the legacy rule')

// 4. A path both inside the scope and owned is not counted twice.
const overlap = scopeVerdict({
  patchText: patch(['tests/self56/a.test.mjs']),
  filesChanged: ['tests/self56/a.test.mjs'],
  scope,
  owns: ['tests/'],
})
assert.equal(overlap.checked, 1, 'the union of the two views is still one path')
assert.deepEqual(overlap.violations, [])
ok('the union of scope and owns counts a path once')

console.log(`\n${pass} checks passed`)
