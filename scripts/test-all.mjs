#!/usr/bin/env node
// Runs the regression suite (unit tests + host-verify) and exits non-zero on the
// first failure. Used as the dsh-loom autopilot guard: a promotion that breaks
// any of these is rolled back instead of being left in the workspace.
//
// Deliberately excludes tests/self*/ — those are the specs a campaign is still
// trying to satisfy, so they are expected to fail while the loop works.
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const testsDir = join(root, 'tests')
const files = readdirSync(testsDir)
  .filter((f) => f.endsWith('.test.mjs'))
  .sort()
  .map((f) => join(testsDir, f))
// Specs that pin behaviour the loop already has: they are not tasks, but they
// must keep passing, so a promotion cannot quietly remove the guard.
// Adversarial specs live in their own directory: they model failures (dead
// children, drifting ledgers, restarts) rather than features.
const chaosDir = join(testsDir, 'chaos')
for (const f of readdirSync(chaosDir).filter((n) => n.endsWith('.test.mjs')).sort()) {
  files.push(join(chaosDir, f))
}
const standing = [
  'tests/self10/panel-decide.test.mjs',
  // once a self-improvement campaign lands, its spec becomes a regression pin:
  // the loop must not be able to un-solve a task it already solved.
  'tests/self11/spend-estimate.test.mjs',
  'tests/self11/docs-coverage.test.mjs',
  // the chain got cheaper and the loop has to stay that way: no second candidate
  // once the first one solves the task, and planning counted as its own leg.
  'tests/tri3/cascade.test.mjs',
  'tests/tri3/plan-share.test.mjs',
  // the adversarial specs the loop solved are pins too: an unreachable gate or a
  // panel that 500s must not come back.
  'tests/chaos2/panel-degrade.test.mjs',
  'tests/chaos2/exhausted-round.test.mjs',
  'tests/chaos3/stuck-gate.test.mjs',
  // recovery is idempotent: running it twice must repair once and then do nothing
  'tests/chaos2/recover-idempotent.test.mjs',
  // the master switch must never move campaign history
  'tests/switch/switch.test.mjs',
  // the triangle's first two solved specs: a second candidate with a
  // byte-identical patch must not re-spawn the verifier, and a round the budget
  // cannot afford must not be dispatched.
  'tests/tri/verifier-reuse.test.mjs',
  'tests/tri2/recon-reuse.test.mjs',
  'tests/tri2/guard-reuse.test.mjs',
  'tests/tri/budget-preflight.test.mjs',
  // evidence has to be scoped to what it measured: a verdict belongs to the
  // commit it ran on, tokens are priced or said to be unpriced, and a plan that
  // no longer covers a changed file is not reused.
  'tests/tri4/verifier-key.test.mjs',
  'tests/tri4/cost-truth.test.mjs',
  'tests/tri4/plan-delta.test.mjs',
  // a standing problem is one question, not one per tick
  'tests/setup/no-workspace-spam.test.mjs',
]
for (const rel of standing) files.push(join(root, rel))
files.push(join(root, 'scripts', 'verify.mjs'))

let failed = 0
for (const file of files) {
  const started = Date.now()
  const run = spawnSync(process.execPath, [file], { cwd: root, encoding: 'utf8', timeout: 300000 })
  const ms = Date.now() - started
  if (run.status === 0) {
    console.log(`ok   ${file.slice(root.length + 1)} (${ms}ms)`)
  } else {
    failed += 1
    const tail = `${run.stdout || ''}${run.stderr || ''}`.trim().split('\n').slice(-12).join('\n')
    console.log(`FAIL ${file.slice(root.length + 1)} (${ms}ms)\n${tail}\n`)
  }
}
console.log(`\n${files.length - failed}/${files.length} suites passed`)
if (failed) process.exitCode = 1
