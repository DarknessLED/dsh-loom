// The gate must be able to say "this task may edit exactly these specs" without
// losing the rule it was protecting: a candidate may not edit whatever measures
// it. Unit level here, plus the round-level proof in tests/balance/scope-round.test.mjs.
import assert from 'node:assert/strict'
import { parseScope, inScope, diffPaths, scopeVerdict } from '../src/gate/scope.js'

let pass = 0
let fail = 0
const ok = (name, fn) => {
  try { fn(); pass += 1; console.log(`  ok ${name}`) }
  catch (e) { fail += 1; console.log(`  FAIL ${name}: ${e.message}`) }
}

console.log('parseScope')
ok('no scope object -> null', () => assert.equal(parseScope(undefined), null) && assert.equal(parseScope({}), null))
ok('empty editable -> null', () => assert.equal(parseScope({ editable: [] }), null))
ok('non-array editable -> null', () => assert.equal(parseScope({ editable: 'tests/x.mjs' }), null))
ok('normalises separators and ./', () => {
  assert.deepEqual(parseScope({ editable: ['./tests\\a.test.mjs'] }), { editable: ['tests/a.test.mjs'] })
})
ok('dedupes', () => {
  assert.deepEqual(parseScope({ editable: ['tests/a.test.mjs', 'tests/a.test.mjs'] }), { editable: ['tests/a.test.mjs'] })
})

console.log('inScope')
const scope = { editable: ['tests/gate.test.mjs', 'tests/collab', 'tests/gate*'] }
ok('exact file', () => assert.equal(inScope('tests/gate.test.mjs', scope), true))
ok('file below a directory entry', () => assert.equal(inScope('tests/collab/board.test.mjs', scope), true))
ok('star prefix', () => assert.equal(inScope('tests/gate-extra.test.mjs', scope), true))
ok('a shared prefix without a star is NOT inside', () => {
  assert.equal(inScope('tests/gatekeeper.test.mjs', { editable: ['tests/gate.test.mjs'] }), false)
  assert.equal(inScope('tests/gatekeeper.test.mjs', { editable: ['tests/gate'] }), false)
})
ok('src is never inside', () => assert.equal(inScope('src/gate/gate.js', scope), false))
ok('no scope -> nothing is inside', () => assert.equal(inScope('tests/gate.test.mjs', null), false))

console.log('diffPaths')
ok('reads both sides of diff --git', () => {
  const text = 'diff --git a/tests/a.test.mjs b/tests/a.test.mjs\n--- a/tests/a.test.mjs\n+++ b/tests/a.test.mjs\n'
  assert.deepEqual(diffPaths(text), ['tests/a.test.mjs'])
})
ok('keeps a deleted file and a renamed one', () => {
  const text = [
    'diff --git a/tests/old.test.mjs b/tests/old.test.mjs',
    'deleted file mode 100644',
    'diff --git a/tests/x.test.mjs b/tests/y.test.mjs',
  ].join('\n')
  const paths = diffPaths(text)
  assert.ok(paths.includes('tests/old.test.mjs'))
  assert.ok(paths.includes('tests/x.test.mjs'))
  assert.ok(paths.includes('tests/y.test.mjs'))
})
ok('quoted paths are decoded', () => {
  const text = 'diff --git "a/tests/a b.test.mjs" "b/tests/a b.test.mjs"'
  assert.deepEqual(diffPaths(text), ['tests/a b.test.mjs'])
})
ok('empty text -> no paths', () => assert.deepEqual(diffPaths(''), []))

console.log('scopeVerdict')
ok('no scope -> allowed, nothing checked', () => {
  const v = scopeVerdict({ patchText: 'diff --git a/src/x.js b/src/x.js', scope: null })
  assert.equal(v.ok, true)
  assert.equal(v.checked, 0)
})
ok('patch inside scope -> allowed', () => {
  const v = scopeVerdict({
    patchText: 'diff --git a/tests/gate.test.mjs b/tests/gate.test.mjs',
    scope: { editable: ['tests/gate.test.mjs'] },
  })
  assert.equal(v.ok, true)
  assert.deepEqual(v.violations, [])
})
ok('patch touching src -> refused and named', () => {
  const v = scopeVerdict({
    patchText: ['diff --git a/tests/gate.test.mjs b/tests/gate.test.mjs', 'diff --git a/src/gate/gate.js b/src/gate/gate.js'].join('\n'),
    scope: { editable: ['tests/gate.test.mjs'] },
  })
  assert.equal(v.ok, false)
  assert.deepEqual(v.violations, ['src/gate/gate.js'])
})
ok('another test file -> refused', () => {
  const v = scopeVerdict({
    patchText: 'diff --git a/tests/other.test.mjs b/tests/other.test.mjs',
    scope: { editable: ['tests/gate.test.mjs'] },
  })
  assert.equal(v.ok, false)
})
ok('filesChanged alone is enough to refuse', () => {
  const v = scopeVerdict({ patchText: '', filesChanged: ['src/tools/index.js'], scope: { editable: ['tests/gate.test.mjs'] } })
  assert.equal(v.ok, false)
  assert.deepEqual(v.violations, ['src/tools/index.js'])
})
ok('unreadable patch is refused, not ignored', () => {
  const v = scopeVerdict({ patchText: null, patchUnreadable: true, scope: { editable: ['tests/a.test.mjs'] } })
  assert.equal(v.ok, false)
})
ok('union of both views: patch says one file, stat says another', () => {
  const v = scopeVerdict({
    patchText: 'diff --git a/tests/a.test.mjs b/tests/a.test.mjs',
    filesChanged: ['src/gate/gate.js'],
    scope: { editable: ['tests/a.test.mjs'] },
  })
  assert.equal(v.ok, false)
  assert.deepEqual(v.violations, ['src/gate/gate.js'])
})

console.log(`\n${pass}/${pass + fail} passed`)
if (fail) process.exit(1)
