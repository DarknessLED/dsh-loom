// The gate refuses a patch that edits `tests/`, because a candidate that can edit
// the tests can make any verifier pass. That rule names a DIRECTORY, not the file
// the command runs -- so a task whose oracle lives anywhere else hands the
// candidate the instrument. This pins the derivation of "which files does the
// verify command actually run" and "does the patch touch one of them".
//
// The measured case (research/exp/e51.mjs): the graded fixture's oracle is
// `check.mjs` at the repo root; a candidate that rewrote it while leaving the bug
// in place promoted, because `check.mjs` is not under `tests/`.
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { commandTokens, oracleClean, oracleCandidates, oracleScripts, patchPaths, touchesOracle } from '../src/gate/oracle.js'

let pass = 0
const ok = (name) => { pass += 1; console.log('ok ' + name) }

const root = mkdtempSync(join(tmpdir(), 'oracle-'))
mkdirSync(join(root, 'tests'), { recursive: true })
mkdirSync(join(root, 'scripts'), { recursive: true })
for (const f of ['check.mjs', 'lib.mjs', 'tests/graded.test.mjs', 'scripts/test-all.mjs']) {
  writeFileSync(join(root, f), '// fixture\n')
}

// 1. the script the command runs is found, interpreter skipped
assert.deepEqual(oracleScripts({ cmd: 'node check.mjs' }, { cwd: root }), ['check.mjs'])
ok('finds the script after a bare interpreter')

// 2. an absolute interpreter path is still just an interpreter
assert.deepEqual(oracleScripts({ cmd: '"C:/x/node/bin/node.exe" check.mjs' }, { cwd: root }), ['check.mjs'])
ok('an absolute interpreter path is not mistaken for the oracle')

// 3. every command in a `&&` chain contributes its own script, in order
assert.deepEqual(
  oracleScripts({ cmd: 'node tests/graded.test.mjs && node scripts/test-all.mjs' }, { cwd: root }),
  ['tests/graded.test.mjs', 'scripts/test-all.mjs'],
)
ok('both halves of a && chain are oracle files')

// 4. inline source runs no file: the answer is an empty set, not a guess
assert.deepEqual(oracleScripts({ cmd: 'node -e "process.exit(0)"' }, { cwd: root }), [])
ok('inline source yields no oracle file')

// 5. a token that is not a file is not an oracle: existence is the filter
assert.deepEqual(oracleScripts({ cmd: 'node missing.mjs' }, { cwd: root }), [])
ok('a script that does not exist is not claimed as the oracle')

// 6. flags are not paths, and `-e` consumes its argument
assert.deepEqual(oracleScripts({ cmd: 'node --enable-source-maps check.mjs' }, { cwd: root }), ['check.mjs'])
assert.deepEqual(oracleScripts({ cmd: 'node -e check.mjs' }, { cwd: root }), [])
ok('flags are skipped and -e consumes its argument')

// 7. a spec-level cwd is honoured, and the result stays workspace-relative
assert.deepEqual(oracleScripts({ cmd: 'node graded.test.mjs', cwd: 'tests' }, { cwd: root }), ['tests/graded.test.mjs'])
ok('a spec cwd resolves relative to the workspace and reports a relative path')

// 8. quotes survive: a path with a space in it resolves
writeFileSync(join(root, 'two words.mjs'), '// x\n')
assert.deepEqual(oracleScripts({ cmd: 'node "two words.mjs"' }, { cwd: root }), ['two words.mjs'])
ok('a quoted path with a space is found')

// 9. patch paths come from the `diff --git` header only
const patch = join(root, 'p.patch')
writeFileSync(patch, [
  'diff --git a/check.mjs b/check.mjs',
  '--- a/check.mjs',
  '+++ b/check.mjs',
  '@@ -1 +1 @@',
  '-// fixture',
  '+++ not-a-real-header',
  'diff --git a/lib.mjs b/lib.mjs',
].join('\n'))
assert.deepEqual(patchPaths(patch), ['check.mjs', 'lib.mjs'])
ok('patch paths are read from diff headers, not from content lines')

// 10. an unreadable patch is null, not an empty list
assert.equal(patchPaths(join(root, 'nope.patch')), null)
ok('an unreadable patch is null so callers can fail closed')

// 11. touching the oracle is decided by set membership
assert.equal(touchesOracle(['check.mjs'], ['check.mjs']), true)
assert.equal(touchesOracle(['lib.mjs'], ['check.mjs']), false)
assert.equal(touchesOracle(['./check.mjs'], ['check.mjs']), true)
ok('the oracle touch is a set membership test, normalising ./')

// 12. no oracle means the question does not apply
assert.equal(touchesOracle(['check.mjs'], []), false)
assert.equal(touchesOracle(null, ['check.mjs']), false)
ok('no oracle file and no patch both mean "does not apply", not "safe"')

// 13. the tokenizer keeps quoted content together
assert.deepEqual(commandTokens('node "a b.mjs" --x'), ['node', 'a b.mjs', '--x'])
ok('the tokenizer honours quotes')

// 14. the gate decision: clean when the patch leaves the oracle alone
assert.equal(oracleClean({ patchFile: patch, oraclePaths: ['scripts/test-all.mjs'] }), true)
ok('a patch that leaves the oracle alone is clean')

// 15. and dirty when it edits it, whether the patch file or filesChanged says so
assert.equal(oracleClean({ patchFile: patch, oraclePaths: ['check.mjs'] }), false)
assert.equal(oracleClean({ patchFile: null, oraclePaths: ['check.mjs'], filesChanged: ['check.mjs'] }), false)
ok('editing the oracle is refused from either source of paths')

// 16. no oracle file means the rule does not apply, and an unreadable patch fails closed
assert.equal(oracleClean({ patchFile: patch, oraclePaths: [] }), true)
assert.equal(oracleClean({ patchFile: join(root, 'gone.patch'), oraclePaths: ['check.mjs'] }), false)
ok('no oracle does not apply; an unreadable patch fails closed')


// The unfiltered derivation exists only for the base-commit question, and it has
// one ordering trap: `-e` starts with a dash, so a generic dash-skip before the
// value-flag check reads the inline source as a path. That shipped for an hour and
// made 12 of 172 registered tasks look like they named a missing file (e72).
{
  const inline = "node -e \"process.exit(require('fs').existsSync('note.txt') ? 0 : 1)\""
  assert.deepEqual(commandTokens(inline).slice(0, 2), ['node', '-e'], 'the flag is its own token')
  assert.deepEqual(oracleCandidates(inline), [], 'inline source is not a path')
  assert.deepEqual(oracleCandidates('node check.mjs'), ['check.mjs'], 'a script is a path even if absent')
  assert.deepEqual(oracleCandidates('node --loader ./tsx.mjs run.ts'), ['run.ts'], 'a flag value is skipped')
  assert.deepEqual(oracleCandidates('node -r ./hooks.mjs check.mjs'), ['check.mjs'], '-r takes a path-shaped value it owns')
  assert.deepEqual(oracleCandidates('C:/x/node.exe check.mjs'), ['check.mjs'], 'an absolute interpreter is skipped')
  assert.deepEqual(oracleCandidates('node C:/abs/check.mjs'), [], 'an absolute script is outside the workspace')
  ok('the unfiltered derivation skips inline source before it skips flags')
}

// The denominator is a claim too.
const EXPECTED = 17
assert.equal(pass, EXPECTED, `ran ${pass} assertions, declared ${EXPECTED}`)
console.log(`\n${pass}/${EXPECTED} passed`)
