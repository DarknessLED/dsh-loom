// Every self spec must be pinned in the standing list, or it rots silently:
// scripts/test-all.mjs excludes tests/self* from its default glob, and a spec
// that is not listed is a spec nobody runs. Two such specs were found red only
// because someone read them (tests/self2/plateau.test.mjs, tests/self22/halving-round.test.mjs).
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const harness = readFileSync(join(root, 'scripts', 'test-all.mjs'), 'utf8')
const start = harness.indexOf('const standing')
assert.ok(start >= 0, 'scripts/test-all.mjs has a standing list')
const end = harness.indexOf(']', start)
const block = harness.slice(start, end)
const listed = new Set([...block.matchAll(/'([^']+\.test\.mjs)'/g)].map((m) => m[1]))

const files = []
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`.replace(/\\/g, '/')
    if (entry.isDirectory()) walk(rel)
    else if (rel.endsWith('.test.mjs') && rel.startsWith('tests/self')) files.push(rel)
  }
}
walk('tests')

// Five legacy specs are red against today's semantics and are visible here on
// purpose. They are not "fine": they describe the pre-2026-11 holdout and
// promotion rules (promotion now requires the base to fail, and a holdout
// rejection records `holdout-failed`, which their fixtures no longer reach).
// Naming them keeps them from rotting silently while their rewrite is pending.
const KNOWN_RED = {
  'tests/self12/review-queue.test.mjs': 'fake runtime predates runtime.get()',
  'tests/self5/holdout-gate.test.mjs': 'holdout fixture no longer reaches holdout-failed',
  'tests/self5/no-test-edits.test.mjs': 'promotion now requires the base to fail',
  'tests/self8/human-node.test.mjs': 'chain human-node payload moved',
  'tests/self9/holdout-report.test.mjs': 'holdout fixture no longer fails',
}

const missing = files.filter((file) => !listed.has(file) && !KNOWN_RED[file])
const knownRed = Object.keys(KNOWN_RED)
assert.deepEqual(
  knownRed.filter((file) => !files.includes(file)),
  [],
  'a KNOWN_RED entry that no longer exists makes the list stale',
)
assert.deepEqual(
  missing,
  [],
  `self specs missing from the standing list (a spec nobody runs):\n${missing.join('\n')}`,
)
assert.ok(files.length > 50, 'the scan actually found the self specs')

console.log(`ok - ${files.length - knownRed.length} self specs are pinned, ${knownRed.length} named red`)
