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
const standing = ['tests/self10/panel-decide.test.mjs']
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
