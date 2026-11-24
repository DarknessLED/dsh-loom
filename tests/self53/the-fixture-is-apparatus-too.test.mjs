// A verifier that reads a fixture file is only as honest as the fixture.
//
// `oraclePathsFor` derives the apparatus from the command: the scripts the command
// names plus their relative imports. That covers code. It does not cover data, and
// a verifier's data is exactly where a candidate can manufacture a pass: the
// command names `check.mjs`, `check.mjs` reads `fixtures/cases.json`, and a patch
// that edits the JSON changes the verdict without touching a line the apparatus
// set names. The rule is already right in spirit — the patch may not edit the thing
// that decides — it just never learned that a JSON file can be that thing.
//
// The derivation stays a pure function of the workspace: read the named scripts,
// take the relative string literals that end in a data extension and resolve to a
// real file. A JSON name in a log message that does not exist stays out, which is
// the same existence filter `oracleScripts` uses for the scripts themselves.
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { oracleClean, oracleDataPaths, oraclePathsFor } from '../../src/gate/oracle.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

const dir = mkdtempSync(join(tmpdir(), 'oracle-data-'))
mkdirSync(join(dir, 'fixtures'), { recursive: true })
mkdirSync(join(dir, 'scripts'), { recursive: true })

const CASES = [
  { id: 'c1', expect: 0.9 },
  { id: 'c2', expect: 0.4 },
]
writeFileSync(join(dir, 'fixtures', 'cases.json'), JSON.stringify(CASES))

writeFileSync(
  join(dir, 'scripts', 'check.mjs'),
  [
    "import { readFileSync } from 'node:fs'",
    "import { join } from 'node:path'",
    '',
    "// The path is one relative literal, the way a real verifier writes it:",
    "// the derivation follows string literals, not path segments.",
    "const cases = JSON.parse(readFileSync(join(import.meta.dirname, '../fixtures/cases.json'), 'utf8'))",
    'const passed = cases.filter((c) => c.expect >= 0.5).length',
    'console.log(`KILLRATE=${(passed / cases.length).toFixed(4)}`)',
    '',
  ].join('\n'),
)

const spec = { cmd: 'node scripts/check.mjs' }
const opts = { cwd: dir }

// 1. The fixture is found, and it is the one the script reads.
const data = oracleDataPaths(spec, opts)
assert.deepEqual(data, ['fixtures/cases.json'], `expected the fixture, got ${JSON.stringify(data)}`)
ok('the data file a named script reads is derived, with a workspace-relative path')

// 2. It joins the apparatus rather than replacing it.
const all = oraclePathsFor(spec, opts)
assert.ok(all.includes('scripts/check.mjs'), 'the script is still apparatus')
assert.ok(all.includes('fixtures/cases.json'), 'and the fixture is now apparatus too')
ok('code and data are both apparatus')

// 3. A patch that edits the fixture is not clean.
const patch = join(dir, 'edit.patch')
writeFileSync(
  patch,
  ['diff --git a/fixtures/cases.json b/fixtures/cases.json', '--- a/fixtures/cases.json', '+++ b/fixtures/cases.json', '@@', '-  { "id": "c2", "expect": 0.4 },', '+  { "id": "c2", "expect": 0.9 },'].join('\n'),
)
assert.equal(oracleClean({ patchFile: patch, oraclePaths: all }), false, 'editing the fixture must not be clean')
ok('editing the fixture is refused')

// 4. A patch that edits neither is still clean — this is a widening, not a ban.
const harmless = join(dir, 'harmless.patch')
writeFileSync(harmless, ['diff --git a/src/fix.js b/src/fix.js', '--- a/src/fix.js', '+++ b/src/fix.js', '@@', '+export const x = 1'].join('\n'))
assert.equal(oracleClean({ patchFile: harmless, oraclePaths: all }), true)
ok('a patch outside the apparatus is still allowed')

// 5. A name that does not exist is not a data path. A verifier's log line saying
//    "cases.json" must not pin a file that is not there, or every task with the
//    word in its output would grow an apparatus it never had.
writeFileSync(
  join(dir, 'scripts', 'chatty.mjs'),
  ["console.log('wrote results.json and cases.json to disk')", 'process.exit(0)', ''].join('\n'),
)
assert.deepEqual(oracleDataPaths({ cmd: 'node scripts/chatty.mjs' }, opts), [], 'a missing file is not apparatus')
ok('a name that resolves to nothing is not apparatus')

// 6. A command that names no script reads no fixture.
assert.deepEqual(oracleDataPaths({ cmd: 'node -e "process.exit(0)"' }, opts), [])
ok('an inline command has no data paths')
