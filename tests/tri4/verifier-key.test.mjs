// Verifier reuse is keyed by the patch bytes and the command. That is not enough:
// a patch is only evidence *relative to the tree it was applied to*. The same
// bytes rebased onto a different commit can pass where the first run failed, or
// fail where it passed -- so inheriting a verdict across bases is a fabricated
// result, not a cached one.
//
// Reuse inside one round (same base, identical patch) stays: that is the real
// duplication. Reuse across a base change must not happen.
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { verifyOnce } from '../../src/runtime/verifier-reuse.js'

let pass = 0
const ok = (name) => {
  pass += 1
  console.log(`ok ${pass} - ${name}`)
}

function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

const dir = mkdtempSync(join(tmpdir(), 'loom-vkey-'))
const campaign = join(dir, 'campaign')
mkdirSync(campaign, { recursive: true })
const patchFile = join(dir, 'attempt.patch')
writeFileSync(patchFile, 'diff --git a/x.txt b/x.txt\n+x\n')

let runs = 0
const verdict = { ok: true, exitCode: 0, stdout: 'fine', stderr: '', metrics: {}, command: 'node check.mjs' }
const run = async () => {
  runs += 1
  return { ...verdict }
}

// 1. First run on base A: pays for the verifier.
const a = await verifyOnce({ dir: campaign, patchFile, keySuffix: 'node check.mjs', cwd: dir, base: 'base-a', run })
assert.equal(a.reused, false)
assert.equal(runs, 1)

// 2. Same base, same bytes, same command: the duplicate is free.
const b = await verifyOnce({ dir: campaign, patchFile, keySuffix: 'node check.mjs', cwd: dir, base: 'base-a', run })
assert.equal(b.reused, true, 'the same patch on the same base is one piece of evidence')
assert.equal(runs, 1, 'the second candidate does not pay again')

// 3. A different base with identical bytes: the verdict does not carry over.
const c = await verifyOnce({ dir: campaign, patchFile, keySuffix: 'node check.mjs', cwd: dir, base: 'base-b', run })
assert.equal(c.reused, false, 'a patch rebased onto another commit is new evidence')
assert.equal(runs, 2, 'the verifier runs again when the tree underneath changed')
ok('a verifier verdict is scoped to the commit it was measured against')

// 4. Callers that pass no base keep today's behaviour for identical patches in
//    one round only when they also pass no base -- the cache must not silently
//    treat "unknown base" as a key that matches every base.
const d = await verifyOnce({ dir: campaign, patchFile, keySuffix: 'node check.mjs', cwd: dir, run })
assert.equal(d.reused, false, 'an unscoped call cannot inherit a scoped verdict')
assert.ok(runs >= 3)
ok('an unknown base never inherits a verdict measured on a known one')

rmSync(dir, { recursive: true, force: true })
console.log(`\n${pass}/${pass} passed`)
